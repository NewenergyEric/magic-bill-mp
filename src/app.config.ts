// 应用入口配置
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/ledger/index',
    'pages/simple/index',
    'pages/multi/index',
    'pages/history/index',
    'pages/companions/index',
    'pages/share/index',
    'pages/contract/index',
    'pages/test/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1a0f0a',
    navigationBarTitleText: '活点账单',
    navigationBarTextStyle: 'white',
    backgroundColor: '#1a0f0a'
  },
  tabBar: {
    color: '#8b7355',
    selectedColor: '#d4af37',
    backgroundColor: '#1a0f0a',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '施咒'
      },
      {
        pagePath: 'pages/ledger/index',
        text: '古灵阁'
      },
      {
        pagePath: 'pages/companions/index',
        text: '休息室'
      },
      {
        pagePath: 'pages/history/index',
        text: '冥想盆'
      }
    ]
  }
})