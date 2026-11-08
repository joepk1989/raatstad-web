// Twee fotobladen van modules_uitsteek_fotos.js (html) naast elkaar: per module het bovenaanzicht van vóór en van na, en het
// schuine aanzicht van na. Gebruik: node visueel/vergelijk_bladen.js voor.html na.html uit.png "Titel"
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const [voorF, naF, uitF, titel] = process.argv.slice(2);
const kaarten = f => { const s = fs.readFileSync(f, 'utf8'), uit = new Map(); for (const k of s.split('<div style="background:#fff').slice(1)) { const naam = (k.match(/font-weight:600">([^<]*)</) || [])[1], imgs = [...k.matchAll(/src="([^"]+)"/g)].map(m => m[1]); if (naam) uit.set(naam, imgs); } return uit; };
(async () => {
  const V = kaarten(voorF), N = kaarten(naF);
  const html = `<html><body style="margin:0;padding:16px;background:#f4f6f8;color:#1b2430;font:14px system-ui,sans-serif"><h2 style="margin:0 0 10px">${titel || 'Vóór en na'}</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-weight:600;margin-bottom:6px"><div>vóór · boven</div><div>na · boven</div><div>na · schuin</div></div>
  ${[...N.keys()].map(n => `<div style="background:#fff;border:1px solid #cfd6de;border-radius:8px;padding:8px;margin-bottom:8px"><div style="font-weight:600;margin-bottom:4px">${n}</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[(V.get(n) || [])[0], N.get(n)[0], N.get(n)[1]].map(s => s ? `<img src="${s}" style="width:100%">` : '<div></div>').join('')}</div></div>`).join('')}</body></html>`;
  const tmp = path.resolve(path.dirname(uitF), '_vergelijk.html'); fs.writeFileSync(tmp, html);
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 800 } }); await p.goto('file://' + tmp); await p.waitForTimeout(300);
  await p.screenshot({ path: uitF, fullPage: true }); await b.close(); fs.unlinkSync(tmp); console.log('blad:', uitF);
})();
