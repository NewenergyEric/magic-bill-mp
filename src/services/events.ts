// 事件中心 - 用于跨页面实时同步数据
import Taro from '@tarojs/taro'

// 事件类型
export const EVENTS = {
  COMPANION_UPDATED: 'companion_updated',
  WIZARD_INFO_CHANGED: 'wizard_info_changed'
} as const

// 巫师信息变更数据
export interface WizardInfoChangeData {
  oldName: string
  newName: string
  oldAvatar: string
  newAvatar: string
}

// 触发巫师信息变更事件
export function emitWizardInfoChanged(data: WizardInfoChangeData): void {
  try {
    Taro.eventCenter.trigger(EVENTS.WIZARD_INFO_CHANGED, data)
  } catch (e) {
    console.error('Failed to emit wizard info changed event:', e)
  }
}

// 监听巫师信息变更事件
export function onWizardInfoChanged(callback: (data: WizardInfoChangeData) => void): () => void {
  try {
    Taro.eventCenter.on(EVENTS.WIZARD_INFO_CHANGED, callback)
    // 返回取消监听函数
    return () => {
      Taro.eventCenter.off(EVENTS.WIZARD_INFO_CHANGED, callback)
    }
  } catch (e) {
    console.error('Failed to listen wizard info changed event:', e)
    return () => {}
  }
}

// 触发伙伴更新事件（通知刷新）
export function emitCompanionUpdated(): void {
  try {
    Taro.eventCenter.trigger(EVENTS.COMPANION_UPDATED)
  } catch (e) {
    console.error('Failed to emit companion updated event:', e)
  }
}

// 监听伙伴更新事件
export function onCompanionUpdated(callback: () => void): () => void {
  try {
    Taro.eventCenter.on(EVENTS.COMPANION_UPDATED, callback)
    return () => {
      Taro.eventCenter.off(EVENTS.COMPANION_UPDATED, callback)
    }
  } catch (e) {
    console.error('Failed to listen companion updated event:', e)
    return () => {}
  }
}