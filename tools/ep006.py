import sys;sys.path.insert(0,'tools')
from bwai2lib import *
EM=lambda *a:[{"at":x,"e":e} for x,e in a]
CK="claude-kotak";GP="chatgpt";GM="gemini";FL="flow"
def side(head,rows=None,meter=None,cast=None,top=602,pulse=None,**k):
    d={"head":head,"castTop":top,"pulse":pulse or []}
    if rows:d["rows"]=rows
    if meter:d["meter"]=meter
    if cast:d["cast"]=cast
    d.update(k);return d

def s1(w):
    jg,cm,tn,cg,mn,dy,mg,id_=w("Jangan"),w("cuma"),w("tanya"),w("ChatGPT"),w("Minta"),w("dia"),w("menguji"),w("idemu")
    st={"nodes":[Mx("ai",790,330,0,GP,"kerja",210,enter="pop",idle="bob",emo=EM((mg,"checklist"),(id_,"hore"))),
      N("q",290,230,tn,130,icon="bubbleQ",bare=True,enter="pop",to={"x":680,"y":240,"at":cg,"dur":14,"arc":70},out=cg+16),
      N("idea",250,240,mn,130,icon="bulb",bare=True,enter="pop",to={"x":700,"y":250,"at":mg,"dur":16,"arc":90},idle="bob"),
      N("lp",520,120,mg,150,icon="search",bare=True,enter="drop",to={"x":700,"y":250,"at":mg+10,"dur":12,"arc":-30},idle="wobble")],
      "badges":[Bd("cross",540,130,cm,86),Bd("check",700,160,id_,84)],
      "fx":[Fx("ring",790,330,cg,220,color="#111"),Fx("burst",700,250,mg+22,160),Fx("sparks",790,330,id_,220,color="#1B9E4B"),Fx("confetti",760,300,id_+4,150)],
      "shake":[{"at":cm,"amp":9,"dur":10}],
      "cam":[{"at":mg,"z":1.1,"x":640,"y":280,"dur":12},{"at":id_+16,"z":1,"dur":16}],
      "stick":STK(150,[(0,"idle"),(tn,"point"),(cm,"stop"),(mn,"lift"),(mg,"throw"),(id_,"thumbs")])}
    sd=side({"text":"TANYA VS UJI","at":jg},rows=[R(tn,"TANYA","ask",bad=cm+4,hit=[tn]),R(mn,"UJI IDE","crit",ok=id_,hit=[mg])],
      meter=None,cast=[Cs(GP,"kerja",jg+4,125,250,0,emos=[(cm,"pusing"),(mg,"checklist"),(id_,"hore")],hop=[mn]),Cs(CK,"kerja",jg+8,365,250,0,emos=[(mg,"cool")],say=[(id_,"OK")],hop=[id_])],top=420,pulse=[cm,id_])
    return {"dika":dk((0,"serius",560,520),(mn,"tunjuk",560,520),(id_,"jelas",560,520)),"stage":st,"side":sd}

def s2(w):
    cb,ub,cr,mm,tg=w("Coba"),w("ubah"),w("cara"),w("memberi"),w("tugas")
    st={"nodes":[Mx("ai",790,330,0,GM,"kerja",200,enter="pop",idle="bob",emo=EM((tg,"checklist"))),
      N("m",290,290,cb,140,icon="bubbleQ",color="#fff",enter="pop",swap={"at":ub+8,"icon":"list","color":GR},to={"x":690,"y":300,"at":mm,"dur":16,"arc":80},out=tg+14),
      N("g",470,130,ub,170,icon="gear",bare=True,enter="spin",idle="spin",out=tg+20)],
      "badges":[Bd("check",790,190,tg,84)],
      "fx":[Fx("burst",470,130,ub,170),Fx("ring",290,290,cr,150,color="#111"),Fx("sparks",790,330,tg,220,color="#1B9E4B")],
      "shake":[{"at":ub,"amp":8,"dur":10}],
      "stick":STK(130,[(0,"idle"),(cb,"point"),(ub,"wind"),(mm,"throw"),(tg,"thumbs")])}
    sd=side({"text":"UBAH CARANYA","at":cb},rows=[R(cb,"CARA LAMA","tangle",bad=ub+6,hit=[cb]),R(ub+10,"CARA BARU","bulb",ok=tg,hit=[tg])],
      cast=[Cs(GM,"kerja",cb+4,125,250,0,emos=[(ub,"pusing"),(tg,"ide")],hop=[ub]),Cs(CK,"kerja",cb+8,365,250,0,emos=[(tg,"hore")],say=[(tg,"OK")],hop=[tg])],top=420,pulse=[ub,tg])
    return {"dika":dk((0,"jelas",560,520),(ub,"tunjuk",560,520),(tg,"detail",560,520)),"stage":st,"side":sd}

