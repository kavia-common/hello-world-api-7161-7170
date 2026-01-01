# Digi Portal API

A minimal Express.js API that exposes a `GET /hello` endpoint and an in-memory Employee CRUD API.

## Prerequisites

You will need the following installed locally:

- Node.js (recommended: 18+)
- npm (comes with Node)

## Configuration (environment variables)

This backend does **not** require any database configuration.

Optional variables:

- `PORT`: defaults to `3001`
- `HOST`: defaults to `0.0.0.0`
- `BACKUP_INTERVAL_MS`: interval for periodic in-memory backups; defaults to `21600000` (6 hours). The scheduler uses internal backup logic (no HTTP calls).

## Running the backend

This project is a single backend container under `api_backend` and listens on port `3001`.

### Preview (auto-start)

In the Kavia preview environment, the backend is typically auto-started for you. If it is running, you can immediately verify it using the preview URL:

- `GET /hello`

If the preview is not running, start it from the preview controls in your environment.

### Manual start (local)

From the repository root:

```bash
cd api_backend
npm install
npm run start
```

For development with auto-reload:

```bash
cd api_backend
npm install
npm run dev
```

When the server starts successfully, it logs something like:

- `Server running at http://0.0.0.0:3001`

## Verify the API is running

### Hello World

```bash
curl -i http://localhost:3001/hello
```

Expected response:

- Status `200`
- Body: `Hello World`

## Try the Employee endpoints (in-memory persistence)

All Employee endpoints are stored in-memory (data resets on server restart).

Base URL:

- Local: `http://localhost:3001`
- Preview: use your preview base URL

### Create an employee (POST /employees)

Required fields:

- `employeeId` (string)
- `employeeName` (string)
- `email` (must be a valid email)

Optional fields:

- `feedbackRating` (must be one of: `Needs Improvement`, `Average`, `Good`, `Very Good`, `Excellent`)
- `futureMapping` (string)

```bash
curl -i -X POST http://localhost:3001/employees \
  -H 'Content-Type: application/json' \
  -d '{
    "employeeId": "E12345",
    "employeeName": "Jane Doe",
    "email": "jane.doe@example.com",
    "employeeType": "Full-time",
    "feedbackRating": "Very Good",
    "futureMapping": "Shadow senior engineer for 2 months; move to Platform team Q3."
  }'
```

Expected response:

- Status `201`
- JSON: `{ "status": "success", "data": { ... } }`

### List employees (GET /employees)

```bash
curl -i http://localhost:3001/employees
```

Expected response:

- Status `200`
- JSON includes `data` array and `count`

### Replace an employee (PUT /employees/:employeeId)

This replaces the full record for the employee. At minimum, `employeeName` and `email` are required in the body.

```bash
curl -i -X PUT http://localhost:3001/employees/E12345 \
  -H 'Content-Type: application/json' \
  -d '{
    "employeeName": "Jane Doe (Updated)",
    "email": "jane.doe@example.com",
    "feedbackRating": "Excellent"
  }'
```

Expected response:

- Status `200` with updated record, or `404` if not found.

### Partially update an employee (PATCH /employees/:employeeId)

Only the fields you provide are updated. Validation applies to updated fields (including `feedbackRating` enum).

```bash
curl -i -X PATCH http://localhost:3001/employees/E12345 \
  -H 'Content-Type: application/json' \
  -d '{
    "feedbackRating": "Good"
  }'
```

Expected response:

- Status `200` with updated record, or `404` if not found.

### Delete an employee (DELETE /employees/:employeeId)

```bash
curl -i -X DELETE http://localhost:3001/employees/E12345
```

Expected response:

- Status `204` on success, or `404` if not found.

## Backups (in-memory) and scheduler

Backups are snapshots of the in-memory stores. They reset on server restart.

- `POST /backup` (protected: admin/manager): creates a backup snapshot
- `GET /backup` (public): lists backups
- `GET /backup/:id` (public): fetches a backup snapshot
- `GET /backup/jobs` (protected: admin/manager): lists recent scheduler runs and their status

Periodic backups run automatically via a lightweight interval scheduler. Configure with:

- `BACKUP_INTERVAL_MS` (optional): interval in milliseconds; default is 6 hours.

## API documentation (Swagger UI)

Swagger UI is served at:

- `GET /docs`

For local:

- http://localhost:3001/docs
