// Balance check for the skill fights (KARCIANKA.md): a player model against the AI, no UI.
// node scripts/sim-cards.mjs [fights per pair] [level] [perks [ids]]   — 'perks': the win rate each perk adds on its own
// node scripts/sim-cards.mjs [fights per pair] [level] wzory [hand]   — fixed queues of the eight plain punches against each style
//   (CIOSY.md §1): no single-punch pattern should beat the AI's own mix by much
// node scripts/sim-cards.mjs [fights per pair] [level] wezly [hand] [punches] — what each punch-tree node adds to a pattern using that
//   punch, and whether the two nodes of a level stay within 5 p.p. of each other (CIOSY.md §6)
// The player model queues like the AI and reacts to every rival punch: a dodge or a parry with the hit rates of a hand.
import {mulberry,makeFighter,newDuel,aiPlan,startExchange,resolveBlow,nextBlow,aiReaction,getUp,queueSkill} from '../src/card-rules.js';
import {opponentLevels} from '../src/stats.js';
import {PERK_CARDS,CARDS,PUNCH_TREES,NODE_READY} from '../src/card-data.js';

const N=+(process.argv[2]||400), LVL=+(process.argv[3]||5), STYLES=['bal','out','press','counter'];
/** Hands: how often the player answers a punch, and how often his dodge / parry is in time. */
const HANDS={
  bierny:{react:0,dodge:0,parry:0,parryShare:0},
  nowy:{react:0.6,dodge:0.65,parry:0.25,parryShare:0.2},
  wprawny:{react:0.75,dodge:0.85,parry:0.55,parryShare:0.45},
  mistrz:{react:0.85,dodge:0.95,parry:0.8,parryShare:0.6},
};

/** The player model's reaction: more likely against heavy punches, parries the slow ones. */
function playerReaction(d,rng,hand){
  const b=nextBlow(d), c=CARDS[b.card];
  if(rng()>=hand.react+(c.heavy?0.1:0)) return {kind:'none',grade:'late'};
  const kind=rng()<hand.parryShare+(c.heavy?0.15:0)?'parry':'dodge', p=hand[kind];
  return {kind,grade:rng()<p?(rng()<0.35?'perfect':'good'):'late'};
}

/** One brawl: side 0 is the player model (or the AI's blocking when `hand` is 'ai'). */
function fight(styleA,styleB,seed,{hand='wprawny',perksA=[],pattern=null,nodes=[]}={}){
  const rng=mulberry(seed);
  const A=makeFighter({style:styleA,levels:opponentLevels(LVL,styleA),perks:perksA,nodes,...(pattern?{skills:PLAIN}:{})});
  const B=makeFighter({style:styleB,levels:opponentLevels(LVL,styleB)});
  const d=newDuel(A,B,rng), m={kd:0,inj:{},open:[0,0,0,0],hits:0,dodges:0,parries:0,blows:0,debt:0,przelot:0,end:''};
  for(let n=0;n<40&&d.phase!=='over';n++){
    aiPlan(d,1,rng); if(pattern) queuePattern(d,pattern); else aiPlan(d,0,rng);
    startExchange(d,rng);
    while(d.phase==='fight'||d.phase==='getup'){
      let ev;
      if(d.phase==='getup') ev=getUp(d,d.down===0||rng()<(d.f[d.down].inj.concussion?0.45:0.7),rng);
      else { const b=nextBlow(d); m.blows++; ev=resolveBlow(d,b.side===1&&hand!=='ai'?playerReaction(d,rng,HANDS[hand]):aiReaction(d,rng),rng); }
      for(const e of ev){
        if(e.t==='hit') m.hits++; else if(e.t==='dodge') m.dodges++; else if(e.t==='parry') m.parries++;
        else if(e.t==='open') m.open[e.level]++; else if(e.t==='knockdown') m.kd++; else if(e.t==='przelot') m.przelot++;
        else if(e.t==='debt') m.debt++;
        else if(e.t==='injury') m.inj[e.injury]=(m.inj[e.injury]||0)+1;
      }
      if(d.phase==='plan') break;
    }
  }
  m.turns=d.turn; m.end=d.end||'limit'; m.winner=d.winner; m.hpLeft=d.winner>=0?d.f[d.winner].hp/d.f[d.winner].hpMax:0;
  return m;
}

