#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/* ------------------- Runtime ------------------- */

const fetch = globalThis.fetch;
if (!fetch) process.exit(1);

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

/* ------------------- TOML Parser ------------------- */

function parseToml(input) {
  let i = 0;
  const len = input.length;
  const root = {};
  let current = root;

  const fail = msg => {
    const line = input.slice(0, i).split('\n').length;
    throw new Error(`TOML parse error at line ${line}: ${msg}`);
  };

  const isSpace = c => c === ' ' || c === '\t';
  const skipSpace = () => { while (i < len && isSpace(input[i])) i++; };
  const skipToLineEnd = () => { while (i < len && input[i] !== '\n') i++; };

  const skipTrivia = () => {
    while (i < len) {
      const c = input[i];
      if (isSpace(c) || c === '\n' || c === '\r') i++;
      else if (c === '#') skipToLineEnd();
      else break;
    }
  };

  function parseString(quote) {
    i++;
    let out = '';

    while (i < len && input[i] !== quote) {
      if (quote === '"' && input[i] === '\\') {
        const esc = input[i + 1];
        switch (esc) {
          case 'n': out += '\n'; i += 2; break;
          case 't': out += '\t'; i += 2; break;
          case 'r': out += '\r'; i += 2; break;
          case 'b': out += '\b'; i += 2; break;
          case 'f': out += '\f'; i += 2; break;
          case '"': out += '"'; i += 2; break;
          case '\\': out += '\\'; i += 2; break;
          case 'u': out += String.fromCodePoint(parseInt(input.slice(i + 2, i + 6), 16)); i += 6; break;
          case 'U': out += String.fromCodePoint(parseInt(input.slice(i + 2, i + 10), 16)); i += 10; break;
          default: out += esc; i += 2;
        }
      } else {
        out += input[i++];
      }
    }

    if (input[i] !== quote) fail('unterminated string');
    i++;
    return out;
  }

  function parseKey() {
    skipSpace();
    if (input[i] === '"' || input[i] === "'") return parseString(input[i]);

    const start = i;
    while (i < len && /[A-Za-z0-9_-]/.test(input[i])) i++;
    if (i === start) fail('expected key');
    return input.slice(start, i);
  }

  function parseValue() {
    skipSpace();
    const c = input[i];

    if (c === '"' || c === "'") return parseString(c);
    if (c === '[') return parseArray();
    if (c === '{') return parseInlineTable();
    if (input.startsWith('true', i)) { i += 4; return true; }
    if (input.startsWith('false', i)) { i += 5; return false; }

    const start = i;
    while (i < len && !',]}\n#\r'.includes(input[i])) i++;
    const raw = input.slice(start, i).trim();
    if (!raw) fail('expected value');
    return /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
  }

  function parseArray() {
    i++;
    const arr = [];

    while (true) {
      skipTrivia();
      if (input[i] === ']') { i++; return arr; }

      arr.push(parseValue());
      skipTrivia();

      if (input[i] === ',') { i++; continue; }
      if (input[i] === ']') { i++; return arr; }
      fail("expected ',' or ']' in array");
    }
  }

  function parseInlineTable() {
    i++;
    const obj = {};
    skipSpace();
    if (input[i] === '}') { i++; return obj; }

    while (true) {
      const key = parseKey();
      skipSpace();
      if (input[i] !== '=') fail("expected '=' in inline table");
      i++;
      obj[key] = parseValue();
      skipSpace();

      if (input[i] === ',') { i++; skipSpace(); continue; }
      if (input[i] === '}') { i++; return obj; }
      fail("expected ',' or '}' in inline table");
    }
  }

  function parseTableHeader() {
    i++;
    const parts = [];

    while (true) {
      parts.push(parseKey());
      skipSpace();
      if (input[i] === '.') { i++; continue; }
      break;
    }

    if (input[i] !== ']') fail("expected ']' after table header");
    i++;

    current = parts.reduce((node, part) => {
      if (typeof node[part] !== 'object' || Array.isArray(node[part])) node[part] = {};
      return node[part];
    }, root);
  }

  while (true) {
    skipTrivia();
    if (i >= len) break;

    if (input[i] === '[') {
      parseTableHeader();
      continue;
    }

    const key = parseKey();
    skipSpace();
    if (input[i] !== '=') fail(`expected '=' after key "${key}"`);
    i++;

    current[key] = parseValue();
    skipSpace();
    if (input[i] === '#') skipToLineEnd();
  }

  return root;
}

