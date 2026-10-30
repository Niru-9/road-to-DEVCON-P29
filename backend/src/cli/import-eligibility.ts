import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { Command } from 'commander';
import pino from 'pino';
import { loadConfig } from '../config.js';
import { getRoundByAddress } from '../db/rounds.js';
import { createRuntime } from '../runtime.js';
import { importEligibility } from '../services/eligibility.js';
import { normalizeAddress } from '../utils/address.js';
import {
  normalizeEligibilityInputs,
  parseEligibilityCsv,
  type EligibilityJsonEntry,
} from '../utils/csv.js';

interface ImportOptions {
  file: string;
  source?: string;
}

function parseJsonFile(text: string): EligibilityJsonEntry[] {
  const parsed: unknown = JSON.parse(text);
  const candidates = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { addresses?: unknown }).addresses)
      ? (parsed as { addresses: unknown[] }).addresses
      : null;

  if (!candidates) {
    throw new Error('JSON eligibility files must be an array or an object with an `addresses` array');
  }

  return candidates.map((entry, index) => {
    if (typeof entry === 'string') return { address: entry };
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      if (typeof record.address !== 'string') {
        throw new Error(`Entry ${index} is missing a string "address" field`);
      }
      return {
        address: record.address,
        label: typeof record.label === 'string' ? record.label : undefined,
        source: typeof record.source === 'string' ? record.source : undefined,
      };
    }
    throw new Error(`Entry ${index} is not an address string or object`);
  });
}

async function main(): Promise<void> {
  const program = new Command()
    .name('eligibility:import')
    .description('Build the eligibility Merkle tree from a CSV/JSON file and print setEligibilityRoot calldata')
    .argument('<address>', 'deployed round contract address')
    .requiredOption('-f, --file <path>', 'CSV or JSON file of eligible addresses')
    .option('-s, --source <label>', 'source label stored with the eligibility set')
    .parse(process.argv);

  const [addressInput] = program.args;
  const options = program.opts<ImportOptions>();
  const config = loadConfig();
  const runtime = createRuntime(config, pino({ level: 'warn' }));

  try {
    const address = normalizeAddress(addressInput!, 'address');
    const round = getRoundByAddress(runtime.ctx.db, address, config.chainId);
    if (!round) {
      throw new Error(
        `Round ${address} is not indexed. Add it first with \`npm run round:add -- ${address} --start-block <n>\`.`,
      );
    }

    const text = readFileSync(options.file, 'utf8');
    const isJson = extname(options.file).toLowerCase() === '.json';
    const source = options.source ?? (isJson ? 'json-file' : 'csv-file');
    const entries = isJson
      ? normalizeEligibilityInputs(parseJsonFile(text), source)
      : parseEligibilityCsv(text, source);

    const result = importEligibility(runtime.ctx.db, round, entries, source);

    console.log(
      JSON.stringify(
        {
          round: round.address,
          root: result.root,
          leafCount: result.leafCount,
          duplicatesRemoved: result.duplicates.length,
          onchainRoot: result.onchainRoot,
          rootMatchesOnchain: result.rootMatchesOnchain,
          warnings: result.warnings,
          transaction: result.transaction,
          next:
            'Submit the transaction above from the operator wallet (Remix or a wallet), then run `npm run sync`.',
        },
        null,
        2,
      ),
    );

    if (!result.rootMatchesOnchain) process.exitCode = 2;
  } finally {
    runtime.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
