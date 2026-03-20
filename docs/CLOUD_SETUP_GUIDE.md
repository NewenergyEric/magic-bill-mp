# 云开发配置指南

## 一、当前状态

### ✅ 已完成
- 云开发已开通
- 环境ID: `cloudbase-0goar8t81b4d36ac`
- 数据库集合已创建
- 云函数代码已写好
- 小程序端云服务代码已集成

### ⏳ 待完成
- 上传云函数到云端

---

## 二、云函数文件位置

```
C:\Users\Eric_\magic-bill-mp\cloudFunctions\
├── login\
│   ├── index.js      # 登录云函数代码
│   └── package.json  # 依赖配置
├── contract\
│   ├── index.js      # 契约管理云函数代码
│   └── package.json
└── bill\
    ├── index.js      # 账单管理云函数代码
    └── package.json
```

---

## 三、上传云函数的方法

### 方法A：通过微信开发者工具（推荐）

1. 打开微信开发者工具
2. 导入项目：`C:\Users\Eric_\magic-bill-mp`
3. 在左侧目录找到 `cloudFunctions` 文件夹
4. 右键点击 `login` 文件夹 → 选择 **"上传并部署：云端安装依赖"**
5. 同样上传 `contract` 和 `bill`

**如果右键菜单没有"上传并部署"选项**：
- 确保已点击顶部"云开发"按钮并选择了正确的云环境
- 尝试点击 `cloudFunctions` 文件夹本身，看是否有"同步云函数"选项
- 检查微信开发者工具版本是否支持云开发

### 方法B：通过云开发控制台网页

1. 打开浏览器，访问：https://cloud.weixin.qq.com/
2. 微信扫码登录
3. 选择云环境：`cloudbase-0goar8t81b4d36ac`
4. 点击左侧"云函数"
5. 点击"新建云函数"，创建 `login`、`contract`、`bill`
6. 点击每个函数，在"函数代码"标签中粘贴对应代码
7. 点击"保存并部署"

---

## 四、云函数代码

### 4.1 login 云函数

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { nickname, avatarUrl } = event

  try {
    const existingUser = await db.collection('users').where({ openid }).get()
    if (existingUser.data.length > 0) {
      const user = existingUser.data[0]
      const updateData = { lastLoginAt: db.serverDate(), updatedAt: db.serverDate() }
      if (nickname) updateData.nickname = nickname
      if (avatarUrl) updateData.avatarUrl = avatarUrl
      await db.collection('users').doc(user._id).update({ data: updateData })
      const updatedUser = await db.collection('users').doc(user._id).get()
      return { success: true, data: { user: updatedUser.data, isNewUser: false } }
    } else {
      const newUser = {
        openid, unionid: wxContext.UNIONID,
        nickname: nickname || '神秘巫师', avatarUrl: avatarUrl || '',
        createdAt: db.serverDate(), updatedAt: db.serverDate(), lastLoginAt: db.serverDate(),
        settings: { useCloudMode: false, hapticFeedback: true, soundEnabled: true }
      }
      const result = await db.collection('users').add({ data: newUser })
      return { success: true, data: { user: { _id: result._id, ...newUser }, isNewUser: true } }
    }
  } catch (error) {
    return { success: false, error: { code: 'LOGIN_FAILED', message: error.message } }
  }
}
```

### 4.2 contract 云函数

完整代码在 `cloudFunctions/contract/index.js`

### 4.3 bill 云函数

完整代码在 `cloudFunctions/bill/index.js`

---

## 五、数据库集合权限设置

| 集合名称 | 权限类型 |
|----------|----------|
| `users` | 仅创建者可读写 |
| `contracts` | 所有用户可读，仅创建者可写 |
| `bills` | 所有用户可读，仅创建者可写 |
| `howlers` | 所有用户可读，仅创建者可写 |
| `invites` | 所有用户可读，仅创建者可写 |
| `notifications` | 仅创建者可读写 |

---

## 六、测试云函数

上传完成后，在云开发控制台测试 `login` 函数：

1. 点击 `login` 函数
2. 点击"云端测试"标签
3. 输入测试参数：`{}`
4. 点击"测试"
5. 应该返回用户信息

---

## 七、下一步开发

云函数上传完成后，需要开发：

1. **契约创建页面** - 用户创建新契约的UI
2. **邀请分享功能** - 生成邀请码、分享给好友
3. **契约列表页面** - 显示用户加入的所有契约
4. **吼叫信动画** - 异议申诉的UI动画
5. **离线状态提示** - 自动书写羽毛笔动画

---

## 八、常见问题

### Q: 右键没有"上传并部署"选项
A: 
- 确保云开发已开通并选择了环境
- 尝试在云开发控制台中直接编辑代码
- 检查 `project.config.json` 中的 `cloudFunctionRoot` 配置

### Q: 云函数调用失败
A: 
- 检查数据库集合是否已创建
- 检查集合权限设置
- 查看云函数日志排查错误

### Q: 小程序端调用云函数报错
A: 
- 确保 `cloud.init()` 已正确调用
- 确保环境ID正确
- 检查云函数是否已部署

---

## 九、相关文件

- 云函数代码：`cloudFunctions/`
- 云服务封装：`src/services/cloud.ts`
- 数据服务层：`src/services/dataService.ts`
- 类型定义：`src/types/cloud.ts`
- UI动画需求：`docs/UI_ANIMATION_REQUIREMENTS.md`