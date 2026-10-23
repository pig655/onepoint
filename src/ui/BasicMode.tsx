import { useMemo, useRef, useState } from 'react';
import {
  createCamera,
  eyeHeightFromVpY,
} from '../core/perspectiveCore';
import { projectBasicObject } from '../core/objectProjection';
import type {
  BasicObject,
  BasicShape,
  Scene,
} from '../model/sceneModel';
import { createId } from '../model/sceneModel';
import {
  BASIC_FRAME,
  BASIC_PLACEMENT_WIDTH,
  BASIC_WORLD,
  DEFAULT_BASIC_VP_X,
  DEFAULT_BASIC_VP_Y,
} from '../model/viewConfig';
import { BasicCanvas } from '../render/BasicCanvas';
import { exportSvgAsPng } from '../utils/exportPng';

interface BasicModeProps {
  scene: Scene;
  update: (
    updater: (scene: Scene) => Scene,
    record?: boolean,
  ) => void;
  beginTransaction: () => void;
  endTransaction: () => void;
  notify: (message: string) => void;
}

const GEOMETRY_SHAPES: BasicShape[] = ['cube', 'cuboid', 'cylinder'];
const STREET_SHAPES: BasicShape[] = ['car', 'house', 'road'];

const SHAPE_INFO: Record<
  BasicShape,
  {
    label: string;
    width: number;
    height: number;
    depth: number;
    color: string;
    description: string;
    defaultX?: number;
    defaultZ?: number;
  }
> = {
  cube: {
    label: '正方體',
    width: 1,
    height: 1,
    depth: 1,
    color: '#e4a35f',
    description: '三個邊一樣長，最容易比較深度。',
  },
  cuboid: {
    label: '長方體',
    width: 1.6,
    height: 0.9,
    depth: 1.1,
    color: '#74a5c2',
    description: '可以分開調整寬、高、深。',
  },
  cylinder: {
    label: '柱體',
    width: 1,
    height: 1.3,
    depth: 1,
    color: '#b19bca',
    description: '圓形在透視中會變成橢圓。',
  },
  car: {
    label: '汽車',
    width: 1.5,
    height: 0.85,
    depth: 2.4,
    color: '#d85d4f',
    description: '車身、車窗與車輪一起隨深度縮小。',
    defaultX: -1.1,
    defaultZ: 6.8,
  },
  house: {
    label: '房子',
    width: 2.2,
    height: 2,
    depth: 2,
    color: '#d8a24a',
    description: '牆面與斜屋頂，適合觀察高度變化。',
    defaultX: 1.4,
    defaultZ: 14,
  },
  road: {
    label: '道路',
    width: 3.4,
    height: 0.06,
    depth: 12,
    color: '#5f6b73',
    description: '往畫面深處延伸的道路，附車道線。',
    defaultX: 0,
    defaultZ: 9.5,
  },
};

function clampObject(object: BasicObject): BasicObject {
  const halfWidth = BASIC_PLACEMENT_WIDTH / 2;
  const isRoad = object.type === 'road';
  const maxWidth = isRoad ? 5 : 4;
  const maxDepth = isRoad ? 16 : 4;
  const minHeight = isRoad ? 0.02 : 0.2;
  return {
    ...object,
    x: Math.min(
      halfWidth - object.width / 2,
      Math.max(-halfWidth + object.width / 2, object.x),
    ),
    z: Math.min(
      BASIC_WORLD.farZ - object.depth / 2,
      Math.max(2 + object.depth / 2, object.z),
    ),
    width: Math.min(maxWidth, Math.max(0.2, object.width)),
    height: Math.min(3.5, Math.max(minHeight, object.height)),
    depth: Math.min(maxDepth, Math.max(0.2, object.depth)),
  };
}

