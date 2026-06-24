import {invoke} from '@tauri-apps/api/core';
import {listen, UnlistenFn} from '@tauri-apps/api/event';
import type {
  AlertEvent,
  CollectorStatus,
  InitialData,
  SectorType,
  SectorWithType,
  SeriesPoint,
  TickConfig,
  TickSnapshot,
} from './types';

export async function getConfig(): Promise<TickConfig> {
  return invoke('get_config');
}

export async function setConfig(cfg: TickConfig): Promise<void> {
  return invoke('set_config', {cfg});
}

export async function getCollectorStatus(): Promise<CollectorStatus> {
  return invoke('get_collector_status');
}

export async function getLatestSnapshot(): Promise<TickSnapshot | null> {
  return invoke('get_latest_snapshot');
}

export async function listSectors(sectorType: SectorType): Promise<string[]> {
  return invoke('list_sectors', {sectorType});
}

export async function getAllSectorsForType(sectorType: SectorType): Promise<string[]> {
  return invoke('get_all_sectors_for_type', {sectorType});
}

export async function getAllSectorsFromStore(): Promise<SectorWithType[]> {
  return invoke('get_all_sectors_from_store');
}

export async function refreshSectorsFromStore(): Promise<SectorWithType[]> {
  return invoke('refresh_sectors_from_store');
}

export async function listAllSectorsWithType(): Promise<SectorWithType[]> {
  return invoke('list_all_sectors_with_type');
}

export async function getHistory(name: string): Promise<SeriesPoint[]> {
  return invoke('get_history', {name});
}

export async function getAllHistory(): Promise<Record<string, SeriesPoint[]>> {
  return invoke('get_all_history');
}

export async function getHotSectors(): Promise<string[]> {
  return invoke('get_hot_sectors');
}

export async function startCollection(): Promise<void> {
  return invoke('start_collection');
}

export async function stopCollection(): Promise<void> {
  return invoke('stop_collection');
}

export async function getInitialData(): Promise<InitialData> {
  return invoke('get_initial_data');
}

export async function toggleAlwaysOnTop(): Promise<boolean> {
  return invoke<boolean>('toggle_always_on_top');
}

export function onSnapshot(cb: (snap: TickSnapshot) => void): Promise<UnlistenFn> {
  return listen<TickSnapshot>('tick-snapshot', (event) => cb(event.payload));
}

export function onStatus(cb: (status: CollectorStatus) => void): Promise<UnlistenFn> {
  return listen<CollectorStatus>('tick-status', (event) => cb(event.payload));
}

export function onConfig(cb: (cfg: TickConfig) => void): Promise<UnlistenFn> {
  return listen<TickConfig>('tick-config', (event) => cb(event.payload));
}

export function onAlert(cb: (alert: AlertEvent) => void): Promise<UnlistenFn> {
  return listen<AlertEvent>('tick-alert', (event) => cb(event.payload));
}
