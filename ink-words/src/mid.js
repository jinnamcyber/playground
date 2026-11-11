<script>
(function(){
'use strict';
var INK='27,25,21', RED='178,52,40', PLUM='186,48,58', KOI='204,84,36', PINK='208,96,112', SNOW='255,253,246';
var PI=Math.PI, TAU=PI*2;

/* ---------- seeded random ---------- */
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- geometry helpers ---------- */
function qb(a,b,c,n){var o=[];for(var i=0;i<=n;i++){var t=i/n,u=1-t;o.push([u*u*a[0]+2*u*t*b[0]+t*t*c[0],u*u*a[1]+2*u*t*b[1]+t*t*c[1]])}return o}
function chaikin(p,it){for(var k=0;k<it;k++){var o=[p[0]];for(var i=0;i<p.length-1;i++){var a=p[i],b=p[i+1];o.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75])}o.push(p[p.length-1]);p=o}return p}

/* ---------- the brush: a row of bristles dragged along a path ---------- */
function stroke(P,pts,wf,o){
  o=o||{};var a=o.a==null?.7:o.a,c=o.c||INK,dry=o.dry||0,edge=o.edge||0,rnd=rng((P.rnd()*4294967296)|0);
  var L=[0],i;for(i=1;i<pts.length;i++)L[i]=L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
  var tot=L[L.length-1];if(!(tot>.5))return;
  var wmax=0;for(i=0;i<=10;i++)wmax=Math.max(wmax,wf(i/10));
  var nb=Math.max(1,Math.round(wmax/1.7)),br=[];
  for(i=0;i<nb;i++){var u=nb===1?0:(i/(nb-1)-.5)+(rnd()-.5)*.5/nb;br.push({u:u,ink:(.55+rnd()*.45)*(1+edge*(Math.abs(u)*2-.5)),on:true})}
  var seg=1;
  for(var d=0;d<=tot;d+=1.15){
    while(seg<pts.length-1&&L[seg]<d)seg++;
    var p0=pts[seg-1],p1=pts[seg],sl=(L[seg]-L[seg-1])||1,f=(d-L[seg-1])/sl;
    var x=p0[0]+(p1[0]-p0[0])*f,y=p0[1]+(p1[1]-p0[1])*f,nx=-(p1[1]-p0[1])/sl,ny=(p1[0]-p0[0])/sl;
    var t=d/tot,w=wf(t);if(w<=.05)continue;
    var r=Math.max(.5,Math.min(1.7,w/nb*.98));
    for(i=0;i<nb;i++){var b=br[i];
      if(dry){if(b.on){if(rnd()<dry*.022*(.4+2*t))b.on=false}else if(rnd()<.24)b.on=true;if(!b.on)continue}
      P.ops.push({k:0,x:x+nx*b.u*w+(rnd()-.5)*.4,y:y+ny*b.u*w+(rnd()-.5)*.4,r:r,a:Math.min(1,a*b.ink),c:c});
    }
  }
}
function dot(P,x,y,r,a,c){P.ops.push({k:0,x:x,y:y,r:r,a:a,c:c||INK})}
function wash(P,x,y,r,a,c,sx,er){P.ops.push({k:2,x:x,y:y,r:r,a:a,c:c||INK,sx:sx||1,er:!!er})}
function leaf(P,x,y,ang,len,w,o){
  var ex=x+Math.cos(ang)*len,ey=y+Math.sin(ang)*len,b=len*(P.rnd()-.5)*.24;
  var mx=(x+ex)/2-Math.sin(ang)*b,my=(y+ey)/2+Math.cos(ang)*b;
  stroke(P,qb([x,y],[mx,my],[ex,ey],10),function(t){return w*Math.sin(PI*Math.pow(t,.55))},o);
}

/* ---------- things the brush knows ---------- */
var G={};

