export type EastmoneySector = {
  name: string;
  bkCode: string;
  sectorType: SectorType;
  net: number;
  rate: number;
  changePct: number;
  superNet: number;
  bigNet: number;
  midNet: number;
  smallNet: number;
  turnover: number;
  turnoverRate: number;
  volumeRatio: number;
  speed: number;
  change60d: number;
  changeYtd: number;
  net5d: number;
  net10d: number;
  upCount: number;
  downCount: number;
  upDownDiff: number;
  leaderStock: string;
  leaderChangePct: number;
  at: number;
};

export type TickSnapshot = {
  at: number;
  sectors: EastmoneySector[];
};

export type SeriesPoint = {t: number; v: number};

export type CollectorStatus =
  | {state: 'idle'}
  | {state: 'running'; intervalSec: number; lastAt?: number; lastError?: string};

export type SectorType = 'industry' | 'concept' | 'region';

export type TickConfig = {
  intervalSec: number;
  selectedSectors: string[];
  sectorType: SectorType;
};
