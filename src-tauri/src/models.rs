use serde::{Deserialize, Serialize};

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
        vec![SectorType::Industry, SectorType::Concept, SectorType::Region]
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
}

fn default_interval() -> u64 { 60 }
fn default_sector_type() -> SectorType { SectorType::Industry }
fn default_selected() -> Vec<String> {
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

impl Default for TickConfig {
    fn default() -> Self {
        Self {
            interval_sec: default_interval(),
            sector_type: default_sector_type(),
            selected_sectors: default_selected(),
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EastmoneySector {
    #[serde(rename = "f14")]
    pub name: String,
    #[serde(rename = "f12")]
    pub code: String,
    #[serde(rename = "f3")]
    pub change_pct: f64,
    #[serde(rename = "f8")]
    pub turnover_rate: f64,
    #[serde(rename = "f10")]
    pub volume_ratio: f64,
    #[serde(rename = "f22")]
    pub speed: f64,
    #[serde(rename = "f24")]
    pub change_60d: f64,
    #[serde(rename = "f25")]
    pub change_ytd: f64,
    #[serde(rename = "f6")]
    pub turnover: f64,
    #[serde(rename = "f62")]
    pub net: f64,
    #[serde(rename = "f184")]
    pub main_rate: f64,
    #[serde(rename = "f66")]
    pub super_net: f64,
    #[serde(rename = "f72")]
    pub big_net: f64,
    #[serde(rename = "f78")]
    pub mid_net: f64,
    #[serde(rename = "f84")]
    pub small_net: f64,
    #[serde(rename = "f263")]
    pub net_5d: f64,
    #[serde(rename = "f264")]
    pub net_10d: f64,
    #[serde(rename = "f204", deserialize_with = "deserialize_i64_flexible")]
    pub up_count: i64,
    #[serde(rename = "f205", deserialize_with = "deserialize_i64_flexible")]
    pub down_count: i64,
    #[serde(rename = "f100")]
    pub leader_name: String,
    #[serde(rename = "f26")]
    pub leader_change_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SectorSnapshot {
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
    fn from((r, st, _at): (&EastmoneySector, SectorType, i64)) -> Self {
        Self {
            name: r.name.clone(),
            code: r.code.clone(),
            sector_type: st,
            net: r.net,
            change_pct: r.change_pct,
            turnover_rate: r.turnover_rate,
            volume_ratio: r.volume_ratio,
            speed: r.speed,
            change_60d: r.change_60d,
            change_ytd: r.change_ytd,
            turnover: r.turnover,
            main_rate: r.main_rate,
            super_net: r.super_net,
            big_net: r.big_net,
            mid_net: r.mid_net,
            small_net: r.small_net,
            net_5d: r.net_5d,
            net_10d: r.net_10d,
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
