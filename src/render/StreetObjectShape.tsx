import type { ReactElement } from 'react';
import {
  pointsToSvg,
  projectPoint,
  type ProjectionCamera,
  type Vec2,
} from '../core/perspectiveCore';
import {
  projectBox,
  type Box3D,
  type BoxFaceName,
} from '../core/objectProjection';
import type { BasicObject } from '../model/sceneModel';
import { shade } from '../utils/color';

interface StreetObjectShapeProps {
  object: BasicObject;
  camera: ProjectionCamera;
  selected: boolean;
}

interface BoxShapeProps {
  box: Box3D;
  camera: ProjectionCamera;
  color: string;
  accent: string;
  outline?: boolean;
}

function faceFill(face: BoxFaceName, color: string): string {
  if (face === 'front') {
    return color;
  }
  return face === 'top' ? shade(color, 0.16) : shade(color, -0.2);
}

function BoxShape({
  box,
  camera,
  color,
  accent,
  outline = true,
}: BoxShapeProps) {
  const projected = projectBox(box, camera);
  return (
    <g>
      {projected.visibleFaces.map((face) => (
        <polygon
          key={face}
          points={pointsToSvg(projected.faces[face])}
          fill={faceFill(face, color)}
          stroke={outline ? accent : 'none'}
          strokeWidth={outline ? 1.2 : 0}
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

function quad(
  points: [Vec2, Vec2, Vec2, Vec2],
  fill: string,
  stroke: string,
  strokeWidth = 1,
): ReactElement {
  return (
    <polygon
      points={pointsToSvg(points)}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  );
}

export function StreetObjectShape({
  object,
  camera,
  selected,
}: StreetObjectShapeProps) {
  const base = object.color;
  const accent = shade(object.color, -0.46);
  const secondary = shade(object.color, 0.2);
  const dark = shade(object.color, -0.24);
  const windowColor = '#dcecf2';

  const project = (x: number, y: number, z: number): Vec2 =>
    projectPoint({ x, y, z }, camera);

  const body = (() => {
    switch (object.type) {
      case 'road': {
        const topY = object.height + 0.002;
        const nearZ = object.z - object.depth / 2;
        const farZ = object.z + object.depth / 2;
        const left = object.x - object.width / 2;
        const right = object.x + object.width / 2;
        const dashWidth = 0.07;
        const dashes: string[] = [];
        for (
          let z = nearZ + 0.8;
          z < farZ - 0.35;
          z += 1.5
        ) {
          const z1 = Math.min(z + 0.75, farZ - 0.2);
          dashes.push(
            pointsToSvg([
              project(object.x - dashWidth, topY, z),
              project(object.x + dashWidth, topY, z),
              project(object.x + dashWidth, topY, z1),
              project(object.x - dashWidth, topY, z1),
            ]),
          );
        }
        const sideInset = Math.min(0.14, object.width * 0.06);
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
            />
            <line
              x1={project(left + sideInset, topY, nearZ + 0.2).x}
              y1={project(left + sideInset, topY, nearZ + 0.2).y}
              x2={project(left + sideInset, topY, farZ - 0.2).x}
              y2={project(left + sideInset, topY, farZ - 0.2).y}
              stroke="#f4e8bf"
              strokeWidth={1.6}
              opacity={0.9}
            />
            <line
              x1={project(right - sideInset, topY, nearZ + 0.2).x}
              y1={project(right - sideInset, topY, nearZ + 0.2).y}
              x2={project(right - sideInset, topY, farZ - 0.2).x}
              y2={project(right - sideInset, topY, farZ - 0.2).y}
              stroke="#f4e8bf"
              strokeWidth={1.6}
              opacity={0.9}
            />
            {dashes.map((points, index) => (
              <polygon
                key={index}
                points={points}
                fill="#f4d77e"
                opacity={0.95}
              />
            ))}
          </>
        );
      }
      case 'car': {
        const wheelRadius = Math.min(0.3, object.height * 0.2);
        const bodyBase = object.height * 0.18;
        const bodyHeight = object.height * 0.43;
        const cabinBase = bodyBase + bodyHeight * 0.68;
        const cabinHeight = Math.max(
          object.height * 0.22,
          object.height - cabinBase,
        );
        const cabinWidth = object.width * 0.72;
        const cabinDepth = object.depth * 0.55;
        const cabinZ = object.z + object.depth * 0.04;
        const cabinFrontZ = cabinZ - cabinDepth / 2 - 0.002;
        const wheelScaleX = camera.focalX / object.z;
        const wheelScaleY = camera.focalY / object.z;
        const cabinLeft = object.x - cabinWidth / 2;
        const cabinRight = object.x + cabinWidth / 2;
        const windowBottom = cabinBase + cabinHeight * 0.24;
        const windowTop = cabinBase + cabinHeight * 0.82;
        return (
          <>
            {[-1, 1].map((side) =>
              [-1, 1].map((end) => {
                const cx =
                  object.x +
                  side * (object.width / 2 - wheelRadius * 0.5);
                const cz = object.z + end * object.depth * 0.3;
                return (
                  <ellipse
                    key={`${side}-${end}`}
                    cx={project(cx, wheelRadius, cz).x}
                    cy={project(cx, wheelRadius, cz).y}
                    rx={wheelRadius * wheelScaleX}
                    ry={wheelRadius * wheelScaleY}
                    fill="#2f3b41"
                    stroke={accent}
                    strokeWidth={1}
                  />
                );
              }),
            )}
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width,
                height: bodyHeight,
                depth: object.depth,
                baseY: bodyBase,
              }}
              camera={camera}
              color={base}
              accent={accent}
            />
            <BoxShape
              box={{
                x: object.x,
                z: cabinZ,
                width: cabinWidth,
                height: cabinHeight,
                depth: cabinDepth,
                baseY: cabinBase,
              }}
              camera={camera}
              color={secondary}
              accent={accent}
            />
            {quad(
              [
                project(cabinLeft + cabinWidth * 0.08, windowBottom, cabinFrontZ),
                project(cabinRight - cabinWidth * 0.08, windowBottom, cabinFrontZ),
                project(cabinRight - cabinWidth * 0.08, windowTop, cabinFrontZ),
                project(cabinLeft + cabinWidth * 0.08, windowTop, cabinFrontZ),
              ],
              windowColor,
              accent,
              1,
            )}
            <line
              x1={project(object.x, windowBottom, cabinFrontZ).x}
              y1={project(object.x, windowBottom, cabinFrontZ).y}
              x2={project(object.x, windowTop, cabinFrontZ).x}
              y2={project(object.x, windowTop, cabinFrontZ).y}
              stroke={accent}
              strokeWidth={1}
            />
            {[-1, 1].map((side) => {
              const x = object.x + side * object.width * 0.3;
              const z = object.z - object.depth / 2 - 0.004;
              const y = bodyBase + bodyHeight * 0.48;
              const radius = Math.max(
                1.4,
                (camera.focalX * 0.06) / object.z,
              );
              return (
                <circle
                  key={side}
                  cx={project(x, y, z).x}
                  cy={project(x, y, z).y}
                  r={radius}
                  fill="#f7e6a8"
                  stroke={accent}
                  strokeWidth={0.9}
                />
              );
            })}
          </>
        );
      }
      case 'house': {
        const wallHeight = object.height * 0.7;
        const roofHeight = object.height - wallHeight;
        const minZ = object.z - object.depth / 2;
        const maxZ = object.z + object.depth / 2;
        const left = object.x - object.width / 2;
        const right = object.x + object.width / 2;
        const frontZ = minZ - 0.002;
        const ridgeY = wallHeight + roofHeight;
        const roofColor = shade(base, -0.3);
        const roofLight = shade(base, -0.16);
        const wallFront = shade(base, 0.05);
        return (
          <>
            <BoxShape
              box={{
                x: object.x,
                z: object.z,
                width: object.width,
                height: wallHeight,
                depth: object.depth,
              }}
              camera={camera}
              color={base}
              accent={accent}
            />
            <polygon
              points={pointsToSvg([
                project(left, wallHeight, minZ),
                project(right, wallHeight, minZ),
                project(object.x, ridgeY, minZ),
              ])}
              fill={wallFront}
              stroke={accent}
              strokeWidth={1.1}
              strokeLinejoin="round"
            />

            {quad(
              [
                project(left, wallHeight, minZ),
                project(object.x, ridgeY, minZ),
                project(object.x, ridgeY, maxZ),
                project(left, wallHeight, maxZ),
              ],
              roofColor,
              accent,
              1.1,
            )}
            {quad(
              [
                project(right, wallHeight, minZ),
                project(right, wallHeight, maxZ),
                project(object.x, ridgeY, maxZ),
                project(object.x, ridgeY, minZ),
              ],
              roofLight,
              accent,
              1.1,
            )}
            <line
              x1={project(object.x, ridgeY, minZ).x}
              y1={project(object.x, ridgeY, minZ).y}
              x2={project(object.x, ridgeY, maxZ).x}
              y2={project(object.x, ridgeY, maxZ).y}
              stroke={accent}
              strokeWidth={1.2}
            />
            {quad(
              [
                project(left + object.width * 0.16, 0, frontZ),
                project(left + object.width * 0.38, 0, frontZ),
                project(left + object.width * 0.38, wallHeight * 0.58, frontZ),
                project(left + object.width * 0.16, wallHeight * 0.58, frontZ),
              ],
              dark,
              accent,
              1,
            )}
            {quad(
              [
                project(left + object.width * 0.58, wallHeight * 0.4, frontZ),
                project(left + object.width * 0.84, wallHeight * 0.4, frontZ),
                project(left + object.width * 0.84, wallHeight * 0.74, frontZ),
                project(left + object.width * 0.58, wallHeight * 0.74, frontZ),
              ],
              windowColor,
              accent,
              1,
            )}
            <line
              x1={project(
                left + object.width * 0.71,
                wallHeight * 0.4,
                frontZ,
              ).x}
              y1={project(
                left + object.width * 0.71,
                wallHeight * 0.4,
                frontZ,
              ).y}
              x2={project(
                left + object.width * 0.71,
                wallHeight * 0.74,
                frontZ,
              ).x}
              y2={project(
                left + object.width * 0.71,
                wallHeight * 0.74,
                frontZ,
              ).y}
              stroke={accent}
              strokeWidth={1}
            />
          </>
        );
      }
      default:
        return null;
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
  const padding = object.type === 'road' ? 8 : 4;

  return (
    <g
      data-object-id={object.id}
      data-object-type={object.type}
      style={{ cursor: 'grab' }}
    >
      {body}
      {selected && (
        <rect
          x={projection.bounds.left - padding}
          y={projection.bounds.top - padding}
          width={
            projection.bounds.right - projection.bounds.left + padding * 2
          }
          height={
            projection.bounds.bottom - projection.bounds.top + padding * 2
          }
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
