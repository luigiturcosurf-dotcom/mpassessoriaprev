(function () {
    var WA_NUMBER = '5511947642923';
    var META_PIXEL_ID = '1229096362421532';
    var CAPI_ENDPOINT = 'https://jiuxiyxsausauqfsudus.supabase.co/functions/v1/capi-lead-router';
    var WA_AUTO_REDIRECT_MS = 3000;
    var BENEFICIO = 'pensao-por-morte';
    var waAutoRedirectTimer = null;
    var waRedirectDone = false;

    var FIXED_STEPS = ['intro', 'contact', 'q1'];
    var currentStep = 'intro';
    var skipQ4 = false;

    var contact = { nome: '', telefone: '', email: '', lgpdAceite: false, lgpdAceiteEm: null };
    var answers = { q1: null, q2: null, q3: null, q3b: null, q4: null, q5: null, q6: null, q7: null, q8: null, q9: null };

    // ============================================================
    // FLUXOS CONDICIONAIS POR VÍNCULO (após q1)
    // - Cônjuge/companheira: idade define duração (q5) + provas do vínculo (q6-q8)
    // - Responsável por menor de 21: direito é do menor; dependência presumida
    // - Filho: só a idade decide (menor de 21 = direito; 21+ = ressalva invalidez)
    // - Pai/Mãe e Irmão: dependência econômica é decisiva (q9)
    // Dependência (q9) NÃO é perguntada a cônjuge/filho: é presumida por lei
    // (Art. 16, §4º, Lei 8.213/91).
    // ============================================================
    var FLOWS = {
        'conjuge': ['q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'],
        'companheiro': ['q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'],
        'responsavel-menor': ['q2', 'q3', 'q4'],
        'filho': ['q2', 'q3', 'q4', 'q5'],
        'pai-mae': ['q2', 'q3', 'q4', 'q9'],
        'irmao': ['q2', 'q3', 'q4', 'q9']
    };

    var LABELS = {
        q1: {
            conjuge: 'Cônjuge (casado no civil)',
            companheiro: 'Companheiro(a) — união estável',
            'responsavel-menor': 'Mãe/pai ou responsável por filho(a) menor de 21 anos',
            filho: 'Filho(a)',
            'pai-mae': 'Pai / Mãe',
            irmao: 'Irmão(ã)'
        },
        q2: {
            'menos-90': 'Há menos de 90 dias',
            '90d-5a': 'Entre 90 dias e 5 anos',
            'mais-5a': 'Há mais de 5 anos'
        },
        q3: {
            aposentado: 'Sim, era aposentado(a)',
            auxilio: 'Sim, recebia auxílio-doença ou auxílio-acidente',
            contribuia: 'Não recebia, mas trabalhava registrado, contribuía ou era assegurado(a) especial',
            'nao-contribuia': 'Não recebia e não contribuía'
        },
        q3b: {
            passado: 'Sim, trabalhou registrado ou contribuiu no passado',
            'nao-sei': 'Não sei informar',
            nunca: 'Não, nunca trabalhou registrado nem contribuiu'
        },
        q4: {
            trabalhando: 'Sim, estava trabalhando / contribuindo',
            'parou-12m': 'Parou há menos de 12 meses',
            'parou-mais-12m': 'Parou há mais de 12 meses',
            'skip-aprovado': 'Não se aplica (benefício ativo do falecido)'
        },
        q5: {
            'menos-22': 'Menos de 22 anos',
            '22-27': 'Entre 22 e 27 anos',
            '28-30': 'Entre 28 e 30 anos',
            '31-41': 'Entre 31 e 41 anos',
            '42-44': 'Entre 42 e 44 anos',
            '45-mais': '45 anos ou mais'
        },
        q6: {
            casado: 'Casado(a), com certidão de casamento',
            'uniao-estavel': 'União estável',
            nao: 'Não era casado nem vivia em união estável'
        },
        q7: {
            'menos-2a': 'Menos de 2 anos',
            '2a-mais': '2 anos ou mais'
        },
        q8: {
            sim: 'Sim',
            nao: 'Não'
        },
        q9: {
            total: 'Sim, dependia totalmente',
            parcial: 'Dependia parcialmente',
            nao: 'Não dependia'
        }
    };

    var RESSALVA_MSG = {
        irmao: {
            title: 'Seu caso exige análise detalhada',
            text: 'Irmãos(ãs) só recebem pensão em situações específicas, na ausência de cônjuge, filhos ou pais, e com dependência econômica comprovada. Mesmo assim, vale falar com nosso especialista — há exceções que só uma análise individual confirma.'
        },
        'parou-mais-12m': {
            title: 'A qualidade de segurado precisa ser verificada',
            text: 'Quando o falecido parou de contribuir há mais de 12 meses, o INSS pode negar por perda de qualidade de segurado. Porém, o período de graça pode se estender (desemprego comprovado ou +120 contribuições). Nossa equipe analisa isso gratuitamente.'
        },
        dependencia: {
            title: 'Dependência econômica precisa ser comprovada',
            text: 'Para pais, mães ou irmãos, a dependência financeira do falecido é decisiva. Mesmo sem certeza agora, documentos e provas podem existir — fale com um especialista antes de desistir.'
        },
        'sem-contribuicao': {
            title: 'Sem contribuição ao INSS, a pensão é negada',
            text: 'A Pensão por Morte exige que a pessoa falecida tivesse qualidade de segurado — ou seja, que contribuísse para o INSS ou já recebesse benefício. Se ela nunca trabalhou registrado nem contribuiu de nenhuma forma, o INSS nega o pedido. Exceção rara: se ela já tinha cumprido todos os requisitos para se aposentar e não pediu. Se acredita que é o caso, fale com nosso especialista.'
        },
        'filho-maior-21': {
            title: 'Filhos com mais de 21 anos não têm direito à pensão',
            text: 'Pela lei, filhos recebem pensão apenas até os 21 anos — a exceção é para filhos inválidos ou com deficiência, em qualquer idade. Se este for o seu caso, fale com nosso especialista. Importante: a viúva ou companheira(o) do falecido (por exemplo, sua mãe) pode ter direito à pensão — compartilhe esta análise com ela.'
        },
        default: {
            title: 'Seu caso merece uma análise individual',
            text: 'Algumas respostas indicam pontos de atenção, mas a pensão por morte tem muitas exceções legais. Não desista antes de falar com nosso especialista — a avaliação inicial é gratuita.'
        }
    };

    var btnBack = document.getElementById('btn-back');
    var btnRestart = document.getElementById('btn-restart');
    var btnStart = document.getElementById('btn-start');
    var contactForm = document.getElementById('contact-form');
    var inputNome = document.getElementById('contact-nome');
    var inputTelefone = document.getElementById('contact-telefone');
    var inputEmail = document.getElementById('contact-email');
    var inputLgpd = document.getElementById('contact-lgpd');
    var lgpdLabel = document.getElementById('lgpd-label');
    var btnContactSubmit = document.getElementById('btn-contact-submit');
    var progressWrap = document.getElementById('progress-wrap');
    var progressFill = document.getElementById('progress-fill');
    var progressLabel = document.getElementById('progress-label');

    function onlyDigits(v) { return (v || '').replace(/\D/g, ''); }

    function formatPhoneDisplay(digits) {
        var d = onlyDigits(digits);
        if (d.length <= 2) return d ? '(' + d : '';
        if (d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
        if (d.length <= 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length === 11 ? 7 : 6) + '-' + d.slice(d.length === 11 ? 7 : 6);
        return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7, 11);
    }

    // ============================================================
    // FLUXO DINÂMICO
    // ============================================================
    function activeFlow() {
        var flow = FLOWS[answers.q1] || FLOWS['conjuge'];
        // v2.1: falecido "não recebia e não contribuía" → pergunta condicional
        // sobre contribuição em qualquer momento da vida (qualidade de segurado)
        if (answers.q3 === 'nao-contribuia') {
            var i = flow.indexOf('q3');
            flow = flow.slice(0, i + 1).concat(['q3b']).concat(flow.slice(i + 1));
        }
        if (skipQ4) {
            flow = flow.filter(function (s) { return s !== 'q4'; });
        }
        return flow;
    }

    function fullStepList() {
        return FIXED_STEPS.concat(activeFlow());
    }

    function questionList() {
        return ['q1'].concat(activeFlow());
    }

    function nextAfter(stepId) {
        var steps = fullStepList();
        var i = steps.indexOf(stepId);
        if (i === -1 || i === steps.length - 1) return null;
        return steps[i + 1];
    }

    function prevBefore(stepId) {
        var steps = fullStepList();
        var i = steps.indexOf(stepId);
        if (i <= 0) return null;
        return steps[i - 1];
    }

    function loadStoredContact() {
        try {
            var raw = sessionStorage.getItem('mp_lead_contact');
            if (!raw) return;
            var data = JSON.parse(raw);
            contact.nome = data.nome || '';
            contact.telefone = data.telefone || '';
            contact.email = data.email || '';
            contact.lgpdAceite = !!data.lgpdAceite;
            contact.lgpdAceiteEm = data.lgpdAceiteEm || null;
            inputNome.value = contact.nome;
            inputTelefone.value = formatPhoneDisplay(contact.telefone);
            inputEmail.value = contact.email;
            inputLgpd.checked = contact.lgpdAceite;
        } catch (e) {}
    }

    function storeContact() { sessionStorage.setItem('mp_lead_contact', JSON.stringify(contact)); }

    function showFieldError(fieldId, errId, message) {
        var field = document.getElementById(fieldId);
        var err = document.getElementById(errId);
        if (field) field.classList.add('input-error');
        if (err) { err.textContent = message; err.hidden = false; }
    }

    function clearFieldErrors() {
        ['contact-nome', 'contact-telefone', 'contact-email'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.classList.remove('input-error');
        });
        ['err-nome', 'err-telefone', 'err-email', 'err-lgpd'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.hidden = true;
        });
        if (lgpdLabel) lgpdLabel.classList.remove('input-error');
    }

    function validateContact() {
        clearFieldErrors();
        var valid = true;
        var nome = inputNome.value.trim().replace(/\s+/g, ' ');
        var telefone = onlyDigits(inputTelefone.value);
        var email = inputEmail.value.trim().toLowerCase();
        if (nome.length < 3 || nome.indexOf(' ') === -1) {
            showFieldError('contact-nome', 'err-nome', 'Informe seu nome completo.');
            valid = false;
        }
        if (telefone.length < 10 || telefone.length > 11) {
            showFieldError('contact-telefone', 'err-telefone', 'Informe um telefone válido com DDD.');
            valid = false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showFieldError('contact-email', 'err-email', 'Informe um e-mail válido.');
            valid = false;
        }
        if (valid) {
            contact.nome = nome;
            contact.telefone = telefone;
            contact.email = email;
            storeContact();
        }
        return valid;
    }

    function validateLgpd() {
        var errLgpd = document.getElementById('err-lgpd');
        if (inputLgpd.checked) {
            if (lgpdLabel) lgpdLabel.classList.remove('input-error');
            if (errLgpd) errLgpd.hidden = true;
            contact.lgpdAceite = true;
            contact.lgpdAceiteEm = new Date().toISOString();
            storeContact();
            return true;
        }
        if (lgpdLabel) lgpdLabel.classList.add('input-error');
        if (errLgpd) errLgpd.hidden = false;
        return false;
    }

    function updateProgress(stepId) {
        var visible = questionList();
        var qIndex = visible.indexOf(stepId);
        if (qIndex === -1) return;
        progressFill.style.width = ((qIndex + 1) / visible.length * 100) + '%';
        progressLabel.textContent = 'Pergunta ' + (qIndex + 1) + ' de ' + visible.length;
    }

    function showStep(stepId) {
        currentStep = stepId;
        document.querySelectorAll('.quiz-step').forEach(function (el) { el.classList.remove('active'); });
        var step = document.querySelector('[data-step="' + stepId + '"]');
        if (step) step.classList.add('active');

        var isQuestion = questionList().indexOf(stepId) !== -1;
        progressWrap.hidden = !isQuestion;
        if (isQuestion) updateProgress(stepId);

        var isResult = stepId === 'qualified' || stepId === 'qualified-soft' || stepId === 'disqualified';
        btnBack.disabled = stepId === 'intro' || isResult;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function advance(fromStep) {
        var next = nextAfter(fromStep);
        if (next) showStep(next);
        else finishQuiz();
    }

    function persistLead(resultado, motivo) {
        if (typeof MPLeads === 'undefined') return Promise.resolve(null);
        return MPLeads.saveQuizLead(buildLeadSaveOpts(resultado, motivo));
    }

    function buildLeadSaveOpts(resultado, motivo) {
        return {
            beneficio: BENEFICIO,
            resultado: resultado,
            motivo: motivo || null,
            answers: answers,
            labels: LABELS,
            contact: contact,
            eventoMeta: lastMetaEvent.nome,
            metaEventId: lastMetaEvent.id
        };
    }

    function persistContact() {
        if (typeof MPLeads === 'undefined') return Promise.resolve(null);
        return MPLeads.saveContactLead({
            beneficio: BENEFICIO,
            nome: contact.nome,
            telefone: contact.telefone,
            email: contact.email,
            lgpdAceite: contact.lgpdAceite,
            lgpdAceiteEm: contact.lgpdAceiteEm
        });
    }

    function buildWaMessage(type) {
        var parts = ['Olá! Vim pelo site e quero saber se tenho direito à Pensão por Morte.', ''];
        if (contact.nome) parts.push('• Nome: ' + contact.nome);
        if (contact.telefone) parts.push('• Telefone: ' + formatPhoneDisplay(contact.telefone));
        if (contact.email) parts.push('• E-mail: ' + contact.email);
        parts.push('');
        if (answers.q1) parts.push('• Vínculo com o falecido: ' + LABELS.q1[answers.q1]);
        if (answers.q2) parts.push('• Data do falecimento: ' + LABELS.q2[answers.q2]);
        if (answers.q3) parts.push('• Benefício do INSS do falecido: ' + LABELS.q3[answers.q3]);
        if (answers.q3b) parts.push('• Contribuição em vida: ' + LABELS.q3b[answers.q3b]);
        if (answers.q4) parts.push('• Situação de contribuição: ' + LABELS.q4[answers.q4]);
        if (answers.q5) parts.push('• Minha idade: ' + LABELS.q5[answers.q5]);
        if (answers.q6) parts.push('• Casamento/União estável: ' + LABELS.q6[answers.q6]);
        if (answers.q7) parts.push('• Tempo de relação: ' + LABELS.q7[answers.q7]);
        if (answers.q8) parts.push('• Filhos em comum: ' + LABELS.q8[answers.q8]);
        if (answers.q9) parts.push('• Dependência financeira: ' + LABELS.q9[answers.q9]);
        parts.push('');
        if (type === 'qualified') {
            parts.push('Pelo questionário, acredito ter perfil para a pensão por morte. Gostaria de falar com um advogado.');
        } else if (type === 'soft') {
            parts.push('Meu caso tem alguns pontos de atenção. Gostaria de uma análise documental com um especialista.');
        } else {
            parts.push('Sei que meu caso exige análise mais detalhada. Gostaria de orientação com um especialista.');
        }
        return encodeURIComponent(parts.join('\n'));
    }

    function getLpSlug() {
        var parts = window.location.pathname.split('/').filter(Boolean);
        var i;
        for (i = parts.length - 1; i >= 0; i--) {
            if (parts[i].indexOf('.html') === -1) return parts[i];
        }
        return 'pensao-por-morte';
    }

    function pushDataLayer(eventName, extra) {
        window.dataLayer = window.dataLayer || [];
        var payload = {
            event: eventName,
            beneficio: BENEFICIO,
            lp_slug: getLpSlug()
        };
        if (extra) {
            Object.keys(extra).forEach(function (key) {
                payload[key] = extra[key];
            });
        }
        window.dataLayer.push(payload);
    }

    // ============================================================
    // TRACKING META — Lead SÓ após o quiz, com roteamento e dedup
    // ============================================================
    function gerarEventId() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'ev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }

    function getCookie(name) {
        var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
        return m ? m[1] : null;
    }

    // fbp/fbc: prioriza a atribuição persistida pelo attribution.js
    // (inclui fbc reconstruído do fbclid — match superior ao cookie puro)
    function getFbp() {
        return sessionStorage.getItem('mp_track_fbp') || getCookie('_fbp') || null;
    }
    function getFbc() {
        var fbc = sessionStorage.getItem('mp_track_fbc') || getCookie('_fbc');
        if (fbc) return fbc;
        var fbclid = new URLSearchParams(window.location.search).get('fbclid')
            || sessionStorage.getItem('mp_track_fbclid');
        return fbclid ? ('fb.1.' + Date.now() + '.' + fbclid) : null;
    }

    function enviarEventoCAPI(eventName, eventId) {
        try {
            fetch(CAPI_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: true,
                body: JSON.stringify({
                    event_name: eventName,
                    event_id: eventId,
                    email: contact.email || null,
                    telefone: contact.telefone || null,
                    vinculo: answers.q1 || null,
                    fonte: getLpSlug(),
                    fbp: getFbp(),
                    fbc: getFbc(),
                    url: window.location.href,
                    user_agent: navigator.userAgent
                })
            });
        } catch (e) {}
    }

    var lastMetaEvent = { nome: null, id: null };

    // Chamado APENAS em finishQuiz — nunca no formulário de contato.
    // v2.1: pai/mãe e irmão(ã) qualificados viram LeadSecundario (custom,
    // fora da otimização) — o evento Lead fica restrito à persona-alvo.
    function trackMetaQuizResult(resultado, motivo) {
        var qualificado = (resultado !== 'disqualified');
        var secundario = qualificado && (answers.q1 === 'pai-mae' || answers.q1 === 'irmao');
        var eventName = !qualificado ? 'LeadDesqualificado' : (secundario ? 'LeadSecundario' : 'Lead');
        var eventId = gerarEventId();
        lastMetaEvent = { nome: eventName, id: eventId };

        if (typeof fbq === 'function') {
            var params = {
                content_name: 'Pensão por Morte INSS',
                content_category: 'previdenciario',
                lp_slug: getLpSlug(),
                vinculo: answers.q1 || '',
                resultado: resultado
            };
            if (eventName === 'Lead') {
                fbq('trackSingle', META_PIXEL_ID, 'Lead', params, { eventID: eventId });
            } else {
                if (eventName === 'LeadDesqualificado') params.motivo = motivo || '';
                fbq('trackSingleCustom', META_PIXEL_ID, eventName, params, { eventID: eventId });
            }
        }
        enviarEventoCAPI(eventName, eventId);

        pushDataLayer(eventName === 'Lead' ? 'lead_qualificado' : (eventName === 'LeadSecundario' ? 'lead_secundario' : 'lead_desqualificado'), {
            resultado: resultado,
            vinculo: answers.q1 || '',
            motivo: motivo || null,
            event_id: eventId
        });
    }

    function goToWhatsApp(type, resultado) {
        if (waRedirectDone) return;
        waRedirectDone = true;
        pushDataLayer('lead_whatsapp_click', {
            resultado: resultado || type,
            telefone_preenchido: !!contact.telefone
        });
        if (waAutoRedirectTimer) { clearTimeout(waAutoRedirectTimer); waAutoRedirectTimer = null; }
        var url = 'https://wa.me/' + WA_NUMBER + '?text=' + buildWaMessage(type);
        // CRM em paralelo (keepalive). Conversão Google ANTES do redirect.
        if (typeof MPLeads !== 'undefined' && resultado) {
            MPLeads.saveQuizWithWhatsApp(buildLeadSaveOpts(resultado));
        } else if (typeof MPLeads !== 'undefined') {
            MPLeads.markWhatsAppClick();
        }

        if (typeof MPGoogleAds !== 'undefined') {
            MPGoogleAds.redirectWithConversion(url);
        } else {
            window.location.href = url;
        }
    }

    function showQualifiedResult(stepId, resultado, waType) {
        persistLead(resultado).then(function () {
            showStep(stepId);
            waRedirectDone = false;
            var hintId = waType === 'soft' ? 'wa-redirect-hint-soft' : 'wa-redirect-hint-qualified';
            var hint = document.getElementById(hintId);
            if (hint) hint.hidden = false;
            waAutoRedirectTimer = setTimeout(function () { goToWhatsApp(waType, resultado); }, WA_AUTO_REDIRECT_MS);
        });
    }

    function showRessalva(reason) {
        var msg = RESSALVA_MSG[reason] || RESSALVA_MSG.default;
        document.getElementById('disqualify-title').textContent = msg.title;
        document.getElementById('disqualify-text').textContent = msg.text;
        persistLead('disqualified', reason).then(function () { showStep('disqualified'); });
    }

    // ============================================================
    // SCORING CORRIGIDO
    // - Filho com 22+ anos: desqualificação direta (exceção invalidez
    //   tratada na ressalva/atendimento)
    // - q5 (45+) só pontua para cônjuge/companheira (regra da vitalícia)
    // - q9 (dependência) só existe para pai/mãe/irmão
    // - Responsável por menor de 21: dependência do menor é presumida
    // ============================================================
    function computeResult() {
        var approve = 0;
        var uncertain = 0;
        var encerra = 0;
        var ressalvaReason = 'default';
        var isConjugal = (answers.q1 === 'conjuge' || answers.q1 === 'companheiro');

        // --- v2.1: falecido nunca contribuiu = sem qualidade de segurado ---
        if (answers.q3 === 'nao-contribuia' && answers.q3b === 'nunca') {
            return { step: 'disqualified', resultado: 'disqualified', wa: 'disqualify', reason: 'sem-contribuicao' };
        }

        // --- Desqualificação direta: filho com 22 anos ou mais ---
        if (answers.q1 === 'filho' && answers.q5 && answers.q5 !== 'menos-22') {
            return { step: 'disqualified', resultado: 'disqualified', wa: 'disqualify', reason: 'filho-maior-21' };
        }

        // q1 — vínculo
        if (isConjugal || answers.q1 === 'responsavel-menor') approve++;
        else if (answers.q1 === 'filho') approve++; // já validado: menos de 22
        else if (answers.q1 === 'pai-mae') uncertain++;
        else if (answers.q1 === 'irmao') { encerra++; ressalvaReason = 'irmao'; }

        // q2 — data do óbito
        if (answers.q2 === 'menos-90' || answers.q2 === '90d-5a') approve++;
        else if (answers.q2 === 'mais-5a') uncertain++;

        // q3 — situação do falecido no INSS
        if (answers.q3 === 'aposentado' || answers.q3 === 'auxilio') approve++;
        else if (answers.q3 === 'contribuia') approve++;
        else {
            uncertain++;
            // v2.1: contribuiu só no passado ou não sabe → análise de CNIS obrigatória
            if (answers.q3b === 'passado' || answers.q3b === 'nao-sei') uncertain++;
        }

        // q4 — qualidade de segurado
        if (answers.q4 === 'trabalhando' || answers.q4 === 'parou-12m' || answers.q4 === 'skip-aprovado') approve++;
        else if (answers.q4 === 'parou-mais-12m') { encerra++; ressalvaReason = 'parou-mais-12m'; }

        // q5 — idade: só pontua para cônjuge/companheira (duração/vitalícia)
        if (isConjugal && answers.q5 === '45-mais') approve++;

        // q6/q7/q8 — só existem no fluxo conjugal
        if (isConjugal) {
            if (answers.q6 === 'casado') approve++;
            else if (answers.q6 === 'uniao-estavel') uncertain++;
            else if (answers.q6 === 'nao') uncertain++;

            if (answers.q7 === '2a-mais') approve++;
            else if (answers.q7 === 'menos-2a') uncertain++;

            if (answers.q8 === 'sim') approve++;
        }

        // q9 — dependência: só existe para pai/mãe/irmão
        if (answers.q1 === 'pai-mae' || answers.q1 === 'irmao') {
            if (answers.q9 === 'total') approve++;
            else if (answers.q9 === 'parcial') uncertain++;
            else if (answers.q9 === 'nao') {
                return { step: 'disqualified', resultado: 'disqualified', wa: 'disqualify', reason: 'dependencia' };
            }
        }

        if (encerra > 0 && approve === 0) return { step: 'disqualified', resultado: 'disqualified', wa: 'disqualify', reason: ressalvaReason };
        if (encerra > 0 || uncertain >= 2) return { step: 'qualified-soft', resultado: 'qualified-soft', wa: 'soft', reason: null };
        if (uncertain > 0) return { step: 'qualified-soft', resultado: 'qualified-soft', wa: 'soft', reason: null };
        return { step: 'qualified', resultado: 'qualified', wa: 'qualified', reason: null };
    }

    function finishQuiz() {
        var r = computeResult();
        // Evento Meta roteado pelo resultado — ÚNICO ponto de disparo do Lead
        trackMetaQuizResult(r.resultado, r.reason);
        if (r.step === 'disqualified') showRessalva(r.reason);
        else showQualifiedResult(r.step, r.resultado, r.wa);
    }

    function handleQ1(v) { answers.q1 = v; advance('q1'); }
    function handleQ2(v) { answers.q2 = v; advance('q2'); }
    function handleQ3(v) {
        answers.q3 = v;
        if (v !== 'nao-contribuia') answers.q3b = null;
        skipQ4 = (v === 'aposentado' || v === 'auxilio');
        if (skipQ4) answers.q4 = 'skip-aprovado';
        advance('q3');
    }
    function handleQ3b(v) {
        answers.q3b = v;
        if (v === 'nunca') { finishQuiz(); return; }
        advance('q3b');
    }
    function handleQ4(v) { answers.q4 = v; advance('q4'); }
    function handleQ5(v) { answers.q5 = v; advance('q5'); }
    function handleQ6(v) { answers.q6 = v; advance('q6'); }
    function handleQ7(v) { answers.q7 = v; advance('q7'); }
    function handleQ8(v) { answers.q8 = v; advance('q8'); }
    function handleQ9(v) { answers.q9 = v; advance('q9'); }

    function resetQuiz() {
        if (waAutoRedirectTimer) { clearTimeout(waAutoRedirectTimer); waAutoRedirectTimer = null; }
        waRedirectDone = false;
        skipQ4 = false;
        ['wa-redirect-hint-qualified', 'wa-redirect-hint-soft'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.hidden = true;
        });
        if (typeof MPLeads !== 'undefined') MPLeads.resetSession();
        contact = { nome: '', telefone: '', email: '', lgpdAceite: false, lgpdAceiteEm: null };
        inputNome.value = ''; inputTelefone.value = ''; inputEmail.value = ''; inputLgpd.checked = false;
        answers = { q1: null, q2: null, q3: null, q3b: null, q4: null, q5: null, q6: null, q7: null, q8: null, q9: null };
        document.querySelectorAll('.option-btn.selected').forEach(function (b) { b.classList.remove('selected'); });
        clearFieldErrors();
        showStep('intro');
    }

    btnStart.addEventListener('click', function () { showStep('contact'); });

    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validateContact() || !validateLgpd()) return;
        btnContactSubmit.disabled = true;
        btnContactSubmit.textContent = 'Salvando...';
        persistContact().then(function (leadId) {
            if (!leadId) {
                btnContactSubmit.disabled = false;
                btnContactSubmit.textContent = 'Iniciar análise';
                var errLgpd = document.getElementById('err-lgpd');
                if (errLgpd) { errLgpd.textContent = 'Não foi possível salvar. Tente novamente.'; errLgpd.hidden = false; }
                return;
            }

            // IMPORTANTE: aqui NÃO dispara mais o Lead.
            // Evento custom de funil (fora da otimização) para medir o passo.
            if (typeof fbq === 'function') {
                fbq('trackSingleCustom', META_PIXEL_ID, 'CadastroContato', {
                    content_name: 'Pensão por Morte INSS',
                    lp_slug: getLpSlug()
                });
            }
            pushDataLayer('lead_form_submit', {
                telefone_preenchido: !!contact.telefone,
                email_preenchido: !!contact.email
            });

            btnContactSubmit.textContent = 'Salvo! ✓';
            setTimeout(function () {
                btnContactSubmit.disabled = false;
                btnContactSubmit.textContent = 'Iniciar análise';
                showStep('q1');
            }, 400);
        });
    });

    inputLgpd.addEventListener('change', function () {
        if (inputLgpd.checked && lgpdLabel) lgpdLabel.classList.remove('input-error');
    });
    inputTelefone.addEventListener('input', function () {
        inputTelefone.value = formatPhoneDisplay(onlyDigits(inputTelefone.value).slice(0, 11));
    });

    btnBack.addEventListener('click', function () {
        if (currentStep === 'contact' && new URLSearchParams(window.location.search).get('iniciar') === '1') {
            window.location.href = 'index.html';
            return;
        }
        var prev = prevBefore(currentStep);
        if (prev) {
            // Voltar do q5 quando q4 foi pulado já é tratado pelo fluxo dinâmico
            showStep(prev);
        }
    });

    btnRestart.addEventListener('click', function () { window.location.href = 'index.html'; });
    document.getElementById('btn-retry').addEventListener('click', resetQuiz);
    document.getElementById('btn-wa-qualified').addEventListener('click', function (e) { e.preventDefault(); goToWhatsApp('qualified', 'qualified'); });
    document.getElementById('btn-wa-soft').addEventListener('click', function (e) { e.preventDefault(); goToWhatsApp('soft', 'qualified-soft'); });
    document.getElementById('btn-wa-disqualify').addEventListener('click', function (e) { e.preventDefault(); goToWhatsApp('disqualify', 'disqualified'); });

    var handlers = { q1: handleQ1, q2: handleQ2, q3: handleQ3, q3b: handleQ3b, q4: handleQ4, q5: handleQ5, q6: handleQ6, q7: handleQ7, q8: handleQ8, q9: handleQ9 };
    document.querySelectorAll('.options-list').forEach(function (list) {
        var question = list.getAttribute('data-question');
        list.querySelectorAll('.option-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                list.querySelectorAll('.option-btn').forEach(function (b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                var value = btn.getAttribute('data-value');
                setTimeout(function () { if (handlers[question]) handlers[question](value); }, 280);
            });
        });
    });

    loadStoredContact();
    if (new URLSearchParams(window.location.search).get('iniciar') === '1') showStep('contact');
    else showStep('intro');
})();
