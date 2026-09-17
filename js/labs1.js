/* NetDrill labs — Volume 1 (JITL Days 1-32: fundamentals, switching, routing). */
'use strict';
(function () {
const ND = window.ND;
ND.LABS = ND.LABS || [];

/* check helpers, bound per-topology at runtime */
ND.checkHelpers = function (topo) {
  const d = id => topo.devs[id];
  const i = (id, ifn) => ND.getIface(topo.devs[id], ifn);
  return {
    topo, d, i,
    hostname: (id, name) => d(id) && d(id).hostname === name,
    hasIp: (id, ifn, ip, mask) => { const x = i(id, ifn); return !!(x && x.ip && x.ip.addr === ip && (!mask || x.ip.mask === mask)); },
    noshut: (id, ifn) => { const x = i(id, ifn); return !!(x && !x.shutdown); },
    up: (id, ifn) => { const x = i(id, ifn); return !!(x && ND.ifaceUp(topo, d(id), x)); },
    ping: (fromId, ip) => ND.tracePacket(topo, d(fromId), ip, { proto: 'icmp' }).ok,
    pingBlocked: (fromId, ip) => { const r = ND.tracePacket(topo, d(fromId), ip, { proto: 'icmp' }); return !r.ok && r.reason === 'acl'; },
    access: (id, ifn, vlan) => { const x = i(id, ifn); return !!(x && x.swMode === 'access' && x.accessVlan === vlan); },
    trunk: (id, ifn) => { const x = i(id, ifn); return !!(x && ND.operMode(topo, d(id), x) === 'trunk'); },
    trunkStatic: (id, ifn) => { const x = i(id, ifn); return !!(x && x.swMode === 'trunk'); },
    vlanExists: (id, v, name) => { const vl = d(id).vlans[v]; return !!vl && (!name || vl.name === name); },
    saved: id => d(id).saved,
    ospfNbr: (aId, bId) => ND.ospfNeighbors(topo, d(aId)).some(n => n.peerDev.id === bId),
    tcp: (fromId, ip, port) => ND.tracePacket(topo, d(fromId), ip, { proto: 'tcp', dstPort: port }).ok,
    tcpBlocked: (fromId, ip, port) => { const r = ND.tracePacket(topo, d(fromId), ip, { proto: 'tcp', dstPort: port }); return !r.ok && r.reason === 'acl'; },
  };
};

const L = lab => ND.LABS.push(lab);

/* ============================================================= */
L({
  id: 'd04-cli-basics', vol: 1, day: 'Day 4', title: 'CLI Basics & Device Security',
  topics: 'CLI modes · hostname · enable secret · service password-encryption · saving configs',
  devices: [{ id: 'SW1', type: 'switch', ifaces: ['g0/1', 'g0/2', 'f0/1', 'f0/2'] }],
  links: [], layout: { SW1: [190, 40] },
  intro: `Your first drill: moving between IOS modes and locking down a switch. This is the exact workflow you'll repeat at the start of <em>every</em> lab in this course, so run this one until your fingers do it without thinking.`,
  tasks: [
    'Rename the switch to SW1',
    'Set enable secret cisco123 and console password ccna (with login)',
    'Encrypt all plaintext passwords',
    'Disable DNS lookup of mistyped commands',
    'Add a MOTD banner',
    'Save the configuration',
  ],
  steps: [
    { t: 'Enter privileged EXEC mode, then global configuration mode.', c: ['enable', 'configure terminal'], note: 'The prompt changes from <code>Switch&gt;</code> to <code>Switch#</code> to <code>Switch(config)#</code>. Watch it every time — the prompt tells you which commands are legal.' },
    { t: 'Give the switch its hostname.', c: ['hostname SW1'] },
    { t: 'Protect privileged EXEC with an encrypted secret.', c: ['enable secret cisco123'] },
    { t: 'Password-protect the console line.', c: ['line console 0', 'password ccna', 'login', 'exit'] },
    { t: 'Encrypt every plaintext password in the config.', c: ['service password-encryption'] },
    { t: 'Stop the switch from trying to DNS-resolve your typos.', c: ['no ip domain-lookup'] },
    { t: 'Configure a message-of-the-day banner.', c: ['banner motd #Authorized access only!#'] },
    { t: 'Return to privileged EXEC and save.', c: ['end', 'copy running-config startup-config'] },
  ],
  verify: ['show running-config', 'show startup-config', 'show history'],
  explain: `<h3>Why these commands?</h3>
<p>IOS has a strict mode hierarchy: <b>user EXEC</b> (<code>&gt;</code>) can only look around, <b>privileged EXEC</b> (<code>#</code>) can view everything and save, and <b>global configuration</b> (<code>(config)#</code>) actually changes the box. <code>enable secret</code> uses an MD5 hash and always beats <code>enable password</code>, which is stored in plaintext — that's why the secret is the one you'll use on the exam and in real life.</p>
<p><code>service password-encryption</code> applies weak (type 7) encryption to line passwords — better than nothing, easily reversed. The real protection is the secret.</p>
<p><code>copy running-config startup-config</code> copies RAM (running) to NVRAM (startup). Nothing survives a reload until you do this.</p>
<p><b>Speed habits:</b> abbreviate everything — <code>en</code>, <code>conf t</code>, <code>int g0/1</code>, <code>do sh run</code> from config mode. Use <kbd>?</kbd> for help and <kbd>Tab</kbd> to complete.</p>`,
  checks: [
    { desc: 'Hostname is SW1', fn: H => H.hostname('SW1', 'SW1') },
    { desc: 'Enable secret is cisco123', fn: H => H.d('SW1').enableSecret === 'cisco123' },
    { desc: 'Console password ccna with login', fn: H => { const l = H.d('SW1').lines.con; return l.password === 'ccna' && l.login; } },
    { desc: 'service password-encryption enabled', fn: H => H.d('SW1').svcEnc },
    { desc: 'DNS lookup disabled (no ip domain-lookup)', fn: H => !H.d('SW1').domainLookup },
    { desc: 'MOTD banner configured', fn: H => !!H.d('SW1').banner },
    { desc: 'Configuration saved to NVRAM', fn: H => H.saved('SW1') },
  ],
});

/* ============================================================= */
L({
  id: 'd06-mac-tables', vol: 1, day: 'Day 6', title: 'Ethernet Switching & MAC Tables',
  topics: 'MAC learning · show mac address-table · clear mac address-table',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.12', mask: '255.255.255.0', gw: null } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2']],
  layout: { PC1: [60, 20], PC2: [60, 90], SW1: [220, 55] },
  intro: `Watch a switch do its one job: learn source MACs and forward frames. You'll generate traffic from the PCs, then read the switch's MAC address table.`,
  tasks: [
    'From PC1, ping PC2 (192.168.1.12) successfully',
    'From PC2, ping PC1 (192.168.1.11) successfully',
    'View the MAC address table on SW1 and identify which port learned which MAC',
    'Clear the dynamic MAC table, then repopulate it with another ping',
  ],
  steps: [
    { t: 'Open the PC1 tab and check its addressing.', c: ['ipconfig'] },
    { t: 'Ping PC2 from PC1 — this makes SW1 learn both source MACs.', c: ['ping 192.168.1.12'] },
    { t: 'Switch to PC2 and ping back.', c: ['ping 192.168.1.11'] },
    { t: 'On SW1, inspect the MAC address table.', c: ['enable', 'show mac address-table'], note: 'Each entry maps a VLAN + MAC to the port it was learned on. Compare with <code>ipconfig /all</code> on the PCs.' },
    { t: 'Clear the table and watch it repopulate after another ping.', c: ['clear mac address-table dynamic', 'show mac address-table'] },
  ],
  verify: ['show mac address-table', 'show interfaces status'],
  explain: `<h3>How switches learn</h3>
<p>A switch examines the <b>source MAC</b> of every frame and records it against the ingress port (dynamic entry, 5-minute aging). Unknown destinations are <b>flooded</b> out every other port in the VLAN; known destinations are <b>forwarded</b> out exactly one port. That's the whole magic.</p>
<p>ARP comes first: PC1 broadcasts "who has 192.168.1.12?", PC2 replies unicast, and both frames teach the switch where each host lives.</p>
<p>On the exam, be ready to read a <code>show mac address-table</code> and answer "what does the switch do with a frame to X?" — flood, forward, or filter.</p>`,
  checks: [
    { desc: 'PC1 can ping PC2', fn: H => H.ping('PC1', '192.168.1.12') },
    { desc: 'PC2 can ping PC1', fn: H => H.ping('PC2', '192.168.1.11') },
    { desc: 'SW1 has learned MACs on Fa0/1 and Fa0/2', fn: H => ['FastEthernet0/1', 'FastEthernet0/2'].every(p => H.d('SW1').macTable.some(e => e.port === p)) },
  ],
});

