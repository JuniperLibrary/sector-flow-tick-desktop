import React from 'react';
import type {SeriesPoint} from '../types';

export interface MultiSeries {
  name: string;
  data: SeriesPoint[];
  color: string;
}

interface TrendChartProps {
  series: MultiSeries[];
  viewWidth?: number;
  viewHeight?: number;
}

const CHART_COLORS = [
  '#F87171', '#4ADE80', '#60A5FA', '#FBBF24',
  '#A78BFA', '#FB923C', '#34D399', '#38BDF8',
];

function fmtNet(v: number): string {
  if (Math.abs(v) >= 100) return `${(v / 100).toFixed(1)}亿`;
  return v.toFixed(1);
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  series,
  viewWidth = 300,
  viewHeight = 160,
}) => {
  const M = {left: 44, right: 4, top: 8, bottom: 28};
  const chartW = viewWidth - M.left - M.right;
  const chartH = viewHeight - M.top - M.bottom;

  if (!series || series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        style={{width: '100%', height: '100%', display: 'block'}}
        aria-label="暂无数据"
      />
    );
  }

  // Compute common scale across all series
  let dataMin = Infinity;
  let dataMax = -Infinity;
  let maxLen = 0;
  let allPoints: SeriesPoint[] = [];
  for (const s of series) {
    if (s.data.length === 0) continue;
    maxLen = Math.max(maxLen, s.data.length);
    for (const p of s.data) {
      if (p.v < dataMin) dataMin = p.v;
      if (p.v > dataMax) dataMax = p.v;
    }
    if (s.data.length > allPoints.length) allPoints = s.data;
  }
  if (dataMin === Infinity) dataMin = 0;
  if (dataMax === -Infinity) dataMax = 0;
  if (dataMin > 0) dataMin = 0;
  if (dataMax < 0) dataMax = 0;
  const range = dataMax - dataMin;
  if (range < 0.01) {
    const mid = (dataMax + dataMin) / 2;
    dataMin = mid - 0.5;
    dataMax = mid + 0.5;
    if (dataMin > 0) dataMin = 0;
    if (dataMax < 0) dataMax = 0;
  }

  const pad = 0.08;
  const paddedRange = (dataMax - dataMin) / (1 - 2 * pad);
  const yMin = dataMin - paddedRange * pad;
  const yMax = dataMax + paddedRange * pad;

  const xScale = (i: number, len: number) => {
    if (len <= 1) return M.left + chartW / 2;
    return M.left + (i / (len - 1)) * chartW;
  };
  const yScale = (v: number) => M.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  function niceTicks(lo: number, hi: number, n: number): number[] {
    const rawStep = (hi - lo) / n;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const nice = [1, 2, 2.5, 4, 5, 10].find((x) => x * mag >= rawStep) ?? 1;
    const step = nice * mag;
    const start = Math.ceil(lo / step) * step;
    const ticks: number[] = [];
    for (let v = start; v <= hi + step * 0.001; v += step) {
      ticks.push(v);
    }
    return ticks;
  }

  const yTicks = niceTicks(yMin, yMax, 4);

  const xTickCount = Math.min(6, allPoints.length);
  const xTickIndices: number[] = [];
  for (let i = 0; i < xTickCount; i++) {
    const idx = allPoints.length > 1 ? Math.round((i / (xTickCount - 1)) * (allPoints.length - 1)) : 0;
    xTickIndices.push(idx);
  }

  const zeroY = yScale(0);
  const axisColor = '#9CA3AF';
  const gridColor = 'rgba(156,163,175,0.15)';
  const labelStyle: React.CSSProperties = {fontSize: 9, fontFamily: 'ui-monospace,monospace'};

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      style={{width: '100%', height: '100%', display: 'block'}}
      aria-label={`趋势图，${series.length} 个板块`}
    >
      {/* Grid lines */}
      {yTicks.map((v) => {
        const y = yScale(v);
        return (
          <g key={`yt-${v}`}>
            <line
              x1={M.left} y1={y}
              x2={M.left + chartW} y2={y}
              stroke={gridColor}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={M.left - 4} y={y + 3}
              textAnchor="end"
              fill={axisColor}
              style={labelStyle}
            >
              {fmtNet(v)}
            </text>
          </g>
        );
      })}

      {/* Zero line */}
      {zeroY >= M.top && zeroY <= M.top + chartH && (
        <line
          x1={M.left} y1={zeroY}
          x2={M.left + chartW} y2={zeroY}
          stroke={axisColor}
          strokeOpacity={0.4}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      )}

      {/* Series lines */}
      {series.map((s, si) => {
        if (s.data.length < 2) return null;
        const pts = s.data.map((p, i) => `${xScale(i, s.data.length)},${yScale(p.v)}`);
        const pathD = `M${pts.join(' L')}`;
        return (
          <g key={s.name}>
            <path
              d={pathD}
              fill="none"
              stroke={s.color || CHART_COLORS[si % CHART_COLORS.length]}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          </g>
        );
      })}

      {/* X-axis ticks */}
      {xTickIndices.map((idx) => {
        const x = xScale(idx, allPoints.length);
        const p = allPoints[idx];
        if (!p) return null;
        return (
          <g key={`xt-${idx}`}>
            <line
              x1={x} y1={M.top + chartH}
              x2={x} y2={M.top + chartH + 4}
              stroke={axisColor}
              strokeWidth={1}
            />
            <text
              x={x} y={M.top + chartH + 16}
              textAnchor="middle"
              fill={axisColor}
              style={labelStyle}
            >
              {fmtTime(p.t)}
            </text>
          </g>
        );
      })}

      {/* Bottom axis line */}
      <line
        x1={M.left} y1={M.top + chartH}
        x2={M.left + chartW} y2={M.top + chartH}
        stroke={axisColor}
        strokeOpacity={0.3}
        strokeWidth={1}
      />
    </svg>
  );
};
