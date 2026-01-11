# Bose SoundTouch API Reference

This document describes the Bose SoundTouch Web Services API. SoundTouch devices expose an HTTP API on port **8090** and WebSocket notifications on port **8080**.

## Overview

- **HTTP API**: `http://<device-ip>:8090/`
- **WebSocket**: `ws://<device-ip>:8080/`
- **Content-Type**: `application/xml`

All responses are in XML format.

---

## Table of Contents

1. [Device Information](#device-information)
2. [Now Playing](#now-playing)
3. [Volume Control](#volume-control)
4. [Playback Control](#playback-control)
5. [Presets](#presets)
6. [Sources](#sources)
7. [Content Selection](#content-selection)
8. [Multi-Room Zones](#multi-room-zones)
9. [WebSocket Notifications](#websocket-notifications)
10. [LOCAL_INTERNET_RADIO](#local_internet_radio)

---

## Device Information

### GET /info

Returns device information including name, type, MAC address, and network info.

**Request:**
```http
GET /info HTTP/1.1
Host: 192.168.1.100:8090
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<info deviceID="689E19653E96">
  <name>Living Room</name>
  <type>SoundTouch 30</type>
  <margeAccountUUID>1234567890</margeAccountUUID>
  <components>
    <component>
      <componentCategory>SCM</componentCategory>
      <softwareVersion>25.0.5.42017.4297928</softwareVersion>
      <serialNumber>Z7V1234567890</serialNumber>
    </component>
  </components>
  <networkInfo type="WIFI">
    <macAddress>68:9E:19:65:3E:96</macAddress>
    <ipAddress>192.168.1.100</ipAddress>
  </networkInfo>
</info>
```

---

## Now Playing

### GET /now_playing

Returns current playback status, track information, and artwork.

**Request:**
```http
GET /now_playing HTTP/1.1
Host: 192.168.1.100:8090
```

**Response (Playing):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<nowPlaying deviceID="689E19653E96" source="SPOTIFY">
  <ContentItem source="SPOTIFY" type="uri" location="spotify:track:abc123"
               sourceAccount="user@email.com" isPresetable="true">
    <itemName>Song Title</itemName>
  </ContentItem>
  <track>Song Title</track>
  <artist>Artist Name</artist>
  <album>Album Name</album>
  <stationName>My Playlist</stationName>
  <art artImageStatus="IMAGE_PRESENT">http://image.url/art.jpg</art>
  <playStatus>PLAY_STATE</playStatus>
  <shuffleSetting>SHUFFLE_OFF</shuffleSetting>
  <repeatSetting>REPEAT_OFF</repeatSetting>
  <streamType>TRACK_ONDEMAND</streamType>
</nowPlaying>
```

**Response (Standby):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<nowPlaying deviceID="689E19653E96" source="STANDBY">
  <ContentItem source="STANDBY" isPresetable="false"/>
</nowPlaying>
```

### Play Status Values

| Value | Description |
|-------|-------------|
| `PLAY_STATE` | Currently playing |
| `PAUSE_STATE` | Paused |
| `STOP_STATE` | Stopped |
| `BUFFERING_STATE` | Buffering content |

### Shuffle Settings

| Value | Description |
|-------|-------------|
| `SHUFFLE_OFF` | Shuffle disabled |
| `SHUFFLE_ON` | Shuffle enabled |

### Repeat Settings

| Value | Description |
|-------|-------------|
| `REPEAT_OFF` | Repeat disabled |
| `REPEAT_ONE` | Repeat current track |
| `REPEAT_ALL` | Repeat all tracks |

---

## Volume Control

### GET /volume

Returns current volume level and mute status.

**Request:**
```http
GET /volume HTTP/1.1
Host: 192.168.1.100:8090
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<volume deviceID="689E19653E96">
  <targetvolume>50</targetvolume>
  <actualvolume>50</actualvolume>
  <muteenabled>false</muteenabled>
</volume>
```

### POST /volume

Set volume level (0-100).

**Request:**
```http
POST /volume HTTP/1.1
Host: 192.168.1.100:8090
Content-Type: application/xml

<volume>50</volume>
```

**Mute:**
```xml
<volume>
  <mute/>
</volume>
```

---

## Playback Control

### POST /key

Send remote control key commands.

**Request:**
```http
POST /key HTTP/1.1
Host: 192.168.1.100:8090
Content-Type: application/xml

<key state="press" sender="Gabbo">PLAY</key>
```

Then release:
```xml
<key state="release" sender="Gabbo">PLAY</key>
```

### Available Keys

| Key | Description |
|-----|-------------|
| `PLAY` | Play |
| `PAUSE` | Pause |
| `PLAY_PAUSE` | Toggle play/pause |
| `STOP` | Stop playback |
| `PREV_TRACK` | Previous track |
| `NEXT_TRACK` | Next track |
| `THUMBS_UP` | Like (streaming services) |
| `THUMBS_DOWN` | Dislike (streaming services) |
| `BOOKMARK` | Bookmark current content |
| `POWER` | Toggle power/standby |
| `MUTE` | Toggle mute |
| `VOLUME_UP` | Increase volume |
| `VOLUME_DOWN` | Decrease volume |
| `PRESET_1` - `PRESET_6` | Play preset 1-6 |
| `SHUFFLE_ON` | Enable shuffle |
| `SHUFFLE_OFF` | Disable shuffle |
| `REPEAT_ONE` | Repeat current track |
| `REPEAT_ALL` | Repeat all |
| `REPEAT_OFF` | Disable repeat |
| `ADD_FAVORITE` | Add to favorites |
| `REMOVE_FAVORITE` | Remove from favorites |

---

## Presets

### GET /presets

Returns all 6 device presets.

**Request:**
```http
GET /presets HTTP/1.1
Host: 192.168.1.100:8090
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<presets>
  <preset id="1" createdOn="1234567890" updatedOn="1234567890">
    <ContentItem source="TUNEIN" type="stationurl"
                 location="/v1/playback/station/s12345"
                 sourceAccount="" isPresetable="true">
      <itemName>BBC Radio 1</itemName>
    </ContentItem>
  </preset>
  <preset id="2" createdOn="1234567890" updatedOn="1234567890">
    <ContentItem source="SPOTIFY" type="uri"
                 location="spotify:playlist:abc123"
                 sourceAccount="user@email.com" isPresetable="true">
      <itemName>My Playlist</itemName>
    </ContentItem>
  </preset>
  <!-- ... presets 3-6 ... -->
</presets>
```

### POST /storePreset

Store content to a preset slot (1-6).

**Request:**
```http
POST /storePreset HTTP/1.1
Host: 192.168.1.100:8090
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<preset id="1">
  <ContentItem source="LOCAL_INTERNET_RADIO" type="stationurl"
               location="http://192.168.1.50:3001/api/stations/123/descriptor"
               isPresetable="true">
    <itemName>My Radio Station</itemName>
  </ContentItem>
</preset>
```

### POST /removePreset

Remove a preset.

**Request:**
```xml
<preset id="1"/>
```

---

## Sources

### GET /sources

Returns available audio sources.

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sources deviceID="689E19653E96">
  <sourceItem source="BLUETOOTH" sourceAccount="" status="UNAVAILABLE"
              isLocal="true" multiroomallowed="true">Bluetooth</sourceItem>
  <sourceItem source="AUX" sourceAccount="" status="READY"
              isLocal="true" multiroomallowed="true">AUX IN</sourceItem>
  <sourceItem source="SPOTIFY" sourceAccount="user@email.com" status="READY"
              isLocal="false" multiroomallowed="true">Spotify</sourceItem>
  <sourceItem source="TUNEIN" sourceAccount="" status="READY"
              isLocal="false" multiroomallowed="true">TuneIn</sourceItem>
  <sourceItem source="STORED_MUSIC" sourceAccount="" status="READY"
              isLocal="false" multiroomallowed="true">Stored Music</sourceItem>
  <sourceItem source="LOCAL_INTERNET_RADIO" sourceAccount="" status="READY"
              isLocal="false" multiroomallowed="true">Local Radio</sourceItem>
</sources>
```

### Source Types

| Source | Description |
|--------|-------------|
| `BLUETOOTH` | Bluetooth audio input |
| `AUX` | Auxiliary input (3.5mm) |
| `SPOTIFY` | Spotify Connect |
| `TUNEIN` | TuneIn Radio |
| `PANDORA` | Pandora |
| `DEEZER` | Deezer |
| `AMAZON` | Amazon Music |
| `STORED_MUSIC` | DLNA/UPnP media servers |
| `LOCAL_INTERNET_RADIO` | Custom internet radio (JSON descriptor) |
| `STANDBY` | Device in standby |

---

## Content Selection

### POST /select

Select content to play.

**Play a preset:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ContentItem source="PRESET_1"/>
```

**Play Bluetooth:**
```xml
<ContentItem source="BLUETOOTH"/>
```

**Play AUX:**
```xml
<ContentItem source="AUX" sourceAccount="AUX"/>
```

**Play LOCAL_INTERNET_RADIO:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ContentItem source="LOCAL_INTERNET_RADIO" type="stationurl"
             location="http://192.168.1.50:3001/api/stations/123/descriptor">
  <itemName>My Radio Station</itemName>
</ContentItem>
```

---

## Multi-Room Zones

### GET /getZone

Get current zone configuration.

**Response (Zone Master):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<zone master="689E19653E96" senderIPAddress="192.168.1.100">
  <member ipaddress="192.168.1.101">AABBCCDDEEFF</member>
  <member ipaddress="192.168.1.102">112233445566</member>
</zone>
```

**Response (Not in zone):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<zone/>
```

### POST /setZone

Create a new zone with this device as master.

**Request:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<zone master="689E19653E96" senderIPAddress="192.168.1.100">
  <member ipaddress="192.168.1.101">AABBCCDDEEFF</member>
  <member ipaddress="192.168.1.102">112233445566</member>
</zone>
```

### POST /addZoneSlave

Add a device to an existing zone.

**Request:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<zone master="689E19653E96" senderIPAddress="192.168.1.100">
  <member ipaddress="192.168.1.103">FFEEDDCCBBAA</member>
</zone>
```

### POST /removeZoneSlave

Remove a device from a zone.

**Request:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<zone master="689E19653E96" senderIPAddress="192.168.1.100">
  <member ipaddress="192.168.1.101">AABBCCDDEEFF</member>
</zone>
```

---

## WebSocket Notifications

Connect to `ws://<device-ip>:8080/` to receive real-time updates.

### Connection

```javascript
const ws = new WebSocket('ws://192.168.1.100:8080/');

ws.onmessage = (event) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(event.data, 'text/xml');
  // Process updates...
};
```

### Update Types

**Volume Update:**
```xml
<updates deviceID="689E19653E96">
  <volumeUpdated>
    <volume>
      <targetvolume>50</targetvolume>
      <actualvolume>50</actualvolume>
      <muteenabled>false</muteenabled>
    </volume>
  </volumeUpdated>
</updates>
```

**Now Playing Update:**
```xml
<updates deviceID="689E19653E96">
  <nowPlayingUpdated>
    <nowPlaying deviceID="689E19653E96" source="SPOTIFY">
      <!-- ... same as GET /now_playing ... -->
    </nowPlaying>
  </nowPlayingUpdated>
</updates>
```

**Zone Update:**
```xml
<updates deviceID="689E19653E96">
  <zoneUpdated>
    <zone master="689E19653E96">
      <!-- ... zone info ... -->
    </zone>
  </zoneUpdated>
</updates>
```

**Preset Update:**
```xml
<updates deviceID="689E19653E96">
  <presetsUpdated>
    <presets>
      <!-- ... presets ... -->
    </presets>
  </presetsUpdated>
</updates>
```

---

## LOCAL_INTERNET_RADIO

This source allows playing custom internet radio streams without cloud services.

### How It Works

1. Device receives a ContentItem with `source="LOCAL_INTERNET_RADIO"`
2. Device fetches the JSON descriptor from the `location` URL
3. Device streams audio from the `streamUrl` in the descriptor

### JSON Descriptor Format

The device expects a JSON response from the descriptor URL:

```json
{
  "audio": {
    "streamUrl": "http://stream.example.com:8000/live.mp3",
    "hasPlaylist": false,
    "isRealtime": true
  },
  "name": "My Radio Station",
  "imageUrl": "http://example.com/logo.png",
  "streamType": "liveRadio"
}
```

### Descriptor Fields

| Field | Type | Description |
|-------|------|-------------|
| `audio.streamUrl` | string | **Required.** HTTP URL to audio stream |
| `audio.hasPlaylist` | boolean | `true` for playlists, `false` for live radio |
| `audio.isRealtime` | boolean | `true` for live streams, `false` for on-demand |
| `name` | string | Station name displayed on device |
| `imageUrl` | string | Optional album art/logo URL |
| `streamType` | string | `"liveRadio"` or `"playlist"` |

### Important Notes

1. **HTTP Only**: Stream URLs must be HTTP, not HTTPS
2. **Accessible URL**: The descriptor URL must be reachable from the SoundTouch device
3. **Supported Formats**: MP3, AAC, Ogg Vorbis streams
4. **Port**: Standard Icecast/Shoutcast ports work (8000, etc.)

### Example: Playing a Custom Station

**Step 1: Create descriptor endpoint**

Your server returns JSON at `/api/stations/123/descriptor`:

```json
{
  "audio": {
    "streamUrl": "http://ice1.somafm.com/groovesalad-128-mp3",
    "hasPlaylist": false,
    "isRealtime": true
  },
  "name": "Groove Salad",
  "imageUrl": "http://somafm.com/img/groovesalad.png",
  "streamType": "liveRadio"
}
```

**Step 2: Send select command to device**

```xml
POST /select HTTP/1.1
Host: 192.168.1.100:8090
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<ContentItem source="LOCAL_INTERNET_RADIO" type="stationurl"
             location="http://192.168.1.50:3001/api/stations/123/descriptor">
  <itemName>Groove Salad</itemName>
</ContentItem>
```

**Step 3: Save as preset (optional)**

```xml
POST /storePreset HTTP/1.1
Host: 192.168.1.100:8090
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<preset id="1">
  <ContentItem source="LOCAL_INTERNET_RADIO" type="stationurl"
               location="http://192.168.1.50:3001/api/stations/123/descriptor"
               isPresetable="true">
    <itemName>Groove Salad</itemName>
  </ContentItem>
</preset>
```

---

## Error Handling

### Error Response

```xml
<?xml version="1.0" encoding="UTF-8"?>
<errors deviceID="689E19653E96">
  <error value="401" name="HTTP_STATUS_UNAUTHORIZED">
    Unauthorized request
  </error>
</errors>
```

### Common Error Codes

| Code | Name | Description |
|------|------|-------------|
| 400 | BAD_REQUEST | Malformed XML |
| 401 | UNAUTHORIZED | Authentication required |
| 404 | NOT_FOUND | Endpoint not found |
| 500 | INTERNAL_ERROR | Device internal error |

---

## Discovery (mDNS/Bonjour)

SoundTouch devices advertise themselves via mDNS:

- **Service Type**: `_soundtouch._tcp.local`
- **TXT Records**: Include device info

### Example Discovery (Node.js)

```javascript
import { Bonjour } from 'bonjour-service';

const bonjour = new Bonjour();

bonjour.find({ type: 'soundtouch' }, (service) => {
  console.log('Found device:', {
    name: service.name,
    host: service.host,
    port: service.port,
    addresses: service.addresses,
    txt: service.txt
  });
});
```

---

## References

- [Bose Developer Portal](https://developer.bose.com) (archived)
- [SoundTouch API Specification PDF](https://developer.bose.com/soundtouch-control-api)
- [Community Solutions](https://gist.github.com/rody64/98a59990ff60ea962cac72cbe93edf56)
