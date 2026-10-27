/** 极简静态服务器：node tools/serve.js [port] [dir] */
const http = require('http')
const fs = require('fs')
const path = require('path')

const port = Number(process.argv[2] || 4173)
const root = path.resolve(process.argv[3] || path.join(__dirname, '..'))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
}

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0])
    if (urlPath === '/') urlPath = '/web/index.html'
    if (urlPath === '/web') urlPath = '/web/index.html'

    const file = path.join(root, urlPath)
    if (!file.startsWith(root)) {
      res.writeHead(403)
      return res.end('403')
    }

    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        return res.end('404 ' + urlPath)
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
      res.end(buf)
    })
  })
  .listen(port, () => console.log('serving ' + root + ' at http://localhost:' + port))
