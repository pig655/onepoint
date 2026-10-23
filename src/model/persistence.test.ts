import { describe, expect, it } from 'vitest';
import {
  sceneFromJSON,
  sceneToJSON,
  validateSceneData,
} from './persistence';
import { createDefaultScene } from './sceneModel';
import {
  DEFAULT_BASIC_VP_Y,
  DEFAULT_ROOM_VP_Y,
} from './viewConfig';

describe('persistence：場景驗證與序列化', () => {
  it('預設場景可以完整匯出與匯入', () => {
    const scene = createDefaultScene();
    const json = sceneToJSON(scene);
    const parsed = sceneFromJSON(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.scene.room.spec).toEqual(scene.room.spec);
      expect(parsed.scene.room.vpX).toBe(scene.room.vpX);
      expect(parsed.scene.room.vpY).toBe(scene.room.vpY);
      expect(parsed.scene.basic.vpY).toBe(scene.basic.vpY);
      expect(parsed.scene.room.displayMode).toBe(scene.room.displayMode);
      expect(parsed.scene.basic.objects).toHaveLength(3);
    }
  });

  it('舊版場景沒有 vpY 時會補上預設視平線', () => {
    const legacy = JSON.parse(
      sceneToJSON(createDefaultScene()),
    ) as {
      basic: Record<string, unknown>;
      room: Record<string, unknown>;
    };
    delete legacy.basic.vpY;
    delete legacy.room.vpY;
    const parsed = validateSceneData(legacy);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.scene.basic.vpY).toBe(DEFAULT_BASIC_VP_Y);
      expect(parsed.scene.room.vpY).toBe(DEFAULT_ROOM_VP_Y);
    }
  });

  it('接受汽車、房子與道路物件', () => {
    const scene = createDefaultScene();
    scene.basic.objects.push(
      {
        id: 'road-1',
        type: 'road',
        label: '道路 A',
        x: 0,
        z: 9,
        width: 3,
        height: 0.06,
        depth: 10,
        color: '#5f6b73',
      },
      {
        id: 'car-1',
        type: 'car',
        label: '汽車 A',
        x: -0.9,
        z: 5.6,
        width: 1.5,
        height: 0.85,
        depth: 2.4,
        color: '#d85d4f',
      },
      {
        id: 'house-1',
        type: 'house',
        label: '房子 A',
        x: 0.9,
        z: 12,
        width: 2.2,
        height: 2,
        depth: 2,
        color: '#d8a24a',
      },
    );
    expect(validateSceneData(scene).ok).toBe(true);
  });

  it('拒絕超出畫布的視平線', () => {
    const roomScene = createDefaultScene();
    roomScene.room.vpY = 0;
    expect(validateSceneData(roomScene).ok).toBe(false);

    const basicScene = createDefaultScene();
    basicScene.basic.vpY = 0;
    expect(validateSceneData(basicScene).ok).toBe(false);
  });

  it('拒絕非物件與錯誤版本', () => {
    expect(validateSceneData(null).ok).toBe(false);
    expect(validateSceneData([]).ok).toBe(false);
    expect(
      validateSceneData({ ...createDefaultScene(), version: 99 }).ok,
    ).toBe(false);
  });

  it('拒絕超出房間的地板物件', () => {
    const scene = createDefaultScene();
    scene.room.floorObjects.push({
      id: 'bad',
      kind: 'floor',
      type: 'table',
      label: '錯誤物件',
      x: 0,
      z: 99,
      width: 1,
      height: 1,
      depth: 1,
      color: '#ffffff',
      accentColor: '#000000',
    });
    const result = validateSceneData(scene);
    expect(result.ok).toBe(false);
  });

  it('拒絕貼不到牆面的無效牆面物件', () => {
    const scene = createDefaultScene();
    scene.room.wallObjects.push({
      id: 'bad-wall',
      kind: 'wall',
      type: 'paintingLandscape',
      label: '錯誤掛畫',
      wall: 'back',
      u: 0.01,
      v: 0.5,
      width: 4,
      height: 1,
      color: '#ffffff',
      accentColor: '#000000',
    });
    expect(validateSceneData(scene).ok).toBe(false);
  });

  it('拒絕不合法的顏色與 JSON', () => {
    const scene = createDefaultScene();
    scene.room.wallColors.floor = 'url(javascript:alert(1))';
    expect(validateSceneData(scene).ok).toBe(false);
    expect(sceneFromJSON('{oops').ok).toBe(false);
  });
});
