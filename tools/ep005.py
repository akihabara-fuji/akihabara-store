import sys;sys.path.insert(0,'tools')
from bwai2lib import *
EM=lambda *a:[{"at":x,"e":e} for x,e in a]
CK="claude-kotak";GP="chatgpt";GM="gemini";FL="flow"

def s1(w):
    a,b,c,d,e,f,g=w("Prompt"),w("1.000"),w("kata"),w("belum"),w("tentu"),w("lebih"),w("pintar")
    st={"nodes":[N("scr",610,310,a,340,icon="scroll",bare=True,enter="drop",idle="wobble",z=-1),
      N("n",610,310,b,190,big="1.000",color=YL,enter="stamp",hit=[d]),
      N("bulb",790,130,g,120,icon="bulb",enter="spin",idle="bob"),
      Mx("ai",790,450,f,CK,"kerja",170,emo=EM((d,"panik"),(g,"tanya")))],
      "badges":[Bd("cross",700,190,d,92),Bd("q",860,70,g,70)],
      "fx":[Fx("ring",610,310,b,200,color="#111"),Fx("burst",610,310,d,170),Fx("sparks",790,130,g,130)],
      "shake":[{"at":d,"amp":12,"dur":14}],"flash":[{"at":d,"color":"#FF7B72"}],
      "cam":[{"at":b,"z":1.1,"x":610,"y":300,"dur":10},{"at":d+14,"z":1,"dur":16}],
      "stick":STK(160,[(0,"idle"),(a,"lift"),(d,"slump"),(g,"shrug")])}
    sd={"head":{"text":"PANJANG VS PINTAR","at":a},
      "big":[{"at":b,"text":"1.000","strike":d,"y":110,"size":140}],"meterTop":370,
      "meter":{"at":a,"label":"PANJANG","keys":[{"f":a,"v":0},{"f":c,"v":100},{"f":d-1,"v":100},{"f":d+14,"v":18}],"flipLabel":[{"at":d,"label":"PINTAR"}],"shake":[d]},
      "cast":[Cs(CK,"kerja",a+4,125,240,0,emos=[(d,"capek")],hop=[b]),Cs(GP,"kerja",a+8,365,240,0,say=[(g,"?")],emos=[(d,"pusing"),(g,"tanya")],hop=[d])],
      "castTop":500,"pulse":[d]}
    return {"dika":dk((0,"serius",560,520),(d,"bingung",560,520),(g,"jelas",560,520)),"stage":st,"side":sd}

def s2(w):
    p,ef,bk,so,sb,pj=w("Prompt"),w("efektif"),w("bukan"),w("soal"),w("seberapa"),w("panjang")
    st={"nodes":[N("d",410,310,p,170,icon="doc",enter="pop",idle="bob"),
      N("t",720,310,ef,200,icon="target",bare=True,enter="spin",idle="pulse"),
      N("r",410,130,bk,230,icon="ruler",bare=True,enter="left",idle="wobble",grow={"at":pj,"to":1.35,"dur":12}),
      N("x",410,130,pj,220,icon="x",bare=True,enter="stamp")],
      "edges":[E("d","t",ef+4,bend=60,flow=True)],
      "badges":[Bd("check",720,185,ef+16,84),Bd("cross",560,130,sb,84)],
      "fx":[Fx("ring",720,310,ef,200,color="#111"),Fx("sparks",720,310,ef+10,170,color="#1B9E4B"),Fx("burst",410,130,pj,150,color=RD)],
      "shake":[{"at":pj,"amp":10,"dur":12}],
      "cam":[{"at":ef,"z":1.1,"x":620,"y":300,"dur":12},{"at":pj-4,"z":1.1,"x":430,"y":160,"dur":12},{"at":pj+16,"z":1,"dur":14}],
      "stick":STK(130,[(0,"idle"),(p,"present"),(ef,"point"),(bk,"stop"),(pj,"shrug")])}
    sd={"head":{"text":"PROMPT","at":0,"swap":[{"at":ef,"text":"TEPAT SASARAN"},{"at":pj,"text":"BUKAN PANJANG","color":RD}]},
      "rows":[R(ef,"JELAS","check",ok=ef+10,hit=[ef+10]),R(bk,"PANJANG","doc",bad=pj,hit=[pj])],
      "cast":[Cs(CK,"kerja",p+4,125,250,0,say=[(ef+8,"OK")],emos=[(ef,"cool"),(pj,"capek")],hop=[ef+8]),Cs(GP,"kerja",p+8,365,250,0,say=[(pj,"X")],emos=[(ef,"checklist"),(pj,"kaget")],hop=[pj])],
      "castTop":420,"pulse":[ef,pj]}
    return {"dika":dk((0,"jelas",560,520),(ef,"tunjuk",560,520),(pj,"detail",560,520)),"stage":st,"side":sd}

