# TripForge

Offline-first backend API platform for travel itinerary planning, data ingestion, and model-assisted recommendations.

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

## Ports

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |

## Test Credentials

| Field | Value |
|-------|-------|
| username | admin |
| password | Admin123!Admin |

## Run Tests

Inside the container:

```bash
docker compose exec api sh run_tests.sh
```

Or run individually:

```bash
docker compose exec api npm run test:unit
docker compose exec api npm run test:api
```
