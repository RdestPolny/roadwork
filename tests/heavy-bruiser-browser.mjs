import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

/** Native 432x288 captures, not browser-window screenshots enlarged by CSS. */
async function saveBullFrame(page,name){
  const png=await page.evaluate(async()=>{
    const R=await import('/src/renderer.js');
    R.render();
    if(R.state.hd3.W!==432||R.state.hd3.H!==288) throw new Error('Expected 432x288 HD frame');
    return R.state.hd3.off.toDataURL('image/png');
  });
  await mkdir('artifacts/the-bull',{recursive:true});
  await writeFile('artifacts/the-bull/'+name+'.png',Buffer.from(png.split(',')[1],'base64'));
}

/** Verify the new cell NPC and that actual misses (not block contact) trigger a counter window. */
export async function checkBull(page){
  const result=await page.evaluate(async()=>{
    const b=window.__boxer, I=await import('/src/iso-fight.js'), N=await import('/src/npcs.js'),
      S=await import('/src/sparring.js'), G=await import('/src/gym.js'), R=await import('/src/renderer.js');
    b.goRoom('cell');b.pause();b.step(3);
    const npc=N.state.CN.find(c=>c.name==='Briggs');
    const seated={act:npc?.act,bed:npc?.bed?.t,seat:npc?.after?.t,body:npc?.hd?.bodyType};
    b.step(240); const stillLying=npc?.act==='bullLie'&&npc?.after?.t==='bunk';
    b.startSpar(5,'cell');b.step(65);
    const O=I.state.O, P=I.state.P, B=O.bull;
    // Spectators should not interfere with this isolated mechanical test.
    for(const c of G.state.fightSpectators||[]) if(c.step?.k==='spectator') c.i+=20;
    const start={name:I.state.opp.name,heavy:!!B,body:O.look.bodyType,scale:G.state.ISO_K,
      dimensions:[R.state.hd3.W,R.state.hd3.H],hp:O.rt.hpMax,
      other:S.state.CELL_OPP[4].name};
    // Each synthetic attack enters the real contact/whiff calculation at its contact frame.
    P.i=O.i-2;P.j=O.j+2;P.li=P.i;P.lj=P.j;
    for(let n=0;n<3;n++){
      O.pk={pid:2,low:false,t:0.22,hit:false,hand:1};
      B.mode='ATTACK';
      b.step(9);   // the contact frame, plus the short active window in which a fist out of reach keeps looking for contact
    }
    const misses={pending:B.pending,load:B.missLoad,thrown:O.c.thrown,near:P.rt.hp===P.rt.hpMax};
    O.pk=null;b.step(2);
    const exhausted={mode:B.mode,guard:O.rt.guarding,attack:!!O.pk};
    // A real player cross, fired through the game's input pipeline, damages the vulnerable rival.
    P.i=O.i-0.7071*1.0;P.j=O.j+0.7071*1.0;P.li=P.i;P.lj=P.j;
    const hpBefore=O.rt.hp;
    dispatchEvent(new KeyboardEvent('keydown',{code:'Digit2',bubbles:true,cancelable:true}));
    b.step(20);
    const counter={hpBefore,hpAfter:O.rt.hp,mode:B.mode,guard:O.rt.guarding};
    // Allow the recovery without another attack from the player.
    P.i=O.i-2;P.j=O.j+2;P.li=P.i;P.lj=P.j;
    b.step(210);
    return {seated,stillLying,start,misses,exhausted,counter,recovered:B.mode!=='EXHAUSTED'};
  });
  assert.deepEqual(result.seated,{act:'bullLie',bed:'bunk',seat:'bunk',body:'heavy'});
  assert.equal(result.stillLying,true);
  assert.equal(result.start.name,'BRIGGS');
  assert.equal(result.start.other,'WALTER','legacy Walter is not replaced');
  assert.equal(result.start.heavy,true);
  assert.equal(result.start.body,'heavy');
  assert.equal(result.start.scale,1);
  assert.deepEqual(result.start.dimensions,[432,288]);
  assert.equal(result.start.hp,140);
  assert.equal(result.misses.pending,true);
  assert.equal(result.misses.near,true);
  assert.equal(result.exhausted.mode,'EXHAUSTED');
  assert.equal(result.exhausted.guard,false);
  assert.equal(result.exhausted.attack,false);
  assert.ok(result.counter.hpAfter<result.counter.hpBefore,'a cross must damage the exposed rival');
  assert.equal(result.counter.mode,'EXHAUSTED');
  assert.equal(result.counter.guard,false);
  assert.equal(result.recovered,true);
}

