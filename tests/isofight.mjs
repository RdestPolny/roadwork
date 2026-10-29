import assert from 'node:assert/strict';

/** The isometric fight in the Ward: real keys, costs and damage from the rules, footwork, the opponent, the count on the boards, the result. */
export async function checkIsoFight(page){
  const r=await page.evaluate(async()=>{
    const b=window.__boxer, I=await import('/src/iso-fight.js'), R=await import('/src/realtime-rules.js'), P=await import('/src/progression.js'), In=await import('/src/input.js'), S=I.state, out={};
    const rng=Math.random;
    const key=(code,down=true)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true,cancelable:true}));
    const near=gap=>{ S.P.i=S.O.i-0.7071*gap; S.P.j=S.O.j+0.7071*gap; S.P.li=S.P.i; S.P.lj=S.P.j; for(const s of [1,-1]){ S.P.ft[s].i=S.P.i; S.P.ft[s].j=S.P.j; } };
    const fresh=(opp=0)=>{ Math.random=()=>.99; b.goRoom('cell'); b.pause(); b.startSpar(opp,'cell'); b.step(60); S.O.aiAt=Infinity; };
    try{
      b.goRoom('cell'); b.pause();
      const NPC=await import('/src/npcs.js'), SP=await import('/src/sparring.js'), savedMin=P.state.save.sim.min;
      out.cellResidents=NPC.state.CN.slice(3).map((c,k)=>[c.name,SP.state.CELL_OPP[k+3]===SP.state.YARD_OPP[k],c.bed.lv]);
      out.harryRoutine=[];
      for(const min of [720,1380]) for(const random of [0.1,0.9]){
        P.state.save.sim.min=min; Math.random=()=>random; NPC.cnEnter();
        const h=NPC.state.CN[0]; out.harryRoutine.push([h.step.k,h.act,h.after?.t||null]);
      }
      P.state.save.sim.min=savedMin; Math.random=()=>.99; NPC.cnEnter();
      out.cellFights=[];
      for(const idx of [3,4]){ b.startSpar(idx,'cell'); out.cellFights.push([S.opp.name,(await import('/src/gym.js')).state.fightSpectators.some(c=>c.name.toUpperCase()===S.opp.name)]); }
      b.startSpar(0,'cell');
      const GymSpectators=await import('/src/gym.js'); out.spectators=GymSpectators.state.fightSpectators.map(C=>[C.name,C.act,!!C.after]);
      out.start=[b.gstate,S.phase,document.body.classList.contains('spar'),S.opp.name,document.getElementById('fightPlate')?.hidden===false];
      out.stamina=[S.P.rt.staCapInitial,S.O.rt.staCapInitial];
      b.step(60); out.fight=[S.phase,document.getElementById('fightPlate')?.hidden!==false]; S.O.aiAt=Infinity;
      // a jab pays its quoted cost and lands with the damage animation's timing
      near(1.1); const hp0=S.O.rt.hp, quote=R.punchCost(S.P.rt,0,S.t), s0=S.P.rt.sta; key('Digit1'); out.jabCost=s0-S.P.rt.sta-quote; b.step(30);
      out.jab=[S.O.rt.hp<hp0,S.P.c.thrown,S.P.c.landed];
      const faceAfterHead=S.O.faceDamage;
      fresh(); near(1.1); key('ShiftLeft'); key('Digit1'); b.step(30); key('ShiftLeft',false);
      out.faceDamage=[faceAfterHead>0,S.O.c.landed,S.P.c.landed,S.O.faceDamage];
      out.tiredPunches=[];
      for(const sta of [0,2]){
        fresh(); near(1.1); S.P.rt.sta=sta; key('Digit1');
        const launched=[S.P.rt.sta,S.P.pk?.exhausted]; b.step(6); const early=S.P.c.landed;
        b.step(7); out.tiredPunches.push([launched,early,S.P.c.landed]);
      }
      // Hooks and uppercuts alternate against the last punch actually thrown.
      out.hands=[];
      for(const sequence of [['Digit1','Digit3','Digit4','Digit3'],['Digit2','Digit3'],['Digit3','Digit4']]){
        fresh(); const hands=[];
        for(const code of sequence){ key(code); hands.push(S.P.pk.hand); b.step(35); }
        out.hands.push(hands);
      }
      fresh(); key('Digit1'); b.step(10); key('Digit3'); b.step(10); out.bufferedHand=S.P.pk?.hand;
      out.evadeHooks=[];
      for(const code of ['ArrowUp','ArrowDown']){
        fresh(); near(1.0); key(code); b.step(1); key(code,false); b.step(2); key(code); key(code,false);
        const kind=S.P.evKind, dir=S.P.slipDir; b.step(10); key('Digit3'); b.step(15);
        out.evadeHooks.push([kind,dir,S.P.pk?.hand]);
      }
      fresh(); key('KeyQ'); const slipDir=S.P.slipDir; b.step(25); key('Digit3'); out.slipHook=[slipDir,S.P.pk?.hand];
      fresh(); key('KeyQ'); b.step(25); key('Digit1'); b.step(25); key('Digit3'); out.punchAfterSlip=S.P.pk?.hand;
      fresh(); near(1.1); key('Digit1'); b.step(30);
      // the repeat is dearer
      b.step(60); near(1.1); const q2=R.punchCost(S.P.rt,0,S.t), s1=S.P.rt.sta; key('Digit1'); out.repeat=[Math.abs(s1-S.P.rt.sta-q2)<.001,q2>quote];
      // the body target latches with Shift and survives its release
      fresh(); near(1.1); key('ShiftLeft'); key('Digit2'); key('ShiftLeft',false); b.step(40); out.body=S.P.c.body;
      // holding the block drains breath; a pause lets it go
      fresh(); const g0=S.P.rt.sta; key('Space'); b.step(60); out.guard=[S.P.rt.guarding,g0-S.P.rt.sta>4];
      In.setPaused(false); In.setPaused(true); out.pauseRelease=[S.P.rt.guarding,S.guardHeld]; key('Space',false);
      // A quick tap clinches nearby; sideways movement turns the pair and another tap pushes.
      fresh(); near(1.0); key('Space'); b.step(1); key('Space',false);
      const ci=S.P.i, cj=S.P.j, oi=S.O.i, oj=S.O.j, gap0=Math.hypot(oi-ci,oj-cj);
      key('ArrowUp'); b.step(20); key('ArrowUp',false);
      const gap1=Math.hypot(S.O.i-S.P.i,S.O.j-S.P.j);
      out.clinch=[S.clinch,Math.hypot(S.O.i-oi,S.O.j-oj)>0.05,Math.abs(gap1-gap0)<0.01];
      key('ArrowRight'); key('Space'); key('Space',false); key('ArrowRight',false); b.step(20);
      out.clinchPush=[S.clinch,Math.hypot(S.O.i-S.P.i,S.O.j-S.P.j)>gap1+0.1];
      // A push into the crowd gives the rival priority, even with another spectator near the player.
      fresh(); near(1.0); key('Space'); b.step(1); key('Space',false);
      const people=GymSpectators.state.fightSpectators.filter(c=>c.step?.k==='spectator');
      for(const c of people) c.i+=20;
      const [ui,uj]=[(S.O.i-S.P.i)/Math.hypot(S.O.i-S.P.i,S.O.j-S.P.j),(S.O.j-S.P.j)/Math.hypot(S.O.i-S.P.i,S.O.j-S.P.j)];
      Object.assign(people[0],{i:S.O.i+ui*0.9,j:S.O.j+uj*0.9});
      Object.assign(people[1],{i:S.P.i-ui*0.4,j:S.P.j-uj*0.4});
      key('Space'); key('Space',false); b.step(15);
      out.pushCrowd=[!!S.O.grab,!!S.P.grab,people.filter(c=>c.grabbing).length];
      // Two nearby spectators cannot hold both fighters at the same time.
      fresh(); const pair=GymSpectators.state.fightSpectators.filter(c=>c.step?.k==='spectator');
      for(const c of pair) c.i+=20;
      Object.assign(pair[0],{i:S.P.i+0.3,j:S.P.j}); Object.assign(pair[1],{i:S.O.i+0.3,j:S.O.j});
      b.step(1); out.oneGrab=[!!S.O.grab,!!S.P.grab,pair.filter(c=>c.grabbing).length];
      // Either fighter can be restrained by a standing spectator, hit, and released after two seconds.
      out.crowd=[];
      for(const side of ['P','O']){
        fresh(); const F=S[side], A=side==='P'?S.O:S.P, C=GymSpectators.state.fightSpectators[0];
        for(const other of GymSpectators.state.fightSpectators) if(other!==C&&other.step?.k==='spectator') other.i+=20;
        F.i=C.i+0.3; F.j=C.j; A.i=F.i+0.9; A.j=F.j; F.rt.guarding=true;
        b.step(1); const caught=!!F.grab&&!F.rt.guarding&&C.act==='grab';
        const spot=[F.i,F.j], hp=F.rt.hp; A.i=F.i+0.9; A.j=F.j; A.grabExempt=C;
        if(side==='P'){ key('ArrowRight'); key('Digit1'); key('KeyQ'); key('Space'); }
        if(side==='P'){ R.beginPunch(A.rt,0,S.t); A.pk={pid:0,low:false,t:0,hit:false}; }
        else key('Digit1');
        b.step(30); const helpless=!!F.grab&&F.i===spot[0]&&F.j===spot[1]&&!F.rt.guarding&&!F.pk&&F.rt.hp<hp;
        if(side==='P'){ key('ArrowRight',false); key('Space',false); }
        b.step(100); const released=!F.grab&&C.act==='cheer'; b.step(5);
        out.crowd.push([caught,helpless,released,!F.grab]);
      }
      // a slip costs its price
      fresh(); const q0=S.P.rt.sta; key('KeyQ'); out.slip=[Math.abs(q0-S.P.rt.sta-R.TUNING.slipCost)<.001,S.P.rt.slipSince===S.t];
      // a double tap evades: one tap only walks, a slow second tap is only a walk, a quick one dashes away from the rival (back) at the price of breath
      fresh(); near(1.0); const e0=S.P.rt.sta, p0=[S.P.i,S.P.j];
      key('KeyA'); b.step(1); key('KeyA',false); out.tap1=S.P.rt.evadeFatigue;
      b.step(20); key('KeyA'); b.step(1); key('KeyA',false); out.tapLate=S.P.rt.evadeFatigue;
      b.step(4); key('KeyA'); b.step(1); key('KeyA',false);
      out.dash=[S.P.rt.evadeFatigue,S.P.evKind,S.P.rt.sta<e0];
      const d1=Math.hypot(S.P.i-p0[0],S.P.j-p0[1]); b.step(15); out.dashSmooth=[d1<0.15,Math.hypot(S.P.i-p0[0],S.P.j-p0[1])>d1+0.15];
      // Hit effects follow remaining health; straight punches send blood away from the attacker.
      out.spray=[];
      for(const hp of [0.9,0.58,0.2]){
        fresh(); near(1.0); S.O.rt.hp=S.O.rt.hpMax*hp; S.parts=[];
        key('Digit1'); b.step(8);
        const blood=S.parts.filter(p=>p.kind==='blood'), sweat=S.parts.filter(p=>p.kind!=='blood');
        const di=S.O.i-S.P.i, dj=S.O.j-S.P.j, len=Math.hypot(di,dj);
        out.spray.push([blood.length,sweat.length,blood.every(p=>p.vi*di+p.vj*dj>0 && Math.abs(p.vi*dj-p.vj*di)<(p.vi*di+p.vj*dj)*0.6)]);
      }
      // Mouse target drives movement and E dodges toward the same target.
      fresh(); const Ren=await import('/src/renderer.js'); Ren.render();
      const cv=Ren.state.screen, rect=cv.getBoundingClientRect(), k=cv.width/cv.clientWidth;
      const C=S.cam, W=Ren.state.hd.W, H=Ren.state.hd.H, z=C.z;
      const cx=Math.round(Math.max(W/(2*z),Math.min(W-W/(2*z),C.x)));
      const cy=Math.round(Math.max(H/(2*z),Math.min(H-H/(2*z),C.y)));
      const G=await import('/src/gym.js');
      const px=(W/2+(G.isoX(S.P.i,S.P.j)*2-cx)*z)/2, py=(H/2+(G.isoY(S.P.i,S.P.j,0)*2-cy)*z)/2;
      const targetX=px-20, targetY=py;
      In.state.paused=false;
      Ren.state.stage.dispatchEvent(new PointerEvent('pointermove',{clientX:rect.left+(Ren.state.vx+targetX*Ren.state.vs)/k,clientY:rect.top+(Ren.state.vy+targetY*Ren.state.vs)/k,bubbles:true}));
      In.state.paused=true;
      const mouseStart=[S.P.i,S.P.j]; b.step(8);
      out.mouseMove=[S.P.i<mouseStart[0],S.P.j>mouseStart[1]];
      key('KeyE'); key('KeyE',false); b.step(14); out.mouseEvade=[S.P.evKind,S.P.evDi<0,S.P.evDj>0];
      Ren.state.stage.dispatchEvent(new PointerEvent('pointerleave')); out.mouseLeave=S.pointer===null;
      fresh(); near(1.0); S.pointer={x:100,y:48};
      key('KeyE'); key('KeyE',false); b.step(2); key('KeyE'); key('KeyE',false);
      out.doubleE=[S.P.evKind,S.P.evFwd<-.999,S.P.rt.evadeFatigue,S.eTap===null];
      fresh(); S.pointer={x:100,y:48}; key('KeyE'); key('KeyE',false); I.isoFightRelease(); b.step(15);
      out.cancelE=[S.P.rt.evadeFatigue,S.eTap===null];
      fresh(); S.pointer={x:100,y:48}; key('KeyE'); key('KeyE'); b.step(14); out.heldE=S.P.rt.evadeFatigue; key('KeyE',false);
      // a perfect evade slows the time, opens the counter and the fatigue starts again
      out.instantCounters=[];
      for(const code of ['Digit1','Digit2','Digit3','Digit4']){
        fresh(); near(1.0); R.beginPunch(S.O.rt,0,S.t); S.O.pk={pid:0,low:false,t:0,hit:false}; key('KeyQ');
        for(let n=0;n<30&&!S.slowMo;n++) b.step(1);
        const active=S.t-S.P.slipSince<R.TUNING.slipActive; key(code);
        out.instantCounters.push([active,!!S.P.pk,S.P.rt.punchCounter,S.P.slipSince===-Infinity]);
      }
      fresh(); near(1.0); R.beginPunch(S.O.rt,0,S.t); S.O.pk={pid:0,low:false,t:0,hit:false}; key('KeyQ');
      for(let n=0;n<30&&!S.slowMo;n++) b.step(1);
      S.O.pk={pid:0,low:false,t:0,hit:false}; const playerHp=S.P.rt.hp; key('Digit4'); b.step(12);
      out.counterSpeed=[S.P.c.landed,S.P.rt.hp===playerHp,S.O.pk===null];
      fresh(); key('KeyQ'); key('Digit1'); out.normalEvadeBuffer=[S.P.pk===null,!!S.P.buf];
      fresh(); near(1.0); R.beginPunch(S.O.rt,0,S.t); S.O.pk={pid:0,low:false,t:0,hit:false}; key('KeyQ');
      let minScale=1; for(let n=0;n<110;n++){ b.step(1); minScale=Math.min(minScale,S.scale); }
      out.slowWindow=[S.slowMo>0,S.P.rt.counterUntil>S.t];
      key('Digit1'); out.slowCounter=S.P.rt.punchCounter;
      b.step(35);
      out.perfect=[S.P.c.perfects,minScale<0.5,S.P.rt.evadeFatigue,S.scale===1];
      // eight directions: every arrow moves him, and the foot on the side of the move steps first
      out.moves={}; out.first={};
      for(const [k,code] of [['r','ArrowRight'],['l','ArrowLeft'],['u','ArrowUp'],['d','ArrowDown']]){
        fresh();
        const x0=S.P.i, y0=S.P.j; key(code); let first='';
        for(let n=0;n<40;n++){ b.step(1); if(!first) first=S.P.ft[S.P.leadSide].sw>0?'lead':S.P.ft[-S.P.leadSide].sw>0?'rear':''; }
        key(code,false); out.moves[k]=Math.hypot(S.P.i-x0,S.P.j-y0)>0.3; out.first[k]=first;
      }
      // the opponent fights on his own
      Math.random=rng; b.goRoom('cell'); b.pause(); b.startSpar(0,'cell'); b.step(360); out.aiThrown=S.O.c.thrown;
      // the count: the rival rises on his own, the player with taps
      fresh(); near(1.0); let replayOutfit=0; const heroWrap=S.P.wrap; S.P.wrap=fn=>heroWrap(()=>{ if(S.kdSlow>0) replayOutfit++; fn(); }); S.O.rt.hp=1; key('Digit1'); b.step(30); out.kd=[S.O.down,S.O.kdN,S.O.rt.hp>1,!!S.O.rd]; out.kdSlow=[S.kdSlow>0,S.scale<1]; out.replayOutfit=replayOutfit>0; b.step(390); out.rose=!S.O.down&&!S.O.rd;
      fresh(); S.P.down=true; S.P.downAt=S.t; S.P.kdN=1; S.P.pk=null; for(let k=0;k<8;k++){ key('Digit1'); b.step(10); } out.mash=[S.P.down,S.P.kdMash>=7];
      // the knockdown comic: its words outlast it, taps on the boards count in real time, and the port's panels frame the fighters
      fresh(); near(1.0); S.O.rt.hp=1; key('Digit1'); b.step(250); out.kdBanner=[S.kdSlow,S.banner?.text];
       const comicWard=(await import('/src/knockdown-comic.js')).state.panels;
       out.wardComic3x=comicWard.length===3&&comicWard[0].w>240&&comicWard[2].w>400;
      fresh(); near(1.0); S.P.rt.hp=1; R.beginPunch(S.O.rt,2,S.t); S.O.pk={pid:2,low:false,t:0,hit:false}; for(let n=0;n<60&&S.kdSlow<=0;n++) b.step(1); b.step(6);   // past the blow's hit-stop
      for(let k=0;k<12;k++){ key('Digit1'); b.step(6); } out.comicMash=[S.kdSlow>0,S.P.down,S.P.kdMash];
      I.startIsoFight(0,'port'); b.step(60); S.O.aiAt=Infinity; near(1.0); S.O.rt.hp=1; key('Digit2'); b.step(170);
      out.portFraming=(await import('/src/knockdown-comic.js')).state.framing.map(f=>!!f&&Math.abs(f.dx)<0.25&&Math.abs(f.dy)<0.25);
      // a knockout closes the fight into the ordinary result card and the record
      fresh(); near(1.0); S.O.kdN=2; S.O.rt.hp=1; const before=P.state.save.record.bare.w; key('Digit1'); b.step(30); out.ko=[S.phase,S.how,S.winner===S.P]; b.step(260);
      out.result=[S.phase,document.getElementById('over').hidden,P.state.save.record.bare.w-before];
      key('Escape'); out.back=[b.gstate,b.room];
    } finally { Math.random=rng; In.setPaused(true); }
    return out;
  });
  assert.deepEqual(r.cellResidents,[['Jack',true,2],['Walter',true,3]]);
  assert.deepEqual(r.cellFights,[['JACK',false],['WALTER',false]]);
  assert.deepEqual(r.harryRoutine,[['sit','sit','bunk2'],['sit','sit','bunk2'],['sit','sit','bunk2'],['sit','sit','bunk2']]);
  assert.deepEqual(r.spectators,[['Zeke','cheer',false],['Reuben','cheer',false],['Jack','cheer',false],['Walter','cheer',false],['Śmierdziel','cheer',false],['Profesor','sit',true]]);
  assert.deepEqual(r.start,['isofight','intro',true,'HARRY',true],'the fight opens on the plate in the isometric scene');
  assert.ok(r.stamina.every(cap=>cap>=200),'both fighters have a larger stamina reserve');
  assert.deepEqual(r.fight,['fight',true],'the plate goes after the intro');
  assert.equal(r.jabCost,0,'a punch pays the cost the rules quote');
  assert.deepEqual(r.jab,[true,1,1],'a jab in range lands once at its apex');
  assert.deepEqual(r.faceDamage,[true,0,1,0],'head hits mark the face, while body hits do not');
  assert.deepEqual(r.tiredPunches,[[[0,true],0,1],[[0,true],0,1]],'a jab with insufficient or zero stamina launches at half speed');
  assert.deepEqual(r.hands,[[-1,1,-1,1],[1,-1],[1,-1]],'hooks and uppercuts use the hand opposite the previous punch');
  assert.equal(r.bufferedHand,1,'a buffered hook uses the opposite hand when it starts');
  assert.deepEqual(r.evadeHooks,[['left',-1,1],['right',1,-1]],'a hook after a sideways evade uses the opposite hand');
  assert.equal(r.slipHook[1],-r.slipHook[0],'a hook after a slip uses the opposite hand');
  assert.equal(r.punchAfterSlip,1,'an intervening punch restores the usual combo hand');
  assert.deepEqual(r.repeat,[true,true],'the second punch pays the dearer repeat cost');
  assert.equal(r.body,1,'Shift targets the body and the target survives its release');
  assert.deepEqual(r.guard,[true,true]); assert.deepEqual(r.pauseRelease,[false,false],'a pause releases the held block');
  assert.deepEqual(r.clinch,[true,true,true],'clinch turns the opponent while keeping the pair together');
  assert.deepEqual(r.clinchPush,[false,true],'Space releases and pushes the opponent');
  assert.deepEqual(r.pushCrowd,[true,false,1],'a pushed rival is caught while the player remains free');
  assert.deepEqual(r.oneGrab,[true,false,1],'only one fighter can be held at once');
  assert.deepEqual(r.crowd,[[true,true,true,true],[true,true,true,true]],'spectators restrain either fighter without an immediate repeat, leaving them open to punches');
  assert.deepEqual(r.slip,[true,true]);
  assert.equal(r.tap1,0,'one tap only walks'); assert.equal(r.tapLate,0,'a second tap after the window is only a walk');
  assert.deepEqual(r.dash,[1,'back',true],'a quick double tap away from the rival is a dash back and costs breath');
  assert.deepEqual(r.dashSmooth,[true,true],'the evade is a move over many frames, not a jump');
  assert.ok(r.spray[0][0]===0 && r.spray[0][1]>0 && r.spray[1][0]>0 && r.spray[1][1]===0 && r.spray[2][0]>r.spray[1][0] && r.spray[1][2] && r.spray[2][2], 'sweat gives way to increasing blood, directed backwards on a jab');
  assert.deepEqual(r.mouseMove,[true,true],'fighter follows the mouse');
  assert.deepEqual(r.mouseEvade,['back',true,true],'E evades toward the pointer');
  assert.equal(r.mouseLeave,true,'leaving the stage stops mouse movement');
  assert.deepEqual(r.doubleE,['back',true,1,true],'double E immediately evades directly away from the rival');
  assert.deepEqual(r.cancelE,[0,true],'releasing input cancels a pending E evade');
  assert.equal(r.heldE,1,'holding E does not count as a double tap');
  assert.deepEqual(r.slowWindow,[true,true],'slow motion and the counter window remain open after 110 frames');
  assert.deepEqual(r.instantCounters,Array(4).fill([true,true,true,true]),'every punch immediately cancels an active perfect evade and starts a counter');
  assert.deepEqual(r.counterSpeed,[1,true,true],'a counter uppercut lands before a rival jab started at the same time');
  assert.deepEqual(r.normalEvadeBuffer,[true,true],'a normal evade still buffers a punch');
  assert.equal(r.slowCounter,true,'a punch during slow motion is a counter');
  assert.deepEqual(r.perfect,[1,true,0,true],'a perfect evade counts, slows the time, opens the counter, resets the fatigue and the time returns');
  assert.deepEqual(r.moves,{r:true,l:true,u:true,d:true},'every arrow walks');
  assert.equal(r.first.r,'lead','forward: the lead foot first'); assert.equal(r.first.l,'rear','back: the rear foot first');
  assert.equal(r.first.u,'lead','one way sideways: the foot on that side'); assert.equal(r.first.d,'rear','the other way: the other foot');
  assert.ok(r.aiThrown>=2,'the rival fights without commands: '+r.aiThrown);
  assert.deepEqual(r.kd,[true,1,true,true],'the first knockdown sends the rival to the boards (as a ragdoll) with a fraction of his health'); assert.deepEqual(r.kdSlow,[true,true],'knockdown slows the fight'); assert.equal(r.replayOutfit,true,'the knockdown replay draws the hero with his room outfit palette'); assert.equal(r.rose,true,'he gets up after the count and the ragdoll is released');
  assert.deepEqual(r.mash,[false,true],'taps get the player up');
  assert.deepEqual(r.kdBanner,[0,'NOKDAUN!'],'the knockdown banner is still up when the comic ends');
   assert.equal(r.wardComic3x,true,'the Ward knockdown comic uses proportionally scaled 432x288 panels');
  assert.deepEqual(r.comicMash,[true,true,12],'every tap during the comic counts towards rising');
  assert.deepEqual(r.portFraming,[true,true,true],'every port panel frames the fighters near its middle');
  assert.deepEqual(r.ko,['ko','TKO',true],'the third knockdown stops the fight');
  assert.deepEqual(r.result,['end',false,1],'the result card is up and the win is in the record');
  assert.deepEqual(r.back,['hub','cell'],'Esc returns to the Ward');
}

