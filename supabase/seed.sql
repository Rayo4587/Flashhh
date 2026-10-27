-- =====================================================================
-- Datos iniciales de ATC. Ejecutar en Supabase > SQL Editor DESPUÉS de
-- 0001_init.sql. Puedes editar todo luego desde /admin/clases.
-- =====================================================================

-- 1) TU CORREO DE ADMINISTRADOR (el mismo con el que entras con Google).
--    Cámbialo antes de ejecutar. Puedes agregar varios.
insert into public.admins (email) values
  (lower('CAMBIA-ESTO@gmail.com'))
on conflict do nothing;

-- 2) Tipos de clase con sus links de pago de Mercado Pago.
--    Revisa nombre, sede y precio de cada una.
insert into public.class_types (name, description, location, city, price_cop, payment_url, capacity, sort_order)
values
  ('Clase ATC', null, null, null, 20000, 'https://mpago.li/2g7ZSET', 12, 1),
  ('Run & Boxing', null, null, null, null, 'https://mpago.li/1xrp6v4', 12, 2),
  ('Barrelattes', null, null, 'Barranquilla', null, 'https://mpago.li/2cPakqU', 12, 3),
  ('Sauna & Pilates', null, 'Provenza', 'Medellín', null, 'https://mpago.li/2ZQNTNi', 12, 4);

-- 3) Horario semanal: agrégalo desde /admin/clases (día + hora).
--    Ejemplo por SQL (lunes 7:00 a. m. de Run & Boxing):
-- insert into public.class_schedules (class_type_id, weekday, start_time, instructor)
-- select id, 1, '07:00', 'Nombre instructor' from public.class_types where name = 'Run & Boxing';
