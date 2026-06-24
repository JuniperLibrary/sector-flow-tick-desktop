import React from 'react';
import type {AlertEvent, SectorType, SeriesPoint, TickConfig} from '../types';
import type {EastmoneySector, TickSnapshot, CollectorStatus} from '../types';
import * as api from '../api';
import {TrendChart, MultiSeries} from './TrendChart';

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

const LS_SORT_KEY = 'sf-sort-state';
const LS_FILTER_KEY = 'sf-table-filter';

function loadSortState(): SortState {
  try {
    const raw = localStorage.getItem(LS_SORT_KEY);
    if (raw) return JSON.parse(raw) as SortState;
  } catch {}
  return {field: 'Net', direction: 'desc'};
}

function loadTableFilter(): string {
  try {
    const raw = localStorage.getItem(LS_FILTER_KEY);
    return raw ?? '';
  } catch {}
  return '';
}

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

function formatFreshness(at: number | undefined, nowTs: number): {text: string; color: string} {
  if (!at) return {text: '暂无数据', color: '#64748B'};
  const diff = Math.floor((nowTs - at) / 1000);
  if (diff < 30) return {text: '刚刚', color: '#4ADE80'};
  if (diff < 60) return {text: `${diff}秒前`, color: '#4ADE80'};
  if (diff < 300) return {text: `${Math.floor(diff / 60)}分钟前`, color: '#FBBF24'};
  return {text: `${Math.floor(diff / 60)}分钟前`, color: '#F87171'};
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

/** Create a placeholder EastmoneySector for selected sectors not in current snapshot */
function createPlaceholderSector(name: string, sectorTypeMap: Record<string, SectorType>, snapshotAt: number): EastmoneySector {
  const sectorType = sectorTypeMap[name] || 'industry';
  return {
    name,
    bkCode: '',
    sectorType,
    net: 0,
    rate: 0,
    changePct: 0,
    superNet: 0,
    bigNet: 0,
    midNet: 0,
    smallNet: 0,
    turnover: 0,
    turnoverRate: 0,
    volumeRatio: 0,
    speed: 0,
    change60d: 0,
    changeYtd: 0,
    net5d: 0,
    net10d: 0,
    upCount: 0,
    downCount: 0,
    leaderStock: '',
    leaderChangePct: 0,
  };
}

/** Build rows including ALL selected sectors, with placeholders for missing ones */
function buildRowsWithSelected(
  snapshot: TickSnapshot | null,
  seriesBySector: Record<string, SeriesPoint[]>,
  selectedSectors: string[],
  sectorTypeMap: Record<string, SectorType>
): SectorRow[] {
  if (!snapshot) {
    // No snapshot at all - create placeholders for all selected sectors
    const now = Date.now();
    return selectedSectors.map((name) => ({
      name,
      latest: createPlaceholderSector(name, sectorTypeMap, now),
      series: [],
    }));
  }

  const snapshotSectors = new Map(snapshot.sectors.map((s) => [s.name, s]));
  const now = snapshot.at;

  // Start with sectors from snapshot that are selected
  const rows: SectorRow[] = [];
  for (const name of selectedSectors) {
    const sector = snapshotSectors.get(name);
    if (sector) {
      const series = seriesBySector[name] ?? [{t: now, v: sector.net}];
      rows.push({name, latest: sector, series});
    } else {
      // Selected but not in snapshot - create placeholder
      rows.push({
        name,
        latest: createPlaceholderSector(name, sectorTypeMap, now),
        series: seriesBySector[name] ?? [],
      });
    }
  }
  return rows;
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
  const [tableFilter, setTableFilter] = React.useState(loadTableFilter);
  const [sortState, setSortState] = React.useState<SortState>(loadSortState);
  const [colWidths, setColWidths] = React.useState<Record<string, number>>({});
  const [chartSectors, setChartSectors] = React.useState<Set<string>>(new Set());
  const toggleChartSector = (name: string) => {
    setChartSectors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const [alerts, setAlerts] = React.useState<Array<AlertEvent & {id: number}>>([]);
  const [alwaysOnTop, setAlwaysOnTop] = React.useState(false);
  const [detailSector, setDetailSector] = React.useState<EastmoneySector | null>(null);
  const [now, setNow] = React.useState(Date.now());
  const tableScrollRef = React.useRef<HTMLDivElement | null>(null);
  const tablePanRef = React.useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const topScrollDragRef = React.useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    trackWidth: 0,
    thumbWidth: 0,
  });
  const topScrollTrackRef = React.useRef<HTMLDivElement | null>(null);
  const [isTablePanning, setIsTablePanning] = React.useState(false);
  const [isTopScrollDragging, setIsTopScrollDragging] = React.useState(false);
  const [topScrollTrackWidth, setTopScrollTrackWidth] = React.useState(0);
  const [tableScrollMetrics, setTableScrollMetrics] = React.useState({
    scrollLeft: 0,
    maxScrollLeft: 0,
    clientWidth: 0,
    scrollWidth: 0,
  });

  const frozenBg = React.useMemo(() => theme === 'dark' ? '#0F172A' : '#FFFFFF', [theme]);

  React.useEffect(() => {
    let unsubSnap: (() => void) | null = null;
    let unsubStatus: (() => void) | null = null;
    let unsubConfig: (() => void) | null = null;
    let unsubAlert: (() => void) | null = null;

    const init = async () => {
      const [cfg, status, snap, sectorsWithType, hotSectors] = await Promise.all([
        api.getConfig(),
        api.getCollectorStatus(),
        api.getLatestSnapshot(),
        api.listAllSectorsWithType(),
        api.getHotSectors(),
      ]);
      // Fetch ALL sector types in parallel to build complete sector list + type map
      const currentType = cfg?.sectorType ?? 'industry';
      const allTypes: SectorType[] = ['industry', 'concept', 'region'];
      const [industrySectors, conceptSectors, regionSectors] = await Promise.all(
        allTypes.map((t) => api.getAllSectorsForType(t))
      );
      const allSectorsByType: Record<SectorType, string[]> = {
        industry: industrySectors,
        concept: conceptSectors,
        region: regionSectors,
      };
      // allSectors for picker = current type only (when user filters by type)
      const allSectors = allSectorsByType[currentType] ?? [];
      // allSectorsCombined for validation = all types (so cross-type defaults aren't filtered out)
      const allSectorsCombined = [...industrySectors, ...conceptSectors, ...regionSectors];

      // Build sectorTypeMap from API data (complete, not snapshot-dependent)
      const sectorTypeMap: Record<string, SectorType> = {};
      for (const [t, names] of Object.entries(allSectorsByType)) {
        for (const name of names) {
          sectorTypeMap[name] = t as SectorType;
        }
      }
      // Also merge from snapshot-based sectorsWithType (may have additional entries)
      for (const {name, sectorType} of sectorsWithType) {
        if (!sectorTypeMap[name]) {
          sectorTypeMap[name] = sectorType;
        }
      }

      let initialSeries: Record<string, SeriesPoint[]> = {};
      if (snap) {
        initialSeries = mergeSnapshotSeries(initialSeries, snap);
      }

      let resolvedCfg = cfg;

      // Recovery: if previous bug trimmed 21 hot sectors → ~5, restore to full hot list.
      // This runs regardless of snapshot data — hot sectors are hardcoded and always valid.
      if (cfg &&
          resolvedCfg.selectedSectors.length < hotSectors.length &&
          resolvedCfg.selectedSectors.every((s) => hotSectors.includes(s))) {
        resolvedCfg = {...resolvedCfg, selectedSectors: [...hotSectors]};
        await api.setConfig(resolvedCfg);
      }

      // Validate selected sectors against ALL types' sector list combined,
      // so cross-type default sectors (e.g. concept sectors in industry mode)
      // are NOT incorrectly filtered out.
      if (cfg && allSectorsCombined.length > 0) {
        const allow = new Set(allSectorsCombined);
        const validSelected = cfg.selectedSectors.filter((n) => allow.has(n));
        if (validSelected.length !== cfg.selectedSectors.length) {
          resolvedCfg = {...cfg, selectedSectors: validSelected};
          await api.setConfig(resolvedCfg);
        }

        // Empty selection → populate with valid hot sectors that exist in full list
        if (cfg.selectedSectors.length === 0) {
          const hotInAll = hotSectors.filter((h) => allSectorsCombined.includes(h));
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
          const nextTypeMap = {...s.sectorTypeMap};
          for (const sector of next.sectors) {
            if (!nextTypeMap[sector.name]) {
              nextTypeMap[sector.name] = sector.sectorType;
            }
          }
          return {
            ...s,
            snapshot: next,
            seriesBySector: nextSeries,
            sectorTypeMap: nextTypeMap,
          };
        });
      });
      unsubStatus = await api.onStatus((next) => setState((s) => ({...s, status: next})));
      unsubConfig = await api.onConfig((next) => setState((s) => ({...s, config: next})));
      let alertId = 0;
      unsubAlert = await api.onAlert((alert) => {
        const id = ++alertId;
        setAlerts((prev) => [...prev, {...alert, id}].slice(-3));
        setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.id !== id));
        }, 4500);
        // Play beep sound via Web Audio API
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.2);
        } catch (_) { /* audio not available */ }
        // System notification
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('资金异动', {
              body: `${alert.sectorName} ${alert.delta >= 0 ? '+' : ''}${(alert.delta).toFixed(1)}亿`,
            });
          }
        } catch (_) { /* notification not available */ }
      });
    };

    // Request notification permission on first load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    init().catch((err) => {
      console.error(err);
      setState((s) => ({...s, loaded: true}));
    });
    return () => {
      unsubSnap?.();
      unsubStatus?.();
      unsubConfig?.();
      unsubAlert?.();
    };
  }, []);

  React.useEffect(() => {
    localStorage.setItem(LS_SORT_KEY, JSON.stringify(sortState));
  }, [sortState]);
  React.useEffect(() => {
    localStorage.setItem(LS_FILTER_KEY, tableFilter);
  }, [tableFilter]);
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
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
    if (!q) return state.allSectors;
    return state.allSectors.filter((n) => n.includes(q)).slice(0, 5);
  }, [pickerSearch, state.allSectors]);

  const allRows = React.useMemo(() => buildRows(snapshot, state.seriesBySector), [snapshot, state.seriesBySector]);
  const filteredRows = React.useMemo(() => {
    const selectedSectors = cfg?.selectedSectors ?? [];
    const selectedSet = new Set(selectedSectors);
    // Use buildRowsWithSelected to include ALL selected sectors (with placeholders for missing)
    let rows = selectedSectors.length > 0
      ? buildRowsWithSelected(snapshot, state.seriesBySector, selectedSectors, sectorTypeMap)
      : allRows;
    const q = tableFilter.trim();
    if (q) rows = rows.filter((row) => row.name.includes(q));
    return rows;
  }, [snapshot, state.seriesBySector, cfg?.selectedSectors, tableFilter, sectorTypeMap]);
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
    // Fetch current type's sector list for the picker
    const [currentSectors, sectorsWithType] = await Promise.all([
      api.getAllSectorsForType(t),
      api.listAllSectorsWithType(),
    ]);
    // Merge new type's sectors into existing sectorTypeMap (don't replace)
    const currentTypeSectors = currentSectors;
    setState((s) => {
      const nextTypeMap = {...s.sectorTypeMap};
      // All sectors from API for this type are guaranteed to be this type
      for (const name of currentTypeSectors) {
        if (!nextTypeMap[name]) {
          nextTypeMap[name] = t;
        }
      }
      // Also merge from snapshot data
      for (const {name, sectorType} of sectorsWithType) {
        if (!nextTypeMap[name]) {
          nextTypeMap[name] = sectorType;
        }
      }
      return {
        ...s,
        config: nextCfg,
        allSectors: currentTypeSectors,
        sectorTypeMap: nextTypeMap,
      };
    });
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

  const updateTableScrollMetrics = React.useCallback(() => {
    const el = tableScrollRef.current;
    if (el) {
      setTableScrollMetrics({
        scrollLeft: el.scrollLeft,
        maxScrollLeft: Math.max(0, el.scrollWidth - el.clientWidth),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      });
    }
    if (topScrollTrackRef.current) {
      setTopScrollTrackWidth(topScrollTrackRef.current.clientWidth);
    }
  }, []);

  React.useEffect(() => {
    updateTableScrollMetrics();
    const id = window.requestAnimationFrame(updateTableScrollMetrics);
    return () => window.cancelAnimationFrame(id);
  }, [updateTableScrollMetrics, sortedRows.length, colWidths]);

  React.useEffect(() => {
    const onResize = () => updateTableScrollMetrics();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateTableScrollMetrics]);

  const shouldIgnoreTablePan = (target: EventTarget | null): boolean => {
    return target instanceof Element && Boolean(target.closest('button,input,select,textarea,a,[data-table-no-pan="true"]'));
  };

  const onTablePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = tableScrollRef.current;
    if (e.button !== 0 || !el || shouldIgnoreTablePan(e.target) || el.scrollWidth <= el.clientWidth) {
      return;
    }
    tablePanRef.current = {
      active: true,
      moved: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsTablePanning(true);
  };

  const onTablePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = tablePanRef.current;
    const el = tableScrollRef.current;
    if (!pan.active || !el || pan.pointerId !== e.pointerId) return;
    const dx = e.clientX - pan.startX;
    const dy = e.clientY - pan.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      pan.moved = true;
    }
    el.scrollLeft = pan.scrollLeft - dx;
    el.scrollTop = pan.scrollTop - dy;
    updateTableScrollMetrics();
  };

  const endTablePan = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = tablePanRef.current;
    if (!pan.active || pan.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    pan.active = false;
    setIsTablePanning(false);
  };

  const onTableClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tablePanRef.current.moved) return;
    e.preventDefault();
    e.stopPropagation();
    tablePanRef.current.moved = false;
  };

  const onTableScroll = () => {
    updateTableScrollMetrics();
  };

  const scrollTableTo = (scrollLeft: number) => {
    const el = tableScrollRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(scrollLeft, el.scrollWidth - el.clientWidth));
    el.scrollLeft = next;
    updateTableScrollMetrics();
  };

  const getTopScrollGeometry = (trackEl: HTMLDivElement) => {
    const {clientWidth, scrollWidth, maxScrollLeft} = tableScrollMetrics;
    const trackWidth = trackEl.clientWidth;
    const thumbWidth = scrollWidth > clientWidth
      ? Math.max(72, (clientWidth / scrollWidth) * trackWidth)
      : trackWidth;
    const travel = Math.max(1, trackWidth - thumbWidth);
    return {trackWidth, thumbWidth: Math.min(trackWidth, thumbWidth), travel, maxScrollLeft};
  };

  const onTopScrollTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || tableScrollMetrics.maxScrollLeft <= 0) return;
    const track = e.currentTarget;
    const thumb = (e.target as Element).closest('[data-top-scroll-thumb="true"]');
    const {trackWidth, thumbWidth, travel, maxScrollLeft} = getTopScrollGeometry(track);
    if (!thumb) {
      const rect = track.getBoundingClientRect();
      const targetLeft = e.clientX - rect.left - thumbWidth / 2;
      scrollTableTo((Math.max(0, Math.min(targetLeft, travel)) / travel) * maxScrollLeft);
    }
    topScrollDragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: tableScrollRef.current?.scrollLeft ?? 0,
      trackWidth,
      thumbWidth,
    };
    track.setPointerCapture(e.pointerId);
    setIsTopScrollDragging(true);
  };

  const onTopScrollTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = topScrollDragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    const travel = Math.max(1, drag.trackWidth - drag.thumbWidth);
    const deltaScroll = ((e.clientX - drag.startX) / travel) * tableScrollMetrics.maxScrollLeft;
    scrollTableTo(drag.startScrollLeft + deltaScroll);
  };

  const endTopScrollDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = topScrollDragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    drag.active = false;
    setIsTopScrollDragging(false);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const s = state.status;
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        if (s?.state === 'running' || s?.state === 'paused') {
          onStop().catch(() => {});
        } else {
          onStart().catch(() => {});
        }
      } else if (e.key === 'd' || e.key === 'D') {
        setTheme((t) => t === 'dark' ? 'light' : 'dark');
      } else if (e.key === 't' || e.key === 'T') {
        api.toggleAlwaysOnTop().then(setAlwaysOnTop).catch(() => {});
      } else if (e.key === '1') {
        onSectorTypeChange('industry');
      } else if (e.key === '2') {
        onSectorTypeChange('concept');
      } else if (e.key === '3') {
        onSectorTypeChange('region');
      } else if (e.key === 'Escape') {
        setDetailSector(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.status?.state]);

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

  const hasHorizontalOverflow = tableScrollMetrics.maxScrollLeft > 1;
  const topScrollThumbWidthPx = hasHorizontalOverflow && topScrollTrackWidth > 0
    ? Math.min(topScrollTrackWidth, Math.max(72, (tableScrollMetrics.clientWidth / tableScrollMetrics.scrollWidth) * topScrollTrackWidth))
    : topScrollTrackWidth;
  const topScrollThumbLeftPx = hasHorizontalOverflow && topScrollTrackWidth > topScrollThumbWidthPx
    ? (tableScrollMetrics.scrollLeft / tableScrollMetrics.maxScrollLeft) * (topScrollTrackWidth - topScrollThumbWidthPx)
    : 0;

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
                  <span className="live-dot" style={{display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: status?.state === 'running' ? C.cyan : status?.state === 'paused' ? C.yellow : C.textMuted, boxShadow: status?.state === 'running' ? `0 0 8px ${C.cyan}` : status?.state === 'paused' ? `0 0 8px ${C.yellow}` : 'none'}} />
                  {status?.state === 'running' ? '运行中' : status?.state === 'paused' ? '休市中' : '待机'}
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
                <button
                  onClick={async () => {
                    const onTop = await api.toggleAlwaysOnTop();
                    setAlwaysOnTop(onTop);
                  }}
                  style={{
                    background: 'transparent',
                    border: C.border,
                    borderRadius: 8,
                    width: 28, height: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: alwaysOnTop ? C.cyan : C.textMuted,
                    fontSize: 14, padding: 0,
                    transition: C.transition,
                  }}
                  title={alwaysOnTop ? '取消置顶' : '窗口置顶'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v7M6 12l6 6 6-6"/><path d="M6 18h12"/></svg>
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
              <div style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted}}>
                <span style={{display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: formatFreshness(snapshot?.at, now).color, boxShadow: `0 0 6px ${formatFreshness(snapshot?.at, now).color}`}} />
                {formatFreshness(snapshot?.at, now).text}
              </div>
            </div>

            <div style={{display: 'flex', gap: 10, marginBottom: 14, flexShrink: 0}}>
              <button
                onClick={onStart}
                disabled={!canStart || status?.state === 'running' || status?.state === 'paused'}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: C.radiusSm,
                  border: status?.state === 'running' ? `1px solid rgba(${C.cyanRgb},0.2)` : 'none',
                  background: status?.state === 'running' || status?.state === 'paused'
                    ? `rgba(${C.cyanRgb},0.08)`
                    : `linear-gradient(135deg, rgba(${C.cyanRgb},0.50), rgba(59,130,246,0.35))`,
                  boxShadow: status?.state === 'running' || status?.state === 'paused' ? 'none' : `0 2px 12px rgba(${C.cyanRgb},0.15)`,
                  color: status?.state === 'running' || status?.state === 'paused' ? C.cyan : '#fff',
                  cursor: !canStart || status?.state === 'running' || status?.state === 'paused' ? 'not-allowed' : 'pointer',
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
                disabled={status?.state !== 'running' && status?.state !== 'paused'}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: C.radiusSm,
                  border: (status?.state === 'running' || status?.state === 'paused') ? `1px solid ${C.red}33` : C.border,
                  background: (status?.state === 'running' || status?.state === 'paused') ? `${C.red}0D` : C.bgInput,
                  color: (status?.state === 'running' || status?.state === 'paused') ? C.red : C.textMuted,
                  cursor: (status?.state !== 'running' && status?.state !== 'paused') ? 'not-allowed' : 'pointer',
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
                {label: '状态', value: status?.state === 'running' ? '运行中' : status?.state === 'paused' ? '休市中' : status?.state === 'stopped' ? '已停止' : status?.state === 'error' ? '错误' : '—', tone: status?.state === 'running' ? C.cyan : status?.state === 'paused' ? C.yellow : C.textSec},
                {label: '频率', value: cfg ? intervalOptions.find((i) => i.value === cfg.intervalSec)?.label ?? `${cfg.intervalSec}s` : '—', tone: C.purple},
                {label: '最近采集', value: (() => { const ts = snapshot?.at; const f = formatFreshness(ts, now); return ts ? `${f.text} ${formatTime(ts)}` : '—'; })(), tone: (() => { const f = formatFreshness(snapshot?.at, now); return f.color === '#F87171' ? C.red : f.color === '#FBBF24' ? C.yellow : C.teal; })()},
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

            <div style={{marginBottom: 12, flexShrink: 0}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <span style={labelStyle}>资金异动告警</span>
                <div
                  onClick={() => {
                    const nextCfg: TickConfig = {...cfg!, alertEnabled: !cfg?.alertEnabled};
                    api.setConfig(nextCfg);
                    setState((s) => ({...s, config: nextCfg}));
                  }}
                  style={{
                    width: 36, height: 20, borderRadius: 20, cursor: 'pointer',
                    background: (cfg?.alertEnabled ?? false) ? C.cyan : (theme === 'dark' ? '#2A2D3A' : '#D0D5DD'),
                    position: 'relative', transition: C.transition,
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 2, left: (cfg?.alertEnabled ?? false) ? 18 : 2,
                    transition: C.transition,
                  }} />
                </div>
              </div>
              {(cfg?.alertEnabled ?? false) && (
                <div style={{marginTop: 8, display: 'flex', alignItems: 'center', gap: 8}}>
                  <span style={{fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap'}}>阈值</span>
                  <input type="range" min="0.5" max="5" step="0.5" value={cfg?.alertThreshold ?? 2}
                    onChange={(e) => {
                      const nextCfg: TickConfig = {...cfg!, alertThreshold: Number(e.target.value)};
                      api.setConfig(nextCfg);
                      setState((s) => ({...s, config: nextCfg}));
                    }}
                    style={{flex: 1, accentColor: C.cyan}} />
                  <span style={{fontSize: 12, color: C.textSec, fontFamily: C.fontMono, minWidth: 36, textAlign: 'right'}}>{(cfg?.alertThreshold ?? 2).toFixed(1)}亿</span>
                </div>
              )}
            </div>

            <div style={{flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6}}>
              <div style={{fontSize: 12, color: C.textSec}}>采集板块（{cfg ? sectorTypeLabel(cfg.sectorType) : '—'}）</div>
              <div style={{fontSize: 12, color: C.textSec, display: 'flex', gap: 8, alignItems: 'center'}}>
                <span style={{color: C.textSec}}>{cfg ? `${cfg.selectedSectors.length} 已选` : '—'}</span>
                {cfg ? (
                  <>
                    <span onClick={() => {
                      const targets = pickerSearch.trim() ? pickerOptions : state.allSectors;
                      const nextCfg = {...cfg, selectedSectors: Array.from(targets)};
                      api.setConfig(nextCfg);
                      setState((s) => ({...s, config: nextCfg}));
                    }} style={{cursor: 'pointer', color: C.cyan}} title={pickerSearch.trim() ? '全选搜索结果' : '全选当前板块类型下所有板块'}>全选</span>
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
                                onClick={() => toggleChartSector(name)}
                                style={{cursor: 'pointer', fontWeight: chartSectors.has(name) ? 700 : 400, color: chartSectors.has(name) ? C.cyan : chipColor}}
                                title={chartSectors.has(name) ? '移出对比' : '加入对比'}
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

                  {chartSectors.size > 0 && (() => {
                    const multiSeries: MultiSeries[] = [];
                    const colorList = ['#F87171', '#4ADE80', '#60A5FA', '#FBBF24', '#A78BFA', '#FB923C', '#34D399', '#38BDF8'];
                    let ci = 0;
                    for (const name of chartSectors) {
                      const data = state.seriesBySector[name];
                      if (data && data.length > 0) {
                        multiSeries.push({name, data, color: colorList[ci % colorList.length]});
                        ci++;
                      }
                    }
                    if (multiSeries.length === 0) return null;
                    return (
                      <div style={{flexShrink: 0, borderTop: C.border, marginTop: 8, paddingTop: 10}}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6}}>
                          <div style={{fontSize: 12, fontWeight: 600, color: C.text}}>
                            {multiSeries.length} 个板块走势对比
                          </div>
                          <button
                            onClick={() => setChartSectors(new Set())}
                            style={{background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12, padding: '2px 6px', borderRadius: 4, lineHeight: 1}}
                          >清除</button>
                        </div>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4}}>
                          {multiSeries.map((m) => (
                            <span key={m.name} style={{fontSize: 11, color: m.color, display: 'flex', alignItems: 'center', gap: 3}}>
                              <span style={{width: 8, height: 8, borderRadius: '50%', background: m.color, display: 'inline-block'}} />
                              {m.name}
                            </span>
                          ))}
                        </div>
                        <div style={{height: 140}}>
                          <TrendChart series={multiSeries} viewWidth={300} viewHeight={140} />
                        </div>
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
                {snapshot ? `${sortedRows.length} 个板块 · ${formatTime(snapshot.at)} · ${formatFreshness(snapshot.at, now).text}` : '暂无快照'}
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
              {hasHorizontalOverflow && (
                <div
                  ref={topScrollTrackRef}
                  data-table-no-pan="true"
                  onPointerDown={onTopScrollTrackPointerDown}
                  onPointerMove={onTopScrollTrackPointerMove}
                  onPointerUp={endTopScrollDrag}
                  onPointerCancel={endTopScrollDrag}
                  onLostPointerCapture={endTopScrollDrag}
                  style={{
                    margin: '8px 18px 10px',
                    height: 20,
                    borderRadius: 10,
                    background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)',
                    border: C.border,
                    position: 'relative',
                    cursor: isTopScrollDragging ? 'grabbing' : 'pointer',
                    touchAction: 'none',
                  }}
                  title="拖动横向浏览表格"
                >
                  <div
                    data-top-scroll-thumb="true"
                    style={{
                      position: 'absolute',
                      left: topScrollTrackWidth > 0 ? topScrollThumbLeftPx : 0,
                      top: 3,
                      bottom: 3,
                      width: topScrollTrackWidth > 0 ? topScrollThumbWidthPx : '100%',
                      borderRadius: 8,
                      background: isTopScrollDragging
                        ? C.cyan
                        : `linear-gradient(90deg, rgba(${C.cyanRgb},0.76), rgba(59,130,246,0.58))`,
                      boxShadow: isTopScrollDragging ? C.cyanGlow : `0 2px 8px rgba(${C.cyanRgb},0.18)`,
                    }}
                  />
                </div>
              )}
              <div
                ref={tableScrollRef}
                onPointerDown={onTablePointerDown}
                onPointerMove={onTablePointerMove}
                onPointerUp={endTablePan}
                onPointerCancel={endTablePan}
                onLostPointerCapture={endTablePan}
                onClickCapture={onTableClickCapture}
                onScroll={onTableScroll}
                style={{
                  overflow: 'auto',
                  cursor: isTablePanning ? 'grabbing' : 'grab',
                  userSelect: isTablePanning ? 'none' : undefined,
                  overscrollBehavior: 'contain',
                  touchAction: 'none',
                }}
              >
                  <table style={{borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed'}}>
                    <colgroup>
                      {[
                        // Fixed columns (sticky left)
                        {label: '板块', w: 110},
                        {label: '代码', w: 68},
                        {label: '类型', w: 50},
                        // Core fund flow metrics - most important on the left
                        {label: '涨跌幅', w: 68},
                        {label: '最新净流入(亿)', w: 102},
                        {label: '主力净占比', w: 72},
                        {label: '超大单(亿)', w: 80},
                        {label: '大单(亿)', w: 76},
                        // Activity & liquidity metrics
                        {label: '换手率', w: 64},
                        {label: '量比', w: 56},
                        {label: '成交额(亿)', w: 80},
                        // Other metrics
                        {label: '涨速', w: 56},
                        {label: '60日涨幅', w: 72},
                        {label: '年初至今', w: 72},
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
                          // Core fund flow metrics - most important on the left
                          {label: '涨跌幅', title: '板块今日涨跌幅（f3）', field: 'ChangePct' as SortField},
                          {label: '最新净流入(亿)', title: '今日主力净流入额（f62），主力=超大单+大单', field: 'Net' as SortField},
                          {label: '主力净占比', title: '主力净流入占成交额比重（f184）', field: 'MainRate' as SortField},
                          {label: '超大单(亿)', title: '今日超大单净流入额（f66），≥100万股或≥500万元', field: 'SuperNet' as SortField},
                          {label: '大单(亿)', title: '今日大单净流入额（f72），≥2万股或≥20万元', field: 'BigNet' as SortField},
                          // Activity & liquidity metrics
                          {label: '换手率', title: '板块换手率（f8）', field: 'TurnoverRate' as SortField},
                          {label: '量比', title: '板块量比（f10）', field: 'VolumeRatio' as SortField},
                          {label: '成交额(亿)', title: '板块今日成交额（f6）', field: 'Turnover' as SortField},
                          // Other metrics
                          {label: '涨速', title: '板块当前涨速（f22）', field: 'Speed' as SortField},
                          {label: '60日涨幅', title: '60日涨跌幅（f24）', field: 'Change60d' as SortField},
                          {label: '年初至今', title: '年初至今涨跌幅（f25）', field: 'ChangeYtd' as SortField},
                          {label: '中单(亿)', title: '今日中单净流入额（f78）', field: 'MidNet' as SortField},
                          {label: '小单(亿)', title: '今日小单净流入额（f84）', field: 'SmallNet' as SortField},
                          {label: '5日主力(亿)', title: '近5日主力净流入额合计（f263）', field: 'Net5d' as SortField},
                          {label: '10日主力(亿)', title: '近10日主力净流入额合计（f264）', field: 'Net10d' as SortField},
                          {label: '上涨', title: '板块内上涨家数（f204）', field: 'UpCount' as SortField},
                          {label: '下跌', title: '板块内下跌家数（f205）', field: 'DownCount' as SortField},
                          {label: '家数差', title: '上涨家数-下跌家数', field: 'UpDownDiff' as SortField},
                          {label: '领涨股', title: '板块内领涨股票（f100）', field: null},
                          {label: '领涨涨幅', title: '领涨股今日涨幅（f26）', field: 'LeaderChangePct' as SortField},
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
                              data-table-no-pan="true"
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
                                  <div style={{fontWeight: 600, color: C.text, fontSize: 13, transition: C.transition, cursor: 'pointer'}}
                                    onClick={() => setDetailSector(row.latest)}
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
                             {/* Core fund flow metrics - most important on the left */}
                             <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.changePct), fontFamily: C.fontMono, fontSize: 13}}>
                               {formatRate(row.latest.changePct)}
                             </td>
                             <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.net), fontFamily: C.fontMono, fontSize: 13, fontWeight: 600}}>
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
                             {/* Activity & liquidity metrics */}
                             <td style={{padding: '10px 12px', textAlign: 'right', color: C.textSec, fontFamily: C.fontMono, fontSize: 13}}>
                               {formatRatio(row.latest.turnoverRate)}%
                             </td>
                             <td style={{padding: '10px 12px', textAlign: 'right', color: C.textSec, fontFamily: C.fontMono, fontSize: 13}}>
                               {formatRatio(row.latest.volumeRatio)}
                             </td>
                             <td style={{padding: '10px 12px', textAlign: 'right', color: C.textSec, fontFamily: C.fontMono, fontSize: 13}}>
                               {formatVal(row.latest.turnover)}
                             </td>
                             {/* Other metrics */}
                             <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.speed), fontFamily: C.fontMono, fontSize: 13}}>
                               {formatRate(row.latest.speed)}
                             </td>
                             <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.change60d), fontFamily: C.fontMono, fontSize: 13}}>
                               {formatRate(row.latest.change60d)}
                             </td>
                             <td style={{padding: '10px 12px', textAlign: 'right', color: netTextColor(row.latest.changeYtd), fontFamily: C.fontMono, fontSize: 13}}>
                               {formatRate(row.latest.changeYtd)}
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
      <div style={{
        position: 'fixed',
        top: 16, right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}>
        {alerts.map((a) => {
          const isInflow = a.delta >= 0;
          return (
            <div key={a.id} style={{
              pointerEvents: 'auto',
              background: theme === 'dark' ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
              border: `1px solid ${isInflow ? C.red : C.green}44`,
              borderRadius: C.radiusSm,
              padding: '10px 14px',
              width: 280,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              cursor: 'pointer',
              transition: C.transition,
            }} onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4}}>
                <span style={{fontWeight: 600, fontSize: 13, color: C.text}}>{a.sectorName}</span>
                <span style={{fontSize: 11, color: C.textMuted}}>{formatTime(a.at)}</span>
              </div>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
                <span style={{fontWeight: 700, fontSize: 15, color: isInflow ? C.red : C.green, fontFamily: C.fontMono}}>
                  {isInflow ? '+' : ''}{a.delta.toFixed(1)}亿
                </span>
                <span style={{fontSize: 11, color: C.textMuted}}>
                  净流入 {formatNet(a.net)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {detailSector && (
        <div
          onClick={() => setDetailSector(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme === 'dark' ? '#1E2230' : '#FFFFFF',
              borderRadius: C.radius,
              border: C.border,
              boxShadow: '0 16px 64px rgba(0,0,0,0.35)',
              padding: 24,
              width: 520,
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16}}>
              <div>
                <span style={{fontWeight: 700, fontSize: 16, color: C.text}}>{detailSector.name}</span>
                <span style={{marginLeft: 8, fontSize: 12, color: C.textMuted}}>
                  {detailSector.bkCode}
                </span>
                <span style={{marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 4,
                  background: detailSector.sectorType === 'concept' ? `${C.purple}18` : detailSector.sectorType === 'region' ? `${C.teal}18` : `${C.cyan}12`,
                  color: detailSector.sectorType === 'concept' ? C.purple : detailSector.sectorType === 'region' ? C.teal : C.cyan,
                }}>
                  {sectorTypeLabel(detailSector.sectorType)}
                </span>
              </div>
              <button onClick={() => setDetailSector(null)}
                style={{background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 18, padding: '2px 6px', borderRadius: 4, lineHeight: 1}}
              >×</button>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px'}}>
              {[
                {label: '涨跌幅', value: formatRate(detailSector.changePct), color: netTextColor(detailSector.changePct)},
                {label: '换手率', value: `${formatRatio(detailSector.turnoverRate)}%`, color: C.textSec},
                {label: '量比', value: formatRatio(detailSector.volumeRatio), color: C.textSec},
                {label: '涨速', value: formatRate(detailSector.speed), color: netTextColor(detailSector.speed)},
                {label: '60日涨幅', value: formatRate(detailSector.change60d), color: netTextColor(detailSector.change60d)},
                {label: '年初至今', value: formatRate(detailSector.changeYtd), color: netTextColor(detailSector.changeYtd)},
                {label: '成交额', value: formatNet(detailSector.turnover), color: C.textSec},
                {label: '净流入', value: formatNet(detailSector.net), color: netTextColor(detailSector.net)},
                {label: '主力净占比', value: formatRate(detailSector.rate), color: netTextColor(detailSector.rate)},
                {label: '超大宗净流入', value: formatNet(detailSector.superNet), color: netTextColor(detailSector.superNet)},
                {label: '大宗净流入', value: formatNet(detailSector.bigNet), color: netTextColor(detailSector.bigNet)},
                {label: '中单净流入', value: formatNet(detailSector.midNet), color: netTextColor(detailSector.midNet)},
                {label: '小单净流入', value: formatNet(detailSector.smallNet), color: netTextColor(detailSector.smallNet)},
                {label: '5日净流入', value: formatNet(detailSector.net5d), color: netTextColor(detailSector.net5d)},
                {label: '10日净流入', value: formatNet(detailSector.net10d), color: netTextColor(detailSector.net10d)},
                {label: '上涨家数', value: formatCount(detailSector.upCount), color: C.red},
                {label: '下跌家数', value: formatCount(detailSector.downCount), color: C.green},
                {label: '涨跌差', value: formatDiff(detailSector.upCount - detailSector.downCount), color: netTextColor(detailSector.upCount - detailSector.downCount)},
                {label: '领涨股', value: detailSector.leaderStock || '—', color: C.text},
                {label: '领涨涨幅', value: formatRate(detailSector.leaderChangePct), color: netTextColor(detailSector.leaderChangePct)},
              ].map((item) => (
                <div key={item.label} style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: C.rowBorder}}>
                  <span style={{fontSize: 12, color: C.textMuted}}>{item.label}</span>
                  <span style={{fontSize: 13, fontWeight: 600, fontFamily: C.fontMono, color: item.color}}>{item.value}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop: 12, fontSize: 11, color: C.textMuted, textAlign: 'center'}}>
              快照时间 {formatTime(snapshot?.at)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
