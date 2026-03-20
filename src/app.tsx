import { useLaunch } from '@tarojs/taro'
import { UserProvider } from '@/contexts/UserContext'
import { initCloud } from '@/services/cloud'
import OfflineIndicator from '@/components/OfflineIndicator'
import StarryBackground from '@/components/StarryBackground'
import './app.scss'

function App({ children }: { children: React.ReactNode }) {
  useLaunch(() => {
    console.log('App launched.')

    // 初始化云开发
    initCloud().then((success) => {
      if (success) {
        console.log('[App] 云开发初始化成功')
      } else {
        console.log('[App] 云开发初始化失败或未配置')
      }
    })
  })

  // children 是将要会渲染的页面
  return (
    <UserProvider>
      <StarryBackground />
      {children}
      <OfflineIndicator />
    </UserProvider>
  )
}

export default App