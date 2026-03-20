import { View, Image, Text } from '@tarojs/components'
import { getWizardConfig } from '@/constants/wizards'
import './index.scss'

// 预加载所有巫师头像（只包含存在的文件）
const avatarImages: Record<string, string> = {
  'Harry': require('@/assets/wizards/Harry.png'),
  'Hermione': require('@/assets/wizards/Hermione.png'),
  'Ron': require('@/assets/wizards/Ron.png'),
  'Ginny': require('@/assets/wizards/Ginny.png'),
  'Darco': require('@/assets/wizards/Darco.png'),
  'Albus': require('@/assets/wizards/Albus.png'),
  'Ssnape': require('@/assets/wizards/Ssnape.png'),
  'Hagrid': require('@/assets/wizards/Hagrid.png'),
  'Cho': require('@/assets/wizards/Cho.png'),
  'Fred': require('@/assets/wizards/Fred.png'),
  'Percy': require('@/assets/wizards/Percy.png'),
  'Buckbeak': require('@/assets/wizards/Buckbeak.png'),
  'Filch': require('@/assets/wizards/Filch.png'),
  'Griphook': require('@/assets/wizards/Griphook.png'),
  'Hedwig': require('@/assets/wizards/Hedwig.png'),
  'Kingsley': require('@/assets/wizards/Kingsley.png'),
  'Lucius': require('@/assets/wizards/Lucius.png'),
  'Lupin': require('@/assets/wizards/Lupin.png'),
  'Mad-Eya': require('@/assets/wizards/Mad-Eya.png'),
  'Neville': require('@/assets/wizards/Neville.png'),
  'Peeves': require('@/assets/wizards/Peeves.png'),
  'Pomfrey': require('@/assets/wizards/Pomfrey.png'),
  'Rosmerta': require('@/assets/wizards/Rosmerta.png'),
  'Sprout': require('@/assets/wizards/Sprout.png'),
  'The Bloody Baron': require('@/assets/wizards/The Bloody Baron.png'),
  'The Fat Lady': require('@/assets/wizards/The Fat Lady.png'),
  'Tonks': require('@/assets/wizards/Tonks.png'),
  'Trelawney': require('@/assets/wizards/Trelawney.png'),
  'Umbridge': require('@/assets/wizards/Umbridge.png'),
  'Zacharias': require('@/assets/wizards/Zacharias.png'),
}

interface WizardAvatarProps {
  name: string  // 预设形象名称 或 微信头像URL
  size?: 'small' | 'medium' | 'large' | 'tiny'
  className?: string
}

// 检查是否是URL（微信头像）
function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('wxfile://') || str.startsWith('tmp/')
}

export default function WizardAvatar({ name, size, className = '' }: WizardAvatarProps) {
  const classes = ['wizard-avatar']
  if (size) classes.push(size)
  if (className) classes.push(className)
  const classString = classes.join(' ')

  // 检查是否是URL（微信头像）
  if (isUrl(name)) {
    return (
      <View className={classString}>
        <Image
          className='wizard-avatar-img'
          src={name}
          mode='aspectFill'
        />
      </View>
    )
  }

  // 预设形象
  const wizard = getWizardConfig(name)
  const avatarSrc = avatarImages[wizard.avatar]

  return (
    <View className={classString}>
      {avatarSrc ? (
        <Image
          className='wizard-avatar-img'
          src={avatarSrc}
          mode='aspectFill'
        />
      ) : (
        <Text className='wizard-avatar-fallback'>{name.substring(0, 2)}</Text>
      )}
    </View>
  )
}