/* NetDrill core — IP utilities + device state model. */
'use strict';

const ND = {};

/* ---------- IP helpers ---------- */
ND.ip2int = s => s.split('.').reduce((a, o) => ((a << 8) >>> 0) + (+o), 0) >>> 0;
ND.int2ip = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
ND.isIp = s => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s) && s.split('.').every(o => +o <= 255);
ND.mask2len = m => { let n = ND.ip2int(m), c = 0; while (n & 0x80000000) { c++; n = (n << 1) >>> 0; } return c; };
ND.len2mask = l => l === 0 ? '0.0.0.0' : ND.int2ip((0xFFFFFFFF << (32 - l)) >>> 0);
ND.netOf = (ip, mask) => ND.int2ip((ND.ip2int(ip) & ND.ip2int(mask)) >>> 0);
ND.sameSubnet = (a, b, mask) => (ND.ip2int(a) & ND.ip2int(mask)) === (ND.ip2int(b) & ND.ip2int(mask));
ND.wildMatch = (ip, base, wild) => {
  const keep = (~ND.ip2int(wild)) >>> 0;
  return ((ND.ip2int(ip) & keep) >>> 0) === ((ND.ip2int(base) & keep) >>> 0);
};

/* ---------- interface name normalization ---------- */
const IF_TYPES = [
  ['gigabitethernet', 'GigabitEthernet'], ['gi', 'GigabitEthernet'], ['g', 'GigabitEthernet'],
  ['fastethernet', 'FastEthernet'], ['fa', 'FastEthernet'], ['f', 'FastEthernet'],
  ['tengigabitethernet', 'TenGigabitEthernet', 'te'],
  ['ethernet', 'Ethernet'], ['eth', 'Ethernet'], ['e', 'Ethernet'],
  ['port-channel', 'Port-channel'], ['po', 'Port-channel'],
  ['loopback', 'Loopback'], ['lo', 'Loopback'], ['l', 'Loopback'],
  ['vlan', 'Vlan'], ['vl', 'Vlan'], ['v', 'Vlan'],
  ['serial', 'Serial'], ['s', 'Serial'],
  ['tunnel', 'Tunnel'], ['tu', 'Tunnel'],
];
ND.normIface = function (raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase().replace(/\s+/g, '');
  const m = s.match(/^([a-z-]+)([\d/.]+)$/);
  if (!m) return null;
  const [, t, num] = m;
  const seen = new Set();
  for (const [, canon] of IF_TYPES) {
    if (seen.has(canon)) continue;
    seen.add(canon);
    if (canon.toLowerCase().startsWith(t)) return canon + num;
  }
  return null;
};
ND.shortIface = function (name) {
  return name
    .replace('TenGigabitEthernet', 'Te').replace('GigabitEthernet', 'Gi')
    .replace('FastEthernet', 'Fa').replace('Ethernet', 'Et')
    .replace('Port-channel', 'Po').replace('Loopback', 'Lo')
    .replace('Serial', 'Se').replace('Tunnel', 'Tu').replace('Vlan', 'Vl');
};

/* ---------- MAC assignment ---------- */
let macSeq = 0x10;
ND.newMac = function () {
  macSeq += 7;
  const h = macSeq.toString(16).padStart(4, '0');
  return `000a.41${h.slice(0, 2)}.${h.slice(2)}${(macSeq % 251).toString(16).padStart(2, '0')}`.slice(0, 14);
};

/* ---------- interface factory ---------- */
ND.makeIface = function (name, dev) {
  const isVirtual = /^(Vlan|Loopback|Port-channel|Tunnel)/.test(name);
  const isSub = name.includes('.');
  return {
    name, mac: ND.newMac(),
    ip: null, ipv6: [], ipv6LL: null, ipv6Enable: false,
    // routers ship physical ports admin-down; switches ship up; virtual
    // interfaces (loopback, SVI, port-channel, tunnel) are never admin-down
    shutdown: dev.type === 'router' && !isSub && !isVirtual,
    desc: '', speed: 'auto', duplex: 'auto',
    // L2 (switch) properties
    swMode: 'dynamic',           // dynamic | access | trunk
    dtp: 'auto',                 // auto | desirable (dynamic sub-mode)
    accessVlan: 1, voiceVlan: null,
    nativeVlan: 1, allowed: null, // null = all (1-4094)
    trunkEncap: 'negotiate', nonegotiate: false,
    noSwitchport: false,         // L3 port on a multilayer switch
    channelGroup: null,          // {id, mode}
    encapDot1q: null,            // subinterface tag {vlan, native}
    // L3 features
    ospf: { cost: null, priority: null, pid: null, area: null, netType: 'broadcast' },
    standby: {},                 // group -> {ip, priority, preempt, version}
    aclIn: null, aclOut: null, helpers: [],
    natInside: false, natOutside: false,
    // security
    portSec: null,               // {max, violation, sticky, macs:[], stickyLearned:[], errDisabled}
    stpPortfast: null, bpduguard: null,
    cdpEnabled: true, snoopTrust: false, araiTrust: false,
    errDisabled: false, errReason: null,
  };
};

