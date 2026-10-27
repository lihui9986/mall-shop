const cartUtil = require('./utils/cart')
const couponUtil = require('./utils/coupon')

App({
  globalData: {
    userInfo: null,
    cartCount: 0,
    cloudReady: false
  },

  onLaunch() {
    this.initCloud()
    // 首次启动发放演示优惠券
    couponUtil.grantDefaults()
  },

  onShow() {
    this.refreshBadge()
  },

  /**
   * 云开发初始化。
   * 本地 Mock 模式下无需配置，填好 ENV_ID 后 cloudReady 才会变成 true。
   */
  initCloud() {
    if (!wx.cloud) {
      console.info('[cloud] 当前基础库不支持云开发，使用本地 Mock')
      return
    }
    const ENV_ID = 'your-env-id' // TODO: 替换为你的云开发环境 ID
    if (ENV_ID === 'your-env-id') {
      console.info('[cloud] 未配置环境 ID，使用本地 Mock 数据')
      return
    }
    try {
      wx.cloud.init({ env: ENV_ID, traceUser: true })
      this.globalData.cloudReady = true
    } catch (err) {
      console.warn('[cloud] 初始化失败，回退本地 Mock', err)
    }
  },

  /** 刷新购物车角标 */
  refreshBadge() {
    const list = cartUtil.getCart()
    const count = list.reduce((sum, item) => sum + item.qty, 0)
    this.globalData.cartCount = count
    if (count > 0) {
      wx.setTabBarBadge({ index: 1, text: String(count > 99 ? '99+' : count), fail() {} })
    } else {
      wx.removeTabBarBadge({ index: 1, fail() {} })
    }
  }
})
