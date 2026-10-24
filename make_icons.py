from PIL import Image, ImageDraw

for size in (180, 512):
    img = Image.new("RGB", (size, size), "#0f172a")
    d = ImageDraw.Draw(img)
    m = size // 5
    d.rounded_rectangle([m, m, size - m, size - m],
                        radius=size // 8, outline="#38bdf8",
                        width=max(4, size // 30))
    c, r = size // 2, size // 10
    d.ellipse([c - r, c - r, c + r, c + r], fill="#38bdf8")
    img.save(f"icon-{size}.png")
