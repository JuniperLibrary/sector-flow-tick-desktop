use std::fs;
use std::path::PathBuf;
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
            serde_json::from_str(&content).unwrap_or_default()
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
