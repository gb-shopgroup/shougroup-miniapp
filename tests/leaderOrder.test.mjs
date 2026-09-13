import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
	buildBatchRefundSummary,
	buildLeaderGoodsSummary,
	buildLeaderOrderCountQuery,
	buildLeaderOrderListRequest,
	buildLeaderOrderSummary,
	buildLeaderRefundListRequest,
	buildPartWriteOffPayload,
	buildRefundSelectionForOrder,
	buildRefundApprovalPayload,
	buildWriteOffPayload,
	getOrderStatusMeta,
	getRefundStatusMeta,
	normalizeLeaderDashboardSummary,
	normalizeLeaderGoodsSummaryItem,
	normalizeLeaderOrder,
	parseLeaderOrderScanResult,
	toggleRefundSelection
} from '../utils/leaderOrder.js'

const rawOrder = {
	orderNo: 'NO123',
	orderTime: '2026-08-29 12:00:00',
	orderPrice: 1980,
	shopName: '会飞的猪',
	groupName: '周末水果团',
	status: 1,
	receiptType: 1,
	trueName: '张三',
	telephone: '13800138000',
	pointId: 7,
	pointName: '服务驿站',
	pointAddress: '云南省昆明市五华区天骄北麓25栋',
	receiptCode: 'RC888',
	nickname: '团员A',
	mobile: '13900139000',
	avatar: '/avatar.png',
	refundFlag: 2,
	goods: [{
		id: 88,
		goodsId: 8,
		goodsName: '苹果',
		goodsImg: '/apple.png',
		goodsPrice: 660,
		goodsNum: 3,
		receiptNum: 1,
		applyRefund: 1,
		refundGoodsNum: 2,
		goodsUnit: '斤',
		skuId: 31,
		skuIds: '21',
		skuNames: '500g'
	}]
}

assert.deepEqual(buildLeaderOrderListRequest({
	keyword: '138',
	groupId: 9,
	pointId: 7,
	page: 2,
	pageSize: 10,
	statuses: [1, 2, 3],
	dateRange: { start: '2026-08-01', end: '2026-08-29' }
}), [
	{ keyword: '138', groupId: 9, pointId: 7, page: 2, pageSize: 10, status: 1 },
	{ keyword: '138', groupId: 9, pointId: 7, page: 2, pageSize: 10, status: 2 },
	{ keyword: '138', groupId: 9, pointId: 7, page: 2, pageSize: 10, status: 3 }
])

assert.deepEqual(buildLeaderOrderListRequest({ groupId: '9', pointId: '7', status: '2' }), {
	groupId: 9,
	pointId: 7,
	page: 1,
	pageSize: 10,
	status: 2
})

assert.deepEqual(buildLeaderRefundListRequest({
	keyword: '苹果',
	groupId: 9,
	pointId: 7,
	page: 1,
	pageSize: 20,
	applyStatus: 1
}), {
	keyword: '苹果',
	groupId: 9,
	pointId: 7,
	page: 1,
	pageSize: 20,
	applyStatus: 1
})

assert.deepEqual(buildLeaderOrderCountQuery({ groupId: 9, pointId: 7 }), { gid: 9, pid: 7 })

const order = normalizeLeaderOrder(rawOrder)
assert.equal(order.orderNo, 'NO123')
assert.equal(order.statusText, '待核销')
assert.equal(order.avatar, '/avatar.png')
assert.equal(order.orderPrice, 19.8)
assert.equal(order.goods[0].name, '苹果')
assert.equal(order.goods[0].price, 6.6)
assert.equal(order.goods[0].specText, '500g')
assert.equal(order.goods[0].skuId, 31)
assert.equal(order.goods[0].pendingWriteOffNum, 2)
assert.equal(order.goods[0].refundAmount, 13.2)
assert.equal(order.refundStatus, 1)
assert.equal(order.refundFlag, 2)
assert.equal(getOrderStatusMeta(3).text, '已核销')
assert.equal(getRefundStatusMeta(1).text, '待处理退货')
assert.equal(getRefundStatusMeta(2).text, '已退货')
assert.equal(getRefundStatusMeta(0).text, '售后')

