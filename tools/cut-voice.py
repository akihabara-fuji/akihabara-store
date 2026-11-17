import re,subprocess,sys,os
src,out,n=sys.argv[1],sys.argv[2],int(sys.argv[3])
r=subprocess.run(['ffmpeg','-i',src,'-af','silencedetect=noise=-30dB:d=0.12','-f','null','-'],capture_output=True,text=True).stderr
st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',r)]
en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',r)]
dur=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',src],capture_output=True,text=True).stdout)
gaps=[(s,e) for s,e in zip(st,en) if s>0.3 and e<dur-0.1]
top=sorted(sorted(gaps,key=lambda g:g[1]-g[0],reverse=True)[:n-1])
print('dur',dur,[(round(s,2),round(e,2),round(e-s,2)) for s,e in top])
cuts=[0]+[(s+e)/2 for s,e in top]+[dur]
os.makedirs(out,exist_ok=True)
for i in range(n):
    subprocess.run(['ffmpeg','-v','error','-y','-i',src,'-ss',str(cuts[i]),'-to',str(cuts[i+1]),'-c:a','libmp3lame','-q:a','3',f'{out}/{i+1}.mp3'])
    print(i+1,round(cuts[i+1]-cuts[i],2))
