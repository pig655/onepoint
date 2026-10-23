import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  clampFloorObjectToRoom,
  projectFloorObject,
} from '../core/objectProjection';
import type { RoomSurfaceId, RoomWallId } from '../core/roomGeometry';
import {
  clampWallObjectCenter,
  createRoomGeometry,
} from '../core/roomGeometry';
import {
  createRoomCamera,
  projectRoom,
} from '../core/roomProjection';
import {
  projectWallObject,
} from '../core/wallAnchors';
import {
  ASSET_BY_TYPE,
  ASSET_CATEGORIES,
  type AssetCategory,
  type AssetType,
  type WallAssetType,
} from '../model/assetLibrary';
import {
  evaluateTasks,
  restartTask,
} from '../model/lessonEngine';
import {
  createFloorObject,
  createId,
  createWallObject,
  findObject,
  STAGE_LABELS,
  SURFACE_LABELS,
  WALL_LABELS,
  type DisplayMode,
  type FloorObject,
  type RoomGuides,
  type RoomScene,
  type RoomStage,
  type Scene,
  type WallObject,
} from '../model/sceneModel';
import {
  DEFAULT_ROOM_VP_X,
  DEFAULT_ROOM_VP_Y,
  ROOM_FRAME,
} from '../model/viewConfig';
import { RoomCanvas } from '../render/RoomCanvas';
import { exportSvgAsPng } from '../utils/exportPng';
import type { Selection } from './selection';

interface RoomModeProps {
  scene: Scene;
  update: (
    updater: (scene: Scene) => Scene,
    record?: boolean,
  ) => void;
  beginTransaction: () => void;
  endTransaction: () => void;
  notify: (message: string) => void;
}

type RightTab = 'properties' | 'guides' | 'lesson';

const DISPLAY_MODES: Array<{ id: DisplayMode; label: string }> = [
  { id: 'line', label: '黑白線稿' },
  { id: 'guides', label: '輔助線' },
  { id: 'finished', label: '完成線稿' },
  { id: 'color', label: '彩色作品' },
];

const GUIDE_ITEMS: Array<{
  key: keyof RoomGuides;
  label: string;
  hint: string;
}> = [
  { key: 'horizon', label: '視平線', hint: '眼睛高度所在的水平線' },
  { key: 'vp', label: '透視點', hint: '所有深度線的匯聚點' },
  { key: 'floorLines', label: '地板線', hint: '地板往深處的線' },
  { key: 'ceilingLines', label: '天花板線', hint: '天花板往深處的線' },
  { key: 'wallDepthLines', label: '牆面深度線', hint: '左右牆的深度輔助線' },
  { key: 'objectLines', label: '物件透視線', hint: '物件與透視點的關係' },
];

function assetDefaults(asset: {
  label: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth: number;
  defaultColor: string;
  defaultAccent: string;
}) {
  return {
    label: asset.label,
    width: asset.defaultWidth,
    height: asset.defaultHeight,
    depth: asset.defaultDepth,
    color: asset.defaultColor,
    accentColor: asset.defaultAccent,
  };
}

