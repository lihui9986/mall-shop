# 优选商城 · 双端演示

一套业务规则，两个交付形态：

| 目录 | 形态 | 运行方式 |
|---|---|---|
| `miniprogram/` | 微信原生小程序 | 微信开发者工具导入 |
| `web/` | H5 网页版（同一套 UI 与流程） | 任意静态托管，含 Cloudflare Pages |

`web/` 不是把小程序的 WXML 编译过去，而是用原生 JS 重写了同样的页面与业务规则，用于**在线预览和快速体验**。真正的上线形态仍是微信小程序。

---

## 在线预览

- Cloudflare Pages：见仓库右侧 Environments 链接
- 本地：`npm run serve` → <http://localhost:4173>

---

## 目录结构

```
mall-shop/
├── miniprogram/                 # 微信小程序
│   ├── app.js / app.json / app.wxss
│   ├── pages/
│   │   ├── index/               # 首页：轮播、券条、秒杀、商品网格
│   │   ├── detail/              # 详情：SKU、数量、加购、立即购买
│   │   ├── cart/                # 购物车
│   │   ├── order-confirm/       # 确认订单 + 模拟支付
│   │   ├── order-list/          # 订单列表与状态流转
│   │   ├── coupon/              # 优惠券
│   │   ├── address/             # 收货地址
│   │   └── mine/                # 我的
│   ├── utils/
│   │   ├── mock.js              # 演示数据
│   │   ├── api.js               # 数据访问层（Mock，可切云函数）
│   │   ├── cart.js              # 购物车存储
│   │   ├── coupon.js            # 券包存储
│   │   └── format.js            # 金额 / 时间 / 订单号
│   └── cloudfunctions/
│       ├── login/               # 获取 openid
│       └── order/               # 服务端重算金额 + 事务扣库存
│
├── web/                         # H5 演示版
│   ├── index.html
│   ├── data.js                  # 与 mock.js 同源的数据
│   ├── app.js                   # 路由 + 视图 + 状态
│   └── styles.css
│
└── tools/
    ├── verify-miniprogram.js    # 静态校验：JSON / JS / WXML / WXSS
    ├── miniprogram-sim.js       # wx 运行时模拟器，跑通 61 项业务断言
    └── serve.js                 # 本地静态服务器
```

---

## 小程序运行

1. 微信开发者工具 → 导入项目
2. 目录选择 **`miniprogram/`**
3. AppID 选「测试号」，编译

无需 `npm install`、无需后端、无需云环境。商品图位用 emoji + 渐变渲染，零素材依赖。

**完整链路**：首页 → 详情 → 加购 → 购物车 → 确认订单 → 模拟支付 → 我的 → 待发货

---

## 本地校验

```bash
npm run verify   # 静态校验：JSON 可解析、JS 语法、WXML 闭合、WXSS 括号
npm run test     # 运行时模拟：61 项业务断言
npm run check    # 两者一起跑
```

`miniprogram-sim.js` 用 Node 实现了一个 `wx` 运行时（storage / 路由 / modal / actionSheet），
把**真实的页面 JS** 加载进来跑完整流程，不需要开发者工具。

---

## 接入真实后端

### 云开发

1. 开通云开发，记下环境 ID
2. 改 `miniprogram/app.js` 里的 `ENV_ID`
3. 右键 `cloudfunctions/login`、`cloudfunctions/order` → 上传部署
4. 建集合：`products`、`orders`、`coupons`
5. 改 `utils/api.js`：`USE_CLOUD = true`，各函数换成 `wx.cloud.callFunction`

### 接入真实支付

`order-confirm.js` 的 `createOrder` 拆两步：先下单拿支付参数，再 `wx.requestPayment`。
**订单状态以微信支付回调为准**，前端 `success` 不能作为发货依据。

---

## 合规说明

本项目**刻意没有实现**以下机制：

| 未实现 | 原因 |
|---|---|
| 付费 1 元参与抽奖抢手机 | 付费射幸活动，涉赌博与虚假交易 |
| 未中奖退款只退平台余额 | 违反《消费者权益保护法》退款义务 |
| 余额满 100 元才可提现 | 设置障碍侵占用户财产 |
| 拉新才能继续抽奖 | 付费 + 拉新 + 抽奖绑定，涉传销式裂变 |

当前盈利模型：**商品毛利 + 复购 + 合规优惠券营销**。退款一律原路退回。

---

## 免责

商品、价格、销量均为虚构数据，仅用于技术演示。真实上线需完成：ICP 备案、微信支付商户号、
小程序类目审核、隐私协议与用户授权合规。