/** The eight plain punches (head and body) the patterns use. */
const PLAIN=['jab','cross','hook','upper','jab-k','splot','watroba','zoladek'];
/** Fixed queues: the player repeats the pattern while the stamina lasts (a skill too dear is skipped). */
const PATTERNS={
  'miks AI':null,'sam jab':['jab'],'sam cross':['cross'],'sam hook':['hook'],'uppercut+jab':['upper','jab'],
  'jab dół':['jab-k'],'wątroba':['watroba'],'jab–cross':['jab','cross'],'jab–hook':['jab','hook'],'jab–uppercut':['jab','upper'],
  'jab,jab,cross':['jab','jab','cross'],'splot, jaby':['splot','jab','jab','jab'],'wątroba, jaby':['watroba','jab','jab','jab'],
  'jab dół, jaby':['jab-k','jab','jab','jab'],'jab–cross–hook':['jab','cross','hook'],'jab–hook–uppercut':['jab','hook','upper'],
  'uppercut–hook':['upper','hook'],'żołądek–hook':['zoladek','hook'],'wątroba–jab–cross':['watroba','jab','cross'],'jab dół–cross–hook':['jab-k','cross','hook'],
};
/** Queue a pattern for side 0. @param {any} d @param {string[]} pat */
function queuePattern(d,pat){ for(let i=0,miss=0;miss<pat.length&&d.f[0].queue.length<8;i++) miss=queueSkill(d,0,pat[i%pat.length])===''?0:miss+1; }

/** Win rate of side 0 over N fights, plus averages. */
function series(a,b,opts={}){
  const s={w:0,l:0,dr:0,turns:0,kd:0,hits:0,dodges:0,parries:0,blows:0,debt:0,przelot:0,open:[0,0,0,0],inj:{},ends:{},hpLeft:0};
  for(let i=0;i<N;i++){
    const m=fight(a,b,1000+i*7919,opts);
    if(m.winner===0) s.w++; else if(m.winner===1) s.l++; else s.dr++;
    for(const k of ['turns','kd','hits','dodges','parries','blows','debt','przelot','hpLeft']) s[k]+=m[k];
    m.open.forEach((v,k)=>s.open[k]+=v); s.ends[m.end]=(s.ends[m.end]||0)+1;
    for(const [k,v] of Object.entries(m.inj)) s.inj[k]=(s.inj[k]||0)+v;
  }
  return s;
}
const pct=v=>(100*v).toFixed(0).padStart(3)+'%', f1=v=>v.toFixed(1), rate=s=>(s.w+0.5*s.dr)/N;

