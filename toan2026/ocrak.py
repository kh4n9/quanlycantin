
import os
from PIL import Image
from rapidocr_onnxruntime import RapidOCR
d = r"C:\Users\hoang\Desktop\quanlycantin\toan2026"
ocr = RapidOCR()
out=[]
# 1) official answer key image (goi y dap an)
im = Image.open(os.path.join(d,"goiydapanmontoan-17811749212321451157807.jpg")).convert("RGB")
w,h = im.size
for i in range(3):
    c = im.crop((0,int(h*i/3),w,int(h*(i+1)/3)))
    sc = min(2.0, 2200/c.width)
    if sc != 1.0: c = c.resize((int(c.width*sc),int(c.height*sc)), Image.LANCZOS)
    res,_ = ocr(c)
    out.append("---- AK band %d ----"%(i+1))
    out.extend([r[1] for r in (res or [])])
# 2) official PDF answer key (banded, high dpi)
import pymupdf
doc = pymupdf.open(os.path.join(d,"dapanchinhthuc.pdf")); p = doc[0]
for i in range(3):
    r = pymupdf.Rect(0, p.rect.height*i/3-8, p.rect.width, p.rect.height*(i+1)/3+8)
    pm = p.get_pixmap(dpi=300, clip=r)
    pil = Image.frombytes("RGB",[pm.width,pm.height],pm.samples)
    res,_ = ocr(pil)
    out.append("---- PDF AK band %d ----"%(i+1))
    out.extend([x[1] for x in (res or [])])
open(os.path.join(d,"ocr_ak.txt"),"w",encoding="utf-8").write("\n".join(out))
print("saved", len(out), "lines")
