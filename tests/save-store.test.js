import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveStore} from '../src/save-store.js';
import {xpNeed, migrateLegacyStat} from '../src/stats.js';

class MemoryStorage {
  values = new Map();
  failWrites = false;
  failReads = false;
  failBackup = false;
  getItem(key) {
    if (this.failReads) throw new Error('Storage unavailable');
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    if (this.failWrites || this.failBackup && key.endsWith('.backup')) throw new Error('Quota exceeded');
    this.values.set(key, value);
  }
}

function setup(raw) {
  const storage = new MemoryStorage();
  if (raw !== undefined) storage.setItem('heavybag.save', typeof raw === 'string' ? raw : JSON.stringify(raw));
  const config = {
    storage,
    gearById:{t_royal:{slot:'trunks'},g_crimson:{slot:'gloves'},b_white:{slot:'boots'},k_cheap:{slot:'bag'},k_gold:{slot:'bag'},g_gold:{slot:'gloves'}},
    looks:{skin:[{id:'s3'},{id:'s4'}],hair:[{id:'h1'}]},
    lookDefaults:{skin:'s3',hair:'h1'},
    decorById:{f_check:{kind:'floor'},w_blue:{kind:'wall'},f_wood:{kind:'floor'}},
    gymTypes:{bag:{w:1,h:1},speedbag:{w:1,h:1,wall:true},pushmat:{w:3,h:2,rot:true,variants:[{},{}]},ring:{w:5,h:5,max:1},fixed:{fixed:true}},
    simDefaults:{day:1,min:480,faza:0,akcje:0,zm:0,glod:0,h:80},
    xpNeed,
  };
  return {storage, config, store:createSaveStore(config)};
}

test('legacy saves normalize known fields and retain the state reference', () => {
  const {store} = setup({coins:700,owned:['g_gold','g_gold',null,'missing'],eq:{gloves:'g_gold'},look:{skin:'s4',hair:'bad'},stats:{str:{lvl:3,xp:20}},sim:{day:4,min:650,e:20},room:'yard',cellFrom:'gym',decorOwned:['f_wood'],decor:{floor:'f_wood'},gymV:3,bucketV:1});
  assert.equal(store.hadSave,true);
  assert.equal(store.state.version,10);
  assert.equal(store.state.coins,700);
  assert.equal(store.state.eq.gloves,'g_gold');
  assert.deepEqual(store.state.look,{skin:'s4',hair:'h1'});
  assert.deepEqual(store.state.stats.str,{lvl:3,xp:82,banked:0});   // 202 old XP on the 30-level curve
  assert.equal(store.state.decor.floor,'f_wood');
  assert.equal(store.state.room,'yard');
  assert.equal(store.state.cellFrom,'gym');
  assert.equal(store.state.gymV,3);
  assert.equal(store.state.bucketV,1);
  assert.equal(store.state.owned.filter(id=>id==='g_gold').length,1);
  const state = store.state;
  assert.equal(store.merge({coins:10}),true);
  assert.equal(store.state,state);
  assert.equal(state.coins,10);
  assert.equal(state.eq.gloves,'g_crimson');
});

test('equipment and decoration must belong to their slot and be owned', () => {
  const {store} = setup({owned:['g_gold'],eq:{bag:'g_gold',gloves:'k_cheap',boots:'g_gold'},decorOwned:['f_wood'],decor:{wall:'f_wood'}});
  assert.deepEqual(store.state.eq,{trunks:'t_royal',gloves:'g_crimson',boots:'b_white',bag:'k_cheap'});
  assert.equal(store.state.decor.wall,'w_blue');
  store.merge({eq:{gloves:'g_gold'}});
  assert.equal(store.state.eq.gloves,'g_crimson');
});

test('gym ignores malformed items, fixed objects, invalid footprints and wall positions', () => {
  const {store} = setup({gym:[null,1,{}, {t:'missing',i:1,j:1}, {t:'fixed',i:0,j:0},
    {t:'bag',i:12,j:1},{t:'bag',i:-1,j:1},{t:'bag',i:1.5,j:1},{t:'bag',i:Infinity,j:1},
    {t:'speedbag',i:1,j:1},{t:'speedbag',i:0,j:4},
    {t:'speedbag',i:0,j:2},{t:'bag',i:3,j:3,v:99},{t:'pushmat',i:10,j:7,r:1,v:1},
    {t:'pushmat',i:10,j:8,r:1},{t:'bag',i:1,j:1,r:1,v:1}]});
  assert.deepEqual(store.state.gym,[{t:'speedbag',i:0,j:2,r:0},{t:'bag',i:3,j:3,r:0,v:0},{t:'pushmat',i:10,j:7,r:1,v:1},{t:'bag',i:1,j:1,r:0,v:1}]);
});

