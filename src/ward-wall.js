/* The Ward's back wall seen from the side (native 144×96): the vault black with soot, the peeled limewash, the barred window,
   the guard-bed on its trestles and the flags. Baked once behind the push-ups; unlit (the scene lights it itself). */

import { state as appearanceState, rgb, setRamp } from './appearance.js';
import { state as rendererState, taper, disc } from './renderer.js';
import { state as boxingState, h2, drawChar } from './boxing.js';
import { mix } from './cast.js';
import { vnoise, fbm } from './noise.js';

const C = /** @type {Record<string,any>} */ ({});
const WALL_FLOOR = 75;
/** @param {number} c @param {number} k */
const shade=(c,k)=>(0xff000000|(Math.min(255,((c>>16)&255)*k)<<16)|(Math.min(255,((c>>8)&255)*k)<<8)|Math.min(255,(c&255)*k))>>>0;
/** The tallow lamp on the Ward's wall, on the left. */
const LAMP = [16,31];

/** Stone flags in perspective from the wall line to the bottom of the picture. @param {number} x @param {number} y @param {number[]} P @param {number} J */
function flags(x,y,P,J){
  const dz=y-38, u=(x-72)/dz*7.5, rows=[75,77,80,84,89,95]; let row=0; while(row<rows.length-1&&y>=rows[row+1]) row++;
  const fu=u-Math.floor(u+(row&1)*0.5), gw=0.8/dz*7.5;
  let c=(rows.includes(y)||fu<gw)?J:P[h2(Math.floor(u+(row&1)*0.5)*5+1,row*11+2)%3];
  if(y<78) c=shade(c,0.7);
  return c;
}

/* ---------- the Ward ---------- */

/** The barred window high on the right: its embrasure, the opening and the bars. */
const WIN = {x0:95,x1:109,y0:11,y1:20};
/** Is (x, y) open sky between the bars of the window? @param {number} x @param {number} y */
const winSky=(x,y)=>x>=WIN.x0&&x<=WIN.x1&&y>=WIN.y0&&y<=WIN.y1&&(x-WIN.x0)%5!==2&&(x-WIN.x0)%5!==3&&y!==15;
/** The crack running down from the vault: its x at height y. @param {number} y */
const crackX=(y)=>58+(y-6)*0.18+5*(vnoise(y*0.16,5.3)-0.5)+1.5*(vnoise(y*0.6,8.1)-0.5);

