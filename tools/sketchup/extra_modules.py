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

# ---------- rots: lagen van 3 m die naadloos op elkaar en naast elkaar aansluiten ----------
# De randen boven en onder zijn de rechte zeshoek, de hoeken staan vast: zo past elke laag op elke andere, in elke stand
# (zes draaiingen, gespiegeld). Alleen binnen in een zijvlak wijken de punten naar binnen af (nooit naar buiten, dus nooit
# in het buurvak): facetten van driehoeken, in drie tinten steen.
STEEN = ['8c857a', '7b756b', '9a9387']; GRAS = '6f9a4a'; GRAS2 = '7fa957'
import random
def rots_zijkanten(m, rnd):
    """zijwanden die bijna loodrecht staan: verticale ribben (per kolom een vaste diepte, hooguit 30 cm naar binnen, en
    een tint per kolom), zodat gestapelde lagen één steile wand vormen zonder horizontale banden"""
    hoek = [hexp(R, k) for k in range(6)]
    T = [i / 6 for i in range(7)]; Z = [0, 1.0, 2.0, 3.0]
    for k in range(6):
        a, b = hoek[k], hoek[(k + 1) % 6]
        ex, ey = b[0] - a[0], b[1] - a[1]; L = math.hypot(ex, ey); nx, ny = ey / L, -ex / L          # naar buiten
        diep = [0] + [rnd.uniform(0.05, 0.3) for _ in range(5)] + [0]; tint = [rnd.choice(STEEN) for _ in range(6)]
        P = {}
        for i, t in enumerate(T):
            for j, z in enumerate(Z):
                x, y = a[0] + ex * t, a[1] + ey * t
                if 0 < i < 6 and 0 < j < 3: d = diep[i] + rnd.uniform(0, 0.08); x -= nx * d; y -= ny * d
                P[i, j] = (x, y, z)
        for i in range(6):
            for j in range(3):
                p00, p10, p11, p01 = P[i, j], P[i + 1, j], P[i + 1, j + 1], P[i, j + 1]
                m.t(tint[i], p00, p10, p11); m.t(tint[i], p00, p11, p01)
def rots_bodem(m):
    h = [hexp(R, k) for k in range(6)]
    for i in range(1, 5): m.t(STEEN[1], (*h[0], 0), (*h[i + 1], 0), (*h[i], 0))
def keitje(m, rnd, cx, cy, z, r, hgt):
    """een rotsblok: een scheve zeshoekige knobbel van driehoeken"""
    n = 6; ring = [(cx + r * rnd.uniform(0.75, 1.0) * math.cos(math.radians(60 * i + 30)), cy + r * rnd.uniform(0.75, 1.0) * math.sin(math.radians(60 * i + 30))) for i in range(n)]
    mid = [(cx + (x - cx) * 0.55, cy + (y - cy) * 0.55, z + hgt * rnd.uniform(0.6, 0.85)) for x, y in ring]
    top = (cx + rnd.uniform(-0.2, 0.2) * r, cy + rnd.uniform(-0.2, 0.2) * r, z + hgt)
    for i in range(n):
        a, b = ring[i], ring[(i + 1) % n]; ma, mb = mid[i], mid[(i + 1) % n]
        m.t(rnd.choice(STEEN), (*a, z - 0.2), (*b, z - 0.2), mb); m.t(rnd.choice(STEEN), (*a, z - 0.2), mb, ma)
        m.t(rnd.choice(STEEN), ma, mb, top)
rw = Mod('Rots · wand', 'Rots'); rnd = random.Random(7)
rots_zijkanten(rw, rnd); rots_bodem(rw)
h = [hexp(R, k) for k in range(6)]
for i in range(1, 5): rw.t(STEEN[2], (*h[0], 3), (*h[i], 3), (*h[i + 1], 3))
mods.append(rw)
# de bovenste laag: gras met een paar rotsblokken, de rand blijft op 3 m (sluit aan op een plateau of een pad ernaast)
rt = Mod('Rots · top', 'Rots'); rnd = random.Random(11)
rots_zijkanten(rt, rnd); rots_bodem(rt)
binnen = [(CX + 5.2 * math.cos(math.radians(90 + 60 * k + 30)), CY + 5.2 * math.sin(math.radians(90 + 60 * k + 30)), 3 + rnd.uniform(0.1, 0.4)) for k in range(6)]
top = (CX, CY, 3.45)
for k in range(6):
    a, b = (*h[k], 3), (*h[(k + 1) % 6], 3); ba, bb = binnen[(k - 1) % 6], binnen[k]
    rt.t(GRAS, a, b, bb); rt.t(GRAS2, a, bb, ba); rt.t(GRAS if k % 2 else GRAS2, ba, bb, top)
for cx, cy, r, hg in [(CX + 3.2, CY + 1.6, 1.5, 1.6), (CX - 2.6, CY - 2.4, 1.1, 1.1), (CX + 0.4, CY - 4.4, 0.8, 0.7)]: keitje(rt, rnd, cx, cy, 3.25, r, hg)
mods.append(rt)

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
