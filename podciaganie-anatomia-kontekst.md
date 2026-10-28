# Roadwork — kontekst: anatomia sylwetki w podciąganiu

Plik główny: `src/pullup-scene.js` (funkcje `solvePose`, `backHalf`, `backBumps`, `rasterBody`, `shadeBody`). Ciało to mapa wysokości rasteryzowana z kapsuł i elips (`cap`, `ell`, `muscle`), potem cieniowana lampą z lewej i obrysem od okna z przodu. Reszta plików to kontekst (`pullups.js` — reguły i dane, `appearance.js` — paleta, `noise.js`). Z `tests/browser.mjs` istotne są scenariusze `pull-up`.

Pliki: AGENTS.md, src/pullup-scene.js, src/pullups.js, src/appearance.js, src/noise.js, tests/browser.mjs

---

## `AGENTS.md`

````md
# Praca nad Roadwork

Przeczytaj `README.md`, `ARCHITECTURE.md` i rzeczywisty przepływ zmienianej mechaniki, zanim edytujesz kod. Projekt używa natywnego ESM, własnego renderera i jawnej kolejności `initialize()` w `src/main.js`. Cykliczne importy pozostają; zachowaj działający start aplikacji.

## Zakres zmian

- Rób małe, konkretne zmiany. Reużywaj istniejące funkcje i możliwości przeglądarki; nie dodawaj abstrakcji, zależności ani narzędzi na przyszłość.
- Podczas refaktoru zachowuj grafikę, animacje, sterowanie, tempo, balans i treść gry. Zmiana zachowania wymaga osobnego uzasadnienia lub polecenia użytkownika.
- Nie przenoś gry do nowego silnika ani bundlera bez konkretnej potrzeby. Nie inicjalizuj Git ani Vite w ramach zwykłej poprawki.
- Nie edytuj `reference/boxer_heavybag-2.html`. To oryginał do porównania.
- Nowy kod zmienia cudzy stan przez publiczną operację jego właściciela, a nie przez bezpośrednie przypisanie do importowanego `…State`. Dodaj małą operację u właściciela, jeśli jej brakuje.
- Duże moduły dziel przy rzeczywistej zmianie, nie wyłącznie dla zmniejszenia liczby linii.

## Kontrakty

- Nie zmieniaj kluczy `heavybag.save`, `heavybag.slot.1`–`heavybag.slot.3` ani schematu zapisu bez migracji i testu starego zapisu. Zachowaj ochronę uszkodzonego zapisu, przyszłych wersji i pustego `gym:[]`.
- Zachowaj stałą referencję `saveStore.state`. Resetuj zapis przez `merge({})`, a zapis do Storage obsługuj przez store.
- Zegar wejścia i symulacji ma wspólną podstawę. Pauza nie resetuje BPM, kolejki tempa ani nut.
- Dodając pole kontekstu zawodnika `F.S`, aktualizuj wspólną mapę `CONTEXT_FIELDS` w `fighter-context.js` i sprawdź zapis oraz odczyt.
- Cheaty i `window.__boxer` są dostępne wyłącznie po świadomym włączeniu `?debug=1`.

## Weryfikacja

- Gra ma docelowo sztywne okno. Pracuj w jednym stałym kadrze (obecny kadr testowy: 1280×800); nie projektuj responsywności ani nie sprawdzaj telefonów i różnych rozmiarów ekranu bez wyraźnego polecenia.
- Przy małych zmianach uruchamiaj tylko testy zmienionej mechaniki, np. `node --test tests/crank.test.js` lub `npm run test:browser -- --only=crank`. Pełny zestaw uruchamiaj przy zmianach wspólnych mechanizmów albo konkretnym ryzyku regresji, nie automatycznie po każdej poprawce. Zwracaj krótki wynik zamiast pełnych logów.

- Uruchom odpowiednie testy jednostkowe dla zmian logiki; `npm test` uruchamia cały zestaw. Dodaj najmniejszy test, który wykrywa naprawiany błąd.
- Uruchom `npm run check` po zmianach `src/save-store.js`, `src/time.js`, `src/fighter-context.js` lub konfiguracji typów. Obecnie tylko te trzy moduły są objęte ścisłym `checkJs`.
- Uruchom odpowiedni scenariusz `npm run test:browser -- --only=…` po zmianach inicjalizacji, wejścia, czasu, menu, zapisu, przejść między trybami albo renderowania. Dla zmian wizualnych obejrzyj też zrzuty i grę.
- Nowe helpery opisuj JSDoc. Rozszerzaj `checkJs` moduł po module przy pracy nad nimi; nie deklaruj całego `src/` jako sprawdzonego bez naprawy błędów.
- Raportuj wykonane sprawdzenia i rzeczywiste ograniczenia. Nie przypisuj wyników testom, których nie uruchomiono.

## Subagents

- Używaj subagentów tylko wtedy, gdy oszczędzają tokeny lub poprawiają jakość wyniku.
- Przy uruchamianiu subagenta zawsze ustaw `fork_turns="none"`.
- Każdemu przydziel jednoznaczną własność plików lub odpowiedzialności. Inni pracują równolegle: nie cofaj ich zmian i dostosuj własne do aktualnego kodu.

## Grafika z obrazu-wzoru

- Skill `painted-pixel-assets` leży w `.claude/skills/painted-pixel-assets/` (kopia projektowa). Przed użyciem przeczytaj `SKILL.md` i `references/roadwork.md`.
- Postaci walczące rysuje kod (`drawBoxer()` na szkielecie), więc skin zawodnika to nowa funkcja rysująca według PNG-wzorca (wzorce PNG trzymaj lokalnie w `art/`, poza repozytorium), a nie nałożony sprite.

````

---

## `src/pullup-scene.js`

````js
/* Pull-ups at the Ward's window, seen from behind the hero (native 144×96). The deep stone reveal of the window slot, its
   grille — the same square bars and cross bar as in the iso Ward — and London in the smog beyond: roofs, chimney smoke,
   the dome of St Paul's over the gaol wall. The hero hangs from the cross bar. His body is a height field (torso rows,
   capsule limbs, muscles as bumps) shaded by the tallow lamp on the left and rimmed by the window in front of him. The
   more of the opening his head and shoulders cover, the darker the room and the thinner the shafts of light. Cockroaches
   run the walls: they come out while the light is blocked and scatter when it returns. */

import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { h2 } from './boxing.js';
import { state as roomsState, skyBucket } from './rooms.js';
import { skyColors, weatherNow } from './weather.js';
import { vnoise, fbm } from './noise.js';

const CX = 72;
/** The cross bar's middle row; the hands close on it at CX ± GRIP.x. */
export const BAR_Y = 40;
export const GRIP = {x:32.5,y:BAR_Y};
/** Shoulder joint to elbow, elbow to the middle of the fist. */
export const ARM = {upper:22,fore:21};
/** The grille's opening, the reveal's mouth on the room side, the vanishing point of the reveal. */
export const OPEN = {x0:26,x1:118,y0:9,y1:71};
const INNER = {x0:12,x1:132,y0:-2,y1:79}, VP = {x:72,y:44};
/** Left edges of the five square bars (5 px), spaced like the iso grille: the first and last stand against the jambs. */
const BARS = [0,1,2,3,4].map(k=>OPEN.x0+21.6*k);
const SY_TOP = BAR_Y+5;
const DOME = {x:57,y:34};
/** Surfaces of the background, per pixel. */
const K_WALL=0, K_JAMB_L=1, K_JAMB_R=2, K_SOFFIT=3, K_SILL=4, K_BAR=5, K_SKY=6;
const M_SKIN=1, M_HAIR=2, M_PANT=3, M_EAR=4, M_HAND=5;
const LF = norm3(-0.5,-0.72,0.48), HV = norm3(-0.5,-0.72,1.48);

/** Scene state: the baked background with its per-pixel maps, the hero's smoothed movement and the small life around. */
export const state = {bg:null,pose:{},t:0,ps:0,pv:0,effort:0,cover:0,light:1};

/* ---------- colour helpers (ABGR) ---------- */

/** @param {number} v */
const cl = (v)=>v<0?0:v>255?255:Math.round(v);
/** @param {number} r @param {number} g @param {number} b */
const pack = (r,g,b)=>(0xff000000|(cl(b)<<16)|(cl(g)<<8)|cl(r))>>>0;
/** Blend colour a towards b by k. @param {number} a @param {number} b @param {number} k */
function mixc(a,b,k){ return pack((a&255)+((b&255)-(a&255))*k,((a>>8)&255)+(((b>>8)&255)-((a>>8)&255))*k,((a>>16)&255)+(((b>>16)&255)-((a>>16)&255))*k); }
/** Scale a colour's brightness. @param {number} a @param {number} k */
function mulc(a,k){ return pack((a&255)*k,((a>>8)&255)*k,((a>>16)&255)*k); }
/** @param {number} x @param {number} y @param {number} z */
function norm3(x,y,z){ const l=Math.hypot(x,y,z); return [x/l,y/l,z/l]; }
/** @param {number} a @param {number} b @param {number} x */
function smooth(a,b,x){ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
/** @param {number} t */
const gauss = (t)=>Math.exp(-t*t);

/* ---------- the background ---------- */

/** Which surface a pixel shows: wall, a face of the reveal (with its depth t: 0 at the room, 1 at the grille, and the
 * coordinate along it), a bar or the open air. @param {number} x @param {number} y @returns {[number,number,number]} */
function surface(x,y){
  const px=x+0.5, py=y+0.5;
  if(px>=OPEN.x0&&px<OPEN.x1&&py>=OPEN.y0&&py<OPEN.y1) return [onBar(px,py)?K_BAR:K_SKY,1,0];
  if(px<INNER.x0||px>=INNER.x1||py<INNER.y0||py>=INNER.y1) return [K_WALL,0,0];
  const dx=px-VP.x, dy=py-VP.y, hx=dx/((dx<0?INNER.x0:INNER.x1)-VP.x), hy=dy/((dy<0?INNER.y0:INNER.y1)-VP.y);
  if(hx>=hy){ const g=((dx<0?OPEN.x0:OPEN.x1)-VP.x)/((dx<0?INNER.x0:INNER.x1)-VP.x); return [dx<0?K_JAMB_L:K_JAMB_R,Math.min(1,(1-hx)/(1-g)),VP.y+dy/hx]; }
  const g=((dy<0?OPEN.y0:OPEN.y1)-VP.y)/((dy<0?INNER.y0:INNER.y1)-VP.y); return [dy<0?K_SOFFIT:K_SILL,Math.min(1,(1-hy)/(1-g)),VP.x+dx/hy];
}
/** @param {number} px @param {number} py */
function onBar(px,py){ return Math.abs(py-BAR_Y-0.5)<2.5||BARS.some(b=>px>=b&&px<b+5); }

const BAYER16=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const RUST_DUST=rgb('#5a3822');

/** Old brick under peeling limewash, soot from the vault, the slot's rust and water running down under the sill; the lamp's falloff is dithered.
 * @param {number} x @param {number} y */
function wallCol(x,y){
  const yy=y+40, course=(yy/5)|0, ry=yy%5, off=(course&1)*6.5, ux=x+off, bx=Math.floor(ux/13), rx=Math.floor(ux)%13;
  const mort=ry===0||rx===0, id=h2(bx+3,course*5+1);
  const brick=[rgb('#5e3a2c'),rgb('#6b4332'),rgb('#553328'),rgb('#714a36')][id&3];
  let c=mort?rgb('#342e29'):mulc(brick,(ry===1?1.08:ry===4?0.84:0.94)+((id>>2)&15)/15*0.16);   // the brick's top edge catches the light, its bottom is in shade
  const lime=fbm(x*0.07+2,y*0.09)*0.72+vnoise(x*0.23,y*0.25+4)*0.28;
  if(lime>0.47){ c=mixc(rgb('#a49e8c'),rgb('#888272'),vnoise(x*0.28,y*0.28)); if(ry===0&&((x+y)&1)) c=mulc(c,0.9); }   // the courses show under the limewash
  else if(lime>0.445) c=mixc(c,rgb('#dcd6c4'),0.35);   // a pale chip at the edge of the lime
  else if(lime>0.425) c=mixc(c,rgb('#2a231e'),0.55);   // the shadow under the chip
  c=mixc(c,rgb('#120f0c'),Math.max(0,Math.min(0.78,0.18+0.42*vnoise(x*0.05+9,y*0.04)+(y<22?(22-y)*0.022:0))));
  if(x>=OPEN.x0-4&&x<OPEN.x1+4&&y>=INNER.y1){ const run=5+18*vnoise(x*0.33,7.1); if(y-INNER.y1<run) c=mixc(c,(x&7)<3?rgb('#4c2a16'):rgb('#1b2317'),0.55*(1-(y-INNER.y1)/run)); }
  if(y>86) c=mixc(c,rgb('#1c221a'),Math.min(0.55,(y-86)*0.06));
  return mulc(c,1.10-x/144*0.32+(BAYER16[(y&3)*4+(x&3)]-7.5)/255*0.5);                          // the lamp is on the left
}
/** Dressed stone of the reveal: blocks along it, two stones deep, iron cramps where the bar is let into the jambs. @param {number} k @param {number} t @param {number} v @param {number} x @param {number} y */
function revealCol(k,t,v,x,y){
  const side=k===K_JAMB_L||k===K_JAMB_R, step=side?11:15, row=Math.floor((v+3)/step), deep=t>(row&1?0.45:0.6)?1:0;
  const along=(v+3)%step, joint=along<0.9||Math.abs(t-(row&1?0.45:0.6))<0.05;
  const id=h2(row*3+k,deep+7), base=[rgb('#78736a'),rgb('#6b665d'),rgb('#827c70')][id%3];
  let c=joint?rgb('#322e29'):mulc(base,(along<1.8?1.08:along>step-1.2?0.88:0.95)+(id>>4&7)*0.02), lit;
  if(side&&Math.abs(y-BAR_Y)<2.2&&t>0.72) return t>0.88?rgb('#1e1c1a'):rgb('#3a3530');   // the cramp holding the cross bar in the jamb
  if(k===K_SILL){ lit=0.62+0.52*t;
    const u=v, ub=BARS.map(b=>VP.x+(b+2.5-VP.x)/0.767).find(b=>Math.abs(u-b)<1.6+1.8*(1-t));
    if(ub!==undefined){ lit*=0.70; if(vnoise(u*0.8,t*6)>0.4) c=mixc(c,rgb('#6e3a1c'),0.48*t+0.12); }   // the bars' shadows and their rust run in towards the room
    if(t<0.25&&vnoise(x*0.35,y*0.6)>0.58) c=mixc(c,rgb('#242c1e'),0.35); }                            // moss at the sill's edge
  else if(k===K_SOFFIT){ lit=0.32+0.3*t; c=mixc(c,rgb('#161310'),0.28+0.32*vnoise(x*0.2,t*3)); }
  else lit=(k===K_JAMB_L?0.52:0.42)+0.5*t;
  if(t<0.07) lit*=1.16;                                                                          // the worn arris
  return mulc(c,lit*(0.55+0.45*state.lum));
}
/** Square iron bars against the sky: a lit edge, a dark edge, rust. @param {number} x @param {number} y @param {number} light */
function barCol(x,y,light){
  const iron=rgb('#2c2824'), rimc=mixc(iron,light,0.45);
  let c;
  if(Math.abs(y+0.5-BAR_Y-0.5)<2.5){ const r=y-(BAR_Y-2); c=r===0?rimc:r===1?rgb('#4a4540'):r===4?rgb('#141210'):iron;
    if(BARS.some(b=>x===b+1||x===b+3)&&r===2) c=rgb('#5a544c'); }                                 // bolts where the bars cross
  else { const b=BARS.find(b=>x>=b&&x<b+5)??0, col=x-b; c=col===0?rimc:col===1?rgb('#3e3a35'):col===4?rgb('#141210'):iron; }
  const rust=vnoise(x*0.6+1,y*0.35);
  if(rust>0.66) c=mixc(c,rgb('#6e3b1c'),0.6); else if(rust>0.6) c=mixc(c,rgb('#4c2a16'),0.5);
  return c;
}

/** London through the slot: the smog sky, St Paul's dome, the roofs of Old Bailey, the gaol's spiked wall.
 * @param {number} x @param {number} y @param {number[]} S @returns {[number,number]} colour and depth (3 sky … 0 the wall) */
function outsideCol(x,y,S){
  const L=state, px=x+0.5, py=y+0.5, k=(y-OPEN.y0)/(OPEN.y1-OPEN.y0), smog=L.smog;
  let c=mixc(S[0],S[1],Math.min(1,k*1.4)); c=mixc(c,smog,0.62+0.18*k); c=mixc(c,L.light0,Math.max(0,0.25-Math.abs(py-50)*0.02));
  const roof=L.roof[x]??99, eave=L.eave[x]??99;
  if(py>=57){                                                                                    /* the gaol's outer wall: coping, courses of stone */
    const row=((y-57)/5)|0, bx=(x+(row&1)*4)>>3, block=h2(bx,row);
    let w=py<59?rgb('#545049'):mulc(rgb('#35322e'),0.84+(block&7)*0.03);
    if(py>=59&&((y-59)%5===0||(x+(row&1)*4)%8===0)) w=rgb('#22201d');
    return [mixc(w,smog,0.16),0]; }
  if(py>=53.5&&Math.abs(((px*0.5)%2)-1)*2.6<py-53.5) return [mixc(rgb('#1e1c1a'),smog,0.2),0];   // chevaux-de-frise
  if(py>=roof){                                                                                  /* the terraces: slate roofs, a band of top-floor windows */
    let r;
    if(py<eave){ r=mulc(rgb('#3b3f46'),((y-roof)|0)%2?0.9:1.04); if(L.rain&&((x+y)&3)===0) r=mixc(r,L.light0,0.18); }   // wet slate shines in rain
    else { const win=(x%6<2)&&(py-eave>1.2)&&(py-eave<3.8), mullion=win&&Math.abs(py-eave-2.4)<0.45, lit=L.night&&h2(x>>2,9)<110;
      r=win?(mullion?rgb('#26221e'):lit?rgb('#de9e4a'):rgb('#1a1816')):(Math.abs(py-eave)<0.6?rgb('#5c4a3e'):rgb('#48382e')); if(win&&lit) return [r,1]; }
    return [mixc(r,smog,0.36),1]; }
  const dx=px-DOME.x, far0=mixc(rgb('#2d3036'),smog,0.48);
  const body=(py>=DOME.y+6&&Math.abs(dx)<15)||(py>=DOME.y+3&&py<DOME.y+7&&Math.abs(dx)<10)||(py>=DOME.y&&py<DOME.y+3&&Math.abs(dx)<8);
  const cup=py<DOME.y&&(dx/10)**2+((py-DOME.y)/9)**2<1, lan=py>=DOME.y-13&&py<DOME.y-8.5&&Math.abs(dx)<1.7;
  const ball=py>=DOME.y-15&&py<DOME.y-13&&Math.abs(dx)<1, cross=(py>=DOME.y-18&&py<DOME.y-15&&Math.abs(dx)<0.6)||(Math.abs(py-DOME.y+16.5)<0.6&&Math.abs(dx)<1.6);
  if(body||cup||lan||ball||cross){
    let d=far0;
    if(cup){ const rib=Math.abs(((dx*0.45)%1))-0.5<0.12?0.94:1; d=mulc(far0,(dx<-4?1.18:dx<1?1.06:0.9)*rib); }   // the ribs of the dome
    else if(py>=DOME.y+3&&py<DOME.y+6) d=mulc(far0,(x&1)?0.88:1.08);
    return [L.night?mulc(d,0.6):d,2]; }
  return [c,3];
}

/** Bake the scene for the current hour and weather, and reset the life in it. The renderer's buffer is untouched. */
export function buildPullupBackground(){
  const w=appearanceState.W, h=appearanceState.H, N=w*h, L=state, b=skyBucket(), wx=weatherNow(), sky=skyColors(b,roomsState.SKY[b]).map(rgb);
  L.lum=[0.3,0.62,1,0.7,0.42][b]*(wx==='rain'?0.8:1); L.night=b===0||b===4; L.rain=wx==='rain';
  L.smog=mixc(rgb('#8a8676'),sky[1],0.25); if(L.night) L.smog=mulc(L.smog,0.32);
  L.light0=mixc(sky[1],rgb('#d8d0b8'),0.5); L.lightC=mulc(mixc(L.smog,rgb('#e6dcc0'),0.55),0.6+0.5*L.lum);
  L.roof=[]; L.eave=[]; L.plumes=[];
  for(let x=OPEN.x0,n=0;x<OPEN.x1;n++){                                                          // terraced houses with chimney stacks
    const wd=9+h2(n,1)%8, ridge=44+h2(n,2)%5, eave=ridge+4+h2(n,3)%2, sx=x+2+h2(n,4)%Math.max(1,wd-5), st=ridge-4-h2(n,5)%3;
    for(let i=x;i<x+wd;i++){ L.roof[i]=i>=sx&&i<sx+3?st:ridge; L.eave[i]=eave; }
    if(h2(n,6)<190) L.plumes.push({x:sx+1.5,y:st,s:0.6+h2(n,7)/255*0.5,ph:h2(n,8)/40});
    x+=wd; }
  L.bg=new Uint32Array(N); L.kind=new Uint8Array(N); L.glow=new Float32Array(N); L.roomK=new Float32Array(N); L.depth=new Uint8Array(N);
  let open=0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=y*w+x, [k,t,v]=surface(x,y); L.kind[i]=k;
    if(k===K_SKY){ const [c,d]=outsideCol(x,y,sky); L.bg[i]=c; L.depth[i]=d; L.glow[i]=L.lum*(d>=2?1:0.7); open+=L.glow[i]; }
    else if(k===K_BAR){ L.bg[i]=barCol(x,y,L.light0); L.glow[i]=0.06; }
    else if(k===K_WALL){ L.bg[i]=mulc(wallCol(x,y),0.5+0.3*L.lum); L.roomK[i]=1; }
    else { L.bg[i]=revealCol(k,t,v,x,y); L.glow[i]=L.lum*0.35*t; L.roomK[i]=0.25+0.35*(1-t); } }
  L.openGlow=open; L.t=0; L.ps=0; L.pv=0; L.effort=0; L.phase=''; L.reps=0; L.asym=0; L.sheen=0;
  L.z=new Float32Array(N); L.mat=new Uint8Array(N); L.rays=new Float32Array(73*49); L.src=new Float32Array(72*48);
  L.roaches=[0,1,2,3,4].map(id=>spawnRoach(id,true)); L.sway=0; L.swayV=0; L.headLag=0; L.headLagV=0; L.gripJolt=0; L.grit=[]; L.puffs=[]; L.drips=[]; L.birds=[]; L.birdT=120;
  L.motes=Array.from({length:18},(_,k)=>({x:20+h2(k,1)/255*104,y:4+h2(k,2)/255*88,ph:k}));
  return L.bg;
}

