// Bose SoundTouch API Types

export type KeyValue =
  | 'PLAY'
  | 'PAUSE'
  | 'STOP'
  | 'PREV_TRACK'
  | 'NEXT_TRACK'
  | 'THUMBS_UP'
  | 'THUMBS_DOWN'
  | 'BOOKMARK'
  | 'POWER'
  | 'MUTE'
  | 'VOLUME_UP'
  | 'VOLUME_DOWN'
  | 'PRESET_1'
  | 'PRESET_2'
  | 'PRESET_3'
  | 'PRESET_4'
  | 'PRESET_5'
  | 'PRESET_6'
  | 'AUX_INPUT'
  | 'SHUFFLE_OFF'
  | 'SHUFFLE_ON'
  | 'REPEAT_OFF'
  | 'REPEAT_ONE'
  | 'REPEAT_ALL'
  | 'PLAY_PAUSE'
  | 'ADD_FAVORITE'
  | 'REMOVE_FAVORITE';

export type KeyState = 'press' | 'release';

export type PlayStatus =
  | 'PLAY_STATE'
  | 'PAUSE_STATE'
  | 'STOP_STATE'
  | 'BUFFERING_STATE'
  | 'INVALID_PLAY_STATUS';

export type ArtStatus =
  | 'INVALID'
  | 'SHOW_DEFAULT_IMAGE'
  | 'DOWNLOADING'
  | 'IMAGE_PRESENT';

export type SourceStatus = 'UNAVAILABLE' | 'READY';

export type AudioMode =
  | 'AUDIO_MODE_DIRECT'
  | 'AUDIO_MODE_NORMAL'
  | 'AUDIO_MODE_DIALOG'
  | 'AUDIO_MODE_NIGHT';

export interface SoundTouchDevice {
  id: string;           // MAC address
  name: string;
  ip: string;
  port: number;
  type?: string;
  model?: string;
}

export interface DeviceInfo {
  deviceID: string;
  name: string;
  type: string;
  margeAccountUUID?: string;
  components: DeviceComponent[];
  networkInfo: NetworkInfo[];
  margeURL?: string;
}

export interface DeviceComponent {
  componentCategory: string;
  softwareVersion: string;
  serialNumber: string;
}

export interface NetworkInfo {
  type: string;
  macAddress: string;
  ipAddress: string;
}

export interface VolumeState {
  targetVolume: number;
  actualVolume: number;
  muteEnabled: boolean;
}

export interface BassCapabilities {
  bassAvailable: boolean;
  bassMin: number;
  bassMax: number;
  bassDefault: number;
}

export interface BassState {
  targetBass: number;
  actualBass: number;
}

export interface ContentItem {
  source: string;
  location?: string;
  sourceAccount?: string;
  isPresetable: boolean;
  itemName: string;
}

export interface NowPlaying {
  deviceID: string;
  source: string;
  contentItem?: ContentItem;
  track?: string;
  artist?: string;
  album?: string;
  stationName?: string;
  art?: string;
  artImageStatus?: ArtStatus;
  playStatus: PlayStatus;
  description?: string;
  stationLocation?: string;
  shuffleSetting?: string;
  repeatSetting?: string;
}

export interface Preset {
  id: number;
  contentItem: ContentItem;
  createdOn?: number;
  updatedOn?: number;
}

export interface SourceItem {
  source: string;
  sourceAccount: string;
  status: SourceStatus;
  name: string;
}

export interface ZoneMember {
  ipAddress: string;
  macAddress: string;
}

export interface Zone {
  masterMAC: string;
  masterIP?: string;
  members: ZoneMember[];
}

export interface Capability {
  name: string;
  url: string;
  info?: string;
}

export interface AudioDspControls {
  audioMode: AudioMode;
  videoSyncAudioDelay: number;
  supportedAudioModes: AudioMode[];
}

export interface ToneControl {
  value: number;
  minValue: number;
  maxValue: number;
  step: number;
}

export interface AudioProductToneControls {
  bass: ToneControl;
  treble: ToneControl;
}

export interface AudioProductLevelControls {
  frontCenterSpeakerLevel: ToneControl;
  rearSurroundSpeakersLevel: ToneControl;
}

// WebSocket notification types
export type UpdateType =
  | 'volumeUpdated'
  | 'nowPlayingUpdated'
  | 'zoneUpdated'
  | 'presetsUpdated'
  | 'bassUpdated'
  | 'sourcesUpdated'
  | 'infoUpdated'
  | 'connectionStateUpdated'
  | 'nowSelectionUpdated'
  | 'recentsUpdated'
  | 'acctModeUpdated';

export interface UpdateEvent {
  deviceID: string;
  type: UpdateType;
  data?: unknown;
}

// API Response types
export interface ApiError {
  value: number;
  name: string;
  severity: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
