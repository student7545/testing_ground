/* NetDrill labs — Volume 2 (JITL Days 33+: ACLs, services, security). */
'use strict';
(function () {
const ND = window.ND;
const L = lab => ND.LABS.push(lab);

/* ============================================================= */
L({
  id: 'd33-std-acl', vol: 2, day: 'Day 33', title: 'Standard ACLs',
  topics: 'access-list 1-99 · named standard ACLs · placement close to destination',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.2.10', mask: '255.255.255.0', gw: '10.0.2.1' } },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.3.100', mask: '255.255.255.0', gw: '10.0.3.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['PC2', 'e0', 'R1', 'g0/1'], ['SRV', 'e0', 'R1', 'g0/2']],
  layout: { PC1: [50, 15], PC2: [50, 95], R1: [200, 55], SRV: [350, 55] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.1.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.2.1', '255.255.255.0'); set('R1', 'g0/2', '10.0.3.1', '255.255.255.0');
    topo.devs.R1.hostname = 'R1';
  },
  intro: `The server LAN (10.0.3.0/24) is for engineering only. Write a standard ACL that permits PC1's subnet and denies PC2's, applied <b>outbound</b> on the server-facing interface — standard ACLs go close to the destination.`,
  tasks: [
    { t: 'Create standard ACL 10: permit 10.0.1.0/24, deny 10.0.2.0/24', why: 'Standard ACLs (1-99) match SOURCE addresses only. Order matters — top-down, first match wins, and an invisible "deny any" sits at the bottom of every ACL.' },
    { t: 'Apply ACL 10 outbound on G0/2', why: 'The placement rule: standard ACLs go close to the DESTINATION. Since they can\'t see where traffic is headed, filtering near the source would kill traffic to everything, not just the server LAN.' },
    { t: 'PC1 can still ping the server; PC2 cannot', why: 'The permit line matches PC1\'s subnet first; PC2 falls to the deny. An ACL isn\'t done until you prove both what it blocks AND what it still allows.' },
  ],
  steps: [
    { t: 'Before: confirm both PCs reach the server (ping 10.0.3.100 from each PC tab).', c: ['ping 10.0.3.100'] },
    { t: 'Build the ACL — order matters, top-down, first match wins.', c: ['enable', 'configure terminal', 'access-list 10 permit 10.0.1.0 0.0.0.255', 'access-list 10 deny 10.0.2.0 0.0.0.255'], note: 'Wildcard 0.0.0.255 = "match the whole /24". Every ACL ends with an invisible <code>deny any</code>.' },
    { t: 'Apply it outbound on the interface nearest the destination.', c: ['interface g0/2', 'ip access-group 10 out'] },
    { t: 'Verify the ACL and its placement.', c: ['do show access-lists', 'do show ip interface g0/2'] },
    { t: 'After: PC1 ping succeeds, PC2 ping gets U.U.U (administratively blocked).', c: ['ping 10.0.3.100'] },
  ],
  verify: ['show access-lists', 'show ip interface g0/2', 'show running-config'],
  explain: `<h3>Standard = source only</h3>
<p>Standard ACLs (1-99, or named) match <b>only the source IP</b>. Because they can't see the destination, applying one near the source would kill traffic to <em>everything</em> — hence the rule: <b>standard ACLs close to the destination</b>.</p>
<p>Processing is strictly top-down with an implicit <code>deny any</code> at the bottom, so a bare deny-list blocks everyone: you must end with an explicit permit if others should pass. Here the permit for 10.0.1.0/24 comes first; everything else falls through the explicit and implicit denies.</p>
<p>One ACL per interface, per direction, per protocol. <code>out</code> means traffic leaving the interface toward the wire.</p>`,
  checks: [
    { desc: 'ACL 10 exists with permit + deny entries', fn: H => { const a = H.d('R1').acls[10]; return !!(a && a.entries.some(e => e.action === 'permit') && a.entries.some(e => e.action === 'deny')); } },
    { desc: 'ACL 10 applied outbound on G0/2', fn: H => H.i('R1', 'g0/2').aclOut === '10' },
    { desc: 'PC1 can still reach the server', fn: H => H.ping('PC1', '10.0.3.100') },
    { desc: 'PC2 is blocked by the ACL', fn: H => H.pingBlocked('PC2', '10.0.3.100') },
  ],
});

/* ============================================================= */
L({
  id: 'd34-ext-acl', vol: 2, day: 'Day 34', title: 'Extended ACLs',
  topics: 'named extended ACLs · protocol + port matching · placement close to source',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.3.100', mask: '255.255.255.0', gw: '10.0.3.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['SRV', 'e0', 'R1', 'g0/1']],
  layout: { PC1: [70, 45], R1: [200, 45], SRV: [330, 45] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.1.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.3.1', '255.255.255.0');
    topo.devs.R1.hostname = 'R1';
  },
  intro: `Policy: PC1's subnet may browse the web server (TCP 80) but must not ping it. Extended ACLs match protocol, source, destination and port — precise enough to sit <b>close to the source</b>.`,
  tasks: [
    { t: 'Named extended ACL WEB-ONLY: permit tcp 10.0.1.0/24 → host 10.0.3.100 eq 80; deny icmp same pair; permit ip any any', why: 'Extended ACLs match the full 5-tuple: protocol, source, destination, ports. Specific rules go on top; the broad "permit ip any any" catch-all must come LAST or nothing after it ever matches.' },
    { t: 'Apply WEB-ONLY inbound on G0/0', why: 'The placement rule, flipped: extended ACLs go close to the SOURCE. They identify traffic exactly, so drop doomed packets at the first router instead of carrying them across the network.' },
    { t: 'Ping from PC1 to the server is blocked (web would still work)', why: 'Surgical filtering: same two hosts, ICMP dies at the deny line while TCP/80 sails through the permit above it. That per-protocol precision is why extended ACLs exist.' },
  ],
  steps: [
    { t: 'Create the named extended ACL.', c: ['enable', 'configure terminal', 'ip access-list extended WEB-ONLY', 'permit tcp 10.0.1.0 0.0.0.255 host 10.0.3.100 eq 80', 'deny icmp 10.0.1.0 0.0.0.255 host 10.0.3.100', 'permit ip any any', 'exit'], note: 'Named ACL mode gives you sequence numbers you can edit later — a big win over numbered ACLs.' },
    { t: 'Apply it inbound where PC1\'s traffic enters the router.', c: ['interface g0/0', 'ip access-group WEB-ONLY in'] },
    { t: 'Verify.', c: ['do show access-lists'] },
    { t: 'From PC1: ping fails (blocked), proving the deny line matches.', c: ['ping 10.0.3.100'] },
  ],
  verify: ['show access-lists', 'show ip interface g0/0'],
  explain: `<h3>Extended = full 5-tuple</h3>
<p>Extended ACLs (100-199, or named) match protocol (<code>ip</code>/<code>tcp</code>/<code>udp</code>/<code>icmp</code>), source, destination, and ports (<code>eq 80</code>, <code>eq 443</code>, <code>gt 1023</code>…). Because they identify traffic exactly, drop it as early as possible: <b>extended ACLs close to the source</b> — why waste bandwidth carrying doomed packets across the network?</p>
<p>Order is everything. If <code>permit ip any any</code> were first, nothing after it would ever match. The specific rules go on top, the broad catch-all last.</p>
<p><code>host 10.0.3.100</code> is shorthand for <code>10.0.3.100 0.0.0.0</code>; <code>any</code> is shorthand for <code>0.0.0.0 255.255.255.255</code>.</p>`,
  checks: [
    { desc: 'Extended ACL WEB-ONLY exists with 3 entries', fn: H => { const a = H.d('R1').acls['WEB-ONLY']; return !!(a && a.type === 'extended' && a.entries.length >= 3); } },
    { desc: 'First entry permits tcp to host 10.0.3.100 port 80', fn: H => { const e = H.d('R1').acls['WEB-ONLY']?.entries[0]; return !!(e && e.action === 'permit' && e.proto === 'tcp' && e.dstPort === 80); } },
    { desc: 'Applied inbound on G0/0', fn: H => H.i('R1', 'g0/0').aclIn === 'WEB-ONLY' },
    { desc: 'Web traffic (TCP 80) would be permitted', fn: H => H.tcp('PC1', '10.0.3.100', 80) },
    { desc: 'ICMP from PC1 to the server is blocked', fn: H => H.pingBlocked('PC1', '10.0.3.100') },
  ],
});

/* ============================================================= */
L({
  id: 'd35-cdp-lldp', vol: 2, day: 'Day 35', title: 'CDP & LLDP',
  topics: 'show cdp neighbors · disabling CDP · enabling LLDP',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SW1', type: 'switch', ifaces: ['g0/1', 'g0/2'] },
    { id: 'SW2', type: 'switch', ifaces: ['g0/1'] },
  ],
  links: [['R1', 'g0/0', 'SW1', 'g0/1'], ['SW1', 'g0/2', 'SW2', 'g0/1']],
  layout: { R1: [70, 45], SW1: [200, 45], SW2: [330, 45] },
  setupAll: topo => { const i = ND.getIface(topo.devs.R1, 'g0/0'); i.shutdown = false; },
  intro: `Map an unknown network with discovery protocols, then flip the security switch: CDP off, LLDP on. Discovery data is gold to you — and to an attacker.`,
  tasks: [
    { t: 'Use CDP to identify all neighbors of SW1', why: 'Discovery protocols hand you the network map for free: neighbor hostname, platform, their port, even IP addresses in detail view. First tool out of the bag on an unfamiliar network.' },
    { t: 'Disable CDP globally on R1', why: 'The same free map helps an attacker enumerate your gear. Security policies commonly silence CDP on untrusted edges — know both "no cdp run" (global) and "no cdp enable" (per interface).' },
    { t: 'Enable LLDP globally on all three devices', why: 'LLDP (IEEE 802.1AB) is the vendor-neutral equivalent — the choice in multi-vendor networks. Unlike CDP, it\'s OFF by default on Cisco gear, so every device needs "lldp run".' },
    { t: 'Verify LLDP neighbors on SW1', why: 'Reading neighbor output correctly is the exam skill: "Local Intf" is YOUR port, "Port ID" is THEIR port. R1 now appears via LLDP even though its CDP is silent.' },
  ],
  steps: [
    { t: 'Explore from SW1 — who is on which port?', c: ['enable', 'show cdp neighbors', 'show cdp neighbors detail'], note: 'Detail view exposes IOS version and IP addresses — exactly why security policies often disable CDP on untrusted edges.' },
    { t: 'On R1, turn CDP off globally.', c: ['enable', 'configure terminal', 'no cdp run'] },
    { t: 'Enable LLDP (the IEEE-standard equivalent) on R1.', c: ['lldp run'] },
    { t: 'Enable LLDP on SW1 and SW2 too.', c: ['enable', 'configure terminal', 'lldp run'] },
    { t: 'Check LLDP neighbors from SW1 — R1 and SW2 should both appear.', c: ['do show lldp neighbors'], note: 'CDP from SW1 now shows only SW2 (R1 went silent).' },
  ],
  verify: ['show cdp neighbors', 'show lldp neighbors', 'show cdp'],
  explain: `<h3>Two discovery protocols, one exam topic</h3>
<p><b>CDP</b> is Cisco-proprietary, on by default, advertising every 60s (180s holdtime). <b>LLDP</b> is IEEE 802.1AB, off by default on Cisco gear, advertising every 30s (120s holdtime) — the choice in multi-vendor networks.</p>
<p>Both can be disabled globally (<code>no cdp run</code>) or per interface (<code>no cdp enable</code>) — know the difference for the exam. LLDP even splits transmit and receive per interface (<code>lldp transmit</code>/<code>lldp receive</code>).</p>
<p>Discovery output reads "their port, not yours": in <code>show cdp neighbors</code>, <b>Local Intrfce</b> is your port, <b>Port ID</b> is the neighbor's.</p>`,
  checks: [
    { desc: 'CDP disabled globally on R1', fn: H => !H.d('R1').cdp },
    { desc: 'LLDP enabled on R1', fn: H => H.d('R1').lldp },
    { desc: 'LLDP enabled on SW1 and SW2', fn: H => H.d('SW1').lldp && H.d('SW2').lldp },
  ],
});

