import React from 'react';
import type {SectorType, SeriesPoint, TickConfig} from '../types';
import type {EastmoneySector, TickSnapshot, CollectorStatus} from '../types';
import * as api from '../api';
import {TrendChart} from './TrendChart';

// ─── Theme System ───────────────────────────────────────────────
type ThemeVars = {
  cyan: string; cyanGlow: string;
  red: string; green: string; teal: string; purple: string; yellow: string;
  text: string; textSec: string; textMuted: string;
  surface: string; surfaceHover: string;
  border: string; borderHover: string;
  radius: number; radiusSm: number; radiusXs: number;
  fontMono: string; fontSans: string; transition: string;
  /** Background CSS for root wrapper */
  bgRoot: string;
  /** Input background */
  bgInput: string;
  /** Table header background */
  bgTableHead: string; borderTableHead: string;
  /** Row border color */
  rowBorder: string;
  /** Scrollbar thumb colors */
  scrollbarThumb: string; scrollbarThumbHover: string;
  /** Bar chart track background */
  barTrack: string;
  /** Cyan accent in rgba() form for semi-transparent use */
  cyanRgb: string;
};

const darkTheme: ThemeVars = {
  cyan: '#00d4ff', cyanGlow: '0 0 24px rgba(0,212,255,0.35)',
  red: '#F87171', green: '#4ADE80', teal: '#2DD4BF', purple: '#A78BFA', yellow: '#FBBF24',
  text: '#E2E8F0', textSec: '#94A3B8', textMuted: '#64748B',
  surface: 'rgba(15,23,42,0.78)', surfaceHover: 'rgba(30,41,59,0.70)',
  border: '1px solid rgba(255,255,255,0.06)', borderHover: '1px solid rgba(255,255,255,0.12)',
  radius: 16, radiusSm: 12, radiusXs: 8,
  fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSans: '"PingFang SC","Helvetica Neue",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif',
  transition: 'all 0.2s ease',
  bgRoot: 'radial-gradient(circle at 35% 25%, rgba(0,212,255,0.07) 0%, transparent 55%), radial-gradient(circle at 75% 65%, rgba(99,102,241,0.05) 0%, transparent 45%), radial-gradient(circle at 15% 80%, rgba(168,85,247,0.04) 0%, transparent 35%), linear-gradient(160deg, #05080F 0%, #0A1020 35%, #0C1525 65%, #080C18 100%)',
  bgInput: 'rgba(0,0,0,0.25)',
  bgTableHead: 'rgba(8,12,24,0.97)', borderTableHead: '1px solid rgba(255,255,255,0.04)',
  rowBorder: '1px solid rgba(255,255,255,0.03)',
  scrollbarThumb: 'rgba(255,255,255,0.08)', scrollbarThumbHover: 'rgba(0,212,255,0.25)',
  barTrack: 'rgba(255,255,255,0.04)',
  cyanRgb: '0,212,255',
};

const lightTheme: ThemeVars = {
  cyan: '#0891B2', cyanGlow: '0 0 20px rgba(8,145,178,0.20)',
  red: '#DC2626', green: '#16A34A', teal: '#0D9488', purple: '#7C3AED', yellow: '#D97706',
  text: '#1E293B', textSec: '#64748B', textMuted: '#94A3B8',
  surface: 'rgba(255,255,255,0.95)', surfaceHover: 'rgba(248,250,252,0.98)',
  border: '1px solid rgba(0,0,0,0.07)', borderHover: '1px solid rgba(0,0,0,0.14)',
  radius: 16, radiusSm: 12, radiusXs: 8,
  fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSans: '"PingFang SC","Helvetica Neue",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif',
  transition: 'all 0.2s ease',
  bgRoot: 'radial-gradient(circle at 40% 30%, rgba(8,145,178,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 60%, rgba(99,102,241,0.03) 0%, transparent 40%), linear-gradient(160deg, #F8FAFC 0%, #F1F5F9 50%, #EFF6FF 100%)',
  bgInput: 'rgba(255,255,255,0.85)',
  bgTableHead: 'rgba(248,250,252,0.97)', borderTableHead: '1px solid rgba(0,0,0,0.05)',
  rowBorder: '1px solid rgba(0,0,0,0.03)',
  scrollbarThumb: 'rgba(0,0,0,0.12)', scrollbarThumbHover: 'rgba(8,145,178,0.30)',
  barTrack: 'rgba(0,0,0,0.04)',
  cyanRgb: '8,145,178',
};

// ────────────────────────────────────────────────────────────────

const intervalOptions = [
  {value: 60, label: '1 分钟'},
  {value: 180, label: '3 分钟'},
  {value: 300, label: '5 分钟'},
] as const;

/** 市场最热门的 21 个板块 — 优先从后端获取，无桥接时使用此兜底 */
const FALLBACK_HOT_SECTORS: readonly string[] = [
  "半导体", "AI应用", "CPO概念", "有色金属", "锂矿概念",
  "商业航天", "电池", "机器人", "创新药", "白酒",
  "消费电子", "银行", "人工智能", "云计算", "低空经济",
  "电网设备", "通信设备", "传媒", "国产芯片", "元件", "通信服务",
];