test('explicit empty gym remains empty, including slots and roundtrip', () => {
  const {store} = setup({gym:[]});
  assert.deepEqual(store.state.gym,[]);
  assert.equal(store.write(),true);
  assert.deepEqual(store.read().gym,[]);
  assert.equal(store.writeSlot(1),true);
  assert.deepEqual(store.readSlot(1).data.gym,[]);
  store.merge({gym:null});
  assert.equal(store.state.gym,undefined);
});

test('numerics are finite, needs and clocks bounded, XP valid for its level', () => {
  const {store} = setup();
  store.merge({version:4,coins:-1,stats:{str:{lvl:30,xp:200,banked:-1},spd:{lvl:2.7,xp:1e9,banked:40},end:{lvl:Infinity,xp:NaN}},sim:{day:-4,min:1500,e:Infinity,f:-20,r:150,h:NaN}});
  assert.equal(store.state.coins,0);
  assert.deepEqual(store.state.stats,{str:{lvl:30,xp:0,banked:0},spd:{lvl:2,xp:0,banked:40},end:{lvl:1,xp:0,banked:0}});
  assert.deepEqual(store.state.sim,{day:1,min:19*60,faza:2,akcje:0,zm:1,glod:3,h:80},'an old late hour is the evening; energy and food become tiredness and hunger');
  store.merge({version:4,coins:NaN,stats:{str:{lvl:1,xp:-5}}});
  assert.equal(store.state.coins,250);
  assert.equal(store.state.stats.str.xp,0);
  assert.equal(store.merge(null),false);
  assert.equal(store.merge({look:null,eq:null,stats:null,sim:null,decor:null}),true);
});

test('storage errors are reported and never silently succeed', () => {
  const {store,storage,config} = setup();
  storage.failWrites = true;
  assert.equal(store.write(),false);
  assert.match(store.error,/Quota/);
  assert.equal(store.writeSlot(1),false);
  storage.failReads = true;
  const unavailable = createSaveStore(config);
  assert.equal(unavailable.writable,false);
  assert.equal(unavailable.write(),false);
  assert.match(unavailable.error,/unavailable/);
});

test('corrupt startup is preserved and cannot be overwritten before recovery', () => {
  const raw = '{bad json';
  const {store,storage} = setup(raw);
  assert.equal(store.hadSave,true);
  assert.equal(store.writable,false);
  assert.equal(storage.getItem('heavybag.save.corrupt'),raw);
  assert.equal(store.write(),false);
  assert.equal(store.writeSlot(1),false);
  assert.equal(storage.getItem('heavybag.save'),raw);
  store.merge({coins:900});
  assert.equal(store.writable,false);
  store.recover();
  assert.equal(store.write(),true);
  assert.equal(store.read().coins,900);
  assert.equal(storage.getItem('heavybag.save.corrupt'),raw);
});

test('roundtrip, backup, future version rejection and slots', () => {
  const {store,storage,config} = setup({coins:300});
  const previous = storage.getItem('heavybag.save');
  store.state.coins = 450;
  assert.equal(store.write(),true);
  assert.equal(storage.getItem('heavybag.save.backup'),previous);
  assert.deepEqual(createSaveStore(config).state,store.state);
  assert.equal(store.writeSlot(3),true);
  assert.deepEqual(store.readSlot(3).data,store.state);
  assert.ok(store.readSlot(3).ts > 0);
  assert.equal(store.writeSlot(0),false);
  assert.equal(store.readSlot(4),null);
  storage.setItem('heavybag.slot.1',JSON.stringify({ts:1,data:{version:11}}));
  assert.equal(store.readSlot(1),null);
  const futureSlot = storage.getItem('heavybag.slot.1');
  assert.equal(store.writeSlot(1),false);
  assert.equal(storage.getItem('heavybag.slot.1'),futureSlot);
  assert.match(store.error,/wersja/);
  assert.equal(store.merge({version:11,coins:999}),false);
  assert.equal(store.state.coins,450);
  const future = JSON.stringify({version:11,coins:9000});
  storage.setItem('heavybag.save',future);
  const blocked = createSaveStore(config);
  assert.equal(blocked.read(),null);
  assert.equal(blocked.writable,false);
  assert.equal(blocked.write(),false);
  assert.equal(storage.getItem('heavybag.save'),future);
});

