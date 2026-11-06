ALTER TABLE "Transaction" ADD CONSTRAINT "transaction_amount_positive" CHECK (amount > 0 AND amount <= 1000000000000);
ALTER TABLE "Transaction" ADD CONSTRAINT "transfer_has_target" CHECK ((type = 'TRANSFER' AND "targetFundId" IS NOT NULL AND "targetFundId" <> "fundId") OR type <> 'TRANSFER');
ALTER TABLE "Transaction" ADD CONSTRAINT "reversal_has_original" CHECK ((type = 'REVERSAL') = ("reversalOfId" IS NOT NULL));
ALTER TABLE "Transaction" ADD CONSTRAINT "public_description_required" CHECK (NOT "isPublic" OR length(trim("publicDescription")) > 0);
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "entry_nonzero" CHECK (amount <> 0);
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "entry_account" CHECK (account IN ('CASH','COUNTER'));
ALTER TABLE "ContributionAllocation" ADD CONSTRAINT "allocation_positive" CHECK (amount > 0);
ALTER TABLE "MemberDue" ADD CONSTRAINT "due_nonnegative" CHECK (amount >= 0);
ALTER TABLE "FundPeriod" ADD CONSTRAINT "period_valid" CHECK ("standardAmount" > 0 AND "dueAt" >= "startAt");
ALTER TABLE "BankTransaction" ADD CONSTRAINT "bank_amount_nonzero" CHECK (amount <> 0);
ALTER TABLE "Fund" ADD CONSTRAINT "fund_amounts_nonnegative" CHECK ("lowBalance" >= 0 AND "goalAmount" >= 0);
ALTER TABLE "GroupMember" ADD CONSTRAINT "roles_not_empty" CHECK (cardinality(roles) > 0);
ALTER TABLE "GroupMember" ADD CONSTRAINT "approval_limit_positive" CHECK ("approvalLimit" IS NULL OR "approvalLimit" > 0);

CREATE FUNCTION prevent_posted_transaction_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'POSTED' THEN RAISE EXCEPTION 'Posted transactions are immutable' USING ERRCODE = '23514'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_posted_transaction BEFORE UPDATE OR DELETE ON "Transaction" FOR EACH ROW EXECUTE FUNCTION prevent_posted_transaction_changes();

CREATE FUNCTION prevent_posted_entry_changes() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_status "TransactionStatus";
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT status INTO parent_status FROM "Transaction" WHERE id = OLD."transactionId";
    IF parent_status = 'POSTED' THEN RAISE EXCEPTION 'Posted ledger entries are immutable' USING ERRCODE = '23514'; END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT status INTO parent_status FROM "Transaction" WHERE id = NEW."transactionId";
    IF parent_status = 'POSTED' THEN RAISE EXCEPTION 'Cannot insert into a posted ledger' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER immutable_posted_entry BEFORE INSERT OR UPDATE OR DELETE ON "LedgerEntry" FOR EACH ROW EXECUTE FUNCTION prevent_posted_entry_changes();

CREATE FUNCTION verify_ledger_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tx "Transaction"; total numeric; entry_count bigint; cash_count bigint; source_group text; target_group text;
BEGIN
  SELECT * INTO tx FROM "Transaction" WHERE id = NEW.id;
  IF tx.status <> 'POSTED' THEN RETURN NULL; END IF;
  SELECT COALESCE(SUM(amount),0),COUNT(*),COUNT(*) FILTER(WHERE account='CASH') INTO total,entry_count,cash_count FROM "LedgerEntry" WHERE "transactionId"=tx.id;
  IF total<>0 OR entry_count<2 OR cash_count<1 THEN RAISE EXCEPTION 'Ledger must be balanced with cash entries' USING ERRCODE='23514'; END IF;
  IF tx."postedAt" IS NULL OR NOT EXISTS(SELECT 1 FROM "Approval" WHERE "transactionId"=tx.id AND action='APPROVE') THEN RAISE EXCEPTION 'Posted transaction requires approval and posting time' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM "LedgerEntry" e WHERE e."transactionId"=tx.id AND e."fundId"<>tx."fundId" AND (tx."targetFundId" IS NULL OR e."fundId"<>tx."targetFundId")) THEN RAISE EXCEPTION 'Ledger fund mismatch' USING ERRCODE='23514'; END IF;
  IF tx."targetFundId" IS NOT NULL THEN
    SELECT "groupId" INTO source_group FROM "Fund" WHERE id=tx."fundId";
    SELECT "groupId" INTO target_group FROM "Fund" WHERE id=tx."targetFundId";
    IF source_group<>target_group THEN RAISE EXCEPTION 'Cross-group transfers forbidden' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER balanced_posted_transaction AFTER INSERT OR UPDATE ON "Transaction" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_ledger_transaction();

CREATE FUNCTION verify_entry_parent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM "LedgerEntry" e JOIN "Transaction" t ON t.id=e."transactionId" WHERE e.id=NEW.id AND t.status<>'POSTED') THEN RAISE EXCEPTION 'Ledger entries require a posted transaction at commit' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER entries_must_be_posted AFTER INSERT OR UPDATE ON "LedgerEntry" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_entry_parent();

CREATE FUNCTION prevent_audit_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit evidence is append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_audit_changes();
CREATE TRIGGER immutable_approvals BEFORE UPDATE OR DELETE ON "Approval" FOR EACH ROW EXECUTE FUNCTION prevent_audit_changes();
CREATE TRIGGER immutable_reconciliations BEFORE UPDATE OR DELETE ON "Reconciliation" FOR EACH ROW EXECUTE FUNCTION prevent_audit_changes();
CREATE TRIGGER immutable_adjustments BEFORE UPDATE OR DELETE ON "DueAdjustment" FOR EACH ROW EXECUTE FUNCTION prevent_audit_changes();
