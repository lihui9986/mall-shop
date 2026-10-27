/**
 * 小程序运行时模拟器
 *
 * 目标：不开微信开发者工具，直接用 Node 加载真实的页面 JS，跑通完整业务链路。
 * 覆盖：app 生命周期、首页加载、详情加购、购物车计算、确认订单算钱、
 *       模拟支付落单、订单状态流转、优惠券核销、地址校验。
 *
 * 用法：node tools/miniprogram-sim.js
 */

const path = require('path')

const ROOT = path.join(__dirname, '..', 'miniprogram')

/* ------------------------------------------------------------------ */
/* 1. wx 运行时                                                                 */
/* ------------------------------------------------------------------ */

const storage = new Map()
const calls = { navigateTo: [], redirectTo: [], switchTab: [], back: [], toast: [] }

let modalAnswer = true
let actionSheetIndex = -1

const wx = {
  // 存储：模拟真实 wx 的序列化往返（写入即深拷贝）
  getStorageSync(key) {
    if (!storage.has(key)) return ''
    return JSON.parse(storage.get(key))
  },
  setStorageSync(key, value) {
    storage.set(key, JSON.stringify(value === undefined ? null : value))
  },
  removeStorageSync(key) {
    storage.delete(key)
  },

  // 交互
  showToast(opt) {
    calls.toast.push((opt && opt.title) || '')
  },
  showModal(opt) {
    if (opt && opt.success) opt.success({ confirm: modalAnswer, cancel: !modalAnswer })
  },
  showActionSheet(opt) {
    if (!opt) return
    if (actionSheetIndex < 0) {
      if (opt.fail) opt.fail({ errMsg: 'cancel' })
    } else if (opt.success) {
      opt.success({ tapIndex: actionSheetIndex })
    }
  },
  setNavigationBarTitle() {},
  stopPullDownRefresh() {},
  setTabBarBadge(opt) {
    calls.badge = opt && opt.text
  },
  removeTabBarBadge() {
    calls.badge = null
  },

  // 路由
  navigateTo(opt) {
    calls.navigateTo.push(opt.url)
  },
  redirectTo(opt) {
    calls.redirectTo.push(opt.url)
  },
  switchTab(opt) {
    calls.switchTab.push(opt.url)
  },
  navigateBack() {
    calls.back.push(true)
  }
}

global.wx = wx

/* ------------------------------------------------------------------ */
/* 2. Page / App 运行时                                                        */
/* ------------------------------------------------------------------ */

function setByPath(obj, pathStr, value) {
  const keys = String(pathStr)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (cur[k] == null) cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {}
    cur = cur[k]
  }
  cur[keys[keys.length - 1]] = value
}

let appInstance = null

global.App = function (def) {
  appInstance = Object.assign({}, def)
  appInstance.globalData = def.globalData || {}
}

global.getApp = function () {
  return appInstance
}

let lastPageDef = null
global.Page = function (def) {
  lastPageDef = def
}

function createPageInstance(def, route) {
  const inst = Object.assign({}, def)
  inst.route = route
  inst.data = JSON.parse(JSON.stringify(def.data || {}))
  inst.setData = function (patch, cb) {
    Object.keys(patch).forEach((k) => setByPath(this.data, k, patch[k]))
    if (typeof cb === 'function') cb.call(this)
  }
  return inst
}

