// Gedeelde hulp voor de visuele tests: start de gebouwde site (`node build.js --site`) in een headless Chromium,
// met three.js r128 lokaal (de CDN is in de sandbox niet bereikbaar). Eenmalig: `cd test && npm i three@0.128.0 playwright`.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const OUT = process.env.UIT || path.join(__dirname, 'uit');
fs.mkdirSync(OUT, { recursive: true });
// opts.leeg: meteen een lege bouwgrond in plaats van het startstadje (scheelt ±2 s voor tests die toch leeg beginnen)
async function open(viewport, opts = {}) {
  const { leeg, ...ctxOpts } = opts;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport, ...ctxOpts });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('FOUT', e.message));
  await p.route(/^https?:/, r => r.abort());   // niets van buiten laden (zonder netwerk blijft de pagina anders hangen)
  await p.route('**/three.min.js', r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(require.resolve('three/build/three.min.js', { paths: [path.join(ROOT, 'test')] })) }));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  p.setDefaultTimeout(120000);   // onder belasting (meer tests tegelijk) is 30 s soms te kort
  await p.goto('file://' + path.join(ROOT, 'site/index.html'), { timeout: 300000 });   // met meer tests tegelijk kan laden lang duren
  await p.waitForFunction(() => window.__SC && document.querySelector('#welcomeGo'), null, { timeout: 120000 }); await p.waitForTimeout(300);   // wachten tot het spel klaar is (was vast 2,5 s)
  await p.evaluate(() => document.querySelector('#welcomeGo')?.click()); await p.waitForTimeout(300);
  await p.evaluate(leeg => window.__SC().doAct(leeg ? 'empty' : 'start'), !!leeg);   // het startstadje: rotonde met drie wegen (of leeg)
  await p.evaluate(() => { const S = window.__SC(); S.collapse.setOn(true); S.cars.setGore(true); });   // tests: instorten en bloed aan (in het spel standaard uit)
  await testModules(p);
  // Sneller: tijdens de test op halve scherpte tekenen (een kwart van de pixels; de testbrowser tekent in software, en
  // met vier tests tegelijk (reeks.js) zaten ze elkaar flink in de weg). Voor een screenshot even weer scherp, zodat de
  // beelden er hetzelfde uitzien. SCHERP=1: altijd scherp.
  if (!process.env.SCHERP) {
    const zet = r => p.evaluate(r => { const S = window.__SC(); S.renderer.setPixelRatio(r); }, r).catch(() => {});
    await zet(0.5);
    const foto = p.screenshot.bind(p);
    p.screenshot = async (o) => { await zet(1); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); try { return await foto(o); } finally { await zet(0.5); } };
  }
  return { b, p };
}
// Vaste testmodules: 'Plateau · 3 m', 'Plateau · met muurtjes', 'Pad · twee wanden' en 'Pad · helling tussen twee wanden' (één vak, raster 1,125 m, twee lagen). Ze
// kwamen uit het bergfort; dat is uit het spel (Joep bouwt het opnieuw op), dus de tests zetten ze zelf in de bibliotheek
// (niet bewaard). Na p.reload() opnieuw aanroepen als de test ze daarna nog nodig heeft.
const PLATEAUS = JSON.parse(fs.readFileSync(path.join(__dirname, 'vast/plateaus.json'), 'utf8'));
const testModules = p => p.evaluate(L => { for (const m of L) if (!window.__mods.some(x => x.id === m.id)) window.__mods.push(JSON.parse(JSON.stringify(m))); }, PLATEAUS);
const click = (p, sel) => p.evaluate(s => document.querySelector(s).click(), sel);
// Zelf lopen in een test: W ingedrukt tot de speler `meters` (horizontaal) verder is, of 3 s niet meer vooruitkomt
// (tegen een muur), of na maxMs. Op afstand in plaats van op tijd: de testbrowser is wisselend traag, zeker als er
// meer tests tegelijk draaien (reeks.js).
async function loopAfstand(p, meters, maxMs = 120000) {
  const pos = () => p.evaluate(() => { const P = window.__SC().player; return [P.x, P.z]; });
  const a = await pos(), t0 = Date.now(); let laatst = a, stilT = Date.now();
  await p.keyboard.down('KeyW');
  while (Date.now() - t0 < maxMs) { await p.waitForTimeout(250); const q = await pos();
    if (Math.hypot(q[0] - a[0], q[1] - a[1]) >= meters) break;
    if (Math.hypot(q[0] - laatst[0], q[1] - laatst[1]) > 0.05) { laatst = q; stilT = Date.now(); } else if (Date.now() - stilT > 3000) break; }
  await p.keyboard.up('KeyW');
}
// Een klik op het tekenvlak zoals de muis hem geeft (indrukken en loslaten), maar in één keer: het spel telt een klik
// alleen als het loslaten binnen 600 ms komt, en als er meer tests tegelijk draaien kan er tussen mouse.down() en
// mouse.up() één traag beeld zitten. Dan viel de klik weg (reeks.js). Eerst de muis erheen bewegen (hover) blijft nodig.
async function tik(p, x, y, opts = {}) {
  await p.mouse.move(x, y, { steps: 2 });
  await p.evaluate(([x, y, o]) => { const c = document.querySelector('canvas'), base = { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, bubbles: true, cancelable: true, button: o.rechts ? 2 : 0, ctrlKey: !!o.ctrl };
    c.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ buttons: o.rechts ? 2 : 1 }, base))); c.dispatchEvent(new PointerEvent('pointerup', Object.assign({ buttons: 0 }, base))); }, [x, y, opts]);
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));   // en wachten tot het gevolg getekend is
}
module.exports = { open, click, OUT, testModules, loopAfstand, tik };
