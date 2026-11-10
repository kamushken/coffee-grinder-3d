"""Is the straight shadow edge right of the tray the tray's own cast shadow? Render the same frame
with tray castShadow on and off, crop the lower-right region and diff."""
import io
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:4321/stage-8/?view=hero&ondemand=0&record=1"
BOX = (1100, 560, 1440, 800)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(URL); pg.wait_for_function("window.__ready === true", timeout=60000)
    out = {}
    for name, on in (("tray-casts", "true"), ("tray-nocast", "false")):
        pg.evaluate(f"""async () => {{ window.__app.content.tray.traverse(o => {{ if (o.isMesh) o.castShadow = {on}; }});
            await new Promise(r => setTimeout(r, 500)); }}""")
        im = Image.open(io.BytesIO(pg.screenshot())).convert("RGB").crop(BOX)
        im.save(f".tmp/{name}.png"); out[name] = im
    b.close()
d = ImageChops.difference(out["tray-casts"], out["tray-nocast"])
print("tray casts vs not: mean", [round(v, 2) for v in ImageStat.Stat(d).mean], "max", max(m for _, m in d.getextrema()))
