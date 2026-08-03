/**
 * MP Assessoria · Google Ads — conversão no clique do WhatsApp.
 *
 * O redirect para wa.me mata o pixel se for imediato. Este helper dispara
 * gtag('event','conversion') e só navega no event_callback (ou timeout).
 */
var MPGoogleAds = (function () {
    var SEND_TO = 'AW-17670340948/AuYoCJTl0b8cENSC8OlB';
    var TIMEOUT_MS = 1200;

    function trackConversion(callback) {
        var done = false;
        var finish = function () {
            if (done) return;
            done = true;
            if (typeof callback === 'function') callback();
        };

        try {
            if (typeof gtag === 'function') {
                gtag('event', 'conversion', {
                    send_to: SEND_TO,
                    value: 1.0,
                    currency: 'BRL',
                    event_callback: finish
                });
                setTimeout(finish, TIMEOUT_MS);
                return;
            }
        } catch (err) {
            /* fall through */
        }

        // Fallback: evento custom no GTM (trigger: ads_conversion_whatsapp)
        if (window.dataLayer && typeof window.dataLayer.push === 'function') {
            window.dataLayer.push({
                event: 'ads_conversion_whatsapp',
                send_to: SEND_TO,
                value: 1.0,
                currency: 'BRL',
                eventCallback: finish,
                eventTimeout: TIMEOUT_MS
            });
            setTimeout(finish, TIMEOUT_MS);
            return;
        }

        finish();
    }

    function redirectWithConversion(url) {
        trackConversion(function () {
            window.location.href = url;
        });
    }

    return {
        SEND_TO: SEND_TO,
        trackConversion: trackConversion,
        redirectWithConversion: redirectWithConversion
    };
})();
