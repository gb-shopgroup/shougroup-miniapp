import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
	computeCoverCrop,
	drawShareCard,
	formatSharePrice,
	formatShareSales,
	getShareCardLayout,
	loadCanvasImage,
	renderShareCard,
	SHARE_CARD_HEIGHT,
	SHARE_CARD_WIDTH,
	wrapCardText
} from '../utils/shareCard.js'

// ===== 价格文案：整数不补小数，小数去掉多余的 0 =====
assert.equal(formatSharePrice(10), '10')
assert.equal(formatSharePrice('4.5'), '4.5')
assert.equal(formatSharePrice(4.5), '4.5')
assert.equal(formatSharePrice(0.4), '0.4')
assert.equal(formatSharePrice(4.0), '4')
assert.equal(formatSharePrice(0), '')
assert.equal(formatSharePrice(''), '')
assert.equal(formatSharePrice(null), '')
assert.equal(formatSharePrice(undefined), '')
assert.equal(formatSharePrice('abc'), '')

// ===== 销量文案：0 单不展示 =====
assert.equal(formatShareSales(3), '已售3单')
assert.equal(formatShareSales('12'), '已售12单')
assert.equal(formatShareSales(0), '')
assert.equal(formatShareSales(''), '')
assert.equal(formatShareSales(undefined), '')

// ===== 居中裁剪：宽图裁中间，不拉伸 =====
assert.deepEqual(computeCoverCrop(800, 400, 250, 400), { sx: 275, sy: 0, sw: 250, sh: 400 })
assert.deepEqual(computeCoverCrop(400, 800, 250, 400), { sx: 0, sy: 80, sw: 400, sh: 640 })
// 比例刚好一致时不裁剪
assert.deepEqual(computeCoverCrop(500, 800, 250, 400), { sx: 0, sy: 0, sw: 500, sh: 800 })
// 异常尺寸不抛错
assert.deepEqual(computeCoverCrop(0, 0, 250, 400), { sx: 0, sy: 0, sw: 1, sh: 1 })

// ===== 文本折行 =====
const measure = text => String(text).length * 10
assert.deepEqual(wrapCardText('望京大玉米', 100, measure), ['望京大玉米'])
assert.deepEqual(wrapCardText('望京大玉米超长商品名称测试文案', 100, measure, 2), ['望京大玉米超长商品名', '称测试文案'])
// 超出最大行数时末行截断加省略号
assert.deepEqual(wrapCardText('望京大玉米超长商品名称测试文案', 100, measure, 1), ['望京大玉米超长商品…'])
assert.deepEqual(wrapCardText('', 100, measure), [])
// 没有 measureText 时按字数估算，不抛错
assert.equal(wrapCardText('测试文本', 30).length >= 1, true)

// ===== 画布尺寸：微信转发卡片是 5:4 =====
assert.equal(SHARE_CARD_WIDTH / SHARE_CARD_HEIGHT, 1.25)

// ===== 绘制调用：商品名/价格/已售都画到画布上 =====
const calls = []
const ctx = new Proxy({}, {
	get(target, key) {
		if (key === 'measureText') return text => ({ width: String(text).length * 13 })
		return (...args) => { calls.push([key, ...args]) }
	},
	set(target, key, value) {
		calls.push(['set', key, value])
		return true
	}
})
drawShareCard(ctx, {
	name: '最新测试商品1',
	price: 10,
	soldText: formatShareSales(3),
	imagePath: '/tmp/goods.jpg',
	imageWidth: 800,
	imageHeight: 400
})
const texts = calls.filter(item => item[0] === 'fillText').map(item => item[1])
assert.ok(texts.includes('最新测试商品1'), '商品名要画到标题栏')
assert.ok(texts.includes('¥'), '价格要画到封面上')
assert.ok(texts.includes('10'), '价格数字要画到封面上')
assert.ok(texts.includes('已售3单'), '已售单数要画到标题栏右侧')
assert.ok(texts.includes('立即跟团'), '要有跟团按钮文案')
// 「点击查看商品」提示已去掉，卡片更干净
assert.equal(texts.includes('点击查看商品'), false)

// 版式：绿色外框 + 标题栏 + 左图右信息，且不含二维码区域
const layout = getShareCardLayout()
assert.equal(layout.frame, 12)
assert.equal(layout.header, 56)
assert.deepEqual(layout.image, { x: 28, y: 84, size: 288 })
assert.deepEqual(layout.info, { x: 332, y: 84, width: 140, height: 288 })
// 画布 5:4；白底 + 四边外框 + 标题栏 + 按钮，至少 7 次填充
assert.ok(calls.filter(item => item[0] === 'fillRect').length >= 7, '外框/标题栏/按钮都要填充')
// 先铺白底
const firstFill = calls.find(item => item[0] === 'fillRect')
assert.deepEqual(firstFill.slice(1), [0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT])

