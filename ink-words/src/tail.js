/* ---------- words ---------- */
var BANK={
  mountain:['山','mountain hill peak cliff shan 山 山峰'],
  moon:['月','moon yue 月 月亮'],
  sun:['日','sun ri 日 太阳 太陽'],
  bamboo:['竹','bamboo zhu 竹 竹子'],
  pine:['松','pine tree song 松 松树 松樹 树 樹'],
  plum:['梅','plum blossom flower cherry sakura mei 梅 梅花 花'],
  willow:['柳','willow liu 柳 柳树 柳樹'],
  lotus:['荷','lotus he 荷 荷花 莲 蓮 莲花 蓮花'],
  grass:['草','grass reed cao 草'],
  rock:['石','rock stone shi 石 石头 石頭'],
  water:['水','water river lake wave sea shui 水 河 江 湖'],
  boat:['舟','boat ship fisherman zhou chuan 舟 船'],
  fish:['魚','fish koi carp yu 鱼 魚 锦鲤 錦鯉'],
  bird:['鳥','bird geese goose swallow crow niao 鸟 鳥 雁'],
  butterfly:['蝶','butterfly butterflies die hudie 蝶 蝴蝶'],
  dragon:['龍','dragon long 龙 龍'],
  wind:['風','wind breeze feng 风 風'],
  mist:['霧','mist fog cloud wu yun 雾 霧 云 雲'],
  rain:['雨','rain 雨'],
  snow:['雪','snow xue 雪'],
  thunder:['雷','thunder lightning storm lei 雷 雷電 电 電'],
  fire:['火','fire flame huo 火']
};
var ALIAS={};Object.keys(BANK).forEach(function(k){BANK[k][1].split(' ').forEach(function(w){ALIAS[w]=k})});
function lookup(w){
  if(ALIAS[w])return ALIAS[w];
  if(/es$/.test(w)&&ALIAS[w.slice(0,-2)])return ALIAS[w.slice(0,-2)];
  if(/s$/.test(w)&&ALIAS[w.slice(0,-1)])return ALIAS[w.slice(0,-1)];
  return null;
}
/* where each kind lands when the paper wasn't tapped: [x0,x1,y0,y1] */
var DEF={mountain:[.25,.75,.2,.42],moon:[.2,.8,.12,.3],sun:[.2,.8,.12,.3],bamboo:[.12,.88,.1,.3],pine:[.15,.85,.2,.4],plum:[.15,.85,.55,.85],
  willow:[.15,.85,.22,.4],lotus:[.25,.75,.55,.75],grass:[.15,.85,.82,.95],rock:[.2,.8,.78,.92],water:[.3,.7,.72,.88],boat:[.25,.75,.6,.78],
  fish:[.25,.75,.6,.82],bird:[.3,.7,.12,.32],butterfly:[.25,.75,.3,.6],dragon:[.4,.6,.25,.45],wind:[.3,.7,.3,.6],mist:[.3,.7,.4,.65],
  rain:[.3,.7,.25,.45],snow:[.3,.7,.25,.45],thunder:[.25,.75,.1,.2],fire:[.2,.8,.72,.86],none:[.25,.75,.3,.6]};
/* ink colour -> how much red, green, blue light it soaks up */
var ABS={};ABS[INK]=[1,1,1];ABS[RED]=[.2,1,1];ABS[PLUM]=[.2,.95,.8];ABS[KOI]=[.08,.6,1];ABS[PINK]=[.15,.7,.5];
var GCOL={sun:RED,plum:RED,fire:RED,lotus:PINK,butterfly:KOI};

