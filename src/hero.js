/* The hero: the one main character of the game. His head is fixed (data.HERO_LOOK, the in-game head layers 'fringe'
   and 'cut' in boxing.js); this module paints his portrait for the character sheet — a pixel-art bust, 96×120:
   straight ash-brown hair with a fringe down to the brows, tired, wet eyes, a fresh cut across the bridge of the
   nose, stubble. In prison he wears the blue drelich, on the outside a dark jacket over a white shirt. */

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
  // ---- neck
  rect(38,80,20,16,SK[2]); rect(38,80,5,16,SK[1]); rect(52,80,6,16,SK[3]); ln(43,84,44,95,SK[3]);
  ell(48,93,9,3,()=>SK[3]);
  for(let y=82;y<=92;y++) for(let x=39;x<=57;x++) if(((x*3+y*5)%7)<2) px(x,y,'#b07a62');           // stubble down the throat
  // ---- the head: long and lean, an angular jaw
  const CY=53, RY=32;
  const inHead=(/** @type {number} */ x,/** @type {number} */ y)=>{ const dy=(y-CY)/RY; if(dy<-1||dy>1) return false;
    const w=22-Math.max(0,dy)*Math.max(0,dy)*8-(dy>0.62?(dy-0.62)*8:0); const dx=(x-48)/w; return dx*dx+dy*dy<=1; };
  ell(25,56,3.5,7,(dx)=>dx<0?SK[2]:SK[3]); ell(71,56,3.5,7,(dx)=>dx>0?SK[3]:SK[2]);                  // ears (mostly under the hair)
  for(let y=CY-RY;y<=CY+RY;y++) for(let x=24;x<=72;x++){ if(!inHead(x,y)) continue; const d=(x-48)/22, v=(y-CY)/RY;
    let c=SK[1]; if(d<-0.5) c=SK[0]; else if(d>0.45) c=SK[2]; if(d>0.8) c=SK[3]; if(v>0.72&&d>0.05) c=SK[2]; if(v>0.85&&d>0.2) c=SK[3]; px(x,y,c); }
  for(let y=CY-RY;y<=CY+RY;y++) for(let x=24;x<=72;x++){ if(!inHead(x,y)) continue; if(!inHead(x-1,y)||!inHead(x+1,y)||!inHead(x,y-1)||!inHead(x,y+1)) px(x,y,OUT); }
  // cheekbones and the hollows under them
  for(const s of [-1,1]){ ell(48+s*13,61,6,2.5,(dx,dy)=>dy<0&&dx*s<0.5?SK[0]:null); ell(48+s*15,68,4,6,(dx)=>dx*s>0.1?SK[3]:SK[2]); }
  // stubble: an even dark grain over the jaw, chin and upper lip (drawn before the features)
  for(let y=66;y<=CY+RY;y++) for(let x=25;x<=71;x++){ if(!inHead(x,y)||!inHead(x,y+1)) continue;
    const lip=y>=70&&y<=72&&Math.abs(x-48)<8, jaw=y>=72||Math.abs(x-48)>13; if(!lip&&!jaw) continue; if(y>=75&&y<=78&&Math.abs(x-48)<6) continue;
    const k=((x*5+y*3)%6); if(k<2) px(x,y,'#9a6a54'); else if(k===2&&rnd()<0.5) px(x,y,'#7a5040'); }
  // tired eyes: almond lids, grey-blue irises, red wet lower rims, a tear on the right
  for(const [cx,s] of [[38,-1],[58,1]]){
    ell(cx,51,7,3.2,(dx,dy)=>dy<-0.45?SK[3]:null);                                                // the lid crease
    ell(cx,52.5,5.5,2.2,(dx,dy)=>{ const r=dx*dx+dy*dy; if(r>0.75) return '#3a2018'; if(Math.abs(dx)<0.4) return dy<0?'#55656f':'#7a8a94'; return '#e6dad0'; });
    px(cx,52,'#141414'); px(cx+s,51,'#f4f4f0');
    for(let x=cx-5;x<=cx+5;x++) px(x,55,'#c8786a');
    for(let x=cx-4;x<=cx+4;x++) px(x,57,SK[3]); for(let x=cx-3;x<=cx+3;x++) if(x&1) px(x,58,SK[2]);
  }
  px(62,56,'#e8f4fa'); px(62,57,'#b8d4e0'); px(63,59,'#d8ecf4');                                   // a tear
  // brows: drawn together, the inner ends raised
  for(let x=31;x<=44;x++){ const y=47-Math.round((x-31)*0.18); px(x,y,HR[4]); px(x,y-1,HR[3]); }
  for(let x=52;x<=65;x++){ const y=45+Math.round((x-52)*0.18); px(x,y,HR[4]); px(x,y-1,HR[3]); }
  px(46,48,SK[3]); px(47,49,SK[3]); px(50,48,SK[3]);
  // a long straight nose; a fresh cut across the bridge
  for(let y=52;y<=67;y++){ px(46,y,SK[0]); px(50,y,SK[2]); }
  ell(48,68,5,2.5,(dx,dy)=>dy>0.2?SK[3]:SK[1]); px(45,69,OUT); px(51,69,OUT);
  ln(45,56,51,52,'#7a1e18'); ln(46,56,51,53,'#b83a2c'); px(45,57,'#d8a090'); px(52,52,'#d8a090');   // the cut and its raw edges
  if(o.hurt){ ell(60,60,5,3,()=>(rnd()<(o.hurt||0)*0.8)?'#9a6070':null); }
  // folds from the nose to the mouth, a thin mouth turned down
  ln(42,70,39,77,SK[3]); ln(54,70,57,77,SK[3]);
  for(let x=41;x<=55;x++) px(x,76+(x<43||x>53?1:0),'#6a3a2e'); for(let x=43;x<=53;x++) px(x,77,SK[2]); for(let x=44;x<=52;x++) px(x,75,'#8a5a4a');
  paintWounds(o.wounds||[]);
  // ---- hair: straight and heavy, ash brown, a soft shine across the crown; the fringe falls to the brows,
  // parted above the right eye; the sides hang over the ears down to the jaw
  const PART=55;
  const crown=(/** @type {number} */ x)=>13+Math.pow(Math.abs(x-48)/26,2.2)*16;                    // the top of the hair mass
  const fringe=(/** @type {number} */ x)=>{ const s=((x*7)%5)*0.8+((x*3)%4)*0.6;                    // uneven strand ends, swept from the part to the left
    return x<PART?43+(PART-x)*0.12+s-(x<33?(33-x)*0.9:0):42+s*0.6-(x-PART)*0.35; };
  for(let x=19;x<=77;x++) for(let y=10;y<=72;y++){
    const side=x<29||x>67, inner=x>=29&&x<=67;
    if(y<crown(x)) continue;
    if(inner&&y>fringe(x)) continue;
    if(side){ const L=x<29, d=L?29-x:x-67, bottom=(L?73-d*0.8:70-d*1.0)+((x*5)%4), outer=L?20+Math.max(0,(y-42)*0.2):76-Math.max(0,(y-42)*0.2);
      if(y>bottom||(L?x<outer:x>outer)) continue; }
    // strands: vertical lines of light and dark, darker low and on the shaded side, a shine band on the crown
    const st=(x+Math.floor(y/9)*2)%4, shine=y>crown(x)+3&&y<crown(x)+9&&x<62;
    let c=st===0?HR[3]:st===1?HR[1]:HR[2];
    if(shine) c=st===0?HR[1]:HR[0];
    if(x>62&&st!==1) c=HR[3]; if(y>fringe(x)-2&&inner) c=HR[3];
    if(Math.abs(x-PART)<1&&y<crown(x)+12) c=SK[1];                                                // the parting
    px(x,y,c);
  }
  for(let x=19;x<=77;x++) px(x,Math.floor(crown(x))-1,OUT);
  for(let k=0;k<9;k++){ const x=32+rnd()*30, y=fringe(x)-1; ln(x,y,x+(rnd()<0.5?-1:1),y+2+rnd()*2,HR[3]); }   // loose strands over the brows
  for(const [x,y,l] of [[36,46,6],[40,47,5],[33,45,7]]) ln(x,y,x-2,y+l,k2(x));                                          // a few fall into the left eye
  function k2(/** @type {number} */ x){ return x&1?HR[2]:HR[3]; }
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
