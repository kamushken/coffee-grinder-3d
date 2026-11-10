"""A/B test: does the shadow frustum size change the tray shadow? The test wraps env.update in the
page (stage 8 itself uses env.js unchanged) and forces half = 0 (env.js default, ~0.63 m), 1.0
with 0.3 m lead away from the sun, and 4.0. Mean abs pixel diff in the lower-right region."""
import io, json
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:4321/stage-8/?view=hero&ondemand=0&record=1"
BOX = (1100, 560, 1440, 800)
INJECT = """() => { const a = window.__app, env = a.env, U = a.U, orig = env.update.bind(env);
  window.__sh = { minHalf: 0, lead: 0 };
  env.update = (cam, target) => { orig(cam, target);
    const s = env.sun, sc = s.shadow.camera, half = Math.max(sc.right, __sh.minHalf);
    if (sc.right !== half) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.updateProjectionMatrix(); }
    const d = U.uSunDir.value, h = Math.hypot(d.x, d.z) || 1, tx = (2 * half) / s.shadow.mapSize.x;
    const cx = target.x - d.x / h * __sh.lead, cz = target.z - d.z / h * __sh.lead;
    s.target.position.set(Math.round(cx / tx) * tx, 0, Math.round(cz / tx) * tx);
    s.position.copy(s.target.position).addScaledVector(d, a.LIGHTING.envScale * 6); s.target.updateMatrixWorld(); }; }"""
shots = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(URL); pg.wait_for_function("window.__ready === true", timeout=60000)
    pg.evaluate(INJECT)
    for name, half, lead in (("envjs", 0, 0), ("half1-lead03", 1.0, 0.3), ("half4", 4.0, 0)):
        info = pg.evaluate(f"""async () => {{ __sh.minHalf = {half}; __sh.lead = {lead};
            await new Promise(r => setTimeout(r, 600));
            const s = window.__app.env.sun; return {{ half: +s.shadow.camera.right.toFixed(3), tgt: s.target.position.toArray().map(v => +v.toFixed(3)) }}; }}""")
        im = Image.open(io.BytesIO(pg.screenshot())).convert("RGB")
        im.crop(BOX).save(f".tmp/shadow-{name}.png"); shots[name] = im; print(name, json.dumps(info))
    b.close()
for a_, b_ in (("envjs", "half1-lead03"), ("envjs", "half4"), ("half1-lead03", "half4")):
    d = ImageChops.difference(shots[a_].crop(BOX), shots[b_].crop(BOX))
    print(f"{a_} vs {b_}: mean abs diff per channel {[round(v, 2) for v in ImageStat.Stat(d).mean]}, max {max(m for _, m in d.getextrema())}")
