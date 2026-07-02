const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("seatwise", {
  platform: process.platform
});
