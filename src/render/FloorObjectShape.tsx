import type { ProjectionCamera, Vec2 } from '../core/perspectiveCore';
import { pointsToSvg, projectPoint } from '../core/perspectiveCore';
import {
  projectBox,
  projectCylinder,
  type Box3D,
  type BoxFaceName,
} from '../core/objectProjection';
import type { FloorObject } from '../model/sceneModel';
import { shade } from '../utils/color';

interface FloorObjectShapeProps {
  object: FloorObject;
  camera: ProjectionCamera;
  selected: boolean;
  colored: boolean;
}

interface BoxShapeProps {
  box: Box3D;
  camera: ProjectionCamera;
  color: string;
  accent: string;
  colored: boolean;
  outline?: boolean;
  opacity?: number;
}

function faceFill(
  face: BoxFaceName,
  color: string,
  colored: boolean,
): string {
  if (!colored) {
    if (face === 'front') {
      return '#fbf8f0';
    }
    if (face === 'top') {
      return '#f0ede4';
    }
    return '#e2e0d8';
  }
  if (face === 'front') {
    return color;
  }
  return face === 'top' ? shade(color, 0.18) : shade(color, -0.18);
}

function BoxShape({
  box,
  camera,
  color,
  accent,
  colored,
  outline = true,
  opacity = 1,
}: BoxShapeProps) {
  const projected = projectBox(box, camera);
  return (
    <g opacity={opacity}>
      {projected.visibleFaces.map((face) => (
        <polygon
          key={face}
          points={pointsToSvg(projected.faces[face])}
          fill={faceFill(face, color, colored)}
          stroke={outline ? accent : 'none'}
          strokeWidth={outline ? 1.2 : 0}
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

function circleAt(
  camera: ProjectionCamera,
  cx: number,
  cy: number,
  z: number,
  radius: number,
  segments = 28,
): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(
      projectPoint(
        {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          z,
        },
        camera,
      ),
    );
  }
  return points;
}

export function FloorObjectShape({
  object,
  camera,
  selected,
  colored,
}: FloorObjectShapeProps) {
  const base = colored ? object.color : '#fbf8f0';
  const accent = colored ? object.accentColor : '#344c55';
  const secondary = colored ? shade(object.color, 0.24) : '#f1eee5';
  const dark = colored ? shade(object.color, -0.2) : '#e1ded6';
  const headSkin = colored ? '#e8b07a' : '#f4f0e4';

  const front = (u: number, v: number): Vec2 =>
    projectPoint(
      {
        x: object.x - object.width / 2 + u * object.width,
        y: object.height * (1 - v),
        z: object.z - object.depth / 2,
      },
      camera,
    );

  const frontRect = (
    u0: number,
    v0: number,
    u1: number,
    v1: number,
  ): Vec2[] => [
    front(u0, v0),
    front(u1, v0),
    front(u1, v1),
    front(u0, v1),
  ];

  const frontCircle = (
    u: number,
    v: number,
    r: number,
    segments = 28,
  ): Vec2[] => {
    const cx = object.x - object.width / 2 + u * object.width;
    const cy = object.height * (1 - v);
    return circleAt(
      camera,
      cx,
      cy,
      object.z - object.depth / 2,
      r,
      segments,
    );
  };

  const addCircle = (
    points: Vec2[],
    fill: string,
    stroke: string,
    strokeWidth = 1.2,
    key?: string,
  ) => (
    <polygon
      key={key}
      points={pointsToSvg(points)}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );

  const body = (() => {
    switch (object.type) {
      case 'table': {
        const topHeight = Math.min(0.11, object.height * 0.18);
        const legHeight = object.height - topHeight;
        const legWidth = Math.min(0.09, object.width * 0.11);
        const legDepth = Math.min(0.09, object.depth * 0.16);
        const xOffset = object.width / 2 - legWidth / 2 - 0.02;
        const zOffset = object.depth / 2 - legDepth / 2 - 0.02;
        return (
          <>
            {[
              [-xOffset, -zOffset],
              [xOffset, -zOffset],
              [-xOffset, zOffset],
              [xOffset, zOffset],
            ].map(([dx, dz], index) => (
              <BoxShape
                key={index}
                box={{
                  x: object.x + dx,
                  z: object.z + dz,
                  width: legWidth,
                  height: legHeight,
                  depth: legDepth,
                  baseY: 0,
                }}
                camera={camera}
                color={dark}
                accent={accent}
                colored={colored}
              />
            ))}
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width,
                height: topHeight,
                depth: object.depth,
                baseY: legHeight,
              }}
              camera={camera}
              color={secondary}
              accent={accent}
              colored={colored}
            />
          </>
        );
      }
      case 'chair': {
        const seatY = object.height * 0.46;
        const seatHeight = object.height * 0.09;
        return (
          <>
            {[
              [-object.width * 0.38, -object.depth * 0.32],
              [object.width * 0.38, -object.depth * 0.32],
              [-object.width * 0.38, object.depth * 0.32],
              [object.width * 0.38, object.depth * 0.32],
            ].map(([dx, dz], index) => (
              <BoxShape
                key={index}
                box={{
                  x: object.x + dx,
                  z: object.z + dz,
                  width: 0.055,
                  height: seatY,
                  depth: 0.055,
                  baseY: 0,
                }}
                camera={camera}
                color={dark}
                accent={accent}
                colored={colored}
              />
            ))}
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width,
                height: seatHeight,
                depth: object.depth,
                baseY: seatY,
              }}
              camera={camera}
              color={secondary}
              accent={accent}
              colored={colored}
            />
            <BoxShape
              box={{
                x: object.x,
                z: object.z + object.depth / 2 - 0.055,
                width: object.width,
                height: object.height - seatY,
                depth: 0.075,
                baseY: seatY,
              }}
              camera={camera}
              color={base}
              accent={accent}
              colored={colored}
            />
          </>
        );
      }
      case 'cabinet': {
        return (
          <>
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width,
                height: object.height,
                depth: object.depth,
              }}
              camera={camera}
              color={base}
              accent={accent}
              colored={colored}
            />
            <line
              x1={front(0.5, 0.04).x}
              y1={front(0.5, 0.04).y}
              x2={front(0.5, 0.96).x}
              y2={front(0.5, 0.96).y}
              stroke={accent}
              strokeWidth={1.5}
            />
            <polygon
              points={pointsToSvg(frontRect(0.08, 0.08, 0.46, 0.92))}
              fill="none"
              stroke={accent}
              strokeWidth={1.1}
            />
            <polygon
              points={pointsToSvg(frontRect(0.54, 0.08, 0.92, 0.92))}
              fill="none"
              stroke={accent}
              strokeWidth={1.1}
            />
            <circle
              cx={front(0.43, 0.52).x}
              cy={front(0.43, 0.52).y}
              r={2.3}
              fill={colored ? '#f1c96d' : '#f4f0e5'}
              stroke={accent}
              strokeWidth={1}
            />
            <circle
              cx={front(0.57, 0.52).x}
              cy={front(0.57, 0.52).y}
              r={2.3}
              fill={colored ? '#f1c96d' : '#f4f0e5'}
              stroke={accent}
              strokeWidth={1}
            />
          </>
        );
      }
      case 'bookshelf': {
        return (
          <>
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width,
                height: object.height,
                depth: object.depth,
              }}
              camera={camera}
              color={base}
              accent={accent}
              colored={colored}
            />
            {[0.2, 0.42, 0.64, 0.86].map((v, index) => (
              <line
                key={index}
                x1={front(0.07, v).x}
                y1={front(0.07, v).y}
                x2={front(0.93, v).x}
                y2={front(0.93, v).y}
                stroke={accent}
                strokeWidth={1.4}
              />
            ))}
            {[
              [0.1, 0.3, 0.26],
              [0.28, 0.44, 0.22],
              [0.47, 0.65, 0.26],
              [0.67, 0.83, 0.2],
            ].map(([u0, u1, v], index) => (
              <polygon
                key={index}
                points={pointsToSvg(frontRect(u0, v, u1, Math.min(0.18, v + 0.1)))}
                fill={
                  colored
                    ? index % 2 === 0
                      ? '#d5a85c'
                      : '#6f9aa9'
                    : '#e8e3d8'
                }
                stroke={accent}
                strokeWidth={0.7}
              />
            ))}
          </>
        );
      }
      case 'bed': {
        const mattressBase = object.height * 0.42;
        return (
          <>
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width,
                height: mattressBase,
                depth: object.depth,
              }}
              camera={camera}
              color={dark}
              accent={accent}
              colored={colored}
            />
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width,
                height: object.height - mattressBase,
                depth: object.depth,
                baseY: mattressBase,
              }}
              camera={camera}
              color={secondary}
              accent={accent}
              colored={colored}
            />
            <BoxShape
              box={{
                x: object.x - object.width * 0.12,
                z: object.z + object.depth * 0.18,
                width: object.width * 0.42,
                height: Math.max(0.06, object.height * 0.17),
                depth: object.depth * 0.3,
                baseY: object.height,
              }}
              camera={camera}
              color={colored ? '#f1e7d8' : '#f7f4eb'}
              accent={accent}
              colored={colored}
            />
            <BoxShape
              box={{
                x: object.x + object.width * 0.08,
                z: object.z - object.depth * 0.24,
                width: object.width * 0.66,
                height: Math.max(0.04, object.height * 0.08),
                depth: object.depth * 0.42,
                baseY: object.height,
              }}
              camera={camera}
              color={base}
              accent={accent}
              colored={colored}
            />
          </>
        );
      }
      case 'sofa': {
        const seatHeight = object.height * 0.44;
        return (
          <>
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width,
                height: seatHeight,
                depth: object.depth,
              }}
              camera={camera}
              color={base}
              accent={accent}
              colored={colored}
            />
            <BoxShape
              box={{
                x: object.x,
                z: object.z + object.depth / 2 - 0.15,
                width: object.width,
                height: object.height - seatHeight,
                depth: 0.18,
                baseY: seatHeight,
              }}
              camera={camera}
              color={secondary}
              accent={accent}
              colored={colored}
            />
            {[-1, 1].map((side) => (
              <BoxShape
                key={side}
                box={{
                  x: object.x + side * (object.width / 2 - 0.1),
                  z: object.z,
                  width: 0.2,
                  height: object.height * 0.7,
                  depth: object.depth,
                  baseY: 0,
                }}
                camera={camera}
                color={base}
                accent={accent}
                colored={colored}
              />
            ))}
          </>
        );
      }
      case 'person': {
        const legHeight = object.height * 0.42;
        const bodyHeight = object.height * 0.38;
        const headRadius = object.width * 0.27;
        return (
          <>
            {[-1, 1].map((side) => (
              <BoxShape
                key={side}
                box={{
                  x: object.x + side * object.width * 0.2,
                  z: object.z,
                  width: object.width * 0.24,
                  height: legHeight,
                  depth: object.depth * 0.7,
                }}
                camera={camera}
                color={colored ? '#536c7a' : '#ece9e1'}
                accent={accent}
                colored={colored}
              />
            ))}
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width,
                height: bodyHeight,
                depth: object.depth,
                baseY: legHeight,
              }}
              camera={camera}
              color={base}
              accent={accent}
              colored={colored}
            />
            {[-1, 1].map((side) => (
              <BoxShape
                key={`arm-${side}`}
                box={{
                  x: object.x + side * (object.width / 2 + 0.04),
                  z: object.z,
                  width: 0.08,
                  height: bodyHeight * 0.8,
                  depth: 0.12,
                  baseY: legHeight,
                }}
                camera={camera}
                color={headSkin}
                accent={accent}
                colored={colored}
              />
            ))}
            {addCircle(
              frontCircle(0.5, 0.16, headRadius, 34),
              headSkin,
              accent,
              1.4,
              'head',
            )}
            <circle
              cx={front(0.43, 0.14).x}
              cy={front(0.43, 0.14).y}
              r={1.5}
              fill={accent}
            />
            <circle
              cx={front(0.57, 0.14).x}
              cy={front(0.57, 0.14).y}
              r={1.5}
              fill={accent}
            />
          </>
        );
      }
      case 'tree': {
        const trunkHeight = object.height * 0.52;
        return (
          <>
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width * 0.2,
                height: trunkHeight,
                depth: object.width * 0.2,
              }}
              camera={camera}
              color={colored ? '#8a6542' : '#e4ded1'}
              accent={accent}
              colored={colored}
            />
            {[
              [0, object.height * 0.69, 0, object.width * 0.44],
              [-object.width * 0.28, object.height * 0.82, 0.04, object.width * 0.34],
              [object.width * 0.3, object.height * 0.84, -0.04, object.width * 0.36],
            ].map(([dx, cy, dz, radius], index) =>
              addCircle(
                circleAt(
                  camera,
                  object.x + dx,
                  cy,
                  object.z + dz,
                  radius,
                  30,
                ),
                colored ? shade(object.accentColor, index * 0.07) : '#e4e7df',
                accent,
                1.2,
                `leaf-${index}`,
              ),
            )}
            <rect
              x={object.x}
              y={0}
              width={0}
              height={0}
              fill="none"
            />
          </>
        );
      }
      case 'plant':
      case 'flower': {
        const potHeight = object.height * (object.type === 'flower' ? 0.34 : 0.3);
        const petalCount = object.type === 'flower' ? 7 : 5;
        return (
          <>
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width * 0.66,
                height: potHeight,
                depth: object.depth * 0.66,
              }}
              camera={camera}
              color={colored ? '#b96b4f' : '#f1e9dc'}
              accent={accent}
              colored={colored}
            />
            {Array.from({ length: petalCount }, (_, index) => {
              const angle = (index / petalCount) * Math.PI * 2;
              const radius = object.width * 0.18;
              const dx = Math.cos(angle) * object.width * 0.22;
              const dz = Math.sin(angle) * object.depth * 0.12;
              const cy =
                object.height *
                (object.type === 'flower' ? 0.74 : 0.62 + (index % 3) * 0.06);
              return addCircle(
                circleAt(
                  camera,
                  object.x + dx,
                  cy,
                  object.z + dz,
                  radius,
                  22,
                ),
                colored ? object.accentColor : '#dfe6da',
                accent,
                1,
                `petal-${index}`,
              );
            })}
            <line
              x1={front(0.5, 0.3).x}
              y1={front(0.5, 0.3).y}
              x2={front(0.5, 0.62).x}
              y2={front(0.5, 0.62).y}
              stroke={accent}
              strokeWidth={1.4}
            />
          </>
        );
      }
      case 'lamp': {
        return (
          <>
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width * 0.62,
                height: 0.07,
                depth: object.depth * 0.62,
              }}
              camera={camera}
              color={dark}
              accent={accent}
              colored={colored}
            />
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: 0.07,
                height: object.height * 0.78,
                depth: 0.07,
                baseY: 0.05,
              }}
              camera={camera}
              color={accent}
              accent={accent}
              colored={colored}
            />
            {addCircle(
              circleAt(
                camera,
                object.x,
                object.height * 0.86,
                object.z,
                object.width * 0.34,
                28,
              ),
              colored ? '#f5d57f' : '#f4eedc',
              accent,
              1.4,
              'lamp-head',
            )}
          </>
        );
      }
      case 'cylinder': {
        const cylinder = projectCylinder(
          {
            x: object.x,
            z: object.z,
            width: object.width,
            height: object.height,
            depth: object.depth,
            baseY: 0,
          },
          camera,
        );
        return (
          <>
            <polygon
              points={pointsToSvg(cylinder.hull)}
              fill={base}
              stroke={accent}
              strokeWidth={1.4}
            />
            <polygon
              points={pointsToSvg(cylinder.top)}
              fill={secondary}
              stroke={accent}
              strokeWidth={1.2}
            />
            <polyline
              points={pointsToSvg([...cylinder.bottom, cylinder.bottom[0]])}
              fill="none"
              stroke={accent}
              strokeWidth={0.8}
              opacity={0.5}
            />
          </>
        );
      }
      case 'cube':
      case 'cuboid':
      default:
        return (
          <BoxShape
            box={{
              x: object.x,
              z: object.z,
              width: object.width,
              height: object.height,
              depth: object.depth,
            }}
            camera={camera}
            color={base}
            accent={accent}
            colored={colored}
          />
        );
    }
  })();

  const projection = projectBox(
    {
      x: object.x,
      z: object.z,
      width: object.width,
      height: object.height,
      depth: object.depth,
    },
    camera,
  );

  return (
    <g
      data-object-id={object.id}
      data-object-type={object.type}
      style={{ cursor: 'grab' }}
    >
      {body}
      {selected && (
        <rect
          x={projection.bounds.left - 4}
          y={projection.bounds.top - 4}
          width={projection.bounds.right - projection.bounds.left + 8}
          height={projection.bounds.bottom - projection.bounds.top + 8}
          fill="none"
          stroke="#e95f3c"
          strokeWidth={2.5}
          strokeDasharray="7 4"
          pointerEvents="none"
        />
      )}
    </g>
  );
}
