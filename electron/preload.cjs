const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('tickApp', {
  listAllSectors: () => ipcRenderer.invoke('tick:listAllSectors'),
  listAllSectorsWithType: () => ipcRenderer.invoke('tick:listAllSectorsWithType'),
  listSectors: (type) => ipcRenderer.invoke('tick:listSectors', type),
  getConfig: () => ipcRenderer.invoke('tick:getConfig'),
  setConfig: (cfg) => ipcRenderer.invoke('tick:setConfig', cfg),
  getStatus: () => ipcRenderer.invoke('tick:getStatus'),
  start: () => ipcRenderer.invoke('tick:start'),
  stop: () => ipcRenderer.invoke('tick:stop'),
  getLatestSnapshot: () => ipcRenderer.invoke('tick:getLatestSnapshot'),
  getHistory: (name) => ipcRenderer.invoke('tick:getHistory', name),
  getAllHistory: () => ipcRenderer.invoke('tick:getAllHistory'),
  onSnapshot: (cb) => {
    const handler = (_evt, payload) => cb(payload);
    ipcRenderer.on('tick:snapshot', handler);
    return () => ipcRenderer.removeListener('tick:snapshot', handler);
  },
  onStatus: (cb) => {
    const handler = (_evt, payload) => cb(payload);
    ipcRenderer.on('tick:status', handler);
    return () => ipcRenderer.removeListener('tick:status', handler);
  },
  onConfig: (cb) => {
    const handler = (_evt, payload) => cb(payload);
    ipcRenderer.on('tick:config', handler);
    return () => ipcRenderer.removeListener('tick:config', handler);
  },
});

