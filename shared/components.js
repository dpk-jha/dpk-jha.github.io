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

    var MOBILE_BP = 640;
    var modal = document.getElementById('resume-modal');
    if (modal) {
        var iframe = modal.querySelector('.resume-modal-iframe');
        var overlay = modal.querySelector('.resume-modal-overlay');
        var closeBtn = modal.querySelector('.resume-modal-close');
        var printBtn = modal.querySelector('.resume-modal-print');

        var scrollY = 0;

        function openModal() {
            if (!iframe.src || iframe.src === window.location.href) {
                iframe.src = '/resume-print.html';
            }
            scrollY = window.scrollY;
            document.body.classList.add('resume-modal-open');
            document.body.style.top = -scrollY + 'px';
            modal.setAttribute('aria-hidden', 'false');
        }

        function closeModal() {
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('resume-modal-open');
            document.body.style.top = '';
            window.scrollTo(0, scrollY);
        }

        document.querySelectorAll('[data-resume-modal]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                if (window.innerWidth <= MOBILE_BP) return;
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