test('backup quota failure still allows saving and late corruption stays protected', () => {
  const {store,storage} = setup({coins:300});
  storage.failBackup = true;
  store.state.coins = 500;
  assert.equal(store.write(),true);
  assert.equal(store.read().coins,500);
  storage.setItem('heavybag.save','oops');
  assert.equal(store.write(),false);
  assert.equal(store.writable,false);
  assert.equal(storage.getItem('heavybag.save'),'oops');
});

test('version 1 migrates skills without losing old levels, empty gym or the state reference', () => {
  const {store, config} = setup({version:1,stats:{str:{lvl:6,xp:25},spd:{lvl:3,xp:10}},gym:[]});
  const reference=store.state;
  assert.equal(store.state.version,10);
  const empty={bonus:0,respecs:0}, none=['','',''];
  assert.deepEqual(store.state.skills,{str:empty,spd:empty,end:empty});
  assert.deepEqual(store.state.traits,{str:none,spd:none,end:none});
  assert.deepEqual(store.state.stats.str,{...migrateLegacyStat(6,25),banked:0});
  assert.deepEqual(store.state.trials.str,{10:false,20:false});
  assert.equal(store.write(),true);
  assert.deepEqual(createSaveStore(config).state,reference);
  assert.equal(store.writeSlot(1),true);
  assert.equal(store.readSlot(1).data.version,10);
  assert.deepEqual(store.readSlot(1).data.gym,[]);
  assert.equal(store.merge({}),true);
  assert.equal(store.state,reference);
  assert.deepEqual(reference.skills.str,{bonus:0,respecs:0});
});

test('versions 2 and 3 return perk points while keeping levels and test points', () => {
  const {store} = setup({version:2,stats:{str:{lvl:3}},skills:{
    str:{bonus:0,unlocked:['butcher','finisher','body-hammer']},
    spd:{bonus:2,unlocked:['one-two-three','rolling','sting']},
    end:{bonus:3,unlocked:['adrenaline','breather','economist']}
  }});
  assert.equal(store.migratedFrom,2);
  assert.deepEqual(store.state.skills.str,{bonus:0,respecs:0});
  assert.equal(store.state.skills.spd.bonus,2);
  assert.equal(store.state.skills.end.bonus,3);
  assert.equal(store.state.stats.str.lvl,migrateLegacyStat(3,0).lvl);
  const v3 = setup({version:3,stats:{str:{lvl:10,xp:0}},skills:{str:{unlocked:['butcher']}}}).store;
  assert.deepEqual(v3.state.traits.str,['','','']);
  assert.equal(v3.state.stats.str.lvl,migrateLegacyStat(10,0).lvl);
  assert.equal(v3.state.trials.str['10'],v3.state.stats.str.lvl>10);
  for(const bonus of [-1,1.5,Infinity,NaN,'5',1000001]) {
    store.merge({version:4,skills:{str:{bonus,unlocked:[]}}});
    assert.equal(store.state.skills.str.bonus,0);
  }
});

test('version 4 keeps trials, training records and build changes; its perks return their points', () => {
  const {store,config}=setup({version:4,stats:{str:{lvl:12,xp:5}},
    skills:{str:{unlocked:['butcher','butcher','missing',null,'finisher','body-hammer','crusher','shove'],active:['butcher','finisher','body-hammer','missing'],path:'kowal',respecs:2},spd:{unlocked:['sting'],path:'Bad Path!'}},
    trials:{str:{10:true,20:'yes'}},
    train:{day:3,count:{rope:2,'bad id!':1,pushup:-1},best:{rope:{grade:'A',score:91},x:{grade:'Z'}},stage:{rope:3,pushup:9}}});
  assert.equal(store.migratedFrom,4);
  assert.equal(store.state.phase,'free','saves from before the prison act keep the free world');
  assert.deepEqual(store.state.skills.str,{bonus:0,respecs:2},'perks are gone, their points are free for the punches');
  assert.deepEqual(store.state.traits.str,['','',''],'Cechy are picked anew');
  assert.deepEqual(store.state.trials.str,{10:true,20:false});
  assert.deepEqual(store.state.train,{day:3,count:{rope:2},best:{rope:{grade:'A',score:91}},stage:{rope:3}});
  assert.equal(store.write(),true);
  assert.deepEqual(createSaveStore(config).state,store.state);
  assert.equal(store.writeSlot(3),true);
  assert.deepEqual(store.readSlot(3).data,store.state);
});

