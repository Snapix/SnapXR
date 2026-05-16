import { WidgetInstance } from '../widgets/types';

export interface SceneConfig {
  settings: {
    distance: number;
    scale: number;
    curvature: number;
    environment: string;
    angle: number;
    vOffset: number;
    hOffset: number;
    envBrightness: number;
    ambientLight: number;
    frameStyle: string;
    frameBorder: boolean;
    fov: number;
    preset?: 'none' | 'office' | 'theater';
    customBackgroundUrl?: string | null;
  };
  widgets: WidgetInstance[];
  hostName: string;
  savedAt: number;
}

const STORAGE_KEY = 'snapxr_scene_v2';

export function loadSceneConfig(): SceneConfig {
  const defaults: SceneConfig = {
    settings: {
      distance: 3, scale: 1, curvature: 0, environment: 'night', angle: 0, vOffset: 0, hOffset: 0,
      envBrightness: 1, ambientLight: 0.5, frameStyle: 'none', frameBorder: false, fov: 75, preset: 'none', customBackgroundUrl: null
    },
    widgets: [],
    hostName: 'My Desktop',
    savedAt: 0
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      settings: { ...defaults.settings, ...(parsed.settings || {}) },
      widgets: parsed.widgets || [],
    };
  } catch { return defaults; }
}

export function saveSceneConfig(data: Partial<SceneConfig>) {
  try {
    const existing = loadSceneConfig();
    const updated = { ...existing, ...data, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
}
