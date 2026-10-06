(function () {
  var root = document.documentElement;

  /* ---------- CV: the PDF is embedded above, so the buttons work even when this file is opened on its own ---------- */
  try {
    var b64 = document.getElementById('cv-data').textContent.trim();
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var cvUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    Array.prototype.forEach.call(document.querySelectorAll('a[href="assets/cv.pdf"]'), function (a) { a.href = cvUrl; });
  } catch (e) {}

  /* ---------- Light / dark (dark is the default) ---------- */
  var toggle = document.getElementById('theme-toggle');
  function currentTheme() { return root.getAttribute('data-theme') || 'dark'; }
  function labelToggle() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    toggle.textContent = next === 'dark' ? 'Dark' : 'Light';
    toggle.setAttribute('aria-label', 'Switch to ' + next + ' mode');
  }
  labelToggle();
  toggle.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    labelToggle();
  });

  /* ---------- Mobile menu ---------- */
  var navToggle = document.getElementById('nav-toggle');
  var navLinks = document.getElementById('nav-links');
  function closeMenu() {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.textContent = 'Menu';
  }
  navToggle.addEventListener('click', function () {
    var open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.textContent = open ? 'Close' : 'Menu';
  });
  navLinks.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });

  /* ---------- Highlight the section in view ---------- */
  var links = Array.prototype.slice.call(navLinks.querySelectorAll('a[href^="#"]'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute('href') === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Copy email ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      function done() {
        var old = btn.textContent;
        btn.textContent = 'Copied';
        btn.setAttribute('data-done', 'true');
        setTimeout(function () { btn.textContent = old; btn.removeAttribute('data-done'); }, 1600);
      }
      function fallback() { window.prompt('Copy this address:', text); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
  });

  /* ---------- Lightbox: click an image to see it full size ---------- */
  var box = document.getElementById('lightbox');
  var boxImg = box.querySelector('img');
  var closeBtn = box.querySelector('.lightbox-close');
  var lastFocus = null;
  function openBox(img) {
    boxImg.src = img.src; boxImg.alt = img.alt;
    box.querySelector('.lightbox-cap').textContent = img.alt;
    box.hidden = false; lastFocus = document.activeElement; closeBtn.focus();
    document.body.style.overflow = 'hidden';
  }
  function closeBox() {
    box.hidden = true; boxImg.src = ''; document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-lightbox]'), function (btn) {
    btn.addEventListener('click', function () { var img = btn.querySelector('img'); if (img) openBox(img); });
  });
  /* ---------- Animated figures: play when scrolled into view, replay on demand ---------- */
  function playAnim(el) { el.classList.remove('animate'); void el.offsetWidth; el.classList.add('animate'); el.setAttribute('data-played', '1'); }
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var anims = Array.prototype.slice.call(document.querySelectorAll('.anim'));
  function isCollapsed(el) { var e = el.closest('.entry'); return e && !e.classList.contains('open'); }
  var ao = null;
  if ('IntersectionObserver' in window && !reduceMotion) {
    ao = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !isCollapsed(entry.target)) { playAnim(entry.target); ao.unobserve(entry.target); }
      });
    }, { threshold: 0.35 });
    anims.forEach(function (el) { ao.observe(el); });
  }

  /* ---------- Research and teaching cards: click to expand ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.entry-head'), function (head) {
    var entry = head.closest('.entry');
    head.addEventListener('click', function () {
      var open = entry.classList.toggle('open');
      head.setAttribute('aria-expanded', String(open));
      if (open && !reduceMotion) {
        var fig = entry.querySelector('.anim');
        if (fig && !fig.getAttribute('data-played')) setTimeout(function () { playAnim(fig); if (ao) ao.unobserve(fig); }, 420);
      }
    });
  });
  try {
    var target = location.hash.length > 1 ? document.querySelector(location.hash) : null;
    var ent = target && target.closest('.entry');
    if (ent && !ent.classList.contains('open')) ent.querySelector('.entry-head').click();
  } catch (e) {}

  /* ---------- Background: a slowly drifting reservoir network with signals travelling along its links ---------- */
  (function () {
    var canvas = document.getElementById('bg');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, nodes = [], signals = [], colors = {}, raf = null, last = 0;
    var mouse = { x: -1e4, y: -1e4 };
    function readColors() {
      var cs = getComputedStyle(root);
      var light = root.getAttribute('data-theme') === 'light';
      colors = { node: cs.getPropertyValue('--cyan').trim() || '#3fd3e6', signal: cs.getPropertyValue('--amber').trim() || '#f2b64d',
                 link: light ? '16, 38, 69' : '150, 190, 240', nodeAlpha: light ? 0.35 : 0.42, linkAlpha: light ? 0.07 : 0.11 };
    }
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var want = Math.max(24, Math.min(64, Math.round(W * H / 30000)));
      while (nodes.length < want) nodes.push(makeNode(true));
      nodes.length = want;
      if (reduceMotion) draw(0);
    }
    function makeNode(anywhere) {
      var a = Math.random() * Math.PI * 2, s = 0.03 + Math.random() * 0.09;
      return { x: Math.random() * W, y: anywhere ? Math.random() * H : Math.random() * H, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
               r: 0.9 + Math.random() * 1.1, ph: Math.random() * Math.PI * 2 };
    }
    var LINK = 140;
    function draw(dt) {
      ctx.clearRect(0, 0, W, H);
      var i, j, n = nodes.length, a, b, d, dx, dy;
      ctx.lineWidth = 1;
      for (i = 0; i < n; i++) {
        a = nodes[i];
        if (!reduceMotion) {
          a.x += a.vx * dt; a.y += a.vy * dt;
          if (a.x < -20) a.x = W + 20; else if (a.x > W + 20) a.x = -20;
          if (a.y < -20) a.y = H + 20; else if (a.y > H + 20) a.y = -20;
        }
      }
      for (i = 0; i < n; i++) {
        a = nodes[i];
        for (j = i + 1; j < n; j++) {
          b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d = dx * dx + dy * dy;
          if (d < LINK * LINK) {
            d = Math.sqrt(d);
            var mx = (a.x + b.x) / 2 - mouse.x, my = (a.y + b.y) / 2 - mouse.y, near = Math.max(0, 1 - Math.sqrt(mx * mx + my * my) / 220);
            ctx.strokeStyle = 'rgba(' + colors.link + ',' + ((1 - d / LINK) * colors.linkAlpha * (1 + 2.5 * near)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (i = 0; i < n; i++) {
        a = nodes[i];
        dx = a.x - mouse.x; dy = a.y - mouse.y;
        var nearN = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 180);
        var tw = 0.75 + 0.25 * Math.sin(a.ph + last / 900);
        ctx.globalAlpha = Math.min(1, colors.nodeAlpha * tw + nearN * 0.5);
        ctx.fillStyle = colors.node;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r + nearN * 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // signals: bright dots that run along a link, like an input working its way through a reservoir
      for (i = signals.length - 1; i >= 0; i--) {
        var s = signals[i]; s.t += dt / s.dur;
        if (s.t >= 1) { signals.splice(i, 1); continue; }
        a = s.a; b = s.b; dx = b.x - a.x; dy = b.y - a.y;
        if (dx * dx + dy * dy > LINK * LINK * 1.3) { signals.splice(i, 1); continue; }
        var x = a.x + dx * s.t, y = a.y + dy * s.t, fade = Math.sin(Math.PI * s.t);
        ctx.strokeStyle = colors.signal; ctx.globalAlpha = 0.25 * fade; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x + dx * Math.max(0, s.t - 0.18), a.y + dy * Math.max(0, s.t - 0.18)); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = colors.signal; ctx.globalAlpha = 0.75 * fade;
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
      }
    }
    function spawn() {
      if (signals.length >= 3 || nodes.length < 2) return;
      for (var tries = 0; tries < 12; tries++) {
        var a = nodes[Math.floor(Math.random() * nodes.length)], b = nodes[Math.floor(Math.random() * nodes.length)];
        var dx = a.x - b.x, dy = a.y - b.y;
        if (a !== b && dx * dx + dy * dy < LINK * LINK) { signals.push({ a: a, b: b, t: 0, dur: 900 + Math.random() * 700 }); return; }
      }
    }
    var nextSpawn = 0;
    function frame(t) {
      var dt = last ? Math.min(t - last, 50) : 16; last = t;
      if (t > nextSpawn) { spawn(); nextSpawn = t + 1200 + Math.random() * 1600; }
      draw(dt);
      raf = requestAnimationFrame(frame);
    }
    readColors(); resize();
    window.addEventListener('resize', function () { clearTimeout(resize._t); resize._t = setTimeout(resize, 150); });
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener('pointerleave', function () { mouse.x = -1e4; mouse.y = -1e4; });
    toggle.addEventListener('click', function () { readColors(); if (reduceMotion) draw(0); });
    if (!reduceMotion) {
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { cancelAnimationFrame(raf); raf = null; last = 0; }
        else if (!raf) raf = requestAnimationFrame(frame);
      });
      raf = requestAnimationFrame(frame);
    }
  })();
  Array.prototype.forEach.call(document.querySelectorAll('[data-replay]'), function (btn) {
    btn.addEventListener('click', function () {
      var el = document.getElementById(btn.getAttribute('data-replay'));
      if (el) playAnim(el);
      btn.classList.remove('replaying'); void btn.offsetWidth; btn.classList.add('replaying');
    });
  });

  closeBtn.addEventListener('click', closeBox);
  box.addEventListener('click', function (e) { if (e.target === box) closeBox(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (!box.hidden) closeBox(); else closeMenu(); }
  });
})();