test('a new game starts in the prison cell; v5 keeps the phase and a sanitized prison block', () => {
  const {store,config} = setup();
  assert.equal(store.merge({}),true);
  assert.equal(store.state.phase,'prison');
  assert.equal(store.state.room,'cell');
  assert.equal(store.state.coins,0);
  assert.equal(store.state.prison.opinia,50);
  assert.deepEqual(store.state.bare,{unlocked:[],respecs:0});
  store.merge({version:5,phase:'prison',room:'gym',coins:12,bare:{unlocked:['piach','piach','Bad!'],respecs:-1},
    prison:{opinia:140,respekt:-3,raporty:[3,'x',4.5,7],fajki:12.7,zapasy:{kawa:2,'zły klucz':1,mydlo:-1},
      lista:{rozdzial:40,lekcje:{l1:true,l2:'yes'},wspomnienia:['w1',3]},ambulatorium:{zdarzenie:true,do:9},
      profesor:{uwaga:'cel',zadanie:{dzien:4,id:'pull-b',zaliczone:true}},norma:[90,110,999],przyjecie:99,flagi:{tray:true,bad:1}}});
  const P=store.state.prison;
  assert.equal(store.state.room,'cell','closed rooms fall back to the cell in prison');
  assert.equal(store.state.coins,12);
  assert.deepEqual(store.state.bare,{unlocked:['piach'],respecs:0});
  assert.deepEqual([P.opinia,P.respekt,P.raporty,P.fajki,P.zapasy],[100,0,[3,7],12,{kawa:2}]);
  assert.deepEqual(P.lista,{rozdzial:11,lekcje:{l1:true},wygrane:{},wspomnienia:['w1']});
  assert.deepEqual(P.ambulatorium,{zdarzenie:true,do:9,glodDo:0});
  assert.deepEqual(P.profesor.zadanie,{dzien:4,id:'pull-b',zaliczone:true});
  assert.deepEqual([P.norma,P.przyjecie,P.flagi],[[90,110],99,{tray:true}]);
  assert.equal(store.write(),true);
  assert.deepEqual(createSaveStore(config).state,store.state);
  store.merge({version:5,phase:'prison',room:'canteen'});
  assert.equal(store.state.room,'cell','an old save in the canteen (gone in Newgate) wakes up in the Ward');
  store.merge({version:5,phase:'free',room:'gym'});
  assert.deepEqual([store.state.phase,store.state.room],['free','gym']);
});

test('the fight record: older saves start empty, counts are clamped, the last fights are filtered and capped', () => {
  const {store: fresh} = setup({version:5, phase:'prison'});
  assert.deepEqual(fresh.state.record, {spar:{w:0,l:0,d:0,ko:0,koL:0}, bare:{w:0,l:0,d:0,ko:0,koL:0}, last:[]});
  const last = [{r:'w',o:'Marek',v:'cell',h:'KO',day:3},{r:'x',o:'bad'},{r:'l',o:'Ś'.repeat(60),v:'BAD VENUE',h:'PKTPKTPKTPKT',day:-4},...Array(12).fill({r:'d',o:'Witek',v:'yard',h:'CZAS',day:5})];
  const {store} = setup({version:5, phase:'prison', record:{spar:{w:3.7,l:-2,d:'x',ko:1e9}, bare:{w:2,l:1,d:0,ko:1,koL:1}, last}});
  assert.deepEqual(store.state.record.spar, {w:3,l:0,d:0,ko:1e6,koL:0});
  assert.deepEqual(store.state.record.bare, {w:2,l:1,d:0,ko:1,koL:1});
  assert.equal(store.state.record.last.length, 7, 'at most eight kept, the malformed one dropped');
  assert.deepEqual(store.state.record.last[0], {r:'w',o:'Marek',v:'cell',h:'KO',day:3});
  assert.deepEqual(store.state.record.last[1], {r:'l',o:'Ś'.repeat(40),v:'gym',h:'PKTPKTPK',day:1});
});

