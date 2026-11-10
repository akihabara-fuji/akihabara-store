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