/* ============================================================= */
L({
  id: 'd08-router-ints', vol: 1, day: 'Day 8', title: 'Router Interfaces & IPv4 Addressing',
  topics: 'ip address · no shutdown · description · show ip interface brief',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.2.10', mask: '255.255.255.0', gw: '10.0.2.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['PC2', 'e0', 'R1', 'g0/1']],
  layout: { PC1: [50, 20], R1: [190, 55], PC2: [330, 20] },
  intro: `Router ports ship administratively down. Bring both LAN interfaces up with correct addressing so the two PCs can reach each other through R1. This exact sequence — <code>int</code>, <code>ip address</code>, <code>no shut</code> — is the most-typed pattern in all of CCNA.`,
  tasks: [
    'Set hostname R1',
    'G0/0: 10.0.1.1/24, description LAN1, enabled',
    'G0/1: 10.0.2.1/24, description LAN2, enabled',
    'PC1 can ping PC2 across the router',
  ],
  steps: [
    { t: 'Set the hostname.', c: ['enable', 'configure terminal', 'hostname R1'] },
    { t: 'Configure and enable G0/0.', c: ['interface g0/0', 'ip address 10.0.1.1 255.255.255.0', 'description LAN1', 'no shutdown'], note: 'Watch for the <code>%LINK-5-CHANGED</code> log — that\'s your confirmation the port came up.' },
    { t: 'Configure and enable G0/1.', c: ['interface g0/1', 'ip address 10.0.2.1 255.255.255.0', 'description LAN2', 'no shutdown'] },
    { t: 'Verify: one line per interface, both up/up.', c: ['do show ip interface brief'] },
    { t: 'Test end-to-end from PC1.', c: ['ping 10.0.2.10'], note: 'Run this from the PC1 tab. Both networks are directly connected to R1, so no routes are needed.' },
  ],
  verify: ['show ip interface brief', 'show interfaces g0/0', 'show running-config'],
  explain: `<h3>up/up or bust</h3>
<p><code>show ip interface brief</code> has two state columns: <b>Status</b> (layer 1) and <b>Protocol</b> (layer 2). "administratively down" means you forgot <code>no shutdown</code>. Routers default to shutdown; switches default to up — a classic exam distinction.</p>
<p>Each router interface is the <b>default gateway</b> for its LAN. PC1 (10.0.1.10/24) sees that 10.0.2.10 is off-subnet and sends the packet to its gateway 10.0.1.1. R1 owns both subnets as <b>connected routes</b>, so no static routing is needed — that's the next lab.</p>`,
  checks: [
    { desc: 'Hostname is R1', fn: H => H.hostname('R1', 'R1') },
    { desc: 'G0/0 is 10.0.1.1/24 and enabled', fn: H => H.hasIp('R1', 'g0/0', '10.0.1.1', '255.255.255.0') && H.noshut('R1', 'g0/0') },
    { desc: 'G0/1 is 10.0.2.1/24 and enabled', fn: H => H.hasIp('R1', 'g0/1', '10.0.2.1', '255.255.255.0') && H.noshut('R1', 'g0/1') },
    { desc: 'Both interfaces carry a description', fn: H => H.i('R1', 'g0/0').desc && H.i('R1', 'g0/1').desc },
    { desc: 'PC1 can ping PC2 (10.0.2.10)', fn: H => H.ping('PC1', '10.0.2.10') },
  ],
});

/* ============================================================= */
L({
  id: 'd09-switch-ints', vol: 1, day: 'Day 9', title: 'Switch Interface Configuration',
  topics: 'interface range · speed · duplex · shutting down unused ports',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'f0/5', 'f0/6', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.12', mask: '255.255.255.0', gw: null } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2']],
  layout: { PC1: [60, 20], PC2: [60, 90], SW1: [220, 55] },
  intro: `Harden a switch's physical ports: manually set speed/duplex on host ports, label them, and shut down everything unused — a security best practice you'll be asked about on the exam.`,
  tasks: [
    'F0/1 and F0/2: speed 100, duplex full, description HOST-PORT (use interface range)',
    'Shut down unused ports F0/3-6 and G0/1 in one range command',
    'Verify with show interfaces status',
  ],
  steps: [
    { t: 'Configure both host ports at once with a range.', c: ['enable', 'configure terminal', 'interface range f0/1 - 2', 'speed 100', 'duplex full', 'description HOST-PORT'], note: 'Everything you type now applies to every interface in the range — massive time saver.' },
    { t: 'Shut down all unused ports.', c: ['interface range f0/3 - 6, g0/1', 'shutdown'] },
    { t: 'Verify port states, speed and duplex.', c: ['do show interfaces status'], note: 'Manually-set values show as <code>full</code>/<code>100</code>; auto-negotiated ones show an <code>a-</code> prefix like <code>a-full</code>.' },
  ],
  verify: ['show interfaces status', 'show running-config'],
  explain: `<h3>Autonegotiation and why we override it</h3>
<p>Speed and duplex autonegotiate by default, and that's usually right. But when one side is hard-coded and the other autonegotiates, the auto side can't see duplex info and falls back to <b>half duplex</b> → duplex mismatch → late collisions and terrible performance. Set both sides the same, or leave both on auto.</p>
<p>Shutting down unused ports stops anyone from plugging into a live jack. Combined with port security (Day 47's lab), it's the baseline of switch hardening.</p>`,
  checks: [
    { desc: 'F0/1 & F0/2: speed 100, duplex full', fn: H => ['f0/1', 'f0/2'].every(p => H.i('SW1', p).speed === '100' && H.i('SW1', p).duplex === 'full') },
    { desc: 'F0/1 & F0/2 have descriptions', fn: H => ['f0/1', 'f0/2'].every(p => H.i('SW1', p).desc) },
    { desc: 'F0/3-6 are shut down', fn: H => ['f0/3', 'f0/4', 'f0/5', 'f0/6'].every(p => H.i('SW1', p).shutdown) },
    { desc: 'G0/1 is shut down', fn: H => H.i('SW1', 'g0/1').shutdown },
  ],
});

