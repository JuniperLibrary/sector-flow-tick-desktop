use std::collections::HashMap;

use crate::models::{EastmoneySector, SectorSnapshot, SectorType, SeriesPoint};

const EASTMONEY_BASE: &str = "https://push2.eastmoney.com/api/qt/clist/get";
const PAGE_SIZE: usize = 100;

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
        .danger_accept_invalid_certs(false)
        .connect_timeout(std::time::Duration::from_secs(10))
        .read_timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("build client fail: {}", e))
}

fn sector_url(fs_param: &str, pn: usize) -> String {
    let po_fields =
        "f2,f3,f6,f8,f10,f12,f14,f22,f24,f25,f62,f66,f72,f78,f84,f100,f184,f204,f205,f26,f263,f264";
    format!(
        "{}?pn={}&pz={}&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&wbp2u=|&fid=f3&fs={}&fields={}",
        EASTMONEY_BASE, pn, PAGE_SIZE, fs_param, po_fields
    )
}

async fn fetch_page(client: &reqwest::Client, url: String) -> Result<serde_json::Value, String> {
    let resp = client
        .get(&url)
        .header("Referer", "https://data.eastmoney.com/")
        .send()
        .await
        .map_err(|e| format!("request fail: {}", e))?;
    resp.json()
        .await
        .map_err(|e| format!("parse json fail: {}", e))
}

fn parse_diff(body: &serde_json::Value) -> Result<Vec<serde_json::Value>, String> {
    body.get("data")
        .and_then(|d| d.get("diff"))
        .and_then(|d| d.as_array())
        .cloned()
        .ok_or_else(|| "unexpected response: no data.diff".into())
}

fn parse_sectors(items: &[serde_json::Value]) -> (Vec<EastmoneySector>, u32) {
    let mut sectors: Vec<EastmoneySector> = Vec::with_capacity(items.len());
    let mut skipped = 0u32;
    for item in items {
        let name = item
            .get("f14")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if name.is_empty() {
            skipped += 1;
            continue;
        }
        match serde_json::from_value::<EastmoneySector>(item.clone()) {
            Ok(s) => sectors.push(s),
            Err(e) => {
                skipped += 1;
                log::warn!("skip sector {}: {}", name, e);
            }
        }
    }
    (sectors, skipped)
}

pub async fn fetch_sectors(sector_type: &SectorType) -> Result<Vec<EastmoneySector>, String> {
    let client = build_client()?;
    let fs_param = sector_type.as_fs_param();

    let body = fetch_page(&client, sector_url(fs_param, 1)).await?;
    let total = body["data"]["total"].as_u64().unwrap_or(0) as usize;
    let all_items = parse_diff(&body)?;

    let mut all_items = if total > all_items.len() {
        let last_page = (total + PAGE_SIZE - 1) / PAGE_SIZE;
        let mut futures = Vec::with_capacity(last_page - 1);
        for pn in 2..=last_page {
            let url = sector_url(fs_param, pn);
            futures.push(fetch_page(&client, url));
        }
        let results = futures::future::join_all(futures).await;
        let mut combined = all_items;
        for result in results {
            match result {
                Ok(page_body) => {
                    if let Ok(mut items) = parse_diff(&page_body) {
                        combined.append(&mut items);
                    }
                }
                Err(e) => log::warn!("fetch_sectors page fetch fail: {}", e),
            }
        }
        combined
    } else {
        all_items
    };

    let mut seen = std::collections::HashSet::new();
    all_items.retain(|item| seen.insert(item["f12"].as_str().unwrap_or("").to_string()));

    let (sectors, skipped) = parse_sectors(&all_items);
    log::info!(
        "fetch_sectors({:?}): api_total={}, fetched={}, sectors={}, skipped={}",
        sector_type, total, all_items.len(), sectors.len(), skipped
    );

    // Debug: check for specific sectors that users report missing
    for target in ["创新药", "AI应用"] {
        let found = sectors.iter().any(|s| s.name == target);
        let raw_found = all_items.iter().any(|v| v.get("f14").and_then(|v| v.as_str()) == Some(target));
        let partial: Vec<String> = sectors.iter()
            .filter(|s| {
                s.name.contains(target.chars().take(2).collect::<String>().as_str())
                    || target.contains(&s.name.chars().take(2).collect::<String>())
            })
            .map(|s| s.name.clone())
            .collect();
        log::info!(
            "  sector \"{}\" in response: {} (raw: {})  partial matches: {:?}",
            target, found, raw_found, partial
        );
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
