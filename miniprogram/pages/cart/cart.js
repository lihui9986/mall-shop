const cartUtil = require('../../utils/cart')
const format = require('../../utils/format')

Page({
  data: {
    list: [],
    allChecked: false,
    total: '0.00',
    count: 0
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const raw = cartUtil.getCart()
    const list = raw.map((item) =>
      Object.assign({}, item, { subtotal: format.money(item.price * item.qty) })
    )
    this.setData({ list }, () => this.calc())
  },

  calc() {
    const list = this.data.list
    const checked = list.filter((i) => i.checked)
    const total = checked.reduce((sum, i) => sum + i.price * i.qty, 0)
    const count = checked.reduce((sum, i) => sum + i.qty, 0)
    this.setData({
      total: format.money(total),
      count,
      allChecked: list.length > 0 && checked.length === list.length
    })
  },

  persist() {
    cartUtil.saveCart(this.data.list)
  },

  toggle(e) {
    const index = Number(e.currentTarget.dataset.index)
    const key = 'list[' + index + '].checked'
    this.setData({ [key]: !this.data.list[index].checked }, () => {
      this.persist()
      this.calc()
    })
  },

  toggleAll() {
    const next = !this.data.allChecked
    const list = this.data.list.map((i) => Object.assign({}, i, { checked: next }))
    this.setData({ list, allChecked: next }, () => {
      this.persist()
      this.calc()
    })
  },

  inc(e) {
    const index = Number(e.currentTarget.dataset.index)
    const item = this.data.list[index]
    const key = 'list[' + index + '].qty'
    const subKey = 'list[' + index + '].subtotal'
    const qty = item.qty + 1
    this.setData(
      { [key]: qty, [subKey]: format.money(item.price * qty) },
      () => {
        this.persist()
        this.calc()
      }
    )
  },

  dec(e) {
    const index = Number(e.currentTarget.dataset.index)
    const item = this.data.list[index]
    if (item.qty <= 1) return
    const key = 'list[' + index + '].qty'
    const subKey = 'list[' + index + '].subtotal'
    const qty = item.qty - 1
    this.setData(
      { [key]: qty, [subKey]: format.money(item.price * qty) },
      () => {
        this.persist()
        this.calc()
      }
    )
  },

  remove(e) {
    const index = Number(e.currentTarget.dataset.index)
    const item = this.data.list[index]
    wx.showModal({
      title: '移除商品',
      content: '确定将「' + item.name + '」移出购物车？',
      success: (res) => {
        if (!res.confirm) return
        const list = this.data.list.filter((_, i) => i !== index)
        this.setData({ list }, () => {
          this.persist()
          this.calc()
        })
      }
    })
  },

  checkout() {
    const items = this.data.list.filter((i) => i.checked)
    if (!items.length) {
      wx.showToast({ title: '请选择要结算的商品', icon: 'none' })
      return
    }
    wx.setStorageSync('mall_checkout', items)
    wx.navigateTo({ url: '/pages/order-confirm/order-confirm?from=cart' })
  },

  goShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
