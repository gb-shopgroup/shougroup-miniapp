# 店小团团购小程序（shougroup-miniapp）

基于 **uni-app（Vue 3）** 开发的社区团购微信小程序，一个项目同时承载两端：

- **C 端（主包 `pages/`）**：面向团员/消费者——浏览团购、加购下单、支付、订单管理与售后。
- **B 端（分包 `pagesA/`）**：面向团长——店铺经营、商品/团购管理、订单处理、对账与佣金。

## 技术栈

| 项 | 说明 |
| --- | --- |
| 框架 | uni-app（Vue 3，`vueVersion: "3"`） |
| 目标平台 | 微信小程序（主要），兼容 app-plus / 支付宝 / 百度 / 抖音小程序 |
| 开发工具 | HBuilderX（项目无 package.json，依赖由 HBuilderX 内置编译器提供） |
| UI / 样式 | 自定义导航栏（`navigationStyle: custom`）+ SCSS（`static/css/main.scss`） |
| 状态管理 | `App.vue` 的 `globalData`（购物车会话等），无 Vuex/Pinia |
| 网络请求 | `utils/request.js` / `utils/request2.js` 封装 `uni.request` |
| 测试 | `tests/` 下的纯 Node 断言脚本（`*.test.mjs`，`node:assert` + 源码静态解析） |

## 目录结构

```
shougroup-miniapp/
├── api/                     # 后端接口封装
│   ├── group.js             # C 端接口：团购列表/详情、登录、购物车、订单、支付等
│   ├── leader.js            # B 端（团长）接口：走 request2
│   ├── upload.js            # 文件/图片上传
│   └── wechat.js            # 微信相关能力
├── config/
│   └── env.js               # 环境配置（开发/测试/生产 baseURL）
├── pages/                   # C 端页面（主包）
├── pagesA/                  # B 端团长页面（分包）
├── static/                  # 图片、字体、tabbar 图标、全局样式 main.scss
├── tests/                   # Node 测试脚本（*.test.mjs）
├── utils/                   # 工具与业务逻辑模块
├── App.vue                  # 应用入口：登录态恢复、全局购物车会话数据
├── main.js                  # Vue 应用启动（混入 miniProgramNavMixin）
├── manifest.json            # 应用配置（AppID、平台设置）
├── pages.json               # 页面路由、tabBar、分包、预加载规则
├── project.config.json      # 微信开发者工具项目配置
└── uni.promisify.adaptor.js # uni API promise 化适配器
```

## 功能模块

### C 端（主包，tabBar 四个入口）

- **首页**（`pages/index/index`）：团购分类、团购列表（已绑团长按团长过滤，未绑按定位推荐附近团购）、下拉刷新/上拉加载
- **订单**（`pages/order/`）：我的订单列表、订单详情、申请退款、售后详情、订单核销（自助核销）
- **购物车**（`pages/cart/index`）：跨团购物车、结算
- **个人中心**（`pages/mine/index`）
- 其他：团购详情（`pages/group/index`）、合集（`pages/collection/index`）、登录（`pages/login/index`）、支付成功页、文章页等

### B 端团长端（分包 `pagesA/`，从"我的"页预加载）

- **控制台/经营看板**：`dashboard`
- **账户与资质**：账户信息、营业执照、对账单
- **自提点管理**：自提点列表/添加
- **员工管理**：员工列表/添加（支持员工协助核销）
- **商品管理**：商品列表/添加、多规格（SKU）、分类
- **团购管理**：开团/复制团/团详情/分享
- **订单管理**：订单列表、订单详情、退款/售后处理
- **其他**：合集管理、消息、分账/佣金、订单商品汇总报表、黑名单、我的团员

## 环境配置

`config/env.js` 按环境切换接口地址：

| 环境 | baseURL |
| --- | --- |
| development | `https://test.api.shopgroup.com.cn` |
| test | `https://test.api.shopgroup.com.cn` |
| production | `https://api.shopgroup.com.cn` |

微信小程序内会根据 `wx.getAccountInfoSync().miniProgram.envVersion` 自动判断：
- `develop` → development
- `trial` / `release` → production

## 快速开始

### 开发调试（HBuilderX）

1. 用 HBuilderX 导入本项目；
2. 菜单栏 **运行 → 运行到小程序模拟器 → 微信开发者工具**（需在 HBuilderX 设置中配置微信开发者工具安装路径，并在开发者工具中开启服务端口）；
3. 修改代码保存即热更新。

### 真机预览

HBuilderX **运行 → 运行到手机或模拟器**，或使用微信开发者工具的"预览"扫码。

### 发布

1. HBuilderX **发行 → 小程序-微信**，生成 `unpackage/dist/build/mp-weixin`；
2. 用微信开发者工具打开该目录，上传代码，并在微信公众平台提交审核。

### 运行测试

`tests/` 下的脚本为纯 Node 断言脚本，可直接运行：

```bash
node tests/groupPurchase.test.mjs
# 或批量执行
for f in tests/*.test.mjs; do node "$f"; done
```

测试通过读取源码文本进行静态校验（依赖导入、关键调用等），不依赖小程序运行时。

## 关键实现说明

- **请求层**（`utils/request.js`）：统一注入 `Authorization` token（取自本地缓存 `token`）、统一处理 `code === 200`、toast 提示去重机制（`silentToast` / `toasted` 标记，避免"请求层 toast + 页面 modal"双重提示）。
- **登录态**（`App.vue` + `utils/auth.js`）：启动时若本地缓存有 openid + token，则静默 `openid` 自动登录；新用户在登录页同意协议后获取 openid。
- **购物车会话**：`App.vue` 的 `globalData.sessionCartGoodsList` 等字段维护跨页面的购物车/结算数据（含版本号 `sessionCartVersion`）。
- **导航栏**：全站 `navigationStyle: custom` 自定义导航，`utils/miniProgramNavMixin` 提供统一的导航能力。
- **分包与预加载**：团长端在 `pagesA` 分包，通过 `preloadRule` 在进入"我的"页时预下载，降低首次进入团长端的等待。

## 相关信息

- 微信小程序 AppID：`wx959de27ff559b753`（见 `manifest.json` / `project.config.json`）
- 定位权限：`chooseLocation` / `getLocation`，用途为"推荐附近团购"
- 主色调：导航 `#1890ff`，tabBar 选中 `#24c567`