def s3(w):
    yp,pn,pr,tg,jl,kt,ck,bt,sb,hs,dm,dp=w("Yang"),w("penting"),w("peran"),w("tugasnya"),w("jelas"),w("konteksnya"),w("cukup"),w("batasannya"),w("disebutkan"),w("hasil"),w("diminta"),w("diperiksa")
    X=[140,340,560,780]
    st={"nodes":[N("r",X[0],150,pr,125,icon="role",enter="drop",idle="bob",hit=[jl]),
      N("k",X[1],150,kt,125,icon="book",enter="drop",idle="bob",hit=[ck]),
      N("b",X[2],150,bt,125,icon="stop",enter="drop",idle="bob",hit=[sb]),
      N("h",X[3],150,hs,125,icon="target",enter="drop",idle="bob",hit=[dp])],
      "badges":[Bd("check",X[0]+50,80,jl,66),Bd("check",X[1]+50,80,ck,66),Bd("check",X[2]+50,80,sb,66),Bd("check",X[3]+50,80,dp,66)],
      "fx":[Fx("sparks",X[0],150,jl,120,color="#1B9E4B"),Fx("sparks",X[1],150,ck,120,color="#1B9E4B"),Fx("sparks",X[2],150,sb,120,color="#1B9E4B"),Fx("sparks",X[3],150,dp,120,color="#1B9E4B"),Fx("confetti",X[3],200,dp+4,150)],
      "cam":[{"at":pr,"z":1.12,"x":X[0]+60,"y":210,"dur":12},{"at":kt,"z":1.12,"x":X[1]+40,"y":210,"dur":14},{"at":bt,"z":1.12,"x":X[2]+40,"y":210,"dur":14},{"at":hs,"z":1.12,"x":X[3]-40,"y":210,"dur":14},{"at":dp+20,"z":1,"dur":16}],
      "stick":STK(460,[(0,"idle"),(yp,"present"),(pr,"pointUp"),(tg,"idle"),(jl,"thumbs"),(kt,"pointUp"),(ck,"thumbs"),(bt,"pointUp"),(sb,"thumbs"),(hs,"pointUp"),(dp,"happy")],
        moves=[(pr-18,16,X[0],None,"walk"),(kt-18,16,X[1],None,"walk"),(bt-18,16,X[2],None,"walk"),(hs-18,16,X[3],None,"walk")],y=345)}
    sd={"head":{"text":"EMPAT HAL PENTING","at":yp},
      "rows":[R(pr,"PERAN","role",ok=jl,hit=[jl]),R(kt,"KONTEKS","ctx",ok=ck,hit=[ck]),R(bt,"BATAS","limit",ok=sb,hit=[sb]),R(hs,"HASIL","check",ok=dp,hit=[dp])],
      "meter":{"at":pr,"label":"KUALITAS","fmt":"pct","keys":[{"f":pr,"v":0},{"f":jl,"v":25},{"f":ck,"v":50},{"f":sb,"v":75},{"f":dp,"v":100}]},
      "cast":[Cs(CK,"kerja",yp+4,125,185,0,hop=[jl,sb],emos=[(dp,"hore")]),Cs(GP,"kerja",yp+8,365,185,0,hop=[ck,dp],emos=[(dp,"hore")],say=[(dp,"OK")])],
      "castTop":602,"pulse":[dp]}
    return {"dika":dk((0,"jelas",560,520),(pr,"satu",560,520),(kt,"detail",560,520),(bt,"tunjuk",560,520),(dp,"jempol",560,520)),"stage":st,"side":sd}

