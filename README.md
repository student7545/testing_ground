# NetDrill — CCNA CLI practice labs

A Boson NetSim-style practice site that runs **entirely in the browser**: a simulated
Cisco IOS CLI (routers, switches, and Windows-style PCs) with auto-graded labs ordered
to follow **Jeremy's IT Lab** (JITL) CCNA course day numbering — the same order as his
*Acing the CCNA Exam* Volume 1 & 2 books. Built for **repetition**: every lab counts
your reps, and Drill Mode hides the step-by-step so you can run labs from memory.

> Not affiliated with Boson, Cisco, or Jeremy's IT Lab. It's a trainer, not a full IOS —
> it covers the CCNA command set the labs teach.

## Run it locally

No build step, no dependencies. Any static file server works:

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000
```

or with Node:

```bash
npx serve .
```

Opening `index.html` directly from disk (`file://`) also works in most browsers.

## Host it (GitHub Pages)

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Source**: select *Deploy from a branch*, pick your branch and `/ (root)`.
3. Your site appears at `https://<user>.github.io/<repo>/`.

Any static host (Netlify, Cloudflare Pages, S3, nginx) works the same way — upload the
files as-is.

## What the simulator supports

- **Modes & navigation** — user EXEC, privileged EXEC, global config, interface /
  line / vlan / router / dhcp-pool / named-ACL sub-modes; `do`, `end`, Ctrl-Z.
- **Terminal behaviors** — command abbreviation (`conf t`, `sh ip int br`),
  context help with `?`, Tab completion, command history with ↑/↓.
- **Config areas** — hostnames, passwords/secrets, banners, line con/vty, SSH stack,
  interfaces & ranges, VLANs, access/trunk/DTP/VTP, STP (rapid-pvst, priorities,
  portfast, bpduguard), EtherChannel, IPv4/IPv6 addressing, static routes, OSPF,
  HSRP, standard & extended ACLs, NTP, DHCP server/relay/snooping, NAT (static & PAT),
  syslog, CDP/LLDP, port security.
- **Live network simulation** — links, VLAN-aware L2 flooding, routing table lookups,
  `ping`/`traceroute` end to end (including ACL blocking), OSPF adjacencies, DHCP
  leases to PCs, MAC learning, CDP/LLDP neighbor discovery.
- **Show commands** — `running-config` generated from device state, `ip interface brief`,
  `ip route`, `vlan brief`, `interfaces trunk/status/switchport`, `mac address-table`,
  `ip ospf neighbor`, `standby brief`, `etherchannel summary`, `spanning-tree`,
  `port-security`, `access-lists`, `ip nat translations`, `ntp status`, and more.
- **PCs** — `ipconfig`, `ipconfig /all`, `ipconfig /renew`, `ping`, `tracert`.

## Lab list (JITL order)

**Volume 1 — Fundamentals, Switching & Routing**

| Day | Lab |
| --- | --- |
| 4 | CLI Basics & Device Security |
| 6 | Ethernet Switching & MAC Tables |
| 8 | Router Interfaces & IPv4 Addressing |
| 9 | Switch Interface Configuration |
| 11 | Static & Default Routes |
| 16 | VLANs Part 1 — Access Ports |
| 17 | VLANs Part 2 — Trunking |
| 18 | VLANs Part 3 — Router on a Stick |
| 19 | DTP & VTP |
| 20–21 | Spanning Tree Protocol |
| 22 | EtherChannel |
| 25–27 | OSPF Single Area |
| 28 | First Hop Redundancy — HSRP |
| 30–32 | IPv6 Addressing & Static Routes |

**Volume 2 — ACLs, Services & Security**

| Day | Lab |
| --- | --- |
| 33 | Standard ACLs |
| 34 | Extended ACLs |
| 35 | CDP & LLDP |
| 36 | NTP |
| 38 | DHCP Server & Relay |
| 40 | Syslog |
| 41 | SSH |
| 43 | NAT Part 1 — Static NAT |
| 44 | NAT Part 2 — PAT (Overload) |
| 47 | Port Security |
| 48 | DHCP Snooping |

Each lab has: a topology diagram, task list, full step-by-step commands with notes,
an **Explanation** tab (the theory — for when you move from repetition to
comprehension), a command quick-reference, and live auto-graded checks.

## The repetition workflow

1. **Guided rep** — follow the steps exactly; watch the checks go green.
2. **Checklist rep** — hit *Reset Lab*, redo it from the task list only.
3. **Drill reps** — toggle *Drill Mode* (hides the steps) and run it from memory.
   Three clean drill reps = the lab is muscle memory.

Rep counts are stored in your browser's localStorage.

## Project layout

```
index.html        entry point (self-hosted)
css/style.css     theme (light/dark aware)
js/core.js        IP utilities + device/interface state model
js/sim.js         L2/L3 forwarding, ping, OSPF adjacency, DHCP, CDP
js/show.js        "show" output + running-config generation
js/cmds.js        command parser (abbreviation, ?, Tab) + EXEC/show commands
js/cmds2.js       config-mode commands + PC commands
js/labs1.js       Volume 1 lab definitions
js/labs2.js       Volume 2 lab definitions
js/app.js         UI: routing, terminal, topology SVG, checks, rep tracking
```

Adding a lab = one object in `labs1.js`/`labs2.js` (devices, links, layout, steps,
checks). No other files need to change.
