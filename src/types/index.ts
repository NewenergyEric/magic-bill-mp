// 账单类型
export interface Bill {
  _id: string
  type: 'simple' | 'multi'
  eventName: string
  totalAmount: number  // 单位：分
  participantsCount: number
  date: number
  userId: string
  details?: {
    participants: Participant[]
    settlements: Settlement[]
    payerId?: string  // 均分咒的付款人ID
  }
  // 关联的子收支录ID（可选）
  subLedgerId?: string
  // 是否已归档
  archived?: boolean
  // 契约相关（可选）
  contractId?: string  // 关联的契约ID
  cloudId?: string     // 云端账单ID
}

// 参与者
export interface Participant {
  id: string
  name: string
  paid: number  // 单位：分
  avatar?: string
}

// 结算关系
export interface Settlement {
  from: string
  to: string
  amount: number
}

// 向导/巫师信息
export interface WizardInfo {
  name: string
  emoji: string
}

// 云开发用户
export interface CloudUser {
  _id: string
  _openid: string
  nickName: string
  avatarUrl: string
  createTime: number
}

// 子收支录（消费事件）
export interface SubLedger {
  _id: string
  name: string           // 事件名称
  date: number           // 创建时间
  billIds: string[]      // 关联的账单ID列表
  totalAmount: number    // 总金额
  status: 'active' | 'archived'  // 状态
}

// 收支录（主账本）
export interface Ledger {
  _id: string
  name: string           // 收支录名称
  createdAt: number      // 创建时间
  updatedAt: number      // 更新时间
  subLedgerIds: string[] // 子收支录ID列表
  totalAmount: number    // 总金额
}