def s4(w):
    kl,tg,kp,pc,mj,bb,th=w("Kalau"),w("tugasnya"),w("kompleks"),w("pecah"),w("menjadi"),w("beberapa"),w("tahap")
    P=[(240,500),(440,430),(640,360)]
    st={"nodes":[N("tg",460,300,tg,270,icon="tangle",bare=True,enter="pop",idle="shake",grow={"at":kp,"to":1.25,"dur":12},out=pc),
      N("s1",460,300,pc,110,big="1",color=YL,to={"x":P[0][0],"y":P[0][1],"at":pc+2,"dur":16,"arc":90},enter="pop"),
      N("s2",460,300,pc,110,big="2",color=GR,to={"x":P[1][0],"y":P[1][1],"at":pc+8,"dur":16,"arc":110},enter="pop"),
      N("s3",460,300,pc,110,big="3",color=PK,to={"x":P[2][0],"y":P[2][1],"at":pc+14,"dur":16,"arc":130},enter="pop"),
      N("fl",810,250,th,150,icon="target",bare=True,enter="spin",idle="pulse")],
      "edges":[E("s1","s2",bb+4,flow=True),E("s2","s3",th,flow=True),E("s3","fl",th+6,flow=True)],
      "badges":[Bd("warn",560,150,kp,80),Bd("check",810,150,th+36,80)],
      "fx":[Fx("dizzy",460,160,kp,100),Fx("burst",460,300,pc,190),Fx("sparks",460,300,pc+4,260),Fx("confetti",810,250,th+34,150)],
      "shake":[{"at":pc,"amp":14,"dur":14}],"flash":[{"at":pc,"color":"#fff"}],
      "cam":[{"at":kp,"z":1.12,"x":460,"y":300,"dur":12},{"at":pc+16,"z":1,"dur":16}],
      "stick":STK(110,[(0,"idle"),(tg,"idle"),(kp,"stress"),(pc,"throw"),(th+34,"thumbs")],
        moves=[(bb,14,240,242,"walk"),(th-2,14,440,172,"hop"),(th+14,14,640,102,"hop")],y=350)}
    sd={"head":{"text":"PECAH JADI TAHAP","at":kl},
      "rows":[R(pc+10,"TAHAP 1","steps",ok=bb+16,hit=[pc+10]),R(pc+16,"TAHAP 2","steps",ok=th+10,hit=[pc+16]),R(pc+22,"TAHAP 3","steps",ok=th+28,hit=[pc+22])],
      "rowsTop":74,
      "meter":{"at":tg,"label":"BEBAN","fmt":"pct","color":"#FF7B72","keys":[{"f":tg,"v":0},{"f":kp,"v":100},{"f":pc,"v":100},{"f":pc+18,"v":28}],"shake":[kp]},
      "cast":[Cs(GP,"kerja",kl+4,125,185,0,emos=[(kp,"pusing"),(pc,"ide")],hop=[pc]),Cs(CK,"kerja",kl+8,365,185,0,emos=[(kp,"panik"),(pc,"cool")],say=[(pc,"!")])],
      "castTop":602,"pulse":[pc]}
    return {"dika":dk((0,"serius",560,520),(kp,"pusing",560,520),(pc,"tunjuk",560,520),(th,"jelas",560,520)),"stage":st,"side":sd}

