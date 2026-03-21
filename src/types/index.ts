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

// 事件成员
export interface EventMember {
  id: string             // 唯一标识（自定义巫师用本地ID，微信用户用openid）
  name: string           // 显示名称
  avatar?: string        // 头像（emoji或URL）
  type: 'custom' | 'wechat'  // 类型：自定义巫师 或 微信用户
  wechatOpenid?: string  // 微信用户的openid（type=wechat时有值）
  cloudUserId?: string   // 云端用户ID
  joinTime: number       // 加入时间
  invitedBy?: string     // 被谁邀请的（用户ID）
}

// 子收支录（消费事件）- 相当于总账单
export interface SubLedger {
  _id: string
  name: string           // 事件名称
  date: number           // 创建时间
  billIds: string[]      // 关联的账单ID列表
  totalAmount: number    // 总金额
  status: 'active' | 'archived'  // 状态
  cloudId?: string       // 云端契约ID（开启云端同步时）
  members?: EventMember[] // 事件成员列表（分账主体）
  creatorId?: string     // 创建者ID
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