/* ---------- fluid ink (GPU) ---------- */
var F=(function(){
  var gl,cv,ok=false,W=1,H=1,simW,simH,dyeW,dyeH,vel,dye,div,curl,pres,paperTex,stampTex,progs={},buf;
  var VS='precision highp float;attribute vec2 aP;varying vec2 vUv,vL,vR,vT,vB;uniform vec2 texel;void main(){vUv=aP*.5+.5;vL=vUv-vec2(texel.x,0.);vR=vUv+vec2(texel.x,0.);vT=vUv+vec2(0.,texel.y);vB=vUv-vec2(0.,texel.y);gl_Position=vec4(aP,0.,1.);}';
  var HD='precision highp float;varying vec2 vUv,vL,vR,vT,vB;';
  var FS={
    adv:HD+'uniform sampler2D uV,uS;uniform vec2 vtexel;uniform float dt,diss;void main(){vec2 c=vUv-dt*texture2D(uV,vUv).xy*vtexel;gl_FragColor=texture2D(uS,c)/(1.+diss*dt);}',
    div:HD+'uniform sampler2D uV;void main(){float L=texture2D(uV,vL).x,R=texture2D(uV,vR).x,T=texture2D(uV,vT).y,B=texture2D(uV,vB).y;vec2 C=texture2D(uV,vUv).xy;if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}',
    curl:HD+'uniform sampler2D uV;void main(){float L=texture2D(uV,vL).y,R=texture2D(uV,vR).y,T=texture2D(uV,vT).x,B=texture2D(uV,vB).x;gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}',
    vort:HD+'uniform sampler2D uV,uC;uniform float k,dt;void main(){float L=texture2D(uC,vL).x,R=texture2D(uC,vR).x,T=texture2D(uC,vT).x,B=texture2D(uC,vB).x,C=texture2D(uC,vUv).x;vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=k*C;f.y*=-1.;vec2 v=texture2D(uV,vUv).xy+f*dt;gl_FragColor=vec4(clamp(v,-1000.,1000.),0.,1.);}',
    pres:HD+'uniform sampler2D uP,uD;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x,d=texture2D(uD,vUv).x;gl_FragColor=vec4((L+R+B+T-d)*.25,0.,0.,1.);}',
    grad:HD+'uniform sampler2D uP,uV;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x;vec2 v=texture2D(uV,vUv).xy-vec2(R-L,T-B);gl_FragColor=vec4(v,0.,1.);}',
    blur:HD+'uniform sampler2D uT;uniform float k;void main(){vec4 c=texture2D(uT,vUv);vec4 n=(texture2D(uT,vL)+texture2D(uT,vR)+texture2D(uT,vT)+texture2D(uT,vB))*.25;gl_FragColor=mix(c,n,k);}',
    clear:HD+'uniform sampler2D uT;uniform float v;void main(){gl_FragColor=v*texture2D(uT,vUv);}',
    splat:HD+'uniform sampler2D uT;uniform vec2 pt;uniform vec3 col;uniform float asp,rad;void main(){vec2 p=vUv-pt;p.x*=asp;gl_FragColor=vec4(texture2D(uT,vUv).xyz+exp(-dot(p,p)/rad)*col,1.);}',
    vortex:HD+'uniform sampler2D uT;uniform vec2 pt;uniform float asp,rad,str;void main(){vec2 p=vUv-pt;p.x*=asp;vec2 v=vec2(-p.y,p.x)/sqrt(rad)*str*exp(-dot(p,p)/rad);gl_FragColor=vec4(texture2D(uT,vUv).xy+v,0.,1.);}',
    stamp:HD+'uniform sampler2D uT,uM;uniform vec2 r0,rs;uniform vec3 col;void main(){vec2 st=(vUv-r0)/rs;float a=0.;if(st.x>0.&&st.x<1.&&st.y>0.&&st.y<1.)a=texture2D(uM,st).a;gl_FragColor=vec4(texture2D(uT,vUv).rgb+col*a,1.);}',
    show:HD+'uniform sampler2D uD,uPap;void main(){vec3 d=max(texture2D(uD,vUv).rgb,0.);vec3 gx=texture2D(uD,vR).rgb-texture2D(uD,vL).rgb,gy=texture2D(uD,vT).rgb-texture2D(uD,vB).rgb;float e=length(vec2(length(gx),length(gy)));vec3 pap=texture2D(uPap,vUv).rgb;float g=dot(pap,vec3(.3333));float m=max(max(d.r,d.g),d.b)+.0001;vec3 a=d*(1.2+(g-.9)*3.)+d/m*min(e*.7,.45);a=min(a,vec3(2.7));gl_FragColor=vec4(pap*exp(-a),1.);}'
  };
  function sh(t,src){var s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
  function prog(name){
    var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FS[name]));
    gl.bindAttribLocation(p,0,'aP');gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
    var u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
    for(var i=0;i<n;i++){var nm=gl.getActiveUniform(p,i).name;u[nm]=gl.getUniformLocation(p,nm)}
    return {p:p,u:u};
  }
  function fbo(w,h){
    var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);
    var f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('fbo');
    gl.viewport(0,0,w,h);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
    return {t:t,f:f,w:w,h:h};
  }
  function dbl(w,h){var o={r:fbo(w,h),w:fbo(w,h),swap:function(){var x=o.r;o.r=o.w;o.w=x}};return o}
  function use(name,target){
    var P=progs[name];gl.useProgram(P.p);
    if(target){gl.bindFramebuffer(gl.FRAMEBUFFER,target.f);gl.viewport(0,0,target.w,target.h);if(P.u.texel)gl.uniform2f(P.u.texel,1/target.w,1/target.h)}
    else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,cv.width,cv.height)}
    return P.u;
  }
  function tex(unit,t,loc){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(loc,unit)}
  function draw(){gl.drawArrays(gl.TRIANGLES,0,6)}
  function mkTex(){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
  function upload(t,src){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false)}

  var api={ok:false};
  api.init=function(canvas){
    try{
      cv=canvas;gl=cv.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false});
      if(!gl)return false;
      gl.getExtension('EXT_color_buffer_float');gl.getExtension('EXT_color_buffer_half_float');
      Object.keys(FS).forEach(function(k){progs[k]=prog(k)});
      buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      gl.disable(gl.BLEND);
      paperTex=mkTex();stampTex=mkTex();
      fbo(4,4);
      api.ok=ok=true;
    }catch(e){api.ok=ok=false}
    return ok;
  };
  api.resize=function(w,h,pxw,pxh,paperCanvas){
    if(!ok)return;
    W=w;H=h;cv.width=pxw;cv.height=pxh;
    var a=w/h,sShort=128,dShort=Math.min(w,h)>700?640:512;
    if(a>=1){simH=sShort;simW=Math.round(sShort*a);dyeH=dShort;dyeW=Math.round(dShort*a)}
    else{simW=sShort;simH=Math.round(sShort/a);dyeW=dShort;dyeH=Math.round(dShort/a)}
    try{vel=dbl(simW,simH);pres=dbl(simW,simH);div=fbo(simW,simH);curl=fbo(simW,simH);dye=dbl(dyeW,dyeH);upload(paperTex,paperCanvas)}
    catch(e){api.ok=ok=false}
  };
  /* x,y in css px; vx,vy in css px per second; col = light soaked up (or null); r in css px */
  api.splat=function(x,y,vx,vy,col,r){
    if(!ok)return;var u,rad=(r/H)*(r/H);
    if(vx||vy){u=use('splat',vel.w);tex(0,vel.r.t,u.uT);gl.uniform2f(u.pt,x/W,1-y/H);gl.uniform3f(u.col,vx*simW/W,-vy*simH/H,0);gl.uniform1f(u.asp,W/H);gl.uniform1f(u.rad,rad);draw();vel.swap()}
    if(col){u=use('splat',dye.w);tex(0,dye.r.t,u.uT);gl.uniform2f(u.pt,x/W,1-y/H);gl.uniform3f(u.col,col[0],col[1],col[2]);gl.uniform1f(u.asp,W/H);gl.uniform1f(u.rad,rad);draw();dye.swap()}
  };
  api.vortex=function(x,y,str,r){
    if(!ok)return;var u=use('vortex',vel.w);tex(0,vel.r.t,u.uT);gl.uniform2f(u.pt,x/W,1-y/H);gl.uniform1f(u.asp,W/H);gl.uniform1f(u.rad,(r/H)*(r/H));gl.uniform1f(u.str,str);draw();vel.swap();
  };
  api.stamp=function(src,x,y,w,h,col){
    if(!ok)return;upload(stampTex,src);
    var u=use('stamp',dye.w);tex(0,dye.r.t,u.uT);tex(1,stampTex,u.uM);
    gl.uniform2f(u.r0,x/W,1-(y+h)/H);gl.uniform2f(u.rs,w/W,h/H);gl.uniform3f(u.col,col[0],col[1],col[2]);draw();dye.swap();
  };
  api.clear=function(){
    if(!ok)return;var u=use('clear',dye.w);tex(0,dye.r.t,u.uT);gl.uniform1f(u.v,0);draw();dye.swap();
  };
  api.step=function(dt){
    if(!ok)return;var u,i;
    u=use('curl',curl);tex(0,vel.r.t,u.uV);draw();
    u=use('vort',vel.w);tex(0,vel.r.t,u.uV);tex(1,curl.t,u.uC);gl.uniform1f(u.k,7);gl.uniform1f(u.dt,dt);draw();vel.swap();
    u=use('div',div);tex(0,vel.r.t,u.uV);draw();
    u=use('clear',pres.w);tex(0,pres.r.t,u.uT);gl.uniform1f(u.v,.8);draw();pres.swap();
    for(i=0;i<14;i++){u=use('pres',pres.w);tex(0,pres.r.t,u.uP);tex(1,div.t,u.uD);draw();pres.swap()}
    u=use('grad',vel.w);tex(0,pres.r.t,u.uP);tex(1,vel.r.t,u.uV);draw();vel.swap();
    u=use('adv',vel.w);tex(0,vel.r.t,u.uV);tex(1,vel.r.t,u.uS);gl.uniform2f(u.vtexel,1/simW,1/simH);gl.uniform1f(u.dt,dt);gl.uniform1f(u.diss,.55);draw();vel.swap();
    u=use('adv',dye.w);tex(0,vel.r.t,u.uV);tex(1,dye.r.t,u.uS);gl.uniform2f(u.vtexel,1/simW,1/simH);gl.uniform1f(u.dt,dt);gl.uniform1f(u.diss,.28);draw();dye.swap();
    u=use('blur',dye.w);tex(0,dye.r.t,u.uT);gl.uniform1f(u.k,Math.min(.5,.22*dt*60));draw();dye.swap();
  };
  api.render=function(){
    if(!ok)return;var u=use('show',null);gl.uniform2f(u.texel,1.5/dyeW,1.5/dyeH);tex(0,dye.r.t,u.uD);tex(1,paperTex,u.uPap);draw();
  };
  return api;
})();

