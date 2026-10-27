const format = require('../../utils/format')

const ORDER_KEY = 'mall_orders'

const TABS = [
  { key: 'all', name: '全部' },
  { key: 'unpaid', name: '待付款' },
  { key: 'unshipped', name: '待发货' },
  { key: 'shipped', name: '待收货' },
  { key: 'done', name: '已完成' }
]

const STATUS_TEXT = {
  unpaid: '待付款',
  unshipped: '待发货',
  shipped: '待收货',
  done: '已完成',
  closed: '已关闭'
}

Page({
  data: {
    tabs: TABS,
    active: 'all',
    orders: [],
    allOrders: []
  },

  onLoad(options) {
    const map = { 1: 'unpaid', 2: 'unshipped', 3: 'shipped', 4: 'done' }
    const active = map[options.tab] || options.tab || 'all'
    this.setData({ active })
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const orders = (wx.getStorageSync(ORDER_KEY) || []).map((o) =>
      Object.assign({}, o, {
        statusText: STATUS_TEXT[o.status] || o.status,
        totalQty: o.items.reduce((s, i) => s + i.qty, 0)
      })
    )
    this.setData({ allOrders: orders }, () => this.filter())
  },

  filter() {
    const { active, allOrders } = this.data
    const orders =
      active === 'all' ? allOrders : allOrders.filter((o) => o.status === active)
    this.setData({ orders })
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ active: key }, () => this.filter())
  },

  persist(orders) {
    // 写回时移除派生字段
    const raw = orders.map((o) => {
      const copy = Object.assign({}, o)
      delete copy.statusText
      delete copy.totalQty
      return copy
    })
    wx.setStorageSync(ORDER_KEY, raw)
  },

  updateStatus(orderNo, status) {
    const all = this.data.allOrders.map((o) =>
      o.orderNo === orderNo
        ? Object.assign({}, o, { status, statusText: STATUS_TEXT[status] })
        : o
    )
    this.setData({ allOrders: all }, () => {
      this.persist(all)
      this.filter()
    })
  },

  onPay(e) {
    const orderNo = e.currentTarget.dataset.no
    const order = this.data.allOrders.find((o) => o.orderNo === orderNo)
    if (!order) return
    wx.showModal({
      title: '模拟微信支付',
      content: '应付金额 ¥' + order.payTotal,
      confirmText: '确认支付',
      success: (res) => {
        if (!res.confirm) return
        this.updateStatus(orderNo, 'unshipped')
        wx.showToast({ title: '支付成功', icon: 'none' })
      }
    })
  },

  onCancel(e) {
    const orderNo = e.currentTarget.dataset.no
    wx.showModal({
      title: '取消订单',
      content: '确定取消该订单？',
      success: (res) => {
        if (!res.confirm) return
        this.updateStatus(orderNo, 'closed')
        wx.showToast({ title: '订单已取消', icon: 'none' })
      }
    })
  },

  onRemind(e) {
    wx.showToast({ title: '已提醒商家发货', icon: 'none' })
  },

  onConfirm(e) {
    const orderNo = e.currentTarget.dataset.no
    wx.showModal({
      title: '确认收货',
      content: '请确认已收到商品',
      success: (res) => {
        if (!res.confirm) return
        this.updateStatus(orderNo, 'done')
        wx.showToast({ title: '交易完成', icon: 'none' })
      }
    })
  },

  onDelete(e) {
    const orderNo = e.currentTarget.dataset.no
    wx.showModal({
      title: '删除订单',
      content: '删除后不可恢复',
      success: (res) => {
        if (!res.confirm) return
        const all = this.data.allOrders.filter((o) => o.orderNo !== orderNo)
        this.setData({ allOrders: all }, () => {
          this.persist(all)
          this.filter()
        })
      }
    })
  },

  goShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
