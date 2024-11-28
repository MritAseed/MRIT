const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");

// شغل الخادم
require("./server");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "astaas/icon.ico"), // حدد مسار الأيقونة هنا
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  win.loadURL("http://localhost:3000");
}

// إعداد الحدث للتعامل مع عرض رسالة التنبيه
ipcMain.handle("show-dialog", async (event, message) => {
  const options = {
    type: "info",
    buttons: ["OK"],
    title: "تنبيه",
    message: message,
  };
  await dialog.showMessageBox(options);
});

app.on("ready", createWindow);