G.bamboo=function(P,ax,ay){
  var W=P.W,H=P.H,S=P.S,rnd=P.rnd,R=P.R;
  var x0=ax==null?R(.18,.82)*W:ax,n=2+(rnd()<.5?1:0);
  function cluster(x,y,dir,light){
    var k=3+Math.floor(rnd()*3);
    for(var i=0;i<k;i++)leaf(P,x,y,PI/2-dir*R(-.25,1),R(34,68)*S,R(7,12)*S,{a:light?R(.2,.32):R(.72,.92)});
  }
  for(var s=0;s<n;s++){
    var x=x0+(s-(n-1)/2)*R(26,46)*S,y=H+8,top=(ay==null?R(.1,.3)*H:ay)+R(-20,45)*S*(s?1:0);
    var w=R(9,15)*S,lean=R(-.1,.1),seg=R(60,85)*S,dark=s===0?R(.3,.42):R(.14,.24),nodes=[];
    while(y>top+4){
      var y1=Math.max(top,y-seg),x1=x+lean*(y-y1),ww=w;
      stroke(P,[[x,y],[(x+x1)/2+R(-1,1),(y+y1)/2],[x1,y1]],function(t){return ww*(1+.09*Math.cos(t*TAU))},{a:dark,edge:.9,dry:.25});
      stroke(P,qb([x1-w*.62,y1-1*S],[x1,y1-3.4*S],[x1+w*.62,y1-1*S],6),function(t){return 2.4*S*(.45+.55*Math.sin(PI*t))},{a:.78});
      nodes.push([x1,y1-2*S]);
      y=y1-3.6*S;x=x1;w*=.94;lean+=R(-.03,.03);seg*=1.04;
    }
    for(var i=Math.floor(nodes.length*.3);i<nodes.length;i++){
      if(i<nodes.length-1&&rnd()>.65)continue;
      var nd=nodes[i],dir=rnd()<.5?-1:1,ang=-PI/2+dir*R(.5,1.05),len=R(35,80)*S;
      var ex=nd[0]+Math.cos(ang)*len,ey=nd[1]+Math.sin(ang)*len;
      var bp=qb(nd,[(nd[0]+ex)/2,(nd[1]+ey)/2+R(2,9)*S],[ex,ey],8);
      stroke(P,bp,function(t){return 1.7*S*(1-.5*t)},{a:.6});
      if(rnd()<.5)cluster(bp[4][0],bp[4][1],dir,true);
      cluster(ex,ey,dir,s>0&&rnd()<.3);
    }
  }
};

G.mountain=function(P,ax,ay){
  var W=P.W,H=P.H,S=P.S,rnd=P.rnd,R=P.R;
  var cx=ax==null?R(.25,.75)*W:ax,top=ay==null?R(.2,.42)*H:ay,base=Math.min(H*.94,top+R(.3,.42)*H);
  for(var i=0;i<3;i++){
    var f=i/2,a=[.16,.3,.5][i],lt=top+(base-top)*f*.5,lb=base+f*16*S,peaks=[],np=2+(rnd()<.5?1:0);
    peaks.push({x:cx+(i?R(-.28,.28)*W:0),h:lb-lt,hw:R(.2,.32)*W});
    for(var p=1;p<np;p++)peaks.push({x:peaks[0].x+R(.12,.34)*W*(rnd()<.5?-1:1),h:(lb-lt)*R(.45,.8),hw:R(.14,.26)*W});
    var x0=1e9,x1=-1e9;peaks.forEach(function(q){x0=Math.min(x0,q.x-q.hw);x1=Math.max(x1,q.x+q.hw)});
    var ph=[R(0,TAU),R(0,TAU),R(0,TAU)],pts=[],minY=lb;
    for(var x=x0;x<=x1;x+=5*S){
      var e=0;peaks.forEach(function(q){var d=Math.abs(x-q.x)/q.hw;if(d<1)e=Math.max(e,q.h*Math.pow(1-d,1.25))});
      var y=lb-e*(1+.09*Math.sin(x*.045/S+ph[0])+.05*Math.sin(x*.12/S+ph[1])+.03*Math.sin(x*.3/S+ph[2]))+R(-1.5,1.5)*S;
      pts.push([x,y]);minY=Math.min(minY,y);
    }
    P.ops.push({k:1,pts:pts.concat([[x1,lb+2],[x0,lb+2]]),y0:minY,y1:lb,a:a*.8,c:INK});
    (function(f,a){stroke(P,pts,function(t){return (1.6+3*f)*S*Math.pow(Math.sin(PI*t),.4)+.3},{a:Math.min(.9,a+.18),dry:.5})})(f,a);
    if(i){var nt=5+Math.floor(rnd()*5);
      for(var k=0;k<nt;k++){
        var q=pts[Math.floor(R(.2,.8)*pts.length)],pk=peaks[0];
        peaks.forEach(function(z){if(Math.abs(z.x-q[0])<Math.abs(pk.x-q[0]))pk=z});
        var dir=q[0]<pk.x?-1:1,ey=Math.min(lb-4,q[1]+R(22,70)*S);if(ey<q[1]+8)continue;
        stroke(P,[[q[0],q[1]+2],[q[0]+dir*R(8,28)*S,ey]],function(t){return 3.2*S*(1-t)+.4},{a:a*.6,dry:.9});
      }
    }
  }
};

