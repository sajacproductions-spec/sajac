/* SAJAC — site interactions */

// --- CONFIG ---------------------------------------------------------------
// Replace this with a real Formspree endpoint once registered. While it
// stays as the empty default the form falls back to a mailto: action so
// the booking flow still works on day one. Sign-up: https://formspree.io
// (free tier: 50 submissions/month, includes spam filter)
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xkoeanrd';
const FALLBACK_MAILTO    = 'info@sajac.nl';

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

// --- REVEAL ON SCROLL ----------------------------------------------------
// Sections fade up subtly as they enter the viewport. Only adds the class
// on first intersection so it doesn't re-trigger on backwards scroll.
(() => {
    const targets = document.querySelectorAll('.section, .hero-inner');
    targets.forEach(el => el.classList.add('reveal'));

    if (!('IntersectionObserver' in window)) {
        targets.forEach(el => el.classList.add('in'));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(el => io.observe(el));

    // Hero should fade in immediately (it's above-the-fold).
    requestAnimationFrame(() => document.querySelector('.hero-inner')?.classList.add('in'));
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

// --- BOOKING FORM SUBMISSION --------------------------------------------
// Spam guard: any submit within 2.5s of page load is almost certainly a
// bot. Honest humans take longer to read and fill the form.
const pageLoadedAt = Date.now();

(() => {
    const form    = document.getElementById('bookForm');
    const success = document.getElementById('bookSuccess');
    if (!form) return;

    // "Anders" follow-up field: appears only when Type evenement is set to
    // "Anders". When visible the inner input becomes required so the form
    // can't be submitted without a description. Hidden again on any other
    // selection.
    const typeSelect = form.querySelector('#typeSelect');
    const typeAnders = form.querySelector('#typeAnders');
    if (typeSelect && typeAnders) {
        const andersInput = typeAnders.querySelector('input');
        const sync = () => {
            const show = typeSelect.value === 'Anders';
            typeAnders.hidden = !show;
            if (andersInput) {
                andersInput.required = show;
                if (!show) andersInput.value = '';
            }
        };
        typeSelect.addEventListener('change', sync);
        sync();
    }

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

        // Combine "Anders" follow-up text into the type field if filled,
        // so the destination email shows a meaningful event description
        // regardless of which backend handles delivery.
        const typeRaw = fd.get('type');
        const typeAndersText = (fd.get('type_anders') || '').toString().trim();
        const typeDisplay = typeRaw === 'Anders' && typeAndersText
            ? `Anders: ${typeAndersText}`
            : (typeRaw || '');

        try {
            if (FORMSPREE_ENDPOINT) {
                const res = await fetch(FORMSPREE_ENDPOINT, {
                    method: 'POST',
                    body: fd,
                    headers: { 'Accept': 'application/json' },
                });
                if (!res.ok) throw new Error('Formspree failed: ' + res.status);
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
                lines.push(`Duur: ${fd.get('duur') || nv}`);
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
