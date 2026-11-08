# the Agency: actualización de labstheagency.com

Esta carpeta trae el sitio completo, ya corregido y listo para publicar en Netlify. El diseño se ve igual que hoy: los cambios son técnicos y de SEO.

## Qué cambia

| # | Problema | Qué se hizo |
|---|---|---|
| 1 | El botón "Instagram" del pie llevaba a instagram.com sin cuenta | Ahora lleva a https://www.instagram.com/labstheagency/ (ver nota abajo) |
| 2 | La librería 3D (Three.js) se cargaba desde unpkg.com; si ese servicio fallaba o tardaba, la pantalla de carga duraba hasta 7 s | Three.js va dentro del sitio, en `/vendor/three/`. Ya no depende de terceros |
| 3 | La barra de carga avanzaba por cuadro de animación: en celulares de gama baja tardaba mucho más | Ahora avanza por tiempo, con un tope de 4,5 s. Si algo falla, la página aparece igual |
| 4 | El título H1 solo decía "the Agency" | Tiene un texto descriptivo para Google y lectores de pantalla. A la vista no cambia nada |
| 5 | Título de la pestaña poco descriptivo para Google | "the Agency \| Agencia de contenido UGC, pauta y web en Colombia" |
| 6 | Sin enlace canónico ni datos estructurados | Se agregó canonical y ficha de negocio (schema.org ProfessionalService) con ciudades y servicios |
| 7 | La vista previa al compartir el enlace dependía de una función automática de Netlify | Imagen propia de 1200×630 en `/assets/brand/og-image.jpg`, más título y descripción para WhatsApp, Facebook y X |
| 8 | Favicon antiguo, de trazo fino | Favicon nuevo del kit de marca (`favicon.ico`, 32, 180, 192 y 512 px) y `site.webmanifest` |
| 9 | Sin robots.txt ni sitemap.xml | Se agregaron los dos |
| 10 | Sin reglas de caché | Archivo `_headers` de Netlify: caché larga para `/vendor` y de una semana para `/assets` |
| 11 | Script de un deploy anterior de Netlify incrustado en el HTML | Se quitó; Netlify lo vuelve a agregar solo si lo necesita |

## Cómo publicarlo en Netlify (5 minutos)

1. Descomprime este ZIP. Verás la carpeta **`sitio`** y este archivo.
2. Entra a **app.netlify.com** con tu cuenta y abre el sitio de **labstheagency.com**.
3. Ve a la pestaña **Deploys**.
4. Baja hasta el recuadro que dice **"Drag and drop your project folder here"** (o "Arrastra la carpeta de tu proyecto aquí").
5. Arrastra la **carpeta `sitio`** completa (la carpeta, no los archivos sueltos ni el ZIP) a ese recuadro.
6. Espera a que el deploy diga **Published** (menos de un minuto).
7. Abre labstheagency.com y revisa la lista de verificación de abajo.

### Si algo sale mal: volver a la versión anterior

En **Deploys**, haz clic en el deploy anterior (el de antes de hoy) y pulsa **Publish deploy**. El sitio vuelve a estar como antes en segundos.

### Importante si el sitio lo editas con el agente de Netlify o con Git

El sitio parece haberse creado con el agente de IA de Netlify. Si después le pides cambios a ese agente, o si el sitio está conectado a un repositorio, la siguiente publicación puede partir del código viejo y borrar estas correcciones. Para evitarlo:

- Si usas el agente: pídele que trabaje sobre la versión publicada actual, o pégale la tabla "Qué cambia" para que mantenga los cambios.
- Si usas Git: reemplaza los archivos del repositorio por los de la carpeta `sitio` y haz commit, en lugar de arrastrar la carpeta.

## Lista de verificación después de publicar

- [ ] La página carga y la pantalla de carga desaparece en 1–3 segundos.
- [ ] El botón **Instagram** del pie abre @labstheagency.
- [ ] La pestaña del navegador muestra el favicon nuevo (puede tardar; prueba en una ventana de incógnito).
- [ ] labstheagency.com/robots.txt y labstheagency.com/sitemap.xml abren sin error.
- [ ] Al compartir el enlace por WhatsApp aparece la imagen nueva. Si sigue la vieja, pega el enlace en **developers.facebook.com/tools/debug** y pulsa "Scrape again".

## Notas

- **Instagram:** el enlace apunta a **@labstheagency**. Si la cuenta todavía no existe o vas a usar otro nombre, abre `sitio/index.html`, busca `instagram.com/labstheagency` (aparece 2 veces: en el pie y en los datos de schema.org) y cámbialo antes de subir.
- **Google:** después de publicar, entra a Google Search Console, agrega labstheagency.com si no está y envía el sitemap `https://labstheagency.com/sitemap.xml`.
- **Pendientes que necesitan algo de tu parte:** correo con dominio propio (hola@labstheagency.com en vez de Gmail) y un número de WhatsApp colombiano (+57). Cuando los tengas, los cambio en la web.
- **Tipografías:** siguen cargando desde Adobe Fonts (Palast y Prosaic) como hoy. No se pueden alojar en el sitio por la licencia.