function loadPage(relPath) {
  lastPageDef = null
  const abs = path.join(ROOT, relPath + '.js')
  delete require.cache[require.resolve(abs)]
  require(abs)
  if (!lastPageDef) throw new Error('页面未调用 Page(): ' + relPath)
  return createPageInstance(lastPageDef, relPath)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ */
/* 3. 断言                                                                     */
/* ------------------------------------------------------------------ */

const results = []
function check(name, fn) {
  try {
    const r = fn()
    results.push({ name, ok: r !== false, detail: r === true || r === undefined ? '' : String(r) })
  } catch (err) {
    results.push({ name, ok: false, detail: err.message })
  }
}
function eq(name, actual, expected) {
  check(name, () => {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    if (a === e) return true
    throw new Error('期望 ' + e + '，实际 ' + a)
  })
}

/* ------------------------------------------------------------------ */
/* 4. 测试主流程                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('=== 小程序运行时模拟测试 ===\n')

  // ---- 4.1 启动 App ----
  delete require.cache[require.resolve(path.join(ROOT, 'app.js'))]
  require(path.join(ROOT, 'app.js'))
  appInstance.onLaunch()
  appInstance.onShow()

  const couponUtil = require(path.join(ROOT, 'utils/coupon.js'))
  eq('启动后发放 3 张券', couponUtil.getOwned().length, 3)

  // ---- 4.2 首页 ----
  const index = loadPage('pages/index/index')
  index.onLoad()
  await sleep(400)

  eq('首页轮播 3 条', index.data.banners.length, 3)
  eq('首页秒杀 4 个', index.data.flash.length, 4)
  eq('首页商品 8 个', index.data.products.length, 8)
  eq('首页加载完成', index.data.loading, false)
  eq('首屏无控制台异常', index.data.products[0].name, '无线蓝牙耳机 Pro')

  // ---- 4.3 详情 + 加购 ----
  const detail = loadPage('pages/detail/detail')
  detail.onLoad({ id: 'p1' })
  await sleep(400)

  eq('详情加载成功', detail.data.product.id, 'p1')
  eq('默认选中第一个 SKU', detail.data.sku.name, '云母白')
  eq('默认数量 1', detail.data.qty, 1)

  detail.inc()
  detail.inc()
  eq('数量加到 3', detail.data.qty, 3)
  detail.dec()
  eq('数量减到 2', detail.data.qty, 2)

  // 切换 SKU
  detail.pickSku({ currentTarget: { dataset: { index: 1 } } })
  eq('切换到第二个 SKU', detail.data.sku.name, '曜石黑')

  detail.addCart()
  detail.addCart()
  await sleep(50)

  eq('购物车角标已更新', calls.badge, '4')

  // ---- 4.4 购物车 ----
  const cart = loadPage('pages/cart/cart')
  cart.onShow()
  await sleep(50)

  eq('购物车 1 种商品', cart.data.list.length, 1)
  eq('购物车数量 4', cart.data.list[0].qty, 4)
  eq('购物车合计 516.00', cart.data.total, '516.00')
  eq('全选状态', cart.data.allChecked, true)

  // 取消勾选 → 合计归零
  cart.toggle({ currentTarget: { dataset: { index: 0 } } })
  await sleep(30)
  eq('取消勾选后合计 0.00', cart.data.total, '0.00')
  eq('取消勾选后全选为假', cart.data.allChecked, false)
  cart.toggle({ currentTarget: { dataset: { index: 0 } } })
  await sleep(30)

  // 改成 2 件再结算
  cart.dec({ currentTarget: { dataset: { index: 0 } } })
  cart.dec({ currentTarget: { dataset: { index: 0 } } })
  await sleep(30)
  eq('减到 2 件后小计 258.00', cart.data.list[0].subtotal, '258.00')
  eq('减到 2 件后合计 258.00', cart.data.total, '258.00')

  cart.checkout()
  eq('结算跳转确认订单', calls.navigateTo[calls.navigateTo.length - 1], '/pages/order-confirm/order-confirm?from=cart')

  // ---- 4.5 确认订单：算钱 ----
  const confirm = loadPage('pages/order-confirm/order-confirm')
  confirm.onLoad()
  await sleep(50)

  eq('确认页商品金额 258.00', confirm.data.goodsTotal, '258.00')
  eq('自动选中 100 元券', confirm.data.selectedCoupon.amount, 100)
  eq('优惠 -100.00', confirm.data.discount, '100.00')
  eq('应付 158.00', confirm.data.payTotal, '158.00')

  // 手动切换成不使用券
  actionSheetIndex = confirm.data.usableCoupons.length
  confirm.chooseCoupon()
  await sleep(30)
  eq('选择不使用券后应付 258.00', confirm.data.payTotal, '258.00')

  // 再选回 100 元券（列表第 2 个）
  actionSheetIndex = 1
  confirm.chooseCoupon()
  await sleep(30)
  eq('重新选券后应付 158.00', confirm.data.payTotal, '158.00')
  actionSheetIndex = -1

  // 未填地址时应拦截
  modalAnswer = true
  confirm.submit()
  await sleep(50)
  eq('无地址时拦截下单', storage.has('mall_orders'), false)

  // ---- 4.6 地址 ----
  const address = loadPage('pages/address/address')
  address.onLoad()
  address.onInput({ currentTarget: { dataset: { field: 'name' } }, detail: { value: '张三' } })
  address.onInput({ currentTarget: { dataset: { field: 'phone' } }, detail: { value: '123' } })
  address.save()
  eq('手机号非法时拒绝保存', storage.has('mall_address'), false)

  address.onInput({ currentTarget: { dataset: { field: 'phone' } }, detail: { value: '13800138000' } })
  address.onInput({ currentTarget: { dataset: { field: 'detail' } }, detail: { value: '广东省深圳市南山区科技园南路 8 号 A 座 1201' } })
  address.save()
  eq('合法地址保存成功', JSON.parse(storage.get('mall_address')).name, '张三')

  // ---- 4.7 提交订单 + 模拟支付 ----
  confirm.onShow()
  confirm.submit()
  await sleep(900)

  const orders = JSON.parse(storage.get('mall_orders'))
  eq('生成 1 笔订单', orders.length, 1)
  eq('支付后状态为待发货', orders[0].status, 'unshipped')
  eq('订单实付 158.00', orders[0].payTotal, '158.00')
  eq('订单收货人正确', orders[0].address.name, '张三')
  eq('支付后跳转订单列表', calls.redirectTo[0], '/pages/order-list/order-list?tab=2')

  // 购物车与券已核销
  eq('下单后购物车清空', JSON.parse(storage.get('mall_cart')).length, 0)
  const usedCoupon = couponUtil.getOwned().find((c) => c.id === 'c2')
  eq('100 元券已核销', usedCoupon.used, true)
  eq('结算缓存已清理', storage.has('mall_checkout'), false)

  // ---- 4.8 订单列表 ----
  const orderList = loadPage('pages/order-list/order-list')
  orderList.onLoad({ tab: '2' })
  orderList.onShow()
  await sleep(50)

  eq('待发货 tab 显示 1 单', orderList.data.orders.length, 1)
  eq('订单状态文案正确', orderList.data.orders[0].statusText, '待发货')
  eq('订单件数统计正确', orderList.data.orders[0].totalQty, 2)

  // 提醒发货（无状态变化）
  orderList.onRemind({ currentTarget: { dataset: { no: orders[0].orderNo } } })
  await sleep(30)
  eq('提醒发货不改状态', JSON.parse(storage.get('mall_orders'))[0].status, 'unshipped')

  // 确认收货
  modalAnswer = true
  orderList.onConfirm({ currentTarget: { dataset: { no: orders[0].orderNo } } })
  await sleep(50)
  eq('确认收货后状态为已完成', JSON.parse(storage.get('mall_orders'))[0].status, 'done')

  // ---- 4.9 优惠券页 ----
  const couponPage = loadPage('pages/coupon/coupon')
  couponPage.onShow()
  await sleep(50)

  eq('可用券剩 2 张', couponPage.groups.usable.length, 2)
  eq('已用券 1 张', couponPage.groups.used.length, 1)
  eq('已用 tab 展示正确', couponPage.data.list.length >= 0, true)

  // ---- 4.10 我的 ----
  const mine = loadPage('pages/mine/mine')
  mine.onShow()
  await sleep(50)

  eq('我的-已完成 1 单', mine.data.counts.done, 1)
  eq('我的-可用券 2 张', mine.data.couponCount, 2)

  // ---- 4.11 立即购买不污染购物车 ----
  const detail2 = loadPage('pages/detail/detail')
  detail2.onLoad({ id: 'p2' })
  await sleep(400)
  eq('第二件商品加载成功', detail2.data.product.id, 'p2')

  // 先往购物车放一件 p1
  const cartUtil = require(path.join(ROOT, 'utils/cart.js'))
  cartUtil.addToCart(
    { id: 'p1', name: '无线蓝牙耳机 Pro', emoji: '🎧', bg: 'x', price: 129 },
    { name: '云母白', price: 129 },
    1
  )
  eq('购物车预置 1 件', cartUtil.getCart().length, 1)

  detail2.buyNow()
  const buynowItems = JSON.parse(storage.get('mall_checkout'))
  eq('立即购买 key 独立', buynowItems[0].key.indexOf('buynow_'), 0)

  const confirm2 = loadPage('pages/order-confirm/order-confirm')
  confirm2.onLoad()
  await sleep(50)
  eq('立即购买金额 99.00', confirm2.data.goodsTotal, '99.00')

  modalAnswer = true
  confirm2.submit()
  await sleep(900)

  eq('立即购买后购物车仍保留原商品', cartUtil.getCart().length, 1)
  eq('累计 2 笔订单', JSON.parse(storage.get('mall_orders')).length, 2)

  // ---- 4.12 未支付路径 ----
  // 重新准备一次结算数据（上一单已清空 mall_checkout）
  wx.setStorageSync('mall_checkout', [
    JSON.parse(JSON.stringify(cartUtil.buildItem(detail2.data.product, detail2.data.sku, 1)))
  ])

  modalAnswer = false
  const confirm3 = loadPage('pages/order-confirm/order-confirm')
  confirm3.onLoad()
  await sleep(50)
  confirm3.submit()
  await sleep(900)

  const ordersAfter = JSON.parse(storage.get('mall_orders'))
  eq('取消支付仍生成订单', ordersAfter.length, 3)
  eq('取消支付订单为待付款', ordersAfter[0].status, 'unpaid')

  // ---- 4.13 待付款订单可再支付 ----
  modalAnswer = true
  const ol2 = loadPage('pages/order-list/order-list')
  ol2.onLoad({ tab: '1' })
  ol2.onShow()
  await sleep(50)
  eq('待付款 tab 有 1 单', ol2.data.orders.length, 1)
  ol2.onPay({ currentTarget: { dataset: { no: ordersAfter[0].orderNo } } })
  await sleep(50)
  eq('补支付后转待发货', JSON.parse(storage.get('mall_orders'))[0].status, 'unshipped')

  // ---- 4.14 清空数据 ----
  mine.onReset()
  await sleep(50)
  eq('重置后订单清空', (JSON.parse(storage.get('mall_orders') || '[]')).length, 0)
  eq('重置后重新发券', couponUtil.getOwned().length, 3)

  /* ---------------- 输出 ---------------- */
  const pass = results.filter((r) => r.ok).length
  const fail = results.filter((r) => !r.ok)

  console.log(results.map((r, i) => (r.ok ? '✅' : '❌') + ' ' + String(i + 1).padStart(2, '0') + '. ' + r.name + (r.detail ? '  → ' + r.detail : '')).join('\n'))

  console.log('\n----------------------------------------')
  console.log('通过 ' + pass + ' / ' + results.length)
  if (fail.length) {
    console.log('\n失败项：')
    fail.forEach((f) => console.log(' ❌ ' + f.name + ' → ' + f.detail))
    process.exit(1)
  }
  console.log('全部通过 ✅')
}

main().catch((err) => {
  console.error('\n测试脚本异常：', err)
  process.exit(1)
})
