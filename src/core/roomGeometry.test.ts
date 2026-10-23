import { describe, expect, it } from 'vitest';
import {
  clampWallObjectCenter,
  createRoomGeometry,
  isRectInsideWall,
  wallLocalRectWorldCorners,
  wallLocalToWorld,
  wallObjectTouchesPlane,
  wallWorldToLocal,
  type RoomSpec,
} from './roomGeometry';

const spec: RoomSpec = {
  width: 5,
  height: 3,
  nearZ: 2.4,
  farZ: 5.4,
};

describe('roomGeometry：房間拓撲與牆面座標', () => {
  it('建立共用的八個角點與五個面', () => {
    const room = createRoomGeometry(spec);
    expect(Object.keys(room.vertices)).toHaveLength(8);
    expect(room.faces.map((face) => face.id).sort()).toEqual([
      'back',
      'ceiling',
      'floor',
      'left',
      'right',
    ]);

    const shared = room.faces.reduce((count, face) => {
      return count + face.vertices.length;
    }, 0);
    expect(shared).toBe(20);
  });

  it('牆面局部座標可來回轉換', () => {
    const room = createRoomGeometry(spec);
    const walls = ['left', 'right', 'back'] as const;
    for (const wall of walls) {
      const world = wallLocalToWorld(room, wall, 0.31, 0.72);
      const local = wallWorldToLocal(room, wall, world);
      expect(local.u).toBeCloseTo(0.31, 8);
      expect(local.v).toBeCloseTo(0.72, 8);
      expect(
        wallObjectTouchesPlane(room, wall, [world]),
      ).toBe(true);
    }
  });

  it('牆面矩形角點都位在正確牆面上', () => {
    const room = createRoomGeometry(spec);
    for (const wall of ['left', 'right', 'back'] as const) {
      const corners = wallLocalRectWorldCorners(
        room,
        wall,
        0.5,
        0.45,
        0.8,
        1.2,
      );
      expect(wallObjectTouchesPlane(room, wall, corners)).toBe(true);
      expect(
        isRectInsideWall(room, wall, 0.5, 0.45, 0.8, 1.2),
      ).toBe(true);
    }
  });

  it('超過牆面的物件中心會被推回牆內', () => {
    const room = createRoomGeometry(spec);
    const clamped = clampWallObjectCenter(
      room,
      'back',
      0.02,
      0.99,
      1.3,
      0.8,
    );
    expect(clamped.u).toBeGreaterThan(0.1);
    expect(clamped.v).toBeLessThan(0.9);
    expect(
      isRectInsideWall(room, 'back', clamped.u, clamped.v, 1.3, 0.8),
    ).toBe(true);
  });
});
