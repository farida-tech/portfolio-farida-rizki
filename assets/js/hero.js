/* Hero: falling 3D balls (Matter.js) + a cat whose eyes follow you. */
(() => {
  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('ballpit');
  const cat = document.querySelector('.cat');
  const label = document.querySelector('.ball-label');
  if (!hero || !canvas) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');

  /* ---------------- Ball palettes (lit from upper right, like the PDF) ---------------- */
  /* Matte palette: chalky, flat colour; light and shade only, no shine */
  const PAL = {
    steel: [[0, '#9BB7C6'], [0.55, '#7C9CAF'], [1, '#5E7D90']],
    deep:  [[0, '#6E8A9B'], [0.55, '#566F80'], [1, '#41596A']],
    sky:   [[0, '#CFDEE5'], [0.55, '#B6CAD4'], [1, '#98AFBC']],
    gold:  [[0, '#E6C978'], [0.55, '#D5AF4F'], [1, '#B8913A']],
    amber: [[0, '#E3AE78'], [0.55, '#CE9158'], [1, '#AE7442']],
    mist:  [[0, '#EEF0F1'], [0.55, '#DCE1E4'], [1, '#C3CBD1']],
  };
  const KINDS = ['steel', 'steel', 'deep', 'sky', 'sky', 'gold', 'gold', 'amber', 'mist'];

  /* Very diverse sizes: pebbles, marbles, oranges and a few giants */
  const SIZE_BANDS = [
    [0.34, 0.22, 0.45],  // [share, min, max] tiny pebbles
    [0.27, 0.5, 0.9],    // small
    [0.22, 0.95, 1.5],   // medium
    [0.12, 1.7, 2.5],    // large
    [0.05, 2.8, 3.6],    // giant
  ];
  const sizeFactor = (band) => {
    let t = Math.random(), i = 0;
    if (band != null) i = band;
    else while (i < SIZE_BANDS.length - 1 && t > SIZE_BANDS[i][0]) { t -= SIZE_BANDS[i][0]; i++; }
    const [, a, b] = SIZE_BANDS[i];
    return a + Math.random() * (b - a);
  };

  let W = 0, H = 0, dpr = 1;
  let anchor = null;        // big gold ball the cat sits on
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ---------------- Fallback if Matter.js failed to load ---------------- */
  if (!window.Matter) { canvas.remove(); placeCatFallback(); trackEyes(); return; }

  const { Engine, Bodies, Body, Composite, Constraint, Query } = Matter;
  const engine = Engine.create({ gravity: { x: 0, y: 1 } });
  const SLOW = 0.5;                       // slow-motion factor for the endless bounce
  if (!reduceMotion) engine.timing.timeScale = SLOW;
  const world = engine.world;

  let statics = [];
  const balls = [];
  const MAX_BALLS = 34;

  const baseR = () => Math.max(14, Math.min(W, H) * 0.042);
  const clampR = r => Math.max(5, Math.min(r, H * 0.15, W * 0.14));

  function makeBall(x, y, r, kind) {
    r = clampR(r);
    const b = Bodies.circle(x, y, r, reduceMotion
      ? { restitution: 0.55, friction: 0.04, frictionAir: 0.012, density: 0.0016 }
      : { restitution: 0.96, friction: 0, frictionStatic: 0, frictionAir: 0.001, density: 0.0016 });
    b.plugin.vb = 0;      // the bounce speed this ball keeps forever (set on first landing)
    b.plugin.still = 0;   // frames spent nearly motionless
    b.plugin.kind = kind || pick(KINDS);
    Composite.add(world, b);
    balls.push(b);
    if (balls.length > MAX_BALLS) {
      const old = balls.shift();
      Composite.remove(world, old);
    }
    return b;
  }

  function layout() {
    const rect = hero.getBoundingClientRect();
    W = rect.width; H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    statics.forEach(s => Composite.remove(world, s));
    const t = 200;
    const floor = Bodies.rectangle(W / 2, H + t / 2, W * 3, t, { isStatic: true });
    const left  = Bodies.rectangle(-t / 2, H / 2 - H, t, H * 4, { isStatic: true });
    const right = Bodies.rectangle(W + t / 2, H / 2 - H, t, H * 4, { isStatic: true });

    // anchor ball, bottom right, partially off-screen (PDF cover composition)
    const mobile = W < 760;
    const ar = mobile ? W * 0.36 : Math.min(W, H * 1.4) * 0.2;
    const ax = W - ar * (mobile ? 0.55 : 0.5);
    const ay = H - ar * (mobile ? 0.62 : 0.55);
    anchor = Bodies.circle(ax, ay, ar, { isStatic: true, friction: 0.2 });
    anchor.plugin.kind = 'gold';

    statics = [floor, left, right, anchor];
    Composite.add(world, statics);

    // keep balls in bounds after resize
    balls.forEach(b => {
      const r = b.circleRadius;
      if (b.position.x < r || b.position.x > W - r || b.position.y > H - r) {
        Body.setPosition(b, { x: Math.min(Math.max(b.position.x, r), W - r), y: Math.min(b.position.y, H - r * 2) });
        Body.setVelocity(b, { x: 0, y: 0 });
      }
    });

    placeCat();
  }

  /* ---------------- Cat on the anchor ball ---------------- */
  function placeCat() {
    if (!cat || !anchor) return;
    const ar = anchor.circleRadius;
    const { x: ax, y: ay } = anchor.position;
    const ch = Math.min(ar * 1.15, 300) * (300 / 260) * (W < 720 ? 1 : 1.2); // keep the face below the orb on phones
    const cw = ch * (680 / 1120);
    const cx = ax - ar * 0.16;                         // a bit left of the top
    const surfaceY = ay - Math.sqrt(ar * ar - (cx - ax) ** 2);
    Object.assign(cat.style, {
      width: cw + 'px', height: ch + 'px',
      left: (cx - cw / 2) + 'px', top: (surfaceY - ch + ch * 0.015) + 'px',
    });
    if (label) {
      const lr = ar * 1.12;
      Object.assign(label.style, {
        width: lr * 2 + 'px', height: lr * 2 + 'px',
        left: (ax - lr) + 'px', top: (ay - lr) + 'px',
      });
      label.querySelector('text').style.fontSize = (17 * 200 / (lr * 2)) + 'px';
      label.style.transform = 'rotate(14deg)';
    }
  }

  function placeCatFallback() {
    const rect = hero.getBoundingClientRect();
    W = rect.width; H = rect.height;
    const ar = Math.min(W, H) * 0.22;
    anchor = { circleRadius: ar, position: { x: W - ar * 0.5, y: H - ar * 0.55 } };
    placeCat();
    hero.style.setProperty('--fallback', '1');
  }

  /* ---------------- Drawing ---------------- */
  function sphere(x, y, r, kind) {
    // broad, diffuse light from the upper right; wide falloff keeps it chalky
    const g = ctx.createRadialGradient(x + r * 0.35, y - r * 0.4, 0, x + r * 0.15, y - r * 0.15, r * 1.45);
    PAL[kind].forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // soft shade on the lower left so it still reads as round
    const s = ctx.createRadialGradient(x - r * 0.5, y + r * 0.55, 0, x - r * 0.5, y + r * 0.55, r * 1.2);
    s.addColorStop(0, 'rgba(45,58,70,.18)');
    s.addColorStop(1, 'rgba(45,58,70,0)');
    ctx.fillStyle = s;
    ctx.fill();
  }

  function shadow(x, r) {
    // soft contact shadow on the "studio floor"
    const g = ctx.createRadialGradient(x - r * 0.3, H, 0, x - r * 0.3, H, r * 1.4);
    g.addColorStop(0, 'rgba(31,45,58,.28)');
    g.addColorStop(1, 'rgba(31,45,58,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x - r * 0.3, H, r * 1.4, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const b of balls) {
      const gap = H - (b.position.y + b.circleRadius);
      if (gap < b.circleRadius * 1.5) {
        ctx.globalAlpha = Math.max(0, 1 - gap / (b.circleRadius * 1.5));
        shadow(b.position.x, b.circleRadius);
        ctx.globalAlpha = 1;
      }
    }
    sphere(anchor.position.x, anchor.position.y, anchor.circleRadius, 'gold');
    for (const b of balls) sphere(b.position.x, b.position.y, b.circleRadius, b.plugin.kind);
  }

  /* ---------------- Pointer: push, grab & throw, click to drop ---------------- */
  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0 };
  let drag = null, dragMoved = false;

  const local = e => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  hero.addEventListener('pointermove', e => {
    const p = local(e);
    const now = performance.now();
    const dt = Math.max(8, now - pointer.t);
    pointer.vx = (p.x - pointer.x) / dt; pointer.vy = (p.y - pointer.y) / dt;
    pointer.x = p.x; pointer.y = p.y; pointer.t = now;

    if (drag) { drag.pointA = p; dragMoved = true; return; }

    const over = Query.point(balls, p).length > 0;
    hero.style.cursor = over ? 'grab' : '';

    // push balls away from the cursor, with a bit of the cursor's momentum
    if (Math.abs(pointer.vx) > 3 || Math.abs(pointer.vy) > 3) return; // ignore jumps
    for (const b of balls) {
      const dx = b.position.x - p.x, dy = b.position.y - p.y;
      const reach = b.circleRadius + 60;
      const d = Math.hypot(dx, dy);
      if (d < reach && d > 0.01) {
        const k = (1 - d / reach) * 0.0022 * b.mass;
        Body.applyForce(b, b.position, {
          x: (dx / d) * k + pointer.vx * 0.0016 * b.mass,
          y: (dy / d) * k + pointer.vy * 0.0016 * b.mass - 0.0006 * b.mass,
        });
      }
    }
  });

  hero.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });

  hero.addEventListener('pointerdown', e => {
    if (e.target.closest('a, button')) return;
    const p = local(e);
    const hit = Query.point(balls, p)[0];
    dragMoved = false;
    if (!hit) return;
    drag = Constraint.create({
      pointA: p, bodyB: hit,
      pointB: { x: p.x - hit.position.x, y: p.y - hit.position.y },
      stiffness: 0.18, damping: 0.08, length: 0,
    });
    Composite.add(world, drag);
    hero.setPointerCapture?.(e.pointerId);
    hero.style.cursor = 'grabbing';
  });

  const release = () => {
    if (!drag) return;
    Composite.remove(world, drag);
    drag = null;
    hero.style.cursor = '';
    setTimeout(() => { dragMoved = false; }, 0);
  };
  hero.addEventListener('pointerup', release);
  hero.addEventListener('pointercancel', release);

  hero.addEventListener('click', e => {
    if (e.target.closest('a, button') || dragMoved) return;
    const p = local(e);
    if (Query.point(balls, p).length || Query.point([anchor], p).length) return;
    const b = makeBall(p.x, Math.min(p.y, H - 80), baseR() * sizeFactor());
    Body.setVelocity(b, { x: rand(-2, 2), y: 2 });
  });

  document.getElementById('dropBall')?.addEventListener('click', () => {
    const r = baseR() * sizeFactor();
    makeBall(rand(r, W * 0.7), -r, r);
  });

  /* ---------------- Initial rain ---------------- */
  function rain() {
    const n = W < 760 ? 13 : 20;
    // always include a couple of giants and plenty of pebbles, then random for the rest
    const plan = [4, 3, 0, 0, 0, 1, 1, 2, 0];
    if (W >= 760) plan.push(0, 1, 2);
    for (let i = 0; i < n; i++) {
      const r = baseR() * sizeFactor(plan[i]);
      const x = rand(r, W - r);
      if (reduceMotion) {
        makeBall(x, rand(-H, 0), r);
      } else {
        setTimeout(() => makeBall(x, -r - rand(0, 160), r), 200 + Math.random() * 1600);
      }
    }
    if (reduceMotion) for (let i = 0; i < 400; i++) Engine.update(engine, 1000 / 60);
  }

  /* ---------------- Endless slow bounce ---------------- */
  if (!reduceMotion) {
    Matter.Events.on(engine, 'beforeUpdate', () => {
      for (const b of balls) b.plugin.pvy = b.velocity.y;
    });
    Matter.Events.on(engine, 'afterUpdate', () => {
      const held = drag && drag.bodyB;
      for (const b of balls) {
        if (b === held) { b.plugin.still = 0; continue; }
        const r = b.circleRadius;
        const onFloor = b.position.y + r >= H - 2;
        // first landing: remember a bounce speed (a bit lower than the drop, for calm motion)
        if (onFloor && !b.plugin.vb && b.plugin.pvy > 1) {
          b.plugin.vb = Math.min(b.plugin.pvy * rand(0.45, 0.72), 18);
        }
        // every landing: send it back up with the same speed, so it never dies out
        if (onFloor && b.plugin.vb && b.velocity.y > -b.plugin.vb * 0.9) {
          Body.setVelocity(b, { x: b.velocity.x, y: -b.plugin.vb });
        }
        // gently calm sideways drift so the pile doesn't skate around forever
        if (Math.abs(b.velocity.x) > 0.02) Body.setVelocity(b, { x: b.velocity.x * 0.996, y: b.velocity.y });
        // stuck on top of another ball? give it a nudge
        const speed = Math.hypot(b.velocity.x, b.velocity.y);
        b.plugin.still = speed < 0.15 ? b.plugin.still + 1 : 0;
        if (b.plugin.still > 90) {
          b.plugin.still = 0;
          Body.setVelocity(b, { x: rand(-1.2, 1.2), y: -(b.plugin.vb || 6) * 0.7 });
        }
      }
    });
  }

  /* ---------------- Loop (paused when the hero is off-screen) ---------------- */
  let running = false, raf = 0;
  function frame() {
    Engine.update(engine, 1000 / 60);
    draw();
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0 }).observe(hero);

  let rt;
  const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { layout(); draw(); }, 80); });

  layout();
  rain();
  draw();
  ro.observe(hero);
  trackEyes();

  /* ---------------- Cat: eyes, lean, blink ---------------- */
  function trackEyes() {
    if (!cat) return;
    const body = cat.querySelector('.cat-body');
    const eyes = [...cat.querySelectorAll('.iris')].map(el => ({
      el, x: +el.dataset.x, y: +el.dataset.y, ox: 0, oy: 0, tx: 0, ty: 0,
    }));
    const lids = [...cat.querySelectorAll('.lid')];
    const MAX_X = 9, MAX_Y = 7, REACH = 260;   // in cat image pixels
    let px = null, py = null, lastMove = -1e9, wanderAt = 0;

    function aim() {
      const m = cat.getScreenCTM();
      if (!m || px === null) return;
      const p = new DOMPoint(px, py).matrixTransform(m.inverse());
      eyes.forEach(e => {
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
        const k = Math.min(d / REACH, 1);
        e.tx = dx / d * k * MAX_X; e.ty = dy / d * k * MAX_Y;
      });
      if (!reduceMotion) {
        const b = cat.getBoundingClientRect();
        const lean = Math.max(-3, Math.min(3, (px - (b.left + b.width / 2)) / innerWidth * 8));
        body.style.transform = `rotate(${lean}deg)`;
      }
    }
    const onPointer = ev => { px = ev.clientX; py = ev.clientY; lastMove = performance.now(); aim(); };
    addEventListener('pointermove', onPointer, { passive: true });
    addEventListener('pointerdown', onPointer, { passive: true });
    addEventListener('scroll', aim, { passive: true });

    // when nobody moves for a while (e.g. on phones), glance around
    function tick(now) {
      if (now - lastMove > 3500 && !reduceMotion && now > wanderAt) {
        wanderAt = now + rand(1200, 3400);
        const a = Math.random() * Math.PI * 2, k = Math.random() < 0.35 ? 0 : rand(0.5, 1);
        eyes.forEach(e => { e.tx = Math.cos(a) * MAX_X * k; e.ty = Math.sin(a) * MAX_Y * k; });
        body.style.transform = 'rotate(0deg)';
      }
      eyes.forEach(e => {
        e.ox += (e.tx - e.ox) * 0.18; e.oy += (e.ty - e.oy) * 0.18;
        e.el.setAttribute('x', (e.x + e.ox).toFixed(2));
        e.el.setAttribute('y', (e.y + e.oy).toFixed(2));
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // blink: the closed-eye artwork wipes down over each eye and back up
    let blinking = false;
    function blink(twice) {
      if (blinking) return; blinking = true;
      const dur = 170, t0 = performance.now();
      (function step(t) {
        const p = Math.min((t - t0) / dur, 1);
        const v = p < 0.45 ? p / 0.45 : p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
        const s = v * v * (3 - 2 * v);
        lids.forEach(r => r.setAttribute('height', (+r.dataset.h * s).toFixed(1)));
        if (p < 1) requestAnimationFrame(step);
        else { blinking = false; if (twice) setTimeout(() => blink(false), 120); }
      })(t0);
    }
    (function schedule() {
      setTimeout(() => { blink(Math.random() < 0.2); schedule(); }, rand(2200, 5400));
    })();
  }
})();