def s3(w):
    jg,cm,bl,ks,id_,kt=w("Jangan"),w("cuma"),w("bilang"),w("Kasih"),w("ide"),w("konten")
    st={"nodes":[Mx("ai",770,230,0,CK,"kerja",180,enter="pop",idle="bob",emo=EM((kt,"capek"))),
      N("b",290,230,ks,150,big="IDE?",color="#fff",enter="pop",to={"x":660,"y":240,"at":id_+2,"dur":14,"arc":70},out=kt+16),
      N("g1",560,470,kt,100,big="...",color=GY,enter="drop"),N("g2",690,480,kt+5,100,big="...",color=GY,enter="drop"),N("g3",820,470,kt+10,100,big="...",color=GY,enter="drop")],
      "badges":[Bd("cross",540,120,cm,86),Bd("q",770,100,kt+4,70)],
      "fx":[Fx("ring",290,230,ks,150,color="#111"),Fx("dust",560,540,kt,100,dir=1),Fx("dust",820,540,kt+10,100,dir=1)],
      "shake":[{"at":kt,"amp":8,"dur":10}],
      "stick":STK(150,[(0,"idle"),(jg,"stop"),(bl,"shrug"),(ks,"throw"),(kt,"slump")])}
    sd=side({"text":"JANGAN CUMA BILANG","at":jg},rows=[R(ks,"IDE KONTEN","bulb",bad=kt+2,hit=[ks])],
      meterTop=200,meter={"at":ks,"label":"ORISINAL","fmt":"pct","color":"#FF7B72","keys":[{"f":ks,"v":65},{"f":kt,"v":65},{"f":kt+14,"v":14}],"shake":[kt+2]},
      cast=[Cs(CK,"kerja",jg+4,125,250,0,emos=[(kt,"capek")],hop=[ks]),Cs(GP,"kerja",jg+8,365,250,0,emos=[(kt,"lelah")],say=[(kt,"...")])],top=350,pulse=[kt])
    return {"dika":dk((0,"serius",560,520),(ks,"bingung",560,520),(kt,"pusing",560,520)),"stage":st,"side":sd}

