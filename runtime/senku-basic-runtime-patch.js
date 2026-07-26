(() => {
  const BOMB_SCALE = 2;
  const EXPLOSION_FRAME_MS = 75;
  const EXPLOSION_W = 132;
  const EXPLOSION_H = 73;
  const EXPLOSION_BASE = 'assets/characters/senku/vfx/bomb/small_explosion_6f/';
  const PROJECTILE_TOKEN = 'assets/characters/senku/vfx/bomb/projectile_clean/';
  const explosionFrames = [1,2,3,4,5,6].map(n => {
    const img = new Image();
    img.src = `${EXPLOSION_BASE}frame_0${n}.png`;
    return img;
  });

  let lastBombDraw = null;
  let impactTimer = null;

  function imageSrc(image) {
    return image ? String(image.currentSrc || image.src || '') : '';
  }

  function hasExactSenkuBombPath(image) {
    const src = imageSrc(image);
    return src.includes(PROJECTILE_TOKEN) || src.includes('/senku/vfx/bomb/projectile_clean/');
  }

  function looksLikeLegacySenkuImpact(image) {
    const src = imageSrc(image);
    if (!src) return false;
    return src.includes('assets/characters/senku/vfx/bomb/static_impact/') ||
      src.includes('/senku/vfx/bomb/static_impact/') ||
      src.includes('assets/characters/senku/vfx/bomb/explosion/') ||
      src.includes('/senku/vfx/bomb/explosion/');
  }

  function destRect(args, image) {
    if (args.length === 2) {
      const [dx, dy] = args;
      return { dx, dy, dw: image.naturalWidth || image.width || 0, dh: image.naturalHeight || image.height || 0 };
    }
    if (args.length === 4) {
      const [dx, dy, dw, dh] = args;
      return { dx, dy, dw, dh };
    }
    if (args.length === 8) {
      const [, , , , dx, dy, dw, dh] = args;
      return { dx, dy, dw, dh };
    }
    return null;
  }

  function isBattlefieldBombFallback(image, dest, canvas) {
    if (!image || !dest || !canvas) return false;
    const w = image.naturalWidth || image.videoWidth || image.width || 0;
    const h = image.naturalHeight || image.videoHeight || image.height || 0;
    if (w !== 96 || h !== 96) return false;

    // The live runtime can strip the source URL after loading the projectile.
    // The cleaned bomb frames are 96x96. Only accept that fallback when the
    // draw is clearly inside the battlefield, never in the top HUD/button zone.
    const centerX = dest.dx + dest.dw / 2;
    const centerY = dest.dy + dest.dh / 2;
    const minBattleY = canvas.height * 0.20;
    return centerY >= minBattleY && centerX >= 0 && centerX <= canvas.width;
  }

  function isSenkuBombDraw(image, dest, canvas) {
    return hasExactSenkuBombPath(image) || isBattlefieldBombFallback(image, dest, canvas);
  }

  function playExplosion(canvas, dest) {
    if (!canvas || !dest) return;
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / canvas.width;
    const sy = rect.height / canvas.height;
    const x = rect.left + (dest.dx + dest.dw / 2) * sx;
    const y = rect.top + (dest.dy + dest.dh) * sy;

    const img = document.createElement('img');
    img.setAttribute('data-senku-runtime-explosion', '1');
    img.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;object-fit:contain;transform:translate(-50%,-100%);transform-origin:50% 100%;';
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    img.style.width = `${EXPLOSION_W}px`;
    img.style.height = `${EXPLOSION_H}px`;
    document.body.appendChild(img);

    let frame = 0;
    const step = () => {
      if (frame >= explosionFrames.length) {
        img.remove();
        return;
      }
      img.src = explosionFrames[frame].src;
      frame += 1;
      setTimeout(step, EXPLOSION_FRAME_MS);
    };
    step();
  }

  if (!window.CanvasRenderingContext2D) return;
  const proto = CanvasRenderingContext2D.prototype;
  if (proto.__senkuPermanentBasicPatched) return;

  const originalDrawImage = proto.drawImage;
  proto.drawImage = function(image, ...args) {
    if (looksLikeLegacySenkuImpact(image)) return;

    const dest = destRect(args, image);
    if (!isSenkuBombDraw(image, dest, this.canvas)) {
      return originalDrawImage.call(this, image, ...args);
    }

    if (dest) {
      lastBombDraw = { canvas: this.canvas, dest };
      if (impactTimer) clearTimeout(impactTimer);
      impactTimer = setTimeout(() => {
        if (lastBombDraw) playExplosion(lastBombDraw.canvas, lastBombDraw.dest);
        lastBombDraw = null;
      }, 95);
    }

    if (args.length === 2) {
      const [dx, dy] = args;
      const ow = image.naturalWidth || image.width || 0;
      const oh = image.naturalHeight || image.height || 0;
      const nw = ow * BOMB_SCALE;
      const nh = oh * BOMB_SCALE;
      return originalDrawImage.call(this, image, dx - (nw - ow) / 2, dy - (nh - oh) / 2, nw, nh);
    }
    if (args.length === 4) {
      const [dx, dy, dw, dh] = args;
      const nw = dw * BOMB_SCALE;
      const nh = dh * BOMB_SCALE;
      return originalDrawImage.call(this, image, dx - (nw - dw) / 2, dy - (nh - dh) / 2, nw, nh);
    }
    if (args.length === 8) {
      const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
      const nw = dw * BOMB_SCALE;
      const nh = dh * BOMB_SCALE;
      return originalDrawImage.call(this, image, sx, sy, sw, sh, dx - (nw - dw) / 2, dy - (nh - dh) / 2, nw, nh);
    }
    return originalDrawImage.call(this, image, ...args);
  };

  proto.__senkuPermanentBasicPatched = true;
})();