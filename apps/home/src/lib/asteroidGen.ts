// @ts-nocheck
/**
 * EVE Frontier composite (voxel) asteroid generator, ported from the client's
 * spacecomponents.common.components.compositeasteroid and verified voxel-for-voxel
 * against it (see tools/asteroid-lab/verify). Kept in sync with packages/assets/tools/asteroid-lab.html.
 */
export type Material = 'iridosmine' | 'ptpd' | 'sulfide' | 'feldspar' | 'methane' | 'kerogen' | 'tholin' | 'aromatic';
export interface ProfileMaterial { material: Material; weight: number; morphology: 'massive' | 'disseminated' | 'vein' | 'nodular'; self_affinity?: number }
export interface Profile { layers: { depthLo: number; depthHi?: number; materials: ProfileMaterial[] }[] }
export interface GridParams { archetype: string; dim: number; radius: number; noise: number; seed: number; profile?: Profile | null; prefix?: string }
/** [dx, dy, dz, material, depth] */
export type Cell = [number, number, number, string, number];

// ===================== Python-compatible random.Random (MT19937) =====================
export class PyRandom {
  constructor(seed){ this.mt = new Uint32Array(624); this.idx = 624; this.seed(seed); }
  initGenrand(s){ const mt=this.mt; mt[0]=s>>>0; for(let i=1;i<624;i++){ const p=mt[i-1]^(mt[i-1]>>>30); mt[i]=(Math.imul(1812433253,p)+i)>>>0; } }
  initByArray(key){ this.initGenrand(19650218); const mt=this.mt, n=624; let i=1,j=0,k=Math.max(n,key.length);
    for(;k;k--){ const p=mt[i-1]^(mt[i-1]>>>30); mt[i]=((mt[i]^Math.imul(p,1664525))+key[j]+j)>>>0; i++; j++; if(i>=n){mt[0]=mt[n-1]; i=1;} if(j>=key.length) j=0; }
    for(k=n-1;k;k--){ const p=mt[i-1]^(mt[i-1]>>>30); mt[i]=((mt[i]^Math.imul(p,1566083941))-i)>>>0; i++; if(i>=n){mt[0]=mt[n-1]; i=1;} }
    mt[0]=0x80000000; this.idx=624; }
  seed(n){ let b=BigInt(n); if(b<0n) b=-b; const key=[]; if(b===0n) key.push(0); while(b>0n){ key.push(Number(b&0xffffffffn)); b>>=32n; } this.initByArray(key); }
  genrand(){ const mt=this.mt; if(this.idx>=624){ for(let i=0;i<624;i++){ const y=(mt[i]&0x80000000)|(mt[(i+1)%624]&0x7fffffff); mt[i]=mt[(i+397)%624]^(y>>>1)^((y&1)?0x9908b0df:0); } this.idx=0; }
    let y=mt[this.idx++]; y^=y>>>11; y^=(y<<7)&0x9d2c5680; y^=(y<<15)&0xefc60000; y^=y>>>18; return y>>>0; }
  random(){ const a=this.genrand()>>>5, b=this.genrand()>>>6; return (a*67108864+b)/9007199254740992; }
  getrandbits(k){ return k===0?0:(this.genrand()>>>(32-k)); }
  randbelow(n){ const k=32-Math.clz32(n); let r=this.getrandbits(k); while(r>=n) r=this.getrandbits(k); return r; }
  uniform(a,b){ return a+(b-a)*this.random(); }
  randint(a,b){ return a+this.randbelow(b-a+1); }
  randrange(n){ return this.randbelow(n); }
  choice(seq){ return seq[this.randbelow(seq.length)]; }
  shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=this.randbelow(i+1); const t=a[i]; a[i]=a[j]; a[j]=t; } }
}
function pyround(x){ const f=Math.floor(x); if(x-f===0.5) return (f%2===0)?f:f+1; return Math.round(x); }

