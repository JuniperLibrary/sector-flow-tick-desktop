mod collector;
mod config;
mod eastmoney;
mod models;

use std::collections::HashMap;
use std::sync::atomic::Ordering;

use tauri::{AppHandle, Emitter, Manager, State};

use collector::CollectorState;
use models::*;

#[tauri::command]
fn get_config(app: AppHandle) -> TickConfig {
    config::load_config(&app)
}

#[tauri::command]
fn set_config(app: AppHandle, cfg: TickConfig) -> Result<(), String> {
    config::save_config(&app, &cfg)?;
    let _ = app.emit("tick-config", &cfg);
    Ok(())
}

#[tauri::command]
async fn get_collector_status(
    app: AppHandle,
    state: State<'_, CollectorState>,
) -> Result<CollectorStatus, String> {
    let last_at = *state.last_at.lock().await;
    let last_error = state.last_error.lock().await.clone();
    let cfg = config::load_config(&app);
    let state_str = if state.running.load(Ordering::SeqCst) {
        if last_error.is_some() { "error" } else { "idle" }
    } else {
        "stopped"
    };
    Ok(CollectorStatus {
        state: state_str.into(),
        interval_sec: cfg.interval_sec,
        last_at,
        last_error,
    })
}

#[tauri::command]
async fn get_latest_snapshot(
    snapshots: State<'_, collector::SnapshotsState>,
) -> Result<Option<TickSnapshot>, String> {
    let guard = snapshots.0.lock().await;
    Ok(guard.clone())
}

#[tauri::command]
async fn list_sectors(
    sector_type: SectorType,
    snapshots: State<'_, collector::SnapshotsState>,
) -> Result<Vec<String>, String> {
    let guard = snapshots.0.lock().await;
    match guard.as_ref() {
        Some(snap) => Ok(snap.sectors.iter()
            .filter(|s| s.sector_type == sector_type)
            .map(|s| s.name.clone())
            .collect()),
        None => Ok(vec![]),
    }
}

#[tauri::command]
async fn list_all_sectors() -> Result<Vec<String>, String> {
    Ok(vec![])
}

#[tauri::command]
async fn list_all_sectors_with_type(
    snapshots: State<'_, collector::SnapshotsState>,
) -> Result<Vec<SectorWithType>, String> {
    let guard = snapshots.0.lock().await;
    match guard.as_ref() {
        Some(snap) => {
            let mut seen = std::collections::HashSet::new();
            Ok(snap.sectors.iter()
                .filter(|s| seen.insert((s.name.clone(), s.sector_type.clone())))
                .map(|s| SectorWithType {
                    name: s.name.clone(),
                    sector_type: s.sector_type.clone(),
                })
                .collect())
        }
        None => Ok(vec![]),
    }
}

#[tauri::command]
async fn get_history(
    name: String,
    state: State<'_, CollectorState>,
) -> Result<Vec<SeriesPoint>, String> {
    let history = state.history.lock().await;
    Ok(eastmoney::compute_series(&history, &name, "net"))
}

#[tauri::command]
async fn get_all_history(
    state: State<'_, CollectorState>,
) -> Result<HashMap<String, Vec<SeriesPoint>>, String> {
    let history = state.history.lock().await;
    Ok(eastmoney::all_series(&history, "net"))
}

#[tauri::command]
fn get_hot_sectors() -> Vec<String> {
    vec![
        "半导体".into(), "AI应用".into(), "CPO概念".into(),
        "有色金属".into(), "锂矿概念".into(), "商业航天".into(),
        "电池".into(), "机器人".into(), "创新药".into(),
        "白酒".into(), "消费电子".into(), "银行".into(),
        "人工智能".into(), "云计算".into(), "低空经济".into(),
        "电网设备".into(), "通信设备".into(), "传媒".into(),
        "国产芯片".into(), "元件".into(), "通信服务".into(),
    ]
}

#[tauri::command]
async fn start_collection(
    app: AppHandle,
    state: State<'_, CollectorState>,
) -> Result<(), String> {
    if state.running.load(Ordering::SeqCst) {
        return Ok(());
    }
    collector::start_collector(app);
    Ok(())
}

#[tauri::command]
async fn stop_collection(
    state: State<'_, CollectorState>,
) -> Result<(), String> {
    state.running.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
async fn get_initial_data(
    app: AppHandle,
    snapshots: State<'_, collector::SnapshotsState>,
    state: State<'_, CollectorState>,
) -> Result<InitialData, String> {
    let cfg = config::load_config(&app);
    let status = {
        let last_at = *state.last_at.lock().await;
        let last_error = state.last_error.lock().await.clone();
        let state_str = if state.running.load(Ordering::SeqCst) {
        if last_error.is_some() { "error" } else { "running" }
        } else {
            "stopped"
        };
        CollectorStatus {
            state: state_str.into(),
            interval_sec: cfg.interval_sec,
            last_at,
            last_error,
        }
    };
    let snapshot = {
        let guard = snapshots.0.lock().await;
        guard.clone()
    };
    let sectors_with_type = {
        let guard = snapshots.0.lock().await;
        match guard.as_ref() {
            Some(snap) => {
                let mut seen = std::collections::HashSet::new();
                snap.sectors.iter()
                    .filter(|s| seen.insert((s.name.clone(), s.sector_type.clone())))
                    .map(|s| SectorWithType {
                        name: s.name.clone(),
                        sector_type: s.sector_type.clone(),
                    })
                    .collect()
            }
            None => vec![],
        }
    };
    let hot_sectors = get_hot_sectors();
    Ok(InitialData {
        config: cfg,
        status,
        snapshot,
        hot_sectors,
        sectors_with_type,
    })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct InitialData {
    pub config: TickConfig,
    pub status: CollectorStatus,
    pub snapshot: Option<TickSnapshot>,
    pub hot_sectors: Vec<String>,
    pub sectors_with_type: Vec<SectorWithType>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .manage(CollectorState::new())
        .manage(collector::SnapshotsState::default())
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_config,
            get_collector_status,
            get_latest_snapshot,
            list_sectors,
            list_all_sectors,
            list_all_sectors_with_type,
            get_history,
            get_all_history,
            get_hot_sectors,
            start_collection,
            stop_collection,
            get_initial_data,
        ])
        .setup(|_app| {
            log::info!("app started");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state: State<'_, CollectorState> = window.state();
                state.running.store(false, Ordering::SeqCst);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
