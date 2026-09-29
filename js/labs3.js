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
  id: 'x1-device-mgmt', ord: 100, vol: 1, tier: 'deep', day: 'Days 4-5', title: 'Device Setup & Management — Full Drill',
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
  spec: [
    { t: 'Commission five devices from scratch: SW1, SW2, SW3, R1 and R2.', r: [] },
    { d: 'Every device', r: [
      'Its own hostname (<b>SW1</b>, <b>SW2</b>, <b>SW3</b>, <b>R1</b>, <b>R2</b>).',
      'An enable secret.',
      'A console password with password checking switched on.',
      'vty lines that require authentication — a password with login, or local accounts.',
      'A domain name, with DNS lookups disabled.',
      'The configuration saved to NVRAM.',
    ] },
    { d: 'SW1, SW2, SW3 and R1', r: [
      'A console idle timeout. On <b>R1</b> it must end at a sane value — not <b>0 0</b>.',
      '<b>SW1</b>, <b>SW2</b> and <b>R1</b> also use logging synchronous on the console.',
      '<b>SW1</b> finishes with password encryption enabled and <b>no</b> plaintext enable password.',
    ] },
    { d: 'Banners', r: [
      '<b>SW1</b>, <b>SW2</b>, <b>R1</b> and <b>R2</b> each carry a message-of-the-day banner.',
      '<b>SW3</b> must end with <b>no</b> banner — set one, then remove it.',
    ] },
    { d: 'R2', r: [
      'Two local user accounts, and vty lines that authenticate against them rather than a shared password.',
    ] },
    { d: 'R1', r: [
      'A name server configured, with DNS lookups left <b>off</b>.',
      'All three links described and enabled.',
    ] },
    { t: 'Verification', r: [
      '<b>R1</b> sees SW1, SW2 and R2 over CDP; <b>R2</b> sees R1 and SW3. R2\'s links are enabled.',
    ] },
  ],
  tasks: [
    { t: 'PHASE 1 — Walk every command mode on SW1 and back out of each',
      do: [
        'On the <b>SW1</b> tab, go from user EXEC into privileged EXEC, then into global configuration mode.',
        'From there step into <b>interface F0/1</b>, back out with <code>exit</code>, into <b>line console 0</b>, and back out again.',
        'Watch the prompt at every step: <code>&gt;</code> then <code>#</code> then <code>(config)#</code> then <code>(config-if)#</code> then <code>(config-line)#</code>.',
      ],
      done: 'You have seen all five prompts and are back at the <code>#</code> prompt.',
      why: 'The prompt is your position indicator. Reading it before you type is the single habit that prevents most beginner mistakes.' },

    { t: 'Give SW1 the complete baseline configuration',
      do: [
        'Set the hostname to <b>SW1</b> and the enable secret to <b>Cisco123</b>.',
        'On <b>console line 0</b>: password <b>ConPass1</b> plus <code>login</code>.',
        'On <b>vty lines 0 4</b>: password <b>VtyPass1</b> plus <code>login</code>.',
        'Add a motd banner, the domain name <b>netdrill.lab</b>, and disable domain lookup.',
        'Return to privileged EXEC and save with <code>copy running-config startup-config</code>.',
      ],
      done: 'All eight settings appear in <code>show running-config</code> and the config is saved.',
      why: 'That is the complete opening routine — around nine commands. You are about to type it four more times, which is exactly the point.' },

    { t: 'PHASE 2 — Repeat the identical baseline on SW2, from memory if you can',
      do: [
        'Switch to the <b>SW2</b> tab and type the whole block again: hostname <b>SW2</b>, secret <b>Cisco123</b>, both line passwords with login, banner, domain, no domain lookup.',
        'Save this one with <b>write memory</b> instead.',
      ],
      done: 'SW2 carries the same configuration as SW1 and is saved.',
      why: 'The second repetition is where learning happens — same commands, different device, no new concepts. <code>write memory</code> and <code>copy run start</code> do exactly the same thing.' },

    { t: 'Third time on SW3, changing every value',
      do: [
        'On <b>SW3</b>: hostname <b>SW3</b>, secret <b>Sw3Secret</b>, console password <b>Sw3Con</b> with an exec-timeout of <b>15 0</b>, vty password <b>Sw3Vty</b> with exec-timeout <b>30 0</b>.',
        'Use <b>$</b> as the banner delimiter this time, and the domain <b>lab.local</b>.',
        'Save with the shortest form of all: <b>write</b>.',
      ],
      done: 'SW3 has the same shapes with entirely different values.',
      why: 'The command shapes are what you are memorising, not the values. Three ways to save the same configuration all appear in exam questions.' },

    { t: 'PHASE 3 — Give R1 the same baseline and spot what differs on a router',
      do: [
        'On <b>R1</b>, type the same baseline block, adding <b>logging synchronous</b> on both line types.',
        'Then display the brief interface summary and read the status column.',
      ],
      done: 'R1 is configured and every interface reads "administratively down".',
      why: 'Nothing in the block is router-specific. What IS different is the hardware default: router ports ship disabled, switch ports ship enabled — a difference that causes endless confusion.' },

    { t: 'Fifth and final repetition on R2',
      do: [
        'On <b>R2</b>, type the whole baseline once more: hostname, secret, both lines, banner, domain, no lookup — and save.',
      ],
      done: 'All five devices now carry the baseline.',
      why: 'By the fifth time this should be flowing without conscious thought. That is the entire purpose of typing it five times.' },

    { t: 'PHASE 4 — Prove the secret beats the password, then remove the weaker one',
      do: [
        'On <b>SW1</b>, add a plain <b>enable password WeakOne</b> alongside the existing secret and look at the running configuration.',
        'Compare the two lines: one is a hash, one is readable.',
        'Then delete the plain password and leave the secret in place.',
      ],
      done: 'Only the enable secret remains.',
      why: 'Both can exist at once and IOS always checks the secret, ignoring the password entirely. Removing the redundant plaintext line is the real-world cleanup.' },

    { t: 'Toggle password encryption on and off, watching the config each time',
      do: [
        'On <b>SW1</b>, enable <b>service password-encryption</b> and look at the line passwords.',
        'Disable it again and look once more.',
        'Finish with it enabled.',
      ],
      done: 'Service password-encryption is on at the end.',
      why: 'Note what happens in the middle: already-encrypted passwords stay encrypted. Disabling the service only stops NEW passwords being scrambled — it cannot un-ring the bell.' },

    { t: 'PHASE 5 — Work through every console and vty line option',
      do: [
        'On <b>SW1</b>: console exec-timeout <b>5 0</b> with logging synchronous; vty exec-timeout <b>10 0</b> with logging synchronous.',
        'On <b>SW2</b>: the same pair of settings, then save.',
      ],
      done: 'Both switches have timeouts and synchronous logging on both line types.',
      why: 'Console and vty are configured separately and neither inherits from the other. exec-timeout takes minutes and seconds, so 5 0 is five minutes.' },

    { t: 'Remove SW3\'s enable secret and immediately put it back',
      do: [
        'On <b>SW3</b>, remove the enable secret with its "no" form and look at the running configuration.',
        'Then set it straight back to <b>Sw3Secret</b>.',
      ],
      done: 'SW3 still has its enable secret at the end.',
      why: 'With no secret and no password, <code>enable</code> lets anyone straight in from the console. Seeing that state for a moment is the fastest way to understand why it must never be left.' },

    { t: 'On R2, create local accounts and move the vty lines onto them',
      do: [
        'On <b>R2</b>, create <b>username admin</b> with a plain password and <b>username netops</b> with a hashed secret, then compare the two lines.',
        'On the <b>vty lines</b>, first type <b>no login</b> and look at the configuration, then set <b>login local</b>.',
      ],
      done: 'The vty lines authenticate against the local user database.',
      why: '<code>no login</code> leaves the lines open with no check at all — never a final state. <code>login local</code> checks the username database instead of one shared password, and is a prerequisite for SSH.' },

    { t: 'Give R1 a DNS server, switch lookups on, then off again',
      do: [
        'On <b>R1</b>, configure name server <b>8.8.8.8</b> and enable domain lookup.',
        'Look at the running configuration, then disable domain lookup again.',
      ],
      done: 'The name server is configured and lookups are off.',
      why: 'A name server is only consulted while lookups are enabled — which is exactly why disabling them stops a mistyped command freezing your session for a minute.' },

    { t: 'On R1, try both exec-timeout forms including the dangerous one',
      do: [
        'On <b>R1</b>\'s console line, set <b>exec-timeout 20</b> (the single-argument form), then <b>exec-timeout 0 0</b>, then finish on <b>exec-timeout 10 0</b>.',
      ],
      done: 'The console ends with a ten-minute timeout.',
      why: '20 on its own means twenty minutes. <b>0 0</b> means never time out — convenient in a lab and a finding in every security audit, which is why you finish on a sane value.' },

    { t: 'PHASE 6 — Set banners using three different delimiter characters',
      do: [
        'You have already used <b>#</b> on SW1 and <b>$</b> on SW3.',
        'On <b>R2</b>, set a banner using <b>%</b> as the delimiter and check the configuration.',
      ],
      done: 'R2 carries a banner delimited with %.',
      why: 'The delimiter is simply the first character you type after the command. Any character that does not appear inside your message works.' },

    { t: 'Remove SW3\'s banner with its "no" form',
      do: [
        'On <b>SW3</b>, set a temporary banner using <b>@</b> as the delimiter, then remove the banner entirely.',
        'Check the configuration afterwards.',
      ],
      done: 'SW3 has no banner line at all.',
      why: 'Set it, then remove it. Every command has both directions, and the banner disappears from the configuration completely.' },

    { t: 'PHASE 7 — Leave and re-enter privileged mode three ways',
      do: [
        'On <b>SW1</b>, use <b>disable</b> to drop to user EXEC, then <b>enable</b> and type the secret <b>Cisco123</b>.',
        'Then use <b>logout</b> and log back in the same way.',
        'Do the disable / enable pair once more on <b>SW2</b>.',
      ],
      done: 'You are back at the privileged prompt on both switches.',
      why: 'Three ways out — exit, disable and logout — and only one way back in: the secret you set. Notice the password is not echoed as you type it.' },

    { t: 'PHASE 8 — Save three different ways, then erase and re-save',
      do: [
        'On <b>SW1</b>, display the running configuration and the startup configuration side by side.',
        'Erase the startup configuration and confirm it is gone.',
        'Save again and confirm the startup configuration is back.',
      ],
      done: 'The startup configuration matches the running configuration again.',
      why: 'running-config is RAM — what the device is doing now. startup-config is NVRAM — what it will do after a reboot. Erasing one does not touch the other.' },

    { t: 'Reload R2 and read what IOS asks before it reboots',
      do: [
        'On <b>R2</b>, make an unsaved change (a new banner will do), then issue a <b>reload</b>.',
        'Read the warning about the modified configuration.',
        'Log back in afterwards with <b>enable</b> and the secret, then display the running configuration.',
      ],
      done: 'You are logged back in after the simulated reload.',
      why: 'IOS warns you that the configuration has been modified before it reboots. In this simulator nothing is actually lost — on real hardware that warning is your last chance.' },

    { t: 'PHASE 9 — Sweep every read-only command on R1',
      do: [
        'On <b>R1</b>, set <b>terminal length 0</b> first, then display the version information.',
        'Then display the clock, the logged-in users, and your own command history.',
        'Finally display both configurations, save, and confirm they now match.',
      ],
      done: 'All six outputs have been read and R1 is saved.',
      why: 'These commands tell you what a device is, what it is doing, and who else is on it. <code>terminal length 0</code> removes the --More-- prompt so long output scrolls in one go.' },

    { t: 'Run the same sweep on a switch and compare',
      do: [
        'On <b>SW3</b>, set terminal length 0 and display the version, the clock, the users and the running configuration.',
        'Compare the version output with R1\'s.',
      ],
      done: 'You can name two differences between the router and switch version output.',
      why: 'Different platform, different image, identical commands. Recognising what a platform is from <code>show version</code> is a real-world first step.' },

    { t: 'PHASE 10 — Bring up the router links and map the network with CDP',
      do: [
        'On <b>R1</b>, select <b>G0/0 through G0/2</b> as a range, describe them as <b>UPLINK</b> and enable them.',
        'On <b>R2</b>, enable <b>G0/0 and G0/1</b>.',
        'Then display CDP neighbours from <b>R1</b> (summary and detail), from <b>R2</b>, and from <b>SW1</b>, and save SW1.',
      ],
      done: 'R1 sees SW1, SW2 and R2; R2 sees R1 and SW3; SW1 sees only R1.',
      why: 'Three viewpoints, one consistent picture — that is how you map a network with no diagram. Remember "Local Intrfce" is your port and "Port ID" is theirs.' },
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
    { d: 'SW3', t: 'Practise removing and re-applying the secret itself.', c: ['configure terminal', 'no enable secret', 'do show running-config', 'enable secret Sw3Secret', 'end'], note: 'With no secret and no password at all, <code>enable</code> lets anyone straight in from the console. Putting it back in the same breath is the point — never leave a device in that state.' },

    /* ---- PHASE 5: line options in depth ---- */
    { d: 'SW1', t: 'Give SW1\'s console a timeout and synchronous logging.', c: ['configure terminal', 'line console 0', 'exec-timeout 5 0', 'logging synchronous', 'exit'], note: '<code>exec-timeout 5 0</code> is five minutes and zero seconds. An idle session is logged out automatically.' },
    { d: 'SW1', t: 'Give the vty lines a longer timeout.', c: ['line vty 0 4', 'exec-timeout 10 0', 'logging synchronous', 'end'], note: 'Remote sessions often get a longer allowance than the console, since reconnecting is more disruptive.' },
    { d: 'R1', t: 'Try the single-argument timeout form, then the dangerous one, then something sane.', c: ['configure terminal', 'line console 0', 'exec-timeout 20', 'exec-timeout 0 0', 'exec-timeout 10 0', 'end'], note: '<code>exec-timeout 20</code> means 20 minutes. <code>0 0</code> means never time out — convenient in a lab, a finding in a security audit.' },
    { d: 'SW2', t: 'Finish SW2\'s lines with timeouts on both.', c: ['configure terminal', 'line console 0', 'exec-timeout 5 0', 'logging synchronous', 'exit', 'line vty 0 4', 'exec-timeout 10 0', 'logging synchronous', 'end', 'write memory'] },
    { d: 'R2', t: 'Create local user accounts — both password forms.', c: ['configure terminal', 'username admin password Adm1nPass', 'username netops secret N3tOpsPass', 'do show running-config'], note: '<code>username … secret</code> stores a hash; <code>username … password</code> stores it readable. Prefer secret, exactly as with enable.' },
    { d: 'R2', t: 'Move the vty lines off the shared password and onto those accounts.', c: ['line vty 0 4', 'no login', 'do show running-config', 'login local', 'end', 'show running-config'], note: '<code>no login</code> leaves the lines open with no check at all — never a final state. <code>login local</code> makes them check the username database instead of one shared password, and is a prerequisite for SSH.' },
    { d: 'R1', t: 'Give R1 a name server, then switch lookups off again.', c: ['configure terminal', 'ip name-server 8.8.8.8', 'ip domain-lookup', 'do show running-config', 'no ip domain-lookup', 'end'], note: 'A name server is only consulted while <code>ip domain-lookup</code> is on. Turning lookups back off is what stops a mistyped command freezing your session for a minute.' },

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
    { desc: 'All five vty lines require authentication (password or local accounts)', fn: H => ['SW1', 'SW2', 'SW3', 'R1', 'R2'].every(n => { const l = H.d(n).lines.vty; return (!!l.password && l.login) || l.loginLocal; }) },
    { desc: 'R2 has local user accounts and its vty lines use them', fn: H => Object.keys(H.d('R2').users).length >= 2 && H.d('R2').lines.vty.loginLocal },
    { desc: 'SW3 still has its enable secret after the removal drill', fn: H => H.d('SW3').enableSecret === 'Sw3Secret' },
    { desc: 'R1 has a name server configured and DNS lookups left off', fn: H => H.d('R1').nameServers.length > 0 && !H.d('R1').domainLookup },
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
  id: 'x2-interfaces', ord: 200, vol: 1, tier: 'deep', day: 'Days 8-9', title: 'Interfaces & Addressing — Full Drill',
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
  spec: [
    { d: 'R1', r: [
      'Hostname <b>R1</b>. <b>G0/0</b> = <b>10.1.1.1/24</b> and <b>G0/2</b> = <b>10.0.12.1/30</b>, both described and up.',
      '<b>G0/1</b> = <b>10.9.9.1/24</b>, enabled (it has no neighbour, so expect down/down).',
      'Three loopbacks with three different masks: a <b>/32</b>, a <b>/24</b> and a <b>/30</b>.',
      'A subinterface <b>G0/1.100</b> tagged for VLAN 100 with an address.',
    ] },
    { d: 'R2', r: [
      'Hostname <b>R2</b>. <b>G0/0</b> = <b>10.0.12.2/30</b> and <b>G0/1</b> = <b>10.2.2.1/24</b>, described and up, plus its own <b>/32</b> loopback.',
      'The two routers must reach each other across the /30.',
    ] },
    { d: 'SW1', r: [
      '<b>F0/1</b> hard-coded to <b>100/full</b> with a description.',
      '<b>F0/2-3</b> returned to <b>auto</b> speed and duplex after being hard-coded.',
      '<b>F0/5</b> ends with <b>no</b> description; <b>F0/7</b> keeps <b>half</b> duplex.',
      '<b>F0/4</b>, <b>F0/6</b> and <b>F0/8</b> shut down.',
      'A management SVI <b>10.1.1.2/24</b> and a default gateway.',
      'Routing enabled, and <b>G0/2</b> as a <b>routed</b> port with <b>172.16.99.1/30</b> restored after converting it back and forth.',
    ] },
    { d: 'SW2', r: [
      '<b>F0/1</b> configured and described; <b>F0/2-4</b> described and shut down.',
      'A management SVI <b>10.2.2.2/24</b> and a default gateway.',
    ] },
    { t: 'Verification', r: [
      'Each PC reaches both its gateway and its local switch SVI. Save R1, SW1 and SW2.',
    ] },
  ],
  tasks: [
    { t: 'PHASE 1 — Configure R1 G0/0 typing the interface name in full',
      do: [
        'On the <b>R1</b> tab, set the hostname to <b>R1</b>.',
        'Enter the interface by typing <b>gigabitethernet 0/0</b> in full.',
        'Describe it <b>LAN-SIDE-TO-SW1</b>, address it <b>10.1.1.1 255.255.255.0</b>, and enable it.',
      ],
      done: 'G0/0 comes up with that address.',
      why: 'Typing the full name once fixes it in your mind. From then on every abbreviation is a shortcut you understand rather than a magic word.' },

    { t: 'Do the same on G0/2 using the abbreviated form',
      do: [
        'Enter interface <b>g0/2</b>, describe it <b>WAN-LINK-TO-R2</b>, address it <b>10.0.12.1 255.255.255.252</b>, and enable it.',
        'Then display the brief interface summary and note that G0/1 is still down.',
      ],
      done: 'Two interfaces are up and one is still administratively down.',
      why: 'Identical command, a fraction of the keystrokes. IOS accepts any abbreviation that is unambiguous, which is why <code>int g0/2</code> works but <code>int g</code> does not.' },

    { t: 'PHASE 2 — Repeat the whole pattern on both of R2\'s interfaces',
      do: [
        'On <b>R2</b>: hostname <b>R2</b>, then <b>G0/0</b> described <b>WAN-LINK-TO-R1</b> with <b>10.0.12.2 255.255.255.252</b>, enabled.',
        'Then <b>G0/1</b> described <b>LAN-SIDE-TO-SW2</b> with <b>10.2.2.1 255.255.255.0</b>, enabled.',
        'Ping <b>10.0.12.1</b> to test the link immediately.',
      ],
      done: 'R2 reaches R1 across the /30.',
      why: 'That is the third and fourth repetition of the most-typed sequence in CCNA: interface, description, address, enable. Test each layer as you build it.' },

    { t: 'PHASE 3 — Create three loopbacks with three different mask lengths',
      do: [
        'On <b>R1</b>, create <b>Loopback 0</b> = <b>1.1.1.1/32</b>, <b>Loopback 1</b> = <b>172.16.1.1/24</b>, and <b>Loopback 2</b> = <b>192.168.100.1/30</b>.',
        'Display the interface summary and note that none of them needed enabling.',
      ],
      done: 'All three loopbacks read up/up.',
      why: 'Loopbacks are virtual and always up. A /32 is the convention for a router identity address, and different mask lengths on one device make the prefix arithmetic concrete.' },

    { t: 'Add a loopback on R2 as well',
      do: [
        'On <b>R2</b>, create <b>Loopback 0</b> with <b>2.2.2.2/32</b> and check the interface summary.',
      ],
      done: 'R2 has a loopback that is immediately up.',
      why: 'Same behaviour on a different device: virtual interfaces come up on their own, with no cable and no no-shutdown.' },

    { t: 'PHASE 4 — Produce all three interface states on purpose',
      do: [
        'On <b>R1</b>, give <b>G0/1</b> the address <b>10.9.9.1 255.255.255.0</b> but leave it shut, and read the status.',
        'Enable it and read the status again — nothing is plugged in, so watch the wording change.',
        'Compare both with G0/0, which has a live neighbour.',
        'Finally shut and re-enable <b>G0/0</b> to watch the log messages.',
      ],
      done: 'You have seen administratively down, down/down and up/up.',
      why: 'Those three wordings are the heart of interface troubleshooting. Producing each on purpose beats meeting it cold in a fault at 2am.' },

    { t: 'Strip an address off entirely and put it back',
      do: [
        'On <b>R1</b> interface <b>G0/1</b>, remove the IP address with the "no" form and check the summary — it reads "unassigned".',
        'Then set <b>10.9.9.1 255.255.255.0</b> again.',
      ],
      done: 'The interface holds its address again.',
      why: 'Typing a new address simply replaces the old one, so the "no" form is only needed when you want the interface to carry no address at all.' },

    { t: 'PHASE 5 — Select switch ports three different ways',
      do: [
        'On <b>SW1</b>, set the hostname, then configure <b>F0/1</b> alone: description <b>PC1-DESK-PORT</b>, speed <b>100</b>, duplex <b>full</b>.',
        'Then select <b>F0/2 - 3</b> as a contiguous range: description <b>SPARE-DESK-PORT</b>, speed 100, duplex full.',
        'Then select <b>F0/5, F0/7</b> as a comma list: description <b>LAB-PORT</b>, duplex <b>half</b>.',
      ],
      done: 'Five ports are configured using three different selection forms.',
      why: 'Ranges accept hyphens, commas and combinations. On a 48-port switch this is the difference between one command and forty-eight.' },

    { t: 'Return a pair of ports to automatic negotiation',
      do: [
        'Select <b>F0/2 - 3</b> again and set speed and duplex back to <b>auto</b>.',
        'Display the interface status and compare the prefixes.',
      ],
      done: 'Those ports show auto-negotiated values.',
      why: 'Manually set values print plain; negotiated values carry an "a-" prefix. That difference is how you spot a hard-coded end during a duplex investigation.' },

    { t: 'Remove one description with the "no" form',
      do: [
        'On <b>F0/5</b>, remove the description and check the Name column in the status output.',
      ],
      done: 'The Name column for Fa0/5 is blank.',
      why: 'Every command has a "no" form, and knowing what a setting\'s absence looks like is half of troubleshooting.' },

    { t: 'Disable every unused port in one command',
      do: [
        'Select <b>F0/4, F0/6, F0/8</b> as a comma list and disable them.',
        'Check the status output.',
      ],
      done: 'Those three ports read "disabled".',
      why: 'Unused live jacks are the easiest way into a network. Disabling them is baseline hardening, before port security is even considered.' },

    { t: 'PHASE 6 — Repeat the port pattern on SW2',
      do: [
        'On <b>SW2</b>: hostname, then <b>F0/1</b> described <b>PC2-DESK-PORT</b> at speed 100 and duplex full.',
        'Then <b>F0/2 - 4</b> as a range: description <b>UNUSED</b>, and disabled.',
      ],
      done: 'SW2 has one configured host port and three disabled spares.',
      why: 'Describing a port as UNUSED and disabling it in the same breath is a tidy habit that documents intent.' },

    { t: 'PHASE 7 — Give both switches a management SVI and a default gateway',
      do: [
        'On <b>SW1</b>: create <b>interface Vlan 1</b> with <b>10.1.1.2 255.255.255.0</b>, enable it, and set the default gateway to <b>10.1.1.1</b>.',
        'On <b>SW2</b>: <b>Vlan 1</b> with <b>10.2.2.2 255.255.255.0</b>, enabled, gateway <b>10.2.2.1</b>.',
      ],
      done: 'Both switches have a management address and a gateway.',
      why: 'A layer-2 switch cannot hold an IP on a physical port, so the SVI is its layer-3 presence. The gateway is what lets it answer traffic from other subnets.' },

    { t: 'PHASE 8 — Turn SW1 into a router and convert a port to routed',
      do: [
        'On <b>SW1</b>, enable <b>ip routing</b>.',
        'Then convert <b>G0/2</b> with <b>no switchport</b>, address it <b>172.16.99.1 255.255.255.252</b> and enable it.',
        'Check the Vlan column of the interface status output for that port.',
      ],
      done: 'G0/2 reads "routed" instead of a VLAN number.',
      why: 'A multilayer switch can drop layer-2 behaviour on a port entirely, making it behave exactly like a router interface. A plain 2960 would reject the command.' },

    { t: 'Drill both "no" forms: routing off and on, address off and on',
      do: [
        'On <b>SW1</b>, disable <b>ip routing</b>, look at the configuration, then enable it again.',
      ],
      done: 'ip routing is enabled at the end.',
      why: 'With routing off the switch keeps every address and forwards nothing between subnets. One global command is the whole difference between a layer-2 and a layer-3 switch.' },

    { t: 'Convert the routed port back to a switchport and watch the address vanish',
      do: [
        'On <b>SW1</b>, put <b>G0/2</b> back with the <b>switchport</b> command and look at the running configuration.',
        'Then convert it to routed again and restore <b>172.16.99.1 255.255.255.252</b>.',
      ],
      done: 'G0/2 finishes as a routed port with its address.',
      why: 'The IP address is discarded when the port becomes a switchport, because a switchport cannot hold one. IOS drops the setting rather than keeping something that cannot apply.' },

    { t: 'PHASE 9 — Create a tagged subinterface on R1',
      do: [
        'On <b>R1</b>, create <b>G0/1.100</b>, tag it for VLAN <b>100</b> with dot1Q encapsulation, then address it <b>10.100.0.1 255.255.255.0</b>.',
        'Check the interface summary.',
      ],
      done: 'The subinterface appears and inherits the physical port\'s up state.',
      why: 'The encapsulation line must come before the address, because the tag is what defines the subinterface. Here you meet the syntax; the VLAN drill puts it to work.' },

    { t: 'PHASE 10 — Sweep the three levels of interface detail on a router',
      do: [
        'On <b>R1</b>: <b>show ip interface brief</b> (one line per interface), then <b>show interfaces g0/0</b> (full layer 1 and 2 detail), then <b>show ip interface g0/0</b> (layer 3 detail).',
        'Finish with the running configuration and save.',
      ],
      done: 'You have read all three views of the same interface.',
      why: 'Three levels: summary, physical detail with counters, and the layer-3 view showing filters, helpers and NAT roles. Knowing which one answers your question saves real time.' },

    { t: 'Sweep the switch-specific views too',
      do: [
        'On <b>SW1</b>: display the interface status, then the full switchport detail, then save.',
        'On <b>SW2</b>: display the status and the brief summary, then save.',
      ],
      done: 'Both switches are saved.',
      why: 'The status view is the fastest switch overview there is; the switchport view adds administrative versus operational mode, access VLAN, native VLAN and voice VLAN per port.' },

    { t: 'PHASE 11 — Prove connectivity from both ends',
      do: [
        'On the <b>PC1</b> tab: <code>ipconfig</code>, then ping <b>10.1.1.1</b> (the router) and <b>10.1.1.2</b> (the switch SVI).',
        'On <b>R1</b>: ping <b>10.0.12.2</b>, then try <b>2.2.2.2</b> — the second one fails.',
        'On the <b>PC2</b> tab: <code>ipconfig</code>, then ping <b>10.2.2.1</b> and <b>10.2.2.2</b>.',
      ],
      done: 'Every local ping works and the remote loopback does not.',
      why: 'Two different devices answer on the same subnet — the router interface and the switch SVI. The loopback fails because R1 has no route to it, which is exactly what the static routing drill fixes.' },
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
    { d: 'R1', t: 'Strip an address off entirely, then put it straight back.', c: ['interface g0/1', 'no ip address', 'do show ip interface brief', 'ip address 10.9.9.1 255.255.255.0', 'do show ip interface brief', 'exit'], note: 'G0/1 briefly reads "unassigned". A new address simply replaces the old one, so the "no" form is only needed when you want the interface to carry none at all.' },

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
    { d: 'SW1', t: 'Prove that one global command is what makes it a router.', c: ['no ip routing', 'do show running-config', 'ip routing', 'do show running-config'], note: 'With routing off the switch keeps every address it has and still forwards nothing between subnets. IPv4 routing is on by default on a router and off by default on a switch.' },
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
  id: 'x3-vlans', ord: 300, vol: 1, tier: 'deep', day: 'Days 16-19', title: 'VLANs, Trunking & Inter-VLAN — Full Drill',
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
  spec: [
    { d: 'SW1, SW2 and SW3', r: [
      'VLANs <b>10 ENGINEERING</b>, <b>20 SALES</b> and <b>30 GUEST</b> on all three switches.',
      'All three in VTP mode <b>transparent</b>, domain <b>NETDRILL</b>.',
      'On <b>SW1</b> only: create a temporary VLAN <b>99</b> and then delete it again.',
    ] },
    { d: 'Access ports', r: [
      'SW1: <b>F0/1</b> VLAN 10 with voice VLAN <b>150</b>, <b>F0/2</b> VLAN 20, <b>F0/3</b> VLAN 30.',
      'SW1 <b>F0/4</b>: unused — parked in VLAN 30 and shut down.',
      'SW2: <b>F0/1</b> VLAN 10, <b>F0/2</b> VLAN 20. SW3: <b>F0/1</b> VLAN 30.',
    ] },
    { d: 'Trunks — five ends in total', r: [
      'Every trunk end is a <b>fixed</b> trunk with DTP disabled.',
      'The four switch-to-switch ends use native VLAN <b>1001</b>.',
      'SW1–SW2 carries exactly <b>10,20,30</b>. SW2–SW3 is pruned to <b>30</b> only, on both ends.',
      'SW1\'s uplink to R1 carries all three data VLANs.',
    ] },
    { d: 'R1 — router on a stick', r: [
      'Three tagged subinterfaces acting as the gateways: <b>10.0.10.1</b>, <b>10.0.20.1</b> and <b>10.0.30.1</b>, each /24.',
    ] },
    { t: 'Verification', r: [
      'Same-VLAN traffic works across one trunk and across two.',
      'Cross-VLAN traffic works in several directions through R1.',
    ] },
  ],
  tasks: [
    { t: 'PHASE 1 — Build SW1\'s VLAN database, including one you will delete again',
      do: [
        'On <b>SW1</b>, set the hostname and look at the VLAN database before you touch it.',
        'Create VLAN <b>10</b> named <b>ENGINEERING</b>, VLAN <b>20</b> named <b>SALES</b>, VLAN <b>30</b> named <b>GUEST</b>.',
        'Then create VLAN <b>99</b> named <b>TEMPORARY</b>, look at the table, and delete it again.',
      ],
      done: 'Three VLANs remain and VLAN 99 is gone.',
      why: 'A VLAN must exist in the database before a port can meaningfully join it. Creating and deleting in one sitting makes both commands familiar — and note that deleting a VLAN leaves any ports in it stranded.' },

    { t: 'PHASE 2 — Build the identical database on SW2 and SW3',
      do: [
        'On <b>SW2</b>: hostname, then VLANs <b>10</b>, <b>20</b> and <b>30</b> with the same names.',
        'On <b>SW3</b>: exactly the same again.',
      ],
      done: 'All three switches list the same three VLANs.',
      why: 'VLANs are per switch. A tagged frame arriving for a VLAN the receiving switch has not created is silently dropped, so every switch on the path needs the same database.' },

    { t: 'PHASE 3 — Assign SW1\'s access ports, one per VLAN, plus a voice VLAN',
      do: [
        'On <b>SW1</b>: <b>F0/1</b> described <b>PC1-ENGINEERING</b>, access mode, VLAN <b>10</b>, plus a <b>voice VLAN of 150</b>.',
        '<b>F0/2</b> described <b>PC2-SALES</b>, access VLAN <b>20</b>.',
        '<b>F0/3</b> described <b>PC3-GUEST</b>, access VLAN <b>30</b>.',
        '<b>F0/4</b> described <b>UNUSED</b>, access VLAN <b>30</b>, and disabled.',
      ],
      done: 'The VLAN table shows each port under the right VLAN.',
      why: 'An access port carries exactly one data VLAN untagged. A voice VLAN adds a second, tagged VLAN for a phone sharing the same cable — and note VLAN 150 is auto-created.' },

    { t: 'Assign the access ports on SW2 and SW3',
      do: [
        'On <b>SW2</b>: <b>F0/1</b> = <b>PC4-ENGINEERING</b> in VLAN <b>10</b>; <b>F0/2</b> = <b>PC5-SALES</b> in VLAN <b>20</b>.',
        'On <b>SW3</b>: <b>F0/1</b> = <b>PC6-GUEST</b> in VLAN <b>30</b>.',
      ],
      done: 'Six access ports are configured across three switches.',
      why: 'The mode-then-vlan pattern should be automatic by now. Repetition across devices is what turns recall into reflex.' },

    { t: 'PHASE 4 — Watch DTP negotiate a trunk by itself, in two stages',
      do: [
        'On <b>SW1</b>, set <b>G0/1</b> to <b>dynamic auto</b> and display the trunk status — nothing forms.',
        'Now set it to <b>dynamic desirable</b> and display the trunk status again — a trunk appears.',
      ],
      done: 'A trunk forms without anybody typing "mode trunk".',
      why: 'Auto+auto means neither side asks, so no trunk forms. Desirable+auto means one side asks and the other agrees. Convenient — and exactly what an attacker exploits.' },

    { t: 'PHASE 5 — Configure all four trunk ends as fixed, hardened trunks',
      do: [
        'On <b>SW1 G0/1</b>: set dot1q encapsulation, <b>mode trunk</b>, <b>nonegotiate</b>, native VLAN <b>1001</b>.',
        'On <b>SW2 G0/1</b>, <b>SW2 G0/2</b> and <b>SW3 G0/1</b>: the same three settings.',
      ],
      done: 'Four trunk ends carry identical settings.',
      why: 'Both ends must always match, and a nonegotiate trunk facing a dynamic-auto port never forms at all. Native VLAN 1001 is unused here, so nothing real travels untagged.' },

    { t: 'Drill the "no" forms of the two hardening commands',
      do: [
        'On <b>SW1 G0/1</b>, remove <b>nonegotiate</b> and remove the native VLAN setting, then look at the trunk status.',
        'Put both straight back.',
      ],
      done: 'The trunk ends with nonegotiate and native VLAN 1001 restored.',
      why: 'Removing them returns the defaults: DTP back on and native VLAN 1 — precisely the two conditions a VLAN-hopping attack needs. Always finish with them in place.' },

    { t: 'PHASE 6 — Work through every allowed-list form on one trunk',
      do: [
        'On <b>SW1 G0/1</b>, in order: set the list to <b>10,20,30</b>; <b>add 40</b>; <b>remove 40</b>; set it to <b>none</b>; set it to <b>all</b>; use the <b>no</b> form; then set <b>10,20,30</b> again.',
        'Check the trunk status after each one.',
      ],
      done: 'The trunk finishes allowing exactly 10, 20 and 30.',
      why: 'Six forms on one interface. The bare form REPLACES the whole list — on a live trunk that severs every VLAN you left out — while add and remove are the safe editing forms.' },

    { t: 'Prune the remaining trunks to only what each needs',
      do: [
        'On <b>SW2 G0/1</b>: allow <b>10,20,30</b>. On <b>SW2 G0/2</b>: allow only <b>30</b>.',
        'On <b>SW3 G0/1</b>: allow only <b>30</b> to match.',
      ],
      done: 'The SW2–SW3 link carries VLAN 30 only.',
      why: 'Only Guest users live beyond SW3, so nothing else should cross that link. Allowed lists must match on both ends, or you create a silent one-way black hole.' },

    { t: 'PHASE 7 — Opt all three switches out of VTP',
      do: [
        'On each of <b>SW1</b>, <b>SW2</b> and <b>SW3</b>: set VTP mode to <b>transparent</b> and the domain to <b>NETDRILL</b>, then check the VTP status.',
      ],
      done: 'All three report transparent mode in domain NETDRILL.',
      why: 'Transparent means "never sync my VLAN database with anybody". It is the protection against a switch with a higher revision number wiping every VLAN in the domain.' },

    { t: 'PHASE 8 — Trunk SW1 to the router and build the ROAS gateways',
      do: [
        'On <b>SW1 G0/2</b>: describe it <b>TRUNK-TO-R1</b>, mode trunk, nonegotiate, allowed VLANs <b>10,20,30</b>.',
        'On <b>R1</b>: set the hostname, then enable <b>G0/0</b> with <b>no address at all</b>.',
      ],
      done: 'The uplink is a trunk and R1\'s physical port is up but unaddressed.',
      why: 'That trunk is the "stick". The physical router port only carries tagged frames — every address lives on a subinterface.' },

    { t: 'Create a subinterface per VLAN, including one for the native VLAN',
      do: [
        'On <b>R1</b>: <b>G0/0.10</b> tagged VLAN 10, address <b>10.0.10.1/24</b>.',
        '<b>G0/0.20</b> tagged VLAN 20, address <b>10.0.20.1/24</b>.',
        '<b>G0/0.1001</b> tagged VLAN 1001 with the <b>native</b> keyword, address <b>10.0.99.1/24</b>.',
        '<b>G0/0.30</b> tagged VLAN 30, address <b>10.0.30.1/24</b>.',
      ],
      done: 'Four subinterfaces appear in the interface summary.',
      why: 'The <b>native</b> keyword tells the router those frames arrive UNTAGGED. Leave it off and every frame in the native VLAN is silently dropped — a fault that is very hard to spot.' },

    { t: 'PHASE 9 — Sweep the verification commands on every switch',
      do: [
        'On <b>SW1</b>: VLAN table, trunk status, and the full switchport detail.',
        'On <b>SW2</b> and <b>SW3</b>: the VLAN table and trunk status.',
      ],
      done: 'You can state each trunk\'s native VLAN and allowed list from memory.',
      why: 'Note SW2 has two trunks with different allowed lists — one switch, two different policies. Reading trunk output fluently is a guaranteed exam skill.' },

    { t: 'PHASE 10 — Test same-VLAN connectivity across the switches',
      do: [
        'From <b>PC1</b> ping <b>10.0.10.12</b>; from <b>PC2</b> ping <b>10.0.20.12</b>; from <b>PC3</b> ping <b>10.0.30.12</b>.',
      ],
      done: 'All three same-VLAN pings succeed.',
      why: 'PC1 to PC4 crosses one trunk; PC3 to PC6 crosses two. If the tagging is right, distance stops mattering.' },

    { t: 'Test cross-VLAN connectivity through the router',
      do: [
        'From <b>PC1</b>: ping its gateway <b>10.0.10.1</b>, then <b>10.0.20.11</b> and <b>10.0.30.11</b>.',
        'From <b>PC5</b>: ping <b>10.0.20.1</b>, then <b>10.0.10.11</b> and <b>10.0.30.12</b>.',
      ],
      done: 'Hosts in different VLANs can reach each other through R1.',
      why: 'Every one of those packets goes up the trunk tagged with one VLAN and comes back down tagged with another — in and out of a single physical router port.' },

    { t: 'Finally, prune VLAN 30 off the router trunk and watch Guest break',
      do: [
        'On <b>SW1 G0/2</b>, remove VLAN <b>30</b> from the allowed list and check the trunk status.',
        'From <b>PC3</b>, ping <b>10.0.30.12</b> (still works) and <b>10.0.30.1</b> (now fails).',
        'Put VLAN 30 back with the <b>add</b> form, verify, save, then re-test from PC3.',
      ],
      done: 'Guest loses only its gateway, then gets it back.',
      why: 'Same-VLAN traffic between switches is unaffected, because that path does not use the router trunk. Only the gateway disappears — a beautifully precise symptom to recognise.' },
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
    { d: 'SW1', t: 'First set this end passive and watch nothing happen at all.', c: ['interface g0/1', 'switchport mode dynamic auto', 'do show interfaces trunk'], note: 'Auto means "I will trunk if you ask, but I will never ask". SW2 is also on auto, so neither side speaks first and no trunk forms — the output is empty.' },
    { d: 'SW1', t: 'Now let DTP form a trunk by itself before you take control.', c: ['switchport mode dynamic desirable', 'do show interfaces trunk'], note: 'SW2 is still at its default (dynamic auto), which accepts the invitation. desirable + auto = trunk, with nobody typing "mode trunk". Convenient, and exploitable.' },

    /* ---- PHASE 5: four trunk ends ---- */
    { d: 'SW1', t: 'Trunk end 1 — fixed trunk, DTP off, safe native VLAN.', c: ['switchport trunk encapsulation dot1q', 'switchport mode trunk', 'switchport nonegotiate', 'switchport trunk native vlan 1001', 'exit'], note: 'Three lines that should become one reflex. Native VLAN 1001 is unused, so nothing real travels untagged.' },
    { d: 'SW2', t: 'Trunk end 2 — the matching side of that link.', c: ['interface g0/1', 'switchport mode trunk', 'switchport nonegotiate', 'switchport trunk native vlan 1001', 'exit'], note: 'Both ends must match. A nonegotiate trunk facing a port left on "dynamic auto" never forms, because neither side will ask.' },
    { d: 'SW2', t: 'Trunk end 3 — the link onward to SW3.', c: ['interface g0/2', 'switchport mode trunk', 'switchport nonegotiate', 'switchport trunk native vlan 1001', 'exit'] },
    { d: 'SW3', t: 'Trunk end 4 — the far side of that link.', c: ['interface g0/1', 'switchport mode trunk', 'switchport nonegotiate', 'switchport trunk native vlan 1001', 'exit', 'do show interfaces trunk'], note: 'Four trunk ends configured identically. Repetition is the point.' },
    { d: 'SW1', t: 'Drill the "no" forms of the two hardening commands, then put them back.', c: ['interface g0/1', 'no switchport nonegotiate', 'no switchport trunk native vlan', 'do show interfaces trunk', 'switchport nonegotiate', 'switchport trunk native vlan 1001', 'exit', 'do show interfaces trunk'], note: 'Removing them restores the defaults: DTP back on and the native VLAN back to 1 — precisely the two conditions a VLAN-hopping attack needs. Always finish with them back in place.' },

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
    { d: 'R1', t: 'Subinterface 4 — the native VLAN, which is the odd one out.', c: ['interface g0/0.1001', 'encapsulation dot1q 1001 native', 'ip address 10.0.99.1 255.255.255.0', 'exit'], note: 'The <code>native</code> keyword tells the router this VLAN arrives UNTAGGED. Leave it off and every frame in the native VLAN is silently dropped — a fault that is very hard to spot.' },
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
  id: 'x4-stp-etherchannel', ord: 400, vol: 1, tier: 'deep', day: 'Days 20-22', title: 'STP & EtherChannel — Full Drill',
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
  spec: [
    { d: 'All four switches', r: [
      'Named <b>SW1</b>-<b>SW4</b>, all running <b>Rapid PVST+</b>, all with VLANs <b>10 USERS</b> and <b>20 SERVERS</b>.',
    ] },
    { d: 'Spanning-tree roles', r: [
      '<b>SW1</b>: root for VLAN <b>10</b> (priority <b>4096</b>) and secondary root for VLAN <b>20</b>.',
      '<b>SW2</b>: root for VLAN <b>20</b> and secondary root for VLAN <b>10</b>.',
      '<b>SW1 F0/1</b>: portfast and BPDU guard, per interface.',
      '<b>SW4</b>: portfast and BPDU guard enabled <b>globally</b> instead.',
      'Host ports on SW1 and SW4 in access VLAN 10; the spare port on each edge switch shut down.',
    ] },
    { d: 'Three EtherChannels, three different protocols', r: [
      'SW1 ↔ SW2 (<b>channel-group 1</b>): LACP — one side active, the other passive.',
      'SW2 ↔ SW3 (<b>channel-group 2</b>): PAgP — one side desirable, the other auto.',
      'SW3 ↔ SW4 (<b>channel-group 3</b>): static <b>ON</b> at both ends.',
      'Every member port must be trunked and allowed VLANs 10,20 <b>before</b> bundling, and all six Port-channel interfaces configured as trunks allowing 10,20.',
    ] },
    { t: 'Verification', r: [
      'All three bundles actually form, <b>PC1</b> reaches <b>PC2</b> (10.0.10.12), and all four switches are saved.',
    ] },
  ],
  tasks: [
    { t: 'PHASE 1 — Read spanning tree on all four switches before touching anything',
      do: [
        'On each of <b>SW1</b>, <b>SW2</b>, <b>SW3</b> and <b>SW4</b>, enter privileged EXEC and display the spanning-tree status.',
        'Work out which switch won the root election, and why.',
      ],
      done: 'All four switches agree on the same root bridge.',
      why: 'With every priority equal at 32768, the lowest MAC address wins — which means the oldest switch in the building usually becomes root by accident.' },

    { t: 'PHASE 2 — Create VLANs 10 and 20 on all four switches',
      do: [
        'On each switch: set its hostname, then create VLAN <b>10</b> named <b>USERS</b> and VLAN <b>20</b> named <b>SERVERS</b>.',
      ],
      done: 'All four switches carry both VLANs.',
      why: 'Spanning tree here is per VLAN, so both VLANs must exist everywhere before you can give them different roots.' },

    { t: 'PHASE 3 — Put all four switches into Rapid PVST+',
      do: [
        'On each of the four switches, set the spanning-tree mode to <b>rapid-pvst</b>.',
        'Then on <b>SW4</b> only, step back to <b>pvst</b>, look at the output, and return to <b>rapid-pvst</b>.',
      ],
      done: 'All four switches end on rapid-pvst.',
      why: 'Classic PVST+ is 802.1D with 30-50 second convergence; Rapid PVST+ is 802.1w and converges in about a second. One switch left on the old mode drags its links back to the slow timers.' },

    { t: 'PHASE 4 — Try an illegal bridge priority and read the error',
      do: [
        'On <b>SW1</b>, try to set the VLAN 10 priority to <b>5000</b> and read what IOS says.',
        'Then set it to <b>4096</b>, which is legal, and check the spanning-tree output.',
      ],
      done: 'SW1 is the root for VLAN 10 with priority 4096.',
      why: 'Priority must be a multiple of 4096, because the low 12 bits of the bridge ID hold the VLAN number. Meeting that error deliberately explains the rule better than memorising it.' },

    { t: 'Give the two VLANs different root bridges',
      do: [
        'On <b>SW1</b>, make it the <b>secondary</b> root for VLAN <b>20</b>.',
        'On <b>SW2</b>, use the <b>root primary</b> macro for VLAN <b>20</b>, then make it <b>secondary</b> for VLAN <b>10</b>.',
        'Check the spanning-tree output on SW2 and on SW3.',
      ],
      done: 'SW1 is root for VLAN 10, SW2 is root for VLAN 20, and each backs up the other.',
      why: 'Per-VLAN spanning tree lets you load-share: different VLANs take different paths through the same physical topology instead of one link sitting idle.' },

    { t: 'PHASE 5 — Protect SW1\'s host port, then drill both "no" forms',
      do: [
        'On <b>SW1 F0/1</b>: describe it <b>PC1</b>, access mode VLAN <b>10</b>, then enable <b>portfast</b> and <b>BPDU guard</b>.',
        'Now disable portfast and disable BPDU guard, then enable both again.',
        'Also park <b>F0/2</b>: described <b>UNUSED</b>, access VLAN 20, disabled.',
      ],
      done: 'F0/1 ends with both protections enabled and F0/2 is shut.',
      why: 'An edge port forwards immediately so a PC gets DHCP at once; BPDU guard err-disables it if a switch ever appears there. They are always deployed as a pair.' },

    { t: 'Apply the same protections globally on SW4',
      do: [
        'On <b>SW4</b>, enable <b>portfast default</b> and <b>portfast bpduguard default</b> in global configuration mode.',
        'Then configure <b>F0/1</b> as <b>PC2</b> in VLAN 10, and park <b>F0/2</b> as UNUSED and disabled.',
      ],
      done: 'SW4 carries both global defaults.',
      why: 'The "default" forms cover every access port at once — how it is really done on a 48-port switch rather than interface by interface.' },

    { t: 'PHASE 6 — Trunk SW1 and SW2\'s link pair BEFORE bundling them',
      do: [
        'On <b>SW1</b>, select <b>G0/1 - 2</b>, set trunk mode and allow VLANs <b>10,20</b>.',
        'Then put the same range into <b>channel-group 1 mode active</b>.',
      ],
      done: 'Both ports are trunks and members of channel-group 1.',
      why: 'Every member of a bundle must have identical settings, so configuring them before bundling avoids a mismatch that keeps the channel from forming.' },

    { t: 'Complete the LACP bundle from the other side',
      do: [
        'On <b>SW2</b>, select <b>G0/1 - 2</b>, set trunk mode, allow VLANs 10,20, and put them into <b>channel-group 1 mode passive</b>.',
      ],
      done: 'Both ends of the first bundle are configured.',
      why: 'LACP active initiates and passive only responds. Active+passive forms a bundle; passive+passive never does — one of the most reliably tested facts in the topic.' },

    { t: 'PHASE 7 — Bundle SW2 to SW3 with PAgP instead',
      do: [
        'On <b>SW2</b>, select <b>G0/3 - 4</b>, trunk them, allow VLANs 10,20, and use <b>channel-group 2 mode desirable</b>.',
        'On <b>SW3</b>, select <b>G0/1 - 2</b>, trunk them, allow 10,20, and use <b>channel-group 2 mode auto</b>.',
      ],
      done: 'A second bundle forms between SW2 and SW3.',
      why: 'PAgP is Cisco\'s own protocol with the same logic: desirable initiates, auto only responds, and auto+auto forms nothing.' },

    { t: 'PHASE 8 — Bundle SW3 to SW4 with static ON mode',
      do: [
        'On <b>SW3</b>, select <b>G0/3 - 4</b>, trunk them, allow 10,20, and use <b>channel-group 3 mode on</b>.',
        'On <b>SW4</b>, select <b>G0/1 - 2</b> and do exactly the same.',
      ],
      done: 'A third bundle exists, negotiated by nothing at all.',
      why: 'ON forces the bundle with no protocol, so both sides must be ON. A mismatch here creates a loop rather than a failed negotiation — which is why ON is the least forgiving option.' },

    { t: 'PHASE 9 — Configure all three Port-channel interfaces as trunks',
      do: [
        'On <b>SW1</b>: <b>Port-channel 1</b> as a trunk allowing 10,20.',
        'On <b>SW2</b>: <b>Port-channel 1</b> and <b>Port-channel 2</b> the same.',
        'On <b>SW3</b>: <b>Port-channel 2</b> and <b>Port-channel 3</b>.',
        'On <b>SW4</b>: <b>Port-channel 3</b>.',
      ],
      done: 'Every bundle is a trunk carrying both VLANs.',
      why: 'Configure the logical interface and the settings push down to the members, which is what keeps them identical. Configuring members individually is how bundles break.' },

    { t: 'PHASE 10 — Read the EtherChannel summary on every switch and decode the flags',
      do: [
        'Display the EtherChannel summary on all four switches.',
        'For each bundle read the flags: <b>SU</b> on the Port-channel and <b>(P)</b> on each member.',
      ],
      done: 'Three bundles report SU with all members (P).',
      why: 'S is layer 2, U is in use, P is bundled. An <b>(I)</b> means standalone — the modes did not match and that port is not in the channel at all.' },

    { t: 'Break one bundle with the "no" form, then rebuild it',
      do: [
        'On <b>SW4</b>, select <b>G0/1 - 2</b> and remove them from the channel group, then look at the summary.',
        'Put them back into <b>channel-group 3 mode on</b> and check again.',
      ],
      done: 'The third bundle is formed again.',
      why: 'Watching a bundle collapse and re-form shows you exactly what a half-configured channel looks like — which is what you will meet in a fault.' },

    { t: 'PHASE 11 — Check spanning tree again and prove end-to-end connectivity',
      do: [
        'Display the spanning-tree status on <b>SW1</b> and <b>SW2</b> and note how few ports are blocking now.',
        'From the <b>PC1</b> tab, ping <b>10.0.10.12</b> (PC2, three bundles away).',
        'Save all four switches.',
      ],
      done: 'The ping succeeds and all four switches are saved.',
      why: 'Spanning tree now sees three logical links instead of six physical ones, so far less is blocked and every cable you paid for carries traffic.' },
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
    { d: 'SW4', t: 'Step back to classic PVST+ for a moment, then return to Rapid.', c: ['spanning-tree mode pvst', 'do show spanning-tree', 'spanning-tree mode rapid-pvst', 'do show spanning-tree'], note: 'Classic PVST+ is 802.1D with its 30-second convergence; Rapid PVST+ is 802.1w and converges in a second or two. Both run one instance per VLAN, and one switch left on the old mode drags its links back to the slow timers.' },

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
  id: 'x5-static-ipv6', ord: 500, vol: 1, tier: 'deep', day: 'Days 11, 30-32', title: 'Static Routing & IPv6 — Full Drill',
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
  spec: [
    { d: 'All four routers', r: [
      'A <b>/32</b> loopback identity each: <b>1.1.1.1</b>, <b>2.2.2.2</b>, <b>3.3.3.3</b>, <b>4.4.4.4</b>.',
    ] },
    { d: 'IPv4 static routing — a different technique per router', r: [
      '<b>R1</b>: five <b>next-hop</b> statics — the two remote LANs plus all three remote loopbacks.',
      '<b>R2</b> (the hub): six statics pointing at three different next hops.',
      '<b>R3</b>: a single <b>default route</b> instead of individual routes.',
      '<b>R4</b>: one <b>summary</b> route, <b>10.0.0.0/16</b>, replacing the two specific routes it started with.',
      '<b>R1</b> also needs a <b>floating</b> backup to <b>10.0.3.0/24</b> over the direct R1–R3 link, distance <b>200</b>, which must NOT be installed while the primary path is up.',
    ] },
    { d: 'IPv6 — R1, R2 and R3', r: [
      'IPv6 forwarding enabled on all three.',
      'The R1–R2 link addressed <b>2001:db8:12::1/64</b> and <b>::2/64</b>, with link-locals pinned to <b>FE80::1</b> and <b>FE80::2</b>.',
      'R1\'s LAN addressed manually as <b>2001:db8:1::1/64</b>; R1 <b>G0/2</b> gets a link-local only, no global address.',
      'R3\'s LAN uses prefix <b>2001:db8:3::/64</b> with the host half derived from the MAC.',
      'Static IPv6 routes on R1 and R2, and an IPv6 <b>default route</b> on R3.',
    ] },
    { t: 'Verification', r: [
      'All three PC networks reach each other, R1 reaches every loopback, and all four routers are saved.',
    ] },
  ],
  tasks: [
    { t: 'PHASE 1 — Give all four routers a loopback identity',
      do: [
        'On <b>R1</b> create <b>Loopback 0</b> = <b>1.1.1.1 255.255.255.255</b>.',
        'On <b>R2</b>: <b>2.2.2.2/32</b>. On <b>R3</b>: <b>3.3.3.3/32</b>. On <b>R4</b>: <b>4.4.4.4/32</b>.',
      ],
      done: 'Each router has a /32 loopback that is immediately up.',
      why: 'A /32 loopback is the standard identity address: it never goes down, so it is what routing protocols and management tools point at. It also gives you four easy targets to route to.' },

    { t: 'PHASE 2 — Read R1\'s routing table before adding anything',
      do: [
        'On <b>R1</b>, set <b>terminal length 0</b> and display the routing table.',
        'Identify every <b>C</b> (connected) and <b>L</b> (local /32) entry.',
        'Then ping <b>10.0.12.2</b> (works — connected) and <b>10.0.3.1</b> (fails — no route).',
      ],
      done: 'You can explain why the first ping works and the second does not.',
      why: 'A router knows only the networks it touches. C is the subnet, L is the router\'s own address inside it as a /32 — and everything else must be told to it.' },

    { t: 'PHASE 3 — On R1, add next-hop static routes to everything remote',
      do: [
        'Add routes via <b>10.0.12.2</b> for the two remote LANs: <b>10.0.3.0/24</b> and <b>10.0.4.0/24</b>.',
        'Add routes via the same next hop for the three remote loopbacks: <b>2.2.2.2/32</b>, <b>3.3.3.3/32</b> and <b>4.4.4.4/32</b>.',
        'Display the routing table and count the S entries.',
      ],
      done: 'Five static routes appear in R1\'s table.',
      why: 'Every destination needs its own line with the next-hop form. Five routes for four destinations on one small network is exactly why dynamic routing was invented.' },

    { t: 'PHASE 4 — On R2, the hub, add the six routes it needs',
      do: [
        'Add <b>10.0.1.0/24</b> via <b>10.0.12.1</b>.',
        'Add <b>10.0.3.0/24</b> via <b>10.0.23.2</b> and <b>10.0.4.0/24</b> via <b>10.0.24.2</b>.',
        'Add the three loopbacks: <b>1.1.1.1</b> via 10.0.12.1, <b>3.3.3.3</b> via 10.0.23.2, <b>4.4.4.4</b> via 10.0.24.2.',
      ],
      done: 'R2 has six static routes pointing three different ways.',
      why: 'The hub router carries the most routes because it is the junction: different destinations leave by different interfaces, and each one needs its own next hop.' },

    { t: 'PHASE 5 — Compare the exit-interface form with the next-hop form',
      do: [
        'On <b>R2</b>, add a route for <b>192.168.99.0/24</b> using the <b>exit interface G0/2</b> instead of a next-hop address, and look at how it prints.',
        'Then remove it again with the "no" form.',
      ],
      done: 'The route appears "directly connected" via the interface, then is removed.',
      why: 'The exit-interface form skips the recursive lookup but makes the router treat the whole remote subnet as directly attached, which means ARPing for every destination. Prefer the next-hop form on Ethernet.' },

    { t: 'PHASE 6 — Give R3 a single default route instead of individual routes',
      do: [
        'On <b>R3</b>, create a default route (<b>0.0.0.0 0.0.0.0</b>) via <b>10.0.23.1</b>.',
        'Display the routing table and find the <b>S*</b> entry and the gateway of last resort line.',
        'Then ping <b>10.0.1.1</b> and <b>4.4.4.4</b> to prove one line covers everything.',
      ],
      done: 'Both pings succeed via a single default route.',
      why: 'A stub router with one way out needs exactly one route. That is the whole argument for default routing, and the S* marks the candidate default.' },

    { t: 'PHASE 7 — On R4, replace two specific routes with one summary',
      do: [
        'On <b>R4</b>, first add <b>10.0.1.0/24</b> and <b>10.0.3.0/24</b>, both via <b>10.0.24.1</b>, and look at the table.',
        'Then remove both and replace them with a single summary: <b>10.0.0.0 255.255.0.0</b> via <b>10.0.24.1</b>.',
        'Ping <b>10.0.1.1</b> and <b>10.0.3.1</b> to prove the summary covers them.',
      ],
      done: 'One route replaces two and both destinations still answer.',
      why: 'Summarisation trades precision for table size. A /16 covering every 10.0.x.x network is one line instead of many — and the reason address plans are designed to be summarisable.' },

    { t: 'PHASE 8 — Add a floating backup route over the direct R1–R3 link',
      do: [
        'On <b>R1</b>, add a route for <b>10.0.3.0/24</b> via <b>10.0.13.2</b> with a trailing administrative distance of <b>200</b>.',
        'Display the routing table — it does not appear.',
        'Then trace the route to <b>10.0.3.1</b> and note which path is in use.',
      ],
      done: 'The AD-200 route is absent from the table and traffic still goes via R2.',
      why: 'A worse administrative distance keeps the route in reserve. It installs itself only if the preferred route disappears — the standard way to configure a backup link.' },

    { t: 'PHASE 9 — Add a host route, trace it, then remove it',
      do: [
        'On <b>R1</b>, add a <b>/32</b> route for <b>10.0.3.10</b> via <b>10.0.13.2</b> — the direct link.',
        'Trace to <b>10.0.3.10</b>, then trace to <b>10.0.3.1</b> and compare the paths.',
        'Remove the host route and trace to 10.0.3.10 once more.',
      ],
      done: 'One host takes the direct link while the rest of its subnet does not, until you remove the route.',
      why: 'Longest prefix match beats administrative distance and metric alike. A /32 sends one host down a different path from its neighbours — powerful, and easy to forget you did it.' },

    { t: 'PHASE 10 — Test the full connectivity matrix',
      do: [
        'From <b>PC1</b>: <code>ipconfig</code>, then ping <b>10.0.3.10</b> and <b>10.0.4.10</b>.',
        'From <b>PC3</b>: ping <b>10.0.1.10</b> and <b>10.0.4.10</b>.',
        'From <b>PC4</b>: ping <b>10.0.1.10</b> and <b>10.0.3.10</b>.',
        'From <b>R1</b>: ping all three remote loopbacks.',
      ],
      done: 'Every host reaches every other host, and every loopback answers.',
      why: 'A full matrix is the only honest test of static routing, because a missing return route shows up in one direction only.' },

    { t: 'PHASE 11 — Sweep the routing table on all four routers',
      do: [
        'Display the routing table on <b>R1</b>, <b>R2</b>, <b>R3</b> and <b>R4</b> in turn.',
        'On each one identify the codes present and find the gateway of last resort.',
      ],
      done: 'You can describe each router\'s routing strategy in a sentence.',
      why: 'Four routers, four different strategies: specific routes, hub routes, a default route and a summary. Recognising which is in use is half of inheriting somebody else\'s network.' },

    { t: 'PHASE 12 — Enable IPv6 routing and address the links manually',
      do: [
        'On <b>R1</b>: enable IPv6 unicast routing, then address <b>G0/1</b> as <b>2001:db8:12::1/64</b> and pin the link-local to <b>FE80::1</b>.',
        'Address <b>G0/0</b> as <b>2001:db8:1::1/64</b>, and on <b>G0/2</b> use <b>ipv6 enable</b> with no global address at all.',
        'On <b>R2</b>: enable IPv6 routing, address <b>G0/0</b> as <b>2001:db8:12::2/64</b> with link-local <b>FE80::2</b>, and <b>G0/1</b> as <b>2001:db8:23::2/64</b>.',
        'On <b>R3</b>: enable IPv6 routing, address <b>G0/0</b> as <b>2001:db8:23::3/64</b>, and give <b>G0/1</b> the prefix <b>2001:db8:3::/64</b> with <b>eui-64</b>.',
      ],
      done: 'All three routers show their IPv6 addresses in the brief summary.',
      why: 'Three addressing styles in one lab: fully manual, EUI-64 derived from the MAC, and link-local only. Pinning FE80::1 and ::2 makes next hops readable instead of MAC-derived noise.' },

    { t: 'Drill the two "no" forms that matter in IPv6',
      do: [
        'On <b>R1</b>, disable IPv6 unicast routing, look at the configuration, then enable it again.',
        'On <b>R2 G0/1</b>, remove the IPv6 address with the bare "no" form, check the summary, then put <b>2001:db8:23::2/64</b> back.',
      ],
      done: 'Routing is enabled and R2\'s address is restored.',
      why: 'Without unicast-routing a router holds addresses and forwards nothing. And because an interface can hold several IPv6 addresses, the bare "no ipv6 address" clears the lot — check what you removed before walking away.' },

    { t: 'PHASE 13 — Exchange IPv6 static routes and verify',
      do: [
        'On <b>R1</b>: route <b>2001:db8:3::/64</b> via <b>2001:db8:12::2</b>.',
        'On <b>R2</b>: route <b>2001:db8:1::/64</b> via <b>2001:db8:12::1</b> and <b>2001:db8:3::/64</b> via <b>2001:db8:23::3</b>.',
        'On <b>R3</b>: a default route <b>::/0</b> via <b>2001:db8:23::2</b>.',
        'Display the IPv6 routing table on each, then save all four routers.',
      ],
      done: 'Each router shows C, L and S entries, and all four are saved.',
      why: 'The shapes mirror IPv4 exactly — destination prefix, then next hop — including the default route, which is written ::/0 instead of 0.0.0.0/0.' },
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
    { d: 'R1', t: 'Prove which command does the forwarding — remove it, then put it back.', c: ['configure terminal', 'no ipv6 unicast-routing', 'do show running-config', 'ipv6 unicast-routing', 'end'], note: 'Without it a router still holds its IPv6 addresses and still answers pings sent to itself, but forwards nothing between interfaces. IPv4 routing is on by default; IPv6 routing is not.' },
    { d: 'R2', t: 'Drill the "no" form of an address, then restore it.', c: ['configure terminal', 'interface g0/1', 'no ipv6 address', 'do show ipv6 interface brief', 'ipv6 address 2001:db8:23::2/64', 'end', 'show ipv6 interface brief'], note: 'An interface can hold several IPv6 addresses at once, so the bare "no ipv6 address" clears the lot — including the link-local if you pinned one. Check what you removed before you walk away.' },

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
  id: 'x6-ospf-hsrp', ord: 600, vol: 1, tier: 'deep', day: 'Days 25-28', title: 'OSPF & HSRP — Full Drill',
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
  spec: [
    { d: 'OSPF — process 1, area 0, on R1, R2, R3 and R4', r: [
      'Unique router IDs <b>1.1.1.1</b> to <b>4.4.4.4</b>.',
      '<b>R1</b> advertises its LAN, its link to R3 and its loopback with <b>network statements</b>.',
      '<b>R2</b> and <b>R4</b> must enable OSPF on their link using the <b>interface</b> command rather than a network statement.',
      '<b>R1</b> and <b>R2</b> both use <b>passive-interface default</b>, with only their link to the core re-enabled.',
      '<b>R3</b> (the core) advertises all three links and its loopback.',
      'Reference bandwidth <b>10000</b> on all four routers.',
      '<b>R1</b>: cost <b>10</b>, OSPF priority <b>100</b> and network type <b>point-to-point</b> on G0/1 — and R3 must match that type on its end.',
      '<b>R1</b> limited to <b>2</b> equal-cost paths.',
      '<b>R4</b>: a static default route to the ISP, injected into OSPF — but the ISP link itself must NOT be advertised.',
    ] },
    { d: 'HSRP version 2 on R1 and R2', r: [
      'Group <b>1</b> sharing <b>10.0.0.1</b>, with <b>R1</b> preferred and preempt enabled.',
      'Group <b>2</b> sharing <b>10.0.0.254</b>, with <b>R2</b> preferred and preempt enabled.',
    ] },
    { t: 'Verification', r: [
      'All three core adjacencies are FULL, and none forms across the passive user LAN.',
      'PC1 reaches both virtual gateways and the remote site; both PCs reach <b>8.8.8.8</b> via the injected default. Save all four internal routers.',
    ] },
  ],
  tasks: [
    { t: 'PHASE 1 — Start OSPF on R1 and advertise its three networks',
      do: [
        'On <b>R1</b>, set <b>terminal length 0</b> and read the routing table first — connected routes only.',
        'Start OSPF process <b>1</b> and set the router ID to <b>1.1.1.1</b>.',
        'Advertise the LAN <b>10.0.0.0 0.0.0.255</b>, the link <b>10.1.13.0 0.0.0.3</b>, and the loopback <b>1.1.1.1 0.0.0.0</b> — all in area <b>0</b>.',
      ],
      done: 'The OSPF process exists with three network statements.',
      why: 'Three different wildcard masks in one configuration: a /24, a /30 and a single address. Network statements select which interfaces run OSPF, not which routes are advertised.' },

    { t: 'Silence OSPF everywhere on R1, then re-enable only the link to R3',
      do: [
        'Inside the OSPF process, set <b>passive-interface default</b>.',
        'Then use the "no" form to un-passive <b>G0/1</b>, the link toward R3.',
        'Check with the OSPF interface brief view.',
      ],
      done: 'Only G0/1 is non-passive.',
      why: 'Passive-by-default then exempting the few links that need neighbours is the safe way round: you cannot accidentally send hellos onto a user LAN you forgot about.' },

    { t: 'PHASE 2 — On R2, enable OSPF on the link with the interface command instead',
      do: [
        'On <b>R2</b>: OSPF process <b>1</b>, router ID <b>2.2.2.2</b>, advertise <b>10.0.0.0 0.0.0.255</b> and <b>2.2.2.2 0.0.0.0</b> in area 0, and set <b>passive-interface default</b>.',
        'Un-passive <b>G0/1</b>, then leave the process and enable OSPF directly on interface <b>G0/1</b> with <b>ip ospf 1 area 0</b>.',
        'Check the OSPF interface brief view.',
      ],
      done: 'G0/1 runs OSPF without a network statement covering it.',
      why: 'The interface command replaces a network statement entirely and is far more explicit. Modern configurations often use it exclusively.' },

    { t: 'Note the trap this phase deliberately sets',
      do: [
        'Confirm you typed the <b>no passive-interface g0/1</b> line on R2 as well as the interface command.',
      ],
      done: 'R2 has both the un-passive line and the interface command.',
      why: 'passive-interface default silences an interface even when OSPF was enabled on it directly. Forget the no-passive line and the neighbour never appears, no matter how correct the rest looks.' },

    { t: 'PHASE 3 — On R3, the core, advertise everything with network statements',
      do: [
        'On <b>R3</b>: OSPF process <b>1</b>, router ID <b>3.3.3.3</b>.',
        'Advertise <b>10.1.13.0 0.0.0.3</b>, <b>10.1.23.0 0.0.0.3</b>, <b>10.1.34.0 0.0.0.3</b> and <b>3.3.3.3 0.0.0.0</b>, all in area 0.',
        'Display the OSPF neighbour table.',
      ],
      done: 'R3 shows adjacencies with R1 and R2.',
      why: 'Three /30 links and a loopback. R3 is the hub, so its adjacencies are what let the edge routers learn about each other at all.' },

    { t: 'PHASE 4 — On R4, mix both methods deliberately',
      do: [
        'On <b>R4</b>: OSPF process <b>1</b>, router ID <b>4.4.4.4</b>, advertise the LAN <b>10.0.4.0 0.0.0.255</b> and loopback <b>4.4.4.4 0.0.0.0</b>, with <b>passive-interface default</b>.',
        'Un-passive <b>G0/0</b> and enable OSPF on that interface with <b>ip ospf 1 area 0</b>.',
        'Check the neighbour table.',
      ],
      done: 'R4 has an adjacency with R3.',
      why: 'Note what is NOT advertised: the ISP link. You never run your interior routing protocol toward a provider.' },

    { t: 'PHASE 5 — Remove and re-add a network statement, watching the neighbour',
      do: [
        'On <b>R3</b>, remove the <b>10.1.23.0 0.0.0.3</b> network statement and display the neighbour table — R2 disappears.',
        'Put the statement back and display the table again.',
      ],
      done: 'The adjacency drops and returns.',
      why: 'OSPF stopped running on that interface the moment the statement went. Being able to make an adjacency come and go on demand is a genuinely useful troubleshooting skill.' },

    { t: 'Delete R2\'s entire OSPF process, then rebuild it from memory',
      do: [
        'On <b>R2</b>, remove the whole OSPF process with <b>no router ospf 1</b>, then look at the neighbour table and the protocols summary.',
        'Now rebuild it: process 1, router ID <b>2.2.2.2</b>, both network statements, passive-interface default, no passive on <b>G0/1</b>, and the interface-level <b>ip ospf 1 area 0</b>.',
      ],
      done: 'R2\'s adjacency is back.',
      why: 'One command wipes the router ID, every network statement and every passive setting at once, with no confirmation and no undo. Rebuilding it proves you know the order: process, ID, networks, passive policy, interface enablement.' },

    { t: 'PHASE 6 — Raise the reference bandwidth on all four routers',
      do: [
        'On <b>R1</b>, <b>R2</b>, <b>R3</b> and <b>R4</b>: set <b>auto-cost reference-bandwidth 10000</b> inside the OSPF process.',
        'On R1 also set <b>maximum-paths 2</b>.',
        'Read the warning IOS prints.',
      ],
      done: 'All four routers use the same reference bandwidth.',
      why: 'Cost is reference bandwidth divided by interface bandwidth. At the default of 100 Mbps every gigabit link costs 1 and they all look identical — and the value MUST match on every router or their calculations disagree.' },

    { t: 'Set an explicit cost, a priority, and the point-to-point network type',
      do: [
        'On <b>R1 G0/1</b>: set <b>ip ospf cost 10</b>, <b>ip ospf priority 100</b>, and the network type to <b>point-to-point</b>.',
        'On <b>R3 G0/0</b> — the other end of that link — set the network type to <b>point-to-point</b> as well.',
        'Check the neighbour state on R3.',
      ],
      done: 'The adjacency stays up and the state shows FULL with no DR role.',
      why: 'Network type must match on both ends or the adjacency breaks. A point-to-point link elects nobody, which is why the state reads FULL/ - instead of FULL/DR.' },

    { t: 'Put the other link back to the broadcast type explicitly',
      do: [
        'On <b>R3 G0/1</b>, set the OSPF network type to <b>broadcast</b> and check the neighbour table.',
        'Compare the state of this neighbour with the point-to-point one.',
      ],
      done: 'One neighbour shows a DR role and one does not.',
      why: 'Broadcast is the default on Ethernet and is the type that elects a DR and BDR. Stating it explicitly is how you undo a point-to-point setting.' },

    { t: 'PHASE 7 — Give R4 a default route and inject it into OSPF',
      do: [
        'On <b>R4</b>, create a static default route via <b>203.0.113.2</b> (the ISP) and look at the routing table.',
        'Then, inside the OSPF process, add <b>default-information originate</b>.',
        'Check the routing table on <b>R1</b> and find the <b>O*E2</b> entry.',
      ],
      done: 'Every router learns a default route from R4.',
      why: 'One command turns R4 into the exit for the whole domain. Without it, every other router would need its own static default — which defeats the point of running a protocol.' },

    { t: 'PHASE 8 — Verify OSPF from every angle on all four routers',
      do: [
        'On <b>R1</b>: neighbour table, OSPF interface brief, and the process view.',
        'On <b>R2</b>: neighbour table, interface brief, and the protocols summary.',
        'On <b>R3</b> and <b>R4</b>: neighbour tables, and on R4 also the routing table.',
      ],
      done: 'Every adjacency reads FULL and you can name each router\'s ID.',
      why: 'Four views answer four different questions: who are my neighbours, which interfaces run OSPF, what is this process\'s configuration, and what is actually being advertised.' },

    { t: 'PHASE 9 — Configure HSRP group 1 on both edge routers',
      do: [
        'On <b>R1 G0/0</b>: set <b>standby version 2</b>, then group <b>1</b> with virtual IP <b>10.0.0.1</b>, priority <b>110</b>, and <b>preempt</b>.',
        'On <b>R2 G0/0</b>: version 2, group <b>1</b> with the same virtual IP <b>10.0.0.1</b> and <b>preempt</b>, leaving the priority at the default.',
      ],
      done: 'R1 is Active for group 1 and R2 is Standby.',
      why: 'Version 2 supports more groups and IPv6, and is what you should configure. Without preempt a recovered router stays Standby forever, even with the higher priority.' },

    { t: 'Add a second group where the other router is preferred',
      do: [
        'On <b>R1</b>: add group <b>2</b> with virtual IP <b>10.0.0.254</b> and <b>preempt</b>, default priority.',
        'On <b>R2</b>: add group <b>2</b> with the same virtual IP, priority <b>110</b> and <b>preempt</b>.',
      ],
      done: 'R2 is Active for group 2 while R1 is Active for group 1.',
      why: 'Two groups with reversed priorities means both routers carry traffic — half the hosts pointed at each virtual IP — instead of one sitting idle as a hot spare.' },

    { t: 'PHASE 10 — Confirm the roles and prove end-to-end reachability',
      do: [
        'Display the brief standby summary on <b>R1</b> and on <b>R2</b> and check the two roles are complementary.',
        'From <b>PC1</b>: ping both virtual IPs, then <b>10.0.4.10</b>, <b>4.4.4.4</b> and <b>8.8.8.8</b>.',
        'From <b>PC2</b>: ping <b>10.0.0.10</b>, <b>10.0.0.1</b> and <b>8.8.8.8</b>.',
        'Save all four routers.',
      ],
      done: 'Both gateways answer, the internet is reachable, and all four routers are saved.',
      why: 'Reaching 8.8.8.8 proves the whole chain: HSRP for the first hop, OSPF across the core, and the injected default route out to the ISP.' },
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
    { d: 'R2', t: 'Delete R2\'s entire OSPF process and watch the damage.', c: ['configure terminal', 'no router ospf 1', 'end', 'show ip ospf neighbor', 'show ip protocols'], note: 'One command wipes the router ID, every network statement and every passive setting at once. The neighbour table empties immediately — there is no confirmation prompt and no undo.' },
    { d: 'R2', t: 'Rebuild it from memory — the whole block, in order.', c: ['configure terminal', 'router ospf 1', 'router-id 2.2.2.2', 'network 10.0.0.0 0.0.0.255 area 0', 'network 2.2.2.2 0.0.0.0 area 0', 'passive-interface default', 'no passive-interface g0/1', 'exit', 'interface g0/1', 'ip ospf 1 area 0', 'end', 'show ip ospf neighbor'], note: 'Type this one without peeking if you can. Rebuilding a routing process from scratch is the exercise that proves you actually know the order: process, ID, networks, passive policy, then the interface-level enablement.' },

    /* ---- PHASE 6: tuning ---- */
    { d: 'R1', t: 'Raise the reference bandwidth and cap equal-cost paths.', c: ['configure terminal', 'router ospf 1', 'auto-cost reference-bandwidth 10000', 'maximum-paths 2', 'exit'], note: 'Read the warning IOS prints — this value must match on every router or their cost calculations disagree and you get sub-optimal paths.' },
    { d: 'R1', t: 'Tune the link to R3 at interface level.', c: ['interface g0/1', 'ip ospf cost 10', 'ip ospf priority 100', 'ip ospf network point-to-point', 'end', 'show ip ospf interface brief'], note: 'An explicit cost overrides the bandwidth calculation entirely. Priority affects the DR election — which point-to-point then makes irrelevant.' },
    { d: 'R3', t: 'Match the network type on the other end, or the adjacency breaks.', c: ['configure terminal', 'router ospf 1', 'auto-cost reference-bandwidth 10000', 'exit', 'interface g0/0', 'ip ospf network point-to-point', 'end', 'show ip ospf neighbor'], note: 'Network type must match on both ends. Note the state now reads FULL/ - rather than FULL/DR, because point-to-point links elect nobody.' },
    { d: 'R2', t: 'Reference bandwidth on R2 as well.', c: ['configure terminal', 'router ospf 1', 'auto-cost reference-bandwidth 10000', 'end'], note: 'Third of four. Leave R2–R3 as a broadcast link so you can compare the neighbour states.' },
    { d: 'R3', t: 'State the default network type explicitly on the other link.', c: ['configure terminal', 'interface g0/1', 'ip ospf network broadcast', 'end', 'show ip ospf neighbor'], note: 'Broadcast is the default on Ethernet and is the type that elects a DR and BDR. Typing it explicitly is how you undo a point-to-point setting — and the neighbour state shows the difference: FULL/DR here, FULL/ - on the point-to-point link.' },
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
