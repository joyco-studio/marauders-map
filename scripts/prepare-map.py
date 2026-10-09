"""Deterministic original map artwork and paper textures. Run with Pillow installed."""
from pathlib import Path
from PIL import Image, ImageFilter
import math, random, json, base64
out=Path('public/map'); out.mkdir(exist_ok=True)
rng=random.Random(394)

def svg(w,h,body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><g fill="none" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>'
def path(d,extra=''): return f'<path d="{d}" {extra}/>'
def rect(x,y,w,h,extra=''): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" {extra}/>'
def circ(x,y,r,extra=''): return f'<circle cx="{x}" cy="{y}" r="{r}" {extra}/>'
def room(w,h,kind):
    a=rect(15,15,w-30,h-30)+rect(21,21,w-42,h-42)+rect(28,28,w-56,h-56)
    for x in range(35,w-28,20):
        a+=path(f'M{x} 15v13 M{x} {h-28}v13', 'stroke-width="2"')
        a+=path(f'M{x} 6l5 5m-9 0l5-5 M{x} {h-6}l5-5m-9 0l5 5', 'opacity=".5"')
    for y in range(36,h-25,20): a+=path(f'M15 {y}h13 M{w-28} {y}h13','stroke-width="2"')
    if kind=='hall':
        for x in [w*.28,w*.5,w*.72]:
            a+=rect(x-12,45,24,h-90)+rect(x-9,48,18,h-96)
            for y in range(52,h-48,13): a+=path(f'M{x-17} {y}h4 M{x+13} {y}h4')
        a+=path(f'M35 {h-34}h{w-70}m0-6H35')
    elif kind=='library':
        for x in range(40,w-30,30):
            a+=rect(x,38,13,h-76)
            for y in range(42,h-37,7): a+=path(f'M{x+2} {y}h9')
    elif kind=='courtyard':
        a+=rect(45,45,w-90,h-90)
        for x in [65,w-65]:
            for y in [65,h-65]: a+=circ(x,y,12)+circ(x,y,8)
        a+=circ(w/2,h/2,28)+circ(w/2,h/2,20)+circ(w/2,h/2,4)
        for i in range(12):
            angle=i*math.pi/6; x=w/2+28*math.cos(angle); y=h/2+28*math.sin(angle)
            a+=path(f'M{w/2} {h/2}L{x:.1f} {y:.1f}','opacity=".35"')
        a+=path(f'M{w/2} 28V{h/2-28} M{w/2} {h/2+28}V{h-28}')
    elif kind=='stairs':
        for i in range(4):
            x=38+(i%2)*80; y=35+i*45
            a+=rect(x,y,70,34)
            for j in range(9): a+=path(f'M{x+7*j} {y}v34')
            a+=path(f'M{x} {y+17}h70','stroke-dasharray="2 3"')
        a+=path('M45 230L120 205M115 160L45 135M45 90L120 65')
    else:
        a+=path(f'M{w/2} 28V{h-28} M28 {h/2}H{w-28}','stroke-width="3"')
        for x in [w*.28,w*.72]:
            for y in [h*.3,h*.72]:
                a+=circ(x,y,10)+rect(x-18,y-26,36,9)
                for j in [-1,1]: a+=rect(x+j*24-3,y-3,6,6)
    # Stone wall cross-hatching and towers.
    for i in range(0,int(w-32),9): a+=path(f'M{16+i} 15l7 6 M{16+i} {h-21}l7 6','opacity=".45" stroke-width=".7"')
    for x,y in [(15,15),(w-15,15),(15,h-15),(w-15,h-15)]: a+=circ(x,y,11)+circ(x,y,7)+path(f'M{x-15} {y}h30 M{x} {y-15}v30','opacity=".6"')
    return svg(w,h,a)
regions=[('great-hall',260,240,'hall'),('library',240,210,'library'),('courtyard',260,260,'courtyard'),('stairs',210,260,'stairs'),('classrooms',260,205,'classrooms')]
for name,w,h,kind in regions: (out/f'{name}.svg').write_text(room(w,h,kind))
# Ornate cover border, scaled to the actual center panel's proportions.
cover=rect(10,12,260,676)+rect(15,17,250,666)+rect(20,22,240,656)
for x,y,sx,sy in [(23,25,1,1),(257,25,-1,1),(23,675,1,-1),(257,675,-1,-1)]:
    cover+=f'<g transform="translate({x} {y}) scale({sx} {sy})">'+path('M0 45V0h45M0 25Q25 25 25 0M0 13Q13 13 13 0M5 35q14-13 20-3q-4 10-13 8')+circ(0,0,4)+'</g>'
(out/'cover.svg').write_text(svg(280,700,cover))
# Full-sheet connectors. Room centers are specified in the scene manifest.
a=''
for y in [172,315,455]:
    a+=path(f'M120 {y}H1220 M120 {y+12}H1220','stroke-width="1.2"')
    for x in range(130,1220,18): a+=path(f'M{x} {y}l10 12','opacity=".2" stroke-width=".6"')
for x in [330,575,795,1060]:
    a+=path(f'M{x} 115V480 M{x+12} 115V480','stroke-width="1"')
# Small buttresses, arched doorways, and trees along lower grounds.
for i in range(12):
    x=115+i*103
    a+=path(f'M{x} 490q-18-18 0-36q18 18 0 36m0-30v44','opacity=".5"')
    a+=circ(x-7,472,8,'opacity=".5"')+circ(x+7,472,8,'opacity=".5"')
(out/'corridors.svg').write_text(svg(1400,700,a))
# Etched border, delicate flourishes and compass, all original paths.
a=rect(22,22,1356,656)+rect(28,28,1344,644)+rect(38,38,1324,624)
for x in range(42,1360,14): a+=path(f'M{x} 22l7 6l7-6 M{x} 678l7-6l7 6','opacity=".6" stroke-width=".8"')
for y in range(42,654,14): a+=path(f'M22 {y}l6 7l-6 7 M1378 {y}l-6 7l6 7','opacity=".6" stroke-width=".8"')
for x,y,sx,sy in [(48,48,1,1),(1352,48,-1,1),(48,652,1,-1),(1352,652,-1,-1)]:
    a+=f'<g transform="translate({x} {y}) scale({sx} {sy})">'+path('M0 60V0h60M0 35Q35 35 35 0M0 20Q20 20 20 0M5 50Q50 50 50 5')+circ(0,0,5)+path('M5 50q10-16 20-8q8 8-8 15M50 5q-16 10-8 20q8 8 15-8')+'</g>'
# Compass at lower left.
a+='<g transform="translate(98 577)">'+circ(0,0,37)+circ(0,0,31)+path('M0-46L7-7L46 0L7 7L0 46L-7 7L-46 0L-7-7Z')+path('M0-46V46M-46 0H46M-24-24L24 24M24-24L-24 24')+circ(0,0,4)+'</g>'
(out/'border.svg').write_text(svg(1400,700,a))
(out/'passage.svg').write_text(svg(1400,700,path('M1050 300C1100 295 1130 430 1190 459Q1250 480 1290 535','stroke-dasharray="5 7" stroke-width="2.5"')+circ(1050,300,17)+circ(1290,535,11)))
# Atlas source: four padded 128px cells. Manifest uses pixel-space crop rectangles.
foot=path('M55 19C42 14 35 27 37 46L40 71Q42 82 56 81Q70 80 71 64L72 40Q73 23 61 19Z','fill="white" stroke="none"')+path('M41 88Q54 84 68 89L68 102Q52 111 41 101Z','fill="white" stroke="none"')
star=path('M64 17L70 54L106 64L70 72L64 111L56 72L18 64L56 54Z')+circ(64,64,35)
key=circ(48,45,18)+circ(48,45,10)+path('M61 58L94 91M84 81L77 88M91 88L84 95','stroke-width="5"')
a='<g>'+foot+'</g><g transform="translate(128 0) translate(128 0) scale(-1 1)">'+foot+'</g><g transform="translate(256 0)">'+star+'</g><g transform="translate(384 0)">'+key+'</g>'
(out/'sprites/source.svg').write_text(svg(512,128,a))
manifest={'size':[512,128],'sprites':{name:{'bounds':[i*128,0,128,128],'center':[64,64]} for i,name in enumerate(['left','right','compass','key'])}}
(out/'sprites/atlas.json').write_text(json.dumps(manifest,indent=2))
# Mottled paper with fine fibers, water stains, and weathered edges.
w,h=1400,700
low=Image.new('L',(100,50)); low.putdata([rng.randint(40,220) for _ in range(5000)])
low=low.resize((w,h),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(8))
px=low.load(); im=Image.new('RGB',(w,h)); data=[]
for y in range(h):
    for x in range(w):
        edge=min(x,w-1-x,y,h-1-y)
        wear=math.exp(-edge/19)*rng.uniform(18,42)
        mottling=(px[x,y]-128)*.075 + rng.gauss(0,1.6)
        stain=0
        for cx,cy,rx,ry in [(80,145,75,130),(1300,620,90,45),(560,80,120,55),(1180,380,50,100)]:
            stain+=14*math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2)*2)
        data.append(tuple(int(max(0,min(255,c+mottling-wear-stain))) for c in (225,202,158)))