export function RoomMode({
  scene,
  update,
  beginTransaction,
  endTransaction,
  notify,
}: RoomModeProps) {
  const room = scene.room;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [rightTab, setRightTab] = useState<RightTab>('properties');
  const [category, setCategory] =
    useState<AssetCategory>('wall');
  const [wallTarget, setWallTarget] =
    useState<RoomWallId>('back');

  const geometry = useMemo(
    () => createRoomGeometry(room.spec),
    [room.spec],
  );
  const camera = useMemo(
    () =>
      createRoomCamera(room.spec, {
        frame: ROOM_FRAME,
        vpX: room.vpX,
        vpY: room.vpY,
      }),
    [room.spec, room.vpX, room.vpY],
  );
  const projected = useMemo(
    () => projectRoom(geometry, camera),
    [geometry, camera],
  );
  const tasks = useMemo(() => evaluateTasks(room), [room]);
  const completed = tasks.filter((task) => task.result.done).length;

  const selectedObject = findObject(
    room,
    selection?.kind === 'object' ? selection.id : null,
  );

  const setRoom = (
    updater: (room: RoomScene) => RoomScene,
    record = true,
  ) => {
    update(
      (current) => ({
        ...current,
        mode: 'room',
        room: updater(current.room),
      }),
      record,
    );
  };

  useEffect(() => {
    if (
      selection?.kind === 'object' &&
      !findObject(room, selection.id)
    ) {
      setSelection(null);
    }
  }, [room, selection]);

  const previousCompleted = useRef<Set<string>>(new Set());
  useEffect(() => {
    const doneIds = tasks
      .filter((task) => task.result.done)
      .map((task) => task.id);
    const newly = doneIds.filter(
      (id) => !previousCompleted.current.has(id),
    );
    if (newly.length > 0 && previousCompleted.current.size >= 0) {
      const task = tasks.find((item) => item.id === newly[0]);
      if (task) {
        notify(`任務完成：${task.title}`);
      }
    }
    previousCompleted.current = new Set(doneIds);
  }, [tasks, notify]);

  const selectObject = (id: string | null) => {
    if (!id) {
      setSelection(null);
      return;
    }
    setSelection({ kind: 'object', id });
    setRightTab('properties');
  };

  const selectSurface = (surface: RoomSurfaceId) => {
    setSelection({ kind: 'surface', id: surface });
    setRightTab('properties');
  };

  const selectVp = () => {
    setSelection({ kind: 'vp' });
    setRightTab('properties');
    setRoom(
      (current) => ({
        ...current,
        guides: { ...current.guides, vp: true },
        progress: { ...current.progress, vpSelected: true },
      }),
      false,
    );
  };

  const moveVp = (vpX: number, vpY: number) => {
    setRoom((current) => {
      const moved =
        current.progress.vpMoved ||
        Math.hypot(
          vpX - DEFAULT_ROOM_VP_X,
          vpY - DEFAULT_ROOM_VP_Y,
        ) >= 25;
      return {
        ...current,
        vpX,
        vpY,
        progress: {
          ...current.progress,
          vpSelected: true,
          vpMoved: moved,
        },
      };
    }, false);
  };

  const moveFloorObject = (id: string, x: number, z: number) => {
    setRoom((current) => ({
      ...current,
      floorObjects: current.floorObjects.map((object) =>
        object.id === id
          ? clampFloorObjectToRoom({ ...object, x, z }, current.spec)
          : object,
      ),
    }), false);
  };

  const moveWallObject = (id: string, u: number, v: number) => {
    setRoom((current) => {
      const currentGeometry = createRoomGeometry(current.spec);
      return {
        ...current,
        wallObjects: current.wallObjects.map((object) => {
          if (object.id !== id) {
            return object;
          }
          const center = clampWallObjectCenter(
            currentGeometry,
            object.wall,
            u,
            v,
            object.width,
            object.height,
          );
          return { ...object, ...center };
        }),
      };
    }, false);
  };

  const addAsset = (type: AssetType) => {
    const asset = ASSET_BY_TYPE.get(type);
    if (!asset) {
      return;
    }
    if (asset.placement === 'wall') {
      const object = createWallObject(
        type as WallAssetType,
        wallTarget,
        room,
        assetDefaults(asset),
      );
      const center = clampWallObjectCenter(
        geometry,
        object.wall,
        object.u,
        object.v,
        object.width,
        object.height,
      );
      const next = { ...object, ...center };
      setRoom((current) => ({
        ...current,
        stage: current.stage === 'empty' ? 'decorate' : current.stage,
        wallObjects: [...current.wallObjects, next],
      }));
      setSelection({ kind: 'object', id: next.id });
      setRightTab('properties');
      notify(`已加入${asset.label}到${WALL_LABELS[wallTarget]}`);
      return;
    }
    const object = createFloorObject(
      type as FloorObject['type'],
      room.floorObjects.length,
      assetDefaults(asset),
    );
    const next = clampFloorObjectToRoom(object, room.spec);
    setRoom((current) => ({
      ...current,
      stage: current.stage === 'empty' ? 'decorate' : current.stage,
      floorObjects: [...current.floorObjects, next],
    }));
    setSelection({ kind: 'object', id: next.id });
    setRightTab('properties');
    notify(`已加入${asset.label}`);
  };

  const updateWallObject = (
    id: string,
    patch: Partial<WallObject>,
  ) => {
    setRoom((current) => {
      const currentGeometry = createRoomGeometry(current.spec);
      return {
        ...current,
        wallObjects: current.wallObjects.map((object) => {
          if (object.id !== id) {
            return object;
          }
          const candidate = { ...object, ...patch };
          const center = clampWallObjectCenter(
            currentGeometry,
            candidate.wall,
            candidate.u,
            candidate.v,
            candidate.width,
            candidate.height,
          );
          return { ...candidate, ...center };
        }),
      };
    });
  };

  const updateFloorObject = (
    id: string,
    patch: Partial<FloorObject>,
  ) => {
    setRoom((current) => ({
      ...current,
      floorObjects: current.floorObjects.map((object) =>
        object.id === id
          ? clampFloorObjectToRoom(
              { ...object, ...patch },
              current.spec,
            )
          : object,
      ),
    }));
  };

  const duplicateSelected = () => {
    if (!selectedObject) {
      return;
    }
    if (selectedObject.kind === 'wall') {
      const center = clampWallObjectCenter(
        geometry,
        selectedObject.wall,
        selectedObject.u + 0.06,
        selectedObject.v + 0.03,
        selectedObject.width,
        selectedObject.height,
      );
      const copy: WallObject = {
        ...selectedObject,
        id: createId('wall'),
        label: `${selectedObject.label} 複本`,
        ...center,
      };
      setRoom((current) => ({
        ...current,
        wallObjects: [...current.wallObjects, copy],
      }));
      setSelection({ kind: 'object', id: copy.id });
    } else {
      const copy: FloorObject = clampFloorObjectToRoom(
        {
          ...selectedObject,
          id: createId('floor'),
          label: `${selectedObject.label} 複本`,
          x: selectedObject.x + 0.25,
        },
        room.spec,
      );
      setRoom((current) => ({
        ...current,
        floorObjects: [...current.floorObjects, copy],
      }));
      setSelection({ kind: 'object', id: copy.id });
    }
    notify('已複製物件');
  };

  const deleteSelected = () => {
    if (!selectedObject) {
      return;
    }
    if (selectedObject.kind === 'wall') {
      setRoom((current) => ({
        ...current,
        wallObjects: current.wallObjects.filter(
          (object) => object.id !== selectedObject.id,
        ),
      }));
    } else {
      setRoom((current) => ({
        ...current,
        floorObjects: current.floorObjects.filter(
          (object) => object.id !== selectedObject.id,
        ),
      }));
    }
    setSelection(null);
    notify('已刪除物件');
  };

  const toggleGuide = (key: keyof RoomGuides) => {
    setRoom((current) => ({
      ...current,
      guides: {
        ...current.guides,
        [key]: !current.guides[key],
      },
      progress:
        key === 'floorLines'
          ? {
              ...current.progress,
              floorLinesOpened:
                current.progress.floorLinesOpened ||
                !current.guides.floorLines,
            }
          : current.progress,
    }));
  };

  const applyDisplayMode = (mode: DisplayMode) => {
    setRoom((current) => ({
      ...current,
      displayMode: mode,
      guides:
        mode === 'guides'
          ? {
              horizon: true,
              vp: true,
              floorLines: true,
              ceilingLines: true,
              wallDepthLines: true,
              objectLines: true,
            }
          : {
              ...current.guides,
              horizon: false,
              vp: false,
              floorLines: false,
              ceilingLines: false,
              wallDepthLines: false,
              objectLines: false,
            },
      progress:
        mode === 'guides'
          ? { ...current.progress, floorLinesOpened: true }
          : current.progress,
    }));
  };

  const resetVp = () => {
    setRoom((current) => ({
      ...current,
      vpX: DEFAULT_ROOM_VP_X,
      vpY: DEFAULT_ROOM_VP_Y,
      progress: { ...current.progress, vpMoved: false },
    }));
    notify('透視點已回到中央');
  };

  const exportPng = async () => {
    if (!svgRef.current) {
      return;
    }
    try {
      await exportSvgAsPng(
        svgRef.current,
        `單點透視房間-${new Date().toISOString().slice(0, 10)}.png`,
      );
      notify('PNG 已匯出');
    } catch {
      notify('PNG 匯出失敗，請再試一次');
    }
  };

  const wallSelection =
    selection?.kind === 'surface' ? selection.id : null;

  return (
    <div className="mode-page room-mode">
      <div className="mode-toolbar room-toolbar">
        <div className="stage-tabs" role="tablist" aria-label="房間學習階段">
          {(['empty', 'decorate', 'finish'] as RoomStage[]).map(
            (stage, index) => (
              <button
                key={stage}
                type="button"
                className={`stage-tab ${
                  room.stage === stage ? 'active' : ''
                }`}
                data-testid={`stage-${stage}`}
                onClick={() =>
                  setRoom((current) => ({ ...current, stage }))
                }
              >
                <span className="stage-number">{index + 1}</span>
                {STAGE_LABELS[stage]}
              </button>
            ),
          )}
        </div>

        <div className="display-mode-group" aria-label="顯示方式">
          {DISPLAY_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`chip ${
                room.displayMode === mode.id ? 'active' : ''
              }`}
              data-testid={`display-mode-${mode.id}`}
              onClick={() => applyDisplayMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="toolbar-inline">
          <button
            type="button"
            className="btn ghost"
            onClick={resetVp}
            data-testid="reset-vp"
          >
            重設透視點
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={exportPng}
            data-testid="export-png"
          >
            匯出 PNG
          </button>
        </div>
      </div>

      <div className="workspace room-workspace">
        <aside className="panel left-panel">
          <div className="panel-heading">
            <h2>素材庫</h2>
            <p>先選牆面，再挑一個物件加入。</p>
          </div>

          <div className="category-tabs">
            {ASSET_CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`category-tab ${
                  category === item.id ? 'active' : ''
                }`}
                data-testid={`category-${item.id}`}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {category === 'wall' && (
            <div className="wall-target">
              <div className="mini-label">牆面目標</div>
              <div className="segmented">
                {(['left', 'back', 'right'] as RoomWallId[]).map(
                  (wall) => (
                    <button
                      key={wall}
                      type="button"
                      className={`segment ${
                        wallTarget === wall ? 'active' : ''
                      }`}
                      data-testid={`wall-target-${wall}`}
                      onClick={() => setWallTarget(wall)}
                    >
                      {WALL_LABELS[wall]}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          <div className="asset-grid">
            {ASSET_BY_TYPE.size > 0 &&
              Array.from(ASSET_BY_TYPE.values())
                .filter((asset) => asset.category === category)
                .map((asset) => (
                  <button
                    key={asset.type}
                    type="button"
                    className="asset-card"
                    data-testid={`asset-${asset.type}`}
                    onClick={() => addAsset(asset.type)}
                    title={asset.description}
                  >
                    <AssetGlyph glyph={asset.glyph} />
                    <span>{asset.label}</span>
                    <small>
                      {asset.placement === 'wall'
                        ? WALL_LABELS[asset.preferredWall ?? 'back']
                        : `${asset.defaultWidth} × ${asset.defaultHeight} m`}
                    </small>
                  </button>
                ))}
          </div>

          <div className="panel-note">
            <strong>小提醒</strong>
            <span>
              牆面物件儲存的是「牆面局部座標」，不是畫布像素。
            </span>
          </div>
        </aside>

        <main className="canvas-panel">
          <div className="canvas-frame">
            <RoomCanvas
              scene={room}
              projected={projected}
              selection={selection}
              onSelectObject={selectObject}
              onSelectSurface={selectSurface}
              onSelectVp={selectVp}
              onDragStart={beginTransaction}
              onDragEnd={endTransaction}
              onVpMove={moveVp}
              onFloorObjectMove={moveFloorObject}
              onWallObjectMove={moveWallObject}
              svgRef={svgRef}
            />
          </div>
          <div className="canvas-meta">
            <div>
              <span className="meta-dot" />
              固定外框：X {ROOM_FRAME.left}–{ROOM_FRAME.right} · Y{' '}
              {ROOM_FRAME.top}–{ROOM_FRAME.bottom}
            </div>
            <div>
              透視點 X {Math.round(room.vpX)} · 視平線 Y{' '}
              {Math.round(camera.horizonY)} · 眼睛高度{' '}
              {camera.eyeHeight.toFixed(2)} m
            </div>
            <div>
              房間 {room.spec.width} × {room.spec.height} m · 深度{' '}
              {room.spec.nearZ}–{room.spec.farZ} m
            </div>
          </div>
        </main>

        <aside className="panel right-panel">
          <div className="panel-tabs">
            <button
              type="button"
              className={rightTab === 'properties' ? 'active' : ''}
              onClick={() => setRightTab('properties')}
            >
              屬性與著色
            </button>
            <button
              type="button"
              className={rightTab === 'guides' ? 'active' : ''}
              onClick={() => setRightTab('guides')}
            >
              輔助線
            </button>
            <button
              type="button"
              className={rightTab === 'lesson' ? 'active' : ''}
              onClick={() => setRightTab('lesson')}
              data-testid="open-lessons"
            >
              任務 {completed}/8
            </button>
          </div>

          {rightTab === 'properties' && (
            <div className="panel-scroll">
              {selection?.kind === 'vp' && (
                <div className="info-card accent">
                  <h3>透視點</h3>
                  <p>
                    透視點可以左右與上下拖曳。上下移動會改變視平線與眼睛高度，
                    前開口外框仍保持固定，所有深度線都會匯聚到這個點。
                  </p>
                  <div className="stat-row">
                    <span>X</span>
                    <strong>{Math.round(room.vpX)}</strong>
                  </div>
                  <div className="stat-row">
                    <span>視平線 Y</span>
                    <strong>{Math.round(camera.horizonY)}</strong>
                  </div>
                  <div className="stat-row">
                    <span>眼睛高度</span>
                    <strong>{camera.eyeHeight.toFixed(2)} m</strong>
                  </div>
                </div>
              )}

              {selectedObject?.kind === 'wall' && (
                <WallProperties
                  object={selectedObject}
                  room={room}
                  camera={camera}
                  geometry={geometry}
                  onChange={(patch) =>
                    updateWallObject(selectedObject.id, patch)
                  }
                  onDuplicate={duplicateSelected}
                  onDelete={deleteSelected}
                />
              )}

              {selectedObject?.kind === 'floor' && (
                <FloorProperties
                  object={selectedObject}
                  room={room}
                  camera={camera}
                  onChange={(patch) =>
                    updateFloorObject(selectedObject.id, patch)
                  }
                  onDuplicate={duplicateSelected}
                  onDelete={deleteSelected}
                />
              )}

              {selection?.kind === 'surface' && (
                <div className="info-card accent">
                  <h3>{SURFACE_LABELS[selection.id]}</h3>
                  <p>
                    著色只會改變這一面的顏色，不會移動牆角或破壞透視。
                  </p>
                  <ColorField
                    label={`${SURFACE_LABELS[selection.id]}顏色`}
                    value={room.wallColors[selection.id]}
                    testId={`surface-selected-color-${selection.id}`}
                    onChange={(color) =>
                      setRoom((current) => ({
                        ...current,
                        wallColors: {
                          ...current.wallColors,
                          [selection.id]: color,
                        },
                      }))
                    }
                  />
                </div>
              )}

              {!selection && (
                <div className="info-card">
                  <h3>自由探索</h3>
                  <p>
                    點選牆面、家具或透視點，就能查看它的實際尺寸與投影尺寸。
                    也可以在畫布上直接拖曳物件。
                  </p>
                  <div className="stat-row">
                    <span>牆面物件</span>
                    <strong>{room.wallObjects.length}</strong>
                  </div>
                  <div className="stat-row">
                    <span>地板物件</span>
                    <strong>{room.floorObjects.length}</strong>
                  </div>
                  <div className="stat-row">
                    <span>完成任務</span>
                    <strong>{completed} / 8</strong>
                  </div>
                </div>
              )}

              <SurfaceColors
                room={room}
                selected={wallSelection}
                onChange={(surface, color) =>
                  setRoom((current) => ({
                    ...current,
                    wallColors: {
                      ...current.wallColors,
                      [surface]: color,
                    },
                  }))
                }
              />

              <div className="info-card soft">
                <h3>投影尺寸怎麼看？</h3>
                <p>
                  實際尺寸是房間裡的公尺數；投影尺寸是畫布上的像素。
                  同一個物件移到更深處時，實際尺寸不變，投影會變小。
                </p>
              </div>
            </div>
          )}

          {rightTab === 'guides' && (
            <div className="panel-scroll">
              <div className="info-card">
                <h3>輔助線開關</h3>
                <p>可以只留下一部分，比較完整結構與乾淨線稿。</p>
                <div className="guide-list">
                  {GUIDE_ITEMS.map((item) => (
                    <label
                      key={item.key}
                      className="toggle-row"
                      data-testid={`guide-row-${item.key}`}
                    >
                      <input
                        type="checkbox"
                        checked={room.guides[item.key]}
                        data-testid={`guide-${item.key}`}
                        onChange={() => toggleGuide(item.key)}
                      />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.hint}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="info-card">
                <h3>顯示方式</h3>
                <div className="display-grid">
                  {DISPLAY_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`btn ${
                        room.displayMode === mode.id
                          ? 'primary'
                          : 'secondary'
                      }`}
                      onClick={() => applyDisplayMode(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="info-card soft">
                <h3>教學模型</h3>
                <p>
                  本教室使用固定視窗針孔投影：前開口四角固定在畫布外框，
                  透視點可水平與垂直移動；垂直移動會改變眼睛高度與視平線。
                  這是受約束的移軸視角，不是原地旋轉相機，因此外框能保持固定，
                  而深度線仍正確收斂。
                </p>
              </div>
            </div>
          )}

          {rightTab === 'lesson' && (
            <div className="panel-scroll">
              <div className="lesson-summary">
                <div>
                  <span className="mini-label">任務進度</span>
                  <strong>
                    {completed} / {tasks.length}
                  </strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(completed / tasks.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="task-list">
                {tasks.map((task, index) => (
                  <article
                    key={task.id}
                    className={`task-card ${
                      task.result.done ? 'done' : ''
                    }`}
                    data-testid={`task-${task.id}`}
                    data-done={task.result.done ? 'true' : 'false'}
                  >
                    <div className="task-head">
                      <span className="task-index">{index + 1}</span>
                      <h3>{task.title}</h3>
                      <span className="task-status">
                        {task.result.done ? '完成' : '進行中'}
                      </span>
                    </div>
                    <p>{task.instruction}</p>
                    <div className="task-goal">
                      完成條件：{task.goal}
                      {task.result.progressLabel
                        ? ` · ${task.result.progressLabel}`
                        : ''}
                    </div>
                    <div className="task-feedback">
                      {task.result.hint}
                    </div>
                    <button
                      type="button"
                      className="btn ghost small"
                      data-testid={`task-restart-${task.id}`}
                      onClick={() => {
                        setRoom((current) => restartTask(current, task.id));
                        setSelection(null);
                        notify(`已重新開始：${task.title}`);
                      }}
                    >
                      重新挑戰
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function WallProperties({
  object,
  room,
  camera,
  geometry,
  onChange,
  onDuplicate,
  onDelete,
}: {
  object: WallObject;
  room: RoomScene;
  camera: ReturnType<typeof createRoomCamera>;
  geometry: ReturnType<typeof createRoomGeometry>;
  onChange: (patch: Partial<WallObject>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const projected = projectWallObject(object, geometry, camera);
  const projectedWidth = projected.bounds.right - projected.bounds.left;
  const projectedHeight = projected.bounds.bottom - projected.bounds.top;

  return (
    <div className="info-card">
      <div className="object-title">
        <div>
          <span className="mini-label">牆面物件</span>
          <h3>{object.label}</h3>
        </div>
        <span className="wall-badge">{WALL_LABELS[object.wall]}</span>
      </div>

      <label className="field">
        <span>所在牆面</span>
        <select
          value={object.wall}
          data-testid="wall-object-wall"
          onChange={(event) =>
            onChange({ wall: event.target.value as RoomWallId })
          }
        >
          {(['left', 'back', 'right'] as RoomWallId[]).map((wall) => (
            <option key={wall} value={wall}>
              {WALL_LABELS[wall]}
            </option>
          ))}
        </select>
      </label>

      <RangeField
        label="牆面水平位置"
        value={object.u}
        min={0}
        max={1}
        step={0.01}
        display={`${Math.round(object.u * 100)}%`}
        testId="wall-object-u"
        onChange={(value) => onChange({ u: value })}
      />
      <RangeField
        label="牆面高度位置"
        value={object.v}
        min={0}
        max={1}
        step={0.01}
        display={`${Math.round(object.v * 100)}%`}
        testId="wall-object-v"
        onChange={(value) => onChange({ v: value })}
      />
      <RangeField
        label="實際寬度"
        value={object.width}
        min={0.2}
        max={3}
        step={0.05}
        display={`${object.width.toFixed(2)} m`}
        testId="wall-object-width"
        onChange={(value) => onChange({ width: value })}
      />
      <RangeField
        label="實際高度"
        value={object.height}
        min={0.2}
        max={2.9}
        step={0.05}
        display={`${object.height.toFixed(2)} m`}
        testId="wall-object-height"
        onChange={(value) => onChange({ height: value })}
      />

      <div className="measure-grid">
        <div>
          <span>實際尺寸</span>
          <strong>
            {object.width.toFixed(2)} × {object.height.toFixed(2)} m
          </strong>
        </div>
        <div>
          <span>投影尺寸</span>
          <strong data-testid="wall-projected-size">
            {Math.round(projectedWidth)} × {Math.round(projectedHeight)} px
          </strong>
        </div>
      </div>

      <div className="color-row">
        <ColorField
          label="主色"
          value={object.color}
          testId="wall-object-color"
          onChange={(color) => onChange({ color })}
        />
        <ColorField
          label="框線色"
          value={object.accentColor}
          testId="wall-object-accent"
          onChange={(color) => onChange({ accentColor: color })}
        />
      </div>

      <div className="action-row">
        <button type="button" className="btn secondary" onClick={onDuplicate}>
          複製
        </button>
        <button type="button" className="btn danger" onClick={onDelete}>
          刪除
        </button>
      </div>
      <p className="tiny-note">
        牆面局部座標固定在{WALL_LABELS[object.wall]}上，移動透視點時會重新投影。
        目前房間尺寸 {room.spec.width} × {room.spec.height} m。
      </p>
    </div>
  );
}

function FloorProperties({
  object,
  room,
  camera,
  onChange,
  onDuplicate,
  onDelete,
}: {
  object: FloorObject;
  room: RoomScene;
  camera: ReturnType<typeof createRoomCamera>;
  onChange: (patch: Partial<FloorObject>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const projected = projectFloorObject(object, camera);
  const projectedWidth = projected.bounds.right - projected.bounds.left;
  const projectedHeight = projected.bounds.bottom - projected.bounds.top;

  return (
    <div className="info-card">
      <div className="object-title">
        <div>
          <span className="mini-label">地板物件</span>
          <h3>{object.label}</h3>
        </div>
        <span className="wall-badge">地板錨定</span>
      </div>

      <RangeField
        label="左右位置 X"
        value={object.x}
        min={-room.spec.width / 2}
        max={room.spec.width / 2}
        step={0.05}
        display={`${object.x.toFixed(2)} m`}
        testId="floor-object-x"
        onChange={(value) => onChange({ x: value })}
      />
      <RangeField
        label="深度 Z"
        value={object.z}
        min={room.spec.nearZ}
        max={room.spec.farZ}
        step={0.05}
        display={`${object.z.toFixed(2)} m`}
        testId="floor-object-z"
        onChange={(value) => onChange({ z: value })}
      />
      <RangeField
        label="實際寬度"
        value={object.width}
        min={0.2}
        max={4}
        step={0.05}
        display={`${object.width.toFixed(2)} m`}
        testId="floor-object-width"
        onChange={(value) => onChange({ width: value })}
      />
      <RangeField
        label="實際高度"
        value={object.height}
        min={0.2}
        max={2.9}
        step={0.05}
        display={`${object.height.toFixed(2)} m`}
        testId="floor-object-height"
        onChange={(value) => onChange({ height: value })}
      />
      <RangeField
        label="實際深度"
        value={object.depth}
        min={0.2}
        max={4}
        step={0.05}
        display={`${object.depth.toFixed(2)} m`}
        testId="floor-object-depth"
        onChange={(value) => onChange({ depth: value })}
      />

      <div className="measure-grid">
        <div>
          <span>實際尺寸</span>
          <strong>
            {object.width.toFixed(2)} × {object.height.toFixed(2)} ×{' '}
            {object.depth.toFixed(2)} m
          </strong>
        </div>
        <div>
          <span>投影尺寸</span>
          <strong data-testid="floor-projected-size">
            {Math.round(projectedWidth)} × {Math.round(projectedHeight)} px
          </strong>
        </div>
      </div>

      <div className="color-row">
        <ColorField
          label="主色"
          value={object.color}
          testId="floor-object-color"
          onChange={(color) => onChange({ color })}
        />
        <ColorField
          label="裝飾色"
          value={object.accentColor}
          testId="floor-object-accent"
          onChange={(color) => onChange({ accentColor: color })}
        />
      </div>

      <div className="action-row">
        <button type="button" className="btn secondary" onClick={onDuplicate}>
          複製
        </button>
        <button type="button" className="btn danger" onClick={onDelete}>
          刪除
        </button>
      </div>
      <p className="tiny-note">
        物件底部固定在地板 Y = 0。深度 {object.z.toFixed(2)} m 改變時，
        投影大小會依針孔投影重新計算。
      </p>
    </div>
  );
}

function SurfaceColors({
  room,
  selected,
  onChange,
}: {
  room: RoomScene;
  selected: RoomSurfaceId | null;
  onChange: (surface: RoomSurfaceId, color: string) => void;
}) {
  const surfaces: RoomSurfaceId[] = [
    'left',
    'back',
    'right',
    'floor',
    'ceiling',
  ];
  return (
    <div className="info-card">
      <h3>房間配色</h3>
      <p>每一面可以單獨換色，幾何與透視不會改變。</p>
      <div className="surface-color-grid">
        {surfaces.map((surface) => (
          <label
            key={surface}
            className={`surface-color ${
              selected === surface ? 'selected' : ''
            }`}
          >
            <input
              type="color"
              value={room.wallColors[surface]}
              data-testid={`color-${surface}`}
              onChange={(event) =>
                onChange(surface, event.target.value)
              }
            />
            <span>{SURFACE_LABELS[surface]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  display,
  testId,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  testId: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-field">
      <span className="range-label">
        <span>{label}</span>
        <output>{display}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-testid={testId}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  testId,
  onChange,
}: {
  label: string;
  value: string;
  testId: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="color-field">
      <input
        type="color"
        value={value}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
      />
      <span>{label}</span>
    </label>
  );
}

function AssetGlyph({
  glyph,
}: {
  glyph:
    | 'painting'
    | 'portrait'
    | 'window'
    | 'door'
    | 'clock'
    | 'furniture'
    | 'person'
    | 'plant'
    | 'box'
    | 'cylinder';
}) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className="asset-glyph">
      {glyph === 'painting' && (
        <>
          <rect x={5} y={9} width={26} height={18} rx={2} {...common} />
          <path d="M8 24l7-8 5 6 4-4 4 6" {...common} />
        </>
      )}
      {glyph === 'portrait' && (
        <>
          <rect x={10} y={5} width={16} height={26} rx={2} {...common} />
          <circle cx={18} cy={13} r={3} {...common} />
          <path d="M13 27l5-9 5 9" {...common} />
        </>
      )}
      {glyph === 'window' && (
        <>
          <rect x={6} y={7} width={24} height={22} rx={1} {...common} />
          <path d="M18 7v22M6 18h24" {...common} />
        </>
      )}
      {glyph === 'door' && (
        <>
          <rect x={9} y={5} width={18} height={27} rx={1} {...common} />
          <circle cx={23} cy={19} r={1.4} fill="currentColor" />
        </>
      )}
      {glyph === 'clock' && (
        <>
          <circle cx={18} cy={18} r={11} {...common} />
          <path d="M18 18v-7M18 18l5 3" {...common} />
        </>
      )}
      {glyph === 'furniture' && (
        <>
          <path d="M7 20h22v8H7z" {...common} />
          <path d="M10 20v-6h16v6M9 28v3M27 28v3" {...common} />
        </>
      )}
      {glyph === 'person' && (
        <>
          <circle cx={18} cy={9} r={4} {...common} />
          <path d="M18 13v10M12 18h12M18 23l-5 8M18 23l5 8" {...common} />
        </>
      )}
      {glyph === 'plant' && (
        <>
          <path d="M13 30h10l-2-8h-6z" {...common} />
          <path d="M18 22c-7 0-8-6-8-9 4 0 7 2 8 5 1-3 4-5 8-5 0 3-1 9-8 9z" {...common} />
        </>
      )}
      {glyph === 'box' && (
        <>
          <path d="M8 13l10-5 10 5-10 5z" {...common} />
          <path d="M8 13v11l10 5 10-5V13M18 18v11" {...common} />
        </>
      )}
      {glyph === 'cylinder' && (
        <>
          <ellipse cx={18} cy={10} rx={9} ry={4} {...common} />
          <path d="M9 10v16c0 2 4 4 9 4s9-2 9-4V10" {...common} />
        </>
      )}
    </svg>
  );
}
