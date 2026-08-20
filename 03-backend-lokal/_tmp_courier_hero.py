from collections import deque
from pathlib import Path

from PIL import Image

src = Path(
    r"C:\Users\USER\.cursor\projects\c-Users-USER-Desktop-Food-Delivery-Marketplace\assets\c__Users_USER_AppData_Roaming_Cursor_User_workspaceStorage_e8f4a667063ee0fa30897715a72954ef_images_image-7e0892d8-b9ef-400c-a8cb-49ed5a5ab468.png"
)
im = Image.open(src).convert("RGBA")
w, h = im.size
px = im.load()


def is_bg(c):
    r, g, b, a = c
    if a == 0:
        return True
    return r >= 248 and g >= 248 and b >= 248


seen = [[False] * h for _ in range(w)]
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if is_bg(px[x, y]):
            q.append((x, y))
            seen[x][y] = True
for y in range(h):
    for x in (0, w - 1):
        if is_bg(px[x, y]) and not seen[x][y]:
            q.append((x, y))
            seen[x][y] = True

cleared = 0
while q:
    x, y = q.popleft()
    px[x, y] = (255, 255, 255, 0)
    cleared += 1
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny] and is_bg(px[nx, ny]):
            seen[nx][ny] = True
            q.append((nx, ny))

bbox = im.getbbox()
if bbox:
    pad = 8
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(w, r + pad)
    b = min(h, b + pad)
    im = im.crop((l, t, r, b))

outs = [
    Path(r"c:\Users\USER\Desktop\Food-Delivery-Marketplace\03-backend-lokal\public\login-hero-courier.png"),
    Path(r"c:\Users\USER\Desktop\Food-Delivery-Marketplace\05-aplikasi\kurir-android\assets\login-hero-courier.png"),
]
for p in outs:
    im.save(p, "PNG", optimize=True)
    print(p, im.size, p.stat().st_size, "cleared", cleared)
