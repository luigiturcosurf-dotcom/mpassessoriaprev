/**
 * MP Assessoria · Leads Supabase (quizzes + WhatsApp + atribuição)
 */
window.MPLeads = (function () {
    var SUPABASE_URL = 'https://jiuxiyxsausauqfsudus.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_EQdUpWMg45TuCM9Dj5pE3w_qHvi21AT';
    var TRACK_PREFIX = 'mp_track_';

    function getSessionId() {
        var id = sessionStorage.getItem('mp_lead_session');
        if (!id) {
            id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
            sessionStorage.setItem('mp_lead_session', id);
        }
        return id;
    }

    function getCookie(name) {
        var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function trackVal(key) {
        var p = new URLSearchParams(window.location.search);
        return p.get(key) || sessionStorage.getItem(TRACK_PREFIX + key) || null;
    }

    function getAttributionParams() {
        var fbclid = trackVal('fbclid');
        var fbc = sessionStorage.getItem(TRACK_PREFIX + 'fbc') || getCookie('_fbc');
        if (!fbc && fbclid) {
            fbc = 'fb.1.' + Date.now() + '.' + fbclid;
            sessionStorage.setItem(TRACK_PREFIX + 'fbc', fbc);
        }
        return {
            utm_source: trackVal('utm_source'),
            utm_medium: trackVal('utm_medium'),
            utm_campaign: trackVal('utm_campaign'),
            utm_content: trackVal('utm_content'),
            utm_term: trackVal('utm_term'),
            fbclid: fbclid,
            gclid: trackVal('gclid'),
            fbp: sessionStorage.getItem(TRACK_PREFIX + 'fbp') || getCookie('_fbp'),
            fbc: fbc
        };
    }

    var LP_PAGE_SLUGS = {
        'analise-de-beneficio': true,
        'analise': true
    };

    function detectLpSlug() {
        var parts = window.location.pathname.split('/').filter(Boolean);
        var i;
        for (i = parts.length - 1; i >= 0; i--) {
            var part = parts[i];
            if (part.indexOf('.html') !== -1) continue;
            if (LP_PAGE_SLUGS[part]) continue;
            return part;
        }
        return 'unknown';
    }

    function buildRespostas(answers, labels, extra) {
        var out = extra ? Object.assign({}, extra) : {};
        Object.keys(answers || {}).forEach(function (key) {
            var val = answers[key];
            if (val === null || val === undefined) return;
            out[key] = {
                valor: val,
                resposta: (labels[key] && labels[key][val]) ? labels[key][val] : String(val)
            };
        });
        return out;
    }

    function buildHeaders(prefer) {
        var headers = {
            apikey: SUPABASE_KEY,
            Authorization: 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json'
        };
        if (prefer) headers.Prefer = prefer;
        return headers;
    }

    function request(path, method, body, prefer, keepalive) {
        return fetch(SUPABASE_URL + '/rest/v1/' + path, {
            method: method,
            headers: buildHeaders(prefer),
            body: body ? JSON.stringify(body) : undefined,
            keepalive: !!keepalive
        });
    }

    function hasSavedLead() {
        return sessionStorage.getItem('mp_lead_saved') === '1';
    }

    function markLeadSaved() {
        sessionStorage.setItem('mp_lead_saved', '1');
    }

    function parsePatchCount_(res) {
        var range = res.headers.get('Content-Range') || '';
        var match = range.match(/\/(\d+)/);
        if (match) return parseInt(match[1], 10);
        return res.ok ? -1 : 0;
    }

    function insertLead(payload, keepalive) {
        var attr = getAttributionParams();
        var body = Object.assign({
            session_id: getSessionId(),
            lp_slug: detectLpSlug(),
            page_url: window.location.href,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
            utm_source: attr.utm_source,
            utm_medium: attr.utm_medium,
            utm_campaign: attr.utm_campaign,
            utm_content: attr.utm_content,
            utm_term: attr.utm_term,
            fbclid: attr.fbclid,
            gclid: attr.gclid,
            fbp: attr.fbp,
            fbc: attr.fbc,
            status_comercial: 'Novo'
        }, payload);

        return request('quiz_leads', 'POST', body, 'return=minimal', keepalive)
            .then(function (res) {
                if (!res.ok) {
                    return res.text().then(function (txt) {
                        console.error('[MPLeads] INSERT falhou:', res.status, txt);
                        return null;
                    });
                }
                markLeadSaved();
                return getSessionId();
            })
            .catch(function (err) {
                console.error('[MPLeads] INSERT erro:', err);
                return null;
            });
    }

    function patchLead(payload, keepalive) {
        if (!hasSavedLead()) {
            return insertLead(payload, keepalive);
        }
        return request(
            'quiz_leads?session_id=eq.' + encodeURIComponent(getSessionId()),
            'PATCH',
            payload,
            'return=minimal,count=exact',
            keepalive
        ).then(function (res) {
            var count = parsePatchCount_(res);
            if (res.ok && count > 0) {
                markLeadSaved();
                return getSessionId();
            }
            if (res.ok && count === 0) {
                console.warn('[MPLeads] PATCH não atualizou linha, usando INSERT');
                return insertLead(payload, keepalive);
            }
            return res.text().then(function (txt) {
                console.error('[MPLeads] PATCH falhou:', res.status, txt);
                return insertLead(payload, keepalive);
            });
        }).catch(function (err) {
            console.error('[MPLeads] PATCH erro:', err);
            return insertLead(payload, keepalive);
        });
    }

    function contactExtra(contact) {
        if (!contact) return {};
        var out = {
            nome: { valor: contact.nome, resposta: contact.nome },
            telefone: { valor: contact.telefone, resposta: contact.telefone },
            email: { valor: contact.email, resposta: contact.email }
        };
        if (contact.lgpdAceite) {
            out.lgpd = {
                valor: true,
                resposta: 'Autorizado em ' + (contact.lgpdAceiteEm || new Date().toISOString())
            };
        }
        return out;
    }

    function saveContactLead(opts) {
        if (!opts || !opts.beneficio || !opts.nome || !opts.telefone || !opts.email || !opts.lgpdAceite) {
            return Promise.resolve(null);
        }
        var payload = {
            beneficio: opts.beneficio,
            resultado: 'quiz-iniciado',
            respostas: buildRespostas({}, {}, contactExtra(opts)),
            clicou_whatsapp: false,
            nome: opts.nome,
            telefone: opts.telefone,
            email: opts.email
        };
        if (hasSavedLead()) {
            return patchLead(payload, opts.keepalive);
        }
        return insertLead(payload, opts.keepalive);
    }

    function buildQuizPayload(opts) {
        var payload = {
            beneficio: opts.beneficio,
            resultado: opts.resultado,
            motivo_desqualificacao: opts.motivo || null,
            respostas: buildRespostas(opts.answers, opts.labels, contactExtra(opts.contact))
        };
        if (opts.contact) {
            payload.nome = opts.contact.nome;
            payload.telefone = opts.contact.telefone;
            payload.email = opts.contact.email;
        }
        if (opts.clicouWhatsapp) {
            payload.clicou_whatsapp = true;
            payload.clicou_whatsapp_em = new Date().toISOString();
        }
        if (opts.eventoMeta) payload.evento_meta = opts.eventoMeta;
        if (opts.metaEventId) payload.meta_event_id = opts.metaEventId;
        return payload;
    }

    function saveQuizLead(opts) {
        if (!opts || !opts.beneficio || !opts.resultado) {
            return Promise.resolve(null);
        }
        var payload = buildQuizPayload(opts);
        if (opts.resultado !== 'quiz-iniciado') {
            return insertLead(payload, opts.keepalive);
        }
        if (hasSavedLead()) {
            return patchLead(payload, opts.keepalive);
        }
        return insertLead(payload, opts.keepalive);
    }

    function saveWaLead(opts) {
        if (!opts || !opts.beneficio) return Promise.resolve(null);
        var cta = opts.cta || 'whatsapp';
        return insertLead({
            beneficio: opts.beneficio,
            resultado: opts.resultado || 'whatsapp-direct',
            motivo_desqualificacao: null,
            respostas: buildRespostas({}, {}, {
                cta: { valor: cta, resposta: cta }
            }),
            clicou_whatsapp: opts.clicouWhatsapp !== false
        });
    }

    function markWhatsAppClick() {
        if (!hasSavedLead()) {
            return Promise.resolve(null);
        }
        return patchLead({
            clicou_whatsapp: true,
            clicou_whatsapp_em: new Date().toISOString()
        }, true);
    }

    function saveQuizWithWhatsApp(opts) {
        if (!opts || !opts.beneficio || !opts.resultado) {
            return Promise.resolve(null);
        }
        return saveQuizLead(Object.assign({}, opts, { clicouWhatsapp: true, keepalive: true }));
    }

    function resetSession() {
        sessionStorage.removeItem('mp_lead_session');
        sessionStorage.removeItem('mp_lead_id');
        sessionStorage.removeItem('mp_lead_saved');
        sessionStorage.removeItem('mp_lead_contact');
    }

    function bindOnce(link, handler) {
        if (link._mpTracked) return;
        link._mpTracked = true;
        link.addEventListener('click', handler);
    }

    function initLpTracking(beneficio) {
        var waSelectors = 'a[href*="wa.me"], .wa-link, a.cta-button, .wa-float, .whatsapp-float';

        document.querySelectorAll(waSelectors).forEach(function (link) {
            if (link.classList.contains('quiz-cta')) return;
            bindOnce(link, function () {
                saveWaLead({
                    beneficio: beneficio,
                    cta: link.getAttribute('data-cta') || 'whatsapp',
                    resultado: 'whatsapp-direct',
                    clicouWhatsapp: true
                });
            });
        });

        document.querySelectorAll('a.quiz-cta[href*="analise"]').forEach(function (link) {
            bindOnce(link, function () {
                /* contato é gravado na etapa do formulário */
            });
        });
    }

    return {
        saveContactLead: saveContactLead,
        saveQuizLead: saveQuizLead,
        saveQuizWithWhatsApp: saveQuizWithWhatsApp,
        saveWaLead: saveWaLead,
        markWhatsAppClick: markWhatsAppClick,
        resetSession: resetSession,
        initLpTracking: initLpTracking
    };
})();
