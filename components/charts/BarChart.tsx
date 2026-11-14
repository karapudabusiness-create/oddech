import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { fontFamilies, useTheme } from '@/theme';
import { ChartTooltip } from './ChartTooltip';
import { labelIndices, niceScale } from './scale';
import { useChartTouch } from './useChartTouch';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Np. niepełny tydzień – słupek jaśniejszy. */
  muted?: boolean;
}

const HEIGHT = 180;
const AXIS_W = 30;
const TOP = 34; // miejsce na dymek / etykietę celu
const BOTTOM = 22;

/** Słupek z zaokrąglonym (4 px) końcem danych, płaską podstawą przy osi. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export function BarChart({
  data,
  color,
  formatValue,
  tooltipLabel,
  goal,
  goalLabel,
  accessibilityLabel,
}: {
  data: BarDatum[];
  color: string;
  formatValue: (v: number) => string;
  tooltipLabel: string;
  goal?: number;
  goalLabel?: string;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const plotW = Math.max(0, width - AXIS_W);
  const plotH = HEIGHT - TOP - BOTTOM;
  const maxVal = Math.max(...data.map((d) => d.value), goal ?? 0, 1);
  const { max, step } = niceScale(maxVal);
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const slot = data.length ? plotW / data.length : 0;
  const gap = Math.max(2, slot * 0.28);
  const barW = Math.max(1, Math.min(28, slot - gap));
  const touch = useChartTouch(data.length, AXIS_W, plotW);
  const sel = touch.index != null ? data[touch.index] : undefined;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: HEIGHT }}
      accessible
      accessibilityLabel={accessibilityLabel}
      {...touch.responder}
    >
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {ticks.map((t) => (
            <Line
              key={t}
              x1={AXIS_W}
              x2={width}
              y1={y(t)}
              y2={y(t)}
              stroke={colors.chart.grid}
              strokeWidth={1}
            />
          ))}
          {ticks.map((t) => (
            <SvgText
              key={`l${t}`}
              x={AXIS_W - 6}
              y={y(t) + 4}
              fontSize={11}
              fontFamily={fontFamilies.regular}
              fill={colors.textMuted}
              textAnchor="end"
            >
              {t}
            </SvgText>
          ))}
          {data.map((d, i) => {
            if (d.value <= 0) return null;
            const x = AXIS_W + i * slot + (slot - barW) / 2;
            const top = y(d.value);
            const selected = touch.index === i;
            return (
              <Path
                key={d.key}
                d={barPath(x, top, barW, TOP + plotH - top)}
                fill={color}
                opacity={touch.index != null && !selected ? 0.45 : d.muted ? 0.6 : 1}
              />
            );
          })}
          {goal ? (
            <>
              <Line
                x1={AXIS_W}
                x2={width}
                y1={y(goal)}
                y2={y(goal)}
                stroke={colors.textMuted}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              {goalLabel ? (
                <SvgText
                  x={width - 2}
                  y={y(goal) - 5}
                  fontSize={11}
                  fontFamily={fontFamilies.semibold}
                  fill={colors.textMuted}
                  textAnchor="end"
                >
                  {goalLabel}
                </SvgText>
              ) : null}
            </>
          ) : null}
          {labelIndices(data.length).map((i) => (
            <SvgText
              key={`x${i}`}
              x={AXIS_W + i * slot + slot / 2}
              y={HEIGHT - 6}
              fontSize={11}
              fontFamily={fontFamilies.regular}
              fill={colors.textMuted}
              textAnchor={
                data.length > 3
                  ? i === 0
                    ? 'start'
                    : i === data.length - 1
                      ? 'end'
                      : 'middle'
                  : 'middle'
              }
            >
              {data[i]?.label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
      {sel && touch.index != null ? (
        <ChartTooltip
          x={AXIS_W + touch.index * slot + slot / 2}
          containerWidth={width}
          title={sel.label}
          rows={[{ label: tooltipLabel, value: formatValue(sel.value), swatch: color }]}
        />
      ) : null}
    </View>
  );
}