test('one hero: with a single allowed look every older custom look becomes the hero', () => {
  const {config} = setup();
  const hero = createSaveStore({...config, looks:{skin:[{id:'hero'}],hair:[{id:'hero'}]}, lookDefaults:{skin:'hero',hair:'hero'}, storage:new MemoryStorage()});
  hero.merge({version:5, phase:'free', look:{skin:'s4',hair:'h1'}});
  assert.deepEqual(hero.state.look, {skin:'hero',hair:'hero'});
});

test('version 6 keeps lasting injuries; a version 5 save keeps the prison act and starts unhurt', () => {
  const {store} = setup({version:5,phase:'prison',room:'cell',coins:7,prison:{opinia:70},injuries:[{id:'nose',day:3}]});
  assert.equal(store.state.version,10);
  assert.deepEqual([store.state.phase,store.state.room,store.state.coins,store.state.prison.opinia],['prison','cell',7,70]);
  assert.deepEqual(store.state.injuries,[],'v5 had no injuries to keep');
  store.merge({version:6,phase:'prison',injuries:[{id:'rib',day:4},{id:'rib',day:5},{id:'rib',day:6},{id:'rib',day:7},{id:'nose',day:-2},{id:'nose',day:9},
    {id:'eyeL',day:2.6},{id:'bad',day:1},'x',{id:'scar'}]});
  assert.deepEqual(store.state.injuries,[{id:'rib',day:4},{id:'rib',day:5},{id:'rib',day:6},{id:'nose',day:1},{id:'eyeL',day:2},{id:'scar',day:1}],
    'known ids, at most three ribs, one nose, whole days');
  assert.equal(store.write(),true);
  assert.deepEqual(setup(JSON.parse(JSON.stringify(store.state))).store.state.injuries,store.state.injuries);
  store.merge({});
  assert.deepEqual(store.state.injuries,[],'a new game starts unhurt');
});

test('rivals remember the player\'s habits; an early v6 save without them starts with none', () => {
  const {store} = setup({version:6,phase:'prison',injuries:[]});
  assert.deepEqual(store.state.habits,{});
  store.merge({version:6,phase:'prison',habits:{'yard:4':[{slip:3.26,bad:2,jab:-1,unik:1,'garda-nisko':2,garda:1,cross:3.26},{hook:200}],'BAD KEY':[{jab:1}],'cell:0':'x',...Object.fromEntries(Array.from({length:30},(_,i)=>['yard:'+(10+i),[]]))}});
  assert.deepEqual(store.state.habits['yard:4'],[{cross:3.3},{hook:99}],'known skills, sane counts; the retired defence cards of old saves drop out');
  assert.equal(store.state.habits['BAD KEY'],undefined);
  assert.ok(Object.keys(store.state.habits).length<=24);
});

test('version 7: moves; a v6 save keeps the uppercut free and fights with the start and the uppercut, and its list wins climb the ladder', () => {
  const {store} = setup({version:6,phase:'prison',skills:{end:{unlocked:['economist','iron-guard','second-wind','clinch']}},stats:{end:{lvl:12,xp:0}},
    prison:{lista:{rozdzial:3,wygrane:{'1':true,'2':true}}}});
  assert.equal(store.state.moves.upper.gift,true,'the uppercut of the old base deck is known');
  assert.deepEqual(store.state.loadout,['jab','cross','hook','jab-k','watroba','upper'],'the start and the uppercut fill the set');
  assert.equal(store.state.deck,undefined,'no deck in the new schema');
  assert.deepEqual(store.state.prison.pokonani,{jack:1,walter:1},'Profesor\'s list wins count on the ladder');
  store.merge({version:7,phase:'prison',moves:{upper:{path:'a',lvl:5},splot:{},nope:{}},deck:['upper','upper','upper','upper','splot','cyna','jab'],prison:{pokonani:{harry:2,'BAD':1}}});
  assert.deepEqual(Object.keys(store.state.moves).filter(id=>['upper','splot','nope'].includes(id)).sort(),['splot','upper']);
  assert.deepEqual(store.state.moves.upper,{picks:''},'the old upgrade paths could never be bought: they drop');
  assert.equal(store.state.moves.splot.gift,true,'the body cross moved to Wytrzymałość: a gift, not a debt');
  assert.deepEqual(store.state.loadout,['upper','splot','jab'],'the deck becomes the set: each skill once, nothing outside the pool');
  assert.deepEqual(store.state.prison.pokonani,{harry:2});
  store.merge({});
  assert.deepEqual([store.state.loadout,store.state.moves.upper],[['jab','cross','hook','jab-k','watroba'],undefined],'a new game: the starting set, no uppercut yet');
});