/* ============================================================= */
L({
  id: 'd36-ntp', vol: 2, day: 'Day 36', title: 'NTP',
  topics: 'ntp server · ntp master · stratum · show ntp status',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0'] },
  ],
  links: [['R1', 'g0/0', 'R2', 'g0/0']],
  layout: { R1: [120, 45], R2: [280, 45] },
  setupAll: topo => {
    const set = (id, ip) => { const i = ND.getIface(topo.devs[id], 'g0/0'); i.ip = { addr: ip, mask: '255.255.255.0' }; i.shutdown = false; };
    set('R1', '10.0.0.1'); set('R2', '10.0.0.2');
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2';
  },
  intro: `Logs with wrong timestamps are useless and certificates break. Make R2 an authoritative time source (NTP master, stratum 3) and sync R1 to it.`,
  tasks: [
    { t: 'R2: ntp master with stratum 3', why: 'Someone must be authoritative. Stratum counts hops from a reference clock (1 = atomic/GPS); claiming 3 makes R2\'s clients sit at stratum 4. 16 means "unsynchronized".' },
    { t: 'R1: ntp server 10.0.0.2', why: 'Points R1 at R2 over UDP 123. Devices prefer the lowest-stratum source they can reach — this is a client-server relationship, not a peering.' },
    { t: 'R1 shows "Clock is synchronized"', why: 'The payoff: logs with wrong timestamps are useless for troubleshooting, and certificates break entirely when clocks disagree. Sync is the boring feature everything else depends on.' },
  ],
  steps: [
    { t: 'On R2, become an NTP master at stratum 3.', c: ['enable', 'configure terminal', 'ntp master 3'], note: 'Stratum counts hops from the reference clock: 1 = atomic/GPS source. R2 claims 3, so clients of R2 sit at stratum 4.' },
    { t: 'On R1, point at R2 for time.', c: ['enable', 'configure terminal', 'ntp server 10.0.0.2'] },
    { t: 'Verify synchronization on R1 (real gear can take minutes; here it is instant).', c: ['do show ntp status', 'do show ntp associations'] },
  ],
  verify: ['show ntp status', 'show ntp associations', 'show clock'],
  explain: `<h3>Stratum, in one breath</h3>
<p>NTP forms a hierarchy: stratum 1 servers own a reference clock, each hop away adds one, and 16 means "unsynchronized". Devices prefer the lowest-stratum source they can reach. UDP port 123 carries it all.</p>
<p><code>ntp master</code> makes a router act as an authoritative source using its own calendar — normal in labs and closed networks; production usually points at public pool servers or GPS appliances. Also worth knowing: <code>clock set</code> is manual and temporary, and <code>clock timezone</code>/<code>clock summer-time</code> adjust display, not sync.</p>`,
  checks: [
    { desc: 'R2 is NTP master, stratum 3', fn: H => H.d('R2').ntp.master === 3 },
    { desc: 'R1 has R2 (10.0.0.2) as its NTP server', fn: H => H.d('R1').ntp.servers.includes('10.0.0.2') },
    { desc: 'R1 clock reports synchronized', fn: H => ND.showNtp(H.topo, H.d('R1')).startsWith('Clock is synchronized') },
  ],
});

