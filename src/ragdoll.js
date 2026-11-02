/* The Verlet ragdoll shared by the fight (iso-fight.js) and the background life of the port (port-life.js). Pure: no renderer, no audio,
 * no fighter. A body is 12 nodes in room space (i, j in tiles, z in body units) joined by the bones it stood with; gravity pulls them
 * onto the floor and the caller's `blocked` keeps them out of walls and furniture.
 * Nodes: 0 pelvis, 1 chest, 2 head, 3 knee, 4 foot, 5 knee, 6 foot, 7 elbow, 8 hand, 9 elbow, 10 hand, 11 belly (the middle of the spine:
 * the torso folds there; 3-4 and 7-8 are side +1). */

/** Bone pairs; the last three only push apart (spine-head, knees, a spine folded double). */
export const RD_PAIRS=[[0,11],[11,1],[1,2],[0,3],[3,4],[0,5],[5,6],[1,7],[7,8],[1,9],[9,10],[0,2],[3,5],[0,1]];
export const RD_SOFT=11, RD_SOFT_MIN=[0.85,0.85,0.55];
export const RD_RAD=[1.4,1.6,1.5,0.9,0.8,0.9,0.8,0.8,0.7,0.8,0.7,1.5];
export const RD_GRAV=0.07;

/** @typedef {{i:number,j:number,z:number,pi:number,pj:number,pz:number}} RdNode */
/** @typedef {{nodes:RdNode[],len:number[],thud:boolean,steps?:number}} Ragdoll */

/** Bone lengths of a standing pose, from its 12 joints in body coordinates.
 * @param {number[][]} loc */
export function ragdollLengths(loc){
  return RD_PAIRS.map(([p,q],k)=>{ const d=Math.hypot(loc[q][0]-loc[p][0],loc[q][1]-loc[p][1],loc[q][2]-loc[p][2]); return k>=RD_SOFT?d*RD_SOFT_MIN[k-RD_SOFT]:d; });
}

/** One 60 Hz step. blocked(i,j,z) tells whether a node stands in something solid; onThud(vz) fires once, at the chest's first heavy landing.
 * @param {Ragdoll} rd @param {{blocked:(i:number,j:number,z:number)=>boolean,onThud?:(vz:number)=>void}} env */
export function stepRagdoll(rd,env){
  const N=rd.nodes, L=rd.len;
  for(const n of N){ const vi=(n.i-n.pi)*0.97, vj=(n.j-n.pj)*0.97, vz=(n.z-n.pz)*0.97-RD_GRAV; n.pi=n.i; n.pj=n.j; n.pz=n.z; n.i+=vi; n.j+=vj; n.z+=vz; }
  for(let it=0;it<4;it++){
    for(let b=0;b<RD_PAIRS.length;b++){
      const A=N[RD_PAIRS[b][0]], B=N[RD_PAIRS[b][1]], dx=(B.i-A.i)*7.5, dy=(B.j-A.j)*7.5, dz=B.z-A.z, d=Math.hypot(dx,dy,dz)||1e-4;
      if(b>=RD_SOFT&&d>=L[b]) continue;
      const k=(L[b]-d)/d*0.5;
      A.i-=dx*k/7.5; A.j-=dy*k/7.5; A.z-=dz*k; B.i+=dx*k/7.5; B.j+=dy*k/7.5; B.z+=dz*k;
    }
    for(const [h,kn,ft] of [[0,3,4],[0,5,6]]){ const zm=Math.max(N[h].z,N[ft].z)+1.4; if(N[kn].z>zm) N[kn].z=zm; }   // a knee never folds high above the hip and foot
    for(let k=0;k<N.length;k++){
      const n=N[k];
      if(n.z<RD_RAD[k]){
        const vz=n.z-n.pz, vi=n.i-n.pi, vj=n.j-n.pj;
        n.z=RD_RAD[k]; n.pz=n.z+vz*0.2; n.pi=n.i-vi*0.76; n.pj=n.j-vj*0.76;
        if(!rd.thud&&k===1&&vz<-0.45){ rd.thud=true; env.onThud?.(vz); }
      }
      if(env.blocked(n.i,n.j,n.z)){ if(!env.blocked(n.pi,n.pj,n.pz)){ n.i=n.pi; n.j=n.pj; } else { n.pi=n.i; n.pj=n.j; } }
    }
  }
}

/** The nodes as joints in the body coordinates figureHD draws, relative to a frame {i,j,fi,fj}; the hip and shoulder lines follow the spine.
 * @param {RdNode[]} N @param {{i:number,j:number,fi:number,fj:number}} F @param {number} hipHalf @param {number} shoulderHalf */
export function ragdollJointsIn(N,F,hipHalf,shoulderHalf){
  const loc=(/** @type {RdNode} */ n)=>{ const di=(n.i-F.i)*7.5, dj=(n.j-F.j)*7.5; return [di*F.fi+dj*F.fj,di*-F.fj+dj*F.fi,n.z]; };
  const pel=loc(N[0]), chest=loc(N[1]), head=loc(N[2]);
  let ux=chest[0]-pel[0], uy=chest[1]-pel[1], uz=chest[2]-pel[2]; const ul=Math.hypot(ux,uy,uz)||1; ux/=ul; uy/=ul; uz/=ul;
  let sx=-uy*ux, sy=1-uy*uy, sz=-uy*uz, sl=Math.hypot(sx,sy,sz); if(sl<0.2){ sx=1-ux*ux; sy=-ux*uy; sz=-ux*uz; sl=Math.hypot(sx,sy,sz)||1; } sx/=sl; sy/=sl; sz/=sl;   // the body's side made square to the spine
  const at=(/** @type {number[]} */ o,/** @type {number} */ k)=>[o[0]+sx*k,o[1]+sy*k,o[2]+sz*k];
  const side=(/** @type {number} */ s,/** @type {number} */ kn,/** @type {number} */ ft,/** @type {number} */ el,/** @type {number} */ hd)=>({hip:at(pel,s*hipHalf),knee:loc(N[kn]),foot:loc(N[ft]),sh:at(chest,s*shoulderHalf),el:loc(N[el]),hd:loc(N[hd])});
  const J={1:side(1,3,4,7,8),'-1':side(-1,5,6,9,10)}, f=(/** @type {number} */ s)=>J[s];
  f.pel=pel; f.chest=chest; f.head=head; f.abd=loc(N[11]); f.belly=f.abd;
  return f;
}
