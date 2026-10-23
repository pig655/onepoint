import {
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  clampVpX,
  clampVpY,
  pointsToSvg,
  projectPoint,
  unprojectFloorPoint,
} from '../core/perspectiveCore';
import type {
  RoomSurfaceId,
  RoomWallId,
} from '../core/roomGeometry';
import {
  createRoomGuideLines,
  getRoomEdges,
  type ProjectedRoom,
} from '../core/roomProjection';
import {
  projectWallObject,
  wallObjectLocalFromCanvas,
} from '../core/wallAnchors';
import type {
  FloorObject,
  RoomScene,
  WallObject,
} from '../model/sceneModel';
import { VIEWBOX } from '../model/viewConfig';
import { svgPointerPoint } from '../utils/pointer';
import { FloorObjectShape } from './FloorObjectShape';
import { WallObjectShape } from './WallObjectShape';
import {
  isObjectSelected,
  isSurfaceSelected,
  type Selection,
} from '../ui/selection';

interface RoomCanvasProps {
  scene: RoomScene;
  projected: ProjectedRoom;
  selection: Selection;
  onSelectObject: (id: string | null) => void;
  onSelectSurface: (surface: RoomSurfaceId) => void;
  onSelectVp: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onVpMove: (vpX: number, vpY: number) => void;
  onFloorObjectMove: (id: string, x: number, z: number) => void;
  onWallObjectMove: (id: string, u: number, v: number) => void;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

type DragState =
  | {
      kind: 'vp';
      pointerId: number;
    }
  | {
      kind: 'floor';
      pointerId: number;
      id: string;
      offsetX: number;
      offsetZ: number;
    }
  | {
      kind: 'wall';
      pointerId: number;
      id: string;
      offsetU: number;
      offsetV: number;
    };

const wallOrder: RoomWallId[] = ['back', 'left', 'right'];
const surfaceOrder: RoomSurfaceId[] = [
  'ceiling',
  'floor',
  'left',
  'right',
  'back',
];

export function RoomCanvas({
  scene,
  projected,
  selection,
  onSelectObject,
  onSelectSurface,
  onSelectVp,
  onDragStart,
  onDragEnd,
  onVpMove,
  onFloorObjectMove,
  onWallObjectMove,
  svgRef,
}: RoomCanvasProps) {
  const localSvgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const ref = svgRef ?? localSvgRef;
  const colored = scene.displayMode === 'color';
  const camera = projected.camera;
  const room = projected.geometry;
  const guideLines = useMemo(
    () => createRoomGuideLines(room, camera),
    [room, camera],
  );

  const beginFloorDrag = (
    event: ReactPointerEvent,
    object: FloorObject,
  ) => {
    const svg = ref.current;
    if (!svg) {
      return;
    }
    const point = svgPointerPoint(svg, event);
    const floorPoint = unprojectFloorPoint(point, camera);
    if (!floorPoint) {
      return;
    }
    event.stopPropagation();
    onSelectObject(object.id);
    onDragStart();
    dragRef.current = {
      kind: 'floor',
      pointerId: event.pointerId,
      id: object.id,
      offsetX: object.x - floorPoint.x,
      offsetZ: object.z - floorPoint.z,
    };
    svg.setPointerCapture(event.pointerId);
  };

  const beginWallDrag = (event: ReactPointerEvent, object: WallObject) => {
    const svg = ref.current;
    if (!svg) {
      return;
    }
    const point = svgPointerPoint(svg, event);
    const local = wallObjectLocalFromCanvas(
      point,
      object,
      room,
      camera,
    );
    if (!local) {
      return;
    }
    event.stopPropagation();
    onSelectObject(object.id);
    onDragStart();
    dragRef.current = {
      kind: 'wall',
      pointerId: event.pointerId,
      id: object.id,
      offsetU: object.u - local.u,
      offsetV: object.v - local.v,
    };
    svg.setPointerCapture(event.pointerId);
  };

  const beginVpDrag = (event: ReactPointerEvent) => {
    const svg = ref.current;
    if (!svg) {
      return;
    }
    event.stopPropagation();
    onSelectVp();
    onDragStart();
    dragRef.current = { kind: 'vp', pointerId: event.pointerId };
    svg.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
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
        clampVpX(point.x, camera.frame, 0.16),
        clampVpY(point.y, camera.frame, 0.12),
      );
      return;
    }
    if (drag.kind === 'floor') {
      const floorPoint = unprojectFloorPoint(point, camera);
      if (!floorPoint) {
        return;
      }
      onFloorObjectMove(
        drag.id,
        floorPoint.x + drag.offsetX,
        floorPoint.z + drag.offsetZ,
      );
      return;
    }
    const object = scene.wallObjects.find((item) => item.id === drag.id);
    if (!object) {
      return;
    }
    const local = wallObjectLocalFromCanvas(point, object, room, camera);
    if (!local) {
      return;
    }
    onWallObjectMove(
      drag.id,
      local.u + drag.offsetU,
      local.v + drag.offsetV,
    );
  };

  const handlePointerUp = (event: ReactPointerEvent) => {
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

  const surfaceFill = (surface: RoomSurfaceId): string => {
    if (colored) {
      return scene.wallColors[surface];
    }
    if (surface === 'ceiling') {
      return '#fffdf7';
    }
    if (surface === 'floor') {
      return '#faf6ed';
    }
    if (surface === 'back') {
      return '#fffdf8';
    }
    return surface === 'left' ? '#f8f3e8' : '#f5efe3';
  };

  const sortedFloorObjects = [...scene.floorObjects].sort(
    (a, b) => b.z - a.z,
  );
  const vp = projected.vp;

  let selectedLabel: ObjectLabel | null = null;
  if (selection?.kind === 'object') {
    const floorObject = scene.floorObjects.find(
      (item) => item.id === selection.id,
    );
    if (floorObject) {
      const top = projectPoint(
        {
          x: floorObject.x,
          y: floorObject.height,
          z: floorObject.z,
        },
        camera,
      );
      selectedLabel = {
        x: top.x,
        y: top.y - 15,
        text: floorObject.label,
      };
    } else {
      const wallObject = scene.wallObjects.find(
        (item) => item.id === selection.id,
      );
      if (wallObject) {
        const bounds = projectWallObject(
          wallObject,
          room,
          camera,
        ).bounds;
        selectedLabel = {
          x: (bounds.left + bounds.right) / 2,
          y: bounds.top - 13,
          text: wallObject.label,
        };
      }
    }
  }

  return (
    <svg
      ref={ref}
      className="canvas-svg"
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      data-testid="room-canvas"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onSelectObject(null);
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
          onSelectObject(null);
        }}
      />

      <g>
        {surfaceOrder.map((surface) => {
          const corners = projected.surfaces[surface].corners;
          const selected = isSurfaceSelected(selection, surface);
          return (
            <polygon
              key={surface}
              data-testid={`surface-${surface}`}
              points={pointsToSvg(corners)}
              fill={surfaceFill(surface)}
              stroke={selected ? '#e95f3c' : 'none'}
              strokeWidth={selected ? 5 : 0}
              style={{ cursor: 'pointer' }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelectSurface(surface);
              }}
            />
          );
        })}
      </g>

      {scene.guides.floorLines && (
        <g className="guide-floor">
          {guideLines
            .filter((guide) => guide.kind === 'floor')
            .map((guide) => (
              <polyline
                key={guide.id}
                points={pointsToSvg(guide.points)}
                fill="none"
                stroke="#2e9c8c"
                strokeWidth={1.5}
                strokeDasharray="7 5"
                opacity={0.8}
                pointerEvents="none"
              />
            ))}
        </g>
      )}

      {scene.guides.ceilingLines && (
        <g className="guide-ceiling">
          {guideLines
            .filter((guide) => guide.kind === 'ceiling')
            .map((guide) => (
              <polyline
                key={guide.id}
                points={pointsToSvg(guide.points)}
                fill="none"
                stroke="#d88f3a"
                strokeWidth={1.4}
                strokeDasharray="7 5"
                opacity={0.75}
                pointerEvents="none"
              />
            ))}
        </g>
      )}

      {scene.guides.wallDepthLines && (
        <g className="guide-wall">
          {guideLines
            .filter(
              (guide) =>
                guide.kind === 'wall' || guide.kind === 'corner',
            )
            .map((guide) => (
              <polyline
                key={guide.id}
                points={pointsToSvg(guide.points)}
                fill="none"
                stroke={guide.kind === 'corner' ? '#415a66' : '#8a74b3'}
                strokeWidth={guide.kind === 'corner' ? 1.2 : 1.4}
                strokeDasharray={guide.kind === 'corner' ? '4 4' : '7 5'}
                opacity={guide.kind === 'corner' ? 0.55 : 0.7}
                pointerEvents="none"
              />
            ))}
        </g>
      )}

      <g>
        {wallOrder.map((wall) =>
          scene.wallObjects
            .filter((object) => object.wall === wall)
            .map((object) => (
              <g
                key={object.id}
                data-testid={`room-wall-object-${object.id}`}
                data-object-type={object.type}
                onPointerDown={(event) =>
                  beginWallDrag(event, object)
                }
              >
                <WallObjectShape
                  object={object}
                  geometry={room}
                  camera={camera}
                  selected={isObjectSelected(selection, object.id)}
                  colored={colored}
                />
              </g>
            )),
        )}
      </g>

      <g>
        {sortedFloorObjects.map((object) => (
          <g
            key={object.id}
            data-testid={`room-floor-object-${object.id}`}
            data-object-type={object.type}
            onPointerDown={(event) => beginFloorDrag(event, object)}
          >
            <FloorObjectShape
              object={object}
              camera={camera}
              selected={isObjectSelected(selection, object.id)}
              colored={colored}
            />
          </g>
        ))}
      </g>

      {scene.guides.objectLines && (
        <g className="guide-objects" pointerEvents="none">
          {scene.floorObjects.map((object) => {
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
            return (
              <g key={object.id}>
                {ground.map((point, index) => (
                  <line
                    key={index}
                    x1={point.x}
                    y1={point.y}
                    x2={vp.x}
                    y2={vp.y}
                    stroke={
                      isObjectSelected(selection, object.id)
                        ? '#d85d3f'
                        : '#7a8a90'
                    }
                    strokeWidth={
                      isObjectSelected(selection, object.id) ? 1.2 : 0.8
                    }
                    strokeDasharray="5 5"
                    opacity={
                      isObjectSelected(selection, object.id) ? 0.75 : 0.28
                    }
                  />
                ))}
              </g>
            );
          })}
        </g>
      )}

      <g pointerEvents="none">
        {getRoomEdges(room).map((edge) => {
          const a = projectPoint(edge.a, camera);
          const b = projectPoint(edge.b, camera);
          const emphasized = edge.id.includes('back');
          return (
            <line
              key={edge.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#263b47"
              strokeWidth={emphasized ? 2.6 : 1.7}
              strokeLinecap="round"
            />
          );
        })}
        <rect
          data-testid="room-outer-frame"
          x={camera.frame.left}
          y={camera.frame.top}
          width={camera.frame.right - camera.frame.left}
          height={camera.frame.bottom - camera.frame.top}
          fill="none"
          stroke="#263b47"
          strokeWidth={3}
        />
        <polygon
          data-testid="room-back-wall"
          points={pointsToSvg(projected.backWall.corners)}
          fill="none"
          stroke="#263b47"
          strokeWidth={2.8}
        />
      </g>

      {scene.guides.horizon && (
        <g pointerEvents="none">
          <line
            data-testid="room-horizon"
            x1={28}
            y1={camera.horizonY}
            x2={972}
            y2={camera.horizonY}
            stroke="#d85d3f"
            strokeWidth={1.7}
            strokeDasharray="10 7"
            opacity={0.85}
          />
          <text
            x={34}
            y={camera.horizonY - 9}
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
          data-testid="room-vp-marker"
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
            y={-30}
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

      {selectedLabel && <SelectedObjectLabel label={selectedLabel} />}
    </svg>
  );
}

interface ObjectLabel {
  x: number;
  y: number;
  text: string;
}

function SelectedObjectLabel({ label }: { label: ObjectLabel }) {
  const width = label.text.length * 16 + 18;
  return (
    <g pointerEvents="none">
      <rect
        x={label.x - width / 2}
        y={label.y - 18}
        width={width}
        height={25}
        rx={12}
        fill="#fffaf0"
        stroke="#e3d5bd"
      />
      <text
        x={label.x}
        y={label.y}
        textAnchor="middle"
        fill="#2a414d"
        fontSize={15}
        fontWeight={700}
      >
        {label.text}
      </text>
    </g>
  );
}