assert.deepEqual(parseLeaderOrderScanResult({
	result: 'pagesA/order/index?action=verify&orderNo=NO123&receiptCode=RC888'
}), {
	action: 'verify',
	orderNo: 'NO123',
	receiptCode: 'RC888',
	isVerificationCode: true
})
assert.deepEqual(parseLeaderOrderScanResult({ result: 'https://example.com/?orderNo=NO123' }), {
	action: '',
	orderNo: 'NO123',
	receiptCode: '',
	isVerificationCode: false
})

const refreshedOrder = normalizeLeaderOrder({
	orderNo: 'NO125',
	status: 2,
	goodsInfoList: [{
		Id: 99,
		goodsName: '橙子',
		goodsNum: 2,
		receiptNum: 1
	}]
})
assert.equal(refreshedOrder.goods[0].id, 99)
assert.equal(refreshedOrder.goods[0].num, 2)
assert.equal(refreshedOrder.goods[0].receiptNum, 1)
assert.equal(refreshedOrder.goods[0].pendingWriteOffNum, 1)
assert.equal(normalizeLeaderOrder({ goods: [{ id: 100, goodsNum: 2, verifyNum: 1 }] }).goods[0].pendingWriteOffNum, 2)
assert.equal(normalizeLeaderOrder({ goods: [{ orderGoodsID: 101, goodsNum: 1 }] }).goods[0].id, 101)
assert.equal(normalizeLeaderOrder({ goods: [{ id: 102, goodsPrice: 500, refundAmount: 250 }] }).goods[0].refundAmount, 2.5)
assert.equal(normalizeLeaderOrder({ goods: [{ id: 103, goodsPrice: 100, goodsNum: 2, refundAmount: 0, applyRefund: 1 }] }).goods[0].refundAmount, 2)
assert.equal(normalizeLeaderOrder({ goods: [{ id: 104, goodsPrice: 0, price: 150, goodsNum: 2, applyRefund: 1 }] }).goods[0].refundAmount, 3)
assert.equal(normalizeLeaderOrder({ goods: [{ id: 105, goodsPrice: 100, goodsNum: 2, refundAmount: 0, applyRefund: 3 }] }).goods[0].refundAmount, 0)
const decimalMoneyOrder = normalizeLeaderOrder({
	orderNo: 'NO_DECIMAL',
	orderPrice: 0.02,
	goods: [{ id: 106, goodsName: '黄瓜1', goodsPrice: 0.01, goodsNum: 2, receiptNum: 0 }]
})
assert.equal(decimalMoneyOrder.orderPrice, 0.02)
assert.equal(decimalMoneyOrder.goods[0].price, 0.01)

assert.deepEqual(buildLeaderOrderSummary([order]), {
	validCount: 1,
	orderAmount: 19.8,
	refundAmount: 13.2
})
assert.deepEqual(normalizeLeaderDashboardSummary({
	total: 331,
	orderAmountTotal: 73568.23,
	refundAmountTotal: 735.23
}), {
	validCount: 331,
	orderAmount: 73568.23,
	refundAmount: 735.23
})
assert.deepEqual(normalizeLeaderDashboardSummary({
	orderTotal: 1,
	amountTotal: 6,
	refundAmountTotal: 0
}), {
	validCount: 1,
	orderAmount: 6,
	refundAmount: 0
})
assert.deepEqual(normalizeLeaderGoodsSummaryItem({
	id: 9,
	name: '商品名称',
	total: 55,
	num1: 29,
	num2: 26,
	unit: '件'
}), {
	key: '9',
	name: '商品名称',
	specText: '',
	totalNum: 55,
	verifiedNum: 29,
	pendingNum: 26,
	unit: '件'
})
assert.deepEqual(buildLeaderGoodsSummary([order]), [{
	key: '苹果__500g',
	name: '苹果',
	specText: '500g',
	totalNum: 3,
	pendingNum: 2
}])

const goodsOnlyRefundOrder = normalizeLeaderOrder({
	goods: [{ id: 1, goodsName: 'x', goodsPrice: 100, goodsNum: 1, applyRefund: 1 }]
})
assert.equal(goodsOnlyRefundOrder.refundStatusText, '待处理退货')

assert.deepEqual(buildWriteOffPayload(order, 7), { orderNo: 'NO123', pid: 7 })
assert.deepEqual(buildPartWriteOffPayload({
	orderNo: 'NO123',
	goods: [{ id: 88, verifyNum: 2, pendingWriteOffNum: 2 }, { id: 99, verifyNum: 0, pendingWriteOffNum: 1 }]
}, 7), {
	orderNo: 'NO123',
	pid: 7,
	goodsMap: {
		88: { id: 88, num: 2 }
	}
})

