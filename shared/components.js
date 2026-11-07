(function () {
    // Tells the inline fail-safe in each page <head> that this script loaded (see the 'js' class snippet).
    window.__rv = 1;

    /* ── Mobile menu ─────────────────────────────────────────── */
    var toggle = document.querySelector('.menu-toggle');
    var navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
        var ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
        var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
        var setMenu = function (open) {
            navLinks.classList.toggle('open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            toggle.innerHTML = open ? ICON_CLOSE : ICON_MENU;
        };
        toggle.addEventListener('click', function () { setMenu(!navLinks.classList.contains('open')); });
        navLinks.addEventListener('click', function (e) {
            if (e.target.closest('a')) setMenu(false);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && navLinks.classList.contains('open')) { setMenu(false); toggle.focus(); }
        });
    }

    /* ── Scroll reveals (progressive enhancement) ────────────── */
    var observer = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
                entries[i].target.classList.add('visible');
                observer.unobserve(entries[i].target);
            }
        }
    }, { threshold: 0.12, rootMargin: '-40px 0px' });

    document.querySelectorAll('.reveal, .reveal-zoom, .reveal-left')
        .forEach(function (el) { observer.observe(el); });

    /* ── Resume modal ────────────────────────────────────────── */
    var modal = document.getElementById('resume-modal');
    if (modal) {
        var iframe = modal.querySelector('.resume-modal-iframe');
        var overlay = modal.querySelector('.resume-modal-overlay');
        var closeBtn = modal.querySelector('.resume-modal-close');
        var printBtn = modal.querySelector('.resume-modal-print');
        var iframeLoader = modal.querySelector('.resume-modal-loader');

        var iframeLoaded = false;
        var savedScrollY = 0;
        var opener = null;

        modal.setAttribute('aria-modal', 'true');

        iframe.addEventListener('load', function () {
            iframeLoaded = true;
            if (iframeLoader) iframeLoader.classList.add('loaded');
        });

        var isOpen = function () { return modal.getAttribute('aria-hidden') === 'false'; };

        // Visible, enabled controls inside the dialog, in DOM order (the iframe is skipped on purpose).
        var focusables = function () {
            return Array.prototype.slice.call(modal.querySelectorAll('button, a[href]'))
                .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
        };

        function openModal(from) {
            var pageUrl = window.location.href.split('#')[0];
            if (!iframe.src || iframe.src === pageUrl) {
                iframeLoaded = false;
                if (iframeLoader) iframeLoader.classList.remove('loaded');
                iframe.src = '/resume-print.html';
            } else if (iframeLoaded && iframeLoader) {
                iframeLoader.classList.add('loaded');
            }
            opener = from || document.activeElement;
            savedScrollY = window.scrollY;
            document.body.style.top = -savedScrollY + 'px';
            document.body.classList.add('resume-modal-open');
            modal.setAttribute('aria-hidden', 'false');
            if (closeBtn) closeBtn.focus();
        }

        function closeModal() {
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('resume-modal-open');
            document.body.style.top = '';
            window.scrollTo(0, savedScrollY);
            if (opener && typeof opener.focus === 'function') opener.focus();
            opener = null;
        }

        document.querySelectorAll('[data-resume-modal]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                // A phone is too narrow to read the one-page layout inside a dialog: open the PDF itself.
                if (window.innerWidth < 640) { window.location.href = '/DeepakJha.pdf'; return; }
                openModal(link);
            });
        });

        overlay.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);

        document.addEventListener('keydown', function (e) {
            if (!isOpen()) return;
            if (e.key === 'Escape') { closeModal(); return; }
            if (e.key !== 'Tab') return;
            // Keep Tab / Shift+Tab inside the dialog.
            var items = focusables();
            if (!items.length) return;
            var first = items[0], last = items[items.length - 1];
            if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
            else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });

        printBtn.addEventListener('click', function () {
            try {
                iframe.contentWindow.print();
            } catch (err) {
                window.open('/resume-print.html', '_blank');
            }
        });
    }
})();

/* Live India Standard Time in the closing contact block. The static "IST (UTC+05:30)" stays if JS is off. */
(function () {
    var el = document.getElementById('ist-time');
    if (!el || !window.Intl || !Intl.DateTimeFormat) return;
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return; }
    function tick() { el.textContent = ' \u00b7 ' + fmt.format(new Date()); el.hidden = false; }
    tick();
    setInterval(tick, 15000);
})();
