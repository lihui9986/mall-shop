const couponUtil = require('../../utils/coupon')

const ORDER_KEY = 'mall_orders'

Page({
  data: {
    userInfo: null,
    counts: { unpaid: 0, unshipped: 0, shipped: 0, done: 0 },
    couponCount: 0,
    orderCount: 0
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const app = getApp()
    const userInfo =
      (app && app.globalData.userInfo) ||
      wx.getStorageSync('mall_user') || {
        nickName: '微信用户',
        avatar: '🙂'
      }

    const orders = wx.getStorageSync(ORDER_KEY) || []
    const counts = { unpaid: 0, unshipped: 0, shipped: 0, done: 0 }
    orders.forEach((o) => {
      if (counts[o.status] != null) counts[o.status] += 1
    })

    this.setData({
      userInfo,
      counts,
      orderCount: orders.length,
      couponCount: couponUtil.availableFor(Number.MAX_SAFE_INTEGER).length
    })
  },

  goOrders(e) {
    const tab = e.currentTarget.dataset.tab || 'all'
    wx.navigateTo({ url: '/pages/order-list/order-list?tab=' + tab })
  },

  goCoupon() {
    wx.navigateTo({ url: '/pages/coupon/coupon' })
  },

  goAddress() {
    wx.navigateTo({ url: '/pages/address/address' })
  },

  onService() {
    wx.showToast({ title: '客服功能待接入', icon: 'none' })
  },

  onAbout() {
    wx.showModal({
      title: '关于',
      content: '优选商城 · 演示版\n微信原生小程序 + 本地 Mock 数据\n支付为模拟流程，接入商户号后可替换为 wx.requestPayment',
      showCancel: false
    })
  },

  onReset() {
    wx.showModal({
      title: '清除演示数据',
      content: '将清空购物车、订单、优惠券和地址',
      success: (res) => {
        if (!res.confirm) return
        wx.removeStorageSync('mall_cart')
        wx.removeStorageSync('mall_orders')
        wx.removeStorageSync('mall_coupons')
        wx.removeStorageSync('mall_address')
        wx.removeStorageSync('mall_checkout')
        couponUtil.grantDefaults()
        this.refresh()
        const app = getApp()
        if (app && app.refreshBadge) app.refreshBadge()
        wx.showToast({ title: '已重置', icon: 'none' })
      }
    })
  }
})
