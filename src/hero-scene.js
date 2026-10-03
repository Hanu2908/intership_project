/* Hero scene: layered mountain ridges at dusk, a low sun, drifting clouds,
   a flock of birds, stars and dust. Built from flat 2D layers at different
   depths so the camera parallax gives the "illustration with depth" look.
   Rendering pauses when the hero is off-screen or the tab is hidden. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, PlaneGeometry, ShaderMaterial, BufferGeometry,
  Float32BufferAttribute, Color, Points, AdditiveBlending,
  SRGBColorSpace, DoubleSide, WebGLRenderTarget, OrthographicCamera, Vector3,
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
  const SUN_VIEW = { x: 0.42, y: 0.11 }; // sun as a fraction of the view, set in resize()
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
  // Big cumulus banks behind the snow peak and thin streaks high up. Each one is
  // painted once on the GPU into a texture (billowy noise + light marched toward
  // the sun), so the per-frame cost is a single textured quad.
  const bakeCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bakeScene = new Scene();
  const bakeMat = new ShaderMaterial({
    uniforms: {
      uKind: { value: 0 }, uSeed: { value: 0 }, uAspect: { value: 2 }, uSun: { value: [3, 0.3] },
      uTowers: { value: [] }, uBase: { value: 0.16 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform float uKind, uSeed, uAspect, uBase; uniform vec2 uSun; uniform vec3 uTowers[6]; varying vec2 vUv;
      vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))) + uSeed; return fract(sin(p) * 43758.5453); }
      float h1(vec2 p){ return fract(sin(dot(p + uSeed, vec2(12.9898, 78.233))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
      // union of discs of random size: the cauliflower edge of a cumulus
      float bump(vec2 p){ vec2 i = floor(p), f = fract(p); float b = 0.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
          vec2 g = vec2(x, y); vec2 o = h2(i + g); vec2 r = g + o * 0.7 + 0.15 - f;
          float R = 0.5 + 0.35 * h1(i + g + 9.0); float q = max(0.0, 1.0 - dot(r, r) / (R * R)); b = max(b, R * q * (2.0 - q));
        }
        return b; }
      float billow(vec2 p){ return 0.55 * bump(p) + 0.3 * bump(p * 2.1 + 3.1) + 0.15 * bump(p * 4.4 + 1.7); }
      float field(vec2 p){
        if (uKind < 0.5){
          float top = uBase;
          for (int i = 0; i < 6; i++){ vec3 t = uTowers[i]; float d = (p.x - t.x) / t.z; top += t.y * exp(-d * d); }
          top *= smoothstep(0.0, 0.25, p.x) * smoothstep(uAspect, uAspect - 0.25, p.x);
          vec2 w = vec2(fbm(p * 3.0), fbm(p * 3.0 + 5.2)) * 0.08;
          float sc = 4.6;
          return (top - p.y) + 0.2 * (billow(p * sc + w * 6.0) - 0.42) + 0.012 * (fbm(p * 12.0) - 0.5);
        }
        // stratus: a long thin band, torn by stretched noise
        float n = fbm(vec2(p.x * 2.2, p.y * 9.0) + 3.0) ;
        float band = 0.11 * smoothstep(0.0, 0.35, p.x) * smoothstep(uAspect, uAspect - 0.5, p.x) * (0.4 + n);
        return band - abs(p.y - 0.5 - 0.06 * sin(p.x * 2.3 + uSeed)) + 0.03 * (fbm(p * vec2(6.0, 22.0)) - 0.5);
      }
      void main(){
        vec2 p = vec2(vUv.x * uAspect, vUv.y);
        float f = field(p);
        float dens = smoothstep(0.0, uKind < 0.5 ? 0.02 : 0.05, f);
        if (dens <= 0.0){ gl_FragColor = vec4(0.0); return; }
        // how much cloud lies between this point and the sun
        vec2 L = normalize(uSun - p);
        float glow = exp(-length(uSun - p) * 1.6);
        float occ = 0.0;
        for (int i = 1; i <= 5; i++){ float s = float(i * i) * 0.006; occ += max(field(p + L * s), 0.0); }
        // each billow is shaded as a rounded surface turned toward or away from the sun
        float e = 0.012;
        vec2 gr = vec2(field(p + vec2(e, 0.0)) - field(p - vec2(e, 0.0)), field(p + vec2(0.0, e)) - field(p - vec2(0.0, e))) / (2.0 * e);
        vec3 n = normalize(vec3(-gr, uKind < 0.5 ? 2.2 : 6.0));
        float diff = clamp(dot(n, normalize(vec3(L, 0.45))), 0.0, 1.0);
        float lit = diff * (0.3 + 0.7 * exp(-occ * (uKind < 0.5 ? 6.0 : 12.0)));
        float sky = 0.5 + 0.5 * n.y;
        float edge = 1.0 - smoothstep(0.0, 0.05, f);
        vec3 shade = vec3(0.5, 0.4, 0.66), mid = vec3(0.8, 0.6, 0.74), sun = vec3(1.0, 0.72, 0.48), rim = vec3(1.0, 0.9, 0.72);
        vec3 c = mix(shade, mid, sky * 0.7);
        c = mix(c, sun, clamp(lit * (0.85 + 0.4 * glow), 0.0, 1.0));
        c = mix(c, rim, clamp(edge * lit * (0.5 + glow), 0.0, 1.0));
        c += vec3(1.0, 0.6, 0.3) * glow * lit * 0.25;
        c *= 1.0 - 0.28 * smoothstep(0.04, 0.3, f) * (1.0 - lit);
        float a = dens;
        if (uKind < 0.5){
          // base sinks into warm horizon haze
          c = mix(c, vec3(0.93, 0.62, 0.6), smoothstep(0.3, 0.0, p.y) * 0.6);
          a *= smoothstep(0.0, 0.12, p.y);
        } else {
          a *= 0.85;
        }
        gl_FragColor = vec4(c, a);
      }`,
  });
  bakeScene.add(new Mesh(new PlaneGeometry(2, 2), bakeMat));

  function bakeCloud(o) {
    const aspect = o.aspect;
    const rt = new WebGLRenderTarget(1024, o.kind === "stratus" ? 256 : 512);
    const u = bakeMat.uniforms;
    u.uKind.value = o.kind === "stratus" ? 1 : 0;
    u.uSeed.value = o.seed;
    u.uAspect.value = aspect;
    u.uSun.value = o.sun;
    u.uBase.value = o.base || 0.16;
    const t = (o.towers || []).map(([x, h, w]) => new Vector3(x, h, w));
    while (t.length < 6) t.push(new Vector3(0, 0, 1));
    u.uTowers.value = t;
    renderer.setRenderTarget(rt);
    renderer.render(bakeScene, bakeCam);
    renderer.setRenderTarget(null);
    return rt;
  }

  const cloudMat = (tex) => new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uMap: { value: tex }, uOpacity: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    // baked colours are already display values, so no colour-space conversion here
    fragmentShader: `uniform sampler2D uMap; uniform float uOpacity; varying vec2 vUv; void main(){ vec4 c = texture2D(uMap, vUv); gl_FragColor = vec4(c.rgb, c.a * uOpacity); }`,
  });

  // x: centre, fraction of view width. y: bottom edge, fraction of view height. s: width as a fraction of view width.
  const clouds = [
    { x: 0.08, y: -0.16, z: -62, s: 1.05, seed: 1.3, drift: 0.012,
      towers: [[0.25, 0.12, 0.2], [0.58, 0.28, 0.24], [0.9, 0.36, 0.2], [1.3, 0.38, 0.2], [1.6, 0.03, 0.1], [1.86, 0.12, 0.12]] },
    { x: -0.42, y: -0.14, z: -64, s: 0.8, seed: 4.7, drift: 0.008, base: 0.12,
      towers: [[0.4, 0.14, 0.2], [0.85, 0.24, 0.17], [1.2, 0.18, 0.2], [1.6, 0.12, 0.15]] },
    { x: 0.3, y: 0.2, z: -60, s: 0.62, v: 0.0025, seed: 2.1, kind: "stratus" },
    { x: -0.3, y: 0.22, z: -60, s: 0.45, v: 0.002, seed: 6.4, kind: "stratus" },
  ].map((o) => {
    const aspect = o.kind === "stratus" ? 4 : 2;
    const m = new Mesh(new PlaneGeometry(1, 1 / aspect), cloudMat(null));
    m.userData = { ...o, aspect };
    scene.add(m);
    return m;
  });

  // ---------- mountain layers ----------
  // Each layer is a strip from the ridge line down. Colour is computed per pixel from
  // the depth below the ridge, how much the slope faces the sun, and distance to the sun.
  const LAYERS = [
    { z: -50, base: 0.02, amp: 0.17, freq: 0.9, seed: 3, peak: { x: 0.12, h: 0.25, wl: 0.2, wr: 0.3 }, snow: 1, haze: 0.55,
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
    attribute float aLit; attribute float aDepth; attribute float aPeak; attribute float aU; attribute float aRidge; attribute float aSide;
    varying float vLit; varying float vDepth; varying float vPeak; varying float vU; varying float vRidge; varying float vSide;
    void main(){
      vLit = aLit; vDepth = aDepth; vPeak = aPeak; vU = aU; vRidge = aRidge; vSide = aSide;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const layerFrag = `
    uniform vec3 uTop, uLit, uBase, uMist, uHaze;
    uniform float uSunU, uHazeAmt, uSnow, uSnowAlt, uSeed, uCrestU, uTopAlt;
    varying float vLit; varying float vDepth; varying float vPeak; varying float vU; varying float vRidge; varying float vSide;
    float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(h1(i), h1(i+vec2(1,0)), f.x), mix(h1(i+vec2(0,1)), h1(i+vec2(1,1)), f.x), f.y); }
    void main(){
      float d = max(vDepth, 0.0);
      float alt = vRidge - d;            // height of this pixel, in view-height units
      vec3 c = mix(uTop, uBase, smoothstep(0.0, 0.2, d));
      // an inner, overlapping hill inside each range gives it depth
      float inner = vRidge - 0.05 - 0.07 * vn(vec2(vU * 2.6 + uSeed, 1.0)) - 0.03 * vn(vec2(vU * 8.0 + uSeed, 2.0));
      float below = smoothstep(inner + 0.003, inner - 0.003, alt);
      c = mix(c, mix(uTop, uBase, 0.4) * 0.93, below * 0.6);
      c = mix(c, uLit, vLit * 0.4 * below * exp(-max(inner - alt, 0.0) / 0.012));
      // thin rim of sunlight on sun-facing crests
      c = mix(c, uLit, vLit * 0.8 * exp(-d / 0.018));
      // rock and scree texture following the slopes
      float tex = vn(vec2(vU * 60.0 - alt * 30.0, alt * 9.0)) * 0.6 + vn(vec2(vU * 150.0, alt * 45.0)) * 0.4;
      c *= 0.95 + 0.1 * tex;
      // glow from the low sun, strongest near its x position and the ridge tops
      float sd = abs(vU - uSunU);
      c = mix(c, uHaze, uHazeAmt * exp(-sd * 2.2) * exp(-d / 0.22));
      if (uSnow > 0.5) {
        float onPeak = smoothstep(0.02, 0.25, vPeak);
        float down = max(uTopAlt - alt, 0.0);
        // angle around the summit: gullies and ribs fan out from the top
        float ang = atan(vU - uCrestU, down + 0.004);
        float rib = vn(vec2(ang * 15.0, alt * 1.4)) * 0.7 + vn(vec2(ang * 38.0, alt * 3.0)) * 0.3;
        // the dividing ridge between the shadow face and the sun face wavers a little
        // the main ridge runs from the summit down towards the right-hand shoulder
        float split = (vU - uCrestU) - down * 0.55 + (vn(vec2(alt * 14.0, 4.0)) - 0.5) * 0.04 * smoothstep(0.0, 0.05, down);
        float face = smoothstep(-0.008, 0.008, split);
        float relief = 1.0 - 0.55 * smoothstep(0.08, 0.3, down);   // contrast fades into the haze below
        // rock: cool and dark in shadow, warm in the sun, with ribs
        vec3 shadowRock = c * vec3(0.74, 0.74, 0.9) * (0.9 + 0.2 * rib);
        vec3 litRock = mix(c, uLit, 0.42) * (0.9 + 0.2 * rib);
        c = mix(c, mix(shadowRock, litRock, face), onPeak * relief);
        // snow by altitude; fingers of snow run further down the gullies
        float gully = 1.0 - smoothstep(0.3, 0.7, vn(vec2(ang * 11.0, alt * 1.2)));
        float line = uSnowAlt - gully * 0.06 + (vn(vec2(vU * 20.0, 0.3)) - 0.5) * 0.03;
        float m = smoothstep(line - 0.006, line + 0.006, alt) * onPeak;
        // rock ribs poke through the snow, mostly near the snowline
        m *= 1.0 - smoothstep(0.62, 0.8, rib) * (0.3 + 0.6 * (1.0 - smoothstep(line, line + 0.06, alt)));
        vec3 snowShade = vec3(0.66, 0.64, 0.9);
        vec3 snowLit = vec3(1.0, 0.89, 0.8);
        vec3 snow = mix(snowShade, snowLit, face) * (0.93 + 0.1 * rib);
        // a touch of alpenglow near the summit on the sun face
        snow = mix(snow, vec3(1.0, 0.78, 0.7), face * 0.25 * (1.0 - smoothstep(0.0, 0.08, down)));
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
    u.uSnowAlt = { value: 0 };
    u.uSeed = { value: L.seed * 1.7 };
    u.uCrestU = { value: 0 };
    u.uTopAlt = { value: 0 };
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
    const peakEnv = (u) => {
      if (!L.peak) return 0;
      const dx = u - L.peak.x * camera.aspect;
      const d = Math.abs(dx) / (dx < 0 ? L.peak.wl : L.peak.wr);
      const main = Math.pow(Math.max(0, 1 - d), 1.35);
      const shoulder = 0.42 * Math.pow(Math.max(0, 1 - Math.abs(dx - L.peak.wr * 0.45) / (L.peak.wr * 0.28)), 1.6);
      return L.peak.h * Math.max(main, shoulder * 0.9 + main * 0.4);
    };
    // rugged outline: noise that scales with the peak so the summit stays sharp
    const peakAt = (u) => {
      const e = peakEnv(u);
      if (!e) return 0;
      return e * (1 + 0.09 * (ridged(u * 16 + 3, 5, 3) - 0.5)) + 0.012 * (vnoise(u * 40, 9) - 0.5) * (e / L.peak.h);
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

    // which side of the summit each column is on (for shadow / sun faces)
    let crest = 0;
    if (L.peak) ys.forEach((y, i) => { if (Math.abs(xs[i] / h - L.peak.x * camera.aspect) < L.peak.wr && y > ys[crest]) crest = i; });
    const crestU = xs[crest] / h;
    const pos = new Float32Array((N + 1) * 2 * 3);
    const aRidge = new Float32Array((N + 1) * 2);
    const aSide = new Float32Array((N + 1) * 2);
    const aLit = new Float32Array((N + 1) * 2);
    const aDepth = new Float32Array((N + 1) * 2);
    const aPeak = new Float32Array((N + 1) * 2);
    const aU = new Float32Array((N + 1) * 2);
    for (let i = 0; i <= N; i++) {
      const pk = L.peak ? peakEnv(xs[i] / h) / L.peak.h : 0;
      for (let r = 0; r < 2; r++) {
        const v = i * 2 + r;
        const y = r === 0 ? ys[i] : bottom;
        pos[v * 3] = xs[i]; pos[v * 3 + 1] = y; pos[v * 3 + 2] = 0;
        aLit[v] = lits[i];
        aDepth[v] = (ys[i] - y) / h;
        aPeak[v] = pk;
        aU[v] = xs[i] / h;
        aRidge[v] = ys[i] / h;
        aSide[v] = Math.tanh((xs[i] / h - crestU) / 0.02);
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
    g.setAttribute("aRidge", new Float32BufferAttribute(aRidge, 1));
    g.setAttribute("aSide", new Float32BufferAttribute(aSide, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    L.mesh.material.uniforms.uSunU.value = sunX / h;
    if (L.peak) {
      const U = L.mesh.material.uniforms;
      U.uTopAlt.value = ys[crest] / h;
      U.uCrestU.value = crestU;
      U.uSnowAlt.value = ys[crest] / h - 0.13;
    }
  }

  // ---------- foreground grass ----------
  // Two layers of individual blades. The sway runs in the vertex shader: a steady
  // ripple plus slow gusts that roll across the field from left to right.
  const grassVert = `
    attribute float aTip; attribute float aPhase; attribute float aBlade;
    uniform float uTime; uniform float uH; uniform float uSway;
    varying float vTip; varying float vX;
    void main(){
      vec3 p = position;
      vTip = aTip; vX = p.x / uH;
      float gust = pow(0.5 + 0.5 * sin(uTime * 0.55 - p.x / uH * 2.2), 3.0);
      float ripple = sin(uTime * 2.1 + aPhase + p.x / uH * 9.0);
      float bend = (ripple * 0.35 + gust * 1.1) * aBlade * uSway * aTip;
      p.x += bend * uH;
      p.y -= abs(bend) * uH * 0.35;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`;
  const grassFrag = `
    uniform vec3 uRoot, uTipCol, uWarm; uniform float uSunX;
    varying float vTip; varying float vX;
    void main(){
      float sun = exp(-abs(vX - uSunX) * 1.6);
      vec3 tip = mix(uTipCol, uWarm, 0.25 + 0.6 * sun);
      vec3 c = mix(uRoot, tip, smoothstep(0.05, 1.0, vTip));
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`;
  const GRASS = [
    { z: -3.6, density: 0.0042, base: 0.05, edge: 0.1, sway: 0.05, seed: 21, col: ["#2d225c", "#8a68ad", "#f0a283"] },
    { z: -2.4, density: 0.0034, base: 0.07, edge: 0.15, sway: 0.065, seed: 7, col: ["#120d29", "#4b3577", "#c97a7f"] },
  ];
  GRASS.forEach((G) => {
    G.mesh = new Mesh(new BufferGeometry(), new ShaderMaterial({
      vertexShader: grassVert, fragmentShader: grassFrag, side: DoubleSide,
      uniforms: { uTime: { value: 0 }, uH: { value: 1 }, uSway: { value: G.sway }, uSunX: { value: 0 },
        uRoot: { value: new Color(G.col[0]) }, uTipCol: { value: new Color(G.col[1]) }, uWarm: { value: new Color(G.col[2]) } },
    }));
    G.mesh.position.z = G.z;
    scene.add(G.mesh);
  });
  function buildGrass() {
    GRASS.forEach((G) => {
      const { w, h } = viewAt(G.z);
      const W = w * 1.3;
      const N = Math.round(W / (h * G.density));
      const pos = [], tip = [], phase = [], blade = [], idx = [];
      const bottom = -h * 0.5 - h * 0.08;
      for (let i = 0; i < N; i++) {
        const r1 = hash(i, G.seed), r2 = hash(i + 1, G.seed + 3), r3 = hash(i + 2, G.seed + 9);
        const x = -W / 2 + (W * (i + r1 * 0.8)) / N;
        const u = x / h;
        const edge = Math.min(1, Math.abs(u / (w / h)) * 2.2);
        const clump = 0.55 + 0.45 * vnoise(u * 4 + G.seed, G.seed);
        const height = h * (G.base + G.edge * Math.pow(edge, 1.6)) * clump * (0.55 + 0.6 * r2);
        const halfW = h * (0.0055 + 0.0045 * r3);
        const lean = (r1 - 0.5) * height * 0.35;
        const v = pos.length / 3;
        pos.push(x - halfW, bottom, 0, x + halfW, bottom, 0, x + lean, -h * 0.5 + height, 0);
        tip.push(0, 0, 1);
        phase.push(0, 0, r2 * 6.28);
        const b = 0.6 + 0.8 * (height / h) / (G.base + G.edge);
        blade.push(b, b, b);
        idx.push(v, v + 1, v + 2);
      }
      const g = G.mesh.geometry;
      g.setAttribute("position", new Float32BufferAttribute(pos, 3));
      g.setAttribute("aTip", new Float32BufferAttribute(tip, 1));
      g.setAttribute("aPhase", new Float32BufferAttribute(phase, 1));
      g.setAttribute("aBlade", new Float32BufferAttribute(blade, 1));
      g.setIndex(idx);
      g.computeBoundingSphere();
      const U = G.mesh.material.uniforms;
      U.uH.value = h;
      U.uSunX.value = ((SUN.x - 0.5) * w) / h;
    });
  }

  // ---------- birds ----------
  // A small 3D gull: spindle body, fanned tail and swept wings along z. The wing
  // folds at the elbow in the vertex shader, the outer half lagging the inner,
  // so the silhouette changes through the stroke the way a real one does.
  function birdGeometry() {
    const pos = [], wing = [];
    const tri = (a, b, c, wa = 0, wb = 0, wc = 0) => { pos.push(...a, ...b, ...c); wing.push(wa, wb, wc); };
    // body, as two crossed outlines so it reads from any angle (head toward -x)
    const body = [[-0.46, 0], [-0.4, 0.035], [-0.3, 0.06], [-0.12, 0.075], [0.08, 0.06], [0.24, 0.035], [0.3, 0.025]];
    for (let i = 0; i < body.length - 1; i++) {
      const [x0, r0] = body[i], [x1, r1] = body[i + 1];
      tri([x0, r0, 0], [x1, r1, 0], [x1, -r1 * 0.8, 0]);
      tri([x0, r0, 0], [x1, -r1 * 0.8, 0], [x0, -r0 * 0.8, 0]);
      tri([x0, 0, r0], [x1, 0, r1], [x1, 0, -r1]);
      tri([x0, 0, r0], [x1, 0, -r1], [x0, 0, -r0]);
    }
    // tail fan
    tri([0.24, 0, 0.03], [0.46, 0, 0.11], [0.46, 0, -0.11]);
    tri([0.24, 0, 0.03], [0.46, 0, -0.11], [0.24, 0, -0.03]);
    // wings: leading edge bows forward at the wrist, tip swept back to a point
    const R = [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.74, 0.85, 0.94, 1];
    const le = (r) => -0.13 - 0.07 * Math.sin(Math.min(1, r / 0.55) * Math.PI * 0.5) + 0.42 * Math.pow(Math.max(0, r - 0.5), 1.5);
    const chord = (r) => 0.3 * (1 - Math.pow(r, 2.4)) + 0.015;
    for (const sg of [1, -1]) {
      for (let i = 0; i < R.length - 1; i++) {
        const r0 = R[i], r1 = R[i + 1];
        const a = [le(r0), 0, sg * (0.04 + r0)], b = [le(r1), 0, sg * (0.04 + r1)];
        const c = [le(r1) + chord(r1), 0, sg * (0.04 + r1)], d = [le(r0) + chord(r0), 0, sg * (0.04 + r0)];
        tri(a, b, c, r0, r1, r1);
        tri(a, c, d, r0, r1, r0);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("aWing", new Float32BufferAttribute(wing, 1));
    return g;
  }
  const birdGeo = birdGeometry();
  const birdVert = `
    attribute float aWing; uniform vec2 uFlap; uniform float uBob;
    void main(){
      vec3 p = position;
      if (aWing > 0.0){
        float sg = sign(p.z), r = abs(p.z) - 0.04, r0 = 0.45;
        float a1 = uFlap.x, a2 = uFlap.y;
        vec2 inner = vec2(sin(a1), cos(a1)) * min(r, r0);
        vec2 outer = r > r0 ? vec2(sin(a2), cos(a2)) * (r - r0) : vec2(0.0);
        vec2 yz = inner + outer;
        p.y += yz.x; p.z = sg * (0.04 + yz.y);
        p.x += 0.05 * r * sin(a1); // wings sweep forward on the downstroke
      }
      p.y += uBob;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`;
  const birdFrag = `uniform vec3 uColor;
    void main(){
      gl_FragColor = vec4(uColor, 1.0);
      #include <colorspace_fragment>
    }`;
  const near = new Color("#1d1540"), far = new Color("#4f3c80");
  const birds = [];
  // a loose flock in the middle distance, and a pair gliding close to the camera
  const BIRDS = [
    ...Array.from({ length: 9 }, (_, i) => ({ z: -19 - (i % 3) * 2.5, span: 0.32 + Math.random() * 0.07, lead: i,
      ox: Math.floor((i + 1) / 2) * 0.9 * (i % 2 ? 1 : 0.8) + Math.random() * 0.4, oy: Math.floor((i + 1) / 2) * 0.3 * (i % 2 ? 1 : -1) + (Math.random() - 0.5) * 0.3,
      y: 0.26, speed: 0.5, freq: 7 + Math.random() * 1.5, glide: 0.45 })),
    { z: -8, span: 0.55, ox: 0, oy: 0, y: 0.28, speed: 0.34, freq: 4.6, glide: 0.75, solo: 7 },
    { z: -9.5, span: 0.46, ox: 2.4, oy: 0.25, y: 0.3, speed: 0.34, freq: 5, glide: 0.75, solo: 7 },
  ];
  BIRDS.forEach((o, i) => {
    const tint = near.clone().lerp(far, Math.min(1, (-o.z - 8) / 16));
    const m = new Mesh(birdGeo, new ShaderMaterial({
      side: DoubleSide,
      uniforms: { uFlap: { value: [0, 0] }, uBob: { value: 0 }, uColor: { value: tint } },
      vertexShader: birdVert, fragmentShader: birdFrag,
    }));
    m.userData = { ...o, p: Math.random() * 6.28, g: Math.random() * 20 + i, span0: 0 };
    birds.push(m);
    scene.add(m);
  });

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
  let W = 0, H = 0;
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
    SUN_VIEW.x = (SUN.x - 0.5) * 1.4;
    SUN_VIEW.y = (SUN.y - 0.5) * 1.3;
    starMat.uniforms.uScale.value = [v.w * 1.3, v.h];
    clouds.forEach((m) => {
      const d = m.userData;
      const cv = viewAt(d.z);
      // width follows the view; height is tied to the view height so wide screens
      // stretch the bank sideways instead of piling it up behind the nav
      const fit = Math.max(1, 1.4 / camera.aspect);
      const wide = cv.w * d.s * fit;
      d.w = cv.w;
      d.h = Math.min(wide, cv.h * 1.6 * d.s * fit) / d.aspect;
      m.scale.set(wide, d.h * d.aspect, 1);
      m.position.set(d.x * cv.w, d.y * cv.h + d.h / 2, d.z);
      // the sun in this cloud's texture space, so the lit side faces it
      d.sun = [((SUN_VIEW.x * cv.w - (m.position.x - wide / 2)) / wide) * d.aspect, (SUN_VIEW.y * cv.h - (m.position.y - d.h / 2)) / d.h];
      if (d.rt) d.rt.dispose();
      d.rt = bakeCloud(d);
      m.material.uniforms.uMap.value = d.rt.texture;
    });
    const small = Math.min(1, 0.45 + camera.aspect * 0.4);
    birds.forEach((b) => {
      const d = b.userData;
      const v = viewAt(d.z);
      d.vw = v.w * 1.3 + 4;
      d.vh = v.h;
      b.scale.setScalar(d.span * small * (v.h / 10));
    });
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
      if (d.kind === "stratus") {
        const span = d.w * 1.4 + m.scale.x;
        const x = d.x * d.w + s * d.v * d.w;
        m.position.x = ((x + span / 2) % span + span) % span - span / 2;
      } else {
        m.position.x = d.x * d.w + Math.sin(s * d.drift) * d.w * 0.04;
      }
    });

    birds.forEach((b) => {
      const d = b.userData;
      const k = b.scale.x;
      // fly right to left across the view, then wrap round
      const travel = s * d.speed * (d.vh / 10) + d.ox * k * 2.2 + (d.solo || 0);
      const x = d.vw / 2 - (((travel % d.vw) + d.vw) % d.vw);
      const y = d.y * d.vh + d.oy * k * 2.2 + Math.sin(s * 0.35 + d.p) * 0.05 * d.vh;
      // bursts of flapping between glides; the flock flaps roughly together
      const cycle = 0.5 + 0.5 * Math.sin(s * 0.45 + (d.solo ? d.p : 0) + (d.lead || 0) * 0.15);
      const flap = Math.max(0, Math.min(1, (cycle - d.glide) / 0.12));
      const ph = s * d.freq + d.p;
      const amp = 0.85 * flap;
      const a1 = 0.14 + amp * Math.sin(ph);
      const a2 = a1 - 0.18 + amp * 0.55 * Math.sin(ph - 1.1);
      b.material.uniforms.uFlap.value = [a1, a2];
      b.material.uniforms.uBob.value = -0.06 * amp * Math.sin(ph);
      b.position.set(x, y, d.z);
      // seen from below and slightly behind, banking gently as it goes
      b.rotation.set(-0.38 + Math.sin(s * 0.3 + d.p) * 0.12, 0.2, Math.sin(s * 0.5 + d.p) * 0.06);
    });

    GRASS.forEach((G) => (G.mesh.material.uniforms.uTime.value = s));

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
