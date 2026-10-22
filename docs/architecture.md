# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep React components responsible for presentation and request state; use the shared API client for relative `/api` requests. Show accessible loading, empty, and error states, and render server data without duplicating business rules in the browser.
- Logic tier decision: Keep Express routes thin and put validation, persistence coordination, and response shaping in the service layer. Return deliberate 4xx responses for invalid input, missing references, and unknown users; do not add authentication in this exercise.
- Data tier decision: Use Mongoose schemas for required fields, references, and safe defaults (including an empty team-members array). Keep seed operations idempotent and non-destructive so unrelated user data is preserved.
- Activity tracking approach: Validate the request shape and both ObjectId strings before querying. Confirm the referenced user and team exist, then store their IDs, activity type, minutes, computed points, and occurrence time. Invalid input or references must not create a record.
- Team management approach: Require a non-empty name, preserve the submitted name and mascot, and default omitted members to an empty list. Persist valid member references without silently changing unrelated user or team records.
- Leaderboard approach: Aggregate activity points by team, sort totals from highest to lowest, and assign ranks starting at 1. Return the team name and total for each ranked entry.
- Workout suggestions approach: Find the user by email, use their fitness goal and recent activities to prioritize matching workouts, and include a concise reason for the leading suggestion. Return a deliberate 4xx response when no user matches.

## Test plan

Run the focused tests in dependency order, followed by builds. A test failure identifies a contract or behavior gap in that tier; a build failure identifies a TypeScript or bundling problem.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — checks schema validation/defaults and repeatable, non-destructive seed data.
- API command: `npm run test:api --prefix octofit-tracker/backend` — checks request validation, persistence, response shapes, leaderboard ordering, and personalized suggestions including error cases.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — checks API-backed rendering, requested routes, and accessible loading, empty, and failure states.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — checks backend TypeScript types and compilation.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — checks frontend TypeScript types and the Vite production bundle.
