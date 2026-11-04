(function () {
  'use strict';
  var KEY = 'irchad.v1';
  var S = load();
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') return fill(s); } catch (e) {}
    return fill({});
  }
  function fill(s) { s.pos = s.pos || {}; s.prog = s.prog || {}; s.bm = s.bm || []; s.fs = s.fs || 1; return s; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var $ = function (q, r) { return (r || document).querySelector(q); };
  var $$ = function (q, r) { return Array.prototype.slice.call((r || document).querySelectorAll(q)); };
  var CH = window.CHAPTERS || [];
  var main = $('main.page');
  var chapter = main && main.getAttribute('data-chapter');
  var chInfo = CH.filter(function (c) { return c.id === chapter; })[0];

  /* Theme & font size */
  /* Theme: always start with the device's mode; a manual choice lasts only for the current visit */
  if (S.theme) { delete S.theme; save(); }
  var TK = 'irchad.theme';
  function getT() { try { return sessionStorage.getItem(TK); } catch (e) { return null; } }
  function setT(v) { try { sessionStorage.setItem(TK, v); } catch (e) {} }
  var manual = getT();
  if (manual) document.documentElement.setAttribute('data-theme', manual);
  else document.documentElement.removeAttribute('data-theme');
  function applyFs() { document.documentElement.style.setProperty('--fs', S.fs); var v = $('#fs-val'); if (v) v.textContent = Math.round(S.fs * 100) + ' %'; }
  applyFs();
  $('#btn-theme').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next); setT(next);
  });
  var fontpop = $('#fontpop');
  $('#btn-font').addEventListener('click', function () { fontpop.hidden = !fontpop.hidden; });
  $$('[data-fs]', fontpop).forEach(function (b) {
    b.addEventListener('click', function () {
      S.fs = Math.min(1.5, Math.max(.85, Math.round((S.fs + .05 * +b.getAttribute('data-fs')) * 100) / 100));
      applyFs(); save();
    });
  });

  /* Drawers */
  var toc = $('#toc'), bmp = $('#bmpanel'), scrim = $('#scrim');
  function wide() { return matchMedia('(min-width: 1180px)').matches; }
  function closeAll() { toc.classList.remove('is-open'); bmp.hidden = true; scrim.hidden = true; }
  $('#btn-menu').addEventListener('click', function () { bmp.hidden = true; toc.classList.add('is-open'); scrim.hidden = false; var c = $('.toc-item.is-current'); if (c) { var sc = c.closest('.toc-scroll') || toc; sc.scrollTop = Math.max(0, c.offsetTop - sc.clientHeight / 2); } });
  $('#btn-toc-close').addEventListener('click', closeAll);
  $('#btn-bm').addEventListener('click', function () { if (!bmp.hidden) return closeAll(); toc.classList.remove('is-open'); renderBm(); bmp.hidden = false; scrim.hidden = false; });
  $('#btn-bm-close').addEventListener('click', closeAll);
  scrim.addEventListener('click', closeAll);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); fontpop.hidden = true; } });
  $$('.toc a').forEach(function (a) { a.addEventListener('click', function () { if (!wide()) closeAll(); }); });

  /* Confirmations built into the page */
  function confirmBox(btn, box, yes, no, action) {
    $(btn).addEventListener('click', function () { $(box).hidden = false; });
    $(no).addEventListener('click', function () { $(box).hidden = true; });
    $(yes).addEventListener('click', function () { action(); $(box).hidden = true; });
  }
  confirmBox('#btn-reset', '#reset-confirm', '#reset-yes', '#reset-no', function () {
    S.pos = {}; S.prog = {}; S.bm = []; S.last = null; save();
    $$('.is-marked').forEach(function (e) { e.classList.remove('is-marked'); });
    paintProgress(); updateBadge(); renderResume(); toast('Lecture réinitialisée.');
  });
  confirmBox('#bm-clear', '#bm-confirm', '#bm-yes', '#bm-no', function () {
    S.bm = []; save(); $$('.is-marked').forEach(function (e) { e.classList.remove('is-marked'); });
    renderBm(); updateBadge();
  });

  /* Toast */
  var tt;
  function toast(msg, actionLabel, action) {
    var t = $('#toast'); t.innerHTML = '';
    var s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
    if (actionLabel) { var b = document.createElement('button'); b.type = 'button'; b.textContent = actionLabel; b.onclick = function () { t.hidden = true; action(); }; t.appendChild(b); }
    var x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.setAttribute('aria-label', 'Fermer'); x.textContent = '✕'; x.onclick = function () { t.hidden = true; }; t.appendChild(x);
    t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, actionLabel ? 12000 : 3000);
  }

  /* Progress in sommaire + index */
  function paintProgress() {
    $$('[data-ch]').forEach(function (el) {
      var id = el.getAttribute('data-ch'), p = S.prog[id] || 0;
      var tp = el.querySelector('.toc-prog');
      if (tp) { tp.innerHTML = '<i style="width:' + p + '%"></i>'; tp.classList.toggle('on', p > 0); }
      var ip = el.querySelector('.ix-prog i'); if (ip) ip.style.width = p + '%';
    });
  }
  paintProgress();

  /* Bookmarks */
  function updateBadge() { var b = $('#bm-count'); b.textContent = S.bm.length; b.hidden = !S.bm.length; }
  function excerpt(el) {
    var c = el.cloneNode(true); $$('.bm, .cite-label, sup, .h-ar', c).forEach(function (x) { x.remove(); });
    var tr = c.querySelector('.tr'); var t = (tr || c).textContent.replace(/\s+/g, ' ').trim();
    return t.length > 180 ? t.slice(0, 177) + '…' : t;
  }
  function chTitle(id) { var c = CH.filter(function (x) { return x.id === id; })[0]; return c ? c : { fr: '', file: 'index.html' }; }
  function renderBm() {
    var ul = $('#bm-list'); ul.innerHTML = '';
    if (!S.bm.length) { ul.innerHTML = '<li class="bm-empty">Aucun marque-page pour l’instant.</li>'; return; }
    S.bm.slice().sort(function (a, b) { return a.ch === b.ch ? a.n - b.n : (a.ch < b.ch ? -1 : 1); }).forEach(function (m) {
      var c = chTitle(m.ch), li = document.createElement('li');
      var a = document.createElement('a'); a.href = c.file + '#' + m.id;
      a.innerHTML = '<small></small><span class="ex"></span>';
      a.querySelector('small').innerHTML = 'Chap. ' + parseInt(m.ch, 10) + ' · ' + c.fr;
      a.querySelector('.ex').textContent = m.text;
      a.addEventListener('click', function () { if (m.ch === chapter) { closeAll(); setTimeout(function () { go(m.id); }, 30); } });
      var d = document.createElement('button'); d.type = 'button'; d.className = 'ico del'; d.setAttribute('aria-label', 'Supprimer ce marque-page');
      d.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      d.addEventListener('click', function () {
        S.bm = S.bm.filter(function (x) { return !(x.ch === m.ch && x.id === m.id); }); save();
        var el = m.ch === chapter && document.getElementById(m.id); if (el) el.classList.remove('is-marked');
        renderBm(); updateBadge();
      });
      li.appendChild(a); li.appendChild(d); ul.appendChild(li);
    });
  }
  updateBadge();

  function go(id, smooth) {
    var el = document.getElementById(id); if (!el) return;
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  /* Home: resume */
  function renderResume() {
    var r = $('#resume'); if (!r) return;
    var last = S.last && chTitle(S.last.ch);
    if (!last || !last.file || last.file === 'index.html') { r.hidden = true; return; }
    r.innerHTML = '';
    var a = document.createElement('a'); a.className = 'btn primary'; a.href = last.file + '#' + (S.pos[S.last.ch] || '');
    a.textContent = 'Reprendre la lecture';
    var s = document.createElement('span'); s.style.color = 'var(--muted)'; s.style.fontSize = '.88rem';
    s.innerHTML = 'Chap. ' + parseInt(S.last.ch, 10) + ' · ' + last.fr;
    r.appendChild(a); r.appendChild(s); r.hidden = false;
  }
  renderResume();

  if (!chapter) return;

  /* Chapter page */
  var blocks = $$('[data-b]');
  var marked = {}; S.bm.forEach(function (m) { if (m.ch === chapter) marked[m.id] = 1; });
  blocks.forEach(function (el) {
    if (marked[el.id]) el.classList.add('is-marked');
    var b = el.querySelector(':scope > .bm'); if (!b) return;
    b.setAttribute('aria-pressed', marked[el.id] ? 'true' : 'false');
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var on = el.classList.toggle('is-marked');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) { S.bm.push({ ch: chapter, id: el.id, n: +el.id.slice(1), text: excerpt(el), t: Date.now() }); toast('Passage ajouté aux marque-pages.'); }
      else { S.bm = S.bm.filter(function (x) { return !(x.ch === chapter && x.id === el.id); }); toast('Marque-page retiré.'); }
      save(); updateBadge();
    });
  });

  /* Reading position: first block whose top is within the upper part of the screen */
  var subLinks = $$('.toc-sub a');
  var heads = $$('.text h2[id], .text h3[id]');
  var restored = false, ticking = false;
  function current() {
    var top = (parseFloat(getComputedStyle(document.querySelector('.bar')).height) || 52) + 12;
    for (var i = 0; i < blocks.length; i++) { var r = blocks[i].getBoundingClientRect(); if (r.bottom > top + 8) return blocks[i]; }
    return blocks[blocks.length - 1];
  }
  function onScroll() {
    ticking = false;
    var h = document.documentElement, max = h.scrollHeight - innerHeight;
    var pct = max > 0 ? Math.min(100, Math.round(scrollY / max * 100)) : 100;
    $('#readbar').style.width = pct + '%';
    if (!restored) return;
    var el = current(); if (!el) return;
    S.pos[chapter] = el.id; S.last = { ch: chapter, id: el.id };
    S.prog[chapter] = Math.max(S.prog[chapter] || 0, pct);
    var hereHead = null; heads.forEach(function (hd) { if (hd.getBoundingClientRect().top < innerHeight * .35) hereHead = hd.id; });
    subLinks.forEach(function (a) { a.classList.toggle('is-here', a.getAttribute('href') === '#' + hereHead); });
    save(); paintProgress();
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* Always open a chapter at its beginning (also inside a host frame) */
  function toTop() {
    scrollTo(0, 0);
    var first = $('.ch-head') || $('main');
    if (first) { try { first.scrollIntoView({ block: 'start' }); } catch (e) {} scrollTo(0, 0); }
  }
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  var saved = S.pos[chapter];
  if (location.hash && document.getElementById(location.hash.slice(1))) {
    restored = true; setTimeout(function () { go(location.hash.slice(1)); }, 60);
  } else if (saved && saved !== blocks[0].id) {
    toast('Reprendre là où vous vous étiez arrêté ?', 'Reprendre', function () { go(saved, true); });
    setTimeout(function () { restored = true; }, 400);
  } else { restored = true; }
  if (!location.hash) {
    /* Re-apply after late layout (fonts, images) and any browser scroll restoration, until the reader scrolls */
    var userMoved = false;
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) { addEventListener(ev, function () { userMoved = true; }, { passive: true, once: true }); });
    var again = function () { if (!userMoved && !location.hash) toTop(); };
    toTop();
    document.addEventListener('DOMContentLoaded', again);
    addEventListener('load', function () { again(); setTimeout(again, 120); setTimeout(again, 400); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(again);
    setTimeout(again, 60); setTimeout(again, 250); setTimeout(again, 700);
  }
  onScroll();
})();
