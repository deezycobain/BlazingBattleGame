#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path
import shutil
import json
import cv2
import numpy as np
from PIL import Image

TREE_CANVAS=(1536,1536)
GARDEN_CANVAS=(1536,1024)
SURFACE_QUAD=np.float32([[245,275],[1291,275],[1396,683],[140,683]])
MOTIF_QUAD=np.float32([[330,315],[1206,315],[1292,650],[240,650]])

TRUNK_TRANSFORMS={
 1:(0.4418,520,645),
 2:(0.5425,464,504),
 3:(0.6060,428,415),
 4:(0.6634,395,335),
 5:(0.7146,367,265),
 6:(0.7562,344,205),
}
CANOPY_TRANSFORMS={
 1:(0.478,469,255),
 2:(0.6065,388,179),
 3:(0.7185,318,120),
 4:(0.8130,258,71),
}
BLOSSOM_TRANSFORMS={
 1:(1.2125,456,260),
 2:(1.4845,388,240),
 3:(1.7590,318,220),
}
COLORS=('pink','blue','orange','red','ice','fire')
MOTIFS=(
 ('blazing_spiral','motifs/blazing_spiral.png'),
 ('akatsuki_cloud','motifs/akatsuki_cloud.png'),
 ('petal_drift','motifs/petal_drift.png'),
 ('lotus_bloom_bonus','motifs/lotus_bloom_bonus.png'),
 ('shuriken_vortex','motifs/ninja-bonus/shuriken_vortex.png'),
 ('kunai_wind','motifs/ninja-bonus/kunai_wind.png'),
 ('shinobi_seal_mandala','motifs/ninja-bonus/shinobi_seal_mandala.png'),
 ('shuriken_smoke_cloud','motifs/ninja-bonus/shuriken_smoke_cloud.png'),
)
PATTERNS=('still_water','ripple_ring','flowing_river','spiral_wind')


def rgba(path:Path)->Image.Image:
    return Image.open(path).convert('RGBA')

def paste_scaled(src:Image.Image, scale:float, x:int, y:int, canvas=TREE_CANVAS)->Image.Image:
    w=max(1,round(src.width*scale)); h=max(1,round(src.height*scale))
    layer=src.resize((w,h),Image.Resampling.LANCZOS)
    out=Image.new('RGBA',canvas,(0,0,0,0))
    out.alpha_composite(layer,(int(round(x)),int(round(y))))
    return out

def save_png(im:Image.Image,path:Path):
    path.parent.mkdir(parents=True,exist_ok=True)
    im.save(path,optimize=True)

def relief_overlay(path:Path,quad:np.ndarray,dark_alpha=175,light_alpha=90)->Image.Image:
    im=np.array(rgba(path))
    rgb=im[:,:,:3].astype(np.float32)
    a=im[:,:,3].astype(np.float32)/255.0
    gray=cv2.cvtColor(rgb.astype(np.uint8),cv2.COLOR_RGB2GRAY).astype(np.float32)
    small=cv2.GaussianBlur(gray,(0,0),1.6)
    broad=cv2.GaussianBlur(gray,(0,0),11)
    diff=small-broad
    dark=np.clip((-diff-1.8)/18.0,0,1)
    light=np.clip((diff-2.8)/24.0,0,1)
    out=np.zeros_like(im)
    darkc=np.array([105,78,46],np.float32)
    lightc=np.array([255,238,207],np.float32)
    out[:,:,:3]=np.where((light>dark)[...,None],lightc,darkc).astype(np.uint8)
    out[:,:,3]=np.clip(np.maximum(dark*dark_alpha,light*light_alpha)*a,0,255).astype(np.uint8)
    h,w=im.shape[:2]
    srcq=np.float32([[0,0],[w-1,0],[w-1,h-1],[0,h-1]])
    M=cv2.getPerspectiveTransform(srcq,quad)
    warped=cv2.warpPerspective(out,M,GARDEN_CANVAS,flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT,borderValue=(0,0,0,0))
    mask=np.zeros((GARDEN_CANVAS[1],GARDEN_CANVAS[0]),np.uint8)
    cv2.fillConvexPoly(mask,quad.astype(np.int32),255)
    mask=cv2.GaussianBlur(mask,(0,0),3)
    warped[:,:,3]=(warped[:,:,3].astype(np.float32)*(mask/255.0)).astype(np.uint8)
    return Image.fromarray(warped)