/** The brawl in the yard, in the bath and at the meal happens in that room. */
export async function checkIsoFightRooms(page){
  const r=await page.evaluate(async()=>{
    const b=window.__boxer, I=await import('/src/iso-fight.js'), R=await import('/src/renderer.js'), S=I.state, out={};
    const rng=Math.random;
    try{
      for(const [venue,idx,room] of [['yard',0,'yard'],['laznia',1,'laznia'],['canteen',0,'cell']]){
        Math.random=rng; b.goRoom(room); b.pause(); b.startSpar(idx,venue); b.step(200);
        out[venue]=[b.gstate,S.venue,b.room,S.phase,Number.isFinite(S.P.i)&&Number.isFinite(S.O.i)];
        out[venue+'Frame']=[R.isometricFrame(venue).W,R.isometricFrame(venue).H];
        b.exitToHub(); out[venue+'Back']=[b.gstate,b.room];
      }
    } finally { Math.random=rng; }
    return out;
  });
  assert.deepEqual(r.yard,['isofight','yard','yard','fight',true]); assert.deepEqual(r.yardBack,['hub','yard']);
  assert.deepEqual(r.laznia,['isofight','laznia','laznia','fight',true]); assert.deepEqual(r.lazniaBack,['hub','laznia']);
  assert.deepEqual(r.canteen,['isofight','canteen','cell','fight',true]); assert.deepEqual(r.canteenBack,['hub','cell']);
  for(const venue of ['yard','laznia','canteen']) assert.deepEqual(r[venue+'Frame'],[432,288],venue+' combat framebuffer');
}
