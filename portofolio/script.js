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
  document.title=(id==='home'?'Dika Priyadi – Perancang Otomasi AI & Solusi Digital':({about:'Tentang',skills:'Keahlian',experience:'Pengalaman',karya:'Karya',kontak:'Kontak'}[id]||id)+' – Dika Priyadi');
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
    var pk=a.getAttribute('data-pick');if(pk!==null){if(window.kmOpen)window.kmOpen(+pk)}
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
if(!poses.length||!hs||!hk){return}
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

(function(){var tabs=[].slice.call(document.querySelectorAll('.kt_'));if(!tabs.length)return;var rows=[].slice.call(document.querySelectorAll('.krow'));
function mark(g){tabs.forEach(function(t){var on=t.getAttribute('data-g')===g;t.classList.toggle('on',on);t.setAttribute('aria-selected',on)})}
tabs.forEach(function(t){t.addEventListener('click',function(){var r=rows[+t.getAttribute('data-kt')];if(r)r.click()})});
rows.forEach(function(b){b.addEventListener('click',function(){mark(b.getAttribute('data-g'))})});
})();
(function(){var ov=document.getElementById('kfoOv');if(!ov)return;var from=null,curK=null;function mark(b){[].forEach.call(document.querySelectorAll('.kfo'),function(q){var on=q===b;q.classList.toggle('op',on);q.setAttribute('aria-expanded',on?'true':'false')})}
function close(){curK=null;mark(null);ov.classList.remove('on');ov.setAttribute('aria-hidden','true');[].forEach.call(ov.querySelectorAll('.kfo-p'),function(p){p.hidden=true});if(from)from.focus()}
function open(i,btn){if(curK===i){close();return}curK=i;mark(btn);from=btn;[].forEach.call(ov.querySelectorAll('.kfo-p'),function(p){p.hidden=p.getAttribute('data-kp')!==String(i)});var pn=ov.querySelector('.kfo-p[data-kp="'+i+'"]');if(!pn)return;var cl=pn.cloneNode(true);pn.parentNode.replaceChild(cl,pn);ov.classList.add('on');ov.setAttribute('aria-hidden','false');var x=cl.querySelector('.kfo-x');x.addEventListener('click',close);setTimeout(function(){cl.scrollIntoView({block:'nearest',behavior:'smooth'})},60)}
[].forEach.call(document.querySelectorAll('.kfo'),function(b){b.addEventListener('click',function(){open(b.getAttribute('data-kf'),b)})});
ov.addEventListener('click',function(e){if(e.target===ov)close()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ov.classList.contains('on'))close()});
})();
setTimeout(function(){show((location.hash||'#home').slice(1),false,true)},60);
})();
;(function(){
var G=[
 {label:'Konten & Analisis',art:'dusk',seed:5,f:[[4,'Produksi Konten AI','Carousel, artikel, video','assets/c-1.webp'],[6,'Analisis akun (1)','Video · Media Sosial','v/naya1.jpg','v:k2:0'],[6,'Analisis akun (2)','Video · Media Sosial','v/naya2.jpg','v:k2:1'],[6,'Proses analisa akun','6 tangkapan layar + penjelasan','v/an2.jpg','d:k2'],[6,'Carousel, pilar & kalender','Strategi konten 1 minggu','v/car1.jpg','d:k2']]},
 {label:'Fokus Otomasi AI',art:'ember',seed:11,f:[[0,'Otomasi AI','Fokus utama',null],[1,'Koordinasi Alur Kerja AI','GPT, Gemini, Claude',null],[2,'Bot WhatsApp','Dua bot di VPS','assets/k-bot.webp'],[3,'CatatanAkademik.com','Platform edukasi UT','assets/k-admin.webp'],[2,'Iklan Bot WhatsApp','Video · dibuat dengan AI','v/bot.jpg','v:k4:0']]},
 {label:'Alat & Pengembangan',art:'glacier',seed:8,f:[[7,'Bedah Laporan & Cek Parafrase','Pemeriksaan dokumen UT',null],[8,'Analisa Sahabat Analisis','Alat analisa akun',null]]},
 {label:'Layanan Lepas',art:'aurora',seed:3,f:[[11,'Layanan Lepas','Yang bisa dikerjakan',null],[12,'Portofolio Web dan Presentasi','Portofolio, PPT, desain',null],[13,'Media Sosial dan Konten Edukasi','Feed, konten, akademik',null]]}
];
var ov=document.getElementById('kmOv'),body=document.getElementById('kmBody'),host=document.getElementById('kfm');
if(!ov||!host)return;
function close(){ov.hidden=true;document.documentElement.classList.remove('kmo')}
window.kmOpen=function(k){var a=document.querySelector('#kdets .kdet[data-k="'+k+'"]');if(!a)return;body.innerHTML=a.innerHTML;body.scrollTop=0;ov.hidden=false;document.documentElement.classList.add('kmo');ov.querySelector('.kmx').focus()};
ov.addEventListener('click',function(e){if(e.target===ov||e.target.closest('.kmx'))close();else{var p=e.target.closest('[data-pick]');if(p){e.preventDefault();window.kmOpen(+p.getAttribute('data-pick'))}}});
addEventListener('keydown',function(e){if(e.key==='Escape'&&!ov.hidden)close()});
var vo=null,ALL=[],GRP=[],cur=0,ratio=9/16;
var SC='';
function mk(){ALL=[];GRP=[];for(var n=1;n<=8;n++){var k='k'+n,D=window.GF_DATA&&window.GF_DATA[k];if(!D||!D.files||!D.files.length||(SC&&k!==SC))continue;var st=ALL.length;D.files.forEach(function(f){ALL.push({name:f.name,meta:f.meta,image:f.image,src:f.src,key:k})});GRP.push({key:k,n:('0'+n).slice(-2),title:D.title,start:st,count:D.files.length,extra:!!(D.analysis||D.carousel||D.pillars)})}}
window.kvOpen=function(j,key){SC=key||'k1';mk();vidOpen(j||0)};
window.kvDoc=function(key){window.kvOpen(0,key);tab('d',key)};
function grpOf(i){var r=GRP[0];GRP.forEach(function(g){if(i>=g.start)r=g});return r}
function vidOpen(j){
 if(!ALL.length)mk();
 if(!vo){vo=document.createElement('div');vo.className='kmov kvo2';vo.hidden=true;
  vo.innerHTML='<div class="kv2" role="dialog" aria-modal="true"><div class="kvbg"></div><div class="kvtabs"><button type="button" class="on" data-t="v">Video</button><button type="button" data-t="d">Analisis &amp; strategi</button></div><div class="kvdoc"></div><button type="button" class="kmx" aria-label="Tutup">&times;</button><div class="kvst"><div class="kvfr"><video playsinline controls></video></div></div><div class="kvsd"><p class="lab"></p><h3 class="kvt"></h3><p class="kvm"></p><div class="kvl"></div></div></div>';
  document.body.appendChild(vo);
  vo.addEventListener('click',function(e){if(e.target===vo||e.target.closest('.kmx')){vc();return}
   var t=e.target.closest('.kvtabs button');if(t){tab(t.getAttribute('data-t'));return}
   var z=e.target.closest('[data-z]');if(z)zoom(z.getAttribute('data-z'))});
  addEventListener('keydown',function(e){if(vo.hidden)return;if(e.key==='Escape')vc();else if(e.key==='ArrowRight')play((cur+1)%ALL.length);else if(e.key==='ArrowLeft')play((cur+ALL.length-1)%ALL.length)});
  var v=vo.querySelector('video');
  v.addEventListener('loadedmetadata',function(){if(v.videoWidth&&v.videoHeight){ratio=v.videoWidth/v.videoHeight;fit()}});addEventListener('resize',function(){if(!vo.hidden)fit()});
  v.addEventListener('ended',function(){play((cur+1)%ALL.length)})}
 var L=vo.querySelector('.kvl');L.innerHTML='';
 GRP.forEach(function(g){var h=document.createElement('p');h.className='kvg';h.innerHTML='<b>'+g.n+'</b> '+g.title+' <small>'+g.count+' video</small>';L.appendChild(h);
  for(var i=g.start;i<g.start+g.count;i++)(function(i){var f=ALL[i],b=document.createElement('button');b.type='button';b.className='kvi';b.innerHTML='<img src="'+f.image+'" alt="" loading="lazy"><span><b>'+f.name+'</b><small>'+f.meta+'</small></span><em aria-hidden="true"><u></u><u></u><u></u></em>';b.onclick=function(){play(i)};L.appendChild(b)})(i);
  if(g.extra){var X=document.createElement('button');X.type='button';X.className='kvx';X.textContent='Proses analisa, carousel & strategi →';X.onclick=function(){tab('d',g.key)};L.appendChild(X)}});
 buildDoc();
 vo.querySelector('.lab').textContent=(SC==='k1'?'Video Karya':'Kartu '+GRP[0].n+' · '+GRP[0].title)+' · '+ALL.length+' video · dibuat dengan AI';
 vo.hidden=false;document.documentElement.classList.add('kmo');play(j);fit();
}
function tab(t,key){var k=vo.querySelector('.kv2');k.classList.toggle('kv-doc',t==='d');[].forEach.call(vo.querySelectorAll('.kvtabs button'),function(b){b.classList.toggle('on',b.getAttribute('data-t')===t)});if(t==='d'){var d=vo.querySelector('.kvdoc');d.scrollTop=0;if(key){var e=d.querySelector('[data-g="'+key+'"]');if(e)d.scrollTop=e.offsetTop-d.offsetTop}}else fit()}
function zoom(src){var z=document.createElement('div');z.className='kvz';z.innerHTML='<img src="'+src+'" alt="">';z.onclick=function(){z.remove()};document.body.appendChild(z)}
function buildDoc(){var d=vo.querySelector('.kvdoc'),h='',any=0;
 GRP.forEach(function(g){var D=window.GF_DATA[g.key];if(!g.extra)return;any=1;h+='<section data-g="'+g.key+'"><p class="kvh"><b>'+g.n+'</b> '+g.title+'</p>';
  if(D.analysis){h+='<h4>Proses analisa akun</h4><p class="cnote">Dijalankan dengan web analisa akun buatan sendiri, dikembangkan dengan bantuan AI. Klik gambar untuk memperbesar.</p><div class="kda">';D.analysis.forEach(function(a){h+='<figure data-z="'+a.i+'"><img src="'+a.i+'" alt="'+a.t+'" loading="lazy"><figcaption><b>'+a.t+'</b><span>'+a.d+'</span></figcaption></figure>'});h+='</div>'}
  if(D.carousel){h+='<h4>Carousel Instagram</h4><p class="cnote">Contoh carousel edukasi 7 slide. Geser ke samping, klik untuk memperbesar.</p><div class="kdc">';D.carousel.forEach(function(c,i){h+='<img data-z="'+c+'" src="'+c+'" alt="Slide '+(i+1)+'" loading="lazy">'});h+='</div>'}
  if(D.pillars){h+='<h4>Strategi &amp; Pilar Konten</h4><p class="cnote">Rekomendasi tiga pilar konten untuk akun contoh, disusun dari hasil analisa di atas.</p><div class="kdp">';D.pillars.forEach(function(p){h+='<div><b>'+p.n+' &middot; '+p.t+'</b><span>'+p.d+'</span></div>'});h+='</div>'}
  if(D.calendar){h+='<h4>Kalender Konten (1 minggu)</h4><p class="cnote">Contoh perencanaan konten mingguan.</p><div class="kdk">';D.calendar.forEach(function(r){h+='<div><b>'+r[0]+'</b><em>'+r[1]+'</em><span>'+r[2]+'</span></div>'});h+='</div>'}
  h+='</section>'});
 d.innerHTML=h;vo.querySelector('.kv2').classList.toggle('kv-t',!!any);tab('v')}
function fit(){var st=vo.querySelector('.kvst'),fr=vo.querySelector('.kvfr'),W=st.clientWidth,H=st.clientHeight;if(!W||!H)return;var w=Math.min(W,H*ratio),h=w/ratio;fr.style.width=Math.floor(w)+'px';fr.style.height=Math.floor(h)+'px'}
function vc(){var v=vo.querySelector('video');v.pause();v.removeAttribute('src');v.load();vo.hidden=true;document.documentElement.classList.remove('kmo')}
function play(i){var f=ALL[i],g=grpOf(i),v=vo.querySelector('video');cur=i;ratio=/9:16/.test(f.meta)?9/16:16/9;fit();v.src=f.src;v.poster=f.image;vo.querySelector('.kvt').textContent=f.name;vo.querySelector('.kvm').textContent=f.meta+' · Kartu '+g.n+' '+g.title;vo.querySelector('.kvbg').style.backgroundImage='url('+f.image+')';[].forEach.call(vo.querySelectorAll('.kvl button.kvi'),function(b,k){b.classList.toggle('on',k===i)});var on=vo.querySelector('.kvl button.on');if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest',inline:'nearest'});var p=v.play();if(p&&p.catch)p.catch(function(){})}
function build(){
 SC='k1';mk();
 var gs=[{label:'Video Karya',meta:ALL.length+' video',art:'ember',seed:11,files:ALL.map(function(f){return{name:f.name,meta:f.meta,image:f.image}}),vid:1}].concat(G.map(function(g){return{label:g.label,art:g.art,seed:g.seed,k:g.f.map(function(x){return x[0]}),act:g.f.map(function(x){return x[4]||''}),files:g.f.map(function(x){var o={name:x[1],meta:x[2]};if(x[3])o.image=x[3];else o.art=g.art;return o})}}));
 window.gfMenu(host,gs,function(i,j){
  var g=gs[i];
  if(g.vid){SC='k1';mk();vidOpen(j)}
  else{var ac=(g.act&&g.act[j])||'';if(ac){var p=ac.split(':');if(p[0]==='v')window.kvOpen(+p[2],p[1]);else window.kvDoc(p[1])}else window.kmOpen(g.k[j])}});
 var tw=0,tq=setInterval(function(){tw++;if(host.querySelector('.kring-r')){clearInterval(tq);ring()}else if(tw>60)clearInterval(tq)},50);
}
function ring(){
 var R=host.querySelector('.kring-r');if(!R)return;
 var its=[].slice.call(R.querySelectorAll('.kring-i')),n=its.length,step=360/n,a=0,paused=false,drag=false,sx=0,sa=0,moved=0,tgt=null;
 function paint(){var rr=R.parentNode.clientWidth,rad=Math.min(rr*.36,330);its.forEach(function(el,i){var th=(i*step+a)*Math.PI/180,c=Math.cos(th),sn=Math.sin(th),sc=.58+.42*Math.max(0,(c+1)/2);var x=rad*sn*(1.15);el.style.transform='translateX('+x.toFixed(1)+'px) scale('+sc.toFixed(3)+') perspective(1100px) rotateY('+(-sn*38).toFixed(1)+'deg)';el.style.opacity=c<-.15?0:(.35+.65*Math.max(0,(c+.15)/1.15)).toFixed(2);el.style.pointerEvents=c>.3?'auto':'none';el.style.zIndex=Math.round(c*100)+100})}
 paint();
 function snap(){tgt=-Math.round(a/step)*step}
 var rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
 (function loop(){if(tgt!==null){a+=(tgt-a)*.12;if(Math.abs(tgt-a)<.2){a=tgt;tgt=null}paint()}else if(!paused&&!drag&&!rm){a-=.06;paint()}requestAnimationFrame(loop)})();
 host.addEventListener('pointerenter',function(){paused=true});host.addEventListener('pointerleave',function(){paused=false;drag=false});
 host.addEventListener('pointerdown',function(e){if(e.target.closest('.kfm-nv'))return;drag=true;moved=0;sx=e.clientX;sa=a;tgt=null});
 addEventListener('pointermove',function(e){if(!drag)return;var d=e.clientX-sx;moved=Math.max(moved,Math.abs(d));a=sa+d*.35;paint()});
 addEventListener('pointerup',function(){if(drag){drag=false;if(moved>6)snap()}});
 host.addEventListener('click',function(e){if(moved>6){e.stopPropagation();e.preventDefault();moved=0}},true);
 window.kfmFront=function(i){var d=((a+i*step)%360+540)%360-180;tgt=a-d};
 function go(dir){tgt=(tgt===null?-Math.round(a/step)*step:tgt)+dir*step}
 var p=document.createElement('button'),q=document.createElement('button');p.className='kfm-nv l';q.className='kfm-nv r';p.type=q.type='button';p.setAttribute('aria-label','Sebelumnya');q.setAttribute('aria-label','Berikutnya');p.innerHTML='&larr;';q.innerHTML='&rarr;';
 p.onclick=function(){go(1)};q.onclick=function(){go(-1)};host.appendChild(p);host.appendChild(q);
}
var od=window.openDtl;
var wt=setInterval(function(){if(window.openDtl&&window.openDtl!==od&&window.openDtl.__w)return clearInterval(wt);if(!window.openDtl)return;var o=window.openDtl;if(o.__w)return clearInterval(wt);var w=function(k){if(!k||k==='k1'||k==='k2'||k==='k4'){window.__od=o;window.kvOpen(0,k||'k1');return}return o.apply(this,arguments)};w.__w=1;window.openDtl=w;clearInterval(wt)},100);
var nn=0,t=setInterval(function(){nn++;if(window.gfMenu&&window.GF_DATA&&window.openDtl){clearInterval(t);build()}else if(nn>150)clearInterval(t)},100);
})();

;(function(){document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-vk]');if(!a||!window.kvOpen)return;e.preventDefault();e.stopImmediatePropagation();window.kvOpen(0,a.getAttribute('data-vk'))},true)})();
