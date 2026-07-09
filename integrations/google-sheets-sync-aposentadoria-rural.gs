/**
 * MP Assessoria · Sync Supabase → Google Sheets (Aposentadoria Rural)
 * Inclui atribuição UTM/fbclid/gclid e Meta CAPI ao marcar Vendido.
 *
 * Propriedades do script:
 *   SUPABASE_URL, SUPABASE_SECRET, META_CAPI_TOKEN
 * Execute: setupSheet → createTimeTrigger → createEditTrigger
 */

var SHEET_NAME = 'Leads';
var BENEFICIO_FILTER = 'aposentadoria-rural';
var STATUS_OPTIONS = ['Novo', 'Em atendimento', 'Qualificado', 'Vendido', 'Perdido'];
var META_PIXEL_ID = '1752369442414230';

var HEADERS = [
  'Data',
  'LP',
  'Benefício',
  'Resultado',
  'Nome',
  'Telefone',
  'E-mail',
  'Q1 · Idade',
  'Q2 · Atividade rural',
  'Q3 · Tempo de atividade',
  'Q4 · Vínculo urbano',
  'Q5 · Documentação',
  'Clicou WhatsApp',
  'Motivo desqualificação',
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
  var headers = { apikey: cfg.secret, 'Content-Type': 'application/json' };
  if (cfg.secret.indexOf('sb_secret_') !== 0 && cfg.secret.indexOf('sb_publishable_') !== 0) {
    headers.Authorization = 'Bearer ' + cfg.secret;
  }
  if (method === 'PATCH') headers.Prefer = 'return=minimal';
  return headers;
}

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold').setBackground('#1a472a').setFontColor('#FFFFFF');
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
  return columnToLetter_(HEADERS.indexOf('Status') + 1);
}

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
    .requireValueInList(STATUS_OPTIONS, true).setAllowInvalid(false).build();
  sheet.getRange(col + '2:' + col + '5000').setDataValidation(rule);
}

function fetchLeads_() {
  var cfg = getConfig_();
  var endpoint = cfg.url + '/rest/v1/quiz_leads?select=*'
    + '&beneficio=eq.' + encodeURIComponent(BENEFICIO_FILTER)
    + '&order=created_at.desc&limit=1000';
  var res = UrlFetchApp.fetch(endpoint, {
    method: 'get', muteHttpExceptions: true, headers: supabaseHeaders_('GET')
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('Supabase retornou ' + res.getResponseCode() + ': ' + res.getContentText());
  }
  return JSON.parse(res.getContentText());
}

function patchLeadById_(leadId, payload) {
  var cfg = getConfig_();
  var res = UrlFetchApp.fetch(
    cfg.url + '/rest/v1/quiz_leads?id=eq.' + encodeURIComponent(leadId),
    { method: 'PATCH', muteHttpExceptions: true, headers: supabaseHeaders_('PATCH'), payload: JSON.stringify(payload) }
  );
  if (res.getResponseCode() >= 300) {
    throw new Error('PATCH Supabase falhou: ' + res.getResponseCode());
  }
}

function formatDate_(iso) {
  if (!iso) return '';
  return Utilities.formatDate(new Date(iso), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}

function formatPhone_(phone) {
  if (!phone) return '';
  var d = String(phone).replace(/\D/g, '');
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return phone;
}

function fromRespostas_(respostas, key) {
  if (!respostas || !respostas[key]) return '';
  var item = respostas[key];
  return (typeof item === 'object' && item !== null) ? (item.resposta || item.valor || '') : String(item);
}

function dedupeLeads_(leads) {
  var best = {};
  leads.forEach(function (lead) {
    var key = lead.session_id || lead.id;
    var prev = best[key];
    if (!prev) { best[key] = lead; return; }
    var prevInc = prev.resultado === 'quiz-iniciado';
    var curInc = lead.resultado === 'quiz-iniciado';
    if (prevInc && !curInc) { best[key] = lead; return; }
    if (!prevInc && curInc) return;
    if (new Date(lead.created_at) > new Date(prev.created_at)) best[key] = lead;
  });
  return Object.keys(best).map(function (k) { return best[k]; })
    .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
}

function leadToRow_(lead) {
  var r = lead.respostas || {};
  return [
    formatDate_(lead.created_at), lead.lp_slug || '', lead.beneficio || '', lead.resultado || '',
    lead.nome || fromRespostas_(r, 'nome'),
    formatPhone_(lead.telefone || fromRespostas_(r, 'telefone')),
    lead.email || fromRespostas_(r, 'email'),
    fromRespostas_(r, 'q1'), fromRespostas_(r, 'q2'), fromRespostas_(r, 'q3'),
    fromRespostas_(r, 'q4'), fromRespostas_(r, 'q5'),
    lead.clicou_whatsapp ? 'Sim' : 'Não',
    lead.motivo_desqualificacao || '',
    lead.utm_source || '', lead.utm_medium || '', lead.utm_campaign || '',
    lead.utm_content || '', lead.utm_term || '',
    lead.fbclid || '', lead.gclid || '', lead.fbp || '', lead.fbc || '',
    normalizeStatus_(lead.status_comercial),
    lead.meta_capi_enviado_em ? formatDate_(lead.meta_capi_enviado_em) : '',
    lead.page_url || '', lead.id || ''
  ];
}

function syncLeadsFromSupabase() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) { setupSheet(); sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); }
  var rows = dedupeLeads_(fetchLeads_()).map(leadToRow_);
  var lastRow = sheet.getLastRow();
  clearAllDataValidations_(sheet);
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  applyStatusValidation_(sheet);
  sheet.autoResizeColumns(1, HEADERS.length);
  Logger.log('Sync Aposentadoria Rural OK: ' + rows.length + ' leads');
}

function createTimeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncLeadsFromSupabase') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncLeadsFromSupabase').timeBased().everyMinutes(1).create();
}

function createEditTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'handleStatusEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('handleStatusEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
}

function handleStatusEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME || e.range.getRow() <= 1) return;
  var statusCol = HEADERS.indexOf('Status') + 1;
  var idCol = HEADERS.indexOf('ID') + 1;
  var capiCol = HEADERS.indexOf('Meta CAPI Enviado') + 1;
  if (e.range.getColumn() !== statusCol) return;
  var row = e.range.getRow();
  var newStatus = String(e.range.getValue() || '').trim();
  var leadId = sheet.getRange(row, idCol).getValue();
  if (!leadId || !newStatus) return;
  try {
    patchLeadById_(leadId, { status_comercial: newStatus });
    if (newStatus === 'Vendido' && !sheet.getRange(row, capiCol).getValue()) {
      var lead = fetchLeadById_(leadId);
      if (lead && !lead.meta_capi_enviado_em) {
        sendMetaCapi_(lead);
        var now = new Date().toISOString();
        patchLeadById_(leadId, { status_comercial: 'Vendido', meta_capi_enviado_em: now });
        sheet.getRange(row, capiCol).setValue(formatDate_(now));
      }
    }
  } catch (err) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Erro: ' + err.message, 'MP Assessoria', 8);
  }
}

function fetchLeadById_(leadId) {
  var cfg = getConfig_();
  var res = UrlFetchApp.fetch(
    cfg.url + '/rest/v1/quiz_leads?id=eq.' + encodeURIComponent(leadId) + '&select=*',
    { method: 'get', muteHttpExceptions: true, headers: supabaseHeaders_('GET') }
  );
  if (res.getResponseCode() !== 200) return null;
  var rows = JSON.parse(res.getContentText());
  return rows.length ? rows[0] : null;
}

function sha256Hex_(value) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.newBlob(String(value)).getBytes());
  return digest.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function sendMetaCapi_(lead) {
  var token = PropertiesService.getScriptProperties().getProperty('META_CAPI_TOKEN');
  if (!token) throw new Error('Configure META_CAPI_TOKEN nas Propriedades do script.');
  var userData = {};
  if (lead.email) userData.em = [sha256Hex_(String(lead.email).trim().toLowerCase())];
  if (lead.telefone) {
    var d = String(lead.telefone).replace(/\D/g, '');
    if (d.length >= 10 && d.length <= 11 && d.indexOf('55') !== 0) d = '55' + d;
    userData.ph = [sha256Hex_(d)];
  }
  if (lead.fbc) userData.fbc = lead.fbc;
  if (lead.fbp) userData.fbp = lead.fbp;
  if (lead.fbclid && !userData.fbc) userData.fbc = 'fb.1.' + Math.floor(Date.now() / 1000) + '.' + lead.fbclid;
  if (!Object.keys(userData).length) throw new Error('Lead sem dados para CAPI.');
  var payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: 'venda-' + lead.id,
      action_source: 'system_generated',
      user_data: userData,
      custom_data: { currency: 'BRL', content_name: lead.beneficio || 'aposentadoria-rural' }
    }]
  };
  var url = 'https://graph.facebook.com/v21.0/' + META_PIXEL_ID + '/events?access_token=' + encodeURIComponent(token);
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  var body = JSON.parse(res.getContentText());
  if (res.getResponseCode() >= 300 || (body.error && body.error.message)) {
    throw new Error('Meta CAPI: ' + (body.error ? body.error.message : res.getContentText()));
  }
}

function removeTimeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncLeadsFromSupabase') ScriptApp.deleteTrigger(t);
  });
}
