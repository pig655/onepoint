/**
 * 單點透視的共用數學核心。
 *
 * 世界座標：X 向右、Y 向上、Z 往房間深處。相機位於
 * (cameraX, eyeHeight, 0)，看向 +Z，沒有傾斜與滾轉。
 *
 * 投影式：
 *   u = vpX + focalX * (X - cameraX) / Z
 *   v = horizonY - focalY * (Y - eyeHeight) / Z
 *
 * 其中 focalX / focalY 由「前開口平面 Z = nearZ 必須對應固定外框」
 * 反推而來。vpX 改變時，cameraX 隨之改變；vpY 改變時，等於改變
 * eyeHeight，因此前開口外框保持不動，但深度方向的消失點仍精確落在
 * (vpX, horizonY)。
 *
 * 這是一個合法的針孔相機投影加上水平與垂直移軸（off-axis）的受約束
 * 版本；它不宣稱等同於在原地旋轉相機。詳見 README 的模型說明。
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CameraSettings {
  /** 投影畫布上的前開口外框（固定不動）。 */
  frame: Rect;
  /** 相機到前開口的距離。 */
  nearZ: number;
  /** 房間／場景的實際寬度（公尺）。 */
  worldWidth: number;
  /** 房間／場景的實際高度（公尺）。 */
  worldHeight: number;
  /** 觀察者眼睛高度（公尺）。 */
  eyeHeight: number;
  /** 視平線上的透視點 X 座標。 */
  vpX: number;
}

export interface ProjectionCamera {
  readonly frame: Rect;
  readonly nearZ: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly eyeHeight: number;
  readonly vpX: number;
  readonly horizonY: number;
  readonly focalX: number;
  readonly focalY: number;
  readonly cameraX: number;
  readonly frameCenterX: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

export const EPSILON = 1e-7;

export function createCamera(settings: CameraSettings): ProjectionCamera {
  const { frame, nearZ, worldWidth, worldHeight, eyeHeight, vpX } = settings;
  if (!(nearZ > EPSILON)) {
    throw new Error('nearZ 必須大於 0');
  }
  if (!(worldWidth > EPSILON) || !(worldHeight > EPSILON)) {
    throw new Error('場景尺寸必須大於 0');
  }
  if (frame.right <= frame.left || frame.bottom <= frame.top) {
    throw new Error('投影外框尺寸不合法');
  }

  const frameWidth = frame.right - frame.left;
  const frameHeight = frame.bottom - frame.top;
  const frameCenterX = (frame.left + frame.right) / 2;
  const focalX = (frameWidth * nearZ) / worldWidth;
  const focalY = (frameHeight * nearZ) / worldHeight;
  const horizonY = frame.bottom - (eyeHeight / worldHeight) * frameHeight;
  const cameraX = ((vpX - frameCenterX) * nearZ) / focalX;

  return {
    frame,
    nearZ,
    worldWidth,
    worldHeight,
    eyeHeight,
    vpX,
    horizonY,
    focalX,
    focalY,
    cameraX,
    frameCenterX,
    frameWidth,
    frameHeight,
  };
}

export function projectPoint(point: Vec3, camera: ProjectionCamera): Vec2 {
  if (point.z <= EPSILON) {
    throw new Error('投影點必須位於相機前方（Z > 0）');
  }
  return {
    x:
      camera.vpX +
      (camera.focalX * (point.x - camera.cameraX)) / point.z,
    y:
      camera.horizonY -
      (camera.focalY * (point.y - camera.eyeHeight)) / point.z,
  };
}

/** 將畫布座標反投影到地板平面 Y = 0。 */
export function unprojectFloorPoint(
  point: Vec2,
  camera: ProjectionCamera,
): Vec3 | null {
  const belowHorizon = point.y - camera.horizonY;
  if (belowHorizon <= EPSILON) {
    return null;
  }
  const z = (camera.focalY * camera.eyeHeight) / belowHorizon;
  if (z <= EPSILON) {
    return null;
  }
  const x =
    camera.cameraX + ((point.x - camera.vpX) * z) / camera.focalX;
  return { x, y: 0, z };
}

/** 將畫布座標反投影到指定垂直牆面。 */
export function unprojectWallPoint(
  point: Vec2,
  wall: 'left' | 'right' | 'back',
  camera: ProjectionCamera,
  worldWidth: number,
  farZ: number,
): Vec3 | null {
  const uOffset = point.x - camera.vpX;
  const vOffset = point.y - camera.horizonY;

  if (wall === 'back') {
    const z = farZ;
    return {
      x: camera.cameraX + (uOffset * z) / camera.focalX,
      y: camera.eyeHeight - (vOffset * z) / camera.focalY,
      z,
    };
  }

  if (Math.abs(uOffset) <= EPSILON) {
    return null;
  }

  const wallX = wall === 'left' ? -worldWidth / 2 : worldWidth / 2;
  const z = (camera.focalX * (wallX - camera.cameraX)) / uOffset;
  if (z <= EPSILON) {
    return null;
  }
  return {
    x: wallX,
    y: camera.eyeHeight - (vOffset * z) / camera.focalY,
    z,
  };
}

/** 某一深度上，每公尺投影到畫布的像素數。 */
export function screenScaleAtDepth(
  depth: number,
  camera: ProjectionCamera,
): { x: number; y: number } {
  if (depth <= EPSILON) {
    throw new Error('深度必須大於 0');
  }
  return {
    x: camera.focalX / depth,
    y: camera.focalY / depth,
  };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function boundsOf(points: readonly Vec2[]): Rect {
  if (points.length === 0) {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const point of points) {
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  }
  return { left, top, right, bottom };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function pointsToSvg(points: readonly Vec2[]): string {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

export function pointInPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x <
        ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + EPSILON) + pi.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

/** 讓透視點維持在前開口內，並保留安全邊界。 */
export function clampVpX(
  vpX: number,
  frame: Rect,
  marginRatio = 0.16,
): number {
  const width = frame.right - frame.left;
  return clamp(
    vpX,
    frame.left + width * marginRatio,
    frame.right - width * marginRatio,
  );
}

/** 由眼睛高度換算視平線在畫布上的 Y 座標。 */
export function vpYFromEyeHeight(
  eyeHeight: number,
  frame: Rect,
  worldHeight: number,
): number {
  const frameHeight = frame.bottom - frame.top;
  return frame.bottom - (eyeHeight / worldHeight) * frameHeight;
}

/** 由視平線的畫布 Y 座標反推眼睛高度。 */
export function eyeHeightFromVpY(
  vpY: number,
  frame: Rect,
  worldHeight: number,
): number {
  const frameHeight = frame.bottom - frame.top;
  return ((frame.bottom - vpY) / frameHeight) * worldHeight;
}

/** 讓視平線維持在前開口內，並保留安全邊界。 */
export function clampVpY(
  vpY: number,
  frame: Rect,
  marginRatio = 0.12,
): number {
  const height = frame.bottom - frame.top;
  return clamp(
    vpY,
    frame.top + height * marginRatio,
    frame.bottom - height * marginRatio,
  );
}
