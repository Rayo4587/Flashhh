-- =====================================================================
-- ATC · Wellness at the Club — Agenda y reservas online
-- Ejecutar completo en Supabase > SQL Editor (una sola vez).
-- Zona horaria de las clases: America/Bogota.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Administradores: los correos de esta tabla ven todas las reservas.
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);

alter table public.admins enable row level security;
-- Sin políticas: nadie la lee ni escribe desde la web; solo desde el SQL Editor.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------
-- Perfiles de usuario (se crean solos al registrarse con Google)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Evita que un usuario cambie su propio correo en el perfil.
create or replace function public.protect_profile_email()
returns trigger
language plpgsql
as $$
begin
  new.email := old.email;
  new.id := old.id;
  return new;
end;
$$;

drop trigger if exists profiles_protect_email on public.profiles;
create trigger profiles_protect_email
  before update on public.profiles
  for each row execute function public.protect_profile_email();

-- ---------------------------------------------------------------------
-- Tipos de clase (con su link de pago de Mercado Pago)
-- ---------------------------------------------------------------------
create table if not exists public.class_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location text,
  city text,
  price_cop integer check (price_cop is null or price_cop >= 0),
  payment_url text,
  capacity integer not null default 12 check (capacity between 1 and 12),
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 300),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.class_types enable row level security;

drop policy if exists "class_types_read_all" on public.class_types;
create policy "class_types_read_all" on public.class_types
  for select using (true);

