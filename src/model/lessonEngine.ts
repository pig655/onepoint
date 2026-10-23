import { isFloorObjectAnchored } from '../core/objectProjection';
import { pointInPolygon } from '../core/perspectiveCore';
import {
  createRoomGeometry,
  type RoomGeometry,
  type RoomSurfaceId,
} from '../core/roomGeometry';
import { createRoomCamera, projectRoom } from '../core/roomProjection';
import { isWallObjectInsideWall, projectWallObject } from '../core/wallAnchors';
import {
  coloredSurfaceCount,
  DEFAULT_SURFACE_COLORS,
  type RoomScene,
  type WallObject,
} from './sceneModel';
import {
  DEFAULT_ROOM_VP_X,
  DEFAULT_ROOM_VP_Y,
  ROOM_FRAME,
} from './viewConfig';

export interface LessonContext {
  scene: RoomScene;
  geometry: RoomGeometry;
  camera: ReturnType<typeof createRoomCamera>;
}

export interface TaskResult {
  done: boolean;
  hint: string;
  progressLabel?: string;
}

export interface LessonTask {
  id: string;
  title: string;
  instruction: string;
  goal: string;
  check: (context: LessonContext) => TaskResult;
}

export interface EvaluatedTask extends LessonTask {
  result: TaskResult;
}

export const COLOR_SURFACE_THRESHOLD = 3;

function buildContext(scene: RoomScene): LessonContext {
  const geometry = createRoomGeometry(scene.spec);
  const camera = createRoomCamera(scene.spec, {
    frame: ROOM_FRAME,
    vpX: scene.vpX,
    vpY: scene.vpY,
  });
  return { scene, geometry, camera };
}

function isPainting(object: WallObject): boolean {
  return (
    object.type === 'paintingLandscape' ||
    object.type === 'paintingPortrait' ||
    object.type === 'decorativePainting'
  );
}

function wallObjectProjectedOnWall(
  object: WallObject,
  context: LessonContext,
): boolean {
  if (!isWallObjectInsideWall(object, context.geometry)) {
    return false;
  }
  const projected = projectWallObject(
    object,
    context.geometry,
    context.camera,
  );
  const room = projectRoom(context.geometry, context.camera);
  const wallQuad = room.surfaces[object.wall];
  return projected.corners.every((corner) =>
    pointInPolygon(corner, wallQuad.corners),
  );
}

