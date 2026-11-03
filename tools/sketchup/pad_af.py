#!/usr/bin/env python3
"""Maakt de looproute van het bergfort af met modules uit de bibliotheek: zoekt de helling of trap (bestaande modules,
in een van de zes standen, eventueel gespiegeld) die de meeste vloer van het fort bereikbaar maakt vanaf de parkeerplaats,
zet die neer, en herhaalt dat tot er niets meer bij komt. Een helling komt op de plek van een pad (dezelfde module
met een helling erin) of bovenop een stapel. Gebruikt looproute.py om te rekenen. Wordt aangeroepen door bergfort_af.py."""
import math, collections, time
import numpy as np
import looproute as L, grid_check as G

RAMPEN = ['Pad · helling tussen twee wanden', 'Pad · bocht met helling op pleinvloer', 'Plateau · met muurtjes en trap', 'Pad · halve ring met helling']
RUILBAAR = ('Pad ·', 'Plateau · met muurtjes')        # paden en ommuurde plateaus van het fort mogen een helling worden
CX, CY = 7.79, 9.0

def assen(k, spiegel):
    c, s = math.cos(math.radians(60 * k)), math.sin(math.radians(60 * k))
    a = [-c, -s, 0] if spiegel else [c, s, 0]
    return [a[0], a[1], 0, -s, c, 0, 0, 0, 1]
def matrix(naam, q, r, z, A):
    x, y = G.mid(q, r); tx = x - (A[0] * CX + A[3] * CY); ty = y - (A[1] * CX + A[4] * CY)
    return [A[0], A[1], A[2], 0, A[3], A[4], A[5], 0, A[6], A[7], A[8], 0, round(tx * 100), round(ty * 100), round(z * 100), 1]

class Stand:
    def __init__(s, P, nodig):
        s.P = [list(p) for p in P]; s.nodig = nodig            # nodig(pi) -> telt deze vloer mee
        s.bij = [L.bijdrage(n, m, pi) for pi, (n, m) in enumerate(s.P)]
        s.vl = collections.defaultdict(list)
        for b in s.bij:
            for k, l in b.items(): s.vl[k].extend(l)
        ks = np.array(list(s.vl.keys())); s.lo = ks.min(0) - 12; s.hi = ks.max(0) + 12
        s.V = {}
        for i in range(s.lo[0], s.hi[0] + 1):
            for j in range(s.lo[1], s.hi[1] + 1):
                v = L.vloer(s.vl.get((i, j), []))
                if v: s.V[(i, j)] = v
    def weg_en_erbij(s, weg, erbij):
        """V na het weghalen van plaatsen 'weg' en het toevoegen van (naam, matrix)-paren 'erbij' (zonder s te veranderen)"""
        nieuw = {}; pk = set()
        for pi in weg: pk |= set(s.bij[pi])
        extra = collections.defaultdict(list)
        for x, (n, m) in enumerate(erbij): L.bijdrage(n, m, len(s.P) + x, extra)
        pk |= set(extra)
        for k in pk:
            l = [t for t in s.vl.get(k, []) if t[2] not in weg] + extra.get(k, [])
            nieuw[k] = L.vloer(l)
        return nieuw
    def score(s, nieuw=None, terug=False):
        V = s.V if nieuw is None else collections.ChainMap(nieuw, s.V)
        start = [(k, 0) for k in s.V if V[k] and V[k][0][0] < 0.3 and V[k][0][1] < 0]
        gez = set(start); dq = collections.deque(start); tot = 0
        while dq:
            k, n = dq.popleft(); z, pi = V[k][n]
            if pi >= 0 and s.nodig(pi): tot += 1
            for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                k2 = (k[0] + di, k[1] + dj); l2 = V.get(k2)
                if not l2: continue
                for n2, (z2, _) in enumerate(l2):
                    if abs(z2 - z) <= L.STAP and (k2, n2) not in gez: gez.add((k2, n2)); dq.append((k2, n2))
        return (tot * L.S * L.S, gez) if terug else tot * L.S * L.S
    def winst(s, R, nieuw):
        """snelle schatting: hoeveel vloer erbij komt (vanaf wat al bereikbaar is, R = {(k, z)}) min wat wegvalt"""
        V = collections.ChainMap(nieuw, s.V); K = set(nieuw); tot = 0
        for k in K:
            for z, pi in s.V.get(k, []):
                if (k, round(z, 2)) in R and pi >= 0 and s.nodig(pi) and not any(abs(z2 - z) < 0.05 for z2, _ in nieuw[k]): tot -= 1
        seen = set(); dq = collections.deque()
        for k in K:
            for z, pi in nieuw[k]:
                if (k, round(z, 2)) in R: continue
                for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    k2 = (k[0] + di, k[1] + dj)
                    if k2 in K: continue
                    if any((k2, round(z2, 2)) in R and abs(z2 - z) <= L.STAP for z2, _ in V.get(k2, [])): seen.add((k, round(z, 2))); dq.append((k, z, pi)); break
        while dq:
            k, z, pi = dq.popleft()
            if pi >= 0 and s.nodig(pi): tot += 1
            for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                k2 = (k[0] + di, k[1] + dj)
                for z2, p2 in V.get(k2, []):
                    t = (k2, round(z2, 2))
                    if abs(z2 - z) <= L.STAP and t not in seen and (t not in R or k2 in K): seen.add(t); dq.append((k2, z2, p2))
        return tot * L.S * L.S
    def toepassen(s, weg, erbij, nieuw):
        for pi in sorted(weg, reverse=True):
            s.P[pi] = None
        for n, m in erbij: s.P.append([n, m]); s.bij.append(L.bijdrage(n, m, len(s.P) - 1))
        for pi in weg: s.bij[pi] = {}
        s.vl = collections.defaultdict(list)
        for b in s.bij:
            for k, l in b.items(): s.vl[k].extend(l)
        s.V.update(nieuw)
        for k in [k for k, v in s.V.items() if not v]: del s.V[k]

