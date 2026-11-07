  // ---------- Spiraalburcht: een eigen bergfort uit de bergfort-modules (Menu → Spiraalburcht) ----------
  // Een ommuurde burcht op het zeshoekraster. Je komt op de grond binnen door een poortgebouw en een doorgang (oost), op
  // een binnenplein met een zeshoekige toren. Vanaf het plein loopt het pad langs de binnenring (ring 2) omhoog: op elk
  // recht stuk een helling van 3 m, in elke bocht een vlak bordes (overloop). Na één ronde (15 m) gaat het over een brug op
  // pijlers boven de ingang, buigt naar de buitenring (ring 3, de bovenkant van de buitenmuur) en klimt rondom verder tot
  // het poortgebouw op 33 m, recht boven de ingang (die eronder als tunnel doorloopt).
  //
  // Modules (draaiing 0, zijde k ligt in richting k·60°; draaiing r schuift zijde k naar k − r):
  //   recht pad   'Pad · twee wanden'                 zijde 3 ↔ 0 op de grond, plateau links van de looprichting
  //   helling     'Pad · helling tussen twee wanden'  laag bij zijde 3, 3 m hoger bij zijde 0
  //   bocht       'Pad · bocht binnen en buiten'      zijde 0 ↔ 4 op de grond (60° naar links, gezien vanaf zijde 0)
  //   brug/poort  'Plateau · met muurtjes'            ommuurd, eigen vloer, open bij zijde 0 en 3
  //   blok        'Plateau · 3 m'                     dicht, bovenkant 3 m; stapels eronder dragen het pad
  // Richtingen (axiaal q, r): 0 = (1, 0), 1 = (0, 1), 2 = (−1, 1), 3 = (−1, 0), 4 = (0, −1), 5 = (1, −1).
  const bergSpiraal = (() => {
    const DIR = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
    const richting = (a, b) => DIR.findIndex(([dq, dr]) => a[0] + dq === b[0] && a[1] + dr === b[1]);
    // de route: binnenring (ring 2) vanaf het plein, dan de buitenring (ring 3) tot het poortgebouw
    const ROUTE = [[1, 1], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-1, -1], [0, -2], [1, -2], [2, -2], [2, -1], [2, 0],
      [2, 1], [1, 2], [0, 3], [-1, 3], [-2, 3], [-3, 3], [-3, 2], [-3, 1], [-3, 0], [-2, -1], [-1, -2], [0, -3], [1, -3], [2, -3], [3, -3], [3, -2], [3, -1], [3, 0]];
    // rechte stukken die klimmen (de andere rechte stukken zijn vlak; bochten zijn altijd vlakke bordessen)
    const HELLING = new Set(['-1,2', '-2,1', '-1,-1', '1,-2', '2,-1', '1,2', '-1,3', '-3,2', '-2,-1', '1,-3', '3,-2']);
    const BRUG = '2,0', POORT = '3,0';   // de route gaat hier over de ingang heen
    function plan() {
      const uit = [], zet = (naam, q, r, lv, rot = 0) => uit.push({ naam, q, r, lv, rot: ((rot % 6) + 6) % 6 });
      let H = 0, din = 1;   // het pad begint op het plein (1, 0) en gaat naar (1, 1): richting 1
      ROUTE.forEach((c, i) => {
        const k = c[0] + ',' + c[1], last = i === ROUTE.length - 1, dout = last ? din : richting(c, ROUTE[i + 1]), lv = H / 3, draai = (dout - din + 6) % 6;
        if (k === POORT) {   // poortgebouw: doorgang op de grond, blokken tot de top, de top is het eindpunt
          zet('Plateau · met muurtjes', c[0], c[1], 0, 3); for (let l = 1; l < lv; l++) zet('Plateau · 3 m', c[0], c[1], l);
        } else if (k === BRUG) {   // brug: doorgang op de grond, pijlers, dek met muurtjes op de hoogte van het pad
          zet('Plateau · met muurtjes', c[0], c[1], 0, 3); for (let l = 1; l < lv; l++) zet('Pilaren · vier los', c[0], c[1], l);
          zet('Plateau · met muurtjes', c[0], c[1], lv, 6 - dout);
        } else {
          for (let l = 0; l < lv; l++) zet('Plateau · 3 m', c[0], c[1], l);   // de stapel die het pad draagt
          if (draai === 1) zet('Pad · bocht binnen en buiten', c[0], c[1], lv, 3 - din);   // bordes in de bocht
          else if (HELLING.has(k)) { zet('Pad · helling tussen twee wanden', c[0], c[1], lv, 6 - dout); H += 3; }
          else zet('Pad · twee wanden', c[0], c[1], lv, 6 - dout);
        }
        din = dout;
      });
      // de doorgang tussen poort en plein (2, 0) ligt al onder de brug; midden op het plein de toren met een dak
      zet('Toren · zeshoek 12 m', 0, 0, 0); zet('Dak · zeshoek met lichtkoepel', 0, 0, 4);
      return { plaatsingen: uit, top: H };
    }
    function stad() {
      const c = new Map(); c.inst = [];
      for (const P of plan().plaatsingen) {
        const i = SKP_RAAT.mods.findIndex(m => m.name === P.naam); if (i < 0) continue;
        const m = bergRaat.mod(i), I = { mid: m.id, m: instData(m, false), q: P.q, r: P.r, rot: P.rot };
        if (P.lv) I.lv = P.lv; c.inst.push(I);
      }
      return c;
    }
    return { plan, stad, ROUTE };
  })();