/* ============================================================= */
L({
  id: 'd38-dhcp', vol: 2, day: 'Day 38', title: 'DHCP Server & Relay',
  topics: 'ip dhcp pool · excluded-address · ip helper-address',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/1'], ['R2', 'g0/0', 'PC2', 'e0']],
  layout: { PC1: [40, 30], R1: [150, 30], R2: [250, 30], PC2: [355, 30] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.1.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.12.1', '255.255.255.252');
    set('R2', 'g0/0', '10.0.2.1', '255.255.255.0'); set('R2', 'g0/1', '10.0.12.2', '255.255.255.252');
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2';
    topo.devs.R1.staticRoutes.push({ net: '10.0.2.0', mask: '255.255.255.0', via: '10.0.12.2', ad: 1 });
    topo.devs.R2.staticRoutes.push({ net: '10.0.1.0', mask: '255.255.255.0', via: '10.0.12.1', ad: 1 });
  },
  intro: `R1 becomes the DHCP server for <em>both</em> LANs. Its own LAN is easy; PC2's LAN is a hop away, so R2 must relay broadcasts with <code>ip helper-address</code>. Routing between the routers is pre-configured — focus on DHCP.`,
  tasks: [
    { t: 'R1: exclude .1-.9 in both subnets from assignment', why: 'Protects the static addresses (gateways, servers, printers) from being leased to a random laptop. On real gear: exclude BEFORE enabling the pool, or it\'s a race.' },
    { t: 'R1: pool LAN1 — network 10.0.1.0/24, default-router 10.0.1.1, dns-server 8.8.8.8', why: 'The lease definition for the local LAN: the network line says who this pool serves, and the options (gateway, DNS) ride along in the DHCP OFFER.' },
    { t: 'R1: pool LAN2 — network 10.0.2.0/24, default-router 10.0.2.1, dns-server 8.8.8.8', why: 'A pool for a subnet R1 isn\'t even connected to! The server picks it by matching the relay agent\'s source address (giaddr) against pool networks.' },
    { t: 'R2 G0/0: ip helper-address 10.0.12.1', why: 'Routers kill broadcasts, so PC2\'s DISCOVER would never reach R1. The helper converts the broadcast into a unicast aimed at the real server — on the interface that HEARS the clients.' },
    { t: 'Both PCs obtain addresses via DHCP (ipconfig /renew)', why: 'DORA end to end: Discover, Offer, Request, Ack. One lease is local, the other proves relay works across the router hop.' },
  ],
  steps: [
    { t: 'Reserve the low addresses first — before any pool exists.', c: ['enable', 'configure terminal', 'ip dhcp excluded-address 10.0.1.1 10.0.1.9', 'ip dhcp excluded-address 10.0.2.1 10.0.2.9'] },
    { t: 'Build the local pool.', c: ['ip dhcp pool LAN1', 'network 10.0.1.0 255.255.255.0', 'default-router 10.0.1.1', 'dns-server 8.8.8.8', 'exit'] },
    { t: 'Build the remote pool. R1 picks a pool by matching the relay\'s source subnet.', c: ['ip dhcp pool LAN2', 'network 10.0.2.0 255.255.255.0', 'default-router 10.0.2.1', 'dns-server 8.8.8.8', 'exit'] },
    { t: 'On R2, relay LAN2\'s DHCP broadcasts to R1.', c: ['enable', 'configure terminal', 'interface g0/0', 'ip helper-address 10.0.12.1'], note: 'The helper goes on the interface that <em>hears</em> the client broadcasts.' },
    { t: 'On each PC, request a lease and verify.', c: ['ipconfig /renew'], note: 'Then on R1: <code>show ip dhcp binding</code>.' },
  ],
  verify: ['show ip dhcp binding', 'show running-config'],
  explain: `<h3>DORA and the relay trick</h3>
<p>DHCP is four broadcasts: <b>D</b>iscover, <b>O</b>ffer, <b>R</b>equest, <b>A</b>ck. Routers kill broadcasts — so a client on a serverless LAN would never be heard. <code>ip helper-address</code> converts the broadcast to unicast aimed at the real server, stamping the relay interface's address (giaddr) so the server knows which pool to draw from.</p>
<p>Excluded addresses protect statics (gateways, servers, printers). Exclude <em>before</em> enabling pools on real gear, or the server may lease .1 to some laptop while you type.</p>`,
  checks: [
    { desc: 'Excluded ranges cover 10.0.1.1-9 and 10.0.2.1-9', fn: H => { const ex = H.d('R1').dhcp.excluded; return ex.some(e => e[0] === '10.0.1.1') && ex.some(e => e[0] === '10.0.2.1'); } },
    { desc: 'Pool LAN1: network + default-router + dns', fn: H => { const p = Object.values(H.d('R1').dhcp.pools).find(x => x.network === '10.0.1.0'); return !!(p && p.router === '10.0.1.1' && p.dns); } },
    { desc: 'Pool LAN2: network + default-router + dns', fn: H => { const p = Object.values(H.d('R1').dhcp.pools).find(x => x.network === '10.0.2.0'); return !!(p && p.router === '10.0.2.1' && p.dns); } },
    { desc: 'R2 G0/0 relays to 10.0.12.1', fn: H => H.i('R2', 'g0/0').helpers.includes('10.0.12.1') },
    { desc: 'PC1 obtained an address in 10.0.1.0/24', fn: H => { const n = ND.pcNet(H.topo, H.d('PC1')); return !!(n.ip && n.ip.startsWith('10.0.1.')); } },
    { desc: 'PC2 obtained an address via the relay', fn: H => { const n = ND.pcNet(H.topo, H.d('PC2')); return !!(n.ip && n.ip.startsWith('10.0.2.')); } },
  ],
});