G.moon=function(P,ax,ay){
  var R=P.R,x=ax==null?R(.2,.8)*P.W:ax,y=ay==null?R(.12,.3)*P.H:ay;
  P.ops.push({k:4,x:x,y:y,r:R(28,44)*P.S,a:.26,c:INK});
};

G.sun=function(P,ax,ay){
  var R=P.R,S=P.S,x=ax==null?R(.2,.8)*P.W:ax,y=ay==null?R(.12,.3)*P.H:ay,r=R(22,34)*S;
  wash(P,x,y,r*2.4,.16,RED);
  dot(P,x,y,r,.82,RED);
  for(var i=0;i<26;i++){var a=R(0,TAU);dot(P,x+Math.cos(a)*r*.96,y+Math.sin(a)*r*.96,R(1.5,4)*S,.5,RED)}
};

G.bird=function(P,ax,ay){
  var R=P.R,S=P.S,rnd=P.rnd,W=P.W,t=P.t,cx=ax==null?R(.25,.75)*W:ax,cy=ay==null?R(.1,.35)*P.H:ay,n=3+Math.floor(rnd()*5),side=rnd()<.5?-1:1;
  var m=60*S,span=W+2*m,sp=R(14,22)*S;
  for(var i=0;i<n;i++){
    var row=Math.ceil(i/2),sd=i%2?1:-1,s=R(13,20)*S*(1-row*.07),fp=R(0,TAU),fs=R(5,7),k1=R(.9,1.2),k2=R(.55,.9);
    var x=cx+side*row*R(28,40)*S-side*sp*t,y=cy+sd*row*R(15,24)*S+R(-4,4)*S+Math.sin(t*.7+fp)*3*S;
    x=((x+m)%span+span)%span-m;
    var fl=Math.sin(t*fs+fp);
    for(var w=-1;w<=1;w+=2){
      var tip=[x+w*s*k1*(1-.12*fl),y-s*(.25+.5*fl)];
      stroke(P,qb([x,y],[x+w*s*.45,y-s*(k2*.6+.35*fl)],tip,8),function(q){return 3*S*(1-q)+.5},{a:.8});
    }
    dot(P,x-side*1.5*S,y+.5*S,1.5*S,.85);
  }
};

