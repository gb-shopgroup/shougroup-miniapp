export const ORDER_TABS = [
	{ key: 'all', text: '全部', statuses: [] },
	{ key: 'writeOff', text: '核销', statuses: [1, 2, 3] },
	{ key: 'refund', text: '售后', statuses: [] }
]

export const WRITE_OFF_TABS = [
	{ key: 'pending', text: '待核销', statuses: [1] },
	{ key: 'partial', text: '部分核销', statuses: [2] },
	{ key: 'done', text: '已核销', statuses: [3] }
]

export const REFUND_TABS = [
	{ key: 'all', text: '全部', applyStatus: 0 },
	{ key: 'pending', text: '待处理退货', applyStatus: 1 },
	{ key: 'approved', text: '已退货', applyStatus: 2 },
	{ key: 'rejected', text: '未同意', applyStatus: 3 }
]

export const REFUND_APPROVE_STATUS = {
	AGREE: 1,
	REJECT: 2
}

export function getOrderStatusMeta(status) {
	const map = {
		0: { key: 'unpay', text: '未支付', tone: 'muted' },
		1: { key: 'pending', text: '待核销', tone: 'warning' },
		2: { key: 'partial', text: '部分核销', tone: 'warning' },
		3: { key: 'done', text: '已核销', tone: 'success' },
		4: { key: 'refunded', text: '已退款', tone: 'danger' },
		5: { key: 'afterSales', text: '售后中', tone: 'warning' },
		6: { key: 'cancelled', text: '已取消', tone: 'muted' }
	}
	return map[Number(status)] || { key: 'unknown', text: '未知状态', tone: 'muted' }
}

export function getRefundStatusMeta(status) {
	const map = {
		1: { key: 'pending', text: '待处理退货', tone: 'warning' },
		2: { key: 'approved', text: '已退货', tone: 'success' },
		3: { key: 'rejected', text: '未同意', tone: 'danger' }
	}
	return map[Number(status)] || { key: 'none', text: '售后', tone: 'muted' }
}

export function parseLeaderOrderScanResult(res = {}) {
	const raw = res.result || res.path || res.scene || res.q || res.orderNo || ''
	let text = String(raw).trim()
	try {
		text = decodeURIComponent(text)
	} catch (err) {
		console.log('二维码内容解码失败：', err)
	}
	const findValue = key => {
		const match = text.match(new RegExp('(?:^|[?&#=])' + key + '=([^&#]+)', 'i'))
		if (!match) return ''
		try {
			return decodeURIComponent(match[1]).trim()
		} catch (err) {
			return String(match[1]).trim()
		}
	}
	const action = res.action ? String(res.action).trim() : findValue('action')
	const receiptCode = res.receiptCode
		? String(res.receiptCode).trim()
		: (findValue('receiptCode') || findValue('code'))
	const orderNo = res.orderNo ? String(res.orderNo).trim() : (findValue('orderNo') || findValue('oid'))
	return {
		action,
		orderNo,
		receiptCode,
		isVerificationCode: action === 'verify' || Boolean(receiptCode)
	}
}

function firstValue(row, keys, fallback) {
	for (let i = 0; i < keys.length; i += 1) {
		if (row[keys[i]] !== undefined && row[keys[i]] !== null) return row[keys[i]]
	}
	return fallback
}

function firstPositiveValue(row, keys, fallback) {
	for (let i = 0; i < keys.length; i += 1) {
		const value = row[keys[i]]
		if (value !== undefined && value !== null && Number(value) > 0) return value
	}
	return firstValue(row, keys, fallback)
}

function centsToYuan(value) {
	return Number((Number(value || 0) / 100).toFixed(2))
}

function orderMoneyToYuan(value) {
	const amount = Number(value || 0)
	if (!Number.isFinite(amount)) return 0
	if (!Number.isInteger(amount)) return Number(amount.toFixed(2))
	return centsToYuan(amount)
}

function yuanAmount(value) {
	const amount = Number(value || 0)
	if (!Number.isFinite(amount)) return 0
	return Number(amount.toFixed(2))
}

