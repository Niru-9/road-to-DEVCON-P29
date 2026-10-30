import { loadConfig } from '../config.js';
import { closeDatabase, openDatabase } from '../db/client.js';

const config = loadConfig();
const db = openDatabase(config.databasePath);
db.prepare('SELECT 1 AS ok').get();
closeDatabase(db);

console.log(`Database ready at ${config.databasePath}`);
console.log('Schema migrated (idempotent CREATE TABLE IF NOT EXISTS statements).');
