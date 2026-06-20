use std::cmp::min;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use chrono::{Datelike, Timelike};
use tokio::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager};
use tauri::State;

use crate::config;
use crate::eastmoney;
use crate::models::*;

pub struct CollectorState {
    pub running: AtomicBool,
    pub trading_time_paused: AtomicBool,
    pub last_at: Mutex<Option<i64>>,
    pub last_error: Mutex<Option<String>>,
    pub history: Mutex<Vec<SectorSnapshot>>,
    pub prev_nets: Mutex<HashMap<String, f64>>,
}

impl CollectorState {
    pub fn new() -> Self {
        Self {
            running: AtomicBool::new(false),
            trading_time_paused: AtomicBool::new(false),
            last_at: Mutex::new(None),
            last_error: Mutex::new(None),
            history: Mutex::new(Vec::new()),
            prev_nets: Mutex::new(HashMap::new()),
        }
    }
}

/// Thread-safe wrapper for the latest snapshot
pub struct SnapshotsState(pub Mutex<Option<TickSnapshot>>);

impl Default for SnapshotsState {
    fn default() -> Self {
        Self(Mutex::new(None))
    }
}

const MAX_HISTORY_SNAPSHOTS: usize = 500;

/// A-share trading hours check (China timezone UTC+8).
/// Returns true during weekday sessions: 09:30-11:30 and 13:00-15:00.
fn is_trading_time() -> bool {
    let china_now = chrono::Utc::now() + chrono::Duration::hours(8);
    match china_now.weekday() {
        chrono::Weekday::Sat | chrono::Weekday::Sun => return false,
        _ => {}
    }
    let hour = china_now.hour();
    let min = china_now.minute();
    // Morning: 09:30 - 11:30
    if hour == 9 && min >= 30 { return true; }
    if hour == 10 { return true; }
    if hour == 11 && min < 30 { return true; }
    // Afternoon: 13:00 - 15:00
    if hour >= 13 && hour < 15 { return true; }
    if hour == 15 && min == 0 { return true; }
    false
}

/// True within 3 minutes before market close (11:27-11:30, 14:57-15:00)
fn is_near_trading_close() -> bool {
    let china_now = chrono::Utc::now() + chrono::Duration::hours(8);
    let hour = china_now.hour();
    let min = china_now.minute();
    if hour == 11 && min >= 27 { return true; }
    if hour == 14 && min >= 57 { return true; }
    if hour == 15 && min == 0 { return true; }
    false
}

pub fn start_collector(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let state: State<'_, CollectorState> = app.state::<CollectorState>();
        if state.running.load(Ordering::SeqCst) {
            log::info!("collector already running");
            return;
        }
        state.running.store(true, Ordering::SeqCst);
        log::info!("collector started");

        loop {
            let cfg = config::load_config(&app);

            // Pause when outside A-share trading hours
            if !is_trading_time() {
                state.trading_time_paused.store(true, Ordering::SeqCst);
                let status = CollectorStatus {
                    state: "paused".into(),
                    interval_sec: cfg.interval_sec,
                    last_at: *state.last_at.lock().await,
                    last_error: state.last_error.lock().await.clone(),
                };
                let _ = app.emit("tick-status", &status);
                tokio::time::sleep(Duration::from_secs(30)).await;
                if !state.running.load(Ordering::SeqCst) {
                    log::info!("collector stopped while paused");
                    break;
                }
                continue;
            }
            state.trading_time_paused.store(false, Ordering::SeqCst);

            {
                let last_at = *state.last_at.lock().await;
                let last_error = state.last_error.lock().await.clone();
                let status = CollectorStatus {
                    state: "collecting".into(),
                    interval_sec: cfg.interval_sec,
                    last_at,
                    last_error,
                };
                let _ = app.emit("tick-status", &status);
            }

            let mut all_sectors = Vec::new();
            let mut any_error = false;
            for st in SectorType::all() {
                match eastmoney::fetch_sectors(&st).await {
                    Ok(raw_list) => {
                        let sector_type = st.clone();
                        let now = chrono::Utc::now().timestamp_millis();
                        let snapshots: Vec<SectorSnapshot> = raw_list
                            .into_iter()
                            .map(|r| SectorSnapshot::from((&r, sector_type.clone(), now)))
                            .collect();
                        all_sectors.extend(snapshots);
                    }
                    Err(e) => {
                        log::error!("fetch {:?} fail: {}", st, e);
                        any_error = true;
                        let mut err = state.last_error.lock().await;
                        *err = Some(format!("{:?}: {}", st, e));
                    }
                }
            }

            let now = chrono::Utc::now().timestamp_millis();

            {
                let mut history = state.history.lock().await;
                history.extend(all_sectors.clone());
                if history.len() > MAX_HISTORY_SNAPSHOTS {
                    let excess = history.len() - MAX_HISTORY_SNAPSHOTS;
                    history.drain(0..excess);
                }
            }

            {
                let cfg = config::load_config(&app);
                if cfg.alert_enabled {
                    let threshold = cfg.alert_threshold;
                    let mut prev_nets = state.prev_nets.lock().await;
                    for sector in &all_sectors {
                        if let Some(&prev_net) = prev_nets.get(&sector.name) {
                            let delta = sector.net - prev_net;
                            if delta.abs() >= threshold {
                                let alert = AlertEvent {
                                    sector_name: sector.name.clone(),
                                    sector_type: sector.sector_type.clone(),
                                    delta,
                                    net: sector.net,
                                    prev_net,
                                    at: now,
                                };
                                log::info!("alert: {} net {:.1}→{:.1} (Δ{:.1})",
                                    sector.name, prev_net, sector.net, delta);
                                let _ = app.emit("tick-alert", &alert);
                            }
                        }
                        prev_nets.insert(sector.name.clone(), sector.net);
                    }
                }
            }

            let snap = TickSnapshot {
                at: now,
                sectors: all_sectors,
            };

            {
                let mut last_at = state.last_at.lock().await;
                *last_at = Some(now);
                if !any_error {
                    let mut last_error = state.last_error.lock().await;
                    *last_error = None;
                }
            }

            {
                let snapshots: State<'_, SnapshotsState> = app.state::<SnapshotsState>();
                let mut guard = snapshots.0.lock().await;
                *guard = Some(snap.clone());
            }

            let _ = app.emit("tick-snapshot", &snap);
            {
                let last_at = *state.last_at.lock().await;
                let last_error = state.last_error.lock().await.clone();
                let status = CollectorStatus {
                    state: "running".into(),
                    interval_sec: cfg.interval_sec,
                    last_at,
                    last_error,
                };
                let _ = app.emit("tick-status", &status);
            }

            // Adaptive interval: high freq in last 3 min before close, normal otherwise
            let sleep_sec = if is_near_trading_close() {
                min(cfg.interval_sec, 15)
            } else {
                cfg.interval_sec
            };
            tokio::time::sleep(Duration::from_secs(sleep_sec)).await;

            if !state.running.load(Ordering::SeqCst) {
                log::info!("collector stopped");
                break;
            }
        }
    });
}