def fit_transparent(src:Image.Image,max_w:int,max_h:int,center:tuple[int,int],canvas=GARDEN_CANVAS)->Image.Image:
    bbox=src.getchannel('A').getbbox()
    if not bbox:
        return Image.new('RGBA',canvas,(0,0,0,0))
    cropped=src.crop(bbox)
    scale=min(max_w/cropped.width,max_h/cropped.height)
    size=(max(1,round(cropped.width*scale)),max(1,round(cropped.height*scale)))
    cropped=cropped.resize(size,Image.Resampling.LANCZOS)
    out=Image.new('RGBA',canvas,(0,0,0,0))
    x=round(center[0]-size[0]/2); y=round(center[1]-size[1]/2)
    out.alpha_composite(cropped,(x,y))
    return out

def build_tree(root:Path,out:Path):
    t=out/'tree'
    for i in range(1,5):
        source=rgba(root/f'bonsai/roots/rootbase_0{i}.png')
        a=np.array(source)
        if a.shape[0] > 455:
            a[455:,:,3]=0
        source=Image.fromarray(a)
        full=paste_scaled(source,0.992,387,1028)
        save_png(full,t/f'rootbase_0{i}.png')
        arr=np.array(full)
        arr[:1239,:,3]=0
        save_png(Image.fromarray(arr),t/f'rootfront_0{i}.png')
    for i,(scale,x,y) in TRUNK_TRANSFORMS.items():
        save_png(paste_scaled(rgba(root/f'bonsai/trunks/trunk_0{i}.png'),scale,x,y),t/f'trunk_0{i}.png')
    for family in ('green','jade'):
        for i,(scale,x,y) in CANOPY_TRANSFORMS.items():
            save_png(paste_scaled(rgba(root/f'bonsai/canopy/{family}/canopy_0{i}.png'),scale,x,y),t/f'canopy_{family}_0{i}.png')
    for color in COLORS:
        for i,(scale,x,y) in BLOSSOM_TRANSFORMS.items():
            save_png(paste_scaled(rgba(root/f'bonsai/blossoms/{color}/blossom_0{i}.png'),scale,x,y),t/f'blossom_{color}_0{i}.png')

def build_garden(root:Path,out:Path):
    g=out/'garden'
    save_png(rgba(root/'sand/base/sand_bed_base.png'),g/'sand_bed_base.png')
    for name in PATTERNS:
        save_png(relief_overlay(root/f'sand/patterns/{name}.png',SURFACE_QUAD,175,90),g/f'pattern_{name}.png')
    for name,rel in MOTIFS:
        save_png(relief_overlay(root/f'sand/{rel}',MOTIF_QUAD,145,70),g/f'motif_{name}.png')
    save_png(fit_transparent(rgba(root/'sand/name-templates/straight.png'),900,270,(768,500)),g/'name_straight.png')
    save_png(fit_transparent(rgba(root/'sand/name-templates/arc.png'),900,290,(768,490)),g/'name_arc.png')
    save_png(fit_transparent(rgba(root/'sand/name-templates/seal.png'),500,500,(768,500)),g/'name_seal.png')
    stone_map={
      'centered':'sand/stones/variants/moss_cluster.png',
      'riverbank':'sand/stones/variants/stepping_stones.png',
      'mountain':'sand/stones/variants/rock_spire.png',
    }
    placements={
      'centered':(600,410,(768,520)),
      'riverbank':(690,360,(1040,525)),
      'mountain':(560,430,(800,520)),
    }
    for name,rel in stone_map.items():
        mw,mh,center=placements[name]
        save_png(fit_transparent(rgba(root/rel),mw,mh,center),g/f'stones_{name}.png')

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--root',default='assets/ui/sanctuary/first-bloom')
    ap.add_argument('--out',default='assets/ui/sanctuary/first-bloom/runtime')
    args=ap.parse_args()
    root=Path(args.root); out=Path(args.out)
    if out.exists(): shutil.rmtree(out)
    out.mkdir(parents=True,exist_ok=True)
    build_tree(root,out)
    build_garden(root,out)
    manifest={
      'version':1,
      'treeCanvas':{'width':TREE_CANVAS[0],'height':TREE_CANVAS[1]},
      'gardenCanvas':{'width':GARDEN_CANVAS[0],'height':GARDEN_CANVAS[1]},
      'potOwnership':'rootbase',
      'renderOrder':{
        'tree':['rootbase','trunk','canopy','blossom','rootfront'],
        'garden':['sand_bed_base','pattern','motif','name','stones']
      },
      'stoneProductionMap':{'centered':'moss_cluster','riverbank':'stepping_stones','mountain':'rock_spire'},
      'notes':['No object-fit: fill is required for runtime layers.','Original core stone layouts remain source-only because of matte remnants.','Sand pattern and motif runtime files are groove-only transparent overlays.']
    }
    (out/'MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(f'Sanctuary runtime assets generated: {out}')

if __name__=='__main__':
    main()
