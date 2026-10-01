/* Hero scene: layered mountain ridges at dusk, a low sun, drifting clouds,
   a flock of birds, stars and dust. Built from flat 2D layers at different
   depths so the camera parallax gives the "illustration with depth" look.
   Rendering pauses when the hero is off-screen or the tab is hidden. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, PlaneGeometry, ShaderMaterial, BufferGeometry,
  Float32BufferAttribute, MeshBasicMaterial, Color, Group, Points, CanvasTexture, AdditiveBlending,
  SRGBColorSpace, DoubleSide,
} from "three";

const canvas = document.getElementById("hero-canvas");
const hero = canvas && canvas.closest(".hero");
if (canvas && hero) start();

function start() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const FOV = 40;
  const CAM_Z = 10;
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 200);
  camera.position.set(0, 0, CAM_Z);

  // visible size of the view at depth z
  const viewAt = (z) => {
    const h = 2 * (CAM_Z - z) * Math.tan((FOV * Math.PI) / 360);
    return { h, w: h * camera.aspect };
  };

  // ---------- noise ----------
  const hash = (i, s) => {
    const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const vnoise = (x, s) => {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return hash(i, s) * (1 - u) + hash(i + 1, s) * u;
  };
  const ridged = (x, s, oct = 4) => {
    let a = 0.5, f = 1, sum = 0, norm = 0;
    for (let o = 0; o < oct; o++) {
      const n = 1 - Math.abs(vnoise(x * f, s + o * 17) * 2 - 1);
      sum += n * n * a;
      norm += a;
      a *= 0.5;
      f *= 2.1;
    }
    return sum / norm;
  };

  // ---------- sky ----------
  const SUN = { x: 0.68, y: 0.47 };
  const sky = new Mesh(
    new PlaneGeometry(1, 1),
    new ShaderMaterial({
      depthWrite: false,
      uniforms: {
        uTop: { value: new Color("#160f3d") },
        uHigh: { value: new Color("#3d2c84") },
        uMid: { value: new Color("#a3669e") },
        uLow: { value: new Color("#f2946a") },
        uHorizon: { value: new Color("#ffcf92") },
        uSun: { value: [SUN.x, SUN.y] },
        uAspect: { value: 1 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uTop, uHigh, uMid, uLow, uHorizon; uniform vec2 uSun; uniform float uAspect; varying vec2 vUv;
        float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){
          float y = vUv.y;
          vec3 c = mix(uHorizon, uLow, smoothstep(0.18, 0.42, y));
          c = mix(c, uMid, smoothstep(0.38, 0.6, y));
          c = mix(c, uHigh, smoothstep(0.55, 0.8, y));
          c = mix(c, uTop, smoothstep(0.78, 1.0, y));
          vec2 p = vec2((vUv.x - uSun.x) * uAspect, vUv.y - uSun.y);
          float d = length(p);
          c += vec3(1.0, 0.75, 0.45) * (exp(-d * 5.0) * 0.35 + exp(-d * 16.0) * 0.35);
          c = mix(c, vec3(1.0, 0.94, 0.8), smoothstep(0.052, 0.046, d));
          c += (rand(gl_FragCoord.xy) - 0.5) / 255.0;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    })
  );
  sky.position.z = -70;
  scene.add(sky);

  // ---------- stars ----------
  const STARS = 170;
  const starGeo = new BufferGeometry();
  const sp = new Float32Array(STARS * 3);
  const sa = new Float32Array(STARS * 2);
  for (let i = 0; i < STARS; i++) {
    sp[i * 3] = Math.random() - 0.5;
    sp[i * 3 + 1] = 0.12 + Math.pow(Math.random(), 0.7) * 0.4;
    sp[i * 3 + 2] = -66;
    sa[i * 2] = 0.6 + Math.random() * 1.6;
    sa[i * 2 + 1] = Math.random() * 6.28;
  }
  starGeo.setAttribute("position", new Float32BufferAttribute(sp, 3));
  starGeo.setAttribute("aStar", new Float32BufferAttribute(sa, 2));
  const starMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: [1, 1] }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute vec2 aStar; uniform float uTime; uniform vec2 uScale; uniform float uPx; varying float vA;
      void main(){
        vec3 p = vec3(position.x * uScale.x, position.y * uScale.y, position.z);
        vA = (0.45 + 0.55 * sin(uTime * aStar.x + aStar.y)) * smoothstep(0.1, 0.3, position.y);
        gl_PointSize = aStar.x * 1.6 * uPx;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.95, 0.9, vA * smoothstep(0.5, 0.0, d)); }`,
  });
  scene.add(new Points(starGeo, starMat));

  // ---------- clouds ----------
  function cloudTexture(seed) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 220;
    const g = c.getContext("2d");
    const puffs = 9;
    g.fillStyle = "#fff";
    for (let i = 0; i < puffs; i++) {
      const t = i / (puffs - 1);
      const r = 40 + hash(i, seed) * 45 * Math.sin(t * Math.PI + 0.2);
      g.beginPath();
      g.arc(70 + t * 372, 175 - r * 0.85 - hash(i + 9, seed) * 20, r, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.ellipse(256, 178, 196, 26, 0, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = "source-in";
    const grad = g.createLinearGradient(0, 30, 0, 200);
    grad.addColorStop(0, "#ffe9d6");
    grad.addColorStop(0.55, "#f2b9b4");
    grad.addColorStop(1, "#a986c8");
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 220);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }
  const clouds = [];
  [
    { x: 0.3, y: 0.3, z: -42, s: 0.16, v: 0.006, seed: 1 },
    { x: -0.25, y: 0.36, z: -38, s: 0.12, v: 0.009, seed: 2 },
    { x: 0.05, y: 0.22, z: -30, s: 0.1, v: 0.012, seed: 3 },
    { x: 0.42, y: 0.12, z: -26, s: 0.08, v: 0.015, seed: 4 },
  ].forEach((o) => {
    const m = new Mesh(new PlaneGeometry(1, 0.43), new MeshBasicMaterial({ map: cloudTexture(o.seed), transparent: true, opacity: 0.92, depthWrite: false }));
    m.userData = o;
    clouds.push(m);
    scene.add(m);
  });

  // ---------- mountain layers ----------
  const LAYERS = [
    { z: -50, base: 0.02, amp: 0.2, freq: 0.9, seed: 3, peak: { x: 0.18, h: 0.22, w: 0.22 }, snow: 0.16,
      col: { top: "#7a62b6", lit: "#ffd6ae", base: "#8e74c6", mist: "#e7a3a6" } },
    { z: -36, base: -0.06, amp: 0.17, freq: 1.4, seed: 11,
      col: { top: "#5e4a9c", lit: "#f7a07c", base: "#6c55ad", mist: "#c88aa8" } },
    { z: -24, base: -0.15, amp: 0.15, freq: 1.9, seed: 23,
      col: { top: "#44357f", lit: "#e4846c", base: "#4f3d92", mist: "#94689f" } },
    { z: -14, base: -0.25, amp: 0.12, freq: 2.4, seed: 41,
      col: { top: "#2f2466", lit: "#b86872", base: "#362a74", mist: "#674a8c" } },
    { z: -7, base: -0.36, amp: 0.1, freq: 3.2, seed: 59,
      col: { top: "#1e1748", lit: "#7c4a6e", base: "#231b52", mist: "#3a2b68" } },
  ];
  const tmp = { a: new Color(), b: new Color() };
  const mix = (c1, c2, t, out) => out.copy(c1).lerp(c2, Math.min(1, Math.max(0, t)));

  LAYERS.forEach((L) => {
    L.c = Object.fromEntries(Object.entries(L.col).map(([k, v]) => [k, new Color(v)]));
    L.mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }));
    L.mesh.position.z = L.z;
    scene.add(L.mesh);
  });

  function buildLayer(L) {
    const { w, h } = viewAt(L.z);
    const W = w * 1.35; // overscan for parallax
    const N = Math.max(80, Math.round(W / h * 90));
    const rows = 4;
    const pos = new Float32Array((N + 1) * rows * 3);
    const col = new Float32Array((N + 1) * rows * 3);
    const sunX = (SUN.x - 0.5) * w;
    const ridgeY = (x) => {
      const u = x / h;
      let y = L.base + L.amp * ridged(u * L.freq + L.seed, L.seed);
      if (L.peak) y += peakAt(u);
      return y * h;
    };
    const peakAt = (u) => {
      const d = Math.abs(u - L.peak.x * camera.aspect) / L.peak.w;
      return L.peak.h * Math.pow(Math.max(0, 1 - d), 1.6);
    };
    const bottom = -h * 0.62;
    const ys = [];
    for (let i = 0; i <= N; i++) ys.push(ridgeY(-W / 2 + (W * i) / N));
    // light from the sun on slopes that face it, smoothed so it reads as a soft rim
    const raw = ys.map((y, i) => {
      const x = -W / 2 + (W * i) / N;
      const slope = (ys[Math.min(N, i + 1)] - ys[Math.max(0, i - 1)]) / ((2 * W) / N);
      const dir = Math.sign(sunX - x) || 1;
      const near = Math.exp(-Math.abs(sunX - x) / (h * 0.9));
      return Math.min(1, Math.max(0, -slope * dir * 1.4)) * (0.3 + 0.7 * near);
    });
    const R = 3;
    const lits = raw.map((_, i) => {
      let sum = 0, n = 0;
      for (let k = -R; k <= R; k++) { const j = i + k; if (j >= 0 && j <= N) { sum += raw[j]; n++; } }
      return sum / n;
    });
    for (let i = 0; i <= N; i++) {
      const x = -W / 2 + (W * i) / N;
      const y = ys[i];
      const lit = lits[i];
      const rowY = [y, y - h * 0.012, y - h * 0.16, bottom];
      for (let r = 0; r < rows; r++) {
        const k = (i * rows + r) * 3;
        pos[k] = x; pos[k + 1] = rowY[r]; pos[k + 2] = 0;
        let c;
        if (r === 0 || r === 1) {
          c = mix(L.c.top, L.c.lit, lit * (r === 0 ? 1 : 0.55), tmp.a);
          const pk = L.peak ? peakAt(x / h) / L.peak.h : 0;
          if (L.snow && pk > 0.45) {
            const s = Math.min(1, (pk - 0.45) / 0.2);
            mix(c, tmp.b.set(lit > 0.25 ? "#ffe7d0" : "#cdbdf0"), s * (r === 0 ? 0.95 : 0.8), c);
          }
        } else if (r === 2) {
          c = tmp.a.copy(L.c.base);
          const pk = L.peak ? peakAt(x / h) / L.peak.h : 0;
          if (L.snow && pk > 0.6) mix(c, tmp.b.set("#b9a5e6"), (pk - 0.6) * 1.2, c);
        } else {
          c = tmp.a.copy(L.c.mist);
        }
        col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
      }
    }
    const idx = [];
    for (let i = 0; i < N; i++) {
      for (let r = 0; r < rows - 1; r++) {
        const a = i * rows + r, b = (i + 1) * rows + r;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const g = L.mesh.geometry;
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
  }

  // ---------- foreground grass ----------
  const grass = { z: -2.6, mesh: new Mesh(new BufferGeometry(), new MeshBasicMaterial({ vertexColors: true, side: DoubleSide })) };
  grass.mesh.position.z = grass.z;
  scene.add(grass.mesh);
  function buildGrass() {
    const { w, h } = viewAt(grass.z);
    const W = w * 1.3;
    const N = Math.round(W / (h * 0.006));
    const pos = new Float32Array((N + 1) * 2 * 3);
    const col = new Float32Array((N + 1) * 2 * 3);
    const tip = new Color("#2c2158"), root = new Color("#120d29"), warm = new Color("#6a3e64");
    const base = -h * 0.5;
    grass.tips = [];
    for (let i = 0; i <= N; i++) {
      const x = -W / 2 + (W * i) / N;
      const u = x / h;
      // taller tufts towards the edges so the centre stays clear
      const edge = Math.min(1, Math.abs(u / (w / h) * 2) * 1.1);
      const swell = 0.03 + 0.09 * Math.pow(edge, 2) + 0.03 * vnoise(u * 3, 7);
      const ty = i % 2 ? base + h * 0.02 : base + h * (0.02 + swell * (0.55 + 0.45 * hash(i, 5)));
      const k = i * 6;
      pos[k] = x; pos[k + 1] = ty; pos[k + 2] = 0;
      pos[k + 3] = x; pos[k + 4] = base - h * 0.1; pos[k + 5] = 0;
      const c = tmp.a.copy(tip).lerp(warm, i % 2 ? 0 : 0.35 * edge);
      col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
      col[k + 3] = root.r; col[k + 4] = root.g; col[k + 5] = root.b;
      if (!(i % 2)) grass.tips.push({ k, x, amp: (ty - base) / h });
    }
    const idx = [];
    for (let i = 0; i < N; i++) {
      const a = i * 2, b = (i + 1) * 2;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = grass.mesh.geometry;
    grass.pos = new Float32BufferAttribute(pos, 3);
    g.setAttribute("position", grass.pos);
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    grass.h = h;
  }

  // ---------- birds ----------
  const birdGeo = new BufferGeometry();
  birdGeo.setAttribute("position", new Float32BufferAttribute([
    0, 0, 0, -1, 0.42, 0, -0.32, -0.04, 0,
    0, 0, 0, 0.32, -0.04, 0, 1, 0.42, 0,
    -0.12, 0.02, 0, 0.12, 0.02, 0, 0, -0.14, 0,
  ], 3));
  const birdMat = new MeshBasicMaterial({ color: new Color("#2b1f55"), side: DoubleSide });
  const flock = new Group();
  flock.position.z = -20;
  scene.add(flock);
  const birds = [];
  for (let i = 0; i < 11; i++) {
    const b = new Mesh(birdGeo, birdMat);
    const s = 0.14 + Math.random() * 0.08;
    b.scale.set(s, s, s);
    b.userData = { ox: (i % 4) * 0.9 + Math.random() * 0.6 + Math.floor(i / 4) * 0.5, oy: (Math.random() - 0.5) * 1.4 + (i % 3) * 0.25, f: 6 + Math.random() * 3, p: Math.random() * 6.28, s };
    birds.push(b);
    flock.add(b);
  }

  // ---------- dust ----------
  const DUST = 70;
  const dustGeo = new BufferGeometry();
  const dp = new Float32Array(DUST * 3);
  const dv = [];
  for (let i = 0; i < DUST; i++) {
    dp[i * 3] = (Math.random() - 0.5) * 10;
    dp[i * 3 + 1] = (Math.random() - 0.5) * 5;
    dp[i * 3 + 2] = -1 - Math.random() * 6;
    dv.push(0.05 + Math.random() * 0.12);
  }
  dustGeo.setAttribute("position", new Float32BufferAttribute(dp, 3));
  const dustMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `uniform float uPx; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = 22.0 * uPx / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.82, 0.6, 0.55 * smoothstep(0.5, 0.0, d)); }`,
  });
  const dust = new Points(dustGeo, dustMat);
  scene.add(dust);

  // ---------- layout ----------
  let W = 0, H = 0, flockSpan = 10;
  function resize() {
    const r = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const v = viewAt(sky.position.z);
    sky.scale.set(v.w * 1.4, v.h * 1.3, 1);
    sky.material.uniforms.uAspect.value = (v.w * 1.4) / (v.h * 1.3);
    starMat.uniforms.uScale.value = [v.w * 1.3, v.h];
    clouds.forEach((m) => {
      const cv = viewAt(m.userData.z);
      const s = cv.h * m.userData.s * 2.6 * Math.min(1, 0.25 + camera.aspect * 0.6);
      m.scale.set(s, s, 1);
      m.userData.w = cv.w;
      m.position.set(m.userData.x * cv.w, (m.userData.y + (camera.aspect < 1 ? 0.1 : 0)) * cv.h, m.userData.z);
    });
    flockSpan = viewAt(flock.position.z).w * 1.3;
    LAYERS.forEach(buildLayer);
    buildGrass();
    render(lastT);
  }

  // ---------- interaction ----------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduce) {
    hero.addEventListener("pointermove", (e) => {
      pointer.tx = (e.clientX / W - 0.5) * 2;
      pointer.ty = (e.clientY / H - 0.5) * 2;
    }, { passive: true });
  }

  // ---------- loop ----------
  let lastT = 0;
  let running = false;
  let visible = true;
  let raf = 0;
  let prev = performance.now();

  function render(t) {
    const s = t / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    const scrollLift = Math.min(1, window.scrollY / Math.max(1, H));
    camera.position.x = pointer.x * 0.55 + Math.sin(s * 0.05) * 0.25;
    camera.position.y = -pointer.y * 0.25 + scrollLift * 1.2;
    camera.lookAt(camera.position.x * 0.4, camera.position.y * 0.5, -30);
    starMat.uniforms.uTime.value = s;

    clouds.forEach((m) => {
      const d = m.userData;
      const span = d.w * 1.6;
      let x = d.x * d.w + s * d.v * d.w;
      x = ((x + span / 2) % span + span) % span - span / 2;
      m.position.x = x;
    });

    birds.forEach((b) => {
      const d = b.userData;
      let x = flockSpan / 2 - ((s * 0.55 + d.ox) % flockSpan);
      b.position.set(x + d.ox * 0.3, 1.1 + d.oy + Math.sin(s * 0.8 + d.p) * 0.12, 0);
      b.scale.y = d.s * Math.sin(s * d.f + d.p);
    });

    if (grass.tips) {
      const a = grass.pos.array;
      grass.tips.forEach((tp) => {
        a[tp.k] = tp.x + Math.sin(s * 1.4 + tp.x * 0.7) * grass.h * 0.012 * tp.amp * 8;
      });
      grass.pos.needsUpdate = true;
    }

    const p = dust.geometry.attributes.position;
    for (let i = 0; i < DUST; i++) {
      let y = dp[i * 3 + 1] + dv[i] * 0.016;
      if (y > 2.6) y = -2.6;
      dp[i * 3 + 1] = y;
      dp[i * 3] += Math.sin(s + i) * 0.0015;
    }
    p.needsUpdate = true;

    renderer.render(scene, camera);
  }

  function frame(t) {
    raf = 0;
    if (!running) return;
    const dt = t - prev;
    prev = t;
    if (dt < 200) lastT += dt;
    render(lastT);
    raf = requestAnimationFrame(frame);
  }
  function play() {
    if (reduce || running || !visible || document.hidden) return;
    running = true;
    prev = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible ? play() : pause();
  }).observe(hero);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  let rt;
  new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(resize, 80);
  }).observe(hero);

  lastT = 8000; // start mid-flight so birds are already on screen
  resize();
  canvas.classList.add("is-ready");
  play();
}
