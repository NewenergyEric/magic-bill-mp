import Taro from '@tarojs/taro'
import { Ledger, SubLedger, Bill } from '@/types'
import { getCompanions } from './companions'

// 本地存储键名
const LEDGER_KEY = 'magic_ledgers'
const SUB_LEDGER_KEY = 'magic_sub_ledgers'
const BILLS_KEY = 'magic_bills'

// ========== 账单相关 ==========

/**
 * 获取所有账单
 */
export function getBills(): Bill[] {
  try {
    return Taro.getStorageSync(BILLS_KEY) || []
  } catch {
    return []
  }
}

/**
 * 保存账单
 */
export function saveBill(bill: Omit<Bill, '_id' | 'userId'>): Bill {
  const bills = getBills()
  const newBill: Bill = {
    ...bill,
    _id: Date.now().toString(),
    userId: 'local'
  }
  bills.unshift(newBill)
  Taro.setStorageSync(BILLS_KEY, bills)
  return newBill
}

/**
 * 关联账单到子收支录
 */
export function linkBillToSubLedger(billId: string, subLedgerId: string): boolean {
  const bills = getBills()
  const index = bills.findIndex(b => b._id === billId)
  if (index !== -1) {
    bills[index].subLedgerId = subLedgerId
    Taro.setStorageSync(BILLS_KEY, bills)
    
    // 更新子收支录的总金额
    updateSubLedgerAmount(subLedgerId)
    return true
  }
  return false
}

/**
 * 获取子收支录的账单列表
 */
export function getBillsBySubLedger(subLedgerId: string): Bill[] {
  return getBills().filter(b => b.subLedgerId === subLedgerId)
}

/**
 * 归档账单
 */
export function archiveBill(billId: string): boolean {
  const bills = getBills()
  const index = bills.findIndex(b => b._id === billId)
  if (index !== -1) {
    bills[index].archived = true
    Taro.setStorageSync(BILLS_KEY, bills)
    return true
  }
  return false
}

/**
 * 获取未归档的账单
 */
export function getActiveBills(): Bill[] {
  return getBills().filter(b => !b.archived)
}

/**
 * 获取已归档的账单
 */
export function getArchivedBills(): Bill[] {
  return getBills().filter(b => b.archived)
}

/**
 * 删除账单
 */
export function deleteBill(billId: string): boolean {
  const bills = getBills()
  const newBills = bills.filter(b => b._id !== billId)
  Taro.setStorageSync(BILLS_KEY, newBills)
  return true
}

// ========== 子收支录相关 ==========

/**
 * 获取所有子收支录
 */
export function getSubLedgers(): SubLedger[] {
  try {
    return Taro.getStorageSync(SUB_LEDGER_KEY) || []
  } catch {
    return []
  }
}

/**
 * 获取活跃的子收支录
 */
export function getActiveSubLedgers(): SubLedger[] {
  return getSubLedgers().filter(s => s.status === 'active')
}

/**
 * 获取已归档的子收支录
 */
export function getArchivedSubLedgers(): SubLedger[] {
  return getSubLedgers().filter(s => s.status === 'archived')
}

/**
 * 创建子收支录
 */
export function createSubLedger(name: string, cloudId?: string): SubLedger {
  const subLedgers = getSubLedgers()
  const newSubLedger: SubLedger = {
    _id: Date.now().toString(),
    name,
    date: Date.now(),
    billIds: [],
    totalAmount: 0,
    status: 'active',
    cloudId  // 云端契约ID（可选）
  }
  subLedgers.unshift(newSubLedger)
  Taro.setStorageSync(SUB_LEDGER_KEY, subLedgers)
  return newSubLedger
}

/**
 * 更新子收支录
 */
export function updateSubLedger(subLedgerId: string, data: Partial<SubLedger>): boolean {
  const subLedgers = getSubLedgers()
  const index = subLedgers.findIndex(s => s._id === subLedgerId)
  if (index !== -1) {
    subLedgers[index] = { ...subLedgers[index], ...data }
    Taro.setStorageSync(SUB_LEDGER_KEY, subLedgers)
    return true
  }
  return false
}

/**
 * 更新子收支录总金额
 */
export function updateSubLedgerAmount(subLedgerId: string): void {
  const bills = getBillsBySubLedger(subLedgerId)
  const totalAmount = bills.reduce((sum, b) => sum + b.totalAmount, 0)
  updateSubLedger(subLedgerId, { totalAmount, billIds: bills.map(b => b._id) })
}

/**
 * 归档子收支录
 */
export function archiveSubLedger(subLedgerId: string): boolean {
  // 归档子收支录下的所有账单
  const bills = getBillsBySubLedger(subLedgerId)
  bills.forEach(b => archiveBill(b._id))
  
  // 更新子收支录状态
  return updateSubLedger(subLedgerId, { status: 'archived' })
}

/**
 * 删除子收支录
 */