/* ============================================================= */
L({
  id: 'd40-syslog', vol: 2, day: 'Day 40', title: 'Syslog',
  topics: 'logging host · logging trap · logging buffered · severity levels',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0'] },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.100', mask: '255.255.255.0', gw: '10.0.0.1' } },
  ],
  links: [['R1', 'g0/0', 'SRV', 'e0']],
  layout: { R1: [130, 45], SRV: [280, 45] },
  setupAll: topo => {
    const i = ND.getIface(topo.devs.R1, 'g0/0'); i.ip = { addr: '10.0.0.1', mask: '255.255.255.0' }; i.shutdown = false;
    topo.devs.R1.hostname = 'R1';
  },
  intro: `Those %LINK-5-CHANGED messages you keep seeing? That's syslog. Point R1 at a syslog server, cap the export at warnings-and-worse, and keep a local buffer for everything.`,
  tasks: [
    { t: 'Send logs to syslog server 10.0.0.100', why: 'Logs stored only on the device vanish with the device. Shipping them to a server (UDP 514) preserves the evidence when a box dies or gets compromised.' },
    { t: 'Limit exported messages to severity warnings (level 4) and worse', why: 'The 0-7 severity scale, memorized: Emergency, Alert, Critical, Error, Warning, Notification, Informational, Debugging. "trap warnings" = level 4 and numerically lower (more severe).' },
    { t: 'Enable a 16384-byte local logging buffer', why: 'A local RAM history for quick "what just happened?" checks via show logging — no server round-trip needed, but lost on reboot.' },
  ],
  steps: [
    { t: 'Point logging at the server.', c: ['enable', 'configure terminal', 'logging host 10.0.0.100'] },
    { t: 'Only ship warnings (4), errors (3), critical (2), alerts (1), emergencies (0).', c: ['logging trap warnings'] },
    { t: 'Keep everything locally in RAM.', c: ['logging buffered 16384'] },
    { t: 'Verify.', c: ['do show logging'] },
  ],
  verify: ['show logging'],
  explain: `<h3>Severity 0-7 — memorize them</h3>
<p><b>E</b>very <b>A</b>wesome <b>C</b>isco <b>E</b>ngineer <b>W</b>ill <b>N</b>eed <b>I</b>ce cream <b>D</b>aily: Emergency 0, Alert 1, Critical 2, Error 3, Warning 4, Notification 5, Informational 6, Debugging 7. <code>logging trap warnings</code> means "4 and numerically lower (more severe)".</p>
<p>Message anatomy: <code>%LINK-5-CHANGED</code> = facility LINK, severity 5, mnemonic CHANGED. Destinations: console (default), vty (needs <code>terminal monitor</code>), buffer (<code>show logging</code>), and syslog servers on UDP 514.</p>`,
  checks: [
    { desc: 'Logging host 10.0.0.100 configured', fn: H => H.d('R1').logging.hosts.includes('10.0.0.100') },
    { desc: 'Trap level is warnings', fn: H => H.d('R1').logging.trap === 'warnings' },
    { desc: 'Buffered logging 16384', fn: H => H.d('R1').logging.buffered === 16384 },
  ],
});

