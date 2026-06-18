const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');

const {fetchSectors} = require('./eastmoney.cjs');
const {TickCollector} = require('./collector.cjs');
const {readConfig, writeConfig} = require('./config.cjs');

let mainWindow = null;
let cachedSectorNamesByType = new Map();
let cachedSectorTypeMap = new Map();
let config = null;

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

const collector = new TickCollector({
  getConfig: () => config,
  setConfig: (next) => {
    config = writeConfig(next);
    sendToRenderer('tick:config', config);
  },
  onSnapshot: (snap) => {
    sendToRenderer('tick:snapshot', snap);
  },
  onStatus: (status) => sendToRenderer('tick:status', status),
});

async function ensureSectorNames(sectorType) {
  const key = sectorType === 'concept' || sectorType === 'region' ? sectorType : 'industry';
  const cached = cachedSectorNamesByType.get(key);
  if (cached) return cached;
  const sectors = await fetchSectors(key);
  const names = sectors.map((s) => s.name).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  cachedSectorNamesByType.set(key, names);
  for (const s of sectors) {
    if (!cachedSectorTypeMap.has(s.name)) {
      cachedSectorTypeMap.set(s.name, s.sectorType);
    }
  }
  return names;
}

async function ensureAllSectorNames() {
  const types = ['industry', 'concept', 'region'];
  const allNames = new Set();
  for (const t of types) {
    try {
      const names = await ensureSectorNames(t);
      for (const n of names) allNames.add(n);
    } catch (e) {
      // 单个分类失败不影响其他分类
    }
  }
  return Array.from(allNames).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({mode: 'detach'});
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  config = readConfig();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('tick:listAllSectors', async () => {
  return ensureAllSectorNames();
});

ipcMain.handle('tick:listAllSectorsWithType', async () => {
  const types = ['industry', 'concept', 'region'];
  for (const t of types) {
    try { await ensureSectorNames(t); } catch {}
  }
  return Array.from(cachedSectorTypeMap.entries()).map(([name, sectorType]) => ({name, sectorType}));
});

ipcMain.handle('tick:listSectors', async (_evt, sectorType) => {
  return ensureSectorNames(sectorType);
});

ipcMain.handle('tick:getConfig', async () => {
  return config;
});

ipcMain.handle('tick:setConfig', async (_evt, next) => {
  const prev = config;
  config = writeConfig(next || {});
  sendToRenderer('tick:config', config);
  cachedSectorNamesByType = new Map();
  cachedSectorTypeMap = new Map();
  const intervalChanged = prev && prev.intervalSec !== config.intervalSec;
  if (intervalChanged) {
    collector.restart();
  } else {
    collector.notifyConfigChanged();
  }
});

ipcMain.handle('tick:getStatus', async () => {
  return collector.getStatus();
});

ipcMain.handle('tick:start', async () => {
  await ensureAllSectorNames();
  await collector.start();
});

ipcMain.handle('tick:stop', async () => {
  collector.stop();
});

ipcMain.handle('tick:getLatestSnapshot', async () => {
  return collector.getLatestSnapshot();
});

ipcMain.handle('tick:getHistory', async (_evt, name) => {
  if (typeof name !== 'string') return [];
  return collector.getHistory(name);
});

ipcMain.handle('tick:getAllHistory', async () => {
  return collector.getAllHistory();
});

ipcMain.handle('tick:getHotSectors', async () => {
  return require('./defaults.cjs').HOT_SECTORS;
});
