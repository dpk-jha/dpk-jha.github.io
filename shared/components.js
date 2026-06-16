(function () {
    var toggle = document.querySelector('.menu-toggle');
    var navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
        toggle.addEventListener('click', function () {
            var open = navLinks.classList.toggle('open');
            toggle.setAttribute('aria-expanded', open);
            toggle.innerHTML = open
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
        });
        navLinks.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') {
                navLinks.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
            }
        });
    }

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

    var modal = document.getElementById('resume-modal');
    if (modal) {
        var iframe = modal.querySelector('.resume-modal-iframe');
        var overlay = modal.querySelector('.resume-modal-overlay');
        var closeBtn = modal.querySelector('.resume-modal-close');
        var printBtn = modal.querySelector('.resume-modal-print');
        var iframeLoader = modal.querySelector('.resume-modal-loader');

        var iframeLoaded = false;

        iframe.addEventListener('load', function () {
            iframeLoaded = true;
            if (iframeLoader) iframeLoader.classList.add('loaded');
        });

        var savedScrollY = 0;

        function openModal() {
            var pageUrl = window.location.href.split('#')[0];
            if (!iframe.src || iframe.src === pageUrl) {
                iframeLoaded = false;
                if (iframeLoader) iframeLoader.classList.remove('loaded');
                iframe.src = '/resume-print.html';
            } else if (iframeLoaded && iframeLoader) {
                iframeLoader.classList.add('loaded');
            }
            savedScrollY = window.scrollY;
            document.body.style.top = -savedScrollY + 'px';
            document.body.classList.add('resume-modal-open');
            modal.setAttribute('aria-hidden', 'false');
        }

        function closeModal() {
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('resume-modal-open');
            document.body.style.top = '';
            window.scrollTo(0, savedScrollY);
            if (document.activeElement) document.activeElement.blur();
        }

        document.querySelectorAll('[data-resume-modal]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                openModal();
            });
        });

        overlay.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
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
