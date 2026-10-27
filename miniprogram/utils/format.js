/** 通用格式化工具 */

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

/** 2026-10-27 18:59 */
function datetime(ts) {
  const d = new Date(ts)
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  )
}

/** 金额：129 -> "129.00" */
function money(n) {
  const num = Number(n) || 0
  return num.toFixed(2)
}

/** 订单号 */
function orderNo() {
  const d = new Date()
  return (
    'M' +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds()) +
    Math.floor(Math.random() * 900 + 100)
  )
}

module.exports = { datetime, money, orderNo }
