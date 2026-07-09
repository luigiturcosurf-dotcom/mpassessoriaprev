/**
 * MP Assessoria · Sync Supabase → Google Sheets + Meta CAPI ao marcar Vendido
 * v2 — integrado ao quiz v2 (Lead/LeadDesqualificado)
 *
 * MUDANÇAS v2:
 *  - Nova coluna "Evento Meta" (Lead | LeadDesqualificado) — termômetro de
 *    qualidade da campanha direto na planilha
 *  - Correção de bug em repairSheetValidations (statusColumnA1 sem underscore)
 *  - Purchase enviado com action_source 'system_generated' (CRM automatizado)
 *
 * ⚠ APÓS COLAR ESTA VERSÃO: execute setupSheet UMA VEZ para recriar os
 *   cabeçalhos com a coluna nova. É seguro — status e CAPI enviado vivem no
 *   Supabase e voltam no sync.
 *
 * COMO USAR:
 * 1. Planilha em https://sheets.google.com → Extensões → Apps Script
 * 2. Cole ESTE arquivo inteiro no Código.gs
 * 3. Propriedades do script:
 *      SUPABASE_URL     = https://jiuxiyxsausauqfsudus.supabase.co
 *      SUPABASE_SECRET  = sb_secret_... (Secret key do Supabase)
 *      META_CAPI_TOKEN  = token da Conversions API (Gerenciador de Eventos → Configurações)
 *      META_CAPI_PIXEL_ID = (opcional) ID do pixel do token, se o token for de um pixel só
 *      META_CAPI_DEFAULT_VALUE = (opcional) valor da venda, padrão 1
 * 4. Execute setupSheet (uma vez)
 * 5. Execute createTimeTrigger (sync a cada 1 min)
 * 6. Execute createEditTrigger (envia CAPI ao mudar Status para Vendido)
 *
 * Colunas Q1–Q4: auxílio-acidente / aposentadoria rural
 * Colunas Q5–Q9: pensão por morte
 */

var SHEET_NAME = 'Leads';
var STATUS_OPTIONS = ['Novo', 'Em atendimento', 'Qualificado', 'Vendido', 'Perdido'];

var META_PIXELS = {
  'auxilio-acidente': '2851865198508090',
  'aposentadoria-rural': '1752369442414230',
  'pensao-por-morte': '1229096362421532'
};

var HEADERS = [
  'Data',
  'LP',
  'Benefício',
  'Resultado',
  'Nome',
  'Telefone',
  'E-mail',
  'Q1 · Situação / Parentesco',
  'Q2 · Vínculo / Tempo do falecimento',
  'Q3 · Afastamento INSS / Benefício do falecido',
  'Q4 · Sequelas / Contribuição antes do óbito',
  'Q5 · Idade',
  'Q6 · Estado civil',
  'Q7 · Tempo de união',
  'Q8 · Dependência (filhos)',
  'Q9 · Dependência econômica',
  'Motivo desqualificação',
  'Evento Meta',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'UTM Content',
  'UTM Term',
  'FBCLID',
  'GCLID',
  'FBP',
  'FBC',
  'Status',
  'Meta CAPI Enviado',
  'URL',
  'ID'
];

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var secret = props.getProperty('SUPABASE_SECRET');
  if (!url || !secret) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_SECRET nas Propriedades do script.');
  }
  return { url: url.replace(/\/$/, ''), secret: secret };
}

function supabaseHeaders_(method) {
  var cfg = getConfig_();
  var headers = {
    apikey: cfg.secret,
    'Content-Type': 'application/json'
  };
  if (cfg.secret.indexOf('sb_secret_') !== 0 && cfg.secret.indexOf('sb_publishable_') !== 0) {
    headers.Authorization = 'Bearer ' + cfg.secret;
  }
  if (method === 'PATCH') {
    headers.Prefer = 'return=minimal';
  }
  return headers;
}

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#1351B4')
    .setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  syncLeadsFromSupabase();
}

