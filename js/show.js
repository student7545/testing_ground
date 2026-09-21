/* NetDrill show — renders IOS "show" output from device state. */
'use strict';
(function () {
const ND = window.ND;
const pad = (s, n) => String(s ?? '').padEnd(n);

/* ---------- running-config ---------- */
ND.runningConfig = function (topo, dev) {
  const L = [];
  L.push('Building configuration...', '', `Current configuration : ${800 + Math.floor(Math.random() * 200)} bytes`, '!', 'version 15.2', 'no service timestamps log datetime msec', 'no service timestamps debug datetime msec');
  L.push(dev.svcEnc ? 'service password-encryption' : 'no service password-encryption', '!');
  L.push(`hostname ${dev.hostname}`, '!');
  if (dev.enableSecret) L.push(`enable secret 5 ${ND.type5(dev.enableSecret)}`);
  if (dev.enablePassword) L.push(`enable password ${dev.svcEnc ? '7 ' + ND.type7(dev.enablePassword) : dev.enablePassword}`);
  if (dev.enableSecret || dev.enablePassword) L.push('!');
  for (const [u, o] of Object.entries(dev.users)) L.push(`username ${u} secret 5 ${ND.type5(o.secret)}`);
  if (!dev.domainLookup) L.push('no ip domain-lookup');
  if (dev.domainName) L.push(`ip domain-name ${dev.domainName}`);
  if (dev.rsaKey) L.push(`crypto key generate rsa (key size ${dev.rsaKey})  ! keys are not shown in config`);
  if (dev.sshVersion === 2) L.push('ip ssh version 2');
  if (dev.type === 'switch') {
    if (dev.vtp.domain) L.push(`vtp domain ${dev.vtp.domain}`);
    if (dev.vtp.mode !== 'server') L.push(`vtp mode ${dev.vtp.mode}`);
    L.push(`spanning-tree mode ${dev.stp.mode === 'rapid' ? 'rapid-pvst' : 'pvst'}`);
    for (const [v, p] of Object.entries(dev.stp.prio)) L.push(`spanning-tree vlan ${v} priority ${p}`);
    if (dev.stp.portfastDefault) L.push('spanning-tree portfast default');
    if (dev.stp.bpduguardDefault) L.push('spanning-tree portfast bpduguard default');
  }
  if (dev.ipRouting && dev.type === 'switch') L.push('ip routing');
  if (dev.ipv6Routing) L.push('ipv6 unicast-routing');
  if (dev.dhcp.snooping.enabled) {
    L.push('ip dhcp snooping');
    if (dev.dhcp.snooping.vlans.length) L.push(`ip dhcp snooping vlan ${ND.fmtVlanList(dev.dhcp.snooping.vlans)}`);
  }
  if (dev.arai && dev.arai.vlans.length) L.push(`ip arp inspection vlan ${ND.fmtVlanList(dev.arai.vlans)}`);
  if (dev.arai && dev.arai.validate.length) L.push(`ip arp inspection validate ${dev.arai.validate.join(' ')}`);
  if (dev.qos && dev.qos.enabled) L.push('mls qos');
  if (dev.mgmt && dev.mgmt.netconf) L.push('netconf-yang');
  if (dev.mgmt && dev.mgmt.restconf) L.push('restconf');
  if (dev.aaa && dev.aaa.newModel) L.push('aaa new-model');
  if (dev.aaa && dev.aaa.loginDefault) L.push(`aaa authentication login default ${dev.aaa.loginDefault === 'local' ? 'local' : 'group ' + dev.aaa.loginDefault.replace(' local', '') + ' local'}`);
  for (const n of dev.nameServers) L.push(`ip name-server ${n}`);
  for (const [h, ip] of Object.entries(dev.hosts || {})) L.push(`ip host ${h} ${ip}`);
  if (dev.services) {
    const sv = dev.services;
    if (sv.loginBlock) L.push(`login block-for ${sv.loginBlock.blockFor} attempts ${sv.loginBlock.attempts} within ${sv.loginBlock.within}`);
    if (sv.minPassLen) L.push(`security passwords min-length ${sv.minPassLen}`);
    if (sv.ftpUser) L.push(`ip ftp username ${sv.ftpUser}`);
    if (sv.ftpPass) L.push(`ip ftp password ${sv.ftpPass}`);
    if (!sv.http) L.push('no ip http server');
    if (!sv.httpSecure) L.push('no ip http secure-server');
  }
  for (const [lo, hi] of dev.dhcp.excluded) L.push(`ip dhcp excluded-address ${lo}${hi ? ' ' + hi : ''}`);
  for (const p of Object.values(dev.dhcp.pools)) {
    L.push(`ip dhcp pool ${p.name}`);
    if (p.network) L.push(` network ${p.network} ${p.mask}`);
    if (p.router) L.push(` default-router ${p.router}`);
    if (p.dns) L.push(` dns-server ${p.dns}`);
    if (p.domain) L.push(` domain-name ${p.domain}`);
    if (p.lease) L.push(` lease ${p.lease}`);
  }
  L.push('!');
  if (dev.type === 'switch') {
    const vids = Object.keys(dev.vlans).map(Number).filter(v => v > 1 && v < 1002).sort((a, b) => a - b);
    for (const v of vids) { L.push(`vlan ${v}`); if (dev.vlans[v].name && dev.vlans[v].name !== `VLAN${String(v).padStart(4, '0')}`) L.push(` name ${dev.vlans[v].name}`); }
    if (vids.length) L.push('!');
  }
  const order = Object.keys(dev.ifaces).sort(ifSort);
  for (const name of order) {
    const i = dev.ifaces[name];
    L.push(`interface ${name}`);
    if (i.desc) L.push(` description ${i.desc}`);
    if (i.encapDot1q) L.push(` encapsulation dot1Q ${i.encapDot1q.vlan}${i.encapDot1q.native ? ' native' : ''}`);
    if (dev.type === 'switch' && /^(Gigabit|Fast|Ten|Ether|Port-channel)/.test(name)) {
      if (i.noSwitchport) L.push(' no switchport');
      else {
        if (i.trunkEncap === 'dot1q' && /^(Gigabit|Fast)/.test(name)) L.push(' switchport trunk encapsulation dot1q');
        if (i.swMode === 'trunk') L.push(' switchport mode trunk');
        if (i.swMode === 'access') L.push(' switchport mode access');
        if (i.swMode === 'dynamic' && i.dtp === 'desirable') L.push(' switchport mode dynamic desirable');
        if (i.accessVlan !== 1) L.push(` switchport access vlan ${i.accessVlan}`);
        if (i.voiceVlan) L.push(` switchport voice vlan ${i.voiceVlan}`);
        if (i.nativeVlan !== 1) L.push(` switchport trunk native vlan ${i.nativeVlan}`);
        if (i.allowed !== null) L.push(` switchport trunk allowed vlan ${ND.fmtVlanList(i.allowed)}`);
        if (i.nonegotiate) L.push(' switchport nonegotiate');
        if (i.portSec && i.portSec.enabled) {
          L.push(' switchport port-security');
          if (i.portSec.max !== 1) L.push(` switchport port-security maximum ${i.portSec.max}`);
          if (i.portSec.violation !== 'shutdown') L.push(` switchport port-security violation ${i.portSec.violation}`);
          if (i.portSec.sticky) L.push(' switchport port-security mac-address sticky');
          for (const m of i.portSec.macs) L.push(` switchport port-security mac-address ${m}`);
          for (const m of i.portSec.stickyLearned) L.push(` switchport port-security mac-address sticky ${m}`);
        }
      }
    }
    if (i.channelGroup) L.push(` channel-group ${i.channelGroup.id} mode ${i.channelGroup.mode}`);
    if (i.stpPortfast) L.push(' spanning-tree portfast');
    if (i.bpduguard) L.push(' spanning-tree bpduguard enable');
    if (i.ip) L.push(` ip address ${i.ip.addr} ${i.ip.mask}`);
    else if (dev.type === 'router' && !i.parent && !/^(Loopback|Vlan)/.test(name)) L.push(' no ip address');
    for (const h of i.helpers) L.push(` ip helper-address ${h}`);
    if (i.aclIn) L.push(` ip access-group ${i.aclIn} in`);
    if (i.aclOut) L.push(` ip access-group ${i.aclOut} out`);
    if (i.natInside) L.push(' ip nat inside');
    if (i.natOutside) L.push(' ip nat outside');
    if (i.ipv6Enable) L.push(' ipv6 enable');
    for (const a of i.ipv6) L.push(` ipv6 address ${a.addr}/${a.len}${a.eui64 ? ' eui-64' : ''}`);
    if (i.ipv6LL) L.push(` ipv6 address ${i.ipv6LL} link-local`);
    if (i.ospf.pid !== null) L.push(` ip ospf ${i.ospf.pid} area ${i.ospf.area}`);
    if (i.ospf.cost !== null) L.push(` ip ospf cost ${i.ospf.cost}`);
    if (i.ospf.priority !== null) L.push(` ip ospf priority ${i.ospf.priority}`);
    if (i.ospf.netType !== 'broadcast') L.push(` ip ospf network ${i.ospf.netType}`);
    for (const [g, st] of Object.entries(i.standby)) {
      if (st.version === 2) L.push(' standby version 2');
      if (st.ip) L.push(` standby ${g} ip ${st.ip}`);
      if (st.priority != null) L.push(` standby ${g} priority ${st.priority}`);
      if (st.preempt) L.push(` standby ${g} preempt`);
    }
    if (i.speed !== 'auto') L.push(` speed ${i.speed}`);
    if (i.duplex !== 'auto') L.push(` duplex ${i.duplex}`);
    if (!i.cdpEnabled) L.push(' no cdp enable');
    if (i.snoopTrust) L.push(' ip dhcp snooping trust');
    if (i.araiTrust) L.push(' ip arp inspection trust');
    if (i.araiRate) L.push(` ip arp inspection limit rate ${i.araiRate}`);
    if (i.qosTrust) L.push(` mls qos trust ${i.qosTrust}`);
    if (i.qosCos != null) L.push(` mls qos cos ${i.qosCos}`);
    if (i.poe) L.push(` power inline ${i.poe}`);
    if (i.shutdown && !(dev.type === 'router' && !i.ip && !i.ipv6.length && i.shutdown)) L.push(' shutdown');
    else if (i.shutdown) L.push(' shutdown');
    L.push('!');
  }
  if (dev.snmp && (dev.snmp.communities.length || dev.snmp.location || dev.snmp.contact || dev.snmp.hosts.length)) {
    for (const cm of dev.snmp.communities) L.push(`snmp-server community ${cm.name} ${cm.access}`);
    if (dev.snmp.location) L.push(`snmp-server location ${dev.snmp.location}`);
    if (dev.snmp.contact) L.push(`snmp-server contact ${dev.snmp.contact}`);
    for (const h of dev.snmp.hosts) L.push(`snmp-server host ${h.ip} version ${h.version} ${h.community}`);
    if (dev.snmp.traps) L.push('snmp-server enable traps');
    L.push('!');
  }
  if (dev.ospf) {
    const o = dev.ospf;
    L.push(`router ospf ${o.pid}`);
    if (o.routerId) L.push(` router-id ${o.routerId}`);
    if (o.refBw !== 100) L.push(` auto-cost reference-bandwidth ${o.refBw}`);
    if (o.passiveDefault) L.push(' passive-interface default');
    for (const p of o.passive) L.push(` passive-interface ${p}`);
    for (const p of o.noPassive) L.push(` no passive-interface ${p}`);
    for (const n of o.networks) L.push(` network ${n.net} ${n.wild} area ${n.area}`);
    if (o.defaultInfo) L.push(' default-information originate');
    if (o.maxPaths !== 4) L.push(` maximum-paths ${o.maxPaths}`);
    L.push('!');
  }
  if (dev.defaultGateway) L.push(`ip default-gateway ${dev.defaultGateway}`);
  for (const r of dev.staticRoutes) L.push(`ip route ${r.net} ${r.mask} ${r.viaIfc || r.via}${r.ad && r.ad !== 1 ? ' ' + r.ad : ''}`);
  for (const r of dev.v6Routes) L.push(`ipv6 route ${r.prefix}/${r.len} ${r.via}`);
  for (const s of dev.nameServers) L.push(`ip name-server ${s}`);
  for (const [id, acl] of Object.entries(dev.acls)) {
    if (acl.numbered) { for (const e of acl.entries) L.push(`access-list ${id} ${e.raw}`); }
    else {
      L.push(`ip access-list ${acl.type} ${id}`);
      for (const e of acl.entries) L.push(` ${e.raw}`);
    }
  }
  for (const s of dev.nat.statics) L.push(`ip nat inside source static ${s.local} ${s.global}`);
  if (dev.nat.dynamic) L.push(`ip nat inside source list ${dev.nat.dynamic.acl} interface ${dev.nat.dynamic.iface}${dev.nat.dynamic.overload ? ' overload' : ''}`);
  for (const h of dev.logging.hosts) L.push(`logging host ${h}`);
  if (dev.logging.trap !== 'informational') L.push(`logging trap ${dev.logging.trap}`);
  if (dev.logging.buffered) L.push(`logging buffered ${dev.logging.buffered}`);
  for (const s of dev.ntp.servers) L.push(`ntp server ${s}`);
  if (dev.ntp.master) L.push(`ntp master ${dev.ntp.master === true ? '' : dev.ntp.master}`.trim());
  if (dev.banner) L.push(`banner motd ^C${dev.banner}^C`);
  L.push('!');
  for (const [ln, key] of [['con 0', 'con'], ['vty 0 4', 'vty']]) {
    const l = dev.lines[key];
    L.push(`line ${ln}`);
    if (l.password) L.push(` password ${dev.svcEnc ? '7 ' + ND.type7(l.password) : l.password}`);
    if (l.accessClass) L.push(` access-class ${l.accessClass} in`);
    if (l.execTimeout) L.push(` exec-timeout ${l.execTimeout}`);
    if (l.loginLocal) L.push(' login local');
    else if (l.login) L.push(' login');
    if (l.sync) L.push(' logging synchronous');
    if (key === 'vty' && l.transport !== 'all') L.push(` transport input ${l.transport}`);
    L.push('!');
  }
  L.push('end');
  return L.join('\n');

  function ifSort(a, b) {
    const w = n => (/^Loopback/.test(n) ? 5 : /^Vlan/.test(n) ? 4 : /^Port-channel/.test(n) ? 3 : /^Tunnel/.test(n) ? 6 : 0);
    return w(a) - w(b) || a.localeCompare(b, undefined, { numeric: true });
  }
};

/* ---------- show ip interface brief ---------- */
ND.showIpIntBrief = function (topo, dev) {
  const L = [pad('Interface', 23) + pad('IP-Address', 16) + pad('OK?', 4) + pad('Method', 7) + pad('Status', 22) + 'Protocol'];
  const names = Object.keys(dev.ifaces).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const n of names) {
    const i = dev.ifaces[n];
    if (dev.type === 'switch' && !i.noSwitchport && !/^(Vlan|Loopback|Port-channel)/.test(n) && !i.ip) {
      // switch access ports show unassigned in ip int brief too
    }
    const up = ND.ifaceUp(topo, dev, i);
    const status = i.shutdown ? 'administratively down' : i.errDisabled ? 'down' : up ? 'up' : 'down';
    const proto = up && !i.shutdown ? 'up' : 'down';
    L.push(pad(n, 23) + pad(i.ip ? i.ip.addr : 'unassigned', 16) + pad('YES', 4) + pad(i.ip ? 'manual' : 'unset', 7) + pad(status, 22) + proto);
  }
  return L.join('\n');
};

/* ---------- show interfaces status (switch) ---------- */
ND.showIntStatus = function (topo, dev) {
  const L = [pad('Port', 10) + pad('Name', 19) + pad('Status', 13) + pad('Vlan', 11) + pad('Duplex', 7) + pad('Speed', 7) + 'Type'];
  for (const n of Object.keys(dev.ifaces).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
    const i = dev.ifaces[n];
    if (!/^(Gigabit|Fast|Ten|Ether|Port-channel)/.test(n)) continue;
    const up = ND.ifaceUp(topo, dev, i);
    const status = i.errDisabled ? 'err-disabled' : i.shutdown ? 'disabled' : up ? 'connected' : 'notconnect';
    const mode = ND.operMode(topo, dev, i);
    const vlan = i.noSwitchport ? 'routed' : mode === 'trunk' ? 'trunk' : String(i.accessVlan);
    const dup = i.duplex === 'auto' ? (up ? 'a-full' : 'auto') : i.duplex;
    const spd = i.speed === 'auto' ? (up ? 'a-1000' : 'auto') : i.speed;
    L.push(pad(ND.shortIface(n), 10) + pad(i.desc.slice(0, 18), 19) + pad(status, 13) + pad(vlan, 11) + pad(dup, 7) + pad(spd, 7) + '10/100/1000BaseTX');
  }
  return L.join('\n');
};

/* ---------- show vlan brief ---------- */
ND.showVlanBrief = function (topo, dev) {
  const L = ['VLAN Name                             Status    Ports', '---- -------------------------------- --------- -------------------------------'];
  const ids = Object.keys(dev.vlans).map(Number).sort((a, b) => a - b);
  for (const v of ids) {
    const ports = Object.values(dev.ifaces)
      .filter(i => /^(Gigabit|Fast|Ten|Ether)/.test(i.name) && !i.noSwitchport && ND.operMode(topo, dev, i) === 'access' && i.accessVlan === v && !i.channelGroup)
      .map(i => ND.shortIface(i.name));
    const status = v >= 1002 ? 'act/unsup' : 'active';
    const name = dev.vlans[v].name || `VLAN${String(v).padStart(4, '0')}`;
    let line = pad(v, 5) + pad(name, 33) + pad(status, 10);
    L.push(line + ports.slice(0, 4).join(', '));
    for (let k = 4; k < ports.length; k += 4) L.push(' '.repeat(48) + ports.slice(k, k + 4).join(', '));
  }
  return L.join('\n');
};

/* ---------- show interfaces trunk ---------- */
ND.showIntTrunk = function (topo, dev) {
  const trunks = Object.values(dev.ifaces).filter(i => /^(Gigabit|Fast|Ten|Ether|Port-channel)/.test(i.name) && !i.noSwitchport && ND.operMode(topo, dev, i) === 'trunk' && ND.ifaceUp(topo, dev, i) && !i.channelGroup);
  if (!trunks.length) return '';
  const L = [pad('Port', 12) + pad('Mode', 13) + pad('Encapsulation', 15) + pad('Status', 10) + 'Native vlan'];
  for (const t of trunks) L.push(pad(ND.shortIface(t.name), 12) + pad(t.swMode === 'trunk' ? 'on' : 'auto', 13) + pad('802.1q', 15) + pad('trunking', 10) + t.nativeVlan);
  L.push('', pad('Port', 12) + 'Vlans allowed on trunk');
  for (const t of trunks) L.push(pad(ND.shortIface(t.name), 12) + (t.allowed === null ? '1-4094' : ND.fmtVlanList(t.allowed)));
  L.push('', pad('Port', 12) + 'Vlans allowed and active in management domain');
  for (const t of trunks) {
    const act = Object.keys(dev.vlans).map(Number).filter(v => v < 1002 && (t.allowed === null || t.allowed.includes(v)));
    L.push(pad(ND.shortIface(t.name), 12) + ND.fmtVlanList(act));
  }
  return L.join('\n');
};

/* ---------- show ip route ---------- */
ND.showIpRoute = function (topo, dev) {
  const L = ['Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP',
    '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area',
    '       E1 - OSPF external type 1, E2 - OSPF external type 2, i - IS-IS',
    '       * - candidate default, U - per-user static route', ''];
  const rt = ND.routeTable(topo, dev);
  const def = rt.find(r => r.net === '0.0.0.0');
  L.push('Gateway of last resort is ' + (def ? (def.nextHop || 'directly connected') + ' to network 0.0.0.0' : 'not set'), '');
  const sorted = [...rt].sort((a, b) => ND.ip2int(a.net) - ND.ip2int(b.net));
  for (const r of sorted) {
    const len = ND.mask2len(r.mask);
    const via = r.proto === 'C' ? `is directly connected, ${r.ifc.name}`
      : r.proto === 'GW' ? ''
      : `[${r.proto.startsWith('O') ? '110' : String(r.ad ?? 1)}/${r.proto.startsWith('O') ? '2' : '0'}] via ${r.nextHop || ''}${r.ifc ? (r.nextHop ? ', ' : '') + (r.ifc.name || r.ifc) : ''}`;
    const code = r.proto === 'C' ? 'C' : r.proto === 'S' ? (r.net === '0.0.0.0' ? 'S*' : 'S') : r.proto === 'O*E2' ? 'O*E2' : r.proto;
    if (r.proto !== 'GW') L.push(`${pad(code, 6)}${r.net}/${len} ${via}`);
    if (r.proto === 'C' && r.local) L.push(`${pad('L', 6)}${r.local}/32 is directly connected, ${r.ifc.name}`);
  }
  if (sorted.length === 0 || (dev.type === 'switch' && !dev.ipRouting && !sorted.some(r => r.proto === 'C'))) {
    if (dev.defaultGateway) L.push(`Default gateway is ${dev.defaultGateway}`);
  }
  return L.join('\n');
};

/* ---------- show mac address-table ---------- */
ND.showMacTable = function (topo, dev) {
  const L = ['          Mac Address Table', '-------------------------------------------', '', 'Vlan    Mac Address       Type        Ports', '----    -----------       --------    -----'];
  const sorted = [...dev.macTable].sort((a, b) => a.vlan - b.vlan || a.mac.localeCompare(b.mac));
  for (const e of sorted) L.push(pad('   ' + e.vlan, 8) + pad(e.mac, 18) + pad('DYNAMIC', 12) + ND.shortIface(e.port));
  L.push(`Total Mac Addresses for this criterion: ${sorted.length}`);
  return L.join('\n');
};

/* ---------- show ip ospf neighbor ---------- */
ND.showOspfNeighbor = function (topo, dev) {
  const adjs = ND.ospfNeighbors(topo, dev);
  if (!adjs.length) return '';
  const L = [pad('Neighbor ID', 16) + pad('Pri', 5) + pad('State', 16) + pad('Dead Time', 12) + pad('Address', 16) + 'Interface'];
  for (const a of adjs) {
    const rid = ND.routerId(topo, a.peerDev);
    const myRid = ND.routerId(topo, dev);
    const pri = a.peerIfc.ospf.priority ?? 1;
    const iAmDr = ND.ip2int(myRid) > ND.ip2int(rid);
    const state = a.ifc.ospf.netType === 'point-to-point' ? 'FULL/  -' : (iAmDr ? 'FULL/BDR' : 'FULL/DR');
    L.push(pad(rid, 16) + pad(pri, 5) + pad(state, 16) + pad('00:00:3' + (3 + adjs.indexOf(a)) % 10, 12) + pad(a.peerIfc.ip.addr, 16) + a.ifc.name);
  }
  return L.join('\n');
};

/* ---------- show standby brief ---------- */
ND.showStandbyBrief = function (topo, dev) {
  const rows = [];
  for (const ifc of Object.values(dev.ifaces)) {
    for (const [g, st] of Object.entries(ifc.standby)) {
      if (!st.ip) continue;
      const active = ND.hsrpActive(topo, dev, ifc, +g);
      let peerIp = 'unknown';
      for (const ep of ND.l2Endpoints(topo, dev, ifc)) {
        if (ep.ifc.standby && ep.ifc.standby[g] && ep.ifc.ip) peerIp = ep.ifc.ip.addr;
      }
      rows.push(pad(ND.shortIface(ifc.name), 10) + pad(g, 5) + pad(st.priority ?? 100, 5) + pad(st.preempt ? 'P' : ' ', 2) + pad(active ? 'Active' : 'Standby', 9)
        + pad(active ? 'local' : peerIp, 17) + pad(active ? peerIp : 'local', 17) + st.ip);
    }
  }
  if (!rows.length) return '';
  return ['                     P indicates configured to preempt.', '                     |',
    pad('Interface', 10) + pad('Grp', 5) + pad('Pri', 5) + pad('P', 2) + pad('State', 9) + pad('Active', 17) + pad('Standby', 17) + 'Virtual IP', ...rows].join('\n');
};

/* ---------- show etherchannel summary ---------- */
ND.showEtherchannel = function (topo, dev) {
  const groups = {};
  for (const i of Object.values(dev.ifaces)) if (i.channelGroup) (groups[i.channelGroup.id] = groups[i.channelGroup.id] || []).push(i);
  const L = ['Flags:  D - down        P - bundled in port-channel', '        I - stand-alone s - suspended', '        S - Layer2       U - in use', '',
    `Number of channel-groups in use: ${Object.keys(groups).length}`, `Number of aggregators:           ${Object.keys(groups).length}`, '',
    pad('Group', 7) + pad('Port-channel', 14) + pad('Protocol', 10) + 'Ports'];
  for (const [id, members] of Object.entries(groups)) {
    const mode = members[0].channelGroup.mode;
    const proto = mode === 'on' ? '   -' : (['active', 'passive'].includes(mode) ? 'LACP' : 'PAgP');
    let formed = false;
    const peer = ND.linkPeer(topo, dev, members[0].name);
    if (peer && peer.dev.ifaces[peer.iface] && peer.dev.ifaces[peer.iface].channelGroup)
      formed = ND.channelForms(mode, peer.dev.ifaces[peer.iface].channelGroup.mode);
    const flag = formed ? 'P' : 'I';
    L.push(pad(id, 7) + pad(`Po${id}(S${formed ? 'U' : 'D'})`, 14) + pad(proto, 10) + members.map(m => `${ND.shortIface(m.name)}(${flag})`).join(' '));
  }
  return L.join('\n');
};

/* ---------- show port-security ---------- */
ND.showPortSec = function (topo, dev, ifName) {
  if (ifName) {
    const i = ND.getIface(dev, ifName);
    if (!i || !i.portSec || !i.portSec.enabled) return '';
    const ps = i.portSec;
    const learned = ps.macs.length + ps.stickyLearned.length + (ps.dynLearned || []).length;
    return [
      'Port Security              : Enabled',
      `Port Status                : ${i.errDisabled ? 'Secure-shutdown' : 'Secure-up'}`,
      `Violation Mode             : ${ps.violation}`,
      'Aging Time                 : 0 mins',
      `Maximum MAC Addresses      : ${ps.max}`,
      `Total MAC Addresses        : ${learned}`,
      `Configured MAC Addresses   : ${ps.macs.length}`,
      `Sticky MAC Addresses       : ${ps.stickyLearned.length}`,
      `Security Violation Count   : ${ps.violations || 0}`,
    ].join('\n');
  }
  const L = [pad('Secure Port', 14) + pad('MaxSecureAddr', 15) + pad('CurrentAddr', 13) + pad('SecurityViolation', 19) + 'Security Action',
    pad('', 14) + pad('(Count)', 15) + pad('(Count)', 13) + pad('(Count)', 19), '---------------------------------------------------------------------------'];
  for (const i of Object.values(dev.ifaces)) {
    if (i.portSec && i.portSec.enabled) {
      const cur = i.portSec.macs.length + i.portSec.stickyLearned.length + (i.portSec.dynLearned || []).length;
      L.push(pad('    ' + ND.shortIface(i.name), 14) + pad('       ' + i.portSec.max, 15) + pad('      ' + cur, 13) + pad('        ' + (i.portSec.violations || 0), 19) + i.portSec.violation.charAt(0).toUpperCase() + i.portSec.violation.slice(1));
    }
  }
  return L.join('\n');
};

/* ---------- show cdp/lldp neighbors ---------- */
ND.showCdpNeighbors = function (topo, dev) {
  const L = ['Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge',
    '                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone', '',
    pad('Device ID', 17) + pad('Local Intrfce', 16) + pad('Holdtme', 10) + pad('Capability', 12) + pad('Platform', 10) + 'Port ID'];
  for (const n of ND.cdpNeighbors(topo, dev)) {
    const cap = n.dev.type === 'router' ? 'R' : n.dev.l3switch ? 'R S' : 'S';
    const plat = n.dev.type === 'router' ? 'ISR4321' : 'WS-C2960';
    L.push(pad(n.dev.hostname, 17) + pad(ND.shortIface(n.local), 16) + pad('154', 10) + pad(cap, 12) + pad(plat, 10) + ND.shortIface(n.remote));
  }
  return L.join('\n');
};
ND.showLldpNeighbors = function (topo, dev) {
  const L = ['Capability codes:', '    (R) Router, (B) Bridge, (T) Telephone, (C) DOCSIS Cable Device',
    '    (W) WLAN Access Point, (P) Repeater, (S) Station, (O) Other', '',
    pad('Device ID', 17) + pad('Local Intf', 13) + pad('Hold-time', 11) + pad('Capability', 12) + 'Port ID'];
  const ns = ND.lldpNeighbors(topo, dev);
  for (const n of ns) L.push(pad(n.dev.hostname, 17) + pad(ND.shortIface(n.local), 13) + pad('120', 11) + pad(n.dev.type === 'router' ? 'R' : 'B', 12) + ND.shortIface(n.remote));
  L.push('', `Total entries displayed: ${ns.length}`);
  return L.join('\n');
};

/* ---------- misc ---------- */
ND.showVersion = function (dev) {
  const model = dev.type === 'router' ? 'ISR4321/K9' : 'WS-C2960-24TT-L';
  return [`Cisco IOS Software, ${dev.type === 'router' ? 'ISR' : 'C2960'} Software, Version 15.2(4)M6, RELEASE SOFTWARE (fc2)`,
    'Technical Support: http://www.cisco.com/techsupport', 'Copyright (c) 1986-2026 by Cisco Systems, Inc.', '',
    `${dev.hostname} uptime is 2 hours, 14 minutes`, `System image file is "flash:${dev.type}-image.bin"`, '',
    `Cisco ${model} with 1048576K bytes of memory.`, '',
    'Configuration register is 0x2102'].join('\n');
};

ND.showVtp = function (dev) {
  return ['VTP Version capable             : 1 to 3', 'VTP version running             : 1',
    `VTP Domain Name                 : ${dev.vtp.domain || ''}`, 'VTP Pruning Mode                : Disabled',
    `VTP Operating Mode              : ${dev.vtp.mode.charAt(0).toUpperCase() + dev.vtp.mode.slice(1)}`,
    `Number of existing VLANs        : ${Object.keys(dev.vlans).length}`].join('\n');
};

ND.showAccessLists = function (dev) {
  const L = [];
  for (const [id, acl] of Object.entries(dev.acls)) {
    L.push(`${acl.type.charAt(0).toUpperCase() + acl.type.slice(1)} IP access list ${id}`);
    let seq = 10;
    for (const e of acl.entries) { L.push(`    ${e.seq || seq} ${e.raw}`); seq += 10; }
  }
  return L.join('\n');
};

ND.showNtp = function (topo, dev) {
  if (dev.ntp.master) return `Clock is synchronized, stratum ${dev.ntp.master === true ? 8 : dev.ntp.master}, reference is 127.127.1.1\nnominal freq is 250.0000 Hz, actual freq is 250.0000 Hz, precision is 2**10`;
  if (dev.ntp.servers.length) {
    const srv = dev.ntp.servers[0];
    const owner = ND.deviceOwning(topo, srv);
    const reach = owner && ND.tracePacket(topo, dev, srv, { proto: 'udp', dstPort: 123 }).ok;
    return reach
      ? `Clock is synchronized, stratum 9, reference is ${srv}\nnominal freq is 250.0000 Hz, actual freq is 250.0000 Hz, precision is 2**10`
      : 'Clock is unsynchronized, stratum 16, no reference clock';
  }
  return 'Clock is unsynchronized, stratum 16, no reference clock';
};

ND.showIpv6IntBrief = function (topo, dev) {
  const L = [];
  for (const n of Object.keys(dev.ifaces).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
    const i = dev.ifaces[n];
    if (!i.ipv6.length && !i.ipv6LL && !i.ipv6Enable) continue;
    const up = ND.ifaceUp(topo, dev, i);
    L.push(`${n} [${i.shutdown ? 'administratively down/down' : up ? 'up/up' : 'down/down'}]`);
    const ll = i.ipv6LL || ND.eui64LinkLocal(i.mac);
    L.push(`    ${ll}`);
    for (const a of i.ipv6) L.push(`    ${a.eui64 ? ND.applyEui64(a.addr, a.len, i.mac) : a.addr}`);
  }
  return L.length ? L.join('\n') : '';
};

ND.eui64FromMac = function (mac) {
  const hex = mac.replace(/\./g, '');
  const bytes = [];
  for (let k = 0; k < 12; k += 2) bytes.push(parseInt(hex.slice(k, k + 2), 16));
  bytes[0] ^= 0x02;
  const h = bytes.map(b => b.toString(16).padStart(2, '0'));
  return `${h[0]}${h[1]}:${h[2]}ff:fe${h[3]}:${h[4]}${h[5]}`.toUpperCase();
};
ND.eui64LinkLocal = mac => 'FE80::' + ND.eui64FromMac(mac);
ND.applyEui64 = function (prefix, len, mac) {
  const base = prefix.replace(/::.*$/, '').replace(/::$/, '');
  return `${base}::${ND.eui64FromMac(mac)}`;
};

window.ND = ND;
})();
