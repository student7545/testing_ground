/* NetDrill cmds — IOS command parser: modes, abbreviation, "?", tab-complete. */
'use strict';
(function () {
const ND = window.ND;

ND.PROMPT_SUFFIX = {
  exec: '>', priv: '#', conf: '(config)#', if: '(config-if)#', subif: '(config-subif)#',
  line: '(config-line)#', vlan: '(config-vlan)#', router: '(config-router)#',
  dhcp: '(dhcp-config)#', 'acl-std': '(config-std-nacl)#', 'acl-ext': '(config-ext-nacl)#',
};
ND.promptFor = function (dev) {
  if (dev.type === 'pc') return `C:\\> `;
  const s = dev.sess;
  if (s.pendingAuth) return 'Password: ';
  let mode = s.mode;
  if (mode === 'if' && s.ifaceRange && s.ifaceRange.length === 1 && s.ifaceRange[0].name.includes('.')) mode = 'subif';
  return dev.hostname + (ND.PROMPT_SUFFIX[mode] || '>');
};
ND.isPasswordPrompt = dev => dev.type !== 'pc' && !!dev.sess.pendingAuth;

/* ---------- pattern matching ---------- */
const PLACE = { IP: 'A.B.C.D', WILD: 'A.B.C.D', MASK: 'A.B.C.D', NUM: '<1-65535>', WORD: 'WORD', REST: 'LINE', MAC: 'H.H.H', IFACE: 'interface' };
function isPlaceholder(t) { return t in PLACE; }
function placeOk(t, tok) {
  if (t === 'IP' || t === 'WILD' || t === 'MASK') return ND.isIp(tok);
  if (t === 'NUM') return /^\d+$/.test(tok);
  if (t === 'MAC') return /^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/i.test(tok);
  return true;
}

/* Match input tokens against a spec pattern.
   Returns null, or {caps, litCount, exact, incomplete} */
function matchSpec(pat, toks) {
  const caps = [];
  let pi = 0, ti = 0, litCount = 0, exact = 0;
  const lits = [];
  while (pi < pat.length) {
    const p = pat[pi];
    if (p === 'REST') {
      if (ti >= toks.length) return { caps, litCount, exact, lits, incomplete: true };
      caps.push(toks.slice(ti).join(' '));
      return { caps, litCount, exact, lits, incomplete: false };
    }
    if (ti >= toks.length) return { caps, litCount, exact, lits, incomplete: true };
    const tok = toks[ti];
    if (isPlaceholder(p)) {
      if (!placeOk(p, tok)) return null;
      caps.push(tok);
    } else {
      const lit = p.toLowerCase(), t = tok.toLowerCase();
      if (!lit.startsWith(t)) return null;
      if (lit === t) exact++;
      litCount++; lits.push(lit);
    }
    pi++; ti++;
  }
  if (ti < toks.length) return null; // extra input
  return { caps, litCount, exact, lits, incomplete: false };
}

/* Given mode + toks, find best spec. */
function findSpecs(specs, toks) {
  const full = [], partial = [];
  for (const spec of specs) {
    const m = matchSpec(spec.pat, toks);
    if (!m) continue;
    if (m.incomplete) partial.push({ spec, m });
    else full.push({ spec, m });
  }
  return { full, partial };
}

function resolve(specs, toks) {
  const { full, partial } = findSpecs(specs, toks);
  if (full.length) {
    // prefer most literals matched, then most exact-literal matches
    full.sort((a, b) => b.m.litCount - a.m.litCount || b.m.exact - a.m.exact);
    const best = full[0];
    const rivals = full.filter(x => x.m.litCount === best.m.litCount && x.m.exact === best.m.exact);
    if (rivals.length > 1) {
      const sigs = new Set(rivals.map(x => x.m.lits.join(' ')));
      if (sigs.size > 1) return { err: 'ambiguous' };
    }
    return { spec: best.spec, caps: best.m.caps };
  }
  if (partial.length) return { err: 'incomplete' };
  return { err: 'invalid' };
}

/* ---------- registry ---------- */
const REG = { exec: [], priv: [], conf: [], if: [], line: [], vlan: [], router: [], dhcp: [], 'acl-std': [], 'acl-ext': [], pc: [] };
function cmd(modes, pattern, desc, run) {
  const pat = pattern.split(/\s+/);
  for (const m of modes) REG[m].push({ pat, desc, run, modes });
}
ND._REG = REG;

function specsFor(dev) {
  const mode = dev.sess.mode;
  if (dev.type === 'pc') return REG.pc;
  if (mode === 'exec') return REG.exec;
  if (mode === 'priv') return REG.priv.concat(REG.exec.filter(s => s.pat[0] !== 'enable'));
  return REG[mode] || REG.conf;
}

/* ---------- main entry ---------- */
ND.execLine = function (topo, dev, rawLine, out) {
  const line = rawLine.replace(/\s+$/, '');
  const s = dev.sess;

  if (s.pendingAuth) {
    const auth = s.pendingAuth;
    if (auth.type === 'enable') {
      const ok = (dev.enableSecret && line === dev.enableSecret) || (!dev.enableSecret && dev.enablePassword && line === dev.enablePassword);
      if (ok) { s.pendingAuth = null; s.mode = 'priv'; }
      else {
        auth.tries++;
        if (auth.tries >= 3) { s.pendingAuth = null; out('% Bad secrets', 'err'); }
      }
    }
    return;
  }

  if (!line.trim() || line.trim().startsWith('!')) return;
  const toks = line.trim().split(/\s+/);

  // "do" from any config mode
  if (dev.type !== 'pc' && !['exec', 'priv'].includes(s.mode) && toks[0].toLowerCase() === 'do' && toks.length > 1) {
    const r = resolve(REG.priv.concat(REG.exec), toks.slice(1));
    if (r.err) return err(r.err, out, line);
    r.spec.run({ topo, dev, out, s }, r.caps);
    return;
  }

  let specs = specsFor(dev);
  let r = resolve(specs, toks);

  // config submodes fall back to global config commands (IOS behavior)
  if (r.err === 'invalid' && !['exec', 'priv', 'conf'].includes(s.mode) && dev.type !== 'pc' && s.mode !== 'pc') {
    const r2 = resolve(REG.conf, toks);
    if (!r2.err) {
      exitToConf(dev);
      r2.spec.run({ topo, dev, out, s }, r2.caps);
      return;
    }
  }
  if (r.err) return err(r.err, out, line);
  r.spec.run({ topo, dev, out, s }, r.caps);
};

function err(kind, out, line) {
  if (kind === 'ambiguous') out(`% Ambiguous command:  "${line.trim()}"`, 'err');
  else if (kind === 'incomplete') out('% Incomplete command.', 'err');
  else out(`% Invalid input detected at '^' marker.`, 'err');
}

function exitToConf(dev) {
  const s = dev.sess;
  s.mode = 'conf'; s.iface = null; s.ifaceRange = null; s.line = null; s.vlan = null; s.pool = null; s.acl = null;
}

/* ---------- help (?) ---------- */
ND.helpFor = function (topo, dev, lineBeforeQ) {
  const specs = specsFor(dev);
  const endsWithSpace = /\s$/.test(lineBeforeQ) || lineBeforeQ === '';
  const toks = lineBeforeQ.trim() === '' ? [] : lineBeforeQ.trim().split(/\s+/);
  const opts = new Map();
  const consider = dev.sess.mode !== 'exec' && dev.sess.mode !== 'priv' && dev.type !== 'pc'
    ? specs.concat(REG.conf.filter(() => dev.sess.mode !== 'conf')) : specs;

  const prefix = endsWithSpace ? toks : toks.slice(0, -1);
  // exact keyword matches beat prefix matches at each position (IOS behavior)
  const exactAt = prefix.map(() => new Set());
  for (const spec of consider) {
    let pi = 0;
    for (let k = 0; k < prefix.length; k++) {
      const p = spec.pat[pi], t = prefix[k].toLowerCase();
      if (p === undefined || p === 'REST') break;
      if (isPlaceholder(p)) { if (!placeOk(p, prefix[k])) break; }
      else {
        if (!p.toLowerCase().startsWith(t)) break;
        if (p.toLowerCase() === t) exactAt[k].add(t);
      }
      pi++;
    }
  }
  for (const spec of consider) {
    // walk pattern against prefix
    let pi = 0, ok = true;
    for (let k = 0; k < prefix.length; k++) {
      const t = prefix[k];
      const p = spec.pat[pi];
      if (p === undefined) { ok = false; break; }
      if (p === 'REST') { pi = spec.pat.length; break; }
      if (isPlaceholder(p)) { if (!placeOk(p, t)) { ok = false; break; } }
      else if (!p.toLowerCase().startsWith(t.toLowerCase())) { ok = false; break; }
      else if (p.toLowerCase() !== t.toLowerCase() && exactAt[k].size) { ok = false; break; }
      pi++;
    }
    if (!ok) continue;
    const next = pi < spec.pat.length ? spec.pat[pi] : '<cr>';
    let label = next === '<cr>' ? '<cr>' : isPlaceholder(next) ? PLACE[next] : next.toLowerCase();
    if (!endsWithSpace && toks.length) {
      const partial = toks[toks.length - 1].toLowerCase();
      if (label === '<cr>') continue;
      if (isPlaceholder(next)) { /* show placeholder */ }
      else if (!label.startsWith(partial)) continue;
    }
    if (!opts.has(label)) opts.set(label, spec.desc || '');
  }
  if (!opts.size) return ['% Unrecognized command'];
  const width = Math.max(...[...opts.keys()].map(k => k.length)) + 2;
  return [...opts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, d]) => '  ' + k.padEnd(width) + d);
};