function columnToLetter_(column) {
  var letter = '';
  while (column > 0) {
    var temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

function statusColumnA1_() {
  var col = HEADERS.indexOf('Status') + 1;
  return columnToLetter_(col);
}

/** Remove validações antigas (ex.: dropdown de Status colado na coluna URL). */
function clearAllDataValidations_(sheet) {
  var rows = Math.max(sheet.getLastRow(), 5000);
  sheet.getRange(1, 1, rows, HEADERS.length).clearDataValidations();
}

function normalizeStatus_(status) {
  var s = String(status || '').trim();
  if (STATUS_OPTIONS.indexOf(s) >= 0) return s;
  return 'Novo';
}

function applyStatusValidation_(sheet) {
  var col = statusColumnA1_();
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(col + '2:' + col + '5000').setDataValidation(rule);
}

function extractFromRespostasValue_(respostas, key) {
  if (!respostas || !respostas[key]) return '';
  var item = respostas[key];
  if (typeof item === 'object' && item !== null) {
    return String(item.valor || item.resposta || '').trim();
  }
  return String(item).trim();
}

function extractFbclidFromUrl_(url) {
  if (!url) return '';
  var match = String(url).match(/[?&]fbclid=([^&]+)/i);
  return match ? decodeURIComponent(match[1]) : '';
}

function enrichLeadForCapi_(lead) {
  if (!lead) return lead;
  var r = lead.respostas || {};
  var enriched = Object.assign({}, lead);
  enriched.email = (lead.email || extractFromRespostasValue_(r, 'email') || '').trim();
  enriched.telefone = (lead.telefone || extractFromRespostasValue_(r, 'telefone') || '').trim();
  enriched.nome = (lead.nome || extractFromRespostasValue_(r, 'nome') || '').trim();
  if (!enriched.fbclid) enriched.fbclid = extractFbclidFromUrl_(lead.page_url);
  if (!enriched.fbc && enriched.fbclid) {
    enriched.fbc = 'fb.1.' + Math.floor(Date.now() / 1000) + '.' + enriched.fbclid;
  }
  return enriched;
}

function fetchLeads_() {
  var cfg = getConfig_();
  var all = [];
  var limit = 1000;
  var offset = 0;

  while (true) {
    var endpoint = cfg.url + '/rest/v1/quiz_leads?select=*&order=created_at.desc'
      + '&limit=' + limit + '&offset=' + offset;
    var res = UrlFetchApp.fetch(endpoint, {
      method: 'get',
      muteHttpExceptions: true,
      headers: supabaseHeaders_('GET')
    });

    if (res.getResponseCode() !== 200) {
      throw new Error('Supabase retornou ' + res.getResponseCode() + ': ' + res.getContentText());
    }

    var batch = JSON.parse(res.getContentText());
    if (!batch.length) break;
    all = all.concat(batch);
    if (batch.length < limit) break;
    offset += limit;
    if (offset > 100000) break;
  }

  return all;
}

function patchLeadById_(leadId, payload) {
  var cfg = getConfig_();
  var endpoint = cfg.url + '/rest/v1/quiz_leads?id=eq.' + encodeURIComponent(leadId);
  var res = UrlFetchApp.fetch(endpoint, {
    method: 'PATCH',
    muteHttpExceptions: true,
    headers: supabaseHeaders_('PATCH'),
    payload: JSON.stringify(payload)
  });
  if (res.getResponseCode() >= 300) {
    throw new Error('PATCH Supabase falhou: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}

function formatDate_(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}

function formatPhone_(phone) {
  if (!phone) return '';
  var d = String(phone).replace(/\D/g, '');
  if (d.length === 11) {
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  if (d.length === 10) {
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  }
  return phone;
}

function fromRespostas_(respostas, key) {
  if (!respostas || !respostas[key]) return '';
  var item = respostas[key];
  if (typeof item === 'object' && item !== null) {
    return item.resposta || item.valor || '';
  }
  return String(item);
}

function dedupeLeads_(leads) {
  var groups = {};
  leads.forEach(function (lead) {
    var key = lead.session_id || lead.id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(lead);
  });

  return Object.keys(groups).map(function (key) {
    var group = groups[key];
    var best = group[0];
    group.forEach(function (lead) {
      var prevIncomplete = best.resultado === 'quiz-iniciado';
      var curIncomplete = lead.resultado === 'quiz-iniciado';
      if (prevIncomplete && !curIncomplete) {
        best = lead;
        return;
      }
      if (!prevIncomplete && curIncomplete) {
        return;
      }
      if (new Date(lead.created_at) > new Date(best.created_at)) {
        best = lead;
      }
    });
    return mergeLeadGroup_(best, group);
  }).sort(function (a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

/** Une contato e atribuição de todas as linhas da mesma sessão. */
function mergeLeadGroup_(best, group) {
  var merged = Object.assign({}, best);
  group.forEach(function (lead) {
    var r = lead.respostas || {};
    if (!merged.nome) merged.nome = lead.nome || extractFromRespostasValue_(r, 'nome');
    if (!merged.telefone) merged.telefone = lead.telefone || extractFromRespostasValue_(r, 'telefone');
    if (!merged.email) merged.email = lead.email || extractFromRespostasValue_(r, 'email');
    if (!merged.fbclid) merged.fbclid = lead.fbclid || extractFbclidFromUrl_(lead.page_url);
    if (!merged.gclid) merged.gclid = lead.gclid;
    if (!merged.fbp) merged.fbp = lead.fbp;
    if (!merged.fbc) merged.fbc = lead.fbc;
    if (!merged.utm_source && lead.utm_source) merged.utm_source = lead.utm_source;
    if (!merged.utm_medium && lead.utm_medium) merged.utm_medium = lead.utm_medium;
    if (!merged.utm_campaign && lead.utm_campaign) merged.utm_campaign = lead.utm_campaign;
    if (!merged.evento_meta && lead.evento_meta) merged.evento_meta = lead.evento_meta;
    if (!merged.meta_event_id && lead.meta_event_id) merged.meta_event_id = lead.meta_event_id;
  });
  return merged;
}

function leadToRow_(lead) {
  var r = lead.respostas || {};
  return [
    formatDate_(lead.created_at),
    lead.lp_slug || '',
    lead.beneficio || '',
    lead.resultado || '',
    lead.nome || fromRespostas_(r, 'nome'),
    formatPhone_(lead.telefone || fromRespostas_(r, 'telefone')),
    lead.email || fromRespostas_(r, 'email'),
    fromRespostas_(r, 'q1'),
    fromRespostas_(r, 'q2'),
    fromRespostas_(r, 'q3'),
    fromRespostas_(r, 'q4'),
    fromRespostas_(r, 'q5'),
    fromRespostas_(r, 'q6'),
    fromRespostas_(r, 'q7'),
    fromRespostas_(r, 'q8'),
    fromRespostas_(r, 'q9'),
    lead.motivo_desqualificacao || '',
    lead.evento_meta || '',
    lead.utm_source || '',
    lead.utm_medium || '',
    lead.utm_campaign || '',
    lead.utm_content || '',
    lead.utm_term || '',
    lead.fbclid || '',
    lead.gclid || '',
    lead.fbp || '',
    lead.fbc || '',
    normalizeStatus_(lead.status_comercial),
    lead.meta_capi_enviado_em ? formatDate_(lead.meta_capi_enviado_em) : '',
    lead.page_url || '',
    lead.id || ''
  ];
}

function syncLeadsFromSupabase() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    setupSheet();
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  }

  var rawLeads = fetchLeads_();
  var leads = dedupeLeads_(rawLeads);
  var rows = leads.map(leadToRow_);
  var lastRow = sheet.getLastRow();

  clearAllDataValidations_(sheet);

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  }

  applyStatusValidation_(sheet);
  sheet.autoResizeColumns(1, HEADERS.length);
  Logger.log('Sync OK: ' + rows.length + ' leads (de ' + rawLeads.length + ' registros no Supabase)');
}

function repairSheetValidations() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Aba Leads não encontrada.');
  clearAllDataValidations_(sheet);
  applyStatusValidation_(sheet);
  Logger.log('Validações corrigidas — dropdown só na coluna ' + statusColumnA1_());
}

function createTimeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncLeadsFromSupabase') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('syncLeadsFromSupabase')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('Trigger criado: sync a cada 1 minuto');
}

function createEditTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'handleStatusEdit') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('handleStatusEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  Logger.log('Trigger criado: handleStatusEdit ao editar planilha');
}

function removeTimeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncLeadsFromSupabase') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

function handleStatusEdit(e) {
  if (!e || !e.range) return;

  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  if (e.range.getRow() <= 1) return;

  var statusCol = HEADERS.indexOf('Status') + 1;
  var idCol = HEADERS.indexOf('ID') + 1;
  var capiCol = HEADERS.indexOf('Meta CAPI Enviado') + 1;
  var emailCol = HEADERS.indexOf('E-mail') + 1;
  var phoneCol = HEADERS.indexOf('Telefone') + 1;

  if (e.range.getColumn() !== statusCol) return;

  var row = e.range.getRow();
  var newStatus = String(e.range.getValue() || '').trim();
  var leadId = sheet.getRange(row, idCol).getValue();

  if (!leadId || !newStatus) return;

  try {
    patchLeadById_(leadId, { status_comercial: newStatus });
  } catch (err) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Erro ao salvar status: ' + err.message,
      'MP Assessoria',
      8
    );
    return;
  }

  if (newStatus !== 'Vendido') return;

  var capiSent = sheet.getRange(row, capiCol).getValue();
  if (capiSent) return;

  try {
    var lead = enrichLeadForCapi_(fetchLeadById_(leadId));
    if (!lead) return;

    if (!lead.email) lead.email = String(sheet.getRange(row, emailCol).getValue() || '').trim();
    if (!lead.telefone) {
      lead.telefone = String(sheet.getRange(row, phoneCol).getValue() || '').replace(/\D/g, '');
    }
    lead = enrichLeadForCapi_(lead);

    if (lead.meta_capi_enviado_em) return;

    sendMetaCapi_(lead);
    var now = new Date().toISOString();
    patchLeadById_(leadId, {
      status_comercial: 'Vendido',
      meta_capi_enviado_em: now
    });
    sheet.getRange(row, capiCol).setValue(formatDate_(now));
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Status Vendido salvo e enviado ao Meta.',
      'MP Assessoria',
      5
    );
  } catch (capiErr) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Status salvo como Vendido. Meta CAPI não enviado: ' + capiErr.message,
      'MP Assessoria',
      10
    );
  }
}

