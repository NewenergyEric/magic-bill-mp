import type { Participant, Settlement } from '@/types'

/**
 * 智能分账算法（金额单位：分）
 * 计算最优的转账方案，使得最少次数完成清算
 */
export function calculateSettlements(participants: Participant[]): Settlement[] {
  if (participants.length < 2) return []

  // 计算总金额和平均值（单位：分）
  const totalInCents = participants.reduce((sum, p) => sum + p.paid, 0)
  const avgInCents = Math.round(totalInCents / participants.length)

  // 计算每个人的余额（正数为应收，负数为应付）
  const balances = participants.map(p => ({
    name: p.name,
    balance: p.paid - avgInCents  // 单位：分
  }))

  // 分离债权人和债务人
  const creditors = balances
    .filter(b => b.balance > 1)
    .sort((a, b) => b.balance - a.balance) // 从大到小

  const debtors = balances
    .filter(b => b.balance < -1)
    .sort((a, b) => a.balance - b.balance) // 从小到大（负数，绝对值大的在前）

  const settlements: Settlement[] = []
  let dIdx = 0
  let cIdx = 0

  // 贪心算法：优先让债务最大的人还钱给债权最大的人
  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx]
    const creditor = creditors[cIdx]

    // 计算转账金额（取债务和债权中较小的绝对值，单位：分）
    const amountInCents = Math.min(Math.abs(debtor.balance), creditor.balance)

    if (amountInCents > 1) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amountInCents)  // 保持整数分
      })
    }

    // 更新余额
    debtor.balance += amountInCents
    creditor.balance -= amountInCents

    // 如果债务人的债务已还清，移至下一个债务人
    if (Math.abs(debtor.balance) < 1) dIdx++
    // 如果债权人的债权已收回，移至下一个债权人
    if (creditor.balance < 1) cIdx++
  }

  return settlements
}

/**
 * 格式化金额显示
 * 输入：分单位的金额
 * 输出：元单位的字符串（如 "5.00"）
 */
export function formatAmount(amountInCents: number): string {
  if (isNaN(amountInCents) || amountInCents === null || amountInCents === undefined) {
    return '0.00'
  }
  return (amountInCents / 100).toFixed(2)
}

/**
 * 计算人均金额
 * 输入：分单位的总金额
 * 输出：分单位的人均金额
 */
export function calculatePerPerson(totalInCents: number, count: number): number {
  if (count <= 0) return 0
  return Math.round(totalInCents / count)
}

/**
 * 元转分
 */
export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100)
}

/**
 * 分转元
 */
export function centsToYuan(cents: number): number {
  return cents / 100
}

/**
 * 生成随机魔法事件名称
 */
export function generateMagicEventName(): string {
  const events = [
    '霍格沃茨周末聚餐',
    '魁地奇装备采购',
    '黄油啤酒品鉴会',
    '魔法书籍团购',
    '霍格莫德村购物',
    '魔药课材料采购',
    '扫帚保养服务',
    '猫头鹰邮费分摊',
    '黑魔法防御演练',
    '草药学实验经费'
  ]
  return events[Math.floor(Math.random() * events.length)]
}