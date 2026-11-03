// Controle: nooit donkere tekst op een donkere achtergrond (of lichte op licht). Meldt zichtbare tekst met contrast onder 3:1, in de stad, de Modulekaart en de fortpagina.
const { open } = require('./helper');
const check = () => {
  const rgb = s => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c && (c.length < 4 || c[3] > 0.5)) return c; } return [190, 220, 150]; };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    let hidden = false; for (let e = el; e; e = e.parentElement) if (e.hidden || getComputedStyle(e).display === 'none') { hidden = true; break; } if (hidden) continue;
    const a = lum(rgb(cs.color)), b = lum(bgOf(el)); const cr = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (cr < 3) out.push([el.textContent.trim().slice(0, 40), cs.color, String(bgOf(el)), cr.toFixed(2)]);
  }
  return out;
};
(async () => {
  const { b, p } = await open({ width: 1300, height: 860 });
  console.log('stad', JSON.stringify(await p.evaluate(check)));
  await p.keyboard.press('KeyK'); await p.waitForTimeout(500);
  console.log('kaart', JSON.stringify(await p.evaluate(check)));
  await p.evaluate(() => [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === 'Bergfort').click()); await p.waitForTimeout(1200);
  console.log('fort', JSON.stringify(await p.evaluate(check)));
  await b.close();
})();