/* ============================================================= */
L({
  id: 'd11-static-routing', vol: 1, day: 'Day 11', title: 'Static & Default Routes',
  topics: 'ip route · default route · show ip route',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.2.10', mask: '255.255.255.0', gw: '10.0.2.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/1'], ['R2', 'g0/0', 'PC2', 'e0']],
  layout: { PC1: [40, 30], R1: [150, 30], R2: [250, 30], PC2: [355, 30] },
  intro: `Two routers, two LANs, one transit link (192.168.12.0/30). Routers only know their connected networks — teach each one how to reach the far LAN. R1 gets a specific static route; R2 answers with a default route.`,
  tasks: [
    'R1: hostname, G0/0 = 10.0.1.1/24, G0/1 = 192.168.12.1/30, both up',
    'R2: hostname, G0/0 = 10.0.2.1/24, G0/1 = 192.168.12.2/30, both up',
    'R1: static route to 10.0.2.0/24 via 192.168.12.2',
    'R2: default route (0.0.0.0/0) via 192.168.12.1',
    'PC1 and PC2 can ping each other',
  ],
  steps: [
    { t: 'Configure R1 completely.', c: ['enable', 'configure terminal', 'hostname R1', 'interface g0/0', 'ip address 10.0.1.1 255.255.255.0', 'no shutdown', 'interface g0/1', 'ip address 192.168.12.1 255.255.255.252', 'no shutdown'] },
    { t: 'Configure R2 completely (switch device tabs).', c: ['enable', 'configure terminal', 'hostname R2', 'interface g0/0', 'ip address 10.0.2.1 255.255.255.0', 'no shutdown', 'interface g0/1', 'ip address 192.168.12.2 255.255.255.252', 'no shutdown'] },
    { t: 'On R1, add a static route to R2\'s LAN.', c: ['ip route 10.0.2.0 255.255.255.0 192.168.12.2'], note: 'Read it aloud: "to reach 10.0.2.0/24, send to next hop 192.168.12.2".' },
    { t: 'On R2, add a default route back.', c: ['ip route 0.0.0.0 0.0.0.0 192.168.12.1'], note: 'A default route matches <em>everything</em> not otherwise known — the classic "route of last resort".' },
    { t: 'Verify routing tables and test end to end.', c: ['do show ip route'], note: 'Then ping 10.0.2.10 from the PC1 tab.' },
  ],
  verify: ['show ip route', 'show ip interface brief'],
  explain: `<h3>Routes and return paths</h3>
<p>A ping needs a route <b>there and back</b>. If you only configure R1's static route, packets reach PC2 but the replies die at R2 — this is the #1 static-routing gotcha. Always think in both directions.</p>
<p><code>S</code> entries in <code>show ip route</code> are statics (AD 1); <code>S*</code> marks a candidate default. The /30 on the transit link leaves exactly two usable addresses — standard practice for point-to-point links.</p>`,
  checks: [
    { desc: 'R1 interfaces addressed and up', fn: H => H.hasIp('R1', 'g0/0', '10.0.1.1') && H.hasIp('R1', 'g0/1', '192.168.12.1') && H.noshut('R1', 'g0/0') && H.noshut('R1', 'g0/1') },
    { desc: 'R2 interfaces addressed and up', fn: H => H.hasIp('R2', 'g0/0', '10.0.2.1') && H.hasIp('R2', 'g0/1', '192.168.12.2') && H.noshut('R2', 'g0/0') && H.noshut('R2', 'g0/1') },
    { desc: 'R1 has a static route to 10.0.2.0/24', fn: H => H.d('R1').staticRoutes.some(r => r.net === '10.0.2.0' && r.mask === '255.255.255.0') },
    { desc: 'R2 has a default route', fn: H => H.d('R2').staticRoutes.some(r => r.net === '0.0.0.0' && r.mask === '0.0.0.0') },
    { desc: 'PC1 ↔ PC2 connectivity', fn: H => H.ping('PC1', '10.0.2.10') && H.ping('PC2', '10.0.1.10') },
  ],
});

/* ============================================================= */
L({
  id: 'd16-vlans1', vol: 1, day: 'Day 16', title: 'VLANs Part 1 — Access Ports',
  topics: 'vlan · name · switchport mode access · switchport access vlan',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.12', mask: '255.255.255.0', gw: null } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.13', mask: '255.255.255.0', gw: null } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2'], ['PC3', 'e0', 'SW1', 'f0/3']],
  layout: { PC1: [50, 15], PC2: [50, 95], PC3: [340, 15], SW1: [200, 55] },
  intro: `All three PCs share one switch and one subnet — so today they can all talk. Segment them: PC1 and PC2 into VLAN 10 (ENGINEERING), PC3 into VLAN 20 (SALES). Afterwards PC1↔PC2 still works but PC3 is isolated, even though the IPs never changed.`,
  tasks: [
    'Create VLAN 10 named ENGINEERING and VLAN 20 named SALES',
    'F0/1 & F0/2: access ports in VLAN 10',
    'F0/3: access port in VLAN 20',
    'Verify PC1 can ping PC2, but neither can reach PC3',
  ],
  steps: [
    { t: 'First, prove everything can ping everything (the "before" picture). From PC1:', c: ['ping 10.0.0.13'] },
    { t: 'Create both VLANs with names.', c: ['enable', 'configure terminal', 'vlan 10', 'name ENGINEERING', 'vlan 20', 'name SALES', 'exit'] },
    { t: 'Assign the engineering ports.', c: ['interface range f0/1 - 2', 'switchport mode access', 'switchport access vlan 10'] },
    { t: 'Assign the sales port.', c: ['interface f0/3', 'switchport mode access', 'switchport access vlan 20'] },
    { t: 'Verify VLAN membership.', c: ['do show vlan brief'] },
    { t: 'Re-test: PC1→PC2 should succeed, PC1→PC3 should now fail.', c: ['ping 10.0.0.12', 'ping 10.0.0.13'], note: 'Run from the PC1 tab. Same subnet, same switch — but VLANs are separate broadcast domains.' },
  ],
  verify: ['show vlan brief', 'show interfaces status', 'show running-config'],
  explain: `<h3>VLAN = broadcast domain</h3>
<p>A VLAN chops one physical switch into multiple logical switches. Frames never cross VLANs inside a switch — crossing requires a router or L3 switch (Day 18's lab). <code>switchport mode access</code> makes the port carry exactly one VLAN, and <code>switchport access vlan 10</code> says which.</p>
<p>Note that assigning a port to a VLAN that doesn't exist auto-creates it — handy, but naming VLANs deliberately keeps <code>show vlan brief</code> readable. VLAN 1 is the default for every port; leaving hosts there is a security smell.</p>`,
  checks: [
    { desc: 'VLAN 10 named ENGINEERING exists', fn: H => H.vlanExists('SW1', 10, 'ENGINEERING') },
    { desc: 'VLAN 20 named SALES exists', fn: H => H.vlanExists('SW1', 20, 'SALES') },
    { desc: 'F0/1 & F0/2 are access ports in VLAN 10', fn: H => H.access('SW1', 'f0/1', 10) && H.access('SW1', 'f0/2', 10) },
    { desc: 'F0/3 is an access port in VLAN 20', fn: H => H.access('SW1', 'f0/3', 20) },
    { desc: 'PC1 can still ping PC2', fn: H => H.ping('PC1', '10.0.0.12') },
    { desc: 'PC1 can no longer reach PC3', fn: H => !H.ping('PC1', '10.0.0.13') },
  ],
});