export function normalizeLeaderOrderGoods(row = {}) {
	const goodsNum = Number(firstValue(row, ['goodsNum', 'num', 'buyNum'], 0) || 0)
	const receiptNum = Number(firstValue(row, ['receiptNum', 'receivedNum'], 0) || 0)
	const applyRefund = Number(row.applyRefund || 0)
	const refundNum = Number(firstValue(row, ['refundNum'], 0) || 0)
	const refundGoodsNum = Number(firstValue(row, ['refundGoodsNum'], 0) || 0)
	const pendingRefundNum = Number(firstValue(row, ['pendingRefundNum', 'applyRefundNum'], 0) || 0)
	const price = orderMoneyToYuan(firstPositiveValue(row, ['goodsPrice', 'price', 'unitPrice', 'salePrice'], 0))
	const fallbackRefundNum = refundGoodsNum || refundNum || pendingRefundNum || (applyRefund === 1 ? goodsNum : 0)
	const calculatedRefundAmount = Number((price * fallbackRefundNum).toFixed(2))
	const rawRefundAmount = firstValue(row, ['refundAmount', 'refundPrice', 'refundFee'], null)
	const parsedRefundAmount = rawRefundAmount !== null ? orderMoneyToYuan(rawRefundAmount) : 0
	const refundAmount = parsedRefundAmount > 0 || applyRefund === 3 ? parsedRefundAmount : calculatedRefundAmount
	const id = row.id || row.Id || row.orderGoodsId || row.orderGoodsID || row.orderGoodsid || 0
	return {
		id,
		goodsId: row.goodsId || row.gid || 0,
		name: row.goodsName || row.name || '',
		img: row.goodsImg || row.img || '',
		price,
		num: goodsNum,
		receiptNum,
		applyRefund,
		refundNum,
		refundGoodsNum,
		pendingRefundNum,
		unit: row.goodsUnit || row.unit || '',
		skuId: Number(row.skuId || 0),
		skuIds: row.skuIds || row.skuids || '',
		specText: row.goodsInfo || row.skuNames || row.skunames || row.sku || '',
		pendingWriteOffNum: Math.max(goodsNum - receiptNum, 0),
		verifyNum: Math.max(goodsNum - receiptNum, 0),
		refundAmount
	}
}

function getGoodsRefundStatus(goods = []) {
	const priorities = [1, 2, 3]
	for (let i = 0; i < priorities.length; i += 1) {
		const status = priorities[i]
		if (goods.some(item => Number(item.applyRefund || 0) === status)) return status
	}
	return 0
}

export function normalizeLeaderOrder(row = {}) {
	const statusMeta = getOrderStatusMeta(row.status)
	const rawGoods = Array.isArray(row.goods) ? row.goods : (Array.isArray(row.goodsInfoList) ? row.goodsInfoList : [])
	const goods = rawGoods.map(item => normalizeLeaderOrderGoods(item))
	const orderRefundStatus = firstValue(row, ['applyRefund', 'applyStatus', 'refundStatus'], null)
	const refundStatus = orderRefundStatus === null ? getGoodsRefundStatus(goods) : orderRefundStatus
	const refundMeta = getRefundStatusMeta(refundStatus)
	return {
		orderNo: row.orderNo || row.pcode || String(row.id || ''),
		orderTime: row.orderTime || row.time || '',
		orderPrice: orderMoneyToYuan(row.orderPrice !== undefined ? row.orderPrice : row.price || 0),
		shopName: row.shopName || row.leaderName || '',
		groupId: row.groupId || row.gid || 0,
		groupName: row.groupName || row.activityName || '',
		avatar: row.avatar || row.headImg || row.headimgurl || row.userAvatar || '',
		status: Number(row.status || 0),
		statusKey: statusMeta.key,
		statusText: statusMeta.text,
		statusTone: statusMeta.tone,
		refundStatus: Number(refundStatus || 0),
		refundStatusText: refundMeta.text,
		refundTone: refundMeta.tone,
		refundFlag: Number(firstValue(row, ['refundFlag'], 0) || 0),
		receiptType: Number(row.receiptType || 1),
		trueName: row.trueName || row.nickname || '',
		telephone: row.telephone || row.mobile || '',
		pointId: row.pointId || row.pid || 0,
		pointName: row.pointName || row.pname || '',
		pointAddress: row.pointAddress || '',
		receiptCode: row.receiptCode || '',
		nickname: row.nickname || '',
		mobile: row.mobile || row.telephone || '',
		reason: row.reason || row.refundReason || '',
		refundDesc: row.refundDesc || row.desc || row.remark || '',
		applyTime: row.applyTime || row.refundApplyTime || '',
		images: row.refundImages || row.applyImages || row.images || [],
		history: row.history || row.logs || row.refundLogs || [],
		payno: row.payno || '',
		goods
	}
}

