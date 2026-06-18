import React from 'react';
import type {SeriesPoint} from '../types';

interface TrendChartProps {
  series: SeriesPoint[];
  viewWidth?: number;
  viewHeight?: number;
  colorUp?: string;
  colorDown?: string;
  colorFlat?: string;
}

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
  viewWidth = 240,
  viewHeight = 200,
  colorUp = '#F87171',
  colorDown = '#4ADE80',
  colorFlat = '#64748B',
}) => {
  const M = {left: 44, right: 4, top: 8, bottom: 28};
  const chartW = viewWidth - M.left - M.right;
  const chartH = viewHeight - M.top - M.bottom;

  if (!series || series.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        style={{width: '100%', height: '100%', display: 'block'}}
        aria-label="暂无数据"
      />
    );
  }

  const values = series.map((p) => p.v);
  let dataMin = Math.min(...values);
  let dataMax = Math.max(...values);
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

  const xScale = (i: number) => {
    if (series.length === 1) return M.left + chartW / 2;
    return M.left + (i / (series.length - 1)) * chartW;
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

  const xTickCount = Math.min(6, series.length);
  const xTickIndices: number[] = [];
  for (let i = 0; i < xTickCount; i++) {
    const idx = Math.round((i / (xTickCount - 1)) * (series.length - 1));
    xTickIndices.push(idx);
  }

  const zeroY = yScale(0);
  const firstV = series[0].v;
  const lastV = series[series.length - 1].v;
  const delta = lastV - firstV;
  const trendColor = delta > 0 ? colorUp : delta < 0 ? colorDown : colorFlat;

  const pts = series.map((p, i) => `${xScale(i)},${yScale(p.v)}`);
  const linePath = `M${pts.join(' L')}`;
  const fillPath =
    series.length > 1
      ? `${linePath} L${xScale(series.length - 1)},${zeroY} L${xScale(0)},${zeroY} Z`
      : '';

  const axisColor = '#9CA3AF';
  const gridColor = 'rgba(156,163,175,0.15)';
  const labelStyle: React.CSSProperties = {fontSize: 9, fontFamily: 'ui-monospace,monospace'};

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      style={{width: '100%', height: '100%', display: 'block'}}
      aria-label={`趋势图，${series.length} 个采样点`}
    >
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

      {zeroY >= M.top && zeroY <= M.top + chartH && (
        <line
          x1={M.left} y1={zeroY}
          x2={M.left + chartW} y2={zeroY}
          stroke={trendColor}
          strokeOpacity={0.3}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      )}

      {fillPath && (
        <path d={fillPath} fill={trendColor} fillOpacity={0.12} />
      )}

      <path
        d={linePath}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {xTickIndices.map((idx) => {
        const x = xScale(idx);
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
              {fmtTime(series[idx].t)}
            </text>
          </g>
        );
      })}

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
