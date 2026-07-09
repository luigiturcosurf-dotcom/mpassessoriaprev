(function () {
    var WA_NUMBER = '5511947642923';
    var WA_TEXT = encodeURIComponent('Olá, vi o anúncio. Gostaria de analisar meu direito à Aposentadoria Rural.');
    var WA_URL = 'https://wa.me/' + WA_NUMBER + '?text=' + WA_TEXT;
    var BENEFICIO = 'aposentadoria-rural';
    var _fired = false;

    if (typeof MPLeads !== 'undefined') {
        MPLeads.initLpTracking(BENEFICIO);
    }

    document.querySelectorAll('.wa-link').forEach(function (link) {
        link.href = WA_URL;
        link.target = '_blank';
        link.rel = 'noopener';
    });

    document.querySelectorAll('.faq-question').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var item = btn.parentElement;
            var wasActive = item.classList.contains('active');
            document.querySelectorAll('.faq-item.active').forEach(function (el) {
                el.classList.remove('active');
            });
            if (!wasActive) item.classList.add('active');
        });
    });

    document.querySelectorAll('a[href*="wa.me"]').forEach(function (link) {
        link.addEventListener('click', function () {
            if (!_fired) {
                _fired = true;
                if (typeof fbq === 'function') {
                    fbq('trackSingle', '1752369442414230', 'Lead', {
                        content_name: 'Aposentadoria Rural INSS',
                        content_category: 'previdenciario'
                    });
                }
            }
        });
    });
})();
