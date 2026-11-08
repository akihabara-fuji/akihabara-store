(function(){
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var ids=['home','karya','about','skills','experience','kontak'],cur='home';
var drawer=$('.drawer'),burger=$('.burger');
function closeDrawer(){drawer.classList.remove('open');burger.classList.remove('x');burger.setAttribute('aria-expanded','false');drawer.setAttribute('aria-hidden','true')}
var main=$('main'),rmq=matchMedia('(prefers-reduced-motion:reduce)').matches;
var done=0;
function setActive(id){
  if(id===cur&&done)return;
  cur=id;done=1;
  $$('.nl').forEach(function(a){a.classList.toggle('on',a.getAttribute('data-go')===id)});
  document.title=(id==='home'?'Dika Priyadi – AI Automation & Digital Solutions Builder':({about:'Tentang',skills:'Keahlian',experience:'Pengalaman',karya:'Karya',kontak:'Kontak'}[id]||id)+' – Dika Priyadi');
}
function show(id,push,instant){
  if(ids.indexOf(id)<0)id='home';
  var s=document.getElementById(id);
  main.scrollTo({top:id==='home'?0:s.offsetTop,behavior:(instant||rmq)?'auto':'smooth'});
  setActive(id);
  if(push!==false&&location.hash!=='#'+id)history.pushState(null,'','#'+id);
  closeDrawer();
}
var ticking=0;
function spy(){
  ticking=0;
  var y=main.scrollTop+main.clientHeight*.4,id='home';
  ids.forEach(function(k){var e=document.getElementById(k);if(e&&e.offsetTop<=y)id=k});
  setActive(id);
  if(id!=='home'&&(location.hash||'')!=='#'+id)history.replaceState(null,'','#'+id);
  else if(id==='home'&&location.hash&&location.hash!=='#home')history.replaceState(null,'','#home');
}
main.addEventListener('scroll',function(){if(!ticking){ticking=1;requestAnimationFrame(spy)}},{passive:true});
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target)}})},{root:main,threshold:.15});
  $$('.screen').forEach(function(s){io.observe(s)});
}else $$('.screen').forEach(function(s){s.classList.add('on')});
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('[data-go]');
  if(a){e.preventDefault();show(a.getAttribute('data-go'));
    var pk=a.getAttribute('data-pick');if(pk!==null){var r=$$('.krow')[+pk];if(r)r.click()}
    if(document.activeElement&&document.activeElement.blur&&a.closest('.ddm'))document.activeElement.blur()}
});
window.addEventListener('popstate',function(){show((location.hash||'#home').slice(1),false)});
burger.addEventListener('click',function(){
  var open=!drawer.classList.contains('open');
  drawer.classList.toggle('open',open);burger.classList.toggle('x',open);
  burger.setAttribute('aria-expanded',open?'true':'false');drawer.setAttribute('aria-hidden',open?'false':'true');
});
/* hero: tiga pose sinkron dengan progres scroll */
(function(){
var sc=$('main'),hs=$('.hs'),hk=$('.hk'),poses=$$('.pose'),A=$('.hl-a'),B=$('.hl-b'),sd=$('.side'),vt=$('.vt'),hint=$('.hint'),dots=$$('.dots button'),n=poses.length;
if(!sc||!n)return;
var hx=poses.map(function(p){return +p.getAttribute('data-hx')||.5});
poses.forEach(function(p,i){p.style.transformOrigin=(hx[i]*100)+'% 100%'});
var mq=matchMedia('(max-width:860px)'),rm=matchMedia('(prefers-reduced-motion:reduce)').matches,tgt=0,cur=0,raf=0,lastOn=-1;
function sm(a,b,x){x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)}
function draw(p){
  var mob=mq.matches,mx=mob?0:innerWidth*.31;
  var inB=sm(.14,.3,p),outB=sm(.52,.68,p),shift=-mx*(inB-outB);
  poses.forEach(function(el,i){el.style.opacity=1;el.style.transform='translate3d('+(-hx[i]*100)+'%,0,0) translate3d('+shift.toFixed(1)+'px,0,0) scale('+(1+.03*(inB-outB)).toFixed(4)+')'});
  var tb=inB*(1-outB);B.style.opacity=tb.toFixed(3);B.style.transform=(mob?'':'translateY(-50%) ')+'translate3d(0,'+((1-tb)*30).toFixed(1)+'px,0)';
  B.style.visibility=tb<.02?'hidden':'visible';B.setAttribute('aria-hidden',tb<.5?'true':'false');
  $$('a',B).forEach(function(a){a.tabIndex=tb<.5?-1:0});
  var ta=sm(.66,.84,p);A.style.opacity=ta.toFixed(3);A.style.transform='translate3d(0,'+((1-ta)*34).toFixed(1)+'px,0)';A.style.visibility=ta<.02?'hidden':'visible';
  var ts=1-sm(.06,.2,p);if(sd){sd.style.opacity=ts.toFixed(3);sd.style.visibility=ts<.02?'hidden':'visible'}
  if(vt)vt.style.opacity=ts.toFixed(3);
  var st=p<.4?0:(p<.72?1:2);
  if(st!==lastOn){lastOn=st;dots.forEach(function(d,i){d.classList.toggle('on',i===st)})}
}
function frame(){cur+=(tgt-cur)*(rm?1:.13);if(Math.abs(tgt-cur)<.0005)cur=tgt;draw(cur);raf=cur===tgt?0:requestAnimationFrame(frame)}
function span(){return hs.offsetHeight-hk.clientHeight}
function read(){var m=span();tgt=m>0?Math.min(1,sc.scrollTop/m):0;if(!raf)raf=requestAnimationFrame(frame)}
sc.addEventListener('scroll',read,{passive:true});addEventListener('resize',function(){read();draw(cur)});
dots.forEach(function(d,i){d.addEventListener('click',function(){var m=span();sc.scrollTo({top:m*[.02,.46,.98][i],behavior:rm?'auto':'smooth'})})});
draw(0);read();
})();
/* karya */
$$('.krow').forEach(function(b){b.addEventListener('click',function(){
  var k=b.getAttribute('data-k');
  $$('.krow').forEach(function(x){x.classList.toggle('on',x===b)});
  $$('.kdet').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-k')===k)});
})});
/* baca lengkap */
$$('[data-more]').forEach(function(b){b.addEventListener('click',function(){
  var m=b.parentNode.querySelector('.more');if(!m)return;
  var h=m.hasAttribute('hidden');if(h)m.removeAttribute('hidden');else m.setAttribute('hidden','');
  b.firstChild.nodeValue=h?'Tutup ':'Baca lengkap ';
})});
/* efek tombol: riak saat ditekan (semua perangkat) */
var RP='.btn,.rt,.nl,.krow,.rm,.dots button,.burger,.crows a,.logo,.dl a';
document.addEventListener('pointerdown',function(e){
  var t=e.target.closest&&e.target.closest(RP);if(!t||rmq)return;
  var r=t.getBoundingClientRect(),d=Math.max(r.width,r.height)*2.2,s=document.createElement('span');
  s.className='rp';s.style.cssText='width:'+d+'px;height:'+d+'px;left:'+(e.clientX-r.left-d/2)+'px;top:'+(e.clientY-r.top-d/2)+'px';
  t.appendChild(s);setTimeout(function(){s.remove()},650);
},{passive:true});
/* kursor komet tinta (gaya catatanakademik, palet oranye) + magnet tombol */
if(window.matchMedia&&matchMedia('(pointer:fine)').matches&&!rmq){
  var c=document.createElement('canvas');c.id='inkT';c.setAttribute('aria-hidden','true');document.body.appendChild(c);
  var g=c.getContext('2d'),P=[],sm=[],W,H,dpr=Math.min(devicePixelRatio||1,2),mx=-1,my=-1,hx=0,hy=0,vx=0,vy=0,act=false,mg=null,MG='.btn,.rt,.burger,.dots button,.logo';
  function rs(){W=innerWidth;H=innerHeight;c.width=W*dpr;c.height=H*dpr;g.setTransform(dpr,0,0,dpr,0,0)}rs();addEventListener('resize',rs);
  addEventListener('pointermove',function(e){
    if(e.pointerType==='touch')return;
    mx=e.clientX;my=e.clientY;if(!act){act=true;hx=mx;hy=my}
    var m=e.target.closest&&e.target.closest(MG);
    if(mg&&mg!==m){mg.style.translate='';mg=null}
    if(m){var r=m.getBoundingClientRect();mg=m;m.style.translate=((e.clientX-r.left-r.width/2)*.22).toFixed(1)+'px '+((e.clientY-r.top-r.height/2)*.3).toFixed(1)+'px'}
  },{passive:true});
  document.addEventListener('pointerleave',function(){act=false;if(mg){mg.style.translate='';mg=null}});
  (function loop(t){
    g.clearRect(0,0,W,H);
    if(act){var ax=(mx-hx)*.16,ay=(my-hy)*.16;vx=(vx+ax)*.78;vy=(vy+ay)*.78;hx+=vx;hy+=vy;P.push({x:hx,y:hy,t:t});
      var sp=Math.hypot(vx,vy);if(sp>1.2&&Math.random()<.6)sm.push({x:hx,y:hy,vx:(Math.random()-.5)*.8,vy:(Math.random()-.5)*.8,t:t,a:Math.min(.5,sp/20)})}
    var L=950;while(P.length&&t-P[0].t>L)P.shift();
    g.lineCap='round';g.lineJoin='round';
    for(var i=1;i<P.length;i++){var k=i/P.length,age=1-(t-P[i].t)/L;if(age<0)continue;var w=.4+k*k*5.5,a=Math.max(0,age)*.95,dx=Math.sin(i*.45+t*.004)*(1-k)*2.2;
      g.beginPath();g.moveTo(P[i-1].x+dx,P[i-1].y);g.lineTo(P[i].x+dx,P[i].y);
      g.strokeStyle='rgba(255,'+(100+k*90|0)+','+(40+k*70|0)+','+a.toFixed(3)+')';g.lineWidth=w;
      g.shadowColor='rgba(255,138,61,'+(a*.9).toFixed(2)+')';g.shadowBlur=14;g.stroke()}
    g.shadowBlur=0;
    for(i=sm.length-1;i>=0;i--){var p=sm[i],ag=(t-p.t)/1300;if(ag>1){sm.splice(i,1);continue}p.x+=p.vx;p.y+=p.vy;p.vx*=.99;p.vy-=.004;
      var r2=3+ag*14,gr=g.createRadialGradient(p.x,p.y,0,p.x,p.y,r2);gr.addColorStop(0,'rgba(255,138,61,'+(p.a*(1-ag)).toFixed(3)+')');gr.addColorStop(1,'rgba(255,138,61,0)');g.fillStyle=gr;g.beginPath();g.arc(p.x,p.y,r2,0,7);g.fill()}
    if(act){var g2=g.createRadialGradient(hx,hy,0,hx,hy,16);g2.addColorStop(0,'rgba(255,240,225,.95)');g2.addColorStop(.35,'rgba(255,176,122,.8)');g2.addColorStop(1,'rgba(255,100,20,0)');g.fillStyle=g2;g.beginPath();g.arc(hx,hy,16,0,7);g.fill()}
    requestAnimationFrame(loop)})(performance.now());
}
/* animasi tahap 1: progress, counter, judul per kata, marquee perangkat */
(function(){
  var pgb=document.getElementById('pg');
  if(pgb){var pt=0;main.addEventListener('scroll',function(){if(pt)return;pt=1;requestAnimationFrame(function(){pt=0;var m=main.scrollHeight-main.clientHeight;pgb.style.transform='scaleX('+(m>0?Math.min(1,main.scrollTop/m):0).toFixed(4)+')'})},{passive:true})}
  if(rmq)return;
  /* judul per kata */
  function split(n){Array.prototype.slice.call(n.childNodes).forEach(function(c){
    if(c.nodeType===3){var f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(function(w){if(!w)return;if(/^\s+$/.test(w)){f.appendChild(document.createTextNode(' '));return}var o=document.createElement('span');o.className='wm';var i=document.createElement('span');i.textContent=w;o.appendChild(i);f.appendChild(o)});c.parentNode.replaceChild(f,c)}
    else if(c.nodeType===1&&c.tagName!=='BR'&&!(c.classList&&c.classList.contains('shim')))split(c)})}
  $$('.screen:not(#home) h2').forEach(function(h){h.setAttribute('aria-label',h.textContent.replace(/\s+/g,' ').trim());split(h);h.querySelectorAll('.wm>span').forEach(function(s,i){s.style.setProperty('--i',i)})});
  /* counter angka */
  $$('.stats.big b').forEach(function(b){
    var m=b.textContent.match(/^(\d+)(.*)$/);if(!m)return;var to=+m[1],suf=m[2],done=0;b.textContent='0'+suf;
    function run(){if(done)return;done=1;var t0=performance.now(),d=1200;(function f(t){var p=Math.min(1,(t-t0)/d),e=1-Math.pow(1-p,3);b.textContent=Math.round(to*e)+suf;if(p<1)requestAnimationFrame(f)})(t0)}
    if('IntersectionObserver'in window){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){run();io.disconnect()}},{root:main,threshold:.6});io.observe(b)}else run()});
  /* marquee perangkat */
  var tw=document.querySelector('.tools>div');
  if(tw){var tr=document.createElement('div');tr.className='mq-t';var sp=Array.prototype.slice.call(tw.children);
    sp.forEach(function(s){tr.appendChild(s)});sp.forEach(function(s){var c=s.cloneNode(true);c.setAttribute('aria-hidden','true');tr.appendChild(c)});
    tw.appendChild(tr);tw.classList.add('mq')}
})();

