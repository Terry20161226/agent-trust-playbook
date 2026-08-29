#!/usr/bin/env node
// 错误掩盖：agent 按"健壮性"惯性加兜底，把可诊断的 NOT_FOUND 压成不可诊断的 500。
// 门禁对策：测试断言错误类型（code），而不是只断言"会报错"。
import assert from 'node:assert/strict';

class NotFoundError extends Error {
  constructor(sku) {
    super(`sku 不存在: ${sku}`);
    this.code = 'NOT_FOUND';
  }
}

function queryStock(sku) {
  const catalog = { 'SKU-1': 10 };
  if (!(sku in catalog)) throw new NotFoundError(sku);
  return catalog[sku];
}

// agent 交付的"健壮"版本：兜底把一切错误包装成统一 500
async function handlerMasked(sku) {
  try {
    return { stock: queryStock(sku) };
  } catch {
    const e = new Error('系统繁忙，请稍后重试');
    e.code = 'INTERNAL_ERROR';
    throw e;
  }
}

// 正确版本：已知业务错误原样透传，只兜底真正的未知异常
async function handlerTransparent(sku) {
  try {
    return { stock: queryStock(sku) };
  } catch (e) {
    if (e.code === 'NOT_FOUND') throw e;
    const wrapped = new Error('系统繁忙，请稍后重试');
    wrapped.code = 'INTERNAL_ERROR';
    throw wrapped;
  }
}

for (const [name, handler] of [
  ['兜底版（agent 交付）', handlerMasked],
  ['透传版（修复后）', handlerTransparent],
]) {
  try {
    await handler('SKU-999');
    console.log(`${name}: 没抛错？！`);
  } catch (e) {
    // 门禁断言：错误类型必须是 NOT_FOUND，调用方才能正确分流（重试/告警/改请求）
    const verdict = (() => {
      try {
        assert.equal(e.code, 'NOT_FOUND');
        return 'PASS';
      } catch {
        return 'FAIL';
      }
    })();
    console.log(`${name}: 抛出 code=${e.code} → 门禁断言[错误类型应为 NOT_FOUND] ${verdict}`);
  }
}

console.log('\n监控视角对比：兜底版在监控上只有 INTERNAL_ERROR 上涨，');
console.log('运维看到"系统故障"，实际病因是"有人查了个不存在的 sku"——完全不同的处置。');
