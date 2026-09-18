/* NetDrill labs — Volume 1 COMPREHENSIVE tier.
   Long-form drills that walk the complete command set for a topic, including
   the "no" forms, the option variants and the verification commands that the
   core labs skip. Each step names the device it is typed on. */
'use strict';
(function () {
const ND = window.ND;
const L = lab => ND.LABS.push(lab);

/* ============================================================= */
L({
  id: 'x1-device-mgmt', vol: 1, tier: 'deep', day: 'Days 4-5', title: 'Device Setup & Management — Full Drill',
  topics: 'all CLI modes · secrets & passwords · con/vty lines · exec-timeout · banners · NVRAM · show commands',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
  ],
  links: [['SW1', 'g0/1', 'R1', 'g0/0']],
  layout: { SW1: [120, 45], R1: [290, 45] },
  intro: `<b>The situation:</b> a switch and a router, both straight out of the box.<br><b>Your goal:</b> everything you would type in the first ten minutes on any new device, in one pass — every mode, both kinds of password, both console and remote lines, timeouts, banners, saving and erasing NVRAM, and the show commands that prove each change landed. This is the long version of the Day 4 lab: the same ideas, but nothing skipped.`,
  tasks: [
    { t: 'Walk the mode hierarchy on SW1: user EXEC → privileged EXEC → global config, and name the device SW1', why: 'The prompt symbol (>, #, (config)#) is your position indicator. Reading it before you type is the habit that prevents most beginner errors.' },
    { t: 'Set BOTH an enable secret and an enable password, then remove the password again', why: 'They can coexist, but the secret always wins because it is hashed. Removing the weaker one is the real-world cleanup step.' },
    { t: 'Turn on password encryption so the remaining plaintext passwords are scrambled in the config', why: 'Type 7 encryption is weak and reversible, but it stops someone reading passwords over your shoulder.' },
    { t: 'Configure the console line fully: password, login, a 5-minute idle timeout, and synchronous logging', why: 'exec-timeout logs idle sessions out; logging synchronous stops log messages from scrambling the line you are typing. Both are quality-of-life settings every engineer sets.' },
    { t: 'Configure the vty lines 0-4 the same way, with a 10-minute timeout', why: 'The vty lines are the remote doors. They need their own password and timeout — console settings do not apply to them.' },
    { t: 'Add a domain name, a warning banner, and stop DNS lookups of typos', why: 'Housekeeping that makes the device usable: no 60-second hangs on a mistyped command, and a legal notice at login.' },
    { t: 'Prove the enable secret works: leave privileged mode, come back in, and type the password', why: 'The only way to know a password works is to use it. Note that what you type is hidden.' },
    { t: 'Inspect the device with show version, show clock, show users and show history', why: 'The read-only commands you will reach for constantly — IOS version, uptime, who is logged in, and what you just typed.' },
    { t: 'Save to NVRAM, then view the saved copy with show startup-config', why: 'Running config lives in RAM and dies on reboot; startup-config in NVRAM survives. Viewing both is how you confirm they match.' },
    { t: 'Erase the startup configuration, confirm it is gone, then save again', why: 'Erasing NVRAM is how a device is reset for redeployment. Do it once deliberately so the command holds no fear.' },
    { t: 'On R1, compare the defaults: hostname it and look at its interface states', why: 'Router ports start administratively down; switch ports start up. This single difference causes an enormous number of "why is it not working" moments.' },
    { t: 'Bring up R1\'s link to the switch, then find each device from the other with CDP', why: 'CDP confirms the physical link is live and tells you exactly which port connects to which — the fastest sanity check there is.' },
  ],
  steps: [
    { d: 'SW1', t: 'Move up through the modes and name the switch.', c: ['enable', 'configure terminal', 'hostname SW1'], note: 'Watch the prompt at every step: <code>Switch&gt;</code> → <code>Switch#</code> → <code>Switch(config)#</code> → <code>SW1(config)#</code>.' },
    { d: 'SW1', t: 'Set both kinds of privileged-mode password so you can compare them.', c: ['enable password weakone', 'enable secret cisco123'], note: 'Now run <code>do show running-config</code>: the secret appears as a hash, the password as plain text.' },
    { d: 'SW1', t: 'Delete the weaker one — the secret is the one that counts.', c: ['no enable password'] },
    { d: 'SW1', t: 'Scramble the remaining plaintext passwords.', c: ['service password-encryption'] },
    { d: 'SW1', t: 'Configure the console line completely.', c: ['line console 0', 'password consolepw', 'login', 'exec-timeout 5 0', 'logging synchronous', 'exit'], note: '<code>exec-timeout 5 0</code> is 5 minutes 0 seconds. <code>exec-timeout 0 0</code> means never time out — convenient in a lab, a security hole in production.' },
    { d: 'SW1', t: 'Configure the remote-access lines the same way.', c: ['line vty 0 4', 'password vtypw', 'login', 'exec-timeout 10 0', 'logging synchronous', 'exit'], note: 'Lines 0 through 4 are five simultaneous remote sessions. Some platforms offer 0-15.' },
    { d: 'SW1', t: 'Housekeeping: domain name, no DNS lookups, and a login banner.', c: ['ip domain-name netdrill.lab', 'no ip domain-lookup', 'banner motd #Authorised users only. All activity is logged.#'], note: 'The <code>#</code> characters are delimiters marking where the banner text starts and ends — any character you do not use in the message works.' },
    { d: 'SW1', t: 'Check your work, then leave config mode.', c: ['do show running-config', 'end'] },
    { d: 'SW1', t: 'Test the enable secret: drop to user mode and log back in.', c: ['exit', 'enable', 'cisco123'], note: 'Typing <code>enable</code> now prompts for a password, and what you type is hidden. If it were wrong you would be refused three times, then dropped.' },
    { d: 'SW1', t: 'Look around the device with the read-only commands.', c: ['terminal length 0', 'show version', 'show clock', 'show users', 'show history'], note: '<code>terminal length 0</code> turns off the "--More--" pager so long output scrolls in one go — the first thing many engineers type.' },
    { d: 'SW1', t: 'Save to NVRAM and confirm the saved copy exists.', c: ['copy running-config startup-config', 'show startup-config'] },
    { d: 'SW1', t: 'Wipe NVRAM, confirm it is gone, then save once more.', c: ['erase startup-config', 'show startup-config', 'write memory'], note: 'After the erase, <code>show startup-config</code> reports nothing is present. <code>write memory</code> (or just <code>write</code>) is the older, shorter way to save.' },
    { d: 'R1', t: 'Now the router. Name it, then look at its interfaces.', c: ['enable', 'configure terminal', 'hostname R1', 'do show ip interface brief'], note: 'Both ports read "administratively down" — the router default. A switch would have shown them up.' },
    { d: 'R1', t: 'Bring up the link toward the switch and re-check.', c: ['interface g0/0', 'description LINK-TO-SW1', 'no shutdown', 'do show ip interface brief', 'end'], note: 'Watch for the %LINK-5-CHANGED message. Status and Protocol should both now read "up".' },
    { d: 'R1', t: 'Confirm the neighbour with CDP, in both summary and detail.', c: ['show cdp neighbors', 'show cdp neighbors detail'], note: 'Remember the columns: "Local Intrfce" is YOUR port, "Port ID" is theirs.' },
    { d: 'SW1', t: 'Check the same link from the switch side.', c: ['show cdp neighbors'] },
  ],
  verify: ['show running-config', 'show startup-config', 'show version', 'show cdp neighbors', 'show ip interface brief'],
  explain: `<h3>Passwords: four places, two strengths</h3>
<p>A Cisco device has several independent password points: <b>console line</b> (physical port), <b>vty lines</b> (remote), <b>enable</b> (privileged mode), and <b>usernames</b> (Volume 2). Setting one does not protect the others — that is why this lab configures each separately.</p>
<p><code>enable secret</code> stores an MD5 hash; <code>enable password</code> stores plain text. If both exist, IOS uses the secret and ignores the password entirely. <code>service password-encryption</code> applies weak type-7 encryption to the plain-text ones (line passwords, enable password) — trivially reversible, but it defeats shoulder-surfing.</p>
<h3>Line settings worth knowing</h3>
<p><code>exec-timeout m s</code> logs an idle session out. The default is 10 minutes; <code>0 0</code> disables it entirely. <code>logging synchronous</code> re-prints your partially-typed command after a log message interrupts it — without it, a link flapping while you type is maddening.</p>
<h3>Two configurations, two memories</h3>
<p><b>running-config</b> lives in RAM and is what the device is doing right now. <b>startup-config</b> lives in NVRAM and is what it will do after a reboot. <code>copy running-config startup-config</code> (or <code>write</code>) copies RAM → NVRAM; <code>erase startup-config</code> empties NVRAM so the device boots to factory defaults.</p>
<h3>Router vs switch defaults</h3>
<p>Router interfaces ship <b>shutdown</b>; switch interfaces ship <b>enabled</b>. The reasoning is that a router port needs deliberate addressing before it should carry traffic, whereas a switch is expected to work the moment it is plugged in. Expect at least one exam question that hinges on this.</p>`,
  checks: [
    { desc: 'SW1 and R1 are named', fn: H => H.hostname('SW1', 'SW1') && H.hostname('R1', 'R1') },
    { desc: 'Enable secret set and the weaker enable password removed', fn: H => H.d('SW1').enableSecret === 'cisco123' && !H.d('SW1').enablePassword },
    { desc: 'service password-encryption is on', fn: H => H.d('SW1').svcEnc },
    { desc: 'Console: password, login, exec-timeout and logging synchronous', fn: H => { const l = H.d('SW1').lines.con; return !!(l.password && l.login && l.execTimeout && l.sync); } },
    { desc: 'VTY: password, login, exec-timeout and logging synchronous', fn: H => { const l = H.d('SW1').lines.vty; return !!(l.password && l.login && l.execTimeout && l.sync); } },
    { desc: 'Domain name set, DNS lookup disabled, banner configured', fn: H => !!H.d('SW1').domainName && !H.d('SW1').domainLookup && !!H.d('SW1').banner },
    { desc: 'SW1 configuration saved to NVRAM', fn: H => H.saved('SW1') },
    { desc: 'R1 G0/0 is up with a description', fn: H => H.noshut('R1', 'g0/0') && !!H.i('R1', 'g0/0').desc && H.up('R1', 'g0/0') },
    { desc: 'R1 and SW1 see each other as CDP neighbours', fn: H => ND.cdpNeighbors(H.topo, H.d('R1')).some(n => n.dev.id === 'SW1') },
  ],
});

/* ============================================================= */
L({
  id: 'x2-interfaces', vol: 1, tier: 'deep', day: 'Days 8-9', title: 'Interfaces & Addressing — Full Drill',
  topics: 'physical · loopback · SVI · ranges · speed/duplex · routed ports · ip routing · every show command',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'SW1', type: 'switch', l3switch: true, ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'f0/5', 'f0/6', 'g0/1', 'g0/2'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.1.1.10', mask: '255.255.255.0', gw: '10.1.1.1' } },
  ],
  links: [['R1', 'g0/0', 'SW1', 'g0/1'], ['SW1', 'f0/1', 'PC1', 'e0']],
  layout: { R1: [200, 15], SW1: [200, 70], PC1: [70, 110] },
  intro: `<b>The situation:</b> a router, a layer-3 capable switch and a PC, none of them addressed.<br><b>Your goal:</b> every kind of interface you can meet at CCNA level — a physical router port, a loopback, a switch management SVI, a routed switch port, and a whole range configured at once — plus the four <code>show</code> commands you will use to verify them for the rest of your career.`,
  tasks: [
    { t: 'On R1, address G0/0 as 10.1.1.1/24, describe it, and bring it up', why: 'The bread-and-butter three-command sequence. This address becomes PC1\'s gateway.' },
    { t: 'Create Loopback0 on R1 with 1.1.1.1/32 and notice it comes up on its own', why: 'A loopback is a virtual interface that is always up as long as the device is powered. Used for router IDs, management and testing — and it never needs "no shutdown".' },
    { t: 'On R1, deliberately shut G0/1 and watch the status change, then re-enable it', why: 'Seeing "administratively down" appear and disappear connects the command to the symptom you will diagnose later.' },
    { t: 'Verify R1 with show ip interface brief, show interfaces and show ip interface', why: 'Three levels of detail: one-line summary, full physical/counter detail, and layer-3 detail (ACLs, helper addresses, MTU).' },
    { t: 'On SW1, configure F0/1-F0/2 in one shot with a range: speed, duplex and description', why: 'The range command is how anyone survives a 48-port switch. Hard-coded speed/duplex prevents mismatches.' },
    { t: 'Shut down the unused ports F0/3 to F0/6 in a single range command', why: 'Unused live ports are an open invitation. Disabling them is standard hardening.' },
    { t: 'Give SW1 a management address on the VLAN 1 SVI and a default gateway', why: 'A switch has no routed ports by default, so its management IP lives on a virtual VLAN interface. The default gateway lets it reply to traffic from other subnets.' },
    { t: 'Turn SW1 into a router: enable ip routing and convert G0/2 into a routed port with its own IP', why: 'A layer-3 switch can drop the switching behaviour on a port entirely with "no switchport", making it behave exactly like a router interface.' },
    { t: 'Read the switch port states with show interfaces status and show interfaces switchport', why: 'The two switch-specific views: a one-line-per-port summary, and the full access/trunk detail for one port.' },
    { t: 'From PC1, ping its gateway to prove the whole path works', why: 'PC → switch → router. If this succeeds, addressing, port states and the SVI are all correct.' },
  ],
  steps: [
    { d: 'R1', t: 'Name the router and configure the LAN-facing interface.', c: ['enable', 'configure terminal', 'hostname R1', 'interface gigabitethernet 0/0', 'description LAN-GATEWAY', 'ip address 10.1.1.1 255.255.255.0', 'no shutdown'], note: 'Typed in full here to show the real interface name — from now on <code>int g0/0</code> is the fast way.' },
    { d: 'R1', t: 'Create a loopback. Note that it needs no "no shutdown".', c: ['interface loopback 0', 'ip address 1.1.1.1 255.255.255.255', 'do show ip interface brief'], note: 'Loopback0 shows up/up immediately. A /32 mask means "this single address" — standard for loopbacks.' },
    { d: 'R1', t: 'Take an unused port down and watch the status wording change.', c: ['interface g0/1', 'ip address 192.168.99.1 255.255.255.0', 'shutdown', 'do show ip interface brief'], note: 'G0/1 now reads "administratively down / down" — the fingerprint of a missing <code>no shutdown</code>.' },
    { d: 'R1', t: 'Bring it back and confirm the difference.', c: ['no shutdown', 'do show ip interface brief'], note: 'It now reads "down / down" instead: enabled, but nothing is plugged in. Two different problems, two different messages.' },
    { d: 'R1', t: 'Inspect one interface at both levels of detail.', c: ['end', 'show interfaces g0/0', 'show ip interface g0/0'], note: '<code>show interfaces</code> is layer 1/2 — MAC, duplex, speed, counters. <code>show ip interface</code> is layer 3 — address, ACLs, helper addresses.' },
    { d: 'SW1', t: 'Name the switch, then configure both host ports at once.', c: ['enable', 'configure terminal', 'hostname SW1', 'interface range f0/1 - 2', 'description HOST-PORT', 'speed 100', 'duplex full'], note: 'Everything typed now applies to both ports. Ranges accept lists too: <code>interface range f0/1 - 2, f0/5</code>.' },
    { d: 'SW1', t: 'Disable every unused access port in one command.', c: ['interface range f0/3 - 6', 'shutdown'] },
    { d: 'SW1', t: 'Give the switch a management address and a way off its own subnet.', c: ['interface vlan 1', 'ip address 10.1.1.2 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 10.1.1.1'], note: 'The SVI is virtual — it is up as long as VLAN 1 exists and at least one port in it is active.' },
    { d: 'SW1', t: 'Enable routing and convert an uplink into a true routed port.', c: ['ip routing', 'interface g0/2', 'no switchport', 'ip address 172.16.0.1 255.255.255.252', 'no shutdown'], note: '<code>no switchport</code> strips the layer-2 behaviour from the port. Only multilayer switches accept it — try it on a plain 2960 and it is rejected.' },
    { d: 'SW1', t: 'Read the switch-specific views.', c: ['end', 'show interfaces status', 'show interfaces switchport'], note: 'In <code>show interfaces status</code> the Vlan column reads "routed" for G0/2, a number for access ports, and "trunk" for trunks.' },
    { d: 'PC1', t: 'Prove the path end to end.', c: ['ipconfig', 'ping 10.1.1.1', 'ping 10.1.1.2'], note: 'First the router gateway, then the switch\'s own management address — two different devices answering on the same subnet.' },
  ],
  verify: ['show ip interface brief', 'show interfaces status', 'show interfaces switchport', 'show ip interface g0/0', 'show running-config'],
  explain: `<h3>Five kinds of interface</h3>
<p><b>Physical</b> (G0/0) — a real port. <b>Loopback</b> — virtual, always up, used for router IDs and management. <b>SVI</b> (interface vlan N) — a switch's layer-3 presence in a VLAN. <b>Routed port</b> (<code>no switchport</code>) — a multilayer switch port acting as a router interface. <b>Subinterface</b> (G0/0.10) — one physical port split per VLAN, which the VLAN drill covers.</p>
<h3>Reading interface status</h3>
<p><code>show ip interface brief</code> gives two state columns. <b>administratively down / down</b> means you forgot <code>no shutdown</code>. <b>down / down</b> means enabled but no signal — cable, far end down, or speed mismatch. <b>up / down</b> means layer 1 is fine but layer 2 is not — an encapsulation or keepalive problem. <b>up / up</b> is the only one you want.</p>
<h3>Why hard-code speed and duplex</h3>
<p>Autonegotiation is reliable when both ends do it. The failure case is one end hard-coded and the other on auto: the auto side cannot detect duplex, defaults to half, and you get a duplex mismatch — late collisions and dreadful throughput on a link that still shows "up". Set both ends or neither.</p>
<h3>Switch management addressing</h3>
<p>A layer-2 switch cannot have an IP on a physical port. Its address lives on an SVI, and to answer traffic from other subnets it also needs <code>ip default-gateway</code> — which a layer-3 switch does not, because with <code>ip routing</code> enabled it uses its own routing table instead.</p>`,
  checks: [
    { desc: 'R1 G0/0: 10.1.1.1/24, described, up', fn: H => H.hasIp('R1', 'g0/0', '10.1.1.1', '255.255.255.0') && !!H.i('R1', 'g0/0').desc && H.noshut('R1', 'g0/0') },
    { desc: 'R1 Loopback0 exists with 1.1.1.1/32', fn: H => H.hasIp('R1', 'lo0', '1.1.1.1', '255.255.255.255') },
    { desc: 'R1 G0/1 addressed and re-enabled after the shutdown demo', fn: H => H.hasIp('R1', 'g0/1', '192.168.99.1') && H.noshut('R1', 'g0/1') },
    { desc: 'SW1 F0/1-2: speed 100, duplex full, described', fn: H => ['f0/1', 'f0/2'].every(p => H.i('SW1', p).speed === '100' && H.i('SW1', p).duplex === 'full' && H.i('SW1', p).desc) },
    { desc: 'SW1 F0/3-6 are shut down', fn: H => ['f0/3', 'f0/4', 'f0/5', 'f0/6'].every(p => H.i('SW1', p).shutdown) },
    { desc: 'SW1 management SVI 10.1.1.2/24 up, with a default gateway', fn: H => H.hasIp('SW1', 'vlan1', '10.1.1.2') && H.noshut('SW1', 'vlan1') && H.d('SW1').defaultGateway === '10.1.1.1' },
    { desc: 'SW1 has ip routing enabled', fn: H => H.d('SW1').ipRouting },
    { desc: 'SW1 G0/2 is a routed port with 172.16.0.1/30', fn: H => H.i('SW1', 'g0/2').noSwitchport && H.hasIp('SW1', 'g0/2', '172.16.0.1') },
    { desc: 'PC1 can ping the router gateway and the switch SVI', fn: H => H.ping('PC1', '10.1.1.1') && H.ping('PC1', '10.1.1.2') },
  ],
});

