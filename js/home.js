/* Home page */
(function () {
  const { $, $$, esc, rich, icon, photo, modal, packageCard, reveal, hydrate } = window.UI;
  const { img, MONTHS, TYPES, DESTINATIONS, CATEGORIES, PACKAGES, TESTIMONIALS, ARTICLES } = window.PATHIK_DATA;

  // ---- categories ----
  const tilts = [-4, 3, -2, 4, -3, 2];
  $("#cats").innerHTML = CATEGORIES.map((c, i) => {
    const n = DESTINATIONS.filter((d) => d.types.includes(c.type)).length;
    return `<a class="cat reveal" href="explore.html?type=${c.type}" style="--tilt:${tilts[i]}deg;transition-delay:${i * 60}ms">
      <span class="cat__img frame">${photo(c.photo, 360, 450, c.label)}</span>
      <span><strong>${esc(c.label)}</strong><small>${n} place${n > 1 ? "s" : ""}</small></span>
    </a>`;
  }).join("");

  // ---- finder ----
  const month = $("#f-month");
  month.insertAdjacentHTML("beforeend", MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join(""));
  const q = $("#f-q");
  const box = $("#f-suggest");
  let active = -1;
  let hits = [];

  function suggestions(text) {
    const t = text.trim().toLowerCase();
    if (!t) return [];
    const typeHits = Object.entries(TYPES).filter(([k, v]) => v.toLowerCase().includes(t) || k.includes(t)).map(([k, v]) => ({ kind: "type", value: k, label: v, sub: "Trip type" }));
    const destHits = DESTINATIONS.filter((d) => (d.name + " " + d.state).toLowerCase().includes(t)).map((d) => ({ kind: "dest", value: d.id, label: d.name, sub: d.state }));
    return [...destHits, ...typeHits].slice(0, 6);
  }
  function paintSuggest() {
    hits = suggestions(q.value);
    active = -1;
    box.hidden = !hits.length;
    q.setAttribute("aria-expanded", String(!!hits.length));
    box.innerHTML = hits.map((h, i) => `<li role="option" id="sg-${i}" data-i="${i}" aria-selected="false">${esc(h.label)}<span>${esc(h.sub)}</span></li>`).join("");
  }
  function pick(h) {
    if (h.kind === "dest") return window.UI.openDestination(h.value);
    location.href = `explore.html?type=${h.value}`;
  }
  q.addEventListener("input", paintSuggest);
  q.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length;
      $$("li", box).forEach((li, i) => li.setAttribute("aria-selected", i === active));
      q.setAttribute("aria-activedescendant", `sg-${active}`);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      box.hidden = true;
      pick(hits[active]);
    } else if (e.key === "Escape") {
      box.hidden = true;
    }
  });
  box.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    e.preventDefault();
    box.hidden = true;
    pick(hits[+li.dataset.i]);
  });
  q.addEventListener("blur", () => setTimeout(() => (box.hidden = true), 100));
  $("#finder").addEventListener("submit", (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.value.trim()) p.set("q", q.value.trim());
    if (month.value) p.set("month", month.value);
    if ($("#f-level").value) p.set("level", $("#f-level").value);
    location.href = "explore.html" + (p.toString() ? "?" + p : "");
  });

  // ---- offers ----
  $("#offers").innerHTML = PACKAGES.filter((p) => p.was).slice(0, 3).map(packageCard).join("");

  // ---- testimonials carousel ----
  const track = $("#track");
  const colors = ["#6a57b8", "#ef7d42", "#2f8a63", "#b5541c", "#4a3a8f"];
  track.innerHTML = TESTIMONIALS.map((t, i) => `<figure class="quote" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${TESTIMONIALS.length}">
      <span class="stars" aria-label="${t.rating} out of 5">${icon("star").repeat(t.rating)}</span>
      <blockquote>${esc(t.text)}</blockquote>
      <figcaption><span class="avatar" style="background:${colors[i % colors.length]}">${esc(t.name.split(" ").map((w) => w[0]).join("").slice(0, 2))}</span><span><strong>${esc(t.name)}</strong><span>${esc(t.trip)} · ${esc(t.from)}</span></span></figcaption>
    </figure>`).join("");
  const slides = $$(".quote", track);
  const dots = $("#dots");
  dots.innerHTML = slides.map((_, i) => `<button type="button" role="tab" aria-label="Review ${i + 1}"></button>`).join("");
  let current = 0;
  const go = (i) => {
    current = (i + slides.length) % slides.length;
    track.scrollTo({ left: slides[current].offsetLeft - track.offsetLeft - 4 });
  };
  const sync = () => {
    const x = track.scrollLeft;
    let best = 0;
    slides.forEach((s, i) => {
      if (Math.abs(s.offsetLeft - track.offsetLeft - x) < Math.abs(slides[best].offsetLeft - track.offsetLeft - x)) best = i;
    });
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) best = Math.max(best, slides.length - 1 - Math.floor(track.clientWidth / slides[0].offsetWidth) + 1);
    current = best;
    slides.forEach((s, i) => s.classList.toggle("is-active", i === best));
    $$("button", dots).forEach((d, i) => d.setAttribute("aria-current", i === best));
  };
  let raf;
  track.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
  $("#prev").addEventListener("click", () => go(current - 1));
  $("#next").addEventListener("click", () => go(current + 1));
  dots.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) go([...dots.children].indexOf(b));
  });
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
  });
  // gentle autoplay, stops for good once the visitor touches the carousel
  let auto = !matchMedia("(prefers-reduced-motion: reduce)").matches && setInterval(() => {
    const r = track.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0 && !document.hidden) go(current + 1);
  }, 6000);
  ["pointerdown", "focusin", "wheel"].forEach((ev) => $("#carousel").addEventListener(ev, () => { clearInterval(auto); auto = 0; }, { passive: true }));
  sync();

  // ---- articles ----
  const fmt = (s) => new Date(s + "T00:00:00");
  $("#posts").innerHTML = ARTICLES.map((a) => {
    const d = fmt(a.date);
    return `<button class="post reveal" type="button" data-post="${a.id}">
      <span class="post__media frame">${photo(a.photo, 640, 440, "")}<span class="post__date"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()]}</small></span></span>
      <span class="post__body">
        <span class="post__meta"><span>${icon("tag")}${esc(a.tag)}</span><span>${icon("clock")}${a.read} min read</span></span>
        <h3>${esc(a.title)}</h3>
        <span class="link-btn">Read ${icon("arrow-right")}</span>
      </span>
    </button>`;
  }).join("");
  $("#posts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-post]");
    if (!b) return;
    const a = ARTICLES.find((x) => x.id === b.dataset.post);
    modal(`<article class="article">
      <img class="article__img" src="${img(a.photo, 1200, 600)}" alt="" width="1200" height="600">
      <span class="kicker">${esc(a.tag)} · ${a.read} min</span>
      <h2>${esc(a.title)}</h2>
      ${a.body.map((p) => `<p>${rich(p)}</p>`).join("")}
      <a class="btn btn--ember" href="explore.html">Explore destinations ${icon("arrow-right")}</a>
    </article>`, { label: a.title });
  });

  hydrate();
  reveal();

  // ---- 3D hero: load after the page is usable ----
  const canvas = $("#hero-canvas");
  const conn = navigator.connection;
  const skip = (conn && (conn.saveData || /2g/.test(conn.effectiveType))) || !canvas;
  function webgl() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }
  function loadScene() {
    if (skip || !webgl()) return;
    const s = document.createElement("script");
    s.src = "js/hero-scene.js";
    s.async = true;
    document.body.appendChild(s);
  }
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
  if (document.readyState === "complete") idle(loadScene);
  else addEventListener("load", () => idle(loadScene, { timeout: 2000 }));
})();