/** The bull's own attacks in the real fight loop: a run of hooks that opens with the long warning, a charge that pins the man
 *  to the wall for five seconds while he hooks, and a charge into a wall that stuns the bull. */
export async function checkBullAttacks(page){
  const r=await page.evaluate(async()=>{
    const b=window.__boxer, I=await import('/src/iso-fight.js'), G=await import('/src/gym.js'), H=await import('/src/heavy-bruiser.js');
    const fresh=()=>{ b.goRoom('cell');b.pause();b.step(3);b.startSpar(5,'cell');b.step(65);
      for(const c of G.state.fightSpectators||[]) if(c.step?.k==='spectator') c.i+=20;   // no crowd to grab him mid-test
      I.state.O.bull.chargeAt=Infinity; return I.state; };
    // 1. A run of hooks: only hooks, 2..4 of them, the first after the long warning, and no parry on any of them.
    let S=fresh(), B=S.O.bull, pids=new Set(), warn=null, hooks=0, seen=false, last=null;
    for(let k=0;k<900&&hooks<2;k++){ b.step(1);
      if(B.mode==='WINDUP'&&!seen){ seen=true; warn=B.until-B.at; }
      if(S.O.pk&&S.O.pk!==last){ last=S.O.pk; hooks++; pids.add(S.O.pk.pid); } }
    const run={hooks,pids:[...pids],warn};
    // 2. A charge at a man standing still: carried, slammed, pinned for the full five seconds, and the bull hooks him meanwhile.
    S=fresh(); B=S.O.bull; { const di=S.O.i-S.P.i, dj=S.O.j-S.P.j, d=Math.hypot(di,dj); S.O.i=S.P.i+di/d*3.2; S.O.j=S.P.j+dj/d*3.2; }   // back him off along the line, the man stays put
    H.beginCharge(B,S.t); B.chargeAt=S.t+99;
    let slam=null, hpAtSlam=0, hooked=0, lastPk=null;
    for(let k=0;k<900;k++){ b.step(1);
      if(!slam&&B.mode==='SLAMMED'){ slam={t:S.t,pinned:S.P.stagger}; hpAtSlam=S.P.rt.hp; }
      if(slam&&S.O.pk&&S.O.pk!==lastPk){ lastPk=S.O.pk; hooked++; }
      if(slam&&S.t-slam.t>=H.BULL.pinned) break; }
    const pin={slam,hooked,hpLoss:hpAtSlam-S.P.rt.hp,stillPinned:S.P.stagger>0||S.P.pinUntil>S.t};
    // 3. A charge into a wall with nobody on the line leaves the bull stunned.
    S=fresh(); B=S.O.bull; S.P.i=S.O.i+3; S.P.j=S.O.j-3; S.P.li=S.P.i; S.P.lj=S.P.j;   // the man is behind him, the wall ahead
    const ch={x:S.O.i,y:S.O.j}; H.launchCharge(B,S.t,-0.7071,0.7071);
    let crash=false; for(let k=0;k<600&&!crash;k++){ b.step(1); if(B.mode==='EXHAUSTED') crash=true; if(B.mode==='RECOVERY') break; }
    return {run,pin,crash:{stunned:crash,mode:B.mode,moved:Math.hypot(S.O.i-ch.x,S.O.j-ch.y)}};
  });
  assert.ok(r.run.hooks>=2,'a run has at least two hooks');
  assert.deepEqual(r.run.pids,[2],'he throws hooks only');
  assert.ok(r.run.warn>=0.9,'the opening hook has the long warning');
  assert.ok(r.pin.slam,'a charge at a standing man catches him');
  assert.ok(r.pin.slam.pinned>=4.9,'the pinned man is stunned for five seconds');
  assert.ok(r.pin.hooked>=2,'the bull hooks the pinned man');
  assert.ok(r.pin.hpLoss>0,'the hooks land on the pinned man');
  assert.equal(r.crash.stunned,true,'a charge into the wall stuns the bull');
}