/* ---------- canvas ---------- */
var app=document.getElementById('app'),stage=document.getElementById('stage'),paperC=document.getElementById('paper'),
    fluidC=document.getElementById('fluid'),inkC=document.getElementById('ink'),flash=document.getElementById('flash');
var pctx=paperC.getContext('2d'),ink=inkC.getContext('2d');
var W=0,H=0,S=1,dpr=1,els=[],curC=null,anchor=null,queue=[],lastT=0,flashT=-9;
var still=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
/* LIVE kinds are re-brushed every frame; SWAY bends a painted sprite [amplitude, wave, power] */
var LIVE={fish:1,bird:1,water:1,moon:1,mist:1,wind:1,snow:1,butterfly:1,dragon:1,thunder:1,none:1};
var SWAY={bamboo:[13,.012,1.5],pine:[4,.008,1.6],plum:[5,.02,1.3],grass:[7,.03,1.4],lotus:[6,.015,1.3],willow:[11,.022,1.2]};
G.none=function(){};
if(!still)F.init(fluidC);
if(!F.ok)fluidC.style.display='none';

function drawPaper(){
  var r=rng(7),g=pctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#f5eee0');g.addColorStop(1,'#eee5d2');
  pctx.fillStyle=g;pctx.fillRect(0,0,W,H);
  pctx.lineWidth=.6;
  for(var i=0;i<W*H/900;i++){
    var x=r()*W,y=r()*H,a=r()*TAU,l=4+r()*16;
    pctx.strokeStyle=r()<.5?'rgba(120,96,60,'+(.03+r()*.06)+')':'rgba(255,255,255,'+(.15+r()*.25)+')';
    pctx.beginPath();pctx.moveTo(x,y);pctx.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);pctx.stroke();
  }
  var v=pctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);
  v.addColorStop(0,'rgba(120,90,40,0)');v.addColorStop(1,'rgba(120,90,40,.13)');
  pctx.fillStyle=v;pctx.fillRect(0,0,W,H);
}

function drawOp(c,o,ga){
  var g,i;
  switch(o.k){
  case 0:
    if(o.c!==curC){c.fillStyle='rgb('+o.c+')';curC=o.c}
    c.globalAlpha=o.a*ga;c.beginPath();c.arc(o.x,o.y,o.r,0,TAU);c.fill();break;
  case 1:
    c.globalAlpha=ga;g=c.createLinearGradient(0,o.y0,0,o.y1);
    g.addColorStop(0,'rgba('+o.c+','+o.a+')');g.addColorStop(1,'rgba('+o.c+',0)');
    c.fillStyle=g;c.beginPath();c.moveTo(o.pts[0][0],o.pts[0][1]);
    for(i=1;i<o.pts.length;i++)c.lineTo(o.pts[i][0],o.pts[i][1]);
    c.closePath();c.fill();curC=null;break;
  case 2:
    c.save();c.globalAlpha=ga;if(o.er)c.globalCompositeOperation='destination-out';
    c.translate(o.x,o.y);c.scale(o.sx,1);g=c.createRadialGradient(0,0,0,0,0,o.r);
    g.addColorStop(0,'rgba('+o.c+','+o.a+')');g.addColorStop(.5,'rgba('+o.c+','+o.a*.6+')');g.addColorStop(1,'rgba('+o.c+',0)');
    c.fillStyle=g;c.beginPath();c.arc(0,0,o.r,0,TAU);c.fill();c.restore();curC=null;break;
  case 4:
    c.globalAlpha=ga;c.fillStyle='rgb(248,244,233)';c.beginPath();c.arc(o.x,o.y,o.r,0,TAU);c.fill();
    g=c.createRadialGradient(o.x,o.y,o.r,o.x,o.y,o.r*2.8);
    g.addColorStop(0,'rgba('+o.c+','+o.a+')');g.addColorStop(.35,'rgba('+o.c+','+o.a*.45+')');g.addColorStop(1,'rgba('+o.c+',0)');
    c.fillStyle=g;c.beginPath();c.arc(o.x,o.y,o.r*2.8,0,TAU);c.arc(o.x,o.y,o.r,0,TAU,true);c.fill();curC=null;break;
  }
}

