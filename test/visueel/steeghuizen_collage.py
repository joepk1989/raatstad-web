# Collage van alle Steeghuizen (bij steeghuizen_alle.js): per weergave een raster met de naam eronder (de losse plaatjes blijven staan).
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
OUT = sys.argv[1]; d = json.load(open(os.path.join(OUT, 'steeghuizen_alle.json')))
ok = {u['naam']: u['ok'] for u in d['uit']}
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except Exception: font = ImageFont.load_default()
for soort, lijst in d['beelden'].items():
    K, W, H = 6, 300, 330; rows = (len(lijst) + K - 1) // K; o = Image.new('RGB', (K * W, rows * H), 'white'); dr = ImageDraw.Draw(o)
    for n, (f, naam) in enumerate(lijst):
        im = Image.open(f).convert('RGB').resize((W - 10, W - 10)); x, y = (n % K) * W, (n // K) * H; o.paste(im, (x + 5, y + 5))
        dr.text((x + 8, y + W - 2), naam, fill=(20, 20, 20) if ok.get(naam, True) else (190, 20, 20), font=font)
    o.save(os.path.join(OUT, 'steeghuizen_alle_' + soort + '.png'))
print('collages: steeghuizen_alle_{' + ','.join(d['beelden']) + '}.png')
