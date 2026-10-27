/**
 * 演示数据（本地 Mock）
 * 无图片依赖：所有商品图位用 emoji + 渐变底色渲染，开箱即跑。
 */

const products = [
  {
    id: 'p1',
    name: '无线蓝牙耳机 Pro',
    subtitle: '主动降噪 · 30 小时续航',
    emoji: '🎧',
    bg: 'linear-gradient(135deg,#6a8dff,#9b6bff)',
    price: 129,
    originPrice: 299,
    sales: 3821,
    stock: 128,
    tags: ['顺丰包邮', '7天无理由'],
    skus: [
      { name: '云母白', price: 129, stock: 60 },
      { name: '曜石黑', price: 129, stock: 68 }
    ]
  },
  {
    id: 'p2',
    name: '20000mAh 快充充电宝',
    subtitle: '22.5W 双向快充 · 可上飞机',
    emoji: '🔋',
    bg: 'linear-gradient(135deg,#43e97b,#38f9d7)',
    price: 99,
    originPrice: 199,
    sales: 5137,
    stock: 240,
    tags: ['3C 认证', '一年换新'],
    skus: [
      { name: '标准版', price: 99, stock: 160 },
      { name: '带线版', price: 119, stock: 80 }
    ]
  },
  {
    id: 'p3',
    name: '声波电动牙刷',
    subtitle: '5 档模式 · 90 天长续航',
    emoji: '🪥',
    bg: 'linear-gradient(135deg,#f6d365,#fda085)',
    price: 119,
    originPrice: 259,
    sales: 2210,
    stock: 96,
    tags: ['赠 4 支刷头', '7天无理由'],
    skus: [
      { name: '薄荷绿', price: 119, stock: 48 },
      { name: '樱花粉', price: 119, stock: 48 }
    ]
  },
  {
    id: 'p4',
    name: '智能运动手环',
    subtitle: '心率血氧 · 14 天续航',
    emoji: '⌚',
    bg: 'linear-gradient(135deg,#4facfe,#00f2fe)',
    price: 159,
    originPrice: 399,
    sales: 1688,
    stock: 72,
    tags: ['IP68 防水', '顺丰包邮'],
    skus: [
      { name: '黑色', price: 159, stock: 40 },
      { name: '银色', price: 159, stock: 32 }
    ]
  },
  {
    id: 'p5',
    name: '便携榨汁杯',
    subtitle: '350ml · 无线便携',
    emoji: '🥤',
    bg: 'linear-gradient(135deg,#ff9a9e,#fecfef)',
    price: 89,
    originPrice: 179,
    sales: 903,
    stock: 150,
    tags: ['一键清洗', '食品级材质'],
    skus: [
      { name: '奶油白', price: 89, stock: 90 },
      { name: '雾霾蓝', price: 89, stock: 60 }
    ]
  },
  {
    id: 'p6',
    name: '桌面涡轮风扇',
    subtitle: '静音大风量 · 三档调速',
    emoji: '🌀',
    bg: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
    price: 59,
    originPrice: 129,
    sales: 4410,
    stock: 300,
    tags: ['静音', 'USB 供电'],
    skus: [{ name: '标准版', price: 59, stock: 300 }]
  },
  {
    id: 'p7',
    name: '316 不锈钢保温杯',
    subtitle: '500ml · 12 小时保温',
    emoji: '☕',
    bg: 'linear-gradient(135deg,#d4fc79,#96e6a1)',
    price: 69,
    originPrice: 149,
    sales: 2765,
    stock: 210,
    tags: ['316 内胆', '不漏水'],
    skus: [
      { name: '燕麦色', price: 69, stock: 110 },
      { name: '墨绿色', price: 69, stock: 100 }
    ]
  },
  {
    id: 'p8',
    name: '快充数据线套装',
    subtitle: 'Type-C / Lightning / Micro',
    emoji: '🔌',
    bg: 'linear-gradient(135deg,#ffecd2,#fcb69f)',
    price: 39,
    originPrice: 89,
    sales: 6203,
    stock: 500,
    tags: ['3 合 1', '2 米加长'],
    skus: [{ name: '三合一', price: 39, stock: 500 }]
  }
]

const banners = [
  {
    id: 'b1',
    title: '新人专享',
    sub: '满 199 减 100 · 注册即领',
    btn: '立即领取',
    bg: 'linear-gradient(135deg,#ff7a45,#ff4d4f)'
  },
  {
    id: 'b2',
    title: '数码优选',
    sub: '蓝牙耳机 低至 129 元',
    btn: '去看看',
    bg: 'linear-gradient(135deg,#36cfc9,#1890ff)'
  },
  {
    id: 'b3',
    title: '品质生活',
    sub: '电动牙刷 · 保温杯 专场',
    btn: '去看看',
    bg: 'linear-gradient(135deg,#9254de,#f759ab)'
  }
]

/** 优惠券模板（发放时会写入用户的券包） */
const coupons = [
  {
    id: 'c1',
    name: '新人专享券',
    amount: 20,
    threshold: 99,
    hours: 168,
    desc: '新用户注册即领，全场通用'
  },
  {
    id: 'c2',
    name: '限时大额券',
    amount: 100,
    threshold: 199,
    hours: 24,
    desc: '领取后 24 小时内有效'
  },
  {
    id: 'c3',
    name: '满减券',
    amount: 50,
    threshold: 299,
    hours: 72,
    desc: '单笔订单满 299 元可用'
  }
]

module.exports = { products, banners, coupons }
