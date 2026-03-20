/**
 * 云服务层 - 封装所有云开发相关操作
 * 支持双模式：本地模式（单机）和云端模式（协作）
 */

import Taro from '@tarojs/taro'
import type {
  CloudUser,
  Contract,
  CloudBill,
  Howler,
  SyncStatus,
  LoginResponse,
  CreateContractResponse,
  JoinContractResponse,
  CloudResponse
} from '@/types/cloud'

// 云开发环境ID
const CLOUD_ENV_ID = 'magic-bill-5g9dh4bc1c0b68a8'
let cloudEnvId: string = CLOUD_ENV_ID

/**
 * 初始化云开发
 */
export async function initCloud(envId?: string): Promise<boolean> {
  try {
    if (envId) {
      cloudEnvId = envId
    }
    
    // @ts-ignore - Taro 云开发 API
    if (Taro.cloud) {
      // @ts-ignore
      await Taro.cloud.init({
        env: cloudEnvId || Taro.cloud.DYNAMIC_CURRENT_ENV,
        traceUser: true
      })
      console.log('[Cloud] 云开发初始化成功')
      return true
    }
    return false
  } catch (error) {
    console.error('[Cloud] 云开发初始化失败:', error)
    return false
  }
}

/**
 * 获取网络状态
 */
export function isOnline(): boolean {
  const networkType = Taro.getStorageSync('networkType')
  return networkType && networkType !== 'none'
}

/**
 * 监听网络状态变化
 */
export function onNetworkStatusChange(callback: (isOnline: boolean) => void) {
  Taro.onNetworkStatusChange((res) => {
    Taro.setStorageSync('networkType', res.networkType)
    callback(res.networkType !== 'none')
  })
}

// ============ 用户相关 ============

/**
 * 用户登录
 */
export async function cloudLogin(nickname?: string, avatarUrl?: string): Promise<CloudResponse<LoginResponse>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'login',
      data: {
        nickname,
        avatarUrl
      }
    })
    
    return result.result as CloudResponse<LoginResponse>
  } catch (error) {
    console.error('[Cloud] 登录失败:', error)
    return {
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: error.message || '登录失败'
      }
    }
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentCloudUser(): Promise<CloudUser | null> {
  try {
    const userId = Taro.getStorageSync('cloud_user_id')
    if (!userId) return null

    // 从本地缓存获取
    const cachedUser = Taro.getStorageSync('cloud_user_info')
    if (cachedUser) {
      return cachedUser
    }

    return null
  } catch (error) {
    console.error('[Cloud] 获取用户信息失败:', error)
    return null
  }
}

/**
 * 保存用户信息到本地缓存
 */
export function saveCloudUserLocal(user: CloudUser): void {
  Taro.setStorageSync('cloud_user_id', user._id)
  Taro.setStorageSync('cloud_user_info', user)
}

/**
 * 清除用户信息
 */
export function clearCloudUser(): void {
  Taro.removeStorageSync('cloud_user_id')
  Taro.removeStorageSync('cloud_user_info')
}

// ============ 契约相关 ============

/**
 * 创建契约
 */
export async function createContract(
  name: string,
  timeSlot?: string
): Promise<CloudResponse<CreateContractResponse>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'contract',
      data: {
        action: 'create',
        data: {
          name,
          timeSlot
        }
      }
    })
    
    return result.result as CloudResponse<CreateContractResponse>
  } catch (error) {
    console.error('[Cloud] 创建契约失败:', error)
    return {
      success: false,
      error: {
        code: 'CREATE_CONTRACT_ERROR',
        message: error.message || '创建契约失败'
      }
    }
  }
}

/**
 * 加入契约
 */
export async function joinContract(inviteCode: string): Promise<CloudResponse<JoinContractResponse>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'contract',
      data: {
        action: 'join',
        data: {
          inviteCode
        }
      }
    })
    
    return result.result as CloudResponse<JoinContractResponse>
  } catch (error) {
    console.error('[Cloud] 加入契约失败:', error)
    return {
      success: false,
      error: {
        code: 'JOIN_CONTRACT_ERROR',
        message: error.message || '加入契约失败'
      }
    }
  }
}

