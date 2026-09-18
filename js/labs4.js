/* NetDrill labs — Volume 2 COMPREHENSIVE tier. */
'use strict';
(function () {
const ND = window.ND;
const L = lab => ND.LABS.push(lab);

/* ============================================================= */
L({
  id: 'y1-acls', vol: 2, tier: 'deep', day: 'Days 33-34', title: 'Access Lists — Full Drill',
  topics: 'numbered & named · standard & extended · host/any/wildcards · ports · sequence numbers · in/out · vty access-class',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.2.10', mask: '255.255.255.0', gw: '10.0.2.1' } },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.3.100', mask: '255.255.255.0', gw: '10.0.3.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['PC2', 'e0', 'R1', 'g0/1'], ['SRV', 'e0', 'R1', 'g0/2']],
  layout: { PC1: [50, 18], PC2: [50, 100], R1: [200, 58], SRV: [350, 58] },
  setupAll: topo => {
    const set = (id, ifn, ip) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask: '255.255.255.0' }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.1.1'); set('R1', 'g0/1', '10.0.2.1'); set('R1', 'g0/2', '10.0.3.1');
    topo.devs.R1.hostname = 'R1';
  },
  intro: `<b>The situation:</b> one router joining three networks — two user LANs and a server LAN. Everything can reach everything, which is exactly the problem.<br><b>Your goal:</b> every kind of access list in one sitting. Numbered and named, standard and extended, the <code>host</code> and <code>any</code> shortcuts, wildcard masks, port matching, sequence numbers for editing, both directions of application, and the special case of protecting the router's own remote-access lines.`,
  tasks: [
    { t: 'Confirm the "before" state: PC1 and PC2 can both reach the server', why: 'Never apply a filter without knowing what worked beforehand — otherwise you cannot tell your rule from an unrelated fault.' },
    { t: 'Build numbered standard ACL 10: permit PC1\'s network, deny PC2\'s network', why: 'Numbers 1-99 mean a standard list, which matches the SOURCE address only. Order is everything: the router stops at the first match.' },
    { t: 'Apply ACL 10 outbound on the server-facing interface', why: 'Standard lists go close to the DESTINATION. Applied near the source they would block that host from reaching everything, not just the server.' },
    { t: 'Verify with show access-lists and show ip interface, then retest both PCs', why: 'Two different checks: the list contents, and whether it is actually attached to an interface. An unapplied ACL does nothing at all.' },
    { t: 'Create a named standard list called MGMT permitting only PC1\'s network', why: 'Named lists are self-documenting and, unlike numbered ones, let you delete an individual line later.' },
    { t: 'Apply MGMT to the vty lines with access-class, so only that network may connect remotely', why: 'access-class protects the router itself rather than traffic passing through it — a different command from ip access-group, and a favourite exam distinction.' },
    { t: 'Build a named extended list FILTER with explicit sequence numbers 10, 20 and 30', why: 'Extended lists match protocol, source, destination and port. Sequence numbers let you insert a rule between existing ones instead of rebuilding the list.' },
    { t: 'In FILTER: permit web traffic to the server, deny ping to the server, permit everything else', why: 'The classic shape of a real policy: specific allows, specific denies, then a catch-all. The catch-all must be last or nothing below it is ever reached.' },
    { t: 'Apply FILTER inbound on the interface where PC1\'s traffic arrives', why: 'Extended lists go close to the SOURCE — identify the traffic precisely and drop it at the first router, rather than carrying it across the network to die.' },
    { t: 'Test the result: PC1\'s ping to the server now fails, but web traffic to it would still pass', why: 'Same two hosts, different outcome per protocol — the precision that standard lists cannot achieve.' },
    { t: 'Practise removal: delete numbered ACL 10 entirely, then rebuild and reapply it', why: 'Removing a numbered ACL deletes every line at once; there is no way to remove just one. That limitation is the main reason to prefer named lists.' },
  ],
  steps: [
    { d: 'PC1', t: 'Baseline from the first PC.', c: ['ping 10.0.3.100'] },
    { d: 'PC2', t: 'Baseline from the second PC — both should succeed.', c: ['ping 10.0.3.100'] },
    { d: 'R1', t: 'Build the numbered standard list. Permit first, deny second.', c: ['enable', 'configure terminal', 'access-list 10 permit 10.0.1.0 0.0.0.255', 'access-list 10 deny 10.0.2.0 0.0.0.255'], note: 'Wildcard 0.0.0.255 matches any host in that /24. Reverse these two lines and PC1 would be caught by the deny before reaching its permit.' },
    { d: 'R1', t: 'Attach it outbound on the interface nearest the server.', c: ['interface g0/2', 'ip access-group 10 out', 'end'] },
    { d: 'R1', t: 'Verify the list and the attachment separately.', c: ['show access-lists', 'show ip interface g0/2'], note: 'A list that exists but is not applied filters nothing — check both.' },
    { d: 'PC1', t: 'PC1 should still get through.', c: ['ping 10.0.3.100'] },
    { d: 'PC2', t: 'PC2 should now be refused.', c: ['ping 10.0.3.100'], note: 'A blocked packet gives a "Destination net unreachable" style reply rather than a timeout — the router is actively rejecting it.' },
    { d: 'R1', t: 'Create a named standard list for management access.', c: ['configure terminal', 'ip access-list standard MGMT', 'permit 10.0.1.0 0.0.0.255', 'exit'], note: 'Inside a named list you type just <code>permit</code> / <code>deny</code> — the list name is already established.' },
    { d: 'R1', t: 'Guard the router\'s own remote-access lines with it.', c: ['line vty 0 4', 'access-class MGMT in', 'exit'], note: '<code>access-class</code> filters connections TO the router. <code>ip access-group</code> filters traffic THROUGH it. Different commands, different jobs.' },
    { d: 'R1', t: 'Build the extended list with explicit sequence numbers.', c: ['ip access-list extended FILTER', '10 permit tcp 10.0.1.0 0.0.0.255 host 10.0.3.100 eq 80', '20 deny icmp any host 10.0.3.100', '30 permit ip any any', 'exit'], note: '<code>host 10.0.3.100</code> is shorthand for "10.0.3.100 0.0.0.0"; <code>any</code> means "0.0.0.0 255.255.255.255". Sequence numbers let you slot a line 15 in between later.' },
    { d: 'R1', t: 'Apply it inbound where PC1\'s traffic enters the router.', c: ['interface g0/0', 'ip access-group FILTER in', 'end', 'show access-lists'], note: 'Trace a packet through the three lines in your head: which one does a web request hit? Which one catches a ping?' },
    { d: 'PC1', t: 'Ping is now denied, though web traffic to the same server would pass.', c: ['ping 10.0.3.100'] },
    { d: 'R1', t: 'Remove the numbered ACL completely, then rebuild and reattach it.', c: ['configure terminal', 'no access-list 10', 'access-list 10 permit 10.0.1.0 0.0.0.255', 'access-list 10 deny 10.0.2.0 0.0.0.255', 'end', 'show access-lists'], note: 'There is no way to delete a single line from a numbered list — "no access-list 10" takes the whole thing. Named lists do not have this limitation.' },
  ],
  verify: ['show access-lists', 'show ip interface g0/0', 'show ip interface g0/2', 'show running-config'],
  explain: `<h3>Standard vs extended, and where each belongs</h3>
<p><b>Standard</b> (1-99, or named) matches the source address only. Because it cannot see the destination, filtering near the source would block that host from reaching <em>everything</em> — so standard lists go <b>close to the destination</b>. <b>Extended</b> (100-199, or named) matches protocol, source, destination and port, so it can be placed <b>close to the source</b> and drop unwanted traffic before it consumes any bandwidth.</p>
<h3>How a packet is evaluated</h3>
<p>Top to bottom, first match wins, and there is an invisible <code>deny any</code> at the bottom of every list. That implicit deny is why a list containing only deny statements blocks everything, and why a catch-all <code>permit ip any any</code> must be the last line rather than the first.</p>
<h3>Wildcard masks</h3>
<p>A wildcard is an inverted subnet mask: 0 means "must match", 1 means "don't care". /24 → 0.0.0.255, /30 → 0.0.0.3, a single host → 0.0.0.0 (or just write <code>host</code>), everything → 255.255.255.255 (or write <code>any</code>).</p>
<h3>Two ways to attach a list</h3>
<p><code>ip access-group [list] [in|out]</code> on an interface filters traffic <em>passing through</em> the router. <code>access-class [list] in</code> on the vty lines filters connections <em>to</em> the router itself. Mixing them up is a common exam trap.</p>
<h3>Numbered vs named</h3>
<p>Named lists can be edited: sequence numbers let you insert or delete a single line. A numbered list is all-or-nothing — <code>no access-list 10</code> removes every entry. Prefer named lists in real work.</p>`,
  checks: [
    { desc: 'Numbered standard ACL 10 has a permit and a deny, in that order', fn: H => { const a = H.d('R1').acls[10]; return !!(a && a.type === 'standard' && a.entries[0]?.action === 'permit' && a.entries[1]?.action === 'deny'); } },
    { desc: 'ACL 10 applied outbound on G0/2', fn: H => H.i('R1', 'g0/2').aclOut === '10' },
    { desc: 'Named standard list MGMT exists', fn: H => H.d('R1').acls['MGMT']?.type === 'standard' },
    { desc: 'MGMT applied to the vty lines with access-class', fn: H => H.d('R1').lines.vty.accessClass === 'MGMT' },
    { desc: 'Named extended list FILTER has three sequenced entries', fn: H => { const a = H.d('R1').acls['FILTER']; return !!(a && a.type === 'extended' && a.entries.length === 3 && a.entries[0].seq === 10 && a.entries[2].seq === 30); } },
    { desc: 'FILTER permits TCP/80 to the server and denies ICMP to it', fn: H => { const e = H.d('R1').acls['FILTER']?.entries; return e && e[0].proto === 'tcp' && e[0].dstPort === 80 && e[1].action === 'deny' && e[1].proto === 'icmp'; } },
    { desc: 'FILTER applied inbound on G0/0', fn: H => H.i('R1', 'g0/0').aclIn === 'FILTER' },
    { desc: 'PC1 may still reach the server on TCP/80', fn: H => H.tcp('PC1', '10.0.3.100', 80) },
    { desc: 'PC1 ping to the server is blocked by FILTER', fn: H => H.pingBlocked('PC1', '10.0.3.100') },
    { desc: 'PC2 is blocked from the server by ACL 10', fn: H => H.pingBlocked('PC2', '10.0.3.100') },
  ],
});

/* ============================================================= */
L({
  id: 'y2-nat', vol: 2, tier: 'deep', day: 'Days 43-44', title: 'NAT & PAT — Full Drill',
  topics: 'inside/outside domains · static NAT · dynamic PAT with an ACL classifier · translation table · removal',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'ISP', type: 'router', ifaces: ['g0/0'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.100', mask: '255.255.255.0', gw: '192.168.1.1' } },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.10', mask: '255.255.255.0', gw: '192.168.1.1' } },
  ],
  links: [['SRV', 'e0', 'SW1', 'f0/1'], ['PC1', 'e0', 'SW1', 'f0/2'], ['SW1', 'g0/1', 'R1', 'g0/0'], ['R1', 'g0/1', 'ISP', 'g0/0']],
  layout: { SRV: [40, 18], PC1: [40, 100], SW1: [140, 58], R1: [250, 58], ISP: [355, 58] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '192.168.1.1', '255.255.255.0'); set('R1', 'g0/1', '203.0.113.2', '255.255.255.252');
    set('ISP', 'g0/0', '203.0.113.1', '255.255.255.252');
    topo.devs.R1.hostname = 'R1'; topo.devs.ISP.hostname = 'ISP'; topo.devs.SW1.hostname = 'SW1';
    topo.devs.R1.staticRoutes.push({ net: '0.0.0.0', mask: '0.0.0.0', via: '203.0.113.1', ad: 1 });
  },
  intro: `<b>The situation:</b> an office on private addresses (192.168.1.0/24) behind a router with exactly one public address from the ISP. Private addresses cannot be routed on the internet, so nothing inside can reach the outside world — and the company's server, which is supposed to be publicly reachable, has no public identity at all.<br><b>Your goal:</b> solve both problems. A permanent one-to-one mapping gives the server a fixed public face, and port-based overloading lets every other device share the router's single address.`,
  tasks: [
    { t: 'Mark G0/0 as the NAT inside interface and G0/1 as the NAT outside interface', why: 'NAT only acts on traffic crossing between the two domains. Without both markings, no rule you write will do anything at all.' },
    { t: 'Create a static one-to-one mapping from the server 192.168.1.100 to the public address 203.0.113.100', why: 'Static NAT is bidirectional and permanent, so outsiders can initiate connections inward — which is exactly what a public server needs.' },
    { t: 'Check the translation table and note that the static entry is there before any traffic flows', why: 'Static entries exist permanently; dynamic ones appear only while a conversation is active. Spotting that difference in show output is exam material.' },
    { t: 'Name the four NAT addresses for this mapping', why: 'Inside local = the private address as the LAN sees it; inside global = the public address the internet sees. "Local is the inside view, global is the outside view" is the phrase to remember.' },
    { t: 'Create ACL 1 permitting the whole 192.168.1.0/24 network', why: 'Here the ACL is not a filter — it is a classifier answering "which sources may be translated?" ACLs get reused this way throughout IOS.' },
    { t: 'Configure PAT: translate sources matching ACL 1 to the outside interface address, with overload', why: 'The overload keyword rewrites the source port as well as the address, so thousands of devices can share one public IP. This is what your home router does.' },
    { t: 'Remove the static mapping with its "no" form, confirm it is gone, then put it back', why: 'Being able to undo a NAT statement cleanly matters — a wrong mapping can black-hole a production server.' },
    { t: 'Review the whole configuration and identify which lines belong to static NAT and which to PAT', why: 'The two mechanisms coexist on one router. Reading a config and telling them apart is the real-world skill.' },
  ],
  steps: [
    { d: 'R1', t: 'Mark the private side as the NAT inside domain.', c: ['enable', 'configure terminal', 'interface g0/0', 'ip nat inside'] },
    { d: 'R1', t: 'Mark the ISP-facing side as the outside domain.', c: ['interface g0/1', 'ip nat outside', 'exit'], note: 'These two lines are the foundation. Every NAT rule below depends on them.' },
    { d: 'R1', t: 'Give the server a permanent public identity.', c: ['ip nat inside source static 192.168.1.100 203.0.113.100', 'end', 'show ip nat translations'], note: 'The order is inside-local first (the real private address), then inside-global (its public face). Swapping them is a classic slip.' },
    { d: 'R1', t: 'Classify which inside hosts are allowed to be translated.', c: ['configure terminal', 'access-list 1 permit 192.168.1.0 0.0.0.255'], note: 'No traffic is blocked by this list. It is a selector, not a filter.' },
    { d: 'R1', t: 'Turn on port-based overloading for everyone else.', c: ['ip nat inside source list 1 interface g0/1 overload', 'end', 'show ip nat translations'], note: 'Read it in English: "translate sources matching list 1 to G0/1\'s address, tracked by port number".' },
    { d: 'R1', t: 'Practise removing and restoring the static mapping.', c: ['configure terminal', 'no ip nat inside source static 192.168.1.100 203.0.113.100', 'do show ip nat translations', 'ip nat inside source static 192.168.1.100 203.0.113.100', 'end', 'show ip nat translations'], note: 'The entry vanishes and reappears. On a live network that removal would instantly cut every inbound session to the server.' },
    { d: 'R1', t: 'Read the finished configuration and separate the two mechanisms.', c: ['show running-config'], note: 'Static NAT is one line. PAT is three: the ACL, the two interface markings, and the overload statement.' },
    { d: 'PC1', t: 'Confirm the inside network still works normally.', c: ['ping 192.168.1.1'], note: 'NAT happens on the way out. Inside-to-inside traffic is untouched.' },
  ],
  verify: ['show ip nat translations', 'show running-config', 'show ip interface brief'],
  explain: `<h3>The four address names</h3>
<p><b>Inside local</b> — the private address, as the inside network sees it (192.168.1.100). <b>Inside global</b> — the public address the outside world sees for that same host (203.0.113.100). <b>Outside local</b> and <b>outside global</b> describe the remote host, usually identical. The memory hook: <em>local = as seen from inside, global = as seen from outside</em>.</p>
<h3>Three flavours of NAT</h3>
<p><b>Static</b> — one private address permanently mapped to one public address, in both directions. Used for servers, because outsiders can initiate connections inward. <b>Dynamic</b> — a pool of public addresses handed out first-come-first-served; when the pool is empty, new hosts fail. <b>PAT / overload</b> — many private addresses share one public address, distinguished by source port. Only PAT scales, which is why it runs on essentially every home and office router.</p>
<h3>Why PAT cannot host a server</h3>
<p>A PAT translation exists only while an inside host has a conversation open. Nothing outside can start a connection inward because there is no entry to match — which is a security benefit and a hosting problem. Port forwarding (static NAT with a port number) is the workaround.</p>
<h3>RFC 1918</h3>
<p>The private ranges are 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. Internet routers drop them, which is the entire reason NAT exists — and a large part of why IPv4 survived long enough for IPv6 to arrive.</p>`,
  checks: [
    { desc: 'G0/0 is the NAT inside interface', fn: H => H.i('R1', 'g0/0').natInside },
    { desc: 'G0/1 is the NAT outside interface', fn: H => H.i('R1', 'g0/1').natOutside },
    { desc: 'Static mapping 192.168.1.100 → 203.0.113.100 is in place', fn: H => H.d('R1').nat.statics.some(s => s.local === '192.168.1.100' && s.global === '203.0.113.100') },
    { desc: 'ACL 1 classifies the inside network', fn: H => !!H.d('R1').acls[1]?.entries.some(e => e.action === 'permit') },
    { desc: 'PAT configured with overload out of G0/1 using list 1', fn: H => { const d = H.d('R1').nat.dynamic; return !!(d && d.acl === '1' && d.overload && d.iface === 'GigabitEthernet0/1'); } },
    { desc: 'Exactly one static mapping remains after the remove/restore cycle', fn: H => H.d('R1').nat.statics.length === 1 },
    { desc: 'Inside hosts still reach their gateway', fn: H => H.ping('PC1', '192.168.1.1') },
  ],
});

