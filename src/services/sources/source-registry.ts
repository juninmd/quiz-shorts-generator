import fs from 'fs';
import path from 'path';
import type { AuditRecord } from '../../domain/audit-record.js';

const LEDGER_FILE_NAME = 'audit-ledger.jsonl';

export const persistAuditRecord = async (
  outputDir: string,
  auditRecord: AuditRecord,
): Promise<string> => {
  fs.mkdirSync(outputDir, { recursive: true });
  const ledgerPath = path.join(outputDir, LEDGER_FILE_NAME);
  fs.appendFileSync(ledgerPath, `${JSON.stringify(auditRecord)}\n`, 'utf8');
  console.log(`INFO: source ledger persisted jobId=${auditRecord.jobId} path=${ledgerPath}`);
  return ledgerPath;
};