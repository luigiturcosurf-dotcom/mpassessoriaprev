(function () {
    var WA_NUMBER = '5511963922594';
    var META_PIXEL_ID = '1752369442414230';
    var CAPI_ENDPOINT = 'https://jiuxiyxsausauqfsudus.supabase.co/functions/v1/capi-lead-router';
    var COUNTDOWN_SECONDS = 3;
    var countdownTimer = null;
    var waAutoRedirectTimer = null;
    var waRedirectDone = false;
    var lastMetaEvent = { name: null, id: null };

    var STEPS = ['intro', 'contact', 'q1', 'q2', 'q3', 'q4', 'q5'];
    var QUESTION_STEPS = ['q1', 'q2', 'q3', 'q4', 'q5'];
    var STRONG_DOCS = ['dap-caf', 'sindicato', 'family-docs'];
    var currentIndex = 0;
    var hasUncertain = false;

    var contact = {
        nome: '',
        telefone: '',
        email: '',
        lgpdAceite: false,
        lgpdAceiteEm: null
    };

    var answers = {
        q1: null,
        q2: null,
        q3: null,
        q4: null,
        q5: null
    };

    var LABELS = {
        q1: {
            'less-age': 'Menos de 55 anos (mulher) ou menos de 60 anos (homem)',
            'man-60-plus': 'Homem com 60 anos ou mais',
            'woman-55-plus': 'Mulher com 55 anos ou mais',
            'prefer-not': 'Prefiro não informar'
        },
        q2: {
            roca: 'Trabalhou/trabalha na roça, lavoura ou criação de animais',
            pescador: 'Pescador(a) artesanal',
            conjuge: 'Ajudava marido/família na produção rural',
            'no-rural': 'Não trabalhou em atividade rural'
        },
        q3: {
            'less-10': 'Menos de 10 anos',
            '10-15': 'Entre 10 e 15 anos',
            'more-15': 'Mais de 15 anos',
            'more-20': 'Mais de 20 anos',
            unsure: 'Não sabe ao certo'
        },
        q4: {
            'always-field': 'Sempre trabalhou no campo',
            'less-5-city': 'Trabalhou registrado na cidade por menos de 5 anos',
            'more-10-city': 'Trabalhou registrado na cidade por mais de 10 anos',
            mixed: 'Misto (campo + cidade)'
        },
        q5: {
            'dap-caf': 'DAP/CAF, bloco de produtor ou nota fiscal rural (no próprio nome)',
            sindicato: 'Cadastro em sindicato rural ou colônia de pescadores',
            'family-docs': 'Documentos no nome do marido, pai ou família (bloco, notas, ITR, contrato de terra)',
            certidoes: 'Certidões antigas (casamento/nascimento) com profissão de lavrador(a)',
            photos: 'Só fotos, declarações de vizinhos ou testemunhos',
            'no-docs': 'Não tem nenhum documento',
            'unsure-docs': 'Não sabe o que tem'
        }
    };

    var DISQUALIFY_MSG = {
        'less-age': {
            title: 'Neste momento, a Aposentadoria Rural pode não se aplicar',
            text: 'A idade mínima para a aposentadoria rural é 55 anos para mulheres e 60 anos para homens (Art. 143, Lei 8.213/91). Se você acredita que já atingiu a idade ou tem dúvidas, nossa equipe pode orientar.'
        },
        'no-rural': {
            title: 'Neste momento, a Aposentadoria Rural pode não se aplicar',
            text: 'Com base nas suas respostas, você não trabalhou em atividade rural — requisito fundamental do benefício (Art. 11 e Art. 143, Lei 8.213/91). Se sua situação mudou ou você tem dúvidas, nossa equipe pode orientar.'
        },
        'less-10': {
            title: 'Neste momento, a Aposentadoria Rural pode não se aplicar',
            text: 'O tempo informado está abaixo do mínimo legal: 15 anos de atividade rural para mulheres (55 anos) ou 20 anos para homens (60 anos). Se você acredita que trabalhou mais tempo, refaça a análise ou fale conosco.'
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

    var BENEFICIO = 'aposentadoria-rural';

    function getLpSlug() {
        var parts = window.location.pathname.split('/').filter(Boolean);
        var i;
        for (i = parts.length - 1; i >= 0; i--) {
            if (parts[i].indexOf('.html') === -1) return parts[i];
        }
        return 'aposentadoria-rural';
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

    function getCookie(name) {
        var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function getAttributionForCapi() {
        var prefix = 'mp_track_';
        var p = new URLSearchParams(window.location.search);
        var fbclid = p.get('fbclid') || sessionStorage.getItem(prefix + 'fbclid') || null;
        var fbc = sessionStorage.getItem(prefix + 'fbc') || getCookie('_fbc');
        if (!fbc && fbclid) {
            fbc = 'fb.1.' + Date.now() + '.' + fbclid;
        }
        return {
            fbclid: fbclid,
            fbp: sessionStorage.getItem(prefix + 'fbp') || getCookie('_fbp'),
            fbc: fbc
        };
    }

    function generateEventId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    }

    function resultadoToMetaEvent(resultado) {
        if (resultado === 'qualified') return 'Lead';
        if (resultado === 'disqualified') return 'LeadDesqualificado';
        if (resultado === 'sem-provas') return 'SemDocumento';
        return null;
    }

    function trackCadastroContato() {
        if (typeof fbq === 'function') {
            fbq('trackSingle', META_PIXEL_ID, 'CadastroContato', {
                content_name: 'Aposentadoria Rural INSS',
                content_category: 'previdenciario'
            });
        }
    }

    function dispatchMetaConversion(eventName, eventId, resultado, motivo) {
        lastMetaEvent = { name: eventName, id: eventId };
        var pixelParams = {
            eventID: eventId,
            content_name: 'Aposentadoria Rural INSS',
            content_category: 'previdenciario',
            documentacao: answers.q5 || ''
        };
        if (resultado) pixelParams.resultado = resultado;
        if (motivo) pixelParams.motivo = motivo;

        if (typeof fbq === 'function') {
            fbq('trackSingle', META_PIXEL_ID, eventName, pixelParams, { eventID: eventId });
        }

        var attr = getAttributionForCapi();
        fetch(CAPI_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_name: eventName,
                event_id: eventId,
                email: contact.email,
                telefone: contact.telefone,
                beneficio: BENEFICIO,
                documentacao: answers.q5 || '',
                resultado: resultado || '',
                motivo: motivo || '',
                fonte: getLpSlug(),
                url: window.location.href,
                user_agent: navigator.userAgent,
                fbp: attr.fbp,
                fbc: attr.fbc,
                fbclid: attr.fbclid
            }),
            keepalive: true
        }).catch(function (err) {
            console.error('[Quiz] CAPI falhou:', err);
        });
    }

    function trackMetaQuizResult(resultado, motivo) {
        var eventName = resultadoToMetaEvent(resultado);
        if (!eventName) return;
        dispatchMetaConversion(eventName, generateEventId(), resultado, motivo);
    }

    function hasStrongDocumentation() {
        return STRONG_DOCS.indexOf(answers.q5) !== -1;
    }

    function clearCountdown() {
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        if (waAutoRedirectTimer) {
            clearInterval(waAutoRedirectTimer);
            waAutoRedirectTimer = null;
        }
        var overlay = document.getElementById('countdown-overlay');
        if (overlay) overlay.hidden = true;
    }

    function pulseCountdownNumber(el) {
        if (!el) return;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
    }

    function startOverlayCountdown(label, seconds, onDone) {
        clearCountdown();
        var overlay = document.getElementById('countdown-overlay');
        var numberEl = document.getElementById('countdown-number');
        var labelEl = document.getElementById('countdown-label');
        if (!overlay || !numberEl) {
            setTimeout(onDone, seconds * 1000);
            return;
        }
        if (labelEl) labelEl.textContent = label;
        overlay.hidden = false;
        var n = seconds;
        numberEl.textContent = String(n);
        pulseCountdownNumber(numberEl);
        countdownTimer = setInterval(function () {
            n--;
            if (n <= 0) {
                clearCountdown();
                onDone();
            } else {
                numberEl.textContent = String(n);
                pulseCountdownNumber(numberEl);
            }
        }, 1000);
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

    function storeContact() {
        sessionStorage.setItem('mp_lead_contact', JSON.stringify(contact));
    }

    function onlyDigits(value) {
        return (value || '').replace(/\D/g, '');
    }

    function formatPhoneDisplay(digits) {
        var d = onlyDigits(digits);
        if (d.length <= 2) return d ? '(' + d : '';
        if (d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
        if (d.length <= 11) {
            return '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length === 11 ? 7 : 6) + '-' + d.slice(d.length === 11 ? 7 : 6);
        }
        return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7, 11);
    }

    function showFieldError(fieldId, errId, message) {
        var field = document.getElementById(fieldId);
        var err = document.getElementById(errId);
        if (field) field.classList.add('input-error');
        if (err) {
            err.textContent = message;
            err.hidden = false;
        }
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

    function showStep(stepId) {
        document.querySelectorAll('.quiz-step').forEach(function (el) {
            el.classList.remove('active');
        });
        var step = document.querySelector('[data-step="' + stepId + '"]');
        if (step) step.classList.add('active');

        var isQuestion = QUESTION_STEPS.indexOf(stepId) !== -1;
        progressWrap.hidden = !isQuestion;

        if (isQuestion) {
            var qIndex = QUESTION_STEPS.indexOf(stepId);
            progressFill.style.width = ((qIndex + 1) / QUESTION_STEPS.length * 100) + '%';
            progressLabel.textContent = 'Pergunta ' + (qIndex + 1) + ' de ' + QUESTION_STEPS.length;
        }

        var isResult = stepId === 'qualified' || stepId === 'qualified-soft' || stepId === 'disqualified' || stepId === 'no-proof';
        btnBack.disabled = stepId === 'intro' || isResult;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goToIndex(i) {
        currentIndex = i;
        showStep(STEPS[currentIndex]);
    }

    function persistLead(resultado, motivo) {
        if (typeof MPLeads === 'undefined') return Promise.resolve(null);
        return MPLeads.saveQuizLead(buildLeadSaveOpts(resultado, motivo)).then(function (id) {
            if (!id) console.error('[MPLeads] Quiz não gravado no Supabase. Resultado:', resultado);
            return id;
        });
    }

    function buildLeadSaveOpts(resultado, motivo) {
        return {
            beneficio: BENEFICIO,
            resultado: resultado,
            motivo: motivo || null,
            answers: answers,
            labels: LABELS,
            contact: contact,
            eventoMeta: lastMetaEvent.name,
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
        var parts = ['Olá! Fiz a análise no site e gostaria de saber sobre minha Aposentadoria Rural.', ''];
        if (contact.nome) parts.push('• Nome: ' + contact.nome);
        if (contact.telefone) parts.push('• Telefone: ' + formatPhoneDisplay(contact.telefone));
        if (contact.email) parts.push('• E-mail: ' + contact.email);
        parts.push('');
        parts.push('Minhas respostas:');
        if (answers.q1) parts.push('• Idade: ' + LABELS.q1[answers.q1]);
        if (answers.q2) parts.push('• Atividade rural: ' + LABELS.q2[answers.q2]);
        if (answers.q3) parts.push('• Tempo de atividade: ' + LABELS.q3[answers.q3]);
        if (answers.q4) parts.push('• Vínculo urbano: ' + LABELS.q4[answers.q4]);
        if (answers.q5) parts.push('• Documentação: ' + LABELS.q5[answers.q5]);
        parts.push('');
        if (type === 'qualified') {
            parts.push('Pelo questionário, acredito ter perfil para a Aposentadoria Rural. Gostaria de falar com um especialista.');
        } else if (type === 'noproof') {
            parts.push('Ainda não localizei documentos do trabalho rural. Gostaria de orientação para reunir as provas do meu caso.');
        } else if (type === 'soft') {
            parts.push('Gostaria de uma análise do meu caso com um especialista.');
        } else {
            parts.push('Tenho dúvidas sobre meu caso. Podem me orientar?');
        }
        return encodeURIComponent(parts.join('\n'));
    }

    function getWhatsAppUrl(type) {
        return 'https://wa.me/' + WA_NUMBER + '?text=' + buildWaMessage(type);
    }

    function goToWhatsApp(type, resultado) {
        if (waRedirectDone) return;
        waRedirectDone = true;
        clearCountdown();

        pushDataLayer('lead_whatsapp_click', {
            resultado: resultado || type,
            telefone_preenchido: !!contact.telefone
        });

        var url = getWhatsAppUrl(type);
        var savePromise;

        if (typeof MPLeads !== 'undefined' && resultado) {
            savePromise = MPLeads.saveQuizWithWhatsApp(buildLeadSaveOpts(resultado));
        } else if (typeof MPLeads !== 'undefined') {
            savePromise = MPLeads.markWhatsAppClick();
        } else {
            savePromise = Promise.resolve();
        }

        savePromise.finally(function () {
            window.location.href = url;
        });
    }

    function showQualifiedResult(stepId, resultado, waType) {
        trackMetaQuizResult(resultado, null);
        persistLead(resultado).then(function (id) {
            if (!id) console.error('[MPLeads] Resultado não gravado:', resultado);

            pushDataLayer(resultado === 'qualified' ? 'lead_qualified' : 'lead_soft', {
                resultado: resultado,
                telefone_preenchido: !!contact.telefone,
                documentacao: answers.q5 || '',
                event_id: lastMetaEvent.id
            });

            showStep(stepId);

            waRedirectDone = false;
            var hintId = waType === 'soft' ? 'wa-redirect-hint-soft' : 'wa-redirect-hint-qualified';
            var hint = document.getElementById(hintId);
            if (hint) {
                hint.hidden = false;
                hint.textContent = 'Redirecionando em ' + COUNTDOWN_SECONDS + '…';
            }

            startOverlayCountdown('Abrindo o WhatsApp em', COUNTDOWN_SECONDS, function () {
                goToWhatsApp(waType, resultado);
            });
        });
    }

    function showDisqualified(reason) {
        var msg = DISQUALIFY_MSG[reason] || DISQUALIFY_MSG['no-rural'];
        document.getElementById('disqualify-title').textContent = msg.title;
        document.getElementById('disqualify-text').textContent = msg.text;
        trackMetaQuizResult('disqualified', reason);
        persistLead('disqualified', reason).then(function () {
            pushDataLayer('lead_desqualified', {
                resultado: 'disqualified',
                motivo: reason,
                telefone_preenchido: !!contact.telefone,
                event_id: lastMetaEvent.id
            });
            showStep('disqualified');
        });
    }

    function handleQ1(value, action) {
        if (value === 'less-age' || action === 'disqualify') {
            answers.q1 = value;
            showDisqualified('less-age');
            return;
        }
        answers.q1 = value;
        goToIndex(3);
    }

    function handleQ2(value, action) {
        answers.q2 = value;
        if (action === 'disqualify' || value === 'no-rural') {
            showDisqualified('no-rural');
            return;
        }
        goToIndex(4);
    }

    function handleQ3(value, action) {
        answers.q3 = value;
        if (action === 'disqualify' || value === 'less-10') {
            showDisqualified('less-10');
            return;
        }
        if (action === 'uncertain' || value === '10-15' || value === 'unsure') {
            hasUncertain = true;
        }
        goToIndex(5);
    }

    function handleQ4(value, action) {
        answers.q4 = value;
        if (action === 'uncertain' || value === 'more-10-city' || value === 'mixed') {
            hasUncertain = true;
        }
        goToIndex(6);
    }

    function handleQ5(value, action) {
        answers.q5 = value;
        if (value === 'no-docs') {
            showNoProof();
            return;
        }
        if (action === 'uncertain' || value === 'certidoes' || value === 'photos' || value === 'unsure-docs') {
            hasUncertain = true;
        }
        if (hasUncertain || !hasStrongDocumentation()) {
            showQualifiedResult('qualified-soft', 'qualified-soft', 'soft');
        } else {
            showQualifiedResult('qualified', 'qualified', 'qualified');
        }
    }

    function showNoProof() {
        trackMetaQuizResult('sem-provas', 'no-docs');
        persistLead('sem-provas', 'no-docs').then(function () {
            pushDataLayer('lead_sem_documento', {
                resultado: 'sem-provas',
                motivo: 'no-docs',
                telefone_preenchido: !!contact.telefone,
                event_id: lastMetaEvent.id
            });
            showStep('no-proof');
        });
    }

    function resetQuiz() {
        clearCountdown();
        waRedirectDone = false;
        ['wa-redirect-hint-qualified', 'wa-redirect-hint-soft'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.hidden = true;
        });
        if (typeof MPLeads !== 'undefined') MPLeads.resetSession();
        contact = { nome: '', telefone: '', email: '', lgpdAceite: false, lgpdAceiteEm: null };
        inputNome.value = '';
        inputTelefone.value = '';
        inputEmail.value = '';
        inputLgpd.checked = false;
        answers = { q1: null, q2: null, q3: null, q4: null, q5: null };
        hasUncertain = false;
        document.querySelectorAll('.option-btn.selected').forEach(function (b) {
            b.classList.remove('selected');
        });
        clearFieldErrors();
        currentIndex = 0;
        showStep('intro');
    }

    btnStart.addEventListener('click', function () {
        goToIndex(1);
    });

    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validateContact()) return;
        if (!validateLgpd()) return;

        btnContactSubmit.disabled = true;
        btnContactSubmit.textContent = 'Salvando...';

        persistContact().then(function (leadId) {
            if (!leadId) {
                btnContactSubmit.disabled = false;
                btnContactSubmit.textContent = 'Iniciar análise';
                var errLgpd = document.getElementById('err-lgpd');
                if (errLgpd) {
                    errLgpd.textContent = 'Não foi possível salvar seus dados. Verifique a conexão e tente novamente.';
                    errLgpd.hidden = false;
                }
                return;
            }

            trackCadastroContato();
            pushDataLayer('cadastro_contato', {
                telefone_preenchido: !!contact.telefone,
                email_preenchido: !!contact.email
            });

            btnContactSubmit.textContent = 'Salvo! ✓';
            setTimeout(function () {
                btnContactSubmit.disabled = false;
                btnContactSubmit.textContent = 'Iniciar análise';
                goToIndex(2);
            }, 400);
        });
    });

    inputLgpd.addEventListener('change', function () {
        if (inputLgpd.checked) {
            if (lgpdLabel) lgpdLabel.classList.remove('input-error');
            var errLgpd = document.getElementById('err-lgpd');
            if (errLgpd) errLgpd.hidden = true;
        }
    });

    inputTelefone.addEventListener('input', function () {
        var digits = onlyDigits(inputTelefone.value);
        inputTelefone.value = formatPhoneDisplay(digits.slice(0, 11));
    });

    btnBack.addEventListener('click', function () {
        var iniciar = new URLSearchParams(window.location.search).get('iniciar') === '1';
        if (iniciar && (currentIndex === 2 || currentIndex === 1)) {
            window.location.href = 'index.html';
            return;
        }
        if (currentIndex > 0) {
            goToIndex(currentIndex - 1);
        }
    });

    btnRestart.addEventListener('click', function () {
        window.location.href = 'index.html';
    });

    document.getElementById('btn-retry').addEventListener('click', resetQuiz);

    document.getElementById('btn-wa-qualified').addEventListener('click', function (e) {
        e.preventDefault();
        goToWhatsApp('qualified', 'qualified');
    });

    document.getElementById('btn-wa-soft').addEventListener('click', function (e) {
        e.preventDefault();
        goToWhatsApp('soft', 'qualified-soft');
    });

    document.getElementById('btn-wa-disqualify').addEventListener('click', function (e) {
        e.preventDefault();
        goToWhatsApp('disqualify', 'disqualified');
    });

    var btnWaNoProof = document.getElementById('btn-wa-noproof');
    if (btnWaNoProof) {
        btnWaNoProof.addEventListener('click', function (e) {
            e.preventDefault();
            goToWhatsApp('noproof', 'sem-provas');
        });
    }

    var btnRetryNoProof = document.getElementById('btn-retry-noproof');
    if (btnRetryNoProof) {
        btnRetryNoProof.addEventListener('click', resetQuiz);
    }

    document.querySelectorAll('.options-list').forEach(function (list) {
        var question = list.getAttribute('data-question');
        list.querySelectorAll('.option-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                list.querySelectorAll('.option-btn').forEach(function (b) {
                    b.classList.remove('selected');
                });
                btn.classList.add('selected');

                var value = btn.getAttribute('data-value');
                var action = btn.getAttribute('data-action');

                setTimeout(function () {
                    if (question === 'q1') handleQ1(value, action);
                    else if (question === 'q2') handleQ2(value, action);
                    else if (question === 'q3') handleQ3(value, action);
                    else if (question === 'q4') handleQ4(value, action);
                    else if (question === 'q5') handleQ5(value, action);
                }, 280);
            });
        });
    });

    loadStoredContact();

    var params = new URLSearchParams(window.location.search);
    if (params.get('iniciar') === '1') {
        goToIndex(1);
    } else {
        showStep('intro');
    }
})();