(function(){
var rmo=matchMedia('(prefers-reduced-motion:reduce)').matches,fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
var bx=document.createElement('div');bx.className='lbx';bx.setAttribute('role','dialog');bx.setAttribute('aria-modal','true');bx.setAttribute('aria-label','Pratinjau foto');
bx.innerHTML='<button class="x" aria-label="Tutup">&times;</button><button class="pv" aria-label="Foto sebelumnya">&larr;</button><img alt=""><button class="nx" aria-label="Foto berikutnya">&rarr;</button><p class="ct" aria-live="polite"></p>';
document.body.appendChild(bx);
var im=bx.querySelector('img'),ct=bx.querySelector('.ct'),list=[],idx=0,from=null;
function load(i){idx=(i+list.length)%list.length;var b=list[idx],src=b.querySelector('img');im.classList.remove('rd');im.onload=function(){im.classList.add('rd')};im.src=src.currentSrc||src.src;im.alt=src.alt;ct.textContent=src.alt+(list.length>1?'  ·  '+(idx+1)+'/'+list.length:'');bx.querySelector('.pv').style.display=bx.querySelector('.nx').style.display=list.length>1?'':'none';if(im.complete)im.classList.add('rd')}
function open(b){from=b;list=[].slice.call(document.querySelectorAll('.lb[data-lb="'+b.getAttribute('data-lb')+'"]'));bx.classList.add('on');load(list.indexOf(b));bx.querySelector('.x').focus()}
function close(){bx.classList.remove('on');im.classList.remove('rd');if(from)from.focus()}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.lb');if(b){e.preventDefault();open(b);return}if(e.target===bx||e.target.closest('.x'))close();else if(e.target.closest('.pv'))load(idx-1);else if(e.target.closest('.nx'))load(idx+1)});
document.addEventListener('keydown',function(e){if(!bx.classList.contains('on'))return;if(e.key==='Escape')close();else if(e.key==='ArrowLeft')load(idx-1);else if(e.key==='ArrowRight')load(idx+1)});
if(fine&&!rmo)document.querySelectorAll('.lb').forEach(function(b){b.addEventListener('pointermove',function(e){var r=b.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;b.style.setProperty('--ry',(x*10).toFixed(2)+'deg');b.style.setProperty('--rx',(-y*10).toFixed(2)+'deg')});b.addEventListener('pointerleave',function(){b.style.setProperty('--ry','0deg');b.style.setProperty('--rx','0deg')})});
})();