/**
 * 获取我的契约列表
 */
export async function getMyContracts(): Promise<CloudResponse<{ contracts: Contract[] }>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'contract',
      data: {
        action: 'getMyContracts'
      }
    })
    
    return result.result as CloudResponse<{ contracts: Contract[] }>
  } catch (error) {
    console.error('[Cloud] 获取契约列表失败:', error)
    return {
      success: false,
      error: {
        code: 'GET_CONTRACTS_ERROR',
        message: error.message || '获取契约列表失败'
      }
    }
  }
}

/**
 * 获取契约详情
 */
export async function getContractDetail(contractId: string): Promise<CloudResponse<{ contract: Contract; myRole: string }>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'contract',
      data: {
        action: 'getContractDetail',
        data: {
          contractId
        }
      }
    })
    
    return result.result as CloudResponse<{ contract: Contract; myRole: string }>
  } catch (error) {
    console.error('[Cloud] 获取契约详情失败:', error)
    return {
      success: false,
      error: {
        code: 'GET_CONTRACT_ERROR',
        message: error.message || '获取契约详情失败'
      }
    }
  }
}

/**
 * 退出契约
 */
export async function leaveContract(contractId: string): Promise<CloudResponse<{ message: string }>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'contract',
      data: {
        action: 'leaveContract',
        data: {
          contractId
        }
      }
    })
    
    return result.result as CloudResponse<{ message: string }>
  } catch (error) {
    console.error('[Cloud] 退出契约失败:', error)
    return {
      success: false,
      error: {
        code: 'LEAVE_CONTRACT_ERROR',
        message: error.message || '退出契约失败'
      }
    }
  }
}

/**
 * 刷新邀请码
 */
export async function refreshInviteCode(contractId: string): Promise<CloudResponse<{ inviteCode: string }>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'contract',
      data: {
        action: 'refreshInviteCode',
        data: {
          contractId
        }
      }
    })

    return result.result as CloudResponse<{ inviteCode: string }>
  } catch (error) {
    console.error('[Cloud] 刷新邀请码失败:', error)
    return {
      success: false,
      error: {
        code: 'REFRESH_INVITE_CODE_ERROR',
        message: error.message || '刷新邀请码失败'
      }
    }
  }
}

/**
 * 驱逐成员
 */
export async function removeMember(contractId: string, memberId: string): Promise<CloudResponse<{ message: string }>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'contract',
      data: {
        action: 'removeMember',
        data: {
          contractId,
          memberId
        }
      }
    })
    
    return result.result as CloudResponse<{ message: string }>
  } catch (error) {
    console.error('[Cloud] 驱逐成员失败:', error)
    return {
      success: false,
      error: {
        code: 'REMOVE_MEMBER_ERROR',
        message: error.message || '驱逐成员失败'
      }
    }
  }
}

// ============ 账单相关 ============

/**
 * 创建账单
 */
export async function createCloudBill(bill: {
  contractId: string
  spellType: 'simple' | 'multi'
  eventName: string
  totalAmount: number
  avgInCents: number
  participants: any[]
}): Promise<CloudResponse<{ bill: CloudBill }>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'bill',
      data: {
        action: 'create',
        data: bill
      }
    })
    
    return result.result as CloudResponse<{ bill: CloudBill }>
  } catch (error) {
    console.error('[Cloud] 创建账单失败:', error)
    return {
      success: false,
      error: {
        code: 'CREATE_BILL_ERROR',
        message: error.message || '创建账单失败'
      }
    }
  }
}

/**
 * 更新账单
 */
export async function updateCloudBill(billId: string, updates: any): Promise<CloudResponse<{ bill: CloudBill }>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'bill',
      data: {
        action: 'update',
        data: {
          billId,
          updates
        }
      }
    })
    
    return result.result as CloudResponse<{ bill: CloudBill }>
  } catch (error) {
    console.error('[Cloud] 更新账单失败:', error)
    return {
      success: false,
      error: {
        code: 'UPDATE_BILL_ERROR',
        message: error.message || '更新账单失败'
      }
    }
  }
}

