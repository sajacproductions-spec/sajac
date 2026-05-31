// Cloudflare Pages Function — handles the booking form submit.
// Flow:
//   1. Receive the form POST from the browser
//   2. Forward it to Formspree (so the email backup keeps working)
//   3. Fire a WhatsApp notification to Johan via CallMeBot
//
// Secrets are set in the Cloudflare Pages dashboard under:
//   Settings -> Environment variables -> Production
// Required vars:
//   CALLMEBOT_API_KEY  (the key Johan got when activating CallMeBot)
//   WHATSAPP_PHONE     (Johan's number in international format, e.g. +31612151650)
//   FORMSPREE_ENDPOINT (optional override, defaults to the existing one)

const DEFAULT_FORMSPREE = 'https://formspree.io/f/xkoeanrd';

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const formData = await request.formData();

        // Honeypot: silently accept so bots think they succeeded.
        if (formData.get('_gotcha')) {
            return jsonOk();
        }

        // 1. Forward to Formspree so the email backup keeps working.
        const formspreeRes = await fetch(env.FORMSPREE_ENDPOINT || DEFAULT_FORMSPREE, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' },
        });

        if (!formspreeRes.ok) {
            return jsonError('Email versturen mislukt', 502);
        }

        // 2. WhatsApp notification via CallMeBot. Fire-and-forget logic:
        //    even if WhatsApp fails the booking succeeds, because the
        //    Formspree email already went out.
        if (env.CALLMEBOT_API_KEY && env.WHATSAPP_PHONE) {
            try {
                await sendWhatsApp(formData, env);
            } catch (e) {
                // Silently swallow. Email is the source of truth.
            }
        }

        return jsonOk();
    } catch (err) {
        return jsonError('Server error', 500);
    }
}

async function sendWhatsApp(formData, env) {
    const naam     = (formData.get('naam') || 'Onbekend').toString().trim();
    const email    = (formData.get('email') || '').toString().trim();
    const telefoon = (formData.get('telefoon') || '').toString().trim();
    const datum    = (formData.get('datum') || '').toString().trim();
    const plaats   = (formData.get('plaats') || '').toString().trim();
    const locatie  = (formData.get('locatie') || '').toString().trim();
    const bericht  = (formData.get('bericht') || '').toString().trim();

    const typeRaw    = (formData.get('type') || '').toString().trim();
    const typeAnders = (formData.get('type_anders') || '').toString().trim();
    const type = typeRaw === 'Anders' && typeAnders
        ? `Anders: ${typeAnders}`
        : typeRaw;

    const duurRaw    = (formData.get('duur') || '').toString().trim();
    const duurAnders = (formData.get('duur_anders') || '').toString().trim();
    const duur = duurRaw === 'Anders / in overleg' && duurAnders
        ? duurAnders
        : duurRaw;

    const lines = [
        '*Nieuwe boekingsaanvraag via sajac.nl*',
        '',
        `Naam: ${naam}`,
        `Email: ${email}`,
    ];
    if (telefoon) lines.push(`Tel: ${telefoon}`);
    if (type)     lines.push(`Type: ${type}`);
    if (datum)    lines.push(`Datum: ${datum}`);
    if (duur)     lines.push(`Duur: ${duur}`);
    if (plaats)   lines.push(`Plaats: ${plaats}`);
    if (locatie)  lines.push(`Locatie: ${locatie}`);
    if (bericht) {
        lines.push('');
        lines.push('Bericht:');
        lines.push(bericht);
    }

    const text = lines.join('\n');
    const phone = env.WHATSAPP_PHONE.replace(/^\+/, ''); // CallMeBot wants no leading +

    const url = 'https://api.callmebot.com/whatsapp.php'
        + `?phone=${encodeURIComponent(phone)}`
        + `&text=${encodeURIComponent(text)}`
        + `&apikey=${encodeURIComponent(env.CALLMEBOT_API_KEY)}`;

    await fetch(url, { method: 'GET' });
}

function jsonOk() {
    return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
}

function jsonError(message, status) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
