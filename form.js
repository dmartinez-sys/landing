// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://bktksksrnthltjewpfrm.supabase.co';
const SUPABASE_ANON = 'sb_publishable_qydLZG5nAaofIQLoXkePxA_MFSH6Lfc';

// CRM3C — valores fijos para esta landing (Global Máster)
const CRM_BASE_URL = 'https://www.crm3c.com/form/index.php';
const CRM_FIXED = {
  crm:          15,
  id_campanya:  97,
  id_remitente: 468,
  estado_crm:   808,
  id_curso:     11651,  // Global Máster — cambiar por cada landing
};

// ── SUPABASE CLIENT (sin librería, fetch nativo) ──
const sb = {
  insert: async (data) => {
    const res = await fetch(`${CONFIG.supabase.url}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         CONFIG.supabase.anonKey,
        'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
        'Prefer':        'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    return rows[0];
  },
  update: async (id, data) => {
    await fetch(`${CONFIG.supabase.url}/rest/v1/leads?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         CONFIG.supabase.anonKey,
        'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
      },
      body: JSON.stringify(data)
    });
  }
};

// ── LEER UTMs DE LA URL ───────────────────────
function getUTMs() {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source:   p.get('utm_source')   || 'organic',
    utm_medium:   p.get('utm_medium')   || null,
    utm_campaign: p.get('utm_campaign') || null,
    utm_content:  p.get('utm_content')  || null,
    utm_term:     p.get('utm_term')     || null,
  };
}

