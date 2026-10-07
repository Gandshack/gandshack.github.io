// Click a piece to see it big: crisp whole-number zoom, title + info, ← → to browse, Esc or click outside to close.
(function () {
    const pieces = Array.from(document.querySelectorAll("a.piece"));
    if (!pieces.length) return;

    const box = document.createElement("div");
    box.id = "viewer";
    box.innerHTML = `
        <button class="v-close" aria-label="Close">✕</button>
        <button class="v-prev" aria-label="Previous">‹</button>
        <figure><img alt="" /><figcaption><b></b><span></span><small></small></figcaption></figure>
        <button class="v-next" aria-label="Next">›</button>`;
    document.body.appendChild(box);
    const img = box.querySelector("img");
    const title = box.querySelector("figcaption b");
    const meta = box.querySelector("figcaption span");
    const count = box.querySelector("figcaption small");
    let at = 0;

    function fit() {
        // biggest whole-number zoom that fits the screen, so pixels stay square and sharp
        const w = img.naturalWidth, h = img.naturalHeight;
        if (!w) return;
        const maxW = window.innerWidth * 0.86, maxH = window.innerHeight * 0.72;
        let s = Math.min(maxW / w, maxH / h);
        s = s >= 1 ? Math.floor(s) : s;
        img.style.width = w * s + "px";
        img.style.height = h * s + "px";
    }

    function show(i) {
        at = (i + pieces.length) % pieces.length;
        const p = pieces[at];
        img.style.width = img.style.height = "";
        img.src = p.getAttribute("href");
        img.classList.toggle("lift", p.classList.contains("lift"));
        img.alt = p.dataset.title || "";
        title.textContent = p.dataset.title || "";
        meta.textContent = p.dataset.info || "";
        count.textContent = `${at + 1} / ${pieces.length}`;
        box.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function close() {
        box.classList.remove("open");
        document.body.style.overflow = "";
        img.removeAttribute("src");
    }

    img.addEventListener("load", fit);
    window.addEventListener("resize", fit);
    pieces.forEach((p, i) =>
        p.addEventListener("click", (e) => {
            e.preventDefault();
            show(i);
        })
    );
    box.querySelector(".v-close").onclick = close;
    box.querySelector(".v-prev").onclick = () => show(at - 1);
    box.querySelector(".v-next").onclick = () => show(at + 1);
    box.addEventListener("click", (e) => {
        if (e.target === box || e.target.tagName === "FIGURE") close();
    });
    document.addEventListener("keydown", (e) => {
        if (!box.classList.contains("open")) return;
        if (e.key === "Escape") close();
        if (e.key === "ArrowLeft") show(at - 1);
        if (e.key === "ArrowRight") show(at + 1);
    });
    // swipe on phones
    let sx = null;
    box.addEventListener("touchstart", (e) => (sx = e.touches[0].clientX), { passive: true });
    box.addEventListener("touchend", (e) => {
        if (sx === null) return;
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
        sx = null;
    });
})();
