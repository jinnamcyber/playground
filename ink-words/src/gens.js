/* fluid-only kinds: the ink itself is the picture */
G.mist=function(){};G.wind=function(){};

G.snow=function(P){
  var R=P.R,S=P.S,W=P.W,H=P.H,t=P.t,n=Math.round(W*H/7000);
  for(var i=0;i<n;i++){
    var x0=R(0,1)*W,y0=R(0,1)*(H+20),sp=R(16,38)*S,ph=R(0,TAU),r=R(1,2.6)*S;
    var y=(y0+t*sp)%(H+20)-10,x=x0+Math.sin(t*.8+ph)*12*S;
    dot(P,x,y,r+.7,.08,INK);dot(P,x,y,r,.92,SNOW);
  }
};

G.butterfly=function(P,ax,ay){
  var R=P.R,S=P.S,rnd=P.rnd,t=P.t,n=2+(rnd()<.5?1:0),cols=[KOI,INK,PLUM];
  for(var i=0;i<n;i++){
    var c=cols[i],L=R(15,22)*S,p1=R(0,TAU),p2=R(0,TAU),f1=R(.25,.4),f2=R(.35,.55),rx=R(50,110)*S,ry=R(30,70)*S,fs=R(9,12),ox=i*R(-40,40)*S,oy=i*R(-30,30)*S;
    var x=ax+ox+Math.sin(t*f1+p1)*rx+Math.sin(t*1.7+p2)*10*S,y=ay+oy+Math.sin(t*f2+p2)*ry+Math.cos(t*2.1+p1)*8*S;
    var th=Math.atan2(Math.cos(t*f2+p2)*ry*f2,Math.cos(t*f1+p1)*rx*f1),fl=.3+.7*Math.abs(Math.sin(t*fs+p1));
    for(var w=-1;w<=1;w+=2){
      leaf(P,x,y,th+w*1.05,L*1.3*fl,L*.8,{a:.6,c:c,edge:.5});
      leaf(P,x,y,th+w*2.25,L*.9*fl,L*.6,{a:.5,c:c,edge:.5});
      var hx=x+Math.cos(th)*L*.4,hy=y+Math.sin(th)*L*.4;
      stroke(P,[[hx,hy],[hx+Math.cos(th+w*.45)*L*.6,hy+Math.sin(th+w*.45)*L*.6]],function(){return .9*S},{a:.7});
    }
    stroke(P,[[x-Math.cos(th)*L*.45,y-Math.sin(th)*L*.45],[x+Math.cos(th)*L*.45,y+Math.sin(th)*L*.45]],function(q){return 2.6*S*Math.sin(PI*q)+.6},{a:.9});
  }
};

