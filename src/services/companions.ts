// 巫师伙伴服务
// 用于存储和管理用户自定义的巫师伙伴

import Taro from '@tarojs/taro'
import { emitWizardInfoChanged, WizardInfoChangeData } from './events'

export interface WizardCompanion {
  id: string
  name: string
  avatar: string  // 头像：预设形象名称 或 微信头像URL
  createdAt: number
  isSelf?: boolean  // 是否是用户自己的形象（不可删除）
  isWechatAvatar?: boolean  // 是否使用微信头像
}

const STORAGE_KEY = 'wizard_companions'
const SELF_ID = 'self_companion'  // 固定的"我"的ID

// 获取所有巫师伙伴
export function getCompanions(): WizardCompanion[] {
  try {
    const data = Taro.getStorageSync(STORAGE_KEY)
    return data || []
  } catch {
    return []
  }
}

// 保存所有巫师伙伴
export function saveCompanions(companions: WizardCompanion[]): void {
  Taro.setStorageSync(STORAGE_KEY, companions)
}

// 获取用户自己的伙伴形象
export function getSelfCompanion(): WizardCompanion | null {
  const companions = getCompanions()
  return companions.find(c => c.id === SELF_ID) || null
}

// 确保存在"我"的伙伴（未登录时也创建，但avatar为空）
export function ensureSelfCompanion(): WizardCompanion {
  const companions = getCompanions()
  let selfCompanion = companions.find(c => c.id === SELF_ID)
  
  if (!selfCompanion) {
    // 创建默认的"我"
    selfCompanion = {
      id: SELF_ID,
      name: '我',
      avatar: '',  // 未登录时为空
      createdAt: Date.now(),
      isSelf: true,
      isWechatAvatar: false
    }
    companions.unshift(selfCompanion)
    saveCompanions(companions)
  }
  
  return selfCompanion
}

// 添加巫师伙伴（确保不会创建重复的"我"）
export function addCompanion(companion: Omit<WizardCompanion, 'id' | 'createdAt' | 'isSelf'>): WizardCompanion {
  const companions = getCompanions()
  
  // 确保不创建重复的"我"
  const newCompanion: WizardCompanion = {
    ...companion,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    createdAt: Date.now(),
    isSelf: false
  }
  companions.push(newCompanion)
  saveCompanions(companions)
  return newCompanion
}

// 更新用户自己的伙伴形象（登录时调用）
export function updateSelfCompanion(name: string, avatar: string, isWechatAvatar: boolean = false): WizardCompanion {
  const companions = getCompanions()
  let selfCompanion = companions.find(c => c.id === SELF_ID)
  
  if (selfCompanion) {
    const oldName = selfCompanion.name
    const oldAvatar = selfCompanion.avatar || ''
    
    // 同步更新账单中的名字和头像
    if (name && name !== oldName) {
      syncWizardNameInBills(oldName, name)
    }
    if (avatar && avatar !== oldAvatar) {
      syncWizardAvatarInBills(name || oldName, avatar)
    }
    
    // 更新现有的
    selfCompanion.name = name
    selfCompanion.avatar = avatar
    selfCompanion.isWechatAvatar = isWechatAvatar
    saveCompanions(companions)
    
    // 触发事件，通知其他页面实时更新
    const finalName = name || oldName
    const finalAvatar = avatar || oldAvatar
    if ((name && name !== oldName) || (avatar && avatar !== oldAvatar)) {
      emitWizardInfoChanged({
        oldName,
        newName: finalName,
        oldAvatar,
        newAvatar: finalAvatar
      })
    }
    
    return selfCompanion
  } else {
    // 创建新的
    const newSelf: WizardCompanion = {
      id: SELF_ID,
      name,
      avatar,
      createdAt: Date.now(),
      isSelf: true,
      isWechatAvatar
    }
    companions.unshift(newSelf)
    saveCompanions(companions)
    return newSelf
  }
}

// 检查伙伴是否可以被选中（未登录时头像为空的"我"不能选中）
export function canSelectCompanion(companion: WizardCompanion, isLoggedIn: boolean): boolean {
  // 如果是"我"，必须已登录且有头像
  if (companion.isSelf) {
    return isLoggedIn && !!companion.avatar
  }
  // 其他伙伴必须有头像
  return !!companion.avatar
}

// 检查伙伴是否已存在（根据名字）
export function findCompanionByName(name: string): WizardCompanion | null {
  const companions = getCompanions()
  return companions.find(c => c.name === name) || null
}

