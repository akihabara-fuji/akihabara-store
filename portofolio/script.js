(function(){
'use strict';
var rmq=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
var fine=window.matchMedia&&matchMedia('(pointer:fine)').matches&&!rmq;
var ov=document.getElementById('ov'),zm=document.getElementById('zm'),from=null,cur=null;
function $$(s,r){return [].slice.call((r||document).querySelectorAll(s))}
/* buka / tutup panel kartu */
function close(){if(cur===null)return;cur=null;ov.classList.remove('on');ov.setAttribute('aria-hidden','true');$$('.pn',ov).forEach(function(p){p.hidden=true});document.body.classList.remove('lock');if(location.hash)history.replaceState(null,'',location.pathname+location.search);if(from)from.focus()}
function open(i,btn){var pn=ov.querySelector('.pn[data-p="'+i+'"]');if(!pn)return;from=btn||null;cur=i;
  $$('.pn',ov).forEach(function(p){p.hidden=true});
  var cl=pn.cloneNode(true);pn.parentNode.replaceChild(cl,pn);cl.hidden=false;   /* klon supaya animasi kartu diputar ulang */
  if(btn){var r=btn.getBoundingClientRect();cl.style.setProperty('--ox',((r.left+r.width/2)/innerWidth*100).toFixed(1)+'%');cl.style.setProperty('--oy',((r.top+r.height/2)/innerHeight*100).toFixed(1)+'%')}
  ov.classList.add('on');ov.setAttribute('aria-hidden','false');document.body.classList.add('lock');cl.scrollTop=0;
  cl.querySelector('.pn-x').addEventListener('click',close);
  $$('.gi',cl).forEach(function(g){tilt(g,14)});
  $$('.gi-z',cl).forEach(function(b){b.addEventListener('click',function(){zoom(b.getAttribute('data-zoom'),b.getAttribute('aria-label'))})});
  history.replaceState(null,'','#k'+(+i+1));cl.querySelector('.pn-x').focus({preventScroll:true})}
$$('.gc').forEach(function(b){b.addEventListener('click',function(){open(b.getAttribute('data-k'),b)})});
ov.addEventListener('click',function(e){if(e.target===ov)close()});
/* perbesar foto */
function zoom(src,alt){var im=zm.querySelector('img');im.src=src;im.alt=alt||'';zm.classList.add('on');zm.setAttribute('aria-hidden','false')}
function unzoom(){zm.classList.remove('on');zm.setAttribute('aria-hidden','true')}
zm.addEventListener('click',unzoom);
document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;if(zm.classList.contains('on'))unzoom();else close()});
/* tautan langsung: #k1 .. #k6 membuka kartunya */
var m=/^#k(\d+)$/.exec(location.hash);if(m){var b=document.getElementById('k'+m[1]);if(b)setTimeout(function(){open(b.getAttribute('data-k'),b)},500)}
/* kartu miring 3D + paralaks + kilau mengikuti kursor */
function tilt(c,deg){if(!fine)return;
  c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height,st=c.style;
    st.setProperty('--ry',((x-.5)*deg).toFixed(2)+'deg');st.setProperty('--rx',((.5-y)*deg).toFixed(2)+'deg');
    st.setProperty('--px',(x-.5).toFixed(3));st.setProperty('--py',(y-.5).toFixed(3));st.setProperty('--gx',(x*100).toFixed(1)+'%');st.setProperty('--gy',(y*100).toFixed(1)+'%')});
  c.addEventListener('pointerleave',function(){var st=c.style;st.setProperty('--rx','0deg');st.setProperty('--ry','0deg');st.setProperty('--px','0');st.setProperty('--py','0')})}
$$('.gc').forEach(function(c){tilt(c,16)});
var hero=document.querySelector('.hero'),hp=document.querySelector('.hero-p');
if(fine&&hero&&hp){hero.addEventListener('pointermove',function(e){var r=hero.getBoundingClientRect();hp.style.setProperty('--hy',(((e.clientX-r.left)/r.width-.5)*18).toFixed(2)+'deg');hp.style.setProperty('--hx',((.5-(e.clientY-r.top)/r.height)*10).toFixed(2)+'deg')});
  hero.addEventListener('pointerleave',function(){hp.style.setProperty('--hy','0deg');hp.style.setProperty('--hx','0deg')})}
/* kursor komet tinta (dibawa dari versi sebelumnya) */
if(window.matchMedia&&matchMedia('(pointer:fine)').matches&&!rmq){
  var c=document.createElement('canvas');c.id='inkT';c.setAttribute('aria-hidden','true');document.body.appendChild(c);
  var g=c.getContext('2d'),P=[],sm=[],W,H,dpr=Math.min(devicePixelRatio||1,2),mx=-1,my=-1,hx=0,hy=0,vx=0,vy=0,act=false,mg=null,MG='.tb,.logo';
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
})();