def s4(w):
    mn,ai,kr,id_,mc,asu,lm,mj,rs,lu,mb,al=w("Minta"),w("AI"),w("mengkritik"),w("ide"),w("mencari"),w("asumsi"),w("lemah"),w("menunjukkan"),w("risiko"),w("lalu"),w("memberi"),w("alternatif")
    st={"nodes":[Mx("ai",810,310,0,GP,"kerja",190,enter="pop",idle="bob",emo=EM((kr,"kerja"),(rs,"kaget"),(al,"hore"))),
      N("idea",460,310,mn,200,icon="bulb",bare=True,enter="pop",idle="bob",hit=[kr+8,lm,rs+8],out=mb+2),
      N("pen",700,160,kr,140,icon="pen",bare=True,enter="right",to={"x":500,"y":230,"at":kr+2,"dur":12,"arc":40},out=asu-2),
      N("lp",200,150,asu,150,icon="search",bare=True,enter="left",to={"x":450,"y":280,"at":asu+6,"dur":14,"arc":-40},out=rs-2),
      N("wn",460,100,rs,150,icon="warn",bare=True,enter="drop",out=mb),
      N("a1",460,310,mb,150,icon="bulb",bare=True,enter="pop",to={"x":330,"y":470,"at":mb+2,"dur":16,"arc":100},idle="bob"),
      N("a2",460,310,mb,150,icon="bulb",bare=True,enter="pop",to={"x":590,"y":470,"at":mb+6,"dur":16,"arc":120},idle="bob")],
      "edges":[E("a1","ai",al-6,bend=-50,flow=True),E("a2","ai",al-4,bend=50,flow=True)],
      "badges":[Bd("cross",540,230,lm,84),Bd("check",330,390,al,70),Bd("check",590,390,al+4,70)],
      "fx":[Fx("burst",460,300,kr+8,170,color=RD),Fx("sparks",450,290,lm,200),Fx("burst",460,300,rs+8,200,color=YL),Fx("confetti",460,420,al+2,170)],
      "shake":[{"at":kr+8,"amp":10,"dur":10},{"at":rs+8,"amp":14,"dur":12}],
      "cam":[{"at":kr,"z":1.1,"x":520,"y":260,"dur":12},{"at":mb,"z":1,"dur":14}],
      "stick":STK(110,[(0,"idle"),(mn,"point"),(kr,"press"),(asu,"lookL"),(rs,"scared"),(mb,"idle"),(al,"thumbs")])}
    sd=side({"text":"UJI IDEMU","at":mn},rows=[R(kr,"KRITIK","crit",ok=asu-2,hit=[kr]),R(asu,"ASUMSI","ask",bad=lm,hit=[asu]),R(rs,"RISIKO","risk",ok=mb,hit=[rs]),R(mb,"ALTERNATIF","alt",ok=al,hit=[al])],
      meter={"at":kr,"label":"IDE","fmt":"pct","keys":[{"f":kr,"v":30},{"f":lm,"v":22},{"f":rs+10,"v":40},{"f":al+6,"v":92}]},
      cast=[Cs(GP,"kerja",mn+4,125,185,0,emos=[(rs,"kaget"),(al,"hore")],hop=[kr,rs]),Cs(CK,"kerja",mn+8,365,185,0,emos=[(al,"hore")],say=[(al,"OK")],hop=[al])],top=602,pulse=[kr,lm,rs,al])
    return {"dika":dk((0,"jelas",560,520),(kr,"satu",560,520),(asu,"detail",560,520),(rs,"tunjuk",560,520),(al,"jempol",560,520)),"stage":st,"side":sd}

def s5(w):
    st_,it,vf,fk,pn,sb,bp,dp=w("Setelah"),w("itu"),w("verifikasi"),w("fakta"),w("penting"),w("sumber"),w("bisa"),w("dipercaya")
    st={"nodes":[N("f",330,320,fk,190,big="FAKTA",color=YL,enter="drop",hit=[pn,dp]),
      N("lp",110,140,vf,150,icon="search",bare=True,enter="left",to={"x":330,"y":260,"at":vf+6,"dur":16,"arc":-50},idle="wobble"),
      N("bk",640,160,sb,130,icon="book",enter="right",idle="bob"),N("gl",640,460,sb+6,130,icon="globe",enter="right",idle="bob"),
      N("sh",800,310,dp,170,icon="shield",bare=True,enter="stamp",idle="pulse")],
      "edges":[E("bk","f",sb+10,bend=-40,flow=True),E("gl","f",sb+14,bend=40,flow=True)],
      "badges":[Bd("warn",330,190,pn,76),Bd("check",330,190,dp,86)],
      "fx":[Fx("ring",330,320,fk,200,color="#111"),Fx("sparks",330,320,pn,230,color=RD),Fx("burst",800,310,dp,100,color="#1B9E4B"),Fx("confetti",560,330,dp+2,170)],
      "shake":[{"at":dp,"amp":10,"dur":10}],
      "cam":[{"at":vf,"z":1.1,"x":330,"y":280,"dur":12},{"at":sb,"z":1.0,"dur":16}],
      "stick":STK(140,[(0,"idle"),(vf,"lookL"),(pn,"stop"),(sb,"point"),(dp,"press2"),(dp+16,"thumbs")],y=350)}
    sd=side({"text":"VERIFIKASI","at":st_},rows=[R(fk,"FAKTA","doc",ok=dp,hit=[pn]),R(sb,"SUMBER","src",ok=dp+4,hit=[sb])],
      meterTop=290,meter={"at":fk,"label":"TERPERCAYA","fmt":"pct","keys":[{"f":fk,"v":20},{"f":sb,"v":40},{"f":dp,"v":95}]},
      cast=[Cs(GM,"kerja",st_+4,125,250,0,emos=[(vf,"checklist"),(dp,"hore")],hop=[sb]),Cs(CK,"kerja",st_+8,365,250,0,emos=[(dp,"selesai")],say=[(dp,"OK")],hop=[dp])],top=430,pulse=[pn,dp])
    return {"dika":dk((0,"jelas",560,520),(vf,"baca",560,520),(sb,"tunjuk",560,520),(dp,"jempol",560,520)),"stage":st,"side":sd}

