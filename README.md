# SoundTouch Free

**A free, open-source controller for Bose SoundTouch speakers that works without Bose's cloud services.**

> **Important**: Bose announced that SoundTouch cloud services will be discontinued on **May 6, 2026**. This project provides a local alternative that will continue working after the cloud shutdown.

## Why This Project?

Bose SoundTouch speakers rely on cloud services for streaming music from services like Spotify, Pandora, and TuneIn. When Bose shuts down these services, many features will stop working. This project provides:

- **Local network control** - No cloud dependency
- **Custom internet radio stations** - Using `LOCAL_INTERNET_RADIO` source
- **Preset management** - Save custom stations to device presets (1-6)
- **Multi-room audio** - Zone management for synchronized playback
- **Real-time updates** - WebSocket connections for instant status changes

## Features

- Device discovery via mDNS/Bonjour
- Playback controls (play, pause, skip, volume)
- Shuffle and repeat mode support
- Custom HTTP radio streams
- Save stations to device presets
- Multi-room zone creation
- Real-time WebSocket updates
- Dark theme UI optimized for Bose aesthetics

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Device   │  │ Now      │  │ Presets  │  │ Custom Stations  │ │
│  │ Cards    │  │ Playing  │  │          │  │                  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│       │             │             │                  │           │
└───────┼─────────────┼─────────────┼──────────────────┼───────────┘
        │             │             │                  │
        ▼             ▼             ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Proxy Server (Express)                        │
│                     http://localhost:3001                        │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │ /api/device/:ip/ │  │ /api/stations/                       │ │
│  │ Proxy to devices │  │ Custom station CRUD + descriptors    │ │
│  └────────┬─────────┘  └──────────────────┬───────────────────┘ │
└───────────┼────────────────────────────────┼─────────────────────┘
            │                                │
            ▼                                ▼
┌───────────────────────┐      ┌─────────────────────────────────┐
│   SoundTouch Device   │      │      JSON Descriptor File       │
│   HTTP API :8090      │◄─────│      data/stations.json         │
│   WebSocket :8080     │      └─────────────────────────────────┘
└───────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Bose SoundTouch speakers on the same network

### Installation

```bash
# Clone the repository
git clone git@github.com:carloscampano/Soundtouch_Free.git
cd Soundtouch_Free

# Install dependencies
pnpm install

# Start the development server
cd packages/web
pnpm dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **API/Proxy**: http://localhost:3001

### Production Build

```bash
cd packages/web
pnpm build
pnpm preview
```

## Project Structure

```
soundtouch-controller/
├── packages/
│   ├── api/                 # SoundTouch API client library
│   │   ├── src/
│   │   │   ├── client.ts    # HTTP client for SoundTouch API
│   │   │   ├── discovery.ts # mDNS device discovery
│   │   │   ├── types.ts     # TypeScript interfaces
│   │   │   └── ws.ts        # WebSocket client
│   │   └── package.json
│   │
│   └── web/                 # React frontend + proxy server
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── hooks/       # Custom React hooks
│       │   ├── store/       # Zustand state management
│       │   └── App.tsx      # Main application
│       ├── server.js        # Express proxy server
│       ├── data/            # Persistent storage
│       │   └── stations.json
│       └── package.json
│
├── docs/                    # Documentation
│   └── SOUNDTOUCH_API.md    # SoundTouch API reference
│
└── README.md
```

## Usage Guide

### 1. Discovering Devices

When you open the app, it automatically discovers SoundTouch devices on your network using mDNS. You can also manually add devices by IP address.

### 2. Controlling Playback

Select a device to see:
- **Now Playing** - Current track, artist, album art
- **Playback controls** - Play/pause, skip, shuffle, repeat
- **Volume** - Slider with smooth optimistic updates

### 3. Using Presets

SoundTouch devices have 6 preset buttons. Click any preset to start playing that content.

### 4. Custom Stations (LOCAL_INTERNET_RADIO)

This is the key feature for post-cloud-shutdown operation:

1. Click **"Add Station"** in the Custom Stations section
2. Enter:
   - **Name**: Display name for the station
   - **Stream URL**: HTTP URL to an audio stream (must be HTTP, not HTTPS)
   - **Type**: Live Radio or Playlist
   - **Category**: Optional categorization
3. Click **Play** to stream immediately
4. Click **Save to Preset** (1-6) to store permanently on the device

**Important**: SoundTouch only supports HTTP streams, not HTTPS.

#### Finding HTTP Streams

- [Xiph Directory](http://dir.xiph.org) - Icecast streams
- [RadioForge](https://www.radioforge.com) - Stream URL finder
- [SHOUTcast](https://directory.shoutcast.com) - Radio directory

### 5. Multi-Room Audio

Create zones to play synchronized audio across multiple speakers:

1. Click **"Create Zone"** or **"Play Everywhere"**
2. Select the devices to include
3. The master device controls playback for all zone members

## How LOCAL_INTERNET_RADIO Works

When you play a custom station, the following happens:

```
1. Browser clicks "Play"
          │
          ▼
