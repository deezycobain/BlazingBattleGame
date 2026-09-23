#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"legacy-sprite-audit-output"
OUT.mkdir(exist_ok=True)
IDS=["kakashi","obito","jiraiya","sasuke","pain","scorpion","rock_lee","mashle","jackie_chan","gabimaru","killua","zabuza"]
BG=(28,28,32,255)
PANEL=(44,44,50,255)
GRID=(74,74,82,255)
TEXT=(240,240,244,255)
WARN=(255,190,70,255)
font=ImageFont.load_default()

def checker(size,step=16):
    w,h=size
    im=Image.new("RGBA",size,(34,34,38,255)); d=ImageDraw.Draw(im)
    for y in range(0,h,step):
        for x in range(0,w,step):
            if ((x//step)+(y//step))%2:
                d.rectangle([x,y,min(w,x+step-1),min(h,y+step-1)],fill=(52,52,58,255))
    return im

def fit(im,box):
    w,h=box
    scale=min(w/im.width,h/im.height)
    nw=max(1,round(im.width*scale)); nh=max(1,round(im.height*scale))
    return im.resize((nw,nh),Image.Resampling.LANCZOS)

def alpha_bbox(im):
    if im.mode!="RGBA": im=im.convert("RGBA")
    a=im.getchannel("A")
    return a.point(lambda v:255 if v>12 else 0).getbbox()

def paste_panel(canvas, im, xy, box, label, warn=False):
    x,y=xy; w,h=box
    d=ImageDraw.Draw(canvas)
    d.rectangle([x,y,x+w,y+h],fill=PANEL,outline=GRID)
    bg=checker((w,h))
    canvas.alpha_composite(bg,(x,y))
    thumb=fit(im,(w-12,h-24))
    ox=x+(w-thumb.width)//2; oy=y+18+(h-24-thumb.height)//2
    canvas.alpha_composite(thumb,(ox,oy))
    d.text((x+5,y+4),label,font=font,fill=WARN if warn else TEXT)

audit=json.loads((ROOT/"assets/events/legacy-of-shinobi/sprite-audit.json").read_text())
master_cards=[]

for uid in IDS:
    unit=json.loads((ROOT/f"assets/characters/{uid}/data/unit.json").read_text())
    source=unit["animation_standard"]["source_sheets"]
    W,H=1900,1320
    canvas=Image.new("RGBA",(W,H),BG)
    d=ImageDraw.Draw(canvas)
    d.text((24,18),f"{unit['display_name']} | {uid}",font=font,fill=TEXT)
    y=48
    for kind,title in [("idle","IDLE"),("basic_attack","BASIC ATTACK")]:
        sp=ROOT/source[kind]["path"]
        sim=Image.open(sp).convert("RGBA")
        d.text((24,y),f"{title} SOURCE {sim.width}x{sim.height} layout {source[kind]['columns']}x{source[kind]['rows']}",font=font,fill=TEXT)
        paste_panel(canvas,sim,(24,y+20),(1850,300),"SOURCE SHEET")
        y+=340
        frames=unit["animation_standard"]["animations"][kind]["frames"]
        fw=296; fh=360; gap=12
        audited=audit["units"][uid][kind]["audit_frames"]
        for i,rel in enumerate(frames):
            fp=ROOT/"assets"/"characters"/uid/rel
            im=Image.open(fp).convert("RGBA")
            box=alpha_bbox(im)
            vis=(box[2]-box[0],box[3]-box[1]) if box else (0,0)
            suspect=(vis[0]<120 or vis[1]<300 or box is None)
            label=f"F{i+1} {im.width}x{im.height} vis {vis[0]}x{vis[1]}"
            paste_panel(canvas,im,(24+i*(fw+gap),y),(fw,fh),label,suspect)
        y+=390
    out=OUT/f"{uid}.png"; canvas.save(out,optimize=True)
    mini=fit(canvas,(950,660)); master_cards.append((uid,mini))

cols=2; cardw=970; cardh=700
rows=math.ceil(len(master_cards)/cols)
master=Image.new("RGBA",(cols*cardw,rows*cardh),(18,18,22,255))
d=ImageDraw.Draw(master)
for i,(uid,im) in enumerate(master_cards):
    x=(i%cols)*cardw+10; y=(i//cols)*cardh+25
    d.text((x,y-17),uid,font=font,fill=TEXT)
    master.alpha_composite(im,(x,y))
master.save(OUT/"legacy-sprite-master-audit.png",optimize=True)
print(f"Wrote {len(IDS)} unit audit sheets plus master to {OUT}")
