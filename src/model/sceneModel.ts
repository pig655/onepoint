import type { RoomSpec, RoomSurfaceId, RoomWallId } from '../core/roomGeometry';
import type {
  AssetType,
  FloorAssetType,
  WallAssetType,
} from './assetLibrary';
import {
  DEFAULT_BASIC_VP_X,
  DEFAULT_BASIC_VP_Y,
  DEFAULT_ROOM_SPEC,
  DEFAULT_ROOM_VP_X,
  DEFAULT_ROOM_VP_Y,
} from './viewConfig';

export type AppMode = 'basic' | 'room';
export type RoomStage = 'empty' | 'decorate' | 'finish';
export type DisplayMode = 'line' | 'guides' | 'finished' | 'color';
export type BasicGeometryShape = 'cube' | 'cuboid' | 'cylinder';
export type BasicStreetShape = 'car' | 'house' | 'road';
export type BasicShape = BasicGeometryShape | BasicStreetShape;

export interface BasicObject {
  id: string;
  type: BasicShape;
  label: string;
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
}

export interface BasicGuides {
  horizon: boolean;
  grid: boolean;
  depthLines: boolean;
  vp: boolean;
}

export interface BasicScene {
  vpX: number;
  vpY: number;
  objects: BasicObject[];
  guides: BasicGuides;
}

export interface WallObject {
  id: string;
  kind: 'wall';
  type: WallAssetType;
  label: string;
  wall: RoomWallId;
  u: number;
  v: number;
  width: number;
  height: number;
  color: string;
  accentColor: string;
}

export interface FloorObject {
  id: string;
  kind: 'floor';
  type: FloorAssetType;
  label: string;
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  accentColor: string;
}

export type SceneObject = WallObject | FloorObject;

export interface RoomGuides {
  horizon: boolean;
  vp: boolean;
  floorLines: boolean;
  ceilingLines: boolean;
  wallDepthLines: boolean;
  objectLines: boolean;
}

export interface RoomProgress {
  vpSelected: boolean;
  vpMoved: boolean;
  floorLinesOpened: boolean;
}

export interface RoomScene {
  spec: RoomSpec;
  vpX: number;
  vpY: number;
  stage: RoomStage;
  displayMode: DisplayMode;
  wallColors: Record<RoomSurfaceId, string>;
  wallObjects: WallObject[];
  floorObjects: FloorObject[];
  guides: RoomGuides;
  progress: RoomProgress;
}

export interface Scene {
  version: 1;
  mode: AppMode;
  basic: BasicScene;
  room: RoomScene;
}

export const DEFAULT_SURFACE_COLORS: Record<RoomSurfaceId, string> = {
  left: '#efe2cf',
  right: '#e9dac4',
  back: '#f7eee0',
  floor: '#e8d7bd',
  ceiling: '#f4f1e7',
};

export const SURFACE_LABELS: Record<RoomSurfaceId, string> = {
  left: '左牆',
  right: '右牆',
  back: '後牆',
  floor: '地板',
  ceiling: '天花板',
};

export const WALL_LABELS: Record<RoomWallId, string> = {
  left: '左牆',
  right: '右牆',
  back: '後牆',
};

export const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  line: '黑白線稿',
  guides: '顯示輔助線',
  finished: '完成線稿',
  color: '彩色作品',
};

export const STAGE_LABELS: Record<RoomStage, string> = {
  empty: '空房間',
  decorate: '房間佈置',
  finish: '完成作品',
};

export const DEFAULT_GUIDES: RoomGuides = {
  horizon: true,
  vp: true,
  floorLines: false,
  ceilingLines: false,
  wallDepthLines: false,
  objectLines: false,
};

export const DEFAULT_BASIC_GUIDES: BasicGuides = {
  horizon: true,
  grid: true,
  depthLines: true,
  vp: true,
};

let idCounter = 0;

