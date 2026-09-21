/* NetDrill labs — Volume 2 chapters the first pass did not cover:
   DNS, SNMP, TFTP/FTP, QoS, security fundamentals, Dynamic ARP Inspection,
   LAN/WAN/cloud architectures, wireless, and network automation. */
'use strict';
(function () {
const ND = window.ND;
ND.LABS = ND.LABS || [];
const L = lab => ND.LABS.push(lab);

/* ============================================================= */
L({
  id: 'd37-dns', ord: 37, vol: 2, day: 'Day 37', title: 'DNS',
  topics: 'ip host static entries · ip name-server · ip domain-lookup · domain names · resolving from a router and from a PC · nslookup',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1', dns: '10.0.0.1' } },
    { id: 'SRV', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.2.100', mask: '255.255.255.0', gw: '10.0.2.1' } },
  ],
  links: [['PC1', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0'], ['R2', 'g0/1', 'SRV', 'e0']],
  layout: { PC1: [35, 60], R1: [150, 60], R2: [260, 60], SRV: [365, 60] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    const M24 = '255.255.255.0', M30 = '255.255.255.252';
    set('R1', 'g0/0', '10.0.1.1', M24); set('R1', 'g0/1', '10.0.12.1', M30);
    set('R2', 'g0/0', '10.0.12.2', M30); set('R2', 'g0/1', '10.0.2.1', M24);
    // R1 doubles as the site's DNS resolver on its LAN address
    const lo = ND.getOrCreateIface(topo.devs.R1, 'lo0');
    lo.ip = { addr: '10.0.0.1', mask: '255.255.255.255' };
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2';
    topo.devs.R1.staticRoutes.push({ net: '10.0.2.0', mask: M24, via: '10.0.12.2', ad: 1 });
    topo.devs.R2.staticRoutes.push({ net: '10.0.1.0', mask: M24, via: '10.0.12.1', ad: 1 }, { net: '10.0.0.1', mask: '255.255.255.255', via: '10.0.12.1', ad: 1 });
  },
  intro: `<b>The situation:</b> nobody wants to remember that the file server is 10.0.2.100. DNS turns names into addresses, and Cisco devices both <em>use</em> it and can <em>provide</em> a small amount of it.<br><b>Your goal:</b> build name resolution three ways — a static host table typed into a router, a router acting as the resolver for the network, and a PC pointed at that resolver — then prove each one by pinging a name instead of an address. You will also meet <code>no ip domain-lookup</code> properly: the command every engineer types on day one, and now you will know exactly what it switches off.`,
  tasks: [
    { t: 'Ping a name before configuring anything, and read the error carefully', why: 'The "Translating..." line tells you the device tried to resolve the name and had nowhere to ask. Recognising that message saves a lot of confusion.' },
    { t: 'Create static name-to-address entries on R2 with ip host', why: 'A static host table needs no server at all. It is ideal for a handful of devices you type the names of constantly.' },
    { t: 'Ping by name from R2 and confirm it resolves from that local table', why: 'The local table is checked first, before any name server. Proving that order matters when a name resolves "wrongly" in the real world.' },
    { t: 'Turn R1 into the site resolver by giving it the zone entries for every device', why: 'One device holding the names means one place to update. In this lab R1 plays the part a real DNS server would.' },
    { t: 'Point R2 at that resolver with ip name-server and make sure lookups are enabled', why: 'A name server is only ever consulted while ip domain-lookup is on — which is exactly why disabling lookups stops typo-induced hangs.' },
    { t: 'Set a default domain name and resolve a short name that relies on it', why: 'With a domain name configured, "srv" is automatically tried as "srv.netdrill.lab". That is how short names work inside a company.' },
    { t: 'Resolve a name from the PC, which uses the DNS server it was given', why: 'Hosts do the same thing routers do. nslookup asks the question directly and shows which server answered.' },
    { t: 'Finally disable lookups on one router and watch a typo fail instantly instead of hanging', why: 'On real hardware a mistyped command with lookups enabled freezes the session for a minute or more. This is the reason for the habit.' },
  ],
  steps: [
    { d: 'R2', t: 'Try a name before anything is configured.', c: ['enable', 'terminal length 0', 'ping srv'], expectErr: true, note: 'It tries to translate the name, has no server to ask, and gives up. That "Translating..." line is the fingerprint of a name-resolution problem.' },
    { d: 'R2', t: 'Build a small static host table.', c: ['configure terminal', 'ip host srv 10.0.2.100', 'ip host r1 10.0.12.1', 'ip host pc1 10.0.1.10', 'end', 'show hosts'], note: 'Three names, no server required. "perm" in the flags column means you typed them, rather than them being learned from DNS.' },
    { d: 'R2', t: 'Ping by name, now that it resolves locally.', c: ['ping srv', 'ping r1'], note: 'The static table is checked before any DNS server, so these answer instantly. Static entries always win.' },
    { d: 'R2', t: 'Remove one entry to see the "no" form.', c: ['configure terminal', 'no ip host pc1', 'end', 'show hosts'], note: 'Gone from the table. Useful when a device moves and the old entry would send you somewhere wrong.' },
    { d: 'R1', t: 'Now make R1 the resolver for the whole site.', c: ['enable', 'terminal length 0', 'configure terminal', 'ip host srv 10.0.2.100', 'ip host srv.netdrill.lab 10.0.2.100', 'ip host r2 10.0.12.2', 'ip host pc1 10.0.1.10', 'end', 'show hosts'], note: 'R1 now holds the site\'s zone. Both the short and fully-qualified forms of the server name resolve to the same address.' },
    { d: 'R2', t: 'Point R2 at that resolver.', c: ['configure terminal', 'ip name-server 10.0.0.1', 'ip domain-lookup', 'ip domain-name netdrill.lab', 'end', 'show hosts'], note: 'Three settings that work as one: WHERE to ask, WHETHER to ask, and what to append to short names.' },
    { d: 'R2', t: 'Resolve a name R2 does not know locally.', c: ['configure terminal', 'no ip host srv', 'end', 'ping srv'], note: 'The local entry is gone, so R2 asks 10.0.0.1 instead. Watch the Translating line — it now names the server that answered.' },
    { d: 'R2', t: 'Resolve a name that only exists in its fully-qualified form.', c: ['ping srv.netdrill.lab'], note: 'The domain suffix works in both directions: short names get it appended, and the long form resolves directly.' },
    { d: 'PC1', t: 'Check the address the host was given.', c: ['ipconfig /all'], note: 'The DNS Servers line is the one that matters here. A host with no DNS server can reach everything by address and nothing by name.' },
    { d: 'PC1', t: 'Ask the resolver directly.', c: ['nslookup srv'], note: 'nslookup shows which server answered and what it said. It is the first tool to reach for when a name resolves to the wrong address.' },
    { d: 'PC1', t: 'And use the name for real.', c: ['ping srv', 'tracert srv'], note: 'The name is resolved once, then everything after that works with the address — exactly as the router did.' },
    { d: 'R2', t: 'Now switch lookups off and see the difference.', c: ['configure terminal', 'no ip domain-lookup', 'end', 'ping srv'], expectErr: true, note: 'The name server is still configured, but R2 no longer asks it. This is also why a mistyped command fails immediately instead of hanging for a minute.' },
    { d: 'R2', t: 'Turn lookups back on, drop a stale server entry, and save.', c: ['configure terminal', 'ip name-server 8.8.8.8', 'do show hosts', 'no ip name-server 8.8.8.8', 'ip domain-lookup', 'end', 'show hosts', 'ping srv', 'write memory'], note: 'Back to working name resolution. In production most engineers leave lookups OFF on devices and rely on addresses — the typo tax is not worth it.' },
    { d: 'R1', t: 'Save the resolver.', c: ['write memory'] },
  ],
  verify: ['show hosts', 'show running-config', 'show ip route'],
  explain: `<h3>What DNS actually does</h3>
<p>DNS maps names to addresses so humans do not have to remember numbers. A client sends a query to a resolver on <b>UDP port 53</b> (TCP 53 for large responses and zone transfers), and the resolver either answers from its own records, from cache, or by asking other servers up the hierarchy — root, top-level domain, then the authoritative server for that zone.</p>
<h3>The three commands on IOS</h3>
<ul>
<li><code>ip host NAME ADDRESS</code> — a static entry in the local host table. Checked first, needs no server, survives DNS being down.</li>
<li><code>ip name-server ADDRESS</code> — where to send queries the local table cannot answer. You can list several.</li>
<li><code>ip domain-name netdrill.lab</code> — the suffix appended to short names. Also a prerequisite for generating RSA keys for SSH, which is why it appears in that lab too.</li>
</ul>
<p>Newer IOS spells the last one <code>ip domain name</code>, with a space. Both appear in exam questions.</p>
<h3>Why everybody types no ip domain-lookup</h3>
<p>By default, an unrecognised command is treated as a hostname to telnet to. With lookups enabled and no reachable server, the device sits there trying to resolve your typo — for around a minute, with your session frozen. <code>no ip domain-lookup</code> disables that behaviour, and it is the first command most engineers type on a new device.</p>
<h3>Record types worth knowing</h3>
<p><b>A</b> maps a name to an IPv4 address, <b>AAAA</b> to an IPv6 address, <b>CNAME</b> is an alias to another name, <b>MX</b> points at a mail server, <b>NS</b> names the authoritative servers for a zone, and <b>PTR</b> does the reverse lookup from address back to name.</p>
<h3>Troubleshooting name resolution</h3>
<p>If a name fails but the address works, the fault is DNS, not the network. Check in this order: is a name server configured, is it reachable (<code>ping</code> it), are lookups enabled, and is the entry correct? <code>nslookup</code> on a host tells you which server answered — invaluable when the answer is wrong rather than missing.</p>`,
  checks: [
    { desc: 'R1 holds the site zone entries', fn: H => H.d('R1').hosts['srv'] === '10.0.2.100' && H.d('R1').hosts['srv.netdrill.lab'] === '10.0.2.100' },
    { desc: 'R2 points at the resolver with a domain name set', fn: H => H.d('R2').nameServers.includes('10.0.0.1') && H.d('R2').domainName === 'netdrill.lab' },
    { desc: 'Lookups are enabled on R2 after the experiment', fn: H => H.d('R2').domainLookup },
    { desc: 'R2 kept a static host entry and removed another', fn: H => !!H.d('R2').hosts['r1'] && !H.d('R2').hosts['pc1'] },
    { desc: 'R2 can resolve the server name through the resolver', fn: H => { const r = ND.resolveName(H.topo, H.d('R2'), 'srv'); return !!r && r.ip === '10.0.2.100'; } },
    { desc: 'PC1 can resolve the same name from its DNS server', fn: H => { const r = ND.resolveName(H.topo, H.d('PC1'), 'srv'); return !!r && r.ip === '10.0.2.100'; } },
    { desc: 'The resolved address is actually reachable', fn: H => H.ping('PC1', '10.0.2.100') },
    { desc: 'Both routers saved', fn: H => H.saved('R1') && H.saved('R2') },
  ],
});

/* ============================================================= */
L({
  id: 'd39-snmp', ord: 39, vol: 2, day: 'Day 39', title: 'SNMP',
  topics: 'communities read-only and read-write · sysLocation and sysContact · trap receivers · versions 1, 2c and 3 · get/set/trap/inform · securing SNMP',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'NMS', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.200', mask: '255.255.255.0', gw: '10.0.0.1' } },
    { id: 'R2', type: 'router', ifaces: ['g0/0'] },
  ],
  links: [['NMS', 'e0', 'SW1', 'f0/1'], ['SW1', 'g0/1', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0']],
  layout: { NMS: [35, 60], SW1: [140, 60], R1: [250, 60], R2: [355, 60] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.0.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.12.1', '255.255.255.252');
    set('R2', 'g0/0', '10.0.12.2', '255.255.255.252');
    const svi = ND.getOrCreateIface(topo.devs.SW1, 'vlan1');
    svi.ip = { addr: '10.0.0.2', mask: '255.255.255.0' };
    topo.devs.SW1.defaultGateway = '10.0.0.1';
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.SW1.hostname = 'SW1';
    topo.devs.R2.staticRoutes.push({ net: '10.0.0.0', mask: '255.255.255.0', via: '10.0.12.1', ad: 1 });
  },
  intro: `<b>The situation:</b> a monitoring station (the NMS) sits on the LAN and can see nothing. You have three devices that should be reporting their interface counters, CPU load and — more importantly — telling somebody when a link goes down at three in the morning.<br><b>Your goal:</b> configure SNMP on all three devices: read-only access for the monitoring system, the identity fields that make an alert readable, and a trap receiver so the devices report problems rather than waiting to be asked. You will also meet the read-write community, and understand why nobody sensible leaves one configured.`,
  tasks: [
    { t: 'Check the SNMP state before configuring anything', why: 'An unconfigured device has no communities and answers nobody. Seeing the empty output first makes the change obvious.' },
    { t: 'Configure a read-only community string on R1', why: 'The community string is SNMPv1/v2c\'s only authentication — effectively a password sent in clear text. Read-only means the NMS can ask questions but change nothing.' },
    { t: 'Set the location and contact fields so alerts identify themselves', why: 'sysLocation and sysContact appear in every alert the NMS raises. "Rack 4, Comms Room B" beats a bare IP address at 3am.' },
    { t: 'Point the device at the monitoring station as a trap receiver, using version 2c', why: 'Polling asks "are you all right?" every few minutes. A trap is the device shouting "I am not!" the instant something breaks — far better for outages.' },
    { t: 'Enable traps so the device actually sends them', why: 'Naming a receiver is not enough: the device must also be told to generate the notifications.' },
    { t: 'Repeat the whole configuration on the switch and the second router', why: 'Three devices reporting to one station is the minimum useful deployment, and the commands are identical on switches and routers.' },
    { t: 'Add a read-write community, look at it, and then delete it again', why: 'Read-write allows SNMP SET — configuration changes over a clear-text protocol. Seeing it once and removing it is exactly the right relationship to have with this command.' },
    { t: 'Verify with show snmp, show snmp community and show snmp host on every device', why: 'Three views: general statistics, who may ask, and who gets told. Between them they answer every SNMP question in the exam.' },
  ],
  steps: [
    { d: 'R1', t: 'Look at SNMP before you touch it.', c: ['enable', 'terminal length 0', 'show snmp'], note: 'No communities configured, so the agent answers nobody. SNMP is not dangerous by default — it is dangerous once somebody configures it carelessly.' },
    { d: 'R1', t: 'Add a read-only community for the monitoring system.', c: ['configure terminal', 'snmp-server community NetDrillRO ro', 'do show snmp community'], note: 'RO means gets only, no sets. Treat the string as a password: never "public", never a word from your company name.' },
    { d: 'R1', t: 'Give the device an identity.', c: ['snmp-server location Rack4-CommsRoomB', 'snmp-server contact netops@netdrill.lab', 'do show snmp'], note: 'These two fields are what turn "10.0.0.1 is down" into something an engineer can act on without a diagram.' },
    { d: 'R1', t: 'Send traps to the monitoring station.', c: ['snmp-server host 10.0.0.200 version 2c NetDrillRO', 'snmp-server enable traps', 'end', 'show snmp host', 'show snmp'], note: 'Two commands, both needed: WHERE to send notifications, and permission to generate them at all. Traps go to UDP port 162; polling uses 161.' },
    { d: 'SW1', t: 'Same configuration on the switch.', c: ['enable', 'terminal length 0', 'configure terminal', 'snmp-server community NetDrillRO ro', 'snmp-server location Rack4-CommsRoomB', 'snmp-server contact netops@netdrill.lab', 'snmp-server host 10.0.0.200 version 2c NetDrillRO', 'snmp-server enable traps', 'end', 'show snmp'], note: 'Identical commands on a switch. Nothing about SNMP is router-specific.' },
    { d: 'R2', t: 'And on the remote router.', c: ['enable', 'terminal length 0', 'configure terminal', 'snmp-server community NetDrillRO ro', 'snmp-server location BranchOffice-Cabinet1', 'snmp-server contact netops@netdrill.lab', 'snmp-server host 10.0.0.200 version 2c NetDrillRO', 'snmp-server enable traps', 'end', 'show snmp', 'show snmp host'], note: 'Different location string, same everything else. Three devices now report to one station.' },
    { d: 'R1', t: 'Add a read-write community and look at what you have done.', c: ['configure terminal', 'snmp-server community NetDrillRW rw', 'end', 'show snmp community'], note: 'RW allows SNMP SET — remote configuration changes authenticated by a clear-text string. Powerful, and precisely why it is a finding in every security audit.' },
    { d: 'R1', t: 'Remove it again.', c: ['configure terminal', 'no snmp-server community NetDrillRW', 'end', 'show snmp community'], note: 'Gone. If you genuinely need write access, use SNMPv3 with authentication and encryption instead.' },
    { d: 'R1', t: 'Try the version 3 form of the trap receiver, then go back to 2c.', c: ['configure terminal', 'snmp-server host 10.0.0.200 version 3 netops', 'do show snmp host', 'no snmp-server host 10.0.0.200', 'do show snmp host', 'snmp-server host 10.0.0.200 version 2c NetDrillRO', 'end', 'show snmp host'], note: 'Version 3 replaces the community string with a named user carrying authentication and encryption. It is what you should deploy; 2c is what you will meet most often.' },
    { d: 'R1', t: 'Prove which command controls trap generation.', c: ['configure terminal', 'no snmp-server enable traps', 'do show snmp', 'snmp-server enable traps', 'end', 'show snmp'], note: 'With traps disabled the device still answers polls but reports nothing on its own. The receiver line and the enable line are two separate switches and you need both.' },
    { d: 'R1', t: 'Confirm the monitoring station is actually reachable.', c: ['ping 10.0.0.200'], note: 'A trap receiver you cannot reach is a trap receiver that never hears anything. Test the path, not just the configuration.' },
    { d: 'R2', t: 'And from the far end of the network.', c: ['ping 10.0.0.200'], note: 'The branch router must cross the WAN link to report. Worth confirming before you rely on it.' },
    { d: 'R1', t: 'Generate something worth trapping.', c: ['configure terminal', 'interface g0/1', 'shutdown', 'no shutdown', 'end', 'show snmp'], note: 'A link going down is the classic trap. On real gear the NMS would raise an alert within a second of that message.' },
    { d: 'R1', t: 'Final verification sweep and save.', c: ['show snmp', 'show snmp community', 'show snmp host', 'write memory'] },
    { d: 'SW1', t: 'Save the switch.', c: ['show snmp community', 'write memory'] },
    { d: 'R2', t: 'And the branch router.', c: ['write memory'] },
  ],
  verify: ['show snmp', 'show snmp community', 'show snmp host', 'show running-config'],
  explain: `<h3>What SNMP is for</h3>
<p>Simple Network Management Protocol lets a management station read and (optionally) change values on network devices. Those values live in the <b>MIB</b>, a tree of objects each identified by an <b>OID</b> — interface counters, CPU, memory, temperature, and thousands more.</p>
<h3>The message types</h3>
<ul>
<li><b>GET</b> — the manager asks for one value. <b>GETNEXT</b> / <b>GETBULK</b> walk the tree.</li>
<li><b>SET</b> — the manager changes a value. This is the one that needs read-write access.</li>
<li><b>TRAP</b> — the device reports an event, unsolicited, and does not care whether it arrived.</li>
<li><b>INFORM</b> — like a trap, but acknowledged and retransmitted if it is not. More reliable, more traffic.</li>
</ul>
<p>Polling uses <b>UDP 161</b>, notifications arrive on <b>UDP 162</b>.</p>
<h3>The three versions</h3>
<p><b>v1</b> — original, community strings in clear text, limited counters. <b>v2c</b> — adds GETBULK and INFORM, still clear-text communities; by far the most common. <b>v3</b> — adds real security: authentication (a username and hash) and encryption of the payload. If SNMP crosses anything you do not control, v3 is the only responsible choice.</p>
<h3>Securing it</h3>
<p>Treat community strings as passwords: never leave "public" or "private" configured, never use a guessable string, and avoid read-write entirely unless you are on v3. Restrict which hosts may poll with an access list on the community, keep SNMP inside a management VLAN, and prefer traps to aggressive polling so the device is not answering strangers constantly.</p>`,
  checks: [
    { desc: 'All three devices have the read-only community configured', fn: H => ['R1', 'SW1', 'R2'].every(d => H.d(d).snmp.communities.some(c => c.name === 'NetDrillRO' && c.access === 'RO')) },
    { desc: 'The read-write community was created and then removed', fn: H => !H.d('R1').snmp.communities.some(c => c.access === 'RW') },
    { desc: 'Location and contact are set on all three devices', fn: H => ['R1', 'SW1', 'R2'].every(d => !!H.d(d).snmp.location && !!H.d(d).snmp.contact) },
    { desc: 'All three send traps to the monitoring station with version 2c', fn: H => ['R1', 'SW1', 'R2'].every(d => H.d(d).snmp.hosts.some(h => h.ip === '10.0.0.200' && h.version === '2c')) },
    { desc: 'Trap generation is enabled everywhere', fn: H => ['R1', 'SW1', 'R2'].every(d => H.d(d).snmp.traps) },
    { desc: 'Every device can actually reach the monitoring station', fn: H => ['R1', 'SW1', 'R2'].every(d => H.ping(d, '10.0.0.200')) },
    { desc: 'The bounced interface was left enabled', fn: H => H.noshut('R1', 'g0/1') },
    { desc: 'All three devices saved', fn: H => ['R1', 'SW1', 'R2'].every(d => H.saved(d)) },
  ],
});

/* ============================================================= */
L({
  id: 'd42-file-transfer', ord: 42, vol: 2, day: 'Day 42', title: 'TFTP & FTP — Backups and IOS Files',
  topics: 'show flash · copy running-config tftp · copy tftp running-config · IOS image backup · ip ftp username/password · restoring a config',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'TFTP', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.100', mask: '255.255.255.0', gw: '10.0.0.1' } },
    { id: 'R2', type: 'router', ifaces: ['g0/0'] },
  ],
  links: [['TFTP', 'e0', 'SW1', 'f0/1'], ['SW1', 'g0/1', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0']],
  layout: { TFTP: [35, 60], SW1: [140, 60], R1: [250, 60], R2: [355, 60] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('R1', 'g0/0', '10.0.0.1', '255.255.255.0'); set('R1', 'g0/1', '10.0.12.1', '255.255.255.252');
    set('R2', 'g0/0', '10.0.12.2', '255.255.255.252');
    const svi = ND.getOrCreateIface(topo.devs.SW1, 'vlan1');
    svi.ip = { addr: '10.0.0.2', mask: '255.255.255.0' };
    topo.devs.SW1.defaultGateway = '10.0.0.1';
    topo.devs.R1.hostname = 'R1'; topo.devs.R2.hostname = 'R2'; topo.devs.SW1.hostname = 'SW1';
    topo.devs.R2.staticRoutes.push({ net: '10.0.0.0', mask: '255.255.255.0', via: '10.0.12.1', ad: 1 });
  },
  intro: `<b>The situation:</b> three devices, no backups, and an IOS image sitting in flash that nobody has ever copied anywhere. When a switch dies you want to unbox the replacement, restore a config and go home — not rebuild it from memory.<br><b>Your goal:</b> learn the file-transfer commands properly. These are <b>interactive</b> commands: IOS asks you questions and you answer them line by line, which is exactly how it behaves on real hardware. You will back up configs to a TFTP server, restore one, copy an IOS image off the device, and configure FTP credentials for when TFTP is not enough.`,
  tasks: [
    { t: 'Look at what is in flash before copying anything anywhere', why: 'show flash tells you the IOS image name and how much space is left — the two facts every upgrade depends on.' },
    { t: 'Back up R1\'s running configuration to the TFTP server, answering each prompt', why: 'copy is interactive: it asks for the server address and the destination filename. Getting used to the question-and-answer rhythm is the whole skill.' },
    { t: 'Back up the switch configuration too, using a filename you will recognise later', why: 'Default filenames are based on the hostname. In a real backup directory, a consistent naming scheme is what makes a restore quick.' },
    { t: 'Try a backup to an address that is not reachable and read the failure', why: 'A timed-out copy usually means routing or a firewall, not a broken command. Recognising the error saves you re-typing a command that was fine.' },
    { t: 'Restore a configuration from the server into the startup config', why: 'Copying to startup-config replaces the saved config without disturbing the running one until reload — the safe direction for a restore.' },
    { t: 'Copy the IOS image out of flash to the server', why: 'Before any upgrade, take a copy of the working image. Being able to put the old one back is what makes an upgrade reversible.' },
    { t: 'Configure FTP credentials and back up over FTP instead', why: 'TFTP has no authentication and no encryption and struggles with large files. FTP at least authenticates, and is the usual alternative on IOS.' },
    { t: 'Verify the transfers and save every device', why: 'A backup you have not verified is a hope, not a backup.' },
  ],
  steps: [
    { d: 'R1', t: 'See what is stored on the device.', c: ['enable', 'terminal length 0', 'show flash:'], note: 'The IOS image, its exact filename and the free space. That filename is what you type during an upgrade, so read it carefully.' },
    { d: 'R1', t: 'Confirm the server is reachable before attempting a transfer.', c: ['ping 10.0.0.100'], note: 'Every failed copy in the field is worth testing this way first. TFTP uses UDP port 69, FTP uses TCP 20 and 21.' },
    { d: 'R1', t: 'Back up the running configuration. IOS will ask you two questions.', c: ['copy running-config tftp:', '10.0.0.100', 'R1-backup.cfg'], note: 'Answer the address prompt, then the filename prompt. The !! marks and the byte count confirm it worked. Pressing Enter alone would accept the default filename in brackets.' },
    { d: 'SW1', t: 'Back up the switch the same way.', c: ['enable', 'terminal length 0', 'copy running-config tftp:', '10.0.0.100', 'SW1-backup.cfg'], note: 'Identical command on a switch. A dated filename — SW1-2024-06-01.cfg — is what real backup directories look like.' },
    { d: 'R2', t: 'And the branch router, across the WAN link.', c: ['enable', 'terminal length 0', 'copy running-config tftp:', '10.0.0.100', 'R2-backup.cfg'], note: 'The transfer crosses a routed link, so this also quietly tests that routing works. Three devices backed up.' },
    { d: 'R1', t: 'Now try a server that does not exist.', c: ['copy running-config tftp:', '10.0.9.99', 'doomed.cfg'], note: 'It times out. The command was correct — the path was not. Always check reachability before blaming the syntax.' },
    { d: 'R1', t: 'Restore a configuration into NVRAM.', c: ['copy tftp: startup-config', '10.0.0.100', 'R1-backup.cfg', ''], note: 'Three answers: server, source filename, and destination (Enter accepts the default). Restoring to startup-config is the safe direction — nothing changes until the device reloads.' },
    { d: 'R1', t: 'Check what landed in NVRAM.', c: ['show startup-config'], note: 'The saved config is the file you just pulled back. A replacement device restored this way boots as the old one.' },
    { d: 'R1', t: 'Copy the IOS image off the device before any upgrade.', c: ['copy flash: tftp:', 'c2900-universalk9-mz.SPA.157-3.M4.bin', '10.0.0.100', 'ios-backup.bin'], note: 'Source filename first this time, then the server, then the destination name. Large files show a long row of exclamation marks.' },
    { d: 'R1', t: 'Set up FTP credentials for the alternative method.', c: ['configure terminal', 'ip ftp username wrongname', 'do show running-config', 'no ip ftp username', 'ip ftp username backupadmin', 'ip ftp password B4ckupPass', 'end', 'show running-config'], note: 'FTP authenticates; TFTP does not. Note the password appears in the config, which is one reason SCP is preferred in high-security environments.' },
    { d: 'R1', t: 'Back up over FTP instead.', c: ['copy running-config ftp:', '10.0.0.100', 'R1-over-ftp.cfg'], note: 'Same rhythm of prompts, different transport. FTP handles large files far better than TFTP and does not silently fail on them.' },
    { d: 'R1', t: 'Work through the rest of the copy forms.', c: ['copy startup-config tftp:', '10.0.0.100', 'R1-startup.cfg', 'copy tftp: running-config', '10.0.0.100', 'R1-backup.cfg', '', 'copy startup-config running-config'], note: 'Four more directions in one step: NVRAM out to the server, the server straight into the RUNNING config (which takes effect immediately and merges rather than replaces), and NVRAM back into RAM. Merging is the trap — a restore into running-config adds to what is already there instead of replacing it.' },
    { d: 'R1', t: 'And the flash-to-server and server-to-flash forms.', c: ['copy tftp: flash:', '10.0.0.100', 'ios-backup.bin', 'ios-restored.bin', 'copy flash: ftp:', 'ios-restored.bin', '10.0.0.100', 'ios-via-ftp.bin', 'copy ftp: flash:', '10.0.0.100', 'ios-via-ftp.bin', 'ios-from-ftp.bin', 'dir flash:'], note: 'Downloading an image into flash is the first half of every IOS upgrade; the second half is pointing the boot system statement at it and reloading. <code>dir flash:</code> confirms what actually landed.' },
    { d: 'SW1', t: 'Look at the switch\'s flash, which holds more than an image.', c: ['show flash:'], note: 'A switch also stores vlan.dat — the VLAN database, which is NOT part of running-config. Restoring a config without it loses every VLAN, a classic and painful surprise.' },
    { d: 'R1', t: 'Save every device.', c: ['write memory'] },
    { d: 'SW1', t: 'Save.', c: ['write memory'] },
    { d: 'R2', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show flash:', 'show startup-config', 'show running-config', 'dir'],
  explain: `<h3>The interactive copy command</h3>
<p><code>copy</code> takes a source and a destination and then asks for whatever it still needs. <code>copy running-config tftp:</code> asks for the server address and a destination filename; anything in square brackets is the default, accepted by pressing Enter. The direction always reads left to right: <b>from</b> then <b>to</b>.</p>
<p>The four you should know cold: <code>copy running-config startup-config</code> (save), <code>copy running-config tftp:</code> (back up), <code>copy tftp: startup-config</code> (restore), <code>copy flash: tftp:</code> (archive the image).</p>
<h3>TFTP versus FTP</h3>
<p><b>TFTP</b> — UDP 69, no authentication, no encryption, no directory listing, and poor with very large files. Simple enough to run from a laptop, which is why it is everywhere in labs.</p>
<p><b>FTP</b> — TCP 21 for control and 20 for data, with a username and password (<code>ip ftp username</code> / <code>ip ftp password</code>), handles large files properly. Still clear text, so <b>SCP</b> over SSH is the secure choice where it is available.</p>
<h3>What lives in flash, and what does not</h3>
<p><b>Flash</b> holds the IOS image and any files you put there; it survives reloads. <b>NVRAM</b> holds startup-config. <b>RAM</b> holds running-config and is lost at power-off. <b>ROM</b> holds the bootstrap and ROMMON.</p>
<p>On a switch, flash also holds <b>vlan.dat</b> — the VLAN database. It is not in running-config, so a config-only restore leaves you with a config full of VLAN assignments and no VLANs. Back it up too, or recreate the VLANs by hand.</p>
<h3>A sane backup routine</h3>
<ol><li>Back up the running config before any change, with a filename containing the hostname and date.</li><li>Back up the IOS image before any upgrade, so the old one can be restored.</li><li>Verify by listing the server directory or restoring to a spare device.</li><li>Keep the backups somewhere that is not the network you just broke.</li></ol>`,
  checks: [
    { desc: 'R1\'s configuration reached the TFTP server', fn: H => !!(H.topo.files && H.topo.files['10.0.0.100'] && H.topo.files['10.0.0.100']['R1-backup.cfg']) },
    { desc: 'The switch configuration was backed up too', fn: H => !!(H.topo.files && H.topo.files['10.0.0.100'] && H.topo.files['10.0.0.100']['SW1-backup.cfg']) },
    { desc: 'The branch router backed up across the WAN', fn: H => !!(H.topo.files && H.topo.files['10.0.0.100'] && H.topo.files['10.0.0.100']['R2-backup.cfg']) },
    { desc: 'The failed transfer to an unreachable server stored nothing', fn: H => !(H.topo.files && H.topo.files['10.0.9.99']) },
    { desc: 'A configuration was restored into NVRAM', fn: H => !!H.d('R1').startup },
    { desc: 'The IOS image was archived to the server', fn: H => !!(H.topo.files && H.topo.files['10.0.0.100'] && H.topo.files['10.0.0.100']['ios-backup.bin']) },
    { desc: 'FTP credentials are configured on R1', fn: H => H.d('R1').services.ftpUser === 'backupadmin' && !!H.d('R1').services.ftpPass },
    { desc: 'A backup was also taken over FTP', fn: H => !!(H.topo.files && H.topo.files['10.0.0.100'] && H.topo.files['10.0.0.100']['R1-over-ftp.cfg']) },
    { desc: 'All three devices saved', fn: H => ['R1', 'SW1', 'R2'].every(d => H.saved(d)) },
  ],
});

/* ============================================================= */
L({
  id: 'd45-qos', ord: 45, vol: 2, day: 'Days 45-46', title: 'Quality of Service',
  topics: 'why voice needs QoS · classification & marking · CoS and DSCP · trust boundaries · conditional trust for phones · queueing, shaping and policing',
  devices: [
    { id: 'PH1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.150.10', mask: '255.255.255.0', gw: '10.0.150.1' }, poeDevice: 'IP Phone 7960' },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.10', mask: '255.255.255.0', gw: '10.0.10.1' } },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
  ],
  links: [['PH1', 'e0', 'SW1', 'f0/1'], ['PC1', 'e0', 'SW1', 'f0/2'], ['SW1', 'g0/1', 'R1', 'g0/0']],
  layout: { PH1: [35, 25], PC1: [35, 100], SW1: [160, 62], R1: [290, 62] },
  setupAll: topo => {
    topo.devs.SW1.hostname = 'SW1'; topo.devs.R1.hostname = 'R1';
    topo.devs.SW1.vlans[10] = { name: 'DATA' };
    topo.devs.SW1.vlans[150] = { name: 'VOICE' };
    const i = ND.getIface(topo.devs.R1, 'g0/0'); i.shutdown = false;
    const sub = v => { const s = ND.getOrCreateIface(topo.devs.R1, 'g0/0.' + v); s.encapDot1q = { vlan: v, native: false }; s.ip = { addr: '10.0.' + v + '.1', mask: '255.255.255.0' }; };
    sub(10); sub(150);
    const up = ND.getIface(topo.devs.SW1, 'g0/1'); up.swMode = 'trunk';
  },
  intro: `<b>The situation:</b> an IP phone and a PC share a desk and a cable. When somebody starts a large upload, the call breaks up. The link is not broken — it is <em>congested</em>, and congestion treats a voice packet exactly like a backup packet unless you tell it otherwise.<br><b>Your goal:</b> set up the switch end of a QoS design. You will enable QoS, decide where the <b>trust boundary</b> sits, trust the phone's markings while refusing the PC's, and understand what the router does with those markings further along. CCNA QoS is mostly conceptual, but the trust boundary is real configuration and it is where every design starts.`,
  tasks: [
    { t: 'Understand the problem first: what voice, video and data each need from the network', why: 'Voice needs low delay and near-zero loss but almost no bandwidth. A file transfer needs the opposite. One queue cannot serve both.' },
    { t: 'Enable QoS globally on the switch', why: 'On a Catalyst, QoS is off by default and every marking is ignored. Nothing below has any effect until this command is typed.' },
    { t: 'Trust the DSCP markings arriving on the uplink from the router', why: 'The uplink carries traffic from devices you control and that has already been classified. Trusting it preserves the markings end to end.' },
    { t: 'Trust the phone\'s CoS markings on the phone port — but conditionally', why: 'Conditional trust means "trust the markings only while a Cisco phone is actually detected there". Unplug the phone, plug in a laptop, and trust evaporates automatically.' },
    { t: 'Refuse to trust anything the PC sends, and force its traffic to a default value', why: 'A PC can mark its own packets as priority voice. If you trust it, any user with the right software can promote their own traffic above your telephony. This is the trust boundary.' },
    { t: 'Set the default CoS applied to untrusted traffic', why: 'Untrusted traffic is re-marked to the value you choose — normally 0, best effort. That is the switch saying "your opinion of your own importance is noted, and overruled".' },
    { t: 'Apply the automatic VoIP template on a spare port and see what it sets for you', why: 'auto qos voip is a shortcut that applies Cisco\'s recommended settings. Knowing what it does beats trusting it blindly.' },
    { t: 'Verify the per-port trust state and save', why: 'show mls qos interface is the one command that tells you whether a port trusts what it receives.' },
  ],
  steps: [
    { d: 'SW1', t: 'Look at the QoS state before anything is configured.', c: ['enable', 'terminal length 0', 'show mls qos'], note: 'Disabled. Every packet is treated identically and all markings are ignored — fine until the link fills up.' },
    { d: 'SW1', t: 'Set up the voice and data ports first.', c: ['configure terminal', 'interface f0/1', 'description IP-PHONE-DIRECT', 'switchport mode access', 'switchport access vlan 150', 'exit', 'interface f0/2', 'description PC-WITH-PHONE-READY', 'switchport mode access', 'switchport access vlan 10', 'switchport voice vlan 150', 'exit', 'do show interfaces status'], note: 'The phone sits in the voice VLAN. The desk port next to it carries data untagged for the PC and is ready to carry voice tagged in VLAN 150 as soon as a phone is placed in front of it — one cable, two VLANs.' },
    { d: 'SW1', t: 'Enable QoS globally.', c: ['mls qos', 'do show mls qos'], note: 'Now the switch has queues that behave differently and markings that mean something. On a real Catalyst this single command changes the behaviour of every port.' },
    { d: 'SW1', t: 'Trust DSCP on the uplink to the router.', c: ['interface g0/1', 'mls qos trust dscp', 'exit', 'do show mls qos interface g0/1'], note: 'The uplink carries traffic that has already been classified inside your network, so its markings are believed and preserved.' },
    { d: 'SW1', t: 'Trust the phone — but only while a phone is really there.', c: ['interface f0/1', 'mls qos trust device cisco-phone', 'mls qos trust cos', 'exit', 'do show mls qos interface f0/1'], note: 'Conditional trust: CDP confirms a Cisco phone is attached. Replace the phone with a laptop and the port stops trusting markings automatically — no ticket, no engineer visit.' },
    { d: 'SW1', t: 'Refuse to trust the PC, and set its traffic to best effort.', c: ['interface f0/2', 'no mls qos trust', 'mls qos cos 0', 'exit', 'do show mls qos interface f0/2'], note: 'This is the trust boundary. Anything the PC marks for itself is overwritten with CoS 0. Without this, any user can promote their own traffic above the phones.' },
    { d: 'SW1', t: 'Apply the automatic VoIP template on a spare port.', c: ['interface f0/3', 'description SPARE-PHONE-PORT', 'switchport mode access', 'switchport access vlan 10', 'switchport voice vlan 150', 'auto qos voip trust', 'exit', 'do show mls qos interface f0/3'], note: 'auto qos applies Cisco\'s recommended trust and queueing settings in one line. Convenient, and worth reading afterwards so you know what it decided on your behalf.' },
    { d: 'SW1', t: 'Compare the three ports side by side.', c: ['end', 'show mls qos interface f0/1', 'show mls qos interface f0/2', 'show mls qos interface g0/1'], note: 'Trusted, untrusted, trusted. Being able to point at where the boundary sits is the entire CCNA QoS design question.' },
    { d: 'SW1', t: 'Check the phone is powered as well as trusted.', c: ['show power inline'], note: 'Phones need power and priority. A QoS design that forgets PoE leaves you with a very well-prioritised dead phone.' },
    { d: 'PH1', t: 'Confirm the voice VLAN works end to end.', c: ['ipconfig', 'ping 10.0.150.1'], note: 'The phone lives in VLAN 150 with its own gateway on the router subinterface. Voice and data are separate networks sharing one cable.' },
    { d: 'PC1', t: 'And the data VLAN.', c: ['ipconfig', 'ping 10.0.10.1'], note: 'Same physical path, different VLAN, different priority. That is the design.' },
    { d: 'SW1', t: 'Read the configuration back and save.', c: ['show running-config', 'write memory'], note: 'The QoS lines should be exactly where you expect them: one global, one per port.' },
  ],
  verify: ['show mls qos', 'show mls qos interface f0/1', 'show interfaces status', 'show power inline', 'show running-config'],
  explain: `<h3>Why QoS exists</h3>
<p>QoS only matters when a link is congested. With spare capacity everything arrives quickly; once a queue builds, something must decide what goes first. Without QoS that decision is "whatever arrived first", which is fine for a file transfer and terrible for a phone call.</p>
<p>The four things traffic can suffer: <b>bandwidth</b> starvation, <b>delay</b> (latency), <b>jitter</b> (variation in delay) and <b>loss</b>. Cisco's targets for voice are the numbers to remember: one-way delay under <b>150 ms</b>, jitter under <b>30 ms</b>, loss under <b>1%</b>.</p>
<h3>Classification and marking</h3>
<p><b>Classification</b> is deciding what a packet is. <b>Marking</b> is writing that decision into the header so later devices do not have to work it out again.</p>
<ul>
<li><b>CoS</b> (Class of Service) — 3 bits in the 802.1Q tag, values 0-7. Layer 2 only, so it is lost the moment a router strips the tag. Voice is normally CoS 5.</li>
<li><b>DSCP</b> (Differentiated Services Code Point) — 6 bits in the IP header, values 0-63. Survives end to end because it lives at layer 3. Voice is <b>EF</b> (Expedited Forwarding, DSCP 46); call signalling is CS3 (24); video is AF41 (34); best effort is 0.</li>
</ul>
<h3>The trust boundary</h3>
<p>The trust boundary is the point where you stop believing what devices tell you about their own traffic. Phones and other managed devices sit inside it; user PCs sit outside. Push the boundary as close to the edge as you can, because a PC that can mark its own packets EF can starve your telephony from a desk.</p>
<p><code>mls qos trust cos|dscp</code> believes the arriving marking. <code>mls qos trust device cisco-phone</code> believes it only while CDP confirms a phone is attached. <code>no mls qos trust</code> plus <code>mls qos cos 0</code> overwrites whatever the device claimed.</p>
<h3>What happens to the traffic afterwards</h3>
<p><b>Queueing</b> — each port has several queues; markings decide which one a packet joins. <b>LLQ</b> (Low Latency Queueing) gives voice a strict-priority queue that is always served first. <b>Shaping</b> buffers traffic above a rate and sends it later — smooth, but adds delay. <b>Policing</b> drops or re-marks traffic above a rate immediately — no delay, but loss. Shape what you send, police what you receive, as a rule of thumb.</p>`,
  checks: [
    { desc: 'QoS is enabled globally on the switch', fn: H => H.d('SW1').qos.enabled },
    { desc: 'The uplink trusts DSCP', fn: H => H.i('SW1', 'g0/1').qosTrust === 'dscp' },
    { desc: 'The phone port uses conditional trust or CoS trust', fn: H => ['cos', 'device cisco-phone'].includes(H.i('SW1', 'f0/1').qosTrust) },
    { desc: 'The PC port is untrusted with a default CoS of 0', fn: H => !H.i('SW1', 'f0/2').qosTrust && H.i('SW1', 'f0/2').qosCos === 0 },
    { desc: 'The spare port had the auto QoS VoIP template applied', fn: H => !!H.i('SW1', 'f0/3').autoQos },
    { desc: 'The phone sits in the voice VLAN and the desk port has both', fn: H => H.access('SW1', 'f0/1', 150) && H.access('SW1', 'f0/2', 10) && H.i('SW1', 'f0/2').voiceVlan === 150 },
    { desc: 'The phone reaches its gateway in the voice VLAN', fn: H => H.ping('PH1', '10.0.150.1') },
    { desc: 'The PC reaches its gateway in the data VLAN', fn: H => H.ping('PC1', '10.0.10.1') },
    { desc: 'SW1 saved', fn: H => H.saved('SW1') },
  ],
});

/* ============================================================= */
L({
  id: 'd46-security-fundamentals', ord: 46, vol: 2, day: 'Day 46', title: 'Security Fundamentals & Device Hardening',
  topics: 'the CIA triad in practice · AAA · local accounts with privilege levels · login blocking · disabling unused services · password policy',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.10', mask: '255.255.255.0', gw: '10.0.0.1' } },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['SW1', 'g0/1', 'R1', 'g0/0']],
  layout: { PC1: [45, 60], SW1: [180, 60], R1: [310, 60] },
  setupAll: topo => {
    const i = ND.getIface(topo.devs.R1, 'g0/0'); i.ip = { addr: '10.0.0.1', mask: '255.255.255.0' }; i.shutdown = false;
    const svi = ND.getOrCreateIface(topo.devs.SW1, 'vlan1');
    svi.ip = { addr: '10.0.0.2', mask: '255.255.255.0' };
    topo.devs.SW1.defaultGateway = '10.0.0.1';
    topo.devs.R1.hostname = 'R1'; topo.devs.SW1.hostname = 'SW1';
  },
  intro: `<b>The situation:</b> two devices in their default state. Anyone with a console cable owns them, the web server is running, there is no record of who logged in, and an attacker can guess passwords all night at full speed.<br><b>Your goal:</b> harden them. Individual accounts instead of shared passwords, AAA pointing at the local database, a minimum password length, automatic blocking after repeated failures, and every service you do not use switched off. None of this is exotic — it is the checklist every device should have had applied before it ever carried traffic.`,
  tasks: [
    { t: 'Replace shared line passwords with individual user accounts', why: 'A shared password tells you nothing about WHO made a change. Individual accounts are the difference between an audit trail and a shrug.' },
    { t: 'Give accounts privilege levels so not everyone gets full control', why: 'Level 15 is full privileged access; level 1 is read-only user mode. A monitoring account does not need to be able to reload the device.' },
    { t: 'Enable AAA and point authentication at the local database', why: 'AAA — Authentication, Authorization, Accounting — is the framework. Pointing it at local accounts now means swapping in RADIUS or TACACS+ later is a one-line change.' },
    { t: 'Move the vty lines onto those accounts with login local', why: 'Without this the lines still use the old shared password, however many accounts you created. It is also a prerequisite for SSH.' },
    { t: 'Set a minimum password length', why: 'A policy enforced by the device beats a policy written in a document nobody reads.' },
    { t: 'Block logins automatically after repeated failures', why: 'login block-for turns an attacker\'s unlimited guessing into a handful of attempts per minute, which is the difference between minutes and years to brute-force.' },
    { t: 'Switch off the services you do not use — HTTP, HTTPS and CDP at the edge', why: 'Every running service is an attack surface. If you are not using the web interface, it should not be listening.' },
    { t: 'Repeat the whole hardening block on the switch and verify both', why: 'Hardening one device out of two is hardening nothing. The commands are identical, which is the point of drilling them twice.' },
  ],
  steps: [
    { d: 'R1', t: 'Look at the unprotected starting state.', c: ['enable', 'terminal length 0', 'show running-config', 'show login'], note: 'No accounts, no login protection, and the HTTP server running. This is what a device straight from the box looks like.' },
    { d: 'R1', t: 'Create individual accounts with different privilege levels.', c: ['configure terminal', 'username netadmin privilege 15 secret Adm1n-Str0ng-Pass', 'username monitor privilege 1 secret M0nitor-Pass', 'do show running-config'], note: 'Privilege 15 is full access; privilege 1 lands in user EXEC mode only. Note both use <code>secret</code>, so both are hashed rather than readable.' },
    { d: 'R1', t: 'Enable the AAA framework, and see the server-backed forms too.', c: ['aaa new-model', 'aaa authentication login default group tacacs+ local', 'do show running-config', 'aaa authentication login default group radius local', 'do show running-config', 'aaa authentication login default local', 'do show running-config'], note: 'AAA is Authentication (who are you), Authorization (what may you do) and Accounting (what did you do). Type all three forms: TACACS+ first, then RADIUS, then plain local. In every server-backed form <code>local</code> stays on the end as the fallback for when the server is unreachable — leave it off and a dead server locks you out of your own network.' },
    { d: 'R1', t: 'Move the console and vty lines onto those accounts.', c: ['line console 0', 'login local', 'exec-timeout 5 0', 'logging synchronous', 'exit', 'line vty 0 4', 'login local', 'exec-timeout 10 0', 'transport input ssh', 'exit'], note: '<code>transport input ssh</code> refuses Telnet outright — no clear-text management, even if somebody later sets a Telnet password by accident.' },
    { d: 'R1', t: 'Protect privileged mode and enforce a password policy.', c: ['enable secret Enable-Str0ng-Pass', 'security passwords min-length 10', 'service password-encryption', 'do show running-config'], note: 'The minimum length is enforced by the device from now on. service password-encryption hides the remaining clear-text passwords from a casual glance.' },
    { d: 'R1', t: 'Slow down anyone guessing passwords.', c: ['login block-for 30 attempts 5 within 30', 'do show login', 'no login block-for 30 attempts 5 within 30', 'do show login', 'login block-for 120 attempts 3 within 60', 'end', 'show login'], note: 'Set it one way, remove it, then settle on the values you want: three failures in 60 seconds locks logins for two minutes. It turns an unlimited brute-force attempt into a handful of guesses per minute.' },
    { d: 'R1', t: 'Switch off services you are not using.', c: ['configure terminal', 'no ip http server', 'no ip http secure-server', 'no ip domain-lookup', 'end', 'show running-config'], note: 'The web interface is a genuine attack surface and most engineers never use it. If you do not need a service, it should not be listening.' },
    { d: 'R1', t: 'Add a legal banner.', c: ['configure terminal', 'banner motd #WARNING: Authorised access only. All activity is logged and monitored.#', 'end', 'show running-config'], note: 'A banner is not technical protection — it is legal protection. Its absence has genuinely cost prosecutions.' },
    { d: 'SW1', t: 'Now the same hardening block on the switch, from memory if you can.', c: ['enable', 'terminal length 0', 'configure terminal', 'username netadmin privilege 15 secret Adm1n-Str0ng-Pass', 'username monitor privilege 1 secret M0nitor-Pass', 'aaa new-model', 'aaa authentication login default local', 'enable secret Enable-Str0ng-Pass', 'security passwords min-length 10', 'service password-encryption', 'login block-for 120 attempts 3 within 60'], note: 'Ten lines that should become one block in your memory. Every device you ever commission wants all of them.' },
    { d: 'SW1', t: 'Prove what AAA switches on by turning it off and back on.', c: ['no aaa new-model', 'do show running-config', 'aaa new-model', 'aaa authentication login default local', 'do show running-config'], note: 'With AAA off the lines fall back to their own login settings. Turning it off on a live device you are logged into remotely is a classic way to lock yourself out — practise it here, not there.' },
    { d: 'SW1', t: 'Finish the switch: lines, services and banner.', c: ['line console 0', 'login local', 'exec-timeout 5 0', 'exit', 'line vty 0 4', 'login local', 'transport input ssh', 'exit', 'no ip http server', 'no ip http secure-server', 'banner motd #WARNING: Authorised access only. All activity is logged and monitored.#', 'end', 'show login'], note: 'Identical on a switch. The only difference between hardening a switch and a router is the port-security work that follows.' },
    { d: 'SW1', t: 'Shut down the unused ports, which is the switch-specific part.', c: ['configure terminal', 'interface f0/1', 'description PC1-DESK', 'switchport mode access', 'exit', 'end', 'show interfaces status'], note: 'An unused live port is an open door in a meeting room. Describe what is in use, disable and park what is not.' },
    { d: 'R1', t: 'Verify the result on both devices.', c: ['show login', 'show running-config', 'write memory'], note: 'Read it as an auditor would: who can log in, how are they authenticated, what is listening, and what happens after failed attempts.' },
    { d: 'SW1', t: 'Save the switch.', c: ['write memory'] },
    { d: 'PC1', t: 'Confirm the network still works after all that.', c: ['ipconfig', 'ping 10.0.0.1', 'ping 10.0.0.2'], note: 'Hardening should be invisible to users. If it is not, you have broken something.' },
  ],
  verify: ['show running-config', 'show login', 'show interfaces status'],
  explain: `<h3>The vocabulary the exam uses</h3>
<p>The <b>CIA triad</b>: <em>Confidentiality</em> (only the right people can read it), <em>Integrity</em> (nobody altered it), <em>Availability</em> (it is there when needed). A <b>vulnerability</b> is a weakness, a <b>threat</b> is something that might exploit it, an <b>exploit</b> is the tool that does, and <b>risk</b> is the combination of likelihood and impact.</p>
<p>Attack types worth recognising: <b>DoS/DDoS</b> (overwhelm a service), <b>spoofing</b> (pretend to be another address), <b>reflection/amplification</b>, <b>man-in-the-middle</b> (ARP poisoning is the classic LAN example), <b>brute force</b> and <b>dictionary</b> password attacks, <b>phishing</b> and <b>social engineering</b> — the last of which defeats technical controls entirely and is why user training counts as a security measure.</p>
<h3>AAA</h3>
<p><b>Authentication</b> proves who you are. <b>Authorization</b> decides what you may do. <b>Accounting</b> records what you did. <code>aaa new-model</code> turns the framework on; <code>aaa authentication login default local</code> uses the device's own user database. In production that usually becomes a <b>RADIUS</b> (UDP 1812/1813, encrypts only the password, often used for network access and 802.1X) or <b>TACACS+</b> (TCP 49, encrypts the whole payload, separates the three As, used for device administration) server, with local accounts kept as the fallback for when the server is unreachable.</p>
<h3>Password hygiene on IOS</h3>
<p>Always <code>enable secret</code>, never <code>enable password</code> — the first is hashed, the second is readable. <code>username X secret Y</code> for the same reason. <code>service password-encryption</code> only applies weak type-7 encoding, which is trivially reversible; it stops shoulder-surfing and nothing more. <code>security passwords min-length</code> enforces a floor, and <code>login block-for</code> makes guessing expensive.</p>
<h3>The hardening checklist</h3>
<ol>
<li>Individual accounts with appropriate privilege levels; no shared passwords.</li>
<li>AAA enabled, local as the fallback.</li>
<li>SSH only — <code>transport input ssh</code> — never Telnet.</li>
<li>Enable secret set, password encryption on, minimum length enforced.</li>
<li>Login blocking after repeated failures, and exec-timeout on every line.</li>
<li>Unused services off: HTTP, HTTPS, and CDP on untrusted edges.</li>
<li>Unused ports shut and parked in a dead-end VLAN.</li>
<li>A legal banner, and central logging so there is a record afterwards.</li>
</ol>`,
  checks: [
    { desc: 'Both devices have individual accounts at two privilege levels', fn: H => ['R1', 'SW1'].every(d => { const u = H.d(d).users; return u.netadmin && u.netadmin.privilege === 15 && u.monitor && u.monitor.privilege === 1; }) },
    { desc: 'AAA is enabled with local authentication on both', fn: H => ['R1', 'SW1'].every(d => H.d(d).aaa.newModel && H.d(d).aaa.loginDefault === 'local') },
    { desc: 'The vty lines use the local accounts and accept SSH only', fn: H => ['R1', 'SW1'].every(d => H.d(d).lines.vty.loginLocal && H.d(d).lines.vty.transport === 'ssh') },
    { desc: 'Enable secret and password encryption set on both', fn: H => ['R1', 'SW1'].every(d => !!H.d(d).enableSecret && H.d(d).svcEnc) },
    { desc: 'A minimum password length is enforced', fn: H => ['R1', 'SW1'].every(d => H.d(d).services.minPassLen >= 10) },
    { desc: 'Login blocking is configured on both devices', fn: H => ['R1', 'SW1'].every(d => { const b = H.d(d).services.loginBlock; return !!b && b.attempts === 3 && b.blockFor === 120; }) },
    { desc: 'The HTTP and HTTPS servers are switched off', fn: H => ['R1', 'SW1'].every(d => !H.d(d).services.http && !H.d(d).services.httpSecure) },
    { desc: 'Both devices carry a warning banner', fn: H => ['R1', 'SW1'].every(d => !!H.d(d).banner) },
    { desc: 'The network still works for users', fn: H => H.ping('PC1', '10.0.0.1') && H.ping('PC1', '10.0.0.2') },
    { desc: 'Both devices saved', fn: H => ['R1', 'SW1'].every(d => H.saved(d)) },
  ],
});

/* ============================================================= */
L({
  id: 'd49-dai', ord: 49, vol: 2, day: 'Day 49', title: 'Dynamic ARP Inspection',
  topics: 'ARP poisoning · the DHCP snooping binding table · enabling DAI per VLAN · trusted uplinks · optional validation checks · rate limiting',
  devices: [
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: null, mask: null, gw: null, dhcp: true } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: null, mask: null, gw: null, dhcp: true } },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
  ],
  links: [['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2'], ['SW1', 'g0/1', 'R1', 'g0/0']],
  layout: { PC1: [35, 25], PC2: [35, 100], SW1: [165, 62], R1: [300, 62] },
  setupAll: topo => {
    const r1 = topo.devs.R1;
    const i = ND.getIface(r1, 'g0/0'); i.ip = { addr: '10.0.0.1', mask: '255.255.255.0' }; i.shutdown = false;
    r1.hostname = 'R1'; topo.devs.SW1.hostname = 'SW1';
    r1.dhcp.pools['LAN'] = { name: 'LAN', network: '10.0.0.0', mask: '255.255.255.0', router: '10.0.0.1', dns: '8.8.8.8', domain: null, lease: null };
    r1.dhcp.excluded.push(['10.0.0.1', '10.0.0.9']);
  },
  intro: `<b>The situation:</b> ARP has no security whatsoever. Any device can announce "I am the default gateway" and every host on the segment will believe it, sending their traffic to an attacker who quietly forwards it on. That is ARP poisoning, and it is the standard man-in-the-middle attack on a switched LAN.<br><b>Your goal:</b> stop it with <b>Dynamic ARP Inspection</b>. DAI checks every ARP message arriving on an untrusted port against the DHCP snooping binding table and drops anything that does not match. That dependency is the key fact: <b>DAI without DHCP snooping has nothing to check against</b>, which is why this lab configures both.`,
  tasks: [
    { t: 'Get the hosts working with DHCP first, so the binding table has something in it', why: 'DAI validates ARP against the snooping bindings. No leases, no bindings, nothing to validate — and every host loses connectivity.' },
    { t: 'Enable DHCP snooping on the VLAN and trust the uplink', why: 'The binding table is built by snooping DHCP traffic. It records IP, MAC, VLAN and port for every lease — exactly what DAI needs.' },
    { t: 'Enable Dynamic ARP Inspection on the same VLAN', why: 'DAI is enabled per VLAN, just like snooping. Both commands take a VLAN list, and both must cover the VLAN your hosts are in.' },
    { t: 'Trust the uplink for ARP inspection as well as for snooping', why: 'The uplink carries legitimate ARP from the router and the rest of the network. Leave it untrusted and you will inspect — and drop — your own gateway.' },
    { t: 'Confirm the access ports are untrusted, which is the default and the point', why: 'Untrusted ports are where users plug in, and where an attacker would. Those are exactly the ports whose ARP you want checked.' },
    { t: 'Add the optional validation checks for source MAC, destination MAC and IP', why: 'By default DAI only checks the IP-to-MAC binding inside the ARP body. The extra checks compare it with the Ethernet header and reject impossible addresses.' },
    { t: 'Rate-limit ARP on the access ports', why: 'ARP is a broadcast. A flood of it is a denial of service, so untrusted ports get a packets-per-second cap and err-disable if it is exceeded.' },
    { t: 'Verify with show ip arp inspection and confirm hosts still work', why: 'Security that breaks the users gets switched off by Monday. Always confirm normal traffic survives.' },
  ],
  steps: [
    { d: 'R1', t: 'Confirm the DHCP service the hosts depend on.', c: ['enable', 'terminal length 0', 'show running-config', 'show ip dhcp binding'], note: 'A pool covering 10.0.0.0/24 with the first nine addresses excluded for infrastructure. No leases yet.' },
    { d: 'PC1', t: 'Lease an address.', c: ['ipconfig /renew', 'ipconfig'], note: 'A normal DORA exchange. The switch is watching it — that is how the binding table gets built.' },
    { d: 'PC2', t: 'And the second host.', c: ['ipconfig /renew', 'ipconfig'], note: 'Two hosts, two leases, two bindings. This is the data DAI will validate every ARP message against.' },
    { d: 'SW1', t: 'Turn on DHCP snooping, the foundation DAI stands on.', c: ['enable', 'terminal length 0', 'configure terminal', 'ip dhcp snooping', 'ip dhcp snooping vlan 1', 'do show ip dhcp snooping'], note: 'Two commands: enable globally, then scope it to a VLAN. Neither alone does anything useful — a favourite exam trap.' },
    { d: 'SW1', t: 'Trust the uplink for snooping.', c: ['interface g0/1', 'ip dhcp snooping trust', 'exit', 'do show ip dhcp snooping'], note: 'Only the uplink may carry DHCP server messages. A rogue server on a desk port would have its offers dropped on arrival.' },
    { d: 'SW1', t: 'Look at ARP inspection before enabling it.', c: ['do show ip arp inspection'], note: 'No VLANs configured, every port untrusted and inspecting nothing. Note the three validation checks are all disabled by default.' },
    { d: 'SW1', t: 'Enable DAI on the VLAN, then switch it off and on again.', c: ['ip arp inspection vlan 1', 'do show ip arp inspection', 'no ip arp inspection vlan 1', 'do show ip arp inspection', 'ip arp inspection vlan 1', 'do show ip arp inspection'], note: 'The VLAN now reads Enabled and Active. Every ARP message on an untrusted port in VLAN 1 is checked against the snooping bindings from here on.' },
    { d: 'SW1', t: 'Trust the uplink for ARP inspection too — and practise the "no" form.', c: ['interface g0/1', 'ip arp inspection trust', 'do show ip arp inspection interfaces', 'no ip arp inspection trust', 'do show ip arp inspection interfaces', 'ip arp inspection trust', 'exit', 'do show ip arp inspection interfaces'], note: 'The router\'s ARP is legitimate and has no DHCP binding — it is statically addressed. Forget this line and DAI drops your own gateway\'s ARP, taking the LAN down.' },
    { d: 'SW1', t: 'Add the optional validation checks.', c: ['ip arp inspection validate src-mac', 'do show ip arp inspection', 'no ip arp inspection validate', 'do show ip arp inspection', 'ip arp inspection validate src-mac dst-mac ip', 'do show ip arp inspection'], note: 'Watch the middle of that sequence: naming one check REPLACES the list rather than adding to it, and the &quot;no&quot; form clears the lot — so always type every check you want in a single command. src-mac and dst-mac compare the ARP body with the Ethernet header; ip rejects impossible addresses such as 0.0.0.0 and multicast.' },
    { d: 'SW1', t: 'Rate-limit ARP on the access ports.', c: ['interface range f0/1 - 2', 'ip arp inspection limit rate 10', 'exit', 'do show ip arp inspection interfaces'], note: 'Ten ARP packets per second is generous for a PC and hostile to a flooder. Exceed it and the port err-disables — recovered with shutdown then no shutdown.' },
    { d: 'SW1', t: 'Park the unused port safely.', c: ['interface f0/3', 'description UNUSED', 'switchport mode access', 'shutdown', 'end', 'show interfaces status'], note: 'The port an attacker would use is the one nobody is watching. Shut what is not in use.' },
    { d: 'PC1', t: 'Confirm legitimate hosts are unaffected.', c: ['ipconfig /renew', 'ping 10.0.0.1'], note: 'The lease renews and the gateway answers. PC1\'s ARP matches its binding, so DAI permits it.' },
    { d: 'PC2', t: 'And the second host, including host-to-host.', c: ['ipconfig', 'ping 10.0.0.1'], note: 'Normal traffic is untouched. DAI only drops ARP that contradicts the binding table — which is precisely what an attacker must send.' },
    { d: 'SW1', t: 'Final verification and save.', c: ['show ip arp inspection', 'show ip dhcp snooping', 'show running-config', 'write memory'], note: 'Read the two outputs together: snooping builds the table, DAI enforces it. Neither is much use without the other.' },
  ],
  verify: ['show ip arp inspection', 'show ip arp inspection interfaces', 'show ip dhcp snooping', 'show interfaces status'],
  explain: `<h3>The attack</h3>
<p>ARP has no authentication. A host asks "who has 10.0.0.1?" and believes the first answer it receives — and it will even believe an unsolicited one (a "gratuitous" ARP). An attacker sends a stream of replies claiming the gateway's IP belongs to the attacker's MAC. Every host updates its cache, sends its traffic to the attacker, and the attacker forwards it on to the real gateway so nothing appears broken. That is a <b>man-in-the-middle</b>, and it needs no privileges beyond a network cable.</p>
<h3>How DAI stops it</h3>
<p>Dynamic ARP Inspection intercepts every ARP message on an <b>untrusted</b> port and checks the sender's IP-to-MAC claim against the <b>DHCP snooping binding table</b>. Matches are forwarded; mismatches are dropped and logged. Trusted ports are not inspected at all.</p>
<p>The dependency is the exam's favourite point: <b>DAI relies on DHCP snooping.</b> No snooping means no bindings, and with no bindings every ARP on an untrusted port fails the check. For statically-addressed devices that never use DHCP you need an ARP ACL (<code>arp access-list</code>) instead, or a trusted port.</p>
<h3>The commands</h3>
<ul>
<li><code>ip arp inspection vlan 1</code> — enable per VLAN, exactly like DHCP snooping.</li>
<li><code>ip arp inspection trust</code> — per interface; uplinks and ports toward other switches and routers.</li>
<li><code>ip arp inspection validate src-mac dst-mac ip</code> — optional extra checks, all off by default. Note that re-issuing this command REPLACES the previous list rather than adding to it.</li>
<li><code>ip arp inspection limit rate 10</code> — packets per second on untrusted ports; exceeding it err-disables the port.</li>
<li><code>show ip arp inspection</code> — VLAN status, validation settings and per-port trust.</li>
</ul>
<h3>Where it sits among the other port protections</h3>
<p><b>Port security</b> limits MAC addresses per port (layer 2 identity). <b>DHCP snooping</b> stops rogue DHCP servers and builds the binding table. <b>DAI</b> stops ARP spoofing using that table. <b>IP Source Guard</b> goes one step further and drops IP packets whose source address does not match the binding. They are designed to be layered, and all four are configured per port or per VLAN on the access switch — as close to the user as you can get.</p>`,
  checks: [
    { desc: 'DHCP snooping is enabled and scoped to the VLAN', fn: H => H.d('SW1').dhcp.snooping.enabled && H.d('SW1').dhcp.snooping.vlans.includes(1) },
    { desc: 'The uplink is trusted for DHCP snooping', fn: H => H.i('SW1', 'g0/1').snoopTrust },
    { desc: 'Dynamic ARP Inspection is enabled on the VLAN', fn: H => H.d('SW1').arai.vlans.includes(1) },
    { desc: 'The uplink is trusted for ARP inspection', fn: H => H.i('SW1', 'g0/1').araiTrust },
    { desc: 'The access ports remain untrusted', fn: H => !H.i('SW1', 'f0/1').araiTrust && !H.i('SW1', 'f0/2').araiTrust },
    { desc: 'All three optional validation checks are enabled', fn: H => ['src-mac', 'dst-mac', 'ip'].every(v => H.d('SW1').arai.validate.includes(v)) },
    { desc: 'ARP rate limiting is applied to both access ports', fn: H => ['f0/1', 'f0/2'].every(p => H.i('SW1', p).araiRate === 10) },
    { desc: 'The unused port is shut down', fn: H => H.i('SW1', 'f0/3').shutdown },
    { desc: 'Both hosts still lease addresses and reach the gateway', fn: H => H.ping('PC1', '10.0.0.1') && H.ping('PC2', '10.0.0.1') },
    { desc: 'SW1 saved', fn: H => H.saved('SW1') },
  ],
});

/* ============================================================= */
L({
  id: 'd50-architectures', ord: 50, vol: 2, day: 'Days 50-52', title: 'LAN, WAN & Cloud Architectures',
  topics: 'two-tier and three-tier designs · collapsed core · access/distribution roles · WAN options · leased line, MPLS and internet VPN · virtualization and cloud service models',
  devices: [
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.1.10.10', mask: '255.255.255.0', gw: '10.1.10.1' } },
    { id: 'ACC1', type: 'switch', ifaces: ['f0/1', 'g0/1', 'g0/2'] },
    { id: 'DIST', type: 'switch', ifaces: ['g0/1', 'g0/2', 'g0/3'], l3switch: true },
    { id: 'EDGE', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'ISP', type: 'router', ifaces: ['g0/0'] },
  ],
  links: [['PC1', 'e0', 'ACC1', 'f0/1'], ['ACC1', 'g0/1', 'DIST', 'g0/1'], ['ACC1', 'g0/2', 'DIST', 'g0/2'], ['DIST', 'g0/3', 'EDGE', 'g0/0'], ['EDGE', 'g0/1', 'ISP', 'g0/0']],
  layout: { PC1: [30, 30], ACC1: [125, 30], DIST: [235, 30], EDGE: [235, 115], ISP: [345, 115] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    set('EDGE', 'g0/0', '10.1.99.2', '255.255.255.252');
    set('EDGE', 'g0/1', '203.0.113.2', '255.255.255.252');
    set('ISP', 'g0/0', '203.0.113.1', '255.255.255.252');
    topo.devs.ACC1.hostname = 'ACC1'; topo.devs.DIST.hostname = 'DIST';
    topo.devs.EDGE.hostname = 'EDGE'; topo.devs.ISP.hostname = 'ISP';
    topo.devs.ACC1.vlans[10] = { name: 'USERS' };
    topo.devs.DIST.vlans[10] = { name: 'USERS' };
    topo.devs.ISP.staticRoutes.push({ net: '10.1.0.0', mask: '255.255.0.0', via: '203.0.113.2', ad: 1 });
  },
  intro: `<b>The situation:</b> the same handful of devices you have been configuring all course, arranged the way a real campus is arranged — an <b>access</b> switch where users plug in, a <b>distribution</b> switch doing the routing between VLANs, an <b>edge</b> router facing the provider, and the provider itself.<br><b>Your goal:</b> build a small collapsed-core design and see why the roles exist. You will dual-link the access switch to the distribution layer and bundle those links, route between VLANs on the distribution switch, and point a default route at the ISP. Along the way the explanation covers the WAN options, virtualization and the cloud service models — the theory chapters that this configuration gives a shape to.`,
  tasks: [
    { t: 'Build the access layer: a user VLAN, an access port and the edge protections that belong there', why: 'The access layer is where users, phones and access points connect. Port security, portfast and BPDU guard all live here and nowhere else.' },
    { t: 'Dual-link the access switch to the distribution switch and bundle the links', why: 'Every access switch should have two uplinks to two distribution devices. Bundling them into an EtherChannel means both carry traffic instead of one sitting blocked by spanning tree.' },
    { t: 'Make the distribution switch the routing layer with an SVI for the user VLAN', why: 'In a collapsed-core design the distribution switch is the boundary between layer 2 and layer 3 — the default gateway for every user VLAN.' },
    { t: 'Connect the distribution layer to the edge router with a routed link', why: 'Above the distribution layer everything is routed. A routed link between them means no spanning tree and no VLANs to worry about.' },
    { t: 'Point a default route at the provider, and a route back down to the campus', why: 'The edge router knows the internet is "that way" and the campus is "this way". Two routes are the whole of a small site\'s routing table.' },
    { t: 'Prove a user can reach the provider through all four devices', why: 'Access to distribution to edge to ISP. If a packet completes that journey, your design works.' },
    { t: 'Read the explanation on WAN options, virtualization and cloud models', why: 'Chapters 16 and 17 are examined as concepts rather than configuration, but the vocabulary appears in questions about this exact topology.' },
  ],
  steps: [
    { d: 'ACC1', t: 'Build the access layer.', c: ['enable', 'terminal length 0', 'configure terminal', 'vlan 10', 'name USERS', 'exit', 'interface f0/1', 'description USER-DESK-PORT', 'switchport mode access', 'switchport access vlan 10', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit'], note: 'Access layer job description in five lines: put the user in a VLAN, come up instantly, and refuse to let anyone plug in a switch.' },
    { d: 'ACC1', t: 'Add port security, which also belongs at the edge.', c: ['interface f0/1', 'switchport port-security', 'switchport port-security maximum 2', 'switchport port-security mac-address sticky', 'switchport port-security violation restrict', 'exit', 'do show port-security'], note: 'Maximum 2 allows a PC behind an IP phone. Restrict drops the offending traffic and logs it rather than shutting the port down.' },
    { d: 'ACC1', t: 'Bundle the two uplinks to the distribution switch.', c: ['interface range g0/1 - 2', 'channel-group 1 mode active', 'exit', 'interface port-channel 1', 'switchport mode trunk', 'switchport trunk allowed vlan 10', 'end', 'show etherchannel summary'], note: 'LACP active on both members. Without the bundle, spanning tree would block one of the two links and you would pay for a cable you never use.' },
    { d: 'DIST', t: 'Match the bundle on the distribution side.', c: ['enable', 'terminal length 0', 'configure terminal', 'vlan 10', 'name USERS', 'exit', 'interface range g0/1 - 2', 'channel-group 1 mode active', 'exit', 'interface port-channel 1', 'switchport mode trunk', 'switchport trunk allowed vlan 10', 'end', 'show etherchannel summary'], note: 'Both ends must agree. A bundle configured on one side only leaves the links flapping or blocked.' },
    { d: 'DIST', t: 'Make the distribution switch the routing layer.', c: ['configure terminal', 'ip routing', 'interface vlan 10', 'ip address 10.1.10.1 255.255.255.0', 'no shutdown', 'exit', 'end', 'show ip interface brief'], note: 'The SVI is the users\' default gateway. This is the layer-2 to layer-3 boundary of the whole campus.' },
    { d: 'DIST', t: 'Use a routed port up to the edge router.', c: ['configure terminal', 'interface g0/3', 'description ROUTED-LINK-TO-EDGE', 'no switchport', 'ip address 10.1.99.1 255.255.255.252', 'no shutdown', 'end', 'show ip interface brief'], note: 'Above the distribution layer, everything is routed. No VLANs, no spanning tree, no trunk to misconfigure.' },
    { d: 'DIST', t: 'Point everything unknown at the edge router.', c: ['configure terminal', 'ip route 0.0.0.0 0.0.0.0 10.1.99.2', 'end', 'show ip route'], note: 'A default route is the whole of a distribution switch\'s upstream routing. Anything not local goes to the edge.' },
    { d: 'EDGE', t: 'Give the edge router its two routes.', c: ['enable', 'terminal length 0', 'configure terminal', 'ip route 0.0.0.0 0.0.0.0 203.0.113.1', 'ip route 10.1.10.0 255.255.255.0 10.1.99.1', 'end', 'show ip route'], note: 'Out to the provider, back down to the campus. Two lines, and a small site is routed.' },
    { d: 'EDGE', t: 'Confirm both directions from the edge.', c: ['ping 203.0.113.1', 'ping 10.1.10.1'], note: 'Provider one way, campus the other. The edge sits between two worlds and must reach both.' },
    { d: 'PC1', t: 'Prove the whole path works from a user desk.', c: ['ipconfig', 'ping 10.1.10.1', 'ping 203.0.113.1', 'tracert 203.0.113.1'], note: 'Gateway on the distribution switch, then the edge router, then the provider. The trace shows the layer-3 hops — the access switch stays invisible, as a layer-2 device should.' },
    { d: 'ACC1', t: 'Verify and save the access layer.', c: ['show etherchannel summary', 'show interfaces status', 'write memory'] },
    { d: 'DIST', t: 'And the distribution layer.', c: ['show ip route', 'show etherchannel summary', 'write memory'] },
    { d: 'EDGE', t: 'And the edge.', c: ['show ip route', 'write memory'] },
  ],
  verify: ['show etherchannel summary', 'show ip route', 'show ip interface brief', 'show interfaces status', 'show port-security'],
  explain: `<h3>The hierarchical campus</h3>
<p><b>Three-tier</b> — access, distribution, core. The <em>access</em> layer connects end devices and does port security, portfast, PoE and VLAN assignment. The <em>distribution</em> layer aggregates access switches, routes between VLANs, and applies policy. The <em>core</em> layer moves traffic between distribution blocks as fast as it can, and does as little else as possible. Used in large campuses with many buildings.</p>
<p><b>Two-tier (collapsed core)</b> — the distribution and core roles merge into one layer, which is what you built here. This is the right answer for most single-site organisations, and the most common CCNA design question.</p>
<p><b>SOHO</b> — a single box that is switch, router, firewall, wireless access point and DHCP server at once. The functions are the same; they are simply not separated.</p>
<p>Two design rules worth remembering: every access switch should have <b>two uplinks to two different distribution switches</b>, and the layer-2 to layer-3 boundary normally sits at the distribution layer.</p>
<h3>WAN options</h3>
<ul>
<li><b>Leased line</b> — a dedicated point-to-point circuit. Predictable, private, expensive, and it scales badly: connecting n sites fully needs n(n−1)/2 circuits.</li>
<li><b>MPLS</b> — a provider-managed network where your sites all connect to the provider's cloud. Any-to-any connectivity, quality-of-service guarantees, no encryption by default.</li>
<li><b>Internet VPN</b> — an encrypted tunnel over ordinary internet connections. Cheap and quick, with no bandwidth guarantee. <em>Site-to-site</em> IPsec joins offices permanently; <em>remote-access</em> VPN connects individual users; <b>GRE</b> tunnels carry multicast and routing protocols but do not encrypt, so GRE-over-IPsec is common. <b>DMVPN</b> builds spoke-to-spoke tunnels dynamically, and <b>SD-WAN</b> adds central policy and automatic path selection over whatever circuits you have.</li>
<li><b>Broadband and cellular</b> — cable, fibre-to-the-premises and 4G/5G, usually as a backup circuit with a floating static route.</li>
</ul>
<h3>Virtualization</h3>
<p>A <b>hypervisor</b> runs several virtual machines on one physical server, each with its own operating system and virtual NICs connected to a virtual switch. <b>Type 1</b> hypervisors run on bare metal (ESXi, Hyper-V); <b>Type 2</b> run on top of a desktop OS (VirtualBox, Fusion). <b>Containers</b> go further by sharing the host kernel — far lighter, far faster to start, less isolated.</p>
<h3>Cloud service and deployment models</h3>
<p><b>SaaS</b> — you use the application (email, CRM). <b>PaaS</b> — you deploy your code onto a managed platform. <b>IaaS</b> — you rent virtual machines and networks and manage everything above the hypervisor. The rule of thumb: the further down you go, the more control you get and the more you have to run yourself.</p>
<p>Deployment models are <b>public</b>, <b>private</b>, <b>hybrid</b> and <b>community</b>. Cloud's defining characteristics are on-demand self-service, broad network access, resource pooling, rapid elasticity and measured (pay-per-use) service. Connectivity options run from plain internet VPN through to a dedicated private circuit such as Direct Connect or ExpressRoute.</p>`,
  checks: [
    { desc: 'The user VLAN exists on both switches', fn: H => H.vlanExists('ACC1', 10) && H.vlanExists('DIST', 10) },
    { desc: 'The access port has portfast and BPDU guard', fn: H => !!H.i('ACC1', 'f0/1').stpPortfast && !!H.i('ACC1', 'f0/1').bpduguard },
    { desc: 'Port security allows a phone plus a PC and restricts violations', fn: H => { const ps = H.i('ACC1', 'f0/1').portSec; return !!ps && ps.enabled && ps.max === 2 && ps.violation === 'restrict'; } },
    { desc: 'Both uplinks are bundled with LACP on both ends', fn: H => ['ACC1', 'DIST'].every(d => ['g0/1', 'g0/2'].every(p => { const cg = H.i(d, p).channelGroup; return cg && cg.id === 1 && cg.mode === 'active'; })) },
    { desc: 'The bundle is a trunk carrying the user VLAN', fn: H => ['ACC1', 'DIST'].every(d => H.i(d, 'po1').swMode === 'trunk') },
    { desc: 'The distribution switch routes and hosts the user gateway', fn: H => H.d('DIST').ipRouting && H.hasIp('DIST', 'vlan10', '10.1.10.1', '255.255.255.0') },
    { desc: 'The link up to the edge router is a routed port', fn: H => H.i('DIST', 'g0/3').noSwitchport && H.hasIp('DIST', 'g0/3', '10.1.99.1', '255.255.255.252') },
    { desc: 'Default routes point upstream from both layers', fn: H => H.d('DIST').staticRoutes.some(r => r.net === '0.0.0.0') && H.d('EDGE').staticRoutes.some(r => r.net === '0.0.0.0') },
    { desc: 'The edge router can route back down to the campus', fn: H => H.d('EDGE').staticRoutes.some(r => r.net === '10.1.10.0') },
    { desc: 'A user reaches the provider through all four devices', fn: H => H.ping('PC1', '203.0.113.1') },
    { desc: 'All three managed devices saved', fn: H => ['ACC1', 'DIST', 'EDGE'].every(d => H.saved(d)) },
  ],
});

/* ============================================================= */
L({
  id: 'd53-wireless', ord: 53, vol: 2, day: 'Days 53-56', title: 'Wireless LANs',
  topics: 'SSID, BSS and ESS · 2.4 / 5 / 6 GHz and channels · autonomous vs lightweight APs and the WLC · CAPWAP · WPA2/WPA3, PSK and 802.1X · the switch-side configuration an AP needs',
  devices: [
    { id: 'AP1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.90.10', mask: '255.255.255.0', gw: '10.0.90.1' }, poeDevice: 'AIR-CAP2702I' },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0'] },
    { id: 'WLC', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.90.5', mask: '255.255.255.0', gw: '10.0.90.1' } },
  ],
  links: [['AP1', 'e0', 'SW1', 'f0/1'], ['WLC', 'e0', 'SW1', 'f0/2'], ['SW1', 'g0/1', 'R1', 'g0/0']],
  layout: { AP1: [35, 25], WLC: [35, 100], SW1: [165, 62], R1: [300, 62] },
  setupAll: topo => {
    const r1 = topo.devs.R1;
    const i = ND.getIface(r1, 'g0/0'); i.shutdown = false;
    const sub = (v, ip) => { const s = ND.getOrCreateIface(r1, 'g0/0.' + v); s.encapDot1q = { vlan: v, native: false }; s.ip = { addr: ip, mask: '255.255.255.0' }; };
    sub(90, '10.0.90.1'); sub(20, '10.0.20.1'); sub(30, '10.0.30.1');
    r1.hostname = 'R1'; topo.devs.SW1.hostname = 'SW1';
    // the switch starts blank: the VLANs and the trunk are yours to build
  },
  intro: `<b>The situation:</b> a lightweight access point and a wireless LAN controller need to go onto the network, and two new wireless networks — staff and guest — need somewhere to land.<br><b>Your goal:</b> do the part of wireless that happens on the <b>command line</b>, which is the switch side: a management VLAN for the AP, PoE to power it, a trunk carrying the user VLANs, and the controller reachable. The wireless configuration itself — SSIDs, security policies, RF settings — is done in the WLC's web interface, so the explanation below walks through that in full, along with the radio and security theory the exam tests.`,
  tasks: [
    { t: 'Create the VLANs a wireless deployment needs: AP management, staff and guest', why: 'Guest traffic must never share a VLAN with staff traffic. The separation happens on the wired side, and the SSIDs are simply mapped onto it.' },
    { t: 'Power the access point over Ethernet and confirm it is drawing power', why: 'APs are usually mounted in ceilings where there is no power socket. PoE is not an optional extra — it is how the AP turns on.' },
    { t: 'Configure the AP port correctly for a lightweight AP', why: 'A lightweight AP tunnels all user traffic to the controller inside CAPWAP, so its switch port only needs the management VLAN — an access port, not a trunk.' },
    { t: 'Put the controller on the management VLAN and make sure the AP can reach it', why: 'An AP with no controller sits there flashing. The CAPWAP tunnel between them carries both management and, in local mode, user traffic.' },
    { t: 'Make the uplink a trunk carrying all three VLANs', why: 'The controller places user traffic into the staff and guest VLANs, so those VLANs must exist on the path between the controller and the router.' },
    { t: 'Give each wireless VLAN a gateway on the router', why: 'Wireless clients are ordinary IP hosts once their traffic leaves the tunnel. They need a default gateway like anyone else.' },
    { t: 'Verify power, VLANs, trunking and reachability, then read the wireless theory', why: 'Everything CLI-configurable in CCNA wireless is on this switch. The rest is the WLC GUI, covered in the explanation.' },
  ],
  steps: [
    { d: 'SW1', t: 'Create the three VLANs a wireless deployment needs.', c: ['enable', 'terminal length 0', 'configure terminal', 'vlan 90', 'name AP-MGMT', 'vlan 20', 'name WIFI-STAFF', 'vlan 30', 'name WIFI-GUEST', 'exit', 'do show vlan brief'], note: 'Management for the infrastructure, one VLAN per SSID for the users. Guest traffic stays separate from staff traffic from the very first hop.' },
    { d: 'SW1', t: 'Configure the access point\'s port.', c: ['interface f0/1', 'description LIGHTWEIGHT-AP-CEILING-1', 'switchport mode access', 'switchport access vlan 90', 'power inline auto', 'spanning-tree portfast', 'exit', 'do show interfaces status'], note: 'An ACCESS port in the management VLAN. A lightweight AP wraps all client traffic in CAPWAP and sends it to the controller, so the port never sees the user VLANs. An autonomous AP would need a trunk instead — a favourite exam distinction.' },
    { d: 'SW1', t: 'Confirm the AP is actually being powered.', c: ['end', 'show power inline'], note: 'Fa0/1 shows the AP drawing power and its class. An AP that will not boot is a PoE budget question before it is a wireless question.' },
    { d: 'SW1', t: 'Connect the wireless LAN controller.', c: ['configure terminal', 'interface f0/2', 'description WLC-MANAGEMENT', 'switchport mode access', 'switchport access vlan 90', 'exit', 'do show interfaces status'], note: 'In this lab the controller sits in the same management VLAN as the AP. In a real deployment it is often central, with CAPWAP tunnels arriving from every site.' },
    { d: 'SW1', t: 'Trunk the uplink so the user VLANs can reach their gateways.', c: ['interface g0/1', 'description UPLINK-TO-ROUTER', 'switchport mode trunk', 'switchport trunk allowed vlan 20,30,90', 'switchport nonegotiate', 'end', 'show interfaces trunk'], note: 'Three VLANs on the trunk: the two wireless user networks plus management. The controller places each SSID\'s traffic into its VLAN, and it travels from there as ordinary tagged Ethernet.' },
    { d: 'R1', t: 'Check the gateways for each wireless VLAN.', c: ['enable', 'terminal length 0', 'show ip interface brief', 'show running-config'], note: 'Three subinterfaces, one per VLAN — router-on-a-stick again. Wireless clients are ordinary IP hosts the moment their traffic leaves the CAPWAP tunnel.' },
    { d: 'AP1', t: 'Confirm the access point has network connectivity.', c: ['ipconfig', 'ping 10.0.90.1'], note: 'The AP needs an address, a gateway and a route to its controller. Get those three right and the CAPWAP tunnel builds itself.' },
    { d: 'AP1', t: 'And that it can reach its controller.', c: ['ping 10.0.90.5'], note: 'CAPWAP uses UDP 5246 for control and 5247 for data. If the AP cannot reach the controller it will keep rebooting and searching.' },
    { d: 'WLC', t: 'Check the controller side of the same path.', c: ['ipconfig', 'ping 10.0.90.10', 'ping 10.0.90.1'], note: 'Controller to AP, and controller to gateway. With this working, the rest of the configuration happens in the controller\'s web interface — the part of CCNA wireless that is not CLI.' },
    { d: 'SW1', t: 'Verify the whole switch-side build and save.', c: ['show vlan brief', 'show interfaces trunk', 'show power inline', 'show interfaces status', 'write memory'], note: 'VLANs, trunk, power and port modes. That is every wireless-related command CCNA expects you to type on a switch.' },
  ],
  verify: ['show vlan brief', 'show interfaces status', 'show interfaces trunk', 'show power inline', 'show ip interface brief'],
  explain: `<h3>The vocabulary</h3>
<p><b>SSID</b> is the network name people see. <b>BSSID</b> is the MAC address of a radio, which is how a client actually identifies an AP. A <b>BSS</b> is one AP's coverage area; an <b>ESS</b> is several APs sharing one SSID so clients can roam between them. An <b>ad hoc</b> (IBSS) network has no AP at all, and a <b>mesh</b> uses a wireless backhaul between APs where cabling is impossible.</p>
<p>Wireless is a <b>half-duplex, shared medium</b> — only one device may transmit at a time in a given channel and area. Because stations cannot hear collisions while transmitting, 802.11 uses <b>CSMA/CA</b>: listen, wait a random backoff, then send, and expect an acknowledgement for every frame.</p>
<h3>Bands and channels</h3>
<p><b>2.4 GHz</b> — better range, better wall penetration, only <b>three</b> non-overlapping 20 MHz channels (<b>1, 6, 11</b>), and shared with microwaves, Bluetooth and everything else. <b>5 GHz</b> — many more non-overlapping channels, more bandwidth, shorter range. <b>6 GHz</b> — added by Wi-Fi 6E, huge amounts of clean spectrum, shortest range.</p>
<p>Standards in order: 802.11b and g (2.4), a (5), <b>n</b> / Wi-Fi 4 (both, MIMO), <b>ac</b> / Wi-Fi 5 (5 GHz), <b>ax</b> / Wi-Fi 6 and 6E (both, plus 6 GHz). Neighbouring APs must use non-overlapping channels, or they interfere and both slow down.</p>
<h3>Autonomous versus lightweight, and the controller</h3>
<p>An <b>autonomous AP</b> holds its own configuration and bridges each SSID onto a VLAN locally — so its switch port must be a <b>trunk</b>. It does not scale: fifty APs means fifty configurations.</p>
<p>A <b>lightweight AP</b> holds almost nothing and is managed by a <b>WLC</b> (Wireless LAN Controller). It builds a <b>CAPWAP</b> tunnel to the controller — UDP <b>5246</b> for control (encrypted with DTLS) and <b>5247</b> for data — and the controller handles configuration, RF management, client authentication and roaming centrally. Because client traffic rides inside that tunnel, the AP's switch port is a plain <b>access port in the management VLAN</b>, which is exactly what you configured above.</p>
<p>AP modes: <b>local</b> (the default, traffic tunnelled back to the controller), <b>FlexConnect</b> (traffic switched locally at a branch, with the controller central), <b>monitor</b>, <b>sniffer</b> and <b>rogue detector</b>. Controllers can be appliances, virtual machines, cloud-hosted (Meraki), or embedded in the APs themselves (Mobility Express).</p>
<h3>Wireless security</h3>
<p>The generations: <b>WEP</b> is broken and must never be used. <b>WPA</b> added TKIP as a stopgap. <b>WPA2</b> uses AES-CCMP and is the current baseline. <b>WPA3</b> adds SAE (which fixes the offline dictionary attack against pre-shared keys), forward secrecy and protected management frames.</p>
<p>Two authentication styles: <b>Personal (PSK)</b> — one shared password for everyone, fine for a home or a guest network; and <b>Enterprise (802.1X/EAP)</b> — each user authenticates individually to a RADIUS server, which is what any organisation should use. The pieces are the <em>supplicant</em> (the client), the <em>authenticator</em> (the AP or WLC) and the <em>authentication server</em> (RADIUS).</p>
<h3>Configuring a WLAN on the controller (the GUI part)</h3>
<ol>
<li>Create the dynamic <b>interface</b> and map it to the VLAN the SSID should land in — VLAN 20 for staff, VLAN 30 for guest here.</li>
<li>Create the <b>WLAN</b>: SSID name, profile name, and enable it.</li>
<li>Set <b>security</b>: WPA2 or WPA3, then PSK for guest or 802.1X with a RADIUS server for staff.</li>
<li>Choose the <b>interface/VLAN</b> the WLAN maps to.</li>
<li>Set QoS (platinum for voice, silver for data) and any advanced options such as band select or client limits.</li>
<li>Apply, then confirm the SSID is broadcasting and a client can associate and get a DHCP address.</li>
</ol>
<p>Guest networks usually add a <b>web/captive portal</b> and are anchored to a DMZ controller so guest traffic never touches the internal network at all.</p>`,
  checks: [
    { desc: 'All three wireless VLANs exist', fn: H => [20, 30, 90].every(v => H.vlanExists('SW1', v)) },
    { desc: 'The AP port is an access port in the management VLAN', fn: H => H.access('SW1', 'f0/1', 90) },
    { desc: 'The AP port supplies PoE and comes up instantly', fn: H => H.i('SW1', 'f0/1').poe === 'auto' && !!H.i('SW1', 'f0/1').stpPortfast },
    { desc: 'The controller sits in the management VLAN too', fn: H => H.access('SW1', 'f0/2', 90) },
    { desc: 'The uplink trunks all three VLANs with DTP disabled', fn: H => { const i = H.i('SW1', 'g0/1'); return i.swMode === 'trunk' && i.nonegotiate && i.allowed && [20, 30, 90].every(v => i.allowed.includes(v)); } },
    { desc: 'The AP reaches its gateway', fn: H => H.ping('AP1', '10.0.90.1') },
    { desc: 'The AP reaches the wireless LAN controller', fn: H => H.ping('AP1', '10.0.90.5') },
    { desc: 'The controller reaches the AP and the gateway', fn: H => H.ping('WLC', '10.0.90.10') && H.ping('WLC', '10.0.90.1') },
    { desc: 'SW1 saved', fn: H => H.saved('SW1') },
  ],
});

/* ============================================================= */
L({
  id: 'd57-automation', ord: 57, vol: 2, day: 'Days 57-61', title: 'Network Automation & Data Formats',
  topics: 'why automation · controller-based networking and SDN · northbound and southbound APIs · REST verbs and response codes · JSON, XML and YAML · Ansible, Puppet, Chef and Terraform · enabling RESTCONF and NETCONF',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'MGMT', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.50', mask: '255.255.255.0', gw: '10.0.0.1' } },
  ],
  links: [['MGMT', 'e0', 'SW1', 'f0/1'], ['SW1', 'g0/1', 'R1', 'g0/0']],
  layout: { MGMT: [45, 60], SW1: [180, 60], R1: [310, 60] },
  setupAll: topo => {
    const i = ND.getIface(topo.devs.R1, 'g0/0'); i.ip = { addr: '10.0.0.1', mask: '255.255.255.0' }; i.shutdown = false;
    const svi = ND.getOrCreateIface(topo.devs.SW1, 'vlan1');
    svi.ip = { addr: '10.0.0.2', mask: '255.255.255.0' };
    topo.devs.SW1.defaultGateway = '10.0.0.1';
    topo.devs.R1.hostname = 'R1'; topo.devs.SW1.hostname = 'SW1';
  },
  intro: `<b>The situation:</b> you have now typed the same block of configuration onto five devices by hand more than once in this course. That is exactly the problem automation exists to solve — not because typing is hard, but because typing is <em>inconsistent</em>, and inconsistency is what causes outages.<br><b>Your goal:</b> prepare two devices for programmatic management. You will create a service account, switch on the encrypted transport an API needs, enable <b>RESTCONF</b> and <b>NETCONF</b>, and look at the configuration data an API would return. The explanation then covers SDN, REST, the three data formats and the configuration-management tools — the chapters that close out the CCNA.`,
  tasks: [
    { t: 'Create a service account for the automation tooling, separate from human accounts', why: 'A tool that logs in as a person is a tool nobody can audit. Give automation its own identity with its own credentials.' },
    { t: 'Make sure SSH is configured, because every automation transport depends on it', why: 'NETCONF runs over SSH, Ansible drives IOS over SSH, and RESTCONF needs HTTPS. Secure transport is the prerequisite for all of it.' },
    { t: 'Enable the HTTPS server that RESTCONF is served over, and leave plain HTTP off', why: 'RESTCONF is an HTTP API. It must be the encrypted one — an unencrypted management API is a credential leak with a REST interface.' },
    { t: 'Enable RESTCONF and NETCONF on both devices', why: 'These are the two standard programmatic interfaces on IOS-XE. RESTCONF is HTTP-based and easy to call; NETCONF is XML over SSH with transactions and rollback.' },
    { t: 'Look at the configuration data an API request would actually return', why: 'show running-config is the same data a RESTCONF GET returns, only formatted for humans instead of machines. Seeing them as the same thing is the conceptual leap.' },
    { t: 'Confirm the management station can reach both devices', why: 'An automation controller that cannot reach a device manages nothing. Reachability first, API second.' },
    { t: 'Read the explanation on SDN, REST, data formats and the tooling', why: 'These chapters are examined entirely as concepts — vocabulary, verbs, response codes and which format uses which punctuation.' },
  ],
  steps: [
    { d: 'R1', t: 'Create a dedicated service account for the tooling.', c: ['enable', 'terminal length 0', 'configure terminal', 'username automation privilege 15 secret Aut0mation-Pass', 'do show running-config'], note: 'Separate from human accounts, so logs and change records show whether a person or a playbook made the change.' },
    { d: 'R1', t: 'Set up the secure transport everything depends on.', c: ['hostname R1', 'ip domain name netdrill.lab', 'crypto key generate rsa modulus 2048', 'ip ssh version 2', 'line vty 0 4', 'login local', 'transport input ssh', 'exit'], note: 'The same SSH stack as the SSH lab. NETCONF rides on it directly, and Ansible drives IOS devices over it.' },
    { d: 'R1', t: 'Enable the encrypted web server RESTCONF needs.', c: ['ip http secure-server', 'no ip http server', 'do show running-config'], note: 'HTTPS on, plain HTTP off. RESTCONF is an HTTP API, so it needs the web server — but only the encrypted one.' },
    { d: 'R1', t: 'Turn on the two programmatic interfaces, and practise switching them off again.', c: ['restconf', 'netconf-yang', 'do show running-config', 'no restconf', 'no netconf-yang', 'do show running-config', 'restconf', 'netconf-yang', 'end', 'show running-config'], note: 'RESTCONF listens on HTTPS port 443; NETCONF on SSH port 830. Both expose the same YANG data models — one over REST, one over XML-RPC.' },
    { d: 'R1', t: 'Check the NETCONF agent.', c: ['show netconf-yang sessions'], note: 'No sessions yet, which is what you expect until a controller or script connects.' },
    { d: 'SW1', t: 'Repeat the whole preparation on the switch.', c: ['enable', 'terminal length 0', 'configure terminal', 'username automation privilege 15 secret Aut0mation-Pass', 'hostname SW1', 'ip domain name netdrill.lab', 'crypto key generate rsa modulus 2048', 'ip ssh version 2', 'line vty 0 4', 'login local', 'transport input ssh', 'exit', 'ip http secure-server', 'no ip http server', 'restconf', 'netconf-yang', 'end', 'show running-config'], note: 'Identical block on a second device — and typing it twice is precisely the argument for automating it. In Ansible this is one task applied to a group.' },
    { d: 'R1', t: 'Look at the data an API would return.', c: ['show running-config', 'show ip interface brief', 'show version'], note: 'A RESTCONF GET against the interfaces model returns exactly this information as JSON. The device has the data either way — the only difference is who is reading it.' },
    { d: 'MGMT', t: 'Confirm the management station can reach both devices.', c: ['ipconfig', 'ping 10.0.0.1', 'ping 10.0.0.2'], note: 'An automation controller needs IP reachability and credentials, nothing more exotic. This is the whole "out-of-band management network" idea in miniature.' },
    { d: 'R1', t: 'Make a change the way automation would — idempotently.', c: ['configure terminal', 'interface g0/1', 'description MANAGED-BY-AUTOMATION', 'exit', 'interface g0/1', 'description MANAGED-BY-AUTOMATION', 'end', 'show interfaces g0/1'], note: 'Applying the same configuration twice changes nothing the second time. That property is called <b>idempotency</b> and it is what makes it safe to re-run a playbook against a live network.' },
    { d: 'R1', t: 'Save both devices.', c: ['write memory'] },
    { d: 'SW1', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show running-config', 'show netconf-yang sessions', 'show ip interface brief', 'show version'],
  explain: `<h3>Why automate</h3>
<p>Manual configuration is slow, inconsistent and undocumented. Automation gives you <b>consistency</b> (every device configured identically), <b>speed</b> (fifty devices in the time of one), <b>an audit trail</b> (the configuration lives in version control, so every change has an author and a reason) and <b>testability</b> (changes can be validated before they touch production). The cost is up-front effort and a mistake that now reaches fifty devices at once — which is why review and staged rollout matter.</p>
<h3>Controller-based networking and SDN</h3>
<p>Every network device has a <b>data plane</b> (forwarding packets), a <b>control plane</b> (working out how to forward them — routing protocols, STP, ARP) and a <b>management plane</b> (CLI, SSH, SNMP). Software-Defined Networking moves the control plane off the individual boxes and into a central <b>controller</b>, leaving the devices to forward.</p>
<p>The controller talks <b>southbound</b> to the devices (OpenFlow, NETCONF, RESTCONF, or Cisco's OpFlex) and offers a <b>northbound</b> API to applications and scripts — usually REST. Northbound is the one you write against; southbound is the one the controller uses on your behalf. Cisco's examples: <b>DNA Center</b> for campus intent-based networking, <b>SD-Access</b>, <b>SD-WAN</b> (vManage) and <b>ACI</b> (APIC) in the data centre.</p>
<h3>REST APIs</h3>
<p>REST is HTTP used for machine-to-machine calls. The verbs map to CRUD: <b>GET</b> read, <b>POST</b> create, <b>PUT</b> replace, <b>PATCH</b> modify, <b>DELETE</b> remove. A call has a URI, headers (including authentication and <code>Content-Type</code>), an optional body and a response code.</p>
<p>Response codes: <b>200</b> OK, <b>201</b> Created, <b>400</b> bad request, <b>401</b> unauthorized (no or bad credentials), <b>403</b> forbidden (authenticated but not allowed), <b>404</b> not found, <b>500</b> server error. REST is <b>stateless</b> — every request carries everything needed to serve it.</p>
<h3>The three data formats</h3>
<p><b>JSON</b> — braces for objects, square brackets for arrays, <code>"key": value</code> pairs, commas between them. The most common API format.</p>
<pre>{ "interface": { "name": "GigabitEthernet0/1",
    "enabled": true, "ip": "10.0.0.1" } }</pre>
<p><b>XML</b> — everything wrapped in matching tags, hierarchical, verbose. What NETCONF uses.</p>
<pre>&lt;interface&gt;&lt;name&gt;GigabitEthernet0/1&lt;/name&gt;
  &lt;enabled&gt;true&lt;/enabled&gt;&lt;/interface&gt;</pre>
<p><b>YAML</b> — indentation instead of punctuation, <code>key: value</code>, a leading dash for list items. Designed for humans, which is why Ansible playbooks are written in it.</p>
<pre>interface:
  name: GigabitEthernet0/1
  enabled: true</pre>
<p>Exam tip: recognise them by punctuation — <b>braces = JSON</b>, <b>angle brackets = XML</b>, <b>indentation and dashes = YAML</b>.</p>
<h3>Configuration management tools</h3>
<table>
<tr><td></td><td><b>Ansible</b></td><td><b>Puppet</b></td><td><b>Chef</b></td><td><b>Terraform</b></td></tr>
<tr><td>Language</td><td>YAML</td><td>Puppet DSL</td><td>Ruby</td><td>HCL</td></tr>
<tr><td>Agent</td><td>agentless</td><td>agent</td><td>agent</td><td>agentless</td></tr>
<tr><td>Model</td><td>push</td><td>pull</td><td>pull</td><td>push</td></tr>
<tr><td>Files</td><td>playbooks, inventory</td><td>manifests</td><td>recipes, cookbooks</td><td>configuration files</td></tr>
</table>
<p>Ansible is the one CCNA leans on: agentless, over SSH, YAML playbooks, and an inventory file listing the devices. Terraform is aimed at provisioning infrastructure (especially cloud) rather than configuring existing devices.</p>
<h3>NETCONF and RESTCONF</h3>
<p>Both expose the device's configuration through <b>YANG</b> data models rather than by scraping CLI output. <b>NETCONF</b> is XML over SSH on port 830, with candidate configurations, commits and rollback. <b>RESTCONF</b> is a REST API over HTTPS carrying JSON or XML — simpler to call from a script, with fewer transactional guarantees. Enabling them is exactly what you just did: <code>netconf-yang</code> and <code>restconf</code>, with SSH and the secure HTTP server underneath.</p>`,
  checks: [
    { desc: 'Both devices have a dedicated automation account at privilege 15', fn: H => ['R1', 'SW1'].every(d => { const u = H.d(d).users.automation; return !!u && u.privilege === 15; }) },
    { desc: 'SSH version 2 is ready on both devices', fn: H => ['R1', 'SW1'].every(d => !!H.d(d).rsaKey && H.d(d).sshVersion === 2 && !!H.d(d).domainName) },
    { desc: 'The vty lines use local accounts and SSH only', fn: H => ['R1', 'SW1'].every(d => H.d(d).lines.vty.loginLocal && H.d(d).lines.vty.transport === 'ssh') },
    { desc: 'HTTPS is enabled and plain HTTP is off', fn: H => ['R1', 'SW1'].every(d => H.d(d).services.httpSecure && !H.d(d).services.http) },
    { desc: 'RESTCONF is enabled on both devices', fn: H => ['R1', 'SW1'].every(d => H.d(d).mgmt && H.d(d).mgmt.restconf) },
    { desc: 'NETCONF-YANG is enabled on both devices', fn: H => ['R1', 'SW1'].every(d => H.d(d).mgmt && H.d(d).mgmt.netconf) },
    { desc: 'The idempotent change left exactly one description', fn: H => H.i('R1', 'g0/1').desc === 'MANAGED-BY-AUTOMATION' },
    { desc: 'The management station reaches both devices', fn: H => H.ping('MGMT', '10.0.0.1') && H.ping('MGMT', '10.0.0.2') },
    { desc: 'Both devices saved', fn: H => ['R1', 'SW1'].every(d => H.saved(d)) },
  ],
});

window.ND = ND;
})();