G.fish=function(P,ax,ay){
  var R=P.R,S=P.S,rnd=P.rnd,t=P.t,cx=ax==null?R(.25,.75)*P.W:ax,cy=ay==null?R(.6,.85)*P.H:ay,n=1+(rnd()<.65?1:0);
  for(var i=0;i<n;i++){
    var rad=R(30,58)*S,sp=R(.22,.4)*(rnd()<.5?-1:1),ph=R(0,TAU),L=R(60,95)*S,wb=R(0,TAU),ox=i*R(20,40)*S*(rnd()<.5?-1:1),oy=i*R(14,26)*S;
    var c=i?INK:KOI,a=i?.5:.62,f=ph+t*sp,sg=sp<0?-1:1;
    var x=cx+ox+Math.cos(f)*rad*1.5,y=cy+oy+Math.sin(f)*rad*.8,th=Math.atan2(Math.cos(f)*.8*sg,-Math.sin(f)*1.5*sg);
    P.stir.push([x,y,Math.cos(th)*55*S,Math.sin(th)*55*S,20*S]);
    var wag=Math.sin(t*3.4+wb),b=L*(.11*wag-.13*sg);
    var tx=x-Math.cos(th)*L,ty=y-Math.sin(th)*L,mx=(x+tx)/2-Math.sin(th)*b,my=(y+ty)/2+Math.cos(th)*b;
    var sp2=qb([x,y],[mx,my],[tx,ty],14),tb=Math.atan2(ty-my,tx-mx)+.3*Math.sin(t*3.4+wb-1);
    leaf(P,sp2[4][0],sp2[4][1],th+PI-1.25-.15*wag,L*.27,L*.1,{a:a*.6,c:c});
    leaf(P,sp2[4][0],sp2[4][1],th+PI+1.25-.15*wag,L*.27,L*.1,{a:a*.6,c:c});
    (function(L){stroke(P,sp2,function(q){return L*.3*Math.pow(Math.sin(PI*Math.pow(q*.96+.02,.5)),.9)+.6},{a:a,c:c,edge:.3})})(L);
    leaf(P,tx,ty,tb+.5,L*.38,L*.13,{a:a*.75,c:c});
    leaf(P,tx,ty,tb-.5,L*.38,L*.13,{a:a*.75,c:c});
    if(!i)for(var k=0;k<3;k++){var q=sp2[3+k*3];wash(P,q[0]+R(-3,3)*S,q[1]+R(-3,3)*S,R(4,7)*S,.5,INK)}
    var ex=-Math.sin(th)*L*.07,ey=Math.cos(th)*L*.07;
    dot(P,sp2[1][0]+ex,sp2[1][1]+ey,1.5*S,.9);dot(P,sp2[1][0]-ex,sp2[1][1]-ey,1.5*S,.9);
  }
};

G.pine=function(P,ax,ay){
  var R=P.R,S=P.S,rnd=P.rnd,H=P.H,x0=ax==null?R(.2,.8)*P.W:ax,top=ay==null?R(.2,.4)*H:ay,by=H+6,hg=by-top,w0=R(16,24)*S;
  function needles(x,y){
    wash(P,x,y-6*S,26*S,.1,INK,1.4);
    var n=10+Math.floor(rnd()*6);
    for(var i=0;i<n;i++){var a=-PI/2+R(-1.3,1.3),l=R(13,24)*S;
      stroke(P,[[x,y],[x+Math.cos(a)*l,y+Math.sin(a)*l]],function(t){return 1.5*S*(1-.6*t)},{a:R(.55,.85)})}
  }
  var k=6,pts=[[x0,by]],x=x0,dr=R(-.22,.22),i;
  for(i=1;i<=k;i++){x+=(i%2?1:-1)*R(8,22)*S+dr*hg/k;pts.push([x,by-hg*i/k])}
  stroke(P,chaikin(pts,2),function(t){return w0*(1-.68*t)+1},{a:.6,dry:.8,edge:.8});
  for(i=0;i<14;i++){var q=pts[1+Math.floor(rnd()*3)];dot(P,q[0]+R(-.4,.4)*w0,q[1]+R(-30,30)*S,R(.8,1.8)*S,.7)}
  for(i=2;i<=k;i++){
    var b=pts[i],dir=i%2?1:-1,len=R(55,120)*S*(1.15-i/k*.5),ang=dir>0?R(-.35,.1):PI+R(-.1,.35);
    var ex=b[0]+Math.cos(ang)*len,ey=b[1]+Math.sin(ang)*len;
    var bp=qb(b,[(b[0]+ex)/2,(b[1]+ey)/2-R(4,14)*S],[ex,ey],10);
    stroke(P,bp,function(t){return w0*.3*(1-.7*t)+.8},{a:.66,dry:.5});
    [3,5,7,10].forEach(function(j){needles(bp[j][0],bp[j][1]-2*S)});
  }
  needles(pts[k][0],pts[k][1]-3*S);
};