// ===================== Generator (port of spacecomponents.common.components.compositeasteroid) =====================
const JITTER=0.03, TWO_PI=2*Math.PI, ELONG_SALT=2654435769n, RUBBLE_SALT=2246822507n, RUBBLE_SMOOTH=0.15, WALL_HALF=2.0, VEIN_WIND=0.55;
const PREFIX_SALT={shocked:1001, deep:2002, core:3003, prime:4004, hollow:5005};
const WALL_MATERIALS=['feldspar','sulfide','iridosmine','methane','ptpd','kerogen','tholin','aromatic'];
export const MATERIAL_COLOR={iridosmine:[1,1,1], ptpd:[0.35,0.55,1], sulfide:[1,0.85,0], feldspar:[1,0.35,0.75], methane:[0,0.9,1], kerogen:[0.35,0.95,0.2], tholin:[1,0.4,0.05], aromatic:[0.7,0.15,1]};

function vhash(ix,iy,iz,seed){
  let h=(Math.imul(ix,73856093)^Math.imul(iy,19349663)^Math.imul(iz,83492791)^Math.imul(seed|0,2654435761|0))>>>0;
  h=Math.imul(h^(h>>>15),2246822519|0)>>>0;
  h=Math.imul(h^(h>>>13),3266489917|0)>>>0;
  h=((h^(h>>>16))&16777215);
  return h/16777215;
}
function vnoise(x,y,z,seed){
  const ix=Math.floor(x), iy=Math.floor(y), iz=Math.floor(z);
  const fx=x-ix, fy=y-iy, fz=z-iz;
  const ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy), uz=fz*fz*(3-2*fz);
  const c000=vhash(ix,iy,iz,seed), c100=vhash(ix+1,iy,iz,seed), c010=vhash(ix,iy+1,iz,seed), c110=vhash(ix+1,iy+1,iz,seed);
  const c001=vhash(ix,iy,iz+1,seed), c101=vhash(ix+1,iy,iz+1,seed), c011=vhash(ix,iy+1,iz+1,seed), c111=vhash(ix+1,iy+1,iz+1,seed);
  const x00=c000+(c100-c000)*ux, x10=c010+(c110-c010)*ux, x01=c001+(c101-c001)*ux, x11=c011+(c111-c011)*ux;
  const y0=x00+(x10-x00)*uy, y1=x01+(x11-x01)*uy;
  return y0+(y1-y0)*uz;
}
function fbm3(x,y,z,seed){ let amp=0.5,tot=0,nrm=0; for(let o=0;o<3;o++){ tot+=amp*vnoise(x,y,z,(seed+o*101)|0); nrm+=amp; x*=2;y*=2;z*=2; amp*=0.5; } return tot/nrm; }
function nameSalt(name){ let h=2166136261; for(const b of new TextEncoder().encode(name)){ h=Math.imul(h^b,16777619)>>>0; } return h>>>0; }

// composition rules (no profile)
function compDifferentiated(depth){ for(const [k,lo] of [['iridosmine',0.82],['ptpd',0.64],['sulfide',0.5],['feldspar',0.38],['methane',0.28],['kerogen',0.18],['tholin',0.06]]) if(depth>=lo) return k; return 'aromatic'; }
function compDtype(depth){ return depth>=0.55?'methane':depth>=0.32?'kerogen':depth>=0.1?'tholin':'aromatic'; }
function compChondrite(depth,rng){ if(depth<0.06) return 'aromatic'; const x=rng.random(); return x<0.12?'feldspar':x<0.2?'kerogen':'sulfide'; }
function compWall(depth,rng){ return WALL_MATERIALS[rng.randrange(WALL_MATERIALS.length)]; }
const COMP_FNS={cutaway:compDifferentiated, differentiated:compDifferentiated, dtype:compDtype, chondrite:compChondrite, bilobed:compDifferentiated, rubble:compDifferentiated, wall:compWall};
const CUTAWAY={cutaway:true, differentiated:false, dtype:false, chondrite:false, bilobed:false, rubble:false, wall:false};