/* ---------- device factory ---------- */
ND.makeDevice = function (opts) {
  const dev = {
    id: opts.id, type: opts.type,                 // router | switch | pc
    l3switch: !!opts.l3switch,
    poeDevice: opts.poeDevice || null,           // e.g. an IP phone or access point drawing PoE
    hostname: opts.type === 'router' ? 'Router' : opts.type === 'switch' ? 'Switch' : opts.id,
    ifaces: {}, vlans: { 1: { name: 'default' } },
    enableSecret: null, enablePassword: null, svcEnc: false,
    banner: null, domainLookup: true, domainName: null,
    users: {}, rsaKey: null, sshVersion: null,
    lines: {
      con: { password: null, login: false, loginLocal: false, execTimeout: null, sync: false },
      vty: { password: null, login: false, loginLocal: false, execTimeout: null, sync: false, transport: 'all', accessClass: null },
    },
    ipRouting: opts.type === 'router', ipv6Routing: false,
    defaultGateway: null, nameServers: [],
    staticRoutes: [], v6Routes: [],
    ospf: null,
    acls: {},
    ntp: { servers: [], master: null },
    dhcp: { excluded: [], pools: {}, bindings: [], snooping: { enabled: false, vlans: [] } },
    nat: { statics: [], dynamic: null },
    logging: { console: true, hosts: [], trap: 'informational', buffered: null },
    vtp: { mode: 'server', domain: null },
    stp: { mode: 'pvst', prio: {}, portfastDefault: false, bpduguardDefault: false },
    cdp: true, lldp: false,
    macTable: [], arpTable: [],
    // services
    hosts: {},                                    // static DNS entries: name -> ip
    snmp: { communities: [], location: null, contact: null, hosts: [], traps: false },
    arai: { vlans: [], validate: [] },            // dynamic ARP inspection
    qos: { enabled: false },
    aaa: { newModel: false, loginDefault: null },
    services: { http: true, httpSecure: true, loginBlock: null, minPassLen: null, ftpUser: null, ftpPass: null },
    flash: opts.type === 'switch'
      ? [{ name: 'c2960-lanbasek9-mz.150-2.SE4.bin', size: 11801088 }, { name: 'vlan.dat', size: 3096 }, { name: 'config.text', size: 1915 }]
      : [{ name: 'c2900-universalk9-mz.SPA.157-3.M4.bin', size: 33591768 }, { name: 'cpconfig-29xx.cfg', size: 3000 }],
    startup: null, saved: false,
    // PC-only network config
    pcCfg: opts.type === 'pc' ? { ip: null, mask: null, gw: null, dhcp: !!opts.dhcp, dns: null } : null,
    // console session state (per device)
    sess: { mode: 'exec', iface: null, ifaceRange: null, line: null, vlan: null, pool: null, acl: null, history: [], hIdx: -1, pendingAuth: null, moreBuf: null },
  };
  if (opts.hostname) dev.hostname = opts.hostname;
  if (opts.type === 'switch') { dev.vlans[1002] = { name: 'fddi-default' }; dev.vlans[1003] = { name: 'token-ring-default' }; dev.vlans[1004] = { name: 'fddinet-default' }; dev.vlans[1005] = { name: 'trnet-default' }; }
  for (const n of (opts.ifaces || [])) {
    const name = ND.normIface(n) || n;
    dev.ifaces[name] = ND.makeIface(name, dev);
  }
  if (opts.pc) Object.assign(dev.pcCfg, opts.pc);
  if (opts.setup) opts.setup(dev);
  return dev;
};

ND.getIface = (dev, raw) => {
  const name = ND.normIface(raw);
  return name ? dev.ifaces[name] || null : null;
};

/* Create on demand: subinterfaces, SVIs, loopbacks, port-channels. */
ND.getOrCreateIface = function (dev, raw) {
  const name = ND.normIface(raw);
  if (!name) return null;
  if (dev.ifaces[name]) return dev.ifaces[name];
  const creatable = /^(Loopback|Tunnel)/.test(name)
    || (/^Vlan\d+$/.test(name) && (dev.type === 'switch'))
    || (/^Port-channel\d+$/.test(name) && dev.type === 'switch')
    || (name.includes('.') && dev.ifaces[name.split('.')[0]]);
  if (!creatable) return null;
  const ifc = ND.makeIface(name, dev);
  if (/^(Loopback|Vlan|Port-channel)/.test(name) || name.includes('.')) ifc.shutdown = false;
  if (name.includes('.')) ifc.parent = name.split('.')[0];
  dev.ifaces[name] = ifc;
  return ifc;
};

