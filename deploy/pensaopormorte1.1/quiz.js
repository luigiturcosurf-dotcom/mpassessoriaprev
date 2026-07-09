(function () {
    var WA_NUMBER = '5511947642923';
    var META_PIXEL_ID = '1229096362421532';
    var WA_AUTO_REDIRECT_MS = 3000;
    var BENEFICIO = 'pensao-por-morte';
    var waAutoRedirectTimer = null;
    var waRedirectDone = false;

    var STEPS = ['intro', 'contact', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'];
    var QUESTION_STEPS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'];
    var currentIndex = 0;

    var contact = { nome: '', telefone: '', email: '', lgpdAceite: false, lgpdAceiteEm: null };
    var answers = { q1: null, q2: null, q3: null, q4: null, q5: null, q6: null, q7: null, q8: null, q9: null };
    var skipQ4 = false;

    var LABELS = {
        q1: {
            conjuge: 'Cônjuge (casado no civil)',
            companheiro: 'Companheiro(a) — união estável',
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
        filho: {
            title: 'Vale confirmar os requisitos para filhos',
            text: 'Filhos menores de 21 anos, inválidos ou com deficiência têm direito automático. Se você não se encaixa nessas faixas, ainda pode haver caminhos — nossa análise esclarece seu caso.'
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
        var visible = QUESTION_STEPS.filter(function (q) {
            if (q === 'q4' && skipQ4) return false;
            return true;
        });
        var qIndex = visible.indexOf(stepId);
        if (qIndex === -1) return;
        progressFill.style.width = ((qIndex + 1) / visible.length * 100) + '%';
        progressLabel.textContent = 'Pergunta ' + (qIndex + 1) + ' de ' + visible.length;
    }

    function showStep(stepId) {
        document.querySelectorAll('.quiz-step').forEach(function (el) { el.classList.remove('active'); });
        var step = document.querySelector('[data-step="' + stepId + '"]');
        if (step) step.classList.add('active');

        var q4El = document.querySelector('[data-step="q4"]');
        if (q4El) q4El.style.display = skipQ4 ? 'none' : '';

        var isQuestion = QUESTION_STEPS.indexOf(stepId) !== -1;
        progressWrap.hidden = !isQuestion;
        if (isQuestion) updateProgress(stepId);

        var isResult = stepId === 'qualified' || stepId === 'qualified-soft' || stepId === 'disqualified';
        btnBack.disabled = stepId === 'intro' || isResult;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goToIndex(i) {
        currentIndex = i;
        showStep(STEPS[currentIndex]);
    }

    function goToStep(stepId) {
        var i = STEPS.indexOf(stepId);
        if (i >= 0) goToIndex(i);
    }

    function nextAfterQ3() {
        if (skipQ4) {
            answers.q4 = 'skip-aprovado';
            goToStep('q5');
        } else {
            goToStep('q4');
        }
    }

    function persistLead(resultado, motivo) {
        if (typeof MPLeads === 'undefined') return Promise.resolve(null);
        return MPLeads.saveQuizLead({
            beneficio: BENEFICIO,
            resultado: resultado,
            motivo: motivo || null,
            answers: answers,
            labels: LABELS,
            contact: contact
        });
    }

    function buildLeadSaveOpts(resultado, motivo) {
        return { beneficio: BENEFICIO, resultado: resultado, motivo: motivo || null, answers: answers, labels: LABELS, contact: contact };
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

    function trackMetaLead(source) {
        if (typeof fbq === 'function') {
            fbq('trackSingle', META_PIXEL_ID, 'Lead', {
                content_name: 'Pensão por Morte INSS',
                content_category: 'previdenciario',
                lead_source: source || 'form'
            });
        }
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
        var savePromise = (typeof MPLeads !== 'undefined' && resultado)
            ? MPLeads.saveQuizWithWhatsApp(buildLeadSaveOpts(resultado))
            : (typeof MPLeads !== 'undefined' ? MPLeads.markWhatsAppClick() : Promise.resolve());
        savePromise.finally(function () { window.location.href = url; });
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

    function computeResult() {
        var approve = 0;
        var uncertain = 0;
        var encerra = 0;
        var ressalvaReason = 'default';

        if (answers.q1 === 'conjuge' || answers.q1 === 'companheiro') approve++;
        else if (answers.q1 === 'filho') { uncertain++; ressalvaReason = 'filho'; }
        else if (answers.q1 === 'pai-mae') uncertain++;
        else if (answers.q1 === 'irmao') { encerra++; ressalvaReason = 'irmao'; }

        if (answers.q2 === 'menos-90' || answers.q2 === '90d-5a') approve++;
        else if (answers.q2 === 'mais-5a') uncertain++;

        if (answers.q3 === 'aposentado' || answers.q3 === 'auxilio') approve++;
        else if (answers.q3 === 'contribuia') approve++;
        else uncertain++;

        if (answers.q4 === 'trabalhando' || answers.q4 === 'parou-12m' || answers.q4 === 'skip-aprovado') approve++;
        else if (answers.q4 === 'parou-mais-12m') { encerra++; ressalvaReason = 'parou-mais-12m'; }

        if (answers.q5 === '45-mais') approve++;

        if (answers.q6 === 'casado') approve++;
        else if (answers.q6 === 'uniao-estavel') uncertain++;
        else if (answers.q6 === 'nao' && (answers.q1 === 'conjuge' || answers.q1 === 'companheiro')) uncertain++;

        if (answers.q7 === '2a-mais') approve++;
        else if (answers.q7 === 'menos-2a') uncertain++;

        if (answers.q8 === 'sim') approve++;

        if (answers.q9 === 'total') approve++;
        else if (answers.q9 === 'parcial') uncertain++;
        else if (answers.q9 === 'nao') {
            if (answers.q1 === 'pai-mae' || answers.q1 === 'irmao') { encerra++; ressalvaReason = 'dependencia'; }
            else uncertain++;
        }

        if (answers.q1 === 'filho' && answers.q5 && answers.q5 !== 'menos-22') {
            uncertain++;
            ressalvaReason = 'filho';
        }

        if (encerra > 0 && approve === 0) return { step: 'disqualified', resultado: 'disqualified', wa: 'disqualify', reason: ressalvaReason };
        if (encerra > 0 || uncertain >= 2) return { step: 'qualified-soft', resultado: 'qualified-soft', wa: 'soft', reason: null };
        if (uncertain > 0) return { step: 'qualified-soft', resultado: 'qualified-soft', wa: 'soft', reason: null };
        return { step: 'qualified', resultado: 'qualified', wa: 'qualified', reason: null };
    }

    function finishQuiz() {
        var r = computeResult();
        if (r.step === 'disqualified') showRessalva(r.reason);
        else showQualifiedResult(r.step, r.resultado, r.wa);
    }

    function handleQ1(v) { answers.q1 = v; goToStep('q2'); }
    function handleQ2(v) { answers.q2 = v; goToStep('q3'); }
    function handleQ3(v) {
        answers.q3 = v;
        skipQ4 = (v === 'aposentado' || v === 'auxilio');
        nextAfterQ3();
    }
    function handleQ4(v) { answers.q4 = v; goToStep('q5'); }
    function handleQ5(v) { answers.q5 = v; goToStep('q6'); }
    function handleQ6(v) { answers.q6 = v; goToStep('q7'); }
    function handleQ7(v) { answers.q7 = v; goToStep('q8'); }
    function handleQ8(v) { answers.q8 = v; goToStep('q9'); }
    function handleQ9(v) { answers.q9 = v; finishQuiz(); }

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
        answers = { q1: null, q2: null, q3: null, q4: null, q5: null, q6: null, q7: null, q8: null, q9: null };
        document.querySelectorAll('.option-btn.selected').forEach(function (b) { b.classList.remove('selected'); });
        clearFieldErrors();
        currentIndex = 0;
        showStep('intro');
    }

    btnStart.addEventListener('click', function () { goToIndex(1); });

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

            trackMetaLead('form');
            pushDataLayer('lead_form_submit', {
                telefone_preenchido: !!contact.telefone,
                email_preenchido: !!contact.email
            });

            btnContactSubmit.textContent = 'Salvo! ✓';
            setTimeout(function () {
                btnContactSubmit.disabled = false;
                btnContactSubmit.textContent = 'Iniciar análise';
                goToStep('q1');
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
        if (currentIndex <= 1 && new URLSearchParams(window.location.search).get('iniciar') === '1') {
            window.location.href = 'index.html';
            return;
        }
        if (currentIndex > 0) {
            var prev = STEPS[currentIndex - 1];
            if (prev === 'q4' && skipQ4) goToStep('q3');
            else goToIndex(currentIndex - 1);
        }
    });

    btnRestart.addEventListener('click', function () { window.location.href = 'index.html'; });
    document.getElementById('btn-retry').addEventListener('click', resetQuiz);
    document.getElementById('btn-wa-qualified').addEventListener('click', function (e) { e.preventDefault(); goToWhatsApp('qualified', 'qualified'); });
    document.getElementById('btn-wa-soft').addEventListener('click', function (e) { e.preventDefault(); goToWhatsApp('soft', 'qualified-soft'); });
    document.getElementById('btn-wa-disqualify').addEventListener('click', function (e) { e.preventDefault(); goToWhatsApp('disqualify', 'disqualified'); });

    var handlers = { q1: handleQ1, q2: handleQ2, q3: handleQ3, q4: handleQ4, q5: handleQ5, q6: handleQ6, q7: handleQ7, q8: handleQ8, q9: handleQ9 };
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
    if (new URLSearchParams(window.location.search).get('iniciar') === '1') goToIndex(1);
    else showStep('intro');
})();
