/* SAJAC — site interactions */

// Flip <html class="no-js"> -> "js" so the stagger CSS that hides
// elements only kicks in when JavaScript is actually running. If JS
// fails or is disabled, the .no-js class stays and all content
// remains visible (progressive enhancement, no blank page risk).
document.documentElement.classList.replace('no-js', 'js');

// --- THEME TOGGLE -------------------------------------------------------
// The initial theme is set by the inline script in <head> (so no flash on
// load). Here we wire the click handler to flip data-theme + persist to
// localStorage, and listen for OS-level scheme changes for users who
// haven't manually picked yet.
(() => {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    const html = document.documentElement;

    toggle.addEventListener('click', () => {
        const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        try { localStorage.setItem('sajac-theme', next); } catch (e) {}
    });

    // If user has never clicked the toggle, follow OS-level changes live.
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener?.('change', (e) => {
            if (localStorage.getItem('sajac-theme')) return; // user has a choice, respect it
            html.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        });
    }
})();

// --- CONFIG ---------------------------------------------------------------
// Form posts to our own Cloudflare Pages Function at /api/book, which
// forwards to Formspree (email backup) and pings CallMeBot to send a
// WhatsApp to Johan. See functions/api/book.js. If the function is
// unreachable (e.g. local file:// preview) the form falls back to a
// mailto: link so a booking can still reach the inbox.
const BOOK_ENDPOINT   = '/api/book';
const FALLBACK_MAILTO = 'info@sajac.nl';

// --- YEAR -----------------------------------------------------------------
document.getElementById('year').textContent = new Date().getFullYear();

// --- MOBILE NAV TOGGLE ---------------------------------------------------
(() => {
    const toggle = document.getElementById('navToggle');
    const links  = document.querySelector('.nav-links');
    if (!toggle || !links) return;

    const setOpen = (open) => {
        toggle.classList.toggle('active', open);
        links.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
    };

    toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
})();

// --- REVEAL + STAGGER ----------------------------------------------------
// Each .section's key children fade up one after another (90ms apart) as
// the section enters view. The .section itself also gets .in so its
// preceding divider line can animate too. Only fires once per element so
// scrolling back up doesn't re-trigger.
(() => {
    // 1. Mark up the elements we want to stagger. Done in JS instead of HTML
    //    so we don't have to touch every section in the markup. Per service
    //    card / playlist item not the wrapping grid, so each card animates
    //    on its own delay -> more deliberate reveal.
    const childSelector = [
        '.kicker',
        'h1', 'h2',
        '.hero-sub', '.hero-actions',
        '.lead', '.lead-center',
        '.service-card', '.service-foot',
        '.song-grid', '.repertoire-foot',
        '.video-embed',
        '.price-anchor',
        '.book-form'
    ].join(', ');

    document.querySelectorAll('.section, .hero-inner').forEach(root => {
        root.querySelectorAll(childSelector).forEach(el => {
            el.classList.add('stagger-target');
        });
    });

    // Fallback: no IntersectionObserver -> just reveal everything
    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.stagger-target').forEach(el => el.classList.add('in'));
        document.querySelectorAll('.section').forEach(s => s.classList.add('in'));
        return;
    }

    const STAGGER_MS = 90;

    const reveal = (root) => {
        root.classList.add('in');
        const items = root.querySelectorAll('.stagger-target:not(.in)');
        items.forEach((el, i) => {
            el.style.transitionDelay = (i * STAGGER_MS) + 'ms';
            el.classList.add('in');
        });
    };

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            reveal(entry.target);
            io.unobserve(entry.target);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.section').forEach(s => io.observe(s));

    // Hero is above-the-fold so reveal it immediately on next frame
    // instead of waiting for the observer (which only fires after layout).
    const heroInner = document.querySelector('.hero-inner');
    if (heroInner) {
        requestAnimationFrame(() => {
            heroInner.querySelectorAll('.stagger-target').forEach((el, i) => {
                el.style.transitionDelay = (i * 120) + 'ms';
                el.classList.add('in');
            });
        });
    }
})();

