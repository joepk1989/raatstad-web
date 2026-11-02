#!/usr/bin/env python3
"""Nieuwe modules die niet uit SketchUp komen maar uit dezelfde bouwstenen worden gemaakt (zeshoek, halve zeshoek,
prisma, piramide). Schrijft raatstad-extra.json in twee vormen:
  vorm:    { naam: { kleur: [x, y, z, ...] } }  driehoeken in cm, zoals raatstad-vorm.json (voor 3D)
  modules: [ { naam, soort, bron, bb, boven, punten } ] zoals raatstad-modules.json (voor de kaart en Lopen)
Alles ligt in het vak van het concept: het vak loopt van (0, 0) tot (15,59, 18), midden (7,79, 9), punt boven."""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
R, AP = 9.0, 9.0 * math.sqrt(3) / 2
CX, CY = AP, 9.0
KL = {'dak': 'a0503a', 'plat': '5d6268', 'rand': '8a8f94', 'asfalt': '43484e', 'lijn': 'eeeee8', 'stoep': 'c9c3b6', 'gras': '7ab256'}

def hexp(r, k, cx=CX, cy=CY):
    a = math.radians(90 + 60 * k)   # punt boven, zoals de vakken in het concept
    return (cx + r * math.cos(a), cy + r * math.sin(a))
def hexpoly(r, cx=CX, cy=CY): return [hexp(r, k, cx, cy) for k in range(6)]
def clip(poly, nx, ny, c):
    """houdt het deel waar nx*x + ny*y >= c"""
    out = []
    for i, p in enumerate(poly):
        q = poly[(i + 1) % len(poly)]; dp = nx * p[0] + ny * p[1] - c; dq = nx * q[0] + ny * q[1] - c
        if dp >= 0: out.append(p)
        if (dp >= 0) != (dq >= 0): t = dp / (dp - dq); out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
    return out
def in_hex(poly, r=R):
    for k in range(6):
        a = math.radians(60 * k); n = (math.cos(a), math.sin(a)); poly = clip(poly, -n[0], -n[1], -(r * math.sqrt(3) / 2 + n[0] * CX + n[1] * CY))
    return poly
def rect(x0, x1, y0, y1): return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]

class Mod:
    def __init__(s, naam, soort): s.naam, s.soort, s.tri = naam, soort, {}
    def t(s, kleur, a, b, c): s.tri.setdefault(kleur, []).extend(round(v * 100) for p in (a, b, c) for v in p)
    def prisma(s, poly, zb, zt, kleur, zijkleur=None):
        """een recht blok: grondvlak poly (tegen de klok in), van zb tot zt"""
        n = len(poly)
        for i in range(1, n - 1):
            s.t(kleur, (*poly[0], zt), (*poly[i], zt), (*poly[i + 1], zt))
            s.t(kleur, (*poly[0], zb), (*poly[i + 1], zb), (*poly[i], zb))
        for i in range(n):
            a, b = poly[i], poly[(i + 1) % n]; k = zijkleur or kleur
            s.t(k, (*a, zb), (*b, zb), (*b, zt)); s.t(k, (*a, zb), (*b, zt), (*a, zt))
        return s
    def piramide(s, poly, zb, h, kleur):
        n = len(poly); cx = sum(p[0] for p in poly) / n; cy = sum(p[1] for p in poly) / n
        for i in range(n):
            a, b = poly[i], poly[(i + 1) % n]; s.t(kleur, (*a, zb), (*b, zb), (cx, cy, zb + h))
        for i in range(1, n - 1): s.t(kleur, (*poly[0], zb), (*poly[i + 1], zb), (*poly[i], zb))
        return s

mods = []
# ---------- daken: plat over een heel vak of een half vak, en een spits op een torentje ----------
def plat_dak(naam, poly):
    m = Mod(naam, 'Dak'); m.prisma(poly, 0, 0.3, KL['plat'], KL['rand'])
    # opstaande rand van 30 cm langs de buitenkant (een smalle ring van 25 cm)
    n = len(poly); cx = sum(p[0] for p in poly) / n; cy = sum(p[1] for p in poly) / n
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        ia = (a[0] + (cx - a[0]) * 0.035, a[1] + (cy - a[1]) * 0.035); ib = (b[0] + (cx - b[0]) * 0.035, b[1] + (cy - b[1]) * 0.035)
        m.prisma([a, b, ib, ia], 0.3, 0.6, KL['rand'])
    return m
