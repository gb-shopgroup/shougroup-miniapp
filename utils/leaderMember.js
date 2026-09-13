export function buildLeaderMemberListRequest(input = {}) {
	const request = {
		keyword: input.keyword || '',
		page: Number(input.page || 1),
		pageSize: Number(input.pageSize || 10)
	}
	if (!request.keyword) delete request.keyword
	return request
}

export function normalizeLeaderMember(row = {}) {
	return {
		memberId: Number(row.memberId || row.id || 0),
		mobile: row.mobile || '',
		nickname: row.nickname || row.nickName || row.name || '',
		avatar: row.avatar || row.headImg || row.headimgurl || '',
		lastTimeDesc: row.lastTimeDesc || '',
		lastActionDesc: row.lastActionDesc || '',
		consumeAmount: row.consumeAmount || '0',
		orderCount: Number(row.orderCount || 0),
		viewCount: Number(row.viewCount || 0)
	}
}

export function normalizeLeaderMemberDetail(row = {}) {
	const dynamicList = Array.isArray(row.dynamicList) ? row.dynamicList : []
	return {
		memberId: Number(row.memberId || row.id || 0),
		mobile: row.mobile || '',
		nickname: row.nickname || row.nickName || row.name || '',
		avatar: row.avatar || row.headImg || row.headimgurl || '',
		consumeAmount: row.consumeAmount || '0',
		refundAmount: row.refundAmount || '0',
		orderCount: Number(row.orderCount || 0),
		viewCount: Number(row.viewCount || 0),
		dynamicList: dynamicList.map(group => ({
			date: group.date || '',
			items: Array.isArray(group.items)
				? group.items.map(item => ({
					time: item.time || '',
					action: item.action || '',
					content: item.content || ''
				}))
				: []
		}))
	}
}

export function getMemberActionText(action) {
	const map = {
		view: '查看',
		order: '跟团'
	}
	return map[action] || '动态'
}