test('version 9 and 10: an old v8 deck of twelve cards with defence becomes a set of at most six attack skills and keeps everything else', () => {
  const v8 = {version:8,phase:'prison',room:'yard',coins:42,prison:{opinia:61,fajki:7},injuries:[{id:'nose',day:3}],habits:{'yard:1':[{jab:2,unik:1}]},
    skills:{str:{unlocked:['body-hammer'],active:['body-hammer']}},bare:{unlocked:['piach'],respecs:0},stats:{str:{lvl:6,xp:10},spd:{lvl:4,xp:0}},
    moves:{upper:{path:'',lvl:0},splot:{path:'',lvl:0}},
    deck:['jab','jab','jab','garda','garda','unik','unik','cross','cross','hook','upper','splot','watroba','piach'],
    sim:{day:12,faza:2,akcje:1,zm:3,glod:1,h:44},record:{bare:{w:3,l:1,d:0,ko:1,koL:0}}};
  const {store,storage,config} = setup(v8);
  assert.equal(store.migratedFrom,8);
  const L = store.state.loadout;
  assert.deepEqual(L,['jab','cross','hook','upper','splot','watroba'],'the order of the deck, each skill once, defence drops out, six at most');
  assert.equal(new Set(L).size,L.length);
  assert.equal(store.state.deck,undefined);
  assert.deepEqual([store.state.version,store.state.phase,store.state.room,store.state.coins,store.state.prison.opinia,store.state.prison.fajki],[10,'prison','yard',42,61,7]);
  assert.deepEqual(store.state.injuries,[{id:'nose',day:3}]);
  assert.deepEqual(store.state.habits,{'yard:1':[{jab:2}]},'retired defence drops out of the habits');
  assert.deepEqual(store.state.sim,{day:12,min:19*60,faza:2,akcje:1,zm:3,glod:1,h:44},'v8 keeps its day in phases');
  assert.deepEqual([store.state.skills.str,store.state.bare.unlocked],[{bonus:0,respecs:0},['piach']]);
  assert.deepEqual([store.state.stats.str.lvl,store.state.stats.str.xp],[6,10]);
  assert.deepEqual(store.state.record.bare,{w:3,l:1,d:0,ko:1,koL:0});
  assert.ok(store.state.moves.upper&&store.state.moves.splot&&!store.state.moves.unik);
  // v10 round trip: the set survives a write and a reload unchanged, a slot too
  store.state.loadout = ['piach','jab'];
  assert.equal(store.write(),true);
  const saved = JSON.parse(storage.getItem('heavybag.save'));
  assert.deepEqual([saved.version,saved.loadout,saved.deck],[10,['piach','jab'],undefined]);
  const again = createSaveStore(config);
  assert.equal(again.migratedFrom,null);
  assert.deepEqual(again.state,store.state);
  assert.equal(store.writeSlot(2),true);
  assert.deepEqual(store.readSlot(2).data.loadout,['piach','jab']);
  // a v9 set is sanitized against the pool: duplicates, unknown and unlearnt skills drop, an empty set gets the start
  store.merge({...saved,loadout:['jab','jab','burza','unik','dobicie','cross']});
  assert.deepEqual(store.state.loadout,['jab','cross']);
  store.merge({...saved,loadout:[]});
  assert.deepEqual(store.state.loadout,['jab','cross','hook','jab-k','watroba']);
  store.merge({...saved,loadout:['jab','cross','hook','jab-k','watroba','upper','splot','piach']});
  assert.equal(store.state.loadout.length,6,'at most six');
});

test('version 8: the day in phases; a v7 save lands in the phase of its hour, energy and food become tiredness and hunger', () => {
  const {store} = setup({version:7,phase:'prison',sim:{day:5,min:15*60,e:40,f:20,r:60,h:55}});
  assert.deepEqual(store.state.sim,{day:5,min:14*60,faza:1,akcje:0,zm:3,glod:2,h:55});
  store.merge({version:7,phase:'prison',sim:{day:5,min:7*60,e:100,f:90,h:90}});
  assert.deepEqual([store.state.sim.faza,store.state.sim.zm,store.state.sim.glod],[0,0,0],'morning, rested and fed');
  store.merge({version:8,phase:'prison',sim:{day:9,faza:2,akcje:1,zm:12,glod:-1,h:30,min:3}});
  assert.deepEqual(store.state.sim,{day:9,min:19*60,faza:2,akcje:1,zm:8,glod:0,h:30},'bounded; the hour follows the phase');
  store.merge({version:9,phase:'prison',sim:{day:10,faza:1,akcje:2,zm:2,glod:1,h:50}});
  assert.deepEqual(store.state.sim,{day:10,min:14*60,faza:1,akcje:2,zm:2,glod:1,h:50},'v9 keeps the phases too');
  store.merge({});
  assert.deepEqual(store.state.sim,{day:1,min:8*60,faza:0,akcje:0,zm:0,glod:0,h:80},'a new game: the first morning');
});

