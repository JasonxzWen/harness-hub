#!/usr/bin/env node

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const LIFECYCLE_GATES = Object.freeze([
  'align-user-need',
  'gather-required-material',
  'write-spec-and-acceptance',
  'write-executable-plan-and-align',
  'clean-unneeded-files',
  'implement',
  'test-and-accept',
  'finish-closeout',
  'deliver-report',
]);

const STATE_CONFIG = Object.freeze({
  question: {
    owner: 'answer-workflow',
    mutationAllowed: false,
    requiredGates: ['gather-required-material', 'deliver-report'],
    nextGate: 'Gather required material and answer from evidence.',
    helpers: ['documentation-lookup', 'package-release-sniffer'],
    effectiveInteract: 'default-consider',
  },
  'sdd-change': {
    owner: 'sdd-workflow',
    mutationAllowed: true,
    requiredGates: LIFECYCLE_GATES,
    nextGate: 'Align user need before specification, tests, implementation, review, and delivery.',
    helpers: ['product-capability', 'tdd-workflow', 'verification-loop'],
    effectiveInteract: 'required',
  },
  diagnosis: {
    owner: 'diagnosis-workflow',
    mutationAllowed: true,
    requiredGates: [
      'align-user-need',
      'gather-required-material',
      'write-executable-plan-and-align',
      'implement',
      'test-and-accept',
      'finish-closeout',
      'deliver-report',
    ],
    nextGate: 'Reproduce or bound the symptom before fixing.',
    helpers: ['diagnose', 'agent-introspection-debugging', 'webapp-testing'],
    effectiveInteract: 'default-consider',
  },
  review: {
    owner: 'review-workflow',
    mutationAllowed: false,
    requiredGates: ['gather-required-material', 'deliver-report'],
    nextGate: 'Gather review evidence and report findings first.',
    helpers: ['compound-code-review', 'security-review', 'web-design-guidelines', 'agent-interaction-audit'],
    effectiveInteract: 'default-consider',
  },
  delivery: {
    owner: 'delivery-workflow',
    mutationAllowed: true,
    requiredGates: ['clean-unneeded-files', 'test-and-accept', 'finish-closeout', 'deliver-report'],
    nextGate: 'Verify acceptance, authorization, delivery state, and residual risk.',
    helpers: ['verification-loop', 'effective-interact', 'handoff'],
    effectiveInteract: 'required',
  },
  clarify: {
    owner: null,
    mutationAllowed: false,
    requiredGates: ['align-user-need'],
    nextGate: 'Ask one concise blocking question.',
    helpers: [],
    effectiveInteract: 'not-needed',
  },
  none: {
    owner: null,
    mutationAllowed: false,
    requiredGates: [],
    nextGate: 'No workflow owner needed.',
    helpers: [],
    effectiveInteract: 'not-needed',
  },
});

const OWNER_STATE = Object.freeze({
  'answer-workflow': 'question',
  'sdd-workflow': 'sdd-change',
  'diagnosis-workflow': 'diagnosis',
  'review-workflow': 'review',
  'delivery-workflow': 'delivery',
});

const SIGNALS = Object.freeze({
  trivial: ['thanks', 'thank you', 'ok', 'okay', '好的', '谢谢', '明白', '收到'],
  vague: ['do the thing next', 'continue that', '继续那个', '接着那个', '下一步做那个'],
  noMutation: ['do not change', "don't change", 'no edits', 'read-only', '不要改', '先别改', '不要修改', '只读'],
  question: [
    'where', 'why', 'can it', 'can this', 'compare', 'describe', 'explain', 'look up', 'what is', 'what are',
    'evidence', '哪里', '为什么', '能否', '可以吗', '对比', '描述', '解释', '介绍', '梳理', '查一下', '说说', '证据', '总结',
  ],
  change: [
    'add', 'change', 'fix', 'refactor', 'implement', 'build', 'migrate', 'remove', 'delete', 'update code', 'make it',
    'harden', 'tighten', 'normalize', '增加', '新增', '修改', '修复', '重构', '实现', '实施', '构建', '迁移', '移除', '删除',
    '补齐', '收敛', '规范化', '统一', '改成', '强化', '完善',
  ],
  diagnosis: [
    'fails', 'failing', 'failed', 'error', 'crash', 'broken', 'bug', 'flaky', 'hang', 'stuck', 'regression',
    'performance', 'reproduce', 'root cause', '失败', '报错', '崩溃', '卡住', '复现', '根因', '性能', '回归',
  ],
  review: [
    'review', 'audit', 'assess', 'risk', 'security', 'missing tests', 'check ui', 'check ux', 'confidence',
    '审查', '评审', '评估', '风险', '安全', '缺测试', '检查', '边界',
  ],
  delivery: [
    'finish', 'validate', 'clean up', 'handoff', 'release notes', 'closeout', 'final', 'create pr', 'open pr',
    'pull request status', 'mergeability', 'mergeable', 'status checks', 'check runs', 'ci status', 'merge conflict',
    '完成', '收尾', '验证', '清理', '交付', '提交 pr', '创建 pr', '合并状态', '可合并', 'ci 状态', '合并冲突',
  ],
  packageDiscovery: [
    'package release', 'newly published', 'latest version', 'release feed', 'version sniff', 'registry feed',
    '版本嗅探', '发布嗅探', '新包', '新版本', '包发布',
  ],
});

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesSignal(text, signal) {
  const value = signal.toLowerCase();
  if (/^[a-z0-9'/-]+(?:\s+[a-z0-9'/-]+)*$/.test(value)) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
  }
  return text.includes(value);
}

