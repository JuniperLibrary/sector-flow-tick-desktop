const {fetchSectors} = require('./eastmoney.cjs');

class TickCollector {
  constructor({getConfig, setConfig, onSnapshot, onStatus}) {
    this._getConfig = getConfig;
    this._setConfig = setConfig;
    this._onSnapshot = onSnapshot;
    this._onStatus = onStatus;
    this._timer = null;
    this._lastAt = undefined;
    this._lastError = undefined;
    this._latestSnapshot = null;
    this._history = new Map();
  }

  getLatestSnapshot() {
    return this._latestSnapshot;
  }

  getHistory(name) {
    return this._history.get(name) ?? [];
  }

  /** 返回完整 history（用于前端初始化时恢复） */
  getAllHistory() {
    const obj = {};
    for (const [name, points] of this._history) {
      obj[name] = points;
    }
    return obj;
  }

  getStatus() {
    if (!this._timer) return {state: 'idle'};
    const cfg = this._getConfig();
    return {state: 'running', intervalSec: cfg.intervalSec, lastAt: this._lastAt, lastError: this._lastError};
  }

  async start() {
    if (this._timer) return;
    const cfg = this._getConfig();
    this._timer = setInterval(() => {
      this.collectOnce().catch((err) => console.error('[collector] interval collectOnce failed:', err));
    }, Math.max(1, cfg.intervalSec) * 1000);
    await this.collectOnce();
    this._onStatus(this.getStatus());
  }

  stop() {
    if (!this._timer) return;
    clearInterval(this._timer);
    this._timer = null;
    this._onStatus(this.getStatus());
  }

  async collectOnce() {
    const cfg = this._getConfig();
    const at = Date.now();
    try {
      // 采集所有 3 种板块类型，构建名称 → 数据索引
      const sectorByName = new Map();
      for (const t of ['industry', 'concept', 'region']) {
        const sectors = await fetchSectors(t);
        for (const s of sectors) {
          sectorByName.set(s.name, s);
        }
      }

      // 只采集 API 返回了的已选板块（未返回的跳过，但不动 config）
      const selected = (cfg.selectedSectors ?? []).filter((n) => sectorByName.has(n));

      const sectors = selected
        .map((name) => ({...sectorByName.get(name), at}))
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

      const snap = {at, sectors};
      this._latestSnapshot = snap;
      this._lastAt = at;
      this._lastError = undefined;

      for (const s of sectors) {
        const series = this._history.get(s.name) ?? [];
        series.push({t: at, v: s.net});
        if (series.length > 240) series.splice(0, series.length - 240);
        this._history.set(s.name, series);
      }

      this._onSnapshot(snap);
      this._onStatus(this.getStatus());

      return snap;
    } catch (e) {
      this._lastError = e && typeof e.message === 'string' ? e.message : String(e);
      this._onStatus(this.getStatus());
      throw e;
    }
  }

  /** 配置变更通知：选区/板块类型变化时立即采集，idle 时自动开始 */
  notifyConfigChanged() {
    const status = this.getStatus();
    if (status.state === 'running') {
      this._onStatus(status);
      this.collectOnce().catch((err) => console.error('[collector] notifyConfigChanged collectOnce failed:', err));
      return;
    }
    const cfg = this._getConfig();
    if (cfg.selectedSectors.length > 0) {
        this.start().catch((err) => console.error('[collector] restart (no timer) start failed:', err));
    } else {
      this._onStatus(status);
    }
  }

  /** 重启采集器（用于 intervalSec 变化时强制刷新定时器） */
  restart() {
    if (!this._timer) {
      const cfg = this._getConfig();
      if (cfg.selectedSectors.length > 0) {
        this.start().catch((err) => console.error('[collector] restart (no timer) start failed:', err));
      }
      return;
    }
    clearInterval(this._timer);
    this._timer = null;
    this.start().catch((err) => console.error('[collector] restart (with timer) start failed:', err));
  }
}

module.exports = {TickCollector};