/* ============================================================= */
L({
  id: 'd41-ssh', vol: 2, day: 'Day 41', title: 'SSH',
  topics: 'domain name · crypto key generate rsa · ip ssh version 2 · vty hardening',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.10', mask: '255.255.255.0', gw: null } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1']],
  layout: { PC1: [90, 45], SW1: [260, 45] },
  intro: `Make SW1 remotely manageable — the secure way. Management SVI, then the full SSH stack: hostname + domain (the RSA key is named from them), keys, version 2, local users, and vty lines that refuse telnet.`,
  tasks: [
    { t: 'Hostname SW1; management SVI VLAN 1 = 192.168.1.2/24', why: 'A layer-2 switch needs an IP somewhere to be managed remotely at all — that somewhere is an SVI. And the hostname can\'t stay "Switch": the RSA key is named hostname.domain.' },
    { t: 'ip domain-name netdrill.lab and 2048-bit RSA keys', why: 'The keypair SSH encrypts with. IOS refuses to generate keys without a domain name set — feel that error once and the ordering sticks forever.' },
    { t: 'Local user admin (secret cisco123); SSH version 2', why: 'SSH needs someone to log in AS — a local user database (or AAA). Version 2 fixes v1\'s known weaknesses and requires keys of at least 768 bits.' },
    { t: 'VTY 0-4: login local + transport input ssh', why: 'The lock on the remote door: authenticate against local users, and refuse telnet entirely — telnet sends every keystroke, passwords included, in cleartext.' },
  ],
  steps: [
    { t: 'Hostname and a management IP on the VLAN 1 SVI.', c: ['enable', 'configure terminal', 'hostname SW1', 'interface vlan 1', 'ip address 192.168.1.2 255.255.255.0', 'no shutdown'] },
    { t: 'Domain name, then generate the RSA keypair.', c: ['ip domain-name netdrill.lab', 'crypto key generate rsa modulus 2048'], note: 'Try <code>crypto key generate rsa</code> before setting the domain — IOS refuses. The key is named SW1.netdrill.lab, which is why hostname and domain come first.' },
    { t: 'Require SSHv2 and create the admin account.', c: ['ip ssh version 2', 'username admin secret cisco123'] },
    { t: 'Lock the vty lines to SSH with local authentication.', c: ['line vty 0 4', 'login local', 'transport input ssh', 'exit'] },
    { t: 'Verify.', c: ['do show ip ssh'] },
  ],
  verify: ['show ip ssh', 'show running-config'],
  explain: `<h3>The five prerequisites</h3>
<p>SSH needs: (1) hostname that isn't "Switch", (2) domain name, (3) RSA keys ≥768 bits for v2 (use 2048), (4) a user database or AAA, (5) vty lines set to <code>login local</code>. Miss any one and the exam question is "why can't the admin connect?"</p>
<p><code>transport input ssh</code> silently kills telnet — which sends every keystroke, passwords included, in cleartext. A switch needs the SVI + (off-subnet) a default gateway to be reachable at all; that's why L2 switch management addressing lives on <code>interface vlan 1</code> (or better, a dedicated management VLAN).</p>`,
  checks: [
    { desc: 'SVI VLAN 1 = 192.168.1.2/24, up', fn: H => H.hasIp('SW1', 'vlan1', '192.168.1.2') && H.noshut('SW1', 'vlan1') },
    { desc: 'Domain name set', fn: H => !!H.d('SW1').domainName },
    { desc: 'RSA keys ≥ 2048 bits', fn: H => H.d('SW1').rsaKey >= 2048 },
    { desc: 'SSH version 2 enforced', fn: H => H.d('SW1').sshVersion === 2 },
    { desc: 'User admin with a secret exists', fn: H => !!H.d('SW1').users.admin },
    { desc: 'VTY: login local + transport input ssh', fn: H => { const v = H.d('SW1').lines.vty; return v.loginLocal && v.transport === 'ssh'; } },
  ],
});

