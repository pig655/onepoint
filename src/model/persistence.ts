import { isFloorObjectAnchored } from '../core/objectProjection';
import type { RoomSpec, RoomSurfaceId, RoomWallId } from '../core/roomGeometry';
import { isRectInsideWall } from '../core/roomGeometry';
import type {
  AssetType,
  FloorAssetType,
  WallAssetType,
} from './assetLibrary';
import {
  createDefaultScene,
  type AppMode,
  type BasicObject,
  type BasicShape,
  type DisplayMode,
  type FloorObject,
  type RoomGuides,
  type RoomProgress,
  type RoomStage,
  type Scene,
  type WallObject,
} from './sceneModel';
import {
  BASIC_FRAME,
  DEFAULT_BASIC_VP_Y,
  DEFAULT_ROOM_VP_Y,
  ROOM_FRAME,
} from './viewConfig';
import { createRoomGeometry } from '../core/roomGeometry';

export const STORAGE_KEY = 'onepoint-perspective-scene-v1';
export const SCENE_FILE_VERSION = 1;

export type ParseResult =
  | { ok: true; scene: Scene }
  | { ok: false; error: string };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isHexColor(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^#[0-9a-fA-F]{6}$/.test(value)
  );
}

function asString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.slice(0, 80);
}

const BASIC_SHAPES: BasicShape[] = [
  'cube',
  'cuboid',
  'cylinder',
  'car',
  'house',
  'road',
];
const APP_MODES: AppMode[] = ['basic', 'room'];
const ROOM_STAGES: RoomStage[] = ['empty', 'decorate', 'finish'];
const DISPLAY_MODES: DisplayMode[] = ['line', 'guides', 'finished', 'color'];
const ROOM_WALLS: RoomWallId[] = ['left', 'back', 'right'];
const ROOM_SURFACES: RoomSurfaceId[] = [
  'left',
  'right',
  'back',
  'floor',
  'ceiling',
];
const WALL_TYPES: WallAssetType[] = [
  'paintingLandscape',
  'paintingPortrait',
  'window',
  'door',
  'clock',
  'decorativePainting',
];
const FLOOR_TYPES: FloorAssetType[] = [
  'table',
  'chair',
  'cabinet',
  'bookshelf',
  'bed',
  'sofa',
  'person',
  'tree',
  'plant',
  'flower',
  'lamp',
  'cube',
  'cuboid',
  'cylinder',
];

function parseRoomSpec(value: unknown): RoomSpec | null {
  if (!isRecord(value)) {
    return null;
  }
  const width = value.width;
  const height = value.height;
  const nearZ = value.nearZ;
  const farZ = value.farZ;
  if (
    !isFiniteNumber(width) ||
    !isFiniteNumber(height) ||
    !isFiniteNumber(nearZ) ||
    !isFiniteNumber(farZ)
  ) {
    return null;
  }
  if (
    width < 2 ||
    width > 20 ||
    height < 1.5 ||
    height > 10 ||
    nearZ < 0.2 ||
    farZ <= nearZ ||
    farZ > 30
  ) {
    return null;
  }
  return { width, height, nearZ, farZ };
}

function parseBasicObjects(value: unknown): BasicObject[] | null {
  if (!Array.isArray(value) || value.length > 100) {
    return null;
  }
  const ids = new Set<string>();
  const objects: BasicObject[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }
    const type = item.type;
    if (
      typeof type !== 'string' ||
      !BASIC_SHAPES.includes(type as BasicShape)
    ) {
      return null;
    }
    const id = asString(item.id, '');
    if (!id || ids.has(id)) {
      return null;
    }
    ids.add(id);
    const numbers = [
      item.x,
      item.z,
      item.width,
      item.height,
      item.depth,
    ];
    if (
      !numbers.every(isFiniteNumber) ||
      (item.z as number) <= 0.25 ||
      (item.width as number) <= 0 ||
      (item.height as number) <= 0 ||
      (item.depth as number) <= 0 ||
      (item.width as number) > 20 ||
      (item.height as number) > 20 ||
      (item.depth as number) > 20
    ) {
      return null;
    }
    if (!isHexColor(item.color)) {
      return null;
    }
    objects.push({
      id,
      type: type as BasicShape,
      label: asString(item.label, '幾何物件'),
      x: item.x as number,
      z: item.z as number,
      width: item.width as number,
      height: item.height as number,
      depth: item.depth as number,
      color: item.color,
    });
  }
  return objects;
}

