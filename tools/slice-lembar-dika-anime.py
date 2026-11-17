import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
fn='/mnt/user-data/uploads/c35022e5-image.png'; name='dika-anime'
raw=Image.open(fn)
if raw.mode=='RGBA':
    b=Image.new('RGBA',raw.size,(255,255,255,255)); b.alpha_composite(raw); raw=b
a=np.asarray(raw.convert('RGB')).astype(np.float32)
mx=a.max(2);mn=a.min(2);sat=(mx-mn)/(mx+1e-3);lum=a.mean(2)
bgl=(sat<0.10)&(lum>=150)
lab,n=ndi.label(bgl)
border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
fg=ndi.binary_opening(~np.isin(lab,list(border)),iterations=1)
cl,cn=ndi.label(fg)
idx=range(1,cn+1)
areas=np.array(ndi.sum(fg,cl,idx)); coms=np.array(ndi.center_of_mass(fg,cl,idx))
mains=[i for i in idx if areas[i-1]>=8000]; smalls=[i for i in idx if 120<=areas[i-1]<8000]
groups={m:[m] for m in mains}
for s in smalls:
    d=[np.hypot(*(coms[s-1]-coms[m-1])) for m in mains]; groups[mains[int(np.argmin(d))]].append(s)
order=sorted(mains,key=lambda m:coms[m-1][0])
rows=[[order[0]]]
for m in order[1:]:
    if coms[m-1][0]-np.mean([coms[x-1][0] for x in rows[-1]])>90: rows.append([m])
    else: rows[-1].append(m)
rows=[sorted(r,key=lambda m:coms[m-1][1]) for r in rows]
print('rows',[len(r) for r in rows],'total',sum(len(r) for r in rows))
H,W=fg.shape; k=0
for r in rows:
    for m in r:
        k+=1
        mk=ndi.binary_fill_holes(np.isin(cl,groups[m]))|np.isin(cl,groups[m])
        outer=ndi.binary_dilation(mk,iterations=6)
        al=Image.fromarray((outer*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
        rgba=np.zeros((H,W,4),np.uint8); rgba[...,:3]=255; rgba[mk,:3]=a[mk].astype(np.uint8); rgba[...,3]=np.asarray(al)
        ys,xs=np.where(outer)
        Image.fromarray(rgba[max(ys.min()-2,0):ys.max()+3,max(xs.min()-2,0):xs.max()+3]).save(f'public/mascot/{name}-{k:02d}.png')