/* ============================================================= */
L({
  id: 'd17-vlans2', vol: 1, day: 'Day 17', title: 'VLANs Part 2 — Trunking',
  topics: 'switchport mode trunk · native vlan · allowed vlan · show interfaces trunk',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.20.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.12', mask: '255.255.255.0', gw: null } },
    { id: 'PC4', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.20.12', mask: '255.255.255.0', gw: null } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2'], ['SW1', 'g0/1', 'SW2', 'g0/1'], ['SW2', 'f0/1', 'PC3', 'e0'], ['SW2', 'f0/2', 'PC4', 'e0']],
  layout: { PC1: [35, 15], PC2: [35, 95], SW1: [140, 55], SW2: [260, 55], PC3: [360, 15], PC4: [360, 95] },
  intro: `VLAN 10 and VLAN 20 both live on both switches. One cable joins the switches — it must carry <em>both</em> VLANs, tagged. Build the 802.1Q trunk, move the native VLAN off VLAN 1, and prune the allowed list.`,
  tasks: [
    'Both switches: create VLANs 10 and 20; put F0/1 in 10 and F0/2 in 20 (access)',
    'G0/1 on both: static 802.1Q trunk',
    'Native VLAN 1001 on both trunk ends',
    'Allow only VLANs 10 and 20 on the trunk',
    'PC1↔PC3 (VLAN 10) and PC2↔PC4 (VLAN 20) can ping; no cross-VLAN pings',
  ],
  steps: [
    { t: 'On SW1: VLANs and access ports.', c: ['enable', 'configure terminal', 'vlan 10', 'vlan 20', 'exit', 'interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'interface f0/2', 'switchport mode access', 'switchport access vlan 20'] },
    { t: 'On SW1: make G0/1 a trunk with a safe native VLAN and pruned allowed list.', c: ['interface g0/1', 'switchport mode trunk', 'switchport trunk native vlan 1001', 'switchport trunk allowed vlan 10,20'] },
    { t: 'Repeat everything on SW2 (same commands, same ports).', c: ['enable', 'configure terminal', 'vlan 10', 'vlan 20', 'exit', 'interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'interface f0/2', 'switchport mode access', 'switchport access vlan 20', 'interface g0/1', 'switchport mode trunk', 'switchport trunk native vlan 1001', 'switchport trunk allowed vlan 10,20'] },
    { t: 'Verify the trunk from either side.', c: ['do show interfaces trunk'], note: 'Check: mode on, encapsulation 802.1q, native vlan 1001, allowed 10,20.' },
    { t: 'Test: PC1→PC3 and PC2→PC4 succeed; PC1→PC4 fails.', c: ['ping 10.0.10.12'] },
  ],
  verify: ['show interfaces trunk', 'show vlan brief'],
  explain: `<h3>802.1Q in one paragraph</h3>
<p>A trunk carries many VLANs on one link by inserting a 4-byte tag with the VLAN ID into each frame. The <b>native VLAN</b> travels untagged — a mismatch between the two ends leaks traffic between VLANs, which is why best practice moves it to an unused VLAN (we used 1001) and keeps it identical on both sides.</p>
<p><b>Allowed lists</b> prune VLANs off trunks that don't need them, limiting broadcast scope and attack surface. Remember the difference between <code>allowed vlan 10,20</code> (replace list) and <code>allowed vlan add 30</code> (append) — replacing when you meant to add is a legendary way to take down a network.</p>`,
  checks: [
    { desc: 'VLANs 10 & 20 exist on both switches', fn: H => [10, 20].every(v => H.vlanExists('SW1', v) && H.vlanExists('SW2', v)) },
    { desc: 'Access ports assigned on both switches', fn: H => H.access('SW1', 'f0/1', 10) && H.access('SW1', 'f0/2', 20) && H.access('SW2', 'f0/1', 10) && H.access('SW2', 'f0/2', 20) },
    { desc: 'G0/1 is a static trunk on both switches', fn: H => H.trunkStatic('SW1', 'g0/1') && H.trunkStatic('SW2', 'g0/1') },
    { desc: 'Native VLAN 1001 on both trunk ends', fn: H => H.i('SW1', 'g0/1').nativeVlan === 1001 && H.i('SW2', 'g0/1').nativeVlan === 1001 },
    { desc: 'Trunk allows only VLANs 10 and 20', fn: H => ['SW1', 'SW2'].every(s => { const a = H.i(s, 'g0/1').allowed; return a && a.length === 2 && a.includes(10) && a.includes(20); }) },
    { desc: 'PC1↔PC3 and PC2↔PC4 work', fn: H => H.ping('PC1', '10.0.10.12') && H.ping('PC2', '10.0.20.12') },
  ],
});

/* ============================================================= */
L({
  id: 'd18-vlans3', vol: 1, day: 'Day 18', title: 'VLANs Part 3 — Router on a Stick',
  topics: 'subinterfaces · encapsulation dot1q · inter-VLAN routing',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.10', mask: '255.255.255.0', gw: '10.0.10.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.20.10', mask: '255.255.255.0', gw: '10.0.20.1' } },
  ],
  links: [['R1', 'g0/0', 'SW1', 'g0/1'], ['SW1', 'f0/1', 'PC1', 'e0'], ['SW1', 'f0/2', 'PC2', 'e0']],
  layout: { R1: [200, 12], SW1: [200, 68], PC1: [80, 105], PC2: [320, 105] },
  intro: `PC1 (VLAN 10) and PC2 (VLAN 20) need to talk. One router arm, one switch, two VLANs: split R1's G0/0 into dot1q subinterfaces — the classic <b>router on a stick</b> (ROAS).`,
  tasks: [
    'SW1: VLANs 10 & 20, access ports F0/1→10 and F0/2→20, trunk on G0/1',
    'R1: subinterface G0/0.10 = 10.0.10.1/24 tagged VLAN 10',
    'R1: subinterface G0/0.20 = 10.0.20.1/24 tagged VLAN 20',
    'PC1 can ping PC2 across VLANs',
  ],
  steps: [
    { t: 'Configure the switch side.', c: ['enable', 'configure terminal', 'vlan 10', 'vlan 20', 'exit', 'interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'interface f0/2', 'switchport mode access', 'switchport access vlan 20', 'interface g0/1', 'switchport mode trunk'] },
    { t: 'On R1, bring up the physical interface (no IP on it!).', c: ['enable', 'configure terminal', 'interface g0/0', 'no shutdown'] },
    { t: 'Create the VLAN 10 subinterface.', c: ['interface g0/0.10', 'encapsulation dot1q 10', 'ip address 10.0.10.1 255.255.255.0'], note: '<code>encapsulation dot1q 10</code> must come first — it binds the subinterface to VLAN tag 10.' },
    { t: 'Create the VLAN 20 subinterface.', c: ['interface g0/0.20', 'encapsulation dot1q 20', 'ip address 10.0.20.1 255.255.255.0'] },
    { t: 'Verify and test.', c: ['do show ip interface brief'], note: 'Then ping 10.0.20.10 from PC1 — the frame goes PC1 → SW1 → R1 (tagged 10) → back to SW1 (tagged 20) → PC2.' },
  ],
  verify: ['show ip interface brief', 'show ip route'],
  explain: `<h3>Why "on a stick"?</h3>
<p>Routing between VLANs needs a layer-3 hop. With only one physical router arm, we trunk it and let subinterfaces terminate each VLAN: <code>G0/0.10</code> answers tag 10, <code>G0/0.20</code> answers tag 20. The subinterface numbers are arbitrary but matching them to the VLAN ID keeps you sane.</p>
<p>Each subinterface's IP becomes that VLAN's default gateway. The same packet enters and leaves the router on the same physical wire — fine for labs and small sites; bigger networks use SVIs on a layer-3 switch instead.</p>`,
  checks: [
    { desc: 'SW1 access ports and trunk configured', fn: H => H.access('SW1', 'f0/1', 10) && H.access('SW1', 'f0/2', 20) && H.trunkStatic('SW1', 'g0/1') },
    { desc: 'R1 G0/0 is up', fn: H => H.noshut('R1', 'g0/0') },
    { desc: 'G0/0.10: dot1q 10, 10.0.10.1/24', fn: H => { const s = H.i('R1', 'g0/0.10'); return !!(s && s.encapDot1q && s.encapDot1q.vlan === 10 && s.ip && s.ip.addr === '10.0.10.1'); } },
    { desc: 'G0/0.20: dot1q 20, 10.0.20.1/24', fn: H => { const s = H.i('R1', 'g0/0.20'); return !!(s && s.encapDot1q && s.encapDot1q.vlan === 20 && s.ip && s.ip.addr === '10.0.20.1'); } },
    { desc: 'PC1 can ping PC2 (10.0.20.10)', fn: H => H.ping('PC1', '10.0.20.10') },
  ],
});

/* ============================================================= */
L({
  id: 'd19-dtp-vtp', vol: 1, day: 'Day 19', title: 'DTP & VTP',
  topics: 'dynamic desirable/auto · switchport nonegotiate · vtp mode transparent',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['g0/1', 'g0/2'] },
    { id: 'SW2', type: 'switch', ifaces: ['g0/1', 'g0/2'] },
  ],
  links: [['SW1', 'g0/1', 'SW2', 'g0/1']],
  layout: { SW1: [110, 45], SW2: [290, 45] },
  intro: `Two protocols you mostly configure in order to <em>disable</em> them. Watch DTP negotiate a trunk, then lock the port down; then take both switches out of the VTP game with transparent mode.`,
  tasks: [
    'Observe: set SW1 G0/1 to dynamic desirable and confirm the link trunks',
    'Lock it down: static trunk + nonegotiate on both sides',
    'Set VTP mode transparent on both switches',
    'Set VTP domain NETDRILL on both',
  ],
  steps: [
    { t: 'On SW1, make G0/1 actively negotiate. SW2 defaults to dynamic auto, so the link becomes a trunk.', c: ['enable', 'configure terminal', 'interface g0/1', 'switchport mode dynamic desirable', 'do show interfaces trunk'], note: 'desirable + auto = trunk. auto + auto = access (nobody initiates).' },
    { t: 'Now do it properly: static trunk, DTP off. On SW1:', c: ['switchport mode trunk', 'switchport nonegotiate'] },
    { t: 'Same on SW2.', c: ['enable', 'configure terminal', 'interface g0/1', 'switchport mode trunk', 'switchport nonegotiate'] },
    { t: 'Neutralize VTP on both switches.', c: ['exit', 'vtp mode transparent', 'vtp domain NETDRILL'], note: 'Run on both. Transparent switches forward VTP ads but never sync their VLAN database.' },
    { t: 'Verify.', c: ['do show vtp status', 'do show interfaces trunk'] },
  ],
  verify: ['show interfaces trunk', 'show vtp status', 'show interfaces switchport'],
  explain: `<h3>Why disable them?</h3>
<p><b>DTP</b> lets a port negotiate trunking automatically. Convenient — and a security hole: an attacker's device that speaks DTP can negotiate a trunk and see every VLAN. Production standard: hard-code <code>mode access</code> or <code>mode trunk</code> and add <code>switchport nonegotiate</code>.</p>
<p><b>VTP</b> syncs the VLAN database between switches sharing a domain. A stray switch with a higher revision number can wipe every VLAN in the domain (the infamous "VTP bomb"). Most shops run transparent (or VTP off) and manage VLANs by hand — as you just did.</p>
<p>Exam table to memorize: desirable+desirable=trunk, desirable+auto=trunk, auto+auto=access, trunk+auto=trunk, access+anything=access.</p>`,
  checks: [
    { desc: 'SW1 G0/1: static trunk with nonegotiate', fn: H => H.trunkStatic('SW1', 'g0/1') && H.i('SW1', 'g0/1').nonegotiate },
    { desc: 'SW2 G0/1: static trunk with nonegotiate', fn: H => H.trunkStatic('SW2', 'g0/1') && H.i('SW2', 'g0/1').nonegotiate },
    { desc: 'Both switches in VTP transparent mode', fn: H => H.d('SW1').vtp.mode === 'transparent' && H.d('SW2').vtp.mode === 'transparent' },
    { desc: 'VTP domain NETDRILL on both', fn: H => H.d('SW1').vtp.domain === 'NETDRILL' && H.d('SW2').vtp.domain === 'NETDRILL' },
  ],
});

/* ============================================================= */
L({
  id: 'd21-stp', vol: 1, day: 'Days 20-21', title: 'Spanning Tree Protocol',
  topics: 'rapid-pvst · root bridge priority · portfast · bpduguard',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['g0/1', 'g0/2', 'f0/1'] },
    { id: 'SW2', type: 'switch', ifaces: ['g0/1', 'g0/2'] },
    { id: 'SW3', type: 'switch', ifaces: ['g0/1', 'g0/2'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.11', mask: '255.255.255.0', gw: null } },
  ],
  links: [['SW1', 'g0/1', 'SW2', 'g0/1'], ['SW1', 'g0/2', 'SW3', 'g0/1'], ['SW2', 'g0/2', 'SW3', 'g0/2'], ['SW1', 'f0/1', 'PC1', 'e0']],
  layout: { SW1: [200, 12], SW2: [90, 80], SW3: [310, 80], PC1: [200, 110] },
  intro: `Three switches in a triangle — a loop STP must break. Don't leave root election to chance: make SW1 the root deliberately, upgrade everyone to Rapid PVST+, and protect the edge port with PortFast + BPDU Guard.`,
  tasks: [
    'All three switches: spanning-tree mode rapid-pvst',
    'SW1: root primary for VLAN 1 (or priority 24576)',
    'SW2: root secondary for VLAN 1 (priority 28672)',
    'SW1 F0/1: portfast + bpduguard enable',
  ],
  steps: [
    { t: 'Upgrade SW1 to Rapid PVST+ and claim root.', c: ['enable', 'configure terminal', 'spanning-tree mode rapid-pvst', 'spanning-tree vlan 1 root primary'], note: '<code>root primary</code> is a macro that sets priority 24576 (or lower if needed). You could also type <code>spanning-tree vlan 1 priority 24576</code> directly.' },
    { t: 'SW2: rapid mode + secondary root.', c: ['enable', 'configure terminal', 'spanning-tree mode rapid-pvst', 'spanning-tree vlan 1 root secondary'] },
    { t: 'SW3: rapid mode only.', c: ['enable', 'configure terminal', 'spanning-tree mode rapid-pvst'] },
    { t: 'On SW1, protect the host port.', c: ['interface f0/1', 'spanning-tree portfast', 'spanning-tree bpduguard enable'], note: 'Read the warning IOS prints — portfast on a switch-facing port can cause loops.' },
    { t: 'Verify the tree from SW1 — it should say "This bridge is the root".', c: ['do show spanning-tree'] },
  ],
  verify: ['show spanning-tree'],
  explain: `<h3>Why rig the election?</h3>
<p>Default priority is 32768 everywhere, so the <b>lowest MAC address wins</b> — often the oldest, slowest switch in the closet. Forcing your core switch to root (24576) and a second to backup (28672) makes traffic flow the way you designed. Priorities move in steps of 4096 because the VLAN ID occupies the low 12 bits of the bridge ID.</p>
<p><b>PortFast</b> skips listening/learning on edge ports so hosts get link instantly (and DHCP doesn't time out). <b>BPDU Guard</b> is its bodyguard: if a switch ever appears on that port, the port err-disables instead of joining the tree. Always deploy them together on access ports.</p>
<p>Rapid PVST+ converges in ~1-2 seconds versus 30-50 for classic PVST+ — there is no reason to run classic on modern gear.</p>`,
  checks: [
    { desc: 'All switches run rapid-pvst', fn: H => ['SW1', 'SW2', 'SW3'].every(s => H.d(s).stp.mode === 'rapid') },
    { desc: 'SW1 priority 24576 for VLAN 1', fn: H => H.d('SW1').stp.prio[1] === 24576 },
    { desc: 'SW2 priority 28672 for VLAN 1', fn: H => H.d('SW2').stp.prio[1] === 28672 },
    { desc: 'SW1 F0/1: portfast enabled', fn: H => H.i('SW1', 'f0/1').stpPortfast },
    { desc: 'SW1 F0/1: bpduguard enabled', fn: H => H.i('SW1', 'f0/1').bpduguard },
  ],
});

/* ============================================================= */
L({
  id: 'd22-etherchannel', vol: 1, day: 'Day 22', title: 'EtherChannel',
  topics: 'channel-group · LACP active/passive · trunking the port-channel',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['g0/1', 'g0/2', 'f0/1'] },
    { id: 'SW2', type: 'switch', ifaces: ['g0/1', 'g0/2', 'f0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.12', mask: '255.255.255.0', gw: null } },
  ],
  links: [['SW1', 'g0/1', 'SW2', 'g0/1'], ['SW1', 'g0/2', 'SW2', 'g0/2'], ['SW1', 'f0/1', 'PC1', 'e0'], ['SW2', 'f0/1', 'PC2', 'e0']],
  layout: { PC1: [40, 45], SW1: [140, 45], SW2: [260, 45], PC2: [360, 45] },
  intro: `Two parallel links between SW1 and SW2 — STP would block one. Bundle them into a single logical link with LACP so both carry traffic, then trunk the bundle.`,
  tasks: [
    'SW1 G0/1-2: channel-group 1 mode active (LACP)',
    'SW2 G0/1-2: channel-group 1 mode passive',
    'Port-channel 1 configured as a static trunk on both switches',
    'PC1 can ping PC2 across the bundle',
  ],
  steps: [
    { t: 'Bundle SW1\'s links with LACP in active mode.', c: ['enable', 'configure terminal', 'interface range g0/1 - 2', 'channel-group 1 mode active'], note: 'IOS auto-creates interface Port-channel1 — watch the log line.' },
    { t: 'Bundle SW2\'s links in passive mode.', c: ['enable', 'configure terminal', 'interface range g0/1 - 2', 'channel-group 1 mode passive'], note: 'active+passive = LACP bundle forms. passive+passive would never come up.' },
    { t: 'Trunk the logical interface on SW1.', c: ['interface port-channel 1', 'switchport mode trunk'] },
    { t: 'Trunk it on SW2 too.', c: ['interface port-channel 1', 'switchport mode trunk'] },
    { t: 'Verify — look for flags SU / P-P.', c: ['do show etherchannel summary'] },
  ],
  verify: ['show etherchannel summary', 'show interfaces trunk'],
  explain: `<h3>Modes worth memorizing</h3>
<p><b>LACP</b> (open standard): <code>active</code> initiates, <code>passive</code> responds — at least one side must be active. <b>PAgP</b> (Cisco legacy): <code>desirable</code>/<code>auto</code>, same logic. <code>on</code> forces the bundle with no protocol — both sides must be <code>on</code>, and mismatches cause loops. Exam favorite: passive+passive and auto+auto never form.</p>
<p>All bundled ports must match: same speed, duplex, VLAN/trunk settings. Configure the port-channel interface and the settings push down to members. STP sees one logical link, so nothing gets blocked and you actually use all the bandwidth.</p>`,
  checks: [
    { desc: 'SW1 G0/1-2 in channel-group 1 mode active', fn: H => ['g0/1', 'g0/2'].every(p => { const cg = H.i('SW1', p).channelGroup; return cg && cg.id === 1 && cg.mode === 'active'; }) },
    { desc: 'SW2 G0/1-2 in channel-group 1 mode passive', fn: H => ['g0/1', 'g0/2'].every(p => { const cg = H.i('SW2', p).channelGroup; return cg && cg.id === 1 && cg.mode === 'passive'; }) },
    { desc: 'Port-channel1 is a trunk on both switches', fn: H => H.trunkStatic('SW1', 'po1') && H.trunkStatic('SW2', 'po1') },
    { desc: 'PC1 can ping PC2 across the bundle', fn: H => H.ping('PC1', '10.0.0.12') },
  ],
});