test('version 10: perks become Cechy and punch points; moves that changed attribute and the skills of old perks become gifts', () => {
  const v9 = {version:9,phase:'prison',stats:{str:{lvl:12,xp:0},spd:{lvl:6,xp:0},end:{lvl:4,xp:0}},trials:{str:{10:true}},
    skills:{str:{bonus:1,unlocked:['body-hammer','bomb'],active:['body-hammer'],path:'nokauter',respecs:2},spd:{unlocked:['storm','double-jab']}},
    moves:{upper:{path:'',lvl:0},splot:{path:'',lvl:0},nerki:{path:'',lvl:0}},loadout:['jab','dobicie','burza','splot','lokiec']};
  const {store,storage,config} = setup(v9);
  assert.equal(store.migratedFrom,9);
  const S = store.state;
  assert.deepEqual(S.skills.str,{bonus:1,respecs:2},'lesson points and build changes stay');
  assert.deepEqual(S.traits,{str:['','',''],spd:['','',''],end:['','','']});
  assert.deepEqual([S.moves.dobicie,S.moves.burza],[{picks:'',gift:true},{picks:'',gift:true}],'Bomba and Burza ciosów were perks: their skills are moves now');
  assert.deepEqual([S.moves.splot.gift,S.moves.nerki.gift,S.moves.upper.gift],[true,true,undefined],'only moves that changed attribute become gifts');
  assert.deepEqual(S.loadout,['jab','dobicie','burza','splot'],'Łokieć needs Brudna robota (Spacerniak) now');
  // traits are kept from v10 on, only in slots the level has opened
  store.merge({...JSON.parse(JSON.stringify(S)),traits:{str:['b','a','b'],spd:['a','x'],end:'a'}});
  assert.deepEqual(store.state.traits,{str:['b','a',''],spd:['a','',''],end:['','','']});
  assert.equal(store.write(),true);
  assert.deepEqual(JSON.parse(storage.getItem('heavybag.save')).traits.str,['b','a','']);
  assert.deepEqual(createSaveStore(config).state,store.state);
  store.merge({...JSON.parse(JSON.stringify(store.state)),moves:{jab:{picks:'abx'},cross:{picks:'ab'},raz:{picks:'a'},'raz-dwa':{picks:'a'}}});
  assert.deepEqual([store.state.moves.jab,store.state.moves.cross,store.state.moves['raz-dwa']],[{picks:''},{picks:'ab'},{picks:''}],'picks: only a, b, only punches with a tree');
});


test('old confinement saves return to the Ward without losing progress or changing schema', () => {
  for (const phase of ['prison','free']) {
    const {store} = setup({version:10, phase, room:'izolatka', gym:[],
      prison:{izolatkaDo:99999, flagi:{'do-izolatki':true,'zakaz-spaceru':true}, respekt:35, raporty:[2,3,4], przyjecie:99},
      stats:{str:{lvl:5,xp:20}}, sim:{day:4,faza:1,akcje:1,zm:2,glod:3,h:60}});
    assert.equal(store.state.room,'cell');
    assert.equal(store.state.version,10);
    assert.equal(store.state.prison.izolatkaDo,0);
    assert.equal(store.state.prison.flagi['do-izolatki'],undefined);
    assert.equal(store.state.prison.flagi['zakaz-spaceru'],true);
    assert.equal(store.state.prison.respekt,35);
    assert.deepEqual(store.state.prison.raporty,[2,3,4]);
    assert.equal(store.state.prison.przyjecie,99);
    assert.equal(store.state.stats.str.lvl,5);
    assert.equal(store.state.sim.day,4);
    assert.equal(store.state.sim.akcje,1);
    assert.deepEqual(store.state.gym,[]);
  }
});
