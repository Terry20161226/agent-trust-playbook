#!/usr/bin/env node
// 等价指纹：receipt 绑定的是"规范化内容"的哈希，不是文件本身、不是时间戳。
// 效果：跑完测试又改代码 → 凭证自动作废；只改了注释/格式 → 证据可复用，不必重复构建。
import { createHash } from 'node:crypto';

// 规范化：去掉注释与空白——语义等价的改动得到同一个指纹
// 注意：这是教学简化版，正则分不清字符串字面量里的空白和 //（"a b"、URL 会被误伤）。
// 生产实现应在 AST/token 层做规范化，只剥真正的注释与格式空白。
const normalize = (src) =>
  src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '');
const fingerprint = (files) =>
  createHash('sha256').update(files.map(normalize).join('\n')).digest('hex').slice(0, 12);

const v1 = [`// 扣减库存
export function deduct(stock, n) {
  if (n > stock) throw new Error('oversell');
  return stock - n;
}`];

// 场景 2 的"改动"：只加了注释、调了格式，语义没变
const v1Equivalent = [`// 扣减库存
// 超卖时抛错（2026-08 补充说明）
export function deduct(stock, n) {
    if (n > stock) throw new Error('oversell');
    return stock - n;
}`];

// 场景 3 的"改动"：真改了语义——边界条件从 > 变成 >=
const v2 = [`export function deduct(stock, n) {
  if (n >= stock) throw new Error('oversell');
  return stock - n;
}`];

const receipt = { command: 'npm test', exitCode: 0, fingerprint: fingerprint(v1) };
console.log(`测试已通过，签发凭证（指纹 ${receipt.fingerprint}）\n`);

for (const [name, current] of [
  ['场景 1：代码原封不动', v1],
  ['场景 2：只改了注释和缩进', v1Equivalent],
  ['场景 3：改了边界条件（> 变成 >=）', v2],
]) {
  const fp = fingerprint(current);
  const valid = fp === receipt.fingerprint;
  console.log(name);
  console.log(`  当前指纹 ${fp} → ${valid ? '凭证有效，直接复用，省掉一次重复构建' : '凭证作废，必须重跑测试'}`);
}