/* ============================================================= */
L({
  id: 'd27-ospf', vol: 1, day: 'Days 25-27', title: 'OSPF Single Area',
  topics: 'router ospf · network statements · router-id · passive-interface · default-information originate',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R3', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.3.10', mask: '255.255.255.0', gw: '10.0.3.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0'], ['R2', 'g0/1', 'R3', 'g0/0'], ['R3', 'g0/1', 'PC3', 'e0']],
  layout: { PC1: [30, 30], R1: [120, 30], R2: [215, 30], R3: [305, 30], PC3: [375, 30] },
  intro: `Three routers in a row, a LAN on each end. Interfaces are pre-addressed (check <code>show ip int brief</code>) — your job is pure OSPF: enable it everywhere, set router IDs, quiet the LAN interfaces, and let the protocol build the routing tables.`,
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.1.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.12.1', '255.255.255.252');
    set('R2', 'g0/0', '10.0.12.2', '255.255.255.252'); set('R2', 'g0/1', '10.0.23.2', '255.255.255.252');
    set('R3', 'g0/0', '10.0.23.3', '255.255.255.252'); set('R3', 'g0/1', '10.0.3.1', '255.255.255.0');
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.R3.hostname = 'R3';
  },
  tasks: [
    'R1: router ospf 1, router-id 1.1.1.1, advertise 10.0.1.0/24 and 10.0.12.0/30 into area 0, passive G0/0',
    'R2: router ospf 1, router-id 2.2.2.2, advertise both /30 links into area 0',
    'R3: router ospf 1, router-id 3.3.3.3, advertise 10.0.23.0/30 and 10.0.3.0/24, passive G0/1',
    'Full adjacencies R1-R2 and R2-R3; PC1 can ping PC3',
  ],
  steps: [
    { t: 'Enable OSPF on R1.', c: ['enable', 'configure terminal', 'router ospf 1', 'router-id 1.1.1.1', 'network 10.0.1.0 0.0.0.255 area 0', 'network 10.0.12.0 0.0.0.3 area 0', 'passive-interface g0/0'], note: 'Network statements use <b>wildcard masks</b> (inverted subnet masks): /24 → 0.0.0.255, /30 → 0.0.0.3. They select which <em>interfaces</em> join OSPF.' },
    { t: 'Enable OSPF on R2.', c: ['enable', 'configure terminal', 'router ospf 1', 'router-id 2.2.2.2', 'network 10.0.12.0 0.0.0.3 area 0', 'network 10.0.23.0 0.0.0.3 area 0'] },
    { t: 'Enable OSPF on R3.', c: ['enable', 'configure terminal', 'router ospf 1', 'router-id 3.3.3.3', 'network 10.0.23.0 0.0.0.3 area 0', 'network 10.0.3.0 0.0.0.255 area 0', 'passive-interface g0/1'] },
    { t: 'Watch the adjacencies form.', c: ['do show ip ospf neighbor'], note: 'You want state FULL with both neighbors from R2\'s perspective.' },
    { t: 'Check learned routes (code O) and test end to end.', c: ['do show ip route'], note: 'Then ping 10.0.3.10 from PC1.' },
  ],
  verify: ['show ip ospf neighbor', 'show ip route', 'show ip protocols', 'show ip ospf interface brief'],
  explain: `<h3>What you just automated</h3>
<p>In the static-routing lab you typed every route by hand. Here OSPF floods link-state advertisements, every router builds an identical map, and Dijkstra's SPF algorithm computes the shortest (lowest-cost) path to every subnet. Add a fourth router later and nobody types a route.</p>
<p><b>Router ID</b>: highest loopback IP, unless you set it explicitly — always set it explicitly (x.x.x.x makes neighbor tables readable). <b>Passive interface</b> keeps OSPF from sending hellos where no neighbor exists (LANs) while still advertising the subnet — both a security and an efficiency win.</p>
<p>Adjacency requirements the exam loves: same subnet, same area, matching hello/dead timers, matching authentication, unique router IDs. Cost = reference bandwidth ÷ interface bandwidth (default reference 100 Mbps — set <code>auto-cost reference-bandwidth 100000</code> in gigabit networks so links differentiate).</p>`,
  checks: [
    { desc: 'OSPF process running on all three routers', fn: H => ['R1', 'R2', 'R3'].every(r => H.d(r).ospf) },
    { desc: 'Router IDs 1.1.1.1 / 2.2.2.2 / 3.3.3.3', fn: H => H.d('R1').ospf?.routerId === '1.1.1.1' && H.d('R2').ospf?.routerId === '2.2.2.2' && H.d('R3').ospf?.routerId === '3.3.3.3' },
    { desc: 'R1-R2 adjacency is FULL', fn: H => H.ospfNbr('R1', 'R2') },
    { desc: 'R2-R3 adjacency is FULL', fn: H => H.ospfNbr('R2', 'R3') },
    { desc: 'R1 G0/0 and R3 G0/1 are passive', fn: H => H.d('R1').ospf?.passive.includes('GigabitEthernet0/0') && H.d('R3').ospf?.passive.includes('GigabitEthernet0/1') },
    { desc: 'PC1 can ping PC3 (10.0.3.10)', fn: H => H.ping('PC1', '10.0.3.10') },
  ],
});

