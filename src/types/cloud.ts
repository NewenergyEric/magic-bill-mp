/**
 * 云开发类型定义
 * 活点账单 v3.0 - 多巫师协作契约
 */

// ============ 用户相关 ============

/**
 * 用户信息
 */
export interface CloudUser {
  _id: string;
  openid: string;
  unionid?: string;
  nickname: string;
  avatarUrl: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  settings: UserSettings;
}

/**
 * 用户设置
 */
export interface UserSettings {
  useCloudMode: boolean;        // 是否使用云端模式
  hapticFeedback: boolean;       // 触感反馈
  soundEnabled: boolean;         // 音效开关
}

// ============ 契约相关 ============

/**
 * 契约（公共账本）
 */
export interface Contract {
  _id: string;
  name: string;                  // 契约名称
  displayDate: string;           // 显示日期 "3月18日 周一"
  timeSlot?: string;             // 时间段 "中午" / "晚上"
  guardianId: string;            // 守护者ID（创建者）
  members: ContractMember[];     // 契约成员
  inviteCode: string;            // 邀请码（6位）
  inviteExpireAt?: Date;         // 邀请码过期时间
  status: 'active' | 'settled' | 'archived';
  totalAmount: number;
  billCount: number;
  settledAt?: Date;              // 结算时间
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 契约成员
 */
export interface ContractMember {
  userId: string;
  openid: string;
  nickname: string;
  avatarUrl: string;
  role: 'guardian' | 'member';   // 守护者/普通成员
  invitedBy?: string;            // 谁邀请的（userId）
  joinType: 'invite' | 'auto';   // 邀请加入 / 自动加入
  status: 'active' | 'ghost';    // active=正常 ghost=幽灵（已退出）
  joinedAt: Date;
  leftAt?: Date;                 // 退出时间
}

// ============ 账单相关 ============

/**
 * 子账单
 */
export interface CloudBill {
  _id: string;
  contractId: string;            // 所属契约ID
  casterId: string;              // 施咒者ID
  casterOpenid: string;
  spellType: 'simple' | 'multi'; // 均分咒/清算咒
  eventName: string;             // 消费描述
  totalAmount: number;
  participants: BillParticipant[];
  status: 'active' | 'disputed'; // disputed=有异议
  disputeBy?: string;            // 谁发出的吼叫信
  changeHistory: BillChange[];   // 冥想盆记录
  isSynced: boolean;             // 是否已同步到云端
  localId?: string;              // 本地ID（用于离线同步）
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 账单参与者
 */
export interface BillParticipant {
  memberId: string;              // 关联成员ID
  userId?: string;
  openid?: string;
  name: string;
  avatar: string;
  paid: number;                  // 垫付金额
  consumed: number;              // 消费金额
}

/**
 * 账单修改历史（冥想盆记录）
 */
export interface BillChange {
  changedBy: string;             // 谁修改的
  changedByName: string;
  changedAt: Date;
  changes: {
    field: string;               // 修改的字段
    oldValue: any;
    newValue: any;
  }[];
}

// ============ 吼叫信相关 ============

/**
 * 吼叫信（异议申诉）
 */
export interface Howler {
  _id: string;
  billId: string;
  contractId: string;
  senderId: string;              // 发送者ID
  senderOpenid: string;
  senderName: string;
  reason?: string;               // 异议原因
  status: 'active' | 'resolved'; // active=待处理 resolved=已解决
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
}

// ============ 通知相关 ============

/**
 * 通知类型
 */
export type NotificationType = 
  | 'member_joined'      // 新成员加入
  | 'member_left'        // 成员退出
  | 'member_removed'     // 成员被驱逐
  | 'new_bill'           // 新账单
  | 'howler_received'    // 收到吼叫信
  | 'howler_resolved'    // 吼叫信已解决
  | 'settlement_reminder'; // 结算提醒

/**
 * 通知消息
 */
export interface Notification {
  _id: string;
  type: NotificationType;
  contractId: string;
  contractName: string;
  senderId?: string;
  senderName?: string;
  receiverId: string;
  title: string;
  content: string;
  data?: any;                    // 附加数据
  isRead: boolean;
  createdAt: Date;
}

// ============ 邀请相关 ============

/**
 * 邀请记录
 */
export interface Invite {
  _id: string;
  contractId: string;
  contractName: string;
  inviterId: string;
  inviterName: string;
  inviteCode: string;
  inviteeId?: string;            // 被邀请者（加入后填充）
  status: 'pending' | 'accepted' | 'expired';
  expireAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
}

// ============ 云函数请求/响应类型 ============

/**
 * 通用云函数响应
 */
export interface CloudResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 登录请求
 */
export interface LoginRequest {
  nickname?: string;
  avatarUrl?: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  user: CloudUser;
  isNewUser: boolean;
  token?: string;
}

/**
 * 创建契约请求
 */
export interface CreateContractRequest {
  name: string;
  timeSlot?: string;
  migrateFromLocal?: boolean;    // 是否从本地迁移
  localBills?: any[];            // 本地账单数据
}

/**
 * 创建契约响应
 */
export interface CreateContractResponse {
  contract: Contract;
  inviteCode: string;
}

/**
 * 加入契约请求
 */
export interface JoinContractRequest {
  inviteCode: string;
}

/**
 * 加入契约响应
 */
export interface JoinContractResponse {
  contract: Contract;
  isNewMember: boolean;
}

// ============ 离线同步相关 ============

/**
 * 离线操作队列
 */
export interface OfflineQueue {
  _id: string;
  userId: string;
  operation: 'create_bill' | 'update_bill' | 'delete_bill';
  data: any;
  status: 'pending' | 'synced' | 'failed';
  retryCount: number;
  createdAt: Date;
  syncedAt?: Date;
  error?: string;
}

// ============ 同步状态 ============

/**
 * 同步状态
 */
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt?: Date;
  error?: string;
}