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

  function looksLikeSenkuBombForScale(image) {
    if (!image) return false;
    const src = imageSrc(image);
    if (src.includes('/senku/') && src.includes('bomb')) return true;
    if (src.includes('projectile_clean')) return true;
    const w = image.naturalWidth || image.videoWidth || image.width || 0;
    const h = image.naturalHeight || image.videoHeight || image.height || 0;
    return w === 96 && h === 96;
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

  function wrapDrawImage(original) {
    if (typeof original !== 'function' || original.__senkuApproved2xWrapped) return original;

    function patchedDrawImage(image, ...args) {
      if (looksLikeLegacySenkuImpact(image)) return;

      const dest = destRect(args, image);
      if (hasExactSenkuBombPath(image) && dest) {
        lastBombDraw = { canvas: this.canvas, dest };
        if (impactTimer) clearTimeout(impactTimer);
        impactTimer = setTimeout(() => {
          if (lastBombDraw) playExplosion(lastBombDraw.canvas, lastBombDraw.dest);
          lastBombDraw = null;
        }, 95);
      }

      if (!looksLikeSenkuBombForScale(image)) return original.call(this, image, ...args);

      if (args.length === 2) {
        const [dx, dy] = args;
        const ow = image.naturalWidth || image.width || 0;
        const oh = image.naturalHeight || image.height || 0;
        const nw = ow * BOMB_SCALE;
        const nh = oh * BOMB_SCALE;
        return original.call(this, image, dx - (nw - ow) / 2, dy - (nh - oh) / 2, nw, nh);
      }
      if (args.length === 4) {
        const [dx, dy, dw, dh] = args;
        const nw = dw * BOMB_SCALE;
        const nh = dh * BOMB_SCALE;
        return original.call(this, image, dx - (nw - dw) / 2, dy - (nh - dh) / 2, nw, nh);
      }
      if (args.length === 8) {
        const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
        const nw = dw * BOMB_SCALE;
        const nh = dh * BOMB_SCALE;
        return original.call(this, image, sx, sy, sw, sh, dx - (nw - dw) / 2, dy - (nh - dh) / 2, nw, nh);
      }
      return original.call(this, image, ...args);
    }

    patchedDrawImage.__senkuApproved2xWrapped = true;
    return patchedDrawImage;
  }

  function patchContext(ctx) {
    if (!ctx || ctx.__senkuApproved2xPatched) return ctx;
    try {
      ctx.drawImage = wrapDrawImage(ctx.drawImage);
      ctx.__senkuApproved2xPatched = true;
    } catch (_) {}
    return ctx;
  }

  // Critical fix: patch EVERY 2D context at the moment it is created.
  // The boss battle canvas is created well after page load, which is why the
  // previous time-limited startup patch could work in the wrapper but fail in
  // the real game after navigating into battle.
  if (window.HTMLCanvasElement && !HTMLCanvasElement.prototype.__senkuGetContextPatched) {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const ctx = originalGetContext.call(this, type, ...args);
      return type === '2d' ? patchContext(ctx) : ctx;
    };
    HTMLCanvasElement.prototype.__senkuGetContextPatched = true;
  }

  function installApprovedPatch() {
    if (window.CanvasRenderingContext2D) {
      const proto = CanvasRenderingContext2D.prototype;
      if (!proto.__senkuApproved2xPatched) {
        proto.drawImage = wrapDrawImage(proto.drawImage);
        proto.__senkuApproved2xPatched = true;
      }
    }
    document.querySelectorAll('canvas').forEach(canvas => {
      try { patchContext(canvas.getContext('2d')); } catch (_) {}
    });
  }

  installApprovedPatch();
  window.addEventListener('load', installApprovedPatch);
  // Keep a low-frequency safety pass because the legacy runtime can replace
  // canvas/context objects during screen transitions.
  setInterval(installApprovedPatch, 1000);
})();