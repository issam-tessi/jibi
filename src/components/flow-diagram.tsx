import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

export type FlowNode = {
  key: string;
  label: string;
  color: string;
  /** Column index, left to right. */
  column: number;
};

export type FlowLink = { from: string; to: string; value: number };

type Props = {
  nodes: FlowNode[];
  links: FlowLink[];
  formatValue: (v: number) => string;
  height?: number;
};

const NODE_W = 10;
const NODE_GAP = 10;
const LABEL_W = 132; // room for the right-hand labels

/**
 * Flow (Sankey-style) diagram: nodes in columns, links drawn as bands whose thickness is the amount.
 * Bands take the color of their destination so you can follow where money ended up.
 */
export function FlowDiagram({ nodes, links, formatValue, height = 300 }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const live = links.filter((l) => l.value > 0);
  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  for (const l of live) {
    outflow.set(l.from, (outflow.get(l.from) ?? 0) + l.value);
    inflow.set(l.to, (inflow.get(l.to) ?? 0) + l.value);
  }
  const used = nodes.filter((n) => (inflow.get(n.key) ?? 0) + (outflow.get(n.key) ?? 0) > 0);
  const size = (key: string) => Math.max(inflow.get(key) ?? 0, outflow.get(key) ?? 0);

  const columns = Math.max(...used.map((n) => n.column), 0) + 1;
  const byColumn = Array.from({ length: columns }, (_, c) => used.filter((n) => n.column === c));
  const labelTop = 14; // space above nodes for their label (middle columns)
  const usable = height - labelTop;
  const scale = Math.min(
    ...byColumn
      .filter((col) => col.length)
      .map((col) => (usable - NODE_GAP * (col.length - 1) - labelTop * (col.length - 1)) / col.reduce((s, n) => s + size(n.key), 0))
  );

  const plotW = Math.max(width - LABEL_W, 0);
  const colX = (c: number) => (columns <= 1 ? 0 : (c / (columns - 1)) * (plotW - NODE_W));

  // Node rectangles, stacked per column and vertically centered.
  const rect = new Map<string, { x: number; y: number; h: number }>();
  byColumn.forEach((col, c) => {
    const total = col.reduce((s, n) => s + size(n.key) * scale, 0) + (col.length - 1) * (NODE_GAP + labelTop);
    let y = labelTop + (usable - total) / 2;
    for (const n of col) {
      const h = Math.max(size(n.key) * scale, 2);
      rect.set(n.key, { x: colX(c), y, h });
      y += h + NODE_GAP + labelTop;
    }
  });

  // Band offsets inside each node, ordered by the other end's position to minimise crossings.
  const outCursor = new Map<string, number>();
  const inCursor = new Map<string, number>();
  const ordered = [...live].sort((a, b) => (rect.get(a.to)?.y ?? 0) - (rect.get(b.to)?.y ?? 0));
  const bands = ordered
    .filter((l) => rect.has(l.from) && rect.has(l.to))
    .map((l) => {
      const a = rect.get(l.from)!;
      const b = rect.get(l.to)!;
      const t = l.value * scale;
      const y0 = a.y + (outCursor.get(l.from) ?? 0);
      const y1 = b.y + (inCursor.get(l.to) ?? 0);
      outCursor.set(l.from, (outCursor.get(l.from) ?? 0) + t);
      inCursor.set(l.to, (inCursor.get(l.to) ?? 0) + t);
      const x0 = a.x + NODE_W;
      const x1 = b.x;
      const mx = (x0 + x1) / 2;
      const d = `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1} L${x1},${y1 + t} C${mx},${y1 + t} ${mx},${y0 + t} ${x0},${y0 + t} Z`;
      const color = used.find((n) => n.key === l.to)?.color ?? theme.textMuted;
      return { key: `${l.from}>${l.to}`, d, color };
    });

  const lastColumn = columns - 1;

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={live
        .map((l) => `${nodes.find((n) => n.key === l.from)?.label} to ${nodes.find((n) => n.key === l.to)?.label}: ${formatValue(l.value)}`)
        .join('. ')}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {bands.map((b) => (
            <Path key={b.key} d={b.d} fill={b.color} fillOpacity={0.32} />
          ))}
          {used.map((n) => {
            const r = rect.get(n.key)!;
            return (
              <Rect key={n.key} x={r.x} y={r.y} width={NODE_W} height={r.h} rx={3} fill={n.color} />
            );
          })}
          {used.map((n) => {
            const r = rect.get(n.key)!;
            const right = n.column === lastColumn;
            const amount = formatValue(size(n.key));
            return right ? (
              <SvgText
                key={n.key}
                x={r.x + NODE_W + 6}
                y={r.y + r.h / 2 + 4}
                fontSize={11}
                fill={theme.text}>
                {`${n.label}  ${amount}`}
              </SvgText>
            ) : (
              <SvgText
                key={n.key}
                x={n.column === 0 ? r.x : r.x + NODE_W / 2}
                y={r.y - 4}
                fontSize={11}
                fontWeight="600"
                textAnchor={n.column === 0 ? 'start' : 'middle'}
                fill={theme.text}>
                {`${n.label} ${amount}`}
              </SvgText>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
