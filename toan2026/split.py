
from PIL import Image
import glob, os
d = r"C:\Users\hoang\Desktop\quanlycantin\toan2026"
out = os.path.join(d,"split"); os.makedirs(out, exist_ok=True)
pages = ["1-1781178432795945544434.jpg","2-1781178445382560226102.jpg","3-17811784582152112769980.jpg","4-1781178467999285914374.jpg","5-17811784782501218450596.jpg"]
for p in pages:
    im = Image.open(os.path.join(d,p))
    w,h = im.size
    stem = p.split("-")[0]
    n = 3
    for i in range(n):
        top = int(h*i/n) - 20
        bot = int(h*(i+1)/n) + 20
        top=max(0,top); bot=min(h,bot)
        c = im.crop((0,top,w,bot))
        c = c.resize((int(c.width*2.2), int(c.height*2.2)), Image.LANCZOS)
        c.save(os.path.join(out, f"p{stem}_{i+1}.png"))
    print(p, "->", n, "slices", c.size)
