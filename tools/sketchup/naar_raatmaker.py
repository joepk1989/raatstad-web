#!/usr/bin/env python3
"""Zet de SketchUp-onderdelen van het bergfort om naar Raatmaker-modules (module v2, zie src/js/08c-modules-v2.js):
vloeren (driehoeken op het fijne raster, n = 8: zijde 1,125 m), muren (op de ribben, zes richtingen), lage muurtjes
(hek), zuilen (voorwerp), hellingen (rechte trap/helling, ook haaks op de zijden: richting 6-11) en daken.
De rots blijft een SketchUp-vorm (de Raatmaker kent geen schuine rotswand).

Per onderdeel één module in zijn eigen vak (draaiing 0); een plaatsing in het fort wordt [module, q, r, z, draaiing].
Een plaatsing die niet precies op het midden van een vak staat (halve stukken) of gespiegeld is, wordt apart
'ingebakken' in het vak waar hij het meest in ligt, met draaiing 0.

Schrijft src/js/08o-bergfort-raatmaker.js: const SKP_RAAT = { mods: [module v2 …], fort: [[mod, q, r, z, rot] …] }
met q, r de vakken van bergfort_af.py (raatstad-berg-af.json) en z de hoogte van de onderkant (m)."""
import json, math, os, collections
import numpy as np
from matplotlib.path import Path
HERE = os.path.dirname(os.path.abspath(__file__))
import grid_check as G

R, SQ3, N = 9.0, math.sqrt(3), 8
TS = R / N
LH = 3.0
CX, CY = 7.79, 9.0
DIRW = [(1, 0), (0, 1), (-1, 1), (2, -1), (1, 1), (-1, 2)]
DIR12 = [(1, 0), (0, 1), (-1, 1), (-1, 0), (0, -1), (1, -1), (2, -1), (1, 1), (-1, 2), (-2, 1), (-1, -1), (1, -2)]
P = lambda i, j: (i * TS * SQ3 / 2, i * TS / 2 + j * TS)            # rasterpunt in module-coördinaten (x, z) van three
def tri_verts(i, j, t):
    A, B, C, D = P(i, j), P(i + 1, j), P(i, j + 1), P(i + 1, j + 1)
    return (B, D, C) if t else (A, B, C)
def v_at(x, z):
    fi = x / (TS * SQ3 / 2); fj = z / TS - fi / 2; return (round(fi), round(fj))
def in_hex(x, z, rad=R - 0.01):
    for s in range(6):
        a = -s * math.pi / 3
        if x * math.cos(a) + z * math.sin(a) > rad * SQ3 / 2 + 1e-6: return False
    return True
TRIS = [(i, j, t) for i in range(-12, 13) for j in range(-24, 25) for t in (0, 1)
        if in_hex(*np.mean(tri_verts(i, j, t), 0))]
CENT = np.array([np.mean(tri_verts(i, j, t), 0) for i, j, t in TRIS])           # (x, z) per driehoek

KLEUR_VLOER = {'43484e': 'asphalt', '7ab256': 'grass', '6f9a4a': 'grass', '7fa957': 'grass', 'c9c3b6': 'tile', 'ece9e2': 'roof', '5d6268': 'roof', '8a8f94': 'roof', '468cbe': 'water'}
def vloer_mat(kl): return KLEUR_VLOER.get((kl or '').lower(), 'stonetile')

V = json.load(open(os.path.join(HERE, 'raatstad-vorm.json'))); V.update(json.load(open(os.path.join(HERE, 'raatstad-extra.json')))['vorm'])

def driehoeken(naam, M):
    """alle driehoeken van een module (in meters), na matrix M (4×4, rijen) en met kleur"""
    out = []
    for kl, v in V[naam].items():
        T = np.array(v, float).reshape(-1, 3, 3) / 100
        T = T @ M[:3, :3].T + M[:3, 3]
        for t in T: out.append((t, kl))
    return out

