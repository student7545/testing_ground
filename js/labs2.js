/* NetDrill labs — Volume 2 (JITL Days 33+: ACLs, services, security). */
'use strict';
(function () {
const ND = window.ND;
const L = lab => ND.LABS.push(lab);

/* ============================================================= */
L({
  id: 'd33-std-acl', ord: 33, vol: 1, day: 'Day 33', title: 'Standard ACLs',
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
    { t: 'Record the "before" picture from both PCs',
      do: [
        'Switch to the <b>PC1</b> tab and ping the server at <b>10.0.3.100</b>.',
        'Switch to the <b>PC2</b> tab and ping <b>10.0.3.100</b> as well.',
        'Both should succeed right now — nothing is filtered yet.',
      ],
      done: 'Both PCs get replies from the server.',
      why: 'If you do not know what worked before your change, you cannot prove what your change actually did. Every filtering job starts with a baseline.' },

    { t: 'On R1, create access list 10 with a line permitting PC1\'s network',
      do: [
        'Work on the <b>R1</b> tab, in global configuration mode.',
        'Create a numbered access list <b>10</b> that <b>permits</b> network <b>10.0.1.0</b> with wildcard <b>0.0.0.255</b>.',
      ],
      done: '<code>show access-lists</code> shows list 10 with one permit entry.',
      why: 'Numbers 1-99 mean a standard ACL, which matches the SOURCE address only. The wildcard 0.0.0.255 means "any host in this /24" — it is an inverted subnet mask.' },

    { t: 'Add a second line to list 10 denying PC2\'s network',
      do: [
        'Still in global configuration mode, add a line to list <b>10</b> that <b>denies</b> network <b>10.0.2.0</b> with wildcard <b>0.0.0.255</b>.',
        'It must come <b>after</b> the permit line you just wrote.',
      ],
      done: 'List 10 now shows a permit entry followed by a deny entry.',
      why: 'Order matters enormously: the router reads top to bottom and stops at the first match. Put this deny first and PC1 would be blocked as well.' },

    { t: 'Apply list 10 outbound on the interface facing the server',
      do: [
        'Enter interface <b>G0/2</b> — the port the server is plugged into.',
        'Apply access list <b>10</b> in the <b>out</b> direction.',
      ],
      done: '<code>show ip interface g0/2</code> reports "Outgoing access list is 10".',
      why: 'The placement rule for standard ACLs is close to the DESTINATION. They cannot see where traffic is heading, so filtering near the source would block that PC from reaching everything, not just this server.' },

    { t: 'Read the list back and check the line order',
      do: [
        'Display the access lists.',
        'Confirm the permit line is first and the deny second, and note the sequence numbers beside them.',
      ],
      done: 'The two lines appear in the intended order.',
      why: 'Those sequence numbers are how you would insert or delete an individual line later without rebuilding the whole list.' },

    { t: 'Confirm the list is actually applied to an interface',
      do: [
        'Display the layer-3 detail for <b>G0/2</b>.',
        'Look for the line naming the outgoing access list.',
      ],
      done: 'The interface reports access list 10 outbound.',
      why: 'An ACL that exists but is not applied anywhere does absolutely nothing. It is the most common reason a "correct" filter has no effect.' },

    { t: 'Test from PC1 — this must still WORK',
      do: [
        'On the <b>PC1</b> tab, ping <b>10.0.3.100</b> again.',
      ],
      done: 'PC1 still gets replies.',
      why: 'Always prove what still works, not just what broke. PC1 matches the permit line at the top and is never tested against anything below it.' },

    { t: 'Test from PC2 — this must now FAIL',
      do: [
        'On the <b>PC2</b> tab, ping <b>10.0.3.100</b>.',
        'Expect the ping to fail — on a router the output often shows <code>U.U.U</code>, meaning administratively unreachable.',
      ],
      done: 'PC2 is blocked while PC1 still succeeds.',
      why: 'PC2 falls through to the deny line. Remember there is also an invisible deny-everything at the bottom of every ACL, so anything you do not explicitly permit is dropped anyway.' },
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
  id: 'd34-ext-acl', ord: 34, vol: 1, day: 'Day 34', title: 'Extended ACLs',
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
    { t: 'On R1, start a named extended access list called WEB-ONLY',
      do: [
        'Work on the <b>R1</b> tab, in global configuration mode.',
        'Create a <b>named extended</b> access list with the name <b>WEB-ONLY</b> (capitals and the hyphen exactly as written).',
        'Your prompt moves into the ACL configuration mode, where you type the entries one per line.',
      ],
      done: 'The prompt reads <code>R1(config-ext-nacl)#</code>.',
      why: 'Named lists read better than numbers and let you insert or delete individual lines later by sequence number — something numbered lists cannot do.' },

    { t: 'Entry 1 — permit web traffic from PC1\'s network to the server',
      do: [
        'Add a <b>permit</b> entry for protocol <b>tcp</b>, from source network <b>10.0.1.0</b> wildcard <b>0.0.0.255</b>, to destination <b>host 10.0.3.100</b>, where the destination port equals <b>80</b>.',
      ],
      done: 'The entry appears in <code>show access-lists</code> as permit tcp … eq www.',
      why: 'An extended ACL matches protocol, source, destination AND port. This single line allows web browsing to exactly one server and says nothing about anything else.' },

    { t: 'Entry 2 — deny ping from that same network to that same server',
      do: [
        'Add a <b>deny</b> entry for protocol <b>icmp</b>, from <b>10.0.1.0 0.0.0.255</b>, to <b>host 10.0.3.100</b>.',
        'ICMP has no ports, so the entry simply ends at the destination.',
      ],
      done: 'A deny icmp entry sits below the permit tcp entry.',
      why: 'ICMP is what ping uses. Blocking it while still allowing web traffic between the very same two machines is precision a standard ACL cannot achieve at all.' },

    { t: 'Entry 3 — permit everything else, and make sure it is LAST',
      do: [
        'Add a <b>permit</b> entry for protocol <b>ip</b> from <b>any</b> to <b>any</b>.',
        'Then leave the ACL configuration mode.',
      ],
      done: 'The list reads: permit tcp … eq 80, deny icmp …, permit ip any any.',
      why: 'Every ACL ends with an invisible deny-everything, so without this line all other traffic would be dropped. Put it first, though, and nothing below it would ever be reached.' },

    { t: 'Apply WEB-ONLY inbound where PC1\'s traffic enters the router',
      do: [
        'Enter interface <b>G0/0</b> — the port PC1\'s network is plugged into.',
        'Apply access list <b>WEB-ONLY</b> in the <b>in</b> direction.',
      ],
      done: '<code>show ip interface g0/0</code> reports "Inbound access list is WEB-ONLY".',
      why: 'The placement rule for extended ACLs is close to the SOURCE. They identify traffic precisely, so there is no reason to carry doomed packets across the network before dropping them.' },

    { t: 'Trace the list by eye before testing it',
      do: [
        'Display the access lists.',
        'Ask yourself: which line does a web packet from PC1 match? Which line does a ping from PC1 match? Which line does traffic to any other destination match?',
      ],
      done: 'You can name the matching line for all three cases without guessing.',
      why: 'That mental trace — walking a packet down the list until something matches — is exactly what an exam question asks you to do, and what troubleshooting a live ACL requires.' },

    { t: 'Test from PC1 — the ping must now FAIL',
      do: [
        'Switch to the <b>PC1</b> tab and ping <b>10.0.3.100</b>.',
        'Expect it to be blocked.',
      ],
      done: 'The ping fails, but the ACL still permits TCP 80 to the same host.',
      why: 'Same source, same destination, two different outcomes decided purely by protocol. That is the whole reason extended ACLs exist.' },
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
  id: 'd35-cdp-lldp', ord: 35, vol: 2, day: 'Day 35', title: 'CDP & LLDP',
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
    { t: 'On SW1, list the neighbours CDP has already discovered',
      do: [
        'Work on the <b>SW1</b> tab and enter privileged EXEC mode.',
        'Display the CDP neighbour summary.',
        'You should see two neighbours — R1 and SW2.',
      ],
      done: 'Two devices are listed, each with a local port and a port ID.',
      why: 'Discovery hands you the network map for free: who is attached and on which port. It is the first tool to reach for on a network you have never seen.' },

    { t: 'Look at the detailed CDP view and notice how much it reveals',
      do: [
        'Run the CDP neighbour command again with the <b>detail</b> keyword.',
        'Note what appears that the summary did not show: IP addresses, platform and IOS version.',
      ],
      done: 'You can read a neighbour\'s IP address straight out of the output.',
      why: 'That is enormously useful to you — and equally useful to anyone who should not be on your network. Seeing it is the argument for the next steps.' },

    { t: 'Write down which SW1 port goes to R1 and which goes to SW2',
      do: [
        'From the summary output, note the <b>Local Intrfce</b> column — that is SW1\'s own port.',
        'Note the <b>Port ID</b> column — that is the port on the far device.',
      ],
      done: 'You can state both mappings from memory.',
      why: 'Mixing up those two columns is a classic exam mistake. Local means yours; Port ID means theirs.' },

    { t: 'On R1, switch CDP off for the whole device',
      do: [
        'Switch to the <b>R1</b> tab and enter global configuration mode.',
        'Disable CDP globally — the "no" form of the cdp run command.',
      ],
      done: '<code>show cdp</code> on R1 reports that CDP is not enabled.',
      why: 'This is the global off switch. There is also a per-interface version for silencing a single untrusted port while keeping visibility inside your own network — know both, because the exam tests which is which.' },

    { t: 'Back on SW1, prove R1 has disappeared from CDP',
      do: [
        'Return to the <b>SW1</b> tab and display the CDP neighbours again.',
        'R1 should be gone; SW2 should still be listed.',
      ],
      done: 'Only one neighbour remains.',
      why: 'R1 is still cabled and still forwarding traffic — it has simply stopped announcing itself. Both ends must run the protocol for a neighbour to appear.' },

    { t: 'On R1, enable the vendor-neutral alternative, LLDP',
      do: [
        'On the <b>R1</b> tab, in global configuration mode, enable LLDP.',
      ],
      done: '<code>show running-config</code> on R1 contains <code>lldp run</code>.',
      why: 'LLDP is IEEE 802.1AB and does the same job across vendors. Unlike CDP it is OFF by default on Cisco gear — the reverse of what you might expect.' },

    { t: 'Enable LLDP on SW1 and SW2 as well',
      do: [
        'On the <b>SW1</b> tab, enable LLDP.',
        'On the <b>SW2</b> tab, enable LLDP.',
      ],
      done: 'All three devices have LLDP enabled.',
      why: 'A device only appears in LLDP output if it is also running LLDP, which is why every device in the path needs the command.' },

    { t: 'Verify the map is back, over the other protocol',
      do: [
        'On <b>SW1</b>, display the LLDP neighbours.',
        'Both R1 and SW2 should be listed.',
      ],
      done: 'LLDP shows R1 even though CDP does not.',
      why: 'You have deliberately created an asymmetry: the same topology visible over one protocol and invisible over the other. That is exactly how you would silence CDP at an untrusted edge while keeping internal visibility.' },
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
  id: 'd36-ntp', ord: 36, vol: 2, day: 'Day 36', title: 'NTP',
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
    { t: 'On R1, look at the clock synchronisation state before configuring anything',
      do: [
        'Work on the <b>R1</b> tab and enter privileged EXEC mode.',
        'Display the NTP status.',
        'Read the two facts it reports: whether the clock is synchronised, and the stratum.',
      ],
      done: 'R1 reports "unsynchronized" at stratum 16.',
      why: 'Stratum 16 is NTP\'s way of saying "I have no trustworthy time source". Every unconfigured device starts here.' },

    { t: 'On R2, make it the authoritative time source at stratum 3',
      do: [
        'Switch to the <b>R2</b> tab and enter global configuration mode.',
        'Configure it as an NTP <b>master</b> with stratum <b>3</b>.',
      ],
      done: '<code>show running-config</code> on R2 contains <code>ntp master 3</code>.',
      why: 'Somebody has to be the reference. Stratum counts hops from a real clock — 1 is a GPS or atomic source — so R2 claiming 3 puts every client of R2 at stratum 4.' },

    { t: 'On R1, point it at R2 for time',
      do: [
        'Back on the <b>R1</b> tab, in global configuration mode, configure <b>10.0.0.2</b> as an NTP server.',
      ],
      done: 'The server address appears in the running configuration.',
      why: 'This is a client-server relationship carried over UDP port 123. A device prefers the lowest stratum it can reach, so one good source beats several poor ones.' },

    { t: 'Confirm R1 has synchronised',
      do: [
        'On <b>R1</b>, display the NTP status again.',
        'Compare it with what you saw in the first task.',
      ],
      done: 'R1 now reports that the clock is synchronised, at a stratum one higher than R2\'s.',
      why: 'On real hardware this takes a few minutes; here it is instant. It confirms R1 accepted R2 as its reference rather than merely being configured with it.' },

    { t: 'Inspect the association R1 built with its server',
      do: [
        'On <b>R1</b>, display the NTP associations.',
        'Read the stratum and reachability of the configured source.',
      ],
      done: 'R2 is listed as a source with its stratum shown.',
      why: 'Status tells you whether you are synchronised; associations tell you to what, and how well it is being reached. It is where you look when synchronisation silently fails.' },

    { t: 'Look at the actual clock',
      do: [
        'On <b>R1</b>, display the clock.',
        'Look at whether a leading asterisk is present before the time.',
      ],
      done: 'You can say whether R1 considers its own time authoritative.',
      why: 'A leading asterisk means the time is NOT authoritative. Logs with wrong timestamps cannot be correlated across devices, and certificate validation fails outright when clocks disagree by more than a few minutes.' },
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
  id: 'd38-dhcp', ord: 38, vol: 2, day: 'Day 38', title: 'DHCP Server & Relay',
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
    { t: 'Confirm both PCs start with no address at all',
      do: [
        'Switch to the <b>PC1</b> tab and run <code>ipconfig</code>.',
        'Do the same on the <b>PC2</b> tab.',
        'Both are set to obtain an address automatically, and neither has one.',
      ],
      done: 'Neither PC shows a usable IP address.',
      why: 'Both hosts are asking; nothing is answering. Knowing that is the starting point makes each later step\'s effect obvious.' },

    { t: 'On R1, reserve the first nine addresses of the local LAN',
      do: [
        'Work on the <b>R1</b> tab, in global configuration mode.',
        'Exclude the range <b>10.0.1.1</b> through <b>10.0.1.9</b> from DHCP.',
      ],
      done: 'The excluded range appears in <code>show running-config</code>.',
      why: 'Those addresses belong to gateways, servers and printers you assign by hand. On real gear always exclude BEFORE creating the pool, or a laptop may lease .1 while you are still typing.' },

    { t: 'On R1, reserve the first nine addresses of the remote LAN too',
      do: [
        'Still on <b>R1</b>, exclude <b>10.0.2.1</b> through <b>10.0.2.9</b>.',
      ],
      done: 'Two excluded ranges are listed.',
      why: 'R1 is about to serve addresses for a network it is not even attached to, so the same protection is needed there.' },

    { t: 'On R1, create the pool for the local LAN',
      do: [
        'Create a DHCP pool named <b>LAN1</b> — the prompt moves into DHCP pool configuration mode.',
        'Set its network to <b>10.0.1.0</b> with mask <b>255.255.255.0</b>.',
      ],
      done: 'The prompt reads <code>R1(dhcp-config)#</code> and the network line is set.',
      why: 'The network statement defines which subnet this pool serves and which addresses it may hand out. It is also how the server later chooses between pools.' },

    { t: 'Give pool LAN1 a gateway and a DNS server',
      do: [
        'Inside pool <b>LAN1</b>, set the default router to <b>10.0.1.1</b>.',
        'Set the DNS server to <b>8.8.8.8</b>.',
        'Then leave pool configuration mode.',
      ],
      done: 'Both options are listed under the pool in the running configuration.',
      why: 'A lease is far more than an address: the gateway and DNS server ride along in the same offer, which is why a DHCP client comes up fully working rather than merely addressed.' },

    { t: 'On R1, create a second pool for the LAN behind R2',
      do: [
        'Create a pool named <b>LAN2</b>.',
        'Set its network to <b>10.0.2.0</b> mask <b>255.255.255.0</b>, default router <b>10.0.2.1</b>, DNS <b>8.8.8.8</b>.',
      ],
      done: 'Two pools exist on R1.',
      why: 'This is a pool for a network R1 is not connected to. The server picks the right pool by looking at which subnet the request was relayed from — which is what the next steps set up.' },

    { t: 'Lease an address on the local PC',
      do: [
        'Switch to the <b>PC1</b> tab and run <code>ipconfig /renew</code>, then <code>ipconfig</code>.',
      ],
      done: 'PC1 holds an address in 10.0.1.x, with gateway 10.0.1.1.',
      why: 'The local case works immediately because PC1 shares a broadcast domain with the server. Its DISCOVER reaches R1 directly.' },

    { t: 'Try the same on PC2 and watch it fail',
      do: [
        'Switch to the <b>PC2</b> tab and run <code>ipconfig /renew</code>.',
        'Expect no address. This failure is deliberate.',
      ],
      done: 'PC2 still has no address.',
      why: 'Routers do not forward broadcasts, so PC2\'s DISCOVER dies at R2 and is never heard. Feeling this failure before fixing it is what makes the relay command memorable.' },

    { t: 'On R2, relay the client broadcasts to the real server',
      do: [
        'Switch to the <b>R2</b> tab and enter configuration mode.',
        'Enter interface <b>G0/0</b> — the port facing PC2, the one that HEARS the client broadcasts.',
        'Add the helper address <b>10.0.12.1</b>, which is R1\'s address on the link between the routers.',
      ],
      done: '<code>show ip interface g0/0</code> on R2 lists the helper address.',
      why: 'The relay converts the client\'s broadcast into a unicast aimed at the real server. It goes on the interface that hears the clients, never the one facing the server — that mistake is a classic.' },

    { t: 'Lease an address on the remote PC',
      do: [
        'Back on the <b>PC2</b> tab, run <code>ipconfig /renew</code> again, then <code>ipconfig</code>.',
      ],
      done: 'PC2 now holds an address in 10.0.2.x with gateway 10.0.2.1.',
      why: 'R1 knew which pool to use because R2 stamped the relayed request with its own interface address (the giaddr field). That stamp is the whole mechanism.' },

    { t: 'On R1, confirm both leases in the server\'s records',
      do: [
        'On the <b>R1</b> tab, display the DHCP bindings.',
        'You should see one lease from each pool.',
      ],
      done: 'Two bindings are listed, one in 10.0.1.x and one in 10.0.2.x.',
      why: 'This is the server\'s own record of who holds what. The exchange behind each line is four messages — Discover, Offer, Request, Ack — remembered as DORA.' },
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
  id: 'd40-syslog', ord: 40, vol: 2, day: 'Day 40', title: 'Syslog',
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
    { t: 'On R1, look at where log messages currently go',
      do: [
        'Work on the <b>R1</b> tab and enter privileged EXEC mode.',
        'Display the logging configuration.',
        'Note which destinations are listed and at what level each one is set.',
      ],
      done: 'You can see console logging enabled and no syslog server configured.',
      why: 'Every <code>%LINK-5-CHANGED</code> message you have seen in these labs came from this system. Right now those messages exist only on the device that produced them.' },

    { t: 'Send log messages to the syslog server',
      do: [
        'Enter global configuration mode.',
        'Configure the logging host <b>10.0.0.100</b> — the server on the LAN.',
      ],
      done: '<code>show logging</code> lists 10.0.0.100 as a logging host.',
      why: 'Logs kept only on a device vanish with that device — which matters most exactly when a box dies or is compromised. Syslog ships them to a server over UDP port 514.' },

    { t: 'Limit what gets exported to warnings and anything more severe',
      do: [
        'Still in global configuration mode, set the logging <b>trap</b> level to <b>warnings</b>.',
      ],
      done: '<code>show logging</code> reports the trap level as warnings (level 4).',
      why: 'The scale runs 0 Emergency, 1 Alert, 2 Critical, 3 Error, 4 Warning, 5 Notification, 6 Informational, 7 Debugging. Setting warnings means level 4 and everything numerically lower — lower numbers are MORE severe.' },

    { t: 'Add a local memory buffer of 16384 bytes',
      do: [
        'Configure buffered logging with a size of <b>16384</b>.',
      ],
      done: '<code>show logging</code> shows buffered logging enabled with that size.',
      why: 'The buffer keeps recent history in RAM for an instant "what just happened?" check with no server round trip. It is lost on reboot, which is why you have both.' },

    { t: 'Verify both destinations are configured',
      do: [
        'Display the logging configuration again.',
        'Check three things: the server address, the trap level, and the buffer size.',
        'Notice that console, buffer and host each carry their own independent level.',
      ],
      done: 'All three settings are visible in one screen.',
      why: 'Destinations are independent. A message can be kept locally and not exported, which is exactly what a trap level of warnings does to a level-5 link message.' },

    { t: 'Generate a real log message and decode its format',
      do: [
        'Enter an interface on R1, disable it, then enable it again.',
        'Watch the message that appears, for example <code>%LINK-5-CHANGED</code>.',
        'Break it into its three parts: facility, severity number, and mnemonic.',
      ],
      done: 'You can name the facility, the severity and the event for the message on screen.',
      why: 'The format is %FACILITY-SEVERITY-MNEMONIC. Reading that structure at a glance is an exam favourite and the first step in triaging any real log.' },
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
  id: 'd41-ssh', ord: 41, vol: 2, day: 'Day 41', title: 'SSH',
  topics: 'domain name · crypto key generate rsa · ip ssh version 2 · vty hardening',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.10', mask: '255.255.255.0', gw: null } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1']],
  layout: { PC1: [90, 45], SW1: [260, 45] },
  intro: `<b>The situation:</b> a switch you can only configure by standing next to it with a console cable. Nobody wants to walk to the wiring closet every time.<br><b>Your goal:</b> make it reachable over the network — securely. That means giving the switch an IP address to be reached at, then building the full <b>SSH</b> stack: a name, a domain, encryption keys, a user account, and remote-access lines that refuse the old insecure telnet. Every step depends on the one before it, which is why the order matters.`,
  tasks: [
    { t: 'Rename the switch to SW1',
      do: [
        'Work on the <b>SW1</b> tab. Enter privileged EXEC, then global configuration mode.',
        'Set the hostname to <b>SW1</b>.',
      ],
      done: 'The prompt reads <code>SW1(config)#</code>.',
      why: 'This is not cosmetic here. The RSA key you generate later is named after hostname plus domain, and IOS refuses to build one while the name is still the factory default "Switch".' },

    { t: 'Give the switch a management address on the VLAN 1 SVI',
      do: [
        'Enter interface <b>Vlan 1</b> — a virtual interface, not a physical port.',
        'Give it <b>192.168.1.2</b> with mask <b>255.255.255.0</b>.',
        'Enable the interface.',
      ],
      done: '<code>show ip interface brief</code> shows Vlan1 up with that address.',
      why: 'A layer-2 switch has no routed ports, so its management address lives on a switched virtual interface. Without one there is simply nothing to SSH to.' },

    { t: 'Set the domain name to netdrill.lab',
      do: [
        'Back in global configuration mode, set the IP domain name to <b>netdrill.lab</b>.',
        'If you want to see why the order matters, try generating the key first — IOS will refuse.',
      ],
      done: 'The domain name appears in <code>show running-config</code>.',
      why: 'The key pair is named hostname.domain — SW1.netdrill.lab here — so both must exist before a key can be built.' },

    { t: 'Generate RSA keys with a 2048-bit modulus',
      do: [
        'Generate an RSA key pair with modulus <b>2048</b>.',
        'IOS reports the key name and how long it took.',
      ],
      done: 'The key is generated without error.',
      why: 'These keys are what SSH uses to encrypt the session. Version 2 requires at least 768 bits; 2048 is the sensible modern choice.' },

    { t: 'Force SSH version 2 only',
      do: [
        'In global configuration mode, set the SSH version to <b>2</b>.',
      ],
      done: '<code>show ip ssh</code> reports version 2.',
      why: 'Version 1 has known weaknesses. Note that this command only succeeds once keys exist — the strict ordering of these five steps is the real lesson of the lab.' },

    { t: 'Create a local user account for logging in',
      do: [
        'Create a username <b>admin</b> with the hashed secret <b>cisco123</b>.',
      ],
      done: 'A username line appears in the running configuration.',
      why: 'SSH logs in AS somebody. Unlike telnet\'s single shared line password, each administrator gets their own account — which is what makes an audit trail possible.' },

    { t: 'Point the vty lines at that local user database',
      do: [
        'Enter the <b>vty lines 0 through 4</b>.',
        'Set them to authenticate against the local username database.',
      ],
      done: '<code>show running-config</code> shows <code>login local</code> under line vty 0 4.',
      why: 'The vty lines are the remote-access doors. Without this they would still be checking the old shared line password, no matter how many accounts you created.' },

    { t: 'Allow SSH only on those lines — no telnet',
      do: [
        'On the same vty lines, restrict the input transport to <b>ssh</b>.',
      ],
      done: 'The transport line appears under line vty 0 4.',
      why: 'Telnet sends every keystroke, passwords included, in clear text. Restricting the transport shuts that door for good, even if somebody later sets a telnet password by accident.' },

    { t: 'Verify the whole SSH stack in one command',
      do: [
        'Return to privileged EXEC and display the SSH status.',
        'Confirm SSH is enabled and running version 2.',
      ],
      done: 'The output reports SSH Enabled, version 2.0.',
      why: 'Five prerequisites had to line up: hostname, domain name, keys, a user database, and vty configuration. Miss any one and the exam question becomes "why can the admin not connect?"' },
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
  id: 'd43-static-nat', ord: 43, vol: 2, day: 'Day 43', title: 'NAT Part 1 — Static NAT',
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
    { t: 'Study the addressing before you change anything',
      do: [
        'On the <b>R1</b> tab, enter privileged EXEC and display the brief interface summary.',
        'Note that the server side uses <b>192.168.1.x</b> (private) and the ISP side uses <b>203.0.113.x</b> (public).',
      ],
      done: 'You can say which interface faces the private network and which faces the ISP.',
      why: 'Private ranges — 10.x, 172.16-31.x and 192.168.x — are not routable on the public internet. NAT is the translation layer that lets them communicate anyway.' },

    { t: 'Mark the interface facing the server as the NAT inside',
      do: [
        'Enter global configuration mode, then interface <b>G0/0</b>.',
        'Mark it as the NAT <b>inside</b> interface.',
      ],
      done: '<code>show ip interface g0/0</code> reports it is a NAT inside interface.',
      why: 'NAT has to know which side is private and which is public, because translation happens exactly as packets cross between the two domains.' },

    { t: 'Mark the interface facing the ISP as the NAT outside',
      do: [
        'Enter interface <b>G0/1</b> and mark it as the NAT <b>outside</b> interface.',
      ],
      done: 'The running configuration shows one interface marked inside and one marked outside.',
      why: 'With both sides labelled the router knows in which direction to rewrite addresses. Miss either one and the rules below do nothing at all, while the configuration still looks correct.' },

    { t: 'Create the permanent one-to-one mapping',
      do: [
        'In global configuration mode, create a static NAT entry mapping <b>192.168.1.100</b> to <b>203.0.113.100</b>.',
        'Mind the order: the private (inside local) address comes first, the public (inside global) address second.',
      ],
      done: 'The mapping appears in the running configuration.',
      why: 'Swapping those two addresses is a classic slip that produces a configuration which parses fine and translates the wrong way round.' },

    { t: 'Verify the translation exists in the table',
      do: [
        'Display the NAT translations.',
        'Note that the entry is present even though no traffic has flowed.',
      ],
      done: 'The static mapping is listed in the translation table.',
      why: 'A static mapping sits there permanently, unlike dynamic entries which only exist while a connection is active. That permanence is what lets outsiders initiate connections inward.' },

    { t: 'Confirm both halves of the configuration are present',
      do: [
        'Display the running configuration.',
        'Check for three things: the inside marking, the outside marking, and the static mapping line.',
      ],
      done: 'All three lines are present.',
      why: 'A mapping with no interface markings is the single most common "NAT is broken" call. Both halves are required and neither warns you about the other.' },

    { t: 'Name the four NAT addresses for this setup',
      do: [
        'Work out and say out loud: what is the <b>inside local</b> address here, and what is the <b>inside global</b> address?',
        'Inside local is how the LAN sees the server; inside global is how the internet sees it.',
      ],
      done: 'You can name both without looking them up.',
      why: 'Anchor on "local = as seen from inside, global = as seen from outside". The exam WILL ask you to label these four addresses on a diagram.' },
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
  id: 'd44-pat', ord: 44, vol: 2, day: 'Day 44', title: 'NAT Part 2 — PAT (Overload)',
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
    { t: 'On R1, create ACL 1 to select which hosts may be translated',
      do: [
        'Work on the <b>R1</b> tab, in global configuration mode.',
        'Create numbered access list <b>1</b> permitting network <b>192.168.1.0</b> with wildcard <b>0.0.0.255</b>.',
      ],
      done: '<code>show access-lists</code> shows list 1 with a permit entry.',
      why: 'Here the ACL blocks nothing — it is a CLASSIFIER answering "who is allowed to be translated?" ACLs used as traffic matchers turn up all over IOS, and recognising that dual role is a real exam skill.' },

    { t: 'Mark the LAN-facing interface as NAT inside',
      do: [
        'Enter interface <b>G0/0</b> and mark it as the NAT <b>inside</b> interface.',
      ],
      done: 'The interface is marked inside in the running configuration.',
      why: 'Exactly the same domain marking as static NAT. The router only translates traffic that crosses from an inside interface to an outside one.' },

    { t: 'Mark the ISP-facing interface as NAT outside',
      do: [
        'Enter interface <b>G0/1</b> and mark it as the NAT <b>outside</b> interface.',
      ],
      done: 'One interface is inside, one is outside.',
      why: 'G0/1 carries the single public address, 203.0.113.2, that the entire LAN is about to share.' },

    { t: 'Tie it together with the overload statement',
      do: [
        'In global configuration mode, create a dynamic NAT rule: translate sources matching list <b>1</b>, using the address of interface <b>G0/1</b>, with the keyword <b>overload</b> on the end.',
      ],
      done: 'The rule appears in the running configuration with the word overload.',
      why: 'Overload is the whole trick: the router rewrites the source PORT as well as the source address, so thousands of inside hosts can share one public address simultaneously.' },

    { t: 'Read the command back in plain English',
      do: [
        'Say it out loud: "anything matching access list 1 that leaves via G0/1 gets that interface\'s address, tracked by port number".',
      ],
      done: 'You can restate the rule without reading it.',
      why: 'If you can say it, you can rebuild it from memory in the exam — and you will spot immediately when a configuration names the wrong interface or the wrong list.' },

    { t: 'Verify all three pieces are in place',
      do: [
        'Display the running configuration.',
        'Confirm the ACL, the two interface markings and the overload statement are all present.',
      ],
      done: 'All four lines are visible.',
      why: 'PAT needs every piece. Any one missing and nothing is translated, while nothing in the output complains.' },

    { t: 'Compare this with the previous lab',
      do: [
        'Ask yourself which NAT type allows an outside host to start a connection inward, and why.',
      ],
      done: 'You can explain the difference between static NAT and PAT in one sentence.',
      why: 'Static NAT is a permanent two-way mapping, so outsiders can connect in — which is why servers use it. PAT creates no entry until an inside host opens a connection, so nothing can come in uninvited. That difference is the reason both exist.' },
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
  id: 'd47-port-security', ord: 47, vol: 2, day: 'Day 47', title: 'Port Security',
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
    { t: 'On SW1, set F0/1 to access mode BEFORE anything else',
      do: [
        'Work on the <b>SW1</b> tab, in global configuration mode.',
        'Enter interface <b>F0/1</b> and set the switchport mode to <b>access</b>.',
        'If you want to meet the error, try enabling port security first — IOS rejects it.',
      ],
      done: 'The port is a static access port.',
      why: 'Port security is refused outright on a port still in dynamic mode. Meeting that rejection once, on purpose, is how the ordering sticks.' },

    { t: 'Enable port security on F0/1',
      do: [
        'Still inside <b>F0/1</b>, turn port security on.',
      ],
      done: '<code>show port-security</code> lists Fa0/1.',
      why: 'From now on the port only accepts frames from MAC addresses it considers legitimate — everything else triggers the violation action.' },

    { t: 'Allow exactly one MAC address on F0/1',
      do: [
        'Set the port-security maximum to <b>1</b>.',
      ],
      done: 'The MaxSecureAddr column reads 1 for Fa0/1.',
      why: 'One port, one device. Real deployments often use 2 or 3, because an IP phone with a PC plugged in behind it presents more than one address.' },

    { t: 'Let the port learn and remember its device automatically',
      do: [
        'Enable <b>sticky</b> MAC address learning on F0/1.',
      ],
      done: 'The sticky keyword appears under Fa0/1 in the running configuration.',
      why: 'The port learns whichever device is plugged in and writes that address straight into the running config, so you never type MAC addresses by hand. Save the config and the binding survives a reboot.' },

    { t: 'Configure F0/2 the same way, but with a gentler violation action',
      do: [
        'Enter interface <b>F0/2</b>.',
        'Set it to <b>access</b> mode, enable port security, and set the violation mode to <b>restrict</b>.',
      ],
      done: 'Fa0/2 shows violation mode Restrict in <code>show port-security</code>.',
      why: 'Restrict drops the offending frames, logs and counts each one, and leaves the port up. The default action, shutdown, disables the port entirely and needs a manual recovery.' },

    { t: 'Generate traffic so the sticky address is actually learned',
      do: [
        'Switch to the <b>PC1</b> tab and ping <b>10.0.0.12</b> (PC2).',
      ],
      done: 'The ping succeeds.',
      why: 'Sticky learning needs a frame to learn from. No traffic means no learned address, and a port-security configuration that looks complete but has bound nothing.' },

    { t: 'Find the MAC address that was written into the configuration',
      do: [
        'Back on <b>SW1</b>, display the running configuration.',
        'Find the sticky MAC address line under Fa0/1 — you never typed it.',
      ],
      done: 'A sticky mac-address line is visible under the interface.',
      why: 'That is sticky learning in action: a dynamic fact converted into configuration. It is also why saving the config matters — otherwise the binding is lost at the next reload.' },

    { t: 'Check the port-security summary for the whole switch',
      do: [
        'Display the port-security summary.',
        'Read the columns: maximum addresses, current addresses, violation count and the configured action.',
      ],
      done: 'Both secured ports are listed with their settings.',
      why: 'This is the audit view — the screen you scan to answer "which ports are protected, and has anything tripped?"' },

    { t: 'Look at one port in detail',
      do: [
        'Display the port-security detail for interface <b>F0/1</b>.',
        'Note the Port Status line in particular.',
      ],
      done: 'The port reports Secure-up.',
      why: 'This is where you check a single port\'s state — including spotting <b>Secure-shutdown</b>, which means a violation has err-disabled it and only shutdown followed by no shutdown will bring it back.' },

    { t: 'Recall the three violation modes and what separates them',
      do: [
        'Without looking: name what <b>shutdown</b>, <b>restrict</b> and <b>protect</b> each do.',
      ],
      done: 'You can state all three from memory.',
      why: 'shutdown err-disables the port (the default); restrict drops, logs and counts; protect drops silently with no log and no counter. Protect is the trick answer precisely because it is invisible.' },
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
  id: 'd48-dhcp-snooping', ord: 48, vol: 2, day: 'Day 48', title: 'DHCP Snooping',
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
    { t: 'Confirm DHCP works before you secure it',
      do: [
        'Switch to the <b>PC1</b> tab and run <code>ipconfig /renew</code>, then <code>ipconfig</code>.',
        'PC1 should receive an address from R1 in 10.0.0.x.',
      ],
      done: 'PC1 holds a lease with gateway 10.0.0.1.',
      why: 'R1 is the legitimate server. Prove that it works before you add security, so that if something breaks later you know your change caused it.' },

    { t: 'On SW1, turn DHCP snooping on globally',
      do: [
        'Work on the <b>SW1</b> tab, in global configuration mode.',
        'Enable DHCP snooping.',
        'Then display the snooping status and notice that no VLANs are listed yet.',
      ],
      done: 'Snooping reports as enabled with an empty VLAN list.',
      why: 'This is the master switch, and on its own it does nothing at all. The two-step enablement — global, then per VLAN — is a favourite exam detail.' },

    { t: 'Scope snooping to VLAN 1, where the hosts live',
      do: [
        'Still in global configuration mode, enable DHCP snooping for <b>VLAN 1</b>.',
        'Display the status again and confirm the VLAN now appears.',
      ],
      done: 'VLAN 1 is listed as snooped.',
      why: 'Only now is anything actually inspected. The switch starts checking every DHCP message against the trust state of the port it arrived on.' },

    { t: 'Trust the uplink toward the real server',
      do: [
        'Enter interface <b>G0/1</b> — the port facing R1.',
        'Mark it as a trusted port for DHCP snooping.',
      ],
      done: 'The snooping status lists Gi0/1 as trusted.',
      why: 'Server messages — Offer, Ack, Nak — are only accepted on trusted ports. This is the port the genuine server sits behind, so it is the only one that should be trusted.' },

    { t: 'Leave the access ports untrusted — and understand why no command is needed',
      do: [
        'Check that <b>F0/1</b> and <b>F0/2</b> have no trust configuration.',
        'Confirm in the snooping output that they are untrusted.',
      ],
      done: 'Both access ports remain untrusted.',
      why: 'Every port is untrusted by default, which is exactly the behaviour you want: a rogue server plugged into a desk port has its offers dropped on arrival.' },

    { t: 'Prove a legitimate client still works',
      do: [
        'Switch to the <b>PC1</b> tab and run <code>ipconfig /renew</code> once more.',
      ],
      done: 'PC1 renews its lease successfully.',
      why: 'Hardening that breaks legitimate traffic just becomes an outage ticket. Client messages are permitted from untrusted ports — only server replies are restricted.' },

    { t: 'Verify the complete snooping configuration',
      do: [
        'On <b>SW1</b>, display the DHCP snooping status.',
        'Confirm three things: snooping is enabled, VLAN 1 is listed, and only the uplink is trusted.',
      ],
      done: 'All three facts are visible in one screen.',
      why: 'Those three lines are precisely what an exam question alters to create a broken scenario, and what you check first when clients suddenly stop getting addresses.' },

    { t: 'Think through what a rogue server would now experience',
      do: [
        'Ask yourself what happens if somebody plugs their own DHCP server into <b>F0/2</b>.',
      ],
      done: 'You can explain the outcome in one sentence.',
      why: 'Its Offer messages arrive on an untrusted port and are dropped immediately. The lease records snooping builds also feed Dynamic ARP Inspection later — the two features are designed to chain together.' },
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