/* ============================================================= */
L({
  id: 'y3-dhcp', vol: 2, tier: 'deep', day: 'Days 38, 48', title: 'DHCP Server, Relay & Snooping — Full Drill',
  topics: 'excluded addresses · pool options · relay with helper-address · bindings · snooping trust',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['SW1', 'g0/1', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/1'], ['R2', 'g0/0', 'PC2', 'e0']],
  layout: { PC1: [35, 100], SW1: [120, 58], R1: [210, 58], R2: [300, 58], PC2: [370, 100] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.1.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.12.1', '255.255.255.252');
    set('R2', 'g0/0', '10.0.2.1', '255.255.255.0'); set('R2', 'g0/1', '10.0.12.2', '255.255.255.252');
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.SW1.hostname = 'SW1';
    topo.devs.R1.staticRoutes.push({ net: '10.0.2.0', mask: '255.255.255.0', via: '10.0.12.2', ad: 1 });
    topo.devs.R2.staticRoutes.push({ net: '10.0.1.0', mask: '255.255.255.0', via: '10.0.12.1', ad: 1 });
  },
  intro: `<b>The situation:</b> two PCs set to obtain addresses automatically, and nobody handing any out. Routing between the two sites already works, so this drill is purely about DHCP.<br><b>Your goal:</b> make R1 the address server for <em>both</em> sites. The local PC is straightforward. The remote one is the interesting case — its request is a broadcast and routers do not forward broadcasts — and then you secure the whole thing so a rogue server on a desk port cannot hijack it.`,
  tasks: [
    { t: 'Confirm both PCs currently have no address', why: 'The starting point. Both are set to DHCP and nobody is answering.' },
    { t: 'On R1, exclude the single address 10.0.1.1 and then the whole range 10.0.1.2 to 10.0.1.9', why: 'Two forms of the same command. Exclusions protect the addresses you assigned by hand, and on real gear you do them BEFORE creating the pool or a client may lease .1 while you type.' },
    { t: 'Exclude 10.0.2.1 through 10.0.2.9 for the remote site too', why: 'R1 will serve that subnet as well, so its gateway address needs the same protection.' },
    { t: 'Create pool LAN1 with a network, default router, DNS server, domain name and a 7-day lease', why: 'A lease carries far more than an address. Gateway and DNS ride along in the same offer, which is why a DHCP client comes up fully working.' },
    { t: 'Create pool LAN2 for the remote subnet with the same option set', why: 'R1 is not even attached to 10.0.2.0/24. It will pick this pool by looking at which subnet the relayed request arrived from.' },
    { t: 'Renew PC1 and confirm it receives an address, gateway and DNS server', why: 'The local case works immediately because PC1 shares a broadcast domain with the server.' },
    { t: 'Try renewing PC2 and watch it fail', why: 'Feel the failure before fixing it. Routers drop broadcasts, so PC2\'s request never reaches R1 — the exact problem relay exists to solve.' },
    { t: 'On R2, add a helper address pointing at R1 on the interface facing PC2', why: 'The relay rewrites the broadcast as a unicast to the real server and stamps it with its own interface address, which is how R1 knows which pool to use.' },
    { t: 'Renew PC2 again and confirm it now gets an address from the remote pool', why: 'Proof the relay works. Note the address comes from 10.0.2.x even though the server sits on 10.0.1.x.' },
    { t: 'Check the server\'s view with show ip dhcp binding, and each client with ipconfig /all', why: 'Two ends of the same lease: the server\'s record of who holds what, and the client\'s view including its MAC and DHCP status.' },
    { t: 'On SW1, enable DHCP snooping, scope it to VLAN 1, and trust only the uplink toward R1', why: 'Every port starts untrusted. Server messages arriving from a desk port are dropped, which kills rogue DHCP servers and the man-in-the-middle attack they enable.' },
    { t: 'Renew PC1 one final time to prove the security did not break the legitimate flow', why: 'Hardening that breaks real traffic is just an outage. Client requests are still fine from untrusted ports — only server replies are restricted.' },
  ],
  steps: [
    { d: 'PC1', t: 'Check the starting state.', c: ['ipconfig'] },
    { d: 'R1', t: 'Protect the addresses you assigned by hand — a single one, then a range.', c: ['enable', 'configure terminal', 'ip dhcp excluded-address 10.0.1.1', 'ip dhcp excluded-address 10.0.1.2 10.0.1.9'], note: 'One address or two addresses defining a range. Both forms are worth knowing.' },
    { d: 'R1', t: 'Do the same for the remote subnet.', c: ['ip dhcp excluded-address 10.0.2.1 10.0.2.9'] },
    { d: 'R1', t: 'Build the local pool with the full option set.', c: ['ip dhcp pool LAN1', 'network 10.0.1.0 255.255.255.0', 'default-router 10.0.1.1', 'dns-server 8.8.8.8', 'domain-name netdrill.lab', 'lease 7', 'exit'], note: '<code>lease 7</code> is seven days. The longer form is <code>lease days hours minutes</code>; <code>lease infinite</code> never expires.' },
    { d: 'R1', t: 'Build the pool for the subnet R1 cannot even see.', c: ['ip dhcp pool LAN2', 'network 10.0.2.0 255.255.255.0', 'default-router 10.0.2.1', 'dns-server 8.8.8.8', 'domain-name netdrill.lab', 'lease 7', 'end'] },
    { d: 'PC1', t: 'The local PC should lease immediately.', c: ['ipconfig /renew', 'ipconfig /all'], note: 'Look at the gateway and DNS server — they came from the pool options, not from the PC.' },
    { d: 'PC2', t: 'The remote PC fails, because its broadcast dies at R2.', c: ['ipconfig /renew'], note: 'This is the whole point of the lab. A router will not forward a broadcast, so the request never leaves the local segment.' },
    { d: 'R2', t: 'Relay the broadcast to the real server.', c: ['enable', 'configure terminal', 'interface g0/0', 'ip helper-address 10.0.12.1', 'end'], note: 'The helper goes on the interface that HEARS the clients, not the one facing the server. Getting that backwards is the classic mistake.' },
    { d: 'PC2', t: 'Try again — this time it works.', c: ['ipconfig /renew', 'ipconfig /all'], note: 'The address comes from 10.0.2.x. R1 chose that pool because R2 stamped the relayed request with its own 10.0.2.1 interface.' },
    { d: 'R1', t: 'Look at the server\'s record of both leases.', c: ['show ip dhcp binding'], note: 'Two bindings from two different subnets, served by one router.' },
    { d: 'SW1', t: 'Turn on DHCP snooping and scope it to the VLAN.', c: ['enable', 'configure terminal', 'ip dhcp snooping', 'ip dhcp snooping vlan 1'], note: 'Enabling globally does nothing on its own — the VLAN line is what makes it start inspecting.' },
    { d: 'SW1', t: 'Trust only the uplink toward the real server.', c: ['interface g0/1', 'ip dhcp snooping trust', 'end', 'show ip dhcp snooping'], note: 'F0/1 and F0/2 stay untrusted by default, so a rogue server plugged into a desk port would have its offers dropped.' },
    { d: 'PC1', t: 'Confirm legitimate clients still work.', c: ['ipconfig /renew'], note: 'Client messages are permitted from untrusted ports; only server replies are restricted.' },
  ],
  verify: ['show ip dhcp binding', 'show ip dhcp snooping', 'show running-config'],
  explain: `<h3>DORA</h3>
<p>Four messages: <b>Discover</b> (client broadcasts "is anyone there?"), <b>Offer</b> (server proposes an address), <b>Request</b> (client formally asks for it), <b>Acknowledge</b> (server confirms and starts the lease). Discover and Request are broadcasts, which is precisely why a router in the path breaks the process.</p>
<h3>Relay, and the giaddr field</h3>
<p><code>ip helper-address</code> turns the broadcast into a unicast aimed at the server and fills in the <b>gateway IP address (giaddr)</b> field with the receiving interface's own address. The server reads giaddr to decide which pool the client belongs to — which is how one router can serve subnets it is not attached to. The command belongs on the interface facing the clients.</p>
<h3>Pool options</h3>
<p><code>network</code> defines which subnet the pool serves. <code>default-router</code> and <code>dns-server</code> are the options clients actually need to function. <code>domain-name</code> completes unqualified hostnames. <code>lease</code> sets duration — short leases suit guest networks with high turnover, long ones suit stable offices.</p>
<h3>Snooping: trusted and untrusted</h3>
<p>Snooping classifies DHCP messages by type. Client messages (Discover, Request) are fine anywhere. Server messages (Offer, Ack, Nak) are only accepted on <b>trusted</b> ports. Every port is untrusted until you say otherwise, so you trust the uplink toward the legitimate server and nothing else. The switch also builds a binding table of MAC ↔ IP ↔ port ↔ VLAN, which Dynamic ARP Inspection later uses to stop ARP spoofing.</p>`,
  checks: [
    { desc: 'Single-address and range exclusions configured for 10.0.1.x', fn: H => { const ex = H.d('R1').dhcp.excluded; return ex.some(e => e[0] === '10.0.1.1') && ex.some(e => e[0] === '10.0.1.2' && e[1] === '10.0.1.9'); } },
    { desc: 'Exclusions configured for the remote subnet too', fn: H => H.d('R1').dhcp.excluded.some(e => e[0] === '10.0.2.1') },
    { desc: 'Pool LAN1 has network, router, DNS, domain and lease', fn: H => { const p = Object.values(H.d('R1').dhcp.pools).find(x => x.network === '10.0.1.0'); return !!(p && p.router === '10.0.1.1' && p.dns && p.domain && p.lease); } },
    { desc: 'Pool LAN2 has the same full option set', fn: H => { const p = Object.values(H.d('R1').dhcp.pools).find(x => x.network === '10.0.2.0'); return !!(p && p.router === '10.0.2.1' && p.dns && p.domain && p.lease); } },
    { desc: 'R2 relays DHCP to R1 from the client-facing interface', fn: H => H.i('R2', 'g0/0').helpers.includes('10.0.12.1') },
    { desc: 'PC1 leased an address from the local pool', fn: H => { const n = ND.pcNet(H.topo, H.d('PC1')); return !!(n.ip && n.ip.startsWith('10.0.1.') && n.gw === '10.0.1.1'); } },
    { desc: 'PC2 leased an address through the relay', fn: H => { const n = ND.pcNet(H.topo, H.d('PC2')); return !!(n.ip && n.ip.startsWith('10.0.2.') && n.gw === '10.0.2.1'); } },
    { desc: 'Leases avoided the excluded addresses', fn: H => { const a = ND.pcNet(H.topo, H.d('PC1')).ip, b = ND.pcNet(H.topo, H.d('PC2')).ip; const host = ip => +ip.split('.')[3]; return host(a) >= 10 && host(b) >= 10; } },
    { desc: 'DHCP snooping enabled on SW1 and scoped to VLAN 1', fn: H => H.d('SW1').dhcp.snooping.enabled && H.d('SW1').dhcp.snooping.vlans.includes(1) },
    { desc: 'Only the uplink G0/1 is trusted', fn: H => H.i('SW1', 'g0/1').snoopTrust && !H.i('SW1', 'f0/1').snoopTrust && !H.i('SW1', 'f0/2').snoopTrust },
  ],
});

/* ============================================================= */
L({
  id: 'y4-switch-security', vol: 2, tier: 'deep', day: 'Days 41, 47', title: 'SSH & Port Security — Full Drill',
  topics: 'the five SSH prerequisites · vty hardening with access-class · port security max/sticky/static · all three violation modes',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'f0/5', 'f0/6', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.10', mask: '255.255.255.0', gw: '192.168.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.11', mask: '255.255.255.0', gw: '192.168.1.1' } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2']],
  layout: { PC1: [60, 18], PC2: [60, 100], SW1: [250, 58] },
  intro: `<b>The situation:</b> a switch that can only be configured from a console cable, with every port live and willing to accept any device someone plugs in.<br><b>Your goal:</b> lock it down completely. Build the full SSH stack so it can be managed remotely and securely, restrict who may even attempt to connect, then pin each desk port to the device that belongs there — drilling all three violation reactions and both ways of specifying a permitted MAC address.`,
  tasks: [
    { t: 'Name the switch and give it a management address on the VLAN 1 SVI plus a default gateway', why: 'A layer-2 switch has no routed ports, so its IP lives on a virtual VLAN interface. Without an address there is nothing to SSH to.' },
    { t: 'Set a domain name, then generate 2048-bit RSA keys', why: 'The key is named hostname.domain, so both must be set first — try it the other way round and IOS refuses. These keys are what SSH encrypts with.' },
    { t: 'Force SSH version 2 only', why: 'Version 1 has known weaknesses. This command only succeeds once keys of at least 768 bits exist, which is why the order of these steps matters.' },
    { t: 'Create a local user account with a hashed secret', why: 'SSH authenticates a user, not just a line. Each administrator gets their own account rather than sharing one line password.' },
    { t: 'Set the vty lines to authenticate locally and accept SSH only', why: '"login local" points the lines at your user database; "transport input ssh" slams the door on telnet, which sends passwords in clear text.' },
    { t: 'Build a management ACL and apply it to the vty lines with access-class', why: 'Now only one network may even attempt to connect. Defence in depth: encryption plus authentication plus source restriction.' },
    { t: 'Verify the SSH configuration with show ip ssh', why: 'Confirms the service is enabled and running version 2 — the single check that tells you all five prerequisites were met.' },
    { t: 'On F0/1: make it a static access port, enable port security, allow 2 MACs, and learn them sticky', why: 'Order matters — port security is rejected on a dynamic-mode port. A maximum of 2 suits a desk phone with a PC behind it.' },
    { t: 'On F0/2: port security with violation mode restrict', why: 'Restrict drops offending frames and logs and counts each one, but leaves the port up. The default, shutdown, disables the port entirely.' },
    { t: 'On F0/3: port security with violation mode protect and one manually specified MAC address', why: 'Protect drops silently — no log, no counter — which is why it is the trick answer in exam questions. A static MAC is the alternative to sticky learning.' },
    { t: 'Shut down the unused ports F0/4 to F0/6', why: 'Port security governs who may use a live port; disabling unused ports removes the opportunity entirely.' },
    { t: 'Generate traffic from PC1 so F0/1 sticky-learns its MAC, then find that address in the running configuration', why: 'Sticky learning writes the learned address into the config as if you had typed it. Save the config and the binding survives a reboot.' },
    { t: 'Review everything with show port-security and show port-security interface f0/1', why: 'The summary shows every secured port at a glance; the per-interface view shows the detail, including whether a port is sitting in Secure-shutdown after a violation.' },
  ],
  steps: [
    { d: 'SW1', t: 'Name it and give it a management address.', c: ['enable', 'configure terminal', 'hostname SW1', 'interface vlan 1', 'ip address 192.168.1.2 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 192.168.1.1'], note: 'The gateway lets the switch reply to management traffic from other subnets. A layer-3 switch would use its routing table instead.' },
    { d: 'SW1', t: 'Domain name first, then the keys.', c: ['ip domain-name netdrill.lab', 'crypto key generate rsa modulus 2048'], note: 'Try <code>crypto key generate rsa</code> before setting the domain name and IOS refuses outright. The key ends up named SW1.netdrill.lab.' },
    { d: 'SW1', t: 'Require SSH version 2 and create an administrator account.', c: ['ip ssh version 2', 'username admin secret Str0ngPass'], note: '<code>secret</code> stores a hash; <code>password</code> would store it readable. Always secret.' },
    { d: 'SW1', t: 'Point the remote lines at the user database and ban telnet.', c: ['line vty 0 4', 'login local', 'transport input ssh', 'exec-timeout 5 0', 'exit'], note: 'Three separate hardening steps on one set of lines: who may log in, how they may connect, and how long an idle session survives.' },
    { d: 'SW1', t: 'Restrict which network may even try to connect.', c: ['ip access-list standard MGMT-ONLY', 'permit 192.168.1.0 0.0.0.255', 'exit', 'line vty 0 4', 'access-class MGMT-ONLY in', 'end', 'show ip ssh'], note: '<code>access-class</code> filters connections TO the device. It is not the same command as <code>ip access-group</code>, which filters traffic through it.' },
    { d: 'SW1', t: 'Secure the first desk port: two MACs, learned automatically.', c: ['configure terminal', 'interface f0/1', 'switchport mode access', 'switchport port-security', 'switchport port-security maximum 2', 'switchport port-security mac-address sticky'], note: 'The access-mode line must come first — port security is rejected on a port still in dynamic mode. Try the wrong order once to see the message.' },
    { d: 'SW1', t: 'Second port: same idea, but a gentler reaction to violations.', c: ['interface f0/2', 'switchport mode access', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security violation restrict'], note: 'Restrict keeps the port up while dropping and counting the offending frames. Shutdown (the default) would err-disable it.' },
    { d: 'SW1', t: 'Third port: silent dropping, and a hand-written MAC address.', c: ['interface f0/3', 'switchport mode access', 'switchport port-security', 'switchport port-security violation protect', 'switchport port-security mac-address aaaa.bbbb.cccc'], note: 'Protect drops with no log and no counter — invisible, which is exactly why it is the wrong answer in most exam scenarios. The static MAC form is the alternative to sticky.' },
    { d: 'SW1', t: 'Disable the ports nobody uses.', c: ['interface range f0/4 - 6', 'shutdown', 'end'] },
    { d: 'PC1', t: 'Generate traffic so the sticky learning has something to learn.', c: ['ping 192.168.1.11'], note: 'Sticky learning needs a frame. No traffic, nothing learned.' },
    { d: 'SW1', t: 'Find the learned address written into the configuration.', c: ['show running-config'], note: 'Look for a <code>switchport port-security mac-address sticky</code> line under F0/1 with an actual MAC on it — the switch wrote that itself.' },
    { d: 'SW1', t: 'Review the security posture.', c: ['show port-security', 'show port-security interface f0/1'], note: 'The summary lists max vs current addresses and the violation count per port; the detail view shows one port fully, including its Secure-up / Secure-shutdown status.' },
  ],
  verify: ['show ip ssh', 'show port-security', 'show port-security interface f0/1', 'show running-config'],
  explain: `<h3>The five SSH prerequisites</h3>
<p>SSH will not run until all of these exist: (1) a hostname that is not the default, (2) a domain name, (3) RSA keys of at least 768 bits for version 2, (4) a user database or AAA, and (5) vty lines set to <code>login local</code>. Miss any one and the exam question becomes "why can the administrator not connect?" The hostname and domain matter because the key pair is named after them.</p>
<h3>Protecting the device versus protecting traffic</h3>
<p><code>ip access-group</code> on an interface filters packets passing <em>through</em> the router or switch. <code>access-class</code> on the vty lines filters connections <em>to</em> it. Layered with SSH encryption and local authentication, that gives three independent barriers.</p>
<h3>Port security violation modes</h3>
<p><b>shutdown</b> (default) — err-disable the port, log, increment the counter once. Recovery is a manual <code>shutdown</code> then <code>no shutdown</code>, or errdisable auto-recovery. <b>restrict</b> — drop the offending frames, log and count every one, port stays up. <b>protect</b> — drop silently, no log, no counter. Protect is the one that hides problems, which is why questions single it out.</p>
<h3>Sticky versus static MAC addresses</h3>
<p><b>Sticky</b> learns whatever plugs in and writes it into the running configuration automatically — convenient, and it survives reboots once saved. <b>Static</b> means you type the permitted MAC yourself, which is tighter but does not scale. The default maximum is one address; a desk phone with a PC daisy-chained behind it needs two or three.</p>
<h3>Why this matters</h3>
<p>Port security defeats MAC flooding, where an attacker fills the switch's address table until it fails open and floods every frame like a hub, letting them capture traffic. It also stops the more mundane problem of someone plugging an unauthorised access point into a spare desk port.</p>`,
  checks: [
    { desc: 'SVI 192.168.1.2/24 is up with a default gateway', fn: H => H.hasIp('SW1', 'vlan1', '192.168.1.2') && H.noshut('SW1', 'vlan1') && H.d('SW1').defaultGateway === '192.168.1.1' },
    { desc: 'Hostname, domain name and 2048-bit RSA keys', fn: H => H.hostname('SW1', 'SW1') && !!H.d('SW1').domainName && H.d('SW1').rsaKey >= 2048 },
    { desc: 'SSH version 2 enforced and a local user exists', fn: H => H.d('SW1').sshVersion === 2 && !!H.d('SW1').users.admin },
    { desc: 'VTY: login local, SSH only, with an idle timeout', fn: H => { const v = H.d('SW1').lines.vty; return v.loginLocal && v.transport === 'ssh' && !!v.execTimeout; } },
    { desc: 'Management ACL applied to the vty lines with access-class', fn: H => H.d('SW1').lines.vty.accessClass === 'MGMT-ONLY' && !!H.d('SW1').acls['MGMT-ONLY'] },
    { desc: 'F0/1: access port, port security, max 2, sticky', fn: H => { const i = H.i('SW1', 'f0/1'); return i.swMode === 'access' && i.portSec?.enabled && i.portSec.max === 2 && i.portSec.sticky; } },
    { desc: 'F0/2: violation mode restrict', fn: H => H.i('SW1', 'f0/2').portSec?.violation === 'restrict' },
    { desc: 'F0/3: violation mode protect with a static MAC address', fn: H => { const ps = H.i('SW1', 'f0/3').portSec; return ps?.violation === 'protect' && ps.macs.includes('aaaa.bbbb.cccc'); } },
    { desc: 'Unused ports F0/4-6 are shut down', fn: H => ['f0/4', 'f0/5', 'f0/6'].every(p => H.i('SW1', p).shutdown) },
    { desc: 'F0/1 has sticky-learned PC1\'s MAC address', fn: H => (H.i('SW1', 'f0/1').portSec?.stickyLearned || []).length > 0 },
  ],
});

/* ============================================================= */
L({
  id: 'y5-mgmt-services', vol: 2, tier: 'deep', day: 'Days 35-40', title: 'NTP, Syslog & Discovery — Full Drill',
  topics: 'NTP master/client & stratum · syslog severities · buffered vs console vs host · CDP global and per-interface · LLDP',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.100', mask: '255.255.255.0', gw: '10.0.0.1' } },
  ],
  links: [['SRV', 'e0', 'SW1', 'f0/1'], ['SW1', 'g0/1', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0']],
  layout: { SRV: [45, 100], SW1: [140, 58], R1: [250, 58], R2: [355, 58] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.0.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.12.1', '255.255.255.252');
    set('R2', 'g0/0', '10.0.12.2', '255.255.255.252');
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.SW1.hostname = 'SW1';
  },
  intro: `<b>The situation:</b> a small network where nothing agrees on the time, log messages exist only on the devices that produced them, and you have no diagram of what is connected to what.<br><b>Your goal:</b> the three services that make a network operable rather than merely functional — synchronised clocks so log timestamps can be correlated, centralised logging so evidence survives the device, and the discovery protocols that draw you a map. Then you switch the discovery off again, because it helps intruders just as much as it helps you.`,
  tasks: [
    { t: 'Check R2\'s clock synchronisation state before configuring anything', why: 'Stratum 16 means "I have no trustworthy time source". That is where every unconfigured device starts.' },
    { t: 'Make R1 an authoritative time source at stratum 3', why: 'Someone must be the reference. Stratum counts hops from a real clock — 1 is a GPS or atomic source — so R1 claiming 3 puts its clients at 4.' },
    { t: 'Point R2 at R1 for time and confirm it synchronises', why: 'A client-server relationship over UDP 123. Devices prefer the lowest-stratum source they can reach.' },
    { t: 'Inspect the result with show ntp status, show ntp associations and show clock', why: 'Status shows whether you are synchronised and to what; associations lists every configured source; a leading asterisk on the clock means the time is NOT authoritative.' },
    { t: 'On R1, send logs to the syslog server and cap the export at warnings and worse', why: 'Logs kept only on a device vanish with it. The severity filter stops routine chatter flooding the server.' },
    { t: 'Add a local logging buffer and turn OFF console logging', why: 'The buffer gives you recent history without a server round-trip. Disabling console logging stops messages interrupting you while you type — the alternative to logging synchronous.' },
    { t: 'Verify with show logging and note which destinations are active at which level', why: 'The output lists each destination separately — console, buffer, and host — each with its own level.' },
    { t: 'Generate a real log message by bouncing an interface, then read it back', why: 'Decoding %LINK-5-CHANGED — facility LINK, severity 5, mnemonic CHANGED — is a guaranteed exam skill.' },
    { t: 'Map the network with show cdp neighbors, then with show cdp neighbors detail', why: 'Summary gives you the topology; detail adds IP addresses and platform, which is precisely the information you would rather an attacker did not have.' },
    { t: 'Disable CDP on just the R1–R2 link, leaving it running elsewhere', why: 'The per-interface form ("no cdp enable") is how you silence an untrusted edge without losing visibility inside your own network.' },
    { t: 'Disable CDP globally on R2 with no cdp run', why: 'The device-wide off switch. Know both forms and the difference between them.' },
    { t: 'Enable LLDP on all three devices and confirm neighbours appear again', why: 'LLDP is the vendor-neutral equivalent, and unlike CDP it is off by default on Cisco gear — so every device needs the command.' },
  ],
  steps: [
    { d: 'R2', t: 'Look at the unsynchronised starting state.', c: ['enable', 'show ntp status'], note: 'Stratum 16 and "unsynchronized" — the default for any device with no time source.' },
    { d: 'R1', t: 'Become the network\'s authoritative clock.', c: ['enable', 'configure terminal', 'ntp master 3', 'end', 'show ntp status'], note: 'Stratum 3 is an arbitrary but sensible claim for a lab. In production you would point at a public pool or a GPS appliance instead.' },
    { d: 'R2', t: 'Synchronise to R1 and confirm.', c: ['configure terminal', 'ntp server 10.0.12.1', 'end', 'show ntp status', 'show ntp associations', 'show clock'], note: 'On real gear synchronisation takes a few minutes. A leading asterisk on the clock output means the time is not yet authoritative.' },
    { d: 'R1', t: 'Ship logs to the server and filter by severity.', c: ['configure terminal', 'logging host 10.0.0.100', 'logging trap warnings'], note: 'Severity runs 0 (emergency) to 7 (debugging). "warnings" means level 4 and everything more severe.' },
    { d: 'R1', t: 'Keep a local buffer, and stop messages interrupting the console.', c: ['logging buffered 16384', 'no logging console', 'end', 'show logging'], note: 'Read the output carefully: console, buffer and host each have their own level. Turning console logging off is the blunt alternative to <code>logging synchronous</code>.' },
    { d: 'R1', t: 'Generate a message and read it back.', c: ['configure terminal', 'interface g0/1', 'shutdown', 'no shutdown', 'end'], note: 'Decode the message: %LINK-5-CHANGED is facility LINK, severity 5 (notification), mnemonic CHANGED.' },
    { d: 'R1', t: 'Map the network with CDP.', c: ['show cdp', 'show cdp neighbors', 'show cdp neighbors detail'], note: 'Detail exposes IP addresses and platform strings. Useful to you, equally useful to an intruder.' },
    { d: 'R1', t: 'Silence CDP on the single link toward R2 only.', c: ['configure terminal', 'interface g0/1', 'no cdp enable', 'end', 'show cdp neighbors'], note: 'R2 disappears from the list while SW1 remains. This is the per-interface form.' },
    { d: 'R2', t: 'Turn CDP off device-wide instead.', c: ['configure terminal', 'no cdp run', 'end', 'show cdp'], note: '"no cdp run" is global; "no cdp enable" is per interface. The exam tests that you know which is which.' },
    { d: 'R1', t: 'Enable the vendor-neutral alternative.', c: ['configure terminal', 'lldp run', 'end'], note: 'LLDP is IEEE 802.1AB and is OFF by default on Cisco equipment — the reverse of CDP.' },
    { d: 'R2', t: 'LLDP on R2 as well.', c: ['configure terminal', 'lldp run', 'end'] },
    { d: 'SW1', t: 'On the switch, confirm CDP is on here, then add LLDP alongside it.', c: ['enable', 'configure terminal', 'cdp run', 'interface f0/1', 'cdp enable', 'exit', 'lldp run', 'end', 'show lldp neighbors'], note: 'A device only appears in LLDP output if it too is running LLDP — which is why all three needed the command.' },
    { d: 'R1', t: 'Confirm R2 is visible again over LLDP despite CDP being off.', c: ['show lldp neighbors'], note: 'Same physical topology, different protocol carrying the information.' },
  ],
  verify: ['show ntp status', 'show ntp associations', 'show logging', 'show cdp neighbors', 'show lldp neighbors'],
  explain: `<h3>NTP and stratum</h3>
<p>NTP forms a hierarchy. Stratum 1 devices own a reference clock (GPS, atomic); each hop away adds one; 16 means unsynchronised. Devices prefer the lowest stratum they can reach. <code>ntp master [stratum]</code> makes a router authoritative from its own calendar — fine in a lab or closed network. Correct time matters more than it sounds: log correlation across devices and certificate validation both depend on it.</p>
<h3>Syslog severity levels</h3>
<p>0 Emergency, 1 Alert, 2 Critical, 3 Error, 4 Warning, 5 Notification, 6 Informational, 7 Debugging. A mnemonic: <em>Every Awesome Cisco Engineer Will Need Ice cream Daily</em>. <code>logging trap warnings</code> means level 4 and everything numerically lower, because lower numbers are more severe.</p>
<p>Message format: <code>%FACILITY-SEVERITY-MNEMONIC: text</code>. So <code>%LINK-5-CHANGED</code> is the LINK facility, severity 5, event CHANGED. Destinations are independent: console (default on), the memory buffer, monitor sessions (needs <code>terminal monitor</code>), and syslog servers on UDP 514.</p>
<h3>CDP and LLDP</h3>
<p><b>CDP</b> is Cisco-proprietary, ON by default, advertising every 60 seconds with a 180-second holdtime. <b>LLDP</b> is IEEE 802.1AB, OFF by default on Cisco gear, every 30 seconds with a 120-second holdtime. Both can be disabled globally (<code>no cdp run</code>) or per interface (<code>no cdp enable</code>) — know which is which. LLDP additionally splits transmit and receive per interface.</p>
<p>Reading the output: <b>Local Intrfce</b> is your port, <b>Port ID</b> is the neighbour's. Getting that backwards is a classic mistake under exam pressure.</p>`,
  checks: [
    { desc: 'R1 is an NTP master at stratum 3', fn: H => H.d('R1').ntp.master === 3 },
    { desc: 'R2 uses R1 as its NTP server and is synchronised', fn: H => H.d('R2').ntp.servers.includes('10.0.12.1') && ND.showNtp(H.topo, H.d('R2')).startsWith('Clock is synchronized') },
    { desc: 'R1 sends logs to the syslog server at 10.0.0.100', fn: H => H.d('R1').logging.hosts.includes('10.0.0.100') },
    { desc: 'Syslog export capped at warnings', fn: H => H.d('R1').logging.trap === 'warnings' },
    { desc: 'Local buffer enabled and console logging disabled', fn: H => H.d('R1').logging.buffered === 16384 && !H.d('R1').logging.console },
    { desc: 'R1 G0/1 was bounced and left enabled', fn: H => H.noshut('R1', 'g0/1') },
    { desc: 'CDP disabled on the R1–R2 link only', fn: H => !H.i('R1', 'g0/1').cdpEnabled && H.i('R1', 'g0/0').cdpEnabled && H.d('R1').cdp },
    { desc: 'CDP disabled globally on R2', fn: H => !H.d('R2').cdp },
    { desc: 'R1 still sees SW1 over CDP, but not R2', fn: H => { const n = ND.cdpNeighbors(H.topo, H.d('R1')); return n.some(x => x.dev.id === 'SW1') && !n.some(x => x.dev.id === 'R2'); } },
    { desc: 'LLDP enabled on all three devices', fn: H => ['R1', 'R2', 'SW1'].every(d => H.d(d).lldp) },
    { desc: 'R1 sees R2 again over LLDP', fn: H => ND.lldpNeighbors(H.topo, H.d('R1')).some(n => n.dev.id === 'R2') },
  ],
});

/* ============================================================= */
L({
  id: 'y6-troubleshooting', vol: 2, tier: 'deep', day: 'Capstone', title: 'Troubleshooting Gauntlet',
  topics: 'five planted faults across layers 1-3 plus security · diagnose with show commands · repair and verify',
  devices: [
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.2.10', mask: '255.255.255.0', gw: '10.0.2.1' } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['SW1', 'g0/1', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0'], ['R2', 'g0/1', 'PC2', 'e0']],
  layout: { PC1: [35, 30], SW1: [120, 30], R1: [205, 30], R2: [290, 30], PC2: [370, 30] },
  setupAll: topo => {
    const dev = id => topo.devs[id];
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(dev(id), ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    dev('PC1').hostname = 'PC1'; dev('SW1').hostname = 'SW1'; dev('R1').hostname = 'R1'; dev('R2').hostname = 'R2';

    // --- the parts that are correct ---
    dev('SW1').vlans[10] = { name: 'USERS' };
    dev('SW1').vlans[99] = { name: 'PARKING' };
    const up = ND.getIface(dev('SW1'), 'g0/1');
    up.swMode = 'access'; up.accessVlan = 10;
    set('R1', 'g0/0', '10.0.1.1', '255.255.255.0');
    set('R1', 'g0/1', '10.0.12.1', '255.255.255.252');
    set('R2', 'g0/1', '10.0.2.1', '255.255.255.0');
    dev('R1').staticRoutes.push({ net: '10.0.2.0', mask: '255.255.255.0', via: '10.0.12.2', ad: 1 });

    // --- FAULT 1: the PC's access port was parked in the wrong VLAN ---
    const pcPort = ND.getIface(dev('SW1'), 'f0/1');
    pcPort.swMode = 'access'; pcPort.accessVlan = 99;

    // --- FAULT 2: R1's WAN interface was left administratively down ---
    ND.getIface(dev('R1'), 'g0/1').shutdown = true;

    // --- FAULT 3: R2's WAN address is outside the /30 it shares with R1 ---
    set('R2', 'g0/0', '10.0.12.5', '255.255.255.252');

    // --- FAULT 4: R2 has no route back to the 10.0.1.0/24 LAN ---
    //     (nothing to plant — the route is simply absent)

    // --- FAULT 5: a leftover ACL on R1 drops all ping traffic ---
    const anyAddr = { any: true, txt: 'any' };
    dev('R1').acls['BLOCKALL'] = {
      type: 'extended', numbered: false, entries: [
        { action: 'deny', proto: 'icmp', src: anyAddr, dst: anyAddr, portOp: null, dstPort: null, raw: 'deny icmp any any', seq: 10 },
        { action: 'permit', proto: 'ip', src: anyAddr, dst: anyAddr, portOp: null, dstPort: null, raw: 'permit ip any any', seq: 20 },
      ],
    };
    ND.getIface(dev('R1'), 'g0/0').aclIn = 'BLOCKALL';
  },
  intro: `<b>The situation:</b> a network that used to work. Somebody has been in here making changes and now PC1 cannot reach PC2 at all. Nothing is documented, and nobody is admitting to anything.<br><b>Your goal:</b> find and repair <b>five separate faults</b> using nothing but show commands and reasoning. They span every layer you have studied — a VLAN mistake, a disabled interface, a wrong address, a missing route, and a forgotten access list. Work methodically from the bottom up and each one gives itself away.`,
  tasks: [
    { t: 'Confirm the symptom: from PC1, ping PC2 at 10.0.2.10 and watch it fail', why: 'Always reproduce the fault before changing anything, so you can tell later whether your fix is what actually helped.' },
    { t: 'Narrow it down by pinging PC1\'s own gateway 10.0.1.1 — it fails too, so start at the near end', why: 'Divide and conquer. If the nearest hop is unreachable, there is no point examining the far end of the network yet.' },
    { t: 'FAULT 1 — On SW1, compare the VLAN of the PC port with the VLAN of the uplink, and fix the mismatch', why: 'Two access ports in different VLANs cannot talk, however correct the IP addressing is. show vlan brief makes this obvious in one screen.' },
    { t: 'Re-test to the gateway; it should now work. Then ping onward to 10.0.12.2 and see the next failure', why: 'Fix one fault, re-test, move outward. Changing several things at once means you never learn which one mattered.' },
    { t: 'FAULT 2 — On R1, find the interface that is administratively down and enable it', why: '"administratively down" in show ip interface brief has exactly one cause: somebody typed shutdown, or never typed no shutdown.' },
    { t: 'FAULT 3 — Compare the addresses on each end of the R1–R2 link and correct the one that is wrong', why: 'Both ends of a /30 must be in the same tiny subnet. 10.0.12.1 and 10.0.12.5 with a .252 mask are in different networks and can never speak.' },
    { t: 'Verify the routers can now reach each other directly before looking any further', why: 'The link is the foundation. Routing cannot possibly work across a link whose two ends cannot ping each other.' },
    { t: 'FAULT 4 — Check R2\'s routing table and add the return route that is missing', why: 'R1 knows how to reach PC2\'s network, but R2 has no idea how to get back. Traffic arrives and the replies die — the single most common static-routing error.' },
    { t: 'FAULT 5 — Ping again; it still fails. Find the access list that is discarding it and remove it', why: 'ICMP dying while everything else is fine is the fingerprint of an access list. show ip interface tells you whether one is applied and in which direction.' },
    { t: 'Confirm full connectivity in both directions, and trace the path to see every hop', why: 'Both directions, because a one-way fix is no fix. Traceroute confirms the packets take the path you expect.' },
  ],
  steps: [
    { d: 'PC1', t: 'Reproduce the reported fault, then test the nearest hop.', c: ['ipconfig', 'ping 10.0.2.10', 'ping 10.0.1.1'], note: 'Both fail. The gateway failing tells you the problem starts right here, not out in the network.' },
    { d: 'SW1', t: 'Look at VLAN membership — the fastest check at layer 2.', c: ['enable', 'show vlan brief', 'show interfaces status'], note: 'Fa0/1 (the PC) sits in VLAN 99 while Gi0/1 (the uplink to the router) is in VLAN 10. They are in different broadcast domains.' },
    { d: 'SW1', t: 'FAULT 1 — put the PC port back into the users VLAN.', c: ['configure terminal', 'interface f0/1', 'switchport access vlan 10', 'end', 'show vlan brief'] },
    { d: 'PC1', t: 'Re-test: the gateway answers now. Push one hop further.', c: ['ping 10.0.1.1', 'ping 10.0.12.2'], note: 'Good progress — layer 2 is fixed. The next hop still fails, so move to the router.' },
    { d: 'R1', t: 'Check interface states before anything else.', c: ['enable', 'show ip interface brief'], note: 'G0/1 reads "administratively down". That wording only ever means one thing.' },
    { d: 'R1', t: 'FAULT 2 — enable the WAN interface.', c: ['configure terminal', 'interface g0/1', 'no shutdown', 'end', 'show ip interface brief'], note: 'Status goes up, but watch the addresses on the next step before celebrating.' },
    { d: 'R1', t: 'Test the link to R2 and note the addressing on this end.', c: ['ping 10.0.12.2', 'show ip interface g0/1'], note: 'Still no reply. R1 is 10.0.12.1 with a .252 mask, so its /30 covers only .0 to .3.' },
    { d: 'R2', t: 'Look at R2\'s side of the same link.', c: ['enable', 'show ip interface brief'], note: 'R2 is using 10.0.12.5 — outside R1\'s /30 entirely. The two ends are in different subnets.' },
    { d: 'R2', t: 'FAULT 3 — correct the address on the link.', c: ['configure terminal', 'interface g0/0', 'ip address 10.0.12.2 255.255.255.252', 'end', 'ping 10.0.12.1'], note: 'The routers can now reach each other. Layer 3 adjacency restored.' },
    { d: 'R2', t: 'Check the routing table for the return path.', c: ['show ip route'], note: 'R2 knows its own two connected networks and nothing else. It has no idea where 10.0.1.0/24 lives.' },
    { d: 'R2', t: 'FAULT 4 — add the missing return route.', c: ['configure terminal', 'ip route 10.0.1.0 255.255.255.0 10.0.12.1', 'end', 'show ip route'], note: 'A ping needs a route there AND back. R1 already had its half; R2 was missing its own.' },
    { d: 'PC1', t: 'Test again — still failing, which points at filtering.', c: ['ping 10.0.2.10'], note: 'Routing is complete now, so something is actively discarding the traffic.' },
    { d: 'R1', t: 'Check whether an access list is attached to the LAN interface.', c: ['show ip interface g0/0', 'show access-lists'], note: 'An inbound list called BLOCKALL denies all ICMP. That is precisely the traffic a ping uses.' },
    { d: 'R1', t: 'FAULT 5 — detach the offending access list.', c: ['configure terminal', 'interface g0/0', 'no ip access-group BLOCKALL in', 'end', 'show ip interface g0/0'], note: 'Removing it from the interface is enough — the list itself can stay defined for later use.' },
    { d: 'PC1', t: 'Full verification, in both directions.', c: ['ping 10.0.2.10', 'tracert 10.0.2.10'], note: 'The trace should show R1, then R2, then PC2 — exactly the path the diagram predicts.' },
    { d: 'PC2', t: 'And back the other way.', c: ['ping 10.0.1.10'], note: 'A fix that only works one way is not a fix. Always test both directions.' },
  ],
  verify: ['show vlan brief', 'show ip interface brief', 'show ip route', 'show ip interface g0/0', 'show access-lists'],
  explain: `<h3>A method, not a hunch</h3>
<p>Work <b>bottom up</b> and <b>near to far</b>. Layer 1 and 2 first (is the port up, is it in the right VLAN?), then layer 3 (are the addresses in the same subnet, is there a route?), then filtering. Test after every single change, and change one thing at a time — otherwise you never learn which repair actually helped, and you may introduce a new fault while fixing the old one.</p>
<h3>The five fingerprints in this lab</h3>
<ul>
<li><b>Different VLANs</b> — devices on the same subnet cannot reach each other even though addressing is perfect. <code>show vlan brief</code> exposes it instantly.</li>
<li><b>administratively down</b> — that exact wording in <code>show ip interface brief</code> means somebody typed <code>shutdown</code>. Compare with <b>down/down</b>, which means enabled but no signal: a cable, a dead far end, or a speed mismatch.</li>
<li><b>Subnet mismatch</b> — two ends of a link in different subnets never communicate. With a /30 (mask 255.255.255.252) the usable addresses come in pairs: .1 and .2, then .5 and .6. 10.0.12.1 and 10.0.12.5 are in adjacent but separate networks.</li>
<li><b>Missing return route</b> — traffic reaches the destination and the replies vanish. Routing is not symmetric by magic; every router in both directions needs to know the way.</li>
<li><b>An access list</b> — one protocol fails while others work. <code>show ip interface</code> reveals whether a list is applied inbound or outbound, and <code>show access-lists</code> shows what it does.</li>
</ul>
<h3>The commands that find almost everything</h3>
<p><code>show ip interface brief</code> (are the ports up and addressed?), <code>show vlan brief</code> (is the port in the right VLAN?), <code>show ip route</code> (does a path exist?), <code>show ip interface</code> (is a filter applied?), <code>show cdp neighbors</code> (is the physical topology what I think it is?). Five commands will diagnose the overwhelming majority of CCNA-level faults, including every one in this lab.</p>`,
  checks: [
    { desc: 'FAULT 1 fixed — SW1 F0/1 is back in VLAN 10 with the uplink', fn: H => H.access('SW1', 'f0/1', 10) && H.i('SW1', 'g0/1').accessVlan === 10 },
    { desc: 'FAULT 2 fixed — R1 G0/1 is enabled and up', fn: H => H.noshut('R1', 'g0/1') && H.up('R1', 'g0/1') },
    { desc: 'FAULT 3 fixed — R2 G0/0 addressed inside R1\'s /30', fn: H => H.hasIp('R2', 'g0/0', '10.0.12.2', '255.255.255.252') },
    { desc: 'The two routers can reach each other across the link', fn: H => H.ping('R1', '10.0.12.2') && H.ping('R2', '10.0.12.1') },
    { desc: 'FAULT 4 fixed — R2 has a route back to 10.0.1.0/24', fn: H => H.d('R2').staticRoutes.some(r => r.net === '10.0.1.0' && r.mask === '255.255.255.0') },
    { desc: 'FAULT 5 fixed — no access list blocking traffic on R1 G0/0', fn: H => !H.i('R1', 'g0/0').aclIn },
    { desc: 'PC1 reaches its gateway', fn: H => H.ping('PC1', '10.0.1.1') },
    { desc: 'PC1 reaches PC2 end to end', fn: H => H.ping('PC1', '10.0.2.10') },
    { desc: 'PC2 reaches PC1 in the reverse direction', fn: H => H.ping('PC2', '10.0.1.10') },
  ],
});

window.ND = ND;
})();
