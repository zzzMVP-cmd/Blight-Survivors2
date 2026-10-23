'use strict';

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    resizable: true,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a12',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 去掉默认菜单栏，让窗口像原生游戏
  Menu.setApplicationMenu(null);

  // 加载游戏文件（相对本文件向上取 index.html）
  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});