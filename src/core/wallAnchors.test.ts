import { describe, expect, it } from 'vitest';
import { createRoomGeometry, type RoomSpec } from './roomGeometry';
import { createRoomCamera } from './roomProjection';
import {
  isWallObjectInsideWall,
  projectWallObject,
} from './wallAnchors';
import { ROOM_EYE_HEIGHT, ROOM_FRAME } from '../model/viewConfig';
import type { WallObject } from '../model/sceneModel';

const spec: RoomSpec = {
  width: 5,
  height: 3,
  nearZ: 2.4,
  farZ: 5.4,
};
const room = createRoomGeometry(spec);

function objectOn(
  wall: WallObject['wall'],
  type: WallObject['type'],
  u: number,
  v: number,
  width = 1,
  height = 0.8,
): WallObject {
  return {
    id: `test-${wall}`,
    kind: 'wall',
    type,
    label: '測試物件',
    wall,
    u,
    v,
    width,
    height,
    color: '#fff',
    accentColor: '#000',
  };
}

describe('wallAnchors：牆面物件錨定', () => {
  it('三面牆的物件角點都落在所屬牆面上', () => {
    for (const wall of ['left', 'right', 'back'] as const) {
      const object = objectOn(wall, 'paintingLandscape', 0.5, 0.42);
      expect(isWallObjectInsideWall(object, room)).toBe(true);
      const projected = projectWallObject(
        object,
        room,
        createRoomCamera(spec, {
          frame: ROOM_FRAME,
          vpX: 500,
          eyeHeight: ROOM_EYE_HEIGHT,
        }),
      );
      expect(projected.corners).toHaveLength(4);
    }
  });

  it('透視點移動後，牆面物件仍貼在牆上，但投影會更新', () => {
    const object = objectOn('left', 'door', 0.35, 0.6583, 1, 2.05);
    const cameraA = createRoomCamera(spec, {
      frame: ROOM_FRAME,
      vpX: 350,
      eyeHeight: ROOM_EYE_HEIGHT,
    });
    const cameraB = createRoomCamera(spec, {
      frame: ROOM_FRAME,
      vpX: 650,
      eyeHeight: ROOM_EYE_HEIGHT,
    });
    const a = projectWallObject(object, room, cameraA);
    const b = projectWallObject(object, room, cameraB);

    expect(isWallObjectInsideWall(object, room)).toBe(true);
    expect(a.corners[0].x).not.toBeCloseTo(b.corners[0].x, 2);
    for (const corner of a.worldCorners) {
      expect(corner.x).toBeCloseTo(-2.5, 8);
    }
  });

  it('後牆掛畫四角由後牆幾何與局部座標決定', () => {
    const object = objectOn('back', 'paintingLandscape', 0.5, 0.4, 1.3, 0.8);
    const projected = projectWallObject(
      object,
      room,
      createRoomCamera(spec, {
        frame: ROOM_FRAME,
        vpX: 500,
        eyeHeight: ROOM_EYE_HEIGHT,
      }),
    );
    const expectedTopLeft = {
      x: -2.5 + (0.5 - 1.3 / 5 / 2) * 5,
      y: 3 - (0.4 - 0.8 / 3 / 2) * 3,
      z: 5.4,
    };
    expect(projected.worldCorners[0]).toEqual(expectedTopLeft);
  });

  it('左右牆物件的寬度沿房間深度計算，而非畫布像素', () => {
    const wide = objectOn('right', 'paintingPortrait', 0.3, 0.4, 1.2, 1.2);
    const narrow = objectOn('right', 'paintingPortrait', 0.3, 0.4, 0.6, 1.2);
    expect(isWallObjectInsideWall(wide, room)).toBe(true);
    expect(isWallObjectInsideWall(narrow, room)).toBe(true);
    const camera = createRoomCamera(spec, {
      frame: ROOM_FRAME,
      vpX: 500,
      eyeHeight: ROOM_EYE_HEIGHT,
    });
    const projectedWide = projectWallObject(wide, room, camera);
    const projectedNarrow = projectWallObject(narrow, room, camera);
    expect(
      projectedWide.bounds.right - projectedWide.bounds.left,
    ).toBeGreaterThan(
      projectedNarrow.bounds.right - projectedNarrow.bounds.left,
    );
  });
});
