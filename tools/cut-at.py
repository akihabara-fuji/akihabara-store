import sys,subprocess,os
src,vdir=sys.argv[1:3];cuts=[0.0]+[float(x) for x in sys.argv[3:]]
d=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',src]));cuts.append(d)
os.makedirs(vdir,exist_ok=True)
for i in range(len(cuts)-1):
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',src,'-ss',f'{cuts[i]:.3f}','-to',f'{cuts[i+1]:.3f}','-c:a','libmp3lame','-q:a','2',f'{vdir}/{i+1}.mp3'],check=True)
    print(i+1,round(cuts[i+1]-cuts[i],2))
