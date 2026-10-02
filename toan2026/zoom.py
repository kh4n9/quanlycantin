
from PIL import Image
import os
d = r"C:\Users\hoang\Desktop\quanlycantin\toan2026"
out = os.path.join(d,"zoom")
os.makedirs(out, exist_ok=True)
jobs = [
 ("1-1781178432795945544434.jpg", 0.28, 0.40, "q34a", 1.8),
 ("1-1781178432795945544434.jpg", 0.40, 0.52, "q34b", 1.8),
 ("2-1781178445382560226102.jpg", 0.13, 0.25, "q56a", 1.8),
 ("2-1781178445382560226102.jpg", 0.25, 0.37, "q56b", 1.8),
 ("4-1781178467999285914374.jpg", 0.55, 0.68, "p3q1a", 1.8),
 ("4-1781178467999285914374.jpg", 0.68, 0.80, "p3q1b", 1.8),
]
for f, t, b, tag, sc in jobs:
    im = Image.open(os.path.join(d,f)); w,h = im.size
    c = im.crop((0, int(h*t), w, int(h*b)))
    sc = min(sc, 1900/c.width)
    c = c.resize((int(c.width*sc), int(c.height*sc)), Image.LANCZOS)
    c.save(os.path.join(out, tag+".png")); print(tag, c.size)
