// const { contextBridge, ipcRenderer } = require("electron");

// contextBridge.exposeInMainWorld("electronAPI", {
//   showDialogMessage: (type, title, message) =>
//     ipcRenderer.send("show-dialog", { type, title, message }),
// });

// const { contextBridge, ipcRenderer } = require("electron");

// contextBridge.exposeInMainWorld("electronAPI", {
//   showDialogMessage: (message) =>
//     ipcRenderer.invoke("show-dialog-message", message),
// });


const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  showDialogMessage: (message) => ipcRenderer.invoke("show-dialog", message),
});



