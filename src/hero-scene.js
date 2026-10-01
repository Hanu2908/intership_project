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
  const SUN = { x: 0.8, y: 0.585 };
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
          c += vec3(1.0, 0.72, 0.42) * (exp(-d * 3.2) * 0.28 + exp(-d * 9.0) * 0.3 + exp(-d * 28.0) * 0.35);
          c = mix(c, vec3(1.0, 0.9, 0.72), smoothstep(0.043, 0.032, d));
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
  // Soft clouds: many blurred puffs, lit from the sun side, cooler underneath.
  function cloudTexture(seed, kind) {
    const W = 512, H = kind === "stratus" ? 128 : 256;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const puffs = kind === "stratus" ? 46 : 70;
    for (let i = 0; i < puffs; i++) {
      const t = hash(i, seed);
      const along = kind === "stratus" ? 0.08 + t * 0.84 : 0.15 + Math.pow(hash(i + 3, seed), 0.9) * 0.7;
      const hump = Math.sin(along * Math.PI);
      const r = kind === "stratus" ? 10 + hash(i + 7, seed) * 18 : (18 + hash(i + 7, seed) * 46) * (0.45 + 0.55 * hump);
      const x = along * W;
      const y = kind === "stratus" ? H * 0.5 + (hash(i + 11, seed) - 0.5) * 18 : H * 0.78 - hump * H * 0.42 * hash(i + 13, seed) - r * 0.3;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, "rgba(255,255,255,0.9)");
      rg.addColorStop(0.55, "rgba(255,255,255,0.55)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = rg;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // colour: warm where the sun hits the top, violet in the shade below
    g.globalCompositeOperation = "source-in";
    const grad = g.createLinearGradient(0, 0, 0, H);
    if (kind === "stratus") {
      grad.addColorStop(0, "#ffe0c2");
      grad.addColorStop(1, "#f0a59a");
    } else {
      grad.addColorStop(0, "#fff1e2");
      grad.addColorStop(0.42, "#f8c7b4");
      grad.addColorStop(0.75, "#c99ac2");
      grad.addColorStop(1, "#8f74bd");
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "source-atop";
    const rim = g.createRadialGradient(W * 0.82, H * 0.2, 0, W * 0.82, H * 0.2, W * 0.55);
    rim.addColorStop(0, "rgba(255,226,170,0.55)");
    rim.addColorStop(1, "rgba(255,226,170,0)");
    g.fillStyle = rim;
    g.fillRect(0, 0, W, H);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }
  const clouds = [];
  [
    { x: -0.3, y: 0.34, z: -44, s: 0.15, v: 0.004, seed: 1 },
    { x: 0.42, y: 0.3, z: -40, s: 0.13, v: 0.006, seed: 2 },
    { x: 0.08, y: 0.24, z: -32, s: 0.09, v: 0.009, seed: 3 },
    { x: 0.3, y: 0.06, z: -56, s: 0.2, v: 0.003, seed: 5, kind: "stratus" },
    { x: -0.15, y: 0.03, z: -58, s: 0.24, v: 0.002, seed: 6, kind: "stratus" },
  ].forEach((o) => {
    const tex = cloudTexture(o.seed, o.kind);
    const m = new Mesh(new PlaneGeometry(1, o.kind === "stratus" ? 0.25 : 0.5), new MeshBasicMaterial({ map: tex, transparent: true, opacity: o.kind === "stratus" ? 0.7 : 0.88, depthWrite: false }));
    m.userData = o;
    clouds.push(m);
    scene.add(m);
  });

  // ---------- mountain layers ----------
  // Each layer is a strip from the ridge line down. Colour is computed per pixel from
  // the depth below the ridge, how much the slope faces the sun, and distance to the sun.
  const LAYERS = [
    { z: -50, base: 0.02, amp: 0.17, freq: 0.9, seed: 3, peak: { x: 0.12, h: 0.24, w: 0.24 }, snow: 1, haze: 0.55,
      col: { top: "#7d66b8", lit: "#ffd2a6", base: "#8b72c4", mist: "#e8a3a4" } },
    { z: -36, base: -0.06, amp: 0.15, freq: 1.4, seed: 11, haze: 0.4,
      col: { top: "#5f4b9d", lit: "#f6a27f", base: "#6a54ab", mist: "#c48aa9" } },
    { z: -24, base: -0.15, amp: 0.13, freq: 1.9, seed: 23, haze: 0.28,
      col: { top: "#45367f", lit: "#e0866f", base: "#4e3d90", mist: "#8f669e" } },
    { z: -14, base: -0.25, amp: 0.11, freq: 2.4, seed: 41, haze: 0.16,
      col: { top: "#2f2466", lit: "#b06a74", base: "#362a72", mist: "#62488a" } },
    { z: -7, base: -0.36, amp: 0.09, freq: 3.2, seed: 59, haze: 0.08,
      col: { top: "#1f1849", lit: "#76496e", base: "#231b50", mist: "#372963" } },
  ];
  const tmp = { a: new Color() };

  const layerVert = `
    attribute float aLit; attribute float aDepth; attribute float aPeak; attribute float aU;
    varying float vLit; varying float vDepth; varying float vPeak; varying float vU;
    void main(){
      vLit = aLit; vDepth = aDepth; vPeak = aPeak; vU = aU;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const layerFrag = `
    uniform vec3 uTop, uLit, uBase, uMist, uHaze;
    uniform float uSunU, uHazeAmt, uSnow;
    varying float vLit; varying float vDepth; varying float vPeak; varying float vU;
    float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(h1(i), h1(i+vec2(1,0)), f.x), mix(h1(i+vec2(0,1)), h1(i+vec2(1,1)), f.x), f.y); }
    void main(){
      float d = max(vDepth, 0.0);
      vec3 c = mix(uTop, uBase, smoothstep(0.0, 0.18, d));
      // soft rim of sunlight along sun-facing ridges, plus a broad warm wash
      c = mix(c, uLit, vLit * (0.85 * exp(-d / 0.028) + 0.22 * exp(-d / 0.16)));
      // glow from the low sun, strongest near its x position and the ridge tops
      float sd = abs(vU - uSunU);
      c = mix(c, uHaze, uHazeAmt * exp(-sd * 2.2) * exp(-d / 0.22));
      // snow: follows the peak shape, with streaky gullies, warm on the lit side
      if (uSnow > 0.5) {
        // irregular lower edge: fingers of snow running down the gullies
        float g = vn(vec2(vU * 20.0, 0.5)) * 0.55 + vn(vec2(vU * 52.0, 7.0)) * 0.3 + vn(vec2(vU * 130.0, 3.0)) * 0.15;
        float line = vPeak * 0.17 - 0.045 + (g - 0.5) * 0.08;
        float m = smoothstep(line + 0.005, line - 0.005, d) * smoothstep(0.38, 0.5, vPeak);
        vec3 snowShade = vec3(0.72, 0.68, 0.93);
        vec3 snowLit = vec3(1.0, 0.87, 0.76);
        vec3 snow = mix(snowShade, snowLit, smoothstep(0.05, 0.45, vLit));
        // faint rock lines and a cooler tone lower down
        float rock = smoothstep(0.62, 0.8, vn(vec2(vU * 34.0, d * 2.0)));
        snow = mix(snow, snowShade * 0.82, rock * 0.35 + smoothstep(0.0, 0.08, d) * 0.15);
        c = mix(c, snow, m);
      }
      c = mix(c, uMist, smoothstep(0.08, 0.46, d));
      c += (h1(gl_FragCoord.xy) - 0.5) / 255.0;
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`;

  LAYERS.forEach((L) => {
    const u = {};
    Object.entries(L.col).forEach(([k, v]) => (u["u" + k[0].toUpperCase() + k.slice(1)] = { value: new Color(v) }));
    u.uHaze = { value: new Color("#ffc58c") };
    u.uHazeAmt = { value: L.haze };
    u.uSunU = { value: 0 };
    u.uSnow = { value: L.snow ? 1 : 0 };
    L.mesh = new Mesh(new BufferGeometry(), new ShaderMaterial({ uniforms: u, vertexShader: layerVert, fragmentShader: layerFrag, side: DoubleSide }));
    L.mesh.position.z = L.z;
    scene.add(L.mesh);
  });

  function smooth(arr, R, passes) {
    let a = arr;
    for (let p = 0; p < passes; p++) {
      a = a.map((_, i) => {
        let sum = 0, n = 0;
        for (let k = -R; k <= R; k++) { const j = i + k; if (j >= 0 && j < a.length) { sum += a[j]; n++; } }
        return sum / n;
      });
    }
    return a;
  }

  function buildLayer(L) {
    const { w, h } = viewAt(L.z);
    const W = w * 1.35; // overscan for parallax
    const N = Math.max(120, Math.round((W / h) * 140));
    const sunX = (SUN.x - 0.5) * w;
    const peakAt = (u) => {
      if (!L.peak) return 0;
      const d = Math.abs(u - L.peak.x * camera.aspect) / L.peak.w;
      return L.peak.h * Math.pow(Math.max(0, 1 - d), 1.5);
    };
    const ridgeY = (x) => {
      const u = x / h;
      return (L.base + L.amp * ridged(u * L.freq + L.seed, L.seed) + peakAt(u)) * h;
    };
    const bottom = -h * 0.62;
    const xs = [], ys = [];
    for (let i = 0; i <= N; i++) { xs.push(-W / 2 + (W * i) / N); ys.push(ridgeY(xs[i])); }
    // sun-facing slopes catch light; smoothed twice so it reads as soft light, not stripes
    const raw = ys.map((y, i) => {
      const slope = (ys[Math.min(N, i + 1)] - ys[Math.max(0, i - 1)]) / ((2 * W) / N);
      const dir = Math.sign(sunX - xs[i]) || 1;
      const near = Math.exp(-Math.abs(sunX - xs[i]) / (h * 1.1));
      return Math.min(1, Math.max(0, -slope * dir * 1.3)) * (0.35 + 0.65 * near);
    });
    const lits = smooth(raw, Math.max(2, Math.round(N / 160)), 2);

    const pos = new Float32Array((N + 1) * 2 * 3);
    const aLit = new Float32Array((N + 1) * 2);
    const aDepth = new Float32Array((N + 1) * 2);
    const aPeak = new Float32Array((N + 1) * 2);
    const aU = new Float32Array((N + 1) * 2);
    for (let i = 0; i <= N; i++) {
      const pk = L.peak ? peakAt(xs[i] / h) / L.peak.h : 0;
      for (let r = 0; r < 2; r++) {
        const v = i * 2 + r;
        const y = r === 0 ? ys[i] : bottom;
        pos[v * 3] = xs[i]; pos[v * 3 + 1] = y; pos[v * 3 + 2] = 0;
        aLit[v] = lits[i];
        aDepth[v] = (ys[i] - y) / h;
        aPeak[v] = pk;
        aU[v] = xs[i] / h;
      }
    }
    const idx = [];
    for (let i = 0; i < N; i++) {
      const a = i * 2, b = (i + 1) * 2;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = L.mesh.geometry;
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("aLit", new Float32BufferAttribute(aLit, 1));
    g.setAttribute("aDepth", new Float32BufferAttribute(aDepth, 1));
    g.setAttribute("aPeak", new Float32BufferAttribute(aPeak, 1));
    g.setAttribute("aU", new Float32BufferAttribute(aU, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    L.mesh.material.uniforms.uSunU.value = sunX / h;
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
