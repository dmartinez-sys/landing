# IM Landing — Global Máster Marketing Digital

Landing de captación de leads con backup en Supabase + webhook CRM3C.

## Estructura

```
im-landing/
├── index.html      ← Landing completa
├── style.css       ← Estilos
├── form.js         ← Lógica: UTMs + Supabase + Webhook
├── sql/
│   └── leads.sql   ← Tabla Supabase (pegar en SQL Editor)
└── README.md
```

---

## Setup paso a paso

### 1. Supabase — crear la tabla

1. Entra en tu proyecto de Supabase
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `sql/leads.sql`
4. Ejecuta

### 2. Supabase — obtener credenciales

1. Ve a **Settings → API**
2. Copia:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public key** → `eyJhbGci...`

### 3. Configurar form.js

Abre `form.js` y sustituye las líneas 10-11:

```javascript
const CONFIG = {
  supabase: {
    url:     'https://xxxx.supabase.co',   // ← tu Project URL
    anonKey: 'eyJhbGci...',                // ← tu anon key
  },
  ...
}
```

### 4. Subir a GitHub

```bash
git init
git add .
git commit -m "feat: landing global master IM"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

### 5. Conectar Netlify

1. Entra en [netlify.com](https://netlify.com)
2. **Add new site → Import from Git**
3. Selecciona el repo de GitHub
4. Deploy automático ✓

Netlify te dará una URL tipo `https://nombre-random.netlify.app`

### 6. Supabase — permitir el dominio

1. Supabase → **Authentication → URL Configuration**
2. Añade `https://nombre-random.netlify.app` en **Allowed Origins**

---

## Flujo de datos

```
Usuario envía formulario
        ↓
Lee UTMs de la URL (?utm_source=ig&utm_medium=cpc...)
        ↓
Guarda en Supabase  [webhook_status = "pending"]
        ↓
Dispara webhook CRM3C
        ↓
  ✓ OK  →  actualiza Supabase [webhook_status = "sent"]
  ✗ Error → actualiza Supabase [webhook_status = "failed"]
```

## Reenviar leads fallidos

En Supabase → **Table Editor → leads**, filtra por `webhook_status = failed`.
Puedes reenviar manualmente o crear una función edge de Supabase para reintento automático.

---

## Añadir nueva landing (otro máster)

1. Duplica `index.html` → p.ej. `master-marketing.html`
2. En `form.js` cambia solo:
```javascript
id_curso: '11651',  // ← código del nuevo máster
```
O mejor: crea un `form-config.js` por landing con solo el `id_curso`.

---

## UTMs — ejemplos de URLs por canal

| Canal | URL |
|---|---|
| Instagram Ads | `?utm_source=ig&utm_medium=cpc&utm_campaign=master-oct25` |
| Google Ads | `?utm_source=google&utm_medium=cpc&utm_campaign=master-oct25` |
| SEO | `?utm_source=google&utm_medium=organic` |
| Email | `?utm_source=newsletter&utm_medium=email` |
| Reels orgánico | `?utm_source=ig&utm_medium=organic` |

---

## Variables fijas CRM3C

| Campo | Valor |
|---|---|
| crm | 15 |
| id_campanya | 97 |
| id_remitente | 468 |
| id_curso | 11651 ← Global Máster |
| estado_crm | 808 |
