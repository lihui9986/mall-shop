const cartUtil = require('../../utils/cart')
const couponUtil = require('../../utils/coupon')
const format = require('../../utils/format')

const ORDER_KEY = 'mall_orders'

Page({
  data: {
    items: [],
    address: null,
    usableCoupons: [],
    selectedCoupon: null,
    goodsTotal: '0.00',
    discount: '0.00',
    payTotal: '0.00',
    remark: '',
    submitting: false
  },

  onLoad() {
    const items = wx.getStorageSync('mall_checkout') || []
    if (!items.length) {
      wx.showToast({ title: '没有待结算商品', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({
      items,
      address: wx.getStorageSync('mall_address') || null
    })
    this.recalc()
  },

  onShow() {
    // 从地址页返回时同步
    const address = wx.getStorageSync('mall_address') || null
    if (address) this.setData({ address })
  },

  /** 重算金额 + 可用券 */
  recalc() {
    const items = this.data.items
    const goods = items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const usable = couponUtil.availableFor(goods)

    let selected = this.data.selectedCoupon
    if (selected && !usable.some((c) => c.id === selected.id)) selected = null
    // 用户手动选择过就不再自动代选（否则"不使用优惠券"会被覆盖）
    if (!selected && usable.length && !this.couponTouched) {
      selected = usable.reduce((a, b) => (a.amount >= b.amount ? a : b))
    }

    const discount = selected ? selected.amount : 0
    const pay = Math.max(0, goods - discount)

    this.setData({
      usableCoupons: usable,
      selectedCoupon: selected,
      goodsTotal: format.money(goods),
      discount: format.money(discount),
      payTotal: format.money(pay)
    })
  },

  chooseCoupon() {
    const list = this.data.usableCoupons
    if (!list.length) {
      wx.showToast({ title: '暂无可用优惠券', icon: 'none' })
      return
    }
    const labels = list.map((c) => c.name + '（满' + c.threshold + '减' + c.amount + '）')
    labels.push('不使用优惠券')

    wx.showActionSheet({
      itemList: labels.slice(0, 6),
      success: (res) => {
        const index = res.tapIndex
        this.couponTouched = true
        if (index >= list.length) {
          this.setData({ selectedCoupon: null }, () => this.recalc())
        } else {
          this.setData({ selectedCoupon: list[index] }, () => this.recalc())
        }
      },
      fail() {}
    })
  },

  goAddress() {
    wx.navigateTo({ url: '/pages/address/address' })
  },

  onRemark(e) {
    this.setData({ remark: e.detail.value })
  },

  submit() {
    if (this.data.submitting) return

    if (!this.data.address) {
      wx.showToast({ title: '请先填写收货地址', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    wx.showModal({
      title: '模拟微信支付',
      content: '应付金额 ¥' + this.data.payTotal + '，是否确认支付？',
      confirmText: '确认支付',
      cancelText: '暂不支付',
      success: (res) => {
        this.createOrder(!!res.confirm)
      },
      fail: () => {
        this.setData({ submitting: false })
      }
    })
  },

  createOrder(paid) {
    const { items, address, selectedCoupon, goodsTotal, discount, payTotal, remark } = this.data

    const order = {
      orderNo: format.orderNo(),
      createTime: format.datetime(Date.now()),
      status: paid ? 'unshipped' : 'unpaid',
      items: items.map((i) => ({
        key: i.key,
        id: i.id,
        name: i.name,
        skuName: i.skuName,
        price: i.price,
        qty: i.qty,
        emoji: i.emoji,
        bg: i.bg
      })),
      goodsTotal,
      discount,
      payTotal,
      couponName: selectedCoupon ? selectedCoupon.name : '',
      address,
      remark
    }

    const orders = wx.getStorageSync(ORDER_KEY) || []
    orders.unshift(order)
    wx.setStorageSync(ORDER_KEY, orders)

    // 核销优惠券
    if (selectedCoupon && paid) {
      couponUtil.markUsed(selectedCoupon.id)
    }

    // 清掉已下单的购物车条目
    const keys = items.map((i) => i.key)
    cartUtil.removeByKeys(keys)
    wx.removeStorageSync('mall_checkout')

    this.setData({ submitting: false })

    wx.showToast({
      title: paid ? '支付成功' : '订单已生成，待支付',
      icon: 'none'
    })

    setTimeout(() => {
      wx.redirectTo({ url: '/pages/order-list/order-list?tab=' + (paid ? 2 : 1) })
    }, 700)
  }
})
