(function(){
  var f=document.getElementById('f'),m=document.getElementById('msg');
  f.addEventListener('submit',function(e){
    e.preventDefault();var code=document.getElementById('t').value.trim().toUpperCase();
    m.className='';m.textContent='Memeriksa token...';
    fetch('/bank-soal/api/token/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:code})})
      .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j};});})
      .then(function(x){
        if(!x.ok){m.className='err';m.textContent=x.j.error||'Token tidak valid.';return;}
        try{localStorage.setItem('bs_token',code);localStorage.setItem('bs_scope',JSON.stringify(x.j.scope));}catch(e){}
        m.className='okmsg';m.textContent='Token aktif. Buka halaman mata kuliah untuk memakai seluruh soal.';
      }).catch(function(){m.className='err';m.textContent='Server tidak dapat dihubungi. Coba lagi.';});
  });
})();
