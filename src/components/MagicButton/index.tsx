import { View, Text } from '@tarojs/components'
import { ReactNode } from 'react'
import './MagicButton.scss'

interface MagicButtonProps {
  type?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  icon?: string
  children?: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export default function MagicButton({
  type = 'primary',
  size = 'medium',
  icon,
  children,
  onClick,
  disabled = false,
  className = ''
}: MagicButtonProps) {
  return (
    <View 
      className={`magic-btn magic-btn-${type} magic-btn-${size} ${disabled ? 'disabled' : ''} ${className}`}
      onClick={() => !disabled && onClick?.()}
    >
      {icon && <Text className='btn-icon'>{icon}</Text>}
      {children && <Text className='btn-text'>{children}</Text>}
    </View>
  )
}

// 按钮组组件
export function MagicButtonGroup({ children, align = 'center' }: { children: ReactNode, align?: 'left' | 'center' | 'right' | 'spread' }) {
  return (
    <View className={`magic-btn-group magic-btn-group-${align}`}>
      {children}
    </View>
  )
}