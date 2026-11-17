/*
window.js
Finestra e avvio:
Crea la BrowserWindow.
Imposta dimensioni, titolo e opzioni di sicurezza.
Carica index.html.
Mostra la finestra quando è pronta.
*/

const { BrowserWindow } = require("electron");
// ogni modulo CommonJS ha il proprio ambito (scope)..
const path = require("node:path");

class DesktopApp {

  constructor() {
        this.type = "desktop";
    }

    async initialize() {

        console.log("DesktopApp inizializzata");

        this.createWindow();

        return {
            type: this.type,
        };
    }

    createWindow() {
    
    const mainWindow = new BrowserWindow({

      // Dimensioni minime quando la finestra è ridotta.
      minWidth: 760,
      minHeight: 560,

      show: false,
      /*
        show:false + once("ready-to-show", ...): la finestra resta nascosta finché la pagina non è pronta, così eviti il lampo bianco iniziale. once esegue la funzione una volta sola (on la eseguirebbe a ogni evento).
      */

      backgroundColor: "#111318",
      title: "MyAI",

      webPreferences: {
        preload: path.join(__dirname, "preload.js"), //__dirname è una variabile disponibile nei moduli CommonJS di Node.js e identifica la cartella del file JavaScript in esecuzione, path.join() combina quella cartella con preload.js.
        contextIsolation: true, //separa il contesto JavaScript della pagina dal contesto privilegiato usato dal preload.
        nodeIntegration: false, //impedisce al JavaScript della pagina di usare direttamente le API Node.js attraverso require() o meccanismi equivalenti.
        sandbox: true // applica le restrizioni del processo di rendering, limitando le capacità disponibili al codice della pagina e del preload.
      }
    });
    /*
    BrowserWindow è una classe di Electron.
    Con new BrowserWindow(...) viene creata una nuova finestra. Il riferimento alla finestra appena creata viene assegnato a mainWindow.
    La variabile mainWindow è utile anche in altre parti del programma, per esempio per collegare una finestra di dialogo alla finestra principale:
    */

    mainWindow.loadFile("index.html");
    // Carica index.html, cioè l'interfaccia grafica.

    mainWindow.once("ready-to-show", () => {
      mainWindow.maximize();
      mainWindow.show();

      // maximize() e poi show(): apre massimizzata.
    });

    /*
    maximize() fa occupare alla finestra tutta l'area disponibile sullo schermo, mantenendo la barra del titolo e i pulsanti.
    width e height non definiscono la dimensione massima: servono come dimensioni di riferimento quando la finestra viene ripristinata.
    Il sistema operativo gestisce automaticamente la dimensione massimizzata in base allo schermo sul quale viene aperta.
    */

    return mainWindow;
  }
}

module.exports = {DesktopApp};
