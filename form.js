// =============================================
// form.js — Global Máster IM Digital Business School
// Flujo: UTMs → Supabase (backup) → Webhook CRM3C
// =============================================

// ── CONFIGURACIÓN ────────────────────────────
const CONFIG = {
  supabase: {
    url:     'TU_SUPABASE_URL',       // https://xxxx.supabase.co
    anonKey: 'TU_SUPABASE_ANON_KEY',  // eyJhbGci...
  },
  crm: {
    endpoint:    'https://www.crm3c.com/form/index.php',
    crm:         '15',
    id_campanya: '97',
    id_remitente:'468',
    id_curso:    '11651',   // ← cambia por landing
    estado_crm:  '808',
  }
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

// ── DETECTAR PAÍS (por idioma del navegador) ──
function getPais() {
  const lang = navigator.language || 'es-ES';
  const map  = { ES: 'España', MX: 'México', AR: 'Argentina',
                 CO: 'Colombia', CL: 'Chile', PE: 'Perú' };
  const iso  = (lang.split('-')[1] || 'ES').toUpperCase();
  return { pais: map[iso] || 'España', iso_pais: iso };
}

// ── CONSTRUIR CAMPO comentarios ───────────────
function buildComentarios(data) {
  const parts = [
    `Estudios: ${data.estudios || ''}`,
    `Modalidad: ${(data.modalidad || '').replace(/\s+/g,'_')}`,
    `Plataforma: ${data.utm_source || 'organic'}`,
  ];
  if (data.observaciones) parts.push(`Observaciones: ${data.observaciones}`);
  if (data.utm_campaign)  parts.push(`Campaña: ${data.utm_campaign}`);
  return parts.join(' | ');
}

// ── ENVIAR AL WEBHOOK CRM3C ───────────────────
async function sendWebhook(data, leadId) {
  const c = CONFIG.crm;
  const geo = getPais();

  const params = new URLSearchParams({
    crm:          c.crm,
    id_campanya:  c.id_campanya,
    id_remitente: c.id_remitente,
    id_curso:     c.id_curso,
    estado_crm:   c.estado_crm,
    nombre:       data.nombre,
    email:        data.email,
    telefono1:    data.telefono,
    comentario:   geo.pais,
    pais:         geo.pais,
    iso_pais:     geo.iso_pais,
    comentarios:  buildComentarios({ ...data }),
    utm_source:   data.utm_source   || 'organic',
    utm_campaign: data.utm_campaign || '',
    utm_medium:   data.utm_medium   || '',
  });

  try {
    const res = await fetch(`${c.endpoint}?${params.toString()}`, {
      method: 'GET',
      mode:   'no-cors'  // CRM3C no devuelve CORS headers
    });

    // no-cors siempre es "opaque" — asumimos OK si no lanza
    await sb.update(leadId, {
      webhook_status:  'sent',
      webhook_sent_at: new Date().toISOString()
    });
    return true;

  } catch (err) {
    await sb.update(leadId, {
      webhook_status: 'failed',
      webhook_error:  err.message
    });
    return false;
  }
}

// ── VALIDACIÓN BÁSICA ─────────────────────────
function validate(fields) {
  const errors = [];
  if (!fields.nombre.trim())   errors.push('El nombre es obligatorio');
  if (!fields.email.trim() || !fields.email.includes('@'))
                                errors.push('El email no es válido');
  if (!fields.telefono.trim()) errors.push('El teléfono es obligatorio');
  if (!fields.estudios)        errors.push('Selecciona tu nivel de estudios');
  if (!fields.modalidad)       errors.push('Selecciona una modalidad');
  if (!fields.motivacion.trim()) errors.push('Cuéntanos tu motivación');
  return errors;
}

// ── SUBMIT PRINCIPAL ──────────────────────────
async function handleSubmit(e) {
  e.preventDefault();

  const btn     = document.getElementById('submit-btn');
  const msgOk   = document.getElementById('msg-ok');
  const msgErr  = document.getElementById('msg-err');

  // Limpiar mensajes previos
  msgOk.style.display  = 'none';
  msgErr.style.display = 'none';

  // Recoger datos del formulario
  const utms = getUTMs();
  const fields = {
    nombre:       document.getElementById('f-nombre').value,
    email:        document.getElementById('f-email').value,
    telefono:     document.getElementById('f-telefono').value,
    estudios:     document.getElementById('f-estudios').value,
    modalidad:    document.querySelector('.mod-opt.sel')?.dataset.val || '',
    motivacion:   document.getElementById('f-motivacion').value,
    observaciones:document.getElementById('f-observaciones').value,
    ...utms
  };

  // Validar
  const errors = validate(fields);
  if (errors.length) {
    msgErr.textContent   = errors[0];
    msgErr.style.display = 'block';
    return;
  }

  // Estado de carga
  btn.disabled    = true;
  btn.textContent = 'Enviando...';

  try {
    // 1. Guardar en Supabase (backup)
    const lead = await sb.insert(fields);

    // 2. Disparar webhook CRM3C
    const webhookOk = await sendWebhook(fields, lead.id);

    // 3. Feedback al usuario
    document.getElementById('form-wrap').style.display = 'none';
    msgOk.style.display = 'block';

    if (!webhookOk) {
      // Lead guardado pero webhook falló — no bloqueamos al usuario
      console.warn('Webhook falló. Lead guardado en Supabase con status=failed');
    }

  } catch (err) {
    console.error('Error al guardar lead:', err);
    btn.disabled    = false;
    btn.textContent = 'Solicitar información';
    msgErr.textContent   = 'Ha ocurrido un error. Por favor inténtalo de nuevo.';
    msgErr.style.display = 'block';
  }
}

// ── SELECCIÓN DE MODALIDAD ────────────────────
function selMod(el) {
  document.querySelectorAll('.mod-opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
}

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('lead-form').addEventListener('submit', handleSubmit);

  // Guardar UTMs en sessionStorage por si el usuario navega
  const utms = getUTMs();
  Object.entries(utms).forEach(([k,v]) => {
    if (v) sessionStorage.setItem(k, v);
  });
});
