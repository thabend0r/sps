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

| Variable                     | Default                         | Meaning                                            |
|------------------------------|---------------------------------|----------------------------------------------------|
| `PORT`                       | `3000`                          | HTTP port                                          |
| `DATA_DIR`                   | `./data` (`/data` in container) | Folder for the SQLite database                     |
| `TRUST_PROXY`                | `false`                         | Number of reverse proxies in front (Traefik: `1`)  |
| `RATE_LIMIT_CREATE_PER_HOUR` | `10`                            | New links per IP per hour                          |
| `RATE_LIMIT_API_PER_15MIN`   | `300`                           | API calls per IP per 15 minutes                    |

Health check endpoint: `GET /healthz`.

## Kubernetes (Helm)

The image is built and pushed to `ghcr.io/thabend0r/sps` by GitHub Actions
(`.github/workflows/image.yml`) on every push to `main` and on `v*` tags.
The first time, make the package public in GitHub (Packages > sps > settings),
or create an image pull secret (see `values.yaml`).

```sh
helm upgrade --install sps deploy/helm/sps -n sps --create-namespace \
  --set image.tag=main
kubectl -n sps port-forward svc/sps 8080:80   # then open http://localhost:8080
```

With a domain, Traefik and (later) cert-manager:

```sh
helm upgrade --install sps deploy/helm/sps -n sps --create-namespace \
  --set image.tag=main \
  --set ingress.enabled=true --set ingress.host=sint.example.nl \
  --set ingress.tls.enabled=true \
  --set ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt
```

Notes:
- SQLite means exactly one pod (`Recreate` strategy) with a `ReadWriteOnce` volume.
- The volume is kept on `helm uninstall` (`helm.sh/resource-policy: keep`).
- The pod runs as non-root with a read-only root filesystem.

## URLs

| Path                    | What                                                  |
|-------------------------|-------------------------------------------------------|
| `/`                     | Parents page: create a tracker                        |
| `/s/<id>`               | Kids tracker (add `?demo=60` for a fast preview)      |
| `/bewerk/<id>#<secret>` | Edit/delete a tracker                                 |
| `/demo`                 | Tracker from URL params: `?lat=&lng=&at=19:30&seed=&demo=60&from=30` |

## Privacy

- Addresses are looked up in the browser via PDOK; the server only receives
  coordinates (rounded to ~10 m) and a time.
- Trackers are deleted automatically 2 days after the delivery time.
- Edit secrets are stored as SHA-256 hashes and live in the URL `#fragment`,
  so they never reach server logs.

## Editing the texts

All texts the kids see (ETA blocks and status messages) live in
[`client/src/messages.js`](client/src/messages.js). Add, remove or reword
them freely; `{stad}` is replaced with the current city.

## Project layout

```
client/                  frontend (Vite, plain JavaScript, Leaflet)
  index.html, src/ouders.js   parents page
  tracker.html, src/main.js   kids tracker page
  src/messages.js        all kid-facing texts
  src/route.js           route simulation (ROUTE_SETTINGS to tune)
  src/cities.js          towns Sint can visit
server/                  Node/Express server (API, SQLite, serves the frontend)
deploy/helm/sps/         Helm chart
Dockerfile               production image (non-root, /data volume)
```