export function BasicMode({
  scene,
  update,
  beginTransaction,
  endTransaction,
  notify,
}: BasicModeProps) {
  const basic = scene.basic;
  const [selectedId, setSelectedId] = useState<string | null>(
    basic.objects[0]?.id ?? null,
  );
  const svgRef = useRef<SVGSVGElement | null>(null);

  const eyeHeight = eyeHeightFromVpY(
    basic.vpY,
    BASIC_FRAME,
    BASIC_WORLD.height,
  );
  const camera = useMemo(
    () =>
      createCamera({
        frame: BASIC_FRAME,
        nearZ: BASIC_WORLD.nearZ,
        worldWidth: BASIC_WORLD.width,
        worldHeight: BASIC_WORLD.height,
        eyeHeight,
        vpX: basic.vpX,
      }),
    [basic.vpX, eyeHeight],
  );

  const selected = basic.objects.find(
    (object) => object.id === selectedId,
  );
  const selectedProjection = selected
    ? projectBasicObject(selected, camera)
    : null;
  const selectedXLimit = selected
    ? Math.max(0.05, BASIC_PLACEMENT_WIDTH / 2 - selected.width / 2)
    : BASIC_PLACEMENT_WIDTH / 2;

  const setBasic = (
    updater: (basic: Scene['basic']) => Scene['basic'],
    record = true,
  ) => {
    update(
      (current) => ({
        ...current,
        mode: 'basic',
        basic: updater(current.basic),
      }),
      record,
    );
  };

  const addObject = (shape: BasicShape) => {
    const info = SHAPE_INFO[shape];
    const index = basic.objects.length;
    const sameTypeCount = basic.objects.filter(
      (object) => object.type === shape,
    ).length;
    const x =
      info.defaultX !== undefined
        ? info.defaultX +
          (shape === 'road' ? 0 : (sameTypeCount % 2) * 1.2)
        : ((index % 3) - 1) * 2.4;
    const z =
      info.defaultZ !== undefined
        ? info.defaultZ + (shape === 'road' ? 0 : sameTypeCount * 0.7)
        : 5 + (index % 3) * 1.8;
    const object: BasicObject = clampObject({
      id: createId('basic'),
      type: shape,
      label: `${info.label} ${String.fromCharCode(65 + index)}`,
      x,
      z,
      width: info.width,
      height: info.height,
      depth: info.depth,
      color: info.color,
    });
    setBasic((current) => ({
      ...current,
      objects: [...current.objects, object],
    }));
    setSelectedId(object.id);
    notify(`已新增${info.label}`);
  };

  const updateObject = (
    id: string,
    patch: Partial<BasicObject>,
    record = true,
  ) => {
    setBasic((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        object.id === id
          ? clampObject({ ...object, ...patch })
          : object,
      ),
    }), record);
  };

  const moveObject = (id: string, x: number, z: number) => {
    updateObject(id, { x, z }, false);
  };

  const moveVp = (vpX: number, vpY: number) => {
    setBasic((current) => ({ ...current, vpX, vpY }), false);
  };

  const deleteSelected = () => {
    if (!selected) {
      return;
    }
    setBasic((current) => ({
      ...current,
      objects: current.objects.filter(
        (object) => object.id !== selected.id,
      ),
    }));
    setSelectedId(null);
    notify('已刪除物件');
  };

  const duplicateSelected = () => {
    if (!selected) {
      return;
    }
    const copy = clampObject({
      ...selected,
      id: createId('basic'),
      label: `${selected.label} 複本`,
      x: selected.x + 0.35,
      z: selected.z + 0.35,
    });
    setBasic((current) => ({
      ...current,
      objects: [...current.objects, copy],
    }));
    setSelectedId(copy.id);
    notify('已複製物件');
  };

  const toggleGuide = (key: keyof Scene['basic']['guides']) => {
    setBasic((current) => ({
      ...current,
      guides: { ...current.guides, [key]: !current.guides[key] },
    }));
  };

  const resetVp = () => {
    setBasic((current) => ({
      ...current,
      vpX: DEFAULT_BASIC_VP_X,
      vpY: DEFAULT_BASIC_VP_Y,
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
        `基礎透視練習-${new Date().toISOString().slice(0, 10)}.png`,
      );
      notify('PNG 已匯出');
    } catch {
      notify('PNG 匯出失敗，請再試一次');
    }
  };

  return (
    <div className="mode-page basic-mode">
      <div className="mode-toolbar">
        <div className="basic-title">
          <span className="eyebrow">基礎透視練習</span>
          <strong>拖曳透視點，觀察深度線與近大遠小</strong>
        </div>
        <div className="toolbar-inline">
          <button
            type="button"
            className="btn ghost"
            onClick={resetVp}
            data-testid="basic-reset-vp"
          >
            重設透視點
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={exportPng}
            data-testid="basic-export-png"
          >
            匯出 PNG
          </button>
        </div>
      </div>

      <div className="workspace basic-workspace">
        <aside className="panel left-panel">
          <div className="panel-heading">
            <h2>場景物件</h2>
            <p>新增幾何物件或馬路場景，再用滑桿調整尺寸。</p>
          </div>

          <div className="add-group-label">幾何物件</div>
          <div className="add-grid">
            {GEOMETRY_SHAPES.map((shape) => (
              <button
                key={shape}
                type="button"
                className="add-card"
                data-testid={`basic-add-${shape}`}
                onClick={() => addObject(shape)}
              >
                <span className={`shape-swatch ${shape}`} />
                <strong>{SHAPE_INFO[shape].label}</strong>
                <small>{SHAPE_INFO[shape].description}</small>
              </button>
            ))}
          </div>

          <div className="add-group-label">馬路與建築</div>
          <div className="add-grid">
            {STREET_SHAPES.map((shape) => (
              <button
                key={shape}
                type="button"
                className="add-card"
                data-testid={`basic-add-${shape}`}
                onClick={() => addObject(shape)}
              >
                <span className={`shape-swatch ${shape}`} />
                <strong>{SHAPE_INFO[shape].label}</strong>
                <small>{SHAPE_INFO[shape].description}</small>
              </button>
            ))}
          </div>

          <div className="object-list">
            <div className="mini-label">畫面上的物件</div>
            {basic.objects.length === 0 && (
              <p className="empty-note">還沒有物件，先新增一個吧。</p>
            )}
            {basic.objects.map((object) => (
              <button
                key={object.id}
                type="button"
                className={`object-row ${
                  object.id === selectedId ? 'active' : ''
                }`}
                data-testid={`basic-object-row-${object.id}`}
                onClick={() => setSelectedId(object.id)}
              >
                <span
                  className="color-dot"
                  style={{ backgroundColor: object.color }}
                />
                <span>
                  <strong>{object.label}</strong>
                  <small>深度 {object.z.toFixed(1)} m</small>
                </span>
              </button>
            ))}
          </div>

          <div className="panel-note">
            <strong>觀察重點</strong>
            <span>
              深度方向的平行線會一起指向透視點；越遠的物件，投影越小。
              透視點也可以上下拖曳，改變視平線與眼睛高度。
            </span>
          </div>
        </aside>

        <main className="canvas-panel">
          <div className="canvas-frame">
            <BasicCanvas
              scene={basic}
              camera={camera}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDragStart={beginTransaction}
              onDragEnd={endTransaction}
              onVpMove={moveVp}
              onObjectMove={moveObject}
              svgRef={svgRef}
            />
          </div>
          <div className="canvas-meta">
            <div>
              <span className="meta-dot" />
              透視點 X {Math.round(basic.vpX)} · 視平線 Y{' '}
              {Math.round(camera.horizonY)}
            </div>
            <div>眼睛高度 {eyeHeight.toFixed(2)} m</div>
            <div>深度方向：+Z 往畫面裡</div>
          </div>
        </main>

        <aside className="panel right-panel">
          <div className="panel-scroll">
            {selected && selectedProjection && (
              <div className="info-card">
                <div className="object-title">
                  <div>
                    <span className="mini-label">已選取</span>
                    <h3>{selected.label}</h3>
                  </div>
                  <span className="wall-badge">
                    {SHAPE_INFO[selected.type].label}
                  </span>
                </div>

                <RangeField
                  label="左右位置 X"
                  value={selected.x}
                  min={-selectedXLimit}
                  max={selectedXLimit}
                  step={0.05}
                  display={`${selected.x.toFixed(2)} m`}
                  testId="basic-object-x"
                  onChange={(value) =>
                    updateObject(selected.id, { x: value })
                  }
                />
                <RangeField
                  label="深度 Z"
                  value={selected.z}
                  min={2}
                  max={BASIC_WORLD.farZ}
                  step={0.1}
                  display={`${selected.z.toFixed(2)} m`}
                  testId="basic-object-z"
                  onChange={(value) =>
                    updateObject(selected.id, { z: value })
                  }
                />
                <RangeField
                  label="實際寬度"
                  value={selected.width}
                  min={0.2}
                  max={selected.type === 'road' ? 5 : 4}
                  step={0.05}
                  display={`${selected.width.toFixed(2)} m`}
                  testId="basic-object-width"
                  onChange={(value) =>
                    updateObject(selected.id, { width: value })
                  }
                />
                <RangeField
                  label="實際高度"
                  value={selected.height}
                  min={selected.type === 'road' ? 0.02 : 0.2}
                  max={3.5}
                  step={selected.type === 'road' ? 0.01 : 0.05}
                  display={`${selected.height.toFixed(2)} m`}
                  testId="basic-object-height"
                  onChange={(value) =>
                    updateObject(selected.id, { height: value })
                  }
                />
                <RangeField
                  label="實際深度"
                  value={selected.depth}
                  min={0.2}
                  max={selected.type === 'road' ? 16 : 4}
                  step={0.05}
                  display={`${selected.depth.toFixed(2)} m`}
                  testId="basic-object-depth"
                  onChange={(value) =>
                    updateObject(selected.id, { depth: value })
                  }
                />

                <div className="measure-grid">
                  <div>
                    <span>實際尺寸</span>
                    <strong>
                      {selected.width.toFixed(2)} ×{' '}
                      {selected.height.toFixed(2)} ×{' '}
                      {selected.depth.toFixed(2)} m
                    </strong>
                  </div>
                  <div>
                    <span>投影尺寸</span>
                    <strong data-testid="basic-projected-size">
                      {Math.round(
                        selectedProjection.bounds.right -
                          selectedProjection.bounds.left,
                      )}{' '}
                      ×{' '}
                      {Math.round(
                        selectedProjection.bounds.bottom -
                          selectedProjection.bounds.top,
                      )}{' '}
                      px
                    </strong>
                  </div>
                </div>

                <div className="color-row">
                  <ColorField
                    label="物件顏色"
                    value={selected.color}
                    testId="basic-object-color"
                    onChange={(color) =>
                      updateObject(selected.id, { color })
                    }
                  />
                </div>

                <div className="action-row">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={duplicateSelected}
                  >
                    複製
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={deleteSelected}
                  >
                    刪除
                  </button>
                </div>
              </div>
            )}

            {!selected && (
              <div className="info-card">
                <h3>選一個物件</h3>
                <p>
                  點一下畫面上的物件，就能調整它的位置、深度和實際尺寸。
                </p>
              </div>
            )}

            <div className="info-card">
              <h3>輔助線</h3>
              <div className="guide-list">
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={basic.guides.horizon}
                    data-testid="basic-guide-horizon"
                    onChange={() => toggleGuide('horizon')}
                  />
                  <span>
                    <strong>視平線</strong>
                    <small>眼睛高度所在的水平線</small>
                  </span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={basic.guides.vp}
                    data-testid="basic-guide-vp"
                    onChange={() => toggleGuide('vp')}
                  />
                  <span>
                    <strong>透視點</strong>
                    <small>可以左右、上下拖曳</small>
                  </span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={basic.guides.grid}
                    data-testid="basic-guide-grid"
                    onChange={() => toggleGuide('grid')}
                  />
                  <span>
                    <strong>地面網格</strong>
                    <small>幫助看出深度間距</small>
                  </span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={basic.guides.depthLines}
                    data-testid="basic-guide-depthLines"
                    onChange={() => toggleGuide('depthLines')}
                  />
                  <span>
                    <strong>物件透視線</strong>
                    <small>從物件連到透視點</small>
                  </span>
                </label>
              </div>
            </div>

            <div className="info-card soft">
              <h3>兩個不同的操作</h3>
              <p>
                把「實際寬度」變大，投影會變大；把「深度 Z」變大，實際尺寸不變，
                但投影會變小。這正是近大遠小。
              </p>
            </div>

            {selected && (
              <div className="info-card accent">
                <h3>目前的深度</h3>
                <p>
                  物件位在 Z = {selected.z.toFixed(2)} m。把透視點左右或上下移動，
                  物件的深度線會跟著指向新的透視點。
                </p>
              </div>
            )}
          </div>
        </aside>
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

