-- CreateTable
CREATE TABLE "ReplayEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplayEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReplayEvent_sessionId_timestamp_idx" ON "ReplayEvent"("sessionId", "timestamp");

-- AddForeignKey
ALTER TABLE "ReplayEvent" ADD CONSTRAINT "ReplayEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
