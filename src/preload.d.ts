import type {CollectorStatus, SectorType, SeriesPoint, TickConfig, TickSnapshot} from './types';

declare global {
  interface Window {
    tickApp?: {
  listAllSectors: () => Promise<string[]>;
  listAllSectorsWithType: () => Promise<{name: string; sectorType: SectorType}[]>;
  listSectors: (type: SectorType) => Promise<string[]>;
  getConfig: () => Promise<TickConfig | null>;
  setConfig: (cfg: TickConfig) => Promise<void>;
  getStatus: () => Promise<CollectorStatus | null>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  getLatestSnapshot: () => Promise<TickSnapshot | null>;
  getHistory: (name: string) => Promise<SeriesPoint[]>;
  getAllHistory: () => Promise<Record<string, SeriesPoint[]>>;
  getHotSectors: () => Promise<string[]>;
  onSnapshot: (cb: (snap: TickSnapshot) => void) => () => void;
  onStatus: (cb: (status: CollectorStatus) => void) => () => void;
  onConfig: (cb: (cfg: TickConfig) => void) => () => void;
    };
  }
}

export {};
