  // ---------- Bergfort-onderdelen als Raatmaker-modules (SKP_RAAT uit 08o, gemaakt door tools/sketchup/naar_raatmaker.py) ----------
  // In de eigen modulelijst gezet (id 'bergfort:' + naam), zodat je ze in de Raatmaker kunt openen en aanpassen.
  // Bij een nieuwe uitgave (andere SKP_RAAT.versie) worden ze vervangen: eigen aanpassingen aan deze modules gaan dan
  // verloren (bewaar een aangepaste module als kopie). bergRaat.mod(i) geeft de module voor plaatsing i van het fort.
  const bergRaat = (() => {
    const VERSIE = 'raatstad-berg-raat', ids = SKP_RAAT.mods.map(m => 'bergfort:' + m.name);
    function mod(i) {
      let m = modules.find(x => x.id === ids[i]);
      if (!m) { m = JSON.parse(JSON.stringify(SKP_RAAT.mods[i])); m.id = ids[i]; mv2Fix(m); modules.push(m); }
      return m;
    }
    try {
      if (localStorage.getItem(VERSIE) !== SKP_RAAT.versie) {
        modules = modules.filter(m => !String(m.id || '').startsWith('bergfort:') || ids.includes(m.id));
        SKP_RAAT.mods.forEach((src, i) => { const j = modules.findIndex(x => x.id === ids[i]); if (j >= 0) { const m = JSON.parse(JSON.stringify(src)); m.id = ids[i]; mv2Fix(m); modules[j] = m; } else mod(i); });
        saveMods(); localStorage.setItem(VERSIE, SKP_RAAT.versie);
      }
    } catch (e) { /* geen opslag */ }
    return { mod, index: id => ids.indexOf(id) };
  })();
