use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tokio::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager};
use tauri::State;

use crate::config;
use crate::eastmoney;
use crate::models::*;

pub struct CollectorState {
    pub running: AtomicBool,
    pub last_at: Mutex<Option<i64>>,
    pub last_error: Mutex<Option<String>>,
    pub history: Mutex<Vec<SectorSnapshot>>,
}

impl CollectorState {
    pub fn new() -> Self {
        Self {
            running: AtomicBool::new(false),
            last_at: Mutex::new(None),
            last_error: Mutex::new(None),
            history: Mutex::new(Vec::new()),
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
                    state: "idle".into(),
                    interval_sec: cfg.interval_sec,
                    last_at,
                    last_error,
                };
                let _ = app.emit("tick-status", &status);
            }

            tokio::time::sleep(Duration::from_secs(cfg.interval_sec)).await;

            if !state.running.load(Ordering::SeqCst) {
                log::info!("collector stopped");
                break;
            }
        }
    });
}
