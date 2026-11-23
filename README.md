# sps
Sinterklaas Positioning System. A tracker and ETA tool for when Sinterklaas will be in your neighborhood!

## Development

```sh
npm install
npm run dev
```

Open http://localhost:3000. Frontend changes reload in the browser automatically;
server changes restart the server.

## Production build (without Docker)

```sh
npm run build
npm start
```

## Container

```sh
docker compose up --build
```

Open http://localhost:8080.

### Environment variables

| Variable   | Default                 | Meaning                                  |
|------------|-------------------------|------------------------------------------|
| `PORT`     | `3000`                  | HTTP port                                |
| `DATA_DIR` | `./data` (`/data` in container) | Folder for the SQLite database   |
| `BASE_URL` | `http://localhost:3000` | Public URL, used to build shortlinks     |

Health check endpoint: `GET /healthz`.

## Editing the texts

All texts the kids see (ETA blocks and status messages) live in
[`client/src/messages.js`](client/src/messages.js). Add, remove or reword
them freely; `{stad}` is replaced with the current city.

## Project layout

```
client/            frontend (Vite, plain JavaScript, Leaflet)
  src/main.js      map + kids tracker page
  src/messages.js  all kid-facing texts
  src/icons.js     Sint and house map markers
  src/demo.js      phase 1 demo route (temporary)
server/            Node/Express server (API + serves the built frontend)
Dockerfile         production image (non-root, /data volume)
```