(function(){
var pw=document.querySelector('.pw'),img=pw&&pw.querySelector('.pose');
if(!pw||!img||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
var fine=matchMedia('(pointer:fine)').matches,N=fine?13000:6500,cv=document.createElement('canvas');
cv.className='pc';cv.setAttribute('aria-hidden','true');document.body.appendChild(cv);
var cx=cv.getContext('2d'),W=0,H=0,D=Math.min(devicePixelRatio||1,1.5),buf,u32,P=null,t0=0,mx=-999,my=-999,vis=true,run=false,ox=0,oy=0,sc=1;
function size(){W=Math.max(2,Math.round(innerWidth*D));H=Math.max(2,Math.round(innerHeight*D));cv.width=W;cv.height=H;buf=cx.createImageData(W,H);u32=new Uint32Array(buf.data.buffer)}
function rnd(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function build(){
  var o=document.createElement('canvas'),w=img.naturalWidth,h=img.naturalHeight;o.width=w;o.height=h;var c=o.getContext('2d');c.drawImage(img,0,0);var d=c.getImageData(0,0,w,h).data,r=rnd(7),pts=[],tries=0;
  while(pts.length<N&&tries<N*40){tries++;var x=(r()*w)|0,y=(r()*h)|0,i=(y*w+x)*4;if(d[i+3]>150){pts.push([x/w,y/h,d[i],d[i+1],d[i+2]])}}
  var n=pts.length;P={n:n,hx:new Float32Array(n),hy:new Float32Array(n),x:new Float32Array(n),y:new Float32Array(n),vx:new Float32Array(n),vy:new Float32Array(n),dl:new Float32Array(n),c:new Uint8Array(n*3),z:new Float32Array(n)};
  for(var k=0;k<n;k++){var q=pts[k];P.hx[k]=q[0];P.hy[k]=q[1];P.c[k*3]=Math.min(255,q[2]*1.25+30);P.c[k*3+1]=Math.min(255,q[3]*1.25+30);P.c[k*3+2]=Math.min(255,q[4]*1.25+40);P.dl[k]=(1-q[1])*0.6+r()*0.35;P.z[k]=r()}
  for(var k=0;k<n;k++){P.x[k]=Math.random()*W;P.y[k]=Math.random()*H}
}
function frame(now){
  if(!run)return;requestAnimationFrame(frame);var hm=document.getElementById('home');var hr=hm&&hm.getBoundingClientRect();vis=!hm||(hr.bottom>innerHeight*.45&&hr.top<innerHeight*.55);if(!vis||document.hidden||!P){if(cv.style.visibility!=='hidden'){cv.style.visibility='hidden'}return}cv.style.visibility='';
  var t=(now-t0)/1000,ir=img.getBoundingClientRect();sc=1;
  var L=ir.left*D,T=ir.top*D,IW=ir.width*D,IH=ir.height*D;
  var mxx=mx*D,myy=my*D,rad=(fine?85:60)*D,r2=rad*rad;
  var asm=Math.min(1,Math.max(0,(t-0.2)/1.6));
  u32.fill(0);var n=P.n,hx=P.hx,hy=P.hy,x=P.x,y=P.y,vx=P.vx,vy=P.vy,dl=P.dl,cc=P.c,z=P.z;
  var rest=t>2.2?Math.max(.38,1-(t-2.2)*.9):1;
  for(var k=0;k<n;k++){
    if(t<dl[k])continue;
    var tx=L+hx[k]*IW+Math.sin(t*.9+z[k]*6.28)*1.1*D,ty=T+hy[k]*IH+Math.cos(t*.8+z[k]*6.28)*1.1*D;
    var dx=x[k]-mxx,dy=y[k]-myy,d2=dx*dx+dy*dy,heat=0;
    if(d2<r2&&d2>1){var d=Math.sqrt(d2),f=(1-d/rad)*(1-d/rad)*9*D;vx[k]+=dx/d*f;vy[k]+=dy/d*f;heat=1}
    vx[k]+=(tx-x[k])*.045;vy[k]+=(ty-y[k])*.045;vx[k]*=.86;vy[k]*=.86;x[k]+=vx[k];y[k]+=vy[k];
    var off=Math.abs(tx-x[k])+Math.abs(ty-y[k]),hot=Math.min(1,off/(40*D));
    var rr=cc[k*3],gg=cc[k*3+1],bb=cc[k*3+2];
    var a=(.5+.5*asm)*rest*255|0;if(hot>.05){rr=rr+(255-rr)*hot;gg=gg+(138-gg)*hot;bb=bb+(61-bb)*hot;a=Math.min(255,a+hot*160|0)}
    var px=x[k]|0,py=y[k]|0;if(px<0||py<0||px>=W-1||py>=H-1)continue;
    var col=(a<<24)|((bb|0)<<16)|((gg|0)<<8)|(rr|0),i=py*W+px;u32[i]=col;u32[i+1]=col;if(D>1||hot>.3){u32[i+W]=col;u32[i+W+1]=col}
  }
  cx.putImageData(buf,0,0);
  if(t>1.7&&pw.classList.contains('pa'))pw.classList.remove('pa');
}
function start(){size();build();t0=performance.now()+1450;pw.classList.add('pa');run=true;requestAnimationFrame(frame)}
addEventListener('pointermove',function(e){mx=e.clientX;my=e.clientY},{passive:true});
addEventListener('pointerleave',function(){mx=my=-999});
addEventListener('resize',function(){if(P){size();}});
if('IntersectionObserver' in window)new IntersectionObserver(function(es){vis=es[0].isIntersecting}).observe(pw);
if(img.complete&&img.naturalWidth)start();else img.addEventListener('load',start);
})();

(function(){
var st=document.querySelector('.ost');if(!st)return;
var cs=[].slice.call(st.querySelectorAll('.oc')),N=cs.length,dots=[].slice.call(document.querySelectorAll('.odots u')),sec=document.getElementById('skills');
var rmo=matchMedia('(prefers-reduced-motion:reduce)').matches,pos=0,tw=null,hold=2600,last=performance.now(),paused=false,drag=null;
function ez(t,o){return o?1+2.2*Math.pow(t-1,3)+1.2*Math.pow(t-1,2):1-Math.pow(1-t,3)}
function mod(a,n){return((a%n)+n)%n}
function draw(){
  var W=st.clientWidth,cw=cs[0].offsetWidth,stp=2*Math.PI/N,R=(cw*.82)/stp,near=mod(Math.round(pos),N);
  for(var i=0;i<N;i++){
    var d=mod(i-pos+N/2,N)-N/2,th=d*stp,x=Math.sin(th)*R,z=Math.cos(th),sc=.62+.38*Math.max(z,0),y=(1-z)*34,op=Math.max(0,Math.min(1,(z-.2)/.8));op=Math.pow(op,1.3);
    var c=cs[i];c.style.transform='translate(-50%,-50%) translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) scale('+sc.toFixed(3)+')';c.style.opacity=op.toFixed(3);c.style.zIndex=Math.round(z*100)+100;c.style.pointerEvents=op<.15?'none':'';
    var a=i===near;if(a!==c.classList.contains('act'))c.classList.toggle('act',a);c.setAttribute('aria-hidden',a?'false':'true');
    c.querySelectorAll('.ck').forEach(function(l){l.tabIndex=a?0:-1});
  }
  dots.forEach(function(u,i){u.classList.toggle('on',i===near)});
}
function go(to,o){tw={from:pos,to:to,t0:performance.now(),dur:rmo?1:(o?950:600),o:o&&!rmo};last=performance.now()}
function step(n){go(Math.round(pos)+n,true)}
function tick(now){
  requestAnimationFrame(tick);
  var r=sec.getBoundingClientRect(),vis=r.bottom>innerHeight*.45&&r.top<innerHeight*.55;
  if(!vis||document.hidden){last=now;return}
  if(tw){var t=Math.min(1,(now-tw.t0)/tw.dur);pos=tw.from+(tw.to-tw.from)*ez(t,tw.o);if(t>=1){pos=tw.to;tw=null;pos=mod(pos,N);last=now}draw();return}
  if(!rmo&&!paused&&!drag&&now-last>hold){step(1)}
}
st.addEventListener('pointerenter',function(){paused=true});st.addEventListener('pointerleave',function(){paused=false;last=performance.now()});
st.addEventListener('focusin',function(){paused=true});st.addEventListener('focusout',function(){paused=false;last=performance.now()});
st.addEventListener('pointerdown',function(e){if(e.target.closest('.ck'))return;drag={x:e.clientX,p:pos,m:0};tw=null;st.classList.add('dg');try{st.setPointerCapture(e.pointerId)}catch(_){}});
st.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-drag.x;drag.m=Math.max(drag.m,Math.abs(dx));pos=drag.p-dx/170;draw()});
function end(e){if(!drag)return;var m=drag.m;drag=null;st.classList.remove('dg');if(m<5){var c=e.target.closest&&e.target.closest('.oc');if(c&&!c.classList.contains('act')&&!e.target.closest('.ck')){var i=+c.getAttribute('data-i'),d=mod(i-Math.round(pos)+N/2,N)-N/2;go(Math.round(pos)+d,true);return}}go(Math.round(pos),true)}
st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
st.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();step(1)}else if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}});
document.querySelector('.op').addEventListener('click',function(){step(-1)});document.querySelector('.on_').addEventListener('click',function(){step(1)});
addEventListener('resize',draw);draw();requestAnimationFrame(tick);
})();

