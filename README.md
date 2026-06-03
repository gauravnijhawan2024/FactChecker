# FactChecker

AI-powered fact-checking app built with React, Vite, TypeScript, TailwindCSS, Node.js, Express, MongoDB, Mongoose, Google Gemini, OpenAI, Ollama, and Playwright.

## Run Locally

```bash
npm install
cp backend/.env.example backend/.env
npm run dev
```

Set `MONGODB_URI` and the API key/model settings for the provider you want to use in `backend/.env` before running real analyses.

Supported AI providers:

- Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL`
- OpenAI: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_WEB_SEARCH_ENABLED`
- Ollama: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_VISION_MODEL`

## API

- `POST /api/analyze/url`
- `POST /api/analyze/text`
- `POST /api/analyze/image`
- `GET /api/analyze/:id`
- `DELETE /api/analyze/:id`

## Workflow

The API creates an analysis record, returns an `analysisId`, and processes extraction, claim identification, evidence search, and verdict generation in the background.

E.g. Facebook URL to check
https://www.facebook.com/reel/24752508444426222
