use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Manager;

use crate::models::TickConfig;

pub fn config_path(app: &AppHandle) -> PathBuf {
    let dir = app.path().app_config_dir().expect("failed to get config dir");
    let _ = fs::create_dir_all(&dir);
    dir.join("tick-config.json")
}

pub fn load_config(app: &AppHandle) -> TickConfig {
    let path = config_path(app);
    if !path.exists() {
        let cfg = TickConfig::default();
        let _ = save_config(app, &cfg);
        return cfg;
    }
    match fs::read_to_string(&path) {
        Ok(content) => {
            let mut cfg: TickConfig = serde_json::from_str(&content).unwrap_or_default();
            if cfg.selected_sectors.is_empty() {
                cfg.selected_sectors = TickConfig::default().selected_sectors;
            }
            cfg
        }
        Err(_) => TickConfig::default(),
    }
}

pub fn save_config(app: &AppHandle, cfg: &TickConfig) -> Result<(), String> {
    let path = config_path(app);
    let content = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Window state persistence ──────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub maximized: bool,
}

fn window_state_path(app: &AppHandle) -> PathBuf {
    let dir = app.path().app_config_dir().expect("failed to get config dir");
    let _ = fs::create_dir_all(&dir);
    dir.join("window-state.json")
}

pub fn load_window_state(app: &AppHandle) -> Option<WindowState> {
    let path = window_state_path(app);
    if !path.exists() {
        return None;
    }
    fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok())
}

pub fn save_window_state(app: &AppHandle, ws: &WindowState) -> Result<(), String> {
    let path = window_state_path(app);
    let content = serde_json::to_string_pretty(ws).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}
