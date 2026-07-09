(function () {
    if (typeof MPLeads !== 'undefined') {
        MPLeads.initLpTracking('pensao-por-morte');
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
})();