/* ============================================================= */
L({
  id: 'd43-static-nat', vol: 2, day: 'Day 43', title: 'NAT Part 1 — Static NAT',
  topics: 'ip nat inside/outside · ip nat inside source static',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.100', mask: '255.255.255.0', gw: '192.168.1.1' } },
    { id: 'ISP', type: 'router', ifaces: ['g0/0'] },
  ],
  links: [['SRV', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'ISP', 'g0/0']],
  layout: { SRV: [60, 45], R1: [200, 45], ISP: [340, 45] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '192.168.1.1', '255.255.255.0'); set('R1', 'g0/1', '203.0.113.2', '255.255.255.252');
    set('ISP', 'g0/0', '203.0.113.1', '255.255.255.252');
    topo.devs.R1.hostname = 'R1'; topo.devs.ISP.hostname = 'ISP';
  },
  intro: `The internal server 192.168.1.100 must be reachable from outside as 203.0.113.100. Mark R1's NAT domains and map the address one-to-one.`,
  tasks: [
    { t: 'G0/0 = ip nat inside, G0/1 = ip nat outside', why: 'NAT must know which side is private and which is public before any rule can work — translation happens as packets cross from one domain to the other.' },
    { t: 'Static mapping: 192.168.1.100 ↔ 203.0.113.100', why: 'One-to-one and bidirectional: outsiders can INITIATE connections to the global address — that\'s the point of static NAT (hosting a server). Learn the names: inside local vs inside global.' },
    { t: 'Verify with show ip nat translations', why: 'The translation table is the ground truth. A static entry sits there permanently; dynamic/PAT entries only appear while flows are active.' },
  ],
  steps: [
    { t: 'Mark the inside interface.', c: ['enable', 'configure terminal', 'interface g0/0', 'ip nat inside'] },
    { t: 'Mark the outside interface.', c: ['interface g0/1', 'ip nat outside', 'exit'] },
    { t: 'Create the one-to-one mapping: inside-local first, inside-global second.', c: ['ip nat inside source static 192.168.1.100 203.0.113.100'] },
    { t: 'Verify the translation table.', c: ['do show ip nat translations'] },
  ],
  verify: ['show ip nat translations', 'show running-config'],
  explain: `<h3>The four NAT address names</h3>
<p><b>Inside local</b> (192.168.1.100 — the host as its own LAN sees it), <b>inside global</b> (203.0.113.100 — the host as the internet sees it), outside local / outside global (the remote end, usually identical). The exam <em>will</em> test these; anchor on "local = as seen inside, global = as seen outside".</p>
<p>Static NAT is bidirectional: outsiders can initiate connections to 203.0.113.100 — that's the point (hosting a server). It burns one public IP per host, which is why the next lab's PAT exists. RFC 1918 space (10/8, 172.16/12, 192.168/16) is unroutable on the internet — NAT is how it gets out.</p>`,
  checks: [
    { desc: 'G0/0 marked ip nat inside', fn: H => H.i('R1', 'g0/0').natInside },
    { desc: 'G0/1 marked ip nat outside', fn: H => H.i('R1', 'g0/1').natOutside },
    { desc: 'Static mapping 192.168.1.100 → 203.0.113.100', fn: H => H.d('R1').nat.statics.some(s => s.local === '192.168.1.100' && s.global === '203.0.113.100') },
  ],
});

