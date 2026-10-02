
import pymupdf, os
d = r"C:\Users\hoang\Desktop\quanlycantin\toan2026"
doc = pymupdf.open(os.path.join(d,"dapanchinhthuc.pdf"))
p = doc[0]
print("size", p.rect)
pix = p.get_pixmap(dpi=400)
pix.save(os.path.join(d,"ak_full.png"))
print("saved", pix.width, pix.height)
# also split into 4 vertical bands at good dpi
for i in range(4):
    r = pymupdf.Rect(0, p.rect.height*i/4 - 10, p.rect.width, p.rect.height*(i+1)/4 + 10)
    pm = p.get_pixmap(dpi=450, clip=r)
    pm.save(os.path.join(d,f"ak_band{i+1}.png"))
    print("band",i+1,pm.width,pm.height)
