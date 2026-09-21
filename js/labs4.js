/* NetDrill labs — Volume 2 COMPREHENSIVE tier.
   Phased drills: configure, repeat on more devices, every variant and "no"
   form, then a full verification sweep. Each step names its device. */
'use strict';
(function () {
const ND = window.ND;
ND.LABS = ND.LABS || [];
const L = lab => ND.LABS.push(lab);

/* ============================================================= */
L({
  id: 'y1-acls', vol: 2, tier: 'deep', day: 'Days 33-34', title: 'Access Lists — Full Drill',
  topics: '2 routers · numbered & named · standard & extended · host/any/wildcards · tcp/udp/icmp · ports · sequence numbers & insertion · in/out · vty access-class · removal',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.2.10', mask: '255.255.255.0', gw: '10.0.2.1' } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.4.10', mask: '255.255.255.0', gw: '10.0.4.1' } },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3'] },
    { id: 'SRV1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.3.100', mask: '255.255.255.0', gw: '10.0.3.1' } },
    { id: 'SRV2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.3.200', mask: '255.255.255.0', gw: '10.0.3.1' } },
  ],
  links: [
    ['PC1', 'e0', 'R1', 'g0/0'], ['PC2', 'e0', 'R1', 'g0/1'], ['R1', 'g0/2', 'R2', 'g0/0'],
    ['R2', 'g0/1', 'SW1', 'f0/1'], ['SW1', 'f0/2', 'SRV1', 'e0'], ['SW1', 'f0/3', 'SRV2', 'e0'], ['R2', 'g0/2', 'PC3', 'e0'],
  ],
  layout: { PC1: [30, 22], PC2: [30, 100], R1: [125, 60], R2: [225, 60], SW1: [305, 60], SRV1: [372, 22], SRV2: [372, 72], PC3: [225, 122] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    const M24 = '255.255.255.0', M30 = '255.255.255.252';
    set('R1', 'g0/0', '10.0.1.1', M24); set('R1', 'g0/1', '10.0.2.1', M24); set('R1', 'g0/2', '10.0.12.1', M30);
    set('R2', 'g0/0', '10.0.12.2', M30); set('R2', 'g0/1', '10.0.3.1', M24); set('R2', 'g0/2', '10.0.4.1', M24);
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.SW1.hostname = 'SW1';
    topo.devs.R1.staticRoutes.push({ net: '10.0.3.0', mask: M24, via: '10.0.12.2', ad: 1 }, { net: '10.0.4.0', mask: M24, via: '10.0.12.2', ad: 1 });
    topo.devs.R2.staticRoutes.push({ net: '10.0.1.0', mask: M24, via: '10.0.12.1', ad: 1 }, { net: '10.0.2.0', mask: M24, via: '10.0.12.1', ad: 1 });
  },
  intro: `<b>The situation:</b> two routers joining four networks — two user LANs, a server LAN holding a web server and a database server, and a branch LAN. Routing already works, so at this moment everything can reach everything.<br><b>Your goal:</b> every kind of access list there is, written repeatedly on <b>both</b> routers until the syntax is automatic. Numbered and named, standard and extended, the <code>host</code> and <code>any</code> shortcuts, wildcard masks, TCP and ICMP matching, port numbers, sequence numbers including inserting a rule between two existing ones, both directions of application, protecting the router's own vty lines, and finally removing lists cleanly.`,
  tasks: [
    { t: 'PHASE 1 — Establish the "before" picture: every PC can reach both servers', why: 'Never apply a filter without knowing what worked beforehand, or you cannot tell your rule from an unrelated fault.' },
    { t: 'PHASE 2 — On R1, build numbered standard ACL 10 using three different source forms: host, a wildcard network, and any', why: 'All three forms in one list. <code>host X</code> means "X 0.0.0.0" and <code>any</code> means "0.0.0.0 255.255.255.255" — shortcuts for things you could write the long way.' },
    { t: 'Apply ACL 10 outbound toward R2 and test both PCs', why: 'Standard lists go close to the DESTINATION. They cannot see where traffic is headed, so filtering near the source would block that host from reaching everything.' },
    { t: 'PHASE 3 — Repeat the whole exercise on R2 with a second numbered standard list', why: 'Second router, same syntax. Repetition on a different device with different numbers is what turns recall into reflex.' },
    { t: 'PHASE 4 — Build a named standard list on R1 and apply it to the vty lines with access-class', why: 'access-class protects the router itself; ip access-group filters traffic passing through it. Different commands for different jobs — a favourite exam distinction.' },
    { t: 'Repeat the vty protection on R2 with its own named list', why: 'Every router on a network needs its management plane protected, so you will type this pair many times in real work.' },
    { t: 'PHASE 5 — On R1, build a named extended list with explicit sequence numbers 10, 20 and 30', why: 'Extended lists match protocol, source, destination and port. Sequence numbers are what make a named list editable later.' },
    { t: 'Insert a new rule at sequence 25, between two existing lines, and confirm it lands in the right place', why: 'The single biggest advantage of named lists. A numbered list can only be appended to or deleted whole.' },
    { t: 'Apply the extended list inbound on the interface where PC1\'s traffic arrives', why: 'Extended lists go close to the SOURCE — drop doomed packets at the first router rather than carrying them across the network to die.' },
    { t: 'PHASE 6 — On R2, build a numbered extended list that blocks one TCP port to one server', why: 'Numbered extended lists live in the 100-199 range. Same matching power, no ability to edit individual lines.' },
    { t: 'PHASE 7 — Test the full matrix: which host can reach which server, with which protocol', why: 'An access list is not finished until you have proven both what it blocks AND what it still allows.' },
    { t: 'PHASE 8 — Read every list with show access-lists and confirm each attachment with show ip interface', why: 'Two independent checks. A list that exists but is not applied to an interface filters precisely nothing.' },
    { t: 'PHASE 9 — Practise removal: detach a list from an interface, delete a numbered list whole, then rebuild both', why: 'Removing a numbered ACL takes every line at once — there is no way to remove just one, which is the main reason to prefer named lists.' },
  ],
  steps: [
    /* ---- PHASE 1: baseline ---- */
    { d: 'PC1', t: 'Baseline from the first user LAN.', c: ['ipconfig', 'ping 10.0.3.100', 'ping 10.0.3.200'] },
    { d: 'PC2', t: 'Baseline from the second user LAN.', c: ['ping 10.0.3.100', 'ping 10.0.3.200'] },
    { d: 'PC3', t: 'And from the branch LAN behind R2.', c: ['ping 10.0.3.100', 'ping 10.0.1.10'], note: 'Everything reaches everything. That is the state you are about to start restricting.' },

    /* ---- PHASE 2: numbered standard on R1 ---- */
    { d: 'R1', t: 'First line — permit a single host using the host keyword.', c: ['enable', 'configure terminal', 'access-list 10 permit host 10.0.1.10'], note: '<code>host 10.0.1.10</code> is shorthand for <code>10.0.1.10 0.0.0.0</code>. Numbers 1-99 mean a standard list, matching SOURCE addresses only.' },
    { d: 'R1', t: 'Second line — deny a whole network with a wildcard mask.', c: ['access-list 10 deny 10.0.2.0 0.0.0.255'], note: 'Wildcard 0.0.0.255 matches any host in that /24. Order is everything: the router stops at the first match.' },
    { d: 'R1', t: 'Third line — permit everything else with any.', c: ['access-list 10 permit any', 'do show access-lists'], note: 'Without a final permit, the invisible <code>deny any</code> at the bottom of every list would block all other traffic.' },
    { d: 'R1', t: 'Apply it outbound on the interface nearest the destination.', c: ['interface g0/2', 'ip access-group 10 out', 'end', 'show ip interface g0/2'], note: 'Standard lists go close to the destination. Look for "Outgoing access list is 10" in the output.' },
    { d: 'PC1', t: 'PC1 is explicitly permitted, so it still works.', c: ['ping 10.0.3.100'] },
    { d: 'PC2', t: 'PC2\'s whole network is denied.', c: ['ping 10.0.3.100'], note: 'A blocked packet gives a "Destination net unreachable" style reply, not a timeout — the router is actively rejecting it.' },

    /* ---- PHASE 3: numbered standard on R2 ---- */
    { d: 'R2', t: 'Second router, same syntax, different numbers.', c: ['enable', 'configure terminal', 'access-list 20 deny host 10.0.4.99', 'access-list 20 permit 10.0.4.0 0.0.0.255', 'access-list 20 permit any', 'do show access-lists'], note: 'Deny one specific troublemaker, permit the rest of its network, permit everything else. A very common real-world shape.' },
    { d: 'R2', t: 'Apply it inbound where the branch LAN arrives.', c: ['interface g0/2', 'ip access-group 20 in', 'end', 'show ip interface g0/2'], note: 'Inbound this time. The list is evaluated as packets enter the router, before any routing decision is made.' },
    { d: 'PC3', t: 'The branch LAN is permitted, so nothing changes for PC3.', c: ['ping 10.0.3.100'] },

    /* ---- PHASE 4: named standard for vty ---- */
    { d: 'R1', t: 'Create a named standard list for management access.', c: ['configure terminal', 'ip access-list standard VTY-ACCESS', 'permit 10.0.1.0 0.0.0.255', 'exit'], note: 'Inside a named list you type just <code>permit</code> or <code>deny</code> — the name is already established.' },
    { d: 'R1', t: 'Attach it to the vty lines — a different command entirely.', c: ['line vty 0 4', 'password Cisco123', 'login', 'access-class VTY-ACCESS in', 'end', 'show running-config'], note: '<code>access-class</code> filters connections TO the router. <code>ip access-group</code> filters traffic THROUGH it. Do not mix them up.' },
    { d: 'R2', t: 'Repeat the vty protection on R2 with its own list.', c: ['configure terminal', 'ip access-list standard MGMT-HOSTS', 'permit 10.0.4.0 0.0.0.255', 'permit host 10.0.1.10', 'exit', 'line vty 0 4', 'password Cisco123', 'login', 'access-class MGMT-HOSTS in', 'end', 'show running-config'], note: 'Two permitted sources this time — the branch LAN and one trusted admin workstation.' },

    /* ---- PHASE 5: named extended with sequence numbers ---- */
    { d: 'R1', t: 'Start a named extended list and add the first rule.', c: ['configure terminal', 'ip access-list extended EDGE-IN', '10 permit tcp 10.0.1.0 0.0.0.255 host 10.0.3.100 eq 80'], note: 'Extended lists match protocol, source, destination AND port. This allows web traffic to exactly one server.' },
    { d: 'R1', t: 'Second rule — HTTPS from anywhere to the same server.', c: ['20 permit tcp any host 10.0.3.100 eq 443'], note: 'Note the mixture: <code>any</code> for the source, <code>host</code> for the destination. Both shortcuts in one line.' },
    { d: 'R1', t: 'Third rule — the catch-all, which must be last.', c: ['30 permit ip any any', 'do show access-lists'], note: 'If this were first, nothing below it would ever be evaluated. The order of a list IS its logic.' },
    { d: 'R1', t: 'Now insert a rule BETWEEN two existing ones.', c: ['25 deny icmp any host 10.0.3.100', 'do show access-lists'], note: 'Sequence 25 slots in between 20 and 30. This is the whole reason named lists exist — a numbered list can only be appended to.' },
    { d: 'R1', t: 'Apply it inbound where PC1\'s traffic enters the router.', c: ['exit', 'interface g0/0', 'ip access-group EDGE-IN in', 'end', 'show ip interface g0/0'], note: 'Extended lists go close to the source. Trace a packet through the four rules in your head before testing.' },
    { d: 'PC1', t: 'Ping to that server is now denied, though web traffic would pass.', c: ['ping 10.0.3.100'], note: 'Sequence 25 catches it. Same two hosts, different outcome per protocol — the precision standard lists cannot achieve.' },
    { d: 'PC1', t: 'The OTHER server is untouched by that rule.', c: ['ping 10.0.3.200'], note: 'Rule 25 names host 10.0.3.100 only, so traffic to .200 falls through to the catch-all at 30.' },

    /* ---- PHASE 6: numbered extended on R2 ---- */
    { d: 'R2', t: 'A numbered extended list blocking one service on one server.', c: ['configure terminal', 'access-list 120 deny tcp any host 10.0.3.200 eq 23', 'access-list 120 permit ip any any', 'do show access-lists'], note: '100-199 is the extended range. <code>eq 23</code> is telnet — blocked to the database server from everywhere.' },
    { d: 'R2', t: 'Apply it inbound on the link from R1.', c: ['interface g0/0', 'ip access-group 120 in', 'end', 'show ip interface g0/0'], note: 'All traffic from the R1 side now passes this filter on the way in.' },

    /* ---- PHASE 7: the test matrix ---- */
    { d: 'PC1', t: 'Web to the web server — permitted by EDGE-IN rule 10.', c: ['ping 10.0.3.200'], note: 'ICMP to .200 works (no rule blocks it) while ICMP to .100 does not. Two servers, two different policies.' },
    { d: 'PC2', t: 'PC2 is still blocked by the standard list on R1\'s outbound interface.', c: ['ping 10.0.3.100', 'ping 10.0.3.200'], note: 'Both fail. A standard list cannot distinguish destinations — it blocks this source from everything beyond that interface.' },
    { d: 'PC3', t: 'The branch LAN reaches both servers normally.', c: ['ping 10.0.3.100', 'ping 10.0.3.200'], note: 'PC3\'s traffic never crosses R1, so none of R1\'s lists apply to it.' },

    /* ---- PHASE 8: verification sweep ---- */
    { d: 'R1', t: 'Read every list on R1 and check both attachments.', c: ['show access-lists', 'show ip interface g0/0', 'show ip interface g0/2'], note: 'Three lists defined; two applied to interfaces; one applied to the vty lines. All three attachment styles on one router.' },
    { d: 'R2', t: 'And the same sweep on R2.', c: ['show access-lists', 'show ip interface g0/0', 'show ip interface g0/2'], note: 'Compare the sequence numbers: your named list shows the numbers you chose, the numbered lists were auto-numbered in tens.' },

    /* ---- PHASE 9: removal and rebuild ---- */
    { d: 'R2', t: 'Detach a list from its interface without deleting the list.', c: ['configure terminal', 'interface g0/2', 'no ip access-group 20 in', 'end', 'show ip interface g0/2', 'show access-lists'], note: 'The interface is now unfiltered but list 20 still exists, ready to reapply. Detaching and deleting are separate actions.' },
    { d: 'R2', t: 'Now delete the numbered list entirely — all lines at once.', c: ['configure terminal', 'no access-list 20', 'do show access-lists'], note: 'Every line gone in one command. There is no way to remove a single line from a numbered list.' },
    { d: 'R2', t: 'Rebuild it and reattach.', c: ['access-list 20 deny host 10.0.4.99', 'access-list 20 permit 10.0.4.0 0.0.0.255', 'access-list 20 permit any', 'interface g0/2', 'ip access-group 20 in', 'end', 'show access-lists', 'show ip interface g0/2'], note: 'Rebuilt from scratch — which on a fifty-line production list is exactly the nightmare that named lists were invented to avoid.' },
    { d: 'PC3', t: 'Confirm the branch LAN still works after the rebuild.', c: ['ping 10.0.3.100'] },
    { d: 'R1', t: 'Delete named lists too — one standard, one extended.', c: ['configure terminal', 'ip access-list standard SCRATCH-STD', 'permit 10.0.1.0 0.0.0.255', 'exit', 'ip access-list extended SCRATCH-EXT', 'permit tcp any any eq 443', 'exit', 'do show access-lists', 'no ip access-list standard SCRATCH-STD', 'no ip access-list extended SCRATCH-EXT', 'end', 'show access-lists'], note: 'Built and destroyed in one step. Note the "no" form has to repeat the type — standard or extended — exactly as you created it, or IOS will not find the list.' },
    { d: 'R1', t: 'Save both routers.', c: ['write memory'] },
    { d: 'R2', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show access-lists', 'show ip interface g0/0', 'show ip interface g0/2', 'show running-config'],
  explain: `<h3>Standard versus extended, and where each belongs</h3>
<p><b>Standard</b> (1-99, or named) matches the source address only. Because it cannot see the destination, filtering near the source would block that host from reaching <em>everything</em> — so standard lists go <b>close to the destination</b>. <b>Extended</b> (100-199, or named) matches protocol, source, destination and port, so it can sit <b>close to the source</b> and drop unwanted traffic before it consumes any bandwidth.</p>
<h3>How a packet is evaluated</h3>
<p>Top to bottom, first match wins, and there is an invisible <code>deny any</code> at the bottom of every list. That implicit deny is why a list of only deny statements blocks everything, and why a catch-all <code>permit ip any any</code> belongs last rather than first. Reordering a list changes its meaning completely.</p>
<h3>Wildcard masks and the two shortcuts</h3>
<p>A wildcard is an inverted subnet mask: 0 means "must match", 1 means "don't care". /24 becomes 0.0.0.255, /30 becomes 0.0.0.3. Two shortcuts save typing: <code>host 10.0.1.10</code> equals <code>10.0.1.10 0.0.0.0</code>, and <code>any</code> equals <code>0.0.0.0 255.255.255.255</code>.</p>
<h3>Three ways to attach a list</h3>
<p><code>ip access-group [list] in</code> filters traffic entering an interface, before routing. <code>ip access-group [list] out</code> filters traffic leaving one, after routing. <code>access-class [list] in</code> on the vty lines filters connections to the router itself. Note that traffic generated <em>by</em> the router bypasses outbound lists on its own interfaces.</p>
<h3>Numbered versus named</h3>
<p>Named lists can be edited: sequence numbers let you insert a rule between two existing ones or delete a single line. A numbered list is all-or-nothing — <code>no access-list 20</code> deletes every entry, and your only option is to retype the lot. On anything longer than a few lines, use named lists.</p>`,
  checks: [
    { desc: 'R1 ACL 10 uses host, wildcard and any forms in the right order', fn: H => { const e = H.d('R1').acls[10]?.entries; return !!(e && e.length === 3 && e[0].src.host === '10.0.1.10' && e[1].action === 'deny' && e[1].src.net === '10.0.2.0' && e[2].src.any); } },
    { desc: 'ACL 10 applied outbound on R1 G0/2', fn: H => H.i('R1', 'g0/2').aclOut === '10' },
    { desc: 'R2 ACL 20 rebuilt after deletion and reapplied inbound on G0/2', fn: H => H.d('R2').acls[20]?.entries.length === 3 && H.i('R2', 'g0/2').aclIn === '20' },
    { desc: 'Named standard VTY-ACCESS applied to R1\'s vty lines', fn: H => H.d('R1').acls['VTY-ACCESS']?.type === 'standard' && H.d('R1').lines.vty.accessClass === 'VTY-ACCESS' },
    { desc: 'Named standard MGMT-HOSTS with two permits applied to R2\'s vty lines', fn: H => H.d('R2').acls['MGMT-HOSTS']?.entries.length === 2 && H.d('R2').lines.vty.accessClass === 'MGMT-HOSTS' },
    { desc: 'EDGE-IN has four rules with the inserted one at sequence 25', fn: H => { const e = H.d('R1').acls['EDGE-IN']?.entries; return !!(e && e.length === 4 && e.map(x => x.seq).join(',') === '10,20,25,30'); } },
    { desc: 'EDGE-IN rule 25 denies ICMP to the web server only', fn: H => { const e = H.d('R1').acls['EDGE-IN']?.entries.find(x => x.seq === 25); return !!(e && e.action === 'deny' && e.proto === 'icmp' && e.dst.host === '10.0.3.100'); } },
    { desc: 'EDGE-IN applied inbound on R1 G0/0', fn: H => H.i('R1', 'g0/0').aclIn === 'EDGE-IN' },
    { desc: 'R2 numbered extended 120 blocks telnet to the database server', fn: H => { const e = H.d('R2').acls[120]?.entries; return !!(e && e[0].action === 'deny' && e[0].proto === 'tcp' && e[0].dstPort === 23 && e[1].action === 'permit'); } },
    { desc: 'ACL 120 applied inbound on R2 G0/0', fn: H => H.i('R2', 'g0/0').aclIn === '120' },
    { desc: 'PC1 may still reach the web server on TCP/80', fn: H => H.tcp('PC1', '10.0.3.100', 80) },
    { desc: 'PC1 ping to the web server is blocked by EDGE-IN', fn: H => H.pingBlocked('PC1', '10.0.3.100') },
    { desc: 'PC1 can still ping the OTHER server, which no rule names', fn: H => H.ping('PC1', '10.0.3.200') },
    { desc: 'Telnet to the database server is blocked by ACL 120', fn: H => H.tcpBlocked('PC1', '10.0.3.200', 23) },
    { desc: 'PC2 is blocked from both servers by the standard list', fn: H => H.pingBlocked('PC2', '10.0.3.100') && H.pingBlocked('PC2', '10.0.3.200') },
    { desc: 'The branch LAN still reaches both servers', fn: H => H.ping('PC3', '10.0.3.100') && H.ping('PC3', '10.0.3.200') },
    { desc: 'Both routers saved', fn: H => H.saved('R1') && H.saved('R2') },
  ],
});

