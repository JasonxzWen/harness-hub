#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const MOJIBAKE = new RegExp(['\\?{3,}', '\\u951f', '\\u9359', '\\u6d93', '\\u7ed7', '\\u7487', '\\uFFFD'].join('|'));
const REQUIRED_MARKERS = [
  'data-source-to-insight-blog',
  'id="source-fidelity"',
  'id="media-ledger"',
  'id="effective-interact-summary"',
  'id="project-iteration"',
  '原文',
  'Effective Interact',
];
const FORBIDDEN_MARKERS = [
  'data-html-work-report',
  '<h2>Source Claims</h2>',
  '<h2>Viewpoint Extraction</h2>',
  '<h2>Project Mapping</h2>',
];

function usage() {
  return `Usage: node skills/source-to-insight-blog/scripts/validate-source-blog.mjs <post-dir> [--json]\n\nValidates a source-backed insight blog post directory for readable blog shape, media/source coverage, and UTF-8 hygiene.`;
}

function checkPost(postDir) {
  const htmlPath = path.join(postDir, 'index.html');
  const effectiveInteractPath = path.join(postDir, 'effective-interact-summary.html');
  const ledgerPath = path.join(postDir, 'source-ledger.json');
  const postJsonPath = path.join(postDir, 'post.json');
  const checks = [];

  function push(code, state, reason, evidence = []) {
    checks.push({ code, state, reason, evidence });
  }

  if (!fs.existsSync(htmlPath)) {
    push('html-file', 'fail', 'index.html is missing.');
    return checks;
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  push('utf8', MOJIBAKE.test(html) ? 'fail' : 'pass', MOJIBAKE.test(html) ? 'HTML contains likely mojibake.' : 'HTML has no common mojibake markers.');

  const missing = REQUIRED_MARKERS.filter((marker) => !html.includes(marker));
  push('required-shape', missing.length === 0 ? 'pass' : 'fail', missing.length === 0 ? 'Required source-blog sections are present.' : `Missing required source-blog markers: ${missing.join(', ')}.`, missing);

  const forbidden = FORBIDDEN_MARKERS.filter((marker) => html.includes(marker));
  push('raw-report-shape', forbidden.length === 0 ? 'pass' : 'fail', forbidden.length === 0 ? 'Blog does not expose raw effective-interact report sections as the main shape.' : `Raw report markers found: ${forbidden.join(', ')}.`, forbidden);

  const imageCount = (html.match(/<img\b/gi) || []).length;
  push('media-visible', imageCount > 0 ? 'pass' : 'fail', imageCount > 0 ? `${imageCount} image references are visible in the public post.` : 'No visible image references found.');

  const sourceLinkCount = (html.match(/https:\/\/openai\.com\/index\/trustworthy-third-party-evaluations-foundations\//g) || []).length;
  push('canonical-source', sourceLinkCount > 0 ? 'pass' : 'fail', sourceLinkCount > 0 ? 'Canonical source URL is linked.' : 'Canonical source URL is missing.');

  push('effective-interact-artifact', fs.existsSync(effectiveInteractPath) ? 'pass' : 'fail', fs.existsSync(effectiveInteractPath) ? 'Effective-interact summary artifact exists.' : 'effective-interact-summary.html is missing.');

  if (!fs.existsSync(ledgerPath)) {
    push('source-ledger', 'fail', 'source-ledger.json is missing.');
  } else {
    try {
      const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
      const media = Array.isArray(ledger.media) ? ledger.media : [];
      const links = Array.isArray(ledger.references) ? ledger.references : [];
      push('ledger-media', media.length > 0 ? 'pass' : 'fail', media.length > 0 ? `${media.length} media entries recorded.` : 'Source ledger has no media entries.');
      push('ledger-references', links.length > 0 ? 'pass' : 'fail', links.length > 0 ? `${links.length} references recorded.` : 'Source ledger has no reference entries.');
    } catch (error) {
      push('source-ledger', 'fail', `source-ledger.json is not valid JSON: ${error.message}`);
    }
  }

  if (!fs.existsSync(postJsonPath)) {
    push('post-json', 'fail', 'post.json is missing.');
  }

  return checks;
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(usage());
  process.exit(0);
}

const json = args.includes('--json');
const postDirArg = args.find((arg) => !arg.startsWith('-'));
if (!postDirArg) {
  console.error(usage());
  process.exit(2);
}

const postDir = path.resolve(postDirArg);
const checks = checkPost(postDir);
const failures = checks.filter((check) => check.state === 'fail');
const result = {
  schemaVersion: 1,
  postDir,
  exitCode: failures.length > 0 ? 3 : 0,
  checks,
  reason: failures.length > 0 ? `${failures.length} source blog checks failed.` : 'Source blog validation passed.',
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(result.reason);
  for (const check of checks) {
    console.log(`${check.state.toUpperCase()} ${check.code}: ${check.reason}`);
  }
}

process.exitCode = result.exitCode;
