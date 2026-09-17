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
  let activeTab = 0;
  tabDefs.forEach(([name, fn], idx) => {
    const t = el('button', 'tab' + (idx === 0 ? ' active' : ''), name);
    t.addEventListener('click', () => {
      tabs.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      activeTab = idx;
      body.innerHTML = fn();
    });
    tabs.appendChild(t);
  });
  body.innerHTML = tabDefs[0][1]();
  body.addEventListener('click', e => {
    if (e.target && e.target.id === 'soltoggle') {
      store.set('hideSol', !store.get('hideSol', true));
      body.innerHTML = tabDefs[activeTab][1]();
      return;
    }
    const wb = e.target.closest ? e.target.closest('.whybtn') : null;
    if (wb) {
      const why = wb.parentElement.nextElementSibling;
      if (why) {
        why.hidden = !why.hidden;
        wb.setAttribute('aria-expanded', String(!why.hidden));
        wb.classList.toggle('on', !why.hidden);
      }
    }
  });
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

function taskHtml(t) {
  const txt = typeof t === 'string' ? t : t.t;
  const why = typeof t === 'string' ? null : t.why;
  if (!why) return `<li><div class="taskline"><span class="tasktext">${txt}</span></div></li>`;
  return `<li><div class="taskline"><span class="tasktext">${txt}</span>`
    + `<button class="whybtn" aria-expanded="false">why?</button></div>`
    + `<div class="taskwhy" hidden>${why}</div></li>`;
}

function instructionsHtml(lab, drill) {
  const hideSol = store.get('hideSol', true);
  let h = `<p>${lab.intro}</p>`;
  h += `<h3>Your tasks</h3><ol class="tasks">${lab.tasks.map(taskHtml).join('')}</ol>`;
  if (drill) {
    h += `<div class="callout"><b>Drill Mode is on.</b> Step-by-step commands are hidden — work from the task list and the live checks. Toggle Drill Mode off in the top bar if you get stuck.</div>`;
  } else {
    h += `<div class="ctlrow"><h3>Step by step</h3><button class="btn small" id="soltoggle">${hideSol ? 'Solutions: hidden' : 'Solutions: shown'}</button></div>`;
    if (hideSol) h += `<p class="dim">Commands are tucked away — try each step from memory, then reveal only if you need to.</p>`;
    h += `<ol>`;
    for (const s of lab.steps) {
      h += `<li>${s.t}`;
      const sol = `<pre>${s.c.join('\n')}</pre>`;
      h += hideSol ? `<details class="sol"><summary>Show commands</summary>${sol}</details>` : sol;
      h += `<details class="explain"><summary>Explain this step</summary><div class="explain-body">`
        + (s.note ? `<p>${s.note}</p>` : '')
        + `<ul>${s.c.map(cmd => `<li><code>${cmd}</code><span class="dash">—</span>${explainCmd(cmd)}</li>`).join('')}</ul>`
        + `</div></details></li>`;
    }
    h += '</ol>';
  }
  h += `<h3>Verify</h3><p class="dim">Useful show commands for this lab:</p><pre>${lab.verify.join('\n')}</pre>`;
  return h;
}

