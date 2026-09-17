/* NetDrill sim — L2/L3 forwarding, ping, OSPF adjacency, CDP, DHCP. */
'use strict';
(function () {
const ND = window.ND;

/* ============ L2 flood domain ============
   From a starting L3 endpoint (device+iface), find every other L3 endpoint
   reachable at layer 2, respecting access VLANs, trunks and subinterface tags.
   Returns array of {dev, ifc, vlan} — vlan is the VLAN the frame rode in on. */
ND.l2Endpoints = function (topo, dev, ifc) {
  const results = [];
  const seen = new Set();

  // what vlan does this endpoint emit on its physical wire?
  let tag = null; // null = untagged
  let physName = ifc.name;
  if (ifc.parent) { physName = ifc.parent; tag = ifc.encapDot1q ? ifc.encapDot1q.vlan : null; if (ifc.encapDot1q && ifc.encapDot1q.native) tag = null; }
  if (/^Vlan\d+$/.test(ifc.name)) {
    // SVI: inject into the switch's own fabric on that vlan
    const v = +ifc.name.match(/\d+/)[0];
    floodSwitch(dev, v);
    return results;
  }
  if (/^Loopback/.test(ifc.name)) return results;
  if (/^Port-channel/.test(physName)) {
    const id = +physName.match(/\d+/)[0];
    const member = Object.values(dev.ifaces).find(i => i.channelGroup && i.channelGroup.id === id && ND.ifaceUp(topo, dev, i));
    if (!member) return results;
    physName = member.name;
  }
  const phys = dev.ifaces[physName];
  if (!phys || !ND.ifaceUp(topo, dev, phys)) return results;
  const peer = ND.linkPeer(topo, dev, physName);
  if (!peer) return results;
  arrive(peer.dev, peer.iface, tag);
  return results;

  function bundleOk(sw, ifcObj) {
    // if port is in a channel-group, the bundle must have formed (modes compatible on both ends)
    if (!ifcObj.channelGroup) return true;
    const p = ND.linkPeer(topo, sw, ifcObj.name);
    if (!p) return false;
    const pi = p.dev.ifaces[p.iface];
    if (!pi || !pi.channelGroup) return false;
    return ND.channelForms(ifcObj.channelGroup.mode, pi.channelGroup.mode);
  }

  function arrive(d, ifName, frameTag) {
    const inIfc = d.ifaces[ifName];
    if (!inIfc || !ND.ifaceUp(topo, d, inIfc)) return;
    if (d.type === 'switch' && !inIfc.noSwitchport) {
      if (!bundleOk(d, inIfc)) return;
      const mode = ND.operMode(topo, d, inIfc);
      let vlan;
      if (mode === 'access') {
        if (frameTag !== null && frameTag !== inIfc.accessVlan) return;
        vlan = inIfc.accessVlan;
      } else {
        vlan = frameTag === null ? inIfc.nativeVlan : frameTag;
        if (!ND.allowedOnTrunk(inIfc, vlan)) return;
      }
      if (!d.vlans[vlan]) return; // vlan not created on this switch
      floodSwitch(d, vlan, ifName);
    } else {
      // router / PC / routed port: receives only untagged frames (subifs handled below)
      if (frameTag === null) {
        const key = d.id + '|' + ifName;
        if (!seen.has(key)) { seen.add(key); results.push({ dev: d, ifc: inIfc, vlan: frameTag }); }
      }
      // matching dot1q subinterface?
      for (const sub of Object.values(d.ifaces)) {
        if (sub.parent === ifName && sub.encapDot1q && !sub.shutdown) {
          const matches = frameTag !== null ? sub.encapDot1q.vlan === frameTag : !!sub.encapDot1q.native;
          if (matches) {
            const key = d.id + '|' + sub.name;
            if (!seen.has(key)) { seen.add(key); results.push({ dev: d, ifc: sub, vlan: frameTag }); }
          }
        }
      }
    }
  }

  function floodSwitch(sw, vlan, inPort) {
    const key = 'SW|' + sw.id + '|' + vlan;
    if (seen.has(key)) return;
    seen.add(key);
    // SVI on this switch?
    const svi = sw.ifaces['Vlan' + vlan];
    if (svi && !svi.shutdown && sw.vlans[vlan]) {
      const k = sw.id + '|' + svi.name;
      if (!seen.has(k)) { seen.add(k); results.push({ dev: sw, ifc: svi, vlan }); }
    }
    for (const out of Object.values(sw.ifaces)) {
      if (out.name === inPort || out.noSwitchport) continue;
      if (!/^(Gigabit|Fast|Ten|Ether)/.test(out.name)) continue;
      if (!ND.ifaceUp(topo, sw, out) || !bundleOk(sw, out)) continue;
      const mode = ND.operMode(topo, sw, out);
      let egressTag = null;
      if (mode === 'access') { if (out.accessVlan !== vlan) continue; egressTag = null; }
      else { if (!ND.allowedOnTrunk(out, vlan)) continue; egressTag = out.nativeVlan === vlan ? null : vlan; }
      const peer = ND.linkPeer(topo, sw, out.name);
      if (peer) arrive(peer.dev, peer.iface, egressTag);
    }
  }
};

ND.channelForms = function (a, b) {
  const on = m => m === 'on';
  if (on(a) || on(b)) return on(a) && on(b);
  const lacp = ['active', 'passive'], pagp = ['desirable', 'auto'];
  if (lacp.includes(a) && lacp.includes(b)) return a === 'active' || b === 'active';
  if (pagp.includes(a) && pagp.includes(b)) return a === 'desirable' || b === 'desirable';
  return false;
};

/* ============ L3 addresses ============ */
ND.devIps = function (topo, dev) {
  const out = [];
  if (dev.type === 'pc') {
    const c = ND.pcNet(topo, dev);
    if (c.ip) out.push({ ip: c.ip, mask: c.mask, ifc: dev.ifaces[Object.keys(dev.ifaces)[0]] });
    return out;
  }
  for (const ifc of Object.values(dev.ifaces)) {
    if (ifc.ip && ND.ifaceUp(topo, dev, ifc) && (dev.type === 'router' || ifc.noSwitchport || /^(Vlan|Loopback)/.test(ifc.name)))
      out.push({ ip: ifc.ip.addr, mask: ifc.ip.mask, ifc });
  }
  // HSRP virtual IPs answer pings too
  for (const ifc of Object.values(dev.ifaces)) {
    for (const g of Object.keys(ifc.standby)) {
      const st = ifc.standby[g];
      if (st.ip && ND.ifaceUp(topo, dev, ifc) && ND.hsrpActive(topo, dev, ifc, +g)) out.push({ ip: st.ip, mask: ifc.ip ? ifc.ip.mask : '255.255.255.0', ifc, virtual: true });
    }
  }
  return out;
};

ND.pcNet = function (topo, dev) {
  const c = dev.pcCfg;
  if (!c.dhcp) return c;
  if (dev._pcNetBusy) return { ip: null, mask: null, gw: null };
  dev._pcNetBusy = true;
  try { return pcNetDhcp(topo, dev); } finally { dev._pcNetBusy = false; }
};
function pcNetDhcp(topo, dev) {
  const ifc = Object.values(dev.ifaces)[0];
  const eps = ND.l2Endpoints(topo, dev, ifc);
  for (const ep of eps) {
    const cand = serverFor(ep.dev, null);
    if (cand) return cand;
    // relay via ip helper-address
    if (ep.ifc.helpers && ep.ifc.helpers.length && ep.ifc.ip) {
      for (const h of ep.ifc.helpers) {
        const srv = ND.deviceOwning(topo, h);
        if (srv) {
          const cand2 = serverFor(srv.dev, ep.ifc.ip);
          if (cand2) return cand2;
        }
      }
    }
  }
  return { ip: null, mask: null, gw: null };
  function serverFor(srv, giaddr) {
    if (srv.type === 'pc' || !srv.dhcp) return null;
    for (const pool of Object.values(srv.dhcp.pools)) {
      if (!pool.network) continue;
      // pool must match the relay interface subnet, or (no relay) a directly-connected subnet of the server
      if (giaddr) {
        if (!ND.sameSubnet(giaddr.addr, pool.network, pool.mask)) continue;
      } else {
        const local = Object.values(srv.ifaces).some(i => i.ip && ND.sameSubnet(i.ip.addr, pool.network, pool.mask));
        if (!local) continue;
      }
      // hand out .10 + index of this PC (stable, avoids excluded + router ips)
      const base = ND.ip2int(pool.network);
      let host = 10 + (Math.abs(hash(dev.id)) % 40);
      let ip = ND.int2ip(base + host);
      let guard = 0;
      while (guard++ < 60 && (isExcluded(srv, ip) || ND.deviceOwning(topo, ip))) { host++; ip = ND.int2ip(base + host); }
      return { ip, mask: pool.mask, gw: pool.router, dns: pool.dns, pool: pool.name, server: srv };
    }
    return null;
  }
  function isExcluded(srv, ip) {
    const n = ND.ip2int(ip);
    return srv.dhcp.excluded.some(([lo, hi]) => n >= ND.ip2int(lo) && n <= ND.ip2int(hi || lo));
  }
  function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; }
};

ND.deviceOwning = function (topo, ip) {
  for (const dev of Object.values(topo.devs)) {
    for (const a of ND.devIps(topo, dev)) if (a.ip === ip) return { dev, ifc: a.ifc, virtual: a.virtual };
  }
  return null;
};

/* ============ HSRP ============ */
ND.hsrpActive = function (topo, dev, ifc, group) {
  const mine = ifc.standby[group];
  if (!mine || !mine.ip) return false;
  // find peer on same segment with same group
  const eps = ND.l2Endpoints(topo, dev, ifc);
  for (const ep of eps) {
    const theirs = ep.ifc.standby && ep.ifc.standby[group];
    if (theirs && theirs.ip === mine.ip) {
      const myPri = mine.priority ?? 100, theirPri = theirs.priority ?? 100;
      if (theirPri > myPri) return false;
      if (theirPri === myPri) {
        const myIp = ifc.ip ? ND.ip2int(ifc.ip.addr) : 0, thIp = ep.ifc.ip ? ND.ip2int(ep.ifc.ip.addr) : 0;
        if (thIp > myIp) return false;
      }
    }
  }
  return true;
};

/* ============ OSPF ============ */
ND.ospfEnabledOn = function (dev, ifc) {
  if (!ifc.ip) return null;
  if (ifc.ospf.pid !== null) return { pid: ifc.ospf.pid, area: ifc.ospf.area };
  if (dev.ospf) {
    for (const n of dev.ospf.networks) {
      if (ND.wildMatch(ifc.ip.addr, n.net, n.wild)) return { pid: dev.ospf.pid, area: n.area };
    }
  }
  return null;
};

ND.ospfPassive = function (dev, ifc) {
  if (!dev.ospf) return false;
  const short = ifc.name;
  if (dev.ospf.passiveDefault) return !dev.ospf.noPassive.includes(short);
  return dev.ospf.passive.includes(short);
};

/* All FULL adjacencies for a device: [{ifc, peerDev, peerIfc, area}] */
ND.ospfNeighbors = function (topo, dev) {
  const out = [];
  for (const ifc of Object.values(dev.ifaces)) {
    if (!ifc.ip || !ND.ifaceUp(topo, dev, ifc)) continue;
    const mine = ND.ospfEnabledOn(dev, ifc);
    if (!mine || ND.ospfPassive(dev, ifc)) continue;
    for (const ep of ND.l2Endpoints(topo, dev, ifc)) {
      if (ep.dev.type === 'pc' || !ep.ifc.ip) continue;
      if (!ND.sameSubnet(ifc.ip.addr, ep.ifc.ip.addr, ifc.ip.mask)) continue;
      const theirs = ND.ospfEnabledOn(ep.dev, ep.ifc);
      if (!theirs || ND.ospfPassive(ep.dev, ep.ifc)) continue;
      if (mine.area !== theirs.area) continue;
      out.push({ ifc, peerDev: ep.dev, peerIfc: ep.ifc, area: mine.area });
    }
  }
  return out;
};

ND.routerId = function (topo, dev) {
  if (dev.ospf && dev.ospf.routerId) return dev.ospf.routerId;
  let best = null;
  for (const ifc of Object.values(dev.ifaces)) {
    if (!ifc.ip) continue;
    const isLo = /^Loopback/.test(ifc.name);
    if (!best || (isLo && !best.lo) || (isLo === best.lo && ND.ip2int(ifc.ip.addr) > ND.ip2int(best.ip)))
      best = { ip: ifc.ip.addr, lo: isLo };
  }
  return best ? best.ip : '0.0.0.0';
};

/* Networks known via OSPF: walk adjacency graph, gather all OSPF-enabled subnets. */
ND.ospfDomainRoutes = function (topo, dev) {
  const visited = new Set([dev.id]);
  const routes = []; // {net, mask, nextHop, viaIfc}
  const queue = [{ d: dev, firstHop: null, firstIfc: null }];
  while (queue.length) {
    const { d, firstHop, firstIfc } = queue.shift();
    if (d !== dev) {
      for (const ifc of Object.values(d.ifaces)) {
        if (!ifc.ip || !ND.ifaceUp(topo, d, ifc)) continue;
        if (!ND.ospfEnabledOn(d, ifc)) continue;
        routes.push({ net: ND.netOf(ifc.ip.addr, ifc.ip.mask), mask: ifc.ip.mask, nextHop: firstHop, viaIfc: firstIfc });
      }
      if (d.ospf && d.ospf.defaultInfo && (d.staticRoutes.some(r => r.net === '0.0.0.0') || true))
        routes.push({ net: '0.0.0.0', mask: '0.0.0.0', nextHop: firstHop, viaIfc: firstIfc, external: true });
    }
    for (const adj of ND.ospfNeighbors(topo, d)) {
      if (visited.has(adj.peerDev.id)) continue;
      visited.add(adj.peerDev.id);
      queue.push({
        d: adj.peerDev,
        firstHop: firstHop || adj.peerIfc.ip.addr,
        firstIfc: firstIfc || adj.ifc,
      });
    }
  }
  return routes;
};

/* ============ routing table ============ */
ND.routeTable = function (topo, dev) {
  const rt = [];
  if (dev.type === 'pc') {
    const c = ND.pcNet(topo, dev);
    if (c.ip) rt.push({ proto: 'C', net: ND.netOf(c.ip, c.mask), mask: c.mask, ifc: Object.values(dev.ifaces)[0], nextHop: null, ad: 0, local: c.ip });
    return rt;
  }
  for (const ifc of Object.values(dev.ifaces)) {
    if (!ifc.ip || !ND.ifaceUp(topo, dev, ifc)) continue;
    if (dev.type === 'switch' && !dev.ipRouting && !/^Vlan/.test(ifc.name)) continue;
    rt.push({ proto: 'C', net: ND.netOf(ifc.ip.addr, ifc.ip.mask), mask: ifc.ip.mask, ifc, nextHop: null, ad: 0, local: ifc.ip.addr });
  }
  for (const r of dev.staticRoutes) {
    rt.push({ proto: 'S', net: r.net, mask: r.mask, nextHop: r.via, ifc: r.viaIfc ? dev.ifaces[r.viaIfc] : null, ad: r.ad || 1 });
  }
  if (dev.ospf && (dev.type === 'router' || dev.ipRouting)) {
    for (const r of ND.ospfDomainRoutes(topo, dev)) {
      const dup = rt.some(x => x.net === r.net && x.mask === r.mask);
      if (!dup) rt.push({ proto: r.external ? 'O*E2' : 'O', net: r.net, mask: r.mask, nextHop: r.nextHop, ifc: r.viaIfc, ad: 110 });
    }
  }
  return rt;
};

ND.routeLookup = function (topo, dev, dstIp) {
  const rt = ND.routeTable(topo, dev);
  let best = null;
  for (const r of rt) {
    if (!ND.sameSubnet(dstIp, r.net, r.mask)) continue;
    const len = ND.mask2len(r.mask);
    if (!best || len > best.len || (len === best.len && r.ad < best.r.ad)) best = { r, len };
  }
  if (best) return best.r;
  // L2 switch / PC default gateway
  const gw = dev.type === 'pc' ? ND.pcNet(topo, dev).gw : dev.defaultGateway;
  if (gw && (dev.type === 'pc' || !dev.ipRouting)) return { proto: 'GW', net: '0.0.0.0', mask: '0.0.0.0', nextHop: gw, ifc: null };
  return null;
};

/* ============ ACL evaluation ============ */
ND.aclCheck = function (dev, aclId, pkt) {
  if (!aclId) return true;
  const acl = dev.acls[aclId];
  if (!acl || !acl.entries.length) return true;
  for (const e of acl.entries) {
    if (matches(e, pkt)) return e.action === 'permit';
  }
  return false; // implicit deny
  function matches(e, p) {
    if (e.proto && e.proto !== 'ip' && p.proto && e.proto !== p.proto) return false;
    if (e.src && !matchAddr(e.src, p.src)) return false;
    if (e.dst && !matchAddr(e.dst, p.dst)) return false;
    if (e.dstPort != null && p.dstPort != null && !portMatch(e, p.dstPort)) return false;
    if (e.dstPort != null && p.dstPort == null) return false;
    return true;
  }
  function matchAddr(spec, ip) {
    if (spec.any) return true;
    if (!ip) return false;
    if (spec.host) return spec.host === ip;
    return ND.wildMatch(ip, spec.net, spec.wild);
  }
  function portMatch(e, port) {
    if (e.portOp === 'eq') return port === e.dstPort;
    if (e.portOp === 'gt') return port > e.dstPort;
    if (e.portOp === 'lt') return port < e.dstPort;
    return true;
  }
};

/* ============ ping ============ */
/* Traces a packet hop by hop. Returns {ok, reason, path:[devIds]} */
ND.tracePacket = function (topo, srcDev, dstIp, pkt, checkReverse = true) {
  pkt = pkt || { proto: 'icmp' };
  // does the source itself own the destination?
  if (ND.devIps(topo, srcDev).some(a => a.ip === dstIp)) return { ok: true, path: [srcDev.id], srcIp: dstIp };

  let cur = srcDev, ttl = 12;
  const path = [srcDev.id];
  let srcIp = pkt.src || null;

  while (ttl-- > 0) {
    const route = ND.routeLookup(topo, cur, dstIp);
    if (!route) return { ok: false, reason: 'no-route', at: cur.id, path, srcIp };
    // determine exit interface + who to hand to
    let exitIfc = route.ifc;
    const targetIp = route.proto === 'C' ? dstIp : (route.nextHop || dstIp);
    if (!exitIfc) {
      // resolve exit iface from next-hop subnet (recursive static / gateway)
      const c = ND.routeTable(topo, cur).find(r => r.proto === 'C' && ND.sameSubnet(targetIp, r.net, r.mask));
      if (!c && cur.type !== 'pc' && !(cur.type === 'switch' && !cur.ipRouting)) return { ok: false, reason: 'no-route', at: cur.id, path, srcIp };
      exitIfc = c ? c.ifc : Object.values(cur.ifaces)[0];
    }
    if (!srcIp) {
      if (cur.type === 'pc') srcIp = ND.pcNet(topo, cur).ip;
      else srcIp = exitIfc.ip ? exitIfc.ip.addr : (ND.devIps(topo, cur)[0] || {}).ip;
      pkt.src = srcIp;
    }
    // outbound ACL (locally generated traffic skips it, matching IOS)
    if (exitIfc.aclOut && path.length > 1 && !ND.aclCheck(cur, exitIfc.aclOut, { ...pkt, dst: dstIp })) return { ok: false, reason: 'acl', at: cur.id, path, srcIp };
    // find target on the L2 segment
    const eps = cur.type === 'pc' ? ND.l2Endpoints(topo, cur, Object.values(cur.ifaces)[0]) : ND.l2Endpoints(topo, cur, exitIfc);
    let nxt = null;
    for (const ep of eps) {
      const ips = ND.devIps(topo, ep.dev);
      if (ips.some(a => a.ip === targetIp)) { nxt = ep; break; }
    }
    if (!nxt) return { ok: false, reason: 'arp-fail', at: cur.id, path, srcIp };
    // inbound ACL at next hop
    const inAcl = nxt.ifc.aclIn;
    if (inAcl && !ND.aclCheck(nxt.dev, inAcl, { ...pkt, dst: dstIp })) return { ok: false, reason: 'acl', at: nxt.dev.id, path, srcIp };
    // vty access-class for telnet/ssh handled by caller
    path.push(nxt.dev.id);
    ND.learnMacs(topo, cur, exitIfc, nxt);
    if (ND.devIps(topo, nxt.dev).some(a => a.ip === dstIp)) {
      if (checkReverse && srcIp) {
        const back = ND.tracePacket(topo, nxt.dev, srcIp, { proto: pkt.proto, src: dstIp }, false);
        if (!back.ok) return { ok: false, reason: 'no-return-route', at: nxt.dev.id, path, srcIp };
      }
      return { ok: true, path, srcIp };
    }
    // next device must route
    if (nxt.dev.type === 'pc' || (nxt.dev.type === 'switch' && !nxt.dev.ipRouting)) return { ok: false, reason: 'not-a-router', at: nxt.dev.id, path, srcIp };
    cur = nxt.dev;
  }
  return { ok: false, reason: 'ttl', path, srcIp };
};

/* Record MAC addresses learned along a delivery (rough but satisfying). */
ND.learnMacs = function (topo, fromDev, exitIfc, arrived) {
  // walk switches between fromDev and arrived.dev on this segment; keep it simple:
  for (const dev of Object.values(topo.devs)) {
    if (dev.type !== 'switch') continue;
    for (const port of Object.values(dev.ifaces)) {
      if (!/^(Gigabit|Fast|Ten|Ether)/.test(port.name) || !ND.ifaceUp(topo, dev, port)) continue;
      const peer = ND.linkPeer(topo, dev, port.name);
      if (!peer) continue;
      // learn peer device's MAC (or the MAC behind it) — only direct neighbors for realism
      if (peer.dev.type !== 'switch') {
        const pIfc = peer.dev.ifaces[peer.iface];
        if (!pIfc) continue;
        const vlan = ND.operMode(topo, dev, port) === 'access' ? port.accessVlan : port.nativeVlan;
        const key = pIfc.mac + '|' + port.name;
        if (!dev.macTable.some(e => e.key === key)) dev.macTable.push({ key, vlan, mac: pIfc.mac, port: port.name });
        // port-security sticky learning + violation
        ND.portSecLearn(topo, dev, port, pIfc.mac);
      }
    }
  }
};

ND.portSecLearn = function (topo, dev, port, mac) {
  const ps = port.portSec;
  if (!ps || !ps.enabled) return;
  const known = ps.macs.concat(ps.stickyLearned);
  if (known.includes(mac)) return;
  if (known.length < ps.max) {
    if (ps.sticky) ps.stickyLearned.push(mac);
    else ps.dynLearned = (ps.dynLearned || []).concat(mac);
    return;
  }
};

/* Trigger a port-security violation (labs call this to simulate a rogue host). */
ND.portSecViolate = function (topo, dev, port) {
  const ps = port.portSec;
  if (!ps || !ps.enabled) return 'no port-security';
  ps.violations = (ps.violations || 0) + 1;
  if (ps.violation === 'shutdown') { port.errDisabled = true; port.errReason = 'psecure-violation'; }
  return ps.violation;
};

/* ============ CDP / LLDP ============ */
ND.cdpNeighbors = function (topo, dev) {
  const out = [];
  if (!dev.cdp) return out;
  for (const ifc of Object.values(dev.ifaces)) {
    if (!/^(Gigabit|Fast|Ten|Ether|Serial)/.test(ifc.name) || ifc.parent) continue;
    if (!ND.ifaceUp(topo, dev, ifc) || !ifc.cdpEnabled) continue;
    const peer = ND.linkPeer(topo, dev, ifc.name);
    if (!peer || peer.dev.type === 'pc') continue;
    if (!peer.dev.cdp || !peer.dev.ifaces[peer.iface] || !peer.dev.ifaces[peer.iface].cdpEnabled) continue;
    out.push({ local: ifc.name, dev: peer.dev, remote: peer.iface });
  }
  return out;
};
ND.lldpNeighbors = function (topo, dev) {
  const out = [];
  if (!dev.lldp) return out;
  for (const ifc of Object.values(dev.ifaces)) {
    if (!/^(Gigabit|Fast|Ten|Ether)/.test(ifc.name) || ifc.parent) continue;
    if (!ND.ifaceUp(topo, dev, ifc)) continue;
    const peer = ND.linkPeer(topo, dev, ifc.name);
    if (!peer || peer.dev.type === 'pc' || !peer.dev.lldp) continue;
    out.push({ local: ifc.name, dev: peer.dev, remote: peer.iface });
  }
  return out;
};

/* ============ STP (very light) ============ */
ND.stpRoot = function (topo, vlan) {
  let root = null;
  for (const dev of Object.values(topo.devs)) {
    if (dev.type !== 'switch') continue;
    const prio = (dev.stp.prio[vlan] ?? 32768) + vlan;
    const mac = dev.ifaces[Object.keys(dev.ifaces)[0]] ? dev.ifaces[Object.keys(dev.ifaces)[0]].mac : '0000.0000.0000';
    if (!root || prio < root.prio || (prio === root.prio && mac < root.mac)) root = { dev, prio, mac };
  }
  return root;
};

/* ============ NAT check (used by show + labs) ============ */
ND.natTranslations = function (topo, dev) {
  const out = [];
  for (const s of dev.nat.statics) out.push({ inside: s.local, global: s.global, type: 'static' });
  return out;
};

window.ND = ND;
})();
