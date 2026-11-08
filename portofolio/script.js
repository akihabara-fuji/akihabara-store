(function(){
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var ids=['home','about','skills','experience','karya','kontak'],cur='home';
var drawer=$('.drawer'),burger=$('.burger');
function closeDrawer(){drawer.classList.remove('open');burger.classList.remove('x');burger.setAttribute('aria-expanded','false');drawer.setAttribute('aria-hidden','true')}
function show(id,push){
  if(ids.indexOf(id)<0)id='home';
  cur=id;
  $$('.screen').forEach(function(s){s.classList.toggle('on',s.id===id)});
  $$('.nl').forEach(function(a){a.classList.toggle('on',a.getAttribute('data-go')===id)});
  var s=document.getElementById(id);if(s&&id!=='home')s.scrollTop=0;
  if(push!==false&&location.hash!=='#'+id)history.pushState(null,'','#'+id);
  closeDrawer();
  document.title=(id==='home'?'Dika Priyadi – AI Automation & Digital Solutions Builder':id.charAt(0).toUpperCase()+id.slice(1)+' – Dika Priyadi');
}
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
var sc=$('#home'),poses=$$('.pose'),A=$('.hl-a'),B=$('.hl-b'),sd=$('.side'),vt=$('.vt'),hint=$('.hint'),dots=$$('.dots button'),n=poses.length;
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
function read(){var m=sc.scrollHeight-sc.clientHeight;tgt=m>0?sc.scrollTop/m:0;if(!raf)raf=requestAnimationFrame(frame)}
sc.addEventListener('scroll',read,{passive:true});addEventListener('resize',function(){read();draw(cur)});
dots.forEach(function(d,i){d.addEventListener('click',function(){var m=sc.scrollHeight-sc.clientHeight;sc.scrollTo({top:m*[.02,.46,.98][i],behavior:rm?'auto':'smooth'})})});
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
/* cursor + tilt (desktop only) */
if(window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches){
  document.documentElement.classList.add('cur');
  var cr=$('.cr'),cd=$('.cd');
  document.addEventListener('mousemove',function(e){
    cr.style.opacity=1;cd.style.opacity=1;
    cr.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)';
    cd.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)';
    var h=e.target.closest&&e.target.closest('a,button,.krow');
    document.body.classList.toggle('hov',!!h);
  },{passive:true});
  document.addEventListener('mouseleave',function(){cr.style.opacity=0;cd.style.opacity=0});
  document.addEventListener('mousedown',function(){document.body.classList.add('prs')});
  document.addEventListener('mouseup',function(){document.body.classList.remove('prs')});
}
show((location.hash||'#home').slice(1),false);
})();