function referenceHtml(lab) {
  const hideSol = store.get('hideSol', true);
  let h = `<h3>Command quick reference</h3><p class="dim">Every command this lab uses, in order — scan it before a from-memory rep.</p>`;
  const allCmds = `<pre>${lab.steps.map(s => s.c.join('\n')).join('\n')}</pre>`;
  h += hideSol ? `<details class="sol"><summary>Show all commands</summary>${allCmds}</details>` : allCmds;
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

/* ---------- per-command explanations ---------- */
const EXPLAIN_RULES = [
  [/^do (.+)$/i, (m) => `runs a privileged-EXEC command from config mode: ${explainCmd(m[1])}`],
  [/^enable$/i, () => 'moves from user EXEC (>) to privileged EXEC (#), unlocking show/config access.'],
  [/^configure terminal$|^conf t/i, () => 'enters global configuration mode — changes here modify the running config.'],
  [/^hostname (\S+)$/i, m => `names the device "${m[1]}"; the prompt updates immediately.`],
  [/^enable secret (\S+)$/i, () => 'sets the privileged-EXEC password, stored as an MD5 hash (always beats "enable password").'],
  [/^enable password/i, () => 'sets the legacy plaintext privileged-EXEC password (weaker than a secret).'],
  [/^service password-encryption$/i, () => 'applies (weak) type-7 encryption to all plaintext passwords in the config.'],
  [/^no ip domain-lookup$/i, () => 'stops the device trying to DNS-resolve mistyped commands (no more long hangs).'],
  [/^banner motd (.)/i, m => `sets a message-of-the-day banner; "${m[1]}" is the delimiter marking where the text starts and ends.`],
  [/^line console 0$/i, () => 'enters config for the physical console port.'],
  [/^line vty/i, () => 'enters config for the virtual terminal lines (remote telnet/SSH sessions).'],
  [/^password (\S+)$/i, m => `sets "${m[1]}" as this line's login password.`],
  [/^login local$/i, () => 'makes this line authenticate against the local username database.'],
  [/^login$/i, () => 'tells this line to actually check the password at login.'],
  [/^transport input ssh$/i, () => 'allows only SSH on these lines — telnet (cleartext) is refused.'],
  [/^copy running-config startup-config$|^write/i, () => 'saves the running config (RAM) to NVRAM so it survives a reload.'],
  [/^interface range (.+)$/i, m => `selects interfaces ${m[1]} at once — following commands apply to all of them.`],
  [/^interface port-channel (\d+)/i, m => `enters the logical bundle interface Po${m[1]}; settings here apply to the whole EtherChannel.`],
  [/^interface vlan ?(\d+)/i, m => `creates/enters the VLAN ${m[1]} SVI — the switch's own IP interface in that VLAN.`],
  [/^interface (\S+\.\d+)$/i, m => `creates subinterface ${m[1]} — one physical port split into logical VLAN interfaces.`],
  [/^interface (\S+)$/i, m => `enters interface config mode for ${m[1]}.`],
  [/^ip address (\S+) (\S+)$/i, m => `assigns IPv4 address ${m[1]} with subnet mask ${m[2]}.`],
  [/^no shutdown$/i, () => 'administratively enables the interface (router ports ship disabled).'],
  [/^shutdown$/i, () => 'administratively disables the interface.'],
  [/^description (.+)$/i, () => 'attaches a human-readable label; shows in show commands, changes no behavior.'],
  [/^speed (\S+)$/i, m => `hard-codes port speed to ${m[1]} instead of autonegotiating.`],
  [/^duplex (\S+)$/i, m => `hard-codes duplex to ${m[1]} — mismatches cause late collisions, so set both ends.`],
  [/^vlan (\d+)$/i, m => `creates VLAN ${m[1]} (if new) and enters VLAN config mode.`],
  [/^name (\S+)$/i, m => `names this VLAN "${m[1]}" for readable show output.`],
  [/^switchport mode access$/i, () => 'makes the port carry exactly one VLAN, untagged (host port).'],
  [/^switchport mode trunk$/i, () => 'makes the port a permanent 802.1Q trunk carrying multiple tagged VLANs.'],
  [/^switchport mode dynamic desirable$/i, () => 'port actively asks the far end (via DTP) to form a trunk.'],
  [/^switchport mode dynamic auto$/i, () => 'port will trunk only if the far end initiates (DTP passive).'],
  [/^switchport access vlan (\d+)$/i, m => `puts this access port in VLAN ${m[1]}.`],
  [/^switchport voice vlan (\d+)$/i, m => `adds VLAN ${m[1]} for an attached IP phone's tagged voice traffic.`],
  [/^switchport trunk encapsulation dot1q$/i, () => 'selects 802.1Q tagging for the trunk (needed on switches that also speak ISL).'],
  [/^switchport trunk native vlan (\d+)$/i, m => `VLAN ${m[1]} travels untagged on this trunk — must match on both ends.`],
  [/^switchport trunk allowed vlan add (\S+)$/i, m => `appends VLAN(s) ${m[1]} to the allowed list without replacing it.`],
  [/^switchport trunk allowed vlan (\S+)$/i, m => `replaces the trunk's allowed list with ${m[1]} — only these VLANs cross.`],
  [/^switchport nonegotiate$/i, () => 'disables DTP frames entirely — the port never negotiates trunking (security hardening).'],
  [/^switchport port-security$/i, () => 'enables port security: limits which/how many MACs may use this port.'],
  [/^switchport port-security maximum (\d+)$/i, m => `allows at most ${m[1]} secure MAC address(es) on the port.`],
  [/^switchport port-security violation (\S+)$/i, m => `on violation: ${m[1] === 'shutdown' ? 'err-disable the port (default)' : m[1] === 'restrict' ? 'drop offenders and log each one' : 'drop offenders silently — no log, no counter'}.`],
  [/^switchport port-security mac-address sticky$/i, () => 'learned MACs get written into the running config (save to keep them).'],
  [/^vtp mode (\S+)$/i, m => `sets VTP mode ${m[1]}${m[1].startsWith('trans') ? ' — forwards VTP ads but never syncs its own VLAN database' : ''}.`],
  [/^vtp domain (\S+)$/i, m => `joins VTP domain "${m[1]}"; only same-domain switches exchange VTP.`],
  [/^spanning-tree mode rapid-pvst$/i, () => 'upgrades to Rapid PVST+ — converges in seconds instead of 30-50s.'],
  [/^spanning-tree mode pvst$/i, () => 'runs classic per-VLAN spanning tree.'],
  [/^spanning-tree vlan (\S+) priority (\d+)$/i, m => `sets bridge priority ${m[2]} for VLAN ${m[1]} — lowest priority wins the root election.`],
  [/^spanning-tree vlan (\S+) root primary$/i, () => 'macro: sets priority 24576 (or lower) so this switch becomes root.'],
  [/^spanning-tree vlan (\S+) root secondary$/i, () => 'macro: sets priority 28672 — the backup root if the primary dies.'],
  [/^spanning-tree portfast$/i, () => 'port skips listening/learning and forwards immediately — host ports only!'],
  [/^spanning-tree bpduguard enable$/i, () => 'if a BPDU (i.e., a switch) ever appears here, err-disable the port.'],
  [/^spanning-tree portfast default$/i, () => 'enables portfast on every access port at once.'],
  [/^spanning-tree portfast bpduguard default$/i, () => 'enables BPDU guard on all portfast ports at once.'],
  [/^channel-group (\d+) mode (\S+)$/i, m => `bundles this port into EtherChannel ${m[1]} using ${m[2] === 'active' ? 'LACP (initiating)' : m[2] === 'passive' ? 'LACP (responding only)' : m[2] === 'desirable' ? 'PAgP (initiating)' : m[2] === 'auto' ? 'PAgP (responding only)' : 'no protocol — forced on'}.`],
  [/^encapsulation dot1q (\d+)( native)?$/i, m => `binds this subinterface to 802.1Q tag ${m[1]}${m[2] ? ' as the untagged/native VLAN' : ''}.`],
  [/^ip route 0\.0\.0\.0 0\.0\.0\.0 (\S+)$/i, m => `default route — anything without a better match goes to ${m[1]}.`],
  [/^ip route (\S+) (\S+) (\S+)$/i, m => `static route: to reach ${m[1]}/${maskLen(m[2])}, forward to ${m[3]}.`],
  [/^ip routing$/i, () => 'turns on IPv4 routing (multilayer switches have it off by default).'],
  [/^ip default-gateway (\S+)$/i, m => `where a non-routing switch sends off-subnet management traffic (${m[1]}).`],
  [/^ipv6 unicast-routing$/i, () => 'enables IPv6 routing — off by default, and required before a router routes v6.'],
  [/^ipv6 address (\S+) eui-64$/i, m => `assigns prefix ${m[1]} with the host half auto-built from the interface MAC (EUI-64).`],
  [/^ipv6 address (\S+)$/i, m => `assigns IPv6 address ${m[1]}; a FE80:: link-local is auto-created too.`],
  [/^ipv6 route (\S+) (\S+)$/i, m => `static IPv6 route: reach ${m[1]} via ${m[2]}.`],
  [/^router ospf (\d+)$/i, m => `starts OSPF process ${m[1]} and enters router config mode (process ID is locally significant).`],
  [/^router-id (\S+)$/i, m => `fixes this router's OSPF ID to ${m[1]} — always set it explicitly for readable neighbor tables.`],
  [/^network (\S+) (\S+) area (\d+)$/i, m => `enables OSPF (area ${m[3]}) on every interface whose IP matches ${m[1]} with wildcard ${m[2]}.`],
  [/^network (\S+) (\S+)$/i, m => `DHCP pool subnet: lease addresses from ${m[1]} ${m[2]}.`],
  [/^passive-interface default$/i, () => 'stops OSPF hellos on ALL interfaces; re-enable specific ones with "no passive-interface".'],
  [/^passive-interface (\S+)$/i, m => `stops OSPF hellos out ${m[1]} (no neighbors there) but still advertises its subnet.`],
  [/^default-information originate$/i, () => 'advertises this router\'s default route into OSPF for everyone else.'],
  [/^auto-cost reference-bandwidth (\d+)$/i, m => `cost = ${m[1]} Mbps ÷ link bandwidth — raise it so gigabit links get distinct costs.`],
  [/^standby version 2$/i, () => 'runs HSRP version 2 (more groups, faster timers, IPv6 support).'],
  [/^standby (\d+) ip (\S+)$/i, m => `joins HSRP group ${m[1]} sharing virtual gateway IP ${m[2]}.`],
  [/^standby (\d+) priority (\d+)$/i, m => `priority ${m[2]} for group ${m[1]} — highest priority becomes Active (default 100).`],
  [/^standby (\d+) preempt$/i, () => 'lets this router reclaim Active when it recovers — HSRP does NOT preempt by default.'],
  [/^access-list (\d+) (permit|deny) (.+)$/i, m => `ACL ${m[1]}: ${m[2]}s traffic from ${m[3].replace(/ 0\.0\.0\.255/, ' (whole /24)')}. Entries are checked top-down, first match wins.`],
  [/^ip access-list standard (\S+)$/i, m => `creates named standard ACL "${m[1]}" (matches source IPs only) and enters its config mode.`],
  [/^ip access-list extended (\S+)$/i, m => `creates named extended ACL "${m[1]}" (matches protocol, source, destination, ports).`],
  [/^permit ip any any$/i, () => 'catch-all permit — without it, the invisible "deny any" at the bottom blocks everything else.'],
  [/^(permit|deny) (tcp|udp|icmp|ip) (.+)$/i, m => `${m[1]}s ${m[2].toUpperCase()} traffic matching: ${m[3]}${/eq (\d+|www|80)/.test(m[3]) ? ' (port-specific)' : ''}.`],
  [/^(permit|deny) (.+)$/i, m => `${m[1]}s traffic from ${m[2]}.`],
  [/^ip access-group (\S+) (in|out)$/i, m => `applies ACL ${m[1]} to traffic ${m[2] === 'in' ? 'entering' : 'leaving'} this interface.`],
  [/^ntp server (\S+)$/i, m => `syncs this device's clock to NTP server ${m[1]} (UDP 123).`],
  [/^ntp master ?(\d+)?$/i, m => `makes this device an authoritative NTP source${m[1] ? ` at stratum ${m[1]}` : ''}.`],
  [/^ip dhcp excluded-address (\S+) ?(\S+)?$/i, m => `DHCP will never lease ${m[2] ? `${m[1]}–${m[2]}` : m[1]} (protects statics like gateways).`],
  [/^ip dhcp pool (\S+)$/i, m => `creates DHCP pool "${m[1]}" and enters its config mode.`],
  [/^default-router (\S+)$/i, m => `clients get ${m[1]} as their default gateway.`],
  [/^dns-server (\S+)$/i, m => `clients get ${m[1]} as their DNS server.`],
  [/^ip helper-address (\S+)$/i, m => `relays client DHCP broadcasts as unicast to the real server at ${m[1]}.`],
  [/^ip dhcp snooping$/i, () => 'enables DHCP snooping globally (nothing filters until VLANs are scoped).'],
  [/^ip dhcp snooping vlan (\S+)$/i, m => `activates snooping in VLAN(s) ${m[1]}.`],
  [/^ip dhcp snooping trust$/i, () => 'marks this port trusted — DHCP server replies (OFFER/ACK) are allowed in here.'],
  [/^logging host (\S+)$|^logging (\d+\.\S+)$/i, m => `sends syslog messages to the server at ${m[1] || m[2]} (UDP 514).`],
  [/^logging trap (\S+)$/i, m => `exports only severity ${m[1]} and worse to syslog servers.`],
  [/^logging buffered (\d+)$/i, m => `keeps a ${m[1]}-byte log buffer in RAM (read with "show logging").`],
  [/^ip domain-name (\S+)$/i, m => `sets domain "${m[1]}" — required before RSA keys can be generated (key name = hostname.domain).`],
  [/^crypto key generate rsa( modulus (\d+))?$/i, m => `generates the RSA keypair SSH encrypts with${m[2] ? ` (${m[2]}-bit)` : ''}; needs hostname + domain first.`],
  [/^ip ssh version 2$/i, () => 'enforces SSHv2 only (v1 has known weaknesses); needs RSA keys ≥768 bits.'],
  [/^username (\S+) secret (\S+)$/i, m => `creates local user "${m[1]}" with a hashed password, for "login local".`],
  [/^ip nat inside$/i, () => 'marks this interface as facing the private/inside network for NAT.'],
  [/^ip nat outside$/i, () => 'marks this interface as facing the public/outside network for NAT.'],
  [/^ip nat inside source static (\S+) (\S+)$/i, m => `one-to-one NAT: inside host ${m[1]} appears externally as ${m[2]}, both directions.`],
  [/^ip nat inside source list (\S+) interface (\S+) overload$/i, m => `PAT: sources matching ACL ${m[1]} share ${m[2]}'s address, multiplexed by port number.`],
  [/^no cdp run$/i, () => 'disables CDP device-wide — stops advertising platform/IP details to neighbors.'],
  [/^cdp run$/i, () => 'enables CDP globally (Cisco-proprietary discovery, on by default).'],
  [/^lldp run$/i, () => 'enables LLDP globally (IEEE-standard discovery, OFF by default on Cisco gear).'],
  [/^clear mac address-table dynamic$/i, () => 'flushes learned MAC entries; the table repopulates as traffic flows.'],
  [/^exit$/i, () => 'backs out one mode level (e.g., interface → global config).'],
  [/^end$/i, () => 'jumps all the way back to privileged EXEC from any config mode.'],
  [/^ping (\S+)$/i, m => `sends ICMP echo requests to ${m[1]} — the fundamental reachability test.`],
  [/^traceroute (\S+)$|^tracert (\S+)$/i, m => `maps the router-by-router path to ${m[1] || m[2]}.`],
  [/^ipconfig \/renew$/i, () => 'releases and re-requests a DHCP lease (the DORA exchange).'],
  [/^ipconfig( \/all)?$/i, m => `displays this host's IP configuration${m[1] ? ' including MAC and DHCP details' : ''}.`],
  [/^show running-config$|^sh run/i, () => 'displays the live config in RAM.'],
  [/^show (.+)$/i, m => `displays ${m[1]} — read-only, safe anytime.`],
];
function maskLen(m) { try { return ND.mask2len(m); } catch { return '?'; } }
function explainCmd(cmd) {
  const c = cmd.trim();
  for (const [re, fn] of EXPLAIN_RULES) {
    const m = c.match(re);
    if (m) return fn(m);
  }
  return 'IOS command — type it exactly as shown.';
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
