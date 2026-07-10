import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_PIXELS: Record<string, string> = {
  'auxilio-acidente': '2851865198508090',
  'aposentadoria-rural': '1752369442414230',
  'pensao-por-morte': '1229096362421532',
};

const CONTENT_NAMES: Record<string, string> = {
  'auxilio-acidente': 'Auxílio-Acidente INSS',
  'aposentadoria-rural': 'Aposentadoria Rural INSS',
  'pensao-por-morte': 'Pensão por Morte INSS',
};

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizePhone(phone: string): string {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith('55')) {
    digits = '55' + digits;
  }
  return digits;
}

function resolveBeneficioKey(beneficio?: string, fonte?: string): string {
  const b = String(beneficio || '').toLowerCase();
  const f = String(fonte || '').toLowerCase();
  if (b.includes('auxilio') || f.includes('auxilio')) return 'auxilio-acidente';
  if (b.includes('pensao') || b.includes('pensão') || f.includes('pensaopormorte')) {
    return 'pensao-por-morte';
  }
  if (b.includes('aposentadoria') || b.includes('rural') || f.includes('aposentadoria')) {
    return 'aposentadoria-rural';
  }
  return 'pensao-por-morte';
}

function resolvePixelId(beneficio?: string, fonte?: string): string {
  const key = resolveBeneficioKey(beneficio, fonte);
  return META_PIXELS[key] || Deno.env.get('META_PIXEL_ID') || META_PIXELS['pensao-por-morte'];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('META_CAPI_TOKEN');
    if (!token) {
      throw new Error('META_CAPI_TOKEN não configurado.');
    }

    const body = await req.json();
    const eventName = String(body.event_name || '').trim();
    const eventId = String(body.event_id || '').trim();
    if (!eventName || !eventId) {
      throw new Error('event_name e event_id são obrigatórios.');
    }

    const beneficioKey = resolveBeneficioKey(body.beneficio, body.fonte);
    const pixelId = resolvePixelId(body.beneficio, body.fonte);
    const contentName = CONTENT_NAMES[beneficioKey] || CONTENT_NAMES['pensao-por-morte'];

    const userData: Record<string, unknown> = {};
    const email = String(body.email || '').trim().toLowerCase();
    const telefone = normalizePhone(body.telefone || '');

    if (email && email.includes('@')) {
      userData.em = [await sha256Hex(email)];
    }
    if (telefone.length >= 12) {
      userData.ph = [await sha256Hex(telefone)];
    }
    if (body.fbc) userData.fbc = body.fbc;
    if (body.fbp) userData.fbp = body.fbp;
    if (body.fbclid && !userData.fbc) {
      userData.fbc = 'fb.1.' + Math.floor(Date.now() / 1000) + '.' + body.fbclid;
    }

    const customData: Record<string, unknown> = {
      content_name: contentName,
      content_category: 'previdenciario',
      fonte: body.fonte || null,
    };
    if (body.vinculo) customData.vinculo = body.vinculo;
    if (body.documentacao) customData.documentacao = body.documentacao;
    if (body.resultado) customData.resultado = body.resultado;
    if (body.motivo) customData.motivo = body.motivo;

    const eventData: Record<string, unknown> = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      user_data: userData,
      custom_data: customData,
    };

    if (body.url) eventData.event_source_url = body.url;
    if (body.user_agent) {
      eventData.user_data = Object.assign({}, userData, { client_user_agent: body.user_agent });
    }

    const graphUrl = 'https://graph.facebook.com/v21.0/' + pixelId + '/events?access_token=' + encodeURIComponent(token);
    const res = await fetch(graphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [eventData] }),
    });

    const result = await res.json();
    if (!res.ok || result.error) {
      const detail = result.error?.message || res.statusText;
      throw new Error('Meta CAPI (pixel ' + pixelId + '): ' + detail);
    }

    return new Response(JSON.stringify({ ok: true, pixel_id: pixelId, meta: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
