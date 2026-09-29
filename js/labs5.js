/* NetDrill labs — Volume 1 chapters the first pass did not cover:
   devices and cabling, the models, IPv4 addressing, the life of a packet,
   subnetting, Rapid STP, dynamic routing concepts, and TCP/UDP. */
'use strict';
(function () {
const ND = window.ND;
ND.LABS = ND.LABS || [];
const L = lab => ND.LABS.push(lab);

/* ============================================================= */
L({
  id: 'd01-devices-cables', ord: 1, vol: 1, day: 'Days 1-2', title: 'Network Devices, Interfaces & Cables',
  topics: 'routers vs switches vs hosts · interface naming · speed & duplex · auto-negotiation · PoE · identifying neighbours',
  devices: [
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.10', mask: '255.255.255.0', gw: '10.0.0.1' } },
    { id: 'PH1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.50', mask: '255.255.255.0', gw: '10.0.0.1' }, poeDevice: 'IP Phone 7960' },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0'] },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PH1', 'e0', 'SW1', 'f0/2'], ['SW1', 'g0/1', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0']],
  layout: { PC1: [30, 25], PH1: [30, 100], SW1: [130, 62], R1: [235, 62], R2: [335, 62] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.0.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.12.1', '255.255.255.252');
    set('R2', 'g0/0', '10.0.12.2', '255.255.255.252');
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.SW1.hostname = 'SW1';
  },
  intro: `<b>The situation:</b> a small network you have never seen before — two routers, a switch, a PC and an IP phone — and no documentation.<br><b>Your goal:</b> learn what each box actually does, how its ports are named, and how to read the physical layer from the command line. You will set speed and duplex by hand, see what auto-negotiation reports, and control Power over Ethernet on the port feeding the phone. Everything here is Day 1 knowledge that the rest of the course quietly assumes.`,
  tasks: [
    { t: 'Work out what device you are logged into and what it is cabled to',
      do: [
        'On the <b>SW1</b> tab, enter privileged EXEC mode and turn off the pager with <code>terminal length 0</code>.',
        'Display the version information and note the platform and the IOS image.',
        'Display the CDP neighbours, both the summary and the detailed view.',
      ],
      done: 'You can name the platform, and list which neighbour is on which port.',
      why: 'show version tells you what the box is; CDP tells you what is on the far end of each cable. Together they replace a missing diagram — the first two commands on an unfamiliar network.' },

    { t: 'Read the port inventory and the interface naming scheme',
      do: [
        'Display the interface status summary on <b>SW1</b>.',
        'Note which ports are <b>FastEthernet</b> (100 Mbps) and which are <b>GigabitEthernet</b> (1 Gbps).',
        'Note that the numbering is slot/port — a fixed switch only ever has slot 0.',
      ],
      done: 'You can say what speed each port type runs at from its name alone.',
      why: 'The name tells you the hardware capability before you look at a single counter, and the abbreviations you type (fa0/1, g0/1) only make sense once you know the full names.' },

    { t: 'Label the three ports that are in use',
      do: [
        'In global configuration mode, set descriptions: <b>F0/1</b> = <b>PC1-DESK</b>, <b>F0/2</b> = <b>IP-PHONE-RECEPTION</b>, <b>G0/1</b> = <b>UPLINK-TO-R1</b>.',
      ],
      done: 'The three descriptions appear in the Name column of <code>show interfaces status</code>.',
      why: 'A description costs five seconds now and saves an hour later. It shows in the status output and in the running configuration, where the next engineer will look.' },

    { t: 'Hard-code speed and duplex on the PC port',
      do: [
        'Enter interface <b>F0/1</b> and set the speed to <b>100</b> and the duplex to <b>full</b>.',
        'Then look at the status output and note how those values print.',
      ],
      done: 'Fa0/1 shows <code>100</code> and <code>full</code> with no prefix.',
      why: 'Manually set values print plain; negotiated values carry an "a-" prefix. Spotting that difference is how you catch a duplex mismatch on someone else\'s network.' },

    { t: 'Hard-code the gigabit uplink, then put the phone port back to auto',
      do: [
        'Enter interface <b>G0/1</b> and set speed <b>1000</b> and duplex <b>full</b>.',
        'Enter interface <b>F0/2</b>, set speed <b>100</b> and duplex <b>full</b> first, then set both back to <b>auto</b>.',
        'Compare all three ports in the status output.',
      ],
      done: 'G0/1 reads 1000/full, F0/1 reads 100/full, and F0/2 reads with the a- prefix.',
      why: 'Auto is the right default on nearly every modern link. Hard-coding ONE end only is the classic way to create a duplex mismatch — a link that is up, slow, and full of late collisions.' },

    { t: 'Read the physical detail of a single port',
      do: [
        'Display the full interface detail for <b>F0/1</b>.',
        'Find the MAC address, the MTU, the bandwidth, the duplex and speed, and the error counters.',
      ],
      done: 'You can point at the input errors and collisions counters.',
      why: 'Rising input errors or late collisions point straight at cabling or a duplex problem. This is the deepest of the three interface views.' },

    { t: 'Check the Power over Ethernet budget',
      do: [
        'Return to privileged EXEC and display the inline power status.',
        'Note which port is drawing power, how much, and what class the device claims.',
      ],
      done: 'The phone port shows as drawing power; the others show off.',
      why: 'The phone gets its electricity from the switch. A switch has a total wattage budget, and "why did the phone reboot?" is very often a power question rather than a network one.' },

    { t: 'Refuse power on the ports that will never need it',
      do: [
        'Set <b>F0/1</b> and <b>F0/3</b> to <b>power inline never</b>.',
        'Display the power status again and check the Admin column.',
      ],
      done: 'Both ports read "never" in the admin column.',
      why: 'Ports feeding ordinary PCs do not need to offer power. Refusing it there keeps the budget for the devices that actually draw it.' },

    { t: 'Work through all three power settings on the phone port',
      do: [
        'On <b>F0/2</b>, set <b>power inline static</b> and look at the output.',
        'Then remove the setting with the "no" form and look again.',
        'Finish by setting <b>power inline auto</b>, which is what the phone needs.',
        'Save the switch configuration.',
      ],
      done: 'F0/2 ends on auto and the configuration is saved.',
      why: 'Static reserves the wattage whether or not a device is detected; the "no" form returns the port to its default; auto supplies power only when a powered device is found. Typing all three fixes the difference in memory.' },

    { t: 'Compare a router with the switch you have just configured',
      do: [
        'Switch to the <b>R1</b> tab, enter privileged EXEC and turn off the pager.',
        'Display the version information and the brief interface summary.',
        'Note the two differences from the switch: every interface holds an IP address, and router ports start administratively down.',
      ],
      done: 'You can state both differences without looking.',
      why: 'A router port is routed by default and ships disabled; a switch port is layer 2 and ships enabled. That single difference causes an enormous number of "why is it not working" moments.' },

    { t: 'Confirm the cabling from the router\'s point of view',
      do: [
        'On <b>R1</b>, display the CDP neighbours and the detail for interface <b>G0/0</b>.',
      ],
      done: 'R1 lists SW1 and R2 as neighbours.',
      why: 'The commands are identical on a router — bandwidth, duplex and speed are reported exactly as on the switch. Cross-checking the topology from two vantage points is a habit worth building.' },

    { t: 'Finish at the simplest device of all',
      do: [
        'Switch to the <b>PC1</b> tab, run <code>ipconfig</code>, then ping its gateway <b>10.0.0.1</b>.',
      ],
      done: 'PC1 gets replies from the router.',
      why: 'A host has one interface, one address and one gateway. Everything else in this course exists to carry that one packet.' },
  ],
  steps: [
    { d: 'SW1', t: 'Find out what this device is.', c: ['enable', 'terminal length 0', 'show version'], note: 'Platform, IOS image, uptime and how many interfaces of each type. The very first command to run on an unknown device.' },
    { d: 'SW1', t: 'Find out what it is connected to.', c: ['show cdp neighbors', 'show cdp neighbors detail'], note: 'Capability letters matter: R is router, S is switch, H is host, P is phone. The detail view adds the neighbour\'s IP address and platform.' },
    { d: 'SW1', t: 'Look at the port inventory and the naming scheme.', c: ['show interfaces status'], note: 'FastEthernet ports are 100 Mbps, GigabitEthernet 1 Gbps. The 0/1 part is slot 0, port 1 — fixed switches only ever have slot 0.' },
    { d: 'SW1', t: 'Label the ports.', c: ['configure terminal', 'interface f0/1', 'description PC1-DESK', 'interface f0/2', 'description IP-PHONE-RECEPTION', 'interface g0/1', 'description UPLINK-TO-R1', 'exit', 'do show interfaces status'], note: 'Three descriptions. They show in the Name column and in show running-config.' },
    { d: 'SW1', t: 'Hard-code speed and duplex on the PC port.', c: ['interface f0/1', 'speed 100', 'duplex full', 'exit', 'do show interfaces status'], note: 'Fa0/1 now prints "100" and "full" with no prefix — that is the giveaway that a human set them.' },
    { d: 'SW1', t: 'Hard-code the gigabit uplink, then return the phone port to automatic negotiation.', c: ['interface g0/1', 'speed 1000', 'duplex full', 'exit', 'interface f0/2', 'speed 100', 'duplex full', 'speed auto', 'duplex auto', 'exit', 'do show interfaces status'], note: 'Negotiated values print as "a-100" and "a-full". If one end is hard-coded and the other is auto, the auto end usually falls back to HALF duplex — a slow, error-ridden link that still shows up/up.' },
    { d: 'SW1', t: 'Read the physical detail of one port.', c: ['do show interfaces f0/1'], note: 'MAC address, MTU, bandwidth, duplex, speed, media type and the error counters. Rising input errors or collisions point straight at a cabling or duplex problem.' },
    { d: 'SW1', t: 'Check the Power over Ethernet budget.', c: ['end', 'show power inline'], note: 'The phone port draws 15.4 W and reports a class; ports with nothing powered read off. The switch has a total budget shared across all ports.' },
    { d: 'SW1', t: 'Refuse power on a port that will only ever feed a PC.', c: ['configure terminal', 'interface f0/1', 'power inline never', 'exit', 'interface f0/3', 'power inline never', 'end', 'show power inline'], note: 'Admin column reads "never". The port still carries data — you have only stopped it offering electricity.' },
    { d: 'SW1', t: 'Work through all three power settings on the phone port.', c: ['configure terminal', 'interface f0/2', 'power inline static', 'do show power inline', 'no power inline', 'do show power inline', 'power inline auto', 'end', 'show power inline', 'write memory'], note: '<code>static</code> reserves the wattage whether or not a device is detected; <code>no power inline</code> returns the port to the default; <code>auto</code> supplies power when a powered device is found. Finish on auto — that is what the phone needs.' },
    { d: 'R1', t: 'Now compare with a router.', c: ['enable', 'terminal length 0', 'show version', 'show ip interface brief'], note: 'Different platform, different image, and every interface holds an IP address. A router port is routed by default; a switch port is not.' },
    { d: 'R1', t: 'Confirm the cabling from the router\'s point of view.', c: ['show cdp neighbors', 'show interfaces g0/0'], note: 'R1 sees SW1 on G0/0 and R2 on G0/1. Bandwidth, duplex and speed are reported exactly as on the switch — the commands do not change.' },
    { d: 'PC1', t: 'And from the host, the simplest test of all.', c: ['ipconfig', 'ping 10.0.0.1'], note: 'A host has one interface, one address and one gateway. Everything else in this course exists to carry that one packet.' },
  ],
  verify: ['show version', 'show cdp neighbors', 'show interfaces status', 'show interfaces f0/1', 'show power inline', 'show ip interface brief'],
  explain: `<h3>The three device types</h3>
<p>A <b>switch</b> forwards frames inside one network using MAC addresses, has many ports, and every port is a layer-2 port by default. A <b>router</b> forwards packets between networks using IP addresses, has few ports, and every port is a routed port that starts administratively down. A <b>host</b> has one connection, one address and a default gateway it hands anything non-local to.</p>
<h3>Reading an interface name</h3>
<p><code>FastEthernet0/1</code> = 100 Mbps, slot 0, port 1. <code>GigabitEthernet0/1</code> = 1 Gbps. <code>TenGigabitEthernet</code> = 10 Gbps. Modular routers add slot numbers (<code>Gi0/0/1</code>). Abbreviations (<code>fa0/1</code>, <code>gi0/1</code>, <code>g0/1</code>) are accepted anywhere the full name is.</p>
<h3>Speed, duplex and the mismatch</h3>
<p>Auto-negotiation agrees speed and duplex between the two ends. If one end is hard-coded and the other is left on auto, the auto end cannot detect duplex and falls back to <b>half</b> — giving a link that is up, passes traffic, and is mysteriously slow with rising collisions and late collisions. Either hard-code <em>both</em> ends or leave <em>both</em> on auto.</p>
<p>In <code>show interfaces status</code> the "a-" prefix marks negotiated values, so <code>a-100 a-full</code> was agreed and <code>100 full</code> was configured.</p>
<h3>Cables</h3>
<p><b>Straight-through</b> joins unlike devices (PC or router to switch). <b>Crossover</b> joins like devices (switch to switch, PC to router). Modern gear runs <b>auto-MDIX</b> and fixes the wiring itself, which is why a wrong cable is now rarely the fault. Copper UTP runs to 100 m; fibre goes far further and is immune to electrical interference — multimode for buildings, single-mode for distance.</p>
<h3>Power over Ethernet</h3>
<p>PoE sends power and data down the same cable to phones, access points and cameras. <code>power inline auto</code> supplies power when a powered device is detected, <code>never</code> refuses. The switch has a total wattage budget; <code>show power inline</code> shows what is available, what is used and which class each device claims.</p>`,
  checks: [
    { desc: 'All three switch ports carry a description', fn: H => ['f0/1', 'f0/2', 'g0/1'].every(p => !!H.i('SW1', p).desc) },
    { desc: 'F0/1 has speed and duplex hard-coded', fn: H => H.i('SW1', 'f0/1').speed === '100' && H.i('SW1', 'f0/1').duplex === 'full' },
    { desc: 'The gigabit uplink is hard-coded at 1000/full', fn: H => H.i('SW1', 'g0/1').speed === '1000' && H.i('SW1', 'g0/1').duplex === 'full' },
    { desc: 'F0/2 was returned to auto-negotiation after being hard-coded', fn: H => H.i('SW1', 'f0/2').speed === 'auto' && H.i('SW1', 'f0/2').duplex === 'auto' },
    { desc: 'PoE refused on the two ports that never need it', fn: H => ['f0/1', 'f0/3'].every(p => H.i('SW1', p).poe === 'never') },
    { desc: 'PoE explicitly set to auto on the phone port', fn: H => H.i('SW1', 'f0/2').poe === 'auto' },
    { desc: 'SW1 sees R1 as a CDP neighbour', fn: H => ND.cdpNeighbors(H.topo, H.d('SW1')).some(n => n.dev.id === 'R1') },
    { desc: 'PC1 can reach its gateway', fn: H => H.ping('PC1', '10.0.0.1') },
    { desc: 'SW1 configuration saved', fn: H => H.saved('SW1') },
  ],
});

/* ============================================================= */
L({
  id: 'd03-models', ord: 3, vol: 1, day: 'Day 3', title: 'OSI & TCP/IP Models in Practice',
  topics: 'the layers as commands · encapsulation · MAC vs IP vs port · PDU names · troubleshooting bottom-up',
  devices: [
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.10', mask: '255.255.255.0', gw: '10.0.0.1' } },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.100', mask: '255.255.255.0', gw: '10.0.1.1' } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['SW1', 'g0/1', 'R1', 'g0/0'], ['R1', 'g0/1', 'SRV', 'e0']],
  layout: { PC1: [35, 60], SW1: [140, 60], R1: [245, 60], SRV: [350, 60] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.0.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.1.1', '255.255.255.0');
    topo.devs.R1.hostname = 'R1'; topo.devs.SW1.hostname = 'SW1';
  },
  intro: `<b>The situation:</b> the OSI model is usually taught as seven words to memorise. Here you are going to <em>see</em> each layer instead, by running the command that exposes it on a real path from a PC to a server.<br><b>Your goal:</b> walk up the stack one layer at a time — cable, MAC address, IP address, port number — and watch the same packet be described differently at each step. Then walk it back down, which is exactly the method you will use to troubleshoot for the rest of your career.`,
  tasks: [
    { t: 'LAYER 1 — check that there is a signal on every hop',
      do: [
        'On the <b>SW1</b> tab, enter privileged EXEC and display the interface status.',
        'Note which ports read <b>connected</b> and which read <b>notconnect</b>.',
      ],
      done: 'You can say which ports have something live on the far end.',
      why: 'Layer 1 is simply "is there a signal". Nothing above it can work if this is wrong, which is why troubleshooting always starts here.' },

    { t: 'Create some traffic so the layers above have something to work with',
      do: [
        'Switch to the <b>PC1</b> tab, run <code>ipconfig</code>, then ping its gateway <b>10.0.0.1</b>.',
      ],
      done: 'The ping succeeds.',
      why: 'That single ping exercises the PC\'s IP address (layer 3), its MAC address (layer 2) and the cable (layer 1) all at once.' },

    { t: 'LAYER 2 — see what MAC addresses the switch has learned',
      do: [
        'Back on <b>SW1</b>, display the MAC address table.',
        'Then display the full detail of interface <b>F0/1</b> and find the burned-in MAC address.',
      ],
      done: 'You can match a table entry to the interface it was learned on.',
      why: 'A switch reads the SOURCE MAC of every arriving frame and records it against the port. It never looks at an IP address — that is precisely what makes it a layer-2 device.' },

    { t: 'LAYER 3 — read the addresses and the map between networks',
      do: [
        'Switch to the <b>R1</b> tab, enter privileged EXEC and turn off the pager.',
        'Display the brief interface summary and the routing table.',
        'Then display the ARP table.',
      ],
      done: 'You can name the two connected networks and find an ARP entry linking an IP to a MAC.',
      why: 'The routing table is the layer-3 map. The ARP table is the bridge between layers 2 and 3 — "this IP address lives behind this MAC address" — and every layer-3 device keeps one.' },

    { t: 'LAYER 4 — write a rule that reads port numbers',
      do: [
        'In configuration mode on <b>R1</b>, create a named extended access list called <b>LAYER4-DEMO</b>.',
        'Permit <b>tcp any any eq 80</b>, then <b>tcp any any eq 443</b>, then <b>udp any any eq 53</b>, then <b>icmp any any</b>, and finally <b>deny ip any any</b>.',
        'Display the access lists and read your five entries.',
      ],
      done: 'The list exists with port matches for 80, 443 and 53.',
      why: 'Ports 80, 443 and 53 identify HTTP, HTTPS and DNS. The router can only read them because layer 4 sits inside the layer-3 packet — an extended ACL is layer-4 inspection.' },

    { t: 'Apply the layer-4 rule and see all four layers judge one packet',
      do: [
        'Enter interface <b>G0/1</b> and apply <b>LAYER4-DEMO</b> in the <b>out</b> direction.',
        'Confirm with the layer-3 interface view.',
      ],
      done: 'G0/1 reports the outgoing access list.',
      why: 'The same packet is now judged on four layers at once: the port it arrived on, the MAC rewrite, the destination IP, and the TCP or UDP port inside.' },

    { t: 'Send one packet through the whole stack',
      do: [
        'Switch to the <b>PC1</b> tab and ping <b>10.0.1.100</b> (the server).',
        'Then trace the route to the same address.',
      ],
      done: 'The ping succeeds and the trace shows the router, then the server.',
      why: 'Only two entries appear in the trace, because layer-2 switches are invisible to layer 3 — they never open the IP header at all.' },

    { t: 'Look at the layer-2 half of that conversation',
      do: [
        'Still on <b>PC1</b>, run <code>arp -a</code>.',
        'Check whether there is an entry for the server\'s address.',
      ],
      done: 'The cache holds the gateway, not the server.',
      why: 'A host ARPs for its next hop, never for a destination in another network. If you remember one thing from the whole models chapter, make it this.' },

    { t: 'Break layer 1 on purpose and watch everything above it fail',
      do: [
        'On <b>R1</b>, enter interface <b>G0/1</b> and disable it.',
        'Display the brief interface summary and the routing table, and note that the connected route has vanished.',
        'Then switch to <b>PC1</b> and ping <b>10.0.1.100</b> again — it should fail.',
      ],
      done: 'The route is gone and the ping fails.',
      why: 'One layer-1 fault produces total failure at every layer above. That dependency is the entire argument for troubleshooting from the bottom up.' },

    { t: 'Repair layer 1 and watch the stack come back',
      do: [
        'On <b>R1</b>, enable interface <b>G0/1</b> again.',
        'Check the routing table — the connected route reappears instantly.',
        'Ping once more from <b>PC1</b> to confirm.',
      ],
      done: 'The route is back and the ping succeeds.',
      why: 'Layer 3 depends on layer 2 depends on layer 1, never the other way round. Fixed at the bottom, working at the top.' },
  ],
  steps: [
    { d: 'SW1', t: 'LAYER 1 — is there a signal on each port?', c: ['enable', 'terminal length 0', 'show interfaces status'], note: '"connected" means layer 1 and 2 are both fine. "notconnect" means nothing is detected on the wire — a cable, a dead far end, or a shut port at the other side.' },
    { d: 'PC1', t: 'Generate traffic so the switch has something to learn from.', c: ['ipconfig', 'ping 10.0.0.1'], note: 'The PC is layer 3 (its own IP) sitting on layer 2 (its MAC) sitting on layer 1 (the cable). One ping uses all three.' },
    { d: 'SW1', t: 'LAYER 2 — what MAC addresses has the switch learned?', c: ['show mac address-table'], note: 'The switch learns a SOURCE MAC and the port it arrived on. It never looks at IP addresses — that is what makes it a layer-2 device.' },
    { d: 'SW1', t: 'Where do those MAC addresses come from?', c: ['show interfaces f0/1'], note: 'Every interface has a burned-in MAC address. The one in the table belongs to PC1\'s network card; the other is R1\'s router interface.' },
    { d: 'R1', t: 'LAYER 3 — the addresses and the map between networks.', c: ['enable', 'terminal length 0', 'show ip interface brief', 'show ip route'], note: 'Two connected networks: 10.0.0.0/24 and 10.0.1.0/24. The routing table is the layer-3 map, and "C" means directly connected.' },
    { d: 'R1', t: 'Layer 2 and layer 3 side by side on one router.', c: ['show ip arp'], note: 'The ARP table is the bridge between the two layers: "this IP address lives behind this MAC address". Every layer-3 device keeps one.' },
    { d: 'R1', t: 'LAYER 4 — write a rule that reads port numbers.', c: ['configure terminal', 'ip access-list extended LAYER4-DEMO', 'permit tcp any any eq 80', 'permit tcp any any eq 443', 'permit udp any any eq 53', 'permit icmp any any', 'deny ip any any', 'exit', 'do show access-lists'], note: 'Ports 80, 443 and 53 identify HTTP, HTTPS and DNS. The router can only read them because layer 4 sits inside the layer-3 packet — an extended ACL is layer-4 inspection.' },
    { d: 'R1', t: 'Apply it and see layer 4 filtering in action.', c: ['interface g0/1', 'ip access-group LAYER4-DEMO out', 'end', 'show ip interface g0/1'], note: 'The same packet is now judged on four layers at once: arriving port (1), MAC rewrite (2), destination IP (3) and TCP/UDP port (4).' },
    { d: 'PC1', t: 'Send one packet through all of it.', c: ['ping 10.0.1.100', 'tracert 10.0.1.100'], note: 'The trace shows the layer-3 hops: R1, then the server. Only two entries — because layer 2 switches are invisible to layer 3.' },
    { d: 'PC1', t: 'Look at the layer-2 half of that conversation.', c: ['arp -a'], note: 'The PC has ARPed for its GATEWAY, not the server. A host ARPs for the next hop, never for a destination in another network. This is the single most important idea in the whole model.' },
    { d: 'R1', t: 'Now break layer 1 deliberately.', c: ['configure terminal', 'interface g0/1', 'shutdown', 'end', 'show ip interface brief', 'show ip route'], note: 'Watch the cascade: the interface goes down (1), no frames can be sent (2), the connected route vanishes from the table (3), and no application can work (4-7).' },
    { d: 'PC1', t: 'Confirm everything above it failed.', c: ['ping 10.0.1.100'], note: 'One layer-1 fault, total failure. This is why you always troubleshoot from the bottom up rather than guessing at the application.' },
    { d: 'R1', t: 'Repair layer 1 and watch the stack come back.', c: ['configure terminal', 'interface g0/1', 'no shutdown', 'end', 'show ip route'], note: 'The connected route reappears the instant the interface comes up. Layer 3 depends on layer 2 depends on layer 1 — never the other way round.' },
    { d: 'PC1', t: 'Final confirmation from the top.', c: ['ping 10.0.1.100'], note: 'Fixed at the bottom, works at the top.' },
  ],
  verify: ['show interfaces status', 'show mac address-table', 'show ip interface brief', 'show ip route', 'show ip arp', 'show access-lists'],
  explain: `<h3>The two models side by side</h3>
<p><b>OSI</b> has seven layers: Physical, Data Link, Network, Transport, Session, Presentation, Application. <b>TCP/IP</b> collapses them into four: Network Access (OSI 1-2), Internet (OSI 3), Transport (OSI 4) and Application (OSI 5-7). CCNA questions use both, so know the mapping.</p>
<h3>What lives where</h3>
<ul>
<li><b>1 Physical</b> — cables, connectors, signals. Command: <code>show interfaces status</code>, the Status column.</li>
<li><b>2 Data Link</b> — MAC addresses, frames, switches. Commands: <code>show mac address-table</code>, <code>show interfaces</code>.</li>
<li><b>3 Network</b> — IP addresses, packets, routers. Commands: <code>show ip interface brief</code>, <code>show ip route</code>, <code>show ip arp</code>.</li>
<li><b>4 Transport</b> — TCP and UDP port numbers, segments. Command: an extended ACL matching <code>eq 80</code> is you reading layer 4.</li>
<li><b>5-7</b> — the application itself: HTTP, DNS, SSH.</li>
</ul>
<h3>Encapsulation and the PDU names</h3>
<p>Data is wrapped on the way down and unwrapped on the way up. The name changes at each layer: <b>data</b> (7-5) → <b>segment</b> (4) → <b>packet</b> (3) → <b>frame</b> (2) → <b>bits</b> (1). Exam questions love asking which term applies at which layer.</p>
<h3>The rule that explains most confusion</h3>
<p><b>IP addresses stay the same end to end. MAC addresses are rewritten at every hop.</b> A host ARPs for its default gateway, not for the far-away destination — which is exactly what <code>arp -a</code> showed you above. Every router along the path strips the old frame, looks up the destination IP, and builds a brand-new frame for the next hop.</p>`,
  checks: [
    { desc: 'SW1 learned MAC addresses on its ports', fn: H => H.d('SW1').macTable.length > 0 },
    { desc: 'R1 built an ARP entry for a neighbour', fn: H => H.d('R1').arpTable.length > 0 },
    { desc: 'The layer-4 access list exists with port matches', fn: H => { const a = H.d('R1').acls['LAYER4-DEMO']; return !!a && a.entries.some(e => e.dstPort === 80) && a.entries.some(e => e.dstPort === 443); } },
    { desc: 'The list is applied outbound on G0/1', fn: H => H.i('R1', 'g0/1').aclOut === 'LAYER4-DEMO' },
    { desc: 'G0/1 was shut and brought back up', fn: H => H.noshut('R1', 'g0/1') && H.up('R1', 'g0/1') },
    { desc: 'PC1 reaches the server through every layer', fn: H => H.ping('PC1', '10.0.1.100') },
  ],
});

/* ============================================================= */
L({
  id: 'd07-ipv4-addressing', ord: 7, vol: 1, day: 'Day 7', title: 'IPv4 Addressing',
  topics: 'address classes · private ranges · masks in both notations · network and broadcast addresses · usable host ranges · loopbacks',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0', 'lo1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '172.16.1.10', mask: '255.255.255.0', gw: '172.16.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.50.10', mask: '255.255.255.0', gw: '192.168.50.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0'], ['R2', 'g0/1', 'PC2', 'e0']],
  layout: { PC1: [35, 60], R1: [145, 60], R2: [255, 60], PC2: [360, 60] },
  intro: `<b>The situation:</b> four blank interfaces and a handful of addresses that have to be typed exactly right.<br><b>Your goal:</b> get fluent with IPv4 addressing itself — the classes, the private ranges everyone uses, masks written both ways, and the two addresses in every subnet you are <em>not</em> allowed to give to a host. You will configure a 10-network, a 172.16 network, a 192.168 network and a /30 link, which between them cover every private range in the exam.`,
  tasks: [
    { t: 'On R1, address the class B private LAN with a /24',
      do: [
        'On the <b>R1</b> tab, enter configuration mode and set the hostname to <b>R1</b>.',
        'Enter interface <b>G0/0</b>, describe it as <b>LAN-172</b>, give it <b>172.16.1.1</b> mask <b>255.255.255.0</b> and enable it.',
      ],
      done: 'G0/0 is up with 172.16.1.1/24.',
      why: '172.16.0.0 to 172.31.255.255 is the class B private block. Using a /24 inside it is completely normal — the class stopped dictating the mask decades ago.' },

    { t: 'Address the router-to-router link with a /30',
      do: [
        'Enter interface <b>G0/1</b>, describe it as <b>WAN-TO-R2</b>, and give it <b>10.0.12.1</b> mask <b>255.255.255.252</b>.',
        'Enable it, then display the brief interface summary.',
      ],
      done: 'G0/1 is up with a /30 address.',
      why: '255.255.255.252 is a /30: four addresses in total, two of them usable. On a link with exactly two routers, anything larger is wasted space.' },

    { t: 'Create a /32 identity loopback and a class A private loopback',
      do: [
        'Create interface <b>Loopback 0</b> with <b>1.1.1.1</b> mask <b>255.255.255.255</b>.',
        'Create interface <b>Loopback 1</b> with <b>10.255.255.1</b> mask <b>255.255.255.0</b>.',
        'Check the interface summary — neither needed enabling.',
      ],
      done: 'Both loopbacks show as up/up.',
      why: 'A /32 is a single host address and the convention for a router ID. 10.0.0.0/8 is the class A private range, the largest of the three. Loopbacks never go down because there is no cable to unplug.' },

    { t: 'Read back the network and broadcast addresses IOS calculated',
      do: [
        'Leave configuration mode and display the layer-3 detail for <b>G0/0</b>, then for <b>G0/1</b>.',
        'Find the broadcast address line in each and check it against your own arithmetic.',
      ],
      done: 'You can state the network address, broadcast address and usable range of both interfaces.',
      why: 'IOS does the subnet arithmetic for you here, which makes it a free self-test every time you configure an interface.' },

    { t: 'On R2, address the /30 link and the class C private LAN',
      do: [
        'Switch to the <b>R2</b> tab, enter configuration mode and set the hostname to <b>R2</b>.',
        'On <b>G0/0</b>: description <b>WAN-TO-R1</b>, address <b>10.0.12.2</b> mask <b>255.255.255.252</b>, enabled.',
        'On <b>G0/1</b>: description <b>LAN-192</b>, address <b>192.168.50.1</b> mask <b>255.255.255.0</b>, enabled.',
      ],
      done: 'Both R2 interfaces are up with the right addresses.',
      why: '192.168.0.0 to 192.168.255.255 is the class C private block — the one every home router uses. Both ends of the /30 now sit in the same four-address subnet.' },

    { t: 'Try to assign a network address and watch IOS refuse',
      do: [
        'On <b>R2</b>, enter interface <b>G0/1</b> and try to set the address to <b>192.168.50.0</b> with mask <b>255.255.255.0</b>.',
        'Read the error. This failure is deliberate.',
      ],
      done: 'IOS rejects the address.',
      why: '.0 with a /24 mask is the network ID, not a host address — and the same happens with .255, the broadcast. Meeting that error on purpose beats meeting it under exam pressure.' },

    { t: 'Restore the correct gateway address',
      do: [
        'Set <b>G0/1</b> back to <b>192.168.50.1</b> mask <b>255.255.255.0</b> and confirm with the interface summary.',
      ],
      done: 'The interface holds the first usable address of the subnet.',
      why: 'The first usable address is the conventional home for a gateway, and it is what the PCs in this lab are configured to use.' },

    { t: 'Test the link before adding any routes',
      do: [
        'From <b>R1</b>, ping <b>10.0.12.2</b>.',
      ],
      done: 'The two routers reach each other.',
      why: 'Directly connected networks need no routes at all. Proving the link works first means any later failure is a routing problem, not an addressing one.' },

    { t: 'Add a route on R1 to the far LAN',
      do: [
        'On <b>R1</b>, create a static route for <b>192.168.50.0</b> mask <b>255.255.255.0</b> via <b>10.0.12.2</b>.',
        'Display the routing table and read the codes column.',
      ],
      done: 'An S route to 192.168.50.0/24 appears.',
      why: 'C is connected, L is the local /32 for the interface\'s own address, and S is your static route. Being able to read that column instantly is worth real marks.' },

    { t: 'Add the matching return route on R2',
      do: [
        'On <b>R2</b>, create a static route for <b>172.16.1.0</b> mask <b>255.255.255.0</b> via <b>10.0.12.1</b>.',
        'Display the routing table to confirm.',
      ],
      done: 'Each router has a route to the other\'s LAN.',
      why: 'A ping needs a path there and a path back, and the two halves are configured separately on separate devices.' },

    { t: 'Test end to end from both hosts',
      do: [
        'On the <b>PC1</b> tab, run <code>ipconfig</code>, ping <b>172.16.1.1</b>, then ping <b>192.168.50.10</b>.',
        'On the <b>PC2</b> tab, ping <b>172.16.1.10</b>.',
      ],
      done: 'Both hosts reach each other across the /30.',
      why: 'Three private ranges in one working network — exactly the mixture you meet in real companies that grew by acquisition.' },

    { t: 'Prove the loopbacks are reachable, then save',
      do: [
        'From <b>R1</b>, ping <b>1.1.1.1</b> and <b>10.255.255.1</b>.',
        'Save the configuration.',
      ],
      done: 'Both loopbacks answer and the configuration is saved.',
      why: 'Loopbacks are always up, which is exactly why they are used as router IDs and management addresses — a physical port can fail, a loopback cannot.' },
  ],
  steps: [
    { d: 'R1', t: 'Name the router and address the class B private LAN.', c: ['enable', 'configure terminal', 'hostname R1', 'interface g0/0', 'description LAN-172', 'ip address 172.16.1.1 255.255.255.0', 'no shutdown', 'exit'], note: '172.16.1.1/24. The subnet runs 172.16.1.0 (network) to 172.16.1.255 (broadcast), so usable hosts are .1 to .254.' },
    { d: 'R1', t: 'Address the point-to-point link with a /30.', c: ['interface g0/1', 'description WAN-TO-R2', 'ip address 10.0.12.1 255.255.255.252', 'no shutdown', 'exit', 'do show ip interface brief'], note: '255.255.255.252 is a /30: four addresses total, two usable. 10.0.12.0 is the network, .1 and .2 are the hosts, .3 is the broadcast.' },
    { d: 'R1', t: 'Create a /32 identity loopback and a class A private loopback.', c: ['interface loopback 0', 'ip address 1.1.1.1 255.255.255.255', 'exit', 'interface loopback 1', 'ip address 10.255.255.1 255.255.255.0', 'exit', 'do show ip interface brief'], note: 'A /32 is a "host route" — one single address, the convention for router IDs. 10.0.0.0/8 is the class A private range, the biggest of the three.' },
    { d: 'R1', t: 'Read the network and broadcast addresses IOS calculated for you.', c: ['end', 'show ip interface g0/0', 'show ip interface g0/1'], note: 'The broadcast address line is IOS doing the subnet arithmetic. Check yours against it — that is a free self-test every time you configure an interface.' },
    { d: 'R2', t: 'Second router: the /30 link and the class C private LAN.', c: ['enable', 'configure terminal', 'hostname R2', 'interface g0/0', 'description WAN-TO-R1', 'ip address 10.0.12.2 255.255.255.252', 'no shutdown', 'exit', 'interface g0/1', 'description LAN-192', 'ip address 192.168.50.1 255.255.255.0', 'no shutdown', 'exit', 'do show ip interface brief'], note: 'Both ends of the /30 are in the same four-address block. 192.168.50.0/24 is the class C private LAN behind R2.' },
    { d: 'R2', t: 'Try to give an interface a network address and watch IOS refuse.', c: ['interface g0/1', 'ip address 192.168.50.0 255.255.255.0', 'exit'], expectErr: true, note: 'IOS rejects it: .0 with a /24 mask is the network ID, not a host. The same happens with .255, the broadcast address.' },
    { d: 'R2', t: 'Put the correct address back and confirm.', c: ['interface g0/1', 'ip address 192.168.50.1 255.255.255.0', 'end', 'show ip interface brief'], note: 'A first usable address is the conventional home for the gateway, and it is what the PCs are configured to use.' },
    { d: 'R1', t: 'Test the link itself before routing anything.', c: ['ping 10.0.12.2'], note: 'Both ends of the /30 can reach each other. Directly-connected networks need no routes at all.' },
    { d: 'R1', t: 'Add the route to the far LAN.', c: ['configure terminal', 'ip route 192.168.50.0 255.255.255.0 10.0.12.2', 'end', 'show ip route'], note: 'Read the codes column: C is connected, L is a local /32 for the interface\'s own address, S is your static route.' },
    { d: 'R2', t: 'Add the matching return route.', c: ['configure terminal', 'ip route 172.16.1.0 255.255.255.0 10.0.12.1', 'end', 'show ip route'], note: 'Both directions. A ping needs a path there and a path back, and the two are configured separately.' },
    { d: 'PC1', t: 'Test from a host in the 172.16 network.', c: ['ipconfig', 'ping 172.16.1.1', 'ping 192.168.50.10'], note: 'Gateway first, then across to the class C network. Three private ranges, one working network.' },
    { d: 'PC2', t: 'And from the other end.', c: ['ipconfig', 'ping 172.16.1.10'], note: 'Both directions confirmed.' },
    { d: 'R1', t: 'Prove the loopbacks are reachable from the router itself, then save.', c: ['ping 1.1.1.1', 'ping 10.255.255.1', 'write memory'], note: 'Loopbacks are always up because there is no cable to unplug. That is exactly why they are used as router IDs and management addresses.' },
  ],
  verify: ['show ip interface brief', 'show ip interface g0/0', 'show ip route', 'show running-config'],
  explain: `<h3>The classes, and why they barely matter now</h3>
<p>Historically: <b>A</b> = 1-126 (first octet), <b>B</b> = 128-191, <b>C</b> = 192-223, <b>D</b> = 224-239 (multicast), <b>E</b> = 240-255 (experimental). 127 is reserved for loopback. Classful addressing is obsolete — today the mask decides everything and can be any length — but the exam still expects you to recognise the ranges, and multicast and loopback are very much alive.</p>
<h3>The private ranges (RFC 1918) — memorise these</h3>
<ul>
<li><b>10.0.0.0/8</b> — 10.0.0.0 to 10.255.255.255</li>
<li><b>172.16.0.0/12</b> — 172.16.0.0 to 172.31.255.255 (note: <em>not</em> 172.32)</li>
<li><b>192.168.0.0/16</b> — 192.168.0.0 to 192.168.255.255</li>
</ul>
<p>Also worth knowing: <b>169.254.0.0/16</b> is APIPA, the address a host gives itself when DHCP fails. Seeing a 169.254 address in <code>ipconfig</code> means "I never got a lease".</p>
<h3>The two addresses you can never assign</h3>
<p>In every subnet the <b>first</b> address is the network ID and the <b>last</b> is the broadcast. With 192.168.50.0/24 that is .0 and .255, leaving .1 to .254 for hosts — 254 of them. The formula is 2^h − 2 where h is the number of host bits. A /30 has 2 host bits: 2² − 2 = 2 usable, which is why it is the standard for point-to-point links. A /31 (2 addresses, no usable hosts by the old rule) is permitted on point-to-point links by RFC 3021, and a /32 is a single host route.</p>
<h3>Masks in both notations</h3>
<p>/24 = 255.255.255.0, /25 = 255.255.255.128, /26 = 255.255.255.192, /27 = 255.255.255.224, /28 = 255.255.255.240, /29 = 255.255.255.248, /30 = 255.255.255.252. IOS wants the dotted form on an interface and the dotted form in <code>ip route</code>, but shows you prefix lengths in <code>show ip route</code>. Be fluent in both directions.</p>`,
  checks: [
    { desc: 'R1 G0/0 addressed in the class B private range with a /24', fn: H => H.hasIp('R1', 'g0/0', '172.16.1.1', '255.255.255.0') },
    { desc: 'The router link uses a /30 on both ends', fn: H => H.hasIp('R1', 'g0/1', '10.0.12.1', '255.255.255.252') && H.hasIp('R2', 'g0/0', '10.0.12.2', '255.255.255.252') },
    { desc: 'R2 G0/1 addressed in the class C private range', fn: H => H.hasIp('R2', 'g0/1', '192.168.50.1', '255.255.255.0') },
    { desc: 'R1 has a /32 identity loopback and a class A private loopback', fn: H => H.hasIp('R1', 'lo0', '1.1.1.1', '255.255.255.255') && H.hasIp('R1', 'lo1', '10.255.255.1', '255.255.255.0') },
    { desc: 'Both routers have a route to the other LAN', fn: H => H.d('R1').staticRoutes.some(r => r.net === '192.168.50.0') && H.d('R2').staticRoutes.some(r => r.net === '172.16.1.0') },
    { desc: 'The two routers can reach each other across the /30', fn: H => H.ping('R1', '10.0.12.2') },
    { desc: 'Hosts in the two private ranges can reach each other', fn: H => H.ping('PC1', '192.168.50.10') && H.ping('PC2', '172.16.1.10') },
    { desc: 'R1 saved', fn: H => H.saved('R1') },
  ],
});

