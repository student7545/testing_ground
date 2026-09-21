/* NetDrill cmds3 — the services and security chapters the first two command
   files did not reach: DNS, SNMP, file transfer (TFTP/FTP), the ARP table,
   Dynamic ARP Inspection, QoS marking, AAA/hardening and Power over Ethernet. */
'use strict';
(function () {
const ND = window.ND;
const REG = ND._REG;
function cmd(modes, pattern, desc, run) {
  const pat = pattern.split(/\s+/);
  for (const m of modes) REG[m].push({ pat, desc, run, modes });
}
const show = (pattern, desc, fn) => cmd(['exec', 'priv'], pattern, desc, fn);
const eachIf = (c, fn) => { for (const i of (c.s.ifaceRange || [])) fn(i); };
const pad = (s, n) => String(s).padEnd(n);

/* ================= DNS ================= */
/* A name resolves from the local host table first, then from whichever device
   owns the configured name-server address — that device's own "ip host" entries
   act as the zone file. */
ND.resolveName = function (topo, dev, name) {
  const n = name.toLowerCase();
  const tries = [n];
  if (!n.includes('.') && dev.domainName) tries.push(n + '.' + dev.domainName.toLowerCase());
  const local = dev.hosts || {};
  for (const t of tries) {
    for (const k of Object.keys(local)) if (k.toLowerCase() === t) return { ip: local[k], via: 'static' };
  }
  if (dev.type !== 'pc' && !dev.domainLookup) return null;
  const servers = dev.type === 'pc'
    ? [(ND.pcNet(topo, dev).dns || (dev.pcCfg && dev.pcCfg.dns))].filter(Boolean)
    : dev.nameServers;
  for (const s of servers) {
    const owner = ND.deviceOwning(topo, s);
    if (!owner) continue;
    if (!ND.tracePacket(topo, dev, s, { proto: 'udp', dstPort: 53 }).ok) continue;
    const zone = owner.dev.hosts || {};
    for (const t of tries) {
      for (const k of Object.keys(zone)) if (k.toLowerCase() === t) return { ip: zone[k], via: s };
    }
  }
  return null;
};

cmd(['conf'], 'ip host WORD IP', 'Add a static name-to-address binding', (c, a) => { c.dev.hosts[a[0]] = a[1]; });
cmd(['conf'], 'no ip host WORD', 'Remove a static name binding', (c, a) => { delete c.dev.hosts[a[0]]; });
cmd(['conf'], 'no ip name-server IP', 'Remove a name server', (c, a) => { c.dev.nameServers = c.dev.nameServers.filter(s => s !== a[0]); });
show('show hosts', 'IP domain-name, name servers and host table', c => {
  const L = [];
  L.push(`Default domain is ${c.dev.domainName || 'not set'}`);
  L.push(`Name/address lookup ${c.dev.domainLookup ? 'uses domain service' : 'is disabled'}`);
  L.push(`Name servers are ${c.dev.nameServers.length ? c.dev.nameServers.join(', ') : '255.255.255.255'}`);
  L.push('');
  L.push(`${pad('Host', 26)}${pad('Port', 7)}${pad('Flags', 12)}${pad('Age', 5)}${pad('Type', 6)}Address(es)`);
  const names = Object.keys(c.dev.hosts);
  if (!names.length) L.push('(no static entries)');
  for (const n of names) L.push(`${pad(n, 26)}${pad('None', 7)}${pad('(perm, OK)', 12)}${pad('0', 5)}${pad('IP', 6)}${c.dev.hosts[n]}`);
  c.out(L.join('\n'));
});

/* ================= ARP table ================= */
show('show ip arp', 'IP ARP table', c => c.out(ND.showArp(c.topo, c.dev)));
show('show arp', 'ARP table', c => c.out(ND.showArp(c.topo, c.dev)));
ND.showArp = function (topo, dev) {
  const L = ['Protocol  Address          Age (min)  Hardware Addr   Type   Interface'];
  for (const a of ND.devIps(topo, dev)) {
    if (a.virtual) continue;
    L.push(`Internet  ${pad(a.ip, 17)}${pad('-', 11)}${pad(a.ifc.mac, 16)}ARPA   ${ND.shortIface(a.ifc.name)}`);
  }
  for (const e of dev.arpTable) {
    L.push(`Internet  ${pad(e.ip, 17)}${pad(e.age, 11)}${pad(e.mac, 16)}ARPA   ${ND.shortIface(e.iface)}`);
  }
  return L.join('\n');
};
cmd(['priv'], 'clear arp-cache', 'Clear the entire ARP cache', c => { c.dev.arpTable = []; });
cmd(['pc'], 'arp -a', 'Show the ARP cache', c => {
  const net = ND.pcNet(c.topo, c.dev);
  if (!net.ip) return c.out('No ARP Entries Found');
  c.out(`Interface: ${net.ip} --- 0x1\n  Internet Address      Physical Address      Type`);
  if (!c.dev.arpTable.length) return;
  for (const e of c.dev.arpTable) c.out(`  ${pad(e.ip, 22)}${pad(e.mac.replace(/\./g, '-'), 22)}dynamic`);
});

/* ================= SNMP ================= */
cmd(['conf'], 'snmp-server community WORD ro', 'Read-only community string', (c, a) => {
  c.dev.snmp.communities = c.dev.snmp.communities.filter(x => x.name !== a[0]).concat({ name: a[0], access: 'RO' });
});
cmd(['conf'], 'snmp-server community WORD rw', 'Read-write community string', (c, a) => {
  c.dev.snmp.communities = c.dev.snmp.communities.filter(x => x.name !== a[0]).concat({ name: a[0], access: 'RW' });
});
cmd(['conf'], 'no snmp-server community WORD', 'Remove a community string', (c, a) => {
  c.dev.snmp.communities = c.dev.snmp.communities.filter(x => x.name !== a[0]);
});
cmd(['conf'], 'snmp-server location REST', 'Text for mib object sysLocation', (c, a) => { c.dev.snmp.location = a[0]; });
cmd(['conf'], 'snmp-server contact REST', 'Text for mib object sysContact', (c, a) => { c.dev.snmp.contact = a[0]; });
cmd(['conf'], 'snmp-server host IP version 2c WORD', 'Trap receiver (SNMPv2c)', (c, a) => {
  c.dev.snmp.hosts = c.dev.snmp.hosts.filter(h => h.ip !== a[0]).concat({ ip: a[0], version: '2c', community: a[1] });
});
cmd(['conf'], 'snmp-server host IP version 3 WORD', 'Trap receiver (SNMPv3)', (c, a) => {
  c.dev.snmp.hosts = c.dev.snmp.hosts.filter(h => h.ip !== a[0]).concat({ ip: a[0], version: '3', community: a[1] });
});
cmd(['conf'], 'snmp-server host IP WORD', 'Trap receiver', (c, a) => {
  c.dev.snmp.hosts = c.dev.snmp.hosts.filter(h => h.ip !== a[0]).concat({ ip: a[0], version: '1', community: a[1] });
});
cmd(['conf'], 'no snmp-server host IP', 'Remove a trap receiver', (c, a) => {
  c.dev.snmp.hosts = c.dev.snmp.hosts.filter(h => h.ip !== a[0]);
});
cmd(['conf'], 'snmp-server enable traps', 'Enable SNMP traps', c => { c.dev.snmp.traps = true; });
cmd(['conf'], 'no snmp-server enable traps', 'Disable SNMP traps', c => { c.dev.snmp.traps = false; });
show('show snmp community', 'SNMP community strings', c => {
  const L = [];
  for (const s of c.dev.snmp.communities) L.push(`Community name: ${s.name}\nCommunity Index: ${s.name}\nCommunity SecurityName: ${s.name}\nstorage-type: nonvolatile\taccess-type: ${s.access.toLowerCase()}`);
  c.out(L.length ? L.join('\n\n') : '');
});
show('show snmp host', 'SNMP trap receivers', c => {
  const L = [];
  for (const h of c.dev.snmp.hosts) L.push(`Notification host: ${h.ip}\tudp-port: 162\ttype: trap\nuser: ${h.community}\tsecurity model: v${h.version}`);
  c.out(L.length ? L.join('\n') : '');
});
show('show snmp', 'SNMP statistics', c => {
  const sn = c.dev.snmp;
  const L = [`Chassis: ${c.dev.hostname}`];
  if (sn.contact) L.push(`Contact: ${sn.contact}`);
  if (sn.location) L.push(`Location: ${sn.location}`);
  L.push('0 SNMP packets input', '0 SNMP packets output');
  L.push(`SNMP logging: ${sn.traps ? 'enabled' : 'disabled'}`);
  for (const h of sn.hosts) L.push(`    Logging to ${h.ip}.162, 0/10, 0 sent, 0 dropped.`);
  L.push('', `SNMP agent enabled: ${sn.communities.length ? 'yes' : 'no communities configured'}`);
  for (const s of sn.communities) L.push(`    Community ${s.name} (${s.access})`);
  c.out(L.join('\n'));
});

/* ================= flash / file systems ================= */
const flashOf = dev => dev.flash;
function dirOut(c) {
  const L = ['Directory of flash:/', ''];
  let n = 1, used = 0;
  for (const f of flashOf(c.dev)) { L.push(`    ${pad(n++, 4)}-rw-  ${pad(f.size, 12)}  <no date>  ${f.name}`); used += f.size; }
  L.push('', `64016384 bytes total (${64016384 - used} bytes free)`);
  return L.join('\n');
}
show('show flash:', 'Contents of flash file system', c => c.out(dirOut(c)));
show('show flash', 'Contents of flash file system', c => c.out(dirOut(c)));
show('dir flash:', 'List files on flash', c => c.out(dirOut(c)));
show('dir', 'List files on the current file system', c => c.out(dirOut(c)));
cmd(['priv'], 'delete WORD', 'Delete a file', (c, a) => {
  const name = a[0].replace(/^flash:\/?/i, '');
  c.dev.flash = c.dev.flash.filter(f => f.name !== name);
  c.out(`Delete filename [${name}]? \nDelete flash:/${name}? [confirm]`);
});

/* ---- file transfer to and from a server ---- */
ND.fileStore = function (topo, ip) {
  topo.files = topo.files || {};
  topo.files[ip] = topo.files[ip] || {};
  return topo.files[ip];
};
function serverReachable(c, ip, port) {
  return ND.tracePacket(c.topo, c.dev, ip, { proto: 'udp', dstPort: port }).ok;
}
function ask(ctx, text, fn) { ctx.s.pendingPrompt = { text, fn }; ctx.out(text); }

function copyToServer(c, what, proto) {
  const port = proto === 'tftp' ? 69 : 21;
  const defName = c.dev.hostname.toLowerCase() + (what === 'running-config' ? '-confg' : '-startup');
  ask(c, 'Address or name of remote host []? ', (addr, c1) => {
    if (!ND.isIp(addr)) return c1.out('% Invalid address', 'err');
    ask(c1, `Destination filename [${defName}]? `, (fname, c2) => {
      const name = fname || defName;
      if (!serverReachable(c, addr, port)) return c2.out(`%Error opening ${proto}://${addr}/${name} (Timed out)`, 'err');
      const body = what === 'running-config' ? ND.runningConfig(c.topo, c.dev) : (c.dev.startup || '');
      if (!body) return c2.out('%% Non-volatile configuration memory is not present', 'err');
      ND.fileStore(c.topo, addr)[name] = body;
      c2.out(`!!\n${body.length} bytes copied in 0.184 secs (${Math.round(body.length / 0.184)} bytes/sec)`);
    });
  });
}

function copyFromServer(c, dest, proto) {
  const port = proto === 'tftp' ? 69 : 21;
  ask(c, 'Address or name of remote host []? ', (addr, c1) => {
    if (!ND.isIp(addr)) return c1.out('% Invalid address', 'err');
    ask(c1, 'Source filename []? ', (fname, c2) => {
      ask(c2, `Destination filename [${dest}]? `, (dname, c3) => {
        if (!serverReachable(c, addr, port)) return c3.out(`%Error opening ${proto}://${addr}/${fname} (Timed out)`, 'err');
        const store = ND.fileStore(c.topo, addr);
        if (!(fname in store)) return c3.out(`%Error opening ${proto}://${addr}/${fname} (No such file or directory)`, 'err');
        const body = store[fname];
        if (/^flash/i.test(dest)) {
          const nm = (dname || fname).replace(/^flash:\/?/i, '');
          c.dev.flash = c.dev.flash.filter(f => f.name !== nm).concat({ name: nm, size: body.length });
        } else if (dest === 'startup-config') {
          c.dev.startup = body; c.dev.saved = true;
        }
        c3.out(`Accessing ${proto}://${addr}/${fname}...\n!!\n[OK - ${body.length} bytes]\n\n${body.length} bytes copied in 0.231 secs`);
      });
    });
  });
}

function copyFlashToServer(c, proto) {
  const port = proto === 'tftp' ? 69 : 21;
  ask(c, 'Source filename []? ', (fname, c1) => {
    const f = c.dev.flash.find(x => x.name === fname);
    if (!f) return c1.out(`%Error opening flash:/${fname} (No such file or directory)`, 'err');
    ask(c1, 'Address or name of remote host []? ', (addr, c2) => {
      if (!ND.isIp(addr)) return c2.out('% Invalid address', 'err');
      ask(c2, `Destination filename [${fname}]? `, (dname, c3) => {
        if (!serverReachable(c, addr, port)) return c3.out(`%Error opening ${proto}://${addr}/${fname} (Timed out)`, 'err');
        ND.fileStore(c.topo, addr)[dname || fname] = `<IOS image ${fname}>`;
        c3.out(`!!!!!!!!!!!!!!!!!!!!\n${f.size} bytes copied in 21.640 secs (${Math.round(f.size / 21.64)} bytes/sec)`);
      });
    });
  });
}

cmd(['priv'], 'copy running-config tftp:', 'Copy the running config to a TFTP server', c => copyToServer(c, 'running-config', 'tftp'));
cmd(['priv'], 'copy startup-config tftp:', 'Copy the startup config to a TFTP server', c => copyToServer(c, 'startup-config', 'tftp'));
cmd(['priv'], 'copy running-config ftp:', 'Copy the running config to an FTP server', c => copyToServer(c, 'running-config', 'ftp'));
cmd(['priv'], 'copy tftp: running-config', 'Load a config from a TFTP server', c => copyFromServer(c, 'running-config', 'tftp'));
cmd(['priv'], 'copy tftp: startup-config', 'Load a config into NVRAM from TFTP', c => copyFromServer(c, 'startup-config', 'tftp'));
cmd(['priv'], 'copy tftp: flash:', 'Download a file into flash', c => copyFromServer(c, 'flash:', 'tftp'));
cmd(['priv'], 'copy ftp: flash:', 'Download a file into flash over FTP', c => copyFromServer(c, 'flash:', 'ftp'));
cmd(['priv'], 'copy flash: tftp:', 'Upload a file from flash to a TFTP server', c => copyFlashToServer(c, 'tftp'));
cmd(['priv'], 'copy flash: ftp:', 'Upload a file from flash to an FTP server', c => copyFlashToServer(c, 'ftp'));
cmd(['priv'], 'copy startup-config running-config', 'Merge the saved config into the running config', c => {
  c.out('Destination filename [running-config]? ');
  c.out(c.dev.startup ? `${c.dev.startup.length} bytes copied in 0.048 secs` : '%% Non-volatile configuration memory is not present', c.dev.startup ? '' : 'err');
});
cmd(['conf'], 'ip ftp username WORD', 'FTP username', (c, a) => { c.dev.services.ftpUser = a[0]; });
cmd(['conf'], 'ip ftp password WORD', 'FTP password', (c, a) => { c.dev.services.ftpPass = a[0]; });
cmd(['conf'], 'no ip ftp username', 'Remove the FTP username', c => { c.dev.services.ftpUser = null; });

/* ================= Dynamic ARP Inspection ================= */
function parseVlanList(str) {
  const out = [];
  for (const part of String(str).split(',')) {
    const m = part.match(/^(\d+)-(\d+)$/);
    if (m) { for (let v = +m[1]; v <= +m[2]; v++) out.push(v); }
    else if (/^\d+$/.test(part)) out.push(+part);
  }
  return out;
}
cmd(['conf'], 'ip arp inspection vlan WORD', 'Enable DAI on a VLAN list', (c, a) => {
  for (const v of parseVlanList(a[0])) if (!c.dev.arai.vlans.includes(v)) c.dev.arai.vlans.push(v);
});
cmd(['conf'], 'no ip arp inspection vlan WORD', 'Disable DAI on a VLAN list', (c, a) => {
  const rm = parseVlanList(a[0]);
  c.dev.arai.vlans = c.dev.arai.vlans.filter(v => !rm.includes(v));
});
cmd(['conf'], 'ip arp inspection validate REST', 'Extra validation checks', (c, a) => {
  c.dev.arai.validate = a[0].trim().split(/\s+/).map(s => s.toLowerCase());
});
cmd(['conf'], 'no ip arp inspection validate', 'Remove extra validation checks', c => { c.dev.arai.validate = []; });
cmd(['if'], 'ip arp inspection trust', 'Trust this port for ARP inspection', c => eachIf(c, i => { i.araiTrust = true; }));
cmd(['if'], 'no ip arp inspection trust', 'Return this port to untrusted', c => eachIf(c, i => { i.araiTrust = false; }));
cmd(['if'], 'ip arp inspection limit rate NUM', 'Rate limit ARP packets per second', (c, a) => eachIf(c, i => { i.araiRate = +a[0]; }));
show('show ip arp inspection', 'Dynamic ARP Inspection status', c => {
  const d = c.dev.arai;
  const L = [];
  L.push(`Source Mac Validation      : ${d.validate.includes('src-mac') ? 'Enabled' : 'Disabled'}`);
  L.push(`Destination Mac Validation : ${d.validate.includes('dst-mac') ? 'Enabled' : 'Disabled'}`);
  L.push(`IP Address Validation      : ${d.validate.includes('ip') ? 'Enabled' : 'Disabled'}`);
  L.push('', ' Vlan     Configuration    Operation   ACL Match          Static ACL', ' ----     -------------    ---------   ---------          ----------');
  if (!d.vlans.length) L.push(' (DAI is not enabled on any VLAN)');
  for (const v of d.vlans.slice().sort((a, b) => a - b)) L.push(` ${pad(v, 9)}${pad('Enabled', 17)}${pad('Active', 12)}`);
  L.push('', ' Interface        Trust State     Rate (pps)   Burst Interval', ' ---------------  -----------     ----------   --------------');
  for (const i of Object.values(c.dev.ifaces)) {
    if (!/^(Gigabit|Fast|Ten|Ether)/.test(i.name) || i.parent) continue;
    L.push(` ${pad(ND.shortIface(i.name), 17)}${pad(i.araiTrust ? 'Trusted' : 'Untrusted', 16)}${pad(i.araiTrust ? 'None' : (i.araiRate || 15), 13)}1`);
  }
  c.out(L.join('\n'));
});
show('show ip arp inspection interfaces', 'DAI trust state per interface', c => {
  const L = [' Interface        Trust State     Rate (pps)   Burst Interval', ' ---------------  -----------     ----------   --------------'];
  for (const i of Object.values(c.dev.ifaces)) {
    if (!/^(Gigabit|Fast|Ten|Ether)/.test(i.name) || i.parent) continue;
    L.push(` ${pad(ND.shortIface(i.name), 17)}${pad(i.araiTrust ? 'Trusted' : 'Untrusted', 16)}${pad(i.araiTrust ? 'None' : (i.araiRate || 15), 13)}1`);
  }
  c.out(L.join('\n'));
});

/* ================= QoS ================= */
cmd(['conf'], 'mls qos', 'Enable QoS globally', c => { c.dev.qos.enabled = true; });
cmd(['conf'], 'no mls qos', 'Disable QoS globally', c => { c.dev.qos.enabled = false; });
cmd(['if'], 'mls qos trust cos', 'Trust the incoming CoS marking', c => eachIf(c, i => { i.qosTrust = 'cos'; }));
cmd(['if'], 'mls qos trust dscp', 'Trust the incoming DSCP marking', c => eachIf(c, i => { i.qosTrust = 'dscp'; }));
cmd(['if'], 'mls qos trust device cisco-phone', 'Conditional trust — only if a Cisco phone is detected', c => eachIf(c, i => { i.qosTrust = 'device cisco-phone'; }));
cmd(['if'], 'no mls qos trust', 'Return the port to untrusted', c => eachIf(c, i => { i.qosTrust = null; }));
cmd(['if'], 'mls qos cos NUM', 'Default CoS value for untagged frames', (c, a) => eachIf(c, i => { i.qosCos = +a[0]; }));
cmd(['if'], 'auto qos voip trust', 'Apply the automatic VoIP QoS template', c => eachIf(c, i => { i.qosTrust = 'cos'; i.autoQos = true; }));
show('show mls qos', 'Global QoS status', c => c.out(c.dev.qos.enabled ? 'QoS is enabled\nQoS ip packet dscp rewrite is enabled' : 'QoS is disabled'));
show('show mls qos interface REST', 'Per-interface QoS status', (c, a) => {
  const i = ND.getIface(c.dev, a[0]);
  if (!i) return c.out('% Invalid interface', 'err');
  c.out(`${i.name}\ntrust state: ${i.qosTrust ? 'trust ' + i.qosTrust : 'not trusted'}\ntrust mode: ${i.qosTrust ? 'trust ' + i.qosTrust : 'not trusted'}\ndefault COS: ${i.qosCos == null ? 0 : i.qosCos}\nQoS Mode: port-based\n${i.autoQos ? 'AutoQoS: voip trust\n' : ''}`);
});

/* ================= AAA and device hardening ================= */
cmd(['conf'], 'aaa new-model', 'Enable the AAA access control model', c => { c.dev.aaa.newModel = true; });
cmd(['conf'], 'no aaa new-model', 'Disable the AAA access control model', c => { c.dev.aaa.newModel = false; c.dev.aaa.loginDefault = null; });
cmd(['conf'], 'aaa authentication login default local', 'Authenticate logins against the local user database', c => { c.dev.aaa.loginDefault = 'local'; });
cmd(['conf'], 'aaa authentication login default group radius local', 'RADIUS first, local as a fallback', c => { c.dev.aaa.loginDefault = 'radius local'; });
cmd(['conf'], 'aaa authentication login default group tacacs+ local', 'TACACS+ first, local as a fallback', c => { c.dev.aaa.loginDefault = 'tacacs+ local'; });
cmd(['conf'], 'login block-for NUM attempts NUM within NUM', 'Block logins after repeated failures', (c, a) => {
  c.dev.services.loginBlock = { blockFor: +a[0], attempts: +a[1], within: +a[2] };
});
cmd(['conf'], 'no login block-for NUM attempts NUM within NUM', 'Remove login blocking', c => { c.dev.services.loginBlock = null; });
cmd(['conf'], 'security passwords min-length NUM', 'Minimum password length', (c, a) => { c.dev.services.minPassLen = +a[0]; });
cmd(['conf'], 'no ip http server', 'Disable the HTTP server', c => { c.dev.services.http = false; });
cmd(['conf'], 'ip http server', 'Enable the HTTP server', c => { c.dev.services.http = true; });
cmd(['conf'], 'no ip http secure-server', 'Disable the HTTPS server', c => { c.dev.services.httpSecure = false; });
cmd(['conf'], 'ip http secure-server', 'Enable the HTTPS server', c => { c.dev.services.httpSecure = true; });
show('show login', 'Login blocking status', c => {
  const b = c.dev.services.loginBlock;
  if (!b) return c.out('     No login delay has been applied.\n     Router NOT enabled to watch for login Attacks');
  c.out(`     A default login delay of 1 second is applied.\n     Router enabled to watch for login Attacks.\n     If more than ${b.attempts} login failures occur in ${b.within} seconds or less,\n     logins will be disabled for ${b.blockFor} seconds.\n\n     Router presently in Normal-Mode.`);
});

/* ================= Power over Ethernet ================= */
cmd(['if'], 'power inline auto', 'Supply power when a powered device is detected', c => eachIf(c, i => { i.poe = 'auto'; }));
cmd(['if'], 'power inline never', 'Never supply power on this port', c => eachIf(c, i => { i.poe = 'never'; }));
cmd(['if'], 'power inline static', 'Reserve power for this port', c => eachIf(c, i => { i.poe = 'static'; }));
cmd(['if'], 'no power inline', 'Return the port to the default (auto)', c => eachIf(c, i => { i.poe = null; }));
show('show power inline', 'Power over Ethernet status', c => {
  const L = ['Available:370.0(w)  Used:15.4(w)  Remaining:354.6(w)', '',
    'Interface Admin  Oper       Power   Device              Class Max',
    '                            (Watts)', '--------- ------ ---------- ------- ------------------- ----- ----'];
  for (const i of Object.values(c.dev.ifaces)) {
    if (!/^(Gigabit|Fast)/.test(i.name) || i.parent) continue;
    const mode = i.poe || 'auto';
    const peer = ND.linkPeer(c.topo, c.dev, i.name);
    const powered = mode !== 'never' && peer && peer.dev.poeDevice;
    L.push(`${pad(ND.shortIface(i.name), 10)}${pad(mode, 7)}${pad(powered ? 'on' : 'off', 11)}${pad(powered ? '15.4' : '0.0', 8)}${pad(powered ? peer.dev.poeDevice : 'n/a', 20)}${pad(powered ? '3' : 'n/a', 6)}30.0`);
  }
  c.out(L.join('\n'));
});

/* PC name resolution: ping and tracert accept a host name once the PC has a
   DNS server (statically configured or handed out by DHCP). */
cmd(['pc'], 'ping WORD', 'Send ICMP echo request to a host name', (c, a) => {
  const r = ND.resolveName(c.topo, c.dev, a[0]);
  if (!r) return c.out(`Ping request could not find host ${a[0]}. Please check the name and try again.`, 'err');
  c.out(`\nPinging ${a[0]} [${r.ip}] with 32 bytes of data:\n`);
  const res = ND.tracePacket(c.topo, c.dev, r.ip, { proto: 'icmp', learn: true });
  if (res.ok) {
    for (let k = 0; k < 4; k++) c.out(`Reply from ${r.ip}: bytes=32 time=${1 + k}ms TTL=${128 - res.path.length}`);
    c.out(`\nPing statistics for ${r.ip}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`);
  } else {
    for (let k = 0; k < 4; k++) c.out('Request timed out.');
    c.out(`\nPing statistics for ${r.ip}:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)`);
  }
});
cmd(['pc'], 'tracert WORD', 'Trace route to a host name', (c, a) => {
  const r = ND.resolveName(c.topo, c.dev, a[0]);
  if (!r) return c.out(`Unable to resolve target system name ${a[0]}.`, 'err');
  const res = ND.tracePacket(c.topo, c.dev, r.ip, { proto: 'icmp', learn: true });
  c.out(`\nTracing route to ${a[0]} [${r.ip}] over a maximum of 30 hops\n`);
  if (res.ok) {
    let n = 1;
    for (const id of res.path.slice(1)) {
      const d = c.topo.devs[id];
      const addr = id === res.path[res.path.length - 1] ? r.ip : (ND.devIps(c.topo, d)[0] || {}).ip || '?';
      c.out(`  ${n++}    <1 ms    <1 ms    <1 ms  ${addr}`);
    }
    c.out('\nTrace complete.');
  } else c.out('  1     *        *        *     Request timed out.');
});
cmd(['pc'], 'nslookup WORD', 'Look up a host name', (c, a) => {
  const net = ND.pcNet(c.topo, c.dev);
  const dns = net.dns || (c.dev.pcCfg && c.dev.pcCfg.dns);
  const r = ND.resolveName(c.topo, c.dev, a[0]);
  c.out(`Server:  ${dns || 'UnKnown'}\nAddress:  ${dns || ''}\n`);
  if (!r) return c.out(`*** ${dns || 'server'} can't find ${a[0]}: Non-existent domain`, 'err');
  c.out(`Name:    ${a[0]}\nAddress:  ${r.ip}`);
});

/* ================= programmability (RESTCONF / NETCONF) ================= */
cmd(['conf'], 'netconf-yang', 'Enable the NETCONF-YANG agent', c => { c.dev.mgmt = c.dev.mgmt || {}; c.dev.mgmt.netconf = true; });
cmd(['conf'], 'no netconf-yang', 'Disable the NETCONF-YANG agent', c => { c.dev.mgmt = c.dev.mgmt || {}; c.dev.mgmt.netconf = false; });
cmd(['conf'], 'restconf', 'Enable the RESTCONF agent', c => { c.dev.mgmt = c.dev.mgmt || {}; c.dev.mgmt.restconf = true; });
cmd(['conf'], 'no restconf', 'Disable the RESTCONF agent', c => { c.dev.mgmt = c.dev.mgmt || {}; c.dev.mgmt.restconf = false; });
cmd(['conf'], 'username WORD privilege NUM secret WORD', 'Local user with a privilege level', (c, a) => {
  c.dev.users[a[0]] = { secret: a[2], privilege: +a[1] };
});
show('show netconf-yang sessions', 'NETCONF session table', c => {
  const on = c.dev.mgmt && c.dev.mgmt.netconf;
  c.out(on ? 'R: transport, session-id, username, source-host, login-time\n(no active sessions)' : '% NETCONF-YANG is not enabled');
});

window.ND = ND;
})();