/** Nine deterministic diagnostic poses; generated files must still be inspected by a human. */
export async function captureBull(page){
  await page.evaluate(async()=>{
    const b=window.__boxer;
    b.goRoom('cell');b.pause();b.step(10);
  });
  await saveBullFrame(page,'01-briggs-on-bunk');
  await page.evaluate(()=>{
    window.__boxer.startSpar(5,'cell');window.__boxer.step(62);
  });
  const pose=async kind=>page.evaluate(async kind=>{
    const I=await import('/src/iso-fight.js'),F=I.state.O, B=F.bull;
    F.pk=null;F.hurtT=0;F.stagger=0;F.moving=false;F.mf=0;F.ms=0;F.gUp=0;F.lagF=0;F.lagS=0;F.hLagF=0;F.hLagS=0;
    F.rt.guarding=false;B.mode='APPROACH';I.state.parts=[];
    for(const s of [-1,1]){F.ft[s].sw=0;F.ft[s].from=null;}
    if(kind==='guard'){ F.gUp=1;F.rt.guarding=true; }
    else if(kind==='step'){
      const f=F.ft[1];f.sw=.45;f.from={i:f.i,j:f.j};f.to={i:f.i+0.26,j:f.j-0.1};
      F.moving=true;F.mf=1;F.lagF=.45;
    }
    else if(kind==='windup'){ B.mode='WINDUP';B.pid=2;B.until=I.state.t+1; }
    else if(kind==='hook'){ B.mode='ATTACK';F.pk={pid:2,t:0.24,hit:false,low:false,hand:1}; }
    else if(kind==='whiff'){ B.mode='RECOVERY';F.pk={pid:2,t:0.45,hit:true,low:false,hand:1};F.lagF=.5; }
    else if(kind==='exhausted'||kind==='counter'){
      B.mode='EXHAUSTED';B.until=I.state.t+3;
      for(let k=0;k<8;k++) I.state.parts.push({kind:'sweat',i:F.i+F.fi*.19-F.fj*(k-3.5)*.012,j:F.j+F.fj*.19+F.fi*(k-3.5)*.012,z:14.5-k*.18,
        vi:0,vj:0,vz:0,size:1,age:0,maxAge:999,creep:0,host:null,df:0,ds:0,pi:F.i,pj:F.j,pz:14.5-k*.18});
      if(kind==='counter'){ F.hurtT=.26;F.hurtDir=1;F.hurtPower=1; }
    }
  },kind);
  await pose('idle');await saveBullFrame(page,'02-standing');
  await pose('guard');await saveBullFrame(page,'03-guard');
  await pose('step');await saveBullFrame(page,'04-heavy-step');
  await pose('windup');await saveBullFrame(page,'05-hook-windup');
  await pose('hook');await saveBullFrame(page,'06-hook-impact');
  await pose('whiff');await saveBullFrame(page,'07-whiff-recovery');
  await pose('exhausted');await saveBullFrame(page,'08-exhausted-sweat');
  await pose('counter');await saveBullFrame(page,'09-cross-during-exhaustion');
}
