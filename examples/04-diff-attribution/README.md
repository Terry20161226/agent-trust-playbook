# 示例 04：并行 agent 的 diff 归属

配套文章：[《并行 agent 的 diff 归属问题》](../../articles/04-并行agent的diff归属问题.md)

```bash
node attribution-demo.mjs
```

在临时目录自建 git sandbox，对比两种工作区策略：

- 场景 A（共享工作区）：两个任务的改动混成一锅，越界文件成悬案；
- 场景 B（worktree 隔离 + 串行 finalize）：每个任务独立 diff、独立 receipt，越界改动在 finalize 时被拦下并定位到具体任务。

需要本机有 git；脚本不碰任何真实仓库，全部操作在 `mktemp` 临时目录内。