def s6(w):
    ai,bs,mb,mp,cr,bp,tp,kp,ak,tt,tn,kt=w("AI"),w("bisa"),w("membantu"),w("memperluas"),w("cara"),w("berpikir"),w("tapi"),w("keputusan"),w("akhir"),w("tetap"),w("tangan"),w("kita")
    st={"nodes":[Mx("ai",790,170,ai,GM,"kerja",150,enter="pop",idle="bob",emo=EM((tp,"cool"),(kt,"hore"))),
      N("b1",330,150,mp,110,icon="bulb",bare=True,enter="spin",idle="bob"),N("b2",460,110,mp+5,130,icon="bulb",bare=True,enter="spin",idle="bob"),N("b3",590,150,bp,150,icon="bulb",bare=True,enter="spin",idle="bob"),
      N("btn",520,430,kp,250,icon="button",bare=True,enter="drop",hit=[ak,tn+4]),
      N("hd",520,260,tn,170,icon="hand",bare=True,enter="drop",to={"x":520,"y":380,"at":tn+6,"dur":8},out=kt+10)],
      "badges":[Bd("check",520,300,kt-2,80)],
      "fx":[Fx("ring",460,130,mp,200,color="#111"),Fx("ring",460,130,mp+10,300,color="#111"),Fx("burst",520,420,tn+10,260,color=RD),Fx("confetti",560,320,kt,180)],
      "flash":[{"at":tp,"color":"#fff"}],"shake":[{"at":tn+10,"amp":14,"dur":12}],
      "cam":[{"at":mp,"z":1.08,"x":460,"y":200,"dur":12},{"at":kp,"z":1.1,"x":520,"y":400,"dur":14},{"at":kt+14,"z":1,"dur":16}],
      "stick":STK(170,[(0,"idle"),(ai,"present"),(mp,"cheer"),(tp,"stop"),(kp,"point"),(tn,"press2"),(kt,"thumbs")])}
    sd=side({"text":"KENDALI DI KITA","at":ai},rows=[R(mb,"AI BANTU","bulb",ok=bp,hit=[mp]),R(kp,"KEPUTUSAN","hand",ok=kt,hit=[tn])],
      meterTop=290,meter={"at":ai,"label":"KENDALI","fmt":"pct","keys":[{"f":ai,"v":45},{"f":tp,"v":45},{"f":tn+8,"v":100}]},
      cast=[Cs(GM,"kerja",ai+4,125,250,0,emos=[(tp,"cool")],hop=[mp]),Cs(CK,"kerja",ai+8,365,250,0,emos=[(kt,"hore")],say=[(kt,"OK")],hop=[tn,kt])],top=430,pulse=[tp,tn])
    return {"dika":dk((0,"jelas",560,520),(mp,"besar",560,520),(tp,"serius",560,520),(tn,"tunjuk",560,520),(kt,"jempol",560,520)),"stage":st,"side":sd}

