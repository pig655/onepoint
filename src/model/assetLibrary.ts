import type { RoomWallId } from '../core/roomGeometry';

export type WallAssetType =
  | 'paintingLandscape'
  | 'paintingPortrait'
  | 'window'
  | 'door'
  | 'clock'
  | 'decorativePainting';

export type FloorAssetType =
  | 'table'
  | 'chair'
  | 'cabinet'
  | 'bookshelf'
  | 'bed'
  | 'sofa'
  | 'person'
  | 'tree'
  | 'plant'
  | 'flower'
  | 'lamp'
  | 'cube'
  | 'cuboid'
  | 'cylinder';

export type AssetType = WallAssetType | FloorAssetType;

export type AssetCategory =
  | 'wall'
  | 'furniture'
  | 'nature'
  | 'geometry';

export interface AssetDefinition {
  type: AssetType;
  label: string;
  category: AssetCategory;
  placement: 'wall' | 'floor';
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth: number;
  defaultColor: string;
  defaultAccent: string;
  preferredWall?: RoomWallId;
  glyph: 'painting' | 'portrait' | 'window' | 'door' | 'clock' | 'furniture' | 'person' | 'plant' | 'box' | 'cylinder';
}

export const ASSET_LIBRARY: AssetDefinition[] = [
  {
    type: 'paintingLandscape',
    label: '橫向掛畫',
    category: 'wall',
    placement: 'wall',
    description: '適合掛在後牆或側牆的橫幅作品。',
    defaultWidth: 1.3,
    defaultHeight: 0.8,
    defaultDepth: 0.03,
    defaultColor: '#d9a441',
    defaultAccent: '#3e6b7a',
    preferredWall: 'back',
    glyph: 'painting',
  },
  {
    type: 'paintingPortrait',
    label: '直向掛畫',
    category: 'wall',
    placement: 'wall',
    description: '高挑的直幅掛畫，適合側牆。',
    defaultWidth: 0.7,
    defaultHeight: 1.15,
    defaultDepth: 0.03,
    defaultColor: '#c25b4a',
    defaultAccent: '#f3d9a4',
    preferredWall: 'right',
    glyph: 'portrait',
  },
  {
    type: 'window',
    label: '窗戶',
    category: 'wall',
    placement: 'wall',
    description: '有窗框與十字窗櫺的窗戶。',
    defaultWidth: 1.5,
    defaultHeight: 1.15,
    defaultDepth: 0.05,
    defaultColor: '#9cc8d8',
    defaultAccent: '#4f7280',
    preferredWall: 'right',
    glyph: 'window',
  },
  {
    type: 'door',
    label: '門',
    category: 'wall',
    placement: 'wall',
    description: '從地面長高的門，會貼齊牆面。',
    defaultWidth: 1,
    defaultHeight: 2.05,
    defaultDepth: 0.06,
    defaultColor: '#b8794f',
    defaultAccent: '#6f4228',
    preferredWall: 'left',
    glyph: 'door',
  },
  {
    type: 'clock',
    label: '時鐘',
    category: 'wall',
    placement: 'wall',
    description: '圓形時鐘，圓形在透視中會正確變形。',
    defaultWidth: 0.55,
    defaultHeight: 0.55,
    defaultDepth: 0.04,
    defaultColor: '#f7f2df',
    defaultAccent: '#2e4a55',
    preferredWall: 'back',
    glyph: 'clock',
  },
  {
    type: 'decorativePainting',
    label: '裝飾畫',
    category: 'wall',
    placement: 'wall',
    description: '用簡單幾何圖案練習牆面透視。',
    defaultWidth: 1,
    defaultHeight: 0.7,
    defaultDepth: 0.03,
    defaultColor: '#7ea6a0',
    defaultAccent: '#f2c16d',
    preferredWall: 'back',
    glyph: 'painting',
  },
  {
    type: 'table',
    label: '桌子',
    category: 'furniture',
    placement: 'floor',
    description: '桌面與四支桌腳都是立體物件。',
    defaultWidth: 1.4,
    defaultHeight: 0.76,
    defaultDepth: 0.8,
    defaultColor: '#c08a5b',
    defaultAccent: '#8f5c35',
    glyph: 'furniture',
  },
  {
    type: 'chair',
    label: '椅子',
    category: 'furniture',
    placement: 'floor',
    description: '有椅面、椅背與椅腳。',
    defaultWidth: 0.52,
    defaultHeight: 0.92,
    defaultDepth: 0.55,
    defaultColor: '#d29b63',
    defaultAccent: '#855a34',
    glyph: 'furniture',
  },
  {
    type: 'cabinet',
    label: '櫃子',
    category: 'furniture',
    placement: 'floor',
    description: '有兩扇櫃門的收納櫃。',
    defaultWidth: 1.05,
    defaultHeight: 1.45,
    defaultDepth: 0.48,
    defaultColor: '#a8744a',
    defaultAccent: '#69492f',
    glyph: 'furniture',
  },
  {
    type: 'bookshelf',
    label: '書架',
    category: 'furniture',
    placement: 'floor',
    description: '分層書架，能練習多個深度面。',
    defaultWidth: 1.1,
    defaultHeight: 1.8,
    defaultDepth: 0.36,
    defaultColor: '#92633f',
    defaultAccent: '#f0d7ae',
    glyph: 'furniture',
  },
  {
    type: 'bed',
    label: '床',
    category: 'furniture',
    placement: 'floor',
    description: '床架、床墊與枕頭組合。',
    defaultWidth: 1.25,
    defaultHeight: 0.6,
    defaultDepth: 2,
    defaultColor: '#6d93a8',
    defaultAccent: '#f4ead8',
    glyph: 'furniture',
  },
  {
    type: 'sofa',
    label: '沙發',
    category: 'furniture',
    placement: 'floor',
    description: '座墊、扶手與靠背組成的沙發。',
    defaultWidth: 1.85,
    defaultHeight: 0.86,
    defaultDepth: 0.78,
    defaultColor: '#8c9b71',
    defaultAccent: '#5e6d48',
    glyph: 'furniture',
  },
  {
    type: 'person',
    label: '簡化人物',
    category: 'nature',
    placement: 'floor',
    description: '以比例清楚的簡化人物練習大小變化。',
    defaultWidth: 0.52,
    defaultHeight: 1.65,
    defaultDepth: 0.34,
    defaultColor: '#e9b074',
    defaultAccent: '#3d6473',
    glyph: 'person',
  },
  {
    type: 'tree',
    label: '樹木',
    category: 'nature',
    placement: 'floor',
    description: '樹幹與樹冠，適合觀察高物件。',
    defaultWidth: 1.1,
    defaultHeight: 1.9,
    defaultDepth: 0.9,
    defaultColor: '#8f6a45',
    defaultAccent: '#6e9b66',
    glyph: 'plant',
  },
  {
    type: 'plant',
    label: '花盆',
    category: 'nature',
    placement: 'floor',
    description: '會固定站在地板上的盆栽。',
    defaultWidth: 0.62,
    defaultHeight: 1.05,
    defaultDepth: 0.62,
    defaultColor: '#b96b4f',
    defaultAccent: '#5c8c59',
    glyph: 'plant',
  },
  {
    type: 'flower',
    label: '花草',
    category: 'nature',
    placement: 'floor',
    description: '低矮的花草，適合放在房間角落。',
    defaultWidth: 0.55,
    defaultHeight: 0.7,
    defaultDepth: 0.55,
    defaultColor: '#d47b67',
    defaultAccent: '#6b9b5d',
    glyph: 'plant',
  },
  {
    type: 'lamp',
    label: '路燈裝飾',
    category: 'nature',
    placement: 'floor',
    description: '細長燈桿，容易看見深度縮小。',
    defaultWidth: 0.42,
    defaultHeight: 1.75,
    defaultDepth: 0.42,
    defaultColor: '#455a64',
    defaultAccent: '#f4d27a',
    glyph: 'plant',
  },
  {
    type: 'cube',
    label: '正方體',
    category: 'geometry',
    placement: 'floor',
    description: '邊長相同的立體方塊。',
    defaultWidth: 0.8,
    defaultHeight: 0.8,
    defaultDepth: 0.8,
    defaultColor: '#e0a75e',
    defaultAccent: '#9e6d34',
    glyph: 'box',
  },
  {
    type: 'cuboid',
    label: '長方體',
    category: 'geometry',
    placement: 'floor',
    description: '可以分別調整寬、高、深。',
    defaultWidth: 1.2,
    defaultHeight: 0.7,
    defaultDepth: 0.9,
    defaultColor: '#7ea8c7',
    defaultAccent: '#4c7694',
    glyph: 'box',
  },
  {
    type: 'cylinder',
    label: '柱體',
    category: 'geometry',
    placement: 'floor',
    description: '圓柱體，投影後上下圓會變成橢圓。',
    defaultWidth: 0.8,
    defaultHeight: 1,
    defaultDepth: 0.8,
    defaultColor: '#b7a4cf',
    defaultAccent: '#786491',
    glyph: 'cylinder',
  },
];

export const ASSET_BY_TYPE = new Map(
  ASSET_LIBRARY.map((asset) => [asset.type, asset]),
);

export const ASSET_CATEGORIES: Array<{
  id: AssetCategory;
  label: string;
  hint: string;
}> = [
  { id: 'wall', label: '牆面物件', hint: '掛畫、門窗、時鐘' },
  { id: 'furniture', label: '室內家具', hint: '桌、椅、櫃、床、沙發' },
  { id: 'nature', label: '人物與自然', hint: '人物、植物、燈飾' },
  { id: 'geometry', label: '幾何物件', hint: '方塊、長方體、柱體' },
];

export function isWallAssetType(type: AssetType): type is WallAssetType {
  const asset = ASSET_BY_TYPE.get(type);
  return asset?.placement === 'wall';
}

export function isFloorAssetType(type: AssetType): type is FloorAssetType {
  const asset = ASSET_BY_TYPE.get(type);
  return asset?.placement === 'floor';
}
