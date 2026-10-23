import {
  boundsOf,
  projectPoint,
  type ProjectionCamera,
  type Rect,
  type Vec2,
  type Vec3,
} from './perspectiveCore';
import {
  isRectInsideWall,
  wallLocalRectNormalized,
  wallLocalRectWorldCorners,
  wallLocalToWorld,
  wallObjectTouchesPlane,
  wallWorldToLocal,
  type RoomGeometry,
  type RoomWallId,
} from './roomGeometry';
import type { WallObject } from '../model/sceneModel';

export interface ProjectedWallObject {
  object: WallObject;
  worldCorners: [Vec3, Vec3, Vec3, Vec3];
  corners: [Vec2, Vec2, Vec2, Vec2];
  bounds: Rect;
  normalized: { u0: number; u1: number; v0: number; v1: number };
}

export function getWallObjectWorldCorners(
  object: WallObject,
  geometry: RoomGeometry,
): [Vec3, Vec3, Vec3, Vec3] {
  return wallLocalRectWorldCorners(
    geometry,
    object.wall,
    object.u,
    object.v,
    object.width,
    object.height,
  );
}

export function projectWallObject(
  object: WallObject,
  geometry: RoomGeometry,
  camera: ProjectionCamera,
): ProjectedWallObject {
  const worldCorners = getWallObjectWorldCorners(object, geometry);
  const corners = worldCorners.map((corner) =>
    projectPoint(corner, camera),
  ) as [Vec2, Vec2, Vec2, Vec2];
  const normalized = wallLocalRectNormalized(
    geometry,
    object.wall,
    object.u,
    object.v,
    object.width,
    object.height,
  );
  return {
    object,
    worldCorners,
    corners,
    bounds: boundsOf(corners),
    normalized,
  };
}

/** 物件內部的局部座標 (0..1, 0..1) 投影到畫布。 */
export function projectWallObjectLocalPoint(
  object: WallObject,
  geometry: RoomGeometry,
  camera: ProjectionCamera,
  localU: number,
  localV: number,
): Vec2 {
  const rect = wallLocalRectNormalized(
    geometry,
    object.wall,
    object.u,
    object.v,
    object.width,
    object.height,
  );
  const u = rect.u0 + (rect.u1 - rect.u0) * localU;
  const v = rect.v0 + (rect.v1 - rect.v0) * localV;
  return projectPoint(wallLocalToWorld(geometry, object.wall, u, v), camera);
}

export function isWallObjectInsideWall(
  object: WallObject,
  geometry: RoomGeometry,
): boolean {
  const inside = isRectInsideWall(
    geometry,
    object.wall,
    object.u,
    object.v,
    object.width,
    object.height,
    1e-8,
  );
  if (!inside) {
    return false;
  }
  const corners = getWallObjectWorldCorners(object, geometry);
  return wallObjectTouchesPlane(geometry, object.wall, corners);
}

/** 從畫布點反推牆面局部座標，供拖曳牆面物件使用。 */
export function wallObjectCenterFromCanvas(
  canvasPoint: Vec2,
  wall: RoomWallId,
  geometry: RoomGeometry,
  camera: ProjectionCamera,
): { u: number; v: number } | null {
  const uOffset = canvasPoint.x - camera.vpX;
  const vOffset = canvasPoint.y - camera.horizonY;
  let world: Vec3 | null = null;

  if (wall === 'back') {
    const z = geometry.spec.farZ;
    world = {
      x: camera.cameraX + (uOffset * z) / camera.focalX,
      y: camera.eyeHeight - (vOffset * z) / camera.focalY,
      z,
    };
  } else {
    if (Math.abs(uOffset) < 1e-7) {
      return null;
    }
    const wallX =
      wall === 'left'
        ? -geometry.spec.width / 2
        : geometry.spec.width / 2;
    const z = (camera.focalX * (wallX - camera.cameraX)) / uOffset;
    if (z <= 0) {
      return null;
    }
    world = {
      x: wallX,
      y: camera.eyeHeight - (vOffset * z) / camera.focalY,
      z,
    };
  }

  return wallWorldToLocal(geometry, wall, world);
}

export function wallObjectLocalFromCanvas(
  canvasPoint: Vec2,
  object: WallObject,
  geometry: RoomGeometry,
  camera: ProjectionCamera,
): { u: number; v: number } | null {
  return wallObjectCenterFromCanvas(
    canvasPoint,
    object.wall,
    geometry,
    camera,
  );
}