export function deleteSubLedger(subLedgerId: string): boolean {
  const subLedgers = getSubLedgers()
  const newSubLedgers = subLedgers.filter(s => s._id !== subLedgerId)
  Taro.setStorageSync(SUB_LEDGER_KEY, newSubLedgers)
  return true
}

/**
 * 获取单个子收支录
 */
export function getSubLedgerById(subLedgerId: string): SubLedger | null {
  return getSubLedgers().find(s => s._id === subLedgerId) || null
}

// ========== 收收支录（主账本）相关 ==========

/**
 * 获取所有收支录
 */
export function getLedgers(): Ledger[] {
  try {
    return Taro.getStorageSync(LEDGER_KEY) || []
  } catch {
    return []
  }
}

/**
 * 获取默认收支录（如果不存在则创建）
 */
export function getDefaultLedger(): Ledger {
  const ledgers = getLedgers()
  if (ledgers.length === 0) {
    // 创建默认收支录
    const defaultLedger: Ledger = {
      _id: 'default',
      name: '古灵阁账本',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      subLedgerIds: [],
      totalAmount: 0
    }
    Taro.setStorageSync(LEDGER_KEY, [defaultLedger])
    return defaultLedger
  }
  return ledgers[0]
}

/**
 * 更新收支录
 */
export function updateLedger(ledgerId: string, data: Partial<Ledger>): boolean {
  const ledgers = getLedgers()
  const index = ledgers.findIndex(l => l._id === ledgerId)
  if (index !== -1) {
    ledgers[index] = { 
      ...ledgers[index], 
      ...data,
      updatedAt: Date.now()
    }
    Taro.setStorageSync(LEDGER_KEY, ledgers)
    return true
  }
  return false
}

/**
 * 计算收支录总金额
 */
export function calculateLedgerAmount(ledgerId: string): number {
  const ledger = getLedgers().find(l => l._id === ledgerId)
  if (!ledger) return 0
  
  const subLedgers = getSubLedgers().filter(s => ledger.subLedgerIds.includes(s._id))
  return subLedgers.reduce((sum, s) => sum + s.totalAmount, 0)
}

/**
 * 添加子收支录到收支录
 */
export function addSubLedgerToLedger(ledgerId: string, subLedgerId: string): boolean {
  const ledger = getLedgers().find(l => l._id === ledgerId)
  if (!ledger) return false
  
  if (!ledger.subLedgerIds.includes(subLedgerId)) {
    ledger.subLedgerIds.push(subLedgerId)
    ledger.updatedAt = Date.now()
    ledger.totalAmount = calculateLedgerAmount(ledgerId)
    Taro.setStorageSync(LEDGER_KEY, getLedgers().map(l => l._id === ledgerId ? ledger : l))
  }
  return true
}

// ========== 随机事件名称生成 ==========

const MAGIC_EVENTS = [
  '购买《高级魔药制作》二手书',
  '古灵阁金库年度管理费',
  '三把扫帚黄油啤酒团购',
  '韦斯莱笑话商店整蛊产品',
  '蜂蜜公爵糖果店大采购',
  '奥利凡德魔杖抛光护理',
  '霍格莫德村周末团建经费',
  '禁林探险应急补给包',
  '魁地奇世界杯决赛门票',
  '猫头鹰邮递及棚屋清洁费',
  '对角巷周末购物',
  '魔法部公务出差报销',
  '霍格沃茨校庆聚餐',
  '凤凰社秘密集会经费',
  '食死徒追捕行动开支',
]

/**
 * 生成随机事件名称
 */
export function getRandomEventName(): string {
  return MAGIC_EVENTS[Math.floor(Math.random() * MAGIC_EVENTS.length)]
}

// ========== 结算计算 ==========

/**
 * 参与者结算信息
 */
export interface ParticipantSettlement {
  id: string
  name: string
  avatar?: string
  paid: number        // 已支付
  shouldPay: number   // 应支出（平均值）
  balance: number     // 余额（正数=应收，负数=应付）
  billCount: number   // 参与账单数
  settled?: boolean   // 是否已结清
}

/**
 * 单个账单的结算信息（用于计算过程展示）
 */
export interface BillSettlementDetail {
  billId: string
  billType: 'simple' | 'multi'
  eventName: string
  totalAmount: number
  participantsCount: number
  perPerson: number
  date: number
  // 每个参与者在这笔账单中的应付金额
  participantShares: { id: string; name: string; avatar?: string; shouldPay: number; paid: number }[]
}

/**
 * 保存事件的结清状态
 */
export function saveSubLedgerSettledStatus(subLedgerId: string, settledStatus: Record<string, boolean>): void {
  try {
    const key = `magic_subledger_settled_${subLedgerId}`
    Taro.setStorageSync(key, settledStatus)
  } catch (e) {
    console.error('Failed to save settled status:', e)
  }
}

/**
 * 获取事件的结清状态
 */
export function getSubLedgerSettledStatus(subLedgerId: string): Record<string, boolean> {
  try {
    const key = `magic_subledger_settled_${subLedgerId}`
    return Taro.getStorageSync(key) || {}
  } catch {
    return {}
  }
}