// shapes: return depth fraction (0 surface .. 1 core) or null
function shapeSphere(dx,dy,dz,R,noise){
  const r=Math.sqrt(dx*dx+dy*dy+dz*dz); const n=r>1e-6?[dx/r,dy/r,dz/r]:[0,0,0];
  const thr=R+noise*(0.6*Math.sin(2.3*n[0]+1)+0.6*Math.cos(2.9*n[1]+0.5)+0.5*Math.sin(3.1*n[2]+2));
  if(r>thr) return null; return Math.max(0,Math.min(1,1-r/R));
}
function shapeBilobed(dx,dy,dz,R,noise){
  const off=0.55*R, rl=0.7*R; let best=null;
  for(const cxx of [-off,off]){ const ddx=dx-cxx; const rr=Math.sqrt(ddx*ddx+dy*dy+dz*dz); const n=rr>1e-6?[ddx/rr,dy/rr,dz/rr]:[0,0,0];
    const thr=rl+noise*0.7*(Math.sin(2.5*n[0])+Math.cos(2.7*n[1])); if(rr<=thr){ const d=1-rr/rl; if(best===null||d>best) best=d; } }
  return best===null?null:Math.max(0,Math.min(1,best));
}
function shapeWall(dx,dy,dz){ if(dz!==0||Math.abs(dx)>WALL_HALF||Math.abs(dy)>WALL_HALF) return null; return 0.5; }
function shapeRubble(dx,dy,dz,R,noise,lobes){
  if(!lobes) lobes=[[0,0,0,R*0.85]]; const k=R*RUBBLE_SMOOTH; let e=null;
  for(const [cx,cy,cz,lr] of lobes){ const ddx=dx-cx,ddy=dy-cy,ddz=dz-cz; const ei=Math.sqrt(ddx*ddx+ddy*ddy+ddz*ddz)-lr;
    if(e===null){ e=ei; continue; } if(k<=0){ e=Math.min(ei,e); continue; }
    let h=k-Math.abs(e-ei); h=(h>0?h:0)/k; e=Math.min(ei,e)-h*h*h*k/6.0; }
  if(noise>0&&e>noise*0.6*3.0) return null;
  const r=Math.sqrt(dx*dx+dy*dy+dz*dz); const n=r>1e-6?[dx/r,dy/r,dz/r]:[0,0,0];
  const wobble=noise*0.6*(Math.sin(3.0*n[0]+1)+Math.cos(3.5*n[1])+Math.sin(2.5*n[2]+2));
  if(e>wobble) return null; return Math.max(0,Math.min(1,1-r/R));
}
function randUnit(rng){ for(;;){ const x=rng.uniform(-1,1),y=rng.uniform(-1,1),z=rng.uniform(-1,1); const s=x*x+y*y+z*z; if(1e-6<s&&s<=1.0){ const inv=Math.pow(s,-0.5); return [x*inv,y*inv,z*inv]; } } }
function rubbleLobes(R,seed){ const rng=new PyRandom(BigInt(seed)^RUBBLE_SALT); const lobes=[[0,0,0,R*rng.uniform(0.5,0.62)]];
  const n=rng.randint(3,7); for(let i=0;i<n;i++){ const u=randUnit(rng); const off=R*0.6*rng.uniform(0.3,1.0); lobes.push([u[0]*off,u[1]*off,u[2]*off,R*rng.uniform(0.3,0.5)]); } return lobes; }
function rotMatrix(ax,ay,az){ const sa=Math.sin(ax),ca=Math.cos(ax),sb=Math.sin(ay),cb=Math.cos(ay),sg=Math.sin(az),cg=Math.cos(az);
  return [[cb*cg, sa*sb*cg-ca*sg, ca*sb*cg+sa*sg],[cb*sg, sa*sb*sg+ca*cg, ca*sb*sg-sa*cg],[-sb, sa*cb, ca*cb]]; }

// profiled placement
function planLayers(layers){ const plan=[];
  for(const layer of layers){ const mats=layer.materials||[]; if(!mats.length) continue;
    const massive=mats.filter(m=>m.morphology==='massive'); const pool=massive.length?massive:mats;
    let matrix=pool[0]; for(const m of pool){ if(m.weight>matrix.weight||(m.weight===matrix.weight&&m.material>matrix.material)) matrix=m; } matrix=matrix.material;
    const acc=mats.filter(m=>m.material!==matrix).sort((a,b)=> (b.weight-a.weight)|| (a.material<b.material?-1:a.material>b.material?1:0));
    plan.push([+layer.depthLo, matrix, acc]); }
  plan.sort((a,b)=>b[0]-a[0]); return plan; }
