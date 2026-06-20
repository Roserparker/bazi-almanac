// 把命理库从 node_modules 复制到 vendor/（本地化，运行成品不依赖 npm / CDN）。
// 运行：npm run vendor
import { copyFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'node_modules/lunar-javascript/lunar.js')
const dst = resolve(root, 'vendor/lunar.js')

mkdirSync(dirname(dst), { recursive: true })
copyFileSync(src, dst)
const kb = (statSync(dst).size / 1024).toFixed(0)
console.log(`vendored lunar.js (${kb} KB) → ${dst}`)