// --- NAV BG ON SCROLL ----------------------------------------------------
// Slight contrast tweak once the user has scrolled past the hero so the
// nav stays legible over the cream paper sections.
(() => {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    let ticking = false;
    const update = () => {
        const scrolled = window.scrollY > 40;
        nav.classList.toggle('scrolled', scrolled);
        ticking = false;
    };
    window.addEventListener('scroll', () => {
        if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
})();

// --- SMOOTH SCROLL WITH CINEMATIC EASING ---------------------------------
// Replaces the default CSS smooth-scroll for hash links so we control the
// duration and easing curve. ease-out-cubic gives a deliberate
// "settle into place" feel (fast start, slow finish) which reads as
// premium and intentional. Honours prefers-reduced-motion by snapping
// instantly instead of animating.
(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const NAV_OFFSET = 70;
    const DURATION = 320;
    // easeOutQuart: sharper deceleration than cubic, feels snappier
    // for short nav jumps while still showing direction of travel.
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 4);

    const scrollTo = (target) => {
        const startY = window.pageYOffset;
        const endY = target.getBoundingClientRect().top + startY - NAV_OFFSET;
        if (reduceMotion) { window.scrollTo(0, endY); return; }
        const distance = endY - startY;
        const startTime = performance.now();
        const step = (now) => {
            const t = Math.min((now - startTime) / DURATION, 1);
            window.scrollTo(0, startY + distance * easeOutCubic(t));
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (!href || href.length <= 1) return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            scrollTo(target);
            // Update URL hash without the browser's default jump.
            history.replaceState(null, '', href);
        });
    });
})();

// --- BOOKING FORM SUBMISSION --------------------------------------------
// Spam guard: any submit within 2.5s of page load is almost certainly a
// bot. Honest humans take longer to read and fill the form.
const pageLoadedAt = Date.now();

(() => {
    const form    = document.getElementById('bookForm');
    const success = document.getElementById('bookSuccess');
    if (!form) return;

    // Generic toggle helper for the "select-with-Anders-follow-up" pattern.
    // When the user picks one of the trigger values in the select, the
    // wrapper field becomes visible and its inner input becomes required.
    // Cleared + hidden + un-required on any other selection.
    const wireOther = (selectEl, wrapperEl, triggers) => {
        if (!selectEl || !wrapperEl) return;
        const input = wrapperEl.querySelector('input');
        const sync = () => {
            const show = triggers.includes(selectEl.value);
            wrapperEl.hidden = !show;
            if (input) {
                input.required = show;
                if (!show) input.value = '';
            }
        };
        selectEl.addEventListener('change', sync);
        sync();
    };

    wireOther(
        form.querySelector('#typeSelect'),
        form.querySelector('#typeAnders'),
        ['Anders']
    );
    wireOther(
        form.querySelector('#duurSelect'),
        form.querySelector('#duurAnders'),
        ['Anders / in overleg']
    );

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Honeypot + time-check anti-spam
        const fd = new FormData(form);
        if (fd.get('_gotcha')) return;
        if (Date.now() - pageLoadedAt < 2500) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Versturen...';

        // Combine "Anders" follow-up text into the displayed value so the
        // destination email shows a meaningful description regardless of
        // which backend handles delivery. Applies to both Type evenement
        // and Gewenste duur (both have the same pattern).
        const typeRaw = fd.get('type');
        const typeAndersText = (fd.get('type_anders') || '').toString().trim();
        const typeDisplay = typeRaw === 'Anders' && typeAndersText
            ? `Anders: ${typeAndersText}`
            : (typeRaw || '');

        const duurRaw = fd.get('duur');
        const duurAndersText = (fd.get('duur_anders') || '').toString().trim();
        const duurDisplay = duurRaw === 'Anders / in overleg' && duurAndersText
            ? duurAndersText
            : (duurRaw || '');

        try {
            if (BOOK_ENDPOINT && location.protocol !== 'file:') {
                const res = await fetch(BOOK_ENDPOINT, {
                    method: 'POST',
                    body: fd,
                    headers: { 'Accept': 'application/json' },
                });
                if (!res.ok) throw new Error('Booking endpoint failed: ' + res.status);
                showSuccess();
            } else {
                // No backend configured — open the user's mail client with
                // a pre-filled message instead of silently failing. This
                // way Day-1 bookings still reach the inbox.
                const subject = `Boekingsaanvraag: ${typeDisplay || 'optreden'} - ${fd.get('naam')}`;
                const lines = [];
                const nv = '(niet opgegeven)';
                lines.push(`Naam: ${fd.get('naam') || ''}`);
                lines.push(`Email: ${fd.get('email') || ''}`);
                lines.push(`Telefoon: ${fd.get('telefoon') || nv}`);
                lines.push(`Type evenement: ${typeDisplay || nv}`);
                lines.push(`Datum: ${fd.get('datum') || nv}`);
                lines.push(`Duur: ${duurDisplay || nv}`);
                lines.push(`Plaats: ${fd.get('plaats') || nv}`);
                lines.push(`Locatie / zaal: ${fd.get('locatie') || nv}`);
                lines.push('');
                lines.push('Toelichting:');
                lines.push(fd.get('bericht') || '(geen)');
                const body = encodeURIComponent(lines.join('\n'));
                window.location.href = `mailto:${FALLBACK_MAILTO}?subject=${encodeURIComponent(subject)}&body=${body}`;
                showSuccess();
            }
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            alert('Verzenden mislukt. Bel of mail direct via 06 12 15 16 50 of info@sajac.nl.');
        }
    });

    function showSuccess() {
        form.hidden = true;
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
})();
