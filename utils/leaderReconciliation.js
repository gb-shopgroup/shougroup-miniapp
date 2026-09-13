export const RECONCILIATION_DISPLAY_MODES = [
	{ key: 'goods', text: '商品显示', value: 1 },
	{ key: 'order', text: '订单显示', value: 2 }
]

function firstValue(source = {}, keys = [], fallback = 0) {
	for (let index = 0; index < keys.length; index += 1) {
		const value = source[keys[index]]
		if (value !== undefined && value !== null && value !== '') return value
	}
	return fallback
}

function numberValue(source, keys) {
	return Number(firstValue(source, keys, 0) || 0)
}

export function buildLeaderReconciliationParams(input = {}) {
	const mode = input.mode === 'order' ? 'order' : 'goods'
	const params = {
		page: Math.max(1, Number(input.page || 1)),
		pageSize: Math.min(20, Math.max(1, Number(input.pageSize || 20))),
		type: mode === 'order' ? 2 : 1
	}
	if (input.startDate && input.endDate) {
		params.startDate = `${input.startDate} 00:00:00`
		params.endDate = `${input.endDate} 23:59:59`
	}
	return params
}

export function normalizeLeaderReconciliationSummary(source = {}) {
	if (typeof source === 'number') {
		return { validCount: Number(source || 0), orderAmount: 0, refundAmount: 0 }
	}
	return {
		validCount: numberValue(source, ['orderTotal', 'validCount', 'orderCount', 'totalCount', 'count', 'total', 'num']),
		orderAmount: numberValue(source, ['amountTotal', 'orderAmount', 'orderAmountTotal', 'totalAmount', 'orderPrice', 'amount', 'price']),
		refundAmount: numberValue(source, ['refundAmountTotal', 'refundAmount', 'refundTotal', 'refundPrice', 'refundFee'])
	}
}

export function resolveLeaderReconciliationList(source = {}) {
	if (Array.isArray(source)) return source
	if (Array.isArray(source.list)) return source.list
	if (Array.isArray(source.records)) return source.records
	if (Array.isArray(source.rows)) return source.rows
	return []
}

export function normalizeLeaderReconciliationRow(source = {}, mode = 'goods', index = 0) {
	const orderNo = String(firstValue(source, ['orderNo', 'orderNumber', 'pcode', 'no'], ''))
	const goodsName = String(firstValue(source, ['goodsName', 'name', 'title'], '商品名称'))
	return {
		key: String(firstValue(source, ['id', 'goodsId', 'orderId'], `${mode}_${orderNo || goodsName}_${index}`)),
		goodsName,
		orderNo,
		orderAmount: numberValue(source, ['orderAmount', 'orderPrice', 'totalAmount', 'amount', 'total', 'price']),
		refundAmount: numberValue(source, ['refundAmount', 'refundPrice', 'refundFee', 'refundTotal'])
	}
}

export function getLeaderReconciliationMode(mode) {
	return RECONCILIATION_DISPLAY_MODES.find(item => item.key === mode) || RECONCILIATION_DISPLAY_MODES[0]
}
