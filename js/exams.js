/* NetDrill exams — Boson-style multiple choice, graded per CCNA blueprint domain.
   These test comprehension: scenarios, output reading and design decisions rather
   than command recall, which is what the labs already drill. */
'use strict';
(function () {
const ND = window.ND;
ND.EXAMS = ND.EXAMS || [];
const X = e => ND.EXAMS.push(e);

const D = {
  fund: '1.0 Network Fundamentals',
  access: '2.0 Network Access',
  ip: '3.0 IP Connectivity',
  svc: '4.0 IP Services',
  sec: '5.0 Security Fundamentals',
  auto: '6.0 Automation & Programmability',
};

/* ============================================================= */
X({
  id: 'ex1', short: 'Exam 1', name: 'Exam 1 — Foundations', minutes: 50, pass: 82,
  blurb: 'A full-blueprint exam at the level you should reach after the core labs. Mostly "do you understand what this does", with a few pieces of output to read.',
  qs: [
    /* ---- 1.0 Network Fundamentals ---- */
    { d: D.fund, lab: 'd01-devices-cables',
      q: 'A frame arrives at a switch with a destination MAC address that is not in its MAC address table. What does the switch do?',
      opts: ['Drops the frame and sends an error to the source', 'Floods the frame out of every port in that VLAN except the one it arrived on', 'Forwards the frame to its default gateway', 'Buffers the frame until ARP resolves the address'],
      a: [1],
      why: 'An unknown unicast is flooded within the VLAN. The reply teaches the switch where that MAC lives, so the next frame is forwarded out one port instead.' },

    { d: D.fund, lab: 'd01-devices-cables',
      q: 'A link between a switch and a router shows as up/up but throughput is poor, with rising late collisions on the switch port. What is the most likely cause?',
      opts: ['A duplex mismatch', 'A bad fibre transceiver', 'A VLAN mismatch', 'An MTU mismatch'],
      a: [0],
      why: 'Late collisions on an up/up link are the signature of a duplex mismatch — one end hard-coded, the other auto-negotiating and falling back to half duplex.' },

    { d: D.fund, lab: 'd03-models',
      q: 'At which OSI layer does a device make a forwarding decision using a destination <b>IP</b> address, and what is the PDU called at that layer?',
      opts: ['Layer 2, frame', 'Layer 3, packet', 'Layer 4, segment', 'Layer 3, frame'],
      a: [1],
      why: 'Layer 3 is the network layer: routers forward on destination IP, and the PDU at that layer is a packet. Frames are layer 2 and segments are layer 4.' },

    { d: D.fund, lab: 'd29-tcp-udp',
      q: 'A voice application must keep one-way delay under 150 ms and can tolerate losing the occasional packet. Which transport protocol suits it, and why?',
      opts: ['TCP, because retransmission guarantees quality', 'UDP, because it has no handshake or retransmission delay', 'TCP, because the sliding window smooths jitter', 'UDP, because it guarantees in-order delivery'],
      a: [1],
      why: 'Late voice data is useless, so retransmitting it wastes time. UDP sends without a handshake, acknowledgements or retransmission, which is exactly what real-time media needs.' },

    { d: D.fund, lab: 'd07-ipv4-addressing',
      q: 'Which of these addresses are from RFC 1918 private ranges? (Choose 2)',
      opts: ['172.32.5.10', '10.250.4.7', '192.169.1.1', '172.20.8.9'],
      a: [1, 3],
      why: 'The private blocks are 10.0.0.0/8, 172.16.0.0/12 (172.16 through 172.31) and 192.168.0.0/16. 172.32 and 192.169 fall just outside them — a classic trap.' },

    { d: D.fund, lab: 'd12-subnetting',
      q: 'How many usable host addresses does a /27 subnet provide?',
      opts: ['32', '30', '14', '62'],
      a: [1],
      why: 'A /27 leaves 5 host bits: 2^5 = 32 addresses, minus the network and broadcast addresses, giving 30 usable.' },

    { d: D.fund, lab: 'd12-subnetting',
      q: 'A host is configured as 192.168.10.70/26. What are its network address and broadcast address?',
      opts: ['Network 192.168.10.64, broadcast 192.168.10.127', 'Network 192.168.10.0, broadcast 192.168.10.255', 'Network 192.168.10.64, broadcast 192.168.10.95', 'Network 192.168.10.32, broadcast 192.168.10.63'],
      a: [0],
      why: 'A /26 has a block size of 64, so the subnets start at .0, .64, .128 and .192. The address .70 falls in the .64 block, which ends at .127.' },

    { d: D.fund, lab: 'd32-ipv6',
      q: 'An interface shows an IPv6 address beginning FE80:: that nobody configured. What is it and what is it used for?',
      opts: ['A global unicast address used for internet routing', 'A link-local address, used for neighbour discovery and next-hop addressing on that link', 'A unique local address, the IPv6 equivalent of RFC 1918', 'A multicast address used for OSPFv3 hellos'],
      a: [1],
      why: 'Every IPv6 interface generates a link-local address in FE80::/10 automatically. It is valid only on that link, and routing protocols and next hops use it constantly.' },

    /* ---- 2.0 Network Access ---- */
    { d: D.access, lab: 'd16-vlans1',
      q: 'Two PCs have addresses in the same subnet and are plugged into the same switch, but cannot ping each other. <code>show vlan brief</code> shows one port in VLAN 10 and the other in VLAN 20. What is happening?',
      opts: ['The switch needs a default gateway to forward between the ports', 'The VLANs are separate broadcast domains, so the traffic needs a router or layer-3 switch', 'The subnet mask on one PC must be wrong', 'The switch will forward the traffic once the MAC table populates'],
      a: [1],
      why: 'A VLAN is a broadcast domain. Frames never cross between VLANs inside a switch regardless of IP addressing — that needs a layer-3 hop.' },

    { d: D.access, lab: 'd17-vlans2',
      q: 'Two switches are trunked, but SW1 has native VLAN 1 on the trunk while SW2 has native VLAN 99. What is the consequence?',
      opts: ['The trunk will not come up at all', 'Traffic in those two VLANs leaks into each other, and CDP will report a native VLAN mismatch', 'Only VLAN 1 traffic crosses the link', 'Spanning tree blocks the link immediately'],
      a: [1],
      why: 'Native-VLAN frames cross untagged, so each end puts them in a different VLAN — traffic hops between VLANs. CDP raises a native VLAN mismatch message, and the link still forwards, which is what makes it dangerous.' },

    { d: D.access, lab: 'd19-dtp-vtp',
      q: 'SW1 G0/1 is set to <b>dynamic auto</b> and SW2 G0/1 is left at the default of <b>dynamic auto</b> as well. What is the resulting link?',
      opts: ['A trunk, because both sides support trunking', 'An access port, because neither side initiates the negotiation', 'The link stays down until a mode is configured', 'A trunk carrying only VLAN 1'],
      a: [1],
      why: 'Auto will accept an invitation but never send one. With both sides passive, no trunk is negotiated and the link operates as an access port in VLAN 1.' },

    { d: D.access, lab: 'd21-stp',
      q: 'Four switches have the default spanning-tree priority of 32768. Which switch becomes the root bridge?',
      opts: ['The one with the most ports', 'The one with the lowest MAC address', 'The one with the highest IP address on its SVI', 'The one that booted first'],
      a: [1],
      why: 'The bridge ID is priority plus MAC address. When priorities tie, the lowest MAC wins — usually the oldest switch in the building, which is why you should set the priority yourself.' },

    { d: D.access, lab: 'd21-rstp',
      q: 'Why should PortFast never be enabled on a port facing another switch?',
      opts: ['It disables spanning tree on the whole VLAN', 'The port skips listening and learning, so a loop can form before STP reacts', 'It forces the port into half duplex', 'It prevents the port from ever becoming a root port'],
      a: [1],
      why: 'PortFast moves the port straight to forwarding. On a switch-to-switch link that can create a loop for the seconds before STP converges — which is exactly why BPDU guard is deployed alongside it.' },

    { d: D.access, lab: 'd22-etherchannel',
      q: 'Which two mode combinations will successfully form an EtherChannel? (Choose 2)',
      opts: ['LACP active on one side, LACP passive on the other', 'LACP passive on both sides', 'PAgP desirable on one side, PAgP auto on the other', 'PAgP auto on both sides'],
      a: [0, 2],
      why: 'At least one side must initiate. Active+passive and desirable+auto both work; passive+passive and auto+auto leave nobody asking, so no bundle forms.' },

    { d: D.access, lab: 'y6-troubleshooting',
      q: 'A switch port reports <b>err-disabled</b> in <code>show interfaces status</code>. Which statement is true?',
      opts: ['Somebody typed shutdown on the port', 'The switch disabled the port itself, and only shutdown followed by no shutdown (or errdisable recovery) will bring it back', 'The cable is unplugged', 'The port is administratively up but has no VLAN assigned'],
      a: [1],
      why: 'err-disabled means the switch took the port down itself — typically a port-security violation or BPDU guard. A bare "no shutdown" does nothing; you must shut it first.' },

    { d: D.access, lab: 'd53-wireless',
      q: 'A <b>lightweight</b> access point is joined to a wireless LAN controller. How should its switch port be configured?',
      opts: ['As a trunk carrying every wireless VLAN', 'As an access port in the AP management VLAN, because client traffic is tunnelled to the controller in CAPWAP', 'As a routed port with an IP address', 'As a trunk with the native VLAN set to the guest VLAN'],
      a: [1],
      why: 'A lightweight AP wraps all client traffic in CAPWAP and sends it to the controller, so its port only needs the management VLAN. An autonomous AP is the one that needs a trunk.' },

    /* ---- 3.0 IP Connectivity ---- */
    { d: D.ip, lab: 'd24-dynamic-routing',
      q: 'A router learns 10.1.1.0/24 from OSPF (AD 110) and also has a static route for 10.1.1.0/24 (AD 1). Which is installed in the routing table, and why?',
      opts: ['The OSPF route, because it has the better metric', 'The static route, because a lower administrative distance is preferred', 'Both, and traffic is load-balanced', 'Neither, because the conflict causes both to be rejected'],
      a: [1],
      why: 'When two sources offer the same prefix the router compares administrative distance first and never compares their metrics — metrics from different protocols are not comparable.' },

    { d: D.ip, lab: 'd24-dynamic-routing',
      q: 'A router has these routes. Which is used for a packet destined to 10.1.1.55?<pre>S    10.0.0.0/8 [1/0] via 192.168.1.1\nO    10.1.0.0/16 [110/20] via 192.168.2.1\nO    10.1.1.0/24 [110/30] via 192.168.3.1</pre>',
      opts: ['The /8 static route, because it has the lowest administrative distance', 'The /16 OSPF route, because it has the better metric', 'The /24 OSPF route, because it is the longest prefix match', 'The router load-balances across all three'],
      a: [2],
      why: 'Longest prefix match is checked FIRST, before administrative distance or metric. The /24 matches the most bits, so it wins even though the static has a better AD.' },

    { d: D.ip, lab: 'x5-static-ipv6',
      q: 'Why is a next-hop static route usually preferred over an exit-interface static route on an Ethernet link?',
      opts: ['The exit-interface form is not supported on Ethernet', 'The exit-interface form makes the router treat the whole remote subnet as directly attached, so it ARPs for every destination', 'The next-hop form has a lower administrative distance', 'The exit-interface form cannot be used with a default route'],
      a: [1],
      why: 'On a multi-access link the exit-interface form causes proxy-ARP-style behaviour and a huge ARP table. The next-hop form tells the router exactly one address to resolve.' },

    { d: D.ip, lab: 'd24-dynamic-routing',
      q: 'What is the purpose of configuring a static route with an administrative distance of 200 when OSPF is already running?',
      opts: ['To load-balance traffic between the static and OSPF paths', 'To create a backup path that is only installed if the OSPF route disappears', 'To force the static route to be preferred over OSPF', 'To stop OSPF from advertising that prefix'],
      a: [1],
      why: 'That is a floating static route. Because 200 is worse than OSPF\'s 110 it sits unused, and installs itself automatically the moment the dynamic route is withdrawn.' },

    { d: D.ip, lab: 'd27-ospf',
      q: 'Two directly-connected routers will not form an OSPF adjacency. Which two conditions would prevent it? (Choose 2)',
      opts: ['Different OSPF process IDs', 'Different area numbers on the connecting interfaces', 'Mismatched hello and dead timers', 'Different router IDs'],
      a: [1, 2],
      why: 'Process IDs are only locally significant and router IDs must be different. Area numbers, timers, subnet, authentication and network type must all match.' },

    { d: D.ip, lab: 'd27-ospf',
      q: 'What does <code>passive-interface GigabitEthernet0/0</code> do inside an OSPF process?',
      opts: ['Removes the interface subnet from OSPF entirely', 'Stops OSPF hellos on that interface while still advertising its subnet', 'Prevents the interface from receiving routing updates but still sends them', 'Shuts down the interface'],
      a: [1],
      why: 'Passive silences hellos so no adjacency can form there — right for a LAN with only hosts on it — but the subnet is still advertised to the rest of the OSPF domain.' },

    { d: D.ip, lab: 'd11-static-routing',
      q: 'In <code>show ip route</code>, what does the entry <code>S* 0.0.0.0/0 [1/0] via 10.0.0.1</code> tell you?',
      opts: ['A static route to a single host', 'A static default route, and it is the current candidate default (gateway of last resort)', 'An OSPF-learned summary route', 'A directly connected route to 10.0.0.1'],
      a: [1],
      why: 'All-zeros address and mask is a default route; S means static and the asterisk marks it as the candidate default the router will use for anything it has no better match for.' },

    { d: D.ip, lab: 'd28-hsrp',
      q: 'R1 has HSRP priority 110, R2 has the default 100, and preempt is NOT configured anywhere. R1 reboots. What happens when R1 comes back up?',
      opts: ['R1 becomes Active again immediately because of its higher priority', 'R2 stays Active and R1 becomes Standby', 'Both routers become Active', 'The group fails and hosts lose their gateway'],
      a: [1],
      why: 'HSRP does not take the Active role back by default. Without preempt, the router that is Active keeps the role no matter how high the other router\'s priority is.' },

    { d: D.ip, lab: 'x6-ospf-hsrp',
      q: 'Every link in a network is gigabit and OSPF is using its default reference bandwidth. What is the effect on path selection?',
      opts: ['All gigabit links have a cost of 1, so OSPF cannot tell a fast path from a slow one', 'Costs are calculated per hop count instead', 'OSPF automatically raises the reference bandwidth', 'Gigabit links are given a cost of 0 and are always preferred'],
      a: [0],
      why: 'Cost is reference bandwidth (100 Mbps by default) divided by interface bandwidth, rounded up to a minimum of 1. Everything gigabit and faster becomes cost 1 until you raise the reference on every router.' },

    { d: D.ip, lab: 'd11-static-routing',
      q: 'PC1 pings a server two routers away and gets no reply. Packet captures show the ICMP echo arriving at the server, which replies. What is the most likely fault?',
      opts: ['The server has the wrong subnet mask', 'A router on the path has no route back to PC1\'s subnet', 'The ICMP echo is being blocked outbound', 'PC1 has no default gateway'],
      a: [1],
      why: 'The request arrived, so the forward path works. When the reply never comes back, the return path is missing — the single most common static-routing mistake.' },

    /* ---- 4.0 IP Services ---- */
    { d: D.svc, lab: 'd38-dhcp',
      q: 'A PC on a subnet with no DHCP server needs an address from a server on another subnet. What must be configured, and where?',
      opts: ['A default gateway on the DHCP server', 'An ip helper-address on the router interface facing the CLIENTS, pointing at the server', 'An ip helper-address on the router interface facing the SERVER, pointing at the clients', 'A static host route on the client'],
      a: [1],
      why: 'Routers do not forward broadcasts. The relay must sit on the interface that hears the client DISCOVER, and it rewrites it as a unicast to the server, stamping its own address so the server picks the right pool.' },

    { d: D.svc, lab: 'd36-ntp',
      q: 'A router reports <code>Clock is unsynchronized, stratum 16</code>. What does stratum 16 mean?',
      opts: ['The clock is 16 hours out', 'The device has no trustworthy time source', 'The device is 16 hops from a GPS clock', 'NTP authentication has failed'],
      a: [1],
      why: 'Stratum counts hops from a reference clock — 1 is a GPS or atomic source. 16 is the reserved value meaning unsynchronised.' },

    { d: D.svc, lab: 'd43-static-nat',
      q: 'A server\'s real address is 192.168.1.100 and it is published to the internet as 203.0.113.100. Which NAT terms describe those two addresses?',
      opts: ['Inside local 192.168.1.100, inside global 203.0.113.100', 'Inside global 192.168.1.100, inside local 203.0.113.100', 'Outside local 192.168.1.100, outside global 203.0.113.100', 'Inside local 192.168.1.100, outside local 203.0.113.100'],
      a: [0],
      why: 'Local means "as seen from inside", global means "as seen from outside". Both refer to the same inside host, which is why both start with "inside".' },

    { d: D.svc, lab: 'd40-syslog',
      q: 'A device is configured with <code>logging trap warnings</code>. Which messages are sent to the syslog server?',
      opts: ['Only severity 4 messages', 'Severity 4 and everything numerically higher (5, 6, 7)', 'Severity 4 and everything numerically lower (3, 2, 1, 0)', 'All messages regardless of severity'],
      a: [2],
      why: 'Lower numbers are MORE severe. Setting warnings (4) exports levels 0 to 4, so debugging (7) and informational (6) messages stay local.' },

    /* ---- 5.0 Security Fundamentals ---- */
    { d: D.sec, lab: 'd47-port-security',
      q: 'Which port-security violation mode drops offending frames without logging them or incrementing a counter?',
      opts: ['shutdown', 'restrict', 'protect', 'disable'],
      a: [2],
      why: 'Protect drops silently — no syslog, no SNMP trap, no counter — which makes it the hardest to troubleshoot and a favourite exam answer.' },

    { d: D.sec, lab: 'd48-dhcp-snooping',
      q: 'With DHCP snooping enabled on a VLAN, which ports should be configured as trusted?',
      opts: ['Every access port where a PC connects', 'Only the ports facing the legitimate DHCP server or the rest of the network', 'All ports, because snooping only inspects client messages', 'None — trust is not used by DHCP snooping'],
      a: [1],
      why: 'Server messages (OFFER, ACK, NAK) are only accepted on trusted ports. Access ports stay untrusted so a rogue server plugged into a desk has its offers dropped.' },

    { d: D.sec, lab: 'd49-dai',
      q: 'Dynamic ARP Inspection is enabled on VLAN 10, but every host immediately loses connectivity. What is the most likely cause?',
      opts: ['DAI requires the DHCP snooping binding table, which does not exist because snooping is not configured', 'DAI must be applied per interface rather than per VLAN', 'The switch needs ip routing enabled', 'DAI is incompatible with access ports'],
      a: [0],
      why: 'DAI validates ARP against the DHCP snooping bindings. With no snooping there are no bindings, so every ARP on an untrusted port fails the check.' },

    { d: D.sec, lab: 'd41-ssh',
      q: 'Which two items must exist before a switch can generate RSA keys for SSH? (Choose 2)',
      opts: ['A hostname other than the default', 'A configured domain name', 'An enable secret', 'A management VLAN interface in the up state'],
      a: [0, 1],
      why: 'The key pair is named hostname.domain, so both must be set. An SVI is needed for reachability but not for key generation itself.' },

    { d: D.sec, lab: 'd53-wireless',
      q: 'Which wireless security option authenticates each user individually against a RADIUS server?',
      opts: ['WPA2 Personal with a pre-shared key', 'WPA2 Enterprise with 802.1X/EAP', 'WEP with a shared key', 'An open network with a captive portal'],
      a: [1],
      why: 'Enterprise mode uses 802.1X: the client is the supplicant, the AP or WLC is the authenticator, and RADIUS is the authentication server. PSK shares one password with everybody.' },

    { d: D.sec, lab: 'd46-security-fundamentals',
      q: 'Which statement about TACACS+ and RADIUS is correct?',
      opts: ['RADIUS encrypts the entire payload; TACACS+ encrypts only the password', 'TACACS+ encrypts the entire payload and separates authentication, authorization and accounting', 'Both use TCP port 49', 'RADIUS separates the three As; TACACS+ combines them'],
      a: [1],
      why: 'TACACS+ (TCP 49) encrypts the whole payload and splits the three As, which is why it suits device administration. RADIUS (UDP 1812/1813) encrypts only the password and combines authentication with authorization.' },

    /* ---- 6.0 Automation & Programmability ---- */
    { d: D.auto, lab: 'd57-automation',
      q: 'Which data format is shown here?<pre>interface:\n  name: GigabitEthernet0/1\n  enabled: true</pre>',
      opts: ['JSON', 'XML', 'YAML', 'HTML'],
      a: [2],
      why: 'Indentation and key: value pairs with no braces or tags is YAML — which is why Ansible playbooks are written in it. Braces mean JSON; angle brackets mean XML.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'A REST API call returns HTTP status 401. What does that mean?',
      opts: ['The resource does not exist', 'The request was understood but the credentials are missing or invalid', 'The server encountered an internal error', 'The request succeeded and a resource was created'],
      a: [1],
      why: '401 is unauthorized — authentication failed or was absent. 403 means you authenticated but are not allowed; 404 is not found; 500 is a server error.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'Which two statements about Ansible are true? (Choose 2)',
      opts: ['It is agentless and typically reaches network devices over SSH', 'It requires an agent installed on every managed device', 'Its playbooks are written in YAML', 'Its configuration files are written in Ruby'],
      a: [0, 2],
      why: 'Ansible is agentless, push-based, and uses YAML playbooks with an inventory file. Puppet and Chef are agent-based and use their own DSL and Ruby respectively.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'In a controller-based network, what is the northbound API used for?',
      opts: ['The controller programming the forwarding tables of switches', 'Applications and scripts requesting services from the controller', 'Switches exchanging link-state information', 'Encrypting the control plane between devices'],
      a: [1],
      why: 'Northbound faces applications and is usually REST — it is the one you write against. Southbound (NETCONF, RESTCONF, OpenFlow) is how the controller programs the devices.' },
  ],
});

/* ============================================================= */
X({
  id: 'ex2', short: 'Exam 2', name: 'Exam 2 — Reading the output', minutes: 50, pass: 82,
  blurb: 'Every question hands you real command output and asks what it means. This is the skill that separates people who have configured a network from people who have only read about one.',
  qs: [
    /* ---- 1.0 Network Fundamentals ---- */
    { d: D.fund, lab: 'd08-router-ints',
      q: 'What is wrong here?<pre>R1# show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol\nGigabitEthernet0/0     10.0.1.1        YES manual administratively down  down\nGigabitEthernet0/1     10.0.2.1        YES manual up                    up</pre>',
      opts: ['G0/0 has no cable plugged in', 'Somebody has not typed <code>no shutdown</code> on G0/0', 'G0/0 has a duplex mismatch', 'G0/0 is missing a subnet mask'],
      a: [1],
      why: '"administratively down" has exactly one cause: the interface is shut. A missing cable or dead far end shows as down/down instead.' },

    { d: D.fund, lab: 'd10-life-of-packet',
      q: 'PC1 (10.0.1.10/24, gateway 10.0.1.1) has just pinged a server at 10.0.2.100. Why does its ARP cache look like this?<pre>C:\\> arp -a\n  Internet Address      Physical Address      Type\n  10.0.1.1              000a-4100-1717        dynamic</pre>',
      opts: ['The ping failed, so no entry for the server was created', 'A host ARPs for its default gateway, never for an address in another subnet', 'The server replied from its gateway address instead of its own', 'The ARP entry for the server has already aged out'],
      a: [1],
      why: 'The destination is outside PC1\'s subnet, so the frame is addressed to the gateway while the packet inside still carries the server\'s IP. Hosts only ARP for addresses on their own subnet.' },

    { d: D.fund, lab: 'd06-mac-tables',
      q: 'What does this tell you?<pre>SW1# show mac address-table\n  Vlan    Mac Address       Type      Ports\n  ----    -----------       ----      -----\n    10    000a.4100.1717    DYNAMIC   Fa0/1\n    10    000a.4100.2b2b    DYNAMIC   Gi0/1</pre>',
      opts: ['Two hosts are plugged into Fa0/1', 'One host is on Fa0/1 and everything else in VLAN 10 is reached through the Gi0/1 uplink', 'VLAN 10 is misconfigured because two ports share it', 'The switch is routing between the two ports'],
      a: [1],
      why: 'A MAC learned on an uplink simply means that device is somewhere beyond it. The switch learns from the source address of arriving frames — it has no idea how far away the device is.' },

    { d: D.fund, lab: 'd01-devices-cables',
      q: 'In this output, which port had its speed and duplex configured by a human?<pre>SW1# show interfaces status\nPort      Name               Status       Vlan       Duplex  Speed Type\nFa0/1     PC1-DESK           connected    10           full    100 10/100BaseTX\nFa0/2     IP-PHONE           connected    10         a-full  a-100 10/100BaseTX</pre>',
      opts: ['Fa0/2, because the values are shown with a prefix', 'Fa0/1, because its values print with no "a-" prefix', 'Both, because both show a speed', 'Neither — the values are always negotiated'],
      a: [1],
      why: 'The "a-" prefix marks an auto-negotiated value. Plain values were configured manually, which is how you spot one hard-coded end of a duplex mismatch.' },

    { d: D.fund, lab: 'd12-subnetting',
      q: 'A router reports this. Which address could you still assign to a host on that segment?<pre>R1# show ip interface g0/0\nGigabitEthernet0/0 is up, line protocol is up\n  Internet address is 192.168.10.65/27\n  Broadcast address is 192.168.10.95</pre>',
      opts: ['192.168.10.64', '192.168.10.95', '192.168.10.94', '192.168.10.96'],
      a: [2],
      why: 'The /27 runs from .64 (network) to .95 (broadcast), so usable addresses are .65 to .94. .96 belongs to the next subnet.' },

    { d: D.fund, lab: 'd03-models',
      q: 'A traceroute from a PC to a server three switches and two routers away shows only two hops. Why?',
      opts: ['The trace timed out before reaching the rest', 'Switches do not decrement TTL, so they never appear in a traceroute', 'The switches are configured to hide themselves', 'The PC is using UDP instead of ICMP'],
      a: [1],
      why: 'Traceroute reveals devices that make layer-3 decisions. A layer-2 switch never opens the IP header, so it is invisible — which tells you something true about what switches do.' },

    { d: D.fund, lab: 'd32-ipv6',
      q: 'What produced the second address here?<pre>R2# show ipv6 interface brief\nGigabitEthernet0/0  [up/up]\n    FE80::2\n    2001:DB8:2::20A:41FF:FE00:2B2B</pre>',
      opts: ['A DHCPv6 lease', 'The eui-64 keyword, which builds the host half from the interface MAC', 'Stateless address autoconfiguration from a router advertisement', 'A manually typed address'],
      a: [1],
      why: 'FFFE wedged into the middle of the host portion is the giveaway of EUI-64: the MAC is split in two, FFFE inserted and the seventh bit flipped.' },

    { d: D.fund, lab: 'd29-tcp-udp',
      q: 'Which well-known port numbers are correct? (Choose 2)',
      opts: ['SSH is TCP 22', 'DNS is TCP 53 only', 'SNMP is UDP 161', 'Syslog is TCP 514'],
      a: [0, 2],
      why: 'SSH is TCP 22 and SNMP polls on UDP 161 (traps on 162). DNS uses UDP 53 as well as TCP 53, and syslog is UDP 514.' },

    /* ---- 2.0 Network Access ---- */
    { d: D.access, lab: 'd17-vlans2',
      q: 'VLAN 20 works between two switches but VLAN 30 does not. What does this output explain?<pre>SW1# show interfaces trunk\nPort      Mode  Encapsulation  Status    Native vlan\nGi0/1     on    802.1q         trunking  1001\n\nPort      Vlans allowed on trunk\nGi0/1     10,20</pre>',
      opts: ['The native VLAN is wrong', 'VLAN 30 is not on the allowed list, so its frames are discarded at the trunk', 'The encapsulation should be ISL', 'The trunk is not actually trunking'],
      a: [1],
      why: 'A trunk carries only the VLANs on its allowed list. One VLAN silently missing is a classic, and it shows up nowhere except this command.' },

    { d: D.access, lab: 'd21-stp',
      q: 'What does this tell you about SW2?<pre>SW2# show spanning-tree vlan 10\n  Root ID    Priority    4106\n             Address     000a.4100.0101\n             Cost        4\n             Port        1 (GigabitEthernet0/1)\n\n  Bridge ID  Priority    32778</pre>',
      opts: ['SW2 is the root bridge for VLAN 10', 'SW2 is not the root; its path to the root leaves via Gi0/1, its root port', 'Spanning tree is disabled for VLAN 10', 'SW2 has two root ports'],
      a: [1],
      why: 'Root ID and Bridge ID differ, so this is not the root. The "Port" line names the root port — the one interface on a non-root switch that leads to the root.' },

    { d: D.access, lab: 'd22-etherchannel',
      q: 'What is wrong with this bundle?<pre>SW1# show etherchannel summary\nGroup  Port-channel  Protocol    Ports\n------+-------------+-----------+----------------\n1      Po1(SD)        LACP        Gi0/1(I) Gi0/2(I)</pre>',
      opts: ['The channel is working normally', 'The members are standalone and the channel is down — the modes probably do not match on the other end', 'The ports are in the wrong VLAN', 'LACP is not supported on these interfaces'],
      a: [1],
      why: 'D means the port-channel is down and (I) means each member is standalone rather than bundled. The usual cause is passive on both ends, or mismatched settings between members.' },

    { d: D.access, lab: 'd47-port-security',
      q: 'What happened to this port?<pre>SW1# show port-security interface f0/1\nPort Security              : Enabled\nPort Status                : Secure-shutdown\nViolation Mode             : Shutdown\nMaximum MAC Addresses      : 1\nTotal MAC Addresses        : 1\nSecurity Violation Count   : 1</pre>',
      opts: ['The port is working normally with one secured address', 'A second MAC address appeared, so port security err-disabled the port', 'The port has been administratively shut down by an engineer', 'The port is waiting for a sticky address to be learned'],
      a: [1],
      why: 'Secure-shutdown plus a violation count means the port disabled itself. Recovery is shutdown followed by no shutdown — and raising the maximum if the extra device is legitimate.' },

    { d: D.access, lab: 'd16-vlans1',
      q: 'A user on Fa0/3 cannot reach anything. What does this show?<pre>SW1# show vlan brief\nVLAN Name          Status    Ports\n---- ------------- --------- -------------------------------\n1    default       active    Fa0/5, Fa0/6\n10   ENGINEERING   active    Fa0/1, Fa0/2\n20   SALES         active    Fa0/4\n99   PARKING       active    Fa0/3</pre>',
      opts: ['VLAN 99 is not active', 'Fa0/3 sits in the parking VLAN rather than the user VLAN', 'Fa0/3 is a trunk port', 'The switch needs a default gateway'],
      a: [1],
      why: 'The port is in a VLAN with nothing else in it and no gateway. Everything about the addressing can be perfect and it will still reach nothing.' },

    { d: D.access, lab: 'd19-dtp-vtp',
      q: 'Which fact does this output confirm?<pre>SW1# show interfaces g0/1 switchport\nName: Gi0/1\nSwitchport: Enabled\nAdministrative Mode: dynamic auto\nOperational Mode: static access\nNegotiation of Trunking: On</pre>',
      opts: ['The port is trunking', 'The port wanted to trunk but the far end never asked, so it stayed an access port', 'DTP has been disabled on this port', 'The port is err-disabled'],
      a: [1],
      why: 'Administrative mode is what you configured, operational mode is what actually happened. Auto will agree to trunk but never initiate, so with a passive neighbour it lands on access.' },

    { d: D.access, lab: 'd45-qos',
      q: 'What does this port do with the QoS markings a PC sends?<pre>SW1# show mls qos interface f0/2\nFastEthernet0/2\ntrust state: not trusted\ndefault COS: 0</pre>',
      opts: ['It preserves them end to end', 'It overwrites them with CoS 0', 'It drops frames that carry markings', 'It trusts them only if they came from a phone'],
      a: [1],
      why: 'An untrusted port rewrites incoming markings to the configured default. That is the trust boundary doing its job — otherwise any user could promote their own traffic above voice.' },

    { d: D.access, lab: 'd35-cdp-lldp',
      q: 'You are standing in a wiring closet with no documentation. What have you just learned?<pre>SW1# show cdp neighbors\nDevice ID    Local Intrfce   Holdtme  Capability  Platform   Port ID\nR1           Gig 0/1         168      R B         ISR4331    Gig 0/0/0\nSW2          Fas 0/24        142      S I         WS-C2960   Fas 0/24</pre>',
      opts: ['Both neighbours are reachable at layer 3 from SW1', 'SW1\'s Gi0/1 is cabled to R1\'s Gi0/0/0, and Fa0/24 is cabled to SW2\'s Fa0/24', 'R1 and SW2 are in the same VLAN as SW1', 'SW1 is learning routes from R1'],
      a: [1],
      why: 'CDP is a layer 2 discovery protocol: it maps your local port to the neighbour\'s port and tells you what that neighbour is. It says nothing about IP reachability, VLANs or routing — the neighbours do not even need IP addresses.' },

    /* ---- 3.0 IP Connectivity ---- */
    { d: D.ip, lab: 'd27-ospf',
      q: 'What does this output tell you?<pre>R2# show ip ospf neighbor\nNeighbor ID   Pri  State     Dead Time  Address      Interface\n1.1.1.1         1  FULL/DR   00:00:36   10.0.12.1    GigabitEthernet0/0\n3.3.3.3         1  FULL/  -  00:00:33   10.0.23.2    GigabitEthernet0/1</pre>',
      opts: ['One adjacency has failed', 'Both adjacencies are fully formed; the second is on a point-to-point link, which elects no DR', 'The second neighbour is stuck in the 2-WAY state', 'R2 is the DR on both segments'],
      a: [1],
      why: 'FULL means the databases are synchronised. A dash instead of a DR/BDR role means the network type is point-to-point, where no election happens.' },

    { d: D.ip, lab: 'd11-static-routing',
      q: 'Which statement about this table is true?<pre>R1# show ip route\n     10.0.0.0/8 is variably subnetted, 3 subnets, 2 masks\nC       10.0.1.0/24 is directly connected, GigabitEthernet0/0\nL       10.0.1.1/32 is directly connected, GigabitEthernet0/0\nS       10.0.2.0/24 [1/0] via 192.168.12.2</pre>',
      opts: ['The L entry is a loopback interface', 'The L entry is the router\'s own address on that subnet, installed as a /32', 'The S entry was learned from a neighbour', 'The router cannot reach 10.0.2.0/24'],
      a: [1],
      why: 'C is the connected subnet and L is the local /32 for the interface\'s own address. S with [1/0] is a static route you typed.' },

    { d: D.ip, lab: 'd24-dynamic-routing',
      q: 'What do the two numbers in <code>[110/65]</code> mean in a routing table entry?',
      opts: ['Administrative distance 110, metric 65', 'Metric 110, hop count 65', 'Bandwidth 110 Mbps, delay 65', 'Route age 110 seconds, cost 65'],
      a: [0],
      why: 'The first number is always the administrative distance (110 identifies OSPF) and the second is that protocol\'s metric — for OSPF, the accumulated cost.' },

    { d: D.ip, lab: 'd28-hsrp',
      q: 'Read this carefully. Which statement is true?<pre>R1# show standby brief\nInterface  Grp  Pri P State    Active         Standby        Virtual IP\nGi0/0      1    110 P Active   local          10.0.0.3       10.0.0.1\nGi0/0      2    100   Standby  10.0.0.3       local          10.0.0.254</pre>',
      opts: ['R1 is Active for both groups', 'R1 is Active for group 1 and Standby for group 2, so both routers carry traffic', 'Group 2 is misconfigured because R1 has the lower priority', 'Preempt is enabled on both groups'],
      a: [1],
      why: 'Two groups with reversed preferences is the standard load-sharing design. Note the P appears only on group 1 — preempt is not configured on group 2.' },

    { d: D.ip, lab: 'x6-ospf-hsrp',
      q: 'What is the effect of the line marked below?<pre>R1# show ip protocols\nRouting Protocol is "ospf 1"\n  Router ID 1.1.1.1\n  Passive Interface(s):\n    GigabitEthernet0/0\n  Routing Information Sources:\n    Gateway         Distance\n    3.3.3.3              110</pre>',
      opts: ['The 10.0.0.0/24 LAN on G0/0 is no longer advertised', 'OSPF hellos are suppressed on G0/0 but its subnet is still advertised', 'G0/0 has been shut down', 'OSPF will only accept routes from G0/0'],
      a: [1],
      why: 'Passive stops hellos so no adjacency can form on that interface, which is right for a LAN with only hosts, while the subnet itself is still flooded to the rest of the area.' },

    { d: D.ip, lab: 'd18-vlans3',
      q: 'Inter-VLAN routing works for VLAN 10 but not VLAN 20. What does this suggest?<pre>R1# show running-config | section GigabitEthernet0/0\ninterface GigabitEthernet0/0.10\n encapsulation dot1Q 10\n ip address 10.0.10.1 255.255.255.0\ninterface GigabitEthernet0/0.20\n encapsulation dot1Q 30\n ip address 10.0.20.1 255.255.255.0</pre>',
      opts: ['The subinterface numbers must match the VLAN IDs', 'The second subinterface is tagged for VLAN 30, so VLAN 20 frames are never accepted', 'The IP address on the second subinterface is in the wrong subnet', 'The physical interface needs an IP address'],
      a: [1],
      why: 'The subinterface number is cosmetic — only the encapsulation line decides which tagged frames the router accepts. Tagged for a VLAN that does not exist, it silently receives nothing.' },

    { d: D.ip, lab: 'x5-static-ipv6',
      q: 'Which route will a packet to 10.0.3.10 actually use?<pre>S    10.0.3.0/24 [1/0] via 10.0.12.2\nS    10.0.3.10/32 [1/0] via 10.0.13.2</pre>',
      opts: ['The /24, because it was configured first', 'The /32, because it is the more specific match', 'Both, load-balanced', 'Neither — the overlap invalidates both'],
      a: [1],
      why: 'Longest prefix match wins, always. A /32 host route sends one address down a different path from the rest of its subnet, which is powerful and easy to forget you did.' },

    { d: D.ip, lab: 'd11-static-routing',
      q: 'From R1, <code>ping 10.0.2.10</code> returns <code>U.U.U</code>. What does the U mean?',
      opts: ['The destination replied with an unreachable message — something is administratively blocking it', 'The packet was dropped by a duplex mismatch', 'The TTL expired in transit', 'The interface is unnumbered'],
      a: [0],
      why: 'A dot is a plain timeout; U is an ICMP destination-unreachable coming back, which usually means an access list dropped the traffic or a router had no route.' },

    { d: D.ip, lab: 'd12-subnetting',
      q: 'Two routers cannot ping each other across a link. R1 G0/1 is 10.0.12.1/30 and R2 G0/0 is 10.0.12.5/30, both up/up. Why?',
      opts: ['A /30 supports only one router', 'The two addresses are in different /30 subnets, so the routers are not on a common network', 'The mask should be /31 for a point-to-point link', 'One end needs to be configured as a default gateway'],
      a: [1],
      why: 'With a /30 the usable pairs are .1/.2, then .5/.6. Those two addresses are numerically adjacent and in separate subnets, so the link can never work.' },

    { d: D.ip, lab: 'd24-dynamic-routing',
      q: 'R1 learns 10.0.9.0/24 from OSPF and from a static route you typed. Which line appears in the routing table, and why?<pre>R1# show ip route 10.0.9.0\nRouting entry for 10.0.9.0/24\n  Known via \"static\", distance 1, metric 0</pre>',
      opts: ['The static route won because its metric of 0 is lower than any OSPF cost', 'The static route won because administrative distance 1 beats OSPF\'s 110 — metrics are only compared inside one protocol', 'Both routes are installed and traffic is load balanced', 'OSPF was never running on that interface'],
      a: [1],
      why: 'Administrative distance picks the source first; only then does the metric choose between paths from that same source. A static route (AD 1) always beats OSPF (AD 110) for the same prefix, no matter how good the OSPF cost is.' },

    /* ---- 4.0 IP Services ---- */
    { d: D.svc, lab: 'd38-dhcp',
      q: 'What does this output prove?<pre>R1# show ip dhcp binding\nIP address     Client-ID/Hardware address   Lease expiration    Type\n10.0.1.10      000a.4100.1717               Oct 02 2026 09:14   Automatic\n10.0.2.10      000a.4100.2b2b               Oct 02 2026 09:15   Automatic</pre>',
      opts: ['Two clients on R1\'s own LAN have leases', 'R1 is serving two different subnets — the second one must have reached it through a relay', 'Both addresses were configured statically on the clients', 'The lease times are wrong'],
      a: [1],
      why: 'R1 is attached to 10.0.1.0/24 only. A binding from 10.0.2.0/24 means a relay stamped the request with its own interface address so the server could pick the right pool.' },

    { d: D.svc, lab: 'd37-dns',
      q: 'A router prints this when you type a mistyped command. What is happening and what stops it?<pre>R1# shoo ip route\nTranslating "shoo"...domain server (255.255.255.255)</pre>',
      opts: ['The router is resolving the command name, stopped by <code>no ip domain-lookup</code>', 'The router is downloading its configuration, stopped by <code>no service config</code>', 'DNS is misconfigured, fixed by setting a name server', 'The console needs <code>logging synchronous</code>'],
      a: [0],
      why: 'An unrecognised command is treated as a hostname to telnet to. With lookups enabled and no server reachable, the session hangs for about a minute — which is why every engineer disables it on day one.' },

    { d: D.svc, lab: 'd44-pat',
      q: 'What kind of NAT is in use here?<pre>R1# show ip nat translations\nPro Inside global       Inside local      Outside local     Outside global\ntcp 203.0.113.2:1043   192.168.1.10:1043 93.184.216.34:80  93.184.216.34:80\ntcp 203.0.113.2:1044   192.168.1.11:3390 93.184.216.34:80  93.184.216.34:80</pre>',
      opts: ['Static NAT, because each host has its own entry', 'PAT, because several inside hosts share one public address distinguished by port', 'Dynamic NAT from a pool', 'No translation is happening'],
      a: [1],
      why: 'Two different inside hosts share 203.0.113.2 and are told apart by the port number. Protocol and port columns being populated is the signature of overload.' },

    { d: D.svc, lab: 'd40-syslog',
      q: 'Decode this message: <code>%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to down</code>',
      opts: ['Facility LINEPROTO, severity 5 (notification), mnemonic UPDOWN', 'Facility LINE, severity PROTO, mnemonic 5', 'Severity 5 means critical', 'It is an SNMP trap rather than a syslog message'],
      a: [0],
      why: 'The format is %FACILITY-SEVERITY-MNEMONIC. Severity 5 is notification — informational enough that a trap level of warnings (4) would not export it.' },

    /* ---- 5.0 Security Fundamentals ---- */
    { d: D.sec, lab: 'd33-std-acl',
      q: 'Why does this list block everything from 10.0.2.0/24 AND everything else?<pre>R1# show access-lists\nStandard IP access list 10\n    10 deny   10.0.2.0, wildcard bits 0.0.0.255\n    20 permit 10.0.1.0, wildcard bits 0.0.0.255</pre>',
      opts: ['It does not — 10.0.1.0/24 is permitted by line 20', 'Because the implicit deny at the end blocks everything not listed', 'Because deny statements always take priority', 'Because the wildcard masks are invalid'],
      a: [1],
      why: 'Line 20 does permit 10.0.1.0/24. Everything else falls to the invisible deny-any at the bottom of every access list — which is the real answer to "why is that other subnet broken?"' },

    { d: D.sec, lab: 'd34-ext-acl',
      q: 'A user can browse the server but cannot ping it. Which line explains that?<pre>ip access-list extended WEB-ONLY\n 10 permit tcp 10.0.1.0 0.0.0.255 host 10.0.3.100 eq www\n 20 deny icmp 10.0.1.0 0.0.0.255 host 10.0.3.100\n 30 permit ip any any</pre>',
      opts: ['Line 10, because it only permits TCP', 'Line 20, because ping is ICMP and it is explicitly denied', 'Line 30, because it is too broad', 'None — the list should not affect ping'],
      a: [1],
      why: 'One protocol failing between two hosts while everything else works is the fingerprint of an extended ACL. Line 20 names ICMP specifically.' },

    { d: D.sec, lab: 'd49-dai',
      q: 'What is missing from this configuration?<pre>SW1# show ip arp inspection\nSource Mac Validation      : Disabled\nDestination Mac Validation : Disabled\nIP Address Validation      : Disabled\n\n Vlan     Configuration    Operation\n 1        Enabled          Active\n\n Interface        Trust State\n Gi0/1            Untrusted\n Fa0/1            Untrusted</pre>',
      opts: ['Nothing — this is a complete configuration', 'The uplink Gi0/1 should be trusted, otherwise the router\'s own ARP is dropped', 'DAI should be disabled on VLAN 1', 'The access port should be trusted instead'],
      a: [1],
      why: 'The router is statically addressed so it has no DHCP snooping binding. With its uplink untrusted, DAI drops the gateway\'s ARP and takes the whole LAN down.' },

    { d: D.sec, lab: 'd41-ssh',
      q: 'What does this tell you about remote access to the device?<pre>SW1# show ip ssh\nSSH Enabled - version 2.0\nAuthentication timeout: 120 secs; Authentication retries: 3</pre>',
      opts: ['Telnet is automatically disabled by enabling SSH', 'SSH is ready, but the vty lines still decide whether Telnet is accepted', 'The device will accept SSH version 1 as a fallback', 'Keys have not been generated yet'],
      a: [1],
      why: 'Enabling SSH does not close Telnet. Only <code>transport input ssh</code> on the vty lines does that — a very common gap in real configurations.' },

    { d: D.sec, lab: 'd46-security-fundamentals',
      q: 'What protection is configured here?<pre>R1# show login\n     A default login delay of 1 second is applied.\n     Router enabled to watch for login Attacks.\n     If more than 3 login failures occur in 60 seconds or less,\n     logins will be disabled for 120 seconds.</pre>',
      opts: ['Port security', 'Login blocking, which throttles password-guessing attacks', 'AAA accounting', 'An access-class on the vty lines'],
      a: [1],
      why: '<code>login block-for</code> turns unlimited brute-force guessing into a handful of attempts per minute. It complements, rather than replaces, an access-class restricting who may connect.' },

    { d: D.sec, lab: 'd48-dhcp-snooping',
      q: 'A PC suddenly cannot get a DHCP address after snooping was enabled. What is the most likely cause?<pre>SW1# show ip dhcp snooping\nSwitch DHCP snooping is enabled\nDHCP snooping is configured on following VLANs: 1\nInterface           Trusted\n------------------- -------\nFastEthernet0/1     no\nGigabitEthernet0/1  no</pre>',
      opts: ['The client port should be trusted', 'The uplink toward the DHCP server is untrusted, so the server\'s OFFER is being dropped', 'Snooping must be disabled on VLAN 1', 'The switch needs an SVI'],
      a: [1],
      why: 'Client messages are allowed from untrusted ports; server messages are not. The port facing the real server has to be trusted or every reply is discarded.' },

    /* ---- 6.0 Automation & Programmability ---- */
    { d: D.auto, lab: 'd57-automation',
      q: 'Which format is this, and what commonly uses it?<pre>&lt;interface&gt;\n  &lt;name&gt;GigabitEthernet0/1&lt;/name&gt;\n  &lt;enabled&gt;true&lt;/enabled&gt;\n&lt;/interface&gt;</pre>',
      opts: ['JSON, used by REST APIs', 'XML, used by NETCONF', 'YAML, used by Ansible playbooks', 'CSV, used by inventory files'],
      a: [1],
      why: 'Matching angle-bracket tags is XML, which is what NETCONF carries over SSH on port 830. Braces would be JSON; indentation with dashes would be YAML.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'A script applies the same configuration twice and the device reports no change the second time. What property is being demonstrated?',
      opts: ['Atomicity', 'Idempotency', 'Convergence', 'Statelessness'],
      a: [1],
      why: 'Idempotency means re-applying a desired state changes nothing once it is already true, which is what makes it safe to re-run a playbook against a live network.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'Which two things must be enabled on an IOS-XE device before a script can manage it with RESTCONF? (Choose 2)',
      opts: ['The HTTPS server', 'The <code>restconf</code> agent', 'Telnet on the vty lines', 'CDP on the management interface'],
      a: [0, 1],
      why: 'RESTCONF is an HTTP API served over HTTPS, so the secure web server and the restconf agent both have to be on. NETCONF instead rides on SSH port 830.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'Which REST verb would you use to retrieve the current configuration of an interface without changing anything?',
      opts: ['POST', 'PUT', 'GET', 'PATCH'],
      a: [2],
      why: 'GET reads. POST creates, PUT replaces, PATCH modifies part of a resource and DELETE removes it.' },
  ],
});

/* ============================================================= */
X({
  id: 'ex3', short: 'Exam 3', name: 'Exam 3 — Design decisions', minutes: 50, pass: 82,
  blurb: 'You are handed requirements and asked to choose. No syntax recall — every question is "given this situation, what is the right answer and why".',
  qs: [
    /* ---- 1.0 Network Fundamentals ---- */
    { d: D.fund, lab: 'd12-subnetting',
      q: 'A branch needs four subnets for at most 25 hosts each, carved out of 192.168.40.0/24, using as little address space as possible. Which mask should you use?',
      opts: ['/25', '/26', '/27', '/28'],
      a: [2],
      why: 'A /27 leaves 5 host bits: 32 addresses, 30 usable — the smallest block that still fits 25 hosts. A /28 gives only 14 usable, and a /26 wastes 37 addresses per subnet.' },

    { d: D.fund, lab: 'd12-subnetting',
      q: 'You have to number 60 point-to-point router links and want to waste nothing. What mask fits a link with exactly two routers on it?',
      opts: ['/29, because you may need to add a device later', '/30, which gives exactly two usable addresses', '/31, which is illegal on Cisco routers', '/24, since the link is inside your own network anyway'],
      a: [1],
      why: 'A /30 has 4 addresses: network, two hosts, broadcast — a perfect fit for a link with two ends. (/31 does exist for point-to-point links, but /30 is the answer the CCNA expects.)' },

    { d: D.fund, lab: 'd01-devices-cables',
      q: 'You are running a link between two buildings 400 m apart, through a yard that has large motors running. What do you use?',
      opts: ['Cat 6 UTP, because it supports 1 Gbps', 'Multimode fibre, which is immune to electrical interference and easily covers 400 m', 'Cat 6a shielded copper with a repeater halfway', 'A wireless bridge, because copper cannot leave a building'],
      a: [1],
      why: 'Copper Ethernet dies at 100 m and picks up interference from motors. Fibre carries light, so it has no electrical noise problem and multimode comfortably reaches several hundred metres.' },

    { d: D.fund, lab: 'd29-tcp-udp',
      q: 'You are choosing a transport for a live voice call. Which one and why?',
      opts: ['TCP, so no audio is ever lost', 'UDP, because retransmitting a lost packet of speech arrives too late to be useful', 'TCP, because voice needs the window size for flow control', 'Either, since the application never notices the difference'],
      a: [1],
      why: 'In a real-time stream a packet that arrives late is useless — you would rather have a tiny gap than a delayed retransmission. UDP has no retransmission, no ordering and less overhead, which is exactly what voice wants.' },

    { d: D.fund, lab: 'd03-models',
      q: 'Two switches sit between a PC and its router. At which layer does each switch make its forwarding decision, and what does that mean for the PC\'s IP header?',
      opts: ['Layer 3 — each switch rewrites the destination IP', 'Layer 2 — the IP header is untouched while the MAC header is rewritten at each hop only by routers', 'Layer 2 — both the MAC and IP headers are rewritten at each switch', 'Layer 1 — switches only repeat bits'],
      a: [1],
      why: 'A switch reads the destination MAC and forwards; it does not touch the packet. Only routers rewrite the layer 2 header hop by hop, and even they leave the source and destination IP alone.' },

    { d: D.fund, lab: 'd32-ipv6',
      q: 'Your ISP hands you 2001:db8:ac10::/48 and you want a standard per-VLAN allocation. What size subnet do you assign to each VLAN?',
      opts: ['/48, one per VLAN', '/56, to leave room in each', '/64, the standard subnet size for a LAN', '/128, since IPv6 has no broadcast'],
      a: [2],
      why: 'IPv6 LANs are /64 by convention and because SLAAC requires a 64-bit interface ID. A /48 gives you 65,536 of those /64s to hand out.' },

    { d: D.fund, lab: 'd07-ipv4-addressing',
      q: 'A design proposes 172.32.5.0/24 for an internal-only subnet. What is wrong with it?',
      opts: ['Nothing — 172.x is always private', '172.32.x.x is outside the private range, which stops at 172.31.255.255', 'The /24 is too small for internal use', '172.32.5.0 is a reserved multicast address'],
      a: [1],
      why: 'RFC 1918 private space is 10.0.0.0/8, 172.16.0.0/12 (172.16–172.31) and 192.168.0.0/16. 172.32.x.x belongs to somebody on the internet, so using it internally will eventually break reachability to the real owner.' },

    { d: D.fund, lab: 'd50-architectures',
      q: 'A 40-person office is being cabled from scratch. Which topology should you propose?',
      opts: ['Collapsed core: access switches uplinked to a pair of distribution switches that also do routing', 'A full three-tier core/distribution/access design for growth', 'One large switch stack with no redundancy, to save money', 'Daisy-chain the access switches to save uplink ports'],
      a: [0],
      why: 'Three tiers only pay off in a large campus. At this size you collapse core and distribution into one redundant pair — you keep redundancy and a clean hierarchy without paying for a layer you will never fill. Daisy-chaining creates a chain of single points of failure.' },

    /* ---- 2.0 Network Access ---- */
    { d: D.access, lab: 'd16-vlans1',
      q: 'The office has staff PCs, guest Wi-Fi, IP phones and CCTV cameras on one flat network. Why separate them into VLANs?',
      opts: ['To increase the total bandwidth of the switch', 'To contain broadcasts and create boundaries you can police with ACLs between the groups', 'Because a switch can only learn 100 MAC addresses per VLAN', 'To allow the switch to route between them without a router'],
      a: [1],
      why: 'Each VLAN is its own broadcast domain, and since traffic between VLANs has to pass a routed hop you now have a place to apply policy. Bandwidth per port does not change.' },

    { d: D.access, lab: 'd17-vlans2',
      q: 'You are cabling a link between two switches that must carry VLANs 10, 20 and 30. What should the ports be, and why not leave DTP to sort it out?',
      opts: ['Access ports in VLAN 10 — the others will follow', 'Statically configured trunks with DTP disabled, so the link cannot be negotiated into something you did not intend', 'Dynamic desirable on both ends, since negotiation is faster than typing', 'Routed ports with IP addresses'],
      a: [1],
      why: 'Trunks carry many VLANs, so a trunk is required. Hard-coding it (<code>switchport mode trunk</code> plus <code>switchport nonegotiate</code>) makes the link deterministic and stops an attacker or a mistake from negotiating a trunk where you did not want one.' },

    { d: D.access, lab: 'd21-stp',
      q: 'You want the distribution switch — not whichever switch happens to have the lowest MAC — to be the spanning-tree root. What do you configure?',
      opts: ['A lower bridge priority on the distribution switch, e.g. <code>spanning-tree vlan 1 root primary</code>', 'A higher bridge priority on the distribution switch', 'PortFast on all distribution uplinks', 'Disable STP on every other switch'],
      a: [0],
      why: 'Root election picks the lowest bridge ID, which is priority first and MAC only as a tie-break. Lowering priority on the switch you want makes the choice deterministic instead of accidental.' },

    { d: D.access, lab: 'd21-rstp',
      q: 'Users complain that the network drops for around 30 seconds whenever a link fails. The switches are running classic 802.1D. What is the fix?',
      opts: ['Add more uplinks so there is no failure', 'Move to Rapid PVST+, which converges in a few seconds instead of going through listening and learning timers', 'Turn off spanning tree so nothing has to reconverge', 'Raise the STP hello timer'],
      a: [1],
      why: 'That 30-ish seconds is 15 s listening plus 15 s learning. RSTP replaces the timers with a proposal/agreement handshake and alternate ports that can be unblocked immediately. Turning STP off invites a loop that takes the whole network down.' },

    { d: D.access, lab: 'd22-etherchannel',
      q: 'Two switches are joined by a single 1 Gbps link that is saturated. You have three spare ports on each. What is the cleanest fix?',
      opts: ['Cable all four links and let STP load balance across them', 'Bundle the four links into an EtherChannel with LACP so STP sees one logical link', 'Put each link in a different VLAN', 'Configure the extra links as routed ports'],
      a: [1],
      why: 'STP does not load balance — it blocks the redundant links. An EtherChannel makes the group look like one interface to STP, so all four members forward and the bundle survives a member failure.' },

    { d: D.access, lab: 'd47-port-security',
      q: 'In a public lobby you want a wall port to serve exactly one device and shut itself down if somebody plugs in a hub or a second laptop. Which design do you pick?',
      opts: ['Port security, maximum 1, violation shutdown, with a sticky MAC address', 'A trunk port so you can see all VLANs', 'PortFast alone, which limits the port to one host', 'An extended ACL matching the laptop\'s MAC address'],
      a: [0],
      why: 'Port security counts source MAC addresses on an access port; maximum 1 plus shutdown err-disables the port on a second device, and sticky learning saves you from typing the MAC. ACLs match IP, not MAC, and PortFast has nothing to do with security.' },

    { d: D.access, lab: 'd53-wireless',
      q: 'A 30-AP office deployment needs central configuration, seamless roaming and one place to apply policy. What do you recommend?',
      opts: ['Autonomous APs, each configured individually', 'A WLC with lightweight APs joining it over CAPWAP', 'A mesh of consumer routers in bridge mode', 'One very powerful AP in the middle of the building'],
      a: [1],
      why: 'At 30 APs, configuring each one by hand does not scale and roaming between independent APs is poor. Lightweight APs tunnel to a controller over CAPWAP, so configuration, RF management and policy live in one place.' },

    { d: D.access, lab: 'd45-qos',
      q: 'Voice quality suffers during large file transfers across a congested WAN link. What is the correct approach?',
      opts: ['Increase the interface bandwidth command so the router sends faster', 'Classify and mark voice as EF and give it priority queuing ahead of bulk data', 'Shut down the file server during business hours', 'Turn on an ACL to drop all TCP traffic'],
      a: [1],
      why: 'QoS does not create bandwidth — it decides who waits. Voice is marked EF and put in a priority queue so it is not stuck behind a bulk transfer. The <code>bandwidth</code> command is only a routing-metric hint and changes nothing about how fast the line runs.' },

    /* ---- 3.0 IP Connectivity ---- */
    { d: D.ip, lab: 'd11-static-routing',
      q: 'A branch office has exactly one link to head office and no other path anywhere. What routing should you run on the branch router?',
      opts: ['OSPF, so the route is learned automatically', 'A default static route pointing at head office, with a matching route at the other end', 'EIGRP, because it converges fastest', 'BGP, since this is a WAN'],
      a: [1],
      why: 'There is only one way out, so there is nothing for a routing protocol to decide. A default static route is simpler, costs no CPU and cannot flap.' },

    { d: D.ip, lab: 'd24-dynamic-routing',
      q: 'A 12-router network is about to grow to 30, links change often, and you want fast reconvergence with a vendor-neutral protocol. What do you choose?',
      opts: ['Static routes, documented carefully', 'OSPF, a link-state IGP with areas and fast convergence', 'RIP, which is simplest to configure', 'BGP between every pair of routers'],
      a: [1],
      why: 'At that size, static routes become unmaintainable and RIP\'s hop count and slow timers do not scale. OSPF is the standards-based interior protocol the CCNA expects for this: link state, cost metric, areas for scale.' },

    { d: D.ip, lab: 'd27-ospf',
      q: 'Why place the backbone routers in OSPF area 0 and each branch in its own area rather than putting everything in area 0?',
      opts: ['Area 0 supports only 15 routers', 'Areas limit how far a topology change has to be flooded and shrink each router\'s SPF calculation', 'Only area 0 supports authentication', 'Routers in different areas do not need to know each other exists'],
      a: [1],
      why: 'Every router in an area holds an identical link-state database and reruns SPF on any change inside it. Splitting into areas means a flapping branch link does not force the entire network to recalculate.' },

    { d: D.ip, lab: 'd18-vlans3',
      q: 'A site has 8 VLANs on one switch and needs routing between them. The switch supports layer 3. Why prefer SVIs on the switch over router-on-a-stick?',
      opts: ['ROAS cannot support more than 4 VLANs', 'SVIs route in hardware on the switch instead of pushing all inter-VLAN traffic up and back down a single trunk', 'Subinterfaces require a separate licence', 'SVIs avoid the need for IP addresses on the VLANs'],
      a: [1],
      why: 'With ROAS every packet between two VLANs crosses the trunk twice, so the trunk is a bottleneck and a single point of failure. A layer 3 switch routes between its own SVIs at line rate.' },

    { d: D.ip, lab: 'd28-hsrp',
      q: 'Two routers serve a user VLAN. Hosts must keep working if either router dies, and you do not want to touch host configuration. What do you deploy?',
      opts: ['HSRP with a virtual IP that hosts use as their default gateway', 'A DHCP server that changes the gateway option when a router fails', 'Static routes on every PC', 'An EtherChannel between the two routers'],
      a: [0],
      why: 'A first-hop redundancy protocol gives the VLAN one virtual IP and virtual MAC owned by whichever router is active. Hosts point at the virtual IP and never notice a failover.' },

    { d: D.ip, lab: 'x6-ospf-hsrp',
      q: 'You run HSRP with R1 active, but R1\'s uplink to the core fails while its LAN port stays up. Traffic black-holes. What do you add to the design?',
      opts: ['A second HSRP group', 'Interface tracking, so R1 decrements its HSRP priority when the uplink goes down and R2 takes over', 'A lower hello timer', 'A static default route on the hosts'],
      a: [1],
      why: 'Without tracking, HSRP only watches its own LAN interface — it has no idea the uplink is gone. Tracking plus preemption lets the standby take over when the active router loses the path it is supposed to provide.' },

    { d: D.ip, lab: 'd11-static-routing',
      q: 'You want a backup path used only when the primary static route fails. How do you configure the backup?',
      opts: ['With the same administrative distance so both are installed', 'As a floating static route with a higher administrative distance than the primary', 'With a longer prefix so it wins longest-prefix match', 'By using a routing protocol instead'],
      a: [1],
      why: 'A floating static has a manually raised AD, so it stays out of the routing table while the better route exists and is installed the moment the primary is withdrawn.' },

    { d: D.ip, lab: 'd32-ipv6',
      q: 'A design asks you to run IPv4 and IPv6 side by side on the same interfaces during a migration. What is that called, and is it valid?',
      opts: ['Not valid — an interface has one address family at a time', 'Dual stack, and it is the standard migration approach', 'NAT64, which is the only supported option', 'Tunnelling, which is required on every link'],
      a: [1],
      why: 'Dual stack runs both protocols independently on the same interfaces, so hosts use whichever the destination supports. It is the simplest migration path when you control both ends.' },

    { d: D.ip, lab: 'd12-subnetting',
      q: 'Head office advertises 10.1.0.0/16 but you also have a more specific 10.1.7.0/24 route pointing down a branch link. Which does a packet to 10.1.7.9 follow, and can you use this deliberately?',
      opts: ['The /16, because it was configured first', 'The /24, because longest-prefix match always wins — and yes, this is how you pull specific traffic onto a different path', 'Neither — overlapping routes are rejected', 'Both, load balanced'],
      a: [1],
      why: 'Forwarding uses the most specific matching prefix regardless of AD or metric. Advertising a more specific route is a standard way to steer a slice of traffic.' },

    { d: D.ip, lab: 'd08-router-ints',
      q: 'Your design calls for a router interface that will be the gateway for 10.4.4.0/24. Which address is the sensible choice, and why does it matter which you pick?',
      opts: ['10.4.4.0 — the first address in the block', '10.4.4.1 or 10.4.4.254, kept consistent everywhere so people can guess the gateway', '10.4.4.255, the last address', 'Any address, chosen at random per subnet'],
      a: [1],
      why: 'Network and broadcast addresses cannot be assigned. Beyond that, consistency is the design point: if every gateway is .1, troubleshooting anywhere in the network starts from something you already know.' },

    /* ---- 4.0 IP Services ---- */
    { d: D.svc, lab: 'd38-dhcp',
      q: 'Clients sit in VLAN 20 while the DHCP server lives in the data centre, on the far side of a router. What do you configure?',
      opts: ['A DHCP pool on every switch', 'An <code>ip helper-address</code> on the VLAN 20 SVI pointing at the server, so broadcast DISCOVERs are relayed as unicast', 'Static IPs for all clients', 'A trunk between the clients and the server'],
      a: [1],
      why: 'DHCP DISCOVER is a broadcast and routers do not forward broadcasts. The relay turns it into a unicast to the server and stamps the gateway address so the server knows which pool to use.' },

    { d: D.svc, lab: 'd44-pat',
      q: 'A branch has 60 users and one public IP address from the ISP. What do you configure?',
      opts: ['Static NAT for each user', 'PAT (NAT overload), which multiplexes all inside hosts onto the single public address using port numbers', 'A dynamic NAT pool of 60 addresses', 'No NAT — give every user a public address'],
      a: [1],
      why: 'Static and dynamic NAT both need one public address per concurrent inside host. PAT tracks the source port as well as the address, so hundreds of hosts fit behind one public IP.' },

    { d: D.svc, lab: 'd36-ntp',
      q: 'Why is NTP a prerequisite before you take log correlation or certificate-based services seriously?',
      opts: ['Because syslog will not start without it', 'Because timestamps from different devices can only be lined up if all the clocks agree, and certificates are validated against time', 'Because NTP also distributes the device configuration', 'Because routing protocols require synchronised clocks'],
      a: [1],
      why: 'An incident spanning five devices is impossible to reconstruct if each has its own idea of the time, and certificate validity is a time window. NTP is unglamorous plumbing that everything else leans on.' },

    { d: D.svc, lab: 'd40-syslog',
      q: 'You want a permanent, searchable record of device events that survives a reboot. Where do you send logs and at what level?',
      opts: ['To the console only, at debugging level', 'To a central syslog server, at a level such as informational (6) that captures useful events without drowning you', 'To the buffer only, which survives reload', 'Disable logging to avoid CPU load'],
      a: [1],
      why: 'The local buffer is cleared on reload and console logging is lost the moment you disconnect. A syslog server keeps history off-box; the severity level is the dial between too little detail and unreadable noise.' },

    /* ---- 5.0 Security Fundamentals ---- */
    { d: D.sec, lab: 'd33-std-acl',
      q: 'You need to stop one subnet from reaching the server VLAN entirely. Where does a standard ACL belong, and why does that matter here?',
      opts: ['Close to the source, because standard ACLs only match the source address and would block that subnet from everything', 'Close to the destination, because a standard ACL matches only the source and would otherwise block that subnet from all destinations', 'It makes no difference where you place it', 'On the source hosts themselves'],
      a: [1],
      why: 'A standard ACL cannot see the destination. Placed near the source it blocks that subnet from everywhere, not just the servers — so it goes as close to the destination as possible. Extended ACLs, which can match both ends, go near the source.' },

    { d: D.sec, lab: 'd34-ext-acl',
      q: 'The requirement is "guests may browse the web but must not reach the internal 10.10.0.0/16 network". Which tool fits?',
      opts: ['A standard ACL on the guest interface', 'An extended ACL matching source guest subnet, destination 10.10.0.0/16, denied — then permit everything else', 'Port security on the guest ports', 'A separate VLAN, which is sufficient on its own'],
      a: [1],
      why: 'The rule names a source, a destination and an intent to allow other traffic, so you need an extended ACL. A VLAN alone separates broadcast domains but the router will happily route between them.' },

    { d: D.sec, lab: 'd41-ssh',
      q: 'You are writing the management-access standard for 200 devices. What do you mandate?',
      opts: ['Telnet with a strong password, since it is available everywhere', 'SSH version 2 only, with local or AAA accounts and Telnet disabled on the VTY lines', 'Console access only, no remote management', 'SSH with a shared account whose password is in the runbook'],
      a: [1],
      why: 'Telnet sends credentials in clear text on the wire. SSHv2 encrypts the session; per-user accounts (ideally centralised with AAA) give you accountability that a shared login destroys.' },

    { d: D.sec, lab: 'd48-dhcp-snooping',
      q: 'Somebody plugged a home router into a wall port and it started handing out addresses. Which feature prevents a repeat, and how do you apply it?',
      opts: ['Port security with maximum 1', 'DHCP snooping, with uplinks towards the real server trusted and all access ports untrusted', 'An extended ACL blocking UDP 67', 'STP BPDU guard'],
      a: [1],
      why: 'DHCP snooping drops server-sourced messages (OFFER/ACK) arriving on untrusted ports, so a rogue server on an access port is silenced while the legitimate one on a trusted uplink keeps working.' },

    { d: D.sec, lab: 'd49-dai',
      q: 'You are hardening a VLAN against a man-in-the-middle who forges ARP replies claiming to be the gateway. What do you enable, and what does it depend on?',
      opts: ['Port security, which validates ARP', 'Dynamic ARP Inspection, which checks ARP against the DHCP snooping binding table — so DHCP snooping must be enabled first', 'An ACL permitting only the gateway MAC', 'BPDU guard on the access ports'],
      a: [1],
      why: 'DAI intercepts ARP on untrusted ports and verifies the IP-to-MAC pair against the bindings DHCP snooping learned. Without snooping there is no table to check against.' },

    { d: D.sec, lab: 'd46-security-fundamentals',
      q: 'A policy demands that every administrator log in with their own identity, and that access be revocable centrally on the day someone leaves. What do you design?',
      opts: ['One shared enable secret, rotated quarterly', 'AAA with a central server (RADIUS or TACACS+) for authentication, authorisation and accounting, with a local account as fallback', 'Local accounts on each of the 200 devices', 'SSH keys stored on each device'],
      a: [1],
      why: 'Central AAA gives per-user identity, a single place to disable an account, and an accounting trail of what was typed. The local fallback account is what saves you when the AAA server is unreachable.' },

    /* ---- 6.0 Automation & Programmability ---- */
    { d: D.auto, lab: 'd57-automation',
      q: 'You have to push the same VLAN change to 200 switches tonight. What is the argument for automation over an evening of copy-paste?',
      opts: ['Automation is always faster to write than to type once', 'A single reviewed, version-controlled definition is applied identically everywhere, so mistakes are caught once instead of repeated 200 times', 'It removes the need to understand the configuration', 'CLI configuration is deprecated on modern IOS'],
      a: [1],
      why: 'The value is consistency and reviewability, not raw speed. The change becomes an artefact you can diff, review and roll back — which is precisely what hand-typing 200 times cannot give you.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'Your tooling needs to read interface counters from routers every minute and store them. Which interface should you build against?',
      opts: ['Screen-scraping <code>show</code> output over Telnet', 'RESTCONF or NETCONF, which return structured data modelled in YANG', 'SNMP traps sent by the device', 'The console port'],
      a: [1],
      why: 'Scraping breaks whenever output formatting changes. RESTCONF/NETCONF return structured JSON or XML against a YANG model, so a field you ask for is a field you can parse reliably.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'A team is choosing between Ansible and a controller-based (SDN) approach for a 40-device campus. What genuinely distinguishes them?',
      opts: ['Ansible needs an agent on every device, SDN does not', 'Ansible pushes configuration from outside using existing protocols; a controller owns the network state continuously and devices take their policy from it', 'Only SDN can configure Cisco devices', 'They are the same thing under different names'],
      a: [1],
      why: 'Ansible is agentless configuration management — it connects, applies, and leaves. A controller holds the intended state and keeps the devices aligned to it, which is a different operating model, not just different software.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'Why do automation tools exchange JSON rather than the text a human reads on the CLI?',
      opts: ['JSON compresses better on the wire', 'JSON has an explicit structure of keys, values, lists and types, so a program can address a field without guessing at column positions', 'JSON is encrypted by default', 'The CLI cannot produce output for scripts at all'],
      a: [1],
      why: 'CLI output is laid out for eyes. JSON (and XML) name their fields, so code asks for <code>ietf-interfaces:interface</code> rather than "the fourth column, when the line does not wrap".' },
  ],
});

/* ============================================================= */
X({
  id: 'ex4', short: 'Exam 4', name: 'Exam 4 — Troubleshooting', minutes: 50, pass: 82,
  blurb: 'Something is broken in every question. You are given the symptom and the evidence, and you have to name the cause — the exact skill the exam\'s sim questions and your first helpdesk ticket both test.',
  qs: [
    /* ---- 1.0 Network Fundamentals ---- */
    { d: D.fund, lab: 'd09-switch-ints',
      q: 'A link between SW1 and SW2 is up but throughput is terrible and the interface counters climb steadily.<pre>SW1# show interfaces fa0/24\n  Full-duplex, 100Mb/s\n     213 input errors, 0 CRC, 0 frame, 0 overrun\n     1842 late collision, 0 deferred</pre>What is the cause?',
      opts: ['A failing cable', 'A duplex mismatch — one end is full-duplex, the other half', 'The port is oversubscribed', 'A broadcast storm from a loop'],
      a: [1],
      why: 'Late collisions on a full-duplex port are the signature of a duplex mismatch: the far end is running half-duplex and still listening for collisions. Fix by matching both ends, or by letting both autonegotiate.' },

    { d: D.fund, lab: 'd07-ipv4-addressing',
      q: 'PC1 is 10.0.5.70/26 with gateway 10.0.5.1. It cannot reach the gateway although the cabling and VLAN are correct. Why?',
      opts: ['The gateway must always be the last address in the subnet', '10.0.5.70/26 is in the 10.0.5.64–10.0.5.127 subnet, but 10.0.5.1 is in 10.0.5.0/26 — the gateway is not on PC1\'s subnet', 'A /26 does not allow a default gateway', 'The PC needs a DNS server before it can ping'],
      a: [1],
      why: 'With a /26 the blocks are .0, .64, .128, .192. PC1 lives in the second block, so it considers .1 to be remote, tries to send via its gateway — which is the very address it cannot reach. Classic mask mistake.' },

    { d: D.fund, lab: 'd10-life-of-packet',
      q: 'PC1 can ping its own gateway and other hosts in its VLAN, but nothing beyond. The router can ping everything. What do you check first?',
      opts: ['The switch MAC address table', 'Whether the router has a route back to PC1\'s subnet and whether PC1 has the correct default gateway/mask', 'Whether PC1\'s NIC is half-duplex', 'The spanning-tree root'],
      a: [1],
      why: 'Local traffic working proves layer 1, 2 and the VLAN are fine. The failure is at the routed hop, so the two candidates are PC1\'s own gateway/mask settings and the return path on the router — reachability always has two directions.' },

    { d: D.fund, lab: 'd12-subnetting',
      q: 'Two subnets, 192.168.1.0/24 and 192.168.1.128/25, are configured on different interfaces of the same router. The router rejects the second one. Why?',
      opts: ['A router cannot have two interfaces in the 192.168.1.x range', 'The /25 overlaps address space already covered by the /24 on another interface', 'The second interface needs <code>no shutdown</code> first', 'Private addresses may only appear once in a network'],
      a: [1],
      why: '192.168.1.128/25 is a subset of 192.168.1.0/24. A router will not install overlapping connected subnets on two interfaces because it would have no way to decide which one owns an address.' },

    { d: D.fund, lab: 'd29-tcp-udp',
      q: 'A user can ping a web server by IP but the browser times out on port 443. What does that narrow the problem down to?',
      opts: ['A routing problem between the two subnets', 'Layer 3 reachability is fine, so suspect the service, a firewall or an ACL filtering TCP 443', 'A duplex mismatch on the server switch port', 'An ARP failure'],
      a: [1],
      why: 'ICMP succeeding proves the path and both address configurations. Anything that breaks only one port is above layer 3: the listener is down, or something is filtering that port.' },

    { d: D.fund, lab: 'd01-devices-cables',
      q: 'A newly cabled access port shows down/down. The PC\'s NIC light is off. Where do you look?',
      opts: ['Spanning tree, which is blocking the port', 'Layer 1: the cable, the patch panel port, the wall port, or a dead NIC — down/down means no electrical link at all', 'The VLAN assignment on the switch port', 'The default gateway on the PC'],
      a: [1],
      why: 'Status down and protocol down is the physical layer saying "nothing is there". VLAN and STP problems still show up/up, and a shut port reports administratively down.' },

    { d: D.fund, lab: 'd32-ipv6',
      q: 'An IPv6 host has only an address beginning fe80:: and cannot reach anything off-link. What is the situation?',
      opts: ['The host is fine; link-local is all that is needed', 'It only has a link-local address — there is no global or unique-local address, so off-link traffic has no usable source', 'fe80:: is a multicast address and must be removed', 'IPv6 requires DHCP, which has failed'],
      a: [1],
      why: 'Link-local addresses are generated automatically and never routed off the link. The host needs a global address from SLAAC, DHCPv6 or static configuration — so check that the router is sending RAs.' },

    { d: D.fund, lab: 'd03-models',
      q: 'Following a structured troubleshooting method, a user reports "the internet is down". Which first step gives you the most information for the least effort?',
      opts: ['Reload the access switch', 'Establish what exactly fails — one site or all, one app or all, by name or by IP — so you can pick the layer to start at', 'Start a packet capture on the WAN link', 'Replace the user\'s patch cable'],
      a: [1],
      why: 'Scoping the symptom halves the problem space before you touch anything. "By name fails, by IP works" is DNS; "one app fails" is above layer 3; "everything for everyone" is the WAN or routing.' },

    /* ---- 2.0 Network Access ---- */
    { d: D.access, lab: 'd17-vlans2',
      q: 'VLAN 30 works between SW1 and SW2, but VLAN 40 does not.<pre>SW1# show interfaces trunk\nPort      Vlans allowed on trunk\nGi0/1     1,10,20,30</pre>What is wrong?',
      opts: ['VLAN 40 does not exist on SW1', 'VLAN 40 is not in the trunk\'s allowed list, so its frames are never carried across the link', 'The native VLAN is mismatched', 'The trunk is running ISL instead of 802.1Q'],
      a: [1],
      why: 'An allowed-VLAN list is an explicit filter. Anything not listed is dropped on that trunk, which is why one VLAN can fail while the rest work perfectly on the same cable.' },

    { d: D.access, lab: 'd17-vlans2',
      q: 'Both switches log "native VLAN mismatch" on a trunk and untagged traffic ends up in the wrong VLAN. What is happening?',
      opts: ['One end has a different native VLAN, so untagged frames are placed in different VLANs at each end', 'The trunk is misconfigured as an access port', 'DTP has failed to negotiate', 'The VLANs have different names'],
      a: [0],
      why: 'Native-VLAN frames cross the trunk untagged. If SW1 calls native VLAN 1 and SW2 calls it VLAN 99, each end files those frames under its own native VLAN — merging two broadcast domains by accident.' },

    { d: D.access, lab: 'd47-port-security',
      q: 'A port has gone dark after a user swapped laptops.<pre>SW1# show interfaces fa0/5\nFastEthernet0/5 is down, line protocol is down (err-disabled)</pre>What happened, and how do you recover it?',
      opts: ['The cable failed; replace it', 'A port-security violation err-disabled the port — clear the condition, then <code>shutdown</code> followed by <code>no shutdown</code>', 'STP put the port in blocking', 'The port needs to be converted to a trunk'],
      a: [1],
      why: 'err-disabled is the switch disabling the port itself after a violation. The port stays down until an administrator bounces it (or errdisable recovery times out), which is the whole point of the shutdown violation mode.' },

    { d: D.access, lab: 'd21-stp',
      q: 'A whole floor of the network is unusable: CPU is pinned on the switches, port LEDs are flashing in unison and MAC addresses keep moving between ports. What is the cause?',
      opts: ['A broadcast storm from a layer 2 loop with spanning tree failing to block a redundant path', 'A DHCP server outage', 'An ACL denying all traffic', 'A duplex mismatch on one uplink'],
      a: [0],
      why: 'Frames have no TTL at layer 2, so a loop multiplies broadcasts until the switches drown. MAC flapping — the same address learned on several ports — is the fingerprint. Find the unblocked redundant link or the rogue cable.' },

    { d: D.access, lab: 'd21-stp',
      q: 'A PC takes about 30 seconds after boot before DHCP works, while a PC on another switch is instant. What is the difference?',
      opts: ['The slow PC has a smaller MTU', 'The fast PC\'s port has PortFast enabled, so it skips listening and learning and forwards immediately', 'The slow switch is running RSTP', 'The slow PC is on a trunk port'],
      a: [1],
      why: 'Without PortFast, an access port walks through listening and learning before forwarding — long enough for the PC\'s DHCP attempts to fail. PortFast is safe on host ports and should be paired with BPDU guard.' },

    { d: D.access, lab: 'd22-etherchannel',
      q: 'You bundled four ports but only one member came up.<pre>SW1# show etherchannel summary\nPo1(SU)   LACP   Gi0/1(P) Gi0/2(s) Gi0/3(s) Gi0/4(s)</pre>What normally causes members to be suspended?',
      opts: ['The far end has fewer physical ports', 'Inconsistent settings — speed, duplex, mode, allowed VLANs or access/trunk mode differ between members or between ends', 'LACP only ever bundles two links', 'The Port-channel needs an IP address'],
      a: [1],
      why: 'Every member must be identically configured on both ends. A mismatch in speed, duplex, trunk mode, native VLAN or allowed VLANs suspends the offending member rather than forming a broken bundle.' },

    { d: D.access, lab: 'd16-vlans1',
      q: 'A PC plugged into Fa0/8 gets no DHCP address. The port is up/up.<pre>SW1# show vlan brief\n10   STAFF    active    Fa0/1, Fa0/2\n99   PARKING  active    Fa0/8</pre>What is wrong?',
      opts: ['The PC needs a static IP', 'Fa0/8 is in VLAN 99, not the staff VLAN 10 where the DHCP relay and gateway live', 'VLAN 99 is shut down', 'The switch needs a default gateway to relay DHCP'],
      a: [1],
      why: 'Up/up means the physical port is fine; the PC is simply in the wrong broadcast domain. Its DHCP broadcast reaches only VLAN 99, where nothing answers.' },

    { d: D.access, lab: 'd19-dtp-vtp',
      q: 'Two switches are cabled together, both ports show <code>dynamic auto</code>, and VLANs are not passing between them. Why?',
      opts: ['DTP is disabled by default', 'Two auto ports never form a trunk — neither side initiates, so the link stays an access port', 'Auto mode requires VTP to be configured', 'The cable must be a crossover'],
      a: [1],
      why: 'Dynamic auto waits to be asked. Two waiters agree on access mode. One side must be desirable or trunk — or, better, both sides hard-coded as trunks.' },

    /* ---- 3.0 IP Connectivity ---- */
    { d: D.ip, lab: 'd27-ospf',
      q: 'Two directly connected routers never form an OSPF adjacency, though they can ping each other.<pre>R1: hello 10, dead 40, area 0, 10.0.0.1/30\nR2: hello 30, dead 120, area 0, 10.0.0.2/30</pre>What is the cause?',
      opts: ['The /30 is too small for OSPF', 'Mismatched hello and dead intervals — these must match for neighbours to form', 'They need different areas', 'OSPF cannot run over a point-to-point link'],
      a: [1],
      why: 'Hello/dead timers, area ID, subnet, authentication and MTU must all agree. Mismatched timers mean each router discards the other\'s hellos, so the adjacency never leaves the initial state.' },

    { d: D.ip, lab: 'd27-ospf',
      q: 'R1 has an OSPF neighbour stuck in EXSTART/EXCHANGE. Pings work, timers and areas match. What is the classic culprit?',
      opts: ['An MTU mismatch between the two interfaces', 'A missing default route', 'Duplicate router IDs on unrelated routers', 'A passive-interface on the link'],
      a: [0],
      why: 'EXSTART/EXCHANGE is where database description packets are exchanged, and OSPF checks MTU there. Unequal MTUs leave the neighbours stuck at that stage even though everything else looks healthy.' },

    { d: D.ip, lab: 'd11-static-routing',
      q: 'You added <code>ip route 10.0.9.0 255.255.255.0 10.0.0.2</code> but the route is missing from <code>show ip route</code>. Why?',
      opts: ['Static routes do not appear in the routing table', 'The next hop 10.0.0.2 is not reachable through a connected route, so the static route cannot be installed', 'The mask must be written in prefix notation', 'You must also run a routing protocol'],
      a: [1],
      why: 'A static route is only installed if its next hop is resolvable. If the interface towards 10.0.0.2 is down or wrongly addressed, the route is silently withheld.' },

    { d: D.ip, lab: 'd18-vlans3',
      q: 'Router-on-a-stick: VLAN 10 hosts reach their gateway but VLAN 20 hosts do not, and the subinterfaces both have addresses. What do you check?',
      opts: ['Whether G0/0.20 has <code>encapsulation dot1Q 20</code> and whether VLAN 20 is allowed on the trunk to the router', 'Whether the router has enough memory', 'Whether the physical interface has an IP address', 'Whether VLAN 20 hosts have DNS configured'],
      a: [0],
      why: 'Each subinterface must be tagged with the right VLAN ID, and the switch trunk must carry that VLAN. Either a missing/wrong dot1Q tag or an allowed-VLAN list is the usual cause when exactly one VLAN fails.' },

    { d: D.ip, lab: 'd28-hsrp',
      q: 'Both HSRP routers claim to be Active for the same group. What has gone wrong?',
      opts: ['Preemption is disabled', 'They are not seeing each other\'s hellos — the VLAN, the group number or the subnet between them is broken', 'The virtual IP is wrong on one router', 'The priorities are identical'],
      a: [1],
      why: 'Two Actives means the peers are isolated: each elects itself. Check that both are in the same VLAN and subnet, use the same group number, and are not blocked by an ACL or a trunk filter.' },

    { d: D.ip, lab: 'd11-static-routing',
      q: 'A traceroute from a branch dies after the first hop with repeated timeouts, but the branch router can ping the far-end server itself. What does that suggest?',
      opts: ['The server is down', 'There is no return route to the branch client subnet, while the router\'s own interface subnet is advertised', 'The traceroute command is unsupported', 'DNS is failing'],
      a: [1],
      why: 'The router sourcing traffic from its own advertised interface succeeds while the client subnet fails — a textbook missing return route. Reachability is always two-way; test from the client source, not just from the router.' },

    { d: D.ip, lab: 'd24-dynamic-routing',
      q: 'A route that used to work has vanished from the table after a second path was configured. <code>show ip route</code> shows the prefix learned via a protocol with a lower AD than before. What happened?',
      opts: ['The routing table is corrupt', 'A lower-AD source for the same prefix replaced the previous one — if that source points the wrong way, traffic follows the wrong path', 'Both routes are still installed and used', 'The higher-AD route is preferred when it is more specific'],
      a: [1],
      why: 'For an identical prefix, the lowest AD wins outright and the other source is not installed. Adding a static route on top of a working IGP is a common way to silently redirect traffic.' },

    { d: D.ip, lab: 'd08-router-ints',
      q: 'An interface reads "up / line protocol down". What class of problem is that?',
      opts: ['The cable is unplugged', 'Layer 1 is fine but layer 2 is not — keepalive, encapsulation or clocking mismatch with the far end', 'The interface is shut', 'The IP address is wrong'],
      a: [1],
      why: 'The first word is layer 1 and the second is layer 2. Up/down means signal is present but the two ends do not agree on how to frame it. A wrong IP address would still show up/up.' },

    { d: D.ip, lab: 'x6-ospf-hsrp',
      q: 'After an OSPF change, traffic to one subnet loops between two routers until TTL expires. What is the most likely cause?',
      opts: ['A duplex mismatch', 'Each router has a route pointing at the other — e.g. a static or default route that contradicts what OSPF is advertising', 'The subnet mask is too long', 'HSRP preemption is enabled'],
      a: [1],
      why: 'A routing loop means two devices each believe the other is closer to the destination. Mixing a manual static route with a dynamic protocol, or redistributing carelessly, is the usual way to create one.' },

    { d: D.ip, lab: 'd12-subnetting',
      q: 'Half the hosts in a /24 can reach the internet and half cannot. The working ones are .1 to .126. What do you suspect?',
      opts: ['A DHCP scope exhaustion', 'Some hosts have a /25 mask while the subnet is actually a /24, so they treat the upper half as remote', 'The gateway is overloaded', 'An ACL is rate limiting'],
      a: [1],
      why: 'A split exactly at the subnet boundary points at a mask mismatch, not a capacity problem. Hosts with the wrong mask compute a different network and send local traffic to the gateway — or refuse to send it at all.' },

    /* ---- 4.0 IP Services ---- */
    { d: D.svc, lab: 'd38-dhcp',
      q: 'Clients in one VLAN get 169.254.x.x addresses while other VLANs are fine. The DHCP server is centrally located. What is missing?',
      opts: ['A DHCP pool on the client PCs', 'The <code>ip helper-address</code> on that VLAN\'s SVI or subinterface', 'A static route on the clients', 'More address space in the server\'s pool'],
      a: [1],
      why: '169.254.x.x is APIPA — the client gave up on DHCP. Other VLANs working means the server is alive, so the broadcast from this VLAN is simply never being relayed.' },

    { d: D.svc, lab: 'd37-dns',
      q: 'A user reports that <code>ping server1.corp.local</code> fails but <code>ping 10.0.20.15</code> works. Which layer is the problem in?',
      opts: ['Routing — the path to the name differs from the path to the IP', 'Name resolution — the network path is proven good, so DNS or the host file is the fault', 'The server is refusing ICMP by name', 'ARP is failing for the hostname'],
      a: [1],
      why: 'Same destination, one works by address, one does not by name. That isolates the fault to resolution: the wrong DNS server, no DNS server configured, or a missing record.' },

    { d: D.svc, lab: 'd44-pat',
      q: 'Inside hosts cannot reach the internet through a NAT router.<pre>R1# show ip nat translations\n(empty)</pre>The ACL and pool look right. What do you check next?',
      opts: ['Whether <code>ip nat inside</code> and <code>ip nat outside</code> are applied to the correct interfaces', 'Whether the hosts have DNS', 'Whether the pool has enough addresses', 'Whether the ISP allows ICMP'],
      a: [0],
      why: 'With no translations at all, NAT is not even being attempted. The most common cause is the inside/outside designation missing from an interface or applied to the wrong one — NAT only acts on traffic crossing that boundary.' },

    { d: D.svc, lab: 'd36-ntp',
      q: 'Logs from three devices about one incident cannot be correlated — the timestamps are minutes apart, and one device shows a date in 1993. What is the fix?',
      opts: ['Increase the logging severity level', 'Point all devices at the same NTP server and verify synchronisation', 'Log to the buffer instead of a server', 'Reload the devices'],
      a: [1],
      why: 'A 1993 date is a device that has never had its clock set. Without common time, per-device logs cannot be lined up into one story — NTP is a prerequisite for useful logging.' },

    /* ---- 5.0 Security Fundamentals ---- */
    { d: D.sec, lab: 'd33-std-acl',
      q: 'An ACL is applied but everything is being dropped, including traffic you meant to allow.<pre>access-list 10 deny 10.0.5.0 0.0.0.255\n(end of list)</pre>Why?',
      opts: ['Standard ACLs cannot be applied inbound', 'The implicit <code>deny any</code> at the end of every ACL drops everything not explicitly permitted — there is no permit statement', 'The wildcard mask should be 255.255.255.0', 'The ACL number is out of range'],
      a: [1],
      why: 'Every ACL ends with an invisible deny any. A list that only denies therefore denies everything; you must add an explicit <code>permit any</code> for the traffic you still want.' },

    { d: D.sec, lab: 'd34-ext-acl',
      q: 'An extended ACL permits HTTP to a server but users still cannot browse it. The permit line sits below a broader <code>deny ip any 10.0.0.0 0.0.255.255</code>. What is wrong?',
      opts: ['Extended ACLs do not support HTTP', 'ACLs are processed top down and stop at the first match — the deny is hit before the permit is reached', 'The permit needs to specify a wildcard of 0.0.0.0', 'The ACL must be applied outbound'],
      a: [1],
      why: 'Order is everything. Once a packet matches a line, processing stops. Specific permits must be placed above broader denies.' },

    { d: D.sec, lab: 'd41-ssh',
      q: 'SSH to a switch is refused although <code>transport input ssh</code> is set on the VTY lines and an account exists. What is typically missing?',
      opts: ['A domain name and an RSA key pair — SSH cannot start without <code>crypto key generate rsa</code>', 'A default gateway on the PC', 'An access-class ACL', 'The <code>enable secret</code>'],
      a: [0],
      why: 'SSH needs a key pair, and generating one needs a hostname and an <code>ip domain-name</code>. Without the key the daemon never starts, so the connection is refused regardless of the line configuration.' },

    { d: D.sec, lab: 'd48-dhcp-snooping',
      q: 'After enabling DHCP snooping, all clients stop getting addresses. What went wrong?',
      opts: ['Snooping requires static addressing', 'The uplink towards the legitimate DHCP server was left untrusted, so the server\'s OFFER and ACK are being dropped', 'The clients need <code>ip helper-address</code> removed', 'Snooping cannot coexist with a relay'],
      a: [1],
      why: 'Untrusted ports drop server-sourced DHCP messages. The port facing the real server (or the relay path) must be explicitly trusted, or snooping silences your own infrastructure.' },

    { d: D.sec, lab: 'd47-port-security',
      q: 'A port with sticky port security stopped working after the running configuration was reloaded without being saved. Why?',
      opts: ['Sticky addresses are stored in the running configuration — unless it was saved, the learned MAC is lost and relearned, which can conflict with an existing static entry', 'Sticky learning expires after 24 hours', 'Port security must be reapplied after every reload by design', 'Sticky MACs are stored in the VLAN database'],
      a: [0],
      why: 'Sticky converts a dynamically learned MAC into a running-config line. If you never write it to startup-config, the entry disappears on reload — one of the most common port-security surprises.' },

    { d: D.sec, lab: 'd46-security-fundamentals',
      q: 'Everybody logs into the routers with the same shared account. An unauthorised change is made overnight. What does the security design fail to provide?',
      opts: ['Confidentiality of the session', 'Accountability — with no per-user identity there is no way to attribute the change, which is what AAA accounting exists for', 'Integrity of the configuration file', 'Availability of the management plane'],
      a: [1],
      why: 'Shared credentials break the audit trail: the logs can tell you what was typed, but not who. Per-user accounts through AAA restore attribution.' },

    /* ---- 6.0 Automation & Programmability ---- */
    { d: D.auto, lab: 'd57-automation',
      q: 'A RESTCONF request to a router returns 401. What is the problem?',
      opts: ['The URL path is wrong', 'Authentication failed — credentials are missing or incorrect', 'The device does not support RESTCONF', 'The JSON body is malformed'],
      a: [1],
      why: '401 is unauthorised. 404 would be a wrong path, 400 a malformed body and 405 a method the resource does not support — reading the status code tells you which layer to look at.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'An automation script configured 50 switches correctly and 3 incorrectly. All 53 got the same playbook. Where do you look first?',
      opts: ['At the script, which must be non-deterministic', 'At what makes those 3 different — different platform, IOS version, interface naming or pre-existing configuration', 'At the network cabling', 'At the syslog severity level'],
      a: [1],
      why: 'The same input producing different output means the inputs were not actually the same. Automation exposes device inconsistency ruthlessly: a model with Gi0/1 instead of Fa0/1 will fail a template built for the majority.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'Why does "it works when I type it but fails from the API" often come down to configuration mode?',
      opts: ['The API cannot enter configuration mode at all', 'The API applies a structured change to a data model rather than replaying keystrokes, so ordering and dependencies the CLI let you fix interactively must all be correct up front', 'APIs run at a lower privilege level than the console', 'The API only supports show commands'],
      a: [1],
      why: 'Typing is forgiving: you see an error and correct it. A model-driven change is validated as a whole, so a dependency you would have fixed on the next line has to be right in the payload.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'A team\'s device configurations have drifted from what is in their repository. What practice prevents that?',
      opts: ['Back up the configurations more often', 'Treat the repository as the source of truth and apply it regularly, so an out-of-band change is overwritten or flagged rather than silently accumulating', 'Disable console access', 'Increase the syslog buffer'],
      a: [1],
      why: 'Backups record drift; they do not prevent it. Re-applying the intended state (or at least diffing against it on a schedule) is what keeps reality and the repository in agreement.' },
  ],
});

/* ============================================================= */
X({
  id: 'ex5', short: 'Exam 5', name: 'Exam 5 — Full mock', minutes: 60, pass: 85,
  blurb: 'The hardest of the five and the one to save for last: a full-blueprint mock with exam-weight questions, multi-answer items and scenarios that combine two topics. Treat a pass here as a signal that you are ready to book the real thing.',
  qs: [
    /* ---- 1.0 Network Fundamentals ---- */
    { d: D.fund, lab: 'd12-subnetting',
      q: 'A host is configured as 172.16.140.200/21. What is the network address and the last usable host address of its subnet?',
      opts: ['172.16.140.0 and 172.16.140.254', '172.16.136.0 and 172.16.143.254', '172.16.128.0 and 172.16.135.254', '172.16.140.0 and 172.16.147.254'],
      a: [1],
      why: 'A /21 has a block size of 8 in the third octet: 136, 144, 152… 140 falls in the 136 block, so the network is 172.16.136.0, the broadcast is 172.16.143.255 and the last host is 172.16.143.254.' },

    { d: D.fund, lab: 'd10-life-of-packet',
      q: 'PC1 sends a packet to a server three routers away. Which two things are true as it crosses the network? (Choose two.)',
      opts: ['The source and destination IP addresses stay the same end to end', 'The source and destination MAC addresses are rewritten at every routed hop', 'The destination IP is rewritten at each router', 'The TTL is incremented at each hop'],
      a: [0, 1],
      why: 'Layer 3 addressing is end to end; layer 2 addressing is hop by hop, so the frame is rebuilt at each router. TTL is decremented, not incremented — and a router discards the packet when it reaches zero.' },

    { d: D.fund, lab: 'd29-tcp-udp',
      q: 'Which sequence correctly describes the start of a TCP connection?',
      opts: ['SYN, SYN-ACK, ACK', 'SYN, ACK, SYN-ACK', 'DISCOVER, OFFER, REQUEST', 'HELLO, 2-WAY, FULL'],
      a: [0],
      why: 'The three-way handshake is SYN from the client, SYN-ACK from the server, ACK from the client. DISCOVER/OFFER/REQUEST is DHCP, and 2-WAY/FULL are OSPF neighbour states — do not mix the three up under exam pressure.' },

    { d: D.fund, lab: 'd32-ipv6',
      q: 'Which of these is the correctly compressed form of 2001:0db8:0000:0000:00a4:0000:0000:1e3f?',
      opts: ['2001:db8::a4::1e3f', '2001:db8:0:0:a4::1e3f', '2001:db8::a4:0:0:1e3f', '2001:db8:0:0:a4:0:0:1e3f is already minimal'],
      a: [2],
      why: 'Leading zeros in a hextet are dropped and one run of all-zero hextets may be replaced by ::. You cannot use :: twice, which rules out the first option, and the remaining zero hextets must be written out.' },

    { d: D.fund, lab: 'd07-ipv4-addressing',
      q: 'Which address can be assigned to a host in 10.16.32.0/20?',
      opts: ['10.16.32.0', '10.16.47.255', '10.16.45.200', '10.16.48.1'],
      a: [2],
      why: 'A /20 has a block size of 16 in the third octet, so this subnet runs 10.16.32.0 through 10.16.47.255. The first is the network address, the second the broadcast and the fourth is in the next subnet.' },

    { d: D.fund, lab: 'd01-devices-cables',
      q: 'Which two statements about switches and routers are true? (Choose two.)',
      opts: ['Every port on a router is its own broadcast domain', 'Every port on a switch is its own broadcast domain by default', 'Every port on a switch is its own collision domain', 'A switch forwards based on the destination IP address'],
      a: [0, 2],
      why: 'Routers separate broadcast domains; switches separate collision domains but keep one broadcast domain per VLAN. Switching is a MAC-address decision, not an IP one.' },

    { d: D.fund, lab: 'd50-architectures',
      q: 'What best describes the difference between a public cloud service and an on-premises deployment from a networking point of view?',
      opts: ['Cloud removes the need for routing and addressing design', 'The provider owns the infrastructure and you consume it over a WAN link, which makes bandwidth, latency and internet dependency part of your design', 'Cloud services cannot be reached over a private WAN', 'On-premises deployments cannot scale'],
      a: [1],
      why: 'Moving a workload to the cloud does not remove networking — it moves the dependency onto the path to the provider, which is why WAN capacity, redundancy and latency become first-class design concerns.' },

    { d: D.fund, lab: 'd03-models',
      q: 'At which OSI layer does a frame\'s FCS field operate, and what is it for?',
      opts: ['Layer 3 — it carries the checksum for the IP header', 'Layer 2 — it lets the receiver detect that the frame was corrupted in transit', 'Layer 4 — it acknowledges received segments', 'Layer 1 — it encodes bits onto the wire'],
      a: [1],
      why: 'The frame check sequence is the trailer of a layer 2 frame. A failed FCS increments the CRC error counter and the frame is dropped — which is exactly what you look for when chasing a bad cable.' },

    /* ---- 2.0 Network Access ---- */
    { d: D.access, lab: 'd17-vlans2',
      q: 'Which two are true of an 802.1Q trunk? (Choose two.)',
      opts: ['Frames in the native VLAN are sent untagged', 'Every frame is tagged, including the native VLAN', 'The allowed VLAN list filters which VLANs cross the link', 'A trunk can carry only VLANs that exist on both switches\' VLAN databases automatically'],
      a: [0, 2],
      why: 'The native VLAN is the one exception to tagging, and the allowed list is an explicit filter. A VLAN still has to be created on each switch — a trunk does not create it for you.' },

    { d: D.access, lab: 'd21-stp',
      q: 'How does spanning tree elect the root bridge?',
      opts: ['The switch with the highest MAC address wins', 'The lowest bridge ID wins, which is priority first and MAC address only as a tie-break', 'The switch with the most ports wins', 'The first switch powered on wins permanently'],
      a: [1],
      why: 'Bridge ID is priority (default 32768 plus the VLAN ID) followed by the MAC. Because the default priority is identical everywhere, an unconfigured network elects the oldest switch — usually the worst choice.' },

    { d: D.access, lab: 'd21-rstp',
      q: 'In RSTP, what is an alternate port?',
      opts: ['A port that is forwarding a backup VLAN', 'A discarding port that holds the best backup path to the root and can be unblocked almost immediately', 'A port connected to a host', 'A port in the listening state'],
      a: [1],
      why: 'RSTP pre-computes the backup: the alternate port already knows it is the next best path to the root, so on failure it transitions to forwarding without waiting out timers.' },

    { d: D.access, lab: 'd22-etherchannel',
      q: 'Which pair of settings will successfully form an LACP EtherChannel?',
      opts: ['active and active', 'passive and passive', 'desirable and active', 'on and active'],
      a: [0],
      why: 'Active/active and active/passive form an LACP bundle; passive/passive never starts. Desirable is PAgP and cannot be mixed with LACP, and <code>on</code> disables negotiation entirely so it only matches another <code>on</code>.' },

    { d: D.access, lab: 'd53-wireless',
      q: 'Which two statements about a lightweight AP deployment are true? (Choose two.)',
      opts: ['The AP builds a CAPWAP tunnel to the wireless LAN controller', 'Each AP is configured individually through its own web interface', 'The controller centralises RF management, SSIDs and policy', 'Lightweight APs route client traffic independently of the controller'],
      a: [0, 2],
      why: 'Lightweight APs are managed by, and tunnel to, the controller — that is the whole point of the split-MAC design. Independent per-AP configuration is what autonomous APs do.' },

    { d: D.access, lab: 'd47-port-security',
      q: 'A port-security violation mode of <code>restrict</code> differs from <code>protect</code> in which way?',
      opts: ['Restrict shuts the port down; protect leaves it up', 'Both drop the offending traffic, but restrict also logs the violation and increments the counter', 'Protect logs and restrict does not', 'There is no difference on modern IOS'],
      a: [1],
      why: 'Protect drops silently, restrict drops and tells you, shutdown err-disables the port. Silent dropping is the one to avoid in production: you lose the evidence.' },

    { d: D.access, lab: 'd45-qos',
      q: 'Which DSCP marking is the standard choice for voice traffic?',
      opts: ['AF41', 'EF', 'CS6', 'Default (0)'],
      a: [1],
      why: 'EF — Expedited Forwarding, DSCP 46 — is reserved for low-latency traffic like voice. AF41 is typical for video, CS6 for network control.' },

    { d: D.access, lab: 'd19-dtp-vtp',
      q: 'What does <code>switchport nonegotiate</code> do and when would you use it?',
      opts: ['It disables the port', 'It stops DTP frames being sent, which you use on hard-coded trunks and on ports facing devices that should never negotiate', 'It forces the port into access mode', 'It disables 802.1Q tagging'],
      a: [1],
      why: 'Hard-coding both ends and then suppressing DTP removes a whole class of surprises, including an attacker negotiating a trunk out of an access port.' },

    { d: D.access, lab: 'd16-vlans1',
      q: 'A switch\'s management SVI is in VLAN 1 with 10.0.1.5/24, and you cannot SSH to it from another subnet. Everything else routes fine. What is missing?',
      opts: ['A default gateway on the switch (<code>ip default-gateway</code>), or a routed path for a layer 3 switch', 'A trunk to the router', 'A second SVI', 'Port security on the uplink'],
      a: [0],
      why: 'A layer 2 switch is an end host for management traffic: without a default gateway it can answer only devices on its own subnet, so local pings work and remote ones do not.' },

    /* ---- 3.0 IP Connectivity ---- */
    { d: D.ip, lab: 'd11-static-routing',
      q: 'Which two are valid reasons to use a static route in a network that already runs OSPF? (Choose two.)',
      opts: ['A default route towards an ISP that does not run your IGP', 'A floating static backup with a raised administrative distance', 'To speed up OSPF convergence', 'To replace OSPF inside the campus for reliability'],
      a: [0, 1],
      why: 'Statics complement an IGP at the edges — where the far end does not participate, or where you want a deliberately less preferred backup. They do not change how OSPF converges.' },

    { d: D.ip, lab: 'd24-dynamic-routing',
      q: 'Rank these by administrative distance, lowest first.',
      opts: ['OSPF (110), EIGRP (90), static (1)', 'Static (1), EIGRP (90), OSPF (110)', 'Static (1), OSPF (110), EIGRP (90)', 'Connected (1), static (0), OSPF (110)'],
      a: [1],
      why: 'Connected 0, static 1, eBGP 20, EIGRP 90, OSPF 110, RIP 120. Lower is more trusted, and AD is compared before any metric.' },

    { d: D.ip, lab: 'd27-ospf',
      q: 'Which two values must match for two routers to become OSPF neighbours on a link? (Choose two.)',
      opts: ['Area ID', 'Hello and dead intervals', 'Router ID', 'Process ID'],
      a: [0, 1],
      why: 'Area, timers, subnet, authentication and MTU must agree. Router IDs must be unique, not matching, and the process ID is purely locally significant.' },

    { d: D.ip, lab: 'd27-ospf',
      q: 'What is the OSPF cost of a path across three 1 Gbps links, with the default reference bandwidth of 100 Mbps?',
      opts: ['3', '300', '1', '30'],
      a: [0],
      why: 'Cost is reference bandwidth divided by interface bandwidth, minimum 1. 100/1000 rounds up to 1 per link, so three links cost 3 — and this is exactly why you raise the reference bandwidth in a gigabit network, or every fast link looks identical.' },

    { d: D.ip, lab: 'd28-hsrp',
      q: 'Which two statements about HSRP are true? (Choose two.)',
      opts: ['Hosts use the virtual IP address as their default gateway', 'The active router responds to ARP for the virtual IP with a virtual MAC address', 'Both routers forward traffic for the virtual IP simultaneously', 'Each host must be reconfigured when a failover occurs'],
      a: [0, 1],
      why: 'HSRP is active/standby: one router owns the virtual IP and MAC at a time, and hosts never learn that anything changed during a failover. Simultaneous forwarding by both is GLBP behaviour.' },

    { d: D.ip, lab: 'd18-vlans3',
      q: 'On a layer 3 switch, what has to be true for an SVI to come up?',
      opts: ['The VLAN must exist and at least one access port in it must be up, or an allowed trunk carrying it must be up', 'The switch must have a default gateway', 'The SVI must be assigned to a physical port', 'The VLAN must be numbered above 100'],
      a: [0],
      why: 'An SVI is a virtual interface for a VLAN — it stays down until the VLAN exists and has at least one active member port, because otherwise there is nothing for it to route for.' },

    { d: D.ip, lab: 'x5-static-ipv6',
      q: 'Which IPv6 route statement creates a default route via 2001:db8::2?',
      opts: ['<code>ipv6 route 0.0.0.0/0 2001:db8::2</code>', '<code>ipv6 route ::/0 2001:db8::2</code>', '<code>ip route ::/0 2001:db8::2</code>', '<code>ipv6 route default 2001:db8::2</code>'],
      a: [1],
      why: '::/0 is the IPv6 equivalent of 0.0.0.0/0 — all zeros with a zero-length prefix, so it matches everything and loses every longest-prefix comparison.' },

    { d: D.ip, lab: 'd12-subnetting',
      q: 'A router holds routes for 10.0.0.0/8, 10.5.0.0/16, 10.5.7.0/24 and a default route. Which is used for a packet to 10.5.7.99?',
      opts: ['0.0.0.0/0', '10.0.0.0/8', '10.5.0.0/16', '10.5.7.0/24'],
      a: [3],
      why: 'Longest-prefix match: the most specific route that contains the destination wins, no matter which protocol or AD produced the others.' },

    { d: D.ip, lab: 'd08-router-ints',
      q: 'Which two are true about a router\'s connected routes? (Choose two.)',
      opts: ['They appear only when the interface is up/up and has an IP address', 'They have an administrative distance of 0', 'They must be redistributed before they appear in the routing table', 'They have an administrative distance of 1'],
      a: [0, 1],
      why: 'Connected routes are the most trusted source there is, AD 0, and they exist purely because the interface is up and addressed. A local /32 route appears alongside them.' },

    { d: D.ip, lab: 'x6-ospf-hsrp',
      q: 'A design uses HSRP on the distribution pair and OSPF towards the core. Why should the HSRP active router normally also be the preferred OSPF path?',
      opts: ['Otherwise HSRP will not form', 'To avoid a suboptimal path where traffic enters the active router and then crosses to the peer to reach the core', 'Because OSPF requires a virtual IP', 'To reduce the number of routes in the table'],
      a: [1],
      why: 'HSRP decides which router hosts send to; OSPF decides where that router sends next. If the two disagree, every packet takes an extra hop across the inter-switch link for no reason.' },

    /* ---- 4.0 IP Services ---- */
    { d: D.svc, lab: 'd38-dhcp',
      q: 'Put the DHCP exchange in order.',
      opts: ['Discover, Offer, Request, Acknowledge', 'Request, Offer, Discover, Acknowledge', 'Offer, Discover, Acknowledge, Request', 'Discover, Request, Offer, Acknowledge'],
      a: [0],
      why: 'DORA. Discover and Request are broadcasts from the client; Offer and Ack come from the server — which is why a relay is needed when the server is off-subnet.' },

    { d: D.svc, lab: 'd43-static-nat',
      q: 'Which NAT term describes the public address that outside hosts use to reach an inside server?',
      opts: ['Inside local', 'Inside global', 'Outside local', 'Outside global'],
      a: [1],
      why: '"Inside" means the host belongs to your network; "global" means the address as the outside world sees it. So the server\'s private address is inside local and its public address is inside global.' },

    { d: D.svc, lab: 'd39-snmp',
      q: 'Why is SNMPv3 preferred over v2c?',
      opts: ['It supports more OIDs', 'It adds authentication and encryption, whereas v2c relies on a community string sent in clear text', 'It uses TCP instead of UDP', 'It does not require a management station'],
      a: [1],
      why: 'A v2c community string is effectively a password on the wire in plain text. v3 adds user-based authentication and privacy, which is what makes it safe to use for writes.' },

    { d: D.svc, lab: 'd40-syslog',
      q: 'Which syslog severity level is the most severe?',
      opts: ['0 — Emergency', '7 — Debugging', '4 — Warning', '1 — Alert'],
      a: [0],
      why: 'Severity counts down in urgency as the number goes up: 0 emergency, 1 alert, 2 critical, 3 error, 4 warning, 5 notification, 6 informational, 7 debugging. Configuring a level captures that level and everything more severe.' },

    /* ---- 5.0 Security Fundamentals ---- */
    { d: D.sec, lab: 'd34-ext-acl',
      q: 'Which wildcard mask matches exactly the hosts 10.4.8.0 through 10.4.11.255?',
      opts: ['0.0.0.255', '0.0.3.255', '0.0.7.255', '255.255.252.0'],
      a: [1],
      why: 'That range is four /24s, i.e. 10.4.8.0/22. A /22 subnet mask of 255.255.252.0 inverts to the wildcard 0.0.3.255 — zeros must match, ones are ignored.' },

    { d: D.sec, lab: 'd33-std-acl',
      q: 'Which two statements about ACLs are true? (Choose two.)',
      opts: ['There is an implicit deny any at the end of every ACL', 'Statements are evaluated top down and processing stops at the first match', 'A new statement can be inserted anywhere in a numbered ACL without a sequence number', 'An ACL applied to an interface filters traffic generated by the router itself'],
      a: [0, 1],
      why: 'Implicit deny and first-match processing are the two rules that explain almost every ACL surprise. Traffic the router originates is not filtered by an interface ACL.' },

    { d: D.sec, lab: 'd46-security-fundamentals',
      q: 'Which pair of concepts does multifactor authentication combine?',
      opts: ['Two passwords of different lengths', 'Something you know with something you have or something you are', 'Authentication with authorisation', 'Encryption with hashing'],
      a: [1],
      why: 'The factors must be different in kind. Two passwords are still one factor, which is why a stolen password database defeats them both at once.' },

    { d: D.sec, lab: 'd41-ssh',
      q: 'Which two commands are part of enabling SSH on a switch? (Choose two.)',
      opts: ['<code>ip domain-name example.com</code>', '<code>crypto key generate rsa</code>', '<code>transport input telnet</code>', '<code>no ip http server</code>'],
      a: [0, 1],
      why: 'The key pair is named after hostname plus domain name, so both must be set before generating it. <code>transport input telnet</code> would do the opposite of what you want, and disabling HTTP is good hygiene but unrelated.' },

    { d: D.sec, lab: 'd49-dai',
      q: 'Dynamic ARP Inspection protects against which attack, and what does it validate against?',
      opts: ['MAC flooding, validated against the MAC address table', 'ARP spoofing / man-in-the-middle, validated against the DHCP snooping binding table', 'DHCP starvation, validated against the ARP cache', 'Double tagging, validated against the native VLAN'],
      a: [1],
      why: 'DAI inspects ARP packets on untrusted ports and drops any whose IP-to-MAC pairing does not appear in the snooping bindings, which is what stops an attacker claiming to be the gateway.' },

    { d: D.sec, lab: 'd48-dhcp-snooping',
      q: 'On which ports should DHCP snooping trust be configured?',
      opts: ['All access ports', 'Only the ports facing the legitimate DHCP server or the uplink path towards it', 'All ports, then untrust the rogue one when found', 'Only the management VLAN'],
      a: [1],
      why: 'Trust follows the path to the real server. Everything else stays untrusted so a rogue server plugged into a desk port is silenced automatically, without you having to find it first.' },

    /* ---- 6.0 Automation & Programmability ---- */
    { d: D.auto, lab: 'd57-automation',
      q: 'Which two are characteristics of a REST API? (Choose two.)',
      opts: ['It is stateless — each request carries everything needed to serve it', 'It uses HTTP verbs such as GET, POST, PUT and DELETE', 'It requires an agent installed on the device', 'It can only return XML'],
      a: [0, 1],
      why: 'REST is stateless and verb-based over HTTP, and returns whatever representation is negotiated — JSON in practice on network devices.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'What does YANG provide in a NETCONF or RESTCONF deployment?',
      opts: ['The transport encryption', 'A data model that defines the structure, types and constraints of the configuration and state being exchanged', 'The authentication database', 'The CLI parser'],
      a: [1],
      why: 'NETCONF and RESTCONF are the transports; YANG is the schema that says what the data looks like, which is what lets a tool validate a payload before sending it.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'Which two statements about Puppet, Chef and Ansible are true? (Choose two.)',
      opts: ['Ansible is agentless and pushes over SSH', 'Puppet and Chef traditionally use an agent that pulls from a master', 'All three require a proprietary controller appliance', 'All three configure devices only through SNMP'],
      a: [0, 1],
      why: 'Push versus pull, agentless versus agent-based, is the distinction the blueprint asks for. None of them is tied to SNMP or a specific appliance.' },

    { d: D.auto, lab: 'd57-automation',
      q: 'In a controller-based network, what is the northbound interface?',
      opts: ['The interface between the controller and the network devices', 'The API applications and orchestration tools use to talk to the controller', 'The physical uplink to the core', 'The console connection to the controller'],
      a: [1],
      why: 'Northbound faces up towards applications — that is the API you script against. Southbound faces down towards the devices, using NETCONF, RESTCONF or similar.' },
  ],
});

window.ND = ND;
})();