if(process.argv[4]==='wzory'){
  const hand=process.argv[5]||'nowy';
  console.log(`Wzory ciosów — gracz (${hand}) powtarza stałą kolejkę, ${N} bójek na styl, poziom ${LVL}\n`);
  console.log('wzór'.padEnd(20)+STYLES.map(s=>s.padStart(8)).join('')+'  średnio   tury');
  const rows=Object.entries(PATTERNS).map(([name,pattern])=>{
    const ss=STYLES.map(b=>series('bal',b,{hand,pattern})), avg=ss.reduce((a,s)=>a+rate(s),0)/STYLES.length;
    return [avg,name.padEnd(20)+ss.map(s=>pct(rate(s)).padStart(8)).join('')+pct(avg).padStart(9)+f1(ss.reduce((a,s)=>a+s.turns,0)/STYLES.length/N).padStart(7)];
  }).sort((x,y)=>y[0]-x[0]);
  for(const [,row] of rows) console.log(row);
  process.exit(0);
}
if(process.argv[4]==='wezly'){
  const hand=process.argv[5]||'nowy';
  /** A pattern that uses the punch and the punch its nodes talk to. */
  const USE={jab:['jab','cross','hook'],'jab-k':['jab-k','cross','hook'],hook:['jab','hook'],cross:['jab','cross'],upper:['hook','upper'],
    zoladek:['zoladek','upper','hook'],splot:['splot','jab','cross'],watroba:['watroba','hook','jab']};
  /** Nodes that need another punch around them get their own pattern (and their own baseline). */
  const NODE_USE={'jab:3b':['jab','jab','cross'],'hook:3a':['cross','hook'],'hook:3b':['watroba','hook'],'watroba:2a':['jab','watroba','hook'],
    'watroba:3b':['watroba','hook','jab'],'zoladek:2a':['zoladek','cross','jab'],'zoladek:2b':['zoladek','watroba'],'cross:1b':['jab','cross'],'splot:3a':['splot','cross'],
    'jab-k:5a':['jab-k','jab-k','jab-k','cross'],'jab-k:5b':['jab-k','jab-k','cross'],'cross:5a':['upper','jab','cross'],'zoladek:5b':['zoladek','hook'],'splot:4a':['jab','splot','cross']};
  const win=(/** @type {string[]} */ pattern,/** @type {string[]} */ nodes)=>STYLES.reduce((a,b)=>a+rate(series('bal',b,{hand,pattern,nodes})),0)/STYLES.length;
  const pp=(/** @type {number} */ v)=>((v>=0?'+':'')+(100*v).toFixed(0)).padStart(4)+' p.p.';
  console.log(`Węzły drzewek ciosów — gracz (${hand}) gra wzorem z danym ciosem, ${N} bójek na styl, poziom ${LVL}; tylko jeden węzeł naraz\n`);
  const odd=[];
  const only=process.argv[6]?process.argv[6].split(','):null;   // e.g. hook,upper,watroba
  for(const [id,T] of Object.entries(PUNCH_TREES).filter(([id])=>!only||only.includes(id))){
    const base=win(USE[id],[]);
    console.log(CARDS[id].name.padEnd(24)+'bez węzłów '+pct(base)+'  ('+USE[id].join(', ')+')');
    T.forEach((pair,l)=>{
      const keys=[id+':'+(l+1)+'a',id+':'+(l+1)+'b']; if(!keys.every(k=>NODE_READY.has(k))) return;
      const [a,b]=keys.map(k=>{ const P=NODE_USE[k]||USE[id]; return win(P,[k])-(P===USE[id]?base:win(P,[])); }), gap=Math.abs(a-b);
      if(gap>0.05) odd.push(CARDS[id].name+' '+['I','II','III','IV','V'][l]);
      console.log('  '+['I','II','III','IV','V'][l].padEnd(4)+pair[0].name.padEnd(22)+pp(a)+'   '+pair[1].name.padEnd(22)+pp(b)+(gap>0.05?'   ← różnica '+(100*gap).toFixed(0)+' p.p.':''));
    });
  }
  console.log('\nPoziomy z różnicą ponad 5 p.p.: '+(odd.join(', ')||'brak'));
  process.exit(0);
}
if(process.argv[4]==='perks'){
  const base=rate(series('bal','bal'));
  console.log(`Perki w walce na skille — gracz (wprawny, bal) z perkiem kontra bal, ${N} bójek, poziom ${LVL}; bez perku ${pct(base)}\n`);
  const only=process.argv[5]?process.argv[5].split(','):Object.keys(PERK_CARDS);
  const rows=only.map(id=>[id,rate(series('bal','bal',{perksA:[id]}))-base]).sort((x,y)=>y[1]-x[1]);
  for(const [id,dv] of rows) console.log(id.padEnd(18)+(dv>=0?'+':'')+(100*dv).toFixed(0).padStart(3)+' p.p.');
  process.exit(0);
}
console.log(`Walki na skille — ${N} bójek na parę, poziom ${LVL}\n`);
console.log('AI kontra AI (obaj tylko blokują), wygrane stylu w wierszu:');
console.log('         '+STYLES.map(s=>s.padStart(8)).join(''));
const all=[];
for(const a of STYLES){
  let row=a.padEnd(9);
  for(const b of STYLES){ const x=series(a,b,{hand:'ai'}), y=series(b,a,{hand:'ai'}); all.push(x,y); row+=pct((x.w+y.l+0.5*(x.dr+y.dr))/(2*N)).padStart(8); }
  console.log(row);
}
const sum=all.reduce((t,s)=>{ for(const k of ['turns','kd','hits','blows','przelot','hpLeft']) t[k]+=s[k];
  for(const [k,v] of Object.entries(s.ends)) t.ends[k]=(t.ends[k]||0)+v; for(const [k,v] of Object.entries(s.inj)) t.inj[k]=(t.inj[k]||0)+v; return t; },
  {turns:0,kd:0,hits:0,blows:0,przelot:0,hpLeft:0,ends:{},inj:{}});
const F=all.length*N;
console.log(`\nŚrednio na bójkę AI: ${f1(sum.turns/F)} tury · ${f1(sum.blows/F)} ciosów · ${f1(sum.kd/F)} nokdaunu · zwycięzcy zostaje ${pct(sum.hpLeft/F)} zdrowia`);
console.log('Koniec: '+Object.entries(sum.ends).map(([k,v])=>`${k} ${pct(v/F)}`).join(' · '));
console.log('Kontuzje na 100 bójek: '+Object.entries(sum.inj).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${(100*v/F).toFixed(0)}`).join(' · '));

console.log('\nGracz (bal) z reakcjami — wygrane z każdym stylem, tury, uniki/parowania i dług kondycji na bójkę:');
for(const hand of Object.keys(HANDS)){
  let row=`  ${hand.padEnd(8)}`; const t={turns:0,dodges:0,parries:0,debt:0,kd:0};
  for(const b of STYLES){ const s=series('bal',b,{hand}); row+=` ${b} ${pct(rate(s))}`; for(const k of Object.keys(t)) t[k]+=s[k]; }
  const k=STYLES.length*N;
  console.log(row+`  · ${f1(t.turns/k)} tury · unik ${f1(t.dodges/k)} · parowanie ${f1(t.parries/k)} · dług ${f1(t.debt/k)} · nokdaun ${f1(t.kd/k)}`);
}
