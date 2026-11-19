(function(){
  var KEY='bs_kur';
  function apply(v){
    document.body.classList.toggle('kur-lama',v==='lama');
    document.querySelectorAll('.switch [data-kur]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.kur===v?'true':'false');});
    var h=document.querySelector('[data-h1-kode]'),B=window.__BS__;
    if(h&&B)h.textContent=v==='lama'?(B.kodeLama[0]||B.kodeBaru):B.kodeBaru;
  }
  var cur='obe';try{cur=localStorage.getItem(KEY)||'obe';}catch(e){}
  document.addEventListener('DOMContentLoaded',function(){
    apply(cur);
    document.querySelectorAll('.switch [data-kur]').forEach(function(b){b.addEventListener('click',function(){cur=b.dataset.kur;try{localStorage.setItem(KEY,cur);}catch(e){}apply(cur);});});
  });
  if(document.readyState!=='loading'){apply(cur);}
})();