/* ============================================================= */
L({
  id: 'd10-life-of-packet', ord: 10, vol: 1, day: 'Day 10', title: 'The Life of a Packet & ARP',
  topics: 'ARP request and reply · the ARP cache · MAC rewriting at every hop · default gateway behaviour · clearing the caches',
  devices: [
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.20', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.2.100', mask: '255.255.255.0', gw: '10.0.2.1' } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2'], ['SW1', 'g0/1', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0'], ['R2', 'g0/1', 'SRV', 'e0']],
  layout: { PC1: [30, 25], PC2: [30, 100], SW1: [120, 62], R1: [210, 62], R2: [295, 62], SRV: [380, 62] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    const M24 = '255.255.255.0', M30 = '255.255.255.252';
    set('R1', 'g0/0', '10.0.1.1', M24); set('R1', 'g0/1', '10.0.12.1', M30);
    set('R2', 'g0/0', '10.0.12.2', M30); set('R2', 'g0/1', '10.0.2.1', M24);
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.SW1.hostname = 'SW1';
    topo.devs.R1.staticRoutes.push({ net: '10.0.2.0', mask: M24, via: '10.0.12.2', ad: 1 });
    topo.devs.R2.staticRoutes.push({ net: '10.0.1.0', mask: M24, via: '10.0.12.1', ad: 1 });
  },
  intro: `<b>The situation:</b> a fully working network — two LANs, two routers, a switch and three hosts. Nothing is broken.<br><b>Your goal:</b> follow one packet from PC1 to the server and understand exactly what happens at every step. You will empty the ARP caches and the MAC table, send a single ping, and then look at what each device learned. This is the lab that makes "IP addresses stay the same, MAC addresses change at every hop" stop being a slogan and start being something you have watched happen.`,
  tasks: [
    { t: 'Empty the switch\'s MAC address table',
      do: [
        'On the <b>SW1</b> tab, enter privileged EXEC and turn off the pager.',
        'Clear the dynamically learned MAC addresses (the command needs the keyword <b>dynamic</b>).',
        'Display the table and confirm it is empty.',
      ],
      done: 'The MAC table shows no dynamic entries.',
      why: 'Starting from empty means everything you see afterwards was learned from traffic YOU sent — otherwise you are reading somebody else\'s history.' },

    { t: 'Empty the ARP caches on both routers',
      do: [
        'On the <b>R1</b> tab, enter privileged EXEC and clear the ARP cache, then display it.',
        'Do exactly the same on the <b>R2</b> tab.',
      ],
      done: 'Only each router\'s own interface addresses remain, marked with a dash for age.',
      why: 'Those dashes mean the entry is local rather than learned. Everything that appears from here on is a direct result of your traffic.' },

    { t: 'STEP 1 — ping inside the same subnet and see who gets ARPed for',
      do: [
        'Switch to the <b>PC1</b> tab, run <code>ipconfig</code>, then ping <b>10.0.1.20</b> (PC2, same subnet).',
        'Then run <code>arp -a</code> on PC1 and look at what is cached.',
      ],
      done: 'The ping succeeds and PC1\'s ARP cache holds PC2\'s address.',
      why: 'PC1 compares the destination with its own address and mask, decides it is local, and ARPs for PC2 directly. No router is involved at any point.' },

    { t: 'See what the switch learned from that exchange',
      do: [
        'Back on <b>SW1</b>, display the MAC address table.',
        'Match the two entries to the two ports.',
      ],
      done: 'Two entries appear, one on Fa0/1 and one on Fa0/2.',
      why: 'The switch learned both addresses by reading the SOURCE address of arriving frames. From now on it forwards to one port instead of flooding.' },

    { t: 'STEP 2 — ping a host in a DIFFERENT subnet',
      do: [
        'Still on <b>PC1</b>, ping <b>10.0.2.100</b> (the server, two routers away).',
        'Then run <code>arp -a</code> again and look carefully at what is — and is not — in the cache.',
      ],
      done: 'The ping succeeds, but there is no ARP entry for 10.0.2.100.',
      why: 'This is the key moment of the whole lab. The destination fails PC1\'s local test, so the frame is addressed to the GATEWAY while the packet inside still carries the server\'s IP. A host never ARPs for a remote address.' },

    { t: 'Watch the first router repeat exactly the same logic',
      do: [
        'On <b>R1</b>, display the routing table, then the ARP table.',
        'Note which address R1 has ARPed for.',
      ],
      done: 'R1 has an ARP entry for 10.0.12.2, the next hop — not for the server.',
      why: 'R1 looks up the destination, finds the next hop, and ARPs for THAT. It then builds a brand-new frame with its own MAC as source and R2\'s as destination.' },

    { t: 'Watch the last router do it once more',
      do: [
        'On <b>R2</b>, display the ARP table.',
        'Note that this time R2 has ARPed for the server itself.',
      ],
      done: 'R2 holds an ARP entry for an address in 10.0.2.x.',
      why: 'R2 is directly connected to the server\'s network, so on this final hop the destination IP and destination MAC finally belong to the same device again.' },

    { t: 'Count the layer-3 hops on the path',
      do: [
        'On <b>PC1</b>, run <code>tracert 10.0.2.100</code>.',
        'Count the entries and compare them with the diagram.',
      ],
      done: 'The trace shows R1, R2 and then the server — the switch never appears.',
      why: 'Traceroute finds devices that decrement TTL. A layer-2 switch never opens the IP header, so it is invisible — which tells you something true about what switches actually do.' },

    { t: 'Check the switch\'s view of that same conversation',
      do: [
        'On <b>SW1</b>, display the MAC address table again.',
        'Notice that the switch learned R1\'s MAC on its uplink.',
      ],
      done: 'An entry for the uplink port is present.',
      why: 'To SW1 that exchange was just another frame between two MAC addresses. It has no idea a server in another subnet was ever involved.' },

    { t: 'Prove ARP entries are dynamic by clearing and rebuilding one',
      do: [
        'On <b>R1</b>, clear the ARP cache and display it — the learned entries are gone.',
        'Switch to <b>PC1</b> and ping <b>10.0.2.100</b> again.',
        'Return to <b>R1</b> and display the ARP table once more.',
      ],
      done: 'The learned entry reappears with no configuration from you.',
      why: 'ARP is entirely automatic, with a four-hour age-out on IOS. It also explains why the very first ping of a session sometimes times out on real gear while the rest succeed.' },
  ],
  steps: [
    { d: 'SW1', t: 'Empty the switch\'s memory of who is where.', c: ['enable', 'terminal length 0', 'clear mac address-table dynamic', 'show mac address-table'], note: 'The table is now empty. Note the command needs the word "dynamic" — static entries are never cleared this way.' },
    { d: 'R1', t: 'Empty R1\'s ARP cache too.', c: ['enable', 'terminal length 0', 'clear arp-cache', 'show ip arp'], note: 'Only R1\'s own interface addresses remain, marked with "-" for age because they are not learned, they are local.' },
    { d: 'R2', t: 'And R2\'s.', c: ['enable', 'terminal length 0', 'clear arp-cache', 'show ip arp'], note: 'Every cache in the path is now empty. Anything that appears from here on, your traffic caused.' },
    { d: 'PC1', t: 'STEP 1 — a ping inside the same subnet.', c: ['ipconfig', 'ping 10.0.1.20'], note: 'PC1 compares 10.0.1.20 with its own address and mask, decides it is local, and ARPs for PC2 directly. No router involved at all.' },
    { d: 'PC1', t: 'Confirm who PC1 ARPed for.', c: ['arp -a'], note: 'The cache holds PC2\'s address and MAC. Same subnet, so the destination IP and the destination MAC belong to the same machine.' },
    { d: 'SW1', t: 'See what the switch learned from that exchange.', c: ['show mac address-table'], note: 'Two entries on two ports — PC1 on Fa0/1 and PC2 on Fa0/2. The switch learned both by reading source addresses, and now forwards rather than floods.' },
    { d: 'PC1', t: 'STEP 2 — now ping something in a DIFFERENT subnet.', c: ['ping 10.0.2.100'], note: '10.0.2.100 fails PC1\'s local test, so the packet goes to the default gateway instead. The destination IP is still the server\'s — only the frame is addressed locally.' },
    { d: 'PC1', t: 'Look at what PC1 ARPed for this time.', c: ['arp -a'], note: 'There is NO entry for 10.0.2.100 — only the gateway, 10.0.1.1. A host never ARPs for a remote address. If you remember one thing from this lab, make it this.' },
    { d: 'R1', t: 'The first router repeats the same logic.', c: ['show ip route', 'show ip arp'], note: 'R1 looks up 10.0.2.0/24, finds next hop 10.0.12.2, and ARPs for that. It builds a brand-new frame: its own MAC as source, R2\'s as destination.' },
    { d: 'R2', t: 'And the last router does it once more.', c: ['show ip arp'], note: 'R2 knows 10.0.2.0/24 is directly connected, so this time it ARPs for the server itself. Last hop, so destination IP and destination MAC finally belong to the same device again.' },
    { d: 'PC1', t: 'Count the layer-3 hops on the path.', c: ['tracert 10.0.2.100'], note: 'Two entries: R1 and R2, then the server. SW1 never appears — switches do not decrement TTL, because they never look at the IP header at all.' },
    { d: 'SW1', t: 'Check the switch\'s view of that same conversation.', c: ['show mac address-table'], note: 'The switch learned R1\'s MAC on its uplink. To SW1 this was just another frame between two MAC addresses; it has no idea a server in another subnet was involved.' },
    { d: 'R1', t: 'Clear one ARP cache and prove the entries are dynamic.', c: ['clear arp-cache', 'show ip arp'], note: 'The learned entries are gone; only local addresses remain. Real IOS ages entries out after four hours of silence.' },
    { d: 'PC1', t: 'Send traffic again to repopulate it.', c: ['ping 10.0.2.100'], note: 'The first packet triggers a fresh ARP request, which is why the very first ping of a session sometimes times out on real gear while the rest succeed.' },
    { d: 'R1', t: 'Confirm the cache rebuilt itself.', c: ['show ip arp', 'show ip route'], note: 'Learned again, with no configuration from you. ARP is entirely automatic — you only ever look at it while troubleshooting.' },
  ],
  verify: ['show mac address-table', 'show ip arp', 'show ip route', 'show interfaces status'],
  explain: `<h3>The decision every host makes</h3>
<p>Before sending anything, a host compares the destination address with its own address and subnet mask.</p>
<ul>
<li><b>Same subnet</b> → ARP for the destination itself and send the frame straight to it.</li>
<li><b>Different subnet</b> → ARP for the <em>default gateway</em> and send the frame there, with the destination IP still set to the far-away host.</li>
</ul>
<p>That is why <code>arp -a</code> on PC1 showed the gateway and never the server. A host with no default gateway can reach its own subnet perfectly and nothing else — a very common real-world symptom.</p>
<h3>What changes at every hop, and what does not</h3>
<p><b>Unchanged end to end:</b> source IP, destination IP, the data itself. <b>Rewritten at every hop:</b> source MAC, destination MAC, and the frame check sequence. Each router strips the incoming frame, decrements TTL in the packet, looks up the destination, ARPs for the next hop if needed, and builds a brand-new frame.</p>
<h3>ARP itself</h3>
<p>An ARP <b>request</b> is a broadcast: "who has 10.0.1.1? Tell 10.0.1.10." Every device in the broadcast domain receives it; only the owner answers, with a <b>reply</b> sent as a unicast. The answer is cached for four hours by default. <code>show ip arp</code> on IOS, <code>arp -a</code> on a PC, <code>clear arp-cache</code> to empty it.</p>
<p>Because ARP replies are trusted blindly, an attacker can answer on someone else's behalf — ARP poisoning. That is the attack Dynamic ARP Inspection exists to stop, later in Volume 2.</p>
<h3>Why the switch is invisible to traceroute</h3>
<p>Traceroute works by sending packets with increasing TTL values and listening for the routers that discard them. A layer-2 switch never opens the IP header, never touches TTL, and therefore never appears. If a device shows up in a trace, it made a layer-3 decision.</p>`,
  checks: [
    { desc: 'PC1 reaches a host in its own subnet', fn: H => H.ping('PC1', '10.0.1.20') },
    { desc: 'PC1 reaches the server in the remote subnet', fn: H => H.ping('PC1', '10.0.2.100') },
    { desc: 'PC1 cached its default gateway, not the remote server', fn: H => H.d('PC1').arpTable.some(e => e.ip === '10.0.1.1') && !H.d('PC1').arpTable.some(e => e.ip === '10.0.2.100') },
    { desc: 'SW1 learned MAC addresses on more than one port', fn: H => new Set(H.d('SW1').macTable.map(e => e.port)).size > 1 },
    { desc: 'R1 cached the next hop across the WAN link', fn: H => H.d('R1').arpTable.some(e => e.ip === '10.0.12.2') },
    { desc: 'R2 cached an address on its server LAN', fn: H => H.d('R2').arpTable.some(e => e.ip.startsWith('10.0.2.')) },
  ],
});