/* ============================================================= */
L({
  id: 'd44-pat', vol: 2, day: 'Day 44', title: 'NAT Part 2 — PAT (Overload)',
  topics: 'ACL-defined inside sources · ip nat inside source list … overload',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.10', mask: '255.255.255.0', gw: '192.168.1.1' } },
    { id: 'ISP', type: 'router', ifaces: ['g0/0'] },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'ISP', 'g0/0']],
  layout: { PC1: [60, 45], R1: [200, 45], ISP: [340, 45] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '192.168.1.1', '255.255.255.0'); set('R1', 'g0/1', '203.0.113.2', '255.255.255.252');
    set('ISP', 'g0/0', '203.0.113.1', '255.255.255.252');
    topo.devs.R1.hostname = 'R1'; topo.devs.ISP.hostname = 'ISP';
  },
  intro: `The whole 192.168.1.0/24 LAN shares R1's single public address — the NAT that runs on every home router. Define the inside sources with an ACL, then overload the outside interface.`,
  tasks: [
    { t: 'ACL 1 permits 192.168.1.0/24', why: 'Here the ACL blocks nothing — it\'s a CLASSIFIER answering "who is allowed to be translated?" ACLs as traffic-matchers show up all over IOS (NAT, VPNs, QoS).' },
    { t: 'G0/0 inside, G0/1 outside', why: 'Same domain-marking as static NAT: translation only happens inside→outside, so the router has to know which interface is which.' },
    { t: 'ip nat inside source list 1 interface g0/1 overload', why: '"overload" is the whole trick: rewrite source IP AND port, tracking each flow by unique port number. ~65k ports means one public IP serves an entire office — this is home-router NAT.' },
  ],
  steps: [
    { t: 'Define which sources get translated.', c: ['enable', 'configure terminal', 'access-list 1 permit 192.168.1.0 0.0.0.255'], note: 'Here the ACL isn\'t blocking anything — it\'s a <em>traffic classifier</em> answering "who may be translated?"' },
    { t: 'Mark the NAT domains.', c: ['interface g0/0', 'ip nat inside', 'interface g0/1', 'ip nat outside', 'exit'] },
    { t: 'Tie it together with overload.', c: ['ip nat inside source list 1 interface g0/1 overload'], note: 'Read it: "translate sources matching list 1 to G0/1\'s address, multiplexing by port".' },
    { t: 'Verify config.', c: ['do show run'] },
  ],
  verify: ['show ip nat translations', 'show running-config'],
  explain: `<h3>How one IP serves thousands</h3>
<p>PAT rewrites source IP <em>and</em> source port, tracking each flow as (inside IP:port ↔ global IP:unique-port). With ~65k ports available, one public address covers an office. This is why IPv4 survived long enough for IPv6 to arrive.</p>
<p>Difference from static NAT: PAT mappings exist only while a flow is active, and outsiders cannot initiate inbound — there's no translation entry until an inside host opens one. Port forwarding (static NAT with ports) is the workaround.</p>
<p>Variants to recognize on the exam: static (1:1 fixed), dynamic (pool, first-come), PAT/overload (many:1 by port — the one everyone deploys).</p>`,
  checks: [
    { desc: 'ACL 1 permits 192.168.1.0/24', fn: H => { const a = H.d('R1').acls[1]; return !!(a && a.entries.some(e => e.action === 'permit')); } },
    { desc: 'Inside/outside interfaces marked', fn: H => H.i('R1', 'g0/0').natInside && H.i('R1', 'g0/1').natOutside },
    { desc: 'PAT overload configured on G0/1 with list 1', fn: H => { const d = H.d('R1').nat.dynamic; return !!(d && d.acl === '1' && d.overload && d.iface === 'GigabitEthernet0/1'); } },
  ],
});

/* ============================================================= */
L({
  id: 'd47-port-security', vol: 2, day: 'Day 47', title: 'Port Security',
  topics: 'switchport port-security · maximum · violation modes · sticky MACs',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.12', mask: '255.255.255.0', gw: null } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2']],
  layout: { PC1: [70, 20], PC2: [70, 90], SW1: [240, 55] },
  intro: `Pin each access port to the device plugged into it. F0/1 learns PC1's MAC sticky; F0/2 gets restrict mode so violations are logged, not fatal.`,
  tasks: [
    { t: 'F0/1: access mode, port-security, max 1, sticky MAC learning (default shutdown violation)', why: 'Pins the port to whichever device plugs in first. Order matters: port-security is REJECTED on a dynamic-mode port — set static access mode first. Default violation err-disables the port.' },
    { t: 'F0/2: access mode, port-security, max 1, violation restrict', why: 'The gentler mode: drop offending frames, log and count each one, port stays up. (protect drops silently — no log, no counter — which is why it\'s the trick answer.)' },
    { t: 'Generate traffic so F0/1 sticky-learns PC1\'s MAC', why: 'Sticky learning needs a frame to learn from. The learned MAC gets written into the running config — save it and the binding survives reboots.' },
    { t: 'Verify with show port-security', why: 'The audit view: max vs current addresses, violation count, action per port. Also how you spot a port sitting in Secure-shutdown after an incident.' },
  ],
  steps: [
    { t: 'Port security requires a static access (or trunk) port first — dynamic is rejected.', c: ['enable', 'configure terminal', 'interface f0/1', 'switchport mode access', 'switchport port-security'], note: 'Try enabling port-security before setting the mode — IOS refuses with "Command rejected". Feel that error once so you never forget the order.' },
    { t: 'Limit to one MAC, learned sticky.', c: ['switchport port-security maximum 1', 'switchport port-security mac-address sticky'] },
    { t: 'Configure F0/2 with the gentler violation mode.', c: ['interface f0/2', 'switchport mode access', 'switchport port-security', 'switchport port-security violation restrict'] },
    { t: 'Make PC1 talk so the sticky MAC gets written into the running config.', c: ['ping 10.0.0.12'], note: 'Run from the PC1 tab, then check <code>show run</code> on SW1 — the learned MAC appears as a config line.' },
    { t: 'Verify.', c: ['do show port-security', 'do show port-security interface f0/1'] },
  ],
  verify: ['show port-security', 'show port-security interface f0/1', 'show running-config'],
  explain: `<h3>Violation modes — the exam table</h3>
<p><b>shutdown</b> (default): err-disable the port, send SNMP trap/syslog, increment counter once. Recovery: <code>shutdown</code> then <code>no shutdown</code> (or errdisable recovery). <b>restrict</b>: drop offending frames, log and count each. <b>protect</b>: drop silently — no log, no counter. Protect is the trick answer because it's invisible.</p>
<p><b>Sticky</b> learning converts dynamically-learned MACs into running-config entries — save the config and they survive reboots. Default maximum is 1 MAC; IP phones + PC behind them typically need 2-3.</p>
<p>Port security defeats MAC flooding attacks (CAM overflow turning a switch into a hub) and casual "plug my own AP in" violations.</p>`,
  checks: [
    { desc: 'F0/1: access + port-security enabled', fn: H => H.i('SW1', 'f0/1').swMode === 'access' && H.i('SW1', 'f0/1').portSec?.enabled },
    { desc: 'F0/1: max 1, sticky learning', fn: H => H.i('SW1', 'f0/1').portSec?.max === 1 && H.i('SW1', 'f0/1').portSec?.sticky },
    { desc: 'F0/2: port-security with violation restrict', fn: H => H.i('SW1', 'f0/2').portSec?.enabled && H.i('SW1', 'f0/2').portSec?.violation === 'restrict' },
    { desc: 'F0/1 has sticky-learned PC1\'s MAC', fn: H => (H.i('SW1', 'f0/1').portSec?.stickyLearned || []).length > 0 },
  ],
});

