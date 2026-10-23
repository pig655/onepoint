import {
  boundsOf,
  projectPoint,
  type ProjectionCamera,
  type Rect,
  type Vec2,
  type Vec3,
} from './perspectiveCore';
import type { RoomSpec } from './roomGeometry';
import type { BasicObject, FloorObject } from '../model/sceneModel';

export type BoxFaceName =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom';

export interface Box3D {
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  baseY?: number;
}

export interface ProjectedBox {
  box: Box3D;
  worldCorners: Record<BoxFaceName, [Vec3, Vec3, Vec3, Vec3]>;
  faces: Record<BoxFaceName, [Vec2, Vec2, Vec2, Vec2]>;
  visibleFaces: BoxFaceName[];
  bounds: Rect;
  depth: number;
}

export interface ProjectedCylinder {
  box: Box3D;
  bottom: Vec2[];
  top: Vec2[];
  hull: Vec2[];
  bounds: Rect;
  depth: number;
}

export interface FloorObjectProjection {
  box: ProjectedBox | null;
  cylinder: ProjectedCylinder | null;
  bounds: Rect;
}

function boxFacePolygons(
  box: Box3D,
  camera: ProjectionCamera,
): {
  worldCorners: Record<BoxFaceName, [Vec3, Vec3, Vec3, Vec3]>;
  faces: Record<BoxFaceName, [Vec2, Vec2, Vec2, Vec2]>;
} {
  const minX = box.x - box.width / 2;
  const maxX = box.x + box.width / 2;
  const minY = box.baseY ?? 0;
  const maxY = minY + box.height;
  const minZ = box.z - box.depth / 2;
  const maxZ = box.z + box.depth / 2;

  const worldCorners: Record<BoxFaceName, [Vec3, Vec3, Vec3, Vec3]> = {
    front: [
      { x: minX, y: minY, z: minZ },
      { x: maxX, y: minY, z: minZ },
      { x: maxX, y: maxY, z: minZ },
      { x: minX, y: maxY, z: minZ },
    ],
    back: [
      { x: minX, y: minY, z: maxZ },
      { x: minX, y: maxY, z: maxZ },
      { x: maxX, y: maxY, z: maxZ },
      { x: maxX, y: minY, z: maxZ },
    ],
    left: [
      { x: minX, y: minY, z: minZ },
      { x: minX, y: minY, z: maxZ },
      { x: minX, y: maxY, z: maxZ },
      { x: minX, y: maxY, z: minZ },
    ],
    right: [
      { x: maxX, y: minY, z: minZ },
      { x: maxX, y: maxY, z: minZ },
      { x: maxX, y: maxY, z: maxZ },
      { x: maxX, y: minY, z: maxZ },
    ],
    top: [
      { x: minX, y: maxY, z: minZ },
      { x: maxX, y: maxY, z: minZ },
      { x: maxX, y: maxY, z: maxZ },
      { x: minX, y: maxY, z: maxZ },
    ],
    bottom: [
      { x: minX, y: minY, z: minZ },
      { x: minX, y: minY, z: maxZ },
      { x: maxX, y: minY, z: maxZ },
      { x: maxX, y: minY, z: minZ },
    ],
  };

  const faces = {} as Record<
    BoxFaceName,
    [Vec2, Vec2, Vec2, Vec2]
  >;
  for (const name of Object.keys(worldCorners) as BoxFaceName[]) {
    faces[name] = worldCorners[name].map((corner) =>
      projectPoint(corner, camera),
    ) as [Vec2, Vec2, Vec2, Vec2];
  }

  return { worldCorners, faces };
}

export function projectBox(
  box: Box3D,
  camera: ProjectionCamera,
): ProjectedBox {
  const { worldCorners, faces } = boxFacePolygons(box, camera);
  const visibleFaces: BoxFaceName[] = [];

  if (camera.eyeHeight > (box.baseY ?? 0) + box.height + 1e-9) {
    visibleFaces.push('top');
  }
  if (camera.cameraX < box.x - box.width / 2 - 1e-9) {
    visibleFaces.push('left');
  } else if (camera.cameraX > box.x + box.width / 2 + 1e-9) {
    visibleFaces.push('right');
  }
  visibleFaces.push('front');

  const allPoints = Object.values(faces).flat();
  return {
    box,
    worldCorners,
    faces,
    visibleFaces,
    bounds: boundsOf(allPoints),
    depth: box.z,
  };
}

