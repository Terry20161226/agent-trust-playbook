# 示例 02：fail-closed 与等价指纹

配套文章：[《fail-closed：给 coding agent 修门禁的设计原则》](../../articles/02-fail-closed门禁设计原则.md)

```bash
node skip-simulation.mjs   # fail-open 的 --skip 口子如何在 3 轮内被学成主路径（风格化模拟）
node fingerprint.mjs       # 等价指纹：改注释复用凭证，改语义凭证作废
```

零依赖，Node 18+ 直接运行。
