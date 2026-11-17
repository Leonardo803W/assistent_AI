
/*
renderer.js

Gestione dell'interfaccia grafica.

Responsabilità:
- Gestire gli eventi dell'interfaccia.
- Visualizzare i messaggi.
- Gestire la cronologia della conversazione corrente.
- Coordinare WebApp e ConversationStorage.

Non contiene direttamente la logica di comunicazione con Ollama
né quella di archiviazione delle conversazioni.
*/

import { WebApp } from "./WebApp.js";
import {
    ConversationStorage,
    MADRE_AI
} from "./ConversationStorage.js";

// Elementi HTML.
const listAgents = document.getElementById("list_agents");
const conversation_list = document.getElementById("conversation_list");
const main = document.getElementById("main");
const recap = document.getElementById("recap");
const messagesElement = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const statusElement = document.getElementById("status");
const form = document.getElementById("chat-form");
const promptInput = document.getElementById("prompt");
const sendButton = document.getElementById("send");


// Inizializzazione delle classi.
const webApp = new WebApp();
const conversationStorage = new ConversationStorage();

// Stato della conversazione corrente.
let currentConversationId = MADRE_AI;
let currentAgentId = null;
let history = [];
let busy = false;

// Comportamento dell'intelligenza artificiale.
const systemInstruction =
    "Sei un assistente per aiutare l'utente a comprendere e scoprire nuove scoperte.\n" +
    "Non dare ragione di default all'utente, se sbaglia coreggilo, se ha ragione aiuta ad aprofondire.\n" +
    "Quando le informazioni sono certe dille in modo concreto, se non sono certe muoviti in maniera prudente.\n" +
    "Ma pi' di tutto si sempre dubbiosa, anche quando le cose sono certe, si comunque un minimo dubbiosa";

console.log("Ambiente: Web");

// Visualizzazione delle istruzioni dell'AI nelle impostazioni.
function behavior() {

    document.getElementById("settings_AI_p").textContent =
        systemInstruction;
}