assert.deepEqual(buildPartWriteOffPayload({
	orderNo: 'NO124',
	goods: [{ id: 88, num: 5, receiptNum: 3, pendingWriteOffNum: 2, verifyNum: 5 }]
}, 7), {
	orderNo: 'NO124',
	pid: 7,
	goodsMap: {
		88: { id: 88, num: 2 }
	}
})

let selection = {}
selection = toggleRefundSelection(selection, order, order.goods[0], true)
assert.deepEqual(buildBatchRefundSummary(selection), { itemCount: 1, refundAmount: 13.2, orderCount: 1 })
assert.deepEqual(buildRefundSelectionForOrder(order), selection)

const fallbackSelection = toggleRefundSelection({}, { orderNo: 'NO124' }, {
	id: 89,
	price: 4,
	num: 3,
	applyRefund: 1
}, true)
assert.deepEqual(buildBatchRefundSummary(fallbackSelection), { itemCount: 1, refundAmount: 12, orderCount: 1 })

assert.deepEqual(buildRefundApprovalPayload({ selection, status: 1 }), {
	refundOrderGoodsMap: {
		NO123: {
			orderNo: 'NO123',
			refundFlag: 2,
			refundGoodsMap: {
				88: { orderGoodsId: 88, refundNum: 2, refundAmount: 13.2 }
			}
		}
	},
	status: 1
})
assert.equal(buildRefundApprovalPayload({ selection, status: 2, reason: '库存不足' }).reason, '库存不足')

function stripJsonComments(src) {
	let out = ''
	let inString = false
	let escaped = false
	let line = false
	let block = false
	for (let i = 0; i < src.length; i += 1) {
		const c = src[i]
		const n = src[i + 1]
		if (line) {
			if (c === '\n') {
				line = false
				out += c
			}
			continue
		}
		if (block) {
			if (c === '*' && n === '/') {
				block = false
				i += 1
			}
			continue
		}
		if (inString) {
			out += c
			if (escaped) escaped = false
			else if (c === '\\') escaped = true
			else if (c === '"') inString = false
			continue
		}
		if (c === '"') {
			inString = true
			out += c
			continue
		}
		if (c === '/' && n === '/') {
			line = true
			i += 1
			continue
		}
		if (c === '/' && n === '*') {
			block = true
			i += 1
			continue
		}
		out += c
	}
	return out
}

const pagesJson = JSON.parse(stripJsonComments(fs.readFileSync(new URL('../pages.json', import.meta.url), 'utf8')))
const pagesA = pagesJson.subPackages.find(item => item.root === 'pagesA')
const pagePaths = pagesA.pages.map(item => item.path)
assert.equal(pagePaths.includes('order/index'), true)
assert.equal(pagePaths.includes('order/refund'), true)
assert.equal(pagePaths.includes('order/detail'), true)
assert.equal(pagePaths.includes('order/refundDetail'), true)

