
from PIL import Image
import os
sd = r"C:\Users\hoang\Desktop\quanlycantin\toan2026\split"
out = r"C:\Users\hoang\Desktop\quanlycantin\toan2026\zoom"
jobs = [("p1_2.png",0.00,0.22,"c3"), ("p1_3.png",0.55,1.00,"c4"),
        ("p4_2.png",0.00,0.75,"p3q1"), ("p2_1.png",0.30,0.75,"c67")]
for f,t,b,tag in jobs:
    im = Image.open(os.path.join(sd,f)); w,h = im.size
    c = im.crop((0,int(h*t),w,int(h*b)))
    sc = min(2.0, 1900/c.width)
    c = c.resize((int(c.width*sc),int(c.height*sc)), Image.LANCZOS)
    c.save(os.path.join(out,tag+"_z.png")); print(tag, c.size)
