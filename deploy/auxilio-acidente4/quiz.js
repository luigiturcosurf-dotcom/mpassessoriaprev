(function () {
    var WA_NUMBER = '5511947642923';
    var META_PIXEL_ID = '2851865198508090';
    var WA_AUTO_REDIRECT_MS = 3000;
    var waAutoRedirectTimer = null;
    var waRedirectDone = false;

    var STEPS = ['intro', 'contact', 'q1', 'q2', 'q3', 'q4'];
    var QUESTION_STEPS = ['q1', 'q2', 'q3', 'q4'];
    var currentIndex = 0;

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
        q4: null
    };

    var LABELS = {
        q1: {
            none: 'Nunca tive problema no trabalho',
            accident: 'Acidente de trabalho',
            'accident-other': 'Acidente (trânsito, casa, esporte ou lazer)',
            disease: 'Doença ou lesão relacionada ao trabalho',
            labor: 'Problemas trabalhistas (horas extras, salário, etc.)',
            other: 'Outra situação',
            unsure: 'Não sabe dizer'
        },
        q2: {
            clt: 'Carteira assinada (CLT)',
            domestic: 'Doméstico(a) registrado(a)',
            rural: 'Trabalhador(a) rural',
            'autonomo-mei': 'Autônomo ou MEI',
            'sem-registro': 'Sem registro',
            unsure: 'Não sabe dizer'
        },
        q3: {
            'yes-benefit': 'Ficou afastado(a) e recebeu benefício INSS',
            no: 'Não ficou afastado(a) pelo INSS',
            unsure: 'Não sabe ao certo'
        },
        q4: {
            yes: 'Ainda tem limitações, dores ou sequelas',
            unsure: 'Não sabe dizer sobre sequelas',
            no: 'Recuperou totalmente'
        }
    };

    var DISQUALIFY_MSG = {
        none: {
            title: 'O auxílio-acidente exige um acidente com sequela',
            text: 'Pelo que você informou, não houve acidente ou lesão. O auxílio-acidente é pago quando uma sequela permanente reduz a capacidade de trabalho. Se sua situação mudar, refaça a análise.'
        },
        labor: {
            title: 'Esse benefício é para sequelas de acidentes',
            text: 'Questões sobre horas extras, salário ou rescisão envolvem direitos trabalhistas diferentes do auxílio-acidente do INSS. Nossa equipe pode orientar se você tiver dúvidas sobre acidentes.'
        },
        'sem-registro': {
            title: 'É necessário vínculo com o INSS na época do acidente',
            text: 'Quem trabalhava sem registro não tinha qualidade de segurado do INSS no momento do fato. Sem esse vínculo, o auxílio-acidente não se aplica. Se sua situação mudou, refaça a análise.'
        },
        no: {
            title: 'É necessário sequela permanente',
            text: 'O auxílio-acidente exige que o acidente tenha deixado uma sequela que reduza permanentemente sua capacidade de trabalho. Se você desenvolveu limitações depois, fale conosco.'
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

        var isResult = stepId === 'qualified' || stepId === 'qualified-soft' || stepId === 'disqualified';
        btnBack.disabled = stepId === 'intro' || isResult;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goToIndex(i) {
        currentIndex = i;
        showStep(STEPS[currentIndex]);
    }

    var BENEFICIO = 'auxilio-acidente';

    function persistLead(resultado, motivo) {
        if (typeof MPLeads === 'undefined') return Promise.resolve(null);
        return MPLeads.saveQuizLead({
            beneficio: BENEFICIO,
            resultado: resultado,
            motivo: motivo || null,
            answers: answers,
            labels: LABELS,
            contact: contact
        }).then(function (id) {
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
            contact: contact
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
        var parts = ['Olá! Fiz a pré-análise do auxílio-acidente no site da MP Assessoria.', ''];
        if (contact.nome) parts.push('• Nome: ' + contact.nome);
        if (contact.telefone) parts.push('• Telefone: ' + formatPhoneDisplay(contact.telefone));
        if (contact.email) parts.push('• E-mail: ' + contact.email);
        parts.push('');
        if (answers.q1) parts.push('• Situação: ' + LABELS.q1[answers.q1]);
        if (answers.q2) parts.push('• Vínculo na época: ' + LABELS.q2[answers.q2]);
        if (answers.q3) parts.push('• Afastamento INSS: ' + LABELS.q3[answers.q3]);
        if (answers.q4) parts.push('• Sequelas atuais: ' + LABELS.q4[answers.q4]);
        parts.push('');
        if (type === 'qualified') {
            parts.push('Pelo questionário, acredito ter perfil para o auxílio-acidente. Gostaria de falar com um advogado.');
        } else if (type === 'soft') {
            parts.push('Gostaria de uma análise do meu caso com um advogado.');
        } else {
            parts.push('Tenho dúvidas sobre meu caso. Podem me orientar?');
        }
        return encodeURIComponent(parts.join('\n'));
    }

    function getWhatsAppUrl(type) {
        return 'https://wa.me/' + WA_NUMBER + '?text=' + buildWaMessage(type);
    }

    function trackMetaLead(source, resultado) {
        if (typeof fbq !== 'function') return;
        fbq('track', 'Lead', {
            content_name: 'Auxílio-Acidente INSS',
            content_category: 'previdenciario',
            lead_source: source || 'whatsapp',
            resultado: resultado || ''
        });
    }

    function goToWhatsApp(type, resultado) {
        if (waRedirectDone) return;
        waRedirectDone = true;
        trackMetaLead(type, resultado);
        if (waAutoRedirectTimer) {
            clearTimeout(waAutoRedirectTimer);
            waAutoRedirectTimer = null;
        }

        var url = getWhatsAppUrl(type);
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
        persistLead(resultado).then(function (id) {
            if (!id) console.error('[MPLeads] Resultado não gravado:', resultado);
            showStep(stepId);

            waRedirectDone = false;
            var hintId = waType === 'soft' ? 'wa-redirect-hint-soft' : 'wa-redirect-hint-qualified';
            var hint = document.getElementById(hintId);
            if (hint) hint.hidden = false;

            waAutoRedirectTimer = setTimeout(function () {
                goToWhatsApp(waType, resultado);
            }, WA_AUTO_REDIRECT_MS);
        });
    }

    function showDisqualified(reason) {
        var msg = DISQUALIFY_MSG[reason] || DISQUALIFY_MSG.none;
        document.getElementById('disqualify-title').textContent = msg.title;
        document.getElementById('disqualify-text').textContent = msg.text;
        persistLead('disqualified', reason).then(function () {
            showStep('disqualified');
        });
    }

    function handleQ1(value, action) {
        answers.q1 = value;
        if (action === 'disqualify' || value === 'none') {
            showDisqualified('none');
            return;
        }
        if (value === 'labor') {
            showDisqualified('labor');
            return;
        }
        goToIndex(3);
    }

    function handleQ2(value, action) {
        answers.q2 = value;
        if (action === 'disqualify' || value === 'sem-registro') {
            showDisqualified('sem-registro');
            return;
        }
        goToIndex(4);
    }

    function handleQ3(value) {
        answers.q3 = value;
        goToIndex(5);
    }

    function handleQ4(value, action) {
        answers.q4 = value;
        if (action === 'disqualify' || value === 'no') {
            showDisqualified('no');
            return;
        }
        if (action === 'qualify-soft' || value === 'unsure') {
            showQualifiedResult('qualified-soft', 'qualified-soft', 'soft');
            return;
        }
        showQualifiedResult('qualified', 'qualified', 'qualified');
    }

    function resetQuiz() {
        if (waAutoRedirectTimer) {
            clearTimeout(waAutoRedirectTimer);
            waAutoRedirectTimer = null;
        }
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
        answers = { q1: null, q2: null, q3: null, q4: null };
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
            btnContactSubmit.disabled = false;
            btnContactSubmit.textContent = 'Iniciar análise';
            if (!leadId) {
                var errLgpd = document.getElementById('err-lgpd');
                if (errLgpd) {
                    errLgpd.textContent = 'Não foi possível salvar seus dados. Verifique a conexão e tente novamente.';
                    errLgpd.hidden = false;
                }
                return;
            }
            goToIndex(2);
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
        if (currentIndex === 2 && new URLSearchParams(window.location.search).get('iniciar') === '1') {
            window.location.href = 'index.html';
            return;
        }
        if (currentIndex === 1 && new URLSearchParams(window.location.search).get('iniciar') === '1') {
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
                    else if (question === 'q3') handleQ3(value);
                    else if (question === 'q4') handleQ4(value, action);
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
