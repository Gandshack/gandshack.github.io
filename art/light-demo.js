// Live normal-map lighting: a warm point light follows the mouse and shades each pixel from Osii's hand-painted normal maps.
(function () {
    const canvas = document.getElementById("demo-canvas");
    const tabs = document.getElementById("demo-tabs");
    const useNormals = document.getElementById("demo-normals");
    const mix = document.getElementById("demo-mix");
    const hint = document.getElementById("demo-hint");
    const views = document.querySelectorAll("#demo-view button");
    let mode = "lit"; // lit | overlay
    const HINTS = {
        lit: "Move your mouse (or finger) over the prop. Untick the box to see the same light without a normal map.",
        overlay: "The slider fades the hand-painted normal map over the lit prop. Each color is a direction the surface faces.",
    };
    if (!canvas || !window.LIGHT_PROPS) return;
    const ctx = canvas.getContext("2d");
    const WARM = [1.0, 0.77, 0.51];
    const AMBIENT = 0.1;

    const small = document.createElement("canvas"); // the prop at its real pixel size
    const sctx = small.getContext("2d");
    let prop = null; // {w, h, base: Uint8ClampedArray, normal: Uint8ClampedArray}
    let light = null; // in prop pixels
    let flicker = 1;

    function pixels(src) {
        return new Promise((resolve) => {
            const im = new Image();
            im.onload = () => {
                const c = document.createElement("canvas");
                c.width = im.width;
                c.height = im.height;
                const x = c.getContext("2d");
                x.drawImage(im, 0, 0);
                resolve({ w: im.width, h: im.height, data: x.getImageData(0, 0, im.width, im.height).data });
            };
            im.src = src;
        });
    }

    async function choose(p, btn) {
        const [b, n] = await Promise.all([pixels(p.base), pixels(p.normal)]);
        prop = { w: b.w, h: b.h, base: b.data, normal: n.data };
        small.width = b.w;
        small.height = b.h;
        light = { x: b.w * 0.2, y: b.h * 0.2 };
        tabs.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === btn));
        draw();
    }

    function layout() {
        // whole-number zoom so the pixels stay crisp
        const s = Math.max(1, Math.floor(Math.min(canvas.width / prop.w, canvas.height / prop.h)));
        return { s, ox: Math.floor((canvas.width - prop.w * s) / 2), oy: Math.floor((canvas.height - prop.h * s) / 2) };
    }

    function draw() {
        if (!prop) return;
        const { w, h, base, normal } = prop;
        const out = sctx.createImageData(w, h);
        const o = out.data;
        const size = Math.max(w, h);
        const lz = size * 0.45;
        const flat = !useNormals.checked;
        const amount = mix.value / 100;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (base[i + 3] === 0) continue;
                // normal map: red = right, green = up, blue = towards you
                let nx = 0, ny = 0, nz = 1;
                if (!flat) {
                    nx = normal[i] / 127.5 - 1;
                    ny = -(normal[i + 1] / 127.5 - 1);
                    nz = normal[i + 2] / 127.5 - 1;
                }
                const dx = light.x - x, dy = light.y - y;
                const dist = Math.hypot(dx, dy, lz);
                const d = Math.max(0, (nx * dx + ny * dy + nz * lz) / dist);
                const fall = 1 / (1 + (dist / (1.1 * size)) ** 2);
                const k = AMBIENT + 1.6 * d * fall * flicker;
                let r = base[i] * k * WARM[0], g = base[i + 1] * k * WARM[1], b = base[i + 2] * k * WARM[2];
                if (mode === "overlay") {
                    r = r * (1 - amount) + normal[i] * amount;
                    g = g * (1 - amount) + normal[i + 1] * amount;
                    b = b * (1 - amount) + normal[i + 2] * amount;
                }
                o[i] = r;
                o[i + 1] = g;
                o[i + 2] = b;
                o[i + 3] = base[i + 3];
            }
        }
        sctx.putImageData(out, 0, 0);
        const { s, ox, oy } = layout();
        ctx.fillStyle = "#07070f";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(small, ox, oy, w * s, h * s);
        // the candle flame
        const lx = ox + light.x * s, ly = oy + light.y * s;
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 26);
        g.addColorStop(0, "rgba(255,230,170,0.95)");
        g.addColorStop(0.3, "rgba(255,180,90,0.45)");
        g.addColorStop(1, "rgba(255,150,60,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(lx, ly, 26, 0, Math.PI * 2);
        ctx.fill();
    }

    function move(clientX, clientY) {
        if (!prop) return;
        const r = canvas.getBoundingClientRect();
        const cx = ((clientX - r.left) / r.width) * canvas.width;
        const cy = ((clientY - r.top) / r.height) * canvas.height;
        const { s, ox, oy } = layout();
        light = { x: (cx - ox) / s, y: (cy - oy) / s };
        draw();
    }

    canvas.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
    canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    useNormals.addEventListener("change", draw);
    mix.addEventListener("input", draw);
    views.forEach((b) =>
        b.addEventListener("click", () => {
            mode = b.dataset.mode;
            views.forEach((x) => x.classList.toggle("on", x === b));
            mix.style.visibility = mode === "lit" ? "hidden" : "visible";
            if (hint) hint.textContent = HINTS[mode];
            draw();
        })
    );
    mix.style.visibility = "hidden";

    // a gentle candle flicker
    setInterval(() => {
        flicker = 0.92 + Math.random() * 0.12;
        draw();
    }, 120);

    window.LIGHT_PROPS.forEach((p, i) => {
        const b = document.createElement("button");
        b.textContent = p.name;
        b.onclick = () => choose(p, b);
        tabs.appendChild(b);
        if (i === 0) choose(p, b);
    });
})();
