#!/usr/bin/env node
// 并行 agent 的 diff 归属：同一个任务、同一个文件，两种工作区策略对比。
// 场景 A：两个 agent 共享一个工作区 → diff 混在一起，receipt 无法绑定归属。
// 场景 B：worktree 隔离 + 串行 finalize → 每个任务的 diff 独立成单，越界改动被定位到具体任务。
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = mkdtempSync(join(tmpdir(), 'attribution-demo-'));
const env = {
  ...process.env,
  GIT_AUTHOR_NAME: 'demo', GIT_AUTHOR_EMAIL: 'demo@example.com',
  GIT_COMMITTER_NAME: 'demo', GIT_COMMITTER_EMAIL: 'demo@example.com',
};
const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
// porcelain 输出的行首是状态列，不能被 trim——单独用 raw 版本
const gitRaw = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' });

// ---------- 公共素材 ----------
const base = `// 定价模块
export function basePrice(sku) {
  return 100;
}
`;
const task1Change = `// 定价模块
export function discount(price, rate) {
  return price * rate;
}

export function basePrice(sku) {
  return 100;
}
`;
const task2Append = `
export function withTax(price) {
  return Math.round(price * 1.13 * 100) / 100;
}
`;
// 两个任务的声明范围：都只授权改 src/pricing.js
const declaredScope = { 'task-1': ['src/pricing.js'], 'task-2': ['src/pricing.js'] };

// ---------- 场景 A：共享工作区 ----------
{
  const repo = join(root, 'shared');
  mkdirSync(join(repo, 'src'), { recursive: true });
  git(repo, 'init', '-q', '-b', 'main');
  writeFileSync(join(repo, 'src/pricing.js'), base);
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'init');

  // task-1 和 task-2 在同一棵工作树里先后改同一个文件
  writeFileSync(join(repo, 'src/pricing.js'), task1Change);      // task-1 的改动
  writeFileSync(join(repo, 'src/pricing.js'), task1Change + task2Append); // task-2 又叠加了自己的改动
  writeFileSync(join(repo, 'deploy.sh'), 'echo hotfix');         // 还有一个不知谁写的越界文件

  console.log('场景 A：共享工作区，最终只有一堆混在一起的改动：');
  const names = gitRaw(repo, 'status', '--porcelain').split('\n').filter(Boolean).map((l) => l.slice(3));
  console.log(`  改动文件: ${names.join(', ')}`);
  console.log('  问题：discount 是 task-1 写的，withTax 是 task-2 写的，deploy.sh 是谁写的？');
  console.log('  单个混合 diff 里没有任何归属边界——receipt 签给"这次交付"，等于谁都没签。');
  console.log('');
}

// ---------- 场景 B：worktree 隔离 + 串行 finalize ----------
{
  const repo = join(root, 'isolated');
  mkdirSync(join(repo, 'src'), { recursive: true });
  git(repo, 'init', '-q', '-b', 'main');
  writeFileSync(join(repo, 'src/pricing.js'), base);
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'init');

  // 每个 agent 一个 worktree（独立分支、独立工作树）
  const wt1 = join(root, 'wt-task-1');
  const wt2 = join(root, 'wt-task-2');
  git(repo, 'worktree', 'add', '-q', '-b', 'task-1', wt1);
  git(repo, 'worktree', 'add', '-q', '-b', 'task-2', wt2);

  writeFileSync(join(wt1, 'src/pricing.js'), task1Change);
  git(wt1, 'add', '-A');
  git(wt1, 'commit', '-q', '-m', 'task-1: add discount');

  writeFileSync(join(wt2, 'src/pricing.js'), base + task2Append);
  writeFileSync(join(wt2, 'deploy.sh'), 'echo hotfix'); // task-2 夹带越界改动
  git(wt2, 'add', '-A');
  git(wt2, 'commit', '-q', '-m', 'task-2: add withTax (+smuggled deploy.sh)');

  console.log('场景 B：worktree 隔离，合并回主干时串行 finalize，逐个签发 receipt：');
  for (const task of ['task-1', 'task-2']) {
    git(repo, 'merge', '-q', '--no-ff', task, '-m', `finalize ${task}`);
    const files = git(repo, 'diff', '--name-only', 'HEAD^', 'HEAD').split('\n').filter(Boolean);
    const outOfScope = files.filter((f) => !declaredScope[task].includes(f));
    const verdict = outOfScope.length === 0 ? 'PASS' : `VIOLATION（越界: ${outOfScope.join(', ')}）`;
    console.log(`  ${task} finalize: diff=[${files.join(', ')}] 声明范围=[${declaredScope[task]}] → ${verdict}`);
  }
  console.log('  结论：task-2 夹带的 deploy.sh 被定位到具体任务、具体 finalize 批次，可追责、可回滚。');
}
