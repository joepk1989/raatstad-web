  // ---------- Opties bij het gereedschap (idee uit de Unity-versie) ----------
  // Bij de terreingereedschappen staan Stap, Penseel en Hoogtelijnen meteen boven de snelbalk (op de telefoon bovenin),
  // in plaats van alleen in Instellingen. Het zijn dezelfde instellingen (SET_ROWS uit 15c), dus ze worden ook bewaard.
  // Meer gereedschappen met opties: een regel toevoegen aan OPTS.
  const toolOpts = (() => {
    const OPTS = [{ tools: TERR_TOOLS, rows: ['tstep', 'brush', 'contour'] }];
    const KORT = { tstep: 'Stap', brush: 'Penseel', contour: 'Hoogtelijnen' };
    const balk = document.createElement('div'); balk.className = 'toolopts'; balk.id = 'toolOpts'; balk.hidden = true; balk.setAttribute('role', 'group'); balk.setAttribute('aria-label', 'Opties bij dit gereedschap');
    const dockM = document.getElementById('dockM'); dockM.insertBefore(balk, document.getElementById('catOpen'));
    let balkSig = '';
    function updateBalk() {
      // telefoon: bovenin het scherm (in de onderbalk past het niet naast de handen en de schakelaar); de onderbalk
      // heeft een transform, dus de balk moet dan rechtstreeks in de body staan om vast op het scherm te blijven
      const smal = innerWidth <= 760, plek = smal ? document.body : dockM;
      if (balk.parentNode !== plek) { if (smal) plek.appendChild(balk); else plek.insertBefore(balk, document.getElementById('catOpen')); }
      const set = mode === 'build' && OPTS.find(o => o.tools.has(tool));
      if (!set) { balk.hidden = true; balkSig = ''; return; }
      const rows = set.rows.map(id => SET_ROWS.find(r => r.id === id)).filter(Boolean);
      const sig = tool + '|' + rows.map(r => String(r.get())).join('|');
      if (sig === balkSig && !balk.hidden) return;
      balkSig = sig; balk.hidden = false; balk.innerHTML = '';
      for (const R0 of rows) {
        const g = document.createElement('div'); g.className = 'to-groep';
        const l = document.createElement('span'); l.className = 'to-naam'; l.textContent = KORT[R0.id] || R0.name; g.appendChild(l);
        const seg = document.createElement('div'); seg.className = 'seg'; seg.title = R0.note || R0.name;
        for (const [v, t] of R0.opts) {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.dataset.v = String(v);
          b.setAttribute('aria-pressed', String(R0.get() === v)); b.title = R0.name + ': ' + t;
          b.addEventListener('click', e => { e.stopPropagation(); R0.set(v); saveSet(); balkSig = ''; updateBalk(); });
          seg.appendChild(b);
        }
        g.appendChild(seg); balk.appendChild(g);
      }
    }
    // elke frame goedkoop: alleen opnieuw opbouwen als het gereedschap of een waarde verandert ([ en ], Instellingen)
    (function lus() { try { updateBalk(); } catch (e) { /* nooit het spel laten vallen om een hulpje */ } requestAnimationFrame(lus); })();
    return { update: updateBalk };
  })();
