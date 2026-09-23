#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"legacy-card-audit-output"
OUT.mkdir(exist_ok=True)
IDS=["kakashi","obito","jiraiya","sasuke","pain","scorpion","rock_lee","mashle","jackie_chan","gabimaru","killua","zabuza"]
font=ImageFont.load_default()

cards=[]
rows=[]
for uid in IDS:
    unit=json.loads((ROOT/f"assets/characters/{uid}/data/unit.json").read_text())
    rel=unit["assets"]["art"]
    path=ROOT/"assets"/"characters"/uid/rel
    im=Image.open(path).convert("RGB")
    rows.append({"id":uid,"display_name":unit["display_name"],"path":str(path.relative_to(ROOT)),"size":[im.width,im.height]})
    thumb=im.copy()
    thumb.thumbnail((420,600),Image.Resampling.LANCZOS)
    cards.append((uid,unit["display_name"],thumb))

cols=3
cell_w,cell_h=460,660
sheet=Image.new("RGB",(cols*cell_w,math.ceil(len(cards)/cols)*cell_h),(22,22,26))
d=ImageDraw.Draw(sheet)
for i,(uid,name,im) in enumerate(cards):
    x=(i%cols)*cell_w+20
    y=(i//cols)*cell_h+30
    d.text((x,y-18),f"{name} [{uid}]",font=font,fill=(245,245,245))
    sheet.paste(im,(x+(420-im.width)//2,y))
sheet.save(OUT/"legacy-card-master-audit.jpg",quality=94)
(OUT/"legacy-card-audit.json").write_text(json.dumps(rows,indent=2)+"\n")
print("Wrote Legacy card master audit")
