// Cameramodus (spatie): je kijkt en schiet, maar bouwt niets. Klikken met een module gekozen (gewone module uit de
// bibliotheek, of een bergfort-/SketchUp-module via de Modulekaart) mag in de cameramodus geen module neerzetten.
// Daarna, uit de cameramodus, moet plaatsen weer gewoon werken. Screenshot: camera_niet_bouwen.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
  const tel = () => p.evaluate(() => ({ inst: (window.__SC().getCells().inst || []).length, skp: window.__skpBouw ? window.__skpBouw.aantal : 0 }));
  const cam = async aan => { const on = await p.evaluate(() => window.__SC().flyCam.on); if (on !== aan) { await p.mouse.move(640, 400); await p.keyboard.press('Space'); await p.waitForTimeout(500); } return p.evaluate(() => window.__SC().flyCam.on); };
  const klik = async () => { for (const [x, y] of [[640, 420], [600, 450], [700, 380]]) { await p.mouse.move(x, y); await p.waitForTimeout(150); await p.mouse.click(x, y); await p.waitForTimeout(500); } };
  const uit = [];
  // 1. gewone module
  await p.evaluate(() => { const S = window.__SC(), i = window.__mods.findIndex(m => m.v === 2 && m.name.startsWith('Rijhuis')); S.modSel(i >= 0 ? i : 0); S.selectTool('module'); }); await p.waitForTimeout(300);
  let t0 = await tel(), aan = await cam(true); await klik(); let t1 = await tel();
  console.log('gewone module in cameramodus:', JSON.stringify({ aan, voor: t0, na: t1 })); uit.push(aan && t1.inst === t0.inst);
  await cam(false); await p.evaluate(() => window.__SC().selectTool('module')); await klik(); const t2 = await tel();
  console.log('gewone module daarna:', JSON.stringify(t2)); uit.push(t2.inst > t1.inst);
  // 2. bergfort-module via de Modulekaart (skpBouw)
  await p.evaluate(() => window.__skpBouw.start({ naam: 'Plateau · met muurtjes' })); await p.waitForTimeout(400);
  t0 = await tel(); aan = await cam(true); await klik(); t1 = await tel(); await p.screenshot({ path: OUT + '/camera_niet_bouwen.png' });
  console.log('bergfort-module in cameramodus:', JSON.stringify({ aan, voor: t0, na: t1 })); uit.push(aan && t1.inst === t0.inst && t1.skp === t0.skp);
  await cam(false); await p.evaluate(() => window.__skpBouw.start({ naam: 'Plateau · met muurtjes' })); await p.waitForTimeout(300); await klik(); const t3 = await tel();
  console.log('bergfort-module daarna:', JSON.stringify(t3)); uit.push(t3.inst > t1.inst || t3.skp > t1.skp);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // 3. lopen met het oog (Kijken): ook dan niets neerzetten, ook niet als er nog een bergfort-module klaarstond
  for (const [naam, start] of [['gewone module', () => p.evaluate(() => window.__SC().selectTool('module'))], ['bergfort-module', () => p.evaluate(() => window.__skpBouw.start({ naam: 'Plateau · met muurtjes' }))]]) {
    await start(); await p.waitForTimeout(300); await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelector('#hands [data-hand="kijken"]').click()); await p.waitForTimeout(200);
    const v = await tel(); await klik(); const n = await tel(); await p.screenshot({ path: OUT + '/camera_niet_bouwen_kijken.png' });
    console.log('lopen met het oog, ' + naam + ':', JSON.stringify({ voor: v, na: n })); uit.push(n.inst === v.inst && n.skp === v.skp);
    await p.keyboard.press('Escape'); await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(600);
  }
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