// 商品图：居中裁剪后铺满左侧方形区域
const drawImageCall = calls.find(item => item[0] === 'drawImage')
assert.deepEqual(drawImageCall.slice(1), ['/tmp/goods.jpg', 200, 0, 400, 400, 28, 84, 288, 288])

// 没有商品图时用浅灰占位，只画文字，不抛错
calls.length = 0
drawShareCard(ctx, { name: '无图商品', price: 0, soldText: '' })
assert.equal(calls.some(item => item[0] === 'drawImage'), false)
assert.ok(calls.some(item => item[0] === 'fillRect'))
const noImageTexts = calls.filter(item => item[0] === 'fillText').map(item => item[1])
assert.ok(noImageTexts.includes('无图商品'))
assert.equal(noImageTexts.includes('¥'), false)

// ===== 详情页接线：打开分享面板就预生成封面，转发卡片用这张图 =====
const detailSource = fs.readFileSync(new URL('../pagesA/group/detail.vue', import.meta.url), 'utf8')
// type=2d 同层渲染画布：可以真正隐藏，不会再出现“绿色海报盖住页面”
assert.match(detailSource, /<canvas type="2d" id="goodsShareCanvas"/)
assert.match(detailSource, /this\.prepareGoodsShareCover\(goods\)/)
assert.match(detailSource, /select\('#goodsShareCanvas'\)[\s\S]*?fields\(\{ node: true, size: true \}\)/)
assert.match(detailSource, /await renderShareCard\(canvas, \{/)
assert.match(detailSource, /uni\.canvasToTempFilePath\(\{[\s\S]*?canvas,/)
assert.match(detailSource, /imageUrl: cover \|\| this\.shareCover\(img\)/)
assert.match(detailSource, /getGoodsShareCover\(datasetGoodsId\)/)
// 样式只占 1px 且透明：即使透明度不生效也不会挡住页面
assert.match(detailSource, /\.goods-share-canvas \{[\s\S]*?width: 1px;[\s\S]*?opacity: 0;/)

// ===== 2d 画布渲染：设置 dpr 尺寸、按 dpr 缩放、图片加载失败也能出图 =====
const drawn = []
const fakeCtx = {
	setTransform: (...args) => drawn.push(['setTransform', ...args]),
	measureText: text => ({ width: String(text).length * 13 }),
	fillRect: (...args) => drawn.push(['fillRect', ...args]),
	fillText: (...args) => drawn.push(['fillText', ...args]),
	drawImage: (...args) => drawn.push(['drawImage', ...args])
}
const fakeCanvas = {
	width: 0,
	height: 0,
	getContext: () => fakeCtx,
	createImage: () => ({ set src(value) { this._src = value; setTimeout(() => this.onload && this.onload(), 0) } })
}
const rendered = await renderShareCard(fakeCanvas, {
	pixelRatio: 3,
	name: '红薯',
	price: 5,
	soldText: '已售3单',
	imagePath: '/tmp/goods.jpg',
	imageWidth: 800,
	imageHeight: 400
})
assert.equal(rendered, true)
assert.equal(fakeCanvas.width, SHARE_CARD_WIDTH * 3)
assert.equal(fakeCanvas.height, SHARE_CARD_HEIGHT * 3)
assert.deepEqual(drawn.find(item => item[0] === 'setTransform'), ['setTransform', 3, 0, 0, 3, 0, 0])
assert.ok(drawn.some(item => item[0] === 'drawImage'), '图片加载成功后要画到画布上')
assert.ok(drawn.filter(item => item[0] === 'fillText').map(item => item[1]).includes('红薯'))

// 拿不到画布节点 / 图片加载失败时不能抛错
assert.equal(await renderShareCard(null, { name: 'x' }), false)
const emptyCanvas = { getContext: () => fakeCtx, createImage: () => ({ set src(v) { setTimeout(() => this.onerror && this.onerror(), 0) } }) }
drawn.length = 0
assert.equal(await renderShareCard(emptyCanvas, { name: '无图商品', price: 0 }), true)
assert.equal(drawn.some(item => item[0] === 'drawImage'), false)

console.log('shareCard tests passed')
