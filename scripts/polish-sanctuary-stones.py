#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageChops

GARDEN_CANVAS=(1536,1024)

# V1 stone compositions intentionally frame the open sand instead of occupying
# the visual center beneath the bonsai. Sizes are restrained for phone viewing.
STONE_LAYOUTS={
    'centered':{
        'source':'sand/stones/variants/moss_cluster.png',
        'max_size':(370,240),
        'center':(470,525),
        'role':'left midground cluster',
    },
    'riverbank':{
        'source':'sand/stones/variants/stepping_stones.png',
        'max_size':(580,270),
        'center':(1060,510),
        'role':'right sweeping bank',
    },
    'mountain':{
        'source':'sand/stones/variants/rock_spire.png',
        'max_size':(310,320),
        'center':(390,455),
        'role':'left rear vertical accent',
    },
}


def rgba(path:Path)->Image.Image:
    return Image.open(path).convert('RGBA')


def fit_transparent(src:Image.Image,max_w:int,max_h:int,center:tuple[int,int])->Image.Image:
    bbox=src.getchannel('A').getbbox()
    if not bbox:
        return Image.new('RGBA',GARDEN_CANVAS,(0,0,0,0))
    cropped=src.crop(bbox)
    scale=min(max_w/cropped.width,max_h/cropped.height)
    size=(max(1,round(cropped.width*scale)),max(1,round(cropped.height*scale)))
    cropped=cropped.resize(size,Image.Resampling.LANCZOS)
    out=Image.new('RGBA',GARDEN_CANVAS,(0,0,0,0))
    x=round(center[0]-size[0]/2)
    y=round(center[1]-size[1]/2)
    out.alpha_composite(cropped,(x,y))
    return out


def shift_mask(mask:Image.Image,dx:int,dy:int)->Image.Image:
    out=Image.new('L',mask.size,0)
    out.paste(mask,(dx,dy))
    return out


def grounded_stones(stones:Image.Image)->Image.Image:
    """Add restrained broad + tight sand contact shadows behind authored rocks.

    This is deliberately not a generic CSS drop shadow. The broad shadow gives
    mass while the tighter shadow makes the stones feel slightly embedded in sand.
    Both stay inside the same canonical garden canvas as the production layout.
    """
    alpha=stones.getchannel('A')

    broad=alpha.filter(ImageFilter.GaussianBlur(11))
    broad=shift_mask(broad,0,10)
    broad_arr=(np.array(broad,dtype=np.float32)*0.34).clip(0,255).astype(np.uint8)
    broad=Image.fromarray(broad_arr,'L')

    tight=alpha.filter(ImageFilter.GaussianBlur(3.2))
    tight=shift_mask(tight,0,5)
    tight_arr=(np.array(tight,dtype=np.float32)*0.28).clip(0,255).astype(np.uint8)
    tight=Image.fromarray(tight_arr,'L')

    shadow_alpha=ImageChops.lighter(broad,tight)
    shadow=Image.new('RGBA',GARDEN_CANVAS,(71,50,29,0))
    shadow.putalpha(shadow_alpha)

    return Image.alpha_composite(shadow,stones)


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--root',default='assets/ui/sanctuary/first-bloom')
    ap.add_argument('--out',default='assets/ui/sanctuary/first-bloom/runtime')
    args=ap.parse_args()

    root=Path(args.root)
    out=Path(args.out)
    garden=out/'garden'
    garden.mkdir(parents=True,exist_ok=True)

    manifest_layouts={}
    for name,spec in STONE_LAYOUTS.items():
        max_w,max_h=spec['max_size']
        stones=fit_transparent(rgba(root/spec['source']),max_w,max_h,tuple(spec['center']))
        grounded=grounded_stones(stones)
        grounded.save(garden/f'stones_{name}.png',optimize=True)
        manifest_layouts[name]={
            'source':spec['source'],
            'maxSize':[max_w,max_h],
            'center':list(spec['center']),
            'role':spec['role'],
        }

    manifest_path=out/'MANIFEST.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    manifest['stonePass']={
        'renderer':'framed_grounded_v1',
        'layouts':manifest_layouts,
        'broadShadow':{'blur':11,'offsetY':10,'alphaScale':0.34},
        'contactShadow':{'blur':3.2,'offsetY':5,'alphaScale':0.28},
    }
    notes=manifest.setdefault('notes',[])
    note='Stone compositions frame the open sand from left/right anchors and carry authored contact shadows; no V1 stone group occupies the bonsai centerline.'
    if note not in notes:
        notes.append(note)
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print('Sanctuary stone polish PASS: side-framed grounded layouts generated.')


if __name__=='__main__':
    main()
