const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 创建订单（示例云函数）
 *
 * 关键原则：金额一律在服务端重算，绝不相信客户端传来的 price / payTotal。
 * 集合约定：
 *   products  { _id, name, price, stock, skus: [{ name, price, stock }] }
 *   orders    { _openid, orderNo, items, goodsTotal, discount, payTotal, status, createTime }
 *   coupons   { _openid, couponId, amount, threshold, used, expireAt }
 *
 * 入参：
 *   { items: [{ productId, skuName, qty }], couponId }
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { items = [], couponId } = event || {}

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, msg: 'EMPTY_ITEMS' }
  }

  // ---- 1. 服务端重算金额 ----
  const normalized = []
  for (const it of items) {
    const qty = Math.floor(Number(it.qty))
    if (!Number.isFinite(qty) || qty <= 0 || qty > 99) {
      return { ok: false, msg: 'BAD_QTY' }
    }
    const snap = await db.collection('products').doc(it.productId).get()
    const product = snap.data
    if (!product) return { ok: false, msg: 'PRODUCT_NOT_FOUND' }

    const sku = (product.skus || []).find((s) => s.name === it.skuName) || product.skus[0]
    if (!sku || sku.stock < qty) return { ok: false, msg: 'OUT_OF_STOCK' }

    normalized.push({
      productId: product._id,
      name: product.name,
      skuName: sku.name,
      price: sku.price,
      qty
    })
  }

  const goodsTotal = normalized.reduce((s, i) => s + i.price * i.qty, 0)

  // ---- 2. 校验优惠券 ----
  let discount = 0
  let couponRef = null
  if (couponId) {
    const cSnap = await db.collection('coupons').doc(couponId).get()
    const coupon = cSnap.data
    if (
      coupon &&
      coupon._openid === OPENID &&
      !coupon.used &&
      coupon.expireAt > Date.now() &&
      goodsTotal >= coupon.threshold
    ) {
      discount = coupon.amount
      couponRef = couponId
    }
  }

  const payTotal = Math.max(0, goodsTotal - discount)

  // ---- 3. 写单 + 扣库存 + 核销券（事务）----
  const orderNo =
    'M' + Date.now() + Math.floor(Math.random() * 900 + 100)

  const tx = await db.startTransaction()
  try {
    for (const it of normalized) {
      await tx.collection('products').doc(it.productId).update({
        data: { stock: db.command.inc(-it.qty) }
      })
    }
    if (couponRef) {
      await tx.collection('coupons').doc(couponRef).update({
        data: { used: true, usedAt: Date.now() }
      })
    }
    await tx.collection('orders').add({
      data: {
        _openid: OPENID,
        orderNo,
        items: normalized,
        goodsTotal,
        discount,
        payTotal,
        status: 'unpaid',
        createTime: Date.now()
      }
    })
    await tx.commit()
  } catch (err) {
    await tx.rollback()
    return { ok: false, msg: 'TX_FAILED', detail: String(err) }
  }

  return { ok: true, orderNo, goodsTotal, discount, payTotal }
}
