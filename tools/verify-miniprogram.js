const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const root = process.argv[2]
const errors = []
const stats = { js: 0, json: 0, wxml: 0, wxss: 0 }

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules') continue
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full)
    else check(full)
  }
}

const SELF_CLOSING = new Set(['input', 'image', 'icon', 'import', 'include', 'wxs', 'switch', 'checkbox', 'radio', 'slider'])
const VOID_OK = new Set(['input', 'image', 'icon', 'wxs', 'switch', 'checkbox', 'radio', 'slider'])

function checkWxml(file, code) {
  const stack = []
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
  let m
  while ((m = re.exec(code))) {
    const closing = m[1] === '/'
    const tag = m[2]
    const selfClose = m[4] === '/'
    if (tag === '!--') continue
    if (closing) {
      const top = stack.pop()
      if (top !== tag) {
        errors.push(`${file}: 闭合不匹配 </${tag}>，期望 </${top}>`)
        return
      }
    } else if (!selfClose && !SELF_CLOSING.has(tag)) {
      stack.push(tag)
    }
  }
  if (stack.length) errors.push(`${file}: 未闭合标签 ${stack.join(',')}`)
}

function check(file) {
  const ext = path.extname(file)
  if (!['.js', '.json', '.wxml', '.wxss'].includes(ext)) return
  stats[ext.slice(1)]++
  const code = fs.readFileSync(file, 'utf8')

  if (ext === '.json') {
    try {
      JSON.parse(code)
    } catch (e) {
      errors.push(`${file}: JSON 解析失败 - ${e.message}`)
    }
  } else if (ext === '.js') {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
    } catch (e) {
      errors.push(`${file}: JS 语法错误 - ${String(e.stderr || e.message).split('\n').slice(0, 3).join(' ')}`)
    }
  } else if (ext === '.wxml') {
    checkWxml(file, code)
  } else if (ext === '.wxss') {
    const open = (code.match(/{/g) || []).length
    const close = (code.match(/}/g) || []).length
    if (open !== close) errors.push(`${file}: 大括号不匹配 {${open} vs }${close}`)
  }
}

walk(root)

console.log('检查统计:', JSON.stringify(stats))
if (errors.length) {
  console.log('\n发现问题 ' + errors.length + ' 个:')
  errors.forEach((e) => console.log(' - ' + e))
  process.exit(1)
} else {
  console.log('\n全部通过：JSON 可解析、JS 语法正确、WXML 标签闭合、WXSS 括号平衡')
}
