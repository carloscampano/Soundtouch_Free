/**
 * Proxy server for SoundTouch API
 * Handles CORS issues when accessing SoundTouch devices from browser
 * Also manages custom stations for LOCAL_INTERNET_RADIO
 */

import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { networkInterfaces } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Support configurable port and data directory (for Electron)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const DEVICE_TIMEOUT = 8000;

// Data file for custom stations (configurable for Electron)
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'stations.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data file if it doesn't exist
if (!existsSync(DATA_FILE)) {
  writeFileSync(DATA_FILE, JSON.stringify({ stations: [] }, null, 2));
}

// Load stations from file
function loadStations() {
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return { stations: [] };
  }
}

// Save stations to file
function saveStations(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Get local IP address for the descriptor URLs
function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

// Escape XML special characters
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Cache local IP at startup
const LOCAL_IP = getLocalIP();
console.log(`📍 Local IP detected: ${LOCAL_IP}`);

// Manual CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Parse JSON and text bodies
app.use(express.json());
app.use(express.text({ type: 'application/xml' }));

// ============================================================
// CUSTOM STATIONS API
// ============================================================

// Get all custom stations
app.get('/api/stations', (req, res) => {
  const data = loadStations();
  res.json(data.stations);
});

// Get single station by ID
app.get('/api/stations/:id', (req, res) => {
  const data = loadStations();
  const station = data.stations.find(s => s.id === req.params.id);
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }
  res.json(station);
});

// Get station descriptor JSON (for SoundTouch LOCAL_INTERNET_RADIO)
app.get('/api/stations/:id/descriptor', (req, res) => {
  const data = loadStations();
  const station = data.stations.find(s => s.id === req.params.id);
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }

  // Return the JSON format that SoundTouch expects
  res.json({
    audio: {
      hasPlaylist: station.type === 'playlist',
      isRealtime: station.type === 'radio',
      streamUrl: station.streamUrl
    },
    imageUrl: station.imageUrl || '',
    name: station.name,
    streamType: station.type === 'radio' ? 'liveRadio' : 'playlist'
  });
});

// Create new station
app.post('/api/stations', (req, res) => {
  const data = loadStations();
  const newStation = {
    id: `station_${Date.now()}`,
    name: req.body.name,
    streamUrl: req.body.streamUrl,
    imageUrl: req.body.imageUrl || '',
    type: req.body.type || 'radio', // 'radio' or 'playlist'
    category: req.body.category || 'uncategorized',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.stations.push(newStation);
  saveStations(data);

  res.status(201).json(newStation);
});

// Update station
app.put('/api/stations/:id', (req, res) => {
  const data = loadStations();
  const index = data.stations.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Station not found' });
  }

  data.stations[index] = {
    ...data.stations[index],
    name: req.body.name ?? data.stations[index].name,
    streamUrl: req.body.streamUrl ?? data.stations[index].streamUrl,
    imageUrl: req.body.imageUrl ?? data.stations[index].imageUrl,
    type: req.body.type ?? data.stations[index].type,
    category: req.body.category ?? data.stations[index].category,
    updatedAt: new Date().toISOString()
  };

  saveStations(data);
  res.json(data.stations[index]);
});

// Delete station
app.delete('/api/stations/:id', (req, res) => {
  const data = loadStations();
  const index = data.stations.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Station not found' });
  }

  data.stations.splice(index, 1);
  saveStations(data);
  res.status(204).end();
});

// ============================================================
// DEVICE PRESET MANAGEMENT
// ============================================================

// Store a custom station as a preset on a device
app.post('/api/device/:ip/storeCustomPreset', async (req, res) => {
  const { ip } = req.params;
  const { presetId, stationId } = req.body;

  if (!presetId || !stationId) {
    return res.status(400).json({ error: 'presetId and stationId are required' });
  }

  const data = loadStations();
  const station = data.stations.find(s => s.id === stationId);
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }

  // Build the descriptor URL (pointing to our server using local IP)
  const descriptorUrl = `http://${LOCAL_IP}:${PORT}/api/stations/${stationId}/descriptor`;

  // Build XML to store preset on device
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<preset id="${presetId}">
  <ContentItem source="LOCAL_INTERNET_RADIO" type="stationurl" location="${descriptorUrl}" isPresetable="true">
    <itemName>${escapeXml(station.name)}</itemName>
  </ContentItem>
</preset>`;

  try {
    const response = await fetch(`http://${ip}:8090/storePreset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml
    });

    const result = await response.text();
    res.status(response.status).send(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to store preset', message: error.message });
  }
});

