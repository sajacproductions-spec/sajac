# Sajac — Live Zanger

Eén-pagina website voor Johan "Sajac" Bakels. Static HTML/CSS/JS, deploy
op Cloudflare Pages, email via Cloudflare Email Routing.

---

## Live URL

- Productie: https://sajac.nl
- Cloudflare Pages: (vul in na deploy)

---

## Deploy stappen (Cloudflare Pages — gratis)

1. **Repo aanmaken** (vanuit deze map):
   ```
   gh repo create sajac --public --source=. --remote=origin --push
   ```

2. **Cloudflare Pages koppelen:**
   - Ga naar https://dash.cloudflare.com → Pages → Create application →
     Connect to Git
   - Selecteer `sajac` repo
   - Build settings: laat leeg (geen build command, geen output dir)
   - Klik **Save and Deploy**
   - Krijgt automatisch URL: `sajac-xxx.pages.dev`

3. **Custom domain koppelen (sajac.nl):**
   - In Pages → Custom domains → Add custom domain → `sajac.nl`
   - Cloudflare vraagt: domain is bij TransIP geregistreerd. Twee opties:
     - **Optie A (eenvoudig)**: Verhuis nameservers van TransIP naar
       Cloudflare. Cloudflare DNS is gratis en geeft je meer controle.
       Stap-voor-stap in Pages dashboard. Duurt 24-48u DNS propagatie.
     - **Optie B (DNS bij TransIP houden)**: Voeg CNAME `@` → `sajac-xxx.pages.dev`
       toe in TransIP DNS. Werkt ook, maar Cloudflare features (Email Routing,
       Workers) zijn dan niet beschikbaar voor dit domein.
   - Aanbeveling: **Optie A**, zodat Email Routing kan werken.

4. **www-redirect verifiëren:**
   Na deploy moet `https://www.sajac.nl` 301-redirecten naar `https://sajac.nl`.
   Het `_redirects` bestand in deze repo regelt dat automatisch.

---

## Email setup (gratis via Cloudflare)

Voorwaarde: nameservers staan op Cloudflare (Optie A hierboven).

1. **Cloudflare Email Routing aanzetten:**
   - Cloudflare dashboard → Email → Email Routing → Enable
   - Cloudflare voegt automatisch MX records toe
   
2. **Forwarding regel maken:**
   - Custom address: `info@sajac.nl`
   - Destination: `sajacproductions@gmail.com`
   - Cloudflare stuurt een verificatie mail naar gmail → bevestigen
   
3. **Gmail "Send as" instellen** (zodat antwoorden vanaf `info@sajac.nl` lijken te komen):
   - Open Gmail → Settings → Accounts → Send mail as → Add another email address
   - Naam: `Sajac`
   - Email: `info@sajac.nl`
   - SMTP server: `smtp.gmail.com`, port 587, TLS
   - Username: `sajacproductions@gmail.com`
   - Password: App password (genereren via Google Account → Security →
     App passwords; vereist 2FA)
   - Gmail stuurt verificatiemail naar `info@sajac.nl` → komt aan op gmail
     via de routing regel → bevestig
   - Bij nieuwe mail: kies `info@sajac.nl` als "From"

4. **Test:**
   Stuur vanaf een ander adres een mail naar `info@sajac.nl`. Hij moet
   binnen seconden in de gmail-inbox staan.

---

## Formulier backend (Formspree — gratis)

1. Account aanmaken op https://formspree.io (free plan: 50 submissions/maand,
   inclusief spam filter)
2. New form → email destination: `sajacproductions@gmail.com` of
   `info@sajac.nl` zodra Email Routing draait
3. Kopieer de form endpoint (formaat: `https://formspree.io/f/xxxxxxxx`)
4. Plak in `script.js`:
   ```js
   const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xxxxxxxx';
   ```
5. Commit + push → Cloudflare deployt automatisch

**Wat gebeurt zonder Formspree?** Het formulier valt terug op een
`mailto:` link — de browser opent de email-app van de bezoeker met
alle velden voor-ingevuld. Werkt, maar minder ideaal (sommige
bezoekers hebben geen mail-app op hun device). Daarom Formspree
zodra mogelijk.

---

## Content updaten

Alles staat in `index.html`. Geen build step nodig — pas aan, commit,
push, Cloudflare deployt binnen ~30s.

**Veelvoorkomende updates:**
- Prijzen: zoek op `€300` / `€450` / `€600` (in HTML én Schema.org JSON-LD)
- Telefoon: zoek op `0612151650`
- Repertoire / bio: in de `<section class="section-about">` en
  `<section class="section-services">` blokken
- Spotify track: vervang de `iframe src` in `<section id="muziek">`

**Foto's toevoegen:**
- Drop bestanden in `images/`
- Aanbevolen formaten: WebP of JPG, breedte max 1600px
- Specifiek nodig:
  - `images/og.jpg` — 1200×630 — voor social media previews
  - Eventueel `images/hero.jpg` — full-screen achtergrond — dan
    in CSS `.hero-bg` de background-image regel toevoegen

---

## Tech stack

- HTML5 + CSS3 + vanilla JS (geen framework, geen build)
- Hosting: Cloudflare Pages (gratis, global CDN)
- Email: Cloudflare Email Routing (gratis forwarding)
- Forms: Formspree (gratis tier)
- Fonts: Google Fonts (Fraunces serif + Inter sans)

---

## Kosten overzicht

| Wat | Kost |
|---|---|
| Domein sajac.nl | €6,04 / jaar (TransIP) |
| Cloudflare Pages hosting | €0 |
| Cloudflare Email Routing | €0 |
| Formspree free tier | €0 |
| **Totaal** | **€6,04 / jaar** |
