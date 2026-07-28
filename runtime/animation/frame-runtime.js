(()=>{
  'use strict';

  class BlazingFrameRuntime{
    static loadFrames(paths){
      return (paths||[]).map(src=>{
        const img=new Image();
        img.src=src;
        return img;
      });
    }

    static frameAt(frames,{elapsedMs=0,frameMs=100,loop=false}={}){
      if(!Array.isArray(frames)||!frames.length)return null;
      const safeFrameMs=Math.max(1,Number(frameMs)||100);
      const raw=Math.max(0,Math.floor((Number(elapsedMs)||0)/safeFrameMs));
      const index=loop?raw%frames.length:Math.min(frames.length-1,raw);
      return frames[index]||null;
    }

    static progress(start,duration,now=performance.now()){
      const d=Math.max(1,Number(duration)||1);
      return Math.max(0,Math.min(1,(now-(Number(start)||0))/d));
    }
  }

  window.BlazingFrameRuntime=BlazingFrameRuntime;
})();
