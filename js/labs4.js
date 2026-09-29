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
  id: 'y1-acls', ord: 700, vol: 1, tier: 'deep', day: 'Days 33-34', title: 'Access Lists — Full Drill',
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
    { t: 'PHASE 1 — Establish the "before" picture from every host',
      do: [
        'From <b>PC1</b>: <code>ipconfig</code>, then ping <b>10.0.3.100</b> (SRV1) and <b>10.0.3.200</b> (SRV2).',
        'From <b>PC2</b>: ping both servers.',
        'From <b>PC3</b>: ping <b>10.0.3.100</b> and <b>10.0.1.10</b>.',
      ],
      done: 'Every host reaches everything.',
      why: 'Never apply a filter without knowing what worked beforehand, or you cannot tell your rule apart from an unrelated fault.' },

    { t: 'PHASE 2 — Build numbered standard ACL 10 using three different source forms',
      do: [
        'On <b>R1</b>, create access list <b>10</b> with three lines, in this order:',
        '<b>permit host 10.0.1.10</b> — the single-host shorthand.',
        '<b>deny 10.0.2.0 0.0.0.255</b> — a wildcard-matched network.',
        '<b>permit any</b> — the catch-all, which must come last.',
        'Then display the access lists and read the three lines back.',
      ],
      done: 'List 10 shows three entries in that order.',
      why: 'Three ways to name a source: host, wildcard network, and any. Order is everything — a deny placed above the permit would block the host you meant to allow.' },

    { t: 'Apply ACL 10 outbound toward R2 and test both PCs',
      do: [
        'On <b>R1</b>, apply list <b>10</b> to interface <b>G0/2</b> in the <b>out</b> direction, and confirm with the layer-3 interface view.',
        'From <b>PC1</b>, ping <b>10.0.3.100</b> — it should still work.',
        'From <b>PC2</b>, ping <b>10.0.3.100</b> — it should now fail.',
      ],
      done: 'PC1 passes and PC2 is blocked.',
      why: 'Standard lists judge the source address only, so they go close to the destination. Here that means the interface on the path toward the servers.' },

    { t: 'PHASE 3 — Repeat the exercise on R2 with a second numbered list',
      do: [
        'On <b>R2</b>, create access list <b>20</b>: <b>deny host 10.0.4.99</b>, then <b>permit 10.0.4.0 0.0.0.255</b>, then <b>permit any</b>.',
        'Apply it to interface <b>G0/2</b> in the <b>in</b> direction.',
        'From <b>PC3</b>, ping <b>10.0.3.100</b> to confirm the permitted hosts still pass.',
      ],
      done: 'List 20 is applied inbound and PC3 still works.',
      why: 'The same skill on a second router, with a deny-one-host-then-permit-the-rest shape — the most common real-world standard ACL there is.' },

    { t: 'PHASE 4 — Build a named standard list and protect the vty lines with it',
      do: [
        'On <b>R1</b>, create a named standard list <b>VTY-ACCESS</b> permitting <b>10.0.1.0 0.0.0.255</b>.',
        'On the <b>vty lines 0 4</b>: set a password, enable login, and apply the list with <b>access-class VTY-ACCESS in</b>.',
        'Check the running configuration.',
      ],
      done: 'The access-class line appears under line vty 0 4.',
      why: '<b>access-class</b> protects the router itself rather than traffic passing through it — it is the command that decides who may even attempt to log in.' },

    { t: 'Repeat the vty protection on R2 with its own named list',
      do: [
        'On <b>R2</b>, create a named standard list <b>MGMT-HOSTS</b> permitting <b>10.0.4.0 0.0.0.255</b> and <b>host 10.0.1.10</b>.',
        'Apply it to the vty lines with access-class, alongside a password and login.',
      ],
      done: 'Both routers restrict management access by source address.',
      why: 'Two entries: a whole management network plus one specific trusted host. This pattern is on every hardening checklist you will ever be handed.' },

    { t: 'PHASE 5 — Build a named extended list with explicit sequence numbers',
      do: [
        'On <b>R1</b>, create a named extended list <b>EDGE-IN</b> and type the entries with their own sequence numbers:',
        '<b>10</b> permit tcp <b>10.0.1.0 0.0.0.255</b> to <b>host 10.0.3.100</b> eq <b>80</b>.',
        '<b>20</b> permit tcp <b>any</b> to <b>host 10.0.3.100</b> eq <b>443</b>.',
        '<b>30</b> permit <b>ip any any</b>.',
        'Display the list and note the numbering.',
      ],
      done: 'Three entries numbered 10, 20 and 30.',
      why: 'Leaving gaps between sequence numbers is deliberate: it gives you room to insert rules later without rebuilding the list, which is the next task.' },

    { t: 'Insert a new rule between two existing lines',
      do: [
        'Still inside <b>EDGE-IN</b>, add an entry numbered <b>25</b>: <b>deny icmp any host 10.0.3.100</b>.',
        'Display the list and confirm it landed between 20 and 30.',
      ],
      done: 'The new rule sits at sequence 25, in the middle of the list.',
      why: 'This is the superpower named lists have over numbered ones. A numbered list would have to be deleted and retyped in full to achieve the same thing.' },

    { t: 'Apply the extended list where the traffic enters',
      do: [
        'On <b>R1</b>, apply <b>EDGE-IN</b> to interface <b>G0/0</b> in the <b>in</b> direction, and confirm with the layer-3 interface view.',
        'From <b>PC1</b>, ping <b>10.0.3.100</b> (now blocked by rule 25) and <b>10.0.3.200</b> (still permitted by rule 30).',
      ],
      done: 'One server is unreachable by ping and the other is not.',
      why: 'Extended lists go close to the source, because they identify traffic exactly and there is no reason to carry doomed packets across the network first.' },

    { t: 'PHASE 6 — On R2, block one TCP port to one server with a numbered extended list',
      do: [
        'On <b>R2</b>, create access list <b>120</b>: <b>deny tcp any host 10.0.3.200 eq 23</b>, then <b>permit ip any any</b>.',
        'Apply it inbound on <b>G0/0</b>.',
        'From <b>PC1</b>, ping <b>10.0.3.200</b> — ping is unaffected because only TCP 23 is denied.',
      ],
      done: 'The list is applied and ICMP still passes.',
      why: 'Numbers 100-199 are extended lists. Blocking Telnet to one server while leaving everything else alone is precision a standard list cannot manage at all.' },

    { t: 'PHASE 7 — Test the full matrix of who can reach what',
      do: [
        'From <b>PC2</b>: ping <b>10.0.3.100</b> and <b>10.0.3.200</b>.',
        'From <b>PC3</b>: ping both servers as well.',
        'For each result, name the access-list line responsible.',
      ],
      done: 'You can explain every success and every failure by pointing at a line.',
      why: 'Four lists are now in play across two routers. Being able to trace a packet through all of them is the skill the exam actually tests.' },

    { t: 'PHASE 8 — Read every list and confirm every attachment',
      do: [
        'On <b>R1</b>: display the access lists, then the layer-3 view of <b>G0/0</b> and <b>G0/2</b>.',
        'On <b>R2</b>: the same three commands.',
      ],
      done: 'Every list you built is visible, and you can say which interface and direction each is attached to.',
      why: 'A list that exists but is attached to nothing does nothing — and a list attached in the wrong direction quietly does the opposite of what you intended.' },

    { t: 'PHASE 9 — Practise removal: detach, delete, rebuild',
      do: [
        'On <b>R2</b>, detach list <b>20</b> from <b>G0/2</b> and confirm the interface is unfiltered while the list still exists.',
        'Then delete list <b>20</b> entirely and look at the access lists.',
        'Rebuild all three of its lines and reattach it, then re-test from <b>PC3</b>.',
      ],
      done: 'List 20 is back in place and PC3 still works.',
      why: 'Detaching and deleting are separate actions. Note that a numbered list can only be removed whole — on a fifty-line production list that is exactly the nightmare named lists were invented to avoid.' },

    { t: 'Finally, create and delete named lists of both types',
      do: [
        'On <b>R1</b>, create a standard list <b>SCRATCH-STD</b> and an extended list <b>SCRATCH-EXT</b>, each with one entry.',
        'Display the lists, then delete both with their "no" forms and display again.',
        'Save both routers.',
      ],
      done: 'Both scratch lists are gone and the routers are saved.',
      why: 'The "no" form has to repeat the type — standard or extended — exactly as you created it, or IOS cannot find the list to remove.' },
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
  id: 'y2-nat', ord: 100, vol: 2, tier: 'deep', day: 'Days 43-44', title: 'NAT & PAT — Full Drill',
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
    { t: 'PHASE 1 — Mark the NAT inside and outside interfaces on R1',
      do: [
        'On <b>R1</b>, set <b>terminal length 0</b> and read the interface summary: <b>192.168.1.x</b> is the private side, <b>203.0.113.x</b> the public one.',
        'Mark <b>G0/0</b> as <b>ip nat inside</b>.',
        'Mark <b>G0/1</b> as <b>ip nat outside</b>, then check the layer-3 view of that interface.',
      ],
      done: 'One interface is marked inside and one outside.',
      why: 'These two lines are the foundation everything else depends on. Forget one and every NAT rule below silently does nothing while the configuration still looks right.' },

    { t: 'PHASE 2 — Create a static mapping for the first server',
      do: [
        'On <b>R1</b>, map inside-local <b>192.168.1.100</b> to inside-global <b>203.0.113.100</b>.',
        'Remember the order: private address first, public address second.',
      ],
      done: 'The mapping appears in the configuration.',
      why: 'Swapping those two addresses produces a configuration that parses perfectly and translates the wrong way round — a classic and hard-to-spot slip.' },

    { t: 'Create a second static mapping for the other server',
      do: [
        'Map <b>192.168.1.200</b> to <b>203.0.113.200</b>.',
        'Then display the NAT translation table.',
      ],
      done: 'Two static entries are listed.',
      why: 'Static NAT burns one public address per host, which is exactly why PAT exists for ordinary users — and why only servers get this treatment.' },

    { t: 'Note that both entries exist before any traffic flows',
      do: [
        'Look again at the translation table and at the running configuration.',
        'Confirm both mappings are present even though nothing has been sent.',
      ],
      done: 'The entries are there with no traffic.',
      why: 'A static mapping is permanent, which is what allows outsiders to initiate connections inward. Dynamic entries appear only while a flow is active.' },

    { t: 'Name the four NAT address types for one of those mappings',
      do: [
        'Take the first server and say out loud: what is its <b>inside local</b> address, and what is its <b>inside global</b> address?',
      ],
      done: 'You can name both without checking.',
      why: 'Anchor on "local = as seen from inside, global = as seen from outside". The exam WILL ask you to label these on a diagram.' },

    { t: 'PHASE 3 — Configure PAT for the ordinary user hosts',
      do: [
        'On <b>R1</b>, create access list <b>1</b> permitting <b>192.168.1.0 0.0.0.255</b> and look at it.',
        'Then create the dynamic rule: translate sources matching list <b>1</b>, using interface <b>G0/1</b>, with <b>overload</b>.',
        'Check the running configuration and the translation table.',
      ],
      done: 'The overload statement appears alongside the two static mappings.',
      why: 'Here the ACL blocks nothing — it classifies who may be translated. Overload rewrites the source port as well as the address, so the whole LAN shares one public address.' },

    { t: 'PHASE 4 — Repeat the whole configuration on R2 for the second site',
      do: [
        'On <b>R2</b>, mark <b>G0/0</b> inside and <b>G0/1</b> outside.',
        'Then prove how fragile those markings are: remove the outside marking, look at the interface, put it back; do the same with the inside marking.',
      ],
      done: 'Both markings are restored on R2.',
      why: 'With either marking missing, the rules still sit in the configuration looking correct and nothing is translated. This is the single most common "NAT is broken" call.' },

    { t: 'On R2, use a named access list as the classifier instead',
      do: [
        'Create a named standard list <b>NAT-HOSTS</b> permitting <b>172.16.5.0 0.0.0.255</b>.',
        'Then create the PAT rule referencing <b>NAT-HOSTS</b> out of interface <b>G0/1</b> with overload.',
        'Check the configuration and the translation table.',
      ],
      done: 'R2 runs PAT driven by a named list.',
      why: 'Named and numbered lists are interchangeable as classifiers. The named form documents intent — anyone reading NAT-HOSTS knows what it selects without looking it up.' },

    { t: 'PHASE 5 — Remove a static mapping, confirm it has gone, then rebuild it',
      do: [
        'On <b>R1</b>, remove the static mapping for <b>192.168.1.200</b> and check the translation table.',
        'Then add it back and check again.',
      ],
      done: 'The second mapping is present again.',
      why: 'The "no" form must repeat the whole statement, both addresses included. Being able to remove one mapping without disturbing the other is real operational work.' },

    { t: 'Remove and rebuild the PAT statement as well',
      do: [
        'On <b>R1</b>, remove the <b>ip nat inside source list 1 … overload</b> statement and look at the configuration.',
        'Put it straight back.',
        'Then do the same with the inside marking on <b>G0/0</b>: remove it, look, restore it.',
      ],
      done: 'The configuration ends exactly as it started.',
      why: 'Three separate things can be removed independently — the mapping, the rule and the interface marking — and each produces a different failure. Knowing which is missing is the diagnosis.' },

    { t: 'PHASE 6 — Sweep the verification commands on both routers',
      do: [
        'On <b>R1</b>: display the running configuration and the translation table.',
        'On <b>R2</b>: the same two commands.',
        'Point at which lines belong to static NAT and which to PAT.',
      ],
      done: 'You can separate the static and dynamic halves of the configuration by eye.',
      why: 'A real edge router runs both at once: static mappings for the servers, overload for everybody else. Reading that mixture correctly is the practical skill.' },

    { t: 'PHASE 7 — Confirm inside connectivity and reachability to the ISP',
      do: [
        'From <b>PC1</b>: <code>ipconfig</code>, then ping <b>192.168.1.100</b> and <b>192.168.1.1</b>.',
        'From <b>R1</b>: ping <b>203.0.113.2</b>. From <b>R2</b>: ping <b>203.0.113.5</b>.',
        'From <b>PC2</b>: <code>ipconfig</code> and ping <b>172.16.5.1</b>.',
        'Save both routers.',
      ],
      done: 'Inside traffic is unaffected and both edge routers reach the provider.',
      why: 'NAT applies only as packets cross from inside to outside. Traffic that stays inside is untouched — which is why breaking NAT never breaks the LAN, and vice versa.' },
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
  id: 'y3-dhcp', ord: 200, vol: 2, tier: 'deep', day: 'Days 38, 48', title: 'DHCP Server, Relay & Snooping — Full Drill',
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
    { t: 'PHASE 1 — Confirm all four PCs start with no address',
      do: [
        'Run <code>ipconfig</code> on the <b>PC1</b>, <b>PC3</b> and <b>PC4</b> tabs.',
        'All of them are set to obtain an address automatically and none has one.',
      ],
      done: 'No PC shows a usable address.',
      why: 'Four hosts asking, nothing answering. Knowing the starting point makes the effect of each later step unmistakable.' },

    { t: 'PHASE 2 — Exclude the gateway address, then the rest of the low range',
      do: [
        'On <b>R1</b>, exclude the single address <b>10.0.1.1</b> using the one-address form.',
        'Then exclude the range <b>10.0.1.2</b> through <b>10.0.1.9</b> using the range form.',
      ],
      done: 'Two excluded-address lines appear in the configuration.',
      why: 'Two forms of the same command. Exclusions protect the addresses you assigned by hand, and on real gear you type them BEFORE creating any pool.' },

    { t: 'Exclude the low range on both branch subnets too',
      do: [
        'On <b>R1</b>, exclude <b>10.0.2.1</b> to <b>10.0.2.9</b> and <b>10.0.3.1</b> to <b>10.0.3.9</b>.',
        'Check the running configuration.',
      ],
      done: 'Four excluded ranges are listed.',
      why: 'R1 will serve addresses for networks it is not attached to, so the same protection is needed in each of them.' },

    { t: 'PHASE 3 — Build the local pool with every option',
      do: [
        'Create pool <b>LAN1</b> and set its network to <b>10.0.1.0 255.255.255.0</b>.',
        'Then set <b>default-router 10.0.1.1</b>, <b>dns-server 8.8.8.8</b>, <b>domain-name netdrill.lab</b> and <b>lease 7</b>.',
      ],
      done: 'The pool lists five options in the running configuration.',
      why: 'A lease carries far more than an address. Gateway, DNS, domain suffix and duration all ride in the same offer, which is why a DHCP client comes up fully working.' },

    { t: 'PHASE 4 — Build the two branch pools the same way',
      do: [
        'Create pool <b>LAN2</b> for <b>10.0.2.0 255.255.255.0</b> with default-router <b>10.0.2.1</b> and the same DNS, domain and lease.',
        'Create pool <b>LAN3</b> for <b>10.0.3.0 255.255.255.0</b> with default-router <b>10.0.3.1</b> and the same options.',
      ],
      done: 'Three pools exist on one router.',
      why: 'One server, three subnets, two of which it is not connected to. The server picks the right pool from the address the relay stamps on the request.' },

    { t: 'PHASE 5 — Lease addresses on both local PCs',
      do: [
        'On <b>PC1</b>: <code>ipconfig /renew</code> then <code>ipconfig /all</code> — read the gateway, DNS and domain it received.',
        'On <b>PC2</b>: renew as well.',
        'On <b>R1</b>: display the DHCP bindings.',
      ],
      done: 'Both local PCs hold addresses and the server lists two bindings.',
      why: 'The local case works immediately because these hosts share a broadcast domain with the server.' },

    { t: 'PHASE 6 — Try a branch PC and watch it fail',
      do: [
        'On <b>PC3</b>, run <code>ipconfig /renew</code>.',
        'Expect no address. This failure is deliberate.',
      ],
      done: 'PC3 still has no address.',
      why: 'Routers do not forward broadcasts, so PC3\'s DISCOVER dies at R2 and is never heard. Feeling this failure first is what makes the fix memorable.' },

    { t: 'Add the relay on R2 and renew again',
      do: [
        'On <b>R2</b>, enter interface <b>G0/0</b> — the one facing PC3 — and add helper address <b>10.0.12.1</b>.',
        'Confirm with the layer-3 interface view.',
        'Back on <b>PC3</b>: renew, then run <code>ipconfig /all</code>.',
      ],
      done: 'PC3 holds an address from the LAN2 pool.',
      why: 'The relay converts the broadcast into a unicast aimed at the server and stamps it with its own interface address, which is how R1 knows which pool to use.' },

    { t: 'PHASE 7 — Repeat the relay configuration on R3',
      do: [
        'On <b>PC4</b>, try renewing first — it fails, exactly like PC3 did.',
        'On <b>R3</b>, add helper address <b>10.0.13.1</b> to interface <b>G0/0</b>.',
        'Renew <b>PC4</b> and check its full configuration.',
      ],
      done: 'All four PCs hold addresses.',
      why: 'Second branch, same one-line fix. The helper always goes on the interface that HEARS the clients, never the one facing the server.' },

    { t: 'PHASE 8 — Inspect the bindings and the clients in detail',
      do: [
        'On <b>R1</b>: display the DHCP bindings and count them.',
        'On <b>PC1</b> and <b>PC4</b>: run <code>ipconfig /all</code> and compare the two leases.',
      ],
      done: 'Four bindings across three pools, and two clients with different gateways.',
      why: 'One server, three subnets, four clients. The bindings table is the server\'s own record of who holds what and until when.' },

    { t: 'PHASE 9 — Remove a pool, confirm it is gone, then rebuild it',
      do: [
        'On <b>R1</b>, delete pool <b>LAN3</b> and look at the running configuration.',
        'Then rebuild it in full: network, default-router, dns-server, domain-name and lease.',
      ],
      done: 'The pool is back with all five options.',
      why: 'There is no way to edit a pool back into existence — you retype it. That is a real argument for keeping configuration backups.' },

    { t: 'Demonstrate the classic helper mistake',
      do: [
        'On <b>R3</b>, put a helper address on <b>G0/1</b> — the interface facing the server rather than the clients — and look at it.',
        'Then remove it and confirm the correct one on <b>G0/0</b> is still there.',
        'Renew <b>PC4</b> to prove nothing broke.',
      ],
      done: 'Only the client-facing interface carries a helper.',
      why: 'No client broadcast ever arrives on the server-facing interface, so a helper there accomplishes precisely nothing — and it looks perfectly reasonable in a configuration.' },

    { t: 'PHASE 10 — Secure the access layer with DHCP snooping',
      do: [
        'On <b>SW1</b>: enable <b>service dhcp</b> and DHCP snooping globally, then look at the status.',
        'Scope snooping to <b>VLAN 1</b> and look again.',
        'Trust interface <b>G0/1</b>, the uplink toward R1.',
      ],
      done: 'Snooping is enabled, scoped, and only the uplink is trusted.',
      why: 'Enabled but unscoped inspects nothing; scoped but untrusted-everywhere drops your own server. Both halves are needed, which is why the exam loves this pair.' },

    { t: 'Prove the security did not break the legitimate flow',
      do: [
        'Renew <b>PC1</b> and <b>PC2</b> once more.',
        'On <b>SW1</b>, switch snooping off and straight back on (remembering the VLAN line), then check the status.',
        'Finally display the bindings on <b>R1</b> and save all four devices.',
      ],
      done: 'Both PCs renew and all four devices are saved.',
      why: 'Client requests are permitted from untrusted ports; only server replies are restricted. Security that breaks the service gets switched off by Monday.' },
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
  id: 'y4-switch-security', ord: 300, vol: 2, tier: 'deep', day: 'Days 41, 47', title: 'SSH & Port Security — Full Drill',
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
    { t: 'PHASE 1 — Try to generate keys before setting a domain name, and read the refusal',
      do: [
        'On <b>SW1</b>, in global configuration mode, try to generate RSA keys with modulus <b>2048</b> straight away.',
        'Read the error carefully. This failure is deliberate.',
      ],
      done: 'IOS refuses to generate the key.',
      why: 'The key is named hostname.domain, so neither can be missing. Meeting the refusal on purpose is how the prerequisite order stops being something you memorise.' },

    { t: 'Try to force SSH version 2 before any keys exist',
      do: [
        'Still on <b>SW1</b>, try to set the SSH version to <b>2</b>.',
        'Read that refusal too.',
      ],
      done: 'IOS rejects the command.',
      why: 'Version 2 needs a key of at least 768 bits to exist first. Two refusals, two prerequisites — and now the correct order will be obvious.' },

    { t: 'PHASE 2 — Build the whole stack in the right order',
      do: [
        'Set the hostname to <b>SW1</b>.',
        'Create <b>interface Vlan 1</b> with <b>192.168.1.2 255.255.255.0</b> and enable it.',
        'Set the default gateway to <b>192.168.1.1</b>.',
        'Set the domain name to <b>netdrill.lab</b>, then generate <b>2048</b>-bit RSA keys.',
        'Set SSH version <b>2</b> and create <b>username admin</b> with secret <b>Str0ngPass</b>.',
        'On the <b>vty lines 0 4</b>: <b>login local</b>, <b>transport input ssh</b>, exec-timeout <b>5 0</b>.',
      ],
      done: '<code>show ip ssh</code> reports SSH enabled at version 2.',
      why: 'Eight steps in a fixed order, each depending on the last. This block is worth being able to type without thinking, because it is the first thing done to every new device.' },

    { t: 'Restrict who may even attempt to log in',
      do: [
        'Create a named standard list <b>MGMT-ONLY</b> permitting <b>192.168.1.0 0.0.0.255</b>.',
        'Attach it to the <b>vty lines</b> with <b>access-class MGMT-ONLY in</b>.',
        'Confirm with <code>show ip ssh</code> and the running configuration.',
      ],
      done: 'The access-class line appears under line vty 0 4.',
      why: 'SSH proves who you are; access-class decides who may even knock. Together with the idle timeout, that is the complete management hardening for a switch.' },

    { t: 'PHASE 3 — Build the identical stack on SW2',
      do: [
        'On <b>SW2</b>, type the whole block again with its own addressing: SVI <b>192.168.2.2/24</b>, gateway <b>192.168.2.1</b>.',
        'Its <b>MGMT-ONLY</b> list permits <b>192.168.2.0 0.0.0.255</b> and <b>192.168.1.0 0.0.0.255</b>.',
      ],
      done: 'SW2 also reports SSH enabled at version 2.',
      why: 'Second time through, from memory if you can. Note the second permit line: the management network on the other site must also be allowed in.' },

    { t: 'PHASE 4 — Build it a third time on a router',
      do: [
        'On <b>R1</b>, set the domain name (try the newer <b>ip domain name</b> spelling), generate keys, set version 2, create the admin user.',
        'Configure the vty lines the same way and attach a <b>MGMT-ONLY</b> list permitting <b>192.168.1.0 0.0.0.255</b>.',
        'Note what is missing compared with the switches.',
      ],
      done: 'R1 reports SSH enabled and you can name the two steps a router does not need.',
      why: 'No SVI and no default gateway — a router already has routed interfaces and its own routing table. Everything else is word for word identical.' },

    { t: 'PHASE 5 — Meet the port-security ordering rule the hard way',
      do: [
        'On <b>SW1</b>, enter interface <b>F0/1</b> and try to enable port security immediately. Read the rejection.',
        'Now set the port to <b>access</b> mode in VLAN <b>1</b>, then enable port security.',
        'Set the maximum to <b>2</b> and enable <b>sticky</b> learning, leaving the violation mode at its default.',
      ],
      done: 'F0/1 has port security with max 2 and sticky learning.',
      why: 'Port security is refused on a port still in dynamic mode. Maximum 2 is the realistic setting for a PC behind an IP phone, and the default violation action is shutdown.' },

    { t: 'Configure a second port with the restrict violation mode',
      do: [
        'On <b>SW1 F0/2</b>: access mode, port security, maximum <b>1</b>, violation <b>restrict</b>, sticky learning.',
      ],
      done: 'F0/2 shows violation mode Restrict.',
      why: 'Restrict drops the offending frames and logs and counts each one, but leaves the port up — a gentler response than err-disabling a user\'s port.' },

    { t: 'Configure a third port with protect mode and a typed MAC address',
      do: [
        'On <b>SW1 F0/3</b>: access mode, port security, maximum <b>1</b>, violation <b>protect</b>.',
        'Add a static secure MAC address of <b>aaaa.bbbb.cccc</b> instead of letting the port learn one.',
      ],
      done: 'F0/3 shows violation mode Protect with a manually configured address.',
      why: 'Protect drops silently — no log, no counter — which is why it is the trick answer in exam questions. A typed MAC binds the port to one specific device with no learning at all.' },

    { t: 'PHASE 6 — Repeat port security on SW2 with different values',
      do: [
        'On <b>SW2 F0/1</b>: access mode, port security, maximum <b>3</b>, sticky learning.',
        'On <b>SW2 F0/2</b>: port security with violation <b>restrict</b>.',
        'On <b>SW2 F0/3</b>: port security with violation <b>protect</b> and static MAC <b>dddd.eeee.ffff</b>.',
      ],
      done: 'Three more secured ports with three different policies.',
      why: 'Six secured ports across two switches, covering every combination of maximum, violation mode and learning style that the exam can ask about.' },

    { t: 'PHASE 7 — Generate traffic so the sticky ports learn',
      do: [
        'From <b>PC1</b>: <code>ipconfig</code>, then ping <b>192.168.1.11</b> and <b>192.168.1.1</b>.',
        'From <b>PC3</b>: <code>ipconfig</code> and ping <b>192.168.2.1</b>.',
        'On <b>SW1</b> and <b>SW2</b>, display the running configuration and find the sticky MAC addresses that were written in.',
      ],
      done: 'Sticky address lines appear under the secured interfaces.',
      why: 'Sticky learning needs a frame to learn from. Once learned, the address becomes a configuration line — save the config and the binding survives a reboot.' },

    { t: 'PHASE 8 — Shut down every unused port on both switches',
      do: [
        'On <b>SW1</b>, select <b>F0/4 - 6</b> as a range, describe them <b>UNUSED</b> and disable them.',
        'On <b>SW2</b>, do the same for <b>F0/4</b>.',
        'Check the interface status on both.',
      ],
      done: 'The unused ports read "disabled".',
      why: 'Port security protects the ports in use; disabling covers the ones that are not. Together they close both halves of the physical attack surface.' },

    { t: 'PHASE 9 — Remove port security from one port, then put it back',
      do: [
        'On <b>SW1 F0/3</b>, remove port security entirely with the "no" form and look at the port-security summary.',
        'Then rebuild it: port security, maximum 1, violation protect, static MAC <b>aaaa.bbbb.cccc</b>.',
      ],
      done: 'F0/3 is protected again with the same settings.',
      why: 'The bare "no" form removes the whole feature from the port, taking every sub-setting with it. Knowing that saves you removing five lines one at a time.' },

    { t: 'PHASE 10 — Sweep the verification commands on all three devices',
      do: [
        'On <b>SW1</b>: the port-security summary, then the detail for <b>F0/1</b> and <b>F0/2</b>, then <code>show ip ssh</code>, then save.',
        'On <b>SW2</b>: the summary, the detail for F0/1, <code>show ip ssh</code>, and save.',
        'On <b>R1</b>: <code>show ip ssh</code> and save.',
      ],
      done: 'All three devices verified and saved.',
      why: 'The summary answers "which ports are protected and has anything tripped?"; the per-port detail answers "what is this one port doing right now?" — including spotting a Secure-shutdown state.' },
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
  id: 'y5-mgmt-services', ord: 400, vol: 2, tier: 'deep', day: 'Days 35-40', title: 'NTP, Syslog & Discovery — Full Drill',
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
    { t: 'PHASE 1 — Check the clock state on all three routers before configuring anything',
      do: [
        'On <b>R1</b>: enter privileged EXEC, set <b>terminal length 0</b>, then display the NTP status and the clock.',
        'On <b>R2</b> and <b>R3</b>: display the NTP status as well.',
        'Note the stratum each reports.',
      ],
      done: 'All three report stratum 16 and "unsynchronized".',
      why: 'Stratum 16 means "I have no trustworthy time source". Three routers with three unreliable clocks means their logs cannot be correlated at all.' },

    { t: 'PHASE 2 — Make R1 the authoritative time source at stratum 3',
      do: [
        'On <b>R1</b>, configure it as an NTP <b>master</b> with stratum <b>3</b>.',
        'Display the NTP status again and compare with what you saw a moment ago.',
      ],
      done: 'R1 reports itself synchronised at stratum 3.',
      why: 'Somebody must be the reference. Stratum 3 is an arbitrary but sensible claim for a lab; production would point at a public pool or a GPS appliance instead.' },

    { t: 'Build a chain of clients rather than a star',
      do: [
        'On <b>R2</b>, configure NTP server <b>10.0.12.1</b> (R1), then display the status and the associations.',
        'On <b>R3</b>, configure NTP server <b>10.0.23.1</b> (R2), then display the status and associations.',
      ],
      done: 'R2 sits one stratum below R1, and R3 one below R2.',
      why: 'Each hop away from the reference adds a stratum. A chain makes the hierarchy visible in a way that everyone pointing at one server does not.' },

    { t: 'Inspect the result across the chain',
      do: [
        'On <b>R1</b>: display the NTP status and the clock — note the absence of a leading asterisk now.',
        'On <b>R3</b>: display the clock and compare it with R1\'s.',
      ],
      done: 'All three routers agree on the time.',
      why: 'A leading asterisk means the time is NOT authoritative. With it gone, log timestamps from different devices can finally be compared against each other.' },

    { t: 'PHASE 3 — Send R1\'s logs to the syslog server',
      do: [
        'On <b>R1</b>, first display the logging configuration to see the starting state.',
        'Then configure logging host <b>10.0.0.100</b> and look again.',
      ],
      done: 'The server address appears in the logging output.',
      why: 'Logs kept only on a device vanish with it — which matters most exactly when the device dies or is compromised. Syslog travels over UDP port 514.' },

    { t: 'Experiment with three different severity levels',
      do: [
        'On <b>R1</b>, set the trap level to <b>errors</b> and look at the logging output.',
        'Then set it to <b>debugging</b> and look again.',
        'Finally settle on <b>warnings</b>.',
      ],
      done: 'The trap level ends as warnings.',
      why: 'Errors is level 3 — quiet, but you would miss link flaps. Debugging is level 7 — everything, which is overwhelming as a permanent setting. Warnings is level 4 and is the sensible production value.' },

    { t: 'Add a local buffer and silence the console',
      do: [
        'On <b>R1</b>, configure buffered logging at <b>16384</b> bytes and disable console logging.',
        'Display the logging configuration and read the level of each destination separately.',
      ],
      done: 'Buffer, host and console each show their own state.',
      why: 'Destinations are independent. The buffer gives you instant recent history with no server round trip, and disabling console logging stops messages interrupting you mid-command.' },

    { t: 'PHASE 4 — Repeat the logging configuration on R2 and SW1',
      do: [
        'On <b>R2</b>: logging host <b>10.0.0.100</b>, trap <b>warnings</b>, buffered <b>16384</b>, console logging off.',
        'On <b>SW1</b>: the same host, trap level and buffer.',
      ],
      done: 'Three devices log centrally at the same level.',
      why: 'Four lines, identical on every device. Consistency is what makes central logging useful — and nothing about syslog is router-specific.' },

    { t: 'PHASE 5 — Generate a real log message and decode it',
      do: [
        'On <b>R2</b>, bounce interface <b>G0/2</b>: disable it, then enable it again.',
        'Display the logging buffer and find the message.',
        'Break <code>%LINK-5-CHANGED</code> into facility, severity and mnemonic.',
      ],
      done: 'You can name all three parts of the message.',
      why: 'Severity 5 falls below the warnings trap level, so only the local buffer kept it — that is the filter doing exactly what you configured.' },

    { t: 'PHASE 6 — Map the whole network with CDP from three vantage points',
      do: [
        'On <b>R1</b>: display CDP status, the neighbour summary, and then the detailed view.',
        'On <b>R2</b>: display the neighbour summary — it should list three neighbours.',
        'On <b>SW1</b>: display the summary as well.',
      ],
      done: 'Between the three views you have the whole topology.',
      why: 'Summary gives you the map; detail adds IP addresses and platform strings. Remember "Local Intrfce" is your port and "Port ID" is theirs — getting that backwards is a classic exam mistake.' },

    { t: 'PHASE 7 — Disable CDP on one link only',
      do: [
        'On <b>R2</b>, enter interface <b>G0/1</b> and disable CDP on that interface alone.',
        'Display the neighbour summary and see which neighbour disappeared.',
      ],
      done: 'R3 is gone while R1 and SW2 remain.',
      why: 'This is the surgical, per-interface form — the one you use to silence an untrusted edge without losing visibility inside your own network.' },

    { t: 'Then disable CDP device-wide on another router',
      do: [
        'On <b>R3</b>, disable CDP globally and display the CDP status.',
      ],
      done: 'R3 reports CDP is not enabled at all.',
      why: '"no cdp run" is global and stops the device speaking CDP on every port at once. Knowing which command is which is examined directly.' },

    { t: 'Re-enable CDP on the interface you silenced',
      do: [
        'On <b>R2 G0/1</b>, enable CDP again with the positive form, then display the neighbour summary.',
        'Note that R3 still does not appear.',
      ],
      done: 'R2\'s interface speaks CDP again but R3 is still invisible.',
      why: 'Both ends must run the protocol for a neighbour to appear. R3 is silent globally, so re-enabling one interface on R2 changes nothing — a genuinely useful diagnostic insight.' },

    { t: 'PHASE 8 — Enable LLDP on all five devices',
      do: [
        'Enable LLDP on <b>R1</b>, <b>R2</b>, <b>R3</b>, <b>SW1</b> and <b>SW2</b>.',
        'On <b>SW2</b>, also switch it off and back on again to drill the "no" form.',
        'Then on <b>R2</b>, display the LLDP neighbours and the CDP neighbours side by side.',
      ],
      done: 'LLDP shows R3 even though CDP does not.',
      why: 'LLDP is IEEE 802.1AB and is OFF by default on Cisco gear — the reverse of CDP. You have deliberately created an asymmetry: the same topology visible over one protocol and invisible over the other.' },

    { t: 'PHASE 9 — Sweep every verification command across the network',
      do: [
        'On <b>R1</b>: NTP status, NTP associations, logging, CDP neighbours, LLDP neighbours — then save.',
        'On <b>R2</b>: NTP status, logging, both neighbour views — then save.',
        'On <b>R3</b>: NTP status, clock, LLDP neighbours — then save.',
        'On <b>SW1</b> and <b>SW2</b>: logging and LLDP where relevant, then save both.',
      ],
      done: 'All five devices verified and saved.',
      why: 'These are exactly the commands you run on a device you have never seen before: what time does it think it is, where do its logs go, and what is it plugged into?' },
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
  id: 'y6-troubleshooting', ord: 500, vol: 2, tier: 'deep', day: 'Capstone', title: 'Troubleshooting Gauntlet — Full Drill',
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
    { t: 'PHASE 1 — Reproduce the problem from all three PCs before touching anything',
      do: [
        'From <b>PC1</b>: <code>ipconfig</code>, then ping its gateway <b>10.0.10.1</b>, then the server <b>10.0.30.100</b>.',
        'From <b>PC2</b>: <code>ipconfig</code>, then ping <b>10.0.20.1</b> and <b>10.0.30.100</b>.',
        'From <b>PC3</b>: <code>ipconfig</code>, then ping <b>10.0.20.1</b>.',
        'Write down which of those succeed and which fail.',
      ],
      done: 'You have a written list of symptoms before any change is made.',
      why: 'Symptoms are data. Three hosts failing in three different ways narrows the search far faster than one ping does — and you cannot prove a repair without a baseline.' },

    { t: 'Test a path that involves no router at all',
      do: [
        'From <b>PC2</b>, ping <b>10.0.20.11</b> — that is PC3, in the same VLAN and the same subnet, on the other switch.',
      ],
      done: 'The ping fails.',
      why: 'That test uses pure layer 2 across the trunk. Failing here proves at least one fault lives in the switching path, before you waste time on routers.' },

    { t: 'PHASE 2 — FAULT 1: find the access port in the wrong VLAN on SW1',
      do: [
        'On <b>SW1</b>, enter privileged EXEC, set terminal length 0 and display the VLAN table and the interface status.',
        'Compare the VLAN of <b>F0/1</b> (PC1) with the VLAN of the other ports, and confirm it on the interface itself with the per-port switchport view.',
        'Then put <b>F0/1</b> back into VLAN <b>10</b> and verify.',
      ],
      done: 'Fa0/1 appears under VLAN 10 in the VLAN table.',
      why: 'Two ports in different VLANs cannot talk however perfect the addressing is. The VLAN table exposes it in one screen — always the first check at layer 2.' },

    { t: 'FAULT 2: find the VLAN missing from SW1\'s trunk allowed list',
      do: [
        'On <b>SW1</b>, display the trunk status and read the allowed VLAN list on <b>G0/1</b>.',
        'Add the missing VLAN with the <b>add</b> form, then verify.',
        'Re-test from <b>PC2</b> to <b>10.0.20.11</b> — still failing, which is expected.',
      ],
      done: 'The trunk allows both VLAN 10 and VLAN 20.',
      why: 'Use <b>add</b>, never the bare form — the bare form REPLACES the list and would have cut off VLAN 10 instead. One fault fixed does not mean one fault only.' },

    { t: 'PHASE 3 — FAULT 3: find the VLAN that does not exist on SW2',
      do: [
        'On <b>SW2</b>, display the VLAN table and compare it with SW1\'s.',
        'Create the missing VLAN <b>20</b> and name it <b>SALES</b>.',
      ],
      done: 'Both switches list the same VLANs.',
      why: 'A switch drops frames for a VLAN it has never heard of, no matter what the trunk allows. Two separate conditions must both be true — existence AND allowance.' },

    { t: 'FAULT 4: find the err-disabled port and work out why',
      do: [
        'On <b>SW2</b>, display the interface status and find the port reading <b>err-disabled</b>.',
        'Ask that port why: display the port-security detail for <b>F0/1</b> and read the Port Status and violation count.',
      ],
      done: 'You can state the reason the switch disabled the port itself.',
      why: 'err-disabled is not the same as "administratively down" (somebody typed shutdown) or "notconnect" (nothing plugged in). The switch made this decision on its own.' },

    { t: 'Fix the cause first, then recover the port',
      do: [
        'On <b>SW2 F0/1</b>, raise the port-security maximum to <b>2</b> so the port will not trip again.',
        'Then recover it: <b>shutdown</b> followed by <b>no shutdown</b>.',
        'Verify with the interface status, the port-security detail and the trunk status.',
      ],
      done: 'The port reads connected and Secure-up.',
      why: 'Only a shut/no-shut clears err-disable by hand; a bare <code>no shutdown</code> does nothing at all, which catches almost everybody once. Fix the condition before recovering the symptom or it simply trips again.' },

    { t: 'Confirm layer 2 is now healthy end to end',
      do: [
        'From <b>PC2</b>, ping <b>10.0.20.11</b> again.',
      ],
      done: 'Two hosts in the same VLAN on different switches can now talk.',
      why: 'That single success proves the access VLANs, the trunk allowed lists and both VLAN databases all agree. The switching path is finished.' },

    { t: 'PHASE 4 — FAULT 5: find the gateway addressed wrongly on R1',
      do: [
        'From <b>PC1</b>, ping <b>10.0.10.1</b> again — still failing, so the fault has moved up to layer 3.',
        'On <b>R1</b>, display the interface summary and the running configuration, then look closely at <b>G0/0.10</b> with the layer-3 interface view.',
        'Compare its address with the gateway the PCs are configured to use, and correct it to <b>10.0.10.1</b>.',
        'Re-test from PC1 immediately.',
      ],
      done: 'PC1 reaches its gateway.',
      why: 'The router was perfectly healthy and answering — on an address nobody was asking for. Always compare the router\'s address against the hosts\' own ipconfig output.' },

    { t: 'FAULT 6: find the subinterface tagged for the wrong VLAN',
      do: [
        'From <b>PC2</b>, ping <b>10.0.20.1</b> — still failing, even though that subinterface has the right address.',
        'On <b>R1</b>, read the running configuration and check the dot1Q tag on <b>G0/0.20</b>.',
        'Correct the encapsulation to VLAN <b>20</b> and re-test from PC2 and PC3.',
      ],
      done: 'Both VLAN 20 hosts reach their gateway.',
      why: 'Router-on-a-stick has two halves — the tag and the address — and the subinterface NUMBER is cosmetic. Only the encapsulation command decides which tagged frames the router accepts.' },

    { t: 'PHASE 5 — FAULT 7: find the interface that is administratively down',
      do: [
        'From <b>PC1</b>, ping <b>10.0.30.100</b> — local works, remote does not.',
        'On <b>R1</b>, display the interface summary and find the interface reading <b>administratively down</b>.',
        'Enable it, verify, then ping <b>10.0.12.2</b> from R1 — it still fails.',
      ],
      done: 'The WAN interface is up but the far end does not answer.',
      why: '"administratively down" has exactly one cause: somebody typed shutdown. Up/up means the cable and protocol are fine — it says nothing about the addressing.' },

    { t: 'FAULT 8: find the /30 mismatch across the WAN link',
      do: [
        'On <b>R1</b>, read the layer-3 detail of <b>G0/1</b> and work out which addresses its /30 actually covers.',
        'On <b>R2</b>, display the interface summary and the CDP neighbours — the cable is right, the address is not.',
        'Correct <b>R2 G0/0</b> to <b>10.0.12.2 255.255.255.252</b> and ping across from both sides.',
      ],
      done: 'The two routers reach each other.',
      why: 'With a /30 the usable pairs are .1/.2, then .5/.6. 10.0.12.1 and 10.0.12.5 are numerically adjacent and in different networks — never accept a link as working from one side only.' },

    { t: 'PHASE 6 — FAULT 9: find the route pointing at a next hop nobody owns',
      do: [
        'On <b>R1</b>, display the routing table and look at the static route to <b>10.0.30.0/24</b>.',
        'Check whether its next hop is inside the /30 you just repaired.',
        'Remove the bad route, add one via <b>10.0.12.2</b>, then verify and try pinging the server from R1.',
      ],
      done: 'The route is corrected but the ping from R1 still fails.',
      why: 'Remove first, then add. Leaving both in place would give two routes of equal length and equal AD, and the router would load-balance half your traffic into a black hole.' },

    { t: 'FAULT 10: find the missing return routes on R2',
      do: [
        'On <b>R2</b>, display the routing table — it knows only its two connected subnets.',
        'Add routes for <b>10.0.10.0/24</b> and <b>10.0.20.0/24</b>, both via <b>10.0.12.1</b>.',
        'Verify, then ping the server from <b>R1</b> again.',
      ],
      done: 'R1 reaches the server.',
      why: 'Traffic needs a path there AND back. A single summary — 10.0.0.0/16 via 10.0.12.1 — would also work and is what you would write in production.' },

    { t: 'PHASE 7 — FAULT 11: find the access list eating ICMP',
      do: [
        'From <b>PC1</b>, ping <b>10.0.30.100</b> — routing is complete and it still fails.',
        'On <b>R2</b>, display the layer-3 view of <b>G0/1</b> and the access lists.',
        'Detach the offending list from the interface and confirm the interface is clean.',
      ],
      done: 'No access list is applied to the server LAN interface.',
      why: 'When the path exists and traffic still dies, suspect a filter. One protocol failing while others work is the fingerprint of an ACL — and detaching is enough, the list can stay defined.' },

    { t: 'PHASE 8 — Verify the repaired network from every host, in both directions',
      do: [
        'From <b>PC1</b>: ping <b>10.0.30.100</b> and trace the route to it.',
        'From <b>PC2</b>: ping its gateway, then <b>10.0.10.10</b>, then the server.',
        'From <b>PC3</b>: ping the server and trace the route.',
        'From <b>SRV</b>: ping all three hosts.',
      ],
      done: 'Every host reaches every other host, in both directions.',
      why: 'A fix that works one way is not a fix. PC3\'s traffic in particular crosses the recovered err-disabled port, both trunks, the ROAS gateway and the WAN — the longest path in the network.' },

    { t: 'Sweep the diagnostic commands and save every device',
      do: [
        'On <b>SW1</b>: VLAN table, trunk status, interface status — then save.',
        'On <b>SW2</b>: VLAN table, trunk status, port-security summary — then save.',
        'On <b>R1</b>: interface summary, routing table, the layer-3 view of a subinterface — then save.',
        'On <b>R2</b>: interface summary, routing table, access lists — then save.',
      ],
      done: 'All four devices are verified and saved.',
      why: 'Those five commands — interface brief, vlan brief, interfaces trunk, ip route and ip interface — diagnose the overwhelming majority of CCNA-level faults, including all eleven in this lab. Run it again from scratch and time yourself.' },
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
