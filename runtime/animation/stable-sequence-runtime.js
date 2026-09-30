(() => {
  'use strict';

  // This file is deliberately browser-global: the production shell injects it and
  // Animation Lab loads it directly. Both therefore use identical normalization,
  // socket, and chain math.
  const CANVAS = Object.freeze({ width: 512, height: 768, feetX: 256, feetY: 700 });
  const median = values => {
    const list = [...values].sort((a, b) => a - b);
    if (!list.length) return 0;
    const middle = Math.floor(list.length / 2);
    return list.length % 2 ? list[middle] : (list[middle - 1] + list[middle]) / 2;
  };
  const ready = image => Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  const loadImage = src => new Promise(resolve => {
    const image = new Image();
    image.decoding = 'async';
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', () => resolve(null), { once: true });
    image.src = src;
  });

  // These regions are not Scorpion pixels. They are detached pieces from adjacent
  // source-sheet cells. They are removed in the normalization source canvas, never
  // by clipping the displayed sprite or resizing a live wrapper.
  const SCORPION_RUN_EXCLUSIONS = Object.freeze({
    0: Object.freeze([{ x: 428, y: 500, width: 84, height: 268 }]),
    1: Object.freeze([{ x: 420, y: 470, width: 92, height: 298 }]),
    2: Object.freeze([{ x: 433, y: 470, width: 79, height: 298 }]),
    3: Object.freeze([{ x: 441, y: 456, width: 71, height: 312 }]),
    4: Object.freeze([{ x: 458, y: 500, width: 54, height: 268 }]),
    6: Object.freeze([{ x: 459, y: 600, width: 53, height: 168 }]),
    7: Object.freeze([{ x: 428, y: 456, width: 84, height: 312 }]),
    8: Object.freeze([{ x: 435, y: 452, width: 77, height: 316 }])
  });

  // Attack frames 8 and 9 also include detached predecessor-cell fragments on the
  // far left. Frame 6 is genuinely incomplete and is intentionally omitted from
  // Scorpion's authored playback order below rather than being painted over.
  const SCORPION_ATTACK_EXCLUSIONS = Object.freeze({
    7: Object.freeze([{ x: 0, y: 300, width: 112, height: 468 }]),
    8: Object.freeze([{ x: 0, y: 300, width: 112, height: 468 }]),
    9: Object.freeze([{ x: 0, y: 640, width: 44, height: 128 }])
  });

  const sequenceConfig = (name, kind) => {
    const standard = { targetBodyHeight: 600, maxBodyWidth: kind === 'attack' ? 448 : kind === 'run' ? 440 : 420, exclusions: null };
    if (name !== 'Scorpion') return standard;
    if (kind === 'run') return { ...standard, exclusions: SCORPION_RUN_EXCLUSIONS };
    if (kind === 'attack') return { ...standard, exclusions: SCORPION_ATTACK_EXCLUSIONS };
    return standard;
  };

  function sourceCanvas(source, exclusions = []) {
    const width = source.naturalWidth || CANVAS.width;
    const height = source.naturalHeight || CANVAS.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, 0, 0, width, height);
    for (const region of exclusions) context.clearRect(region.x, region.y, region.width, region.height);
    return { canvas, context, width, height };
  }

  function alphaBounds(context, width, height) {
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let offset = 3; offset < pixels.length; offset += 4) {
      if (pixels[offset] <= 12) continue;
      const pixel = (offset - 3) / 4;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (maxX < minX || maxY < minY) return null;
    return Object.freeze({ width, height, minX, minY, maxX, maxY, bodyWidth: maxX - minX + 1, bodyHeight: maxY - minY + 1, centerX: (minX + maxX + 1) / 2, bottomY: maxY + 1 });
  }

  const cache = new Map();
  function normalizedSequence(name, kind, sources) {
    const key = `${name}:${kind}:${sources.join('|')}`;
    if (cache.has(key)) return cache.get(key).frames;
    const frames = sources.map(() => new Image());
    const record = { frames, metrics: [], transform: null, config: sequenceConfig(name, kind) };
    cache.set(key, record);
    (async () => {
      const prepared = [];
      for (let index = 0; index < sources.length; index++) {
        const source = await loadImage(sources[index]);
        if (!source) { prepared.push(null); record.metrics[index] = null; continue; }
        const input = sourceCanvas(source, record.config.exclusions?.[index] || []);
        const bounds = alphaBounds(input.context, input.width, input.height);
        prepared.push({ source, ...input, bounds });
        record.metrics[index] = bounds;
      }
      const valid = prepared.filter(frame => frame?.bounds);
      if (!valid.length) { sources.forEach((src, index) => { frames[index].src = src; }); return; }
      const maxBodyHeight = Math.max(...valid.map(frame => frame.bounds.bodyHeight));
      const maxBodyWidth = Math.max(...valid.map(frame => frame.bounds.bodyWidth));
      const sequenceCenterX = median(valid.map(frame => frame.bounds.centerX));
      const sequenceBottomY = median(valid.map(frame => frame.bounds.bottomY));
      const sequenceFit = Math.min(1.6, record.config.targetBodyHeight / maxBodyHeight, record.config.maxBodyWidth / maxBodyWidth);
      const dx = Math.round(CANVAS.feetX - sequenceCenterX * sequenceFit);
      const dy = Math.round(CANVAS.feetY - sequenceBottomY * sequenceFit);
      record.transform = Object.freeze({ fit: sequenceFit, dx, dy, centerX: sequenceCenterX, bottomY: sequenceBottomY, maxBodyHeight, maxBodyWidth, canvas: CANVAS });
      for (let index = 0; index < prepared.length; index++) {
        const frame = prepared[index];
        if (!frame?.bounds) { frames[index].src = sources[index]; continue; }
        const output = document.createElement('canvas');
        output.width = CANVAS.width;
        output.height = CANVAS.height;
        const outputContext = output.getContext('2d');
        outputContext.imageSmoothingEnabled = true;
        outputContext.imageSmoothingQuality = 'high';
        outputContext.drawImage(frame.canvas, 0, 0, frame.width, frame.height, dx, dy, frame.width * fit, frame.height * fit);
        await new Promise(resolve => output.toBlob(blob => {
          if (!blob) { frames[index].src = sources[index]; resolve(); return; }
          const url = URL.createObjectURL(blob);
          frames[index].addEventListener('load', () => { URL.revokeObjectURL(url); resolve(); }, { once: true });
          frames[index].addEventListener('error', resolve, { once: true });
          frames[index].src = url;
        }, 'image/png'));
      }
      console.info('[BlazingBattle] stable animation canvas', name, kind, record.transform);
    })();
    return frames;
  }

  function diagnostics(name, kind, sources) {
    return cache.get(`${name}:${kind}:${sources.join('|')}`) || null;
  }

  // World-space offsets follow Scorpion's forward throwing hand across the 12
  // authored attack poses. The renderer mirrors x for left-facing attacks.
  const attackHandSockets = Object.freeze([
    { x: 17, y: -23 }, { x: 21, y: -25 }, { x: 25, y: -28 }, { x: 29, y: -30 },
    { x: 31, y: -31 }, { x: 31, y: -31 }, { x: 30, y: -29 }, { x: 28, y: -27 },
    { x: 23, y: -24 }, { x: 20, y: -22 }, { x: 18, y: -21 }, { x: 16, y: -20 }
  ]);
  const attackFrameOrder = Object.freeze([0, 1, 2, 3, 4, 4, 6, 7, 8, 9, 10, 11]);
  function handSocket(origin, facing = 1, frameIndex = 0) {
    const socket = attackHandSockets[Math.max(0, Math.min(attackHandSockets.length - 1, frameIndex))];
    return Object.freeze({ x: origin.x + socket.x * (facing < 0 ? -1 : 1), y: origin.y + socket.y, frameIndex });
  }
  function chainGeometry(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Object.freeze({ start, end, dx, dy, length: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) });
  }
  function spearProgress(elapsed, duration) {
    const t = Math.max(0, Math.min(1, elapsed / Math.max(1, duration)));
    return Object.freeze({ t, eased: 1 - Math.pow(1 - t, 2.5) });
  }
  function drawChainSpear(context, start, end, elapsed, duration, scale = 0.55) {
    const progress = spearProgress(elapsed, duration);
    const tip = { x: start.x + (end.x - start.x) * progress.eased, y: start.y + (end.y - start.y) * progress.eased };
    const geometry = chainGeometry(start, tip);
    const links = Math.max(3, Math.ceil(geometry.length / 7.5));
    context.save();
    context.imageSmoothingEnabled = true;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (let index = 0; index <= links; index++) {
      const p = index / links;
      const x = start.x + geometry.dx * p;
      const y = start.y + geometry.dy * p + Math.sin(p * Math.PI * 2.5 + progress.t * 3) * 0.9 * (1 - p);
      context.save();
      context.translate(x, y);
      context.rotate(geometry.angle + (index % 2 ? 0 : Math.PI / 2));
      context.strokeStyle = index % 3 === 0 ? 'rgba(226,172,88,.98)' : 'rgba(86,61,43,.98)';
      context.lineWidth = 1.15;
      context.beginPath();
      context.ellipse(0, 0, 3.5, 1.55, 0, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
    context.translate(tip.x, tip.y);
    context.rotate(geometry.angle);
    context.scale(scale / .55, scale / .55);
    context.shadowColor = 'rgba(255,132,20,.48)';
    context.shadowBlur = 3;
    context.fillStyle = '#c8a15b';
    context.strokeStyle = '#3a2920';
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(18, 0); context.lineTo(4, -5.2); context.lineTo(-7, -2.1); context.lineTo(-11, 0); context.lineTo(-7, 2.1); context.lineTo(4, 5.2); context.closePath();
    context.fill(); context.stroke(); context.restore();
    return Object.freeze({ ...geometry, tip, progress });
  }

  window.BlazingStableAnimation = Object.freeze({ CANVAS, ready, normalizedSequence, diagnostics, alphaBounds, sourceCanvas, attackHandSockets, attackFrameOrder, handSocket, chainGeometry, spearProgress, drawChainSpear });
})();
