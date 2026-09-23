// 底部 tabBar 图标结构测试
// 只做「结构性」校验：pages.json 里声明的图标路径必须存在、是有效 PNG、正方形、尺寸合理、不是全透明空白。
// 注意：仓库里的高亮态图标本来就是「半透明填充 / 实心块」的设计风格，属于设计如此，
// 因此这里**不**校验图形占比上限、alpha 取值、颜色值（那几条只在重画版本下成立）。
import assert from 'node:assert/strict'
import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

// ---- 极简 PNG 解码（只支持 8bit 灰度/RGB/RGBA，足够图标用）----
function decodePng(file) {
	const data = fs.readFileSync(file)
	assert.deepEqual(Array.from(data.slice(0, 8)), [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${file} 不是 PNG`)
	let pos = 8
	let ihdr = null
	let idat = Buffer.alloc(0)
	while (pos < data.length) {
		const len = data.readUInt32BE(pos)
		const type = data.slice(pos + 4, pos + 8).toString('ascii')
		const body = data.slice(pos + 8, pos + 8 + len)
		if (type === 'IHDR') {
			ihdr = {
				width: body.readUInt32BE(0),
				height: body.readUInt32BE(4),
				bitDepth: body[8],
				colorType: body[9],
				interlace: body[12]
			}
		} else if (type === 'IDAT') {
			idat = Buffer.concat([idat, body])
		}
		pos += 12 + len
	}
	assert.equal(ihdr.interlace, 0, `${file} 不支持隔行扫描`)
	const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.colorType]
	assert.ok(channels, `${file} 颜色类型不支持: ${ihdr.colorType}`)
	const raw = zlib.inflateSync(idat)
	const stride = ihdr.width * channels
	const pixels = []
	let prev = Buffer.alloc(stride)
	let p = 0
	for (let y = 0; y < ihdr.height; y += 1) {
		const filter = raw[p]
		p += 1
		const line = Buffer.from(raw.slice(p, p + stride))
		p += stride
		for (let i = 0; i < stride; i += 1) {
			const a = i >= channels ? line[i - channels] : 0
			const b = prev[i]
			const c = i >= channels ? prev[i - channels] : 0
			let x = line[i]
			if (filter === 1) x = (x + a) & 255
			else if (filter === 2) x = (x + b) & 255
			else if (filter === 3) x = (x + ((a + b) >> 1)) & 255
			else if (filter === 4) {
				const pp = a + b - c
				const pa = Math.abs(pp - a)
				const pb = Math.abs(pp - b)
				const pc = Math.abs(pp - c)
				x = (x + (pa <= pb && pa <= pc ? a : (pb <= pc ? b : c))) & 255
			}
			line[i] = x
		}
		pixels.push(line)
		prev = line
	}
	const stat = { width: ihdr.width, height: ihdr.height, channels, glyphPixels: 0, rs: 0, gs: 0, bs: 0, alphas: new Set() }
	for (const line of pixels) {
		for (let i = 0; i < line.length; i += channels) {
			const alpha = channels === 4 ? line[i + 3] : 255
			stat.alphas.add(alpha)
			if (alpha > 20) {
				stat.glyphPixels += 1
				stat.rs += line[i]
				stat.gs += line[i + 1]
				stat.bs += line[i + 2]
			}
		}
	}
	return stat
}

// ---- 读取 pages.json 的 tabBar 配置（pages.json 允许注释，需要按字符串感知地剥掉）----
function stripJsonComments(src) {
	let out = ''
	let inString = false
	let escaped = false
	let line = false
	let block = false
	for (let i = 0; i < src.length; i += 1) {
		const c = src[i]
		const n = src[i + 1]
		if (line) {
			if (c === '\n') {
				line = false
				out += c
			}
			continue
		}
		if (block) {
			if (c === '*' && n === '/') {
				block = false
				i += 1
			}
			continue
		}
		if (inString) {
			out += c
			if (escaped) escaped = false
			else if (c === '\\') escaped = true
			else if (c === '"') inString = false
			continue
		}
		if (c === '"') {
			inString = true
			out += c
			continue
		}
		if (c === '/' && n === '/') {
			line = true
			i += 1
			continue
		}
		if (c === '/' && n === '*') {
			block = true
			i += 1
			continue
		}
		out += c
	}
	return out
}

const pagesJson = stripJsonComments(fs.readFileSync(path.join(root, 'pages.json'), 'utf8'))
const tabBar = JSON.parse(pagesJson).tabBar
assert.equal(Array.isArray(tabBar.list), true)
assert.equal(tabBar.list.length, 4)

for (const item of tabBar.list) {
	for (const key of ['iconPath', 'selectedIconPath']) {
		const rel = item[key]
		assert.ok(rel, `${item.pagePath} 缺少 ${key}`)
		const file = path.join(root, rel)
		assert.equal(fs.existsSync(file), true, `${rel} 不存在`)
		const stat = decodePng(file)
		const label = `${rel}`
		// 尺寸：正方形且不小于 40px
		assert.equal(stat.width, stat.height, `${label} 不是正方形`)
		assert.ok(stat.width >= 40, `${label} 尺寸过小: ${stat.width}`)
		// 必须不是"空白图标"：至少要有 2% 的像素被画出来
		const total = stat.width * stat.height
		assert.ok(stat.glyphPixels > total * 0.02, `${label} 图形像素过少（近乎空白）: ${stat.glyphPixels}/${total}`)
	}
}

console.log('tabbarIcon tests passed')
