import type { ProjectionCamera, Vec2 } from '../core/perspectiveCore';
import { pointsToSvg } from '../core/perspectiveCore';
import type { RoomGeometry } from '../core/roomGeometry';
import {
  projectWallObject,
  projectWallObjectLocalPoint,
} from '../core/wallAnchors';
import type { WallObject } from '../model/sceneModel';
import { shade } from '../utils/color';

interface WallObjectShapeProps {
  object: WallObject;
  geometry: RoomGeometry;
  camera: ProjectionCamera;
  selected: boolean;
  colored: boolean;
}

export function WallObjectShape({
  object,
  geometry,
  camera,
  selected,
  colored,
}: WallObjectShapeProps) {
  const projected = projectWallObject(object, geometry, camera);
  const corners = projected.corners;
  const fill = colored ? object.color : '#fffdf8';
  const accent = colored ? object.accentColor : '#314853';
  const soft = colored ? shade(object.color, 0.35) : '#eef0ec';
  const deep = colored ? shade(object.accentColor, -0.18) : '#6d7a80';

  const local = (u: number, v: number): Vec2 =>
    projectWallObjectLocalPoint(object, geometry, camera, u, v);

  const rect = (
    u0: number,
    v0: number,
    u1: number,
    v1: number,
  ): Vec2[] => [
    local(u0, v0),
    local(u1, v0),
    local(u1, v1),
    local(u0, v1),
  ];

  const circle = (
    u: number,
    v: number,
    radius: number,
    segments = 34,
  ): Vec2[] => {
    const points: Vec2[] = [];
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(local(u + Math.cos(angle) * radius, v + Math.sin(angle) * radius));
    }
    return points;
  };

  const content = (() => {
    switch (object.type) {
      case 'paintingLandscape':
        return (
          <>
            <polygon
              points={pointsToSvg(rect(0.08, 0.1, 0.92, 0.9))}
              fill={soft}
              stroke={deep}
              strokeWidth={1.2}
            />
            <polygon
              points={pointsToSvg(rect(0.1, 0.52, 0.9, 0.88))}
              fill={colored ? shade(object.accentColor, 0.18) : '#d9dedb'}
              opacity={0.95}
            />
            <circle
              {...(() => {
                const center = local(0.72, 0.3);
                const edge = local(0.79, 0.3);
                return {
                  cx: center.x,
                  cy: center.y,
                  r: Math.hypot(edge.x - center.x, edge.y - center.y),
                };
              })()}
              fill={colored ? '#f3c96f' : '#f0eee5'}
              stroke={deep}
              strokeWidth={1}
            />
            <polygon
              points={pointsToSvg([
                local(0.1, 0.78),
                local(0.32, 0.36),
                local(0.52, 0.78),
              ])}
              fill={colored ? shade(object.accentColor, -0.05) : '#aeb8b6'}
              stroke={deep}
              strokeWidth={1}
            />
            <polygon
              points={pointsToSvg([
                local(0.38, 0.78),
                local(0.62, 0.46),
                local(0.9, 0.78),
              ])}
              fill={colored ? shade(object.accentColor, 0.08) : '#c5ccc8'}
              stroke={deep}
              strokeWidth={1}
            />
            <polygon
              points={pointsToSvg(rect(0.1, 0.84, 0.9, 0.88))}
              fill={colored ? shade(object.accentColor, -0.28) : '#7f8c8b'}
            />
          </>
        );
      case 'paintingPortrait':
        return (
          <>
            <polygon
              points={pointsToSvg(rect(0.1, 0.08, 0.9, 0.92))}
              fill={soft}
              stroke={deep}
              strokeWidth={1.2}
            />
            <polygon
              points={pointsToSvg([
                local(0.5, 0.12),
                local(0.72, 0.4),
                local(0.62, 0.82),
                local(0.38, 0.82),
                local(0.28, 0.4),
              ])}
              fill={colored ? shade(object.accentColor, 0.16) : '#d6dcda'}
              stroke={deep}
              strokeWidth={1}
            />
            <circle
              {...(() => {
                const center = local(0.5, 0.38);
                const edge = local(0.58, 0.38);
                return {
                  cx: center.x,
                  cy: center.y,
                  r: Math.hypot(edge.x - center.x, edge.y - center.y),
                };
              })()}
              fill={colored ? '#f1d176' : '#f2efe7'}
              stroke={deep}
              strokeWidth={1}
            />
            <line
              x1={local(0.5, 0.46).x}
              y1={local(0.5, 0.46).y}
              x2={local(0.5, 0.76).x}
              y2={local(0.5, 0.76).y}
              stroke={deep}
              strokeWidth={1.6}
            />
            <line
              x1={local(0.36, 0.62).x}
              y1={local(0.36, 0.62).y}
              x2={local(0.64, 0.62).x}
              y2={local(0.64, 0.62).y}
              stroke={deep}
              strokeWidth={1.6}
            />
          </>
        );
      case 'decorativePainting':
        return (
          <>
            <polygon
              points={pointsToSvg(rect(0.08, 0.1, 0.92, 0.9))}
              fill={soft}
              stroke={deep}
              strokeWidth={1.2}
            />
            <polygon
              points={pointsToSvg([
                local(0.12, 0.84),
                local(0.44, 0.16),
                local(0.7, 0.84),
              ])}
              fill={colored ? object.accentColor : '#b5bfbc'}
              opacity={0.9}
            />
            <circle
              {...(() => {
                const center = local(0.7, 0.32);
                const edge = local(0.8, 0.32);
                return {
                  cx: center.x,
                  cy: center.y,
                  r: Math.hypot(edge.x - center.x, edge.y - center.y),
                };
              })()}
              fill={colored ? '#f0c56c' : '#efece2'}
              stroke={deep}
              strokeWidth={1}
            />
            <line
              x1={local(0.2, 0.72).x}
              y1={local(0.2, 0.72).y}
              x2={local(0.82, 0.72).x}
              y2={local(0.82, 0.72).y}
              stroke={deep}
              strokeWidth={1.2}
            />
          </>
        );
      case 'window':
        return (
          <>
            <polygon
              points={pointsToSvg(rect(0.06, 0.06, 0.94, 0.94))}
              fill={colored ? shade(object.color, 0.35) : '#eef3f2'}
              stroke={deep}
              strokeWidth={3}
            />
            <polygon
              points={pointsToSvg(rect(0.13, 0.13, 0.87, 0.87))}
              fill={colored ? '#a9cfdd' : '#f7fbfa'}
              stroke={accent}
              strokeWidth={1.2}
            />
            <line
              x1={local(0.5, 0.1).x}
              y1={local(0.5, 0.1).y}
              x2={local(0.5, 0.9).x}
              y2={local(0.5, 0.9).y}
              stroke={deep}
              strokeWidth={3}
            />
            <line
              x1={local(0.1, 0.5).x}
              y1={local(0.1, 0.5).y}
              x2={local(0.9, 0.5).x}
              y2={local(0.9, 0.5).y}
              stroke={deep}
              strokeWidth={3}
            />
            <polygon
              points={pointsToSvg([
                local(0.16, 0.78),
                local(0.34, 0.18),
                local(0.43, 0.18),
                local(0.25, 0.78),
              ])}
              fill="#ffffff"
              opacity={0.24}
            />
            <polygon
              points={pointsToSvg(rect(0.04, 0.9, 0.96, 0.97))}
              fill={colored ? object.color : '#eef0ec'}
              stroke={deep}
              strokeWidth={1.2}
            />
          </>
        );
      case 'door':
        return (
          <>
            <polygon
              points={pointsToSvg(corners)}
              fill={fill}
              stroke={deep}
              strokeWidth={3}
            />
            <polygon
              points={pointsToSvg(rect(0.13, 0.08, 0.87, 0.42))}
              fill={soft}
              stroke={accent}
              strokeWidth={1.4}
            />
            <polygon
              points={pointsToSvg(rect(0.13, 0.48, 0.87, 0.92))}
              fill={soft}
              stroke={accent}
              strokeWidth={1.4}
            />
            <line
              x1={local(0.5, 0.08).x}
              y1={local(0.5, 0.08).y}
              x2={local(0.5, 0.92).x}
              y2={local(0.5, 0.92).y}
              stroke={accent}
              strokeWidth={1}
              opacity={0.5}
            />
            <circle
              {...(() => {
                const center = local(0.78, 0.55);
                const edge = local(0.81, 0.55);
                return {
                  cx: center.x,
                  cy: center.y,
                  r: Math.hypot(edge.x - center.x, edge.y - center.y),
                };
              })()}
              fill={colored ? '#f2c96d' : '#f6f0e2'}
              stroke={deep}
              strokeWidth={1.2}
            />
          </>
        );
      case 'clock':
        return (
          <>
            <polygon
              points={pointsToSvg(circle(0.5, 0.5, 0.48, 48))}
              fill={fill}
              stroke={deep}
              strokeWidth={3}
            />
            <polygon
              points={pointsToSvg(circle(0.5, 0.5, 0.41, 48))}
              fill={colored ? shade(object.color, 0.42) : '#f7f5ec'}
              stroke={accent}
              strokeWidth={1.5}
            />
            {Array.from({ length: 12 }, (_, index) => {
              const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
              const inner = local(
                0.5 + Math.cos(angle) * 0.32,
                0.5 + Math.sin(angle) * 0.32,
              );
              const outer = local(
                0.5 + Math.cos(angle) * 0.38,
                0.5 + Math.sin(angle) * 0.38,
              );
              return (
                <line
                  key={index}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={deep}
                  strokeWidth={1.1}
                />
              );
            })}
            <line
              x1={local(0.5, 0.5).x}
              y1={local(0.5, 0.5).y}
              x2={local(0.5, 0.22).x}
              y2={local(0.5, 0.22).y}
              stroke={deep}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            <line
              x1={local(0.5, 0.5).x}
              y1={local(0.5, 0.5).y}
              x2={local(0.72, 0.58).x}
              y2={local(0.72, 0.58).y}
              stroke={deep}
              strokeWidth={1.7}
              strokeLinecap="round"
            />
            <circle
              cx={local(0.5, 0.5).x}
              cy={local(0.5, 0.5).y}
              r={2.2}
              fill={deep}
            />
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <g
      data-object-id={object.id}
      data-object-type={object.type}
      data-wall={object.wall}
      style={{ cursor: 'grab' }}
    >
      {object.type !== 'clock' && (
        <polygon
          points={pointsToSvg(corners)}
          fill={fill}
          stroke={deep}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
      )}
      {content}
      {selected && (
        <polygon
          points={pointsToSvg(corners)}
          fill="none"
          stroke="#e95f3c"
          strokeWidth={3}
          strokeDasharray="7 4"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}
    </g>
  );
}
