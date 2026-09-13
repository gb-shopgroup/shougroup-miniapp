function toNumber(value) {
	const num = Number(value || 0)
	return Number.isFinite(num) ? num : 0
}

function pad(value) {
	return String(value).padStart(2, '0')
}

function readAttr(tag, name) {
	const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))
	return match ? match[1] : ''
}

function appendAttr(tag, attr) {
	return tag.replace(/\s*\/?>$/, value => `${attr}${value}`)
}

function mergeStyle(style, patches) {
	const used = new Set()
	String(style || '').split(';').forEach(item => {
		const index = item.indexOf(':')
		if (index === -1) return
		used.add(item.slice(0, index).trim().toLowerCase())
	})
	const additions = patches.filter(item => {
		const index = item.indexOf(':')
		if (index === -1) return false
		const key = item.slice(0, index).trim().toLowerCase()
		return !used.has(key)
	})
	return [String(style || '').trim().replace(/;+$/, ''), additions.join(';')].filter(Boolean).join(';')
}

export function normalizeRichTextImages(html = '') {
	if (typeof html !== 'string' || !html) return ''
	return html.replace(/<img\b[^>]*>/gi, tag => {
		const rawWidth = readAttr(tag, 'width')
		const width = rawWidth || '100%'
		const widthNumber = Number(String(width).replace('%', ''))
		const isGridImage = Number.isFinite(widthNumber) && widthNumber < 100
		const display = isGridImage ? 'inline-block' : 'block'
		const margin = isGridImage ? '6rpx 0.5%' : '10rpx 0'
		const nextStyle = mergeStyle(readAttr(tag, 'style'), [
			`width:${width}`,
			'max-width:100%',
			'height:auto',
			`display:${display}`,
			...(isGridImage ? ['vertical-align:top'] : []),
			`margin:${margin}`,
			'border-radius:8rpx'
		])
		let nextTag = rawWidth ? tag : appendAttr(tag, ' width="100%"')
		if (readAttr(nextTag, 'style')) {
			nextTag = nextTag.replace(/\sstyle\s*=\s*["'][^"']*["']/i, ` style="${nextStyle}"`)
		} else {
			nextTag = appendAttr(nextTag, ` style="${nextStyle}"`)
		}
		return nextTag
	})
}

