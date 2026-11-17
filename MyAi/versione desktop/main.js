/*
main.js
Logica principale:

Variabili globali e configurazioni condivise.
Funzioni per gestire le conversazioni.
Funzioni per comunicare con Ollama.
*/


/*
require() importa funzionalità da un modulo. In questo caso, importa strumenti messi a disposizione da Electron.

app: gestisce il ciclo di vita dell'applicazione.
*/
const { app } = require("electron");

const path = require("node:path"); //Serve a lavorare con i percorsi dei file in modo compatibile con il sistema operativo.
const fs = require("node:fs/promises"); //È il modulo per interagire con il file system tramite operazioni asincrone basate su Promise.

// Importa i moduli separati.
const { DesktopApp } = require("./DesktopApp");
const { registerIpcHandlers } = require("./ipc-handlers");

// OLLAMA_URL e MODEL: indirizzo dell’API locale e modello usato.
const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODEL = "llama3.2:latest";

// contenitore funzioni per file e cartelle
const fileUtils = {

  //Questa funzione legge l'archivio delle conversazioni e restituisce un array JavaScript che rappresenta le chat salvate.
  async readConversations() {
    try {
      const raw = await fs.readFile(CONVERSATIONS_FILE, "utf8");
      const data = JSON.parse(raw);

      console.log(data);

      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }

    /*
    fs.readFile(...) legge il contenuto del file.
    CONVERSATIONS_FILE indica quale file leggere.
    "utf8" specifica che il contenuto deve essere interpretato come testo.
    await attende il completamento della lettura.
    La variabile raw contiene una stringa, non ancora un oggetto JavaScript.
    JSON.parse() converte la stringa JSON in dati JavaScript.
    ENOENT è un codice di errore del sistema operativo che, in questo contesto, indica normalmente che il file non esiste.
    */
  },

  //Questa funzione prende un array di conversazioni e lo salva sul disco in formato JSON.
  async writeConversations(conversations) {
    const directory = path.dirname(CONVERSATIONS_FILE);
    await fs.mkdir(directory, { recursive: true });

    const tempPath = `${CONVERSATIONS_FILE}.tmp`;

    await fs.writeFile(
      tempPath,
      JSON.stringify(conversations, null, 2),
      "utf8"
    );

    await fs.rename(tempPath, CONVERSATIONS_FILE);

    /*
    path.dirname() estrae la cartella che contiene il file.
    fs.mkdir() crea la cartella, se necessario.
    L'opzione { recursive: true } permette di creare anche le eventuali cartelle intermedie e non genera un errore semplicemente perché la cartella esiste già.
    Il percorso temporaneo viene costruito aggiungendo .tmp al percorso dell'archivio.
    */
  }
}

//Questa istruzione costruisce il percorso del file che conterrà la cronologia delle chat di MyAI.
const CONVERSATIONS_FILE = path.join(
  app.getPath("userData"),
  "conversations.json"

  /*
  CONVERSATIONS_FILE: è il nome scelto per identificare il percorso dell'archivio.
  app.getPath("userData"): restituisce la cartella dati specifica dell'applicazione sul computer dell'utente.
  "conversations.json": è il nome del file nel quale verranno memorizzate le conversazioni.
  path.join(...): combina i due elementi creando un percorso valido per il sistema operativo.
  */
);

console.log(CONVERSATIONS_FILE);

/*
Questa sezione contiene la logica applicativa richiamata dai canali IPC.

I metodi vengono raccolti nell'oggetto services, così ipc-handlers.js
può richiamarli senza dover conoscere la loro implementazione.
*/
const services = {

  // Comunicazione con Ollama.
  async chatWithAI(messages) {
    const safeMessages = services.validateChatMessages(messages);

    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: safeMessages,
        stream: false
      }),
      signal: AbortSignal.timeout(120000)
    });

    if (!response.ok) {
      throw new Error(`Errore Ollama HTTP ${response.status}.`);
    }

    const data = await response.json();

    if (typeof data.message?.content !== "string") {
      throw new Error("Risposta Ollama non valida.");
    }

    console.log(data);

    return data.message.content;
  },

  // Validazione dei messaggi ricevuti prima di inviarli a Ollama.
  validateChatMessages(messages) {

    if (!Array.isArray(messages) || messages.length > 41) {
      throw new Error("Cronologia non valida.");
    }

    const MAX_CHAT_MESSAGE_SIZE = 20000;

    return messages.map(message => {
      if (
        !message ||
        !["system", "user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        message.content.length > MAX_CHAT_MESSAGE_SIZE
      ) {
        throw new Error(
          "Messaggio non valido: formato errato oppure contenuto troppo grande."
        );
      }

      return {
        role: message.role,
        content: message.content
      };
    });
  },

  // Elenco delle conversazioni.
  async listConversations() {
    const conversations = await fileUtils.readConversations();

    console.log(conversations);

    return conversations
      .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } ,

  // Caricamento di una conversazione.
  async loadConversation(id) {

    if (typeof id !== "string") {
      throw new Error("ID conversazione non valido.");
    }

    const conversations = await fileUtils.readConversations();
    const conversation = conversations.find(item => item.id === id);

    console.log(conversation)

    if (!conversation) {
      throw new Error("Conversazione non trovata.");
    }

    return conversation;
  },

  // Salvataggio di una conversazione.
  async saveConversation(conversation) {
    if (
      !conversation ||
      typeof conversation.id !== "string" ||
      typeof conversation.title !== "string" ||
      !Array.isArray(conversation.messages) ||
      conversation.messages.length > 500
    ) {
      throw new Error("Dati della conversazione non validi.");
    }

    const messages = conversation.messages.map(message => {
      if (
        !message ||
        !["user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        message.content.length > 100000
      ) {
        throw new Error("Messaggio non valido.");
      }

    console.log(messages);

      return {
        role: message.role,
        content: message.content
      };
    });

    const conversations = await fileUtils.readConversations();
    const existing = conversations.findIndex(
      item => item.id === conversation.id
    );

    console.log(conversation);

    const record = {
      id: conversation.id,
      title: conversation.title.slice(0, 100),
      updatedAt: Date.now(),
      messages
    };

    if (existing >= 0) {
      conversations[existing] = record;
    } else {
      conversations.push(record);
    }

    console.log(conversation);

    await fileUtils.writeConversations(conversations);

    return {
      id: record.id,
      title: record.title,
      updatedAt: record.updatedAt
    };
  },
};

// Avvio e ciclo di vita dell'applicazione.
app.whenReady().then(async () => {

    registerIpcHandlers(services);

    const desktop = new DesktopApp();

    await desktop.initialize();

});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