/* ============================================================= */
L({
  id: 'd28-hsrp', vol: 1, day: 'Day 28', title: 'First Hop Redundancy — HSRP',
  topics: 'standby ip · priority · preempt · show standby brief',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.10', mask: '255.255.255.0', gw: '10.0.0.1' } },
  ],
  links: [['R1', 'g0/0', 'SW1', 'f0/1'], ['R2', 'g0/0', 'SW1', 'f0/2'], ['PC1', 'e0', 'SW1', 'f0/3']],
  layout: { R1: [110, 12], R2: [290, 12], SW1: [200, 68], PC1: [200, 112] },
  intro: `PC1's gateway is 10.0.0.1 — but no single router owns that address. Build an HSRP pair: R1 (10.0.0.2) and R2 (10.0.0.3) share virtual IP 10.0.0.1, with R1 as the deliberate active router.`,
  tasks: [
    'R1 G0/0: 10.0.0.2/24, standby 1 ip 10.0.0.1, priority 110, preempt',
    'R2 G0/0: 10.0.0.3/24, standby 1 ip 10.0.0.1 (default priority 100)',
    'PC1 can ping its gateway 10.0.0.1',
    'R1 shows as Active, R2 as Standby',
  ],
  steps: [
    { t: 'Configure R1 as the active-to-be.', c: ['enable', 'configure terminal', 'interface g0/0', 'ip address 10.0.0.2 255.255.255.0', 'no shutdown', 'standby 1 ip 10.0.0.1', 'standby 1 priority 110', 'standby 1 preempt'], note: 'Priority 110 beats the default 100. <code>preempt</code> lets R1 reclaim Active when it comes back from an outage.' },
    { t: 'Configure R2 as standby.', c: ['enable', 'configure terminal', 'interface g0/0', 'ip address 10.0.0.3 255.255.255.0', 'no shutdown', 'standby 1 ip 10.0.0.1'] },
    { t: 'Verify roles on both routers.', c: ['do show standby brief'] },
    { t: 'From PC1, ping the virtual gateway.', c: ['ping 10.0.0.1'] },
  ],
  verify: ['show standby brief', 'show ip interface brief'],
  explain: `<h3>The virtual gateway trick</h3>
<p>Hosts can only hold one gateway address, so redundancy has to happen behind a <b>virtual IP + virtual MAC</b> (0000.0c07.acXX where XX is the group). The Active router answers ARP for the VIP and forwards traffic; Standby listens to hellos (every 3s, dead after 10s) and takes over on failure. Hosts notice nothing.</p>
<p>Without <code>preempt</code>, a recovered R1 stays Standby even at priority 110 — HSRP does not preempt by default (exam trap!). Alternatives: VRRP (open standard, preempts by default) and GLBP (Cisco, load balances). CCNA focuses on HSRP.</p>`,
  checks: [
    { desc: 'R1: 10.0.0.2/24, standby 1 ip 10.0.0.1', fn: H => H.hasIp('R1', 'g0/0', '10.0.0.2') && H.i('R1', 'g0/0').standby[1]?.ip === '10.0.0.1' },
    { desc: 'R1: priority 110 with preempt', fn: H => H.i('R1', 'g0/0').standby[1]?.priority === 110 && H.i('R1', 'g0/0').standby[1]?.preempt },
    { desc: 'R2: 10.0.0.3/24, standby 1 ip 10.0.0.1', fn: H => H.hasIp('R2', 'g0/0', '10.0.0.3') && H.i('R2', 'g0/0').standby[1]?.ip === '10.0.0.1' },
    { desc: 'PC1 can ping the virtual IP 10.0.0.1', fn: H => H.ping('PC1', '10.0.0.1') },
  ],
});

