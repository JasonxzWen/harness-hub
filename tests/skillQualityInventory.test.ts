import { expect, test } from 'bun:test';
import { buildSkillQualityInventory } from '../scripts/skill-quality-inventory.ts';

test('skill quality inventory reports routing metadata without enforcing it', () => {
  const inventory = buildSkillQualityInventory(process.cwd());

  expect(inventory.summary.qualityGate).toBe('report-only');
  expect(inventory.roots).toEqual(['.agents/skills', '.codex/skills']);
  expect(inventory.skills.length).toBeGreaterThan(0);

  const htmlReport = inventory.skills.find((skill) => skill.name === 'html-work-reports');
  expect(htmlReport).toBeDefined();
  expect(htmlReport?.descriptionWordCount).toBeGreaterThan(0);
  expect(typeof htmlReport?.descriptionStartsWithLoadWhen).toBe('boolean');
  expect(htmlReport?.nameMatchesDirectory).toBe(true);
  expect(htmlReport?.bodyBytes).toBeGreaterThan(0);
  expect(typeof htmlReport?.hasProgressiveSpokes).toBe('boolean');
});

test('skill quality inventory marks imported metadata gaps as warnings', () => {
  const inventory = buildSkillQualityInventory(process.cwd());

  const diagnose = inventory.skills.find((skill) => skill.name === 'diagnose');
  expect(diagnose?.isImportedOrAdapted).toBe(true);
  expect(diagnose?.sourceMetadata.frontmatterLicense).toBe(true);
  expect(diagnose?.sourceMetadata.frontmatterSource).toBe(true);

  const agentIntrospection = inventory.skills.find(
    (skill) => skill.name === 'agent-introspection-debugging',
  );
  expect(agentIntrospection?.isImportedOrAdapted).toBe(true);
  expect(agentIntrospection?.warnings).toContain('missing-frontmatter-license');

  expect(inventory.summary.reportOnlyWarningCount).toBeGreaterThan(0);
});