drop policy if exists "class_types_admin_write" on public.class_types;
create policy "class_types_admin_write" on public.class_types
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Horario semanal: cada fila se repite todas las semanas.
-- weekday: 1 = lunes ... 7 = domingo (ISO)
-- ---------------------------------------------------------------------
create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_type_id uuid not null references public.class_types (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  instructor text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists class_schedules_type_idx on public.class_schedules (class_type_id);

alter table public.class_schedules enable row level security;

drop policy if exists "class_schedules_read_all" on public.class_schedules;
create policy "class_schedules_read_all" on public.class_schedules
  for select using (true);

drop policy if exists "class_schedules_admin_write" on public.class_schedules;
create policy "class_schedules_admin_write" on public.class_schedules
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Reservas. Guardan una copia de los datos de la clase para que el
-- historial no cambie si luego se edita el horario.
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  schedule_id uuid references public.class_schedules (id) on delete set null,
  class_date date not null,
  starts_at timestamptz not null,
  class_name text not null,
  location text,
  price_cop integer,
  payment_url text,
  status text not null default 'pendiente_pago'
    check (status in ('pendiente_pago', 'pagada', 'cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index if not exists bookings_session_idx on public.bookings (schedule_id, class_date);
create index if not exists bookings_user_idx on public.bookings (user_id);
create index if not exists bookings_starts_idx on public.bookings (starts_at);
create unique index if not exists bookings_one_active_per_user
  on public.bookings (user_id, schedule_id, class_date)
  where status <> 'cancelada';

alter table public.bookings enable row level security;

-- Solo lectura directa; crear / cancelar / cambiar estado va por funciones.
drop policy if exists "bookings_select_own_or_admin" on public.bookings;
create policy "bookings_select_own_or_admin" on public.bookings
  for select using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- Agenda pública: próximas sesiones con cupos ocupados.
-- La agenda "se actualiza sola" cada semana porque se calcula a partir
-- del horario semanal para los próximos p_days días.
-- ---------------------------------------------------------------------
create or replace function public.get_agenda(p_days integer default 14)
returns table (
  schedule_id uuid,
  class_type_id uuid,
  class_name text,
  description text,
  location text,
  city text,
  price_cop integer,
  instructor text,
  class_date date,
  starts_at timestamptz,
  duration_minutes integer,
  capacity integer,
  booked integer
)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select (now() at time zone 'America/Bogota')::date + i as class_date
    from generate_series(0, least(greatest(coalesce(p_days, 14), 1), 28) - 1) as i
  )
  select
    s.id,
    t.id,
    t.name,
    t.description,
    t.location,
    t.city,
    t.price_cop,
    s.instructor,
    d.class_date,
    (d.class_date + s.start_time) at time zone 'America/Bogota',
    t.duration_minutes,
    t.capacity,
    (
      select count(*)::integer
      from public.bookings b
      where b.schedule_id = s.id
        and b.class_date = d.class_date
        and b.status <> 'cancelada'
    )
  from public.class_schedules s
  join public.class_types t on t.id = s.class_type_id
  join days d on extract(isodow from d.class_date) = s.weekday
  where s.active
    and t.active
    and (d.class_date + s.start_time) at time zone 'America/Bogota' > now()
  order by 10, t.sort_order, t.name;
$$;

-- ---------------------------------------------------------------------
-- Reservar: valida fecha, cupo máximo (12) y reserva duplicada.
-- El bloqueo evita sobrecupo si dos personas reservan a la vez.
-- ---------------------------------------------------------------------
create or replace function public.book_class(p_schedule_id uuid, p_class_date date)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'America/Bogota')::date;
  v_s record;
  v_starts timestamptz;
  v_count integer;
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'NO_AUTH';
  end if;

  select s.weekday, s.start_time, s.active as schedule_active,
         t.name, t.location, t.city, t.price_cop, t.payment_url,
         t.capacity, t.active as type_active
    into v_s
  from public.class_schedules s
  join public.class_types t on t.id = s.class_type_id
  where s.id = p_schedule_id;

  if not found or not v_s.schedule_active or not v_s.type_active then
    raise exception 'CLASE_NO_DISPONIBLE';
  end if;

  if p_class_date is null
     or extract(isodow from p_class_date) <> v_s.weekday
     or p_class_date > v_today + 27 then
    raise exception 'FECHA_INVALIDA';
  end if;

  v_starts := (p_class_date + v_s.start_time) at time zone 'America/Bogota';
  if v_starts <= now() then
    raise exception 'CLASE_PASADA';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_schedule_id::text || ':' || p_class_date::text, 0));

  if exists (
    select 1 from public.bookings
    where user_id = v_uid and schedule_id = p_schedule_id
      and class_date = p_class_date and status <> 'cancelada'
  ) then
    raise exception 'YA_RESERVADO';
  end if;

  select count(*) into v_count
  from public.bookings
  where schedule_id = p_schedule_id and class_date = p_class_date and status <> 'cancelada';

  if v_count >= least(v_s.capacity, 12) then
    raise exception 'CUPO_LLENO';
  end if;

  insert into public.bookings
    (user_id, schedule_id, class_date, starts_at, class_name, location, price_cop, payment_url)
  values (
    v_uid, p_schedule_id, p_class_date, v_starts, v_s.name,
    nullif(concat_ws(' · ', nullif(v_s.location, ''), nullif(v_s.city, '')), ''),
    v_s.price_cop, v_s.payment_url
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------
-- Cancelar: el cliente puede cancelar hasta 12 h antes de la clase.
-- (Si cambias este número, cámbialo también en src/lib/config.ts)
-- El administrador puede cancelar en cualquier momento.
-- ---------------------------------------------------------------------
create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings;
  v_admin boolean := public.is_admin();
begin
  select * into v_b from public.bookings where id = p_booking_id for update;

  if not found or (v_b.user_id <> auth.uid() and not v_admin) then
    raise exception 'RESERVA_NO_ENCONTRADA';
  end if;

  if v_b.status = 'cancelada' then
    return v_b;
  end if;

  if not v_admin and v_b.starts_at - now() < interval '12 hours' then
    raise exception 'FUERA_DE_PLAZO';
  end if;

  update public.bookings
     set status = 'cancelada', cancelled_at = now(), updated_at = now()
   where id = p_booking_id
  returning * into v_b;

  return v_b;
end;
$$;

-- ---------------------------------------------------------------------
-- Administrador: marcar pago recibido / pendiente.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_payment(p_booking_id uuid, p_paid boolean)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings;
begin
  if not public.is_admin() then
    raise exception 'NO_AUTORIZADO';
  end if;

  update public.bookings
     set status = case when p_paid then 'pagada' else 'pendiente_pago' end,
         updated_at = now()
   where id = p_booking_id and status <> 'cancelada'
  returning * into v_b;

  if not found then
    raise exception 'RESERVA_NO_ENCONTRADA';
  end if;

  return v_b;
end;
$$;

-- ---------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------
revoke all on function public.get_agenda(integer) from public;
revoke all on function public.book_class(uuid, date) from public;
revoke all on function public.cancel_booking(uuid) from public;
revoke all on function public.admin_set_payment(uuid, boolean) from public;
revoke all on function public.is_admin() from public;
revoke all on function public.handle_new_user() from public;

grant execute on function public.get_agenda(integer) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.book_class(uuid, date) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.admin_set_payment(uuid, boolean) to authenticated;
