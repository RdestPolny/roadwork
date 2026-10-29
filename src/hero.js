/* The hero: the one main character of the game. His head is fixed (data.HERO_LOOK, the in-game head layers 'short'
   and 'brows_angry' in boxing.js); this module paints his portrait for the character sheet — a pixel-art bust, 96×120:
   a broad, square head on a thick neck, short wet hair going back at the temples and greying there, heavy low brows
   drawn into a scowl, narrow hooded eyes, a broad flattened boxer's nose, a hard thin mouth, greying stubble.
   In prison he wears the blue drelich, on the outside a dark jacket over a white shirt. */

/** Paint the portrait. @param {HTMLCanvasElement} cv @param {{prison?:boolean,hurt?:number,wounds?:string[]}} [o]
 * hurt 0..1 adds a bruise; wounds: lasting injury ids from the card fights (scar, eyeL, eyeR, nose, concussion) */
export function drawHeroPortrait(cv,o={}){
  const PW=96, PH=120; cv.width=PW; cv.height=PH;
  const g=/** @type {CanvasRenderingContext2D} */ (cv.getContext('2d')); g.imageSmoothingEnabled=false; g.clearRect(0,0,PW,PH);
  let sd=7; const rnd=()=>{ sd=(sd*1664525+1013904223)>>>0; return sd/4294967296; };
  const px=(/** @type {number} */ x,/** @type {number} */ y,/** @type {string} */ c)=>{ x|=0; y|=0; if(x<0||y<0||x>=PW||y>=PH) return; g.fillStyle=c; g.fillRect(x,y,1,1); };
  const rect=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ w,/** @type {number} */ h,/** @type {string} */ c)=>{ g.fillStyle=c; g.fillRect(x,y,w,h); };
  const ell=(/** @type {number} */ cx,/** @type {number} */ cy,/** @type {number} */ rx,/** @type {number} */ ry,/** @type {(dx:number,dy:number,x:number,y:number)=>string|null} */ fn)=>{
    for(let y=Math.floor(cy-ry);y<=cy+ry;y++) for(let x=Math.floor(cx-rx);x<=cx+rx;x++){ const dx=(x-cx)/rx, dy=(y-cy)/ry; if(dx*dx+dy*dy<=1){ const c=fn(dx,dy,x,y); if(c) px(x,y,c); } } };
  const ln=(/** @type {number} */ x0,/** @type {number} */ y0,/** @type {number} */ x1,/** @type {number} */ y1,/** @type {string} */ c)=>{ const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1; for(let i=0;i<=n;i++) px(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),c); };
  const SK=['#f2c9ae','#d8a086','#b77e66','#8a5644','#5e3428'];          // light … deep shadow
  const HR=['#a88a66','#7d6346','#5c4632','#3a2c20','#241a12'];          // ash brown, light … dark
  const OUT='#1c120c', prison=o.prison!==false;

  // ---- shoulders and clothes
  if(prison){
    ell(48,122,46,34,(dx)=>dx<-0.55?'#5a6e8a':dx>0.5?'#34445c':'#46587a');
    ln(48,94,48,120,'#2a3648'); for(let y=100;y<120;y+=7) px(47,y,'#9aa4b4');
    ell(35,96,11,5,(dx,dy)=>dy<0?'#5a6e8a':'#3a4a62'); ell(61,96,11,5,(dx,dy)=>dy<0?'#46587a':'#2e3c52');
    rect(62,104,12,7,'#d8d2c0'); for(let x=63;x<73;x+=2) px(x,107,'#3a3a3a');                  // the number patch
  } else {
    ell(48,124,47,36,(dx)=>dx<-0.55?'#3a3c44':dx>0.5?'#1e2026':'#2b2d34');                     // dark jacket
    for(const s of [-1,1]) ln(48+s*4,92,48+s*16,120,'#16171c');                                   // lapels
    ell(48,100,9,10,(dx,dy)=>dy<-0.2?'#e8e8e2':(Math.abs(dx)<0.3?'#c8c8c0':'#d8d8d0'));           // white shirt, open collar
    ln(44,92,40,100,'#b0b0a8'); ln(52,92,56,100,'#b0b0a8');
  }
  // ---- neck: a fighter's, thick, the cords standing out
  rect(36,78,24,18,SK[2]); rect(36,78,5,18,SK[1]); rect(53,78,7,18,SK[3]); ln(42,82,45,95,SK[3]); ln(54,82,51,95,SK[4]);
  ell(48,93,9,3,()=>SK[3]); ell(48,84,15,4,()=>SK[3]);                                            // the pit of the throat, the jaw's shadow
  for(let y=81;y<=88;y++) for(let x=38;x<=58;x++) if(((x*3+y*5)%7)<1) px(x,y,'#9a6a54');          // stubble down the throat
  // ---- the head: broad and square, a heavy jaw
  const CY=54, RY=31;
  const halfW=(/** @type {number} */ y)=>{ const v=(y-CY)/RY; if(v<-1||v>1) return -1;
    if(v<0) return 22.5*Math.pow(1-Math.pow(-v,2.3),1/2.3);                                          // a full, broad crown
    if(v<0.42) return 22.5-v*2;
    if(v<0.88) return 21.7-(v-0.42)/0.46*10.2;                                                       // jaw angle down to the chin
    return 11.5*Math.sqrt(1-((v-0.88)/0.12)**2); };
  const inHead=(/** @type {number} */ x,/** @type {number} */ y)=>Math.abs(x-48)<=halfW(y);
  ell(23,55,3.5,7.5,(dx)=>dx<0?SK[2]:SK[3]); ell(73,55,3.5,7.5,(dx)=>dx>0?SK[3]:SK[2]);              // ears, out from the cropped sides
  ln(23,51,22,58,SK[3]); ln(73,51,74,58,SK[4]);
  for(let y=CY-RY;y<=CY+RY;y++) for(let x=24;x<=72;x++){ if(!inHead(x,y)) continue; const d=(x-48)/halfW(y), v=(y-CY)/RY;
    let c=SK[1]; if(d<-0.45) c=SK[0]; else if(d>0.22) c=SK[2]; if(d>0.7) c=SK[3];                 // lit from the left, the right half falls into shadow
    if(v<-0.3&&Math.abs(d)>0.75) c=d<0?SK[1]:SK[3]; if(v>0.72&&d>0) c=SK[2]; if(v>0.86&&d>0.15) c=SK[3]; px(x,y,c); }
  for(let y=CY-RY;y<=CY+RY;y++) for(let x=24;x<=72;x++){ if(!inHead(x,y)) continue; if(!inHead(x-1,y)||!inHead(x+1,y)||!inHead(x,y-1)||!inHead(x,y+1)) px(x,y,OUT); }
  // cheekbones and the hollows under them
  ell(35,60,6.5,2.5,(dx,dy)=>dy<0&&dx>-0.5?SK[0]:null); ell(61,60,5.5,2,(dx,dy)=>dy<0&&dx<0.3?SK[1]:null);
  for(const s of [-1,1]) ell(48+s*15,68,3,5,(dx)=>dx*s>0.2?SK[3]:null);
  // a lined forehead
  for(let x=38;x<=58;x++){ if(x%6) px(x,37+(Math.abs(x-48)>6?1:0),SK[2]); if(x>40&&x<56&&x%5) px(x,40,SK[2]); }
  // stubble, greying: an even grain over the jaw, chin and upper lip (drawn before the features)
  for(let y=64;y<=CY+RY;y++) for(let x=25;x<=71;x++){ if(!inHead(x,y)||!inHead(x,y+1)) continue;
    const ax=Math.abs(x-48), lip=y>=70&&y<=73&&ax<10, jaw=y>=74||ax>14; if(!lip&&!jaw) continue; if(y>=74&&y<=78&&ax<9) continue;
    const k=((x*5+y*3)%6); if(k<2) px(x,y,'#8a6a58'); else if(k===2&&rnd()<0.6) px(x,y,'#6e5244'); else if(k===3&&rnd()<0.25) px(x,y,'#a8968a'); }
  // deep sockets under a heavy brow ridge; the frown digs two lines between the brows
  for(const cx of [38,58]) ell(cx,50,8,3.4,(dx,dy)=>dy<0.3?SK[3]:SK[2]);
  ln(46,43,46,48,SK[3]); ln(50,43,50,48,SK[3]); px(48,45,SK[0]); px(48,46,SK[0]);
  // brows: thick, low and straight, pulled down at the inner ends into a scowl
  for(let x=29;x<=45;x++){ const y=44+Math.round((x-29)*0.19); px(x,y,HR[4]); px(x,y-1,HR[3]); if(x>32) px(x,y+1,HR[4]); }
  for(let x=51;x<=67;x++){ const y=47-Math.round((x-51)*0.19); px(x,y,HR[4]); px(x,y-1,HR[3]); if(x<64) px(x,y+1,HR[4]); }
  // narrow, hooded eyes: the lid sits on the iris, a cold grey stare, the lower lid flat
  for(const [cx,s] of [[38,-1],[58,1]]){
    ell(cx,51.5,4.5,1.6,(dx)=>Math.abs(dx)<0.4?'#56666f':s>0?'#9a8a80':'#b4a49a');                // whites dim in the sockets' shadow
    for(let x=cx-5;x<=cx+5;x++){ px(x,50,'#2a1810'); px(x,49,SK[4]); } px(cx-5*s,51,'#2a1810');       // the heavy upper lid
    px(cx,51,'#101010'); px(cx-1,51,'#3e4c55'); px(cx+s,52,'#8a9aa2');                            // pupil, iris shading, a dull glint
    for(let x=cx-4;x<=cx+4;x++) px(x,53,SK[2]); for(let x=cx-2;x<=cx+2;x++) px(x,55,SK[2]);
  }
  // a broad nose, the bridge flattened by old fights
  for(let y=51;y<=63;y++){ px(45,y,SK[0]); px(51,y,y<57?SK[2]:SK[3]); }
  for(let x=46;x<=50;x++) px(x,57,SK[0]); px(52,58,SK[3]);
  ell(48,66,6,3,(dx,dy)=>dy>0.25?SK[3]:dx<-0.3?SK[0]:SK[1]);
  ell(42.5,67,2.5,2,()=>SK[2]); ell(53.5,67,2.5,2,()=>SK[3]); px(44,68,OUT); px(45,68,OUT); px(51,68,OUT); px(52,68,OUT);
  for(let x=44;x<=52;x++) px(x,69,SK[3]);
  if(o.hurt){ ell(60,60,5,3,()=>(rnd()<(o.hurt||0)*0.8)?'#9a6070':null); }
  // deep folds from the nose, a thin mouth pressed shut, its corners down; a cleft in the square chin
  ln(41,68,37,78,SK[3]); ln(55,68,59,78,SK[4]);
  for(let x=42;x<=54;x++) px(x,74,'#8a5444'); for(let x=40;x<=56;x++) px(x,75+(x<42||x>54?1:0),'#4e281e');
  for(let x=43;x<=53;x++) px(x,76,SK[2]); for(let x=45;x<=51;x++) px(x,78,SK[3]); px(48,82,SK[3]); px(48,83,SK[3]);
  paintWounds(o.wounds||[]);
  // ---- hair: cropped short and wet, clumped into points along the line; it goes back at the temples
  // and greys there, the sides run down short over the ears
  const hl=(/** @type {number} */ ad)=>ad<7?33-ad*0.3:ad<15?31-(ad-7)*0.4:28+(ad-15)*2.4;            // the hairline
  const capW=(/** @type {number} */ y)=>{ const v=(y-CY)/(RY+3); return v<-1?-1:v<0?24.5*Math.pow(1-Math.pow(-v,2.3),1/2.3):23.8; };
  const topY=(/** @type {number} */ x)=>{ let y=CY-RY-3; while(y<50&&Math.abs(x-48)>capW(y)) y++; return y; };
  for(let y=CY-RY-3;y<=50;y++) for(let x=21;x<=75;x++){
    const ad=Math.abs(x-48); if(ad>capW(y)||y>=hl(ad)) continue;
    const n=(x*7+y*3)%5, side=ad>18;
    let c=x>58?(x>66?HR[4]:HR[3]):HR[2];
    if(y<CY-RY+5&&x>30&&x<54&&n>2) c=HR[1];                                                        // wet shine on the crown
    if(side){ c=n===1?(x<48?SK[2]:SK[3]):n===0?'#9a948a':x<48?HR[3]:HR[4]; }                       // the sides cropped to the scalp, grey at the temples
    if(y===topY(x)||Math.abs(x-49)>capW(y)||Math.abs(x-47)>capW(y)) c=OUT;
    px(x,y,c);
  }
  for(let y=CY-RY;y<=36;y+=3) for(let x=27+(y%2)*2;x<=69;x+=4){ const ad=Math.abs(x-48), s=x<48?-1:1; if(ad>capW(y)-2||y+2>=hl(ad)||ad>18) continue;
    ln(x,y,x+s,y+2,x>58?HR[4]:HR[3]); if(x<56) px(x-s,y,(x+y)%3?HR[1]:HR[0]); }                    // wet clumps lying forward
  for(let x=24;x<=72;x++){ const ad=Math.abs(x-48); if(x%3===0&&ad<16){ const y=Math.floor(hl(ad)); px(x,y,HR[3]); if(x%2) px(x,y+1,HR[4]); } }   // points along the hairline
  for(let x=27;x<=69;x+=3){ const y=topY(x); px(x,y-1,OUT); }                                    // a ragged crop on top
  if(o.wounds?.includes('concussion')){   // a dirty bandage round the head, a brown stain over the temple
    for(let x=21;x<=75;x++){ const y=Math.round(36+Math.pow((x-48)/27,2)*5); for(let k=0;k<4;k++) px(x,y+k,k===0?'#bfb497':(x+k)%7===0?'#a89c80':'#d8cfb4'); }
    ell(64,40,4,2.2,()=>rnd()<0.8?'#7a3a26':null);
  }
  return cv;
  /** Lasting injuries on the face (under the hair). @param {string[]} w */
  function paintWounds(w){
    const BR=['#7a3a5a','#5a2a4a','#3e1e36'];
    for(const [id,cx] of /** @type {[string,number][]} */ ([['eyeR',38],['eyeL',58]])) if(w.includes(id)){   // his left eye is on our right
      ell(cx,53,8.5,5.5,(dx,dy)=>{ const r=dx*dx+dy*dy; return r>0.55?(rnd()<0.85?BR[r>0.85?0:1]:null):null; });
      ell(cx,50.5,6.5,2.6,(dx,dy)=>dy>-0.2?BR[0]:BR[1]);                                            // the lid swollen half shut
      for(let x=cx-4;x<=cx+4;x++) px(x,53,BR[2]);
    }
    if(w.includes('nose')){
      for(let y=52;y<=67;y++){ const off=y>58?1:0; px(46+off,y,SK[2]); px(50+off,y,SK[3]); }                  // the bridge bent to one side
      rect(43,57,10,3,'#e2d8bc'); ln(43,57,52,57,'#c8bc9c'); px(43,59,'#b0a484'); px(52,59,'#b0a484');       // sticking plaster
      for(const cx of [40,56]) ell(cx,59,4,1.5,()=>rnd()<0.6?BR[0]:null);                                   // bruising under both eyes
      px(47,70,'#7a1e18'); px(47,71,'#a52a20');
    }
    if(w.includes('scar')){ ln(54,44,60,46,'#5a1a14'); ln(54,45,60,47,'#8a2a1e'); for(let x=55;x<=59;x+=2) px(x,44,'#b07a62'); }   // a scab over the right brow
  }
}
