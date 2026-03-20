import Taro from '@tarojs/taro'
import { updateSelfCompanion, getSelfCompanion, ensureSelfCompanion, WizardCompanion } from './companions'

// 用户信息接口
export interface UserInfo {
  _id?: string
  openid?: string
  nickName: string
  avatarUrl: string
  createTime?: number
  updateTime?: number
  companionId?: string  // 关联的巫师伙伴ID
}

// 本地存储键名
const USER_INFO_KEY = 'magic_user_info'

/**
 * 获取本地存储的用户信息
 */
export function getLocalUser(): UserInfo | null {
  try {
    const user = Taro.getStorageSync(USER_INFO_KEY)
    return user || null
  } catch {
    return null
  }
}

/**
 * 保存用户信息到本地
 */
export function saveLocalUser(user: UserInfo): void {
  Taro.setStorageSync(USER_INFO_KEY, user)
}

/**
 * 清除本地用户信息
 */
export function clearLocalUser(): void {
  Taro.removeStorageSync(USER_INFO_KEY)
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  const user = getLocalUser()
  return !!(user && user.nickName && user.avatarUrl)
}

/**
 * 获取用户的巫师伙伴（如果存在）
 */
export function getUserCompanion(): WizardCompanion | null {
  return getSelfCompanion()
}

/**
 * 初始化：确保存在"我"的伙伴（未登录时也创建）
 */
export function initializeSelfCompanion(): WizardCompanion {
  return ensureSelfCompanion()
}

/**
 * 微信登录 - 获取 openid
 */
export async function wxLogin(): Promise<{ openid?: string; errMsg?: string }> {
  try {
    const loginRes = await Taro.login()
    console.log('wx.login success:', loginRes.code)
    const openid = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return { openid }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('wx.login failed:', errMsg)
    return { errMsg }
  }
}

/**
 * 更新用户头像和昵称（登录时自动创建/更新巫师伙伴）
 * @param userInfo 用户选择的头像和昵称
 * @param isWechatAvatar 是否使用微信头像（true时保存完整URL）
 */
export async function updateUserInfo(
  userInfo: { nickName: string; avatarUrl: string },
  isWechatAvatar: boolean = false
): Promise<UserInfo> {
  const localUser = getLocalUser()
  const now = Date.now()
  
  // 创建或更新自己的巫师伙伴形象
  // 如果是微信头像，直接使用URL；否则是预设形象名称
  const selfCompanion = updateSelfCompanion(userInfo.nickName, userInfo.avatarUrl, isWechatAvatar)
  
  if (!localUser?._id) {
    // 新用户登录
    const loginRes = await wxLogin()
    
    const newUser: UserInfo = {
      _id: `user_${Date.now()}`,
      openid: loginRes.openid,
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
      createTime: now,
      updateTime: now,
      companionId: selfCompanion.id
    }
    saveLocalUser(newUser)
    return newUser
  }
  
  // 更新现有用户
  const updatedUser: UserInfo = {
    ...localUser,
    nickName: userInfo.nickName,
    avatarUrl: userInfo.avatarUrl,
    companionId: selfCompanion.id,
    updateTime: now
  }
  
  saveLocalUser(updatedUser)
  return updatedUser
}

/**
 * 获取用户信息
 */
export function getUserInfo(): UserInfo | null {
  return getLocalUser()
}

/**
 * 用户登出（静默退出，不删除伙伴）
 */
export function logout(): void {
  clearLocalUser()
}