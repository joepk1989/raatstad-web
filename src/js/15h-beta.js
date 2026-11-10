  // ---------- Beta: versie, feedback, foutmelding, stad als bestand, credits ----------
  // Alles wat nodig is voor de besloten test (zie het beta-plan): een zichtbaar versienummer, een feedbackknop die het
  // formulier opent (met de gegevens van je apparaat en de laatste fout om te plakken), een melding bij een fout in plaats
  // van een vastgelopen scherm, je stad bewaren en openen als bestand, en een credits-scherm.
  const beta = (() => {
    const VERSIE = '0.1.0-beta';
    // Meldingen gaan naar een Google Formulier (antwoorden in een Google Sheet), zonder account voor de tester.
    // FORM.url = de formResponse-link; FORM.velden = de entry-nummers van de vier vragen (uit een vooraf ingevulde link).
    // Leeg: dan opent Versturen een nieuw bericht op GitHub (daar is een account voor nodig).
    const FORM = { url: '', velden: { soort: '', tekst: '', email: '', gegevens: '' } };
    const FALLBACK_URL = 'https://github.com/joepk1989/raatstad-web/issues/new';
    let lastErr = '', lastShow = -1e9; const fouten = [];
    const device = () => {
      const ua = navigator.userAgent, b = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'onbekende browser';
      const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
      return b + (os ? ' op ' + os : '') + ' · scherm ' + window.innerWidth + '×' + window.innerHeight + ' · ' + (document.body.classList.contains('coarse') ? 'aanraken' : 'muis');
    };
    const gpu = () => { try { const gl = renderer.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { return '?'; } };
    const stad = () => { try { return (cells.size || 0) + ' vakken · ' + ((cells.inst || []).length) + ' modules · ' + ((cells.paths || []).length) + ' wegen'; } catch (e) { return '?'; } };
    const info = () => 'Raatstad ' + ((document.querySelector('#sheet .ver') || {}).textContent || VERSIE) + '\n' + device() + '\nGrafisch: ' + gpu() + '\nStad: ' + stad() +
      '\nSpeeltijd: ' + Math.round(performance.now() / 60000) + ' min · ' + (document.body.classList.contains('walk') ? 'lopen' : 'bouwen') +
      (fouten.length ? '\nFouten (nieuwste eerst):\n' + fouten.slice().reverse().map(f => '- ' + f).join('\n') : '\nGeen fouten gezien');
    // ---------- vensters ----------
    function makeSheet(id, html) {
      let el = document.getElementById(id); if (el) return el;
      el = document.createElement('div'); el.className = 'sheet'; el.id = id; el.hidden = true;
      el.innerHTML = '<div class="sheet-card" role="dialog">' + html + '</div>';
      el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) el.hidden = true; });
      document.body.appendChild(el); return el;
    }
    // ---------- melden: kort formulier in het spel ----------
    const SOORTEN = ['Fout of bug', 'Ik liep vast', 'Idee', 'Dit vond ik leuk'];
    const WACHT = 'raatstad-melding-wacht';   // meldingen die nog niet weg konden (geen internet): bij de volgende start opnieuw
    function post(m) {
      const d = new URLSearchParams(); for (const k in FORM.velden) if (FORM.velden[k]) d.append(FORM.velden[k], m[k] || '');
      return fetch(FORM.url, { method: 'POST', mode: 'no-cors', body: d });
    }
    function wachtrij(m) { try { const l = JSON.parse(localStorage.getItem(WACHT) || '[]'); if (m) l.push(m); localStorage.setItem(WACHT, JSON.stringify(l.slice(-10))); return l; } catch (e) { return []; } }
    function stuurWachtend() {
      if (!FORM.url) return; let l = []; try { l = JSON.parse(localStorage.getItem(WACHT) || '[]'); } catch (e) { }
      if (!l.length) return; try { localStorage.removeItem(WACHT); } catch (e) { }
      for (const m of l) post(m).catch(() => wachtrij(m));
    }
    function feedback(soort) {
      const el = makeSheet('fbSheet', `<h2>Melden</h2>
        <p>Wat ging er mis, waar liep je vast, of wat vond je leuk? Alles helpt.</p>
        <div class="fb-soort" role="radiogroup">${SOORTEN.map((t, i) => `<button type="button" class="fb-chip" data-s="${i}" role="radio">${t}</button>`).join('')}</div>
        <textarea id="fbTekst" class="fb-veld" rows="5" placeholder="Wat deed je, en wat gebeurde er?"></textarea>
        <input id="fbMail" class="fb-veld" type="email" autocomplete="email" placeholder="E-mail (niet verplicht, alleen als ik je iets mag vragen)">
        <details class="fb-meer"><summary>Wat er automatisch meegaat</summary><pre class="fb-info" id="fbInfo"></pre></details>
        <div class="welcome-btns" style="grid-template-columns:1fr 1fr">
          <button class="btn" type="button" data-close>Annuleren</button>
          <button class="btn mine" type="button" id="fbGo"><span class="lbl"><b>Versturen</b></span></button>
        </div>`);
      let keuze = soort != null ? soort : (lastErr ? 0 : -1);
      const zet = i => { keuze = i; for (const b of el.querySelectorAll('.fb-chip')) { const on = +b.dataset.s === i; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); } };
      for (const b of el.querySelectorAll('.fb-chip')) b.onclick = () => zet(+b.dataset.s);
      zet(keuze);
      const tekst = el.querySelector('#fbTekst'), mail = el.querySelector('#fbMail');
      try { mail.value = localStorage.getItem('raatstad-melding-mail') || ''; } catch (e) { }
      el.querySelector('#fbInfo').textContent = info();
      el.querySelector('#fbGo').onclick = () => {
        const t = tekst.value.trim();
        if (!t && keuze !== 3) { tekst.focus(); toast('Schrijf kort wat er gebeurde', 1800); return; }
        const m = { soort: SOORTEN[keuze] || 'Anders', tekst: t, email: mail.value.trim(), gegevens: info() };
        try { if (m.email) localStorage.setItem('raatstad-melding-mail', m.email); } catch (e) { }
        if (!FORM.url) {   // nog geen formulier: GitHub, met alles ingevuld
          window.open(FALLBACK_URL + '?title=' + encodeURIComponent(m.soort + ' · ' + VERSIE) + '&body=' + encodeURIComponent(t + '\n\n---\n' + m.gegevens), '_blank', 'noopener');
          el.hidden = true; return;
        }
        el.hidden = true; tekst.value = ''; lastErr = '';
        post(m).then(() => toast('Verstuurd. Dank je wel!', 2200), () => { wachtrij(m); toast('Geen verbinding: je melding gaat mee zodra je weer online bent', 3200); });
      };
      el.hidden = false; setTimeout(() => tekst.focus(), 50);
    }
    function credits() {
      const el = makeSheet('crSheet', `<h2>Credits</h2>
        <p class="welcome-sub">Raatstad ${VERSIE}</p>
        <p><b>Ontwerp en idee</b><br>Joep, Eindhoven. Het ontwerp, de maten en de modules zijn eigen werk.</p>
        <p><b>Code</b><br>Geschreven met hulp van AI (Claude, van Anthropic). Er zitten geen door AI gemaakte afbeeldingen, stemmen of teksten in het spel.</p>
        <p><b>Gebruikt</b><br>three.js (MIT-licentie) voor de 3D-weergave · lettertypen Big Shoulders Display en Atkinson Hyperlegible (SIL Open Font License, via Google Fonts).</p>
        <p><b>Geluiden</b><br>Bijna alle geluiden worden in het spel zelf gemaakt (Web Audio). Opnames: vogels, klap, kreunen en schreeuwen (vogels.mp3, klap.mp3, grunts.mp3, schreeuw.mp3); bron en licentie volgen.</p>
        <p><b>Testers</b><br>Iedereen die meespeelt in de beta: dank je wel!</p>
        <button class="btn" type="button" data-close>Sluiten</button>`);
      el.hidden = false;
    }
    // ---------- stad als bestand ----------
    function saveFile() {
      const d = new Date(), pad = n => String(n).padStart(2, '0'), name = 'raatstad-stad-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.json';
      const blob = new Blob([serialize(cells)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('Stad opgeslagen als ' + name, 2400);
    }
    function openFile() {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json,text/plain';
      inp.onchange = () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        f.text().then(t => {
          const m = parseCity((t || '').trim());
          if (!m || !m.size && !(m.paths && m.paths.length) && !(m.inst && m.inst.length)) return toast('Dit bestand is geen Raatstad-stad', 2400);
          nieuweStad(f.name.replace(/\.json$/i, '')); cells = roofHouses(m); document.getElementById('sheet').hidden = true; rebuildAll(); changed(); buildPathNet();
          toast('Stad geopend: ' + f.name, 2200);
        }, () => toast('Openen mislukt', 2000));
      };
      inp.click();
    }
    // ---------- fouten: een melding in plaats van een vastgelopen scherm ----------
    const bar = document.createElement('div'); bar.className = 'err-bar'; bar.hidden = true;
    bar.innerHTML = '<span>Er ging iets mis. Meld het, dan los ik het op.</span><button class="btn mine" type="button" data-f>Melden</button><button class="btn icon-btn" type="button" data-x aria-label="Sluiten">✕</button>';
    document.body.appendChild(bar);
    bar.querySelector('[data-f]').onclick = () => { bar.hidden = true; feedback(0); };
    bar.querySelector('[data-x]').onclick = () => { bar.hidden = true; };
    function report(e) {
      const msg = e && (e.stack || e.message) ? String(e.message || e) + (e.stack ? ' @ ' + String(e.stack).split('\n').slice(1, 3).map(s => s.trim()).join(' · ') : '') : String(e);
      lastErr = msg.slice(0, 400); if (fouten[fouten.length - 1] !== lastErr) { fouten.push(lastErr); if (fouten.length > 5) fouten.shift(); } try { console.error('Raatstad', e); } catch (e2) { }
      const now = performance.now(); if (now - lastShow < 30000) return; lastShow = now; bar.hidden = false;
    }
    window.addEventListener('error', ev => report(ev.error || ev.message));
    window.addEventListener('unhandledrejection', ev => report(ev.reason));
    // ---------- korte uitleg bij elke knop (muisaanwijzer, of lang aanraken) ----------
    const TIPS = {
      'tool-vrot': 'Rotonde: klik op een vak; wegen die erin uitkomen sluiten erop aan',
      'tool-spoor': 'Spoor: klik vak na vak; de uiteinden lopen door tot voorbij de horizon. Een treinstation ernaast wordt een halte',
      'tool-pad': 'Pad: sleep een voetpad over de vakken', 'tool-fietspad': 'Fietspad: sleep over de vakken', 'tool-vpad': 'Pad (getekend): sleep een voetpad zoals een weg; E/Q of het wiel maakt hem 1,5 m hoger of lager, vanaf 3 m wordt het een brug op pijlers en loopt hij over andere paden heen', 'tool-looppad': 'Steeg: een verhoogde vloer van 3 m, ook dwars door gebouwen; slepen, en op een blok stapelen voor hoger. Naast een trap of helling sluit hij vanzelf op de juiste hoogte aan',
      'tool-randpad': 'Randpad: een pad over de rand tussen twee vakken', 'tool-trap': 'Trap: klik nog eens om te draaien (R)', 'tool-trappad': 'Trappad: een pad met een trap omhoog',
      'tool-woning': 'Woning: tik op een vak; nog eens tikken stapelt een verdieping', 'tool-kantoor': 'Kantoor: tik op een vak; nog eens tikken stapelt een verdieping',
      'tool-dak': 'Dak: op een woning of kantoor; nog eens tikken geeft een dakkapel', 'tool-park': 'Park: tik op een park voor een andere inrichting',
      'tool-meer': 'Meer: water met natuurlijke oevers, slepen', 'tool-water': 'Gracht: water met kades, slepen',
      'tool-tophoog': 'Ophogen: ingedrukt houden; per 3 m (Instellingen → Terreinstap). Rechts of Shift: andersom', 'tool-tafgraaf': 'Afgraven: ingedrukt houden; per 3 m. Rechts of Shift: andersom',
      'tool-tvlak': 'Egaliseren: links naar het gemiddelde, rechts naar de hoogte van het startvak', 'tool-tglad': 'Gladstrijken: scherpe overgangen worden zacht',
      'tool-thelling': 'Helling trekken: sleep van de hoge naar de lage kant', 'tool-kuil': 'Uitgraving: 3 m omlaag', 'tool-helling': 'Helling: een oprit van 3 m, komt uit op het vak ernaast · zet daar een steeg neer en hij sluit vanzelf aan', 'tool-hofhelling': 'Opgang: een brede oprit van 3 m',
      menuBtn: 'Menu: steden, opslaan, Raatmaker, instellingen, feedback', optPeople: 'Mensen aan of uit', optCars: "Auto's aan of uit",
      recklessBtn: 'Totale chaos: roekeloze auto’s en paniek (met geweld, standaard uit)', jumpBtn: 'Springen (spatie)', placeBtn: 'Bouwen op het puntje in het midden', undoBtn: 'Ongedaan maken (Ctrl+Z)', todAutoBtn: 'De tijd loopt vanzelf door, of staat stil',
    };
    function applyTips() {
      for (const id in TIPS) { const el = document.getElementById(id); if (el && (!el.title || el.title === (el.textContent || '').trim() || /^[A-Z][a-z ']+$/.test(el.title))) el.title = TIPS[id]; }
      for (const b of document.querySelectorAll('.pal-tab')) if (!b.title) b.title = 'Tabblad ' + b.textContent.trim() + ': gereedschap en modules';
      const tod = document.querySelectorAll('[data-tod]'); for (const b of tod) if (!b.title) b.title = 'Zet de tijd op ' + b.textContent.trim().toLowerCase();
    }
    applyTips(); setTimeout(applyTips, 1500); setTimeout(stuurWachtend, 4000); setInterval(stuurWachtend, 60000); window.addEventListener('online', stuurWachtend);
    return { VERSIE, FORM, stuurWachtend, feedback, credits, saveFile, openFile, report, info };
  })();
  try { window.__beta = beta; } catch (e) { }
