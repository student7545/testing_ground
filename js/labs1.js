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
    { t: 'Walk up through the three command modes on SW1',
      do: [
        'Work on the <b>SW1</b> terminal tab (it is the only device in this lab).',
        'You start in <b>user EXEC</b> mode — the prompt ends in <code>&gt;</code> and you can look but not change.',
        'Move up into <b>privileged EXEC</b> mode, where the prompt ends in <code>#</code>.',
        'From there move into <b>global configuration</b> mode, where the prompt reads <code>(config)#</code>.',
      ],
      done: 'Your prompt reads <code>Switch(config)#</code>.',
      why: 'Almost every configuration session starts with these two commands. The prompt symbol always tells you which mode you are in — reading it before you type prevents most beginner mistakes.' },

    { t: 'Rename the switch to SW1',
      do: [
        'In global configuration mode, set the device name to exactly <b>SW1</b> (capital S, capital W, digit one).',
        'Watch the prompt as you press Enter — it changes immediately.',
      ],
      done: 'The prompt reads <code>SW1(config)#</code>.',
      why: 'You cannot manage a room full of devices all called "Switch". The name appears in the prompt, in CDP output on neighbours, and in every log message the device sends.' },

    { t: 'Protect privileged EXEC mode with the password cisco123',
      do: [
        'Set the privileged-mode password to exactly <b>cisco123</b>.',
        'Use the <b>hashed</b> form of the command (the "secret" one), not the older plaintext "password" form.',
      ],
      done: '<code>show running-config</code> contains a line beginning <code>enable secret 5</code> — the 5 means it is stored as a hash.',
      why: 'This is the password that guards the # mode where every change is made. The secret version is stored as an MD5 hash; the password version is stored readable, so always use secret.' },

    { t: 'Put a password on the console port and make the switch actually ask for it',
      do: [
        'Enter the configuration mode for <b>console line 0</b> — the physical port you plug a laptop into.',
        'Set its password to exactly <b>ccna</b>.',
        'Then add the one extra command that tells the line to prompt for that password. A password on its own is ignored until you do.',
        'Leave the line configuration mode when you are finished.',
      ],
      done: '<code>show running-config</code> shows both a <code>password</code> line and a <code>login</code> line underneath <code>line con 0</code>.',
      why: 'The console is the physical way in. Setting a password does nothing until "login" switches on password checking — forgetting that second line is one of the most common slips in the exam and in real life.' },

    { t: 'Hide the plaintext passwords in the configuration file',
      do: [
        'Back in global configuration mode, turn on the service that encrypts every plaintext password in the config.',
        'Then look at <code>show running-config</code> again and find the console password — it is no longer readable.',
      ],
      done: 'The console password shows as <code>password 7 &lt;hash&gt;</code> instead of <code>password ccna</code>.',
      why: 'Without it, anyone glancing at the screen while you run "show run" can read the console password. Type-7 encryption is weak and reversible, but it stops shoulder-surfing.' },

    { t: 'Stop the switch from doing DNS lookups on your typos',
      do: [
        'In global configuration mode, disable domain lookup (it is the "no" form of the domain-lookup command).',
      ],
      done: '<code>show running-config</code> contains <code>no ip domain-lookup</code>.',
      why: 'By default, a mistyped command is treated as a hostname to telnet to, so the device freezes for up to a minute trying to resolve it. Every engineer turns this off on day one.' },

    { t: 'Add a login banner warning that access is restricted',
      do: [
        'Configure a <b>message-of-the-day</b> banner.',
        'The text is up to you — something like <i>Authorized access only!</i> is fine.',
        'Note the syntax quirk: the first character you type after the command is the <b>delimiter</b>, and the banner ends when you type that same character again. <code>#</code> is the usual choice.',
      ],
      done: '<code>show running-config</code> contains a <code>banner motd</code> line with your text.',
      why: 'A legal "authorised access only" notice. Auditors expect it, and its wording has genuinely mattered when intruders were prosecuted.' },

    { t: 'Save everything so it survives a reboot',
      do: [
        'Leave configuration mode and return to privileged EXEC (the <code>#</code> prompt).',
        'Copy the running configuration (in RAM) into the startup configuration (in NVRAM).',
        'Confirm it worked by displaying the startup configuration.',
      ],
      done: 'IOS reports <code>[OK]</code>, and <code>show startup-config</code> now shows your hostname and passwords.',
      why: 'Everything you typed lives in RAM only. A power cycle erases all of it unless you copy it to NVRAM first — the single most expensive lesson a new engineer learns.' },
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
    { t: 'Check the addressing on PC1 before you send anything',
      do: [
        'Switch to the <b>PC1</b> terminal tab using the device tabs above the terminal.',
        'Display its IP configuration with the Windows-style command <code>ipconfig</code>.',
        'Note the address: PC1 is <b>192.168.1.11</b> and PC2 is <b>192.168.1.12</b> — same subnet, same switch, no router involved.',
      ],
      done: 'You can see PC1\'s address and mask on screen.',
      why: 'Always establish your starting point. Two hosts in the same subnet should reach each other with no routing at all — if they cannot, the fault is at layer 1 or 2.' },

    { t: 'Ping from PC1 to PC2 so the switch has traffic to learn from',
      do: [
        'Still on the <b>PC1</b> tab, ping <b>192.168.1.12</b>.',
        'You should get replies.',
      ],
      done: 'The ping reports replies rather than "Request timed out".',
      why: 'A ping creates the ARP and ICMP frames a switch needs. No traffic means an empty MAC table — the switch only learns from frames that actually arrive.' },

    { t: 'Ping back from PC2 so the switch learns that address too',
      do: [
        'Switch to the <b>PC2</b> tab.',
        'Ping <b>192.168.1.11</b> from there.',
      ],
      done: 'PC2 also gets replies.',
      why: 'A switch learns a MAC address only from frames a device SENDS. PC2 has to speak before its address appears anywhere in the table.' },

    { t: 'Display the MAC address table on SW1',
      do: [
        'Switch to the <b>SW1</b> tab and enter privileged EXEC mode (the <code>#</code> prompt).',
        'Display the MAC address table.',
        'Read the four columns: VLAN, MAC address, type (dynamic or static), and the port it was learned on.',
      ],
      done: 'You can see entries against <b>Fa0/1</b> and <b>Fa0/2</b>.',
      why: 'This table is the switch\'s entire forwarding brain: which MAC address lives behind which port, in which VLAN. Everything a switch does comes from it.' },

    { t: 'Match each MAC address in the table to the right PC',
      do: [
        'On each PC tab, run <code>ipconfig /all</code> to see that host\'s own MAC address.',
        'Compare those two addresses with the entries in SW1\'s table and work out which entry is which host.',
      ],
      done: 'You can say out loud which port PC1 is on and which port PC2 is on, from the table alone.',
      why: 'Reading the table and predicting what the switch does with a frame — flood it, forward it out one port, or filter it — is a guaranteed exam skill.' },

    { t: 'Clear the table, then rebuild it with fresh traffic',
      do: [
        'On <b>SW1</b>, clear the dynamically learned MAC entries. The command needs the keyword <b>dynamic</b> on the end — without it IOS answers <i>% Incomplete command</i>.',
        'Display the table again and confirm it is now empty.',
        'Go back to the <b>PC1</b> tab and ping <b>192.168.1.12</b> once more.',
        'Return to <b>SW1</b> and display the table a third time.',
      ],
      done: 'The table is empty straight after the clear, and the entries are back after the ping.',
      why: 'It proves the entries are dynamic. Cleared by hand, or aged out after five minutes of silence, they reappear the instant traffic flows again — you never configure them.' },
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
    { t: 'Name the router R1',
      do: [
        'Work on the <b>R1</b> tab. Enter privileged EXEC, then global configuration mode.',
        'Set the hostname to exactly <b>R1</b>.',
      ],
      done: 'The prompt reads <code>R1(config)#</code>.',
      why: 'Identify the box before you touch it. It is the habit that stops you one day configuring the wrong device entirely.' },

    { t: 'Address G0/0 — the interface facing PC1',
      do: [
        'Enter interface configuration mode for <b>GigabitEthernet0/0</b>.',
        'Give it the address <b>10.0.1.1</b> with mask <b>255.255.255.0</b>.',
      ],
      done: 'No error is returned; you are at the <code>R1(config-if)#</code> prompt.',
      why: 'This address becomes the default gateway for PC1\'s network, 10.0.1.0/24 — the door PC1 uses for anything outside its own subnet.' },

    { t: 'Describe G0/0 as LAN1',
      do: [
        'While still inside interface G0/0, set its description to <b>LAN1</b>.',
      ],
      done: 'The description appears in <code>show running-config</code> under that interface.',
      why: 'Descriptions cost nothing and document what a port is for — for the next person, who is usually you in six months.' },

    { t: 'Switch G0/0 on',
      do: [
        'Still inside interface G0/0, enable the interface. Router interfaces ship <b>administratively down</b>, so this is the command that actually turns it on.',
        'Watch for the <code>%LINK-5-CHANGED</code> and <code>%LINEPROTO-5-UPDOWN</code> log messages confirming it came up.',
      ],
      done: 'The log reports the interface changed state to up.',
      why: 'Router ports are disabled out of the box; switch ports are not. Forgetting this single command is the most common beginner mistake there is.' },

    { t: 'Repeat the whole pattern on G0/1 — the interface facing PC2',
      do: [
        'Enter interface <b>GigabitEthernet0/1</b>.',
        'Give it the address <b>10.0.2.1</b> with mask <b>255.255.255.0</b>.',
        'Set its description to <b>LAN2</b>.',
        'Enable the interface.',
      ],
      done: 'The second interface also reports that it came up.',
      why: 'One interface per network is a router\'s whole job. The four-command pattern — interface, address, description, enable — is the most-typed sequence in the entire CCNA.' },

    { t: 'Verify both interfaces are up and correctly addressed',
      do: [
        'Return to privileged EXEC (or use <code>do</code> from config mode) and show the brief interface summary.',
        'Check that <b>both</b> G0/0 and G0/1 read <b>up</b> in the Status column and <b>up</b> in the Protocol column, with the addresses you configured.',
      ],
      done: 'Two interfaces read up/up with 10.0.1.1 and 10.0.2.1.',
      why: 'Status is layer 1 and Protocol is layer 2. "administratively down" means you forgot to enable it; "down/down" means it is enabled but sees no neighbour.' },

    { t: 'Prove it works: ping across the router from PC1 to PC2',
      do: [
        'Switch to the <b>PC1</b> terminal tab.',
        'Ping <b>10.0.2.10</b>, which is PC2 on the other network.',
      ],
      done: 'PC1 gets replies from 10.0.2.10.',
      why: 'This is the proof that a router forwards between its directly-connected networks. No static routes are needed yet — a router automatically knows the networks it is plugged into.' },
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
    { t: 'Select the two host ports together with a range command',
      do: [
        'On <b>SW1</b>, enter privileged EXEC then global configuration mode.',
        'Select <b>F0/1 and F0/2 together</b> in a single command using the interface <b>range</b> form.',
        'Mind the spacing: the range syntax wants spaces around the hyphen, as in <code>f0/1 - 2</code>.',
      ],
      done: 'The prompt reads <code>SW1(config-if-range)#</code>.',
      why: 'Everything you type from now on applies to every port in the range at once — the command that makes a 48-port switch survivable.' },

    { t: 'Hard-code the speed to 100 Mbps on both host ports',
      do: [
        'With both ports still selected, set the speed to <b>100</b>.',
      ],
      done: 'In <code>show interfaces status</code> those ports later show <code>100</code> with no prefix.',
      why: 'Hard-coding removes auto-negotiation surprises. The rule is to set both ends of a cable the same way, or leave both on auto — never one of each.' },

    { t: 'Hard-code the duplex to full on both host ports',
      do: [
        'With the same range still selected, set the duplex to <b>full</b>.',
      ],
      done: 'Those ports later show <code>full</code> with no prefix in the status output.',
      why: 'The classic failure: one side hard-coded and the other on auto. The auto side cannot detect duplex, falls back to half, and you get a link that is up, slow, and full of late collisions.' },

    { t: 'Label both host ports HOST-PORT',
      do: [
        'Still in the range, set the description to <b>HOST-PORT</b> on both interfaces.',
      ],
      done: 'The Name column of <code>show interfaces status</code> reads HOST-PORT for Fa0/1 and Fa0/2.',
      why: 'It marks which ports feed user devices, so nobody "tidies up" a live port by accident.' },

    { t: 'Shut down every unused port in one command',
      do: [
        'Select <b>F0/3, F0/4, F0/5, F0/6 and G0/1</b> in a single range command. A range accepts a hyphen for a run of ports and commas for extras, so <code>f0/3 - 6, g0/1</code> takes all five at once.',
        'Disable them all.',
      ],
      done: 'Those five ports read <b>disabled</b> in the status output.',
      why: 'A live unused jack in a meeting room is an open invitation. Disabling what is not in use is the baseline of switch hardening, before port security is even considered.' },

    { t: 'Check the whole switch in one screen',
      do: [
        'Display the interface status summary.',
        'Read each column: status (connected / notconnect / disabled), VLAN, duplex and speed.',
        'Note which values carry an <code>a-</code> prefix and which do not.',
      ],
      done: 'Two ports read connected at 100/full, five read disabled.',
      why: 'This is THE switch overview command. The "a-" prefix means auto-negotiated, plain values mean a human configured them — spotting the difference is how you find a duplex mismatch.' },
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
    { t: 'Name the first router R1',
      do: [
        'Work on the <b>R1</b> tab. Enter privileged EXEC, then global configuration mode.',
        'Set the hostname to <b>R1</b>.',
      ],
      done: 'The prompt reads <code>R1(config)#</code>.',
      why: 'Name the device before you configure it, so you always know which console you are typing into.' },

    { t: 'On R1, address the LAN interface G0/0 and enable it',
      do: [
        'Enter interface <b>G0/0</b> — the side facing PC1.',
        'Give it <b>10.0.1.1</b> with mask <b>255.255.255.0</b>.',
        'Enable the interface.',
      ],
      done: 'The interface reports it came up.',
      why: 'This is PC1\'s default gateway — the door out of the 10.0.1.0/24 network.' },

    { t: 'On R1, address the link to R2 on G0/1 and enable it',
      do: [
        'Enter interface <b>G0/1</b> — the cable running to R2.',
        'Give it <b>192.168.12.1</b> with mask <b>255.255.255.252</b>.',
        'Enable the interface.',
      ],
      done: 'G0/1 is up with a /30 address.',
      why: 'A .252 mask is a /30 and leaves exactly two usable addresses — perfectly sized for a link with exactly two routers on it and nothing wasted.' },

    { t: 'Move to R2 and name it',
      do: [
        'Switch to the <b>R2</b> tab using the device tabs above the terminal.',
        'Enter privileged EXEC and global configuration mode, then set the hostname to <b>R2</b>.',
      ],
      done: 'The prompt reads <code>R2(config)#</code>.',
      why: 'Same habit, second box. Getting into the routine now pays off when you are working on eight devices at once.' },

    { t: 'On R2, address the LAN interface G0/0 and enable it',
      do: [
        'Enter interface <b>G0/0</b> — the side facing PC2.',
        'Give it <b>10.0.2.1</b> with mask <b>255.255.255.0</b>.',
        'Enable the interface.',
      ],
      done: 'G0/0 comes up with the LAN address.',
      why: 'PC2\'s default gateway on the far network — the mirror image of what you built on R1.' },

    { t: 'On R2, address the other end of the router link on G0/1',
      do: [
        'Enter interface <b>G0/1</b>.',
        'Give it <b>192.168.12.2</b> with mask <b>255.255.255.252</b> — the second usable address of that /30.',
        'Enable the interface.',
      ],
      done: 'Both ends of the link are now addressed inside the same /30.',
      why: 'Both ends of a link MUST be in the same subnet. 192.168.12.1 and .2 are in the same /30; .1 and .5 would not be, and the routers could never speak.' },

    { t: 'Test the link between the routers before adding any routes',
      do: [
        'From <b>R1</b>, ping <b>192.168.12.2</b>.',
      ],
      done: 'R1 gets replies from R2 across the /30.',
      why: 'Troubleshoot in layers, nearest thing first. There is no point adding routes across a link whose two ends cannot even reach each other.' },

    { t: 'On R1, add a static route to the far LAN',
      do: [
        'In global configuration mode on <b>R1</b>, create a static route for destination network <b>10.0.2.0</b> with mask <b>255.255.255.0</b>, reachable through next hop <b>192.168.12.2</b>.',
        'Read it aloud as you type: "to reach 10.0.2.0/24, send it to 192.168.12.2".',
        'Then display the routing table and find your new entry, marked with an <b>S</b>.',
      ],
      done: '<code>show ip route</code> shows an <code>S 10.0.2.0/24 [1/0] via 192.168.12.2</code> entry.',
      why: 'A router only knows the networks it is directly plugged into. Everything else has to be told to it, either by a static route like this one or by a routing protocol later.' },

    { t: 'On R2, add a default route pointing back at R1',
      do: [
        'In global configuration mode on <b>R2</b>, create a route for destination <b>0.0.0.0</b> with mask <b>0.0.0.0</b>, via next hop <b>192.168.12.1</b>.',
        'Display the routing table and find the entry marked <code>S*</code>.',
      ],
      done: '<code>show ip route</code> shows <code>S* 0.0.0.0/0 [1/0] via 192.168.12.1</code>.',
      why: 'All-zeros means "match anything I have no better route for" — the route of last resort. It is exactly how your router at home points at your ISP.' },

    { t: 'Test end to end, in both directions',
      do: [
        'Switch to the <b>PC1</b> tab and ping <b>10.0.2.10</b>.',
        'Then switch to the <b>PC2</b> tab and ping <b>10.0.1.10</b>.',
      ],
      done: 'Both pings get replies.',
      why: 'A ping needs a route there AND a route back. Configure only one router and the packets arrive while the replies die — the number one static-routing mistake, and the reason you always test both ways.' },
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
    { t: 'Record the "before" picture: prove all three PCs can currently reach each other',
      do: [
        'Switch to the <b>PC1</b> terminal tab.',
        'Ping <b>10.0.0.13</b> (PC3). It should succeed right now.',
      ],
      done: 'PC1 gets replies from PC3.',
      why: 'All three PCs share one subnet and one switch, so everything works. You are about to break that deliberately — and you can only prove you broke it if you know it worked first.' },

    { t: 'Create VLAN 10 and name it ENGINEERING',
      do: [
        'On <b>SW1</b>, enter privileged EXEC then global configuration mode.',
        'Create VLAN <b>10</b>. This moves you into VLAN configuration mode.',
        'Give it the name <b>ENGINEERING</b> (capitals, exactly as written — the check looks for it).',
      ],
      done: '<code>show vlan brief</code> lists VLAN 10 with the name ENGINEERING.',
      why: 'A VLAN has to exist in the switch\'s database before a port can meaningfully join it. Names keep the output readable once you have twenty of them.' },

    { t: 'Create VLAN 20 and name it SALES',
      do: [
        'Still in configuration mode, create VLAN <b>20</b> and name it <b>SALES</b>.',
        'You can go straight from one vlan command to the next without exiting in between.',
      ],
      done: '<code>show vlan brief</code> lists both VLAN 10 and VLAN 20.',
      why: 'The second group. Each VLAN is its own broadcast domain — effectively its own separate switch, built in software.' },

    { t: 'Put PC1 and PC2\'s ports into VLAN 10',
      do: [
        'Select <b>F0/1 and F0/2</b> — you can do both at once with an interface range.',
        'Set the port mode to <b>access</b> (a port carrying exactly one VLAN).',
        'Assign them to VLAN <b>10</b>.',
      ],
      done: '<code>show vlan brief</code> shows Fa0/1 and Fa0/2 in the Ports column of VLAN 10.',
      why: 'Access mode says "this port carries one VLAN, untagged"; the access-vlan command says which one. Both commands together place the attached PC into that VLAN.' },

    { t: 'Put PC3\'s port into VLAN 20',
      do: [
        'Select interface <b>F0/3</b>.',
        'Set it to access mode and assign it to VLAN <b>20</b>.',
      ],
      done: 'Fa0/3 appears under VLAN 20 in <code>show vlan brief</code>.',
      why: 'PC3 is now on a logically different switch, even though not one cable moved and not one IP address changed.' },

    { t: 'Verify the VLAN database and port membership in one view',
      do: [
        'Display the brief VLAN table.',
        'Check three things: VLAN 10 exists with the right name, VLAN 20 exists with the right name, and each port sits in the VLAN you intended.',
      ],
      done: 'Fa0/1 and Fa0/2 are listed under VLAN 10, Fa0/3 under VLAN 20.',
      why: 'This is the one screen that answers "which port is in which VLAN". It is the first command to run when a host mysteriously cannot reach its gateway.' },

    { t: 'Confirm traffic still flows inside VLAN 10',
      do: [
        'Switch to the <b>PC1</b> tab and ping <b>10.0.0.12</b> (PC2).',
      ],
      done: 'The ping succeeds.',
      why: 'PC1 and PC2 are both in VLAN 10, so nothing between them has changed. Half the lesson is what still works.' },

    { t: 'Confirm traffic is now blocked between VLANs — this ping must FAIL',
      do: [
        'Still on <b>PC1</b>, ping <b>10.0.0.13</b> (PC3).',
        'Expect "Request timed out". That failure is the goal of the lab, not a mistake.',
      ],
      done: 'The ping to PC3 fails while the ping to PC2 still works.',
      why: 'Same IP subnet, same physical switch, and yet they cannot talk — because a VLAN is a separate broadcast domain. Crossing between them needs a router, which is the Day 18 lab.' },
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
    { t: 'On SW1, create VLANs 10 and 20',
      do: [
        'Work on the <b>SW1</b> tab. Enter privileged EXEC then global configuration mode.',
        'Create VLAN <b>10</b> and VLAN <b>20</b>. Names are optional in this lab.',
      ],
      done: '<code>show vlan brief</code> on SW1 lists both VLANs.',
      why: 'VLANs are configured per switch — each one keeps its own database, and a switch drops frames for a VLAN it has never heard of.' },

    { t: 'On SW1, put the two PC ports into their VLANs',
      do: [
        'Set <b>F0/1</b> to access mode in VLAN <b>10</b> (this is PC1).',
        'Set <b>F0/2</b> to access mode in VLAN <b>20</b> (this is PC2).',
      ],
      done: 'Fa0/1 shows under VLAN 10 and Fa0/2 under VLAN 20.',
      why: 'The left-hand switch now has one host in each VLAN — which is what makes the trunk test meaningful later.' },

    { t: 'On SW1, turn the link to SW2 into a permanent trunk',
      do: [
        'Select interface <b>G0/1</b> — the cable running across to SW2.',
        'Set it to <b>trunk</b> mode permanently, rather than letting it negotiate.',
      ],
      done: '<code>show interfaces trunk</code> lists Gi0/1.',
      why: 'One cable has to carry BOTH VLANs between the switches. A trunk does that by adding a small 802.1Q tag with the VLAN number to every frame that crosses it.' },

    { t: 'On SW1\'s trunk, move the native VLAN to 1001',
      do: [
        'Still inside <b>G0/1</b>, set the trunk\'s native VLAN to <b>1001</b>.',
      ],
      done: 'The Native VLAN column of <code>show interfaces trunk</code> reads 1001.',
      why: 'Native-VLAN frames cross the trunk untagged. Moving it off VLAN 1 to an unused VLAN removes an attack path — and the value must match on both ends, or traffic leaks between VLANs.' },

    { t: 'On SW1\'s trunk, allow only VLANs 10 and 20 across it',
      do: [
        'Still inside <b>G0/1</b>, set the allowed VLAN list to exactly <b>10,20</b> (no spaces in the list).',
      ],
      done: 'The "VLANs allowed on trunk" line reads 10,20.',
      why: 'Pruning keeps VLANs off links that do not need them. Careful with the syntax: the bare form REPLACES the whole list, while the "add" form appends — mixing them up has caused famous outages.' },

    { t: 'Repeat the entire configuration on SW2',
      do: [
        'Switch to the <b>SW2</b> tab and enter configuration mode.',
        'Create VLANs <b>10</b> and <b>20</b>.',
        'Set <b>F0/1</b> to access VLAN <b>10</b> (PC3) and <b>F0/2</b> to access VLAN <b>20</b> (PC4).',
        'Set <b>G0/1</b> to trunk mode, native VLAN <b>1001</b>, allowed list <b>10,20</b> — identical to SW1.',
      ],
      done: 'SW2 shows the same VLANs, the same port assignments and the same trunk settings as SW1.',
      why: 'Both ends of a trunk must agree, and a tagged frame arriving for a VLAN the receiving switch has not created is silently dropped. Typing the block a second time is also the repetition that makes it stick.' },

    { t: 'Verify the trunk from either switch',
      do: [
        'Run the trunk verification command.',
        'Check all four facts on the one screen: the port is trunking, encapsulation is <b>802.1q</b>, native VLAN is <b>1001</b>, and the allowed list is <b>10,20</b>.',
      ],
      done: 'All four values match what you configured, on both switches.',
      why: 'These are exactly the four things an exam question will alter to break a scenario, and the four things to check first when one VLAN works across a link and another does not.' },

    { t: 'Test same-VLAN traffic across the trunk',
      do: [
        'From the <b>PC1</b> tab, ping <b>10.0.10.12</b> (PC3, same VLAN 10, other switch).',
        'From the <b>PC2</b> tab, ping <b>10.0.20.12</b> (PC4, same VLAN 20, other switch).',
      ],
      done: 'Both pings succeed.',
      why: 'It proves tagging works end to end: tagged at SW1, carried across the trunk, untagged again at SW2\'s access port. Distance stops mattering once the tags are right.' },

    { t: 'Test cross-VLAN traffic — this one must FAIL',
      do: [
        'From the <b>PC1</b> tab (VLAN 10), ping <b>10.0.20.12</b> (PC4, in VLAN 20).',
        'Expect it to time out.',
      ],
      done: 'The cross-VLAN ping fails while the same-VLAN pings succeed.',
      why: 'A trunk carries both VLANs but never mixes them. Moving between VLANs still needs a router — which is precisely the next lab.' },
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
    { t: 'On SW1, create the two VLANs the hosts live in',
      do: [
        'Work on the <b>SW1</b> tab, in global configuration mode.',
        'Create VLAN <b>10</b> and VLAN <b>20</b>.',
      ],
      done: 'Both VLANs appear in <code>show vlan brief</code>.',
      why: 'The two worlds have to exist on the switch before ports or a router can be attached to them.' },

    { t: 'On SW1, place each PC into its VLAN',
      do: [
        'Set <b>F0/1</b> to access mode in VLAN <b>10</b> — this is PC1 (10.0.10.10).',
        'Set <b>F0/2</b> to access mode in VLAN <b>20</b> — this is PC2 (10.0.20.10).',
      ],
      done: 'Each port shows under its VLAN in <code>show vlan brief</code>.',
      why: 'The two PCs are now in separate broadcast domains AND separate IP subnets, so nothing can pass between them without a layer-3 hop.' },

    { t: 'On SW1, trunk the uplink to the router',
      do: [
        'Select <b>G0/1</b> — the single cable to R1.',
        'Set it to <b>trunk</b> mode.',
      ],
      done: 'Gi0/1 is listed by <code>show interfaces trunk</code>.',
      why: 'Both VLANs must ride up this one cable to reach the router. That single trunked cable is the "stick" the design is named after.' },

    { t: 'On R1, enable the physical interface but give it no IP address',
      do: [
        'Switch to the <b>R1</b> tab and enter configuration mode.',
        'Enter interface <b>G0/0</b> and enable it.',
        'Do <b>not</b> give this interface an address — leave it bare.',
      ],
      done: '<code>show ip interface brief</code> shows G0/0 as up/up with "unassigned".',
      why: 'The physical port only needs to be up and carrying tagged frames. Every IP address in this design lives on a subinterface instead.' },

    { t: 'On R1, build the VLAN 10 gateway as subinterface G0/0.10',
      do: [
        'Create subinterface <b>G0/0.10</b> (interface name, dot, number).',
        'Tag it for VLAN <b>10</b> using dot1Q encapsulation — this command must come <b>before</b> the IP address.',
        'Give it <b>10.0.10.1</b> with mask <b>255.255.255.0</b>.',
      ],
      done: 'G0/0.10 appears in <code>show ip interface brief</code> with 10.0.10.1, up/up.',
      why: 'The encapsulation line is what binds this logical interface to VLAN 10\'s tagged frames, and its IP address becomes the default gateway every host in VLAN 10 is pointed at.' },

    { t: 'On R1, build the VLAN 20 gateway as subinterface G0/0.20',
      do: [
        'Create subinterface <b>G0/0.20</b>.',
        'Tag it for VLAN <b>20</b>, then give it <b>10.0.20.1</b> mask <b>255.255.255.0</b>.',
      ],
      done: 'Both subinterfaces are listed with their addresses.',
      why: 'One physical port, many logical interfaces. Matching the subinterface number to the VLAN ID (.20 for VLAN 20) is only convention, but breaking it will confuse you at 2am.' },

    { t: 'Verify both subinterfaces are up with the right addresses',
      do: [
        'Display the brief interface summary on R1.',
        'Check that G0/0, G0/0.10 and G0/0.20 all read up/up and that the two subinterfaces carry the addresses you typed.',
      ],
      done: 'Three lines, all up/up, two of them addressed.',
      why: 'Subinterfaces inherit the physical port\'s state — if G0/0 is down, every subinterface on it is down too, no matter how perfect their configuration.' },

    { t: 'Prove inter-VLAN routing works',
      do: [
        'Switch to the <b>PC1</b> tab and ping <b>10.0.20.10</b> (PC2 in the other VLAN).',
        'As it runs, trace the path in your head: PC1 → SW1 (tagged 10) → R1 routes it → back down the SAME cable (tagged 20) → SW1 → PC2.',
      ],
      done: 'PC1 gets replies from PC2.',
      why: 'The packet enters and leaves the router on one physical wire. Fine for a small site; larger networks do the same job with SVIs on a layer-3 switch.' },
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
    { t: 'On SW1, set G0/1 to dynamic desirable and let DTP do the work',
      do: [
        'Work on the <b>SW1</b> tab, in configuration mode.',
        'Enter interface <b>G0/1</b> and set the switchport mode to <b>dynamic desirable</b>.',
        'Leave SW2 completely alone — its port is still on the factory default, dynamic auto.',
      ],
      done: 'The command is accepted with no error.',
      why: 'Desirable means "I will actively ask the other side to trunk". Auto means "I will agree if asked, but never ask". Together they form a trunk with nobody typing the word trunk.' },

    { t: 'Confirm a trunk formed by itself',
      do: [
        'Display the trunk status on SW1.',
        'Note that Gi0/1 is trunking even though nobody configured trunk mode on either switch.',
      ],
      done: 'Gi0/1 appears in the trunk list.',
      why: 'That is DTP negotiation, and it is exploitable: any device that speaks DTP could negotiate a trunk and see every VLAN. Memorise the combinations — desirable+auto = trunk, auto+auto = no trunk.' },

    { t: 'Take control: hard-code G0/1 as a permanent trunk on SW1',
      do: [
        'Still inside <b>G0/1</b>, set the mode to <b>trunk</b> outright.',
      ],
      done: 'The port is a static trunk rather than a negotiated one.',
      why: 'The production stance is that YOU decide a port\'s role. Nothing about your network should depend on two devices agreeing between themselves.' },

    { t: 'Silence DTP on SW1\'s trunk',
      do: [
        'Still inside <b>G0/1</b>, add the command that stops the port sending DTP frames altogether.',
      ],
      done: '<code>show running-config</code> shows <code>switchport nonegotiate</code> under Gi0/1.',
      why: 'Even a hard-coded trunk keeps sending DTP frames unless you stop it. An attacker cannot negotiate with a port that refuses to talk.' },

    { t: 'Lock down the far end on SW2 the same way',
      do: [
        'Switch to the <b>SW2</b> tab and enter configuration mode.',
        'On <b>G0/1</b>, set the mode to <b>trunk</b> and add <b>nonegotiate</b>.',
      ],
      done: 'Both ends are static trunks with DTP disabled.',
      why: 'These two commands together are the standard hardening for every switch-to-switch link. Both ends must match — a nonegotiate trunk facing a dynamic-auto port never forms at all.' },

    { t: 'Put both switches into VTP transparent mode',
      do: [
        'In global configuration mode on <b>SW1</b>, set the VTP mode to <b>transparent</b>.',
        'Do exactly the same on <b>SW2</b>.',
      ],
      done: '<code>show vtp status</code> reports "Transparent" on both switches.',
      why: 'Transparent means "I will never sync my VLAN database with anybody". It is protection against a switch with a higher revision number wiping every VLAN in the domain — the infamous VTP bomb.' },

    { t: 'Set the VTP domain name to NETDRILL on both switches',
      do: [
        'On both <b>SW1</b> and <b>SW2</b>, set the VTP domain name to exactly <b>NETDRILL</b>.',
        'Confirm with the VTP status command on each.',
      ],
      done: 'Both switches report VTP domain NETDRILL and mode Transparent.',
      why: 'The domain name scopes who would exchange VTP information at all. Setting it deliberately stops a device accidentally joining a neighbour\'s domain one day.' },
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
    { t: 'On SW1, switch spanning tree to the fast version (Rapid PVST+)',
      do: [
        'Work on the <b>SW1</b> tab. Enter privileged EXEC, then global configuration mode.',
        'Change the spanning-tree mode to <b>rapid-pvst</b>.',
      ],
      done: '<code>show running-config</code> shows <code>spanning-tree mode rapid-pvst</code>.',
      why: 'Rapid PVST+ (802.1w) recovers from a failure in one or two seconds instead of 30-50. There is no reason to run the classic version on modern hardware.' },

    { t: 'Make SW1 the root bridge for VLAN 1 on purpose',
      do: [
        'Still on <b>SW1</b>, claim the root role for <b>VLAN 1</b>.',
        'Either use the <b>root primary</b> macro, or set the priority to <b>24576</b> directly — the lab check accepts the resulting priority of 24576 either way.',
      ],
      done: '<code>show spanning-tree</code> on SW1 says "This bridge is the root".',
      why: 'Left alone, the election is won by the lowest MAC address — usually the oldest switch in the cupboard, which then carries all your traffic. Priorities move in steps of 4096 because the VLAN ID occupies the low bits of the bridge ID.' },

    { t: 'On SW2, use Rapid PVST+ and make it the backup root',
      do: [
        'Switch to the <b>SW2</b> tab and enter configuration mode.',
        'Set the spanning-tree mode to <b>rapid-pvst</b>.',
        'Claim the <b>secondary</b> root role for VLAN 1 — the macro sets priority <b>28672</b>, which you may also type directly.',
      ],
      done: 'SW2 reports priority 28672 for VLAN 1.',
      why: 'A deterministic plan B. If SW1 dies, 28672 beats every default-priority switch (32768), so you know in advance which box becomes root.' },

    { t: 'On SW3, switch to Rapid PVST+ as well',
      do: [
        'Switch to the <b>SW3</b> tab and set the spanning-tree mode to <b>rapid-pvst</b>.',
        'Leave its priority at the default — SW3 is not meant to be root.',
      ],
      done: 'All three switches report the same spanning-tree mode.',
      why: 'Every switch must run the same flavour. One switch left on classic PVST+ drags its links back to the slow timers, losing the benefit everywhere it touches.' },

    { t: 'On SW1, make the PC-facing port F0/1 an edge port',
      do: [
        'Back on <b>SW1</b>, enter interface <b>F0/1</b> — the port PC1 plugs into.',
        'Enable <b>portfast</b> on it.',
        'Read the warning IOS prints as you type it.',
      ],
      done: '<code>show running-config</code> shows <code>spanning-tree portfast</code> under Fa0/1.',
      why: 'An edge port skips the listening and learning states and forwards immediately, so a PC gets a DHCP address at once instead of waiting 30 seconds. Never use it on a port facing another switch — which is exactly what the warning says.' },

    { t: 'Protect that edge port with BPDU guard',
      do: [
        'Still inside <b>F0/1</b>, enable BPDU guard on the port.',
      ],
      done: '<code>show running-config</code> shows <code>spanning-tree bpduguard enable</code> under Fa0/1.',
      why: 'A portfast port should never receive a BPDU. If it does, somebody has plugged a switch into a desk port — BPDU guard err-disables the port rather than letting that device reshape your topology. Always deploy the pair together.' },

    { t: 'Verify the tree and read your own handiwork',
      do: [
        'On <b>SW1</b>, display the spanning-tree status.',
        'Find three things: the line saying this bridge is the root, the priority value (24576 plus the VLAN number), and the role of each port.',
      ],
      done: 'SW1 is root, and you can name the role of every port on screen.',
      why: 'Reading this output is a guaranteed exam question. Each non-root switch has exactly one root port; every segment has one designated port; whatever is left over is blocked, and that is the loop being broken.' },
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
    { t: 'On SW1, bundle both uplinks into channel-group 1 using LACP active mode',
      do: [
        'Work on the <b>SW1</b> tab, in global configuration mode.',
        'Select both uplinks at once with an interface range: <b>G0/1 and G0/2</b>.',
        'Put them into <b>channel-group 1</b> with mode <b>active</b>.',
      ],
      done: 'IOS logs the creation of a new interface called Port-channel1.',
      why: 'Two parallel cables normally mean spanning tree blocks one of them. Bundling turns them into a single logical link, so nothing is blocked. "active" means this side starts the LACP conversation.' },

    { t: 'Notice the logical interface IOS created for you',
      do: [
        'Read the log line that appeared: <b>Port-channel1</b> now exists as an interface in its own right.',
        'You did not create it — the channel-group command did.',
      ],
      done: 'Port-channel1 appears in <code>show ip interface brief</code> or <code>show etherchannel summary</code>.',
      why: 'From here on you configure the bundle through that logical interface, and the settings push down to every member port — which is what keeps the members identical, as a bundle requires.' },

    { t: 'On SW2, bundle the same two ports — but in LACP passive mode',
      do: [
        'Switch to the <b>SW2</b> tab and enter configuration mode.',
        'Select <b>G0/1 and G0/2</b> as a range.',
        'Put them into <b>channel-group 1</b> with mode <b>passive</b>.',
      ],
      done: 'SW2 also reports a new Port-channel1 interface.',
      why: 'Passive means "I will answer if asked, but never ask". Active+passive forms a bundle; passive+passive never does — the same trap as DTP auto+auto, and a favourite exam question.' },

    { t: 'On SW1, make the bundle a trunk',
      do: [
        'Back on <b>SW1</b>, enter interface <b>Port-channel 1</b>.',
        'Set it to <b>trunk</b> mode.',
      ],
      done: 'Po1 is listed by <code>show interfaces trunk</code>.',
      why: 'Configure the logical interface, not the members. Anything you set here is applied to both physical ports, keeping them identical — a mismatch between members breaks the bundle.' },

    { t: 'On SW2, trunk its bundle too',
      do: [
        'On <b>SW2</b>, enter interface <b>Port-channel 1</b> and set it to <b>trunk</b> mode.',
      ],
      done: 'Both switches show Po1 as a trunk.',
      why: 'Both ends of the logical link need matching trunk configuration, exactly as with an ordinary trunk.' },

    { t: 'Verify the bundle actually formed',
      do: [
        'Display the EtherChannel summary on either switch.',
        'Look at the flags: <b>SU</b> next to Po1, and <b>(P)</b> next to each member port.',
      ],
      done: 'Po1 reads SU and both members read (P).',
      why: 'S means layer 2, U means in use, P means bundled. An <b>(I)</b> means the port is standalone — the modes did not match and the bundle never formed, which is the first thing to check when a channel misbehaves.' },

    { t: 'Prove traffic crosses the bundle',
      do: [
        'Switch to the <b>PC1</b> tab and ping <b>10.0.0.12</b> (PC2 on the other switch).',
      ],
      done: 'The ping succeeds.',
      why: 'Spanning tree now sees one logical link instead of two, so it blocks nothing and both cables carry traffic — the bandwidth you paid for.' },
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
    { t: 'Survey the network before configuring anything',
      do: [
        'On the <b>R1</b> tab, enter privileged EXEC and display the brief interface summary.',
        'Note the addressing that is already in place: each router\'s LAN plus the /30 links — <b>10.0.12.x</b> between R1 and R2, <b>10.0.23.x</b> between R2 and R3.',
      ],
      done: 'You can describe which subnet sits on each interface without looking again.',
      why: 'This lab is pure OSPF; the addressing is done for you. Knowing the map is what lets you write correct network statements instead of guessing wildcard masks.' },

    { t: 'On R1, start the OSPF process',
      do: [
        'Enter global configuration mode and start OSPF with process ID <b>1</b>.',
        'Your prompt moves into router configuration mode, <code>R1(config-router)#</code>.',
      ],
      done: 'The prompt reads <code>R1(config-router)#</code>.',
      why: 'The process ID is only locally significant — it does <b>not</b> have to match on the other routers. That is one of the most persistent misconceptions in the whole exam.' },

    { t: 'On R1, pin the router ID to 1.1.1.1',
      do: [
        'Inside the OSPF process, set the router ID to <b>1.1.1.1</b>.',
      ],
      done: '<code>show ip protocols</code> reports Router ID 1.1.1.1.',
      why: 'Without this, OSPF picks an ID from the highest loopback or interface address, and neighbour tables become unreadable. Setting it in x.x.x.x form yourself makes every output instantly legible.' },

    { t: 'On R1, advertise the LAN 10.0.1.0/24 into area 0',
      do: [
        'Still inside the OSPF process, write a network statement for <b>10.0.1.0</b> with wildcard <b>0.0.0.255</b>, in <b>area 0</b>.',
      ],
      done: 'No error; the statement appears in <code>show running-config</code> under router ospf 1.',
      why: 'The second number is a WILDCARD mask — an inverted subnet mask, so 0.0.0.255 covers a whole /24. The statement does not advertise a network directly; it selects which interfaces run OSPF.' },

    { t: 'On R1, advertise the /30 link to R2',
      do: [
        'Add a second network statement for <b>10.0.12.0</b> with wildcard <b>0.0.0.3</b>, in <b>area 0</b>.',
      ],
      done: 'Two network statements are listed under the OSPF process.',
      why: '0.0.0.3 is the wildcard for a /30. Every statement in this lab uses area 0, because this is a single-area design — the only kind CCNA configures.' },

    { t: 'On R1, silence OSPF on the LAN interface',
      do: [
        'Inside the OSPF process, make interface <b>G0/0</b> passive.',
      ],
      done: '<code>show ip protocols</code> lists G0/0 under passive interfaces.',
      why: 'Only PCs live on that LAN, so hello packets there are wasted and mildly dangerous. Passive stops the hellos but still advertises the subnet to the rest of the network.' },

    { t: 'On R2, repeat the pattern for the middle router',
      do: [
        'Switch to the <b>R2</b> tab and enter configuration mode.',
        'Start OSPF process <b>1</b> and set the router ID to <b>2.2.2.2</b>.',
        'Advertise <b>both</b> /30 links: <b>10.0.12.0 0.0.0.3</b> and <b>10.0.23.0 0.0.0.3</b>, both in area 0.',
        'R2 has no LAN, so nothing here needs to be passive.',
      ],
      done: 'R2 lists two network statements and router ID 2.2.2.2.',
      why: 'The middle router glues the two halves of the network together. Its adjacencies are what let R1 and R3 learn about each other at all.' },

    { t: 'On R3, mirror what you did on R1',
      do: [
        'Switch to the <b>R3</b> tab and enter configuration mode.',
        'Start OSPF process <b>1</b>, router ID <b>3.3.3.3</b>.',
        'Advertise the link <b>10.0.23.0 0.0.0.3</b> and the LAN <b>10.0.3.0 0.0.0.255</b>, both in area 0.',
        'Make interface <b>G0/1</b> (the LAN side) passive.',
      ],
      done: 'R3 has two network statements and a passive LAN interface.',
      why: 'R3 is the mirror image of R1. Once all three advertise, every subnet is learned everywhere without a single static route being typed.' },

    { t: 'Confirm the adjacencies formed',
      do: [
        'On <b>R2</b>, display the OSPF neighbour table.',
        'You want <b>two</b> neighbours listed, both in state <b>FULL</b>.',
      ],
      done: 'R2 shows R1 and R3 as FULL neighbours.',
      why: 'FULL means the two routers have identical link-state databases. The requirements to get there — same subnet, same area, matching timers, unique router IDs — are examined constantly.' },

    { t: 'Look at the routes OSPF built for you',
      do: [
        'On <b>R1</b>, display the routing table.',
        'Find the entries marked with the code <b>O</b> and note their metrics.',
      ],
      done: 'R1 has O routes to 10.0.23.0/30 and 10.0.3.0/24 — networks it is not connected to.',
      why: 'This is the payoff over static routing. R1 knows about networks nobody told it about, and it will keep up automatically when the topology changes.' },

    { t: 'Prove it end to end',
      do: [
        'Switch to the <b>PC1</b> tab and ping <b>10.0.3.10</b> (PC3, three routers away).',
      ],
      done: 'PC1 gets replies from PC3.',
      why: 'The packet crosses three routers using only paths OSPF discovered by itself, in both directions, with no routes typed by hand.' },
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
    { t: 'On R1, address G0/0 with its own real IP and enable it',
      do: [
        'Work on the <b>R1</b> tab, in configuration mode.',
        'Enter interface <b>G0/0</b>, give it <b>10.0.0.2</b> with mask <b>255.255.255.0</b>, and enable the interface.',
      ],
      done: 'G0/0 is up/up with 10.0.0.2.',
      why: 'Each router keeps its own real address for management and troubleshooting. The shared gateway address is added on top of it, not instead of it.' },

    { t: 'On R1, create HSRP group 1 with the virtual gateway 10.0.0.1',
      do: [
        'Still inside <b>G0/0</b>, configure standby group <b>1</b> with virtual IP <b>10.0.0.1</b>.',
        'Note that this is the address the PC is already pointed at as its default gateway.',
      ],
      done: '<code>show standby brief</code> lists group 1 with virtual IP 10.0.0.1.',
      why: 'No router owns 10.0.0.1 outright — the group answers for it together, and whichever router is Active replies to ARP for it with a virtual MAC (0000.0c07.acXX).' },

    { t: 'On R1, raise the HSRP priority to 110',
      do: [
        'Still in group <b>1</b> on G0/0, set the priority to <b>110</b>.',
      ],
      done: 'The priority column in <code>show standby brief</code> reads 110.',
      why: 'Higher priority wins the Active election. 110 beats R2\'s default of 100, so R1 becomes Active because you decided it should — not because of a MAC-address tiebreak.' },

    { t: 'On R1, enable preempt',
      do: [
        'Still in group <b>1</b>, enable <b>preempt</b>.',
      ],
      done: 'A <b>P</b> appears in the state column of <code>show standby brief</code>.',
      why: 'Without preempt, a recovered R1 stays Standby forever even with the higher priority — HSRP does not take the Active role back by default. It is one of the most commonly tested details in the whole topic.' },

    { t: 'On R2, build the standby side of the same group',
      do: [
        'Switch to the <b>R2</b> tab and enter configuration mode.',
        'On interface <b>G0/0</b>, set the address <b>10.0.0.3</b> mask <b>255.255.255.0</b> and enable it.',
        'Add standby group <b>1</b> with the same virtual IP <b>10.0.0.1</b>.',
        'Leave its priority at the default of 100.',
      ],
      done: 'R2 shows group 1 with the same virtual IP and priority 100.',
      why: 'R2 is the hot spare. It listens for R1\'s hellos every 3 seconds and takes over the virtual IP if they stop for 10 seconds — fast enough that users rarely notice.' },

    { t: 'Read the HSRP state on both routers',
      do: [
        'Run the brief standby summary on <b>R1</b>, then on <b>R2</b>.',
        'Read each column: group number, priority, the P flag for preempt, the state, the address of the other router, and the virtual IP.',
      ],
      done: 'Both routers display a group 1 line.',
      why: 'This one screen answers every HSRP question: who is Active, who is Standby, what the virtual address is, and whether preempt is on.' },

    { t: 'Confirm R1 is Active and R2 is Standby',
      do: [
        'Check that <b>R1</b> reports state <b>Active</b> and <b>R2</b> reports <b>Standby</b>.',
      ],
      done: 'The two routers report opposite, complementary states.',
      why: 'If both say Active they cannot hear each other — a VLAN or cabling fault. If the wrong one is Active, check the priorities and whether preempt was ever configured.' },

    { t: 'Ping the virtual gateway from the PC',
      do: [
        'Switch to the <b>PC1</b> tab and ping <b>10.0.0.1</b>.',
      ],
      done: 'PC1 gets replies from an address no single router owns.',
      why: 'That is the whole trick: the host has one gateway address, and two routers stand behind it. If the Active router fails, the Standby answers for the same address within seconds and the PC never knows.' },
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
    { t: 'On R1, switch on IPv6 routing',
      do: [
        'Work on the <b>R1</b> tab. Enter privileged EXEC, then global configuration mode.',
        'Enable IPv6 unicast routing.',
      ],
      done: '<code>show running-config</code> contains <code>ipv6 unicast-routing</code>.',
      why: 'A Cisco router will hold IPv6 addresses and answer pings to itself without this, but it will not forward a single IPv6 packet between interfaces. It is off by default and it is the number one IPv6 exam gotcha.' },

    { t: 'On R1, address the link to R2 with 2001:db8:12::1/64',
      do: [
        'Enter interface <b>G0/1</b> — the cable to R2.',
        'Give it the IPv6 address <b>2001:db8:12::1/64</b> (the prefix length goes on the end after a slash, unlike IPv4).',
        'Enable the interface.',
      ],
      done: '<code>show ipv6 interface brief</code> shows G0/1 up with that address.',
      why: 'This is the shared transit network. 2001:db8::/32 is the official documentation prefix, reserved for books and labs, so it is safe to use anywhere.' },

    { t: 'On R1, address the LAN interface with 2001:db8:1::1/64',
      do: [
        'Enter interface <b>G0/0</b>, give it <b>2001:db8:1::1/64</b>, and enable it.',
      ],
      done: 'Both R1 interfaces are listed with global addresses.',
      why: 'This is fully manual IPv6 addressing — you choose every bit of the address, exactly as you would in IPv4.' },

    { t: 'On R2, enable IPv6 routing and address the other end of the link',
      do: [
        'Switch to the <b>R2</b> tab and enter configuration mode.',
        'Enable IPv6 unicast routing on this router too.',
        'On interface <b>G0/1</b>, set <b>2001:db8:12::2/64</b> and enable the interface.',
      ],
      done: 'Both ends of the transit link are addressed inside 2001:db8:12::/64.',
      why: 'Every router that should route IPv6 needs the unicast-routing command individually — it is not learned or inherited from a neighbour.' },

    { t: 'On R2, let the router build its own LAN address with EUI-64',
      do: [
        'Enter interface <b>G0/0</b>.',
        'Give it the prefix <b>2001:db8:2::/64</b> with the <b>eui-64</b> keyword on the end, instead of a full address.',
        'Enable the interface, then look at the address the router generated.',
      ],
      done: '<code>show ipv6 interface brief</code> shows a 2001:DB8:2:: address with a long host portion you never typed.',
      why: 'EUI-64 builds the host half from the interface MAC: split the MAC in two, wedge FFFE into the middle, and flip the seventh bit. You will be asked to compute one by hand in the exam — compare the result with the MAC in <code>show interfaces g0/0</code>.' },

    { t: 'Find the link-local addresses nobody configured',
      do: [
        'On either router, display the brief IPv6 interface summary.',
        'Notice that every interface also carries an address starting <b>FE80::</b>.',
      ],
      done: 'You can point at an FE80:: address on each interface.',
      why: 'Every IPv6 interface creates a link-local address automatically. Routing protocols and next-hop resolution use them constantly, and they exist whether you asked for them or not.' },

    { t: 'On R1, add a static IPv6 route to R2\'s LAN',
      do: [
        'In global configuration mode on <b>R1</b>, create an IPv6 route for <b>2001:db8:2::/64</b> via next hop <b>2001:db8:12::2</b>.',
      ],
      done: '<code>show ipv6 route</code> on R1 shows an S entry for 2001:DB8:2::/64.',
      why: 'The shape is identical to an IPv4 static route: destination prefix first, then the next hop. Almost everything you already know transfers straight across.' },

    { t: 'On R2, add the mirror route back to R1\'s LAN',
      do: [
        'On <b>R2</b>, create an IPv6 route for <b>2001:db8:1::/64</b> via <b>2001:db8:12::1</b>.',
      ],
      done: 'Each router has a static route to the other\'s LAN.',
      why: 'The both-directions rule does not change with the protocol version. Without the return route, packets arrive and replies vanish.' },

    { t: 'Verify the IPv6 routing tables on both routers',
      do: [
        'Display the IPv6 routing table on <b>R1</b> and then on <b>R2</b>.',
        'Identify the <b>C</b> (connected), <b>L</b> (local) and <b>S</b> (static) entries.',
      ],
      done: 'Each router shows its own connected prefixes plus one static route to the far LAN.',
      why: 'Reading an IPv6 table fluently — and spotting a missing return route in it — is the practical half of the IPv6 chapters.' },
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
