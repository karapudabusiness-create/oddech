import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import type { DayPoint } from '@/features/stats/progress';
import { fontFamilies, useTheme } from '@/theme';
import { ChartTooltip } from './ChartTooltip';
import { labelIndices, shortDate } from './scale';
import { useChartTouch } from './useChartTouch';

const HEIGHT = 200;
const AXIS_W = 26;
const TOP = 40;
const BOTTOM = 22;

/**
 * Wykres jednej miary: wartości dzienne (kropki, przygaszone) + średnia krocząca (linia 2 px).
 * Oba w tym samym odcieniu – to jedna miara, nie dwie kategorie.
 */
export function LineChart({
  raw,
  avg,
  color,
  yMin,
  yMax,
  ticks,
  rawLabel,
  avgLabel,
  accessibilityLabel,
}: {
  raw: DayPoint[];
  avg: DayPoint[];
  color: string;
  yMin: number;
  yMax: number;
  ticks: number[];
  rawLabel: string;
  avgLabel: string;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const plotW = Math.max(0, width - AXIS_W - 6);
  const plotH = HEIGHT - TOP - BOTTOM;
  const n = raw.length;
  const slot = n ? plotW / n : 0;
  const x = (i: number) => AXIS_W + i * slot + slot / 2;
  const y = (v: number) => TOP + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const touch = useChartTouch(n, AXIS_W, plotW);
  const dotR = n > 45 ? 2.5 : n > 14 ? 3 : 4;

  // Linia średniej, przerywana tam, gdzie brak danych.
  let d = '';
  let pen = false;
  avg.forEach((p, i) => {
    if (p.value == null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)} `;
    pen = true;
  });

  const i = touch.index;
  const selRaw = i != null ? raw[i] : undefined;
  const selAvg = i != null ? avg[i] : undefined;

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
          {i != null ? (
            <Line
              x1={x(i)}
              x2={x(i)}
              y1={TOP - 4}
              y2={TOP + plotH}
              stroke={colors.border}
              strokeWidth={1.5}
            />
          ) : null}
          {raw.map((p, k) =>
            p.value == null ? null : (
              <Circle key={p.date} cx={x(k)} cy={y(p.value)} r={dotR} fill={color} opacity={0.35} />
            ),
          )}
          <Path
            d={d}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {i != null && selAvg?.value != null ? (
            <Circle
              cx={x(i)}
              cy={y(selAvg.value)}
              r={5}
              fill={color}
              stroke={colors.surface}
              strokeWidth={2}
            />
          ) : null}
          {labelIndices(n).map((k) => (
            <SvgText
              key={`x${k}`}
              x={x(k)}
              y={HEIGHT - 6}
              fontSize={11}
              fontFamily={fontFamilies.regular}
              fill={colors.textMuted}
              textAnchor={n > 3 ? (k === 0 ? 'start' : k === n - 1 ? 'end' : 'middle') : 'middle'}
            >
              {raw[k] ? shortDate(raw[k].date) : ''}
            </SvgText>
          ))}
        </Svg>
      ) : null}
      {i != null && selRaw ? (
        <ChartTooltip
          x={x(i)}
          containerWidth={width}
          title={shortDate(selRaw.date)}
          rows={[
            { label: rawLabel, value: selRaw.value == null ? '–' : String(selRaw.value) },
            {
              label: avgLabel,
              value: selAvg?.value == null ? '–' : selAvg.value.toLocaleString('pl-PL'),
              swatch: color,
            },
          ]}
        />
      ) : null}
    </View>
  );
}
