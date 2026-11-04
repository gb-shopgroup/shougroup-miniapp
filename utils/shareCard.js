// 商品分享卡片封面（微信转发卡片只能是一张 5:4 图片，放不了文字组件）。
// 这里用 canvas 生成海报样式的封面：绿色外框 + 绿色标题栏(商品名/已售) + 商品图 + 价格 + 「立即跟团」按钮。
// 作为 onShareAppMessage 的 imageUrl，转发出去的卡片才会带价格和销量。

export const SHARE_CARD_WIDTH = 500
export const SHARE_CARD_HEIGHT = 400
// 外框 / 标题栏 / 内容内边距（px，画布坐标系）
export const SHARE_CARD_FRAME = 12
export const SHARE_CARD_HEADER = 56
export const SHARE_CARD_PADDING = 16
// 品牌绿：与详情页绿色主题一致
export const SHARE_CARD_GREEN = '#22c55e'

// 版式坐标：外框内「左商品图 + 右信息区」，左右留白对称
export function getShareCardLayout() {
	const frame = SHARE_CARD_FRAME
	const header = SHARE_CARD_HEADER
	const padding = SHARE_CARD_PADDING
	const contentTop = frame + header + padding
	const contentHeight = SHARE_CARD_HEIGHT - contentTop - frame - padding
	const imageSize = contentHeight
	const imageX = frame + padding
	const gap = 16
	const infoX = imageX + imageSize + gap
	const infoWidth = SHARE_CARD_WIDTH - frame - padding - infoX
	return {
		frame,
		header,
		padding,
		contentTop,
		image: { x: imageX, y: contentTop, size: imageSize },
		info: { x: infoX, y: contentTop, width: infoWidth, height: contentHeight }
	}
}

// 居中裁剪：返回 drawImage 需要的源图裁剪区域，保证商品图不变形
export function computeCoverCrop(imageWidth, imageHeight, boxWidth, boxHeight) {
	const iw = Number(imageWidth) || 0
	const ih = Number(imageHeight) || 0
	if (iw <= 0 || ih <= 0 || boxWidth <= 0 || boxHeight <= 0) {
		return { sx: 0, sy: 0, sw: Math.max(iw, 1), sh: Math.max(ih, 1) }
	}
	const scale = Math.max(boxWidth / iw, boxHeight / ih)
	const sw = Math.min(iw, boxWidth / scale)
	const sh = Math.min(ih, boxHeight / scale)
	return {
		sx: (iw - sw) / 2,
		sy: (ih - sh) / 2,
		sw,
		sh
	}
}

// 文本折行：measure 由调用方传入（canvas 用 measureText，测试里可用固定宽度估算）
export function wrapCardText(text, maxWidth, measure, maxLines = 3) {
	const content = String(text || '')
	const measureWidth = typeof measure === 'function' ? measure : value => String(value).length * 14
	if (!content) return []
	const lines = []
	let line = ''
	content.split('').forEach(char => {
		const next = line + char
		if (line && measureWidth(next) > maxWidth) {
			lines.push(line)
			line = char
			return
		}
		line = next
	})
	if (line) lines.push(line)
	if (lines.length <= maxLines) return lines
	const kept = lines.slice(0, maxLines)
	let last = kept[maxLines - 1]
	while (last.length > 1 && measureWidth(`${last}…`) > maxWidth) last = last.slice(0, -1)
	kept[maxLines - 1] = `${last}…`
	return kept
}

// 价格：10 -> "10"，4.50 -> "4.5"，避免卡片上出现 4.50 这种冗余小数
export function formatSharePrice(price) {
	const value = Number(price)
	if (!value || !isFinite(value) || value <= 0) return ''
	return value % 1 === 0 ? String(value) : String(Number(value.toFixed(2)))
}

// 销量文案：0 单不展示，避免空商品写着「已售0单」
export function formatShareSales(count) {
	const value = Number(count || 0)
	if (!value || value <= 0) return ''
	return `已售${value}单`
}

// 2d canvas 用属性赋值，旧版 canvas 用 setFillStyle，两种上下文都兼容
function setFillColor(ctx, color) {
	if (typeof ctx.setFillStyle === 'function') ctx.setFillStyle(color)
	ctx.fillStyle = color
}

