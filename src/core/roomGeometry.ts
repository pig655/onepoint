import type { Vec3 } from './perspectiveCore';
import { clamp } from './perspectiveCore';

export type RoomWallId = 'left' | 'back' | 'right';
export type RoomSurfaceId = RoomWallId | 'floor' | 'ceiling';

export interface RoomSpec {
  width: number;
  height: number;
  nearZ: number;
  farZ: number;
}

export interface RoomVertexMap {
  frontTopLeft: Vec3;
  frontTopRight: Vec3;
  frontBottomLeft: Vec3;
  frontBottomRight: Vec3;
  backTopLeft: Vec3;
  backTopRight: Vec3;
  backBottomLeft: Vec3;
  backBottomRight: Vec3;
}

export type RoomVertexId = keyof RoomVertexMap;

export interface RoomFace {
  id: RoomSurfaceId;
  vertices: RoomVertexId[];
}

export interface WallPlane {
  id: RoomWallId;
  topLeft: Vec3;
  topRight: Vec3;
  bottomLeft: Vec3;
  bottomRight: Vec3;
  horizontalMeters: number;
  verticalMeters: number;
}

export interface RoomGeometry {
  spec: RoomSpec;
  vertices: RoomVertexMap;
  faces: RoomFace[];
  walls: Record<RoomWallId, WallPlane>;
}

export const DEFAULT_ROOM: RoomSpec = {
  width: 5,
  height: 3,
  nearZ: 2.4,
  farZ: 5.4,
};

export const ROOM_FACE_IDS: RoomSurfaceId[] = [
  'left',
  'right',
  'back',
  'floor',
  'ceiling',
];

export function createRoomGeometry(spec: RoomSpec): RoomGeometry {
  if (spec.nearZ <= 0 || spec.farZ <= spec.nearZ) {
    throw new Error('房間深度參數不合法');
  }
  if (spec.width <= 0 || spec.height <= 0) {
    throw new Error('房間尺寸必須大於 0');
  }

  const halfWidth = spec.width / 2;
  const vertices: RoomVertexMap = {
    frontTopLeft: { x: -halfWidth, y: spec.height, z: spec.nearZ },
    frontTopRight: { x: halfWidth, y: spec.height, z: spec.nearZ },
    frontBottomLeft: { x: -halfWidth, y: 0, z: spec.nearZ },
    frontBottomRight: { x: halfWidth, y: 0, z: spec.nearZ },
    backTopLeft: { x: -halfWidth, y: spec.height, z: spec.farZ },
    backTopRight: { x: halfWidth, y: spec.height, z: spec.farZ },
    backBottomLeft: { x: -halfWidth, y: 0, z: spec.farZ },
    backBottomRight: { x: halfWidth, y: 0, z: spec.farZ },
  };

  const faces: RoomFace[] = [
    {
      id: 'left',
      vertices: [
        'frontTopLeft',
        'backTopLeft',
        'backBottomLeft',
        'frontBottomLeft',
      ],
    },
    {
      id: 'right',
      vertices: [
        'frontTopRight',
        'frontBottomRight',
        'backBottomRight',
        'backTopRight',
      ],
    },
    {
      id: 'back',
      vertices: [
        'backTopLeft',
        'backTopRight',
        'backBottomRight',
        'backBottomLeft',
      ],
    },
    {
      id: 'floor',
      vertices: [
        'frontBottomLeft',
        'frontBottomRight',
        'backBottomRight',
        'backBottomLeft',
      ],
    },
    {
      id: 'ceiling',
      vertices: [
        'frontTopLeft',
        'backTopLeft',
        'backTopRight',
        'frontTopRight',
      ],
    },
  ];

  const depth = spec.farZ - spec.nearZ;
  const walls: Record<RoomWallId, WallPlane> = {
    left: {
      id: 'left',
      topLeft: vertices.frontTopLeft,
      topRight: vertices.backTopLeft,
      bottomLeft: vertices.frontBottomLeft,
      bottomRight: vertices.backBottomLeft,
      horizontalMeters: depth,
      verticalMeters: spec.height,
    },
    right: {
      id: 'right',
      topLeft: vertices.frontTopRight,
      topRight: vertices.backTopRight,
      bottomLeft: vertices.frontBottomRight,
      bottomRight: vertices.backBottomRight,
      horizontalMeters: depth,
      verticalMeters: spec.height,
    },
    back: {
      id: 'back',
      topLeft: vertices.backTopLeft,
      topRight: vertices.backTopRight,
      bottomLeft: vertices.backBottomLeft,
      bottomRight: vertices.backBottomRight,
      horizontalMeters: spec.width,
      verticalMeters: spec.height,
    },
  };

  return { spec, vertices, faces, walls };
}

/**
 * 牆面局部座標：u 從左到右（後牆）或由近到遠（側牆），
 * v 從上到下，範圍皆為 0..1。
 */