/* ---------- the hero ---------- */

/** One sim tick of the scene: the body follows the exercise with a little spring (a jolt at the dead hang), effort,
 * breath, sweat, the roaches, the birds and the dust. @param {{p:number,phase:string,held:boolean,reps:number,strain:number}} g */
export function pullupSceneTick(g){
  const L=state; if(!L.bg) return; L.t++;
  const prevPs=L.ps, prevPv=L.pv;
  L.pv+=(g.p-L.ps)*0.30; L.pv*=0.64; L.ps+=L.pv; L.ps=Math.max(-0.12,Math.min(1.04,L.ps));
  L.effort+=((g.phase==='up'&&g.held?1:0)-L.effort)*0.08; L.strain=g.strain; L.fatigue=Math.min(1,g.reps/14);
  if(g.phase==='up'&&L.phase!=='up'){
    L.asym=(Math.random()-0.5)*0.12; L.swayV+=L.asym*2.2+(Math.random()-0.5)*0.4; L.gripJolt=1;
    for(const s of [-1,1]) for(let k=0;k<3;k++) L.grit.push({x:CX+s*GRIP.x+(Math.random()-0.5)*4,y:BAR_Y+2,vx:(Math.random()-0.5)*0.18,vy:0.15+Math.random()*0.25,age:0,life:28+Math.random()*18});   // rust crumbling off the bar under the fists
  }
  if(prevPs>0.03&&L.ps<=0.01&&prevPv<-0.015){ L.headLagV+=1.1; L.swayV+=(Math.random()-0.5)*0.35; }   // the jolt into the dead hang
  L.gripJolt*=0.82;
  L.swayV+=-L.sway*0.09-L.swayV*0.14; L.sway+=L.swayV;   // the body swings a little from the hips and the head trails the pull
  const targetHead=-L.pv*24+L.strain*1.6+L.fatigue*0.9;
  L.headLagV+=(targetHead-L.headLag)*0.22-L.headLagV*0.32; L.headLag=Math.max(-2.5,Math.min(3.2,L.headLag+L.headLagV));
  if(g.phase==='down'&&L.phase==='up'){ const P=L.pose; L.puffs.push({x:P.hx+(Math.random()<0.5?-5:5),y:P.hy+2,age:0,life:70,vx:(Math.random()-0.5)*0.1}); }   // he breathes out at the top
  if(g.reps>L.reps&&g.reps>=3&&L.drips.length<6) L.drips.push({x:(Math.random()-0.5)*14,y:-2,v:0,stick:0});
  L.reps=g.reps; L.phase=g.phase; L.sheen=Math.min(0.85,0.22+g.reps*0.06);
  if((g.phase==='rest'||g.phase==='hang'||g.phase==='lock')&&h2(L.t>>5,31)<14&&(L.t&31)===0) L.puffs.push({x:L.pose.hx+(Math.random()-0.5)*8,y:(L.pose.hy||60)+3,age:0,life:50,vx:(Math.random()-0.5)*0.08});
  for(const p of L.puffs) p.age++; L.puffs=L.puffs.filter(p=>p.age<p.life);
  for(const d of L.drips){ if(d.stick>0) d.stick--; else { d.v=Math.min(0.22,d.v+0.006); d.y+=d.v; if(Math.random()<0.02){ d.stick=20+Math.random()*60; d.v=0; } } }
  L.drips=L.drips.filter(d=>d.y<60);
  for(const q of L.grit){ q.age++; q.x+=q.vx; q.y+=q.vy; q.vy+=0.03; } L.grit=L.grit.filter(q=>q.age<q.life&&q.y<95);
  for(const m of L.motes){ m.x+=Math.sin(L.t*0.011+m.ph*1.7)*0.05+0.012; m.y+=Math.cos(L.t*0.009+m.ph)*0.04-0.006; if(m.x>126) m.x=18; if(m.y<2) m.y=92; }
  for(const r of L.roaches) roachTick(r);
  if(--L.birdT<=0){ const left=Math.random()<0.5; L.birds.push({x:left?OPEN.x0-6:OPEN.x1+6,y:14+Math.random()*22,vx:(left?1:-1)*(0.3+Math.random()*0.25),ph:Math.random()*6}); L.birdT=300+Math.random()*700; }
  for(const b of L.birds){ b.x+=b.vx; b.y+=Math.sin(L.t*0.03+b.ph)*0.04; } L.birds=L.birds.filter(b=>b.x>OPEN.x0-8&&b.x<OPEN.x1+8);
}

/** Two-bone arm with the elbow kept outward and down. @param {number} sx @param {number} sy @param {number} gx @param {number} gy @param {number} side */
function armIK(sx,sy,gx,gy,side){
  const U=ARM.upper, F=ARM.fore, max=(U+F)*0.995; let dx=gx-sx, dy=gy-sy, d=Math.hypot(dx,dy);
  if(d>max){ sx=gx-dx*max/d; sy=gy-dy*max/d; dx=gx-sx; dy=gy-sy; d=max; }
  const a=(U*U-F*F+d*d)/(2*d), hh=Math.sqrt(Math.max(0,U*U-a*a)), bx=sx+dx*a/d, by=sy+dy*a/d, nx=-dy/d, ny=dx/d;
  const e1=[bx+nx*hh,by+ny*hh], e2=[bx-nx*hh,by-ny*hh], e=side*(e1[0]-CX)>side*(e2[0]-CX)?e1:e2;
  return {sx,sy,ex:e[0],ey:e[1],gx,gy};
}

/** The hero's skeleton for the smoothed progress: shoulder blades up by the ears at the dead hang, pulled down and
 * together on the way up, lats flaring, elbows driving down beside the ribs, the head tipping back over the bar. */
function solvePose(){
  const L=state, P=L.pose, p=L.ps, pc=Math.max(0,Math.min(1,p)), t=L.t;
  const shrug=1-smooth(0,0.16,pc)+Math.max(0,-p)*3, ret=smooth(0.08,0.78,pc), act=Math.min(1,smooth(0.04,0.55,pc)+L.effort*0.25), tilt=smooth(0.72,1,pc);
  const e=pc*pc*(3-2*pc)*0.6+pc*0.4, sw=16+1.2*ret-1.4*Math.min(1.4,shrug);   // a heavy start from the dead hang, a smooth finish over the bar
  const shake=(L.strain*0.7+L.effort*L.fatigue*0.35)*(Math.sin(t*1.9)*0.6+Math.sin(t*3.1+1)*0.4);
  const breath=(L.phase==='rest'||L.phase==='hang'||L.phase==='lock')?Math.sin(t*(0.07+L.fatigue*0.06))*(1+0.5*L.fatigue):0;
  const hang=BAR_Y+Math.sqrt(((ARM.upper+ARM.fore)*0.985)**2-(GRIP.x-sw)**2), sy=hang+(SY_TOP-hang)*e+shake*0.5;
  const lead=L.asym*Math.sin(Math.PI*pc)*6, tx=shake*0.4+L.sway;
  P.l=armIK(CX+tx-sw,sy-lead,CX-GRIP.x,GRIP.y,-1); P.r=armIK(CX+tx+sw,sy+lead,CX+GRIP.x,GRIP.y,1);
  P.cx=CX+tx; P.ty=(P.l.sy+P.r.sy)/2+3*Math.min(1.3,shrug); P.tilt=(P.r.sy-P.l.sy)/(2*sw)+L.sway*0.012; P.sway=L.sway;
  P.sw=sw; P.shrug=shrug; P.ret=ret; P.act=act; P.headTilt=tilt; P.breath=breath; P.trapH=6+4*Math.min(1.3,shrug);
  P.hx=P.cx-P.tilt*5; P.hy=P.ty-14.6-1.2*tilt+L.headLag*0.75; P.flexL=1-Math.hypot(P.l.gx-P.l.sx,P.l.gy-P.l.sy)/(ARM.upper+ARM.fore); P.flexR=1-Math.hypot(P.r.gx-P.r.sx,P.r.gy-P.r.sy)/(ARM.upper+ARM.fore);
}

/** Half-width of the back at Y px below the top of the ribcage: the traps' slope, the shoulders, the lats' flare, the
 * waist, the hips in the trousers. @param {number} Y */
function backHalf(Y){
  const P=state.pose, top=P.sw-1;
  if(Y<0){ const q=Math.min(1,-Y/P.trapH); return 5.7+(top-5.7)*Math.pow(Math.max(0,1-q),0.7); }
  if(Y>=40) return 12.4+(Y-40)*0.14;
  const lat=(1.2+2.1*P.act)*gauss((Y-(7+3*(1-P.act)))/6.5);
  return 12.2+(top-12.2)*Math.pow(1-Y/40,1.25)+lat+P.breath*0.5*gauss((Y-14)/10);
}
/** Height of the muscles over the round of the back, after a back mid-pull: the spine's groove between thick erectors,
 * the lower traps' diamond to a point at mid-back, the shoulder blades with their spines (wide and tipped up at the
 * dead hang, drawn down and in on the pull), teres and infraspinatus bunching towards the armpit, the lats' long wings.
 * @param {number} X @param {number} Y @param {number} hw */
function backBumps(X,Y,hw){
  const P=state.pose, ax=Math.abs(X);
  let z=-1.5*gauss(X/1.25)*smooth(1,9,Y);                                                         // the spine's groove
  z+=1.4*gauss((ax-4.4)/2.3)*smooth(15,31,Y)*(1+0.3*smooth(31,40,Y));                            // the erectors
  const tip=20+3*(1-P.ret), tw=Y<3?hw-3:(hw-3)*Math.max(0,(tip-Y)/(tip-3))*0.85;                  // lower and middle traps
  if(Y<tip) z+=(0.2+0.25*P.ret)*(1-smooth(tw-4,tw,ax))*smooth(-2,1,Y);
  const cx=10.5+3.5*(1-P.ret)+1.5*P.shrug, cy=9-2.5*P.shrug+1.5*P.ret, an=0.5*P.shrug-0.1*P.ret;  // the shoulder blade
  const a=(ax-cx)*Math.cos(an)-(Y-cy)*Math.sin(an), b=(ax-cx)*Math.sin(an)+(Y-cy)*Math.cos(an), rw=5.4*(1-0.45*Math.max(0,b)/7.8);
  z+=(0.9+0.5*P.act)*(1-smooth(0.35,1.05,(a/rw)**2+(b/7.8)**2));
  z+=(0.6+1.3*P.act)*gauss(Math.hypot(ax-(hw-4.5),Y-(12+2*(1-P.act)))/3.6);                     // teres and infraspinatus
  z+=0.4*P.ret*gauss((ax-3.3)/1.8)*gauss((Y-11)/5);                                              // rhomboids between the blades
  const ax0=hw-1, ay0=6, vx=6.5-ax0, vy=33-ay0, tt=Math.max(0,Math.min(1,((ax-ax0)*vx+(Y-ay0)*vy)/(vx*vx+vy*vy)));
  z+=(0.8+2.2*P.act)*gauss(Math.hypot(ax-ax0-vx*tt,Y-ay0-vy*tt)/4.6)*Math.sin(Math.PI*tt)**0.7;   // the lats
  z+=0.8*gauss((Y+1)/3.2)*gauss((ax-6)/3.2);                                                     // the upper traps over the shoulder line
  return z;
}

