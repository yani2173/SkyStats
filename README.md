<p align="center">
  <img src="public/logo.svg" width="72" height="72" alt="SkyStats Logo" />
</p>

# SkyStats

Show your live VATSIM flight on Discord.

[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)](https://github.com)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=black)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-2021-DEA584?logo=rust&logoColor=black)](https://www.rust-lang.org)
[![Discord](https://img.shields.io/badge/Discord-Rich%20Presence-5865F2?logo=discord&logoColor=white)](https://discord.com)
[![License](https://img.shields.io/badge/License-SkyStats%20License-2ea44f.svg)](LICENSE)

SkyStats is a lightweight Windows app that watches your flight on the VATSIM network by your CID and updates your Discord status with real-time flight stats, route info, and a direct map link.

## Features

- Matches your flight automatically by VATSIM CID (no need to change callsigns between flights)
- Shows aircraft type, route, departure, arrival, altitude, speed, and heading on Discord
- Shows where you are flying (e.g. "Cruising over Germany at FL360" or "Descending into EGLL")
- Configurable timer: countdown to landing or total flight time
- Clickable button on Discord to view your flight on the VATSIM radar map
- Dark-mode interface with live preview of what Discord will show
- Runs quietly in your system tray, no accounts or setup headaches

## How to use

1. Download the latest installer from the Releases page.
2. Run it and enter your VATSIM CID.
3. Keep Discord running, launch your simulator, and fly. SkyStats updates your Discord status automatically.

## Customizing your Discord status

You can customize the lines shown on Discord in the Presence Designer using these tags:

| Tag | What it shows | Example |
| --- | --- | --- |
| `{callsign}` | Flight callsign | `RYR8AB` |
| `{aircraft}` | Aircraft type | `B738` |
| `{departure}` | Origin ICAO | `LBSF` |
| `{arrival}` | Destination ICAO | `EGLL` |
| `{departure_name}` | Origin airport or city | `Sofia` |
| `{arrival_name}` | Destination airport or city | `Glasgow` |
| `{altitude}` | Altitude | `36,000 ft` |
| `{flight_level}` | Flight level | `FL360` |
| `{groundspeed}` | Ground speed | `452 kt` |
| `{heading}` | Heading | `288°` |
| `{distance_remaining}` | Remaining distance | `694 NM` |
| `{eta}` | Estimated arrival (UTC) | `17:31Z` |
| `{time_remaining}` | Time left to landing | `1h 42m` |
| `{country}` | Country you are flying over | `Bulgaria` |
| `{flying_over}` | Country phrase | `Flying over Bulgaria` |
| `{smart_status}` | Context-aware status | `On Approach to Glasgow` |
| `{phase}` | Flight phase | `Cruising` |
| `{flight_time}` | Duration airborne / logged in | `1h 35m` |
| `{network}` | Active flight network | `VATSIM` |

### Simulator badge (Discord small icon)

SkyStats automatically attaches a simulator badge (MSFS 2024, MSFS 2020, or X-Plane) to the bottom-right corner of your Discord status logo. It automatically detects whether MSFS 2024, MSFS 2020, or X-Plane is running, or you can pick one manually in the Presence Designer.

## Roadmap & Planned Features

We're constantly expanding SkyStats to be the best flight simulation companion for Discord. Here are some of the features and ideas planned for upcoming releases:

- **Multi-Network Support:**
  - **IVAO** integration (live whazzup data feed)
  - **POSCON** and **PilotEdge** network telemetry
  - Unified network selector with auto-detection

- **Direct Simulator Telemetry (Zero-Latency Mode):**
  - **SimConnect** integration for Microsoft Flight Simulator 2020 & 2024
  - Native **X-Plane** UDP / SDK telemetry plugin

- **ATC & Communications Intelligence:**
  - Active controller detection (Tower, Approach, Control / Radar)
  - Tuned frequency and controller callsign display

- **Cross-Platform Availability:**
  - Native **macOS** and **Linux** builds

Have a feature request or suggestion? Feel free to open an issue or discussion on GitHub!

## Building from source

### Requirements
- Windows 10 or 11
- Node.js 20+
- Rust & Visual Studio C++ Build Tools

### Running in development

```powershell
git clone https://github.com/yani2173/air.git
cd air
npm install
npm run dev
```

To run just the UI preview without native background services:
```powershell
npm run web
```

### Building the installer

```powershell
npm run tauri -- build
```

The installer `.exe` will be in `src-tauri/target/release/bundle/nsis/`.

## Privacy

SkyStats runs entirely on your PC. It only fetches public data from VATSIM (`data.vatsim.net`) and talks to your local Discord app via IPC. No tracking, no analytics, no external servers.

For full details, see [PRIVACY.md](PRIVACY.md) and [TERMS.md](TERMS.md).

## License

Free for personal use under the [SkyStats Software License](LICENSE). Modification, creating derivative works, or redistributing modified versions without prior written permission is not permitted.

Airport coordinates dataset is bundled from the [VATSpy Data Project](https://github.com/vatsimnetwork/vatspy-data-project) under CC BY-SA 4.0.
