/* August House, 211 Folk Street. One plain deferred file, no build step. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = t => t * t * (3 - 2 * t);
  const out = t => 1 - Math.pow(1 - t, 3);
  const STORE_SEAT = $('.bar__cta').href;

  /* ------------------------------------------------------------------
     Hours. Tuesday to Saturday, 10:30 to 4:30, on Edgefield's clock.
     The plate on the door, the board and the note inside all read it.
     ------------------------------------------------------------------ */
  const OPENS = 10 * 60 + 30, SHUTS = 16 * 60 + 30;
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const isOpenDay = d => d >= 2 && d <= 6;

  function shopClock() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = type => parts.find(p => p.type === type).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, min: (+get('hour') % 24) * 60 + +get('minute') };
  }

  function shopStatus() {
    const { day, min } = shopClock();
    if (isOpenDay(day) && min >= OPENS && min < SHUTS) return { open: true, line: 'Open now until 4:30', board: 'Open now, come on in' };
    if (isOpenDay(day) && min < OPENS) return { open: false, line: 'Opens today at 10:30', board: 'Opens today, 10:30' };
    let d = day, n = 0;
    do { d = (d + 1) % 7; n += 1; } while (!isOpenDay(d));
    const when = n === 1 ? 'tomorrow' : DAYS[d];
    return { open: false, line: `Closed now. Opens ${when} at 10:30`, board: `Opens ${when}, 10:30` };
  }

  function paintStatus() {
    let s;
    try { s = shopStatus(); } catch (e) { return; }
    $('#plate-word').textContent = s.open ? 'Open' : 'Closed';
    $('#plate-full').textContent = `${s.line}. Come in and see the shop.`;
    $('#today-line').textContent = s.line;
    $('#board-open').textContent = s.board;
  }
  paintStatus();
  setInterval(paintStatus, 60000);

  /* ------------------------------------------------------------------
     Walking in. The front pins, the door swings on its hinge and the
     camera goes through the doorway into the photograph of the room.
     ------------------------------------------------------------------ */
  const front = $('.front'), pin = $('.front__pin'), stage = $('#stage'), leaf = $('#leaf');
  const doorway = $('.doorway'), hole = $('.doorway__hole'), lettering = $('.lettering');
  const roomPhoto = $('.room__photo'), note = $('.room__note');
  const bar = $('#bar'), dock = $('.dock');
  const canMask = window.CSS && (CSS.supports('mask-composite', 'exclude') || CSS.supports('-webkit-mask-composite', 'xor'));
  let walk = false, door = null, ticking = false;

  function measureFront() {
    const on = !reduce.matches && canMask && innerHeight >= 520;
    if (on !== walk) {
      walk = on;
      root.classList.toggle('walkin', on);
      if (!on) {
        [stage, leaf, lettering, roomPhoto, note].forEach(el => { el.style.cssText = ''; });
        stage.classList.remove('is-through');
        leaf.classList.remove('is-moving');
      }
    }
    if (walk) {
      const vh = pin.clientHeight, vw = pin.clientWidth;
      const dw = hole.offsetWidth, dh = hole.offsetHeight;
      door = { vh, vw, cy: doorway.offsetTop + hole.offsetTop + dh / 2, end: Math.max(vw / dw, vh / dh) * 1.08, travel: front.offsetHeight - vh };
    }
    frame();
  }

  function frame() {
    ticking = false;
    const y = window.scrollY;
    if (!walk || !door) {
      bar.classList.toggle('bar--solid', y > 24);
      if (dock) dock.classList.toggle('is-on', y > front.offsetHeight * 0.6 && !dockHold);
      return;
    }
    const p = clamp((y - front.offsetTop) / door.travel);
    const swing = out(clamp(p / 0.26));
    const z = smooth(clamp((p - 0.06) / 0.8));
    const scale = Math.pow(door.end, z);
    stage.style.transform = `translate3d(0, ${((door.vh / 2 - door.cy) * z).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    if (p > 0.001) {
      leaf.classList.add('is-moving');
      leaf.style.transform = `rotateY(${(-86 * swing).toFixed(2)}deg)`;
    } else {
      leaf.classList.remove('is-moving');
      leaf.style.transform = '';
    }
    lettering.style.opacity = (1 - clamp((p - 0.04) / 0.2)).toFixed(3);
    stage.style.setProperty('--props', (1 - clamp((p - 0.1) / 0.22)).toFixed(3));
    roomPhoto.style.transform = `translate3d(0, ${(13 * (1 - z)).toFixed(2)}%, 0) scale(${(1.3 - 0.3 * z).toFixed(4)})`;
    const n = out(clamp((p - 0.84) / 0.13));
    note.style.opacity = n.toFixed(3);
    note.style.visibility = n > 0 ? 'visible' : 'hidden';
    note.style.transform = `translate3d(0, ${((1 - n) * 18).toFixed(1)}px, 0)`;
    stage.classList.toggle('is-through', p > 0.9);
    bar.classList.toggle('bar--solid', p > 0.5);
    /* the phone bar waits until the room has begun to scroll away, so it never lands on the note */
    if (dock) dock.classList.toggle('is-on', y > front.offsetTop + door.travel + door.vh * 0.35 && !dockHold);
  }

  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { clearTimeout(measureFront.t); measureFront.t = setTimeout(measureFront, 120); });
  reduce.addEventListener('change', measureFront);

  /* a slow walk, so the door has time to swing */
  function glideTo(target, ms) {
    const from = window.scrollY, dist = target - from, t0 = performance.now();
    root.style.scrollBehavior = 'auto';
    const step = now => {
      const t = clamp((now - t0) / ms);
      window.scrollTo(0, from + dist * (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2));
      if (t < 1) requestAnimationFrame(step); else root.style.scrollBehavior = '';
    };
    requestAnimationFrame(step);
  }
  leaf.addEventListener('click', e => {
    if (!walk || !door) return;
    e.preventDefault();
    glideTo(front.offsetTop + door.travel, 2600);
  });

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a === leaf || e.defaultPrevented) return;
    const to = document.getElementById(a.getAttribute('href').slice(1));
    if (!to) return;
    e.preventDefault();
    const y = to.id === 'top' ? 0 : to.getBoundingClientRect().top + scrollY - (bar.offsetHeight + 12);
    window.scrollTo({ top: y, behavior: reduce.matches ? 'auto' : 'smooth' });
    history.replaceState(null, '', '#' + to.id);
    if (!to.hasAttribute('tabindex')) to.setAttribute('tabindex', '-1');
    to.focus({ preventScroll: true });
  });

  /* the phone bar steps aside wherever its own action is already on screen */
  let dockHold = false;
  if (dock && 'IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); });
      dockHold = seen.size > 0;
      onScroll();
    }, { threshold: 0.6 });
    $$('.bill .btn, .close__go .btn--brass').forEach(el => io.observe(el));
  }

  /* the bar underlines the section you are in */
  if ('IntersectionObserver' in window) {
    const links = new Map($$('.bar__nav a').map(a => [a.getAttribute('href').slice(1), a]));
    const here = new IntersectionObserver(entries => entries.forEach(en => {
      const a = links.get(en.target.id === 'firing' ? 'pottery' : en.target.id);
      if (!a) return;
      if (en.isIntersecting) { links.forEach(l => l.removeAttribute('aria-current')); a.setAttribute('aria-current', 'true'); }
      else if (a.hasAttribute('aria-current') && !en.target.matches('#pottery, #firing')) a.removeAttribute('aria-current');
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['pottery', 'firing', 'workshops', 'shop', 'visit'].forEach(id => here.observe(document.getElementById(id)));
  }

  /* ------------------------------------------------------------------
     Menu, on small screens
     ------------------------------------------------------------------ */
  const menu = $('#menu'), menuBtn = $('.bar__menu');
  const setMenu = open => {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) bar.classList.add('bar--solid'); else onScroll();
  };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  /* ------------------------------------------------------------------
     A picture changes in one piece: the next one is decoded first
     ------------------------------------------------------------------ */
  function swap(img, src, alt, srcset) {
    if (img.getAttribute('src') === src) { img.alt = alt; return; }
    const token = (img._t = (img._t || 0) + 1);
    const next = new Image();
    if (srcset) { next.sizes = img.sizes; next.srcset = srcset; }
    next.src = src;
    img.classList.add('is-out');
    const done = () => {
      if (img._t !== token) return;
      if (srcset) img.srcset = srcset; else img.removeAttribute('srcset');
      img.src = src;
      img.alt = alt;
      requestAnimationFrame(() => requestAnimationFrame(() => img.classList.remove('is-out')));
    };
    if (next.decode) next.decode().then(done, done); else next.onload = next.onerror = done;
  }

  const narrow = matchMedia('(max-width: 600px)');

  /* ------------------------------------------------------------------
     The shelves. Every piece answers; the card for the one picked
     sits under the shelf it came off.
     ------------------------------------------------------------------ */
  const piece = $('#piece'), pieceImg = $('#piece-img'), pieceDraw = $('#piece-draw');
  const tiles = $$('.tile');

  function showPiece(tile) {
    const d = tile.dataset;
    tiles.forEach(t => { const on = t === tile; t.classList.toggle('is-on', on); if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    $('#piece-name').textContent = d.name;
    $('#piece-price').textContent = d.price;
    $('#piece-state').textContent = d.state;
    $('#piece-desc').textContent = d.desc;
    const buy = $('#piece-buy');
    buy.textContent = d.cta;
    buy.href = d.ctaHref || tile.href;
    pieceDraw.toggleAttribute('hidden', !d.draw);
    pieceImg.hidden = !!d.draw;
    if (!d.draw) swap(pieceImg, `assets/img/${d.img}-400.webp`, d.alt, `assets/img/${d.img}-400.webp 400w, assets/img/${d.img}-800.webp 800w`);
    /* the card moves under this shelf; the page is held still around the piece that was touched */
    const shelf = tile.closest('.shelf');
    if (piece.previousElementSibling !== shelf) {
      const was = tile.getBoundingClientRect().top;
      shelf.after(piece);
      const drift = tile.getBoundingClientRect().top - was;
      if (drift) window.scrollBy(0, drift);
    }
    requestAnimationFrame(() => {
      const r = piece.getBoundingClientRect(), top = bar.offsetHeight + 12, foot = innerHeight - (narrow.matches ? 72 : 14);
      const dy = r.top < top ? r.top - top : r.bottom > foot ? Math.min(r.top - top, r.bottom - foot) : 0;
      if (Math.abs(dy) > 1) window.scrollBy({ top: dy, behavior: reduce.matches ? 'auto' : 'smooth' });
    });
  }
  tiles.forEach(tile => {
    tile.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      showPiece(tile);
    });
  });

  /* ------------------------------------------------------------------
     Five steps. The one you touch opens.
     ------------------------------------------------------------------ */
  const steps = $$('.step');
  const openStep = li => steps.forEach(s => { const on = s === li; s.classList.toggle('is-on', on); $('.step__btn', s).setAttribute('aria-expanded', String(on)); });
  steps.forEach(li => {
    const btn = $('.step__btn', li);
    btn.addEventListener('click', () => openStep(li));
    btn.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !narrow.matches) openStep(li); });
    btn.addEventListener('focus', () => { if (!narrow.matches) openStep(li); });
  });

  /* ------------------------------------------------------------------
     What the table has made
     ------------------------------------------------------------------ */
  const made = $('.made'), madeView = $('#made-view'), madeImg = $('#made-img'), madeAsk = $('#made-ask');
  const rows = $$('.row');
  const askPiece = $('#ask-piece');

  function showRow(row, byHand) {
    const d = row.dataset;
    rows.forEach(r => { const on = r === row; r.classList.toggle('is-on', on); r.setAttribute('aria-pressed', String(on)); });
    swap(madeImg, `assets/img/${d.img}-720.webp`, d.alt);
    $('#made-when').textContent = d.when;
    const upcoming = d.when.startsWith('Next');
    madeAsk.textContent = upcoming ? 'Reserve a seat' : 'Request this workshop';
    madeAsk.href = upcoming ? STORE_SEAT : '#group';
    madeAsk.className = upcoming ? 'btn btn--brass' : 'btn btn--line';
    madeAsk.dataset.piece = d.piece;
    if (byHand && narrow.matches) row.parentElement.appendChild(madeView);
  }
  rows.forEach(row => row.addEventListener('click', () => showRow(row, true)));
  showRow(rows[0], false);
  narrow.addEventListener('change', () => { if (!narrow.matches) made.appendChild(madeView); });
  madeAsk.addEventListener('click', () => {
    if (madeAsk.getAttribute('href') !== '#group') return;
    const opt = [...askPiece.options].find(o => o.textContent === madeAsk.dataset.piece);
    if (opt) { askPiece.value = opt.value; sumUp(); }
  });

  /* ------------------------------------------------------------------
     A group asks for the table
     ------------------------------------------------------------------ */
  const ask = $('#ask'), count = $('#ask-count'), sum = $('#ask-sum'), nameField = $('#ask-name'), nameErr = $('#ask-name-err');
  const money = (n, cents) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  const after = () => ask.elements.Time.value === 'After hours';

  function sumUp() {
    const min = after() ? 6 : 4;
    count.min = min;
    let n = Math.round(+count.value) || min;
    n = clamp(n, min, 12);
    count.value = n;
    const opt = askPiece.selectedOptions[0], price = +opt.dataset.price || 0;
    sum.textContent = price
      ? `${n} seats at ${money(price, true)} each${'now' in opt.dataset ? '' : ', the price last time,'} come to about ${money(Math.round(n * price))}.`
      : `Tell us what you'd like to make and we'll price it for ${n}.`;
  }
  $('#ask-less').addEventListener('click', () => { count.value = +count.value - 1; sumUp(); });
  $('#ask-more').addEventListener('click', () => { count.value = +count.value + 1; sumUp(); });
  ask.addEventListener('change', sumUp);
  sumUp();

  ask.addEventListener('submit', e => {
    e.preventDefault();
    const who = nameField.value.trim();
    nameErr.hidden = !!who;
    if (who) { nameField.removeAttribute('aria-invalid'); nameField.removeAttribute('aria-describedby'); }
    else { nameField.setAttribute('aria-invalid', 'true'); nameField.setAttribute('aria-describedby', 'ask-name-err'); nameField.focus(); return; }
    const day = $('#ask-date').value;
    const dayText = day ? new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'No day picked yet';
    const phone = $('#ask-phone').value.trim();
    const body = [
      'Hello August House,', '',
      'I would like to book a workshop for my group.', '',
      `Piece: ${askPiece.value}`, `People: ${count.value}`, `Time: ${ask.elements.Time.value}`, `Day: ${dayText}`, `Name: ${who}`, `Phone: ${phone || 'not given'}`, '',
      'Thank you.'
    ].join('\n');
    location.href = `mailto:augustandhouse@outlook.com?subject=${encodeURIComponent(`Workshop request: ${askPiece.value}, ${count.value} people`)}&body=${encodeURIComponent(body)}`;
    $('#ask-sent').hidden = false;
  });

  /* ------------------------------------------------------------------
     The rack slides
     ------------------------------------------------------------------ */
  const rail = $('#rail'), prev = $('#rail-prev'), next = $('#rail-next');
  /* one press turns a whole rackful, so what comes to rest is always whole photographs */
  const hung = $$('.rail__row li', rail), railCount = $('#rail-count');
  const railGap = () => parseFloat(getComputedStyle($('.rail__row', rail)).columnGap || 16);
  const railStep = () => rail.clientWidth + railGap();
  const railEnds = () => {
    prev.disabled = rail.scrollLeft < 8;
    next.disabled = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 8;
    const one = hung[0].offsetWidth + railGap(), per = Math.max(1, Math.round(railStep() / one));
    const first = clamp(Math.round(rail.scrollLeft / one) + 1, 1, hung.length), last = Math.min(hung.length, first + per - 1);
    const text = `${first} to ${last} of ${hung.length}`;
    if (railCount.textContent !== text) railCount.textContent = text;
  };
  prev.addEventListener('click', () => rail.scrollBy({ left: -railStep(), behavior: reduce.matches ? 'auto' : 'smooth' }));
  next.addEventListener('click', () => rail.scrollBy({ left: railStep(), behavior: reduce.matches ? 'auto' : 'smooth' }));
  rail.addEventListener('scroll', railEnds, { passive: true });
  addEventListener('resize', railEnds);
  railEnds();

  /* the four lines under the rack: each turns the rack to its own photograph */
  const notes = $$('.note');
  notes.forEach(btn => btn.addEventListener('click', () => {
    const li = hung.find(x => x.dataset.photo === btn.dataset.photo);
    if (!li) return;
    const per = Math.max(1, Math.round(railStep() / (hung[0].offsetWidth + railGap())));
    const lead = hung[Math.floor(hung.indexOf(li) / per) * per];
    hung.forEach(x => x.classList.toggle('is-shown', x === li));
    notes.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    $$('img', rail).forEach(img => { img.loading = 'eager'; });
    rail.scrollTo({ left: lead.offsetLeft, behavior: reduce.matches ? 'auto' : 'smooth' });
    const top = rail.getBoundingClientRect().top - bar.offsetHeight - 16;
    if (top < 0) window.scrollBy({ top, behavior: reduce.matches ? 'auto' : 'smooth' });
  }));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries, io) => {
      if (!entries.some(en => en.isIntersecting)) return;
      io.disconnect();
      $$('img', rail).forEach(img => { img.loading = 'eager'; });
    }, { rootMargin: '900px 0px' }).observe(rail);
  }
  let drag = null;
  rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; drag = { x: e.clientX, left: rail.scrollLeft, moved: false }; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; rail.classList.add('is-drag'); }
    if (drag.moved) rail.scrollLeft = drag.left - dx;
  });
  addEventListener('pointerup', () => { if (drag) { rail.classList.remove('is-drag'); drag = null; } });

  /* ------------------------------------------------------------------
     The walk on the map, and photographs that arrive whole
     ------------------------------------------------------------------ */
  const map = $('#map');
  const frames = $$('.frame');
  if ('IntersectionObserver' in window && !reduce.matches) {
    map.classList.add('is-wait');
    new IntersectionObserver((entries, io) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      map.classList.remove('is-wait');
      map.classList.add('is-go');
      setTimeout(() => { map.classList.remove('is-go'); map.classList.add('is-done'); }, 2100);
    }, { threshold: 0.45 }).observe(map);

    const arrive = el => el.classList.remove('is-wait');
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const img = $('img', en.target);
      const ready = img.complete && img.naturalWidth ? Promise.resolve() : new Promise(res => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); });
      Promise.race([ready.then(() => (img.decode ? img.decode().catch(() => {}) : null)), new Promise(res => setTimeout(res, 2500))]).then(() => arrive(en.target));
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    frames.forEach(el => {
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add('is-wait');
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     Carve an ornament, then fire it.
     One canvas for the piece, one that only remembers where you cut.
     ------------------------------------------------------------------ */
  const cv = $('#carve-canvas');
  if (cv && cv.getContext) {
    const N = 720, ctx = cv.getContext('2d');
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c; };
    const cut = mk(), cctx = cut.getContext('2d'), tmp = mk(), tctx = tmp.getContext('2d');
    const state = $('#carve-state'), fireBtn = $('#carve-fire'), resetBtn = $('#carve-reset'), leafBtn = $('#carve-leaf');
    const TABLE = '#c9ad84';
    const SHAPES = {
      round: { path: new Path2D('M360 122a250 250 0 1 0 0 500 250 250 0 1 0 0-500z'), hole: [360, 176, 13], sprig: [1, 0, 14] },
      heart: { path: new Path2D('M360 624C96 452 78 262 206 184c84-50 142 6 154 62 12-56 70-112 154-62 128 78 110 268-154 440z'), hole: [360, 300, 12], sprig: [.74, 0, 66] },
      tree: { path: new Path2D('M360 84l112 176h-48l100 152h-56l108 160H410v72H310v-72H144l108-160h-56l100-152h-48z'), hole: [360, 176, 11], sprig: [.6, 0, 96] }
    };
    const STOPS = [[0, [164, 112, 79]], [.3, [188, 142, 108]], [.58, [228, 198, 168]], [.8, [236, 226, 208]], [1, [245, 241, 232]]];
    const mix = t => {
      let i = 1;
      while (i < STOPS.length - 1 && t > STOPS[i][0]) i += 1;
      const [t0, a] = STOPS[i - 1], [t1, b] = STOPS[i], k = clamp((t - t0) / (t1 - t0));
      return a.map((v, j) => Math.round(v + (b[j] - v) * k));
    };
    const rgb = (c, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
    const shade = (c, k) => c.map(v => Math.round(v * k));
    let shape = 'round', fired = 0, busy = false, touched = false, last = null, hinted = true;
    /* on a touch screen the clay sleeps until it is tapped, so a thumb passing over it scrolls the page */
    const slab = cv.parentElement, coarse = matchMedia('(pointer: coarse)');
    let live = false, tap = null;
    const RAW = 'Raw clay, straight off the slab roller.', ASLEEP = 'Tap the clay to start, then carve with a finger.';
    const wake = on => { live = on; slab.classList.toggle('is-live', on); };

    function tint(color) {
      tctx.globalCompositeOperation = 'source-over';
      tctx.clearRect(0, 0, N, N);
      tctx.drawImage(cut, 0, 0);
      tctx.globalCompositeOperation = 'source-in';
      tctx.fillStyle = color;
      tctx.fillRect(0, 0, N, N);
      tctx.globalCompositeOperation = 'source-over';
    }

    function render() {
      const s = SHAPES[shape], base = mix(fired), glaze = clamp((fired - .7) / .3);
      ctx.fillStyle = TABLE;
      ctx.fillRect(0, 0, N, N);
      ctx.strokeStyle = 'rgba(90, 60, 30, .10)';
      ctx.lineWidth = 2;
      for (let y = 58; y < N; y += 118) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(N * .3, y - 9, N * .7, y + 9, N, y - 3); ctx.stroke(); }

      ctx.save();
      ctx.shadowColor = 'rgba(64, 36, 16, .38)'; ctx.shadowBlur = 26; ctx.shadowOffsetX = 7; ctx.shadowOffsetY = 14;
      ctx.fillStyle = rgb(base);
      ctx.fill(s.path);
      ctx.restore();

      ctx.save();
      ctx.clip(s.path);
      ctx.fillStyle = rgb(base);
      ctx.fillRect(0, 0, N, N);
      const light = ctx.createRadialGradient(232, 214, 30, 360, 372, 430);
      light.addColorStop(0, `rgba(255, 255, 255, ${(.10 + .2 * glaze).toFixed(3)})`);
      light.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, N, N);
      const dark = ctx.createLinearGradient(0, 380, 0, 700);
      dark.addColorStop(0, 'rgba(60, 30, 10, 0)');
      dark.addColorStop(1, `rgba(60, 30, 10, ${(.14 - .06 * glaze).toFixed(3)})`);
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, N, N);
      /* the cut: a lit lower lip, then the groove itself; glaze pools brown in it */
      tint(rgb([255, 250, 240], .5 + .2 * glaze));
      ctx.drawImage(tmp, 2.4, 2.6);
      tint(rgb(shade(base, .7).map((v, i) => Math.round(v + ([122, 75, 47][i] - v) * glaze)), .9));
      ctx.drawImage(tmp, 0, 0);
      if (glaze > 0) {
        ctx.globalAlpha = .5 * glaze;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(250, 250, 150, 34, -.72, 0, 7);
        ctx.fill();
        ctx.globalAlpha = .3 * glaze;
        ctx.beginPath();
        ctx.ellipse(196, 330, 56, 12, -.72, 0, 7);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      /* until the first cut, a dotted line shows where a finger might go */
      if (hinted && fired === 0) {
        const [k, dx, dy] = s.sprig;
        const Q = (x, y) => [360 + (x - 360) * k + dx, 372 + (y - 372) * k + dy];
        ctx.save();
        ctx.setLineDash([2, 15]); ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255, 244, 228, .78)';
        ctx.beginPath(); ctx.moveTo(...Q(236, 470)); ctx.bezierCurveTo(...Q(300, 300), ...Q(420, 520), ...Q(488, 300)); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = 'rgba(255, 244, 228, .9)';
        ctx.beginPath(); ctx.arc(...Q(488, 300), 11, 0, 7); ctx.fill();
        ctx.restore();
      }

      /* the edge: raw clay shows a darker rim; White Bird breaks brown over it */
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = rgb(shade(base, .78).map((v, i) => Math.round(v + ([134, 86, 54][i] - v) * glaze)), .95);
      ctx.stroke(s.path);
      const [hx, hy, hr] = s.hole;
      ctx.fillStyle = TABLE;
      ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 7); ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }

    const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * N / r.width, (e.clientY - r.top) * N / r.height]; };
    const groove = (a, b) => { cctx.lineCap = cctx.lineJoin = 'round'; cctx.lineWidth = 9.5; cctx.strokeStyle = '#000'; cctx.beginPath(); cctx.moveTo(a[0], a[1]); cctx.lineTo(b[0], b[1]); cctx.stroke(); };
    const say = text => { state.textContent = text; };

    cv.addEventListener('pointerdown', e => {
      if (busy || e.button) return;
      if (fired > 0) { say('This one is fired. Start again to carve a new one.'); return; }
      if (e.pointerType === 'touch' && !live) { tap = { id: e.pointerId, x: e.clientX, y: e.clientY }; return; }
      cv.setPointerCapture(e.pointerId);
      last = at(e);
      groove(last, [last[0] + .1, last[1] + .1]);
      touched = true;
      hinted = false;
      render();
    });
    cv.addEventListener('pointermove', e => {
      if (!last) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach(ev => { const p = at(ev); groove(last, p); last = p; });
      render();
    });
    const lift = () => { last = null; };
    cv.addEventListener('pointerup', e => {
      if (tap && tap.id === e.pointerId) {
        if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 14) { wake(true); if (!touched) say('Now drag a finger across the clay.'); }
        tap = null;
      }
      lift();
    });
    cv.addEventListener('pointercancel', () => { tap = null; lift(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { if (!entries[0].isIntersecting && live) { wake(false); if (!touched && fired === 0) say(ASLEEP); } }).observe(cv);

    function reset(text) {
      cctx.clearRect(0, 0, N, N);
      fired = 0; busy = false; touched = false;
      fireBtn.disabled = false; leafBtn.disabled = false;
      hinted = true;
      say(text || (coarse.matches && !live ? ASLEEP : RAW));
      render();
    }
    resetBtn.addEventListener('click', () => reset());
    $$('input[name="shape"]').forEach(r => r.addEventListener('change', () => { shape = r.value; reset(); }));

    /* a sprig, for anyone who would rather not draw: a stem, then leaves up both sides */
    leafBtn.addEventListener('click', () => {
      if (busy || fired > 0) return;
      const [k, dx, dy] = SHAPES[shape].sprig;
      const P = (x, y) => [360 + (x - 360) * k + dx, 372 + (y - 372) * k + dy];
      const strokes = [];
      const stem = t => [300 + 130 * t - 40 * Math.sin(t * Math.PI), 560 - 380 * t];
      const stemPts = []; for (let i = 0; i <= 24; i++) stemPts.push(P(...stem(i / 24)));
      strokes.push(stemPts);
      [.16, .3, .44, .58, .72, .86].forEach((t, i) => {
        const [x, y] = stem(t), side = i % 2 ? 1 : -1, len = 96 - i * 9, ang = -Math.PI / 2 + side * (1.02 - i * .04);
        const tip = [x + Math.cos(ang) * len, y + Math.sin(ang) * len], nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2), w = len * .3;
        [1, -1].forEach(dir => {
          const pts = [];
          for (let j = 0; j <= 14; j++) { const q = j / 14, bulge = Math.sin(q * Math.PI) * w * dir; pts.push(P(x + (tip[0] - x) * q + nx * bulge, y + (tip[1] - y) * q + ny * bulge)); }
          strokes.push(pts);
        });
        strokes.push([P(x, y), P(x + (tip[0] - x) * .8, y + (tip[1] - y) * .8)]);
      });
      touched = true;
      hinted = false;
      if (reduce.matches) { strokes.forEach(pts => pts.slice(1).forEach((p, i) => groove(pts[i], p))); render(); return; }
      busy = true;
      const flat = [];
      strokes.forEach(pts => pts.slice(1).forEach((p, i) => flat.push([pts[i], p])));
      let i = 0;
      const tick = () => {
        for (let n = 0; n < 6 && i < flat.length; n++, i++) groove(flat[i][0], flat[i][1]);
        render();
        if (i < flat.length) requestAnimationFrame(tick); else busy = false;
      };
      requestAnimationFrame(tick);
    });

    const STAGES = [[.02, 'Drying on the shelf.'], [.3, 'Bisque firing: clay turns to ceramic.'], [.6, 'Dipped by hand in White Bird.'], [.82, 'Glaze firing.']];
    fireBtn.addEventListener('click', () => {
      if (busy || fired > 0) return;
      const finish = () => { fired = 1; busy = false; render(); say(touched ? 'Fired. White Bird breaks brown wherever you cut.' : 'Fired, and plain. Start again and carve it first.'); };
      fireBtn.disabled = true; leafBtn.disabled = true;
      hinted = false;
      if (reduce.matches) { finish(); return; }
      busy = true;
      const t0 = performance.now(), ms = 3200;
      let shown = -1;
      const tick = now => {
        const t = clamp((now - t0) / ms);
        fired = Math.max(.001, t);
        const idx = STAGES.reduce((a, s, i) => (t >= s[0] ? i : a), -1);
        if (idx !== shown && idx >= 0) { shown = idx; say(STAGES[idx][1]); }
        render();
        if (t < 1) requestAnimationFrame(tick); else finish();
      };
      requestAnimationFrame(tick);
    });

    if (coarse.matches) say(ASLEEP);
    render();
  }

  /* fonts and images move the door a little; measure once they have settled */
  measureFront();
  addEventListener('load', measureFront);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureFront);
})();
