/* nx-edit-admin */
(function(){
  const body=document.getElementById("bBody"), form=document.getElementById("bForm"), dlg=document.getElementById("bDlg");
  if(!body||!form) return;
  const tools=document.getElementById("bTools"), stats=document.getElementById("bStats"), prev=document.getElementById("bPrev"), qa=document.getElementById("bQA"), pbtn=document.getElementById("bPrevBtn");
  const E=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const strip=l=>l.replace(/^\s*(?:#{1,3}\s+|\d{1,2}[.)]\s+|[-*•–]\s+|>\s+)/,"");
  function wrap(a,b,ph){const s=body.selectionStart,e=body.selectionEnd,v=body.value,mid=v.slice(s,e)||ph;body.value=v.slice(0,s)+a+mid+b+v.slice(e);body.focus();body.selectionStart=s+a.length;body.selectionEnd=s+a.length+mid.length;upd();}
  function lines(fn){const s=body.selectionStart,e=body.selectionEnd,v=body.value,ls=v.lastIndexOf("\n",s-1)+1;let le=v.indexOf("\n",e);if(le<0)le=v.length;const blk=v.slice(ls,le).split("\n").map(fn).join("\n");body.value=v.slice(0,ls)+blk+v.slice(le);body.focus();body.selectionStart=ls;body.selectionEnd=ls+blk.length;upd();}
  const ACT={
    h2:()=>lines(l=>"## "+strip(l)), h3:()=>lines(l=>"### "+strip(l)),
    b:()=>wrap("**","**","teks tebal"), i:()=>wrap("*","*","teks miring"),
    ol:()=>{let n=0;lines(l=>l.trim()?(++n)+". "+strip(l):l);}, ul:()=>lines(l=>l.trim()?"- "+strip(l):l), q:()=>lines(l=>l.trim()?"> "+strip(l):l),
    a:()=>{const u=prompt("Alamat link (mulai dengan https://)"); if(u&&/^https?:\/\//.test(u)) wrap("[","]("+u+")","teks link");}
  };
  if(tools) tools.addEventListener("click",e=>{const b=e.target.closest("button[data-f]"); if(!b) return; e.preventDefault(); ACT[b.dataset.f]&&ACT[b.dataset.f]();});
  function md(t){
    const inl=s=>E(s).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g,"$1<em>$2</em>").replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2">$1</a>');
    return t.split(/\n{2,}/).map(par=>{par=par.trim(); if(!par) return ""; let m;
      if((m=par.match(/^!\[([^\]]*)\]\((\/uploads\/[^)\s]+)\)$/))) return '<img src="'+m[2]+'" alt="'+E(m[1])+'" style="max-width:100%;border-radius:10px;margin:8px 0">';
      const ls=par.split("\n");
      if(ls.every(l=>/^\s*\d{1,2}[.)]\s+/.test(l))){ if(ls.length===1&&strip(ls[0]).length<=110&&!/[.!?:]$/.test(ls[0].trim())) return '<h4 style="margin:14px 0 4px">'+inl(ls[0])+"</h4>"; return "<ol>"+ls.map(l=>"<li>"+inl(strip(l))+"</li>").join("")+"</ol>"; }
      if(ls.every(l=>/^\s*[-*•–]\s+/.test(l))) return "<ul>"+ls.map(l=>"<li>"+inl(strip(l))+"</li>").join("")+"</ul>";
      if(/^#{1,3}\s+/.test(par)) return '<h4 style="margin:14px 0 4px">'+inl(strip(par))+"</h4>";
      if(/^>\s+/.test(par)) return '<blockquote style="border-left:3px solid #a855f7;margin:10px 0;padding:2px 12px;opacity:.9">'+inl(strip(par))+"</blockquote>";
      return "<p>"+ls.map(inl).join("<br>")+"</p>"; }).join("");
  }
  function upd(){
    const t=body.value, words=(t.replace(/!\[[^\]]*\]\([^)]*\)/g," ").match(/\S+/g)||[]).length, mins=Math.max(1,Math.round(words/200));
    if(stats) stats.textContent=words+" kata · ±"+mins+" menit baca";
    if(prev&&!prev.hidden) prev.innerHTML=md(t)||'<span style="opacity:.6">Belum ada isi.</span>';
    if(!qa) return;
    const ti=(form.title&&form.title.value||"").trim().length, ex=(form.excerpt&&form.excerpt.value||"").trim().length;
    const hasCover=(typeof editCover!=="undefined")&&!!editCover;
    const C=[
      [ti>=30&&ti<=65, "Judul 30–65 huruf (sekarang "+ti+"), biar tidak terpotong di Google"],
      [ex>=70&&ex<=160, "Ringkasan 70–160 huruf (sekarang "+ex+"), jadi deskripsi di Google"],
      [hasCover, "Ada foto sampul"],
      [words>=300, "Minimal ±300 kata (sekarang "+words+")"],
      [/^(#{2,3}\s|\d{1,2}[.)]\s)/m.test(t), "Ada subjudul atau langkah bernomor"],
      [/\]\(https?:\/\//.test(t)||words<150, "Ada link sumber (disarankan untuk artikel berisi fakta atau berita)"],
      [!/TODO|XXX|lorem|DATA BELUM|\[\.\.\.\]/i.test(t), "Tidak ada sisa penanda draf (TODO, XXX, DATA BELUM...)"]
    ];
    const ok=C.filter(c=>c[0]).length;
    qa.innerHTML='<div style="font-weight:600;margin-bottom:4px">Cek kualitas: '+ok+"/"+C.length+"</div>"+C.map(c=>'<div style="font-size:13px;opacity:'+(c[0]?".75":"1")+'">'+(c[0]?"✅ ":"⚠️ ")+E(c[1])+"</div>").join("");
  }
  if(pbtn) pbtn.addEventListener("click",e=>{e.preventDefault(); prev.hidden=!prev.hidden; pbtn.textContent=prev.hidden?"Lihat pratinjau":"Tutup pratinjau"; upd();});
  form.addEventListener("input",upd); form.addEventListener("change",upd); dlg&&dlg.addEventListener("focusin",upd);
  setInterval(()=>{ if(dlg&&dlg.open) upd(); },1500);
})();
