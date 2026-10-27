# 优选商城小程序

微信原生小程序 + 云开发骨架 + 本地 Mock 数据的电商演示项目。**开箱即跑**：不需要后端、不需要云环境，用微信开发者工具导入即可看到完整下单流程。

---

## 一、快速开始

1. 打开 **微信开发者工具** → 导入项目
2. 目录选择 `mall-miniprogram`
3. AppID 选择「测试号」（`project.config.json` 里已填 `touristappid`）
4. 编译即可运行

> 无需 npm install，无需配置服务器域名。所有数据来自 `utils/mock.js`。

### 试用路径

```
首页 → 点商品 → 选规格 → 加入购物车 → 购物车结算
     → 确认订单（自动选最优券）→ 提交订单 → 模拟微信支付
     → 我的 → 待发货
```

「我的 → 清除演示数据」可重置全部本地状态。

---

## 二、目录结构

```
mall-miniprogram/
├── app.js                    # 全局：云开发初始化、购物车角标
├── app.json                  # 页面注册 + tabBar
├── app.wxss                  # 全局样式变量与通用类
├── project.config.json
├── sitemap.json
├── utils/
│   ├── mock.js               # 演示商品 / 轮播 / 券模板
│   ├── api.js                # 数据访问层（当前为 Mock）
│   ├── cart.js               # 购物车本地存储
│   ├── coupon.js             # 券包本地存储
│   └── format.js             # 金额 / 时间 / 订单号
├── pages/
│   ├── index/                # 首页：轮播、券条、秒杀、商品网格
│   ├── detail/               # 商品详情：SKU、数量、加购、立即购买
│   ├── cart/                 # 购物车：勾选、改数量、删除、结算
│   ├── order-confirm/        # 确认订单：地址、券、备注、金额、模拟支付
│   ├── order-list/           # 订单列表：状态 tab + 订单操作
│   ├── coupon/               # 优惠券：可用 / 已用 / 过期
│   ├── address/              # 收货地址编辑
│   └── mine/                 # 我的：订单入口、券、地址、重置
└── cloudfunctions/
    ├── login/                # 获取 openid
    └── order/                # 创建订单（服务端重算金额 + 事务扣库存）
```

---

## 三、已实现功能

### 交易链路
- [x] 商品列表 / 详情 / 多规格 SKU / 库存提示
- [x] 购物车（本地持久化、全选、数量增减、删除、角标）
- [x] 确认订单（地址、优惠券、备注、金额明细）
- [x] 模拟微信支付（成功 / 未支付两种结果都落单）
- [x] 订单列表（待付款 / 待发货 / 待收货 / 已完成）与状态流转

### 营销
- [x] 优惠券券包（发放、有效期、门槛校验、自动选最优、核销）
- [x] 首页券条与倒计时式文案（**仅展示，不制造虚假紧迫感**）
- [x] 限时秒杀位（真实库存展示）

### 后台能力（云函数骨架）
- [x] `login`：获取 openid
- [x] `order`：服务端重算金额、事务扣库存、核销券

---

## 四、接入真实后端

### 方式 A：云开发（推荐，改动最小）

1. 开发者工具开通云开发，记下环境 ID
2. 修改 `app.js` 中 `ENV_ID = 'your-env-id'`
3. 右键 `cloudfunctions/login`、`cloudfunctions/order` → 上传并部署
4. 在数据库建三个集合：`products`、`orders`、`coupons`
5. 修改 `utils/api.js`：把 `USE_CLOUD` 改为 `true`，各函数替换为

```js
async function getProducts() {
  const res = await wx.cloud.callFunction({ name: 'product', data: { action: 'list' } })
  return res.result.list
}
```

保持返回结构不变，页面代码无需改动。

### 方式 B：自建后端

把 `utils/api.js` 内各函数换成 `wx.request`，注意：

- 必须在微信公众平台配置 request 合法域名
- **金额只信服务端**，客户端传参仅含 `productId / skuName / qty`
- 上线前用 `wx.login` + 后端换 openid，不要用前端传的用户 ID

### 接入真实支付

把 `pages/order-confirm/order-confirm.js` 的 `createOrder` 拆成两步：

```js
// 1. 下单（后端返回支付参数）
const payParams = await api.createOrder(payload)

// 2. 拉起微信支付
wx.requestPayment({
  timeStamp: payParams.timeStamp,
  nonceStr: payParams.nonceStr,
  package: payParams.package,
  signType: 'RSA',
  paySign: payParams.paySign,
  success: () => { /* 后端支付回调为准，前端只做跳转 */ },
  fail: () => { /* 订单保持待付款 */ }
})
```

**关键**：订单状态必须以微信支付回调（notify）为准，前端 `success` 不能作为发货依据。

---

## 五、合规说明（重要）

本项目**刻意没有实现**以下机制，原因如下：

| 未实现 | 原因 |
|---|---|
| 付费 1 元参与抽奖抢手机 | 付费射幸活动，涉赌博与虚假交易 |
| 未中奖退款只退平台余额 | 违反《消费者权益保护法》退款义务 |
| 余额满 100 元才可提现 | 设置障碍侵占用户财产，属典型诈骗手法 |
| 拉新才能继续抽奖 | 付费 + 拉新 + 抽奖绑定，涉传销式裂变 |

**当前盈利模型**：商品毛利 + 复购 + 合规优惠券营销。

退款一律**原路退回**（微信支付退款 API），不做平台余额。

---

## 六、下一步可扩展

- [ ] 商品分类页与搜索（需后端支持）
- [ ] 秒杀倒计时与库存实时刷新
- [ ] 拼团 / 分销佣金（二级以内，需合规分账）
- [ ] 物流轨迹查询
- [ ] 售后 / 退款申请流程
- [ ] 管理后台（商品、订单、券、数据看板）

---

## 七、免责

本项目为技术演示，商品、价格、销量均为虚构数据。上线前需完成：ICP 备案、微信支付商户号申请、小程序类目审核、隐私协议与用户授权合规。