/* ============================================================= */
L({
  id: 'x3-vlans', vol: 1, tier: 'deep', day: 'Days 16-19', title: 'VLANs, Trunking & Inter-VLAN — Full Drill',
  topics: 'create/name/delete VLANs · access & voice · DTP modes · allowed list add/remove/all/none · native · ROAS · VTP',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'g0/1', 'g0/2'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.11', mask: '255.255.255.0', gw: '10.0.10.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.20.11', mask: '255.255.255.0', gw: '10.0.20.1' } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.12', mask: '255.255.255.0', gw: '10.0.10.1' } },
    { id: 'PC4', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.20.12', mask: '255.255.255.0', gw: '10.0.20.1' } },
  ],
  links: [
    ['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2'],
    ['SW1', 'g0/1', 'SW2', 'g0/1'], ['SW2', 'f0/1', 'PC3', 'e0'], ['SW2', 'f0/2', 'PC4', 'e0'],
    ['SW1', 'g0/2', 'R1', 'g0/0'],
  ],
  layout: { R1: [200, 14], SW1: [130, 66], SW2: [290, 66], PC1: [35, 22], PC2: [35, 110], PC3: [365, 22], PC4: [365, 110] },
  intro: `<b>The situation:</b> two switches carrying two departments (VLAN 10 and VLAN 20), a PC from each department on each switch, and a router with a single arm available for routing between them.<br><b>Your goal:</b> the complete VLAN command set in one sitting — creating, naming and deleting VLANs, access and voice ports, watching DTP negotiate before you disable it, every form of the trunk allowed-list, the native VLAN, VTP, and finally router-on-a-stick so the two VLANs can talk.`,
  tasks: [
    { t: 'On SW1, create VLAN 10 (ENGINEERING) and VLAN 20 (SALES)', why: 'A VLAN must exist in the switch database before ports can join it meaningfully. Names make show output readable.' },
    { t: 'Create a VLAN 99 as well, then delete it again', why: 'Deleting is as important as creating. Note that ports left in a deleted VLAN go dark — their traffic has nowhere to go.' },
    { t: 'Put F0/1 in VLAN 10 and F0/2 in VLAN 20 as access ports, and add a voice VLAN to F0/1', why: 'Voice VLAN lets a desk phone tag its own traffic onto a separate VLAN while the PC behind it stays untagged on the access VLAN — one cable, two VLANs.' },
    { t: 'Set SW1\'s uplink G0/1 to dynamic desirable and confirm DTP forms a trunk by itself', why: 'See the automatic behaviour before you switch it off, so you understand what an attacker could exploit.' },
    { t: 'Hard-code G0/1 as a trunk on BOTH switches and disable DTP with nonegotiate', why: 'Both ends must be configured: a nonegotiate trunk stops sending DTP, so a far end left on "dynamic auto" would never trunk and the link would break.' },
    { t: 'Move the native VLAN to 1001 on both trunk ends', why: 'Native VLAN traffic is untagged. Moving it off VLAN 1 to an unused VLAN, identically on both sides, closes a VLAN-hopping avenue.' },
    { t: 'Work through every allowed-list form: set 10,20 then add 30, then remove 30, then all, then back to 10,20', why: 'The single most dangerous VLAN command. "allowed vlan 10,20" REPLACES the list — running it on a live trunk that carried other VLANs cuts them instantly. "add" and "remove" are the safe editing forms.' },
    { t: 'Mirror the whole VLAN and access-port setup on SW2', why: 'VLANs are per-switch. A tagged frame for a VLAN the receiving switch has not created is dropped on arrival.' },
    { t: 'Put both switches into VTP transparent mode in a domain called NETDRILL', why: 'Transparent means "do not sync VLAN databases with anyone" — protection against a switch with a higher revision number wiping your VLANs.' },
    { t: 'Trunk SW1\'s G0/2 toward the router, allowing only VLANs 10 and 20', why: 'The "stick" in router-on-a-stick. Both VLANs must ride this one cable for the router to see them.' },
    { t: 'On R1, create subinterfaces G0/0.10 and G0/0.20, tag each for its VLAN, and address them as the gateways', why: 'Each subinterface terminates one VLAN and its IP becomes that VLAN\'s default gateway. The encapsulation line must come before the IP address.' },
    { t: 'Verify with show vlan brief, show interfaces trunk and show interfaces switchport', why: 'The three VLAN verification views: which ports are in which VLAN, what each trunk carries, and the full detail of one port.' },
    { t: 'Test all four PCs: same-VLAN across switches, and cross-VLAN through the router', why: 'Same-VLAN proves the trunk; cross-VLAN proves router-on-a-stick. Both must work.' },
  ],
  steps: [
    { d: 'SW1', t: 'Name the switch and create the two department VLANs.', c: ['enable', 'configure terminal', 'hostname SW1', 'vlan 10', 'name ENGINEERING', 'vlan 20', 'name SALES', 'exit'] },
    { d: 'SW1', t: 'Create a spare VLAN, look at the list, then delete it.', c: ['vlan 99', 'name TEMP', 'exit', 'do show vlan brief', 'no vlan 99', 'do show vlan brief'], note: 'VLAN 99 appears then disappears. VLANs 1002-1005 are legacy defaults you cannot remove.' },
    { d: 'SW1', t: 'Assign the access ports, and give F0/1 a voice VLAN as well.', c: ['interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'switchport voice vlan 150', 'interface f0/2', 'switchport mode access', 'switchport access vlan 20'], note: 'A phone plugs into F0/1 and tags its voice traffic VLAN 150; the PC behind the phone stays untagged in VLAN 10.' },
    { d: 'SW1', t: 'Let DTP negotiate the uplink first, and watch a trunk appear.', c: ['interface g0/1', 'switchport mode dynamic desirable', 'do show interfaces trunk'], note: 'SW2 is still at its default (dynamic auto), which accepts. desirable+auto = trunk, with nobody typing "mode trunk".' },
    { d: 'SW1', t: 'Now do it properly: fixed trunk, DTP off, safe native VLAN.', c: ['switchport mode trunk', 'switchport nonegotiate', 'switchport trunk native vlan 1001'] },
    { d: 'SW1', t: 'Walk every form of the allowed-VLAN list.', c: ['switchport trunk allowed vlan 10,20', 'do show interfaces trunk', 'switchport trunk allowed vlan add 30', 'switchport trunk allowed vlan remove 30', 'switchport trunk allowed vlan all', 'switchport trunk allowed vlan 10,20'], note: 'Watch the allowed column after each one. Note how "all" wipes your careful pruning in a single keystroke.' },
    { d: 'SW2', t: 'Mirror everything on the second switch.', c: ['enable', 'configure terminal', 'hostname SW2', 'vlan 10', 'name ENGINEERING', 'vlan 20', 'name SALES', 'exit', 'interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'interface f0/2', 'switchport mode access', 'switchport access vlan 20'] },
    { d: 'SW2', t: 'Match the trunk configuration exactly — both ends or it breaks.', c: ['interface g0/1', 'switchport mode trunk', 'switchport nonegotiate', 'switchport trunk native vlan 1001', 'switchport trunk allowed vlan 10,20', 'exit'] },
    { d: 'SW2', t: 'Opt out of VTP.', c: ['vtp mode transparent', 'vtp domain NETDRILL', 'do show vtp status'] },
    { d: 'SW1', t: 'Do the same on SW1, then trunk the router uplink.', c: ['exit', 'vtp mode transparent', 'vtp domain NETDRILL', 'interface g0/2', 'switchport mode trunk', 'switchport nonegotiate', 'switchport trunk allowed vlan 10,20', 'end'] },
    { d: 'R1', t: 'Bring up the physical router port — no IP address on it.', c: ['enable', 'configure terminal', 'hostname R1', 'interface g0/0', 'no shutdown'], note: 'The physical port carries tagged frames only. The addresses live on the subinterfaces.' },
    { d: 'R1', t: 'Create a subinterface per VLAN and address it as that VLAN\'s gateway.', c: ['interface g0/0.10', 'encapsulation dot1q 10', 'ip address 10.0.10.1 255.255.255.0', 'interface g0/0.20', 'encapsulation dot1q 20', 'ip address 10.0.20.1 255.255.255.0', 'end', 'show ip interface brief'], note: 'Try the IP address before the encapsulation line on a real router and it is rejected — the tag defines what the subinterface is.' },
    { d: 'SW1', t: 'Run the three verification views.', c: ['show vlan brief', 'show interfaces trunk', 'show interfaces switchport'] },
    { d: 'PC1', t: 'Test same-VLAN across the trunk, then cross-VLAN through the router.', c: ['ping 10.0.10.12', 'ping 10.0.10.1', 'ping 10.0.20.11'], note: 'PC3 is the same VLAN on the other switch; 10.0.10.1 is the router subinterface; PC2 is a different VLAN entirely.' },
    { d: 'PC2', t: 'Confirm from the other VLAN too.', c: ['ping 10.0.20.12', 'ping 10.0.10.11'] },
  ],
  verify: ['show vlan brief', 'show interfaces trunk', 'show interfaces switchport', 'show vtp status', 'show ip interface brief'],
  explain: `<h3>Access, trunk, and the DTP middle ground</h3>
<p>An <b>access port</b> carries one VLAN untagged — for hosts. A <b>trunk</b> carries many VLANs, each frame labelled with a 4-byte 802.1Q tag — for switch-to-switch and switch-to-router links. Left alone, a port sits in a <b>dynamic</b> mode and negotiates via DTP: desirable actively asks, auto only answers. desirable+auto and desirable+desirable both produce a trunk; auto+auto does not. Production practice is to hard-code the role and add <code>switchport nonegotiate</code>.</p>
<h3>The native VLAN</h3>
<p>One VLAN on every trunk travels untagged — the native VLAN, VLAN 1 by default. If the two ends disagree about which VLAN that is, traffic silently crosses between VLANs. Set it identically on both ends, and move it to an unused VLAN so no real traffic rides untagged.</p>
<h3>The allowed list, and the command that breaks networks</h3>
<p><code>switchport trunk allowed vlan 10,20</code> <b>replaces</b> the entire list. On a live trunk carrying VLANs 10, 20, 30 and 40, that command instantly severs 30 and 40. The safe editing forms are <code>add</code> and <code>remove</code>. <code>all</code> restores everything; <code>none</code> allows nothing.</p>
<h3>Router on a stick</h3>
<p>VLANs are separate broadcast domains, so crossing between them needs a layer-3 hop. With one router arm available, the link is trunked and the router grows a <b>subinterface</b> per VLAN. <code>encapsulation dot1q 10</code> binds the subinterface to tag 10; its IP is that VLAN's gateway. A packet from VLAN 10 to VLAN 20 enters and leaves on the same physical wire.</p>
<h3>VTP</h3>
<p>VTP syncs the VLAN database between switches in a domain. A switch inserted with a higher configuration revision number can overwrite everyone else's VLANs — the classic "VTP bomb". Most networks run transparent mode (forward the advertisements, never act on them) and manage VLANs by hand.</p>`,
  checks: [
    { desc: 'VLAN 10 (ENGINEERING) and VLAN 20 (SALES) exist on both switches', fn: H => H.vlanExists('SW1', 10, 'ENGINEERING') && H.vlanExists('SW1', 20, 'SALES') && H.vlanExists('SW2', 10) && H.vlanExists('SW2', 20) },
    { desc: 'The temporary VLAN 99 has been deleted from SW1', fn: H => !H.d('SW1').vlans[99] },
    { desc: 'SW1 F0/1 is access VLAN 10 with voice VLAN 150', fn: H => H.access('SW1', 'f0/1', 10) && H.i('SW1', 'f0/1').voiceVlan === 150 },
    { desc: 'Access ports assigned on both switches', fn: H => H.access('SW1', 'f0/2', 20) && H.access('SW2', 'f0/1', 10) && H.access('SW2', 'f0/2', 20) },
    { desc: 'G0/1 is a fixed trunk with nonegotiate on both switches', fn: H => ['SW1', 'SW2'].every(s => H.trunkStatic(s, 'g0/1') && H.i(s, 'g0/1').nonegotiate) },
    { desc: 'Native VLAN 1001 on both ends of the switch-to-switch trunk', fn: H => H.i('SW1', 'g0/1').nativeVlan === 1001 && H.i('SW2', 'g0/1').nativeVlan === 1001 },
    { desc: 'Both trunks allow exactly VLANs 10 and 20', fn: H => [['SW1', 'g0/1'], ['SW2', 'g0/1'], ['SW1', 'g0/2']].every(([s, p]) => { const a = H.i(s, p).allowed; return a && a.length === 2 && a.includes(10) && a.includes(20); }) },
    { desc: 'Both switches are VTP transparent in domain NETDRILL', fn: H => ['SW1', 'SW2'].every(s => H.d(s).vtp.mode === 'transparent' && H.d(s).vtp.domain === 'NETDRILL') },
    { desc: 'R1 subinterfaces tagged for VLAN 10 and 20 with gateway addresses', fn: H => { const a = H.i('R1', 'g0/0.10'), b = H.i('R1', 'g0/0.20'); return !!(a && a.encapDot1q && a.encapDot1q.vlan === 10 && a.ip.addr === '10.0.10.1' && b && b.encapDot1q.vlan === 20 && b.ip.addr === '10.0.20.1'); } },
    { desc: 'Same-VLAN across the trunk works (PC1→PC3, PC2→PC4)', fn: H => H.ping('PC1', '10.0.10.12') && H.ping('PC2', '10.0.20.12') },
    { desc: 'Cross-VLAN routing works (PC1→PC2 and back)', fn: H => H.ping('PC1', '10.0.20.11') && H.ping('PC2', '10.0.10.11') },
  ],
});

/* ============================================================= */
L({
  id: 'x4-stp-etherchannel', vol: 1, tier: 'deep', day: 'Days 20-22', title: 'STP & EtherChannel — Full Drill',
  topics: 'pvst vs rapid-pvst · explicit priority & root macros · portfast/bpduguard per-port and default · LACP & PAgP · all five bundle modes',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'g0/1', 'g0/2'] },
    { id: 'SW2', type: 'switch', ifaces: ['g0/1', 'g0/2', 'g0/3', 'g0/4'] },
    { id: 'SW3', type: 'switch', ifaces: ['f0/1', 'g0/1', 'g0/2'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.12', mask: '255.255.255.0', gw: null } },
  ],
  links: [
    ['SW1', 'g0/1', 'SW2', 'g0/1'], ['SW1', 'g0/2', 'SW2', 'g0/2'],
    ['SW2', 'g0/3', 'SW3', 'g0/1'], ['SW2', 'g0/4', 'SW3', 'g0/2'],
    ['SW1', 'f0/1', 'PC1', 'e0'], ['SW3', 'f0/1', 'PC2', 'e0'],
  ],
  layout: { SW1: [90, 45], SW2: [200, 45], SW3: [310, 45], PC1: [90, 110], PC2: [310, 110] },
  intro: `<b>The situation:</b> three switches, joined by <em>two</em> cables each — deliberate redundancy that Spanning Tree would normally half-waste by blocking one link of each pair.<br><b>Your goal:</b> take full control of layer 2. Choose the root bridge deliberately instead of letting MAC addresses decide, protect the edge ports, then bundle each pair of cables so both carry traffic — using LACP on one pair and Cisco's PAgP on the other, so you drill every mode combination.`,
  tasks: [
    { t: 'Look at spanning tree before you touch anything, and note which switch won the root election', why: 'With every switch at the default priority of 32768, the lowest MAC address wins — which is effectively random. That is the problem you are about to fix.' },
    { t: 'Put all three switches into rapid-pvst mode', why: 'Rapid PVST+ recovers in 1-2 seconds instead of 30-50. Mixed modes fall back to the slow behaviour, so all switches must match.' },
    { t: 'Make SW1 the root for VLAN 1 by setting priority 4096 explicitly', why: 'The explicit form teaches the rule: priority must be a multiple of 4096. Try 5000 and IOS lists the legal values for you.' },
    { t: 'Make SW2 the backup root with the root secondary macro', why: 'The macro sets 28672 without arithmetic. Knowing both the macro and the number it produces is worth marks.' },
    { t: 'Protect SW1\'s host port F0/1 with portfast and BPDU guard', why: 'PortFast skips the 30-second listening/learning delay for hosts; BPDU guard shuts the port if a switch ever appears there. Always deployed as a pair.' },
    { t: 'On SW3, enable portfast and BPDU guard globally by default instead of per port', why: 'The global form applies to every access port automatically — how you would actually deploy it across a 48-port switch.' },
    { t: 'Bundle SW1↔SW2\'s two links into Port-channel 1 using LACP (active on one side, passive on the other)', why: 'LACP is the open standard. At least one side must be active — passive+passive never forms.' },
    { t: 'Bundle SW2↔SW3\'s two links into Port-channel 2 using PAgP (desirable and auto)', why: 'PAgP is the Cisco equivalent, with desirable/auto mirroring active/passive. Knowing which keyword belongs to which protocol is a guaranteed exam question.' },
    { t: 'Configure both port-channel interfaces as trunks', why: 'You configure the logical interface, not the members — that keeps the bundled ports identical, which bundling requires.' },
    { t: 'Read show etherchannel summary and decode the flags', why: 'S = layer 2, U = in use, P = bundled. An (I) beside a port means stand-alone: the modes did not match and the bundle never formed.' },
    { t: 'Finally, check spanning tree again and confirm PC1 can reach PC2', why: 'STP now sees one logical link per pair, blocks nothing, and traffic crosses all four cables.' },
  ],
  steps: [
    { d: 'SW1', t: 'Look at the tree before changing anything.', c: ['enable', 'show spanning-tree'], note: 'Find the Root ID priority and address, then compare with the Bridge ID below it. If they match, this switch happens to be root.' },
    { d: 'SW1', t: 'Switch to the fast flavour of STP and claim the root explicitly.', c: ['configure terminal', 'hostname SW1', 'spanning-tree mode rapid-pvst', 'spanning-tree vlan 1 priority 4096'], note: 'Try <code>spanning-tree vlan 1 priority 5000</code> first — IOS rejects it and prints every legal value. Priorities move in steps of 4096.' },
    { d: 'SW1', t: 'Protect the host port with the portfast/BPDU-guard pair.', c: ['interface f0/1', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit'], note: 'Read the warning IOS prints. PortFast on a switch-facing port can cause a temporary loop.' },
    { d: 'SW2', t: 'Rapid mode, and become the backup root via the macro.', c: ['enable', 'configure terminal', 'hostname SW2', 'spanning-tree mode rapid-pvst', 'spanning-tree vlan 1 root secondary'], note: 'The macro sets priority 28672 — better than every default (32768) but worse than SW1 (4096).' },
    { d: 'SW3', t: 'Rapid mode, then turn on portfast and BPDU guard for all access ports at once.', c: ['enable', 'configure terminal', 'hostname SW3', 'spanning-tree mode rapid-pvst', 'spanning-tree portfast default', 'spanning-tree portfast bpduguard default'], note: 'The global form saves you touching every port. Individual ports can still override it.' },
    { d: 'SW1', t: 'Bundle the two links to SW2 with LACP, initiating.', c: ['interface range g0/1 - 2', 'channel-group 1 mode active', 'exit'], note: 'Watch the log: IOS auto-creates interface Port-channel1.' },
    { d: 'SW2', t: 'Answer with LACP passive, then bundle the SW3 side with PAgP desirable.', c: ['interface range g0/1 - 2', 'channel-group 1 mode passive', 'exit', 'interface range g0/3 - 4', 'channel-group 2 mode desirable', 'exit'], note: 'active+passive forms an LACP bundle. desirable+auto will form a PAgP one. Mixing LACP with PAgP never works.' },
    { d: 'SW3', t: 'Complete the PAgP bundle from the other side.', c: ['interface range g0/1 - 2', 'channel-group 2 mode auto', 'exit'] },
    { d: 'SW1', t: 'Trunk the logical bundle interface.', c: ['interface port-channel 1', 'switchport mode trunk', 'end', 'show etherchannel summary'], note: 'Look for Po1(SU) and both members marked (P) for bundled.' },
    { d: 'SW2', t: 'Trunk both of its bundles.', c: ['interface port-channel 1', 'switchport mode trunk', 'interface port-channel 2', 'switchport mode trunk', 'end', 'show etherchannel summary'], note: 'SW2 has two bundles, one of each protocol — the Protocol column shows LACP and PAgP side by side.' },
    { d: 'SW3', t: 'Trunk its bundle too.', c: ['interface port-channel 2', 'switchport mode trunk', 'end', 'show etherchannel summary'] },
    { d: 'SW1', t: 'Re-read spanning tree now that the bundles exist.', c: ['show spanning-tree'], note: 'You should now see "This bridge is the root", and the two physical links appear as one logical path.' },
    { d: 'PC1', t: 'Prove traffic crosses both bundles end to end.', c: ['ping 10.0.0.12'], note: 'PC1 → SW1 → (LACP bundle) → SW2 → (PAgP bundle) → SW3 → PC2.' },
  ],
  verify: ['show spanning-tree', 'show etherchannel summary', 'show interfaces trunk', 'show interfaces status'],
  explain: `<h3>Rigging the root election</h3>
<p>The bridge ID is priority + VLAN ID + MAC address. With every switch at the default 32768, the <b>lowest MAC wins</b> — usually the oldest switch in the building, dragging all traffic through the slowest hardware. Setting your core switch to 4096 (or using <code>root primary</code>, which picks 24576) and a second to 28672 makes the topology match your design. Priorities must be multiples of 4096 because the low 12 bits of the field hold the VLAN ID.</p>
<h3>PortFast and BPDU Guard</h3>
<p><b>PortFast</b> moves an access port straight to forwarding, skipping listening and learning. Without it a PC waits ~30 seconds for link — long enough for DHCP to give up. <b>BPDU Guard</b> err-disables the port the moment a BPDU arrives, because a BPDU means a switch is plugged into a port you declared to be an edge. They are deployed together, and both have per-port and global-default forms.</p>
<h3>EtherChannel modes</h3>
<p><b>LACP</b> (IEEE 802.3ad): <code>active</code> initiates, <code>passive</code> responds. <b>PAgP</b> (Cisco): <code>desirable</code> initiates, <code>auto</code> responds. <code>on</code> forces the bundle with no protocol at all, and both sides must say <code>on</code> or you risk a loop. The combinations that fail: passive+passive, auto+auto, on+anything-else, and any LACP-with-PAgP pairing.</p>
<p>All bundled ports must match in speed, duplex and VLAN configuration — which is why you configure the Port-channel interface and let the settings apply to the group. STP then sees one logical link, blocks nothing, and you get the bandwidth of every cable.</p>`,
  checks: [
    { desc: 'All three switches run rapid-pvst', fn: H => ['SW1', 'SW2', 'SW3'].every(s => H.d(s).stp.mode === 'rapid') },
    { desc: 'SW1 has explicit priority 4096 for VLAN 1', fn: H => H.d('SW1').stp.prio[1] === 4096 },
    { desc: 'SW2 is secondary root (priority 28672)', fn: H => H.d('SW2').stp.prio[1] === 28672 },
    { desc: 'SW1 F0/1 has portfast and bpduguard', fn: H => H.i('SW1', 'f0/1').stpPortfast && H.i('SW1', 'f0/1').bpduguard },
    { desc: 'SW3 has portfast and bpduguard enabled globally by default', fn: H => H.d('SW3').stp.portfastDefault && H.d('SW3').stp.bpduguardDefault },
    { desc: 'SW1↔SW2 bundle uses LACP (active / passive)', fn: H => ['g0/1', 'g0/2'].every(p => H.i('SW1', p).channelGroup?.mode === 'active' && H.i('SW2', p).channelGroup?.mode === 'passive') },
    { desc: 'SW2↔SW3 bundle uses PAgP (desirable / auto)', fn: H => ['g0/3', 'g0/4'].every(p => H.i('SW2', p).channelGroup?.mode === 'desirable') && ['g0/1', 'g0/2'].every(p => H.i('SW3', p).channelGroup?.mode === 'auto') },
    { desc: 'Both bundles actually formed', fn: H => ND.channelForms('active', 'passive') && ND.channelForms('desirable', 'auto') && H.i('SW1', 'po1') && H.i('SW3', 'po2') },
    { desc: 'Port-channel interfaces are trunks', fn: H => H.trunkStatic('SW1', 'po1') && H.trunkStatic('SW2', 'po1') && H.trunkStatic('SW2', 'po2') && H.trunkStatic('SW3', 'po2') },
    { desc: 'PC1 can reach PC2 across both bundles', fn: H => H.ping('PC1', '10.0.0.12') },
  ],
});

/* ============================================================= */
L({
  id: 'x5-static-ipv6', vol: 1, tier: 'deep', day: 'Days 11, 30-32', title: 'Static Routing & IPv6 — Full Drill',
  topics: 'next-hop vs exit-interface · floating statics · host routes · longest prefix match · loopbacks · IPv6 manual/EUI-64/link-local · IPv6 statics',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2', 'lo0'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0'] },
    { id: 'R3', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2', 'lo0'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.3.10', mask: '255.255.255.0', gw: '10.0.3.1' } },
  ],
  links: [
    ['PC1', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0'],
    ['R2', 'g0/1', 'R3', 'g0/0'], ['R1', 'g0/2', 'R3', 'g0/2'], ['R3', 'g0/1', 'PC3', 'e0'],
  ],
  layout: { PC1: [35, 30], R1: [130, 30], R2: [250, 18], R3: [250, 92], PC3: [360, 92] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.1.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.12.1', '255.255.255.252'); set('R1', 'g0/2', '10.0.13.1', '255.255.255.252');
    set('R2', 'g0/0', '10.0.12.2', '255.255.255.252'); set('R2', 'g0/1', '10.0.23.2', '255.255.255.252');
    set('R3', 'g0/0', '10.0.23.3', '255.255.255.252'); set('R3', 'g0/1', '10.0.3.1', '255.255.255.0'); set('R3', 'g0/2', '10.0.13.3', '255.255.255.252');
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.R3.hostname = 'R3';
  },
  intro: `<b>The situation:</b> three routers in a triangle with a PC network at each end. Every interface is already addressed, so the routers can reach their direct neighbours — but nothing further.<br><b>Your goal:</b> every flavour of static route there is. Next-hop and exit-interface forms, a backup route that only activates on failure, a host route, a more-specific route that overrides a general one, and then the whole exercise again in IPv6 — including the two addressing styles and the link-local addresses that appear whether you ask for them or not.`,
  tasks: [
    { t: 'Add a loopback to each router (1.1.1.1, 2.2.2.2, 3.3.3.3 as /32) and confirm it comes up unaided', why: 'Loopbacks are virtual and always up. They are the standard way to give a router a stable identity that survives any single interface failing.' },
    { t: 'Read R1\'s routing table before adding anything, and count the connected routes', why: 'C entries are networks the router touches directly; L entries are its own addresses as /32. Everything else you must teach it.' },
    { t: 'On R1, add a static route to PC3\'s network via R2, using the next-hop form', why: 'The standard form: destination network, mask, then the IP of the next router. This will be the primary path.' },
    { t: 'On R1, add a SECOND route to the same network via R3 with an administrative distance of 200', why: 'A floating static. Its higher distance keeps it out of the table while the primary is alive — an automatic backup with no routing protocol involved.' },
    { t: 'On R2, try an exit-interface static route, look at it, then replace it with the next-hop form', why: 'On Ethernet links the exit-interface form relies on proxy ARP and is discouraged by Cisco. Seeing why is more useful than being told.' },
    { t: 'Add a host route on R1 to 3.3.3.3/32 and a more specific /32 route for PC3 itself via the direct R1–R3 link', why: 'Demonstrates longest prefix match: a /32 always wins over a /24 covering the same address, regardless of administrative distance.' },
    { t: 'Give R3 a single default route back toward R2, and finish R2\'s table', why: 'A default route matches everything unknown — far less typing than one route per network, which is how stub sites are built.' },
    { t: 'Prove PC1 and PC3 can reach each other, then traceroute to see which path was chosen', why: 'Traceroute reveals whether the specific /32 route or the general /24 route carried the packet.' },
    { t: 'Remove the host route with "no ip route" and confirm the path changes back', why: 'Every configuration command has a "no" form. Being able to remove cleanly is as important as adding.' },
    { t: 'Switch to IPv6: enable IPv6 routing on R1 and R2', why: 'A Cisco router holds IPv6 addresses happily but will not forward IPv6 packets until this is on — the classic IPv6 gotcha.' },
    { t: 'Address the R1–R2 link manually, give R1\'s LAN a manual prefix, and let R2\'s LAN build itself with EUI-64', why: 'The two addressing styles side by side: you type the whole address, or you give the prefix and the router derives the host half from its MAC.' },
    { t: 'Set a manual link-local address on R1, and enable IPv6 on a third interface with no global address at all', why: 'Every IPv6 interface gets an FE80:: link-local automatically; "ipv6 enable" gives an interface one without any global address. Link-locals are what routing protocols actually talk over.' },
    { t: 'Exchange IPv6 static routes between R1 and R2, then verify with show ipv6 route', why: 'Same both-directions rule as IPv4. The syntax is shorter because the prefix length is written inline.' },
  ],
  steps: [
    { d: 'R1', t: 'Add the loopback and look at the table you start with.', c: ['enable', 'configure terminal', 'interface loopback 0', 'ip address 1.1.1.1 255.255.255.255', 'end', 'show ip route'], note: 'Loopback0 is up immediately \u2014 no "no shutdown" needed. Note the C (connected) and L (local /32) entries, and "Gateway of last resort is not set".' },
    { d: 'R2', t: 'Loopback on R2 as well.', c: ['enable', 'configure terminal', 'interface loopback 0', 'ip address 2.2.2.2 255.255.255.255', 'end'] },
    { d: 'R3', t: 'And on R3.', c: ['enable', 'configure terminal', 'interface loopback 0', 'ip address 3.3.3.3 255.255.255.255', 'end'] },
    { d: 'R1', t: 'Primary route to PC3\'s network, via R2.', c: ['configure terminal', 'ip route 10.0.3.0 255.255.255.0 10.0.12.2'], note: 'Read it aloud: "to reach 10.0.3.0/24, hand the packet to 10.0.12.2".' },
    { d: 'R1', t: 'Backup route over the direct link, with a worse administrative distance.', c: ['ip route 10.0.3.0 255.255.255.0 10.0.13.3 200', 'do show ip route'], note: 'The trailing 200 is the administrative distance. Default for a static is 1, so this one stays dormant while the primary works.' },
    { d: 'R1', t: 'A host route to R3\'s loopback, then a more specific route for PC3 itself.', c: ['ip route 3.3.3.3 255.255.255.255 10.0.12.2', 'ip route 10.0.3.10 255.255.255.255 10.0.13.3', 'end', 'show ip route'], note: 'That /32 for 10.0.3.10 is more specific than the /24 you added earlier, so it wins \u2014 even though both are statics with the same distance.' },
    { d: 'R2', t: 'Try the exit-interface form first, and look at how it is stored.', c: ['configure terminal', 'ip route 10.0.3.0 255.255.255.0 g0/1', 'do show ip route'], note: 'Valid syntax, but on an Ethernet link the router must ARP for every destination behind that interface, relying on proxy ARP. Cisco recommends the next-hop form here.' },
    { d: 'R2', t: 'Replace it with the next-hop form and complete R2\'s table.', c: ['no ip route 10.0.3.0 255.255.255.0 g0/1', 'ip route 10.0.3.0 255.255.255.0 10.0.23.3', 'ip route 10.0.1.0 255.255.255.0 10.0.12.1', 'ip route 3.3.3.3 255.255.255.255 10.0.23.3', 'end', 'show ip route'] },
    { d: 'R3', t: 'One default route covers everything R3 does not know.', c: ['configure terminal', 'ip route 0.0.0.0 0.0.0.0 10.0.23.2', 'end', 'show ip route'], note: 'Now "Gateway of last resort" is set. The route shows as S* \u2014 the asterisk marks it as the candidate default.' },
    { d: 'PC1', t: 'Test end to end, then trace the path.', c: ['ping 10.0.3.10', 'tracert 10.0.3.10'], note: 'The trace should show TWO hops (R1 then R3) because the /32 host route sends it over the direct link, bypassing R2.' },
    { d: 'R1', t: 'Remove the host route and watch the path revert.', c: ['configure terminal', 'no ip route 10.0.3.10 255.255.255.255 10.0.13.3', 'end', 'show ip route'], note: 'Traffic falls back to the /24 via R2 \u2014 three hops now. This is longest prefix match in action.' },
    { d: 'R1', t: 'Now IPv6. Turn on routing and address the link and LAN manually.', c: ['configure terminal', 'ipv6 unicast-routing', 'interface g0/1', 'ipv6 address 2001:db8:12::1/64', 'interface g0/0', 'ipv6 address 2001:db8:1::1/64'], note: '2001:db8::/32 is the reserved documentation prefix \u2014 safe for labs and books.' },
    { d: 'R1', t: 'Pin a readable link-local address, and enable IPv6 on a third port with no global address.', c: ['interface g0/1', 'ipv6 address FE80::1 link-local', 'interface g0/2', 'ipv6 enable', 'end', 'show ipv6 interface brief'], note: 'Link-locals are auto-generated anyway; setting one manually makes next-hop addresses memorable. G0/2 now has a link-local only.' },
    { d: 'R2', t: 'IPv6 on R2: manual on the link, EUI-64 on the LAN.', c: ['configure terminal', 'ipv6 unicast-routing', 'interface g0/0', 'ipv6 address 2001:db8:12::2/64', 'interface g0/1', 'ipv6 address 2001:db8:2::/64 eui-64', 'end', 'show ipv6 interface brief'], note: 'EUI-64 builds the host half from the MAC: split it, insert FFFE in the middle, flip the 7th bit. You may have to compute one by hand in the exam.' },
    { d: 'R1', t: 'IPv6 static route to R2\'s LAN.', c: ['configure terminal', 'ipv6 route 2001:db8:2::/64 2001:db8:12::2', 'end', 'show ipv6 route'] },
    { d: 'R2', t: 'The mirror route back, plus an IPv6 default for good measure.', c: ['configure terminal', 'ipv6 route 2001:db8:1::/64 2001:db8:12::1', 'ipv6 route ::/0 2001:db8:12::1', 'end', 'show ipv6 route'], note: '<code>::/0</code> is the IPv6 way of writing 0.0.0.0/0 \u2014 match everything.' },
  ],
  verify: ['show ip route', 'show ipv6 route', 'show ipv6 interface brief', 'show ip interface brief', 'show running-config'],
  explain: `<h3>The four parts of a static route</h3>
<p><code>ip route [network] [mask] [next-hop | exit-interface] [distance]</code>. On Ethernet, always give a <b>next-hop IP</b>: the exit-interface form makes the router ARP for every remote destination out of that port, which only works if the neighbour answers with proxy ARP. On true point-to-point links (serial) the exit-interface form is fine, because there is only one possible receiver.</p>
<h3>Administrative distance and floating statics</h3>
<p>AD ranks route <em>sources</em> when several offer the same prefix: connected 0, static 1, OSPF 110, RIP 120. Adding a number at the end of a static raises its distance, so it sits unused until the better route disappears — a <b>floating static</b>, the classic backup-link technique.</p>
<h3>Longest prefix match beats everything</h3>
<p>Route selection is prefix length first, distance second. A /32 for 10.0.3.10 wins over a /24 covering 10.0.3.0 even though both are statics with the same distance, and even over a connected route with distance 0. Only when two routes have the <em>same</em> prefix length does AD break the tie.</p>
<h3>IPv6 in three commands</h3>
<p><code>ipv6 unicast-routing</code> enables forwarding (off by default — the single most common IPv6 exam trap). <code>ipv6 address X/len</code> assigns manually; adding <code>eui-64</code> derives the host half from the MAC; <code>link-local</code> pins the FE80:: address. <code>ipv6 enable</code> gives an interface a link-local and nothing else — enough for a routing protocol to run over.</p>
<p>Every IPv6 interface has a link-local address whether you configure one or not. There is no broadcast and no ARP: neighbour discovery over multicast does that job instead.</p>`,
  checks: [
    { desc: 'Loopbacks 1.1.1.1, 2.2.2.2 and 3.3.3.3 exist and are up', fn: H => H.hasIp('R1', 'lo0', '1.1.1.1') && H.hasIp('R2', 'lo0', '2.2.2.2') && H.hasIp('R3', 'lo0', '3.3.3.3') },
    { desc: 'R1 has the primary static to 10.0.3.0/24 via R2', fn: H => H.d('R1').staticRoutes.some(r => r.net === '10.0.3.0' && r.via === '10.0.12.2' && (r.ad || 1) === 1) },
    { desc: 'R1 has a floating backup to the same network with AD 200', fn: H => H.d('R1').staticRoutes.some(r => r.net === '10.0.3.0' && r.via === '10.0.13.3' && r.ad === 200) },
    { desc: 'R1 has a host route to R3\'s loopback 3.3.3.3/32', fn: H => H.d('R1').staticRoutes.some(r => r.net === '3.3.3.3' && r.mask === '255.255.255.255') },
    { desc: 'The temporary /32 route for PC3 was removed again', fn: H => !H.d('R1').staticRoutes.some(r => r.net === '10.0.3.10') },
    { desc: 'R2\'s exit-interface route was replaced by the next-hop form', fn: H => { const rs = H.d('R2').staticRoutes.filter(r => r.net === '10.0.3.0'); return rs.length === 1 && rs[0].via === '10.0.23.3'; } },
    { desc: 'R2 can reach both LANs; R3 has a default route', fn: H => H.d('R2').staticRoutes.some(r => r.net === '10.0.1.0') && H.d('R3').staticRoutes.some(r => r.net === '0.0.0.0') },
    { desc: 'PC1 and PC3 can reach each other', fn: H => H.ping('PC1', '10.0.3.10') && H.ping('PC3', '10.0.1.10') },
    { desc: 'R1 can reach R3\'s loopback via the host route', fn: H => H.ping('R1', '3.3.3.3') },
    { desc: 'IPv6 routing enabled on R1 and R2', fn: H => H.d('R1').ipv6Routing && H.d('R2').ipv6Routing },
    { desc: 'R1: manual addresses on the link and LAN, plus a manual link-local', fn: H => H.i('R1', 'g0/1').ipv6.some(a => a.addr === '2001:DB8:12::1') && H.i('R1', 'g0/0').ipv6.some(a => a.addr === '2001:DB8:1::1') && H.i('R1', 'g0/1').ipv6LL === 'FE80::1' },
    { desc: 'R1 G0/2 has IPv6 enabled with link-local only', fn: H => H.i('R1', 'g0/2').ipv6Enable && H.i('R1', 'g0/2').ipv6.length === 0 },
    { desc: 'R2 LAN uses EUI-64 addressing', fn: H => H.i('R2', 'g0/1').ipv6.some(a => a.eui64) },
    { desc: 'IPv6 static routes exchanged, plus an IPv6 default on R2', fn: H => H.d('R1').v6Routes.some(r => r.prefix === '2001:DB8:2::') && H.d('R2').v6Routes.some(r => r.prefix === '2001:DB8:1::') && H.d('R2').v6Routes.some(r => r.prefix === '::') },
  ],
});

