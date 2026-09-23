export const MEMBER_BOUND_LEADER_STORAGE_KEY = 'member_bound_leader_id'
export const MEMBER_LOCATION_STORAGE_KEY = 'member_recommend_location'

export function buildMemberHomeListPayload({ leaderId = 0, longitude, latitude, keyword = '', catId = 0, page = 1, pageSize = 10 } = {}) {
	const normalizedLeaderId = Number(leaderId || 0)
	const payload = {
		leaderId: normalizedLeaderId,
		page: Number(page || 1),
		pageSize: Number(pageSize || 10)
	}
	if (normalizedLeaderId === 0 && Number.isFinite(Number(longitude)) && Number.isFinite(Number(latitude))) {
		payload.longitude = Number(longitude)
		payload.latitude = Number(latitude)
	}
	if (String(keyword || '').trim()) payload.groupName = String(keyword).trim()
	// catId 只发正数：后端分类来自 gb_group_category_info.cat_id（int UNSIGNED 自增），
	// 从接口 GET /order/group/groupActivity/cat 下发，不存在 0/负数分类。
	// （历史上前端在没有分类时用过 -1…-5 的假 id，那套 id 后端永远匹配不到，已移除。）
	if (Number(catId || 0) > 0) payload.catId = Number(catId)
	return payload
}

export function normalizeMemberHomeGoods(goods = {}) {
	return {
		id: Number(goods.gid || goods.id || goods.goodsId || 0),
		name: goods.gname || goods.name || goods.goodsName || '',
		type: Number(goods.gtype || goods.type || 0),
		img: goods.img || goods.goodsImg || '',
		price: Number(goods.price || goods.goodsPrice || 0),
		price2: Number(goods.price2 || goods.marketPrice || 0),
		stock: goods.stock || ''
	}
}

export function normalizeMemberHomeRecord(record = {}) {
	return {
		id: record.id || record.orderId || record.orderNo || record.code || record.userMobile || '',
		code: record.code || record.orderNo || record.orderId || record.id || record.userMobile || '',
		name: record.name || record.userName || record.nickname || record.nickName || record.trueName || '',
		avatar: record.avatar || record.userAvatar || record.headImg || record.headimgurl || record.wxAvatar || '',
		time: record.time || record.userTime || record.orderTime || record.createTime || '',
		goodsName: record.goodsName || record.userGoodsName || record.goods || record.productName || '',
		num: record.num || record.userGoodsNum || record.goodsNum || record.count || ''
	}
}

export function resolveMemberHomeListData(data) {
	if (Array.isArray(data)) return data
	if (!data || typeof data !== 'object') return []
	return data.records || data.list || data.rows || data.data || []
}

export function resolveMemberHomeLogsData(data) {
	if (Array.isArray(data)) return data
	if (!data || typeof data !== 'object') return []
	return data.records || data.list || data.rows || data.logs || data.groupLogs || data.data || []
}

export function isMemberGroupOnline(group = {}) {
	return Number(group.isClose || 0) === 0
}

export function getMemberGroupStatusText(group = {}) {
	return isMemberGroupOnline(group) ? '正在跟团中' : '已下线'
}

// 首页卡片「标签」：切图 + 主色。
// 标签已升级为独立实体 GbGroupTag { tagId, tagName, tagColor }（后台可增删改），
// 团购接口按约定下发 tagId / tagName（B 端 get/groupActivity/list|info、admin 均如此），
// 首页列表同样按 tagName 取值；tagColor 存在时用它作为药丸颜色。
// 三个内置标签有切图（颜色取自切图实际像素），自定义标签回退成纯文字药丸：
//   超快回复：橙色圆环(label-ring) + 闪电(label-flash)
//   超多回头客：绿色人形回头箭头(label-repeat)
//   热门团购：红色圆形「抢」(label-hot)
export const MEMBER_HOME_LABEL_STYLES = {
	'超快回复': { tone: 'fast', color: '#ff7828', ring: '/static/image/label/label-ring.png', icon: '/static/image/label/label-flash.png' },
	'超多回头客': { tone: 'repeat', color: '#4caf50', ring: '', icon: '/static/image/label/label-repeat.png' },
	'热门团购': { tone: 'hot', color: '#d81e06', ring: '', icon: '/static/image/label/label-hot.png' }
}