/** Rasterise the body into the depth and material maps; returns its bounding box. */
function rasterBody(){
  const L=state, P=L.pose, Z=L.z, M=L.mat, w=appearanceState.W, h=appearanceState.H; Z.fill(-1e9);
  let x0=w, x1=0, y0=h, y1=0;
  const plot=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ z,/** @type {number} */ m)=>{ if(x<0||y<0||x>=w||y>=h) return; const i=y*w+x; if(z>Z[i]){ Z[i]=z; M[i]=m; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } };
  const cap=(/** @type {number[]} */ a,/** @type {number[]} */ b,/** @type {number} */ r0,/** @type {number} */ r1,/** @type {number} */ z0,/** @type {number} */ z1,/** @type {number} */ m,/** @type {number} */ bl)=>{
    const rm=Math.max(r0,r1)+bl, dx=b[0]-a[0], dy=b[1]-a[1], l2=dx*dx+dy*dy||1;
    for(let y=Math.floor(Math.min(a[1],b[1])-rm);y<=Math.ceil(Math.max(a[1],b[1])+rm);y++) for(let x=Math.floor(Math.min(a[0],b[0])-rm);x<=Math.ceil(Math.max(a[0],b[0])+rm);x++){
      const px=x+0.5, py=y+0.5, t=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/l2)), ex=px-a[0]-dx*t, ey=py-a[1]-dy*t, r=r0+(r1-r0)*t+bl*4*t*(1-t), d2=ex*ex+ey*ey;
      if(d2<r*r) plot(x,y,z0+(z1-z0)*t+Math.sqrt(r*r-d2),m); } };
  const ell=(/** @type {number} */ cx,/** @type {number} */ cy,/** @type {number} */ rx,/** @type {number} */ ry,/** @type {number} */ z0,/** @type {number} */ rz,/** @type {(x:number,y:number)=>number} */ m,e=2)=>{
    for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){ const q=Math.abs((x+0.5-cx)/rx)**e+Math.abs((y+0.5-cy)/ry)**e; if(q<1) plot(x,y,z0+rz*Math.sqrt(1-q),m(x,y)); } };
  /** A muscle riding on a limb: offset across it, lifted just over its round. @param {number[]} a @param {number[]} b @param {number[]} lat @param {number[]} br @param {number[]} bz @param {number} t0 @param {number} t1 @param {number} o0 @param {number} o1 @param {number} r0 @param {number} r1 @param {number} lift */
  const muscle=(a,b,lat,br,bz,t0,t1,o0,o1,r0,r1,lift)=>{ const at=(/** @type {number} */ t,/** @type {number} */ o,/** @type {number} */ r)=>{ const R=br[0]+(br[1]-br[0])*Math.max(0,t);
      return [[a[0]+(b[0]-a[0])*t+lat[0]*o,a[1]+(b[1]-a[1])*t+lat[1]*o],bz[0]+(bz[1]-bz[0])*t+Math.sqrt(Math.max(0,R*R-o*o))-r+lift]; };
    const [p0,z0]=at(t0,o0,r0), [p1,z1]=at(t1,o1,r1); cap(p0,p1,r0,r1,z0,z1,M_SKIN,0); };
  /** The side of a limb facing up and out (the outer heads), from its direction. @param {number} dx @param {number} dy @param {number} s */
  const outer=(dx,dy,s)=>{ const l=Math.hypot(dx,dy)||1, n=[-dy/l,dx/l]; return n[0]*s*0.6-n[1]*0.8>0?n:[-n[0],-n[1]]; };
  for(const [A,s,flex] of /** @type {[any,number,number][]} */ ([[P.l,-1,P.flexL],[P.r,1,P.flexR]])){   // arms: deltoid, triceps, forearm, fist over the bar
    const S=[A.sx,A.sy], E=[A.ex,A.ey], fl=Math.hypot(A.gx-A.ex,A.gy-A.ey)||1, wr=[A.gx+(A.ex-A.gx)/fl*3.2,A.gy+(A.ey-A.gy)/fl*3.2];
    const lu=outer(E[0]-S[0],E[1]-S[1],s), lf=outer(wr[0]-E[0],wr[1]-E[1],s), ur=[4.6,3.4], uz=[2.4,1], fr=[3.8,2.8], fz=[1,-3], fN=Math.min(1,flex/0.6);
    cap(E,wr,fr[0],fr[1],fz[0],fz[1],M_SKIN,0.4);
    muscle(E,wr,lf,fr,fz,0.12,0.58,1.3,0.7,3.5,2.2,0.8+0.4*L.effort);                               /* extensors and brachioradialis, thick just below the elbow */
    muscle(E,wr,lf,fr,fz,0.1,0.48,-1.1,-0.7,3,2.1,0.6+0.3*L.effort);                             /*   and the flexors */
    cap(S,E,ur[0],ur[1],uz[0],uz[1],M_SKIN,0.9+0.3*flex);
    muscle(S,E,lu,ur,uz,0.12,0.72,-2,-1.2,3.7,2.5,1.2+0.4*fN);                                 /* triceps, long head by the armpit */
    muscle(S,E,lu,ur,uz,0.12,0.45,1.6,1.4,3,2.3,0.7+0.2*fN);                                   /*   and lateral head */
    muscle(S,E,lu,ur,uz,0.4-0.12*fN,0.84-0.06*fN,1.6,1.3,3.1+0.9*fN,2.2,0.9+1.5*fN);
    muscle(S,E,lu,ur,uz,-0.02,0.4,0.5,0.3,4.8,2.3,1+0.3*L.effort);                               /* the deltoid's cap to its insertion */                /* the biceps: gathers into a peak as the elbow bends, narrows into it */
    ell(A.gx,A.gy-0.7,3.5,3.9,-3,2.6,()=>M_HAND); }
  cap([P.hx,P.hy+4],[P.cx,P.ty-1],5.1,5.8,0.5,0.5,M_SKIN,0);
  for(const s of [-1,1]) cap([P.hx+s*2.2,P.hy+5],[P.cx+s*2.9,P.ty-3],2.5,2.7,3,2.8,M_SKIN,0);   /* the neck's two columns, a groove between */                                       // the neck
  const hairline=(/** @type {number} */ x)=>P.hy+4.1-0.9*((x+0.5-P.hx)/6.9)**2-1.4*P.headTilt;
  ell(P.hx,P.hy,6.9,7.9,1.5,7,(x,y)=>y+0.5>hairline(x)?M_SKIN:M_HAIR,2.5);                              // the head, cropped close
  for(const s of [-1,1]) ell(P.hx+s*6.4,P.hy+1.5,1.3,2.5,0.8,1.4,()=>M_EAR);
  for(let y=Math.floor(P.ty-P.trapH-1);y<h;y++){                                                   // the back, row by row
    const Y0=y+0.5-P.ty, hw0=backHalf(Y0);
    for(let x=Math.floor(P.cx-hw0-2);x<=Math.ceil(P.cx+hw0+2);x++){ const X=x+0.5-P.cx, Y=Y0-P.tilt*X, hw=backHalf(Y), u=X/hw; if(Y<-P.trapH||Math.abs(u)>=1) continue;
      const round=5.6*Math.sqrt(1-u**4);
      if(Y>=40) plot(x,y,round+0.6*Math.sin(X*0.9+Y*0.3)*smooth(42,48,Y),M_PANT);
      else plot(x,y,round+backBumps(X,Y,hw),M_SKIN); } }
  return [x0,x1,y0,y1];
}

/** Light the body: six skin tones from the lamp, the window's rim on every edge that has the opening behind it, the
 * sweat's shine, dark creases where one part passes over another. @param {number[]} box */
function shadeBody(box){
  const L=state, P=L.pose, Z=L.z, M=L.mat, fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, PAL=appearanceState.PAL, A=appearanceState;
  const skin=[PAL[A.R_SKX*3],PAL[A.R_SKIN*3],PAL[A.R_SKX*3+1],PAL[A.R_SKIN*3+1],PAL[A.R_SKX*3+2],PAL[A.R_SKIN*3+2]];
  const hair=[mixc(PAL[A.R_HAIR*3],0xff000000,0.45),PAL[A.R_HAIR*3],PAL[A.R_HAIR*3+1],PAL[A.R_HAIR*3+2]];
  const pant=[mixc(PAL[A.R_PANT*3],0xff000000,0.4),PAL[A.R_PANT*3],PAL[A.R_PANT*3+1],PAL[A.R_PANT*3+2]];
  const rimc=mixc(skin[5],L.lightC,0.55), room=(0.5+0.5*L.light)*(0.62+0.38*L.lum);
  for(let y=Math.max(0,box[2]);y<=Math.min(h-1,box[3]+4);y++) for(let x=Math.max(3,box[0]);x<=Math.min(w-1,box[1]+6);x++){   // the body's shadow on the stone, thrown right and down from the lamp
    const i=y*w+x; if(Z[i]>-1e8||L.kind[i]===K_SKY||L.kind[i]===K_BAR||y<2) continue;
    if(Z[(y-2)*w+x-3]>-1e8) fb[i]=mulc(fb[i],0.72);
  }
  for(let y=box[2];y<=box[3];y++) for(let x=box[0];x<=box[1];x++){ const i=y*w+x, z=Z[i]; if(z<-1e8) continue;
    const zl=x>0&&Z[i-1]>-1e8?Z[i-1]:z-3, zr=x<w-1&&Z[i+1]>-1e8?Z[i+1]:z-3, zu=y>0&&Z[i-w]>-1e8?Z[i-w]:z-3, zd=y<h-1&&Z[i+w]>-1e8?Z[i+w]:z-3;
    const dzx=Math.max(-3,Math.min(3,(zr-zl)/2)), dzy=Math.max(-3,Math.min(3,(zd-zu)/2)), nl=1/Math.hypot(dzx,dzy,1), nx=-dzx*nl, ny=-dzy*nl, nz=nl;
    const m=M[i], over=Math.max(zl,zr,zu,zd)-z>2.6;
    let I=(0.1+0.82*Math.max(0,nx*LF[0]+ny*LF[1]+nz*LF[2]))*room; if(over) I*=0.5;
    const sp=(m===M_SKIN||m===M_HAND)?Math.pow(Math.max(0,nx*HV[0]+ny*HV[1]+nz*HV[2]),18)*L.sheen:0;
    let c;
    if(m===M_HAIR) c=hair[Math.max(0,Math.min(3,Math.floor(I*3.6)))];
    else if(m===M_PANT){
      const X=x+0.5-P.cx-(y-P.ty)*P.sway*0.04, Y=y+0.5-P.ty-P.tilt*X, fold=Math.sin(X*0.65+(Y-40)*0.45)*0.12;
      let pk=Math.max(0,Math.min(3,Math.floor((I+fold)*3.6))); if(((x+y)&3)===0&&I>0.3) pk=Math.max(0,pk-1);   // the weave of coarse drill
      c=pant[pk];
      if(Y<42.2) c=mixc(c,0xff000000,Y<41?0.48:0.26); else if(Math.abs(X)<0.7) c=mixc(c,0xff000000,0.28);   // the waistband and the centre seam
    }
    else { let k=Math.max(over?0:1,Math.floor(I*5)+1-(over?2:0)+(m===M_EAR?-1:0)); if(m===M_HAND&&y+0.5<P.l.gy-1.8) k+=L.effort>0.3?2:1; c=skin[Math.min(5,k)]; if(sp>0.45) c=mixc(c,skin[5],sp>0.75?0.6:0.35); }   // knuckles whiten with the effort; the sweat's shine is a lighter skin tone, not white
    const sx=Math.round(x+nx*3.4), sy=Math.round(y+ny*3.4), gl=sx>=0&&sy>=0&&sx<w&&sy<h&&Z[sy*w+sx]<-1e8?L.glow[sy*w+sx]:0, rim=(1-nz)*gl*2.2;
    if(rim>0.3) c=mixc(c,m===M_HAIR?mixc(hair[2],L.lightC,0.4):m===M_PANT?mixc(pant[3],L.lightC,0.5):rimc,rim>0.5?0.75:0.4);
    fb[i]=c; }
  const dropHi=mixc(skin[5],L.lightC,0.45), dropTail=skin[3];
  for(const d of L.drips){ const x=Math.round(P.cx+d.x*0.85), y=Math.round(P.ty+6+d.y);   // sweat running down the back: a lit head and a darker tail, no white
    for(let k=0;k<3;k++){ const yy=y-k; if(x<0||yy<0||x>=w||yy>=h) continue; const i=yy*w+x; if(M[i]===M_SKIN&&Z[i]>-1e8) fb[i]=mixc(fb[i],k===0?dropHi:dropTail,k===0?0.5:0.22); } }
}

/* ---------- the life around him ---------- */

/** @param {number} id @param {boolean} first */
function spawnRoach(id,first){
  let x=0, y=0;
  if(first) for(let k=0;k<40;k++){ x=4+Math.random()*136; y=2+Math.random()*92; if(walkable(x,y)&&(k>30||state.kind[(y|0)*appearanceState.W+(x|0)]!==K_WALL)) break; }
  else { const edge=h2(id,state.t|0)%3; x=edge===0?1:edge===1?142:20+Math.random()*100; y=edge===2?95:30+Math.random()*60; }
  return {id,x,y,a:Math.random()*6.28,v:0,vt:0.5,mode:first?0:2,timer:first?Math.random()*200:400+Math.random()*900,leg:0};
}
/** Can a roach stand here: wall or reveal, not the open air, not under the meter. @param {number} x @param {number} y */
function walkable(x,y){
  const w=appearanceState.W, h=appearanceState.H; if(x<0||y<0||x>=w||y>=h) return false;
  if(x>=129&&x<140&&y>=8&&y<78) return false;
  const k=state.kind[(y|0)*w+(x|0)]; return k!==K_SKY&&k!==K_BAR;
}
/** Dart, stop, twitch the feelers; head for the window while the hero blocks it, scatter when the light comes back.
 * @param {any} r */
function roachTick(r){
  const L=state;
  if(r.mode===2){ if(--r.timer<=0) Object.assign(r,{mode:1,timer:60,a:Math.atan2(48-r.y,72-r.x)}); return; }
  if(r.mode===0){ r.v*=0.6; if(--r.timer<=0){ r.mode=1; r.timer=25+Math.random()*110; r.a+=(Math.random()-0.5)*2.4; r.vt=0.35+Math.random()*0.5; } return; }
  const dark=L.light<0.75, toWin=Math.atan2(BAR_Y-r.y,CX-r.x), bright=L.glow[(r.y|0)*appearanceState.W+(r.x|0)]>0.15;
  let want=r.a+(vnoise(L.t*0.05,r.id*7.3)-0.5)*0.5;
  if(dark&&!bright) want=r.a+Math.sin(toWin-r.a)*0.12; else if(!dark&&(bright||L.light>0.9)) want=r.a-Math.sin(toWin-r.a)*0.16;
  r.a=want; const vt=(!dark&&bright)?0.95:r.vt; r.v+=(vt-r.v)*0.2;
  const nx=r.x+Math.cos(r.a)*r.v, ny=r.y+Math.sin(r.a)*r.v;
  if(walkable(nx,ny)){ r.x=nx; r.y=ny; } else { r.a+=(Math.random()<0.5?1:-1)*(1.2+Math.random()); r.v*=0.3; }
  if(r.x<0.5||r.x>143.5||r.y>95.5||r.y<0.5){ Object.assign(r,spawnRoach(r.id,false)); return; }
  r.leg+=r.v*1.4;
  if(--r.timer<=0){ r.mode=0; r.timer=20+Math.random()*(dark?60:180); }
}
/** A glossy brown body along its heading, legs rowing while it runs, feelers. @param {any} r */
function drawRoach(r){
  if(r.mode===2) return;
  const fb=rendererState.fb, w=appearanceState.W, Z=state.z, ca=Math.cos(r.a), sa=Math.sin(r.a);
  const put=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c,/** @type {number} */ k)=>{ x=Math.floor(x); y=Math.floor(y); if(x<0||y<0||x>=w||y>=appearanceState.H||!walkable(x,y)) return; const i=y*w+x; fb[i]=k>=1?c:mixc(fb[i],c,k); };
  for(let y=Math.floor(r.y-3);y<=r.y+3;y++) for(let x=Math.floor(r.x-3);x<=r.x+3;x++){ const dx=x+0.5-r.x, dy=y+0.5-r.y, a=dx*ca+dy*sa, c=-dx*sa+dy*ca, q=(a/2.6)**2+(c/1.3)**2;
    if(q<1) put(x,y,a>1.6?rgb('#1e0f07'):(Math.abs(c+0.3)<0.5&&a>-0.8&&a<0.9?rgb('#b8743e'):a<-1?rgb('#4a240f'):rgb('#6a3818')),1); }
  if(r.v>0.1) for(const [la,s,ph] of [[1,1,0],[0,-1,0],[-1,1,0],[1,-1,1],[0,1,1],[-1,-1,1]]){ const sw=Math.sin(r.leg+ph*Math.PI)*0.9; put(r.x+ca*(la+sw)-sa*s*1.8,r.y+sa*(la+sw)+ca*s*1.8,rgb('#2a160a'),0.8); }
  const tw=Math.sin(state.t*0.4+r.id)*0.25;
  for(const s of [-1,1]) for(let k=1;k<=3;k++){ const an=r.a+s*(0.35+tw*s), d=2.6+k; put(r.x+Math.cos(an)*d,r.y+Math.sin(an)*d,rgb('#6a4428'),0.7-k*0.12); }
}