function includesAny(text, values) {
  return values.some((value) => matchesSignal(text, value));
}

function explicitOwner(text) {
  for (const [owner, state] of Object.entries(OWNER_STATE)) {
    if (text.includes(owner)) {
      return { owner, state };
    }
  }
  return null;
}

function makeResult(state, confidence, reason, extras = {}) {
  const config = STATE_CONFIG[state];
  return {
    schemaVersion: 1,
    state,
    owner: config.owner,
    confidence,
    reason,
    mutationAllowed: config.mutationAllowed,
    requiredGates: [...config.requiredGates],
    nextGate: config.nextGate,
    allowedHelperSkills: [...config.helpers],
    effectiveInteract: config.effectiveInteract,
    expectedOutputMode: null,
    mutates: false,
    ...extras,
  };
}

export function classifyIntent(prompt) {
  const text = normalize(prompt);
  if (!text) {
    return makeResult('none', 'high', 'The request is empty.');
  }
  const stripped = text.replace(/[.!?。！？\s]+$/g, '');
  if (SIGNALS.trivial.includes(stripped)) {
    return makeResult('none', 'high', 'The request is trivial chat.');
  }

  const owner = explicitOwner(text);
  const noMutation = includesAny(text, SIGNALS.noMutation);
  const question = includesAny(text, SIGNALS.question);
  const change = includesAny(text, SIGNALS.change);
  const diagnosis = includesAny(text, SIGNALS.diagnosis);
  const review = includesAny(text, SIGNALS.review);
  const delivery = includesAny(text, SIGNALS.delivery);
  const stagedReviewThenChange = review && change
    && /(?:first|先)[\s\S]*(?:audit|review|审计|评审)[\s\S]*(?:then|after|然后|完成[^。.!?]*后|再)[\s\S]*(?:implement|continue|fix|实施|继续|修复)/i.test(text);

  if (includesAny(text, SIGNALS.vague) && !owner && !change) {
    return makeResult('clarify', 'medium', 'The request depends on missing prior intent.', {
      clarification: 'Should I review, implement, or deliver the current work?',
    });
  }
  if (stagedReviewThenChange) {
    return makeResult('sdd-change', 'high', 'The request explicitly stages a read-only review before authorized implementation.');
  }
  if (noMutation && !stagedReviewThenChange && (review || question)) {
    return makeResult(review ? 'review' : 'question', 'high', 'The user explicitly requested read-only evidence.');
  }
  if (includesAny(text, SIGNALS.packageDiscovery) && !change && !review) {
    return makeResult('question', 'high', 'The request is read-only release discovery.');
  }
  if ((text.includes('repository') || text.includes('repo') || text.includes('仓库'))
    && (text.includes('structure') || text.includes('architecture') || text.includes('结构') || text.includes('架构'))
    && !change) {
    return makeResult('question', 'high', 'A repository explainer benefits from a navigable report.', {
      effectiveInteract: 'required',
      expectedOutputMode: 'html-artifact',
    });
  }
  if (review && change && !noMutation) {
    return makeResult('sdd-change', 'high', 'The request explicitly authorizes mutation; review is a stage inside the SDD Workflow, not a competing owner.');
  }
  if (owner) {
    return makeResult(owner.state, 'high', `The user explicitly referenced ${owner.owner}.`);
  }
  if (diagnosis) {
    return makeResult('diagnosis', 'high', 'The request starts from failure evidence.');
  }
  if (delivery && !change) {
    return makeResult('delivery', 'high', 'The request asks for validation, delivery, or closeout.');
  }
  if (review) {
    return makeResult('review', 'high', 'The request asks for review or risk assessment.');
  }
  if (question && !change) {
    return makeResult('question', 'high', 'The request asks for evidence or explanation.');
  }
  if (change) {
    return makeResult('sdd-change', 'high', 'The request asks to change repository behavior.');
  }
  return makeResult('none', 'low', 'No non-trivial workflow owner signal was detected.');
}

function parseArgs(argv) {
  const options = { prompt: '', promptFile: null, json: false, help: false };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--prompt') {
      options.prompt = readValue(argv, ++index, arg);
    } else if (arg === '--prompt-file') {
      options.promptFile = readValue(argv, ++index, arg);
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unsupported option '${arg}'`);
    } else {
      positional.push(arg);
    }
  }
  options.prompt = options.promptFile
    ? fs.readFileSync(options.promptFile, 'utf8')
    : (options.prompt || positional.join(' '));
  return options;
}

function readValue(argv, index, flag) {
  const value = argv[index];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function printHelp() {
  console.log('Usage: route-intent.mjs --prompt <request> [--json]\n       route-intent.mjs --prompt-file <file> [--json]');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
    } else {
      const result = classifyIntent(options.prompt);
      console.log(options.json ? JSON.stringify(result, null, 2) : [
        `STATE: ${result.state}`,
        `OWNER: ${result.owner || 'none'}`,
        `NEXT GATE: ${result.nextGate}`,
        `EFFECTIVE_INTERACT: ${result.effectiveInteract}`,
      ].join('\n'));
    }
  } catch (error) {
    console.error(`route-intent: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
