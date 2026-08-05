const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (options, dataUrl) => ipcRenderer.invoke('save-file', options, dataUrl),
});
