// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Supabase: reemplaza con tus credenciales o configura en Netlify como vars de entorno
// e inyéctalas vía un netlify/functions/config.js si las quieres ocultas del cliente.
const SUPABASE_URL    = 'https://PLACEHOLDER.supabase.co';
const SUPABASE_ANON   = 'PLACEHOLDER_ANON_KEY';

// CRM3C — valores fijos para esta landing (Global Máster)
const CRM_BASE_URL    = 'https://PLACEHOLDER_CRM3C_WEBHOOK_URL';
const CRM_FIXED = {
  crm:           15,
  id_campanya:   97,
  id_remitente:  468,
  estado_crm:    808,
  id_curso:      11651,   // Global Máster — cambiar por cada landing
};

// ─── UTM READER ──────────────────────────────────────────────────────────────
function getUTMs() {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source:   p.get('utm_source')   || '',
    utm_medium:   p.get('utm_medium')   || '',
    utm_campaign: p.get('utm_campaign') || '',
    utm_term:     p.get('utm_term')     || '',
    utm_content:  p.get('utm_content')  || '',
    landing_url:  window.location.href,
  };
}

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
async function supabaseInsert(payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':         SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Prefer':        'return=representation',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Supabase insert error: ${res.status}`);
  const data = await res.json();
  return data[0];
}

async function supabaseUpdateStatus(id, status) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
    method:  'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'apikey':         SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({ webhook_status: status }),
  });
  if (!res.ok) console.warn('Supabase update failed:', res.status);
}

// ─── CRM3C WEBHOOK ───────────────────────────────────────────────────────────
async function fireCRM3C(lead) {
  const params = new URLSearchParams({
    ...CRM_FIXED,
    nombre:   lead.nombre,
    email:    lead.email,
    telefono: lead.telefono,
    programa: lead.programa || '',
    ...Object.fromEntries(
      Object.entries(lead.utms || {}).filter(([, v]) => v !== '')
    ),
  });
  const url = `${CRM_BASE_URL}?${params.toString()}`;
  const res = await fetch(url, { method: 'GET', mode: 'no-cors' });
  // no-cors → opaque response; asumir éxito si no lanza excepción
  return res;
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────
const validators = {
  nombre:    v => v.trim().length >= 2  ? '' : 'Introduce tu nombre completo.',
  email:     v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Email no válido.',
  telefono:  v => /^\+?[\d\s\-]{7,15}$/.test(v.trim()) ? '' : 'Teléfono no válido.',
  privacidad: v => v ? '' : 'Debes aceptar la política de privacidad.',
};

function validateField(name, value) {
  return validators[name] ? validators[name](value) : '';
}

function showFieldError(name, msg) {
  const el = document.getElementById(`error-${name}`);
  const input = document.getElementById(name);
  if (el)    el.textContent = msg;
  if (input) input.classList.toggle('is-invalid', !!msg);
}

function validateForm(data) {
  let valid = true;
  ['nombre', 'email', 'telefono', 'privacidad'].forEach(name => {
    const msg = validateField(name, data[name]);
    showFieldError(name, msg);
    if (msg) valid = false;
  });
  return valid;
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
function setLoading(loading) {
  const btn     = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const spinner = document.getElementById('btn-spinner');
  btn.disabled         = loading;
  btnText.textContent  = loading ? 'Enviando…' : 'Solicitar información';
  spinner.hidden       = !loading;
}

function showFeedback(type) {
  document.getElementById('form-success').hidden = type !== 'success';
  document.getElementById('form-error').hidden   = type !== 'error';
}

// ─── MAIN SUBMIT HANDLER ─────────────────────────────────────────────────────
document.getElementById('lead-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = {
    nombre:    document.getElementById('nombre').value,
    email:     document.getElementById('email').value,
    telefono:  document.getElementById('telefono').value,
    programa:  document.getElementById('programa').value,
    privacidad: document.getElementById('privacidad').checked,
  };

  if (!validateForm(formData)) return;

  setLoading(true);
  showFeedback(null);

  const utms = getUTMs();
  let leadId = null;

  try {
    // 1. Guardar en Supabase con estado pendiente
    const record = await supabaseInsert({
      nombre:         formData.nombre,
      email:          formData.email,
      telefono:       formData.telefono,
      programa:       formData.programa,
      webhook_status: 'pending',
      utm_source:     utms.utm_source,
      utm_medium:     utms.utm_medium,
      utm_campaign:   utms.utm_campaign,
      utm_term:       utms.utm_term,
      utm_content:    utms.utm_content,
      landing_url:    utms.landing_url,
    });
    leadId = record?.id;

    // 2. Disparar webhook CRM3C
    await fireCRM3C({ ...formData, utms });

    // 3. Actualizar estado a sent
    if (leadId) await supabaseUpdateStatus(leadId, 'sent');

    showFeedback('success');
    this.reset();

  } catch (err) {
    console.error('Lead submission error:', err);
    if (leadId) await supabaseUpdateStatus(leadId, 'failed');
    showFeedback('error');
  } finally {
    setLoading(false);
  }
});

// ─── INLINE VALIDATION ON BLUR ────────────────────────────────────────────────
['nombre', 'email', 'telefono'].forEach(name => {
  const el = document.getElementById(name);
  if (!el) return;
  el.addEventListener('blur', () => {
    showFieldError(name, validateField(name, el.value));
  });
});
