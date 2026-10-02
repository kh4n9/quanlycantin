
from PIL import Image
import os
sd = r"C:\Users\hoang\Desktop\quanlycantin\toan2026\split"
out = r"C:\Users\hoang\Desktop\quanlycantin\toan2026\zoom"
# narrower horizontal crops (left/right halves) to keep text large
jobs = [("p1_2.png",0.00,0.35,"c3L",0.0,0.62),("p1_3.png",0.30,0.72,"c4L",0.0,0.62),
        ("p2_1.png",0.28,0.55,"c56L",0.0,0.62),("p2_2.png",0.55,0.90,"c11L",0.0,0.62),
        ("p4_2.png",0.55,1.0,"p3q1L",0.0,0.62)]
for f,t,b,tag,x0,x1 in jobs:
    im = Image.open(os.path.join(sd,f)); w,h = im.size
    c = im.crop((int(w*x0),int(h*t),int(w*x1),int(h*b)))
    sc = min(1.0, 1850/c.width)
    if sc<1.0: c = c.resize((int(c.width*sc),int(c.height*sc)), Image.LANCZOS)
    c.save(os.path.join(out,tag+".png")); print(tag, c.size)