function gen(el,t,now){
  var r=rng(el.seed),P={W:W,H:H,S:S,t:t,now:now||0,el:el,rnd:r,ops:[],stir:[],R:function(a,b){return a+(b-a)*r()}};
  G[el.kind](P,el.ax*W,el.ay*H,el.word);
  return P;
}
function absOf(c,k){var a=ABS[c]||ABS[INK];return [a[0]*k,a[1]*k,a[2]*k]}
function advance(el,n,bleed){
  curC=null;var s0=el.i,e=Math.min(el.ops.length,el.i+n);
  for(;el.i<e;el.i++)drawOp(el.sc,el.ops[el.i],1);
  curC=null;
  /* fresh strokes bleed a little ink into the water */
  if(bleed&&F.ok)for(var b=0;b<1;b++){
    var o=el.ops[s0+Math.floor(Math.random()*(e-s0))];
    if(o&&o.k===0&&o.c!==SNOW)F.splat(o.x,o.y,(Math.random()-.5)*40*S,(Math.random()-.5)*40*S,absOf(o.c,.06*o.a),Math.max(6*S,o.r*3));
  }
}
function build(el,instant){
  if(LIVE[el.kind]){el.spr=null;return}
  var P=gen(el,0),x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,i,j,o,rx;
  el.ops=P.ops;el.ang=P.ang;
  for(i=0;i<P.ops.length;i++){o=P.ops[i];
    if(o.k===1){for(j=0;j<o.pts.length;j++){x0=Math.min(x0,o.pts[j][0]);x1=Math.max(x1,o.pts[j][0]);y0=Math.min(y0,o.pts[j][1]);y1=Math.max(y1,o.pts[j][1])}continue}
    rx=o.r*(o.sx||1);
    x0=Math.min(x0,o.x-rx);x1=Math.max(x1,o.x+rx);y0=Math.min(y0,o.y-o.r);y1=Math.max(y1,o.y+o.r);
  }
  if(el.kind==='rain'){x0=-W*.5;x1=W*1.5;y0=0;y1=H}
  if(el.kind==='ai'){x0=el.cx-el.B*.62;x1=el.cx+el.B*.62;y0=el.cy-el.B*.62;y1=el.cy+el.B*.62}
  x0=Math.max(Math.floor(x0)-3,-Math.ceil(W*.5)-10);x1=Math.min(Math.ceil(x1)+3,Math.ceil(W*1.5)+10);
  y0=Math.max(Math.floor(y0)-3,-40);y1=Math.min(Math.ceil(y1)+3,Math.ceil(H)+20);
  if(!(x1>x0))x1=x0+1;if(!(y1>y0))y1=y0+1;
  var c=document.createElement('canvas');c.width=(x1-x0)*dpr;c.height=(y1-y0)*dpr;
  el.spr=c;el.sc=c.getContext('2d');el.sc.setTransform(dpr,0,0,dpr,-x0*dpr,-y0*dpr);
  el.bx=x0;el.by=y0;el.bw=x1-x0;el.bh=y1-y0;el.i=0;
  if(instant)advance(el,1e9,false);
}
function drawSpr(el,T,gust){
  var sw=SWAY[el.kind]||el.sw;
  if(!sw||still){ink.drawImage(el.spr,el.bx,el.by,el.bw,el.bh);return}
  var sl=3,A=sw[0]*S*gust,ph=el.seed%100,ref=Math.max(el.bh,200*S),k=sw[1]/S;
  for(var sy=0;sy<el.bh;sy+=sl){
    var hp=el.bh-sy,h=Math.min(sl,hp);
    var off=A*Math.pow(hp/ref,sw[2])*(Math.sin(T*1.1-hp*k+ph)+.4*Math.sin(T*2.3-hp*k*2.2+ph));
    ink.drawImage(el.spr,0,sy*dpr,el.bw*dpr,h*dpr,el.bx+off,el.by+sy,el.bw,h);
  }
}

/* what each kind does to the fluid, every frame */
var FX={
  fire:function(el,T,dt,now){
    var x=el.ax*W,y=el.ay*H,k=dt*60;
    for(var i=0;i<2;i++){
      var jx=(Math.random()-.5)*30*S,a=(.018+Math.random()*.022)*k;
      F.splat(x+jx,y-6*S,(Math.random()-.5)*90*S,-(150+Math.random()*110)*S,i?[.05*a,.55*a,a]:[.16*a,.95*a,a],(11+Math.random()*8)*S);
    }
    if(Math.random()<.25*k)F.splat(x+(Math.random()-.5)*40*S,y-70*S,0,-80*S,[.012,.012,.012],26*S);
  },
  mist:function(el,T,dt){
    if(Math.random()>.5*dt*60)return;
    var d=el.seed%2?1:-1,a=.012+Math.random()*.009;
    F.splat((el.ax+(Math.random()-.5)*.95)*W,el.ay*H+(Math.random()-.5)*70*S,d*(18+Math.random()*24)*S,(Math.random()-.5)*8*S,[a,a,a],(55+Math.random()*50)*S);
  },
  wind:function(el,T,dt){
    var d=el.seed%2?1:-1,g=.55+.45*Math.sin(T*.6+el.seed%9),y=Math.random()*H,x=Math.random()*W;
    F.splat(x,y,d*(260+Math.random()*200)*S*g,(Math.random()-.5)*60*S,null,(90+Math.random()*80)*S);
    if(Math.random()<.2*dt*60){var a=.035+Math.random()*.03;F.splat(d>0?Math.random()*W*.3:W-Math.random()*W*.3,y,d*500*S,0,[a,a,a],(7+Math.random()*7)*S)}
  },
  thunder:function(el,T,dt,now){
    var x=el.ax*W,y=el.ay*H,a=.016+Math.random()*.012;
    if(Math.random()<.6*dt*60)F.splat(x+(Math.random()-.5)*300*S,y+(Math.random()-.5)*40*S,(Math.random()-.5)*50*S,(Math.random()-.5)*20*S,[a,a,a],(40+Math.random()*40)*S);
    var k=Math.floor((now-el.born-1)/6.5);
    if(k>=0&&k!==el.lastK){
      el.lastK=k;
      var r=rng(el.seed+k*977),px=x+(r()-.5)*220*S,py=y+20*S,end=y+(.4+r()*.3)*H,pts=[[px,py]],forks=[];
      while(py<end){py+=(18+r()*30)*S;px+=(r()-.5)*70*S;pts.push([px,py]);
        if(r()<.22){var fx=px,fy=py,f=[[fx,fy]],d=r()<.5?-1:1;for(var j=0;j<3;j++){fx+=d*(14+r()*26)*S;fy+=(12+r()*22)*S;f.push([fx,fy])}forks.push(f)}}
      el.bolt={pts:pts,forks:forks,t0:now};flashT=now;
      pts.forEach(function(p){F.splat(p[0],p[1],(Math.random()-.5)*300*S,(Math.random()-.5)*300*S,[.22,.22,.22],9*S)});
    }
  }
};