/**
 * 计算事件的结算方案（改进版：区分均分咒和清算咒，金额单位统一为分）
 * 使用 name 作为唯一标识，避免同一巫师因不同账单的 id 不同而被重复计算
 */
export function calculateSubLedgerSettlement(subLedgerId: string): {
  participants: ParticipantSettlement[]
  settlements: { from: string; to: string; amount: number }[]
  totalAmount: number
  participantCount: number
  billDetails: BillSettlementDetail[]
} {
  const bills = getBillsBySubLedger(subLedgerId)
  
  if (bills.length === 0) {
    return { participants: [], settlements: [], totalAmount: 0, participantCount: 0, billDetails: [] }
  }
  
  // 汇总所有参与者的支付情况（使用 name 作为唯一标识）
  const participantMap = new Map<string, ParticipantSettlement>()
  let totalAmount = 0
  const billDetails: BillSettlementDetail[] = []
  
  bills.forEach(bill => {
    // totalAmount 已是分单位
    totalAmount += bill.totalAmount
    const perPersonInCents = Math.round(bill.totalAmount / bill.participantsCount)
    
    // 记录账单详情
    const billDetail: BillSettlementDetail = {
      billId: bill._id,
      billType: bill.type,
      eventName: bill.eventName,
      totalAmount: bill.totalAmount,
      participantsCount: bill.participantsCount,
      perPerson: perPersonInCents,
      date: bill.date,
      participantShares: []
    }
    
    if (bill.details?.participants) {
      bill.details.participants.forEach(p => {
        // 均分咒：paid 已记录（付款人=总额，其他人=0）
        // 清算咒：paid 为用户输入的垫付金额
        // 单位都是分
        const paid = p.paid || 0
        billDetail.participantShares.push({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          shouldPay: perPersonInCents,
          paid
        })
        
        // 汇总到总参与者（使用 name 作为唯一标识）
        const existing = participantMap.get(p.name)
        if (existing) {
          existing.paid += paid
          existing.shouldPay += perPersonInCents
          existing.billCount += 1
          // 保留最新的头像
          if (p.avatar) existing.avatar = p.avatar
        } else {
          participantMap.set(p.name, {
            id: p.name, // 使用 name 作为 id，确保唯一性
            name: p.name,
            avatar: p.avatar,
            paid: paid,
            shouldPay: perPersonInCents,
            balance: 0,
            billCount: 1
          })
        }
      })
    }
    
    billDetails.push(billDetail)
  })
  
  const participants = Array.from(participantMap.values())
  const participantCount = participants.length
  
  if (participantCount === 0) {
    return { participants: [], settlements: [], totalAmount, participantCount: 0, billDetails }
  }
  
  // 从伙伴列表同步最新头像
  const freshCompanions = getCompanions()
  participants.forEach(p => {
    const companion = freshCompanions.find(c => c.name === p.name)
    if (companion && companion.avatar) {
      p.avatar = companion.avatar
    }
  })
  
  // 计算每人余额（单位：分）
  participants.forEach(p => {
    p.balance = p.paid - p.shouldPay
  })
  
  // 计算结算方案（贪心算法，金额单位：分）
  // 注意：创建深拷贝以避免修改原始 participants 对象的 balance，否则UI将无法正确显示应收/应付状态
  const debtors = participants.filter(p => p.balance < -1).sort((a, b) => a.balance - b.balance).map(p => ({...p}))
  const creditors = participants.filter(p => p.balance > 1).sort((a, b) => b.balance - a.balance).map(p => ({...p}))
  
  const settlements: { from: string; to: string; amount: number }[] = []
  let dIdx = 0, cIdx = 0
  
  while (dIdx < debtors.length && cIdx < creditors.length) {
    const amountInCents = Math.min(Math.abs(debtors[dIdx].balance), creditors[cIdx].balance)
    if (amountInCents > 1) {
      settlements.push({
        from: debtors[dIdx].name,
        to: creditors[cIdx].name,
        amount: Math.round(amountInCents)  // 保持整数分
      })
    }
    // 这些修改现在只作用于拷贝对象
    debtors[dIdx].balance += amountInCents
    creditors[cIdx].balance -= amountInCents
    if (Math.abs(debtors[dIdx].balance) < 1) dIdx++
    if (Math.abs(creditors[cIdx].balance) < 1) cIdx++
  }
  
  return { participants, settlements, totalAmount, participantCount, billDetails }
}

/**
 * 获取事件的参与者头像列表
 */
export function getSubLedgerParticipants(subLedgerId: string): { name: string; avatar?: string }[] {
  const bills = getBillsBySubLedger(subLedgerId)
  const participantMap = new Map<string, { name: string; avatar?: string }>()
  
  bills.forEach(bill => {
    if (bill.details?.participants) {
      bill.details.participants.forEach(p => {
        if (!participantMap.has(p.id)) {
          participantMap.set(p.id, { name: p.name, avatar: p.avatar })
        }
      })
    }
  })
  
  return Array.from(participantMap.values())
}