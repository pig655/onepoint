function parseHex(color: string): [number, number, number] {
  const normalized =
    color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
}

function toHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0');
}

export function shade(color: string, amount: number): string {
  try {
    const [r, g, b] = parseHex(color);
    if (amount >= 0) {
      return `#${toHex(r + (255 - r) * amount)}${toHex(
        g + (255 - g) * amount,
      )}${toHex(b + (255 - b) * amount)}`;
    }
    const factor = 1 + amount;
    return `#${toHex(r * factor)}${toHex(g * factor)}${toHex(b * factor)}`;
  } catch {
    return color;
  }
}

export function isDark(color: string): boolean {
  try {
    const [r, g, b] = parseHex(color);
    return r * 0.299 + g * 0.587 + b * 0.114 < 140;
  } catch {
    return false;
  }
}
