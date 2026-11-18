# Overdracht – De Groene Weide Online

Voor Bert en de technische beheerder na de oplevering. Alle accounts staan **op naam van Bert**, met het e-mailadres van de camping. Wachtwoorden staan niet in dit document: die bewaart Bert in een wachtwoordmanager.

## Accounts

| Wat | Waarvoor | Op naam van | Ingevuld |
| --- | --- | --- | --- |
| Server (EU-hosting) | De website en de database draaien hier | Bert | [aanbieder, datum] |
| Domeinnaam | degroeneweide.nl (of de echte naam) | Bert | [registrar] |
| Mailprovider (EU) | De mails aan gasten (SMTP) | Bert | [aanbieder] |
| Beheer van de website | `/admin`, eerste account aangemaakt met `npm run create-staff` | Bert (beheerder) | [datum] |
| Tweede beheerder | Voor als Bert zijn telefoon kwijt is | [naam] | [datum] |
| Supabase Studio | Database bekijken, op `https://<API_DOMAIN>` achter een eigen login, of via een SSH-tunnel | Bert (`DASHBOARD_USERNAME` in `.env`) | [datum] |
| Facebook-pagina | Toegangssleutel voor de berichten op de site (optioneel) | Bert | [datum] |
| Google-bedrijfsprofiel | Link voor reviews (Instellingen → Overig) | Bert | [datum] |

## Waar staat wat

- **Code:** deze repository. Opstarten en uitrollen: [README.md](../README.md), "Deploying".
- **Geheimen:** `.env` op de server (nooit in git). Bevat de database-wachtwoorden, de Supabase-sleutels, `JOBS_SECRET`, `MANAGE_LINK_SECRET` en (optioneel) `FACEBOOK_PAGE_TOKEN` voor de Facebook-berichten op de homepage. Verander `MANAGE_LINK_SECRET` niet: dan werken de links in mails die al verstuurd zijn niet meer.
- **Achtergrondtaken:** de service `cron` roept elke 15 minuten `/api/jobs` aan: mails die mislukten opnieuw versturen, herinneringen en bedankmails. In de database draait elke nacht `apply_retention()` (gegevens van gasten weg na de bewaartermijn) en elke minuut het opruimen van verlopen plekken.

## Reservekopieën

- De service `backup` maakt elke nacht een dump van de database en een kopie van de foto's in het volume `backups` op de server, en bewaart de laatste 14.
- **Kopieer de back-ups ook van de server af** (bijvoorbeeld wekelijks naar een externe schijf of een tweede EU-opslag): `docker cp <project>-backup-1:/backups ./backups`, met als project `groene-weide` of de naam van de stack in Portainer. Een back-up op dezelfde server helpt niet als de server weg is.
- **Hersteltest:** `docker compose -f compose.prod.yaml run --rm backup sh /scripts/restore-check.sh`. Die zet de nieuwste back-up in een losse database, vergelijkt de aantallen en ruimt hem weer op. De echte gegevens blijven onaangeroerd.

| Datum hersteltest | Door | Uitkomst |
| --- | --- | --- |
| 17-11-2026 (ontwikkelomgeving) | ontwikkelaar | OK |
| [na het opzetten van de server] | | |

## Terugkerende taken

| Wanneer | Wat |
| --- | --- |
| Elke week | De back-ups van de server af kopiëren (zie boven). |
| Elke maand | Updates: `git pull`, dan `docker compose -f compose.prod.yaml up -d --build`. Kijk of de site en het beheer werken. |
| Elk kwartaal | Hersteltest (zie boven) en de datum hierboven invullen. |
| Voor elk seizoen | Seizoen van het nieuwe jaar en de prijzen nakijken in *Prijzen & seizoenen*. Plekken controleren en *gecontroleerd* aanzetten. |
| Elk jaar | Wie heeft er nog toegang? Oude accounts intrekken bij *Gebruikers & rollen*. |

## Kosten en uitgavenlimiet

Zet bij de hostingaanbieder een **uitgavenlimiet of waarschuwing** op het maandbedrag. De site gebruikt geen betaalde clouddiensten; alles draait op één server. [bedrag en datum invullen]

## Noodplan

1. Website plat, beheer werkt nog: *Reserveringen* → *Download voor Excel*, en bel gasten die binnenkort komen niet ongerust: hun reservering staat in de lijst.
2. Server weg: nieuwe server, `.env` terugzetten, de nieuwste back-up terugzetten met `pg_restore` en de foto's uitpakken in `infra/supabase/volumes/storage`. Daarna `docker compose -f compose.prod.yaml up -d --build`.
3. Iemand heeft toegang die dat niet mag: *Gebruikers & rollen* → *Toegang intrekken*, en wissel het wachtwoord van Bert.

## Nog nodig van Bert

Zie [Plan.md](../Plan.md), "Open vragen". Voor de lancering in elk geval: de bewaartermijn (Instellingen en de privacytekst, nu `[termijn]`), de annuleringsvoorwaarden (nu 14 dagen gratis), niveau 1 of 2 bij de start, de prijzen, het adres en de telefoon, de nummering van de plekken na de rondgang over het terrein, en wie de Engelse en Duitse teksten nakijkt.
