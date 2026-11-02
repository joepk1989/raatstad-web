#!/usr/bin/env python3
"""Maakt het bergfort af, alleen met modules (zoveel mogelijk dezelfde): schrijft raatstad-berg-af.json.
  1. de berg: onder elk vak van het fort Plateau · 3 m tot op de grond, en een voet van één laag eromheen
  2. daken:   Dak · halve zeshoek plat op de twee hallen, Dak · zeshoek plat op de pilaren, Dak · zeshoek spits op de torentjes
  3. aan de voet, bij het begin van de wenteltrap: een parkeerplaats (Parkeren · twaalf plekken ×3) met een rijbaan ernaartoe
Vakken in assen van het spel (q, r); SketchUp-assen: x = x, y = -z van het spel."""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
B = json.load(open(os.path.join(HERE, 'raatstad-berg.json')))
V = json.load(open(os.path.join(HERE, 'raatstad-vorm.json'))); V.update(json.load(open(os.path.join(HERE, 'raatstad-extra.json')))['vorm'])
R, SQ3, CX, CY = 9.0, math.sqrt(3), 7.79, 9.0

def cell(x, y):
    z = -y; q = (SQ3 / 3 * x - z / 3) / R; r = (2 / 3 * z) / R; s = -q - r
    rq, rr, rs = round(q), round(r), round(s); dq, dr, ds = abs(rq - q), abs(rr - r), abs(rs - s)
    if dq > dr and dq > ds: rq = -rr - rs
    elif dr > ds: rr = -rq - rs
    return (rq, rr)
def mid(q, r): return (R * SQ3 * (q + r / 2), -(R * 1.5 * r))
def zmin(naam): v = [c for vv in V[naam].values() for c in vv[2::3]]; return min(v) / 100
def plaats(naam, q, r, z, A=None):
    """module in het vak (q, r) op hoogte z: de hoek van het vak is de oorsprong van de module"""
    x, y = mid(q, r); A = A or [1, 0, 0, 0, 1, 0, 0, 0, 1]
    tx = x - (A[0] * CX + A[3] * CY); ty = y - (A[1] * CX + A[4] * CY)
    return [naam, [A[0], A[1], A[2], 0, A[3], A[4], A[5], 0, A[6], A[7], A[8], 0, round(tx * 100), round(ty * 100), round(z * 100), 1]]

uit = [list(p) for p in B['plaatsen']]
vak, onder = {}, {}
for n, m in B['plaatsen']:
    A = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]; t = (m[12] / 100, m[13] / 100, m[14] / 100)
    c = cell(t[0] + A[0] * CX + A[3] * CY, t[1] + A[1] * CX + A[4] * CY)
    vak.setdefault(c, []).append((t[2], n, A)); onder[c] = min(onder.get(c, 99), t[2] + zmin(n))
tel = {}
def erbij(*a): p = plaats(*a); uit.append(p); tel[p[0]] = tel.get(p[0], 0) + 1

# 3. parkeerplaats aan de voet, bij het begin van de wenteltrap (het vak met de helling op hoogte 0)
start = min((c for c in vak if any(n.startswith('Pad · bocht met helling') and z == 0 for z, n, _ in vak[c])), default=(-4, -2))
rij = start[1] - 1
PARK = [(start[0] - 2, rij), (start[0] - 1, rij), (start[0], rij)]
RIJ = [(start[0] - 3, rij), (start[0] - 4, rij)]
vrij = lambda c: c not in vak
for c in PARK: assert vrij(c), c; erbij('Parkeren · twaalf plekken', *c, 0)
for c in RIJ: assert vrij(c), c; erbij('Parkeren · rijbaan met stoep', *c, 0)

# 1. de berg
for c, b in onder.items():
    z = 0.0
    while z + 2.99 < b: erbij('Plateau · 3 m', *c, z); z += 3
buren = lambda c: [(c[0] + 1, c[1]), (c[0] - 1, c[1]), (c[0], c[1] + 1), (c[0], c[1] - 1), (c[0] + 1, c[1] - 1), (c[0] - 1, c[1] + 1)]
voet = {n for c in vak for n in buren(c) if vrij(n) and n not in PARK and n not in RIJ}
voet -= {n for c in PARK + RIJ for n in buren(c)} - set()   # de parkeerplaats blijft vrij bereikbaar
voet -= set(buren(start))
for c in sorted(voet): erbij('Plateau · 3 m', *c, 0)

# 2. daken
for c, lijst in vak.items():
    for z, n, A in lijst:
        top = z + 3
        if n == 'Gebouw · halve zeshoek aan de weg':
            boven = [zz for zz, nn, _ in lijst if nn == 'Deel · wand halve zeshoek' and zz >= top - 0.01]
            erbij('Dak · halve zeshoek plat', *c, (max(boven) + 3) if boven else top, A)
        elif n == 'Vloer · kuil': erbij('Dak · zeshoek spits', *c, top)
    pil = [z for z, n, _ in lijst if n.startswith('Pilaren') or n == 'Plein · twee pilaren']
    if pil:
        hoog = max(pil) + 3
        if not any(abs(z - hoog) < 0.01 for z, n, _ in lijst): erbij('Dak · zeshoek plat', *c, hoog)

json.dump({'bestand': B['bestand'] + ' (afgemaakt)', 'plaatsen': uit}, open(os.path.join(HERE, 'raatstad-berg-af.json'), 'w'), ensure_ascii=False)
print('bergfort:', len(B['plaatsen']), '+', len(uit) - len(B['plaatsen']), '=', len(uit), 'modules; erbij:', tel, '; begin trap', start, '; voet', len(voet), 'vakken')
