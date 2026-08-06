const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0d1117',
      symbolColor: '#c9d1d9',
    },
    backgroundColor: '#0d1117'
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Предотвращаем загрузку файлов в браузере при перетаскивании
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  if (app.isPackaged) {
    autoUpdater.on('update-available', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Обновление',
        message: 'Найдена новая версия! Скачиваем обновление в фоне...',
        buttons: ['ОК']
      });
    });

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({
        type: 'question',
        title: 'Обновление готово',
        message: 'Новая версия успешно скачана. Перезапустить программу для установки прямо сейчас?',
        buttons: ['Перезапустить', 'Позже']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    autoUpdater.checkForUpdates();
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler to save files
ipcMain.handle('save-file', async (event, options, dataUrl) => {
  const { canceled, filePath } = await dialog.showSaveDialog(options);
  if (canceled) return { success: false, error: 'User canceled' };

  try {
    // dataUrl is something like 'data:image/png;base64,...'
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid input string');
    }
    const buffer = Buffer.from(matches[2], 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  } catch (error) {
    console.error('Failed to save file:', error);
    return { success: false, error: error.message };
  }
});