function fetchLeadById_(leadId) {
  var cfg = getConfig_();
  var endpoint = cfg.url + '/rest/v1/quiz_leads?id=eq.' + encodeURIComponent(leadId) + '&select=*';
  var res = UrlFetchApp.fetch(endpoint, {
    method: 'get',
    muteHttpExceptions: true,
    headers: supabaseHeaders_('GET')
  });
  if (res.getResponseCode() !== 200) return null;
  var rows = JSON.parse(res.getContentText());
  return rows.length ? rows[0] : null;
}

function resolvePixelId_(beneficio, lpSlug) {
  var b = String(beneficio || '').toLowerCase();
  var lp = String(lpSlug || '').toLowerCase();
  if (b.indexOf('auxilio') >= 0 || lp.indexOf('auxilio') >= 0) {
    return META_PIXELS['auxilio-acidente'];
  }
  if (b.indexOf('pensao') >= 0 || b.indexOf('pensão') >= 0 || lp.indexOf('pensaopormorte') >= 0) {
    return META_PIXELS['pensao-por-morte'];
  }
  if (b.indexOf('aposentadoria') >= 0 || b.indexOf('rural') >= 0 || lp.indexOf('aposentadoria') >= 0) {
    return META_PIXELS['aposentadoria-rural'];
  }
  return META_PIXELS['auxilio-acidente'];
}