G.plum=function(P,ax,ay){
  var R=P.R,S=P.S,rnd=P.rnd,W=P.W,H=P.H;
  var x0=ax==null?R(.15,.85)*W:ax,y0=ay==null?R(.55,.9)*H:ay,side=x0>W/2?-1:1;
  function flower(x,y){
    if(rnd()<.3){dot(P,x,y,R(2.4,3.4)*S,.6,PLUM);return}
    var r=R(3.6,5)*S,ph=R(0,TAU);
    for(var i=0;i<5;i++){var a=ph+i*TAU/5;dot(P,x+Math.cos(a)*r*.95,y+Math.sin(a)*r*.95,r,R(.4,.6),PLUM)}
    for(i=0;i<3;i++)dot(P,x+R(-1.5,1.5)*S,y+R(-1.5,1.5)*S,.8*S,.85);
  }
  function branch(x,y,ang,len,w,d){
    var n=2+(rnd()<.5?1:0);
    for(var i=0;i<n;i++){
      ang+=R(-.45,.45);var l=len/n*R(.8,1.2),ex=x+Math.cos(ang)*l,ey=y+Math.sin(ang)*l,w0=w,w1=w*.72;
      stroke(P,[[x,y],[ex,ey]],function(t){return w0+(w1-w0)*t},{a:.72,dry:d?.3:.7,edge:.5});
      var nf=d?1+Math.floor(rnd()*3):(rnd()<.5?1:0);
      for(var k=0;k<nf;k++){var t=rnd();flower(x+(ex-x)*t+R(-6,6)*S,y+(ey-y)*t+R(-6,6)*S)}
      x=ex;y=ey;w=w1;
      if(d<2&&rnd()<.85)branch(x,y,ang+R(.5,1.1)*(rnd()<.5?-1:1),len*.62,Math.max(1.2*S,w*.55),d+1);
    }
    flower(x,y);
  }
  branch(x0,y0,-PI/2+side*R(.35,.9),R(.34,.5)*Math.min(W,H),R(7,10)*S,0);
};

G.rain=function(P){
  var R=P.R,S=P.S,ang=PI/2+R(.15,.32),n=Math.round(P.W*P.H/1300);P.ang=ang;
  for(var i=0;i<n;i++){var x=R(-.5,1.5)*P.W,y=R(0,.93)*P.H,l=R(28,70)*S;
    stroke(P,[[x,y],[x+Math.cos(ang)*l,y+Math.sin(ang)*l]],function(t){return 1.3*S*Math.sin(PI*t)+.3},{a:R(.14,.3)})}
};

G.boat=function(P,ax,ay){
  var R=P.R,S=P.S,x=ax==null?R(.25,.75)*P.W:ax,y=ay==null?R(.6,.8)*P.H:ay,L=R(64,92)*S,d=P.rnd()<.5?-1:1;
  wash(P,x,y+9*S,L*.5,.12,INK,1.8);
  stroke(P,qb([x-L/2,y-4*S],[x,y+9*S],[x+L/2,y-5*S],12),function(t){return 5.5*S*Math.sin(PI*t)+1.6},{a:.82,dry:.3});
  stroke(P,qb([x-d*L*.3,y],[x-d*L*.12,y-15*S],[x+d*L*.04,y],8),function(t){return 3*S*Math.sin(PI*t)+1},{a:.55});
  var fx=x+d*L*.24,fy=y-1*S;
  stroke(P,[[fx,fy],[fx+d*1*S,fy-12*S]],function(t){return 5.5*S*(1-.35*t)},{a:.8});
  dot(P,fx+d*1.2*S,fy-14.5*S,2.2*S,.85);
  stroke(P,[[fx-6.5*S,fy-15.5*S],[fx+1*S,fy-19.5*S],[fx+8.5*S,fy-15.5*S]],function(t){return 2.4*S*Math.sin(PI*t)+.7},{a:.85});
  stroke(P,[[fx-d*5*S,fy-17*S],[fx+d*L*.36,fy+13*S]],function(){return 1*S},{a:.65});
  for(var i=0;i<4;i++){var wx=x+R(-.7,.7)*L,wy=y+R(10,26)*S,wl=R(18,46)*S;
    stroke(P,[[wx,wy],[wx+wl,wy+R(-1,1)]],function(t){return 1.4*S*Math.sin(PI*t)+.2},{a:R(.15,.3)})}
};

