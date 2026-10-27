/* 优选商城 · H5 版
 * 与微信小程序共用同一套业务规则：购物车 / 优惠券 / 订单 / 地址
 * 数据存 localStorage，支付为模拟流程
 */
;(function () {
  'use strict'

  /* ================= 基础 ================= */

  var K = {
    cart: 'mall_cart',
    coupons: 'mall_coupons',
    orders: 'mall_orders',
    address: 'mall_address',
    checkout: 'mall_checkout'
  }

  var LS = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem(k)
        return v === null ? d : JSON.parse(v)
      } catch (e) {
        return d
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v))
      } catch (e) {}
    },
    del: function (k) {
      try {
        localStorage.removeItem(k)
      } catch (e) {}
    }
  }

  function money(n) {
    return (Number(n) || 0).toFixed(2)
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  function pad(n) {
    return n < 10 ? '0' + n : '' + n
  }

  function nowText() {
    var d = new Date()
    return (
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes())
    )
  }

  function dateText(ts) {
    var d = new Date(ts)
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate())
  }

  function orderNo() {
    var d = new Date()
    return (
      'M' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
      pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) +
      Math.floor(Math.random() * 900 + 100)
    )
  }

  var toastTimer = null
  function toast(msg) {
    var el = document.getElementById('toast')
    if (!el) {
      el = document.createElement('div')
      el.id = 'toast'
      el.className = 'toast'
      document.body.appendChild(el)
    }
    el.textContent = msg
    el.classList.add('show')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(function () {
      el.classList.remove('show')
    }, 1800)
  }

  /* ================= 购物车 ================= */

  var Cart = {
    all: function () {
      var l = LS.get(K.cart, [])
      return Array.isArray(l) ? l : []
    },
    save: function (list) {
      LS.set(K.cart, list)
      refreshTabbar()
      return list
    },
    build: function (product, sku, qty) {
      var name = sku && sku.name ? sku.name : '默认'
      return {
        key: product.id + '|' + name,
        id: product.id,
        name: product.name,
        skuName: name,
        price: sku && sku.price != null ? sku.price : product.price,
        emoji: product.emoji,
        bg: product.bg,
        qty: qty || 1,
        checked: true
      }
    },
    add: function (product, sku, qty) {
      var item = Cart.build(product, sku, qty)
      var list = Cart.all()
      var hit = null
      for (var i = 0; i < list.length; i++) {
        if (list[i].key === item.key) hit = list[i]
      }
      if (hit) {
        hit.qty += item.qty
        hit.checked = true
      } else {
        list.push(item)
      }
      return Cart.save(list)
    },
    count: function () {
      return Cart.all().reduce(function (s, i) {
        return s + i.qty
      }, 0)
    },
    removeByKeys: function (keys) {
      var map = {}
      keys.forEach(function (k) {
        map[k] = true
      })
      return Cart.save(
        Cart.all().filter(function (i) {
          return !map[i.key]
        })
      )
    }
  }

  /* ================= 优惠券 ================= */

  var Coupon = {
    ensure: function () {
      var existed = LS.get(K.coupons, null)
      if (existed) return
      var now = Date.now()
      LS.set(
        K.coupons,
        DATA.coupons.map(function (c) {
          return {
            id: c.id,
            name: c.name,
            amount: c.amount,
            threshold: c.threshold,
            expireAt: now + c.hours * 3600 * 1000,
            used: false
          }
        })
      )
    },
    all: function () {
      var l = LS.get(K.coupons, [])
      return Array.isArray(l) ? l : []
    },
    save: function (l) {
      LS.set(K.coupons, l)
      return l
    },
    available: function (total) {
      var now = Date.now()
      return Coupon.all().filter(function (c) {
        return !c.used && c.expireAt > now && total >= c.threshold
      })
    },
    markUsed: function (id) {
      var list = Coupon.all().map(function (c) {
        if (c.id === id) {
          c.used = true
          c.usedAt = Date.now()
        }
        return c
      })
      Coupon.save(list)
    },
    grouped: function () {
      var now = Date.now()
      var list = Coupon.all()
      return {
        usable: list.filter(function (c) {
          return !c.used && c.expireAt > now
        }),
        used: list.filter(function (c) {
          return c.used
        }),
        expired: list.filter(function (c) {
          return !c.used && c.expireAt <= now
        })
      }
    }
  }

  /* ================= 订单 ================= */

  var STATUS_TEXT = {
    unpaid: '待付款',
    unshipped: '待发货',
    shipped: '待收货',
    done: '已完成',
    closed: '已关闭'
  }

  var Order = {
    all: function () {
      var l = LS.get(K.orders, [])
      return Array.isArray(l) ? l : []
    },
    save: function (l) {
      LS.set(K.orders, l)
      return l
    },
    add: function (o) {
      var l = Order.all()
      l.unshift(o)
      return Order.save(l)
    },
    patch: function (no, patch) {
      return Order.save(
        Order.all().map(function (o) {
          return o.orderNo === no ? Object.assign({}, o, patch) : o
        })
      )
    },
    remove: function (no) {
      return Order.save(
        Order.all().filter(function (o) {
          return o.orderNo !== no
        })
      )
    }
  }

  /* ================= 页面状态 ================= */

  var detailState = { id: null, skuIndex: 0, qty: 1 }
  var checkoutState = null
  var couponTab = 'usable'
  var orderTab = 'all'
  var currentTab = 'home'

  /* ================= 视图 ================= */

  function viewHome() {
    var banners = DATA.banners
    var products = DATA.products
    var flash = products.slice(0, 4)

    return (
      '<header class="topbar">' +
      '<div class="search" data-act="search">🔍<span>搜索蓝牙耳机、充电宝…</span></div>' +
      '</header>' +
      '<main class="page">' +
      '<div class="banners">' +
      banners
        .map(function (b) {
          return (
            '<div class="banner" style="background:' + b.bg + '" data-act="open-coupons">' +
            '<div class="banner-title">' + esc(b.title) + '</div>' +
            '<div class="banner-sub">' + esc(b.sub) + '</div>' +
            '<div class="banner-btn">' + esc(b.btn) + '</div>' +
            '</div>'
          )
        })
        .join('') +
      '</div>' +

      '<div class="coupon-strip" data-act="open-coupons">' +
      '<span class="cs-ico">🎫</span>' +
      '<div class="cs-main">' +
      '<div class="cs-title">新人券已到账</div>' +
      '<div class="cs-sub">满 199 减 100 · 有效期 24 小时</div>' +
      '</div>' +
      '<span class="cs-go">去使用 ›</span>' +
      '</div>' +

      '<section class="section">' +
      '<div class="sec-head"><h2>限时秒杀</h2><span>真实库存 · 售完即止</span></div>' +
      '<div class="flash">' +
      flash
        .map(function (p) {
          return (
            '<div class="flash-item" data-act="open-detail" data-id="' + p.id + '">' +
            '<div class="flash-thumb" style="background:' + p.bg + '">' + p.emoji + '</div>' +
            '<div class="flash-name">' + esc(p.name) + '</div>' +
            '<div class="flash-price">¥' + p.price + '</div>' +
            '</div>'
          )
        })
        .join('') +
      '</div>' +
      '</section>' +

      '<section class="section">' +
      '<div class="sec-head"><h2>为你推荐</h2></div>' +
      '<div class="grid">' + products.map(productCard).join('') + '</div>' +
      '</section>' +

      '<p class="footer-tip">— 品质优选 · 正品保障 —</p>' +
      '</main>'
    )
  }

  function productCard(p) {
    return (
      '<article class="card" data-act="open-detail" data-id="' + p.id + '">' +
      '<div class="card-thumb" style="background:' + p.bg + '">' + p.emoji + '</div>' +
      '<div class="card-body">' +
      '<div class="card-name">' + esc(p.name) + '</div>' +
      '<div class="card-sub">' + esc(p.subtitle) + '</div>' +
      '<div class="card-tags">' +
      p.tags.map(function (t) { return '<span>' + esc(t) + '</span>' }).join('') +
      '</div>' +
      '<div class="card-foot">' +
      '<span class="price"><i class="rmb">¥</i>' + p.price + '</span>' +
      '<span class="origin">¥' + p.originPrice + '</span>' +
      '<span class="sales">已售 ' + p.sales + '</span>' +
      '</div></div></article>'
    )
  }

  function viewDetail(id) {
    var p = null
    for (var i = 0; i < DATA.products.length; i++) {
      if (DATA.products[i].id === id) p = DATA.products[i]
    }
    if (!p) return navBar('商品详情') + emptyState('📦', '商品不存在或已下架')

    if (detailState.id !== id) detailState = { id: id, skuIndex: 0, qty: 1 }
    var sku = p.skus[detailState.skuIndex]

    return (
      navBar(p.name, true) +
      '<div class="hero" style="background:' + p.bg + '">' + p.emoji + '</div>' +
      '<main class="page has-actionbar">' +

      '<section class="panel">' +
      '<div class="price-row">' +
      '<span class="price price-lg"><i class="rmb">¥</i>' + sku.price + '</span>' +
      '<span class="origin">¥' + p.originPrice + '</span>' +
      '<span class="sales">已售 ' + p.sales + ' 件</span>' +
      '</div>' +
      '<h2 class="title">' + esc(p.name) + '</h2>' +
      '<p class="subtitle">' + esc(p.subtitle) + '</p>' +
      '<div class="tags">' +
      p.tags.map(function (t) { return '<span>' + esc(t) + '</span>' }).join('') +
      '</div>' +
      '</section>' +

      '<section class="panel">' +
      '<h3 class="panel-title">选择规格</h3>' +
      '<div class="skus">' +
      p.skus
        .map(function (s, i) {
          return (
            '<button class="sku' + (i === detailState.skuIndex ? ' on' : '') + '" ' +
            'data-act="pick-sku" data-index="' + i + '">' + esc(s.name) + '</button>'
          )
        })
        .join('') +
      '</div>' +
      '<div class="qty-row">' +
      '<span class="qty-label">购买数量</span>' +
      '<div class="stepper">' +
      '<button data-act="qty-dec">−</button>' +
      '<span>' + detailState.qty + '</span>' +
      '<button data-act="qty-inc">+</button>' +
      '</div></div>' +
      '<p class="stock">库存 ' + sku.stock + ' 件</p>' +
      '</section>' +

      '<section class="panel">' +
      '<div class="service-row"><span class="service-key">服务</span>' +
      '<div class="service-val">' +
      '<span>正品保障</span><span>顺丰包邮</span><span>7 天无理由</span>' +
      '</div></div>' +
      '<div class="divider"></div>' +
      '<div class="service-row"><span class="service-key">说明</span>' +
      '<p class="service-desc">下单后 48 小时内发货，未发货订单支持原路退款（微信支付退款 API）。</p>' +
      '</div>' +
      '</section>' +

      '<section class="panel">' +
      '<h3 class="panel-title">商品详情</h3>' +
      '<div class="detail-block" style="background:' + p.bg + '">' + p.emoji + '</div>' +
      '<p class="detail-text">本页为演示数据，接入真实后端后由富文本或图片轮播渲染详情。</p>' +
      '</section>' +

      '</main>' +

      '<div class="action-bar">' +
      '<button class="ico-btn" data-act="service">💬<i>客服</i></button>' +
      '<button class="ico-btn" data-act="go-cart">🛒<i>购物车</i></button>' +
      '<button class="btn-cart" data-act="add-cart">加入购物车</button>' +
      '<button class="btn-buy" data-act="buy-now">立即购买</button>' +
      '</div>'
    )
  }

  function viewCart() {
    var list = Cart.all()

    if (!list.length) {
      return (
        navBar('购物车') +
        '<main class="page">' +
        emptyState('🛒', '购物车还是空的') +
        '<div class="center"><a class="go-btn" href="#/home">去逛逛</a></div>' +
        '</main>'
      )
    }

    var checked = list.filter(function (i) { return i.checked })
    var total = checked.reduce(function (s, i) { return s + i.price * i.qty }, 0)
    var count = checked.reduce(function (s, i) { return s + i.qty }, 0)
    var allChecked = checked.length === list.length

    return (
      navBar('购物车') +
      '<main class="page has-actionbar">' +
      '<div class="list">' +
      list
        .map(function (item, index) {
          return (
            '<div class="cart-item">' +
            '<button class="check' + (item.checked ? ' on' : '') + '" ' +
            'data-act="cart-toggle" data-index="' + index + '">' + (item.checked ? '✓' : '') + '</button>' +
            '<div class="thumb" style="background:' + item.bg + '">' + item.emoji + '</div>' +
            '<div class="info">' +
            '<div class="name">' + esc(item.name) + '</div>' +
            '<div class="sku">规格：' + esc(item.skuName) + '</div>' +
            '<div class="row">' +
            '<span class="price"><i class="rmb">¥</i>' + item.price + '</span>' +
            '<div class="stepper">' +
            '<button data-act="cart-dec" data-index="' + index + '">−</button>' +
            '<span>' + item.qty + '</span>' +
            '<button data-act="cart-inc" data-index="' + index + '">+</button>' +
            '</div></div>' +
            '<div class="subtotal">小计 ¥' + money(item.price * item.qty) + '</div>' +
            '</div>' +
            '<button class="del" data-act="cart-remove" data-index="' + index + '">✕</button>' +
            '</div>'
          )
        })
        .join('') +
      '</div>' +
      '<p class="tip">共计 ' + list.length + ' 种商品，支持 7 天无理由退换</p>' +
      '</main>' +

      '<div class="action-bar cart-bar">' +
      '<button class="all-btn" data-act="cart-all">' +
      '<span class="check' + (allChecked ? ' on' : '') + '">' + (allChecked ? '✓' : '') + '</span>' +
      '全选</button>' +
      '<div class="sum"><span>合计</span><b class="price"><i class="rmb">¥</i>' + money(total) + '</b></div>' +
      '<button class="pay-btn' + (count === 0 ? ' off' : '') + '" data-act="checkout">结算' +
      (count > 0 ? '(' + count + ')' : '') + '</button>' +
      '</div>'
    )
  }

  function viewCheckout() {
    if (!checkoutState || !checkoutState.items.length) {
      return navBar('确认订单') + emptyState('🧾', '没有待结算商品')
    }

    var items = checkoutState.items
    var address = LS.get(K.address, null)
    var goods = items.reduce(function (s, i) { return s + i.price * i.qty }, 0)
    var usable = Coupon.available(goods)

    if (checkoutState.couponId && !usable.some(function (c) { return c.id === checkoutState.couponId })) {
      checkoutState.couponId = null
    }
    if (!checkoutState.couponId && !checkoutState.touched && usable.length) {
      checkoutState.couponId = usable.reduce(function (a, b) {
        return a.amount >= b.amount ? a : b
      }).id
    }

    var coupon = null
    for (var i = 0; i < usable.length; i++) {
      if (usable[i].id === checkoutState.couponId) coupon = usable[i]
    }
    var discount = coupon ? coupon.amount : 0
    var pay = Math.max(0, goods - discount)

    var options = '<option value="">' + (usable.length ? '不使用优惠券' : '暂无可用优惠券') + '</option>'
    options += usable
      .map(function (c) {
        return '<option value="' + c.id + '"' + (c.id === checkoutState.couponId ? ' selected' : '') + '>' +
          esc(c.name) + '（满' + c.threshold + '减' + c.amount + '）</option>'
      })
      .join('')

    return (
      navBar('确认订单') +
      '<main class="page has-actionbar">' +

      '<section class="card addr" data-act="open-address">' +
      '<span class="addr-ico">📍</span>' +
      (address
        ? '<div class="addr-main">' +
          '<div class="addr-line1"><b>' + esc(address.name) + '</b><span>' + esc(address.phone) + '</span></div>' +
          '<p class="addr-detail">' + esc(address.detail) + '</p></div>'
        : '<div class="addr-main"><p class="addr-empty">请添加收货地址</p></div>') +
      '<span class="addr-arrow">›</span>' +
      '</section>' +

      '<section class="card goods">' +
      items
        .map(function (item) {
          return (
            '<div class="goods-item">' +
            '<div class="g-thumb" style="background:' + item.bg + '">' + item.emoji + '</div>' +
            '<div class="g-info"><div class="g-name">' + esc(item.name) + '</div>' +
            '<div class="g-sku">' + esc(item.skuName) + '</div></div>' +
            '<div class="g-right"><div class="price">¥' + item.price + '</div>' +
            '<div class="g-qty">× ' + item.qty + '</div></div>' +
            '</div>'
          )
        })
        .join('') +
      '</section>' +

      '<section class="card row-card">' +
      '<label class="row-key" for="coupon">优惠券</label>' +
      '<select id="coupon" class="coupon-select" data-act="pick-coupon">' + options + '</select>' +
      '</section>' +

      '<section class="card row-card">' +
      '<label class="row-key" for="remark">订单备注</label>' +
      '<input id="remark" class="remark-input" placeholder="选填，如发货时间要求" maxlength="50" ' +
      'data-act="remark" value="' + esc(checkoutState.remark || '') + '">' +
      '</section>' +

      '<section class="card summary">' +
      '<div class="sum-row"><span>商品金额</span><span>¥' + money(goods) + '</span></div>' +
      '<div class="sum-row"><span>优惠减免</span><span class="discount">-¥' + money(discount) + '</span></div>' +
      '<div class="sum-row"><span>运费</span><span>包邮</span></div>' +
      '<div class="divider"></div>' +
      '<div class="sum-row"><span>应付金额</span>' +
      '<b class="price price-lg"><i class="rmb">¥</i>' + money(pay) + '</b></div>' +
      '</section>' +

      '<p class="notice">下单即表示同意《商城服务协议》。未发货订单支持原路退款，退款将退回原支付渠道。</p>' +
      '</main>' +

      '<div class="action-bar">' +
      '<div class="sum"><span>应付</span><b class="price price-lg"><i class="rmb">¥</i>' + money(pay) + '</b></div>' +
      '<button class="pay-btn" data-act="submit-order">提交订单</button>' +
      '</div>'
    )
  }

  function viewOrders(tab) {
    if (tab) orderTab = tab
    var tabs = [
      ['all', '全部'], ['unpaid', '待付款'], ['unshipped', '待发货'],
      ['shipped', '待收货'], ['done', '已完成']
    ]
    var orders = Order.all().filter(function (o) {
      return orderTab === 'all' ? true : o.status === orderTab
    })

    var body = orders.length
      ? orders
          .map(function (o) {
            var totalQty = o.items.reduce(function (s, i) { return s + i.qty }, 0)
            var actions = ''
            if (o.status === 'unpaid') {
              actions =
                '<button class="act ghost" data-act="order-cancel" data-no="' + o.orderNo + '">取消订单</button>' +
                '<button class="act primary" data-act="order-pay" data-no="' + o.orderNo + '">去支付</button>'
            } else if (o.status === 'unshipped') {
              actions = '<button class="act ghost" data-act="order-remind" data-no="' + o.orderNo + '">提醒发货</button>'
            } else if (o.status === 'shipped') {
              actions = '<button class="act primary" data-act="order-confirm" data-no="' + o.orderNo + '">确认收货</button>'
            } else {
              actions = '<button class="act ghost" data-act="order-delete" data-no="' + o.orderNo + '">删除订单</button>'
            }

            return (
              '<article class="order">' +
              '<header class="o-head"><span class="o-no">' + o.orderNo + '</span>' +
              '<span class="o-status s-' + o.status + '">' + (STATUS_TEXT[o.status] || o.status) + '</span></header>' +
              o.items
                .map(function (g) {
                  return (
                    '<div class="o-goods">' +
                    '<div class="g-thumb" style="background:' + g.bg + '">' + g.emoji + '</div>' +
                    '<div class="g-info"><div class="g-name">' + esc(g.name) + '</div>' +
                    '<div class="g-sku">' + esc(g.skuName) + '</div></div>' +
                    '<div class="g-right"><div>¥' + g.price + '</div><div class="g-qty">× ' + g.qty + '</div></div>' +
                    '</div>'
                  )
                })
                .join('') +
              '<div class="o-meta">' + o.createTime + (o.couponName ? ' · ' + esc(o.couponName) : '') + '</div>' +
              '<footer class="o-foot">' +
              '<div class="o-amount">共 ' + totalQty + ' 件 实付 <b class="price">¥' + o.payTotal + '</b></div>' +
              '<div class="o-actions">' + actions + '</div>' +
              '</footer></article>'
            )
          })
          .join('')
      : emptyState('📋', '暂无相关订单')

    return (
      navBar('我的订单') +
      '<div class="tabs">' +
      tabs
        .map(function (t) {
          return '<button class="tab' + (orderTab === t[0] ? ' on' : '') + '" data-act="order-tab" data-tab="' + t[0] + '">' + t[1] + '</button>'
        })
        .join('') +
      '</div>' +
      '<main class="page">' +
      (orders.length ? '<div class="list">' + body + '</div>' : body) +
      '</main>'
    )
  }

  function viewCoupons() {
    var g = Coupon.grouped()
    var list = g[couponTab] || []
    var tabs = [['usable', '可使用'], ['used', '已使用'], ['expired', '已过期']]

    var body = list.length
      ? list
          .map(function (c) {
            var timeText =
              couponTab === 'usable'
                ? '有效期至 ' + dateText(c.expireAt)
                : couponTab === 'used'
                  ? '已于 ' + dateText(c.usedAt || c.expireAt) + ' 使用'
                  : '已于 ' + dateText(c.expireAt) + ' 过期'
            var tail =
              couponTab === 'usable'
                ? '<a class="c-btn" href="#/home">去使用</a>'
                : '<span class="c-stamp">' + (couponTab === 'used' ? '已使用' : '已过期') + '</span>'

            return (
              '<article class="coupon' + (couponTab !== 'usable' ? ' dim' : '') + '">' +
              '<div class="left"><div class="amount"><i>¥</i>' + c.amount + '</div>' +
              '<div class="threshold">满 ' + c.threshold + ' 元可用</div></div>' +
              '<div class="right"><div class="c-name">' + esc(c.name) + '</div>' +
              '<div class="c-time">' + timeText + '</div>' + tail + '</div></article>'
            )
          })
          .join('')
      : emptyState('🎫', '暂无优惠券')

    return (
      navBar('我的优惠券') +
      '<div class="tabs">' +
      tabs
        .map(function (t) {
          return '<button class="tab' + (couponTab === t[0] ? ' on' : '') + '" data-act="coupon-tab" data-tab="' + t[0] + '">' + t[1] + '</button>'
        })
        .join('') +
      '</div>' +
      '<main class="page">' +
      '<div class="list">' + body + '</div>' +
      '<section class="rule"><h4>使用说明</h4>' +
      '<p>1. 每笔订单限用一张优惠券，不与其他券叠加。</p>' +
      '<p>2. 优惠券不可兑换现金，退款时按实付金额原路退回。</p>' +
      '<p>3. 优惠券到期后自动失效，请在有效期内使用。</p>' +
      '</section>' +
      '</main>'
    )
  }

  function viewAddress() {
    var a = LS.get(K.address, null) || { name: '', phone: '', detail: '' }
    return (
      navBar('收货地址') +
      '<main class="page">' +
      '<section class="card form">' +
      '<div class="field"><label>收货人</label>' +
      '<input id="f-name" data-field="name" placeholder="请输入姓名" maxlength="20" value="' + esc(a.name) + '"></div>' +
      '<div class="field"><label>手机号</label>' +
      '<input id="f-phone" data-field="phone" type="tel" placeholder="请输入 11 位手机号" maxlength="11" value="' + esc(a.phone) + '"></div>' +
      '<div class="field area"><label>详细地址</label>' +
      '<textarea id="f-detail" data-field="detail" placeholder="省 / 市 / 区 / 街道 / 门牌号" maxlength="80">' + esc(a.detail) + '</textarea></div>' +
      '</section>' +
      '<button class="link-btn" data-act="fill-demo">一键填充演示地址</button>' +
      '<button class="save-btn" data-act="save-address">保存地址</button>' +
      '<p class="notice">我们仅将地址用于订单配送，不会用于其他用途。</p>' +
      '</main>'
    )
  }

  function viewMine() {
    var orders = Order.all()
    var counts = { unpaid: 0, unshipped: 0, shipped: 0, done: 0 }
    orders.forEach(function (o) {
      if (counts[o.status] != null) counts[o.status] += 1
    })
    var couponCount = Coupon.available(Number.MAX_SAFE_INTEGER).length

    var grid = [
      ['1', '💳', '待付款', counts.unpaid],
      ['2', '📦', '待发货', counts.unshipped],
      ['3', '🚚', '待收货', counts.shipped],
      ['4', '✅', '已完成', counts.done]
    ]
      .map(function (g) {
        return (
          '<a class="order-item" href="#/orders/' + g[0] + '">' +
          '<span class="oi-ico">' + g[1] + '</span><span class="oi-label">' + g[2] + '</span>' +
          (g[3] ? '<b class="badge">' + g[3] + '</b>' : '') +
          '</a>'
        )
      })
      .join('')

    return (
      '<main class="page mine-page">' +
      '<header class="profile">' +
      '<div class="avatar">🙂</div>' +
      '<div class="user"><div class="nick">微信用户</div>' +
      '<div class="uid">会员编号 M' + (orders.length + 1000) + '</div></div>' +
      '<a class="coupon-chip" href="#/coupons"><b>' + couponCount + '</b> 张券 ›</a>' +
      '</header>' +

      '<section class="card">' +
      '<div class="card-head"><h3>我的订单</h3><a href="#/orders">全部订单 ›</a></div>' +
      '<div class="order-grid">' + grid + '</div>' +
      '</section>' +

      '<section class="card cells">' +
      '<a class="cell" href="#/coupons"><span>🎫</span><b>我的优惠券</b><i>' + couponCount + ' 张可用</i><u>›</u></a>' +
      '<a class="cell" href="#/address"><span>📍</span><b>收货地址</b><i></i><u>›</u></a>' +
      '<button class="cell" data-act="service"><span>💬</span><b>联系客服</b><i>9:00 - 21:00</i><u>›</u></button>' +
      '<button class="cell" data-act="about"><span>ℹ️</span><b>关于本商城</b><i>v1.0.0</i><u>›</u></button>' +
      '<button class="cell" data-act="reset"><span>🧹</span><b>清除演示数据</b><i></i><u>›</u></button>' +
      '</section>' +

      '<p class="footer-tip">本页面为 H5 演示版，支付与发货均为模拟流程</p>' +
      '</main>'
    )
  }

  function navBar(title, withBack) {
    return (
      '<header class="nav">' +
      (withBack === false
        ? '<span class="nav-side"></span>'
        : '<button class="nav-back" data-act="back">‹</button>') +
      '<h1>' + esc(title) + '</h1>' +
      '<span class="nav-side"></span>' +
      '</header>'
    )
  }

  function emptyState(icon, text) {
    return (
      '<div class="empty"><span class="empty-ico">' + icon + '</span>' +
      '<p>' + esc(text) + '</p></div>'
    )
  }

  /* ================= 路由 ================= */

  function parseHash() {
    var h = (location.hash || '#/home').replace(/^#\/?/, '')
    var parts = h.split('/')
    return { name: parts[0] || 'home', args: parts.slice(1) }
  }

  var TAB_OF_STATUS = { '1': 'unpaid', '2': 'unshipped', '3': 'shipped', '4': 'done' }

  function render() {
    var r = parseHash()
    var app = document.getElementById('app')
    var html = ''

    currentTab = r.name

    if (r.name === 'home') {
      html = viewHome()
    } else if (r.name === 'detail') {
      html = viewDetail(r.args[0])
    } else if (r.name === 'cart') {
      html = viewCart()
    } else if (r.name === 'checkout') {
      // 刷新页面后从本地恢复结算单，避免直接显示空
      if (!checkoutState) {
        var saved = LS.get(K.checkout, null)
        if (saved && saved.length) {
          checkoutState = { items: saved, couponId: null, touched: false, remark: '' }
        }
      }
      html = viewCheckout()
    } else if (r.name === 'orders') {
      html = viewOrders(TAB_OF_STATUS[r.args[0]] || 'all')
    } else if (r.name === 'coupons') {
      html = viewCoupons()
    } else if (r.name === 'address') {
      html = viewAddress()
    } else if (r.name === 'mine') {
      html = viewMine()
    } else {
      html = viewHome()
    }

    app.innerHTML = html
    refreshTabbar()
    window.scrollTo(0, 0)
  }

  function refreshTabbar() {
    var el = document.getElementById('tabbar')
    if (!el) return
    var show = ['home', 'cart', 'mine'].indexOf(currentTab) !== -1
    el.classList.toggle('hidden', !show)
    document.body.classList.toggle('has-tabbar', show)

    var count = Cart.count()
    var tabs = [
      { id: 'home', icon: '🏠', label: '首页', href: '#/home' },
      { id: 'cart', icon: '🛒', label: '购物车', href: '#/cart', badge: count },
      { id: 'mine', icon: '👤', label: '我的', href: '#/mine' }
    ]

    el.innerHTML = tabs
      .map(function (t) {
        return (
          '<a class="tab' + (t.id === currentTab ? ' on' : '') + '" href="' + t.href + '">' +
          '<span class="tab-ico">' + t.icon +
          (t.badge ? '<b class="badge">' + (t.badge > 99 ? '99+' : t.badge) + '</b>' : '') +
          '</span><span>' + t.label + '</span></a>'
        )
      })
      .join('')
  }

  /* ================= 交互 ================= */

  function findProduct(id) {
    for (var i = 0; i < DATA.products.length; i++) {
      if (DATA.products[i].id === id) return DATA.products[i]
    }
    return null
  }

  function submitOrder() {
    if (!checkoutState || !checkoutState.items.length) return
    var address = LS.get(K.address, null)
    if (!address) {
      toast('请先填写收货地址')
      location.hash = '#/address'
      return
    }

    var items = checkoutState.items
    var goods = items.reduce(function (s, i) { return s + i.price * i.qty }, 0)
    var usable = Coupon.available(goods)
    var coupon = null
    for (var i = 0; i < usable.length; i++) {
      if (usable[i].id === checkoutState.couponId) coupon = usable[i]
    }
    var discount = coupon ? coupon.amount : 0
    var pay = Math.max(0, goods - discount)

    var paid = window.confirm('模拟微信支付\n\n应付金额 ¥' + money(pay) + '\n\n确定 = 支付成功　取消 = 生成待付款订单')

    var order = {
      orderNo: orderNo(),
      createTime: nowText(),
      status: paid ? 'unshipped' : 'unpaid',
      items: items.map(function (i) {
        return {
          key: i.key, id: i.id, name: i.name, skuName: i.skuName,
          price: i.price, qty: i.qty, emoji: i.emoji, bg: i.bg
        }
      }),
      goodsTotal: money(goods),
      discount: money(discount),
      payTotal: money(pay),
      couponName: coupon ? coupon.name : '',
      address: address,
      remark: checkoutState.remark || ''
    }

    Order.add(order)
    if (coupon && paid) Coupon.markUsed(coupon.id)
    Cart.removeByKeys(items.map(function (i) { return i.key }))
    LS.del(K.checkout)
    checkoutState = null

    toast(paid ? '支付成功' : '订单已生成，待支付')
    location.hash = '#/orders/' + (paid ? 'unshipped' : 'unpaid')
  }

  function saveAddress() {
    var name = (document.getElementById('f-name') || {}).value || ''
    var phone = (document.getElementById('f-phone') || {}).value || ''
    var detail = (document.getElementById('f-detail') || {}).value || ''

    name = name.trim()
    phone = phone.trim()
    detail = detail.trim()

    if (!name) return toast('请填写收货人')
    if (!/^1[3-9]\d{9}$/.test(phone)) return toast('手机号格式不正确')
    if (detail.length < 5) return toast('详细地址太短')

    LS.set(K.address, { name: name, phone: phone, detail: detail })
    toast('已保存')
    setTimeout(function () {
      history.back()
    }, 500)
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]')
    if (!el) return
    var act = el.getAttribute('data-act')
    var idx = Number(el.getAttribute('data-index'))

    if (act === 'back') {
      if (history.length > 1) history.back()
      else location.hash = '#/home'
      return
    }
    if (act === 'search') return toast('搜索功能待接入后端')
    if (act === 'service') return toast('客服功能待接入')
    if (act === 'about') {
      window.alert('优选商城 · H5 演示版\n\n微信原生小程序 + 本地 Mock 数据\n支付为模拟流程，接入商户号后可替换为真实支付')
      return
    }
    if (act === 'open-detail') {
      location.hash = '#/detail/' + el.getAttribute('data-id')
      return
    }
    if (act === 'open-coupons') {
      location.hash = '#/coupons'
      return
    }
    if (act === 'go-cart') {
      location.hash = '#/cart'
      return
    }

    /* 详情页 */
    if (act === 'pick-sku') {
      detailState.skuIndex = idx
      return render()
    }
    if (act === 'qty-inc' || act === 'qty-dec') {
      var p = findProduct(detailState.id)
      if (!p) return
      var max = p.skus[detailState.skuIndex].stock
      if (act === 'qty-inc') {
        if (detailState.qty >= max) return toast('已达库存上限')
        detailState.qty += 1
      } else if (detailState.qty > 1) {
        detailState.qty -= 1
      }
      return render()
    }
    if (act === 'add-cart' || act === 'buy-now') {
      var prod = findProduct(detailState.id)
      if (!prod) return
      var sku = prod.skus[detailState.skuIndex]
      if (act === 'add-cart') {
        Cart.add(prod, sku, detailState.qty)
        return toast('已加入购物车')
      }
      var item = Cart.build(prod, sku, detailState.qty)
      item.key = 'buynow_' + Date.now()
      checkoutState = { items: [item], couponId: null, touched: false, remark: '' }
      LS.set(K.checkout, [item])
      return (location.hash = '#/checkout')
    }

    /* 购物车 */
    var list = Cart.all()
    if (act === 'cart-toggle') {
      list[idx].checked = !list[idx].checked
      Cart.save(list)
      return render()
    }
    if (act === 'cart-all') {
      var allOn = list.every(function (i) { return i.checked })
      list.forEach(function (i) { i.checked = !allOn })
      Cart.save(list)
      return render()
    }
    if (act === 'cart-inc') {
      list[idx].qty += 1
      Cart.save(list)
      return render()
    }
    if (act === 'cart-dec') {
      if (list[idx].qty > 1) list[idx].qty -= 1
      Cart.save(list)
      return render()
    }
    if (act === 'cart-remove') {
      if (!window.confirm('确定将「' + list[idx].name + '」移出购物车？')) return
      list.splice(idx, 1)
      Cart.save(list)
      return render()
    }
    if (act === 'checkout') {
      var picked = Cart.all().filter(function (i) { return i.checked })
      if (!picked.length) return toast('请选择要结算的商品')
      checkoutState = { items: picked, couponId: null, touched: false, remark: '' }
      LS.set(K.checkout, picked)
      location.hash = '#/checkout'
      return
    }

    /* 订单 */
    if (act === 'order-tab') {
      orderTab = el.getAttribute('data-tab')
      return render()
    }
    if (act === 'order-pay') {
      var no = el.getAttribute('data-no')
      if (!window.confirm('模拟微信支付，确认支付该订单？')) return
      Order.patch(no, { status: 'unshipped' })
      toast('支付成功')
      return render()
    }
    if (act === 'order-cancel') {
      if (!window.confirm('确定取消该订单？')) return
      Order.patch(el.getAttribute('data-no'), { status: 'closed' })
      toast('订单已取消')
      return render()
    }
    if (act === 'order-remind') return toast('已提醒商家发货')
    if (act === 'order-confirm') {
      if (!window.confirm('请确认已收到商品')) return
      Order.patch(el.getAttribute('data-no'), { status: 'done' })
      toast('交易完成')
      return render()
    }
    if (act === 'order-delete') {
      if (!window.confirm('删除后不可恢复，确定删除？')) return
      Order.remove(el.getAttribute('data-no'))
      return render()
    }

    /* 优惠券 */
    if (act === 'coupon-tab') {
      couponTab = el.getAttribute('data-tab')
      return render()
    }

    /* 地址 */
    if (act === 'fill-demo') {
      document.getElementById('f-name').value = '张三'
      document.getElementById('f-phone').value = '13800138000'
      document.getElementById('f-detail').value = '广东省深圳市南山区科技园南路 8 号 A 座 1201'
      return
    }
    if (act === 'save-address') return saveAddress()

    /* 结算 */
    if (act === 'submit-order') return submitOrder()

    /* 我的 */
    if (act === 'reset') {
      if (!window.confirm('将清空购物车、订单、优惠券和地址，确定？')) return
      ;[K.cart, K.coupons, K.orders, K.address, K.checkout].forEach(LS.del)
      Coupon.ensure()
      toast('已重置')
      return render()
    }
  })

  document.addEventListener('change', function (e) {
    var el = e.target
    if (!el || el.getAttribute('data-act') !== 'pick-coupon') return
    checkoutState.couponId = el.value || null
    checkoutState.touched = true
    render()
  })

  document.addEventListener('input', function (e) {
    var el = e.target
    if (!el) return
    if (el.getAttribute('data-act') === 'remark' && checkoutState) {
      checkoutState.remark = el.value
    }
  })

  /* ================= 启动 ================= */

  function boot() {
    Coupon.ensure()

    window.addEventListener('hashchange', render)
    if (!location.hash) location.hash = '#/home'
    render()
  }

  boot()
})()
