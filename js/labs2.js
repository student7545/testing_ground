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
  intro: `<b>The situation:</b> a router connects three networks — PC1's, PC2's, and one holding a server. Right now both PCs can reach the server freely.<br><b>Your goal:</b> enforce a policy: only PC1's network may reach the server; PC2's network must be blocked. You'll do it with a <b>standard access list</b> — a simple filter that judges traffic purely on where it came FROM. Because it can't see where traffic is going, <em>where</em> you apply it matters as much as what you write.`,
  tasks: [
    { t: 'Before changing anything: ping the server (10.0.3.100) from PC1 and again from PC2 — both should work', why: 'Establish the "before" picture. If you don\'t know what worked before your change, you can\'t tell what your change actually did.' },
    { t: 'On R1: create ACL number 10 with a line permitting the 10.0.1.0 network (wildcard 0.0.0.255)', why: 'Numbers 1-99 mean a standard ACL, which matches the SOURCE address only. The wildcard 0.0.0.255 means "any host in this /24".' },
    { t: 'On R1: add a second line to ACL 10 denying the 10.0.2.0 network (wildcard 0.0.0.255)', why: 'Order matters enormously: the router checks lines top-down and stops at the first match. Putting this deny first would block PC1 too.' },
    { t: 'Enter interface G0/2 (the port facing the server) and apply ACL 10 in the "out" direction', why: 'The placement rule for standard ACLs: put them close to the DESTINATION. They can\'t see where traffic is headed, so filtering near the source would block that PC from reaching everything.' },
    { t: 'Check the ACL contents with "show access-lists"', why: 'Confirms the lines are in the order you intended, and shows the sequence numbers you would use to edit them later.' },
    { t: 'Confirm it is applied: run "show ip interface g0/2" and look for the outgoing access list', why: 'An ACL that exists but isn\'t applied to an interface does nothing at all — a very common lab mistake.' },
    { t: 'Test again from PC1 — the ping to 10.0.3.100 should still succeed', why: 'Always prove what still WORKS, not just what broke. PC1 matches the permit line on top.' },
    { t: 'Test from PC2 — the ping should now fail', why: 'PC2 falls through to the deny line. Note there is also an invisible "deny everything" at the bottom of every ACL — anything not explicitly permitted is dropped.' },
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
  intro: `<b>The situation:</b> the same kind of setup as the last lab, but the policy is now more specific: PC1's network should be able to <em>browse</em> the web server, but not <em>ping</em> it.<br><b>Your goal:</b> write an <b>extended access list</b>. Unlike the standard kind, it can see the protocol, the destination and the port number — so it can allow web traffic and block ping between the very same two machines. That precision also changes where you should apply it.`,
  tasks: [
    { t: 'On R1: start a named extended ACL called WEB-ONLY', why: 'Named ACLs are easier to read than numbers, and let you insert or delete individual lines later using sequence numbers.' },
    { t: 'Add line 1: permit tcp from network 10.0.1.0 (wildcard 0.0.0.255) to host 10.0.3.100 on port 80', why: 'Extended ACLs match protocol + source + destination + port. This one sentence allows web browsing to exactly one server, and nothing else about that pair.' },
    { t: 'Add line 2: deny icmp from network 10.0.1.0 (wildcard 0.0.0.255) to host 10.0.3.100', why: 'ICMP is what ping uses. Blocking it while allowing web traffic to the same server shows off the per-protocol precision that standard ACLs simply cannot do.' },
    { t: 'Add line 3: permit ip any any', why: 'The catch-all, and it MUST be last. Without it the invisible "deny everything" at the bottom would block all other traffic; placed first, nothing below it would ever be reached.' },
    { t: 'Enter interface G0/0 (where PC1\'s traffic arrives) and apply WEB-ONLY in the "in" direction', why: 'The placement rule for extended ACLs: close to the SOURCE. They identify traffic exactly, so drop doomed packets at the first router instead of hauling them across the network first.' },
    { t: 'Review the result with "show access-lists"', why: 'Read your three lines in order and ask yourself: which line does a web packet hit? Which line does a ping hit? That mental trace is the exam skill.' },
    { t: 'From PC1, try to ping 10.0.3.100 — it should now fail', why: 'The ping matches line 2 and is dropped. Web traffic to the same server would still pass via line 1 — same two hosts, different outcome per protocol.' },
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
  intro: `<b>The situation:</b> a router and two switches are cabled together, but you don't have a diagram — you have to work out what's connected to what.<br><b>Your goal:</b> use the discovery protocols that Cisco devices use to announce themselves to their neighbours. First map the network with <b>CDP</b> (Cisco's own), then switch it off on the router and turn on <b>LLDP</b> (the vendor-neutral equivalent) instead. The same information that helps you also helps an intruder, which is why you learn to control it.`,
  tasks: [
    { t: 'On SW1: list the directly connected Cisco devices with "show cdp neighbors"', why: 'Discovery hands you the network map for free — who is attached, and on which port. First tool out of the bag on an unfamiliar network.' },
    { t: 'On SW1: run "show cdp neighbors detail" and notice it also reveals IP addresses and platform', why: 'Great for you, great for an attacker. Seeing how much CDP gives away is the reason the next steps exist.' },
    { t: 'Write down which of SW1\'s ports connects to R1 and which connects to SW2', why: 'Read the columns correctly: "Local Intrfce" is YOUR port, "Port ID" is THEIR port. Mixing these up is a classic exam mistake.' },
    { t: 'On R1: turn CDP off for the whole device with "no cdp run"', why: 'The global off switch. There is also a per-interface version ("no cdp enable") for silencing just the untrusted ports — know both.' },
    { t: 'Back on SW1: run "show cdp neighbors" again — R1 should have vanished', why: 'Proof the change took effect. R1 is still physically connected; it just stopped announcing itself.' },
    { t: 'On R1: turn on the vendor-neutral alternative with "lldp run"', why: 'LLDP (IEEE 802.1AB) does the same job across vendors. Unlike CDP it is OFF by default on Cisco gear.' },
    { t: 'On SW1 and SW2: enable LLDP as well', why: 'Both ends must speak it. A device only appears in LLDP output if it is also running LLDP — that is why every device needs the command.' },
    { t: 'On SW1: verify with "show lldp neighbors" — R1 and SW2 should both be listed', why: 'R1 is now visible again via LLDP even though its CDP is silent. Same map, different protocol.' },
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
  intro: `<b>The situation:</b> two routers whose clocks are not synchronised with anything. Their log messages will carry unreliable timestamps, which makes troubleshooting across devices nearly impossible.<br><b>Your goal:</b> make R2 the network's official time source, and have R1 synchronise its clock to it using <b>NTP</b>. It's a small configuration with outsized importance — correlating logs and validating certificates both depend on it.`,
  tasks: [
    { t: 'On R1: check the current time sync state with "show ntp status" — it should say unsynchronized, stratum 16', why: 'The "before" picture. Stratum 16 is NTP\'s way of saying "I have no trustworthy time source".' },
    { t: 'On R2: make it an authoritative time source with "ntp master 3"', why: 'Someone must be the reference. Stratum counts hops away from a real clock (1 = atomic/GPS), so R2 claiming 3 puts its clients at 4.' },
    { t: 'On R1: point it at R2 using "ntp server 10.0.0.2"', why: 'This is a client-server relationship over UDP port 123. Devices prefer the lowest-stratum source they can reach.' },
    { t: 'On R1: run "show ntp status" again — it should now say synchronized', why: 'On real gear this takes a few minutes; here it is instant. Confirms R1 accepted R2 as its reference.' },
    { t: 'On R1: look at "show ntp associations" to see the server it is using', why: 'Shows each configured source, its stratum and reachability — where you look when sync silently fails.' },
    { t: 'On R1: display the clock with "show clock"', why: 'A leading asterisk means the time is NOT authoritative. Logs with wrong timestamps are useless for troubleshooting, and certificates break outright when clocks disagree.' },
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
  intro: `<b>The situation:</b> two PCs are set to get their IP addresses automatically, but nothing is handing addresses out, so both are offline. The routers are already addressed and routing between themselves — this lab is purely about DHCP.<br><b>Your goal:</b> turn R1 into the address server for <em>both</em> networks. The PC on R1's own network is straightforward. The PC behind R2 is the interesting case: its request is a broadcast, and routers don't forward broadcasts — so R2 needs an extra command to pass it along.`,
  tasks: [
    { t: 'Check the starting point: on PC1, run "ipconfig" — it has no address yet', why: 'Both PCs are set to ask for an address automatically. Right now nobody is answering.' },
    { t: 'On R1: reserve 10.0.1.1 through 10.0.1.9 so DHCP never hands them out', why: 'Protects the addresses you assigned by hand (gateways, servers, printers). On real gear always exclude BEFORE creating the pool, or a laptop may grab .1 while you type.' },
    { t: 'On R1: reserve 10.0.2.1 through 10.0.2.9 as well', why: 'Same protection for the far LAN — R1 is about to serve addresses for that network too.' },
    { t: 'On R1: create a pool named LAN1 and set its network to 10.0.1.0 255.255.255.0', why: 'The "network" line defines which subnet this pool serves and which addresses it may lease.' },
    { t: 'In pool LAN1: set the default router to 10.0.1.1 and the DNS server to 8.8.8.8', why: 'A lease is more than an address — the gateway and DNS ride along in the same offer, which is why DHCP clients come up fully working.' },
    { t: 'On R1: create a second pool named LAN2 for network 10.0.2.0 255.255.255.0, default router 10.0.2.1, DNS 8.8.8.8', why: 'A pool for a network R1 is not even attached to! The server picks the right pool by looking at which subnet the request was relayed from.' },
    { t: 'On PC1: run "ipconfig /renew" — it should get an address in 10.0.1.x', why: 'The local case works immediately: PC1 shares a network with R1, so its broadcast reaches the server directly.' },
    { t: 'Try "ipconfig /renew" on PC2 — it fails, because its broadcast never reaches R1', why: 'Routers do not forward broadcasts. Without help, a client on a serverless network is simply never heard. Feel this failure before fixing it.' },
    { t: 'On R2: enter interface G0/0 (the port facing PC2) and add "ip helper-address 10.0.12.1"', why: 'The relay converts the client\'s broadcast into a unicast aimed at the real server. It goes on the interface that HEARS the clients, not the one facing the server.' },
    { t: 'On PC2: run "ipconfig /renew" again — it should now receive an address in 10.0.2.x', why: 'Relay works. R1 knew which pool to use because R2 stamped the request with its own interface address.' },
    { t: 'On R1: confirm both leases with "show ip dhcp binding"', why: 'The server\'s record of who holds what. The whole exchange is four messages: Discover, Offer, Request, Ack — remember it as DORA.' },
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
  intro: `<b>The situation:</b> every time you've typed <code>no shutdown</code> in these labs, a message like <code>%LINK-5-CHANGED</code> appeared on screen. That's the logging system talking — and right now those messages exist only on the device.<br><b>Your goal:</b> send them somewhere they survive: to a logging server on the network, and to a memory buffer on the router itself. You'll also control <em>how much</em> gets sent, using the severity scale that ranks messages from emergencies down to debugging chatter.`,
  tasks: [
    { t: 'On R1: look at the current logging setup with "show logging"', why: 'Every %LINK-5-CHANGED message you have seen in these labs is syslog. This shows where those messages currently go.' },
    { t: 'On R1: send log messages to the syslog server at 10.0.0.100', why: 'Logs kept only on the device vanish with the device. Shipping them to a server (UDP port 514) preserves the evidence when a box dies or is compromised.' },
    { t: 'On R1: limit what gets exported to severity "warnings" and anything more serious', why: 'The 0-7 scale: Emergency, Alert, Critical, Error, Warning, Notification, Informational, Debugging. "warnings" means level 4 and everything numerically lower.' },
    { t: 'On R1: turn on a local log buffer of 16384 bytes', why: 'Keeps recent history in RAM for quick "what just happened?" checks — no server round trip needed, though it is lost on reboot.' },
    { t: 'Verify with "show logging" — check the trap level and the server address are listed', why: 'Confirms both destinations are set: the buffer for you, the server for the record.' },
    { t: 'Generate a message: shut down an interface, then bring it back up, and watch the log line appear', why: 'Decode the message format: %LINK-5-CHANGED means facility LINK, severity 5, event CHANGED. Reading that structure is an exam favorite.' },
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
  intro: `<b>The situation:</b> a switch you can only configure by standing next to it with a console cable. Nobody wants to walk to the wiring closet every time.<br><b>Your goal:</b> make it reachable over the network — securely. That means giving the switch an IP address to be reached at, then building the full <b>SSH</b> stack: a name, a domain, encryption keys, a user account, and remote-access lines that refuse the old insecure telnet. Every step depends on the one before it, which is why the order matters.`,
  tasks: [
    { t: 'Rename the switch to SW1', why: 'Not cosmetic here: the RSA key you generate later is named after hostname + domain, and IOS refuses to build one while the name is still the default "Switch".' },
    { t: 'Create the management interface: enter "interface vlan 1", give it 192.168.1.2 mask 255.255.255.0, and turn it on', why: 'A plain switch has no routed ports, so its management IP lives on a virtual VLAN interface (an SVI). Without this there is nothing to SSH to.' },
    { t: 'Set the domain name to netdrill.lab', why: 'Required before keys can be generated — try skipping it and IOS will refuse. The key ends up named SW1.netdrill.lab.' },
    { t: 'Generate RSA keys with a modulus of 2048 bits', why: 'These keys are what SSH encrypts your session with. SSH version 2 needs at least 768 bits; 2048 is the sensible modern choice.' },
    { t: 'Force SSH version 2 only', why: 'Version 1 has known weaknesses. This command only succeeds once the keys exist — the ordering of these steps is the whole lesson.' },
    { t: 'Create a local user named admin with the secret cisco123', why: 'SSH needs an account to log in AS. Unlike telnet\'s shared line password, each admin gets their own username.' },
    { t: 'Enter the vty lines (0 through 4) and set them to authenticate using the local user list', why: 'The vty lines are the remote-access doors. "login local" tells them to check the username database you just created.' },
    { t: 'On the same vty lines: allow only SSH as the input transport', why: 'Shuts the telnet door for good — telnet sends every keystroke, passwords included, in clear text across the wire.' },
    { t: 'Verify with "show ip ssh" — it should report SSH enabled, version 2', why: 'The five prerequisites in one check: hostname, domain, keys, user database, vty config. Miss any one and the exam question is "why can\'t the admin connect?"' },
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
  intro: `<b>The situation:</b> a company server sits on a private address (192.168.1.100). Private addresses can't be used on the public internet, so nobody outside can reach it — but this server is meant to be publicly reachable.<br><b>Your goal:</b> give it a permanent public identity (203.0.113.100) using <b>static NAT</b>, which maps one private address to one public address in both directions. Outsiders connect to the public address; the router quietly rewrites it to the real one.`,
  tasks: [
    { t: 'Look at the topology: the server uses a private address (192.168.1.100) that cannot be used on the internet', why: 'Private ranges (10.x, 172.16-31.x, 192.168.x) are not routable on the public internet. NAT is the translation layer that lets them communicate anyway.' },
    { t: 'On R1: enter interface G0/0 (facing the server) and mark it as the NAT inside interface', why: 'NAT must know which side is private and which is public — translation happens as packets cross between the two.' },
    { t: 'On R1: enter interface G0/1 (facing the ISP) and mark it as the NAT outside interface', why: 'The public side. With both sides labelled, the router knows in which direction to rewrite addresses.' },
    { t: 'On R1: create a permanent one-to-one mapping from 192.168.1.100 to 203.0.113.100', why: 'Order in the command is inside-local first (the real private address), then inside-global (the public face). Getting the order backwards is a classic slip.' },
    { t: 'Verify the entry with "show ip nat translations"', why: 'A static mapping sits in the table permanently, whether or not any traffic is flowing — unlike dynamic entries which appear only during active connections.' },
    { t: 'Confirm the interface roles in "show running-config"', why: 'A mapping with no inside/outside interfaces marked does nothing. Both halves of the configuration are required.' },
    { t: 'Think through the four NAT address names for this setup', why: 'Inside local = 192.168.1.100 (as the LAN sees the server); inside global = 203.0.113.100 (as the internet sees it). "Local = inside view, global = outside view" — the exam WILL test this.' },
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
  intro: `<b>The situation:</b> an entire office network of private addresses needs internet access — but the company has only ONE public address to share between all of them.<br><b>Your goal:</b> configure <b>PAT</b> (also called NAT overload), which lets many devices share a single public address by tracking each conversation with a different port number. This is exactly what the router in your home does for every phone, laptop and TV in the house.`,
  tasks: [
    { t: 'On R1: create ACL 1 permitting the 192.168.1.0 network (wildcard 0.0.0.255)', why: 'Here the ACL blocks nothing — it is a CLASSIFIER answering "who is allowed to be translated?" ACLs used as traffic-matchers show up all over IOS.' },
    { t: 'On R1: mark interface G0/0 as the NAT inside interface', why: 'Same domain-marking as static NAT. The router only translates traffic crossing from inside to outside.' },
    { t: 'On R1: mark interface G0/1 as the NAT outside interface', why: 'The public side, carrying the one real address (203.0.113.2) that the whole LAN will share.' },
    { t: 'On R1: tie it together — translate sources matching list 1 to interface G0/1\'s address, with "overload"', why: '"overload" is the entire trick: rewrite the source port as well as the address, so many hosts can share one public IP at the same time.' },
    { t: 'Read the command back to yourself in plain English before moving on', why: '"Anything matching ACL 1 that goes out G0/1 gets that interface\'s address, tracked by port number." If you can say it, you can rebuild it from memory.' },
    { t: 'Verify the configuration with "show running-config"', why: 'Check all three pieces are present: the ACL, the two interface markings, and the overload statement. Any missing piece and nothing translates.' },
    { t: 'Compare with the previous lab: which NAT type lets outsiders start a connection inward?', why: 'Static NAT does (a permanent two-way mapping); PAT does not, because no translation entry exists until an inside host opens a connection. That difference is why servers use static NAT and users use PAT.' },
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
  intro: `<b>The situation:</b> any switch port with a cable in it will accept any device someone plugs in — a visitor's laptop, a rogue wireless access point, anything.<br><b>Your goal:</b> lock each desk port to the device that belongs there, using <b>port security</b>. You'll set up one port to learn and remember its PC automatically, and configure a second port to react more gently when an unknown device appears. The three possible reactions to a violation are a guaranteed exam question.`,
  tasks: [
    { t: 'On SW1: enter interface F0/1 and set it to access mode FIRST', why: 'Order matters: port security is rejected outright on a port still in dynamic mode. Try it in the wrong order once — that error message sticks with you.' },
    { t: 'On F0/1: turn port security on', why: 'Now the port will only accept frames from MAC addresses it considers legitimate.' },
    { t: 'On F0/1: set the maximum number of allowed MAC addresses to 1', why: 'One port, one device. (Real deployments often use 2-3 to allow an IP phone with a PC plugged in behind it.)' },
    { t: 'On F0/1: enable sticky MAC learning', why: 'The port learns whichever device is plugged in and writes that address into the running config — no need to type MAC addresses by hand.' },
    { t: 'On SW1: configure F0/2 the same way (access mode, port security, maximum 1) but set the violation mode to restrict', why: 'The gentler reaction: drop the offending frames, log and count each one, but leave the port up. The default (shutdown) disables the port entirely.' },
    { t: 'From PC1: ping PC2 (10.0.0.12) to create some traffic', why: 'Sticky learning needs a frame to learn from. No traffic, nothing learned.' },
    { t: 'On SW1: run "show running-config" and find the MAC address that was written into F0/1', why: 'That is sticky learning in action. Save the configuration and the binding survives a reboot.' },
    { t: 'On SW1: check the summary with "show port-security"', why: 'The audit view: maximum vs current addresses, violation counts, and the action configured per port.' },
    { t: 'On SW1: look at the detail with "show port-security interface f0/1"', why: 'Where you check a single port\'s state — including spotting "Secure-shutdown" on a port that was disabled by a violation.' },
    { t: 'Recall the three violation modes and what makes each different', why: 'shutdown = disable the port (default); restrict = drop, log and count; protect = drop silently with no log or counter. Protect is the trick answer precisely because it is invisible.' },
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
  intro: `<b>The situation:</b> R1 is already handing out IP addresses correctly. But if someone plugged their own address server into a desk port, PCs might believe it instead — and it could name itself as their gateway, quietly reading all their traffic.<br><b>Your goal:</b> teach the switch which port the <em>real</em> server lives behind, and to ignore address offers arriving from anywhere else. That's <b>DHCP snooping</b>: every port is untrusted until you say otherwise.`,
  tasks: [
    { t: 'Confirm the starting state: on PC1, run "ipconfig /renew" and check it gets an address from R1', why: 'R1 is already the legitimate DHCP server. Know that this works BEFORE you add security, so you can tell if you break it.' },
    { t: 'On SW1: turn on DHCP snooping globally', why: 'The master switch — but inert on its own. Nothing is actually inspected until you also name the VLANs, which is the next step.' },
    { t: 'On SW1: activate snooping for VLAN 1', why: 'Now filtering is live where the hosts are. The switch starts checking DHCP messages against port trust.' },
    { t: 'On SW1: enter interface G0/1 (the uplink toward R1) and mark it trusted', why: 'Server replies (Offer / Ack) are only accepted on trusted ports. This is the port the real server is behind, so it gets trusted.' },
    { t: 'Leave the access ports F0/1 and F0/2 untrusted — no command needed', why: 'Every port is untrusted by default. That is exactly what stops someone plugging a rogue DHCP server into a desk port and becoming everyone\'s gateway.' },
    { t: 'On PC1: run "ipconfig /renew" once more and confirm it still works', why: 'Hardening that breaks legitimate traffic is just an outage. Client requests are fine from untrusted ports — only server replies are restricted.' },
    { t: 'On SW1: verify with "show ip dhcp snooping"', why: 'Confirms three things: snooping enabled, the VLAN list, and which interfaces are trusted.' },
    { t: 'Consider what would happen if someone plugged a rogue DHCP server into F0/2', why: 'Its Offer messages would arrive on an untrusted port and be dropped on the spot. The lease records snooping keeps also feed Dynamic ARP Inspection, the next security feature in the course.' },
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
