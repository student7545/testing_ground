/* NetDrill cmds2 — global config, interface, line, vlan, router, dhcp, acl, PC. */
'use strict';
(function () {
const ND = window.ND;
const REG = ND._REG;
function cmd(modes, pattern, desc, run) {
  const pat = pattern.split(/\s+/);
  for (const m of modes) REG[m].push({ pat, desc, run, modes });
}
const eachIf = (c, fn) => { for (const i of (c.s.ifaceRange || [])) fn(i); };

/* ---------- mode exits ---------- */
const SUB = ['if', 'line', 'vlan', 'router', 'dhcp', 'acl-std', 'acl-ext'];
cmd(['conf'], 'exit', 'Exit from configure mode', c => { c.s.mode = 'priv'; });
cmd(SUB, 'exit', 'Exit from current mode', c => { c.s.mode = 'conf'; c.s.ifaceRange = null; c.s.line = null; c.s.vlan = null; c.s.pool = null; c.s.acl = null; });
cmd(['conf', ...SUB], 'end', 'Exit from configure mode', c => { c.s.mode = 'priv'; c.s.ifaceRange = null; c.s.line = null; c.s.vlan = null; c.s.pool = null; c.s.acl = null; });

/* ---------- global config ---------- */
cmd(['conf'], 'hostname WORD', "Set system's network name", (c, a) => { c.dev.hostname = a[0]; });
cmd(['conf'], 'enable secret WORD', 'Assign the privileged level secret', (c, a) => { c.dev.enableSecret = a[0]; });
cmd(['conf'], 'enable password WORD', 'Assign the privileged level password', (c, a) => { c.dev.enablePassword = a[0]; });
cmd(['conf'], 'no enable secret', 'Remove the enable secret', c => { c.dev.enableSecret = null; });
cmd(['conf'], 'no enable password', 'Remove the enable password', c => { c.dev.enablePassword = null; });
cmd(['conf'], 'service password-encryption', 'Encrypt system passwords', c => { c.dev.svcEnc = true; });
cmd(['conf'], 'no service password-encryption', 'Stop encrypting passwords', c => { c.dev.svcEnc = false; });
cmd(['conf'], 'banner motd REST', 'Set Message of the Day banner', (c, a) => {
  let t = a[0].trim();
  const delim = t[0];
  t = t.slice(1);
  const endIdx = t.indexOf(delim);
  c.dev.banner = endIdx >= 0 ? t.slice(0, endIdx) : t;
});
cmd(['conf'], 'no banner motd', 'Remove the MOTD banner', c => { c.dev.banner = null; });
cmd(['conf'], 'no ip domain-lookup', 'Disable DNS lookup of unknown commands', c => { c.dev.domainLookup = false; });
cmd(['conf'], 'ip domain-lookup', 'Enable DNS-based host translation', c => { c.dev.domainLookup = true; });
cmd(['conf'], 'ip domain-name WORD', 'Define the default domain name', (c, a) => { c.dev.domainName = a[0]; });
cmd(['conf'], 'ip domain name WORD', 'Define the default domain name', (c, a) => { c.dev.domainName = a[0]; });
cmd(['conf'], 'username WORD secret WORD', 'Establish user with encrypted secret', (c, a) => { c.dev.users[a[0]] = { secret: a[1] }; });
cmd(['conf'], 'username WORD password WORD', 'Establish user with password', (c, a) => { c.dev.users[a[0]] = { secret: a[1], weak: true }; });
cmd(['conf'], 'crypto key generate rsa modulus NUM', 'Generate RSA keys with modulus', (c, a) => {
  if (!c.dev.domainName) return c.out('% Please define a domain-name first.', 'err');
  c.dev.rsaKey = +a[0];
  c.out(`The name for the keys will be: ${c.dev.hostname}.${c.dev.domainName}\n\n% The key modulus size is ${a[0]} bits\n% Generating ${a[0]} bit RSA keys, keys will be non-exportable...[OK]`);
});
cmd(['conf'], 'crypto key generate rsa', 'Generate RSA keys', c => {
  if (!c.dev.domainName) return c.out('% Please define a domain-name first.', 'err');
  c.dev.rsaKey = 1024;
  c.out(`The name for the keys will be: ${c.dev.hostname}.${c.dev.domainName}\nHow many bits in the modulus [512]: 1024\n% Generating 1024 bit RSA keys, keys will be non-exportable...[OK]`);
});
cmd(['conf'], 'ip ssh version NUM', 'Set SSH protocol version', (c, a) => {
  if (a[0] !== '2' && a[0] !== '1') return c.out('% Invalid input', 'err');
  if (a[0] === '2' && (!c.dev.rsaKey || c.dev.rsaKey < 768)) return c.out('Please create RSA keys (of at least 768 bits size) to enable SSH v2.', 'err');
  c.dev.sshVersion = +a[0];
});
cmd(['conf'], 'line console NUM', 'Primary terminal line', c => { c.s.mode = 'line'; c.s.line = 'con'; });
cmd(['conf'], 'line vty NUM NUM', 'Virtual terminal', c => { c.s.mode = 'line'; c.s.line = 'vty'; });
cmd(['conf'], 'line vty NUM', 'Virtual terminal', c => { c.s.mode = 'line'; c.s.line = 'vty'; });

cmd(['conf', 'if'], 'interface range REST', 'Interface range command', (c, a) => {
  const list = ND.parseRange(c.dev, a[0]);
  if (!list) return c.out('% Invalid input detected: bad interface range', 'err');
  c.s.mode = 'if'; c.s.ifaceRange = list;
});
cmd(['conf', 'if'], 'interface REST', 'Select an interface to configure', (c, a) => {
  const ifc = ND.getOrCreateIface(c.dev, a[0].replace(/\s+/g, ''));
  if (!ifc) return c.out(`% Invalid input detected at '^' marker.`, 'err');
  const created = !c.dev.ifaces[ifc.name];
  c.s.mode = 'if'; c.s.ifaceRange = [ifc];
  if (/^Vlan/.test(ifc.name)) c.out(`%LINK-5-CHANGED: Interface ${ifc.name}, changed state to up`, 'sys');
});

cmd(['conf'], 'vlan NUM', 'Add or modify a VLAN', (c, a) => {
  const v = +a[0];
  if (v < 1 || v > 4094) return c.out('% Invalid VLAN id', 'err');
  if (!c.dev.vlans[v]) c.dev.vlans[v] = { name: `VLAN${String(v).padStart(4, '0')}` };
  c.s.mode = 'vlan'; c.s.vlan = v;
});
cmd(['conf'], 'no vlan NUM', 'Delete a VLAN', (c, a) => { delete c.dev.vlans[+a[0]]; });
cmd(['vlan'], 'name WORD', 'Ascii name of the VLAN', (c, a) => { c.dev.vlans[c.s.vlan].name = a[0]; });

cmd(['conf'], 'vtp mode WORD', 'Configure VTP device mode', (c, a) => {
  const m = ['server', 'client', 'transparent', 'off'].find(x => x.startsWith(a[0].toLowerCase()));
  if (!m) return c.out('% Invalid VTP mode', 'err');
  c.dev.vtp.mode = m;
  c.out(`Setting device to VTP ${m.charAt(0).toUpperCase() + m.slice(1)} mode${m === 'transparent' ? '' : ' for VLANS'}.`);
});
cmd(['conf'], 'vtp domain WORD', 'Set the VTP administrative domain name', (c, a) => {
  c.dev.vtp.domain = a[0];
  c.out(`Changing VTP domain name from NULL to ${a[0]}`);
});

cmd(['conf'], 'spanning-tree mode pvst', 'Per-VLAN spanning tree mode', c => { c.dev.stp.mode = 'pvst'; });
cmd(['conf'], 'spanning-tree mode rapid-pvst', 'Per-VLAN rapid spanning tree mode', c => { c.dev.stp.mode = 'rapid'; });
cmd(['conf'], 'spanning-tree vlan WORD priority NUM', 'Set the bridge priority', (c, a) => {
  const vlans = ND.parseVlanList(a[0]);
  const p = +a[1];
  if (!vlans) return c.out('% Invalid VLAN list', 'err');
  if (p % 4096 !== 0 || p > 61440) return c.out('% Bridge Priority must be in increments of 4096.\n% Allowed values are:\n  0     4096  8192  12288 16384 20480 24576 28672\n  32768 36864 40960 45056 49152 53248 57344 61440', 'err');
  for (const v of vlans) c.dev.stp.prio[v] = p;
});
cmd(['conf'], 'spanning-tree vlan WORD root primary', 'Configure switch as root', (c, a) => {
  const vlans = ND.parseVlanList(a[0]);
  if (!vlans) return c.out('% Invalid VLAN list', 'err');
  for (const v of vlans) c.dev.stp.prio[v] = 24576;
});
cmd(['conf'], 'spanning-tree vlan WORD root secondary', 'Configure switch as secondary root', (c, a) => {
  const vlans = ND.parseVlanList(a[0]);
  if (!vlans) return c.out('% Invalid VLAN list', 'err');
  for (const v of vlans) c.dev.stp.prio[v] = 28672;
});
cmd(['conf'], 'spanning-tree portfast default', 'Enable portfast on all access ports', c => { c.dev.stp.portfastDefault = true; });
cmd(['conf'], 'spanning-tree portfast bpduguard default', 'Enable bpduguard by default on portfast ports', c => { c.dev.stp.bpduguardDefault = true; });

cmd(['conf'], 'ip route IP MASK IP NUM', 'Static route with distance', (c, a) => { c.dev.staticRoutes.push({ net: ND.netOf(a[0], a[1]), mask: a[1], via: a[2], ad: +a[3] }); });
cmd(['conf'], 'ip route IP MASK IP', 'Establish static routes', (c, a) => { c.dev.staticRoutes.push({ net: ND.netOf(a[0], a[1]), mask: a[1], via: a[2], ad: 1 }); });
cmd(['conf'], 'ip route IP MASK REST', 'Static route via interface', (c, a) => {
  const ifc = ND.getIface(c.dev, a[2]);
  if (!ifc) return c.out('% Invalid next hop', 'err');
  c.dev.staticRoutes.push({ net: ND.netOf(a[0], a[1]), mask: a[1], via: null, viaIfc: ifc.name, ad: 1 });
});
cmd(['conf'], 'no ip route IP MASK REST', 'Remove a static route', (c, a) => {
  c.dev.staticRoutes = c.dev.staticRoutes.filter(r => !(r.net === ND.netOf(a[0], a[1]) && r.mask === a[1]));
});
cmd(['conf'], 'no ip route IP MASK IP', 'Remove a static route', (c, a) => {
  c.dev.staticRoutes = c.dev.staticRoutes.filter(r => !(r.net === ND.netOf(a[0], a[1]) && r.mask === a[1]));
});
cmd(['conf'], 'ip routing', 'Enable IP routing', c => { c.dev.ipRouting = true; });
cmd(['conf'], 'no ip routing', 'Disable IP routing', c => { c.dev.ipRouting = false; });
cmd(['conf'], 'ip default-gateway IP', 'Specify default gateway', (c, a) => { c.dev.defaultGateway = a[0]; });
cmd(['conf'], 'ip name-server IP', 'Specify address of name server', (c, a) => { c.dev.nameServers.push(a[0]); });
cmd(['conf'], 'ipv6 unicast-routing', 'Enable unicast routing', c => { c.dev.ipv6Routing = true; });
cmd(['conf'], 'no ipv6 unicast-routing', 'Disable unicast routing', c => { c.dev.ipv6Routing = false; });
cmd(['conf'], 'ipv6 route WORD WORD', 'Configure static IPv6 routes', (c, a) => {
  const m = a[0].match(/^([0-9a-f:]+)\/(\d+)$/i);
  if (!m) return c.out('% Invalid prefix', 'err');
  c.dev.v6Routes.push({ prefix: m[1].toUpperCase(), len: +m[2], via: /^[0-9a-f:]+$/i.test(a[1]) ? a[1].toUpperCase() : (ND.normIface(a[1]) || a[1]) });
});

cmd(['conf'], 'router ospf NUM', 'Open Shortest Path First (OSPF)', (c, a) => {
  if (c.dev.type === 'switch' && !c.dev.ipRouting) return c.out('IP routing not enabled', 'err');
  if (!c.dev.ospf || c.dev.ospf.pid !== +a[0]) c.dev.ospf = { pid: +a[0], routerId: null, networks: [], passiveDefault: false, passive: [], noPassive: [], defaultInfo: false, refBw: 100, maxPaths: 4 };
  c.s.mode = 'router';
});
cmd(['conf'], 'no router ospf NUM', 'Remove OSPF process', c => { c.dev.ospf = null; });
cmd(['router'], 'router-id IP', 'router-id for this OSPF process', (c, a) => {
  c.dev.ospf.routerId = a[0];
  c.out('Reload or use "clear ip ospf process" command, for this to take effect (simulated: applied)');
});
cmd(['router'], 'network IP WILD area NUM', 'Enable routing on an IP network', (c, a) => {
  c.dev.ospf.networks.push({ net: a[0], wild: a[1], area: +a[2] });
});
cmd(['router'], 'no network IP WILD area NUM', 'Remove network statement', (c, a) => {
  c.dev.ospf.networks = c.dev.ospf.networks.filter(n => !(n.net === a[0] && n.wild === a[1] && n.area === +a[2]));
});
cmd(['router'], 'passive-interface default', 'Suppress routing updates on all interfaces', c => { c.dev.ospf.passiveDefault = true; c.dev.ospf.passive = []; });
cmd(['router'], 'passive-interface REST', 'Suppress routing updates on an interface', (c, a) => {
  const ifc = ND.getIface(c.dev, a[0]);
  if (!ifc) return c.out('% Invalid interface', 'err');
  if (!c.dev.ospf.passive.includes(ifc.name)) c.dev.ospf.passive.push(ifc.name);
});
cmd(['router'], 'no passive-interface REST', 'Enable routing updates on an interface', (c, a) => {
  const ifc = ND.getIface(c.dev, a[0]);
  if (!ifc) return c.out('% Invalid interface', 'err');
  c.dev.ospf.passive = c.dev.ospf.passive.filter(n => n !== ifc.name);
  if (c.dev.ospf.passiveDefault && !c.dev.ospf.noPassive.includes(ifc.name)) c.dev.ospf.noPassive.push(ifc.name);
});
cmd(['router'], 'default-information originate', 'Distribute a default route', c => { c.dev.ospf.defaultInfo = true; });
cmd(['router'], 'auto-cost reference-bandwidth NUM', 'Set reference bandwidth (Mbps)', (c, a) => {
  c.dev.ospf.refBw = +a[0];
  c.out('% OSPF: Reference bandwidth is changed.\n        Please ensure reference bandwidth is consistent across all routers.');
});
cmd(['router'], 'maximum-paths NUM', 'Forward packets over multiple paths', (c, a) => { c.dev.ospf.maxPaths = +a[0]; });

/* ---------- numbered ACLs ---------- */
cmd(['conf'], 'access-list NUM REST', 'Add an access list entry', (c, a) => {
  const num = +a[0], rest = a[1];
  const type = num <= 99 ? 'standard' : num <= 199 ? 'extended' : null;
  if (!type) return c.out('% Invalid access list number', 'err');
  const e = type === 'standard' ? parseStd(rest) : parseExt(rest);
  if (!e) return c.out(`% Invalid input detected at '^' marker.`, 'err');
  if (!c.dev.acls[num]) c.dev.acls[num] = { type, entries: [], numbered: true };
  e.seq = (c.dev.acls[num].entries.length + 1) * 10;
  c.dev.acls[num].entries.push(e);
});
cmd(['conf'], 'no access-list NUM', 'Remove an access list', (c, a) => { delete c.dev.acls[+a[0]]; });
cmd(['conf'], 'ip access-list standard WORD', 'Standard named access list', (c, a) => {
  if (!c.dev.acls[a[0]]) c.dev.acls[a[0]] = { type: 'standard', entries: [], numbered: false };
  c.s.mode = 'acl-std'; c.s.acl = a[0];
});
cmd(['conf'], 'ip access-list extended WORD', 'Extended named access list', (c, a) => {
  if (!c.dev.acls[a[0]]) c.dev.acls[a[0]] = { type: 'extended', entries: [], numbered: false };
  c.s.mode = 'acl-ext'; c.s.acl = a[0];
});
cmd(['conf'], 'no ip access-list standard WORD', 'Remove named ACL', (c, a) => { delete c.dev.acls[a[0]]; });
cmd(['conf'], 'no ip access-list extended WORD', 'Remove named ACL', (c, a) => { delete c.dev.acls[a[0]]; });
cmd(['acl-std'], 'permit REST', 'Specify packets to forward', (c, a) => addNamed(c, 'permit ' + a[0], parseStd));
cmd(['acl-std'], 'deny REST', 'Specify packets to reject', (c, a) => addNamed(c, 'deny ' + a[0], parseStd));
cmd(['acl-std'], 'NUM permit REST', 'Sequenced permit', (c, a) => addNamed(c, 'permit ' + a[1], parseStd, +a[0]));
cmd(['acl-std'], 'NUM deny REST', 'Sequenced deny', (c, a) => addNamed(c, 'deny ' + a[1], parseStd, +a[0]));
cmd(['acl-ext'], 'permit REST', 'Specify packets to forward', (c, a) => addNamed(c, 'permit ' + a[0], parseExt));
cmd(['acl-ext'], 'deny REST', 'Specify packets to reject', (c, a) => addNamed(c, 'deny ' + a[0], parseExt));
cmd(['acl-ext'], 'NUM permit REST', 'Sequenced permit', (c, a) => addNamed(c, 'permit ' + a[1], parseExt, +a[0]));
cmd(['acl-ext'], 'NUM deny REST', 'Sequenced deny', (c, a) => addNamed(c, 'deny ' + a[1], parseExt, +a[0]));
function addNamed(c, raw, parser, seq) {
  const e = parser(raw);
  if (!e) return c.out(`% Invalid input detected at '^' marker.`, 'err');
  const acl = c.dev.acls[c.s.acl];
  e.seq = seq || (acl.entries.length + 1) * 10;
  acl.entries.push(e);
  acl.entries.sort((x, y) => x.seq - y.seq);
}
function parseAddr(toks) {
  const t = toks.shift();
  if (!t) return null;
  if (t.toLowerCase() === 'any') return { any: true, txt: 'any' };
  if ('host'.startsWith(t.toLowerCase())) {
    const ip = toks.shift();
    if (!ND.isIp(ip)) return null;
    return { host: ip, txt: `host ${ip}` };
  }
  if (!ND.isIp(t)) return null;
  const wild = toks[0] && ND.isIp(toks[0]) ? toks.shift() : '0.0.0.0';
  if (wild === '0.0.0.0') return { host: t, txt: `host ${t}` };
  return { net: t, wild, txt: `${t} ${wild}` };
}
function parseStd(raw) {
  const toks = raw.trim().split(/\s+/);
  const action = toks.shift();
  if (!['permit', 'deny'].includes(action)) return null;
  const src = parseAddr(toks);
  if (!src || toks.length) return null;
  return { action, src, dst: { any: true }, proto: 'ip', raw: `${action} ${src.txt}` };
}
const PORTS = { 21: 'ftp', 22: 22, 23: 'telnet', 53: 'domain', 80: 'www', 443: 443, 67: 'bootps', 123: 123, 514: 514 };
function parseExt(raw) {
  const toks = raw.trim().split(/\s+/);
  const action = toks.shift();
  if (!['permit', 'deny'].includes(action)) return null;
  let proto = toks.shift();
  if (!proto) return null;
  proto = proto.toLowerCase();
  const known = ['ip', 'tcp', 'udp', 'icmp', 'ospf'].find(p => p.startsWith(proto));
  if (!known) return null;
  proto = known;
  const src = parseAddr(toks);
  if (!src) return null;
  // optional source port
  let srcOp = null, srcPort = null;
  if (toks[0] && ['eq', 'gt', 'lt', 'range'].includes(toks[0].toLowerCase())) { srcOp = toks.shift().toLowerCase(); srcPort = portNum(toks.shift()); }
  const dst = parseAddr(toks);
  if (!dst) return null;
  let portOp = null, dstPort = null;
  if (toks[0] && ['eq', 'gt', 'lt'].includes(toks[0].toLowerCase())) { portOp = toks.shift().toLowerCase(); dstPort = portNum(toks.shift()); if (dstPort == null) return null; }
  if (toks.length && !['established', 'log'].includes(toks[0])) return null;
  const portTxt = portOp ? ` ${portOp} ${portName(dstPort)}` : '';
  return { action, proto, src, dst, portOp, dstPort, raw: `${action} ${proto} ${src.txt} ${dst.txt}${portTxt}` };
}
function portNum(t) {
  if (t == null) return null;
  if (/^\d+$/.test(t)) return +t;
  const names = { ftp: 21, ssh: 22, telnet: 23, domain: 53, dns: 53, www: 80, http: 80, https: 443, bootps: 67, bootpc: 68, ntp: 123, syslog: 514, 'pop3': 110, smtp: 25, tftp: 69, snmp: 161 };
  return names[t.toLowerCase()] ?? null;
}
function portName(n) { return { 21: 'ftp', 22: '22', 23: 'telnet', 53: 'domain', 80: 'www', 443: '443' }[n] || String(n); }
ND._portNum = portNum;

/* ---------- NTP / DHCP / NAT / logging / discovery ---------- */
cmd(['conf'], 'ntp server IP', 'Configure NTP server', (c, a) => { if (!c.dev.ntp.servers.includes(a[0])) c.dev.ntp.servers.push(a[0]); });
cmd(['conf'], 'ntp master NUM', 'Act as NTP master clock with stratum', (c, a) => { c.dev.ntp.master = +a[0]; });
cmd(['conf'], 'ntp master', 'Act as NTP master clock', c => { c.dev.ntp.master = true; });
cmd(['conf'], 'ip dhcp excluded-address IP IP', 'Exclude a range from DHCP', (c, a) => { c.dev.dhcp.excluded.push([a[0], a[1]]); });
cmd(['conf'], 'ip dhcp excluded-address IP', 'Exclude an address from DHCP', (c, a) => { c.dev.dhcp.excluded.push([a[0], a[0]]); });
cmd(['conf'], 'ip dhcp pool WORD', 'Configure DHCP address pool', (c, a) => {
  if (!c.dev.dhcp.pools[a[0]]) c.dev.dhcp.pools[a[0]] = { name: a[0], network: null, mask: null, router: null, dns: null, domain: null, lease: null };
  c.s.mode = 'dhcp'; c.s.pool = a[0];
});
cmd(['conf'], 'no ip dhcp pool WORD', 'Remove DHCP pool', (c, a) => { delete c.dev.dhcp.pools[a[0]]; });
cmd(['conf'], 'service dhcp', 'Enable DHCP server', () => {});
cmd(['dhcp'], 'network IP MASK', 'Network number and mask', (c, a) => { const p = c.dev.dhcp.pools[c.s.pool]; p.network = ND.netOf(a[0], a[1]); p.mask = a[1]; });
cmd(['dhcp'], 'default-router IP', 'Default routers', (c, a) => { c.dev.dhcp.pools[c.s.pool].router = a[0]; });
cmd(['dhcp'], 'dns-server IP', 'DNS servers', (c, a) => { c.dev.dhcp.pools[c.s.pool].dns = a[0]; });
cmd(['dhcp'], 'domain-name WORD', 'Domain name', (c, a) => { c.dev.dhcp.pools[c.s.pool].domain = a[0]; });
cmd(['dhcp'], 'lease NUM NUM NUM', 'Lease days hours minutes', (c, a) => { c.dev.dhcp.pools[c.s.pool].lease = a.join(' '); });
cmd(['dhcp'], 'lease NUM', 'Lease days', (c, a) => { c.dev.dhcp.pools[c.s.pool].lease = a[0]; });
cmd(['conf'], 'ip dhcp snooping', 'Enable DHCP snooping', c => { c.dev.dhcp.snooping.enabled = true; });
cmd(['conf'], 'no ip dhcp snooping', 'Disable DHCP snooping', c => { c.dev.dhcp.snooping.enabled = false; });
cmd(['conf'], 'ip dhcp snooping vlan WORD', 'DHCP snooping on VLANs', (c, a) => {
  const v = ND.parseVlanList(a[0]);
  if (!v) return c.out('% Invalid VLAN list', 'err');
  c.dev.dhcp.snooping.vlans = [...new Set(c.dev.dhcp.snooping.vlans.concat(v))];
});
cmd(['conf'], 'ip nat inside source static IP IP', 'Static NAT: local then global', (c, a) => { c.dev.nat.statics.push({ local: a[0], global: a[1] }); });
cmd(['conf'], 'no ip nat inside source static IP IP', 'Remove static NAT', (c, a) => { c.dev.nat.statics = c.dev.nat.statics.filter(s => !(s.local === a[0] && s.global === a[1])); });
cmd(['conf'], 'ip nat inside source list WORD interface REST overload', 'PAT with interface overload', (c, a) => {
  const ifc = ND.getIface(c.dev, a[1].replace(/\s*overload$/i, ''));
  c.dev.nat.dynamic = { acl: a[0], iface: ifc ? ifc.name : a[1], overload: true };
});
cmd(['conf'], 'ip nat inside source list WORD interface REST', 'Dynamic NAT out an interface', (c, a) => {
  const rest = a[1].trim();
  const overload = /\boverload$/i.test(rest);
  const ifname = rest.replace(/\s*overload$/i, '');
  const ifc = ND.getIface(c.dev, ifname);
  c.dev.nat.dynamic = { acl: a[0], iface: ifc ? ifc.name : ifname, overload };
});
cmd(['conf'], 'logging host IP', 'Set syslog server', (c, a) => { if (!c.dev.logging.hosts.includes(a[0])) c.dev.logging.hosts.push(a[0]); });
cmd(['conf'], 'logging IP', 'Set syslog server', (c, a) => { if (!c.dev.logging.hosts.includes(a[0])) c.dev.logging.hosts.push(a[0]); });
cmd(['conf'], 'logging trap WORD', 'Set syslog severity level', (c, a) => {
  const lv = ['emergencies', 'alerts', 'critical', 'errors', 'warnings', 'notifications', 'informational', 'debugging'].find(x => x.startsWith(a[0].toLowerCase())) || (/^\d$/.test(a[0]) ? ['emergencies', 'alerts', 'critical', 'errors', 'warnings', 'notifications', 'informational', 'debugging'][+a[0]] : null);
  if (!lv) return c.out('% Invalid level', 'err');
  c.dev.logging.trap = lv;
});
cmd(['conf'], 'logging buffered NUM', 'Set buffered logging size', (c, a) => { c.dev.logging.buffered = +a[0]; });
cmd(['conf'], 'logging console', 'Enable console logging', c => { c.dev.logging.console = true; });
cmd(['conf'], 'no logging console', 'Disable console logging', c => { c.dev.logging.console = false; });
cmd(['conf'], 'logging synchronous', 'Synchronized message output (use under line)', c => c.out('% This command applies under line configuration mode', 'err'));
cmd(['conf'], 'cdp run', 'Enable CDP globally', c => { c.dev.cdp = true; });
cmd(['conf'], 'no cdp run', 'Disable CDP globally', c => { c.dev.cdp = false; });
cmd(['conf'], 'lldp run', 'Enable LLDP globally', c => { c.dev.lldp = true; });
cmd(['conf'], 'no lldp run', 'Disable LLDP globally', c => { c.dev.lldp = false; });

/* ---------- line mode ---------- */
const lineOf = c => c.dev.lines[c.s.line];
cmd(['line'], 'password WORD', 'Set a password', (c, a) => { lineOf(c).password = a[0]; });
cmd(['line'], 'login', 'Enable password checking', c => { const l = lineOf(c); l.login = true; l.loginLocal = false; });
cmd(['line'], 'login local', 'Authenticate with local usernames', c => { const l = lineOf(c); l.loginLocal = true; l.login = false; });
cmd(['line'], 'no login', 'Disable password checking', c => { const l = lineOf(c); l.login = false; l.loginLocal = false; });
cmd(['line'], 'exec-timeout NUM NUM', 'Set idle timeout (min sec)', (c, a) => { lineOf(c).execTimeout = `${a[0]} ${a[1]}`; });
cmd(['line'], 'exec-timeout NUM', 'Set idle timeout (minutes)', (c, a) => { lineOf(c).execTimeout = `${a[0]} 0`; });
cmd(['line'], 'logging synchronous', 'Synchronized message output', c => { lineOf(c).sync = true; });
cmd(['line'], 'transport input REST', 'Define protocols to use on the line', (c, a) => {
  if (c.s.line !== 'vty') return c.out('% Applies to vty lines', 'err');
  const val = a[0].toLowerCase().trim();
  if (!['ssh', 'telnet', 'all', 'none', 'ssh telnet', 'telnet ssh'].includes(val)) return c.out('% Invalid input', 'err');
  lineOf(c).transport = val;
});
cmd(['line'], 'access-class WORD in', 'Filter incoming connections', (c, a) => { lineOf(c).accessClass = a[0]; });

/* ---------- interface mode ---------- */
cmd(['if'], 'ip address IP MASK', 'Set the IP address of an interface', (c, a) => {
  eachIf(c, i => { i.ip = { addr: a[0], mask: a[1] }; });
});
cmd(['if'], 'no ip address', 'Remove IP address', c => eachIf(c, i => { i.ip = null; }));
cmd(['if'], 'shutdown', 'Shutdown the selected interface', c => eachIf(c, i => {
  if (!i.shutdown) c.out(`%LINK-5-CHANGED: Interface ${i.name}, changed state to administratively down`, 'sys');
  i.shutdown = true;
}));
cmd(['if'], 'no shutdown', 'Enable the selected interface', c => eachIf(c, i => {
  if (i.shutdown) {
    i.shutdown = false;
    const up = ND.ifaceUp(c.topo, c.dev, i);
    c.out(`%LINK-5-CHANGED: Interface ${i.name}, changed state to ${up ? 'up' : 'down'}`, 'sys');
    if (up) c.out(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${i.name}, changed state to up`, 'sys');
  }
}));
cmd(['if'], 'description REST', 'Interface specific description', (c, a) => eachIf(c, i => { i.desc = a[0]; }));
cmd(['if'], 'no description', 'Remove description', c => eachIf(c, i => { i.desc = ''; }));
cmd(['if'], 'speed WORD', 'Configure port speed', (c, a) => {
  if (!['10', '100', '1000', 'auto'].includes(a[0])) return c.out('% Invalid speed', 'err');
  eachIf(c, i => { i.speed = a[0]; });
});
cmd(['if'], 'duplex WORD', 'Configure duplex operation', (c, a) => {
  const d = ['full', 'half', 'auto'].find(x => x.startsWith(a[0].toLowerCase()));
  if (!d) return c.out('% Invalid duplex', 'err');
  eachIf(c, i => { i.duplex = d; });
});
cmd(['if'], 'switchport mode access', 'Set trunking mode to ACCESS', c => eachIf(c, i => { i.swMode = 'access'; }));
cmd(['if'], 'switchport mode trunk', 'Set trunking mode to TRUNK', c => eachIf(c, i => {
  if (/^(Fast)/.test(i.name) && i.trunkEncap !== 'dot1q') { /* 2960s are dot1q-only; accept */ }
  i.swMode = 'trunk';
  c.out(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${i.name}, changed state to up`, 'sys');
}));
cmd(['if'], 'switchport mode dynamic auto', 'Set mode to dynamic auto', c => eachIf(c, i => { i.swMode = 'dynamic'; i.dtp = 'auto'; }));
cmd(['if'], 'switchport mode dynamic desirable', 'Set mode to dynamic desirable', c => eachIf(c, i => { i.swMode = 'dynamic'; i.dtp = 'desirable'; }));
cmd(['if'], 'switchport access vlan NUM', 'Set VLAN of the interface in access mode', (c, a) => {
  const v = +a[0];
  eachIf(c, i => { i.accessVlan = v; });
  if (!c.dev.vlans[v]) {
    c.dev.vlans[v] = { name: `VLAN${String(v).padStart(4, '0')}` };
    c.out(`% Access VLAN does not exist. Creating vlan ${v}`, 'sys');
  }
});
cmd(['if'], 'switchport voice vlan NUM', 'Set voice VLAN', (c, a) => {
  const v = +a[0];
  eachIf(c, i => { i.voiceVlan = v; });
  if (!c.dev.vlans[v]) c.dev.vlans[v] = { name: `VLAN${String(v).padStart(4, '0')}` };
});
cmd(['if'], 'switchport trunk encapsulation dot1q', 'Set trunk encapsulation to 802.1Q', c => eachIf(c, i => { i.trunkEncap = 'dot1q'; }));
cmd(['if'], 'switchport trunk native vlan NUM', 'Set native VLAN of the trunk', (c, a) => eachIf(c, i => { i.nativeVlan = +a[0]; }));
cmd(['if'], 'switchport trunk allowed vlan add WORD', 'Add VLANs to the allowed list', (c, a) => {
  const v = ND.parseVlanList(a[0]);
  if (!v) return c.out('% Invalid VLAN list', 'err');
  eachIf(c, i => { i.allowed = [...new Set((i.allowed || []).concat(v))]; });
});
cmd(['if'], 'switchport trunk allowed vlan remove WORD', 'Remove VLANs from the allowed list', (c, a) => {
  const v = ND.parseVlanList(a[0]);
  if (!v) return c.out('% Invalid VLAN list', 'err');
  eachIf(c, i => { i.allowed = (i.allowed || ND.parseVlanList('1-4094')).filter(x => !v.includes(x)); });
});
cmd(['if'], 'switchport trunk allowed vlan all', 'Allow all VLANs', c => eachIf(c, i => { i.allowed = null; }));
cmd(['if'], 'switchport trunk allowed vlan none', 'Allow no VLANs', c => eachIf(c, i => { i.allowed = []; }));
cmd(['if'], 'switchport trunk allowed vlan WORD', 'Set allowed VLAN list', (c, a) => {
  const v = ND.parseVlanList(a[0]);
  if (!v) return c.out('% Invalid VLAN list', 'err');
  eachIf(c, i => { i.allowed = v; });
});
cmd(['if'], 'no switchport trunk allowed vlan', 'Reset allowed list to all', c => eachIf(c, i => { i.allowed = null; }));
cmd(['if'], 'no switchport trunk native vlan', 'Reset native VLAN to 1', c => eachIf(c, i => { i.nativeVlan = 1; }));
cmd(['if'], 'switchport nonegotiate', 'Disable DTP negotiation', c => eachIf(c, i => {
  if (i.swMode === 'dynamic') return c.out('Command rejected: Conflict between \'nonegotiate\' and \'dynamic\' status.', 'err');
  i.nonegotiate = true;
}));
cmd(['if'], 'no switchport nonegotiate', 'Enable DTP negotiation', c => eachIf(c, i => { i.nonegotiate = false; }));
cmd(['if'], 'no switchport', 'Make interface a routed port', c => {
  if (!c.dev.l3switch) return c.out('% Command rejected: not supported on this platform', 'err');
  eachIf(c, i => { i.noSwitchport = true; });
});
cmd(['if'], 'switchport', 'Make interface a switched port', c => eachIf(c, i => { i.noSwitchport = false; i.ip = null; }));
cmd(['if'], 'switchport port-security', 'Enable port security', c => eachIf(c, i => {
  if (i.swMode === 'dynamic') return c.out('Command rejected: Port-security can only be configured on static access or trunk ports.', 'err');
  if (!i.portSec) i.portSec = { enabled: true, max: 1, violation: 'shutdown', sticky: false, macs: [], stickyLearned: [], violations: 0 };
  i.portSec.enabled = true;
}));
const psOf = i => i.portSec || (i.portSec = { enabled: false, max: 1, violation: 'shutdown', sticky: false, macs: [], stickyLearned: [], violations: 0 });
cmd(['if'], 'switchport port-security maximum NUM', 'Max secure addresses', (c, a) => eachIf(c, i => { psOf(i).max = +a[0]; }));
cmd(['if'], 'switchport port-security violation WORD', 'Security violation mode', (c, a) => {
  const m = ['protect', 'restrict', 'shutdown'].find(x => x.startsWith(a[0].toLowerCase()));
  if (!m) return c.out('% Invalid violation mode', 'err');
  eachIf(c, i => { psOf(i).violation = m; });
});
cmd(['if'], 'switchport port-security mac-address sticky', 'Learn MACs sticky', c => eachIf(c, i => { psOf(i).sticky = true; }));
cmd(['if'], 'switchport port-security mac-address MAC', 'Configure a secure MAC', (c, a) => eachIf(c, i => { psOf(i).macs.push(a[0].toLowerCase()); }));
cmd(['if'], 'channel-group NUM mode WORD', 'Etherchannel/port bundling', (c, a) => {
  const m = ['on', 'active', 'passive', 'desirable', 'auto'].find(x => x === a[1].toLowerCase() || x.startsWith(a[1].toLowerCase()));
  if (!m) return c.out('% Invalid channel-group mode', 'err');
  const id = +a[0];
  eachIf(c, i => { i.channelGroup = { id, mode: m }; });
  const po = 'Port-channel' + id;
  if (!c.dev.ifaces[po]) { c.dev.ifaces[po] = ND.makeIface(po, c.dev); c.dev.ifaces[po].shutdown = false; c.out(`Creating a port-channel interface Port-channel ${id}`, 'sys'); }
});
cmd(['if'], 'no channel-group', 'Remove from channel group', c => eachIf(c, i => { i.channelGroup = null; }));
cmd(['if'], 'spanning-tree portfast', 'Enable portfast on this interface', c => {
  c.out('%Warning: portfast should only be enabled on ports connected to a single\n host. Connecting hubs, concentrators, switches, bridges, etc... to this\n interface  when portfast is enabled, can cause temporary bridging loops.', 'sys');
  eachIf(c, i => { i.stpPortfast = true; });
});
cmd(['if'], 'no spanning-tree portfast', 'Disable portfast', c => eachIf(c, i => { i.stpPortfast = false; }));
cmd(['if'], 'spanning-tree bpduguard enable', 'Enable BPDU guard', c => eachIf(c, i => { i.bpduguard = true; }));
cmd(['if'], 'spanning-tree bpduguard disable', 'Disable BPDU guard', c => eachIf(c, i => { i.bpduguard = false; }));
cmd(['if'], 'encapsulation dot1q NUM native', 'Native VLAN dot1q on subinterface', (c, a) => eachIf(c, i => {
  if (!i.parent) return c.out('% Configuration only allowed on subinterfaces', 'err');
  i.encapDot1q = { vlan: +a[0], native: true };
}));
cmd(['if'], 'encapsulation dot1q NUM', 'IEEE 802.1Q virtual LAN on subinterface', (c, a) => eachIf(c, i => {
  if (!i.parent) return c.out('% Configuration only allowed on subinterfaces', 'err');
  i.encapDot1q = { vlan: +a[0], native: false };
}));
cmd(['if'], 'ip ospf cost NUM', 'OSPF interface cost', (c, a) => eachIf(c, i => { i.ospf.cost = +a[0]; }));
cmd(['if'], 'ip ospf priority NUM', 'OSPF DR election priority', (c, a) => eachIf(c, i => { i.ospf.priority = +a[0]; }));
cmd(['if'], 'ip ospf NUM area NUM', 'Enable OSPF on this interface', (c, a) => eachIf(c, i => { i.ospf.pid = +a[0]; i.ospf.area = +a[1]; }));
cmd(['if'], 'ip ospf network point-to-point', 'Set OSPF network type', c => eachIf(c, i => { i.ospf.netType = 'point-to-point'; }));
cmd(['if'], 'ip ospf network broadcast', 'Set OSPF network type', c => eachIf(c, i => { i.ospf.netType = 'broadcast'; }));
cmd(['if'], 'standby version NUM', 'HSRP version', (c, a) => eachIf(c, i => { for (const g of Object.keys(i.standby)) i.standby[g].version = +a[0]; i._standbyVer = +a[0]; }));
const stOf = (i, g) => i.standby[g] || (i.standby[g] = { ip: null, priority: null, preempt: false, version: i._standbyVer || 1 });
cmd(['if'], 'standby NUM ip IP', 'HSRP virtual IP address', (c, a) => eachIf(c, i => { stOf(i, +a[0]).ip = a[1]; }));
cmd(['if'], 'standby NUM priority NUM', 'HSRP priority', (c, a) => eachIf(c, i => { stOf(i, +a[0]).priority = +a[1]; }));
cmd(['if'], 'standby NUM preempt', 'HSRP preemption', (c, a) => eachIf(c, i => { stOf(i, +a[0]).preempt = true; }));
cmd(['if'], 'ip access-group WORD in', 'Apply ACL inbound', (c, a) => eachIf(c, i => { i.aclIn = a[0]; }));
cmd(['if'], 'ip access-group WORD out', 'Apply ACL outbound', (c, a) => eachIf(c, i => { i.aclOut = a[0]; }));
cmd(['if'], 'no ip access-group WORD in', 'Remove inbound ACL', c => eachIf(c, i => { i.aclIn = null; }));
cmd(['if'], 'no ip access-group WORD out', 'Remove outbound ACL', c => eachIf(c, i => { i.aclOut = null; }));
cmd(['if'], 'ip helper-address IP', 'Forward UDP broadcasts (DHCP relay)', (c, a) => eachIf(c, i => { if (!i.helpers.includes(a[0])) i.helpers.push(a[0]); }));
cmd(['if'], 'no ip helper-address IP', 'Remove helper address', (c, a) => eachIf(c, i => { i.helpers = i.helpers.filter(h => h !== a[0]); }));
cmd(['if'], 'ip nat inside', 'Inside interface for NAT', c => eachIf(c, i => { i.natInside = true; i.natOutside = false; }));
cmd(['if'], 'ip nat outside', 'Outside interface for NAT', c => eachIf(c, i => { i.natOutside = true; i.natInside = false; }));
cmd(['if'], 'no cdp enable', 'Disable CDP on this interface', c => eachIf(c, i => { i.cdpEnabled = false; }));
cmd(['if'], 'cdp enable', 'Enable CDP on this interface', c => eachIf(c, i => { i.cdpEnabled = true; }));
cmd(['if'], 'ip dhcp snooping trust', 'Trust DHCP on this interface', c => eachIf(c, i => { i.snoopTrust = true; }));
cmd(['if'], 'ipv6 enable', 'Enable IPv6 (link-local only)', c => eachIf(c, i => { i.ipv6Enable = true; }));
cmd(['if'], 'ipv6 address WORD link-local', 'Configure link-local address', (c, a) => eachIf(c, i => { i.ipv6LL = a[0].toUpperCase(); }));
cmd(['if'], 'ipv6 address WORD eui-64', 'Configure IPv6 with EUI-64 interface ID', (c, a) => {
  const m = a[0].match(/^([0-9a-fA-F:]+)\/(\d+)$/);
  if (!m) return c.out('% Incomplete command.', 'err');
  eachIf(c, i => { i.ipv6.push({ addr: m[1].toUpperCase(), len: +m[2], eui64: true }); });
});
cmd(['if'], 'ipv6 address WORD', 'Configure IPv6 address', (c, a) => {
  const m = a[0].match(/^([0-9a-fA-F:]+)\/(\d+)$/);
  if (!m) return c.out('% Incomplete command.', 'err');
  eachIf(c, i => { i.ipv6.push({ addr: m[1].toUpperCase(), len: +m[2], eui64: false }); });
});
cmd(['if'], 'no ipv6 address', 'Remove IPv6 addresses', c => eachIf(c, i => { i.ipv6 = []; i.ipv6LL = null; }));

/* ---------- PC commands ---------- */
cmd(['pc'], 'ipconfig /all', 'Full IP configuration', c => pcIpconfig(c, true));
cmd(['pc'], 'ipconfig /renew', 'Renew DHCP lease', c => {
  if (!c.dev.pcCfg.dhcp) return c.out('This adapter uses a static address.');
  const net = ND.pcNet(c.topo, c.dev);
  if (net.ip) c.out(`DHCP lease obtained.\n`);
  else c.out('An error occurred while renewing interface Ethernet0 : unable to contact your DHCP server.', 'err');
  pcIpconfig(c, false);
});
cmd(['pc'], 'ipconfig', 'Show IP configuration', c => pcIpconfig(c, false));
function pcIpconfig(c, all) {
  const net = ND.pcNet(c.topo, c.dev);
  const mac = Object.values(c.dev.ifaces)[0].mac.replace(/\./g, '').match(/../g).join('-').toUpperCase();
  c.out('Ethernet adapter Ethernet0:\n');
  if (all) c.out(`   Physical Address. . . . . . . . . : ${mac}\n   DHCP Enabled. . . . . . . . . . . : ${c.dev.pcCfg.dhcp ? 'Yes' : 'No'}`);
  c.out(`   IPv4 Address. . . . . . . . . . . : ${net.ip || '0.0.0.0 (no address)'}`);
  c.out(`   Subnet Mask . . . . . . . . . . . : ${net.mask || '0.0.0.0'}`);
  c.out(`   Default Gateway . . . . . . . . . : ${net.gw || ''}`);
  if (all && net.dns) c.out(`   DNS Servers . . . . . . . . . . . : ${net.dns}`);
}
cmd(['pc'], 'ping IP', 'Send ICMP echo request', (c, a) => {
  const res = ND.tracePacket(c.topo, c.dev, a[0], { proto: 'icmp' });
  c.out(`\nPinging ${a[0]} with 32 bytes of data:\n`);
  if (res.ok) {
    for (let k = 0; k < 4; k++) c.out(`Reply from ${a[0]}: bytes=32 time=${1 + k}ms TTL=${128 - res.path.length}`);
    c.out(`\nPing statistics for ${a[0]}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`);
  } else if (res.reason === 'acl') {
    for (let k = 0; k < 4; k++) c.out('Destination net unreachable.');
    c.out(`\nPing statistics for ${a[0]}:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)`);
  } else {
    for (let k = 0; k < 4; k++) c.out('Request timed out.');
    c.out(`\nPing statistics for ${a[0]}:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)`);
  }
});
cmd(['pc'], 'tracert IP', 'Trace route', (c, a) => {
  const res = ND.tracePacket(c.topo, c.dev, a[0], { proto: 'icmp' });
  c.out(`\nTracing route to ${a[0]} over a maximum of 30 hops\n`);
  if (res.ok) {
    let n = 1;
    for (const id of res.path.slice(1)) {
      const d = c.topo.devs[id];
      const addr = id === res.path[res.path.length - 1] ? a[0] : (ND.devIps(c.topo, d)[0] || {}).ip || '?';
      c.out(`  ${n++}    <1 ms    <1 ms    <1 ms  ${addr}`);
    }
    c.out('\nTrace complete.');
  } else c.out('  1     *        *        *     Request timed out.');
});

window.ND = ND;
})();
