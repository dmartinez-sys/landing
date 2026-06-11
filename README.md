# IM Digital Business School — Landing de captación de leads

Stack: HTML + CSS + JS vanilla · GitHub · Netlify · Supabase · Webhook CRM3C

---

## Flujo de datos

```
Usuario rellena formulario
        │
        ▼
JS lee UTMs de la URL (?utm_source, utm_medium, utm_campaign…)
        │
        ▼
Guarda lead en Supabase (webhook_status = pending)
        │
        ▼
Dispara webhook GET a CRM3C con todos los parámetros
        │
        ▼
Actualiza Supabase → sent  /  failed (si hay error)
```

---

## Configuración

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta `sql/leads.sql` en el **SQL Editor** de tu proyecto.
3. Anota la **Project URL** y la **anon public key** (Settings → API).
4. Añádelas en Netlify como variables de entorno (ver sección Netlify) **o** sustitúyelas directamente en `form.js`:

```js
const SUPABASE_URL  = 'https://xxxx.supabase.co';
const SUPABASE_ANON = 'eyJhbGc...';
```

> ⚠️ La anon key es pública por diseño, pero la tabla tiene RLS activa: anon solo puede insertar, no leer.

### 2. CRM3C Webhook

Sustituye el placeholder en `form.js`:

```js
const CRM_BASE_URL = 'https://tu-crm3c-webhook-url.com/endpoint';
```

Valores fijos para esta landing (Global Máster):

| Parámetro     | Valor |
|---------------|-------|
| crm           | 15    |
| id_campanya   | 97    |
| id_remitente  | 468   |
| estado_crm    | 808   |
| id_curso      | 11651 |

Para otras landings solo cambia `id_curso` en `form.js`.

### 3. Netlify

1. Conecta el repositorio en [netlify.com](https://netlify.com).
2. Publish directory: `/` (raíz del repo).
3. Añade variables de entorno si usas Netlify Functions para ocultar las credenciales:
   - `SUPABASE_URL`
   - `SUPABASE_ANON`
   - `CRM3C_WEBHOOK_URL`

---

## Añadir una nueva landing (otro máster)

1. Duplica la carpeta del proyecto.
2. Cambia en `form.js`:
   ```js
   id_curso: NUEVO_ID,  // ID del curso en CRM3C
   ```
3. Actualiza textos en `index.html` (título, bullets, programa en el `<select>`).
4. Despliega en Netlify como nuevo sitio o como subdirectorio.

---

## Estructura de archivos

```
im-landing/
├── index.html       ← Estructura y contenido de la landing
├── style.css        ← Estilos (design system IM)
├── form.js          ← Lógica: UTMs, Supabase, CRM3C
├── sql/
│   └── leads.sql    ← Schema, RLS y vista resumen para Supabase
└── README.md
```

---

## Próximos pasos

- [ ] Configurar credenciales Supabase en Netlify
- [ ] Sustituir URL del webhook CRM3C
- [ ] Añadir vídeo real cuando esté disponible
- [ ] Crear landings adicionales para otros másteres (mismo base, distinto `id_curso`)
- [ ] Configurar dominio final en Netlify
