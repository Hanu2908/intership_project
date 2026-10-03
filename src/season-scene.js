/* Season map: India's official outline as a dusk-lit slab, one pillar of light per
   destination, glowing arcs for the trip route and a dotted arc to a quieter twin.
   season.js drives it through window.SeasonMap.create(). Rendering pauses when the
   map is off-screen or the tab is hidden. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, Group, Shape, ExtrudeGeometry, ShaderMaterial,
  CylinderGeometry, RingGeometry, CircleGeometry, BufferGeometry, Float32BufferAttribute, Points,
  Line, LineLoop, LineBasicMaterial, LineDashedMaterial, TubeGeometry, QuadraticBezierCurve3, Vector3,
  Vector2, Color, Raycaster, AdditiveBlending, DoubleSide, SRGBColorSpace, MathUtils,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const LAT0 = 22.5, LNG0 = 82.5, KX = Math.cos((LAT0 * Math.PI) / 180);
// lng/lat to map units (x east, z south), roughly 1 unit per degree
const toXZ = (lng, lat) => [(lng - LNG0) * KX, -(lat - LAT0)];
const SLAB = 0.7;
const CROWD = [null, new Color("#ffc46b"), new Color("#ff8a3d"), new Color("#ff4a5a")];
const DIM = new Color("#6d6585");

function create(canvas, { rings, places, reduce = false }) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, 0.5, 400);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 18;
  controls.maxDistance = 80;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = 1.15;
  controls.zoomSpeed = 0.6;
  controls.rotateSpeed = 0.5;
  controls.enableZoom = false; // the page scrolls over the map; a click turns zoom on
  canvas.addEventListener("pointerdown", () => (controls.enableZoom = true));
  canvas.addEventListener("pointerleave", () => (controls.enableZoom = false));

  // ---------- sea: a faint dotted grid that fades out at the edges ----------
  {
    const pts = [];
    for (let x = -36; x <= 36; x += 1.2) for (let z = -32; z <= 32; z += 1.2) pts.push(x, -0.02, z);
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pts, 3));
    scene.add(new Points(g, new ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uPx: { value: renderer.getPixelRatio() } },
      vertexShader: `uniform float uPx; varying float vA;
        void main(){ vA = smoothstep(34.0, 12.0, length(position.xz));
          vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 2.2 * uPx * (40.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.72, 0.66, 0.92, vA * 0.35 * smoothstep(0.5, 0.2, d)); }`,
    })));
  }

  // ---------- the land ----------
  const land = new Group();
  scene.add(land);
  const landMat = new ShaderMaterial({
    uniforms: { uSun: { value: new Vector3(0.6, 0.7, 0.4).normalize() } },
    vertexShader: `varying vec3 vN; varying vec3 vP;
      void main(){ vN = normalize(normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        // top: violet that warms toward the south-west, with a little grain
        float north = clamp((-vP.z + 16.0) / 32.0, 0.0, 1.0);
        vec3 top = mix(vec3(0.1, 0.07, 0.26), vec3(0.07, 0.05, 0.2), north);
        top += vec3(0.05, 0.02, 0.0) * (1.0 - north);
        top *= 0.96 + 0.06 * h(floor(vP.xz * 3.0));
        // sides catch the low sun in ember
        float lit = clamp(dot(vN, uSun), 0.0, 1.0);
        vec3 side = mix(vec3(0.04, 0.03, 0.1), vec3(0.85, 0.3, 0.12), lit * 0.8);
        vec3 c = vN.y > 0.5 ? top : side;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const edgeMat = new LineBasicMaterial({ color: new Color("#b9a8e6"), transparent: true, opacity: 0.75 });
  rings.forEach((r) => {
    const shape = new Shape(r.map(([lng, lat]) => { const [x, z] = toXZ(lng, lat); return new Vector2(x, -z); }));
    const geo = new ExtrudeGeometry(shape, { depth: SLAB, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); // shape y (north) becomes -z, extrusion goes up
    land.add(new Mesh(geo, landMat));
    const edge = new BufferGeometry().setFromPoints(r.map(([lng, lat]) => { const [x, z] = toXZ(lng, lat); return new Vector3(x, SLAB + 0.01, z); }));
    land.add(new LineLoop(edge, edgeMat));
  });

  // ---------- pillars ----------
  const beamGeo = new CylinderGeometry(0.22, 0.32, 1, 20, 1, true);
  beamGeo.translate(0, 0.5, 0);
  const beamVert = `varying float vY; varying vec3 vN; varying vec3 vV;
    void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const beamFrag = `uniform vec3 uColor; uniform float uAlpha, uTime, uFlicker, uSel; varying float vY; varying vec3 vN; varying vec3 vV;
    void main(){
      float rim = 1.0 - abs(dot(vN, vV));
      float a = (0.5 + 0.5 * pow(rim, 1.5)) * (1.0 - vY * 0.45);
      float f = 1.0 - uFlicker * 0.35 * (0.5 + 0.5 * sin(uTime * 9.0 + vY * 6.0)) * (0.5 + 0.5 * sin(uTime * 3.7));
      vec3 c = mix(uColor, vec3(1.0), 0.12 * (1.0 - vY) + 0.25 * uSel);
      gl_FragColor = vec4(c, a * uAlpha * f);
    }`;
  const capGeo = new CircleGeometry(0.3, 24).rotateX(-Math.PI / 2);
  const ringGeo = new RingGeometry(0.42, 0.55, 40).rotateX(-Math.PI / 2);
  const hitGeo = new CylinderGeometry(0.7, 0.7, 1, 8);
  hitGeo.translate(0, 0.5, 0);
  const hitMat = new ShaderMaterial({ visible: false });
  const pillars = new Map();
  places.forEach((p) => {
    const [x, z] = toXZ(p.lng, p.lat);
    const g = new Group();
    g.position.set(x, SLAB, z);
    const mat = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      uniforms: { uColor: { value: new Color("#ffc46b") }, uAlpha: { value: 1 }, uTime: { value: 0 }, uFlicker: { value: 0 }, uSel: { value: 0 } },
      vertexShader: beamVert, fragmentShader: beamFrag,
    });
    const beam = new Mesh(beamGeo, mat);
    const capMat = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uColor: mat.uniforms.uColor, uAlpha: mat.uniforms.uAlpha },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(mix(vec3(1.0), uColor, smoothstep(0.0, 0.6, d)), uAlpha * smoothstep(1.0, 0.2, d)); }`,
    });
    const cap = new Mesh(capGeo, capMat);
    const baseMat = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uColor: mat.uniforms.uColor, uAlpha: { value: 0 } },
      vertexShader: `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uAlpha; void main(){ gl_FragColor = vec4(uColor, uAlpha); }`,
    });
    const base = new Mesh(ringGeo, baseMat);
    base.position.y = 0.02;
    const hit = new Mesh(hitGeo, hitMat);
    hit.userData.id = p.id;
    g.add(beam, cap, base, hit);
    scene.add(g);
    pillars.set(p.id, { g, beam, cap, base, hit, mat, h: 0.2, th: 0.2, col: new Color("#ffc46b"), tcol: new Color("#ffc46b"), a: 1, ta: 1, flick: 0, sel: 0 });
  });

  // ---------- arcs ----------
  const arcs = new Group();
  scene.add(arcs);
  const arcMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    // a bright pulse travels along each leg, in the direction of travel
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main(){ float t = fract(vUv.x - uTime * 0.35); float pulse = smoothstep(0.0, 0.15, t) * smoothstep(0.3, 0.15, t);
        gl_FragColor = vec4(mix(vec3(0.94, 0.49, 0.26), vec3(1.0, 0.9, 0.7), pulse), 0.55 + 0.45 * pulse); }`,
  });
  const curveBetween = (a, b, lift) => {
    const pa = pillars.get(a).g.position, pb = pillars.get(b).g.position;
    const mid = pa.clone().add(pb).multiplyScalar(0.5);
    mid.y = SLAB + lift + pa.distanceTo(pb) * 0.35;
    return new QuadraticBezierCurve3(pa.clone().setY(SLAB + 0.05), mid, pb.clone().setY(SLAB + 0.05));
  };
  function setRoute(ids) {
    arcs.children.filter((c) => c.userData.route).forEach((c) => { c.geometry.dispose(); arcs.remove(c); });
    const ok = ids.filter((id) => pillars.has(id));
    for (let i = 1; i < ok.length; i++) {
      const tube = new Mesh(new TubeGeometry(curveBetween(ok[i - 1], ok[i], 0.6), 48, 0.09, 6), arcMat);
      tube.userData.route = true;
      arcs.add(tube);
    }
    routeIds = ok;
  }
  let routeIds = [];
  const twinMat = new LineDashedMaterial({ color: new Color("#b9f0d0"), dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.9 });
  let twinLine = null;
  function setTwin(a, b) {
    if (twinLine) { twinLine.geometry.dispose(); arcs.remove(twinLine); twinLine = null; }
    if (!a || !b || !pillars.has(a) || !pillars.has(b)) return;
    const geo = new BufferGeometry().setFromPoints(curveBetween(a, b, 1.2).getPoints(60));
    twinLine = new Line(geo, twinMat);
    twinLine.computeLineDistances();
    arcs.add(twinLine);
  }

  // ---------- state from the page ----------
  // items: [{ id, fit 0..1, crowd 1..3, ok }]
  function setScores(items) {
    items.forEach((it) => {
      const P = pillars.get(it.id);
      if (!P) return;
      P.th = it.ok ? 0.35 + it.fit * 5.2 : 0.25;
      P.tcol.copy(it.ok ? CROWD[it.crowd] : DIM);
      P.ta = it.ok ? 1 : 0.35;
      P.flick = it.ok && it.crowd === 3 ? 1 : 0;
    });
    wake();
  }
  let selected = null;
  function select(id) {
    selected = id;
    pillars.forEach((P, k) => (P.sel = k === id ? 1 : 0));
    wake();
  }

  // ---------- camera ----------
  const HOME = { pos: new Vector3(0, 46, 34), target: new Vector3(0, 0, 1.5) };
  const TOP = { pos: new Vector3(0, 50, 13), target: new Vector3(0, 0, 0.5) }; // nearly top-down, north up
  let flat = false;
  let fly = null;
  function flyTo(pos, target, ms = 1100) {
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: performance.now(), ms: reduce ? 1 : ms };
    wake();
  }
  function focus(id) {
    const P = pillars.get(id);
    if (!P) return;
    const t = P.g.position.clone().setY(1.5);
    const dir = (flat ? TOP : HOME).pos.clone().sub((flat ? TOP : HOME).target).normalize();
    flyTo(t.clone().add(dir.multiplyScalar(40)), t);
  }
  function home() {
    const v = flat ? TOP : HOME;
    flyTo(v.pos.clone(), v.target.clone());
  }
  function setFlat(on) {
    flat = on;
    controls.enableRotate = !on;
    camera.position.copy((on ? TOP : HOME).pos);
    controls.target.copy((on ? TOP : HOME).target);
    wake();
  }

  // ---------- picking ----------
  const ray = new Raycaster();
  const ndc = new Vector2();
  const hits = [...pillars.values()].map((P) => P.hit);
  let onPick = () => {}, onHover = () => {};
  let down = null;
  const pickAt = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hits, false)[0];
    return h ? h.object.userData.id : null;
  };
  canvas.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
  canvas.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const id = pickAt(e);
    if (id) onPick(id);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.buttons) return;
    const id = pickAt(e);
    canvas.style.cursor = id ? "pointer" : "grab";
    onHover(id);
  });
  controls.addEventListener("start", () => { fly = null; wake(); });
  controls.addEventListener("change", wake);

  // screen position of a pillar top, for HTML labels
  const tmp = new Vector3();
  function screenOf(id) {
    const P = pillars.get(id);
    if (!P) return null;
    tmp.copy(P.g.position).setY(SLAB + P.h + 0.5).project(camera);
    if (tmp.z > 1) return null;
    return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H };
  }

  // ---------- loop ----------
  let W = 1, H = 1, raf = 0, visible = true, last = performance.now(), idleUntil = 0, onFrame = () => {};
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // narrow screens: step back so all of India fits
    camera.fov = W / H < 0.9 ? 48 : 36;
    camera.updateProjectionMatrix();
    wake();
  }
  function wake() {
    idleUntil = performance.now() + 1800;
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const s = now / 1000;
    let moving = false;
    if (fly) {
      const k = Math.min(1, (now - fly.start) / fly.ms);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (k >= 1) fly = null;
      moving = true;
    }
    controls.update();
    const ease = reduce ? 1 : 1 - Math.exp(-dt * 6);
    pillars.forEach((P) => {
      P.h += (P.th - P.h) * ease;
      P.a += (P.ta - P.a) * ease;
      P.col.lerp(P.tcol, ease);
      if (Math.abs(P.th - P.h) > 0.005) moving = true;
      P.beam.scale.y = P.h;
      P.cap.position.y = P.h;
      P.hit.scale.y = P.h + 0.6;
      P.mat.uniforms.uColor.value.copy(P.col);
      P.mat.uniforms.uAlpha.value = P.a;
      P.mat.uniforms.uTime.value = s;
      P.mat.uniforms.uFlicker.value = reduce ? 0 : P.flick;
      P.mat.uniforms.uSel.value = P.sel;
      const pulse = P.sel ? 0.5 + 0.5 * Math.sin(s * 4) : 0;
      P.base.material.uniforms.uAlpha.value = P.sel ? 0.5 + 0.4 * pulse : 0.18 * P.a;
      P.base.scale.setScalar(P.sel ? 1 + pulse * 0.5 : 1);
    });
    arcMat.uniforms.uTime.value = s;
    renderer.render(scene, camera);
    onFrame();
    // keep animating while something moves, a pillar flickers, a route pulses or a pin is selected
    const alive = moving || now < idleUntil || (!reduce && (routeIds.length > 1 || selected || [...pillars.values()].some((P) => P.flick && P.a > 0.5)));
    if (alive && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => !document.hidden && wake());
  new ResizeObserver(resize).observe(canvas);
  camera.position.copy(HOME.pos);
  controls.target.copy(HOME.target);
  resize();

  return {
    setScores, select, setRoute, setTwin, focus, home, setFlat, screenOf, wake,
    set onPick(f) { onPick = f; }, set onHover(f) { onHover = f; }, set onFrame(f) { onFrame = f; },
  };
}

window.SeasonMap = { create };
window.dispatchEvent(new Event("seasonmap:ready"));
