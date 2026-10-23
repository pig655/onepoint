import type { Vec2 } from '../core/perspectiveCore';

export function svgPointerPoint(
  svg: SVGSVGElement,
  event: { clientX: number; clientY: number },
): Vec2 {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) {
    return { x: event.clientX, y: event.clientY };
  }
  const local = point.matrixTransform(matrix.inverse());
  return { x: local.x, y: local.y };
}