/* ---------- tab completion ---------- */
ND.completeFor = function (topo, dev, line) {
  if (/\s$/.test(line) || !line.trim()) return null;
  const toks = line.trim().split(/\s+/);
  const partial = toks[toks.length - 1].toLowerCase();
  const prefix = toks.slice(0, -1);
  const specs = specsFor(dev);
  const cands = new Set();
  for (const spec of specs) {
    let pi = 0, ok = true;
    for (const t of prefix) {
      const p = spec.pat[pi];
      if (p === undefined || p === 'REST') { ok = false; break; }
      if (isPlaceholder(p)) { if (!placeOk(p, t)) { ok = false; break; } }
      else if (!p.toLowerCase().startsWith(t.toLowerCase())) { ok = false; break; }
      pi++;
    }
    if (!ok || pi >= spec.pat.length) continue;
    const p = spec.pat[pi];
    if (!isPlaceholder(p) && p.toLowerCase().startsWith(partial)) cands.add(p.toLowerCase());
  }
  if (cands.size === 1) {
    toks[toks.length - 1] = [...cands][0];
    return toks.join(' ') + ' ';
  }
  return null;
};

/* ================= EXEC / PRIV commands ================= */
cmd(['exec'], 'enable', 'Turn on privileged commands', (c) => {
  if (c.dev.enableSecret || c.dev.enablePassword) c.s.pendingAuth = { type: 'enable', tries: 0 };
  else c.s.mode = 'priv';
});
cmd(['priv'], 'enable', 'Turn on privileged commands', () => {});
cmd(['priv'], 'disable', 'Turn off privileged commands', (c) => { c.s.mode = 'exec'; });
cmd(['exec', 'priv'], 'exit', 'Exit from the EXEC', (c) => { c.out('\n' + (c.dev.banner ? c.dev.banner + '\n' : '') + c.dev.hostname + ' con0 is now available', 'sys'); c.s.mode = 'exec'; });
cmd(['exec', 'priv'], 'logout', 'Exit from the EXEC', (c) => { c.s.mode = 'exec'; });

