import sys, json, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

U='/mnt/user-data/uploads/'
SHEETS=[
 ('dika','7f14a23d-image.png',5,3),
 ('claude-kotak','f6bb470a-image.png',5,3),
 ('claude-cewek','834e5158-image.png',5,4),
 ('chatgpt','cf15741e-image.png',5,4),
 ('gemini','b3097b6f-image.png',5,4),
 ('flow','a747cdb7-image.png',5,4),
 ('n8n','1e2b69ef-image.png',5,4),
 ('whatsapp','a2f060b1-image.png',5,4),
 ('tiktok','2f1093fc-image.png',5,4),
 ('instagram','4b549172-image.png',5,4),
]
OUT='public/mascot'
report={}
for name,fn,cols,rows in SHEETS:
    raw=Image.open(U+fn)
    if raw.mode=='RGBA':
        bgw=Image.new('RGBA',raw.size,(255,255,255,255)); bgw.alpha_composite(raw); raw=bgw
    im=raw.convert('RGB'); a=np.asarray(im).astype(np.float32)
    mx=a.max(2); mn=a.min(2); sat=(mx-mn)/(mx+1e-3)
    lum=a.mean(2)
    bgl=(sat<0.10)&(lum>=150)
    # bg = bg-like pixels connected to image border
    lab,n=ndi.label(bgl)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(border))
    fg=~bg
    fg=ndi.binary_opening(fg,iterations=1)
    cl,cn=ndi.label(fg)
    H,W=fg.shape
    areas=ndi.sum(fg,cl,range(1,cn+1))
    coms=ndi.center_of_mass(fg,cl,range(1,cn+1))
    cells={}
    for idx,(ar,(cy,cx)) in enumerate(zip(areas,coms),1):
        if ar<120: continue
        r=min(rows-1,int(cy/(H/rows))); k=min(cols-1,int(cx/(W/cols)))
        cells.setdefault((r,k),[]).append(idx)
    exp=cols*rows
    ok=True; items=[]
    for r in range(rows):
        for k in range(cols):
            lst=cells.get((r,k),[])
            if not lst: ok=False; continue
            big=max(lst,key=lambda i:areas[i-1])
            if areas[big-1]<8000: ok=False
            m=np.isin(cl,lst)
            m=ndi.binary_fill_holes(m)|m
            # add white sticker outline
            outer=ndi.binary_dilation(m,iterations=6)
            alpha=Image.fromarray((outer*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
            rgba=np.zeros((H,W,4),np.uint8)
            rgba[...,:3]=255
            rgba[m,:3]=a[m].astype(np.uint8)
            rgba[...,3]=np.asarray(alpha)
            ys,xs=np.where(outer)
            y0,y1,x0,x1=max(ys.min()-2,0),min(ys.max()+3,H),max(xs.min()-2,0),min(xs.max()+3,W)
            Image.fromarray(rgba[y0:y1,x0:x1]).save(f"{OUT}/{name}-{r*cols+k+1:02d}.png")
            items.append(r*cols+k+1)
    report[name]={'expected':exp,'saved':len(items),'ok':ok and len(items)==exp}
    print(name,report[name])
json.dump(report,open('tools/slice-report.json','w'),indent=1)