function parseWallObjects(
  value: unknown,
  spec: RoomSpec,
): WallObject[] | null {
  if (!Array.isArray(value) || value.length > 100) {
    return null;
  }
  const geometry = createRoomGeometry(spec);
  const ids = new Set<string>();
  const objects: WallObject[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }
    const type = item.type;
    const wall = item.wall;
    if (
      typeof type !== 'string' ||
      !WALL_TYPES.includes(type as WallAssetType) ||
      typeof wall !== 'string' ||
      !ROOM_WALLS.includes(wall as RoomWallId)
    ) {
      return null;
    }
    const id = asString(item.id, '');
    if (!id || ids.has(id)) {
      return null;
    }
    ids.add(id);
    const numbers = [item.u, item.v, item.width, item.height];
    if (
      !numbers.every(isFiniteNumber) ||
      (item.u as number) < 0 ||
      (item.u as number) > 1 ||
      (item.v as number) < 0 ||
      (item.v as number) > 1 ||
      (item.width as number) <= 0 ||
      (item.height as number) <= 0
    ) {
      return null;
    }
    if (
      !isRectInsideWall(
        geometry,
        wall as RoomWallId,
        item.u as number,
        item.v as number,
        item.width as number,
        item.height as number,
        1e-6,
      )
    ) {
      return null;
    }
    if (!isHexColor(item.color) || !isHexColor(item.accentColor)) {
      return null;
    }
    objects.push({
      id,
      kind: 'wall',
      type: type as WallAssetType,
      label: asString(item.label, '牆面物件'),
      wall: wall as RoomWallId,
      u: item.u as number,
      v: item.v as number,
      width: item.width as number,
      height: item.height as number,
      color: item.color,
      accentColor: item.accentColor,
    });
  }
  return objects;
}

function parseFloorObjects(
  value: unknown,
  spec: RoomSpec,
): FloorObject[] | null {
  if (!Array.isArray(value) || value.length > 100) {
    return null;
  }
  const ids = new Set<string>();
  const objects: FloorObject[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }
    const type = item.type;
    if (
      typeof type !== 'string' ||
      !FLOOR_TYPES.includes(type as FloorAssetType)
    ) {
      return null;
    }
    const id = asString(item.id, '');
    if (!id || ids.has(id)) {
      return null;
    }
    ids.add(id);
    const numbers = [
      item.x,
      item.z,
      item.width,
      item.height,
      item.depth,
    ];
    if (
      !numbers.every(isFiniteNumber) ||
      (item.width as number) <= 0 ||
      (item.height as number) <= 0 ||
      (item.depth as number) <= 0
    ) {
      return null;
    }
    if (!isHexColor(item.color) || !isHexColor(item.accentColor)) {
      return null;
    }
    const object: FloorObject = {
      id,
      kind: 'floor',
      type: type as FloorAssetType,
      label: asString(item.label, '物件'),
      x: item.x as number,
      z: item.z as number,
      width: item.width as number,
      height: item.height as number,
      depth: item.depth as number,
      color: item.color,
      accentColor: item.accentColor,
    };
    if (!isFloorObjectAnchored(object, spec)) {
      return null;
    }
    objects.push(object);
  }
  return objects;
}

function parseGuides(value: unknown): RoomGuides | null {
  if (!isRecord(value)) {
    return null;
  }
  const keys: Array<keyof RoomGuides> = [
    'horizon',
    'vp',
    'floorLines',
    'ceilingLines',
    'wallDepthLines',
    'objectLines',
  ];
  if (!keys.every((key) => isBoolean(value[key]))) {
    return null;
  }
  return {
    horizon: value.horizon as boolean,
    vp: value.vp as boolean,
    floorLines: value.floorLines as boolean,
    ceilingLines: value.ceilingLines as boolean,
    wallDepthLines: value.wallDepthLines as boolean,
    objectLines: value.objectLines as boolean,
  };
}

function parseProgress(value: unknown): RoomProgress | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    !isBoolean(value.vpSelected) ||
    !isBoolean(value.vpMoved) ||
    !isBoolean(value.floorLinesOpened)
  ) {
    return null;
  }
  return {
    vpSelected: value.vpSelected,
    vpMoved: value.vpMoved,
    floorLinesOpened: value.floorLinesOpened,
  };
}

