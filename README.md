# Versione multi-torneo

Questa versione introduce il contenitore multi-torneo. I dati non sono piu salvati direttamente in radice Firebase, ma sotto:

```text
tournaments/{tournamentId}/...
```

Pagina nuova:

```text
admin-home.html
```

Da qui puoi:
- creare un nuovo torneo
- entrare in un torneo esistente
- aprire regia/setup/pubblico del torneo selezionato
- migrare eventuali vecchi dati root nel torneo `default`

Gli URL delle pagine supportano il parametro:

```text
?tid=ID_TORNEO
```

Esempi:

```text
admin.html?tid=smef-2026
campo.html?tid=smef-2026&field=calcio1
display.html?tid=smef-2026
classifica.html?tid=smef-2026
```

Se il parametro `tid` non e presente, l'app usa l'ultimo torneo selezionato in `localStorage`, oppure `default`.

---

# Torneo Live App

Mini web app statica per torneo multisport: classifica live/ufficiale, risultati, turni, pagina campo, display regia e admin.

## File principali

- `index.html`: home
- `admin.html`: regia centrale
- `campo.html?id=calcio1`: gestione campo
- `display.html`: schermo regia/proiezione, accessibile solo da area admin
- `classifica.html`: classifica unica con punteggio aggiornato live e indicazione delle squadre in gioco
- `turni.html`: calendario
- `assets/js/firebase-config.js`: configurazione Firebase da compilare
- `data/seed.json`: dati di esempio da importare in Firebase Realtime Database
- `firebase-rules-dev.json`: regole aperte solo per test

## Setup Firebase

1. Crea un progetto Firebase.
2. Crea una Web App Firebase.
3. Abilita Realtime Database.
4. Copia la configurazione Firebase dentro `assets/js/firebase-config.js`.
5. In Realtime Database importa `data/seed.json`.
6. Per test rapido puoi usare `firebase-rules-dev.json`.

Attenzione: le regole dev sono aperte. Non usarle per evento reale senza almeno una protezione admin/campo.

## Logica classifica

La classifica non viene salvata nel database.
Viene calcolata leggendo le partite.

- Punti ufficiali: partite con `status = final` o `locked`.
- Proiezione live: partite finali + partite `in_progress`.
- Differenza: proiezione live meno punti ufficiali.

Punteggio regolamento predefinito:

- Pareggio: 3 punti per squadra.
- Vittoria con margine basso: 4 punti al vincente, 2 al perdente.
- Vittoria con margine medio: 5 punti al vincente, 1 al perdente.
- Vittoria con margine alto: 6 punti al vincente, 0 al perdente.

Soglie predefinite:

- Basket: MB <= 7, MM 8-14, MA >= 15.
- Pallavolo: MB <= 5, MM 6-10, MA >= 11.
- Calcio a 5: MB <= 2, MM = 3, MA >= 4.
- Frisbee: MB <= 2, MM = 3, MA >= 4.

Le regole sono salvate in `scoringRules` e possono essere modificate da `admin.html`, sezione "Regole classifica".

## Cronometro

Il cronometro è centralizzato.
L'admin salva:

- `timerRunning`
- `timerStart`
- `timerDuration`

Le pagine calcolano il tempo residuo localmente. Non vengono scritti i secondi rimanenti ogni secondo.

## Pubblicazione GitHub Pages

Carica tutti i file in un repository GitHub.
Poi abilita Pages da Settings > Pages > Deploy from branch.

## URL campo

Esempi:

- `campo.html?id=calcio1`
- `campo.html?id=calcio2`
- `campo.html?id=volley1`
- `campo.html?id=basket1`
- `campo.html?id=ultimate1`

## Ciclo automatico gioco/pausa

La sezione Admin include i tempi configurabili:

- tempo di gioco (`gameDuration`)
- tempo di pausa (`breakDuration`)
- avvio automatico quando tutti i campi sono pronti (`autoStartWhenAllReady`)

Flusso operativo:

1. I responsabili campo cliccano "Campo pronto".
2. Quando tutti i campi sono pronti, il tempo di gioco parte automaticamente, se l'opzione è attiva.
3. A fine gioco, le partite `in_progress` del turno vengono trasformate in `final`.
4. Parte automaticamente la pausa.
5. A fine pausa, la regia passa al turno successivo e i campi tornano "non pronti".
6. Il turno seguente parte quando tutti i campi sono di nuovo pronti.

Nota importante: non essendoci un server backend, l'automazione viene eseguita dal browser admin aperto in regia. Durante l'evento tieni `admin.html` aperto su un dispositivo stabile.

## Aggiornamento v4

Novita principali:

- `classifica.html`: classifica unica. Include le partite in corso nel punteggio e mostra “Sta giocando” per le squadre impegnate nel turno corrente fino alla finalizzazione.
- Colori classifica: prime 16 in verde, dalla 17 in rosso.
- `playoff.html`: tabellone a 16 con Ottavi, Quarti, Semifinali e Finale.
- Nei playoff la squadra meglio classificata sceglie lo sport. La pagina impedisce di scegliere due volte lo stesso sport per la stessa squadra.
- `turni.html`: mostra solo campo e squadre, divisi in turno appena concluso, turno in corso e prossimo turno.
- `turni.html`: integra turno appena concluso, turno in corso, prossimo turno e risultati.
- `display.html` e `admin.html`: sotto il cronometro principale compare il tempo secondario.
- In `admin.html`, l'elenco campi e cliccabile e apre `campo.html?id=...`.

Nota: con 16 squadre qualificate il primo turno playoff non puo essere direttamente "Quarti". Servono gli Ottavi. Per questo la pagina include Ottavi, Quarti, Semifinali e Finale.

## Nuove pagine calendario

- `calendario.html`: calendario completo di tutti i turni, con orario stimato da impostazioni torneo.
- `calendario.html`: integra calendario completo e filtro per squadra.
- Le classifiche non mostrano piu etichette testuali playoff/eliminata: resta solo lo sfondo verde per le prime 16 e rosso dalla 17 in poi.

## Import squadre e calendario

Apri `admin-import.html` per importare squadre e calendario da CSV o JSON.

CSV squadre minimo:

```csv
id,nome
team01,Squadra 01
team02,Squadra 02
```

CSV calendario minimo:

```csv
id,turno,sport,campo,squadraA,squadraB
m001,1,calcio,calcio1,team01,team02
m002,1,volley,volley1,Squadra 03,Squadra 04
```

La pagina fa anteprima, segnala errori/avvisi e poi importa su Firebase. Per test puoi usare "Unisci"; per caricare il torneo definitivo usa "Sostituisci sezioni importate" dopo aver verificato l'anteprima.

## v7 - Separazione Admin / Setup

- `admin.html` ora e' solo console di regia live: cronometro, pausa, cambio turno manuale, feedback campi e partite del turno corrente.
- `admin-setup.html` contiene le impostazioni iniziali: numero squadre, tempi di gioco/riposo, orario inizio, stima orario fine, margini classifica e import squadre/calendario.
- Durante l'evento usare `admin.html`; prima dell'evento usare `admin-setup.html`.

## v9 - Setup: conteggio turni e orari

In `admin-setup.html` il numero squadre aggiorna Firebase e ricalcola automaticamente:

- numero partite totali
- numero turni
- fine stimata includendo anche la pausa finale
- fine stimata senza pausa finale
- tabella turno per turno con inizio gioco, fine gioco e fine pausa

Se il calendario e' gia' importato, il calcolo usa le partite e i turni reali del calendario.
Se il calendario non e' ancora importato, il calcolo usa una stima round robin: `n * (n - 1) / 2`, divisa per il numero di partite contemporanee/campi attivi.

I valori calcolati vengono salvati in Firebase sotto:

`tournament/scheduleSummary`

## v10 - Logica setup corretta
La pagina `admin-setup.html` calcola la struttura attesa del torneo partendo da:
- numero squadre partecipanti
- partite contemporanee / campi attivi
- tempo di gioco
- tempo di pausa
- orario di inizio

Il calcolo non dipende dal calendario gia importato. Il calendario importato viene invece confrontato con la struttura attesa, cosi eventuali differenze su numero partite, numero turni o partite per turno emergono prima dell'evento.

## v11 - Formula corretta partite attese
Il setup ora calcola le partite attese con la formula corretta del torneo:

`squadre * 8 / 2`

Perche ogni squadra gioca 2 partite per ciascuno dei 4 sport, quindi 8 partite totali. Il risultato viene diviso per 2 perche ogni partita coinvolge due squadre.

Esempio: 27 squadre = 27 * 8 / 2 = 108 partite totali.


## Versione v15
- Aggiunto pulsante `Annulla finalizzazione` nella pagina campo.
- Il pulsante compare quando la partita e finalizzata o locked.
- L'annullamento mantiene il punteggio e riporta la partita a `in_progress`.

## v16 - Reset ed esportazioni

In `admin-setup.html` e stata aggiunta la sezione **Reset ed esportazioni**.

- **Reset torneo**: azzera punteggi, stati partite, pronti campo, cronometri e bracket playoff. Non elimina squadre, calendario, impostazioni iniziali o margini classifica. Richiede conferma testuale `RESET TORNEO`.
- **Esporta calendario + risultati CSV**: esporta calendario completo con risultati, stato e punti classifica della singola partita.
- **Esporta classifica CSV**: esporta classifica ufficiale con proiezione live e statistiche principali.
- **Esporta bracket playoff CSV**: esporta tabellone playoff, sport scelto, squadra che sceglie e vincitore.


## v19
- `display.html` rimosso dalla Home e dai link pubblici.
- `display.html` ora richiede password admin.
- Link Display aggiunto alla barra strumenti dell'area admin.