def s5(w):
    mn,ai,mj,asu,lu,ck,hs=w("Minta"),w("AI"),w("menjelaskan"),w("asumsi"),w("lalu"),w("cek"),w("hasilnya")
    st={"nodes":[Mx("ai",760,330,0,CK,"kerja",200,emo=EM((mj,"ide"),(hs,"selesai")),enter="pop",idle="bob"),
      N("q",300,240,mn,120,icon="bubbleQ",bare=True,enter="pop",to={"x":680,"y":240,"at":ai,"dur":14,"arc":70},out=mj+2),
      N("a1",470,150,asu,100,icon="note",bare=True,enter="up",idle="bob"),
      N("a2",570,120,asu+5,100,icon="note",bare=True,enter="up",idle="bob"),
      N("a3",670,150,asu+10,100,icon="note",bare=True,enter="up",idle="bob"),
      N("lp",200,470,ck,170,icon="search",bare=True,enter="left",idle="wobble",to={"x":570,"y":190,"at":ck+8,"dur":18,"arc":-60}),
      ],
      "edges":[E("ai","a1",asu+2,bend=-30,dashed=True),E("ai","a3",asu+12,bend=30,dashed=True)],
      "badges":[Bd("check",470,80,hs,66),Bd("check",570,50,hs+4,66),Bd("check",670,80,hs+8,66)],
      "fx":[Fx("ring",760,330,ai,210,color="#111"),Fx("sparks",570,130,asu+6,200),Fx("burst",570,190,hs-2,80,color="#1B9E4B")],
      "cam":[{"at":ai,"z":1.1,"x":700,"y":260,"dur":12},{"at":ck+14,"z":1.12,"x":560,"y":190,"dur":12},{"at":hs+14,"z":1,"dur":16}],
      "stick":STK(170,[(0,"idle"),(mn,"point"),(asu,"idle"),(ck,"press"),(hs,"thumbs")])}
    sd={"head":{"text":"TANYA, LALU CEK","at":mn},
      "rows":[R(asu,"ASUMSI","ask",ok=hs-6,hit=[asu]),R(ck,"CEK","check",ok=hs,hit=[ck])],
      "meterTop":290,"meter":{"at":asu,"label":"YAKIN","fmt":"pct","keys":[{"f":asu,"v":30},{"f":ck,"v":38},{"f":hs,"v":90}]},
      "cast":[Cs(CK,"kerja",mn+4,125,250,0,emos=[(mj,"ide"),(hs,"hore")],hop=[asu]),Cs(GM,"kerja",mn+8,365,250,0,emos=[(ck,"checklist"),(hs,"hore")],say=[(ck,"?"),(hs,"OK")],hop=[hs])],
      "castTop":440,"pulse":[hs]}
    return {"dika":dk((0,"jelas",560,520),(asu,"detail",560,520),(ck,"baca",560,520),(hs,"jempol",560,520)),"stage":st,"side":sd}

def s6(w):
    jg,mm,ins,yg,sl,bt=w("Jangan"),w("menumpuk"),w("instruksi"),w("yang"),w("saling"),w("bertentangan")
    BX=[(660,500,"A",YL),(660,410,"B",GR),(660,320,"C",PK)]
    st={"nodes":[N("b1",BX[0][0],BX[0][1],mm,100,big="A",color=YL,enter="drop",idle="wobble",to={"x":820,"y":520,"at":bt,"dur":18,"arc":-40}),
      N("b2",BX[1][0],BX[1][1],ins,100,big="B",color=GR,enter="drop",idle="wobble",to={"x":560,"y":530,"at":bt+4,"dur":18,"arc":-70},rot=0),
      N("b3",BX[2][0],BX[2][1],yg,100,big="C",color=PK,enter="drop",idle="wobble",to={"x":740,"y":500,"at":bt+8,"dur":20,"arc":-120}),
      N("up",520,230,sl,110,icon="arrowUp",bare=True,enter="spin"),N("dn",800,230,sl,110,icon="arrowDown",bare=True,enter="spin"),
      Mx("ai",420,420,sl,GP,"kerja",160,emo=EM((bt,"pusing")),enter="pop")],
      "badges":[Bd("cross",660,170,bt,96)],
      "fx":[Fx("sparks",660,230,sl+6,230),Fx("burst",660,400,bt,230),Fx("dizzy",420,330,bt+4,110)],
      "shake":[{"at":bt,"amp":16,"dur":16}],"flash":[{"at":bt,"color":"#FF7B72"}],
      "cam":[{"at":sl,"z":1.12,"x":660,"y":300,"dur":12},{"at":bt+18,"z":1,"dur":16}],
      "stick":STK(170,[(0,"idle"),(mm,"lift"),(ins,"press"),(yg,"lift"),(sl,"stop"),(bt,"scared")])}
    sd={"head":{"text":"INSTRUKSI BERTUMPUK","at":jg},
      "rows":[R(mm,"ATURAN A","doc",bad=bt,hit=[mm]),R(ins,"ATURAN B","doc",bad=bt+3,hit=[ins]),R(yg,"ATURAN C","doc",bad=bt+6,hit=[yg])],
      "meter":{"at":mm,"label":"KACAU","fmt":"pct","color":"#FF7B72","keys":[{"f":mm,"v":5},{"f":yg,"v":30},{"f":sl,"v":55},{"f":bt,"v":100}],"shake":[bt]},
      "cast":[Cs(GP,"kerja",jg+4,125,185,0,emos=[(sl,"kaget"),(bt,"pusing")],hop=[bt],say=[(bt,"!?")]),Cs(CK,"kerja",jg+8,365,185,0,emos=[(bt,"panik")],hop=[sl])],
      "castTop":602,"pulse":[bt]}
    return {"dika":dk((0,"serius",560,520),(sl,"kaget",560,520),(bt,"pusing",560,520)),"stage":st,"side":sd}

