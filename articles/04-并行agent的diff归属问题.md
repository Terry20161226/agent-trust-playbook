# 并行 agent 的 diff 归属问题

> 「Agent 可信度工程」系列第 4 篇。前三篇讲了证据、门禁、事故。这一篇讲一个规模化之后才会撞上的前提问题：**多个 agent 并行干活时，"这段代码是谁写的"本身就成了问题。** 归属不清，前面三篇讲的一切——receipt、scope 核验、追责——全部落空。

## 为什么归属是门禁的前提

回顾一下前两篇的机制：receipt 绑定的是"某次验证"和"某份代码状态"；scope 核验回答的是"这份 diff 有没有越界"。两个机制都隐含一个前提——**diff 的归属是清楚的**。

单 agent 串行工作时这个前提免费成立：工作区里的一切改动都是它干的。但只要你开始并行跑多个 agent（而这几乎是提效的唯一途径），前提就消失了：

- 两个 agent 在同一个工作区里改同一个文件，最终 `git diff` 是一份混合 diff；
- receipt 只能签给"这份混合 diff"，签不到任何一个具体任务；
- 出问题时无法追责，越界改动无法定位——更要命的是，**一个 agent 的夹带可以被另一个 agent 的合规交付掩护过关**。

## 方案演化：从共享工作区到 worktree + 串行 finalize

**第一阶段的直觉解法：约定俗成。** "每个 agent 改完先提交"。没用——agent 的执行顺序不受控，一个忘了提交，下一个的改动就叠上来了。

**第二阶段：worktree 物理隔离。** 每个 agent 一个独立 git worktree + 独立分支。归属问题在源头消失：每个任务的 diff 从诞生起就是独立的。这是唯一可靠的做法——归属不能靠事后推断，必须在结构上保证。

**第三阶段：串行 finalize。** 隔离带来新问题：合并回主干时如果并行，同一文件的冲突解决过程又会把两个任务的改动揉在一起。所以 finalize（合并 + 跑门禁 + 签 receipt）必须串行：共享的 implementation head 上，一次只并入一个任务，逐一生成 receipt。

下面的 demo 用真实 git 操作演示两种策略的差别（[完整示例](../examples/04-diff-attribution/attribution-demo.mjs)，Node + git，临时目录自建 sandbox）。两个任务都只被授权改 `src/pricing.js`，task-2 夹带了一个越界的 `deploy.sh`：

```
场景 A：共享工作区，最终只有一堆混在一起的改动：
  改动文件: src/pricing.js, deploy.sh
  问题：discount 是 task-1 写的，withTax 是 task-2 写的，deploy.sh 是谁写的？
  单个混合 diff 里没有任何归属边界——receipt 签给"这次交付"，等于谁都没签。

场景 B：worktree 隔离，合并回主干时串行 finalize，逐个签发 receipt：
  task-1 finalize: diff=[src/pricing.js] 声明范围=[src/pricing.js] → PASS
  task-2 finalize: diff=[deploy.sh, src/pricing.js] 声明范围=[src/pricing.js] → VIOLATION（越界: deploy.sh）
  结论：task-2 夹带的 deploy.sh 被定位到具体任务、具体 finalize 批次，可追责、可回滚。
```

同一份改动内容，场景 A 里 deploy.sh 是悬案，场景 B 里它在 finalize 时就被拦下并定位到 task-2。

## 兄弟任务改同一文件：归属怎么判

worktree + 串行 finalize 解决了大部分情况，剩下的硬骨头是：**两个任务合理地都需要改同一个文件**（比如都往路由表里注册新接口）。这里的规则是：

1. **按 finalize 批次归属，不按文件归属。** 同一文件出现在多个任务的 diff 里是合法的；每个 hunk 归属于引入它的那次 finalize。追责的最小单位是"任务的某次 finalize"，不是文件。
2. **指纹绑定到批次。** 每批 finalize 的 receipt 记录该批 diff 的内容指纹（第 2 篇的等价指纹机制），后续任何"这不是我改的"的争议，用指纹对表即可裁决。
3. **冲突解决本身也是一次改动。** finalize 时解决冲突产生的额外 diff 不免费——它属于被并入任务的范围，同样过 scope 核验。这一条最容易被忽略：冲突解决是并行 agent 场景里最后一个能藏东西的地方。

## 带走的检查清单

- 并行跑多个 coding agent 之前，先回答：每个 agent 的工作区在结构上隔离吗？（靠纪律 = 没隔离）
- finalize 是串行的吗？有没有"合并时顺手改点东西"的灰色地带？
- 每批 finalize 的 receipt 能回答"这批 diff 属于哪个任务、有没有越界"吗？
- 出一次归属争议演练：随机挑一个文件，能说出每一行是哪个任务的哪次 finalize 引入的吗？

下一篇，也是系列收尾：《1000+ 治理测试是怎么长出来的》——约束 agent 的代码，自己靠什么约束。

*本文示例为合成场景，在临时目录中运行，不对应任何真实仓库。*