export function formatGroupDateTime(value) {
	const time = toNumber(value)
	if (!time) return ''
	const date = new Date(time * 1000)
	if (Number.isNaN(date.getTime())) return ''
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatGroupShortDate(value) {
	const text = formatGroupDateTime(value)
	if (!text) return ''
	const parts = text.split(' ')[0].split('/')
	return `${Number(parts[1])}月${Number(parts[2])}日`
}

export function formatGroupTimeRange(startTime, endTime) {
	const startText = formatGroupDateTime(startTime)
	const endText = formatGroupDateTime(endTime)
	if (!startText || !endText) return '暂未设置'
	return `开始 ${startText}\n结束 ${endText}`
}

export function validateGroupTime(startTime, endTime) {
	const start = toNumber(startTime)
	const end = toNumber(endTime)
	if (!start) return { valid: false, message: '请选择开始时间' }
	if (!end) return { valid: false, message: '请选择结束时间' }
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	if (start < Math.floor(today.getTime() / 1000)) return { valid: false, message: '开始时间不能早于今天' }
	if (end <= start) return { valid: false, message: '结束时间必须晚于开始时间' }
	return { valid: true, message: '' }
}

export function getLeaderGroupStatus(row = {}, now = Date.now()) {
	const start = toNumber(row.startTime)
	const end = toNumber(row.endTime)
	const current = Math.floor(Number(now) / 1000)
	if (start && current < start) return { value: 2, text: '未开始', tone: 'warning' }
	if (end && current > end) return { value: 3, text: '已结束', tone: 'muted' }
	return { value: 1, text: '活动中', tone: 'success' }
}

export function getLeaderGroupManageActions(group = {}) {
	const statusInfo = group.statusInfo || getLeaderGroupStatus(group)
	const status = Number(statusInfo.value || 0)
	const isClosed = Number(group.isClose || 0) !== 0
	const actions = []
	if (status !== 3) {
		if (isClosed) {
			actions.push({ key: 'edit', text: '修改团购信息' })
			actions.push({ key: 'open', text: '开启团购' })
		} else if (status === 2) {
			actions.push({ key: 'edit', text: '修改团购信息' })
			actions.push({ key: 'close', text: '关闭团购' })
		} else {
			actions.push({ key: 'close', text: '关闭团购' })
		}
	}
	actions.push({ key: 'copy', text: '复制团购' })
	return actions
}

function formatGroupGoodsStock(item = {}) {
	const unit = item.unit || item.goodsUnit || ''
	const hasProductStock = item.isStock !== undefined || item.stockNum !== undefined || item.num !== undefined
	if (hasProductStock) {
		if (item.isStock !== undefined && Number(item.isStock || 0) !== 1) return '不限'
		const stockNum = item.stockNum !== undefined ? item.stockNum : item.num
		return `${Number(stockNum || 0)}${unit}`
	}
	const stock = item.stock
	if (stock === undefined || stock === null || stock === '' || stock === 0 || stock === '0') return '不限'
	return String(stock)
}

export function normalizeLeaderGroupGoods(item = {}) {
	return {
		gid: item.gid || item.goodsId || 0,
		gname: item.gname || item.goodsName || '',
		gtype: item.gtype || item.goodsType || 2,
		img: item.img || item.groupImg || item.goodsImg || '',
		price: Number(item.price || item.groupPrice || 0),
		price2: Number(item.price2 || item.marketPrice || 0),
		stock: formatGroupGoodsStock(item)
	}
}

export function getLeaderGroupCoverImages(group = {}) {
	const goodsImages = (Array.isArray(group.goods) ? group.goods : [])
		.map(item => item && item.img)
		.filter(Boolean)
	const activityImages = [group.img, group.img2, group.img3].filter(Boolean)
	const source = goodsImages.length ? goodsImages : activityImages
	return source.filter((img, index) => source.indexOf(img) === index)
}

export function normalizeLeaderGroup(row = {}) {
	const goods = row.goods || row.lists || []
	const shop = row.shop || row.leaderShop || row.shopInfo || {}
	const leaderAvatar = row.leaderAvatar || row.shopLogo || row.logo || row.shopAvatar || row.avatar || row.headImg || row.headimgurl || row.wxAvatar ||
		shop.shopLogo || shop.logo || shop.shopAvatar || shop.avatar || shop.headImg || shop.headimgurl || shop.wxAvatar || ''
	const normalized = {
		id: row.id || 0,
		lid: row.lid || 0,
		cat: row.cat || 0,
		name: row.name || '',
		shopName: row.shopName || row.leaderName || row.nickname || shop.name || shop.shopName || '',
		leaderAvatar,
		memberCount: toNumber(row.memberCount || row.memberNum || row.members || shop.memberCount || shop.memberNum || 0),
		joinCount: toNumber(row.joinCount || row.joinNum || row.groupNum || row.orderNum || row.order || shop.joinCount || shop.joinNum || shop.groupNum || shop.orderNum || 0),
		followCount: toNumber(row.followCount || row.followNum || row.fansCount || row.fansNum || row.subscribeCount || row.subscribeNum || shop.followCount || shop.followNum || shop.fansCount || shop.fansNum || 0),
		pickup: Number(row.pickup || 1),
		price: Number(row.price || 0),
		price2: Number(row.price2 || 0),
		img: row.img || '',
		img2: row.img2 || '',
		img3: row.img3 || '',
		info: row.info || row.groupInfo || '',
		label: row.label || row.labels || '',
		pointId: toNumber(row.pointId || row.pid || row.point || 0),
		pointName: row.pointName || '',
		virtual: Number(row.virtual || row.virtualOrder || 0),
		order: Number(row.order || 0),
		isClose: Number(row.isClose || 0),
		isCheck: Number(row.isCheck || 0),
		checkRemark: row.checkRemark || '',
		startTime: toNumber(row.startTime),
		endTime: toNumber(row.endTime),
		goods: Array.isArray(goods) ? goods.map(normalizeLeaderGroupGoods).filter(item => item.gid) : []
	}
	return {
		...normalized,
		timeText: formatGroupTimeRange(normalized.startTime, normalized.endTime),
		endDateText: formatGroupShortDate(normalized.endTime),
		statusInfo: getLeaderGroupStatus(normalized)
	}
}

export function buildLeaderGroupSubmitPayload(form = {}) {
	const goods = Array.isArray(form.goods) ? form.goods : []
	const submitGoods = goods.map(item => {
		const row = normalizeLeaderGroupGoods(item)
		return {
			gid: row.gid,
			gname: row.gname,
			gtype: row.gtype,
			img: row.img,
			price: row.price,
			price2: row.price2
		}
	}).filter(item => item.gid)
	return {
		id: form.id || 0,
		cat: form.cat || 0,
		name: form.name || '',
		pickup: Number(form.pickup || 1),
		info: form.info || '',
		label: form.label || '',
		pointId: toNumber(form.pointId || form.pid || form.point || 0),
		virtual: Number(form.virtual || 0),
		startTime: toNumber(form.startTime),
		endTime: toNumber(form.endTime),
		goods: submitGoods,
		lists: submitGoods.map(item => ({
			goodsId: item.gid,
			goodsName: item.gname,
			goodsType: item.gtype,
			groupImg: item.img,
			groupPrice: item.price,
			marketPrice: item.price2
		}))
	}
}

export function buildLeaderGroupCopyDraft(group = {}) {
	const source = normalizeLeaderGroup(group)
	return {
		id: 0,
		cat: source.cat,
		name: source.name,
		pickup: source.pickup,
		info: source.info,
		label: source.label,
		pointId: source.pointId,
		pointName: source.pointName,
		virtual: source.virtual,
		startTime: '',
		endTime: '',
		goods: source.goods
	}
}
