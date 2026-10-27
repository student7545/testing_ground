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
  /* The tree is the same for every port on a given VLAN, so work it out once
     per walk rather than once per port. Declared up here because the flooding
     helpers below are reached before the rest of this function runs. */
  const stpCache = {};
  function stpDiscards(sw, ifcName, vlan) {
    if (!(vlan in stpCache)) stpCache[vlan] = ND.stpTopology(topo, vlan);
    const t = stpCache[vlan];
    if (!t) return false;
    const e = t.roles.get(sw.id + '|' + ifcName);
    return !!(e && e.sts === 'BLK');
  }

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
      const l2 = ND.l2Settings(d, inIfc);
      const mode = ND.operMode(topo, d, l2);
      let vlan;
      if (mode === 'access') {
        if (frameTag !== null && frameTag !== l2.accessVlan) return;
        vlan = l2.accessVlan;
      } else {
        vlan = frameTag === null ? l2.nativeVlan : frameTag;
        if (!ND.allowedOnTrunk(l2, vlan)) return;
      }
      if (!d.vlans[vlan]) return; // vlan not created on this switch
      if (stpDiscards(d, ifName, vlan)) return; // alternate port: discarding
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
      const outL2 = ND.l2Settings(sw, out);
      const mode = ND.operMode(topo, sw, outL2);
      let egressTag = null;
      if (mode === 'access') { if (outL2.accessVlan !== vlan) continue; egressTag = null; }
      else { if (!ND.allowedOnTrunk(outL2, vlan)) continue; egressTag = outL2.nativeVlan === vlan ? null : vlan; }
      if (stpDiscards(sw, out.name, vlan)) continue; // alternate port: discarding
      const peer = ND.linkPeer(topo, sw, out.name);
      if (peer) arrive(peer.dev, peer.iface, egressTag);
    }
  }
};

/* A port in a channel-group takes its layer-2 settings from the Port-channel
   interface, exactly as IOS applies them to every bundle member. */