function parseRoom(
  value: unknown,
): Scene['room'] | null {
  if (!isRecord(value)) {
    return null;
  }
  const spec = parseRoomSpec(value.spec);
  if (!spec) {
    return null;
  }
  const vpX = value.vpX;
  if (
    !isFiniteNumber(vpX) ||
    vpX < ROOM_FRAME.left ||
    vpX > ROOM_FRAME.right
  ) {
    return null;
  }
  const vpY =
    value.vpY === undefined ? DEFAULT_ROOM_VP_Y : value.vpY;
  if (
    !isFiniteNumber(vpY) ||
    vpY < ROOM_FRAME.top ||
    vpY > ROOM_FRAME.bottom
  ) {
    return null;
  }
  const stage = value.stage;
  const displayMode = value.displayMode;
  if (
    typeof stage !== 'string' ||
    !ROOM_STAGES.includes(stage as RoomStage) ||
    typeof displayMode !== 'string' ||
    !DISPLAY_MODES.includes(displayMode as DisplayMode)
  ) {
    return null;
  }
  if (!isRecord(value.wallColors)) {
    return null;
  }
  const wallColors = {} as Record<RoomSurfaceId, string>;
  for (const surface of ROOM_SURFACES) {
    if (!isHexColor(value.wallColors[surface])) {
      return null;
    }
    wallColors[surface] = value.wallColors[surface] as string;
  }
  const wallObjects = parseWallObjects(value.wallObjects, spec);
  const floorObjects = parseFloorObjects(value.floorObjects, spec);
  const guides = parseGuides(value.guides);
  const progress = parseProgress(value.progress);
  if (!wallObjects || !floorObjects || !guides || !progress) {
    return null;
  }
  return {
    spec,
    vpX,
    vpY,
    stage: stage as RoomStage,
    displayMode: displayMode as DisplayMode,
    wallColors,
    wallObjects,
    floorObjects,
    guides,
    progress,
  };
}

export function validateSceneData(value: unknown): ParseResult {
  if (!isRecord(value)) {
    return { ok: false, error: '場景資料必須是物件。' };
  }
  if (value.version !== SCENE_FILE_VERSION) {
    return { ok: false, error: '不支援的場景版本。' };
  }
  const mode = value.mode;
  if (
    typeof mode !== 'string' ||
    !APP_MODES.includes(mode as AppMode)
  ) {
    return { ok: false, error: '模式標記不合法。' };
  }
  const basic = value.basic;
  if (!isRecord(basic)) {
    return { ok: false, error: '缺少基礎模式資料。' };
  }
  const basicVpX = basic.vpX;
  if (
    !isFiniteNumber(basicVpX) ||
    basicVpX < BASIC_FRAME.left ||
    basicVpX > BASIC_FRAME.right
  ) {
    return { ok: false, error: '基礎模式透視點超出畫布。' };
  }
  const basicVpY =
    basic.vpY === undefined ? DEFAULT_BASIC_VP_Y : basic.vpY;
  if (
    !isFiniteNumber(basicVpY) ||
    basicVpY < BASIC_FRAME.top ||
    basicVpY > BASIC_FRAME.bottom
  ) {
    return { ok: false, error: '基礎模式視平線超出畫布。' };
  }
  if (!isRecord(basic.guides)) {
    return { ok: false, error: '基礎模式輔助線設定不合法。' };
  }
  const basicGuides = basic.guides;
  const basicGuideKeys = ['horizon', 'grid', 'depthLines', 'vp'] as const;
  if (!basicGuideKeys.every((key) => isBoolean(basicGuides[key]))) {
    return { ok: false, error: '基礎模式輔助線設定不合法。' };
  }
  const basicObjects = parseBasicObjects(basic.objects);
  if (!basicObjects) {
    return { ok: false, error: '基礎模式物件資料不合法。' };
  }
  const room = parseRoom(value.room);
  if (!room) {
    return { ok: false, error: '室內模式資料不合法或物件超出房間。' };
  }

  return {
    ok: true,
    scene: {
      version: 1,
      mode: mode as AppMode,
      basic: {
        vpX: basicVpX,
        vpY: basicVpY,
        objects: basicObjects,
        guides: {
          horizon: basicGuides.horizon as boolean,
          grid: basicGuides.grid as boolean,
          depthLines: basicGuides.depthLines as boolean,
          vp: basicGuides.vp as boolean,
        },
      },
      room,
    },
  };
}

export function sceneFromJSON(text: string): ParseResult {
  try {
    return validateSceneData(JSON.parse(text));
  } catch {
    return { ok: false, error: 'JSON 格式錯誤，無法解析。' };
  }
}

export function sceneToJSON(scene: Scene): string {
  return JSON.stringify(scene, null, 2);
}

export function saveSceneToLocalStorage(scene: Scene): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, sceneToJSON(scene));
    return true;
  } catch {
    return false;
  }
}

export function loadSceneFromLocalStorage(): Scene {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) {
      return createDefaultScene();
    }
    const parsed = sceneFromJSON(text);
    return parsed.ok ? parsed.scene : createDefaultScene();
  } catch {
    return createDefaultScene();
  }
}

export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略無 localStorage 的環境。
  }
}

export function createDownload(
  contents: BlobPart,
  filename: string,
  type: string,
): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSceneJSON(scene: Scene): void {
  createDownload(
    sceneToJSON(scene),
    `單點透視作品-${new Date().toISOString().slice(0, 10)}.json`,
    'application/json;charset=utf-8',
  );
}

export function isRoomAssetType(value: string): value is AssetType {
  return (
    WALL_TYPES.includes(value as WallAssetType) ||
    FLOOR_TYPES.includes(value as FloorAssetType)
  );
}

