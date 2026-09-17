/* NetDrill app — routing, terminal UI, topology drawing, checklist + reps. */
'use strict';
(function () {
const ND = window.ND;
const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

/* ---------- persistence (per-browser convenience only) ---------- */
const store = {
  get(key, fallback) { try { const v = localStorage.getItem('netdrill.' + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, val) { try { localStorage.setItem('netdrill.' + key, JSON.stringify(val)); } catch { /* private mode etc. */ } },
};
const progress = () => store.get('progress', {});
const repsOf = id => (progress()[id] || {}).reps || 0;
const addRep = id => { const p = progress(); p[id] = { reps: repsOf(id) + 1, last: Date.now() }; store.set('progress', p); };

/* ---------- lab session state ---------- */
let S = null; // {lab, topo, active, termEls:{}, completedThisRun}

function buildTopo(lab) {
  const topo = { devs: {}, links: lab.links || [] };
  for (const d of lab.devices) topo.devs[d.id] = ND.makeDevice(d);
  if (lab.setupAll) lab.setupAll(topo);
  return topo;
}

/* ---------- router ---------- */
function route() {
  const h = location.hash;
  const m = h.match(/^#\/lab\/(.+)$/);
  if (m) {
    const lab = ND.LABS.find(l => l.id === m[1]);
    if (lab) return renderLab(lab);
  }
  renderHome();
}
window.addEventListener('hashchange', route);

/* ---------- home ---------- */
function renderHome() {
  S = null;
  const app = $('#app');
  const totalReps = Object.values(progress()).reduce((a, p) => a + (p.reps || 0), 0);
  const done = ND.LABS.filter(l => repsOf(l.id) > 0).length;
  app.innerHTML = '';
  const wrap = el('div', 'wrap');

  wrap.appendChild(el('section', 'hero', `
    <h1>Drill Cisco IOS until it's muscle memory</h1>
    <p>A Boson NetSim-style practice environment that runs entirely in your browser. Real IOS command syntax — modes, abbreviations, <code>?</code> help, <kbd>Tab</kbd> completion — on simulated routers, switches and PCs.</p>
    <p>Labs follow the day-by-day order of <b>Jeremy's IT Lab</b> CCNA course and his <i>Acing the CCNA Exam</i> volumes. Every lab auto-grades as you type and counts your <b>reps</b> — run each one until the commands pour out without thinking.</p>
    <div class="stats">
      <span><b>${ND.LABS.length}</b> labs</span>
      <span><b>${done}</b> completed at least once</span>
      <span><b>${totalReps}</b> total reps</span>
    </div>`));

  const vols = [
    { n: 1, title: 'Volume 1 — Fundamentals, Switching & Routing', note: 'JITL Days 1–32 · Acing the CCNA Exam Vol 1' },
    { n: 2, title: 'Volume 2 — ACLs, Services & Security', note: 'JITL Days 33+ · Acing the CCNA Exam Vol 2' },
  ];
  for (const v of vols) {
    const head = el('div', 'volhead', `<h2>${v.title}</h2><span class="note">${v.note}</span>`);
    wrap.appendChild(head);
    const grid = el('div', 'labgrid');
    for (const lab of ND.LABS.filter(l => l.vol === v.n)) {
      const reps = repsOf(lab.id);
      const card = el('div', 'labcard');
      card.innerHTML = `<div class="day">${lab.day}</div><h3>${lab.title}</h3>
        <div class="topics">${lab.topics}</div>
        <div class="foot"><span class="repbadge ${reps ? 'done' : ''}">${reps ? reps + ' rep' + (reps > 1 ? 's' : '') : 'not started'}</span>
        <span class="devchips">${lab.devices.map(d => `<span class="devchip">${d.id}</span>`).join('')}</span></div>`;
      card.addEventListener('click', () => { location.hash = '#/lab/' + lab.id; });
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
  }

  wrap.appendChild(el('section', 'howto', `
    <h2>How to use NetDrill</h2>
    <ul>
      <li><b>Repetition first.</b> Follow the steps exactly the first time. Then hit <i>Reset Lab</i> and do it again from the checklist alone. Then turn on <i>Drill Mode</i> (steps hidden) and run it purely from memory. Three clean drill-mode reps and the lab is yours.</li>
      <li><b>Terminal skills count.</b> Abbreviate everything (<code>conf t</code>, <code>int g0/1</code>, <code>sh ip int br</code>), lean on <kbd>?</kbd> and <kbd>Tab</kbd>, use <kbd>↑</kbd> for history, and <code>do</code> to run show commands from config mode.</li>
      <li><b>Switch consoles</b> with the device tabs above the terminal. PCs speak Windows-style: <code>ipconfig</code>, <code>ipconfig /renew</code>, <code>ping</code>, <code>tracert</code>.</li>
      <li><b>Checks grade live</b> after every command. The rep counter increments each time you take a lab from reset to all-green.</li>
      <li><b>Comprehension later, on your schedule.</b> Each lab's <i>Explanation</i> tab holds the theory — skip it while drilling, return when you're ready.</li>
    </ul>
    <p class="dim">Progress is stored in this browser only (localStorage). The simulator covers the CCNA command set these labs teach — it's a trainer, not a full IOS.</p>`));

  wrap.appendChild(el('footer', 'site', `NetDrill · built for CCNA repetition practice · lab order follows <a href="https://www.jeremysitlab.com/" rel="noopener">Jeremy's IT Lab</a> (not affiliated)`));
  app.appendChild(wrap);
  setTopbar(null);
}

/* ---------- lab view ---------- */
function setTopbar(lab) {
  const bar = $('#topbar-actions');
  bar.innerHTML = '';
  if (!lab) return;
  const drill = store.get('drill', false);
  const drillBtn = el('button', 'btn' + (drill ? ' primary' : ''), drill ? 'Drill Mode: ON' : 'Drill Mode: OFF');
  drillBtn.addEventListener('click', () => { store.set('drill', !store.get('drill', false)); renderLab(lab, true); });
  const resetBtn = el('button', 'btn danger', 'Reset Lab');
  resetBtn.addEventListener('click', () => resetLab(lab));
  const homeBtn = el('button', 'btn', '← All Labs');
  homeBtn.addEventListener('click', () => { location.hash = ''; });
  bar.append(homeBtn, drillBtn, resetBtn);
}

function resetLab(lab) {
  renderLab(lab, false);
  termSys('Lab reset — clean startup configs loaded. Go again.');
}

function renderLab(lab, keepState) {
  if (!keepState || !S || S.lab !== lab) {
    S = { lab, topo: buildTopo(lab), active: lab.devices[0].id, termBufs: {}, completedThisRun: false };
    for (const d of lab.devices) S.termBufs[d.id] = [];
  }
  const drill = store.get('drill', false);
  const app = $('#app');
  app.innerHTML = '';
  const wrap = el('div', 'wrap');

  wrap.appendChild(el('div', 'labtop', `<span class="day">${lab.day}</span><h1>${lab.title}</h1>
    <span class="repbadge ${repsOf(lab.id) ? 'done' : ''}">${repsOf(lab.id)} reps</span><span class="spacer"></span>`));

  const grid = el('div', 'labgrid2');

  /* left pane: topology + instruction tabs */
  const left = el('div', 'pane');
  left.appendChild(renderTopo(lab));
  const tabs = el('div', 'tabs');
  const body = el('div', 'tabbody');
  const tabDefs = [
    ['Instructions', () => instructionsHtml(lab, drill)],
    ['Explanation', () => `<p class="dim">Theory behind this lab — read it when you're past the pure-repetition phase.</p>` + lab.explain],
    ['Reference', () => referenceHtml(lab)],
  ];
  tabDefs.forEach(([name, fn], idx) => {
    const t = el('button', 'tab' + (idx === 0 ? ' active' : ''), name);
    t.addEventListener('click', () => {
      tabs.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      body.innerHTML = fn();
    });
    tabs.appendChild(t);
  });
  body.innerHTML = tabDefs[0][1]();
  left.append(tabs, body);

  /* right pane: terminal + checks */
  const right = el('div');
  const termPane = el('div', 'pane');
  const devtabs = el('div', 'devtabs');
  for (const d of lab.devices) {
    const t = el('button', 'devtab' + (d.id === S.active ? ' active' : ''), `<span class="dot"></span>${d.id}`);
    t.dataset.dev = d.id;
    t.addEventListener('click', () => { S.active = d.id; renderTermTabs(); paintTerm(); focusInput(); });
    devtabs.appendChild(t);
  }
  const term = el('div', 'term');
  term.id = 'term';
  term.setAttribute('role', 'log');
  term.addEventListener('click', () => focusInput());
  const hint = el('div', 'termhint', `<span><kbd>?</kbd> context help</span><span><kbd>Tab</kbd> complete</span><span><kbd>↑</kbd>/<kbd>↓</kbd> history</span><span>abbreviations work: <code>conf t</code>, <code>sh ip int br</code></span>`);
  termPane.append(devtabs, term, hint);

  const checkPane = el('div', 'pane checkpane');
  checkPane.innerHTML = `<div class="checkhead"><h3>Lab checks</h3><span class="count" id="checkcount"></span></div><ul class="checklist" id="checklist"></ul><div id="donebanner"></div>`;
  right.append(termPane, checkPane);

  grid.append(left, right);
  wrap.appendChild(grid);
  app.appendChild(wrap);
  setTopbar(lab);

  paintTerm();
  runChecks();
  focusInput();

  function renderTermTabs() {
    devtabs.querySelectorAll('.devtab').forEach(t => t.classList.toggle('active', t.dataset.dev === S.active));
  }
}

function instructionsHtml(lab, drill) {
  let h = `<p>${lab.intro}</p>`;
  h += `<h3>Your tasks</h3><ol>${lab.tasks.map(t => `<li>${t}</li>`).join('')}</ol>`;
  if (drill) {
    h += `<div class="callout"><b>Drill Mode is on.</b> Step-by-step commands are hidden — work from the task list and the live checks. Toggle Drill Mode off in the top bar if you get stuck.</div>`;
  } else {
    h += `<h3>Step by step</h3><ol>`;
    for (const s of lab.steps) {
      h += `<li>${s.t}<pre>${s.c.join('\n')}</pre>${s.note ? `<p class="dim">${s.note}</p>` : ''}</li>`;
    }
    h += '</ol>';
  }
  h += `<h3>Verify</h3><p class="dim">Useful show commands for this lab:</p><pre>${lab.verify.join('\n')}</pre>`;
  return h;
}

function referenceHtml(lab) {
  let h = `<h3>Command quick reference</h3><p class="dim">Every command this lab uses, in order — scan it before a from-memory rep.</p>`;
  h += `<pre>${lab.steps.map(s => s.c.join('\n')).join('\n')}</pre>`;
  h += `<h3>Topology facts</h3><ul>`;
  for (const [a, ia, b, ib] of lab.links) h += `<li><code>${a}</code> ${ND.normIface(ia) ? ND.shortIface(ND.normIface(ia)) : ia} ↔ ${ND.normIface(ib) ? ND.shortIface(ND.normIface(ib)) : ib} <code>${b}</code></li>`;
  h += '</ul>';
  const pcs = lab.devices.filter(d => d.type === 'pc' && d.pc && d.pc.ip);
  if (pcs.length) {
    h += `<h3>Host addressing</h3><ul>`;
    for (const p of pcs) h += `<li><code>${p.id}</code> — ${p.pc.ip} / ${p.pc.mask}${p.pc.gw ? ' · gw ' + p.pc.gw : ''}</li>`;
    h += '</ul>';
  }
  return h;
}

/* ---------- topology SVG ---------- */
function renderTopo(lab) {
  const box = el('div', 'topo');
  const maxY = Math.max(...Object.values(lab.layout).map(p => p[1])) + 22;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 400 ${maxY + 14}`);
  const mk = (name, attrs, text) => {
    const n = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  };
  // links first (under nodes)
  for (const [a, ia, b, ib] of lab.links) {
    const [ax, ay] = lab.layout[a], [bx, by] = lab.layout[b];
    svg.appendChild(mk('line', { x1: ax, y1: ay, x2: bx, y2: by, class: 'linkline' }));
    const lx = ax + (bx - ax) * 0.28, ly = ay + (by - ay) * 0.28 - 3;
    const rx = ax + (bx - ax) * 0.72, ry = ay + (by - ay) * 0.72 - 3;
    const short = n => { const f = ND.normIface(n); return f ? ND.shortIface(f) : n; };
    svg.appendChild(mk('text', { x: lx, y: ly, class: 'iflabel', 'text-anchor': 'middle' }, short(ia)));
    svg.appendChild(mk('text', { x: rx, y: ry, class: 'iflabel', 'text-anchor': 'middle' }, short(ib)));
  }
  for (const d of lab.devices) {
    const [x, y] = lab.layout[d.id];
    const w = 58, h = 26;
    svg.appendChild(mk('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: d.type === 'router' ? 13 : 4, class: 'devbox' }));
    svg.appendChild(mk('text', { x, y: y + 1, class: 'devlabel', 'text-anchor': 'middle' }, d.id));
    svg.appendChild(mk('text', { x, y: y + 10, class: 'devtype', 'text-anchor': 'middle' }, d.type === 'pc' ? 'host' : d.l3switch ? 'L3 switch' : d.type));
  }
  box.appendChild(svg);
  return box;
}

/* ---------- terminal ---------- */
function activeDev() { return S.topo.devs[S.active]; }

function termSys(text) {
  if (!S) return;
  S.termBufs[S.active].push({ text, cls: 'sys' });
  paintTerm();
}

function paintTerm() {
  const term = $('#term');
  if (!term) return;
  term.innerHTML = '';
  const outWrap = el('div', 'out');
  const buf = S.termBufs[S.active];
  if (!buf.length) {
    const dev = activeDev();
    const header = dev.type === 'pc'
      ? `Microsoft Windows [NetDrill virtual host ${dev.id}]\n`
      : `${dev.id} console — press ? for help at any prompt.\n`;
    buf.push({ text: header, cls: 'sys' });
  }
  for (const line of buf) {
    const d = el('div', line.cls || '');
    d.textContent = line.text;
    outWrap.appendChild(d);
  }
  term.appendChild(outWrap);

  const dev = activeDev();
  const inLine = el('div', 'inline-input');
  const promptSpan = el('span', 'prompt', null);
  promptSpan.textContent = ND.promptFor(dev);
  const input = document.createElement('input');
  input.id = 'cli-input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'IOS command input');
  if (ND.isPasswordPrompt(dev)) input.type = 'password';
  inLine.append(promptSpan, input);
  term.appendChild(inLine);

  input.addEventListener('keydown', e => handleKey(e, input));
  term.scrollTop = term.scrollHeight;
}

function focusInput() { const i = $('#cli-input'); if (i) i.focus({ preventScroll: true }); }

function handleKey(e, input) {
  const dev = activeDev();
  const s = dev.sess;
  if (e.key === 'Enter') {
    e.preventDefault();
    const line = input.value;
    const masked = ND.isPasswordPrompt(dev);
    push(ND.promptFor(dev) + (masked ? '' : line));
    if (line.trim() && !masked) { s.history.push(line); s.hIdx = s.history.length; }
    ND.execLine(S.topo, dev, line, (text, cls) => push(text, cls));
    input.value = '';
    paintTerm(); focusInput();
    runChecks();
  } else if (e.key === '?' && dev.type !== 'pc' && !ND.isPasswordPrompt(dev)) {
    e.preventDefault();
    const before = input.value;
    push(ND.promptFor(dev) + before + '?');
    for (const h of ND.helpFor(S.topo, dev, before)) push(h);
    paintTerm();
    const ni = $('#cli-input');
    if (ni) { ni.value = before; ni.focus({ preventScroll: true }); }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const completed = ND.completeFor(S.topo, dev, input.value);
    if (completed) input.value = completed;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (s.history.length) { s.hIdx = Math.max(0, s.hIdx - 1); input.value = s.history[s.hIdx] || ''; }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    s.hIdx = Math.min(s.history.length, s.hIdx + 1);
    input.value = s.history[s.hIdx] || '';
  } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && !window.getSelection().toString()) {
    e.preventDefault();
    push(ND.promptFor(dev) + input.value + '^C');
    input.value = '';
    paintTerm(); focusInput();
  } else if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    if (dev.type !== 'pc' && !['exec', 'priv'].includes(s.mode)) {
      s.mode = 'priv'; s.ifaceRange = null; s.line = null; s.vlan = null; s.pool = null; s.acl = null;
      push(ND.promptFor(dev));
      paintTerm(); focusInput();
    }
  }

  function push(text, cls) { S.termBufs[S.active].push({ text, cls }); }
}

/* ---------- checks ---------- */
function runChecks() {
  if (!S) return;
  const list = $('#checklist');
  const count = $('#checkcount');
  if (!list) return;
  const H = ND.checkHelpers(S.topo);
  let pass = 0;
  list.innerHTML = '';
  for (const chk of S.lab.checks) {
    let ok = false;
    try { ok = !!chk.fn(H); } catch { ok = false; }
    if (ok) pass++;
    const li = el('li', ok ? 'pass' : '');
    li.innerHTML = `<span class="mark">${ok ? '✓' : '·'}</span><span class="what">${chk.desc}</span>`;
    list.appendChild(li);
  }
  count.textContent = `${pass} / ${S.lab.checks.length}`;
  const banner = $('#donebanner');
  if (pass === S.lab.checks.length && S.lab.checks.length) {
    if (!S.completedThisRun) { S.completedThisRun = true; addRep(S.lab.id); }
    banner.innerHTML = '';
    const b = el('div', 'banner-done', `<span>✓ Lab complete — rep #${repsOf(S.lab.id)} logged.</span>`);
    const again = el('button', 'btn', 'Reset & run it again');
    again.addEventListener('click', () => resetLab(S.lab));
    b.appendChild(again);
    banner.appendChild(b);
  } else {
    banner.innerHTML = '';
  }
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', route);
if (document.readyState !== 'loading') route();
})();