function layerIndex(depth,plan){ for(let k=0;k<plan.length;k++) if(depth>=plan[k][0]) return k; return plan.length?plan.length-1:-1; }
function score(morph,mat,px,py,pz,gx,gy,gz,s){
  if(morph==='disseminated') return vhash(gx,gy,gz,s);
  if(morph==='vein'){ const cyc=2.6+(s%3)*0.45; const wx=vnoise(px*1.4,py*1.4,pz*1.4,s)-0.5, wy=vnoise(px*1.4+5,py*1.4+5,pz*1.4+5,s)-0.5, wz=vnoise(px*1.4+9,py*1.4+9,pz*1.4+9,s)-0.5;
    const f=fbm3(px*cyc+wx*VEIN_WIND, py*cyc+wy*VEIN_WIND, pz*cyc+wz*VEIN_WIND, (s+13)|0); return -Math.abs(f-0.5); }
  if(morph==='nodular'){ let sa=mat.self_affinity||0; sa=sa<0?0:sa>1?1:sa; const fq=3.5+6.0*(1-sa); return fbm3(px*fq,py*fq,pz*fq,(s+3)|0); }
  return fbm3(px*1.1,py*1.1,pz*1.1,(s+7)|0);
}
function scored(pool,mat,morph,voxels,r,seed){ const s=Number((BigInt(seed)+BigInt(nameSalt(mat.material)))&0xffffffffn); const out=[];
  for(const i of pool){ const v=voxels[i]; out.push([score(morph,mat,v[0]/r,v[1]/r,v[2]/r,v[3],v[4],v[5],s),i]); }
  out.sort((a,b)=>(b[0]-a[0])||(a[1]-b[1])); return out; }
function placeProfiled(voxels,plan,radius,seed){ const r=radius||1.0; const out=new Array(voxels.length).fill(null); const byLayer=new Map();
  voxels.forEach((v,i)=>{ const k=layerIndex(v[6],plan); if(!byLayer.has(k)) byLayer.set(k,[]); byLayer.get(k).push(i); });
  plan.forEach(([lo,matrix,accessories],k)=>{ const idxs=byLayer.get(k); if(!idxs||!idxs.length) return; const n=idxs.length;
    const diss=accessories.filter(m=>m.morphology==='disseminated'), clumped=accessories.filter(m=>m.morphology!=='disseminated'); const claimed=new Set();
    for(const mat of diss){ const target=pyround(mat.weight*n); if(target<=0) continue; let placed=0;
      for(const [,i] of scored(idxs,mat,'disseminated',voxels,r,seed)){ if(placed>=target) break; if(claimed.has(i)) continue; out[i]=mat.material; claimed.add(i); placed++; } }
    let remaining=idxs.filter(i=>!claimed.has(i));
    for(const mat of clumped){ if(!remaining.length) break; const target=pyround(mat.weight*n); if(target<=0) continue; const taken=new Set();
      for(const [,i] of scored(remaining,mat,mat.morphology,voxels,r,seed).slice(0,target)){ out[i]=mat.material; taken.add(i); }
      remaining=remaining.filter(i=>!taken.has(i)); }
    for(const i of remaining) out[i]=matrix; });
  return out; }

// prefix deformations on grid cells [dx,dy,dz,material,depth]
function prefixDeep(grid,radius,seed){ const rng=new PyRandom(BigInt(seed)+BigInt(PREFIX_SALT.deep)); const u=randUnit(rng); const d=radius*rng.uniform(0.1,0.42);
  const kept=grid.filter(c=>c[0]*u[0]+c[1]*u[1]+c[2]*u[2]<=d); const craters=[]; const nc=rng.choice([0,0,1,2]);
  for(let i=0;i<nc;i++){ const cu=randUnit(rng); craters.push([cu[0]*radius,cu[1]*radius,cu[2]*radius,Math.pow(radius*rng.uniform(0.3,0.55),2)]); }
  if(!craters.length) return kept; return kept.filter(c=>!craters.some(([ax,ay,az,r2])=>(c[0]-ax)**2+(c[1]-ay)**2+(c[2]-az)**2<r2)); }
