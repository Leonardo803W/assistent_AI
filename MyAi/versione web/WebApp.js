
/*
WebApp.js

Gestione dell'applicazione Web.

Responsabilità:
- Inizializzare l'applicazione Web.
- Comunicare con Ollama attraverso fetch().
- Validare i messaggi prima di inviarli.
- Restituire la risposta generata dall'intelligenza artificiale.

Non gestisce direttamente il salvataggio delle conversazioni.
*/

// Indirizzo dell'API locale di Ollama.
const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";

// Modello utilizzato.
const MODEL = "llama3.2:latest";

export class WebApp {

    constructor() {
        this.type = "web";
        this.initialized = false;
    }

    // Inizializzazione dell'applicazione.
    async initialize() {

        //console.log("WebApp inizializzata");

        this.initialized = true;

        return {
            type: this.type
        };
    }

    // Comunicazione con Ollama.
    async chatWithAI(messages) {

        if (!this.initialized) {
            throw new Error("Applicazione non inizializzata.");
        }

        const safeMessages = this.validateChatMessages(messages);

        const response = await fetch(OLLAMA_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                model: MODEL,
                messages: safeMessages,
                stream: false
            }),

            signal: AbortSignal.timeout(120000)
        });

        if (!response.ok) {
            throw new Error(
                `Errore Ollama HTTP ${response.status}.`
            );
        }

        const data = await response.json();

        if (typeof data.message?.content !== "string") {
            throw new Error("Risposta Ollama non valida.");
        }

        return data.message.content;
    }

    // Validazione dei messaggi prima dell'invio.
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
                throw new Error("Messaggio non valido.");
            }

            return {
                role: message.role,
                content: message.content
            };
        });
    }
}