function requestBase(input = {}) {
	const base = {
		keyword: input.keyword || '',
		groupId: Number(input.groupId || 0),
		pointId: Number(input.pointId || 0),
		page: Number(input.page || 1),
		pageSize: Number(input.pageSize || 10)
	}
	Object.keys(base).forEach(key => {
		if (base[key] === '' || base[key] === 0) delete base[key]
	})
	return base
}

export function buildLeaderOrderListRequest(input = {}) {
	const statuses = Array.isArray(input.statuses) ? input.statuses : []
	if (statuses.length === 0) {
		const base = requestBase(input)
		if (input.status !== undefined && input.status !== null && input.status !== 0) {
			return Object.assign({}, base, { status: Number(input.status) })
		}
		return base
	}
	return statuses.map(status => Object.assign({}, requestBase(input), { status }))
}

export function buildLeaderRefundListRequest(input = {}) {
	const request = requestBase(input)
	if (Number(input.applyStatus || 0) > 0) request.applyStatus = Number(input.applyStatus)
	return request
}

export function buildLeaderOrderCountQuery(input = {}) {
	return { gid: Number(input.groupId || 0), pid: Number(input.pointId || 0) }
}

export function buildWriteOffPayload(order = {}, pointId = 0) {
	return { orderNo: order.orderNo || '', pid: Number(pointId || order.pointId || 0) }
}

export function buildPartWriteOffPayload(order = {}, pointId = 0) {
	const goodsMap = {}
	const goods = Array.isArray(order.goods) ? order.goods : []
	goods.forEach(item => {
		const maxNum = Math.max(0, Number(item.pendingWriteOffNum || 0))
		const num = Math.min(Number(item.verifyNum || 0), maxNum)
		if (item.id && num > 0) goodsMap[item.id] = { id: item.id, num }
	})
	return { orderNo: order.orderNo || '', pid: Number(pointId || order.pointId || 0), goodsMap }
}

export function buildLeaderOrderSummary(orders = []) {
	const list = Array.isArray(orders) ? orders : []
	let validCount = 0
	let orderAmount = 0
	let refundAmount = 0
	list.forEach(order => {
		const status = Number(order.status || 0)
		if ([1, 2, 3].includes(status)) {
			validCount += 1
			orderAmount += Number(order.orderPrice || 0)
		}
		const goods = Array.isArray(order.goods) ? order.goods : []
		goods.forEach(item => {
			refundAmount += Number(item.refundAmount || 0)
		})
	})
	return {
		validCount,
		orderAmount: Number(orderAmount.toFixed(2)),
		refundAmount: Number(refundAmount.toFixed(2))
	}
}

export function normalizeLeaderDashboardSummary(row = {}) {
	return {
		validCount: Number(firstValue(row, ['orderTotal', 'validCount', 'orderCount', 'total', 'num', 'count'], 0) || 0),
		orderAmount: yuanAmount(firstValue(row, ['amountTotal', 'orderAmount', 'orderAmountTotal', 'totalAmount', 'amount', 'price'], 0)),
		refundAmount: yuanAmount(firstValue(row, ['refundAmount', 'refundAmountTotal', 'refundTotal', 'refundFee'], 0))
	}
}

export function normalizeLeaderGoodsSummaryItem(row = {}, index = 0) {
	const name = row.name || row.goodsName || row.title || '商品名称'
	const specText = row.specText || row.goodsInfo || row.skuNames || row.sku || ''
	return {
		key: String(row.id || row.goodsId || `${name}_${specText}_${index}`),
		name,
		specText,
		totalNum: Number(firstValue(row, ['totalNum', 'total', 'goodsNum', 'num'], 0) || 0),
		verifiedNum: Number(firstValue(row, ['verifiedNum', 'receiptNum', 'num1'], 0) || 0),
		pendingNum: Number(firstValue(row, ['pendingNum', 'unreceipt', 'unReceiptNum', 'num2'], 0) || 0),
		unit: row.unit || row.goodsUnit || ''
	}
}

export function buildLeaderGoodsSummary(orders = []) {
	const resultMap = {}
	const list = Array.isArray(orders) ? orders : []
	list.forEach(order => {
		const goods = Array.isArray(order.goods) ? order.goods : []
		goods.forEach(item => {
			const name = item.name || '商品名称'
			const spec = item.specText || ''
			const key = `${name}__${spec}`
			if (!resultMap[key]) {
				resultMap[key] = {
					key,
					name,
					specText: spec,
					totalNum: 0,
					pendingNum: 0
				}
			}
			resultMap[key].totalNum += Number(item.num || 0)
			resultMap[key].pendingNum += Number(item.pendingWriteOffNum || 0)
		})
	})
	return Object.values(resultMap)
}

