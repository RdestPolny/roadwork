import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

/** Browser smoke + focused 60 Hz combat regression, on the real game scene. */
export async function checkCombatDash(page){
  const r=await page.evaluate(async()=>{
    const b=window.__boxer, I=await import('/src/iso-fight.js'), In=await import('/src/input.js');
    const {DASH}=await import('/src/combat-dash.js'), S=I.state;
    const key=(code,down=true)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true,cancelable:true}));
    const mouse=held=>{ In.state.paused=false; if(held) document.getElementById('stage').dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true,cancelable:true})); else dispatchEvent(new PointerEvent('pointerup',{button:0,bubbles:true})); In.state.paused=true; };
    const fresh=(foeI=10,foeJ=10)=>{
      I.startIsoFight(0,'sandy'); b.step(60); S.O.aiAt=Infinity;
      S.P.i=5.55; S.P.j=5.15; S.P.li=5.55; S.P.lj=5.15;
      S.O.i=foeI; S.O.j=foeJ;
      S.P.lastMove=[1,0]; S.pointer=null;
    };
    const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    const compass=[];
    for(const [i,j] of dirs){
      fresh(); S.P.lastMove=[i,j]; const start=[S.P.i,S.P.j]; key('KeyF'); key('KeyF',false); b.step(18);
      compass.push([S.P.i-start[0],S.P.j-start[1],S.P.dash===null]);
    }
    // Reconstruct the cursor from the zoomed 432×288 image rather than using an unzoomed world vector.
    fresh();
    const R=await import('/src/renderer.js'), G=await import('/src/gym.js');
    const frame=R.isometricFrame('sandy'), scale=frame.W/144, z=2.45;
    const sx=G.isoX(S.P.i,S.P.j)*scale, sy=G.isoY(S.P.i,S.P.j,0)*scale;
    S.cam.init=false; S.cam.z=z; S.cam.x=sx; S.cam.y=sy;
    const cx=Math.round(Math.max(frame.W/(2*z),Math.min(frame.W-frame.W/(2*z),sx)));
    const cy=Math.round(Math.max(frame.H/(2*z),Math.min(frame.H-frame.H/(2*z),sy)));
    S.pointer={x:(frame.W/2+(sx-cx)*z)/scale+12,y:(frame.H/2+(sy-cy)*z)/scale};
    key('KeyF'); key('KeyF',false);
    const zoomAim=[S.P.dash?.di,S.P.dash?.dj];
    fresh(); const sta=S.P.rt.sta, start=[S.P.i,S.P.j];
    key('KeyF'); key('KeyF',false); const spent=sta-S.P.rt.sta;
    key('KeyF'); key('KeyF',false); const spamSpent=sta-S.P.rt.sta;
    b.step(18); const first=[S.P.i,S.P.j];
    S.P.lastMove=[-1,0]; key('KeyF'); key('KeyF',false); b.step(18);
    const chained=[S.P.i,S.P.j], secondSpent=sta-S.P.rt.sta;
    fresh(6.9,5.15); S.P.lastMove=[-1,0];key('KeyF');key('KeyF',false);b.step(17);
    S.P.lastMove=[1,0];key('KeyF');key('KeyF',false);b.step(4);key('Digit2');
    const retreatCrossBuffered=!!S.P.buf&&S.P.buf.pid===1;
    b.step(10);
    const retreatCrossStarted=!!S.P.pk&&S.P.pk.pid===1&&S.P.c.thrown===1;
    fresh(); S.P.i=8.85;S.P.j=5.15;S.P.li=S.P.i;S.P.lj=S.P.j;S.O.i=5.55;S.O.j=5.15;
    key('KeyF'); key('KeyF',false); b.step(19);
    const collision=Math.hypot(S.P.i-5.55,S.P.j-5.15);
    const attacks=[];
    for(const [pid,code] of ['Digit1','Digit2','Digit3','Digit4'].entries()){
      fresh(7.25,5.15); key('KeyF'); key('KeyF',false); b.step(4);
      key(code); const buffered=!!S.P.buf&&!S.P.pk;
      b.step(7); const started=!!S.P.pk&&S.P.pk.pid===pid&&!!S.P.dash;
      b.step(35); attacks.push({buffered,started,thrown:S.P.c.thrown,landed:S.P.c.landed});
    }
    fresh(7.25,5.15); mouse(true);key('KeyF');key('KeyF',false);b.step(4);key('Digit1');
    const lowBuffered=S.P.buf?.low;mouse(false);b.step(7); const lowCommitted=S.P.pk?.low; b.step(35);
    const lowHits=S.P.c.body;
    fresh(7.25,5.15);key('ShiftLeft');key('Digit1');key('ShiftLeft',false);
    const shiftStillHead=S.P.pk?.low===false;
    fresh();mouse(true);const downAim=S.low;In.setPaused(true);const pauseCleared=!S.low;
    In.setPaused(false);mouse(true);dispatchEvent(new Event('blur'));const blurCleared=!S.low;
    In.setPaused(true);
    fresh(); const roomNames=[];
    for(const venue of ['cell','yard','laznia','port','sandy']){
      I.startIsoFight(0,venue); b.step(60); S.O.aiAt=Infinity;
      const firstPos=[S.P.i,S.P.j];S.P.lastMove=[1,0];key('KeyF');key('KeyF',false);b.step(5);
      roomNames.push([venue,Number.isFinite(S.P.i),Number.isFinite(S.P.j),S.P.rt.sta>0]);
    }
    return {dirs,compass,zoomAim,spent,spamSpent,first,chained,start,secondSpent,retreatCrossBuffered,retreatCrossStarted,collision,attacks,lowBuffered,lowCommitted,lowHits,shiftStillHead,downAim,pauseCleared,blurCleared,roomNames,dashCost:DASH.cost};
  });
  for(let i=0;i<8;i++){const [dx,dy,ended]=r.compass[i], [x,y]=r.dirs[i];
    assert.ok(dx*x+dy*y>0.25,'dash should travel in compass direction '+i);
    assert.equal(ended,true,'dash finishes with planted stance');
  }
  assert.ok(r.zoomAim[0]>.5&&r.zoomAim[1]<-.5,'a rightward cursor at 2.45× zoom maps to room space');
  assert.equal(r.spent,r.dashCost,'dash uses stamina once');
  assert.equal(r.spamSpent,r.spent,'repeated F cannot restart dash');
  assert.ok(r.first[0]>r.start[0]+.5&&r.chained[0]<r.first[0]-.5,'second F can dash back');
  assert.equal(r.secondSpent,r.dashCost*2,'back and in consume stamina separately');
  assert.ok(r.retreatCrossBuffered&&r.retreatCrossStarted,'retreat -> re-entry dash -> buffered cross is a continuous combo');
  assert.ok(r.collision<=3.61,'sandy pit boundary blocks F dash');
  for(const [i,a] of r.attacks.entries()){
    assert.equal(a.buffered,true,'punch '+i+' buffered during push-off');
    assert.equal(a.started,true,'punch '+i+' blends into travel, not idle');
    assert.equal(a.thrown,1,'one punch action');
  }
  assert.deepEqual([r.lowBuffered,r.lowCommitted,r.lowHits,r.shiftStillHead],[true,true,1,true],'LMB is latched through buffered punch; Shift is not');
  assert.deepEqual([r.downAim,r.pauseCleared,r.blurCleared],[true,true,true],'pointer state clears on modal/focus loss');
  assert.equal(r.roomNames.length,5);
  for(const [name,finiteI,finiteJ,sta] of r.roomNames) assert.ok(finiteI&&finiteJ&&sta,'F dash works in '+name);
}

