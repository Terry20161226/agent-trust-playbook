// agent B 的交付：导出订单。局部测试全绿。
// 它假设 operator 字段"别人会写"，导出时直接透传。
export function exportOrders(db) {
  return db.orders.all().map((o) => ({ ...o, exportedAt: Date.now() }));
}
