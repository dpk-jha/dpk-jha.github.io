(function () {
    var path = location.pathname;
    var isHome = path === '/' || path === '/index.html' || path.endsWith('/index.html');
    var page = path.split('/').pop() || 'index.html';

    var header = document.getElementById('site-header');
    if (header) {
        header.innerHTML =
            '<nav class="container">' +
                '<a href="/" class="logo">DEEPAK JHA</a>' +
                '<ul class="nav-links">' +
                    '<li><a href="/projects.html"' + (page === 'projects.html' ? ' class="active"' : '') + '>Projects</a></li>' +
                    '<li><a href="https://medium.com/@dpkay" target="_blank" rel="noopener noreferrer">Blog</a></li>' +
                    '<li><a href="https://drive.google.com/file/d/0B3m4yg1enpX4T2xxazF1MkMxQ3M/view" target="_blank" rel="noopener noreferrer">Resume</a></li>' +
                    '<li><a href="' + (isHome ? '#contact' : '/#contact') + '">Contact</a></li>' +
                '</ul>' +
            '</nav>';
    }

    var footer = document.getElementById('contact');
    if (footer && footer.tagName === 'FOOTER') {
        footer.innerHTML =
            '<div class="container">' +
                '<div class="reveal">' +
                    '<h2>Get in touch.</h2>' +
                    '<a href="mailto:hello@dpkay.com" class="email-link">hello@dpkay.com</a>' +
                '</div>' +
                '<nav class="footer-links" aria-label="Social links">' +
                    (!isHome ? '<a href="/">Home</a>' : '') +
                    '<a href="https://linkedin.com/in/dpkjha" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
                    '<a href="https://github.com/dpkay-io" target="_blank" rel="noopener noreferrer">GitHub</a>' +
                    '<a href="https://medium.com/@dpkay" target="_blank" rel="noopener noreferrer">Medium</a>' +
                '</nav>' +
            '</div>';
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
})();