/* ============================================================= */
L({
  id: 'd48-dhcp-snooping', vol: 2, day: 'Day 48', title: 'DHCP Snooping',
  topics: 'ip dhcp snooping · vlan scoping · trusted ports',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { dhcp: true } },
  ],
  links: [['R1', 'g0/0', 'SW1', 'g0/1'], ['PC1', 'e0', 'SW1', 'f0/1']],
  layout: { R1: [200, 12], SW1: [200, 68], PC1: [90, 108] },
  setupAll: topo => {
    const i = ND.getIface(topo.devs.R1, 'g0/0'); i.ip = { addr: '10.0.0.1', mask: '255.255.255.0' }; i.shutdown = false;
    topo.devs.R1.hostname = 'R1';
    topo.devs.R1.dhcp.pools.LAN = { name: 'LAN', network: '10.0.0.0', mask: '255.255.255.0', router: '10.0.0.1', dns: '8.8.8.8', domain: null, lease: null };
    topo.devs.R1.dhcp.excluded.push(['10.0.0.1', '10.0.0.9']);
  },
  intro: `A rogue DHCP server on an access port can hand out itself as everyone's gateway (man-in-the-middle). DHCP snooping sorts ports into <b>trusted</b> (toward the real server) and <b>untrusted</b> (everything else) and drops server-messages arriving on untrusted ports. R1 is already serving DHCP — secure the switch.`,
  tasks: [
    { t: 'Enable DHCP snooping globally on SW1', why: 'The master switch — but inert on its own: nothing is inspected until you also scope VLANs. Two-step enablement is a favorite exam detail.' },
    { t: 'Scope it to VLAN 1', why: 'Now filtering is live where the hosts are: server messages (OFFER/ACK/NAK) arriving on untrusted ports get dropped, killing rogue DHCP servers.' },
    { t: 'Trust only the uplink G0/1 toward R1', why: 'All ports default to untrusted. The legitimate server\'s replies come through the uplink, so that one port — and only that one — gets trusted.' },
    { t: 'PC1 can still get a lease (ipconfig /renew)', why: 'Hardening that breaks the legitimate flow is just an outage. Client messages are fine from untrusted ports; the lease also populates the binding table that Dynamic ARP Inspection builds on.' },
  ],
  steps: [
    { t: 'Turn snooping on globally — nothing is filtered until a VLAN is scoped.', c: ['enable', 'configure terminal', 'ip dhcp snooping'] },
    { t: 'Apply it to VLAN 1.', c: ['ip dhcp snooping vlan 1'] },
    { t: 'Mark the port facing the legitimate server as trusted.', c: ['interface g0/1', 'ip dhcp snooping trust'], note: 'All ports default to untrusted — OFFER/ACK messages arriving on F0/1 or F0/2 would be dropped.' },
    { t: 'Confirm the client still works, then verify.', c: ['do show ip dhcp snooping'], note: 'Run <code>ipconfig /renew</code> on PC1 — legitimate traffic must keep flowing.' },
  ],
  verify: ['show ip dhcp snooping', 'show running-config'],
  explain: `<h3>Trusted vs untrusted</h3>
<p>Snooping inspects DHCP messages by type: client messages (DISCOVER, REQUEST) are fine anywhere; server messages (OFFER, ACK, NAK) are only legal on trusted ports. The switch also builds a <b>binding table</b> (MAC ↔ IP ↔ port ↔ VLAN) that Dynamic ARP Inspection (Day 49) uses to stop ARP spoofing — the two features chain together.</p>
<p>Deployment rule: trust uplinks toward the DHCP server, never access ports. Snooping also rate-limits DHCP on untrusted ports to stop starvation attacks (an attacker requesting every lease in the pool).</p>`,
  checks: [
    { desc: 'DHCP snooping enabled globally', fn: H => H.d('SW1').dhcp.snooping.enabled },
    { desc: 'Scoped to VLAN 1', fn: H => H.d('SW1').dhcp.snooping.vlans.includes(1) },
    { desc: 'G0/1 (uplink to R1) is trusted', fn: H => H.i('SW1', 'g0/1').snoopTrust },
    { desc: 'F0/1 and F0/2 remain untrusted', fn: H => !H.i('SW1', 'f0/1').snoopTrust && !H.i('SW1', 'f0/2').snoopTrust },
  ],
});

window.ND = ND;
})();