/* ============================================================= */
L({
  id: 'x6-ospf-hsrp', vol: 1, tier: 'deep', day: 'Days 25-28', title: 'OSPF & HSRP — Full Drill',
  topics: 'network statements vs interface mode · router-id · passive default · cost/priority/point-to-point · reference bandwidth · maximum-paths · HSRPv2 multi-group',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0'] },
    { id: 'R3', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.10', mask: '255.255.255.0', gw: '10.0.0.1' } },
  ],
  links: [
    ['R1', 'g0/0', 'SW1', 'f0/1'], ['R2', 'g0/0', 'SW1', 'f0/2'], ['PC1', 'e0', 'SW1', 'f0/3'],
    ['R1', 'g0/1', 'R3', 'g0/0'], ['R2', 'g0/1', 'R3', 'g0/1'],
  ],
  layout: { R1: [110, 18], R2: [290, 18], SW1: [200, 70], PC1: [200, 112], R3: [200, 18] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.0.2', '255.255.255.0'); set('R1', 'g0/1', '10.1.13.1', '255.255.255.252');
    set('R2', 'g0/0', '10.0.0.3', '255.255.255.0'); set('R2', 'g0/1', '10.2.23.1', '255.255.255.252');
    set('R3', 'g0/0', '10.1.13.2', '255.255.255.252'); set('R3', 'g0/1', '10.2.23.2', '255.255.255.252');
    set('R3', 'lo0', '3.3.3.3', '255.255.255.255');
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.R3.hostname = 'R3'; topo.devs.SW1.hostname = 'SW1';
  },
  intro: `<b>The situation:</b> two edge routers share a LAN with a PC, and both reach a third router that owns a remote network (its loopback 3.3.3.3). Addresses are already in place.<br><b>Your goal:</b> make the network both <em>self-learning</em> and <em>fault-tolerant</em>. OSPF discovers all the routes with no static routes typed, and HSRP gives the PC a gateway address that survives either router failing. You will use both ways of enabling OSPF on an interface, and every tuning command CCNA expects.`,
  tasks: [
    { t: 'On R1, start OSPF process 1 and pin the router ID to 1.1.1.1', why: 'The process ID is only locally meaningful and need not match between routers — a very common misconception. The router ID, by contrast, must be unique.' },
    { t: 'Advertise R1\'s LAN and its link to R3 with network statements and wildcard masks', why: 'Wildcard masks are inverted subnet masks: /24 becomes 0.0.0.255, /30 becomes 0.0.0.3. The statement selects which interfaces join OSPF.' },
    { t: 'Set passive-interface default on R1, then explicitly un-passive the link to R3', why: 'The safe pattern: silence everything, then enable hellos only where a neighbour genuinely lives. Far better than remembering to passive each new LAN.' },
    { t: 'On R2, do the same but enable OSPF on the link to R3 with the interface command instead of a network statement', why: 'Two ways to the same result. The interface form is more explicit and is increasingly preferred — the exam expects you to recognise both.' },
    { t: 'On R3, enable OSPF, advertise both links and its loopback, and originate a default route', why: 'default-information originate pushes R3\'s default route to every other OSPF router, so they learn where "everything else" lives.' },
    { t: 'Raise the OSPF reference bandwidth to 10000 on all three routers', why: 'The default reference is 100 Mbps, so every link at 100 Mbps or faster gets cost 1 and the algorithm cannot tell gigabit from fast ethernet. Raise it — identically everywhere, or the costs disagree.' },
    { t: 'Tune one interface: set an explicit OSPF cost, an OSPF priority, and make the R1–R3 link point-to-point', why: 'Cost influences path selection; priority influences the DR/BDR election; point-to-point skips the DR election entirely, which is correct on a two-router link.' },
    { t: 'Allow OSPF to install up to two equal-cost paths', why: 'maximum-paths controls equal-cost load balancing. The default is 4; knowing the command and the default is exam material.' },
    { t: 'Verify with show ip ospf neighbor, show ip ospf interface brief, show ip ospf and show ip protocols', why: 'Four different views: who your neighbours are, which interfaces are running OSPF, the process itself, and a summary of what is being advertised.' },
    { t: 'Configure HSRP version 2 on both LAN routers, sharing virtual IP 10.0.0.1 as group 1, with R1 preferred', why: 'The PC points at .1, which no router physically owns. R1 wins with a higher priority, and preempt lets it take the role back after a failure.' },
    { t: 'Add a SECOND HSRP group on the same interfaces, group 2 with virtual IP 10.0.0.254, where R2 is preferred', why: 'Multiple groups let both routers be active for different sets of clients — simple load sharing, rather than one router idling as a hot spare.' },
    { t: 'Confirm with show standby brief, then ping the remote loopback from PC1', why: 'The end-to-end proof: the PC uses a virtual gateway, and OSPF carries the packet to a network nobody typed a route for.' },
  ],
  steps: [
    { d: 'R1', t: 'Start OSPF and give it a memorable router ID.', c: ['enable', 'configure terminal', 'router ospf 1', 'router-id 1.1.1.1'], note: 'Without this, OSPF picks the highest loopback IP, or failing that the highest interface IP. Always set it yourself.' },
    { d: 'R1', t: 'Advertise both networks with wildcard masks.', c: ['network 10.0.0.0 0.0.0.255 area 0', 'network 10.1.13.0 0.0.0.3 area 0'], note: 'Wildcards are inverted masks: 255.255.255.0 → 0.0.0.255, and 255.255.255.252 → 0.0.0.3.' },
    { d: 'R1', t: 'Silence OSPF everywhere, then re-enable it only toward R3.', c: ['passive-interface default', 'no passive-interface g0/1'], note: 'No neighbours live on the LAN — only PCs — so hellos there are wasted and slightly risky.' },
    { d: 'R1', t: 'Raise the reference bandwidth and limit equal-cost paths.', c: ['auto-cost reference-bandwidth 10000', 'maximum-paths 2', 'exit'], note: 'Read the warning IOS prints: this value must match on every router or their cost calculations disagree.' },
    { d: 'R1', t: 'Tune the link toward R3 at interface level.', c: ['interface g0/1', 'ip ospf cost 10', 'ip ospf priority 100', 'ip ospf network point-to-point', 'end'], note: 'On a link with only two routers, point-to-point skips the DR/BDR election — faster, and one less thing to go wrong.' },
    { d: 'R2', t: 'Same process, but enable OSPF on the link with the interface command.', c: ['enable', 'configure terminal', 'router ospf 1', 'router-id 2.2.2.2', 'network 10.0.0.0 0.0.0.255 area 0', 'passive-interface default', 'no passive-interface g0/1', 'auto-cost reference-bandwidth 10000', 'exit', 'interface g0/1', 'ip ospf 1 area 0', 'end'], note: 'Two lessons here. <code>ip ospf 1 area 0</code> on the interface replaces a network statement, more explicitly. And note the <code>no passive-interface</code>: <b>passive-interface default silences an interface even when OSPF was enabled on it directly</b> — forget that line and the neighbour never appears.' },
    { d: 'R3', t: 'Enable OSPF on R3 for both links and the loopback, and originate a default.', c: ['enable', 'configure terminal', 'router ospf 1', 'router-id 3.3.3.3', 'network 10.1.13.0 0.0.0.3 area 0', 'network 10.2.23.0 0.0.0.3 area 0', 'network 3.3.3.3 0.0.0.0 area 0', 'auto-cost reference-bandwidth 10000', 'default-information originate', 'end'], note: 'The wildcard 0.0.0.0 means "this exact address" — the normal way to advertise a single loopback.' },
    { d: 'R3', t: 'Match R1\'s point-to-point setting on the shared link.', c: ['configure terminal', 'interface g0/0', 'ip ospf network point-to-point', 'end', 'show ip ospf neighbor'], note: 'Network type must match on both ends or the adjacency never reaches FULL.' },
    { d: 'R1', t: 'Check the adjacency and the interfaces running OSPF.', c: ['show ip ospf neighbor', 'show ip ospf interface brief', 'show ip ospf'], note: 'You want state FULL with R3. The interface list should show G0/1 but not G0/0, which is passive.' },
    { d: 'R1', t: 'Read the protocol summary and the resulting routes.', c: ['show ip protocols', 'show ip route'], note: 'Routes marked O were learned automatically. Note 3.3.3.3 appearing without anyone typing a static route.' },
    { d: 'R1', t: 'Now HSRP. Version 2, group 1, and make R1 the preferred gateway.', c: ['configure terminal', 'interface g0/0', 'standby version 2', 'standby 1 ip 10.0.0.1', 'standby 1 priority 110', 'standby 1 preempt'], note: 'Version 2 must match on both routers. Without <code>preempt</code>, a recovered R1 would stay in standby forever despite its higher priority.' },
    { d: 'R1', t: 'Add a second group where R1 deliberately stays the backup.', c: ['standby 2 ip 10.0.0.254', 'standby 2 preempt', 'end', 'show standby brief'], note: 'R1 keeps the default priority 100 in group 2, so R2 will win that one.' },
    { d: 'R2', t: 'Mirror the HSRP configuration with the priorities reversed.', c: ['configure terminal', 'interface g0/0', 'standby version 2', 'standby 1 ip 10.0.0.1', 'standby 2 ip 10.0.0.254', 'standby 2 priority 110', 'standby 2 preempt', 'end', 'show standby brief'], note: 'R2 is now Active for group 2 and Standby for group 1 — both routers carry traffic instead of one sitting idle.' },
    { d: 'PC1', t: 'Prove it all works from the client.', c: ['ping 10.0.0.1', 'ping 10.0.0.254', 'ping 3.3.3.3'], note: 'Two virtual gateways answer, and the remote loopback is reachable over routes OSPF found by itself.' },
  ],
  verify: ['show ip ospf neighbor', 'show ip ospf interface brief', 'show ip protocols', 'show ip route', 'show standby brief'],
  explain: `<h3>Two ways to enable OSPF</h3>
<p>The classic way is a <code>network</code> statement under the OSPF process, matching interface addresses with a wildcard mask. The modern way is <code>ip ospf [process] area [area]</code> directly on the interface. They are equivalent; the interface form removes any doubt about which interfaces are included. Expect both in exam questions.</p>
<h3>Adjacency requirements</h3>
<p>Two routers form a neighbour relationship only if they agree on: the same subnet, the same area, matching hello and dead timers, matching authentication, matching network type, matching MTU, and unique router IDs. A mismatch in any one of them leaves the neighbour stuck short of FULL.</p>
<h3>Cost and reference bandwidth</h3>
<p>Cost = reference bandwidth ÷ interface bandwidth, minimum 1. The default reference of 100 Mbps means a 100 Mbps link, a 1 Gbps link and a 10 Gbps link all score 1 — OSPF cannot tell them apart. Raising the reference to 10000 restores the distinction, but every router must use the same value. An explicit <code>ip ospf cost</code> on an interface overrides the calculation entirely.</p>
<h3>Passive interfaces</h3>
<p>A passive interface still has its subnet advertised, but stops sending hellos. Use it on every interface where no OSPF neighbour exists — LANs full of PCs. <code>passive-interface default</code> plus explicit <code>no passive-interface</code> on the few links that need it is the safer habit, because new interfaces are silent until you say otherwise.</p>
<h3>HSRP</h3>
<p>Hosts hold one gateway address, so redundancy must hide behind a <b>virtual IP</b> and virtual MAC. The Active router answers for it; the Standby listens for hellos and takes over within about 10 seconds. Highest priority wins, but <b>HSRP does not preempt by default</b> — without the <code>preempt</code> keyword a recovered router stays standby. Running two groups with reversed priorities lets both routers forward traffic at once.</p>`,
  checks: [
    { desc: 'OSPF running on all three routers with IDs 1.1.1.1 / 2.2.2.2 / 3.3.3.3', fn: H => H.d('R1').ospf?.routerId === '1.1.1.1' && H.d('R2').ospf?.routerId === '2.2.2.2' && H.d('R3').ospf?.routerId === '3.3.3.3' },
    { desc: 'R1 uses passive-interface default with G0/1 re-enabled', fn: H => H.d('R1').ospf?.passiveDefault && H.d('R1').ospf?.noPassive.includes('GigabitEthernet0/1') },
    { desc: 'R2 enabled OSPF on its link using the interface command', fn: H => H.i('R2', 'g0/1').ospf.pid === 1 && H.i('R2', 'g0/1').ospf.area === 0 },
    { desc: 'Reference bandwidth raised to 10000 on all three routers', fn: H => ['R1', 'R2', 'R3'].every(r => H.d(r).ospf?.refBw === 10000) },
    { desc: 'R1: OSPF cost 10, priority 100 and point-to-point on G0/1', fn: H => { const o = H.i('R1', 'g0/1').ospf; return o.cost === 10 && o.priority === 100 && o.netType === 'point-to-point'; } },
    { desc: 'R1 limits equal-cost paths to 2', fn: H => H.d('R1').ospf?.maxPaths === 2 },
    { desc: 'R3 advertises its loopback and originates a default route', fn: H => H.d('R3').ospf?.networks.some(n => n.net === '3.3.3.3') && H.d('R3').ospf?.defaultInfo },
    { desc: 'Adjacencies R1↔R3 and R2↔R3 are FULL', fn: H => H.ospfNbr('R1', 'R3') && H.ospfNbr('R2', 'R3') },
    { desc: 'No adjacency forms across the passive LAN', fn: H => !H.ospfNbr('R1', 'R2') },
    { desc: 'HSRP group 1 on both routers, R1 preferred with preempt', fn: H => H.i('R1', 'g0/0').standby[1]?.ip === '10.0.0.1' && H.i('R1', 'g0/0').standby[1]?.priority === 110 && H.i('R1', 'g0/0').standby[1]?.preempt && H.i('R2', 'g0/0').standby[1]?.ip === '10.0.0.1' },
    { desc: 'HSRP group 2 on both routers, R2 preferred', fn: H => H.i('R2', 'g0/0').standby[2]?.priority === 110 && H.i('R1', 'g0/0').standby[2]?.ip === '10.0.0.254' },
    { desc: 'HSRP version 2 in use', fn: H => H.i('R1', 'g0/0').standby[1]?.version === 2 && H.i('R2', 'g0/0').standby[1]?.version === 2 },
    { desc: 'PC1 reaches both virtual gateways', fn: H => H.ping('PC1', '10.0.0.1') && H.ping('PC1', '10.0.0.254') },
    { desc: 'PC1 reaches the remote loopback 3.3.3.3 via OSPF', fn: H => H.ping('PC1', '3.3.3.3') },
  ],
});

window.ND = ND;
})();