function sha256Hex_(value) {
  var bytes = Utilities.newBlob(String(value)).getBytes();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  return digest.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function hashMetaEmail_(email) {
  return sha256Hex_(String(email).trim().toLowerCase());
}

function hashMetaPhone_(phone) {
  var digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 11 && digits.indexOf('55') !== 0) {
    digits = '55' + digits;
  }
  return sha256Hex_(digits);
}

function sendMetaCapi_(lead) {
  var token = PropertiesService.getScriptProperties().getProperty('META_CAPI_TOKEN');
  if (!token) {
    throw new Error('Configure META_CAPI_TOKEN nas Propriedades do script (Conversions API).');
  }

  lead = enrichLeadForCapi_(lead);
  var props = PropertiesService.getScriptProperties();
  var pixelOverride = props.getProperty('META_CAPI_PIXEL_ID');
  var pixelId = pixelOverride || resolvePixelId_(lead.beneficio, lead.lp_slug);
  var defaultValue = parseFloat(props.getProperty('META_CAPI_DEFAULT_VALUE') || '1') || 1;
  var userData = {};

  if (lead.email && String(lead.email).indexOf('@') > 0) {
    userData.em = [hashMetaEmail_(lead.email)];
  }
  if (lead.telefone && String(lead.telefone).replace(/\D/g, '').length >= 10) {
    userData.ph = [hashMetaPhone_(lead.telefone)];
  }
  if (lead.fbc) userData.fbc = lead.fbc;
  if (lead.fbp) userData.fbp = lead.fbp;
  if (lead.fbclid && !userData.fbc) {
    userData.fbc = 'fb.1.' + Math.floor(Date.now() / 1000) + '.' + lead.fbclid;
  }

  if (!userData.em && !userData.ph && !userData.fbc) {
    throw new Error('Lead sem e-mail, telefone ou fbclid na URL para enviar ao Meta.');
  }

  var customData = {
    currency: 'BRL',
    value: defaultValue,
    content_name: lead.beneficio || lead.lp_slug || 'beneficio'
  };
  if (lead.utm_campaign) customData.content_name = lead.beneficio + ' · ' + lead.utm_campaign;

  var eventData = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: 'venda-' + lead.id,
    action_source: 'system_generated',
    user_data: userData,
    custom_data: customData
  };
  if (lead.page_url) eventData.event_source_url = lead.page_url;

  var payload = { data: [eventData] };

  var url = 'https://graph.facebook.com/v21.0/' + pixelId + '/events?access_token=' + encodeURIComponent(token);
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var body = JSON.parse(res.getContentText());
  if (res.getResponseCode() >= 300 || (body.error && body.error.message)) {
    var detail = body.error ? body.error.message : res.getContentText();
    if (body.error && body.error.error_user_msg) detail += ' — ' + body.error.error_user_msg;
    throw new Error('Meta CAPI (pixel ' + pixelId + '): ' + detail
      + '. Se o token foi gerado em outro pixel, configure META_CAPI_PIXEL_ID nas Propriedades.');
  }

  Logger.log('CAPI enviado pixel ' + pixelId + ' lead ' + lead.id);
  return body;
}
