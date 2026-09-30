# CareTrack

Local tracker for a child's **sleep intervals**, **bowel movements**, **medications**, and **appointments**.

- Frontend: React + TypeScript (Vite)
- Backend: Java 21, Spring Boot, JWT auth, H2 file database

## Run locally

Terminal 1 — API:

```bash
cd backend
./mvnw spring-boot:run
```

Terminal 2 — UI:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Create an account, add a child profile, then log care events.

The API is at `http://localhost:8080`. The Vite dev server proxies `/api` to the backend.