function prefixShocked(grid,radius,seed,dim){ const rng=new PyRandom(BigInt(seed)+BigInt(PREFIX_SALT.shocked)); const shards=[]; const n=rng.randint(3,8);
  for(let i=0;i<n;i++){ const u=randUnit(rng); const f=rng.uniform(0.15,0.8); const cx=u[0]*radius*f,cy=u[1]*radius*f,cz=u[2]*radius*f; const d=Math.sqrt(cx*cx+cy*cy+cz*cz)||1.0; const push=rng.uniform(1.5,5.0);
    shards.push([cx,cy,cz,pyround(cx/d*push),pyround(cy/d*push),pyround(cz/d*push)]); }
  const lim=(dim-1)/2.0-0.5; const out=[];
  for(const cell of grid){ const [dx,dy,dz]=cell; let bi=0,bd=1e30; shards.forEach((sh,i)=>{ const dd=(dx-sh[0])**2+(dy-sh[1])**2+(dz-sh[2])**2; if(dd<bd){bd=dd;bi=i;} });
    const nx=dx+shards[bi][3], ny=dy+shards[bi][4], nz=dz+shards[bi][5]; if(nx<-lim||nx>lim||ny<-lim||ny>lim||nz<-lim||nz>lim) continue; out.push([nx,ny,nz,cell[3],cell[4]]); }
  return out; }
function connectedToCore(cells){ if(!cells.length) return cells; const key=c=>pyround(c[0]*2)+','+pyround(c[1]*2)+','+pyround(c[2]*2); const index=new Map(); cells.forEach((c,i)=>index.set(key(c),i));
  let seedI=0,best=Infinity; cells.forEach((c,i)=>{ const d=c[0]**2+c[1]**2+c[2]**2; if(d<best){best=d;seedI=i;} });
  const keep=new Array(cells.length).fill(false); keep[seedI]=true; const stack=[seedI]; const offs=[[2,0,0],[-2,0,0],[0,2,0],[0,-2,0],[0,0,2],[0,0,-2]];
  while(stack.length){ const c=cells[stack.pop()]; const kx=pyround(c[0]*2),ky=pyround(c[1]*2),kz=pyround(c[2]*2);
    for(const [ox,oy,oz] of offs){ const j=index.get((kx+ox)+','+(ky+oy)+','+(kz+oz)); if(j===undefined||keep[j]) continue; keep[j]=true; stack.push(j); } }
  return cells.filter((c,i)=>keep[i]); }
function prefixCore(grid,radius,seed){ const salt=PREFIX_SALT.core; const rng=new PyRandom(BigInt(seed)+BigInt(salt)); const keepDepth=rng.uniform(0.4,0.55), plate=rng.uniform(0.72,0.85); const out=[];
  for(const cell of grid){ const [dx,dy,dz]=cell; const r=Math.sqrt(dx*dx+dy*dy+dz*dz); if(1.0-r/radius>=keepDepth||vnoise(dx*0.5,dy*0.5,dz*0.5,salt)>plate) out.push(cell); }
  return connectedToCore(out); }
function prefixHollow(grid,radius,seed){ const rng=new PyRandom(BigInt(seed)+BigInt(PREFIX_SALT.hollow)); const u=randUnit(rng); const off=radius*rng.uniform(0.1,0.4); const cx=u[0]*off,cy=u[1]*off,cz=u[2]*off;
  const cav2=Math.pow(radius*rng.uniform(0.25,0.45),2); const b=randUnit(rng); const bore2=Math.pow(radius*rng.uniform(0.09,0.16),2); const out=[];
  for(const cell of grid){ const [dx,dy,dz]=cell; if((dx-cx)**2+(dy-cy)**2+(dz-cz)**2<cav2) continue; const t=dx*b[0]+dy*b[1]+dz*b[2];
    if(t>0){ const px=dx-t*b[0],py=dy-t*b[1],pz=dz-t*b[2]; if(px*px+py*py+pz*pz<bore2) continue; } out.push(cell); }
  return out; }
