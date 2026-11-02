# Raatstad · bibliotheek met padblokken
# Op hetzelfde raster als "hexgrid path concept": een vak is een zeshoek met straal 9 m (15,59 x 18 m, punt naar y),
# een verdieping is 3 m. Elk pad loopt van het midden van een zijde van het vak naar het midden (een zeshoekige naaf van
# 3 m breed) en verder naar het midden van een andere zijde: zo sluiten alle blokken op elkaar aan, onder 60 en 120 graden.
# Zijden: 0 = rechts (+x), daarna tegen de klok in per 60 graden (1 = rechtsboven, 2 = linksboven, 3 = links, ...).
# Gebruik: open een leeg model, Venster > Ruby-console:  load 'D:/Raatstad/paden_bibliotheek.rb'
module RaatPaden
  extend self
  R  = 9.0                        # straal van een vak (m)
  AP = R * Math.sqrt(3) / 2       # afstand midden -> midden van een zijde (7,794 m)
  HUB = 3.0                       # straal van de naaf = breedte van een pad (3 m)
  HAP = HUB * Math.sqrt(3) / 2    # apothema van de naaf (2,598 m)
  BASE = 0.3                      # dikte van de grondplaat
  PATH = 0.1                      # dikte van de bestrating
  LV = 3.0                        # een verdieping

  def ang(d) d * Math::PI / 180 end
  def hexp(r, k) a = ang(30 + 60 * k); [r * Math.cos(a), r * Math.sin(a)] end          # hoekpunt k
  def dir(k) a = ang(60 * k); [Math.cos(a), Math.sin(a)] end                           # richting naar zijde k
  def hex(r = R) (0..5).map { |k| hexp(r, k) } end
  def add(a, b, s = 1) [a[0] + b[0] * s, a[1] + b[1] * s] end
  def rect(x0, x1, y0, y1) [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] end
  def rot(pts, deg) a = ang(deg); c = Math.cos(a); s = Math.sin(a); pts.map { |x, y| [x * c - y * s, x * s + y * c] } end
  def move(pts, dx, dy) pts.map { |x, y| [x + dx, y + dy] } end

  # het pad als één veelhoek: de naaf, met op elke aangesloten zijde een strook tot de rand van het vak
  def path_poly(conns, reach = AP, hub = HUB)
    l = reach - hub * Math.sqrt(3) / 2; pts = []
    6.times do |k|
      a = hexp(hub, k - 1); b = hexp(hub, k); pts << a
      if conns.include?(k) then d = dir(k); pts << add(a, d, l) << add(b, d, l) end
    end
    pts
  end

  # snijdt een veelhoek af op een halfvlak: houdt de punten waar nx*x + ny*y >= c
  def clip(pts, nx, ny, c)
    out = []; n = pts.size
    n.times do |i|
      p = pts[i]; q = pts[(i + 1) % n]; dp = nx * p[0] + ny * p[1] - c; dq = nx * q[0] + ny * q[1] - c
      out << p if dp >= 0
      if (dp >= 0) != (dq >= 0) then t = dp / (dp - dq); out << [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t] end
    end
    out
  end

  # een gesloten blok: grondvlak pts, onder- en bovenkant op hoogte zb/zt (getal, of een functie van [x, y] voor een helling)
  def solid(ents, pts, zb, zt, mat)
    g = ents.add_group; e = g.entities
    z = ->(v, p) { v.respond_to?(:call) ? v.call(p) : v }
    top = pts.map { |p| Geom::Point3d.new(p[0].m, p[1].m, z.(zt, p).m) }
    bot = pts.map { |p| Geom::Point3d.new(p[0].m, p[1].m, z.(zb, p).m) }
    e.add_face(top); e.add_face(bot)
    n = pts.size
    n.times { |i| j = (i + 1) % n; e.add_face(bot[i], bot[j], top[j], top[i]) }
    e.grep(Sketchup::Face).each { |f| f.material = mat; f.back_material = mat }
    g
  end

  def mat(name, rgb, alpha = 1.0)
    m = Sketchup.active_model.materials[name] || Sketchup.active_model.materials.add(name)
    m.color = Sketchup::Color.new(*rgb); m.alpha = alpha; m
  end

  def mats
    @m ||= {
      gras: mat('Raat gras', [122, 178, 86]), bestrating: mat('Raat bestrating', [214, 205, 188]),
      steen: mat('Raat natuursteen', [189, 181, 165]), beton: mat('Raat beton', [176, 176, 170]),
      hout: mat('Raat hout', [150, 108, 70]), water: mat('Raat water', [70, 140, 190], 0.75),
      stam: mat('Raat boomstam', [110, 80, 52]), blad: mat('Raat blad', [86, 148, 64]),
      fiets: mat('Raat fietspad rood', [168, 72, 60]), wit: mat('Raat belijning', [240, 240, 236]),
      stuc: mat('Raat stucwerk wit', [236, 232, 224]), metaal: mat('Raat metaal', [60, 66, 72]),
      zand: mat('Raat zand', [226, 204, 150]), aarde: mat('Raat aarde', [112, 84, 60]), groente: mat('Raat groente', [120, 170, 70]),
    }
  end

  # ---------- losse onderdelen ----------
  def grondplaat(e, top = BASE) solid(e, hex, 0, top, mats[:gras]) end
  def pad(e, conns, z, reach = AP) solid(e, path_poly(conns, reach), z, z + PATH, mats[:bestrating]) end
  def boom(e, x, y, z)
    solid(e, move(hex(0.22), x, y), z, z + 2.4, mats[:stam])
    solid(e, move(hex(1.7), x, y), z + 2.0, z + 3.6, mats[:blad])
    solid(e, move(hex(1.1), x, y), z + 3.6, z + 4.6, mats[:blad])
  end
  def plantvak(e, x, y, z) solid(e, move(hex(1.4), x, y), z, z + 0.45, mats[:steen]); boom(e, x, y, z + 0.45) end
  def bank(e, x, y, z, deg)
    solid(e, move(rot(rect(-0.8, 0.8, -0.25, 0.25), deg), x, y), z, z + 0.45, mats[:hout])
  end
  def leuning(e, x0, x1, y, z)   # langs x, op y
    solid(e, rect(x0, x1, y - 0.04, y + 0.04), z + 0.95, z + 1.05, mats[:metaal])
    n = ((x1 - x0) / 2.0).ceil; (0..n).each { |i| x = x0 + (x1 - x0) * i / n; solid(e, rect(x - 0.04, x + 0.04, y - 0.04, y + 0.04), z, z + 1.0, mats[:metaal]) }
  end
  def wig(lo, hi) ->(p) { lo + (hi - lo) * (p[0] + AP) / (2 * AP) } end   # helling langs x: lo bij zijde 3, hi bij zijde 0

  # een veelhoek binnen een zeshoek met straal r houden (punt boven)
  def in_hex(pts, r = R) 6.times { |k| d = dir(k); pts = clip(pts, -d[0], -d[1], -r * Math.sqrt(3) / 2) }; pts end
  # leuning rond een zeshoek: palen op de hoeken, een regel ertussen
  def hexleuning(e, r, z)
    6.times { |k| a = hexp(r, k); b = hexp(r, k + 1); solid(e, move(hex(0.06), *a), z, z + 1.0, mats[:metaal])
      d = [b[0] - a[0], b[1] - a[1]]; l = Math.hypot(*d); n = [-d[1] / l * 0.04, d[0] / l * 0.04]
      solid(e, [add(a, n), add(b, n), add(b, n, -1), add(a, n, -1)], z + 0.95, z + 1.05, mats[:metaal]) }
  end

  # ---------- de blokken ----------
  def blokken
    b = []
    vlak = ->(naam, conns) { b << [naam, ->(e) { grondplaat(e); pad(e, conns, BASE) }] }
    vlak.('Pad · recht', [0, 3])
    vlak.('Pad · flauwe bocht', [0, 2])
    vlak.('Pad · scherpe bocht', [0, 1])
    vlak.('Pad · Y-splitsing', [0, 2, 4])
    vlak.('Pad · zijtak', [0, 1, 3])
    vlak.('Pad · kruising', [0, 1, 3, 4])
    vlak.('Pad · ster', [0, 1, 2, 3, 4, 5])
    b << ['Pad · doodlopend met boom', ->(e) { grondplaat(e); pad(e, [0], BASE); plantvak(e, -4.0, 0, BASE) }]
    b << ['Pad · rondgang met boom', ->(e) {
      grondplaat(e); ro = 6.4; ri = 3.9
      6.times { |k| solid(e, [hexp(ri, k - 1), hexp(ro, k - 1), hexp(ro, k), hexp(ri, k)], BASE, BASE + PATH, mats[:bestrating]) }
      [0, 3].each { |k| d = dir(k); s = ro * Math.sqrt(3) / 2 - 0.05
        solid(e, rot(rect(s, AP, -1.5, 1.5), 60 * k), BASE, BASE + PATH, mats[:bestrating]) }
      plantvak(e, 0, 0, BASE) }]
    b << ['Plein · zeshoek met boom', ->(e) {
      grondplaat(e); solid(e, hex(R - 1.0), BASE, BASE + PATH, mats[:bestrating]); plantvak(e, 0, 0, BASE + PATH)
      3.times { |k| d = dir(2 * k + 1); bank(e, d[0] * 3.6, d[1] * 3.6, BASE + PATH, 60 * (2 * k + 1) + 90) } }]
    b << ['Plein · bankjes langs de rand', ->(e) {
      grondplaat(e); solid(e, hex(R - 0.6), BASE, BASE + PATH, mats[:bestrating])
      6.times { |k| d = dir(k); bank(e, d[0] * 6.2, d[1] * 6.2, BASE + PATH, 60 * k + 90) } }]
    # op een plateau van 3 m
    plat = ->(naam, conns) { b << [naam, ->(e) { grondplaat(e, LV); pad(e, conns, LV) }] }
    plat.('Plateau · pad recht', [0, 3])
    plat.('Plateau · pad flauwe bocht', [0, 2])
    plat.('Plateau · pad Y-splitsing', [0, 2, 4])
    b << ['Plateau · pad met leuning', ->(e) { grondplaat(e, LV); pad(e, [0, 3], LV); [-1.6, 1.6].each { |y| leuning(e, -AP + 0.3, AP - 0.3, y, LV + PATH) } }]
    # hoogte: van 0 naar 3 m over één vak (langs x: laag bij zijde 3, hoog bij zijde 0)
    b << ['Helling · pad omhoog', ->(e) {
      solid(e, hex, 0, wig(BASE, LV + BASE), mats[:gras])
      w = wig(BASE, LV + BASE); solid(e, rect(-AP, AP, -1.5, 1.5), w, ->(p) { w.(p) + PATH }, mats[:bestrating]) }]
    b << ['Trap · pad omhoog', ->(e) {
      solid(e, hex, 0, wig(BASE, LV + BASE), mats[:gras]); n = 18; run = 2 * AP / n
      n.times { |i| x0 = -AP + i * run; solid(e, rect(x0, x0 + run, -1.5, 1.5), 0, BASE + LV * (i + 1) / n, mats[:steen]) } }]
    b << ['Helling · pad omhoog met leuning', ->(e) {
      solid(e, hex, 0, wig(BASE, LV + BASE), mats[:gras]); w = wig(BASE, LV + BASE)
      solid(e, rect(-AP, AP, -1.5, 1.5), w, ->(p) { w.(p) + PATH }, mats[:bestrating])
      [-1.6, 1.6].each { |y| solid(e, rect(-AP + 0.3, AP - 0.3, y - 0.04, y + 0.04), ->(p) { w.(p) + 0.95 }, ->(p) { w.(p) + 1.05 }, mats[:metaal]) } }]
    # bruggen, tunnels en stegen
    b << ['Brug · pad over vak', ->(e) {
      grondplaat(e); solid(e, rect(-AP, AP, -1.5, 1.5), LV, LV + BASE, mats[:beton])
      [-4.0, 4.0].each { |x| solid(e, move(hex(0.55), x, 0), BASE, LV, mats[:beton]) }
      [-1.45, 1.45].each { |y| leuning(e, -AP + 0.2, AP - 0.2, y, LV + BASE) } }]
    b << ['Brug · pad over kruisend pad', ->(e) {
      grondplaat(e); pad(e, [1, 4], BASE); solid(e, rect(-AP, AP, -1.5, 1.5), LV, LV + BASE, mats[:beton])
      [[-5.5, 0], [5.5, 0]].each { |x, y| solid(e, move(hex(0.55), x, y), BASE, LV, mats[:beton]) }
      [-1.45, 1.45].each { |y| leuning(e, -AP + 0.2, AP - 0.2, y, LV + BASE) } }]
    b << ['Tunnel · pad door blok', ->(e) {
      grondplaat(e); pad(e, [0, 3], BASE)
      solid(e, clip(hex, 0, 1, 1.5), BASE, LV, mats[:steen]); solid(e, clip(hex, 0, -1, 1.5), BASE, LV, mats[:steen])
      solid(e, rect(-AP, AP, -1.5, 1.5), LV - 0.4, LV, mats[:steen]) }]
    b << ['Steeg · pad tussen muren', ->(e) {
      grondplaat(e); pad(e, [0, 3], BASE)
      [1, -1].each { |s| solid(e, rect(-AP, AP, s > 0 ? 1.5 : -1.8, s > 0 ? 1.8 : -1.5), BASE, BASE + LV, mats[:stuc]) } }]
    b << ['Steeg · overdekte doorgang', ->(e) {
      grondplaat(e); pad(e, [0, 3], BASE)
      solid(e, clip(hex, 0, 1, 1.5), BASE, 2 * LV, mats[:stuc]); solid(e, clip(hex, 0, -1, 1.5), BASE, 2 * LV, mats[:stuc])
      solid(e, rect(-AP, AP, -1.5, 1.5), LV, 2 * LV, mats[:stuc]) }]
    # water en fiets
    b << ['Vlonder · pad over water', ->(e) {
      solid(e, hex, 0, 0.2, mats[:water]); solid(e, rect(-AP, AP, -1.5, 1.5), 0.6, 0.72, mats[:hout])
      [-6.0, -2.0, 2.0, 6.0].each { |x| [-1.3, 1.3].each { |y| solid(e, move(hex(0.15), x, y), 0, 0.6, mats[:hout]) } } }]
    b << ['Vlonder · bocht over water', ->(e) {
      solid(e, hex, 0, 0.2, mats[:water]); solid(e, path_poly([0, 2]), 0.6, 0.72, mats[:hout])
      [[0, 0], [5.0, 0], [-2.5, 4.33]].each { |x, y| solid(e, move(hex(0.15), x, y), 0, 0.6, mats[:hout]) } }]
    b << ['Fietspad · recht', ->(e) {
      grondplaat(e); solid(e, rect(-AP, AP, -2.25, 2.25), BASE, BASE + PATH, mats[:fiets])
      solid(e, rect(-AP, AP, -0.06, 0.06), BASE + PATH, BASE + PATH + 0.01, mats[:wit]) }]
    b << ['Fietspad · met voetpad', ->(e) {
      grondplaat(e); solid(e, rect(-AP, AP, -3.2, 0), BASE, BASE + PATH, mats[:fiets])
      solid(e, rect(-AP, AP, 0, 3.2), BASE, BASE + PATH + 0.05, mats[:bestrating]) }]
    # ---------- erbij: tuinen, water, fiets, hoogte ----------
    fb = 2.6   # naaf van een fietspad: 4,5 m breed
    b << ['Fietspad · flauwe bocht', ->(e) { grondplaat(e); solid(e, path_poly([0, 2], AP, fb), BASE, BASE + PATH, mats[:fiets]) }]
    b << ['Fietspad · Y-splitsing', ->(e) { grondplaat(e); solid(e, path_poly([0, 2, 4], AP, fb), BASE, BASE + PATH, mats[:fiets]) }]
    b << ['Pad · rotonde met plantvak', ->(e) {
      grondplaat(e); 6.times { |k| solid(e, [hexp(2.0, k - 1), hexp(4.6, k - 1), hexp(4.6, k), hexp(2.0, k)], BASE, BASE + PATH, mats[:bestrating]) }
      [0, 2, 4].each { |k| solid(e, rot(rect(4.6 * Math.sqrt(3) / 2 - 0.05, AP, -1.5, 1.5), 60 * k), BASE, BASE + PATH, mats[:bestrating]) }
      plantvak(e, 0, 0, BASE) }]
    b << ['Pad · bocht met bankje', ->(e) { grondplaat(e); pad(e, [0, 2], BASE); bank(e, -1.3, -3.6, BASE, 30); bank(e, 2.2, -3.6, BASE, 0) }]
    b << ['Plein · speelplek met zandbak', ->(e) {
      grondplaat(e); solid(e, hex(R - 1.0), BASE, BASE + PATH, mats[:bestrating]); z = BASE + PATH
      6.times { |k| solid(e, [hexp(2.8, k - 1), hexp(3.3, k - 1), hexp(3.3, k), hexp(2.8, k)], z, z + 0.35, mats[:hout]) }
      solid(e, hex(2.8), z, z + 0.2, mats[:zand])
      [1, 3, 5].each { |k| d = dir(k); bank(e, d[0] * 5.6, d[1] * 5.6, z, 60 * k + 90) } }]
    b << ['Plein · waterplein met stapstenen', ->(e) {
      6.times { |k| solid(e, [hexp(R - 2.2, k - 1), hexp(R, k - 1), hexp(R, k), hexp(R - 2.2, k)], 0, BASE + PATH, mats[:bestrating]) }
      solid(e, hex(R - 2.2), 0, 0.05, mats[:steen]); solid(e, hex(R - 2.2), 0.05, 0.2, mats[:water])
      [-4.6, -2.3, 0, 2.3, 4.6].each { |x| solid(e, move(hex(0.75), x, 0), 0, BASE + PATH, mats[:steen]) } }]
    b << ['Tuin · moestuin', ->(e) {
      grondplaat(e); pad(e, [0, 3], BASE)
      [2.6, 5.0, -2.6, -5.0].each { |y| solid(e, in_hex(rect(-AP, AP, y - 0.7, y + 0.7), R - 1.2), BASE, BASE + 0.4, mats[:aarde])
        (-3..3).each { |i| x = i * 1.8; pt = move(hex(0.35), x, y); solid(e, pt, BASE + 0.4, BASE + 0.8, mats[:groente]) if in_hex(pt, R - 1.4).size == 6 } } }]
    b << ['Tuin · boomgaard', ->(e) {
      grondplaat(e); pad(e, [0, 3], BASE)
      [30, 90, 150, 210, 270, 330].each { |a| x = 5.4 * Math.cos(ang(a)); y = 5.4 * Math.sin(ang(a)); y = y.abs < 3.2 ? 3.2 * (y <=> 0) : y; boom(e, x, y, BASE) } }]
    b << ['Vlonder · aanlegsteiger', ->(e) {
      solid(e, hex, 0, 0.2, mats[:water]); solid(e, rect(-AP, 2.0, -1.5, 1.5), 0.6, 0.72, mats[:hout])
      solid(e, move(hex(2.4), 3.2, 0), 0.6, 0.72, mats[:hout])
      [[-4.0, 0], [0.0, 0]].each { |x, y| [-1.3, 1.3].each { |dy| solid(e, move(hex(0.15), x, y + dy), 0, 0.6, mats[:hout]) } }
      [[4.6, 1.6], [4.6, -1.6], [5.6, 0]].each { |x, y| solid(e, move(hex(0.18), x, y), 0, 1.2, mats[:hout]) } }]
    b << ['Trap · met bordes halverwege', ->(e) {
      solid(e, hex, 0, wig(BASE, LV + BASE), mats[:gras]); n = 9; run = (AP - 1.5) / n
      n.times { |i| x0 = -AP + i * run; solid(e, rect(x0, x0 + run, -1.5, 1.5), 0, BASE + LV / 2 * (i + 1) / n, mats[:steen]) }
      solid(e, rect(-1.5, 1.5, -1.5, 1.5), 0, BASE + LV / 2, mats[:steen])
      n.times { |i| x0 = 1.5 + i * run; solid(e, rect(x0, x0 + run, -1.5, 1.5), 0, BASE + LV / 2 + LV / 2 * (i + 1) / n, mats[:steen]) } }]
    b << ['Helling · halve verdieping', ->(e) {
      w = wig(BASE, LV / 2 + BASE); solid(e, hex, 0, w, mats[:gras]); solid(e, rect(-AP, AP, -1.5, 1.5), w, ->(p) { w.(p) + PATH }, mats[:bestrating]) }]
    b << ['Brug · boogbrug over water', ->(e) {
      solid(e, hex, 0, 0.2, mats[:water]); n = 14; dx = 2 * AP / n
      n.times { |i| x0 = -AP + i * dx; t = (i + 0.5) / n; z = 0.6 + 1.4 * Math.sin(Math::PI * t)
        solid(e, rect(x0, x0 + dx, -1.6, 1.6), z, z + 0.25, mats[:hout])
        [-1.55, 1.55].each { |y| solid(e, rect(x0, x0 + dx, y - 0.04, y + 0.04), z + 1.0, z + 1.08, mats[:hout]); solid(e, move(hex(0.05), x0, y), z, z + 1.0, mats[:hout]) } }
      [-AP + 0.6, AP - 0.6].each { |x| [-1.3, 1.3].each { |y| solid(e, move(hex(0.2), x, y), 0, 0.7, mats[:steen]) } } }]
    b << ['Toren · uitkijktoren', ->(e) {
      grondplaat(e); pad(e, [0], BASE); solid(e, hex(2.6), BASE, 9.0, mats[:steen])
      solid(e, hex(3.4), 9.0, 9.3, mats[:hout]); hexleuning(e, 3.3, 9.3) }]
    b
  end

  def bouw
    model = Sketchup.active_model
    model.start_operation('Padblokken bouwen', true)
    lijst = blokken; kol = 8
    model.entities.grep(Sketchup::ComponentInstance).select { |i| i.definition.description.start_with?('Raatstad padblok') }.each(&:erase!)
    lijst.each_with_index do |(naam, maak), i|
      d = model.definitions[naam] || model.definitions.add(naam)
      d.entities.clear!; maak.(d.entities); d.description = 'Raatstad padblok op het zeshoekraster (vak 9 m, verdieping 3 m)'
      x = (i % kol) * 22.0; y = -(i / kol) * 24.0
      inst = model.entities.add_instance(d, Geom::Transformation.translation([x.m, y.m, 0]))
    end
    model.commit_operation
    lijst.size
  end
end
