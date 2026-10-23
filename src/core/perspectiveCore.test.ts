import { describe, expect, it } from 'vitest';
import {
  clampVpY,
  createCamera,
  eyeHeightFromVpY,
  projectPoint,
  screenScaleAtDepth,
  unprojectFloorPoint,
  vpYFromEyeHeight,
  type CameraSettings,
} from './perspectiveCore';
import {
  BASIC_FRAME,
  BASIC_WORLD,
  ROOM_EYE_HEIGHT,
  ROOM_FRAME,
} from '../model/viewConfig';

const roomSettings = (vpX: number): CameraSettings => ({
  frame: ROOM_FRAME,
  nearZ: 2.4,
  worldWidth: 5,
  worldHeight: 3,
  eyeHeight: ROOM_EYE_HEIGHT,
  vpX,
});

describe('perspectiveCore：固定視窗針孔投影', () => {
  it('不论透視點在哪裡，前開口四角都固定在外框上', () => {
    for (const vpX of [280, 420, 500, 680, 720]) {
      const camera = createCamera(roomSettings(vpX));
      const corners = [
        { x: -2.5, y: 3, z: 2.4 },
        { x: 2.5, y: 3, z: 2.4 },
        { x: 2.5, y: 0, z: 2.4 },
        { x: -2.5, y: 0, z: 2.4 },
      ].map((point) => projectPoint(point, camera));

      expect(corners[0].x).toBeCloseTo(ROOM_FRAME.left, 8);
      expect(corners[1].x).toBeCloseTo(ROOM_FRAME.right, 8);
      expect(corners[0].y).toBeCloseTo(ROOM_FRAME.top, 8);
      expect(corners[2].y).toBeCloseTo(ROOM_FRAME.bottom, 8);
    }
  });

  it('透視點精確落在由眼睛高度決定的視平線上', () => {
    const camera = createCamera(roomSettings(611));
    const frameHeight = ROOM_FRAME.bottom - ROOM_FRAME.top;
    const expectedHorizon =
      ROOM_FRAME.bottom -
      (ROOM_EYE_HEIGHT / 3) * frameHeight;
    expect(camera.horizonY).toBeCloseTo(expectedHorizon, 8);

    const farA = projectPoint({ x: -1, y: 1.4, z: 1_000_000 }, camera);
    const farB = projectPoint({ x: 1, y: 1.4, z: 2_000_000 }, camera);
    expect(farA.x).toBeCloseTo(611, 2);
    expect(farA.y).toBeCloseTo(expectedHorizon, 8);
    expect(farB.x).toBeCloseTo(611, 2);
    expect(farB.y).toBeCloseTo(expectedHorizon, 8);
  });

  it('深度方向的投影線延伸後通過同一個透視點', () => {
    const camera = createCamera(roomSettings(430));
    const vp = { x: camera.vpX, y: camera.horizonY };
    const nearPoint = projectPoint({ x: -2.5, y: 0, z: 2.4 }, camera);
    const farPoint = projectPoint({ x: -2.5, y: 0, z: 5.4 }, camera);

    const cross =
      (farPoint.x - nearPoint.x) * (vp.y - nearPoint.y) -
      (farPoint.y - nearPoint.y) * (vp.x - nearPoint.x);
    expect(Math.abs(cross)).toBeLessThan(1e-6);
  });

  it('同尺寸物件越遠越小，且實際尺寸與深度是不同參數', () => {
    const camera = createCamera(roomSettings(500));
    const nearWidth = screenScaleAtDepth(4, camera).x;
    const farWidth = screenScaleAtDepth(8, camera).x;
    expect(farWidth).toBeLessThan(nearWidth);
    expect(farWidth).toBeCloseTo(nearWidth / 2, 8);

    const smallAtSix = screenScaleAtDepth(6, camera).x * 1;
    const largeAtSix = screenScaleAtDepth(6, camera).x * 2;
    expect(largeAtSix).toBeCloseTo(smallAtSix * 2, 8);
    expect(smallAtSix).not.toBeCloseTo(nearWidth, 4);
  });

  it('基礎模式的外框與視平線保持固定', () => {
    const frameWidth = BASIC_FRAME.right - BASIC_FRAME.left;
    const frameHeight = BASIC_FRAME.bottom - BASIC_FRAME.top;
    const expectedHorizon =
      BASIC_FRAME.bottom -
      (BASIC_WORLD.eyeHeight / BASIC_WORLD.height) * frameHeight;

    for (const vpX of [140, 500, 860]) {
      const camera = createCamera({
        frame: BASIC_FRAME,
        nearZ: BASIC_WORLD.nearZ,
        worldWidth: BASIC_WORLD.width,
        worldHeight: BASIC_WORLD.height,
        eyeHeight: BASIC_WORLD.eyeHeight,
        vpX,
      });
      expect(camera.horizonY).toBeCloseTo(expectedHorizon, 8);
      const corner = projectPoint(
        {
          x: -BASIC_WORLD.width / 2,
          y: 0,
          z: BASIC_WORLD.nearZ,
        },
        camera,
      );
      expect(corner.x).toBeCloseTo(BASIC_FRAME.left, 8);
      expect(corner.y).toBeCloseTo(BASIC_FRAME.bottom, 8);
      expect(frameWidth).toBe(840);
    }
  });

  it('垂直移動透視點時外框固定，視平線與眼睛高度同步改變', () => {
    const low = createCamera({ ...roomSettings(500), eyeHeight: 0.8 });
    const high = createCamera({ ...roomSettings(500), eyeHeight: 2.2 });
    const corners = (camera: ReturnType<typeof createCamera>) =>
      [
        { x: -2.5, y: 3, z: 2.4 },
        { x: 2.5, y: 3, z: 2.4 },
        { x: 2.5, y: 0, z: 2.4 },
        { x: -2.5, y: 0, z: 2.4 },
      ].map((point) => projectPoint(point, camera));

    expect(low.horizonY).toBeGreaterThan(high.horizonY);
    corners(low).forEach((corner, index) => {
      expect(corner.x).toBeCloseTo(corners(high)[index].x, 8);
      expect(corner.y).toBeCloseTo(corners(high)[index].y, 8);
    });
  });

  it('視平線 Y 與眼睛高度可以互相換算並安全夾住', () => {
    const eyeHeight = 1.75;
    const vpY = vpYFromEyeHeight(eyeHeight, ROOM_FRAME, 3);
    expect(eyeHeightFromVpY(vpY, ROOM_FRAME, 3)).toBeCloseTo(
      eyeHeight,
      8,
    );
    expect(clampVpY(ROOM_FRAME.top - 100, ROOM_FRAME)).toBeGreaterThan(
      ROOM_FRAME.top,
    );
    expect(
      clampVpY(ROOM_FRAME.bottom + 100, ROOM_FRAME),
    ).toBeLessThan(ROOM_FRAME.bottom);
  });

  it('地板反投影與投影互為反運算', () => {
    const camera = createCamera(roomSettings(575));
    const canvas = projectPoint({ x: 1.2, y: 0, z: 4.7 }, camera);
    const world = unprojectFloorPoint(canvas, camera);
    expect(world).not.toBeNull();
    expect(world?.x).toBeCloseTo(1.2, 8);
    expect(world?.z).toBeCloseTo(4.7, 8);
    expect(unprojectFloorPoint({ x: 500, y: camera.horizonY }, camera)).toBeNull();
  });
});