2. POST /api/device/:ip/playCustomStation
   Body: { stationId: "station_123" }
          │
          ▼
3. Server builds XML with descriptor URL:
   ┌─────────────────────────────────────────────────┐
   │ <?xml version="1.0" encoding="UTF-8"?>         │
   │ <ContentItem source="LOCAL_INTERNET_RADIO"     │
   │              type="stationurl"                  │
   │              location="http://10.13.5.17:3001  │
   │                       /api/stations/123/       │
   │                       descriptor">              │
   │   <itemName>My Radio Station</itemName>        │
   │ </ContentItem>                                 │
   └─────────────────────────────────────────────────┘
          │
          ▼
4. POST to SoundTouch device :8090/select
          │
          ▼
5. Device fetches descriptor from proxy server:
   GET http://10.13.5.17:3001/api/stations/123/descriptor
          │
          ▼
6. Server returns JSON descriptor:
   {
     "audio": {
       "streamUrl": "http://stream.example.com/live.mp3",
       "hasPlaylist": false,
       "isRealtime": true
     },
     "name": "My Radio Station",
     "imageUrl": "http://example.com/logo.png",
     "streamType": "liveRadio"
   }
          │
          ▼
7. Device starts streaming from streamUrl
```

## API Reference

See [docs/SOUNDTOUCH_API.md](docs/SOUNDTOUCH_API.md) for complete SoundTouch API documentation.

### Proxy Server Endpoints

#### Device Proxy
```
GET/POST /api/device/:ip/*
```
Proxies requests to SoundTouch device at `:ip` on port 8090.

#### Custom Stations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stations` | List all stations |
| GET | `/api/stations/:id` | Get station by ID |
| GET | `/api/stations/:id/descriptor` | Get JSON descriptor for device |
| POST | `/api/stations` | Create new station |
| PUT | `/api/stations/:id` | Update station |
| DELETE | `/api/stations/:id` | Delete station |

#### Device Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/device/:ip/playCustomStation` | Play station on device |
| POST | `/api/device/:ip/storeCustomPreset` | Save station to preset |

### Station Object

```typescript
interface CustomStation {
  id: string;           // Unique ID (auto-generated)
  name: string;         // Display name
  streamUrl: string;    // HTTP audio stream URL
  imageUrl: string;     // Optional logo URL
  type: 'radio' | 'playlist';
  category: string;     // Optional category
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}
```

## Configuration

### Environment Variables

The proxy server automatically detects your local IP address for descriptor URLs. If you need to override this:

```javascript
// In server.js
const LOCAL_IP = process.env.LOCAL_IP || getLocalIP();
```

### Ports

- **3000** - Vite dev server (frontend)
- **3001** - Express proxy server (API)
- **8090** - SoundTouch HTTP API (on each device)
- **8080** - SoundTouch WebSocket (on each device)

## Troubleshooting

### Device not discovered
- Ensure your computer and speakers are on the same network
- Check if mDNS/Bonjour is enabled on your network
- Try adding the device manually by IP address

### Stream not playing
- Verify the stream URL is HTTP (not HTTPS)
- Test the stream URL in VLC or another player first
- Check server logs for errors

### Preset not saving
- Ensure the proxy server is running
- The device needs to reach your computer's IP address
- Check that port 3001 is accessible

### Volume slider jumping
- This is fixed with optimistic updates
- If still occurring, check WebSocket connection

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - See [LICENSE](LICENSE) for details.

## Disclaimer

This is an unofficial project and is not affiliated with Bose Corporation. Bose and SoundTouch are trademarks of Bose Corporation.

## Acknowledgments

- [Bose SoundTouch API Documentation](https://developer.bose.com/soundtouch-control-api) (archived)
- [Community workarounds](https://gist.github.com/rody64/98a59990ff60ea962cac72cbe93edf56) for post-cloud solutions
- [bonjour-service](https://www.npmjs.com/package/bonjour-service) for mDNS discovery