/** Old limewash on the brick: how much of it is still on at (x, y) (peeled where < 0.47). @param {number} x @param {number} y */
const limeOn=(x,y)=>fbm(x*0.05+3.1,y*0.085+1.7)+0.16*vnoise(x*0.31,y*0.45+4)+0.06*vnoise(x*0.9,y*1.1+2)+0.07-Math.max(0,(y-30)*0.004);
/** One pixel of the Ward's back wall (unlit; the light falls on it per frame). @param {number} x @param {number} y */
function wardWall(x,y){
  const t=((x%48)/48-0.5)*2, arch=4+7*t*t; let c;
  if(y<arch-2) return mix(C.vault,C.soot,0.5+0.5*vnoise(x*0.2,y*0.4));                         // the vault, black with soot
  if(y<arch){ const r=Math.floor((x+(y&1)*2)/4); return ((x+(y&1)*2)%4===0)?C.joint:shade(C.stoneD,0.75+0.1*(h2(r,3)&3)); }   // the voussoirs of the arch
  if(y<42){
    const br=Math.floor((y-2)/3), bu=x+(br&1)*3, mort=((y-2)%3)===0||(bu%6)===0, L=limeOn(x,y);
    if(L>0.47){ c=mix(C.lime[0],C.lime[1],vnoise(x*0.14,y*0.21+9)); if(limeOn(x,y+1)<=0.47) c=mix(c,C.limeL,0.2); else if(limeOn(x,y-1)<=0.47) c=shade(c,0.8); }   // a lip where it flakes
    else { c=mort?C.mortar:C.brick[h2(Math.floor(bu/6),br)%3]; if(!mort&&((y-2)%3)===1) c=shade(c,1.08);
      if(limeOn(x,y-1)>0.47) c=shade(c,0.7); else if(mort) c=mix(c,C.limeD,0.25); }               // the lime overhang shades the brick under it
    const s=Math.max(0,0.8-(y-arch)/26)+0.75*vnoise(x*0.31+7,2.3)**3*Math.max(0,1-(y-arch)/36);    // soot from the vault and run down in streaks
    const plume=y<34?0.85*Math.exp(-(((x-17.5)/(1.6+(34-y)*0.3))**2))*Math.min(1,(34-y)/5):0;      // and black above the lamp
    c=mix(c,C.soot,Math.min(0.9,s+plume));
    if(x>=WIN.x0-3&&x<=WIN.x1+3&&y>21){ const r=vnoise(x*0.7,3.3); if(r>0.55) c=mix(c,C.rust,Math.min(0.55,(r-0.55)*2.4)*Math.max(0,1-(y-21)/16)); }   // rust bled from the bars
    const tide=31+5*fbm(x*0.07,9.3);                                                                 // rising damp, salt at its edge
    if(y>tide) c=mix(c,C.damp,0.3+0.3*vnoise(x*0.2,y*0.3)); else if(y>tide-1.2) c=mix(c,C.salt,0.35);
    if(y>arch+1&&y<40){ const cx=crackX(y); if(Math.abs(x-cx)<0.55) c=C.crack; else if(Math.abs(x-cx-1)<0.55) c=mix(c,C.limeL,0.25); }
    return c; }
  if(y<44) return y===42?mix(C.stoneT,C.soot,0.3*vnoise(x*0.2,1)):shade(C.stone,0.8);             // the string course
  if(y<58){ const row=Math.floor((y-44)/7), bx=Math.floor((x+row*11)/22), lx=(x+row*11)%22, ly=(y-44)%7;   // ashlar, chiselled
    if(ly===0||lx===0) return C.joint;
    c=C.ash[h2(bx,row)%3]; if(ly===1||lx===1) c=shade(c,1.12); else if(ly===6||lx===21) c=shade(c,0.78);
    c=mix(c,C.damp,0.25+0.35*vnoise(x*0.12,y*0.2+row));
    const wet=vnoise(x*0.45,7.7); if(wet>0.58) c=mix(c,C.wet,(wet-0.58)*2*Math.min(1,(y-44)/6));     // water run down from the tide
    if(y>51) c=mix(c,C.slime,Math.min(0.6,(y-51)*0.09*(0.6+0.8*vnoise(x*0.18,4.4))));
    return c; }
  if(y===58) return mix(C.bedH,C.bed,vnoise(x*0.3,2));                                               // the guard-bed: its worn edge,
  if(y===59) return C.bedK;
  if(y<67){ const j=(x+3)%23; if(j===0) return C.bedK; if(y===66) return shade(C.bedF,0.6);         //   the front board, grain and nails,
    c=mix(C.bedF,C.bed,0.35*vnoise(x*0.06,y*0.9+2)+0.15); if((j===2||j===21)&&(y===61||y===64)) c=C.nail;
    return c; }
  if(y<WALL_FLOOR) return ((x%22)<2)?shade(C.bedF,0.55):C.under;                                    //   black underneath, the trestles
  return flags(x,y,C.flag,C.fjoint);
}