/** Capture native combat poses at repeatable 60 Hz checkpoints for manual pixel-art review. */
export async function captureCombatDashFrames(page){
  const dir='artifacts/combat-footwork';
  await mkdir(dir,{recursive:true});
  const setup=async()=>{
    await page.evaluate(async()=>{const I=await import('/src/iso-fight.js');const b=window.__boxer;b.pause();I.startIsoFight(0,'sandy');b.step(60);I.state.O.aiAt=Infinity;I.state.P.i=5.55;I.state.P.j=5.15;I.state.P.li=5.55;I.state.P.lj=5.15;I.state.O.i=7.25;I.state.O.j=5.15;I.state.P.lastMove=[1,0];});
  };
  const step=async n=>page.evaluate(async n=>{window.__boxer.step(n);(await import('/src/renderer.js')).render();},n);
  const shot=async label=>{
    const png=await page.evaluate(async()=>{const R=await import('/src/renderer.js');R.render();return R.state.hd3.off.toDataURL('image/png').split(',')[1];});
    await writeFile(`${dir}/${label}.png`,Buffer.from(png,'base64')); // exact native 432×288, not the upscaled screen
  };
  await setup();await page.evaluate(()=>dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',bubbles:true})));await step(7);await shot('01-forward');
  await page.evaluate(()=>{dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowRight',bubbles:true}));dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowLeft',bubbles:true}));});await step(9);await shot('02-back');
  await page.evaluate(()=>{dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowLeft',bubbles:true}));dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',bubbles:true}));});await step(10);await shot('03-lateral');
  await setup();await page.evaluate(()=>dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF',bubbles:true})));await shot('04-push-off');
  await step(7);await shot('05-travel');await step(8);await shot('06-landing');
  await setup();await page.evaluate(()=>dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF',bubbles:true})));await step(5);await page.evaluate(()=>dispatchEvent(new KeyboardEvent('keydown',{code:'Digit2',bubbles:true})));await step(6);await shot('07-dash-cross');
  await setup();await page.evaluate(async()=>{const In=await import('/src/input.js');In.state.paused=false;document.getElementById('stage').dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true,cancelable:true}));In.state.paused=true;dispatchEvent(new KeyboardEvent('keydown',{code:'Digit1',bubbles:true}));});await step(5);await shot('08-body-jab');
}
