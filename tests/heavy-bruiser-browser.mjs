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
      b.step(5);
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
    return {seated,start,misses,exhausted,counter,recovered:B.mode!=='EXHAUSTED'};
  });
  assert.deepEqual(result.seated,{act:'bullSit',bed:'bunk',seat:'bunk',body:'heavy'});
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
