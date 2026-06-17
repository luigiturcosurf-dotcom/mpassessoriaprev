/**
 * Repassa UTMs da URL atual para links internos do quiz.
 */
(function () {
    var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

    function getUtmQuery() {
        var params = new URLSearchParams(window.location.search);
        var parts = [];
        UTM_KEYS.forEach(function (key) {
            var val = params.get(key);
            if (val) parts.push(key + '=' + encodeURIComponent(val));
        });
        return parts.length ? parts.join('&') : '';
    }

    function appendUtms(href, utmQuery) {
        if (!utmQuery || !href || href.indexOf('http') === 0 && href.indexOf(window.location.hostname) === -1) {
            return href;
        }
        var hash = '';
        var hashIdx = href.indexOf('#');
        if (hashIdx !== -1) {
            hash = href.slice(hashIdx);
            href = href.slice(0, hashIdx);
        }
        var sep = href.indexOf('?') >= 0 ? '&' : '?';
        return href + sep + utmQuery + hash;
    }

    function apply() {
        var utmQuery = getUtmQuery();
        if (!utmQuery) return;

        document.querySelectorAll('a[href*="analise-de-beneficio"]').forEach(function (link) {
            link.setAttribute('href', appendUtms(link.getAttribute('href'), utmQuery));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }
})();
