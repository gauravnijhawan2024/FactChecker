# FactChecker

AI-powered fact-checking app built with React, Vite, TypeScript, TailwindCSS, Node.js, Express, MongoDB, Mongoose, OpenAI, and Playwright.

## Run Locally

```bash
npm install
cp backend/.env.example backend/.env
npm run dev
```

Set `OPENAI_API_KEY` and `MONGODB_URI` in `backend/.env` before running real analyses.

## API

- `POST /api/analyze/url`
- `POST /api/analyze/text`
- `POST /api/analyze/image`
- `GET /api/analyze/:id`
- `DELETE /api/analyze/:id`

## Workflow

The API creates an analysis record, returns an `analysisId`, and processes extraction, claim identification, evidence search, and verdict generation in the background.