// 添加或更新伙伴（如果同名则更新头像）
export function addOrUpdateCompanion(name: string, avatar: string): WizardCompanion {
  const existing = findCompanionByName(name)
  
  if (existing) {
    // 更新头像
    updateCompanion(existing.id, { avatar })
    return { ...existing, avatar }
  }
  
  // 添加新伙伴
  return addCompanion({ name, avatar })
}

// 更新巫师伙伴
export function updateCompanion(id: string, data: Partial<WizardCompanion>): boolean {
  const companions = getCompanions()
  const index = companions.findIndex(c => c.id === id)
  if (index === -1) return false

  const oldCompanion = companions[index]
  const oldName = oldCompanion.name
  const oldAvatar = oldCompanion.avatar || ''
  const newName = data.name
  const newAvatar = data.avatar

  // 先更新名字（如果需要），这样才能用新名字更新头像
  if (newName && newName !== oldName) {
    syncWizardNameInBills(oldName, newName)
  }

  // 再更新头像（使用新名字）
  const nameForAvatarSync = newName || oldName
  if (newAvatar && newAvatar !== oldCompanion.avatar) {
    syncWizardAvatarInBills(nameForAvatarSync, newAvatar)
  }

  // 如果是自己的形象，不允许修改 isSelf 字段
  if (companions[index].isSelf && data.isSelf === false) {
    delete data.isSelf
  }

  companions[index] = { ...companions[index], ...data }
  saveCompanions(companions)

  // 触发事件，通知其他页面实时更新
  const finalName = newName || oldName
  const finalAvatar = newAvatar || oldAvatar
  if ((newName && newName !== oldName) || (newAvatar && newAvatar !== oldAvatar)) {
    emitWizardInfoChanged({
      oldName,
      newName: finalName,
      oldAvatar,
      newAvatar: finalAvatar
    })
  }

  return true
}

/**
 * 同步更新所有账单中巫师的名字
 * 当用户在休息室修改巫师名字时调用，确保账单中的巫师名称一致
 */
function syncWizardNameInBills(oldName: string, newName: string): void {
  const BILLS_KEY = 'magic_bills'

  try {
    const bills: any[] = Taro.getStorageSync(BILLS_KEY) || []
    let updated = false

    bills.forEach((bill) => {
      // 更新 participants 中的名字
      if (bill.details?.participants) {
        bill.details.participants.forEach((p: any) => {
          if (p.name === oldName) {
            p.name = newName
            updated = true
          }
        })
      }

      // 更新 settlements 中的名字（from 和 to）
      if (bill.details?.settlements) {
        bill.details.settlements.forEach((s: any) => {
          if (s.from === oldName) {
            s.from = newName
            updated = true
          }
          if (s.to === oldName) {
            s.to = newName
            updated = true
          }
        })
      }
    })

    if (updated) {
      Taro.setStorageSync(BILLS_KEY, bills)
    }
  } catch (e) {
    console.error('Failed to sync wizard name in bills:', e)
  }
}

/**
 * 同步更新所有账单中巫师的头像
 * 当用户在休息室修改巫师头像时调用，确保账单中的巫师头像一致
 */
function syncWizardAvatarInBills(wizardName: string, newAvatar: string): void {
  const BILLS_KEY = 'magic_bills'

  try {
    const bills: any[] = Taro.getStorageSync(BILLS_KEY) || []
    let updated = false

    bills.forEach((bill) => {
      // 更新 participants 中的头像
      if (bill.details?.participants) {
        bill.details.participants.forEach((p: any) => {
          if (p.name === wizardName) {
            p.avatar = newAvatar
            updated = true
          }
        })
      }
    })

    if (updated) {
      Taro.setStorageSync(BILLS_KEY, bills)
    }
  } catch (e) {
    console.error('Failed to sync wizard avatar in bills:', e)
  }
}

// 删除巫师伙伴（自己的形象不可删除）
export function deleteCompanion(id: string): { success: boolean; reason?: string } {
  const companions = getCompanions()
  const target = companions.find(c => c.id === id)
  
  if (!target) {
    return { success: false, reason: '伙伴不存在' }
  }
  
  if (target.isSelf) {
    return { success: false, reason: '不能删除自己的巫师形象' }
  }
  
  const filtered = companions.filter(c => c.id !== id)
  saveCompanions(filtered)
  return { success: true }
}

// 根据 ID 获取巫师伙伴
export function getCompanionById(id: string): WizardCompanion | null {
  const companions = getCompanions()
  return companions.find(c => c.id === id) || null
}