def s7(w):
    fo,dn,ck,bi,bu,ku,pr,dn2,ct,pn=w("Follow"),w("dan"),w("cek"),w("bio"),w("buat"),w("kumpulan"),w("prompt"),w("dan",k=2),w("contoh"),w("penerapannya")
    st={"nodes":[N("pl",250,170,fo,170,icon="plus",enter="stamp",idle="pulse"),
      N("pf",250,170,fo,170,icon="person",bare=True,enter="none",opacity=0.0),
      N("ln",520,170,bi,150,icon="link",color=YL,enter="spin",idle="bob"),
      N("c1",330,430,ku,115,icon="doc",color="#fff",enter="up",idle="bob"),N("c2",470,430,pr,115,icon="doc",color=GR,enter="up",idle="bob"),
      N("c3",610,430,ct,115,icon="code",color=PU,enter="up",idle="bob"),N("c4",750,430,pn,115,icon="check",color=BL,enter="up",idle="bob"),
      Mx("m1",790,160,pn,FL,"hore",130),Mx("m2",650,170,pn+4,GP,"hore",120)],
      "edges":[E("pl","ln",bi,bend=40,flow=True)],
      "badges":[Bd("star",250,80,fo+10,70),Bd("check",520,90,bi+8,70)],
      "fx":[Fx("burst",250,170,fo,200),Fx("ring",520,170,bi,190,color="#111"),Fx("confetti",540,300,pn,170)],
      "stick":STK(130,[(0,"idle"),(fo,"present"),(ck,"point"),(ku,"present"),(pn,"cheer")])}
    sd={"head":{"text":"FOLLOW + CEK BIO","at":fo},
      "rows":[R(fo,"FOLLOW","hand",ok=fo+12,hit=[fo]),R(bi-6,"CEK BIO","doc",ok=bi+6,hit=[bi]),R(pr,"PROMPT","bulb",ok=pr+10,hit=[pr]),R(ct,"CONTOH","check",ok=pn,hit=[ct])],
      "cast":[Cs(CK,"kerja",fo+4,125,190,0,emos=[(pn,"hore")],hop=[fo,pn]),Cs(GP,"kerja",fo+8,365,190,0,emos=[(pn,"hore")],hop=[bi,pn],say=[(pn,"!")])],
      "castTop":602,"pulse":[fo,pn]}
    return {"dika":dk((0,"silakan",560,520),(bi,"tunjuk",560,520),(pn,"jempol",560,520)),"stage":st,"side":sd}

HOOK="Prompt 1.000 kata belum tentu lebih pintar."
CTA="Follow dan cek bio buat kumpulan prompt dan contoh penerapannya."
build("005","prompt-jelas-bukan-panjang","PROMPT JELAS, BUKAN PANJANG",
"Prompt yang efektif ditentukan oleh kejelasan peran, konteks, batasan, dan hasil yang bisa diperiksa, bukan oleh panjangnya.",HOOK,CTA,"BUILD WITH AI #005",[
Sc(3.8,HOOK,"JELAS LEBIH PENTING DARI PANJANG",s1,tsize=38,emph=["1.000","belum","pintar"]),
Sc(4.0,"Prompt yang efektif bukan soal seberapa panjang.","PANJANG BUKAN UKURAN",s2,emph=["efektif","panjang"]),
Sc(10.5,"Yang penting: peran atau tugasnya jelas, konteksnya cukup, batasannya disebutkan, dan hasil yang diminta bisa diperiksa.","EMPAT HAL YANG PENTING",s3,emph=["peran","konteksnya","batasannya","diperiksa"]),
Sc(4.6,"Kalau tugasnya kompleks, pecah menjadi beberapa tahap.","PECAH JADI TAHAP",s4,emph=["kompleks","pecah","tahap"]),
Sc(4.6,"Minta AI menjelaskan asumsi, lalu cek hasilnya.","MINTA ASUMSI, LALU CEK",s5,emph=["asumsi","cek"]),
Sc(4.6,"Jangan menumpuk instruksi yang saling bertentangan.","JANGAN SALING BERTENTANGAN",s6,tsize=38,emph=["menumpuk","bertentangan"]),
Sc(6.0,CTA,"CEK BIO",s7,emph=["Follow","bio"]),
])
