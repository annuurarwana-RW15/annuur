-- CreateIndex
CREATE INDEX "Transaction_periodId_date_idx" ON "Transaction"("periodId", "date");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
