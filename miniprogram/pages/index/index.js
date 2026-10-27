const api = require('../../utils/api')

Page({
  data: {
    banners: [],
    flash: [],
    products: [],
    loading: true
  },

  onLoad() {
    this.load()
  },

  onShow() {
    const app = getApp()
    if (app && typeof app.refreshBadge === 'function') app.refreshBadge()
  },

  async load() {
    try {
      const [banners, flash, products] = await Promise.all([
        api.getBanners(),
        api.getFlash(),
        api.getProducts()
      ])
      this.setData({ banners, flash, products, loading: false })
    } catch (err) {
      console.error('[index] load failed', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
    }
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  goCoupon() {
    wx.navigateTo({ url: '/pages/coupon/coupon' })
  },

  onSearch() {
    wx.showToast({ title: '搜索功能待接入后端', icon: 'none' })
  },

  goCategory() {
    wx.showToast({ title: '分类页待接入', icon: 'none' })
  }
})
