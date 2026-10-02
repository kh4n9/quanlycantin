
import os, sys
from PIL import Image
from rapidocr_onnxruntime import RapidOCR
d = r"C:\Users\hoang\Desktop\quanlycantin\toan2026"
ocr = RapidOCR()
pages = ["1-1781178432795945544434.jpg","2-1781178445382560226102.jpg","3-17811784582152112769980.jpg","4-1781178467999285914374.jpg","5-17811784782501218450596.jpg"]
allout = []
for p in pages:
    im = Image.open(os.path.join(d,p)).convert("RGB")
    w,h = im.size
    sc = min(2.0, 2000/w)
    im2 = im.resize((int(w*sc), int(h*sc)), Image.LANCZOS)
    res, _ = ocr(im2)
    lines = [r[1] for r in (res or [])]
    allout.append("="*30 + " PAGE " + p + " " + "="*30)
    allout.extend(lines)
    print("PAGE", p, len(lines), "lines")
open(os.path.join(d,"ocr_exam.txt"),"w",encoding="utf-8").write("\n".join(allout))
print("saved")