/** Light shafts from the opening into the hazy room, cut by the hero: a radial gather over a half-size map. */
function lightShafts(){
  const L=state, fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, S=L.src, R=L.rays, RW=72, RH=48, Z=L.z, G=L.glow;
  for(let v=0;v<RH;v++) for(let u=0;u<RW;u++){ let s=0; for(let k=0;k<4;k++){ const i=(v*2+(k>>1))*w+u*2+(k&1); if(Z[i]<-1e8) s+=L.kind[i]===K_SKY?G[i]:L.kind[i]===K_BAR?L.lum*0.6:0; } S[v*RW+u]=s*0.25; }
  const sx=CX/2, sy=-26;                                                                          /* the sky stands high over the slot: the shafts fall into the room */
  for(let v=0;v<=RH;v++) for(let u=0;u<=RW;u++){ const dl=Math.hypot(sx-u,sy-v), dx=(sx-u)/dl, dy=(sy-v)/dl; let x=u, y=v, sum=0, dec=1;
    for(let k=0;k<24;k++){ x+=dx; y+=dy; const xi=x|0, yi=y|0; if(xi>=0&&yi>=0&&xi<RW&&yi<RH) sum+=S[yi*RW+xi]*dec; dec*=0.94; }
    R[v*(RW+1)+u]=sum/14; }
  const col=L.lightC, k0=0.85*(0.35+0.65*L.lum);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const fx=x/2, fy=y/2, u=fx|0, v=fy|0, ax=fx-u, ay=fy-v, o=v*(RW+1)+u;
    const r=(R[o]*(1-ax)+R[o+1]*ax)*(1-ay)+(R[o+RW+1]*(1-ax)+R[o+RW+2]*ax)*ay, i=y*w+x, a=Math.min(0.5,r*k0*(Z[i]>-1e8?0.35:L.kind[i]===K_SKY?0.15:1));
    if(a>0.01) fb[i]=mixc(fb[i],col,a); }
}

/** Smog drifting outside, chimney smoke, pigeons, rain — only where the opening shows air. */
function outsideLife(){
  const L=state, fb=rendererState.fb, w=appearanceState.W, t=L.t, K=L.kind, D=L.depth, smoke=mulc(rgb('#6e6a62'),L.night?0.4:1);
  for(let y=OPEN.y0;y<OPEN.y1;y++) for(let x=OPEN.x0;x<OPEN.x1;x++){ const i=y*w+x; if(K[i]!==K_SKY) continue;
    const n=fbm(x*0.045-t*0.0011,y*0.09+Math.sin(t*0.0017)*0.3), a=(0.1+0.32*n*n)*(D[i]===0?0.4:1);
    let c=mixc(fb[i],L.smog,a);
    for(const p of L.plumes){ const hh=p.y-y; if(hh<0||D[i]===0||(D[i]===1&&y>=p.y-0.5)) continue;
      const cxp=p.x+hh*0.42+Math.sin(hh*0.16-t*0.021+p.ph)*1.4, wd=0.9+hh*0.2, g=gauss((x+0.5-cxp)/wd);
      if(g<0.03) continue; const s=g*p.s*Math.max(0,1-hh/34)*(0.45+0.55*vnoise(x*0.3-t*0.006,y*0.28+t*0.016+p.ph)); c=mixc(c,smoke,Math.min(0.8,s)); }
    fb[i]=c; }
  for(const b of L.birds){ const f=Math.sin(L.t*0.32+b.ph), up=f>0.3, dn=f<-0.3, x=Math.round(b.x), y=Math.round(b.y);
    for(const [dx,dy] of up?[[-2,-1],[-1,0],[0,0],[1,0],[2,-1]]:dn?[[-2,1],[-1,0],[0,0],[1,0],[2,1]]:[[-2,0],[-1,0],[0,0],[1,0],[2,0]]){ const xx=x+dx, yy=y+dy, i=yy*w+xx; if(xx>=0&&xx<w&&K[i]===K_SKY&&D[i]>=1) fb[i]=mixc(fb[i],rgb('#1a1816'),0.75); } }
  if(L.rain) for(let k=0;k<46;k++){ const x0=OPEN.x0+(h2(k,3)/255)*96, y0=(h2(k,4)/255*62+t*2.3)%62; for(let s=0;s<3;s++){ const x=Math.round(x0-y0*0.25-s*0.25), y=Math.round(OPEN.y0+y0-s), i=y*w+x; if(x>=0&&x<w&&y>=0&&K[i]===K_SKY) fb[i]=mixc(fb[i],rgb('#c8ccd0'),0.28-s*0.06); } }
}

/** Puffs of breath in the cold, and the dust that shows only inside the shafts. */
function airLife(){
  const L=state, fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, R=L.rays;
  for(const p of L.puffs){ const k=p.age/p.life, r=1.5+k*5, a=0.32*(1-k)*Math.min(1,p.age/6), cx=p.x+p.vx*p.age, cy=p.y-p.age*0.16;
    for(let y=Math.floor(cy-r);y<=cy+r;y++) for(let x=Math.floor(cx-r);x<=cx+r;x++){ if(x<0||y<0||x>=w||y>=h) continue; const d=Math.hypot(x+0.5-cx,y+0.5-cy)/r; if(d>=1) continue;
      const s=a*(1-d)*(1-d)*(0.55+0.6*vnoise(x*0.5+p.age*0.05,y*0.5)); if(s>0.02) fb[y*w+x]=mixc(fb[y*w+x],L.lightC,Math.min(0.6,s)); } }
  for(const m of L.motes){ const x=Math.floor(m.x), y=Math.floor(m.y); if(x<0||y<0||x>=w||y>=h) continue; const r=R[(y>>1)*73+(x>>1)]*(0.35+0.65*L.lum);
    if(r>0.04) fb[y*w+x]=mixc(fb[y*w+x],L.lightC,Math.min(0.7,r*4)); }
  for(const q of L.grit){ const x=Math.floor(q.x), y=Math.floor(q.y); if(x>=0&&y>=0&&x<w&&y<h&&((x+y+L.t)&1)) fb[y*w+x]=mixc(fb[y*w+x],RUST_DUST,0.65*(1-q.age/q.life)); }   // rust dust from the bar
}

/** Pose and rasterise the hero for a given progress (0 dead hang … 1 chin over the bar) without stepping the scene;
 * the coverage of the opening and the room's light follow. For tests and for the render. @param {number} [p] */
export function posePullup(p){
  const L=state; if(p!==undefined){ L.ps=p; L.pv=0; }
  solvePose(); const box=rasterBody();
  let cov=0; const Z=L.z, K=L.kind, G=L.glow; for(let i=0;i<Z.length;i++) if(Z[i]>-1e8&&K[i]===K_SKY) cov+=G[i];
  L.cover=L.openGlow>0?cov/L.openGlow:0; L.light=Math.max(0.3,Math.min(1,1.12-1.7*L.cover));
  return box;
}

/** The whole picture into the renderer's buffer. */
export function renderPullupScene(){
  const L=state, fb=rendererState.fb, R=L.roomK; fb.set(L.bg);
  outsideLife(); const box=posePullup();
  for(const r of L.roaches) drawRoach(r);
  const dim=(1-L.light)*1.1; for(let i=0;i<fb.length;i++) if(R[i]>0) fb[i]=mulc(fb[i],1-R[i]*dim);
  shadeBody(box); lightShafts(); airLife();
}

````

---

## `src/pullups.js`

````js
import { state as boxing, drawText } from './boxing.js';
import { state as appearance, rgb } from './appearance.js';
import { state as renderer, pset, setFramebuffer } from './renderer.js';
import { state as input, setInfo } from './input.js';
import { leaveMode, setPanelMode } from './navigation.js';
import { applyStats, resetSessXP, statShort } from './progression.js';
import { setPrisonOutfit } from './pushups.js';
import { buildPullupBackground, pullupSceneTick, renderPullupScene } from './pullup-scene.js';
import { initAudio, sfxBreath, sfxChime, sfxMiss } from './audio.js';
import { beginSession, sessionMetric, sessionAddTime, sessionOpen, sessionRunning, sessionParams } from './training-session.js';

/** Perfect core of the target; a miss locks the bar for three seconds. */
const C_PERFECT=rgb('#a8f28c'), C_LOCK=rgb('#4a1812'), LOCK_TICKS=180, REST_TICKS=20;
/** Outside a session (debug start) the stage I parameters apply. */
const FREE={goal:20,zone:13,min:7};
export const state={phase:'hang',held:false,armed:true,height:0,velocity:0,reps:0,perfects:0,combo:0,best:0,streak:0,target:40,zoneSize:13,hit:false,topTicks:0,rest:0,lock:0,feedback:'',flash:'',flashC:0,flashT:0,background:null};

/** Use the same pixel position for drawing and judging the release. @param {number} height */
function meterY(height){ return Math.round(74-49*height); }

/** Rows of the target: the whole OK zone and the perfect core in its middle; drawing and judging share them. */
export function pullupZone(){
  const top=Math.round(state.target)-Math.floor((state.zoneSize-1)/2), n=Math.max(2,Math.round(state.zoneSize/3)), core=top+Math.floor((state.zoneSize-n)/2);
  return {top,end:top+state.zoneSize,coreTop:core,coreEnd:core+n};
}
/** Stage parameters: goal reps for the minute, starting zone, the smallest zone. */
function params(){ return sessionOpen()?sessionParams('pullup'):FREE; }
/** Move the target somewhere new, at least 6 rows from where it was. */
function moveTarget(){ let t; do t=32+Math.random()*20; while(Math.abs(t-state.target)<6); state.target=t; }
/** @param {string} text @param {number} color */
function flash(text,color){ state.flash=text; state.flashC=color; state.flashT=50; }

/** Begin the exercise: one minute at the window, as many pull-ups as he can. */
export function startPullups(){
  leaveMode(); initAudio(); boxing.gstate='pullup'; applyStats(); resetSessXP();
  const p=beginSession('pullup',{end:()=>{ state.held=false; },again:()=>startPullups()});
  Object.assign(state,{phase:'hang',held:false,armed:true,height:0,velocity:0,reps:0,perfects:0,combo:0,best:0,streak:0,target:40,zoneSize:p.zone,hit:false,topTicks:0,rest:0,lock:0,flashT:0,
    feedback:'Minuta na kracie. Przytrzymaj Spację i puść ją w strefie — zielony środek to ideał. Skucha blokuje na 3 s.'});
  moveTarget(); setPrisonOutfit(true); state.background=buildPullupBackground();
  document.body.classList.add('pullup'); setPanelMode(); solvePullup(); setInfo();
}

/** Release input on exit and restore the player's equipment palette. */
export function resetPullups(){ state.held=false; state.phase='hang'; setPrisonOutfit(false); document.body.classList.remove('pullup'); }

/** Keyboard and touch share a held input; simulation alone changes exercise progress. @param {boolean} down */
export function holdPullup(down){ if(boxing.gstate==='pullup'&&(!input.paused||!down)&&!(down&&sessionOpen()&&!sessionRunning())) state.held=down; }

/** A good release: count it, shrink the target towards the stage's minimum and move it; every fifth perfect in a row
 * buys two seconds. @param {boolean} perfect */
function scoreRep(perfect){
  state.hit=true; state.reps++; state.combo++; state.best=Math.max(state.best,state.combo); state.streak=perfect?state.streak+1:0;
  sessionMetric('reps'); sessionMetric('points',perfect?1:0.7);
  if(perfect){ state.perfects++; sessionMetric('perfect'); }
  const bonus=perfect&&state.streak%5===0; if(bonus) sessionAddTime(2);
  state.zoneSize=Math.max(params().min,state.zoneSize-1); moveTarget();
  flash(perfect?(bonus?'IDEALNIE +2 S':'IDEALNIE'):'DOBRZE',perfect?C_PERFECT:appearance.C_SPARK);
  state.feedback=perfect?(bonus?'Pięć idealnych z rzędu — +2 s!':'Idealnie! Passa idealnych: '+state.streak+'.'):'Zaliczone. Celuj w zielony środek.';
  sfxChime(perfect?1000+Math.min(10,state.streak)*40:760);
}
/** A miss: the bar is locked for three seconds, the target widens a little and moves. @param {string} why */
function missRep(why){
  state.phase='down'; state.velocity=0; state.hit=false; state.combo=0; state.streak=0; state.lock=LOCK_TICKS;
  state.zoneSize=Math.min(params().zone,state.zoneSize+2); moveTarget(); sessionMetric('misses');
  flash('SKUCHA',appearance.C_RED); state.feedback=why+' Blokada 3 s.'; sfxMiss(); setInfo();
}

/** Judge the release against the visible target, then lower automatically; a miss locks the bar. */
export function pullupTick(){
  if(state.flashT>0) state.flashT--;
  if(state.lock>0){ state.lock--; if(state.lock%60===0) setInfo(); if(state.lock===0&&state.phase==='lock'){ state.phase='hang'; state.armed=!state.held; state.feedback='Znowu na kracie — przytrzymaj Spację.'; setInfo(); } }
  if(state.phase==='lock') return;
  if(state.phase==='rest'){
    if(--state.rest<=0){ state.phase='hang'; state.armed=!state.held; setInfo(); }
    return;
  }
  if(state.phase==='hang'){
    if(!state.held) state.armed=true;
    if(!state.held||!state.armed) return;
    state.phase='up'; state.hit=false; state.topTicks=0; state.feedback='Puść Spację w strefie — zielony środek to ideał.'; sfxBreath(); setInfo();
  }
  if(state.phase==='up'){
    if(state.held){
      state.height=Math.min(1,state.height+0.012*(1-Math.min(0.3,state.reps*0.012)));
      if(state.height===1&&++state.topTicks>45) missRep('Za długo na górze.');
    } else {
      const y=meterY(state.height), z=pullupZone();
      if(y>=z.top&&y<z.end){ state.phase='down'; state.velocity=0; scoreRep(y>=z.coreTop&&y<z.coreEnd); setInfo(); }
      else missRep(y<z.top?'Za wysoko — minąłeś strefę.':'Za nisko — puściłeś przed strefą.');
    }
    return;
  }
  if(state.phase==='down'){
    state.velocity+=(0.045-state.velocity)*0.25;
    state.height=Math.max(0,state.height-state.velocity);
    if(state.height>0) return;
    state.armed=false;
    if(state.lock>0) state.phase='lock'; else { state.phase='rest'; state.rest=REST_TICKS; }
    setInfo();
  }
}

/** Step the scene seen from behind: progress towards the current target is the pose; holding past it strains. */
export function solvePullup(){
  const top=(74-state.target)/49;
  pullupSceneTick({p:Math.min(1,state.height/top),phase:state.phase,held:state.held,reps:state.reps,strain:state.phase==='up'&&state.height>=top?Math.min(1,state.topTicks/45+0.3):0});
}

/** Render the window scene, then the meter (the OK zone, its perfect core, the lock), the count and the call. */
export function renderPullup(){
  setFramebuffer(renderer.FB_MAIN); renderPullupScene();
  const x=133,y0=25,y1=74,y=meterY(state.height),z=pullupZone(),locked=state.lock>0;
  for(let py=y0;py<=y1;py++) for(let px=x;px<=x+3;px++){
    const c=py>=z.coreTop&&py<z.coreEnd?C_PERFECT:py>=z.top&&py<z.end?appearance.C_SPARK:locked?C_LOCK:appearance.C_FLOOR_EDGE;
    pset(px,py,c); }
  for(let px=x-1;px<=x+4;px++) pset(px,y,appearance.C_WHITE);
  drawText(String(state.reps),134,12,appearance.C_SPARK,1);
  if(locked) drawText(String(Math.ceil(state.lock/60)),135,78,state.flashC,1);
  if(state.flashT>0&&(state.flashT>12||state.flashT&2)) drawText(state.flash,72,3,state.flashC,1);
}

/** Keep the DOM instructions and touch control in sync with the current phase. */
export function pullupInfo(){
  input.infoEl.textContent='PODCIĄGANIE NA KRACIE OKNA · '+state.reps+' powt. ('+state.perfects+' idealnych) · passa '+state.combo+' · najlepsza '+state.best;
  input.livesEl.textContent=''; input.nextEl.textContent=state.feedback+(state.lock>0?' Jeszcze '+Math.ceil(state.lock/60)+' s.':'')+' · '+statShort()+' · Esc — wróć do celi';
  const button=document.getElementById('pullupAction');
  if(button) button.textContent=state.lock>0?'Skucha · blokada '+Math.ceil(state.lock/60)+' s':state.phase==='down'||state.phase==='rest'?'Opuszczanie · kolejne podciągnięcie za chwilę':'Przytrzymaj · podciągnij / puść w strefie';
}

export function initialize(){
  const button=document.getElementById('pullupAction');
  button.addEventListener('pointerdown',e=>{ e.preventDefault(); button.setPointerCapture(e.pointerId); holdPullup(true); });
  button.addEventListener('pointerup',()=>holdPullup(false)); button.addEventListener('pointercancel',()=>holdPullup(false));
  button.addEventListener('lostpointercapture',()=>holdPullup(false));
  addEventListener('blur',()=>holdPullup(false));
}

````

---

## `src/appearance.js`

````js
import { LOOK_DEFAULT, LOOK, GEAR_BY_ID, GEAR } from './data.js';

// Runtime values owned by appearance; initialized explicitly by main.js.
export const state = {};

export /* =====================================================================
   PALETTE (3-tone ramps: shadow, mid, highlight) + singles
   ===================================================================== */
function rgb(h){const n=parseInt(h.slice(1),16);return (0xff000000|((n&255)<<16)|(n&0xff00)|(n>>>16))>>>0;}

