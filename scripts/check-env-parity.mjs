import fs from 'node:fs';
import path from 'node:path';

const SERVICE_MATRIX = {
  Clerk: [
    'CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'CLERK_WEBHOOK_SIGNING_SECRET',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  ],
  Razorpay: [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
  ],
  Redis: ['REDIS_URL'],
  Ably: ['ABLY_API_KEY', 'NEXT_PUBLIC_ENABLE_REAL_NOTIFICATIONS'],
  Resend: ['RESEND_API_KEY', 'ENABLE_REAL_EMAILS', 'EMAIL_FROM'],
  'Azure Blob': [
    'AZURE_STORAGE_ACCOUNT_NAME',
    'AZURE_STORAGE_ACCOUNT_KEY',
    'AZURE_STORAGE_CONTAINER_NAME',
    'CORS_ALLOWED_ORIGINS',
  ],
  Postgres: ['DATABASE_URL'],
  URLs: ['APP_URL', 'API_URL', 'FRONTEND_URL', 'ADMIN_URL', 'NEXT_PUBLIC_API_URL'],
};

const REQUIRED_KEYS = [...new Set(Object.values(SERVICE_MATRIX).flat())];

function parseEnvFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  const entries = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    entries.set(key, value);
  }

  return { absolutePath, entries };
}

function summarizeMissing(label, entries, keys) {
  return keys.filter((key) => !entries.has(key) || entries.get(key) === '');
}

function printSection(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

const [stagingPath, productionPath] = process.argv.slice(2);

if (!stagingPath || !productionPath) {
  console.error('Usage: node scripts/check-env-parity.mjs <staging.env> <production.env>');
  process.exit(1);
}

const staging = parseEnvFile(stagingPath);
const production = parseEnvFile(productionPath);

console.log('Semblia env parity audit');
console.log(`Staging:    ${staging.absolutePath}`);
console.log(`Production: ${production.absolutePath}`);

let hasFailures = false;

for (const [service, keys] of Object.entries(SERVICE_MATRIX)) {
  const missingInStaging = summarizeMissing('staging', staging.entries, keys);
  const missingInProduction = summarizeMissing('production', production.entries, keys);

  printSection(service);

  if (missingInStaging.length === 0 && missingInProduction.length === 0) {
    console.log('✓ Required variables are present in both files');
    continue;
  }

  hasFailures = true;

  if (missingInStaging.length > 0) {
    console.log(`Staging missing: ${missingInStaging.join(', ')}`);
  }

  if (missingInProduction.length > 0) {
    console.log(`Production missing: ${missingInProduction.join(', ')}`);
  }
}

const stagingExtras = [...staging.entries.keys()].filter((key) => !REQUIRED_KEYS.includes(key));
const productionExtras = [...production.entries.keys()].filter((key) => !REQUIRED_KEYS.includes(key));

printSection('Additional variables');
console.log(`Staging extras: ${stagingExtras.length > 0 ? stagingExtras.join(', ') : '(none)'}`);
console.log(`Production extras: ${productionExtras.length > 0 ? productionExtras.join(', ') : '(none)'}`);

if (hasFailures) {
  console.error('\nParity audit failed. Fill the missing variables before launch.');
  process.exit(2);
}

console.log('\nParity audit passed. Required launch variables are present in both files.');