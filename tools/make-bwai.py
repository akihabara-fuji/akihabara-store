import json,os
PK="#FFD3E6";GR="#C9F5E1";LM="#C8F135";YL="#FFE45E";PU="#DCD0FF";BL="#CFE3FF"
L={'claude-kotak':'Claude','chatgpt':'ChatGPT','gemini':'Gemini','flow':'Flow'}
def tim(*a): return [{"name":n,"emotion":"kerja","label":L[n],"text":t,"at":at} for n,t,at in a]
def dk(*a):
    o=[]
    for at,e,s,x,*fl in a:
        d={"at":at,"emotion":e,"size":s,"x":x}
        if fl: d["flip"]=True
        o.append(d)
    return o
def M(i,x,y,n,at,size=140): return {"id":i,"x":x,"y":y,"at":at,"size":size,"mascot":{"name":n,"emotion":"kerja"}}
def I(i,x,y,ic,col,at,size=130): return {"id":i,"x":x,"y":y,"at":at,"size":size,"icon":ic,"color":col}
def E(a,b,at,dashed=False): return {"from":a,"to":b,"at":at,"dashed":dashed}
def B(x,y,k,at,size=64): return {"x":x,"y":y,"kind":k,"at":at,"size":size}
def ST(x,keys,y=330,s=0.5,flip=False): return {"x":x,"y":y,"s":s,"flip":flip,"keys":[{"f":f,"pose":p,"blend":8} for f,p in keys]}
def sc(sec,cap,t,d,stage,title="",**k):
    s={"sfx":[0],"type":"split","sec":sec,"title":title,"caption":cap,"panelNote":"","tim":t,"dikaSeq":d,"stage":stage}
    s.update(k); return s
def ep(num,slug,title,msg,hook,ctatext,scenes):
    d={"episode":num,"slug":slug,"title":title,"status":"draf","hideBrand":True,
    "editorial":{"message":msg,"hook":{"text":hook,"type":"pernyataan","appearBySec":0,"sceneIndex":0},
    "cta":{"text":ctatext,"action":"follow","sceneIndex":6}},
    "brand":{"name":"Dika Priyadi","handle":""},"gear":"none","voiceDir":"voice-ep"+num,"scenes":scenes,"captionStyle":"mix"}
    os.makedirs(f"episodes/{num}-{slug}",exist_ok=True)
    json.dump(d,open(f"episodes/{num}-{slug}/episode.json","w"),ensure_ascii=False,indent=2)
def cta(txt):
    return sc(6.5,txt,tim(("claude-kotak","Cek bio ya.",10),("chatgpt","Follow dulu.",80)),dk((0,"silakan",560,520)),
      {"stick":ST(170,[(0,"present")]),"nodes":[I("p",520,190,"plus",LM,6,150),I("l",780,190,"link",YL,18,150),M("a",520,470,"claude-kotak",30,110),M("b",650,470,"chatgpt",36,110),M("c",780,470,"flow",42,110)],"edges":[E("p","l",14)]},
      emph=["Follow","bio"])