function frame(ms){
  requestAnimationFrame(frame);
  if(!W)return;
  var now=ms/1000,T=still?0:now,dt=Math.min(.034,Math.max(.008,now-lastT)),i,j,windy=false;lastT=now;
  while(queue.length&&queue[0].at<=now)queue.shift().fn();
  for(j=0;j<els.length;j++)if(els[j].kind==='wind')windy=true;
  var gust=(.6+.4*Math.sin(T*.21)*Math.sin(T*.083+1))*(windy?2.1:1);
  ink.setTransform(dpr,0,0,dpr,0,0);ink.globalAlpha=1;ink.clearRect(0,0,W,H);
  for(j=0;j<els.length;j++){
    var el=els[j],age=now-el.born;
    if(age<0)continue;
    if(F.ok&&FX[el.kind])FX[el.kind](el,T,dt,now);
    if(LIVE[el.kind]){
      var P=gen(el,T,now),ops=P.ops,ga=still?1:Math.min(1,age/1.4);
      curC=null;for(i=0;i<ops.length;i++)drawOp(ink,ops[i],ga);curC=null;ink.globalAlpha=1;
      if(F.ok)for(i=0;i<P.stir.length;i++){var s=P.stir[i];var sd=s[5]?s[5]*dt*60:0;F.splat(s[0],s[1],s[2],s[3],sd?[sd,sd,sd]:null,s[4])}
      continue;
    }
    if(el.i<el.ops.length)advance(el,still?1e9:Math.max(30,Math.ceil(el.ops.length/110)),!still);
    if(el.kind==='rain'){
      var k=Math.cos(el.ang)/Math.sin(el.ang),oy=(T*240*S)%H,ox=oy*k;
      ink.globalAlpha=still?1:Math.min(1,age/1.5);
      ink.drawImage(el.spr,el.bx+ox,oy,el.bw,el.bh);ink.drawImage(el.spr,el.bx+ox-H*k,oy-H,el.bw,el.bh);
      ink.globalAlpha=1;continue;
    }
    if((el.kind==='boat'||el.float)&&!still){
      ink.save();
      ink.translate(el.bx+el.bw/2+12*S*Math.sin(T*.09+el.seed%7),el.by+el.bh/2+1.6*S*Math.sin(T*1.3));
      ink.rotate(.028*Math.sin(T*1.1));ink.drawImage(el.spr,-el.bw/2,-el.bh/2,el.bw,el.bh);ink.restore();
    }else drawSpr(el,T,gust);
  }
  if(F.ok)for(i=0;i<AI.pending.length;i++){var pd=AI.pending[i];if(now>pd.next){pd.next=now+.7;F.vortex(pd.x,pd.y,(pd.k++%2?1:-1)*42,70*S);F.splat(pd.x,pd.y,0,0,[.045,.045,.045],20*S)}}
  var fl=Math.max(0,1-(now-flashT)/.4);flash.style.opacity=fl>0?(.6*fl*fl).toFixed(3):0;
  if(F.ok){
    if(Math.random()<.03)F.splat(Math.random()*W,Math.random()*H,(Math.random()-.5)*70*S,(Math.random()-.5)*50*S,null,(120+Math.random()*80)*S);
    F.step(dt);F.render();
  }
}
function resize(){
  var b=stage.getBoundingClientRect();if(b.width<2||b.height<2)return;
  if(Math.abs(b.width-W)<1&&Math.abs(b.height-H)<1)return;
  W=b.width;H=b.height;dpr=(window.devicePixelRatio||1)>=1.5?2:1;S=Math.max(.6,Math.min(1.6,Math.min(W,H)/520));
  [paperC,inkC].forEach(function(c){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr)});
  pctx.setTransform(dpr,0,0,dpr,0,0);drawPaper();
  F.resize(W,H,paperC.width,paperC.height,paperC);
  if(!F.ok)fluidC.style.display='none';
  els.forEach(function(el){build(el,true)});
}

/* ---------- a written character, dropped into the water as ink ---------- */
var gcv=document.createElement('canvas'),gctx=gcv.getContext('2d');
function dropGlyph(text,x,y,col){
  if(!F.ok)return;
  var cjk=/[⺀-鿿]/.test(text),fs=cjk?Math.min(104*S,W*.8/text.length):Math.min(64*S,W*1.5/text.length);
  var font=fs+'px "Ma Shan Zheng","LXGW WenKai TC","Kaiti TC","BiauKai","DFKai-SB",STKaiti,"Cormorant Garamond",serif';
  gctx.font=font;var tw=Math.ceil(gctx.measureText(text).width)+20,th=Math.ceil(fs*1.4);
  gcv.width=tw;gcv.height=th;gctx.font=font;gctx.textAlign='center';gctx.textBaseline='middle';gctx.fillStyle='#000';
  gctx.fillText(text,tw/2,th/2);
  x=Math.min(Math.max(x,tw/2+6),W-tw/2-6);y=Math.min(Math.max(y,th/2+6),H-th/2-6);
  F.stamp(gcv,x-tw/2,y-th/2,tw,th,absOf(col||INK,1.9));
  var t0=performance.now()/1000,sg=Math.random()<.5?-1:1,r=fs*.55;
  queue.push({at:t0+.55,fn:function(){F.vortex(x-r*.35,y,sg*85,r);F.vortex(x+r*.4,y+r*.1,-sg*60,r*.8)}});
  queue.push({at:t0+1.1,fn:function(){F.vortex(x,y-r*.2,sg*45,r*1.4);F.splat(x,y,(Math.random()-.5)*160*S,(Math.random()-.5)*120*S,null,r)}});
  queue.sort(function(a,b){return a.at-b.at});
}

/* ---------- UI ---------- */
var q=document.getElementById('q'),hint=document.getElementById('hint'),pin=document.getElementById('pin'),bottom=document.getElementById('bottom'),
    toast=document.getElementById('toast'),undoB=document.getElementById('undo'),clearB=document.getElementById('clear'),fullB=document.getElementById('full'),tt=0,used=false;
function say(m,sticky){toast.textContent=m;toast.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('on')},sticky?90000:3600)}
function sync(){undoB.disabled=clearB.disabled=!els.length;hint.classList.toggle('off',used)}