/* ============================================================= */
L({
  id: 'y2-nat', vol: 2, tier: 'deep', day: 'Days 43-44', title: 'NAT & PAT — Full Drill',
  topics: '2 edge routers · inside/outside domains · multiple static mappings · ACL classifiers · PAT overload · translation table · removal and rebuild',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'ISP', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'g0/1'] },
    { id: 'SRV1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.100', mask: '255.255.255.0', gw: '192.168.1.1' } },
    { id: 'SRV2', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.200', mask: '255.255.255.0', gw: '192.168.1.1' } },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.10', mask: '255.255.255.0', gw: '192.168.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '172.16.5.10', mask: '255.255.255.0', gw: '172.16.5.1' } },
  ],
  links: [
    ['SW1', 'f0/1', 'SRV1', 'e0'], ['SW1', 'f0/2', 'SRV2', 'e0'], ['SW1', 'f0/3', 'PC1', 'e0'],
    ['SW1', 'g0/1', 'R1', 'g0/0'], ['R1', 'g0/1', 'ISP', 'g0/0'],
    ['ISP', 'g0/1', 'R2', 'g0/1'], ['R2', 'g0/0', 'PC2', 'e0'],
  ],
  layout: { SRV1: [30, 20], SRV2: [30, 58], PC1: [30, 96], SW1: [115, 58], R1: [195, 58], ISP: [280, 58], R2: [280, 122], PC2: [370, 122] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    const M24 = '255.255.255.0', M30 = '255.255.255.252', M32 = '255.255.255.255';
    set('R1', 'g0/0', '192.168.1.1', M24); set('R1', 'g0/1', '203.0.113.1', M30);
    set('ISP', 'g0/0', '203.0.113.2', M30); set('ISP', 'g0/1', '203.0.113.5', M30); set('ISP', 'lo0', '8.8.8.8', M32);
    set('R2', 'g0/1', '203.0.113.6', M30); set('R2', 'g0/0', '172.16.5.1', M24);
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.ISP.hostname = 'ISP'; topo.devs.SW1.hostname = 'SW1';
    topo.devs.R1.staticRoutes.push({ net: '0.0.0.0', mask: '0.0.0.0', via: '203.0.113.2', ad: 1 });
    topo.devs.R2.staticRoutes.push({ net: '0.0.0.0', mask: '0.0.0.0', via: '203.0.113.5', ad: 1 });
  },
  intro: `<b>The situation:</b> two branch offices, each on private addresses, each with a single public address from the same ISP. Site A also runs two servers that are supposed to be reachable from the internet, and right now they have no public identity at all.<br><b>Your goal:</b> the complete NAT command set, configured on <b>both</b> edge routers so every step is done twice. Mark the inside and outside domains, build two permanent one-to-one mappings for the servers, classify the user traffic with an access list, overload the public interface so the whole office shares one address, then practise removing and rebuilding each piece.<br><span class="dim">Note: this simulator models NAT configuration and the translation table rather than rewriting packet headers, so verification here is by <code>show</code> command rather than by pinging the internet — which is exactly how the exam objective is worded.</span>`,
  tasks: [
    { t: 'PHASE 1 — On R1, mark G0/0 as the NAT inside interface and G0/1 as the NAT outside interface', why: 'NAT only acts on traffic crossing between the two domains. Without both markings, every rule you write below does precisely nothing.' },
    { t: 'PHASE 2 — Create a static one-to-one mapping for the first server', why: 'Static NAT is permanent and bidirectional, so outsiders can initiate connections inward — exactly what a public server needs.' },
    { t: 'Create a second static mapping for the other server', why: 'Repetition, and a realistic setup: each public service gets its own public address out of the block the ISP assigned you.' },
    { t: 'Read the translation table and note both entries exist before any traffic flows', why: 'Static entries are permanent; dynamic ones appear only while a conversation is open. Spotting that difference in show output is exam material.' },
    { t: 'Name the four NAT address types for one of those mappings', why: 'Inside local is the private address as the LAN sees it; inside global is the public face. "Local is the inside view, global is the outside view" is the phrase to hold on to.' },
    { t: 'PHASE 3 — Build ACL 1 to classify which inside hosts may be translated, then configure PAT overload out of G0/1', why: 'Here the access list blocks nothing — it is a selector answering "who is allowed to be translated?" ACLs get reused this way all over IOS.' },
    { t: 'PHASE 4 — Repeat the entire configuration on R2 for the second site', why: 'Second router, same commands, different addresses. This is the repetition that turns a procedure into a reflex.' },
    { t: 'On R2 use a named access list instead of a numbered one as the classifier', why: 'Both work. Seeing the named form used for NAT reinforces that an ACL is just a traffic matcher, whatever its name.' },
    { t: 'PHASE 5 — On R1, remove one static mapping, confirm it has gone, then put it back', why: 'On a live network that removal instantly cuts every inbound session to that server. Doing it deliberately once removes the fear of the command.' },
    { t: 'Remove and rebuild the PAT statement as well', why: 'The dynamic half of the configuration deserves the same treatment. Note the overload keyword has to come back too.' },
    { t: 'PHASE 6 — Sweep the verification commands on both routers and identify which lines belong to static NAT and which to PAT', why: 'The two mechanisms coexist on one router. Reading a configuration and telling them apart is the real-world skill.' },
    { t: 'PHASE 7 — Confirm inside connectivity is unaffected, and that both edge routers still reach the ISP', why: 'NAT happens on the way out. Inside-to-inside traffic is untouched, and the underlying routing must still work.' },
  ],
  steps: [
    /* ---- PHASE 1: domains ---- */
    { d: 'R1', t: 'Look at the addressing you are working with.', c: ['enable', 'terminal length 0', 'show ip interface brief'], note: '192.168.1.0/24 inside is private and unroutable on the internet; 203.0.113.1 outside is the single public address the ISP gave this site.' },
    { d: 'R1', t: 'Mark the private side as the NAT inside domain.', c: ['configure terminal', 'interface g0/0', 'ip nat inside', 'exit'] },
    { d: 'R1', t: 'Mark the ISP-facing side as the outside domain.', c: ['interface g0/1', 'ip nat outside', 'exit', 'do show ip interface g0/1'], note: 'These two lines are the foundation. Every NAT rule below depends on them, and forgetting one is the most common reason "NAT does not work".' },

    /* ---- PHASE 2: two static mappings ---- */
    { d: 'R1', t: 'Give the first server a permanent public identity.', c: ['ip nat inside source static 192.168.1.100 203.0.113.100'], note: 'Order matters: inside-local first (the real private address), then inside-global (its public face). Swapping them is a classic slip.' },
    { d: 'R1', t: 'And the second server.', c: ['ip nat inside source static 192.168.1.200 203.0.113.200', 'end', 'show ip nat translations'], note: 'Two permanent entries, both present before a single packet has flowed. That is what makes static NAT usable for servers.' },
    { d: 'R1', t: 'Look at the configuration lines those commands produced.', c: ['show running-config'], note: 'Two <code>ip nat inside source static</code> lines plus the two interface markings. Four lines in total for the static half.' },

    /* ---- PHASE 3: PAT ---- */
    { d: 'R1', t: 'Classify which inside hosts may be translated.', c: ['configure terminal', 'access-list 1 permit 192.168.1.0 0.0.0.255', 'do show access-lists'], note: 'No traffic is blocked by this list. It is a selector, not a filter — the same syntax doing a completely different job.' },
    { d: 'R1', t: 'Now overload the outside interface.', c: ['ip nat inside source list 1 interface g0/1 overload', 'end', 'show running-config'], note: 'Read it in English: "translate sources matching list 1 to G0/1\'s address, tracking each conversation by port number".' },
    { d: 'R1', t: 'Confirm the whole NAT picture on R1.', c: ['show ip nat translations', 'show ip interface g0/0', 'show ip interface g0/1'], note: 'Two static entries in the table; the dynamic ones will only appear while inside hosts have conversations open.' },

    /* ---- PHASE 4: repeat on R2 ---- */
    { d: 'R2', t: 'Second site. Mark both domains.', c: ['enable', 'configure terminal', 'interface g0/0', 'ip nat inside', 'exit', 'interface g0/1', 'ip nat outside', 'exit'], note: 'Identical commands, different router. This site has no servers to publish, so it needs PAT only.' },
    { d: 'R2', t: 'Prove how fragile the markings are — remove them, then put them back.', c: ['interface g0/1', 'no ip nat outside', 'do show ip interface g0/1', 'ip nat outside', 'exit', 'interface g0/0', 'no ip nat inside', 'do show ip interface g0/0', 'ip nat inside', 'exit'], note: 'With either marking missing the translation rules still sit in the configuration looking perfectly correct, and nothing is translated at all. This is the single most common "NAT is broken" call.' },
    { d: 'R2', t: 'Use a NAMED access list as the classifier this time.', c: ['ip access-list standard NAT-HOSTS', 'permit 172.16.5.0 0.0.0.255', 'exit', 'do show access-lists'], note: 'Named or numbered makes no difference to NAT — it just needs something that matches the right sources.' },
    { d: 'R2', t: 'Tie it together with overload.', c: ['ip nat inside source list NAT-HOSTS interface g0/1 overload', 'end', 'show running-config'], note: 'One public address serving the entire branch. This is exactly what the router in your house does.' },
    { d: 'R2', t: 'Verify R2\'s NAT configuration.', c: ['show ip nat translations', 'show ip interface g0/0'], note: 'No static entries here — nothing is published, so the table stays empty until traffic flows.' },

    /* ---- PHASE 5: removal and rebuild ---- */
    { d: 'R1', t: 'Remove one static mapping and watch the table shrink.', c: ['configure terminal', 'no ip nat inside source static 192.168.1.200 203.0.113.200', 'do show ip nat translations'], note: 'One entry left. On a live network every inbound session to that server has just been cut.' },
    { d: 'R1', t: 'Put it back and confirm.', c: ['ip nat inside source static 192.168.1.200 203.0.113.200', 'do show ip nat translations'], note: 'Restored. The "no" form of a NAT statement must repeat the whole mapping, both addresses included.' },
    { d: 'R1', t: 'Now remove the PAT statement and rebuild it.', c: ['no ip nat inside source list 1 interface g0/1 overload', 'do show running-config', 'ip nat inside source list 1 interface g0/1 overload', 'end', 'show running-config'], note: 'Note the overload keyword has to come back too. Without it you would have dynamic NAT using a single address, which serves exactly one host at a time.' },
    { d: 'R1', t: 'Practise removing an interface marking as well.', c: ['configure terminal', 'interface g0/0', 'no ip nat inside', 'do show ip interface g0/0', 'ip nat inside', 'end', 'show ip interface g0/0'], note: 'With the inside marking gone, NAT stops entirely even though every rule is still configured — a genuinely confusing fault to walk into.' },

    /* ---- PHASE 6: verification sweep ---- */
    { d: 'R1', t: 'Read R1\'s finished NAT configuration and separate the two mechanisms.', c: ['show running-config', 'show ip nat translations'], note: 'Static NAT is two lines. PAT is three: the ACL, the two interface markings, and the overload statement.' },
    { d: 'R2', t: 'And R2\'s, which has only the dynamic half.', c: ['show running-config', 'show ip nat translations'], note: 'Compare the two routers side by side. One publishes servers, the other only lets users out.' },
    { d: 'R1', t: 'Think through the four address names for the first server.', c: ['show ip nat translations'], note: 'Inside local 192.168.1.100 (as the LAN sees it), inside global 203.0.113.100 (as the internet sees it). Outside local and outside global describe the far end, usually identical.' },

    /* ---- PHASE 7: underlying connectivity ---- */
    { d: 'PC1', t: 'Inside traffic is untouched by NAT.', c: ['ipconfig', 'ping 192.168.1.100', 'ping 192.168.1.1'], note: 'NAT only acts when a packet crosses from inside to outside. Inside-to-inside never touches it.' },
    { d: 'R1', t: 'Confirm the WAN link to the ISP still works.', c: ['ping 203.0.113.2'], note: 'The underlying routing must be healthy or no amount of NAT configuration will help.' },
    { d: 'R2', t: 'Same check from the second site.', c: ['ping 203.0.113.5'] },
    { d: 'PC2', t: 'And inside connectivity at site B.', c: ['ipconfig', 'ping 172.16.5.1'] },
    { d: 'R1', t: 'Save both edge routers.', c: ['write memory'] },
    { d: 'R2', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show ip nat translations', 'show running-config', 'show ip interface g0/0', 'show ip interface g0/1', 'show access-lists'],
  explain: `<h3>The four address names</h3>
<p><b>Inside local</b> — the private address as the inside network sees it (192.168.1.100). <b>Inside global</b> — the public address the outside world sees for that same host (203.0.113.100). <b>Outside local</b> and <b>outside global</b> describe the remote host and are usually identical. The memory hook: <em>local = as seen from inside, global = as seen from outside</em>. Expect to be asked to label a diagram with these four.</p>
<h3>Three flavours of NAT</h3>
<p><b>Static</b> — one private address permanently mapped to one public address, in both directions. Used for servers, because outsiders can initiate connections inward. <b>Dynamic</b> — a pool of public addresses handed out first-come-first-served; when the pool empties, new hosts simply fail. <b>PAT / overload</b> — many private addresses share one public address, distinguished by source port number. Only PAT scales, which is why it runs on essentially every home and office router in the world.</p>
<h3>Why PAT cannot host a server</h3>
<p>A PAT translation exists only while an inside host has a conversation open. Nothing outside can start a connection inward because there is no entry to match — a security benefit and a hosting problem at the same time. Port forwarding (static NAT including a port number) is the workaround.</p>
<h3>The configuration, in two halves</h3>
<p>Every NAT deployment needs the <b>domain markings</b> (<code>ip nat inside</code> and <code>ip nat outside</code> on the relevant interfaces) plus a <b>rule</b>. For static that rule is a single mapping line. For PAT it is an access list selecting the sources plus an <code>ip nat inside source list … overload</code> statement. Remove either interface marking and the whole thing silently stops working while the configuration still looks correct — a fault worth recognising.</p>
<h3>RFC 1918</h3>
<p>The private ranges are 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. Internet routers drop them on sight, which is the entire reason NAT exists — and a large part of why IPv4 survived long enough for IPv6 to arrive.</p>`,
  checks: [
    { desc: 'R1: both NAT domains marked on the right interfaces', fn: H => H.i('R1', 'g0/0').natInside && H.i('R1', 'g0/1').natOutside },
    { desc: 'R1 has both static mappings, including the one removed and restored', fn: H => { const s = H.d('R1').nat.statics; return s.some(x => x.local === '192.168.1.100' && x.global === '203.0.113.100') && s.some(x => x.local === '192.168.1.200' && x.global === '203.0.113.200'); } },
    { desc: 'R1 has exactly two static mappings after the remove/rebuild cycle', fn: H => H.d('R1').nat.statics.length === 2 },
    { desc: 'R1 ACL 1 classifies the inside network', fn: H => !!H.d('R1').acls[1]?.entries.some(e => e.action === 'permit' && e.src.net === '192.168.1.0') },
    { desc: 'R1 PAT rebuilt with overload out of G0/1', fn: H => { const d = H.d('R1').nat.dynamic; return !!(d && d.acl === '1' && d.overload && d.iface === 'GigabitEthernet0/1'); } },
    { desc: 'R2: both NAT domains marked', fn: H => H.i('R2', 'g0/0').natInside && H.i('R2', 'g0/1').natOutside },
    { desc: 'R2 uses a NAMED access list as its NAT classifier', fn: H => !!H.d('R2').acls['NAT-HOSTS'] && H.d('R2').nat.dynamic?.acl === 'NAT-HOSTS' },
    { desc: 'R2 PAT overloads its outside interface', fn: H => { const d = H.d('R2').nat.dynamic; return !!(d && d.overload && d.iface === 'GigabitEthernet0/1'); } },
    { desc: 'R2 publishes no servers (no static mappings)', fn: H => H.d('R2').nat.statics.length === 0 },
    { desc: 'Inside connectivity at site A is unaffected', fn: H => H.ping('PC1', '192.168.1.100') && H.ping('PC1', '192.168.1.1') },
    { desc: 'Inside connectivity at site B is unaffected', fn: H => H.ping('PC2', '172.16.5.1') },
    { desc: 'Both edge routers still reach the ISP', fn: H => H.ping('R1', '203.0.113.2') && H.ping('R2', '203.0.113.5') },
    { desc: 'Both routers saved', fn: H => H.saved('R1') && H.saved('R2') },
  ],
});