export const LESSON_TASKS: LessonTask[] = [
  {
    id: 'find-vp',
    title: '找出透視點',
    instruction: '打開「透視點」輔助線，再點一下視平線上的圓點。',
    goal: '看見透視點並選取它。',
    check: (context) => {
      const done = context.scene.progress.vpSelected;
      return {
        done,
        hint: done
          ? '找到了！所有深度線都會朝這個點聚集。'
          : '先確認透視點開關是開的，再點一下畫面上的圓點。',
      };
    },
  },
  {
    id: 'move-vp',
    title: '移動透視點',
    instruction: '把透視點左右或上下拖曳，觀察牆面與地板比例改變。',
    goal: '讓透視點離開中央至少 25 像素。',
    check: (context) => {
      const distance = Math.hypot(
        context.scene.vpX - DEFAULT_ROOM_VP_X,
        context.scene.vpY - DEFAULT_ROOM_VP_Y,
      );
      const done = context.scene.progress.vpMoved && distance >= 25;
      return {
        done,
        progressLabel: `已移動 ${Math.round(distance)} 像素`,
        hint: done
          ? '透視點移動後，牆面、地板與天花板的比例一起改變，外框仍然不動。'
          : '用滑鼠或手指抓住透視點，左右或上下移動。',
      };
    },
  },
  {
    id: 'floor-lines',
    title: '觀察地板透視線',
    instruction: '打開「地板線」，看看地板深度線最後匯聚在哪裡。',
    goal: '顯示地板線，並確認匯聚位置就是透視點。',
    check: (context) => {
      const done = context.scene.progress.floorLinesOpened;
      return {
        done,
        hint: done
          ? '地板線全部指向同一個透視點，這就是單點透視。'
          : '在右側的輔助線開關中打開「地板線」。',
      };
    },
  },
  {
    id: 'back-painting',
    title: '後牆掛一幅畫',
    instruction: '選擇「橫向掛畫」或「裝飾畫」，把牆面目標設為後牆後加入。',
    goal: '後牆上有一幅完全貼合牆面的掛畫。',
    check: (context) => {
      const done = context.scene.wallObjects.some(
        (object) =>
          object.wall === 'back' &&
          isPainting(object) &&
          wallObjectProjectedOnWall(object, context),
      );
      return {
        done,
        hint: done
          ? '掛畫的四個角都正確貼在後牆上。'
          : '把牆面目標切到「後牆」，再加入一幅掛畫。',
      };
    },
  },
  {
    id: 'left-door',
    title: '左牆加一扇門',
    instruction: '把牆面目標切到左牆，加入「門」。',
    goal: '左牆上有一扇貼齊牆面的門。',
    check: (context) => {
      const done = context.scene.wallObjects.some(
        (object) =>
          object.wall === 'left' &&
          object.type === 'door' &&
          wallObjectProjectedOnWall(object, context),
      );
      return {
        done,
        hint: done
          ? '門跟著左牆一起透視，沒有漂浮在房間中。'
          : '先選左牆，再從素材庫加入門。',
      };
    },
  },
  {
    id: 'right-portrait',
    title: '右牆掛一幅直向畫',
    instruction: '把牆面目標切到右牆，加入「直向掛畫」。',
    goal: '右牆上有一幅貼合牆面的直向掛畫。',
    check: (context) => {
      const done = context.scene.wallObjects.some(
        (object) =>
          object.wall === 'right' &&
          object.type === 'paintingPortrait' &&
          wallObjectProjectedOnWall(object, context),
      );
      return {
        done,
        hint: done
          ? '直向掛畫沿著右牆的深度方向正確變形。'
          : '把牆面目標切到「右牆」，再選「直向掛畫」。',
      };
    },
  },
  {
    id: 'floor-object',
    title: '放一件家具或植物',
    instruction: '從素材庫加入任一地板物件，再用深度滑桿調整位置。',
    goal: '房間內有至少一件穩穩站在地板上的立體物件。',
    check: (context) => {
      const done = context.scene.floorObjects.some((object) =>
        isFloorObjectAnchored(object, context.scene.spec),
      );
      return {
        done,
        hint: done
          ? '物件的底部仍然接觸地板，移動透視點也不會漂浮。'
          : '從「室內家具」或「人物與自然」加入一個物件。',
      };
    },
  },
  {
    id: 'color-room',
    title: '完成房間著色',
    instruction: '替三個以上的面換色，並切換到「彩色作品」。',
    goal: '至少三個房間面不同於預設顏色，且顯示彩色模式。',
    check: (context) => {
      const count = coloredSurfaceCount(context.scene);
      const done =
        context.scene.displayMode === 'color' &&
        count >= COLOR_SURFACE_THRESHOLD;
      return {
        done,
        progressLabel: `已換色 ${count} / 5 面`,
        hint: done
          ? '顏色只改變表面，透視線與物件位置完全沒有被破壞。'
          : `已經換了 ${count} 面；再換 ${Math.max(
              0,
              COLOR_SURFACE_THRESHOLD - count,
            )} 面並切到彩色作品。`,
      };
    },
  },
];

export function evaluateTasks(scene: RoomScene): EvaluatedTask[] {
  const context = buildContext(scene);
  return LESSON_TASKS.map((task) => ({
    ...task,
    result: task.check(context),
  }));
}

export function completedTaskCount(scene: RoomScene): number {
  return evaluateTasks(scene).filter((task) => task.result.done).length;
}

export function restartTask(scene: RoomScene, taskId: string): RoomScene {
  const room = structuredClone(scene);
  switch (taskId) {
    case 'find-vp':
      room.guides.vp = true;
      room.progress.vpSelected = false;
      break;
    case 'move-vp':
      room.vpX = DEFAULT_ROOM_VP_X;
      room.vpY = DEFAULT_ROOM_VP_Y;
      room.progress.vpMoved = false;
      break;
    case 'floor-lines':
      room.guides.floorLines = false;
      room.progress.floorLinesOpened = false;
      break;
    case 'back-painting':
      room.wallObjects = room.wallObjects.filter(
        (object) => !(object.wall === 'back' && isPainting(object)),
      );
      break;
    case 'left-door':
      room.wallObjects = room.wallObjects.filter(
        (object) =>
          !(object.wall === 'left' && object.type === 'door'),
      );
      break;
    case 'right-portrait':
      room.wallObjects = room.wallObjects.filter(
        (object) =>
          !(
            object.wall === 'right' &&
            object.type === 'paintingPortrait'
          ),
      );
      break;
    case 'floor-object':
      room.floorObjects = [];
      break;
    case 'color-room':
      room.displayMode = 'line';
      room.wallColors = {
        ...(DEFAULT_SURFACE_COLORS as Record<RoomSurfaceId, string>),
      };
      break;
    default:
      break;
  }
  return room;
}
