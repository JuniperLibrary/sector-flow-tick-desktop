const fs = require('fs');
const path = require('path');
const {app} = require('electron');

const defaultSelected = [
  '半导体',
  'AI应用',
  'CPO概念',
  '有色金属',
  '锂矿概念',
  '商业航天',
  '电池',
  '机器人',
  '创新药',
  '白酒',
  '消费电子',
  '银行',
  '人工智能',
  '云计算',
  '低空经济',
  '电网设备',
  '通信设备',
  '传媒',
  '国产芯片',
  '元件',
  '通信服务',
];

const allowedIntervals = new Set([60, 180, 300]);

function normalizeIntervalSec(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 60;
  const rounded = Math.round(v);
  return allowedIntervals.has(rounded) ? rounded : 60;
}

function getConfigPath() {
  const dir = app.getPath('userData');
  return path.join(dir, 'tick-config.json');
}

function readConfig() {
  const p = getConfigPath();
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const cfg = JSON.parse(raw);
    const intervalSec = normalizeIntervalSec(cfg.intervalSec);
    const selectedSectors = Array.isArray(cfg.selectedSectors) ? cfg.selectedSectors.filter((x) => typeof x === 'string') : defaultSelected;
    const sectorType = cfg.sectorType === 'concept' || cfg.sectorType === 'region' ? cfg.sectorType : 'industry';
    return {intervalSec, selectedSectors, sectorType};
  } catch {
    return {intervalSec: 60, selectedSectors: defaultSelected, sectorType: 'industry'};
  }
}

function writeConfig(cfg) {
  const p = getConfigPath();
  const dir = path.dirname(p);
  fs.mkdirSync(dir, {recursive: true});
  const intervalSec = normalizeIntervalSec(cfg.intervalSec);
  const selectedSectors = Array.isArray(cfg.selectedSectors) ? cfg.selectedSectors.filter((x) => typeof x === 'string') : defaultSelected;
  const sectorType = cfg.sectorType === 'concept' || cfg.sectorType === 'region' ? cfg.sectorType : 'industry';
  const next = {intervalSec, selectedSectors, sectorType};
  fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

module.exports = {readConfig, writeConfig};
