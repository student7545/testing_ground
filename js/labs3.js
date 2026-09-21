/* NetDrill labs — Volume 1 COMPREHENSIVE tier.
   Long-form drills built in phases: configure it, repeat the same pattern on
   more devices until it is automatic, work through every variant and "no"
   form, then sweep every verification command. Each step names its device. */
'use strict';
(function () {
const ND = window.ND;
ND.LABS = ND.LABS || [];
const L = lab => ND.LABS.push(lab);

/* ============================================================= */
L({
  id: 'x1-device-mgmt', vol: 1, tier: 'deep', day: 'Days 4-5', title: 'Device Setup & Management — Full Drill',
  topics: 'every CLI mode · secret vs password · console & vty lines · exec-timeout · banners · NVRAM · reload · every show command — repeated across 5 devices',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1'] },
    { id: 'SW3', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
  ],
  links: [['SW1', 'g0/1', 'R1', 'g0/0'], ['SW2', 'g0/1', 'R1', 'g0/1'], ['R1', 'g0/2', 'R2', 'g0/0'], ['SW3', 'g0/1', 'R2', 'g0/1']],
  layout: { SW1: [50, 20], SW2: [50, 96], R1: [170, 58], R2: [290, 58], SW3: [370, 58] },
  intro: `<b>The situation:</b> five brand-new devices — three switches and two routers — none of them named, secured or saved.<br><b>Your goal:</b> the opening routine you will perform on every device for the rest of your career, typed out five separate times until your fingers stop needing your brain. Then every variant of it: both kinds of password, both kinds of line, every timeout form, banners with different delimiters, and the full NVRAM lifecycle including erasing and reloading. If you can do this lab from memory you can walk up to any Cisco device and take control of it.`,
  tasks: [
    { t: 'PHASE 1 — On SW1, walk every mode: user EXEC, privileged EXEC, global config, interface config, line config, and back out of each', why: 'The prompt symbol is your position indicator. Reading it before you type is the single habit that prevents most beginner mistakes.' },
    { t: 'Give SW1 the full baseline: hostname, enable secret, console password with login, vty password with login, banner, domain name, no DNS lookup, save', why: 'Nine commands that turn an anonymous box into a managed device. This exact block is what you will repeat on every device below.' },
    { t: 'PHASE 2 — Repeat the identical baseline on SW2, from memory if you can', why: 'The second time is where learning happens. Same commands, different device, no new concepts — pure repetition.' },
    { t: 'Repeat it a third time on SW3, but change every value: different hostname, different passwords, a different banner delimiter', why: 'Varying the values while keeping the command shapes forces you to remember the syntax rather than the literal line.' },
    { t: 'PHASE 3 — Give R1 the same baseline, and notice what is different about a router', why: 'The commands are identical on routers and switches. What differs is the hardware defaults — router ports ship disabled.' },
    { t: 'Repeat once more on R2 — the fifth time through the same block', why: 'Five repetitions is roughly where a sequence stops being something you recall and starts being something you do.' },
    { t: 'PHASE 4 — On SW1, add an enable password alongside the secret, prove the secret wins, then delete the password', why: 'Both can exist; IOS always uses the secret and ignores the password. Seeing both in the config makes the difference concrete.' },
    { t: 'Toggle service password-encryption on and off, checking the running config each time', why: 'Watch the line passwords turn into type-7 hashes and back. Weak encryption, but it defeats a glance over your shoulder.' },
    { t: 'PHASE 5 — Work through every console and vty line option: password, login, exec-timeout in both forms, logging synchronous', why: 'Console and vty are configured separately and neither inherits from the other. exec-timeout takes minutes and seconds; 0 0 disables it entirely.' },
    { t: 'On R1, set exec-timeout 0 0 on the console, then put a sane timeout back', why: 'Never timing out is convenient in a lab and a security finding in production. Know the command and know why you would not leave it.' },
    { t: 'PHASE 6 — Set banners on three devices using three different delimiter characters', why: 'The delimiter is simply the first character you type after the command — any character not appearing in your message works.' },
    { t: 'Remove SW3\'s banner again with its "no" form', why: 'Every configuration command has a "no" form. Removing cleanly matters as much as adding.' },
    { t: 'PHASE 7 — Prove the enable secret works: disable, log back in with the password, then use logout too', why: 'Three ways out of privileged mode — exit, disable and logout — and the only way back in is the password you set.' },
    { t: 'PHASE 8 — On SW1, save with copy running-config startup-config; on SW2 use write memory; on SW3 use write', why: 'Three commands, one action. All three appear in documentation and exam questions, so all three should feel familiar.' },
    { t: 'View both configurations on SW1, erase NVRAM, confirm it is empty, then save again', why: 'running-config lives in RAM, startup-config in NVRAM. Erasing NVRAM is how a device is reset before redeployment.' },
    { t: 'Reload R2 and watch what IOS asks before it reboots', why: 'If the running config was never saved, IOS warns you first. That prompt has saved a great many engineers from losing an afternoon.' },
    { t: 'PHASE 9 — Sweep every read-only command on R1: version, clock, users, history, running-config, startup-config', why: 'The commands that tell you what a device is, what it is doing, and who else is on it. You will type these constantly.' },
    { t: 'Set terminal length 0 first, and notice the difference it makes to long output', why: 'Turns off the --More-- pager so output scrolls in one piece. Usually the very first thing an engineer types on a new session.' },
    { t: 'PHASE 10 — Bring up R1\'s links, then map the whole network with CDP from three different devices', why: 'Discovery confirms your cabling matches the diagram. Reading it from several vantage points builds the habit of cross-checking.' },
  ],
  steps: [
    /* ---- PHASE 1: modes + first baseline ---- */
    { d: 'SW1', t: 'Walk up through every mode, then back down. Watch the prompt at each step.', c: ['enable', 'configure terminal', 'interface f0/1', 'exit', 'line console 0', 'exit', 'exit'], note: 'Switch&gt; → Switch# → Switch(config)# → Switch(config-if)# → back → Switch(config-line)# → back → Switch#. <code>exit</code> steps back one level; <code>end</code> jumps straight to privileged mode from anywhere.' },
    { d: 'SW1', t: 'Enter config mode and name the device.', c: ['configure terminal', 'hostname SW1'], note: 'The prompt updates the instant you press Enter — your first confirmation that a command took effect.' },
    { d: 'SW1', t: 'Protect privileged mode with a hashed secret.', c: ['enable secret Cisco123'], note: 'The secret is stored as an MD5 hash and is the one IOS actually checks.' },
    { d: 'SW1', t: 'Secure the console port.', c: ['line console 0', 'password ConPass1', 'login', 'exit'], note: 'Setting a password does nothing until <code>login</code> tells the line to actually ask for it. Forgetting that second line is a classic slip.' },
    { d: 'SW1', t: 'Secure the remote-access lines.', c: ['line vty 0 4', 'password VtyPass1', 'login', 'exit'], note: 'Lines 0 through 4 are five simultaneous remote sessions. Console settings do not apply here — vty is configured separately.' },
    { d: 'SW1', t: 'Add the housekeeping three: banner, domain name, no DNS lookup.', c: ['banner motd #Authorised access only#', 'ip domain-name netdrill.lab', 'no ip domain-lookup'], note: 'The <code>#</code> characters are delimiters marking where the banner text starts and ends.' },
    { d: 'SW1', t: 'Leave config mode and save the work.', c: ['end', 'copy running-config startup-config'], note: 'That is the complete baseline. Nine commands. You are about to type them four more times.' },

    /* ---- PHASE 2: repetition on SW2 and SW3 ---- */
    { d: 'SW2', t: 'Second time through — the identical block, start to finish.', c: ['enable', 'configure terminal', 'hostname SW2', 'enable secret Cisco123', 'line console 0', 'password ConPass1', 'login', 'exit', 'line vty 0 4', 'password VtyPass1', 'login', 'exit', 'banner motd #Authorised access only#', 'ip domain-name netdrill.lab', 'no ip domain-lookup', 'end'], note: 'Try covering the commands and working from the task list alone. Reveal only when you are stuck — that is where the learning is.' },
    { d: 'SW2', t: 'Save with the shorter command this time.', c: ['write memory'], note: '<code>write memory</code> and <code>copy running-config startup-config</code> do exactly the same thing. Both appear in exam questions.' },
    { d: 'SW3', t: 'Third time — same shapes, every value different, and a different banner delimiter.', c: ['enable', 'configure terminal', 'hostname SW3', 'enable secret Sw3Secret', 'line console 0', 'password Sw3Con', 'login', 'exec-timeout 15 0', 'exit', 'line vty 0 4', 'password Sw3Vty', 'login', 'exec-timeout 30 0', 'exit', 'banner motd $Restricted system - SW3$', 'ip domain-name lab.local', 'no ip domain-lookup', 'end'], note: 'Different passwords, different domain, <code>$</code> as the delimiter instead of <code>#</code>. The command shapes are what you are memorising, not the values.' },
    { d: 'SW3', t: 'Save with the shortest form of all.', c: ['write'], note: 'Three ways to save the same configuration. <code>write</code> on its own is the oldest and quickest.' },

    /* ---- PHASE 3: same baseline on routers ---- */
    { d: 'R1', t: 'Fourth time — now on a router. Exactly the same commands.', c: ['enable', 'configure terminal', 'hostname R1', 'enable secret Cisco123', 'line console 0', 'password ConPass1', 'login', 'logging synchronous', 'exit', 'line vty 0 4', 'password VtyPass1', 'login', 'logging synchronous', 'exit', 'banner motd #R1 - authorised access only#', 'ip domain-name netdrill.lab', 'no ip domain-lookup', 'end'], note: 'Nothing here is router-specific. <code>logging synchronous</code> re-prints your half-typed command after a log message interrupts it.' },
    { d: 'R1', t: 'Now see what IS different about a router.', c: ['show ip interface brief'], note: 'Every port reads "administratively down". A switch would have shown them up. This one difference causes an enormous number of "why is it not working" moments.' },
    { d: 'R2', t: 'Fifth and final time through the baseline.', c: ['enable', 'configure terminal', 'hostname R2', 'enable secret Cisco123', 'line console 0', 'password ConPass1', 'login', 'logging synchronous', 'exit', 'line vty 0 4', 'password VtyPass1', 'login', 'exit', 'banner motd #R2 - authorised access only#', 'ip domain-name netdrill.lab', 'no ip domain-lookup', 'end', 'write memory'], note: 'By now this should be flowing without much thought. That is the whole point of typing it five times.' },

    /* ---- PHASE 4: password variants ---- */
    { d: 'SW1', t: 'Add a plain enable password alongside the existing secret.', c: ['configure terminal', 'enable password WeakOne', 'do show running-config'], note: 'Look at the two lines in the config: the secret is a hash, the password is readable. Both exist, but IOS only ever checks the secret.' },
    { d: 'SW1', t: 'Turn on password encryption and look again.', c: ['service password-encryption', 'do show running-config'], note: 'The enable password and both line passwords are now type-7 hashes. The enable secret was already hashed and is unchanged.' },
    { d: 'SW1', t: 'Turn it back off and note what happens to the already-encrypted passwords.', c: ['no service password-encryption', 'do show running-config'], note: 'They stay encrypted. Disabling the service only stops NEW passwords being scrambled — it cannot un-ring the bell.' },
    { d: 'SW1', t: 'Delete the weaker password and re-enable encryption for good.', c: ['no enable password', 'service password-encryption', 'end'], note: 'The secret is the one that counts. Removing the redundant plain password is the real-world cleanup step.' },

    /* ---- PHASE 5: line options in depth ---- */
    { d: 'SW1', t: 'Give SW1\'s console a timeout and synchronous logging.', c: ['configure terminal', 'line console 0', 'exec-timeout 5 0', 'logging synchronous', 'exit'], note: '<code>exec-timeout 5 0</code> is five minutes and zero seconds. An idle session is logged out automatically.' },
    { d: 'SW1', t: 'Give the vty lines a longer timeout.', c: ['line vty 0 4', 'exec-timeout 10 0', 'logging synchronous', 'end'], note: 'Remote sessions often get a longer allowance than the console, since reconnecting is more disruptive.' },
    { d: 'R1', t: 'Try the single-argument timeout form, then the dangerous one, then something sane.', c: ['configure terminal', 'line console 0', 'exec-timeout 20', 'exec-timeout 0 0', 'exec-timeout 10 0', 'end'], note: '<code>exec-timeout 20</code> means 20 minutes. <code>0 0</code> means never time out — convenient in a lab, a finding in a security audit.' },
    { d: 'SW2', t: 'Finish SW2\'s lines with timeouts on both.', c: ['configure terminal', 'line console 0', 'exec-timeout 5 0', 'logging synchronous', 'exit', 'line vty 0 4', 'exec-timeout 10 0', 'logging synchronous', 'end', 'write memory'] },

    /* ---- PHASE 6: banner variants ---- */
    { d: 'R2', t: 'Set a banner using yet another delimiter character.', c: ['configure terminal', 'banner motd %WARNING: R2 is monitored and logged%', 'do show running-config', 'end'], note: 'Any character works as the delimiter as long as it does not appear inside your message. <code>#</code>, <code>$</code>, <code>%</code>, <code>^</code> are all common.' },
    { d: 'SW3', t: 'Remove a banner entirely with the "no" form.', c: ['configure terminal', 'banner motd @Temporary notice@', 'no banner motd', 'do show running-config', 'end'], note: 'Set it, then remove it. The banner line disappears from the configuration completely.' },

    /* ---- PHASE 7: leaving and re-entering privileged mode ---- */
    { d: 'SW1', t: 'Step down to user mode with disable, then log back in.', c: ['disable', 'enable', 'Cisco123'], note: '<code>disable</code> drops from # to >. Typing <code>enable</code> now prompts for the secret, and what you type is hidden.' },
    { d: 'SW1', t: 'Leave the session entirely with logout, then come back.', c: ['logout', 'enable', 'Cisco123'], note: '<code>logout</code> and <code>exit</code> from privileged mode both end the session. The banner greets you on the way back in.' },
    { d: 'SW2', t: 'Do the same on SW2 so the sequence sticks.', c: ['disable', 'enable', 'Cisco123'], note: 'If the password were wrong you would get three attempts before being dropped back to the start.' },

    /* ---- PHASE 8: NVRAM lifecycle ---- */
    { d: 'SW1', t: 'Compare the two configurations side by side.', c: ['show running-config', 'show startup-config'], note: 'running-config is RAM — what the device is doing now. startup-config is NVRAM — what it will do after a reboot.' },
    { d: 'SW1', t: 'Erase NVRAM and confirm it really is gone.', c: ['erase startup-config', 'show startup-config'], note: 'IOS reports that no startup configuration is present. The running config is untouched — the device keeps working until it reboots.' },
    { d: 'SW1', t: 'Save again so the work survives.', c: ['copy running-config startup-config', 'show startup-config'], note: 'Back in place. Get into the habit of saving after every block of work.' },
    { d: 'R2', t: 'Make an unsaved change, then reload and read what IOS asks.', c: ['configure terminal', 'banner motd #This change was never saved#', 'end', 'reload'], note: 'IOS warns that the configuration has been modified before it reboots. In this simulator the reload is simulated so nothing is lost.' },
    { d: 'R2', t: 'Log back in after the reboot.', c: ['enable', 'Cisco123', 'show running-config'] },

    /* ---- PHASE 9: verification sweep ---- */
    { d: 'R1', t: 'Turn off the pager, then sweep the read-only commands.', c: ['terminal length 0', 'show version'], note: '<code>terminal length 0</code> removes the --More-- prompt so long output scrolls in one go.' },
    { d: 'R1', t: 'Clock, logged-in users, and your own command history.', c: ['show clock', 'show users', 'show history'], note: 'A leading asterisk on the clock means the time is not authoritative — nothing has synchronised it yet.' },
    { d: 'R1', t: 'Both configurations, one after the other.', c: ['show running-config', 'show startup-config'], note: 'R1 was never saved, so its startup config is still empty. Fix that in the next step.' },
    { d: 'R1', t: 'Save R1 and confirm the two now match.', c: ['write memory', 'show startup-config'] },
    { d: 'SW3', t: 'Run the same sweep on a switch for comparison.', c: ['terminal length 0', 'show version', 'show clock', 'show users', 'show running-config'], note: 'Compare <code>show version</code> here with R1\'s — different platform, different image, same command.' },

    /* ---- PHASE 10: links and discovery ---- */
    { d: 'R1', t: 'Bring up all three router links with one range command.', c: ['configure terminal', 'interface range g0/0 - 2', 'description UPLINK', 'no shutdown', 'end', 'show ip interface brief'], note: 'Three interfaces configured at once. Watch for the %LINK-5-CHANGED messages.' },
    { d: 'R2', t: 'Bring up R2\'s links too.', c: ['configure terminal', 'interface range g0/0 - 1', 'no shutdown', 'end', 'show ip interface brief'] },
    { d: 'R1', t: 'Map the network from R1.', c: ['show cdp neighbors', 'show cdp neighbors detail'], note: 'R1 should see SW1, SW2 and R2. Remember: "Local Intrfce" is YOUR port, "Port ID" is theirs.' },
    { d: 'R2', t: 'Cross-check the same topology from R2.', c: ['show cdp neighbors'], note: 'R2 sees R1 and SW3. Between the two views you have mapped the whole network without a diagram.' },
    { d: 'SW1', t: 'And once more from a switch, then save everything.', c: ['show cdp neighbors', 'write memory'], note: 'SW1 sees only R1 — it sits at the edge. Three viewpoints, one consistent picture.' },
  ],
  verify: ['show running-config', 'show startup-config', 'show version', 'show clock', 'show users', 'show cdp neighbors', 'show ip interface brief'],
  explain: `<h3>The mode hierarchy</h3>
<p><b>User EXEC</b> (<code>&gt;</code>) can look but barely touch. <b>Privileged EXEC</b> (<code>#</code>) can see everything and save. <b>Global config</b> (<code>(config)#</code>) changes the device. Beneath that sit sub-modes: interface, line, vlan, router, and more — each with its own prompt. <code>exit</code> steps back one level, <code>end</code> jumps straight to privileged EXEC, and Ctrl-Z does the same as <code>end</code>.</p>
<h3>Passwords: four independent places</h3>
<p>The <b>console line</b> (physical access), the <b>vty lines</b> (remote access), the <b>enable secret</b> (privileged mode) and <b>usernames</b> are four separate protections. Securing one does nothing for the others, which is why the baseline configures each explicitly.</p>
<p><code>enable secret</code> stores an MD5 hash; <code>enable password</code> stores plain text. When both exist IOS uses the secret and ignores the password entirely. <code>service password-encryption</code> applies weak type-7 encryption to the plain-text ones — reversible in seconds by any online tool, but it stops a passer-by reading a screen. Note that disabling the service does not decrypt anything already encrypted.</p>
<h3>Line options</h3>
<p><code>exec-timeout minutes seconds</code> logs idle sessions out; the default is 10 minutes and <code>0 0</code> disables it. <code>logging synchronous</code> re-prints the line you were typing after a log message interrupts it — without it, a flapping link while you configure is genuinely maddening. <code>login</code> makes the line check its password; without that line the password is ignored.</p>
<h3>Two configurations, two memories</h3>
<p><b>running-config</b> is in RAM and is live. <b>startup-config</b> is in NVRAM and is loaded at boot. <code>copy running-config startup-config</code>, <code>write memory</code> and <code>write</code> all copy RAM to NVRAM. <code>erase startup-config</code> empties NVRAM so the device boots to factory defaults — the first step when decommissioning or repurposing a device.</p>
<h3>Router versus switch defaults</h3>
<p>Router interfaces ship <b>shutdown</b>; switch interfaces ship <b>enabled</b>. The logic is that a router port needs deliberate addressing before it should carry traffic, while a switch is expected to work the moment it is plugged in. Expect at least one exam question that turns on this distinction.</p>`,
  checks: [
    { desc: 'All five devices are named (SW1, SW2, SW3, R1, R2)', fn: H => ['SW1', 'SW2', 'SW3', 'R1', 'R2'].every(n => H.hostname(n, n)) },
    { desc: 'Every device has an enable secret', fn: H => ['SW1', 'SW2', 'SW3', 'R1', 'R2'].every(n => !!H.d(n).enableSecret) },
    { desc: 'SW1\'s redundant enable password was removed, secret kept', fn: H => !H.d('SW1').enablePassword && H.d('SW1').enableSecret === 'Cisco123' },
    { desc: 'All five consoles have a password with login enabled', fn: H => ['SW1', 'SW2', 'SW3', 'R1', 'R2'].every(n => { const l = H.d(n).lines.con; return !!l.password && l.login; }) },
    { desc: 'All five vty lines have a password with login enabled', fn: H => ['SW1', 'SW2', 'SW3', 'R1', 'R2'].every(n => { const l = H.d(n).lines.vty; return !!l.password && l.login; }) },
    { desc: 'SW1, SW2, SW3 and R1 have console exec-timeouts set', fn: H => ['SW1', 'SW2', 'SW3', 'R1'].every(n => !!H.d(n).lines.con.execTimeout) },
    { desc: 'R1\'s console timeout was put back to a sane value (not 0 0)', fn: H => H.d('R1').lines.con.execTimeout === '10 0' },
    { desc: 'SW1, SW2 and R1 use logging synchronous on the console', fn: H => ['SW1', 'SW2', 'R1'].every(n => H.d(n).lines.con.sync) },
    { desc: 'service password-encryption ended up enabled on SW1', fn: H => H.d('SW1').svcEnc },
    { desc: 'Banners set on SW1, SW2, R1 and R2', fn: H => ['SW1', 'SW2', 'R1', 'R2'].every(n => !!H.d(n).banner) },
    { desc: 'SW3\'s banner was removed again with the no form', fn: H => !H.d('SW3').banner },
    { desc: 'Domain names set and DNS lookup disabled on all five', fn: H => ['SW1', 'SW2', 'SW3', 'R1', 'R2'].every(n => !!H.d(n).domainName && !H.d(n).domainLookup) },
    { desc: 'All five devices saved to NVRAM', fn: H => ['SW1', 'SW2', 'SW3', 'R1', 'R2'].every(n => H.saved(n)) },
    { desc: 'R1\'s three links are described and enabled', fn: H => ['g0/0', 'g0/1', 'g0/2'].every(p => H.noshut('R1', p) && !!H.i('R1', p).desc) },
    { desc: 'R2\'s links are enabled', fn: H => ['g0/0', 'g0/1'].every(p => H.noshut('R2', p)) },
    { desc: 'R1 sees SW1, SW2 and R2 over CDP', fn: H => { const n = ND.cdpNeighbors(H.topo, H.d('R1')).map(x => x.dev.id); return ['SW1', 'SW2', 'R2'].every(x => n.includes(x)); } },
    { desc: 'R2 sees R1 and SW3 over CDP', fn: H => { const n = ND.cdpNeighbors(H.topo, H.d('R2')).map(x => x.dev.id); return n.includes('R1') && n.includes('SW3'); } },
  ],
});

/* ============================================================= */
L({
  id: 'x2-interfaces', vol: 1, tier: 'deep', day: 'Days 8-9', title: 'Interfaces & Addressing — Full Drill',
  topics: 'physical · loopback · SVI · routed port · subinterface · every range form · speed/duplex · all three status wordings · every show command',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1'] },
    { id: 'SW1', type: 'switch', l3switch: true, ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'f0/5', 'f0/6', 'f0/7', 'f0/8', 'g0/1', 'g0/2'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'g0/1'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.1.1.10', mask: '255.255.255.0', gw: '10.1.1.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.2.2.10', mask: '255.255.255.0', gw: '10.2.2.1' } },
  ],
  links: [
    ['R1', 'g0/0', 'SW1', 'g0/1'], ['SW1', 'f0/1', 'PC1', 'e0'],
    ['R1', 'g0/2', 'R2', 'g0/0'], ['R2', 'g0/1', 'SW2', 'g0/1'], ['SW2', 'f0/1', 'PC2', 'e0'],
  ],
  layout: { PC1: [35, 22], SW1: [120, 58], R1: [205, 58], R2: [290, 58], SW2: [360, 22], PC2: [360, 105] },
  intro: `<b>The situation:</b> two routers, two switches and two PCs, none of them addressed and none of the router ports even switched on.<br><b>Your goal:</b> every kind of interface at CCNA level, configured repeatedly until the pattern is automatic — physical ports, several loopbacks, management SVIs on both switches, a routed port on the layer-3 switch, and a subinterface. Along the way you will produce all three of the interface status wordings deliberately, so that when you meet one in a fault you already know what it means, and you will finish by sweeping every verification command there is.`,
  tasks: [
    { t: 'PHASE 1 — On R1, configure G0/0 typing the interface name in full, then verify', why: 'Typing GigabitEthernet0/0 once fixes the real name in your mind. From then on the abbreviation is a shortcut you understand rather than a magic word.' },
    { t: 'Configure R1 G0/2 the same way but using the abbreviated form, and time the difference', why: 'IOS accepts any unambiguous abbreviation. "int g0/2" is the same command — speed matters when you have forty ports to do.' },
    { t: 'PHASE 2 — Repeat the whole address-describe-enable pattern on both of R2\'s interfaces', why: 'The third and fourth repetitions of the most-typed sequence in CCNA. Aim to do these without looking at the commands.' },
    { t: 'PHASE 3 — Create three loopbacks on R1 with /32, /24 and /30 masks, and note none of them need enabling', why: 'Loopbacks are virtual and always up. Different mask lengths on the same device make the prefix arithmetic concrete.' },
    { t: 'Add a loopback to R2 as well and confirm it appears immediately in the interface list', why: 'Repetition, and confirmation that the "always up" behaviour is a property of loopbacks rather than of R1.' },
    { t: 'PHASE 4 — Deliberately produce all three interface states: administratively down, down/down, and up/up', why: 'These three wordings are the heart of interface troubleshooting. Producing each on purpose is far better than meeting them cold in a fault.' },
    { t: 'PHASE 5 — On SW1, configure F0/1 alone, then F0/2-F0/3 as a contiguous range, then F0/5 and F0/7 as a comma list', why: 'Three forms of interface selection. The range command is what makes a 48-port switch survivable.' },
    { t: 'Set speed and duplex explicitly on the host ports, then return one pair to auto', why: 'Hard-coding prevents duplex mismatch; returning to auto shows you the "a-" prefix appear again in show interfaces status.' },
    { t: 'Add descriptions to several ports, then remove one with the no form', why: 'Descriptions cost nothing and document intent. Removing cleanly matters as much as adding.' },
    { t: 'Shut down every unused port on SW1 in a single range command', why: 'Baseline hardening: a live unused jack is an open invitation.' },
    { t: 'PHASE 6 — Repeat the port configuration pattern on SW2 with its own ranges', why: 'Second switch, same commands. Repetition across devices is what turns recall into reflex.' },
    { t: 'PHASE 7 — Give both switches a management SVI and a default gateway', why: 'A layer-2 switch has no routed ports, so its management address lives on a virtual VLAN interface, and it needs a gateway to answer traffic from other subnets.' },
    { t: 'PHASE 8 — Turn SW1 into a router: enable ip routing and convert G0/2 into a routed port with its own address', why: 'A multilayer switch can drop layer-2 behaviour on a port entirely with "no switchport", making it behave exactly like a router interface.' },
    { t: 'Convert that routed port back into a switchport and watch the IP address disappear', why: 'The reverse operation. An IP address cannot survive on a port that has gone back to switching, which is why IOS discards it.' },
    { t: 'PHASE 9 — Create a subinterface on R1 G0/1 and give it a tag and an address', why: 'Subinterfaces split one physical port into several logical ones. Here you meet the syntax; the VLAN drill puts it to work.' },
    { t: 'PHASE 10 — Sweep every verification command on a router: ip interface brief, interfaces, ip interface, running-config', why: 'Three levels of interface detail: one-line summary, full layer 1/2 detail, and layer-3 detail including filters and helpers.' },
    { t: 'Sweep the switch-specific views: interfaces status and interfaces switchport', why: 'The Vlan column reads a number for access ports, "trunk" for trunks and "routed" for layer-3 ports — one screen tells you the role of every port.' },
    { t: 'PHASE 11 — Prove connectivity: PC1 to its gateway, to the switch SVI, and across to the far router', why: 'Each ping tests a different thing — the router interface, the switch management address, and end-to-end routing.' },
  ],
  steps: [
    /* ---- PHASE 1: physical interfaces, long form then short ---- */
    { d: 'R1', t: 'Name the router, then configure G0/0 typing the interface name in full.', c: ['enable', 'configure terminal', 'hostname R1', 'interface gigabitethernet 0/0', 'description LAN-SIDE-TO-SW1', 'ip address 10.1.1.1 255.255.255.0', 'no shutdown', 'exit'], note: 'The full name is GigabitEthernet0/0. Typing it once makes every later abbreviation meaningful.' },
    { d: 'R1', t: 'Now the same pattern on G0/2 using the abbreviation.', c: ['interface g0/2', 'description WAN-LINK-TO-R2', 'ip address 10.0.12.1 255.255.255.252', 'no shutdown', 'exit'], note: 'Identical command, a fraction of the keystrokes. IOS accepts any abbreviation that is unambiguous.' },
    { d: 'R1', t: 'Check both, then note the third port is still untouched.', c: ['do show ip interface brief'], note: 'G0/0 and G0/2 are up/up. G0/1 still reads administratively down — the router default.' },

    /* ---- PHASE 2: repeat on R2 ---- */
    { d: 'R2', t: 'Third repetition — R2\'s link back to R1.', c: ['enable', 'configure terminal', 'hostname R2', 'interface g0/0', 'description WAN-LINK-TO-R1', 'ip address 10.0.12.2 255.255.255.252', 'no shutdown', 'exit'], note: 'Both ends of a /30 must sit in the same tiny subnet: .1 and .2 here.' },
    { d: 'R2', t: 'Fourth repetition — R2\'s LAN side.', c: ['interface g0/1', 'description LAN-SIDE-TO-SW2', 'ip address 10.2.2.1 255.255.255.0', 'no shutdown', 'exit', 'do show ip interface brief'], note: 'By the fourth time the sequence should be flowing: interface, description, address, no shutdown.' },
    { d: 'R2', t: 'Test the link between the two routers straight away.', c: ['do ping 10.0.12.1'], note: 'Confirm each layer works before building the next one on top of it.' },

    /* ---- PHASE 3: loopbacks with three mask lengths ---- */
    { d: 'R1', t: 'Create three loopbacks with three different mask lengths.', c: ['interface loopback 0', 'ip address 1.1.1.1 255.255.255.255', 'interface loopback 1', 'ip address 172.16.1.1 255.255.255.0', 'interface loopback 2', 'ip address 192.168.100.1 255.255.255.252', 'exit', 'do show ip interface brief'], note: 'All three are up/up immediately — no <code>no shutdown</code> anywhere. A /32 is the convention for a router identity address.' },
    { d: 'R2', t: 'Add a loopback on R2 too.', c: ['interface loopback 0', 'ip address 2.2.2.2 255.255.255.255', 'exit', 'do show ip interface brief'], note: 'Same behaviour on a different device: virtual interfaces come up on their own.' },

    /* ---- PHASE 4: the three status wordings ---- */
    { d: 'R1', t: 'State one — address G0/1 but leave it shut, and read the wording.', c: ['interface g0/1', 'ip address 10.9.9.1 255.255.255.0', 'do show ip interface brief'], note: 'STATE 1: "administratively down / down". This has exactly one cause — somebody typed shutdown, or never typed no shutdown.' },
    { d: 'R1', t: 'State two — enable it. Nothing is plugged in, so watch the wording change.', c: ['no shutdown', 'do show ip interface brief'], note: 'STATE 2: "down / down". Enabled, but no signal — a cable, a dead far end, or a speed mismatch.' },
    { d: 'R1', t: 'State three — look at a port that has a live neighbour.', c: ['do show ip interface brief'], note: 'STATE 3: "up / up" on G0/0 and G0/2. Status is layer 1, Protocol is layer 2. Only up/up actually carries traffic.' },
    { d: 'R1', t: 'Shut and re-enable a working port to watch the log messages.', c: ['interface g0/0', 'shutdown', 'no shutdown', 'exit'], note: 'The %LINK-5-CHANGED and %LINEPROTO-5-UPDOWN messages are the device telling you exactly what just happened.' },

    /* ---- PHASE 5: switch ports, three selection forms ---- */
    { d: 'SW1', t: 'Name the switch, then configure one port on its own.', c: ['enable', 'configure terminal', 'hostname SW1', 'interface f0/1', 'description PC1-DESK-PORT', 'speed 100', 'duplex full', 'exit'], note: 'A single interface. Hard-coding speed and duplex prevents the mismatch that halves throughput on a link that still shows up.' },
    { d: 'SW1', t: 'Now a contiguous range — two ports at once.', c: ['interface range f0/2 - 3', 'description SPARE-DESK-PORT', 'speed 100', 'duplex full', 'exit'], note: 'Note the spaces around the hyphen: <code>f0/2 - 3</code>. Everything you type now applies to both ports.' },
    { d: 'SW1', t: 'And a comma list — two non-adjacent ports.', c: ['interface range f0/5, f0/7', 'description LAB-PORT', 'duplex half', 'exit'], note: 'Ranges accept lists and combinations: <code>interface range f0/2 - 3, f0/5, f0/7</code> would take all four.' },
    { d: 'SW1', t: 'Return one pair to automatic negotiation.', c: ['interface range f0/2 - 3', 'speed auto', 'duplex auto', 'exit', 'do show interfaces status'], note: 'In the output, manually-set values print plain (100, full) while negotiated ones carry an "a-" prefix (a-100, a-full).' },
    { d: 'SW1', t: 'Remove one description with the no form.', c: ['interface f0/5', 'no description', 'exit', 'do show interfaces status'], note: 'The Name column for F0/5 is now blank. Every command has a "no" form.' },
    { d: 'SW1', t: 'Disable every unused port in one command.', c: ['interface range f0/4, f0/6, f0/8', 'shutdown', 'exit', 'do show interfaces status'], note: 'Those ports now read "disabled". Unused live jacks are the easiest way into a network.' },

    /* ---- PHASE 6: repeat on SW2 ---- */
    { d: 'SW2', t: 'Second switch — same pattern, its own ports.', c: ['enable', 'configure terminal', 'hostname SW2', 'interface f0/1', 'description PC2-DESK-PORT', 'speed 100', 'duplex full', 'exit'] },
    { d: 'SW2', t: 'Range the rest and shut the spares.', c: ['interface range f0/2 - 4', 'description UNUSED', 'shutdown', 'exit', 'do show interfaces status'], note: 'Describing a port as UNUSED and disabling it in the same breath is a tidy habit.' },

    /* ---- PHASE 7: management SVIs ---- */
    { d: 'SW1', t: 'Give SW1 a management address on the VLAN 1 SVI.', c: ['interface vlan 1', 'ip address 10.1.1.2 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 10.1.1.1'], note: 'A layer-2 switch cannot hold an IP on a physical port. The SVI is its layer-3 presence, and the gateway lets it answer remote traffic.' },
    { d: 'SW2', t: 'Repeat on SW2 with its own subnet.', c: ['interface vlan 1', 'ip address 10.2.2.2 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 10.2.2.1', 'do show ip interface brief'], note: 'Same three lines, different numbers. The SVI is up because VLAN 1 exists and has active ports.' },

    /* ---- PHASE 8: routed port round trip ---- */
    { d: 'SW1', t: 'Enable routing on the multilayer switch.', c: ['ip routing'], note: 'Without this the switch holds addresses but forwards nothing between subnets.' },
    { d: 'SW1', t: 'Convert an uplink into a true routed port.', c: ['interface g0/2', 'no switchport', 'ip address 172.16.99.1 255.255.255.252', 'no shutdown', 'exit', 'do show interfaces status'], note: '<code>no switchport</code> strips layer-2 behaviour. The Vlan column for G0/2 now reads "routed". A plain 2960 would reject the command.' },
    { d: 'SW1', t: 'Now reverse it and watch the address vanish.', c: ['interface g0/2', 'switchport', 'do show running-config', 'exit'], note: 'The IP address is gone. A switchport cannot hold one, so IOS discards it rather than keeping a setting that cannot apply.' },
    { d: 'SW1', t: 'Put it back as a routed port and keep it that way.', c: ['interface g0/2', 'no switchport', 'ip address 172.16.99.1 255.255.255.252', 'no shutdown', 'end'], note: 'Round trip complete. You have now seen the command work in both directions.' },

    /* ---- PHASE 9: subinterface ---- */
    { d: 'R1', t: 'Create a subinterface on the spare port and tag it.', c: ['interface g0/1.100', 'encapsulation dot1q 100', 'ip address 10.100.0.1 255.255.255.0', 'exit', 'do show ip interface brief'], note: 'The encapsulation line must come before the address — the tag is what defines the subinterface. Notice it inherits the physical port\'s up state.' },

    /* ---- PHASE 10: full verification sweep ---- */
    { d: 'R1', t: 'Level one — the one-line summary of every interface.', c: ['end', 'terminal length 0', 'show ip interface brief'], note: 'The command you will type more than any other. Every interface, its address, and both state columns.' },
    { d: 'R1', t: 'Level two — full physical and layer-2 detail for one port.', c: ['show interfaces g0/0'], note: 'MAC address, MTU, bandwidth, duplex, speed and counters. This is where you find input errors and collisions.' },
    { d: 'R1', t: 'Level three — the layer-3 view of the same port.', c: ['show ip interface g0/0'], note: 'Address and mask, plus whether any access list, helper address or NAT role is applied. A different command from <code>show interfaces</code>.' },
    { d: 'R1', t: 'And the configuration that produced it all.', c: ['show running-config', 'write memory'] },
    { d: 'SW1', t: 'The switch-specific summary view.', c: ['terminal length 0', 'show interfaces status'], note: 'One line per port: status, VLAN (a number, "trunk", or "routed"), duplex, speed and type. The fastest switch overview there is.' },
    { d: 'SW1', t: 'And the full switchport detail.', c: ['show interfaces switchport'], note: 'Administrative versus operational mode, access VLAN, native VLAN, voice VLAN — per port.' },
    { d: 'SW1', t: 'Save the switch configuration.', c: ['write memory'] },
    { d: 'SW2', t: 'Same two views on the second switch, then save.', c: ['end', 'show interfaces status', 'show ip interface brief', 'write memory'] },

    /* ---- PHASE 11: connectivity proof ---- */
    { d: 'PC1', t: 'Test the near end: gateway first, then the switch itself.', c: ['ipconfig', 'ping 10.1.1.1', 'ping 10.1.1.2'], note: 'Two different devices answering on the same subnet — the router interface and the switch management SVI.' },
    { d: 'R1', t: 'Reach R2\'s loopback across the WAN link.', c: ['ping 10.0.12.2', 'ping 2.2.2.2'], note: 'The link address works. The loopback fails — R1 has no route to it, which is exactly what the static routing drill fixes.' },
    { d: 'PC2', t: 'Confirm the far side works the same way.', c: ['ipconfig', 'ping 10.2.2.1', 'ping 10.2.2.2'] },
  ],
  verify: ['show ip interface brief', 'show interfaces status', 'show interfaces switchport', 'show interfaces g0/0', 'show ip interface g0/0', 'show running-config'],
  explain: `<h3>Six kinds of interface</h3>
<p><b>Physical</b> (G0/0) — a real port. <b>Loopback</b> — virtual, always up, used for router IDs, management and testing. <b>SVI</b> (<code>interface vlan N</code>) — a switch's layer-3 presence inside a VLAN. <b>Routed port</b> (<code>no switchport</code>) — a multilayer switch port acting as a router interface. <b>Subinterface</b> (G0/1.100) — one physical port split logically per VLAN. <b>Port-channel</b> — several physical ports bundled as one, which the EtherChannel drill covers.</p>
<h3>The three status wordings, and what each means</h3>
<p><code>show ip interface brief</code> has two state columns: <b>Status</b> is layer 1, <b>Protocol</b> is layer 2.</p>
<ul>
<li><b>administratively down / down</b> — somebody typed <code>shutdown</code>, or never typed <code>no shutdown</code>. One cause, one fix.</li>
<li><b>down / down</b> — enabled, but no signal. Cable, far end down, or a speed mismatch.</li>
<li><b>up / down</b> — layer 1 is fine, layer 2 is not. An encapsulation or keepalive problem, most often a mismatched setting between the two ends.</li>
<li><b>up / up</b> — the only state that carries traffic.</li>
</ul>
<h3>Speed, duplex and the mismatch trap</h3>
<p>Autonegotiation is reliable when both ends do it. The failure is one end hard-coded and the other on auto: the auto side cannot detect duplex, defaults to half, and you get late collisions and dreadful throughput on a link that still reports "up". Set both ends or neither. In <code>show interfaces status</code>, negotiated values carry an "a-" prefix.</p>
<h3>Switch management addressing</h3>
<p>A layer-2 switch has no routed ports, so its address lives on an SVI, and it needs <code>ip default-gateway</code> to reply to traffic from other subnets. A layer-3 switch with <code>ip routing</code> enabled does not — it consults its own routing table instead, which is precisely why the two commands rarely appear together.</p>
<h3>Interface ranges</h3>
<p><code>interface range f0/1 - 4</code> for contiguous ports, <code>interface range f0/1, f0/5</code> for a list, and the two forms combine. The spaces around the hyphen are required. Everything typed afterwards applies to every selected port, which is the only sane way to manage a 48-port switch.</p>`,
  checks: [
    { desc: 'R1 G0/0 and G0/2 addressed, described and up', fn: H => H.hasIp('R1', 'g0/0', '10.1.1.1') && H.hasIp('R1', 'g0/2', '10.0.12.1') && ['g0/0', 'g0/2'].every(p => H.noshut('R1', p) && !!H.i('R1', p).desc) },
    { desc: 'R1 G0/1 addressed and enabled after the status demonstration', fn: H => H.hasIp('R1', 'g0/1', '10.9.9.1') && H.noshut('R1', 'g0/1') },
    { desc: 'R1 has three loopbacks with /32, /24 and /30 masks', fn: H => H.hasIp('R1', 'lo0', '1.1.1.1', '255.255.255.255') && H.hasIp('R1', 'lo1', '172.16.1.1', '255.255.255.0') && H.hasIp('R1', 'lo2', '192.168.100.1', '255.255.255.252') },
    { desc: 'R2 fully addressed with its own loopback', fn: H => H.hasIp('R2', 'g0/0', '10.0.12.2') && H.hasIp('R2', 'g0/1', '10.2.2.1') && H.hasIp('R2', 'lo0', '2.2.2.2') },
    { desc: 'The two routers can reach each other across the WAN link', fn: H => H.ping('R1', '10.0.12.2') && H.ping('R2', '10.0.12.1') },
    { desc: 'SW1 F0/1 hard-coded to 100/full with a description', fn: H => { const i = H.i('SW1', 'f0/1'); return i.speed === '100' && i.duplex === 'full' && !!i.desc; } },
    { desc: 'SW1 F0/2-3 returned to auto speed and duplex', fn: H => ['f0/2', 'f0/3'].every(p => H.i('SW1', p).speed === 'auto' && H.i('SW1', p).duplex === 'auto') },
    { desc: 'SW1 F0/5 had its description removed; F0/7 kept half duplex', fn: H => !H.i('SW1', 'f0/5').desc && H.i('SW1', 'f0/7').duplex === 'half' },
    { desc: 'SW1 unused ports F0/4, F0/6 and F0/8 are shut down', fn: H => ['f0/4', 'f0/6', 'f0/8'].every(p => H.i('SW1', p).shutdown) },
    { desc: 'SW2 F0/1 configured and F0/2-4 described and shut down', fn: H => H.i('SW2', 'f0/1').speed === '100' && ['f0/2', 'f0/3', 'f0/4'].every(p => H.i('SW2', p).shutdown && !!H.i('SW2', p).desc) },
    { desc: 'Both switches have management SVIs and default gateways', fn: H => H.hasIp('SW1', 'vlan1', '10.1.1.2') && H.d('SW1').defaultGateway === '10.1.1.1' && H.hasIp('SW2', 'vlan1', '10.2.2.2') && H.d('SW2').defaultGateway === '10.2.2.1' },
    { desc: 'SW1 has ip routing enabled', fn: H => H.d('SW1').ipRouting },
    { desc: 'SW1 G0/2 is a routed port with its address restored after the round trip', fn: H => H.i('SW1', 'g0/2').noSwitchport && H.hasIp('SW1', 'g0/2', '172.16.99.1') },
    { desc: 'R1 has a dot1q subinterface G0/1.100 with an address', fn: H => { const s = H.i('R1', 'g0/1.100'); return !!(s && s.encapDot1q && s.encapDot1q.vlan === 100 && s.ip && s.ip.addr === '10.100.0.1'); } },
    { desc: 'PC1 reaches both its gateway and the switch SVI', fn: H => H.ping('PC1', '10.1.1.1') && H.ping('PC1', '10.1.1.2') },
    { desc: 'PC2 reaches both its gateway and the switch SVI', fn: H => H.ping('PC2', '10.2.2.1') && H.ping('PC2', '10.2.2.2') },
    { desc: 'R1, SW1 and SW2 configurations saved', fn: H => ['R1', 'SW1', 'SW2'].every(d => H.saved(d)) },
  ],
});

/* ============================================================= */
L({
  id: 'x3-vlans', vol: 1, tier: 'deep', day: 'Days 16-19', title: 'VLANs, Trunking & Inter-VLAN — Full Drill',
  topics: '3 VLANs across 3 switches · create/name/delete · access & voice · DTP · 4 trunks · every allowed-list form · native VLAN · VTP · 3 subinterfaces',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3', 'f0/4', 'g0/1', 'g0/2'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1', 'g0/2'] },
    { id: 'SW3', type: 'switch', ifaces: ['f0/1', 'g0/1'] },
    { id: 'R1', type: 'router', ifaces: ['g0/0'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.11', mask: '255.255.255.0', gw: '10.0.10.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.20.11', mask: '255.255.255.0', gw: '10.0.20.1' } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.30.11', mask: '255.255.255.0', gw: '10.0.30.1' } },
    { id: 'PC4', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.12', mask: '255.255.255.0', gw: '10.0.10.1' } },
    { id: 'PC5', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.20.12', mask: '255.255.255.0', gw: '10.0.20.1' } },
    { id: 'PC6', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.30.12', mask: '255.255.255.0', gw: '10.0.30.1' } },
  ],
  links: [
    ['PC1', 'e0', 'SW1', 'f0/1'], ['PC2', 'e0', 'SW1', 'f0/2'], ['PC3', 'e0', 'SW1', 'f0/3'],
    ['SW1', 'g0/2', 'R1', 'g0/0'], ['SW1', 'g0/1', 'SW2', 'g0/1'],
    ['SW2', 'f0/1', 'PC4', 'e0'], ['SW2', 'f0/2', 'PC5', 'e0'],
    ['SW2', 'g0/2', 'SW3', 'g0/1'], ['SW3', 'f0/1', 'PC6', 'e0'],
  ],
  layout: { R1: [110, 18], SW1: [110, 72], SW2: [215, 72], SW3: [315, 72], PC1: [30, 40], PC2: [30, 72], PC3: [30, 104], PC4: [215, 122], PC5: [215, 30], PC6: [375, 72] },
  intro: `<b>The situation:</b> three switches chained together carrying three departments — Engineering, Sales and Guest — with users of each scattered across different switches. One router arm is available for routing between them.<br><b>Your goal:</b> the complete VLAN command set, with every pattern repeated enough times to stick. You will build the VLAN database three times, assign six access ports, configure <b>four separate trunk ends</b>, work through every single form of the allowed-VLAN list, and finish with three router subinterfaces. Then you will test a full connectivity matrix to prove each VLAN is genuinely isolated until the router says otherwise.`,
  tasks: [
    { t: 'PHASE 1 — On SW1, create VLANs 10 (ENG), 20 (SALES) and 30 (GUEST), plus a spare VLAN 99 you will delete again', why: 'A VLAN must exist in the switch database before a port can meaningfully join it. Creating and deleting in the same session makes both commands familiar.' },
    { t: 'PHASE 2 — Build the identical VLAN database on SW2, then again on SW3', why: 'VLANs are per-switch. A tagged frame arriving for a VLAN the receiving switch has not created is dropped — so all three need the same database. Three repetitions of the same block.' },
    { t: 'PHASE 3 — Assign SW1\'s three access ports, one to each VLAN, and add a voice VLAN to the first', why: 'An access port carries exactly one data VLAN untagged. Voice VLAN adds a second, tagged VLAN for an IP phone sharing the same cable.' },
    { t: 'Assign SW2\'s two access ports and SW3\'s single one', why: 'Three more repetitions of switchport mode access plus switchport access vlan — the pair you will type most often on a switch.' },
    { t: 'PHASE 4 — Watch DTP negotiate a trunk on its own before you take control of it', why: 'Seeing the automatic behaviour first is what makes the security argument for disabling it land.' },
    { t: 'PHASE 5 — Configure all four trunk ends as fixed trunks with nonegotiate and native VLAN 1001', why: 'Four repetitions: both ends of SW1–SW2, both ends of SW2–SW3. Both ends must always match, and a nonegotiate trunk facing a dynamic port simply will not form.' },
    { t: 'PHASE 6 — On the SW1–SW2 trunk, work through every allowed-list form: set, add, remove, none, all, then set again', why: 'Six commands on one interface. "allowed vlan 10,20,30" REPLACES the list — on a live trunk that severs every VLAN you left out. "add" and "remove" are the safe editing forms.' },
    { t: 'Prune the remaining trunks to only the VLANs each actually needs', why: 'The SW2–SW3 link only carries Guest traffic, so there is no reason for Engineering and Sales frames to cross it.' },
    { t: 'PHASE 7 — Put all three switches into VTP transparent mode in the same domain', why: 'Transparent means "never sync my VLAN database with anybody" — protection against a switch with a higher revision number wiping every VLAN in the domain.' },
    { t: 'PHASE 8 — Trunk SW1\'s uplink to the router, allowing only the three data VLANs', why: 'The "stick" in router-on-a-stick. All three VLANs must ride this one cable for the router to see them.' },
    { t: 'Create three subinterfaces on R1, one per VLAN, each addressed as that VLAN\'s gateway', why: 'Three repetitions of the subinterface pattern: create, tag with encapsulation, address. The tag must be set before the address.' },
    { t: 'PHASE 9 — Sweep the verification commands on every switch: show vlan brief, show interfaces trunk, show interfaces switchport', why: 'Three views, three switches. Reading trunk output fluently — mode, encapsulation, native VLAN, allowed list — is a guaranteed exam skill.' },
    { t: 'PHASE 10 — Test same-VLAN connectivity across switches for all three VLANs', why: 'PC1 to PC4 crosses one trunk; PC3 to PC6 crosses two. If tagging works, distance does not matter.' },
    { t: 'Test cross-VLAN connectivity through the router in several directions', why: 'Proves router-on-a-stick: the packet leaves tagged for one VLAN and returns tagged for another, over the same physical cable.' },
    { t: 'Finally, remove VLAN 30 from the router trunk and confirm Guest loses its gateway', why: 'A deliberate break that demonstrates exactly what the allowed list controls — then you put it back.' },
  ],
  steps: [
    /* ---- PHASE 1: VLAN database on SW1 ---- */
    { d: 'SW1', t: 'Name the switch and look at the VLAN database before touching it.', c: ['enable', 'configure terminal', 'hostname SW1', 'do show vlan brief'], note: 'Only VLAN 1 (default) and the legacy 1002-1005 entries exist. Every port is currently in VLAN 1.' },
    { d: 'SW1', t: 'Create the three department VLANs with names.', c: ['vlan 10', 'name ENGINEERING', 'vlan 20', 'name SALES', 'vlan 30', 'name GUEST', 'exit', 'do show vlan brief'], note: 'Note you can move straight from one <code>vlan</code> command to the next without exiting — IOS keeps you in VLAN config mode.' },
    { d: 'SW1', t: 'Create a spare VLAN, then delete it again.', c: ['vlan 99', 'name TEMPORARY', 'exit', 'do show vlan brief', 'no vlan 99', 'do show vlan brief'], note: 'VLAN 99 appears then disappears. Careful on a live switch: ports left in a deleted VLAN go dark, because their traffic has nowhere to go.' },

    /* ---- PHASE 2: repeat the database twice more ---- */
    { d: 'SW2', t: 'Second switch — the identical VLAN database.', c: ['enable', 'configure terminal', 'hostname SW2', 'vlan 10', 'name ENGINEERING', 'vlan 20', 'name SALES', 'vlan 30', 'name GUEST', 'exit', 'do show vlan brief'], note: 'Same names on every switch is not required by the protocol, but inconsistent names are a documentation nightmare.' },
    { d: 'SW3', t: 'Third switch — same again.', c: ['enable', 'configure terminal', 'hostname SW3', 'vlan 10', 'name ENGINEERING', 'vlan 20', 'name SALES', 'vlan 30', 'name GUEST', 'exit', 'do show vlan brief'], note: 'Three databases built. This is the repetition that makes the syntax automatic.' },

    /* ---- PHASE 3: access ports ---- */
    { d: 'SW1', t: 'Assign the first access port and give it a voice VLAN too.', c: ['interface f0/1', 'description PC1-ENGINEERING', 'switchport mode access', 'switchport access vlan 10', 'switchport voice vlan 150', 'exit'], note: 'A phone tags its voice traffic into VLAN 150 while the PC behind it stays untagged in VLAN 10. One cable, two VLANs. Note VLAN 150 is auto-created.' },
    { d: 'SW1', t: 'Second and third access ports, one VLAN each.', c: ['interface f0/2', 'description PC2-SALES', 'switchport mode access', 'switchport access vlan 20', 'interface f0/3', 'description PC3-GUEST', 'switchport mode access', 'switchport access vlan 30', 'exit', 'do show vlan brief'], note: 'Three ports, three VLANs, on one switch. The Ports column of show vlan brief now tells the whole story.' },
    { d: 'SW1', t: 'Park the unused port in the Guest VLAN and disable it.', c: ['interface f0/4', 'description UNUSED', 'switchport mode access', 'switchport access vlan 30', 'shutdown', 'exit'], note: 'Parking unused ports in a dead-end VLAN and shutting them is belt-and-braces hardening.' },
    { d: 'SW2', t: 'SW2\'s two access ports.', c: ['interface f0/1', 'description PC4-ENGINEERING', 'switchport mode access', 'switchport access vlan 10', 'interface f0/2', 'description PC5-SALES', 'switchport mode access', 'switchport access vlan 20', 'exit', 'do show vlan brief'] },
    { d: 'SW3', t: 'SW3\'s single access port.', c: ['interface f0/1', 'description PC6-GUEST', 'switchport mode access', 'switchport access vlan 30', 'exit', 'do show vlan brief'], note: 'Six access ports configured across three switches. The pattern should be automatic by now.' },

    /* ---- PHASE 4: DTP observation ---- */
    { d: 'SW1', t: 'Let DTP form a trunk by itself before you take control.', c: ['interface g0/1', 'switchport mode dynamic desirable', 'do show interfaces trunk'], note: 'SW2 is still at its default (dynamic auto), which accepts the invitation. desirable + auto = trunk, with nobody typing "mode trunk". Convenient, and exploitable.' },

    /* ---- PHASE 5: four trunk ends ---- */
    { d: 'SW1', t: 'Trunk end 1 — fixed trunk, DTP off, safe native VLAN.', c: ['switchport mode trunk', 'switchport nonegotiate', 'switchport trunk native vlan 1001', 'exit'], note: 'Three lines that should become one reflex. Native VLAN 1001 is unused, so nothing real travels untagged.' },
    { d: 'SW2', t: 'Trunk end 2 — the matching side of that link.', c: ['interface g0/1', 'switchport mode trunk', 'switchport nonegotiate', 'switchport trunk native vlan 1001', 'exit'], note: 'Both ends must match. A nonegotiate trunk facing a port left on "dynamic auto" never forms, because neither side will ask.' },
    { d: 'SW2', t: 'Trunk end 3 — the link onward to SW3.', c: ['interface g0/2', 'switchport mode trunk', 'switchport nonegotiate', 'switchport trunk native vlan 1001', 'exit'] },
    { d: 'SW3', t: 'Trunk end 4 — the far side of that link.', c: ['interface g0/1', 'switchport mode trunk', 'switchport nonegotiate', 'switchport trunk native vlan 1001', 'exit', 'do show interfaces trunk'], note: 'Four trunk ends configured identically. Repetition is the point.' },

    /* ---- PHASE 6: every allowed-list form ---- */
    { d: 'SW1', t: 'Form 1 — set an explicit list.', c: ['interface g0/1', 'switchport trunk allowed vlan 10,20,30', 'do show interfaces trunk'], note: 'This REPLACES whatever was there. On a live trunk carrying other VLANs, they are severed the instant you press Enter.' },
    { d: 'SW1', t: 'Form 2 — add to the list without disturbing it.', c: ['switchport trunk allowed vlan add 40', 'do show interfaces trunk'], note: 'The safe editing form. VLAN 40 joins 10, 20 and 30.' },
    { d: 'SW1', t: 'Form 3 — remove a single VLAN.', c: ['switchport trunk allowed vlan remove 40', 'do show interfaces trunk'], note: 'Also safe. Only the named VLAN goes.' },
    { d: 'SW1', t: 'Form 4 — allow nothing at all, and see what that does.', c: ['switchport trunk allowed vlan none', 'do show interfaces trunk'], note: 'The trunk is up but carries nothing. A very effective way to take a link out of service without unplugging it.' },
    { d: 'SW1', t: 'Form 5 — allow everything again.', c: ['switchport trunk allowed vlan all', 'do show interfaces trunk'], note: 'Back to 1-4094. Note how "all" wipes out careful pruning in one keystroke.' },
    { d: 'SW1', t: 'Form 6 — the "no" form, which also means all.', c: ['no switchport trunk allowed vlan', 'do show interfaces trunk'], note: 'Removing the command returns the default, which is every VLAN. Same result as "all", different route.' },
    { d: 'SW1', t: 'Settle on the pruned list you actually want.', c: ['switchport trunk allowed vlan 10,20,30', 'exit'], note: 'Six forms drilled on one interface. Now apply the knowledge to the rest.' },
    { d: 'SW2', t: 'Match the SW1 side, then prune the SW3 link to Guest only.', c: ['interface g0/1', 'switchport trunk allowed vlan 10,20,30', 'exit', 'interface g0/2', 'switchport trunk allowed vlan 30', 'exit', 'do show interfaces trunk'], note: 'Only Guest users live beyond SW3, so there is no reason for Engineering or Sales frames to cross that link.' },
    { d: 'SW3', t: 'Match the pruning on the far end.', c: ['interface g0/1', 'switchport trunk allowed vlan 30', 'exit', 'do show interfaces trunk'], note: 'Allowed lists should match on both ends. A VLAN allowed on one side and not the other is a silent one-way black hole.' },

    /* ---- PHASE 7: VTP on all three ---- */
    { d: 'SW1', t: 'Opt SW1 out of VTP.', c: ['vtp mode transparent', 'vtp domain NETDRILL', 'do show vtp status'] },
    { d: 'SW2', t: 'Same on SW2.', c: ['vtp mode transparent', 'vtp domain NETDRILL', 'do show vtp status'] },
    { d: 'SW3', t: 'And SW3.', c: ['vtp mode transparent', 'vtp domain NETDRILL', 'do show vtp status'], note: 'Three switches, all transparent, all in the same named domain. Now no switch can overwrite another\'s VLAN database.' },

    /* ---- PHASE 8: router on a stick with three subinterfaces ---- */
    { d: 'SW1', t: 'Trunk the uplink toward the router.', c: ['interface g0/2', 'description TRUNK-TO-R1', 'switchport mode trunk', 'switchport nonegotiate', 'switchport trunk allowed vlan 10,20,30', 'end', 'show interfaces trunk'], note: 'A fifth trunk end. The router needs all three VLANs, so all three are allowed.' },
    { d: 'R1', t: 'Bring up the physical router port — deliberately with no address.', c: ['enable', 'configure terminal', 'hostname R1', 'interface g0/0', 'description ROAS-TRUNK-TO-SW1', 'no shutdown', 'exit'], note: 'The physical port carries only tagged frames. Every address lives on a subinterface.' },
    { d: 'R1', t: 'Subinterface 1 — Engineering.', c: ['interface g0/0.10', 'encapsulation dot1q 10', 'ip address 10.0.10.1 255.255.255.0', 'exit'], note: 'Encapsulation first, then the address. The tag is what defines which VLAN this subinterface belongs to.' },
    { d: 'R1', t: 'Subinterface 2 — Sales.', c: ['interface g0/0.20', 'encapsulation dot1q 20', 'ip address 10.0.20.1 255.255.255.0', 'exit'] },
    { d: 'R1', t: 'Subinterface 3 — Guest.', c: ['interface g0/0.30', 'encapsulation dot1q 30', 'ip address 10.0.30.1 255.255.255.0', 'end', 'show ip interface brief'], note: 'Three subinterfaces on one physical port, each the default gateway for its own VLAN. Matching the number to the VLAN ID is convention, not a rule — but keep to it.' },

    /* ---- PHASE 9: verification sweep ---- */
    { d: 'SW1', t: 'All three verification views on SW1.', c: ['show vlan brief', 'show interfaces trunk', 'show interfaces switchport'], note: 'Which ports are in which VLAN; what each trunk carries; the full detail of every port. Learn to read the trunk output fluently.' },
    { d: 'SW2', t: 'The same sweep on SW2 — note it has two trunks with different allowed lists.', c: ['end', 'show vlan brief', 'show interfaces trunk'], note: 'G0/1 allows 10,20,30 while G0/2 allows only 30. One switch, two different policies.' },
    { d: 'SW3', t: 'And on SW3.', c: ['end', 'show vlan brief', 'show interfaces trunk'] },

    /* ---- PHASE 10: connectivity matrix ---- */
    { d: 'PC1', t: 'Same VLAN across one trunk: Engineering to Engineering.', c: ['ping 10.0.10.12'], note: 'PC1 on SW1 reaching PC4 on SW2. The frame is tagged 10 across the trunk and untagged again at the far access port.' },
    { d: 'PC2', t: 'Same VLAN across one trunk: Sales to Sales.', c: ['ping 10.0.20.12'] },
    { d: 'PC3', t: 'Same VLAN across TWO trunks: Guest to Guest.', c: ['ping 10.0.30.12'], note: 'PC3 on SW1 to PC6 on SW3, crossing both trunks. VLAN 30 is allowed on every hop, so distance is irrelevant.' },
    { d: 'PC1', t: 'Now cross VLANs through the router.', c: ['ping 10.0.10.1', 'ping 10.0.20.11', 'ping 10.0.30.11'], note: 'Gateway first, then Sales, then Guest. Each cross-VLAN packet goes up to R1 tagged for one VLAN and comes back tagged for another.' },
    { d: 'PC5', t: 'Cross VLANs from the other switch too.', c: ['ping 10.0.20.1', 'ping 10.0.10.11', 'ping 10.0.30.12'], note: 'PC5 on SW2 reaching an Engineering host on SW1 and a Guest host on SW3 — two trunks and a router hop.' },
    { d: 'SW1', t: 'Break it on purpose: drop Guest from the router trunk.', c: ['configure terminal', 'interface g0/2', 'switchport trunk allowed vlan remove 30', 'end', 'show interfaces trunk'], note: 'VLAN 30 can no longer reach the router. Guest hosts keep talking to each other but lose their gateway entirely.' },
    { d: 'PC3', t: 'Confirm the break: Guest can still reach Guest, but not its gateway.', c: ['ping 10.0.30.12', 'ping 10.0.30.1'], note: 'Exactly the fault an allowed-list mistake produces in the real world — local traffic fine, everything else dead.' },
    { d: 'SW1', t: 'Put it back and confirm the repair.', c: ['configure terminal', 'interface g0/2', 'switchport trunk allowed vlan add 30', 'end', 'show interfaces trunk', 'write memory'] },
    { d: 'PC3', t: 'Guest has its gateway again.', c: ['ping 10.0.30.1', 'ping 10.0.10.11'] },
  ],
  verify: ['show vlan brief', 'show interfaces trunk', 'show interfaces switchport', 'show vtp status', 'show ip interface brief'],
  explain: `<h3>Access, trunk, and the dynamic middle ground</h3>
<p>An <b>access port</b> carries one VLAN untagged — for hosts. A <b>trunk</b> carries many VLANs, each frame labelled with a 4-byte 802.1Q tag — for switch-to-switch and switch-to-router links. Left alone a port sits in a <b>dynamic</b> mode and negotiates with DTP: <code>desirable</code> actively asks, <code>auto</code> only answers. desirable+desirable and desirable+auto both trunk; auto+auto does not, because neither side initiates. Production practice is to hard-code the role and add <code>switchport nonegotiate</code> — but note that a nonegotiate trunk facing a dynamic port will never come up, because the dynamic side is waiting to be asked.</p>
<h3>The native VLAN</h3>
<p>One VLAN on every trunk travels untagged — the native VLAN, VLAN 1 by default. If the two ends disagree about which VLAN that is, traffic silently crosses between VLANs, which is a genuine security hole. Set it identically on both ends and move it to an unused VLAN so nothing real rides untagged.</p>
<h3>The allowed list — six forms, one danger</h3>
<p><code>allowed vlan 10,20,30</code> <b>replaces</b> the entire list. <code>add</code> and <code>remove</code> edit it safely. <code>all</code> restores every VLAN, <code>none</code> allows nothing, and <code>no switchport trunk allowed vlan</code> returns to the default of all. The replace form has taken down more networks than almost any other switch command: run it on a live trunk carrying VLANs you forgot to list and they are severed instantly.</p>
<p>Lists should match on both ends. A VLAN allowed on one side and not the other produces a one-way black hole that is miserable to diagnose.</p>
<h3>Router on a stick</h3>
<p>VLANs are separate broadcast domains, so crossing between them needs a layer-3 hop. With one router arm the link is trunked and the router grows a <b>subinterface</b> per VLAN. <code>encapsulation dot1q 10</code> binds the subinterface to tag 10, and its address becomes that VLAN's gateway. A packet from Engineering to Sales enters and leaves on the same physical wire, tagged differently each way.</p>
<h3>VTP</h3>
<p>VTP syncs the VLAN database between switches sharing a domain. A switch inserted with a higher configuration revision number can overwrite everyone else's VLANs — the infamous "VTP bomb", which has wiped production networks. Most sites run transparent mode (forward the advertisements, never act on them) and manage VLANs by hand.</p>`,
  checks: [
    { desc: 'VLANs 10, 20 and 30 exist with names on all three switches', fn: H => ['SW1', 'SW2', 'SW3'].every(s => H.vlanExists(s, 10, 'ENGINEERING') && H.vlanExists(s, 20, 'SALES') && H.vlanExists(s, 30, 'GUEST')) },
    { desc: 'The temporary VLAN 99 was deleted from SW1', fn: H => !H.d('SW1').vlans[99] },
    { desc: 'SW1 F0/1 is access VLAN 10 with voice VLAN 150', fn: H => H.access('SW1', 'f0/1', 10) && H.i('SW1', 'f0/1').voiceVlan === 150 },
    { desc: 'All six access ports are in the right VLANs', fn: H => H.access('SW1', 'f0/2', 20) && H.access('SW1', 'f0/3', 30) && H.access('SW2', 'f0/1', 10) && H.access('SW2', 'f0/2', 20) && H.access('SW3', 'f0/1', 30) },
    { desc: 'SW1 F0/4 is parked in the Guest VLAN and shut down', fn: H => H.i('SW1', 'f0/4').accessVlan === 30 && H.i('SW1', 'f0/4').shutdown },
    { desc: 'All five trunk ends are fixed trunks with nonegotiate', fn: H => [['SW1', 'g0/1'], ['SW2', 'g0/1'], ['SW2', 'g0/2'], ['SW3', 'g0/1'], ['SW1', 'g0/2']].every(([s, p]) => H.trunkStatic(s, p) && H.i(s, p).nonegotiate) },
    { desc: 'Native VLAN 1001 on the four switch-to-switch trunk ends', fn: H => [['SW1', 'g0/1'], ['SW2', 'g0/1'], ['SW2', 'g0/2'], ['SW3', 'g0/1']].every(([s, p]) => H.i(s, p).nativeVlan === 1001) },
    { desc: 'SW1–SW2 trunk ended up allowing exactly 10, 20 and 30', fn: H => [['SW1', 'g0/1'], ['SW2', 'g0/1']].every(([s, p]) => { const a = H.i(s, p).allowed; return a && a.length === 3 && [10, 20, 30].every(v => a.includes(v)); }) },
    { desc: 'SW2–SW3 trunk is pruned to Guest only on both ends', fn: H => [['SW2', 'g0/2'], ['SW3', 'g0/1']].every(([s, p]) => { const a = H.i(s, p).allowed; return a && a.length === 1 && a[0] === 30; }) },
    { desc: 'Router trunk allows all three VLANs after the break/repair', fn: H => { const a = H.i('SW1', 'g0/2').allowed; return a && [10, 20, 30].every(v => a.includes(v)); } },
    { desc: 'All three switches are VTP transparent in domain NETDRILL', fn: H => ['SW1', 'SW2', 'SW3'].every(s => H.d(s).vtp.mode === 'transparent' && H.d(s).vtp.domain === 'NETDRILL') },
    { desc: 'R1 has three tagged subinterfaces acting as the three gateways', fn: H => [[10, '10.0.10.1'], [20, '10.0.20.1'], [30, '10.0.30.1']].every(([v, ip]) => { const s = H.i('R1', 'g0/0.' + v); return !!(s && s.encapDot1q && s.encapDot1q.vlan === v && s.ip && s.ip.addr === ip); }) },
    { desc: 'Same-VLAN across one trunk works (Engineering and Sales)', fn: H => H.ping('PC1', '10.0.10.12') && H.ping('PC2', '10.0.20.12') },
    { desc: 'Same-VLAN across two trunks works (Guest to Guest)', fn: H => H.ping('PC3', '10.0.30.12') },
    { desc: 'Cross-VLAN routing works in several directions', fn: H => H.ping('PC1', '10.0.20.11') && H.ping('PC1', '10.0.30.11') && H.ping('PC5', '10.0.10.11') },
    { desc: 'Guest reaches its gateway again after the deliberate break was repaired', fn: H => H.ping('PC3', '10.0.30.1') && H.ping('PC3', '10.0.10.11') },
  ],
});

/* ============================================================= */
L({
  id: 'x4-stp-etherchannel', vol: 1, tier: 'deep', day: 'Days 20-22', title: 'STP & EtherChannel — Full Drill',
  topics: '4 switches · pvst vs rapid-pvst · explicit priority & both macros · per-VLAN roots · portfast/bpduguard per-port and global · 3 bundles using LACP, PAgP and ON',
  devices: [
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1', 'g0/2'] },
    { id: 'SW2', type: 'switch', ifaces: ['g0/1', 'g0/2', 'g0/3', 'g0/4'] },
    { id: 'SW3', type: 'switch', ifaces: ['g0/1', 'g0/2', 'g0/3', 'g0/4'] },
    { id: 'SW4', type: 'switch', ifaces: ['f0/1', 'f0/2', 'g0/1', 'g0/2'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.11', mask: '255.255.255.0', gw: null } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.10.12', mask: '255.255.255.0', gw: null } },
  ],
  links: [
    ['SW1', 'g0/1', 'SW2', 'g0/1'], ['SW1', 'g0/2', 'SW2', 'g0/2'],
    ['SW2', 'g0/3', 'SW3', 'g0/1'], ['SW2', 'g0/4', 'SW3', 'g0/2'],
    ['SW3', 'g0/3', 'SW4', 'g0/1'], ['SW3', 'g0/4', 'SW4', 'g0/2'],
    ['SW1', 'f0/1', 'PC1', 'e0'], ['SW4', 'f0/1', 'PC2', 'e0'],
  ],
  layout: { SW1: [65, 55], SW2: [160, 55], SW3: [255, 55], SW4: [350, 55], PC1: [65, 115], PC2: [350, 115] },
  intro: `<b>The situation:</b> four switches in a chain, each pair joined by <em>two</em> cables. Six cables of deliberate redundancy — and Spanning Tree would block half of them, wasting the money somebody spent on the second run.<br><b>Your goal:</b> take complete control of layer 2. Choose the root bridge deliberately for each VLAN instead of letting MAC addresses decide, protect every edge port, then bundle all three cable pairs so both links in each pair carry traffic — using <b>LACP on one pair, PAgP on the next and static ON mode on the third</b>, so you drill every protocol and every mode keyword in a single lab.`,
  tasks: [
    { t: 'PHASE 1 — Read spanning tree on all four switches before touching anything, and work out which one won the root election', why: 'With every switch at the default priority of 32768, the lowest MAC address wins — effectively at random. Seeing that is what motivates everything else in this lab.' },
    { t: 'PHASE 2 — Create VLANs 10 and 20 on all four switches', why: 'Spanning tree runs a separate instance per VLAN, so you need more than one VLAN to see per-VLAN root placement working.' },
    { t: 'PHASE 3 — Put all four switches into rapid-pvst mode', why: 'Four repetitions of the same command. Rapid PVST+ converges in 1-2 seconds versus 30-50; mixed modes fall back to the slow behaviour, so every switch must match.' },
    { t: 'PHASE 4 — Try an illegal bridge priority and read the error, then set a legal one', why: 'Priorities must be multiples of 4096 because the low 12 bits of the bridge ID hold the VLAN number. IOS prints every legal value when you get it wrong.' },
    { t: 'Make SW1 the root for VLAN 10 with an explicit priority, and SW2 the root for VLAN 20 with the root primary macro', why: 'Two ways to the same result, and per-VLAN roots let you split traffic across different paths rather than funnelling everything through one switch.' },
    { t: 'Set secondary roots for both VLANs on the other switches', why: 'A deterministic plan B. Knowing both the macros and the numbers they produce (24576 and 28672) is worth marks.' },
    { t: 'PHASE 5 — Protect SW1\'s host port with portfast and BPDU guard individually, then disable each and re-enable', why: 'The per-interface form, plus both "no" forms. PortFast skips the 30-second wait; BPDU guard shuts the port if a switch ever appears there.' },
    { t: 'On SW4, enable portfast and BPDU guard globally by default instead of per port', why: 'How you would actually deploy this across a 48-port switch — one command instead of forty-eight.' },
    { t: 'PHASE 6 — Prepare SW1 and SW2\'s link pair as trunks BEFORE bundling them', why: 'EtherChannel requires every member to have identical settings. Configure them first, then bundle, and IOS has nothing to object to.' },
    { t: 'Bundle that pair with LACP — active on one side, passive on the other', why: 'LACP is the open standard. At least one side must be active; passive facing passive never forms because neither initiates.' },
    { t: 'PHASE 7 — Bundle SW2 to SW3 with PAgP — desirable and auto', why: 'Cisco\'s own protocol, with desirable/auto mirroring active/passive. Knowing which keyword belongs to which protocol is a guaranteed exam question.' },
    { t: 'PHASE 8 — Bundle SW3 to SW4 with static ON mode on both sides', why: 'No negotiation protocol at all. Both sides must say ON — an ON port facing an LACP or PAgP port is a loop waiting to happen.' },
    { t: 'PHASE 9 — Configure all three Port-channel interfaces as trunks', why: 'Six trunk ends in total. Settings applied to the logical interface propagate down to its members, which is what keeps them identical.' },
    { t: 'PHASE 10 — Read show etherchannel summary on every switch and decode the flags', why: 'S = layer 2, U = in use, P = bundled. An (I) means stand-alone — the modes did not match and the bundle never formed.' },
    { t: 'Remove one bundle with the no form, confirm it breaks, then rebuild it', why: 'Removing an EtherChannel on a live network drops the link. Doing it deliberately once teaches you the shape of the failure.' },
    { t: 'PHASE 11 — Check spanning tree again and confirm PC1 reaches PC2 across all three bundles', why: 'STP now sees three logical links instead of six physical ones, blocks nothing, and every cable carries traffic.' },
  ],
  steps: [
    /* ---- PHASE 1: observe the default ---- */
    { d: 'SW1', t: 'Look at spanning tree before changing anything.', c: ['enable', 'show spanning-tree'], note: 'Compare the Root ID block with the Bridge ID block. If the priority and address match, this switch is currently root — by accident of its MAC address.' },
    { d: 'SW2', t: 'And from the second switch.', c: ['enable', 'show spanning-tree'], note: 'Whichever switch has the lowest MAC address is root. That is almost never the switch you would have chosen.' },
    { d: 'SW3', t: 'Third viewpoint.', c: ['enable', 'show spanning-tree'] },
    { d: 'SW4', t: 'Fourth.', c: ['enable', 'show spanning-tree'], note: 'Four switches all at priority 32768 — a completely arbitrary topology. Time to take charge.' },

    /* ---- PHASE 2: VLANs on all four ---- */
    { d: 'SW1', t: 'Name it and create both VLANs.', c: ['configure terminal', 'hostname SW1', 'vlan 10', 'name USERS', 'vlan 20', 'name SERVERS', 'exit'] },
    { d: 'SW2', t: 'Same on SW2.', c: ['configure terminal', 'hostname SW2', 'vlan 10', 'name USERS', 'vlan 20', 'name SERVERS', 'exit'] },
    { d: 'SW3', t: 'Same on SW3.', c: ['configure terminal', 'hostname SW3', 'vlan 10', 'name USERS', 'vlan 20', 'name SERVERS', 'exit'] },
    { d: 'SW4', t: 'Same on SW4.', c: ['configure terminal', 'hostname SW4', 'vlan 10', 'name USERS', 'vlan 20', 'name SERVERS', 'exit'] },

    /* ---- PHASE 3: rapid-pvst everywhere ---- */
    { d: 'SW1', t: 'Rapid PVST+ on SW1.', c: ['spanning-tree mode rapid-pvst'], note: 'One command, four switches. Repetition is the point.' },
    { d: 'SW2', t: 'Rapid PVST+ on SW2.', c: ['spanning-tree mode rapid-pvst'] },
    { d: 'SW3', t: 'Rapid PVST+ on SW3.', c: ['spanning-tree mode rapid-pvst'] },
    { d: 'SW4', t: 'Rapid PVST+ on SW4.', c: ['spanning-tree mode rapid-pvst'], note: 'All four now agree. A switch left on classic PVST+ would drag its links back to 30-second convergence.' },

    /* ---- PHASE 4: root election ---- */
    { d: 'SW1', t: 'Try an illegal priority first and read what IOS tells you.', c: ['spanning-tree vlan 10 priority 5000'], note: 'Rejected, with every legal value printed. Priorities move in steps of 4096 because the VLAN ID occupies the low 12 bits of the bridge ID.' },
    { d: 'SW1', t: 'Now a legal one — SW1 becomes root for VLAN 10.', c: ['spanning-tree vlan 10 priority 4096', 'do show spanning-tree'], note: 'The lowest priority on the network wins outright, regardless of MAC address.' },
    { d: 'SW1', t: 'And make SW1 the backup root for VLAN 20 using the macro.', c: ['spanning-tree vlan 20 root secondary'], note: 'The macro sets 28672 without arithmetic. Know both the macro and the number.' },
    { d: 'SW2', t: 'SW2 takes VLAN 20 as primary, using the other macro.', c: ['spanning-tree vlan 20 root primary'], note: '<code>root primary</code> picks 24576 (or lower if someone already holds it). Per-VLAN roots split traffic across different paths.' },
    { d: 'SW2', t: 'And SW2 backs up VLAN 10.', c: ['spanning-tree vlan 10 root secondary', 'do show spanning-tree'], note: 'Two VLANs, two different roots, each with its own backup. This is what per-VLAN spanning tree buys you.' },
    { d: 'SW3', t: 'Leave SW3 and SW4 at default priority so the hierarchy is clear.', c: ['do show spanning-tree'], note: 'Default 32768 on both — they will never be root while SW1 and SW2 are alive, which is exactly the design.' },

    /* ---- PHASE 5: portfast and bpduguard ---- */
    { d: 'SW1', t: 'Put the host port in VLAN 10 and protect it.', c: ['interface f0/1', 'description PC1', 'switchport mode access', 'switchport access vlan 10', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit'], note: 'Read the warning IOS prints. PortFast on a switch-facing port can create a temporary loop.' },
    { d: 'SW1', t: 'Now practise the "no" forms, then put both back.', c: ['interface f0/1', 'no spanning-tree portfast', 'spanning-tree bpduguard disable', 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'exit'], note: 'Note the asymmetry: portfast uses <code>no spanning-tree portfast</code> while bpduguard uses <code>spanning-tree bpduguard disable</code>. IOS is not always consistent.' },
    { d: 'SW1', t: 'Park the spare port safely too.', c: ['interface f0/2', 'description UNUSED', 'switchport mode access', 'switchport access vlan 20', 'shutdown', 'exit'] },
    { d: 'SW4', t: 'On SW4, do it globally instead of per port.', c: ['spanning-tree portfast default', 'spanning-tree portfast bpduguard default'], note: 'Every access port gets both features automatically. One command instead of forty-eight.' },
    { d: 'SW4', t: 'Configure SW4\'s host port — no per-port STP commands needed now.', c: ['interface f0/1', 'description PC2', 'switchport mode access', 'switchport access vlan 10', 'exit', 'interface f0/2', 'description UNUSED', 'shutdown', 'exit'], note: 'The global defaults already cover F0/1. Less typing, less to forget.' },

    /* ---- PHASE 6: bundle 1 with LACP ---- */
    { d: 'SW1', t: 'Prepare both member ports as trunks BEFORE bundling them.', c: ['interface range g0/1 - 2', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20'], note: 'EtherChannel requires identical settings on every member. Configure them first and IOS has nothing to object to.' },
    { d: 'SW1', t: 'Now bundle them with LACP, initiating.', c: ['channel-group 1 mode active', 'exit'], note: 'Watch the log: IOS auto-creates interface Port-channel1. <code>active</code> means this side actively asks to form the bundle.' },
    { d: 'SW2', t: 'Prepare and bundle the matching side, responding rather than initiating.', c: ['interface range g0/1 - 2', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'channel-group 1 mode passive', 'exit'], note: 'active+passive forms an LACP bundle. passive+passive never does — the same trap as DTP auto+auto.' },

    /* ---- PHASE 7: bundle 2 with PAgP ---- */
    { d: 'SW2', t: 'Prepare the pair facing SW3 and bundle with PAgP, initiating.', c: ['interface range g0/3 - 4', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'channel-group 2 mode desirable', 'exit'], note: 'PAgP is Cisco\'s own. <code>desirable</code> is its equivalent of LACP\'s <code>active</code>.' },
    { d: 'SW3', t: 'Respond with PAgP auto on the far side.', c: ['interface range g0/1 - 2', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'channel-group 2 mode auto', 'exit'], note: 'desirable+auto forms the bundle. auto+auto does not. And mixing PAgP with LACP never works at all.' },

    /* ---- PHASE 8: bundle 3 with static ON ---- */
    { d: 'SW3', t: 'Third pair — no negotiation protocol at all.', c: ['interface range g0/3 - 4', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'channel-group 3 mode on', 'exit'], note: '<code>on</code> forces the bundle with no protocol. Fast, and dangerous if the far side disagrees.' },
    { d: 'SW4', t: 'The far side must also be ON — nothing else will do.', c: ['interface range g0/1 - 2', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'channel-group 3 mode on', 'exit'], note: 'An ON port facing an LACP or PAgP port does not bundle and can create a loop, because ON never checks whether the far end agrees.' },

    /* ---- PHASE 9: trunk the logical interfaces ---- */
    { d: 'SW1', t: 'Trunk the logical bundle on SW1.', c: ['interface port-channel 1', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'exit'], note: 'From now on you configure Po1 and the settings propagate down to its members.' },
    { d: 'SW2', t: 'SW2 has two bundles — trunk both.', c: ['interface port-channel 1', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'interface port-channel 2', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'exit'], note: 'One switch, two bundles, two different protocols beneath them.' },
    { d: 'SW3', t: 'SW3 also has two.', c: ['interface port-channel 2', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'interface port-channel 3', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'exit'] },
    { d: 'SW4', t: 'And SW4 has one.', c: ['interface port-channel 3', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'end'], note: 'Six trunk ends across three bundles. That is the repetition this lab is built around.' },

    /* ---- PHASE 10: verify and break/rebuild ---- */
    { d: 'SW1', t: 'Read the bundle summary and decode the flags.', c: ['end', 'show etherchannel summary', 'show interfaces trunk'], note: 'Po1(SU) means layer 2 and in use; each member marked (P) is bundled. An (I) would mean stand-alone.' },
    { d: 'SW2', t: 'SW2 shows both protocols side by side.', c: ['end', 'show etherchannel summary'], note: 'The Protocol column reads LACP for group 1 and PAgP for group 2. One switch, both worlds.' },
    { d: 'SW3', t: 'SW3 shows PAgP and a protocol-less bundle.', c: ['end', 'show etherchannel summary'], note: 'Group 3 shows "-" for protocol, because ON mode does not run one.' },
    { d: 'SW4', t: 'And the far end of the ON bundle.', c: ['show etherchannel summary'] },
    { d: 'SW4', t: 'Remove the bundle deliberately and watch it fall apart.', c: ['configure terminal', 'interface range g0/1 - 2', 'no channel-group', 'end', 'show etherchannel summary'], note: 'Group 3 has gone from SW4\'s view. On a live network the link would now be partly down — half a bundle is worse than none.' },
    { d: 'SW4', t: 'Rebuild it and confirm it returns.', c: ['configure terminal', 'interface range g0/1 - 2', 'channel-group 3 mode on', 'end', 'show etherchannel summary'], note: 'Back in place. Removing and rebuilding once removes the fear of the command.' },

    /* ---- PHASE 11: final STP and connectivity ---- */
    { d: 'SW1', t: 'Read spanning tree now that the bundles exist.', c: ['show spanning-tree'], note: 'For VLAN 10 you should see "This bridge is the root". Each pair of cables now appears as one logical Port-channel.' },
    { d: 'SW2', t: 'Confirm SW2 is root for VLAN 20 but not VLAN 10.', c: ['show spanning-tree'], note: 'Two VLANs, two different roots — exactly the design you configured.' },
    { d: 'PC1', t: 'Prove traffic crosses all three bundles end to end.', c: ['ping 10.0.10.12'], note: 'PC1 → SW1 → (LACP) → SW2 → (PAgP) → SW3 → (ON) → SW4 → PC2. Three bundles, three protocols, one ping.' },
    { d: 'SW1', t: 'Save every switch.', c: ['write memory'] },
    { d: 'SW2', t: 'Save.', c: ['write memory'] },
    { d: 'SW3', t: 'Save.', c: ['write memory'] },
    { d: 'SW4', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show spanning-tree', 'show etherchannel summary', 'show interfaces trunk', 'show interfaces status', 'show vlan brief'],
  explain: `<h3>The bridge ID, and why priorities jump in 4096s</h3>
<p>A bridge ID is priority + VLAN ID + MAC address. The priority field is 16 bits, but the lower 12 hold the VLAN number (the "extended system ID"), leaving only the top 4 bits configurable — which is why legal values are multiples of 4096: 0, 4096, 8192, and so on up to 61440. Type anything else and IOS lists the legal set for you.</p>
<p>With everyone at the default 32768, the <b>lowest MAC address wins</b> — usually the oldest switch in the building. Setting your core to 4096 (or using <code>root primary</code>, which picks 24576) and a second switch to 28672 makes the topology match your design rather than your purchase history.</p>
<h3>Per-VLAN roots</h3>
<p>PVST+ runs a separate spanning tree per VLAN, so different VLANs can have different roots and therefore take different paths. Making SW1 root for VLAN 10 and SW2 root for VLAN 20 spreads the load across both instead of funnelling everything through one switch.</p>
<h3>PortFast and BPDU Guard</h3>
<p><b>PortFast</b> moves an access port straight to forwarding, skipping listening and learning. Without it a PC waits roughly 30 seconds for link — long enough for DHCP to give up. <b>BPDU Guard</b> err-disables the port the instant a BPDU arrives, because a BPDU means somebody plugged a switch into a port you declared to be an edge. Deploy them together, either per port or with the two global <code>default</code> commands.</p>
<p>Note the inconsistent negation: <code>no spanning-tree portfast</code> but <code>spanning-tree bpduguard disable</code>.</p>
<h3>EtherChannel: three protocols, five keywords</h3>
<table><tr><th>Protocol</th><th>Initiates</th><th>Responds</th></tr>
<tr><td>LACP (IEEE 802.3ad)</td><td><code>active</code></td><td><code>passive</code></td></tr>
<tr><td>PAgP (Cisco)</td><td><code>desirable</code></td><td><code>auto</code></td></tr>
<tr><td>None</td><td colspan="2"><code>on</code> — both sides must be ON</td></tr></table>
<p>Combinations that fail: passive+passive, auto+auto, ON facing anything but ON, and any attempt to mix LACP with PAgP. Every member port must match in speed, duplex and VLAN configuration — which is why you configure them before bundling, and configure the Port-channel interface afterwards so settings propagate down.</p>
<p>Once bundled, STP sees a single logical link. Nothing gets blocked, and you finally use the bandwidth you paid for.</p>`,
  checks: [
    { desc: 'All four switches are named and run rapid-pvst', fn: H => ['SW1', 'SW2', 'SW3', 'SW4'].every(s => H.hostname(s, s) && H.d(s).stp.mode === 'rapid') },
    { desc: 'VLANs 10 and 20 exist on all four switches', fn: H => ['SW1', 'SW2', 'SW3', 'SW4'].every(s => H.vlanExists(s, 10) && H.vlanExists(s, 20)) },
    { desc: 'SW1 is root for VLAN 10 (explicit priority 4096)', fn: H => H.d('SW1').stp.prio[10] === 4096 },
    { desc: 'SW1 is secondary root for VLAN 20 (28672)', fn: H => H.d('SW1').stp.prio[20] === 28672 },
    { desc: 'SW2 is root for VLAN 20 (24576) and secondary for VLAN 10 (28672)', fn: H => H.d('SW2').stp.prio[20] === 24576 && H.d('SW2').stp.prio[10] === 28672 },
    { desc: 'SW1 F0/1 has portfast and bpduguard after the disable/enable round trip', fn: H => H.i('SW1', 'f0/1').stpPortfast && H.i('SW1', 'f0/1').bpduguard },
    { desc: 'SW4 has portfast and bpduguard enabled globally', fn: H => H.d('SW4').stp.portfastDefault && H.d('SW4').stp.bpduguardDefault },
    { desc: 'Bundle 1 (SW1↔SW2) uses LACP active/passive', fn: H => ['g0/1', 'g0/2'].every(p => H.i('SW1', p).channelGroup?.mode === 'active' && H.i('SW2', p).channelGroup?.mode === 'passive') },
    { desc: 'Bundle 2 (SW2↔SW3) uses PAgP desirable/auto', fn: H => ['g0/3', 'g0/4'].every(p => H.i('SW2', p).channelGroup?.mode === 'desirable') && ['g0/1', 'g0/2'].every(p => H.i('SW3', p).channelGroup?.mode === 'auto') },
    { desc: 'Bundle 3 (SW3↔SW4) uses static ON on both sides, rebuilt after removal', fn: H => ['g0/3', 'g0/4'].every(p => H.i('SW3', p).channelGroup?.mode === 'on') && ['g0/1', 'g0/2'].every(p => H.i('SW4', p).channelGroup?.mode === 'on') },
    { desc: 'All three bundles would actually form', fn: H => ND.channelForms('active', 'passive') && ND.channelForms('desirable', 'auto') && ND.channelForms('on', 'on') },
    { desc: 'All six Port-channel ends are trunks allowing VLANs 10 and 20', fn: H => [['SW1', 'po1'], ['SW2', 'po1'], ['SW2', 'po2'], ['SW3', 'po2'], ['SW3', 'po3'], ['SW4', 'po3']].every(([s, p]) => { const i = H.i(s, p); return i && i.swMode === 'trunk' && i.allowed && i.allowed.includes(10) && i.allowed.includes(20); }) },
    { desc: 'Host ports are access VLAN 10 on SW1 and SW4', fn: H => H.access('SW1', 'f0/1', 10) && H.access('SW4', 'f0/1', 10) },
    { desc: 'Spare ports on both edge switches are shut down', fn: H => H.i('SW1', 'f0/2').shutdown && H.i('SW4', 'f0/2').shutdown },
    { desc: 'PC1 reaches PC2 across all three bundles', fn: H => H.ping('PC1', '10.0.10.12') },
    { desc: 'All four switches saved', fn: H => ['SW1', 'SW2', 'SW3', 'SW4'].every(s => H.saved(s)) },
  ],
});

/* ============================================================= */
L({
  id: 'x5-static-ipv6', vol: 1, tier: 'deep', day: 'Days 11, 30-32', title: 'Static Routing & IPv6 — Full Drill',
  topics: '4 routers · next-hop vs exit-interface · floating statics · host routes · summary routes · longest prefix match · IPv6 manual/EUI-64/link-local/enable · IPv6 statics & default',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2', 'lo0'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2', 'lo0'] },
    { id: 'R3', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2', 'lo0'] },
    { id: 'R4', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.1.10', mask: '255.255.255.0', gw: '10.0.1.1' } },
    { id: 'PC3', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.3.10', mask: '255.255.255.0', gw: '10.0.3.1' } },
    { id: 'PC4', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.4.10', mask: '255.255.255.0', gw: '10.0.4.1' } },
  ],
  links: [
    ['PC1', 'e0', 'R1', 'g0/0'], ['R1', 'g0/1', 'R2', 'g0/0'], ['R2', 'g0/1', 'R3', 'g0/0'],
    ['R1', 'g0/2', 'R3', 'g0/2'], ['R2', 'g0/2', 'R4', 'g0/0'],
    ['R3', 'g0/1', 'PC3', 'e0'], ['R4', 'g0/1', 'PC4', 'e0'],
  ],
  layout: { PC1: [30, 32], R1: [105, 32], R2: [205, 32], R4: [300, 32], PC4: [370, 32], R3: [155, 105], PC3: [50, 105] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    const M24 = '255.255.255.0', M30 = '255.255.255.252';
    set('R1', 'g0/0', '10.0.1.1', M24); set('R1', 'g0/1', '10.0.12.1', M30); set('R1', 'g0/2', '10.0.13.1', M30);
    set('R2', 'g0/0', '10.0.12.2', M30); set('R2', 'g0/1', '10.0.23.1', M30); set('R2', 'g0/2', '10.0.24.1', M30);
    set('R3', 'g0/0', '10.0.23.2', M30); set('R3', 'g0/1', '10.0.3.1', M24); set('R3', 'g0/2', '10.0.13.2', M30);
    set('R4', 'g0/0', '10.0.24.2', M30); set('R4', 'g0/1', '10.0.4.1', M24);
    for (const r of ['R1', 'R2', 'R3', 'R4']) topo.devs[r].hostname = r;
  },
  intro: `<b>The situation:</b> four routers with three PC networks between them, every interface already addressed. Each router can reach its direct neighbours and nothing else — the classic starting point.<br><b>Your goal:</b> every flavour of static route there is, typed enough times to become reflex. Next-hop and exit-interface forms, more than a dozen individual routes, a backup route that only activates on failure, host routes, a summary route replacing several specifics, a default route, and a demonstration of longest prefix match you can watch in a traceroute. Then the whole exercise again in IPv6.`,
  tasks: [
    { t: 'PHASE 1 — Give all four routers a loopback identity (1.1.1.1 through 4.4.4.4, all /32)', why: 'Four repetitions of the same two commands, and every router gains a stable address that no single interface failure can take away.' },
    { t: 'PHASE 2 — Read R1\'s routing table before adding anything and identify the C and L entries', why: 'C is a network the router touches directly; L is the router\'s own address as a /32. Everything else you must teach it.' },
    { t: 'PHASE 3 — On R1, add next-hop static routes to both remote LANs and to all three remote loopbacks', why: 'Five routes on one router. The syntax is identical each time, which is exactly what makes it stick.' },
    { t: 'PHASE 4 — On R2, the hub, add six routes: three LANs and three loopbacks', why: 'Six more repetitions. R2 touches every other router, so it needs to know how to reach everything on both sides.' },
    { t: 'PHASE 5 — On R2, try the exit-interface form first, look at it, then replace it with the next-hop form', why: 'On Ethernet the exit-interface form relies on proxy ARP and Cisco recommends against it. Seeing the difference beats being told.' },
    { t: 'PHASE 6 — Give R3 a single default route instead of individual routes', why: 'One route that matches everything unknown. This is how every stub site and home router is built.' },
    { t: 'PHASE 7 — On R4, add two specific routes, then replace both with a single summary route', why: 'Route summarisation: one 10.0.0.0/16 entry covers every 10.0.x.x network, shrinking the table and the typing.' },
    { t: 'PHASE 8 — Add a floating backup route on R1 over the direct R1–R3 link with distance 200', why: 'A higher administrative distance keeps it dormant while the primary path is alive — automatic failover with no routing protocol.' },
    { t: 'PHASE 9 — Add a /32 host route for PC3 over the direct link, trace the path, then remove it', why: 'Longest prefix match: a /32 beats a /24 covering the same address regardless of distance. The traceroute hop count proves it.' },
    { t: 'PHASE 10 — Test the full connectivity matrix between all three PC networks', why: 'Six directions in total. Every one needs a route there and a route back, which is what all this configuration was for.' },
    { t: 'PHASE 11 — Sweep show ip route on all four routers and identify each code and gateway of last resort', why: 'C, L, S and S* each mean something specific. Reading a routing table fluently is half of routing troubleshooting.' },
    { t: 'PHASE 12 — Enable IPv6 routing on R1, R2 and R3 and address the two links manually', why: 'IPv6 forwarding is off by default — the single most common IPv6 exam trap. Three repetitions of the same command.' },
    { t: 'Set memorable link-local addresses on both ends of the R1–R2 link', why: 'Link-locals are auto-generated anyway, but pinning them makes next-hop addresses readable instead of a MAC-derived jumble.' },
    { t: 'Address R1\'s LAN manually, R3\'s LAN with EUI-64, and enable IPv6 on a third interface with no global address at all', why: 'The three ways an interface can hold an IPv6 address. EUI-64 derives the host half from the MAC — you may have to compute one by hand.' },
    { t: 'PHASE 13 — Exchange IPv6 static routes, give R3 an IPv6 default route, and verify', why: 'Same both-directions rule as IPv4, shorter syntax. <code>::/0</code> is the IPv6 way of writing 0.0.0.0/0.' },
  ],
  steps: [
    /* ---- PHASE 1: loopbacks ---- */
    { d: 'R1', t: 'Loopback identity for R1.', c: ['enable', 'configure terminal', 'interface loopback 0', 'ip address 1.1.1.1 255.255.255.255', 'end', 'show ip interface brief'], note: 'Up immediately, no <code>no shutdown</code> needed. A /32 means "this one address" — the convention for a router identity.' },
    { d: 'R2', t: 'Loopback for R2.', c: ['enable', 'configure terminal', 'interface loopback 0', 'ip address 2.2.2.2 255.255.255.255', 'end'] },
    { d: 'R3', t: 'Loopback for R3.', c: ['enable', 'configure terminal', 'interface loopback 0', 'ip address 3.3.3.3 255.255.255.255', 'end'] },
    { d: 'R4', t: 'Loopback for R4.', c: ['enable', 'configure terminal', 'interface loopback 0', 'ip address 4.4.4.4 255.255.255.255', 'end'], note: 'Four routers, four identities. The same two commands each time.' },

    /* ---- PHASE 2: read the starting table ---- */
    { d: 'R1', t: 'Read the table you start with.', c: ['terminal length 0', 'show ip route'], note: 'C entries are directly connected networks; L entries are R1\'s own addresses as /32 host routes. "Gateway of last resort is not set" — no default yet.' },
    { d: 'R1', t: 'Confirm what R1 can and cannot reach right now.', c: ['ping 10.0.12.2', 'ping 10.0.3.1'], note: 'The neighbour answers; anything beyond it does not. A router only knows what it touches.' },

    /* ---- PHASE 3: five routes on R1 ---- */
    { d: 'R1', t: 'Route 1 — R3\'s LAN, via the hub.', c: ['configure terminal', 'ip route 10.0.3.0 255.255.255.0 10.0.12.2'], note: 'Read it aloud: "to reach 10.0.3.0/24, hand the packet to 10.0.12.2". That sentence is the whole command.' },
    { d: 'R1', t: 'Route 2 — R4\'s LAN, same next hop.', c: ['ip route 10.0.4.0 255.255.255.0 10.0.12.2'] },
    { d: 'R1', t: 'Routes 3, 4 and 5 — the three remote loopbacks.', c: ['ip route 2.2.2.2 255.255.255.255 10.0.12.2', 'ip route 3.3.3.3 255.255.255.255 10.0.12.2', 'ip route 4.4.4.4 255.255.255.255 10.0.12.2', 'end', 'show ip route'], note: 'Five routes typed, all with the same shape. Note the /32 masks on the loopback routes.' },

    /* ---- PHASE 4: six routes on R2 ---- */
    { d: 'R2', t: 'The hub needs to reach all three LANs. First R1\'s.', c: ['configure terminal', 'ip route 10.0.1.0 255.255.255.0 10.0.12.1'] },
    { d: 'R2', t: 'Then R3\'s and R4\'s.', c: ['ip route 10.0.3.0 255.255.255.0 10.0.23.2', 'ip route 10.0.4.0 255.255.255.0 10.0.24.2'], note: 'Three different next hops out of three different interfaces — the hub really is the centre of this network.' },
    { d: 'R2', t: 'And the three remote loopbacks.', c: ['ip route 1.1.1.1 255.255.255.255 10.0.12.1', 'ip route 3.3.3.3 255.255.255.255 10.0.23.2', 'ip route 4.4.4.4 255.255.255.255 10.0.24.2', 'end', 'show ip route'], note: 'Six routes on this router, eleven so far in the lab. The repetition is deliberate.' },

    /* ---- PHASE 5: exit-interface form ---- */
    { d: 'R2', t: 'Try the exit-interface form for a moment.', c: ['configure terminal', 'ip route 192.168.99.0 255.255.255.0 g0/2', 'do show ip route'], note: 'Valid syntax. But on an Ethernet link the router must ARP for every destination behind that port, relying on the neighbour to answer with proxy ARP.' },
    { d: 'R2', t: 'Remove it again — on Ethernet, prefer the next hop.', c: ['no ip route 192.168.99.0 255.255.255.0 g0/2', 'end', 'show ip route'], note: 'On a true point-to-point link such as serial, the exit-interface form is fine because there is only one possible receiver.' },

    /* ---- PHASE 6: default route on R3 ---- */
    { d: 'R3', t: 'One default route replaces every specific one.', c: ['configure terminal', 'ip route 0.0.0.0 0.0.0.0 10.0.23.1', 'end', 'show ip route'], note: 'Now "Gateway of last resort" is set, and the route shows as S* — the asterisk marks it as the candidate default.' },
    { d: 'R3', t: 'Prove it works in both useful directions.', c: ['ping 10.0.1.1', 'ping 4.4.4.4'], note: 'One route, and R3 can reach the entire network. This is why stub sites use defaults.' },

    /* ---- PHASE 7: summarisation on R4 ---- */
    { d: 'R4', t: 'First the specific way — two separate routes.', c: ['configure terminal', 'ip route 10.0.1.0 255.255.255.0 10.0.24.1', 'ip route 10.0.3.0 255.255.255.0 10.0.24.1', 'do show ip route'], note: 'Two entries, both pointing the same way. On a real network this pattern repeats dozens of times.' },
    { d: 'R4', t: 'Now remove both and replace them with one summary.', c: ['no ip route 10.0.1.0 255.255.255.0 10.0.24.1', 'no ip route 10.0.3.0 255.255.255.0 10.0.24.1', 'ip route 10.0.0.0 255.255.0.0 10.0.24.1', 'end', 'show ip route'], note: 'A /16 covers every 10.0.x.x network in one line. Smaller tables, faster lookups, less typing — this is route summarisation.' },
    { d: 'R4', t: 'Confirm the summary actually carries traffic.', c: ['ping 10.0.1.1', 'ping 10.0.3.1'], note: 'Both LANs reachable through a single route. Note that R4\'s own connected networks still win, because they are longer prefixes.' },

    /* ---- PHASE 8: floating static ---- */
    { d: 'R1', t: 'Add a backup path to R3\'s LAN over the direct link, deliberately made less attractive.', c: ['configure terminal', 'ip route 10.0.3.0 255.255.255.0 10.0.13.2 200', 'end', 'show ip route'], note: 'The trailing 200 is the administrative distance. A static defaults to 1, so this one waits in reserve while the primary lives.' },
    { d: 'R1', t: 'Confirm traffic still takes the primary path via R2.', c: ['traceroute 10.0.3.1'], note: 'Three hops, through R2. The backup is configured but idle — exactly what a floating static should be.' },

    /* ---- PHASE 9: host route and longest prefix match ---- */
    { d: 'R1', t: 'Add a /32 for one single host over the direct link.', c: ['configure terminal', 'ip route 10.0.3.10 255.255.255.255 10.0.13.2', 'end', 'show ip route'], note: 'Both a /24 and a /32 now cover 10.0.3.10. The /32 is more specific, so it wins — administrative distance never even enters the decision.' },
    { d: 'R1', t: 'Trace to that one host and watch the path change.', c: ['traceroute 10.0.3.10'], note: 'Two hops now instead of three — straight across the direct link, bypassing R2 entirely. That is longest prefix match.' },
    { d: 'R1', t: 'Trace to a different host in the same network for contrast.', c: ['traceroute 10.0.3.1'], note: 'Still three hops via R2, because only .10 has the more specific route. One address treated differently from its neighbours.' },
    { d: 'R1', t: 'Remove the host route and confirm the path reverts.', c: ['configure terminal', 'no ip route 10.0.3.10 255.255.255.255 10.0.13.2', 'end', 'traceroute 10.0.3.10'], note: 'Back to three hops. Every command has a "no" form, and being able to undo cleanly matters as much as adding.' },

    /* ---- PHASE 10: connectivity matrix ---- */
    { d: 'PC1', t: 'PC1 to both remote networks.', c: ['ipconfig', 'ping 10.0.3.10', 'ping 10.0.4.10'], note: 'Each ping needs a route there AND back. If either half is missing you get silence.' },
    { d: 'PC3', t: 'PC3 to the other two.', c: ['ping 10.0.1.10', 'ping 10.0.4.10'], note: 'R3 uses a single default route for both — no per-destination configuration at all.' },
    { d: 'PC4', t: 'And PC4 to the other two.', c: ['ping 10.0.1.10', 'ping 10.0.3.10'], note: 'R4 uses one summary route for both. Three routers, three different strategies, one working network.' },
    { d: 'R1', t: 'Reach every loopback in the network from R1.', c: ['ping 2.2.2.2', 'ping 3.3.3.3', 'ping 4.4.4.4'], note: 'The host routes you typed in Phase 3 doing their job.' },

    /* ---- PHASE 11: routing table sweep ---- */
    { d: 'R1', t: 'Read R1\'s finished table and name every code.', c: ['show ip route'], note: 'C connected, L local, S static. Two routes to 10.0.3.0/24 — the active one and the floating backup at distance 200.' },
    { d: 'R2', t: 'The hub has the biggest table of all.', c: ['terminal length 0', 'show ip route'], note: 'Six statics plus its connected networks. Every route points at a different neighbour.' },
    { d: 'R3', t: 'R3 has almost nothing — just a default.', c: ['show ip route'], note: 'One S* entry and a gateway of last resort. Compare the size of this table with R2\'s.' },
    { d: 'R4', t: 'And R4 has one summary.', c: ['show ip route'], note: 'Three strategies side by side: specifics on R1 and R2, a default on R3, a summary on R4.' },

    /* ---- PHASE 12: IPv6 addressing ---- */
    { d: 'R1', t: 'Enable IPv6 routing and address the link to R2 manually.', c: ['configure terminal', 'ipv6 unicast-routing', 'interface g0/1', 'ipv6 address 2001:db8:12::1/64', 'ipv6 address FE80::1 link-local', 'exit'], note: 'Off by default — nothing forwards IPv6 until that first command. Pinning the link-local to FE80::1 makes it readable.' },
    { d: 'R1', t: 'Address the LAN manually, and enable IPv6 on the backup link with no global address.', c: ['interface g0/0', 'ipv6 address 2001:db8:1::1/64', 'exit', 'interface g0/2', 'ipv6 enable', 'end', 'show ipv6 interface brief'], note: 'G0/2 now has a link-local only — enough for a routing protocol to run over, with no global addressing needed.' },
    { d: 'R2', t: 'Second router: routing on, both links addressed.', c: ['configure terminal', 'ipv6 unicast-routing', 'interface g0/0', 'ipv6 address 2001:db8:12::2/64', 'ipv6 address FE80::2 link-local', 'exit', 'interface g0/1', 'ipv6 address 2001:db8:23::2/64', 'end', 'show ipv6 interface brief'] },
    { d: 'R3', t: 'Third router: routing on, link manual, LAN built by EUI-64.', c: ['configure terminal', 'ipv6 unicast-routing', 'interface g0/0', 'ipv6 address 2001:db8:23::3/64', 'exit', 'interface g0/1', 'ipv6 address 2001:db8:3::/64 eui-64', 'end', 'show ipv6 interface brief'], note: 'EUI-64 splits the MAC, wedges FFFE into the middle and flips the seventh bit. Compare the result with the MAC in <code>show interfaces g0/1</code>.' },

    /* ---- PHASE 13: IPv6 routing ---- */
    { d: 'R1', t: 'IPv6 static route to R3\'s LAN.', c: ['configure terminal', 'ipv6 route 2001:db8:3::/64 2001:db8:12::2', 'end', 'show ipv6 route'], note: 'Shorter than IPv4 — the prefix length is written inline so there is no separate mask.' },
    { d: 'R2', t: 'The hub needs both directions.', c: ['configure terminal', 'ipv6 route 2001:db8:1::/64 2001:db8:12::1', 'ipv6 route 2001:db8:3::/64 2001:db8:23::3', 'end', 'show ipv6 route'] },
    { d: 'R3', t: 'And R3 takes a default, exactly as it did in IPv4.', c: ['configure terminal', 'ipv6 route ::/0 2001:db8:23::2', 'end', 'show ipv6 route'], note: '<code>::/0</code> is the IPv6 way of writing 0.0.0.0/0 — match everything.' },
    { d: 'R1', t: 'Final check and save.', c: ['show ipv6 interface brief', 'show ipv6 route', 'write memory'], note: 'Note every interface has an FE80:: address whether you configured one or not.' },
    { d: 'R2', t: 'Save.', c: ['write memory'] },
    { d: 'R3', t: 'Save.', c: ['write memory'] },
    { d: 'R4', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show ip route', 'show ipv6 route', 'show ipv6 interface brief', 'show ip interface brief', 'show running-config'],
  explain: `<h3>The anatomy of a static route</h3>
<p><code>ip route [network] [mask] [next-hop | exit-interface] [distance]</code>. On Ethernet always give a <b>next-hop IP</b>. The exit-interface form makes the router ARP for every remote destination out of that port, which only works if the neighbour answers with proxy ARP. On a genuine point-to-point link such as serial the exit-interface form is fine, since there is only one possible receiver.</p>
<h3>Route selection, in order</h3>
<p><b>1. Longest prefix match first.</b> A /32 beats a /24 beats a /16, always — before administrative distance is even considered. <b>2. Administrative distance breaks ties</b> between routes of equal prefix length from different sources: connected 0, static 1, eBGP 20, OSPF 110, RIP 120. <b>3. Metric</b> breaks ties within the same protocol.</p>
<p>This ordering is why the /32 host route in Phase 9 wins even against a connected /24, and why a floating static with distance 200 stays dormant behind a distance-1 primary for the <em>same</em> prefix.</p>
<h3>Three ways to size a routing table</h3>
<p><b>Specific routes</b> — one per destination network. Precise, verbose, and what R1 and R2 use here. <b>A default route</b> (0.0.0.0/0) — one entry matching everything unknown; perfect for a stub site with one way out, as on R3. <b>A summary route</b> — one entry covering a contiguous block, such as 10.0.0.0/16 covering every 10.0.x.x network, as on R4. Real designs mix all three.</p>
<h3>Floating statics</h3>
<p>Raising a route's administrative distance above the primary's keeps it out of the table until the primary disappears. It is the simplest possible failover mechanism: no protocol, no adjacency, no timers to tune — and it is still widely used for backup links.</p>
<h3>IPv6 in four commands</h3>
<p><code>ipv6 unicast-routing</code> enables forwarding and is off by default. <code>ipv6 address X/len</code> assigns manually. Adding <code>eui-64</code> derives the host half from the MAC. <code>link-local</code> pins the FE80:: address, and <code>ipv6 enable</code> gives an interface a link-local and nothing else.</p>
<p>Every IPv6 interface has a link-local address whether you asked for one or not, and routing protocols use those rather than global addresses for next hops. There is no broadcast and no ARP — neighbour discovery over multicast does that job instead.</p>`,
  checks: [
    { desc: 'All four routers have loopback identities 1.1.1.1 to 4.4.4.4', fn: H => H.hasIp('R1', 'lo0', '1.1.1.1') && H.hasIp('R2', 'lo0', '2.2.2.2') && H.hasIp('R3', 'lo0', '3.3.3.3') && H.hasIp('R4', 'lo0', '4.4.4.4') },
    { desc: 'R1 has five next-hop statics (two LANs, three loopbacks)', fn: H => { const r = H.d('R1').staticRoutes; return ['10.0.3.0', '10.0.4.0', '2.2.2.2', '3.3.3.3', '4.4.4.4'].every(n => r.some(x => x.net === n && x.via === '10.0.12.2')); } },
    { desc: 'R2 has six statics pointing at three different next hops', fn: H => { const r = H.d('R2').staticRoutes; return r.some(x => x.net === '10.0.1.0' && x.via === '10.0.12.1') && r.some(x => x.net === '10.0.3.0' && x.via === '10.0.23.2') && r.some(x => x.net === '10.0.4.0' && x.via === '10.0.24.2') && r.some(x => x.net === '1.1.1.1') && r.some(x => x.net === '3.3.3.3') && r.some(x => x.net === '4.4.4.4'); } },
    { desc: 'R2\'s experimental exit-interface route was removed again', fn: H => !H.d('R2').staticRoutes.some(x => x.net === '192.168.99.0') },
    { desc: 'R3 uses a single default route', fn: H => { const r = H.d('R3').staticRoutes; return r.length === 1 && r[0].net === '0.0.0.0' && r[0].via === '10.0.23.1'; } },
    { desc: 'R4 replaced its two specifics with one 10.0.0.0/16 summary', fn: H => { const r = H.d('R4').staticRoutes; return r.length === 1 && r[0].net === '10.0.0.0' && r[0].mask === '255.255.0.0'; } },
    { desc: 'R1 has a floating backup to 10.0.3.0/24 with distance 200', fn: H => H.d('R1').staticRoutes.some(x => x.net === '10.0.3.0' && x.via === '10.0.13.2' && x.ad === 200) },
    { desc: 'The temporary /32 host route for PC3 was removed', fn: H => !H.d('R1').staticRoutes.some(x => x.net === '10.0.3.10') },
    { desc: 'PC1 reaches both remote networks', fn: H => H.ping('PC1', '10.0.3.10') && H.ping('PC1', '10.0.4.10') },
    { desc: 'PC3 reaches both other networks via its default route', fn: H => H.ping('PC3', '10.0.1.10') && H.ping('PC3', '10.0.4.10') },
    { desc: 'PC4 reaches both other networks via its summary route', fn: H => H.ping('PC4', '10.0.1.10') && H.ping('PC4', '10.0.3.10') },
    { desc: 'R1 reaches every loopback in the network', fn: H => H.ping('R1', '2.2.2.2') && H.ping('R1', '3.3.3.3') && H.ping('R1', '4.4.4.4') },
    { desc: 'IPv6 routing enabled on R1, R2 and R3', fn: H => ['R1', 'R2', 'R3'].every(r => H.d(r).ipv6Routing) },
    { desc: 'Manual link-locals FE80::1 and FE80::2 on the R1–R2 link', fn: H => H.i('R1', 'g0/1').ipv6LL === 'FE80::1' && H.i('R2', 'g0/0').ipv6LL === 'FE80::2' },
    { desc: 'R1 LAN manual, R3 LAN EUI-64, R1 G0/2 link-local only', fn: H => H.i('R1', 'g0/0').ipv6.some(a => a.addr === '2001:DB8:1::1') && H.i('R3', 'g0/1').ipv6.some(a => a.eui64) && H.i('R1', 'g0/2').ipv6Enable && H.i('R1', 'g0/2').ipv6.length === 0 },
    { desc: 'IPv6 statics on R1 and R2, plus an IPv6 default on R3', fn: H => H.d('R1').v6Routes.some(r => r.prefix === '2001:DB8:3::') && H.d('R2').v6Routes.length === 2 && H.d('R3').v6Routes.some(r => r.prefix === '::') },
    { desc: 'All four routers saved', fn: H => ['R1', 'R2', 'R3', 'R4'].every(r => H.saved(r)) },
  ],
});

/* ============================================================= */
L({
  id: 'x6-ospf-hsrp', vol: 1, tier: 'deep', day: 'Days 25-28', title: 'OSPF & HSRP — Full Drill',
  topics: '5 routers · network statements vs interface mode · router-id · passive default · cost/priority/point-to-point · reference bandwidth · maximum-paths · default-information originate · HSRPv2 two groups',
  devices: [
    { id: 'R1', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0'] },
    { id: 'R2', type: 'router', ifaces: ['g0/0', 'g0/1', 'lo0'] },
    { id: 'R3', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2', 'lo0'] },
    { id: 'R4', type: 'router', ifaces: ['g0/0', 'g0/1', 'g0/2', 'lo0'] },
    { id: 'ISP', type: 'router', ifaces: ['g0/0', 'lo0'] },
    { id: 'SW1', type: 'switch', ifaces: ['f0/1', 'f0/2', 'f0/3'] },
    { id: 'SW2', type: 'switch', ifaces: ['f0/1', 'f0/2'] },
    { id: 'PC1', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.0.10', mask: '255.255.255.0', gw: '10.0.0.1' } },
    { id: 'PC2', type: 'pc', ifaces: ['e0'], pc: { ip: '10.0.4.10', mask: '255.255.255.0', gw: '10.0.4.1' } },
  ],
  links: [
    ['PC1', 'e0', 'SW1', 'f0/3'], ['SW1', 'f0/1', 'R1', 'g0/0'], ['SW1', 'f0/2', 'R2', 'g0/0'],
    ['R1', 'g0/1', 'R3', 'g0/0'], ['R2', 'g0/1', 'R3', 'g0/1'], ['R3', 'g0/2', 'R4', 'g0/0'],
    ['R4', 'g0/1', 'SW2', 'f0/1'], ['SW2', 'f0/2', 'PC2', 'e0'], ['R4', 'g0/2', 'ISP', 'g0/0'],
  ],
  layout: { PC1: [28, 65], SW1: [90, 65], R1: [155, 28], R2: [155, 102], R3: [225, 65], R4: [292, 65], ISP: [358, 28], SW2: [292, 120], PC2: [368, 120] },
  setupAll: topo => {
    const set = (id, ifn, ip, mask) => { const i = ND.getIface(topo.devs[id], ifn); i.ip = { addr: ip, mask }; i.shutdown = false; };
    const M24 = '255.255.255.0', M30 = '255.255.255.252', M32 = '255.255.255.255';
    set('R1', 'g0/0', '10.0.0.2', M24); set('R1', 'g0/1', '10.1.13.1', M30); set('R1', 'lo0', '1.1.1.1', M32);
    set('R2', 'g0/0', '10.0.0.3', M24); set('R2', 'g0/1', '10.1.23.1', M30); set('R2', 'lo0', '2.2.2.2', M32);
    set('R3', 'g0/0', '10.1.13.2', M30); set('R3', 'g0/1', '10.1.23.2', M30); set('R3', 'g0/2', '10.1.34.1', M30); set('R3', 'lo0', '3.3.3.3', M32);
    set('R4', 'g0/0', '10.1.34.2', M30); set('R4', 'g0/1', '10.0.4.1', M24); set('R4', 'g0/2', '203.0.113.1', M30); set('R4', 'lo0', '4.4.4.4', M32);
    set('ISP', 'g0/0', '203.0.113.2', M30); set('ISP', 'lo0', '8.8.8.8', M32);
    for (const r of ['R1', 'R2', 'R3', 'R4', 'ISP']) topo.devs[r].hostname = r;
    topo.devs.SW1.hostname = 'SW1'; topo.devs.SW2.hostname = 'SW2';
    topo.devs.ISP.staticRoutes.push({ net: '10.0.0.0', mask: '255.0.0.0', via: '203.0.113.1', ad: 1 });
  },
  intro: `<b>The situation:</b> a small enterprise — two edge routers sharing a user LAN, a core router, a remote-site router, and an ISP connection at the far end. Every interface is addressed, but no router knows about any network except the ones it touches.<br><b>Your goal:</b> make the whole thing both <em>self-learning</em> and <em>fault-tolerant</em>. OSPF discovers every route with not one static route typed, a default route from the ISP edge is injected into the whole domain, and HSRP gives the PC a gateway address that survives either edge router failing. You will enable OSPF four times using <b>both</b> methods, tune every value CCNA asks about, and build two HSRP groups with reversed priorities.`,
  tasks: [
    { t: 'PHASE 1 — On R1, start OSPF process 1, set router-id 1.1.1.1, and advertise the LAN, the link to R3 and the loopback', why: 'The process ID is only locally meaningful and need not match between routers — a very common misconception. The router ID must be unique and should always be set by hand.' },
    { t: 'Silence OSPF everywhere on R1 with passive-interface default, then re-enable only the link to R3', why: 'The safe pattern: quiet by default, speak only where a neighbour genuinely lives. New interfaces are then silent until you say otherwise.' },
    { t: 'PHASE 2 — On R2, do the same job but enable OSPF on the link using the interface command rather than a network statement', why: 'Two routes to the same result. The interface form is more explicit and increasingly preferred — and the exam expects you to recognise both.' },
    { t: 'Remember that passive-interface default silences an interface even when OSPF was enabled on it directly', why: 'This catches almost everybody once. The interface command turns OSPF on; passive stops it speaking. You need both halves right.' },
    { t: 'PHASE 3 — On R3, the core, advertise both links and the loopback with network statements', why: 'Third repetition of the network-statement syntax, including the 0.0.0.0 wildcard used to advertise a single loopback address.' },
    { t: 'PHASE 4 — On R4, mix both methods: interface command toward R3, network statement for the LAN and loopback', why: 'Fourth repetition, and a realistic configuration — real networks accumulate both styles over the years.' },
    { t: 'PHASE 5 — Practise removing and re-adding a network statement with its no form', why: 'Watch the neighbour drop and come back. Removing cleanly is as important as adding, and the adjacency change makes the effect visible.' },
    { t: 'PHASE 6 — Raise the reference bandwidth to 10000 on all four OSPF routers', why: 'The default of 100 Mbps gives every modern link a cost of 1, so OSPF cannot tell gigabit from fast ethernet. It must be identical everywhere or the costs disagree.' },
    { t: 'Set an explicit interface cost and an OSPF priority, and make the R1–R3 link point-to-point on both ends', why: 'Cost steers path selection, priority steers the DR/BDR election, and point-to-point skips that election entirely — correct on a two-router link. Network type must match on both ends.' },
    { t: 'Limit R1 to two equal-cost paths', why: 'maximum-paths controls equal-cost load balancing; the default is 4. Knowing the command and the default is exam material.' },
    { t: 'PHASE 7 — Give R4 a static default route to the ISP and inject it into OSPF with default-information originate', why: 'One router knows the way out; every other router learns it automatically. The route appears elsewhere as O*E2 — an external route that is also the candidate default.' },
    { t: 'PHASE 8 — Verify with show ip ospf neighbor on all four routers, then interface brief, the process view and show ip protocols', why: 'Four different views. FULL state means the databases are synchronised; anything less means an adjacency requirement is not met.' },
    { t: 'PHASE 9 — Configure HSRP version 2 group 1 on both edge routers, sharing 10.0.0.1, with R1 preferred and preempt enabled', why: 'The PC points at .1, which no router physically owns. R1 wins on priority, and preempt lets it reclaim the role after a failure — HSRP does not preempt by default.' },
    { t: 'Add a second group sharing 10.0.0.254 where R2 is the preferred router', why: 'Two groups with reversed priorities means both routers forward traffic instead of one sitting idle. Split your clients between the two virtual addresses.' },
    { t: 'PHASE 10 — Confirm the roles with show standby brief on both routers, then prove end-to-end reachability from both PCs', why: 'One router Active for group 1, the other for group 2. Then ping the ISP loopback — a network nobody typed a route to.' },
  ],
  steps: [
    /* ---- PHASE 1: R1 with network statements ---- */
    { d: 'R1', t: 'Look at what R1 knows before OSPF exists.', c: ['enable', 'terminal length 0', 'show ip route'], note: 'Only connected networks. Three of them, and nothing else in the entire company.' },
    { d: 'R1', t: 'Start the OSPF process and pin the router ID.', c: ['configure terminal', 'router ospf 1', 'router-id 1.1.1.1'], note: 'Without this, OSPF picks the highest loopback address, or failing that the highest interface address. Setting it yourself keeps neighbour tables readable.' },
    { d: 'R1', t: 'Advertise all three networks with wildcard masks.', c: ['network 10.0.0.0 0.0.0.255 area 0', 'network 10.1.13.0 0.0.0.3 area 0', 'network 1.1.1.1 0.0.0.0 area 0'], note: 'Wildcards are inverted masks: /24 → 0.0.0.255, /30 → 0.0.0.3, and 0.0.0.0 means "this exact address" — the normal way to advertise one loopback.' },
    { d: 'R1', t: 'Silence everything, then re-enable only where a neighbour lives.', c: ['passive-interface default', 'no passive-interface g0/1', 'end', 'show ip ospf interface brief'], note: 'The LAN has only PCs on it, so hellos there are wasted and mildly risky. The subnet is still advertised.' },

    /* ---- PHASE 2: R2 with the interface form ---- */
    { d: 'R2', t: 'Second router — process, ID, and only the LAN by network statement.', c: ['enable', 'configure terminal', 'router ospf 1', 'router-id 2.2.2.2', 'network 10.0.0.0 0.0.0.255 area 0', 'network 2.2.2.2 0.0.0.0 area 0', 'passive-interface default'], note: 'Note there is no network statement for the link to R3 — that is coming from the interface instead.' },
    { d: 'R2', t: 'Un-passive the link, then enable OSPF on it at interface level.', c: ['no passive-interface g0/1', 'exit', 'interface g0/1', 'ip ospf 1 area 0', 'end', 'show ip ospf interface brief'], note: 'Two lessons at once. <code>ip ospf 1 area 0</code> replaces a network statement. And <b>passive-interface default silences an interface even when OSPF was enabled on it directly</b> — forget the no passive line and the neighbour never appears.' },

    /* ---- PHASE 3: R3, the core ---- */
    { d: 'R3', t: 'The core router advertises both links and its loopback.', c: ['enable', 'configure terminal', 'router ospf 1', 'router-id 3.3.3.3', 'network 10.1.13.0 0.0.0.3 area 0', 'network 10.1.23.0 0.0.0.3 area 0', 'network 10.1.34.0 0.0.0.3 area 0', 'network 3.3.3.3 0.0.0.0 area 0', 'end', 'show ip ospf neighbor'], note: 'Three /30 links and one loopback. R3 should already be forming adjacencies with R1 and R2.' },

    /* ---- PHASE 4: R4 mixing both methods ---- */
    { d: 'R4', t: 'Fourth router — network statements for the LAN and loopback.', c: ['enable', 'configure terminal', 'router ospf 1', 'router-id 4.4.4.4', 'network 10.0.4.0 0.0.0.255 area 0', 'network 4.4.4.4 0.0.0.0 area 0', 'passive-interface default'], note: 'Note the ISP link is deliberately NOT advertised — you never run your interior routing protocol toward a provider.' },
    { d: 'R4', t: 'And the interface form toward the core.', c: ['no passive-interface g0/0', 'exit', 'interface g0/0', 'ip ospf 1 area 0', 'end', 'show ip ospf neighbor'], note: 'Both methods now in use on the same router, which is exactly what real configurations look like after a few years.' },

    /* ---- PHASE 5: removing and re-adding ---- */
    { d: 'R3', t: 'Remove one network statement and watch the neighbour disappear.', c: ['configure terminal', 'router ospf 1', 'no network 10.1.23.0 0.0.0.3 area 0', 'end', 'show ip ospf neighbor'], note: 'R2 has dropped out of the neighbour table. OSPF stopped running on that interface the moment the statement went.' },
    { d: 'R3', t: 'Put it back and confirm the adjacency returns.', c: ['configure terminal', 'router ospf 1', 'network 10.1.23.0 0.0.0.3 area 0', 'end', 'show ip ospf neighbor'], note: 'Two neighbours again. Being able to watch an adjacency come and go on demand is a genuinely useful troubleshooting skill.' },

    /* ---- PHASE 6: tuning ---- */
    { d: 'R1', t: 'Raise the reference bandwidth and cap equal-cost paths.', c: ['configure terminal', 'router ospf 1', 'auto-cost reference-bandwidth 10000', 'maximum-paths 2', 'exit'], note: 'Read the warning IOS prints — this value must match on every router or their cost calculations disagree and you get sub-optimal paths.' },
    { d: 'R1', t: 'Tune the link to R3 at interface level.', c: ['interface g0/1', 'ip ospf cost 10', 'ip ospf priority 100', 'ip ospf network point-to-point', 'end', 'show ip ospf interface brief'], note: 'An explicit cost overrides the bandwidth calculation entirely. Priority affects the DR election — which point-to-point then makes irrelevant.' },
    { d: 'R3', t: 'Match the network type on the other end, or the adjacency breaks.', c: ['configure terminal', 'router ospf 1', 'auto-cost reference-bandwidth 10000', 'exit', 'interface g0/0', 'ip ospf network point-to-point', 'end', 'show ip ospf neighbor'], note: 'Network type must match on both ends. Note the state now reads FULL/ - rather than FULL/DR, because point-to-point links elect nobody.' },
    { d: 'R2', t: 'Reference bandwidth on R2 as well.', c: ['configure terminal', 'router ospf 1', 'auto-cost reference-bandwidth 10000', 'end'], note: 'Third of four. Leave R2–R3 as a broadcast link so you can compare the neighbour states.' },
    { d: 'R4', t: 'And on R4 — all four now agree.', c: ['configure terminal', 'router ospf 1', 'auto-cost reference-bandwidth 10000', 'end', 'show ip ospf'] },

    /* ---- PHASE 7: default route injection ---- */
    { d: 'R4', t: 'Point a static default at the ISP.', c: ['configure terminal', 'ip route 0.0.0.0 0.0.0.0 203.0.113.2', 'do show ip route'], note: 'R4 is the only router that knows where the internet is. Gateway of last resort is now set — on this router only.' },
    { d: 'R4', t: 'Now share that knowledge with the whole OSPF domain.', c: ['router ospf 1', 'default-information originate', 'end', 'show ip route'], note: 'One command turns R4 into the exit for everybody. Without it, every other router would need its own static default.' },
    { d: 'R1', t: 'Confirm the default arrived at the far end of the network.', c: ['show ip route'], note: 'Look for O*E2 0.0.0.0/0 — an OSPF external route that is also the candidate default. R1 now knows the way out without a single static route.' },

    /* ---- PHASE 8: verification sweep ---- */
    { d: 'R1', t: 'Neighbours, interfaces and the process itself.', c: ['show ip ospf neighbor', 'show ip ospf interface brief', 'show ip ospf'], note: 'One neighbour (R3) in FULL state. The interface list shows G0/1 but not G0/0, which is passive.' },
    { d: 'R2', t: 'Same three views from R2.', c: ['show ip ospf neighbor', 'show ip ospf interface brief', 'show ip protocols'], note: '<code>show ip protocols</code> summarises what is advertised, which interfaces are passive, and the administrative distance.' },
    { d: 'R3', t: 'The core should have three neighbours.', c: ['show ip ospf neighbor', 'show ip ospf interface brief'], note: 'R1, R2 and R4 — the whole network converges here. Compare the state column: the point-to-point link reads differently.' },
    { d: 'R4', t: 'And the remote router\'s view.', c: ['show ip ospf neighbor', 'show ip protocols', 'show ip route'], note: 'R4 learns every internal network by OSPF while holding the only static route in the entire company.' },
    { d: 'R3', t: 'Look at the routes OSPF built with no help.', c: ['show ip route'], note: 'Every O entry was discovered automatically. Add a fifth router tomorrow and nobody types a route.' },

    /* ---- PHASE 9: HSRP with two groups ---- */
    { d: 'R1', t: 'HSRP version 2, group 1, and make R1 the preferred gateway.', c: ['configure terminal', 'interface g0/0', 'standby version 2', 'standby 1 ip 10.0.0.1', 'standby 1 priority 110', 'standby 1 preempt'], note: 'Version 2 must match on both routers. Without <code>preempt</code> a recovered R1 stays in standby forever despite its higher priority — the classic exam trap.' },
    { d: 'R1', t: 'Add group 2, where R1 deliberately stays the backup.', c: ['standby 2 ip 10.0.0.254', 'standby 2 preempt', 'end', 'show standby brief'], note: 'R1 keeps the default priority of 100 in group 2, so R2 will win that one. Two groups, two different winners.' },
    { d: 'R2', t: 'Mirror the configuration with the priorities reversed.', c: ['configure terminal', 'interface g0/0', 'standby version 2', 'standby 1 ip 10.0.0.1', 'standby 1 preempt', 'standby 2 ip 10.0.0.254', 'standby 2 priority 110', 'standby 2 preempt', 'end', 'show standby brief'], note: 'R2 is Active for group 2 and Standby for group 1. Both routers now carry traffic rather than one idling as a hot spare.' },
    { d: 'R1', t: 'Confirm the split from R1\'s side too.', c: ['show standby brief'], note: 'Read the columns: group, priority, P for preempt, who is Active, who is Standby, and the virtual IP.' },

    /* ---- PHASE 10: end-to-end proof ---- */
    { d: 'PC1', t: 'Both virtual gateways should answer.', c: ['ipconfig', 'ping 10.0.0.1', 'ping 10.0.0.254'], note: 'Two addresses that no physical router owns, both answering. That is the whole point of a first-hop redundancy protocol.' },
    { d: 'PC1', t: 'Reach the remote site and the internet.', c: ['ping 10.0.4.10', 'ping 4.4.4.4', 'ping 8.8.8.8'], note: 'The remote LAN and loopback came from OSPF. 8.8.8.8 is beyond the OSPF domain entirely — it works because of the injected default route.' },
    { d: 'PC2', t: 'And from the remote site back the other way.', c: ['ipconfig', 'ping 10.0.0.10', 'ping 10.0.0.1', 'ping 8.8.8.8'], note: 'Six routers of path, and the only static route in the whole company is the one on R4 pointing at the ISP.' },
    { d: 'R1', t: 'Save every router.', c: ['write memory'] },
    { d: 'R2', t: 'Save.', c: ['write memory'] },
    { d: 'R3', t: 'Save.', c: ['write memory'] },
    { d: 'R4', t: 'Save.', c: ['write memory'] },
  ],
  verify: ['show ip ospf neighbor', 'show ip ospf interface brief', 'show ip ospf', 'show ip protocols', 'show ip route', 'show standby brief'],
  explain: `<h3>Two ways to enable OSPF on an interface</h3>
<p>The classic way is a <code>network</code> statement under the OSPF process, matching interface addresses with a wildcard mask. The modern way is <code>ip ospf [process] area [area]</code> directly on the interface. They are equivalent; the interface form removes all doubt about which interfaces are included. Both appear in exam questions, and real configurations often contain both.</p>
<h3>Adjacency requirements</h3>
<p>Two routers reach FULL state only if they agree on: the same subnet, the same area, matching hello and dead timers, matching authentication, matching network type, matching MTU, and unique router IDs. A mismatch in any one leaves the neighbour stuck short of FULL — which is why changing the network type in Phase 6 had to be done on both ends.</p>
<h3>Cost and reference bandwidth</h3>
<p>Cost = reference bandwidth ÷ interface bandwidth, minimum 1. The default reference of 100 Mbps scores a 100 Mbps link, a 1 Gbps link and a 10 Gbps link all at 1, so OSPF cannot distinguish them. Raising the reference to 10000 restores the difference — but every router must use the same value or their views of the topology disagree. An explicit <code>ip ospf cost</code> overrides the calculation completely.</p>
<h3>Passive interfaces</h3>
<p>A passive interface still has its subnet advertised but stops sending hellos, so no neighbour can form there. Use it on every interface with no OSPF router behind it. <code>passive-interface default</code> plus explicit <code>no passive-interface</code> on the few links that need it is the safer habit — and note it overrides interface-level OSPF activation, which surprises nearly everyone once.</p>
<h3>Injecting a default route</h3>
<p><code>default-information originate</code> advertises this router's default route into OSPF, so every other router learns where "everything else" lives. It appears in their tables as <b>O*E2</b>: O for OSPF, * for candidate default, E2 for an external route whose cost does not increase as it propagates. Without it, every router would need its own static default — which defeats the point of running a routing protocol.</p>
<h3>HSRP</h3>
<p>Hosts hold exactly one gateway address, so redundancy hides behind a <b>virtual IP</b> and virtual MAC. The Active router answers for it; the Standby listens for hellos (every 3 seconds, dead after 10) and takes over on failure. Highest priority wins, but <b>HSRP does not preempt by default</b> — without the <code>preempt</code> keyword a recovered router stays Standby indefinitely. Running two groups with reversed priorities, and splitting clients between the two virtual addresses, lets both routers forward traffic at once.</p>`,
  checks: [
    { desc: 'OSPF running on all four internal routers with unique IDs', fn: H => ['R1', 'R2', 'R3', 'R4'].every((r, i) => H.d(r).ospf?.routerId === `${i + 1}.${i + 1}.${i + 1}.${i + 1}`) },
    { desc: 'R1 advertises its LAN, link and loopback with network statements', fn: H => { const n = H.d('R1').ospf?.networks || []; return ['10.0.0.0', '10.1.13.0', '1.1.1.1'].every(x => n.some(y => y.net === x)); } },
    { desc: 'R1 and R2 both use passive-interface default with their link re-enabled', fn: H => ['R1', 'R2'].every(r => H.d(r).ospf?.passiveDefault && H.d(r).ospf?.noPassive.includes('GigabitEthernet0/1')) },
    { desc: 'R2 and R4 enabled OSPF on a link using the interface command', fn: H => H.i('R2', 'g0/1').ospf.pid === 1 && H.i('R4', 'g0/0').ospf.pid === 1 },
    { desc: 'R3 re-added the network statement it removed', fn: H => H.d('R3').ospf?.networks.some(n => n.net === '10.1.23.0') },
    { desc: 'Reference bandwidth 10000 on all four routers', fn: H => ['R1', 'R2', 'R3', 'R4'].every(r => H.d(r).ospf?.refBw === 10000) },
    { desc: 'R1: OSPF cost 10, priority 100 and point-to-point on G0/1', fn: H => { const o = H.i('R1', 'g0/1').ospf; return o.cost === 10 && o.priority === 100 && o.netType === 'point-to-point'; } },
    { desc: 'R3 matched the point-to-point network type on its end', fn: H => H.i('R3', 'g0/0').ospf.netType === 'point-to-point' },
    { desc: 'R1 limits equal-cost paths to 2', fn: H => H.d('R1').ospf?.maxPaths === 2 },
    { desc: 'R4 has a static default to the ISP and injects it into OSPF', fn: H => H.d('R4').staticRoutes.some(r => r.net === '0.0.0.0' && r.via === '203.0.113.2') && H.d('R4').ospf?.defaultInfo },
    { desc: 'R4 does NOT advertise the ISP link into OSPF', fn: H => !(H.d('R4').ospf?.networks || []).some(n => n.net.startsWith('203.')) && H.i('R4', 'g0/2').ospf.pid === null },
    { desc: 'All three core adjacencies are FULL (R1↔R3, R2↔R3, R3↔R4)', fn: H => H.ospfNbr('R1', 'R3') && H.ospfNbr('R2', 'R3') && H.ospfNbr('R3', 'R4') },
    { desc: 'No adjacency forms across the passive user LAN', fn: H => !H.ospfNbr('R1', 'R2') },
    { desc: 'HSRP group 1: both routers share 10.0.0.1, R1 preferred with preempt', fn: H => H.i('R1', 'g0/0').standby[1]?.ip === '10.0.0.1' && H.i('R1', 'g0/0').standby[1]?.priority === 110 && H.i('R1', 'g0/0').standby[1]?.preempt && H.i('R2', 'g0/0').standby[1]?.ip === '10.0.0.1' },
    { desc: 'HSRP group 2: both routers share 10.0.0.254, R2 preferred', fn: H => H.i('R2', 'g0/0').standby[2]?.priority === 110 && H.i('R1', 'g0/0').standby[2]?.ip === '10.0.0.254' },
    { desc: 'HSRP version 2 on both edge routers', fn: H => H.i('R1', 'g0/0').standby[1]?.version === 2 && H.i('R2', 'g0/0').standby[1]?.version === 2 },
    { desc: 'PC1 reaches both virtual gateways', fn: H => H.ping('PC1', '10.0.0.1') && H.ping('PC1', '10.0.0.254') },
    { desc: 'PC1 reaches the remote site over OSPF-learned routes', fn: H => H.ping('PC1', '10.0.4.10') && H.ping('PC1', '4.4.4.4') },
    { desc: 'Both PCs reach the ISP via the injected default route', fn: H => H.ping('PC1', '8.8.8.8') && H.ping('PC2', '8.8.8.8') },
    { desc: 'All four internal routers saved', fn: H => ['R1', 'R2', 'R3', 'R4'].every(r => H.saved(r)) },
  ],
});

window.ND = ND;
})();
