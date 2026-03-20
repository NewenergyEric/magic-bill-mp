import { View, Text, Input, Button, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { getCompanions, addCompanion, deleteCompanion, updateCompanion, WizardCompanion, canSelectCompanion } from '@/services/companions'
import { useUser } from '@/contexts/UserContext'
import { WIZARDS } from '@/constants/wizards'
import WizardAvatar from '@/components/WizardAvatar'
import NewbieGuide, { shouldShowGuide } from '@/components/NewbieGuide'
import UserLogin from '@/components/UserLogin'
import './index.scss'

export default function CompanionsPage() {
  const { user, isLogged } = useUser()
  const [companions, setCompanions] = useState<WizardCompanion[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  
  // 编辑头像
  const [editingCompanion, setEditingCompanion] = useState<WizardCompanion | null>(null)
  const [editAvatar, setEditAvatar] = useState('')

  // 编辑名字
  const [editingName, setEditingName] = useState<WizardCompanion | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  
  // 新手引导
  const [showGuide, setShowGuide] = useState(false)
  
  useDidShow(() => {
    setCompanions(getCompanions())
  })
  
  // 检查是否需要显示新手引导
  useEffect(() => {
    if (shouldShowGuide('companion')) {
      setTimeout(() => setShowGuide(true), 500)
    }
  }, [])

  const handleAddCompanion = () => {
    if (!newName.trim()) {
      Taro.showToast({ title: '请输入名字', icon: 'none' })
      return
    }
    if (!selectedAvatar) {
      Taro.showToast({ title: '请选择头像', icon: 'none' })
      return
    }
    
    addCompanion({ name: newName.trim(), avatar: selectedAvatar })
    setCompanions(getCompanions())
    setNewName('')
    setSelectedAvatar('')
    setIsAdding(false)
    Taro.showToast({ title: '伙伴已加入！', icon: 'success' })
  }

  const handleDelete = (companion: WizardCompanion) => {
    // 自己的形象不能遗忘
    if (companion.isSelf) {
      Taro.showToast({ title: '自己的形象不能遗忘', icon: 'none' })
      return
    }
    
    Taro.showModal({
      title: '确认遗忘',
      content: `确定要让 ${companion.name} 离开吗？`,
      success: (res) => {
        if (res.confirm) {
          const result = deleteCompanion(companion.id)
          if (result.success) {
            setCompanions(getCompanions())
            Taro.showToast({ title: '已遗忘', icon: 'success' })
          } else {
            Taro.showToast({ title: result.reason || '遗忘失败', icon: 'none' })
          }
        }
      }
    })
  }

  // 打开编辑头像弹窗
  const openEditAvatar = (companion: WizardCompanion) => {
    setEditingCompanion(companion)
    setEditAvatar(companion.avatar || '')
    setEditNameValue(companion.name) // 初始化名字
  }

  // 打开编辑名字弹窗
  const openEditName = (companion: WizardCompanion) => {
    // 自己的名字不能修改
    if (companion.isSelf) {
      Taro.showToast({ title: '自己的名字不可修改', icon: 'none' })
      return
    }
    setEditingName(companion)
    setEditNameValue(companion.name)
  }

  // 确认编辑名字
  const confirmEditName = () => {
    if (!editingName || !editNameValue.trim()) return

    const newName = editNameValue.trim()
    if (newName === editingName.name) {
      setEditingName(null)
      return
    }

    // 检查新名字是否已被使用
    const existing = companions.find(c => c.name === newName && c.id !== editingName.id)
    if (existing) {
      Taro.showToast({ title: '该名字已被使用', icon: 'none' })
      return
    }

    updateCompanion(editingName.id, { name: newName })
    setCompanions(getCompanions())
    setEditingName(null)
    Taro.showToast({ title: '名字已更新', icon: 'success' })
  }

  // 确认编辑头像
  const confirmEditAvatar = () => {
    if (!editingCompanion || !editAvatar) return
    
    updateCompanion(editingCompanion.id, { avatar: editAvatar })
    setCompanions(getCompanions())
    setEditingCompanion(null)
    setEditAvatar('')
    Taro.showToast({ title: '头像已更新', icon: 'success' })
  }

  return (
    <View className='companions-page'>
      {/* Header */}
      <View className='page-header'>
        <View 
          className='help-btn'
          onClick={() => setShowGuide(true)}
        >
          <Text className='help-icon'>?</Text>
        </View>
        <Text className='header-icon'>🧙</Text>
        <Text className='header-title'>休息室</Text>
        
        {/* 用户头像入口 */}
        <View
          className='user-avatar-btn'
          onClick={() => setShowLoginModal(true)}
        >
          {isLogged && user?.avatarUrl ? (
            <WizardAvatar name={user.avatarUrl} size='small' />
          ) : (
            <View className='avatar-placeholder-small'>
              <Text className='placeholder-text-small'>未登录</Text>
            </View>
          )}
        </View>
      </View>

      {/* 登录弹窗 */}
      {showLoginModal && (
        <View className='login-modal-overlay' onClick={() => setShowLoginModal(false)}>
          <View className='login-modal-content' onClick={(e) => e.stopPropagation()}>
            <UserLogin onClose={() => setShowLoginModal(false)} />
          </View>
        </View>
      )}

      {/* 说明 */}
      <View className='tips-card'>
        <Text className='tips-text'>在休息室创建你的巫师伙伴，施咒时快速召唤他们！</Text>
        {!isLogged && (
          <Text className='tips-hint'>💡 登录后可创建自己的巫师形象</Text>
        )}
      </View>

      {/* 添加按钮 */}
      {!isAdding && (
        <View className='add-companion-btn' onClick={() => setIsAdding(true)}>
          <Text className='add-icon'>+ 添加新伙伴</Text>
        </View>
      )}

      {/* 添加表单 */}
      {isAdding && (
        <View className='add-form'>
          <View className='form-title'>创建巫师伙伴</View>
          
          <View className='form-section'>
            <Text className='form-label'>选择头像</Text>
            <View className='avatar-grid'>
              {WIZARDS.map((w) => (
                <View 
                  key={w.avatar} 
                  className={`avatar-option ${selectedAvatar === w.avatar ? 'selected' : ''}`}
                  onClick={() => setSelectedAvatar(w.avatar)}
                >
                  <WizardAvatar name={w.avatar} />
                </View>
              ))}
            </View>
          </View>

          <View className='form-section'>
            <Text className='form-label'>伙伴名字</Text>
            <Input
              className='name-input'
              type='text'
              value={newName}
              onInput={(e) => setNewName(e.detail.value)}
              placeholder='给伙伴起个名字'
              placeholderStyle='font-size: 30rpx; color: rgba(44, 30, 26, 0.4);'
              maxLength={10}
            />
          </View>

          <View className='form-actions'>
            <Text className='cancel-btn' onClick={() => {
              setIsAdding(false)
              setNewName('')
              setSelectedAvatar('')
            }}>取消</Text>
            <Text className='confirm-btn' onClick={handleAddCompanion}>确认添加</Text>
          </View>
        </View>
      )}

      {/* 伙伴列表 */}
      <View className='companions-list'>
        {companions.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>🪄</Text>
            <Text className='empty-text'>还没有伙伴，快去添加吧！</Text>
          </View>
        ) : (
          companions.map((companion, index) => {
            const selectable = canSelectCompanion(companion, isLogged)
            return (
              <View key={companion.id} className={`companion-item ${companion.isSelf ? 'is-self' : ''} ${!selectable ? 'disabled' : ''}`}>
                <View className='companion-index'>
                  <Text className='index-num'>{index + 1}</Text>
                </View>
                <View className='companion-avatar' onClick={() => openEditAvatar(companion)}>
                  {companion.avatar ? (
                    <WizardAvatar name={companion.avatar} />
                  ) : (
                    <View className='avatar-placeholder'>👤</View>
                  )}
                </View>
                <View className='companion-info' onClick={() => openEditAvatar(companion)}>
                  <Text className='companion-name'>{companion.name}</Text>
                  {companion.isSelf && (
                    <Text className='self-badge'>{isLogged ? (companion.isWechatAvatar ? '微信头像' : '我') : '未登录'}</Text>
                  )}
                </View>
                {!companion.isSelf && (
                  <View
                    className='delete-btn'
                    onClick={() => handleDelete(companion)}
                  >
                    <Text className='delete-icon'>✕</Text>
                  </View>
                )}
              </View>
            )
          })
        )}
      </View>

      {/* 编辑头像弹窗 */}
      {editingCompanion && (
        <View className='edit-avatar-modal' onClick={() => setEditingCompanion(null)}>
          <View className='edit-avatar-content' onClick={(e) => e.stopPropagation()}>
            <View className='edit-header'>
              <Text className='edit-title'>选择头像</Text>
              <View className='edit-close' onClick={() => setEditingCompanion(null)}>
                <Text className='close-icon'>✕</Text>
              </View>
            </View>

            <View className='edit-name-row'>
              <Text className='name-label'>伙伴：</Text>
              {editingCompanion?.isSelf ? (
                <Text className='name-text'>{editingCompanion.name}</Text>
              ) : (
                <Input
                  className='name-input-inline'
                  type='text'
                  value={editNameValue}
                  onInput={(e) => setEditNameValue(e.detail.value)}
                  placeholder='点击输入名字'
                  maxlength={20}
                />
              )}
            </View>

            <View className='avatar-grid'>
              {WIZARDS.map((w) => (
                <View
                  key={w.avatar}
                  className={`avatar-option ${editAvatar === w.avatar ? 'selected' : ''}`}
                  onClick={() => setEditAvatar(w.avatar)}
                >
                  <WizardAvatar name={w.avatar} />
                </View>
              ))}
            </View>

            <View className='edit-actions'>
              <Text className='edit-cancel' onClick={() => setEditingCompanion(null)}>取消</Text>
              <Text className='edit-confirm' onClick={() => {
                if (!editingCompanion) return
                // 如果名字变了，先更新名字
                if (editNameValue.trim() && editNameValue.trim() !== editingCompanion.name) {
                  // 检查名字是否被占用
                  const existing = companions.find(c => c.name === editNameValue.trim() && c.id !== editingCompanion.id)
                  if (existing) {
                    Taro.showToast({ title: '该名字已被使用', icon: 'none' })
                    return
                  }
                  updateCompanion(editingCompanion.id, { name: editNameValue.trim() })
                }
                // 更新头像
                updateCompanion(editingCompanion.id, { avatar: editAvatar })
                setCompanions(getCompanions())
                setEditingCompanion(null)
                Taro.showToast({ title: '已更新', icon: 'success' })
              }}>确认</Text>
            </View>
          </View>
        </View>
      )}

      {/* 编辑名字弹窗 */}
      {editingName && (
        <View className='edit-name-modal' onClick={() => setEditingName(null)}>
          <View className='edit-name-content' onClick={(e) => e.stopPropagation()}>
            <View className='edit-header'>
              <Text className='edit-title'>修改名字</Text>
              <View className='edit-close' onClick={() => setEditingName(null)}>
                <Text className='close-icon'>✕</Text>
              </View>
            </View>

            <View className='edit-name-form'>
              <Text className='form-label'>新名字</Text>
              <Input
                className='name-input'
                type='text'
                value={editNameValue}
                onInput={(e) => setEditNameValue(e.detail.value)}
                placeholder='请输入新名字'
                maxlength={20}
                autoFocus
              />
            </View>

            <View className='edit-actions'>
              <Text className='edit-cancel' onClick={() => setEditingName(null)}>取消</Text>
              <Text className='edit-confirm' onClick={confirmEditName}>确认</Text>
            </View>
          </View>
        </View>
      )}

      {/* 新手引导 */}
      {showGuide && (
        <NewbieGuide 
          type='companion'
          onComplete={() => setShowGuide(false)} 
        />
      )}
    </View>
  )
}