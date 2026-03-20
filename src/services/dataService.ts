/**
 * 数据服务层 - 统一数据访问接口
 * 支持双模式：本地模式（单机）和云端模式（协作）
 * 
 * 核心原则：
 * 1. 本地优先：所有数据先写入本地，确保不丢失
 * 2. 云端同步：云端模式下自动同步到云端
 * 3. 离线支持：离线时缓存操作，联网后自动同步
 */

import Taro from '@tarojs/taro'
import * as cloudService from './cloud'
import type { Bill, Participant } from '@/types/bill'
import type { WizardCompanion } from '@/types/companion'
import type { SubLedger } from '@/types/ledger'
import type { CloudUser, Contract, CloudBill, SyncStatus } from '@/types/cloud'

// ============ 存储键 ============
const STORAGE_KEYS = {
  BILLS: 'magic_bills',
  COMPANIONS: 'wizard_companions',
  SUBLEDGERS: 'magic_subledgers',
  ACTIVE_SUBLEDGER: 'active_accounting_subledger_id',
  SETTLED_SUBLEDGERS: 'magic_subledger_settled_',
  USER_SETTINGS: 'user_settings',
  CLOUD_MODE: 'use_cloud_mode',
  CLOUD_USER: 'cloud_user_info',
  OFFLINE_QUEUE: 'offline_queue',
  CURRENT_CONTRACT: 'current_contract_id'
}

// ============ 类型定义 ============
type DataMode = 'local' | 'cloud'

interface OfflineOperation {
  id: string
  operation: 'create_bill' | 'update_bill' | 'delete_bill'
  data: any
  timestamp: number
  retryCount: number
}

// ============ 核心类 ============

class DataService {
  private mode: DataMode = 'local'
  private syncStatus: SyncStatus = {
    isOnline: true,
    isSyncing: false,
    pendingCount: 0
  }
  private offlineQueue: OfflineOperation[] = []
  private networkCallback: ((isOnline: boolean) => void) | null = null

  constructor() {
    this.init()
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    // 加载用户设置
    const useCloudMode = Taro.getStorageSync(STORAGE_KEYS.CLOUD_MODE)
    if (useCloudMode) {
      this.mode = 'cloud'
    }

    // 加载离线队列
    this.offlineQueue = Taro.getStorageSync(STORAGE_KEYS.OFFLINE_QUEUE) || []

    // 监听网络状态
    this.watchNetwork()

    // 初始化云开发
    if (this.mode === 'cloud') {
      await cloudService.initCloud()
    }
  }

  /**
   * 监听网络状态
   */
  private watchNetwork(): void {
    Taro.onNetworkStatusChange((res) => {
      const wasOffline = !this.syncStatus.isOnline
      this.syncStatus.isOnline = res.networkType !== 'none'
      
      // 从离线恢复到在线，尝试同步
      if (wasOffline && this.syncStatus.isOnline) {
        this.syncOfflineQueue()
      }
      
      // 通知外部
      this.networkCallback?.(this.syncStatus.isOnline)
    })

    // 获取初始网络状态
    Taro.getNetworkType({
      success: (res) => {
        this.syncStatus.isOnline = res.networkType !== 'none'
      }
    })
  }

  /**
   * 设置网络状态回调
   */
  onNetworkChange(callback: (isOnline: boolean) => void): void {
    this.networkCallback = callback
  }

  /**
   * 获取当前模式
   */
  getMode(): DataMode {
    return this.mode
  }

  /**
   * 设置模式
   */
  async setMode(mode: DataMode): Promise<void> {
    this.mode = mode
    Taro.setStorageSync(STORAGE_KEYS.CLOUD_MODE, mode === 'cloud')

    if (mode === 'cloud') {
      await cloudService.initCloud()
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus, pendingCount: this.offlineQueue.length }
  }

  // ============ 账单相关 ============