// Play a custom station on a device
app.post('/api/device/:ip/playCustomStation', async (req, res) => {
  const { ip } = req.params;
  const { stationId } = req.body;

  if (!stationId) {
    return res.status(400).json({ error: 'stationId is required' });
  }

  const data = loadStations();
  const station = data.stations.find(s => s.id === stationId);
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }

  // Build the descriptor URL using local IP
  const descriptorUrl = `http://${LOCAL_IP}:${PORT}/api/stations/${stationId}/descriptor`;

  // Build XML to select/play the station
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ContentItem source="LOCAL_INTERNET_RADIO" type="stationurl" location="${descriptorUrl}">
  <itemName>${escapeXml(station.name)}</itemName>
</ContentItem>`;

  try {
    const response = await fetch(`http://${ip}:8090/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml
    });

    const result = await response.text();
    res.status(response.status).send(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to play station', message: error.message });
  }
});

// ============================================================
// PROXY FOR SOUNDTOUCH DEVICE API
// ============================================================

app.all('/api/device/:ip/*', async (req, res) => {
  const targetIp = req.params.ip;
  const path = req.params[0] || '';
  const targetUrl = `http://${targetIp}:8090/${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEVICE_TIMEOUT);

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/xml',
      },
      signal: controller.signal,
    };

    // Add body for POST/PUT requests
    if (req.method === 'POST' || req.method === 'PUT') {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    res.status(response.status);
    res.set('Content-Type', response.headers.get('Content-Type') || 'application/xml');
    res.send(data);

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Device timeout', message: 'Device took too long to respond' });
    }

    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      return res.status(502).json({ error: 'Device unreachable', message: error.message });
    }

    console.error(`Proxy error for ${targetIp}:`, error.message);
    return res.status(502).json({ error: 'Proxy error', message: error.message });
  } finally {
    clearTimeout(timeoutId);
  }
});

// ============================================================
// LYRICS API (LRCLIB)
// ============================================================

// Cache for lyrics to avoid repeated requests
const lyricsCache = new Map();
const LYRICS_CACHE_TTL = 3600000; // 1 hour

// Search for synced lyrics
app.get('/api/lyrics/search', async (req, res) => {
  const { track, artist, album, duration } = req.query;

  if (!track || !artist) {
    return res.status(400).json({ error: 'track and artist are required' });
  }

  // Check cache
  const cacheKey = `${artist}-${track}`.toLowerCase();
  const cached = lyricsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < LYRICS_CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    // Build query params for LRCLIB
    const params = new URLSearchParams({
      track_name: track,
      artist_name: artist,
    });
    if (album) params.append('album_name', album);
    if (duration) params.append('duration', duration);

    const response = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: {
        'User-Agent': 'SoundTouch-Free/1.0.0 (https://github.com/carloscampano/Soundtouch_Free)'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Lyrics not found' });
      }
      throw new Error(`LRCLIB API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse synced lyrics into array format
    let syncedLyrics = [];
    if (data.syncedLyrics) {
      syncedLyrics = parseLRC(data.syncedLyrics);
    }

    const result = {
      id: data.id,
      track: data.trackName,
      artist: data.artistName,
      album: data.albumName,
      duration: data.duration,
      instrumental: data.instrumental,
      plainLyrics: data.plainLyrics,
      syncedLyrics: syncedLyrics,
      hasSyncedLyrics: syncedLyrics.length > 0
    };

    // Cache the result
    lyricsCache.set(cacheKey, { data: result, timestamp: Date.now() });

    res.json(result);
  } catch (error) {
    console.error('Lyrics fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch lyrics', message: error.message });
  }
});

// Parse LRC format into array of {time, text}
function parseLRC(lrcString) {
  const lines = lrcString.split('\n');
  const lyrics = [];

  for (const line of lines) {
    // Match [mm:ss.xx] or [mm:ss] format
    const match = line.match(/^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const time = minutes * 60000 + seconds * 1000 + milliseconds;
      const text = match[4].trim();

      if (text) {
        lyrics.push({ time, text });
      }
    }
  }

  return lyrics.sort((a, b) => a.time - b.time);
}

// ============================================================
// UTILITIES & SERVER START
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', localIp: LOCAL_IP });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SoundTouch Proxy Server running on http://localhost:${PORT}`);
  console.log(`   Use /api/device/:ip/* to proxy requests to SoundTouch devices`);
  console.log(`   Use /api/stations/* to manage custom stations`);
  console.log(`   Descriptor URLs will use: http://${LOCAL_IP}:${PORT}`);
});