im.putdata(data); im.save(out/'parchment.jpg',quality=93)
# Combined static fallback keeps labels readable without a GPU.
paper_data=base64.b64encode((out/'parchment.jpg').read_bytes()).decode()
parts=[f'<image href="data:image/jpeg;base64,{paper_data}" width="1400" height="700"/>']

border=(out/'border.svg').read_text().split('>',1)[1].rsplit('</svg>',1)[0].replace('stroke="white"','stroke="#593724"')
parts.append(border)
positions=[(240,260),(465,390),(700,265),(915,380),(1160,230)]
for (name,rw,rh,kind),(cx,cy) in zip(regions,positions):
    body=room(rw,rh,kind).split('<g ',1)[1].rsplit('</svg>',1)[0]
    parts.append(f'<g transform="translate({cx-rw/2} {cy-rh/2})" '+body.replace('stroke="white"','stroke="#593724"'))
labels=[(700,93,'The Marauder’s Map',42),(700,127,'Hogwarts School of Witchcraft & Wizardry',17),(240,410,'The Great Hall',21),(465,530,'The Library',21),(700,429,'The Courtyard',21),(915,540,'Moving Staircases',21),(1160,369,'Classrooms',21)]
font_styles=''.join('@font-face { font-family: '+name+'; src: url(data:font/ttf;base64,'+base64.b64encode((out/'fonts'/filename).read_bytes()).decode()+') format("truetype"); }' for name,filename in [('Tangerine','tangerine-bold.ttf')])
parts.insert(0, '<defs><style>'+font_styles+'</style></defs>')
for x,y,t,size in labels:
    family='Tangerine'
    size=round(size*1.65)
    parts.append(f'<text x="{x}" y="{y}" text-anchor="middle" fill="#593724" font-family="{family}" font-size="{size}">{t.replace("&","&amp;")}</text>')
(out/'fallback.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="700" viewBox="0 0 1400 700">'+''.join(parts)+'</svg>')
print('Prepared original architecture, atlas source, fallback, and parchment.')