export function applyLook(look){
  for(const k in LOOK_DEFAULT) state.lk[k]=(LOOK[k].some(o=>o.id===look[k]))?look[k]:LOOK_DEFAULT[k];
  const sk=LOOK.skin.find(o=>o.id===state.lk.skin), hr=LOOK.hair.find(o=>o.id===state.lk.hair);
  setRamp(state.R_SKIN,sk.ramp,false); setRamp(state.R_SKINF,sk.ramp,true); setRamp(state.R_HAIR,hr.ramp,false);
  const sx6=skinExtra(sk.ramp); setRamp(state.R_SKX,sx6,false); setRamp(state.R_SKXF,sx6,true);
} // extra skin tones for the sculpted body: [deep shadow, shadow-mid, mid-light] derived from the 3-tone skin ramp,
// so every skin option keeps working. Deep shadow is cooler/redder (hue-shifted), mid-light a plain blend.
function skinExtra(r){
  const c=r.map(h=>{const n=parseInt(h.slice(1),16);return [n>>16,(n>>8)&255,n&255];}), hx=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  return [hx([c[0][0]*0.66,c[0][1]*0.52,c[0][2]*0.58+4]), hx(mix(c[0],c[1],0.5)), hx(mix(c[1],c[2],0.5))];
}

export function setRamp(slot,hex,far){
  for(let j=0;j<3;j++){ let c=rgb(hex[j]); if(far){ const r=c&255,g=(c>>8)&255,b=(c>>16)&255; c=(0xff000000|((b*0.72+6)<<16)|((g*0.66)<<8)|(r*0.64))>>>0; } state.PAL[slot*3+j]=c; }
}

export function applyGear(eq){   // eq = {trunks:id, gloves:id, boots:id}
  const t=GEAR_BY_ID[eq.trunks]||GEAR.trunks[0], g=GEAR_BY_ID[eq.gloves]||GEAR.gloves[0], b=GEAR_BY_ID[eq.boots]||GEAR.boots[0];
  setRamp(state.R_TRUNK,t.base,false); setRamp(state.R_TRUNKF,t.base,true); setRamp(state.R_TT,t.trim,false); setRamp(state.R_TTF,t.trim,true); setRamp(state.R_TA,t.acc,false); setRamp(state.R_TAF,t.acc,true);
  setRamp(state.R_GLOVE,g.base,false); setRamp(state.R_GLOVEF,g.base,true); setRamp(state.R_CUFF,g.cuff,false); setRamp(state.R_CUFFF,g.cuff,true); setRamp(state.R_GA,g.acc,false); setRamp(state.R_GAF,g.acc,true);
  setRamp(state.R_BOOT,b.base,false); setRamp(state.R_BOOTF,b.base,true); setRamp(state.R_BTR,b.trim,false); setRamp(state.R_BTRF,b.trim,true);
  state.trStyle=t.style; state.glStyle=g.style; state.btStyle=b.style;

}

export // recolor pixels of ramp `from` (any shade) inside a box to the same shade of ramp `to`, where test(x,y) is true
function rampIndex(c,rp){ return c===state.PAL[rp*3]?0:(c===state.PAL[rp*3+1]?1:(c===state.PAL[rp*3+2]?2:-1)); }

export function initialize(){

/* =====================================================================
   CONSTANTS
   ===================================================================== */
state.W = 144;
state.H = 96;
state.STEP_MS = 1000/60;

state.FLOOR_Y = 86;
state.BASE_X = 56;
state.HIP_Y0 = 66;

state.UPPER = 8.5;
state.FORE = 9.0;
state.THIGH = 11.0;
state.SHIN = 10.5;
state.TORSO = 12.5;
   // body proportions: long legs (wide crouch), longer torso, compact head
state.PIVX = 86;
state.PIVY = -2;

state.RAMPS = [
 ['#7a3f2b','#b86b45','#e59c6b'], // 0 skin (near)
 ['#4f271b','#83482f','#aa6a45'], // 1 skin (far)
 ['#162a7a','#2b4fd6','#6a8cff'], // 2 trunks
 ['#0f1c52','#1f3a9c','#3c5ccc'], // 3 trunks far
 ['#8a93b0','#e2e6f0','#ffffff'], // 4 trim / boots
 ['#5c6480','#a3abc4','#c9cfe0'], // 5 trim / boots far
 ['#6e0f1e','#c8182f','#ff4d5e'], // 6 glove
 ['#470a14','#8e1226','#c22f3e'], // 7 glove far
 ['#2b1810','#5c361e','#8c5830'], // 8 bag leather
 ['#110b0b','#1e1414','#3b2b2b'], // 9 hair
 ['#ffd23f','#ffffff','#ffffff'], // 10 hit flash
];

state.R_SKIN = 0;
state.R_SKINF = 1;
state.R_TRUNK = 2;
state.R_TRUNKF = 3;
state.R_TRIM = 4;
state.R_TRIMF = 5;
state.R_GLOVE = 6;
state.R_GLOVEF = 7;
state.R_BAG = 8;
state.R_HAIR = 9;
state.R_FLASH = 10;

// Gear ramp slots (written at runtime from the equipped items; *F = far/depth variant, auto-darkened)
state.R_TT = 11;
state.R_TTF = 12;
state.R_TA = 13;
state.R_TAF = 14;
state.R_BOOT = 15;
state.R_BOOTF = 16;
state.R_BTR = 17;
state.R_BTRF = 18;
state.R_CUFF = 19;
state.R_CUFFF = 20;
state.R_GA = 21;
state.R_GAF = 22;
state.R_SB = 23;
state.R_SBF = 24;
state.R_SHIRT = 25;
state.R_SHIRTF = 26;
state.R_APRON = 27;
state.R_PANT = 28;
state.R_PANTF = 29;
state.R_NPCS = 30;
state.R_NPCSF = 31;
state.R_NPCC = 32;
state.R_NPCCF = 33;
state.R_NPCK = 34;
state.R_NPCB = 35;
state.R_NPCP = 36;
state.R_NPCPF = 37;
state.R_HSH = 58;
state.R_HSHF = 59;
state.R_HPT = 60;
state.R_HPTF = 61;
state.R_HBELT = 62;
state.R_HSLIP = 63;
state.R_SKX = 64;
state.R_SKXF = 65;
state.N_RAMPS = 226;   // Keep shared palette offsets; 66–95: Ward inmates, 176–195: hooded walkers, 216: Śmierdziel.
state.PAL = new Uint32Array(state.N_RAMPS*3);

for(let i=0;i<state.RAMPS.length;i++)for(let j=0;j<3;j++)state.PAL[i*3+j]=rgb(state.RAMPS[i][j]);

state.lk = Object.assign({},LOOK_DEFAULT);

state.trStyle = 'stripe';
state.glStyle = 'classic';
state.btStyle = 'mid';

state.C_RED = rgb('#ff4d5e');
state.C_OUT = rgb('#0a0a12');
state.C_WALL = rgb('#151a2c');
state.C_WALL_LIT = rgb('#1f2640');
state.C_MORTAR = rgb('#0e1222');
state.C_MORTAR_LIT = rgb('#161c33');
state.C_FLOOR = rgb('#232842');
state.C_FLOOR2 = rgb('#1a1e34');
state.C_FLOOR_EDGE = rgb('#3a4163');
state.C_SHADOW = rgb('#0c0e1c');
state.C_CHAIN = rgb('#9aa0bb');
state.C_CHAIN2 = rgb('#4d536d');
state.C_STRAP = rgb('#1c100a');
state.C_PATCH = rgb('#d8c79e');
state.C_PATCH2 = rgb('#8a7a58');
state.C_BAGSPEC = rgb('#b27442');
state.C_WHITE = rgb('#ffffff');
state.C_SPARK = rgb('#ffd23f');
state.C_SWEAT = rgb('#7fe3ff');
state.C_DUST = rgb('#5a607f');
// shared props: steel (bars, rails, hooks), wood (bars, stools) and the dark meter lanes
state.C_STEEL = rgb('#8a90a8');
state.C_STEEL2 = rgb('#4d536d');
state.C_WOOD0 = rgb('#4a2c16');
state.C_WOOD1 = rgb('#7a4c28');
state.C_WOOD2 = rgb('#a8703e');
state.C_LANE = rgb('#0a0c17');
state.C_LANE2 = rgb('#141830');
state.C_GRAY = rgb('#8a93b0');
state.C_LAMP = rgb('#2b3150');
state.C_BULB = rgb('#fff3b0');
state.C_WIN = rgb('#15234a');
state.C_WIN2 = rgb('#2b4380');
state.C_DEBUG = rgb('#39ff7a');
}

````

---

## `src/noise.js`

````js
/* Value noise shared by the painted scenes (the cell, the pull-up window, the roach wall, the crank shed, the push-up sheets). */

import { h2 } from './boxing.js';

// Runtime values owned by noise; initialized explicitly by main.js.
export const state = {};

const NG = 32;
/** Smooth value noise, 0..1, wrapping every 32 units (the grid is filled in initialize). @param {number} u @param {number} v */
export function vnoise(u,v){
  const G=state.noise, i=Math.floor(u), j=Math.floor(v), fu=u-i, fv=v-j, su=fu*fu*(3-2*fu), sv=fv*fv*(3-2*fv);
  const i0=i&31, i1=(i+1)&31, j0=(j&31)*NG, j1=((j+1)&31)*NG, a=G[j0+i0], b=G[j0+i1], c=G[j1+i0], d=G[j1+i1];
  return a+(b-a)*su+(c-a+(a-b-c+d)*su)*sv;
}
/** Two octaves of value noise, 0..1. @param {number} u @param {number} v */
export const fbm=(u,v)=>vnoise(u,v)*0.65+vnoise(u*2.03+11.3,v*2.03+5.7)*0.35;

export function initialize(){
  state.noise=new Float32Array(NG*NG).map((_,i)=>h2(i&31,(i>>5)+77)/255);
}

````

---

## `tests/browser.mjs`

````js
import { checkIsoFight, checkIsoFightRooms } from './isofight.mjs';
import { checkCrank } from './crank.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { checkPrisonDay, checkCanteenArm, checkSupervision, checkProfesor, checkProfesorList, checkSpacerniak, checkSundayAndEvents, checkBath, checkCharSheet , checkDevMode, checkDevSceneSwitcher, checkWardRats } from './prison.mjs';
import { checkShadowboxing } from './shadowboxing.mjs';
import { checkHealers } from './healers.mjs';


const port = 5189;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
let context;
let page;
const errors = [];
const results = [];
const path = '/?debug=1';
async function fresh() {
  if (context) await context.close();
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    let seed = 123456789;
    Math.random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  });
  page = await context.newPage();
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.goto(`http://127.0.0.1:${port}${path}`);
  await page.waitForFunction(() => !!window.__boxer, null, { timeout: 10000 });
  await page.evaluate(() => {
    document.querySelector('[data-a="new"]').click();
    window.__boxer.newGame();
    document.querySelector('#storyChoices button')?.click();
    window.__boxer.pause();
    window.__boxer.step(0);
  });
}
/** The pull-up meter as drawn: rows of the OK zone (yellow) and of its perfect core (green), column x 134. */
async function meterRows(){
  return page.evaluate(async () => {
    const {state:r}=await import('/src/renderer.js');const {state:a}=await import('/src/appearance.js');const {pullupZone}=await import('/src/pullups.js');
    const z=pullupZone(),rows=Array.from({length:50},(_,i)=>25+i),core=r.fb[z.coreTop*a.W+134];
    return {ok:rows.filter(y=>r.fb[y*a.W+134]===a.C_SPARK),core:rows.filter(y=>r.fb[y*a.W+134]===core&&core!==a.C_SPARK),zone:z};
  });
}
/** Hold until the meter reaches a row, release, step once; returns the exercise state. @param {number} row */
async function pullTo(row){
  return page.evaluate(async row => {
    const b=window.__boxer;const {state,holdPullup}=await import('/src/pullups.js');
    b.resume();holdPullup(true);b.pause();
    let ticks=0;while(Math.round(74-49*state.height)>row&&ticks++<200)b.step(1);
    holdPullup(false);b.step(1);
    return {reps:state.reps,perfects:state.perfects,phase:state.phase,lock:state.lock,zoneSize:state.zoneSize,target:state.target,streak:state.streak};
  },row);
}
/** Step until the bar can be pulled again. */
/** One push-up: hold to lower until the chest reaches a row of the depth meter (or, for 'lie', until he goes down on the
 * paper), release, step once. kinds: perfect (bottom of the green core), ok (top of the zone), shallow (above it), mid (middle of the zone), lie. */
