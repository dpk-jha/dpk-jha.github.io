/* Back-to-top button for the long portfolio pages (home, /projects, case studies).
 * Injects its own button (styles live in shared/shell.css), shows it after one screen of scrolling,
 * and scrolls smoothly unless the visitor prefers reduced motion.
 * On phones it appears only while the visitor scrolls UP (the moment they want the top) and hides while reading
 * downward, so it never sits on top of the text they are reading. */
(function () {
    'use strict';
    var SHOW_AFTER_PX = 600;
    var SCROLL_NOISE_PX = 4;   // ignore jitter smaller than this when deciding the scroll direction
    var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>';
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var phone = window.matchMedia('(max-width: 640px)');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'back-to-top';
    button.setAttribute('aria-label', 'Back to top');
    button.innerHTML = ARROW;
    document.body.appendChild(button);

    var shown = false, scrollingUp = false, lastY = window.scrollY;
    function update() {
        var y = window.scrollY;
        if (Math.abs(y - lastY) > SCROLL_NOISE_PX) { scrollingUp = y < lastY; lastY = y; }
        var next = y > SHOW_AFTER_PX && (!phone.matches || scrollingUp);
        if (next !== shown) { shown = next; button.classList.toggle('visible', shown); }
    }
    window.addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
    update();
})();
