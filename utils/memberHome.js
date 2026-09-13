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
		label: group.tagName || group.tag || group.label || group.labels || '',
		images: groupImages.length > 0 ? groupImages : goodsImages,
		virtual: Number(group.virtual || 0),
		order: Number(group.order || 0),
		viewText: Number(group.virtual || group.num || 0),
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