def omzetten(naam, M, sp):
    """module v2 uit de driehoeken (lokale SketchUp-meters: midden van het vak in (0, 0), z omhoog); sp: gespiegeld"""
    tris = driehoeken(naam, M)
    T = np.array([t for t, _ in tris]); K = [k for _, k in tris]
    N_ = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]) * (-1 if sp else 1); L = np.linalg.norm(N_, axis=1) + 1e-12
    zmax = T[:, :, 2].max()
    nlv = int(round(zmax / LH)) + 1
    lv = [{'f': {}, 'w': {}, 's': [], 'r': {}, 'o': []} for _ in range(nlv)]
    # SketchUp (x, y) → module (x, z) van three: z = −y
    XZ = lambda p: (p[0], -p[1])
    # 1. per driehoek van het raster: welke vlakken liggen erboven/eronder (alleen niet-verticale vlakken)
    nv = np.abs(N_[:, 2]) > 0.05 * L
    paths = [(Path([XZ(p) for p in t[:, :2]]), t, n, k) for t, n, k, ok in zip(T, N_, K, nv) if ok]
    for ti, (key3, (cx, cz)) in enumerate(zip(TRIS, CENT)):
        hits = []
        for pth, t, n, k in paths:
            if not pth.contains_point((cx, cz)): continue
            # hoogte van het vlak in dit punt
            a = t[0]; zz = a[2] - (n[0] * (cx - a[0]) + n[1] * (-cz - a[1])) / n[2]
            hits.append((zz, n[2] > 0, math.hypot(n[0], n[1]) / abs(n[2]), k))
        hits.sort()
        for zz, op, helling, k in hits:
            if not op or helling > 0.2: continue
            Lv = int(round(zz / LH))
            if abs(zz - Lv * LH) > 0.45 or Lv >= nlv: continue
            boven = [(z2, o2) for z2, o2, _, _ in hits if z2 > zz + 0.08]
            if boven:
                z2, o2 = min(boven)
                if o2 or z2 < zz + 2.0: continue                     # binnen in een blok, of te laag plafond
            lv[Lv]['f']['%d,%d,%d' % key3] = vloer_mat(k)
    # 2. muren: doorsneden van de verticale vlakken op 0,6 m (laag muurtje) en 2,2 m (hele muur) boven elke verdieping
    vert = [(t, k) for t, n, l, k in zip(T, N_, L, K) if abs(n[2]) < 0.3 * l]
    def doorsnede(h):
        seg = []
        for t, k in vert:
            pts = []
            for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                if (a[2] - h) * (b[2] - h) < 0 or (a[2] == h and b[2] != h):
                    f = (h - a[2]) / (b[2] - a[2]) if b[2] != a[2] else 0; pts.append(XZ(a[:2] + (b[:2] - a[:2]) * f))
            if len(pts) >= 2 and math.dist(pts[0], pts[1]) > 0.05: seg.append((np.array(pts[0]), np.array(pts[1])))
        return seg
    RIBBEN = []
    for i in range(-14, 15):
        for j in range(-26, 27):
            for d, (di, dj) in enumerate(DIRW):
                a, b = np.array(P(i, j)), np.array(P(i + di, j + dj)); m = (a + b) / 2
                if in_hex(*m, R + 0.15): RIBBEN.append(('%d,%d,%d' % (i, j, d), a, b))
    def raakt(seg, a, b):
        e = b - a; le = np.linalg.norm(e); u = e / le
        for p, q in seg:
            s = q - p; ls = np.linalg.norm(s)
            if ls < 0.2 or abs(np.dot(s / ls, u)) < 0.96: continue
            # afstand van de rib tot de lijn van het stuk, en overlap langs de rib
            nrm = np.array([-u[1], u[0]])
            if abs(np.dot(p - a, nrm)) > 0.32: continue
            t0, t1 = sorted((np.dot(p - a, u), np.dot(q - a, u)))
            if min(t1, le) - max(t0, 0) > 0.5 * le: return True
        return False
    def zuilen(seg):
        """kleine gesloten doorsneden (zuilen): midden en grootte; de stukken die erbij horen tellen niet als muur"""
        groep = list(range(len(seg))); vind = lambda x: x if groep[x] == x else vind(groep[x])
        for x in range(len(seg)):
            for y in range(x + 1, len(seg)):
                if min(np.linalg.norm(seg[x][a] - seg[y][b]) for a in (0, 1) for b in (0, 1)) < 0.05: groep[vind(x)] = vind(y)
        G_ = collections.defaultdict(list)
        for x in range(len(seg)): G_[vind(x)].append(x)
        uit, weg = [], set()
        for g in G_.values():
            pts = np.array([p for x in g for p in seg[x]]); ext = pts.max(0) - pts.min(0)
            if max(ext) < 1.6 and len(g) >= 3: uit.append(pts.mean(0)); weg |= set(g)
        return uit, [s for x, s in enumerate(seg) if x not in weg]
    for Lv in range(nlv):
        hoog, laag = doorsnede(Lv * LH + 2.2), doorsnede(Lv * LH + 0.6)
        zl, hoog = zuilen(hoog); _, laag = zuilen(laag)
        for c in zl: lv[Lv]['o'].append({'t': 'pillar', 'x': round(float(c[0]), 3), 'z': round(float(c[1]), 3), 'rot': 0})
        for key, a, b in RIBBEN:
            if raakt(hoog, a, b): lv[Lv]['w'][key] = {'m': 'stone', 'o': ''}
            elif raakt(laag, a, b): lv[Lv]['w'][key] = {'m': 'fence', 'o': ''}
    # 3. hellingen: schuine beloopbare vlakken per verdieping → één rechte helling van het lage naar het hoge eind
    schuin = [(t, n) for t, n, l in zip(T, N_, L) if n[2] > 0 and 0.05 < math.hypot(n[0], n[1]) / n[2] <= 0.6]
    per = collections.defaultdict(list)
    for t, n in schuin:
        per[int(math.floor(t[:, 2].mean() / LH))].append(t)
    for Lv, ts_ in per.items():
        if Lv >= nlv: continue
        pts = np.concatenate(ts_); z0, z1 = pts[:, 2].min(), pts[:, 2].max()
        if z1 - z0 < 1.0: continue
        lo = pts[pts[:, 2] < z0 + 0.35]; hi = pts[pts[:, 2] > z1 - 0.35]
        A, B = np.array(XZ(lo[:, :2].mean(0))), np.array(XZ(hi[:, :2].mean(0)))
        dvec = B - A; ln = np.linalg.norm(dvec)
        if ln < 1.0: continue
        hoek = math.degrees(math.atan2(dvec[1], dvec[0])) % 360
        d = min(range(12), key=lambda k: abs(((math.degrees(math.atan2(*reversed(P(*DIR12[k])))) % 360) - hoek + 180) % 360 - 180))
        u = dvec / ln; nrm = np.array([-u[1], u[0]]); xz = np.array([XZ(p) for p in pts[:, :2]])
        breed = float(np.ptp(xz @ nrm)); breed = min(4.5, max(1.2, breed))
        lv[Lv]['s'].append({'a': list(v_at(*A)), 'd': d, 'n': max(2, round(ln / TS)), 'w': round(breed, 2), 'k': 'ramp'})
    # 4. daken: een Dak-module is een schilddak op de onderste verdieping
    if naam.startswith('Dak'):
        # een dak is in de Raatmaker een vloer van dakbedekking op de verdieping waar hij op ligt (bij de lichtkoepel een
        # glazen zeshoek in het midden); de vorm van de koepel zelf kan de Raatmaker niet
        f = {}
        for key3, (cx, cz) in zip(TRIS, CENT):
            if any(pth.contains_point((cx, cz)) and n[2] > 0 for pth, t, n, k in paths):
                f['%d,%d,%d' % key3] = 'glass' if ('koepel' in naam and in_hex(cx, cz, 2.3)) else 'roof'
        lv = [{'f': f, 'w': {}, 's': [], 'r': {}, 'o': []}]
    while len(lv) > 1 and not any(lv[-1][k] for k in ('f', 'w', 's', 'r', 'o')): lv.pop()
    return lv