G.water=function(P,ax,ay){
  var R=P.R,S=P.S,W=P.W,t=P.t,y0=ay==null?R(.7,.9)*P.H:ay,n=11+Math.floor(P.rnd()*6);
  for(var i=0;i<n;i++){
    var l=R(60,190)*S,x=(ax==null?R(0,1)*W:ax+R(-.3,.3)*W)-l/2,y=y0+R(-34,34)*S,am=R(1.5,4)*S,ph=R(0,TAU),fr=R(.05,.09)/S,al=R(.15,.36),sp=R(.9,1.7),pts=[];
    x+=Math.sin(t*.25+ph)*10*S;
    for(var d=0;d<=l;d+=4)pts.push([x+d,y+Math.sin(d*fr+ph-t*sp)*am]);
    stroke(P,pts,function(q){return 1.9*S*Math.sin(PI*q)+.25},{a:al*(.8+.2*Math.sin(t*.6+ph))});
  }
};

G.rock=function(P,ax,ay){
  var R=P.R,S=P.S,rnd=P.rnd,cx=ax==null?R(.2,.8)*P.W:ax,cy=ay==null?R(.78,.93)*P.H:ay;
  [[0,0,R(34,52)],[(rnd()<.5?-1:1)*R(44,62),R(4,10),R(16,26)]].forEach(function(q){
    var x=cx+q[0]*S,y=cy+q[1]*S,rr=q[2]*S,pts=[],minY=y,n=16;
    for(var i=0;i<=n;i++){var a=PI+PI*i/n,r=rr*(1+R(-.2,.2))*(i===0||i===n?1.05:1);
      var px=x+Math.cos(a)*r*1.25,py=y+Math.sin(a)*r*.95;pts.push([px,py]);minY=Math.min(minY,py)}
    pts=chaikin(pts,1);
    P.ops.push({k:1,pts:pts,y0:y+2,y1:minY,a:.3,c:INK});
    stroke(P,pts,function(t){return 4.2*S*(.5+.5*Math.sin(PI*t))*(1+.4*Math.sin(t*19))+.6},{a:.72,dry:.7});
    for(i=0;i<4;i++){var p=pts[Math.floor(R(.2,.8)*pts.length)];
      stroke(P,[[p[0],p[1]+3*S],[p[0]+R(-10,10)*S,Math.min(y,p[1]+R(12,rr*.8))]],function(t){return 3*S*(1-t)+.3},{a:.3,dry:.9})}
    for(i=0;i<7;i++){p=pts[Math.floor(R(.25,.75)*pts.length)];dot(P,p[0]+R(-3,3)*S,p[1]-R(0,3)*S,R(1.2,2.4)*S,.8)}
    stroke(P,[[x-rr*1.5,y+1],[x+rr*1.5,y+2]],function(t){return 2*S*Math.sin(PI*t)},{a:.25,dry:.6});
  });
};

G.grass=function(P,ax,ay){
  var R=P.R,S=P.S,rnd=P.rnd,cx=ax==null?R(.15,.85)*P.W:ax,cy=ay==null?R(.82,.96)*P.H:ay;
  for(var g=0;g<3;g++){
    var x=cx+(g-1)*R(34,60)*S,y=cy+R(-6,6)*S,n=8+Math.floor(rnd()*7);
    for(var i=0;i<n;i++){
      var a=-PI/2+R(-.75,.75),l=R(28,88)*S*(g===1?1:.7),ex=x+Math.cos(a)*l+Math.sign(Math.cos(a))*l*.25,ey=y+Math.sin(a)*l*.9;
      stroke(P,qb([x+R(-4,4)*S,y],[x+Math.cos(a)*l*.6,y+Math.sin(a)*l],[ex,ey],10),function(t){return 2.6*S*(1-t)+.35},{a:R(.45,.88)});
    }
  }
};

