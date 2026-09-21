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
  id: 'd04-cli-basics', ord: 4, vol: 1, day: 'Day 4', title: 'CLI Basics & Device Security',
  topics: 'CLI modes · hostname · enable secret · service password-encryption · saving configs',
  devices: [{ id: 'SW1', type: 'switch', ifaces: ['g0/1', 'g0/2', 'f0/1', 'f0/2'] }],
  links: [], layout: { SW1: [190, 40] },
  intro: `<b>The situation:</b> a brand-new switch, straight out of the box. No name, no passwords, wide open.<br><b>Your goal:</b> learn to move between the command-line modes, then give the switch a name and basic security. This is the exact opening routine you'll repeat at the start of <em>every</em> lab in this course — run it until your fingers do it without thinking.`,
  tasks: [
    { t: 'Move from user mode (the > prompt) into privileged mode (the # prompt), then into configuration mode', why: 'Almost every config session starts with these two commands. The prompt symbol always tells you which mode you are in — get used to reading it.' },
    { t: 'Change the switch\'s name to SW1', why: 'You can\'t manage a room full of devices all named "Switch". The name shows in the prompt and identifies the device everywhere.' },
    { t: 'Set the password for privileged mode to cisco123 (use the "secret" version)', why: 'This protects the # mode where changes are made. The "secret" version is stored as a hash; the older "password" version is stored readable — always use secret.' },
    { t: 'Set the console line password to ccna, and turn on password checking for the console', why: 'The console is the physical plug-in port. Setting a password does nothing until you also tell the line to actually ask for it ("login").' },
    { t: 'Turn on password encryption so passwords don\'t appear as plain text in the config', why: 'Without this, anyone glancing at "show run" can read the console password. The encryption is weak, but it stops shoulder-surfing.' },
    { t: 'Stop the switch from trying to look up mistyped commands as hostnames', why: 'By default a typo makes the switch attempt a DNS lookup and your screen freezes for a minute. Every engineer turns this off on day one.' },
    { t: 'Create a warning banner that appears when someone connects (any text you like)', why: 'A legal "authorized access only" notice. Auditors expect it, and the wording matters if an intruder is ever prosecuted.' },
    { t: 'Save your configuration so it survives a reboot', why: 'Everything you typed lives in RAM. A power cycle erases it unless you copy it to permanent storage (startup-config).' },
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
  id: 'd06-mac-tables', ord: 6, vol: 1, day: 'Day 6', title: 'Ethernet Switching & MAC Tables',
  topics: 'MAC learning · show mac address-table · clear mac address-table',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.12', mask: '255.255.255.0', gw: null } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2']],
  layout: { PC1: [60, 20], PC2: [60, 90], SW1: [220, 55] },
  intro: `<b>The situation:</b> two PCs are plugged into a switch, already addressed and able to reach each other.<br><b>Your goal:</b> make them talk, then look inside the switch to see what it learned. A switch has one core job — remember which device is on which port — and this lab shows that memory being built, erased, and rebuilt.`,
  tasks: [
    { t: 'Open the PC1 tab and check its IP settings with ipconfig', why: 'Always know your starting point: PC1 is 192.168.1.11, PC2 is 192.168.1.12, same subnet, same switch.' },
    { t: 'From PC1, ping PC2 at 192.168.1.12 — it should succeed', why: 'A ping creates traffic (ARP + ICMP frames) — the raw material the switch needs before it can learn anything. No traffic, no MAC table.' },
    { t: 'Switch to the PC2 tab and ping PC1 back at 192.168.1.11', why: 'The switch learns a MAC address only from frames that device SENDS. PC2 must talk for its address to be recorded.' },
    { t: 'On SW1, display the MAC address table', why: 'This table is the switch\'s entire forwarding brain: which MAC lives on which port, in which VLAN.' },
    { t: 'Match each MAC in the table to the right PC (compare with ipconfig /all on each PC)', why: 'Reading the table and predicting what the switch does with a frame — flood it, forward it, or drop it — is a core exam skill.' },
    { t: 'Clear the learned MAC entries, then ping again and watch the table refill', why: 'Proves the entries are dynamic: cleared (or aged out after 5 minutes of silence), they come right back the moment traffic flows.' },
  ],
  steps: [
    { t: 'Open the PC1 tab and check its addressing.', c: ['ipconfig'] },
    { t: 'Ping PC2 from PC1 — this makes SW1 learn both source MACs.', c: ['ping 192.168.1.12'] },
    { t: 'Switch to PC2 and ping back.', c: ['ping 192.168.1.11'] },
    { t: 'On SW1, inspect the MAC address table.', c: ['enable', 'show mac address-table'], note: 'Each entry maps a VLAN + MAC to the port it was learned on. Compare with <code>ipconfig /all</code> on the PCs.' },
    { t: 'Clear the learned entries and confirm the table is now empty.', c: ['clear mac address-table dynamic', 'show mac address-table'], note: 'Note the required <code>dynamic</code> keyword — without it IOS answers "% Incomplete command." Press <kbd>?</kbd> after <code>clear mac address-table</code> to see the options.' },
    { t: 'Go back to the PC1 tab and ping PC2 again, then re-check the table on SW1.', c: ['ping 192.168.1.12'], note: 'Run the ping on PC1, then <code>show mac address-table</code> on SW1 — the entries are back. Learning is automatic and continuous; clearing only buys a moment of silence.' },
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
  id: 'd08-router-ints', ord: 8, vol: 1, day: 'Day 8', title: 'Router Interfaces & IPv4 Addressing',
  topics: 'ip address · no shutdown · description · show ip interface brief',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.2.10', mask: '255.255.255.0', gw: '10.0.2.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['PC2', 'e0', 'R1', 'g0/1']],
  layout: { PC1: [50, 20], R1: [190, 55], PC2: [330, 20] },
  intro: `<b>The situation:</b> two PCs sit on two different networks (10.0.1.x and 10.0.2.x), with a router between them. The router's ports are switched off and have no addresses, so nothing works yet.<br><b>Your goal:</b> give each router port an address and turn it on, so the PCs can reach each other through it. The pattern you'll repeat here — pick an interface, give it an address, turn it on — is the most-typed sequence in all of CCNA.`,
  tasks: [
    { t: 'Rename the router to R1', why: 'Identify the box before touching it — the habit that stops you configuring the wrong device one day.' },
    { t: 'Enter interface G0/0 and give it the IP address 10.0.1.1 with mask 255.255.255.0', why: 'This address becomes the default gateway for PC1\'s network (10.0.1.0/24) — it\'s where PC1 sends anything off-subnet.' },
    { t: 'Give G0/0 the description "LAN1"', why: 'Descriptions cost nothing and document what the port is for — for the next person, usually future you.' },
    { t: 'Turn G0/0 on with "no shutdown"', why: 'Router ports ship switched OFF (administratively down). Forgetting this is the single most common beginner mistake.' },
    { t: 'Do the same for G0/1: address 10.0.2.1 mask 255.255.255.0, description "LAN2", turned on', why: 'The second LAN gets its own gateway on its own interface — one interface per network is the router\'s whole job.' },
    { t: 'Check your work with "show ip interface brief" — both ports should say up / up', why: 'Two columns matter: Status (layer 1) and Protocol (layer 2). "administratively down" means you forgot no shutdown.' },
    { t: 'From the PC1 tab, ping PC2 at 10.0.2.10', why: 'The proof: the router forwards between its two directly-connected networks. No routes needed — connected networks are known automatically.' },
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
  id: 'd09-switch-ints', ord: 9, vol: 1, day: 'Day 9', title: 'Switch Interface Configuration',
  topics: 'interface range · speed · duplex · shutting down unused ports',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'f0/5', 'f0/6', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.1.12', mask: '255.255.255.0', gw: null } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2']],
  layout: { PC1: [60, 20], PC2: [60, 90], SW1: [220, 55] },
  intro: `<b>The situation:</b> a switch with 7 ports, but only two of them (F0/1 and F0/2) actually have PCs plugged in. The other five sit unused and live — anyone could plug into them.<br><b>Your goal:</b> tidy and secure the physical ports: fix the speed and duplex on the two host ports, label them, and switch off everything unused. You'll also meet the <i>interface range</i> command, which configures many ports in one go.`,
  tasks: [
    { t: 'Select ports F0/1 and F0/2 together using "interface range"', why: 'The range command applies everything you type to all selected ports at once — a massive time saver on real switches with 48 ports.' },
    { t: 'On both ports: set the speed to 100', why: 'Hard-coding removes autonegotiation surprises. Set both ends of a cable the same, or leave both on auto.' },
    { t: 'On both ports: set the duplex to full', why: 'The classic failure: one side hard-coded, the other on auto → the auto side falls back to half duplex → collisions and terrible performance.' },
    { t: 'On both ports: add the description "HOST-PORT"', why: 'Labels which ports are for user devices — so nobody "cleans up" a live port by accident.' },
    { t: 'Select the unused ports F0/3 through F0/6 plus G0/1 in one range, and shut them all down', why: 'A live unused jack is an open invitation — anyone can plug in. Disabling unused ports is baseline switch security.' },
    { t: 'Check the result with "show interfaces status"', why: 'THE port overview: connected / notconnect / disabled per port, plus VLAN, speed and duplex. Manually-set values show plain (full/100); autonegotiated ones get an "a-" prefix (a-full).' },
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
  id: 'd11-static-routing', ord: 11, vol: 1, day: 'Day 11', title: 'Static & Default Routes',
  topics: 'ip route · default route · show ip route',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.2.10', mask: '255.255.255.0', gw: '10.0.2.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/1'], ['R2', 'g0/0', 'PC2', 'e0']],
  layout: { PC1: [40, 30], R1: [150, 30], R2: [250, 30], PC2: [355, 30] },
  intro: `<b>The situation:</b> two routers connected to each other, each with its own PC network behind it. Nothing is configured yet.<br><b>Your goal:</b> address everything, then teach each router how to reach the network on the far side. A router only knows the networks it is directly plugged into — anything else you must tell it about. R1 will get a route to one specific network; R2 will get a "send everything else this way" default route.`,
  tasks: [
    { t: 'On R1: set the hostname to R1', why: 'Always name the device first so you know which console you\'re typing into.' },
    { t: 'On R1: give G0/0 (the LAN side) the address 10.0.1.1 mask 255.255.255.0, and turn it on', why: 'This is PC1\'s default gateway — the door out of the 10.0.1.0 network.' },
    { t: 'On R1: give G0/1 (the link to R2) the address 192.168.12.1 mask 255.255.255.252, and turn it on', why: 'The .252 mask (/30) leaves exactly two usable addresses — perfectly sized for a two-router link.' },
    { t: 'Switch to R2: set the hostname to R2', why: 'Same habit, second box.' },
    { t: 'On R2: give G0/0 the address 10.0.2.1 mask 255.255.255.0, and turn it on', why: 'PC2\'s default gateway on the far LAN.' },
    { t: 'On R2: give G0/1 the address 192.168.12.2 mask 255.255.255.252, and turn it on', why: 'The other end of the link. Both ends must be inside the same tiny /30 network or the routers can\'t reach each other at all.' },
    { t: 'Test: from R1, ping R2\'s link address 192.168.12.2', why: 'Confirm the middle link works before adding routes — troubleshoot in layers, nearest thing first.' },
    { t: 'On R1: add a static route telling it that network 10.0.2.0 255.255.255.0 is reached via 192.168.12.2', why: 'Routers only know networks they touch directly. R1 has no idea PC2\'s network exists until you tell it where to send that traffic.' },
    { t: 'On R2: add a default route (0.0.0.0 0.0.0.0) via 192.168.12.1', why: 'A default route matches EVERYTHING not otherwise known — the "route of last resort". This is exactly how your home router points at your ISP.' },
    { t: 'From the PC1 tab, ping PC2 at 10.0.2.10 — then ping back from PC2', why: 'A ping needs a route there AND a route back. Configure only one router and packets arrive but replies die — the #1 static routing gotcha.' },
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
  id: 'd16-vlans1', ord: 16, vol: 1, day: 'Day 16', title: 'VLANs Part 1 — Access Ports',
  topics: 'vlan · name · switchport mode access · switchport access vlan',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.12', mask: '255.255.255.0', gw: null } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.13', mask: '255.255.255.0', gw: null } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2'], ['PC3', 'e0', 'SW1', 'f0/3']],
  layout: { PC1: [50, 15], PC2: [50, 95], PC3: [340, 15], SW1: [200, 55] },
  intro: `<b>The situation:</b> three PCs plugged into one switch, all on the same network — right now every PC can reach every other PC.<br><b>Your goal:</b> split them into two separate groups using VLANs: PC1 and PC2 go into the engineering group, PC3 into the sales group. Afterwards PC1 and PC2 still talk to each other, but neither can reach PC3 — and you will not have changed a single IP address to do it.`,
  tasks: [
    { t: 'Before changing anything: from PC1, ping PC3 at 10.0.0.13 — notice it works', why: 'The "before" picture: right now all three PCs share one big network and can all talk. You\'re about to break that on purpose.' },
    { t: 'Create VLAN 10 and name it ENGINEERING', why: 'A VLAN must exist in the switch\'s VLAN database before ports can join it. Names keep "show vlan brief" readable when you have twenty of them.' },
    { t: 'Create VLAN 20 and name it SALES', why: 'The second, separate group. Each VLAN is its own broadcast domain — its own logical switch.' },
    { t: 'Make ports F0/1 and F0/2 access ports, assigned to VLAN 10', why: 'An access port carries exactly one VLAN. Assigning it places the attached PC into that VLAN\'s world.' },
    { t: 'Make port F0/3 an access port in VLAN 20', why: 'PC3 is now logically on a different "switch", even though the hardware never changed.' },
    { t: 'Check your work with "show vlan brief"', why: 'The verification view: every VLAN, its name, and which ports belong to it.' },
    { t: 'From PC1, ping PC2 (10.0.0.12) — this should still work', why: 'PC1 and PC2 are both in VLAN 10, so traffic between them flows normally.' },
    { t: 'From PC1, ping PC3 (10.0.0.13) — this should now FAIL', why: 'The whole point: same IP subnet, same physical switch, yet the VLAN wall separates them. Crossing VLANs now requires a router — that\'s the Day 18 lab.' },
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
  id: 'd17-vlans2', ord: 17, vol: 1, day: 'Day 17', title: 'VLANs Part 2 — Trunking',
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
  intro: `<b>The situation:</b> two switches, joined by a single cable. Each switch hosts PCs from <em>both</em> groups — VLAN 10 and VLAN 20 exist on both sides.<br><b>Your goal:</b> set up both switches, then turn the cable between them into a <b>trunk</b> — a link that carries several VLANs at once by labelling each frame with its VLAN number. You'll also tighten two trunk settings that matter for security: the native VLAN and the list of VLANs allowed across.`,
  tasks: [
    { t: 'On SW1: create VLANs 10 and 20', why: 'VLANs are configured per switch — each switch keeps its own VLAN list.' },
    { t: 'On SW1: make F0/1 an access port in VLAN 10, and F0/2 an access port in VLAN 20', why: 'Places PC1 into VLAN 10 and PC2 into VLAN 20 on the left side.' },
    { t: 'On SW1: make G0/1 (the cable to SW2) a permanent trunk', why: 'One cable must carry BOTH VLANs between the switches. A trunk does this by adding a small VLAN tag to every frame crossing it.' },
    { t: 'On SW1\'s trunk: change the native VLAN to 1001', why: 'Native VLAN traffic travels untagged. Best practice moves it off VLAN 1 to an unused VLAN — and it must match on both ends or traffic leaks between VLANs.' },
    { t: 'On SW1\'s trunk: allow only VLANs 10 and 20 across', why: 'Pruning: don\'t carry VLANs the far side doesn\'t need. Careful — "allowed vlan 10,20" REPLACES the list; "allowed vlan add 30" appends. Mixing those up causes famous outages.' },
    { t: 'On SW2: repeat all of it — VLANs 10 & 20, F0/1→10, F0/2→20, trunk on G0/1 with native 1001 and allowed 10,20', why: 'A tagged frame arriving for a VLAN the receiving switch hasn\'t created is simply dropped — both sides need the identical setup.' },
    { t: 'Verify with "show interfaces trunk" on either switch', why: 'Read all four facts: trunking on, encapsulation 802.1q, native VLAN 1001, allowed list 10,20.' },
    { t: 'Test same-VLAN across switches: PC1→PC3 (10.0.10.12) and PC2→PC4 (10.0.20.12) should both work', why: 'Proves tagged frames survive the trip: tagged at SW1, carried over the trunk, untagged at SW2\'s access port.' },
    { t: 'Test cross-VLAN: PC1→PC4 should FAIL', why: 'The trunk carries both VLANs but never mixes them — crossing VLANs still requires a router.' },
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
  id: 'd18-vlans3', ord: 18, vol: 1, day: 'Day 18', title: 'VLANs Part 3 — Router on a Stick',
  topics: 'subinterfaces · encapsulation dot1q · inter-VLAN routing',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.10', mask: '255.255.255.0', gw: '10.0.10.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.20.10', mask: '255.255.255.0', gw: '10.0.20.1' } },
  ],
  links: [['R1', 'g0/0', 'SW1', 'g0/1'], ['SW1', 'f0/1', 'PC1', 'e0'], ['SW1', 'f0/2', 'PC2', 'e0']],
  layout: { R1: [200, 12], SW1: [200, 68], PC1: [80, 105], PC2: [320, 105] },
  intro: `<b>The situation:</b> PC1 is in VLAN 10, PC2 is in VLAN 20, so they cannot talk to each other. A router is available — but it only has ONE cable to the switch.<br><b>Your goal:</b> let the two VLANs communicate through that single router cable. The trick is to split one physical router port into several <b>subinterfaces</b>, one per VLAN, each acting as that VLAN's gateway. Because everything balances on one cable, this design is nicknamed <b>"router on a stick"</b>.`,
  tasks: [
    { t: 'On SW1: create VLANs 10 and 20', why: 'The hosts\' two worlds must exist on the switch first.' },
    { t: 'On SW1: put F0/1 (PC1) into VLAN 10 and F0/2 (PC2) into VLAN 20 as access ports', why: 'Each PC sits in its own VLAN — right now they cannot talk to each other at all.' },
    { t: 'On SW1: make G0/1 (the uplink to the router) a trunk', why: 'Both VLANs must ride up the same cable to the router — the "stick" in router-on-a-stick.' },
    { t: 'On R1: turn on the physical interface G0/0 — but give it NO IP address', why: 'The physical port just needs to be up. The IP addresses will live on the subinterfaces you\'re about to create.' },
    { t: 'On R1: create subinterface G0/0.10, mark it for VLAN tag 10 (encapsulation dot1q 10), then give it 10.0.10.1 mask 255.255.255.0', why: 'This logical interface answers VLAN 10\'s tagged frames, and its IP is VLAN 10\'s default gateway. The dot1q line must come before the IP.' },
    { t: 'On R1: create subinterface G0/0.20 for VLAN tag 20, with 10.0.20.1 mask 255.255.255.0', why: 'One physical port, many logical interfaces — the whole trick. Matching subinterface numbers to VLAN IDs (.10 ↔ VLAN 10) is convention, but it keeps you sane.' },
    { t: 'Verify with "show ip interface brief" — both subinterfaces should show their IPs, up/up', why: 'Subinterfaces inherit the physical port\'s state: if G0/0 is down, everything on it is down.' },
    { t: 'From PC1, ping PC2 at 10.0.20.10', why: 'Trace the path in your head: PC1 → SW1 (tagged 10) → R1 routes it → back down the SAME cable (tagged 20) → SW1 → PC2. In and out of one physical port.' },
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
  id: 'd19-dtp-vtp', ord: 19, vol: 1, day: 'Day 19', title: 'DTP & VTP',
  topics: 'dynamic desirable/auto · switchport nonegotiate · vtp mode transparent',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['g0/1', 'g0/2'] },
    { id: 'SW2', type: 'switch', ifaces: ['g0/1', 'g0/2'] },
  ],
  links: [['SW1', 'g0/1', 'SW2', 'g0/1']],
  layout: { SW1: [110, 45], SW2: [290, 45] },
  intro: `<b>The situation:</b> two switches joined by a cable, with two automatic features running that most engineers deliberately switch off.<br><b>Your goal:</b> first watch <b>DTP</b> form a trunk by itself (convenient, but it means an attacker's device could do the same), then lock the port down manually. Then neutralise <b>VTP</b>, a feature that syncs VLAN lists between switches and has a nasty habit of wiping them instead. This is a lab about turning things off on purpose.`,
  tasks: [
    { t: 'On SW1: set G0/1 to "dynamic desirable" mode', why: 'Desirable means "actively ask the other side to trunk". SW2\'s default mode (dynamic auto) means "say yes if asked".' },
    { t: 'Run "show interfaces trunk" and confirm a trunk formed — without anyone typing "mode trunk"', why: 'That\'s DTP negotiation in action. Convenient — and exploitable: any device that speaks DTP could do the same. Memorize the combos: desirable+auto = trunk, auto+auto = nothing.' },
    { t: 'On SW1: now hard-code G0/1 as a permanent trunk', why: 'Production stance: YOU decide the port\'s role. No guessing, no negotiation.' },
    { t: 'On SW1: add "switchport nonegotiate" to stop DTP messages entirely', why: 'Belt and braces: even as a fixed trunk the port still SENDS DTP frames unless you silence them. An attacker can\'t negotiate with a port that won\'t talk.' },
    { t: 'On SW2: do the same — permanent trunk plus nonegotiate', why: 'Both ends locked. This pair of commands is the standard hardening for every inter-switch link.' },
    { t: 'On both switches: set VTP mode to transparent', why: 'Opts out of automatic VLAN database syncing. A stray switch with a higher revision number can otherwise WIPE every VLAN in the domain — the infamous "VTP bomb".' },
    { t: 'On both switches: set the VTP domain name to NETDRILL', why: 'The domain scopes who would exchange VTP at all. Setting it deliberately prevents accidentally joining a neighbor\'s domain someday.' },
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
  id: 'd21-stp', ord: 20, vol: 1, day: 'Days 20-21', title: 'Spanning Tree Protocol',
  topics: 'rapid-pvst · root bridge priority · portfast · bpduguard',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['g0/1', 'g0/2', 'f0/1'] },
    { id: 'SW2', type: 'switch', ifaces: ['g0/1', 'g0/2'] },
    { id: 'SW3', type: 'switch', ifaces: ['g0/1', 'g0/2'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.11', mask: '255.255.255.0', gw: null } },
  ],
  links: [['SW1', 'g0/1', 'SW2', 'g0/1'], ['SW1', 'g0/2', 'SW3', 'g0/1'], ['SW2', 'g0/2', 'SW3', 'g0/2'], ['SW1', 'f0/1', 'PC1', 'e0']],
  layout: { SW1: [200, 12], SW2: [90, 80], SW3: [310, 80], PC1: [200, 110] },
  intro: `<b>The situation:</b> three switches cabled in a triangle. That loop would flood the network to death — Spanning Tree Protocol prevents it by automatically blocking one path, and electing one switch as the "root" that all traffic centres on.<br><b>Your goal:</b> stop leaving that election to chance. Choose which switch becomes root (and which is the backup), upgrade all three to the faster version of STP, and protect the port where a PC plugs in.`,
  tasks: [
    { t: 'On SW1: switch the spanning-tree mode to rapid-pvst', why: 'Rapid PVST+ recovers from failures in 1-2 seconds instead of 30-50. There\'s no reason to run classic on modern gear.' },
    { t: 'On SW1: make it the root bridge for VLAN 1 (use "root primary", or set priority 24576 directly)', why: 'Left alone, the election is won by the lowest MAC address — often the oldest switch in the closet, dragging all traffic through it. Choose your root on purpose.' },
    { t: 'On SW2: rapid-pvst mode, and make it the BACKUP root ("root secondary", priority 28672)', why: 'A deterministic plan B: if SW1 dies, SW2\'s 28672 beats every default-priority switch (32768) to become the new root.' },
    { t: 'On SW3: rapid-pvst mode only', why: 'Every switch must run the same STP flavor — mixed modes fall back to slow classic behavior on those links.' },
    { t: 'On SW1\'s host port F0/1: enable portfast', why: 'Skips the 30-second listening/learning wait so the PC gets instant network (and DHCP doesn\'t time out). Host ports only — never on a port facing another switch!' },
    { t: 'On the same port: enable bpduguard', why: 'PortFast\'s bodyguard: if a switch ever appears on this "host" port, the port shuts itself down instead of creating a loop. Always deploy the pair together.' },
    { t: 'On SW1: run "show spanning-tree" and find the line "This bridge is the root"', why: 'The verification: root bridge identity, your priority (24576 + VLAN number), and each port\'s role. Reading this output is a guaranteed exam question.' },
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
  id: 'd22-etherchannel', ord: 22, vol: 1, day: 'Day 22', title: 'EtherChannel',
  topics: 'channel-group · LACP active/passive · trunking the port-channel',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['g0/1', 'g0/2', 'f0/1'] },
    { id: 'SW2', type: 'switch', ifaces: ['g0/1', 'g0/2', 'f0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.12', mask: '255.255.255.0', gw: null } },
  ],
  links: [['SW1', 'g0/1', 'SW2', 'g0/1'], ['SW1', 'g0/2', 'SW2', 'g0/2'], ['SW1', 'f0/1', 'PC1', 'e0'], ['SW2', 'f0/1', 'PC2', 'e0']],
  layout: { PC1: [40, 45], SW1: [140, 45], SW2: [260, 45], PC2: [360, 45] },
  intro: `<b>The situation:</b> two cables run between SW1 and SW2 for extra bandwidth — but Spanning Tree sees a loop and blocks one of them, so you only ever get the speed of one cable.<br><b>Your goal:</b> bundle both cables into a single logical link (an <b>EtherChannel</b>). Spanning Tree then sees one link instead of two, blocks nothing, and you get the bandwidth you paid for. You'll use LACP, the standard protocol for negotiating the bundle.`,
  tasks: [
    { t: 'On SW1: select both uplinks (G0/1 - 2) and put them in channel-group 1, mode active', why: 'Two parallel cables normally mean STP blocks one. Bundling makes them one logical link. "active" = this side initiates the LACP conversation.' },
    { t: 'Watch the log line: IOS auto-creates "interface Port-channel1"', why: 'The bundle gets its own logical interface — that\'s what you\'ll configure from now on.' },
    { t: 'On SW2: same two ports into channel-group 1, but mode passive', why: '"passive" only responds. active+passive forms a bundle; passive+passive never does — the same trap as DTP auto+auto. Exam favorite.' },
    { t: 'On SW1: enter interface port-channel 1 and make it a trunk', why: 'Configure the logical interface and the settings push down to both member ports — keeping them identical, which bundles require.' },
    { t: 'On SW2: trunk its port-channel 1 too', why: 'Both ends of the (logical) link need matching trunk config, exactly like a normal trunk.' },
    { t: 'Verify with "show etherchannel summary" — look for flags SU on Po1 and (P) on the members', why: 'S = layer 2, U = in use, P = bundled. An (I) means stand-alone: the modes didn\'t match and the bundle never formed.' },
    { t: 'From PC1, ping PC2 at 10.0.0.12', why: 'Proof the bundle forwards: STP sees one link, blocks nothing, and both cables carry traffic.' },
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
  id: 'd27-ospf', ord: 27, vol: 1, day: 'Days 25-27', title: 'OSPF Single Area',
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
  intro: `<b>The situation:</b> three routers in a row, with a PC network at each end. All the IP addresses are already configured — but no router knows about any network except the ones it touches directly.<br><b>Your goal:</b> instead of typing static routes by hand (as you did on Day 11), turn on <b>OSPF</b> and let the routers discover everything themselves. They'll introduce themselves to each other, share what they know, and build complete routing tables automatically. Add a fourth router later and nobody has to type a single route.`,
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.1.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.12.1', '255.255.255.252');
    set('R2', 'g0/0', '10.0.12.2', '255.255.255.252'); set('R2', 'g0/1', '10.0.23.2', '255.255.255.252');
    set('R3', 'g0/0', '10.0.23.3', '255.255.255.252'); set('R3', 'g0/1', '10.0.3.1', '255.255.255.0');
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.R3.hostname = 'R3';
  },
  tasks: [
    { t: 'Look around first: on R1, run "show ip interface brief" — the addresses are already configured for you', why: 'This lab is pure OSPF. Know the map: each router\'s LAN plus the /30 links between routers (10.0.12.x between R1-R2, 10.0.23.x between R2-R3).' },
    { t: 'On R1: start OSPF with "router ospf 1"', why: 'The "1" is the process ID — it only matters locally and does NOT need to match between routers (common misconception).' },
    { t: 'On R1: set the router ID to 1.1.1.1', why: 'Without this, OSPF picks an ID from interface addresses. Setting x.x.x.x style yourself makes every neighbor table instantly readable.' },
    { t: 'On R1: advertise the LAN — "network 10.0.1.0 0.0.0.255 area 0"', why: 'The strange second number is a WILDCARD mask (an inverted subnet mask): 0.0.0.255 means "match the whole /24". This enables OSPF on any interface whose address matches.' },
    { t: 'On R1: advertise the link to R2 — "network 10.0.12.0 0.0.0.3 area 0"', why: '0.0.0.3 is the wildcard for a /30. Same area (0) everywhere — this whole lab is a single-area design.' },
    { t: 'On R1: make G0/0 passive', why: 'Only PCs live on the LAN — no OSPF neighbors. Passive stops the pointless hello packets but still advertises the subnet to others.' },
    { t: 'On R2: OSPF process 1, router-id 2.2.2.2, advertise BOTH /30 links (10.0.12.0 and 10.0.23.0, wildcard 0.0.0.3, area 0)', why: 'The middle router glues the two halves together. It has no LAN, so nothing needs to be passive.' },
    { t: 'On R3: OSPF process 1, router-id 3.3.3.3, advertise 10.0.23.0/30 and its LAN 10.0.3.0/24 into area 0, passive G0/1', why: 'The mirror of R1. Once all three routers advertise, every subnet gets learned everywhere — with zero static routes typed.' },
    { t: 'On R2: run "show ip ospf neighbor" — you want TWO neighbors, both in state FULL', why: 'FULL means the routers\' network databases are fully synchronized. Adjacency requirements: same subnet, same area, matching timers, unique router IDs.' },
    { t: 'On R1: run "show ip route" and find the routes marked "O"', why: 'Those are OSPF-learned routes — R1 now knows about networks it never touched. This is the payoff over static routing.' },
    { t: 'From the PC1 tab, ping PC3 at 10.0.3.10', why: 'End-to-end proof: the packet crosses three routers using only routes OSPF discovered by itself.' },
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
  id: 'd28-hsrp', ord: 28, vol: 1, day: 'Day 28', title: 'First Hop Redundancy — HSRP',
  topics: 'standby ip · priority · preempt · show standby brief',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.10', mask: '255.255.255.0', gw: '10.0.0.1' } },
  ],
  links: [['R1', 'g0/0', 'SW1', 'f0/1'], ['R2', 'g0/0', 'SW1', 'f0/2'], ['PC1', 'e0', 'SW1', 'f0/3']],
  layout: { R1: [110, 12], R2: [290, 12], SW1: [200, 68], PC1: [200, 112] },
  intro: `<b>The situation:</b> a PC can only be given ONE default gateway address. If that router dies, the PC is cut off — even if a second router sits right next to it, unused.<br><b>Your goal:</b> make two routers share a single "virtual" gateway address (10.0.0.1) that the PC points at. One router answers for it normally; the other takes over automatically within seconds if the first fails, and the PC never notices. The protocol that does this is <b>HSRP</b>.`,
  tasks: [
    { t: 'On R1: give G0/0 the real address 10.0.0.2 mask 255.255.255.0 and turn it on', why: 'Each router keeps its own real address. The shared gateway address comes next, on top of this.' },
    { t: 'On R1: add the shared gateway with "standby 1 ip 10.0.0.1"', why: 'Group 1\'s virtual IP. No router owns 10.0.0.1 outright — the group answers for it together.' },
    { t: 'On R1: set standby priority 110', why: 'Higher priority wins the Active election. 110 beats R2\'s default of 100, so R1 becomes Active on purpose, not by accident.' },
    { t: 'On R1: enable preempt', why: 'Crucial detail: WITHOUT preempt, a recovered R1 stays Standby forever even at priority 110. HSRP does not take back the Active role by default — classic exam trap.' },
    { t: 'On R2: real address 10.0.0.3 mask 255.255.255.0, port on, and the same "standby 1 ip 10.0.0.1"', why: 'The hot spare. It listens to R1\'s hellos (every 3s) and takes over the virtual IP if R1 goes silent for 10s — the PCs never notice.' },
    { t: 'On both routers: run "show standby brief"', why: 'The truth table: group, priority, P flag (preempt), who is Active, who is Standby, and the virtual IP.' },
    { t: 'Confirm R1 says Active and R2 says Standby', why: 'If both say Active, they can\'t hear each other; if the wrong one is Active, check the priorities.' },
    { t: 'From PC1, ping the gateway 10.0.0.1', why: 'The magic: an address no physical router owns, answering anyway. The Active router speaks for the virtual IP and virtual MAC (0000.0c07.ac01).' },
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
  id: 'd32-ipv6', ord: 32, vol: 1, day: 'Days 30-32', title: 'IPv6 Addressing & Static Routes',
  topics: 'ipv6 unicast-routing · ipv6 address · eui-64 · ipv6 route',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
  ],
  links: [['R1', 'g0/1', 'R2', 'g0/1']],
  layout: { R1: [120, 45], R2: [280, 45] },
  intro: `<b>The situation:</b> two routers connected to each other, this time addressed with IPv6 instead of IPv4. IPv6 routing is switched off by default, so nothing will forward yet.<br><b>Your goal:</b> turn on IPv6 routing, address the link between the routers and each router's own network, then give each one a static route to the other's network. Along the way you'll meet two things IPv4 doesn't have: automatic <b>link-local</b> addresses, and <b>EUI-64</b>, where the router builds half of its own address from its MAC address.`,
  tasks: [
    { t: 'On R1: enable IPv6 routing with "ipv6 unicast-routing"', why: 'A Cisco router will happily hold IPv6 addresses but won\'t ROUTE v6 packets until this is on. It\'s off by default — the #1 IPv6 exam gotcha.' },
    { t: 'On R1: give G0/1 (the link to R2) the address 2001:db8:12::1/64 and turn it on', why: 'The shared link network. 2001:db8::/32 is the official "documentation" prefix — safe for labs and books.' },
    { t: 'On R1: give G0/0 (its LAN) the address 2001:db8:1::1/64 and turn it on', why: 'Fully manual IPv6 addressing — you choose the whole address, just like IPv4.' },
    { t: 'On R2: enable ipv6 unicast-routing, then give G0/1 the address 2001:db8:12::2/64', why: 'The other end of the link. EVERY router that should route v6 needs unicast-routing individually.' },
    { t: 'On R2: address G0/0 differently — give it only the prefix 2001:db8:2::/64 with the "eui-64" option', why: 'The second addressing style: the router builds the host half from its own MAC address (split the MAC, wedge FFFE in the middle, flip bit 7). You WILL compute one of these on the exam.' },
    { t: 'Run "show ipv6 interface brief" and find the FE80:: addresses you never configured', why: 'Every v6 interface auto-creates a link-local FE80:: address — used for next hops and router-to-router chatter. They exist whether you asked or not.' },
    { t: 'On R1: add a static route to R2\'s LAN — "ipv6 route 2001:db8:2::/64 2001:db8:12::2"', why: 'Same shape as IPv4 statics: destination prefix, then next hop.' },
    { t: 'On R2: add the mirror route to 2001:db8:1::/64 via 2001:db8:12::1', why: 'The both-directions rule never goes away: without the return route, replies die at R2.' },
    { t: 'Verify with "show ipv6 route" on both routers', why: 'C = connected, S = your statics. Confirm each router now knows the other\'s LAN.' },
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
