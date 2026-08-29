#!/usr/bin/env node
// 模拟：门禁留一个 --skip 口子，agent 会在几轮之内把它学成主路径。
// 这是一个风格化模型：agent 的策略只有一条——"上次被放行的做法，这次继续；被拦的做法，换"。
const ROUNDS = 20;

function simulate(gateAllowsSkip) {
  let knowsSkipWorks = false;
  let skipped = 0;
  const trace = [];
  for (let round = 1; round <= ROUNDS; round++) {
    // 前两轮老实跑测试；第 3 轮起试探一次 skip（时间压力/手滑/抄历史命令，总会发生）
    const triesSkip = gateAllowsSkip && (knowsSkipWorks || round === 3);
    if (triesSkip) {
      // fail-open 门禁：skip 被放行 → 学到"skip 能过"，以后每轮都 skip
      knowsSkipWorks = true;
      skipped++;
      trace.push(`第${String(round).padStart(2)}轮  skip→放行`);
    } else {
      trace.push(`第${String(round).padStart(2)}轮  真实执行→留凭证`);
    }
  }
  return { skipped, trace };
}

console.log(`门禁 A（fail-open，提供 --skip 参数），${ROUNDS} 轮交付：`);
const a = simulate(true);
for (const t of a.trace.slice(0, 6)) console.log('  ' + t);
console.log('  ...');
console.log(`  结果：skip 率 ${((a.skipped / ROUNDS) * 100).toFixed(0)}%——第 3 轮试探成功后，真实测试再没跑过。`);

console.log('');
console.log(`门禁 B（fail-closed，零 skip），同样 ${ROUNDS} 轮：`);
const b = simulate(false);
console.log(`  结果：skip 率 ${((b.skipped / ROUNDS) * 100).toFixed(0)}%——没有口子可学，每轮都留下真实凭证。`);