/* ---------- AI painting: words outside the bank are painted by Claude, stroke by stroke ---------- */
var AICOL={black:[INK,.82],grey:[INK,.42],pale:[INK,.2],red:[RED,.75],orange:[KOI,.7],pink:[PINK,.6],green:['70,104,78',.62],blue:['58,84,122',.62],yellow:['196,154,52',.68],brown:['110,78,52',.66]};
ABS['70,104,78']=[.7,.4,.7];ABS['58,84,122']=[.8,.6,.35];ABS['196,154,52']=[.1,.3,.8];ABS['110,78,52']=[.5,.7,.85];
var MODELS={
  haiku:{label:'快（Haiku）',opts:{model:'claude-haiku-5-5',modelTier:'quick'}},
  sonnet:{label:'平衡（Sonnet）',opts:{model:'claude-sonnet-5-5',modelTier:'default',effort:'low'}},
  opus:{label:'精細（Opus）',opts:{model:'claude-opus-5-5',modelTier:'complex',effort:'low'}},
  fable:{label:'最精細（Fable）',opts:{model:'claude-fable-5-2',modelTier:'complex',effort:'low'}}
};
var AI={on:false,fn:null,model:'sonnet',jobs:0,pending:[],cache:{},last:''};
try{var sm=localStorage.getItem('inkwords.model');if(sm&&MODELS[sm])AI.model=sm;AI.cache=JSON.parse(localStorage.getItem('inkwords.ai.v1')||'{}')||{}}catch(e){AI.cache={}}
function aiSave(){try{var ks=Object.keys(AI.cache);while(ks.length>60)delete AI.cache[ks.shift()];localStorage.setItem('inkwords.ai.v1',JSON.stringify(AI.cache))}catch(e){}}
function aiPrompt(w){
  return 'You are an ink-wash (sumi-e) painter. Paint "'+w+'" as a small, instantly recognisable brush painting for a school open day.\n\n'
  +'Canvas: 100 x 100 units, x to the right, y DOWN. Keep the subject within 8..92 and make it fill most of that area.\n\n'
  +'Reply with ONLY compact JSON objects, one per line, no other text, no code fence.\n'
  +'Line 1: {"zh":"<Traditional Chinese name, at most 4 characters>","motion":"sway"|"float"|"none"}  (sway = plants and things that bend in wind; float = things that hover, fly or drift on water; none = everything else)\n'
  +'Then 14 to 34 lines, painted back to front (pale washes first, bold shapes next, small dark details last). Each line is one of:\n'
  +'{"p":[[x,y],[x,y],...],"w":4,"c":"black","t":"both"}  a brush stroke through 2-9 points; it is smoothed into a curve, add "sharp":true to keep corners. w = width in canvas units, 0.6 (hairline) to 10 (very broad). t = taper: "both" (thin-fat-thin), "end" (fat to thin), "start" (thin to fat), "none".\n'
  +'{"wash":[x,y,r],"c":"pale"}  a soft blot of diluted ink with radius r\n'
  +'{"dot":[x,y,r],"c":"black"}  a solid dot\n'
  +'Colours: black, grey, pale, red, orange, pink, green, blue, yellow, brown. Mostly black and grey, with at most two accent colours.\n\n'
  +'Rules: build solid forms from a few broad strokes (w 5-10) rather than thin outlines; get the silhouette and proportions right first; no letters, numbers or text; integer coordinates are fine.\n'
  +'If "'+w+'" cannot be painted, or is not suitable for children, reply with the single line {"no":1}.\n\n'
  +'Example for "mug":\n{"zh":"杯子","motion":"none"}\n{"wash":[48,60,30],"c":"pale"}\n{"p":[[30,35],[32,80],[66,80],[68,35]],"w":7,"c":"black","t":"none","sharp":true}\n{"p":[[68,45],[86,48],[84,68],[67,70]],"w":4,"c":"black","t":"both"}\n{"p":[[30,35],[49,31],[68,35]],"w":3,"c":"grey","t":"both"}\n{"p":[[44,24],[40,16],[46,9]],"w":1.5,"c":"pale","t":"end"}';
}
function mkP(seed){var r=rng(seed);return {W:W,H:H,S:S,t:0,now:0,rnd:r,ops:[],stir:[],R:function(a,b){return a+(b-a)*r()}}}
function aiBox(el){
  el.B=Math.min(300*S,W*.72,H*.55);
  el.cx=Math.min(Math.max(el.ax*W,el.B*.62),W-el.B*.62);el.cy=Math.min(Math.max(el.ay*H,el.B*.62+40),H-el.B*.62-70);
}
function num(v,lo,hi,d){v=+v;if(!(v===v))v=d;return Math.min(hi,Math.max(lo,v))}
/* one shape from Claude -> brush ops, appended to out */
function shapeOps(el,sh,idx,out){
  var P=mkP(el.seed+idx*7919),u=el.B/100,col=AICOL[sh.c]||AICOL.black,i;
  function X(v){return el.cx+(num(v,-8,108,50)-50)*u}function Y(v){return el.cy+(num(v,-8,108,50)-50)*u}
  if(Array.isArray(sh.wash))wash(P,X(sh.wash[0]),Y(sh.wash[1]),num(sh.wash[2],2,55,15)*u,Math.min(.4,col[1]*.6),col[0],1);
  else if(Array.isArray(sh.dot))dot(P,X(sh.dot[0]),Y(sh.dot[1]),num(sh.dot[2],.3,12,1.5)*u,col[1],col[0]);
  else if(Array.isArray(sh.p)){
    var pts=[];for(i=0;i<sh.p.length&&i<24;i++)if(Array.isArray(sh.p[i]))pts.push([X(sh.p[i][0]),Y(sh.p[i][1])]);
    if(pts.length<2)return;
    if(pts.length>2&&!sh.sharp)pts=chaikin(pts,2);
    var w=num(sh.w,.4,14,3)*u,t=sh.t,wf=t==='none'?function(){return w}:t==='end'?function(q){return w*(1-.85*q)+.4}:t==='start'?function(q){return w*(.15+.85*q)+.4}:function(q){return w*(.25+.75*Math.sin(PI*q))};
    stroke(P,pts,wf,{a:col[1],c:col[0],dry:w>5*u?.3:0,edge:w>4*u?.4:0});
  }
  for(i=0;i<P.ops.length;i++)out.push(P.ops[i]);
}
G.ai=function(P){var el=P.el;aiBox(el);for(var i=0;i<el.shapes.length;i++)shapeOps(el,el.shapes[i],i,P.ops)};
function aiAdd(el,sh){if(el.shapes.length>=60)return;el.shapes.push(sh);shapeOps(el,sh,el.shapes.length-1,el.ops)}
function aiMeta(el,o){if(o.motion==='sway')el.sw=[6,.02,1.3];else if(o.motion==='float')el.float=true;if(typeof o.zh==='string')el.zh=o.zh.slice(0,6)}
var AIERR={not_granted:'這裡沒有開放 AI 作畫。',sampling_disabled:'這個帳號用不到 AI 作畫。',not_declared:'這個頁面沒有開啟 AI 作畫。',capability_disabled:'這裡用不到 AI 作畫。',capability_removed:'這裡用不到 AI 作畫。',
  rate_limited:'墨用得太快了，等一下再試。',session_expired:'請重新登入 Claude 再試。',refused:'這個字，墨不畫。'};
