# 示例 01：为什么 checkbox 不算完成

配套文章：[《为什么 checkbox 不算完成》](../../articles/01-为什么checkbox不算完成.md)

四个场景共享**同一份** agent 完成声明（`claim.json`，声称"全部完成，测试通过"），
机械核验器 `verifier.mjs` 只认证据不认声明，分别得出四种不同结论：

```bash
node verifier.mjs scenarios/evidence-missing   # INSUFFICIENT_EVIDENCE —— 没跑测试却声称通过
node verifier.mjs scenarios/config-error       # CONFIG_ERROR —— 门禁要求的命令根本不存在
node verifier.mjs scenarios/business-failure   # VIOLATION (subtype: business-failure) —— 证据齐全，测试真的红了
node verifier.mjs scenarios/all-good           # PASS —— 声明与证据吻合
```

零依赖，Node 18+ 直接运行。

要点：同一份"全绿汇报"可以对应三种完全不同的"不通过"，修复动作完全不同
（补证据 / 修门禁 / 按 subtype 改代码）。把它们合并成一个"不通过"，分派队列那天起就开始烂。