function normaliseNames(node) {
  if (Array.isArray(node)) return node.forEach(normaliseNames);
  if (!node || typeof node !== 'object') return;

  for (const [key, val] of Object.entries(node)) {
    const isNameShorthand =
      key === 'name' &&
      Array.isArray(val) &&
      val.length === 2 &&
      typeof val[0] === 'string' &&
      val[1] && typeof val[1] === 'object' && !Array.isArray(val[1]) &&
      !('text' in val[1]);

    if (isNameShorthand) node[key] = { text: val[0], ...val[1] };
    else normaliseNames(val);
  }
}

/* ------------------- Schema Validator ------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TYPE_CHECKS = {
  object: v => v !== null && typeof v === 'object' && !Array.isArray(v),
  array: Array.isArray,
  string: v => typeof v === 'string',
  boolean: v => typeof v === 'boolean',
  number: v => typeof v === 'number',
  integer: v => typeof v === 'number' && Number.isInteger(v),
};

function resolveRef(root, ref) {
  const parts = ref.replace(/^#/, '').split('/').filter(Boolean);
  return [parts.reduce((node, part) => node[part], root), `/${parts.join('/')}`];
}

function validateAgainst(instance, schema, root, instancePath, schemaPath, errors) {
  if (schema.$ref) {
    const [target, refPath] = resolveRef(root, schema.$ref);
    return validateAgainst(instance, target, root, instancePath, refPath, errors);
  }

  if (schema.oneOf) {
    const matches = schema.oneOf.filter((sub, i) => {
      const subErrors = [];
      validateAgainst(instance, sub, root, instancePath, `${schemaPath}/oneOf/${i}`, subErrors);
      return !subErrors.length;
    }).length;

    if (matches !== 1) errors.push({ instancePath, schemaPath: `${schemaPath}/oneOf`, message: 'must match exactly one schema in oneOf' });
    return;
  }

  if (schema.anyOf) {
    const matched = schema.anyOf.some((sub, i) => {
      const subErrors = [];
      validateAgainst(instance, sub, root, instancePath, `${schemaPath}/anyOf/${i}`, subErrors);
      return !subErrors.length;
    });

    if (!matched) errors.push({ instancePath, schemaPath: `${schemaPath}/anyOf`, message: 'must match at least one schema in anyOf' });
    return;
  }

  if (schema.type && !TYPE_CHECKS[schema.type](instance)) {
    errors.push({ instancePath, schemaPath: `${schemaPath}/type`, message: `must be ${schema.type}` });
    return;
  }

  if (TYPE_CHECKS.object(instance)) {
    for (const key of schema.required || []) {
      if (!(key in instance)) {
        errors.push({ instancePath, schemaPath: `${schemaPath}/required`, message: `must have required property '${key}'` });
      }
    }

    const properties = schema.properties || {};

    if (schema.additionalProperties === false) {
      for (const k of Object.keys(instance)) {
        if (!(k in properties)) {
          errors.push({ instancePath, schemaPath: `${schemaPath}/additionalProperties`, message: 'must NOT have additional properties' });
        }
      }
    }

    for (const [k, v] of Object.entries(properties)) {
      if (k in instance) validateAgainst(instance[k], v, root, `${instancePath}/${k}`, `${schemaPath}/properties/${k}`, errors);
    }
  }

  if (Array.isArray(instance)) {
    if (schema.minItems !== undefined && instance.length < schema.minItems) {
      errors.push({ instancePath, schemaPath: `${schemaPath}/minItems`, message: `must NOT have fewer than ${schema.minItems} items` });
    }
    if (schema.maxItems !== undefined && instance.length > schema.maxItems) {
      errors.push({ instancePath, schemaPath: `${schemaPath}/maxItems`, message: `must NOT have more than ${schema.maxItems} items` });
    }
    if (schema.items) {
      instance.forEach((item, idx) => validateAgainst(item, schema.items, root, `${instancePath}/${idx}`, `${schemaPath}/items`, errors));
    }
  }

  if (typeof instance === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(instance)) {
      errors.push({ instancePath, schemaPath: `${schemaPath}/pattern`, message: `must match pattern "${schema.pattern}"` });
    }
    if (schema.format === 'email' && !EMAIL_RE.test(instance)) {
      errors.push({ instancePath, schemaPath: `${schemaPath}/format`, message: 'must match format "email"' });
    }
  }
}

function schemaErrors(instance, schema) {
  const errors = [];
  validateAgainst(instance, schema, schema, '', '', errors);
  return errors;
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
  for (const v of availableVersions) {
    if (!schemaErrors(archive, loadSchema(v)).length) return v;
  }
  return null;
}

function resolveVersion(archive) {
  const declared = archive?.version?.replace(/^v/, '');
  const detected = tryVersions(archive);
  const requested =
    versionOverride && availableVersions.includes(versionOverride)
      ? versionOverride
      : null;

  if (declared && detected && declared !== detected) {
    UI.log('error', `Manifest version (v${declared}) does not match requested schema version (v${detected})`);
    process.exit(1);
  }

  if (versionOverride && !requested)
    UI.log('issue', `Version v${versionOverride} not found, auto-detecting...`);

  return requested || declared || detected || version;
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

const CHECK_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; web-archive-txt; +https://github.com/overbrowsing/web-archive.txt)',
};

const probeUrl = url => url.replace(/\{[^}]+\}/g, 'x');

async function check(url, access) {
  if (!url) return ['error', 'no endpoint URL'];
  if (access === 'local' || access === 'offline') return ['skip', null];

  try {
    const res = await fetch(probeUrl(url), { headers: CHECK_HEADERS });
    if (res.ok || res.status === 404) return ['ok', null];
    return ['error', `HTTP ${res.status} ${res.statusText}`.trim()];
  } catch (e) {
    return ['error', e.cause?.message || e.message];
  }
}

/* ------------------- Name Formatting ------------------- */