type ViewState = {
  allSectors: string[];
  loaded: boolean;
  sectorTypeMap: Record<string, SectorType>;
  config: TickConfig | null;
  status: CollectorStatus | null;
  snapshot: TickSnapshot | null;
  seriesBySector: Record<string, SeriesPoint[]>;
};

type SortField = 'ChangePct' | 'Net' | 'MainRate' | 'SuperNet' | 'BigNet' | 'MidNet' | 'SmallNet' | 'Turnover' | 'TurnoverRate' | 'VolumeRatio' | 'Speed' | 'Change60d' | 'ChangeYtd' | 'Net5d' | 'Net10d' | 'UpCount' | 'DownCount' | 'UpDownDiff' | 'LeaderChangePct';
type SortState = {field: SortField; direction: 'asc' | 'desc'};

type SectorRow = {
  name: string;
  latest: EastmoneySector;
  series: SeriesPoint[];
};



function formatTime(ms?: number): string {
  if (!ms) return '—';
  const d = new Date(ms);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatVal(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
}

function formatNet(v: number): string {
  return `${formatVal(v)}亿`;
}

function formatRate(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function formatCount(v: number): string {
  return v.toFixed(0);
}

function formatDiff(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(0)}`;
}

function formatRatio(v: number): string {
  return v.toFixed(2);
}

function normalizeIntervalSec(v: number): number {
  return intervalOptions.some((item) => item.value === v) ? v : 60;
}

function sectorTypeLabel(t: SectorType): string {
  if (t === 'concept') return '概念';
  if (t === 'region') return '地域';
  return '行业';
}



function mergeSnapshotSeries(prev: Record<string, SeriesPoint[]>, snapshot: TickSnapshot): Record<string, SeriesPoint[]> {
  const next = {...prev};
  for (const sector of snapshot.sectors) {
    const current = next[sector.name] ? [...next[sector.name]!] : [];
    const last = current[current.length - 1];
    if (!last || last.t !== snapshot.at) {
      current.push({t: snapshot.at, v: sector.net});
    }
    if (current.length > 240) {
      current.splice(0, current.length - 240);
    }
    next[sector.name] = current;
  }
  return next;
}

function buildRows(snapshot: TickSnapshot | null, seriesBySector: Record<string, SeriesPoint[]>): SectorRow[] {
  if (!snapshot) return [];
  return snapshot.sectors.map((sector) => {
    const series = seriesBySector[sector.name] ?? [{t: snapshot.at, v: sector.net}];
    return {
      name: sector.name,
      latest: sector,
      series,
    };
  });
}

function sortRows(rows: SectorRow[], sortState: SortState): SectorRow[] {
  const getValue = (row: SectorRow): number => {
    switch (sortState.field) {
      case 'ChangePct':
        return row.latest.changePct;
      case 'Net':
        return row.latest.net;
      case 'MainRate':
        return row.latest.rate;
      case 'SuperNet':
        return row.latest.superNet;
      case 'BigNet':
        return row.latest.bigNet;
      case 'MidNet':
        return row.latest.midNet;
      case 'SmallNet':
        return row.latest.smallNet;
      case 'Turnover':
        return row.latest.turnover;
      case 'TurnoverRate':
        return row.latest.turnoverRate;
      case 'VolumeRatio':
        return row.latest.volumeRatio;
      case 'Speed':
        return row.latest.speed;
      case 'Change60d':
        return row.latest.change60d;
      case 'ChangeYtd':
        return row.latest.changeYtd;
      case 'Net5d':
        return row.latest.net5d;
      case 'Net10d':
        return row.latest.net10d;
      case 'UpCount':
        return row.latest.upCount;
      case 'DownCount':
        return row.latest.downCount;
      case 'UpDownDiff':
        return row.latest.upCount - row.latest.downCount;
      case 'LeaderChangePct':
        return row.latest.leaderChangePct;
      default:
        return row.latest.net;
    }
  };

  return [...rows].sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    return sortState.direction === 'asc' ? av - bv : bv - av;
  });
}

export const App: React.FC = () => {
  const [theme, setTheme] = React.useState<'dark' | 'light'>('light');
  const C = theme === 'dark' ? darkTheme : lightTheme;

  const cardStyle: React.CSSProperties = {
    border: C.border,
    background: C.surface,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: C.radius,
    boxShadow: theme === 'dark' ? '0 8px 32px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.04)' : '0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: C.radiusSm,
    border: C.border,
    background: C.bgInput,
    color: C.text,
    outline: 'none',
    fontSize: 13,
    transition: C.transition,
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: C.textSec,
    marginBottom: 6,
    letterSpacing: '0.04em',
  };
  const netTextColor = (v: number): string => {
    if (v > 0) return C.red;
    if (v < 0) return C.green;
    return C.textSec;
  };

  const [state, setState] = React.useState<ViewState>({
    loaded: false,
    allSectors: [],
    sectorTypeMap: {},
    config: null,
    status: null,
    snapshot: null,
    seriesBySector: {},
  });
  const [pickerSearch, setPickerSearch] = React.useState('');
  const [tableFilter, setTableFilter] = React.useState('');
  const [sortState, setSortState] = React.useState<SortState>({field: 'Net', direction: 'desc'});
  const [colWidths, setColWidths] = React.useState<Record<string, number>>({});
  const [chartSector, setChartSector] = React.useState<string | null>(null);

  const frozenBg = React.useMemo(() => theme === 'dark' ? '#0F172A' : '#FFFFFF', [theme]);

  React.useEffect(() => {
    let unsubSnap: (() => void) | null = null;
    let unsubStatus: (() => void) | null = null;
    let unsubConfig: (() => void) | null = null;

    const init = async () => {
      const [cfg, status, snap, sectorsWithType, hotSectors] = await Promise.all([
        api.getConfig(),
        api.getCollectorStatus(),
        api.getLatestSnapshot(),
        api.listAllSectorsWithType(),
        api.getHotSectors(),
      ]);
      const allSectors = await api.listSectors(cfg?.sectorType ?? 'industry');
      const sectorTypeMap: Record<string, SectorType> = {};
      for (const {name, sectorType} of sectorsWithType) {
        sectorTypeMap[name] = sectorType;
      }

      let initialSeries: Record<string, SeriesPoint[]> = {};
      if (snap) {
        initialSeries = mergeSnapshotSeries(initialSeries, snap);
      }

      let resolvedCfg = cfg;
      if (cfg && allSectors.length > 0) {
        const allow = new Set(allSectors);
        const validSelected = cfg.selectedSectors.filter((n) => allow.has(n));
        if (validSelected.length !== cfg.selectedSectors.length) {
          resolvedCfg = {...cfg, selectedSectors: validSelected};
          await api.setConfig(resolvedCfg);
        } else if (cfg.selectedSectors.length === 0) {
          const hotInAll = hotSectors.filter((h) => allSectors.includes(h));
          if (hotInAll.length > 0) {
            resolvedCfg = {...cfg, selectedSectors: hotInAll};
            await api.setConfig(resolvedCfg);
          }
        }
      }

      setState((s) => ({
        ...s,
        loaded: true,
        allSectors,
        sectorTypeMap,
        config: resolvedCfg,
        status,
        snapshot: snap,
        seriesBySector: initialSeries,
      }));

      unsubSnap = await api.onSnapshot((next) => {
        setState((s) => {
          const nextSeries = mergeSnapshotSeries(s.seriesBySector, next);
          return {
            ...s,
            snapshot: next,
            seriesBySector: nextSeries,
          };
        });
      });
      unsubStatus = await api.onStatus((next) => setState((s) => ({...s, status: next})));
      unsubConfig = await api.onConfig((next) => setState((s) => ({...s, config: next})));
    };

    init().catch((err) => {
      console.error(err);
      setState((s) => ({...s, loaded: true}));
    });
    return () => {
      unsubSnap?.();
      unsubStatus?.();
      unsubConfig?.();
    };
  }, []);

  const cfg = state.config;
  const status = state.status;
  const snapshot = state.snapshot;
  const sectorTypeMap = state.sectorTypeMap;
  const selectedSet = React.useMemo(() => new Set(cfg?.selectedSectors ?? []), [cfg?.selectedSectors]);

  const sectorGroups = React.useMemo(() => {
    if (!cfg) return [];
    const map: Record<string, string[]> = {};
    for (const name of cfg.selectedSectors) {
      const t = sectorTypeMap[name] || 'industry';
      (map[t] ??= []).push(name);
    }
    return (['industry', 'concept', 'region'] as SectorType[]).flatMap((t) =>
      map[t]?.length ? [{type: t, names: map[t]}] : []
    );
  }, [cfg?.selectedSectors, sectorTypeMap]);

  const pickerOptions = React.useMemo(() => {
    const q = pickerSearch.trim();
    if (!q) return [];
    return state.allSectors.filter((n) => n.includes(q)).slice(0, 5);
  }, [pickerSearch, state.allSectors]);

  const allRows = React.useMemo(() => buildRows(snapshot, state.seriesBySector), [snapshot, state.seriesBySector]);
  const filteredRows = React.useMemo(() => {
    const q = tableFilter.trim();
    if (!q) return allRows;
    return allRows.filter((row) => row.name.includes(q));
  }, [allRows, tableFilter]);
  const sortedRows = React.useMemo(() => sortRows(filteredRows, sortState), [filteredRows, sortState]);

  const counts = React.useMemo(() => {
    const up = filteredRows.filter((r) => r.latest.net > 0).length;
    const down = filteredRows.filter((r) => r.latest.net < 0).length;
    const flat = filteredRows.length - up - down;
    return {up, down, flat};
  }, [filteredRows]);

  const topSector = React.useMemo(() => {
    return [...filteredRows].sort((a, b) => b.latest.net - a.latest.net)[0] ?? null;
  }, [filteredRows]);

  const worstSector = React.useMemo(() => {
    return [...filteredRows].sort((a, b) => a.latest.net - b.latest.net)[0] ?? null;
  }, [filteredRows]);

  const canStart = Boolean(cfg && cfg.selectedSectors.length > 0);

  const handleSort = (field: SortField) => {
    setSortState((s) => (s.field === field ? {field, direction: s.direction === 'asc' ? 'desc' : 'asc'} : {field, direction: 'desc'}));
  };

  const onToggleSector = async (name: string) => {
    if (!cfg) return;
    const nextSet = new Set(cfg.selectedSectors);
    if (nextSet.has(name)) nextSet.delete(name);
    else nextSet.add(name);
    const nextCfg: TickConfig = {...cfg, selectedSectors: Array.from(nextSet)};
    await api.setConfig(nextCfg);
    setState((s) => ({...s, config: nextCfg}));
  };

  const onIntervalChange = async (v: number) => {
    if (!cfg) return;
    const nextCfg: TickConfig = {...cfg, intervalSec: normalizeIntervalSec(v)};
    await api.setConfig(nextCfg);
    setState((s) => ({...s, config: nextCfg}));
  };

  const onSectorTypeChange = async (t: SectorType) => {
    if (!cfg) return;
    const nextCfg: TickConfig = {...cfg, sectorType: t};
    await api.setConfig(nextCfg);
    const [allSectors, sectorsWithType] = await Promise.all([
      api.listSectors(t),
      api.listAllSectorsWithType(),
    ]);
    const sectorTypeMap: Record<string, SectorType> = {};
    for (const {name, sectorType} of sectorsWithType) {
      sectorTypeMap[name] = sectorType;
    }
    setState((s) => ({
      ...s,
      config: nextCfg,
      allSectors,
      sectorTypeMap,
    }));
  };

  const onStart = async () => {
    if (!canStart) return;
    await api.startCollection();
    const next = await api.getCollectorStatus();
    setState((s) => ({...s, status: next}));
  };

  const onStop = async () => {
    await api.stopCollection();
    const next = await api.getCollectorStatus();
    setState((s) => ({...s, status: next}));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: C.bgRoot,
        color: C.text,
        fontFamily: C.fontSans,
      }}
    >
      <style>{`
        body { margin: 0; padding: 0; }
        /* Scrollbar */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.scrollbarThumb}; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.scrollbarThumbHover}; }
        /* Table row hover glow */
        .tbl-row:hover { background: rgba(${C.cyanRgb},0.04) !important; }
        .tbl-row:active { background: rgba(${C.cyanRgb},0.07) !important; }
        /* Live dot pulse */
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.85); }
        }
        .live-dot { animation: pulse-dot 1.6s ease-in-out infinite; }
        /* Input focus */
        input:focus, select:focus { border-color: ${C.cyan} !important; box-shadow: 0 0 12px ${C.cyan}22 !important; }
        /* Button press */
        button:active:not(:disabled) { transform: scale(0.975); }
        /* Selection */
        ::selection { background: ${C.cyan}33; }
      `}</style>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px minmax(0, 1fr)',
          gap: 16,
          padding: 16,
          height: '100vh',
          boxSizing: 'border-box',
        }}
      >
        <div style={{display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0}}>
          <div style={{...cardStyle, padding: 18, position: 'relative', overflow: 'hidden'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10}}>
              <div style={{fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.textMuted}}>
                资金流向实时监控
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.textSec}}>
                  <span className="live-dot" style={{display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: status?.state === 'running' ? C.cyan : C.textMuted, boxShadow: status?.state === 'running' ? `0 0 8px ${C.cyan}` : 'none'}} />
                  {status?.state === 'running' ? 'LIVE' : 'STANDBY'}
                </div>
                <button
                  onClick={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}
                  style={{
                    background: 'transparent',
                    border: C.border,
                    borderRadius: 8,
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: C.textMuted,
                    fontSize: 14,
                    padding: 0,
                    transition: C.transition,
                  }}
                  title={theme === 'dark' ? '切换亮色主题' : '切换暗色主题'}
                >
                  {theme === 'dark' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  )}
                </button>
              </div>
            </div>
            <div style={{fontSize: 26, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.01em'}}>
              <span style={{color: C.text}}>资金流向</span>
              <span style={{color: C.cyan, textShadow: C.cyanGlow}}>实时监控</span>
            </div>
            <div style={{marginTop: 8, color: C.textSec, fontSize: 13}}>
              东方财富板块资金流实时数据监控
            </div>
          </div>

          <div style={{...cardStyle, padding: 16, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0}}>
              <div style={{fontWeight: 700, color: C.text}}>采集控制</div>
              <div style={{fontSize: 12, color: C.textMuted}}>快照 {formatTime(snapshot?.at)}</div>
            </div>

            <div style={{display: 'flex', gap: 10, marginBottom: 14, flexShrink: 0}}>
              <button
                onClick={onStart}
                disabled={!canStart || status?.state === 'running'}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: C.radiusSm,
                  border: status?.state === 'running' ? `1px solid rgba(${C.cyanRgb},0.2)` : 'none',
                  background: status?.state === 'running'
                    ? `rgba(${C.cyanRgb},0.08)`
                    : `linear-gradient(135deg, rgba(${C.cyanRgb},0.50), rgba(59,130,246,0.35))`,
                  boxShadow: status?.state === 'running' ? 'none' : `0 2px 12px rgba(${C.cyanRgb},0.15)`,
                  color: status?.state === 'running' ? C.cyan : '#fff',
                  cursor: !canStart || status?.state === 'running' ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.02em',
                  transition: C.transition,
                }}
              >
                开始采集
              </button>
              <button
                onClick={onStop}
                disabled={status?.state !== 'running'}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: C.radiusSm,
                  border: status?.state === 'running' ? `1px solid ${C.red}33` : C.border,
                  background: status?.state === 'running' ? `${C.red}0D` : C.bgInput,
                  color: status?.state === 'running' ? C.red : C.textMuted,
                  cursor: status?.state !== 'running' ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.02em',
                  transition: C.transition,
                }}
              >
                暂停采集
              </button>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14, flexShrink: 0}}>
              {[
                {label: '状态', value: status?.state ?? '—', tone: status?.state === 'running' ? C.cyan : C.textSec},
                {label: '频率', value: cfg ? intervalOptions.find((i) => i.value === cfg.intervalSec)?.label ?? `${cfg.intervalSec}s` : '—', tone: C.purple},
                {label: '最近采集', value: formatTime(status?.lastAt ?? snapshot?.at ?? undefined), tone: C.teal},
                {label: '已选板块', value: cfg ? `${cfg.selectedSectors.length}` : '—', tone: C.yellow},
              ].map((item) => (
                <div key={item.label} style={{borderRadius: C.radiusSm, border: C.border, background: theme === 'dark' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.50)', padding: '11px 12px'}}>
                  <div style={{fontSize: 11, color: C.textMuted, marginBottom: 5, letterSpacing: '0.04em'}}>{item.label}</div>
                  <div style={{fontSize: 15, fontWeight: 700, color: item.tone, fontFamily: C.fontMono}}>{item.value}</div>
                </div>
              ))}
            </div>

            {status?.state === 'running' && status.lastError && (
              <div style={{flexShrink: 0, marginBottom: 14, fontSize: 12, color: C.red, padding: '8px 10px', borderRadius: C.radiusXs, border: `1px solid ${C.red}22`, background: `${C.red}06`}}>错误：{status.lastError}</div>
            )}

            <div style={{marginBottom: 12, flexShrink: 0}}>
              <div style={labelStyle}>采集频率档位</div>
              <select value={cfg?.intervalSec ?? 60} onChange={(e) => onIntervalChange(Number(e.target.value))} style={inputStyle}>
                {intervalOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{marginBottom: 12, flexShrink: 0}}>
              <div style={labelStyle}>板块类型</div>
              <select
                value={(cfg?.sectorType ?? 'industry') as SectorType}
                onChange={(e) => onSectorTypeChange(e.target.value as SectorType)}
                style={inputStyle}
              >
                <option value="industry">行业板块</option>
                <option value="concept">概念板块</option>
                <option value="region">地域板块</option>
              </select>
            </div>

            <div style={{flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6}}>
              <div style={{fontSize: 12, color: C.textSec}}>采集板块（{cfg ? sectorTypeLabel(cfg.sectorType) : '—'}）</div>
              <div style={{fontSize: 12, color: C.textSec, display: 'flex', gap: 8, alignItems: 'center'}}>
                <span style={{color: C.textSec}}>{cfg ? `${cfg.selectedSectors.length} 已选` : '—'}</span>
                {cfg ? (
                  <>
                    <span onClick={() => {
                      const all = state.allSectors;
                      const nextCfg = {...cfg, selectedSectors: Array.from(all)};
                      api.setConfig(nextCfg);
                      setState((s) => ({...s, config: nextCfg}));
                    }} style={{cursor: 'pointer', color: C.cyan}} title="全选当前板块类型下所有板块">全选</span>
                    <span onClick={() => {
                      const nextCfg = {...cfg, selectedSectors: []};
                      api.setConfig(nextCfg);
                      setState((s) => ({...s, config: nextCfg}));
                    }} style={{cursor: 'pointer', color: C.textSec}} title="清空所有已选板块">清空</span>
                  </>
                ) : null}
              </div>
            </div>
            <input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="筛选板块..." style={{...inputStyle, marginBottom: 10, flexShrink: 0}} />
            <div style={{maxHeight: 200, overflowY: 'auto', flexShrink: 0, display: 'grid', gap: 5, paddingRight: 4}}>
              {pickerOptions.map((name) => (
                <div
                  key={name}
                  onClick={() => onToggleSector(name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 10px',
                    borderRadius: C.radiusXs,
                    border: selectedSet.has(name) ? `1px solid ${C.cyan}44` : C.border,
                    background: selectedSet.has(name) ? `${C.cyan}0D` : 'transparent',
                    cursor: 'pointer',
                    transition: C.transition,
                  }}
                >
                  <div style={{width: 14, height: 14, borderRadius: 4, border: selectedSet.has(name) ? `2px solid ${C.cyan}` : `2px solid ${C.textMuted}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedSet.has(name) ? C.cyan : 'transparent', transition: C.transition}}>
                    {selectedSet.has(name) && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 1.5" stroke="#05080F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{fontSize: 13, color: selectedSet.has(name) ? C.text : C.textSec}}>{name}</span>
                </div>
              ))}
            </div>

            {cfg && cfg.selectedSectors.length > 0 && (
              <div style={{marginTop: 12, borderTop: C.border, paddingTop: 12, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                <div style={{flexShrink: 0, fontSize: 11, color: C.textMuted, marginBottom: 8, letterSpacing: '0.04em'}}>
                  已选板块 · {cfg.selectedSectors.length}
                </div>
                <div style={{flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                  <div style={{flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4}}>
                    {sectorGroups.map(({type, names}) => (
                      <div key={type} style={{marginBottom: 10}}>
                        <div style={{fontSize: 10, color: C.textMuted, letterSpacing: '0.04em', marginBottom: 6, padding: '0 2px'}}>
                          {sectorTypeLabel(type)} · {names.length}
                        </div>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: 5}}>
                          {names.map((name) => {
                            const t = sectorTypeMap[name];
                            const chipColor = t === 'concept' ? C.purple : t === 'region' ? C.teal : C.cyan;
                            const chipBg = t === 'concept' || t === 'region' ? `${chipColor}18` : `${chipColor}12`;
  if (!state.loaded) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.bgRoot,
        color: C.textSec,
        fontFamily: C.fontSans,
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 28, height: 28,
          border: `3px solid ${C.cyan}33`,
          borderTopColor: C.cyan,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{fontSize: 13}}>正在连接采集服务…</div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
                              <div
                                key={name}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  fontSize: 12,
                                  padding: '3px 7px',
                                  borderRadius: 6,
                                  border: `1px solid ${chipColor}33`,
                                  background: chipBg,
                                  color: chipColor,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span
                                onClick={() => setChartSector(name)}
                                style={{cursor: 'pointer'}}
                                title="查看走势"
                              >{name}</span>
                                <button
                                  onClick={() => onToggleSector(name)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: 0,
                                    width: 14,
                                    height: 14,
                                    borderRadius: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: C.textMuted,
                                    fontSize: 12,
                                    lineHeight: 1,
                                    transition: C.transition,
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {chartSector && (() => {
                    const series = state.seriesBySector[chartSector];
                    const sectorData = snapshot?.sectors.find((s) => s.name === chartSector);
                    if (!series || series.length === 0) return null;
                    return (
                      <div style={{flexShrink: 0, borderTop: C.border, marginTop: 8, paddingTop: 10}}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6}}>
                          <div style={{fontSize: 12, fontWeight: 600, color: C.text}}>{chartSector}</div>
                          <button
                            onClick={() => setChartSector(null)}
                            style={{background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 14, padding: '2px 6px', borderRadius: 4, lineHeight: 1}}
                          >×</button>
                        </div>
                        <div style={{height: 140}}>
                          <TrendChart series={series} viewWidth={300} viewHeight={140} />
                        </div>
                        {sectorData && (
                          <div style={{display: 'flex', gap: 12, fontSize: 11, color: C.textSec, marginTop: 4}}>
                            <span>净流入: <span style={{color: sectorData.net >= 0 ? C.red : C.green, fontWeight: 600, fontFamily: C.fontMono}}>{formatNet(sectorData.net)}</span></span>
                            <span>主力净占比: <span style={{fontWeight: 600, fontFamily: C.fontMono}}>{formatRate(sectorData.rate)}</span></span>
                            <span>换手率: <span style={{fontWeight: 600, fontFamily: C.fontMono}}>{formatRatio(sectorData.turnoverRate)}%</span></span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, minHeight: 0}}>
          <div style={{...cardStyle, padding: 18}}>
            <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12}}>
              <div>
                <div style={{fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 6}}>
                  Tick List · 实时数据面板
                </div>
                <div style={{fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em'}}>
                  实时数据面板
                </div>
              </div>
              <div style={{fontSize: 12, color: C.textSec, fontFamily: C.fontMono}}>
                {snapshot ? `${sortedRows.length} 个板块 · ${formatTime(snapshot.at)}` : '暂无快照'}
              </div>
            </div>

            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'}}>
              {[
                {label: '流入', value: counts.up, color: C.red},
                {label: '流出', value: counts.down, color: C.green},
                {label: '持平', value: counts.flat, color: C.textSec},
                {label: '筛选结果', value: filteredRows.length, color: C.cyan},
              ].map((item) => (
                <div key={item.label} style={{padding: '5px 10px', borderRadius: 999, border: `1px solid ${item.color}33`, background: `${item.color}08`, fontSize: 12}}>
                  <span style={{color: C.textMuted}}>{item.label} </span>
                  <span style={{color: item.color, fontWeight: 700, fontFamily: C.fontMono}}>{item.value}</span>
                </div>
              ))}
              {topSector && worstSector && (
                <div style={{marginLeft: 'auto', fontSize: 12, color: C.textSec, whiteSpace: 'nowrap'}}>
                  <span style={{color: C.textMuted}}>最强流入 </span>
                  <span style={{color: C.red, fontWeight: 600}}>{topSector.name} {formatNet(topSector.latest.net)}</span>
                  <span style={{margin: '0 8px', color: C.textMuted}}>/</span>
                  <span style={{color: C.textMuted}}>最强流出 </span>
                  <span style={{color: C.green, fontWeight: 600}}>{worstSector.name} {formatNet(worstSector.latest.net)}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{...cardStyle, overflow: 'hidden', minHeight: 0, display: 'grid', gridTemplateRows: 'auto auto 1fr'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: C.border}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <div style={{fontSize: 13, fontWeight: 600, color: C.text}}>板块明细</div>
                {status?.state === 'running' && <span style={{fontSize: 11, color: C.cyan}}>● 采集中</span>}
              </div>
              <div style={{width: 220}}>
                <input value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} placeholder="筛选板块…" style={inputStyle} />
              </div>
            </div>

            {filteredRows.length > 0 && (
              <div style={{padding: '8px 18px', borderBottom: C.border, fontSize: 12, color: C.textMuted}}>
                总计 <span style={{color: C.textSec, fontWeight: 600}}>{filteredRows.length}</span> 个板块
                {tableFilter && <span style={{marginLeft: 12}}>筛选 <span style={{color: C.cyan}}>{filteredRows.length}</span>/{allRows.length}</span>}
              </div>
            )}

            <div style={{display: 'grid', gridTemplateColumns: '1fr', minHeight: 0}}>
              <div style={{overflow: 'auto'}}>
                  <table style={{borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed'}}>
                    <colgroup>
                      {[
                        {label: '板块', w: 110},
                        {label: '代码', w: 68},
                        {label: '类型', w: 50},
                        {label: '涨跌幅', w: 68},
                        {label: '换手率', w: 64},
                        {label: '量比', w: 56},
                        {label: '涨速', w: 56},
                        {label: '60日涨幅', w: 72},
                        {label: '年初至今', w: 72},
                        {label: '成交额(亿)', w: 80},
                        {label: '最新净流入(亿)', w: 102},
                        {label: '主力净占比', w: 72},
                        {label: '超大单(亿)', w: 80},
                        {label: '大单(亿)', w: 76},
                        {label: '中单(亿)', w: 76},
                        {label: '小单(亿)', w: 76},
                        {label: '5日主力(亿)', w: 88},
                        {label: '10日主力(亿)', w: 92},
                        {label: '上涨', w: 50},
                        {label: '下跌', w: 50},
                        {label: '家数差', w: 58},
                        {label: '领涨股', w: 110},
                        {label: '领涨涨幅', w: 72},
                      ].map(({label, w}) => (
                        <col key={label} style={{width: colWidths[label] ? `${colWidths[label]}px` : `${w}px`}} />
                      ))}
                    </colgroup>
                    <thead style={{position: 'sticky', top: 0, zIndex: 2}}>
                       <tr style={{background: C.bgTableHead, color: C.textMuted}}>
                        <th colSpan={3} style={{
                          position: 'sticky', left: 0, zIndex: 3,
                          background: C.bgTableHead,
                          padding: 0,
                          whiteSpace: 'nowrap',
                          borderBottom: C.borderTableHead,
                          borderRight: `1px solid ${C.cyan}33`,
                        }}>
                          <div style={{display: 'flex', alignItems: 'center'}}>
                            {[
                              {label: '板块', w: 110},
                              {label: '代码', w: 68},
                              {label: '类型', w: 50},
                            ].map(({label, w}) => (
                              <div key={label} style={{
                                width: colWidths[label] ?? w,
                                padding: '10px 12px',
                                textAlign: label === '类型' ? 'center' : 'left',
                                fontWeight: 500,
                                fontSize: 11,
                                letterSpacing: '0.03em',
                                boxSizing: 'border-box',
                              }}>{label}</div>
                            ))}
                          </div>
                        </th>
                        {[
                          {label: '涨跌幅', title: '板块今日涨跌幅（f3）', field: 'ChangePct' as SortField},
                          {label: '换手率', title: '板块换手率（f8）', field: 'TurnoverRate' as SortField},
                          {label: '量比', title: '板块量比（f10）', field: 'VolumeRatio' as SortField},
                          {label: '涨速', title: '板块当前涨速（f22）', field: 'Speed' as SortField},
                          {label: '60日涨幅', title: '60日涨跌幅（f24）', field: 'Change60d' as SortField},
                          {label: '年初至今', title: '年初至今涨跌幅（f25）', field: 'ChangeYtd' as SortField},
                          {label: '成交额(亿)', title: '板块今日成交额（f6）', field: 'Turnover' as SortField},
                          {label: '最新净流入(亿)', title: '今日主力净流入额（f62），主力=超大单+大单', field: 'Net' as SortField},
                          {label: '主力净占比', title: '主力净流入占成交额比重（f184）', field: 'MainRate' as SortField},
                          {label: '超大单(亿)', title: '今日超大单净流入额（f66），≥100万股或≥500万元', field: 'SuperNet' as SortField},
                          {label: '大单(亿)', title: '今日大单净流入额（f72），≥2万股或≥20万元', field: 'BigNet' as SortField},
                          {label: '中单(亿)', title: '今日中单净流入额（f78）', field: 'MidNet' as SortField},
                          {label: '小单(亿)', title: '今日小单净流入额（f84）', field: 'SmallNet' as SortField},
                          {label: '5日主力(亿)', title: '近5日主力净流入额合计（f263）', field: 'Net5d' as SortField},
                          {label: '10日主力(亿)', title: '近10日主力净流入额合计（f264）', field: 'Net10d' as SortField},
                          {label: '上涨', title: '板块内上涨家数（f104）', field: 'UpCount' as SortField},
                          {label: '下跌', title: '板块内下跌家数（f105）', field: 'DownCount' as SortField},
                          {label: '家数差', title: '上涨家数-下跌家数（f225）', field: 'UpDownDiff' as SortField},
                          {label: '领涨股', title: '板块内涨幅最大的股票（f204）', field: null},
                          {label: '领涨涨幅', title: '领涨股今日涨幅（f205）', field: 'LeaderChangePct' as SortField},
                        ].map((col) => (
                          <th key={col.label} title={col.title} style={{
                            position: 'relative',
                            textAlign: 'right',
                            padding: '10px 12px',
                            whiteSpace: 'nowrap',
                            fontWeight: 500,
                            fontSize: 11,
                            letterSpacing: '0.03em',
                            borderBottom: C.borderTableHead,
                          }}>
                            <span style={{display: 'inline-flex', alignItems: 'center', gap: 3}}>
                              {col.field ? (
                                <button
                                  onClick={() => handleSort(col.field)}
                                  style={{background: 'transparent', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 'inherit', color: sortState.field === col.field ? C.cyan : C.textMuted, cursor: 'pointer', fontWeight: sortState.field === col.field ? 600 : 500, transition: C.transition}}
                                >
                                  {col.label}{sortState.field === col.field ? (sortState.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                                </button>
                              ) : <>{col.label}</>}
                            </span>
                            <div
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const th = (e.target as HTMLElement).closest('th');
                                if (!th) return;
                                const startX = e.clientX;
                                const startWidth = th.offsetWidth;
                                const onMove = (ev: MouseEvent) => {
                                  const w = Math.max(50, startWidth + ev.clientX - startX);
                                  setColWidths((prev) => ({...prev, [col.label]: w}));
                                };
                                const onUp = () => {
                                  document.removeEventListener('mousemove', onMove);
                                  document.removeEventListener('mouseup', onUp);
                                };
                                document.addEventListener('mousemove', onMove);
                                document.addEventListener('mouseup', onUp);
                              }}
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: 5,
                                cursor: 'col-resize',
                                zIndex: 1,
                                userSelect: 'none',
                              }}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                  <tbody>
                    {sortedRows.length === 0 ? (
                      <tr>
                        <td colSpan={24} style={{padding: 32, color: C.textMuted, textAlign: 'center', fontSize: 13}}>
                          暂无采集数据，请选择板块并开始采集
                        </td>
                      </tr>
                    ) : (
                      sortedRows.map((row) => {
                        const isUp = row.latest.net >= 0;
                        return (
                          <tr
                            key={row.name}
                            className="tbl-row"
                            style={{
                              borderTop: C.rowBorder,
                              background: isUp ? `${C.red}08` : `${C.green}08`,
                              transition: C.transition,
                            }}
                          >
                            <td colSpan={3} style={{
                              padding: '10px 12px',
                              position: 'sticky', left: 0, zIndex: 1,
                              background: frozenBg,
                              whiteSpace: 'nowrap',
                              borderRight: `1px solid ${C.cyan}33`,
                            }}>
                              <div style={{display: 'flex', alignItems: 'center'}}>
                                <div style={{width: colWidths['板块'] ?? 110, paddingRight: 12, boxSizing: 'border-box'}}>
                                  <div style={{fontWeight: 600, color: C.text, fontSize: 13, transition: C.transition}}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = C.cyan)}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = C.text)}>
                                    {row.name}
                                  </div>
                                  <div style={{fontSize: 11, color: C.textMuted, marginTop: 3}}>{formatTime(snapshot?.at)}</div>
                                </div>
                                <div style={{width: colWidths['代码'] ?? 68, paddingRight: 12, boxSizing: 'border-box', fontSize: 11, color: C.textMuted, fontFamily: C.fontMono}}>
                                  {row.latest.bkCode}
                                </div>
                                <div style={{width: colWidths['类型'] ?? 50, boxSizing: 'border-box', textAlign: 'center'}}>
                                  <span style={{
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    background: row.latest.sectorType === 'concept' ? `${C.purple}18` : row.latest.sectorType === 'region' ? `${C.teal}18` : `${C.cyan}12`,
                                    color: row.latest.sectorType === 'concept' ? C.purple : row.latest.sectorType === 'region' ? C.teal : C.cyan,
                                  }}>
                                    {sectorTypeLabel(row.latest.sectorType)}
                                  </span>
                                </div>
                              </div>
                            </td>
                             <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.changePct), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatRate(row.latest.changePct)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: C.textSec, fontFamily: C.fontMono, fontSize: 13}}>
                              {formatRatio(row.latest.turnoverRate)}%
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: C.textSec, fontFamily: C.fontMono, fontSize: 13}}>
                              {formatRatio(row.latest.volumeRatio)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.speed), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatRate(row.latest.speed)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.change60d), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatRate(row.latest.change60d)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.changeYtd), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatRate(row.latest.changeYtd)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: C.textSec, fontFamily: C.fontMono, fontSize: 13}}>
                              {formatVal(row.latest.turnover)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.net), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatVal(row.latest.net)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.rate), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatRate(row.latest.rate)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.superNet), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatVal(row.latest.superNet)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.bigNet), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatVal(row.latest.bigNet)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.midNet), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatVal(row.latest.midNet)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.smallNet), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatVal(row.latest.smallNet)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.net5d), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatVal(row.latest.net5d)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.net10d), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatVal(row.latest.net10d)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: C.red, fontFamily: C.fontMono, fontSize: 13}}>
                              {formatCount(row.latest.upCount)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: C.green, fontFamily: C.fontMono, fontSize: 13}}>
                              {formatCount(row.latest.downCount)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.upCount - row.latest.downCount), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatDiff(row.latest.upCount - row.latest.downCount)}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: C.text, fontFamily: C.fontSans, fontSize: 12, whiteSpace: 'nowrap'}}>
                              {row.latest.leaderStock || '—'}
                            </td>
                            <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.leaderChangePct), fontFamily: C.fontMono, fontSize: 13}}>
                              {formatRate(row.latest.leaderChangePct)}
                            </td>
                            </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
