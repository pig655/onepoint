import { describe, expect, it } from 'vitest';
import { createRoomGeometry, type RoomSpec } from './roomGeometry';
import {
  createRoomCamera,
  createRoomGuideLines,
  projectRoom,
} from './roomProjection';
import { projectPoint } from './perspectiveCore';
import {
  DEFAULT_ROOM_VP_Y,
  ROOM_EYE_HEIGHT,
  ROOM_FRAME,
} from '../model/viewConfig';

const spec: RoomSpec = {
  width: 5,
  height: 3,
  nearZ: 2.4,
  farZ: 5.4,
};

const room = createRoomGeometry(spec);
const cameraAt = (vpX: number) =>
  createRoomCamera(spec, {
    frame: ROOM_FRAME,
    vpX,
    eyeHeight: ROOM_EYE_HEIGHT,
  });

const cameraAtY = (vpY: number) =>
  createRoomCamera(spec, {
    frame: ROOM_FRAME,
    vpX: 500,
    vpY,
  });

describe('roomProjection：房間投影與外框約束', () => {
  it('房間外框在透視點移動前後保持固定', () => {
    const before = projectRoom(room, cameraAt(360));
    const after = projectRoom(room, cameraAt(640));
    expect(before.frame.corners).toHaveLength(4);
    before.frame.corners.forEach((corner, index) => {
      expect(corner.x).toBeCloseTo(after.frame.corners[index].x, 8);
      expect(corner.y).toBeCloseTo(after.frame.corners[index].y, 8);
    });
    expect(before.frame.corners[0].x).toBeCloseTo(ROOM_FRAME.left, 8);
    expect(before.frame.corners[1].x).toBeCloseTo(ROOM_FRAME.right, 8);
  });

  it('垂直移動視平線時外框固定，眼睛高度跟著改變', () => {
    const low = projectRoom(
      room,
      cameraAtY(DEFAULT_ROOM_VP_Y - 80),
    );
    const high = projectRoom(
      room,
      cameraAtY(DEFAULT_ROOM_VP_Y + 80),
    );

    low.frame.corners.forEach((corner, index) => {
      expect(corner.x).toBeCloseTo(high.frame.corners[index].x, 8);
      expect(corner.y).toBeCloseTo(high.frame.corners[index].y, 8);
    });
    expect(low.horizonY).toBeCloseTo(DEFAULT_ROOM_VP_Y - 80, 8);
    expect(high.horizonY).toBeCloseTo(DEFAULT_ROOM_VP_Y + 80, 8);
    expect(low.camera.eyeHeight).toBeGreaterThan(
      high.camera.eyeHeight,
    );
  });

  it('透視點移動會改變後牆與左右牆，但不會撕裂共用邊', () => {
    const before = projectRoom(room, cameraAt(400));
    const after = projectRoom(room, cameraAt(600));
    expect(before.surfaces.back.corners[0].x).not.toBeCloseTo(
      after.surfaces.back.corners[0].x,
      2,
    );

    for (const projected of [before, after]) {
      expect(projected.surfaces.floor.corners[0]).toEqual(
        projected.points.frontBottomLeft,
      );
      expect(projected.surfaces.left.corners[3]).toEqual(
        projected.points.frontBottomLeft,
      );
      expect(projected.surfaces.left.corners[2]).toEqual(
        projected.points.backBottomLeft,
      );
      expect(projected.surfaces.floor.corners[3]).toEqual(
        projected.points.backBottomLeft,
      );
      expect(projected.surfaces.back.corners[0]).toEqual(
        projected.points.backTopLeft,
      );
      expect(projected.surfaces.ceiling.corners[1]).toEqual(
        projected.points.backTopLeft,
      );
    }
  });

  it('後牆永遠落在外框內，且後牆四角在同一平面', () => {
    for (const vpX of [270, 500, 730]) {
      const projected = projectRoom(room, cameraAt(vpX));
      for (const corner of projected.backWall.corners) {
        expect(corner.x).toBeGreaterThan(ROOM_FRAME.left);
        expect(corner.x).toBeLessThan(ROOM_FRAME.right);
        expect(corner.y).toBeGreaterThan(ROOM_FRAME.top);
        expect(corner.y).toBeLessThan(ROOM_FRAME.bottom);
      }
    }
  });

  it('地板與天花板的深度線都通過透視點', () => {
    const camera = cameraAt(410);
    const vp = { x: camera.vpX, y: camera.horizonY };
    const guides = createRoomGuideLines(room, camera);
    expect(guides.length).toBeGreaterThan(5);

    for (const guide of guides.filter((item) =>
      ['floor', 'ceiling', 'wall'].includes(item.kind),
    )) {
      const [a, b] = guide.points;
      const cross =
        (b.x - a.x) * (vp.y - a.y) -
        (b.y - a.y) * (vp.x - a.x);
      expect(Math.abs(cross)).toBeLessThan(1e-6);
    }
  });

  it('後牆深度線的端點連到後牆平面上的對應位置', () => {
    const camera = cameraAt(500);
    const ceilingGuide = createRoomGuideLines(room, camera, {
      ceilingCount: 1,
    }).find((guide) => guide.id === 'ceiling-1');
    expect(ceilingGuide).toBeDefined();
    expect(ceilingGuide?.points[1]).toEqual(
      projectPoint({ x: 0, y: 3, z: 5.4 }, camera),
    );
  });
});