ND.l2Settings = function (dev, ifc) {
  if (!ifc.channelGroup) return ifc;
  const po = dev.ifaces['Port-channel' + ifc.channelGroup.id];
  return po || ifc;
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
    const cand = serverFor(ep.dev, null, ep.ifc);
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
  function serverFor(srv, giaddr, facing) {
    if (srv.type === 'pc' || !srv.dhcp) return null;
    for (const pool of Object.values(srv.dhcp.pools)) {
      if (!pool.network) continue;
      // Choosing the pool: a relayed request carries the relay interface's address
      // (giaddr) and the pool must match it. A request heard directly must match the
      // subnet of the very interface it arrived on — otherwise a router serving several
      // VLANs would answer every client from whichever pool happens to be listed first.
      if (giaddr) {
        if (!ND.sameSubnet(giaddr.addr, pool.network, pool.mask)) continue;
      } else if (facing && facing.ip) {
        if (!ND.sameSubnet(facing.ip.addr, pool.network, pool.mask)) continue;
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
  /* A router cannot hold the active role over an interface that is down: with
     no way to send hellos or receive traffic for the virtual address, the group
     drops to Init and the peer takes over. */
  if (!ND.ifaceUp(topo, dev, ifc)) return false;
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

/* HSRP state for the group as a router would report it. Init covers the case
   where the interface is down or the group has no virtual address yet, so the
   router is not participating at all -- which is why it shows no peers. */
ND.hsrpState = function (topo, dev, ifc, group) {
  const st = ifc.standby[group];
  if (!st || !st.ip || !ND.ifaceUp(topo, dev, ifc)) return 'Init';
  return ND.hsrpActive(topo, dev, ifc, group) ? 'Active' : 'Standby';
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
  const ospf = [];
  if (dev.ospf && (dev.type === 'router' || dev.ipRouting)) {
    for (const r of ND.ospfDomainRoutes(topo, dev)) {
      ospf.push({ proto: r.external ? 'O*E2' : 'O', net: r.net, mask: r.mask, nextHop: r.nextHop, ifc: r.viaIfc, ad: 110 });
    }
  }

  /* A static route pointing at a next-hop ADDRESS is only installed while that
     address can be resolved through some other route -- lose the interface the
     next hop sits on and the static drops out of the table with it. Resolution
     repeats so one static may recurse through another, and never goes through
     the default route. A static given an exit INTERFACE instead just needs that
     interface to be up. */
  const statics = [];
  const pending = dev.staticRoutes.map(r => ({
    proto: 'S', net: r.net, mask: r.mask, nextHop: r.via,
    ifc: r.viaIfc ? dev.ifaces[r.viaIfc] : null, ad: r.ad || 1, viaIfcName: r.viaIfc,
  }));
  const resolves = ip => rt.concat(ospf, statics).some(r =>
    ND.mask2len(r.mask) > 0 && ND.sameSubnet(ip, r.net, r.mask));
  for (let pass = 0; pass <= pending.length; pass++) {
    let added = false;
    for (const sr of pending) {
      if (sr.installed) continue;
      const ok = sr.viaIfcName
        ? !!(dev.ifaces[sr.viaIfcName] && ND.ifaceUp(topo, dev, dev.ifaces[sr.viaIfcName]))
        : !!(sr.nextHop && resolves(sr.nextHop));
      if (ok) { sr.installed = true; statics.push(sr); added = true; }
    }
    if (!added) break;
  }

  /* Administrative distance decides WHICH SOURCE to believe about a given
     prefix, so only the lowest-AD entry for each prefix is installed. That is
     the whole mechanism behind a floating static: give it a worse AD than the
     routing protocol and it stays out of the table until the protocol's route
     disappears. Different prefix lengths are different prefixes and all stay --
     that contest is longest-prefix match, settled later in routeLookup. */
  const best = new Map();
  for (const r of rt.concat(statics, ospf)) {
    const key = r.net + '/' + r.mask;
    const cur = best.get(key);
    if (!cur || r.ad < cur.ad) best.set(key, r);
  }
  return [...best.values()];
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
    if (e.portOp === 'neq') return port !== e.dstPort;
    if (e.portOp === 'gt') return port > e.dstPort;
    if (e.portOp === 'lt') return port < e.dstPort;
    if (e.portOp === 'range') return port >= e.dstPort && port <= e.dstPortHi;
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
    if (pkt.learn) { ND.learnMacs(topo, cur, exitIfc, nxt.dev, nxt.ifc); ND.learnArp(topo, cur, exitIfc, nxt, targetIp, srcIp); }
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

/* ARP caching: a host or router that just forwarded a packet knows the MAC of
   the next hop, and the next hop knows its own sender in return. */
ND.arpAdd = function (dev, ip, mac, ifName) {
  if (!ip || !mac) return;
  dev.arpTable = dev.arpTable.filter(e => e.ip !== ip);
  dev.arpTable.push({ ip, mac, iface: ifName, age: 0 });
};
ND.learnArp = function (topo, cur, exitIfc, nxt, targetIp, srcIp) {
  ND.arpAdd(cur, targetIp, nxt.ifc.mac, exitIfc.name);
  // the far end learns whoever just spoke to it
  const backIp = cur.type === 'pc' ? ND.pcNet(topo, cur).ip : (exitIfc.ip ? exitIfc.ip.addr : srcIp);
  if (nxt.dev.type !== 'switch') ND.arpAdd(nxt.dev, backIp, exitIfc.mac, nxt.ifc.name);
};

/* Which physical port on `sw` leads toward `target`? Breadth-first over the
   physical links, so a switch two hops away still learns on its uplink. */
const PHYS = /^(Gigabit|Fast|Ten|Ether)/;
ND.portToward = function (topo, sw, target) {
  const seen = new Set([sw.id]);
  let frontier = [];
  for (const port of Object.values(sw.ifaces)) {
    if (!PHYS.test(port.name) || port.parent || !ND.ifaceUp(topo, sw, port)) continue;
    const peer = ND.linkPeer(topo, sw, port.name);
    if (!peer) continue;
    if (peer.dev === target) return port.name;
    if (!seen.has(peer.dev.id)) { seen.add(peer.dev.id); frontier.push({ via: port.name, dev: peer.dev }); }
  }
  while (frontier.length) {
    const next = [];
    for (const f of frontier) {
      if (f.dev.type !== 'switch') continue;       // only switches pass frames onward
      for (const port of Object.values(f.dev.ifaces)) {
        if (!PHYS.test(port.name) || port.parent || !ND.ifaceUp(topo, f.dev, port)) continue;
        const peer = ND.linkPeer(topo, f.dev, port.name);
        if (!peer || seen.has(peer.dev.id)) continue;
        if (peer.dev === target) return f.via;
        seen.add(peer.dev.id);
        next.push({ via: f.via, dev: peer.dev });
      }
    }
    frontier = next;
  }
  return null;
};

/* The access VLAN a host sits in, as seen by the switch it plugs into. */
ND.vlanOfHost = function (topo, dev) {
  for (const sw of Object.values(topo.devs)) {
    if (sw.type !== 'switch') continue;
    for (const port of Object.values(sw.ifaces)) {
      if (!PHYS.test(port.name) || port.noSwitchport) continue;
      const peer = ND.linkPeer(topo, sw, port.name);
      if (peer && peer.dev === dev && ND.operMode(topo, sw, port) === 'access') return port.accessVlan;
    }
  }
  return null;
};

/* Record the source and destination MACs of a delivered frame on every switch
   that carried it. Only called for traffic the user actually generated — the
   lab checks must never mutate device state. */
ND.learnMacs = function (topo, aDev, aIfc, bDev, bIfc) {
  for (const sw of Object.values(topo.devs)) {
    if (sw.type !== 'switch') continue;
    for (const [dev, ifc] of [[aDev, aIfc], [bDev, bIfc]]) {
      if (!dev || !ifc || dev === sw) continue;
      const portName = ND.portToward(topo, sw, dev);
      if (!portName) continue;
      const port = sw.ifaces[portName];
      if (!port || port.noSwitchport) continue;
      const vlan = ND.vlanOfHost(topo, dev)
        ?? (ND.operMode(topo, sw, port) === 'access' ? port.accessVlan : port.nativeVlan);
      if (!sw.vlans[vlan]) continue;
      // a MAC lives on exactly one port per VLAN — moving it replaces the old entry
      sw.macTable = sw.macTable.filter(e => !(e.mac === ifc.mac && e.vlan === vlan));
      sw.macTable.push({ key: ifc.mac + '|' + portName, vlan, mac: ifc.mac, port: portName });
      ND.portSecLearn(topo, sw, port, ifc.mac);
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

/* Port cost by speed, from the modern (short) IEEE cost table. A bundle is one
   logical port, and cheaper than a single member because it carries more. */
ND.stpPortCost = function (name) {
  if (/^TenGigabit/.test(name)) return 2;
  if (/^Port-channel/.test(name)) return 3;
  if (/^Gigabit/.test(name)) return 4;
  if (/^Fast/.test(name)) return 19;
  return 100;
};

/* Bridge ID: priority (plus the VLAN, the sys-id-ext) then MAC, as one
   comparable string so that ties fall through to the address exactly as the
   election does. */
ND.stpBridgeId = function (dev, vlan) {
  const prio = (dev.stp.prio[vlan] ?? 32768) + vlan;
  const first = dev.ifaces[Object.keys(dev.ifaces)[0]];
  const mac = first ? first.mac : 'ffff.ffff.ffff';
  return { prio, mac, key: String(prio).padStart(6, '0') + '|' + mac };
};

/* The ports that take part in the tree for one VLAN. Bundle members are not
   ports of their own here: the Port-channel stands in for all of them, which is
   the whole reason an EtherChannel does not get half of itself blocked. */
function stpLogicalPorts(topo, dev, vlan) {
  const out = [], seenPo = new Set();
  for (const ifc of Object.values(dev.ifaces)) {
    if (!/^(Gigabit|Fast|Ten|Ether)/.test(ifc.name) || ifc.noSwitchport) continue;
    if (!ND.ifaceUp(topo, dev, ifc)) continue;
    const l2 = ND.l2Settings(dev, ifc);
    const mode = ND.operMode(topo, dev, l2);
    if (mode === 'routed') continue;
    if (mode === 'access' ? l2.accessVlan !== vlan : !ND.allowedOnTrunk(l2, vlan)) continue;
    if (!dev.vlans[vlan]) continue;
    const peer = ND.linkPeer(topo, dev, ifc.name);
    const po = ifc.channelGroup ? dev.ifaces['Port-channel' + ifc.channelGroup.id] : null;
    if (po) {
      if (seenPo.has(po.name)) { out.find(x => x.ifc === po).members.push(ifc.name); continue; }
      seenPo.add(po.name);
      out.push({ ifc: po, members: [ifc.name], cost: ND.stpPortCost(po.name), peer });
    } else {
      out.push({ ifc, members: [], cost: ND.stpPortCost(ifc.name), peer });
    }
  }
  return out;
}

/* Build the spanning tree for one VLAN: cheapest path from every switch back to
   the root, then a role for each port. Exactly one root port per non-root
   switch, one designated port per segment, and whatever is left over is an
   alternate port — which is the port that blocks and breaks the loop. */
ND.stpTopology = function (topo, vlan) {
  const root = ND.stpRoot(topo, vlan);
  if (!root) return null;
  const switches = Object.values(topo.devs).filter(d => d.type === 'switch' && d.vlans[vlan]);
  if (!switches.some(d => d === root.dev)) return null;
  const ports = {}, cost = {};
  for (const d of switches) { ports[d.id] = stpLogicalPorts(topo, d, vlan); cost[d.id] = Infinity; }
  cost[root.dev.id] = 0;

  /* Relax until the costs settle: root path cost is the peer's cost plus the
     cost of the port the BPDU arrived on, never the port it left by. */
  for (let pass = 0; pass < switches.length; pass++) {
    let changed = false;
    for (const d of switches) {
      for (const p of ports[d.id]) {
        if (!p.peer || p.peer.dev.type !== 'switch' || cost[p.peer.dev.id] === undefined) continue;
        const alt = cost[p.peer.dev.id] + p.cost;
        if (alt < cost[d.id]) { cost[d.id] = alt; changed = true; }
      }
    }
    if (!changed) break;
  }

  const roles = new Map();
  for (const d of switches) {
    const isRoot = d.id === root.dev.id;
    let rp = null;
    if (!isRoot) {
      for (const p of ports[d.id]) {
        if (!p.peer || p.peer.dev.type !== 'switch' || cost[p.peer.dev.id] === undefined) continue;
        if (cost[p.peer.dev.id] + p.cost !== cost[d.id]) continue;
        if (!rp) { rp = p; continue; }
        const a = ND.stpBridgeId(p.peer.dev, vlan).key, b = ND.stpBridgeId(rp.peer.dev, vlan).key;
        if (a < b || (a === b && p.ifc.name < rp.ifc.name)) rp = p;
      }
    }
    for (const p of ports[d.id]) {
      let role;
      if (isRoot) role = 'Desg';
      else if (p === rp) role = 'Root';
      else if (!p.peer || p.peer.dev.type !== 'switch' || cost[p.peer.dev.id] === undefined) role = 'Desg';
      else {
        const mine = cost[d.id], theirs = cost[p.peer.dev.id];
        if (mine < theirs) role = 'Desg';
        else if (mine > theirs) role = 'Altn';
        else role = ND.stpBridgeId(d, vlan).key < ND.stpBridgeId(p.peer.dev, vlan).key ? 'Desg' : 'Altn';
      }
      const entry = { role, sts: role === 'Altn' ? 'BLK' : 'FWD', cost: p.cost, name: p.ifc.name };
      roles.set(d.id + '|' + p.ifc.name, entry);
      /* members answer for the bundle, so a blocked Po blocks every member */
      for (const m of p.members) roles.set(d.id + '|' + m, entry);
    }
  }
  return { root, cost, roles, ports };
};

/* Is this port discarding for the VLAN? Used by the forwarding path, so that a
   redundant link is genuinely unused rather than merely labelled that way. */
ND.stpBlocked = function (topo, dev, ifcName, vlan) {
  const t = ND.stpTopology(topo, vlan);
  if (!t) return false;
  const e = t.roles.get(dev.id + '|' + ifcName);
  return !!(e && e.sts === 'BLK');
};

/* ============ NAT check (used by show + labs) ============ */
ND.natTranslations = function (topo, dev) {
  const out = [];
  for (const s of dev.nat.statics) out.push({ inside: s.local, global: s.global, type: 'static' });
  return out;
};

window.ND = ND;
})();
