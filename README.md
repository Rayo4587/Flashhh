# ATC · Wellness at the Club — Agenda y reservas online

Web de reservas para **wellnessattheclub.com**:

- **Agenda pública** de los próximos 14 días. Se renueva sola cada semana a partir del horario semanal.
- **Cupo máximo de 12 personas** por clase, garantizado en la base de datos (dos personas no pueden tomar el último cupo a la vez).
- **Registro e ingreso con Google.**
- **Mis reservas:** cada persona ve sus clases y puede cancelar hasta 12 h antes.
- **Pago con Mercado Pago:** cada clase tiene su link de pago (`mpago.li`).
- **Correo de confirmación desde ATC** con los datos de la sesión, el botón de pago, las políticas y un archivo de calendario (.ics).
- **Panel de administración** (`/admin`): quién reservó, para qué clase y fecha, con su contacto (WhatsApp). Permite marcar como pagada, cancelar y descargar en Excel (CSV).
- **Clases y horarios** (`/admin/clases`): crear clases, cambiar el link de pago o el precio, y agregar horarios por día y hora.

Tecnología: Next.js 15 + Supabase (base de datos y login con Google) + Vercel (hosting) + SMTP para los correos. Los tres servicios tienen plan gratuito.

---

## Puesta en marcha (una sola vez, ~30 min)

### 1. Supabase (base de datos y login)
1. Crea una cuenta en https://supabase.com y un proyecto nuevo. Región sugerida: *East US* o *São Paulo*.
2. Ve a **SQL Editor**, pega el contenido de `supabase/migrations/0001_init.sql` y pulsa **Run**.
3. Abre `supabase/seed.sql` y **cambia `CAMBIA-ESTO@gmail.com` por tu correo de Google**, el que usarás para entrar como administrador. Pégalo en el SQL Editor y pulsa **Run**.
4. En **Project Settings → API** copia la *Project URL* y la *anon / publishable key*.

### 2. Login con Google
1. En https://console.cloud.google.com crea un proyecto. Configura la **pantalla de consentimiento OAuth** (tipo *Externo*, nombre "ATC · Wellness at the Club", logo y dominio wellnessattheclub.com) y publícala.
2. En **Credenciales → Crear credenciales → ID de cliente OAuth → Aplicación web**:
   - *URI de redireccionamiento autorizado*: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
3. Copia el *Client ID* y el *Client Secret*.
4. En Supabase → **Authentication → Sign In / Providers → Google**: actívalo y pega ambos valores.
5. En Supabase → **Authentication → URL Configuration**:
   - *Site URL*: `https://reservas.wellnessattheclub.com` (o el dominio que uses)
   - *Redirect URLs*: `https://reservas.wellnessattheclub.com/**` y `http://localhost:3000/**`

### 3. Correo de confirmación "desde ATC"
Necesitas un buzón que envíe los correos. Dos opciones:

- **Google Workspace o Gmail.** Crea `reservas@wellnessattheclub.com` (o usa un Gmail), activa la verificación en 2 pasos y genera una **contraseña de aplicación** en https://myaccount.google.com/apppasswords. Usa `SMTP_HOST=smtp.gmail.com` y `SMTP_PORT=465`.
- **Resend** (https://resend.com, gratis hasta 3.000 correos al mes). Verifica el dominio wellnessattheclub.com agregando los registros DNS que te indique. Usa `SMTP_HOST=smtp.resend.com`, `SMTP_USER=resend` y `SMTP_PASS=` tu API key.

### 4. Publicar en Vercel
1. Crea una cuenta en https://vercel.com con tu GitHub e importa este repositorio.
2. En **Environment Variables** agrega todas las variables de `.env.example` con tus valores.
3. **Deploy.** Después, en **Settings → Domains**, agrega `reservas.wellnessattheclub.com` y crea en tu DNS el registro CNAME que Vercel indique.
4. En tu web principal pon un botón "Reservar" que apunte a ese dominio.

### 5. Cargar el horario
Entra con tu correo de administrador → **Admin → Clases y horarios**. Para cada clase:
- revisa el nombre, la sede, la ciudad y el precio (el link de Mercado Pago ya está cargado);
- en **Agregar horario**, marca los días, la hora y el instructor.

Desde ese momento la agenda muestra siempre las próximas 2 semanas, sin hacer nada más.

---

## Cómo funciona el pago
Los links `mpago.li` son links de pago fijos. Mercado Pago no le dice a la web *quién* pagó, así que el flujo es:

1. La persona reserva y su cupo queda **separado** (estado *Pendiente de pago*).
2. Recibe el correo y ve en pantalla el botón **Pagar con Mercado Pago**.
3. Tú revisas los pagos en Mercado Pago y en `/admin` pulsas **Marcar pagada**. Si alguien no paga, puedes **Cancelar** y el cupo se libera.

> Mejora futura opcional: con *Checkout Pro* de Mercado Pago (Access Token + webhook) la reserva puede marcarse como pagada automáticamente.

## Personalizar
- **Políticas** (web y correo): `src/lib/config.ts` → `POLICIES`.
- **Plazo de cancelación** (12 h): `CANCEL_HOURS` en `src/lib/config.ts` y el `interval '12 hours'` en `supabase/migrations/0001_init.sql`.
- **Agregar otro administrador:** en el SQL Editor ejecuta `insert into public.admins (email) values ('correo@dominio.com');`

## Desarrollo local
```bash
cp .env.example .env.local   # completa los valores
npm install
npm run dev                  # http://localhost:3000
```
Comprobaciones: `npm run build`, `npm run lint`, `npm run typecheck`.
