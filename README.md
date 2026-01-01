# hello-world-api-7161-7170

A minimal Express.js API that exposes a `GET /hello` endpoint and a MongoDB-backed Employee CRUD API.

## Prerequisites

You will need the following installed locally:

- Node.js (recommended: 18+)
- npm (comes with Node)
- A running MongoDB instance (local MongoDB, Docker, or MongoDB Atlas)

## Configuration (environment variables)

The backend requires `MONGODB_URI` to be set. An example file is provided at:

- `api_backend/.env.example`

Minimum required variable:

- `MONGODB_URI`: MongoDB connection string (for example: `mongodb://localhost:27017/hello_world_api`)

Optional variables:

- `PORT`: defaults to `3001`
- `HOST`: defaults to `0.0.0.0`

### Local setup

From the repository root:

```bash
cd api_backend
cp .env.example .env
```

Then edit `.env` and set `MONGODB_URI` to match your MongoDB instance.

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

- `Connected to MongoDB`
- `Server running at http://0.0.0.0:3001`

## Verify the API is running

### Hello World

```bash
curl -i http://localhost:3001/hello
```

Expected response:

- Status `200`
- Body: `Hello World`

## Try the Employee endpoints (MongoDB persistence)

All Employee endpoints are persisted in MongoDB via Mongoose and require a working `MONGODB_URI`.

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

## Troubleshooting MongoDB connectivity

If the server fails at startup, it is usually due to MongoDB configuration.

### Missing MONGODB_URI

If you see an error similar to “Missing required environment variable MONGODB_URI.”:

- Ensure you created `api_backend/.env` from `api_backend/.env.example`
- Ensure `MONGODB_URI` is set in your environment (or in `.env`) before starting the server

### MongoDB not running / cannot connect

If you see connection issues (often timeouts, “server selection” errors, or connection refused):

- Verify MongoDB is running and reachable from your machine
- Double-check the host/port in `MONGODB_URI`
- If using Docker/VM, confirm port `27017` is forwarded/exposed
- If using MongoDB Atlas, ensure your IP is allowlisted and the URI includes credentials and correct database name

### Port already in use (3001)

If `3001` is occupied:

- Set `PORT` in `api_backend/.env` (for example `PORT=3002`) and restart the server.

## API documentation (Swagger UI)

Swagger UI is served at:

- `GET /docs`

For local:

- http://localhost:3001/docs
