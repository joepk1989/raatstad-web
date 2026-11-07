# Raatstad (webversie)

Stadsbouwer op zeshoeken en driehoeken, speelbaar in de browser (three.js). Je bouwt een stad en loopt er zelf doorheen.
Alles is in het Nederlands: code-commentaar, interface, commits en antwoorden aan Joep.

## Bouwen en testen
- `node build.js --site` voegt `src/js/*.js` (op naam gesorteerd, één IIFE) en `src/style.css` samen tot `site/index.html`. `site/` staat niet in git; GitHub Pages bouwt zelf.
- Lokaal spelen: na de build `site/index.html` openen (of `npx serve site`). Op de telefoon via wifi: `npx serve site` en het adres van de pc openen.
- Tests: Playwright-scripts in `test/visueel/*.js` (hulp: `test/visueel/helper.js`, `open()` en `window.__SC()`). Screenshots komen in `test/visueel/uit/`.
- Draai na een wijziging de test die erbij hoort, en `test/visueel/beta.js` als het om menu of beta gaat.

## Vaste regels van Joep
- Alles volgt hexagon- en driehoeksgeometrie, ware schaal (1 eenheid = 1 m).
- Nooit donkere tekst op een donkere achtergrond (en andersom): altijd goed leesbaar.
- Screenshots van de ontwikkeling bewaren, nooit verwijderen.
- Geen hekken of railings in het bergdorp: lichte schuine muurtjes (`rand: 'muurtje'`).
- Kleine stappen, elke stap getest, dan committen en pushen.
- Na elke geteste stap: committen, pushen en de pull request naar `main` meteen samenvoegen, zonder te vragen (Joep wil het automatisch online). Daarna de werkbranch opnieuw vanaf de nieuwe `main` beginnen.

## Waar alles staat
- `README.md` beschrijft per onderdeel hoe het werkt (maten, regels, formules). Lees het deel dat je gaat aanpassen.
- Modules (Raatmaker, v2): `08c-modules-v2.js` (bouwen, trappen, `plaat` voor vrije hellingen/zuilen/wanden), `08d-module-maker.js` (de editor), `08f-modules-lopen.js` (loopnetwerk).
- Bergfort uit SketchUp: `tools/sketchup/` (Python). `naar_raatmaker.py` zet de SketchUp-onderdelen om naar `src/js/08o-bergfort-raatmaker.js`; `rafelkaart.py` maakt een bovenaanzicht ter controle.
- Beta: `15h-beta.js` (versie, Melden, foutbalk, credits, stad als bestand).

## Stand van zaken (6 november 2026)
Beta 0.1.0 is bijna klaar. Het plan staat in Joeps document "Raatstad beta-plan" (claude.ai).

Klaar: welkomstscherm, uitleg bij knoppen, versie in het menu, foutbalk, waarschuwing en opslaan als bestand, standaardinstellingen (chaos/bloed/instorten uit), credits, Melden in het spel (`test/visueel/melden.js`).

Nog open:
1. **Melden koppelen aan het Google Formulier.** Joep maakt een formulier met vier tekstvragen (Soort, Wat gebeurde er, E-mail, Gegevens), gekoppeld aan een Sheet, en geeft de "vooraf ingevulde link". Daaruit: `FORM.url` = `.../formResponse` en `FORM.velden` = de vier `entry.<nummer>`-namen in `15h-beta.js`. Daarna een echte testmelding sturen en in de Sheet controleren. Tot dan opent Versturen een bericht op GitHub.
2. Testen op een echte Android-telefoon en iPhone (laden, joystick, springen, bouwen, menu), laadtijd op 4G, beeld vloeiend in het Startstadje; laptop met Chrome en Firefox.
3. Herkomst en licentie vastleggen van `assets/vogels.mp3`, `klap.mp3`, `grunts.mp3`, `schreeuw.mp3`.
4. itch.io-pagina: omslag 630 × 500, 3–5 screenshots, korte gif van de stadsgenerator.

Bergfort (basismodules): hellingen, bordessen, zuilen en schuine wanden komen nu precies uit SketchUp. Nog open: dubbele muurrand bij "Plateau · met muurtjes", vorm van de lichtkoepel, 8 originele stukken die door de looproute-zoeker (`pad_af.py`) zijn vervangen terugzetten, en het uitzichtplatform (wacht op Joeps export met `tools/sketchup/export-alles-console.rb`).