function setFont(ctx, size, bold) {
	if (typeof ctx.setFontSize === 'function') ctx.setFontSize(size)
	ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`
}

function measureText(ctx, text) {
	try {
		const result = ctx.measureText(text)
		if (result && result.width > 0) return result.width
	} catch (err) {
		// 部分基础库 canvas 上下文没有 measureText，退化成按字数估算
	}
	return String(text || '').length * 14
}

// 绘制 5:4 海报样式分享封面（不含二维码）
// imageSource：2d canvas 传 Image 对象，旧版 canvas 传本地图片路径
export function drawShareCard(ctx, options = {}) {
	const {
		name = '',
		price = 0,
		soldText = '',
		imageSource = '',
		imagePath = '',
		imageWidth = 0,
		imageHeight = 0,
		actionText = '立即跟团'
	} = options
	const source = imageSource || imagePath
	const width = SHARE_CARD_WIDTH
	const height = SHARE_CARD_HEIGHT
	const layout = getShareCardLayout()

	// 白底
	setFillColor(ctx, '#ffffff')
	ctx.fillRect(0, 0, width, height)

	// 绿色外框（四边）
	setFillColor(ctx, SHARE_CARD_GREEN)
	ctx.fillRect(0, 0, width, layout.frame)
	ctx.fillRect(0, height - layout.frame, width, layout.frame)
	ctx.fillRect(0, 0, layout.frame, height)
	ctx.fillRect(width - layout.frame, 0, layout.frame, height)
	// 绿色标题栏
	ctx.fillRect(layout.frame, layout.frame, width - layout.frame * 2, layout.header)

	// 商品图：居中裁剪铺满方形区域；无图时用浅灰占位，避免右侧信息悬空
	const image = layout.image
	if (source) {
		const crop = computeCoverCrop(imageWidth, imageHeight, image.size, image.size)
		ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, image.x, image.y, image.size, image.size)
	} else {
		setFillColor(ctx, '#f2f3f5')
		ctx.fillRect(image.x, image.y, image.size, image.size)
	}

	// 标题栏：左侧商品名（超长省略），右侧已售单数
	const titleBaseline = layout.frame + layout.header / 2 + 9
	const soldTextWidth = soldText ? measureText(ctx, soldText) + 16 : 0
	const titleMaxWidth = width - layout.frame * 2 - layout.padding * 2 - soldTextWidth
	const titleLines = wrapCardText(name, titleMaxWidth, text => measureText(ctx, text), 1)
	if (titleLines.length) {
		setFont(ctx, 26, true)
		setFillColor(ctx, '#ffffff')
		ctx.fillText(titleLines[0], layout.frame + layout.padding, titleBaseline)
	}
	if (soldText) {
		setFont(ctx, 22, false)
		setFillColor(ctx, '#ffffff')
		ctx.fillText(soldText, width - layout.frame - layout.padding - measureText(ctx, soldText), titleBaseline)
	}

	// 右侧信息区：红色价格 + 绿色「立即跟团」按钮 + 灰色提示
	const info = layout.info
	const priceText = formatSharePrice(price)
	if (priceText) {
		// 价格位数多时自动缩小，避免撑出信息区
		const priceMaxWidth = info.width - 24
		let priceSize = 38
		setFont(ctx, priceSize, true)
		while (priceSize > 22 && measureText(ctx, priceText) > priceMaxWidth) {
			priceSize -= 4
			setFont(ctx, priceSize, true)
		}
		setFont(ctx, 20, true)
		setFillColor(ctx, '#ff3b30')
		ctx.fillText('¥', info.x, info.y + 74)
		setFont(ctx, priceSize, true)
		setFillColor(ctx, '#ff3b30')
		ctx.fillText(priceText, info.x + 22, info.y + 74)
	}

	const buttonTop = info.y + 100
	const buttonHeight = 48
	setFillColor(ctx, SHARE_CARD_GREEN)
	ctx.fillRect(info.x, buttonTop, info.width, buttonHeight)
	if (actionText) {
		setFont(ctx, 22, true)
		setFillColor(ctx, '#ffffff')
		ctx.fillText(actionText, info.x + (info.width - measureText(ctx, actionText)) / 2, buttonTop + 31)
	}
}

// 2d canvas 画网络/本地图必须先 createImage 加载成 Image 对象
export function loadCanvasImage(canvas, src) {
	return new Promise(resolve => {
		if (!src || !canvas || typeof canvas.createImage !== 'function') {
			resolve(null)
			return
		}
		const image = canvas.createImage()
		image.onload = () => resolve(image)
		image.onerror = () => resolve(null)
		image.src = src
	})
}

// 在 type="2d" 的 canvas 节点上渲染分享封面（同层渲染，页面里可以真正隐藏）
export async function renderShareCard(canvas, options = {}) {
	if (!canvas || typeof canvas.getContext !== 'function') return false
	const pixelRatio = Number(options.pixelRatio) > 0 ? Number(options.pixelRatio) : 2
	canvas.width = SHARE_CARD_WIDTH * pixelRatio
	canvas.height = SHARE_CARD_HEIGHT * pixelRatio
	const ctx = canvas.getContext('2d')
	if (!ctx) return false
	// 设置尺寸会重置上下文状态，这里按 dpr 缩放后再按 500x400 的坐标绘制
	if (typeof ctx.setTransform === 'function') ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
	const image = await loadCanvasImage(canvas, options.imagePath || '')
	drawShareCard(ctx, Object.assign({}, options, { imageSource: image }))
	return true
}
