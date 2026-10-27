const couponUtil = require('../../utils/coupon')

Page({
  data: {
    tabs: [
      { key: 'usable', name: '可使用' },
      { key: 'used', name: '已使用' },
      { key: 'expired', name: '已过期' }
    ],
    active: 'usable',
    list: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const grouped = couponUtil.grouped()
    const decorate = (arr) =>
      arr.map((c) =>
        Object.assign({}, c, {
          expText: couponUtil.formatDate(c.expireAt),
          usedText: c.usedAt ? couponUtil.formatDate(c.usedAt) : ''
        })
      )
    this.groups = {
      usable: decorate(grouped.usable),
      used: decorate(grouped.used),
      expired: decorate(grouped.expired)
    }
    this.filter()
  },

  filter() {
    this.setData({ list: (this.groups && this.groups[this.data.active]) || [] })
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ active: key }, () => this.filter())
  },

  useNow() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
