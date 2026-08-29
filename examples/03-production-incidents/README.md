# 示例 03：两个生产事故的最小复现

配套文章：[《两个生产事故的复盘》](../../articles/03-两个生产事故的复盘.md)

```bash
node write-point-check.mjs   # 事故 A：审计字段 "operator" 零写入点（exit 1 = VIOLATION, subtype: invariant-missing）
node error-masking.mjs       # 事故 B：兜底吞掉 NOT_FOUND → 断言错误类型的门禁测试抓住
```

- `app/` 是两个 agent 的合成交付物：各自局部自洽，合起来缺字段。
- 零依赖，Node 18+ 直接运行。