/* ============================================================= */
L({
  id: 'd32-ipv6', vol: 1, day: 'Days 30-32', title: 'IPv6 Addressing & Static Routes',
  topics: 'ipv6 unicast-routing · ipv6 address · eui-64 · ipv6 route',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
  ],
  links: [['R1', 'g0/1', 'R2', 'g0/1']],
  layout: { R1: [120, 45], R2: [280, 45] },
  intro: `Dual-router IPv6 drill: enable v6 routing, address the shared link from 2001:db8:12::/64, give each router a LAN prefix (R1: 2001:db8:1::/64 on G0/0, R2: 2001:db8:2::/64 via EUI-64), then exchange static routes.`,
  tasks: [
    'Both routers: ipv6 unicast-routing',
    'R1 G0/1 = 2001:db8:12::1/64, R2 G0/1 = 2001:db8:12::2/64 (both up)',
    'R1 G0/0 = 2001:db8:1::1/64; R2 G0/0 = 2001:db8:2::/64 with eui-64',
    'R1: ipv6 route to 2001:db8:2::/64 via 2001:db8:12::2 — and the mirror route on R2',
  ],
  steps: [
    { t: 'On R1: enable IPv6 routing (off by default!) and address the link.', c: ['enable', 'configure terminal', 'ipv6 unicast-routing', 'interface g0/1', 'ipv6 address 2001:db8:12::1/64', 'no shutdown'] },
    { t: 'Address R1\'s LAN interface.', c: ['interface g0/0', 'ipv6 address 2001:db8:1::1/64', 'no shutdown'] },
    { t: 'On R2: routing, link address, and an EUI-64 LAN address.', c: ['enable', 'configure terminal', 'ipv6 unicast-routing', 'interface g0/1', 'ipv6 address 2001:db8:12::2/64', 'no shutdown', 'interface g0/0', 'ipv6 address 2001:db8:2::/64 eui-64', 'no shutdown'], note: 'EUI-64 builds the host half of the address from the interface MAC (flip bit 7, insert FFFE in the middle).' },
    { t: 'Static routes: R1 to R2\'s LAN, R2 to R1\'s LAN.', c: ['ipv6 route 2001:db8:2::/64 2001:db8:12::2'], note: 'On R2: <code>ipv6 route 2001:db8:1::/64 2001:db8:12::1</code>' },
    { t: 'Verify addressing (note the auto-generated FE80:: link-locals) and routes.', c: ['do show ipv6 interface brief', 'do show ipv6 route'] },
  ],
  verify: ['show ipv6 interface brief', 'show ipv6 route'],
  explain: `<h3>IPv6 essentials in play</h3>
<p><code>ipv6 unicast-routing</code> is required before a router routes v6 at all — a favorite exam gotcha. Every v6 interface auto-generates a <b>link-local</b> FE80::/10 address used for next-hops and routing protocol chatter; the global 2001:db8::/32 range is reserved for documentation (and labs like this).</p>
<p><b>EUI-64</b> expands a 48-bit MAC into a 64-bit interface ID: split the MAC, wedge FFFE in the middle, flip the 7th bit. You'll be asked to compute one on the exam — practice with the MAC in <code>show interfaces g0/0</code>.</p>
<p>IPv6 statics mirror v4: <code>ipv6 route prefix/len next-hop</code>. No broadcast, no NAT (usually), and ARP's job is done by NDP (Neighbor Solicitation/Advertisement over multicast).</p>`,
  checks: [
    { desc: 'ipv6 unicast-routing on both routers', fn: H => H.d('R1').ipv6Routing && H.d('R2').ipv6Routing },
    { desc: 'Link addresses 2001:DB8:12::1/64 and ::2/64 configured, ports up', fn: H => H.i('R1', 'g0/1').ipv6.some(a => a.addr === '2001:DB8:12::1' && a.len === 64) && H.i('R2', 'g0/1').ipv6.some(a => a.addr === '2001:DB8:12::2') && H.noshut('R1', 'g0/1') && H.noshut('R2', 'g0/1') },
    { desc: 'R1 G0/0 has 2001:DB8:1::1/64', fn: H => H.i('R1', 'g0/0').ipv6.some(a => a.addr === '2001:DB8:1::1') },
    { desc: 'R2 G0/0 uses EUI-64 from 2001:DB8:2::/64', fn: H => H.i('R2', 'g0/0').ipv6.some(a => a.eui64) },
    { desc: 'Static v6 routes on both routers', fn: H => H.d('R1').v6Routes.some(r => r.prefix === '2001:DB8:2::') && H.d('R2').v6Routes.some(r => r.prefix === '2001:DB8:1::') },
  ],
});

window.ND = ND;
})();
