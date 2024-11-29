const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { checkForUpdates } = require("./updater"); // استيراد التحديثات

// المتغيرات لتخزين النوافذ
let mainWindow;
let aboutWindow;

// شغل الخادم
require("./server");

// إنشاء نافذة التطبيق الرئيسية
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "astaas/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// إنشاء نافذة "حول البرنامج"
function createAboutWindow() {
  if (aboutWindow) {
    aboutWindow.focus(); // إذا كانت نافذة "حول البرنامج" مفتوحة، اجعلها في المقدمة
    return;
  }

  aboutWindow = new BrowserWindow({
    width: 600,
    height: 400,
    title: "حول البرنامج",
    icon: path.join(__dirname, "astaas/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  aboutWindow.loadURL("http://localhost:3000/about.html");

  aboutWindow.on("closed", () => {
    aboutWindow = null; // تنظيف عند إغلاق النافذة
  });
}

// إعداد الحدث للتعامل مع عرض نافذة "حول البرنامج"
ipcMain.handle("show-about", () => {
  createAboutWindow();
});

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

// إعداد الحدث لتشغيل التحقق من التحديثات
ipcMain.handle("check-updates", async () => {
  await checkForUpdates(); // استدعاء التحقق من التحديثات
});

// تشغيل التطبيق عند الجاهزية
app.on("ready", () => {
  createMainWindow(); // إنشاء نافذة التطبيق
});

// إغلاق التطبيق عند إغلاق جميع النوافذ
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