export function wallLocalToWorld(
  geometry: RoomGeometry,
  wall: RoomWallId,
  u: number,
  v: number,
): Vec3 {
  const { spec } = geometry;
  const clampedU = clamp(u, 0, 1);
  const clampedV = clamp(v, 0, 1);
  if (wall === 'back') {
    return {
      x: -spec.width / 2 + clampedU * spec.width,
      y: spec.height - clampedV * spec.height,
      z: spec.farZ,
    };
  }
  return {
    x: wall === 'left' ? -spec.width / 2 : spec.width / 2,
    y: spec.height - clampedV * spec.height,
    z: spec.nearZ + clampedU * (spec.farZ - spec.nearZ),
  };
}

export function wallWorldToLocal(
  geometry: RoomGeometry,
  wall: RoomWallId,
  point: Vec3,
): { u: number; v: number } {
  const { spec } = geometry;
  const v = clamp((spec.height - point.y) / spec.height, 0, 1);
  if (wall === 'back') {
    return {
      u: clamp((point.x + spec.width / 2) / spec.width, 0, 1),
      v,
    };
  }
  return {
    u: clamp(
      (point.z - spec.nearZ) / (spec.farZ - spec.nearZ),
      0,
      1,
    ),
    v,
  };
}

export function wallLocalRectWorldCorners(
  geometry: RoomGeometry,
  wall: RoomWallId,
  uCenter: number,
  vCenter: number,
  widthMeters: number,
  heightMeters: number,
): [Vec3, Vec3, Vec3, Vec3] {
  const plane = geometry.walls[wall];
  const uSpan = widthMeters / plane.horizontalMeters;
  const vSpan = heightMeters / plane.verticalMeters;
  const u0 = uCenter - uSpan / 2;
  const u1 = uCenter + uSpan / 2;
  const v0 = vCenter - vSpan / 2;
  const v1 = vCenter + vSpan / 2;
  return [
    wallLocalToWorld(geometry, wall, u0, v0),
    wallLocalToWorld(geometry, wall, u1, v0),
    wallLocalToWorld(geometry, wall, u1, v1),
    wallLocalToWorld(geometry, wall, u0, v1),
  ];
}

export function wallLocalRectNormalized(
  geometry: RoomGeometry,
  wall: RoomWallId,
  uCenter: number,
  vCenter: number,
  widthMeters: number,
  heightMeters: number,
): { u0: number; u1: number; v0: number; v1: number } {
  const plane = geometry.walls[wall];
  const uSpan = widthMeters / plane.horizontalMeters;
  const vSpan = heightMeters / plane.verticalMeters;
  return {
    u0: uCenter - uSpan / 2,
    u1: uCenter + uSpan / 2,
    v0: vCenter - vSpan / 2,
    v1: vCenter + vSpan / 2,
  };
}

export function isRectInsideWall(
  geometry: RoomGeometry,
  wall: RoomWallId,
  uCenter: number,
  vCenter: number,
  widthMeters: number,
  heightMeters: number,
  tolerance = 1e-9,
): boolean {
  const rect = wallLocalRectNormalized(
    geometry,
    wall,
    uCenter,
    vCenter,
    widthMeters,
    heightMeters,
  );
  return (
    rect.u0 >= -tolerance &&
    rect.u1 <= 1 + tolerance &&
    rect.v0 >= -tolerance &&
    rect.v1 <= 1 + tolerance
  );
}

/** 將牆面物件的中心限制在牆內，並保留完整尺寸。 */
export function clampWallObjectCenter(
  geometry: RoomGeometry,
  wall: RoomWallId,
  uCenter: number,
  vCenter: number,
  widthMeters: number,
  heightMeters: number,
): { u: number; v: number } {
  const plane = geometry.walls[wall];
  const uSpan = Math.min(widthMeters / plane.horizontalMeters, 1);
  const vSpan = Math.min(heightMeters / plane.verticalMeters, 1);
  return {
    u: clamp(uCenter, uSpan / 2, 1 - uSpan / 2),
    v: clamp(vCenter, vSpan / 2, 1 - vSpan / 2),
  };
}

/** 物件的四個世界角點必須真的落在所屬牆面。 */
export function wallObjectTouchesPlane(
  geometry: RoomGeometry,
  wall: RoomWallId,
  corners: readonly Vec3[],
  tolerance = 1e-6,
): boolean {
  return corners.every((corner) => {
    if (wall === 'back') {
      return Math.abs(corner.z - geometry.spec.farZ) <= tolerance;
    }
    const expectedX =
      wall === 'left' ? -geometry.spec.width / 2 : geometry.spec.width / 2;
    if (Math.abs(corner.x - expectedX) > tolerance) {
      return false;
    }
    return (
      corner.z >= geometry.spec.nearZ - tolerance &&
      corner.z <= geometry.spec.farZ + tolerance
    );
  });
}