function formatName(nameField) {
  if (nameField == null) return 'Unknown archive';

  const candidates = Array.isArray(nameField) ? nameField : [nameField];
  const obj = candidates.find(n => n && typeof n === 'object');
  const str = candidates.find(n => typeof n === 'string');

  if (!obj) return str || 'Unknown archive';

  const text = obj.text || str;
  if (obj.en && text) return `${obj.en} (${text})`;
  if (obj.alt && text) return `${text} (${obj.alt})`;
  return text || obj.en || obj.alt || 'Unknown archive';
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

  let archive;
  try {
    archive = parseToml(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    UI.log('error', `TOML parse error: ${e.message}`);
    process.exit(1);
  }
  normaliseNames(archive);

  version = resolveVersion(archive);
  UI.log('info', `Schema detected v${version}`);

  const schema = loadSchema(version);
  const errors = schemaErrors(archive, schema);

  if (errors.length) {
    const index = buildIndex(schema);
    UI.log('error', 'Schema validation error(s) detected');

    for (const e of errors) {
      UI.log('issue', `Property: ${(e.instancePath || '/').replace(/^\//, '').replace(/\//g, '.')}`);
      UI.log('issue', `Value: ${JSON.stringify((e.instancePath || '').split('/').filter(Boolean).reduce((acc, key) => acc?.[key], archive))}`);
      UI.log('issue', `Reason: ${resolveErr(e, index)}`);
      UI.line();
    }

    process.exit(1);
  }

  const endpoints = collectEndpoints(archive);
  let unreachable = 0;

  if (!endpoints.length) {
    UI.log('info', 'No API endpoints declared');
  } else {
    UI.log('info', 'Checking API endpoints...');

    for (const [label, url, access] of endpoints) {
      const [status, detail] = await check(url, access);

      console.log(`    ${label}`);
      console.log(`    ├─ Endpoint: ${url}`);

      const msg =
        status === 'ok'
          ? '└─ Status: Online'
          : status === 'skip'
            ? '└─ Status: Local only'
            : `└─ Status: Unreachable${detail ? ` (${detail})` : ''}`;

      UI.log(status === 'ok' ? 'ok' : status === 'skip' ? 'issue' : 'issue', msg);
      if (status === 'error') unreachable++;
    }
  }

  UI.log('ok', 'Validation passed!');
  if (unreachable) {
    UI.log('issue', `${unreachable} endpoint${unreachable === 1 ? '' : 's'} unreachable (schema is valid; this does not fail validation)`);
  }
  UI.log('info', `Web archive detected: ${formatName(archive?.archive?.name)}`);

  UI.line();
})();