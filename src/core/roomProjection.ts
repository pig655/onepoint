import {
  createCamera,
  eyeHeightFromVpY,
  projectPoint,
  type CameraSettings,
  type ProjectionCamera,
  type Rect,
  type Vec2,
  type Vec3,
} from './perspectiveCore';
import {
  createRoomGeometry,
  type RoomFace,
  type RoomGeometry,
  type RoomSurfaceId,
  type RoomVertexId,
  type RoomWallId,
  type RoomSpec,
} from './roomGeometry';

export interface ProjectedQuad {
  corners: [Vec2, Vec2, Vec2, Vec2];
}

export interface ProjectedRoom {
  geometry: RoomGeometry;
  camera: ProjectionCamera;
  points: Record<RoomVertexId, Vec2>;
  frame: ProjectedQuad;
  surfaces: Record<RoomSurfaceId, ProjectedQuad>;
  backWall: ProjectedQuad;
  horizonY: number;
  vp: Vec2;
}

export type GuideKind = 'floor' | 'ceiling' | 'wall' | 'corner';

export interface RoomGuideLine {
  id: string;
  kind: GuideKind;
  points: Vec2[];
}

export interface RoomCameraOptions {
  frame: Rect;
  vpX: number;
  vpY?: number;
  eyeHeight?: number;
}

export function createRoomCamera(
  spec: RoomSpec,
  options: RoomCameraOptions,
): ProjectionCamera {
  const eyeHeight =
    options.vpY !== undefined
      ? eyeHeightFromVpY(options.vpY, options.frame, spec.height)
      : options.eyeHeight ?? 0;
  const settings: CameraSettings = {
    frame: options.frame,
    nearZ: spec.nearZ,
    worldWidth: spec.width,
    worldHeight: spec.height,
    eyeHeight,
    vpX: options.vpX,
  };
  return createCamera(settings);
}

function projectFace(
  face: RoomFace,
  points: Record<RoomVertexId, Vec2>,
): ProjectedQuad {
  return {
    corners: face.vertices.map((id) => points[id]) as [
      Vec2,
      Vec2,
      Vec2,
      Vec2,
    ],
  };
}

export function projectRoom(
  geometry: RoomGeometry,
  camera: ProjectionCamera,
): ProjectedRoom {
  const ids = Object.keys(geometry.vertices) as RoomVertexId[];
  const points = {} as Record<RoomVertexId, Vec2>;
  for (const id of ids) {
    points[id] = projectPoint(geometry.vertices[id], camera);
  }

  const surfaces = {} as Record<RoomSurfaceId, ProjectedQuad>;
  for (const face of geometry.faces) {
    surfaces[face.id] = projectFace(face, points);
  }

  return {
    geometry,
    camera,
    points,
    frame: {
      corners: [
        points.frontTopLeft,
        points.frontTopRight,
        points.frontBottomRight,
        points.frontBottomLeft,
      ],
    },
    surfaces,
    backWall: surfaces.back,
    horizonY: camera.horizonY,
    vp: { x: camera.vpX, y: camera.horizonY },
  };
}

export function projectRoomFromSpec(
  spec: RoomSpec,
  options: RoomCameraOptions,
): ProjectedRoom {
  return projectRoom(
    createRoomGeometry(spec),
    createRoomCamera(spec, options),
  );
}

