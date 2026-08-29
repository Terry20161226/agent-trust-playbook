#!/usr/bin/env node
// 机械核验器：不看 agent 说了什么，只看证据链是否成立。
// 用法: node verifier.mjs <scenario-dir>
// 输出四值之一: PASS / INSUFFICIENT_EVIDENCE / VIOLATION(附 subtype) / CONFIG_ERROR（不得合并）
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const scenario = process.argv[2];
if (!scenario) {
  console.error('usage: node verifier.mjs <scenario-dir>');
  process.exit(2);
}

const claim = JSON.parse(readFileSync(join(here, 'claim.json'), 'utf8'));
const dir = join(here, scenario);

const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const gate = read('gate.config.json');
const pkg = read('package.json');

// 第 1 层：门禁自身配置是否成立——要求的测试命令必须是真实存在的脚本
const scriptName = gate.testCommand.replace(/^npm (run )?/, '');
if (!(scriptName in (pkg.scripts || {}))) {
  console.log('CONFIG_ERROR');
  console.log(`  门禁要求执行 "${gate.testCommand}"，但 package.json 中不存在该脚本。`);
  console.log('  这是门禁本身的故障：任何 agent 都无法产出满足它的证据，必须修配置，而不是逼 agent 重跑。');
  process.exit(0);
}

// 第 2 层：声明的验证命令是否有真实执行凭证（receipt）
const receiptPath = join(dir, 'receipts', 'test-run.json');
if (!existsSync(receiptPath)) {
  console.log('INSUFFICIENT_EVIDENCE');
  console.log(`  agent 声称执行过 "${claim.verification.command}" 且通过，但找不到任何执行凭证。`);
  console.log('  注意：这不等于测试失败——它只说明"无法核验"。修复动作是补证据，不是改代码。');
  process.exit(0);
}

const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
if (receipt.command !== claim.verification.command) {
  console.log('INSUFFICIENT_EVIDENCE');
  console.log(`  凭证里的命令是 "${receipt.command}"，与声明的 "${claim.verification.command}" 不一致。`);
  process.exit(0);
}

// 第 3 层：证据齐全，看真实结果
if (receipt.exitCode !== 0) {
  console.log('VIOLATION (subtype: business-failure)');
  console.log(`  凭证显示 "${receipt.command}" 退出码 ${receipt.exitCode}（${receipt.tail}）。`);
  console.log('  证据链完整地证明了声明不成立：测试真的红了。修复动作是改代码。');
  process.exit(0);
}

console.log('PASS');
console.log(`  凭证核对一致："${receipt.command}" 于 ${receipt.finishedAt} 执行成功，声明与证据吻合。`);