/* ============================================================= */
L({
  id: 'y3-dhcp', vol: 2, tier: 'deep', day: 'Days 38, 48', title: 'DHCP Server, Relay & Snooping — Full Drill',
  topics: '3 pools · single and range exclusions · every pool option · 2 relay agents · bindings · pool removal · snooping with trusted ports',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R3', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'PC4', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
  ],
  links: [
    ['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2'], ['SW1', 'g0/1', 'R1', 'g0/0'],
    ['R1', 'g0/1', 'R2', 'g0/1'], ['R2', 'g0/0', 'PC3', 'e0'],
    ['R1', 'g0/2', 'R3', 'g0/1'], ['R3', 'g0/0', 'PC4', 'e0'],
  ],
  layout: { PC1: [28, 24], PC2: [28, 92], SW1: [105, 58], R1: [185, 58], R2: [275, 22], PC3: [365, 22], R3: [275, 96], PC4: [365, 96] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    const M24 = '255.255.255.0', M30 = '255.255.255.252';
    set('R1', 'g0/0', '10.0.1.1', M24); set('R1', 'g0/1', '10.0.12.1', M30); set('R1', 'g0/2', '10.0.13.1', M30);
    set('R2', 'g0/1', '10.0.12.2', M30); set('R2', 'g0/0', '10.0.2.1', M24);
    set('R3', 'g0/1', '10.0.13.2', M30); set('R3', 'g0/0', '10.0.3.1', M24);
    for (const r of ['R1', 'R2', 'R3']) topo.devs[r].hostname = r;
    topo.devs.SW1.hostname = 'SW1';
    topo.devs.R1.staticRoutes.push({ net: '10.0.2.0', mask: M24, via: '10.0.12.2', ad: 1 }, { net: '10.0.3.0', mask: M24, via: '10.0.13.2', ad: 1 });
    topo.devs.R2.staticRoutes.push({ net: '0.0.0.0', mask: '0.0.0.0', via: '10.0.12.1', ad: 1 });
    topo.devs.R3.staticRoutes.push({ net: '0.0.0.0', mask: '0.0.0.0', via: '10.0.13.1', ad: 1 });
  },
  intro: `<b>The situation:</b> a head office and two branches. Four PCs, all set to obtain addresses automatically, and nobody handing any out. Routing between the sites already works, so this drill is purely about DHCP.<br><b>Your goal:</b> make one router the address server for <b>all three</b> subnets. You will build three pools with the complete option set, protect reserved addresses with both forms of the exclusion command, and configure <b>two separate relay agents</b> — because the branch PCs broadcast, and routers do not forward broadcasts. Then you will secure the whole thing so a rogue server on a desk port cannot hijack it.`,
  tasks: [
    { t: 'PHASE 1 — Confirm all four PCs currently have no address at all', why: 'The starting point. Every one is set to DHCP and nobody is answering.' },
    { t: 'PHASE 2 — On R1, exclude the gateway address with the single-address form, then the rest of the low range with the range form', why: 'Two forms of the same command. Exclusions protect addresses you assigned by hand, and on real gear you do them BEFORE creating the pool or a client may lease .1 while you are typing.' },
    { t: 'Repeat the exclusions for both branch subnets', why: 'R1 will serve those subnets too, so their gateways need the same protection. Three subnets, three sets of exclusions.' },
    { t: 'PHASE 3 — Build pool LAN1 for the local subnet with network, default-router, dns-server, domain-name and lease', why: 'The full option set. A lease carries far more than an address, which is why a DHCP client comes up fully working.' },
    { t: 'PHASE 4 — Build pools LAN2 and LAN3 for the two branch subnets', why: 'Two more repetitions of the same five lines. Note R1 is not attached to either of those networks.' },
    { t: 'PHASE 5 — Renew both local PCs and confirm they receive addresses, gateways and DNS servers', why: 'The local case works immediately, because these PCs share a broadcast domain with the server.' },
    { t: 'PHASE 6 — Try renewing a branch PC and watch it fail', why: 'Feel the failure before fixing it. Routers drop broadcasts, so the request never leaves the branch LAN.' },
    { t: 'Add a helper address on R2 facing its LAN, and renew the branch PC again', why: 'The relay converts the broadcast into a unicast to the real server, stamping it with its own interface address so the server knows which pool to use.' },
    { t: 'PHASE 7 — Repeat the whole relay configuration on R3 for the second branch', why: 'Second relay, same command, different router. This is the repetition that makes the concept stick.' },
    { t: 'PHASE 8 — Inspect the server\'s bindings and every client\'s full configuration', why: 'Two ends of the same lease: the server\'s record of who holds what, and each client\'s view including its MAC and DHCP status.' },
    { t: 'PHASE 9 — Remove one pool, confirm it has gone, then rebuild it', why: 'Deleting a pool on a live network stops new leases for that subnet immediately. Doing it deliberately once removes the fear.' },
    { t: 'Try putting a helper address on the wrong interface and reason about why it would not work', why: 'The helper belongs on the interface that HEARS the clients, not the one facing the server. Getting that backwards is the classic mistake.' },
    { t: 'PHASE 10 — On SW1, enable DHCP snooping, scope it to VLAN 1, and trust only the uplink toward R1', why: 'Every port starts untrusted. Server messages arriving from a desk port are dropped, which kills rogue DHCP servers and the man-in-the-middle attack they enable.' },
    { t: 'Renew a local PC one final time to prove the security did not break the legitimate flow', why: 'Hardening that breaks real traffic is just an outage. Client requests are still fine from untrusted ports — only server replies are restricted.' },
  ],
  steps: [
    /* ---- PHASE 1: baseline ---- */
    { d: 'PC1', t: 'Nothing yet at head office.', c: ['ipconfig'] },
    { d: 'PC3', t: 'Nothing at branch one either.', c: ['ipconfig'] },
    { d: 'PC4', t: 'Or branch two.', c: ['ipconfig'], note: 'Four clients, all asking, nobody answering.' },

    /* ---- PHASE 2: exclusions, both forms, three subnets ---- */
    { d: 'R1', t: 'Exclude the local gateway with the single-address form.', c: ['enable', 'configure terminal', 'ip dhcp excluded-address 10.0.1.1'], note: 'One address. Use this form for a gateway, a printer, anything with a fixed address.' },
    { d: 'R1', t: 'Now exclude the rest of the low range with the two-address form.', c: ['ip dhcp excluded-address 10.0.1.2 10.0.1.9'], note: 'Two addresses define a range. Reserving the bottom of every subnet for infrastructure is a near-universal convention.' },
    { d: 'R1', t: 'Protect both branch subnets the same way.', c: ['ip dhcp excluded-address 10.0.2.1 10.0.2.9', 'ip dhcp excluded-address 10.0.3.1 10.0.3.9', 'do show running-config'], note: 'Four exclusion lines covering three subnets. Always do this before the pools exist.' },

    /* ---- PHASE 3: first pool ---- */
    { d: 'R1', t: 'Create the local pool and define which subnet it serves.', c: ['ip dhcp pool LAN1', 'network 10.0.1.0 255.255.255.0'], note: 'The network line is what ties a pool to a subnet. Note the prompt changes to (dhcp-config)#.' },
    { d: 'R1', t: 'Add the gateway and DNS options.', c: ['default-router 10.0.1.1', 'dns-server 8.8.8.8'], note: 'Without a default router a client can talk to its own subnet and nothing else. These options are what make a lease useful.' },
    { d: 'R1', t: 'And the domain name and lease duration.', c: ['domain-name netdrill.lab', 'lease 7', 'exit'], note: '<code>lease 7</code> is seven days. The longer form is <code>lease days hours minutes</code>; guest networks often use hours instead.' },

    /* ---- PHASE 4: two more pools ---- */
    { d: 'R1', t: 'Pool two — for a subnet R1 is not even attached to.', c: ['ip dhcp pool LAN2', 'network 10.0.2.0 255.255.255.0', 'default-router 10.0.2.1', 'dns-server 8.8.8.8', 'domain-name netdrill.lab', 'lease 7', 'exit'], note: 'R1 has no interface in 10.0.2.0/24. It will select this pool based on where the relayed request came from.' },
    { d: 'R1', t: 'Pool three — the second branch.', c: ['ip dhcp pool LAN3', 'network 10.0.3.0 255.255.255.0', 'default-router 10.0.3.1', 'dns-server 8.8.8.8', 'domain-name netdrill.lab', 'lease 7', 'end', 'show running-config'], note: 'Three pools, fifteen lines, one server. The pattern should be automatic by the third time.' },

    /* ---- PHASE 5: local clients ---- */
    { d: 'PC1', t: 'The first local client leases immediately.', c: ['ipconfig /renew', 'ipconfig /all'], note: 'Look at the gateway and DNS server — they came from the pool options, not from the PC.' },
    { d: 'PC2', t: 'And the second gets a different address from the same pool.', c: ['ipconfig /renew', 'ipconfig'], note: 'Both above .9, because the exclusions kept the server away from the reserved range.' },
    { d: 'R1', t: 'Check the server\'s record of those two leases.', c: ['show ip dhcp binding'], note: 'Two bindings so far. Each shows the address, the client hardware address and the lease type.' },

    /* ---- PHASE 6: relay at branch one ---- */
    { d: 'PC3', t: 'The branch client fails — its broadcast dies at R2.', c: ['ipconfig /renew'], note: 'This is the whole point of the phase. A router will not forward a broadcast, so the request never leaves the branch LAN.' },
    { d: 'R2', t: 'Relay the broadcast to the real server.', c: ['enable', 'configure terminal', 'interface g0/0', 'ip helper-address 10.0.12.1', 'end', 'show ip interface g0/0'], note: 'The helper goes on the interface facing the CLIENTS. Look for "Helper address is 10.0.12.1" in the output.' },
    { d: 'PC3', t: 'Try again — this time it works.', c: ['ipconfig /renew', 'ipconfig /all'], note: 'The address comes from 10.0.2.x. R1 chose pool LAN2 because R2 stamped the relayed request with its own 10.0.2.1 interface address.' },

    /* ---- PHASE 7: relay at branch two ---- */
    { d: 'PC4', t: 'Second branch, same failure.', c: ['ipconfig /renew'] },
    { d: 'R3', t: 'Same fix, different router.', c: ['enable', 'configure terminal', 'interface g0/0', 'ip helper-address 10.0.13.1', 'end', 'show ip interface g0/0'] },
    { d: 'PC4', t: 'And it leases from the third pool.', c: ['ipconfig /renew', 'ipconfig /all'], note: 'Three subnets, three pools, one server, two relays. That is a complete small-network DHCP design.' },

    /* ---- PHASE 8: bindings and client views ---- */
    { d: 'R1', t: 'All four leases from one table.', c: ['show ip dhcp binding'], note: 'Four bindings across three different subnets, served by a router attached to only one of them.' },
    { d: 'PC1', t: 'The client side of the same lease.', c: ['ipconfig /all'], note: 'MAC address, DHCP enabled, address, mask, gateway and DNS — everything the lease delivered.' },
    { d: 'PC4', t: 'And from the far branch.', c: ['ipconfig /all'], note: 'Identical option set, different subnet. Consistency across sites is exactly what central DHCP buys you.' },

    /* ---- PHASE 9: pool removal and the helper mistake ---- */
    { d: 'R1', t: 'Remove one pool and confirm it has gone.', c: ['configure terminal', 'no ip dhcp pool LAN3', 'do show running-config'], note: 'Pool LAN3 has vanished. Existing leases survive until they expire, but no new client in that subnet can get one.' },
    { d: 'R1', t: 'Rebuild it.', c: ['ip dhcp pool LAN3', 'network 10.0.3.0 255.255.255.0', 'default-router 10.0.3.1', 'dns-server 8.8.8.8', 'domain-name netdrill.lab', 'lease 7', 'end', 'show running-config'], note: 'Retyped in full — there is no way to edit a pool back into existence.' },
    { d: 'R3', t: 'Demonstrate the classic mistake: helper on the wrong interface.', c: ['configure terminal', 'interface g0/1', 'ip helper-address 10.0.13.1', 'do show ip interface g0/1'], note: 'G0/1 faces the server, not the clients. No client broadcast ever arrives on this interface, so the helper here accomplishes nothing.' },
    { d: 'R3', t: 'Remove the pointless helper and confirm the correct one remains.', c: ['no ip helper-address 10.0.13.1', 'end', 'show ip interface g0/1', 'show ip interface g0/0'], note: 'G0/1 is clean; G0/0 — the client-facing interface — keeps the helper that actually does the work.' },
    { d: 'PC4', t: 'Confirm branch two still leases correctly.', c: ['ipconfig /renew', 'ipconfig'] },

    /* ---- PHASE 10: snooping ---- */
    { d: 'SW1', t: 'Turn on DHCP snooping globally.', c: ['enable', 'configure terminal', 'service dhcp', 'ip dhcp snooping', 'do show ip dhcp snooping'], note: 'Enabled, but no VLANs scoped yet — so nothing is actually being inspected. The two-step enablement is a favourite exam detail.' },
    { d: 'SW1', t: 'Scope it to the VLAN the hosts live in.', c: ['ip dhcp snooping vlan 1', 'do show ip dhcp snooping'], note: 'Now filtering is live. Server messages arriving on untrusted ports will be dropped.' },
    { d: 'SW1', t: 'Trust only the uplink toward the real server.', c: ['interface g0/1', 'ip dhcp snooping trust', 'end', 'show ip dhcp snooping'], note: 'F0/1 and F0/2 stay untrusted by default. A rogue server plugged into either would have its offers discarded on arrival.' },
    { d: 'PC1', t: 'Prove legitimate clients still work.', c: ['ipconfig /renew', 'ipconfig'], note: 'Client requests are permitted from untrusted ports; only server replies are restricted. Security that does not break the service.' },
    { d: 'PC2', t: 'And the second local client.', c: ['ipconfig /renew'] },
    { d: 'SW1', t: 'Switch snooping off and straight back on, so both directions are familiar.', c: ['configure terminal', 'no ip dhcp snooping', 'do show ip dhcp snooping', 'ip dhcp snooping', 'ip dhcp snooping vlan 1', 'end', 'show ip dhcp snooping'], note: 'The global "no" form disables inspection everywhere at once while leaving the trusted-port settings in place — so re-enabling takes two lines, not four.' },
    { d: 'R1', t: 'Final check and save.', c: ['show ip dhcp binding', 'write memory'] },
    { d: 'R2', t: 'Save.', c: ['write memory'] },
    { d: 'R3', t: 'Save.', c: ['write memory'] },
    { d: 'SW1', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show ip dhcp binding', 'show ip dhcp snooping', 'show ip interface g0/0', 'show running-config'],
  explain: `<h3>DORA</h3>
<p>Four messages: <b>Discover</b> (client broadcasts "is anyone there?"), <b>Offer</b> (a server proposes an address), <b>Request</b> (the client formally asks for it), <b>Acknowledge</b> (the server confirms and starts the lease). Discover and Request are broadcasts, which is precisely why a router in the path breaks the process.</p>
<h3>Relay and the giaddr field</h3>
<p><code>ip helper-address</code> turns the client's broadcast into a unicast aimed at the server and fills in the <b>gateway IP address (giaddr)</b> field with the receiving interface's own address. The server reads giaddr to decide which pool the client belongs to — which is how one router serves subnets it is not attached to. The command belongs on the interface facing the <em>clients</em>; on the server-facing interface it does nothing at all, because no client broadcast ever arrives there.</p>
<h3>Pool options</h3>
<p><code>network</code> defines which subnet the pool serves and is mandatory. <code>default-router</code> and <code>dns-server</code> are what clients actually need to function — without a gateway a client can reach its own subnet and nothing else. <code>domain-name</code> completes unqualified hostnames. <code>lease</code> sets duration: short leases suit guest networks with high turnover, long ones suit stable offices.</p>
<h3>Exclusions come first</h3>
<p><code>ip dhcp excluded-address</code> takes either one address or a start-and-end pair. Configure exclusions <em>before</em> the pool exists, because the moment a pool is active the server may lease the very address you were about to reserve. Reserving the bottom of each subnet for infrastructure is the usual convention.</p>
<h3>Snooping: trusted and untrusted</h3>
<p>Snooping classifies DHCP messages by type. Client messages are fine anywhere; server messages (Offer, Ack, Nak) are only accepted on <b>trusted</b> ports. Every port is untrusted until you say otherwise, so you trust the uplink toward the legitimate server and nothing else. Enabling it takes two steps — globally, then per VLAN — and the first alone does nothing.</p>
<p>The switch also builds a binding table of MAC ↔ IP ↔ port ↔ VLAN, which Dynamic ARP Inspection later uses to stop ARP spoofing.</p>`,
  checks: [
    { desc: 'Single-address and range exclusions both used on the local subnet', fn: H => { const ex = H.d('R1').dhcp.excluded; return ex.some(e => e[0] === '10.0.1.1' && e[1] === '10.0.1.1') && ex.some(e => e[0] === '10.0.1.2' && e[1] === '10.0.1.9'); } },
    { desc: 'Both branch subnets have exclusions too', fn: H => { const ex = H.d('R1').dhcp.excluded; return ex.some(e => e[0] === '10.0.2.1') && ex.some(e => e[0] === '10.0.3.1'); } },
    { desc: 'All three pools exist with the complete option set', fn: H => ['10.0.1.0', '10.0.2.0', '10.0.3.0'].every(n => { const p = Object.values(H.d('R1').dhcp.pools).find(x => x.network === n); return !!(p && p.router && p.dns && p.domain && p.lease); }) },
    { desc: 'Pool LAN3 was rebuilt after being deleted', fn: H => !!H.d('R1').dhcp.pools['LAN3'] && H.d('R1').dhcp.pools['LAN3'].network === '10.0.3.0' },
    { desc: 'R2 relays DHCP from its client-facing interface', fn: H => H.i('R2', 'g0/0').helpers.includes('10.0.12.1') },
    { desc: 'R3 relays from G0/0 and the mistaken helper on G0/1 was removed', fn: H => H.i('R3', 'g0/0').helpers.includes('10.0.13.1') && H.i('R3', 'g0/1').helpers.length === 0 },
    { desc: 'Both local PCs leased addresses from the local pool', fn: H => ['PC1', 'PC2'].every(p => { const n = ND.pcNet(H.topo, H.d(p)); return !!(n.ip && n.ip.startsWith('10.0.1.') && n.gw === '10.0.1.1'); }) },
    { desc: 'The two local PCs got different addresses', fn: H => ND.pcNet(H.topo, H.d('PC1')).ip !== ND.pcNet(H.topo, H.d('PC2')).ip },
    { desc: 'Branch one PC leased through its relay', fn: H => { const n = ND.pcNet(H.topo, H.d('PC3')); return !!(n.ip && n.ip.startsWith('10.0.2.') && n.gw === '10.0.2.1'); } },
    { desc: 'Branch two PC leased through its relay', fn: H => { const n = ND.pcNet(H.topo, H.d('PC4')); return !!(n.ip && n.ip.startsWith('10.0.3.') && n.gw === '10.0.3.1'); } },
    { desc: 'Every lease avoided the excluded low range', fn: H => ['PC1', 'PC2', 'PC3', 'PC4'].every(p => { const ip = ND.pcNet(H.topo, H.d(p)).ip; return ip && +ip.split('.')[3] >= 10; }) },
    { desc: 'All four clients received the DNS server option', fn: H => ['PC1', 'PC2', 'PC3', 'PC4'].every(p => ND.pcNet(H.topo, H.d(p)).dns === '8.8.8.8') },
    { desc: 'DHCP snooping enabled on SW1 and scoped to VLAN 1', fn: H => H.d('SW1').dhcp.snooping.enabled && H.d('SW1').dhcp.snooping.vlans.includes(1) },
    { desc: 'Only the uplink is trusted; desk ports remain untrusted', fn: H => H.i('SW1', 'g0/1').snoopTrust && !H.i('SW1', 'f0/1').snoopTrust && !H.i('SW1', 'f0/2').snoopTrust },
    { desc: 'All four devices saved', fn: H => ['R1', 'R2', 'R3', 'SW1'].every(d => H.saved(d)) },
  ],
});

/* ============================================================= */
L({
  id: 'y4-switch-security', vol: 2, tier: 'deep', day: 'Days 41, 47', title: 'SSH & Port Security — Full Drill',
  topics: 'the five SSH prerequisites built 3 times · deliberate prerequisite errors · vty hardening with access-class · port security on 6 ports · all three violation modes · sticky and static MACs',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'f0/5', 'f0/6', 'g0/1'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.10', mask: '255.255.255.0', gw: '192.168.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.11', mask: '255.255.255.0', gw: '192.168.1.1' } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.2.10', mask: '255.255.255.0', gw: '192.168.2.1' } },
  ],
  links: [
    ['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2'], ['SW1', 'g0/1', 'R1', 'g0/0'],
    ['R1', 'g0/1', 'SW2', 'g0/1'], ['SW2', 'f0/1', 'PC3', 'e0'],
  ],
  layout: { PC1: [30, 22], PC2: [30, 92], SW1: [125, 58], R1: [215, 58], SW2: [305, 58], PC3: [375, 58] },
  setupAll: topo => {
    const set = (id, ifn, ip) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask: '255.255.255.0' }; i.shutdown = false; };
    set('R1', 'g0/0', '192.168.1.1'); set('R1', 'g0/1', '192.168.2.1');
    topo.devs.R1.hostname = 'R1';
  },
  intro: `<b>The situation:</b> two switches and a router that can only be configured from a console cable, with every port live and willing to accept whatever somebody plugs in.<br><b>Your goal:</b> lock all three down completely. You will build the full SSH stack <b>three separate times</b> — deliberately triggering the prerequisite errors first so you understand why the order matters — restrict who may even attempt to connect, then pin six desk ports to the devices that belong on them, drilling all three violation reactions and both ways of specifying a permitted MAC address.`,
  tasks: [
    { t: 'PHASE 1 — On SW1, deliberately try to generate RSA keys before setting a domain name, and read the refusal', why: 'The key is named hostname.domain, so IOS cannot build one until both exist. Meeting the error on purpose is how the ordering sticks.' },
    { t: 'Try to force SSH version 2 before any keys exist, and read that refusal too', why: 'Version 2 requires keys of at least 768 bits. Two errors, two prerequisites, both discovered before they bite you in an exam.' },
    { t: 'PHASE 2 — Now build the stack in the right order: hostname, SVI, gateway, domain, 2048-bit keys, version 2, user, vty lines', why: 'Eight steps that each depend on the one before. This is the sequence to be able to produce from memory.' },
    { t: 'Add a management access list and attach it to the vty lines with access-class, plus an idle timeout', why: 'Defence in depth: encryption, then authentication, then a restriction on which source addresses may even try.' },
    { t: 'PHASE 3 — Build the identical SSH stack on SW2 with its own addressing', why: 'Second device, same eight steps. The repetition is the point of this lab.' },
    { t: 'PHASE 4 — Build it a third time on R1, noting what differs on a router', why: 'A router needs no SVI — it has real routed interfaces. Everything else is word for word identical.' },
    { t: 'PHASE 5 — On SW1 F0/1: static access port, port security, maximum 2, sticky learning, default violation mode', why: 'Order matters — port security is rejected on a port still in dynamic mode. A maximum of 2 suits a desk phone with a PC behind it.' },
    { t: 'On SW1 F0/2: maximum 1 with violation mode restrict', why: 'Restrict drops the offending frames and logs and counts each one, but leaves the port up. The default, shutdown, disables it entirely.' },
    { t: 'On SW1 F0/3: violation mode protect with a manually typed MAC address', why: 'Protect drops silently — no log, no counter — which is why it is the trick answer in exam questions. A static MAC is the alternative to sticky learning.' },
    { t: 'PHASE 6 — Repeat port security on SW2\'s ports with different values', why: 'Three more secured ports on a second switch. Six in total across the lab.' },
    { t: 'PHASE 7 — Generate traffic so the sticky ports learn, then find the learned addresses in the running configuration', why: 'Sticky learning writes the address into the config as though you had typed it. Save the config and the binding survives a reboot.' },
    { t: 'PHASE 8 — Shut down every unused port on both switches', why: 'Port security governs who may use a live port; disabling unused ports removes the opportunity altogether.' },
    { t: 'PHASE 9 — Remove port security from one port entirely, then put it back', why: 'The "no" form, and a reminder that disabling security is a single command anyone with access can type.' },
    { t: 'PHASE 10 — Sweep the verification commands on all three devices', why: 'show ip ssh for the management plane, show port-security for the access layer, plus the per-interface detail view.' },
  ],
  steps: [
    /* ---- PHASE 1: prerequisite errors ---- */
    { d: 'SW1', expectErr: true, t: 'Try to generate keys with no domain name set, and read the refusal.', c: ['enable', 'configure terminal', 'crypto key generate rsa modulus 2048'], note: 'IOS refuses: it cannot name a key without a domain. The key will be called hostname.domain, so both must exist first.' },
    { d: 'SW1', expectErr: true, t: 'Now try to force SSH version 2 with no keys, and read that refusal.', c: ['ip ssh version 2'], note: 'Also refused — version 2 needs RSA keys of at least 768 bits. Two prerequisites discovered before they could catch you out.' },

    /* ---- PHASE 2: full stack on SW1 ---- */
    { d: 'SW1', t: 'Step 1 and 2 — name the switch and give it a management address.', c: ['hostname SW1', 'interface vlan 1', 'ip address 192.168.1.2 255.255.255.0', 'no shutdown', 'exit'], note: 'A layer-2 switch has no routed ports, so its address lives on a virtual VLAN interface.' },
    { d: 'SW1', t: 'Step 3 — a default gateway so it can answer remote traffic.', c: ['ip default-gateway 192.168.1.1'], note: 'Without this the switch replies only to hosts on its own subnet. A layer-3 switch would use its routing table instead.' },
    { d: 'SW1', t: 'Step 4 and 5 — domain name, then the keys that refused earlier.', c: ['ip domain-name netdrill.lab', 'crypto key generate rsa modulus 2048'], note: 'Now it works. The key is named SW1.netdrill.lab — which is exactly why the first two steps had to come first.' },
    { d: 'SW1', t: 'Step 6 and 7 — enforce version 2 and create an administrator account.', c: ['ip ssh version 2', 'username admin secret Str0ngPass'], note: '<code>secret</code> stores a hash; <code>password</code> would store it readable. Always secret.' },
    { d: 'SW1', t: 'Step 8 — point the vty lines at the user database and ban telnet.', c: ['line vty 0 4', 'login local', 'transport input ssh', 'exec-timeout 5 0', 'exit'], note: 'Three hardening steps on one set of lines: who may log in, how they may connect, and how long an idle session survives.' },
    { d: 'SW1', t: 'Restrict which sources may even attempt a connection.', c: ['ip access-list standard MGMT-ONLY', 'permit 192.168.1.0 0.0.0.255', 'exit', 'line vty 0 4', 'access-class MGMT-ONLY in', 'end', 'show ip ssh'], note: '<code>access-class</code> filters connections TO the device. It is not <code>ip access-group</code>, which filters traffic through it.' },

    /* ---- PHASE 3: repeat on SW2 ---- */
    { d: 'SW2', t: 'Second device — the whole stack again, its own addressing.', c: ['enable', 'configure terminal', 'hostname SW2', 'interface vlan 1', 'ip address 192.168.2.2 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 192.168.2.1', 'ip domain-name netdrill.lab', 'crypto key generate rsa modulus 2048', 'ip ssh version 2', 'username admin secret Str0ngPass'], note: 'Try this one from memory before revealing it. Eight steps in the same order every time.' },
    { d: 'SW2', t: 'And the vty hardening.', c: ['line vty 0 4', 'login local', 'transport input ssh', 'exec-timeout 5 0', 'exit', 'ip access-list standard MGMT-ONLY', 'permit 192.168.2.0 0.0.0.255', 'permit 192.168.1.0 0.0.0.255', 'exit', 'line vty 0 4', 'access-class MGMT-ONLY in', 'end', 'show ip ssh'], note: 'Two permitted management subnets this time — the local one and the admin LAN on the other side of the router.' },

    /* ---- PHASE 4: third time, on a router ---- */
    { d: 'R1', t: 'Third repetition, on a router — and with the newer spelling of the domain command.', c: ['enable', 'configure terminal', 'ip domain name netdrill.lab', 'crypto key generate rsa modulus 2048', 'ip ssh version 2', 'username admin secret Str0ngPass'], note: 'No SVI and no default gateway — a router already has routed interfaces and its own routing table. Note the domain command: older IOS spells it <code>ip domain-name</code>, newer releases <code>ip domain name</code> with a space. Both appear in exam questions and both work here.' },
    { d: 'R1', t: 'Same vty hardening on the router.', c: ['line vty 0 4', 'login local', 'transport input ssh', 'exec-timeout 5 0', 'exit', 'ip access-list standard MGMT-ONLY', 'permit 192.168.1.0 0.0.0.255', 'exit', 'line vty 0 4', 'access-class MGMT-ONLY in', 'end', 'show ip ssh'], note: 'Three devices, three identical management configurations. That consistency is what makes a network maintainable.' },

    /* ---- PHASE 5: port security on SW1 ---- */
    { d: 'SW1', expectErr: true, t: 'Try port security on a dynamic-mode port first, and read the rejection.', c: ['configure terminal', 'interface f0/1', 'switchport port-security'], note: 'Rejected. Port security requires a port already pinned to static access or trunk mode — a dynamic port could change role underneath it.' },
    { d: 'SW1', t: 'Set the mode first, then enable it properly.', c: ['switchport mode access', 'switchport access vlan 1', 'switchport port-security'], note: 'Now it takes. This ordering catches almost everybody once — better here than in an exam.' },
    { d: 'SW1', t: 'Allow two MACs, learned automatically, keeping the default violation mode.', c: ['switchport port-security maximum 2', 'switchport port-security mac-address sticky', 'exit'], note: 'Two addresses suits a desk phone with a PC daisy-chained behind it. The default violation action is shutdown.' },
    { d: 'SW1', t: 'Second port — one MAC, and the gentler violation mode.', c: ['interface f0/2', 'switchport mode access', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security violation restrict', 'switchport port-security mac-address sticky', 'exit'], note: 'Restrict keeps the port up while dropping and counting offending frames. Shutdown would err-disable it entirely.' },
    { d: 'SW1', t: 'Third port — silent dropping and a hand-typed MAC address.', c: ['interface f0/3', 'switchport mode access', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security violation protect', 'switchport port-security mac-address aaaa.bbbb.cccc', 'exit'], note: 'Protect drops with no log and no counter — invisible, which is exactly why it is usually the wrong choice. The static MAC is the alternative to sticky.' },

    /* ---- PHASE 6: port security on SW2 ---- */
    { d: 'SW2', t: 'SW2\'s host port — sticky with a maximum of 3.', c: ['configure terminal', 'interface f0/1', 'switchport mode access', 'switchport port-security', 'switchport port-security maximum 3', 'switchport port-security mac-address sticky', 'exit'], note: 'Three addresses would suit a small unmanaged switch or a phone plus two devices behind it.' },
    { d: 'SW2', t: 'Two more secured ports with different reactions.', c: ['interface f0/2', 'switchport mode access', 'switchport port-security', 'switchport port-security violation restrict', 'interface f0/3', 'switchport mode access', 'switchport port-security', 'switchport port-security violation protect', 'switchport port-security mac-address dddd.eeee.ffff', 'exit'], note: 'Six secured ports across two switches, covering all three violation modes twice.' },

    /* ---- PHASE 7: sticky learning ---- */
    { d: 'PC1', t: 'Generate traffic so the sticky ports have something to learn.', c: ['ipconfig', 'ping 192.168.1.11', 'ping 192.168.1.1'], note: 'Sticky learning needs a frame to learn from. No traffic, nothing learned.' },
    { d: 'PC3', t: 'And on the other switch.', c: ['ipconfig', 'ping 192.168.2.1'] },
    { d: 'SW1', t: 'Find the addresses the switch wrote into its own configuration.', c: ['end', 'show running-config'], note: 'Look under F0/1 and F0/2 for <code>switchport port-security mac-address sticky</code> lines carrying real MAC addresses. The switch typed those, not you.' },
    { d: 'SW2', t: 'Same on the second switch.', c: ['end', 'show running-config'] },

    /* ---- PHASE 8: shut the unused ports ---- */
    { d: 'SW1', t: 'Disable every port nobody uses.', c: ['configure terminal', 'interface range f0/4 - 6', 'description UNUSED', 'shutdown', 'end', 'show interfaces status'], note: 'Port security controls who may use a live port; shutting unused ports removes the opportunity entirely.' },
    { d: 'SW2', t: 'And on SW2.', c: ['configure terminal', 'interface f0/4', 'description UNUSED', 'shutdown', 'end', 'show interfaces status'] },

    /* ---- PHASE 9: removal and rebuild ---- */
    { d: 'SW1', t: 'Remove port security from one port entirely.', c: ['configure terminal', 'interface f0/3', 'no switchport port-security', 'do show port-security'], note: 'F0/3 has dropped off the secured list. One command, and the protection is gone — which is why console and vty access matter so much.' },
    { d: 'SW1', t: 'Put it back exactly as it was.', c: ['switchport port-security', 'switchport port-security maximum 1', 'switchport port-security violation protect', 'switchport port-security mac-address aaaa.bbbb.cccc', 'end', 'show port-security'], note: 'Restored. Note the static MAC had to be retyped — removing port security discards its configuration.' },

    /* ---- PHASE 10: verification sweep ---- */
    { d: 'SW1', t: 'The secured-port summary and one port in detail.', c: ['show port-security', 'show port-security interface f0/1', 'show port-security interface f0/2'], note: 'The summary shows max versus current addresses and the violation count per port; the detail view shows one port fully, including Secure-up or Secure-shutdown status.' },
    { d: 'SW2', t: 'Same two views on SW2.', c: ['show port-security', 'show port-security interface f0/1'] },
    { d: 'SW1', t: 'And the management plane.', c: ['show ip ssh', 'show running-config', 'write memory'] },
    { d: 'SW2', t: 'Save.', c: ['show ip ssh', 'write memory'] },
    { d: 'R1', t: 'Save.', c: ['show ip ssh', 'write memory'] },
  ],
  verify: ['show ip ssh', 'show port-security', 'show port-security interface f0/1', 'show interfaces status', 'show running-config'],
  explain: `<h3>The five SSH prerequisites, in order</h3>
<p>SSH will not run until all of these exist: <b>(1)</b> a hostname that is not the default, <b>(2)</b> a domain name, <b>(3)</b> RSA keys of at least 768 bits for version 2, <b>(4)</b> a user database or AAA, and <b>(5)</b> vty lines set to <code>login local</code>. Miss any one and the exam question becomes "why can the administrator not connect?"</p>
<p>The hostname and domain matter because the key pair is named after them — which is why IOS refuses to generate keys until both are set, as you saw deliberately in Phase 1.</p>
<h3>Protecting the device versus protecting traffic</h3>
<p><code>ip access-group</code> on an interface filters packets passing <em>through</em> the device. <code>access-class</code> on the vty lines filters connections <em>to</em> it. Layered with SSH encryption and local authentication, that gives three independent barriers — and only the last of them cares where the connection came from.</p>
<h3>Port security violation modes</h3>
<table><tr><th>Mode</th><th>Drops traffic</th><th>Logs</th><th>Counter</th><th>Port state</th></tr>
<tr><td><b>shutdown</b> (default)</td><td>Yes</td><td>Yes</td><td>Yes</td><td>err-disabled</td></tr>
<tr><td><b>restrict</b></td><td>Yes</td><td>Yes</td><td>Yes</td><td>stays up</td></tr>
<tr><td><b>protect</b></td><td>Yes</td><td>No</td><td>No</td><td>stays up</td></tr></table>
<p>Recovery from shutdown is a manual <code>shutdown</code> then <code>no shutdown</code>, or errdisable auto-recovery. Protect is the mode that hides problems from you, which is precisely why exam questions single it out.</p>
<h3>Sticky versus static MAC addresses</h3>
<p><b>Sticky</b> learns whatever plugs in and writes it into the running configuration automatically — convenient, and it survives reboots once you save. <b>Static</b> means you type the permitted address yourself, which is tighter but does not scale. The default maximum is one address; a desk phone with a PC behind it needs two or three.</p>
<h3>Why any of this matters</h3>
<p>Port security defeats MAC flooding, where an attacker fills the switch's address table until it fails open and floods every frame like a hub, letting them capture traffic they should never see. It also stops the far more mundane problem of somebody plugging an unauthorised access point into a spare desk port.</p>`,
  checks: [
    { desc: 'All three devices have a domain name and 2048-bit RSA keys', fn: H => ['SW1', 'SW2', 'R1'].every(d => !!H.d(d).domainName && H.d(d).rsaKey >= 2048) },
    { desc: 'All three enforce SSH version 2 with a local admin account', fn: H => ['SW1', 'SW2', 'R1'].every(d => H.d(d).sshVersion === 2 && !!H.d(d).users.admin) },
    { desc: 'All three vty configs: login local, ssh only, idle timeout', fn: H => ['SW1', 'SW2', 'R1'].every(d => { const v = H.d(d).lines.vty; return v.loginLocal && v.transport === 'ssh' && !!v.execTimeout; }) },
    { desc: 'All three restrict management sources with access-class', fn: H => ['SW1', 'SW2', 'R1'].every(d => H.d(d).lines.vty.accessClass === 'MGMT-ONLY' && !!H.d(d).acls['MGMT-ONLY']) },
    { desc: 'SW2\'s management list permits two subnets', fn: H => H.d('SW2').acls['MGMT-ONLY']?.entries.length === 2 },
    { desc: 'Both switches have management SVIs and default gateways', fn: H => H.hasIp('SW1', 'vlan1', '192.168.1.2') && H.d('SW1').defaultGateway === '192.168.1.1' && H.hasIp('SW2', 'vlan1', '192.168.2.2') && H.d('SW2').defaultGateway === '192.168.2.1' },
    { desc: 'SW1 F0/1: access mode, port security, max 2, sticky', fn: H => { const i = H.i('SW1', 'f0/1'); return i.swMode === 'access' && i.portSec?.enabled && i.portSec.max === 2 && i.portSec.sticky; } },
    { desc: 'SW1 F0/2: max 1 with violation restrict and sticky', fn: H => { const ps = H.i('SW1', 'f0/2').portSec; return ps?.enabled && ps.max === 1 && ps.violation === 'restrict' && ps.sticky; } },
    { desc: 'SW1 F0/3: rebuilt after removal, protect mode with a static MAC', fn: H => { const ps = H.i('SW1', 'f0/3').portSec; return ps?.enabled && ps.violation === 'protect' && ps.macs.includes('aaaa.bbbb.cccc'); } },
    { desc: 'SW2 has three secured ports including one with max 3', fn: H => H.i('SW2', 'f0/1').portSec?.max === 3 && H.i('SW2', 'f0/2').portSec?.violation === 'restrict' && H.i('SW2', 'f0/3').portSec?.macs.includes('dddd.eeee.ffff') },
    { desc: 'All three violation modes are in use across the two switches', fn: H => { const modes = new Set(); for (const [s, ps] of [['SW1', ['f0/1', 'f0/2', 'f0/3']], ['SW2', ['f0/1', 'f0/2', 'f0/3']]]) for (const p of ps) { const x = H.i(s, p).portSec; if (x?.enabled) modes.add(x.violation); } return modes.has('shutdown') && modes.has('restrict') && modes.has('protect'); } },
    { desc: 'Sticky learning captured real MACs on SW1 and SW2', fn: H => (H.i('SW1', 'f0/1').portSec?.stickyLearned || []).length > 0 && (H.i('SW2', 'f0/1').portSec?.stickyLearned || []).length > 0 },
    { desc: 'Unused ports shut down on both switches', fn: H => ['f0/4', 'f0/5', 'f0/6'].every(p => H.i('SW1', p).shutdown) && H.i('SW2', 'f0/4').shutdown },
    { desc: 'All three devices saved', fn: H => ['SW1', 'SW2', 'R1'].every(d => H.saved(d)) },
  ],
});

/* ============================================================= */
L({
  id: 'y5-mgmt-services', vol: 2, tier: 'deep', day: 'Days 35-40', title: 'NTP, Syslog & Discovery — Full Drill',
  topics: 'NTP master and a client chain · every syslog destination and severity · CDP global vs per-interface · LLDP · repeated across 5 devices',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'R3', type: 'router', ifaces: ['g0/0'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.100', mask: '255.255.255.0', gw: '10.0.0.1' } },
  ],
  links: [
    ['SRV', 'e0', 'SW1', 'f0/1'], ['SW1', 'g0/1', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0'],
    ['R2', 'g0/1', 'R3', 'g0/0'], ['R2', 'g0/2', 'SW2', 'g0/1'],
  ],
  layout: { SRV: [30, 40], SW1: [100, 40], R1: [180, 40], R2: [260, 40], R3: [355, 40], SW2: [260, 110] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    const M24 = '255.255.255.0', M30 = '255.255.255.252';
    set('R1', 'g0/0', '10.0.0.1', M24); set('R1', 'g0/1', '10.0.12.1', M30);
    set('R2', 'g0/0', '10.0.12.2', M30); set('R2', 'g0/1', '10.0.23.1', M30); set('R2', 'g0/2', '10.0.99.1', M24);
    set('R3', 'g0/0', '10.0.23.2', M30);
    for (const r of ['R1', 'R2', 'R3']) topo.devs[r].hostname = r;
    topo.devs.SW1.hostname = 'SW1'; topo.devs.SW2.hostname = 'SW2';
    topo.devs.R1.staticRoutes.push({ net: '0.0.0.0', mask: '0.0.0.0', via: '10.0.12.2', ad: 1 });
    topo.devs.R2.staticRoutes.push({ net: '10.0.0.0', mask: M24, via: '10.0.12.1', ad: 1 });
    topo.devs.R3.staticRoutes.push({ net: '0.0.0.0', mask: '0.0.0.0', via: '10.0.23.1', ad: 1 });
  },
  intro: `<b>The situation:</b> five devices where nothing agrees on the time, every log message exists only on the box that produced it, and you have no diagram of what is cabled to what.<br><b>Your goal:</b> the three services that make a network operable rather than merely functional. Build an NTP hierarchy — one master and a <b>chain</b> of clients — send logs centrally with the severity filter tuned, and map the whole topology with the discovery protocols before deliberately switching them off again, because the information they hand you helps an intruder just as much as it helps you.`,
  tasks: [
    { t: 'PHASE 1 — Check the clock synchronisation state on all three routers before configuring anything', why: 'Stratum 16 means "I have no trustworthy time source". That is where every unconfigured device starts.' },
    { t: 'PHASE 2 — Make R1 an authoritative time source at stratum 3', why: 'Someone must be the reference. Stratum counts hops from a real clock — 1 is a GPS or atomic source — so a device claiming 3 puts its clients at 4.' },
    { t: 'Point R2 at R1, then point R3 at R2, building a chain rather than a star', why: 'Each hop away adds a stratum. A chain shows how the hierarchy actually propagates, rather than everyone talking to one server.' },
    { t: 'Inspect all three with show ntp status, show ntp associations and show clock', why: 'Status shows whether you are synchronised and to what; associations lists every configured source; a leading asterisk on the clock means the time is NOT authoritative.' },
    { t: 'PHASE 3 — On R1, send logs to the syslog server and set the trap level to warnings', why: 'Logs kept only on a device vanish with it. The severity filter stops routine chatter flooding the server.' },
    { t: 'Experiment with the severity level: try errors, then debugging, then settle on warnings', why: 'Three different levels typed on one router. Seeing them change in show logging makes the 0-7 scale concrete rather than a list to memorise.' },
    { t: 'Add a local logging buffer and turn console logging off', why: 'The buffer gives you recent history with no server round-trip. Disabling console logging stops messages interrupting you mid-command — the blunt alternative to logging synchronous.' },
    { t: 'PHASE 4 — Repeat the whole logging configuration on R2 and on SW1', why: 'Three devices logging to one server is the minimum realistic deployment. Repetition on a switch shows the commands are identical there.' },
    { t: 'PHASE 5 — Generate a real log message by bouncing an interface, then decode its format', why: '%LINK-5-CHANGED is facility LINK, severity 5, mnemonic CHANGED. Reading that structure is a guaranteed exam skill.' },
    { t: 'PHASE 6 — Map the whole network with CDP from three different vantage points', why: 'Summary gives you the topology; detail adds IP addresses and platform strings. Cross-checking from several devices builds a habit worth having.' },
    { t: 'PHASE 7 — Disable CDP on one link only, leaving it running elsewhere', why: 'The per-interface form silences an untrusted edge without losing visibility inside your own network.' },
    { t: 'Then disable CDP device-wide on another router, and confirm the difference between the two commands', why: '"no cdp run" is global; "no cdp enable" is per interface. The exam tests that you know which is which.' },
    { t: 'Re-enable CDP on the interface you silenced, to practise the positive form', why: 'Every command has both directions. Typing cdp enable once makes the pair symmetrical in your memory.' },
    { t: 'PHASE 8 — Enable LLDP on every device and confirm the neighbours reappear', why: 'LLDP is the vendor-neutral equivalent and, unlike CDP, is OFF by default on Cisco gear — so every device needs the command.' },
    { t: 'PHASE 9 — Sweep every verification command across the whole network', why: 'NTP status, logging configuration, CDP and LLDP neighbours. These are the commands you run on a device you have never seen before.' },
  ],
  steps: [
    /* ---- PHASE 1: baseline ---- */
    { d: 'R1', t: 'Unsynchronised starting state.', c: ['enable', 'terminal length 0', 'show ntp status', 'show clock'], note: 'Stratum 16 and "unsynchronized". The asterisk before the time means it is not authoritative.' },
    { d: 'R2', t: 'Same on R2.', c: ['enable', 'terminal length 0', 'show ntp status'] },
    { d: 'R3', t: 'And R3.', c: ['enable', 'terminal length 0', 'show ntp status'], note: 'Three routers, three unreliable clocks, no way to correlate their logs.' },

    /* ---- PHASE 2: NTP hierarchy ---- */
    { d: 'R1', t: 'Make R1 the authoritative source.', c: ['configure terminal', 'ntp master 3', 'end', 'show ntp status'], note: 'Stratum 3 is an arbitrary but sensible claim for a lab. In production you would point at a public pool or a GPS appliance instead.' },
    { d: 'R2', t: 'R2 synchronises to R1.', c: ['configure terminal', 'ntp server 10.0.12.1', 'end', 'show ntp status', 'show ntp associations'], note: 'A client-server relationship over UDP port 123. Devices prefer the lowest stratum they can reach.' },
    { d: 'R3', t: 'R3 synchronises to R2 — a chain, not a star.', c: ['configure terminal', 'ntp server 10.0.23.1', 'end', 'show ntp status', 'show ntp associations'], note: 'Each hop away from the reference adds a stratum. R3 is now two hops from the master.' },
    { d: 'R1', t: 'Confirm the master\'s own view.', c: ['show ntp status', 'show clock'], note: 'No leading asterisk now — the time is authoritative.' },
    { d: 'R3', t: 'And the far end of the chain.', c: ['show clock'], note: 'Three routers, one agreed time. Now their log timestamps can be compared against each other.' },

    /* ---- PHASE 3: syslog on R1 with level experiments ---- */
    { d: 'R1', t: 'Look at the logging configuration before changing it.', c: ['show logging'], note: 'Console logging is on by default; nothing is being sent anywhere else.' },
    { d: 'R1', t: 'Send logs to the central server.', c: ['configure terminal', 'logging host 10.0.0.100', 'do show logging'], note: 'Syslog travels over UDP port 514. The server now receives everything at the default trap level.' },
    { d: 'R1', t: 'Experiment with the severity filter — first errors only.', c: ['logging trap errors', 'do show logging'], note: 'Level 3. Only errors, critical, alerts and emergencies would be exported — quiet, but you would miss link flaps.' },
    { d: 'R1', t: 'Now the opposite extreme.', c: ['logging trap debugging', 'do show logging'], note: 'Level 7 — absolutely everything. Useful while troubleshooting, overwhelming as a permanent setting.' },
    { d: 'R1', t: 'Settle on a sensible production level.', c: ['logging trap warnings', 'do show logging'], note: 'Level 4: warnings and anything more severe. Remember lower numbers mean more severe.' },
    { d: 'R1', t: 'Add a local buffer and silence the console.', c: ['logging buffered 16384', 'no logging console', 'end', 'show logging'], note: 'Read the output carefully — console, buffer and host each have their own independent level.' },

    /* ---- PHASE 4: repeat on R2 and SW1 ---- */
    { d: 'R2', t: 'Same logging configuration on R2.', c: ['configure terminal', 'logging host 10.0.0.100', 'logging trap warnings', 'logging buffered 16384', 'no logging console', 'end', 'show logging'], note: 'Four lines, identical on every device. Consistency is what makes central logging useful.' },
    { d: 'SW1', t: 'And on a switch — exactly the same commands.', c: ['enable', 'configure terminal', 'logging host 10.0.0.100', 'logging trap warnings', 'logging buffered 16384', 'end', 'show logging'], note: 'Nothing about syslog is router-specific. Switches produce just as much worth keeping.' },

    /* ---- PHASE 5: generate and decode a message ---- */
    { d: 'R2', t: 'Bounce an interface to produce a real log message.', c: ['configure terminal', 'interface g0/2', 'shutdown', 'no shutdown', 'end'], note: 'Decode what appears: %LINK-5-CHANGED is facility LINK, severity 5 (notification), mnemonic CHANGED.' },
    { d: 'R2', t: 'Read it back out of the buffer.', c: ['show logging'], note: 'The message is in the local buffer and was also sent to the server — except that severity 5 falls below the warnings trap level, so only the buffer kept it. That is the filter doing its job.' },

    /* ---- PHASE 6: CDP mapping ---- */
    { d: 'R1', t: 'Map the network from R1.', c: ['show cdp', 'show cdp neighbors'], note: 'R1 sees SW1 and R2. "Local Intrfce" is YOUR port, "Port ID" is theirs — getting that backwards is a classic exam mistake.' },
    { d: 'R1', t: 'Now the detailed view.', c: ['show cdp neighbors detail'], note: 'IP addresses and platform strings. Extremely useful to you, equally useful to anyone who should not be on your network.' },
    { d: 'R2', t: 'Cross-check from the middle of the network.', c: ['show cdp neighbors'], note: 'R2 should see R1, R3 and SW2 — three neighbours. Between this and R1\'s view you have the whole topology.' },
    { d: 'SW1', t: 'And from the switch at the edge.', c: ['show cdp neighbors'], note: 'SW1 sees only R1. Edge devices see little, which is itself useful information about where you are.' },

    /* ---- PHASE 7: switching CDP off, two ways ---- */
    { d: 'R2', t: 'Silence CDP on one interface only.', c: ['configure terminal', 'interface g0/1', 'no cdp enable', 'end', 'show cdp neighbors'], note: 'R3 has disappeared while R1 and SW2 remain. This is the per-interface form — surgical.' },
    { d: 'R3', t: 'Now turn CDP off device-wide on another router.', c: ['configure terminal', 'no cdp run', 'end', 'show cdp'], note: '"no cdp run" is global. The device stops speaking CDP entirely, on every port at once.' },
    { d: 'R2', t: 'Re-enable the interface you silenced, to practise the positive form.', c: ['configure terminal', 'interface g0/1', 'cdp enable', 'end', 'show cdp neighbors'], note: 'R3 still does not appear — because R3 itself has CDP switched off globally. Both ends must run it.' },

    /* ---- PHASE 8: LLDP everywhere ---- */
    { d: 'R1', t: 'Enable the vendor-neutral alternative on R1.', c: ['configure terminal', 'lldp run', 'end'], note: 'LLDP is IEEE 802.1AB and is OFF by default on Cisco equipment — the reverse of CDP.' },
    { d: 'R2', t: 'And R2.', c: ['configure terminal', 'lldp run', 'end'] },
    { d: 'R3', t: 'And R3, which has no CDP at all now.', c: ['configure terminal', 'lldp run', 'end'], note: 'R3 will be visible again over LLDP despite being silent on CDP — same topology, different protocol.' },
    { d: 'SW1', t: 'Both switches too.', c: ['configure terminal', 'lldp run', 'end', 'show lldp neighbors'] },
    { d: 'SW2', t: 'The last device.', c: ['enable', 'configure terminal', 'lldp run', 'end', 'show lldp neighbors'], note: 'A device only appears in LLDP output if it too is running LLDP — which is why all five needed the command.' },
    { d: 'SW2', t: 'Turn LLDP off again on one switch, then back on.', c: ['configure terminal', 'no lldp run', 'end', 'show lldp neighbors', 'configure terminal', 'lldp run', 'end', 'show lldp neighbors'], note: 'With LLDP off the switch shows no neighbours at all — and disappears from everybody else\'s LLDP table too, because both ends must run it. Same global on/off pattern as <code>cdp run</code>.' },
    { d: 'R2', t: 'Confirm R3 is reachable by discovery again.', c: ['show lldp neighbors', 'show cdp neighbors'], note: 'Compare the two lists. LLDP shows R3; CDP does not. You have deliberately created that asymmetry.' },

    /* ---- PHASE 9: final sweep ---- */
    { d: 'R1', t: 'Full sweep on R1.', c: ['show ntp status', 'show ntp associations', 'show logging', 'show cdp neighbors', 'show lldp neighbors', 'write memory'] },
    { d: 'R2', t: 'Full sweep on R2.', c: ['show ntp status', 'show logging', 'show cdp neighbors', 'show lldp neighbors', 'write memory'] },
    { d: 'R3', t: 'And R3.', c: ['show ntp status', 'show clock', 'show lldp neighbors', 'write memory'] },
    { d: 'SW1', t: 'The switches.', c: ['show logging', 'show lldp neighbors', 'write memory'] },
    { d: 'SW2', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show ntp status', 'show ntp associations', 'show clock', 'show logging', 'show cdp neighbors', 'show lldp neighbors'],
  explain: `<h3>NTP and stratum</h3>
<p>NTP forms a hierarchy. Stratum 1 devices own a reference clock (GPS, atomic); each hop away adds one; 16 means unsynchronised. Devices prefer the lowest stratum they can reach. <code>ntp master [stratum]</code> makes a router authoritative from its own calendar — acceptable in a lab or closed network, though production would point at a public pool or an appliance.</p>
<p>Correct time matters more than it sounds. Log correlation across devices is impossible without it, and certificate validation fails outright when clocks disagree by more than a few minutes.</p>
<h3>Syslog severity levels</h3>
<p>0 Emergency, 1 Alert, 2 Critical, 3 Error, 4 Warning, 5 Notification, 6 Informational, 7 Debugging. A mnemonic: <em>Every Awesome Cisco Engineer Will Need Ice cream Daily</em>. <code>logging trap warnings</code> means level 4 and everything numerically <em>lower</em>, because lower numbers are more severe.</p>
<p>Message format is <code>%FACILITY-SEVERITY-MNEMONIC: text</code>, so <code>%LINK-5-CHANGED</code> is the LINK facility at severity 5 reporting a CHANGED event. Destinations are independent and each has its own level: console (on by default), the memory buffer, monitor sessions (needs <code>terminal monitor</code>), and syslog servers on UDP 514.</p>
<h3>CDP and LLDP</h3>
<p><b>CDP</b> is Cisco-proprietary, ON by default, advertising every 60 seconds with a 180-second holdtime. <b>LLDP</b> is IEEE 802.1AB, OFF by default on Cisco gear, every 30 seconds with a 120-second holdtime.</p>
<p>Both can be disabled globally (<code>no cdp run</code>) or per interface (<code>no cdp enable</code>) — know which is which, because the exam asks. Both ends must run the protocol for a neighbour to appear, which is why switching it off globally on one device removes it from everybody else's view.</p>
<p>Reading the output: <b>Local Intrfce</b> is your port, <b>Port ID</b> is the neighbour's. Under exam pressure that is surprisingly easy to reverse.</p>`,
  checks: [
    { desc: 'R1 is an NTP master at stratum 3', fn: H => H.d('R1').ntp.master === 3 },
    { desc: 'R2 synchronises to R1 and R3 to R2, forming a chain', fn: H => H.d('R2').ntp.servers.includes('10.0.12.1') && H.d('R3').ntp.servers.includes('10.0.23.1') },
    { desc: 'Both client routers report synchronised clocks', fn: H => ['R2', 'R3'].every(r => ND.showNtp(H.topo, H.d(r)).startsWith('Clock is synchronized')) },
    { desc: 'R1 settled on trap level warnings after the experiments', fn: H => H.d('R1').logging.trap === 'warnings' },
    { desc: 'R1 logs to the server with a buffer and console logging off', fn: H => H.d('R1').logging.hosts.includes('10.0.0.100') && H.d('R1').logging.buffered === 16384 && !H.d('R1').logging.console },
    { desc: 'R2 has the same logging configuration', fn: H => H.d('R2').logging.hosts.includes('10.0.0.100') && H.d('R2').logging.trap === 'warnings' && H.d('R2').logging.buffered === 16384 },
    { desc: 'SW1 also logs centrally at the same level', fn: H => H.d('SW1').logging.hosts.includes('10.0.0.100') && H.d('SW1').logging.trap === 'warnings' },
    { desc: 'R2 G0/2 was bounced and left enabled', fn: H => H.noshut('R2', 'g0/2') },
    { desc: 'R2 G0/1 had CDP disabled then re-enabled with the positive form', fn: H => H.i('R2', 'g0/1').cdpEnabled && H.d('R2').cdp },
    { desc: 'R3 has CDP disabled globally', fn: H => !H.d('R3').cdp },
    { desc: 'R2 no longer sees R3 over CDP, but still sees R1 and SW2', fn: H => { const n = ND.cdpNeighbors(H.topo, H.d('R2')).map(x => x.dev.id); return !n.includes('R3') && n.includes('R1') && n.includes('SW2'); } },
    { desc: 'LLDP enabled on all five devices', fn: H => ['R1', 'R2', 'R3', 'SW1', 'SW2'].every(d => H.d(d).lldp) },
    { desc: 'R2 sees R3 again over LLDP despite CDP being off there', fn: H => ND.lldpNeighbors(H.topo, H.d('R2')).some(n => n.dev.id === 'R3') },
    { desc: 'All five devices saved', fn: H => ['R1', 'R2', 'R3', 'SW1', 'SW2'].every(d => H.saved(d)) },
  ],
});
/* ============================================================= */
L({
  id: 'y6-troubleshooting', vol: 2, tier: 'deep', day: 'Capstone', title: 'Troubleshooting Gauntlet — Full Drill',
  topics: 'eleven planted faults across layers 1-3 · access VLAN · trunk allowed list · missing VLAN · err-disabled port · ROAS encapsulation & addressing · shut interface · /30 mismatch · wrong next hop · missing return routes · ACL · structured diagnosis and repair',
  devices: [
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.10', mask: '255.255.255.0', gw: '10.0.10.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.20.10', mask: '255.255.255.0', gw: '10.0.20.1' } },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'g0/1', 'g0/2'] },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.20.11', mask: '255.255.255.0', gw: '10.0.20.1' } },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.30.100', mask: '255.255.255.0', gw: '10.0.30.1' } },
  ],
  links: [
    ['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2'], ['SW1', 'g0/1', 'SW2', 'g0/1'],
    ['SW2', 'f0/1', 'PC3', 'e0'], ['SW2', 'g0/2', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0'], ['R2', 'g0/1', 'SRV', 'e0'],
  ],
  layout: { PC1: [25, 20], PC2: [25, 95], SW1: [110, 58], SW2: [190, 58], PC3: [190, 128], R1: [268, 58], R2: [345, 58], SRV: [412, 20] },
  setupAll: topo => {
    const dev = id => topo.devs[id];
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(dev(id), ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    const M24 = '255.255.255.0', M30 = '255.255.255.252';
    for (const id of ['PC1', 'PC2', 'PC3', 'SW1', 'SW2', 'R1', 'R2', 'SRV']) dev(id).hostname = id;

    /* ---- the parts of the network that are configured correctly ---- */
    dev('SW1').vlans[10] = { name: 'USERS' };
    dev('SW1').vlans[20] = { name: 'SALES' };
    dev('SW1').vlans[99] = { name: 'PARKING' };
    dev('SW2').vlans[10] = { name: 'USERS' };
    const acc = (id, ifn, v) => { const i = ND.getIface(dev(id), ifn); i.swMode = 'access'; i.accessVlan = v; };
    const trk = (id, ifn, allowed) => { const i = ND.getIface(dev(id), ifn); i.swMode = 'trunk'; i.allowed = allowed || null; };
    acc('SW1', 'f0/2', 20);
    trk('SW2', 'g0/1'); trk('SW2', 'g0/2');
    const sub = (ifn, vlan, ip) => {
      const s = ND.getOrCreateIface(dev('R1'), ifn);
      s.encapDot1q = { vlan, native: false }; s.ip = { addr: ip, mask: M24 }; s.shutdown = false;
      return s;
    };
    const g00 = ND.getIface(dev('R1'), 'g0/0'); g00.shutdown = false; // trunk port carrying both VLANs
    set('R1', 'g0/1', '10.0.12.1', M30);
    set('R2', 'g0/1', '10.0.30.1', M24);
    dev('R2').staticRoutes.length = 0;

    /* ---- FAULT 1: PC1's access port was parked in the unused VLAN 99 ---- */
    acc('SW1', 'f0/1', 99);

    /* ---- FAULT 2: SW1's trunk allows VLAN 10 only, so VLAN 20 never crosses it ---- */
    trk('SW1', 'g0/1', [1, 10]);

    /* ---- FAULT 3: VLAN 20 was never created in SW2's VLAN database ---- */
    //     (nothing to plant — vlan 20 is simply absent from dev('SW2').vlans)

    /* ---- FAULT 4: SW2 F0/1 is err-disabled after a port-security violation ---- */
    const p3 = ND.getIface(dev('SW2'), 'f0/1');
    p3.swMode = 'access'; p3.accessVlan = 20;
    p3.portSec = { enabled: true, max: 1, violation: 'shutdown', sticky: false, macs: [], stickyLearned: [], violations: 1 };
    p3.errDisabled = true; p3.errReason = 'psecure-violation';

    /* ---- FAULT 5: the VLAN 10 gateway address is .254, not the .1 the PCs point at ---- */
    sub('g0/0.10', 10, '10.0.10.254');

    /* ---- FAULT 6: the VLAN 20 subinterface is tagged for VLAN 30 ---- */
    sub('g0/0.20', 30, '10.0.20.1');

    /* ---- FAULT 7: R1's WAN interface was left administratively down ---- */
    ND.getIface(dev('R1'), 'g0/1').shutdown = true;

    /* ---- FAULT 8: R1's route to the server LAN points at a next hop that does not exist ---- */
    dev('R1').staticRoutes.push({ net: '10.0.30.0', mask: M24, via: '10.0.12.6', ad: 1 });

    /* ---- FAULT 9: R2's WAN address sits outside the /30 it shares with R1 ---- */
    set('R2', 'g0/0', '10.0.12.5', M30);

    /* ---- FAULT 10: R2 has no return routes to either user VLAN ---- */
    //     (nothing to plant — the routes are simply absent)

    /* ---- FAULT 11: a leftover ACL on R2 discards ICMP towards the server ---- */
    const anyAddr = { any: true, txt: 'any' };
    dev('R2').acls['LOCKDOWN'] = {
      type: 'extended', numbered: false, entries: [
        { action: 'deny', proto: 'icmp', src: anyAddr, dst: anyAddr, portOp: null, dstPort: null, raw: 'deny icmp any any', seq: 10 },
        { action: 'permit', proto: 'ip', src: anyAddr, dst: anyAddr, portOp: null, dstPort: null, raw: 'permit ip any any', seq: 20 },
      ],
    };
    ND.getIface(dev('R2'), 'g0/1').aclOut = 'LOCKDOWN';
  },
  intro: `<b>The situation:</b> a network that used to work. Two user VLANs behind a pair of switches, a router-on-a-stick gateway, a WAN link to a second router, and a server on the far side. Somebody spent a weekend "tidying up" and now almost nothing reaches anything. There is no documentation and nobody is admitting to anything.<br><b>Your goal:</b> find and repair <b>eleven separate faults</b> using nothing but show commands and reasoning. They run the full stack — a port in the wrong VLAN, a trunk that filters one out, a VLAN missing from a switch entirely, a port sitting err-disabled, a gateway addressed wrongly, a subinterface tagged for the wrong VLAN, a disabled interface, a /30 mismatch, a route to a next hop that does not exist, missing return routes, and a forgotten access list.<br><b>The method matters more than the answers:</b> work bottom-up and near-to-far, change one thing at a time, and re-test after every fix. Each fault has a fingerprint, and by the end of this lab you should recognise all eleven on sight.`,
  tasks: [
    { t: 'PHASE 1 — Reproduce the problem from all three PCs before touching a single configuration line', why: 'Symptoms are data. Three hosts failing in three different ways narrows the search far faster than one ping does.' },
    { t: 'Record exactly which pings fail and which succeed, including each PC to its own gateway', why: 'If the nearest hop fails, nothing beyond it matters yet. That single test tells you whether to look at the switch or the router first.' },
    { t: 'PHASE 2 — FAULT 1: on SW1, find the access port sitting in the wrong VLAN and move it back', why: 'Two ports in different VLANs are in different broadcast domains, however perfect the addressing is. show vlan brief exposes it in one screen.' },
    { t: 'FAULT 2: inspect SW1\'s trunk and add the VLAN that is missing from its allowed list', why: 'A trunk carries only the VLANs on its allowed list. One VLAN silently absent is a classic — and show interfaces trunk is the only place it shows.' },
    { t: 'PHASE 3 — FAULT 3: on SW2, discover that one VLAN was never created and create it', why: 'A switch drops frames for a VLAN it does not have in its database, even when the trunk allows it. Two separate conditions, two separate checks.' },
    { t: 'FAULT 4: find the err-disabled port on SW2, read why it shut itself down, and recover it', why: 'err-disabled is not the same as "administratively down". A port-security violation put it there and only shutdown / no shutdown brings it back.' },
    { t: 'Raise the port-security limit so the recovered port can hold the addresses it legitimately sees', why: 'Recovering a port without fixing the cause means it err-disables again the next time. Fix the condition, not just the symptom.' },
    { t: 'PHASE 4 — FAULT 5: on R1, compare each subinterface address with the gateway the PCs are configured to use', why: 'A gateway address the hosts never ask for is invisible in every routing check — the router looks perfectly healthy while nothing can leave the VLAN.' },
    { t: 'FAULT 6: check the dot1Q tag on each subinterface against the VLAN it is supposed to serve', why: 'Router-on-a-stick has two halves: the tag must match the VLAN and the address must match the subnet. Getting the tag wrong breaks one VLAN and nothing else.' },
    { t: 'Re-test from both PCs and confirm that each one can now reach its own gateway', why: 'Gateways first. There is no point chasing the WAN while the first hop still fails.' },
    { t: 'PHASE 5 — FAULT 7: find and enable the interface on R1 that is administratively down', why: '"administratively down" has exactly one cause: somebody typed shutdown, or never typed no shutdown.' },
    { t: 'FAULT 8: compare both ends of the WAN link and correct the address that is outside the /30', why: 'Both ends of a /30 must share that four-address subnet. 10.0.12.1 and 10.0.12.5 are in adjacent but separate networks and can never speak.' },
    { t: 'Prove the two routers can ping each other before you go anywhere near routing', why: 'Routing cannot work across a link whose two ends cannot reach each other. Foundations first, every time.' },
    { t: 'PHASE 6 — FAULT 9: read R1\'s routing table and correct the static route whose next hop does not exist', why: 'A route pointing at an address nobody owns still appears in the table looking entirely plausible. Always check the next hop is reachable.' },
    { t: 'FAULT 10: check R2\'s table and add the return routes for both user VLANs', why: 'Traffic needs a path there AND back. Missing return routes are the single most common static-routing mistake.' },
    { t: 'PHASE 7 — FAULT 11: ping the server, notice ICMP alone is failing, and find the access list responsible', why: 'One protocol failing while everything else works is the fingerprint of a filter. show ip interface names the list and the direction.' },
    { t: 'PHASE 8 — Verify the repaired network end to end from every host, in both directions', why: 'A fix that works one way is not a fix. Test every host to every destination, then trace the path to confirm it goes where you expect.' },
    { t: 'Sweep the five show commands that diagnose almost everything, then save every device', why: 'Interface brief, vlan brief, interfaces trunk, ip route and ip interface. Those five find the overwhelming majority of CCNA-level faults — including all eleven here.' },
  ],
  steps: [
    /* ---- PHASE 1: gather symptoms ---- */
    { d: 'PC1', t: 'Reproduce the reported fault from the first host.', c: ['ipconfig', 'ping 10.0.10.1', 'ping 10.0.30.100'], note: 'PC1 cannot even reach its own default gateway. Whatever is wrong starts within the first hop — the switch port or the router interface serving VLAN 10.' },
    { d: 'PC2', t: 'Now the second host, in a different VLAN.', c: ['ipconfig', 'ping 10.0.20.1', 'ping 10.0.30.100'], note: 'PC2 also fails to its gateway, but it is in VLAN 20 on a different port. Two different VLANs failing suggests more than one fault, not one common cause.' },
    { d: 'PC3', t: 'And the third, which sits on the other switch.', c: ['ipconfig', 'ping 10.0.20.1'], note: 'PC3 is in the same VLAN 20 and the same subnet as PC2, so if PC3 fails too the problem cannot only be up at the router.' },
    { d: 'PC2', t: 'Test host-to-host inside a single VLAN, which involves no router at all.', c: ['ping 10.0.20.11'], note: 'PC2 to PC3 is pure layer 2 across the trunk. Failing here proves at least one fault lives in the switching path.' },

    /* ---- PHASE 2: SW1 ---- */
    { d: 'SW1', t: 'Start at the access layer: what VLAN is each port in?', c: ['enable', 'terminal length 0', 'show vlan brief', 'show interfaces status'], note: 'Fa0/1 (PC1) sits in VLAN 99 — the parking VLAN — while Fa0/2 (PC2) is correctly in VLAN 20. There is fault number one.' },
    { d: 'SW1', t: 'Confirm it on the interface itself before changing anything.', c: ['show interfaces f0/1 switchport'], note: 'Access Mode VLAN: 99. Reading it from two places costs seconds and stops you fixing a port that was never broken.' },
    { d: 'SW1', t: 'FAULT 1 — return PC1\'s port to the users VLAN.', c: ['configure terminal', 'interface f0/1', 'switchport access vlan 10', 'end', 'show vlan brief'], note: 'Fa0/1 now appears under VLAN 10 alongside the rest of the user ports.' },
    { d: 'SW1', t: 'Next, the uplink. Which VLANs does the trunk actually carry?', c: ['show interfaces trunk'], note: 'The allowed list reads 1,10. VLAN 20 is missing, so every VLAN 20 frame is discarded at this trunk — fault number two.' },
    { d: 'SW1', t: 'FAULT 2 — add the missing VLAN to the allowed list.', c: ['configure terminal', 'interface g0/1', 'switchport trunk allowed vlan add 20', 'end', 'show interfaces trunk'], note: 'Use <code>add</code>, never a bare <code>switchport trunk allowed vlan 20</code> — the bare form REPLACES the list and would have cut off VLAN 10 instead.' },
    { d: 'PC2', t: 'Re-test the layer 2 path you just repaired.', c: ['ping 10.0.20.11'], note: 'Still failing. One fault fixed does not mean one fault only — keep going down the path.' },

    /* ---- PHASE 3: SW2 ---- */
    { d: 'SW2', t: 'Move one hop along and check the second switch\'s VLAN database.', c: ['enable', 'terminal length 0', 'show vlan brief'], note: 'VLAN 10 exists here, VLAN 20 does not. A switch drops frames for a VLAN it has never heard of, no matter what the trunk allows — fault number three.' },
    { d: 'SW2', t: 'FAULT 3 — create the missing VLAN and name it.', c: ['configure terminal', 'vlan 20', 'name SALES', 'exit', 'exit', 'show vlan brief'], note: 'Two conditions must both be true for a VLAN to cross a switch: it must exist in the database AND be allowed on the trunk. You have now checked both.' },
    { d: 'SW2', t: 'Look at the port status while you are here.', c: ['show interfaces status'], note: 'Fa0/1 reads <b>err-disabled</b>. That is different from "disabled" (a manual shutdown) and different again from "notconnect" — the switch shut this port down itself.' },
    { d: 'SW2', t: 'Ask the port why it disabled itself.', c: ['show port-security interface f0/1'], note: 'Port Status: Secure-shutdown, and the violation counter has incremented. A second MAC address appeared on a port allowed exactly one — fault number four.' },
    { d: 'SW2', t: 'Raise the limit first, so the port does not immediately trip again.', c: ['configure terminal', 'interface f0/1', 'switchport port-security maximum 2', 'do show port-security interface f0/1'], note: 'Fix the cause before recovering the symptom. Recovering a port while the condition still holds simply err-disables it again.' },
    { d: 'SW2', t: 'FAULT 4 — recover the err-disabled port.', c: ['shutdown', 'no shutdown', 'end', 'show interfaces status'], note: 'Only a <code>shutdown</code> followed by <code>no shutdown</code> clears err-disable manually. A bare <code>no shutdown</code> on its own does nothing, which catches almost everybody once.' },
    { d: 'SW2', t: 'Confirm the port came back and the trunks are healthy.', c: ['show port-security interface f0/1', 'show interfaces trunk'], note: 'Secure-up again, and both trunks carrying VLANs 10 and 20. The switching path is now complete end to end.' },
    { d: 'PC2', t: 'Re-test host to host across the repaired layer 2 path.', c: ['ping 10.0.20.11'], note: 'Success. Two hosts in the same VLAN on two different switches can talk — which means access VLANs, trunk allowed lists and the VLAN databases all agree.' },

    /* ---- PHASE 4: router-on-a-stick ---- */
    { d: 'PC1', t: 'Layer 2 is sound, so test the gateway again.', c: ['ping 10.0.10.1'], note: 'Still no gateway. The frames now reach the router, so the fault has moved up to layer 3 — exactly the progress you want.' },
    { d: 'R1', t: 'Inspect the router-on-a-stick configuration.', c: ['enable', 'terminal length 0', 'show ip interface brief', 'show running-config'], note: 'Two subinterfaces exist. Read their addresses and their dot1Q tags against what the PCs expect: gateway 10.0.10.1 for VLAN 10 and 10.0.20.1 for VLAN 20.' },
    { d: 'R1', t: 'Look closely at the VLAN 10 subinterface.', c: ['show ip interface g0/0.10'], note: 'It is addressed 10.0.10.254, but every host in VLAN 10 is configured to use 10.0.10.1. The router is healthy and answering on an address nobody asks about — fault number five.' },
    { d: 'R1', t: 'FAULT 5 — give the gateway the address the hosts actually use.', c: ['configure terminal', 'interface g0/0.10', 'ip address 10.0.10.1 255.255.255.0', 'end', 'show ip interface brief'], note: 'A new address simply replaces the old one on the same interface — no "no ip address" needed first.' },
    { d: 'PC1', t: 'Verify the VLAN 10 gateway immediately.', c: ['ping 10.0.10.1'], note: 'PC1 finally has a working default gateway. One VLAN down, one to go.' },
    { d: 'PC2', t: 'Check whether VLAN 20 is in the same state.', c: ['ping 10.0.20.1'], note: 'Still nothing, and the VLAN 20 subinterface has the right address — so the problem must be the other half of a ROAS configuration.' },
    { d: 'R1', t: 'Read the dot1Q tag on the VLAN 20 subinterface.', c: ['show running-config'], note: 'G0/0.20 carries <code>encapsulation dot1Q 30</code>. The subinterface is listening for a VLAN that does not exist anywhere in this network — fault number six.' },
    { d: 'R1', t: 'FAULT 6 — correct the encapsulation to match the VLAN it serves.', c: ['configure terminal', 'interface g0/0.20', 'encapsulation dot1q 20', 'end', 'show running-config'], note: 'The subinterface number (.20) is cosmetic and proves nothing — only the encapsulation command decides which tagged frames the router accepts.' },
    { d: 'PC2', t: 'Re-test both hosts in VLAN 20.', c: ['ping 10.0.20.1'], note: 'The VLAN 20 gateway answers. Every host now reaches its own router interface.' },
    { d: 'PC3', t: 'And the host on the far switch.', c: ['ping 10.0.20.1', 'ping 10.0.10.10'], note: 'PC3 reaches the gateway and, through it, a host in the other VLAN. Inter-VLAN routing works — the local network is healthy.' },

    /* ---- PHASE 5: the WAN link ---- */
    { d: 'PC1', t: 'Push outward towards the server.', c: ['ping 10.0.30.100'], note: 'Local is fine, remote is not. The fault has moved out to the WAN — carry on working near to far.' },
    { d: 'R1', t: 'Check the state of every interface on R1.', c: ['show ip interface brief'], note: 'G0/1 reads <b>administratively down</b>. That exact wording only ever means one thing: somebody typed shutdown — fault number seven.' },
    { d: 'R1', t: 'FAULT 7 — enable the WAN interface.', c: ['configure terminal', 'interface g0/1', 'no shutdown', 'end', 'show ip interface brief', 'ping 10.0.12.2'], note: 'The line comes up but the ping still fails. Up/up means the cable and the protocol are fine — it says nothing about the addressing.' },
    { d: 'R1', t: 'Note the addressing on your end of the link.', c: ['show ip interface g0/1'], note: '10.0.12.1 with mask 255.255.255.252 — a /30, so this subnet covers only .0 to .3. Usable addresses: .1 and .2, nothing else.' },
    { d: 'R2', t: 'Look at the other end of the same cable.', c: ['enable', 'terminal length 0', 'show ip interface brief', 'show cdp neighbors'], note: 'R2 is using 10.0.12.5, which belongs to the NEXT /30 (.4 to .7). CDP confirms the cable is right; the addressing is not — fault number eight.' },
    { d: 'R2', t: 'FAULT 8 — put both ends in the same /30.', c: ['configure terminal', 'interface g0/0', 'ip address 10.0.12.2 255.255.255.252', 'end', 'ping 10.0.12.1'], note: 'The routers can reach each other directly. The foundation the routing sits on is now solid.' },
    { d: 'R1', t: 'Confirm from your side too, in both directions.', c: ['ping 10.0.12.2', 'show cdp neighbors'], note: 'Never accept a link as working from one side only.' },

    /* ---- PHASE 6: routing ---- */
    { d: 'R1', t: 'With the link up, examine the routing table.', c: ['show ip route'], note: 'There is a static route to 10.0.30.0/24 via 10.0.12.6 — but the link is a /30 containing only .1 and .2. Nothing owns .6, so this route can never work — fault number nine.' },
    { d: 'R1', t: 'FAULT 9 — remove the bad route and install a correct one.', c: ['configure terminal', 'no ip route 10.0.30.0 255.255.255.0 10.0.12.6', 'ip route 10.0.30.0 255.255.255.0 10.0.12.2', 'end', 'show ip route'], note: 'Remove first, then add. Leaving both in place would give you two routes of equal length and equal AD, and the router would load-balance half your traffic into a black hole.' },
    { d: 'R1', t: 'Test from the router itself before involving the hosts.', c: ['ping 10.0.30.100'], note: 'Even this fails — and R1 now has a valid route. So the packets are going out and something further along is not sending replies back.' },
    { d: 'R2', t: 'Check whether R2 knows the way home.', c: ['show ip route'], note: 'R2 has its two connected subnets and nothing else. It has no idea where 10.0.10.0/24 or 10.0.20.0/24 live, so every reply is dropped — fault number ten.' },
    { d: 'R2', t: 'FAULT 10 — add a return route for each user VLAN.', c: ['configure terminal', 'ip route 10.0.10.0 255.255.255.0 10.0.12.1', 'ip route 10.0.20.0 255.255.255.0 10.0.12.1', 'end', 'show ip route'], note: 'Two routes, one per VLAN. A single summary — <code>ip route 10.0.0.0 255.255.0.0 10.0.12.1</code> — would also work and is what you would write in production.' },
    { d: 'R1', t: 'Re-test now that both directions have routes.', c: ['ping 10.0.30.100'], note: 'R1 reaches the server. Routing is complete in both directions.' },

    /* ---- PHASE 7: filtering ---- */
    { d: 'PC1', t: 'Try again from the host that reported the fault.', c: ['ping 10.0.30.100'], note: 'Routing is complete yet the host still fails. When the path exists and traffic still dies, suspect a filter.' },
    { d: 'R2', t: 'Check the interface facing the server for an access list.', c: ['show ip interface g0/1', 'show access-lists'], note: 'An outbound list named LOCKDOWN denies ICMP and permits everything else. Ping is ICMP — fault number eleven, and the reason ONLY ping was failing.' },
    { d: 'R2', t: 'FAULT 11 — detach the list from the interface.', c: ['configure terminal', 'interface g0/1', 'no ip access-group LOCKDOWN out', 'end', 'show ip interface g0/1'], note: 'Detaching is enough; the list stays defined for later use. Deleting it outright would be the heavier option.' },
    { d: 'PC1', t: 'Confirm the original symptom is finally gone.', c: ['ping 10.0.30.100', 'tracert 10.0.30.100'], note: 'The trace should read R1, R2, then the server — exactly the path the topology predicts.' },

    /* ---- PHASE 8: full verification and save ---- */
    { d: 'PC2', t: 'Verify from the second VLAN as well.', c: ['ping 10.0.20.1', 'ping 10.0.10.10', 'ping 10.0.30.100'], note: 'Gateway, other VLAN, and remote server. Three tests that between them exercise every fault you repaired.' },
    { d: 'PC3', t: 'And from the host on the far switch.', c: ['ping 10.0.30.100', 'tracert 10.0.30.100'], note: 'PC3\'s traffic crosses the recovered err-disabled port, both trunks, the ROAS gateway and the WAN — the longest path in this network.' },
    { d: 'SRV', t: 'Test the reverse direction from the server.', c: ['ping 10.0.10.10', 'ping 10.0.20.10', 'ping 10.0.20.11'], note: 'A fix that works one way is not a fix. The server reaching all three hosts proves the return routing is genuinely complete.' },
    { d: 'SW1', t: 'Final sweep on the first switch.', c: ['show vlan brief', 'show interfaces trunk', 'show interfaces status', 'write memory'] },
    { d: 'SW2', t: 'And the second.', c: ['show vlan brief', 'show interfaces trunk', 'show port-security', 'write memory'] },
    { d: 'R1', t: 'Sweep the gateway router.', c: ['show ip interface brief', 'show ip route', 'show ip interface g0/0.10', 'write memory'] },
    { d: 'R2', t: 'And the remote router.', c: ['show ip interface brief', 'show ip route', 'show access-lists', 'write memory'], note: 'Eleven faults, four devices, one working network. Run this lab again from scratch and time yourself — speed on this comes only from repetition.' },
  ],
  verify: ['show vlan brief', 'show interfaces trunk', 'show interfaces status', 'show port-security', 'show ip interface brief', 'show ip route', 'show ip interface g0/1', 'show access-lists', 'show cdp neighbors'],
  explain: `<h3>A method, not a hunch</h3>
<p>Work <b>bottom up</b> and <b>near to far</b>. Layer 1 and 2 first (is the port up, is it in the right VLAN, does the trunk carry that VLAN, does the VLAN even exist?), then layer 3 (are both ends in the same subnet, is there a route, is the next hop reachable?), then filtering. Test after every single change and change one thing at a time — otherwise you never learn which repair helped, and you may plant a new fault while removing an old one.</p>
<p>Gathering symptoms from <em>several</em> hosts before touching anything is what turns guessing into deduction. In this lab PC2 and PC3 failing to ping each other — a test that involves no router at all — proved instantly that at least one fault lived in the switching path.</p>
<h3>The eleven fingerprints</h3>
<ul>
<li><b>Wrong access VLAN</b> — a host cannot reach its own gateway although its addressing is perfect. <code>show vlan brief</code>.</li>
<li><b>Trunk allowed list</b> — one VLAN works everywhere, another dies the moment it must cross a trunk. Visible only in <code>show interfaces trunk</code>. Remember <code>add</code> versus the bare form that replaces the whole list.</li>
<li><b>VLAN missing from the database</b> — the trunk allows it, but the switch has never heard of it and drops the frames. Both conditions must hold.</li>
<li><b>err-disabled</b> — the switch disabled the port itself, usually port security or BPDU guard. Distinct from "administratively down" (somebody typed shutdown) and from "notconnect" (nothing plugged in). Recover with <code>shutdown</code> then <code>no shutdown</code>; a bare <code>no shutdown</code> does nothing.</li>
<li><b>Gateway addressed wrongly</b> — the router looks completely healthy because it is; it simply answers on an address no host is configured to ask for. Always compare the router's address against the hosts' <code>ipconfig</code>.</li>
<li><b>Wrong dot1Q tag</b> — ROAS has two halves, encapsulation and address. Wrong tag breaks exactly one VLAN, and the subinterface number is cosmetic: only <code>encapsulation dot1Q</code> matters.</li>
<li><b>administratively down</b> — one cause only.</li>
<li><b>Subnet mismatch on a link</b> — with a /30 the usable pairs are .1/.2, then .5/.6, then .9/.10. 10.0.12.1 and 10.0.12.5 are neighbours numerically and unreachable in practice.</li>
<li><b>Next hop that does not exist</b> — the route sits in the table looking entirely plausible. Check that the next-hop address is inside a connected subnet and that something actually owns it.</li>
<li><b>Missing return route</b> — traffic arrives and replies vanish. Routing is not symmetric by magic.</li>
<li><b>An access list</b> — one protocol fails while others work. <code>show ip interface</code> names the list and the direction; <code>show access-lists</code> says what it does.</li>
</ul>
<h3>The five commands that find almost everything</h3>
<p><code>show ip interface brief</code> (are the ports up and addressed?), <code>show vlan brief</code> (is the port in the right VLAN?), <code>show interfaces trunk</code> (does the trunk carry it?), <code>show ip route</code> (does a path exist, and is the next hop sane?), <code>show ip interface</code> (is a filter applied?). Add <code>show cdp neighbors</code> when you are not certain what is cabled to what. Those six diagnose the overwhelming majority of CCNA-level faults, including all eleven in this lab.</p>`,
  checks: [
    { desc: 'FAULT 1 fixed — SW1 F0/1 is back in VLAN 10', fn: H => H.access('SW1', 'f0/1', 10) },
    { desc: 'FAULT 2 fixed — SW1\'s trunk allows both VLAN 10 and VLAN 20', fn: H => { const a = H.i('SW1', 'g0/1').allowed; return a === null || (a.includes(10) && a.includes(20)); } },
    { desc: 'FAULT 3 fixed — VLAN 20 now exists on SW2', fn: H => H.vlanExists('SW2', 20) },
    { desc: 'FAULT 4 fixed — SW2 F0/1 recovered from err-disable and is up', fn: H => !H.i('SW2', 'f0/1').errDisabled && H.up('SW2', 'f0/1') },
    { desc: 'Port security on SW2 F0/1 now allows more than one address', fn: H => { const ps = H.i('SW2', 'f0/1').portSec; return !!ps && ps.max >= 2; } },
    { desc: 'FAULT 5 fixed — the VLAN 10 gateway is addressed 10.0.10.1', fn: H => H.hasIp('R1', 'g0/0.10', '10.0.10.1', '255.255.255.0') },
    { desc: 'FAULT 6 fixed — G0/0.20 is tagged for VLAN 20', fn: H => { const s = H.i('R1', 'g0/0.20'); return !!(s && s.encapDot1q && s.encapDot1q.vlan === 20); } },
    { desc: 'FAULT 7 fixed — R1 G0/1 is enabled and up', fn: H => H.noshut('R1', 'g0/1') && H.up('R1', 'g0/1') },
    { desc: 'FAULT 8 fixed — R2 G0/0 addressed inside R1\'s /30', fn: H => H.hasIp('R2', 'g0/0', '10.0.12.2', '255.255.255.252') },
    { desc: 'The two routers can reach each other across the WAN link', fn: H => H.ping('R1', '10.0.12.2') && H.ping('R2', '10.0.12.1') },
    { desc: 'FAULT 9 fixed — R1\'s route to the server LAN points at 10.0.12.2', fn: H => { const r = H.d('R1').staticRoutes.filter(x => x.net === '10.0.30.0'); return r.length === 1 && r[0].via === '10.0.12.2'; } },
    { desc: 'FAULT 10 fixed — R2 has return routes for both user VLANs', fn: H => ['10.0.10.0', '10.0.20.0'].every(n => H.d('R2').staticRoutes.some(r => (r.net === n && r.mask === '255.255.255.0') || (r.net === '10.0.0.0' && r.mask === '255.255.0.0'))) },
    { desc: 'FAULT 11 fixed — no access list filtering the server LAN', fn: H => !H.i('R2', 'g0/1').aclOut },
    { desc: 'Both PCs reach their own default gateway', fn: H => H.ping('PC1', '10.0.10.1') && H.ping('PC2', '10.0.20.1') },
    { desc: 'PC2 and PC3 can reach each other across the trunk (layer 2 intact)', fn: H => H.ping('PC2', '10.0.20.11') && H.ping('PC3', '10.0.20.10') },
    { desc: 'Inter-VLAN routing works between PC1 and PC2', fn: H => H.ping('PC1', '10.0.20.10') && H.ping('PC2', '10.0.10.10') },
    { desc: 'All three hosts reach the remote server', fn: H => ['PC1', 'PC2', 'PC3'].every(p => H.ping(p, '10.0.30.100')) },
    { desc: 'The server reaches all three hosts in the reverse direction', fn: H => ['10.0.10.10', '10.0.20.10', '10.0.20.11'].every(ip => H.ping('SRV', ip)) },
    { desc: 'All four network devices saved', fn: H => ['SW1', 'SW2', 'R1', 'R2'].every(d => H.saved(d)) },
  ],
});

window.ND = ND;
})();
