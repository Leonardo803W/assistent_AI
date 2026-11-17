
/*
ConversationStorage.js

Gestione dell'archivio delle conversazioni.

Responsabilità:
- Leggere le conversazioni salvate.
- Elencare le conversazioni.
- Caricare una conversazione.
- Salvare una conversazione.
- Aggiornare una conversazione esistente.

L'archiviazione viene effettuata tramite localStorage.
Non utilizza il file system di Node.js.
*/
const AGENTS_KEY = "myAI_agents";
const MADRE_KEY = "myAI_madre";
const MADRE_AI = "MADRE_AI";

class ConversationStorage {

    // -----------------------------
    // ARCHIVIO AI MADRE
    // -----------------------------

    chatAIMadre() {

        let madre = this.readMadre();

        if (!madre || typeof madre !== "object" || Array.isArray(madre)) {

            madre = {
                id: MADRE_AI,
                title: "AI Madre",
                updatedAt: Date.now(),
                recap: "",
                messages: []
            };

        } else {

            madre.id = typeof madre.id === "string"
                ? madre.id
                : MADRE_AI;

            madre.title = typeof madre.title === "string"
                ? madre.title
                : "AI Madre";

            madre.recap = typeof madre.recap === "string"
                ? madre.recap
                : "";

            madre.messages = Array.isArray(madre.messages)
                ? madre.messages
                : [];

            madre.updatedAt = madre.updatedAt || Date.now();
        }

        this.writeMadre(madre);

        return madre;
    }

    writeMadre(madre) {

        localStorage.setItem(
            MADRE_KEY,
            JSON.stringify(madre)
        );
    }

    readMadre() {

        try {

            const raw = localStorage.getItem(MADRE_KEY);

            console.log(raw);

            return raw ? JSON.parse(raw) : null;

        } catch (error) {

            console.error("Errore nella lettura della AI madre:", error);

            return null;
        }
    }

    // -----------------------------
    // ARCHIVIO AGENTI
    // -----------------------------

    readAgents() {

        try {

            const raw = localStorage.getItem(AGENTS_KEY);

            console.log(raw);

            if (!raw) return [];

            const data = JSON.parse(raw);

            console.log(data);

            return Array.isArray(data) ? data : [];

        } catch (error) {

            console.error("Errore nella lettura degli agenti:", error);

            return [];
        }
    }

    saveAgent(title) {

        if (typeof title !== "string" || !title.trim()) {
            throw new Error("Titolo agente non valido.");
        }

        const agents = this.readAgents();

        console.log(agents);

        const agent = {
            id: `agent-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: title.trim().slice(0, 100),
            createdAt: Date.now(),
            chats: [],
        };

        console.log(agent);

        agents.push(agent);

        localStorage.setItem(
            AGENTS_KEY,
            JSON.stringify(agents)
        );

        return agent;
    }

    listAgents() {

        return this.readAgents()
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    loadAgent(id) {

        const agents = this.readAgents();

        const agent = agents.find(item => item.id === id);

        if (!agent) {
            throw new Error("Agente non trovato.");
        }

        // Controllo identificativo
        if (typeof agent.id !== "string") {
            agent.id = `agent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }

        // Controllo titolo
        if (typeof agent.title !== "string") {
            agent.title = "Agente senza nome";
        }

        // Controllo data
        if (typeof agent.createdAt !== "number") {
            agent.createdAt = Date.now();
        }

        // Controllo archivio conversazioni
        if (!Array.isArray(agent.chats)) {
            agent.chats = [];
        }

        this.writeAgents(agents);

        return agent;
    }

    writeAgents(agents) {

        localStorage.setItem(
            AGENTS_KEY,
            JSON.stringify(agents)
        );
    }

    removeAgent(id) {

        let agents = this.readAgents();

        let agent = agents.find(item => item.id === id);

        if (!agent) {
            throw new Error("Agente non trovato.");
        }

        agents = agents.filter(item => item.id !== id);

        localStorage.setItem(
            AGENTS_KEY,
            JSON.stringify(agents)
        );

        return agent;
    }

    // -----------------------------
    // CHAT DEGLI AGENTI
    // -----------------------------

    createAgentChat(agentId, title = "Nuova conversazione") {

        const agents = this.readAgents();

        const agent = agents.find(item => item.id === agentId);

        if (!agent) {
            throw new Error("Agente non trovato.");
        }

        const chat = {
            id: `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: title.trim().slice(0, 100) || "Nuova conversazione",
            updatedAt: Date.now(),
            messages: []
        };

        agent.chats.push(chat);

        this.writeAgents(agents);

        return chat;
    }

    listAgentChats(agentId) {

        const agent = this.loadAgent(agentId);

        return [...agent.chats]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(({ id, title, updatedAt }) => ({
                id,
                title,
                updatedAt
            }));
    }

    loadAgentChat(agentId, chatId) {

        const agent = this.loadAgent(agentId);

        const chat = agent.chats.find(
            item => item.id === chatId
        );

        if (!chat) {
            throw new Error("Conversazione non trovata.");
        }

        return chat;
    }

    saveAgentChat(agentId, conversation) {

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

            return {
                role: message.role,
                content: message.content
            };
        });

        const agents = this.readAgents();

        const agent = agents.find(item => item.id === agentId);

        if (!agent) {
            throw new Error("Agente non trovato.");
        }

        const existing = agent.chats.findIndex(
            item => item.id === conversation.id
        );

        const record = {
            id: conversation.id,
            title: conversation.title.slice(0, 100),
            updatedAt: Date.now(),
            recap: "",
            messages
        };

        if (existing >= 0) {
            agent.chats[existing] = record;
        } else {
            agent.chats.push(record);
        }

        this.writeAgents(agents);

        return record;
    }
    
    removeChatAgent(agentId, chatId) {

        let agents = this.readAgents();

        let agent = agents.find(
            item => item.id === agentId
        );

        let chat = agent.chats.find(
            item => item.id === chatId
        );

        if (!chat) {
            throw new Error("Chat non trovata.");
        }

        agent.chats = agent.chats.filter(
            item => item.id !== chatId
        );

        this.writeAgents(agents);

        return chat;
    }
};

export { ConversationStorage, MADRE_AI };
