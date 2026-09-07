import { webkit } from 'playwright';

const BASE=(process.env.BB_SMOKE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
let browser;
try{
  browser=await webkit.launch({headless:true,timeout:15000});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.bb-home-theme .bb-home-actions').waitFor({state:'visible',timeout:30000});
  const loading=page.locator('#bb-loading-screen');
  if(await loading.count())await loading.waitFor({state:'hidden',timeout:30000}).catch(()=>{});
  await page.waitForTimeout(250);
  const diag=await page.evaluate(()=>{
    const group=document.querySelector('.bb-home-theme .bb-home-actions');
    if(!group)return {missing:true};
    const gr=group.getBoundingClientRect();
    const describe=(el)=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      const before=getComputedStyle(el,'::before'),after=getComputedStyle(el,'::after');
      return {
        tag:el.tagName,id:el.id||'',className:String(el.className||'').slice(0,160),
        text:(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim().slice(0,80),
        x:+r.x.toFixed(2),right:+r.right.toFixed(2),width:+r.width.toFixed(2),
        relLeft:+(r.left-gr.left).toFixed(2),relRight:+(r.right-gr.left).toFixed(2),
        clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,
        display:s.display,position:s.position,widthStyle:s.width,minWidth:s.minWidth,maxWidth:s.maxWidth,
        overflowX:s.overflowX,whiteSpace:s.whiteSpace,transform:s.transform,contain:s.contain,
        before:{content:before.content,display:before.display,position:before.position,left:before.left,right:before.right,width:before.width,transform:before.transform},
        after:{content:after.content,display:after.display,position:after.position,left:after.left,right:after.right,width:after.width,transform:after.transform}
      };
    };
    const all=[group,...group.querySelectorAll('*')].map(describe);
    const overflowers=all.filter(x=>x.relLeft<-1||x.relRight>gr.width+1||x.scrollWidth>x.clientWidth+1)
      .sort((a,b)=>Math.max(b.relRight-gr.width,b.scrollWidth-b.clientWidth)-Math.max(a.relRight-gr.width,a.scrollWidth-a.clientWidth));
    return {
      group:{x:+gr.x.toFixed(2),right:+gr.right.toFixed(2),width:+gr.width.toFixed(2),clientWidth:group.clientWidth,scrollWidth:group.scrollWidth},
      overflowers:overflowers.slice(0,30),
      direct:[...group.children].map(describe)
    };
  });
  console.log('HOME_OVERFLOW_PROBE '+JSON.stringify(diag));
}finally{
  if(browser)await browser.close().catch(()=>{});
}