  /**
   * 保存账单（双模式）
   */
  async saveBill(bill: Bill): Promise<Bill> {
    // 1. 本地存储（始终保存）
    const localBills = this.getLocalBills()
    const existingIndex = localBills.findIndex(b => b._id === bill._id)
    
    if (existingIndex >= 0) {
      localBills[existingIndex] = bill
    } else {
      localBills.push(bill)
    }
    
    Taro.setStorageSync(STORAGE_KEYS.BILLS, localBills)

    // 2. 云端同步
    if (this.mode === 'cloud' && bill.subledgerId) {
      if (this.syncStatus.isOnline) {
        try {
          await cloudService.createCloudBill({
            contractId: bill.subledgerId,
            spellType: bill.type,
            eventName: bill.eventName,
            totalAmount: bill.totalAmount,
            participants: bill.participants || []
          })
        } catch (error) {
          console.error('[DataService] 云端同步失败:', error)
          // 加入离线队列
          this.addToOfflineQueue('create_bill', bill)
        }
      } else {
        // 离线时加入队列
        this.addToOfflineQueue('create_bill', bill)
      }
    }

    return bill
  }

  /**
   * 获取本地账单
   */
  getLocalBills(): Bill[] {
    return Taro.getStorageSync(STORAGE_KEYS.BILLS) || []
  }

  /**
   * 删除账单
   */
  async deleteBill(billId: string): Promise<void> {
    // 1. 本地删除
    const localBills = this.getLocalBills()
    const filtered = localBills.filter(b => b._id !== billId)
    Taro.setStorageSync(STORAGE_KEYS.BILLS, filtered)

    // 2. 云端同步
    if (this.mode === 'cloud') {
      if (this.syncStatus.isOnline) {
        try {
          await cloudService.deleteCloudBill(billId)
        } catch (error) {
          console.error('[DataService] 云端删除失败:', error)
          this.addToOfflineQueue('delete_bill', { billId })
        }
      } else {
        this.addToOfflineQueue('delete_bill', { billId })
      }
    }
  }

  // ============ 巫师伙伴相关 ============

  /**
   * 获取本地巫师伙伴
   */
  getLocalCompanions(): WizardCompanion[] {
    return Taro.getStorageSync(STORAGE_KEYS.COMPANIONS) || []
  }

  /**
   * 保存巫师伙伴
   */
  saveCompanion(companion: WizardCompanion): void {
    const companions = this.getLocalCompanions()
    const existingIndex = companions.findIndex(c => c.id === companion.id)
    
    if (existingIndex >= 0) {
      companions[existingIndex] = companion
    } else {
      companions.push(companion)
    }
    
    Taro.setStorageSync(STORAGE_KEYS.COMPANIONS, companions)
  }

  /**
   * 删除巫师伙伴
   */
  deleteCompanion(id: string): void {
    const companions = this.getLocalCompanions()
    const filtered = companions.filter(c => c.id !== id)
    Taro.setStorageSync(STORAGE_KEYS.COMPANIONS, filtered)
  }

  // ============ 子账本相关 ============

  /**
   * 获取活跃子账本ID
   */
  getActiveSubLedgerId(): string | null {
    return Taro.getStorageSync(STORAGE_KEYS.ACTIVE_SUBLEDGER) || null
  }

  /**
   * 设置活跃子账本
   */
  setActiveSubLedgerId(id: string | null): void {
    if (id) {
      Taro.setStorageSync(STORAGE_KEYS.ACTIVE_SUBLEDGER, id)
    } else {
      Taro.removeStorageSync(STORAGE_KEYS.ACTIVE_SUBLEDGER)
    }
  }

  /**
   * 获取已结算子账本
   */
  getSettledSubLedger(subledgerId: string): SubLedger | null {
    return Taro.getStorageSync(STORAGE_KEYS.SETTLED_SUBLEDGERS + subledgerId) || null
  }

  /**
   * 保存已结算子账本
   */
  saveSettledSubLedger(subledger: SubLedger): void {
    Taro.setStorageSync(STORAGE_KEYS.SETTLED_SUBLEDGERS + subledger._id, subledger)
  }

  // ============ 离线队列相关 ============

