#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

GARDEN_CANVAS=(1536,1024)
SURFACE_QUAD=np.float32([[245,275],[1291,275],[1396,683],[140,683]])
PATTERNS=('still_water','ripple_ring','flowing_river','spiral_wind')


def natural_groove_overlay(path:Path,quad:np.ndarray)->Image.Image:
    """Turn authored rake paintings into subtle sand grooves instead of dark stripes.

    The source art carries broad shaded furrows and sand texture. Rendering the whole
    dark furrow directly made the phone-sized garden look drawn-on and muddy. This
    pass treats the furrow as shallow terrain: a restrained central depression plus
    narrow light/shadow rims, then fades the result before it reaches the planter wall.
    """
    im=np.array(Image.open(path).convert('RGBA'))
    rgb=im[:,:,:3]
    source_alpha=im[:,:,3].astype(np.float32)/255.0
    gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY).astype(np.float32)

    # Remove grain and estimate the local undisturbed sand brightness.
    smooth=cv2.GaussianBlur(gray,(0,0),2.2)
    local_bg=cv2.GaussianBlur(gray,(0,0),18)
    depth=np.clip((local_bg-smooth-1.0)/22.0,0,1)
    depth=np.clip((depth-0.08)/0.92,0,1)
    depth=cv2.GaussianBlur(depth,(0,0),0.8)

    # Directional rims make each furrow read as impressed sand rather than ink.
    dx=cv2.Sobel(depth,cv2.CV_32F,1,0,ksize=3)
    dy=cv2.Sobel(depth,cv2.CV_32F,0,1,ksize=3)
    directional=(-0.25*dx-0.97*dy)
    highlight=np.clip(directional/1.2,0,1)
    shadow=np.clip(-directional/1.2,0,1)

    dark_alpha=np.clip(depth*18.0 + shadow*80.0,0,255)
    light_alpha=np.clip(highlight*55.0,0,255)
    dark_color=np.array([108,82,55],np.uint8)
    light_color=np.array([255,244,216],np.uint8)

    out=np.zeros_like(im)
    use_light=light_alpha>dark_alpha
    out[:,:,:3]=np.where(use_light[...,None],light_color,dark_color)
    out[:,:,3]=np.clip(np.maximum(dark_alpha,light_alpha)*source_alpha,0,255).astype(np.uint8)

    h,w=gray.shape
    src_quad=np.float32([[0,0],[w-1,0],[w-1,h-1],[0,h-1]])
    transform=cv2.getPerspectiveTransform(src_quad,quad)
    warped=cv2.warpPerspective(
        out,transform,GARDEN_CANVAS,
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0,0,0,0),
    )

    # Inset fade prevents rake marks from colliding with the planter's inner wall.
    surface=np.zeros((GARDEN_CANVAS[1],GARDEN_CANVAS[0]),np.uint8)
    cv2.fillConvexPoly(surface,quad.astype(np.int32),255)
    distance=cv2.distanceTransform(surface,cv2.DIST_L2,5)
    edge_fade=np.clip(distance/48.0,0,1)
    warped[:,:,3]=(warped[:,:,3].astype(np.float32)*edge_fade).astype(np.uint8)
    return Image.fromarray(warped)


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--root',default='assets/ui/sanctuary/first-bloom')
    ap.add_argument('--out',default='assets/ui/sanctuary/first-bloom/runtime')
    args=ap.parse_args()

    root=Path(args.root)
    out=Path(args.out)
    garden=out/'garden'
    garden.mkdir(parents=True,exist_ok=True)

    for name in PATTERNS:
        overlay=natural_groove_overlay(root/f'sand/patterns/{name}.png',SURFACE_QUAD)
        overlay.save(garden/f'pattern_{name}.png',optimize=True)

    manifest_path=out/'MANIFEST.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    manifest['rakePass']={
        'renderer':'natural_groove_v1',
        'centralDepressionAlpha':18,
        'rimShadowAlpha':80,
        'rimHighlightAlpha':55,
        'surfaceEdgeFadePx':48,
    }
    notes=manifest.setdefault('notes',[])
    note='Rake patterns use shallow directional groove shading with an inset edge fade; broad source furrows are never rendered as dark painted stripes.'
    if note not in notes:
        notes.append(note)
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print('Sanctuary rake polish PASS: natural groove overlays generated.')


if __name__=='__main__':
    main()
