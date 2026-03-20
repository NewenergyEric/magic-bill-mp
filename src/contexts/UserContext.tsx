import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import Taro from '@tarojs/taro'
import { UserInfo, getLocalUser, updateUserInfo, logout as logoutService, isLoggedIn, getUserCompanion, initializeSelfCompanion } from '@/services/user'
import { WizardCompanion, SELF_ID } from '@/services/companions'
import { onWizardInfoChanged, WizardInfoChangeData } from '@/services/events'

interface UserContextType {
  user: UserInfo | null
  isLogged: boolean
  loading: boolean
  userCompanion: WizardCompanion | null
  login: (userInfo: { nickName: string; avatarUrl: string }, isWechatAvatar?: boolean) => Promise<void>
  logout: () => void
  refreshUser: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [userCompanion, setUserCompanion] = useState<WizardCompanion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
    // 确保存在"我"的伙伴
    initializeSelfCompanion()
  }, [])

  // 监听巫师信息变更事件（实时更新用户自己的巫师形象）
  useEffect(() => {
    const unsubscribe = onWizardInfoChanged((data: WizardInfoChangeData) => {
      // 更新用户自己的伙伴信息
      setUserCompanion(prev => {
        if (prev && (prev.name === data.oldName || prev.avatar === data.oldAvatar)) {
          return { ...prev, name: data.newName, avatar: data.newAvatar }
        }
        return prev
      })
      // 同时更新用户信息中的昵称和头像
      setUser(prev => {
        if (prev && (prev.nickName === data.oldName || prev.avatarUrl === data.oldAvatar)) {
          return { ...prev, nickName: data.newName, avatarUrl: data.newAvatar }
        }
        return prev
      })
    })
    return unsubscribe
  }, [])

  const loadUser = () => {
    setLoading(true)
    const localUser = getLocalUser()
    setUser(localUser)
    // 始终获取"我"的伙伴信息
    setUserCompanion(getUserCompanion())
    setLoading(false)
  }

  const login = async (userInfo: { nickName: string; avatarUrl: string }, isWechatAvatar: boolean = false) => {
    try {
      const updatedUser = await updateUserInfo(userInfo, isWechatAvatar)
      setUser(updatedUser)
      setUserCompanion(getUserCompanion())
      Taro.showToast({ title: '登录成功', icon: 'success' })
    } catch (err) {
      console.error('Login failed:', err)
      Taro.showToast({ title: '登录失败', icon: 'error' })
    }
  }

  const logout = () => {
    logoutService()
    setUser(null)
    // 登出后仍然保留"我"的伙伴，但avatar会清空
    setUserCompanion(getUserCompanion())
  }

  const refreshUser = () => {
    loadUser()
  }

  return (
    <UserContext.Provider value={{
      user,
      isLogged: isLoggedIn(),
      loading,
      userCompanion,
      login,
      logout,
      refreshUser
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}