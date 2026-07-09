/**
 * MP Assessoria · Captura UTMs + fbclid/gclid/fbp/fbc e repassa para links internos.
 */
(function () {
    var TRACK_KEYS = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'fbclid', 'gclid'
    ];
    var PREFIX = 'mp_track_';

    function getCookie(name) {
        var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function captureFromUrl() {
        var params = new URLSearchParams(window.location.search);
        TRACK_KEYS.forEach(function (key) {
            var val = params.get(key);
            if (val) sessionStorage.setItem(PREFIX + key, val);
        });

        var fbp = getCookie('_fbp');
        if (fbp) sessionStorage.setItem(PREFIX + 'fbp', fbp);

        var fbc = getCookie('_fbc');
        if (fbc) {
            sessionStorage.setItem(PREFIX + 'fbc', fbc);
            return;
        }

        var fbclid = params.get('fbclid') || sessionStorage.getItem(PREFIX + 'fbclid');
        if (fbclid && !sessionStorage.getItem(PREFIX + 'fbc')) {
            sessionStorage.setItem(PREFIX + 'fbc', 'fb.1.' + Date.now() + '.' + fbclid);
        }
    }

    function getTrackingQuery() {
        var params = new URLSearchParams(window.location.search);
        var parts = [];
        TRACK_KEYS.forEach(function (key) {
            var val = params.get(key) || sessionStorage.getItem(PREFIX + key);
            if (val) parts.push(key + '=' + encodeURIComponent(val));
        });
        return parts.length ? parts.join('&') : '';
    }

    function appendTracking(href, query) {
        if (!query || !href) return href;
        if (href.indexOf('http') === 0 && href.indexOf(window.location.hostname) === -1) {
            return href;
        }
        var hash = '';
        var hashIdx = href.indexOf('#');
        if (hashIdx !== -1) {
            hash = href.slice(hashIdx);
            href = href.slice(0, hashIdx);
        }
        var sep = href.indexOf('?') >= 0 ? '&' : '?';
        return href + sep + query + hash;
    }

    function applyToLinks() {
        var query = getTrackingQuery();
        if (!query) return;

        document.querySelectorAll(
            'a[href*="analise-de-beneficio"], a[href*="analise.html"]'
        ).forEach(function (link) {
            link.setAttribute('href', appendTracking(link.getAttribute('href'), query));
        });
    }

    captureFromUrl();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyToLinks);
    } else {
        applyToLinks();
    }
})();