const orderIndexUrl = new URL('../pagesA/order/index.vue', import.meta.url)
if (fs.existsSync(orderIndexUrl)) {
	const orderIndexSource = fs.readFileSync(orderIndexUrl, 'utf8')
	assert.equal(orderIndexSource.includes("mainTabs"), true)
	assert.equal(orderIndexSource.includes("全部自提点"), true)
	assert.equal(orderIndexSource.includes("getLeaderPointList"), true)
	assert.equal(orderIndexSource.includes("getLeaderPointList({ name: '' })"), true)
	assert.equal(orderIndexSource.includes("normalizeLeaderPoint"), true)
	assert.equal(orderIndexSource.includes("getCurrentLeaderPointId"), true)
	assert.equal(orderIndexSource.includes("syncPointFilterFromStorage"), true)
	assert.equal(orderIndexSource.includes("resetGoodsSummaryState"), true)
	assert.equal(orderIndexSource.includes("uni.setStorageSync('leader_select_pid'"), true)
	assert.equal(orderIndexSource.includes("onPointChange"), true)
	assert.equal(orderIndexSource.includes("pointId: 0"), true)
	assert.equal(orderIndexSource.includes("money-row"), true)
	assert.equal(orderIndexSource.includes("product-summary"), true)
	assert.equal(orderIndexSource.includes("summaryKeyword"), true)
	assert.equal(orderIndexSource.includes("orderKeyword"), true)
	assert.equal(orderIndexSource.includes("searchGoodsSummary"), true)
	assert.equal(orderIndexSource.includes("keyword: this.orderKeyword"), true)
	assert.equal(orderIndexSource.includes("getSummaryOrderInfo(params)"), true)
	assert.equal(orderIndexSource.includes("loadGoodsSummary"), true)
	assert.equal(orderIndexSource.includes("getSummaryOrderGoodsInfo(params)"), true)
	assert.equal(orderIndexSource.includes("goodsDisplayAmount(order, goods)"), true)
	assert.equal(orderIndexSource.includes("orderDisplayAmount(order)"), true)
	assert.equal(orderIndexSource.includes("this.refundStatusText(order) === '待处理退货'"), true)
	assert.equal(orderIndexSource.includes("getLeaderRefundOrderCount"), false)
	assert.equal(orderIndexSource.includes("normalizeLeaderDashboardSummary"), true)
	assert.equal(orderIndexSource.includes("normalizeLeaderGoodsSummaryItem"), true)
	assert.equal(orderIndexSource.includes("updateLocalSummary"), false)
	assert.equal(orderIndexSource.includes("商品名称"), true)
	assert.equal(orderIndexSource.includes("activeMainTab === 'shipping'"), false)
	assert.equal(orderIndexSource.includes("goBatchRefund"), false)
	assert.equal(orderIndexSource.includes("batch-row"), false)
	assert.equal(orderIndexSource.includes("batch-btn"), false)
	assert.equal(orderIndexSource.includes("批量退款"), false)
	assert.equal(orderIndexSource.includes("getLeaderRefundOrderList"), true)
	assert.equal(orderIndexSource.includes("isPendingRefundOrder"), true)
	assert.equal(orderIndexSource.includes("refundActionText"), false)
	assert.equal(orderIndexSource.includes("不同意退款"), true)
	assert.equal(orderIndexSource.includes("同意退款"), true)
	assert.equal(orderIndexSource.includes("查看详情"), true)
	assert.equal(orderIndexSource.includes("approveLeaderRefundOrder"), true)
	assert.equal(orderIndexSource.includes("buildRefundApprovalPayload"), true)
	assert.equal(orderIndexSource.includes("toggleRefundSelection"), false)
	assert.equal(orderIndexSource.includes("退款商品信息异常"), false)
	assert.equal(orderIndexSource.includes("buildOrderOnlyRefundPayload"), true)
	assert.equal(orderIndexSource.includes("buildRefundSelectionForOrder(order)"), true)
	assert.equal(orderIndexSource.includes("return '待处理退货'"), true)
	assert.equal(orderIndexSource.includes("order.refundStatusText || '售后'"), false)
	assert.equal(orderIndexSource.includes("无售后"), false)
	assert.equal(orderIndexSource.includes("parseScanResult"), true)
	assert.equal(orderIndexSource.includes("parseLeaderOrderScanResult"), true)
	assert.equal(orderIndexSource.includes("const launchScan = this.parseScanResult(options)"), true)
	assert.equal(orderIndexSource.includes("openScannedOrder(scan)"), true)
	assert.equal(orderIndexSource.includes("applyWriteOffMode"), true)
	assert.equal(orderIndexSource.includes("showScannedOrder"), true)
	assert.equal(orderIndexSource.includes("this.orderList = order.orderNo ? [order] : []"), true)
	assert.equal(orderIndexSource.includes("orderNo"), true)
	assert.equal(orderIndexSource.includes("receiptCode"), true)
	assert.equal(orderIndexSource.includes("'verify'"), true)
	assert.equal(orderIndexSource.includes("/pagesA/order/refundDetail?orderNo=' + orderNo"), true)
}

const dashboardSource = fs.readFileSync(new URL('../pagesA/dashboard/index.vue', import.meta.url), 'utf8')
assert.equal(dashboardSource.includes('uni.scanCode'), true)
assert.equal(dashboardSource.includes("scanType: ['qrCode']"), true)
assert.equal(dashboardSource.includes('parseLeaderOrderScanResult'), true)
assert.equal(dashboardSource.includes("'/pagesA/order/index?' + params.join('&')"), true)
assert.equal(dashboardSource.includes("/pagesA/order/index?action=scan"), false)