cmd(['priv'], 'configure terminal', 'Enter configuration mode', (c) => {
  c.out('Enter configuration commands, one per line.  End with CNTL/Z.');
  c.s.mode = 'conf';
});
cmd(['priv'], 'copy running-config startup-config', 'Copy from current system configuration', (c) => {
  c.out('Destination filename [startup-config]? ');
  c.dev.startup = ND.runningConfig(c.topo, c.dev);
  c.dev.saved = true;
  c.out('Building configuration...\n[OK]');
});
cmd(['priv'], 'write memory', 'Write to NV memory', (c) => {
  c.dev.startup = ND.runningConfig(c.topo, c.dev); c.dev.saved = true;
  c.out('Building configuration...\n[OK]');
});
cmd(['priv'], 'write', 'Write running configuration to memory', (c) => {
  c.dev.startup = ND.runningConfig(c.topo, c.dev); c.dev.saved = true;
  c.out('Building configuration...\n[OK]');
});
cmd(['priv'], 'erase startup-config', 'Erase contents of configuration memory', (c) => {
  c.out('Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]');
  c.dev.startup = null; c.dev.saved = false;
  c.out('[OK]\nErase of nvram: complete');
});
cmd(['priv'], 'reload', 'Halt and perform a cold restart', (c) => {
  if (!c.dev.saved) c.out('System configuration has been modified. Save? [yes/no]: (simulated: continuing)');
  c.out('Proceed with reload? [confirm]\n\n*** Simulated reload — running config kept for practice. Use the Reset Lab button for a true wipe. ***', 'sys');
  c.s.mode = 'exec';
});
cmd(['priv'], 'clear mac address-table dynamic', 'Clear dynamic MAC entries', (c) => { c.dev.macTable = []; });
cmd(['priv'], 'terminal length NUM', 'Set number of lines on a screen', () => {});