def verbind(P, n_orig, log=print, max_stappen=12):
    """P: alle plaatsen van het fort (de eerste n_orig zijn het origineel). Geeft de nieuwe lijst plaatsen en wat er veranderd is."""
    nodig = lambda pi: pi < n_orig and not P[pi][0].startswith(('Dak', 'Toren'))
    st = Stand(P, nodig); nu, gez = st.score(terug=True)
    alles = sum(1 for l in st.V.values() for z, pi in l if pi >= 0 and nodig(pi)) * L.S * L.S
    log(f'looproute: {nu:.0f} van de {alles:.0f} m² vloer van het fort bereikbaar')
    gedaan = []
    def vak_van(pi):
        T, _ = G.wereld(*st.P[pi]); return G.cell(*T.reshape(-1, 3)[:, :2].mean(0))
    for stap in range(max_stappen):
        t0 = time.time()
        # vakken aan de rand van wat je nu kunt bereiken (en hun buren)
        rand = collections.Counter()
        for k, n in gez:
            z, pi = st.V[k][n]
            if pi >= 0: rand[G.cell(k[0] * L.S, k[1] * L.S)] += 1
        bij = {c for c, v in rand.items() if v > 20}
        bij |= {(c[0] + dq, c[1] + dr) for c in bij for dq, dr in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1))}
        kand = []
        # 1. een pad van het fort vervangen door een helling of trap op dezelfde plek
        for pi, p in enumerate(st.P):
            if p is None or pi >= n_orig or not p[0].startswith(RUILBAAR): continue
            c = vak_van(pi)
            if c not in bij: continue
            T, _ = G.wereld(*p); z = round(float(T[:, :, 2].min()) * 2) / 2
            for naam in dict.fromkeys([p[0]] + RAMPEN):
                for k in range(6):
                    for sp in (False, True):
                        wat = f'{p[0]} in {c} op {z:g} m gedraaid naar {60 * k}°{" gespiegeld" if sp else ""}' if naam == p[0] else f'{p[0]} in {c} op {z:g} m wordt {naam}'
                        kand.append(([pi], [(naam, matrix(naam, *c, z, assen(k, sp)))], wat))
        # 2. een helling of trap bovenop een stapel die je kunt bereiken
        hoogst = collections.defaultdict(float)
        for k, l in st.vl.items():
            c = G.cell(k[0] * L.S, k[1] * L.S); x, y = G.mid(*c)
            if math.hypot(k[0] * L.S - x, k[1] * L.S - y) < 6: hoogst[c] = max(hoogst[c], max(t[0] for t in l))
        for c in bij:
            h = round(hoogst.get(c, 0) * 2) / 2
            if h < 3 or abs(h / 3 - round(h / 3)) > 0.01: continue
            for naam in RAMPEN:
                for k in range(6):
                    for sp in (False, True): kand.append(([], [(naam, matrix(naam, *c, h, assen(k, sp)))], f'{naam} bovenop {c} op {h:g} m'))
        R = {(k, round(st.V[k][n][0], 2)) for k, n in gez}
        geschat = []
        for weg, erbij, wat in kand:
            nieuw = st.weg_en_erbij(set(weg), erbij); geschat.append((st.winst(R, nieuw), weg, erbij, wat, nieuw))
        geschat.sort(key=lambda x: -(x[0] + (40 if 'gedraaid' in x[3] else 0))); best = None
        for w, weg, erbij, wat, nieuw in geschat[:8]:          # de beste zes precies narekenen
            if w < 25: break
            sc = st.score(nieuw); voork = sc + (40 if 'gedraaid' in wat else 0) - (20 if not weg else 0)
            if best is None or voork > best[5]: best = (sc, weg, erbij, wat, nieuw, voork)
        log(f'  stap {stap + 1}: {len(kand)} mogelijkheden bekeken in {time.time() - t0:.0f} s; beste: {best[3] if best else "-"} → {best[0] if best else 0:.0f} m²')
        if not best or best[0] < nu + 25: break
        st.toepassen(set(best[1]), best[2], best[4]); nu, gez = st.score(terug=True); gedaan.append({'wat': best[3], 'weg': list(best[1]), 'erbij': best[2]})
    return [p for p in st.P if p is not None], gedaan, nu

def toepassen(P, gedaan):
    """dezelfde veranderingen opnieuw toepassen (uit raatstad-berg-pad.json), zonder te zoeken"""
    P = [list(p) for p in P]
    for g in gedaan:
        for pi in g['weg']: P[pi] = None
        P.extend([list(e) for e in g['erbij']])
    return [p for p in P if p is not None]

if __name__ == '__main__':
    # een eigen fort uit de webversie (Modulekaart, "Download voor Claude"): looproute afmaken en wegschrijven als <naam>-af.json
    import sys, json, os
    fn = sys.argv[1]; P = json.load(open(fn))['plaatsen']
    P2, gedaan, nu = verbind(P, len(P), log=lambda *a: print(*a, flush=True))
    uit = os.path.splitext(fn)[0] + '-af.json'
    json.dump({'bestand': fn + ' (looproute afgemaakt)', 'plaatsen': P2, 'gedaan': [g['wat'] for g in gedaan]}, open(uit, 'w'), ensure_ascii=False)
    print('geschreven:', uit, '·', len(gedaan), 'aanpassingen'); [print('  ', g['wat']) for g in gedaan]
