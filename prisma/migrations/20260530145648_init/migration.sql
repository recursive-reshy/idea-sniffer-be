-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'SCRAPING', 'READY', 'INGESTING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "PreFilterStatus" AS ENUM ('PENDING', 'PASS', 'DROP', 'MALFORMED');

-- CreateEnum
CREATE TYPE "PreFilterMode" AS ENUM ('LENIENT', 'STRICT');

-- CreateEnum
CREATE TYPE "FilterRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "SignalCategory" AS ENUM ('missing_tool', 'broken_workflow', 'switching_frustration', 'manual_process');

-- CreateEnum
CREATE TYPE "MarketSize" AS ENUM ('small', 'medium', 'large');

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "subreddit" TEXT,
    "sortBy" TEXT,
    "totalFetched" INTEGER NOT NULL DEFAULT 0,
    "totalStored" INTEGER NOT NULL DEFAULT 0,
    "totalSkipped" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bronze_records" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "preFilterStatus" "PreFilterStatus" NOT NULL DEFAULT 'PENDING',
    "preFilterMode" "PreFilterMode",
    "haikuCostUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bronze_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filter_runs" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "preFilterMode" "PreFilterMode" NOT NULL,
    "status" "FilterRunStatus" NOT NULL DEFAULT 'PENDING',
    "totalProcessed" INTEGER NOT NULL DEFAULT 0,
    "totalPassed" INTEGER NOT NULL DEFAULT 0,
    "totalDropped" INTEGER NOT NULL DEFAULT 0,
    "totalMalformed" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filter_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "silver_signals" (
    "id" TEXT NOT NULL,
    "bronzeRecordId" TEXT NOT NULL,
    "painScore" INTEGER NOT NULL,
    "painSummary" TEXT NOT NULL,
    "category" "SignalCategory" NOT NULL,
    "evidenceQuotes" TEXT[],
    "marketSize" "MarketSize" NOT NULL,
    "sourceMeta" JSONB NOT NULL,
    "preFilterMode" "PreFilterMode" NOT NULL,
    "promotionThreshold" INTEGER NOT NULL,
    "sonnetCostUsd" DOUBLE PRECISION NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "silver_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bronze_records_runId_idx" ON "bronze_records"("runId");

-- CreateIndex
CREATE INDEX "bronze_records_preFilterStatus_idx" ON "bronze_records"("preFilterStatus");

-- CreateIndex
CREATE UNIQUE INDEX "bronze_records_provider_externalId_key" ON "bronze_records"("provider", "externalId");

-- CreateIndex
CREATE INDEX "filter_runs_runId_idx" ON "filter_runs"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "silver_signals_bronzeRecordId_key" ON "silver_signals"("bronzeRecordId");

-- CreateIndex
CREATE INDEX "silver_signals_painScore_idx" ON "silver_signals"("painScore");

-- AddForeignKey
ALTER TABLE "bronze_records" ADD CONSTRAINT "bronze_records_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filter_runs" ADD CONSTRAINT "filter_runs_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "silver_signals" ADD CONSTRAINT "silver_signals_bronzeRecordId_fkey" FOREIGN KEY ("bronzeRecordId") REFERENCES "bronze_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
