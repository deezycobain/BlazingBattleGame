(() => {
  'use strict';

  const key = 'BlazingBattleAssetWarmup';
  if (window[key]) return;

  function distinctPlayableNames(units) {
    return [...new Set((Array.isArray(units) ? units : [])
      .map(unit => unit?.name)
      .filter(name => typeof name === 'string' && name && name !== '—'))];
  }

  // The countdown has roughly three seconds before player input. Warming three
  // idle/run frames per imported fighter improves first-drag responsiveness
  // without allocating every 512×768 frame on iPhone at battle entry.
  function warm(units) {
    const names = distinctPlayableNames(units);
    const motion = window.BlazingUploadedCharacterMotion;
    if (!motion?.preload) return { names, queued: 0, available: false };
    let queued = 0;
    for (const name of names) {
      if (motion.has?.(name)) queued += motion.preload(name, ['idle', 'run'], 3);
    }
    return { names, queued, available: true };
  }

  window[key] = Object.freeze({ warm });
})();
