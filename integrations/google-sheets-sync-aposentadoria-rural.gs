/**
 * MP Assessoria · Sync Supabase → Google Sheets
 * APENAS leads de Aposentadoria Rural (lp_slug aposentadoria-rural*)
 *
 * COMO USAR:
 * 1. Crie uma NOVA planilha em https://sheets.google.com (ex.: "Leads Aposentadoria Rural")
 * 2. Extensões → Apps Script
 * 3. APAGUE tudo no Código.gs e cole ESTE arquivo inteiro
 * 4. Configurações do projeto → Propriedades do script:
 *      SUPABASE_URL     = https://jiuxiyxsausauqfsudus.supabase.co
 *      SUPABASE_SECRET  = sb_secret_... (Secret key completa do Supabase)
 * 5. Execute "setupSheet" uma vez (autorize permissões)
 * 6. Execute "createTimeTrigger" uma vez
 *
 * Observação: use a planilha do auxilio-acidente com google-sheets-sync.gs
 * e esta planilha separada com ESTE script — cada uma filtra seu benefício.
 */

var SHEET_NAME = 'Leads';
var BENEFICIO_FILTER = 'aposentadoria-rural';

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
    .setBackground('#1a472a')
    .setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  syncLeadsFromSupabase();
}

function fetchLeads_() {
  var cfg = getConfig_();
  var endpoint = cfg.url + '/rest/v1/quiz_leads?select=*'
    + '&beneficio=eq.' + encodeURIComponent(BENEFICIO_FILTER)
    + '&order=created_at.desc&limit=1000';
  var headers = {
    apikey: cfg.secret,
    'Content-Type': 'application/json'
  };
  if (cfg.secret.indexOf('sb_secret_') !== 0 && cfg.secret.indexOf('sb_publishable_') !== 0) {
    headers.Authorization = 'Bearer ' + cfg.secret;
  }
  var res = UrlFetchApp.fetch(endpoint, {
    method: 'get',
    muteHttpExceptions: true,
    headers: headers
  });

  if (res.getResponseCode() !== 200) {
    throw new Error('Supabase retornou ' + res.getResponseCode() + ': ' + res.getContentText());
  }

  return JSON.parse(res.getContentText());
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
  var best = {};
  leads.forEach(function (lead) {
    var key = lead.session_id || lead.id;
    var prev = best[key];
    if (!prev) {
      best[key] = lead;
      return;
    }
    var prevIncomplete = prev.resultado === 'quiz-iniciado';
    var curIncomplete = lead.resultado === 'quiz-iniciado';
    if (prevIncomplete && !curIncomplete) {
      best[key] = lead;
      return;
    }
    if (!prevIncomplete && curIncomplete) {
      return;
    }
    if (new Date(lead.created_at) > new Date(prev.created_at)) {
      best[key] = lead;
    }
  });
  return Object.keys(best).map(function (key) {
    return best[key];
  }).sort(function (a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });
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
    lead.clicou_whatsapp ? 'Sim' : 'Não',
    lead.motivo_desqualificacao || '',
    lead.utm_source || '',
    lead.utm_medium || '',
    lead.utm_campaign || '',
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

  var leads = dedupeLeads_(fetchLeads_());
  var rows = leads.map(leadToRow_);
  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow, HEADERS.length).clearContent();
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  }

  sheet.autoResizeColumns(1, HEADERS.length);
  Logger.log('Sync Aposentadoria Rural OK: ' + rows.length + ' leads');
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

  Logger.log('Trigger criado: sync aposentadoria-rural a cada 1 minuto');
}

function removeTimeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncLeadsFromSupabase') {
      ScriptApp.deleteTrigger(t);
    }
  });
}
