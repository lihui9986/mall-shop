/**
 * 购物车本地存储
 *
 * 条目结构：
 * {
 *   key, id, name, skuName, price, emoji, bg, qty, checked
 * }
 */

const CART_KEY = 'mall_cart'

function getCart() {
  const list = wx.getStorageSync(CART_KEY)
  return Array.isArray(list) ? list : []
}

function saveCart(list) {
  wx.setStorageSync(CART_KEY, list)
  const app = getApp()
  if (app && typeof app.refreshBadge === 'function') {
    app.refreshBadge()
  }
}

/** 由商品 + SKU 构造购物车条目 */
function buildItem(product, sku, qty) {
  const name = sku && sku.name ? sku.name : '默认'
  return {
    key: product.id + '|' + name,
    id: product.id,
    name: product.name,
    skuName: name,
    price: sku && sku.price != null ? sku.price : product.price,
    emoji: product.emoji,
    bg: product.bg,
    qty: qty || 1,
    checked: true
  }
}

function addToCart(product, sku, qty) {
  const item = buildItem(product, sku, qty)
  const list = getCart()
  const hit = list.find((i) => i.key === item.key)
  if (hit) {
    hit.qty += item.qty
    hit.checked = true
  } else {
    list.push(item)
  }
  saveCart(list)
  return list
}

function updateQty(key, qty) {
  const list = getCart()
  const hit = list.find((i) => i.key === key)
  if (hit) {
    hit.qty = qty
    if (hit.qty < 1) hit.qty = 1
  }
  saveCart(list)
  return list
}

function removeItem(key) {
  const list = getCart().filter((i) => i.key !== key)
  saveCart(list)
  return list
}

/** 结算后移除已下单条目 */
function removeByKeys(keys) {
  const set = keys.reduce((acc, k) => {
    acc[k] = true
    return acc
  }, {})
  const list = getCart().filter((i) => !set[i.key])
  saveCart(list)
  return list
}

function toggledList(list) {
  saveCart(list)
  return list
}

module.exports = {
  CART_KEY,
  getCart,
  saveCart,
  buildItem,
  addToCart,
  updateQty,
  removeItem,
  removeByKeys,
  toggledList
}