const orderDetailSource = fs.readFileSync(new URL('../pagesA/order/detail.vue', import.meta.url), 'utf8')
assert.equal(orderDetailSource.includes("confirmWriteOff"), true)
assert.equal(orderDetailSource.includes("submitWriteOff"), true)
assert.equal(orderDetailSource.includes("submitFullWriteOff"), true)
assert.equal(orderDetailSource.includes("submitPartWriteOff"), true)
assert.equal(orderDetailSource.includes("toggleGoods"), true)
assert.equal(orderDetailSource.includes("toggleAllGoods"), true)
assert.equal(orderDetailSource.includes("verifyGoodsCount"), true)
assert.equal(orderDetailSource.includes("sendLeaderOrderInfo"), false)
assert.equal(orderDetailSource.includes("writeOffLeaderOrder"), true)
assert.equal(orderDetailSource.includes("buildWriteOffPayload"), true)
assert.equal(orderDetailSource.includes("isPartWriteOff"), false)
assert.equal(orderDetailSource.includes("this.getOpenerEventChannel && this.getOpenerEventChannel()"), true)

const refundDetailSource = fs.readFileSync(new URL('../pagesA/order/refundDetail.vue', import.meta.url), 'utf8')
assert.equal(refundDetailSource.includes("待团长处理"), true)
assert.equal(refundDetailSource.includes("待处理退货"), true)
assert.equal(refundDetailSource.includes("已退货"), true)
assert.equal(refundDetailSource.includes("approveRefund"), true)
assert.equal(refundDetailSource.includes("openRejectReason"), true)
assert.equal(refundDetailSource.includes("REFUND_APPROVE_STATUS.AGREE"), true)
assert.equal(refundDetailSource.includes("售后历史"), true)
assert.equal(refundDetailSource.includes("getLeaderOrderInfo"), true)
assert.equal(refundDetailSource.includes("getRefundRecords"), true)
assert.equal(refundDetailSource.includes("loadOrderDetail()"), true)
assert.equal(refundDetailSource.includes("getRefundHistoryRows"), true)
assert.equal(refundDetailSource.includes("displayHistory"), true)
assert.equal(refundDetailSource.includes("团员'}申请退款"), true)

const refundReasonSource = fs.readFileSync(new URL('../pagesA/order/refundReason.vue', import.meta.url), 'utf8')
assert.equal(refundReasonSource.includes("typeof payload === 'number'"), true)

const refundPageSource = fs.readFileSync(new URL('../pagesA/order/refund.vue', import.meta.url), 'utf8')
assert.equal(refundPageSource.includes("批量退款"), true)
assert.equal(refundPageSource.includes("toggleGoods"), true)
assert.equal(refundPageSource.includes("confirmBatchRefund"), true)
assert.equal(refundPageSource.includes("buildBatchRefundSummary"), true)
assert.equal(refundPageSource.includes("approveLeaderRefundOrder"), true)
assert.equal(refundPageSource.includes("REFUND_APPROVE_STATUS.AGREE"), true)
assert.equal(refundPageSource.includes("goRefundDetail"), true)
assert.equal(refundPageSource.includes("/pagesA/order/refundDetail"), true)

const leaderApiSource = fs.readFileSync(new URL('../api/leader.js', import.meta.url), 'utf8')
	assert.equal(leaderApiSource.includes("url: '/order/leader/home/show/orders'"), true)
	assert.equal(leaderApiSource.includes("url: '/order/leader/home/order/goodsSummary'"), true)
	assert.equal(leaderApiSource.includes("return { pointId, pid: pointId }"), true)
	assert.equal(leaderApiSource.includes("pid: pointId"), true)
	assert.equal(leaderApiSource.includes("url: '/order/leader/summary/order'"), false)
assert.equal(leaderApiSource.includes("url: '/order/leader/summary/sku'"), true)
assert.equal(leaderApiSource.includes("url: queryUrl('/order/leader/order/writeOff', data)"), true)
assert.equal(leaderApiSource.includes("data: withLeaderOrderPoint(params)"), true)
assert.equal(leaderApiSource.includes("url: '/order/leader/refund/count'"), true)
assert.equal(leaderApiSource.includes("url: '/leader/summary/order'"), false)

console.log('leaderOrder tests passed')