function selectionEntry(order, goods) {
	const goodsId = goods.id
	const refundFlag = Number(order.refundFlag || goods.refundFlag || 0)
	const refundNum = Number((refundFlag === 1 ? goods.refundNum : goods.refundGoodsNum) || goods.pendingRefundNum || goods.num || 0)
	const refundAmount = Number((Number(goods.price || 0) * refundNum).toFixed(2))
	return {
		orderGoodsId: goodsId,
		refundNum,
		refundAmount,
		refundFlag,
		goods
	}
}

export function isLeaderRefundableGoods(goods = {}) {
	return Number(goods.applyRefund || 0) === 1 || Number(goods.refundNum || 0) > 0 || Number(goods.refundGoodsNum || 0) > 0
}

export function buildRefundSelectionForOrder(order = {}) {
	let selection = {}
	const goodsList = Array.isArray(order.goods) ? order.goods : []
	const refundGoods = goodsList.filter(isLeaderRefundableGoods)
	const source = refundGoods.length > 0 ? refundGoods : goodsList.filter(goods => Number(order.refundStatus || 0) === 1)
	source.forEach(goods => {
		selection = toggleRefundSelection(selection, order, goods, true)
	})
	return selection
}

export function toggleRefundSelection(selection = {}, order = {}, goods = {}, checked = false) {
	const next = Object.assign({}, selection)
	const orderNo = order.orderNo || ''
	const goodsId = goods.id || 0
	if (!orderNo || !goodsId) return next
	const current = selection[orderNo]
	const currentGoods = current && current.goodsMap ? current.goodsMap : {}
	const nextGoods = Object.assign({}, currentGoods)
	if (checked) {
		nextGoods[goodsId] = selectionEntry(order, goods)
	} else {
		delete nextGoods[goodsId]
	}
	if (Object.keys(nextGoods).length === 0) {
		delete next[orderNo]
	} else {
		next[orderNo] = { orderNo, order, goodsMap: nextGoods }
	}
	return next
}

function selectedGoods(selection = {}) {
	const result = []
	Object.keys(selection).forEach(orderNo => {
		const entry = selection[orderNo] || {}
		const goods = entry.goodsMap || {}
		Object.keys(goods).forEach(goodsId => {
			const item = goods[goodsId] || {}
			result.push({
				orderNo: entry.orderNo || orderNo,
				orderGoodsId: item.orderGoodsId || item.id || goodsId,
				refundNum: Number(item.refundNum || 0),
				refundAmount: Number(item.refundAmount || 0),
				refundFlag: Number(item.refundFlag || (entry.order || {}).refundFlag || 0)
			})
		})
	})
	return result
}

export function buildBatchRefundSummary(selection = {}) {
	const items = selectedGoods(selection)
	const orderNos = {}
	let refundAmount = 0
	items.forEach(item => {
		orderNos[item.orderNo] = true
		refundAmount += item.refundAmount
	})
	return {
		itemCount: items.length,
		refundAmount: Number(refundAmount.toFixed(2)),
		orderCount: Object.keys(orderNos).length
	}
}

export function buildRefundApprovalPayload({ selection = {}, order, goods, status = REFUND_APPROVE_STATUS.AGREE, reason = '' } = {}) {
	const source = Object.keys(selection).length > 0
		? selection
		: toggleRefundSelection({}, order || {}, goods || {}, true)
	const refundOrderGoodsMap = {}
	selectedGoods(source).forEach(item => {
		if (!refundOrderGoodsMap[item.orderNo]) {
			refundOrderGoodsMap[item.orderNo] = { orderNo: item.orderNo, refundGoodsMap: {} }
		}
		if (item.refundFlag > 0) refundOrderGoodsMap[item.orderNo].refundFlag = item.refundFlag
		refundOrderGoodsMap[item.orderNo].refundGoodsMap[item.orderGoodsId] = {
			orderGoodsId: item.orderGoodsId,
			refundNum: item.refundNum,
			refundAmount: item.refundAmount
		}
	})
	const payload = { refundOrderGoodsMap, status: Number(status) }
	if (Number(status) === REFUND_APPROVE_STATUS.REJECT) payload.reason = reason || ''
	return payload
}
