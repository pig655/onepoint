import {
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  clampVpX,
  clampVpY,
  pointsToSvg,
  projectPoint,
  unprojectFloorPoint,
  type ProjectionCamera,
} from '../core/perspectiveCore';
import {
  isStreetShape,
  type BasicObject,
  type BasicScene,
  type FloorObject,
} from '../model/sceneModel';
import {
  BASIC_FRAME,
  BASIC_PLACEMENT_WIDTH,
  BASIC_WORLD,
  VIEWBOX,
} from '../model/viewConfig';
import { shade } from '../utils/color';
import { svgPointerPoint } from '../utils/pointer';
import { FloorObjectShape } from './FloorObjectShape';
import { StreetObjectShape } from './StreetObjectShape';

interface BasicCanvasProps {
  scene: BasicScene;
  camera: ProjectionCamera;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onVpMove: (vpX: number, vpY: number) => void;
  onObjectMove: (id: string, x: number, z: number) => void;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

type DragState =
  | { kind: 'vp'; pointerId: number }
  | {
      kind: 'object';
      pointerId: number;
      id: string;
      offsetX: number;
      offsetZ: number;
    };

function shortObjectLabel(label: string): string {
  const parts = label.split(' ');
  return parts[parts.length - 1] || label;
}

interface LabelLayout {
  object: BasicObject;
  x: number;
  y: number;
  width: number;
  height: number;
}

const LABEL_HEIGHT = 23;
const LABEL_GAP = 27;

function labelWidth(label: string): number {
  return Math.max(42, shortObjectLabel(label).length * 9 + 16);
}

function labelsOverlap(a: LabelLayout, b: LabelLayout): boolean {
  return (
    a.x < b.x + b.width + 4 &&
    a.x + a.width + 4 > b.x &&
    a.y < b.y + b.height + 4 &&
    a.y + a.height + 4 > b.y
  );
}

function basicToFloorObject(object: BasicObject): FloorObject {
  return {
    id: object.id,
    kind: 'floor',
    type: object.type as FloorObject['type'],
    label: object.label,
    x: object.x,
    z: object.z,
    width: object.width,
    height: object.height,
    depth: object.depth,
    color: object.color,
    accentColor: shade(object.color, -0.24),
  };
}

export function BasicCanvas({
  scene,
  camera,
  selectedId,
  onSelect,
  onDragStart,
  onDragEnd,
  onVpMove,
  onObjectMove,
  svgRef,
}: BasicCanvasProps) {
  const localRef = useRef<SVGSVGElement | null>(null);
  const ref = svgRef ?? localRef;
  const dragRef = useRef<DragState | null>(null);

  const beginObjectDrag = (
    event: ReactPointerEvent,
    object: BasicObject,
  ) => {
    const svg = ref.current;
    if (!svg) {
      return;
    }
    const point = svgPointerPoint(svg, event);
    const floor = unprojectFloorPoint(point, camera);
    if (!floor) {
      return;
    }
    event.stopPropagation();
    onSelect(object.id);
    onDragStart();
    dragRef.current = {
      kind: 'object',
      pointerId: event.pointerId,
      id: object.id,
      offsetX: object.x - floor.x,
      offsetZ: object.z - floor.z,
    };
    svg.setPointerCapture(event.pointerId);
  };

  const beginVpDrag = (event: ReactPointerEvent) => {
    const svg = ref.current;
    if (!svg) {
      return;
    }
    event.stopPropagation();
    onSelect(null);
    onDragStart();
    dragRef.current = { kind: 'vp', pointerId: event.pointerId };
    svg.setPointerCapture(event.pointerId);
  };

  const handleMove = (event: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const svg = ref.current;
    if (!svg) {
      return;
    }
    const point = svgPointerPoint(svg, event);
    if (drag.kind === 'vp') {
      onVpMove(
        clampVpX(point.x, BASIC_FRAME, 0.1),
        clampVpY(point.y, BASIC_FRAME, 0.1),
      );
      return;
    }
    const floor = unprojectFloorPoint(point, camera);
    if (!floor) {
      return;
    }
    onObjectMove(
      drag.id,
      floor.x + drag.offsetX,
      floor.z + drag.offsetZ,
    );
  };

  const handleUp = (event: ReactPointerEvent) => {
    if (!dragRef.current) {
      return;
    }
    dragRef.current = null;
    onDragEnd();
    const svg = ref.current;
    if (svg?.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
  };

  const gridLines: Array<{ id: string; points: string; strong?: boolean }> =
    [];
  if (scene.guides.grid) {
    const halfWidth = BASIC_PLACEMENT_WIDTH / 2;
    for (let x = -halfWidth; x <= halfWidth + 0.001; x += 0.5) {
      const near = projectPoint(
        { x, y: 0, z: BASIC_WORLD.nearZ + 0.8 },
        camera,
      );
      const far = projectPoint({ x, y: 0, z: BASIC_WORLD.farZ }, camera);
      gridLines.push({
        id: `x-${x.toFixed(1)}`,
        points: pointsToSvg([near, far]),
        strong: Math.abs(x) < 0.001,
      });
    }
    for (let z = 2.4; z <= BASIC_WORLD.farZ; z += 1.2) {
      const left = projectPoint(
        { x: -halfWidth, y: 0, z },
        camera,
      );
      const right = projectPoint(
        { x: halfWidth, y: 0, z },
        camera,
      );
      gridLines.push({
        id: `z-${z.toFixed(1)}`,
        points: pointsToSvg([left, right]),
      });
    }
  }

  const selected = scene.objects.find(
    (object) => object.id === selectedId,
  );
  const sortedObjects = [...scene.objects].sort((a, b) => {
    if (a.type === 'road' && b.type !== 'road') {
      return -1;
    }
    if (b.type === 'road' && a.type !== 'road') {
      return 1;
    }
    return b.z - a.z;
  });

  const labelLayouts: LabelLayout[] = [];
  const labelObjects = scene.objects.length <= 4 ? scene.objects : [];
  [...labelObjects]
    .sort((a, b) => a.z - b.z)
    .forEach((object) => {
      const top = projectPoint(
        { x: object.x, y: object.height, z: object.z },
        camera,
      );
      const width = labelWidth(object.label);
      const x = Math.min(
        Math.max(8, top.x - width / 2),
        VIEWBOX.width - width - 8,
      );
      let y = top.y - 35;
      while (
        y >= 8 &&
        labelLayouts.some((box) =>
          labelsOverlap(
            { object, x, y, width, height: LABEL_HEIGHT },
            box,
          ),
        )
      ) {
        y -= LABEL_GAP;
      }
      if (y >= 8) {
        labelLayouts.push({ object, x, y, width, height: LABEL_HEIGHT });
      }
    });

  return (
    <svg
      ref={ref}
      className="canvas-svg"
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      data-testid="basic-canvas"
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onSelect(null);
        }
      }}
    >
      <rect
        x={0}
        y={0}
        width={VIEWBOX.width}
        height={VIEWBOX.height}
        fill="#fbf5e9"
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect(null);
        }}
      />

      <g pointerEvents="none">
        {gridLines.map((line) => (
          <polyline
            key={line.id}
            points={line.points}
            fill="none"
            stroke={line.strong ? '#a9a191' : '#d4c9b5'}
            strokeWidth={line.strong ? 1.5 : 1}
            opacity={0.9}
          />
        ))}
      </g>

      {scene.guides.depthLines && (
        <g pointerEvents="none">
          {scene.objects
            .filter((object) => object.type !== 'road')
            .map((object) => {
              const ground = [
                projectPoint(
                  {
                    x: object.x - object.width / 2,
                    y: 0,
                    z: object.z - object.depth / 2,
                  },
                  camera,
                ),
                projectPoint(
                  {
                    x: object.x + object.width / 2,
                    y: 0,
                    z: object.z - object.depth / 2,
                  },
                  camera,
                ),
                projectPoint(
                  {
                    x: object.x + object.width / 2,
                    y: 0,
                    z: object.z + object.depth / 2,
                  },
                  camera,
                ),
                projectPoint(
                  {
                    x: object.x - object.width / 2,
                    y: 0,
                    z: object.z + object.depth / 2,
                  },
                  camera,
                ),
              ];
              const isSelected = object.id === selectedId;
              return (
                <g key={object.id}>
                  {ground.map((point, index) => (
                    <line
                      key={index}
                      x1={point.x}
                      y1={point.y}
                      x2={camera.vpX}
                      y2={camera.horizonY}
                      stroke={isSelected ? '#d85d3f' : '#8e9a9e'}
                      strokeWidth={isSelected ? 1.4 : 0.8}
                      strokeDasharray="6 5"
                      opacity={isSelected ? 0.75 : 0.34}
                    />
                  ))}
                </g>
              );
            })}
        </g>
      )}

      {sortedObjects.map((object) => (
        <g
          key={object.id}
          data-testid={`basic-object-${object.id}`}
          data-object-type={object.type}
          onPointerDown={(event) => beginObjectDrag(event, object)}
        >
          {isStreetShape(object.type) ? (
            <StreetObjectShape
              object={object}
              camera={camera}
              selected={object.id === selectedId}
            />
          ) : (
            <FloorObjectShape
              object={basicToFloorObject(object)}
              camera={camera}
              selected={object.id === selectedId}
              colored
            />
          )}
        </g>
      ))}

      {scene.guides.horizon && (
        <g pointerEvents="none">
          <line
            data-testid="basic-horizon"
            x1={30}
            y1={camera.horizonY}
            x2={970}
            y2={camera.horizonY}
            stroke="#d85d3f"
            strokeWidth={1.8}
            strokeDasharray="10 7"
            opacity={0.85}
          />
          <text
            x={36}
            y={camera.horizonY - 10}
            fill="#b3462e"
            fontSize={15}
            fontWeight={700}
          >
            視平線
          </text>
        </g>
      )}

      {scene.guides.vp && (
        <g
          data-testid="basic-vp-marker"
          data-vp-x={camera.vpX.toFixed(2)}
          data-vp-y={camera.horizonY.toFixed(2)}
          transform={`translate(${camera.vpX} ${camera.horizonY})`}
          style={{ cursor: 'grab' }}
          onPointerDown={beginVpDrag}
        >
          <circle r={22} fill="transparent" />
          <circle
            r={13}
            fill="#fffaf0"
            stroke="#d85d3f"
            strokeWidth={3}
          />
          <circle r={5} fill="#d85d3f" />
          <line
            x1={-20}
            y1={0}
            x2={-14}
            y2={0}
            stroke="#d85d3f"
            strokeWidth={2}
          />
          <line
            x1={14}
            y1={0}
            x2={20}
            y2={0}
            stroke="#d85d3f"
            strokeWidth={2}
          />
          <line
            x1={0}
            y1={-20}
            x2={0}
            y2={-14}
            stroke="#d85d3f"
            strokeWidth={2}
          />
          <line
            x1={0}
            y1={14}
            x2={0}
            y2={20}
            stroke="#d85d3f"
            strokeWidth={2}
          />
          <text
            x={0}
            y={-31}
            textAnchor="middle"
            fill="#b3462e"
            fontSize={15}
            fontWeight={700}
            pointerEvents="none"
          >
            透視點
          </text>
        </g>
      )}

      {labelLayouts.map(({ object, x, y, width, height }) => (
        <g key={object.id} pointerEvents="none">
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={11}
            fill="#fffaf0"
            stroke="#e3d5bd"
          />
          <text
            x={x + width / 2}
            y={y + 16}
            textAnchor="middle"
            fill="#2a414d"
            fontSize={14}
            fontWeight={700}
          >
            {shortObjectLabel(object.label)}
          </text>
        </g>
      ))}

      {selected && (
        <g pointerEvents="none">
          <rect
            x={14}
            y={14}
            width={310}
            height={50}
            rx={14}
            fill="#fffaf0"
            stroke="#e3d5bd"
          />
          <text x={30} y={37} fill="#2a414d" fontSize={15} fontWeight={700}>
            {selected.label}
          </text>
          <text x={30} y={55} fill="#66747a" fontSize={13}>
            實際寬 {selected.width.toFixed(1)} m · 深度 {selected.z.toFixed(1)} m
          </text>
        </g>
      )}
    </svg>
  );
}