/* ---- ping / traceroute ---- */
function doPing(c, ip) {
  if (!ND.isIp(ip)) { c.out('Translating "' + ip + '"...domain server (255.255.255.255)\n% Unrecognized host or address.', 'err'); return; }
  const res = ND.tracePacket(c.topo, c.dev, ip, { proto: 'icmp', learn: true });
  c.out('Type escape sequence to abort.');
  c.out(`Sending 5, 100-byte ICMP Echos to ${ip}, timeout is 2 seconds:`);
  if (res.ok) c.out('!!!!!\nSuccess rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms');
  else if (res.reason === 'acl') c.out('U.U.U\nSuccess rate is 0 percent (0/5)');
  else c.out('.....\nSuccess rate is 0 percent (0/5)');
}
cmd(['exec', 'priv'], 'ping WORD', 'Send echo messages', (c, a) => doPing(c, a[0]));
cmd(['exec', 'priv'], 'traceroute WORD', 'Trace route to destination', (c, a) => {
  const ip = a[0];
  if (!ND.isIp(ip)) return c.out('% Unrecognized host or address.', 'err');
  const res = ND.tracePacket(c.topo, c.dev, ip, { proto: 'icmp', learn: true });
  c.out(`Type escape sequence to abort.\nTracing the route to ${ip}\n`);
  if (res.ok) {
    let n = 1;
    for (const id of res.path.slice(1)) {
      const d = c.topo.devs[id];
      const addr = id === res.path[res.path.length - 1] ? ip : (ND.devIps(c.topo, d)[0] || {}).ip || '?';
      c.out(`  ${n++} ${addr} 1 msec 2 msec 1 msec`);
    }
  } else c.out('  1  *  *  *\n  2  *  *  *');
});

