use std::collections::HashMap;

use crate::models::{EastmoneySector, SectorSnapshot, SectorType, SeriesPoint};

const EASTMONEY_BASE: &str = "https://push2.eastmoney.com/api/qt/clist/get";

pub async fn fetch_sectors(sector_type: &SectorType) -> Result<Vec<EastmoneySector>, String> {
    let fs_param = sector_type.as_fs_param();
    let po_fields =
        "f2,f3,f6,f8,f10,f12,f14,f22,f24,f25,f62,f66,f72,f78,f84,f104,f105,f128,f136,f184,f263,f264";
    let url = format!(
        "{}?pn=1&pz=500&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&wbp2u=|&fid=f3&fs={}&fields={}",
        EASTMONEY_BASE, fs_param, po_fields
    );

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
        .danger_accept_invalid_certs(false)
        .connect_timeout(std::time::Duration::from_secs(10))
        .read_timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("build client fail: {}", e))?;

    let resp = client
        .get(&url)
        .header("Referer", "https://data.eastmoney.com/")
        .send()
        .await
        .map_err(|e| format!("request fail: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("parse json fail: {}", e))?;

    let data = body
        .get("data")
        .and_then(|d| d.get("diff"))
        .and_then(|d| d.as_array())
        .ok_or_else(|| format!("unexpected response"))?;

    let mut sectors: Vec<EastmoneySector> = Vec::with_capacity(data.len());
    for item in data {
        let name = item
            .get("f14")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if name.is_empty() {
            continue;
        }
        match serde_json::from_value::<EastmoneySector>(item.clone()) {
            Ok(s) => sectors.push(s),
            Err(e) => {
                log::warn!("skip sector {}: {}", name, e);
            }
        }
    }

    Ok(sectors)
}

pub fn compute_series(history: &[SectorSnapshot], name: &str, field: &str) -> Vec<SeriesPoint> {
    let snapshots: Vec<&SectorSnapshot> = history.iter().filter(|s| s.name == name).collect();
    if snapshots.is_empty() {
        return vec![];
    }
    let mut points: Vec<SeriesPoint> = Vec::with_capacity(snapshots.len());
    for snap in snapshots {
        let v = match field {
            "net" => snap.net,
            "change_pct" => snap.change_pct,
            "net_5d" => snap.net_5d,
            "net_10d" => snap.net_10d,
            "turnover" => snap.turnover,
            _ => 0.0,
        };
        points.push(SeriesPoint { t: snap.at, v });
    }
    points
}

pub fn all_series(history: &[SectorSnapshot], field: &str) -> HashMap<String, Vec<SeriesPoint>> {
    let mut names: Vec<String> = history.iter().map(|s| s.name.clone()).collect();
    names.sort();
    names.dedup();
    let mut map = HashMap::with_capacity(names.len());
    for name in names {
        map.insert(name.clone(), compute_series(history, &name, field));
    }
    map
}