/** 房間內所有主要共用邊。以相同頂點計算，確保接縫完全重合。 */
export function getRoomEdges(geometry: RoomGeometry): Array<{
  id: string;
  a: Vec3;
  b: Vec3;
}> {
  const v = geometry.vertices;
  return [
    { id: 'left-front-vertical', a: v.frontTopLeft, b: v.frontBottomLeft },
    { id: 'left-back-vertical', a: v.backTopLeft, b: v.backBottomLeft },
    { id: 'right-front-vertical', a: v.frontTopRight, b: v.frontBottomRight },
    { id: 'right-back-vertical', a: v.backTopRight, b: v.backBottomRight },
    { id: 'left-depth-top', a: v.frontTopLeft, b: v.backTopLeft },
    { id: 'left-depth-bottom', a: v.frontBottomLeft, b: v.backBottomLeft },
    { id: 'right-depth-top', a: v.frontTopRight, b: v.backTopRight },
    { id: 'right-depth-bottom', a: v.frontBottomRight, b: v.backBottomRight },
    { id: 'floor-front', a: v.frontBottomLeft, b: v.frontBottomRight },
    { id: 'floor-back', a: v.backBottomLeft, b: v.backBottomRight },
    { id: 'ceiling-front', a: v.frontTopLeft, b: v.frontTopRight },
    { id: 'ceiling-back', a: v.backTopLeft, b: v.backTopRight },
  ];
}

export interface RoomGuideOptions {
  floorCount?: number;
  ceilingCount?: number;
  wallHeightCount?: number;
  includeDepthLines?: boolean;
}

/**
 * 地板／天花板的深度線從前開口連到後牆，對應點的連線
 * 依投影式必定通過透視點 (vpX, horizonY)。
 */
export function createRoomGuideLines(
  geometry: RoomGeometry,
  camera: ProjectionCamera,
  options: RoomGuideOptions = {},
): RoomGuideLine[] {
  const { spec } = geometry;
  const floorCount = options.floorCount ?? 5;
  const ceilingCount = options.ceilingCount ?? 3;
  const wallHeightCount = options.wallHeightCount ?? 2;
  const guides: RoomGuideLine[] = [];

  const addDepthLine = (
    id: string,
    kind: GuideKind,
    near: Vec3,
    far: Vec3,
  ) => {
    guides.push({
      id,
      kind,
      points: [projectPoint(near, camera), projectPoint(far, camera)],
    });
  };

  for (let i = 1; i <= floorCount; i += 1) {
    const x = -spec.width / 2 + (spec.width * i) / (floorCount + 1);
    addDepthLine(
      `floor-${i}`,
      'floor',
      { x, y: 0, z: spec.nearZ },
      { x, y: 0, z: spec.farZ },
    );
  }

  for (let i = 1; i <= ceilingCount; i += 1) {
    const x = -spec.width / 2 + (spec.width * i) / (ceilingCount + 1);
    addDepthLine(
      `ceiling-${i}`,
      'ceiling',
      { x, y: spec.height, z: spec.nearZ },
      { x, y: spec.height, z: spec.farZ },
    );
  }

  if (options.includeDepthLines !== false) {
    for (let i = 1; i <= wallHeightCount; i += 1) {
      const y = (spec.height * i) / (wallHeightCount + 1);
      addDepthLine(
        `wall-left-${i}`,
        'wall',
        { x: -spec.width / 2, y, z: spec.nearZ },
        { x: -spec.width / 2, y, z: spec.farZ },
      );
      addDepthLine(
        `wall-right-${i}`,
        'wall',
        { x: spec.width / 2, y, z: spec.nearZ },
        { x: spec.width / 2, y, z: spec.farZ },
      );
    }
  }

  const corners = getRoomEdges(geometry);
  for (const edge of corners) {
    if (!edge.id.includes('depth')) {
      continue;
    }
    guides.push({
      id: `corner-${edge.id}`,
      kind: 'corner',
      points: [projectPoint(edge.a, camera), projectPoint(edge.b, camera)],
    });
  }

  return guides;
}

export function isPointInsideQuad(point: Vec2, quad: ProjectedQuad): boolean {
  const corners = quad.corners;
  let sign = 0;
  for (let i = 0; i < corners.length; i += 1) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const cross =
      (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (Math.abs(cross) < 1e-9) {
      continue;
    }
    const current = Math.sign(cross);
    if (sign === 0) {
      sign = current;
    } else if (sign !== current) {
      return false;
    }
  }
  return true;
}

export function roomWallQuad(
  room: ProjectedRoom,
  wall: RoomWallId,
): ProjectedQuad {
  return room.surfaces[wall];
}