G.lotus=function(P,ax,ay){
  var R=P.R,S=P.S,rnd=P.rnd,x=ax==null?R(.25,.75)*P.W:ax,y=ay==null?R(.55,.78)*P.H:ay,d=rnd()<.5?-1:1,i;
  var lx=x-d*34*S,ly=y+26*S,lr=R(38,50)*S;
  stroke(P,qb([lx,ly],[lx+d*8*S,ly+60*S],[lx-d*4*S,ly+120*S],10),function(){return 2.6*S},{a:.4});
  var lp=[];for(i=0;i<=28;i++){var la=TAU*i/28,lj=1+R(-.07,.07);lp.push([lx+Math.cos(la)*lr*1.4*lj,ly+Math.sin(la)*lr*.58*lj])}
  P.ops.push({k:1,pts:lp,y0:ly-lr*.6,y1:ly+lr*1.5,a:.42,c:INK});
  stroke(P,lp,function(t){return 2.6*S*(.6+.4*Math.sin(t*9))},{a:.4,dry:.6});
  for(i=0;i<9;i++){var a=R(0,TAU);stroke(P,[[lx,ly],[lx+Math.cos(a)*lr*1.35,ly+Math.sin(a)*lr*.55]],function(t){return 1.5*S*(1-t)+.3},{a:.5})}
  stroke(P,qb([x,y],[x+d*10*S,y+70*S],[x+d*2*S,y+140*S],12),function(){return 2.8*S},{a:.5});
  for(i=0;i<10;i++)dot(P,x+d*R(2,9)*S+R(-3,3)*S,y+R(14,120)*S,.9*S,.7);
  var angs=[-1.15,-.75,-.38,0,.38,.75,1.15,-.2,.2];
  for(i=0;i<angs.length;i++){
    var an=-PI/2+angs[i]+R(-.06,.06),l=R(30,40)*S*(i>6?.8:1);
    leaf(P,x,y,an,l,R(13,17)*S,{a:R(.3,.46),c:PINK,edge:.6});
    dot(P,x+Math.cos(an)*l*.97,y+Math.sin(an)*l*.97,1.7*S,.55,PLUM);
  }
  for(i=0;i<6;i++)dot(P,x+R(-5,5)*S,y-R(3,10)*S,1*S,.8);
};

G.willow=function(P,ax,ay){
  var R=P.R,S=P.S,rnd=P.rnd,H=P.H,x0=ax==null?R(.2,.8)*P.W:ax,top=ay==null?R(.22,.4)*H:ay,by=H+6,ld=rnd()<.5?-1:1,wind=R(-.22,.22),w0=R(13,19)*S;
  var cr=[x0+ld*R(20,50)*S,top+(by-top)*.3];
  stroke(P,qb([x0,by],[x0-ld*R(10,30)*S,(by+cr[1])/2],cr,14),function(t){return w0*(1-.5*t)},{a:.58,dry:.8,edge:.8});
  for(var b=0;b<3;b++){
    var ang=-PI/2+(b-1)*R(.7,1)+ld*.25,len=R(60,110)*S,ex=cr[0]+Math.cos(ang)*len,ey=Math.max(top-10*S,cr[1]+Math.sin(ang)*len);
    var bp=qb(cr,[cr[0]+Math.cos(ang)*len*.5,cr[1]+Math.sin(ang)*len*.75],[ex,ey],12);
    stroke(P,bp,function(t){return w0*.42*(1-.75*t)+.8},{a:.6,dry:.5});
    for(var j=3;j<=12;j++){
      if(rnd()<.2)continue;
      var s=bp[j],sl=R(70,190)*S,out=(s[0]-cr[0]>0?1:-1)*R(6,20)*S,pts=[],dx=0;
      for(var d=0;d<=sl;d+=6){var t=d/sl;dx=out*Math.sin(Math.min(1,t*3)*PI/2)+wind*d+Math.sin(d*.03/S+j)*3*S*t;pts.push([s[0]+dx,s[1]-Math.sin(Math.min(1,t*4)*PI)*5*S+d])}
      stroke(P,pts,function(){return .9*S},{a:.5});
      for(var q=2;q<pts.length;q++){var sd=q%2?1:-1;
        leaf(P,pts[q][0],pts[q][1],PI/2+sd*R(.3,.7),R(5,9)*S,R(1.8,2.8)*S,{a:R(.3,.55)})}
    }
  }
};