(function(){var L=document.querySelector('.klist');if(!L)return;var wrap=L.parentNode,rows=[].slice.call(L.querySelectorAll('.krow')),rm=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
var last=L.scrollLeft,sk=0,down=false,sx=0,sl=0,moved=0,vel=0,lx=0,raf=0,inert=0;
function tick(){var d=L.scrollLeft-last;last=L.scrollLeft;var t=rm?0:Math.max(-13,Math.min(13,-d*.9));sk+=(t-sk)*.2;if(Math.abs(sk)<.02&&!t)sk=0;L.style.setProperty('--sk',sk.toFixed(2)+'deg');raf=requestAnimationFrame(tick)}
raf=requestAnimationFrame(tick);
function center(b,smooth){var x=b.offsetLeft-(L.clientWidth-b.offsetWidth)/2;L.scrollTo({left:x,behavior:smooth&&!rm?'smooth':'auto'})}
L.addEventListener('pointerdown',function(e){if(e.pointerType==='touch')return;down=true;moved=0;sx=e.clientX;sl=L.scrollLeft;lx=e.clientX;vel=0;cancelAnimationFrame(inert);L.setPointerCapture(e.pointerId)});
L.addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-sx;moved=Math.max(moved,Math.abs(dx));if(moved>5)L.classList.add('dg');L.scrollLeft=sl-dx;vel=lx-e.clientX;lx=e.clientX});
function up(e){if(!down)return;down=false;try{L.releasePointerCapture(e.pointerId)}catch(_){}
 var wasDrag=moved>5;setTimeout(function(){L.classList.remove('dg')},0);
 if(wasDrag&&!rm){(function f(){vel*=.94;L.scrollLeft+=vel;if(Math.abs(vel)>.5)inert=requestAnimationFrame(f)})()}
 else if(!wasDrag){var b=e.target.closest&&e.target.closest('.krow');if(b)b.click()}}
L.addEventListener('pointerup',up);L.addEventListener('pointercancel',up);
rows.forEach(function(b){b.addEventListener('click',function(){center(b,true)})});
function cur(){return rows.findIndex(function(b){return b.classList.contains('on')})}
function step(n){var i=Math.max(0,Math.min(rows.length-1,cur()+n));rows[i].click()}
var p=wrap.querySelector('.kp'),x=wrap.querySelector('.kx');if(p)p.onclick=function(){step(-1)};if(x)x.onclick=function(){step(1)};
L.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();step(1)}else if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}});
})();

(function(){function fw(){var f=document.querySelector('.fl');if(f)f.style.setProperty('--flw',Math.max(0,f.clientWidth*.76-10)+'px')}fw();addEventListener('resize',fw);var r=document.querySelectorAll('.krow');r.forEach(function(b){b.addEventListener('click',function(){setTimeout(fw,60)})})})();
setTimeout(function(){show((location.hash||'#home').slice(1),false,true)},60);
})();