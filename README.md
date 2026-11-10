# Raatstad

(Voorheen "Hexstad". Alles heet nu Raatstad; opslagsleutels zijn `raatstad-…`, oude `hexstad-…`-sleutels worden bij het starten één keer overgenomen. De repo heet `joepk1989/raatstad-web` (naast `joepk1989/raatstad-unity`).) Online: https://joepk1989.github.io/raatstad-web/ (GitHub Pages, bouwt vanzelf bij elke push via `.github/workflows/pages.yml`).

3D-stadsbouwer in de browser op een zeshoekraster, op ware grootte (vak 15,6 m breed, zijde 9 m). Gebouwd met three.js r128, zonder build-tools behalve één klein script.

## Indeling van de repo

| Map | Wat |
|---|---|
| `src/` | de webversie: `index.html`, `style.css`, `js/NN-naam.js` (zie hieronder) |
| `build.js` | bouwt `dist/raatstad.html` (één bestand) of met `--site` de volledige pagina voor GitHub Pages (`site/`) |
| `assets/` | geluiden |
| `test/` | testscripts voor de logica (zie `test/README.md`); `test/visueel/` voor screenshots en de overlapcontrole op telefoon |
| `docs/ontwikkeling/` | bewaarde screenshots en testbeelden van de ontwikkeling, met een overzicht in de README daar |
| `lab/interface/` | het interfacelab waaruit de bediening (v100) komt |
| `unity/` | de Unity-poort met bolvormige planeet (eigen `unity/README.md`) |
| `.github/workflows/` | publiceert de site op GitHub Pages bij elke push |

`dist/`, `site/`, `node_modules/` en `test/visueel/uit/` staan niet in git.

## Interface: standen en telefoon

- **Zweven** (bouwmodus boven de stad): bovenbalk met score, klok, geluid en Menu; onderaan snelbalk; gereedschap links en Bouwen/Lopen rechts.
- **Lopen** heeft drie handen. *Kijken* en *slopen* zijn minimalistisch (bijna niets in beeld; met de hamer toont een label wat je weghaalt, `eraseTarget` in `12`); alleen *bouwen* toont het palet, de bouwgereedschappen en de laagkiezer. Dit staat in `style.css` onder "Minimalistisch beeld tijdens het lopen".
- **Telefoon** (onderaan `style.css`): alles wat je bedient staat onderaan, in elke stand op dezelfde plek: snelbalk (alleen bouwen) helemaal onder, daarboven links de handen, in het midden het menu (☰) en rechts de Bouwen/Lopen-schakelaar, daarboven de joystick en de knoppen Spring en Bouw/Sloop. De hoogte van die rij volgt uit `--base`. Controleer elke wijziging met `test/visueel/overlap-mobiel.js` op 390x844, 360x640, 320x568 en 844x390.

## Wegstijl: alles schuin

Elke stoeprand is een schuine rand (`slopeInto`, `KERB_IN` 15 cm tot `KERB_OUT` 45 cm naast het asfalt) en nooit een verticale wand: rechte wegen, bochten, doodlopende koppen, de rotonde (buitenrand, overrijdbare rand, eiland), de middenberm van een laan en smalle paden. Een nieuw wegelement moet `slopeInto` gebruiken en de stoep laten beginnen bij `KERB_OUT`. Aansluitingen op de rotonde worden dwars op de weg gemeten (`inGap`), zodat de rotondestoep evenwijdig aan de wegstoep eindigt.

## Werken aan de code

