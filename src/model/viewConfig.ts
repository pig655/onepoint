import { vpYFromEyeHeight, type Rect } from '../core/perspectiveCore';
import type { RoomSpec } from '../core/roomGeometry';

export const VIEWBOX = { width: 1000, height: 680 };

export const ROOM_FRAME: Rect = {
  left: 90,
  top: 70,
  right: 910,
  bottom: 590,
};

export const ROOM_EYE_HEIGHT = 1.4;

export const DEFAULT_ROOM_SPEC: RoomSpec = {
  width: 5,
  height: 3,
  nearZ: 2.4,
  farZ: 5.4,
};

export const BASIC_FRAME: Rect = {
  left: 80,
  top: 90,
  right: 920,
  bottom: 610,
};

export const BASIC_WORLD = {
  width: 5,
  height: 3,
  eyeHeight: 1.5,
  nearZ: 1.2,
  farZ: 18,
};

/**
 * 基礎模式的物件可放置寬度。投影世界寬度仍維持 5 m，
 * 避免改變焦距與物件大小；這裡只放寬左右可移動的場景範圍。
 */
export const BASIC_PLACEMENT_WIDTH = 9;

export const DEFAULT_ROOM_VP_X = (ROOM_FRAME.left + ROOM_FRAME.right) / 2;
export const DEFAULT_BASIC_VP_X = 500;

export const DEFAULT_ROOM_VP_Y = vpYFromEyeHeight(
  ROOM_EYE_HEIGHT,
  ROOM_FRAME,
  DEFAULT_ROOM_SPEC.height,
);

export const DEFAULT_BASIC_VP_Y = vpYFromEyeHeight(
  BASIC_WORLD.eyeHeight,
  BASIC_FRAME,
  BASIC_WORLD.height,
);