/* ============================================================= */
L({
  id: 'd12-subnetting', ord: 12, vol: 1, day: 'Days 12-15', title: 'Subnetting & VLSM',
  topics: 'splitting a /24 · prefix lengths · usable ranges · VLSM · /30 links · reading show ip route as proof',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.10.10', mask: '255.255.255.192', gw: '192.168.10.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.10.70', mask: '255.255.255.224', gw: '192.168.10.65' } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '192.168.10.100', mask: '255.255.255.240', gw: '192.168.10.97' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['PC2', 'e0', 'R1', 'g0/1'], ['R1', 'g0/2', 'R2', 'g0/0'], ['R2', 'g0/1', 'PC3', 'e0']],
  layout: { PC1: [30, 25], PC2: [30, 100], R1: [150, 62], R2: [265, 62], PC3: [370, 62] },
  intro: `<b>The situation:</b> your company owns exactly one address block — <b>192.168.10.0/24</b> — and you have four networks to build from it: an engineering LAN needing 60 hosts, a sales LAN needing 30, a small branch LAN needing 14, and a router-to-router link needing 2.<br><b>Your goal:</b> carve that single /24 into four right-sized subnets using VLSM, configure them, and prove the plan works. The arithmetic is the exam's single most-tested skill, and doing it on live interfaces beats doing it on paper because the router tells you when you are wrong.<br><br><b>The plan to implement:</b><br>• 60 hosts → <b>/26</b> (62 usable): 192.168.10.0/26, gateway .1<br>• 30 hosts → <b>/27</b> (30 usable): 192.168.10.64/27, gateway .65<br>• 14 hosts → <b>/28</b> (14 usable): 192.168.10.96/28, gateway .97<br>• 2 hosts → <b>/30</b> (2 usable): 192.168.10.112/30, addresses .113 and .114`,
  tasks: [
    { t: 'Do the arithmetic before you touch a single interface',
      do: [
        'You have one block: <b>192.168.10.0/24</b>. Work out, on paper or in your head, the four subnets listed in the brief above.',
        'For each one write down: network address, mask, first usable, last usable, broadcast.',
        'VLSM rule: allocate the LARGEST requirement first, then the next largest.',
      ],
      done: 'You have four lines written down before you type anything.',
      why: 'Doing the maths once, up front, turns the configuration into mechanical typing. Doing it as you go is how blocks end up overlapping.' },

    { t: 'Configure the /26 engineering LAN on R1 G0/0',
      do: [
        'On the <b>R1</b> tab, enter configuration mode and set the hostname to <b>R1</b>.',
        'Enter interface <b>G0/0</b>, describe it as <b>ENGINEERING-60-HOSTS</b>.',
        'Give it <b>192.168.10.1</b> with mask <b>255.255.255.192</b> and enable it.',
        'Display the layer-3 detail and check the broadcast address IOS reports.',
      ],
      done: 'G0/0 is up with a /26 address and the broadcast reads 192.168.10.63.',
      why: '/26 is 255.255.255.192, so the blocks are 64 addresses wide: .0, .64, .128, .192. The first block runs .0 to .63, with .1 to .62 usable — 62 addresses for 60 hosts.' },

    { t: 'Configure the /27 sales LAN on R1 G0/1',
      do: [
        'Enter interface <b>G0/1</b>, describe it as <b>SALES-30-HOSTS</b>.',
        'Give it <b>192.168.10.65</b> with mask <b>255.255.255.224</b> and enable it.',
      ],
      done: 'G0/1 is up with a /27 address.',
      why: '/27 is 255.255.255.224 — blocks of 32. Starting where the /26 ended, this subnet runs .64 to .95 with .65 to .94 usable: exactly 30 addresses for 30 hosts.' },

    { t: 'Configure the /30 link between the two routers',
      do: [
        'Enter interface <b>G0/2</b>, describe it as <b>WAN-LINK-P2P</b>.',
        'Give it <b>192.168.10.113</b> with mask <b>255.255.255.252</b> and enable it.',
        'Then check the interface summary.',
      ],
      done: 'Three interfaces on R1 are up, each with a different prefix length.',
      why: '/30 is blocks of 4: network .112, usable .113 and .114, broadcast .115. Four addresses consumed for a two-device link and nothing wasted.' },

    { t: 'Configure R2 with the other half of the /30 and the /28 branch LAN',
      do: [
        'Switch to the <b>R2</b> tab, enter configuration mode and set the hostname to <b>R2</b>.',
        'On <b>G0/0</b>: description <b>WAN-LINK-P2P</b>, address <b>192.168.10.114</b> mask <b>255.255.255.252</b>, enabled.',
        'On <b>G0/1</b>: description <b>BRANCH-14-HOSTS</b>, address <b>192.168.10.97</b> mask <b>255.255.255.240</b>, enabled.',
      ],
      done: 'Both R2 interfaces are up.',
      why: '/28 is 255.255.255.240 — blocks of 16. Network .96, broadcast .111, usable .97 to .110: 14 addresses for 14 hosts, a perfect fit.' },

    { t: 'Test the link before touching routing',
      do: [
        'From <b>R1</b>, ping <b>192.168.10.114</b>.',
      ],
      done: 'The two routers reach each other across the /30.',
      why: 'The foundation has to be sound before anything is built on it. Any later failure is now definitely a routing problem.' },

    { t: 'Read your prefix lengths back out of the routing table',
      do: [
        'On <b>R1</b>, display the routing table.',
        'Check that the three connected networks show as /26, /27 and /30 — exactly what you intended.',
      ],
      done: 'Three different prefix lengths appear, all carved from one /24.',
      why: 'That is VLSM, and the routing table is your proof it worked. It is also the fastest way to catch a mask you fat-fingered.' },

    { t: 'Route from R1 to the branch LAN',
      do: [
        'On <b>R1</b>, create a static route for <b>192.168.10.96</b> mask <b>255.255.255.240</b> via <b>192.168.10.114</b>.',
      ],
      done: 'An S route to the /28 appears in R1\'s table.',
      why: 'Note the mask in the route matches the mask on the far interface. Writing /24 here would claim the whole block and break every other subnet.' },

    { t: 'Add the two return routes on R2',
      do: [
        'On <b>R2</b>, create a route for <b>192.168.10.0</b> mask <b>255.255.255.192</b> via <b>192.168.10.113</b>.',
        'Add a second route for <b>192.168.10.64</b> mask <b>255.255.255.224</b> via <b>192.168.10.113</b>.',
      ],
      done: 'R2 has two static routes with two different masks.',
      why: 'Two separate routes, because the two LANs have different prefix lengths. They cannot be summarised into one without also covering the WAN link.' },

    { t: 'Test from every host',
      do: [
        'On <b>PC1</b>: <code>ipconfig</code>, ping <b>192.168.10.1</b>, then ping <b>192.168.10.70</b>.',
        'On <b>PC2</b>: ping <b>192.168.10.65</b>, then ping <b>192.168.10.100</b>.',
        'On <b>PC3</b>: ping <b>192.168.10.97</b>, then <b>192.168.10.10</b>, then <b>192.168.10.70</b>.',
      ],
      done: 'Every host reaches its own gateway and both other LANs.',
      why: 'PC1 is .10 in a /26 so its subnet ends at .63 — reaching .70 already needs the router. Numerically close, logically separate: that is what a mask does.' },

    { t: 'Prove a broadcast address really is unusable',
      do: [
        'On <b>R1</b>, try to set interface <b>G0/0</b> to <b>192.168.10.63</b> with mask <b>255.255.255.192</b>.',
        'Read the error, then put <b>192.168.10.1</b> back and save both routers.',
      ],
      done: 'IOS refuses .63 and the correct address is restored.',
      why: '.63 is the broadcast address of that /26. If you are ever unsure whether an address is usable, the router will tell you — but it is faster to know the block size.' },
  ],
  steps: [
    { d: 'R1', t: 'Name the router, then build the /26 — the biggest block first.', c: ['enable', 'configure terminal', 'hostname R1', 'interface g0/0', 'description ENGINEERING-60-HOSTS', 'ip address 192.168.10.1 255.255.255.192', 'no shutdown', 'exit', 'do show ip interface g0/0'], note: '/26 = 255.255.255.192. Network 192.168.10.0, broadcast .63, usable .1 to .62 — 62 addresses for 60 hosts, with two spare.' },
    { d: 'R1', t: 'The /27 sales LAN starts where the /26 ended.', c: ['interface g0/1', 'description SALES-30-HOSTS', 'ip address 192.168.10.65 255.255.255.224', 'no shutdown', 'exit', 'do show ip interface g0/1'], note: '/27 = 255.255.255.224. Network .64, broadcast .95, usable .65 to .94 — exactly 30 addresses for 30 hosts.' },
    { d: 'R1', t: 'And the /30 link to R2, at the far end of the block.', c: ['interface g0/2', 'description WAN-LINK-P2P', 'ip address 192.168.10.113 255.255.255.252', 'no shutdown', 'end', 'show ip interface brief'], note: '/30 = 255.255.255.252. Network .112, usable .113 and .114, broadcast .115. Four addresses consumed for a two-device link.' },
    { d: 'R2', t: 'R2 takes the other half of the /30 and the /28 branch LAN.', c: ['enable', 'configure terminal', 'hostname R2', 'interface g0/0', 'description WAN-LINK-P2P', 'ip address 192.168.10.114 255.255.255.252', 'no shutdown', 'exit', 'interface g0/1', 'description BRANCH-14-HOSTS', 'ip address 192.168.10.97 255.255.255.240', 'no shutdown', 'end', 'show ip interface brief'], note: '/28 = 255.255.255.240. Network .96, broadcast .111, usable .97 to .110 — 14 addresses for 14 hosts, a perfect fit.' },
    { d: 'R1', t: 'Test the link before anything else.', c: ['ping 192.168.10.114'], note: 'Both ends of the /30 answer. The foundation is sound, so any later failure is a routing problem, not an addressing one.' },
    { d: 'R1', t: 'Read the prefix lengths back out of the routing table.', c: ['show ip route'], note: 'Three connected networks with three DIFFERENT prefix lengths from one /24 — that is VLSM, and the table is your proof it worked.' },
    { d: 'R1', t: 'Route to the branch LAN behind R2.', c: ['configure terminal', 'ip route 192.168.10.96 255.255.255.240 192.168.10.114', 'end', 'show ip route'], note: 'Note the mask in the route matches the mask on the interface. A /24 here would claim the whole block and break everything.' },
    { d: 'R2', t: 'And the two return routes.', c: ['configure terminal', 'ip route 192.168.10.0 255.255.255.192 192.168.10.113', 'ip route 192.168.10.64 255.255.255.224 192.168.10.113', 'end', 'show ip route'], note: 'Two separate routes, because the two LANs have different prefix lengths and cannot be summarised into one without also covering the link.' },
    { d: 'PC1', t: 'Test from the engineering LAN.', c: ['ipconfig', 'ping 192.168.10.1', 'ping 192.168.10.70'], note: 'PC1 is .10 with a /26 mask, so its subnet ends at .63. Reaching .70 means crossing into another subnet — which needs the router, and works.' },
    { d: 'PC2', t: 'Test from the sales LAN, including across the WAN.', c: ['ipconfig', 'ping 192.168.10.65', 'ping 192.168.10.100'], note: 'PC2 is .70 in the /27, and .100 is in the /28 behind R2. Numerically close, three routers-worth of logic apart.' },
    { d: 'PC3', t: 'And from the branch, back across everything.', c: ['ipconfig', 'ping 192.168.10.97', 'ping 192.168.10.10', 'ping 192.168.10.70'], note: 'Every host reaches every other host. One /24, four subnets, no wasted addresses.' },
    { d: 'R1', t: 'Try a host address that falls outside its own subnet.', c: ['configure terminal', 'interface g0/0', 'ip address 192.168.10.63 255.255.255.192', 'exit'], expectErr: true, note: '.63 is the BROADCAST of the /26, so IOS refuses it. If you ever wonder whether an address is usable, the router will tell you.' },
    { d: 'R1', t: 'Put the gateway address back and save.', c: ['interface g0/0', 'ip address 192.168.10.1 255.255.255.192', 'end', 'write memory'], note: 'Back to a valid first-usable address.' },
    { d: 'R2', t: 'Save the second router too.', c: ['write memory'] },
  ],
  verify: ['show ip interface brief', 'show ip route', 'show ip interface g0/0', 'show running-config'],
  explain: `<h3>The only three numbers you need</h3>
<p>For any mask, work out the <b>block size</b> in the interesting octet: 256 − the mask value. /26 is 255.255.255.<b>192</b>, so 256 − 192 = <b>64</b>: subnets start at .0, .64, .128, .192. /27 gives blocks of 32, /28 blocks of 16, /29 blocks of 8, /30 blocks of 4.</p>
<p>Then: the <b>network address</b> is the start of the block, the <b>broadcast</b> is one less than the next block's start, and everything between them is usable. Usable count is 2^h − 2 where h is the host bits.</p>
<table><tr><td><b>/25</b> .128 · 126 hosts</td><td><b>/26</b> .192 · 62</td><td><b>/27</b> .224 · 30</td></tr><tr><td><b>/28</b> .240 · 14</td><td><b>/29</b> .248 · 6</td><td><b>/30</b> .252 · 2</td></tr></table>
<h3>VLSM — the one rule</h3>
<p>Variable Length Subnet Masking means different subnets from the same block can use different masks. The rule: <b>allocate the largest requirement first</b>, then the next largest, and so on. Do it in the other order and you fragment the block and run out of room even though there are addresses left.</p>
<p>In this lab: 60 hosts took the /26 at .0, 30 took the /27 at .64, 14 took the /28 at .96 and the link took the /30 at .112 — leaving .116 to .255 free for later growth. Had you given the two-device link a /24, the entire block would have been gone.</p>
<h3>Working backwards in the exam</h3>
<p>Given an address like 192.168.10.70/27: block size is 32, so the subnets are .0, .32, .64, .96. 70 falls in the <b>.64</b> block, so the network is 192.168.10.64, the broadcast is .95, and the usable range is .65 to .94. That is the entire skill, and it is worth practising until it takes ten seconds.</p>`,
  checks: [
    { desc: 'Engineering LAN configured as a /26', fn: H => H.hasIp('R1', 'g0/0', '192.168.10.1', '255.255.255.192') },
    { desc: 'Sales LAN configured as a /27', fn: H => H.hasIp('R1', 'g0/1', '192.168.10.65', '255.255.255.224') },
    { desc: 'The WAN link uses a /30 on both ends', fn: H => H.hasIp('R1', 'g0/2', '192.168.10.113', '255.255.255.252') && H.hasIp('R2', 'g0/0', '192.168.10.114', '255.255.255.252') },
    { desc: 'Branch LAN configured as a /28', fn: H => H.hasIp('R2', 'g0/1', '192.168.10.97', '255.255.255.240') },
    { desc: 'R1 routes to the /28 with the correct mask', fn: H => H.d('R1').staticRoutes.some(r => r.net === '192.168.10.96' && r.mask === '255.255.255.240') },
    { desc: 'R2 has return routes for both of R1\'s LANs with the correct masks', fn: H => H.d('R2').staticRoutes.some(r => r.net === '192.168.10.0' && r.mask === '255.255.255.192') && H.d('R2').staticRoutes.some(r => r.net === '192.168.10.64' && r.mask === '255.255.255.224') },
    { desc: 'Every host reaches its own gateway', fn: H => H.ping('PC1', '192.168.10.1') && H.ping('PC2', '192.168.10.65') && H.ping('PC3', '192.168.10.97') },
    { desc: 'Hosts in all three LANs reach each other', fn: H => H.ping('PC1', '192.168.10.70') && H.ping('PC2', '192.168.10.100') && H.ping('PC3', '192.168.10.10') },
    { desc: 'Both routers saved', fn: H => H.saved('R1') && H.saved('R2') },
  ],
});

