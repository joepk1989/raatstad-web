// Gedeelde hulp voor de visuele tests: start de gebouwde site (`node build.js --site`) in een headless Chromium,
// met three.js r128 lokaal (de CDN is in de sandbox niet bereikbaar). Eenmalig: `cd test && npm i three@0.128.0 playwright`.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const OUT = process.env.UIT || path.join(__dirname, 'uit');
fs.mkdirSync(OUT, { recursive: true });
async function open(viewport, opts = {}) {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport, ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('FOUT', e.message));
  await p.route(/^https?:/, r => r.abort());   // niets van buiten laden (zonder netwerk blijft de pagina anders hangen)
  await p.route('**/three.min.js', r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(require.resolve('three/build/three.min.js', { paths: [path.join(ROOT, 'test')] })) }));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('file://' + path.join(ROOT, 'site/index.html'), { timeout: 180000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('#welcomeGo')?.click()); await p.waitForTimeout(300);
  await p.evaluate(() => window.__SC().doAct('start'));   // het startstadje: rotonde met drie wegen
  await p.evaluate(() => { const S = window.__SC(); S.collapse.setOn(true); S.cars.setGore(true); });   // tests: instorten en bloed aan (in het spel standaard uit)
  await testModules(p);
  return { b, p };
}
// Vaste testmodules: 'Plateau · 3 m', 'Plateau · met muurtjes', 'Pad · twee wanden' en 'Pad · helling tussen twee wanden' (één vak, raster 1,125 m, twee lagen). Ze
// kwamen uit het bergfort; dat is uit het spel (Joep bouwt het opnieuw op), dus de tests zetten ze zelf in de bibliotheek
// (niet bewaard). Na p.reload() opnieuw aanroepen als de test ze daarna nog nodig heeft.
const PLATEAUS = JSON.parse(fs.readFileSync(path.join(__dirname, 'vast/plateaus.json'), 'utf8'));
const testModules = p => p.evaluate(L => { for (const m of L) if (!window.__mods.some(x => x.id === m.id)) window.__mods.push(JSON.parse(JSON.stringify(m))); }, PLATEAUS);
const click = (p, sel) => p.evaluate(s => document.querySelector(s).click(), sel);
module.exports = { open, click, OUT, testModules };
