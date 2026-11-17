import sys,subprocess,re,json,os
src,vdir,epjson=sys.argv[1:4]
ep=json.load(open(epjson))
caps=[s['caption'] for s in ep['scenes']]
dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',src]).decode())
out=subprocess.run(['ffmpeg','-hide_banner','-i',src,'-af','silencedetect=noise=-30dB:d=0.15','-f','null','-'],capture_output=True,text=True).stderr
st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',out)]
en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',out)]
gaps=[((a+b)/2,a,b) for a,b in zip(st,en) if a>0.3 and b<dur-0.2]
# speech start/end
first=en[0] if st and st[0]<0.05 else 0
last=st[-1] if st and en[-1]>=dur-0.05 or (st and len(st)>len(en)) else dur
tot=sum(len(c) for c in caps); cum=0; cuts=[0.0]; used=set()
for c in caps[:-1]:
    cum+=len(c); exp=first+(last-first)*cum/tot
    g=min((g for g in gaps if g[0] not in used),key=lambda g:abs(g[0]-exp)); used.add(g[0]); cuts.append(g[0]); print(f'batas {cum}/{tot} exp {exp:.2f} -> {g[0]:.2f}')
cuts.append(dur); cuts=sorted(cuts)
os.makedirs(vdir,exist_ok=True)
for i in range(len(caps)):
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',src,'-ss',f'{cuts[i]:.3f}','-to',f'{cuts[i+1]:.3f}','-c:a','libmp3lame','-q:a','2',f'{vdir}/{i+1}.mp3'],check=True)
    print(i+1,round(cuts[i+1]-cuts[i],2),caps[i][:50])