/* Parse "g0/1 - 3" / "g0/1-3, g0/5" into iface list (creates nothing). */
ND.parseRange = function (dev, str) {
  const out = [];
  for (let part of str.split(',')) {
    part = part.trim().replace(/\s*-\s*/, '-');
    const m = part.match(/^(.+?)-(\d+)$/);
    if (m && !/^\d+$/.test(part)) {
      const first = ND.normIface(m[1]);
      if (!first) return null;
      const base = first.replace(/\d+$/, '');
      const start = +first.match(/(\d+)$/)[1], end = +m[2];
      if (end < start || end - start > 47) return null;
      for (let i = start; i <= end; i++) {
        const nm = base + i;
        if (!dev.ifaces[nm]) return null;
        out.push(dev.ifaces[nm]);
      }
    } else {
      const ifc = ND.getIface(dev, part);
      if (!ifc) return null;
      out.push(ifc);
    }
  }
  return out.length ? out : null;
};

/* ---------- interface status ---------- */
ND.linkPeer = function (topo, dev, ifName) {
  for (const [a, ia, b, ib] of topo.links) {
    if (a === dev.id && ND.normIface(ia) === ifName) return { dev: topo.devs[b], iface: ND.normIface(ib) };
    if (b === dev.id && ND.normIface(ib) === ifName) return { dev: topo.devs[a], iface: ND.normIface(ia) };
  }
  return null;
};

ND.ifaceUp = function (topo, dev, ifc) {
  if (ifc.shutdown || ifc.errDisabled) return false;
  if (/^Loopback/.test(ifc.name)) return true;
  if (/^Vlan/.test(ifc.name)) {
    const v = +ifc.name.match(/\d+/)[0];
    return !!dev.vlans[v];
  }
  if (/^Port-channel/.test(ifc.name)) {
    const id = +ifc.name.match(/\d+/)[0];
    return Object.values(dev.ifaces).some(i => i.channelGroup && i.channelGroup.id === id && ND.ifaceUp(topo, dev, i));
  }
  if (ifc.parent) {
    const p = dev.ifaces[ifc.parent];
    return p ? ND.ifaceUp(topo, dev, p) : false;
  }
  const peer = ND.linkPeer(topo, dev, ifc.name);
  if (!peer) return false;
  const pIfc = peer.dev.ifaces[peer.iface];
  if (!pIfc || pIfc.shutdown || pIfc.errDisabled) return false;
  return true;
};

/* Effective trunk state after DTP negotiation. */
ND.operMode = function (topo, dev, ifc) {
  if (dev.type !== 'switch' || ifc.noSwitchport) return 'routed';
  if (ifc.swMode === 'access') return 'access';
  if (ifc.swMode === 'trunk') return 'trunk';
  // dynamic: negotiate with peer
  const peer = ND.linkPeer(topo, dev, ifc.name);
  if (peer && peer.dev.type === 'switch') {
    const p = peer.dev.ifaces[peer.iface];
    if (p && !p.noSwitchport) {
      const mine = ifc.dtp, theirs = p.swMode === 'trunk' ? 'trunk' : (p.swMode === 'dynamic' ? p.dtp : 'access');
      if (theirs === 'trunk' && !p.nonegotiate) return 'trunk';
      if (mine === 'desirable' && (theirs === 'desirable' || theirs === 'auto')) return 'trunk';
      if (mine === 'auto' && theirs === 'desirable') return 'trunk';
    }
  }
  return 'access';
};

ND.allowedOnTrunk = function (ifc, vlan) {
  if (ifc.allowed === null) return true;
  return ifc.allowed.includes(vlan);
};

/* parse vlan list "10,20,30-40" -> array */
ND.parseVlanList = function (s) {
  const out = [];
  for (const part of s.split(',')) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return null;
    const a = +m[1], b = m[2] ? +m[2] : a;
    if (a < 1 || b > 4094 || b < a) return null;
    for (let v = a; v <= b; v++) if (!out.includes(v)) out.push(v);
  }
  return out.sort((x, y) => x - y);
};
ND.fmtVlanList = function (arr) {
  if (!arr || !arr.length) return 'none';
  const s = [...arr].sort((a, b) => a - b); const parts = [];
  let st = s[0], prev = s[0];
  for (let i = 1; i <= s.length; i++) {
    if (s[i] === prev + 1) { prev = s[i]; continue; }
    parts.push(st === prev ? `${st}` : `${st}-${prev}`);
    st = prev = s[i];
  }
  return parts.join(',');
};

/* fake password hashes */
ND.type5 = pw => '$1$mERr$' + btoa(pw + 'nd').replace(/[^A-Za-z0-9]/g, 'x').slice(0, 22) + '.';
ND.type7 = pw => { let out = '0822'; for (let i = 0; i < pw.length; i++) out += ((pw.charCodeAt(i) ^ (0x35 + i)) & 0xff).toString(16).toUpperCase().padStart(2, '0'); return out; };

window.ND = ND;
