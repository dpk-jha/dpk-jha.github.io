/* Product pages are opened from the portfolio in their own named tab (target="dpkay-<project>").
 * When such a page links back to the portfolio (home or /projects), take the visitor back to the
 * portfolio tab that is still open instead of piling up another copy of it:
 *   1. send the original tab to the destination (only if it is not already there),
 *   2. close this product tab, which returns the visitor to the original tab,
 *   3. if the browser refuses to close it, or there is no usable opener, navigate normally.
 * Direct visits, modified clicks (new tab, download, ...) and every other link are left alone. */
(function () {
    'use strict';
    var PORTFOLIO_PATHS = { '/': 1, '/projects': 1, '/projects.html': 1, '/index.html': 1 };
    var HOSTS = /^(www\.)?dpkay\.com$/;

    function normPath(p) { return p.length > 1 ? p.replace(/\/+$/, '') : p; }

    function portfolioTarget(a) {
        var u;
        try { u = new URL(a.getAttribute('href'), location.href); } catch (e) { return null; }
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        if (u.origin !== location.origin && !HOSTS.test(u.hostname)) return null;
        var path = normPath(u.pathname);
        if (!PORTFOLIO_PATHS[path]) return null;
        // Stay on the origin we are on (local dev server, www, or production).
        return { url: location.origin + u.pathname + u.search + u.hash, path: path, hash: u.hash };
    }

    function usableOpener() {
        try {
            var o = window.opener;
            if (!o || o.closed) return null;
            return o.location.origin === location.origin ? o : null; // throws when cross-origin
        } catch (e) { return null; }
    }

    document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
        var t = portfolioTarget(a);
        var opener = t && usableOpener();
        if (!opener) return; // normal navigation
        e.preventDefault();
        try {
            var here = normPath(opener.location.pathname);
            var same = (here === t.path || (here === '/index.html' && t.path === '/')) && !t.hash;
            if (!same) opener.location.assign(t.url);
            opener.focus();
        } catch (err) { return void location.assign(t.url); }
        window.close();
        // Browsers only let script close tabs they consider script-opened; never leave a dead click.
        setTimeout(function () { if (!window.closed) location.assign(t.url); }, 250);
    });
})();
