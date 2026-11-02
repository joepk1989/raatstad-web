#!/usr/bin/env python3
"""Controleert een voorbeeld (bergfort) op het raster: staat elke module precies op het midden van een vak, gedraaid in
stappen van 60°, op een hoogte van een hele of halve verdieping (1,5 m), en overlappen modules elkaar niet?
  python3 tools/sketchup/grid_check.py [raatstad-berg-af.json]"""
import json, math, os, sys
import numpy as np
from matplotlib.path import Path
HERE = os.path.dirname(os.path.abspath(__file__))
V = json.load(open(os.path.join(HERE, 'raatstad-vorm.json'))); V.update(json.load(open(os.path.join(HERE, 'raatstad-extra.json')))['vorm'])
R, SQ3 = 9.0, math.sqrt(3)
def cell(x, y):
    z = -y; q = (SQ3 / 3 * x - z / 3) / R; r = (2 / 3 * z) / R; s = -q - r
    rq, rr, rs = round(q), round(r), round(s); dq, dr, ds = abs(rq - q), abs(rr - r), abs(rs - s)
    if dq > dr and dq > ds: rq = -rr - rs
    elif dr > ds: rr = -rq - rs
    return (rq, rr)
def mid(q, r): return (R * SQ3 * (q + r / 2), -(R * 1.5 * r))
_tri = {}
def tris(n):
    if n not in _tri: _tri[n] = np.concatenate([np.array(v, float).reshape(-1, 3, 3) / 100 for v in V[n].values()])
    return _tri[n]
def wereld(n, m):
    A = np.array([[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]]); t = np.array([m[12], m[13], m[14]]) / 100
    return tris(n) @ A.T + t, A
def check(fn):
    P = json.load(open(os.path.join(HERE, fn)))['plaatsen']
    S = 0.5; info = []
    for i, (n, m) in enumerate(P):
        T, A = wereld(n, m)
        xy = T[:, :, :2].reshape(-1, 2); c = (xy.min(0) + xy.max(0)) / 2
        q, r = cell(*c); cx, cy = mid(q, r); off = math.hypot(c[0] - cx, c[1] - cy)
        ang = math.degrees(math.atan2(A[1, 0], A[0, 0])) % 360; det = np.linalg.det(A); sc = np.linalg.norm(A[:, 0])
        z0, z1 = T[:, :, 2].min(), T[:, :, 2].max()
        info.append(dict(i=i, n=n, q=q, r=r, off=off, ang=ang, det=det, sc=sc, z0=z0, z1=z1, T=T))
    # 1. op het raster
    los = [d for d in info if abs(d['sc'] - 1) > 0.01 or abs(((d['ang'] + 1) % 60) - 1) > 0.5 or abs(d['z0'] * 2 - round(d['z0'] * 2)) > 0.02]
    # 2. overlap: per paar modules met overlappende hoogte, de gedeelde grondvlakte (raster van 0,5 m), alleen dichte delen
    def vlak(d):
        if 'mask' in d: return d['mask']
        T = d['T']; N = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); up = np.abs(N[:, 2]) > 0.3 * (np.linalg.norm(N, axis=1) + 1e-9)
        pts = set()
        for t in T[up]:
            x0, y0 = np.floor(t[:, :2].min(0) / S); x1, y1 = np.ceil(t[:, :2].max(0) / S)
            gx, gy = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5); g = np.c_[gx.ravel(), gy.ravel()] * S
            ins = Path(t[:, :2]).contains_points(g)
            for p in g[ins]: pts.add((int(p[0] / S), int(p[1] / S)))
        d['mask'] = pts; return pts
    paren = []
    for a in range(len(info)):
        for b in range(a + 1, len(info)):
            A, B = info[a], info[b]
            if min(A['z1'], B['z1']) - max(A['z0'], B['z0']) < 0.2: continue
            if math.hypot(A['q'] - B['q'], A['r'] - B['r']) > 2.5: continue
            o = len(vlak(A) & vlak(B)) * S * S
            if o > 12: paren.append((round(o, 1), A['n'], (A['q'], A['r'], round(A['z0'], 1)), B['n'], (B['q'], B['r'], round(B['z0'], 1))))   # minder is alleen de gedeelde rand van twee buurvakken
    return info, los, paren
if __name__ == '__main__':
    info, los, paren = check(sys.argv[1] if len(sys.argv) > 1 else 'raatstad-berg-af.json')
    print(len(info), 'modules;', len(los), 'niet op het raster;', len(paren), 'overlappen')
    for d in los: print('  los:', d['n'], (d['q'], d['r']), 'hoek', round(d['ang'], 1), 'schaal', round(d['sc'], 3), 'z', round(d['z0'], 2))
    for p in sorted(paren, reverse=True): print('  overlap', p)