def s7(w):
    fo,ck,bi,bu,pr,yg,lg,pk=w("Follow"),w("cek"),w("bio"),w("buat"),w("prompt"),w("yang"),w("langsung"),w("praktikkan")
    st={"nodes":[N("pl",250,170,fo,170,icon="plus",enter="stamp",idle="pulse"),
      N("ln",520,170,bi,150,icon="link",color=YL,enter="spin",idle="bob"),
      N("pm",560,440,pr,150,icon="bubble",color=GR,enter="up",idle="bob"),
      Mx("rk",120,470,lg,CK,"ngebut",150,enter="left",to={"x":420,"y":470,"at":lg,"dur":10}),
      N("tm",800,440,pk,150,icon="terminal",color=PU,enter="up",idle="bob"),
      Mx("m2",790,170,pk,FL,"hore",130)],
      "edges":[E("pl","ln",bi,bend=40,flow=True),E("pm","tm",lg+4,bend=-40,flow=True)],
      "badges":[Bd("star",250,80,fo+10,70),Bd("check",520,90,bi+8,70),Bd("check",800,350,pk+6,76)],
      "fx":[Fx("burst",250,170,fo,200),Fx("ring",520,170,bi,190,color="#111"),Fx("speed",420,470,lg,100,dir=1),Fx("confetti",640,300,pk,170)],
      "stick":STK(150,[(0,"idle"),(fo,"present"),(ck,"point"),(pr,"lift"),(lg,"throw"),(pk,"typeA"),(pk+8,"typeB"),(pk+16,"typeA"),(pk+24,"thumbs")])}
    sd=side({"text":"FOLLOW + CEK BIO","at":fo},rows=[R(fo,"FOLLOW","hand",ok=fo+12,hit=[fo]),R(bi-6,"CEK BIO","doc",ok=bi+6,hit=[bi]),R(pr,"PROMPT","bulb",ok=pr+10,hit=[pr]),R(pk-10,"PRAKTIK","steps",ok=pk+4,hit=[pk])],
      cast=[Cs(CK,"kerja",fo+4,125,190,0,emos=[(pk,"hore")],hop=[fo,pk]),Cs(GP,"kerja",fo+8,365,190,0,emos=[(pk,"hore")],hop=[bi,pk],say=[(pk,"!")])],top=602,pulse=[fo,pk])
    return {"dika":dk((0,"silakan",560,520),(bi,"tunjuk",560,520),(pk,"jempol",560,520)),"stage":st,"side":sd}

HOOK="Jangan cuma tanya ChatGPT. Minta dia menguji idemu."
CTA="Follow dan cek bio buat prompt yang bisa langsung lo praktikkan."
build("006","ai-partner-berpikir","JADIKAN AI PARTNER BERPIKIR",
"Jangan hanya minta ide ke AI; minta AI mengkritik, mencari asumsi lemah, menunjukkan risiko, dan memberi alternatif, lalu verifikasi fakta penting dan ambil keputusan sendiri.",HOOK,CTA,"BUILD WITH AI #006",[
Sc(4.4,HOOK,"JADIKAN AI PARTNER BERPIKIR",s1,tsize=40,emph=["Jangan","menguji"]),
Sc(3.6,"Coba ubah cara memberi tugas.","UBAH CARA KASIH TUGAS",s2,emph=["ubah","tugas"]),
Sc(4.4,"Jangan cuma bilang, 'Kasih ide konten.'","JANGAN CUMA MINTA IDE",s3,emph=["Jangan","ide"]),
Sc(10.0,"Minta AI mengkritik ide, mencari asumsi yang lemah, menunjukkan risiko, lalu memberi alternatif.","KRITIK, ASUMSI, RISIKO",s4,emph=["mengkritik","asumsi","risiko","alternatif"]),
Sc(6.0,"Setelah itu, verifikasi fakta penting dengan sumber yang bisa dipercaya.","VERIFIKASI FAKTA PENTING",s5,tsize=40,emph=["verifikasi","sumber"]),
Sc(6.6,"AI bisa membantu memperluas cara berpikir, tapi keputusan akhir tetap di tangan kita.","KEPUTUSAN DI TANGAN KITA",s6,tsize=40,emph=["memperluas","keputusan","tangan"]),
Sc(5.6,CTA,"CEK BIO",s7,emph=["Follow","bio"]),
])
