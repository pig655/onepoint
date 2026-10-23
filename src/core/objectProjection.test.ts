import { describe, expect, it } from 'vitest';
import {
  isFloorObjectAnchored,
  projectBasicObject,
  projectBox,
  projectCylinder,
  projectFloorObject,
} from './objectProjection';
import { createCamera } from './perspectiveCore';
import { ROOM_EYE_HEIGHT, ROOM_FRAME } from '../model/viewConfig';
import type {
  BasicObject,
  FloorObject,
} from '../model/sceneModel';

const cameraAt = (vpX: number) =>
  createCamera({
    frame: ROOM_FRAME,
    nearZ: 2.4,
    worldWidth: 5,
    worldHeight: 3,
    eyeHeight: ROOM_EYE_HEIGHT,
    vpX,
  });

const desk: FloorObject = {
  id: 'desk',
  kind: 'floor',
  type: 'table',
  label: '桌子',
  x: 0,
  z: 4.2,
  width: 1.4,
  height: 0.75,
  depth: 0.8,
  color: '#c08a5b',
  accentColor: '#8f5c35',
};

describe('objectProjection：立體物件與地板錨定', () => {
  it('相同實際尺寸在較深位置有較小的投影', () => {
    const camera = cameraAt(500);
    const nearBox = projectBox(
      { x: 0, z: 4, width: 1, height: 1, depth: 1 },
      camera,
    );
    const farBox = projectBox(
      { x: 0, z: 6, width: 1, height: 1, depth: 1 },
      camera,
    );
    const nearHeight = nearBox.bounds.bottom - nearBox.bounds.top;
    const farHeight = farBox.bounds.bottom - farBox.bounds.top;
    expect(farHeight).toBeLessThan(nearHeight);
  });

  it('改變實際寬度與改變深度會造成不同結果', () => {
    const camera = cameraAt(500);
    const base = projectBox(
      { x: 0, z: 4.5, width: 1, height: 1, depth: 1 },
      camera,
    );
    const wider = projectBox(
      { x: 0, z: 4.5, width: 2, height: 1, depth: 1 },
      camera,
    );
    const deeper = projectBox(
      { x: 0, z: 6.5, width: 1, height: 1, depth: 1 },
      camera,
    );
    expect(wider.bounds.right - wider.bounds.left).toBeGreaterThan(
      (base.bounds.right - base.bounds.left) * 1.8,
    );
    expect(deeper.bounds.right - deeper.bounds.left).toBeLessThan(
      base.bounds.right - base.bounds.left,
    );
  });

  it('地板物件的底面始終在地板高度', () => {
    const camera = cameraAt(500);
    const projected = projectFloorObject(desk, camera);
    expect(projected.box).not.toBeNull();
    const bottomCorners = projected.box?.worldCorners.front.slice(0, 2) ?? [];
    expect(bottomCorners).toHaveLength(2);
    expect(bottomCorners.every((p) => p.y === 0)).toBe(true);
    expect(isFloorObjectAnchored(desk, {
      width: 5,
      height: 3,
      nearZ: 2.4,
      farZ: 5.4,
    })).toBe(true);
  });

  it('移動透視點時地板物件水平投影改變，但底部仍在地板', () => {
    const a = projectFloorObject(desk, cameraAt(350));
    const b = projectFloorObject(desk, cameraAt(650));
    expect(a.bounds.left).not.toBeCloseTo(b.bounds.left, 2);
    const bottomA = a.box?.worldCorners.front[0];
    const bottomB = b.box?.worldCorners.front[0];
    expect(bottomA?.y).toBe(0);
    expect(bottomB?.y).toBe(0);
  });

  it('柱體產生上下取樣環與凸包', () => {
    const cylinder = projectCylinder(
      { x: 0, z: 4.5, width: 0.8, height: 1, depth: 0.8 },
      cameraAt(500),
    );
    expect(cylinder.bottom).toHaveLength(28);
    expect(cylinder.top).toHaveLength(28);
    expect(cylinder.hull.length).toBeGreaterThan(10);
    expect(cylinder.bounds.bottom).toBeGreaterThan(cylinder.bounds.top);
  });

  it('道路、汽車與房子都能投影出有效範圍', () => {
    const camera = cameraAt(500);
    const make = (
      type: BasicObject['type'],
      patch: Partial<BasicObject>,
    ): BasicObject => ({
      id: type,
      type,
      label: type,
      x: 0,
      z: 8,
      width: 2,
      height: 1,
      depth: 2,
      color: '#5f6b73',
      ...patch,
    });

    const road = projectBasicObject(
      make('road', {
        z: 9,
        width: 3,
        height: 0.06,
        depth: 10,
      }),
      camera,
    );
    const car = projectBasicObject(
      make('car', {
        z: 5.6,
        width: 1.5,
        height: 0.85,
        depth: 2.4,
      }),
      camera,
    );
    const house = projectBasicObject(
      make('house', {
        z: 12,
        width: 2.2,
        height: 2,
        depth: 2,
      }),
      camera,
    );

    for (const projected of [road, car, house]) {
      expect(projected.box).not.toBeNull();
      expect(projected.bounds.right).toBeGreaterThan(
        projected.bounds.left,
      );
      expect(projected.bounds.bottom).toBeGreaterThan(
        projected.bounds.top,
      );
    }
    expect(
      road.bounds.right - road.bounds.left,
    ).toBeGreaterThan(car.bounds.right - car.bounds.left);
  });

  it('物件被移到房間外時錨定檢查會失敗', () => {
    const spec = { width: 5, height: 3, nearZ: 2.4, farZ: 5.4 };
    expect(
      isFloorObjectAnchored({ ...desk, z: 6 }, spec),
    ).toBe(false);
    expect(
      isFloorObjectAnchored({ ...desk, x: 2.8 }, spec),
    ).toBe(false);
  });
});