/** The Ward's back wall into rendererState.fb. @param {boolean} [breathe] subtle expansion of the seated prisoner's chest. */
export function wardWallBg(breathe=false){
  const fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H;
  const px=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ if(x>=0&&x<w&&y>=0&&y<h) fb[y*w+x]=c; };
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) fb[y*w+x]=wardWall(x,y);
  for(let y=WIN.y0-3;y<=WIN.y1+3;y++) for(let x=WIN.x0-4;x<=WIN.x1+4;x++){                        // the window: a splayed reveal,
    const ex=Math.max(WIN.x0-x,x-WIN.x1,0), ey=Math.max(WIN.y0-y,y-WIN.y1,0); if(!ex&&!ey) continue;
    if(y>WIN.y1&&y<=WIN.y1+2) px(x,y,y===WIN.y1+1?C.stoneT:C.stone); else px(x,y,x<WIN.x0?shade(C.stone,0.95-ex*0.08):y<WIN.y0?shade(C.stoneD,0.9):shade(C.stoneD,0.7)); }
  for(let y=WIN.y0;y<=WIN.y1;y++) for(let x=WIN.x0;x<=WIN.x1;x++) px(x,y,winSky(x,y)?C.sky:((x-WIN.x0)%5===2||y===15)?C.ironH:C.iron);   //   bars over the smog
  for(let y=WIN.y0-1;y<=WIN.y1+1;y++) for(let x=WIN.x1+5;x<WIN.x1+11;x++){ const top=WIN.y0-1+Math.round((x-WIN.x1-5)*0.35);   //   the plank shutter swung open
    if(y<top||y>WIN.y1+1-Math.round((x-WIN.x1-5)*0.35)) continue; px(x,y,(x-WIN.x1)%3===0?C.bedK:(y===WIN.y0+2||y===WIN.y1-1)?C.iron:mix(C.bedF,C.bed,vnoise(x*0.5,y*0.3))); }
  for(const cx of [30,82]){ for(let a=0;a<6.28;a+=0.35) px(Math.round(cx+Math.cos(a)*2),Math.round(48+Math.sin(a)*2),a>3.5?C.ironH:C.iron);   // rings, chains down to the planks
    for(let y=50;y<58;y++){ px(cx+((y>>1)&1),y,(y&1)?C.ironH:C.iron); if(y&1) px(cx+((y>>1)&1)+1,y+1,shade(fb[(y+1)*w+cx+2]||C.iron,0.7)); } }
  for(const [x0,x1] of [[2,28],[50,74],[96,122]]) for(let x=x0;x<x1;x++){ const hump=1.6*Math.sin(Math.PI*(x-x0)/(x1-x0))+0.6*vnoise(x*0.4,3);   // straw pallets, sacking split
    for(let y=Math.round(57.4-hump);y<58;y++) px(x,y,mix(C.tickD,C.tick,vnoise(x*0.5,y*0.8))); }
  for(let s=0;s<26;s++){ const x=4+h2(s,41)%118, y=56+(h2(s,42)&1), dx=(h2(s,43)&1)?1:-1; if((x>27&&x<50)||(x>73&&x<96)) continue; px(x,y,C.straw); px(x+dx,y+1,shade(C.straw,0.75)); }   // straws poking out
  const scr=(/** @type {number} */ x0,/** @type {number} */ y0,/** @type {number} */ x1,/** @type {number} */ y1)=>{ const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));   // a line cut into the lime
    for(let i=0;i<=n;i++){ const x=Math.round(x0+(x1-x0)*i/n), y=Math.round(y0+(y1-y0)*i/n); px(x,y,mix(fb[y*w+x],C.scratch,0.55)); px(x,y+1,shade(fb[(y+1)*w+x],0.7)); } };
  scr(64,36,70,36); scr(66,36,66,25); scr(66,25,71,25); scr(66,28,68,26); scr(70,25,70,27);           // a gallows, the noose,
  for(let a=0;a<6.28;a+=0.6) px(Math.round(70+Math.cos(a)),Math.round(28.5+Math.sin(a)),mix(fb[Math.round(28.5+Math.sin(a))*w+Math.round(70+Math.cos(a))],C.scratch,0.5));
  scr(70,30,70,33); scr(70,31,69,32); scr(70,31,71,32);                                              //   a man hanging in it
  for(let g=0;g<4;g++){ const x0=24+g*7; for(let m=0;m<4;m++) scr(x0+m,34-(g&1),x0+m,37-(g&1)); scr(x0-1,37-(g&1),x0+4,34-(g&1)); }   // the days, five by five
  for(const [s,x,y] of [['1867',118,26],['J.M.',36,25]]) for(let k=0;k<s.length;k++) drawChar(s.charCodeAt(k),x+k*4,y,mix(C.scratch,C.limeD,0.6),1);
  for(let y=24;y<34;y++) px(LAMP[0],y+4,C.iron); for(let x=LAMP[0]-1;x<=LAMP[0]+3;x++) px(x,LAMP[1]+3,C.iron);   // the lamp's bracket
  for(let y=62;y<WALL_FLOOR+1;y++) for(let x=128;x<140;x++){ const e=x===128||x===139; px(x,y,e?C.bedK:((y===65||y===71)?C.iron:(x<132?C.bedF:C.bed))); }   // the night tub in the corner
  for(let x=118;x<144;x++){ const k=vnoise(x*0.3,6.6); if(k>0.4) px(x,WALL_FLOOR+1+(k>0.6?1:0),mix(C.flag[1],C.piss,Math.min(1,(k-0.4)*3))); }
  // Seated facing the room: one knee raised, the other leg hanging over the pallet.
  const slots=[appearanceState.R_PANTF,appearanceState.R_PANT,appearanceState.R_BOOTF,appearanceState.R_BOOT,appearanceState.R_SHIRTF,appearanceState.R_SHIRT,appearanceState.R_SKINF,appearanceState.R_SKIN,appearanceState.R_HAIR];
  const saved=slots.map(slot=>appearanceState.PAL.slice(slot*3,slot*3+3));
  const cloth=['#30352d','#464b3d','#5b604c'], skin=['#624b3d','#826552','#a0826a'], hair=['#171714','#292822','#3b3930'], boot=['#1b1c19','#292b26','#393b32'];
  for(const [slot,colors,far] of [[appearanceState.R_PANTF,cloth,true],[appearanceState.R_PANT,cloth,false],[appearanceState.R_SHIRTF,cloth,true],[appearanceState.R_SHIRT,cloth,false],[appearanceState.R_BOOTF,boot,true],[appearanceState.R_BOOT,boot,false],[appearanceState.R_SKINF,skin,true],[appearanceState.R_SKIN,skin,false],[appearanceState.R_HAIR,hair,false]]) setRamp(slot,colors,far);
  for(let pass=0;pass<2;pass++){
    taper(47,56,2.2,37,47,2.0,pass,appearanceState.R_PANTF,0,-9,-9,0);
    taper(37,47,2.0,38,61,1.6,pass,appearanceState.R_PANTF,0,-9,-9,0);
    taper(47,56,2.5,58,57,2.0,pass,appearanceState.R_PANT,0,-9,-9,0);
    taper(58,57,2.0,60,74,1.5,pass,appearanceState.R_PANT,0,-9,-9,0);
    taper(38,61,1.4,38,64,1.2,pass,appearanceState.R_BOOTF,0,-9,-9,0);
    taper(60,74,1.5,63,75,1.4,pass,appearanceState.R_BOOT,0,-9,-9,0);
    taper(47,55,3.2,43,43,breathe?4.0:3.6,pass,appearanceState.R_SHIRT,0,-9,-9,0);
    taper(41,43,2.2,36,45,1.5,pass,appearanceState.R_SHIRTF,0,-9,-9,0);
    taper(36,45,1.4,35,49,1.0,pass,appearanceState.R_SKINF,0,-9,-9,0);
    taper(45,43,2.2,52,50,1.5,pass,appearanceState.R_SHIRT,0,-9,-9,0);
    taper(52,50,1.4,59,55,1.0,pass,appearanceState.R_SKIN,0,-9,-9,0);
    taper(43,41,1.3,43,43,1.4,pass,appearanceState.R_SKIN,0,-9,-9,0);
    taper(43,37,2.8,43,40,2.2,pass,appearanceState.R_SKIN,0,-9,-9,0);
    taper(42,36,2.5,44,36,2.2,pass,appearanceState.R_HAIR,0,-9,-9,0);
  }
  px(40,35,rgb('#292822')); px(42,34,rgb('#393a30')); px(45,35,rgb('#292822'));
  px(41,37,rgb('#292822')); px(42,37,rgb('#292822')); px(42,38,rgb('#292822'));
  px(44,38,rgb('#292822')); px(44,40,rgb('#624b3d')); px(43,41,rgb('#a0826a'));
  for(let i=0;i<slots.length;i++) appearanceState.PAL.set(saved[i],slots[i]*3);
  // the light: the tallow lamp's warm glow on the left, the window's cold slanting shaft with the bars' shadows, a vignette, Bayer-dithered
  const BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5], warm=rgb('#ff9e44'), cold=rgb('#b8c4bc');
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    if(winSky(x,y)) continue;
    const i=y*w+x, b=(BAY[(y&3)*4+(x&3)]-7.5)/255, dxL=x-LAMP[0], dyL=(y-LAMP[1])*1.15, lamp=0.68/(1+(dxL*dxL+dyL*dyL)/520);
    const wx=x+(y-WIN.y1)*0.55, inBeam=y>=WIN.y0&&wx>=WIN.x0-2&&wx<=WIN.x1+2;
    const barSh=inBeam&&((Math.floor(wx-WIN.x0)%5===2)||Math.abs(y-15-(x-wx)*0.2)<0.8)?0.52:1;
    const shaft=y>=WIN.y1?Math.exp(-((wx-102)**2)/(54+(y-WIN.y0)*1.6))*Math.max(0,1-(y-WIN.y0)/88)*barSh:0;
    const vig=Math.max(0.42,1-Math.hypot((x-64)/92,(y-52)/68)*0.48), k=Math.max(0.28,Math.min(1.45,(0.52+lamp+shaft*0.42)*vig+b*0.6));
    let c=shade(fb[i],k);
    if(lamp>0.08) c=mix(c,warm,Math.min(0.28,lamp*0.32));
    if(shaft>0.06) c=mix(c,cold,Math.min(0.24,shaft*0.35));
    fb[i]=c;
  }
}

