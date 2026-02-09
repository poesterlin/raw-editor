# RAW Editor

Web-based RAW photo editor that runs RawTherapee CLI in a container, so you can edit and export from low-power devices.

## Highlights

- RAW import with TIFF intermediates for fast preview generation
- Web-based PP3 editing with versioned snapshots
- Export to external integrations (Google Photos, Immich)
- Background import/export jobs per session
- Docker-first setup for self-hosting

## Quick start (prebuilt container)

1) Download the compose file: [docker-compose.yml](https://raw.githubusercontent.com/poesterlin/raw-editor/main/docker-compose.selfhost.yml)

2) Copy the env file and edit values:

```bash
cp .env.example .env
```

3) Start the stack (app + Postgres):

```bash
docker compose -f docker-compose.yml up -d
```

3) Open Port 4893

## Configuration

- Edit `.env` for database and paths
- See `docs/CONFIGURATION.md` for environment variables
- CLUT source (Hald CLUT pack): http://rawtherapee.com/shared/HaldCLUT.zip

## License

See `LICENSE` for GPLv3 terms.
