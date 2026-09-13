export function hasRichText(value) {
	if (typeof value !== 'string') return false
	const text = value.trim()
	if (!text) return false
	return /<\/?[a-z][\s\S]*>/i.test(text)
}

export function hasGroupIntroContent(value) {
	return String(value || '').trim().length > 0
}

export function splitGroupGoods(goods, richText) {
	const list = Array.isArray(goods) ? goods : []
	return {
		featuredGoods: hasGroupIntroContent(richText) ? list.slice(-3) : [],
		allGoods: list
	}
}

export function normalizeGroupCard(group) {
	const item = group || {}
	const shop = item.shop || {}
	return {
		id: item.id,
		leaderId: item.lid || item.leaderId,
		name: item.name || '',
		leaderName: item.leaderName || item.shopName || shop.name || '',
		leaderAvatar: item.leaderAvatar || item.avatar || shop.avatar || '',
		timeText: item.timeText || item.createTimeText || '',
		viewText: item.viewText || item.viewNum || item.viewCount || '',
		distanceText: item.distanceText || item.distance || '',
		images: [item.img, item.img2, item.img3].filter(Boolean),
		price: item.price,
		price2: item.price2,
		price3: item.price3,
		isClose: item.isClose || 0,
		pickup: item.pickup || 0,
		joinNum: item.num || item.joinNum || 0,
		goods: Array.isArray(item.goods) ? item.goods : [],
		records: Array.isArray(item.records) ? item.records : (Array.isArray(item.logs) ? item.logs : [])
	}
}

export function filterGroupCardsByKeyword(groups, keyword) {
	const value = typeof keyword === 'string' ? keyword.trim() : ''
	const list = Array.isArray(groups) ? groups : []
	if (!value) return list
	return list.filter(item => {
		const goodsText = Array.isArray(item.goods) ? item.goods.map(goods => goods.name || '').join(' ') : ''
		return `${item.name || ''} ${item.brief || ''} ${goodsText}`.includes(value)
	})
}