# het dak dat Joep tekende (dak.skp): een zeshoek met schuine kanten en een lichtkoepel; in zijn bestand de nieuwe
# vorm van Vloer · kuil, dus het komt op de plek van de kuilen op de torens. Getekend rond x = 0, hier in het vak van het concept.
_d = json.load(open(os.path.join(HERE, 'raatstad-dak.json')))['vorm']
lk = Mod('Dak · zeshoek met lichtkoepel', 'Dak')
for kleur, v in _d.items():
    lk.tri[kleur or 'ece9e2'] = [v[i] + (779 if i % 3 == 0 else 0) for i in range(len(v))]
mods.append(lk)
mods.append(plat_dak('Dak · halve zeshoek plat', [(0.0, 0.0), (15.59, 0.0), (15.59, 9.0), (7.79, 13.5), (0.0, 9.0)]))   # past op Gebouw · halve zeshoek aan de weg

# ---------- parkeren: een vak met een rijbaan langs x (zijde 0 en 3) en aan weerszijden parkeervakken ----------
pk = Mod('Parkeren · twaalf plekken', 'Parkeren')
pk.prisma(hexpoly(R), 0, 0.1, KL['asfalt'])
for sgn in (1, -1):                                  # vakken van 2,5 m breed, 5 m diep, vanaf 3 m naast het midden
    y0, y1 = (CY + 3.0, CY + 8.0) if sgn > 0 else (CY - 8.0, CY - 3.0)
    for i in range(-3, 4):
        x = CX + i * 2.5 - 1.25
        L = in_hex(rect(x - 0.06, x + 0.06, y0, y1), R - 0.3)
        if len(L) >= 3: pk.prisma(L, 0.1, 0.11, KL['lijn'])
    L = in_hex(rect(0, 15.59, (y0 if sgn > 0 else y1) - 0.06, (y0 if sgn > 0 else y1) + 0.06), R - 0.3)
    if len(L) >= 3: pk.prisma(L, 0.1, 0.11, KL['lijn'])
mods.append(pk)
rij = Mod('Parkeren · rijbaan met stoep', 'Parkeren')   # aansluiting op de weg of de voet van de berg: rijbaan langs x, stoep erlangs
rij.prisma(hexpoly(R), 0, 0.1, KL['gras'])
rij.prisma(in_hex(rect(0, 15.59, CY - 3.0, CY + 3.0)), 0.1, 0.12, KL['asfalt'])
for y in (CY + 3.0, CY - 4.6): rij.prisma(in_hex(rect(0, 15.59, y, y + 1.6)), 0.1, 0.25, KL['stoep'])
mods.append(rij)

# ---------- wegschrijven ----------
vorm = {m.naam: m.tri for m in mods}
kaart = []
for m in mods:
    boven, punten = [], set()
    for kleur, v in m.tri.items():
        for i in range(0, len(v), 9):
            P = [(v[i + j * 3] / 100, v[i + j * 3 + 1] / 100, v[i + j * 3 + 2] / 100) for j in range(3)]
            for p in P: punten.add(p)
            ux, uy, uz = (P[1][k] - P[0][k] for k in range(3)); wx, wy, wz = (P[2][k] - P[0][k] for k in range(3))
            nz = ux * wy - uy * wx; nl = math.sqrt((uy * wz - uz * wy) ** 2 + (uz * wx - ux * wz) ** 2 + nz ** 2) or 1
            if nz / nl > 0.2: boven.append({'p': [list(p) for p in P], 'c': '#' + kleur})
    xs = [p[0] for p in punten]; ys = [p[1] for p in punten]; zs = [p[2] for p in punten]
    kaart.append({'naam': m.naam, 'soort': m.soort, 'bron': 'nieuw', 'groep': False, 'bb': [min(xs), min(ys), min(zs), max(xs), max(ys), max(zs)], 'boven': boven, 'punten': [list(p) for p in punten]})
json.dump({'vorm': vorm, 'modules': kaart}, open(os.path.join(HERE, 'raatstad-extra.json'), 'w'), ensure_ascii=False)
print(len(mods), 'extra modules:', [m.naam for m in mods], {m.naam: sum(len(v) for v in m.tri.values()) // 9 for m in mods})
