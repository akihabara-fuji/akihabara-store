#!/usr/bin/env python3
"""Waktu mulai tiap kata per scene (frame audio, 30fps) dari mp3 hasil potong.
Pakai: python3 tools/word-timing.py <episode.json>  -> public/<voiceDir>/wt.json
Frasa dipisah di tanda baca; batas frasa dipasang di jeda hening terpanjang; di dalam frasa bobot = suku kata."""
import json,subprocess,re,sys,os
FPS=30
def sil(path):
    r=subprocess.run(['ffmpeg','-i',path,'-af','silencedetect=noise=-32dB:d=0.09','-f','null','-'],capture_output=True,text=True).stderr
    st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',r)]
    en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',r)]
    return st,en
def dur(path):
    return float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',path],capture_output=True,text=True).stdout)
def syl(w):
    w=re.sub(r'[^a-z0-9]','',w.lower())
    if re.fullmatch(r'[0-9]+',w): return max(2,len(w)+1)
    n=len(re.findall(r'[aeiou]+',w))
    return max(1,n)+0.15*len(w)/4
def main(ej):
    d=json.load(open(ej)); vd=os.path.join('public',d['voiceDir']); out=[]
    for i,s in enumerate(d['scenes']):
        p=os.path.join(vd,f'{i+1}.mp3'); words=s['caption'].split()
        D=dur(p); st,en=sil(p)
        s0=en[0] if st and st[0]<0.02 and en else 0.0
        s1=st[-1] if st and en and len(st)>len(en)-0 and st[-1]>D-0.6 else D
        if st and st[-1]>D-0.8: s1=st[-1]
        gaps=[(a,b) for a,b in zip(st,en) if a>s0+0.05 and b<s1-0.02 and b-a>=0.1]
        ph=[[]]
        for w in words:
            ph[-1].append(w)
            if re.search(r'[,:;.!?]$',w) and w is not words[-1]: ph.append([])
        P=len(ph)
        if P>1 and len(gaps)>=P-1:
            top=sorted(sorted(gaps,key=lambda g:g[0]-g[1])[:P-1])
            bounds=[(s0,top[0][0])]+[(top[k][1],top[k+1][0]) for k in range(P-2)]+[(top[-1][1],s1)]
        else:
            tot=sum(sum(syl(w) for w in p_)+ (1.2 if k<P-1 else 0) for k,p_ in enumerate(ph))
            bounds=[];t=s0
            for k,p_ in enumerate(ph):
                wsum=sum(syl(w) for w in p_)+(1.2 if k<P-1 else 0)
                e=t+(s1-s0)*wsum/tot; bounds.append((t,e-(s1-s0)*(1.2 if k<P-1 else 0)/tot)); t=e
        ts=[]
        for (a,b),p_ in zip(bounds,ph):
            tw=sum(syl(w) for w in p_); t=a
            for w in p_:
                ts.append(round(t*FPS)); t+=(b-a)*syl(w)/tw
        out.append(ts)
    json.dump(out,open(os.path.join(vd,'wt.json'),'w'))
    print('ok',[len(x) for x in out])
main(sys.argv[1])