function aiPaint(word,ax,ay,delay){
  var now=performance.now()/1000,el={kind:'ai',word:word,seed:(Math.random()*2147483647)|0,ax:ax,ay:ay,i:0,ops:[],shapes:[],lastK:-1,born:now+delay+.9};
  build(el,false);els.push(el);
  var hit=AI.cache[word];
  if(hit){aiMeta(el,hit.meta||{});hit.shapes.forEach(function(s){aiAdd(el,s)});return el}
  if(AI.jobs>=2){els.splice(els.indexOf(el),1);say('墨還在畫上一個字，等一下再試。');return null}
  AI.jobs++;var pend={x:el.cx,y:el.cy,next:now+delay+1.2,k:0};AI.pending.push(pend);
  say('墨正在想「'+word+'」怎麼畫…',true);
  var buf='',t0=performance.now(),meta={},no=false;
  function unpend(){var i=AI.pending.indexOf(pend);if(i>=0)AI.pending.splice(i,1)}
  function line(s){
    s=s.trim().replace(/,$/,'');if(s[0]!=='{')return;var o;try{o=JSON.parse(s)}catch(e){return}
    if(!o||typeof o!=='object')return;
    if(o.no){no=true;return}
    if(o.zh||o.motion){meta={zh:o.zh,motion:o.motion};aiMeta(el,o);return}
    if(o.p||o.wash||o.dot){if(!el.shapes.length)unpend();aiAdd(el,o)}
  }
  function drop(){var i=els.indexOf(el);if(i>=0)els.splice(i,1);sync()}
  var opts={onText:function(u){buf+=u.delta;var parts=buf.split('\n');buf=parts.pop();parts.forEach(line)}},mo=MODELS[AI.model].opts;
  for(var k in mo)opts[k]=mo[k];
  AI.fn(aiPrompt(word),opts).then(function(res){
    line(buf);unpend();AI.jobs--;
    var secs=((performance.now()-t0)/1000).toFixed(1);
    AI.last='上次：「'+word+'」'+secs+' 秒，'+(res&&res.modelApplied?res.modelApplied:'層級 '+(res&&res.modelTierApplied||'?'))+'，'+el.shapes.length+' 筆';aiPanel();
    if(no||el.shapes.length<3){drop();say('墨畫不出「'+word+'」，換一個字試試。');return}
    AI.cache[word]={meta:meta,shapes:el.shapes.slice()};aiSave();
    say('「'+word+'」畫好了（'+secs+' 秒）');
  },function(e){
    unpend();AI.jobs--;var code=e&&e.code;
    if(el.shapes.length<5)drop();
    if(code==='not_granted'||code==='sampling_disabled'||code==='not_declared'||code==='capability_disabled'||code==='capability_removed'){AI.on=false;aiUI()}
    AI.last='上次：「'+word+'」失敗（'+(code||'未知')+'）';aiPanel();
    say(AIERR[code]||'墨一時畫不出「'+word+'」，再試一次。');
  });
  return el;
}
function aiUI(){
  var b=document.getElementById('aibadge');if(b)b.hidden=!AI.on;
  q.placeholder=AI.on?'輸入任何字… 茶壺、恐龍、竹':'輸入一個字… 竹、zhu、bamboo';
  hint.innerHTML=AI.on?'輸入任何字，或點選下方的字，墨就會把它畫出來。<br>在紙上拖動手指，可以攪動墨水。':'輸入一個字，或點選下方的字，墨就會化成它。<br>在紙上拖動手指，可以攪動墨水。';
}
function aiPanel(){
  var p=document.getElementById('panel');if(!p||p.hidden)return;
  p.innerHTML='';
  var h=document.createElement('strong');h.textContent='AI 作畫設定';p.appendChild(h);
  var s=document.createElement('p');s.textContent=AI.on?'字庫以外的字由 Claude 當場畫。選一個模型：':'這裡沒有連上 Claude，只能畫字庫裡的字。';p.appendChild(s);
  if(AI.on)Object.keys(MODELS).forEach(function(k){
    var l=document.createElement('label'),r=document.createElement('input');r.type='radio';r.name='model';r.checked=AI.model===k;
    r.addEventListener('change',function(){AI.model=k;try{localStorage.setItem('inkwords.model',k)}catch(e){}});
    l.appendChild(r);l.appendChild(document.createTextNode(' '+MODELS[k].label));p.appendChild(l);
  });
  if(AI.last){var t=document.createElement('p');t.className='last';t.textContent=AI.last;p.appendChild(t)}
  var row=document.createElement('div');row.className='row';
  var c=document.createElement('button');c.type='button';c.className='ghost';c.textContent='忘記畫過的字';
  c.addEventListener('click',function(){AI.cache={};aiSave();say('已忘記 AI 畫過的字，下次會重新畫。')});
  var x=document.createElement('button');x.type='button';x.className='ghost';x.textContent='關閉';x.addEventListener('click',function(){p.hidden=true});
  row.appendChild(c);row.appendChild(x);p.appendChild(row);
}

