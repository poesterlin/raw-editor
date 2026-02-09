# Docker Setup

This is the recommended deployment path for self-hosting.

## Prerequisites

- Docker Engine + Compose v2
- At least 4 GB RAM recommended
- Plenty of disk for RAW + TIFF intermediates

## Quick start

```bash
cp .env.example .env

export RAWTHERAPEE_VERSION=5.11

docker compose -f docker-compose.selfhost.yml up -d --build
```

If you omit `RAWTHERAPEE_VERSION`, the image will use the latest RawTherapee release at build time.

UI: http://localhost:3000

## Updating

```bash
docker compose -f docker-compose.selfhost.yml pull

docker compose -f docker-compose.selfhost.yml up -d
```

## Troubleshooting

- If previews fail, ensure the RawTherapee CLI is available in the image (the default Dockerfile installs it).
- If database errors occur, verify `DATABASE_URL` in `.env` and that the `db` service is healthy.
- For permissions issues, ensure `./import`, `./export`, and `./tmp` are writable by Docker.
- For license compliance, the image records the exact RawTherapee version and source URL and exposes them in the Legal page.
