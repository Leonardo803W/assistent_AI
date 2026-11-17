/*
preload.js
Ponte di comunicazione:

Espone al renderer soltanto le funzionalità autorizzate
dell'applicazione attraverso contextBridge.
*/

console.log("[PRELOAD] Inizio caricamento");

const { contextBridge, ipcRenderer } = require("electron");

console.log("[PRELOAD] Moduli Electron importati");

contextBridge.exposeInMainWorld("myAI", {

  environment: "desktop",

});

console.log("[PRELOAD] API myAI esposta");
