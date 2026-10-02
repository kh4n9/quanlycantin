
import os
from PIL import Image
from rapidocr_onnxruntime import RapidOCR
d = r"C:\Users\hoang\Desktop\quanlycantin\toan2026"
ocr = RapidOCR()
out=[]
def run(img, tag, sc=3.0):
    c = img.resize((int(img.width*sc), int(img.height*sc)), Image.LANCZOS)
    res,_ = ocr(c)
    out.append("---- %s ----"%tag)
    out.extend([r[1] for r in (res or [])])

p1 = Image.open(os.path.join(d,"1-1781178432795945544434.jpg")).convert("RGB")
w,h = p1.size
# cau 3+4 region (roughly y 0.30-0.50 of page1)
run(p1.crop((0,int(h*0.30),w,int(h*0.52))), "P1_C3_C4")
# cau 2 region top
run(p1.crop((0,int(h*0.14),w,int(h*0.31))), "P1_C2")

p2 = Image.open(os.path.join(d,"2-1781178445382560226102.jpg")).convert("RGB")
w2,h2 = p2.size
run(p2.crop((0,int(h2*0.62),w2,int(h2*0.80))), "P2_C11", 3.2)
run(p2.crop((0,int(h2*0.80),w2,int(h2*0.95))), "P2_C12", 3.2)
open(os.path.join(d,"ocr_zoom.txt"),"w",encoding="utf-8").write("\n".join(out))
print("ok")