function paint(text){
  /* split on punctuation into phrases; a phrase made only of bank words paints each word, anything else goes to the AI as one phrase */
  var items=[],unknown=[];
  String(text).toLowerCase().split(/[,，、。;；\n]+/).forEach(function(ph){
    ph=ph.replace(/["\\<>{}]/g,'').trim();if(!ph)return;
    var toks=ph.split(/\s+/),kinds=toks.map(lookup);
    if(kinds.every(Boolean))toks.forEach(function(w,i){items.push({w:w,kind:kinds[i]})});
    else if(AI.on)items.push({w:ph.slice(0,30),kind:null});
    else toks.forEach(function(w,i){items.push({w:w.slice(0,16),kind:kinds[i]})});
  });
  items=items.slice(0,6);
  if(!items.length)return;
  if(!W)resize();
  used=true;
  items.forEach(function(it,n){
    var w=it.w,kind=it.kind,d=DEF[kind||'none'],ax,ay;
    if(anchor&&n===0){ax=anchor.x;ay=anchor.y}else{ax=d[0]+Math.random()*(d[1]-d[0]);ay=d[2]+Math.random()*(d[3]-d[2])}
    var delay=n*1.1,gx=ax*W,gy=ay*H,glyph=kind?BANK[kind][0]:w,col=GCOL[kind];
    if(kind==='rain'||kind==='snow'||kind==='wind'){gx=W*(.3+Math.random()*.4);gy=H*.32}
    if(!kind&&AI.on){var ael=aiPaint(w,ax,ay,delay);if(!ael)return;gx=ael.cx;gy=ael.cy}
    else if(!kind)unknown.push(w);
    function drop(){dropGlyph(glyph,gx,gy,col)}
    if(F.ok){
      var go=function(){if(delay){queue.push({at:performance.now()/1000+delay,fn:drop});queue.sort(function(a,b){return a.at-b.at})}else drop()};
      if(document.fonts&&document.fonts.load)Promise.race([Promise.all([document.fonts.load('80px "Ma Shan Zheng"',glyph),document.fonts.load('80px "LXGW WenKai TC"',glyph)]),new Promise(function(r){setTimeout(r,1200)})]).then(go,go);else go();
    }
    if(!kind)return;
    var el={kind:kind,word:w,seed:(Math.random()*2147483647)|0,ax:ax,ay:ay,i:0,ops:[],lastK:-1,born:performance.now()/1000+delay+(F.ok?.9:0)};
    build(el,still);els.push(el);
  });
  anchor=null;pin.classList.remove('on');
  if(unknown.length)say(F.ok?'墨還不認識「'+unknown.join('、')+'」，只好隨水散去。':'墨還不認識「'+unknown.join('、')+'」。');
  sync();
}

document.getElementById('f').addEventListener('submit',function(e){
  e.preventDefault();paint(q.value);q.value='';
  if(window.matchMedia&&matchMedia('(pointer:coarse)').matches)q.blur();
});
var coarse=window.matchMedia&&matchMedia('(pointer:coarse)').matches;
q.addEventListener('focus',function(){if(coarse)bottom.classList.add('typing')});
q.addEventListener('blur',function(){bottom.classList.remove('typing')});
document.addEventListener('keydown',function(e){
  if(document.activeElement!==q&&e.key&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&/\S/.test(e.key))q.focus();
});
var chips=document.getElementById('chips');
Object.keys(BANK).forEach(function(k){
  var b=document.createElement('button');b.type='button';b.className='chip';
  var c=document.createElement('b');c.textContent=BANK[k][0];var l=document.createElement('i');l.textContent=k;
  b.appendChild(c);b.appendChild(l);b.addEventListener('click',function(){paint(k)});chips.appendChild(b);
});
undoB.addEventListener('click',function(){els.pop();sync()});
clearB.addEventListener('click',function(){els=[];queue=[];F.clear();sync()});
/* tap the seal three times to open the AI settings */
var markTaps=[];
document.getElementById('mark').addEventListener('click',function(){
  var n=performance.now();markTaps=markTaps.filter(function(x){return n-x<900});markTaps.push(n);
  if(markTaps.length>=3){markTaps=[];var p=document.getElementById('panel');p.hidden=!p.hidden;aiPanel()}
});
if(!app.requestFullscreen||!document.fullscreenEnabled)fullB.style.display='none';
fullB.addEventListener('click',function(){
  try{var p=document.fullscreenElement?document.exitFullscreen():app.requestFullscreen();if(p&&p.catch)p.catch(function(){say('這裡無法使用全螢幕。')})}
  catch(err){say('這裡無法使用全螢幕。')}
});
document.addEventListener('fullscreenchange',function(){fullB.textContent=document.fullscreenElement?'退出全螢幕':'全螢幕'});

/* fingers: tap to choose a spot, drag to stir the ink */
var ptr={};
function pos(e){var b=stage.getBoundingClientRect();return [e.clientX-b.left,e.clientY-b.top]}
stage.addEventListener('pointerdown',function(e){
  var p=pos(e);ptr[e.pointerId]={x:p[0],y:p[1],x0:p[0],y0:p[1],moved:false,t:performance.now()};
  try{stage.setPointerCapture(e.pointerId)}catch(err){}
});
stage.addEventListener('pointermove',function(e){
  var s=ptr[e.pointerId];if(!s)return;
  var p=pos(e),dx=p[0]-s.x,dy=p[1]-s.y,now=performance.now(),dt=Math.max(8,now-s.t)/1000;
  if(Math.hypot(p[0]-s.x0,p[1]-s.y0)>10)s.moved=true;
  if(s.moved&&(dx||dy)){
    var a=Math.min(.09,.02+Math.hypot(dx,dy)*.004);
    F.splat(p[0],p[1],Math.max(-1500,Math.min(1500,dx/dt*.7)),Math.max(-1500,Math.min(1500,dy/dt*.7)),[a,a,a],15*S);
    if(!used){used=true;sync()}
  }
  s.x=p[0];s.y=p[1];s.t=now;
});
function up(e){
  var s=ptr[e.pointerId];if(!s)return;delete ptr[e.pointerId];
  if(!s.moved){anchor={x:s.x/W,y:s.y/H};pin.style.left=s.x+'px';pin.style.top=s.y+'px';pin.classList.add('on')}
}
stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',function(e){delete ptr[e.pointerId]});
fluidC.addEventListener('webglcontextlost',function(e){e.preventDefault();F.ok=false;fluidC.style.display='none'});

var rt=0;
window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(resize,120)});
if(window.ResizeObserver)new ResizeObserver(function(){clearTimeout(rt);rt=setTimeout(resize,120)}).observe(stage);
if(document.fonts&&document.fonts.load)document.fonts.load('80px "LXGW WenKai TC"','墨山月竹魚鳥龍風霧').catch(function(){});
resize();sync();requestAnimationFrame(frame);
/* inside Claude, the page can ask Claude to paint words that are not in the bank */
if(window.claude&&typeof window.claude.use==='function'){try{window.claude.use('sample').then(function(s){if(typeof s==='function'){AI.fn=s;AI.on=true;aiUI();aiPanel()}},function(){})}catch(e){}}
window.__ink={paint:paint,els:function(){return els},fluid:function(){return F.ok},ai:function(){return AI}};
})();
