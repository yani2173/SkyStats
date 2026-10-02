# Privacy Policy

SkyStats is a local desktop app. This document explains what data is used and how it is handled.

## In short

- No accounts, no telemetry, no tracking.
- All settings and data stay on your computer.
- The app only connects to the official VATSIM public feed and your local Discord client.

## What is stored on your PC

1. **VATSIM CID:** Stored locally in `%APPDATA%/SkyStats` so the app knows which flight to track.
2. **Settings:** Your interface preferences and Discord templates, stored locally alongside your CID.

## Network connections

1. **VATSIM API (`data.vatsim.net`):** The app makes a read-only HTTPS request every 30 seconds to fetch the public pilot list and find your flight. No personal data, passwords, or simulator data are sent.
2. **Discord Local IPC:** Flight status is sent directly to your Discord desktop client through a local pipe on your machine. Nothing goes through any intermediate server.
3. **Map links:** Clicking the map button opens the flight on the radar map in your default web browser.

## How to delete your data

Simply change or clear your CID in the app settings, or delete the `%APPDATA%/SkyStats` folder.

## License

SkyStats is distributed under the [SkyStats Software License](LICENSE).
