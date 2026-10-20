<script>
/* nextaja landing final: alur, sosial, gerak hero (berdiri sendiri, aman bila gagal) */
(function(){try{
var $=function(s,r){return (r||document).querySelector(s)};
var RM=matchMedia("(prefers-reduced-motion:reduce)").matches,FINE=matchMedia("(hover:hover) and (pointer:fine)").matches;
var S={};try{S=JSON.parse($("#store-data").textContent).settings||{}}catch(e){}
/* alur */
var ST={ut:[["Chat admin","Kirim soal atau kebutuhanmu."],["Konfirmasi","Admin kirim harga dan jadwal. Bayar bisa DP dulu."],["Dikerjakan + review","Ada tahap review sebelum dikirim."],["Kirim ke tutor","Revisi atas masukan tutor selama sesi aktif."]],kr:[["Pilih alat","Analisa Akun, Lab Studio, atau Studio Konten."],["Masukkan akun atau foto","Tempel akun atau unggah fotomu."],["Lihat hasil","Skor, saran, atau hasil edit."],["Simpan atau tanya admin","Butuh bantuan lanjut? Chat admin."]]};
var box=$("#nxSteps");
function draw(k){box.innerHTML=ST[k].map(function(x,i){return '<div class="card mini"><div class="nx-n">'+(i+1)+'</div><h3>'+x[0]+'</h3><p>'+x[1]+'</p></div>'}).join("")}
if(box){draw("ut");document.querySelectorAll(".nx-tabs button").forEach(function(b){b.addEventListener("click",function(){document.querySelectorAll(".nx-tabs button").forEach(function(o){o.setAttribute("aria-selected",String(o===b))});draw(b.dataset.t)})})}
/* sosial: ikut pengaturan admin, hanya https dan domain yang cocok */
function handle(v){return String(v||"").replace(/^@/,"").trim()}
function ok(h){return /^[A-Za-z0-9._]{1,40}$/.test(h)}
function setSoc(id,url,sub){var a=document.getElementById(id);if(!a)return;if(!url){return}a.href=url;a.target="_blank";a.rel="noopener";a.removeAttribute("data-off");a.removeAttribute("aria-disabled");if(sub!=null){var p=a.querySelector("p");if(p)p.textContent=sub}}
var ig=handle(S.instagram),tt=handle(S.tiktok);
if(ig&&ok(ig))setSoc("socIg","https://www.instagram.com/"+ig,"@"+ig);
if(tt&&ok(tt))setSoc("socTt","https://www.tiktok.com/@"+tt,"@"+tt);
if(S.facebookUrl&&/^https:\/\/(www\.|m\.)?(facebook\.com|fb\.com)\//.test(S.facebookUrl))setSoc("socFb",S.facebookUrl,S.facebook||"Facebook");
var wc=S.waChannelUrl||"";
if(/^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]+/.test(wc)){setSoc("socWa",wc);var g=document.querySelector("#socWa .nx-go");if(g)g.innerHTML="Buka Channel &rarr;"}
document.querySelectorAll("[data-off]").forEach(function(a){a.addEventListener("click",function(e){e.preventDefault()})});
/* gerak hero mengikuti kursor */
var hero=document.getElementById("heroSec");if(!hero||RM||!FINE)return;
var layers=[].slice.call(hero.querySelectorAll("[data-d]")),mags=[].slice.call(hero.querySelectorAll(".nx-door"));
var tx=0,ty=0,px=0,py=0,mx=0,my=0,run=false,vis=true;
document.addEventListener("pointermove",function(e){mx=e.clientX;my=e.clientY;var r=hero.getBoundingClientRect();
 if(e.clientY>=r.top&&e.clientY<=r.bottom){tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5;hero.style.setProperty("--mx",(e.clientX-r.left)+"px");hero.style.setProperty("--my",(e.clientY-r.top)+"px")}else{tx=0;ty=0}
 if(!run&&vis){run=true;requestAnimationFrame(tick)}},{passive:true});
if("IntersectionObserver" in window)new IntersectionObserver(function(en){vis=en[0].isIntersecting}).observe(hero);
function tick(){px+=(tx-px)*.08;py+=(ty-py)*.08;
 layers.forEach(function(l){var d=+l.dataset.d;l.style.transform=(l.dataset.s?"scale("+l.dataset.s+") ":"")+"translate3d("+(px*d)+"px,"+(py*d)+"px,0)"});
 mags.forEach(function(m){var r=m.getBoundingClientRect(),dx=mx-(r.left+r.width/2),dy=my-(r.top+r.height/2),on=Math.hypot(dx,dy)<r.width*.75,k=on?.12:0;m._x=(m._x||0)+((dx*k)-(m._x||0))*.15;m._y=(m._y||0)+((dy*k)-(m._y||0))*.15;m.style.transform="translate("+m._x.toFixed(2)+"px,"+m._y.toFixed(2)+"px)"});
 if(vis&&(Math.abs(tx-px)>.001||Math.abs(ty-py)>.001||mags.some(function(m){return Math.abs(m._x||0)>.05||Math.abs(m._y||0)>.05})))requestAnimationFrame(tick);else run=false}
}catch(e){}})();
</script>
