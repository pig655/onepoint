import type { RoomSurfaceId } from '../core/roomGeometry';

export type Selection =
  | { kind: 'vp' }
  | { kind: 'surface'; id: RoomSurfaceId }
  | { kind: 'object'; id: string }
  | null;

export function isObjectSelected(
  selection: Selection,
  id: string,
): boolean {
  return selection?.kind === 'object' && selection.id === id;
}

export function isSurfaceSelected(
  selection: Selection,
  id: RoomSurfaceId,
): boolean {
  return selection?.kind === 'surface' && selection.id === id;
}
