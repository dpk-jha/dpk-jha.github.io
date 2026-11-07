/* Back-to-top button for the long portfolio pages (home, /projects, case studies).
 * Injects its own button (styles live in shared/shell.css), shows it after one screen of scrolling,
 * and scrolls smoothly unless the visitor prefers reduced motion. */
(function () {
    'use strict';
    var SHOW_AFTER_PX = 600;
    var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>';
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'back-to-top';
    button.setAttribute('aria-label', 'Back to top');
    button.innerHTML = ARROW;
    document.body.appendChild(button);

    var shown = false;
    function update() {
        var next = window.scrollY > SHOW_AFTER_PX;
        if (next !== shown) { shown = next; button.classList.toggle('visible', shown); }
    }
    window.addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
    update();
})();
