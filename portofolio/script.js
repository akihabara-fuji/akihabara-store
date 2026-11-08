(function(){
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var ids=['home','about','skills','experience','karya','kontak'],cur='home';
var drawer=$('.drawer'),burger=$('.burger');
function closeDrawer(){drawer.classList.remove('open');burger.classList.remove('x');burger.setAttribute('aria-expanded','false');drawer.setAttribute('aria-hidden','true')}
var main=$('main'),rmq=matchMedia('(prefers-reduced-motion:reduce)').matches;
var done=0;
function setActive(id){
  if(id===cur&&done)return;
  cur=id;done=1;
  $$('.nl').forEach(function(a){a.classList.toggle('on',a.getAttribute('data-go')===id)});
  document.title=(id==='home'?'Dika Priyadi – AI Automation & Digital Solutions Builder':id.charAt(0).toUpperCase()+id.slice(1)+' – Dika Priyadi');
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
/* kursor + magnet (desktop saja) */
if(window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches){
  document.documentElement.classList.add('cur');
  var cr=$('.cr'),cd=$('.cd'),mx=-100,my=-100,rx=-100,ry=-100,rf=0,mg=null,MG='.btn,.rt,.burger,.dots button,.logo';
  function ring(){rx+=(mx-rx)*(rmq?1:.2);ry+=(my-ry)*(rmq?1:.2);cr.style.transform='translate('+rx.toFixed(1)+'px,'+ry.toFixed(1)+'px)';rf=(Math.abs(mx-rx)+Math.abs(my-ry)<.15)?0:requestAnimationFrame(ring)}
  document.addEventListener('mousemove',function(e){
    mx=e.clientX;my=e.clientY;cr.style.opacity=1;cd.style.opacity=1;
    cd.style.transform='translate('+mx+'px,'+my+'px)';
    if(!rf)rf=requestAnimationFrame(ring);
    var el=e.target.closest&&e.target.closest('a,button,.krow,[data-go]');
    document.body.classList.toggle('hov',!!el);
    document.body.classList.toggle('hovb',!!(el&&el.matches(MG)));
    var m=e.target.closest&&e.target.closest(MG);
    if(mg&&mg!==m){mg.style.translate='';mg=null}
    if(m&&!rmq){var r=m.getBoundingClientRect();mg=m;m.style.translate=((e.clientX-r.left-r.width/2)*.22).toFixed(1)+'px '+((e.clientY-r.top-r.height/2)*.3).toFixed(1)+'px'}
  },{passive:true});
  document.addEventListener('mouseleave',function(){cr.style.opacity=0;cd.style.opacity=0;if(mg){mg.style.translate='';mg=null}});
  document.addEventListener('mousedown',function(){document.body.classList.add('prs')});
  document.addEventListener('mouseup',function(){document.body.classList.remove('prs')});
}
setTimeout(function(){show((location.hash||'#home').slice(1),false,true)},60);
})();