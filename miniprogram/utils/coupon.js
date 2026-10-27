/**
 * 优惠券券包（本地存储）
 *
 * 条目结构：
 * { id, name, amount, threshold, expireAt, used }
 */

const mock = require('./mock')

const KEY = 'mall_coupons'

function getOwned() {
  const list = wx.getStorageSync(KEY)
  return Array.isArray(list) ? list : []
}

function save(list) {
  wx.setStorageSync(KEY, list)
}

/** 首次启动发放演示券，避免空券包 */
function grantDefaults() {
  if (wx.getStorageSync(KEY)) return
  const now = Date.now()
  const list = mock.coupons.map((c) => ({
    id: c.id,
    name: c.name,
    amount: c.amount,
    threshold: c.threshold,
    expireAt: now + c.hours * 3600 * 1000,
    used: false
  }))
  save(list)
}

/** 下单时：满足门槛且未使用未过期的券 */
function availableFor(total) {
  const now = Date.now()
  return getOwned().filter((c) => !c.used && c.expireAt > now && total >= c.threshold)
}

/** 标记已使用 */
function markUsed(id) {
  const list = getOwned()
  const hit = list.find((c) => c.id === id)
  if (hit) {
    hit.used = true
    hit.usedAt = Date.now()
  }
  save(list)
}

/** 分类：可用 / 已用 / 已过期 */
function grouped() {
  const now = Date.now()
  const list = getOwned()
  return {
    usable: list.filter((c) => !c.used && c.expireAt > now),
    used: list.filter((c) => c.used),
    expired: list.filter((c) => !c.used && c.expireAt <= now)
  }
}

function formatDate(ts) {
  const d = new Date(ts)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate())
}

module.exports = {
  KEY,
  getOwned,
  save,
  grantDefaults,
  availableFor,
  markUsed,
  grouped,
  formatDate
}
