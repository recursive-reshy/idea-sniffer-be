# Idea Sniffer — Backend

A NestJS REST API that automates pain signal discovery from developer communities (Reddit, G2, X). It scrapes raw posts, pre-filters them with Claude Haiku, and distills structured signals with Claude Sonnet — producing a ranked list of real user pain points.

## Architecture

```
Reddit / G2 / X
      │
      ▼
  [Scrape]  POST /api/v1/reddit/run
      │  → bronze records (raw JSON, local + Supabase)
      ▼
  [Filter]  POST /api/v1/filter
      │  → pre-filter with Claude Haiku (PASS / DROP / MALFORMED)
      ▼
  [Distill] POST /api/v1/distill
            → extract structured silver signals with Claude Sonnet
```

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+
- A [Supabase](https://supabase.com/) project (PostgreSQL)
- API keys for [Anthropic](https://console.anthropic.com/), [Bright Data](https://brightdata.com/), and [Firecrawl](https://firecrawl.dev/)

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/recursive-reshy/idea-sniffer-be.git
cd idea-sniffer-be
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in every value:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude Haiku + Sonnet) |
| `BRIGHT_DATA_API_KEY` | Bright Data API key for scraping |
| `FIRECRAWL_API_KEY` | Firecrawl API key |
| `DATABASE_URL` | Supabase connection string (pooled, for the app) |
| `DIRECT_URL` | Supabase direct connection string (for Prisma migrations) |
| `CACHE_DIR` | Absolute path for the local cache directory |
| `BRONZE_DIR` | Absolute path for raw scraped data |
| `FILTERED_DIR` | Absolute path for pre-filtered data |
| `SILVER_DIR` | Absolute path for distilled signals |

Create the local storage directories (they will not be created automatically):

```bash
mkdir -p <CACHE_DIR> <BRONZE_DIR> <FILTERED_DIR> <SILVER_DIR>
```

### 3. Run database migrations

```bash
pnpm dlx prisma generate
```

> For local development you can also use `pnpm prisma db push` to sync the schema without creating migration files.

### 4. Start the server

```bash
# development (watch mode)
pnpm run start:dev

# production
pnpm run build
pnpm run start:prod
```

The API is available at `http://localhost:3000/api/v1`.

## API reference

All routes are prefixed with `/api/v1`.

### Health

```
GET /health
```

### Reddit scrape run

```
POST /reddit/run
Content-Type: application/json

{
  "subreddits": ["SaaS", "Entrepreneur"],
  "sortBy": "hot"
}
```

Scrapes posts from the given subreddits and persists them as bronze records.

### Filter

```
POST /filter
Content-Type: application/json

{
  "bronzeFile": "<path to bronze snapshot file>",
  "filtermode": "LENIENT" | "STRICT"
}
```

Runs Claude Haiku over the bronze records and marks each one `PASS`, `DROP`, or `MALFORMED`.

### Distill

```
POST /distill
Content-Type: application/json

{
  "filteredFile": "<path to filtered snapshot file>",
  "outputMode": "db" | "file",
  "filterMode": "LENIENT" | "STRICT"
}
```

Runs Claude Sonnet over `PASS` records to extract structured silver signals (pain score, category, market size, evidence quotes).

## Development

```bash
# run tests
pnpm run test

# test coverage
pnpm run test:cov

# lint
pnpm run lint

# format
pnpm run format

# open Prisma Studio
pnpm prisma studio
```

## Tech stack

- [NestJS](https://nestjs.com/) with Fastify adapter
- [Prisma](https://www.prisma.io/) ORM — PostgreSQL via Supabase
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) — Claude Haiku (filter) + Claude Sonnet (distill)
- [Firecrawl](https://firecrawl.dev/) — web scraping
- [Bright Data](https://brightdata.com/) — proxy / scraping infrastructure
- TypeScript, pnpm
