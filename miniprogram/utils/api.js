/**
 * 数据访问层。
 *
 * 当前为本地 Mock 实现，保证在微信开发者工具中无需任何后端即可跑通全流程。
 * 接入真实后端 / 云开发时，只需把下面各函数内部替换为 wx.request 或 wx.cloud.callFunction，
 * 保持返回结构不变，页面代码零改动。
 */

const mock = require('./mock')

const USE_CLOUD = false // 接入云开发后改为 true

function delay(data, ms = 120) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), ms)
  })
}

/** 商品列表 */
function getProducts() {
  return delay(mock.products)
}

/** 商品详情 */
function getProduct(id) {
  const hit = mock.products.find((p) => p.id === id)
  return delay(hit || null)
}

/** 轮播图 */
function getBanners() {
  return delay(mock.banners)
}

/** 秒杀区（演示取前 4 个） */
function getFlash() {
  return delay(mock.products.slice(0, 4))
}

/** 可领取的券模板 */
function getCouponTemplates() {
  return delay(mock.coupons)
}

module.exports = {
  USE_CLOUD,
  getProducts,
  getProduct,
  getBanners,
  getFlash,
  getCouponTemplates
}
