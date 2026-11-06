// three.js-terugval: eerste CDN geblokkeerd → tweede bron; beide geblokkeerd → leesbare melding in plaats van een leeg scherm
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const { OUT } = require('./helper');
const THREE = fs.readFileSync(require.resolve('three/build/three.min.js', { paths: [path.join(__dirname, '..')] }));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const geval of ['eerste geblokkeerd', 'alles geblokkeerd']) {
    const p = await b.newPage({ viewport: { width: 900, height: 600 } });
    await p.route(/^https?:/, r => (geval === 'eerste geblokkeerd' && /jsdelivr/.test(r.request().url())) ? r.fulfill({ contentType: 'application/javascript', body: THREE }) : r.abort());
    await p.goto('file://' + path.resolve(__dirname, '../../site/index.html'), { timeout: 180000 }); await p.waitForTimeout(3000);
    const r = await p.evaluate(() => ({ three: !!window.THREE, spel: typeof window.__SC === 'function', melding: [...document.querySelectorAll('body > div')].some(d => /kon niet starten/.test(d.textContent)) }));
    console.log(geval, JSON.stringify(r));
    await p.screenshot({ path: path.join(OUT, 'three_terugval_' + geval.split(' ')[0] + '.png') });
    await p.close();
  }
  await b.close();
})();