c3="Follow dan cek bio buat lihat workflow AI yang sedang gue kembangkan."
ep("003","tim-ai-tugasnya-beda","SATU TIM AI, TUGASNYA BEDA",
"Jangan suruh semua AI mengerjakan hal yang sama; bagi tugas per tahap, lalu rangkai dan periksa, karena tools tidak otomatis saling terhubung.",
"Jangan suruh semua AI mengerjakan hal yang sama.",c3,[
sc(3.5,"Jangan suruh semua AI mengerjakan hal yang sama.",tim(("claude-kotak","Tugas saya apa?",10),("chatgpt","Beda tugas.",30)),dk((0,"serius",600,500)),
  {"stick":ST(110,[(0,"stress"),(46,"point")]),"nodes":[I("t",560,300,"doc",YL,4,170),M("a",330,110,"claude-kotak",8),M("b",330,490,"chatgpt",14),M("c",790,110,"gemini",20),M("d",790,490,"flow",26)],
   "edges":[E("a","t",18),E("b","t",22),E("c","t",26),E("d","t",30)],"badges":[B(660,205,"cross",50,72)]},
  title="BAGI TUGASNYA, BUKAN CUMA BAGI PROMPT",titleSize=38,emph=["semua","sama"]),
sc(6,"Bayangin satu proyek konten. Satu model bantu riset dan menyusun struktur.",tim(("gemini","Riset dulu.",10),("claude-kotak","Susun struktur.",90)),dk((0,"jelas",560,520),(100,"mikir",520,540,1)),
  {"stick":ST(110,[(0,"present")]),"nodes":[I("f",340,300,"folder",YL,4,160),M("c",590,300,"claude-kotak",16,150),I("s",830,140,"search",BL,34),I("l",830,460,"list",PK,56)],
   "edges":[E("f","c",12),E("c","s",30),E("c","l",52)]},title="Satu Proyek Konten",titleColor=PK,emph=["proyek","riset","struktur"]),
sc(7,"Model lain bantu menulis naskah. Coding assistant mengerjakan komponen.",tim(("chatgpt","Saya tulis naskah.",10),("claude-kotak","Saya buat komponen.",100)),dk((0,"jelas",540,520),(110,"serius",540,520,1)),
  {"stick":ST(100,[(0,"point")]),"nodes":[M("a",340,150,"chatgpt",4),I("d",640,150,"doc",GR,22),M("b",340,450,"claude-kotak",50),I("k",640,450,"code",PU,70)],
   "edges":[E("a","d",18),E("b","k",66)],"badges":[B(720,95,"check",44),B(720,395,"check",92)]},title="Tugas Tiap AI",titleColor=GR,emph=["naskah","komponen"]),
sc(6,"Tool visual membuat footage. Voice tool menghasilkan narasi.",tim(("flow","Saya buat footage.",10),("chatgpt","Narasi dari voice tool.",100)),dk((0,"jelas",540,520),(110,"serius",540,520,1)),
  {"stick":ST(100,[(0,"point")]),"nodes":[M("a",340,150,"flow",4),I("f",640,150,"film",PK,22),I("m",340,450,"mic",PU,50),I("w",640,450,"wave",BL,70)],
   "edges":[E("a","f",18),E("m","w",66)],"badges":[B(720,95,"check",44),B(720,395,"check",90)]},title="Visual dan Suara",titleColor=GR,emph=["footage","narasi"]),
sc(4,"Lalu semuanya dirangkai dan dicek.",tim(("claude-kotak","Dirangkai.",10),("flow","Lalu dicek.",60)),dk((0,"baca",540,520,1)),
  {"stick":ST(460,[(0,"point"),(70,"thumbs")],y=340,s=0.45),"nodes":[I("n1",110,170,"list",PK,4,115),I("n2",290,170,"doc",GR,10,115),I("n3",470,170,"code",PU,16,115),I("n4",650,170,"film",PK,22,115),I("n5",830,170,"wave",BL,28,115)],
   "edges":[E("n1","n2",14),E("n2","n3",20),E("n3","n4",26),E("n4","n5",32)],"badges":[B(110,95,"check",44,52),B(290,95,"check",54,52),B(470,95,"check",64,52),B(650,95,"check",74,52),B(830,95,"check",84,52)]},title="Dirangkai dan Dicek",titleColor=GR,emph=["dirangkai","dicek"]),
sc(8,"Ini bukan berarti semua tools otomatis saling terhubung. Kita tetap perlu alur kerja, format file, dan pemeriksaan di setiap tahap.",tim(("chatgpt","Belum otomatis nyambung.",10),("claude-kotak","Perlu alur kerja.",110)),dk((0,"serius",540,520),(120,"jelas",560,520)),
  {"stick":ST(460,[(0,"think"),(100,"point")],y=340,s=0.45),"nodes":[I("a",200,170,"doc",GR,4),I("b",460,170,"code",PU,10),I("c",720,170,"film",PK,16),I("g",330,420,"gear",YL,50,100),I("h",590,420,"file",BL,70,100)],
   "edges":[E("a","b",20,True),E("b","c",26,True)],"badges":[B(330,170,"warn",30),B(590,170,"warn",36),B(200,95,"check",96,52),B(460,95,"check",106,52),B(720,95,"check",116,52)]},title="Belum Otomatis",titleColor=PK,emph=["otomatis","alur","pemeriksaan"]),
cta(c3)])
c4="Follow dan cek bio buat lihat proses development dan proyek yang gue kerjakan."
ep("004","claude-code-bukan-sekadar-tanya","CLAUDE CODE BUKAN SEKADAR TANYA",
"AI coding paling berguna saat bekerja di dalam proyek dengan konteks repository, tetapi hasilnya tetap harus dibuktikan lewat diff dan aplikasi yang dijalankan.",
"AI coding paling berguna saat dia bekerja di dalam proyek.",c4,[
sc(3.5,"AI coding paling berguna saat dia bekerja di dalam proyek.",tim(("claude-kotak","Saya di dalam proyek.",10)),dk((0,"serius",600,500)),
  {"stick":ST(120,[(0,"typeA"),(8,"typeB"),(16,"typeA"),(24,"typeB")]),"nodes":[I("f",470,300,"folder",YL,4,200),M("c",740,300,"claude-kotak",18,160)],"edges":[E("c","f",26)]},
  title="BUKAN CUMA TANYA KODE",emph=["proyek"]),
sc(4.5,"Di workflow coding, konteks repository itu penting.",tim(("claude-kotak","Konteksnya mana?",10),("chatgpt","Repository dulu.",60)),dk((0,"jelas",560,520)),
  {"nodes":[M("c",120,300,"claude-kotak",4,170)],"term":{"x":290,"y":60,"w":590,"h":480,"title":"repository","rows":[{"k":"cmd","t":"ls"},{"k":"dir","t":"src/"},{"k":"file","t":"  App.tsx"},{"k":"file","t":"  index.ts"},{"k":"dir","t":"public/"},{"k":"file","t":"package.json"}],"at":6}},title="Konteks Repository",titleColor=PK,emph=["konteks","repository"]),
sc(7.5,"Assistant perlu memahami struktur folder, file yang sudah ada, dependensi, dan cara proyek dijalankan.",tim(("claude-kotak","Saya baca strukturnya.",10),("chatgpt","Dependensi juga.",120)),dk((0,"baca",540,520,1),(120,"jelas",560,520)),
  {"stick":ST(110,[(0,"think")]),"nodes":[I("a",420,170,"folder",YL,4),I("b",700,170,"file",BL,12),I("c",420,440,"box",PK,20),I("d",700,440,"play",GR,28)],
   "badges":[B(490,110,"check",40),B(770,110,"check",70),B(490,380,"check",100),B(770,380,"check",130)]},title="Yang Perlu Dipahami",titleColor=GR,emph=["struktur","dependensi","dijalankan"]),
sc(6,"Baru setelah itu dia bisa membantu mengubah kode, menjalankan test, dan memperbaiki error.",tim(("claude-kotak","Ubah kode.",10),("flow","Jalankan test.",80),("chatgpt","Perbaiki error.",140)),dk((0,"jelas",560,520)),
  {"term":{"x":40,"y":70,"w":840,"h":470,"title":"terminal","rows":[{"k":"cmd","t":"ubah App.tsx","at":8},{"k":"cmd","t":"npm test","at":40},{"k":"bad","t":"1 test gagal","at":62},{"k":"cmd","t":"perbaiki error","at":100},{"k":"ok","t":"semua test lulus","at":140}],"at":2}},title="Ubah, Test, Perbaiki",titleColor=GR,emph=["kode","test","error"]),
sc(4,"Tapi jangan langsung percaya tulisan 'berhasil'.",tim(("chatgpt","Katanya berhasil.",10),("claude-kotak","Buktikan dulu.",60)),dk((0,"serius",560,520)),
  {"stick":{"x":170,"y":330,"s":0.5,"keys":[{"f":0,"pose":"think"},{"f":22,"pose":"runA","blend":2},{"f":26,"pose":"runB","blend":2},{"f":30,"pose":"runA","blend":2},{"f":34,"pose":"runB","blend":2},{"f":38,"pose":"runA","blend":2},{"f":42,"pose":"runB","blend":2},{"f":46,"pose":"think","blend":6}],"move":{"x0":800,"x1":300,"at":22,"dur":24}},
   "nodes":[M("c",800,250,"claude-kotak",2,150),I("ck",560,150,"check",GR,50,130),I("s",560,440,"search",BL,86,110)],"edges":[E("ck","s",80)],"badges":[B(640,90,"q",70),B(640,90,"cross",96,72)]},title="Jawaban Ngebut, Tapi Salah?",titleColor=PK,emph=["jangan","berhasil"]),
sc(6.5,"Cek diff, jalankan aplikasi, dan buktikan fiturnya bekerja.",tim(("claude-kotak","Diff dicek.",10),("chatgpt","Aplikasi dijalankan.",80),("flow","Fitur terbukti.",140)),dk((0,"baca",540,520,1),(120,"jelas",560,520)),
  {"stick":ST(740,[(0,"point"),(100,"thumbs")],y=370,s=0.38),"term":{"x":30,"y":60,"w":540,"h":330,"title":"diff","rows":[{"k":"del","t":"total = 0","at":8},{"k":"add","t":"total = sum(items)","at":24},{"k":"cmd","t":"npm test","at":50},{"k":"ok","t":"lulus","at":70}],"at":2},
   "nodes":[I("p",740,170,"play",GR,50,140)],"badges":[B(810,110,"check",100)]},title="Buktikan Dulu",titleColor=GR,emph=["diff","aplikasi","buktikan"]),
cta(c4)])
# thumbs
import re
r=open('src/Root.tsx').read()
open('src/Root.tsx','w').write(r)