async function pushRep(kind){
  return page.evaluate(async kind => {
    const b=window.__boxer, U=await import('/src/pushups.js'), S=U.state, z=U.pushupZone();
    const row={perfect:z.coreEnd-1,ok:z.top,shallow:z.top-2,mid:Math.floor((z.top+z.end-1)/2)}[kind];
    b.resume();U.holdPushup(true);b.pause();
    let n=0;
    if(kind==='lie') while(S.puPhase!=='fail'&&n++<300) b.step(1);
    else { b.step(1); while(S.puPhase==='lower'&&Math.round(82-36*S.puH)<row&&n++<300) b.step(1); }
    U.holdPushup(false);b.step(1);
    return {reps:S.puReps,perfects:S.puPerfects,streak:S.puStreak,phase:S.puPhase,lock:S.puLock,zone:S.puZone,burn:S.puBurn,explosive:S.puExplosive,flash:S.puFlash};
  },kind);
}
/** Step until he is up in the plank again, then stand there some ticks. @param {number} [rest] */
async function pushTop(rest=0){ await page.evaluate(async rest => {const U=await import('/src/pushups.js');let n=0;while(U.state.puPhase!=='top'&&n++<600)window.__boxer.step(1);window.__boxer.step(rest);},rest); }
async function untilHang(){ await page.evaluate(async () => {const {state}=await import('/src/pullups.js');let n=0;while(state.phase!=='hang'&&n++<400)window.__boxer.step(1);}); }
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).toLowerCase();   // npm run test:browser -- --only=cell
async function check(name, run) {
  if (only && !name.toLowerCase().includes(only)) return;
  await fresh();
  await run();
  results.push({ name, passed: true });
  console.log(`PASS ${name}`);
}
try {
  await check('isometric fight: keys, stamina, body blows, block, slip, steps, AI, knockdown, pause and result',()=>checkIsoFight(page));
  await check('isometric fight in the yard and the bath rooms',()=>checkIsoFightRooms(page));
  await check('Newgate start and pause clock', async () => {
    await mkdir('artifacts', { recursive: true });
    assert.deepEqual(await page.evaluate(() => [window.__boxer.gstate, window.__boxer.room, window.__boxer.phase]), ['hub','cell','prison']);
    await page.screenshot({path:'artifacts/current-cell.png'});
    const before=await page.evaluate(() => window.__boxer.now);
    await page.locator('#sysBtn').click();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__boxer.now),before);
    // Resume and pause in the same browser task; automation latency may otherwise advance real time.
    await page.locator('[data-a="resume"]').evaluate(el=>{el.click();window.__boxer.pause();});
    assert.equal(await page.evaluate(() => window.__boxer.now),before);
  });
  await check('pocket watch follows spent actions, phases and loaded saves', async () => {
    const read=()=>page.locator('#simCard').evaluate(el=>({time:el.querySelector('.watch-time').textContent,phase:el.querySelector('.when').textContent,left:el.querySelectorAll('.action-token.available').length,pixels:el.querySelector('canvas').toDataURL()}));
    await page.evaluate(()=>{ document.getElementById('storyCard').hidden=true; window.__boxer.simSet({faza:0,akcje:0,min:480}); });
    const morning=await read();
    assert.deepEqual([morning.time,morning.phase,morning.left],['08:00','rano',2]);
    await page.evaluate(async()=>{ (await import('/src/simulation.js')).spendAction('trening'); });
    const spent=await read();
    assert.deepEqual([spent.time,spent.left],['11:00',1]);
    assert.notEqual(spent.pixels,morning.pixels,'the watch hands move when an action is spent');
    await page.screenshot({path:'artifacts/pocket-watch.png'});
    await page.evaluate(async()=>{ const s=await import('/src/simulation.js'); s.spendAction('mycie'); });
    assert.deepEqual(await page.locator('.watch-actions').getAttribute('aria-label'),'Pozostałe punkty akcji: 0 z 2');
    await page.evaluate(async()=>{ (await import('/src/simulation.js')).nextPhase(); });
    assert.deepEqual(await read().then(s=>[s.time,s.phase,s.left]),['14:00','południe',2]);
    await page.evaluate(async()=>{ (await import('/src/simulation.js')).spendAction('mycie'); (await import('/src/progression.js')).persist(); });
    await page.reload(); await page.waitForFunction(()=>!!window.__boxer);
    await page.evaluate(()=>{ window.__boxer.pause(); });
    assert.deepEqual(await read().then(s=>[s.time,s.left]),['16:30',1],'a reload restores the watch from saved actions');
    await page.locator('[data-a="cont"]').click();
    await page.evaluate(()=>{ window.__boxer.pause(); document.getElementById('storyCard').hidden=true; });
    await page.evaluate(async()=>{ const s=await import('/src/simulation.js'); s.nextPhase(); s.spendAction('mycie'); });
    assert.deepEqual(await read().then(s=>[s.time,s.phase,s.left]),['21:30','wieczór',1]);
    await page.evaluate(async()=>{ const s=await import('/src/simulation.js'); s.nextPhase(); });
    assert.deepEqual(await read().then(s=>[s.time,s.phase,s.left]),['08:00','rano',2],'sleep resets the watch and actions');
  });
  await check('pocket watch quests, meals and available prison work', async () => {
    await page.evaluate(async()=>{
      const b=window.__boxer;b.simSet({day:2,faza:0,min:480,akcje:0});
      (await import('/src/prison.js')).prisonClockSync();
    });
    assert.match(await page.locator('.watch-quest').textContent(),/Harry.*Obowiązek: żelazna korba/);
    assert.match(await page.locator('.watch-meal.available').textContent(),/Śniadanie.*odbierz/);
    const options=await page.evaluate(async()=> (await import('/src/prison.js')).cellDoorOptions(()=>{}).map(o=>o[0]));
    assert.equal(options.filter(t=>/korba/.test(t)).length,1);
    assert.equal(options.some(t=>/rzeźnia|Kierat/.test(t)),false);
    await page.evaluate(async()=>{
      const G=await import('/src/gym.js');
      const door=G.stationOf(G.state.gymItems.find(x=>x.t==='cdoor'));
      G.stationOptions(door).find(o=>o[0].startsWith('Odbierz miskę'))[1]();
      (await import('/src/simulation.js')).simUI();
    });
    assert.match(await page.locator('.watch-meal.available').textContent(),/zjedz na pryczy/);
    await page.evaluate(async()=>{
      const P=(await import('/src/progression.js')).state.save.prison;
      P.profesor.spotkany=true;P.lista.rozdzial=2;
      window.__boxer.simSet({faza:1,akcje:0,min:840});
    });
    assert.match(await page.locator('.watch-quest').textContent(),/Lista Profesora.*Walter/);
    assert.equal(await page.locator('.watch-quest strong').count(),0);
    assert.equal(await page.locator('.watch-meal.available').count(),0);
    await page.evaluate(()=>window.__boxer.simSet({faza:2,akcje:0,min:1140}));
    assert.match(await page.locator('.watch-meal.available').textContent(),/Kolacja/);
    await page.evaluate(async()=>{
      const M=(await import('/src/ward-meal.js')).currentMeal();M.eaten=true;
      (await import('/src/simulation.js')).simUI();
    });
    assert.match(await page.locator('.watch-meal').textContent(),/Posiłek zjedzony/);
    assert.equal(await page.locator('.watch-meal.available').count(),0);
    await page.evaluate(async()=>{
      const P=(await import('/src/progression.js')).state.save.prison;
      P.lista.rozdzial=3;
      (await import('/src/ward-meal.js')).currentMeal().eaten=false;
      (await import('/src/simulation.js')).simUI();
    });
    assert.match(await page.locator('.watch-quest').textContent(),/Zeke/);
    await page.evaluate(async()=>{
      window.__boxer.simSet({faza:0,akcje:0,min:480});
    });
    await page.screenshot({path:'artifacts/watch-quest-meal.png'});
  });
  await check('needs HUD follows meals, training, washing and saved needs', async () => {
    await page.evaluate(()=>{ document.getElementById('storyCard').hidden=true; window.__boxer.simSet({glod:0,zm:0,h:100}); });
    const values=()=>page.locator('#needsHud [role="meter"]').evaluateAll(els=>els.map(el=>[+el.getAttribute('aria-valuenow'),el.getAttribute('aria-valuetext')]));
    assert.deepEqual(await values(),[[0,'Po posiłku'],[0,'Wypoczęty'],[100,'Czysty']]);
    for(const [raw,display,segments] of [[40.11338888887926,40,4],[99.9,100,10],[0.1,0,0]]){
      await page.evaluate(h=>window.__boxer.simSet({h}),raw);
      assert.equal(await page.locator('[data-need="hygiene"] [role="meter"]').getAttribute('aria-valuenow'),String(display),'accessible values remain rounded');
      assert.equal(await page.locator('[data-need="hygiene"] [role="meter"]').getAttribute('data-filled'),String(segments));
      assert.equal(await page.evaluate(()=>window.__boxer.sim.h),raw,'display rounding preserves actual hygiene');
    }
    await page.evaluate(()=>window.__boxer.simSet({h:100}));
    assert.equal(await page.locator('.need-meter .need-ring').count(),3,'all gauges surround the icons');
    assert.equal(await page.locator('.need-heading span').count(),0,'numeric counters are replaced by the segmented rings');
    await page.evaluate(async()=>{ const s=await import('/src/simulation.js'); s.simNudge('glod',3); s.simNudge('zm',4); s.simNudge('h',-80); });
    assert.deepEqual(await values(),[[3,'Wygłodzony · ciosy −2'],[4,'Kondycja −4'],[20,'Bardzo brudny']]);
    assert.equal(await page.locator('#needsHud .bad').count(),3);
    assert.equal(await page.locator('#simCard').textContent().then(t=>/WYGŁODZONY|ZMĘCZONY|BRUDNY/.test(t)),false,'need warnings are grouped on the right');
    await page.evaluate(async()=>{ const s=await import('/src/simulation.js'); s.spendAction('posilek'); s.spendAction('drzemka'); s.spendAction('mycie',65); });
    assert.deepEqual(await values(),[[0,'Po posiłku'],[2,'Kondycja −2'],[85,'Czysty']]);
    await page.evaluate(()=>window.__boxer.simSet({akcje:0,glod:2,zm:3,h:65}));
    assert.deepEqual(await page.locator('.need-meter').evaluateAll(els=>els.map(el=>+el.dataset.filled)),[2,3,7]);
    await page.screenshot({path:'artifacts/needs-hud.png'});
    await page.locator('#needsHud').screenshot({path:'artifacts/needs-hud-detail.png'});
    await page.evaluate(async()=>{ (await import('/src/progression.js')).persist(); });
    await page.reload(); await page.waitForFunction(()=>!!window.__boxer);
    await page.evaluate(()=>window.__boxer.pause());
    assert.deepEqual(await values(),[[2,'Głodny · ciosy −1'],[3,'Kondycja −3'],[65,'Do odświeżenia']]);
    await page.locator('[data-a="cont"]').click();
    await page.evaluate(()=>{ window.__boxer.pause(); document.getElementById('storyCard').hidden=true; });
    await page.evaluate(()=>document.body.classList.add('dlgopen'));
    assert.equal(await page.locator('#needsHud').isVisible(),false,'dialogue keeps the view clear');
    await page.evaluate(()=>{ document.body.classList.remove('dlgopen','hub'); });
    assert.equal(await page.locator('#needsHud').isVisible(),false,'the exploration gauges stay off the fight HUD');
  });
  await check('legacy free save loads into Newgate and keeps progression', async () => {
    await page.evaluate(async () => {
      const p=await import('/src/progression.js');
      const data=JSON.parse(JSON.stringify(p.state.save));
      data.phase='free'; data.room='home'; data.coins=923; data.gym=[]; data.stats.str.lvl=7;
      localStorage.setItem('heavybag.slot.3',JSON.stringify({ts:Date.now(),data}));
      document.getElementById('sysBtn').click();
      document.querySelector('[data-a="load"]').click();
      document.querySelector('[data-a="pick-load"][data-n="3"]').click();
      document.querySelector('[data-a="ask-yes"]').click(); window.__boxer.pause();
    });
    assert.deepEqual(await page.evaluate(async () => {const p=await import('/src/progression.js');return [window.__boxer.phase,window.__boxer.room,p.state.save.stats.str.lvl,p.state.save.gym];}),['prison','cell',7,[]]);
    await page.reload();
    assert.deepEqual(await page.evaluate(async () => { const g=await import('/src/gym.js'); return [window.__boxer.phase,window.__boxer.room,g.state.gymItems.length]; }),['prison','cell',11]);   // the Ward's items, the roach wall included
  });
  await check('retired confinement save loads into the Ward and stays there after reports', async () => {
    await page.evaluate(async () => {
      const p=await import('/src/progression.js'), data=JSON.parse(JSON.stringify(p.state.save));
      data.room='izolatka'; data.stats.str.lvl=7;
      data.prison.izolatkaDo=99999; data.prison.flagi['do-izolatki']=true;
      localStorage.setItem('heavybag.slot.3',JSON.stringify({ts:Date.now(),data}));
      document.getElementById('sysBtn').click();
      document.querySelector('[data-a="load"]').click();
      document.querySelector('[data-a="pick-load"][data-n="3"]').click();
      document.querySelector('[data-a="ask-yes"]').click(); window.__boxer.pause();
      window.__boxer.step(5);
    });
    assert.deepEqual(await page.evaluate(async () => {
      const p=await import('/src/progression.js'), x=await import('/src/prison.js');
      return [window.__boxer.room,p.state.save.stats.str.lvl,p.state.save.prison.izolatkaDo,
        !!p.state.save.prison.flagi['do-izolatki'],x.cardOpen()];
    }),['cell',7,0,false,false]);
    await page.screenshot({path:'artifacts/retired-confinement-ward.png'});
  });
  await check('options and controls preserve paused state', async () => {
    await page.evaluate(() => {
      localStorage.setItem('heavybag.crt','1');
      localStorage.setItem('heavybag.crtcfg',JSON.stringify({scan:1,mask:2,bright:0.7}));
    });
    await page.reload();
    await page.waitForFunction(() => !!window.__boxer);
    await page.evaluate(() => { window.__boxer.newGame(); window.__boxer.pause(); document.getElementById('storyCard').hidden=true; window.__boxer.step(1); });
    await page.locator('#sysBtn').click();
    await page.locator('[data-a="keys"]').click();
    assert.match(await page.locator('#sys').textContent(), /F10|Esc/);
    await page.locator('[data-a="back"]').click();
    await page.locator('[data-a="opts"]').click();
    assert.equal(await page.locator('#opts').isVisible(),true);
    assert.equal(await page.locator('#crt, #optCrt, #optRows, #optPre, #optReset').count(),0,'legacy display settings cannot restore the removed filter');
    assert.doesNotMatch(await page.locator('#opts').textContent(),/CRT|Scanlines|Maska RGB/);
    await page.keyboard.press('c');
    assert.equal(await page.locator('#opts').isVisible(),true,'C has no filter action');
    await page.screenshot({path:'artifacts/options.png'});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#opts').isVisible(),false);
    await page.locator('[data-a="opts"]').click();
    await page.locator('#optClose').click();
    assert.equal(await page.locator('#opts').isVisible(),false,'the close button still works');
    await page.evaluate(() => window.__boxer.pause());
  });
    await check('prison day in phases: meals, work, the yard, the bath, sleep, a report for a missed shift', () => checkPrisonDay(page));
    await check('the Ward at a meal: the bowl, arm wrestling a cellmate, eating on the guard-bed', () => checkCanteenArm(page));
    await check('crank labour: hold/release rhythm, keyboard, pause and prison shift', () => checkCrank(page));
    await check('the evening bath: towels, showers, a fight in the steam and the way back', () => checkBath(page));
    await check('developer mode: any door to any room at any hour, no schedule, no autosave', () => checkDevMode(page));
    await check('developer scene switcher in options: switches locations and activities', () => checkDevSceneSwitcher(page));
    await check('cell vermin: rats scurry around the cell and react to the boxer', () => checkWardRats(page));
    await check('the character sheet and the one hero: fixed look, needs, trees, perks, fight record', () => checkCharSheet(page));
    await check('supervision: fight respect and guard risk, reports stay in the Ward', () => checkSupervision(page));
    await check('Profesor: talk, notes, daily task, prison cap and the level-10 trial', () => checkProfesor(page));
    await check('Profesor\'s list: meal and yard boss fights, memories, the rigged fight and the infirmary', () => checkProfesorList(page));
    await check('Spacerniak: respect points, the tree tab, T tricks, jaw, stomach and yard memory', () => checkSpacerniak(page));
    await check('daily events, the Sunday brawl, bets and favours', () => checkSundayAndEvents(page));
    await check('cell shadowboxing combos, input cadence, queued pivots and XP', () => checkShadowboxing(page));
    await check('healers: Śmierdziel\'s ointment by the tub, the turnkey\'s surgeon on the yard', () => checkHealers(page, port));
    await check('Victorian slaughterhouse lifts, carries, hangs and returns with its previous palette', async () => {
      const outfitBefore=await page.evaluate(async()=>{const {state:a}=await import('/src/appearance.js');return Array.from(a.PAL.slice(a.R_SHIRT*3,(a.R_PANTF+1)*3));});
      await page.evaluate(()=>{window.__boxer.startWork();window.__boxer.step(90);window.__boxer.workTap();window.__boxer.step(15);});
      assert.equal(await page.evaluate(()=>window.__boxer.gstate),'work');
      await page.screenshot({path:'artifacts/slaughterhouse-prototype.png'});
      const light=await page.evaluate(async()=>{
        const b=window.__boxer,{state:w}=await import('/src/work.js'),{state:r}=await import('/src/renderer.js'),{state:a}=await import('/src/appearance.js');
        const luma=c=>0.2126*(c&255)+0.7152*((c>>8)&255)+0.0722*((c>>16)&255);
        const exposure=(x,y)=>luma(r.FB_MAIN[y*a.W+x])/luma(w.bgWork[y*a.W+x]);
        const near=exposure(40,52),far=exposure(108,57),before=r.FB_MAIN[52*a.W+10];
        b.step(12);
        return {near,far,flickers:before!==r.FB_MAIN[52*a.W+10]};
      });
      assert.ok(light.near>light.far*1.7,'the hook end is substantially darker than the loading area');
      assert.ok(light.far<0.4,'only a faint trace of lantern light reaches the hook end');
      assert.equal(light.flickers,true,'flame flutter changes the light on the wagon');

      const phases=await page.evaluate(async()=>{
        const b=window.__boxer, {state:w}=await import('/src/work.js');
        for(let k=0;k<100&&w.WK.phase!=='carry';k++){ if(w.WK.phase==='lift') b.workTap(); b.step(4); }
        const lifted=w.WK.phase;
        // Alternate feet at each pendulum extreme through the public input operations.
        for(let k=0;k<500&&w.WK.phase==='carry';k++){
          const side=Math.sin(w.WK.ph)>0?1:-1;
          if(w.WK.stepT===0&&side!==w.WK.lastKey&&Math.abs(Math.sin(w.WK.ph))>0.85) b.workStepKey(side);
          b.step(1);
        }
        const carried=w.WK.phase;
        for(let k=0;k<100&&w.WK.phase==='hang';k++){
          if(w.WK.sqT>=0&&Math.abs(w.WK.sqM-w.WK.sqZ)<=w.WK.sqPerf) b.workTap(); else b.step(1);
        }
        const thrown=w.WK.phase; b.step(20);
        return {lifted,carried,thrown,hung:w.WK.n,drops:w.WK.drops};
      });
      assert.deepEqual(phases,{lifted:'carry',carried:'hang',thrown:'hoist',hung:1,drops:0});
      await page.screenshot({path:'artifacts/slaughterhouse-victorian-hung.png'});

      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#workEnd').isVisible(),true);
      assert.doesNotMatch(await page.locator('#workStats').textContent(),/monet|zarobek/i);
      await page.keyboard.press('Enter');
      assert.deepEqual(await page.evaluate(async()=>{const p=await import('/src/progression.js');return [window.__boxer.gstate,window.__boxer.room,p.state.save.coins];}),['hub','cell',0]);
      assert.deepEqual(await page.evaluate(async()=>{const {state:a}=await import('/src/appearance.js');return Array.from(a.PAL.slice(a.R_SHIRT*3,(a.R_PANTF+1)*3));}),outfitBefore);
    });
    await check('Cechy: an open slot is free, a change costs tobacco after the first, nothing moves the clock, it survives reload', async () => {
      const r=await page.evaluate(async () => {
        const p=await import('/src/progression.js'),x=await import('/src/prison.js');
        const S=p.state.save;
        S.sim.min=14*60+40; x.prisonClockSync(); S.stats.str={lvl:12,xp:0,banked:0}; S.trials.str={10:true,20:false}; S.prison.fajki=0; S.skills.str.respecs=0; S.traits.str=['','',''];
        const early=p.pickTrait('str',2,'a'), pick=p.pickTrait('str',0,'b'), first=p.pickTrait('str',0,'a'), failed=p.pickTrait('str',0,'b'), intact=S.traits.str[0];
        S.prison.fajki=7; const minute=S.sim.min, paid=p.pickTrait('str',0,'b');
        return {early,pick,first,failed,intact,paid,fajki:S.prison.fajki,moved:S.sim.min-minute,traits:S.traits.str.slice(),respecs:S.skills.str.respecs,cutter:p.playerFightPerks().includes('cutter')};
      });
      assert.deepEqual(r,{early:'level',pick:'',first:'',failed:'fajki',intact:'a',paid:'',fajki:2,moved:0,traits:['b','',''],respecs:2,cutter:true},'a free pick, a free first change, then 5 twists; the day does not move');
      await page.reload();
      assert.deepEqual(await page.evaluate(async()=>{const p=await import('/src/progression.js');return [p.state.save.prison.fajki,p.state.save.traits.str,p.state.save.skills.str.respecs];}),[2,['b','',''],2]);
    });
    await check('Profesor\'s Cechy: tabs, keyboard, level gates, picks and changes, icons, layout and save reload into a fight', async () => {
      await page.evaluate(async () => { const p=await import('/src/progression.js'); for(const k of ['str','spd','end']){ p.state.save.traits[k]=['','','']; p.state.save.stats[k]={lvl:1,xp:0,banked:0}; p.state.save.skills[k].respecs=0; } (await import('/src/skill-tree.js')).openSkillTree(); });
      assert.equal(await page.locator('#skillTree').isVisible(), true);
      assert.equal(await page.locator('[data-trait]').count(), 18, 'two traits at three levels of three attributes');
      const before=await page.evaluate(() => ({now:window.__boxer.now,hub:window.__boxer.hub}));
      await page.keyboard.down('KeyW');
      for(const key of ['Digit1','KeyB','F10','KeyO']) await page.keyboard.press(key);
      await page.keyboard.up('KeyW');
      await page.waitForTimeout(100);
      assert.deepEqual(await page.evaluate(() => ({now:window.__boxer.now,hub:window.__boxer.hub})), before);
      for(let i=0;i<24;i++){
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.getElementById('skillTree').contains(document.activeElement)),true);
      }
      assert.equal(await page.locator('[data-skill-grant]').count(),3,'debug adds test points per attribute');
      assert.equal(await page.locator('.skill-branch:visible').count(),1);
      await page.locator('[data-skill-tab=str]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[data-skill-tab=spd]').getAttribute('aria-selected'),'true');
      await page.keyboard.press('End');
      assert.equal(await page.locator('[data-skill-tab=bare]').getAttribute('aria-selected'),'true');
      await page.keyboard.press('Home');
      assert.equal(await page.locator('[data-skill-tab=str]').getAttribute('aria-selected'),'true');
      const state=t=>page.locator('[data-trait="'+t+'"]').getAttribute('data-state');
      assert.equal(await state('str:0:a'),'locked','level 1: no Cecha yet');
      await page.locator('[data-trait="str:0:a"]').click({force:true});
      assert.equal(await state('str:0:a'),'locked');
      await page.evaluate(async () => { const p=await import('/src/progression.js'); p.state.save.trials.str={10:true,20:false}; p.state.save.stats.str={lvl:10,xp:0,banked:0}; });
      await page.keyboard.press('Escape'); await page.evaluate(async()=>(await import('/src/skill-tree.js')).openSkillTree());
      assert.deepEqual([await state('str:0:a'),await state('str:1:b'),await state('str:2:a')],['buy','buy','locked']);
      await page.locator('[data-trait="str:0:a"]').click();
      await page.locator('[data-trait="str:1:b"]').click();
      assert.deepEqual([await state('str:0:a'),await state('str:0:b'),await state('str:1:b')],['always','change','always']);
      assert.match(await page.locator('[data-trait="str:0:b"] .skill-state').textContent(),/pierwsza zmiana za darmo/);
      assert.match(await page.locator('#skillNotice').textContent(),/Nowa Cecha: Nokauter/);
      const saved=await page.evaluate(() => JSON.parse(localStorage.getItem('heavybag.save')));
      assert.equal(saved.version,10);
      assert.deepEqual(saved.traits.str,['a','b','']);
      const icons=await page.locator('#skill-panel-str [data-trait] svg, #skill-panel-spd [data-trait] svg, #skill-panel-end [data-trait] svg').evaluateAll(nodes=>nodes.map(node=>node.innerHTML));
      assert.equal(icons.length,18); assert.equal(new Set(icons).size,18);
      await page.evaluate(() => document.getElementById('skillTree').scrollTop=0);
      await page.screenshot({path:'artifacts/skill-tree-desktop.png'});
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement.id==='hubUse'||(!document.body.classList.contains('touch')&&document.activeElement===document.body));   // screen buttons exist on touch screens only
      assert.equal(await page.evaluate(() => Object.values(window.__boxer.hubKeys).some(Boolean)), false);
      await page.reload();
      const reloaded=await page.evaluate(async () => {
        const p=await import('/src/progression.js');
        return {traits:p.state.save.traits};
      });
      assert.deepEqual(reloaded.traits,saved.traits);
    });
    await check('pull-up from behind: fists stay on the cross bar, arms keep their length, the body blocks more light at the top', async () => {
      const result=await page.evaluate(async () => {
        window.__boxer.goRoom('cell');
        const {startPullups,solvePullup}=await import('/src/pullups.js');
        const S=await import('/src/pullup-scene.js');
        const {state:a}=await import('/src/appearance.js');
        const {state:r}=await import('/src/renderer.js');
        startPullups();
        const frames=[];
        try {
          for(let step=0;step<=100;step+=5){
            S.posePullup(step/100);const P=S.state.pose;
            frames.push({step,light:S.state.light,headY:P.hy,arms:[P.l,P.r].map((A,k)=>({
              grip:Math.hypot(A.gx-(72+(k?1:-1)*S.GRIP.x),A.gy-S.GRIP.y),
              upper:Math.hypot(A.ex-A.sx,A.ey-A.sy),fore:Math.hypot(A.gx-A.ex,A.gy-A.ey),
              elbowDown:A.ey>S.BAR_Y,elbowOut:(k?1:-1)*(A.ex-A.sx)>-1}))});
          }
          S.state.ps=1;S.state.pv=0;S.renderPullupScene();
          const fist=[-1,1].map(s=>Math.round(S.GRIP.y-1)*a.W+Math.round(72+s*S.GRIP.x));
          return {frames,fistSkin:fist.every(i=>S.state.z[i]>-1e8&&S.state.mat[i]===5&&r.fb[i]!==S.state.bg[i]),ARM:S.ARM,BAR:S.BAR_Y};
        } finally {solvePullup();window.__boxer.step(0);}
      });
      for(const f of result.frames) for(const arm of f.arms){
        assert.ok(arm.grip<0.01,`fist on the bar at ${f.step}%`);
        assert.ok(Math.abs(arm.upper-result.ARM.upper)<0.6&&Math.abs(arm.fore-result.ARM.fore)<0.6,`arm lengths at ${f.step}%: ${JSON.stringify(arm)}`);
        assert.ok(arm.elbowDown&&arm.elbowOut,`elbow below the bar and outward at ${f.step}%`);
      }
      const hang=result.frames[0],top=result.frames.at(-1);
      assert.ok(hang.headY-8>result.BAR,'at the dead hang the head hangs below the bar');
      assert.ok(top.headY+4<result.BAR,'at the top the chin is over the bar');
      assert.ok(top.light<hang.light-0.25,`the body blocks the window: ${hang.light} → ${top.light}`);
      for(let k=1;k<result.frames.length;k++) assert.ok(result.frames[k].light<=result.frames[k-1].light+0.02,'the room darkens as he rises');
      assert.equal(result.fistSkin,true,'the fists are drawn over the bar (material 5 = hand)');
    });
    await check('pull-up minute: entered at the window, a perfect release scores at once, the target moves and shrinks, Esc aborts', async () => {
      await page.evaluate(() => {const b=window.__boxer;b.goRoom('cell');b.hubSet(6.0,3.25);b.step(120);   /* under the window slot */});
      assert.equal(await page.evaluate(() => window.__boxer.hub.near),'cpull');
      await page.keyboard.press('KeyE');
      await page.getByRole('button',{name:/^Podciąganie na kracie okna · stopień I · minuta/}).click();
      await page.evaluate(() => window.__boxer.step(45));
      assert.equal(await page.evaluate(() => window.__boxer.gstate),'pullup');
      assert.equal(await page.locator('#pullupAction').isVisible(),false,'screen buttons stay off without touch');
      await page.evaluate(() => document.body.classList.add('touch'));
      assert.equal(await page.locator('#pullupAction').isVisible(),true);
      const before=await page.evaluate(async () => {
        const {state:r}=await import('/src/renderer.js');const {state:g}=await import('/src/gym.js');
        const {buildPullupBackground}=await import('/src/pullup-scene.js');const {state:T}=await import('/src/training-session.js');
        const fb=r.fb,camera=g.propCamera;buildPullupBackground();
        return {snap:window.__boxer.snap,stats:window.__boxer.stats,restored:fb===r.fb&&camera===g.propCamera,clock:T.S.t,rounds:T.S.def.rounds};
      });
      assert.equal(before.restored,true);assert.equal(before.rounds,1,'no sets');
      assert.ok(Math.abs(before.clock-60*60)<=60,`one minute on the clock: ${before.clock}`);
      await page.screenshot({path:'artifacts/pullup-hang.png'});
      const meter=await meterRows();
      assert.equal(meter.ok.length+meter.core.length,13,'stage I starts with a 13-row target');
      assert.deepEqual(meter.core,Array.from({length:meter.zone.coreEnd-meter.zone.coreTop},(_,i)=>meter.zone.coreTop+i),'the drawn green core is the judged one');
      assert.ok(meter.core[0]>meter.ok[0]&&meter.core.at(-1)<meter.ok.at(-1),'the core sits inside the OK zone');
      await page.evaluate(() => {window.__boxer.resume();window.__boxer.pause();});
      const center=Math.floor((meter.zone.coreTop+meter.zone.coreEnd-1)/2);
      await page.evaluate(async center => {const b=window.__boxer;const {state,holdPullup}=await import('/src/pullups.js');b.resume();holdPullup(true);b.pause();while(Math.round(74-49*state.height)>center+8)b.step(1);},center);
      await page.screenshot({path:'artifacts/pullup-middle.png'});
      const scored=await pullTo(center);
      await page.screenshot({path:'artifacts/pullup-top.png'});
      assert.equal(scored.reps,1);assert.equal(scored.perfects,1);assert.equal(scored.phase,'down');
      assert.equal(scored.zoneSize,12,'each rep shrinks the target');
      assert.ok(Math.abs(scored.target-(meter.zone.top+6))>=5,'the target moves');
      assert.deepEqual(await page.evaluate(() => window.__boxer.stats),before.stats,'XP waits for the end of the session');
      assert.equal(await page.evaluate(async()=>(await import('/src/training-session.js')).sessionValue('perfect')),1);
      await page.evaluate(() => window.__boxer.step(8));
      await page.screenshot({path:'artifacts/pullup-descent.png'});
      await untilHang();
      await page.screenshot({path:'artifacts/pullup-next-target.png'});
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      assert.equal(await page.locator('#over').isVisible(),true);
      assert.ok((await page.evaluate(() => window.__boxer.stats)).str.xp>before.stats.str.xp,'the aborted session still pays for its part');
      await page.keyboard.press('Escape');await page.evaluate(() => window.__boxer.step(30));
      assert.equal(await page.evaluate(() => window.__boxer.room),'cell');
      assert.equal(await page.evaluate(() => window.__boxer.hub.near),'cpull');
      assert.equal(await page.locator('#pullupAction').isVisible(),false);
      assert.equal(await page.evaluate(() => window.__boxer.snap.lk),before.snap.lk);
    });
    await check('pull-up OK zone, a miss locks the bar for three seconds and widens the target, overholding misses, touch pulls', async () => {
      await page.evaluate(async () => {document.body.classList.add('touch');window.__boxer.goRoom('cell');(await import('/src/pullups.js')).startPullups();window.__boxer.step(45);});
      let z=(await meterRows()).zone;
      const ok=await pullTo(z.top);
      assert.equal(ok.reps,1);assert.equal(ok.perfects,0,'the edge of the zone is only OK');
      assert.equal(await page.evaluate(async()=>(await import('/src/training-session.js')).sessionValue('points')),0.7);
      await untilHang();z=(await meterRows()).zone;
      const size=ok.zoneSize, low=await pullTo(z.end);
      assert.equal(low.reps,1,'released under the zone: no rep');assert.equal(low.lock,180,'three seconds of lock');assert.equal(low.zoneSize,Math.min(13,size+2),'a miss widens the target');
      const locked=await page.evaluate(async () => {
        const b=window.__boxer;const {state,holdPullup}=await import('/src/pullups.js');
        b.resume();holdPullup(true);b.pause();let rose=0;
        for(let i=0;i<170;i++){b.step(1);if(state.phase==='up')rose++;}
        const during={phase:state.phase,reps:state.reps,rose};holdPullup(false);b.step(20);
        return {during,after:state.phase};
      });
      assert.equal(locked.during.rose,0,'the bar stays locked for three seconds');assert.equal(locked.after,'hang');
      const overheld=await page.evaluate(async () => {
        const b=window.__boxer;const {state,holdPullup}=await import('/src/pullups.js');
        const before=state.reps;b.resume();holdPullup(true);b.pause();b.step(160);holdPullup(false);b.step(1);
        return {before,reps:state.reps,lock:state.lock};
      });
      assert.equal(overheld.reps,overheld.before);assert.ok(overheld.lock>100,'holding over the top is a miss');
      await untilHang();z=(await meterRows()).zone;
      const box=await page.locator('#pullupAction').boundingBox();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
      await page.evaluate(() => window.__boxer.resume());await page.mouse.down();
      await page.evaluate(async row => {const b=window.__boxer;b.pause();const {state}=await import('/src/pullups.js');while(Math.round(74-49*state.height)>row)b.step(1);},Math.floor((z.coreTop+z.coreEnd-1)/2));
      await page.mouse.up();await page.evaluate(() => window.__boxer.step(1));
      assert.equal(await page.evaluate(async () => (await import('/src/pullups.js')).state.perfects),1,'touch pulls and releases');
      await page.locator('#menuBtn').click();
      assert.equal(await page.evaluate(() => window.__boxer.gstate),'hub');
      assert.equal(await page.evaluate(() => window.__boxer.room),'cell');
    });
    await check('roach wall: entered at the scratched wall, the mouse leads the fist shadow, a punch squashes a roach, a miss hurts and stops the hand, Esc returns', async () => {
      await page.evaluate(() => {const b=window.__boxer;b.goRoom('cell');b.hubSet(7.7,3.05);b.step(120);});
      assert.equal(await page.evaluate(() => window.__boxer.hub.near),'croach');
      await page.keyboard.press('KeyE');
      await page.getByRole('button',{name:/^Karaluchy na ścianie · stopień I · ogarek łoju/}).click();
      await page.evaluate(() => window.__boxer.step(45));
      assert.equal(await page.evaluate(() => window.__boxer.gstate),'roach');
      const stats=await page.evaluate(() => window.__boxer.stats);
      assert.ok(Math.abs(await page.evaluate(async()=>(await import('/src/training-session.js')).state.S.t)-80*60)<=60,'stage I burns 80 s of tallow');
      // The mouse leads the hand: a native point of the wall under the cursor, reached with a little lag.
      const at=await page.evaluate(async () => {const {viewToScreen}=await import('/src/renderer.js');const cv=document.getElementById('screen'),r=cv.getBoundingClientRect(),k=cv.clientWidth/cv.width;const [x,y]=viewToScreen(40,58);return [r.left+x*k,r.top+y*k];});
      await page.mouse.move(at[0],at[1]);
      const lag=await page.evaluate(async () => {const {state}=await import('/src/roaches.js');window.__boxer.step(1);const one=state.hand.x;window.__boxer.step(40);return {aim:[state.aim.x,state.aim.y],one,hand:[state.hand.x,state.hand.y]};});
      assert.ok(Math.abs(lag.aim[0]-40)<1&&Math.abs(lag.aim[1]-58)<1,`the cursor maps to the wall: ${lag.aim}`);
      assert.ok(Math.abs(lag.one-40)>3,'the hand has weight: it does not jump to the cursor');
      assert.ok(Math.hypot(lag.hand[0]-40,lag.hand[1]-58)<0.5,'and settles on it');
      await page.screenshot({path:'artifacts/roach-wall.png'});
      // A roach standing under the shadow: a click squashes it after the punch has flown.
      await page.evaluate(async () => {const {state}=await import('/src/roaches.js');const {KINDS}=await import('/src/roach-rules.js');
        state.roaches=[{id:99,kind:KINDS.black,x:40,y:58,a:0,v:0,leg:0,route:[{x:200,y:58,crack:false}],ri:0,mode:'stop',timer:9999,fade:1,leaving:false,flee:false,maim:false,pace:1}];state.spawnT=1e9;window.__boxer.resume();});
      await page.mouse.down();await page.mouse.up();
      const hit=await page.evaluate(async () => {const b=window.__boxer;b.pause();const {state}=await import('/src/roaches.js');const out=state.phase;b.step(7);return {out,phase:state.phase,kills:state.kills,splats:state.splats.length,pain:state.pain};});
      assert.equal(hit.out,'out');assert.equal(hit.phase,'stop','the fist holds at the wall');
      assert.equal(hit.kills,1);assert.equal(hit.splats,1,'the roach stays as a stain');assert.ok(hit.pain<=1,'a hit barely hurts');
      await page.evaluate(() => window.__boxer.step(4));
      await page.screenshot({path:'artifacts/roach-wall-fist.png'});
      assert.deepEqual(await page.evaluate(() => window.__boxer.stats),stats,'XP waits for the end of the session');
      // Nothing under the knuckles: pain, a pause, and the next click does nothing until the hand obeys again.
      const miss=await page.evaluate(async () => {const b=window.__boxer;const {state,roachStrike}=await import('/src/roaches.js');b.step(20);state.roaches=[];
        b.resume();roachStrike();b.pause();b.step(7+6+10);const cool=state.phase,pain=state.pain;b.resume();roachStrike();b.pause();const blocked=state.phase;b.step(160);return {cool,pain,blocked,after:state.phase,misses:state.misses};});
      assert.equal(miss.cool,'cool');assert.ok(miss.pain>=10,`knuckles on stone hurt: ${miss.pain}`);assert.equal(miss.blocked,'cool','no punch while the hand shakes');
      assert.equal(miss.after,'aim');assert.equal(miss.misses,1);
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      assert.equal(await page.locator('#over').isVisible(),true);
      assert.ok((await page.evaluate(() => window.__boxer.stats)).spd.xp>stats.spd.xp,'the aborted session pays speed for its part');
      await page.keyboard.press('Escape');await page.evaluate(() => window.__boxer.step(30));
      assert.equal(await page.evaluate(() => window.__boxer.gstate),'hub');
      assert.equal(await page.evaluate(() => window.__boxer.hub.near),'croach');
      assert.equal(await page.evaluate(() => document.body.classList.contains('roach')),false);
    });
    await check('pull-up perfect streak buys time, the target shrinks to the stage minimum, sweat runs and the minute ends', async () => {
      // Stage V: the target starts at 9 rows and shrinks to 5.
      await page.evaluate(async () => {window.__boxer.goRoom('cell');const p=await import('/src/progression.js');p.state.save.train.stage.pullup=5;(await import('/src/training-session.js')).chooseStage('pullup',5);(await import('/src/pullups.js')).startPullups();window.__boxer.step(45);});
      for(let rep=1;rep<=10;rep++){
        const z=(await meterRows()).zone, t0=await page.evaluate(async()=>(await import('/src/training-session.js')).state.S.t);
        const r=await pullTo(Math.floor((z.coreTop+z.coreEnd-1)/2));
        const t1=await page.evaluate(async()=>(await import('/src/training-session.js')).state.S.t);
        assert.equal(r.reps,rep);assert.equal(r.perfects,rep);assert.equal(r.zoneSize,Math.max(5,9-rep));
        if(rep%5===0) assert.ok(t1>t0,`five perfects in a row buy two seconds: ${t0} → ${t1}`); else assert.ok(t1<t0);
        const sweat=await page.evaluate(async()=>(await import('/src/pullup-scene.js')).state.drips.length);
        assert.ok(rep<3?sweat===0:sweat>=1&&sweat<=6,`sweat drops after ${rep}: ${sweat}`);
        if(rep===8){
          const snapshot=() => page.evaluate(async () => (await import('/src/pullup-scene.js')).state.drips.map(d=>[d.x,d.y]));
          const drops=await snapshot();await page.waitForTimeout(120);
          assert.deepEqual(await snapshot(),drops);
          await page.evaluate(() => window.__boxer.step(90));
          assert.notDeepEqual(await snapshot(),drops);
          await page.screenshot({path:'artifacts/pullup-sweat.png'});
        }
        await untilHang();
      }
      const end=await page.evaluate(async () => {const b=window.__boxer;const T=await import('/src/training-session.js');let n=0;while(T.state.S.phase==='run'&&n++<4000)b.step(1);return {phase:T.state.S.phase,grade:T.state.last?.grade,reps:T.state.last?.metrics.reps};});
      assert.equal(end.phase,'summary','the minute runs out');assert.equal(end.reps,10);
      assert.equal(await page.locator('#over').isVisible(),true);
      assert.equal(await page.evaluate(async () => {window.__boxer.step(2400);return (await import('/src/pullup-scene.js')).state.drips.length;}),0,'the drops run off');
      await page.keyboard.press('Escape');
      await page.evaluate(async () => {(await import('/src/pullups.js')).startPullups();window.__boxer.step(0);});
      assert.equal((await meterRows()).zone.end-(await meterRows()).zone.top,9);
    });
    await check('cell push-ups use three printed newspapers and leave tiles uncovered', async () => {
      await page.evaluate(async () => { const b = window.__boxer; b.goRoom('cell'); b.step(120);
        const it = (await import('/src/gym.js')).state.gymItems.find(x => x.t === 'cfloor'); b.hubSet(it.i + 1.3, it.j + 1.4); b.step(30); });   // the free floor for push-ups
      await page.keyboard.press('KeyE');
      await page.keyboard.press('KeyE');
      const result = await page.evaluate(async () => {
        window.__boxer.step(60);
        const { state } = await import('/src/pushups.js');
        const { NEWSPAPER_COLORS } = await import('/src/rooms.js');
        const { state: dimensions } = await import('/src/appearance.js');
        return {
          mode: window.__boxer.gstate, venue: state.puVenue,
          editions: NEWSPAPER_COLORS.paper.map(color => state.bgPU.includes(color)),
          uncovered: !Object.values(NEWSPAPER_COLORS).flat().includes(state.bgPU[85*dimensions.W+110])
        };
      });
      assert.equal(result.mode, 'pushup'); assert.equal(result.venue, 'cell');
      assert.deepEqual(result.editions, [true,true,true]); assert.equal(result.uncovered, true);
      await page.screenshot({ path: 'artifacts/newspapers-pushups.png' });
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => window.__boxer.room), 'cell');
    });
    await check('push-up minute: release over the paper, burn builds and rests off, half reps, lying flat and full burn lock for 3 s', async () => {
      await page.evaluate(async () => {document.body.classList.add('touch');window.__boxer.goRoom('cell');const U=await import('/src/pushups.js');U.state.puVenue='cell';U.startPushup();window.__boxer.step(10);});
      const start=await page.evaluate(async () => {const {state:T}=await import('/src/training-session.js');return {rounds:T.S.def.rounds,clock:T.S.t,stats:window.__boxer.stats};});
      assert.equal(start.rounds,1,'no sets');assert.ok(Math.abs(start.clock-3600)<=60,'one minute');
      assert.equal(await page.locator('#pushupAction').isVisible(),true);
      assert.equal(await page.locator('#panel button[data-m="0"]').isVisible(),false,'no punch buttons over the push-ups');
      const p1=await pushRep('perfect');
      assert.equal(p1.reps,1);assert.equal(p1.perfects,1);assert.equal(p1.streak,1);assert.equal(p1.zone,9,'each rep narrows the target');assert.ok(p1.burn>0.05,'a rep burns');
      assert.deepEqual(await page.evaluate(() => window.__boxer.stats),start.stats,'XP waits for the end of the session');
      await pushTop(0);const tired=await page.evaluate(async()=>(await import('/src/pushups.js')).state.puBurn);
      await pushTop(120);const rested=await page.evaluate(async()=>(await import('/src/pushups.js')).state.puBurn);
      assert.ok(tired>0.05&&rested<tired,`resting in the plank drains the burn: ${tired} → ${rested}`);
      const ok=await pushRep('ok');
      assert.equal(ok.reps,2);assert.equal(ok.perfects,1);assert.equal(ok.streak,0,'an OK rep breaks the perfect streak');
      assert.equal(await page.evaluate(async()=>(await import('/src/training-session.js')).sessionValue('points')),1.7);
      await pushTop(120);
      const half=await pushRep('shallow');
      assert.equal(half.reps,2,'a half rep does not count');assert.equal(half.phase,'press');assert.equal(half.lock,0);
      await pushTop(120);
      const zone=half.zone, flat=await pushRep('lie');
      assert.equal(flat.reps,2);assert.equal(flat.phase,'fail');assert.ok(flat.lock>=170,'lying on the paper locks three seconds');assert.equal(flat.zone,Math.min(10,zone+2));
      const locked=await page.evaluate(async () => {const b=window.__boxer,U=await import('/src/pushups.js');b.resume();U.holdPushup(true);b.pause();let lowered=0;
        for(let i=0;i<165;i++){b.step(1);if(U.state.puPhase==='lower')lowered++;}U.holdPushup(false);b.step(1);return lowered;});
      assert.equal(locked,0,'the lock holds');
      await page.screenshot({path:'artifacts/pushup-lock.png'});
      await pushTop(200);
      let gaveOut=null;
      for(let i=0;i<25&&!gaveOut;i++){ const r=await pushRep('mid'); if(r.phase==='fail') gaveOut=r; else await pushTop(0); }
      assert.ok(gaveOut,'rushing without rest burns the arms out');
      assert.ok(Math.abs(gaveOut.burn-0.8)<0.01&&gaveOut.lock>=170,`full burn drops him and locks: ${JSON.stringify(gaveOut)}`);
      await page.locator('#menuBtn').click();
      assert.equal(await page.evaluate(() => window.__boxer.gstate),'hub');
    });
    await check('push-up streak: five perfects come up explosive and count twice, ten clap for two seconds, the minute ends', async () => {
      await page.evaluate(async () => {window.__boxer.goRoom('cell');const U=await import('/src/pushups.js');U.state.puVenue='cell';U.startPushup();window.__boxer.step(10);});
      for(let rep=1;rep<=10;rep++){
        const t0=await page.evaluate(async()=>(await import('/src/training-session.js')).state.S.t);
        const r=await pushRep('perfect');
        const t1=await page.evaluate(async()=>(await import('/src/training-session.js')).state.S.t);
        assert.equal(r.streak,rep);assert.equal(r.reps,rep+(rep>=5?1:0)+(rep>=10?1:0),`reps after ${rep}`);
        if(rep===5){ assert.equal(r.explosive,1);assert.equal(r.flash,'WYRZUT X2'); }
        if(rep===10){ assert.equal(r.explosive,2);assert.ok(t1>t0,'the clap buys two seconds'); }
        if(rep===5||rep===10){
          const launched=await page.evaluate(async () => {const U=await import('/src/pushups.js');let seen=0,n=0;while(U.state.puPhase!=='top'&&n++<200){window.__boxer.step(1);if(U.state.puPhase==='launch')seen++;}return seen;});
          assert.ok(launched>0,'the explosive rep leaves the floor');
          if(rep===10) await page.screenshot({path:'artifacts/pushup-clap.png'});
        }
        await pushTop(60);
      }
      const end=await page.evaluate(async () => {const T=await import('/src/training-session.js');let n=0;while(T.state.S.phase==='run'&&n++<4000)window.__boxer.step(1);return {phase:T.state.S.phase,reps:T.state.last?.metrics.reps};});
      assert.equal(end.phase,'summary');assert.equal(end.reps,12);
      assert.equal(await page.locator('#over').isVisible(),true);
      await page.keyboard.press('Escape');
    });
    await check('the Ward: guard-bed, tub, water butt, and tallow light that follows the clock', async () => {
      const r = await page.evaluate(async () => {
        const b = window.__boxer; b.goRoom('cell'); b.step(120);
        const G = await import('/src/gym.js'), L = await import('/src/cell-light.js'), P = await import('/src/progression.js');
        const B = await import('/src/boxing.js'), R = await import('/src/renderer.js');
        const types = G.state.gymItems.map(it => it.t), sink = G.state.gymItems.find(it => it.t === 'csink');
        const wash = G.stationOptions(G.stationOf(sink)).map(o => typeof o[0] === 'function' ? o[0]() : o[0]).join(' | ');
        const frame = min => {   // render only: stepping would let the schedule move the player
          P.state.save.sim.min = min; G.hubRebake(); G.renderHub(); B.state.tick += 40; G.renderHub();
          const fb = R.state.hd.fb;   // the cell is drawn into the 2× frame
          let sum = 0; for (const c of fb) sum += (c & 255) + ((c >> 8) & 255) + ((c >> 16) & 255);
          return { bulb: L.state.bulb, sun: L.state.sun, light: sum / fb.length };
        };
        const hd = { size: [R.state.hd.W, R.state.hd.H], native: [(await import('/src/appearance.js')).state.W, (await import('/src/appearance.js')).state.H], k: G.state.ISO_K };
        return { types, wash, hd, noon: frame(12 * 60), evening: frame(20 * 60), night: frame(23 * 60) };
      });
      for (const t of ['cwash', 'cnews', 'cradio', 'ctable', 'cstool', 'crad', 'ccurt']) assert.equal(r.types.includes(t), false, t + ' is gone (Newgate)');
      for (const t of ['cfloor', 'cshadow', 'ccom', 'csink', 'cwc', 'bunk', 'bunk2', 'cwheel', 'cdoor']) assert.equal(r.types.includes(t), true, t);
      assert.match(r.wash, /Umyj się przy beczce z wodą/);
      assert.deepEqual(r.hd, { size: [288, 192], native: [144, 96], k: 1 }, 'the cell has a 2× frame; outside a frame the game stays native');
      assert.equal(r.noon.bulb, 0, 'no tallow by day');
      assert.ok(r.evening.bulb > 0.5, 'the tallow lamp burns in the evening'); assert.equal(r.evening.sun, 0);
      assert.equal(r.night.bulb, 0, 'the lamp is out after 22:00');
      assert.ok(r.noon.light > r.night.light && r.evening.light > r.night.light, 'smog by day and tallow in the evening are both lighter than the night');
    });
    await check('the exercise yard: hooded men walk the ring in step and halt as one when the hero blocks it', async () => {
      const r = await page.evaluate(async () => {
        const b = window.__boxer, N = await import('/src/npcs.js'), P = await import('/src/progression.js'), Y = await import('/src/exercise-yard.js'), G = await import('/src/gym.js');
        b.newGame('prison'); b.pause(); document.querySelector('#storyChoices button')?.click(); b.pause();   /* the Newgate exercise yard */
        b.goRoom('yard'); P.state.save.sim.min = 600; b.step(1);
        const W = [...N.state.YN, ...N.state.YARD_EXTRA], s0 = W.map(C => C.s);
        for (let k = 0; k < 120; k++) { P.state.save.sim.min = 600; b.step(1); }
        const onRing = W.every(C => Math.abs(Math.hypot(C.i - Y.RING_C[0], C.j - Y.RING_C[1]) - Y.WALK_R) < 0.05);
        const moved = W.every((C, k) => C.s > s0[k] + 0.5), inStep = W.every(C => C.ph === W[0].ph), hooded = W.every(C => C.hood);
        const items = G.state.gymItems.map(it => it.t);
        const p = Y.ringPos(W[0].s + 0.3); G.state.hubP.i = p[0]; G.state.hubP.j = p[1];
        const s1 = W.map(C => C.s); for (let k = 0; k < 30; k++) { P.state.save.sim.min = 600; b.step(1); }
        const halted = W.every((C, k) => C.s === s1[k]);
        const out = { onRing, moved, inStep, hooded, halted, items, guards: N.state.YND.filter(C => C.hd && C.hd.style === 'cap').length };
        b.newGame(); b.pause(); return out;
      });
      assert.deepEqual([r.onRing, r.moved, r.inStep, r.hooded], [true, true, true, true], 'on the ring, walking, in step, hooded');
      assert.equal(r.halted, true, 'the whole column stops for the hero');
      assert.equal(r.guards, 2, 'two turnkeys watch');
      for (const t of ['ybench', 'yhoop', 'ybar']) assert.equal(r.items.includes(t), false, t + ' is gone (Newgate)');
    });
    await check('corrupt autosave remains intact until explicit new game', async () => {
      await page.evaluate(() => { window.__boxer.pause(); });
      // Prevent pagehide from overwriting the intentionally corrupt fixture.
      await page.addInitScript(() => localStorage.setItem('heavybag.save', '{broken'));
      await page.reload();
      assert.equal(await page.evaluate(() => localStorage.getItem('heavybag.save')), '{broken');
      assert.equal(await page.locator('#saveWarning').isVisible(), true);
      await page.evaluate(() => {
        document.querySelector('[data-a="new"]').click();
        document.querySelector('[data-a="ask-yes"]').click(); window.__boxer.pause();
      });
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavybag.save')).version), 10);
    });
    await check('denied storage still opens the game and reports failure', async () => {
      await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied', 'SecurityError'); } }));
      await page.reload();
      await page.waitForFunction(() => !!window.__boxer);
      assert.equal(await page.locator('#saveWarning').isVisible(), true);
      assert.equal(await page.evaluate(() => window.__boxer.gstate), 'hub');
    });
    await check('debug cheats and test hooks are hidden in normal play', async () => {
      await page.goto(`http://127.0.0.1:${port}/`);
      assert.equal(await page.evaluate(() => typeof window.__boxer), 'undefined');
      assert.equal(await page.locator('#shopCheat').count(), 0);
      assert.equal(await page.locator('[data-xp]').count(), 0);
      const skillDebug=await page.evaluate(async () => {
        const p=await import('/src/progression.js');
        const {openSkillTree}=await import('/src/skill-tree.js');
        openSkillTree();
        return {buttons:document.querySelectorAll('[data-skill-grant]').length,tabs:document.querySelectorAll('[data-skill-tab]:not([hidden])').length};
      });
      assert.deepEqual(skillDebug,{buttons:0,tabs:4});
      // Normal play has no free toggles: a fresh fighter cannot take a level-15 Cecha.
      await page.locator('[data-trait="str:2:b"]').click({force:true});
      assert.equal(await page.locator('[data-trait="str:2:b"]').getAttribute('aria-pressed'),'false');
      assert.equal(await page.locator('[data-trait="str:2:b"]').getAttribute('data-state'),'locked');
      await page.keyboard.press('Escape');
      await page.evaluate(() => document.querySelector('[data-a="new"]').click());
      if (await page.locator('[data-a="ask-yes"]').count()) await page.locator('[data-a="ask-yes"]').click();
      assert.equal(await page.locator('#storyCard').isVisible(), true, 'a new game starts with the prison intake');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#storyCard').isVisible(), false);
    });
  assert.deepEqual(errors, []);
} catch (error) {
  results.push({ name: 'failure', passed: false, error: String(error) });
  process.exitCode = 1;
  console.error(error);
} finally {
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/browser-results.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close(); server.kill();
}

````
