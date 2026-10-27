const ADDR_KEY = 'mall_address'

Page({
  data: {
    form: {
      name: '',
      phone: '',
      detail: ''
    },
    saving: false
  },

  onLoad() {
    const saved = wx.getStorageSync(ADDR_KEY)
    if (saved) this.setData({ form: saved })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const key = 'form.' + field
    this.setData({ [key]: e.detail.value })
  },

  /** 一键填充演示地址，方便联调 */
  fillDemo() {
    this.setData({
      form: {
        name: '张三',
        phone: '13800138000',
        detail: '广东省深圳市南山区科技园南路 8 号 A 座 1201'
      }
    })
  },

  save() {
    if (this.data.saving) return
    const { name, phone, detail } = this.data.form

    if (!name.trim()) {
      wx.showToast({ title: '请填写收货人', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }
    if (detail.trim().length < 5) {
      wx.showToast({ title: '详细地址太短', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    wx.setStorageSync(ADDR_KEY, {
      name: name.trim(),
      phone: phone.trim(),
      detail: detail.trim()
    })

    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      this.setData({ saving: false })
      wx.navigateBack()
    }, 600)
  }
})