  /**
   * 添加到离线队列
   */
  private addToOfflineQueue(operation: OfflineOperation['operation'], data: any): void {
    const item: OfflineOperation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0
    }
    
    this.offlineQueue.push(item)
    Taro.setStorageSync(STORAGE_KEYS.OFFLINE_QUEUE, this.offlineQueue)
    
    console.log('[DataService] 已加入离线队列:', item)
  }

  /**
   * 同步离线队列
   */
  async syncOfflineQueue(): Promise<void> {
    if (!this.syncStatus.isOnline || this.syncStatus.isSyncing || this.offlineQueue.length === 0) {
      return
    }

    this.syncStatus.isSyncing = true
    console.log('[DataService] 开始同步离线队列，共', this.offlineQueue.length, '项')

    const successIds: string[] = []

    for (const item of this.offlineQueue) {
      try {
        switch (item.operation) {
          case 'create_bill':
            await cloudService.createCloudBill({
              contractId: item.data.subledgerId,
              spellType: item.data.type,
              eventName: item.data.eventName,
              totalAmount: item.data.totalAmount,
              participants: item.data.participants || []
            })
            successIds.push(item.id)
            break
          case 'update_bill':
            await cloudService.updateCloudBill(item.data._id, item.data)
            successIds.push(item.id)
            break
          case 'delete_bill':
            await cloudService.deleteCloudBill(item.data.billId)
            successIds.push(item.id)
            break
        }
      } catch (error) {
        console.error('[DataService] 同步失败:', item, error)
        item.retryCount++
        
        // 超过3次重试，移除
        if (item.retryCount >= 3) {
          successIds.push(item.id) // 标记为已处理（失败）
          console.warn('[DataService] 超过重试次数，已放弃:', item)
        }
      }
    }

    // 移除成功/已放弃的项目
    this.offlineQueue = this.offlineQueue.filter(item => !successIds.includes(item.id))
    Taro.setStorageSync(STORAGE_KEYS.OFFLINE_QUEUE, this.offlineQueue)

    this.syncStatus.isSyncing = false
    this.syncStatus.lastSyncAt = new Date()
    
    console.log('[DataService] 离线队列同步完成')
  }

  // ============ 数据迁移 ============

  /**
   * 迁移本地数据到云端
   */
  async migrateLocalDataToCloud(): Promise<{ success: boolean; message: string }> {
    try {
      const localBills = this.getLocalBills()
      const localCompanions = this.getLocalCompanions()

      if (localBills.length === 0) {
        return { success: true, message: '没有需要迁移的数据' }
      }

      // 创建默认契约
      const result = await cloudService.createContract('我的第一个契约', '')
      
      if (!result.success || !result.data) {
        return { success: false, message: result.error?.message || '创建契约失败' }
      }

      const contract = result.data.contract

      // 迁移账单
      let successCount = 0
      for (const bill of localBills) {
        try {
          await cloudService.createCloudBill({
            contractId: contract._id,
            spellType: bill.type || 'simple',
            eventName: bill.eventName,
            totalAmount: bill.totalAmount,
            participants: bill.participants || []
          })
          successCount++
        } catch (error) {
          console.error('[DataService] 迁移账单失败:', bill._id, error)
        }
      }

      // 标记已迁移
      Taro.setStorageSync('data_migrated_to_cloud', true)
      Taro.setStorageSync(STORAGE_KEYS.CURRENT_CONTRACT, contract._id)

      return {
        success: true,
        message: `成功迁移 ${successCount}/${localBills.length} 条账单`
      }
    } catch (error) {
      console.error('[DataService] 数据迁移失败:', error)
      return {
        success: false,
        message: error.message || '数据迁移失败'
      }
    }
  }

  // ============ 清理 ============

  /**
   * 清除所有本地数据
   */
  clearAllLocalData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      Taro.removeStorageSync(key)
    })
    this.offlineQueue = []
  }
}

// 导出单例
export const dataService = new DataService()

// 导出类型
export type { DataMode, SyncStatus, OfflineOperation }