/**
 * 删除账单
 */
export async function deleteCloudBill(billId: string): Promise<CloudResponse<{ message: string }>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'bill',
      data: {
        action: 'delete',
        data: {
          billId
        }
      }
    })
    
    return result.result as CloudResponse<{ message: string }>
  } catch (error) {
    console.error('[Cloud] 删除账单失败:', error)
    return {
      success: false,
      error: {
        code: 'DELETE_BILL_ERROR',
        message: error.message || '删除账单失败'
      }
    }
  }
}

/**
 * 获取契约的账单列表
 */
export async function getBillsByContract(contractId: string): Promise<CloudResponse<{ bills: CloudBill[] }>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'bill',
      data: {
        action: 'getByContract',
        data: {
          contractId
        }
      }
    })
    
    return result.result as CloudResponse<{ bills: CloudBill[] }>
  } catch (error) {
    console.error('[Cloud] 获取账单列表失败:', error)
    return {
      success: false,
      error: {
        code: 'GET_BILLS_ERROR',
        message: error.message || '获取账单列表失败'
      }
    }
  }
}

// ============ 吼叫信相关 ============

/**
 * 发送吼叫信
 */
export async function sendHowler(billId: string, reason?: string): Promise<CloudResponse<{ message: string }>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'bill',
      data: {
        action: 'sendHowler',
        data: {
          billId,
          reason
        }
      }
    })
    
    return result.result as CloudResponse<{ message: string }>
  } catch (error) {
    console.error('[Cloud] 发送吼叫信失败:', error)
    return {
      success: false,
      error: {
        code: 'SEND_HOWLER_ERROR',
        message: error.message || '发送吼叫信失败'
      }
    }
  }
}

/**
 * 解决吼叫信
 */
export async function resolveHowler(billId: string): Promise<CloudResponse<{ message: string }>> {
  try {
    // @ts-ignore
    const result = await Taro.cloud.callFunction({
      name: 'bill',
      data: {
        action: 'resolveHowler',
        data: {
          billId
        }
      }
    })
    
    return result.result as CloudResponse<{ message: string }>
  } catch (error) {
    console.error('[Cloud] 解决吼叫信失败:', error)
    return {
      success: false,
      error: {
        code: 'RESOLVE_HOWLER_ERROR',
        message: error.message || '解决吼叫信失败'
      }
    }
  }
}

// ============ 数据库实时监听 ============

/**
 * 监听契约变化
 */
export function watchContract(
  contractId: string,
  onChange: (contract: Contract) => void,
  onError?: (error: any) => void
): () => void {
  try {
    // @ts-ignore
    const db = Taro.cloud.database()
    const watcher = db.collection('contracts')
      .doc(contractId)
      .watch({
        onChange: (snapshot: any) => {
          if (snapshot.docChanges && snapshot.docChanges.length > 0) {
            onChange(snapshot.docChanges[0].doc)
          }
        },
        onError: (error: any) => {
          console.error('[Cloud] 监听契约变化失败:', error)
          onError?.(error)
        }
      })
    
    return () => watcher.close()
  } catch (error) {
    console.error('[Cloud] 创建契约监听失败:', error)
    return () => {}
  }
}

/**
 * 监听账单变化
 */
export function watchBills(
  contractId: string,
  onChange: (bills: CloudBill[]) => void,
  onError?: (error: any) => void
): () => void {
  try {
    // @ts-ignore
    const db = Taro.cloud.database()
    const watcher = db.collection('bills')
      .where({ contractId })
      .watch({
        onChange: (snapshot: any) => {
          onChange(snapshot.docs)
        },
        onError: (error: any) => {
          console.error('[Cloud] 监听账单变化失败:', error)
          onError?.(error)
        }
      })
    
    return () => watcher.close()
  } catch (error) {
    console.error('[Cloud] 创建账单监听失败:', error)
    return () => {}
  }
}