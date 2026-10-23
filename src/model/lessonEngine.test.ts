import { describe, expect, it } from 'vitest';
import {
  completedTaskCount,
  evaluateTasks,
  restartTask,
} from './lessonEngine';
import {
  createDefaultScene,
  createFloorObject,
  createWallObject,
  DEFAULT_SURFACE_COLORS,
  type RoomScene,
} from './sceneModel';
import { ASSET_BY_TYPE } from './assetLibrary';
import {
  DEFAULT_ROOM_VP_X,
  DEFAULT_ROOM_VP_Y,
} from './viewConfig';

function defaults(type: string) {
  const asset = ASSET_BY_TYPE.get(type as never);
  if (!asset) {
    throw new Error(`找不到素材 ${type}`);
  }
  return {
    label: asset.label,
    width: asset.defaultWidth,
    height: asset.defaultHeight,
    depth: asset.defaultDepth,
    color: asset.defaultColor,
    accentColor: asset.defaultAccent,
  };
}

function completeAll(scene: RoomScene): RoomScene {
  scene.guides.vp = true;
  scene.progress.vpSelected = true;
  scene.vpX = 580;
  scene.progress.vpMoved = true;
  scene.guides.floorLines = true;
  scene.progress.floorLinesOpened = true;
  scene.wallObjects.push(
    createWallObject('paintingLandscape', 'back', scene, defaults('paintingLandscape')),
    createWallObject('door', 'left', scene, defaults('door')),
    createWallObject('paintingPortrait', 'right', scene, defaults('paintingPortrait')),
  );
  scene.floorObjects.push(
    createFloorObject('table', 0, defaults('table')),
  );
  scene.wallColors = {
    ...DEFAULT_SURFACE_COLORS,
    left: '#ccddee',
    right: '#bbccdd',
    back: '#eeddcc',
  };
  scene.displayMode = 'color';
  return scene;
}

describe('lessonEngine：依實際場景判定任務', () => {
  it('預設空房間不會完成任何任務', () => {
    const scene = createDefaultScene();
    expect(completedTaskCount(scene.room)).toBe(0);
  });

  it('完成全部八項任務需要相對應的場景狀態', () => {
    const scene = createDefaultScene();
    const room = completeAll(scene.room);
    const evaluated = evaluateTasks(room);
    expect(evaluated).toHaveLength(8);
    expect(evaluated.every((task) => task.result.done)).toBe(true);
  });

  it('只在後牆放直向畫不能完成「右牆直向畫」任務', () => {
    const scene = createDefaultScene();
    scene.room.wallObjects.push(
      createWallObject(
        'paintingPortrait',
        'back',
        scene.room,
        defaults('paintingPortrait'),
      ),
    );
    const task = evaluateTasks(scene.room).find(
      (item) => item.id === 'right-portrait',
    );
    expect(task?.result.done).toBe(false);
  });

  it('掛畫如果沒有貼合牆面就不算完成', () => {
    const scene = createDefaultScene();
    const object = createWallObject(
      'paintingLandscape',
      'back',
      scene.room,
      defaults('paintingLandscape'),
    );
    object.width = 100;
    scene.room.wallObjects.push(object);
    const task = evaluateTasks(scene.room).find(
      (item) => item.id === 'back-painting',
    );
    expect(task?.result.done).toBe(false);
  });

  it('只把透視點上下移動也能完成移動透視點任務', () => {
    const scene = createDefaultScene();
    scene.room.progress.vpMoved = true;
    scene.room.vpX = DEFAULT_ROOM_VP_X;
    scene.room.vpY = DEFAULT_ROOM_VP_Y + 40;

    const task = evaluateTasks(scene.room).find(
      (item) => item.id === 'move-vp',
    );
    expect(task?.result.done).toBe(true);
    expect(task?.result.progressLabel).toContain('40');
  });

  it('重設任務會移除對應物件或狀態，讓任務真正重新挑戰', () => {
    const scene = createDefaultScene();
    const room = completeAll(scene.room);

    const backReset = restartTask(room, 'back-painting');
    expect(
      backReset.wallObjects.some((object) => object.wall === 'back'),
    ).toBe(false);
    expect(
      evaluateTasks(backReset).find((task) => task.id === 'back-painting')
        ?.result.done,
    ).toBe(false);

    const moveReset = restartTask(room, 'move-vp');
    expect(moveReset.progress.vpMoved).toBe(false);
    expect(moveReset.vpX).toBe(DEFAULT_ROOM_VP_X);
    expect(moveReset.vpY).toBe(DEFAULT_ROOM_VP_Y);

    const colorReset = restartTask(room, 'color-room');
    expect(colorReset.displayMode).toBe('line');
    expect(colorReset.wallColors).toEqual(DEFAULT_SURFACE_COLORS);
  });

  it('地板線任務需要使用者真的打開開關', () => {
    const scene = createDefaultScene();
    const withoutOpen = evaluateTasks(scene.room).find(
      (task) => task.id === 'floor-lines',
    );
    expect(withoutOpen?.result.done).toBe(false);
    scene.room.guides.floorLines = true;
    scene.room.progress.floorLinesOpened = true;
    expect(
      evaluateTasks(scene.room).find((task) => task.id === 'floor-lines')
        ?.result.done,
    ).toBe(true);
  });

  it('已完成的觀察任務不會因隱藏輔助線而取消', () => {
    const scene = createDefaultScene();
    scene.room.progress.vpSelected = true;
    scene.room.progress.floorLinesOpened = true;
    scene.room.guides.vp = false;
    scene.room.guides.floorLines = false;

    const evaluated = evaluateTasks(scene.room);
    expect(
      evaluated.find((task) => task.id === 'find-vp')?.result.done,
    ).toBe(true);
    expect(
      evaluated.find((task) => task.id === 'floor-lines')?.result.done,
    ).toBe(true);
  });
});