SOORT = lambda n: 'Verbindingen' if n.startswith('Pad') else 'Pleinen' if n.startswith(('Plein', 'Plateau')) else 'Vervoer' if n.startswith('Parkeren') else 'Bouwdelen'

if __name__ == '__main__':
    J = json.load(open(os.path.join(HERE, 'raatstad-berg-af.json'))); PL = J['plaatsen']
    mods, idx, fort = [], {}, []
    def module(sleutel, naam, M, sp):
        if sleutel in idx: return idx[sleutel]
        lvs = omzetten(naam, M, sp)
        mods.append({'v': 2, 'name': sleutel, 'cat': SOORT(naam), 'k': 0, 'n': N, 'lv': lvs, 'edges': [], 'cells': [], 'tris': [], 'paths': [], 'bron': 'bergfort'})
        idx[sleutel] = len(mods) - 1; return idx[sleutel]
    for naam, m in PL:
        if naam.startswith('Rots'): continue
        T, A = G.wereld(naam, m)
        sp = np.linalg.det(A) < 0
        fx = m[12] / 100 + m[0] * CX + m[4] * CY; fy = m[13] / 100 + m[1] * CX + m[5] * CY
        z0 = round(float(T[:, :, 2].min()) * 2) / 2
        # het vak waar hij het meest in ligt: het midden van zijn grondvlak (vlakke stukken)
        c = G.cell(*T.reshape(-1, 3)[:, :2].mean(0)); mx, my = G.mid(*c)
        if not sp and math.hypot(fx - mx, fy - my) < 0.05:
            k = round(math.degrees(math.atan2(m[1], m[0])) / 60) % 6
            zmin = min(min(v[2::3]) for v in V[naam].values()) / 100
            M = np.eye(4); M[:3, 3] = [-CX, -CY, -zmin]   # eigen vorm, midden van het vak in (0, 0), onderkant op 0
            fort.append([module(naam, naam, M, False), c[0], c[1], z0, k])
        else:
            M = np.eye(4); M[:3, :3] = A; M[:3, 3] = [m[12] / 100 - mx, m[13] / 100 - my, m[14] / 100 - z0]
            k = round(math.degrees(math.atan2(m[1], m[0])) / 60) % 6
            fort.append([module(f'{naam} · {k * 60}°' + (' gespiegeld' if sp else '') + (' · verschoven' if math.hypot(fx - mx, fy - my) > 0.05 else ''), naam, M, sp), c[0], c[1], z0, 0])
    out = os.path.join(HERE, '..', '..', 'src', 'js', '08o-bergfort-raatmaker.js')
    with open(out, 'w') as fh:
        fh.write('  // ---------- Bergfort als Raatmaker-modules (gemaakt door tools/sketchup/naar_raatmaker.py uit de SketchUp-onderdelen) ----------\n')
        fh.write('  // mods: module v2 per onderdeel; fort: [module, q, r, hoogte onderkant (m), draaiing] met q, r de vakken van het bergfort.\n')
        import hashlib
        data = json.dumps({'mods': mods, 'fort': fort}, ensure_ascii=False, separators=(',', ':'))
        versie = hashlib.sha1(data.encode()).hexdigest()[:10]
        fh.write('  const SKP_RAAT = ' + data[:-1] + ',"versie":"' + versie + '"};\n')
    st = collections.Counter(len(m['lv']) for m in mods)
    print(len(mods), 'modules,', len(fort), 'plaatsingen,', os.path.getsize(out), 'bytes; verdiepingen', dict(st))
    for m in mods: print('  ', m['name'], '|', ' / '.join(f"v{len(L['f'])} m{len(L['w'])} s{len(L['s'])} o{len(L['o'])}" for L in m['lv']))
