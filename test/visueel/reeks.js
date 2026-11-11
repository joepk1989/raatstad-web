// Draait een reeks visuele tests tegelijk (standaard 4 naast elkaar) en geeft per test GOED of FOUT met de tijd.
// Gebruik: node test/visueel/reeks.js [-n 4] test1 test2 …   of zonder namen: de vaste reeks voor paden en wegen.
// Een test telt als goed als hij 'GOED' print (of niets met FOUT/Error) en zonder foutcode stopt.
const { spawn } = require('child_process'), path = require('path');
const PADEN = ['paden_getekend', 'steeg_getekend', 'steeg_helling', 'weg_bocht', 'eq_hoogte', 'steeg_vul', 'steeg_voorbeeld', 'stegen_toren', 'paden_aansluiten', 'vulblokken', 'loopdek', 'loopdek_voorbeeld', 'overlap', 'beta', 'contrast', 'hexklinkers', 'weg_dijk', 'steeg_blok', 'steeg_klik', 'steeg_klik_10lagen', 'steeg_bouwblok', 'bouwpad', 'bouwpad_varianten', 'bouwpad_netwerk', 'bouwpad_complex'];
const args = process.argv.slice(2); let n = 4; if (args[0] === '-n') { n = +args[1] || 4; args.splice(0, 2); }
const lijst = args.length ? args : PADEN, uit = [], t0 = Date.now(); let i = 0, bezig = 0;
const klaar = () => { if (uit.length < lijst.length) return; const fout = uit.filter(u => !u.ok);
  console.log('\n' + (fout.length ? 'FOUT in: ' + fout.map(u => u.t).join(', ') : 'ALLES GOED') + ' · ' + lijst.length + ' tests in ' + Math.round((Date.now() - t0) / 1000) + ' s'); process.exit(fout.length ? 1 : 0); };
const start = () => { while (bezig < n && i < lijst.length) { const t = lijst[i++], s = Date.now(); bezig++; let out = '';
  const p = spawn('node', [path.join(__dirname, t + '.js')], { timeout: 600000 }); p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  p.on('close', code => { bezig--; const regels = out.split('\n'), fouten = regels.filter(r => /^FOUT|Error|rror:/.test(r) && !/pagina-fouten \[\]/.test(r)), ok = code === 0 && !fouten.length;
    uit.push({ t, ok }); console.log((ok ? 'goed ' : 'FOUT ') + t.padEnd(22) + Math.round((Date.now() - s) / 1000) + ' s' + (ok ? '' : '\n     ' + fouten.slice(0, 4).join('\n     ').slice(0, 600))); start(); klaar(); }); } };
start();
