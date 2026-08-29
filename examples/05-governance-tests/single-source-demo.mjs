#!/usr/bin/env node
// "一个语义散布三处"的最小复现 + 收敛到单一事实源后的对照。
// 规则本体很简单：交付物必须包含测试凭证（receipt）。
// 版本 A：这条语义同时写在配置、校验脚本、文档三处，改了一处忘两处 → 门禁自相矛盾。
// 版本 B：规则只存在 rules.json 一处，校验器和文档都从它生成 → 改一处，处处一致。

// ---------- 版本 A：语义散布三处 ----------
{
  // 第一处：配置文件（有人把规则从"需要 receipt"收紧成"receipt 必须含 diff 指纹"）
  const config = { requireReceipt: true, requireFingerprint: true };
  // 第二处：校验脚本——规则被硬编码了一遍，改配置的人不知道这里还有一份
  const hardcodedCheck = (receipt) => receipt != null; // 还是旧规则：有 receipt 就行
  // 第三处：团队文档——更早的版本，连 receipt 都只是"建议"
  const doc = '提交前请确保跑过测试（建议保留凭证）';

  const delivery = { receipt: { command: 'npm test', exitCode: 0 } }; // 有 receipt，但没指纹

  console.log('版本 A：同一规则散布三处');
  console.log(`  配置说:   需要 receipt + 指纹 → 这份交付 ${config.requireFingerprint && !delivery.receipt.fingerprint ? '不放行' : '放行'}`);
  console.log(`  脚本说:   有 receipt 就行     → 这份交付 ${hardcodedCheck(delivery.receipt) ? '放行' : '不放行'}`);
  console.log(`  文档说:   ${doc}`);
  console.log('  → 同一份交付，三个裁判三种说法。agent 会记住最松的那个。');
  console.log('');
}

// ---------- 版本 B：单一事实源 ----------
{
  // 规则只存在于这一个对象里（现实中是 rules.json / rules.yaml）
  const RULES = { requireReceipt: true, requireFingerprint: true };
  // 校验器从事实源读
  const check = (delivery) =>
    (!RULES.requireReceipt || delivery.receipt != null) &&
    (!RULES.requireFingerprint || delivery.receipt?.fingerprint != null);
  // 文档从同一个事实源生成——它不可能再和校验器打架
  const renderDoc = () =>
    `提交前必须提供测试凭证${RULES.requireFingerprint ? '，且凭证须绑定改动指纹' : ''}。`;

  const delivery = { receipt: { command: 'npm test', exitCode: 0 } };

  console.log('版本 B：单一事实源（rules.json），校验与文档同根');
  console.log(`  校验器: 这份交付 ${check(delivery) ? '放行' : '不放行（缺指纹）'}`);
  console.log(`  生成文档: ${renderDoc()}`);
  console.log('  → 规则改一处，校验器和文档同时变，矛盾在结构上不可能存在。');
}
