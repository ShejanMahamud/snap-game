/* System: rubber-band spring physics and collision geometry. */
import { S } from '../model/state.js';
import { A0, BOOST, DD, KK, VISC } from '../core/constants.js';

export function maxDepth(){return Math.max(80,S.H*.29)}
export function gemR(){return Math.max(17,Math.min(30,Math.min(S.W,S.H)*.058))}
export function buildBand(){S.N=Math.max(30,Math.min(120,Math.round(S.W/9)));S.dx=S.W/(S.N-1);S.u=new Float32Array(S.N);S.v=new Float32Array(S.N);S.restY=S.H*(S.state==='menu'?.8:.66)}
export function stepBand(h,uu,vv){
  const a=A0*(9/S.dx)*(9/S.dx);
  for(let i=1;i<S.N-1;i++){vv[i]+=(a*(uu[i-1]-2*uu[i]+uu[i+1])-KK*uu[i]-DD*vv[i]+VISC*(vv[i-1]-2*vv[i]+vv[i+1]))*h}
  for(let i=1;i<S.N-1;i++)uu[i]+=vv[i]*h;
}
export function shapeInto(arr,gx,depth){const w=S.W*.12+depth*.9;for(let i=0;i<S.N;i++){const d=Math.abs(i*S.dx-gx)/w;arr[i]=d<1?depth*Math.pow(Math.cos(d*Math.PI/2),2):0}arr[0]=0;arr[S.N-1]=0}
export function predict(gx,depth){
  const pu=new Float32Array(S.N),pv=new Float32Array(S.N),mn=new Float32Array(S.N);
  shapeInto(pu,gx,depth);for(let i=0;i<S.N;i++)pv[i]=-BOOST*pu[i];
  for(let s=0;s<135;s++){stepBand(1/300,pu,pv);for(let i=0;i<S.N;i++)if(pu[i]<mn[i])mn[i]=pu[i]}
  return mn;
}
function segDist(px,py,x1,y1,x2,y2){const ax=x2-x1,ay=y2-y1,l2=ax*ax+ay*ay;let t=l2?((px-x1)*ax+(py-y1)*ay)/l2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(x1+t*ax),py-(y1+t*ay))}
export function gemBandDist(g){
  if(g.x<-g.r||g.x>S.W+g.r)return 1e9;
  const j=Math.max(0,Math.min(S.N-2,Math.floor(g.x/S.dx)));let m=1e9;
  for(let s=Math.max(0,j-1);s<=Math.min(S.N-2,j+1);s++)m=Math.min(m,segDist(g.x,g.y,s*S.dx,S.restY+S.u[s],(s+1)*S.dx,S.restY+S.u[s+1]));
  return m;
}