export function floorObjectToBox(object: FloorObject): Box3D {
  return {
    x: object.x,
    z: object.z,
    width: object.width,
    height: object.height,
    depth: object.depth,
    baseY: 0,
  };
}

export function projectFloorObject(
  object: FloorObject,
  camera: ProjectionCamera,
): FloorObjectProjection {
  const box = floorObjectToBox(object);
  if (object.type === 'cylinder') {
    const cylinder = projectCylinder(box, camera);
    return { box: null, cylinder, bounds: cylinder.bounds };
  }
  const projected = projectBox(box, camera);
  return { box: projected, cylinder: null, bounds: projected.bounds };
}

export function projectBasicObject(
  object: BasicObject,
  camera: ProjectionCamera,
): FloorObjectProjection {
  const box: Box3D = {
    x: object.x,
    z: object.z,
    width: object.width,
    height: object.height,
    depth: object.depth,
    baseY: 0,
  };
  if (object.type === 'cylinder') {
    const cylinder = projectCylinder(box, camera);
    return { box: null, cylinder, bounds: cylinder.bounds };
  }
  const projected = projectBox(box, camera);
  return { box: projected, cylinder: null, bounds: projected.bounds };
}

export function projectCylinder(
  box: Box3D,
  camera: ProjectionCamera,
  segments = 28,
): ProjectedCylinder {
  const radius = box.width / 2;
  const baseY = box.baseY ?? 0;
  const bottom: Vec2[] = [];
  const top: Vec2[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const x = box.x + Math.cos(angle) * radius;
    const z = box.z + Math.sin(angle) * radius;
    bottom.push(projectPoint({ x, y: baseY, z }, camera));
    top.push(projectPoint({ x, y: baseY + box.height, z }, camera));
  }
  const hull = convexHull([...bottom, ...top]);
  return {
    box,
    bottom,
    top,
    hull,
    bounds: boundsOf(hull),
    depth: box.z,
  };
}

export function convexHull(points: Vec2[]): Vec2[] {
  if (points.length <= 3) {
    return [...points];
  }
  const sorted = [...points].sort((a, b) =>
    a.x === b.x ? a.y - b.y : a.x - b.x,
  );
  const cross = (o: Vec2, a: Vec2, b: Vec2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Vec2[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

export function clampFloorObjectToRoom(
  object: FloorObject,
  spec: RoomSpec,
): FloorObject {
  const halfWidth = spec.width / 2;
  const halfDepth = object.depth / 2;
  const halfWidthObject = object.width / 2;
  return {
    ...object,
    x: Math.min(
      halfWidth - halfWidthObject,
      Math.max(-halfWidth + halfWidthObject, object.x),
    ),
    z: Math.min(
      spec.farZ - halfDepth,
      Math.max(spec.nearZ + halfDepth, object.z),
    ),
    height: Math.min(object.height, spec.height),
  };
}

export function isFloorObjectAnchored(
  object: FloorObject,
  spec: RoomSpec,
): boolean {
  return (
    object.z - object.depth / 2 >= spec.nearZ - 1e-6 &&
    object.z + object.depth / 2 <= spec.farZ + 1e-6 &&
    object.x - object.width / 2 >= -spec.width / 2 - 1e-6 &&
    object.x + object.width / 2 <= spec.width / 2 + 1e-6 &&
    object.height > 0
  );
}

/** 將畫布拖曳位置限制在房間地板內。 */
export function limitFloorPointToRoom(
  point: { x: number; z: number },
  object: FloorObject,
  spec: RoomSpec,
): { x: number; z: number } {
  return clampFloorObjectToRoom(
    {
      ...object,
      x: point.x,
      z: point.z,
    },
    spec,
  );
}