/* ================= SHOW commands ================= */
const show = (pattern, desc, fn) => cmd(['exec', 'priv'], pattern, desc, fn);
show('show running-config', 'Current operating configuration', c => c.out(ND.runningConfig(c.topo, c.dev)));
show('show startup-config', 'Contents of startup configuration', c => c.out(c.dev.startup || 'startup-config is not present'));
show('show version', 'System hardware and software status', c => c.out(ND.showVersion(c.dev)));
show('show clock', 'Display the system clock', c => {
  const sync = c.dev.ntp.master || (c.dev.ntp.servers.length && ND.showNtp(c.topo, c.dev).startsWith('Clock is sync'));
  c.out(`${sync ? '' : '*'}12:34:56.789 UTC ${new Date().toDateString().slice(0, 10)} ${new Date().getFullYear()}`);
});
show('show history', 'Display the session command history', c => c.out(c.s.history.slice(-10).join('\n')));
show('show ip interface brief', 'Brief summary of IP status and configuration', c => c.out(ND.showIpIntBrief(c.topo, c.dev)));
show('show ip interface REST', 'IP interface status and configuration', (c, a) => {
  const i = ND.getIface(c.dev, a[0]);
  if (!i) return c.out('% Invalid interface', 'err');
  const up = ND.ifaceUp(c.topo, c.dev, i);
  c.out(`${i.name} is ${i.shutdown ? 'administratively down' : up ? 'up' : 'down'}, line protocol is ${up && !i.shutdown ? 'up' : 'down'}`);
  c.out(i.ip ? `  Internet address is ${i.ip.addr}/${ND.mask2len(i.ip.mask)}` : '  Internet protocol processing disabled');
  c.out(`  Outgoing access list is ${i.aclOut || 'not set'}`);
  c.out(`  Inbound  access list is ${i.aclIn || 'not set'}`);
  if (i.helpers.length) c.out(`  Helper address is ${i.helpers.join(', ')}`);
});
show('show ip route', 'IP routing table', c => c.out(ND.showIpRoute(c.topo, c.dev)));
show('show ip protocols', 'IP routing protocol process parameters', c => {
  if (!c.dev.ospf) return c.out('');
  const o = c.dev.ospf;
  c.out(`Routing Protocol is "ospf ${o.pid}"`);
  c.out(`  Router ID ${ND.routerId(c.topo, c.dev)}`);
  c.out(`  Number of areas in this router is 1`);
  c.out('  Routing for Networks:');
  for (const n of o.networks) c.out(`    ${n.net} ${n.wild} area ${n.area}`);
  const pass = o.passiveDefault ? ['default'] : o.passive;
  if (pass.length) { c.out('  Passive Interface(s):'); for (const p of pass) c.out(`    ${p}`); }
  c.out(`  Maximum path: ${o.maxPaths}`);
  c.out('  Distance: (default is 110)');
});
show('show ip ospf neighbor', 'OSPF neighbor list', c => c.out(ND.showOspfNeighbor(c.topo, c.dev)));
show('show ip ospf', 'OSPF information', c => {
  if (!c.dev.ospf) return c.out('');
  c.out(`Routing Process "ospf ${c.dev.ospf.pid}" with ID ${ND.routerId(c.topo, c.dev)}`);
  c.out(`Reference bandwidth unit is ${c.dev.ospf.refBw} mbps`);
});
show('show ip ospf interface brief', 'Brief OSPF interface information', c => {
  const L = ['Interface    PID   Area            IP Address/Mask    Cost  State Nbrs F/C'];
  for (const i of Object.values(c.dev.ifaces)) {
    const en = ND.ospfEnabledOn(c.dev, i);
    if (!en || !i.ip) continue;
    const nbrs = ND.ospfNeighbors(c.topo, c.dev).filter(n => n.ifc === i).length;
    const cost = i.ospf.cost ?? (/^Loopback/.test(i.name) ? 1 : 1);
    L.push(`${ND.shortIface(i.name).padEnd(13)}${String(en.pid).padEnd(6)}${String(en.area).padEnd(16)}${(i.ip.addr + '/' + ND.mask2len(i.ip.mask)).padEnd(19)}${String(cost).padEnd(6)}${/^Lo/.test(ND.shortIface(i.name)) ? 'LOOP ' : (nbrs ? 'BDR  ' : 'DR   ')}${nbrs}/${nbrs}`);
  }
  c.out(L.join('\n'));
});
show('show ip dhcp binding', 'DHCP address bindings', c => {
  const L = ['IP address       Client-ID/              Lease expiration        Type', '                 Hardware address'];
  for (const dev of Object.values(c.topo.devs)) {
    if (dev.type !== 'pc' || !dev.pcCfg.dhcp) continue;
    const net = ND.pcNet(c.topo, dev);
    if (net.ip && net.server === c.dev) {
      const mac = Object.values(dev.ifaces)[0].mac;
      L.push(`${net.ip.padEnd(17)}${('01' + mac.replace(/\./g, '')).replace(/(..)/g, '$1.').slice(0, 20).padEnd(24)}Sep 18 2026 12:00 PM    Automatic`);
    }
  }
  c.out(L.join('\n'));
});
show('show ip dhcp snooping', 'DHCP snooping configuration', c => {
  const sn = c.dev.dhcp.snooping;
  c.out(`Switch DHCP snooping is ${sn.enabled ? 'enabled' : 'disabled'}`);
  c.out(`DHCP snooping is configured on following VLANs:\n${sn.vlans.length ? ND.fmtVlanList(sn.vlans) : 'none'}`);
  c.out('Insertion of option 82 is enabled');
  const trusted = Object.values(c.dev.ifaces).filter(i => i.snoopTrust);
  c.out('Interface                  Trusted    Rate limit (pps)\n-----------------------    -------    ----------------');
  for (const i of trusted) c.out(`${i.name.padEnd(27)}yes        unlimited`);
});
show('show ip nat translations', 'Translation entries', c => {
  const L = ['Pro  Inside global      Inside local       Outside local      Outside global'];
  for (const t of ND.natTranslations(c.topo, c.dev)) L.push(`---  ${t.global.padEnd(19)}${t.inside.padEnd(19)}---                ---`);
  c.out(L.join('\n'));
});
show('show ip ssh', 'SSH server status', c => {
  c.out(`SSH ${c.dev.rsaKey ? 'Enabled' : 'Disabled'} - version ${c.dev.sshVersion === 2 ? '2.0' : '1.99'}`);
  c.out(`Authentication timeout: 120 secs; Authentication retries: 3`);
});
show('show ssh', 'SSH connections', c => c.out('%No SSHv2 server connections running.'));
show('show ipv6 interface brief', 'Brief IPv6 interface status', c => c.out(ND.showIpv6IntBrief(c.topo, c.dev)));
show('show ipv6 route', 'IPv6 routing table', c => {
  const L = ['IPv6 Routing Table - default - entries', 'Codes: C - Connected, L - Local, S - Static'];
  for (const i of Object.values(c.dev.ifaces)) {
    if (!ND.ifaceUp(c.topo, c.dev, i)) continue;
    for (const a of i.ipv6) { L.push(`C   ${a.addr.replace(/::[^:]*$/, '::')}/${a.len} [0/0]`); L.push(`     via ${i.name}, directly connected`); }
  }
  for (const r of c.dev.v6Routes) { L.push(`S   ${r.prefix}/${r.len} [1/0]`); L.push(`     via ${r.via}`); }
  c.out(L.join('\n'));
});
show('show interfaces status', 'Interface line status', c => c.out(ND.showIntStatus(c.topo, c.dev)));
show('show interfaces trunk', 'Trunk interface status', c => c.out(ND.showIntTrunk(c.topo, c.dev)));
show('show interfaces switchport', 'Switchport information', c => {
  for (const i of Object.values(c.dev.ifaces)) {
    if (!/^(Gigabit|Fast|Ten|Ether)/.test(i.name) || i.parent) continue;
    const oper = ND.operMode(c.topo, c.dev, i);
    c.out(`Name: ${ND.shortIface(i.name)}\nSwitchport: Enabled\nAdministrative Mode: ${i.swMode === 'dynamic' ? 'dynamic ' + i.dtp : i.swMode}\nOperational Mode: ${ND.ifaceUp(c.topo, c.dev, i) ? (oper === 'trunk' ? 'trunk' : 'static access') : 'down'}\nNegotiation of Trunking: ${i.nonegotiate ? 'Off' : 'On'}\nAccess Mode VLAN: ${i.accessVlan} (${c.dev.vlans[i.accessVlan] ? c.dev.vlans[i.accessVlan].name : 'Inactive'})\nTrunking Native Mode VLAN: ${i.nativeVlan}\nVoice VLAN: ${i.voiceVlan || 'none'}\n`);
  }
});
show('show interfaces REST', 'Interface status and configuration', (c, a) => {
  const i = ND.getIface(c.dev, a[0]);
  if (!i) return c.out(`% Invalid input detected at '^' marker.`, 'err');
  const up = ND.ifaceUp(c.topo, c.dev, i);
  c.out(`${i.name} is ${i.shutdown ? 'administratively down' : i.errDisabled ? 'down (err-disabled)' : up ? 'up' : 'down'}, line protocol is ${up && !i.shutdown ? 'up' : 'down'}`);
  c.out(`  Hardware is Gigabit Ethernet, address is ${i.mac} (bia ${i.mac})`);
  if (i.desc) c.out(`  Description: ${i.desc}`);
  if (i.ip) c.out(`  Internet address is ${i.ip.addr}/${ND.mask2len(i.ip.mask)}`);
  c.out(`  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec,`);
  c.out(`  ${i.duplex === 'auto' ? 'Full-duplex' : i.duplex + '-duplex'}, ${i.speed === 'auto' ? '1000Mb/s' : i.speed + 'Mb/s'}`);
  c.out(`  5 minute input rate 0 bits/sec, 0 packets/sec`);
});
show('show vlan brief', 'VLAN summary', c => c.out(ND.showVlanBrief(c.topo, c.dev)));
show('show vlan', 'VTP VLAN status', c => c.out(ND.showVlanBrief(c.topo, c.dev)));
show('show mac address-table', 'MAC forwarding table', c => c.out(ND.showMacTable(c.topo, c.dev)));
show('show cdp neighbors detail', 'Detailed CDP neighbor information', c => {
  for (const n of ND.cdpNeighbors(c.topo, c.dev)) {
    const ip = (ND.devIps(c.topo, n.dev)[0] || {}).ip;
    c.out(`-------------------------\nDevice ID: ${n.dev.hostname}\nEntry address(es):\n  IP address: ${ip || 'unknown'}\nPlatform: cisco ${n.dev.type === 'router' ? 'ISR4321' : 'WS-C2960'},  Capabilities: ${n.dev.type === 'router' ? 'Router' : 'Switch'}\nInterface: ${n.local},  Port ID (outgoing port): ${n.remote}\nHoldtime : 154 sec`);
  }
});
show('show cdp neighbors', 'CDP neighbor entries', c => c.out(ND.showCdpNeighbors(c.topo, c.dev)));
show('show cdp', 'CDP information', c => c.out(c.dev.cdp ? 'Global CDP information:\n        Sending CDP packets every 60 seconds\n        Sending a holdtime value of 180 seconds\n        Sending CDPv2 advertisements is  enabled' : '% CDP is not enabled'));
show('show lldp neighbors', 'LLDP neighbor entries', c => c.out(c.dev.lldp ? ND.showLldpNeighbors(c.topo, c.dev) : '% LLDP is not enabled'));
show('show lldp', 'LLDP information', c => c.out(c.dev.lldp ? 'Global LLDP Information:\n    Status: ACTIVE\n    LLDP advertisements are sent every 30 seconds' : '% LLDP is not enabled'));
show('show spanning-tree', 'Spanning tree topology', c => {
  const dev = c.dev;
  if (dev.type !== 'switch') return c.out('% This command is only supported on switches', 'err');
  const vlans = Object.keys(dev.vlans).map(Number).filter(v => v < 1002).sort((a, b) => a - b);
  for (const v of vlans) {
    const root = ND.stpRoot(c.topo, v);
    const myPrio = (dev.stp.prio[v] ?? 32768) + v;
    const isRoot = root && root.dev === dev;
    c.out(`VLAN${String(v).padStart(4, '0')}`);
    c.out(`  Spanning tree enabled protocol ${dev.stp.mode === 'rapid' ? 'rstp' : 'ieee'}`);
    c.out(`  Root ID    Priority    ${root ? root.prio : myPrio}`);
    c.out(`             Address     ${root ? root.mac : '0000.0000.0000'}`);
    c.out(isRoot ? '             This bridge is the root' : `             Cost        4`);
    c.out(`  Bridge ID  Priority    ${myPrio}  (priority ${dev.stp.prio[v] ?? 32768} sys-id-ext ${v})`);
    c.out('');
    c.out('Interface           Role Sts Cost      Prio.Nbr Type');
    c.out('------------------- ---- --- --------- -------- --------------------------------');
    for (const i of Object.values(dev.ifaces)) {
      if (!/^(Gigabit|Fast)/.test(i.name) || !ND.ifaceUp(c.topo, dev, i)) continue;
      const mode = ND.operMode(c.topo, dev, i);
      if (mode === 'access' && i.accessVlan !== v) continue;
      if (mode === 'trunk' && !ND.allowedOnTrunk(i, v)) continue;
      const pf = i.stpPortfast || (dev.stp.portfastDefault && mode === 'access');
      const role = isRoot ? 'Desg' : 'Root';
      c.out(`${ND.shortIface(i.name).padEnd(20)}${role} FWD 4         128.${1 + Object.keys(dev.ifaces).indexOf(i.name)}    P2p${pf ? ' Edge' : ''}`);
    }
    c.out('');
  }
});
show('show etherchannel summary', 'EtherChannel summary', c => c.out(ND.showEtherchannel(c.topo, c.dev)));
show('show standby brief', 'HSRP brief status', c => c.out(ND.showStandbyBrief(c.topo, c.dev)));
show('show standby', 'HSRP information', c => c.out(ND.showStandbyBrief(c.topo, c.dev)));
show('show port-security interface REST', 'Port-security interface detail', (c, a) => c.out(ND.showPortSec(c.topo, c.dev, a[0])));
show('show port-security', 'Port security status', c => c.out(ND.showPortSec(c.topo, c.dev)));
show('show access-lists', 'Access list contents', c => c.out(ND.showAccessLists(c.dev)));
show('show vtp status', 'VTP domain status', c => c.out(ND.showVtp(c.dev)));
show('show ntp status', 'NTP status', c => c.out(ND.showNtp(c.topo, c.dev)));
show('show ntp associations', 'NTP associations', c => {
  const L = ['  address         ref clock       st   when   poll reach  delay  offset   disp'];
  for (const s of c.dev.ntp.servers) L.push(`*~${s.padEnd(16)}127.127.1.1      8     32     64   377  1.000   0.500   0.2`);
  if (c.dev.ntp.master) L.push(`*~127.127.1.1     .LOCL.           ${c.dev.ntp.master === true ? 8 : c.dev.ntp.master - 1}     16     64   377  0.000   0.000   0.0`);
  c.out(L.join('\n'));
});
show('show logging', 'Show logging configuration', c => {
  c.out(`Syslog logging: enabled`);
  c.out(`    Console logging: ${c.dev.logging.console ? 'level debugging' : 'disabled'}`);
  c.out(`    Buffer logging: ${c.dev.logging.buffered ? 'level debugging, buffer size ' + c.dev.logging.buffered : 'disabled'}`);
  c.out(`    Trap logging: level ${c.dev.logging.trap}`);
  for (const h of c.dev.logging.hosts) c.out(`        Logging to ${h} (udp port 514)`);
});
show('show users', 'Users on terminal lines', c => c.out('    Line       User       Host(s)              Idle       Location\n*  0 con 0                idle                 00:00:00'));

window.ND = ND;
})();