/** The living layer of the wall (every frame): the lamp's flame and its smoke, dust turning in the window's shaft, and the exerciser's breath.
 * @param {number} bx @param {number} by @param {number} burn */
export function drawWardWallLive(bx,by,burn){
  const fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, t=boxingState.tick;
  const put=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c,/** @type {number} */ a)=>{ x|=0; y|=0; if(x<0||y<0||x>=w||y>=h) return; fb[y*w+x]=a>=1?c:mix(fb[y*w+x],c,a); };
  const lx=LAMP[0]+1, ly=LAMP[1]+2, fl=(h2(t>>2,5)%3)-1, fh=2+(h2(t>>2,9)&1);
  for(let dx=-2;dx<=2;dx++) put(lx+dx,ly+1,LIVE.iron,1);
  for(let k=0;k<fh;k++){ const sx=lx+(k>0?fl:0); put(sx,ly-k,k===0?LIVE.core:LIVE.flame,1); put(sx+(k&1?1:-1),ly-k,LIVE.edge,0.65); }
  const pulse=0.12+0.04*Math.sin(t*0.23);
  for(let dy=-6;dy<=6;dy++) for(let dx=-7;dx<=7;dx++){ const d=Math.hypot(dx,dy*1.2)/7; if(d<1) put(lx+dx,ly-1+dy,LIVE.glow,pulse*(1-d)*(1-d)); }
  for(let k=0;k<5;k++){ const f=((t*0.015+k/5)%1), sx=lx+Math.sin(t*0.04+k*1.7)*f*3, sy=ly-fh-f*14; if(f<0.85) put(sx,sy,LIVE.smoke,0.45*(1-f)); }
  for(let k=0;k<9;k++){   // motes in the shaft
    const my=14+((h2(k,11)+t*0.12*(0.7+(k&3)*0.15))%62), mx=102-(my-20)*0.55+Math.sin(t*0.02+k*2.1)*6+(h2(k,17)%9)-4;
    if(((mx+my+t)&1)===0) put(mx,my,LIVE.dust,0.35*(1-my/84));
  }
  const period=Math.max(36,Math.round(78-burn*36)), ph=t%period;   // a breath in the cold of the cell, quicker as he tires
  if(ph<24&&bx>0){
    const u=ph/24, cx=bx+u*4, cy=by+1-u*2.5, r=1.2+u*2.2;
    for(let dy=-2;dy<=2;dy++) for(let dx=-3;dx<=3;dx++){ const d=Math.hypot(dx*0.8,dy)/r; if(d<1&&((dx+dy+t)&1)) put(cx+dx,cy+dy,LIVE.breath,0.28*(1-u)*(1-d)); }
  }
}
/** Colours of the living layer, set by initialize(). */
const LIVE=/** @type {Record<string,number>} */ ({});


