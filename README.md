# Bot

A tiny, self-contained **rule-based chatbot** web app. No API keys, no external
services — it runs entirely locally so it is easy to develop, test, and demo.

## Stack

- **Backend:** Node.js + [Express](https://expressjs.com/) (`src/server.js`)
- **Bot engine:** dependency-free rule engine (`src/bot.js`)
- **Frontend:** static HTML/CSS/JS chat UI (`public/`)
- **Tests:** Node's built-in test runner (`test/`)
- **Lint:** ESLint 9 flat config (`eslint.config.js`)

## Getting started

```bash
npm ci        # install dependencies (uses package-lock.json)
npm start     # start the server on http://localhost:3000
```

Then open http://localhost:3000 and chat with the bot. Try `hello`, `help`,
`what time is it?`, `echo hi`, or a math expression like `2 + 3 * 4`.

### Development

```bash
npm run dev   # start with auto-reload (node --watch)
```

## Commands

| Command        | Description                                  |
| -------------- | -------------------------------------------- |
| `npm start`    | Start the production server                   |
| `npm run dev`  | Start with file watching / auto-reload        |
| `npm test`     | Run the unit and API tests                    |
| `npm run lint` | Lint the codebase with ESLint                 |

## API

- `GET /api/health` → `{ "status": "ok", "uptime": <seconds> }`
- `POST /api/chat` with `{ "message": "hello" }` → `{ "reply": "..." }`

## Configuration

| Env var | Default   | Description              |
| ------- | --------- | ------------------------ |
| `PORT`  | `3000`    | Port the server binds to |
| `HOST`  | `0.0.0.0` | Host interface           |