- `src/index.html` – de pagina (HUD, menu's, schets-app)
- `src/style.css` – alle stijlen
- `src/js/NN-naam.js` – de spellogica, in volgorde van nummer. Alle bestanden delen één scope (ze worden bij het bouwen achter elkaar in één functie gezet), dus `const R` uit `01-raster-data.js` is overal beschikbaar.
- `assets/` – geluiden

Wat er in de bestanden zit:

| Bestand | Inhoud |
|---|---|
| `01` raster-data | rastermaten, bouwtypes, `VEC_TOOLS` (weg, brede weg, laan) |
| `02` scene | three.js, licht, materialen |
| `03` gebouwen | holle gebouwblokken met ramen, deuren, trappen |
| `04` wegen-klassiek | alleen nog de hoogtes (stoep 25 cm, asfalt 12 cm) en een punt-in-veelhoek-test |
| `05` blokken-netwerken | voetgangersnetwerk, bouwblokken |
| `06` laan-terrein | uitgraving, verhoging, hellingen, brug |
| `07` driehoeken-vectorwegen | **het wegsysteem**: de wegengraaf, kruisingen, bochten, ronde koppen, stoepen, markering, verkeerslichten, en `convertCellRoads` voor oude steden |
| `08` schets-modules | schets-app, modules, randcodes, delen als bestand |
| `08b` bouwdelen-modules | de zes oude bouwdelen als schetsmodules (alleen uiterlijk), eenmalig aan de lijst toegevoegd |
| `08c` modules-v2 | **modules v2**: het model (verdiepingen, vloeren, muren met openingen, trappen, daken, voorwerpen), de bouwer naar 3D met botsing, plaatsing in de stad, randcodes, 3D-miniaturen |
| `08d` module-maker | **de Raatmaker**: bovenaanzicht en 3D, verdiepingen, gereedschap met iconen, bibliotheek, delen |
| `08d9` bibliotheek-uitbreiding | 35 basisgebouwen (voorzieningen, sport, wonen, werken), inrichting voor alle standaardmodules, niets bij de trappen |
| `08e` modules-bibliotheek | de 152 standaardmodules, gemaakt met een kleine bouw-API op het v2-model |
| `09` detailniveau-botsing | detailniveau voor grote steden, botsing |
| `10` mensen | voetgangers op stoepen en paden, deuren aan getekende wegen |
| `11` autos | auto's en hun rijgedrag op de wegengraaf |
| `12` bouwacties-schoonheid | plaatsen en weghalen, schoonheidsscore |
| `13` camera-modus-geluid | camera, loopmodus, geluid |
| `14` invoer-slepen | muis en aanraking, wegen slepen |
| `15` ui-palet | palet en menu's |
| `15b` sneltoetsen | toetsen in bouwmodus (schuiven, draaien, categorie, gum, penseel…) en het hulpvenster (?) |
| `16` start | opstarten |

## Het wegsysteem

Wegen zijn vrij getekende lijnen (`cells.paths`). Typen: `weg` (9 m), `brd` (brede weg, 13 m), `laan` (met middenberm en bomen), `snel` (snelweg 2×2 met vluchtstrook en middenbarrière), `klink` (klinkerstraat, stapvoets, geen lichten), `fiets` (fietspad), `pad`, en `rot` (rotonde: één punt, het midden). Je sleept recht van beginpunt naar eindpunt (vasthouden = hoekpunt, voor een bocht in één sleep); de punten liggen op zeshoekmiddens. Een rotonde zet je met een klik.

- **Graaf** (`vecGraphOf`): de lijnen worden bij kruisingen en T-aansluitingen doorgeknipt tot takken tussen knopen. Knopen binnen 7 m smelten samen. Een lijn die **zichzelf** kruist of op zichzelf uitkomt wordt ook geknipt, en een **gesloten lus** (eindpunt = beginpunt) wordt in tweeën gedeeld, met afgeronde hoeken rondom.
- **Kruising, bocht en doodlopend eind** krijgen elk hun eigen vorm: een kruisingsvak met **ronde stoephoeken** (een boog die aan beide stoepranden raakt), **zebrapaden en stopstrepen** bij verkeerslichten, een afgeronde stoep om een bocht, en een **ronde kop** op een doodlopend eind (`vecHead`).
- **Rotonde** (`ROT`, `clipCircle`): wegen houden op bij de rijbaan van de rotonde; waar ze de cirkel raken komt een aansluiting. De rijbaan bestaat uit eenrichtingstakken (`ring`, tegen de klok in van boven gezien). Eiland met overrijdbare klinkerrand en een boom, stoep rondom (open bij de wegen), haaientanden bij elke inrit. Auto's op de rotonde hebben voorrang; wie erop wil, wacht bij de haaientanden.
- **Snelweg**: geen stoep maar een grasberm en vangrail; geen verkeerslichten (een aansluiting is invoegen). Een andere weg die hem **kruist** gaat er altijd met een **viaduct** overheen: 7 m boven de snelweg met opritten van 55 m (`pathProf`), een brugdek zonder wand tot de grond (`roadSpan`), geen dijk onder de overspanning en een pijler op de middenberm. Auto's rijden er 130 km/u (en kijken verder vooruit om op tijd te remmen).
- **Auto's** rijden rechts op een rijstrook van de tak, kiezen op een knoop een volgende tak (niet tegen de rijrichting in op een rotonde), stoppen voor verkeerslichten en keren in de ronde kop.
- **Mensen** lopen over de stoepen (niet langs de snelweg of over de rotonde-rijbaan) en komen binnen via voordeuren die aan de dichtstbijzijnde stoep koppelen.
- **Vakken** onder een weg zijn niet bebouwbaar; een weg stopt vóór gebouwen en water.
- **Oude steden**: vakwegen, vak-lanen, bruggen en wegen onder een tunnel worden bij het laden omgezet in getekende wegen (`convertCellRoads`).


Bouwen:

```
node build.js
```

Dat maakt `dist/raatstad.html` (één bestand, zelfde als de gepubliceerde versie) en kopieert de geluiden ernaast. `dist/` staat niet in git.

## Terrein en wegen op hoogte

- **Terrein is een eigen laag** (`07b-terrein.js`): één hoogte per vak in `cells.terr` (`'q,r'` → meter, 0 … 30), opgeslagen als `__g`. Oude steden met opgestapelde "verhogingen" worden bij het laden omgezet (3 m per verhoging, `terrMigrate`).
- **Het landschap**: tussen de middens van drie buurvakken loopt het vlak lineair (driehoeksrooster, geen zeshoekranden), daarna gaussisch vervaagd (σ 3 m) op een vast wereldrooster. Een vak waar iets op staat is een vlak plateau op zijn eigen hoogte met een stenen **sokkel** tot op de grond (`terrPlinth`): strakke rand, en tussen twee bebouwde vakken van verschillende hoogte een keermuur. Langs een weg sluit het maaiveld aan op de weg, gemeten vanaf de weg zelf (`roadAdjust`): een ingraving of dijk die evenwijdig aan de weg loopt.
- Het landschap is opgedeeld in **stukken van 32 × 32 m**; een bewerking rekent en tekent alleen de stukken die het raakt. `terrainHeightAt` is het veld zonder wegen (daar volgen de wegen op), `terrGround` het getekende maaiveld (daar lopen mensen en de speler op).
- **Alles op een vak staat op de terreinhoogte** (`gH(q, r)`): de kolom (`buildColumn`) en modules worden opgetild, hun botsvlakken verschoven (`shiftCol`). Stapels blijven intern relatief (vanaf 0); `colTopW` geeft de echte hoogte.
- **Boetseren** (`14b-boetseren.js`, Terrein): Ophogen, Afgraven, Egaliseren, Gladstrijken en Helling trekken. Muis ingedrukt houden en slepen (touchscreen: even vasthouden), Shift draait ophogen/afgraven om, `[` `]` maakt het penseel 1, 7, 19 of 37 vakken. Bebouwde vakken blijven liggen. Een ring toont het penseel, een label de hoogte, en hoogtelijnen (elke 1,5 m, dikker elke 7,5 m) het reliëf. Een geplaatste module maakt het terrein onder zich vlak.
- **Wegen volgen het terrein** (`pathProf` in `07`): het maaiveld onder de middenlijn, uitgevlakt over ±6 m. Tijdens het slepen maakt `E`/`Q` (of Page Up/Down, scrollwiel, ▲▼) de weg 1,5 m hoger of lager boven het terrein (`path.y`, per punt, tot 12 m).
- **Dek op pijlers** (`isDeck`, `pathBuild` in 07): een weg op een vaste laag, een dakweg, een weg over een andere weg, of een weg 3 m en meer boven het maaiveld is een dek: een rand van 1,3 m, een onderkant, en om de 12 m een zeshoekige pijler tot de grond of het dak eronder (niet midden op een lagere weg). Geen dijk en geen wand tot de grond meer; het maaiveld blijft liggen (`roadAdjust` slaat zulke stukken over). Een weg 1,5 m boven het terrein is nog een dijkje. Wegen op verschillende hoogte over elkaar worden **niet** met elkaar verbonden.

**Terreinstap** (Instellingen, standaard 3 m): Ophogen en Afgraven klikken vast op veelvouden van 3 m (een verdieping), 1,5 m of vrij. Een klik is meteen één stap voor het hele penseel; ingedrukt houden spaart de beweging op (6 m/s in het midden, aan de rand trager) en zet een volgende stap zodra die vol is. Egaliseren rondt het gemiddelde af op de stap. Gladstrijken en Helling trekken blijven vrij. Test: `test/visueel/terreinstap.js`.

## Instellingen

Menu → Instellingen (`15c-instellingen.js`, bewaard in `localStorage` `raatstad-set`): **terrein** hoog (1 m rooster), normaal (2 m) of low poly (4 m, platte vlakken; het snelst), **schaduwen** zacht, eenvoudig of uit, **beeldscherpte** scherp, normaal of snel, **wolken**, en verder raster, hoogtelijnen, penseel, tijd, mensen, auto's en geluid.

**Beeldscherpte Automatisch** zakt in stapjes (tot 60 %) als de beeldtijd te lang wordt en klimt terug als het weer snel gaat (niet bij software-rendering). Een andere pixelverhouding maakt het canvas leeg, dus de aanpassing gebeurt in de hoofdlus (`16-start.js`) vóór het tekenen; erna gaf het tijdens het bouwen een beeld lang een leeg scherm (knipperen). Test: `test/visueel/knipperen.js`.

## Gelaagde stad: modules op elkaar

Een geplaatst exemplaar heeft een laag `lv` (0 = op de grond, 1 = op 3 m, enzovoort). **Klik op het dak** van een module en de gekozen module komt erbovenop; klik op de gevel en je wisselt zoals voorheen naar de variant die het best aansluit. De spookmodule laat zien waar hij komt. Regels (`mv2CanPlace` in `08c`):
- op elk vak van het gebied moet precies op die laag een module eindigen (geen zwevende of half ondersteunde modules);
- op een schuin dak kun je niet bouwen;
- de bovenkant van een module is `lv` + aantal verdiepingen; een bovenste laag met alleen dakvloer telt niet mee en wordt **verborgen zodra er iets op staat** (`noRoof` in `mv2Build`). Zo kijk je vanaf een galerij in de winkel eronder.

Een gestapelde module krijgt een plafond onder zijn begane grond (`stacked`). Groen op een dak (boom, struik, plantenbak) telt niet als verdieping; staat er een module op, dan verdwijnt het groen daaronder, en staat er hoger een module boven het vak (overdekte straat), dan wordt een boom een struik. Lopen en botsing werken per laag (`modCols`, `shiftCol`). Buren voor de randcodes zijn alleen modules op dezelfde laag. De gum haalt het exemplaar weg waar je op klikt (het bovenste).

## Van bouwen naar lopen: vallen

Wissel je naar lopen, dan val je recht naar beneden vanaf de plek waar de camera hangt (hooguit 30 m boven wat eronder ligt): een dak, een galerij, de straat (`dropPlayer` in `13`). Je kijkt dezelfde kant op als de camera. Doorzichtig glas telt niet als raakpunt. Na de landing kijk je rustig weer vooruit. Hangt de camera boven water of buiten de wereld, dan kom je zoals vroeger op het dichtstbijzijnde vrije vak terecht.

## Voetgangers door modules

Het loopnetwerk van de voetgangers (`buildWalkGraph` in `10`) krijgt uit `08f` knopen voor elke module: per exemplaar, per verdieping en per vak zes knopen, één per zijde (sector), op het zwaartepunt van de vloer in die sector. Op een galerij loopt iemand zo netjes rondom, door een winkel langs de muren. Twee knopen zijn verbonden als de rechte lijn ertussen geen muur kruist, of alleen muren met een deur, poort of open doorgang; dan loopt het pad door het midden van die opening (`route`). Hek en haag tellen als muur. Er moet overal vloer onder het pad liggen (geen vide, trapgat of weggehaalde lichtkap). Trappen, hellingen en de schans verbinden de verdiepingen; een plat dak waar niets op staat is beloopbaar (dakterras, passage over de daken). Een opening in de buitenrand op de begane grond is een ingang (`mdoor`), die net als een voordeur aan de dichtstbijzijnde stoep wordt gekoppeld (ook midden op een lang recht stuk straat). Langwerpige voorwerpen (stelling, toonbank, bank, fietsenrek) botsen als een lijnstuk langs hun lengte, niet als een grote cirkel die een deur dichtzet. Ook de inrichting staat in het netwerk als hindernis: langwerpige voorwerpen als lijnstuk, ronde (fontein, tafel, plantenbak, zuil, boom, prullenbak) als kruis, zodat geen pad door een stelling loopt. Stukken netwerk waar je niet uit kunt (een winkel zonder deur naar buiten) tellen niet mee als startplek. Winkels trekken bezoekers: per winkelmodule komen er mensen bij.

De modules in de familie Winkelcentrum hebben daarom twee achterdeuren tegenover de voorkant (die bij rug-aan-rug winkels op elkaar vallen), het dakpaviljoen een open terras aan de voorkant, en de doorgang open kiosken naar de buren. In het voorbeeld-winkelcentrum lopen voetgangers van de straat de opritten op, door de tunnels de entreehal in en via de trappen naar de straat op de tweede verdieping. De dichte kern op de begane grond is (zoals in de schets) niet van buiten te bereiken.

## De stad

**Menu → Raatstad** laadt de ene voorbeeldstad met alles erin (`08g-raatstad-stad.js`, vast, geen toeval): een rotonde in het midden, zes wegen recht naar buiten (twee brede), een binnenring, de ringweg (laan met bomen, straal 270 m), een fietsring erbuiten en een snelweg langs de oostkant waar de weg met een viaduct overheen gaat. Binnen de binnenring het centrum met hoogbouw en pleinen; daaromheen zes buurten, één per taartpunt: het winkelcentrum (de SketchUp-schets, 120° gedraaid zodat hij langs de ring past) met parkeren en markt; de woonwijk met rijhuizen, villa's, een woonerf en een hofje; openbaar (school, bibliotheek, gemeentehuis, kerk, ziekenhuis, museum, station, stadsplein); park en water met een meer waar de weg als brug overheen gaat, voetpaden en een voetbrug; terrein met een dijk waar de weg overheen klimt en villa's en tuinen ernaast; werken met fabriek, hallen, parkeergarage en de oude bouwblokken (looppaden, tunnel, tribune, zuilen, hof). Modules uit de bibliotheek staan met de deur naar de dichtstbijzijnde straat (`toRoad`), een module van 7 vakken alleen waar al die vakken vrij zijn. De losse voorbeeldsteden (ringstad, dorpjes, blokkenstad …) zijn uit het menu; de code en `doAct('sample')` enzovoort bestaan nog voor de tests. De loopwereld voor de speler reikt tot 450 m van het midden.

**Menu → Filestad** (`08h-filestad.js`) is een klein stadje waar het verkeer vastloopt: drie rechte wegen kruisen elkaar in het midden (één kruising met zes takken, dus drie lichtgroepen en twee derde van de tijd rood), een kleine ringweg eromheen stuurt alles steeds weer naar die kruising, dicht bebouwd met woningen en kantoren. Het verkeer is er twee keer zo druk als normaal: `cells.druk = 2` (bewaard als `__d`) vermenigvuldigt in `cars.rebuild` zowel het gewenste aantal auto's als het plafond per meter weg. Na een halve minuut staat er een file, en dan komt de Hulk.

## Bediening (v100)

Ontworpen in het interfacelab (`lab/interface/`, voorbeeld "Voorstel voor Raatstad"): bij bouwen en lopen staat alles op dezelfde plek (`15d-bediening.js`, HTML in `index.html`, stijlen onderaan `style.css`).

- **Linksboven**: naam, aantal blokken en schoonheid; daaronder de ongelukjes-teller. **Rechtsboven**: één knop met de tijd en het weer (het paneel erachter heeft ook de tijdsnelheid, het weer en raster/mensen/auto's), geluid en menu. Roekeloos rijgedrag staat in Instellingen.
- **Snelbalk 1–9** onderaan in het midden: negen zeshoekige vakken, ook tijdens het lopen. Cijfertoetsen, klik of het scrollwiel kiezen een vak; tijdens het lopen neem je het blok dan meteen in je hand. Wat je kiest in **Alle blokken** (Tab, of de knop erboven) komt in het gekozen vak; een blok dat al in de balk staat wordt daar gekozen. De balk wordt bewaard (`raatstad-snelbalk`). Standaard: weg, pad, woning, kantoor, dak, park, water, ophogen, module.
- **Alle blokken** is de oude catalogus met tabbladen, maar nu een paneel dat boven de snelbalk openklapt en na een keuze dichtgaat (ook Escape of een klik in de stad). De zoekbalk en filters bij modules staan erin; `/` opent hem meteen bij het zoekveld.
- **Gereedschap linksonder**: draaien (R), spiegelen (F), gum (Delete) en ongedaan maken (Ctrl+Z). Tijdens het lopen staan de handen erboven (kijken, bouwen, hamer; Q).
- **Ongedaan maken**: na elke wijziging wordt de stad (de tekst die toch al bewaard wordt) in een rij van 15 momentopnamen gezet; wijzigingen binnen 0,7 s tellen als één stap (slepen, boetseren). `parseCity` in `01` leest zo'n tekst terug.
- **Opties bij het gereedschap** (`15k-gereedschapopties.js`, idee uit de Unity-versie): bij de terreingereedschappen staan **Stap** (3 m / 1,5 m / vrij), **Penseel** (1/7/19/37 vakken) en **Hoogtelijnen** meteen boven Alle blokken. Op de telefoon staat de balk op één regel boven de rij met gereedschap en Bouwen/Lopen, zonder Hoogtelijnen. Het zijn dezelfde instellingen als in Instellingen (`SET_ROWS`), dus ze worden ook bewaard; meer gereedschappen met opties: een regel in `OPTS`. Test: `test/visueel/gereedschapopties.js [breedtexhoogte]`.
- **Bouwen/lopen**: een schakelaar rechtsonder (L).
- **Laagkiezer** aan de rechterrand: kies op welke laag een module komt (Page Up/Down, of klik; ook **Ctrl+scrollen**, bij elk gereedschap, net als de laagkiezer zelf). Alles boven die laag wordt weggelaten, als een doorsnede op `laag × 3 m + 2,65 m` (eerst was het glas, maar bij veel lagen werd dat een troebele brij). Je bouwt tot **50 lagen** (150 m, `MV2.STAD_LV`; één module in de Raatmaker blijft hooguit 8 lagen, `MV2.MAX_LV`; de oude blokken tot 150 m, `MAX_H`). De kiezer loopt tot en met de eerste vrije laag en is een schuiflijst (9 lagen in beeld, op de telefoon 8; muiswiel of vegen) die de gekozen laag in beeld houdt. Test: `test/visueel/lagen50.js [breedtexhoogte]`.
- **Op hoogte bouwen met een oud blok**, los van alles (`vulBlokken`/`metVulling` in `05-blokken-netwerken.js`, november 2026): kies je een laag (Ctrl+scrollen of de laagkiezer) en klik of sleep je op een **leeg** vak met een blok dat volgens `RULES` op een ander blok mag staan (Steeg, Blok, Helling, Trap, Trappad, Tribune, Opgang, Tunnel, Muur, Zuilen, een gebouw …), dan komen de nodige blokken er vanzelf onder — in één klik, net als bij een module. Kan een soort sowieso niet op een blok staan (Pad, Park, Weg, Water …), dan wordt de gekozen laag genegeerd en komt hij gewoon op de grond; te hoog (boven de 150 m) geeft een duidelijke melding. Steeg blijft daarnaast ook vanzelf aansluiten op een buur zonder dat je een laag hoeft te kiezen (zie hieronder). Test: `test/visueel/vulblokken.js`.



Achter de tijdknop rechtsboven staat **Weer** met zeven knoppen: zon, bewolkt, regen, onweer, mist, sneeuw en wisselend. Met **O** ga je naar het volgende weer (Shift+O naar het vorige), ook tijdens het lopen; je keuze staat ook in Instellingen en wordt bewaard (`raatstad.weer`). Bij wisselend volgt het ene weer vanzelf op het andere (zon → bewolkt → regen → onweer …), sneller als de tijd sneller loopt en niet als de tijd stilstaat (`13b-weer.js`).

- **Lucht en licht**: bewolking maakt de lucht grijs en de zon zwakker (minder schaduw), 's nachts geen sterren of maan. Bij donker weer gaan de lampen binnen eerder aan. Mist zet de horizon dicht; in bouwmodus blijft je eigen stad zichtbaar. Alles verloopt in een paar seconden (`WXK` in `02`, gemengd in `DN.apply`).
- **Regen en sneeuw** zijn deeltjes in een doos rond de camera (9000 strepen, 7000 vlokken), helemaal op de grafische kaart berekend. Bij onweer is de regen harder en schuin, en flitst de lucht met daarna de donder (verder weg is later en zachter).
- **Droog onder een dak**: elke halve seconde wordt de stad van bovenaf als hoogtekaart getekend (alleen bij nat weer). Wat daaronder ligt, krijgt geen regen en geen sneeuw: onder een galerij, in de hal, onder een boom.
- **Nat en sneeuw op de stad**: alle gewone materialen krijgen een stukje shader (`wxPatch` in `02`). Wat naar boven kijkt en open ligt, wordt bij regen donkerder en glanzend (de lucht spiegelt in de straat) en bij sneeuw wit, met wat vlekken. Na de regen droogt de stad op; sneeuw blijft liggen en smelt langzaam, sneller in de regen. Water doet niet mee (`userData.noWx`).
- **Geluid**: gesis en geruis van regen, wind bij storm en een beetje bij sneeuw, donder. Vogels zwijgen bij regen.
- **Voetgangers**: bij regen steekt ruim de helft buiten een paraplu op, wie er geen heeft loopt sneller. Ze gaan liever naar binnen of onder een overkapping en blijven langer binnen. In de sneeuw lopen ze iets langzamer.

## Bouwen: wegen klikken, wegen door bebouwing, voorbeeld, parken, daken

**Wegen klikken (v103).** Met een getekende weg gekozen zet de eerste klik een knooppunt (gele zeshoek). Daarna laat elke muisbeweging het stuk weg van dat knooppunt naar het vak onder de muis alvast zien — echt gebouwd als tijdelijk pad (`vecChain.tmp`, `buildPathNet(true)`), dus met stoep, markering en bochten — en de volgende klik legt het vast en maakt dát vak het nieuwe knooppunt. Zo klik je een hele weg met bochten bij elkaar; wat onder de weg stond gaat weg (Ctrl+Z zet terug). Stoppen: nog eens op het knooppunt klikken, rechtermuisknop, Esc, ander gereedschap, een andere stad of naar lopen wisselen. Begin je in een buurvak van het uiteinde van zo'n weg, dan gaat die weg verder in plaats van een nieuwe. Slepen werkt nog net zo (slepen beëindigt een klikreeks). Code: `vecChainClick/Hover/End` in `14-invoer-slepen.js`, aangeroepen vanuit `place()` en `updateGhost()` in 12.

- **Een weg met één klik**: met een wegtool op een vak klikken maakt een stukje weg. Eindigt er in een buurvak al zo'n weg, dan loopt die door tot dit vak; anders begint hier een weg van twee vakken in je kijkrichting (R draait). Klik vak voor vak om door te trekken (`vecClick` in `14`).
- **Slepen door bebouwing**: een weg stopt niet meer bij een gebouw. Wat onder de verharding komt (gebouwen, blokken, modules) verdwijnt bij het loslaten; water, een uitgraving en het terrein blijven (brug, klim). Ctrl+Z zet het terug (`vecClearUnder`). Andersom niet: op een weg kun je niet bouwen.
- **Voorbeeld**: bij een wegtool zie je de strook die een klik maakt, bij de rotonde de ring; bij het terrein doorzichtige plaatjes op de nieuwe hoogte onder het penseel (`terrPreview` in `14b`), bij de helling een lijn van A naar B.
- **Parken**: klik met het park op een park voor een andere inrichting: bomen, bankjes met lantaarns, bloemperken, een vijver met riet, een speeltuin (`park1`…`park4`, zie `06`).
- **Daken**: het schildak wordt op 2,5 m afgesneden (plat stuk bovenop, `ROOF_CUT` in `05`) en krijgt een schoorsteen aan de achterkant; de dakkapellen zijn ingekort.
- **Terrein**: links ophogen, rechts afgraven (of andersom bij afgraven); egaliseren links naar de gemiddelde hoogte onder het penseel, rechts naar de hoogte van het startvak. Sneeuwvlekken zijn zeshoekjes (`wxHex` in de shader).

## Mensen: low poly, groeten, praatjes, schrikken

De mensen zijn low poly (weinig segmenten, platte vlakken) met meer gezicht: ogen met glimlichtjes, wenkbrauwen, wangen, mond; sommigen een bril of baard, en wie groet of kletst lacht. Wie elkaar tegemoet loopt zwaait soms even en kijkt de ander aan; af en toe blijven twee mensen staan voor een praatje (naar elkaar gedraaid, knikkend). Loop je er zelf langs, dan word je gegroet. Wordt iemand aangereden (of komt de Hulk langs), dan schrikken de omstanders: handen omhoog, even stilstaan, kijken (`social`, `startle` in `10`). Bij een aanrijding klinkt een vrouw hoger, een kind nog hoger en een oudere lager (`sound.grunt(…, who)`).

## De Hulk

Staat er een file (vijf of meer auto's die bij elkaar al een tijd stilstaan, `cars.jams()`), dan komt een reus van 4,5 m aangelopen (`11b-hulk.js`), tilt de auto's één voor één op en slingert ze weg (`cars.toss`: een boog door de lucht, tollend, de wielen blijven eraan; na de landing glijdt de auto nog even en begint ergens anders opnieuw). De omstanders schrikken, de file is opgelost, de Hulk loopt weer weg. Hooguit één keer per anderhalve minuut; `__hulk.summon()` roept hem voor een test. Een file is: vijf of meer auto's binnen 22 m van elkaar die elk al meer dan 6 s stilstaan (`c.still`, om welke reden ook: rood licht, voorrang, een keerlus, iemand ervoor).

## Deuren

Elke voordeur (huizen en kantoren uit `03-gebouwen.js`, deuropeningen van modules uit `08c`) heeft een deurblad dat naar binnen openzwaait zodra jij of een voetganger binnen 2,2 m komt, en weer dichtgaat als iedereen weg is (`09b-deuren.js`, één `InstancedMesh` voor alle bladen, `window.__doors`). Het scharnier zit links gezien van buiten; de deur blokkeert niet, de opening in de muur blijft vrij. Deuren horen bij een eigenaar (een vak of een module-exemplaar) en gaan weg als die herbouwd wordt. Binnen onder een dak valt geen zonlicht, dus het blad licht zichzelf zacht bij in zijn eigen kleur (eigen `onBeforeCompile` bovenop de weer-shader). Let op in r128: `setColorAt` maakt de kleurbuffer zo groot als `count`, dus die buffer wordt zelf aangemaakt.

## De speler heeft een lichaam (v105)

Tijdens het lopen heeft de speler een eigen pop in dezelfde `people`-code (`PB` in `10-mensen.js`): romp, armen, benen met echte voetstappen (`stepFeet`) en een hoofd net achter de camera (geen hoofd in beeld, wel in de schaduw). Het lichaam staat iets achter de camera, verder naarmate je omlaag kijkt. Met de hamer of een blok in de hand is de rechterarm de mouw met hand in beeld (`armG` in `13`); anders kijk je gewoon. Raakt een auto je (`hitPeople` → `people.hitPlayer`, alleen bij een rijdende auto > 9 km/u op jouw hoogte), dan neemt dezelfde ragdoll als bij voetgangers het over: `player.down`, de besturing is uit en de camera zit in het hoofd van het lichaam (`people.pbCamera`, gladgestreken). Na een paar seconden liggen komt hij op handen en knieën en dan overeind; daarna 3 s onkwetsbaar. Het telt als ongelukje (`auto`). Netjes rijdend verkeer stopt voor je; in de gekkenhuis-stand (`cars.reckless`) niet. Test: `python speler_val.py`.

## Ongelukjes en door iets heen lopen

Linksboven, onder de naam van de stad, telt een knop de ongelukjes met voetgangers (aangereden door een auto, gevallen, omver gelopen door de speler, geraakt door een geplaatst blok) en hoe vaak iemand door een muur of voorwerp heen liep (`INC`, `incident` en `throughCheck` in `10`). Een klik toont de laatste gebeurtenissen; **toon** vliegt erheen en zet een rode ring op de plek. **Op nul** zet de tellers terug. Valt iemand omdat jij de vloer weghaalt of een andere stad laadt, dan telt dat niet als ongeluk. Tijdens het tekenen van een weg blijven de voetgangers gewoon staan (alleen wie zijn plek kwijt is, begint opnieuw); ze lopen een deur in zonder te krimpen; over een brugdek (getekende weg over water) kun je lopen; binnen is het licht gedempt; auto's kruipen of 'spoken' nooit meer dwars door rijdende auto's heen.

Voetgangers lopen zelf niet meer door muren, inrichting of over de rand van een vloer: een stap die een muur op lichaamshoogte zou kruisen glijdt langs die muur (`wallStep`), en een stap de leegte in wordt niet gezet. Dat geldt ook voor duwen tussen mensen en uitwijken voor de speler. Wie een voordeur uitkomt, stapt eerst naar buiten en loopt zo nodig om de hoek van het eigen gebouw naar de stoep, niet dwars door de zijmuur. Loopt iemand toch klem (een paar seconden geen vooruitgang, of binnen een module heel lang onderweg naar dezelfde knoop), dan begint hij opnieuw bij de knoop waar hij heen ging. In het loopnetwerk ligt een hoekpunt om de kern van een galerij nooit op of tegen een dichte muur. Met `__INC.dbg = 1` (console) krijgt elke melding het gelopen spoor erbij; `__modDbg().whyBlocked` noemt nu ook de bron (module met naam en plek, blok, rand, weg) en `walkWalls(laag, x, z)` toont de muren zoals het loopnetwerk ze ziet.

## Spiegelen, nette aansluitingen en balustrades

- **Spiegelen** (toets F of de knop Spiegel naast Draai): een module wordt in spiegelbeeld geplaatst. De moduledata zelf wordt gespiegeld (`mv2Mirror` in `08c`: vloeren, muren, trappen, schans, daken en voorwerpen), zodat bouw, botsing en loopnetwerk vanzelf kloppen; het exemplaar onthoudt `mir`. Zo is één galerij-met-trap genoeg: gespiegeld staat de trap aan de andere kant.
- **Eén muur per rand**: hebben twee modules een muur op dezelfde rand, dan blijft er één over (`wallSkips`): een deur, poort of open doorgang wint van een raam, een raam van een dichte muur, verder de eerst geplaatste. Ook dubbele hoekposten verdwijnen. Dat voorkomt flikkerende, overlappende texturen en zorgt dat een deur tussen twee buren echt open is (ook voor de voetgangers).
- **Balustrades** (`buildRails`): langs elke buitenrand van een loopvlak (vloer of zichtbaar dak) boven de grond komt een hek van 1,05 m met botsing, tenzij er een muur staat of je er op dezelfde hoogte verder loopt (vloer, trap, helling). De oprit heeft een zichtbare leuning langs de zijranden.
- **Groen binnen**: een dak waar naast op die hoogte andere modules staan (een hal) krijgt een fontein en een klein groen eiland in een plein; een overdekt dak (straat met een laag erboven) een plantenbak. Bovenop blijft het groene dak met boom.
- Trappen sluiten in het loopnetwerk alleen aan de voor- en achterkant aan, niet opzij door de leuning.

## Winkelcentrum: de hex-modules uit de SketchUp-schets

De familie **Winkelcentrum** (categorie, `08e`) bouwt de tien bouwstenen uit `hex_mall.dae` na, elk met een functie; zijde +x is de voorkant of passagekant, de "kern" is de zeshoek van ¾ (straal 6,75 m) met een rand van 1,95 m eromheen:

| SketchUp | Raatstad | Betekenis |
|---|---|---|
| variable | `Winkelcentrum · winkel`, `· winkel · boeken`, `· horeca` | winkelblok: glazen pui met open front, dichte zijwanden, stellingen, toonbank, lichtreclame; plat dak met een groen dak (gras, boom, struiken) in de kern |
| recht | `· magazijn` | dicht betonblok met poort achter, stellingen |
| half | `· café · half` | halve zeshoek langs de lange diagonaal; de diagonaal is een glazen pui naar de passage, tafels binnen |
| afgesneden | `· winkel · afgesneden` | één zijde tot halverwege teruggezet; de schuine pui is de ingang |
| tunnel | `· doorgang` | passage van 9 m breed dwars door het blok, met een berging in elke punt |
| schans | `· oprit` | het hele vak is een helling naar de verdieping erboven (zie Schans in de maker) |
| space | `· dakpaviljoen` | teruggezette opbouw van ¾ met een terras van 1,95 m rondom (hek, tafels) |
| ring | `· galerij` | vloerring rond een vide met balustrade: zet hem op een winkel en je kijkt erin |
| trapring | `· galerij · trap` (gespiegeld geplaatst voor de andere kant) | onderaan alleen de trap (de vloer is het dak eronder), erboven de galerijring; trap van 1,95 m in de band langs één zijde |
| trapzijde | `· trap` | trap van 1,95 m langs de rand van het vak met het bordes uit de schets naar de galerij ernaast; twee stuks gespiegeld tegen elkaar geven de brede trap |

De schansflanken (`schans_zijde`) staan tussen de vakken en zijn weggelaten. **Menu → Winkelcentrum (hex-modules)** laadt het winkelcentrum precies zoals getekend (`MALL` in `08e`, uit de Collada-export gelezen): elke bouwsteen op zijn eigen vak, laag en draaiing. Alleen de winkels zijn gedraaid (een zeshoekig blok ziet er rondom hetzelfde uit), zodat hun pui naar de hal, de straat op de tweede verdieping of naar buiten kijkt; blokken die de schets in een blok laat staan (`space` binnen een `variable`) vallen weg. De indeling:
- **begane grond**: een dichte kern van winkels en een magazijn, met twee **opritten** aan de westkant;
- **eerste verdieping**: de opritten komen via twee **tunnels** (doorgangen) uit in de **entreehal**, die diagonaal door het centrum loopt en open is naar de lucht; de halve en afgesneden blokken geven de hal zijn schuine wanden;
- **trappen** naar de tweede verdieping: twee galerijen met trap (`trapring`, één gespiegeld) en een **brede trap** tussen de twee halve blokken: twee keer de module trap, elk in zijn eigen vak, de tweede gespiegeld, met het bordes uit de schets naar de galerij van het buurvak;
- **tweede verdieping**: een overdekte straat over de daken van de eerste verdieping, met dakpaviljoens (`space`) en een galerij rond een vide;
- **derde verdieping**: een laag winkels als dak over die straat (in de schets dragen die op de buren; in het voorbeeld zweven ze daar dus).


Nieuw in de Raatmaker hiervoor:
- **Schans (S)**: klik in een vak bij de zijde waar je onderaan instapt; het hele vak wordt een oprit die aan de overkant 3 m hoger uitkomt (`hexramp` in `mv2Build`: vlakke middenstrook van 9 m en twee gewrongen zijdriehoeken, dichte wanden eromheen).
- **Penseel** voor de vloer (knoppen onder de vloerkleuren, of N): zeshoek · één driehoek · heel vak · kern (¾) · rand (galerij). Geldt ook voor de gum op vloer.
- **Kopie ↑** onder de verdiepingknoppen links kopieert deze verdieping naar de verdieping erboven.
- Vloermateriaal **Glazen dak** (doorzichtig, voor lichtkappen) en de voorwerpen **winkelstelling**, **toonbank** en **lichtreclame**.
- Een trap kan zijwaarts verschoven staan (`off` in een trap-item), zodat hij in een galerijband van 1,95 m past.

## Aansluiten aan de rand (mv2Randen, 08c)
Afspraak voor een gelaagde stad (november 2026): een pad komt aan het **midden van een zijde** uit en is **4,5 m** breed (de halve zijde, past op elk tekenraster: 4 stukjes van 1,125 m, 2 van 2,25 m of 1 van 4,5 m), of de **hele zijde** (9 m) is open (plein, plateau). Paden komen alleen uit op de **vloer van een verdieping** (0, 3, 6 m …); halve hoogtes horen binnen een module bij een trap of helling.

`mv2Randen(m)` kijkt per verdieping en per buitenzijde welk stuk van de zijde beloopbaar is: verharde vloer (op de begane grond tellen gras en terrein niet als pad: daar loop je overal), op een verdieping elke vloer behalve water, de bovenkant van massief, of het boveneind van een helling van de verdieping eronder; niet in een trapgat en zonder dichte muur (deur, poort en open doorgang mogen, een laag muurtje onder 0,6 m ook). Soorten: `pad`, `heel`, `deur` (alleen openingen in een muur), `anders` (afwijkend: een andere breedte, niet in het midden, of een helling die op een halve hoogte aan de rand uitkomt).

In de Raatmaker laat **Controle** (Shift+C) langs elke buitenzijde van de verdieping een strook zien: groen = pad, blauw = hele zijde, oranje = deur, rood = afwijkend; de melding telt ze. In de bibliotheek (168 modules) wijken er 7 af, allemaal details (kade, steiger, woonboot, amfitheater, tankstation, twee winkelcentrum-stukken). Test: `test/visueel/mm_randen.js`.

**Bij het plaatsen in de stad** (`aansluiten` in `08-schets-modules.js`): het spookbeeld van de module laat langs elke zijde waar een andere module naast staat zien of ze op elkaar passen. Per verdiepingshoogte worden de randen van beide kanten (`mv2Randen`, gedraaid en verschoven naar de wereld) op dezelfde zijde gelegd: **groen** waar beide kanten beloopbaar zijn op dezelfde hoogte (het pad loopt door), **rood** waar maar één kant open is (een pad dat doodloopt, een plateau op 3 m naast een pad op de grond, een pad dat dwars staat). Een plein (hele zijde) naast een pad van 4,5 m is groen. **Vanzelf draaien** (`besteDraai`): kom je met de muis op een nieuw vak, dan draait het spookbeeld zelf naar de stand met het meeste groen en het minste rood (en waar hij past); staat hij al goed, of maakt draaien niets uit, dan blijft de stand. Daarna draait R nog met de hand, tot je naar een ander vak gaat. Test: `test/visueel/aansluiten.js` (pad in het verlengde, dwars, naast een plein, naast een plateau, helling die boven op een plateau uitkomt; vanzelf draaien: in het verlengde, helling naar het plateau, pad tussen pad en plein, al goed blijft staan).

**Past op** (aansluittabel in de Raatmaker, `mv2Past` in `08c`, paneel in `08d`): in het zijpaneel staat per zijde van de module met een pad of opening (een zeshoekje wijst de zijde aan, zoals in het bovenaanzicht) welke modules uit de bibliotheek ernaast passen, in een of meer draaiingen: op elke verdieping waar een van beide een pad of opening heeft, hebben ze er allebei een en raken die elkaar. Paden staan vooraan; een klik op een naam zoekt hem in de bibliotheek. Een zijde waar niets op past wordt rood ("nog niets dat hierop past"). De tabel ververst na elke wijziging. Alleen voor modules van één vak. Test: `test/visueel/mm_past.js`.

**Op een touchscreen altijd eerst het spookbeeld** (`handleTap` in `12-bouwacties-schoonheid.js`): er is geen hover zonder muis, dus tikte je met het gereedschap Module meteen raak, zonder ooit het spookbeeld (met de groen/rode randen) te zien. Nu werkt een tik met de module net als bij trap/muur/helling (`DIRECTIONAL`, de bestaande `pendingKey`): de eerste tik toont alleen het spookbeeld ("Tik nog eens op dit vak om neer te zetten · Draai om te draaien"), pas een tweede tik op hetzelfde vak (zelfde module, draaiing, spiegeling en laag) zet hem neer. Op de gevel tikken (variant wisselen) blijft wel meteen. **Ctrl+scrollen** kiest intussen de laag (hoogte) waarop je plaatst, net als de laagkiezer rechts (`HUD.setLayer`); het spookbeeld springt meteen mee. Test: `test/visueel/module_voorbeeld.js` (simuleert een touchscreen met `hasTouch`/`isMobile`).

## Geen overlappende vlakken (z-fighting)
Twee vlakken op precies dezelfde plek, die dezelfde kant op kijken, flikkeren (z-fighting): strepen langs randen. Regel: nergens twee vlakken op elkaar; wat elkaar raakt, steekt een stukje in het andere of ligt erachter. Daarom:
- de rand van een vloerplaat is één staand vlak precies op de rand, naar buiten gekeerd (`randVlak`), zonder boven- en onderkant (die liggen al in de vloer en het plafond); staat de vloer op massief, dan is de zijkant van het massief de rand en komt er geen randvlak;
- kozijnen steken 1 cm voor de muur uit en 1 cm de muur in; het glas zit met zijn randen in het kozijn (glas is aan twee kanten zichtbaar); een glaswand zit met zijn randen in de metalen banden; deurlijsten stoppen net onder de latei;
- een lage muur stopt waar de afdekrand begint; de planken van een winkelstelling liggen 1 cm achter de voorkant.
Test: `test/visueel/overlap.js` bouwt elke module (zoals in de stad) en zoekt driehoeken van verschillende onderdelen in hetzelfde vlak (2 mm) die dezelfde kant op kijken en elkaar overlappen. Van duizenden m² naar 45 m² in de hele bibliotheek (wat over is zit in de vloer verstopt of is een voorwerp); vloerrand op vloer of plafond en de plateaus moeten 0 zijn. Foto: `test/visueel/overlap_foto.js`.

## Knippen met twee materialen (L.fk + L.f2, 08c)
Een vloerdriehoek kan worden afgeknipt langs een rechte lijn (`L.fk[id]` = `[nx, nz, c]` of een lijst: het deel waar x·nx + z·nz ≥ c blijft). Met `L.f2[id]` krijgt het afgeknipte deel een eigen materiaal: één driehoek, twee materialen, een rechte grens ertussen (`mv2KnipRest` geeft de stukken van de overkant). Zo kan een pad met strakke randen dwars door de driehoeken van het raster lopen, ook op een verdieping waar geen terrein onder ligt. Bouwen, lopen en de balustrades (`mv2FloorPolys`), spiegelen (`mv2Mirror`), de randen (`mv2Randen`) en in de Raatmaker tekenen, schilderen en gummen (knip en overkant gaan samen weg), kiezen, verschuiven, draaien, spiegelen, kopiëren en plakken (`mv2KnipTf` neemt de lijn mee) en een fijner tekenraster kennen de overkant. Test: `test/visueel/mm_knip2.js` (een recht pad van 4,5 m: precies 70,148 m² pad, ook na draaien, spiegelen en kopiëren).

## Gereedschap Pad (A) in de Raatmaker (mv2PadLeggen, 08c)
Sleep een hartlijn tussen vaste punten: het midden van een zijde of het midden van een vak (gele ringen; de muis springt erheen binnen 1,3 m), elders het dichtstbijzijnde rasterpunt. Er komt een strook van **4,5 m** (of smal, 2,25 m) in het gekozen materiaal, met een twaalfhoekige kop op elk eindpunt: in de zes looprichtingen sluit die precies op de strook aan, en een bocht (twee stukken: zijde → midden → zijde) krijgt een schuine buitenhoek. Driehoeken die helemaal in de strook liggen worden pad; driehoeken waar de rand doorheen loopt worden geknipt (`L.fk`) met de vloer die er lag aan de overkant (`L.f2`); ligt er geen vloer (op een verdieping), dan alleen het padstuk. Weghalen gaat met Vloer of Gum, ongedaan maken met Ctrl+Z. Test: `test/visueel/mmpad.js` (met de muis: recht pad precies 70,148 m², bocht, smal pad, ongedaan maken, pad op de 1e verdieping).

## Paden uit de Modulekaart (08m2-paden.js)
De nieuwe padstukken uit de SketchUp-bibliotheek (Modulekaart) zijn Raatmaker-modules in de categorie **Paden**, volgens de afspraak voor aansluiten. Portie 1 (paden op de grond, 21 stuks): Pad (recht, flauwe en scherpe bocht, Y-splitsing, zijtak, kruising, ster, doodlopend met boom, rondgang met boom, rotonde met plantvak, bocht met bankje), Fietspad (recht, met voetpad, flauwe bocht, Y-splitsing), Steeg (pad tussen muren, overdekte doorgang) en Plein (zeshoek met boom, bankjes langs de rand, speelplek met zandbak, waterplein met stapstenen).

**Alles is met de Raatmaker na te maken** (Joeps regel): elk pad is een recept van gewone stappen, uitgevoerd met dezelfde functies als de gereedschappen.
- Vloer · heel vak (gras, of zeshoekstenen voor een plein); het zeshoek-penseel op een tekenraster van 1,125 / 2,25 / 4,5 m voor een plantvak, zandbak of waterbak; losse driehoeken voor de stapstenen.
- Pad (A): spaken van het midden van elke aangesloten zijde naar het midden van het vak (zeshoekstenen, fietspad in klinkers), 4,5 m; een ring van 3,9 m om de boom (rondgang, rotonde); fietspad met voetpad als twee smalle stroken van 2,25 m naast elkaar.
- Muur (W) langs beide kanten van de steeg; Massief (Y) naast de muren van de overdekte doorgang (0–6 m, geknipt langs de muur) en erboven (3–6 m).
- Ding (B): bomen en bankjes op de plek uit SketchUp, gedraaid per 30°.
- Doodlopend met boom: het pad loopt tot aan de boom (op het rasterpunt 3,9 m voorbij het midden) en eindigt in een rond pleintje (een padkop van 6,75 m). Waterplein: een vijver van ¾ van het vak (kern-penseel) met zes zeshoekige stapstenen om en om (zeshoek-penseel op 1,125 m), van rand tot rand. Zandbak: zeshoek-penseel 4,5 m hout met daarin 2,25 m **Zand** (nieuwe vloer, ook zelf te kiezen bij Vloer).
**Portie 2 (omhoog, 6 stuks)**: Plateau · pad recht / flauwe bocht / Y-splitsing (Massief over het hele vak van 0 tot 3 m, gras op 3 m, de paden op 3 m), Plateau · pad met leuning (plus Muur · hek langs beide kanten van het pad), Helling · pad omhoog (Helling · twee lijnen: onderrand midden op de lage zijde op 0 m, bovenrand midden op de hoge zijde op 3 m, 4,5 m breed, 15,6 m lang, 19 %) en Trap · pad omhoog (pad naar het midden, dan Trap · langs een pad van 5,63 m (treden van 35 cm), dan een steiger: drie muren met Massief erbinnen, het pad erop op 3 m). Niet omgezet: Helling · pad omhoog met leuning en Trap · met bordes halverwege (een leuning die een helling volgt en een bordestrap in de looprichting van een pad kan de Raatmaker nog niet) en Helling · halve verdieping (komt op 1,5 m uit; volgens de afspraak sluiten paden alleen op hele verdiepingen aan). De gedeelde functies: `mv2HellingLijnen` en `mv2TrapLangs` (08c), ook gebruikt door de gereedschappen. **Trap · Langs een pad** (stand in het gereedschap Trap): sleep tussen de vaste punten van Pad (midden van een zijde, midden van het vak); de trap komt in die richting (ook dwars op de zijden), even breed als het pad. De controle van de Raatmaker telt een open buitenrand op een verdieping als ingang (vanaf de buurmodule op dezelfde hoogte), net als op de grond.
Welke zijden een pad hebben komt uit SketchUp (veld `a`; SketchUp-zijde k is zijde 6 − k van de Raatmaker). Ze staan in de standaardbibliotheek (Standaard terugzetten), komen één keer in een bewaarde bibliotheek (`raatstad-lib21`), en de eerste, rafelige versie wordt één keer vervangen (`raatstad-lib22`; geplaatste exemplaren gaan mee). Test: `test/visueel/paden.js`. Overzicht: `test/visueel/uit/paden_portie1_strak.png`.

## Raatmaker · overzicht (één scherm met de Raatmaker)
De Raatmaker en de Modulekaart zijn één geheel (november 2026). In het menu staat één knop **Raatmaker** (toets **K**): die opent het **overzicht** (`15j-modulekaart.js`), en van daaruit teken je in de Raatmaker (`08d`).
- **Pagina Raatmaker-modules** (de standaard): alle modules van het spel als kaarten, per categorie, met zoeken. **Gewoon** is een foto recht van boven, **Diepte** een foto schuin van voren met een kleur per hoogte; beide zijn de echt gebouwde module (`mv2Beeld` in `08c`, in een rij gemaakt en onthouden tot de module verandert). **Lopen** toont de vloeren (pad blauwgroen, gras lichtgroen, trappen en hellingen erbij) en op de rand waar de module aansluit (`mv2Randen`: groen = pad van 4,5 m, blauw = hele zijde, oranje = deur, rood = afwijkend).
- **Details** (klik een kaart): maat, verdiepingen, hoe vaak hij in de stad staat, en per zijde wat er uitkomt en welke modules ernaast passen (`mv2Past`; een klik springt naar die module). Knoppen: **Bewerken in de Raatmaker** (ook dubbelklik of Enter) en **Neerzetten in de stad** (kiest de module als gereedschap).
- **+ Nieuwe module** opent de Raatmaker met een leeg vak. In de Raatmaker staat naast "← Stad" de knop **Overzicht**: terug naar het overzicht, met dezelfde module gekozen (niet-bewaarde wijzigingen: eerst vragen).
- **Pagina SketchUp** en de forten (Winkelcentrum): de stukken uit de SketchUp-bibliotheek, zoals voorheen in de Modulekaart.
Test: `test/visueel/raatmaker_overzicht.js`.

## Overzicht (vroeger Modulekaart): Diepte op de pagina SketchUp
De pagina SketchUp van het overzicht (K) heeft naast **Gewoon** en **Lopen** de weergave **Diepte**: elk stuk schuin van voren, hogere vlakken hoger in beeld met een randje eronder, en een kleur per hoogte (grond blauwgrijs, 1,5 m blauwgroen, 3 m groen, 4,5 m geel, 6 m oranje, 9 m en hoger rood-oranje), met een legenda. Laag en achter wordt eerst getekend. Zo zie je bij bruggen, trappen en hellingen wat boven wat ligt. De fortpagina (Winkelcentrum) toont bij Diepte de gewone 3D-weergave. Test: `test/visueel/modulekaart_diepte.js`.

## Modules: namen en bladeren

Elke module heet **soort · variant (· bijzonderheid) · lagen · maat**, bijvoorbeeld `Rijhuis · baksteen · 2L` of `Plein · markt · 7v`. Het aantal lagen (`2L`, alleen bij gebouwen) en de maat (`7v` voor 7 vakken; 1 vak heeft geen toevoeging) rekent de Raatmaker bij het bewaren zelf uit en zet ze achteraan (`modMeta`, `modSuffix` in `08c`). De standaardbibliotheek gebruikt dezelfde regel (`LIB_NAMES` in `08e`). Oude namen worden eenmalig omgezet, en de categorie Trappen heet nu **Verbindingen** (trappen, hellingen, bruggen: wat lagen met elkaar verbindt).

`modMeta(m)` geeft per module de gegevens voor bladeren en stapelen:
- `fl`: verdiepingen (een bovenste laag met alleen dakvloer telt niet mee);
- `n`: maat in vakken (1 of 7);
- `h`: hoogte in meters;
- `top`: `kap` (schuin dak), `plat` (beloopbaar plat dak, `stack: true`: hier kan straks een module op) of `open`;
- `deur` / `weg`: hoeveel randen een deur of weg hebben.

In het palet (tab Modules) staat boven de kaartjes een balk:
- een zoekveld (`/`; elk woord zoekt op het begin van een woord in de naam, Enter kiest de eerste);
- knoppen per categorie met aantallen, plus **Recent** (de laatst geplaatste);
- filters **1 vak**, **7 vakken** en **Plat dak**.

Bij Alles staan de kaartjes per categorie gegroepeerd en op naam gesorteerd. Elk kaartje toont de soort, daaronder de variant, en een badge met lagen en maat; een geel blokje betekent plat dak. `,` en `.` springen naar de vorige of volgende module.

## Bibliotheek: 152 modules, nagekeken (lib10, lib11)

De hele bibliotheek is opnieuw opgebouwd en per module automatisch nagekeken (`test/visueel/bieb_audit.js`): elke module wordt los in een lege stad gezet en met de echte botsing (`floorAt`/`blockedAt`) vanaf de straat afgelopen. Gemeld wordt een verdieping die niet bereikbaar is, een trap die boven nergens uitkomt, een voorwerp dat zweeft, in een muur staat, buiten het gebied valt of op een ander voorwerp, en een hek of muur die nergens op staat. `bieb_platen.js` maakt per categorie een overzichtsplaat met 3D-miniaturen.

**Winkelcentrum · klein · 2L · 7v** (lib11, categorie Winkelcentrum): zeven vakken. In het midden een hoge hal met fontein, bankjes, bomen in bakken en een glazen dak; eromheen zes units met een open glazen pui naar de hal: twee doorgangen naar de straat (tegenover elkaar), een modewinkel, een café, een boekwinkel en een supermarkt (elk met een achterdeur). Boven een galerij van 1,95 m rond de vide met een balustrade, bereikbaar met een trap in de rand van de hal, en zes units (kantoren, mode, restaurant, kapper, sportschool); op het platte dak zonnepanelen. De nieuwe module wordt één keer aan je bibliotheek toegevoegd; bestaande modules blijven zoals ze zijn.

**Winkelcentrum genereren**: in het palet bij Modules (filter Alles, Winkels of Winkelcentrum) staat een kaart met een dobbelsteen. Elke klik maakt een nieuwe variant van het winkelcentrum van 7 vakken (`mallGenerate` in 08d9): 1–3 lagen, andere winkels (mode, horeca, boeken, supermarkt, bakker, apotheek, bloemen, schoenen) en units boven (kantoor, restaurant, kapper, sport, atelier), 1–3 doorgangen, gevelmateriaal, vloer en inrichting van de hal (fontein, bomen of kiosk), zonnepanelen of een groen dak, met of zonder glazen kap. Bij 3 lagen gaat het boven de eerste galerij verder met een wenteltrap in een unit. Openingen in de puien komen alleen waar geen trap voor staat. De variant wordt een eigen module en staat meteen klaar om neer te zetten. `GEN=40 node bieb_audit.js` controleert 40 varianten.

**Indeling** (lib13): Wonen, Werken, Winkels, **Horeca** (café, restaurant, hotel, snackbar), Winkelcentrum, Openbaar, **Sport** (sporthal, zwembad, sportveld, tribunes, amfitheater, uitkijktoren), **Vervoer** (stations en haltes, parkeren, fietsenstalling, tankstation, laadplein, haven, kade), Voorzieningen, Groen, Pleinen, Verbindingen, Bouwdelen. Met de muis staan er pijlen naast de rij modules en de rij categorieën (en het scrollwiel schuift opzij).

Nieuw: **Voorzieningen** (tankstation, laadplein met zonnedak, trafohuisje, zonnepark, windmolen, watertoren, waterzuivering, milieustraat), **Openbaar** (huisarts, apotheek, kinderopvang, school van 1 vak, zwembad, theater, bioscoop, bus- en tramhalte, sportveld), **Groen** (begraafplaats, kinderboerderij), **Pleinen** (haven), **Wonen** (woonboot, galerijflat, portiekflat, studentenhuis, boerderij, zorgcomplex), **Werken/Winkels** (garage, datacenter, laboratorium, bouwmarkt, tuincentrum, snackbar) en **Verbindingen** (glazen trappenhuis, roltrap). Nieuwe voorwerpen: bed, bank (binnen), bureau, keukenblok, filmdoek, auto, tankpomp, laadpaal, zonnepanelen, windmolen, schoorsteen, container, doel, grafsteen, boot, abri, glijbaan, schommel, schaap. Woningen, kantoren, winkels, hotel, ziekenhuis, school en kerk zijn ingericht; platte daken van grote gebouwen hebben zonnepanelen (een dak met alleen zonnepanelen blijft een dak).

Bij het bijwerken (`raatstad-lib10`) worden standaardmodules die je nooit zelf hebt bewaard vervangen (zelfde id) en komen de nieuwe erbij; geplaatste exemplaren in elke stad krijgen de nieuwe versie (`buildModNet`). Het koppelen gaat op de precieze naam, dan op de naam uit de bouwcode, en alleen op de naam zonder lagen/maat als die uniek is (Rijhuis · baksteen bestaat in 2L én 3L).

## Low poly terrein

Standaard (Instellingen → Terrein → Low poly) wordt het terrein op het driehoeksrooster van de vakken getekend in plaats van op een vierkant rooster (`lpMesh` in `07b`). Elk vak bestaat uit zes driehoeken. Het midden ligt op de hoogte van het vak en elk hoekpunt op de laagste van de drie vakken die daar samenkomen. Eén verhoogd vak wordt zo een puntje, een groep een plateau met schuine flanken, en een strook van drie vakken breed een dijk. Elk vak dat een weg (met stoep) raakt is een wegvak: zijn midden en hoekpunten liggen op de hoogte van de weg. Een weg langs een dijk loopt daardoor strak langs de voet, en een weg over een dijk snijdt er met een bult doorheen. Lopen gebruikt precies dezelfde driehoeken (`lpHeight`).

## Trappen in huizen

Woningen en kantoren hebben een **bordestrap langs één muur** (`UT` in `03`), zoals in de bovenaanzicht-schets: de eerste steek loopt langs de binnenkant van de muur omhoog naar een bordes in de hoek (1,5 m), de tweede steek komt aan de muurkant terug en je komt boven uit naast waar je begon. Per verdieping wisselt de trap van muur (zijde 4 en 1), zodat hij niet steeds in hetzelfde trapgat staat. In de vloer erboven zit een trapgat met balustrade; de muur achter de trap krijgt geen ramen. Lopen gaat over schuine loopvlakken (`slopeU`) en een bordesvlak; de vloer heeft een gat (`holePoly`).

## Aanwijzen in de stad (V)

Met de muispijl linksonder (of toets **V**) wijs je in de stad een module of blok aan: hij licht op als een draadmodel van zeshoeken, met de naam bij de muis. Een klik geeft een optiekaart: **draai links/rechts** (60°), **spiegelen**, **andere variant** (die op de buren aansluit), **bewerken** in de Raatmaker (past alle exemplaren aan), **meer hiervan** (pipet), **verplaatsen** (oppakken en ergens anders neerzetten) en **weghalen**. Bij een gewoon blok: meer hiervan of de bovenste laag weg. Esc of een klik ernaast sluit de kaart (`15g-aanwijzen.js`).

## Modules en de Raatmaker

Een module v2 is een gebied van 1, 7, 19 of 37 vakken met verdiepingen van 3 m, getekend op het fijne driehoekraster (zijde 4,5 of 2,25 m):

- **Vloeren** zijn driehoeken met een materiaal (klinkers, tegels, hout, kantoorvloer, beton, gras, water, asfalt, dakbedekking). Een vloer op een verdieping is ook het plafond eronder; een bovenste laag met alleen vloer is een plat dak.
- **Muren** liggen op de ribben van het raster (baksteen, stucwerk, beton, glaswand, hout, natuursteen, haag, hek) en kunnen een **deur, raam, poort** of **open doorgang** hebben.
- **Trappen en hellingen** lopen van een rasterpunt in een van zes richtingen 3 m omhoog naar de volgende verdieping.
- **Helling met twee lijnen (schans)** (Helling, stand "Twee lijnen", de standaard): trek beneden de onderrand van rasterpunt naar rasterpunt; de Raatmaker gaat naar de verdieping erboven, waar je de bovenrand trekt. Daartussen komt een vrije helling (`k: 'plaat'`) van 0 tot 3 m; niet evenwijdige lijnen geven twee platte driehoeken. De vloer erboven is open boven de hele helling, al vanaf het begin (anders stoot je je hoofd tegen de vloerrand). Esc, Ctrl+Z of de rechtermuisknop breekt af. Test ook: `test/visueel/mmhelling_alles.js` (lopen in de Raatmaker en in de stad, gedraaid en gespiegeld, grof raster, hogere verdieping, aanraakscherm). "Recht slepen" is de oude helling. Test: `test/visueel/mmhelling_lijnen.js`.
- **Daken** per vak: puntdak of plat. **Voorwerpen**: boom, struik, bankje, lantaarn, zuil, tafel, plantenbak, fontein, prullenbak, fietsenrek.

In de stad wordt een module echt gebouwd (`mv2Build`): één mesh per materiaal, plus loopvlakken per verdieping en muren voor de botsing, zodat je erdoorheen en de trap op kunt lopen. Vakken onder een module zijn bezet voor andere blokken en wegen. Randcodes (muur, deur, groen, stoep, water, weg, leeg) worden uit de begane grond afgeleid; een klik op een geplaatste module wisselt naar de variant die het best op de buren past.

De **Raatmaker** (vroeger module maker of schets; in het menu **Raatmaker** → overzicht → Bewerken of + Nieuwe module, of Modules → Nieuw, of dubbelklik op een module) werkt als een bouwtekening: gereedschap bovenaan met sneltoetsen (V kiezen, H schuiven, F vloer, G vullen, W muur, M kamer, D deur, R raam, P poort, O open, C dicht, T trap, U bordestrap, J wenteltrap, L helling, S schans, K dak, B voorwerp, X gum), verdiepingen met ▲▼ of Page Up/Down, 3D-weergave met 3, ongedaan maken met Ctrl+Z. Bewaren zet de module in het palet; geplaatste exemplaren worden meteen bijgewerkt. Modules zijn als JSON-bestand te delen.

**Kiezen (V)**: klik op iets om het te kiezen (een vloer: de hele ruimte tot aan de muren), sleep een rechthoek om meer te kiezen, Ctrl+klik voegt toe of haalt eraf. Sleep wat gekozen is om het te verplaatsen (in stappen van een driehoekzijde, zodat alles op het raster blijft), Q/E draait 60° om het rasterpunt in het midden, M spiegelt links ↔ rechts en Shift+M boven ↕ onder (ook als knoppen), Delete haalt weg, Ctrl+C / X / V kopieert, knipt en plakt (het stuk hangt aan de muis tot je klikt; Ctrl+Shift+V plakt op dezelfde plek, ook op een andere verdieping), Ctrl+D dupliceert, Ctrl+A kiest alles, en met Keuze ↑/↓ verdieping gaat de keuze een verdieping op of neer. Daken en schansen horen bij een heel vak: die gaan alleen mee bij verplaatsen over hele vakken.

**Voorwerpen tegen de muur**: een kast, (binnen)bank, bed, bureau, keukenblok, toonbank, bankje of filmdoek gaat vanzelf met de rug tegen de dichtstbijzijnde muur staan (binnen ongeveer een meter; het bed met het hoofdeinde). Het voorbeeld laat het al zien; met Ctrl blijft het los.


**Vakken en raster** staan als knoppen linksonder in het tekenvlak (Vakken 1 / 7 / 19 / 37, Raster 4,5 / 2,25 / 1,125 m), naast de tekening waar ze over gaan. Fijner kan altijd (ook in één keer van 4,5 naar 1,125 m: vloeren, muren en vloersoort worden in stappen van 2 gesplitst), grover alleen bij een lege module. De bergfort-modules hebben raster 1,125 m (eerst stond de keuze dan leeg). **Bibliotheek groter** (knop in de kop van de bibliotheek, onthouden): het zijpaneel wordt breder, met links materialen en module en rechts de bibliotheek over de volle hoogte, met grote plaatjes in twee kolommen. Het canvas volgt de echte maat van het tekenvlak (ook bij de inzoom-animatie bij het openen en als het paneel breder wordt), zodat de muis aanwijst wat je ziet. Test: `test/visueel/mmmaat.js [breedtexhoogte]`.

**Draaien en spiegelen van een keuze** (Q/E, M, Shift+M): de hele laag (Ctrl+A) draait en spiegelt om het midden van de module; een kleinere keuze om haar eigen midden, en dat punt blijft hetzelfde zolang je dezelfde keuze blijft draaien of spiegelen (zes keer 60° komt dus terug waar je begon; eerst schoof het draaipunt telkens op). Zou er na de bewerking iets buiten het gebied van de module vallen, dan gebeurt er niets en zegt de Raatmaker hoeveel onderdelen dat zouden zijn (eerst verdwenen die ongemerkt). Test: `test/visueel/mmkiezen_bergfort.js`.


**Massief (Y)**: maakt driehoeken dicht van de vloer tot de verdieping erboven (`L.v` per verdieping: driehoek → muurmateriaal; getekend in `mv2Build` met zijkanten alleen waar het massief ophoudt, een bovenvlak alleen waar erboven geen vloer ligt, de randen botsen en mensen lopen er niet doorheen). Twee standen: **Ruimte vullen** (klik in een holle ruimte: alles tot aan de muren, ook schuine wanden; ligt erboven een vloer, dan alleen onder die vloer, zodat een opening open blijft; rechtermuisknop maakt hem weer hol) en **Penseel (pijler)** (zelf schilderen, bijv. een zeshoek in beton als pijler, op elke verdieping herhalen voor een hogere). Driehoeken die een schuine wand snijdt, worden op de wandlijn afgeknipt (`L.vk`, zelfde vorm als `L.fk` bij de vloer): het massief loopt tot precies aan de wand, zonder zaagtand en zonder aan de andere kant uit te steken. Elke ruimte tussen muren vul je met een eigen klik. Werkt met gum, kiezen, draaien, spiegelen, raster verfijnen en gespiegeld plaatsen. Test: `test/visueel/mmmassief.js`.

**Hele reeks muren weg (Shift + gum)**: houd Shift ingedrukt met de gum, dan licht de muur onder de muis op samen met alle muren die er via hun uiteinden aan vastzitten (ook om de hoek, rastermuren en schuine wanden samen; uiteinden binnen 0,4 m tellen als verbonden). Een klik haalt de hele reeks weg; één keer ongedaan maken zet hem terug (`wallChain` in `08d`). In 3D is Shift+slepen normaal verschuiven; met de gum gaat Shift voor (verschuiven kan dan met de spatiebalk of de middelste muisknop). Test: `test/visueel/mmgum_reeks.js`.

**Gum over verdiepingen heen (3D)**: staan de muren op de begane grond en de vloer op de 1e verdieping. Sta je op de 1e verdieping, dan haalt de gum in 3D ook de muren en wanden eronder weg die je ziet (bij een opening in de vloer); de melding zegt dan bij welke verdieping hij hoorde, bijv. `wand (begane grond) weggehaald`. Waar de vloer dicht is, pakt de gum de vloer. Kiezen blijft per verdieping. Test: `test/visueel/mmgum_verdieping.js`.

**Gum en vrije platen**: vrije platen (`plaat` in `08c`: schuine wanden, zuilen en hellingen, zoals de Helling met twee lijnen) zijn met de gum en Kiezen aan te wijzen: een staande wand krijgt van boven een strook van 0,35 m aan weerszijden, en in 3D raakt de straal vanuit de camera de vlakken zelf. Het oplichten toont de echte vorm. Test: `test/visueel/mmbergfort.js` (gumt alle 34 bergfort-modules leeg).

**Voorwerpen fijn verplaatsen**: kies één voorwerp (Kiezen, V) en sleep het: het schuift vrij mee met de muis (op de millimeter), niet in rasterstappen. Zitten er ook vloer, muren of trappen in de keuze, dan gaat alles samen langs het raster. Een langwerpig voorwerp (bank, stelling, bed, toonbank, filmdoek) is over zijn hele lengte aan te klikken, niet alleen in het midden; daardoor pak je niet meer per ongeluk de vloer of muur eronder.

**Materiaal van een keuze**: zitten er muren of vloer in de keuze, dan staan onder de knoppen van Kiezen de muur- en vloermaterialen; één klik geeft alle gekozen muren (openingen blijven) of vloerdriehoeken dat materiaal.

**Rondlopen (knop met het poppetje, 4)**: loop zelf door de module, met dezelfde botsing als in de stad (trappen op, muren houden je tegen). WASD of de pijltjes lopen (← → draaien), Shift rent, slepen kijkt rond en een klik vangt de muis (Esc laat hem los). Je begint op de verdieping waar je tekent als daar vloer is, anders buiten aan de rand. Esc of 4 gaat terug naar het tekenen.

**Bewaren** geeft een groene melding bovenin (en de knop wordt even "Bewaard ✓"), ook met hoeveel exemplaren in de stad zijn bijgewerkt.

**Controleren (knop met het vinkje, Shift+C)**: na elke wijziging wordt stil gecontroleerd; een groen of rood bolletje op de knop laat zien of alles klopt (de tooltip zegt hoeveel), klikken laat zien waar. kijkt op de gegevens of je overal kunt komen (vloerdriehoeken die je vanaf buiten niet bereikt worden rood), of trappen boven op een vloer uitkomen, en of voorwerpen zweven, in een muur of buiten het gebied staan; zwevende muren krijgen een rode stip met uitleg. Staat er ook iets rood op een andere verdieping, dan staat dat bovenin.

**Daken**: schilddak, zadeldak of plat dak. Het dak volgt de muren van dat vak op die verdieping: een gebouw van ¾ krijgt een dak van ¾ met 35 cm overstek (niet meer over de tuin heen). Bij een zadeldak wijst de nok naar de hoek bij de muis; boven de muur bij de nokhoeken komt een driehoek muur in het materiaal van de gevel.

**Trappen tekenen**: wijs een driehoekje aan en de trap staat er al als voorbeeld, met oranje de driehoeken die hij bezet (vol = helemaal, lichter = deels); een klik zet hem neer (3 zijden, één verdieping), slepen geeft een andere lengte of richting. De wenteltrap valt precies over de zes driehoeken om een rasterpunt. Tijdens het plaatsen zie je ook welke vloerdriehoeken op de verdieping erboven bedekt blijven en welke het trapgat worden. Het trapgat wordt precies afgeknipt op het eind van de trap (de vloer erboven loopt door tot de bovenste trede), zodat de trap goed aansluit. De **wenteltrap (J)**: klik het midden, sleep naar de kant waar je onderaan instapt; kies linksom of rechtsom omhoog. De gum kleurt ook in 3D de muur rood waar je overheen gaat (straal tegen de wandvlakken), niet alleen de vloer.

**Voorwerpen (B)**: je ziet het voorwerp al staan voor je klikt (in 3D half doorzichtig), met zijn omtrek en een pijltje naar de voorkant. Draaien per 30°: Q en E, Shift+scroll of de knoppen ↺ ↻; houd ingedrukt en sleep om het te richten (Ctrl: vrij). Op een voorwerp: klik draait 30°, slepen richt het, rechtermuisknop haalt het weg.

**3D is de standaardweergave** en je tekent er gewoon in: elke klik wordt een straal vanuit de camera, gesneden met het vlak van de verdieping waar je bent (`toW`/`toS` in `08d`), dus al het gereedschap werkt in 3D en bovenaanzicht hetzelfde. Het raster en de rand van het gebied liggen op de hoogte van die verdieping. Draaien: middelste muisknop, Alt+slepen, spatie+slepen of het handje; schuiven: Shift+slepen of het pijltje. Standaard zie je de module tot en met de verdieping waar je tekent. Op het noorden staat een **hoogtemeter**: een paal met een streep per verdieping (3 m), de huidige in oranje, met een N; in het bovenaanzicht een ladder boven het gebied. Zolang de Raatmaker open is staat de stad stil (scheelt rekenwerk).

**Hoeken**: waar twee muren onder een hoek samenkomen staat een ronde hoekpost van dezelfde dikte en hetzelfde materiaal, zodat de rechte muurblokken zonder kier of uitstekend hoekje aansluiten (ook bij hagen).

**Muren onder 90°**: behalve langs de ribben van het raster (30°, 90°, 150°) kun je muren ook haaks daarop trekken (0°, 60°, 120°, `MV2.DIRW` 3–5, √3 × zo lang), zodat een muur in twaalf richtingen snapt en rechthoekige kamers mogelijk zijn. Vullen (G) stopt alleen bij muren langs het raster.

**Gevels en vloeren** (`modernMats` in `08c`): baksteen, donkere steen, wit stucwerk, schoon beton, gevelpanelen, houten lamellen, cortenstaal en glasgevel als textuur op ware schaal (uv in meters, doorlopend over stukken en verdiepingen); vloeren ook in visgraat parket, gepolijst beton en natuursteen tegels.

**Verwijderen** gaat met twee klikken (× in de bibliotheek, of rechtermuisknop op een kaartje in het palet), omdat een bevestigingsvenster (`confirm`) in een ingesloten pagina niet werkt. De oude schets is niet meer te openen; oude schets-modules kun je nog plaatsen en verwijderen.

## Spoor (11e-spoor.js)
Gereedschap **Spoor** in de tab Wegen: klik vak na vak. Elk stuk loopt in een van de twaalf raatrichtingen (zes langs de zijden, zes over de hoekpunten); bochten tot 90° worden afgerond (boog tot 90 m straal). Rechtermuisknop, Esc of nog eens op het laatste punt stopt; op een uiteinde klikken tekent verder; gum op het spoor haalt de hele lijn weg.
Beide uiteinden lopen vanzelf 2600 m door in hun laatste richting: ver voorbij de stadsgrens en de mist (die is bij 1150 m dicht), dus het spoor verdwijnt in de horizon. Dubbelspoor met ballast, dwarsliggers (InstancedMesh) en rails, hoogte volgt het maaiveld (glad, nooit onder water).
Treinen: één per spoor, rechts rijden. De eerste staat bij het laden vlak voor de stad, daarna komt er om de 15–40 s één uit de mist. Een treinstation (module met *treinstation* in de naam) binnen 40 m van de lijn is een halte: afremmen, 12 s stilstaan, hoorn, verder. Een trein die de stad voorbij is en weer ver in de mist zit, begint opnieuw aan het begin.
Opslag: `cells.rails = [{ p: [[x, z], …] }]`, in de stadsdata als `__r` (alleen het getekende stuk; de doorloop wordt berekend). De meshes worden alleen opnieuw gebouwd als de punten of het hoogteprofiel veranderen. Het startstadje heeft een lijn ten noorden van de stad met een station en een korte straat ernaartoe. Test: `test/visueel/spoor.js`, `spoor_muis.js`.

## Gelaagde stad: wegen op wegdekken, modules boven de weg (08l-wegdek.js)
- **Wegdek**: modules `Wegdek · laag/hoog/extra hoog` (1 vak, 3/6/9 m) en `Wegdek · 7 vakken laag/hoog` (tab Wegen, categorie Vervoer): een betonnen dak op zeshoekige pijlers (`hpillar`, `O.h` lagen hoog). Ook `Parkeergarage · …` telt als wegdek (`isDeckMod`, of `m.deck`).
- **Een weg over een wegdek** haalt het niet weg (`vecClearUnder` slaat het over) maar ligt op het dak. `pathProf` tilt de middenlijn op naar dak + 6 cm (`deckLift`) met opritten van hoogstens 12 % (minstens 18 m), glad (smooth01). Onder de oprit geen dijk maar een betonnen wand (`P.dk`, `skirtInto`), onder het dek blijft het maaiveld liggen (`roadAdjust`). Een wegdek mag ook óp een bestaande weg: de weg gaat vanzelf omhoog. Waar de weg op of af het dek gaat komt geen hek (`buildRails`, wordt na `buildPathNet` opnieuw gezet via `railForce_`).
- **Een module boven de weg**: klik je met een module op een weg, dan komt hij op de laagste laag met 4,5 m vrije hoogte boven het wegdek (meestal laag 2 = 6 m; `overRoadLv`, ook in het voorbeeld). Hij krijgt zeshoekige poten (r 0,45 m) op de hoekpunten en het midden van elk vak waar geen module onder staat, niet op de rijbaan (`onCarriage`: binnen rijbaan + 0,9 m) en met de voet op het maaiveld of een lager wegdek (`deckLegs`, één InstancedMesh, botsing als zes muurtjes per poot). Met de laagkiezer kan een module nu ook op een leeg vak zweven (laag ≥ 1).
- **Instorten**: poten zijn dragende stukken; staat een module helemaal op poten, dan is alleen de voet van een poot grond (`legGround`): sla de poten weg en hij valt.
- **Dakweg**: begin je een weg te slepen óp een plat dak (winkelcentrum, kantoor, flat, wegdek: `isRoofMod`, `roofUnder`), dan wordt het een dakweg (`path.dak`): hij ligt op elk plat dak waar hij overheen gaat (die blijven staan) en daalt daartussen en aan het eind met opritten. Het slepen meet op een vlak op dakhoogte (`planeCellAt`), zodat de weg onder de muis blijft. Wat op het dak onder de weg stond (zonnepanelen, groen, lichtkap) verdwijnt (`offSpot` met hoogte). Een gewone weg haalt gebouwen nog steeds weg; een schuin dak blijft een obstakel.
- **Het dek is de grond**: klik je met een module op een wegdek, dan komt hij erbovenop. Een beloopbaar dak of dek naast een dakweg sluit aan op de stoep van die weg (10-mensen), dus een huis op een dek is via het dek en de stoep langs de oprit vanaf de straat te bereiken (draai de deur naar het dek, R).
- **Trappenhuis-poot**: een module die helemaal op poten staat krijgt bij een deur een zeshoekige wenteltrap naar de grond (12 treden per 3 m, kern, leuning) en een bordes naar de deur, zo nodig wat opzij langs de gevel, nooit op de rijbaan (`towerFor`, `towerBuild`). Loopnetwerk: ingang op de grond → trap (`spir`) → bordes → deur (08f). Botsing: treden en bordes als vlakken, kern en leuning als muren.
- Tests: `test/visueel/wegdek.js`, `wegdek_slepen.js`, `poten_instorten.js`, `dakweg.js`, `dekstad.js`, `trappoot.js`, `trappoot_lopen.js`.

## Beta (15h-beta.js)
- Versie **0.1.0-beta** staat in het menu (met bouwtijd en commit) en op het welkomstscherm.
- **Melden** (menu, en de knop in de foutmelding): een formulier in het spel met soort (Fout of bug, Ik liep vast, Idee, Dit vond ik leuk), tekst en een e-mailadres dat niet verplicht is. Er gaat automatisch mee: versie en commit, browser en apparaat, videokaart, grootte van de stad, speeltijd, bouwen of lopen, en de laatste vijf fouten met plek in de code. Verstuurd naar een Google Formulier (`FORM.url` = de formResponse-link, `FORM.velden` = de entry-nummers van de vier vragen) met een POST zonder account; de antwoorden komen in de gekoppelde Google Sheet. Zonder verbinding blijft de melding bewaard (`raatstad-melding-wacht`) en gaat hij bij de volgende start, elke minuut of zodra de browser weer online is. Zolang `FORM.url` leeg is opent Versturen een ingevuld bericht op GitHub. Typen in een tekstveld laat de camera en het lopen met rust. Test: `test/visueel/melden.js`.
- **Fouten**: een fout (ook in een beeld van de hoofdlus) geeft onderaan de melding "Er ging iets mis. Meld het via Feedback" in plaats van een vastgelopen scherm; het spel tekent gewoon door.
- **Stad opslaan als bestand / Stad openen** (menu), met de waarschuwing dat steden tussen beta-versies kunnen verdwijnen.
- **Credits** (menu): ontwerp, AI-hulp bij de code, three.js en lettertypen, geluiden (bron en licentie nog in te vullen).
- **Standaard**: Totale chaos, Bloed en Instorten uit (Instorten en Bloed worden bewaard); geluid aan bij de eerste tik, met één knop uit. Schiet je in de cameramodus met Instorten uit, dan zegt een melding waar je het aanzet.
- Welkomstscherm in drie stappen (Bouwen, Lopen, Raatmaker) en een korte uitleg bij elke knop (`TIPS`).
- Gevonden: een nieuwe speler kreeg een startstadje zonder huizen (bij de eerste start ververste de bibliotheek alle modules en zette ze opnieuw neer, wat op zichzelf botste). Nu worden bij een vernieuwde module alleen de gegevens vervangen.
- Test: `test/visueel/beta.js` (tests zetten Instorten en Bloed zelf aan, `helper.js`).

## Mensen met doelen en een dagritme (10-mensen.js, "Doelen en dagritme")
- Elk gebouw met een deur is een plek: wonen (Wonen, oude woningen), werken (Werken, Openbaar, Voorzieningen, Vervoer, oude kantoren), school (School · …), winkelen (Winkels, Winkelcentrum), eten (Horeca); parken, pleinen en sport zijn plekken om even te blijven. Alleen gebouwen met een deur in het grootste samenhangende stuk loopnetwerk tellen.
- Iedereen krijgt een huis (liefst in de buurt), 72 % van de volwassenen een werkplek dichtbij huis, kinderen een school. Per uur van de dag een keuze (`decide`): 's nachts naar huis (tot 6:30–8:30), 's ochtends naar werk of school (tot 16:30–18:00, school tot 14:30–15:30), tussen de middag een deel naar een café, overdag winkelen, park of thuis, 17–19 uur naar huis of nog boodschappen, 's avonds horeca of park.
- Route: Dijkstra over het loopnetwerk naar een deur van het gebouw (een voordeur van een ander huis kost 40 m extra); aangekomen gaat iemand naar binnen tot het afgesproken speluur, of blijft 8–30 s in het park. Wie niets te doen heeft, slentert 10–35 s zoals vroeger. Bij Totale chaos geldt dit niet.
- Een etmaal duurt nu **20 minuten** op 1× (4× = 5 minuten, zoals eerst): anders duurde een wandeling van 130 m naar je werk al acht speluren.
- Gemeten in het startdorp (70 mensen, tweede dag): 's nachts 1 buiten, ochtendspits 33, overdag ~20, avondspits ~60; mediane route 87 m, alle 733 vertrekken kwamen aan. Test: `test/visueel/doelen.js`.

## Startdorp (08i-startstad.js)
Wat een dorp nodig heeft, op het zeshoekraster: een zeshoekige ringweg op 4 vakken, drie straten van de rotonde naar de hoeken, drie uitvalswegen. Wonen (rijhuizen in de kern, bungalows en villa's aan de rand), werken (bedrijfshal, werkplaats, garage), school en kinderopvang, supermarkt en bakker, huisarts en apotheek, dorpsplein met fontein, kerk, café en restaurant, speeltuin, park met vijver, bos, sportveld met snackbar, bushalte, parkeerplaats, trafohuisje, en het treinstation aan het spoor. Test: `test/visueel/startdorp.js`.

## Opslag in de browser: modules als verwijzing (01, serializeOpslag)
Een geplaatste module die precies gelijk is aan zijn module in de modulelijst, gaat in de browseropslag (en de ongedaan-maken-rij) als verwijzing (`mref`); `parseCity` zet de kopie bij het laden terug. Zo past ook een grote stad (de gegenereerde stad, ruim 400 modules) in de opslag.

## Heuveldorp (08i2-heuveldorp.js)
Menu → Heuveldorp: een Italiaans dorpje op een heuvel van **zeshoekige terrassen**: elke ring vakken rond het midden heeft één hoogte (plein 20 m, elke ring 2,5 m lager, ringweg aan de voet 0 m). Daardoor ligt een straat over een ring vanzelf vlak. **Eén slingerstraat** (klinkers): recht omhoog naar ring 6, twee zijden over ring 6, omhoog naar ring 3, twee zijden over ring 3, omhoog naar het plein; haarspelden (120°) zijn twee bochten van 60°. Hij kruist niets. Drie **sluipsteegjes** recht de heuvel op, om en om door een Steeg-huis (overdekte doorgang onder het huis, 4,5 × 3 m, deuren aan de steeg, trap, schilddak) en een tuintje, op plekken waar ze de straat niet kruisen. Plein met fontein, kerk, café, restaurant; huizen langs de straat, verder olijfgaarden, bos en open grasterrassen; aan de voet bos, vijver en speeltuin. Straat- en steegeinden op een afgeronde hoek komen precies op de middenlijn van de andere weg (snapEnds). Steilste stukje ±29 %, verder ±16 %. Elke module op een terras staat op een **fundering**: een zeshoekige sokkel van natuursteen onder elk vak (`addFoundation` in 08c), zodat huizen een stenen voet hebben en tuinen stenen terrasmuurtjes. Steeg-modules komen bij bestaande bibliotheken via migratie lib15. Test: `test/visueel/heuveldorp.js` (controleert ook dat alle kruispunten even hoog liggen).

## Kruispunten op een helling (07, pathProf / pathJoins)
Elke weg volgt het terrein op zijn eigen manier (gemiddeld over ±6 m), dus twee wegen die elkaar raken konden op een helling meer dan een meter verschillen: dan scheurde het kruispunt. Nu krijgt elk kruispunt één hoogte: een weg die óp een andere uitkomt sluit aan op de doorgaande weg (die daar vlak ligt), twee gelijke wegen die kruisen ontmoeten elkaar halverwege, een pad of fietspad volgt de straat. Het kruispunt ligt vlak over de rijbaan van de andere weg (+1 m); de overgang is zo lang dat het steilste stuk onder ±25 % blijft. Een weg die 3 m of meer hoger/lager ligt gaat eroverheen (brug, viaduct) en blijft zoals hij is; snelwegen, dakwegen, vaste lagen en opgehoogde wegen doen niet mee. Verder: het terrein onder een kruispunt neemt de laagste weg die eroverheen ligt (geen gras meer door het wegdek); een gemengd kruispunt (klinkers op asfalt) legt het asfaltvlak 2 cm hoger en klinkers liggen net onder asfalt, paden net onder het wegdek (geen flikkerende vlakken). Sneller laden: de wegdekken worden niet meer bij elke hoogtevraag opnieuw verzameld (de grote stad laadt ±4× sneller).

## Detailniveaus voor modules (08c, batchLod)
Elke module wordt twee keer gebouwd: de echte versie (muren in stukken, ramen met kozijnen, trappen, inrichting; om in te lopen en te slopen) en een eenvoudige versie voor ver weg (`mv2Build(…, { far: true })`). In de eenvoudige versie zijn de muren dicht, met de ramen als donkere vlakken. Trappen, inrichting, kozijnen, hekjes, hoekpaaltjes, plafonds en vloeren met iets erboven vallen weg. Dak, vorm, kleur, fundering, bomen, tafels en bankjes blijven. Een rijhuis gaat zo van ±5.200 naar ±870 driehoeken. Per stuk stad (6 × 6 vakken) wisselt `batchLod` naar de afstand tot de camera: de echte modules tot 90 m, de kozijnen tot 70 m en de inrichting tot 50 m. Een hoge camera telt als iets verder weg. Instorten gebruikt altijd de echte versie. Leuningen gaan net als kozijnen ver weg uit; in de eenvoudige versie zijn rechte muurstukken samengevoegd. Mensen buiten beeld of verder dan 200 m worden niet getekend, dwarsliggers van het spoor verder dan 450 m ook niet. Heuveldorp in vogelvlucht: 1,1 → 0,41 miljoen driehoeken; startdorp 0,68 → 0,28 miljoen.

## Opslag

Steden en modules staan in `localStorage` van de browser. Modules kunnen als JSON-bestand worden geëxporteerd en geïmporteerd (Raatmaker → Delen). De 152 standaardmodules worden één keer toegevoegd en zijn met "Standaard terugzetten" te herstellen.

## Plan

1. ✅ Code in losse bestanden
2. ✅ Eén wegsysteem (vectorlijnen) met verkeer, verkeerslichten, mensen, zandvakken
3. ✅ Modules delen als bestand
4. ✅ Randcodes op modules; een klik op een geplaatste module wisselt naar de variant die op de buren past
5. ✅ Oude vakweg-, laan- en randwegcode verwijderd (alleen de omzetting voor oude steden blijft)
6. ✅ Ronde kop op doodlopende wegen
7. ✅ Modules v2 met verdiepingen, openingen, trappen, daken en voorwerpen; begaanbaar in de stad
8. ✅ Raatmaker met gereedschap en iconen, 3D-weergave, bibliotheek
9. ✅ Honderd standaardmodules in families (wonen, werken, winkels, openbaar, groen, pleinen, trappen, bouwdelen)
10. ✅ Hoog terrein, wegen over heuvels en viaducten, sneltoetsen met hulpvenster
11. ✅ Winkelcentrum (7 vakken) en een generator voor varianten (dobbelsteen); bibliotheek ingedeeld (Horeca, Sport, Vervoer), tabbladen tonen hun modules
12. ✅ Instorten en cameramodus: dragende wanden, kanonskogel en sloopkogel (door meerdere muren), deuren, treden en dichte vloerplaten breken los
13. ✅ Spoor: tekenbare dubbelsporen tot voorbij de horizon, treinen die stoppen bij treinstations
14. ✅ Terreinstap: ophogen en afgraven per 3 m (of 1,5 m / vrij)
15. ✅ Gelaagde stad: wegdekken met opritten, dakwegen over platte daken (ook het winkelcentrum), modules boven de weg op poten met een trappenhuis-poot, een dek als grond

Nog te doen:

- Gelaagde stad: groene daken (park en groen direct op een dak, dakweg tussen groen door); laagweergave voor wegen, dekken en poten; sfeer onder de dekken (licht, geparkeerde auto's); generator voor gelaagde steden; deur van een module op een dek vanzelf naar het dek draaien
- Echt brugdek met pijlers voor een weg die je tijdens het slepen ophoogt (nu een dichte wand)
- Parkeerstroken met geparkeerde auto's, keerlus aan het eind van een laan
- Plaatsvervangers in het menu: Klif, Strand, Poort
- Auto's die een parkeergarage in rijden
- Raatmaker: muren met eigen hoogte, schuine daken over een vrije vorm, hellende vloeren, teksten en bordjes
- Mensen met een doel (werk, winkel, thuis); dak op modules; rivieren; tunnels voor auto's

## Testen

In `test/` staan de simulaties en controles (Playwright, headless Chromium): verkeer op losse wegvormen en in de voorbeeldstad, een stad met alle bouwonderdelen, de Raatmaker, de standaardbibliotheek en lint. Zie `test/README.md`.

## Randvulling langs wegen (v116)
Een vak dat deels op een weg of stoep ligt, kan nu een park in stukjes worden: alleen de taartpunten (zesde delen van het zeshoekige vak) die vrij van de weg zijn, worden gras met bomen. Het masker staat per vak in `cells.sec` (opgeslagen als `__s`). Het startstadje is hiermee gevuld; zelf bouwen: kies Park en tik een vak naast de weg.

## Stadsgenerator (snel testen)
`src/js/08j-generator.js`: `genTown(seed, indeling)`; indelingen `dorp`, `rotonde`, `kruis`, `ring`. Via het menu (Dorp, Dorp met rotonde, Stad met raster, Kleine ringstad) of in de console `__SC().doAct('gen:dorp:7')` (zelfde seed = zelfde stad).
`node test/visueel/generator.js 5` bouwt per indeling 5 seeds en meldt gebouwen zonder stoep naar de deur.

## Geluid
Alles behalve de vogels, de aanrijdingsklappen en het kreunen is gesynthetiseerd met Web Audio (`13-camera-modus-geluid.js`, `sound.fx(naam, x, y, z, sterkte)`):
bouwen (tok), draaien (tik), slopen (gruis), kan niet (zoem), ongedaan maken, wisselen tussen bouwen en lopen (zwiep), een nieuwe stad (akkoordje),
mooier geworden (tingeltje), springen, deuren (kraak en klik), piepende banden en botsend metaal (roekeloos), claxon, krekels 's nachts en de brul van de Hulk.
De haken voor bouwen en slopen staan in `15f-geluid-haken.js`.

## Instorten
Raakt een auto (die slipt na een botsing) hard een modulegebouw, dan breken de stukken bij de inslag af (`src/js/11c-instorten.js`).
Het gebouw wordt op dat moment in losse stukken opgebouwd (`mv2Build` met `pieces: true`); wat nergens meer op steunt valt ook
(steun = kortste weg naar de grond: omhoog gratis, opzij 1, naar beneden 2, meer dan 3 houdt niets). Hoekposten en muren zijn zo
de dragers. Puin valt met zwaartekracht en zakt na ~10 s weg; wat blijft staan wordt samengevoegd getekend. Instelling: Instorten
(aan/uit; uit zet alles terug). In losse stukken is elke vloertegel een dichte plaat (boven, onder en zijkanten langs de rand van de tegel; van opzij niet meer doorzichtig), elke tree van een wenteltrap een eigen stuk, en de deurbladen (09b) worden losse stukken die niets dragen. Test: `test/visueel/instorten*.js`, `slopen_deur_trap.js`. **Puin als starre lichamen** (`physics` in 11c): elk brokstuk is een doos met massa (volume), draai en draaisnelheid. Per stap (twee substappen) zwaartekracht, dan botsen de acht hoekpunten met de grond en wegen, met staande stukken van elk kapot gebouw, met ander puin (slapend of vallend) en met auto's en mensen (`cars.ballHit`). Een botsing is een stoot in het raakpunt met draaimoment (stuiter 0,05–0,15, wrijving 0,5–0,6), zodat een losgeslagen muurplaat om zijn voet kantelt (bij het loslaten krijgt een hoge plaat een kanteling weg van de klap) en puin schuin tegen de gevel en op elkaar blijft liggen. Wie 0,4 s stilligt slaapt (`rust`, vaste hindernis, na 20 s wegzakken); een harde klap maakt hem wakker. Domino: een stuk met impuls > 3 × massa van het geraakte stuk + 12 slaat een staand stuk los (ook van het buurgebouw), hooguit 6 per beeld. Raster van 3 m; staande stukken per gebouw één keer geïndexeerd. Tot 420 brokstukken tegelijk (was 170): een rijhuis van 3 lagen valt nu helemaal in puin, ~6 ms per beeld. Tests: `test/visueel/puin.js` (ALL=1: alles los), `domino.js`.
De sloopkogel (rechtermuisknop in de cameramodus, 36 m/s) ramt door muren heen: elke raak kost 7 % vaart en slaat een groter gat (tot 4,2 m); pas onder 6 m/s stuitert hij terug. Een stadswoning gaat er dwars doorheen, een winkelcentrum tot halverwege (`test/visueel/sloopkogel.js`). Ontwerp voor Unity: zelfde steungraaf, echte physics voor het vallen.

## Autoschade en oude blokken
- **Schade** (`11-autos.js`, blok "Schade"): elke auto heeft `hp` (100). Een botsing (`hurt`) kost `impact × 1,9`, tegen een gebouw `snelheid × 1,2`, een landing na de Hulk 30. Onder 65 gaat hij roken, onder 35 zwaarder, op 0 brandt hij (`ignite`: hij rolt uit en staat stil) en na 4,5–7,5 s ontploft hij (`explode`): vuur en rook, een dreun (`sound.fx('boom')`), wie dichtbij loopt wordt geraakt, buurauto's krijgen 35 schade (kettingreactie) en de auto begint ergens anders opnieuw met 100. Na een gewone botsing zoekt de auto zelf de weg terug (`rejoin`: dichtstbijzijnde rijstrook, vloeiende bocht, geen teleportatie). Er zijn geen takelwagens meer (`towDispatch` doet niets).
- **Oude blokken** (`08k-oud-omzetten.js`): `oudOmzetten(cells)` zet kolommen woning/kantoor/blok/zuilen/hof/tribune/tunnel om in bibliotheekmodules, gelijke hoogte, deur naar de straat. Gebeurt automatisch in `rebuildAll()`; Menu → "Oude blokken omzetten" doet het ook los. Kolommen met iets anders (pad, park, trap) blijven oud.

## Steeg: snel een gelaagde loopstad met de oude blokken
Het gereedschap heette **Looppad**: een vak dat beloopbaar is zoals Pad, maar vast (zoals Blok) en dus te stapelen, ook dwars door gebouwen heen. Die naam leek te veel op Pad/Paden (de Raatmaker-paden hiernaast), dus heette hij even **Loopdek** — maar dat botste op zijn beurt met "steeg" als beter idee, terwijl er ook al Raatmaker-modules **Steeg · pad tussen muren** en **Steeg · overdekte doorgang** bestaan (categorie Paden). Dat is een ander systeem (losse, vaste v2-modules); dit blijft het oude, stapelbare blok, dus het heet nu gewoon **Steeg** en de modules behouden hun naam — een kleine kans op verwarring in ruil voor de duidelijkste naam. Intern blijft het `looppad` (zodat oude steden blijven werken — zie `TYPES.looppad` in `01-raster-data.js`; ook de functienamen in de code, zoals `loopdekHoogte`, zijn niet meeveranderd). Steeg staat nog in de categorie Paden, naast Trap; **Helling** (ook een oprit van 3 m, als blok) staat in Terrein.

**Vanzelf op de goede hoogte** (`loopdekHoogte` in `05-blokken-netwerken.js`, november 2026): tik je met Steeg op een **leeg** vak, dan kijkt hij bij de zes buurvakken of een ervan er iets op uitkomt — het boveneind van een helling, trap, trappad, tribune of opgang in die richting, of een andere steeg die er al ligt (die is altijd aan alle kanten open, `ifacesOfColumn`). De hoogste zo'n hoogte wordt gebruikt: eronder komen vanzelf de nodige blokken, erboven de steeg, in één klik (`vulBlokken`/`metVulling`, zie "Op hoogte bouwen met een oud blok" hierboven — datzelfde mechanisme, maar dan vanzelf uit een buur afgeleid in plaats van een gekozen laag). Geen buur op hoogte en geen laag gekozen: hij komt gewoon op de grond, als vanouds. Werkt ook slepen (`roadPaintTo`, meerdere vakken in één keer) en blijft binnen de 150 m (`MAX_H`). Zo bouw je snel een gelaagde loopstad: een helling omhoog, en daarna Steeg verder klikken of slepen — geen losse blokken meer zelf stapelen. Bochten en kruisingen (T, Y, …) hoeven geen apart stuk: elke steeg is altijd aan alle zes kanten open, dus een vak ernaast in om het even welke richting sluit vanzelf aan. Test: `test/visueel/loopdek.js`, en een volledig voorbeeld met hoogtes, bochten en kruisingen in `test/visueel/loopdek_voorbeeld.js`.

**Materiaal** (`LOOPDEK_VAR_NAMEN`/`loopdekVar` in `05-blokken-netwerken.js`, de texturen in `04-wegen-klassiek.js`): naast klinkers (het oorspronkelijke materiaal, `M.paver`) ook beton, hout en een stalen rooster — beton en staal passen bij een galerij dwars door gebouwen, hout bij een open vlonderpad. **Ctrl+klik** op een geplaatste steeg schakelt door (rondgaand); een gewone klik blijft zoals altijd (nog een laag erbovenop). Alleen de vloer wisselt van materiaal; een geïsoleerde steeg zonder enige buur heeft geen vloer om op te tonen (het is dan een dicht blok, zie hierboven — "Looppaden door massieve blokken" snijdt het pad alleen uit naar een zijde die ook echt aansluit). Test: `test/visueel/loopdek_materiaal.js`.

**Hofje** (`LOOPDEK_HOFJE_NAMEN`/`loopdekHofje`/`hofjeDecor` in `05-blokken-netwerken.js`): op een kruising van drie of meer paden ontstaat vanzelf een rond pleintje (`channelShapes`, straal `PLAZA_R` = 4,4 m). **Ctrl+klik** op zo'n kruising geeft het pleintje een andere vorm in plaats van materiaal: kaal → een boom in het midden → bankjes in een kring → een bloemperk → twee lantaarns → weer kaal — kleine, zelfstandige versies van wat Park ook kent (06), hier passend bij het pleintje van een steeg. Op een rechte of een bocht (geen kruising, geen pleintje) blijft Ctrl+klik gewoon het materiaal wisselen, want dat is daar het enige dat je ervan ziet. Materiaal en hofje staan los van elkaar en blijven allebei bewaard (twee cijfers achter `looppad`, bijvoorbeeld `looppad23` = materiaal 2 + hofje 3; één cijfer, van vlak hiervoor, betekent alleen materiaal). Test: `test/visueel/loopdek_hofje.js`.

**Helling, Trappad en Opgang: dezelfde klinkers als Steeg** (korte review van de helling, november 2026): de oprit/trap had een vlakke kleur zonder textuur (`M.paverPlain`), die uit de toon viel naast een Steeg met klinkers (`M.paver`, wél een textuur) — vooral duidelijk waar ze op elkaar aansluiten. Nu gebruiken Helling, Trappad (de vloer vóór de eerste tree) en Opgang (Hofhelling) ook `M.paver`; de treden van Trap/Trappad/Tribune blijven `M.stone` (bewust een ander materiaal). Test: `test/visueel/helling_klinkers.js`.

**Zeshoekige klinkers** (`M.paver` in `04-wegen-klassiek.js`, november 2026): klinkers waren rechte baksteentjes (20 × 10 cm, halfsteens verband); nu zeshoekige tegels van 19 cm zijde, met `hexTegelTex` (dezelfde functie als de betonnen stoeptegels, `M.walkTop`, maar warmer en iets groter). Eén gedeeld materiaal voor alle paden: Pad (grond, `07-driehoeken-vectorwegen.js`), Hof, Steeg (klinkers-variant), Helling, Trappad, Opgang — overal tegelijk bijgewerkt. Test: `test/visueel/hexklinkers.js`. **Nog niet gedaan, wel opgevallen bij die review:** een steeg of helling op hoogte heeft nergens een balustrade of muurtje langs een open rand (zoals `addRailings` dat al wel geeft aan een dek op zuilen) — op een rechte of bocht beschermen de blokken ernaast je weliswaar vanzelf, maar bij een doodlopend eind of een rand naast een lager buurvak kun je zo de diepte in lopen. Vraagt eigen maatwerk (de channelShapes-vorm is geen rechte zeshoekzijde) — zeg het als je wilt dat ik dat alsnog uitwerkt.

**Pad (getekend): een voetpad tekenen zoals een weg** (`vpad`, november 2026): naast de klassieke vakken (Pad, Steeg) staat in Paden nu **Pad (getekend)**, een vector-pad (`PATH_DEF.pad`, 3,2 m breed, zeshoekige klinkers `VM.pave`) dat precies werkt als de wegen: vrij slepen, ook over halve zeshoeken; stilhouden maakt een hoekpunt; **E/Q** of het wiel tijdens het slepen maakt het huidige punt 1,5 m hoger of lager (`roadHeightStep`); vanaf 3 m wordt het een **dek op pijlers** (`isDeck`), en paden op verschillende hoogte sluiten niet op elkaar aan, dus je loopt er gewoon overheen. Zo overbrug je een ander pad of een halve zeshoek zonder blokken te stapelen. Test: `test/visueel/paden_getekend.js` (twee paden die elkaar kruisen, de bovenste op 6 m; de speler loopt er zelf overheen).

**Steeg (getekend): een steeg slepen zoals een weg** (`vsteeg`, type `steeg` in `PATH_DEF`, november 2026): net als Pad (getekend), maar 3 m breed met aan beide kanten een **licht schuin muurtje** (1 m hoog, onder 0,34 m en boven 0,22 m dik, natuursteenkleur `VM.muur`) dat je ook echt tegenhoudt (muren in `roadCols`, zie `blockedAt`). Paden horen niet bij de wegengraaf (`vecGraphOf` neemt alleen autowegen), dus de openingen worden apart bepaald: een stuk muur vervalt waar een ander pad, een andere steeg of een weg **op dezelfde hoogte** (minder dan 2,5 m verschil) eroverheen ligt. Daarbij telt alleen de lengte van dat andere pad mee, niet wat voorbij zijn eindpunt ligt; zo opent een zijsteeg die op een steeg uitkomt (een T) alleen de muur aan zijn eigen kant. E/Q, bochten en bruggen op pijlers werken zoals bij de wegen; een brug houdt zijn muurtjes (meteen een borstwering). Het klassieke Steeg-blok (`looppad`) blijft daarnaast bestaan. Test: `test/visueel/steeg_getekend.js` (T-aansluiting, een steeg op 6 m eroverheen, zelf tegen het muurtje en de zijsteeg in lopen).

**Paden opgeschoond: alles getekend, alles sluit aan** (november 2026). Het palet **Paden** heeft nu alleen nog de getekende paden — **Pad**, **Steeg** en **Fietspad (getekend)**, dat uit Wegen hierheen is verhuisd — en de stapelbare blokken **Steeg**, **Trap** en **Trappad**. De oude vak-paden **Pad**, **Fietspad** en **Randpad** zijn uit het palet (net als eerder de oude vakwegen); bestaande steden tonen ze nog, en `selectTool` kent ze nog. Ze sluiten op elkaar en op de blokken aan, in beide richtingen:
- **Pad naar blok** (`blokAanHoogte`, 05; `vecPaintTo`, 14): begint of eindigt een getekend pad of weg vlak naast een Steeg, Helling, Trap, Trappad, Hof … recht op dat vak af, dan komt dat eind vanzelf op de hoogte van de vloer die daarheen open is — tenzij je daar zelf met E/Q een hoogte koos.
- **Doorlopen tot de rand** (`sluitPadenAan` en `padEinden`, 07): een getekend pad houdt normaal op in het midden van een vak; ligt daarachter een blok met een vloer op dezelfde hoogte, dan loopt het door tot de rand van dat vak, zodat er geen gat van een half vak tussen zit. Dit gebeurt bij elke volledige opbouw van de wegen en na het neerzetten van een blok (`rebuildAround`/`rebuildMany`, 09), dus ook als het blok er pas later bij komt.
- **De steeg gaat open** (`computePathLinks`, 05): het eind van een getekend pad doet passief mee als aansluiting (zoals een weg of voordeur), op een blokhoogte (veelvoud van 3 m). Daardoor opent een Steeg zijn kant naar het pad. Na het tekenen worden de blokken waarvan de open kanten veranderen opnieuw opgebouwd (`buildPathNet`).
- **Blok naar pad** (`padEindHoogte` in `loopdekHoogte`, 05): zet je een Steeg naast het eind van een getekend pad op 3, 6 … m, dan komt hij vanzelf op die hoogte.

Daarnaast hebben de bordessen van de **Trap** nu ook de zeshoekige klinkers (`M.paver`; de treden blijven steen), en vangen meldingen (`.toast`) geen klikken meer op (`pointer-events: none`): een vervaagde melding onderaan het scherm hield eerder een klik op het speelveld tegen. Test: `test/visueel/paden_aansluiten.js` (het palet, pad naar steeg op 3 m, steeg naast een pad op 3 m, zelf van het pad de steeg op lopen).

**Huizen langs een pad of steeg** (`path.rand`, `huizenLangs` in 07, november 2026): met Pad of Steeg (getekend) in de hand wisselt **Ctrl+klik op zo'n pad** wat er langs de kanten staat: niets → muurtjes → huizen → niets (zonder keuze: Steeg muurtjes, Pad niets). Bij **huizen** komt aan beide kanten een rij smalle huizen: 4,5–6,5 m breed, 6 m diep, twee of drie verdiepingen van 2,9 m, met een zadeldak met de nok langs het pad, en een deur en ramen aan de padkant. De gevel- en dakkleuren en de maten volgen een vaste hash van de plek, dus ze zijn elke keer hetzelfde. Een huis komt er alleen waar het vrij is: niet op een ander pad of een weg die op die hoogte ligt (daar blijft een opening, zoals bij de muurtjes), niet op een vak met een blok, niet op een brugdek en niet in een scherpe bocht. Op een dijkje krijgt het een stenen voet tot de grond. Alle huizen samen zijn één mesh met vertexkleuren (`VM.huis`), en elk huis heeft vier muren voor de botsing. Test: `test/visueel/steeg_huizen.js` (een steeg met een zijsteeg: huizen aan beide kanten, de opening blijft vrij, zelf tegen een huis en de zijsteeg in lopen).

## Cameramodus en totale chaos
- **Cameramodus** (`13-camera-modus-geluid.js`, `flyCam`): in de bouwmodus zet Spatie het aan en uit (Esc ook). Geen interface en geen bouwvoorbeeld. De muis kijkt (aanwijzer vastgezet), W/A/S/D vliegt met wat vaart in de kijkrichting, E/Q omhoog/omlaag, Shift ×3, Ctrl ×0,25, het wiel zoomt (beeldhoek 12–95°), F slaat een foto op (`flyPhoto`, png zonder knoppen). Bij het stoppen komt het draaipunt op wat je aankijkt (`flyStop`).
- **Totale chaos** (de oude knop "Roekeloos rijgedrag", intern nog `cars.reckless`): mensen rennen (×1,6–3,5), pauzeren en kletsen niet, schreeuwen af en toe (`sound.scream`, opnames in `assets/schreeuw.mp3`: paniek, korte kreten, een gruwelkreet bij een explosie en een kreet die bij het bloed hoort) en de spreekballonnen tonen paniek en verwarring (`PANIC`, plus brand- en instortzinnen als dat echt gebeurt).

## Lopen en rennen
Mensen zetten hun voeten echt neer (`stepFeet`), met benen via inverse kinematica (`animPose`). Vanaf ~2,2 m/s rennen ze (`runFeet`): afzetten achter de heup, landen vlak ervoor, een zweefmoment, hiel omhoog, gebogen pompende armen, voorover leunen. Rennende mensen kijken verder vooruit en halen tragere lopers in. Metingen: `test/visueel/loopmeting.js` (voetwerk), `ontwijk.js` (bijna-botsingen), `loopbeeld.js` (beeldreeks van opzij). Alle maten en formules voor Unity staan in `unity/OVERDRACHT.md` §20.

## Trappen in de Raatmaker
Trap (T) en Bordestrap (U) volgen het voorbeeld `trappen.dae`: 16 treden per verdieping (18,75 cm op, 42 cm aantrede bij 3 rasterzijden), één driehoekrij breed (1,95 m), zwevende treden, een driehoekig bordes (rechte trap) of een bordes over twee rijen met een schuine kant van 60° (bordestrap). Het gat in de vloer erboven komt vanzelf (`stairHoles` in `08c`). Zolang de maker open is, is het weer helder en 13:00. Maten en formules: `unity/OVERDRACHT.md` §22.

## Bergfort (uit het spel)
Het bergfort uit SketchUp (de bergfort-modules in de Raatmaker, de Spiraalburcht en de pagina Bergfort in de Modulekaart) is eruit gehaald; Joep bouwt het opnieuw op in het spel. Bij het laden gaan de bergfort-modules eenmalig uit de bibliotheek (`raatstad-bergfort-weg`, `08e`) en eigen versies van het fort uit de Modulekaart (`raatstad-bergfort-weg-forten`, `15j3`); eigen kopieën en wat al in een stad staat blijven. De losse SketchUp-stukken (ook de rotsen) en het Winkelcentrum blijven. In `tools/sketchup/` staan nog de algemene exports en `maak-2d.py` / `maak-forten.py` (die laatste maakt alleen nog het Winkelcentrum; `raatstad-berg.json` levert de vormen van losse stukken zoals de rotsen); de gereedschappen die alleen voor het bergfort waren (`naar_raatmaker.py`, `bergfort_af.py`, `pad_af.py`, `looproute.py`, `rafelkaart.py`, `grid_check.py`) zijn weg. Tests met een vast plateau gebruiken `test/visueel/vast/plateaus.json` (de helper zet die in de bibliotheek van de testbrowser). De bergfort-tests zijn weg, ook `mmgum_verdieping` (die zocht losse SketchUp-wanden die er sinds de omzetting naar het raster niet meer waren).
