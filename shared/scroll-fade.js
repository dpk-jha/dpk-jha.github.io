/* Edge fade for horizontally scrolling strips (the /projects filter row and case-study tabs).
 * A strip marked [data-scroll-fade] fades the edge that still has hidden content, so "more this way" is visible.
 * Nothing is added when a strip fits (desktop): the classes only appear while it overflows. Styles: shared/shell.css. */
(function () {
    'use strict';
    var EDGE_TOLERANCE_PX = 2;
    function update(strip) {
        var maxScroll = strip.scrollWidth - strip.clientWidth;
        strip.classList.toggle('fade-l', strip.scrollLeft > EDGE_TOLERANCE_PX);
        strip.classList.toggle('fade-r', maxScroll > EDGE_TOLERANCE_PX && strip.scrollLeft < maxScroll - EDGE_TOLERANCE_PX);
    }
    document.querySelectorAll('[data-scroll-fade]').forEach(function (strip) {
        var refresh = function () { update(strip); };
        strip.addEventListener('scroll', refresh, { passive: true });
        if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(strip); else window.addEventListener('resize', refresh);
        refresh();
    });
})();
