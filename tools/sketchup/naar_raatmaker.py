#!/usr/bin/env python3
"""Zet de SketchUp-onderdelen van het bergfort om naar Raatmaker-modules (module v2, zie src/js/08c-modules-v2.js):
vloeren (driehoeken op het fijne raster, n = 8: zijde 1,125 m), muren (op de ribben, zes richtingen), lage muurtjes
(hek), zuilen (voorwerp), hellingen en bordessen (vrije vlakken, 'plaat') en daken.
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

R, SQ3, N = 9.0, math.sqrt(3), int(os.environ.get('RASTER_N', 8))
SNAP = float(os.environ.get('SNAP', 0.3))   # m: hoekpunten binnen deze afstand van een rasterpunt worden erop gezet (lijnen snappen), zodat muur en vloerrand samenvallen
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

KLEUR_VLOER = {'43484e': 'asphalt', '7ab256': 'grass', '6f9a4a': 'grass', '7fa957': 'grass', 'c9c3b6': 'tile', 'ece9e2': 'pannen', '5d6268': 'pannen', '8a8f94': 'pannen', '468cbe': 'water'}
def vloer_mat(kl, naam=''):
    """de vloer (Italiaans bergdorp): uit de kleur in SketchUp; het witte concept wordt oude keien, pleinen natuursteen zeshoeken"""
    return KLEUR_VLOER.get((kl or '').lower(), 'hexsteen' if naam.startswith('Plein') else 'hexkei')

V = json.load(open(os.path.join(HERE, 'raatstad-vorm.json'))); V.update(json.load(open(os.path.join(HERE, 'raatstad-extra.json')))['vorm'])

def driehoeken(naam, M):
    """alle driehoeken van een module (in meters), na matrix M (4×4, rijen) en met kleur"""
    out = []
    for kl, v in V[naam].items():
        T = np.array(v, float).reshape(-1, 3, 3) / 100
        T = T @ M[:3, :3].T + M[:3, 3]
        if SNAP > 0:   # hoekpunten die dicht bij een punt van het fijne raster liggen, daarheen trekken (lijnen snappen)
            x, z = T[:, :, 0], -T[:, :, 1]
            fi = x / (TS * SQ3 / 2); fj = z / TS - fi / 2; ri, rj = np.round(fi), np.round(fj)
            sx = ri * TS * SQ3 / 2; sz = ri * TS / 2 + rj * TS; d = np.hypot(sx - x, sz - z)
            ok = (d < SNAP) & (np.abs(T[:, :, 2] - np.round(T[:, :, 2] / LH) * LH) < 0.05)   # alleen op vloerhoogte: een helling blijft vlak
            T[:, :, 0] = np.where(ok, sx, x); T[:, :, 1] = np.where(ok, -sz, T[:, :, 1])
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
    def vloer_in(cx, cz):
        """de vloeren in punt (cx, cz): {verdieping: kleur}"""
        hits = []
        for pth, t, n, k in paths:
            if not pth.contains_point((cx, cz)): continue
            a = t[0]; zz = a[2] - (n[0] * (cx - a[0]) + n[1] * (-cz - a[1])) / n[2]   # hoogte van het vlak in dit punt
            hits.append((zz, n[2] > 0, math.hypot(n[0], n[1]) / abs(n[2]), k))
        hits.sort(); uit = {}
        for zz, op, helling, k in hits:
            if not op or helling > 0.2: continue
            Lv = int(round(zz / LH))
            if abs(zz - Lv * LH) > 0.45 or Lv >= nlv: continue
            boven = [(z2, o2) for z2, o2, _, _ in hits if z2 > zz + 0.08]
            if boven:
                z2, o2 = min(boven)
                if o2 or z2 < zz + 2.0: continue                     # binnen in een blok, of te laag plafond
            uit[Lv] = k
        return uit
    # het precieze vloervlak per verdieping (voor driehoeken die maar half vloer zijn): alle vlakke bovenkanten op die hoogte
    from shapely.geometry import Polygon as SPoly
    from shapely.ops import unary_union, triangulate
    vlak = collections.defaultdict(list)
    for t, n, l in zip(T, N_, L):
        if n[2] <= 0 or math.hypot(n[0], n[1]) / n[2] > 0.2: continue
        zz = t[:, 2].mean(); Lv = int(round(zz / LH))
        if abs(zz - Lv * LH) > 0.45 or Lv >= nlv: continue
        pg = SPoly([XZ(p) for p in t[:, :2]])
        if pg.area > 1e-4: vlak[Lv].append(pg)
    vlak = {Lv: unary_union(v).buffer(0) for Lv, v in vlak.items()}
    for key3, (cx, cz) in zip(TRIS, CENT):
        V3 = np.array(tri_verts(*key3)); c = V3.mean(0)
        proef = [c] + [c + (v - c) * 0.85 for v in V3] + [c + ((V3[a] + V3[b]) / 2 - c) * 0.9 for a, b in ((0, 1), (1, 2), (2, 0))]
        tel = collections.defaultdict(list)
        for q in proef:
            for Lv, k in vloer_in(*q).items(): tel[Lv].append(k)
        for Lv, ks in tel.items():
            key = '%d,%d,%d' % key3; mat = vloer_mat(collections.Counter(ks).most_common(1)[0][0], naam)
            if len(ks) == len(proef): lv[Lv]['f'][key] = mat; continue
            # half vloer: de driehoek afknippen op de rand van het vloervlak (rechte knip, ook dwars door de driehoek)
            reg = vlak.get(Lv)
            if reg is None: continue
            tri = SPoly(V3); inter = tri.intersection(reg)
            if inter.is_empty or inter.area < 0.04 * tri.area: continue
            if inter.area > 0.97 * tri.area: lv[Lv]['f'][key] = mat; continue
            if inter.geom_type != 'Polygon': inter = max(getattr(inter, 'geoms', [inter]), key=lambda g: g.area)
            if inter.geom_type != 'Polygon' or inter.area < 0.04 * tri.area: continue
            ic = np.array(inter.centroid.coords[0]); knip = []
            pts = np.array(inter.exterior.coords)[:-1]
            for a_, b_ in zip(pts, np.roll(pts, -1, 0)):
                m_ = (a_ + b_) / 2
                if tri.exterior.distance(SPoly([m_, m_ + 1e-6, m_ + [0, 1e-6]]).centroid) < 1e-3: continue   # ligt op de rand van de driehoek zelf
                e = b_ - a_; le = np.hypot(*e)
                if le < 0.02: continue
                nx, nz = -e[1] / le, e[0] / le
                if (ic - a_) @ (nx, nz) < 0: nx, nz = -nx, -nz
                knip.append([round(float(nx), 4), round(float(nz), 4), round(float(nx * a_[0] + nz * a_[1]), 4)])
            if not knip: continue
            lv[Lv]['f'][key] = mat; lv[Lv].setdefault('fk', {})[key] = knip[0] if len(knip) == 1 else knip
    # 2. muren: doorsneden van de verticale vlakken op 0,6 m (laag muurtje) en 2,2 m (hele muur) boven elke verdieping
    vert = [(t, k) for t, n, l, k in zip(T, N_, L, K) if abs(n[2]) < 0.3 * l]
    HZ = {}                                                                       # hoogte (onder, boven) van het vlak achter elk stuk doorsnede
    def doorsnede(h):
        seg = []
        for t, k in vert:
            pts = []
            for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                if (a[2] - h) * (b[2] - h) < 0 or (a[2] == h and b[2] != h):
                    f = (h - a[2]) / (b[2] - a[2]) if b[2] != a[2] else 0; pts.append(XZ(a[:2] + (b[:2] - a[:2]) * f))
            if len(pts) >= 2 and math.dist(pts[0], pts[1]) > 0.05: seg.append((np.array(pts[0]), np.array(pts[1]))); HZ[id(seg[-1])] = (float(t[:, 2].min()), float(t[:, 2].max()))
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
        # stukken die niet langs een van de zes rasterrichtingen lopen (een schuine kant van een blok): een vrije wand, precies
        # waar hij in SketchUp staat ('plaat' met muur: 1), en geen gestippelde rij muurtjes op de ribben ernaast
        RICHT = [np.array(P(*d)) / np.linalg.norm(P(*d)) for d in DIRW]
        def op_raster(sg):
            """ligt dit stuk op een ribbe van het fijne raster (richting en plaats); anders wordt het een vrije wand"""
            e = (sg[1] - sg[0]) / np.linalg.norm(sg[1] - sg[0]); u = max(RICHT, key=lambda u: abs(float(np.dot(e, u))))
            if abs(float(np.dot(e, u))) < 0.995: return False
            n_ = np.array([-u[1], u[0]]); h = TS * SQ3 / 2; o = float(np.dot((sg[0] + sg[1]) / 2, n_)) / h
            return abs(o - round(o)) * h < 0.1
        vrij = [sg for sg in hoog if not op_raster(sg)]; hoog = [sg for sg in hoog if op_raster(sg)]
        groepen = []                                                              # aaneensluitende stukken op één lijn samenvoegen
        for sg in vrij:
            z0_, z1_ = HZ[id(sg)]; yb, yt = max(z0_, Lv * LH) - Lv * LH, min(z1_, (Lv + 1) * LH + 1.2) - Lv * LH
            u = (sg[1] - sg[0]) / np.linalg.norm(sg[1] - sg[0]); nrm = np.array([-u[1], u[0]])
            for G_ in groepen:
                if abs(abs(np.dot(u, G_['u'])) - 1) < 2e-3 and abs(np.dot(sg[0] - G_['a'], G_['n'])) < 0.05 and abs(G_['yb'] - yb) < 0.1 and abs(G_['yt'] - yt) < 0.1:
                    G_['t'] += [float(np.dot(sg[0] - G_['a'], G_['u'])), float(np.dot(sg[1] - G_['a'], G_['u']))]; break
            else: groepen.append({'a': sg[0], 'u': u, 'n': nrm, 'yb': yb, 'yt': yt, 't': [0.0, float(np.dot(sg[1] - sg[0], u))]})
        runs = []
        for G_ in groepen:                                                        # alleen stukken die elkaar raken: twee zuilen op één lijn blijven twee wanden
            iv = sorted((min(G_['t'][k], G_['t'][k + 1]), max(G_['t'][k], G_['t'][k + 1])) for k in range(0, len(G_['t']), 2)); cur = list(iv[0])
            for a_, b_ in iv[1:]:
                if a_ <= cur[1] + 0.05: cur[1] = max(cur[1], b_)
                else: runs.append((G_, cur)); cur = [a_, b_]
            runs.append((G_, cur))
        for G_, (t0, t1) in runs:
            if t1 - t0 < 0.3 or G_['yt'] - G_['yb'] < 0.5: continue
            A_, B_ = G_['a'] + G_['u'] * t0, G_['a'] + G_['u'] * t1; r3 = lambda v: round(float(v), 3)
            # rand van een hoger vlak boven een geul of helling: de wand loopt 0,9 m door als borstwering (geen hek erop)
            boven = vlak.get(Lv + 1)
            if boven is not None and abs(G_['yt'] - LH) < 0.15:
                from shapely.geometry import Point as SPt
                mid_ = (A_ + B_) / 2; kant = [boven.buffer(0.05).contains(SPt(*(mid_ + G_['n'] * z_))) for z_ in (0.5, -0.5)]
                if kant[0] != kant[1]:
                    q_ = mid_ + G_['n'] * (0.5 if kant[1] else -0.5)               # de lage kant: ligt daar een vlak (geul, helling) in deze module?
                    laag = any(n[2] > 0 and pth.contains_point(tuple(q_)) and t[:, 2].max() < (Lv + 1) * LH - 0.5 for pth, t, n, k in paths)
                    if laag: G_['yt'] = LH + 0.9
            lv[Lv]['s'].append({'k': 'plaat', 'muur': 1, 'a': list(v_at(*((A_ + B_) / 2))), 'd': 0, 'n': 1, 'w': 0.3, 'm': 'breuksteen',
                                'p': [[[r3(A_[0]), r3(A_[1]), r3(G_['yb'])], [r3(B_[0]), r3(B_[1]), r3(G_['yb'])], [r3(B_[0]), r3(B_[1]), r3(G_['yt'])], [r3(A_[0]), r3(A_[1]), r3(G_['yt'])]]]})
        for key, a, b in RIBBEN:
            if raakt(hoog, a, b): lv[Lv]['w'][key] = {'m': 'oker' if naam.startswith(('Gebouw', 'Deel')) else 'breuksteen', 'o': ''}
            # lage muurtjes worden niet omgezet: langs elke rand waar je kunt vallen zet het spel zelf een lage, schuine muur (rand: muurtje)
    # 2b. zuilen: een klein los stuk vloer boven op een dichte zuil (rondom wanden tot de verdieping eronder) is geen vloer
    #     maar de bovenkant van die zuil: één blok ('plaat' op volle hoogte, zijkanten breuksteen), zonder muren eromheen
    for Lv in range(1, nlv):
        reg = vlak.get(Lv)
        if reg is None: continue
        rand = doorsnede((Lv - 1) * LH + 1.5)
        for g in getattr(reg, 'geoms', [reg]):
            if g.geom_type != 'Polygon' or g.area > 14 or g.area < 0.2: continue
            gs = g.simplify(0.03); omtrek = gs.exterior
            # hoeveel van de omtrek heeft een wand eronder (binnen 0,15 m)
            from shapely.geometry import LineString as SL
            wand = unary_union([SL([tuple(p), tuple(q)]) for p, q in rand]).buffer(0.15) if rand else None
            dek = omtrek.intersection(wand).length / omtrek.length if wand is not None else 0
            if os.environ.get("ZUIL_DEBUG"): print("zuil?", naam, Lv, round(g.area, 2), round(dek, 2))
            if dek < 0.7: continue
            pg = gs.buffer(0.05)
            for key in [k for k in lv[Lv]['f'] if SPoly(tri_verts(*map(int, k.split(',')))).intersection(pg).area > 0.02]:
                del lv[Lv]['f'][key]; lv[Lv].get('fk', {}).pop(key, None)
            pw = gs.buffer(0.35)
            for key in [k for k in lv[Lv - 1]['w'] if pw.contains(SPoly([P(*map(int, k.split(',')[:2])), P(*map(int, k.split(',')[:2])), P(int(k.split(',')[0]) + DIRW[int(k.split(',')[2])][0], int(k.split(',')[1]) + DIRW[int(k.split(',')[2])][1])]).centroid)]:
                del lv[Lv - 1]['w'][key]
            lv[Lv - 1]['s'] = [S for S in lv[Lv - 1]['s'] if not (S.get('muur') and pw.contains(SPoly([p[:2] for p in S['p'][0][:2]] + [[S['p'][0][0][0] + 1e-3, S['p'][0][0][1]]]).centroid))]
            stukken = [gs] if gs.convex_hull.area < gs.area * 1.01 else [tr for tr in triangulate(gs) if tr.area > 1e-3 and gs.contains(tr.representative_point())]
            mx = np.array(gs.centroid.coords[0])
            lv[Lv - 1]['s'].append({'k': 'plaat', 'a': list(v_at(*mx)), 'd': 0, 'n': 1, 'w': 2, 'zuil': 1, 'm': vloer_mat(None, naam),
                                    'p': [[[round(x_, 3), round(z_, 3), LH] for x_, z_ in list(st.exterior.coords)[:-1]] for st in stukken]})
    # 2c. zuilen zonder bovenvlak (in SketchUp open van boven): een kleine ruimte die rondom dicht is met wanden
    from shapely.geometry import LineString as SL2, Polygon as SP3
    for Lv in range(nlv):
        seg = doorsnede(Lv * LH + 1.5)
        if not seg: continue
        vol = unary_union([SL2([tuple(p), tuple(q)]) for p, q in seg]).buffer(0.06)
        al = [SP3([p[:2] for p in S['p'][0]]) for S in lv[Lv]['s'] if S.get('zuil')]
        for g in getattr(vol, 'geoms', [vol]):
            for ring in g.interiors:
                gat = SP3(ring).buffer(0.06).simplify(0.03)
                if not (0.5 < gat.area < 14) or any(gat.intersects(a) for a in al): continue
                if vlak.get(Lv + 1) is not None and vlak[Lv + 1].intersection(gat).area > 0.3 * gat.area: continue
                hz = [HZ[id(sg)][1] for sg in seg if gat.buffer(0.2).contains(SP3([tuple(sg[0]), tuple(sg[1]), tuple(sg[0] + 1e-3)]).centroid)]
                top = min(LH, max(hz) - Lv * LH) if hz else LH
                pw = gat.buffer(0.35)
                for key in [k for k in lv[Lv]['w'] if pw.contains(SP3([P(*map(int, k.split(',')[:2])), P(*map(int, k.split(',')[:2])), P(int(k.split(',')[0]) + DIRW[int(k.split(',')[2])][0], int(k.split(',')[1]) + DIRW[int(k.split(',')[2])][1])]).centroid)]:
                    del lv[Lv]['w'][key]
                lv[Lv]['s'] = [S for S in lv[Lv]['s'] if not (S.get('muur') and pw.contains(SP3([p[:2] for p in S['p'][0][:2]] + [[S['p'][0][0][0] + 1e-3, S['p'][0][0][1]]]).centroid))]
                st_ = [gat] if gat.convex_hull.area < gat.area * 1.01 else [tr for tr in triangulate(gat) if tr.area > 1e-3 and gat.contains(tr.representative_point())]
                mx = np.array(gat.centroid.coords[0])
                lv[Lv]['s'].append({'k': 'plaat', 'a': list(v_at(*mx)), 'd': 0, 'n': 1, 'w': 2, 'zuil': 1, 'm': vloer_mat(None, naam),
                                    'p': [[[round(x_, 3), round(z_, 3), round(float(top), 3)] for x_, z_ in list(t_.exterior.coords)[:-1]] for t_ in st_]})
    # 3. hellingen en bordessen: schuine beloopbare vlakken, en vlakke stukken die er tussen twee verdiepingen aan vast zitten
    #    (een bocht met helling is twee hellingen met een bordes), precies zoals getekend: per vlak één veelhoek ('plaat')
    from shapely.geometry import Polygon as SP2
    from shapely.ops import triangulate
    kand = []
    for t, n, l in zip(T, N_, L):
        if n[2] <= 0: continue
        s_ = math.hypot(n[0], n[1]) / n[2]
        if s_ > 0.6: continue
        zz = t[:, 2].mean()
        if s_ <= 0.05 and abs(zz - round(zz / LH) * LH) < 0.45: continue      # gewone vloer
        kand.append((t, n / np.linalg.norm(n), s_ > 0.05))
    vk = lambda p: (round(p[0], 2), round(p[1], 2), round(p[2], 2))
    ouder = list(range(len(kand))); vind = lambda x: x if ouder[x] == x else vind(ouder[x])
    rib = {}
    for x, (t, _, _) in enumerate(kand):
        for p in t:                                                               # gedeeld hoekpunt (randen sluiten niet altijd netjes aan)
            e = vk(p)
            if e in rib: ouder[vind(x)] = vind(rib[e])
            else: rib[e] = x
    comp = collections.defaultdict(list)
    for x in range(len(kand)): comp[vind(x)].append(x)
    for leden in comp.values():
        if not any(kand[x][2] for x in leden): continue                          # alleen vlakke stukken: geen helling
        zs = np.concatenate([kand[x][0][:, 2] for x in leden]); z0 = zs.min()
        if zs.max() - z0 < 0.5: continue
        Lv = int(math.floor((z0 + 0.2) / LH))
        if Lv >= nlv: continue
        groepen = []                                                              # vlakken die (bijna) in één vlak liggen samen: [normaal, d, leden]
        for x in leden:
            t, nn, _ = kand[x]; d = float(nn @ t.mean(0))
            for G_ in groepen:
                if nn @ G_[0] > 0.997 and abs(d - G_[1]) < 0.12: G_[2].append(x); break
            else: groepen.append([nn, d, [x]])
        pl = []
        for _, _, xs in groepen:
            V_ = np.concatenate([kand[x][0] for x in xs])                          # vlak door alle hoekpunten: z = a·x + b·y + c
            cf = np.linalg.lstsq(np.c_[V_[:, 0], V_[:, 1], np.ones(len(V_))], V_[:, 2], rcond=None)[0]
            u = unary_union([SP2([XZ(p) for p in kand[x][0][:, :2]]) for x in xs]).buffer(0.002).buffer(-0.002).simplify(0.01)
            for g in getattr(u, 'geoms', [u]):
                if g.geom_type != 'Polygon' or g.area < 0.3 or 2 * g.area / g.length < 0.35: continue   # te smal: bovenkant van een muurtje
                stukken = [g] if g.convex_hull.area < g.area * 1.01 else [tr for tr in triangulate(g) if tr.area > 1e-3 and g.contains(tr.representative_point())]
                for st in stukken:
                    pts = []
                    for x_, z_ in list(st.exterior.coords)[:-1]:
                        hz = cf[0] * x_ + cf[1] * (-z_) + cf[2]
                        pts.append([round(x_, 3), round(z_, 3), round(float(hz - Lv * LH), 3)])
                    pl.append(pts)
        if not pl: continue
        mx = np.mean([p[:2] for q in pl for p in q], 0)
        lv[Lv]['s'].append({'k': 'plaat', 'a': list(v_at(*mx)), 'd': 0, 'n': 1, 'w': 2, 'p': pl, 'm': vloer_mat(None, naam)})
    # zuilen midden op een helling (de helling zelf is dicht tot de vloer): weg; zuilen langs de rand blijven (die dragen iets)
    for L_ in lv:
        pls = [SPoly([p[:2] for p in pl]).buffer(-0.3) for S in L_['s'] if S['k'] == 'plaat' and not S.get('zuil') for pl in S['p']]
        if pls: L_['o'] = [o for o in L_['o'] if not (o['t'] == 'pillar' and any(q.contains(SPoly([(o['x'], o['z']), (o['x'] + 1e-3, o['z']), (o['x'], o['z'] + 1e-3)]).centroid) for q in pls))]
    # 4. daken: een Dak-module is een schilddak op de onderste verdieping
    if naam.startswith('Dak'):
        # een dak is in de Raatmaker een vloer van dakbedekking op de verdieping waar hij op ligt (bij de lichtkoepel een
        # glazen zeshoek in het midden); de vorm van de koepel zelf kan de Raatmaker niet
        f = {}
        for key3, (cx, cz) in zip(TRIS, CENT):
            if any(pth.contains_point((cx, cz)) and n[2] > 0 for pth, t, n, k in paths):
                f['%d,%d,%d' % key3] = 'glass' if ('koepel' in naam and in_hex(cx, cz, 2.3)) else 'pannen'
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
        mods.append({'v': 2, 'rand': 'muurtje', 'tegel': 1, 'name': sleutel, 'cat': SOORT(naam), 'k': 0, 'n': N, 'lv': lvs, 'edges': [], 'cells': [], 'tris': [], 'paths': [], 'bron': 'bergfort'})
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
