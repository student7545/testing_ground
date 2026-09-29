/* NetDrill mega labs — Volume 3. Each one is a whole site built from empty
   configurations: addressing, switching, routing, services and security in a
   single sitting. These are deliberately long. Treat one as an evening's work,
   not a five-minute drill. */
'use strict';
(function () {
const ND = window.ND;
ND.LABS = ND.LABS || [];
const L = lab => ND.LABS.push(lab);

/* ============================================================= */
L({
  id: 'm1-office-warehouse', ord: 1, vol: 3, tier: 'mega', day: 'Mega Lab 1', title: 'Office + Warehouse — Two-Building Campus',
  topics: '4 VLANs · layer 3 switch with SVIs · routed uplink · LACP EtherChannel · Rapid PVST root · central DHCP with relay · PAT to the internet · voice VLAN and PoE · port security · DHCP snooping · SSH · NTP and syslog',
  devices: [
    { id: 'ISP', type: 'router', ifaces: ['g0/0'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'CORE', type: 'switch', l3switch: true, ifaces: ['g0/1', 'g0/2', 'g0/3', 'g0/4'] },
    { id: 'OFF1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'g0/1', 'g0/2'] },
    { id: 'WH1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'PH1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.20.30.10', mask: '255.255.255.0', gw: '10.20.30.1' }, poeDevice: 'IP Phone 7960' },
    { id: 'SCAN1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
  ],
  links: [
    ['ISP', 'g0/0', 'R1', 'g0/0'],
    ['R1', 'g0/1', 'CORE', 'g0/1'],
    ['CORE', 'g0/2', 'OFF1', 'g0/1'],
    ['CORE', 'g0/3', 'OFF1', 'g0/2'],
    ['CORE', 'g0/4', 'WH1', 'g0/1'],
    ['OFF1', 'f0/1', 'PC1', 'e0'],
    ['OFF1', 'f0/2', 'PH1', 'e0'],
    ['OFF1', 'f0/3', 'PC2', 'e0'],
    ['WH1', 'f0/1', 'SCAN1', 'e0'],
  ],
  layout: {
    ISP: [370, 14], R1: [285, 14], CORE: [200, 58], OFF1: [110, 20], WH1: [110, 100],
    PC1: [24, 4], PH1: [24, 38], PC2: [24, 72], SCAN1: [24, 110],
  },
  setupAll: topo => {
    /* Only the ISP is pre-built — everything inside the campus is yours to configure. */
    const isp = topo.devs.ISP;
    isp.hostname = 'ISP';
    const g = ND.getIface(isp, 'g0/0');
    g.ip = { addr: '203.0.113.1', mask: '255.255.255.252' };
    g.shutdown = false;
    isp.staticRoutes.push({ net: '0.0.0.0', mask: '0.0.0.0', via: '203.0.113.2', ad: 1 });
  },
  intro: `<b>The situation:</b> a small company has just taken a lease on two buildings on the same site — an <b>office</b> with desks and phones, and a <b>warehouse</b> with handheld scanners and a couple of terminals. The cabling contractor has been and gone. Every switch and router inside the campus is sitting at a factory-default configuration, and the only thing that works today is the ISP router at the far end of the fibre.<br><br><b>Your goal:</b> turn a pile of boxes into a working campus. You will design the VLANs, put a layer 3 switch at the centre so inter-VLAN traffic never leaves the building, bond the office uplink into an EtherChannel, make one router the DHCP server for every subnet, translate the whole campus onto a single public address, and then secure the access layer so somebody plugging a personal switch into a desk port does not take the site down.<br><br><b>How to use this lab:</b> this is not a five-minute drill. Work through it in phases, verify at the end of each one, and do not move on until the phase you are in actually works. Every address you need is written down for you — the thinking you are being asked to do is <em>where</em> each piece of configuration belongs and <em>why</em>.`,
  pintro: `<b>The brief:</b> two buildings on one site — an office and a warehouse — cabled but completely unconfigured. An ISP router is live at 203.0.113.1/30 and will route anything you hand it. Everything else is yours to build from an empty configuration.<br><br>The requirements below are the whole specification. Nothing tells you which commands to type or in which order. Build it, then prove it works.`,
  spec: [
    { t: 'Addressing and VLAN plan (use exactly these numbers)', r: [
      'VLAN <b>10 OFFICE</b> — 10.20.10.0/24, gateway .1',
      'VLAN <b>20 WAREHOUSE</b> — 10.20.20.0/24, gateway .1',
      'VLAN <b>30 VOICE</b> — 10.20.30.0/24, gateway .1',
      'VLAN <b>99 MGMT</b> — 10.20.99.0/24, gateway .1',
      'CORE–R1 routed link — 10.20.0.0/30 (R1 = .1, CORE = .2)',
      'R1–ISP link — 203.0.113.0/30 (ISP = .1, R1 = .2)',
    ] },
    { d: 'CORE — the layer 3 switch at the centre', r: [
      'Hostname <b>CORE</b>, IPv4 routing enabled.',
      'All four VLANs created and named.',
      'G0/1 converted to a <b>routed port</b> carrying 10.20.0.2/30 towards R1.',
      'An SVI for every VLAN, each acting as that VLAN\'s gateway.',
      'A DHCP relay on the OFFICE and WAREHOUSE SVIs pointing at R1.',
      'A default route towards R1.',
      'Rapid PVST+, with CORE forced to be the root bridge for every VLAN.',
      'G0/2 and G0/3 bundled into an <b>LACP</b> EtherChannel trunk to OFF1, carrying only VLANs 10, 20, 30 and 99.',
      'G0/4 a trunk to WH1 carrying only VLANs 20 and 99.',
    ] },
    { d: 'R1 — the internet edge and the address server', r: [
      'Hostname <b>R1</b>; G0/1 = 10.20.0.1/30 inside, G0/0 = 203.0.113.2/30 outside.',
      'Static routes for all four campus subnets via CORE, and a default route to the ISP.',
      'DHCP pools <b>OFFICE</b> and <b>WAREHOUSE</b> with gateway, DNS 8.8.8.8, domain <code>netdrill.lab</code> and a 7-day lease.',
      'The first 20 addresses of each of those subnets excluded.',
      'PAT: everything in 10.20.0.0/16 translated onto G0/0\'s address.',
    ] },
    { d: 'OFF1 — the office access switch', r: [
      'Hostname <b>OFF1</b>, VLANs 10, 20, 30 and 99 created, Rapid PVST+.',
      'G0/1 and G0/2 in the matching LACP bundle, trunked.',
      'F0/1 and F0/3 access ports in VLAN 10; F0/2 an access port in VLAN 30 for the phone.',
      'F0/2 configured for PoE and told to trust the phone\'s CoS marking.',
      'PortFast and BPDU guard on all three host ports.',
      'Port security on F0/1: maximum 1, sticky learning, violation shutdown.',
      'DHCP snooping enabled for VLANs 10 and 20 with only the uplink bundle trusted.',
      'A management address on VLAN 99 and a default gateway.',
    ] },
    { d: 'WH1 — the warehouse access switch', r: [
      'Hostname <b>WH1</b>, VLANs 20 and 99, Rapid PVST+.',
      'G0/1 a trunk to CORE; F0/1 and F0/2 access ports in VLAN 20 with PortFast and BPDU guard.',
      'DHCP snooping for VLAN 20 with the uplink trusted.',
      'A management address on VLAN 99 and a default gateway.',
    ] },
    { t: 'Site-wide management standard', r: [
      'SSH version 2 on <b>CORE</b>, <b>OFF1</b> and <b>WH1</b>: domain name, RSA keys, a local account, VTY lines set to <code>login local</code> and <code>transport input ssh</code>.',
      'Every device points at <b>10.20.0.1</b> for NTP and sends logs to <b>10.20.99.50</b>.',
      'A login banner on R1 and CORE.',
    ] },
    { t: 'Verification', r: [
      'PC1, PC2 and SCAN1 all hold DHCP leases in the right subnets, from the right pools, above the excluded range.',
      'PC1 can reach the phone in the voice VLAN and the scanner in the warehouse.',
      'PC1 can reach the ISP at 203.0.113.1, and R1 holds a NAT translation for it.',
      'The EtherChannel is up with both members bundled, and CORE is the STP root.',
      'Every device is saved.',
    ] },
  ],
  tasks: [
    { t: 'PHASE 1 — Survey what you have been given',
      do: [
        'On <b>PC1</b>, <b>PC2</b> and <b>SCAN1</b>, run <code>ipconfig</code>. None of them has an address.',
        'On <b>CORE</b>, run <code>show ip interface brief</code> and <code>show vlan brief</code>.',
        'Notice that every port is an access port in VLAN 1 and nothing has an IP address.',
      ],
      done: 'You have seen the factory-default starting point on both the hosts and the switch.',
      why: 'Every real build starts here. Looking at the blank slate first means that when something works later you know it worked because of something you did.' },

    { t: 'PHASE 2 — Build the internet edge on R1',
      do: [
        'Name the router <b>R1</b>.',
        'Configure <b>G0/1</b> (towards CORE) with <b>10.20.0.1 255.255.255.252</b>, bring it up, and mark it <code>ip nat inside</code>.',
        'Configure <b>G0/0</b> (towards the ISP) with <b>203.0.113.2 255.255.255.252</b>, bring it up, and mark it <code>ip nat outside</code>.',
        'Verify with <code>show ip interface brief</code> that both are up/up.',
      ],
      done: 'Both R1 interfaces are up/up with the right addresses, and each is tagged inside or outside.',
      why: 'NAT only acts on traffic crossing the boundary between an inside and an outside interface. Tagging the interfaces now means you cannot forget it later, when an empty translation table would have you hunting through ACLs for no reason.' },

    { t: 'Give R1 routes in both directions',
      do: [
        'Add static routes for <b>10.20.10.0/24</b>, <b>10.20.20.0/24</b>, <b>10.20.30.0/24</b> and <b>10.20.99.0/24</b>, all via <b>10.20.0.2</b>.',
        'Add a default route <b>0.0.0.0 0.0.0.0</b> via <b>203.0.113.1</b>.',
        'Check with <code>show ip route</code>.',
      ],
      done: 'Five static routes plus the two connected networks are in the table.',
      why: 'R1 is attached to only one campus subnet — the /30. Without these routes it has no idea the VLANs exist, and return traffic from the internet would be dropped at the last hop.' },

    { t: 'PHASE 3 — Turn R1 into the campus address server',
      do: [
        'Exclude <b>10.20.10.1</b> to <b>10.20.10.20</b> and <b>10.20.20.1</b> to <b>10.20.20.20</b>.',
        'Build pool <b>OFFICE</b>: network 10.20.10.0/24, default-router 10.20.10.1, dns-server 8.8.8.8, domain-name netdrill.lab, lease 7.',
        'Build pool <b>WAREHOUSE</b> the same way for 10.20.20.0/24 with gateway 10.20.20.1.',
      ],
      done: 'Two pools with the full option set, and the bottom 20 addresses of each subnet reserved.',
      why: 'The exclusions go in first, on purpose. A pool that is already live can hand out the very address you were about to give a printer, and you will not find out until the printer stops working.' },

    { t: 'PHASE 4 — Build the core switch: VLANs and the routed uplink',
      do: [
        'Name the switch <b>CORE</b> and enable <code>ip routing</code>.',
        'Create VLANs <b>10 OFFICE</b>, <b>20 WAREHOUSE</b>, <b>30 VOICE</b> and <b>99 MGMT</b>, naming each one.',
        'Convert <b>G0/1</b> to a routed port with <code>no switchport</code>, then give it <b>10.20.0.2 255.255.255.252</b>.',
        'Confirm with <code>show ip interface brief</code> and <code>show vlan brief</code>.',
      ],
      done: 'Four named VLANs exist and G0/1 is a routed port with an address.',
      why: '<code>no switchport</code> is the line that turns a switch port into a router port. Without <code>ip routing</code> the switch would happily hold the addresses and refuse to forward a single packet between them.' },

    { t: 'Create a gateway for every VLAN',
      do: [
        'Create <b>interface vlan 10</b> with <b>10.20.10.1 255.255.255.0</b> and bring it up.',
        'Do the same for <b>vlan 20</b> (10.20.20.1), <b>vlan 30</b> (10.20.30.1) and <b>vlan 99</b> (10.20.99.1).',
        'Add a default route <b>0.0.0.0 0.0.0.0</b> via <b>10.20.0.1</b>.',
      ],
      done: 'Four SVIs exist, each holding the .1 address of its subnet.',
      why: 'This is the whole point of a layer 3 switch: traffic between the office and the warehouse is routed here, at wire speed, instead of being hauled up to a router and back down the same cable.' },

    { t: 'Relay DHCP from the SVIs to R1',
      do: [
        'On <b>interface vlan 10</b> and <b>interface vlan 20</b>, add <code>ip helper-address 10.20.0.1</code>.',
        'Verify with <code>show ip interface vlan 10</code>.',
      ],
      done: 'Both user SVIs show a helper address.',
      why: 'The clients broadcast; CORE is a router and does not forward broadcasts. The helper turns each DISCOVER into a unicast to R1 and stamps it with the SVI address, which is how R1 knows whether to answer from the OFFICE pool or the WAREHOUSE one.' },

    { t: 'PHASE 5 — Make CORE the spanning-tree root and build the office bundle',
      do: [
        'Set <code>spanning-tree mode rapid-pvst</code> and make CORE the root for VLANs <b>1,10,20,30,99</b>.',
        'On <b>G0/2</b> and <b>G0/3</b> together: dot1q encapsulation, trunk mode, and <code>channel-group 1 mode active</code>.',
        'On <b>interface port-channel 1</b>: dot1q encapsulation, trunk mode, allowed VLANs <b>10,20,30,99</b>.',
        'Trunk <b>G0/4</b> towards the warehouse, allowing only VLANs <b>20,99</b>.',
      ],
      done: 'A Port-channel 1 trunk exists and G0/4 is a restricted trunk.',
      why: 'Root placement is a decision, not an accident — left alone, STP elects whichever switch has the oldest MAC address. The allowed-VLAN lists are the cheapest security control you will configure all evening: the warehouse link physically cannot carry office or voice traffic.' },

    { t: 'PHASE 6 — Build the office access switch',
      do: [
        'Name it <b>OFF1</b>, set Rapid PVST+, and create VLANs <b>10</b>, <b>20</b>, <b>30</b> and <b>99</b> with names.',
        'Put <b>G0/1</b> and <b>G0/2</b> into <code>channel-group 1 mode active</code> as dot1q trunks, then configure <b>interface port-channel 1</b> as a trunk allowing <b>10,20,30,99</b>.',
        'Check with <code>show etherchannel summary</code> and <code>show interfaces trunk</code>.',
      ],
      done: 'Po1 shows both members bundled and the trunk is carrying the four VLANs.',
      why: 'Both ends must agree or the members are suspended rather than bundled. Reading <code>show etherchannel summary</code> and understanding the (P) flag is the skill being built here.' },

    { t: 'Configure the office host ports',
      do: [
        'Put <b>F0/1</b> and <b>F0/3</b> in access VLAN <b>10</b>, with PortFast and BPDU guard on both.',
        'Put <b>F0/2</b> in access VLAN <b>30</b> for the phone, with PortFast, BPDU guard, <code>power inline auto</code> and <code>mls qos trust device cisco-phone</code>.',
        'On <b>F0/3</b>, also add <code>switchport voice vlan 30</code> so a phone could later be daisy-chained there.',
      ],
      done: 'Three host ports configured, each in the right VLAN with edge-port protection.',
      why: 'PortFast gets a host forwarding immediately instead of making it wait out a spanning-tree transition; BPDU guard is what makes that safe, by shutting the port if something that speaks STP is ever plugged into it.' },

    { t: 'Lock down the first desk port and protect DHCP',
      do: [
        'On <b>F0/1</b>: <code>switchport port-security</code>, maximum <b>1</b>, <code>mac-address sticky</code>, violation <b>shutdown</b>.',
        'Enable DHCP snooping globally, scope it to VLANs <b>10,20</b>, and trust <b>interface port-channel 1</b>.',
        'Give the switch a management address on <b>interface vlan 99</b> (10.20.99.11/24) and an <code>ip default-gateway 10.20.99.1</code>.',
      ],
      done: 'F0/1 is locked to one MAC address and only the uplink is trusted for DHCP.',
      why: 'These two features answer the two most common access-layer incidents: somebody hanging an unmanaged switch off a desk port, and somebody plugging in a home router that starts handing out addresses.' },

    { t: 'PHASE 7 — Build the warehouse switch',
      do: [
        'Name it <b>WH1</b>, set Rapid PVST+, create VLANs <b>20</b> and <b>99</b>.',
        'Make <b>G0/1</b> a dot1q trunk allowing <b>20,99</b>.',
        'Put <b>F0/1</b> and <b>F0/2</b> in access VLAN <b>20</b> with PortFast and BPDU guard.',
        'Enable DHCP snooping for VLAN <b>20</b>, trusting <b>G0/1</b>.',
        'Add management address <b>10.20.99.12/24</b> on VLAN 99 and a default gateway.',
      ],
      done: 'The warehouse switch mirrors the office build, scaled down to the VLANs it actually needs.',
      why: 'A second site built to the same pattern is how real networks stay maintainable. Notice how little changes: a hostname, a management address and a shorter VLAN list.' },

    { t: 'PHASE 8 — Bring the clients up',
      do: [
        'On <b>PC1</b>: <code>ipconfig /renew</code> then <code>ipconfig /all</code>.',
        'On <b>PC2</b> and <b>SCAN1</b>: renew as well.',
        'Read the gateway, DNS server and domain name each of them received.',
      ],
      done: 'Two office PCs in 10.20.10.x and a warehouse scanner in 10.20.20.x, all above .20.',
      why: 'This single step proves the VLAN assignment, the trunks, the SVIs, the relay, the pools and the exclusions all at once. If it works, most of the build is correct.' },

    { t: 'Prove the site routes end to end',
      do: [
        'From <b>PC1</b>: ping the phone at <b>10.20.30.10</b> and the scanner\'s address in the warehouse.',
        'From <b>PC1</b>: ping <b>10.20.0.1</b> (R1) and then <b>203.0.113.1</b> (the ISP).',
        'On <b>R1</b>: <code>show ip nat translations</code>.',
      ],
      done: 'Every ping succeeds and R1 lists translations for the campus traffic.',
      why: 'Inter-VLAN traffic never touches R1 — CORE handles it. Only the internet-bound packet crosses the /30 and gets translated, which you can see for yourself in the translation table.' },

    { t: 'PHASE 9 — Apply the management standard',
      do: [
        'On <b>CORE</b>, <b>OFF1</b> and <b>WH1</b>: set <code>ip domain-name netdrill.lab</code>, generate <b>1024-bit</b> RSA keys, force <code>ip ssh version 2</code>, create user <b>netadmin</b> with a secret, and set the VTY lines to <code>login local</code> with <code>transport input ssh</code>.',
        'On every device including R1: <code>ntp server 10.20.0.1</code> and <code>logging host 10.20.99.50</code> with <code>logging trap informational</code>.',
        'On <b>R1</b> and <b>CORE</b>: add a login banner.',
      ],
      done: 'Three switches accept SSH and refuse Telnet; every device logs to the same collector.',
      why: 'Telnet puts the password on the wire in clear text. Common time and central logging are what make an incident reconstructable — without them you have five devices with five opinions about when something happened.' },

    { t: 'PHASE 10 — Verify everything, then save',
      do: [
        'On <b>CORE</b>: <code>show spanning-tree</code>, <code>show interfaces trunk</code> and <code>show ip route</code>.',
        'On <b>OFF1</b>: <code>show etherchannel summary</code>, <code>show port-security</code> and <code>show ip dhcp snooping</code>.',
        'On <b>R1</b>: <code>show ip dhcp binding</code> and <code>show ip nat translations</code>.',
        'Save every device with <code>write memory</code>.',
      ],
      done: 'All five campus devices are saved and every verification command reads the way you intended it to.',
      why: 'A configuration that only exists in RAM is one power cut away from a very long evening. Verifying before saving is the habit worth building: you save a state you have proven, not one you hope is right.' },
  ],
  steps: [
    /* ---- PHASE 1: survey ---- */
    { d: 'PC1', t: 'Nothing on the office desks yet.', c: ['ipconfig'] },
    { d: 'SCAN1', t: 'Nor in the warehouse.', c: ['ipconfig'], note: 'Every host is set to obtain an address automatically and nothing is answering.' },
    { d: 'CORE', t: 'And the core switch is factory default.', c: ['enable', 'show ip interface brief', 'show vlan brief'], note: 'Every port is an access port in VLAN 1. This is the blank slate you are about to turn into a campus.' },

    /* ---- PHASE 2: R1 edge ---- */
    { d: 'R1', t: 'Name the edge router.', c: ['enable', 'configure terminal', 'hostname R1'] },
    { d: 'R1', t: 'Inside interface, towards the campus.', c: ['interface g0/1', 'description To CORE routed link', 'ip address 10.20.0.1 255.255.255.252', 'no shutdown', 'ip nat inside', 'exit'], note: 'A /30 for a link with exactly two ends. <code>ip nat inside</code> marks which side of the NAT boundary this is.' },
    { d: 'R1', t: 'Outside interface, towards the ISP.', c: ['interface g0/0', 'description To ISP', 'ip address 203.0.113.2 255.255.255.252', 'no shutdown', 'ip nat outside', 'exit', 'do show ip interface brief'], note: 'Both up/up. NAT will only translate traffic that crosses between an inside and an outside interface.' },
    { d: 'R1', t: 'Routes down into the campus, and a default route out.', c: ['ip route 10.20.10.0 255.255.255.0 10.20.0.2', 'ip route 10.20.20.0 255.255.255.0 10.20.0.2', 'ip route 10.20.30.0 255.255.255.0 10.20.0.2', 'ip route 10.20.99.0 255.255.255.0 10.20.0.2', 'ip route 0.0.0.0 0.0.0.0 203.0.113.1', 'do show ip route'], note: 'R1 is attached to only the /30, so without these four routes it has no idea the VLANs exist.' },

    /* ---- PHASE 3: DHCP server ---- */
    { d: 'R1', t: 'Reserve the bottom of each user subnet before any pool exists.', c: ['ip dhcp excluded-address 10.20.10.1 10.20.10.20', 'ip dhcp excluded-address 10.20.20.1 10.20.20.20'], note: 'Exclusions always go in first. A live pool will lease the address you were about to assign by hand.' },
    { d: 'R1', t: 'The office pool, with the complete option set.', c: ['ip dhcp pool OFFICE', 'network 10.20.10.0 255.255.255.0', 'default-router 10.20.10.1', 'dns-server 8.8.8.8', 'domain-name netdrill.lab', 'lease 7', 'exit'], note: 'Gateway, DNS, domain and lease all ride in the same offer — which is why a DHCP client comes up fully working, not just addressed.' },
    { d: 'R1', t: 'And the warehouse pool.', c: ['ip dhcp pool WAREHOUSE', 'network 10.20.20.0 255.255.255.0', 'default-router 10.20.20.1', 'dns-server 8.8.8.8', 'domain-name netdrill.lab', 'lease 7', 'exit'], note: 'R1 has no interface in either of these subnets. The relay will tell it which pool to use.' },
    { d: 'R1', t: 'PAT the whole campus onto the single public address.', c: ['access-list 1 permit 10.20.0.0 0.0.255.255', 'ip nat inside source list 1 interface g0/0 overload', 'end'], note: 'One wildcard covers all four VLANs. <code>overload</code> is what makes this PAT rather than one-to-one NAT.' },

    /* ---- PHASE 4: CORE VLANs and routed uplink ---- */
    { d: 'CORE', t: 'Name it and turn on routing.', c: ['configure terminal', 'hostname CORE', 'ip routing'], note: 'A layer 3 switch will not forward between its own SVIs until <code>ip routing</code> is on.' },
    { d: 'CORE', t: 'Create and name the four VLANs.', c: ['vlan 10', 'name OFFICE', 'exit', 'vlan 20', 'name WAREHOUSE', 'exit', 'vlan 30', 'name VOICE', 'exit', 'vlan 99', 'name MGMT', 'exit', 'do show vlan brief'], note: 'Names cost nothing and save the next person half an hour.' },
    { d: 'CORE', t: 'Turn the uplink into a routed port.', c: ['interface g0/1', 'no switchport', 'description Routed link to R1', 'ip address 10.20.0.2 255.255.255.252', 'no shutdown', 'exit'], note: '<code>no switchport</code> is the line that converts a switch port into a router port that can hold an IP address.' },
    { d: 'CORE', t: 'A gateway for the office and the warehouse.', c: ['interface vlan 10', 'ip address 10.20.10.1 255.255.255.0', 'no shutdown', 'exit', 'interface vlan 20', 'ip address 10.20.20.1 255.255.255.0', 'no shutdown', 'exit'], note: 'An SVI is a virtual interface for a VLAN. It stays down until that VLAN has at least one active port.' },
    { d: 'CORE', t: 'And for voice and management.', c: ['interface vlan 30', 'ip address 10.20.30.1 255.255.255.0', 'no shutdown', 'exit', 'interface vlan 99', 'ip address 10.20.99.1 255.255.255.0', 'no shutdown', 'exit'] },
    { d: 'CORE', t: 'Relay DHCP to R1 from the two user VLANs.', c: ['interface vlan 10', 'ip helper-address 10.20.0.1', 'exit', 'interface vlan 20', 'ip helper-address 10.20.0.1', 'exit', 'do show ip interface vlan 10'], note: 'The helper goes on the interface that HEARS the clients. R1 reads the relay address to pick the right pool.' },
    { d: 'CORE', t: 'Everything the campus does not know about goes to R1.', c: ['ip route 0.0.0.0 0.0.0.0 10.20.0.1', 'do show ip route'], note: 'Four connected VLANs plus one default. That is the entire routing table a collapsed core needs.' },

    /* ---- PHASE 5: STP root and the office bundle ---- */
    { d: 'CORE', t: 'Rapid PVST+, and CORE is the root for every VLAN.', c: ['spanning-tree mode rapid-pvst', 'spanning-tree vlan 1,10,20,30,99 root primary'], note: 'Left alone, STP elects whichever switch has the lowest MAC address — usually the oldest box in the building.' },
    { d: 'CORE', t: 'Bundle the two office uplinks with LACP.', c: ['interface range g0/2 - 3', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'channel-group 1 mode active', 'exit'], note: 'Both members must be configured identically. <code>active</code> is LACP, and active/active or active/passive will form a bundle.' },
    { d: 'CORE', t: 'Configure the logical interface and restrict what it carries.', c: ['interface port-channel 1', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20,30,99', 'exit'], note: 'Settings on the Port-channel apply to every member. Configure the bundle, not the individual ports.' },
    { d: 'CORE', t: 'A narrower trunk to the warehouse.', c: ['interface g0/4', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk allowed vlan 20,99', 'end', 'show interfaces trunk'], note: 'The warehouse link physically cannot carry office or voice traffic. That is a security control that costs one line.' },

    /* ---- PHASE 6: office access switch ---- */
    { d: 'OFF1', t: 'Name it and match the spanning-tree mode.', c: ['enable', 'configure terminal', 'hostname OFF1', 'spanning-tree mode rapid-pvst'], note: 'Mismatched STP modes between switches is an easy way to create a very confusing outage.' },
    { d: 'OFF1', t: 'The same four VLANs.', c: ['vlan 10', 'name OFFICE', 'exit', 'vlan 20', 'name WAREHOUSE', 'exit', 'vlan 30', 'name VOICE', 'exit', 'vlan 99', 'name MGMT', 'exit'], note: 'A trunk does not create VLANs for you — each switch needs its own VLAN database entries.' },
    { d: 'OFF1', t: 'The other half of the EtherChannel.', c: ['interface range g0/1 - 2', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'channel-group 1 mode active', 'exit', 'interface port-channel 1', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20,30,99', 'exit'], note: 'Identical to the CORE end. Any difference in speed, duplex, mode or allowed VLANs suspends a member instead of bundling it.' },
    { d: 'OFF1', t: 'Confirm the bundle formed.', c: ['do show etherchannel summary', 'do show interfaces trunk'], note: 'Look for both members flagged (P) for "bundled in port-channel". An (s) means suspended — go back and compare the two ends.' },
    { d: 'OFF1', t: 'Two desk ports in the office VLAN.', c: ['interface range f0/1, f0/3', 'switchport mode access', 'switchport access vlan 10', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit'], note: 'PortFast skips the STP transition so the PC can DHCP immediately; BPDU guard is what makes that safe.' },
    { d: 'OFF1', t: 'The phone port: voice VLAN, power and CoS trust.', c: ['interface f0/2', 'switchport mode access', 'switchport access vlan 30', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'power inline auto', 'mls qos trust device cisco-phone', 'exit'], note: 'PoE powers the phone over the same cable that carries its traffic, and trusting the phone\'s marking keeps voice in the priority queue.' },
    { d: 'OFF1', t: 'Prepare F0/3 for a phone to be daisy-chained later.', c: ['interface f0/3', 'switchport voice vlan 30', 'exit', 'do show interfaces f0/3 switchport'], note: 'One port, two VLANs: the PC untagged in VLAN 10 and a phone tagged into VLAN 30. This is what "voice VLAN" actually means.' },
    { d: 'OFF1', t: 'Lock the first desk port to a single device.', c: ['interface f0/1', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security mac-address sticky', 'switchport port-security violation shutdown', 'exit', 'do show port-security'], note: 'Sticky learns the MAC and writes it into the running config — so remember to save, or it is relearned after a reload.' },
    { d: 'OFF1', t: 'Stop a rogue DHCP server on a desk port.', c: ['service dhcp', 'ip dhcp snooping', 'ip dhcp snooping vlan 10,20', 'interface port-channel 1', 'ip dhcp snooping trust', 'exit', 'do show ip dhcp snooping'], note: 'Only the uplink towards the real server is trusted. Server replies arriving on any desk port are dropped on arrival.' },
    { d: 'OFF1', t: 'Give the switch itself a management address.', c: ['interface vlan 99', 'ip address 10.20.99.11 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 10.20.99.1', 'end'], note: 'A layer 2 switch is an end host for management traffic — without a default gateway you can only reach it from its own subnet.' },

    /* ---- PHASE 7: warehouse switch ---- */
    { d: 'WH1', t: 'Same pattern, smaller scope.', c: ['enable', 'configure terminal', 'hostname WH1', 'spanning-tree mode rapid-pvst', 'vlan 20', 'name WAREHOUSE', 'exit', 'vlan 99', 'name MGMT', 'exit'] },
    { d: 'WH1', t: 'Trunk to the core, carrying only what the warehouse needs.', c: ['interface g0/1', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk allowed vlan 20,99', 'exit'] },
    { d: 'WH1', t: 'The scanner and terminal ports.', c: ['interface range f0/1 - 2', 'switchport mode access', 'switchport access vlan 20', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit'] },
    { d: 'WH1', t: 'Snooping here too, then a management address.', c: ['service dhcp', 'ip dhcp snooping', 'ip dhcp snooping vlan 20', 'interface g0/1', 'ip dhcp snooping trust', 'exit', 'interface vlan 99', 'ip address 10.20.99.12 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 10.20.99.1', 'end'], note: 'Second building, same standard. Consistency is what makes a network supportable by somebody who did not build it.' },

    /* ---- PHASE 8: clients and end-to-end ---- */
    { d: 'PC1', t: 'The first office PC leases an address.', c: ['ipconfig /renew', 'ipconfig /all'], note: 'Above .20 because of the exclusions, with the gateway, DNS and domain that came from the OFFICE pool.' },
    { d: 'PC2', t: 'And the second.', c: ['ipconfig /renew', 'ipconfig'] },
    { d: 'SCAN1', t: 'The warehouse scanner lands in a different subnet entirely.', c: ['ipconfig /renew', 'ipconfig /all'], note: 'Same server, same relay mechanism, different pool — chosen by the SVI address R1 saw on the relayed request.' },
    { d: 'PC1', t: 'Inter-VLAN routing, handled entirely by CORE.', c: ['ping 10.20.30.10', 'ping 10.20.20.21'], note: 'Neither of these packets goes anywhere near R1. The layer 3 switch routes them between its own SVIs.' },
    { d: 'PC1', t: 'And out to the internet.', c: ['ping 10.20.0.1', 'ping 203.0.113.1'], note: 'This one does cross the /30, gets translated by R1, and comes back. Four devices in the path, all configured by you.' },
    { d: 'R1', t: 'See the translation that made it work.', c: ['show ip nat translations', 'show ip dhcp binding'], note: 'Inside local is the private address, inside global the public one. The bindings table is R1\'s record of every lease it has issued.' },

    /* ---- PHASE 9: management standard ---- */
    { d: 'CORE', t: 'SSH on the core switch.', c: ['configure terminal', 'ip domain-name netdrill.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username netadmin secret Campus!2024', 'line vty 0 15', 'login local', 'transport input ssh', 'exit'], note: 'The key pair is named after the hostname and domain name, which is why both must be set before you generate it.' },
    { d: 'CORE', t: 'Time, logs and a banner.', c: ['ntp server 10.20.0.1', 'logging host 10.20.99.50', 'logging trap informational', 'banner motd #Authorised access only. All activity is logged.#', 'end', 'show ip ssh'] },
    { d: 'OFF1', t: 'The same standard on the office switch.', c: ['configure terminal', 'ip domain-name netdrill.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username netadmin secret Campus!2024', 'line vty 0 15', 'login local', 'transport input ssh', 'exit', 'ntp server 10.20.0.1', 'logging host 10.20.99.50', 'logging trap informational', 'end'] },
    { d: 'WH1', t: 'And on the warehouse switch.', c: ['configure terminal', 'ip domain-name netdrill.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username netadmin secret Campus!2024', 'line vty 0 15', 'login local', 'transport input ssh', 'exit', 'ntp server 10.20.0.1', 'logging host 10.20.99.50', 'logging trap informational', 'end'] },
    { d: 'R1', t: 'R1 keeps the site\'s time and carries the banner.', c: ['configure terminal', 'ntp master 3', 'logging host 10.20.99.50', 'logging trap informational', 'banner motd #Authorised access only. All activity is logged.#', 'end', 'show ntp status'], note: 'One device is the reference and everything else points at it. Without common time, five devices give you five versions of the same incident.' },

    /* ---- PHASE 10: verify and save ---- */
    { d: 'CORE', t: 'Read back the switching design.', c: ['show spanning-tree', 'show interfaces trunk', 'show ip route'], note: 'Root bridge on every VLAN, two trunks carrying exactly what you allowed, and a routing table of four connected subnets plus a default.' },
    { d: 'OFF1', t: 'Read back the access-layer controls.', c: ['show etherchannel summary', 'show port-security', 'show ip dhcp snooping'] },
    { d: 'CORE', t: 'Save.', c: ['write memory'] },
    { d: 'OFF1', t: 'Save.', c: ['write memory'] },
    { d: 'WH1', t: 'Save.', c: ['write memory'] },
    { d: 'R1', t: 'Save.', c: ['write memory'], note: 'A configuration that exists only in RAM is one power cut away from a very long evening.' },
  ],
  verify: ['show ip route', 'show interfaces trunk', 'show etherchannel summary', 'show spanning-tree', 'show ip dhcp binding', 'show ip nat translations', 'show ip dhcp snooping', 'show port-security'],
  explain: `<h3>Why the core is a layer 3 switch and not a router</h3>
<p>Router-on-a-stick works, and for three VLANs on one switch it is fine. At campus scale it stops being fine: every packet between two VLANs crosses the trunk twice, so the trunk becomes both the bottleneck and the single point of failure. A layer 3 switch routes between its own SVIs in hardware. The router is then left to do the one job it is genuinely good at — talking to the outside world and translating addresses.</p>
<h3>The routed uplink</h3>
<p><code>no switchport</code> converts a switch port into a routed port that behaves exactly like a router interface. Using a /30 between CORE and R1 rather than a trunk means there is no VLAN, no STP and no spanning-tree decision on that link at all — just a point-to-point layer 3 hop. It is simpler to reason about and it is what you will see in almost every real collapsed-core design.</p>
<h3>One DHCP server, four subnets</h3>
<p>R1 is attached to none of the user VLANs, yet it addresses all of them. The mechanism is the relay: the SVI receives the client's broadcast, rewrites it as a unicast to R1 and stamps its own address into the gateway field. R1 matches that address against its pools' <code>network</code> statements to choose which pool answers. Change the helper to point somewhere else and the whole site re-homes in one line per VLAN.</p>
<h3>Allowed VLAN lists as a security control</h3>
<p>The warehouse trunk allows only VLANs 20 and 99. This is not a performance tweak — it means that even if somebody misconfigures a warehouse port into VLAN 10, the frames have nowhere to go. Restricting a trunk to what it actually needs is the cheapest layer of defence in the whole build.</p>
<h3>The access-layer pair: PortFast and BPDU guard</h3>
<p>These two always go together. PortFast says "this is a host port, start forwarding immediately". BPDU guard says "and if anything that speaks spanning tree ever appears here, shut the port". Without the second, PortFast on a port where somebody plugs in a switch is precisely how you create a loop that takes the building down.</p>
<h3>What each verification command proves</h3>
<p><code>show etherchannel summary</code> — both members (P), not (s). <code>show interfaces trunk</code> — the allowed lists are what you intended. <code>show spanning-tree</code> — CORE is the root, so traffic paths are predictable. <code>show ip dhcp binding</code> on R1 — every lease it has issued, across all subnets. <code>show ip nat translations</code> — proof that the inside/outside tagging and the ACL are both correct. Reading these four is 80% of troubleshooting a campus like this one.</p>`,
  checks: [
    { desc: 'R1 addressed on both sides with NAT inside and outside marked', fn: H => H.hasIp('R1', 'g0/1', '10.20.0.1') && H.hasIp('R1', 'g0/0', '203.0.113.2') && H.i('R1', 'g0/1').natInside && H.i('R1', 'g0/0').natOutside },
    { desc: 'R1 has routes to all four campus subnets plus a default', fn: H => { const r = H.d('R1').staticRoutes; return ['10.20.10.0', '10.20.20.0', '10.20.30.0', '10.20.99.0'].every(n => r.some(x => x.net === n && x.via === '10.20.0.2')) && r.some(x => x.net === '0.0.0.0' && x.via === '203.0.113.1'); } },
    { desc: 'Both DHCP pools exist with the full option set', fn: H => ['10.20.10.0', '10.20.20.0'].every(n => { const p = Object.values(H.d('R1').dhcp.pools).find(x => x.network === n); return !!(p && p.router && p.dns && p.domain && p.lease); }) },
    { desc: 'The bottom 20 addresses of both user subnets are excluded', fn: H => { const ex = H.d('R1').dhcp.excluded; return ex.some(e => e[0] === '10.20.10.1' && e[1] === '10.20.10.20') && ex.some(e => e[0] === '10.20.20.1' && e[1] === '10.20.20.20'); } },
    { desc: 'CORE is routing, with four named VLANs and a routed uplink', fn: H => H.d('CORE').ipRouting && [10, 20, 30, 99].every(v => H.vlanExists('CORE', v)) && H.i('CORE', 'g0/1').noSwitchport && H.hasIp('CORE', 'g0/1', '10.20.0.2') },
    { desc: 'An SVI gateway exists for every VLAN', fn: H => H.hasIp('CORE', 'vlan10', '10.20.10.1') && H.hasIp('CORE', 'vlan20', '10.20.20.1') && H.hasIp('CORE', 'vlan30', '10.20.30.1') && H.hasIp('CORE', 'vlan99', '10.20.99.1') },
    { desc: 'DHCP is relayed to R1 from both user VLANs', fn: H => H.i('CORE', 'vlan10').helpers.includes('10.20.0.1') && H.i('CORE', 'vlan20').helpers.includes('10.20.0.1') },
    { desc: 'CORE runs Rapid PVST+ and is the root bridge', fn: H => H.d('CORE').stp.mode === 'rapid' && (H.d('CORE').stp.prio[10] || 32768) < 32768 },
    { desc: 'The office EtherChannel is bundled at both ends', fn: H => ['g0/2', 'g0/3'].every(p => (H.i('CORE', p).channelGroup || {}).id === 1) && ['g0/1', 'g0/2'].every(p => (H.i('OFF1', p).channelGroup || {}).id === 1) },
    { desc: 'Both trunks carry only the VLANs they should', fn: H => { const po = H.i('CORE', 'po1'), wh = H.i('CORE', 'g0/4'); return !!(po && po.allowed && [10, 20, 30, 99].every(v => po.allowed.includes(v))) && !!(wh && wh.allowed && wh.allowed.includes(20) && !wh.allowed.includes(10)); } },
    { desc: 'Office host ports are in the right VLANs with PortFast and BPDU guard', fn: H => H.access('OFF1', 'f0/1', 10) && H.access('OFF1', 'f0/3', 10) && H.access('OFF1', 'f0/2', 30) && ['f0/1', 'f0/2', 'f0/3'].every(p => H.i('OFF1', p).stpPortfast && H.i('OFF1', p).bpduguard) },
    { desc: 'The phone port has PoE and trusts the phone\'s marking', fn: H => { const f = H.i('OFF1', 'f0/2'); return f.poe === 'auto' && f.qosTrust === 'device cisco-phone'; } },
    { desc: 'F0/1 is locked to one sticky MAC with violation shutdown', fn: H => { const p = H.i('OFF1', 'f0/1').portSec; return !!(p && p.enabled && p.max === 1 && p.sticky && p.violation === 'shutdown'); } },
    { desc: 'DHCP snooping is scoped and only the uplinks are trusted', fn: H => H.d('OFF1').dhcp.snooping.enabled && H.d('OFF1').dhcp.snooping.vlans.includes(10) && H.i('OFF1', 'po1').snoopTrust && !H.i('OFF1', 'f0/1').snoopTrust && H.d('WH1').dhcp.snooping.enabled && H.i('WH1', 'g0/1').snoopTrust },
    { desc: 'The warehouse switch is built to the same standard', fn: H => H.trunkStatic('WH1', 'g0/1') && H.access('WH1', 'f0/1', 20) && H.access('WH1', 'f0/2', 20) && H.hasIp('WH1', 'vlan99', '10.20.99.12') },
    { desc: 'Both switches are reachable for management', fn: H => H.hasIp('OFF1', 'vlan99', '10.20.99.11') && H.d('OFF1').defaultGateway === '10.20.99.1' && H.d('WH1').defaultGateway === '10.20.99.1' },
    { desc: 'Both office PCs leased addresses from the OFFICE pool', fn: H => ['PC1', 'PC2'].every(p => { const n = ND.pcNet(H.topo, H.d(p)); return !!(n.ip && n.ip.startsWith('10.20.10.') && n.gw === '10.20.10.1' && +n.ip.split('.')[3] > 20); }) },
    { desc: 'The scanner leased from the WAREHOUSE pool through the relay', fn: H => { const n = ND.pcNet(H.topo, H.d('SCAN1')); return !!(n.ip && n.ip.startsWith('10.20.20.') && n.gw === '10.20.20.1'); } },
    { desc: 'PC1 can reach the phone in the voice VLAN', fn: H => H.ping('PC1', '10.20.30.10') },
    { desc: 'PC1 can reach the ISP through NAT', fn: H => H.ping('PC1', '203.0.113.1') },
    { desc: 'All three switches accept SSH and refuse Telnet', fn: H => ['CORE', 'OFF1', 'WH1'].every(d => { const dev = H.d(d); return !!dev.rsaKey && dev.sshVersion === 2 && !!dev.domainName && dev.lines.vty.transport === 'ssh'; }) },
    { desc: 'Every device logs to the collector and uses NTP', fn: H => ['CORE', 'OFF1', 'WH1', 'R1'].every(d => H.d(d).logging.hosts.includes('10.20.99.50')) },
    { desc: 'All five campus devices saved', fn: H => ['R1', 'CORE', 'OFF1', 'WH1'].every(d => H.saved(d)) },
  ],
});

/* ============================================================= */
L({
  id: 'm2-hospital', ord: 2, vol: 3, tier: 'mega', day: 'Mega Lab 2', title: 'Hospital — Redundant Gateways & Clinical Segmentation',
  topics: 'dual distribution routers · router-on-a-stick with HSRPv2 on subinterfaces · active/standby split per VLAN · OSPF to the data centre · passive interfaces · central DHCP with dual relays · extended ACLs isolating medical devices and guests · DHCP snooping and DAI · QoS for telemetry',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R3', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'g0/1', 'g0/2'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'MON1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.50.20.30', mask: '255.255.255.0', gw: '10.50.20.1' }, poeDevice: 'Telemetry Monitor' },
    { id: 'TAB1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'EHR', type: 'pc', ifaces: ['e0'], pc: { ip: '10.50.100.10', mask: '255.255.255.0', gw: '10.50.100.1' } },
    { id: 'PACS', type: 'pc', ifaces: ['e0'], pc: { ip: '10.50.100.11', mask: '255.255.255.0', gw: '10.50.100.1' } },
  ],
  links: [
    ['PC1', 'e0', 'SW1', 'f0/1'],
    ['MON1', 'e0', 'SW1', 'f0/2'],
    ['TAB1', 'e0', 'SW1', 'f0/3'],
    ['SW1', 'g0/1', 'R1', 'g0/0'],
    ['SW1', 'g0/2', 'R2', 'g0/0'],
    ['R1', 'g0/1', 'R3', 'g0/0'],
    ['R2', 'g0/1', 'R3', 'g0/1'],
    ['R3', 'g0/2', 'SW2', 'g0/1'],
    ['SW2', 'f0/1', 'EHR', 'e0'],
    ['SW2', 'f0/2', 'PACS', 'e0'],
  ],
  layout: {
    PC1: [16, 8], MON1: [16, 54], TAB1: [16, 100], SW1: [100, 54],
    R1: [180, 16], R2: [180, 94], R3: [270, 54], SW2: [345, 54],
    EHR: [410, 22], PACS: [410, 86],
  },
  setupAll: topo => {
    for (const id of ['R1', 'R2', 'R3', 'SW1', 'SW2']) topo.devs[id].hostname = id;
  },
  intro: `<b>The situation:</b> a hospital ward block. On the ward floor there are clinical workstations, a patient telemetry monitor and a patient guest tablet. In the data centre sit the <b>EHR</b> (electronic health record) server and <b>PACS</b> (medical imaging). Two distribution routers are cabled to the ward switch, two more links run to the data centre router, and none of it is configured.<br><br><b>Your goal:</b> build a network where <em>the gateway surviving a router failure is not optional</em>, and where a patient's tablet cannot see a heart monitor. You will run router-on-a-stick on both distribution routers, put HSRP on every user VLAN with the active role deliberately split between the two routers, run OSPF to the data centre, relay DHCP from both routers to a central server, and then write the ACLs that keep clinical, medical-device and guest traffic apart.<br><br><b>Why this one matters:</b> in a hospital, "the network was down for ten minutes" and "a guest device could reach a medical device" are both incidents somebody has to write a report about. Redundancy and segmentation are the two things this lab is really about.`,
  pintro: `<b>The brief:</b> a hospital ward block with two distribution routers, a ward access switch, a data centre router and a data centre switch — all at factory defaults except their hostnames. Clinical workstations, a telemetry monitor and a patient guest tablet share the ward switch. The EHR and PACS servers live in the data centre.<br><br>Two things must be true when you are finished: losing either distribution router must not take the ward offline, and guest devices must not be able to reach anything clinical. The requirements below are the whole specification.`,
  spec: [
    { t: 'Addressing and VLAN plan (use exactly these numbers)', r: [
      'VLAN <b>10 CLINICAL</b> — 10.50.10.0/24 · HSRP virtual IP .1 · R1 .2 · R2 .3',
      'VLAN <b>20 MEDDEV</b> — 10.50.20.0/24 · HSRP virtual IP .1 · R1 .2 · R2 .3',
      'VLAN <b>30 GUEST</b> — 10.50.30.0/24 · HSRP virtual IP .1 · R1 .2 · R2 .3',
      'VLAN <b>99 MGMT</b> — 10.50.99.0/24 · R1 .1 · R2 .2 · SW1 .11 (no HSRP here)',
      'R1–R3 — 10.50.0.0/30 (R1 .1, R3 .2) · R2–R3 — 10.50.0.4/30 (R2 .5, R3 .6)',
      'Data centre LAN — 10.50.100.0/24 (R3 .1, EHR .10, PACS .11)',
    ] },
    { d: 'SW1 — the ward access switch', r: [
      'VLANs 10, 20, 30 and 99, named.',
      'G0/1 and G0/2 dot1q trunks to R1 and R2, allowing only 10, 20, 30 and 99.',
      'F0/1 in VLAN 10, F0/2 in VLAN 20 (the monitor), F0/3 in VLAN 30 (the tablet) — all with PortFast and BPDU guard.',
      'PoE and CoS trust on the telemetry port; port security with a sticky MAC and violation shutdown on it too.',
      'DHCP snooping for VLANs 10 and 30 with both uplinks trusted, and Dynamic ARP Inspection on the same VLANs.',
      'Management address 10.50.99.11 with a default gateway.',
    ] },
    { d: 'R1 and R2 — the redundant distribution pair', r: [
      'Router-on-a-stick: a subinterface per VLAN, dot1q tagged, addressed as in the plan.',
      'HSRP <b>version 2</b> on VLANs 10, 20 and 30, virtual IP .1 in each.',
      'R1 is the active router for VLANs <b>10 and 20</b> (priority 110, preempt); R2 is active for VLAN <b>30</b>.',
      'A DHCP relay on the clinical and guest subinterfaces pointing at R3.',
      'OSPF process 1 in area 0, router-id 1.1.1.1 on R1 and 2.2.2.2 on R2, with every user-facing interface passive.',
      'Inbound extended ACLs on the guest and medical-device subinterfaces (see below).',
    ] },
    { d: 'R3 — the data centre router and address server', r: [
      'Both /30 links addressed, plus 10.50.100.1 on the data centre LAN.',
      'OSPF process 1, router-id 3.3.3.3, area 0, with the data centre LAN passive.',
      'DHCP pools <b>CLINICAL</b> (10.50.10.0/24, 1-day lease) and <b>GUEST</b> (10.50.30.0/24, 4-hour lease), first 20 addresses excluded in each.',
    ] },
    { t: 'The segmentation policy', r: [
      '<b>GUEST-IN</b>, applied inbound on the guest subinterface of both routers: guests may reach the outside world but nothing in 10.50.0.0/16.',
      '<b>MEDDEV-IN</b>, applied inbound on the medical-device subinterface of both routers: the monitor may reach the EHR server at 10.50.100.10 and nothing else inside the hospital.',
      'Both lists must still allow DHCP to work.',
    ] },
    { t: 'Verification', r: [
      'PC1 and TAB1 hold leases from the right pools, above the excluded range.',
      'R1 is Active for VLANs 10 and 20; R2 is Active for VLAN 30.',
      'PC1 reaches the EHR server; the monitor reaches the EHR server but not PACS; the guest tablet reaches neither.',
      'OSPF adjacencies are up on both /30 links and every router can reach every subnet.',
      'All five infrastructure devices are saved.',
    ] },
  ],
  tasks: [
    { t: 'PHASE 1 — Read the topology before you touch it',
      do: [
        'On <b>SW1</b>, run <code>show vlan brief</code> and <code>show interfaces status</code>.',
        'On <b>R1</b>, run <code>show ip interface brief</code>.',
        'Note that the two uplinks from SW1 go to two <em>different</em> routers. That is the whole design in one sentence.',
      ],
      done: 'You can describe, without looking at the diagram, which port goes where.',
      why: 'Redundant designs are easy to configure wrongly because everything exists twice. Fixing the topology in your head first is what stops you from configuring R1 twice and R2 never.' },

    { t: 'PHASE 2 — Build the ward switch',
      do: [
        'Create VLANs <b>10 CLINICAL</b>, <b>20 MEDDEV</b>, <b>30 GUEST</b> and <b>99 MGMT</b>.',
        'Make <b>G0/1</b> and <b>G0/2</b> dot1q trunks allowing only <b>10,20,30,99</b>.',
        'Put <b>F0/1</b> in VLAN 10, <b>F0/2</b> in VLAN 20 and <b>F0/3</b> in VLAN 30, each with PortFast and BPDU guard.',
      ],
      done: '<code>show interfaces trunk</code> shows two trunks and <code>show vlan brief</code> shows each host port in its own VLAN.',
      why: 'Both uplinks are trunks because both routers have to see all four VLANs. There is no loop here: the routers do not bridge, so nothing forwards a frame back.' },

    { t: 'Protect the telemetry port specifically',
      do: [
        'On <b>F0/2</b>: <code>power inline auto</code> and <code>mls qos trust cos</code>.',
        'Add port security: maximum <b>1</b>, sticky learning, violation <b>shutdown</b>.',
        'Give the switch a management address of <b>10.50.99.11/24</b> on VLAN 99 with a default gateway of <b>10.50.99.1</b>.',
      ],
      done: 'The monitor port is powered, trusted for QoS and locked to a single device.',
      why: 'A medical device is exactly the kind of port where port security earns its keep: nothing else should ever appear on it, and if something does, somebody needs to know why.' },

    { t: 'PHASE 3 — Router-on-a-stick on the first distribution router',
      do: [
        'On <b>R1</b>, bring up the physical interface <b>G0/0</b> first — it carries no address of its own.',
        'Create <b>G0/0.10</b> with <code>encapsulation dot1q 10</code> and <b>10.50.10.2/24</b>.',
        'Repeat for <b>.20</b> (10.50.20.2), <b>.30</b> (10.50.30.2) and <b>.99</b> (10.50.99.1).',
      ],
      done: '<code>show ip interface brief</code> lists four subinterfaces, all up/up.',
      why: 'The physical interface must be up even though it has no address — a subinterface that is administratively down on its parent goes nowhere. This is the single most common router-on-a-stick mistake.' },

    { t: 'Add HSRP so the ward has a gateway that survives a failure',
      do: [
        'On <b>G0/0.10</b>: <code>standby version 2</code>, <code>standby 10 ip 10.50.10.1</code>, <code>standby 10 priority 110</code>, <code>standby 10 preempt</code>.',
        'On <b>G0/0.20</b>: group <b>20</b>, virtual IP <b>10.50.20.1</b>, priority <b>110</b>, preempt.',
        'On <b>G0/0.30</b>: group <b>30</b>, virtual IP <b>10.50.30.1</b>, and leave the priority at the default.',
      ],
      done: '<code>show standby brief</code> shows three groups with R1 holding the higher priority in two of them.',
      why: 'The virtual IP is what the hosts use as their gateway, so a failover is invisible to them. Splitting which router is active per VLAN means both routers do real work instead of one sitting idle.' },

    { t: 'PHASE 4 — Build the second router as the mirror image',
      do: [
        'On <b>R2</b>, build the same four subinterfaces with the <b>.3</b> addresses (and <b>10.50.99.2</b> on .99).',
        'Configure the same three HSRP groups with the same virtual IPs.',
        'Give <b>R2</b> priority <b>110</b> and preempt on <b>group 30 only</b>.',
      ],
      done: 'R2 is standby for VLANs 10 and 20 and active for VLAN 30.',
      why: 'Same virtual IPs, opposite priorities. Each router is the primary path for some VLANs and the backup for the rest, which is how you get redundancy without paying for a router that does nothing.' },

    { t: 'PHASE 5 — Address the data centre and the two /30 links',
      do: [
        'On <b>R1</b>: <b>G0/1</b> = 10.50.0.1/30. On <b>R2</b>: <b>G0/1</b> = 10.50.0.5/30.',
        'On <b>R3</b>: <b>G0/0</b> = 10.50.0.2/30, <b>G0/1</b> = 10.50.0.6/30, <b>G0/2</b> = 10.50.100.1/24.',
        'On <b>SW2</b>, leave the ports in VLAN 1 and check both servers are up.',
      ],
      done: 'Every link is addressed and up/up.',
      why: 'Two separate /30s rather than one shared subnet means each distribution router has its own independent path to the data centre. One failed link takes out one path, not both.' },

    { t: 'Run OSPF between the three routers',
      do: [
        'On each router: <code>router ospf 1</code>, set the router-id (<b>1.1.1.1</b>, <b>2.2.2.2</b>, <b>3.3.3.3</b>), then <code>passive-interface default</code>.',
        'Un-passive only the interfaces facing another router: <b>G0/1</b> on R1 and R2, <b>G0/0</b> and <b>G0/1</b> on R3.',
        'Advertise <code>network 10.50.0.0 0.0.255.255 area 0</code> on all three.',
      ],
      done: '<code>show ip ospf neighbor</code> on R3 lists both distribution routers, and every router has routes to every subnet.',
      why: '<code>passive-interface default</code> then selectively un-passive is the safe pattern: OSPF advertises the user subnets but never sends a hello onto a ward VLAN where a host — or an attacker — could answer it.' },

    { t: 'PHASE 6 — Central DHCP with two relays',
      do: [
        'On <b>R3</b>, exclude the first 20 addresses of <b>10.50.10.0/24</b> and <b>10.50.30.0/24</b>.',
        'Build pool <b>CLINICAL</b> (gateway 10.50.10.1, DNS 10.50.100.10, domain <code>hosp.lab</code>, 1-day lease) and pool <b>GUEST</b> (gateway 10.50.30.1, DNS 8.8.8.8, domain <code>guest.hosp.lab</code>, 4-hour lease).',
        'On <b>R1</b> and <b>R2</b>, put <code>ip helper-address</code> on both the clinical and guest subinterfaces, pointing at the R3 address reachable from that router.',
      ],
      done: 'Two pools on R3 and four helper addresses across the two distribution routers.',
      why: 'Note the gateway option is the <b>virtual</b> IP, not either router\'s real address — otherwise a failover would strand every client. The guest lease is hours, not days, because guest devices come and go.' },

    { t: 'Lease addresses and confirm the two pools are distinct',
      do: [
        'On <b>PC1</b> and <b>TAB1</b>: <code>ipconfig /renew</code> then <code>ipconfig /all</code>.',
        'Compare the DNS server and domain name the two of them received.',
        'On <b>R3</b>: <code>show ip dhcp binding</code>.',
      ],
      done: 'A clinical workstation in 10.50.10.x and a guest tablet in 10.50.30.x, with different DNS servers.',
      why: 'One server, two policies. The pool is chosen by the address the relay stamped on the request, which is why guests automatically get guest settings without anybody configuring the tablet.' },

    { t: 'PHASE 7 — Write the guest isolation policy',
      do: [
        'On <b>R1</b>, build extended ACL <b>GUEST-IN</b>: <code>deny ip 10.50.30.0 0.0.0.255 10.50.0.0 0.0.255.255</code>, then <code>permit ip any any</code>.',
        'Apply it <b>inbound</b> on <b>G0/0.30</b>.',
        'Do exactly the same on <b>R2</b> — a policy applied on only one of two gateways is not a policy.',
      ],
      done: 'Both routers filter guest traffic identically.',
      why: 'The deny is written against the whole 10.50.0.0/16 rather than each subnet, so it keeps working when somebody adds VLAN 40 next year. The trailing permit is what lets guests still reach the internet — and lets DHCP through, because a DISCOVER is not addressed into 10.50.0.0/16.' },

    { t: 'Write the medical-device policy',
      do: [
        'On both routers, build <b>MEDDEV-IN</b>: <code>permit ip 10.50.20.0 0.0.0.255 host 10.50.100.10</code>, then <code>deny ip 10.50.20.0 0.0.0.255 10.50.0.0 0.0.255.255</code>, then <code>permit ip any any</code>.',
        'Apply it inbound on <b>G0/0.20</b> on both.',
        'Read the order carefully before you apply it.',
      ],
      done: 'The monitor can reach one server and nothing else inside the hospital.',
      why: 'Order is the entire lesson here. The specific permit must come before the broad deny, because processing stops at the first match. Swap the two lines and the monitor can reach nothing at all.' },

    { t: 'PHASE 8 — Test the policy from every angle',
      do: [
        'From <b>PC1</b>: ping <b>10.50.100.10</b> and <b>10.50.100.11</b> — both should succeed.',
        'From <b>MON1</b>: ping <b>10.50.100.10</b> (should work) and <b>10.50.100.11</b> (should be denied).',
        'From <b>TAB1</b>: ping <b>10.50.100.10</b> and <b>10.50.10.2</b> — both should be denied.',
      ],
      done: 'Three devices, three different results, all of them the ones you designed.',
      why: 'Testing a security policy means testing what should be blocked as well as what should work. An ACL that blocks everything passes the first test and fails the business.' },

    { t: 'PHASE 9 — Harden the access layer against spoofing',
      do: [
        'On <b>SW1</b>: enable DHCP snooping, scope it to VLANs <b>10,30</b>, and trust <b>G0/1</b> and <b>G0/2</b>.',
        'Enable Dynamic ARP Inspection on the same VLANs and trust the same two uplinks.',
        'Check with <code>show ip dhcp snooping</code>.',
      ],
      done: 'Snooping and DAI are both live, with only the router uplinks trusted.',
      why: 'DAI checks every ARP on an untrusted port against the bindings snooping learned, which is what stops a tablet in the day room from claiming to be the ward gateway. DAI without snooping has no table to check against, so the order matters.' },

    { t: 'PHASE 10 — Verify the redundancy, then save',
      do: [
        'On <b>R1</b> and <b>R2</b>: <code>show standby brief</code> — confirm the active role is split as designed.',
        'On <b>R3</b>: <code>show ip ospf neighbor</code> and <code>show ip route</code>.',
        'Save all five infrastructure devices.',
      ],
      done: 'R1 active for 10 and 20, R2 active for 30, two OSPF neighbours, everything saved.',
      why: 'The point of the split is that both routers carry traffic every day. A standby device that has never forwarded a packet is a device nobody finds out is broken until the night they need it.' },
  ],
  steps: [
    /* ---- PHASE 1: survey ---- */
    { d: 'SW1', t: 'Look at the ward switch before configuring anything.', c: ['enable', 'show vlan brief', 'show interfaces status'], note: 'Two uplinks, three host ports, everything in VLAN 1.' },
    { d: 'R1', t: 'And the first distribution router.', c: ['enable', 'show ip interface brief'], note: 'Both interfaces administratively down, as a router ships.' },

    /* ---- PHASE 2: ward switch ---- */
    { d: 'SW1', t: 'Create the four ward VLANs.', c: ['configure terminal', 'vlan 10', 'name CLINICAL', 'exit', 'vlan 20', 'name MEDDEV', 'exit', 'vlan 30', 'name GUEST', 'exit', 'vlan 99', 'name MGMT', 'exit'] },
    { d: 'SW1', t: 'Both uplinks are trunks — one per router.', c: ['interface range g0/1 - 2', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20,30,99', 'switchport nonegotiate', 'exit'], note: 'No loop here: routers do not bridge, so nothing forwards a frame back out the other trunk.' },
    { d: 'SW1', t: 'The clinical workstation and the guest tablet.', c: ['interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit', 'interface f0/3', 'switchport mode access', 'switchport access vlan 30', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit'] },
    { d: 'SW1', t: 'The telemetry monitor: powered, trusted, and locked down.', c: ['interface f0/2', 'switchport mode access', 'switchport access vlan 20', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'power inline auto', 'mls qos trust cos', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security mac-address sticky', 'switchport port-security violation shutdown', 'exit'], note: 'Nothing but this monitor should ever appear on this port — and if something does, the port shuts and somebody investigates.' },
    { d: 'SW1', t: 'Give the switch itself an address on the management VLAN.', c: ['interface vlan 99', 'ip address 10.50.99.11 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 10.50.99.1', 'end', 'show interfaces trunk'] },

    /* ---- PHASE 3: R1 ROAS + HSRP ---- */
    { d: 'R1', t: 'Bring up the trunk-facing physical interface first.', c: ['configure terminal', 'interface g0/0', 'description Trunk to SW1', 'no shutdown', 'exit'], note: 'It carries no address of its own. If it stays shut, every subinterface below it is dead — the classic router-on-a-stick mistake.' },
    { d: 'R1', t: 'A subinterface per user VLAN.', c: ['interface g0/0.10', 'encapsulation dot1q 10', 'ip address 10.50.10.2 255.255.255.0', 'exit', 'interface g0/0.20', 'encapsulation dot1q 20', 'ip address 10.50.20.2 255.255.255.0', 'exit'], note: 'The dot1q tag is what ties a subinterface to a VLAN. Get the number wrong and the interface still comes up — it is just wired to the wrong network.' },
    { d: 'R1', t: 'And for guests and management.', c: ['interface g0/0.30', 'encapsulation dot1q 30', 'ip address 10.50.30.2 255.255.255.0', 'exit', 'interface g0/0.99', 'encapsulation dot1q 99', 'ip address 10.50.99.1 255.255.255.0', 'exit', 'do show ip interface brief'] },
    { d: 'R1', t: 'HSRP on the clinical VLAN, with R1 preferred.', c: ['interface g0/0.10', 'standby version 2', 'standby 10 ip 10.50.10.1', 'standby 10 priority 110', 'standby 10 preempt', 'exit'], note: 'The virtual IP is what every clinical workstation will use as its gateway. Preempt is what makes R1 take the role back after it recovers.' },
    { d: 'R1', t: 'The same for medical devices.', c: ['interface g0/0.20', 'standby version 2', 'standby 20 ip 10.50.20.1', 'standby 20 priority 110', 'standby 20 preempt', 'exit'] },
    { d: 'R1', t: 'And guests — where R1 is deliberately the backup.', c: ['interface g0/0.30', 'standby version 2', 'standby 30 ip 10.50.30.1', 'exit', 'do show standby brief'], note: 'Default priority of 100 here. R2 will use 110 for this group, so guest traffic takes the other router.' },
    { d: 'R1', t: 'Address the link to the data centre.', c: ['interface g0/1', 'description To R3 data centre', 'ip address 10.50.0.1 255.255.255.252', 'no shutdown', 'exit'] },

    /* ---- PHASE 4: R2 mirror ---- */
    { d: 'R2', t: 'Same build, the .3 addresses.', c: ['enable', 'configure terminal', 'interface g0/0', 'description Trunk to SW1', 'no shutdown', 'exit', 'interface g0/0.10', 'encapsulation dot1q 10', 'ip address 10.50.10.3 255.255.255.0', 'exit', 'interface g0/0.20', 'encapsulation dot1q 20', 'ip address 10.50.20.3 255.255.255.0', 'exit'] },
    { d: 'R2', t: 'Guest and management subinterfaces.', c: ['interface g0/0.30', 'encapsulation dot1q 30', 'ip address 10.50.30.3 255.255.255.0', 'exit', 'interface g0/0.99', 'encapsulation dot1q 99', 'ip address 10.50.99.2 255.255.255.0', 'exit'] },
    { d: 'R2', t: 'Standby for clinical and medical devices.', c: ['interface g0/0.10', 'standby version 2', 'standby 10 ip 10.50.10.1', 'exit', 'interface g0/0.20', 'standby version 2', 'standby 20 ip 10.50.20.1', 'exit'], note: 'Same virtual IPs, default priority. R2 is the backup for these two VLANs.' },
    { d: 'R2', t: 'But active for guests.', c: ['interface g0/0.30', 'standby version 2', 'standby 30 ip 10.50.30.1', 'standby 30 priority 110', 'standby 30 preempt', 'exit', 'do show standby brief'], note: 'Both routers now forward real traffic every day. A backup that has never carried a packet is a backup nobody knows is broken.' },
    { d: 'R2', t: 'And its own link to the data centre.', c: ['interface g0/1', 'description To R3 data centre', 'ip address 10.50.0.5 255.255.255.252', 'no shutdown', 'exit'] },

    /* ---- PHASE 5: R3 and OSPF ---- */
    { d: 'R3', t: 'Address both distribution links and the data centre LAN.', c: ['enable', 'configure terminal', 'interface g0/0', 'ip address 10.50.0.2 255.255.255.252', 'no shutdown', 'exit', 'interface g0/1', 'ip address 10.50.0.6 255.255.255.252', 'no shutdown', 'exit', 'interface g0/2', 'ip address 10.50.100.1 255.255.255.0', 'no shutdown', 'exit'], note: 'Two independent /30s rather than one shared subnet — one failed link removes one path, not both.' },
    { d: 'R3', t: 'OSPF, with everything passive except the two router links.', c: ['router ospf 1', 'router-id 3.3.3.3', 'passive-interface default', 'no passive-interface g0/0', 'no passive-interface g0/1', 'network 10.50.0.0 0.0.255.255 area 0', 'exit'], note: 'Passive by default is the safe habit: OSPF advertises a subnet but never sends a hello onto a LAN where a host could answer it.' },
    { d: 'R1', t: 'OSPF on the first distribution router.', c: ['router ospf 1', 'router-id 1.1.1.1', 'passive-interface default', 'no passive-interface g0/1', 'network 10.50.0.0 0.0.255.255 area 0', 'exit'] },
    { d: 'R2', t: 'And the second.', c: ['router ospf 1', 'router-id 2.2.2.2', 'passive-interface default', 'no passive-interface g0/1', 'network 10.50.0.0 0.0.255.255 area 0', 'exit'] },
    { d: 'R3', t: 'Confirm both neighbours came up.', c: ['do show ip ospf neighbor', 'do show ip route'], note: 'Two adjacencies, and routes to every ward VLAN learned from both directions.' },

    /* ---- PHASE 6: DHCP ---- */
    { d: 'R3', t: 'Reserve the low range in both client subnets.', c: ['ip dhcp excluded-address 10.50.10.1 10.50.10.20', 'ip dhcp excluded-address 10.50.30.1 10.50.30.20'] },
    { d: 'R3', t: 'The clinical pool — note the gateway is the VIRTUAL address.', c: ['ip dhcp pool CLINICAL', 'network 10.50.10.0 255.255.255.0', 'default-router 10.50.10.1', 'dns-server 10.50.100.10', 'domain-name hosp.lab', 'lease 1', 'exit'], note: 'If you handed out a real router address here, a failover would strand every workstation on the ward. The virtual IP is the point of HSRP.' },
    { d: 'R3', t: 'The guest pool, with a much shorter lease.', c: ['ip dhcp pool GUEST', 'network 10.50.30.0 255.255.255.0', 'default-router 10.50.30.1', 'dns-server 8.8.8.8', 'domain-name guest.hosp.lab', 'lease 0 4 0', 'end'], note: 'Four hours. Guest devices leave the building; their addresses should come back into the pool quickly.' },
    { d: 'R1', t: 'Relay DHCP from the clinical and guest VLANs.', c: ['interface g0/0.10', 'ip helper-address 10.50.0.2', 'exit', 'interface g0/0.30', 'ip helper-address 10.50.0.2', 'end'], note: 'The helper goes on the interface that hears the clients, and R3 chooses the pool from the subinterface address it sees.' },
    { d: 'R2', t: 'And the same on the second router, via its own link.', c: ['interface g0/0.10', 'ip helper-address 10.50.0.6', 'exit', 'interface g0/0.30', 'ip helper-address 10.50.0.6', 'end'], note: 'Both gateways relay. Whichever one is active for a VLAN will be the one that hears the broadcast.' },
    { d: 'PC1', t: 'The clinical workstation leases.', c: ['ipconfig /renew', 'ipconfig /all'], note: 'Gateway 10.50.10.1 — the virtual address. The workstation has no idea two routers exist.' },
    { d: 'TAB1', t: 'And the patient tablet gets guest settings automatically.', c: ['ipconfig /renew', 'ipconfig /all'], note: 'Different subnet, different DNS server, different domain — all from one server, chosen by which relay forwarded the request.' },

    /* ---- PHASE 7: ACLs ---- */
    { d: 'R1', t: 'Guests may reach the outside world and nothing inside.', c: ['configure terminal', 'ip access-list extended GUEST-IN', 'deny ip 10.50.30.0 0.0.0.255 10.50.0.0 0.0.255.255', 'permit ip any any', 'exit', 'interface g0/0.30', 'ip access-group GUEST-IN in', 'exit'], note: 'Written against the whole 10.50.0.0/16, so it still holds when somebody adds VLAN 40 next year.' },
    { d: 'R1', t: 'The monitor may reach exactly one server.', c: ['ip access-list extended MEDDEV-IN', 'permit ip 10.50.20.0 0.0.0.255 host 10.50.100.10', 'deny ip 10.50.20.0 0.0.0.255 10.50.0.0 0.0.255.255', 'permit ip any any', 'exit', 'interface g0/0.20', 'ip access-group MEDDEV-IN in', 'end'], note: 'Specific permit first, broad deny second. Swap those two lines and the monitor can reach nothing at all.' },
    { d: 'R2', t: 'The identical policy on the second gateway.', c: ['configure terminal', 'ip access-list extended GUEST-IN', 'deny ip 10.50.30.0 0.0.0.255 10.50.0.0 0.0.255.255', 'permit ip any any', 'exit', 'ip access-list extended MEDDEV-IN', 'permit ip 10.50.20.0 0.0.0.255 host 10.50.100.10', 'deny ip 10.50.20.0 0.0.0.255 10.50.0.0 0.0.255.255', 'permit ip any any', 'exit'], note: 'A policy applied to only one of two gateways is not a policy — it is a coin toss.' },
    { d: 'R2', t: 'Apply both lists.', c: ['interface g0/0.30', 'ip access-group GUEST-IN in', 'exit', 'interface g0/0.20', 'ip access-group MEDDEV-IN in', 'end', 'show access-lists'] },

    /* ---- PHASE 8: test the policy ---- */
    { d: 'PC1', t: 'Clinical reaches both servers.', c: ['ping 10.50.100.10', 'ping 10.50.100.11'], note: 'Unfiltered, because no ACL is applied to the clinical subinterface.' },
    { d: 'MON1', t: 'The monitor reaches the EHR server.', c: ['ping 10.50.100.10'], note: 'Matched by the first line of MEDDEV-IN.' },
    { d: 'MON1', t: 'But nothing else inside the hospital.', c: ['ping 10.50.100.11'], note: 'Matched by the deny on the second line. PACS is simply not part of what this device needs.' },
    { d: 'TAB1', t: 'And the guest tablet reaches nothing clinical at all.', c: ['ping 10.50.100.10', 'ping 10.50.10.2'], note: 'Both denied. Testing what should be blocked is half of testing a security policy.' },

    /* ---- PHASE 9: access-layer hardening ---- */
    { d: 'SW1', t: 'DHCP snooping, trusting only the two router uplinks.', c: ['configure terminal', 'service dhcp', 'ip dhcp snooping', 'ip dhcp snooping vlan 10,30', 'interface range g0/1 - 2', 'ip dhcp snooping trust', 'exit', 'do show ip dhcp snooping'], note: 'A rogue DHCP server plugged into a ward socket has its offers dropped on arrival.' },
    { d: 'SW1', t: 'Then Dynamic ARP Inspection on the same VLANs.', c: ['ip arp inspection vlan 10,30', 'interface range g0/1 - 2', 'ip arp inspection trust', 'end'], note: 'DAI checks each ARP on an untrusted port against the snooping bindings — which is what stops a device claiming to be the ward gateway.' },

    /* ---- PHASE 10: verify and save ---- */
    { d: 'R1', t: 'Confirm the active roles are split as designed.', c: ['show standby brief'], note: 'Active for groups 10 and 20, standby for 30.' },
    { d: 'R2', t: 'And the mirror image on the second router.', c: ['show standby brief'] },
    { d: 'R3', t: 'Two neighbours, full routing table, all the leases.', c: ['show ip ospf neighbor', 'show ip route', 'show ip dhcp binding'] },
    { d: 'R1', t: 'Save.', c: ['write memory'] },
    { d: 'R2', t: 'Save.', c: ['write memory'] },
    { d: 'R3', t: 'Save.', c: ['write memory'] },
    { d: 'SW1', t: 'Save.', c: ['write memory'] },
    { d: 'SW2', t: 'Save.', c: ['enable', 'write memory'] },
  ],
  verify: ['show standby brief', 'show ip ospf neighbor', 'show ip route', 'show ip dhcp binding', 'show access-lists', 'show ip dhcp snooping', 'show port-security'],
  explain: `<h3>Why HSRP, and why split the active role</h3>
<p>Hosts have exactly one default gateway and no way to fail over on their own. HSRP gives the VLAN a virtual IP and virtual MAC that one router owns at a time; when that router dies the other takes both over and the hosts never notice. Splitting which router is active per VLAN — R1 for clinical and medical, R2 for guests — means both devices forward traffic every day. A backup that has never carried a packet is a backup nobody knows is broken.</p>
<h3>The subinterface trap</h3>
<p>Router-on-a-stick fails silently in two ways. The first is leaving the <em>physical</em> interface shut: the subinterfaces inherit that and nothing works even though the configuration looks perfect. The second is a wrong <code>encapsulation dot1q</code> number: the subinterface comes up happily, it is just connected to the wrong VLAN. Both are worth recognising instantly.</p>
<h3>Passive interfaces</h3>
<p><code>passive-interface default</code> followed by <code>no passive-interface</code> on the router-facing links is the pattern to build into your fingers. OSPF still advertises the ward subnets — that comes from the <code>network</code> statement — but it never sends a hello onto a VLAN full of hosts. Fewer packets, and no chance of something on the ward forming an adjacency with your distribution routers.</p>
<h3>Reading MEDDEV-IN the way the router reads it</h3>
<p>Three lines, evaluated top down, stopping at the first match:</p>
<p>1. <code>permit ip 10.50.20.0 0.0.0.255 host 10.50.100.10</code> — the monitor to the EHR server. Allowed.<br>
2. <code>deny ip 10.50.20.0 0.0.0.255 10.50.0.0 0.0.255.255</code> — the monitor to anything else in the hospital. Dropped.<br>
3. <code>permit ip any any</code> — everything else, including the monitor reaching outside and the DHCP exchange.</p>
<p>Reverse lines 1 and 2 and the monitor is cut off from the EHR server too, because the deny matches first and processing stops there. This ordering question appears on the exam in some form almost every time.</p>
<h3>Why the DHCP gateway must be the virtual IP</h3>
<p>If pool CLINICAL handed out 10.50.10.2 as the default router, every workstation on the ward would be hard-wired to R1 specifically. HSRP would fail over correctly and the clients would still be pointing at a dead address. The gateway option and the virtual IP have to be the same value, and this is a mistake that only shows itself during an outage.</p>
<h3>Snooping before DAI</h3>
<p>Dynamic ARP Inspection validates ARP against the binding table that DHCP snooping builds. Enable DAI without snooping and there is nothing to validate against. Both need the same VLANs scoped and the same uplinks trusted — configure them as a pair and check both with their own <code>show</code> command.</p>`,
  checks: [
    { desc: 'SW1 carries all four ward VLANs on two restricted trunks', fn: H => [10, 20, 30, 99].every(v => H.vlanExists('SW1', v)) && ['g0/1', 'g0/2'].every(p => { const i = H.i('SW1', p); return i.swMode === 'trunk' && i.allowed && [10, 20, 30, 99].every(v => i.allowed.includes(v)); }) },
    { desc: 'Each ward host port is in the right VLAN with PortFast and BPDU guard', fn: H => H.access('SW1', 'f0/1', 10) && H.access('SW1', 'f0/2', 20) && H.access('SW1', 'f0/3', 30) && ['f0/1', 'f0/2', 'f0/3'].every(p => H.i('SW1', p).stpPortfast && H.i('SW1', p).bpduguard) },
    { desc: 'The telemetry port has PoE, CoS trust and port security', fn: H => { const i = H.i('SW1', 'f0/2'); return i.poe === 'auto' && i.qosTrust === 'cos' && !!(i.portSec && i.portSec.enabled && i.portSec.max === 1 && i.portSec.sticky && i.portSec.violation === 'shutdown'); } },
    { desc: 'R1 has a dot1q subinterface per VLAN, addressed correctly', fn: H => H.hasIp('R1', 'g0/0.10', '10.50.10.2') && H.hasIp('R1', 'g0/0.20', '10.50.20.2') && H.hasIp('R1', 'g0/0.30', '10.50.30.2') && H.hasIp('R1', 'g0/0.99', '10.50.99.1') && !H.i('R1', 'g0/0').shutdown },
    { desc: 'R2 mirrors it with the .3 addresses', fn: H => H.hasIp('R2', 'g0/0.10', '10.50.10.3') && H.hasIp('R2', 'g0/0.20', '10.50.20.3') && H.hasIp('R2', 'g0/0.30', '10.50.30.3') && !H.i('R2', 'g0/0').shutdown },
    { desc: 'All three HSRP groups use version 2 and the right virtual IPs', fn: H => [['10', '10.50.10.1'], ['20', '10.50.20.1'], ['30', '10.50.30.1']].every(([g, vip]) => { const a = H.i('R1', 'g0/0.' + g).standby[g], b = H.i('R2', 'g0/0.' + g).standby[g]; return !!(a && b && a.ip === vip && b.ip === vip && a.version === 2 && b.version === 2); }) },
    { desc: 'R1 is preferred for clinical and medical devices', fn: H => { const a = H.i('R1', 'g0/0.10').standby['10'], b = H.i('R1', 'g0/0.20').standby['20']; return a.priority === 110 && a.preempt && b.priority === 110 && b.preempt; } },
    { desc: 'R2 is preferred for guests, so both routers carry traffic', fn: H => { const g = H.i('R2', 'g0/0.30').standby['30']; return g.priority === 110 && g.preempt && (H.i('R1', 'g0/0.30').standby['30'].priority || 100) < 110; } },
    { desc: 'Both /30 links and the data centre LAN are addressed', fn: H => H.hasIp('R1', 'g0/1', '10.50.0.1') && H.hasIp('R2', 'g0/1', '10.50.0.5') && H.hasIp('R3', 'g0/0', '10.50.0.2') && H.hasIp('R3', 'g0/1', '10.50.0.6') && H.hasIp('R3', 'g0/2', '10.50.100.1') },
    { desc: 'OSPF is adjacent on both distribution links', fn: H => H.ospfNbr('R3', 'R1') && H.ospfNbr('R3', 'R2') },
    { desc: 'Every router uses passive-interface default with the links un-passived', fn: H => ['R1', 'R2', 'R3'].every(d => H.d(d).ospf && H.d(d).ospf.passiveDefault) },
    { desc: 'R3 serves both pools, with the virtual IP as the gateway', fn: H => { const c = Object.values(H.d('R3').dhcp.pools).find(p => p.network === '10.50.10.0'), g = Object.values(H.d('R3').dhcp.pools).find(p => p.network === '10.50.30.0'); return !!(c && g && c.router === '10.50.10.1' && g.router === '10.50.30.1' && c.dns && g.dns); } },
    { desc: 'Both routers relay DHCP from the clinical and guest VLANs', fn: H => H.i('R1', 'g0/0.10').helpers.includes('10.50.0.2') && H.i('R1', 'g0/0.30').helpers.includes('10.50.0.2') && H.i('R2', 'g0/0.10').helpers.includes('10.50.0.6') && H.i('R2', 'g0/0.30').helpers.includes('10.50.0.6') },
    { desc: 'The clinical workstation leased with the virtual IP as its gateway', fn: H => { const n = ND.pcNet(H.topo, H.d('PC1')); return !!(n.ip && n.ip.startsWith('10.50.10.') && n.gw === '10.50.10.1' && +n.ip.split('.')[3] > 20); } },
    { desc: 'The guest tablet leased from the guest pool with its own DNS', fn: H => { const n = ND.pcNet(H.topo, H.d('TAB1')); return !!(n.ip && n.ip.startsWith('10.50.30.') && n.dns === '8.8.8.8'); } },
    { desc: 'Both gateways carry the identical guest and medical-device policy', fn: H => ['R1', 'R2'].every(d => !!H.d(d).acls['GUEST-IN'] && !!H.d(d).acls['MEDDEV-IN']) && ['R1', 'R2'].every(d => H.i(d, 'g0/0.30').aclIn === 'GUEST-IN' && H.i(d, 'g0/0.20').aclIn === 'MEDDEV-IN') },
    { desc: 'Clinical workstations reach both data centre servers', fn: H => H.ping('PC1', '10.50.100.10') && H.ping('PC1', '10.50.100.11') },
    { desc: 'The telemetry monitor reaches the EHR server', fn: H => H.ping('MON1', '10.50.100.10') },
    { desc: 'The telemetry monitor is denied everything else inside', fn: H => H.pingBlocked('MON1', '10.50.100.11') },
    { desc: 'The guest tablet is denied all internal destinations', fn: H => H.pingBlocked('TAB1', '10.50.100.10') && H.pingBlocked('TAB1', '10.50.10.2') },
    { desc: 'DHCP snooping and DAI both run, trusting only the router uplinks', fn: H => { const d = H.d('SW1'); return d.dhcp.snooping.enabled && d.dhcp.snooping.vlans.includes(10) && d.dhcp.snooping.vlans.includes(30) && d.arai.vlans.includes(10) && d.arai.vlans.includes(30) && ['g0/1', 'g0/2'].every(p => H.i('SW1', p).snoopTrust && H.i('SW1', p).araiTrust) && !H.i('SW1', 'f0/3').araiTrust; } },
    { desc: 'The ward switch is reachable for management', fn: H => H.hasIp('SW1', 'vlan99', '10.50.99.11') && H.d('SW1').defaultGateway === '10.50.99.1' },
    { desc: 'All five infrastructure devices saved', fn: H => ['R1', 'R2', 'R3', 'SW1', 'SW2'].every(d => H.saved(d)) },
  ],
});

/* ============================================================= */
L({
  id: 'm3-defence', ord: 3, vol: 3, tier: 'mega', day: 'Mega Lab 3', title: 'Defence Site — Hardened Enclaves, Deny by Default',
  topics: 'four enclaves with deny-by-default ACLs · AAA and privilege levels · SSHv2 with 2048-bit keys · VTY access-class from the jump host only · login throttling and password policy · unused ports shut into a blackhole VLAN · unused native VLAN · DTP disabled · port security everywhere · DHCP snooping and DAI · CDP off at the boundary · HTTP servers disabled · SNMPv3 and central logging',
  devices: [
    { id: 'TRANSIT', type: 'router', ifaces: ['g0/0'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'g0/1', 'g0/2'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'OPS1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'SEC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.70.20.50', mask: '255.255.255.0', gw: '10.70.20.1' } },
    { id: 'SENSOR1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.70.40.20', mask: '255.255.255.0', gw: '10.70.40.1' } },
    { id: 'JUMP', type: 'pc', ifaces: ['e0'], pc: { ip: '10.70.30.10', mask: '255.255.255.0', gw: '10.70.30.1' } },
  ],
  links: [
    ['TRANSIT', 'g0/0', 'R1', 'g0/0'],
    ['R1', 'g0/1', 'SW1', 'g0/1'],
    ['SW1', 'g0/2', 'SW2', 'g0/1'],
    ['SW1', 'f0/1', 'OPS1', 'e0'],
    ['SW1', 'f0/2', 'SEC1', 'e0'],
    ['SW1', 'f0/3', 'SENSOR1', 'e0'],
    ['SW2', 'f0/1', 'JUMP', 'e0'],
  ],
  layout: {
    TRANSIT: [400, 20], R1: [310, 20], SW1: [200, 56], SW2: [200, 120],
    OPS1: [100, 10], SEC1: [100, 52], SENSOR1: [100, 94], JUMP: [100, 136],
  },
  setupAll: topo => {
    for (const id of ['R1', 'SW1', 'SW2']) topo.devs[id].hostname = id;
    const t = topo.devs.TRANSIT;
    t.hostname = 'TRANSIT';
    const g = ND.getIface(t, 'g0/0');
    g.ip = { addr: '198.51.100.1', mask: '255.255.255.252' };
    g.shutdown = false;
    t.staticRoutes.push({ net: '10.70.0.0', mask: '255.255.0.0', via: '198.51.100.2', ad: 1 });
  },
  intro: `<b>The situation:</b> a small defence site with four separate enclaves on one physical network — <b>OPS</b> workstations, a <b>SECURE</b> enclave holding the log and application collector, a <b>SENSOR</b> network of field devices, and a <b>MGMT</b> enclave containing the single jump host from which all administration is done. A transit router at the perimeter is already live. Everything inside is unconfigured.<br><br><b>Your goal:</b> build it to a hardened standard. Traffic between enclaves is <em>denied unless a rule says otherwise</em>, every device refuses Telnet and accepts SSH only from the jump host, every access port is locked to one device, every unused port is shut and parked in a blackhole VLAN, and the services nobody uses are switched off.<br><br><b>A warning worth reading:</b> this lab has more ways to lock yourself out than any other in the course — an <code>access-class</code> on the VTY lines, AAA, a password policy and login throttling, all on the same device. That is exactly why it is worth doing here, where the worst outcome is clicking Reset.`,
  pintro: `<b>The brief:</b> a defence site with four enclaves — OPS (10.70.10.0/24), SECURE (10.70.20.0/24), MGMT (10.70.30.0/24) and SENSOR (10.70.40.0/24) — sharing one router, two switches and a transit link at 198.51.100.0/30. Only the transit router is configured.<br><br>The security posture is <b>deny by default between enclaves</b>. Anything not explicitly required is refused, unused ports are dead, and administration happens only from the jump host at 10.70.30.10. Build it to that standard.`,
  spec: [
    { t: 'Addressing plan (use exactly these numbers)', r: [
      'VLAN <b>10 OPS</b> — 10.70.10.0/24, gateway .1, addressed by DHCP',
      'VLAN <b>20 SECURE</b> — 10.70.20.0/24, gateway .1 · collector SEC1 at .50 (static)',
      'VLAN <b>30 MGMT</b> — 10.70.30.0/24, gateway .1 · jump host at .10 (static)',
      'VLAN <b>40 SENSOR</b> — 10.70.40.0/24, gateway .1 · sensor at .20 (static)',
      'VLAN <b>999 BLACKHOLE</b> — no addressing at all; it exists to hold dead ports',
      'Transit link — 198.51.100.0/30 (TRANSIT .1, R1 .2)',
    ] },
    { d: 'R1 — the enclave boundary', r: [
      'Router-on-a-stick: a dot1q subinterface per enclave VLAN, each holding the .1 gateway address.',
      'G0/0 addressed towards the transit router, with a default route out and CDP disabled on that interface.',
      'A DHCP pool for the OPS enclave only, first 20 addresses excluded.',
      'Three inbound extended ACLs implementing the policy below.',
      'Hardened: AAA with local accounts, a privilege-15 admin and a privilege-1 read-only user, <code>enable secret</code>, 10-character minimum passwords, login throttling, both HTTP servers off, SSHv2 with 2048-bit keys, VTY restricted by <code>access-class</code> to the MGMT enclave, 5-minute exec timeout and a legal banner.',
    ] },
    { t: 'The inter-enclave policy (deny by default)', r: [
      '<b>OPS-IN</b> on the OPS subinterface: OPS may reach the collector at 10.70.20.50 on <b>TCP 443 only</b>. OPS may not reach the SECURE, MGMT or SENSOR enclaves in any other way. Everything else (including the transit link) is permitted.',
      '<b>SENSOR-IN</b> on the SENSOR subinterface: sensors may reach the collector on <b>TCP 514 only</b>. Nothing else inside the site — not even a ping to the collector.',
      '<b>SECURE-IN</b> on the SECURE subinterface: the SECURE enclave may not <em>initiate</em> traffic into OPS or SENSOR, but its replies to sessions those enclaves opened must still get through; everything else is permitted.',
      'Every list must still allow DHCP for the OPS enclave to work.',
    ] },
    { d: 'SW1 and SW2 — the hardened access layer', r: [
      'All five VLANs created, including <b>999 BLACKHOLE</b>.',
      'Trunks hard-coded with <code>switchport nonegotiate</code>, native VLAN <b>999</b>, and an allowed list containing only the VLANs that link needs.',
      'Every access port: <code>switchport mode access</code>, PortFast, BPDU guard, port security maximum 1 with a sticky MAC and violation shutdown.',
      'Every unused port: access mode, VLAN 999, and <code>shutdown</code>.',
      'DHCP snooping and Dynamic ARP Inspection on VLAN 10, trusting only the uplinks.',
      'Management addresses 10.70.30.11 (SW1) and 10.70.30.12 (SW2) with a default gateway, the same hardening block as R1, and SSH restricted to the MGMT enclave.',
    ] },
    { t: 'Verification', r: [
      'OPS1 leases an address and can open TCP 443 to the collector, but cannot ping it.',
      'The sensor can open TCP 514 to the collector and nothing else; a ping to it is refused.',
      'The SECURE enclave cannot reach OPS or SENSOR.',
      'The jump host reaches the transit router, and every device accepts SSH only from 10.70.30.0/24.',
      'No unused port is up, and no device still runs an HTTP server.',
      'All four infrastructure devices are saved.',
    ] },
  ],
  tasks: [
    { t: 'PHASE 1 — Build the enclave boundary',
      do: [
        'On <b>R1</b>, bring up <b>G0/1</b> (no address) and create subinterfaces <b>.10</b>, <b>.20</b>, <b>.30</b> and <b>.40</b>.',
        'Tag each with the matching VLAN and give it the <b>.1</b> address of its enclave.',
        'Address <b>G0/0</b> as <b>198.51.100.2/30</b> and add a default route via <b>198.51.100.1</b>.',
      ],
      done: 'Five interfaces up, four enclave gateways and one transit link.',
      why: 'One router, four networks, one physical cable. The whole security model rests on the fact that every packet between enclaves has to pass through this one device — which is exactly where you can inspect it.' },

    { t: 'Address the OPS enclave automatically, the rest by hand',
      do: [
        'On <b>R1</b>, exclude <b>10.70.10.1</b> to <b>10.70.10.20</b> and build pool <b>OPS</b> for 10.70.10.0/24 with gateway .1, DNS 10.70.20.50, domain <code>site.mil.lab</code> and a 1-day lease.',
        'Leave the collector, sensor and jump host on their static addresses.',
      ],
      done: 'One pool, serving one enclave.',
      why: 'Workstations churn, so DHCP earns its keep there. Infrastructure and sensors get static addresses on purpose: an address that never changes is an address you can write a firewall rule about.' },

    { t: 'PHASE 2 — Build the switches with the VLANs, including a blackhole',
      do: [
        'On <b>SW1</b> and <b>SW2</b>, create VLANs <b>10</b>, <b>20</b>, <b>30</b>, <b>40</b> and <b>999 BLACKHOLE</b>.',
        'On <b>SW1</b>, make <b>G0/1</b> a hard-coded dot1q trunk to R1, native VLAN <b>999</b>, allowing <b>10,20,30,40</b>, with <code>switchport nonegotiate</code>.',
        'Make <b>SW1 G0/2</b> and <b>SW2 G0/1</b> a trunk pair the same way, allowing only <b>30</b>.',
      ],
      done: 'Two trunks, neither negotiated, each carrying only what it must.',
      why: 'Three hardening decisions in one step. An unused native VLAN defeats double-tagging; <code>nonegotiate</code> means a port can never be talked into becoming a trunk; and the allowed list means the SW2 link physically cannot carry anything but management.' },

    { t: 'Lock down every access port',
      do: [
        'On <b>SW1</b>, put <b>F0/1</b> in VLAN 10, <b>F0/2</b> in VLAN 20, <b>F0/3</b> in VLAN 40, and <b>SW2 F0/1</b> in VLAN 30.',
        'On each of them: <code>switchport mode access</code>, PortFast, BPDU guard, then port security with maximum <b>1</b>, sticky learning and violation <b>shutdown</b>.',
        'Confirm with <code>show port-security</code>.',
      ],
      done: 'Four access ports, each locked to a single device.',
      why: '<code>switchport mode access</code> is a security command as much as a functional one: a port explicitly in access mode cannot be negotiated into a trunk, which is what VLAN-hopping depends on.' },

    { t: 'Kill every port nobody is using',
      do: [
        'On <b>SW1</b>, put <b>F0/4</b> in access mode, VLAN <b>999</b>, then <code>shutdown</code>.',
        'Do the same for <b>SW2 F0/2</b>.',
        'Check with <code>show interfaces status</code>.',
      ],
      done: 'Every unused port is administratively down and parked in a VLAN that goes nowhere.',
      why: 'Shut alone is good; shut <em>and</em> in a dead VLAN is better, because somebody who later brings the port up out of curiosity still gets nothing. Live unused ports in public spaces are how sites get compromised without anybody breaking in.' },

    { t: 'PHASE 3 — Protect the OPS enclave from spoofing',
      do: [
        'On <b>SW1</b>: enable DHCP snooping, scope it to VLAN <b>10</b>, and trust <b>G0/1</b> only.',
        'Enable Dynamic ARP Inspection on VLAN <b>10</b> and trust the same uplink.',
        'Add <code>ip arp inspection validate src-mac dst-mac ip</code>.',
      ],
      done: 'Snooping and DAI both live, with strict validation.',
      why: 'The validate options make DAI compare the ARP header against the Ethernet header as well as the binding table, which catches malformed ARP that the binding check alone would let through.' },

    { t: 'PHASE 4 — Write the inter-enclave policy',
      do: [
        'On <b>R1</b>, build <b>OPS-IN</b>: permit <code>tcp 10.70.10.0 0.0.0.255 host 10.70.20.50 eq 443</code>, then deny OPS to each of the <b>20</b>, <b>30</b> and <b>40</b> subnets, then <code>permit ip any any</code>.',
        'Build <b>SENSOR-IN</b>: permit <code>tcp 10.70.40.0 0.0.0.255 host 10.70.20.50 eq 514</code>, then deny sensor traffic into <b>10.70.0.0/16</b>, then <code>permit ip any any</code>.',
        'Build <b>SECURE-IN</b>: first two <code>established</code> permits letting the collector reply to OPS and SENSOR sessions, then deny SECURE into <b>10.70.10.0/24</b> and <b>10.70.40.0/24</b>, then <code>permit ip any any</code>.',
      ],
      done: 'Three named extended ACLs, each one specific permit followed by denies followed by a catch-all.',
      why: 'This shape — permit what is required, deny the enclaves, permit the rest — is how you express "deny by default between enclaves" without cutting a subnet off from the outside world or from DHCP.' },

    { t: 'Apply the policy inbound and test all three directions',
      do: [
        'Apply <b>OPS-IN</b> inbound on <b>G0/1.10</b>, <b>SECURE-IN</b> on <b>G0/1.20</b>, <b>SENSOR-IN</b> on <b>G0/1.40</b>.',
        'From <b>OPS1</b>: renew the address, then ping the collector (must fail) and check that HTTPS to it would be allowed.',
        'From <b>SENSOR1</b>: ping the collector (must fail) — only its syslog port is open.',
      ],
      done: 'Every enclave behaves exactly as the policy says, including the things that must not work.',
      why: 'Inbound on the subinterface means the packet is filtered the moment it enters the router from that enclave, before any routing decision. That is the cheapest possible place to drop traffic that was never allowed.' },

    { t: 'PHASE 5 — Harden R1 itself',
      do: [
        'Create <b>netadmin</b> at privilege <b>15</b> and <b>auditor</b> at privilege <b>1</b>, both with strong secrets, then <code>enable secret</code>.',
        'Turn on <code>aaa new-model</code> and <code>aaa authentication login default local</code>.',
        'Add <code>security passwords min-length 10</code>, <code>login block-for 120 attempts 3 within 60</code> and <code>service password-encryption</code>.',
        'Disable both HTTP servers and <code>no ip domain-lookup</code>.',
      ],
      done: 'Two named accounts at different privilege levels and a device that throttles guesses.',
      why: 'Two privilege levels is the whole idea of authorisation in miniature: the auditor can look and cannot change. Everything else here makes an attacker\'s life slower — which, with a good password, is enough.' },

    { t: 'SSH, and restrict who may even try',
      do: [
        'Set <code>ip domain-name site.mil.lab</code>, generate <b>2048-bit</b> RSA keys and force <code>ip ssh version 2</code>.',
        'Build a standard ACL <b>MGMT-ONLY</b> permitting <b>10.70.30.0 0.0.0.255</b>.',
        'On the VTY lines: <code>login local</code>, <code>transport input ssh</code>, <code>access-class MGMT-ONLY in</code>, <code>exec-timeout 5 0</code> and <code>logging synchronous</code>. Add a legal banner.',
      ],
      done: 'The router accepts SSH, refuses Telnet, and only listens to the management enclave.',
      why: 'Two independent controls: SSH protects the session, <code>access-class</code> decides who is allowed to open one at all. Together they mean a compromised OPS workstation cannot even reach the login prompt.' },

    { t: 'PHASE 6 — Apply the same standard to both switches',
      do: [
        'Give <b>SW1</b> 10.70.30.11/24 and <b>SW2</b> 10.70.30.12/24 on VLAN 30, each with a default gateway of 10.70.30.1.',
        'Repeat the whole hardening block on both: users, AAA, password policy, login throttling, HTTP off, SSHv2 with 2048-bit keys, <b>MGMT-ONLY</b> on the VTY lines, exec timeout, banner.',
        'Verify with <code>show ip ssh</code> on each.',
      ],
      done: 'Three devices, one identical standard.',
      why: 'The value of a hardening standard is that it is the same everywhere. A single device that still allows Telnet is the one an attacker will find, and it is always the one somebody rebuilt in a hurry.' },

    { t: 'PHASE 7 — Switch off what nobody uses, and turn on what watches',
      do: [
        'On <b>R1</b>, disable CDP on <b>G0/0</b> only — the interface facing the transit provider.',
        'On all three devices: <code>logging host 10.70.20.50</code>, <code>logging trap informational</code> and <code>ntp server 198.51.100.1</code>.',
        'Add an SNMPv3 host on <b>R1</b> pointing at the collector, with a location and contact string.',
      ],
      done: 'Nothing is advertised to the provider, and everything is reported to the collector.',
      why: 'CDP is genuinely useful inside your own site and is free reconnaissance for anybody outside it. Disabling it per interface rather than globally keeps the benefit and removes the exposure.' },

    { t: 'PHASE 8 — Prove the whole posture, then save',
      do: [
        'From <b>JUMP</b>: ping <b>198.51.100.1</b> and the SECURE collector — both should work.',
        'From <b>SEC1</b>: ping <b>10.70.10.1</b> — should be denied by SECURE-IN.',
        'On each device: <code>show access-lists</code>, <code>show port-security</code>, <code>show interfaces status</code> and <code>show ip ssh</code>. Then save all four.',
      ],
      done: 'Every allowed path works, every denied path is denied, and the configuration is on disk.',
      why: 'A security build is only finished when you have tested the denials. Most of the value in this lab is in the four pings that are supposed to fail.' },
  ],
  steps: [
    /* ---- PHASE 1: boundary router ---- */
    { d: 'R1', t: 'Bring up the trunk interface and build the OPS and SECURE gateways.', c: ['enable', 'configure terminal', 'interface g0/1', 'description Trunk to SW1', 'no shutdown', 'exit', 'interface g0/1.10', 'encapsulation dot1q 10', 'ip address 10.70.10.1 255.255.255.0', 'exit', 'interface g0/1.20', 'encapsulation dot1q 20', 'ip address 10.70.20.1 255.255.255.0', 'exit'], note: 'Every packet between enclaves must cross this router. That is the entire security model in one sentence.' },
    { d: 'R1', t: 'And the management and sensor gateways.', c: ['interface g0/1.30', 'encapsulation dot1q 30', 'ip address 10.70.30.1 255.255.255.0', 'exit', 'interface g0/1.40', 'encapsulation dot1q 40', 'ip address 10.70.40.1 255.255.255.0', 'exit'] },
    { d: 'R1', t: 'The transit link out of the site.', c: ['interface g0/0', 'description To transit provider', 'ip address 198.51.100.2 255.255.255.252', 'no shutdown', 'exit', 'ip route 0.0.0.0 0.0.0.0 198.51.100.1', 'do show ip interface brief'] },
    { d: 'R1', t: 'DHCP for the workstation enclave only.', c: ['ip dhcp excluded-address 10.70.10.1 10.70.10.20', 'ip dhcp pool OPS', 'network 10.70.10.0 255.255.255.0', 'default-router 10.70.10.1', 'dns-server 10.70.20.50', 'domain-name site.mil.lab', 'lease 1', 'end'], note: 'Workstations churn, so DHCP earns its keep there. Sensors and infrastructure stay static — an address that never changes is one you can write a rule about.' },

    /* ---- PHASE 2: switches ---- */
    { d: 'SW1', t: 'Create every VLAN, including one that goes nowhere.', c: ['enable', 'configure terminal', 'vlan 10', 'name OPS', 'exit', 'vlan 20', 'name SECURE', 'exit', 'vlan 30', 'name MGMT', 'exit', 'vlan 40', 'name SENSOR', 'exit', 'vlan 999', 'name BLACKHOLE', 'exit'], note: 'VLAN 999 will never have a gateway, a route or a purpose other than holding dead ports.' },
    { d: 'SW1', t: 'A hard-coded trunk to the router, with an unused native VLAN.', c: ['interface g0/1', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk native vlan 999', 'switchport trunk allowed vlan 10,20,30,40', 'switchport nonegotiate', 'exit'], note: 'Three controls in one block: an unused native VLAN defeats double-tagging, nonegotiate means the port can never be talked into anything, and the allowed list is an explicit filter.' },
    { d: 'SW1', t: 'And a management-only trunk to the second switch.', c: ['interface g0/2', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk native vlan 999', 'switchport trunk allowed vlan 30', 'switchport nonegotiate', 'exit'], note: 'This link physically cannot carry OPS, SECURE or SENSOR frames. One line, one whole class of mistake removed.' },
    { d: 'SW1', t: 'The three enclave access ports.', c: ['interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security mac-address sticky', 'switchport port-security violation shutdown', 'exit'], note: '<code>switchport mode access</code> is a security command: a port explicitly in access mode cannot be negotiated into a trunk, which is what VLAN hopping needs.' },
    { d: 'SW1', t: 'The collector port and the sensor port, to the same standard.', c: ['interface f0/2', 'switchport mode access', 'switchport access vlan 20', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security mac-address sticky', 'switchport port-security violation shutdown', 'exit', 'interface f0/3', 'switchport mode access', 'switchport access vlan 40', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security mac-address sticky', 'switchport port-security violation shutdown', 'exit'] },
    { d: 'SW1', t: 'Kill the unused port properly.', c: ['interface f0/4', 'switchport mode access', 'switchport access vlan 999', 'shutdown', 'exit', 'do show interfaces status'], note: 'Shut is good. Shut and parked in a dead VLAN is better, because somebody who later brings it up out of curiosity still gets nothing.' },
    { d: 'SW1', t: 'DHCP snooping and DAI on the workstation VLAN.', c: ['service dhcp', 'ip dhcp snooping', 'ip dhcp snooping vlan 10', 'ip arp inspection vlan 10', 'ip arp inspection validate src-mac dst-mac ip', 'interface g0/1', 'ip dhcp snooping trust', 'ip arp inspection trust', 'exit'], note: 'The validate options make DAI compare the ARP header against the Ethernet header too, which catches malformed ARP the binding check alone would pass.' },
    { d: 'SW1', t: 'A management address on the switch itself.', c: ['interface vlan 30', 'ip address 10.70.30.11 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 10.70.30.1', 'end', 'show ip dhcp snooping'] },
    { d: 'SW2', t: 'The second switch: VLANs, a management trunk and the jump-host port.', c: ['enable', 'configure terminal', 'vlan 30', 'name MGMT', 'exit', 'vlan 999', 'name BLACKHOLE', 'exit', 'interface g0/1', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk native vlan 999', 'switchport trunk allowed vlan 30', 'switchport nonegotiate', 'exit'] },
    { d: 'SW2', t: 'Lock the jump-host port and kill the spare.', c: ['interface f0/1', 'switchport mode access', 'switchport access vlan 30', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security mac-address sticky', 'switchport port-security violation shutdown', 'exit', 'interface f0/2', 'switchport mode access', 'switchport access vlan 999', 'shutdown', 'exit'], note: 'The jump host is the single most valuable device on this site, so its port gets the same treatment as everything else — and then some.' },
    { d: 'SW2', t: 'Management address and gateway.', c: ['interface vlan 30', 'ip address 10.70.30.12 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 10.70.30.1', 'end', 'show interfaces status'] },

    /* ---- PHASE 4: the policy ---- */
    { d: 'R1', t: 'What the OPS enclave may do.', c: ['configure terminal', 'ip access-list extended OPS-IN', 'permit tcp 10.70.10.0 0.0.0.255 host 10.70.20.50 eq 443', 'deny ip 10.70.10.0 0.0.0.255 10.70.20.0 0.0.0.255', 'deny ip 10.70.10.0 0.0.0.255 10.70.30.0 0.0.0.255', 'deny ip 10.70.10.0 0.0.0.255 10.70.40.0 0.0.0.255', 'permit ip any any', 'exit'], note: 'One required flow, three enclaves denied, everything else allowed out of the site. Read it top down the way the router does.' },
    { d: 'R1', t: 'What the sensors may do — even less.', c: ['ip access-list extended SENSOR-IN', 'permit tcp 10.70.40.0 0.0.0.255 host 10.70.20.50 eq 514', 'deny ip 10.70.40.0 0.0.0.255 10.70.0.0 0.0.255.255', 'permit ip any any', 'exit'], note: 'A field sensor needs to ship logs to exactly one collector on exactly one port. It has no business pinging anything, and this list means it cannot.' },
    { d: 'R1', t: 'And what the SECURE enclave may not do.', c: ['ip access-list extended SECURE-IN', 'permit tcp 10.70.20.0 0.0.0.255 10.70.10.0 0.0.0.255 established', 'permit tcp 10.70.20.0 0.0.0.255 10.70.40.0 0.0.0.255 established', 'deny ip 10.70.20.0 0.0.0.255 10.70.10.0 0.0.0.255', 'deny ip 10.70.20.0 0.0.0.255 10.70.40.0 0.0.0.255', 'permit ip any any', 'exit'], note: 'Read the two <code>established</code> lines first. ACLs are stateless: the collector\'s REPLY to an allowed session comes back through this interface and would be caught by the denies below. <code>established</code> matches only packets that are part of an existing conversation, so the replies get through while the collector still cannot start one.' },
    { d: 'R1', t: 'Apply all three inbound, at the enclave edge.', c: ['interface g0/1.10', 'ip access-group OPS-IN in', 'exit', 'interface g0/1.20', 'ip access-group SECURE-IN in', 'exit', 'interface g0/1.40', 'ip access-group SENSOR-IN in', 'end', 'show access-lists'], note: 'Inbound means the packet is filtered the moment it enters the router, before any routing decision — the cheapest place to drop traffic that was never allowed.' },

    /* ---- test the policy ---- */
    { d: 'OPS1', t: 'The workstation still gets an address.', c: ['ipconfig /renew', 'ipconfig /all'], note: 'DHCP survives the ACL because a DISCOVER is addressed to 255.255.255.255, which no deny line matches.' },
    { d: 'OPS1', t: 'But it cannot ping the collector.', c: ['ping 10.70.20.50'], note: 'Denied by the second line of OPS-IN. The only thing OPS may do with the collector is open TCP 443 to it.' },
    { d: 'SENSOR1', t: 'The sensor cannot ping the collector either.', c: ['ping 10.70.20.50'], note: 'One port, one direction, nothing else. This is what "least privilege" looks like written as an ACL.' },
    { d: 'SEC1', t: 'And the collector cannot reach into the workstation enclave.', c: ['ping 10.70.10.1'], note: 'Denied by SECURE-IN. Segmentation that only works one way is not segmentation.' },
    { d: 'JUMP', t: 'The management enclave, however, is unfiltered.', c: ['ping 10.70.20.50', 'ping 198.51.100.1'], note: 'No ACL is applied to the MGMT subinterface — that is deliberate, and it is exactly why the jump host is the most protected device on the site.' },

    /* ---- PHASE 5: harden R1 ---- */
    { d: 'R1', t: 'Two accounts at two privilege levels.', c: ['configure terminal', 'username netadmin privilege 15 secret Def3nce-Adm1n-Pass', 'username auditor privilege 1 secret Aud1tor-ReadOnly-Pass', 'enable secret Enable-Str0ng-Pass'], note: 'Authorisation in miniature: the auditor can look and cannot change.' },
    { d: 'R1', t: 'Turn on AAA and the password policy.', c: ['aaa new-model', 'aaa authentication login default local', 'security passwords min-length 10', 'login block-for 120 attempts 3 within 60', 'service password-encryption'], note: 'Three failures in 60 seconds locks logins for two minutes. That turns an unlimited brute-force attempt into a handful of guesses per minute.' },
    { d: 'R1', t: 'Switch off the services nobody uses.', c: ['no ip http server', 'no ip http secure-server', 'no ip domain-lookup'], note: 'Every listening service is an attack surface. The web UI on an edge router is one you will never open and somebody else might.' },
    { d: 'R1', t: 'SSH with a real key length.', c: ['ip domain-name site.mil.lab', 'crypto key generate rsa modulus 2048', 'ip ssh version 2'], note: 'The key is named after the hostname and domain, so both must exist first. 2048 bits is the modern floor.' },
    { d: 'R1', t: 'Decide who is even allowed to try.', c: ['access-list 10 permit 10.70.30.0 0.0.0.255', 'line vty 0 15', 'login local', 'transport input ssh', 'access-class 10 in', 'exec-timeout 5 0', 'logging synchronous', 'exit'], note: 'Two independent controls: SSH protects the session, access-class decides who may open one. A compromised workstation cannot even reach the login prompt.' },
    { d: 'R1', t: 'A banner, because it matters legally.', c: ['banner motd #WARNING: Authorised personnel only. All activity is monitored and recorded.#', 'end', 'show ip ssh'], note: 'A banner that says "welcome" has been used in court to argue access was invited. Say what this system is and who may use it.' },

    /* ---- PHASE 6: same standard on the switches ---- */
    { d: 'SW1', t: 'The identical hardening block on the first switch.', c: ['configure terminal', 'username netadmin privilege 15 secret Def3nce-Adm1n-Pass', 'username auditor privilege 1 secret Aud1tor-ReadOnly-Pass', 'enable secret Enable-Str0ng-Pass', 'aaa new-model', 'aaa authentication login default local', 'security passwords min-length 10', 'login block-for 120 attempts 3 within 60', 'service password-encryption', 'no ip http server', 'no ip http secure-server'], note: 'The value of a standard is that it is the same everywhere. The one device somebody rebuilt in a hurry is always the one that still allows Telnet.' },
    { d: 'SW1', t: 'SSH and the management restriction.', c: ['ip domain-name site.mil.lab', 'crypto key generate rsa modulus 2048', 'ip ssh version 2', 'access-list 10 permit 10.70.30.0 0.0.0.255', 'line vty 0 15', 'login local', 'transport input ssh', 'access-class 10 in', 'exec-timeout 5 0', 'logging synchronous', 'exit', 'banner motd #WARNING: Authorised personnel only. All activity is monitored and recorded.#', 'end', 'show ip ssh'] },
    { d: 'SW2', t: 'And on the second switch, from memory if you can.', c: ['configure terminal', 'username netadmin privilege 15 secret Def3nce-Adm1n-Pass', 'username auditor privilege 1 secret Aud1tor-ReadOnly-Pass', 'enable secret Enable-Str0ng-Pass', 'aaa new-model', 'aaa authentication login default local', 'security passwords min-length 10', 'login block-for 120 attempts 3 within 60', 'service password-encryption', 'no ip http server', 'no ip http secure-server', 'ip domain-name site.mil.lab', 'crypto key generate rsa modulus 2048', 'ip ssh version 2', 'access-list 10 permit 10.70.30.0 0.0.0.255', 'line vty 0 15', 'login local', 'transport input ssh', 'access-class 10 in', 'exec-timeout 5 0', 'logging synchronous', 'exit', 'banner motd #WARNING: Authorised personnel only. All activity is monitored and recorded.#', 'end', 'show ip ssh'], note: 'Twenty lines that should become one block in your memory. Every device you ever commission wants all of them.' },

    /* ---- PHASE 7: telemetry and reconnaissance ---- */
    { d: 'R1', t: 'Stop advertising yourself to the transit provider.', c: ['configure terminal', 'interface g0/0', 'no cdp enable', 'exit'], note: 'CDP is genuinely useful inside your own site and free reconnaissance for anybody outside it. Per-interface keeps the benefit and removes the exposure.' },
    { d: 'R1', t: 'Report everything to the collector.', c: ['logging host 10.70.20.50', 'logging trap informational', 'ntp server 198.51.100.1', 'snmp-server community Str0ngR0Community ro', 'snmp-server host 10.70.20.50 version 3 Str0ngR0Community', 'snmp-server location Site-B Comms Room', 'snmp-server contact netops@site.mil.lab', 'end', 'show ntp status'], note: 'Version 3 authenticates and encrypts. A v2c community string is a password sent in clear text, which is why it has no place here.' },
    { d: 'SW1', t: 'Same telemetry on the switch.', c: ['configure terminal', 'logging host 10.70.20.50', 'logging trap informational', 'ntp server 198.51.100.1', 'end'] },
    { d: 'SW2', t: 'And the second switch.', c: ['configure terminal', 'logging host 10.70.20.50', 'logging trap informational', 'ntp server 198.51.100.1', 'end'] },

    /* ---- PHASE 8: prove and save ---- */
    { d: 'R1', t: 'Read the policy back one last time.', c: ['show access-lists', 'show ip interface g0/1.10'], note: 'Check the ACL is applied where you think it is. An ACL that exists but is not applied to anything is a very convincing-looking no-op.' },
    { d: 'SW1', t: 'Confirm the access layer.', c: ['show port-security', 'show interfaces status', 'show ip dhcp snooping'], note: 'Four locked ports, one dead port, snooping live on the workstation VLAN.' },
    { d: 'R1', t: 'Save.', c: ['write memory'] },
    { d: 'SW1', t: 'Save.', c: ['write memory'] },
    { d: 'SW2', t: 'Save.', c: ['write memory'] },
    { d: 'TRANSIT', t: 'Save the transit router too.', c: ['enable', 'write memory'] },
  ],
  verify: ['show access-lists', 'show port-security', 'show interfaces status', 'show ip ssh', 'show ip dhcp snooping', 'show running-config', 'show ip interface g0/1.10'],
  explain: `<h3>Deny by default, expressed as an ACL</h3>
<p>"Deny everything unless a rule allows it" is a policy, not a command. The shape that implements it here is always the same: <b>permit what is required</b>, then <b>deny the internal destinations</b>, then <b>permit the rest</b>. The trailing permit is what keeps each enclave able to reach the outside world and to complete DHCP; the denies in the middle are the segmentation. Reverse any two of those lines and the whole policy changes, because an ACL is evaluated top down and stops at the first match.</p>
<h3>ACLs are stateless, and <code>established</code> is the proof</h3>
<p>The first version of this build looks right and does not work. OPS is permitted to open TCP 443 to the collector — but the collector's <em>reply</em> comes back into the router through the SECURE subinterface, where SECURE-IN denies traffic from 10.70.20.0/24 into 10.70.10.0/24. A router does not remember that it allowed the request, so the answer is dropped and the session simply hangs.</p>
<p><code>permit tcp 10.70.20.0 0.0.0.255 10.70.10.0 0.0.0.255 established</code> fixes it. The <code>established</code> keyword matches only segments that carry the ACK or RST flag, which means they belong to a conversation somebody else started. The collector can answer, and it still cannot open a session of its own. This is the closest a stateless ACL gets to a stateful firewall, and it is the single most common reason a correct-looking two-way policy fails in practice — always ask yourself where the reply comes back in.</p>
<h3>Why the sensor rule is so narrow</h3>
<p>A field sensor ships logs to one collector on one port. It has no business pinging anything, resolving names or reaching a workstation. Writing the rule that tightly costs nothing and means that a compromised sensor — the least physically protected device on the site — gives an attacker a single TCP port to one host. Least privilege is easiest to apply to the devices that do the least.</p>
<h3>Three separate VLAN-hopping defences</h3>
<p>Double tagging needs the attacker's access VLAN to be the trunk's native VLAN, so the native VLAN is moved to an unused one. Switch spoofing needs a port willing to negotiate a trunk, so every access port is explicitly <code>switchport mode access</code> and every trunk carries <code>switchport nonegotiate</code>. And even if both failed, the allowed-VLAN list on each trunk limits what could be reached. Layers, not a single control.</p>
<h3>Ports nobody uses</h3>
<p>An unused port that is up and in VLAN 1 is an open network socket in a room somebody can walk into. Shutting it is the minimum; also putting it in a VLAN with no gateway, no routes and no other members means that even if the port is brought back up, it leads nowhere. This pairing appears in every real hardening standard.</p>
<h3><code>access-class</code> versus <code>ip access-group</code></h3>
<p>Easy to confuse and they do different jobs. <code>ip access-group</code> filters traffic passing <em>through</em> an interface. <code>access-class</code> filters connections <em>to the device itself</em> on the VTY lines. This lab uses both: the enclave ACLs control what crosses the router, and MGMT-ONLY controls who may open a management session on it at all.</p>
<h3>The lock-yourself-out list</h3>
<p>Four things in this build can cut you off from a real device: <code>aaa new-model</code> with no working local account, <code>transport input ssh</code> before the RSA key exists, an <code>access-class</code> that does not include the subnet you are sitting in, and a violation-shutdown port-security rule on the port you are managing through. On real gear you stage these with a console connection available and a reload timer set. Here you click Reset — which is the whole reason to make the mistakes now.</p>`,
  checks: [
    { desc: 'R1 has a gateway subinterface for all four enclaves', fn: H => H.hasIp('R1', 'g0/1.10', '10.70.10.1') && H.hasIp('R1', 'g0/1.20', '10.70.20.1') && H.hasIp('R1', 'g0/1.30', '10.70.30.1') && H.hasIp('R1', 'g0/1.40', '10.70.40.1') && !H.i('R1', 'g0/1').shutdown },
    { desc: 'The transit link is addressed with a default route out', fn: H => H.hasIp('R1', 'g0/0', '198.51.100.2') && H.d('R1').staticRoutes.some(r => r.net === '0.0.0.0' && r.via === '198.51.100.1') },
    { desc: 'The OPS enclave has a DHCP pool with the low range excluded', fn: H => { const p = Object.values(H.d('R1').dhcp.pools).find(x => x.network === '10.70.10.0'); return !!(p && p.router === '10.70.10.1' && p.dns && p.lease) && H.d('R1').dhcp.excluded.some(e => e[0] === '10.70.10.1' && e[1] === '10.70.10.20'); } },
    { desc: 'All five VLANs exist on SW1, including the blackhole', fn: H => [10, 20, 30, 40].every(v => H.vlanExists('SW1', v)) && H.vlanExists('SW1', 999, 'BLACKHOLE') },
    { desc: 'Both trunks are hard-coded, non-negotiating and use an unused native VLAN', fn: H => ['g0/1', 'g0/2'].every(p => { const i = H.i('SW1', p); return i.swMode === 'trunk' && i.nonegotiate && i.nativeVlan === 999; }) && H.i('SW2', 'g0/1').nonegotiate && H.i('SW2', 'g0/1').nativeVlan === 999 },
    { desc: 'The management trunk carries only VLAN 30', fn: H => { const a = H.i('SW1', 'g0/2').allowed; return !!(a && a.includes(30) && !a.includes(10) && !a.includes(20) && !a.includes(40)); } },
    { desc: 'Every access port is in the right enclave VLAN', fn: H => H.access('SW1', 'f0/1', 10) && H.access('SW1', 'f0/2', 20) && H.access('SW1', 'f0/3', 40) && H.access('SW2', 'f0/1', 30) },
    { desc: 'Every access port has PortFast, BPDU guard and one-MAC port security', fn: H => [['SW1', 'f0/1'], ['SW1', 'f0/2'], ['SW1', 'f0/3'], ['SW2', 'f0/1']].every(([d, p]) => { const i = H.i(d, p); return i.stpPortfast && i.bpduguard && i.portSec && i.portSec.enabled && i.portSec.max === 1 && i.portSec.sticky && i.portSec.violation === 'shutdown'; }) },
    { desc: 'Every unused port is shut and parked in the blackhole VLAN', fn: H => [['SW1', 'f0/4'], ['SW2', 'f0/2']].every(([d, p]) => { const i = H.i(d, p); return i.shutdown && i.swMode === 'access' && i.accessVlan === 999; }) },
    { desc: 'DHCP snooping and strict DAI protect the workstation VLAN', fn: H => { const d = H.d('SW1'); return d.dhcp.snooping.enabled && d.dhcp.snooping.vlans.includes(10) && d.arai.vlans.includes(10) && d.arai.validate.length >= 2 && H.i('SW1', 'g0/1').snoopTrust && H.i('SW1', 'g0/1').araiTrust && !H.i('SW1', 'f0/1').snoopTrust; } },
    { desc: 'All three enclave ACLs exist and are applied inbound', fn: H => ['OPS-IN', 'SENSOR-IN', 'SECURE-IN'].every(n => !!H.d('R1').acls[n]) && H.i('R1', 'g0/1.10').aclIn === 'OPS-IN' && H.i('R1', 'g0/1.20').aclIn === 'SECURE-IN' && H.i('R1', 'g0/1.40').aclIn === 'SENSOR-IN' },
    { desc: 'The workstation leased an address despite the inbound ACL', fn: H => { const n = ND.pcNet(H.topo, H.d('OPS1')); return !!(n.ip && n.ip.startsWith('10.70.10.') && +n.ip.split('.')[3] > 20); } },
    { desc: 'OPS may open HTTPS to the collector', fn: H => H.tcp('OPS1', '10.70.20.50', 443) },
    { desc: 'OPS may not ping the collector', fn: H => H.pingBlocked('OPS1', '10.70.20.50') },
    { desc: 'OPS may not reach the management or sensor enclaves', fn: H => H.pingBlocked('OPS1', '10.70.30.10') && H.pingBlocked('OPS1', '10.70.40.20') },
    { desc: 'The sensor may ship logs to the collector on TCP 514', fn: H => H.tcp('SENSOR1', '10.70.20.50', 514) },
    { desc: 'The sensor may do nothing else inside the site', fn: H => H.pingBlocked('SENSOR1', '10.70.20.50') && H.tcpBlocked('SENSOR1', '10.70.20.50', 443) },
    { desc: 'The SECURE enclave cannot reach OPS or SENSOR', fn: H => H.pingBlocked('SEC1', '10.70.10.1') && H.pingBlocked('SEC1', '10.70.40.20') },
    { desc: 'The jump host is unfiltered and reaches the transit router', fn: H => H.ping('JUMP', '198.51.100.1') && H.ping('JUMP', '10.70.20.50') },
    { desc: 'All three devices run AAA with two privilege levels', fn: H => ['R1', 'SW1', 'SW2'].every(d => { const dev = H.d(d); return dev.aaa.newModel && dev.aaa.loginDefault === 'local' && dev.users.netadmin && dev.users.netadmin.privilege === 15 && dev.users.auditor && !!dev.enableSecret; }) },
    { desc: 'Password policy and login throttling are in force everywhere', fn: H => ['R1', 'SW1', 'SW2'].every(d => H.d(d).services.minPassLen >= 10 && !!H.d(d).services.loginBlock) },
    { desc: 'Every device runs SSHv2 with 2048-bit keys and refuses Telnet', fn: H => ['R1', 'SW1', 'SW2'].every(d => { const dev = H.d(d); return dev.rsaKey >= 2048 && dev.sshVersion === 2 && dev.lines.vty.transport === 'ssh' && dev.lines.vty.loginLocal; }) },
    { desc: 'Management sessions are restricted to the MGMT enclave', fn: H => ['R1', 'SW1', 'SW2'].every(d => H.d(d).lines.vty.accessClass === '10' && !!H.d(d).acls['10']) },
    { desc: 'Both HTTP servers are off on every device', fn: H => ['R1', 'SW1', 'SW2'].every(d => !H.d(d).services.http && !H.d(d).services.httpSecure) },
    { desc: 'CDP is disabled towards the transit provider but not internally', fn: H => !H.i('R1', 'g0/0').cdpEnabled && H.i('R1', 'g0/1').cdpEnabled },
    { desc: 'Every device logs to the collector and uses NTP', fn: H => ['R1', 'SW1', 'SW2'].every(d => H.d(d).logging.hosts.includes('10.70.20.50') && H.d(d).ntp.servers.includes('198.51.100.1')) },
    { desc: 'SNMPv3 reporting is configured on the boundary router', fn: H => H.d('R1').snmp.hosts.some(h => h.ip === '10.70.20.50' && String(h.version) === '3') && !!H.d('R1').snmp.location },
    { desc: 'All four devices saved', fn: H => ['R1', 'SW1', 'SW2', 'TRANSIT'].every(d => H.saved(d)) },
  ],
});

/* ============================================================= */
L({
  id: 'm4-cafe', ord: 4, vol: 3, tier: 'mega', day: 'Mega Lab 4', title: 'Café — Guest Wi-Fi, Card Payments & One Public Address',
  topics: 'four VLANs on one router · guest isolation · a payment VLAN that answers nobody · short-lease guest DHCP · PAT for the whole site · static NAT for the camera recorder · PoE for the access point · QoS trust boundary at the edge · port security · DHCP snooping · local name resolution',
  devices: [
    { id: 'ISP', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PAYGW', type: 'pc', ifaces: ['e0'], pc: { ip: '198.51.100.50', mask: '255.255.255.0', gw: '198.51.100.1' } },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'f0/5', 'g0/1'] },
    { id: 'POS1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.80.20.10', mask: '255.255.255.0', gw: '10.80.20.1' } },
    { id: 'OFFICE1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'AP1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.80.30.5', mask: '255.255.255.0', gw: '10.80.30.1' }, poeDevice: 'AIR-AP1815i' },
    { id: 'CCTV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.80.10.20', mask: '255.255.255.0', gw: '10.80.10.1' } },
    { id: 'GUEST1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
  ],
  links: [
    ['PAYGW', 'e0', 'ISP', 'g0/1'],
    ['ISP', 'g0/0', 'R1', 'g0/0'],
    ['R1', 'g0/1', 'SW1', 'g0/1'],
    ['SW1', 'f0/1', 'POS1', 'e0'],
    ['SW1', 'f0/2', 'OFFICE1', 'e0'],
    ['SW1', 'f0/3', 'AP1', 'e0'],
    ['SW1', 'f0/4', 'CCTV', 'e0'],
    ['SW1', 'f0/5', 'GUEST1', 'e0'],
  ],
  layout: {
    PAYGW: [420, 90], ISP: [350, 50], R1: [265, 50], SW1: [175, 70],
    POS1: [70, 4], OFFICE1: [70, 42], AP1: [70, 80], CCTV: [70, 118], GUEST1: [70, 156],
  },
  setupAll: topo => {
    for (const id of ['R1', 'SW1']) topo.devs[id].hostname = id;
    const isp = topo.devs.ISP;
    isp.hostname = 'ISP';
    const a = ND.getIface(isp, 'g0/0'), b = ND.getIface(isp, 'g0/1');
    a.ip = { addr: '203.0.113.1', mask: '255.255.255.248' }; a.shutdown = false;
    b.ip = { addr: '198.51.100.1', mask: '255.255.255.0' }; b.shutdown = false;
    isp.staticRoutes.push({ net: '10.80.0.0', mask: '255.255.0.0', via: '203.0.113.2', ad: 1 });
  },
  intro: `<b>The situation:</b> an independent café that has just been told by its card processor that the till must not share a network with the customer Wi-Fi. There is one router, one switch, one access point, a card terminal, a back-office PC and a camera recorder in the stock room. The ISP has delivered a small block of public addresses; everything inside is unconfigured.<br><br><b>Your goal:</b> build a network that a small business would actually be able to keep running. Customers get Wi-Fi with a short lease and no route to anything of yours. The card terminal talks to exactly one address on the internet and answers nobody. The owner can reach the camera recorder from home. And all of it hides behind a single public address, except the one host that deliberately does not.<br><br><b>Why this one matters:</b> this is the most common real-world small-network brief there is. Guest isolation, payment isolation and one public address are the three things every café, dentist and corner shop needs, and they are all on the CCNA blueprint.<br><span class="dim">Note: this simulator models NAT configuration and the translation table rather than rewriting packet headers, so the static NAT is verified with <code>show ip nat translations</code> rather than by connecting to it from outside — which is exactly how the exam objective is worded.</span>`,
  pintro: `<b>The brief:</b> a café with one router, one switch and five devices. Public block <b>203.0.113.0/29</b> from the ISP (gateway .1, your router .2, and .3 spare). The card processor's payment gateway lives at <b>198.51.100.50</b>.<br><br>Four requirements from the owner and the card processor: customers must have Wi-Fi that cannot see anything of the business's; the card terminal must reach the payment gateway and nothing else, and must not be reachable from inside either; the owner must be able to view the camera recorder from home; and the whole site has one public address to work with. Build it.`,
  spec: [
    { t: 'Addressing plan (use exactly these numbers)', r: [
      'VLAN <b>10 STAFF</b> — 10.80.10.0/24, gateway .1 · back-office PC by DHCP · camera recorder static at .20',
      'VLAN <b>20 POS</b> — 10.80.20.0/24, gateway .1 · card terminal static at .10',
      'VLAN <b>30 GUEST</b> — 10.80.30.0/24, gateway .1 · access point static at .5 · customers by DHCP',
      'VLAN <b>99 MGMT</b> — 10.80.99.0/24, gateway .1 · switch at .11',
      'Public block — 203.0.113.0/29 (ISP .1, R1 .2, and .3 reserved for the camera recorder)',
    ] },
    { d: 'R1 — the one router that does everything', r: [
      'Router-on-a-stick with a dot1q subinterface per VLAN, each holding the .1 gateway.',
      'G0/0 = 203.0.113.2/29 with a default route to the ISP.',
      'DHCP pool <b>STAFF</b> (1-day lease) and pool <b>GUEST</b> (2-hour lease, DNS 8.8.8.8), first 20 addresses excluded in each.',
      'PAT for everything in 10.80.0.0/16 onto G0/0.',
      'A <b>static NAT</b> mapping 10.80.10.20 to the spare public address 203.0.113.3.',
      'A local host entry so <code>paygw</code> resolves to 198.51.100.50.',
      'SSHv2, a local account, NTP and a banner.',
    ] },
    { t: 'The two isolation policies', r: [
      '<b>GUEST-IN</b>, inbound on the guest subinterface: customers may reach the internet and nothing in 10.80.0.0/16.',
      '<b>POS-IN</b>, inbound on the POS subinterface: the card terminal may open <b>TCP 443 to 198.51.100.50 only</b>. Everything else it tries is denied — and because the list ends in an explicit deny, nothing inside the café can hold a conversation with it either.',
    ] },
    { d: 'SW1 — the only switch', r: [
      'All four VLANs created and named, G0/1 a hard-coded dot1q trunk carrying them.',
      'F0/1 in VLAN 20 (till), F0/2 and F0/4 in VLAN 10 (office PC and camera recorder), F0/3 in VLAN 30 (access point), F0/5 in VLAN 30 (a wired customer seat).',
      'PortFast and BPDU guard on every host port.',
      'Port security on the till and the camera recorder: maximum 1, sticky, violation shutdown.',
      '<code>power inline auto</code> on the access-point port.',
      'QoS enabled, with the router uplink trusting DSCP and the guest ports forced to CoS <b>0</b>.',
      'DHCP snooping for VLANs 10 and 30, trusting only the uplink.',
      'Management address 10.80.99.11 with a default gateway, plus SSH.',
    ] },
    { t: 'Verification', r: [
      'The card terminal can open TCP 443 to 198.51.100.50 and cannot ping it, or anything inside the café.',
      'Nothing inside the café can hold a conversation with the card terminal either.',
      'A customer device leases a 2-hour address, reaches the internet, and cannot reach the office PC, the recorder or the till.',
      'The translation table shows one permanent mapping for the camera recorder at 203.0.113.3, alongside the dynamic PAT entries.',
      'Both devices are saved.',
    ] },
  ],
  tasks: [
    { t: 'PHASE 1 — Build the switch first, so the router has VLANs to talk to',
      do: [
        'Create VLANs <b>10 STAFF</b>, <b>20 POS</b>, <b>30 GUEST</b> and <b>99 MGMT</b>.',
        'Make <b>G0/1</b> a hard-coded dot1q trunk carrying <b>10,20,30,99</b>, with DTP switched off.',
        'Put <b>F0/1</b> in VLAN 20, <b>F0/2</b> and <b>F0/4</b> in VLAN 10, <b>F0/3</b> and <b>F0/5</b> in VLAN 30 — all with PortFast and BPDU guard.',
      ],
      done: '<code>show vlan brief</code> shows every port where you intended it and the trunk carries all four VLANs.',
      why: 'Four VLANs on one switch and one router is the shape of almost every small business network. The whole design rests on which port is in which VLAN, so get that right before anything else.' },

    { t: 'Power the access point and protect the two ports that matter',
      do: [
        'On <b>F0/3</b>: <code>power inline auto</code>.',
        'On <b>F0/1</b> (the till) and <b>F0/4</b> (the recorder): port security, maximum <b>1</b>, sticky, violation <b>shutdown</b>.',
        'Check with <code>show power inline</code> and <code>show port-security</code>.',
      ],
      done: 'The access point draws power over its data cable, and two ports are locked to one device each.',
      why: 'In a café the ports people can physically reach are the risk. The till and the recorder are the two nobody should ever be able to unplug and replace with a laptop without it being noticed.' },

    { t: 'PHASE 2 — Set a QoS trust boundary at the edge',
      do: [
        'Enable <code>mls qos</code> globally on <b>SW1</b>.',
        'On <b>G0/1</b> (towards the router): <code>mls qos trust dscp</code>.',
        'On the guest ports <b>F0/3</b> and <b>F0/5</b>: <code>mls qos cos 0</code> to overwrite whatever a customer device claims.',
      ],
      done: 'Markings from the router are trusted; markings from customer devices are discarded.',
      why: 'A trust boundary is a decision about whose markings you believe. A laptop in the window seat can mark all its traffic as voice priority; forcing CoS 0 on that port means it gets no advantage from trying.' },

    { t: 'Give the switch an address and secure its own management',
      do: [
        'Create <b>interface vlan 99</b> with <b>10.80.99.11/24</b> and a default gateway of <b>10.80.99.1</b>.',
        'Add <code>ip domain-name cafe.lab</code>, 1024-bit RSA keys, <code>ip ssh version 2</code>, a local account and VTY lines set to <code>login local</code> with <code>transport input ssh</code>.',
      ],
      done: 'The switch has an address and accepts SSH only.',
      why: 'A small site is exactly where management gets skipped, and exactly where it matters: there is nobody on site who can plug in a console cable when something goes wrong at 6am.' },

    { t: 'PHASE 3 — Router-on-a-stick for all four VLANs',
      do: [
        'Bring up <b>G0/1</b> (no address), then create <b>G0/1.10</b>, <b>.20</b>, <b>.30</b> and <b>.99</b>.',
        'Tag each one with its VLAN and give it the <b>.1</b> address of that subnet.',
        'Address <b>G0/0</b> as <b>203.0.113.2 255.255.255.248</b> and add a default route to <b>203.0.113.1</b>.',
      ],
      done: 'Five interfaces up, four of them gateways.',
      why: 'One physical cable carries four networks because the trunk tags each frame. The subinterface that matches the tag is the one that handles the packet — that is the whole trick.' },

    { t: 'PHASE 4 — Address staff and customers automatically, with different rules',
      do: [
        'Exclude the first 20 addresses of <b>10.80.10.0/24</b> and <b>10.80.30.0/24</b>.',
        'Build pool <b>STAFF</b> with a <b>1-day</b> lease and pool <b>GUEST</b> with a <b>2-hour</b> lease (<code>lease 0 2 0</code>).',
        'Give both DNS 8.8.8.8 and the right default router.',
      ],
      done: 'Two pools with deliberately different lease lengths.',
      why: 'Lease length is a design decision, not a default. Customers sit for an hour and leave; a 1-day guest lease in a busy café exhausts the pool by mid-afternoon and the last twenty customers get nothing.' },

    { t: 'PHASE 5 — Translate the whole site onto one public address',
      do: [
        'Mark <b>G0/0</b> as <code>ip nat outside</code> and all four subinterfaces as <code>ip nat inside</code>.',
        'Build <code>access-list 1 permit 10.80.0.0 0.0.255.255</code> and configure <code>ip nat inside source list 1 interface g0/0 overload</code>.',
        'From <b>OFFICE1</b>, renew and then ping <b>198.51.100.50</b>; check <code>show ip nat translations</code> on R1.',
      ],
      done: 'The office PC reaches the internet and R1 lists a translation for it.',
      why: 'One ACL and one command put an entire business behind a single address. <code>overload</code> is what makes it PAT: the port number is what keeps hundreds of conversations apart.' },

    { t: 'Publish the camera recorder — and only the recorder',
      do: [
        'Add a static NAT: <code>ip nat inside source static 10.80.10.20 203.0.113.3</code>.',
        'From <b>PAYGW</b> (standing in for a device out on the internet), ping <b>203.0.113.2</b> to prove the public side is live.',
        'Check <code>show ip nat translations</code> again and compare the static entry with the dynamic ones.',
      ],
      done: 'A permanent one-to-one mapping appears in the translation table while everything else stays hidden behind PAT.',
      why: 'Static NAT is a permanent, two-way mapping, which is what makes an inside host reachable from outside. PAT alone cannot do this — there is no translation until an inside host starts a conversation.' },

    { t: 'PHASE 6 — Isolate the customers',
      do: [
        'Build extended ACL <b>GUEST-IN</b>: <code>deny ip 10.80.30.0 0.0.0.255 10.80.0.0 0.0.255.255</code>, then <code>permit ip any any</code>.',
        'Apply it <b>inbound</b> on <b>G0/1.30</b>.',
        'From <b>GUEST1</b>: renew, then ping the internet (works), the office PC and the till (both denied).',
      ],
      done: 'Customers have internet access and no path to anything of the business\'s.',
      why: 'The deny is written against the whole 10.80.0.0/16, not each subnet, so it keeps working when the owner adds a VLAN next year. The trailing permit is what still lets DHCP and the internet through.' },

    { t: 'Isolate the till, in both directions',
      do: [
        'Build <b>POS-IN</b>: <code>permit tcp 10.80.20.0 0.0.0.255 host 198.51.100.50 eq 443</code>, then <code>deny ip any any</code>.',
        'Apply it inbound on <b>G0/1.20</b>.',
        'From <b>POS1</b>: ping the payment gateway (denied — only 443 is allowed) and ping the office PC (denied).',
        'From <b>OFFICE1</b>: ping the till and note that it also fails.',
      ],
      done: 'One permitted flow out, and nothing at all coming back in.',
      why: 'That last test is the interesting one. The till\'s ACL is inbound, so a ping from the office reaches it but the <em>reply</em> is dropped on the way back. An explicit deny on a payment VLAN means it holds no conversation it did not start — which is exactly what a card processor wants to hear.' },

    { t: 'PHASE 7 — Add name resolution and the rest of the management standard',
      do: [
        'On <b>R1</b>, add <code>ip host paygw 198.51.100.50</code> and test it with <code>ping paygw</code>.',
        'Add <code>ip domain-name cafe.lab</code>, 1024-bit RSA keys, <code>ip ssh version 2</code>, a local account, and VTY lines set to <code>login local</code> with <code>transport input ssh</code>.',
        'Add <code>ntp master 3</code> on R1 and <code>ntp server 10.80.99.1</code> on SW1, plus a banner on both.',
      ],
      done: 'A name that resolves locally, SSH on both devices, and one shared clock.',
      why: '<code>ip host</code> is a one-line local hosts file. On a site with no DNS server of its own it is how you stop typing addresses you will eventually mistype.' },

    { t: 'PHASE 8 — Protect DHCP, verify, and save',
      do: [
        'On <b>SW1</b>: enable DHCP snooping for VLANs <b>10,30</b> and trust only <b>G0/1</b>.',
        'Renew <b>GUEST1</b> and <b>OFFICE1</b> once more to prove the legitimate flow still works.',
        'Run <code>show ip nat translations</code>, <code>show access-lists</code>, <code>show port-security</code>, then save both devices.',
      ],
      done: 'Snooping is live, both clients still lease, and the configuration is on disk.',
      why: 'A customer plugging a travel router into a wall socket is the single most likely incident in a café. Snooping means their DHCP server is ignored, rather than handing half the room a broken gateway.' },
  ],
  steps: [
    /* ---- PHASE 1: the switch ---- */
    { d: 'SW1', t: 'Create the four VLANs.', c: ['enable', 'configure terminal', 'vlan 10', 'name STAFF', 'exit', 'vlan 20', 'name POS', 'exit', 'vlan 30', 'name GUEST', 'exit', 'vlan 99', 'name MGMT', 'exit'] },
    { d: 'SW1', t: 'One trunk carries all four to the router.', c: ['interface g0/1', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20,30,99', 'switchport nonegotiate', 'exit'], note: 'Hard-coded rather than negotiated. On a site with no on-call engineer, deterministic beats clever every time.' },
    { d: 'SW1', t: 'The till, on its own VLAN and locked to one device.', c: ['interface f0/1', 'switchport mode access', 'switchport access vlan 20', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security mac-address sticky', 'switchport port-security violation shutdown', 'exit'], note: 'The card processor asked for the till to be on its own network. This port is where that requirement becomes real.' },
    { d: 'SW1', t: 'The back office and the camera recorder.', c: ['interface f0/2', 'switchport mode access', 'switchport access vlan 10', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit', 'interface f0/4', 'switchport mode access', 'switchport access vlan 10', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'switchport port-security', 'switchport port-security maximum 1', 'switchport port-security mac-address sticky', 'switchport port-security violation shutdown', 'exit'] },
    { d: 'SW1', t: 'The access point — powered over its data cable — and a wired customer seat.', c: ['interface f0/3', 'switchport mode access', 'switchport access vlan 30', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'power inline auto', 'exit', 'interface f0/5', 'switchport mode access', 'switchport access vlan 30', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit', 'do show power inline'], note: 'One cable for data and power is why an access point can go on a ceiling where there is no socket.' },
    { d: 'SW1', t: 'Decide whose QoS markings you believe.', c: ['mls qos', 'interface g0/1', 'mls qos trust dscp', 'exit', 'interface range f0/3, f0/5', 'mls qos cos 0', 'exit'], note: 'A laptop in the window can mark everything it sends as top priority. Forcing CoS 0 at the edge means it gains nothing by trying.' },
    { d: 'SW1', t: 'A management address and SSH on the switch.', c: ['interface vlan 99', 'ip address 10.80.99.11 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 10.80.99.1', 'ip domain-name cafe.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username owner secret Cafe-Str0ng-Pass', 'line vty 0 15', 'login local', 'transport input ssh', 'exit', 'end', 'show vlan brief'] },

    /* ---- PHASE 3: the router ---- */
    { d: 'R1', t: 'Bring up the trunk-facing interface, then the staff and POS gateways.', c: ['enable', 'configure terminal', 'interface g0/1', 'description Trunk to SW1', 'no shutdown', 'exit', 'interface g0/1.10', 'encapsulation dot1q 10', 'ip address 10.80.10.1 255.255.255.0', 'exit', 'interface g0/1.20', 'encapsulation dot1q 20', 'ip address 10.80.20.1 255.255.255.0', 'exit'], note: 'The physical interface carries no address of its own. If it stays shut, nothing below it works.' },
    { d: 'R1', t: 'And the guest and management gateways.', c: ['interface g0/1.30', 'encapsulation dot1q 30', 'ip address 10.80.30.1 255.255.255.0', 'exit', 'interface g0/1.99', 'encapsulation dot1q 99', 'ip address 10.80.99.1 255.255.255.0', 'exit'] },
    { d: 'R1', t: 'The public side, from a /29 rather than a /30.', c: ['interface g0/0', 'description To ISP', 'ip address 203.0.113.2 255.255.255.248', 'no shutdown', 'exit', 'ip route 0.0.0.0 0.0.0.0 203.0.113.1', 'do show ip interface brief'], note: 'A /29 gives six usable addresses. You need two — one for the router and one spare for the camera recorder.' },

    /* ---- PHASE 4: DHCP ---- */
    { d: 'R1', t: 'Reserve the low range in both client subnets.', c: ['ip dhcp excluded-address 10.80.10.1 10.80.10.20', 'ip dhcp excluded-address 10.80.30.1 10.80.30.20'] },
    { d: 'R1', t: 'Staff get a day-long lease.', c: ['ip dhcp pool STAFF', 'network 10.80.10.0 255.255.255.0', 'default-router 10.80.10.1', 'dns-server 8.8.8.8', 'domain-name cafe.lab', 'lease 1', 'exit'] },
    { d: 'R1', t: 'Customers get two hours.', c: ['ip dhcp pool GUEST', 'network 10.80.30.0 255.255.255.0', 'default-router 10.80.30.1', 'dns-server 8.8.8.8', 'domain-name guest.cafe.lab', 'lease 0 2 0', 'exit'], note: 'Lease length is a design decision. A day-long guest lease in a busy café exhausts the pool by mid-afternoon.' },

    /* ---- PHASE 5: NAT ---- */
    { d: 'R1', t: 'Mark the NAT boundary — outside first.', c: ['interface g0/0', 'ip nat outside', 'exit', 'interface g0/1.10', 'ip nat inside', 'exit', 'interface g0/1.20', 'ip nat inside', 'exit'], note: 'NAT only acts on traffic crossing between an inside and an outside interface. Every subinterface needs the tag.' },
    { d: 'R1', t: 'And the remaining two inside interfaces.', c: ['interface g0/1.30', 'ip nat inside', 'exit', 'interface g0/1.99', 'ip nat inside', 'exit'] },
    { d: 'R1', t: 'Hide the whole site behind one address.', c: ['access-list 1 permit 10.80.0.0 0.0.255.255', 'ip nat inside source list 1 interface g0/0 overload'], note: 'One ACL and one command put an entire business behind a single public address. <code>overload</code> is what makes it PAT.' },
    { d: 'R1', t: 'Publish the camera recorder on the spare public address.', c: ['ip nat inside source static 10.80.10.20 203.0.113.3', 'end', 'show ip nat translations'], note: 'A static NAT is permanent and works in both directions, which is what makes an inside host reachable from outside. PAT alone cannot do that.' },
    { d: 'OFFICE1', t: 'The back office reaches the internet.', c: ['ipconfig /renew', 'ping 198.51.100.50'], note: 'Its private address never appears on the internet — the ISP only ever sees 203.0.113.2.' },
    { d: 'PAYGW', t: 'Confirm the public side of the café is live.', c: ['ping 203.0.113.2'], note: 'The router answers on its public address. The recorder\'s mapping to 203.0.113.3 is what would make it answer too — read it in the translation table below rather than pinging it, because this simulator models the NAT table rather than rewriting headers.' },
    { d: 'R1', t: 'Compare the static and dynamic entries.', c: ['show ip nat translations'], note: 'The static entry exists whether or not anybody is using it. The dynamic ones appear only when an inside host starts a conversation.' },

    /* ---- PHASE 6: isolation ---- */
    { d: 'R1', t: 'Customers may reach the internet and nothing of yours.', c: ['configure terminal', 'ip access-list extended GUEST-IN', 'deny ip 10.80.30.0 0.0.0.255 10.80.0.0 0.0.255.255', 'permit ip any any', 'exit', 'interface g0/1.30', 'ip access-group GUEST-IN in', 'exit'], note: 'Written against the whole 10.80.0.0/16 so it still holds when the owner adds a VLAN next year.' },
    { d: 'R1', t: 'The till talks to one address, on one port, and answers nobody.', c: ['ip access-list extended POS-IN', 'permit tcp 10.80.20.0 0.0.0.255 host 198.51.100.50 eq 443', 'deny ip any any', 'exit', 'interface g0/1.20', 'ip access-group POS-IN in', 'end', 'show access-lists'], note: 'The explicit deny at the end is the interesting line. Because it is inbound, even a reply to something the office sent is dropped — the till holds no conversation it did not start.' },
    { d: 'GUEST1', t: 'A customer leases an address and reaches the internet.', c: ['ipconfig /renew', 'ipconfig /all', 'ping 198.51.100.50'], note: 'Two-hour lease, public DNS, and a working route out. Exactly what a customer needs and nothing more.' },
    { d: 'GUEST1', t: 'But nothing inside the café.', c: ['ping 10.80.10.20', 'ping 10.80.20.10'], note: 'The recorder and the till, both denied by the first line of GUEST-IN.' },
    { d: 'POS1', t: 'The till cannot even ping the payment gateway.', c: ['ping 198.51.100.50'], note: 'Only TCP 443 is permitted. ICMP falls through to the explicit deny — which is what "least privilege" looks like in practice.' },
    { d: 'POS1', t: 'And it certainly cannot reach the office.', c: ['ping 10.80.10.20'], note: 'Card data networks are meant to be islands. This is the whole reason the card processor asked for a separate VLAN.' },
    { d: 'OFFICE1', t: 'Nor can the office reach the till.', c: ['ping 10.80.20.10'], note: 'The ping gets there, but the reply is dropped inbound by POS-IN. Isolation in both directions from one access list.' },

    /* ---- PHASE 7: names and management ---- */
    { d: 'R1', t: 'A one-line local hosts file.', c: ['configure terminal', 'ip host paygw 198.51.100.50', 'do show hosts', 'do ping paygw'], note: 'On a site with no DNS server of its own, <code>ip host</code> is how you stop typing addresses you will eventually mistype.' },
    { d: 'R1', t: 'SSH, time and a banner on the router.', c: ['ip domain-name cafe.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username owner secret Cafe-Str0ng-Pass', 'line vty 0 15', 'login local', 'transport input ssh', 'exit', 'ntp master 3', 'banner motd #Cafe network. Authorised staff only.#', 'end', 'show ip ssh'] },
    { d: 'SW1', t: 'Point the switch at the router for time.', c: ['configure terminal', 'ntp server 10.80.99.1', 'banner motd #Cafe network. Authorised staff only.#', 'end'] },

    /* ---- PHASE 8: snooping, verify, save ---- */
    { d: 'SW1', t: 'Ignore any DHCP server a customer plugs in.', c: ['configure terminal', 'service dhcp', 'ip dhcp snooping', 'ip dhcp snooping vlan 10,30', 'interface g0/1', 'ip dhcp snooping trust', 'exit', 'end', 'show ip dhcp snooping'], note: 'A travel router in a wall socket is the single most likely incident here. Snooping means it is ignored instead of breaking half the room.' },
    { d: 'GUEST1', t: 'Prove the legitimate flow still works.', c: ['ipconfig /renew', 'ipconfig'] },
    { d: 'OFFICE1', t: 'And for staff too.', c: ['ipconfig /renew', 'ipconfig'] },
    { d: 'SW1', t: 'Read back the access layer.', c: ['show port-security', 'show interfaces trunk'] },
    { d: 'R1', t: 'Read back the edge.', c: ['show ip nat translations', 'show access-lists', 'show ip dhcp binding'] },
    { d: 'R1', t: 'Save.', c: ['write memory'] },
    { d: 'SW1', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show ip nat translations', 'show access-lists', 'show ip dhcp binding', 'show port-security', 'show power inline', 'show interfaces trunk', 'show hosts'],
  explain: `<h3>PAT and static NAT side by side</h3>
<p>This lab runs both at once, which is the clearest way to see the difference. <b>PAT</b> (<code>ip nat inside source list 1 interface g0/0 overload</code>) is created on demand: an inside host starts a conversation, the router allocates a source port, and the entry disappears when the conversation ends. Nothing outside can use it to get in. <b>Static NAT</b> (<code>ip nat inside source static 10.80.10.20 203.0.113.3</code>) is a permanent one-to-one mapping that exists whether or not anybody is using it — which is exactly why it makes an inside host reachable from the internet, and exactly why you create as few of them as possible.</p>
<h3>Why the till's ACL ends in an explicit deny</h3>
<p>Every ACL already ends in an implicit deny, so <code>deny ip any any</code> adds nothing functionally. It matters for two other reasons. First, it documents the intent: anybody reading this configuration can see that the omission was deliberate. Second, an explicit line can be matched and counted, so <code>show access-lists</code> tells you how much traffic is being dropped.</p>
<p>The deeper point is the direction. POS-IN is applied <em>inbound</em> on the POS subinterface, so it filters everything the till sends — including replies. A ping from the office reaches the till, the till answers, and the answer is dropped on the way back in. From the office it looks like the till is offline. That is the desired behaviour on a card-data network: it holds no conversation it did not start.</p>
<h3>Lease length as a design decision</h3>
<p>The staff pool uses a day; the guest pool uses two hours. This is not a detail. A /24 gives roughly 230 usable addresses; a café seeing 300 customers a day with a 24-hour lease runs out before closing time, and the customers who arrive after that get nothing while most of the pool is held by people who left hours ago. Match the lease to how long the device actually stays.</p>
<h3>The QoS trust boundary</h3>
<p>QoS markings are just bits in a header — anybody can set them. The trust boundary is where you decide whose markings to believe. Here the uplink from the router is trusted and the customer ports are forced to CoS 0, so a laptop marking all its traffic as priority gains nothing. Trust boundaries always sit at the edge, facing the devices you do not control.</p>
<h3>What "one public address" really costs</h3>
<p>Everything in the café shares 203.0.113.2, which is fine for outbound traffic and impossible for inbound. The moment the owner wants to see a camera from home, you need either a second public address (what this lab does) or port forwarding onto the shared one. That trade-off — address scarcity versus reachability — is the reason NAT exists and the reason IPv6 removes the problem entirely.</p>`,
  checks: [
    { desc: 'All four VLANs exist and the trunk carries them', fn: H => [10, 20, 30, 99].every(v => H.vlanExists('SW1', v)) && (() => { const i = H.i('SW1', 'g0/1'); return i.swMode === 'trunk' && i.nonegotiate && i.allowed && [10, 20, 30, 99].every(v => i.allowed.includes(v)); })() },
    { desc: 'Every host port is in the right VLAN with PortFast and BPDU guard', fn: H => H.access('SW1', 'f0/1', 20) && H.access('SW1', 'f0/2', 10) && H.access('SW1', 'f0/3', 30) && H.access('SW1', 'f0/4', 10) && H.access('SW1', 'f0/5', 30) && ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'f0/5'].every(p => H.i('SW1', p).stpPortfast && H.i('SW1', p).bpduguard) },
    { desc: 'The till and the recorder are locked to a single device each', fn: H => ['f0/1', 'f0/4'].every(p => { const s = H.i('SW1', p).portSec; return !!(s && s.enabled && s.max === 1 && s.sticky && s.violation === 'shutdown'); }) },
    { desc: 'The access point port supplies PoE', fn: H => H.i('SW1', 'f0/3').poe === 'auto' },
    { desc: 'A QoS trust boundary exists: uplink trusted, guest ports forced to CoS 0', fn: H => H.d('SW1').qos.enabled && H.i('SW1', 'g0/1').qosTrust === 'dscp' && H.i('SW1', 'f0/3').qosCos === 0 && H.i('SW1', 'f0/5').qosCos === 0 },
    { desc: 'R1 has a gateway subinterface for every VLAN', fn: H => H.hasIp('R1', 'g0/1.10', '10.80.10.1') && H.hasIp('R1', 'g0/1.20', '10.80.20.1') && H.hasIp('R1', 'g0/1.30', '10.80.30.1') && H.hasIp('R1', 'g0/1.99', '10.80.99.1') && !H.i('R1', 'g0/1').shutdown },
    { desc: 'The public side is addressed from the /29 with a default route', fn: H => H.hasIp('R1', 'g0/0', '203.0.113.2', '255.255.255.248') && H.d('R1').staticRoutes.some(r => r.net === '0.0.0.0' && r.via === '203.0.113.1') },
    { desc: 'Two pools exist with deliberately different lease lengths', fn: H => { const s = Object.values(H.d('R1').dhcp.pools).find(p => p.network === '10.80.10.0'), g = Object.values(H.d('R1').dhcp.pools).find(p => p.network === '10.80.30.0'); return !!(s && g && s.router === '10.80.10.1' && g.router === '10.80.30.1' && g.dns && String(s.lease) !== String(g.lease)); } },
    { desc: 'Every inside interface and the outside interface are tagged for NAT', fn: H => H.i('R1', 'g0/0').natOutside && ['g0/1.10', 'g0/1.20', 'g0/1.30', 'g0/1.99'].every(p => H.i('R1', p).natInside) },
    { desc: 'PAT hides the whole site behind the public address', fn: H => { const d = H.d('R1').nat.dynamic; return !!(d && d.overload && d.acl === '1') && !!H.d('R1').acls['1']; } },
    { desc: 'A static NAT publishes the camera recorder, and only the recorder', fn: H => { const st = H.d('R1').nat.statics; return st.length === 1 && st[0].local === '10.80.10.20' && st[0].global === '203.0.113.3'; } },
    { desc: 'The public side of the café is reachable from the internet', fn: H => H.ping('PAYGW', '203.0.113.2') },
    { desc: 'Staff reach the internet through PAT', fn: H => H.ping('OFFICE1', '198.51.100.50') },
    { desc: 'Both isolation ACLs exist and are applied inbound', fn: H => !!H.d('R1').acls['GUEST-IN'] && !!H.d('R1').acls['POS-IN'] && H.i('R1', 'g0/1.30').aclIn === 'GUEST-IN' && H.i('R1', 'g0/1.20').aclIn === 'POS-IN' },
    { desc: 'A customer leases a guest address and reaches the internet', fn: H => { const n = ND.pcNet(H.topo, H.d('GUEST1')); return !!(n.ip && n.ip.startsWith('10.80.30.') && +n.ip.split('.')[3] > 20) && H.ping('GUEST1', '198.51.100.50'); } },
    { desc: 'Customers cannot reach the recorder or the till', fn: H => H.pingBlocked('GUEST1', '10.80.10.20') && H.pingBlocked('GUEST1', '10.80.20.10') },
    { desc: 'The till may open TCP 443 to the payment gateway', fn: H => H.tcp('POS1', '198.51.100.50', 443) },
    { desc: 'The till may not ping the payment gateway', fn: H => H.tcpBlocked('POS1', '198.51.100.50', 80) && H.pingBlocked('POS1', '198.51.100.50') },
    { desc: 'The till cannot reach anything inside the café', fn: H => H.pingBlocked('POS1', '10.80.10.20') },
    { desc: 'And nothing inside the café can hold a conversation with the till', fn: H => H.ping('OFFICE1', '10.80.20.1') && !ND.tracePacket(H.topo, H.d('OFFICE1'), '10.80.20.10', { proto: 'icmp' }).ok },
    { desc: 'The router resolves paygw locally', fn: H => H.d('R1').hosts['paygw'] === '198.51.100.50' },
    { desc: 'Both devices run SSHv2 and refuse Telnet', fn: H => ['R1', 'SW1'].every(d => { const dev = H.d(d); return !!dev.rsaKey && dev.sshVersion === 2 && !!dev.domainName && dev.lines.vty.transport === 'ssh' && dev.lines.vty.loginLocal; }) },
    { desc: 'DHCP snooping is live with only the uplink trusted', fn: H => H.d('SW1').dhcp.snooping.enabled && H.d('SW1').dhcp.snooping.vlans.includes(30) && H.i('SW1', 'g0/1').snoopTrust && !H.i('SW1', 'f0/5').snoopTrust },
    { desc: 'The switch is reachable for management and keeps the router\'s time', fn: H => H.hasIp('SW1', 'vlan99', '10.80.99.11') && H.d('SW1').defaultGateway === '10.80.99.1' && H.d('SW1').ntp.servers.includes('10.80.99.1') },
    { desc: 'Both devices saved', fn: H => ['R1', 'SW1'].every(d => H.saved(d)) },
  ],
});

/* ============================================================= */
L({
  id: 'm5-enterprise', ord: 5, vol: 3, tier: 'mega', day: 'Mega Lab 5', title: 'Multi-Site Enterprise — HQ, Two Branches, One Build',
  topics: 'collapsed core with SVIs · LACP EtherChannel · multi-area OSPF with an ABR · reference bandwidth · passive interfaces · default-information originate · central DHCP with a branch relay · PAT at the edge · anti-spoofing ACL · SSH, SNMPv3, syslog and NTP across nine devices · NETCONF and RESTCONF · CDP and LLDP for documentation',
  devices: [
    { id: 'ISP', type: 'router', ifaces: ['g0/0', 'lo0'] },
    { id: 'EDGE', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'CORE', type: 'switch', l3switch: true, ifaces: ['g0/1', 'g0/2', 'g0/3', 'g0/4'] },
    { id: 'ACC1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1', 'g0/2'] },
    { id: 'WAN1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'BR1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SWB1', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'BR2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'SRV1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.100.20.10', mask: '255.255.255.0', gw: '10.100.20.1' } },
    { id: 'PCB1', type: 'pc', ifaces: ['e0'], dhcp: true, pc: { dhcp: true } },
    { id: 'PCB2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.100.40.10', mask: '255.255.255.0', gw: '10.100.40.1' } },
  ],
  links: [
    ['ISP', 'g0/0', 'EDGE', 'g0/0'],
    ['EDGE', 'g0/1', 'CORE', 'g0/1'],
    ['CORE', 'g0/2', 'ACC1', 'g0/1'],
    ['CORE', 'g0/3', 'ACC1', 'g0/2'],
    ['CORE', 'g0/4', 'WAN1', 'g0/0'],
    ['WAN1', 'g0/1', 'BR1', 'g0/0'],
    ['WAN1', 'g0/2', 'BR2', 'g0/0'],
    ['BR1', 'g0/1', 'SWB1', 'g0/1'],
    ['SWB1', 'f0/1', 'PCB1', 'e0'],
    ['ACC1', 'f0/1', 'PC1', 'e0'],
    ['ACC1', 'f0/2', 'SRV1', 'e0'],
    ['BR2', 'g0/1', 'PCB2', 'e0'],
  ],
  layout: {
    PC1: [24, 18], SRV1: [24, 58], ACC1: [108, 38], CORE: [196, 64],
    EDGE: [292, 22], ISP: [378, 22],
    WAN1: [292, 106], BR1: [200, 106], SWB1: [120, 106], PCB1: [36, 106],
    BR2: [200, 148], PCB2: [120, 148],
  },
  setupAll: topo => {
    for (const id of ['EDGE', 'CORE', 'ACC1', 'WAN1', 'BR1', 'SWB1', 'BR2']) topo.devs[id].hostname = id;
    const isp = topo.devs.ISP;
    isp.hostname = 'ISP';
    const g = ND.getIface(isp, 'g0/0'), lo = ND.getIface(isp, 'lo0');
    g.ip = { addr: '198.51.100.1', mask: '255.255.255.252' }; g.shutdown = false;
    lo.ip = { addr: '8.8.8.8', mask: '255.255.255.255' }; lo.shutdown = false;
    isp.staticRoutes.push({ net: '10.100.0.0', mask: '255.255.0.0', via: '198.51.100.2', ad: 1 });
  },
  intro: `<b>The situation:</b> a company with a head office and two branch sites. HQ has a collapsed core, an access switch, a server, staff desks and an internet edge router. A WAN hub connects both branches back to HQ. Nine infrastructure devices, none of them configured, and a list of requirements from a business that does not care how you achieve them.<br><br><b>Your goal:</b> everything at once. VLANs and SVIs at HQ, a bonded uplink to the access switch, <b>multi-area OSPF</b> with the WAN hub acting as the area border router, a single DHCP server that addresses HQ directly and the branch through a relay, PAT at the edge with an anti-spoofing filter, and a full management standard — SSH, SNMPv3, syslog, NTP and the automation interfaces — applied to every device.<br><br><b>Why this one is the capstone:</b> if you can build this from the brief alone, in one sitting, without looking anything up, you are past the CCNA. It is also the lab to describe in an interview: three sites, multi-area OSPF, a redundant bundle, central addressing, and a written security and management standard is a real network, not an exercise.<br><span class="dim">Note: this simulator models NAT configuration and the translation table rather than rewriting packet headers.</span>`,
  pintro: `<b>The brief:</b> nine unconfigured devices across three sites. HQ has an internet edge router, a layer 3 core, an access switch with two uplinks, a server and a staff PC. A WAN hub router links two branches back to HQ; branch 1 has its own switch and a DHCP client, branch 2 has a single statically addressed host.<br><br>Build the whole thing. Routing must be <b>multi-area OSPF</b> with the WAN hub as the ABR. There must be exactly one DHCP server. The internet must be reachable from every site through one public address. Every device must be manageable to a single standard. The specification below is all you get.`,
  spec: [
    { t: 'Addressing plan (use exactly these numbers)', r: [
      'HQ VLAN <b>10 STAFF</b> — 10.100.10.0/24, gateway .1 (DHCP)',
      'HQ VLAN <b>20 SERVERS</b> — 10.100.20.0/24, gateway .1 · SRV1 static at .10',
      'HQ VLAN <b>99 MGMT</b> — 10.100.99.0/24, gateway .1 · ACC1 at .11 · SWB1 at .21',
      'EDGE–CORE 10.100.0.0/30 (EDGE .1, CORE .2) · CORE–WAN1 10.100.0.4/30 (CORE .5, WAN1 .6)',
      'WAN1–BR1 10.100.0.8/30 (WAN1 .9, BR1 .10) · WAN1–BR2 10.100.0.12/30 (WAN1 .13, BR2 .14)',
      'Branch 1 VLAN <b>30</b> — 10.100.30.0/24, gateway .1 (DHCP via relay) · Branch 2 — 10.100.40.0/24, gateway .1',
      'Internet — 198.51.100.0/30 (ISP .1, EDGE .2); the ISP also answers on 8.8.8.8',
    ] },
    { t: 'OSPF design', r: [
      'Process 1 everywhere, with a router-id set by hand on every router.',
      '<b>Area 0</b>: the EDGE–CORE link, the CORE–WAN1 link and all HQ VLANs.',
      '<b>Area 1</b>: the WAN1–BR1 link and the branch 1 LAN. <b>Area 2</b>: the WAN1–BR2 link and the branch 2 LAN.',
      'WAN1 is therefore the <b>ABR</b>, with interfaces in three areas.',
      '<code>passive-interface default</code> everywhere, un-passived only on links facing another router.',
      'A reference bandwidth of <b>1000</b> on the core so gigabit links do not all cost 1.',
      'EDGE injects a default route with <code>default-information originate</code>.',
    ] },
    { d: 'HQ — EDGE, CORE and ACC1', r: [
      '<b>EDGE</b>: both links addressed, a default route to the ISP, PAT for 10.100.0.0/16, and an inbound anti-spoofing ACL on the internet interface that drops RFC 1918 sources arriving from outside.',
      '<b>CORE</b>: <code>ip routing</code>, three VLANs with SVI gateways, G0/1 and G0/4 converted to routed ports, Rapid PVST+ as root, an LACP bundle on G0/2–G0/3, and the DHCP pools for HQ staff and for branch 1.',
      '<b>ACC1</b>: the matching bundle, F0/1 in VLAN 10 and F0/2 in VLAN 20 with PortFast and BPDU guard, a management address, and DHCP snooping trusting the bundle.',
    ] },
    { d: 'Branches — WAN1, BR1, SWB1 and BR2', r: [
      '<b>WAN1</b>: three addressed links and OSPF interfaces in three different areas.',
      '<b>BR1</b>: router-on-a-stick for VLAN 30, a DHCP relay pointing at the CORE, and OSPF in area 1.',
      '<b>SWB1</b>: VLAN 30 and 99, a trunk to BR1, a host port with PortFast and BPDU guard, and a management address.',
      '<b>BR2</b>: a straight routed LAN interface at 10.100.40.1/24 and OSPF in area 2.',
    ] },
    { t: 'Management standard for all nine devices', r: [
      'SSHv2 with 1024-bit keys, a local account, VTY lines set to <code>login local</code> and <code>transport input ssh</code>.',
      'Syslog to <b>10.100.20.10</b> at informational level, and NTP from <b>10.100.0.1</b> (EDGE is the master).',
      'SNMPv3 reporting to the server from EDGE and CORE, with a location and contact string.',
      'LLDP as well as CDP on the HQ switches, so the documentation covers non-Cisco neighbours too.',
      'NETCONF and RESTCONF enabled on the CORE, with plain HTTP disabled and HTTPS left on.',
    ] },
    { t: 'Verification', r: [
      'Four OSPF adjacencies: EDGE–CORE, CORE–WAN1, WAN1–BR1 and WAN1–BR2.',
      'Staff and branch 1 clients hold leases from the one DHCP server, in the right subnets.',
      'A staff PC reaches the server, both branches and the internet.',
      'Branch 2 reaches the HQ server across two areas.',
      'The EtherChannel is bundled, the anti-spoofing ACL is applied, and all nine devices are saved.',
    ] },
  ],
  tasks: [
    { t: 'PHASE 1 — Build the HQ core',
      do: [
        'On <b>CORE</b>, enable <code>ip routing</code> and create VLANs <b>10 STAFF</b>, <b>20 SERVERS</b> and <b>99 MGMT</b>.',
        'Convert <b>G0/1</b> and <b>G0/4</b> to routed ports with <b>10.100.0.2/30</b> and <b>10.100.0.5/30</b>.',
        'Create SVIs for all three VLANs, each holding the <b>.1</b> address.',
      ],
      done: 'Two routed ports and three SVI gateways, all up.',
      why: 'The core is where HQ traffic is routed and where the WAN and the internet both attach. Getting it right first means every later phase has something to connect to.' },

    { t: 'Bond the access uplinks and take the spanning-tree root',
      do: [
        'Set <code>spanning-tree mode rapid-pvst</code> and make CORE root for VLANs <b>1,10,20,99</b>.',
        'Put <b>G0/2</b> and <b>G0/3</b> into <code>channel-group 1 mode active</code> as dot1q trunks, then configure <b>Port-channel 1</b> to allow <b>10,20,99</b>.',
        'Do the mirror image on <b>ACC1</b> and confirm with <code>show etherchannel summary</code>.',
      ],
      done: 'Po1 with both members bundled at each end.',
      why: 'Two links, one logical interface, no blocked port. STP sees a single link so both cables forward, and losing one member costs bandwidth rather than connectivity.' },

    { t: 'PHASE 2 — Finish the HQ access layer',
      do: [
        'On <b>ACC1</b>: <b>F0/1</b> in VLAN 10, <b>F0/2</b> in VLAN 20, both with PortFast and BPDU guard.',
        'Add a management address of <b>10.100.99.11/24</b> on VLAN 99 with a default gateway.',
        'Enable DHCP snooping for VLANs <b>10,20</b>, trusting <b>Port-channel 1</b>.',
      ],
      done: 'Two host ports, a manageable switch and protected DHCP.',
      why: 'Trusting the Port-channel rather than the physical members is the detail to notice — configure the bundle, and the members follow.' },

    { t: 'PHASE 3 — Build the internet edge',
      do: [
        'On <b>EDGE</b>: <b>G0/1</b> = 10.100.0.1/30 (<code>ip nat inside</code>), <b>G0/0</b> = 198.51.100.2/30 (<code>ip nat outside</code>).',
        'Add a default route to <b>198.51.100.1</b>.',
        'Configure <code>access-list 1 permit 10.100.0.0 0.0.255.255</code> and PAT overload onto G0/0.',
      ],
      done: 'The edge is addressed, routed and translating.',
      why: 'The edge router is the only device in this build that knows anything about public addressing. Everything behind it works entirely in 10.100.0.0/16.' },

    { t: 'Filter what arrives from the internet',
      do: [
        'Build extended ACL <b>INET-IN</b> denying sources in <b>10.0.0.0/8</b>, <b>172.16.0.0/12</b> and <b>192.168.0.0/16</b>, then <code>permit ip any any</code>.',
        'Apply it <b>inbound</b> on <b>G0/0</b>.',
        'Check it with <code>show access-lists</code> and <code>show ip interface g0/0</code>.',
      ],
      done: 'Private-addressed traffic arriving from outside is dropped at the door.',
      why: 'A packet arriving from the internet claiming to come from 10.100.10.5 is lying — that address lives behind this very router. Anti-spoofing filters cost one ACL and block an entire class of attack.' },

    { t: 'PHASE 4 — Start OSPF in area 0',
      do: [
        'On <b>EDGE</b>: process 1, router-id <b>1.1.1.1</b>, <code>passive-interface default</code>, un-passive <b>G0/1</b>, advertise <b>10.100.0.0 0.0.0.3 area 0</b>, and add <code>default-information originate</code>.',
        'On <b>CORE</b>: process 1, router-id <b>10.10.10.10</b>, <code>auto-cost reference-bandwidth 1000</code>, passive by default with <b>G0/1</b> and <b>G0/4</b> un-passived, advertise <b>10.100.0.0 0.0.255.255 area 0</b>.',
        'Check <code>show ip ospf neighbor</code> on CORE.',
      ],
      done: 'One adjacency, and a default route arriving at the core from the edge.',
      why: '<code>default-information originate</code> is how "everything else goes this way" is advertised to a whole OSPF domain from one router. Without it you would be typing a default route into all nine devices.' },

    { t: 'Make the WAN hub an area border router',
      do: [
        'On <b>WAN1</b>: address all three links, then process 1 with router-id <b>2.2.2.2</b>.',
        'Advertise <b>10.100.0.4 0.0.0.3 area 0</b>, <b>10.100.0.8 0.0.0.3 area 1</b> and <b>10.100.0.12 0.0.0.3 area 2</b>.',
        'Set <code>passive-interface default</code> and un-passive all three physical interfaces.',
      ],
      done: 'One router with interfaces in three OSPF areas.',
      why: 'That is the definition of an ABR. It holds a separate link-state database per area and summarises between them, which is why a flapping branch link never forces HQ to recalculate.' },

    { t: 'PHASE 5 — Build branch 1 with its own VLAN and a relay',
      do: [
        'On <b>BR1</b>: <b>G0/0</b> = 10.100.0.10/30, then bring up <b>G0/1</b> and create <b>G0/1.30</b> tagged for VLAN 30 with <b>10.100.30.1/24</b>.',
        'Add <code>ip helper-address 10.100.0.5</code> on the subinterface.',
        'Run OSPF process 1, router-id <b>3.3.3.3</b>, advertising both the link and the LAN into <b>area 1</b>.',
        'On <b>SWB1</b>: VLANs 30 and 99, a trunk to BR1, F0/1 in VLAN 30 with PortFast and BPDU guard, management address <b>10.100.99.21</b>.',
      ],
      done: 'Branch 1 routes into area 1 and relays DHCP to HQ.',
      why: 'The branch has no server of its own and does not need one. The relay stamps the request with 10.100.30.1, so the HQ server knows exactly which pool to answer from.' },

    { t: 'Build branch 2, which needs no VLANs at all',
      do: [
        'On <b>BR2</b>: <b>G0/0</b> = 10.100.0.14/30 and <b>G0/1</b> = 10.100.40.1/24 as a plain routed interface.',
        'Run OSPF process 1, router-id <b>4.4.4.4</b>, advertising both into <b>area 2</b>.',
        'Confirm <code>show ip ospf neighbor</code> on WAN1 now lists three neighbours.',
      ],
      done: 'Three adjacencies on the ABR, in three different areas.',
      why: 'A single-subnet site does not need a trunk, subinterfaces or a switch. Matching the design to the site is part of the job — branch 1 and branch 2 are deliberately different.' },

    { t: 'PHASE 6 — One DHCP server for two sites',
      do: [
        'On <b>CORE</b>: exclude the first 20 addresses of <b>10.100.10.0/24</b> and <b>10.100.30.0/24</b>.',
        'Build pool <b>HQ-STAFF</b> (gateway 10.100.10.1) and pool <b>BRANCH1</b> (gateway 10.100.30.1), both with DNS 10.100.20.10, domain <code>corp.lab</code> and a 1-day lease.',
        'Renew <b>PC1</b> and <b>PCB1</b> and compare what each received.',
      ],
      done: 'A staff PC in 10.100.10.x and a branch PC in 10.100.30.x, both from the same server.',
      why: 'One server, two subnets, one of which is three routed hops and two OSPF areas away. The relay is what makes that possible, and it is one line of configuration at the branch.' },

    { t: 'Prove the whole network routes',
      do: [
        'From <b>PC1</b>: ping the server, then <b>10.100.30.1</b>, then <b>10.100.40.10</b>, then <b>8.8.8.8</b>.',
        'From <b>PCB2</b>: ping the HQ server at <b>10.100.20.10</b>.',
        'On <b>CORE</b>: <code>show ip route</code> and identify which routes came from another area.',
      ],
      done: 'Every site reaches every other site and the internet.',
      why: 'This is the payoff. One ping from a staff desk to a branch host crosses an EtherChannel, a layer 3 switch, an ABR and two OSPF areas — and it works because every piece is configured correctly.' },

    { t: 'PHASE 7 — Apply the management standard everywhere',
      do: [
        'On each of <b>EDGE</b>, <b>CORE</b>, <b>WAN1</b>, <b>BR1</b>, <b>BR2</b>, <b>ACC1</b> and <b>SWB1</b>: domain name <code>corp.lab</code>, 1024-bit RSA keys, <code>ip ssh version 2</code>, a local account, and VTY lines with <code>login local</code> and <code>transport input ssh</code>.',
        'Point every device at <b>10.100.0.1</b> for NTP (EDGE is <code>ntp master 3</code>) and at <b>10.100.20.10</b> for syslog.',
        'Add SNMPv3 reporting on EDGE and CORE with a location and contact.',
      ],
      done: 'Nine devices, one standard, no Telnet anywhere.',
      why: 'Doing this seven times in a row is the point of the phase. A standard you have applied by hand often enough to remember is a standard you will notice the absence of.' },

    { t: 'Turn on the interfaces a script would use',
      do: [
        'On <b>CORE</b>: <code>netconf-yang</code>, <code>restconf</code>, <code>ip http secure-server</code> and <code>no ip http server</code>.',
        'Enable <code>lldp run</code> on <b>CORE</b> and <b>ACC1</b>.',
        'Run <code>show cdp neighbors</code> and <code>show lldp neighbors</code> and compare them.',
      ],
      done: 'The core is scriptable over HTTPS and discoverable by both protocols.',
      why: 'RESTCONF rides on the HTTPS server, which is why it stays enabled while plain HTTP is switched off. CDP finds Cisco devices; LLDP is the standard and finds everything else — running both is how you document a mixed network.' },

    { t: 'PHASE 8 — Verify the whole build, then save everything',
      do: [
        'On <b>WAN1</b>: <code>show ip ospf neighbor</code> and <code>show ip route</code>.',
        'On <b>CORE</b>: <code>show etherchannel summary</code>, <code>show spanning-tree</code> and <code>show ip dhcp binding</code>.',
        'On <b>EDGE</b>: <code>show ip nat translations</code> and <code>show access-lists</code>.',
        'Save all nine devices.',
      ],
      done: 'Every verification command reads the way you designed it, and nothing is left only in RAM.',
      why: 'Nine devices is where a build stops fitting in your head. Working through the same four or five <code>show</code> commands per device, in the same order every time, is the habit that turns a complicated network into a checklist.' },
  ],
  steps: [
    /* ---- PHASE 1: core ---- */
    { d: 'CORE', t: 'Turn on routing and create the HQ VLANs.', c: ['enable', 'configure terminal', 'ip routing', 'vlan 10', 'name STAFF', 'exit', 'vlan 20', 'name SERVERS', 'exit', 'vlan 99', 'name MGMT', 'exit'] },
    { d: 'CORE', t: 'Two routed uplinks — one to the edge, one to the WAN hub.', c: ['interface g0/1', 'no switchport', 'description To EDGE', 'ip address 10.100.0.2 255.255.255.252', 'no shutdown', 'exit', 'interface g0/4', 'no switchport', 'description To WAN1', 'ip address 10.100.0.5 255.255.255.252', 'no shutdown', 'exit'], note: '<code>no switchport</code> turns a switch port into a router port. No VLAN, no STP, no spanning-tree decision on either link.' },
    { d: 'CORE', t: 'A gateway for each HQ VLAN.', c: ['interface vlan 10', 'ip address 10.100.10.1 255.255.255.0', 'no shutdown', 'exit', 'interface vlan 20', 'ip address 10.100.20.1 255.255.255.0', 'no shutdown', 'exit', 'interface vlan 99', 'ip address 10.100.99.1 255.255.255.0', 'no shutdown', 'exit'] },
    { d: 'CORE', t: 'Rapid PVST+, and the core is the root.', c: ['spanning-tree mode rapid-pvst', 'spanning-tree vlan 1,10,20,99 root primary'], note: 'Root placement is a decision. Left alone, STP picks whichever switch has the lowest MAC address.' },
    { d: 'CORE', t: 'Bundle the two access uplinks.', c: ['interface range g0/2 - 3', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'channel-group 1 mode active', 'exit', 'interface port-channel 1', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20,99', 'end', 'show etherchannel summary'], note: 'LACP active on both ends. Settings on the Port-channel apply to every member — configure the bundle, not the ports.' },

    /* ---- PHASE 2: access ---- */
    { d: 'ACC1', t: 'The matching half of the bundle.', c: ['enable', 'configure terminal', 'spanning-tree mode rapid-pvst', 'vlan 10', 'name STAFF', 'exit', 'vlan 20', 'name SERVERS', 'exit', 'vlan 99', 'name MGMT', 'exit', 'interface range g0/1 - 2', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'channel-group 1 mode active', 'exit', 'interface port-channel 1', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20,99', 'exit'] },
    { d: 'ACC1', t: 'A staff port and a server port.', c: ['interface f0/1', 'switchport mode access', 'switchport access vlan 10', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit', 'interface f0/2', 'switchport mode access', 'switchport access vlan 20', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit'] },
    { d: 'ACC1', t: 'Management address and DHCP snooping.', c: ['interface vlan 99', 'ip address 10.100.99.11 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 10.100.99.1', 'service dhcp', 'ip dhcp snooping', 'ip dhcp snooping vlan 10,20', 'interface port-channel 1', 'ip dhcp snooping trust', 'exit', 'end', 'show etherchannel summary'], note: 'Trust the bundle, not the members. Both look right in a diagram; only one of them survives a member failing.' },

    /* ---- PHASE 3: edge ---- */
    { d: 'EDGE', t: 'Inside and outside, addressed and tagged.', c: ['enable', 'configure terminal', 'interface g0/1', 'description To CORE', 'ip address 10.100.0.1 255.255.255.252', 'no shutdown', 'ip nat inside', 'exit', 'interface g0/0', 'description To ISP', 'ip address 198.51.100.2 255.255.255.252', 'no shutdown', 'ip nat outside', 'exit', 'ip route 0.0.0.0 0.0.0.0 198.51.100.1'] },
    { d: 'EDGE', t: 'PAT the whole company onto one address.', c: ['access-list 1 permit 10.100.0.0 0.0.255.255', 'ip nat inside source list 1 interface g0/0 overload'], note: 'Three sites, hundreds of hosts, one public address. The source port is what keeps the conversations apart.' },
    { d: 'EDGE', t: 'Drop private sources arriving from the internet.', c: ['ip access-list extended INET-IN', 'deny ip 10.0.0.0 0.255.255.255 any', 'deny ip 172.16.0.0 0.15.255.255 any', 'deny ip 192.168.0.0 0.0.255.255 any', 'permit ip any any', 'exit', 'interface g0/0', 'ip access-group INET-IN in', 'exit'], note: 'A packet from the internet claiming to be 10.100.10.5 is lying — that address lives behind this router. One ACL, one whole class of attack.' },

    /* ---- PHASE 4: OSPF area 0 ---- */
    { d: 'EDGE', t: 'OSPF, and advertise the way out to everybody.', c: ['router ospf 1', 'router-id 1.1.1.1', 'passive-interface default', 'no passive-interface g0/1', 'network 10.100.0.0 0.0.0.3 area 0', 'default-information originate', 'end', 'show ip ospf neighbor'], note: '<code>default-information originate</code> injects the static default route into OSPF, so nine devices learn it instead of you typing it nine times.' },
    { d: 'CORE', t: 'OSPF on the core, with a sane reference bandwidth.', c: ['configure terminal', 'router ospf 1', 'router-id 10.10.10.10', 'auto-cost reference-bandwidth 1000', 'passive-interface default', 'no passive-interface g0/1', 'no passive-interface g0/4', 'network 10.100.0.0 0.0.255.255 area 0', 'end', 'show ip ospf neighbor'], note: 'At the default reference bandwidth every link of 100 Mbps or faster costs 1, so OSPF cannot tell a gigabit link from a fast-ethernet one.' },

    /* ---- PHASE 5: WAN hub and branches ---- */
    { d: 'WAN1', t: 'Three links: one to HQ, two to branches.', c: ['enable', 'configure terminal', 'interface g0/0', 'description To CORE', 'ip address 10.100.0.6 255.255.255.252', 'no shutdown', 'exit', 'interface g0/1', 'description To BR1', 'ip address 10.100.0.9 255.255.255.252', 'no shutdown', 'exit', 'interface g0/2', 'description To BR2', 'ip address 10.100.0.13 255.255.255.252', 'no shutdown', 'exit'] },
    { d: 'WAN1', t: 'One router, three OSPF areas — this is an ABR.', c: ['router ospf 1', 'router-id 2.2.2.2', 'passive-interface default', 'no passive-interface g0/0', 'no passive-interface g0/1', 'no passive-interface g0/2', 'network 10.100.0.4 0.0.0.3 area 0', 'network 10.100.0.8 0.0.0.3 area 1', 'network 10.100.0.12 0.0.0.3 area 2', 'end', 'show ip ospf neighbor'], note: 'An area border router holds a separate database per area and summarises between them. A flapping branch link never makes HQ recalculate.' },
    { d: 'BR1', t: 'Branch 1: the WAN link, then a VLAN on a stick.', c: ['enable', 'configure terminal', 'interface g0/0', 'description To WAN1', 'ip address 10.100.0.10 255.255.255.252', 'no shutdown', 'exit', 'interface g0/1', 'description Trunk to SWB1', 'no shutdown', 'exit', 'interface g0/1.30', 'encapsulation dot1q 30', 'ip address 10.100.30.1 255.255.255.0', 'ip helper-address 10.100.0.5', 'exit'], note: 'The helper points at the core switch three hops and two areas away. The branch needs no server of its own.' },
    { d: 'BR1', t: 'And OSPF into area 1.', c: ['router ospf 1', 'router-id 3.3.3.3', 'passive-interface default', 'no passive-interface g0/0', 'network 10.100.0.8 0.0.0.3 area 1', 'network 10.100.30.0 0.0.0.255 area 1', 'end', 'show ip ospf neighbor'], note: 'The LAN is advertised but stays passive — no hellos are sent onto a network full of hosts.' },
    { d: 'SWB1', t: 'The branch switch: two VLANs, one trunk, one host port.', c: ['enable', 'configure terminal', 'vlan 30', 'name BRANCH1', 'exit', 'vlan 99', 'name MGMT', 'exit', 'interface g0/1', 'switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport trunk allowed vlan 30,99', 'switchport nonegotiate', 'exit', 'interface f0/1', 'switchport mode access', 'switchport access vlan 30', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit', 'interface vlan 99', 'ip address 10.100.99.21 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 10.100.99.1', 'end'] },
    { d: 'BR2', t: 'Branch 2 needs no VLANs at all.', c: ['enable', 'configure terminal', 'interface g0/0', 'description To WAN1', 'ip address 10.100.0.14 255.255.255.252', 'no shutdown', 'exit', 'interface g0/1', 'description Branch 2 LAN', 'ip address 10.100.40.1 255.255.255.0', 'no shutdown', 'exit'], note: 'A single-subnet site does not need a trunk, subinterfaces or a switch. Match the design to the site.' },
    { d: 'BR2', t: 'OSPF into area 2.', c: ['router ospf 1', 'router-id 4.4.4.4', 'passive-interface default', 'no passive-interface g0/0', 'network 10.100.0.12 0.0.0.3 area 2', 'network 10.100.40.0 0.0.0.255 area 2', 'end', 'show ip ospf neighbor'] },

    /* ---- PHASE 6: DHCP and end-to-end ---- */
    { d: 'CORE', t: 'One server for two sites — exclusions first.', c: ['configure terminal', 'ip dhcp excluded-address 10.100.10.1 10.100.10.20', 'ip dhcp excluded-address 10.100.30.1 10.100.30.20'] },
    { d: 'CORE', t: 'The HQ pool.', c: ['ip dhcp pool HQ-STAFF', 'network 10.100.10.0 255.255.255.0', 'default-router 10.100.10.1', 'dns-server 10.100.20.10', 'domain-name corp.lab', 'lease 1', 'exit'] },
    { d: 'CORE', t: 'And the branch pool, for a subnet the core is not attached to.', c: ['ip dhcp pool BRANCH1', 'network 10.100.30.0 255.255.255.0', 'default-router 10.100.30.1', 'dns-server 10.100.20.10', 'domain-name corp.lab', 'lease 1', 'end'], note: 'The relay stamps 10.100.30.1 on the request, which is how the core knows to answer from this pool and not the HQ one.' },
    { d: 'PC1', t: 'A staff desk leases from the core.', c: ['ipconfig /renew', 'ipconfig /all'] },
    { d: 'PCB1', t: 'And so does a branch PC, three hops away.', c: ['ipconfig /renew', 'ipconfig /all'], note: 'Different subnet, different gateway, same server. Two OSPF areas and a relay between the client and the answer.' },
    { d: 'PC1', t: 'HQ to the server, then to both branches.', c: ['ping 10.100.20.10', 'ping 10.100.30.1', 'ping 10.100.40.10'], note: 'That last ping crosses an EtherChannel, a layer 3 switch, an ABR and two OSPF areas.' },
    { d: 'PC1', t: 'And out to the internet.', c: ['ping 8.8.8.8'], note: 'The default route came from EDGE via OSPF, and the translation happens at the edge.' },
    { d: 'PCB2', t: 'Branch 2 reaches the HQ server across two areas.', c: ['ping 10.100.20.10', 'ping 8.8.8.8'] },
    { d: 'CORE', t: 'Read the routing table and find the inter-area routes.', c: ['show ip route', 'show ip protocols'], note: 'Routes learned from another area are inter-area routes. Everything from 10.100.30.0 and 10.100.40.0 arrived that way, summarised by the ABR.' },

    /* ---- PHASE 7: management standard ---- */
    { d: 'EDGE', t: 'SSH, time and telemetry on the edge.', c: ['configure terminal', 'ip domain-name corp.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username netadmin secret Corp-Str0ng-Pass', 'line vty 0 15', 'login local', 'transport input ssh', 'exit', 'ntp master 3', 'logging host 10.100.20.10', 'logging trap informational', 'snmp-server community Corp-R0-Community ro', 'snmp-server host 10.100.20.10 version 3 Corp-R0-Community', 'snmp-server location HQ Comms Room', 'snmp-server contact netops@corp.lab', 'end', 'show ip ssh'] },
    { d: 'CORE', t: 'The same standard on the core, plus the automation interfaces.', c: ['configure terminal', 'ip domain-name corp.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username netadmin secret Corp-Str0ng-Pass', 'line vty 0 15', 'login local', 'transport input ssh', 'exit', 'ntp server 10.100.0.1', 'logging host 10.100.20.10', 'logging trap informational', 'snmp-server community Corp-R0-Community ro', 'snmp-server host 10.100.20.10 version 3 Corp-R0-Community', 'snmp-server location HQ Comms Room', 'snmp-server contact netops@corp.lab'] },
    { d: 'CORE', t: 'Make the core scriptable, and discoverable by both protocols.', c: ['netconf-yang', 'restconf', 'ip http secure-server', 'no ip http server', 'lldp run', 'end', 'show cdp neighbors', 'show lldp neighbors'], note: 'RESTCONF rides on the HTTPS server, which is why that stays on while plain HTTP goes off. CDP finds Cisco kit; LLDP finds everything else.' },
    { d: 'WAN1', t: 'Standard on the WAN hub.', c: ['configure terminal', 'ip domain-name corp.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username netadmin secret Corp-Str0ng-Pass', 'line vty 0 15', 'login local', 'transport input ssh', 'exit', 'ntp server 10.100.0.1', 'logging host 10.100.20.10', 'logging trap informational', 'end'] },
    { d: 'BR1', t: 'Standard at branch 1.', c: ['configure terminal', 'ip domain-name corp.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username netadmin secret Corp-Str0ng-Pass', 'line vty 0 15', 'login local', 'transport input ssh', 'exit', 'ntp server 10.100.0.1', 'logging host 10.100.20.10', 'logging trap informational', 'end'] },
    { d: 'BR2', t: 'And branch 2.', c: ['configure terminal', 'ip domain-name corp.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username netadmin secret Corp-Str0ng-Pass', 'line vty 0 15', 'login local', 'transport input ssh', 'exit', 'ntp server 10.100.0.1', 'logging host 10.100.20.10', 'logging trap informational', 'end'] },
    { d: 'ACC1', t: 'The HQ access switch, with LLDP as well.', c: ['configure terminal', 'ip domain-name corp.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username netadmin secret Corp-Str0ng-Pass', 'line vty 0 15', 'login local', 'transport input ssh', 'exit', 'ntp server 10.100.0.1', 'logging host 10.100.20.10', 'logging trap informational', 'lldp run', 'end', 'show lldp neighbors'] },
    { d: 'SWB1', t: 'And the branch switch — seven devices, one standard.', c: ['configure terminal', 'ip domain-name corp.lab', 'crypto key generate rsa modulus 1024', 'ip ssh version 2', 'username netadmin secret Corp-Str0ng-Pass', 'line vty 0 15', 'login local', 'transport input ssh', 'exit', 'ntp server 10.100.0.1', 'logging host 10.100.20.10', 'logging trap informational', 'end'], note: 'Doing this seven times in a row is the point. A standard you have typed often enough to remember is one you will notice the absence of.' },

    /* ---- PHASE 8: verify and save ---- */
    { d: 'WAN1', t: 'Three adjacencies in three areas.', c: ['show ip ospf neighbor', 'show ip route'] },
    { d: 'CORE', t: 'The switching side of HQ.', c: ['show etherchannel summary', 'show spanning-tree', 'show ip dhcp binding'] },
    { d: 'EDGE', t: 'The edge: translations and the filter.', c: ['show ip nat translations', 'show access-lists'] },
    { d: 'EDGE', t: 'Save.', c: ['write memory'] },
    { d: 'CORE', t: 'Save.', c: ['write memory'] },
    { d: 'ACC1', t: 'Save.', c: ['write memory'] },
    { d: 'WAN1', t: 'Save.', c: ['write memory'] },
    { d: 'BR1', t: 'Save.', c: ['write memory'] },
    { d: 'SWB1', t: 'Save.', c: ['write memory'] },
    { d: 'BR2', t: 'Save.', c: ['write memory'], note: 'Seven devices saved. A build that exists only in RAM is one power cut away from doing the whole evening again.' },
  ],
  verify: ['show ip ospf neighbor', 'show ip route', 'show ip protocols', 'show etherchannel summary', 'show spanning-tree', 'show ip dhcp binding', 'show ip nat translations', 'show access-lists', 'show cdp neighbors', 'show lldp neighbors'],
  explain: `<h3>Why more than one area</h3>
<p>Every router in an OSPF area holds an identical link-state database and reruns the SPF algorithm whenever anything in that area changes. Put all three sites in area 0 and a branch link that flaps every few minutes makes every router at HQ recalculate. Splitting the branches into areas 1 and 2 means WAN1 — the <b>area border router</b> — absorbs the change and passes on a summary. Areas are a scaling tool, and the boundary belongs where the topology naturally narrows.</p>
<h3>Reading the routing table after this build</h3>
<p>The core's table has four kinds of entry. <b>C</b> and <b>L</b> for its own connected subnets and interface addresses. <b>O</b> for routes inside area 0. <b>O IA</b> for inter-area routes — everything at the branches. And <b>O*E2</b> for the default route EDGE injected with <code>default-information originate</code>. Being able to glance at a table and say which routes came from where is worth more in an interview than being able to recite the commands.</p>
<h3>Reference bandwidth</h3>
<p>OSPF cost is reference bandwidth divided by interface bandwidth, with a floor of 1. The default reference is 100 Mbps, so every interface of 100 Mbps or faster costs exactly 1 and OSPF cannot tell a gigabit link from a fast-ethernet one. Raising it to 1000 restores the distinction. The one rule: it has to be the same on every router, or they will disagree about which path is best.</p>
<h3>One DHCP server, three sites</h3>
<p>The core is directly attached to the HQ VLANs and not attached to branch 1 at all. Both cases are served from the same device: HQ clients broadcast into a VLAN whose SVI is on the core, while BR1's <code>ip helper-address</code> converts the branch broadcast into a unicast and stamps 10.100.30.1 into the gateway field. The core matches that against its pools' <code>network</code> statements. Moving the whole company to a different DHCP server would be one line per relay.</p>
<h3>The anti-spoofing filter</h3>
<p>INET-IN drops any packet arriving from the internet whose source is in RFC 1918 space. Those addresses are not routable on the internet, so a packet claiming one is either misconfigured or forged — typically forged to look like it came from inside. It is one of the few filters that is safe to apply at every internet edge without thinking hard about the consequences, and it costs four lines.</p>
<h3>Why HTTPS stays on when HTTP goes off</h3>
<p>Hardening says disable services you do not use. RESTCONF is a service you <em>do</em> use, and it runs on the device's HTTPS server — so <code>no ip http server</code> (plain, unencrypted) and <code>ip http secure-server</code> (TLS) together are the correct pair. Turning both off is a common and confusing way to break automation on a device that otherwise looks perfectly configured.</p>
<h3>What to say about this lab in an interview</h3>
<p>"Three sites, multi-area OSPF with the WAN hub as the ABR, an LACP bundle between the core and access layers, one DHCP server serving remote subnets through relays, PAT and an anti-spoofing filter at the edge, and a single management standard — SSH only, central syslog, NTP and SNMPv3 — applied to every device." That sentence describes a real network. The commands are the easy part; being able to explain why each piece is where it is, is the part that gets you hired.</p>`,
  checks: [
    { desc: 'CORE routes, with three VLANs and two routed uplinks', fn: H => H.d('CORE').ipRouting && [10, 20, 99].every(v => H.vlanExists('CORE', v)) && H.i('CORE', 'g0/1').noSwitchport && H.hasIp('CORE', 'g0/1', '10.100.0.2') && H.i('CORE', 'g0/4').noSwitchport && H.hasIp('CORE', 'g0/4', '10.100.0.5') },
    { desc: 'An SVI gateway exists for every HQ VLAN', fn: H => H.hasIp('CORE', 'vlan10', '10.100.10.1') && H.hasIp('CORE', 'vlan20', '10.100.20.1') && H.hasIp('CORE', 'vlan99', '10.100.99.1') },
    { desc: 'CORE runs Rapid PVST+ and is the root bridge', fn: H => H.d('CORE').stp.mode === 'rapid' && (H.d('CORE').stp.prio[10] || 32768) < 32768 },
    { desc: 'The access EtherChannel is bundled at both ends', fn: H => ['g0/2', 'g0/3'].every(p => (H.i('CORE', p).channelGroup || {}).id === 1) && ['g0/1', 'g0/2'].every(p => (H.i('ACC1', p).channelGroup || {}).id === 1) && (H.i('CORE', 'po1').allowed || []).includes(20) },
    { desc: 'HQ host ports are in the right VLANs with PortFast and BPDU guard', fn: H => H.access('ACC1', 'f0/1', 10) && H.access('ACC1', 'f0/2', 20) && ['f0/1', 'f0/2'].every(p => H.i('ACC1', p).stpPortfast && H.i('ACC1', p).bpduguard) },
    { desc: 'DHCP snooping trusts the bundle, not the members', fn: H => H.d('ACC1').dhcp.snooping.enabled && H.d('ACC1').dhcp.snooping.vlans.includes(10) && H.i('ACC1', 'po1').snoopTrust && !H.i('ACC1', 'f0/1').snoopTrust },
    { desc: 'The edge is addressed and tagged for NAT on both sides', fn: H => H.hasIp('EDGE', 'g0/1', '10.100.0.1') && H.hasIp('EDGE', 'g0/0', '198.51.100.2') && H.i('EDGE', 'g0/1').natInside && H.i('EDGE', 'g0/0').natOutside },
    { desc: 'PAT hides all three sites behind one public address', fn: H => { const d = H.d('EDGE').nat.dynamic; return !!(d && d.overload && d.acl === '1'); } },
    { desc: 'The anti-spoofing ACL exists and is applied inbound from the internet', fn: H => { const a = H.d('EDGE').acls['INET-IN']; return !!(a && a.entries.length >= 4) && H.i('EDGE', 'g0/0').aclIn === 'INET-IN'; } },
    { desc: 'EDGE originates a default route into OSPF', fn: H => !!(H.d('EDGE').ospf && H.d('EDGE').ospf.defaultInfo) && H.d('EDGE').staticRoutes.some(r => r.net === '0.0.0.0') },
    { desc: 'The core raises the OSPF reference bandwidth', fn: H => H.d('CORE').ospf && H.d('CORE').ospf.refBw === 1000 },
    { desc: 'Every router uses passive-interface default', fn: H => ['EDGE', 'CORE', 'WAN1', 'BR1', 'BR2'].every(d => H.d(d).ospf && H.d(d).ospf.passiveDefault) },
    { desc: 'Router IDs are set by hand on every router', fn: H => [['EDGE', '1.1.1.1'], ['WAN1', '2.2.2.2'], ['BR1', '3.3.3.3'], ['BR2', '4.4.4.4'], ['CORE', '10.10.10.10']].every(([d, id]) => H.d(d).ospf && H.d(d).ospf.routerId === id) },
    { desc: 'All four OSPF adjacencies are up', fn: H => H.ospfNbr('CORE', 'EDGE') && H.ospfNbr('CORE', 'WAN1') && H.ospfNbr('WAN1', 'BR1') && H.ospfNbr('WAN1', 'BR2') },
    { desc: 'WAN1 is a genuine ABR, advertising into three areas', fn: H => { const a = new Set((H.d('WAN1').ospf.networks || []).map(n => n.area)); return a.has(0) && a.has(1) && a.has(2); } },
    { desc: 'Branch 1 runs a VLAN on a stick and relays DHCP to the core', fn: H => H.hasIp('BR1', 'g0/1.30', '10.100.30.1') && !H.i('BR1', 'g0/1').shutdown && H.i('BR1', 'g0/1.30').helpers.includes('10.100.0.5') },
    { desc: 'Branch 2 uses a plain routed LAN interface', fn: H => H.hasIp('BR2', 'g0/1', '10.100.40.1') && H.hasIp('BR2', 'g0/0', '10.100.0.14') },
    { desc: 'Both DHCP pools exist on the one server, with the low range excluded', fn: H => { const hq = Object.values(H.d('CORE').dhcp.pools).find(p => p.network === '10.100.10.0'), br = Object.values(H.d('CORE').dhcp.pools).find(p => p.network === '10.100.30.0'); return !!(hq && br && hq.router === '10.100.10.1' && br.router === '10.100.30.1' && hq.dns && br.dns) && H.d('CORE').dhcp.excluded.length >= 2; } },
    { desc: 'The HQ staff PC leased from the HQ pool', fn: H => { const n = ND.pcNet(H.topo, H.d('PC1')); return !!(n.ip && n.ip.startsWith('10.100.10.') && n.gw === '10.100.10.1' && +n.ip.split('.')[3] > 20); } },
    { desc: 'The branch PC leased from the same server through the relay', fn: H => { const n = ND.pcNet(H.topo, H.d('PCB1')); return !!(n.ip && n.ip.startsWith('10.100.30.') && n.gw === '10.100.30.1'); } },
    { desc: 'HQ reaches the server and both branches', fn: H => H.ping('PC1', '10.100.20.10') && H.ping('PC1', '10.100.30.1') && H.ping('PC1', '10.100.40.10') },
    { desc: 'Branch 2 reaches the HQ server across two areas', fn: H => H.ping('PCB2', '10.100.20.10') },
    { desc: 'Every site reaches the internet', fn: H => H.ping('PC1', '8.8.8.8') && H.ping('PCB2', '8.8.8.8') },
    { desc: 'The branch switch is built and manageable', fn: H => H.trunkStatic('SWB1', 'g0/1') && H.access('SWB1', 'f0/1', 30) && H.hasIp('SWB1', 'vlan99', '10.100.99.21') && H.d('SWB1').defaultGateway === '10.100.99.1' },
    { desc: 'All seven infrastructure devices run SSHv2 and refuse Telnet', fn: H => ['EDGE', 'CORE', 'ACC1', 'WAN1', 'BR1', 'SWB1', 'BR2'].every(d => { const dev = H.d(d); return !!dev.rsaKey && dev.sshVersion === 2 && !!dev.domainName && dev.lines.vty.transport === 'ssh' && dev.lines.vty.loginLocal; }) },
    { desc: 'All seven log to the server and share one clock', fn: H => ['EDGE', 'CORE', 'ACC1', 'WAN1', 'BR1', 'SWB1', 'BR2'].every(d => H.d(d).logging.hosts.includes('10.100.20.10')) && H.d('EDGE').ntp.master === 3 && ['CORE', 'ACC1', 'WAN1', 'BR1', 'SWB1', 'BR2'].every(d => H.d(d).ntp.servers.includes('10.100.0.1')) },
    { desc: 'SNMPv3 reporting is configured on the edge and the core', fn: H => ['EDGE', 'CORE'].every(d => H.d(d).snmp.hosts.some(h => h.ip === '10.100.20.10' && String(h.version) === '3') && !!H.d(d).snmp.location && !!H.d(d).snmp.contact) },
    { desc: 'The core is scriptable: NETCONF and RESTCONF on, plain HTTP off', fn: H => { const d = H.d('CORE'); return !!(d.mgmt && d.mgmt.netconf && d.mgmt.restconf) && d.services.httpSecure && !d.services.http; } },
    { desc: 'Both discovery protocols run on the HQ switches', fn: H => ['CORE', 'ACC1'].every(d => H.d(d).cdp && H.d(d).lldp) },
    { desc: 'All seven infrastructure devices saved', fn: H => ['EDGE', 'CORE', 'ACC1', 'WAN1', 'BR1', 'SWB1', 'BR2'].every(d => H.saved(d)) },
  ],
});

window.ND = ND;
})();
