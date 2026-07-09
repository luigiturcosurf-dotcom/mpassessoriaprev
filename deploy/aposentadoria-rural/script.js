(function () {
    var BENEFICIO = 'aposentadoria-rural';
    var _fired = false;

    if (typeof MPLeads !== 'undefined') {
        MPLeads.initLpTracking(BENEFICIO);
    }

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
                        content_name: 'Aposentadoria Rural',
                        content_category: 'previdenciario'
                    });
                }
            }
        });
    });
})();
