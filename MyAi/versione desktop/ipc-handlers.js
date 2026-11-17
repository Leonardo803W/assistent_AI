/*
ipc-handlers.js
Porte di comunicazione:
Contiene esclusivamente le registrazioni ipcMain.handle().
Associa ogni canale IPC alla funzione che deve eseguire.
Non contiene direttamente la logica di lettura, salvataggio o gestione delle chat.
*/
const { ipcMain } = require("electron");

function registerIpcHandlers(services) {

  // Riceve l’oggetto services come parametro invece di importarlo: così questo file non deve conoscere l’implementazione (tecnica detta dependency injection, “iniezione delle dipendenze”).
  // ipcMain.handle("canale", (event, argomento) => ...) registra una risposta a un canale. Il primo parametro è sempre event (informazioni sul mittente), poi arrivano gli argomenti passati da invoke. Il valore restituito, anche una Promise, torna al renderer.
  // Convenzione dei nomi dominio:azione (files:read, conversations:save): tiene i canali ordinati.

  // Comunicazione con Ollama.
  // Solo ollama:chat verifica event.senderFrame !== event.sender.mainFrame.
  ipcMain.handle("ollama:chat", (event, messages) => {
    if (event.senderFrame !== event.sender.mainFrame) {
      throw new Error("Richiesta non autorizzata.");
    }

    return services.chatWithAI(messages);
  });

  // Gestione delle conversazioni.
  ipcMain.handle("conversations:list", () => {
    return services.listConversations();
  });

  ipcMain.handle("conversations:load", (event, id) => {
    return services.loadConversation(id);
  });

  ipcMain.handle("conversations:save", (event, conversation) => {
    return services.saveConversation(conversation);
  });
}

module.exports = {
  registerIpcHandlers
};
