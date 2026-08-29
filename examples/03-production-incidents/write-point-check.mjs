#!/usr/bin/env node
// 全局不变量核验：审计要求的字段必须存在至少一个写入点。
// 单个 diff 看不出来——每个 agent 的局部交付都"合理"，缺失落在责任缝隙里。
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), 'app');
const REQUIRED_FIELDS = ['operator'];

// 写入点的朴素识别：对象字面量里出现 `field:`，或出现 `xxx.field =` 赋值
const WRITE_PATTERNS = (f) => [
  new RegExp(`\\b${f}\\s*:`),
  new RegExp(`\\.${f}\\s*=`),
];

const sources = readdirSync(appDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => ({ file: f, code: readFileSync(join(appDir, f), 'utf8') }));

let violated = false;
for (const field of REQUIRED_FIELDS) {
  const writePoints = [];
  for (const { file, code } of sources) {
    if (WRITE_PATTERNS(field).some((p) => p.test(code))) writePoints.push(file);
  }
  if (writePoints.length === 0) {
    violated = true;
    console.log(`VIOLATION (subtype: invariant-missing)  字段 "${field}" 在整个交付范围内没有任何写入点。`);
    console.log('  每个 agent 的局部 diff 都自洽、局部测试都通过——但合起来模块不可用。');
    console.log('  这类缺失只有"全局不变量"核验能抓到：不看单个 diff，问"写入点存在吗"。');
  } else {
    console.log(`OK  字段 "${field}" 的写入点: ${writePoints.join(', ')}`);
  }
}
process.exit(violated ? 1 : 0);
