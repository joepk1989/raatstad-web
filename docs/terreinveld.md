# Terreinveld

`src/js/07a-terreinveld.js` is de hoogtefunctie langs wegen op een niveau uit Unity (`PlanetCity.GroundField` en `LineGround` in `joepk1989/raatstad-unity`), overgezet naar het platte raster van de webversie. Het zijn losse functies zonder three.js. Het bestand definieert alleen `makeTerrainField` en wordt nog nergens aangeroepen: het spel werkt dus nog precies als voorheen. Het is bedoeld voor `07b-terrein.js`, waar het `roadAdjust` en `lpRoad` vervangt in de buurt van wegen die hoger of lager liggen dan het terrein.

Testen (vanuit de hoofdmap, alleen Node nodig):

```bash
node test/terreinveld.js
```

De test bevat 41 controles:
- de hoogtes uit Unity: weghoogte min 5 cm, marge, talud van 1 op 1,5, zeshoekige kop, verdiept, ongelijkvloers;
- een raster van 1482 driehoeken in zes opstellingen;
- elk stukje exact vlak;
- geen kieren tussen de stukjes;
- ongeveer 15 ms per opstelling.

## Wat het doet

- **Op een niveau.** Een weg of pad op een eigen niveau zet de grond onder de weg plus een marge (`hw`) op weghoogte, 5 cm onder het wegdek.
- **Talud.** Daarbuiten loopt de grond onder `k` terug naar het terrein (standaard 1 op 1,5, 34°): een dijk als de weg hoger ligt, een uitgraving als hij lager ligt. Het talud reikt tot 21 m naast de weg (`min(14/k, 40)`).
- **Koppen.** Een doodlopend eind, een bocht of een splitsing krijgt een zeshoekige kop met de zijden recht tegenover de buurvakken. Een klein knikje in een gebogen weg krijgt een bijna ronde kop, zodat er geen wig ontbreekt.
- **Volgorde.** Eerst de verhoogde wegen (de hoogste wint), dan de verdiepte (de laagste wint).
- **Gewone wegen (flats).** Gewone wegen in de buurt houden hun hoogte, dus een talud loopt nooit over een kruispunt.
- **Bruggen.** Ligt een verhoogde weg over een gewone weg, dan loopt de grond als een bak onder de brug door. Een verdiepte weg onder een gewone weg blijft diep.
- **Terrein ongemoeid.** `cells.terr` verandert niet. Als je een weg weghaalt, komt het terrein dus vanzelf terug; `preLevel` uit Unity is hier niet nodig.

`cutTriangle` tekent het veld exact. Het rekent het veld in dezelfde volgorde als `at()` op stukjes van een driehoek, en elk stukje is één vlak. Er wordt alleen gesneden waar iets verandert, en stukjes in hetzelfde vlak gaan daarna weer samen. Zo worden taluds strakke vlakken met rechte randen, net als in Unity. Rond een weg komen er ongeveer een kwart meer driehoeken bij.

## Aansluiten in `07b-terrein.js`

`build.js` voegt de bestanden in `src/js/` op naam samen, dus `07a-terreinveld.js` staat al vóór `07b-terrein.js`, binnen dezelfde omsluitende functie.

**1. Eén veld, gevuld na het bouwen van de wegen.** Doe dit in `terrRoadsChanged`, nadat `tRoadSegs` gevuld is:

```js
const tField = makeTerrainField();   // bij de andere constanten
// in terrRoadsChanged, na de lus die tRoadSegs vult:
tField.fromRoadSegs(tRoadSegs, (x, z) => terrainHeightAt(x, z));
```

`fromRoadSegs` maakt knopen van de uiteinden; die worden op 10 cm samengevoegd. Een knoop ligt op een niveau als de weg daar meer dan 30 cm boven of onder het terrein ligt. De andere wegen in de buurt worden flats. Voor de breedte geldt `hw = edge + 0,9` (`s[8]`); zo komt hij uit op stoep plus 1,5 m, net als `WalkHW` in Unity.

