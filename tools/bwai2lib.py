# Generator Part 5 & 6 (BUILD WITH AI). Semua cue dikunci ke KATA: w("kata") = frame lokal scene.
import json,os,re,sys
OV=16;FPS=30
PK="#FFD3E6";GR="#C9F5E1";LM="#C8F135";YL="#FFE45E";PU="#DCD0FF";BL="#CFE3FF";GY="#D9DCE3";RD="#FF7B72"
norm=lambda s:re.sub(r'[^a-z0-9]','',s.lower())
def syl(w):
    w=norm(w)
    if w.isdigit(): return max(2,len(w)+1)
    return max(1,len(re.findall(r'[aeiou]+',w)))+0.15*len(w)/4
def est(words,sec):
    D=sec*FPS-12;a=4;tot=sum(syl(w)+(1.4 if re.search(r'[,.:;!?]$',w) else 0) for w in words);t=a;o=[]
    for w in words:
        o.append(round(t));t+=(D-a)*(syl(w)+(1.4 if re.search(r'[,.:;!?]$',w) else 0))/tot
    return o
def N(i,x,y,at,size=130,**k): d={"id":i,"x":x,"y":y,"at":at,"size":size};d.update(k);return d
def Mx(i,x,y,at,name,e0="kerja",size=150,**k): return N(i,x,y,at,size,mascot={"name":name,"emotion":e0},**k)
def E(a,b,at,**k): d={"from":a,"to":b,"at":at};d.update(k);return d
def Bd(kind,x,y,at,size=64,**k): d={"kind":kind,"x":x,"y":y,"at":at,"size":size};d.update(k);return d
def Fx(k,x,y,at,size=140,**kw): d={"k":k,"x":x,"y":y,"at":at,"size":size};d.update(kw);return d
def STK(x,keys,moves=None,y=350,s=0.5,flip=False,**k):
    d={"x":x,"y":y,"s":s,"flip":flip,"keys":[{"f":f,"pose":p,"blend":8} for f,p in keys]}
    if moves: d["moves"]=[{"at":a,"dur":du,"x":xx,**({"y":yy} if yy is not None else {}),"gait":g} for a,du,xx,yy,g in moves]
    d.update(k);return d
def R(at,label,icon,ok=None,bad=None,hit=None): 
    d={"at":at,"label":label,"icon":icon}
    if ok is not None:d["ok"]=ok
    if bad is not None:d["bad"]=bad
    if hit:d["hit"]=hit
    return d
def Cs(name,emo,at,x,size=190,y=0,say=None,emos=None,hop=None):
    d={"name":name,"emotion":emo,"at":at,"x":x,"size":size,"y":y}
    if say:d["say"]=[{"at":a,"t":t} for a,t in say]
    if emos:d["emo"]=[{"at":a,"e":e} for a,e in emos]
    if hop:d["hop"]=hop
    return d
def dk(*a):
    o=[]
    for at,e,s,x,*fl in a:
        d={"at":at,"emotion":e,"size":s,"x":x}
        if fl:d["flip"]=True
        o.append(d)
    return o
class Sc:
    def __init__(s,sec,cap,title,fn,tsize=44,emph=None,tcol=None): s.sec=sec;s.cap=cap;s.title=title;s.fn=fn;s.tsize=tsize;s.emph=emph or [];s.tcol=tcol
def build(num,slug,title,msg,hook,ctatext,tag,scs):
    ed=f"episodes/{num}-{slug}";vd=f"public/voice-ep{num}/wt.json"
    WT=json.load(open(vd)) if os.path.exists(vd) else None
    scenes=[]
    for i,sc in enumerate(scs):
        words=sc.cap.split();wt=WT[i] if WT else est(words,sc.sec);off=OV if i else 0
        used={}
        def w(word,d=0,k=1,_w=words,_wt=wt,_o=off):
            n=norm(word);c=0
            for j,x in enumerate(_w):
                if norm(x)==n:
                    c+=1
                    if c==k:return _wt[j]+_o+d
            raise KeyError(f"{word} not in {sc.cap}")
        r=sc.fn(w)
        s={"sfx":[],"type":"split","sec":sc.sec,"title":sc.title,"titleSize":sc.tsize,"caption":sc.cap,"panelNote":"","tag":tag,"wt":wt,"dikaSeq":r["dika"],"stage2":r["stage"],"side":r["side"]}
        if sc.tcol:s["titleColor"]=sc.tcol
        s["emph"]=sc.emph;scenes.append(s)
    d={"episode":num,"slug":slug,"title":title,"status":"draf","hideBrand":True,
    "editorial":{"message":msg,"hook":{"text":hook,"type":"pernyataan","appearBySec":0,"sceneIndex":0},"cta":{"text":ctatext,"action":"follow","sceneIndex":len(scs)-1}},
    "brand":{"name":"Dika Priyadi","handle":""},"gear":"none","voiceDir":"voice-ep"+num,"scenes":scenes,"captionStyle":"mix"}
    os.makedirs(ed,exist_ok=True);json.dump(d,open(f"{ed}/episode.json","w"),ensure_ascii=False,indent=2)
    print("wrote",ed,"voice-timed" if WT else "estimated")