// Oggetto che gestisce le operazioni sulle conversazioni.
const conversation = {

    // -----------------------------
    // Funzioni comuni per tutte le chat
    // -----------------------------

    // Salvataggio della cronologia corrente.
    async persistHistory(id) {

        try {

            if (currentConversationId === MADRE_AI) {

            const madre = conversationStorage.chatAIMadre();

            madre.messages = history;
            madre.updatedAt = Date.now();

            conversationStorage.writeMadre(madre);

            } else {

                const conversationData = {
                    id: currentConversationId,
                    title: "Nuova conversazione",
                    messages: history
                };

                conversationStorage.saveAgentChat(
                    currentAgentId,
                    conversationData
                );
            }

        } catch (error) {

            console.error("Errore nel salvataggio:", error);

            conversation.setStatus(
                "Attenzione: conversazione non salvata."
            );
        }
    },

    // Aggiornamento del messaggio di stato.
    setStatus(message) {

        statusElement.textContent = message;
    },

    // Creazione grafica di un messaggio.
    addMessage(role, content) {

        document.getElementById("welcome")?.remove();

        const article = document.createElement("article");

        article.className = `message ${role}`;

        const label = document.createElement("div");

        label.className = "role";
        label.textContent = role === "user" ? "Tu" : "MyAI";

        const text = document.createElement("div");

        text.textContent = content;

        article.append(label, text);

        messagesElement.appendChild(article);

        return text;
    },


    // Visualizzazione della schermata iniziale.
    showWelcome() {

        document.getElementById("welcome")?.remove();

        const welcome = document.createElement("div");

        welcome.className = "welcome";
        welcome.id = "welcome";

        const heading = document.createElement("h1");

        heading.textContent = "Come posso aiutarti?";

        const paragraph = document.createElement("p");

        paragraph.textContent =
            "Apri un file oppure scrivi un messaggio per iniziare.";

        welcome.append(heading, paragraph);

        messagesElement.appendChild(welcome);
    },

    // -----------------------------
    // Funzioni per la chat madre
    // -----------------------------

    async initializeMotherAI() {

        const madre = conversationStorage.chatAIMadre();

        history = madre.messages;
        currentConversationId = MADRE_AI;
        currentAgentId = null;

        if (currentConversationId === MADRE_AI) {


            // Rimuovo la classe da tutti i pulsanti precedenti.
            document.querySelectorAll(".active_chat").forEach(button => {
                button.classList.remove("active_chat");
            });

            //console.log(document.getElementById("chat-mother").className);
            document.getElementById("chat-mother").className = "active_chat";
            //console.log(document.getElementById("chat-mother").className);

        }

        messagesElement.replaceChildren();

        for (const message of history) {

            conversation.addMessage(
                message.role,
                message.content
            );
        }

        if (history.length === 0) {
            conversation.showWelcome();
        }
    },

    // -----------------------------
    // Funzioni per agenti IA
    // -----------------------------

    // Aggiornamento dell'elenco delle conversazioni.
    async renderConversationList() {

        const list = document.getElementById("conversation_list");

        if (!list) return;

        list.replaceChildren();

        // Recupero tutti gli agenti
        const agents = conversationStorage.listAgents();

        // Ciclo attraverso tutti gli agenti
        for (const agentData of agents) {

            // Carico l'agente completo
            const agent = conversationStorage.loadAgent(agentData.id);

            // Creo il contenitore dell'agente
            const agentContainer = document.createElement("div");
            
            agentContainer.className = "agent-container";

            const heading = document.createElement("h3");

            heading.textContent = agent.title;

            agentContainer.appendChild(heading);

            // Recupero le conversazioni di questo agente
            const chats = conversationStorage.listAgentChats(agent.id);
            
            // Visualizzazione delle chat
            for (const chat of chats) {

                // Contenitore della singola conversazione
                const chatContainer = document.createElement("div");

                chatContainer.className = "chat-container";

                // Pulsante per aprire la conversazione
                const chatButton = document.createElement("button");
                chatButton.className = "chats";
                chatButton.textContent = chat.title;

                chatButton.addEventListener("click", async () => {

                    await conversation.openConversation(
                        agent.id,
                        chat.id,
                        chatButton
                    );

                });

                // Pulsante per eliminare la conversazione
                const removeChatButton = document.createElement("button");

                removeChatButton.className = "chats";
                removeChatButton.textContent = "Elimina";

                removeChatButton.addEventListener("click", async () => {

                    if (busy) return;

                    // Elimino la conversazione dallo storage
                    conversationStorage.removeChatAgent(
                        agent.id,
                        chat.id
                    );

                    // Se era la conversazione aperta, resetto la visualizzazione
                    if (currentConversationId === chat.id) {

                        currentConversationId = null;
                        currentAgentId = null;
                        history = [];

                        messagesElement.replaceChildren();

                        conversation.showWelcome();
                    }

                    // Aggiorno l'elenco delle conversazioni
                    await conversation.renderConversationList();

                    conversation.setStatus("Conversazione eliminata.");

                    await conversation.initializeMotherAI();

                });

                // Inserisco entrambi i pulsanti nel contenitore
                chatContainer.append(
                    chatButton,
                    removeChatButton
                );

                agentContainer.appendChild(chatContainer);
            }

            // --------------------------------
            // PULSANTE NUOVA CHAT
            // --------------------------------

            const containerButtonsAgent = document.createElement("div");
            containerButtonsAgent.className = "buttons_agent";

            const newChatButton = document.createElement("button");
            newChatButton.className = "chats";
            newChatButton.textContent = "+ Nuova chat";

            const buttonRemoveAgent = document.createElement("button");
            buttonRemoveAgent.className = "chats";
            buttonRemoveAgent.textContent = "Rimuovi agente";

            newChatButton.addEventListener("click", async () => {

                if (busy) return;

                // Creo la chat associata a questo agente
                const chat = conversationStorage.createAgentChat(
                    agent.id,
                    "Nuova conversazione"
                );

                // Aggiorno lo stato corrente
                currentAgentId = agent.id;
                currentConversationId = chat.id;

                history = [];

                // Aggiorno l'interfaccia
                messagesElement.replaceChildren();

                conversation.showWelcome();

                // Aggiorno la lista
                await conversation.renderConversationList();

                conversation.setStatus("Nuova conversazione creata.");
            });

            buttonRemoveAgent.addEventListener("click", async () => { 
                
                if (busy) return;

                conversationStorage.removeAgent(agent.id);
                console.log("agente rimosso")

                conversation.setStatus("Agente rimosso con sucesso.");
                this.renderConversationList();
                this.initializeMotherAI();
            });

            containerButtonsAgent.append(newChatButton, buttonRemoveAgent);
            agentContainer.appendChild(containerButtonsAgent);

            // Inserisco l'agente nella lista generale
            list.appendChild(agentContainer);
        }
    },


    // Apertura di una conversazione salvata.
    async openConversation(agentId, chatId, chatButton) {

        if (busy) return;

        try {

            const loaded = conversationStorage.loadAgentChat(
                        agentId,
                        chatId
                    );

            currentAgentId = agentId;
            currentConversationId = chatId;

            // Rimuovo la classe da tutti i pulsanti precedenti.
            document.querySelectorAll(".active_chat").forEach(button => {
                button.classList.remove("active_chat");
            });

            document.getElementById("chat-mother").className = "generalButton";

            // Assegno la classe al pulsante corrente.
            chatButton.classList.add("active_chat");

            history = [...loaded.messages];

            messagesElement.replaceChildren();

            for (const message of history) {

                conversation.addMessage(
                    message.role,
                    message.content
                );
            }

            if (history.length === 0) {
                conversation.showWelcome();
            }

            conversation.setStatus("Conversazione ripristinata.");

        } catch (error) {

            conversation.setStatus(
                `Impossibile aprire la conversazione: ${error.message}`
            );
        }
    },

};