// 颜色归一化：把后端可能返回的 #rgb / #rrggbb / rgb() 统一成 #rrggbb；无法识别返回空串
export function normalizeLabelColor(value = '') {
	const text = String(value === undefined || value === null ? '' : value).trim()
	if (/^#[0-9a-fA-F]{6}$/.test(text)) return text
	if (/^#[0-9a-fA-F]{3}$/.test(text)) return '#' + text.slice(1).split('').map(c => c + c).join('')
	const rgb = text.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i)
	if (!rgb) return ''
	return '#' + rgb.slice(1, 4).map(num => Math.min(Number(num), 255).toString(16).padStart(2, '0')).join('')
}

// 取标签样式：内置标签用切图 + 切图主色；自定义标签用 tagColor（没有则灰色）纯文字；
// 空标签返回 null（不渲染）。
// 首页卡片与 C 端团购详情共用同一套（详情页接口补上 tagId/tagName 后即可直接渲染）。
export function getGroupLabelStyle(label = '', color = '') {
	const text = String(label === undefined || label === null ? '' : label).trim()
	if (!text) return null
	const tagColor = normalizeLabelColor(color)
	const preset = MEMBER_HOME_LABEL_STYLES[text]
	if (preset) {
		return { text, tone: preset.tone, color: tagColor || preset.color, ring: preset.ring || '', icon: preset.icon || '' }
	}
	return { text, tone: 'default', color: tagColor || '#999999', ring: '', icon: '' }
}

// 兼容旧调用名（首页卡片最先用到）
export const getMemberHomeLabelStyle = getGroupLabelStyle

export function normalizeMemberHomeGroup(group = {}) {
	const goods = Array.isArray(group.goods)
		? group.goods.map(normalizeMemberHomeGoods).filter(item => item.id || item.name || item.img)
		: []
	const rawRecords = Array.isArray(group.groupLogs)
		? group.groupLogs
		: (Array.isArray(group.records)
			? group.records
			: (Array.isArray(group.logs)
				? group.logs
				: (Array.isArray(group.orderLogs) ? group.orderLogs : [])))
	const records = rawRecords.map(normalizeMemberHomeRecord).filter(item => item.name || item.avatar || item.time || item.goodsName)
	const isClose = Number(group.isClose || 0)
	const groupImages = [group.img, group.img2, group.img3].filter(Boolean)
	const goodsImages = goods.map(item => item.img).filter(Boolean)
	const shop = group.shop && typeof group.shop === 'object' ? group.shop : (group.shopInfo && typeof group.shopInfo === 'object' ? group.shopInfo : {})
	const leaderName = group.leaderName || group.shopName || (typeof group.shop === 'string' ? group.shop : '') || shop.name || shop.shopName || ''
	const leaderAvatar = group.leaderAvatar || group.shopLogo || group.logo || group.shopAvatar || group.avatar || group.headImg || group.headimgurl || group.wxAvatar ||
		shop.shopLogo || shop.logo || shop.shopAvatar || shop.avatar || shop.headImg || shop.headimgurl || shop.wxAvatar || ''
	// 标签：按团购标签实体的约定读 tagName/tagId（保留历史字段名兜底）
	const labelText = group.tagName || group.tag || group.label || group.labels || ''
	const tagId = Number(group.tagId || group.tag_id || 0)
	const tagColor = group.tagColor || group.tag_color || ''
	return {
		id: Number(group.id || 0),
		leaderId: Number(group.lid || group.leaderId || 0),
		leaderName,
		leaderAvatar,
		catId: Number(group.cat || group.catId || 0),
		name: group.name || '',
		pickup: Number(group.pickup || 0),
		price: Number(group.price || 0),
		price2: Number(group.price2 || 0),
		price3: Number(group.price3 || 0),
		brief: group.brief || group.info || '',
		info: group.info || group.brief || '',
		label: labelText,
		tagId,
		tagName: labelText,
		// 卡片标签的渲染样式（切图/主色），见 getMemberHomeLabelStyle
		labelStyle: getGroupLabelStyle(labelText, tagColor),
		images: groupImages.length > 0 ? groupImages : goodsImages,
		virtual: Number(group.virtual || 0),
		order: Number(group.order || 0),
		viewText: Number(group.virtual || group.num || 0),
		// 跟团次数取接口的真实订单数（order/num2）；不能用预览记录条数 ——
		// records 只是卡片上滚动的预览（条数受接口返回限制），会让「N次跟团」少报/变 0。
		joinText: Number(group.order || group.num2 || 0),
		joinNum: Number(group.order || group.num2 || 0),
		timeText: group.timeText || group.time || group.createTimeText || group.startTimeText || '',
		distanceText: group.distanceText || group.distance || '',
		isClose,
		statusText: getMemberGroupStatusText({ isClose }),
		startTime: Number(group.startTime || 0),
		endTime: Number(group.endTime || 0),
		isCheck: Number(group.isCheck || 0),
		checkRemark: group.checkRemark || '',
		goods,
		records
	}
}
