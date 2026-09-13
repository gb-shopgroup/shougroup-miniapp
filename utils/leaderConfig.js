export const DEFAULT_STAFF_AUTH_IDS = [10, 20, 30, 50, 70]

export function splitIdList(value) {
	const list = Array.isArray(value) ? value : String(value || '').split(',')
	const seen = new Set()
	return list
		.map(item => Number(item))
		.filter(item => Number.isFinite(item) && item > 0)
		.filter(item => {
			if (seen.has(item)) return false
			seen.add(item)
			return true
		})
}

export function isValidMobile(mobile = '') {
	return /^1\d{10}$/.test(String(mobile || '').trim())
}

export function normalizeLeaderShop(raw = {}) {
	const shopLogo = raw.shopLogo || raw.avatar || raw.logo || raw.shopAvatar || raw.headImg || ''
	const shopCodeUrl = raw.shopCodeUrl || raw.shopUrl || raw.url || ''
	return {
		shopId: Number(raw.shopId || raw.id || 0),
		name: raw.name || raw.shopName || '',
		shortName: raw.shortName || raw.shopShortName || raw.short_name || raw.short || raw.alias || '',
		shopLogo,
		avatar: shopLogo,
		mobile: raw.mobile || raw.phone || raw.telephone || raw.tel || raw.contactPhone || raw.contactMobile || '',
		banner: raw.banner || raw.shopPhoto || raw.img || '',
		shopInfo: raw.shopInfo || raw.info || '',
		shopCodeUrl,
		shopUrl: shopCodeUrl
	}
}

export function buildLeaderShopPayload(form = {}) {
	const shopId = Number(form.shopId || form.id || 0)
	const payload = {
		name: String(form.name || '').trim(),
		shortName: String(form.shortName || form.shopShortName || '').trim(),
		mobile: String(form.mobile || form.phone || form.telephone || form.tel || form.contactPhone || form.contactMobile || '').trim(),
		banner: form.banner || '',
		shopInfo: String(form.shopInfo || '').trim(),
		shopLogo: form.shopLogo || form.avatar || form.logo || form.shopAvatar || '',
		shopCodeUrl: form.shopCodeUrl || form.shopUrl || ''
	}
	payload.shopId = shopId
	return payload
}

export function normalizeLeaderPoint(raw = {}) {
	const isClose = Number(raw.isClose || 0)
	const images = splitImageList(raw.pointImgs || raw.pointImages || raw.images || raw.imgs || raw.pointImg || raw.img)
	return {
		id: Number(raw.pointId || raw.id || 0),
		name: raw.pointName || raw.name || '',
		address: raw.pointAddress || raw.address || '',
		img: images[0] || '',
		images,
		lon: raw.longitude === undefined || raw.longitude === null ? (raw.lon === undefined || raw.lon === null ? '' : raw.lon) : raw.longitude,
		lat: raw.latitude === undefined || raw.latitude === null ? (raw.lat === undefined || raw.lat === null ? '' : raw.lat) : raw.latitude,
		scope: Number(raw.pointScope || raw.scope || 10),
		info: raw.pointInfo || raw.info || '',
		person: raw.person || '',
		phone: raw.phone || '',
		categoryName: raw.categoryName || raw.category || raw.typeName || raw.className || '',
		isClose,
		statusText: isClose === 0 ? '正常' : '已作废'
	}
}

export function splitImageList(value) {
	const list = Array.isArray(value) ? value : String(value || '').split(',')
	const seen = new Set()
	return list
		.map(item => String(item || '').trim())
		.filter(Boolean)
		.filter(item => {
			if (seen.has(item)) return false
			seen.add(item)
			return true
		})
		.slice(0, 1)
}

export function buildLeaderPointPayload(form = {}) {
	const images = splitImageList(form.images && form.images.length ? form.images : form.img)
	return {
		id: Number(form.id || 0),
		name: String(form.name || '').trim(),
		address: String(form.address || '').trim(),
		img: images.join(','),
		lon: form.lon === '' || form.lon === undefined || form.lon === null ? 0 : Number(form.lon),
		lat: form.lat === '' || form.lat === undefined || form.lat === null ? 0 : Number(form.lat),
		scope: Number(form.scope || 10),
		info: String(form.info || '').trim(),
		person: String(form.person || '').trim(),
		phone: String(form.phone || '').trim()
	}
}

export function getCurrentLeaderPointId(storageGetter) {
	const getter = storageGetter || (key => uni.getStorageSync(key))
	const selectedPointIds = splitIdList(getter('leader_select_pid'))
	if (selectedPointIds.length) return selectedPointIds[0]
	const pointIds = splitIdList(getter('leader_pointIds'))
	return pointIds[0] || 0
}

export function normalizeLeaderStaff(raw = {}) {
	const authIds = splitIdList(raw.auth || raw.authIds)
	const pointIds = splitIdList(raw.point || raw.pointIds)
	return {
		id: Number(raw.id || raw.staffId || 0),
		name: raw.name || raw.nickname || '',
		mobile: raw.mobile || '',
		remark: raw.remark || '',
		auth: authIds.join(','),
		point: pointIds.join(','),
		authIds,
		pointIds,
		isClose: Number(raw.isClose || 0)
	}
}

export function resolveBlackMemberId(raw = {}) {
	return Number(raw.memberId || raw.id || raw.userId || raw.uid || 0)
}

export function normalizeBlackMember(raw = {}) {
	const memberId = resolveBlackMemberId(raw)
	return {
		id: memberId,
		memberId,
		nickname: raw.nickname || raw.nickName || raw.name || '',
		nickName: raw.nickName || raw.nickname || raw.name || '',
		mobile: raw.mobile || raw.telephone || raw.phone || '',
		avatar: raw.avatar || raw.headImg || raw.headimg || raw.wxAvatar || ''
	}
}

export function buildLeaderStaffPayload(form = {}, currentPointId = 0) {
	const authIds = splitIdList(form.authIds || form.auth)
	const pointIds = splitIdList(form.pointIds || form.point)
	const effectivePointIds = pointIds.length ? pointIds : splitIdList([currentPointId])
	return {
		id: Number(form.id || 0),
		name: String(form.name || '').trim(),
		mobile: String(form.mobile || '').trim(),
		remark: String(form.remark || '').trim(),
		auth: authIds.join(','),
		point: effectivePointIds.join(',')
	}
}
