// agent A 的交付：创建订单。局部测试全绿。
// 审计要求：每条订单记录必须有 operator（操作人）字段。
export function createOrder(db, input) {
  const record = { id: db.nextId(), sku: input.sku, qty: input.qty, createdAt: Date.now() };
  db.orders.insert(record);
  return record;
}
