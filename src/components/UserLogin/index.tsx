import { useState, useEffect } from 'react'
import { View, Text, Button, Input, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUser } from '@/contexts/UserContext'
import { getLocalUser } from '@/services/user'
import WizardAvatar from '@/components/WizardAvatar'
import { WIZARDS, WizardConfig } from '@/constants/wizards'
import './UserLogin.scss'

interface UserLoginProps {
  onClose: () => void
  showClose?: boolean
}

export default function UserLogin({ onClose, showClose = true }: UserLoginProps) {
  const { user, isLogged, userCompanion, login, logout } = useUser()
  const [tempNickName, setTempNickName] = useState('')
  const [tempAvatar, setTempAvatar] = useState('')
  const [isWechatAvatar, setIsWechatAvatar] = useState(false)  // 是否使用微信头像
  const [selectedWizardAvatar, setSelectedWizardAvatar] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const localUser = getLocalUser()
    if (localUser) {
      setTempNickName(localUser.nickName)
      setTempAvatar(localUser.avatarUrl)
      // 检查是否使用的是预设形象
      const wizardMatch = WIZARDS.find(w => w.avatar === localUser.avatarUrl)
      if (wizardMatch) {
        setSelectedWizardAvatar(wizardMatch.avatar)
        setIsWechatAvatar(false)
      } else if (localUser.avatarUrl) {
        // 不是预设形象，则是微信头像
        setIsWechatAvatar(true)
      }
    }
  }, [user])

  const handleChooseAvatar = (e: any) => {
    const { avatarUrl } = e.detail
    setTempAvatar(avatarUrl)
    setSelectedWizardAvatar(null)
    setIsWechatAvatar(true)  // 选择微信头像
  }

  const handleInputNickName = (e: any) => {
    setTempNickName(e.detail.value)
  }

  const handleSelectWizard = (wizard: WizardConfig) => {
    setSelectedWizardAvatar(wizard.avatar)
    setTempAvatar(wizard.avatar)
    setIsWechatAvatar(false)  // 选择预设形象
  }

  const handleConfirm = () => {
    if (!tempNickName.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    if (!tempAvatar) {
      Taro.showToast({ title: '请选择头像', icon: 'none' })
      return
    }
    
    // 传递是否使用微信头像的标志
    login(
      { nickName: tempNickName.trim(), avatarUrl: tempAvatar },
      isWechatAvatar
    ).then(() => {
      setIsEditing(false)
      onClose()
    })
  }

  const handleLogout = () => {
    logout()
    onClose()
  }

  // 已登录状态显示
  if (isLogged && user && !isEditing) {
    const displayWizardAvatar = !isWechatAvatar && selectedWizardAvatar
    return (
      <View className='login-modal-content logged-in'>
        <View className='user-display'>
          <View className='user-avatar-large'>
            {displayWizardAvatar ? (
              <WizardAvatar name={selectedWizardAvatar} size='large' />
            ) : user.avatarUrl ? (
              <Image src={user.avatarUrl} className='avatar-img' mode='aspectFill' />
            ) : (
              <View className='avatar-placeholder'>🧙</View>
            )}
          </View>
          <Text className='user-name'>{user.nickName}</Text>
          {userCompanion && (
            <Text className='companion-hint'>
              巫师形象: {userCompanion.name}
              {userCompanion.isWechatAvatar ? ' (微信头像)' : ''}
            </Text>
          )}
        </View>
        
        <View className='action-buttons'>
          <Button className='edit-btn' onClick={() => setIsEditing(true)}>
            编辑资料
          </Button>
          <Button className='logout-btn' onClick={handleLogout}>
            退出登录
          </Button>
        </View>
        
        {showClose && (
          <View className='close-btn' onClick={onClose}>✕</View>
        )}
      </View>
    )
  }

  // 未登录或编辑状态
  return (
    <View className='login-modal-content'>
      {showClose && (
        <View className='close-btn' onClick={onClose}>✕</View>
      )}
      <View className='modal-header'>
        <Text className='modal-title'>
          {isLogged ? '编辑巫师形象' : '登录创建自己的巫师形象'}
        </Text>
      </View>
      
      <View className='form-section'>
        <View className='form-label'>选择头像</View>
        <View className='avatar-picker'>
          <Button 
            className='avatar-btn' 
            openType='chooseAvatar'
            onChooseAvatar={handleChooseAvatar}
          >
            {tempAvatar && isWechatAvatar ? (
              <Image src={tempAvatar} className='preview-avatar' mode='aspectFill' />
            ) : (
              <Text className='avatar-placeholder-text'>微信头像</Text>
            )}
          </Button>
        </View>
        
        {/* 预设巫师形象选择 */}
        <View className='wizards-select'>
          <View className='select-label'>或选择巫师形象:</View>
          <View className='wizards-grid'>
            {WIZARDS.map(w => (
              <View 
                key={w.avatar} 
                className={`wizard-option ${selectedWizardAvatar === w.avatar ? 'selected' : ''}`}
                onClick={() => handleSelectWizard(w)}
              >
                <WizardAvatar name={w.name} size='medium' />
                <Text className='wizard-name'>{w.name}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View className='form-label'>昵称</View>
        <Input
          className='nickname-input'
          type='nickname'
          placeholder='点击获取微信昵称'
          value={tempNickName}
          onInput={handleInputNickName}
        />
      </View>
      
      <View className='modal-actions'>
        {isLogged && (
          <Button className='cancel-btn' onClick={() => setIsEditing(false)}>
            取消
          </Button>
        )}
        <Button className='confirm-btn' onClick={handleConfirm}>
          {isLogged ? '保存' : '确认登录'}
        </Button>
      </View>
    </View>
  )
}