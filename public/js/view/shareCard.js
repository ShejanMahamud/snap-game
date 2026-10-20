/* View: shareable result card image. */
import { S } from '../model/state.js';
import { COL, F_D, F_M } from '../core/constants.js';
import { SKINS, lvlInfo, skinIdx } from '../model/progression.js';
import { dayStr, store } from '../model/store.js';
import { drawDots, drawGem, drawHalf, stageGrad, txt } from './render.js';

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
export function renderCard(streak){
  const cw=1080,ch=1350,c=document.createElement('canvas');c.width=cw;c.height=ch;const k=c.getContext('2d');
  k.fillStyle=stageGrad(k,ch);k.fillRect(0,0,cw,ch);drawDots(k,cw,ch);
  txt(k,'SNAP',cw/2+8,238,176,COL.glow,'center',F_D,null);
  txt(k,'SNAP',cw/2,230,176,COL.lemon,'center',F_D,COL.ink,10);
  txt(k,(S.mode==='daily'?'DAILY '+dayStr():S.mode==='hard'?'HARD MODE':'ENDLESS'),cw/2,292,30,'rgba(255,255,255,.85)','center',F_M,null);
  const fx=90,fy=330,fw=900,fh=520;
  rr(k,fx,fy,fw,fh,36);k.fillStyle='rgba(14,16,56,.55)';k.fill();
  k.save();rr(k,fx,fy,fw,fh,36);k.clip();
  if(S.bestRec&&S.bestRec.u){
    const rc=S.bestRec,top=rc.restY-rc.H*.5,vh=rc.H*.8,s=Math.min(fw/rc.W,fh/vh),ox=fx+(fw-rc.W*s)/2,oy=fy+(fh-vh*s)/2;
    const X=x=>ox+x*s,Y=y=>oy+(y-top)*s;
    for(const gm of rc.gems){
      const r=gm.r*s*.9,x=X(gm.x),y=Y(gm.y);if(y<fy-r||y>fy+fh+r)continue;
      if(gm.cut){drawHalf(k,gm.type,x-r*.35,y-r*.3,r,-.3,gm.c,-1,0);drawHalf(k,gm.type,x+r*.35,y-r*.3,r,.3,gm.c,1,0)}
      else drawGem(k,gm.type,x,y,r,.3,gm.c,0);
    }
    k.beginPath();for(let i=0;i<S.N;i++){const px=ox+(i/(S.N-1))*rc.W*s,py=oy+(rc.restY+(rc.u[i]||0)-top)*s;i?k.lineTo(px,py):k.moveTo(px,py)}
    const sk=SKINS[skinIdx()];
    k.lineCap='round';k.lineJoin='round';k.lineWidth=26;k.strokeStyle='rgba('+(sk.rainbow?'255,62,134':sk.glow)+',.45)';k.stroke();k.lineWidth=11;k.strokeStyle=sk.rainbow?'#FFF1CF':sk.core;k.stroke();
    txt(k,'BEST SNAP',fx+28,fy+52,24,'rgba(255,255,255,.8)','left',F_M,null);
  }else{
    k.beginPath();k.moveTo(fx+30,fy+fh/2);k.lineTo(fx+fw-30,fy+fh/2);k.lineCap='round';k.lineWidth=12;k.strokeStyle=COL.band;k.stroke();
    txt(k,'No gems cut yet',cw/2,fy+fh/2-40,40,'rgba(255,255,255,.85)','center',F_M,null);
  }
  k.restore();
  txt(k,S.score.toLocaleString(),cw/2,1080,S.score>99999?190:220,'#fff','center',F_D,COL.ink,12);
  txt(k,'POINTS',cw/2,1130,30,'rgba(255,255,255,.85)','center',F_M,null);
  const li=lvlInfo(store.xp||0);
  const cols=[[270,String(S.bestSnapCount),'BEST SNAP'],[540,String(S.slicedTotal),'GEMS CUT'],[810,'LV '+li.l,li.title.toUpperCase()]];
  for(const[x,val,lab]of cols){txt(k,val,x,1218,64,COL.lemon,'center',F_D,COL.ink,6);txt(k,lab,x,1256,22,'rgba(255,255,255,.8)','center',F_M,null)}
  txt(k,'Can you beat it?',cw/2,1314,30,'rgba(255,255,255,.9)','center',F_M,null);
  return c.toDataURL('image/png');
}