const DEFORM_FNS={shocked:prefixShocked, deep:prefixDeep, core:prefixCore, hollow:prefixHollow};

export function buildGrid({archetype,dim,radius,noise,seed,profile,prefix}: GridParams): Cell[] {
  const pfx=(prefix||'').toLowerCase();
  if(pfx==='prime') noise*=new PyRandom(BigInt(seed)+BigInt(PREFIX_SALT.prime)).uniform(0.25,0.55);
  let shape={cutaway:shapeSphere,differentiated:shapeSphere,dtype:shapeSphere,chondrite:shapeSphere,bilobed:shapeBilobed,rubble:shapeRubble,wall:shapeWall}[archetype]||shapeSphere;
  const cutaway=(archetype in CUTAWAY)?CUTAWAY[archetype]:true;
  if(archetype==='rubble'){ const lobes=rubbleLobes(radius,seed); shape=(dx,dy,dz,R,nz)=>shapeRubble(dx,dy,dz,R,nz,lobes); }
  const profiled=!!(profile&&profile.layers&&profile.layers.length); let plan=null, composition=null;
  if(profiled) plan=planLayers(profile.layers); else composition=COMP_FNS[archetype]||compDifferentiated;
  let scales=null, rot=null;
  if(archetype!=='wall'){ const erng=new PyRandom(BigInt(seed)^ELONG_SALT); const b=erng.uniform(0.6,0.95), c=erng.uniform(0.5,0.85); const norm=Math.pow(b*c,1/3);
    scales=[1.0/norm,b/norm,c/norm]; erng.shuffle(scales); rot=rotMatrix(erng.uniform(0,TWO_PI),erng.uniform(0,TWO_PI),erng.uniform(0,TWO_PI)); }
  const rng=new PyRandom(seed); const centre=(dim-1)/2.0; const bound2=Math.pow(centre-1.5,2); const grid=[]; const voxels=[];
  for(let gx=0;gx<dim;gx++){ const dx=gx-centre, dx2=dx*dx; if(dx2>bound2) continue;
    for(let gy=0;gy<dim;gy++){ const dy=gy-centre, xy2=dx2+dy*dy; if(xy2>bound2) continue; const span=Math.sqrt(bound2-xy2);
      let lo=Math.ceil(centre-span)-1, hi=Math.floor(centre+span)+1; if(lo<0) lo=0; if(hi>dim-1) hi=dim-1;
      for(let gz=lo;gz<=hi;gz++){ const dz=gz-centre; if(xy2+dz*dz>bound2) continue; if(cutaway&&dx>0.0&&dz<0.0) continue;
        let pex,pey,pez; if(rot){ const px=rot[0][0]*dx+rot[0][1]*dy+rot[0][2]*dz, py=rot[1][0]*dx+rot[1][1]*dy+rot[1][2]*dz, pz=rot[2][0]*dx+rot[2][1]*dy+rot[2][2]*dz; pex=px/scales[0]; pey=py/scales[1]; pez=pz/scales[2]; } else { pex=dx; pey=dy; pez=dz; }
        let depth=shape(pex,pey,pez,radius,noise,rng); if(depth===null) continue;
        depth=Math.max(0,Math.min(1,depth+rng.uniform(-JITTER,JITTER)));
        if(profiled) voxels.push([dx,dy,dz,gx,gy,gz,depth]); else grid.push([dx,dy,dz,composition(depth,rng),depth]); } } }
  let out=grid;
  if(profiled){ const mats=placeProfiled(voxels,plan,radius,seed); out=voxels.map((v,i)=>[v[0],v[1],v[2],mats[i],v[6]]); }
  if(pfx in DEFORM_FNS) out=DEFORM_FNS[pfx](out,radius,seed,dim);
  return out;
}

