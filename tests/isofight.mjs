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
      b.goRoom('cell'); b.pause(); Math.random=()=>.99; b.startSpar(0,'cell');
      out.start=[b.gstate,S.phase,document.body.classList.contains('spar'),S.opp.name,document.getElementById('fightPlate')?.hidden===false];
      b.step(60); out.fight=[S.phase,document.getElementById('fightPlate')?.hidden!==false]; S.O.aiAt=Infinity;
      // a jab pays its quoted cost and lands with the damage animation's timing
      near(1.1); const hp0=S.O.rt.hp, quote=R.punchCost(S.P.rt,0,S.t), s0=S.P.rt.sta; key('Digit1'); out.jabCost=s0-S.P.rt.sta-quote; b.step(30);
      out.jab=[S.O.rt.hp<hp0,S.P.c.thrown,S.P.c.landed];
      // the repeat is dearer
      b.step(60); near(1.1); const q2=R.punchCost(S.P.rt,0,S.t), s1=S.P.rt.sta; key('Digit1'); out.repeat=[Math.abs(s1-S.P.rt.sta-q2)<.001,q2>quote];
      // the body target latches with Shift and survives its release
      fresh(); near(1.1); key('ShiftLeft'); key('Digit2'); key('ShiftLeft',false); b.step(40); out.body=S.P.c.body;
      // holding the block drains breath; a pause lets it go
      fresh(); const g0=S.P.rt.sta; key('Space'); b.step(60); out.guard=[S.P.rt.guarding,g0-S.P.rt.sta>4];
      In.setPaused(false); In.setPaused(true); out.pauseRelease=[S.P.rt.guarding,S.guardHeld]; key('Space',false);
      // a slip costs its price
      fresh(); const q0=S.P.rt.sta; key('KeyQ'); out.slip=[Math.abs(q0-S.P.rt.sta-R.TUNING.slipCost)<.001,S.P.rt.slipSince===S.t];
      // eight directions: every arrow moves him, and the foot on the side of the move steps first
      out.moves={}; out.first={};
      for(const [k,code] of [['r','ArrowRight'],['l','ArrowLeft'],['u','ArrowUp'],['d','ArrowDown']]){
        fresh();
        const x0=S.P.i, y0=S.P.j; key(code); let first='';
        for(let n=0;n<40;n++){ b.step(1); if(!first) first=S.P.ft[1].sw>0?'lead':S.P.ft[-1].sw>0?'rear':''; }
        key(code,false); out.moves[k]=Math.hypot(S.P.i-x0,S.P.j-y0)>0.3; out.first[k]=first;
      }
      // the opponent fights on his own
      Math.random=rng; b.goRoom('cell'); b.pause(); b.startSpar(0,'cell'); b.step(360); out.aiThrown=S.O.c.thrown;
      // the count: the rival rises on his own, the player with taps
      fresh(); near(1.0); S.O.rt.hp=1; key('Digit1'); b.step(30); out.kd=[S.O.down,S.O.kdN,S.O.rt.hp>1]; b.step(200); out.rose=!S.O.down;
      fresh(); S.P.down=true; S.P.downAt=S.t; S.P.kdN=1; S.P.pk=null; for(let k=0;k<8;k++){ key('Digit1'); b.step(10); } out.mash=[S.P.down,S.P.kdMash>=7];
      // a knockout closes the fight into the ordinary result card and the record
      fresh(); near(1.0); S.O.kdN=2; S.O.rt.hp=1; const before=P.state.save.record.bare.w; key('Digit1'); b.step(30); out.ko=[S.phase,S.how,S.winner===S.P]; b.step(110);
      out.result=[S.phase,document.getElementById('over').hidden,P.state.save.record.bare.w-before];
      key('Escape'); out.back=[b.gstate,b.room];
    } finally { Math.random=rng; In.setPaused(true); }
    return out;
  });
  assert.deepEqual(r.start,['isofight','intro',true,'HARRY',true],'the fight opens on the plate in the isometric scene');
  assert.deepEqual(r.fight,['fight',true],'the plate goes after the intro');
  assert.equal(r.jabCost,0,'a punch pays the cost the rules quote');
  assert.deepEqual(r.jab,[true,1,1],'a jab in range lands once at its apex');
  assert.deepEqual(r.repeat,[true,true],'the second punch pays the dearer repeat cost');
  assert.equal(r.body,1,'Shift targets the body and the target survives its release');
  assert.deepEqual(r.guard,[true,true]); assert.deepEqual(r.pauseRelease,[false,false],'a pause releases the held block');
  assert.deepEqual(r.slip,[true,true]);
  assert.deepEqual(r.moves,{r:true,l:true,u:true,d:true},'every arrow walks');
  assert.equal(r.first.r,'lead','forward: the lead foot first'); assert.equal(r.first.l,'rear','back: the rear foot first');
  assert.equal(r.first.u,'rear','one way sideways: the foot on that side'); assert.equal(r.first.d,'lead','the other way: the other foot');
  assert.ok(r.aiThrown>=2,'the rival fights without commands: '+r.aiThrown);
  assert.deepEqual(r.kd,[true,1,true],'the first knockdown sends the rival to the boards with a fraction of his health'); assert.equal(r.rose,true,'he gets up after the count');
  assert.deepEqual(r.mash,[false,true],'taps get the player up');
  assert.deepEqual(r.ko,['ko','TKO',true],'the third knockdown stops the fight');
  assert.deepEqual(r.result,['end',false,1],'the result card is up and the win is in the record');
  assert.deepEqual(r.back,['hub','cell'],'Esc returns to the Ward');
}

/** The brawl in the yard, in the bath and at the meal happens in that room. */
export async function checkIsoFightRooms(page){
  const r=await page.evaluate(async()=>{
    const b=window.__boxer, I=await import('/src/iso-fight.js'), S=I.state, out={};
    const rng=Math.random;
    try{
      for(const [venue,idx,room] of [['yard',0,'yard'],['laznia',1,'laznia'],['canteen',0,'cell']]){
        Math.random=rng; b.goRoom(room); b.pause(); b.startSpar(idx,venue); b.step(200);
        out[venue]=[b.gstate,S.venue,b.room,S.phase,Number.isFinite(S.P.i)&&Number.isFinite(S.O.i)];
        b.exitToHub(); out[venue+'Back']=[b.gstate,b.room];
      }
    } finally { Math.random=rng; }
    return out;
  });
  assert.deepEqual(r.yard,['isofight','yard','yard','fight',true]); assert.deepEqual(r.yardBack,['hub','yard']);
  assert.deepEqual(r.laznia,['isofight','laznia','laznia','fight',true]); assert.deepEqual(r.lazniaBack,['hub','laznia']);
  assert.deepEqual(r.canteen,['isofight','canteen','cell','fight',true]); assert.deepEqual(r.canteenBack,['hub','cell']);
}