export function createId(prefix: string): string {
  idCounter += 1;
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${random}`;
}

export function createDefaultBasicObjects(): BasicObject[] {
  return [
    {
      id: createId('basic'),
      type: 'cube',
      label: '方塊 A',
      x: -1.6,
      z: 3.6,
      width: 1.3,
      height: 1.3,
      depth: 1.3,
      color: '#e4a35f',
    },
    {
      id: createId('basic'),
      type: 'cuboid',
      label: '長方體 B',
      x: 1.5,
      z: 6,
      width: 1.7,
      height: 1.1,
      depth: 1.2,
      color: '#74a5c2',
    },
    {
      id: createId('basic'),
      type: 'cylinder',
      label: '柱體 C',
      x: -0.2,
      z: 8.8,
      width: 1.2,
      height: 1.6,
      depth: 1.2,
      color: '#b19bca',
    },
  ];
}

export function createDefaultScene(): Scene {
  return {
    version: 1,
    mode: 'room',
    basic: {
      vpX: DEFAULT_BASIC_VP_X,
      vpY: DEFAULT_BASIC_VP_Y,
      objects: createDefaultBasicObjects(),
      guides: { ...DEFAULT_BASIC_GUIDES },
    },
    room: {
      spec: { ...DEFAULT_ROOM_SPEC },
      vpX: DEFAULT_ROOM_VP_X,
      vpY: DEFAULT_ROOM_VP_Y,
      stage: 'empty',
      displayMode: 'line',
      wallColors: { ...DEFAULT_SURFACE_COLORS },
      wallObjects: [],
      floorObjects: [],
      guides: { ...DEFAULT_GUIDES },
      progress: {
        vpSelected: false,
        vpMoved: false,
        floorLinesOpened: false,
      },
    },
  };
}

export function createWallObject(
  type: WallAssetType,
  wall: RoomWallId,
  room: RoomScene,
  assetDefaults: {
    label: string;
    width: number;
    height: number;
    color: string;
    accentColor: string;
  },
): WallObject {
  const isDoor = type === 'door';
  const v = isDoor
    ? 1 - assetDefaults.height / (2 * room.spec.height)
    : 0.42;
  return {
    id: createId('wall'),
    kind: 'wall',
    type,
    label: assetDefaults.label,
    wall,
    u: 0.5,
    v,
    width: assetDefaults.width,
    height: assetDefaults.height,
    color: assetDefaults.color,
    accentColor: assetDefaults.accentColor,
  };
}

export function createFloorObject(
  type: FloorAssetType,
  index: number,
  defaults: {
    label: string;
    width: number;
    height: number;
    depth: number;
    color: string;
    accentColor: string;
  },
): FloorObject {
  const slots = [
    { x: -1.5, z: 4.25 },
    { x: 1.5, z: 4.25 },
    { x: -1.6, z: 4.9 },
    { x: 1.6, z: 4.9 },
    { x: 0, z: 4.7 },
  ];
  const slot = slots[index % slots.length];
  return {
    id: createId('floor'),
    kind: 'floor',
    type,
    label: defaults.label,
    x: slot.x,
    z: slot.z,
    width: defaults.width,
    height: defaults.height,
    depth: defaults.depth,
    color: defaults.color,
    accentColor: defaults.accentColor,
  };
}

export function isWallObject(object: SceneObject): object is WallObject {
  return object.kind === 'wall';
}

export function isFloorObject(object: SceneObject): object is FloorObject {
  return object.kind === 'floor';
}

export function allObjects(room: RoomScene): SceneObject[] {
  return [...room.wallObjects, ...room.floorObjects];
}

export function findObject(
  room: RoomScene,
  id: string | null,
): SceneObject | undefined {
  if (!id) {
    return undefined;
  }
  return allObjects(room).find((object) => object.id === id);
}

export function isStreetShape(
  type: BasicShape,
): type is BasicStreetShape {
  return type === 'car' || type === 'house' || type === 'road';
}

export function isGeometryShape(
  type: BasicShape,
): type is BasicGeometryShape {
  return !isStreetShape(type);
}

export function isWallAsset(type: AssetType): type is WallAssetType {
  return [
    'paintingLandscape',
    'paintingPortrait',
    'window',
    'door',
    'clock',
    'decorativePainting',
  ].includes(type);
}

export function isFloorAsset(type: AssetType): type is FloorAssetType {
  return !isWallAsset(type);
}

export function coloredSurfaceCount(scene: RoomScene): number {
  return (Object.keys(DEFAULT_SURFACE_COLORS) as RoomSurfaceId[]).filter(
    (surface) =>
      scene.wallColors[surface].toLowerCase() !==
      DEFAULT_SURFACE_COLORS[surface].toLowerCase(),
  ).length;
}