Heeft de webversie zelf een wegengraaf met niveaus, gebruik dan liever `tField.fromGraph(nodes, links)`:
- `nodes` is een Map van id naar `{ x, z, h, lev, hw, flatHW, head }`;
- `links` is een lijst `[[a, b], …]`.

Dan bepaal je zelf welke knoop op een niveau ligt (Page Up/Down, zoals `DragLevel` in Unity).

**2. Low poly tekenen (`lpMesh`).** Vraag per driehoek eerst de driehoek zonder wegen op, en laat het veld hem snijden:

```js
const tri = lpTri(q, r, w.x + Math.cos(a), w.z + Math.sin(a), false);   // [[x, z, h], …] zonder wegen
const cut = tField.cutTriangle(tri[0], tri[1], tri[2], (A, B, D, slope) => addTri(A, B, D, slope));
if (!cut) addTri(...lpTri(q, r, w.x + Math.cos(a), w.z + Math.sin(a), true));   // geen weg in de buurt: zoals nu
```

Gebruik voor `addTri` het bestaande stuk dat normaal, kleur en `pos`/`col` vult. `slope` zegt of het stukje op een talud ligt. Wil je kale aarde alleen op een talud steiler dan 40° (`SteepUp` in Unity), kijk dan naar de normaal; het huidige `steep` doet dat al.

**3. Lopen en hoogte opvragen (`lpHeight` met `roads`).**

```js
const h = tField.at(x, z, lpHeight(x, z, false));
```

Omdat elk getekend stukje exact in het vlak van het veld ligt, valt de gevraagde hoogte samen met wat je ziet.

**4. Hoog en normaal (glad terrein).** Gebruik in `chunkFin` `tField.at(x, z, b)` in plaats van `roadAdjust(...)`, voor de punten waar `tField.nearAny(x, z, 0)` waar is. Daar is het talud dan wel zacht bemonsterd (op 1 of 2 m) in plaats van strak.

**5. Schuifje Talud.**

```js
tField.setK(1 / 1.5);
```

Gebruik `1` voor 45°, `1 / 2` voor 27°. Teken daarna de stukken langs de wegen opnieuw, zoals `terrRoadsChanged` dat doet.

**6. Gras onder het wegdek.** `tField.onRoad(x, z)` zegt of een punt onder een wegdek ligt. Daar kan het tekenen overgeslagen worden.

## Verschillen met Unity

- **Doorlopend veld.** Een weg graaft pas in als zijn wegdek onder het terrein ligt, en een kop ligt net als de weg 5 cm onder het wegdek. In Unity zat waar een verdiepte weg het terrein raakt een sprongetje van 5 cm. Deze aanpassing kan ook terug naar Unity.
- **Rechte einden.** Een gewone weg heeft rechte einden in plaats van ronde (afstand: de grootste van opzij en voorbij het eind). Zo bestaat het veld helemaal uit vlakken.
- **Bekend trapje.** Waar een helling een gewone weg raakt, zit onder het wegdek een trapje van hooguit 25 cm. Dat komt door de regel "niet op het wegdek van een weg op een niveau dat niet hoger ligt" (`onLevel <= hr + 0.3`). Unity heeft het ook; het valt onder de weg weg.
- **Niet overgezet.** De geul, koker en portalen van een brug (`Carve`, `BridgeBlock`) en de vlakke ondergrond onder een brugvak zitten er niet in. Die hangen aan het brugsysteem van Unity. De webversie heeft haar eigen dekken op pijlers (`deckAt`, `isDeck`).
- **Plat raster.** Unity rekent op de bol; hier is het een plat raster met x, z in meter. De zes richtingen van de kop zijn de buren van het webraster: q+1 ligt op 0°, de andere op elke 60° verder.
