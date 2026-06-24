use std::fs;
use std::path::PathBuf;

use tauri::AppHandle;
use tauri::Manager;

use crate::eastmoney;
use crate::models::{SectorType, SectorWithType};

fn csv_path(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_config_dir()
        .expect("failed to get config dir");
    let _ = fs::create_dir_all(&dir);
    dir.join("sectors.csv")
}

fn deserialize_type(s: &str) -> SectorType {
    match s.trim() {
        "concept" => SectorType::Concept,
        "region" => SectorType::Region,
        _ => SectorType::Industry,
    }
}

pub fn load(app: &AppHandle) -> Vec<SectorWithType> {
    let path = csv_path(app);
    if !path.exists() {
        return vec![];
    }
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(e) => {
            log::warn!("sector_store::load read fail: {}", e);
            return vec![];
        }
    };
    let mut records = Vec::new();
    let mut first = true;
    for line in content.lines() {
        if first {
            first = false;
            continue;
        }
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 3 {
            let name = parts[0].trim().to_string();
            let sector_type_str = parts[2].trim();
            if !name.is_empty() {
                records.push(SectorWithType {
                    name,
                    sector_type: deserialize_type(sector_type_str),
                });
            }
        }
    }
    log::info!("sector_store::load: {} records loaded", records.len());
    records
}

pub fn save(app: &AppHandle, records: &[SectorWithType]) -> Result<(), String> {
    let path = csv_path(app);
    let mut content = String::from("name,code,sector_type\n");
    for r in records {
        let type_str = match r.sector_type {
            SectorType::Industry => "industry",
            SectorType::Concept => "concept",
            SectorType::Region => "region",
        };
        content.push_str(&format!("{},,{}\n", r.name, type_str));
    }
    fs::write(&path, content).map_err(|e| format!("write sectors.csv: {}", e))?;
    log::info!("sector_store::save: {} records written", records.len());
    Ok(())
}

pub async fn refresh(app: &AppHandle) -> Vec<SectorWithType> {
    let mut all = Vec::new();
    for st in SectorType::all() {
        let mut attempts = 0;
        let result = loop {
            match eastmoney::fetch_sectors(&st).await {
                Ok(sectors) => break Ok(sectors),
                Err(e) => {
                    attempts += 1;
                    if attempts >= 3 {
                        break Err(e);
                    }
                    log::info!("sector_store::refresh {:?} attempt {} failed, retrying...", st, attempts);
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                }
            }
        };
        match result {
            Ok(sectors) => {
                for s in sectors {
                    all.push(SectorWithType {
                        name: s.name,
                        sector_type: st.clone(),
                    });
                }
            }
            Err(e) => log::warn!("sector_store::refresh {:?} fail after 3 attempts: {}", st, e),
        }
    }
    if !all.is_empty() {
        let _ = save(app, &all);
    }
    log::info!(
        "sector_store::refresh: {} records ({} from API)",
        all.len(),
        if all.is_empty() { "FAILED" } else { "OK" }
    );
    all
}
