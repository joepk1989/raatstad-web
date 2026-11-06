// Knipperen tijdens het bouwen: de automatische beeldscherpte mag de pixelverhouding (en dus de canvasgrootte, wat het
// canvas leegmaakt) alleen aanpassen vóór er in een beeld getekend wordt, nooit erna; anders zie je één beeld lang een
// leeg scherm. De testmachine heeft geen echte videokaart (dan staat de automaat uit), dus we doen alsof er wel een is.
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {   // de naam van de videokaart: een echte, zodat Automatisch scherpte werkt
    for (const C of [WebGLRenderingContext, typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext : null]) if (C) {
      const echt = C.prototype.getParameter; C.prototype.getParameter = function (k) { return k === 0x9246 ? 'Testkaart GPU' : echt.call(this, k); };
    }
    try { localStorage.setItem('raatstad-set', JSON.stringify({ res: 'auto' })); } catch (e) { }
  });
  await p.route(/^https?:/, r => r.abort());
  await p.route('**/three.min.js', r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(require.resolve('three/build/three.min.js', { paths: [path.join(__dirname, '..')] })) }));
  await p.goto('file://' + path.resolve(__dirname, '../../site/index.html'), { timeout: 180000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelector('#welcomeGo')?.click(); window.__SC().doAct('start'); });
  // meten: per beeld bijhouden of er al getekend is, en elke wijziging van de pixelverhouding daartegen afzetten
  await p.evaluate(() => {
    const R = window.__SC().renderer, M = window.__knip = { getekend: false, voor: 0, na: 0 };
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => raf(t => { M.getekend = false; cb(t); });
    const render = R.render.bind(R); R.render = (s, c) => { M.getekend = true; return render(s, c); };
    const spr = R.setPixelRatio.bind(R); R.setPixelRatio = v => { if (M.getekend) M.na++; else M.voor++; return spr(v); };
  });
  // bouwen: een paar huizen neerzetten (geeft trage beelden), en wachten tot de automaat zijn werk doet
  await p.evaluate(() => document.getElementById('tool-woning').click());
  for (const [x, y] of [[450, 300], [380, 320], [520, 280], [430, 360], [500, 340]]) { await p.mouse.click(x, y); await p.waitForTimeout(700); }
  await p.waitForTimeout(6000);
  const m = await p.evaluate(() => ({ ...window.__knip, scherpte: +window.__SC().renderer.getPixelRatio().toFixed(2) }));
  console.log('scherpte aangepast vóór het tekenen', m.voor, '· ná het tekenen (knipperen)', m.na, '· scherpte nu', m.scherpte);
  console.log(m.voor > 0 && m.na === 0 ? 'GOED' : m.voor + m.na === 0 ? 'NIET GEMETEN (automaat deed niets)' : 'FOUT: knippert');
  console.log('fouten', errs);
  await b.close();
})();