// -----------------------------
// Bottoni funzioni comuni
// -----------------------------

// Gestione dell'invio dei messaggi.
form.addEventListener("submit", async event => {

    event.preventDefault();

    const content = promptInput.value.trim();

    if (!content || busy) return;

    busy = true;
    sendButton.disabled = true;

    try {

        // Registrazione del messaggio dell'utente.
        history.push({
            role: "user",
            content
        });

        conversation.addMessage("user", content);

        promptInput.value = "";

        await conversation.persistHistory(currentConversationId);


        // Invio della cronologia a Ollama.
        conversation.setStatus("MyAI sta pensando...");

        const answer = await webApp.chatWithAI([
            {
                role: "system",
                content: systemInstruction
            },
            ...history
        ]);


        // Registrazione della risposta.
        history.push({
            role: "assistant",
            content: answer
        });

        conversation.addMessage("assistant", answer);

        await conversation.persistHistory(currentConversationId);

        conversation.setStatus("Risposta ricevuta.");

    } catch (error) {

        console.error("Errore durante la chat:", error);

        conversation.setStatus(`Errore: ${error.message}`);

    } finally {

        busy = false;
        sendButton.disabled = false;
        promptInput.focus();
    }
});


document.getElementById("openRecap").addEventListener("click", () => {

    const door = document.getElementById("recapOff") 
              || document.getElementById("recapOn");

    if (door.id === "recapOff") {
        door.id = "recapOn";
    } else {
        door.id = "recapOff";
    }

});


// -----------------------------
// Bottoni funzioni chat madre
// -----------------------------

document.getElementById("reset-mother").addEventListener("click", async () => {

    if (busy) return;

    history = [];

    currentConversationId = MADRE_AI;
    currentAgentId = null;

    await conversation.persistHistory();

    messagesElement.replaceChildren();

    conversation.showWelcome();

    conversation.setStatus("Chat madre ripristinata.");
});

document.getElementById("chat-mother").addEventListener("click", async () => {

    if (busy) return;

    await conversation.initializeMotherAI();

    conversation.setStatus("Chat madre ripristinata nella visualizzazione.");
});

// -----------------------------
// Bottoni funzioni per agenti AI
// -----------------------------

document.getElementById("agents").addEventListener("click", async () => {

    if (busy) return;

    //console.log("button agente attivo")

    document.getElementById("recap").remove();
    document.getElementById("messages").remove();
    document.getElementById("chat-form").remove();

    const settings_agents = document.createElement("div");

    settings_agents.id = "setting_agent";

    const paragraph = document.createElement("p");

    paragraph.textContent = "Titolo:";

    const textarea = document.createElement("textarea");

    textarea.id = "setting-form";
    textarea.placeholder = "Crea il titolo dell'agente."
    textarea.rows = "3"

    const exitButton = document.createElement("button")

    exitButton.textContent = "Annulla"

    const saveButton = document.createElement("button");

    saveButton.textContent = "Crea agente";

    settings_agents.append(
        paragraph,
        textarea,
        saveButton,
        exitButton
    );

    main.appendChild(settings_agents);

    exitButton.addEventListener("click", () => {
        settings_agents.remove();

        main.append(recap, messagesElement, chatForm);
    });

    saveButton.addEventListener("click", async () => {

        const title = textarea.value.trim();

        if (!title) {
            alert("Inserisci un titolo per l'agente.");
            return;
        }

        try {

            const agent = conversationStorage.saveAgent(title);

            console.log("Agente creato:", agent);
            
            // Aggiornamento dell'elenco degli agenti.
            conversationStorage.readAgents();

            listAgents.appendChild(agent);


        } catch (error) {

            console.error(error);
        }finally{
            settings_agents.remove();
            main.append(recap, messagesElement, chatForm);
            conversation.renderConversationList();
        }
    });
});

// -----------------------------
// Avvio dell'applicazione.
// -----------------------------

async function initializeApplication() {

    try {

        await webApp.initialize();

        behavior();

        await conversation.initializeMotherAI();

        await conversation.renderConversationList();

        conversation.setStatus("Pronto · Ollama locale");

    } catch (error) {

        console.error("Errore nell'inizializzazione:", error);

        conversation.setStatus(
            `Errore di inizializzazione: ${error.message}`
        );
    }
}

initializeApplication();