G.dragon=function(P,ax,ay){
  var R=P.R,S=P.S,W=P.W,H=P.H,t=P.t,A=R(.2,.3)*W,B=R(.12,.2)*H,p1=R(0,TAU),p2=R(0,TAU),w0=R(19,24)*S,N=46,raw=[],pts=[],i,w;
  var cx=Math.min(Math.max(ax,A+40),W-A-40),cy=Math.min(Math.max(ay,B+60),H-B-60);
  for(i=0;i<=N+1;i++){var u=t-i*.05;raw.push([cx+A*Math.sin(u*.6+p1),cy+B*Math.sin(u*1.2+p2)])}
  /* the body snakes from side to side around the path it flies along */
  for(i=0;i<=N;i++){var dx=raw[i][0]-raw[i+1][0],dy=raw[i][1]-raw[i+1][1],l=Math.hypot(dx,dy)||1,o=Math.sin(i*.3-t*4)*w0*1.15*Math.min(1,i/8);
    pts.push([raw[i][0]-dy/l*o,raw[i][1]+dx/l*o])}
  var hd=Math.atan2(pts[0][1]-pts[2][1],pts[0][0]-pts[2][0]),hx=pts[0][0],hy=pts[0][1],ch=Math.cos(hd),sh=Math.sin(hd);
  function back(i){return Math.atan2(pts[i+1][1]-pts[i][1],pts[i+1][0]-pts[i][0])}
  function bw(q){return w0*Math.min(1,.7+6*q)*(1-.82*q)+1.2}
  var tb=back(N-1);
  for(i=-2;i<=2;i++)leaf(P,pts[N][0],pts[N][1],tb+i*.38,w0*(2.6-Math.abs(i)*.4),w0*.5,{a:.55,c:RED});
  [10,27].forEach(function(j){for(w=-1;w<=1;w+=2){var a=back(j)+w*1.3,lx=pts[j][0]+Math.cos(a)*w0*1.5,ly=pts[j][1]+Math.sin(a)*w0*1.5;
    stroke(P,[pts[j],[lx,ly]],function(q){return 5*S*(1-.4*q)},{a:.75});
    for(var c=-1;c<=1;c++)leaf(P,lx,ly,a+c*.5-w*.5,w0*.6,2.6*S,{a:.8})}});
  for(i=2;i<N-2;i+=2){var q=i/N;leaf(P,pts[i][0],pts[i][1],back(i)-1.05,bw(q)*1.15+4*S,4*S,{a:.75})}
  stroke(P,pts,bw,{a:.8,edge:.8});
  for(i=3;i<N-4;i+=3){var b=back(i);dot(P,pts[i][0]+Math.sin(b)*bw(i/N)*.18,pts[i][1]-Math.cos(b)*bw(i/N)*.18,bw(i/N)*.16,.5,'244,238,224')}
  for(i=-2;i<=2;i++)leaf(P,hx-ch*w0*.2,hy-sh*w0*.2,hd+PI+i*.42,w0*(2.1-Math.abs(i)*.3),w0*.42,{a:.6,c:RED});
  for(w=-1;w<=1;w+=2){
    var bx=hx-sh*w*w0*.25,by=hy+ch*w*w0*.25,ha=hd+PI-w*.55,mx=bx+Math.cos(ha)*w0*1.5,my=by+Math.sin(ha)*w0*1.5;
    stroke(P,[[bx,by],[mx,my],[mx+Math.cos(ha+w*.5)*w0*1.2,my+Math.sin(ha+w*.5)*w0*1.2]],function(q){return 4.2*S*(1-.7*q)+.6},{a:.9});
    leaf(P,mx,my,ha-w*.7,w0*.8,2.6*S,{a:.9});
    stroke(P,[[hx,hy],[hx+Math.cos(hd+w*.2)*w0*1.9,hy+Math.sin(hd+w*.2)*w0*1.9]],function(q){return w0*(.62-.38*q)},{a:.85,edge:.5});
    var tx=hx+ch*w0*1.5,ty=hy+sh*w0*1.5,wa=hd+w*(1.5+.3*Math.sin(t*3+w))+PI*.0;
    stroke(P,qb([tx,ty],[tx+Math.cos(hd+w*.9)*w0*2,ty+Math.sin(hd+w*.9)*w0*2],[tx+Math.cos(wa+w*.9)*w0*3.6,ty+Math.sin(wa+w*.9)*w0*3.6],10),function(q){return 1.7*S*(1-.6*q)},{a:.8});
    dot(P,hx-sh*w*w0*.33+ch*w0*.45,hy+ch*w*w0*.33+sh*w0*.45,2.3*S,.95,RED);
  }
  stroke(P,[[hx-ch*w0*.5,hy-sh*w0*.5],[hx+ch*w0*.5,hy+sh*w0*.5]],function(q){return w0*(1.15+.25*Math.sin(PI*q))},{a:.85,edge:.6});
  P.stir.push([hx,hy,ch*150*S,sh*150*S,34*S,.008]);
  P.stir.push([pts[24][0],pts[24][1],0,0,24*S,.004]);
};

G.thunder=function(P){
  var b=P.el&&P.el.bolt;if(!b)return;
  var age=P.now-b.t0;if(age<0||age>.5)return;
  var a=.95*(1-age/.5),S=P.S;
  stroke(P,b.pts,function(q){return 5*S*(1-.6*q)+.8},{a:a});
  b.forks.forEach(function(f){stroke(P,f,function(q){return 2.4*S*(1-q)+.5},{a:a*.8})});
};

G.fire=function(P,ax,ay){
  var R=P.R,S=P.S;
  wash(P,ax,ay+10*S,52*S,.14,INK,2);
  for(var i=0;i<3;i++){var a=R(-.3,.3)+(i-1)*.55,l=R(34,48)*S;
    stroke(P,[[ax-Math.cos(a)*l,ay-Math.sin(a)*l*.5+6*S],[ax+Math.cos(a)*l,ay+Math.sin(a)*l*.5+6*S]],function(q){return 7.5*S*(1-.3*q)},{a:.75,dry:.6,edge:.6})}
};

