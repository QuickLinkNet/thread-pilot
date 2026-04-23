# Thread Pilot

Thread Pilot ist ein Admin-Panel (React + Vite) mit PHP/SQLite-API fuer Team-Chat, Tasks, Events und Persona-Management.

### Chat
![Chat View](docs/images/chat.png)

### Tasks
![Tasks View](docs/images/tasks.png)

### Events
![Events View](docs/images/events.png)

### Contract
![Contract View](docs/images/contract.png)

### First Message
![First Message View](docs/images/first-message.png)

### Personas
![Personas View](docs/images/personas.png)

### System
![System View](docs/images/system.png)

### API Checker
![API Checker View](docs/images/api-checker.png)

## Voraussetzungen
- Node.js 20+
- PHP 8+
- Webserver mit `mod_rewrite` (`.htaccess`)

## Konfiguration
Nur eine Datei wird im Repo gepflegt:
- `.env.example`

### Welche Variablen sind wichtig?
- `VITE_API_BASE_URL` (Pflicht): API-Base fuer das Frontend
- `VITE_API_TOKEN` (optional): nur fuer Auto-Login in Dev
- `THREAD_PILOT_ADMIN_NAME` (optional): Admin-Name fuer `api/install.php`
- `THREAD_PILOT_ADMIN_ROLE` (optional): Admin-Rolle fuer `api/install.php`
- `FTP_*` (optional): nur fuer `npm run deploy:ftp`

`VITE_API_TOKEN` wird **nicht** zwingend benoetigt. Wenn leer, login normal ueber Token-Feld in der App.

## Lokal starten
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
Ergebnis liegt in `dist/`.

## Warum gibt es `dist/` und `deploy/`?
- `dist/`: reiner Frontend-Build von Vite
- `deploy/`: fertiges Upload-Paket (`dist` + `api`, aber **ohne** `api/data`, ohne `.env*`, ohne `node_modules`)

Das ist beabsichtigt: `deploy/` ist der sichere, serverfertige Stand.

## Deploy
### Paket vorbereiten
```bash
npm run deploy:prepare
```

### Optional direkt per FTP hochladen
```bash
npm run deploy:ftp
```

### Manuell hochladen
Inhalt von `deploy/` nach z. B.:
- `/html/apps/thread-pilot/`

## API initialisieren
Nach erstem Deploy:
- `https://<deine-domain>/apps/thread-pilot/api/install`

Wichtig:
- `api/data/` auf dem Server **nicht** ueberschreiben, wenn bestehende SQLite-Daten erhalten bleiben sollen.
- `api/install` nur auf leerer DB ausfuehren.

## DB Viewer (read-only)
- Im Admin-Panel unter `System` ist ein eingebauter SQLite-Viewer verfuegbar.
- API-Basis dafuer:
  - `GET /api/db?action=tables`
  - `GET /api/db?action=schema&table=<TABLE>`
  - `GET /api/db?action=rows&table=<TABLE>&limit=50&offset=0`
- Zugriff ist Admin-only.

## API-Routen (Kurz)
- `GET /api.php?route=health`
- `GET /api.php?route=messages&action=sync&since_id=...`
- `POST /api.php?route=messages&action=send`
- `GET /api.php?route=tasks`
- `POST /api.php?route=tasks&action=add|update|claim|release|request_review|approve|delete|restore`
- `GET /api.php?route=events`
- `GET /api.php?route=persona-contract`

## Sicherheit / Git
Nicht committen:
- `.env`, `.env.*` (ausser `.env.example`)
- `dist/`, `deploy/`
- `api/data/*`
- IDE-Dateien (`.idea/`, `.vscode/`)
