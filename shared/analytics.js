(function() {
    // Only measure real visitors: skip localhost / preview / file:// so local testing never pollutes analytics.
    var h = location.hostname;
    if (h !== 'dpkay.com' && h !== 'www.dpkay.com') return;

    // Inject the external Google Tag Manager script
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-FV71B5QXW8';
    document.head.appendChild(script);

    // Initialize the dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag; // expose globally
    
    gtag('js', new Date());
    gtag('config', 'G-FV71B5QXW8');
})();
