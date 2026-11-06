// Browseropslag vol: één duidelijke waarschuwing (niet bij elke klik), en het spel loopt gewoon door
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1000, height: 700 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const r = await p.evaluate(async () => {
    const wacht = ms => new Promise(r => setTimeout(r, ms));
    const echt = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('vol', 'QuotaExceededError'); };
    const S = window.__SC(), el = document.getElementById('toast'), uit = [];
    S.doAct('empty'); await wacht(400); uit.push(el.textContent);
    S.doAct('empty'); await wacht(400); uit.push(el.textContent);   // tweede keer: geen nieuwe waarschuwing
    Storage.prototype.setItem = echt; return uit;
  });
  console.log('eerste', JSON.stringify(r[0])); console.log('tweede', JSON.stringify(r[1]));
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/opslagvol.png' });
  console.log('fouten', errs); await b.close();
})();