// ─── PAÍS DETECTION ──────────────────────────────────────────────────────────
function getPais() {
  const lang = (navigator.language || navigator.languages?.[0] || 'es-ES').toLowerCase();
  const map = {
    'es': { pais: 'España',          iso: 'ES' },
    'mx': { pais: 'México',          iso: 'MX' },
    'ar': { pais: 'Argentina',       iso: 'AR' },
    'co': { pais: 'Colombia',        iso: 'CO' },
    'cl': { pais: 'Chile',           iso: 'CL' },
    'pe': { pais: 'Perú',            iso: 'PE' },
    've': { pais: 'Venezuela',       iso: 'VE' },
    'ec': { pais: 'Ecuador',         iso: 'EC' },
    'bo': { pais: 'Bolivia',         iso: 'BO' },
    'py': { pais: 'Paraguay',        iso: 'PY' },
    'uy': { pais: 'Uruguay',         iso: 'UY' },
    'cr': { pais: 'Costa Rica',      iso: 'CR' },
    'pa': { pais: 'Panamá',          iso: 'PA' },
    'gt': { pais: 'Guatemala',       iso: 'GT' },
    'hn': { pais: 'Honduras',        iso: 'HN' },
    'sv': { pais: 'El Salvador',     iso: 'SV' },
    'ni': { pais: 'Nicaragua',       iso: 'NI' },
    'do': { pais: 'Rep. Dominicana', iso: 'DO' },
    'cu': { pais: 'Cuba',            iso: 'CU' },
    'pr': { pais: 'Puerto Rico',     iso: 'PR' },
  };
  const code = lang.split('-')[1] || lang.split('-')[0];
  const match = map[code] || map['es'];
  return { pais: match.pais, iso_pais: match.iso };
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

async function supabaseUpdateStatus(id, status, errorMsg) {
  const body = { webhook_status: status };
  if (status === 'sent')   body.webhook_sent_at = new Date().toISOString();
  if (status === 'failed') body.webhook_error = errorMsg || 'unknown';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
    method:  'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'apikey':         SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.warn('Supabase update failed:', res.status);
}

// ─── CRM3C WEBHOOK ───────────────────────────────────────────────────────────
function buildComentarios(data) {
  const parts = [];
  if (data.estudios)     parts.push(`Estudios: ${data.estudios}`);
  if (data.motivacion)   parts.push(`Motivación: ${data.motivacion}`);
  if (data.observaciones) parts.push(`Obs: ${data.observaciones}`);
  return parts.join(' | ');
}

async function fireCRM3C(lead, utms) {
  const params = new URLSearchParams({
    ...CRM_FIXED,
    nombre:      lead.nombre,
    email:       lead.email,
    telefono:    lead.telefono,
    modalidad:   lead.modalidad || '',
    comentarios: buildComentarios(lead),
    pais:        lead.pais     || 'España',
    iso_pais:    lead.iso_pais || 'ES',
  });
  Object.entries(utms).forEach(([k, v]) => { if (v) params.set(k, v); });
  const url = `${CRM_BASE_URL}?${params.toString()}`;
  await fetch(url, { method: 'GET', mode: 'no-cors' });
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
}

function validateAll(data) {
  let ok = true;
  if (!data.nombre || data.nombre.trim().length < 2) {
    showError('msg-err', 'Por favor, introduce tu nombre completo.'); ok = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    showError('msg-err', 'El email no es válido.'); ok = false;
  } else if (!/^\+?[\d\s\-]{7,15}$/.test(data.telefono.trim())) {
    showError('msg-err', 'El teléfono no es válido.'); ok = false;
  } else if (!data.estudios) {
    showError('msg-err', 'Selecciona tu nivel de estudios.'); ok = false;
  } else if (!data.modalidad) {
    showError('msg-err', 'Selecciona una modalidad.'); ok = false;
  } else if (!data.motivacion || data.motivacion.trim().length < 5) {
    showError('msg-err', 'Cuéntanos brevemente por qué te interesa el máster.'); ok = false;
  } else {
    showError('msg-err', '');
  }
  return ok;
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
function setLoading(loading) {
  const btn = document.getElementById('submit-btn');
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? 'Enviando…' : 'Quiero que me llamen →';
}

// ─── MAIN SUBMIT HANDLER ─────────────────────────────────────────────────────
document.getElementById('lead-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const geo = getPais();

  const data = {
    nombre:        (document.getElementById('f-nombre')?.value   || '').trim(),
    email:         (document.getElementById('f-email')?.value    || '').trim(),
    telefono:      (document.getElementById('f-telefono')?.value || '').trim(),
    estudios:      document.getElementById('f-estudios')?.value  || '',
    modalidad:     document.querySelector('.mod-option.selected')?.dataset.val || '',
    motivacion:    (document.getElementById('f-motivacion')?.value    || '').trim(),
    observaciones: (document.getElementById('f-observaciones')?.value || '').trim(),
    pais:          geo.pais,
    iso_pais:      geo.iso_pais,
  };

  if (!validateAll(data)) return;

  setLoading(true);
  const okEl  = document.getElementById('msg-ok');
  const errEl = document.getElementById('msg-err');
  if (okEl)  okEl.style.display  = 'none';
  if (errEl) errEl.style.display = 'none';

  const utms = getUTMs();
  let leadId = null;

  try {
    const record = await supabaseInsert({
      nombre:         data.nombre,
      email:          data.email,
      telefono:       data.telefono,
      estudios:       data.estudios,
      modalidad:      data.modalidad,
      motivacion:     data.motivacion,
      observaciones:  data.observaciones,
      pais:           data.pais,
      iso_pais:       data.iso_pais,
      webhook_status: 'pending',
      utm_source:     utms.utm_source,
      utm_medium:     utms.utm_medium,
      utm_campaign:   utms.utm_campaign,
      utm_term:       utms.utm_term,
      utm_content:    utms.utm_content,
      landing_url:    utms.landing_url,
    });

    await fireCRM3C(data, utms);

    if (leadId) await supabaseUpdateStatus(leadId, 'sent');

    if (okEl) okEl.style.display = 'block';
    const formWrap = document.getElementById('form-wrap');
    if (formWrap) formWrap.style.display = 'none';

  } catch (err) {
    console.error('Lead submission error:', err);
    if (leadId) await supabaseUpdateStatus(leadId, 'failed', err.message);
    showError('msg-err', 'Ha ocurrido un error. Por favor, inténtalo de nuevo.');
    if (errEl) errEl.style.display = 'block';
  } finally {
    setLoading(false);
  }
});
