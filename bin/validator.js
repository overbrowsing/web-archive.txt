#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const toml = require('@iarna/toml');

/* ------------------- Runtime ------------------- */

const fetch = globalThis.fetch;
if (!fetch) {
  process.exit(1);
}

/* ------------------- CLI Arguments ------------------- */

const args = process.argv.slice(2);

let file = 'web-archive.txt';
let versionOverride = null;

for (const a of args) {
  if (a.startsWith('--')) versionOverride = a.slice(2);
  else file = a;
}

/* ------------------- Schema Resolution ------------------- */

const SCHEMA_ROOT = path.join(__dirname, '..', 'specification');

const availableVersions = fs
  .readdirSync(SCHEMA_ROOT)
  .filter(v => /^v\d+\.\d+$/.test(v))
  .map(v => v.slice(1))
  .sort((a, b) => parseFloat(a) - parseFloat(b));

if (!availableVersions.length) {
  console.error('No schema versions found');
  process.exit(1);
}

let version = availableVersions.at(-1);

/* ------------------- Terminal UI ------------------- */

const UI = {
  symbols: { 
    info:  '[▪]', 
    ok:    '[✓]', 
    error: '[✕]', 
    issue: '[-]'
  },

  colors: {
    cyan:   '\x1b[36m',
    green:  '\x1b[32m',
    red:    '\x1b[31m',
    yellow: '\x1b[33m',
    reset:  '\x1b[0m',
  },

  paint(t, c) {
    return `${this.colors[c]}${t}${this.colors.reset}`;
  },

  log(type, msg) {
    const map = {
      info:  ['info', 'cyan'],
      ok:    ['ok', 'green'],
      error: ['error', 'red'],
      issue: ['issue', 'yellow'],
    };

    const [k, c] = map[type] || map.info;
    console.log(`${this.paint(this.symbols[k], c)} ${msg}`);
  },

  line() {
    console.log('');
  },
};

/* ------------------- TOML Normalisation ------------------- */

function normaliseToml(raw) {
  return raw.replace(
    /name\s*=\s*\[\s*"([^"]+)"\s*,\s*\{([^}]+)\}\s*\]/g,
    (_, text, obj) => {
      const fields = obj
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .join(', ');

      return `name = { text = "${text}", ${fields} }`;
    }
  );
}

/* ------------------- Schema Indexing ------------------- */

function buildIndex(schema) {
  const map = new Map();

  const walk = (n, p = '') => {
    if (!n || typeof n !== 'object') return;

    if (n.description) map.set(p, n.description);

    if (n.properties)
      for (const [k, v] of Object.entries(n.properties))
        walk(v, `${p}/properties/${k}`);

    if (n.items) walk(n.items, `${p}/items`);

    if (n.definitions)
      for (const [k, v] of Object.entries(n.definitions))
        walk(v, `${p}/definitions/${k}`);

    n.oneOf?.forEach((v, i) => walk(v, `${p}/oneOf/${i}`));
    n.anyOf?.forEach((v, i) => walk(v, `${p}/anyOf/${i}`));
  };

  walk(schema);
  return map;
}

/* ------------------- Error Resolver ------------------- */

const resolveErr = (err, index) => {
  const p = (err.schemaPath || '')
    .replace(/^#/, '')
    .replace(/\/(pattern|type|format|minLength|maxLength|minimum|maximum)$/, '');

  return index.get(p) || index.get(p.replace(/\/[^/]+$/, '')) || err.message;
};

/* ------------------- Version Resolver ------------------- */

function loadSchema(v) {
  return require(path.join(SCHEMA_ROOT, `v${v}`, 'schema.json'));
}

function tryVersions(archive) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  for (const v of availableVersions) {
    const validate = ajv.compile(loadSchema(v));
    if (validate(archive)) return v;
  }

  return null;
}

function resolveVersion(archive) {
  const declared = archive?.version?.replace(/^v/, '');

  if (versionOverride) {
    if (availableVersions.includes(versionOverride)) return versionOverride;
    UI.log('issue', 'Version not found, auto-detecting...');
    return tryVersions(archive) || version;
  }

  if (declared && availableVersions.includes(declared)) return declared;

  return tryVersions(archive) || version;
}

/* ------------------- API Endpoint Collector ------------------- */

const collectEndpoints = ({ api = {} }) =>
  [
    ['CDX Server API', api.cdx?.query],
    ['TimeMap (Memento Protocol)', api.memento?.timemap],
    ['TimeGate (Memento Protocol)', api.memento?.timegate],
  ]
    .filter(([, e]) => e?.endpoint)
    .map(([label, e]) => [label, e.endpoint, e.access || 'online']);

async function check(url, access) {
  if (!url) return 'error';
  if (access === 'local' || access === 'offline') return 'skip';

  try {
    const origin = new URL(url).origin;
    const res = await fetch(origin, { method: 'HEAD' });
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

/* ------------------- Main CLI ------------------- */

(async function main() {
  UI.line();
  UI.log('info', `Checking ${file}...`);

  const filePath = path.resolve(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    UI.log('error', 'File not found');
    process.exit(1);
  }

  const archive = toml.parse(normaliseToml(fs.readFileSync(filePath, 'utf8')));

  version = resolveVersion(archive);

  UI.log('info', `Using schema v${version}...`);

  const schema = loadSchema(version);
  const index = buildIndex(schema);

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);

  if (!validate(archive)) {
    UI.log('error', 'Schema validation error(s) detected');

    for (const e of validate.errors || []) {
      UI.log('issue', `Property: ${(e.instancePath || '/').replace(/^\//, '').replace(/\//g, '.')}`);
      UI.log('issue', `Value: ${JSON.stringify((e.instancePath || '').split('/').filter(Boolean).reduce((acc, key) => acc?.[key], archive))}`);
      UI.log('issue', `Reason: ${resolveErr(e, index)}`);
      UI.line();
    }

    process.exit(1);
  }

  const endpoints = collectEndpoints(archive);
  let ok = true;

  if (!endpoints.length) UI.log('info', 'No API endpoints declared');
  else {
    UI.log('info', 'Checking API endpoints...');

    for (const [label, url, access] of endpoints) {
      const status = await check(url, access);

      console.log(`    ${label}`);
      console.log(`    ├─ Endpoint: ${url}`);

      const msg =
        status === 'ok'
          ? '└─ Status: Online'
          : status === 'skip'
            ? '└─ Status: Local only'
            : '└─ Status: Offline';

      UI.log(status === 'ok' ? 'ok' : status === 'skip' ? 'issue' : 'error', msg);

      if (status === 'error') ok = false;
    }
  }

  const name =
    archive?.archive?.name?.text ||
    archive?.archive?.name?.en ||
    archive?.archive?.name?.alt ||
    archive?.archive?.name ||
    'Unknown archive';

  UI.log(ok ? 'ok' : 'error', ok ? 'Validation passed!' : 'Validation failed');
  UI.log('info', `Web archive detected: ${name}`);

  if (!ok) process.exit(1);

  UI.line();
})();