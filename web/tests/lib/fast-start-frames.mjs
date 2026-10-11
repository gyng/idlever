// Keep observation in the browser across the travel-to-fight transition.
// Each state is read from the DOM on an actual animation frame; no game edits.
export async function installFastStartCapture(page) {
  await page.addInitScript(() => {
    const began=performance.now(),capture={firstMap:null,travel:null,fight:null,trace:[]};
    window.__fastStartCapture=capture;
    let seenAt=0,travelAt=0,last="";
    const poll=()=>{
      const r=window.__riddle,w=document.querySelector('.watch');
      if(r?.screen==='watch'&&w?.dataset.mode==='fast'&&w.dataset.frame){
        const state={screen:r.screen,mode:w.dataset.mode,frame:w.dataset.frame,speed:Number(w.dataset.speed),tick:Number(w.dataset.tick),ending:w.dataset.ending==='1'};
        seenAt||=performance.now();
        const key=`${state.frame}:${state.speed}`;
        if(key!==last&&capture.trace.length<40){last=key;capture.trace.push(state);}
        // Keep the first paint as diagnostics; the existing gate allows8s
        // for the nominal32x rate, including its deliberate startup easing.
        if(!capture.firstMap&&state.frame==='map'&&state.speed>0)capture.firstMap=state;
        if(!capture.travel&&state.frame==='map'&&state.speed>=32){capture.travel=state;travelAt=performance.now();}
        if(capture.travel&&state.frame==='fight'&&state.speed===4)capture.fight=state;
      }
      if(capture.travel&&capture.fight)return;
      if(seenAt&&!capture.travel&&performance.now()-seenAt>8000){capture.error='timeout waiting for32x travel';return;}
      if(travelAt&&!capture.fight&&performance.now()-travelAt>30000){capture.error='timeout waiting for a fight in fast';return;}
      if(performance.now()-began>60000||(seenAt&&r?.screen!=='watch')){capture.ended=true;return;}
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });
}

export async function fastStartFrames(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    if(window.__fastStartCapture){
      const began=performance.now();
      const captured=()=>{
        const c=window.__fastStartCapture;
        if(c.travel&&c.fight){resolve({travel:c.travel,fight:c.fight,firstMap:c.firstMap,trace:c.trace});return;}
        if(c.error||c.ended||performance.now()-began>30000){reject(Error(`Fast startup frames missing: ${JSON.stringify(c)}`));return;}
        requestAnimationFrame(captured);
      };
      captured();return;
    }
    const began=performance.now();let travel=null,fightAt=0;
    const sample=()=>{
      const r=window.__riddle,w=document.querySelector('.watch');
      return {screen:r?.screen,mode:w?.dataset.mode,frame:w?.dataset.frame,
        speed:Number(w?.dataset.speed),tick:Number(w?.dataset.tick),
        ending:w?.dataset.ending==='1'};
    };
    const poll=()=>{
      const now=performance.now(),s=sample();
      if(!travel){
        if(now-began>8000){reject(Error('timeout waiting for32× travel'));return;}
        if(s.screen!=='watch'||s.speed>=32){travel=s;fightAt=now;}
      }
      if(travel){
        if(now-fightAt>30000){reject(Error('timeout waiting for a fight in fast'));return;}
        if(s.screen!=='watch'||(s.frame==='fight'&&s.speed===4)){
          resolve({travel,fight:s,travelMs:Math.round(fightAt-began),fightMs:Math.round(now-fightAt)});return;
        }
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }));
}
