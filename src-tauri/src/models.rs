use serde::{Deserialize, Serialize};

const YUAN_PER_YI: f64 = 100_000_000.0;

fn yuan_to_yi(v: f64) -> f64 {
    v / YUAN_PER_YI
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum SectorType {
    Industry,
    Concept,
    Region,
}

impl SectorType {
    pub fn as_fs_param(&self) -> &'static str {
        match self {
            SectorType::Industry => "m:90+t:2",
            SectorType::Concept => "m:90+t:3",
            SectorType::Region => "m:90+t:1",
        }
    }

    pub fn all() -> Vec<SectorType> {
        vec![
            SectorType::Industry,
            SectorType::Concept,
            SectorType::Region,
        ]
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TickConfig {
    #[serde(default = "default_interval", rename = "intervalSec")]
    pub interval_sec: u64,
    #[serde(default = "default_sector_type", rename = "sectorType")]
    pub sector_type: SectorType,
    #[serde(default = "default_selected", rename = "selectedSectors")]
    pub selected_sectors: Vec<String>,
    #[serde(default, rename = "alertEnabled")]
    pub alert_enabled: bool,
    #[serde(default = "default_alert_threshold", rename = "alertThreshold")]
    pub alert_threshold: f64,
}

fn default_interval() -> u64 {
    60
}
fn default_sector_type() -> SectorType {
    SectorType::Industry
}
fn default_alert_threshold() -> f64 {
    2.0
}
fn default_selected() -> Vec<String> {
    vec![
        "半导体".into(),
        "AI应用".into(),
        "CPO概念".into(),
        "有色金属".into(),
        "锂矿概念".into(),
        "商业航天".into(),
        "电池".into(),
        "机器人".into(),
        "创新药".into(),
        "白酒".into(),
        "消费电子".into(),
        "银行".into(),
        "人工智能".into(),
        "云计算".into(),
        "低空经济".into(),
        "电网设备".into(),
        "通信设备".into(),
        "传媒".into(),
        "国产芯片".into(),
        "元件".into(),
        "通信服务".into(),
    ]
}

impl Default for TickConfig {
    fn default() -> Self {
        Self {
            interval_sec: default_interval(),
            sector_type: default_sector_type(),
            selected_sectors: default_selected(),
            alert_enabled: false,
            alert_threshold: default_alert_threshold(),
        }
    }
}

fn deserialize_i64_flexible<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum I64OrString {
        I64(i64),
        S(String),
    }
    match I64OrString::deserialize(deserializer)? {
        I64OrString::I64(v) => Ok(v),
        I64OrString::S(s) => Ok(s.parse::<i64>().unwrap_or(0)),
    }
}

fn deserialize_f64_flexible<'de, D>(deserializer: D) -> Result<f64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum F64OrString {
        F64(f64),
        S(String),
    }
    match F64OrString::deserialize(deserializer)? {
        F64OrString::F64(v) => Ok(v),
        F64OrString::S(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() || trimmed == "-" {
                Ok(0.0)
            } else {
                Ok(s.parse::<f64>().unwrap_or(0.0))
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EastmoneySector {
    #[serde(rename = "f14")]
    pub name: String,
    #[serde(rename = "f12")]
    pub code: String,
    #[serde(rename = "f3", deserialize_with = "deserialize_f64_flexible")]
    pub change_pct: f64,
    #[serde(rename = "f8", deserialize_with = "deserialize_f64_flexible")]
    pub turnover_rate: f64,
    #[serde(rename = "f10", deserialize_with = "deserialize_f64_flexible")]
    pub volume_ratio: f64,
    #[serde(rename = "f22", deserialize_with = "deserialize_f64_flexible")]
    pub speed: f64,
    #[serde(rename = "f24", deserialize_with = "deserialize_f64_flexible")]
    pub change_60d: f64,
    #[serde(rename = "f25", deserialize_with = "deserialize_f64_flexible")]
    pub change_ytd: f64,
    #[serde(rename = "f6", deserialize_with = "deserialize_f64_flexible")]
    pub turnover: f64,
    #[serde(rename = "f62", deserialize_with = "deserialize_f64_flexible")]
    pub net: f64,
    #[serde(rename = "f184", deserialize_with = "deserialize_f64_flexible")]
    pub main_rate: f64,
    #[serde(rename = "f66", deserialize_with = "deserialize_f64_flexible")]
    pub super_net: f64,
    #[serde(rename = "f72", deserialize_with = "deserialize_f64_flexible")]
    pub big_net: f64,
    #[serde(rename = "f78", deserialize_with = "deserialize_f64_flexible")]
    pub mid_net: f64,
    #[serde(rename = "f84", deserialize_with = "deserialize_f64_flexible")]
    pub small_net: f64,
    #[serde(rename = "f263", deserialize_with = "deserialize_f64_flexible")]
    pub net_5d: f64,
    #[serde(rename = "f264", deserialize_with = "deserialize_f64_flexible")]
    pub net_10d: f64,
    #[serde(rename = "f104", deserialize_with = "deserialize_i64_flexible")]
    pub up_count: i64,
    #[serde(rename = "f105", deserialize_with = "deserialize_i64_flexible")]
    pub down_count: i64,
    #[serde(rename = "f128")]
    pub leader_name: String,
    #[serde(rename = "f136", deserialize_with = "deserialize_f64_flexible")]
    pub leader_change_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SectorSnapshot {
    pub at: i64,
    pub name: String,
    #[serde(rename = "bkCode")]
    pub code: String,
    #[serde(rename = "sectorType")]
    pub sector_type: SectorType,
    pub net: f64,
    #[serde(rename = "changePct")]
    pub change_pct: f64,
    #[serde(rename = "turnoverRate")]
    pub turnover_rate: f64,
    #[serde(rename = "volumeRatio")]
    pub volume_ratio: f64,
    pub speed: f64,
    #[serde(rename = "change60d")]
    pub change_60d: f64,
    #[serde(rename = "changeYtd")]
    pub change_ytd: f64,
    pub turnover: f64,
    #[serde(rename = "rate")]
    pub main_rate: f64,
    #[serde(rename = "superNet")]
    pub super_net: f64,
    #[serde(rename = "bigNet")]
    pub big_net: f64,
    #[serde(rename = "midNet")]
    pub mid_net: f64,
    #[serde(rename = "smallNet")]
    pub small_net: f64,
    #[serde(rename = "net5d")]
    pub net_5d: f64,
    #[serde(rename = "net10d")]
    pub net_10d: f64,
    #[serde(rename = "upCount")]
    pub up_count: i64,
    #[serde(rename = "downCount")]
    pub down_count: i64,
    #[serde(rename = "leaderStock")]
    pub leader_name: String,
    #[serde(rename = "leaderChangePct")]
    pub leader_change_pct: f64,
}

impl From<(&EastmoneySector, SectorType, i64)> for SectorSnapshot {
    fn from((r, st, at): (&EastmoneySector, SectorType, i64)) -> Self {
        Self {
            at,
            name: r.name.clone(),
            code: r.code.clone(),
            sector_type: st,
            net: yuan_to_yi(r.net),
            change_pct: r.change_pct,
            turnover_rate: r.turnover_rate,
            volume_ratio: r.volume_ratio,
            speed: r.speed,
            change_60d: r.change_60d,
            change_ytd: r.change_ytd,
            turnover: yuan_to_yi(r.turnover),
            main_rate: r.main_rate,
            super_net: yuan_to_yi(r.super_net),
            big_net: yuan_to_yi(r.big_net),
            mid_net: yuan_to_yi(r.mid_net),
            small_net: yuan_to_yi(r.small_net),
            net_5d: yuan_to_yi(r.net_5d),
            net_10d: yuan_to_yi(r.net_10d),
            up_count: r.up_count,
            down_count: r.down_count,
            leader_name: r.leader_name.clone(),
            leader_change_pct: r.leader_change_pct,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickSnapshot {
    pub at: i64,
    pub sectors: Vec<SectorSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeriesPoint {
    pub t: i64,
    pub v: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectorStatus {
    pub state: String,
    #[serde(rename = "intervalSec")]
    pub interval_sec: u64,
    #[serde(rename = "lastAt")]
    pub last_at: Option<i64>,
    #[serde(rename = "lastError")]
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SectorWithType {
    pub name: String,
    #[serde(rename = "sectorType")]
    pub sector_type: SectorType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertEvent {
    #[serde(rename = "sectorName")]
    pub sector_name: String,
    #[serde(rename = "sectorType")]
    pub sector_type: SectorType,
    pub delta: f64,
    pub net: f64,
    #[serde(rename = "prevNet")]
    pub prev_net: f64,
    pub at: i64,
}
