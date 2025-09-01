const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  navigateTo: (url) => ipcRenderer.invoke('navigate-to', url)
});