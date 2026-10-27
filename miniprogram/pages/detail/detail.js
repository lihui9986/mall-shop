const api = require('../../utils/api')
const cartUtil = require('../../utils/cart')

Page({
  data: {
    product: null,
    skuIndex: 0,
    sku: null,
    qty: 1,
    loading: true
  },

  onLoad(options) {
    this.productId = options.id
    this.load()
  },

  async load() {
    try {
      const product = await api.getProduct(this.productId)
      if (!product) {
        this.setData({ loading: false })
        wx.showToast({ title: '商品不存在', icon: 'none' })
        return
      }
      wx.setNavigationBarTitle({ title: product.name })
      this.setData({
        product,
        sku: product.skus[0],
        skuIndex: 0,
        loading: false
      })
    } catch (err) {
      console.error('[detail] load failed', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  pickSku(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({
      skuIndex: index,
      sku: this.data.product.skus[index]
    })
  },

  inc() {
    const max = this.data.sku ? this.data.sku.stock : 99
    if (this.data.qty >= max) {
      wx.showToast({ title: '已达库存上限', icon: 'none' })
      return
    }
    this.setData({ qty: this.data.qty + 1 })
  },

  dec() {
    if (this.data.qty <= 1) return
    this.setData({ qty: this.data.qty - 1 })
  },

  addCart() {
    const { product, sku, qty } = this.data
    if (!product) return
    cartUtil.addToCart(product, sku, qty)
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  },

  buyNow() {
    const { product, sku, qty } = this.data
    if (!product) return
    const item = cartUtil.buildItem(product, sku, qty)
    // 立即购买不参与购物车清理，给一个独立 key
    item.key = 'buynow_' + Date.now()
    wx.setStorageSync('mall_checkout', [item])
    wx.navigateTo({ url: '/pages/order-confirm/order-confirm?from=buynow' })
  },

  goCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  onService() {
    wx.showToast({ title: '客服功能待接入', icon: 'none' })
  }
})