export function initialize(){
  Object.assign(LIVE,{iron:rgb('#2a2622'),core:rgb('#fff2b8'),flame:rgb('#ff9c38'),edge:rgb('#c84a18'),glow:rgb('#ffb052'),smoke:rgb('#24201c'),dust:rgb('#d4d8c8'),breath:rgb('#c8ccc2')});
  Object.assign(C,{vault:rgb('#0a0908'),stone:rgb('#5e5646'),stoneD:rgb('#3e382e'),stoneT:rgb('#766c58'),joint:rgb('#1e1b16'),
    brick:[rgb('#4a2e24'),rgb('#3e261e'),rgb('#54362a')],mortar:rgb('#2a2420'),lime:[rgb('#7e7864'),rgb('#6a6452')],soot:rgb('#121010'),damp:rgb('#2e342a'),slime:rgb('#26301e'),
    ash:[rgb('#6a5d48'),rgb('#5a4f3d'),rgb('#7a6c54')],bed:rgb('#4e3c28'),bedH:rgb('#62503a'),bedF:rgb('#3a2c1c'),bedK:rgb('#1c150e'),under:rgb('#0e0a06'),
    tick:rgb('#5e5844'),tickD:rgb('#4a4434'),iron:rgb('#1c1c1e'),ironH:rgb('#3a3a3e'),scratch:rgb('#857e69'),piss:rgb('#5a5626'),
    flag:[rgb('#4a4640'),rgb('#423e38'),rgb('#3a3731')],fjoint:rgb('#1e1c19'),salt:rgb('#7a766a'),rust:rgb('#5a3420'),wet:rgb('#1c1e1c'),
    limeL:rgb('#a29c86'),limeD:rgb('#4e4a3e'),crack:rgb('#0c0a08'),nail:rgb('#14100c'),straw:rgb('#7a6e48'),sky:rgb('#a8ae9e')});
}