/* ============================================================= */
L({
  id: 'd21-rstp', ord: 21, vol: 1, day: 'Day 21', title: 'Rapid Spanning Tree (RSTP)',
  topics: 'rapid-pvst vs pvst · port roles and states · edge ports · link types · portfast & BPDU guard · root bridge placement',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'g0/1', 'g0/2'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'g0/1', 'g0/2'] },
    { id: 'SW3', type: 'switch', ifaces: ['f0/1', 'g0/1', 'g0/2'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.10', mask: '255.255.255.0', gw: '10.0.0.1' } },
  ],
  links: [['SW1', 'g0/1', 'SW2', 'g0/1'], ['SW2', 'g0/2', 'SW3', 'g0/1'], ['SW3', 'g0/2', 'SW1', 'g0/2'], ['PC1', 'e0', 'SW1', 'f0/1']],
  layout: { SW1: [90, 35], SW2: [260, 35], SW3: [175, 120], PC1: [30, 120] },
  intro: `<b>The situation:</b> three switches wired in a triangle. Physically that is a loop, and an unmanaged loop at layer 2 will melt a network in seconds — broadcast storms, MAC table instability, duplicate frames.<br><b>Your goal:</b> run <b>Rapid PVST+</b> on all three, choose the root bridge deliberately rather than letting the switches pick, read the port roles the protocol assigns, and make the host-facing port come up instantly and safely. Classic STP takes 30-50 seconds to converge; RSTP does it in one or two, and the exam expects you to know exactly why.`,
  tasks: [
    { t: 'Look at what spanning tree is doing before you change anything',
      do: [
        'On <b>SW1</b>, enter privileged EXEC, turn off the pager and set the hostname to <b>SW1</b>.',
        'Display the spanning-tree status and note which bridge it calls the root.',
        'Do the same on <b>SW2</b> and <b>SW3</b>, naming each of them as you go.',
      ],
      done: 'All three switches agree on which bridge is currently root.',
      why: 'The switches have already blocked a port by themselves — the loop is handled out of the box. Your job is to control HOW it is handled, not whether.' },

    { t: 'Put all three switches into Rapid PVST+',
      do: [
        'On <b>SW1</b>, set the spanning-tree mode to <b>rapid-pvst</b>.',
        'Repeat on <b>SW2</b> and on <b>SW3</b>.',
      ],
      done: 'All three switches run the same mode.',
      why: 'RSTP converges in a second or two instead of 30-50. One switch left on the classic mode drags its links back to the slow timers, so every switch needs the command.' },

    { t: 'Make SW1 the root bridge deliberately',
      do: [
        'On <b>SW1</b>, set the spanning-tree priority for <b>VLAN 1</b> to <b>4096</b>.',
        'Display the spanning-tree status and look for the line saying this bridge is the root.',
      ],
      done: 'SW1 reports itself as the root bridge.',
      why: 'Left alone, the lowest MAC address wins — usually the oldest switch in the building. Priority must be a multiple of 4096 because the VLAN ID occupies the low bits of the bridge ID.' },

    { t: 'Make SW2 the backup root',
      do: [
        'On <b>SW2</b>, set the spanning-tree priority for <b>VLAN 1</b> to <b>8192</b>.',
      ],
      done: 'SW2 reports priority 8192 for VLAN 1.',
      why: '8192 beats the 32768 default but loses to SW1\'s 4096. If SW1 ever dies you know in advance exactly which switch takes over.' },

    { t: 'Read the port roles on each switch',
      do: [
        'Display the spanning-tree status on <b>SW3</b>, then on <b>SW2</b>, then on <b>SW1</b>.',
        'For each switch, identify the <b>root port</b>, the <b>designated ports</b>, and any port that is blocking.',
      ],
      done: 'You can name the role of every port in the triangle.',
      why: 'Every non-root switch has exactly one root port; every segment has one designated port; whatever is left is blocked. That blocked port is the loop being broken in software, on a cable that is physically fine.' },

    { t: 'Turn the host-facing port into an edge port',
      do: [
        'On <b>SW1</b>, enter interface <b>F0/1</b> and enable <b>portfast</b>.',
        'Read the warning IOS prints as you type it.',
      ],
      done: 'Portfast appears under Fa0/1 in the running configuration.',
      why: 'An edge port skips the listening and learning states and forwards immediately, so a PC gets DHCP at once. The warning is describing exactly the accident that the next task prevents.' },

    { t: 'Protect that edge port with BPDU guard',
      do: [
        'Still inside <b>F0/1</b>, enable <b>BPDU guard</b>.',
      ],
      done: 'BPDU guard appears under Fa0/1.',
      why: 'A portfast port should never receive a BPDU. If it does, somebody has plugged in a switch — BPDU guard err-disables the port instead of letting that device reshape your topology.' },

    { t: 'Apply the same protection switch-wide on SW2',
      do: [
        'On <b>SW2</b>, enable <b>portfast default</b> and <b>portfast bpduguard default</b> in global configuration mode.',
        'Check the running configuration afterwards.',
      ],
      done: 'Both global default commands are present on SW2.',
      why: 'The "default" forms apply to every access port at once, which is how it is really done on a 48-port switch rather than interface by interface.' },

    { t: 'Compare classic PVST+ with Rapid, then return to Rapid',
      do: [
        'On <b>SW3</b>, set the mode to <b>pvst</b> and display the spanning-tree status.',
        'Then set it back to <b>rapid-pvst</b> and display the status again.',
      ],
      done: 'SW3 finishes on rapid-pvst.',
      why: 'Classic 802.1D uses blocking, listening, learning and forwarding with 30-50 second convergence; RSTP uses discarding, learning and forwarding and converges in about a second. Typing both fixes the difference in memory.' },

    { t: 'Confirm the host port works and save all three switches',
      do: [
        'On the <b>PC1</b> tab, run <code>ipconfig</code>.',
        'Save the configuration on <b>SW1</b>, <b>SW2</b> and <b>SW3</b>.',
      ],
      done: 'All three switches are saved.',
      why: 'With portfast the port forwards the instant it comes up, so a real PC gets its lease immediately instead of waiting out the STP timers.' },
  ],
  steps: [
    { d: 'SW1', t: 'Name the switch and see what spanning tree is doing already.', c: ['enable', 'terminal length 0', 'configure terminal', 'hostname SW1', 'end', 'show spanning-tree'], note: 'The switches have already blocked a port by themselves — the loop is handled out of the box. Your job is to control HOW, not whether.' },
    { d: 'SW2', t: 'Name the second switch and read its view.', c: ['enable', 'terminal length 0', 'configure terminal', 'hostname SW2', 'end', 'show spanning-tree'], note: 'Every switch has its own view. Compare which bridge each one calls the root — they must all agree, or something is badly wrong.' },
    { d: 'SW3', t: 'And the third.', c: ['enable', 'terminal length 0', 'configure terminal', 'hostname SW3', 'end', 'show spanning-tree'] },
    { d: 'SW1', t: 'Switch SW1 to Rapid PVST+.', c: ['configure terminal', 'spanning-tree mode rapid-pvst', 'end', 'show spanning-tree'], note: '802.1w. Same per-VLAN model as PVST+, dramatically faster convergence.' },
    { d: 'SW2', t: 'Same on SW2.', c: ['configure terminal', 'spanning-tree mode rapid-pvst', 'end'] },
    { d: 'SW3', t: 'And SW3 — all three must match.', c: ['configure terminal', 'spanning-tree mode rapid-pvst', 'end', 'show spanning-tree'], note: 'A single switch left on classic PVST+ forces its neighbours back to 802.1D behaviour on those links, losing you the benefit everywhere it touches.' },
    { d: 'SW1', t: 'Make SW1 the root bridge on purpose.', c: ['configure terminal', 'spanning-tree vlan 1 priority 4096', 'end', 'show spanning-tree'], note: 'Priority must be a multiple of 4096. Lower wins, and the output should now say "This bridge is the root".' },
    { d: 'SW2', t: 'Make SW2 the backup root.', c: ['configure terminal', 'spanning-tree vlan 1 priority 8192', 'end', 'show spanning-tree'], note: '8192 beats the 32768 default but loses to SW1\'s 4096. If SW1 ever dies, SW2 takes over predictably.' },
    { d: 'SW3', t: 'Read the port roles on the switch furthest from the root.', c: ['show spanning-tree'], note: 'One root port (towards SW1), and one port that is blocking. The blocked port is the loop being broken — the cable is fine, the switch is choosing not to use it.' },
    { d: 'SW2', t: 'Compare with the middle switch.', c: ['show spanning-tree'], note: 'Root port towards SW1, designated port towards SW3. Every switch except the root has exactly one root port.' },
    { d: 'SW1', t: 'And the root itself.', c: ['show spanning-tree'], note: 'All ports on the root bridge are designated. The root never blocks anything — which is exactly why you want it in the middle of your network, not at the edge.' },
    { d: 'SW1', t: 'Make the host port an edge port.', c: ['configure terminal', 'interface f0/1', 'spanning-tree portfast', 'exit', 'do show spanning-tree'], note: 'IOS warns you never to use this on a port connected to another switch. Read the warning — it is describing exactly the accident BPDU guard prevents.' },
    { d: 'SW1', t: 'Protect it from anyone plugging a switch into the desk port.', c: ['interface f0/1', 'spanning-tree bpduguard enable', 'end', 'show spanning-tree'], note: 'If a BPDU arrives on this port, the switch err-disables it immediately. Recovery is shutdown then no shutdown — and a conversation with whoever plugged it in.' },
    { d: 'SW2', t: 'Apply the same protection by default on the second switch.', c: ['configure terminal', 'spanning-tree portfast default', 'spanning-tree portfast bpduguard default', 'end', 'show running-config'], note: 'The "default" forms apply to every access port at once, which is how it is done on a 48-port switch rather than one interface at a time.' },
    { d: 'SW3', t: 'Drop back to classic PVST+ to compare, then return.', c: ['configure terminal', 'spanning-tree mode pvst', 'do show spanning-tree', 'spanning-tree mode rapid-pvst', 'end', 'show spanning-tree'], note: 'Classic 802.1D uses the states blocking, listening, learning, forwarding, with 30-50 second convergence. RSTP uses discarding, learning, forwarding and converges in about a second.' },
    { d: 'PC1', t: 'Confirm the host port works.', c: ['ipconfig'], note: 'With portfast the port forwards the instant it comes up, so a real PC gets its DHCP lease immediately instead of waiting out the STP timers.' },
    { d: 'SW1', t: 'Save all three switches.', c: ['write memory'] },
    { d: 'SW2', t: 'Save.', c: ['write memory'] },
    { d: 'SW3', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show spanning-tree', 'show running-config', 'show interfaces status'],
  explain: `<h3>Why spanning tree exists</h3>
<p>Ethernet frames have no TTL. A loop at layer 2 therefore never stops: broadcasts circulate forever, multiply at every switch, and the MAC address table flaps as the same source address arrives on different ports. Within seconds the network is unusable. STP prevents this by blocking enough ports to leave exactly one active path between any two points.</p>
<h3>The flavours</h3>
<ul>
<li><b>STP (802.1D)</b> — the original, one instance for the whole network, 30-50 second convergence.</li>
<li><b>PVST+</b> — Cisco's per-VLAN version of 802.1D. The default on Cisco switches.</li>
<li><b>RSTP (802.1w)</b> — rapid convergence, typically under two seconds.</li>
<li><b>Rapid PVST+</b> — Cisco's per-VLAN RSTP. This is what you configure with <code>spanning-tree mode rapid-pvst</code>, and what you should be running.</li>
</ul>
<h3>Port roles and states</h3>
<p><b>Roles:</b> <em>Root</em> — the one port on each non-root switch closest to the root. <em>Designated</em> — the forwarding port for a segment; all root-bridge ports are designated. <em>Alternate</em> — a blocked backup for the root port. <em>Backup</em> — a blocked backup for a designated port on the same segment.</p>
<p><b>States:</b> classic STP uses blocking → listening → learning → forwarding. RSTP simplifies to <b>discarding</b>, <b>learning</b>, <b>forwarding</b>, and adds proposal/agreement handshakes between switches so a link can go straight to forwarding without waiting for timers.</p>
<h3>Choosing the root</h3>
<p>The bridge ID is priority (default 32768) plus the MAC address. Lowest wins, and ties are broken by MAC — meaning the oldest switch in the building usually becomes root by accident. Set it yourself with <code>spanning-tree vlan N priority 4096</code> (multiples of 4096 only), and give a second switch 8192 as the standby.</p>
<h3>Edge ports</h3>
<p><code>spanning-tree portfast</code> marks a port as an edge port: it goes straight to forwarding because a PC cannot create a loop. <code>spanning-tree bpduguard enable</code> then err-disables it if a BPDU ever arrives, which means somebody has plugged in a switch. Use the <code>default</code> forms globally so every access port is covered without touching them one at a time.</p>`,
  checks: [
    { desc: 'All three switches run Rapid PVST+', fn: H => ['SW1', 'SW2', 'SW3'].every(s => H.d(s).stp.mode === 'rapid') },
    { desc: 'SW1 is the root bridge with priority 4096', fn: H => H.d('SW1').stp.prio[1] === 4096 },
    { desc: 'SW2 is the backup root with priority 8192', fn: H => H.d('SW2').stp.prio[1] === 8192 },
    { desc: 'The host port on SW1 is an edge port', fn: H => !!H.i('SW1', 'f0/1').stpPortfast },
    { desc: 'BPDU guard protects that edge port', fn: H => !!H.i('SW1', 'f0/1').bpduguard },
    { desc: 'SW2 applies portfast and BPDU guard globally', fn: H => H.d('SW2').stp.portfastDefault && H.d('SW2').stp.bpduguardDefault },
    { desc: 'All three switches saved', fn: H => ['SW1', 'SW2', 'SW3'].every(s => H.saved(s)) },
  ],
});

/* ============================================================= */
L({
  id: 'd24-dynamic-routing', ord: 24, vol: 1, day: 'Day 24', title: 'Dynamic Routing & Administrative Distance',
  topics: 'static vs dynamic · administrative distance · floating static routes · metrics · longest-prefix match · show ip protocols',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2', 'lo0'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0'] },
    { id: 'R3', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0'], ['R2', 'g0/1', 'R3', 'g0/0'], ['R1', 'g0/2', 'R3', 'g0/1']],
  layout: { PC1: [30, 35], R1: [130, 35], R2: [270, 35], R3: [200, 120] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    const M24 = '255.255.255.0', M30 = '255.255.255.252', M32 = '255.255.255.255';
    set('R1', 'g0/0', '10.0.1.1', M24); set('R1', 'g0/1', '10.0.12.1', M30); set('R1', 'g0/2', '10.0.13.1', M30);
    set('R2', 'g0/0', '10.0.12.2', M30); set('R2', 'g0/1', '10.0.23.1', M30);
    set('R3', 'g0/0', '10.0.23.2', M30); set('R3', 'g0/1', '10.0.13.2', M30);
    set('R1', 'lo0', '1.1.1.1', M32); set('R2', 'lo0', '2.2.2.2', M32); set('R3', 'lo0', '3.3.3.3', M32);
    for (const r of ['R1', 'R2', 'R3']) topo.devs[r].hostname = r;
  },
  intro: `<b>The situation:</b> three routers in a triangle, every link addressed and up, and not one routing entry between them. There are two ways to fix that — type every route by hand, or let the routers tell each other. This lab does both, on the same network, so you can see exactly how a router chooses when it is offered the same destination twice.<br><b>Your goal:</b> understand <b>administrative distance</b> — the number that decides which source of routing information a router believes — and build a floating static route, the standard backup-path technique that depends entirely on it.`,
  tasks: [
    { t: 'Start with what you already know — a static route',
      do: [
        'On <b>R1</b>, enter privileged EXEC, turn off the pager and go into configuration mode.',
        'Create a static route for <b>3.3.3.3</b> mask <b>255.255.255.255</b> via <b>10.0.12.2</b>.',
        'Display the routing table and read the two numbers in square brackets.',
      ],
      done: 'The route appears as S 3.3.3.3/32 [1/0] via 10.0.12.2.',
      why: 'The first number is the administrative distance (1 for a static route) and the second is the metric. Note the path it chose: via R2, the long way round.' },

    { t: 'Enable OSPF on R1',
      do: [
        'Still on <b>R1</b>, start OSPF process <b>1</b> and set the router ID to <b>1.1.1.1</b>.',
        'Advertise <b>10.0.0.0</b> with wildcard <b>0.0.255.255</b> in area <b>0</b> — one statement covers every 10.0.x.x interface.',
        'Advertise the loopback <b>1.1.1.1</b> with wildcard <b>0.0.0.0</b> in area 0.',
      ],
      done: 'The OSPF process exists with two network statements.',
      why: 'A wildcard of 0.0.255.255 matches a whole /16 worth of interfaces at once; 0.0.0.0 matches exactly one address. Both forms turn up constantly in real configurations.' },

    { t: 'Enable OSPF on R2 and R3 so the routers can talk',
      do: [
        'On <b>R2</b>: OSPF process <b>1</b>, router ID <b>2.2.2.2</b>, advertise <b>10.0.0.0 0.0.255.255</b> and <b>2.2.2.2 0.0.0.0</b>, both in area 0.',
        'On <b>R3</b>: OSPF process <b>1</b>, router ID <b>3.3.3.3</b>, advertise <b>10.0.0.0 0.0.255.255</b> and <b>3.3.3.3 0.0.0.0</b>, both in area 0.',
        'Check the neighbour table on each.',
      ],
      done: 'R3 shows two neighbours; R1 and R2 show their own.',
      why: 'Adjacencies form within seconds once both ends are configured. From here on every router learns every network without anybody typing a route.' },

    { t: 'Work out which source of information won for 3.3.3.3',
      do: [
        'On <b>R1</b>, display the routing table and look at the entry for <b>3.3.3.3</b>.',
        'Note whether it is marked S or O, and which next hop it uses.',
      ],
      done: 'The entry is still the static route, via R2.',
      why: 'The router compares administrative distance first, not metrics: static (1) beats OSPF (110), so your hand-typed route wins even though OSPF knows about the shorter direct link.' },

    { t: 'Remove the static route and watch OSPF take over',
      do: [
        'On <b>R1</b>, delete the static route to <b>3.3.3.3 255.255.255.255</b> via <b>10.0.12.2</b>.',
        'Display the routing table again.',
      ],
      done: 'The entry is now marked O, with a different next hop and a metric.',
      why: 'The OSPF route existed all along, held in the database but not installed. Removing the better-trusted route promotes it instantly — and it happens to be the better path.' },

    { t: 'Build a floating static route as a deliberate backup',
      do: [
        'On <b>R1</b>, create a static route for <b>3.3.3.3</b> mask <b>255.255.255.255</b> via <b>10.0.12.2</b> with a trailing administrative distance of <b>200</b>.',
        'Display the routing table and note that it does NOT appear.',
      ],
      done: 'The route is configured but absent from the table.',
      why: 'Because 200 is worse than OSPF\'s 110, the route sits in reserve. That single trailing number is the entire backup-link technique.' },

    { t: 'Break the OSPF path and watch the backup activate',
      do: [
        'On <b>R1</b>, disable interface <b>G0/2</b> — the direct link to R3.',
        'Display the routing table and the OSPF neighbour table.',
        'Then ping <b>3.3.3.3</b>.',
      ],
      done: 'The floating static is now installed and the ping still succeeds.',
      why: 'A backup you have never tested is not a backup. Traffic now takes the longer path via R2 and users notice nothing beyond a brief blip.' },

    { t: 'Restore the link and confirm it fails back',
      do: [
        'Re-enable interface <b>G0/2</b> on <b>R1</b>.',
        'Display the routing table again.',
      ],
      done: 'The O route returns and the AD-200 static drops back out of the table.',
      why: 'Failing over is only half the job; failing back cleanly is the other half, and it happens automatically because the better AD wins the moment it reappears.' },

    { t: 'Read the summary of every routing protocol running',
      do: [
        'On <b>R1</b>, display the IP protocols summary.',
        'Note the protocol, the router ID, what it advertises, which interfaces are passive, and the administrative distance.',
      ],
      done: 'You can describe R1\'s routing configuration from that one screen.',
      why: 'It is the first command to run on a router you have inherited, because it tells you what is running before you start reading configuration lines.' },

    { t: 'See longest-prefix match beat administrative distance',
      do: [
        'On <b>R1</b>, add a static route for <b>3.3.3.0</b> mask <b>255.255.255.0</b> via <b>10.0.12.2</b>.',
        'Display the routing table and decide which entry a packet to 3.3.3.3 would actually use.',
      ],
      done: 'Both routes are present and you can say which one wins.',
      why: 'The /32 from OSPF is more specific than your /24 static, so it wins regardless of administrative distance. Prefix length is checked BEFORE AD — that order catches people out constantly.' },

    { t: 'Test from the LAN and save all three routers',
      do: [
        'On the <b>PC1</b> tab, ping <b>3.3.3.3</b> and <b>2.2.2.2</b>.',
        'Save the configuration on <b>R1</b>, <b>R2</b> and <b>R3</b>.',
      ],
      done: 'Both loopbacks answer from the LAN and all three routers are saved.',
      why: 'A host reaching addresses three routers away, entirely by paths the routers worked out for themselves, is the whole argument for dynamic routing.' },
  ],
  steps: [
    { d: 'R1', t: 'Start with what you already know — a static route.', c: ['enable', 'terminal length 0', 'configure terminal', 'ip route 3.3.3.3 255.255.255.255 10.0.12.2', 'end', 'show ip route'], note: 'Look at the [1/0] beside the route: administrative distance 1, metric 0. Note the path — via R2, the long way round.' },
    { d: 'R1', t: 'Now configure OSPF on R1 so the routers can learn from each other.', c: ['configure terminal', 'router ospf 1', 'router-id 1.1.1.1', 'network 10.0.0.0 0.0.255.255 area 0', 'network 1.1.1.1 0.0.0.0 area 0', 'end'], note: 'One wildcard-masked statement covers every 10.0.x.x interface. The loopback gets its own exact-match statement.' },
    { d: 'R2', t: 'OSPF on R2.', c: ['enable', 'terminal length 0', 'configure terminal', 'router ospf 1', 'router-id 2.2.2.2', 'network 10.0.0.0 0.0.255.255 area 0', 'network 2.2.2.2 0.0.0.0 area 0', 'end', 'show ip ospf neighbor'], note: 'R1 should already appear as a neighbour in FULL state. Adjacency forms in seconds once both ends are configured.' },
    { d: 'R3', t: 'And OSPF on R3, completing the triangle.', c: ['enable', 'terminal length 0', 'configure terminal', 'router ospf 1', 'router-id 3.3.3.3', 'network 10.0.0.0 0.0.255.255 area 0', 'network 3.3.3.3 0.0.0.0 area 0', 'end', 'show ip ospf neighbor', 'show ip route'], note: 'R3 has two neighbours, R1 and R2. Every router now knows every network without anyone typing a route.' },
    { d: 'R1', t: 'Which source won for 3.3.3.3?', c: ['show ip route'], note: 'The static route is still there, marked S, still pointing via R2 — even though OSPF knows the direct link to R3 exists. AD 1 beats AD 110, and the router never compares the two metrics.' },
    { d: 'R1', t: 'Remove the static route and watch OSPF take over.', c: ['configure terminal', 'no ip route 3.3.3.3 255.255.255.255 10.0.12.2', 'end', 'show ip route'], note: 'The entry is now O with [110/2] — learned by OSPF, and via the direct link, which is the better path. The OSPF route existed all along; it simply was not installed.' },
    { d: 'R1', t: 'Build a floating static as a deliberate backup.', c: ['configure terminal', 'ip route 3.3.3.3 255.255.255.255 10.0.12.2 200', 'end', 'show ip route'], note: 'The trailing 200 is the administrative distance. Because 200 is worse than OSPF\'s 110, this route does NOT appear in the table at all — it is waiting in reserve.' },
    { d: 'R1', t: 'Break the OSPF path and watch the backup activate.', c: ['configure terminal', 'interface g0/2', 'shutdown', 'end', 'show ip route', 'show ip ospf neighbor'], note: 'The direct link is down and the OSPF route with it. The floating static installs itself immediately, sending traffic the long way via R2 — exactly what a backup should do.' },
    { d: 'R1', t: 'Prove the backup path actually carries traffic.', c: ['ping 3.3.3.3'], note: 'Still reachable, just by a longer route. Users notice nothing beyond a brief blip.' },
    { d: 'R1', t: 'Restore the link and confirm it fails back.', c: ['configure terminal', 'interface g0/2', 'no shutdown', 'end', 'show ip route'], note: 'OSPF re-forms the adjacency and its AD-110 route displaces the AD-200 static, which drops quietly back into reserve. Automatic in both directions.' },
    { d: 'R1', t: 'Read the summary of what is running.', c: ['show ip protocols'], note: 'Protocol, router ID, what it advertises, which interfaces are passive, and the administrative distance it uses. The first command to run when you inherit an unfamiliar router.' },
    { d: 'R1', t: 'Now see longest-prefix match decide between two valid routes.', c: ['configure terminal', 'ip route 3.3.3.0 255.255.255.0 10.0.12.2', 'end', 'show ip route'], note: 'Two routes could match 3.3.3.3 — this new /24 and OSPF\'s /32. The /32 is more specific, so it wins regardless of administrative distance. Prefix length is checked BEFORE AD.' },
    { d: 'PC1', t: 'Confirm the LAN still reaches everything.', c: ['ping 3.3.3.3', 'ping 2.2.2.2'], note: 'Both loopbacks reachable from a host, entirely by routes the routers worked out themselves.' },
    { d: 'R1', t: 'Save all three routers.', c: ['write memory'] },
    { d: 'R2', t: 'Save.', c: ['write memory'] },
    { d: 'R3', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show ip route', 'show ip protocols', 'show ip ospf neighbor', 'show running-config'],
  explain: `<h3>Static versus dynamic</h3>
<p><b>Static</b> routes are typed by hand: predictable, no CPU cost, no protocol traffic — and no reaction whatsoever when a link fails. They suit stub sites, default routes and backup paths. <b>Dynamic</b> protocols discover neighbours and share what they know: they scale, they heal automatically, and they cost some CPU and bandwidth. Real networks use both.</p>
<h3>Administrative distance — trustworthiness, not distance</h3>
<p>When two sources offer a route to the same prefix, the router installs the one with the <b>lower AD</b>. It does not compare their metrics, because metrics from different protocols are not comparable.</p>
<table>
<tr><td>Connected</td><td><b>0</b></td><td>Static</td><td><b>1</b></td></tr>
<tr><td>eBGP</td><td><b>20</b></td><td>EIGRP (internal)</td><td><b>90</b></td></tr>
<tr><td>OSPF</td><td><b>110</b></td><td>RIP</td><td><b>120</b></td></tr>
<tr><td>EIGRP (external)</td><td><b>170</b></td><td>iBGP</td><td><b>200</b></td></tr>
<tr><td colspan="4">255 = never installed (considered unreachable)</td></tr>
</table>
<h3>Floating static routes</h3>
<p><code>ip route 3.3.3.3 255.255.255.255 10.0.12.2 <b>200</b></code> — the trailing number overrides the default AD of 1. Set it above the dynamic protocol's AD and the static route waits, invisible, until the dynamic route disappears. It is the standard way to configure a backup WAN link, and it needs no extra logic at all.</p>
<h3>Metrics, and the order of decisions</h3>
<p>Within one protocol the <b>metric</b> chooses between paths: OSPF uses cost (derived from bandwidth), EIGRP uses bandwidth and delay, RIP counts hops. But the router's actual decision order is always:</p>
<ol><li><b>Longest prefix match</b> — the most specific route wins, full stop.</li><li><b>Administrative distance</b> — between sources for the same prefix.</li><li><b>Metric</b> — between paths from the same source.</li></ol>
<p>That first rule catches people out: a /32 static and a /24 OSPF route are not competing at all, because they match different amounts of the address.</p>`,
  checks: [
    { desc: 'OSPF is running on all three routers with unique IDs', fn: H => ['1.1.1.1', '2.2.2.2', '3.3.3.3'].every((id, n) => { const d = H.d(['R1', 'R2', 'R3'][n]); return d.ospf && d.ospf.routerId === id; }) },
    { desc: 'R1 has OSPF adjacencies with both neighbours', fn: H => H.ospfNbr('R1', 'R2') && H.ospfNbr('R1', 'R3') },
    { desc: 'The original AD-1 static route to 3.3.3.3/32 was removed', fn: H => !H.d('R1').staticRoutes.some(r => r.net === '3.3.3.3' && r.ad === 1) },
    { desc: 'A floating static to 3.3.3.3/32 exists with AD 200', fn: H => H.d('R1').staticRoutes.some(r => r.net === '3.3.3.3' && r.ad === 200) },
    { desc: 'The link R1 shut for the failover test is back up', fn: H => H.noshut('R1', 'g0/2') && H.up('R1', 'g0/2') },
    { desc: 'A less specific /24 route was added to demonstrate longest-prefix match', fn: H => H.d('R1').staticRoutes.some(r => r.net === '3.3.3.0' && r.mask === '255.255.255.0') },
    { desc: 'R1 reaches both remote loopbacks', fn: H => H.ping('R1', '2.2.2.2') && H.ping('R1', '3.3.3.3') },
    { desc: 'The LAN host reaches the far loopback', fn: H => H.ping('PC1', '3.3.3.3') },
    { desc: 'All three routers saved', fn: H => ['R1', 'R2', 'R3'].every(r => H.saved(r)) },
  ],
});

/* ============================================================= */
L({
  id: 'd29-tcp-udp', ord: 29, vol: 1, day: 'Day 29', title: 'TCP, UDP & Port Numbers',
  topics: 'the well-known ports · TCP vs UDP · source and destination ports · matching layer 4 in ACLs · the established keyword',
  devices: [
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.2.100', mask: '255.255.255.0', gw: '10.0.2.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'SRV', 'e0']],
  layout: { PC1: [40, 60], R1: [190, 60], SRV: [340, 60] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.1.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.2.1', '255.255.255.0');
    topo.devs.R1.hostname = 'R1';
  },
  intro: `<b>The situation:</b> one PC, one router and one server that runs several services at once — a web site, a secure shell, a DNS resolver and a TFTP daemon. All of them share a single IP address.<br><b>Your goal:</b> understand how <b>port numbers</b> keep those conversations apart, learn the well-known numbers the exam expects on sight, and then read layer 4 directly by writing access lists that permit one service while denying another. This is the chapter that makes extended ACLs make sense.`,
  tasks: [
    { t: 'Establish that everything works before you filter anything',
      do: [
        'On the <b>PC1</b> tab, run <code>ipconfig</code>, then ping the server at <b>10.0.2.100</b>.',
      ],
      done: 'The ping succeeds.',
      why: 'A filter you cannot prove changed something has taught you nothing. Baseline first, every time.' },

    { t: 'Look at the two networks you are about to filter between',
      do: [
        'On the <b>R1</b> tab, enter privileged EXEC, turn off the pager and display the brief interface summary and the routing table.',
      ],
      done: 'You can name which interface faces the users and which faces the server.',
      why: '10.0.1.0/24 holds the users and 10.0.2.0/24 the server. Everything below filters traffic travelling from the first into the second.' },

    { t: 'Create a list that permits web traffic to the server',
      do: [
        'In configuration mode, create a named extended access list called <b>SERVICES</b>.',
        'Permit <b>tcp</b> from <b>10.0.1.0 0.0.0.255</b> to <b>host 10.0.2.100</b> where the destination port equals <b>80</b>.',
        'Add a second entry the same but for port <b>443</b>.',
        'Display the access lists.',
      ],
      done: 'Two permit entries exist, for ports 80 and 443.',
      why: 'Port 80 is HTTP and 443 is HTTPS. The implicit deny-everything at the end of every list blocks whatever you do not mention.' },

    { t: 'Apply the list outbound towards the server LAN',
      do: [
        'Enter interface <b>G0/1</b> and apply <b>SERVICES</b> in the <b>out</b> direction.',
        'Confirm with the layer-3 interface view.',
      ],
      done: 'G0/1 reports the outgoing access list SERVICES.',
      why: 'Extended lists usually go close to the source, but placing this one outbound keeps a single list covering everything headed to this server — a deliberate trade-off worth understanding.' },

    { t: 'Add the management protocols you cannot work without',
      do: [
        'Re-enter the <b>SERVICES</b> list and permit <b>tcp</b> from the same source to the same host on port <b>22</b>.',
        'Also permit <b>icmp</b> from <b>10.0.1.0 0.0.0.255</b> to <b>host 10.0.2.100</b> — ICMP has no ports, so the entry ends at the destination.',
      ],
      done: 'The list now has four entries.',
      why: 'Port 22 is SSH. Telnet (23) is deliberately absent because it sends everything, passwords included, in clear text. ICMP is permitted so ping remains usable for testing.' },

    { t: 'Add the common UDP services',
      do: [
        'In the same list, permit <b>udp</b> from <b>10.0.1.0 0.0.0.255</b> to <b>host 10.0.2.100</b> on ports <b>53</b>, <b>69</b>, <b>123</b> and <b>161</b> — one entry each.',
      ],
      done: 'Four UDP entries appear in the list.',
      why: 'DNS 53, TFTP 69, NTP 123 and SNMP 161 are the four UDP services worth knowing cold. UDP has no handshake and no retransmission — it is used where speed matters more than guaranteed delivery.' },

    { t: 'Replace two lines with one port range',
      do: [
        'Add a <b>permit tcp</b> entry from the same source to the same host using <b>range 20 21</b> instead of an <code>eq</code>.',
      ],
      done: 'A range entry appears in the list.',
      why: 'FTP uses two ports — 21 for commands and 20 for data. The range keyword takes both in a single line, and shorter lists are easier to read and to audit.' },

    { t: 'Allow return traffic without opening anything inbound',
      do: [
        'Create a second named extended list called <b>RETURN-ONLY</b>.',
        'Permit <b>tcp any</b> to <b>10.0.1.0 0.0.0.255</b> with the keyword <b>established</b> on the end.',
        'Add <b>permit icmp any any</b> so your testing still works.',
      ],
      done: 'The RETURN-ONLY list exists with an established entry.',
      why: 'The established keyword matches TCP segments carrying ACK or RST — that is, replies in a conversation the inside started. New inbound sessions have neither flag and are dropped.' },

    { t: 'Apply the return filter towards the users',
      do: [
        'Enter interface <b>G0/0</b> and apply <b>RETURN-ONLY</b> in the <b>out</b> direction.',
        'Confirm with the layer-3 interface view.',
      ],
      done: 'G0/0 reports the outgoing access list RETURN-ONLY.',
      why: 'Traffic heading back to the users is now allowed only if it belongs to a session they started. That is a basic stateless firewall, built from one keyword.' },

    { t: 'Test what your rules permit and forbid',
      do: [
        'On the <b>PC1</b> tab, ping <b>10.0.2.100</b> — it should still work, because you permitted ICMP.',
      ],
      done: 'The ping succeeds.',
      why: 'Web, SSH, DNS, TFTP, NTP, SNMP, FTP and ICMP are permitted; everything else to that server is dropped by the implicit deny. Knowing which line each protocol hits is the skill being drilled.' },

    { t: 'Read the finished list back, line by line',
      do: [
        'Display the access lists and the layer-3 detail of <b>G0/1</b>.',
        'For each entry say out loud what it does, then save the configuration.',
      ],
      done: 'You can account for every line in both lists.',
      why: 'An access list you cannot explain line by line is a list you cannot safely change — and changing somebody else\'s list is most of the work in a real job.' },
  ],
  steps: [
    { d: 'PC1', t: 'Baseline: everything currently works.', c: ['ipconfig', 'ping 10.0.2.100'], note: 'No filtering yet. Note the result so you can prove your rules did something.' },
    { d: 'R1', t: 'Look at the two networks you are filtering between.', c: ['enable', 'terminal length 0', 'show ip interface brief', 'show ip route'], note: '10.0.1.0/24 holds the users, 10.0.2.0/24 the server. Everything below filters traffic from the first into the second.' },
    { d: 'R1', t: 'Rule 1 — web traffic only.', c: ['configure terminal', 'ip access-list extended SERVICES', 'permit tcp 10.0.1.0 0.0.0.255 host 10.0.2.100 eq 80', 'permit tcp 10.0.1.0 0.0.0.255 host 10.0.2.100 eq 443', 'exit', 'do show access-lists'], note: 'eq 80 is HTTP, eq 443 is HTTPS. The implicit "deny ip any any" at the end of every list blocks everything you did not mention.' },
    { d: 'R1', t: 'Apply it on the way out to the server LAN.', c: ['interface g0/1', 'ip access-group SERVICES out', 'end', 'show ip interface g0/1'], note: 'Extended lists are usually placed close to the SOURCE, but outbound here keeps one list covering everything heading to this server.' },
    { d: 'R1', t: 'Add the management protocols you cannot work without.', c: ['configure terminal', 'ip access-list extended SERVICES', 'permit tcp 10.0.1.0 0.0.0.255 host 10.0.2.100 eq 22', 'permit icmp 10.0.1.0 0.0.0.255 host 10.0.2.100', 'exit', 'do show access-lists'], note: 'Port 22 is SSH. Telnet (23) is deliberately absent — it sends everything, passwords included, in clear text. ICMP has no ports at all, so its permit line simply names the protocol: that is how ping stays usable for testing.' },
    { d: 'R1', t: 'Now the UDP services.', c: ['ip access-list extended SERVICES', 'permit udp 10.0.1.0 0.0.0.255 host 10.0.2.100 eq 53', 'permit udp 10.0.1.0 0.0.0.255 host 10.0.2.100 eq 69', 'permit udp 10.0.1.0 0.0.0.255 host 10.0.2.100 eq 123', 'permit udp 10.0.1.0 0.0.0.255 host 10.0.2.100 eq 161', 'exit', 'do show access-lists'], note: 'DNS 53, TFTP 69, NTP 123, SNMP 161 — four UDP services worth knowing cold. Note DNS uses TCP 53 as well, for large responses and zone transfers.' },
    { d: 'R1', t: 'Replace several lines with a single range.', c: ['ip access-list extended SERVICES', 'permit tcp 10.0.1.0 0.0.0.255 host 10.0.2.100 range 20 21', 'exit', 'do show access-lists'], note: 'FTP uses two ports: 21 for commands, 20 for data. <code>range</code> takes both in one line instead of two.' },
    { d: 'R1', t: 'Allow return traffic without opening anything inward.', c: ['ip access-list extended RETURN-ONLY', 'permit tcp any 10.0.1.0 0.0.0.255 established', 'permit icmp any any', 'exit', 'do show access-lists'], note: '<code>established</code> matches segments with the ACK or RST flag set — that is, replies in a conversation the inside started. New inbound sessions have neither flag and are dropped.' },
    { d: 'R1', t: 'Apply the return filter on the user-facing interface.', c: ['interface g0/0', 'ip access-group RETURN-ONLY out', 'end', 'show ip interface g0/0'], note: 'Traffic heading back towards the users is now allowed only if it belongs to a session they started. A basic stateless firewall, built from one keyword.' },
    { d: 'PC1', t: 'Test what your rules permit and forbid.', c: ['ping 10.0.2.100'], note: 'ICMP is permitted in both lists, so ping still works — which is why you added that line. Web, SSH, DNS, TFTP, NTP and SNMP are allowed; everything else to that server is denied.' },
    { d: 'R1', t: 'Read the whole list back, line by line.', c: ['show access-lists', 'show ip interface g0/1'], note: 'Sequence numbers, protocol, source, destination, operator and port. Be able to say out loud what every line does — that is the standard to aim for.' },
    { d: 'R1', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show access-lists', 'show ip interface g0/1', 'show ip interface g0/0', 'show running-config'],
  explain: `<h3>TCP versus UDP</h3>
<p><b>TCP</b> is connection-oriented: a three-way handshake (SYN, SYN-ACK, ACK) opens the session, sequence numbers reorder what arrives out of order, acknowledgements trigger retransmission of anything lost, and a sliding window controls flow. It costs overhead and delay, and it guarantees delivery. Use it for web, email, file transfer, SSH.</p>
<p><b>UDP</b> just sends. No handshake, no sequencing, no retransmission, an 8-byte header against TCP's 20. Anything lost is lost. Use it where late data is worse than missing data — voice, video, DNS lookups, DHCP, TFTP, SNMP, syslog.</p>
<h3>The port numbers to know on sight</h3>
<table>
<tr><td>FTP data/control</td><td><b>TCP 20, 21</b></td><td>SSH</td><td><b>TCP 22</b></td></tr>
<tr><td>Telnet</td><td><b>TCP 23</b></td><td>SMTP</td><td><b>TCP 25</b></td></tr>
<tr><td>DNS</td><td><b>UDP/TCP 53</b></td><td>DHCP</td><td><b>UDP 67, 68</b></td></tr>
<tr><td>TFTP</td><td><b>UDP 69</b></td><td>HTTP</td><td><b>TCP 80</b></td></tr>
<tr><td>POP3</td><td><b>TCP 110</b></td><td>NTP</td><td><b>UDP 123</b></td></tr>
<tr><td>SNMP</td><td><b>UDP 161, 162</b></td><td>HTTPS</td><td><b>TCP 443</b></td></tr>
<tr><td>Syslog</td><td><b>UDP 514</b></td><td>RADIUS</td><td><b>UDP 1812, 1813</b></td></tr>
</table>
<p>Ports 0-1023 are well-known (servers listen here), 1024-49151 are registered, and 49152-65535 are ephemeral — the random source port your client picks for each conversation. That source port is how your machine keeps six browser tabs apart while all of them talk to port 443.</p>
<h3>Reading layer 4 in an ACL</h3>
<p><code>permit tcp 10.0.1.0 0.0.0.255 host 10.0.2.100 eq 80</code> reads: protocol TCP, from that source network, to that one host, where the destination port equals 80. The operators are <code>eq</code> (equal), <code>neq</code>, <code>gt</code>, <code>lt</code> and <code>range x y</code>. A port written before the destination address matches the SOURCE port — a subtle and frequently-tested distinction.</p>
<p><code>established</code> matches TCP segments carrying ACK or RST, meaning they belong to a session that already exists. Permitting established inbound while denying new inbound sessions is the cheapest firewall there is, and it works only for TCP — UDP has no flags to inspect.</p>`,
  checks: [
    { desc: 'The SERVICES list permits HTTP and HTTPS', fn: H => { const a = H.d('R1').acls['SERVICES']; return !!a && a.entries.some(e => e.dstPort === 80) && a.entries.some(e => e.dstPort === 443); } },
    { desc: 'It also permits SSH and ICMP', fn: H => { const a = H.d('R1').acls['SERVICES']; return !!a && a.entries.some(e => e.dstPort === 22) && a.entries.some(e => e.proto === 'icmp'); } },
    { desc: 'The four UDP services are permitted', fn: H => { const a = H.d('R1').acls['SERVICES']; return !!a && [53, 69, 123, 161].every(p => a.entries.some(e => e.dstPort === p && e.proto === 'udp')); } },
    { desc: 'A port range was used for FTP', fn: H => { const a = H.d('R1').acls['SERVICES']; return !!a && a.entries.some(e => e.portOp === 'range'); } },
    { desc: 'The SERVICES list is applied outbound towards the server', fn: H => H.i('R1', 'g0/1').aclOut === 'SERVICES' },
    { desc: 'A return-traffic list uses the established keyword', fn: H => { const a = H.d('R1').acls['RETURN-ONLY']; return !!a && a.entries.some(e => /established/.test(e.raw)); } },
    { desc: 'The return list is applied towards the users', fn: H => H.i('R1', 'g0/0').aclOut === 'RETURN-ONLY' },
    { desc: 'Permitted traffic still reaches the server', fn: H => H.ping('PC1', '10.0.2.100') },
    { desc: 'R1 saved', fn: H => H.saved('R1') },
  ],
});

window.ND = ND;
})();
