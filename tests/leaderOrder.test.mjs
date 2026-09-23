import assert from 'node:assert/strict'
import fs from 'node:fs'
import { mergeMemberOrderRefundRecords } from '../utils/memberOrder.js'
import {
	attachLeaderRefundSegments,
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
	buildLeaderOrderScanTarget,
	canLeaderOrderShowVerifyRecords,
	canLeaderOrderVerify,
	canLeaderWriteOffGoods,
	getOrderStatusMeta,
	getRefundStatusMeta,
	normalizeLeaderDashboardSummary,
	normalizeLeaderGoodsSummaryItem,
	normalizeLeaderOrder,
	buildLeaderRefundSelection,
	buildLeaderVerifyRecordSegments,
	formatLeaderVerifyRecord,
	isLeaderRefundApprovalEmpty,
	resolveLeaderRefundNum,
	normalizeLeaderOrderGoods,
	normalizeLeaderRefundApplyList,
	normalizeLeaderVerifyRecords,
	parseLeaderRefundGoodsSegments,
	parseLeaderOrderScanResult,
	toggleRefundSelection
} from '../utils/leaderOrder.js'

const rawOrder = {
	orderNo: 'NO123',
	orderTime: '2026-08-29 12:00:00',
	orderPrice: 19.8,
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
		goodsPrice: 6.6,
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

// 后端 LeaderOrderListRequest 新增 startDate/endDate（yyyy-MM-dd，成对传入）
assert.deepEqual(buildLeaderOrderListRequest({
	keyword: '138',
	groupId: 9,
	pointId: 7,
	page: 2,
	pageSize: 10,
	statuses: [1, 2, 3],
	startDate: '2026-08-01',
	endDate: '2026-08-29'
}), [
	{ keyword: '138', groupId: 9, pointId: 7, page: 2, pageSize: 10, startDate: '2026-08-01', endDate: '2026-08-29', status: 1 },
	{ keyword: '138', groupId: 9, pointId: 7, page: 2, pageSize: 10, startDate: '2026-08-01', endDate: '2026-08-29', status: 2 },
	{ keyword: '138', groupId: 9, pointId: 7, page: 2, pageSize: 10, startDate: '2026-08-01', endDate: '2026-08-29', status: 3 }
])

// 未选日期 / 只给一端 都不下发日期字段
assert.deepEqual(buildLeaderOrderListRequest({ groupId: 9, startDate: '2026-08-01' }), {
	groupId: 9,
	page: 1,
	pageSize: 10
})
assert.deepEqual(buildLeaderRefundListRequest({ groupId: 9, endDate: '2026-08-29' }), {
	groupId: 9,
	page: 1,
	pageSize: 10
})
assert.deepEqual(buildLeaderRefundListRequest({
	groupId: 9,
	applyStatus: 1,
	startDate: '2026-09-17',
	endDate: '2026-09-17'
}), {
	groupId: 9,
	page: 1,
	pageSize: 10,
	startDate: '2026-09-17',
	endDate: '2026-09-17',
	applyStatus: 1
})

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
assert.equal(order.statusText, '待收货')
assert.equal(order.avatar, '/avatar.png')
assert.equal(order.orderPrice, 19.8)
assert.equal(order.goods[0].name, '苹果')
assert.equal(order.goods[0].price, 6.6)
assert.equal(order.goods[0].specText, '500g')
// 规格文本按接口响应字段 goodsInfo 取值，并保留历史字段兜底。
assert.equal(normalizeLeaderOrderGoods({ goodsInfo: '1kg', skuId: 31, skuIds: '21' }).specText, '1kg')
assert.equal(normalizeLeaderOrderGoods({ skuNames: '1kg' }).specText, '1kg')
assert.equal(normalizeLeaderOrderGoods({ skuName: '1kg' }).specText, '1kg')
assert.equal(normalizeLeaderOrderGoods({ packName: '2kg装' }).specText, '2kg装')
// 只有 skuId/skuIds、没有名称时无法解析出规格文本，不得凭空造值。
assert.equal(normalizeLeaderOrderGoods({ goodsInfo: '', skuId: 31, skuIds: '21' }).specText, '')
assert.equal(order.goods[0].skuId, 31)
assert.equal(order.goods[0].pendingWriteOffNum, 2)
assert.equal(order.goods[0].refundAmount, 13.2)
assert.equal(order.refundStatus, 1)
assert.equal(order.refundFlag, 2)
assert.equal(getOrderStatusMeta(2).text, '部分收货')
assert.equal(getOrderStatusMeta(3).text, '已提货')
assert.equal(getRefundStatusMeta(1).text, '待处理退货')
assert.equal(getRefundStatusMeta(2).text, '已退货')
assert.equal(getRefundStatusMeta(0).text, '售后')

assert.deepEqual(parseLeaderOrderScanResult({
	result: 'pagesA/order/index?action=verify&orderNo=NO123&receiptCode=RC888'
}), {
	action: 'verify',
	orderNo: 'NO123',
	receiptCode: 'RC888',
	shopId: '',
	isVerificationCode: true
})
assert.deepEqual(parseLeaderOrderScanResult({ result: 'https://example.com/?orderNo=NO123' }), {
	action: '',
	orderNo: 'NO123',
	receiptCode: '',
	shopId: '',
	isVerificationCode: false
})
// 后端实际产出的小程序码只带 orderNo，不带 action/receiptCode。
// 真机抓到的原始返回：{"scanType":"WX_CODE","path":"pages/order/index?scene=orderNo=200001743981000001"}
// 解析器要能取出 orderNo，但 isVerificationCode 必须保持严格语义（不靠放宽它来兜底），
// 是否进核销由订单自身的可核销商品决定（见 buildLeaderOrderScanTarget）。
assert.deepEqual(parseLeaderOrderScanResult({
	scanType: 'WX_CODE',
	path: 'pages/order/index?scene=orderNo=200001743981000001'
}), {
	action: '',
	orderNo: '200001743981000001',
	receiptCode: '',
	shopId: '',
	isVerificationCode: false
})
// scene 被百分号编码时同样要能取到订单号
assert.deepEqual(parseLeaderOrderScanResult({
	scanType: 'WX_CODE',
	path: 'pages/order/index?scene=orderNo%3DNO456'
}), {
	action: '',
	orderNo: 'NO456',
	receiptCode: '',
	shopId: '',
	isVerificationCode: false
})
// 只有 scene 字段、没有 path 时也要解析
assert.deepEqual(parseLeaderOrderScanResult({
	scanType: 'WX_CODE',
	scene: 'orderNo=NO789'
}), {
	action: '',
	orderNo: 'NO789',
	receiptCode: '',
	shopId: '',
	isVerificationCode: false
})
// 兼容后端旧格式 mid=&oid=
assert.deepEqual(parseLeaderOrderScanResult({
	scanType: 'WX_CODE',
	path: 'pagesA/order/index?scene=mid=12&oid=NO999'
}), {
	action: '',
	orderNo: 'NO999',
	receiptCode: '',
	shopId: '',
	isVerificationCode: false
})
// 普通二维码且无核销特征时不应误判为核销码
assert.deepEqual(parseLeaderOrderScanResult({
	scanType: 'QR_CODE',
	result: 'https://example.com/?orderNo=NO123'
}), {
	action: '',
	orderNo: 'NO123',
	receiptCode: '',
	shopId: '',
	isVerificationCode: false
})
// 门店核销码：真机抓到的返回 {"scanType":"WX_CODE","path":"pages/order/index?scene=shopId=4"}
// 团长扫到它应识别为门店码（有 shopId、无 orderNo），给出「让顾客自助核销」的提示。
assert.deepEqual(parseLeaderOrderScanResult({
	scanType: 'WX_CODE',
	path: 'pages/order/index?scene=shopId=4'
}), {
	action: '',
	orderNo: '',
	receiptCode: '',
	shopId: '4',
	isVerificationCode: false
})
// scene 里的 shopId 被百分号编码时同样要能取到
assert.deepEqual(parseLeaderOrderScanResult({
	scanType: 'WX_CODE',
	path: 'pages/order/index?scene=shopId%3D7'
}), {
	action: '',
	orderNo: '',
	receiptCode: '',
	shopId: '7',
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
// 金额一律按接口返回的「元」原样使用，前端不做分→元换算。
assert.equal(normalizeLeaderOrder({ goods: [{ id: 102, goodsPrice: 500, refundAmount: 250 }] }).goods[0].refundAmount, 250)
assert.equal(normalizeLeaderOrder({ goods: [{ id: 103, goodsPrice: 100, goodsNum: 2, refundAmount: 0, applyRefund: 1 }] }).goods[0].refundAmount, 200)
assert.equal(normalizeLeaderOrder({ goods: [{ id: 104, goodsPrice: 0, price: 150, goodsNum: 2, applyRefund: 1 }] }).goods[0].refundAmount, 300)
assert.equal(normalizeLeaderOrder({ goods: [{ id: 105, goodsPrice: 100, goodsNum: 2, refundAmount: 0, applyRefund: 3 }] }).goods[0].refundAmount, 0)
// 整数金额是「整元」，绝不能被当成「分」再除以 100（¥3 不能显示成 ¥0.03）。
assert.equal(normalizeLeaderOrder({ orderPrice: 3 }).orderPrice, 3)
assert.equal(normalizeLeaderOrder({ goods: [{ goodsPrice: 3 }] }).goods[0].price, 3)
assert.equal(normalizeLeaderOrder({ goods: [{ goodsPrice: 3, goodsNum: 2, applyRefund: 1 }] }).goods[0].refundAmount, 6)
assert.equal(normalizeLeaderOrder({ goods: [{ goodsPrice: 0.01, goodsNum: 3, applyRefund: 1 }] }).goods[0].refundAmount, 0.03)
assert.equal(normalizeLeaderOrder({ goods: [{ id: 106, goodsNum: 2, receiptNum: 1, applyRefund: 2 }] }).goods[0].verifyNum, 0)
assert.equal(normalizeLeaderOrder({ actionReason: '反反复复', extraReason: '补充说明内容' }).reason, '反反复复')
assert.equal(normalizeLeaderOrder({ actionReason: '反反复复', extraReason: '补充说明内容' }).refundDesc, '补充说明内容')
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
assert.equal(canLeaderWriteOffGoods({ pendingWriteOffNum: 1, applyRefund: 0 }), true)
// 只看扣除退款占用后的待核销数量（选项 B：审核中的占用已计入 refundNum，剩余可核销）
assert.equal(canLeaderWriteOffGoods({ pendingWriteOffNum: 1, applyRefund: 1 }), true)
assert.equal(canLeaderWriteOffGoods({ pendingWriteOffNum: 0, applyRefund: 1 }), false)
assert.equal(canLeaderWriteOffGoods({ pendingWriteOffNum: 1, applyRefund: 2 }), true)
assert.equal(canLeaderWriteOffGoods({ pendingWriteOffNum: 1, applyRefund: 3 }), true)
assert.equal(canLeaderWriteOffGoods({ pendingWriteOffNum: 0, applyRefund: 0 }), false)

// 【真实订单回归 200002655995000001】买3/已收2/退货退款1（退的是已收部分）→ 还剩 1 件可核销
const realOrder = normalizeLeaderOrder({
	orderNo: '200002655995000001',
	status: 5,
	pointId: 12,
	goods: [
		{ id: 129, goodsName: '望京大玉米', goodsNum: 3, receiptNum: 2, applyRefund: 2, refundGoodsNum: 1, refundNum: 0, goodsPrice: 0.8, goodsUnit: '个', skuNames: '3*每个500克' },
		{ id: 130, goodsName: '望京外来品种黑玉米', goodsNum: 3, receiptNum: 3, applyRefund: 2, refundGoodsNum: 2, refundNum: 0, goodsPrice: 0.4, goodsUnit: '个', skuNames: '每个约300克' }
	]
})
assert.equal(realOrder.goods[0].pendingWriteOffNum, 1)
assert.equal(canLeaderWriteOffGoods(realOrder.goods[0]), true)
assert.equal(realOrder.goods[1].pendingWriteOffNum, 0)
assert.equal(canLeaderWriteOffGoods(realOrder.goods[1]), false)
// 订单还有可核销商品 → 列表要给出「核销订单」入口（状态 5 不再被整体挡掉）
assert.equal(canLeaderOrderVerify(realOrder), true)
// 待核销数量必须扣掉「退待收货部分」：买3/收0/申请退3(占用) → 0
const fullyRefundNumGoods = normalizeLeaderOrder({ orderNo: 'x', status: 2, goods: [{ goodsNum: 3, receiptNum: 0, refundNum: 3, applyRefund: 2 }] }).goods[0]
assert.equal(fullyRefundNumGoods.pendingWriteOffNum, 0)
assert.equal(canLeaderWriteOffGoods(fullyRefundNumGoods), false)

// 扫码后的落点决策：还有可核销商品 → 进核销模式；否则 → 只读查看。
// 两种情况都进订单详情页，不再落到订单列表。
assert.deepEqual(buildLeaderOrderScanTarget({
	orderNo: 'NO1',
	status: 2,
	goods: [{ id: 1, pendingWriteOffNum: 2, applyRefund: 0 }]
}), { orderNo: 'NO1', mode: 'verify' })
// 全部已核销
assert.deepEqual(buildLeaderOrderScanTarget({
	orderNo: 'NO2',
	status: 3,
	goods: [{ id: 1, pendingWriteOffNum: 0, applyRefund: 0 }]
}), { orderNo: 'NO2', mode: 'view' })
// 已取消/已退款：商品行可能还有待核销数量（脏数据），但绝不能进核销
assert.deepEqual(buildLeaderOrderScanTarget({
	orderNo: 'NO4',
	status: 6,
	goods: [{ id: 1, pendingWriteOffNum: 2, applyRefund: 0 }]
}), { orderNo: 'NO4', mode: 'view' })
// 选项 B：售后审核中(1) 但仍有待核销数量 → 可核销
assert.deepEqual(buildLeaderOrderScanTarget({
	orderNo: 'NO3',
	status: 2,
	goods: [{ id: 1, pendingWriteOffNum: 2, applyRefund: 1 }]
}), { orderNo: 'NO3', mode: 'verify' })
// 待核销数量为 0（已被退款占用 / 已收完）→ 只读查看
assert.deepEqual(buildLeaderOrderScanTarget({
	orderNo: 'NO7',
	status: 2,
	goods: [{ id: 1, pendingWriteOffNum: 0, applyRefund: 1 }]
}), { orderNo: 'NO7', mode: 'view' })
// 待支付订单：同理不可核销
assert.deepEqual(buildLeaderOrderScanTarget({
	orderNo: 'NO6',
	status: 0,
	goods: [{ id: 1, pendingWriteOffNum: 2, applyRefund: 0 }]
}), { orderNo: 'NO6', mode: 'view' })
// 无商品行
assert.deepEqual(buildLeaderOrderScanTarget({ orderNo: 'NO5', status: 2, goods: [] }), { orderNo: 'NO5', mode: 'view' })
assert.equal(canLeaderOrderVerify({ status: 2, goods: [{ id: 1, pendingWriteOffNum: 1, applyRefund: 0 }] }), true)
assert.equal(canLeaderOrderVerify({ status: 2, goods: [{ id: 1, pendingWriteOffNum: 0, applyRefund: 0 }] }), false)

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

// 所有还有待核销数量的行都进核销体（applyRefund 不再作为门槛）
assert.deepEqual(buildPartWriteOffPayload({
	orderNo: 'NO126',
	pointId: 7,
	goods: [
		{ id: 89, verifyNum: 1, pendingWriteOffNum: 1, applyRefund: 1 },
		{ id: 90, verifyNum: 1, pendingWriteOffNum: 1, applyRefund: 2 },
		{ id: 91, verifyNum: 1, pendingWriteOffNum: 1, applyRefund: 3 },
		{ id: 92, verifyNum: 1, pendingWriteOffNum: 1, applyRefund: 0 }
	]
}), {
	orderNo: 'NO126',
	pid: 7,
	goodsMap: {
		89: { id: 89, num: 1 },
		90: { id: 90, num: 1 },
		91: { id: 91, num: 1 },
		92: { id: 92, num: 1 }
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

const currentRecordSelection = toggleRefundSelection({}, { orderNo: 'NO125' }, {
	id: 90,
	price: 0.01,
	num: 2,
	applyRefund: 1,
	currentRefundNum: 1,
	currentRefundAmount: 0.01
}, true)
assert.deepEqual(buildBatchRefundSummary(currentRecordSelection), { itemCount: 1, refundAmount: 0.01, orderCount: 1 })

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
	assert.equal(orderIndexSource.includes('v-if="canOpenVerifyDetail(order)" class="refund-btn"'), true)
	assert.equal(orderIndexSource.includes("approveLeaderRefundOrder"), true)
	assert.equal(orderIndexSource.includes("buildRefundApprovalPayload"), true)
	assert.equal(orderIndexSource.includes("toggleRefundSelection"), false)
	assert.equal(orderIndexSource.includes("退款商品信息异常"), false)
	// 【回归】内联「同意/不同意」是同一接口的第三条路径：
	// 修复前 selection 为空时会发 refundGoodsMap:{ }（构造上必然非法），且没有守卫。
	assert.equal(orderIndexSource.includes("buildOrderOnlyRefundPayload"), false)
	assert.equal(orderIndexSource.includes("buildLeaderRefundSelection"), true)
	assert.equal(orderIndexSource.includes("isLeaderRefundApprovalEmpty(payload)"), true)
	assert.equal(orderIndexSource.includes("getRefundRecords({ orderNo: key })"), true)
	assert.equal(orderIndexSource.includes("normalizeMemberRefundRecord"), true)
	assert.equal(orderIndexSource.includes("'售后记录加载失败，请重试'"), true)
	// 提示后要立刻跳售后详情：用 modal（可带确认回调），toast 会被跳转打断
	assert.equal(orderIndexSource.includes("'未获取到退款商品，请进入售后详情处理'"), true)
	assert.equal(orderIndexSource.includes("confirmText: '查看详情'"), true)
	assert.equal(orderIndexSource.includes("return '待处理退货'"), true)
	assert.equal(orderIndexSource.includes("order.refundStatusText || '售后'"), false)
	assert.equal(orderIndexSource.includes("无售后"), false)
	assert.equal(orderIndexSource.includes("parseScanResult"), true)
	assert.equal(orderIndexSource.includes("parseLeaderOrderScanResult"), true)
	assert.equal(orderIndexSource.includes("const launchScan = this.parseScanResult(options)"), true)
	assert.equal(orderIndexSource.includes("openScannedOrder(scan)"), true)
	assert.equal(orderIndexSource.includes("applyWriteOffMode"), true)
	// 扫码不再把订单塞进列表内联展示，而是直接路由到订单详情（核销/查看模式）
	assert.equal(orderIndexSource.includes("showScannedOrder"), false)
	assert.equal(orderIndexSource.includes("this.goOrderDetail(target.order, target.mode)"), true)
	assert.equal(orderIndexSource.includes("buildLeaderOrderScanTarget"), true)
	assert.equal(orderIndexSource.includes("hasAfterSalesDetail(order)"), true)
		assert.equal(orderIndexSource.includes("activeMainTab !== 'refund' && (canOpenVerifyDetail(order) || hasAfterSalesDetail(order))"), true)
		assert.equal(orderIndexSource.includes("查看售后"), true)
		assert.equal(orderIndexSource.includes("核销订单"), true)
		assert.equal(orderIndexSource.includes("if (this.activeMainTab === 'refund')"), true)
		assert.equal(orderIndexSource.includes("this.activeMainTab === 'refund' || this.hasAfterSalesDetail(order)"), false)
		assert.equal(orderIndexSource.includes("canOpenVerifyDetail(order)"), true)
		// 核销资格判断已抽到共享 helper，页面只做委托，保证扫码与列表两条路径结论一致
		assert.equal(orderIndexSource.includes("return canLeaderOrderVerify(order)"), true)
		assert.equal(orderIndexSource.includes("Math.max(Number(goods.num || 0) - Number(goods.receiptNum || 0), 0) > 0"), false)
		assert.equal(orderIndexSource.includes("return [1, 2].includes(Number(order.status))"), false)
		assert.equal(orderIndexSource.includes(`:key="'sub-tabs-' + activeMainTab"`), true)
		assert.equal(orderIndexSource.includes(`:key="activeMainTab + '-' + tab.key"`), true)
		assert.equal(orderIndexSource.includes("isActiveSubTab(tab.key)"), true)
		assert.equal(orderIndexSource.includes("activeWriteOffSubTab"), true)
		assert.equal(orderIndexSource.includes("activeRefundSubTab"), true)
		assert.equal(orderIndexSource.includes("activeSubTab: ''"), false)
		assert.equal(orderIndexSource.includes("this.goOrderDetail(order, this.canOpenVerifyDetail(order) ? 'verify' : 'view')"), true)
	assert.equal(orderIndexSource.includes("this.activeMainTab !== 'writeOff' && this.hasAfterSalesDetail(order)"), false)
	assert.equal(orderIndexSource.includes("orderNo"), true)
	assert.equal(orderIndexSource.includes("receiptCode"), true)
	assert.equal(orderIndexSource.includes("'verify'"), true)
	assert.equal(orderIndexSource.includes("/pagesA/order/refundDetail?orderNo=' + orderNo"), true)
	// 订单商品行必须展示接口返回的 SKU 规格（goodsInfo → specText）。
	// 订单商品行必须展示接口返回的 SKU 规格（goodsInfo → specText），且不能被名称的省略号截掉。
	assert.equal(orderIndexSource.includes('<text v-if="goods.specText" class="goods-spec">{{ goods.specText }}</text>'), true)
	assert.equal(orderIndexSource.includes('class="goods-main"'), true)
	// 两种入口共用同一页：控制台进入为全局筛选视图，团购详情进入（带 groupId）为完整视图。
	assert.equal(orderIndexSource.includes('fromGroupDetail: false'), true)
	assert.equal(orderIndexSource.includes('const routeGroupId = Number((options && options.groupId) || 0)'), true)
	assert.equal(orderIndexSource.includes('this.fromGroupDetail = routeGroupId > 0'), true)
	assert.equal(orderIndexSource.includes('if (this.fromGroupDetail) {'), true)
	assert.equal(orderIndexSource.includes('<view v-if="!fromGroupDetail" class="filter-row">'), true)
	// 筛选器按设计稿左右各占一半、各自居中，箭头用细线 chevron 而非文本字符
	assert.equal(orderIndexSource.includes('<view class="filter-cell">'), true)
	assert.equal(orderIndexSource.includes('<view class="filter-value">{{ currentGroupName }}</view>'), true)
	assert.equal(orderIndexSource.includes('showActionSheet'), false)
	assert.equal(orderIndexSource.includes('⌄'), false)
	assert.match(orderIndexSource, /\.filter-value::after \{[\s\S]*?border-right: 2rpx solid #b8b8b8;/)
	assert.match(orderIndexSource, /\.filter-row \{[\s\S]*?border-bottom: 1rpx solid #ececec;/)
	// picker 在真机是块级满宽，居中必须靠内层 text-align，不能靠 justify-content
	assert.match(orderIndexSource, /\.filter-picker \{[\s\S]*?text-align: center;/)
	assert.equal(orderIndexSource.includes('.filter-cell {\n\tflex: 1;\n\tmin-width: 0;\n\tdisplay: flex;'), false)
	// 控制台入口搜索框：放大镜 + 居中占位、无搜索按钮
	assert.equal(orderIndexSource.includes('<view v-if="!fromGroupDetail" class="order-search order-search-global">'), true)
	assert.equal(orderIndexSource.includes('class="search-icon"'), true)
	assert.equal(orderIndexSource.includes('<view v-else class="order-search">'), true)
	assert.equal(orderIndexSource.includes('<view v-else class="detail-head">'), true)
	// v-if/v-else 之间严禁夹注释：小程序模板编译会断掉 else 链，导致两套头部同时渲染
	assert.equal(/<\/view>\s*<!--[\s\S]*?-->\s*<view v-else/.test(orderIndexSource), false)
	// 日期筛选：弹层选开始/结束（交互与对账单一致），确认后下发并刷新
	assert.equal(orderIndexSource.includes('<view class="filter-picker" @click="openDatePicker">'), true)
	assert.equal(orderIndexSource.includes('openDatePicker() {'), true)
	assert.equal(orderIndexSource.includes('onDraftDateChange(key, event) {'), true)
	assert.equal(orderIndexSource.includes("uni.showToast({ title: '请选择开始和结束日期', icon: 'none' })"), true)
	assert.equal(orderIndexSource.includes("uni.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })"), true)
	assert.match(orderIndexSource, /confirmDate\(\) \{[\s\S]*?this\.refreshOrders\(\)/)
	assert.match(orderIndexSource, /clearDate\(\) \{[\s\S]*?this\.refreshOrders\(\)/)
	assert.equal(orderIndexSource.includes('dateLabel'), false)
	assert.equal(orderIndexSource.includes('clearDateFilter'), false)
	assert.equal(orderIndexSource.includes('⌄'), false)
	assert.match(orderIndexSource, /\.date-inputs \{[\s\S]*?gap: 20rpx;/)
	assert.match(orderIndexSource, /\.date-value \{[\s\S]*?flex-direction: column;/)
	assert.match(orderIndexSource, /\.filter-picker \{[\s\S]*?text-align: center;/)
	// 日期筛选必须真正下发到订单/售后请求（startDate/endDate，成对）
	assert.equal(orderIndexSource.includes('startDate: this.dateRange.start,'), true)
	assert.equal(orderIndexSource.includes('endDate: this.dateRange.end,'), true)
	const leaderOrderSource = fs.readFileSync(new URL('../utils/leaderOrder.js', import.meta.url), 'utf8')
	assert.match(leaderOrderSource, /if \(startDate && endDate\) \{[\s\S]*?base\.startDate = startDate/)
	// 控制台入口标题按设计稿为「订单」
	assert.equal(orderIndexSource.includes('return this.fromGroupDetail ? \'查看订单\' : \'订单\''), true)
	// 全局视图不套用已保存的自提点筛选，也不拉取被隐藏的汇总数据。
	assert.equal(orderIndexSource.includes('// 控制台入口是全局订单视图，不套用历史保存的自提点筛选'), true)
	assert.equal(orderIndexSource.includes('// 全局视图顶部是筛选器，不展示金额概览与商品汇总，无需拉取对应数据'), true)
	// 商品汇总请求同样要带 groupId。
	assert.equal(orderIndexSource.includes('groupId: this.groupId,'), true)
}

const dashboardSource = fs.readFileSync(new URL('../pagesA/dashboard/index.vue', import.meta.url), 'utf8')
assert.equal(dashboardSource.includes('uni.scanCode'), true)
// 不能限定 scanType：限定 ['qrCode'] 会导致微信小程序码扫不出来（工作台扫码无反应的根因）。
assert.equal(dashboardSource.includes("scanType: ['qrCode']"), false)
assert.equal(/scanType\s*:/.test(dashboardSource), false)
assert.equal(dashboardSource.includes('parseLeaderOrderScanResult'), true)
assert.equal(dashboardSource.includes("'/pagesA/order/index?' + params.join('&')"), true)
assert.equal(dashboardSource.includes("/pagesA/order/index?action=scan"), false)

const orderDetailSource = fs.readFileSync(new URL('../pagesA/order/detail.vue', import.meta.url), 'utf8')
// 团长用微信扫 C 端订单核销码时，参数在 scene 里（scene=orderNo=X），页面必须自己拆出来，
// 否则扫码进入拿不到 orderNo、页面空白。
assert.equal(orderDetailSource.includes('if (options.scene)'), true)
assert.equal(orderDetailSource.includes('const fallbackOrderNo = params.orderNo || params.id'), true)
assert.equal(orderDetailSource.includes("loadScannedOrderByNo(fallbackOrderNo, fallbackMode)"), true)
assert.equal(orderDetailSource.includes("buildLeaderOrderScanTarget"), true)
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
assert.equal(orderDetailSource.includes("hasVerifiableGoods()"), true)
assert.equal(orderDetailSource.includes("return this.mode === 'verify' && this.hasVerifiableGoods"), true)
assert.equal(orderDetailSource.includes("this.mode === 'verify' && [1, 2].includes(Number(this.orderInfo.status || 0))"), false)
assert.equal(orderDetailSource.includes("canWriteOffGoods(goods)"), true)
assert.equal(orderDetailSource.includes("canLeaderWriteOffGoods(goods)"), true)
assert.equal(orderDetailSource.includes("const pendingGoods = this.orderInfo.goods.filter(item => canLeaderWriteOffGoods(item))"), true)
assert.equal(orderDetailSource.includes("pendingGoods.length > 0 && pendingGoods.length === goods.length && this.isAllChecked"), true)
// 核销记录区块吃新接口的 verifyRecords（仅订单详情接口下发），history 仅作兜底
assert.equal(orderDetailSource.includes("const records = this.orderInfo.verifyRecords"), true)
// 核销入口：不能只看商品行，必须排除待支付(0)/已退款(4)/已取消(6)
assert.equal(canLeaderOrderVerify(normalizeLeaderOrder({ status: 1, goods: [{ goodsNum: 3, receiptNum: 1 }] })), true)
assert.equal(canLeaderOrderVerify(normalizeLeaderOrder({ status: 2, goods: [{ goodsNum: 3, receiptNum: 1 }] })), true)
assert.equal(canLeaderOrderVerify(normalizeLeaderOrder({ status: 5, goods: [{ goodsNum: 3, receiptNum: 1 }] })), true)
assert.equal(canLeaderOrderVerify(normalizeLeaderOrder({ status: 6, goods: [{ goodsNum: 3, receiptNum: 0 }] })), false)
assert.equal(canLeaderOrderVerify(normalizeLeaderOrder({ status: 4, goods: [{ goodsNum: 3, receiptNum: 0 }] })), false)
assert.equal(canLeaderOrderVerify(normalizeLeaderOrder({ status: 0, goods: [{ goodsNum: 3, receiptNum: 0 }] })), false)
assert.equal(canLeaderOrderVerify(normalizeLeaderOrder({ status: 3, goods: [{ goodsNum: 3, receiptNum: 3 }] })), false)
// 售后中的行不可核销，但同单其它行仍可核销
assert.equal(canLeaderOrderVerify(normalizeLeaderOrder({ status: 2, goods: [{ goodsNum: 3, receiptNum: 1, applyRefund: 1 }, { goodsNum: 2, receiptNum: 0 }] })), true)
// 详情页的核销模式判定与列表/扫码共用同一函数
assert.equal(orderDetailSource.includes('return canLeaderOrderVerify(this.orderInfo)'), true)
assert.equal(orderDetailSource.includes('canLeaderOrderVerify,'), true)

// 核销记录展示条件（按用户口径）：只有「未支付(0)」和「确实没有记录」才空；
// 接口一旦下发 verifyRecords 就必须展示（退款/退货把收退数量清零也不例外）
assert.equal(canLeaderOrderShowVerifyRecords(normalizeLeaderOrder({
	status: 4,
	goods: [{ goodsNum: 3, receiptNum: 3, refundGoodsNum: 3, refundNum: 0 }],
	verifyRecords: [{ id: 9, verifyType: 0, staffName: '彭于晏', verifyGoodsMsg: [{ goodsName: '蜜桃', verifyNum: 3 }] }]
})), true)
// 已退款但接口没有记录 → 不展示
assert.equal(canLeaderOrderShowVerifyRecords(normalizeLeaderOrder({ status: 4, goods: [{ goodsNum: 3, receiptNum: 0 }] })), false)
// 未支付 → 不展示（即使商品行有已收数量这种脏数据）
assert.equal(canLeaderOrderShowVerifyRecords(normalizeLeaderOrder({ status: 0, goods: [{ goodsNum: 3, receiptNum: 3 }] })), false)
// 已取消但历史上核销过 → 展示
assert.equal(canLeaderOrderShowVerifyRecords(normalizeLeaderOrder({ status: 6, goods: [{ goodsNum: 1, receiptNum: 1 }], verifyRecords: [{ id: 1, verifyType: 2, staffName: 'x', verifyGoodsMsg: [{ goodsName: 'a', verifyNum: 1 }] }] })), true)

// 详情页：渠道数据（列表行）到达后也必须拉一次详情，否则「查看订单」模式拿不到 verifyRecords
assert.equal(orderDetailSource.includes("this.refreshLatestOrderInfo()\n\t\t\t})"), true)
assert.equal(orderDetailSource.includes('详情还在加载时不要抢先显示'), false)
assert.equal(orderDetailSource.includes("{{ refreshingDetail ? '加载中...' : '暂无核销记录' }}"), true)

// 核销记录区块的展示条件：不能挂在 isVerifyMode 上（查看订单模式 / 已提货无待核销商品时会被隐藏）
assert.equal(orderDetailSource.includes('<view v-if="showVerifyRecords" class="section">'), true)
assert.equal(orderDetailSource.includes('return canLeaderOrderShowVerifyRecords(this.orderInfo)'), true)
assert.equal(orderDetailSource.includes("canLeaderOrderShowVerifyRecords,"), true)
// 渠道数据（列表行，不带 verifyRecords）不得清空已取到的核销记录
assert.equal(orderDetailSource.includes('verifyRecords: next.verifyRecords.length ? next.verifyRecords : (this.orderInfo.verifyRecords || [])'), true)
assert.equal(orderDetailSource.includes("historySegments(item) {"), true)
assert.equal(orderDetailSource.includes("return buildLeaderVerifyRecordSegments(item)"), true)
assert.equal(orderDetailSource.includes("class=\"verify-qty\""), true)
assert.equal(orderDetailSource.includes(".verify-qty { color: #ff3b22; }"), true)
const leaderOrderUtilSource = fs.readFileSync(new URL('../utils/leaderOrder.js', import.meta.url), 'utf8')
assert.equal(leaderOrderUtilSource.includes("verifyRecords: normalizeLeaderVerifyRecords(row.verifyRecords)"), true)

// ===== 关键操作失败提示：请求层静默 + 页面 modal（金额/核销类必须让团长看清后端原文）=====
const batchRefundSource = fs.readFileSync(new URL('../pagesA/order/refund.vue', import.meta.url), 'utf8')
assert.equal(batchRefundSource.includes('approveLeaderRefundOrder(buildRefundApprovalPayload({ selection: this.selection, status: REFUND_APPROVE_STATUS.AGREE }), { silentToast: true })'), true)
assert.equal(batchRefundSource.includes("showActionError(pickActionErrorMessage(err, '退款失败'), { title: '退款失败' })"), true)
const refundDetailApproveSource = fs.readFileSync(new URL('../pagesA/order/refundDetail.vue', import.meta.url), 'utf8')
assert.equal(refundDetailApproveSource.includes('approveLeaderRefundOrder(payload, { silentToast: true })'), true)
assert.equal(refundDetailApproveSource.includes("showActionError(pickActionErrorMessage(err, '处理失败'), { title: '处理失败' })"), true)
assert.equal(refundDetailApproveSource.includes('from "@/utils/feedback.js"'), true)
// B 端核销详情：整单 + 部分核销都改由页面 modal 提示
assert.equal(orderDetailSource.includes('writeOffLeaderOrder(buildWriteOffPayload(this.orderInfo, pointId), { silentToast: true })'), true)
assert.equal(orderDetailSource.includes('partWriteOffLeaderOrder(payload, { silentToast: true })'), true)
assert.equal(orderDetailSource.split("showActionError(pickActionErrorMessage(err, '核销失败'), { title: '核销失败' })").length - 1, 2)
assert.equal(orderDetailSource.includes('from "@/utils/feedback.js"'), true)

// 操作行：修复前整行挂在 hasAfterSalesDetail 上，纯「部分收货」订单没有核销入口
const orderListActionSource = fs.readFileSync(new URL('../pagesA/order/index.vue', import.meta.url), 'utf8')
assert.equal(orderListActionSource.includes('approveLeaderRefundOrder(payload, { silentToast: true })'), true)
assert.equal(orderListActionSource.includes("showActionError(pickActionErrorMessage(err, '处理失败'), { title: '处理失败' })"), true)
assert.equal(orderListActionSource.includes('from "@/utils/feedback.js"'), true)
assert.equal(orderListActionSource.includes('v-if="activeMainTab !== \'refund\' && (canOpenVerifyDetail(order) || hasAfterSalesDetail(order))" class="refund-actions"'), true)
assert.equal(orderListActionSource.includes('<view v-if="hasAfterSalesDetail(order)" class="refund-btn primary" @click.stop="goRefundDetail(order)">查看售后</view>'), true)
assert.equal(orderListActionSource.includes('{{ canOpenVerifyDetail(order) ? \'核销订单\' : \'查看订单\' }}'), true)

// 核销列表页：卡片内「核销记录」，展开时才按订单号拉详情（文档：verifyRecords 仅详情接口填充）
const orderListVerifySource = fs.readFileSync(new URL('../pagesA/order/index.vue', import.meta.url), 'utf8')
assert.equal(orderListVerifySource.includes("v-if=\"activeMainTab === 'writeOff' && showVerifyRecords(order)\" class=\"verify-records\""), true)
assert.equal(orderListVerifySource.includes('@click.stop="toggleVerifyRecords(order)"'), true)
assert.equal(orderListVerifySource.includes("{{ isVerifyRecordsExpanded(order) ? '收起' : '展开' }}"), true)
assert.equal(orderListVerifySource.includes('暂无核销记录'), true)
assert.equal(orderListVerifySource.includes('加载中...'), true)
assert.equal(orderListVerifySource.includes('verifyRecordsMap: {},'), true)
assert.equal(orderListVerifySource.includes('getLeaderOrderInfo({ orderNo })'), true)
assert.equal(orderListVerifySource.includes('normalizeLeaderOrder(res.data || {}).verifyRecords'), true)
assert.equal(orderListVerifySource.includes('getVerifyRecordSegments(record)'), true)
assert.equal(orderListVerifySource.includes('return buildLeaderVerifyRecordSegments(record)'), true)
assert.equal(orderListVerifySource.includes('class="verify-qty"'), true)
assert.equal(orderListVerifySource.includes('.verify-qty {'), true)

// 文案生成器：详情页与列表页共用，兼容老结构与字符串（此处用独立数据，避免依赖后面的用例）
const listVerifyRecords = normalizeLeaderVerifyRecords([
	{ id: 1, verifyType: 0, staffName: '彭于晏', addTime: '2021-10-23 16:07:35', verifyGoodsMsg: [{ goodsName: '西瓜', skuNames: '1kg', goodsUnit: '个', verifyNum: 1 }] },
	{ id: 2, verifyType: 2, staffName: '路文祥', addTime: '2021-10-24 09:00:00', verifyGoodsMsg: [{ goodsName: '土豆', goodsUnit: '件', verifyNum: 2 }, { goodsName: '玉米', goodsUnit: '根', verifyNum: 1 }] }
])
assert.equal(formatLeaderVerifyRecord(listVerifyRecords[0]), '2021-10-23 16:07:35 核销人：彭于晏 核销商品：西瓜（1kg）×1个')
assert.equal(formatLeaderVerifyRecord(listVerifyRecords[1]), '2021-10-24 09:00:00 路文祥 扫码核销 土豆×2件、玉米×1根')
assert.equal(formatLeaderVerifyRecord({ time: '2021-10-23 16:07:35', staffName: '彭于晏', goodsName: '西瓜', num: 1 }), '2021-10-23 16:07:35 核销人：彭于晏 核销商品：西瓜×1')
// 不再出现 `+N` 这种写法
assert.equal(formatLeaderVerifyRecord({ time: 't', staffName: '彭于晏', goodsName: '西瓜', num: 1 }).includes('+1'), false)
assert.equal(formatLeaderVerifyRecord('原样文案'), '原样文案')
assert.equal(formatLeaderVerifyRecord(null), '')

// 分段结构：数量+单位必须单独成段（页面用红色渲染），且不带 `+`
assert.deepEqual(buildLeaderVerifyRecordSegments({ verifyType: 0, staffName: '彭于晏', time: '2026-08-23 16:07:35', goods: [{ name: '商品名称', specText: '规格', verifyNum: 1, unit: '个' }] }),
	[{ text: '2026-08-23 16:07:35 核销人：彭于晏 核销商品：商品名称（规格）', qty: '×1个' }])
assert.deepEqual(buildLeaderVerifyRecordSegments({ verifyType: 2, staffName: '路文祥', time: '2026-08-23 10:07:30', goods: [{ name: '商品名称', specText: '规格', verifyNum: 2, unit: '件' }] }),
	[{ text: '2026-08-23 10:07:30 路文祥 扫码核销 商品名称（规格）', qty: '×2件' }])
// 多商品：每行一段，各自带数量
assert.deepEqual(buildLeaderVerifyRecordSegments({ verifyType: 0, staffName: '彭于晏', time: 't', goods: [{ name: '土豆', verifyNum: 2, unit: '件' }, { name: '玉米', specText: '甜糯', verifyNum: 1, unit: '根' }] }),
	[{ text: 't 核销人：彭于晏 核销商品：土豆', qty: '×2件' }, { text: '、玉米（甜糯）', qty: '×1根' }])
// 名称里已含规格时不重复拼接
assert.deepEqual(buildLeaderVerifyRecordSegments({ verifyType: 0, staffName: '彭于晏', time: 't', goods: [{ name: '商品名称（规格）', specText: '规格', verifyNum: 1, unit: '个' }] })[0].text,
	't 核销人：彭于晏 核销商品：商品名称（规格）')
// 缺单位时只显示数量；无结构化商品行时退回单字段
assert.equal(buildLeaderVerifyRecordSegments({ verifyType: 0, staffName: 'x', time: 't', goods: [{ name: '西瓜', verifyNum: 3 }] })[0].qty, '×3')
assert.deepEqual(buildLeaderVerifyRecordSegments({ verifyType: 2, staffName: '路文祥', time: 't', num: 2 }), [{ text: 't 路文祥 扫码核销', qty: '×2' }])
assert.deepEqual(buildLeaderVerifyRecordSegments(null), [])

// verifyType=2（用户扫码核销）用「xxx 扫码核销 xx」格式；verifyType=0 仍用「核销人：/核销商品：」
assert.equal(formatLeaderVerifyRecord({ verifyType: 2, staffName: '路文祥', time: '2026-09-19 15:50', goodsText: '黑玉米-1kg×1个' }), '2026-09-19 15:50 路文祥 扫码核销 黑玉米-1kg×1个')
assert.equal(formatLeaderVerifyRecord({ verifyType: 0, staffName: '路文祥', time: '2026-09-19 15:50', goodsText: '黑玉米-1kg×1个' }), '2026-09-19 15:50 核销人：路文祥 核销商品：黑玉米-1kg×1个')
// 用户扫码核销即使没匹配到商品行，也要保留「扫码核销」标识
assert.equal(formatLeaderVerifyRecord({ verifyType: 2, staffName: '路文祥', time: '2026-09-19 15:50' }), '2026-09-19 15:50 路文祥 扫码核销')

// 核销记录归一化：类型/核销人/时间/核销商品文案
const verifyRecordsOrder = normalizeLeaderOrder({
	orderNo: 'NO-VERIFY',
	status: 3,
	verifyRecords: [
		{
			id: 1,
			verifyType: 0,
			staffName: '彭于晏',
			verifyPointName: '紫云南里3区',
			addTime: '2021-10-23 16:07:35',
			verifyGoodsMsg: [{ goodsId: 48, goodsName: '西瓜', skuNames: '1kg', goodsPrice: 0.02, goodsUnit: '个', goodsNum: 2, verifyNum: 1, receiptNum: 1 }]
		},
		{
			id: 2,
			verifyType: 2,
			staffName: '路文祥',
			addTime: '2021-10-24 09:00:00',
			verifyGoodsMsg: [
				{ goodsId: 49, goodsName: '土豆', goodsUnit: '件', goodsNum: 3, verifyNum: 2, receiptNum: 3 },
				{ goodsId: 50, goodsName: '玉米', goodsUnit: '根', goodsNum: 1, verifyNum: 1, receiptNum: 1 }
			]
		}
	]
}).verifyRecords
assert.equal(verifyRecordsOrder.length, 2)
assert.equal(verifyRecordsOrder[0].typeText, '团长后台核销')
assert.equal(verifyRecordsOrder[0].staffName, '彭于晏')
assert.equal(verifyRecordsOrder[0].time, '2021-10-23 16:07:35')
assert.equal(verifyRecordsOrder[0].goodsText, '西瓜-1kg×1个')
assert.equal(verifyRecordsOrder[1].typeText, '用户扫码核销')
assert.equal(verifyRecordsOrder[1].goodsText, '土豆×2件、玉米×1根')
// 无记录 / 非数组时返回空数组，不抛错
assert.deepEqual(normalizeLeaderOrder({ orderNo: 'NO-NONE' }).verifyRecords, [])
assert.deepEqual(normalizeLeaderVerifyRecords(null), [])

// refundFlag 未知时（订单详情不下发该字段、申请记录又没加载到）不得退化成购买数量——
// 否则「买 3 件只申请退 1 件」会被算成退 3 件。
const unknownFlagOrder = normalizeLeaderOrder({ orderNo: 'NO-FLAG0', goods: [
	{ id: 92, goodsName: '西瓜', goodsPrice: 0.02, goodsNum: 3, applyRefund: 1, refundNum: 1, refundGoodsNum: 0 }
] })
assert.equal(unknownFlagOrder.refundFlag, 0)
assert.deepEqual(buildRefundApprovalPayload({ selection: buildRefundSelectionForOrder(unknownFlagOrder), status: 1 }), {
	refundOrderGoodsMap: {
		'NO-FLAG0': {
			orderNo: 'NO-FLAG0',
			refundGoodsMap: { 92: { orderGoodsId: 92, refundNum: 1, refundAmount: 0.02 } }
		}
	},
	status: 1
})

const refundDetailSource = fs.readFileSync(new URL('../pagesA/order/refundDetail.vue', import.meta.url), 'utf8')
assert.equal(refundDetailSource.includes("待团长处理"), true)
assert.equal(refundDetailSource.includes("待处理退货"), true)
assert.equal(refundDetailSource.includes("已退货"), true)
assert.equal(refundDetailSource.includes("已退货' + this.refundAmount + '元'"), false)
assert.equal(refundDetailSource.includes("return this.effectiveRefundFlag === 2 ? '已退货退款' : '已退款'"), true)
assert.equal(refundDetailSource.includes('v-for="goods in refundGoods"'), true)
assert.equal(refundDetailSource.includes('isLeaderRefundableGoods'), true)
assert.equal(refundDetailSource.includes('this.refundGoods.forEach(goods =>'), true)
assert.equal(refundDetailSource.includes('currentRefundGoodsMap'), false)
// 订单商品行必须展示接口返回的 SKU 规格（goodsInfo → specText）。
assert.equal(refundDetailSource.includes('<text v-if="goods.specText" class="goods-spec">{{ goods.specText }}</text>'), true)
assert.equal(refundDetailSource.includes('parseRefundGoodsMsg'), false)
assert.equal(refundDetailSource.includes('currentRefundSegments'), true)
assert.equal(refundDetailSource.includes('attachLeaderRefundSegments(goodsList, this.currentRefundSegments)'), true)
// 【R4】展示与提交共用同一取数量函数（修复前页面用 refundGoodsNum||num、提交用 refundNum||refundGoodsNum，会显示≠提交）
assert.equal(refundDetailSource.includes('return resolveLeaderRefundNum(goods, this.effectiveRefundFlag)'), true)
assert.equal(leaderOrderUtilSource.includes('export function resolveLeaderRefundNum(goods = {}, refundFlag = 0)'), true)
assert.equal(leaderOrderUtilSource.includes('goods.currentRefundNum !== undefined'), true)
assert.equal(leaderOrderUtilSource.includes('currentRefundAmount !== undefined'), true)
// 【R5】记录缺失时按商品行推断 refundFlag，避免审核体丢字段
assert.equal(refundDetailSource.includes('resolveMemberRefundFlag({}, this.order.goods || [])'), true)
// 「已退款」等已处理状态：无 pending 记录时也要取最近一条带申请原文的记录，否则退款明细恒为空
assert.equal(refundDetailSource.includes('history.find(item => item.refundGoodsMsg) ||'), true)
// 退款金额优先用接口的订单退款总额，其次累加记录金额，最后才按商品明细推算
assert.equal(refundDetailSource.includes('const orderFee = Number(this.order.refundFee || 0)'), true)
assert.equal(refundDetailSource.includes('const recordFee = (Array.isArray(this.order.history) ? this.order.history : [])'), true)
// 详情响应自带 refundRecords 时不再多调一次记录接口
assert.equal(refundDetailSource.includes('const inlineRecords = Array.isArray(this.order.refundRecords)'), true)
assert.equal(refundDetailSource.includes("buildRefundSelectionForOrder(Object.assign({}, this.order, { goods: this.refundGoods }))"), false)
assert.equal(refundDetailSource.includes('refundFlag: this.effectiveRefundFlag,'), true)
assert.equal(refundDetailSource.includes('未匹配到退款商品，请重试'), true)

// 【回归】售后详情「同意/未同意」参数：申请原文可能是「商品名-规格」（文档示例），
// 而订单商品行的 name 只有商品名。修复前只做精确匹配 → 匹配 0 行 → refundOrderGoodsMap 为空 → 后端报参数错误。
const specMsg = '西瓜-1kg,申请退数量:1,退款金额:0.02;'
const specGoods = [{ id: 86, name: '西瓜', specText: '1kg', price: 0.02, num: 3, applyRefund: 1, refundNum: 1, refundGoodsNum: 0 }]
const specSegments = parseLeaderRefundGoodsSegments(specMsg)
assert.deepEqual(specSegments, { '西瓜-1kg': [{ num: 1, amount: 0.02 }] })
const specRows = attachLeaderRefundSegments(specGoods, specSegments)
assert.equal(specRows.length, 1)
assert.equal(specRows[0].currentRefundNum, 1)
assert.equal(specRows[0].currentRefundAmount, 0.02)
// 不带规格的原文仍按精确名匹配
assert.equal(attachLeaderRefundSegments([{ id: 87, name: '土豆', price: 1.5, num: 4 }], parseLeaderRefundGoodsSegments('土豆,申请退数量:2,退款金额:3.0;')).length, 1)
// 同名多规格：两行各自认领一条，金额不串
const specDupRows = attachLeaderRefundSegments([
	{ id: 88, name: '西瓜', specText: '1kg', price: 0.02, num: 2 },
	{ id: 89, name: '西瓜', specText: '2kg', price: 0.05, num: 2 }
], parseLeaderRefundGoodsSegments('西瓜-1kg,申请退数量:1,退款金额:0.02;西瓜-2kg,申请退数量:1,退款金额:0.05;'))
assert.equal(specDupRows.length, 2)
assert.deepEqual(specDupRows.map(item => item.currentRefundAmount), [0.02, 0.05])
// 端到端：带规格的售后单，审核体必须是可用的完整结构（refundNum 取申请数量 1，而不是购买数量 3）
const specSelection = buildRefundSelectionForOrder(Object.assign({}, normalizeLeaderOrder({ orderNo: 'NO-SPEC', refundFlag: 1, goods: specGoods.map(item => Object.assign({}, item, { goodsName: item.name, goodsNum: item.num, goodsPrice: item.price, goodsInfo: item.specText })) }), { goods: specRows }))
assert.deepEqual(buildRefundApprovalPayload({ selection: specSelection, status: 1 }), {
	refundOrderGoodsMap: {
		'NO-SPEC': {
			orderNo: 'NO-SPEC',
			refundFlag: 1,
			refundGoodsMap: { 86: { orderGoodsId: 86, refundNum: 1, refundAmount: 0.02 } }
		}
	},
	status: 1
})

// 售后申请记录按商品名聚合为数组：同名多规格行必须各自认领一条，不能共用同一条金额。
const dupNameGoods = [
	{ id: 1, name: '包谷001', price: 0.05, refundGoodsNum: 1 },
	{ id: 2, name: '包谷001', price: 0.18, refundGoodsNum: 1 }
]
const dupNameMsg = '包谷001,申请退数量:1,退款金额:0.05;包谷001,申请退数量:1,退款金额:0.18'
const dupSegments = parseLeaderRefundGoodsSegments(dupNameMsg)
assert.deepEqual(dupSegments['包谷001'], [{ num: 1, amount: 0.05 }, { num: 1, amount: 0.18 }])
const dupRows = attachLeaderRefundSegments(dupNameGoods, dupSegments)
assert.equal(dupRows.length, 2)
assert.deepEqual(dupRows.map(item => item.currentRefundAmount), [0.05, 0.18])
// 总额必须等于该次申请的实际退款金额（0.23），而不是同名行共用金额后的 0.36。
assert.equal(Number(dupRows.reduce((total, item) => total + Number(item.currentRefundAmount || 0), 0).toFixed(2)), 0.23)
// 记录数少于商品行时，多出来的同名行不应被算入。
assert.equal(attachLeaderRefundSegments(dupNameGoods, parseLeaderRefundGoodsSegments('包谷001,申请退数量:1,退款金额:0.05')).length, 1)
// 无记录 / 空文本时返回空。
assert.deepEqual(parseLeaderRefundGoodsSegments(''), {})
assert.deepEqual(parseLeaderRefundGoodsSegments('不合法内容'), {})
assert.equal(attachLeaderRefundSegments(dupNameGoods, {}).length, 0)
assert.equal(refundDetailSource.includes('v-for="goods in order.goods"'), false)
assert.equal(refundDetailSource.includes("approveRefund"), true)
assert.equal(refundDetailSource.includes("openRejectReason"), true)
assert.equal(refundDetailSource.includes("REFUND_APPROVE_STATUS.AGREE"), true)
assert.equal(refundDetailSource.includes("售后历史"), true)
assert.equal(refundDetailSource.includes("getLeaderOrderInfo"), true)
assert.equal(refundDetailSource.includes("getRefundRecords"), true)
assert.equal(refundDetailSource.includes("loadOrderDetail()"), true)
assert.equal(refundDetailSource.includes("getRefundHistoryRows"), true)
assert.equal(refundDetailSource.includes("displayHistory"), true)
assert.equal(refundDetailSource.includes("{{ applyTimeText }}"), true)
assert.equal(refundDetailSource.includes("applyTimeText()"), true)
assert.equal(refundDetailSource.includes("item.statusKey === 'pending'"), true)
assert.equal(refundDetailSource.includes("this.order.applyTime || this.order.orderTime || ''"), true)
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
// 批量退款列表已切到新接口 POST /order/leader/refund/applyList
assert.equal(refundPageSource.includes("getLeaderRefundApplyList({"), true)
assert.equal(refundPageSource.includes("normalizeLeaderRefundApplyList(res.data)"), true)
assert.equal(refundPageSource.includes("buildLeaderRefundListRequest"), false)
assert.equal(refundPageSource.includes("applyStatus: 1"), false)

// 新接口单行归一化：字段口径必须与审核 refundOrderGoodsMap 对齐
const refundApplyList = normalizeLeaderRefundApplyList({
	total: 1,
	page: 1,
	pageSize: 10,
	list: [{
		orderNo: '200001996777000001',
		addTime: 1758100000,
		orderStatus: 5,
		nickname: '路文祥',
		mobile: '18513712081',
		groupName: '测试团购2',
		pointName: '紫云南里3区',
		payFee: 0.02,
		refundFlag: 1,
		applyReason: '多拍',
		extraReason: '不要了',
		applyTime: 1758100100,
		applyRefundAmount: 0.02,
		refundGoodsMsg: '西瓜-1kg,申请退数量:1,退款金额:0.02;',
		goods: [{
			orderGoodsId: 86,
			goodsId: 48,
			goodsName: '西瓜',
			goodsImg: '/p.png',
			goodsInfo: '1kg',
			goodsUnit: '个',
			goodsPrice: 0.02,
			goodsNum: 1,
			receiptNum: 0,
			applyRefund: 1,
			refundNum: 1,
			refundGoodsNum: 0,
			refundAmount: 0.02
		}]
	}]
})
assert.equal(refundApplyList.total, 1)
assert.equal(refundApplyList.list.length, 1)
const refundApplyOrder = refundApplyList.list[0]
assert.equal(refundApplyOrder.orderNo, '200001996777000001')
assert.equal(refundApplyOrder.nickname, '路文祥')
assert.equal(refundApplyOrder.mobile, '18513712081')
assert.equal(refundApplyOrder.refundFlag, 1)
assert.equal(refundApplyOrder.goods[0].id, 86)
assert.equal(refundApplyOrder.goods[0].specText, '1kg')
assert.equal(refundApplyOrder.goods[0].applyRefund, 1)
assert.equal(refundApplyOrder.goods[0].currentRefundAmount, 0.02)
// 选择 → 汇总 → 审核体：refundGoodsMap 的 key 必须是订单商品行 id
const refundApplySelection = buildRefundSelectionForOrder(refundApplyOrder)
assert.deepEqual(buildBatchRefundSummary(refundApplySelection), { itemCount: 1, refundAmount: 0.02, orderCount: 1 })
assert.deepEqual(buildRefundApprovalPayload({ selection: refundApplySelection, status: 1 }), {
	refundOrderGoodsMap: {
		'200001996777000001': {
			orderNo: '200001996777000001',
			refundFlag: 1,
			refundGoodsMap: { 86: { orderGoodsId: 86, refundNum: 1, refundAmount: 0.02 } }
		}
	},
	status: 1
})
// 兼容直接返回数组的形态
assert.equal(normalizeLeaderRefundApplyList([{ orderNo: 'NO1', goods: [] }]).total, 1)

// ================= 已退款状态的售后详情（用户实测单）=================
// 真实响应：refundFee=0.4、refundRecords 3 条、商品行 applyRefund=2 / refundGoodsNum=1 / refundNum=0
const refundedDetail = {
	orderNo: '200002585579000001', status: 5, refundFee: 0.4, orderPrice: 1.2,
	goods: [{ applyRefund: 2, goodsId: 69, goodsInfo: '每个约300克', goodsName: '望京外来品种黑玉米',
		goodsNum: 3, goodsPrice: 0.4, goodsUnit: '↑', id: 113, receiptNum: 2, refundGoodsNum: 1, refundNum: 0 }],
	refundRecords: [
		{ isAgree: 1, refundFlag: 1, refundFee: 0.4, refundGoodsMsg: '已退款0.4元', addTime: 1758215176 },
		{ isAgree: 1, refundFlag: 1, addTime: 1758215170 },
		{ isAgree: 0, refundFlag: 1, refundGoodsMsg: '望京外来品种黑玉米-每个约300克,申请退数量:1,退款金额:0.4;', addTime: 1758215100 }
	]
}
const refundedOrder = mergeMemberOrderRefundRecords(normalizeLeaderOrder(refundedDetail), refundedDetail.refundRecords)
// B 端归一化必须带上 refundFee（修复前只有 C 端 normalizeMemberOrder 有，B 端页面只能靠商品行反推 → 显示 ¥0）
assert.equal(normalizeLeaderOrder(refundedDetail).refundFee, 0.4)
assert.equal(normalizeLeaderOrder(refundedDetail).refundRecords.length, 3)
assert.equal(refundedOrder.history.length, 3)
assert.equal(refundedOrder.history[0].refundFee, 0.4)
// 「已退款」视图：申请原文带规格也能匹配到商品行 → 退款明细不为空、金额取接口 refundFee
const refundedApplyRecord = refundedOrder.history.find(item => item.statusKey === 'pending' && item.refundGoodsMsg) ||
	refundedOrder.history.find(item => item.statusKey === 'pending') ||
	refundedOrder.history.find(item => item.refundGoodsMsg) || null
const refundedRows = attachLeaderRefundSegments(refundedOrder.goods, parseLeaderRefundGoodsSegments((refundedApplyRecord && refundedApplyRecord.refundGoodsMsg) || ''))
assert.equal(refundedRows.length, 1)
assert.equal(refundedRows[0].name, '望京外来品种黑玉米')
assert.equal(refundedRows[0].currentRefundNum, 1)
assert.equal(refundedRows[0].currentRefundAmount, 0.4)
assert.equal(refundedOrder.refundFee, 0.4)

// 多轮退款（真实响应 200002611026000002，status=4 已退款）：
// refundFee=2.1；累计退款数量 = refundNum + refundGoodsNum（黑玉米 1+2=3、大洋芋 1+1=2）
const multiRefundDetail = {
	orderNo: '200002611026000002', status: 4, orderPrice: 2.1, refundFee: 2.1,
	goods: [
		{ applyRefund: 2, goodsId: 69, goodsInfo: '每个约300克', goodsName: '望京外来品种黑玉米', goodsNum: 3, goodsPrice: 0.4, goodsUnit: '个', id: 123, receiptNum: 2, refundGoodsNum: 2, refundNum: 1 },
		{ applyRefund: 2, goodsId: 71, goodsInfo: '500g', goodsName: '南方大洋芋', goodsNum: 2, goodsPrice: 0.45, goodsUnit: '份', id: 124, receiptNum: 1, refundGoodsNum: 1, refundNum: 1 }
	],
	refundRecords: [
		{ id: 219, isAgree: 0, refundFlag: 1, addTime: 1789803940, refundGoodsMsg: '望京外来品种黑玉米-每个约300克,申请退数量:1,退款金额:0.4;南方大洋芋-500g,申请退数量:1,退款金额:0.45;' },
		{ id: 221, isAgree: 1, addTime: 1789803986, refundGoodsMsg: '已退款0.45元' },
		{ id: 223, isAgree: 1, addTime: 1789804070, refundGoodsMsg: '已退款0.4元' },
		{ id: 229, isAgree: 0, refundFlag: 1, addTime: 1789804214, refundGoodsMsg: '望京外来品种黑玉米-每个约300克,申请退数量:1,退款金额:0.4;' },
		{ id: 231, isAgree: 1, addTime: 1789804235, refundGoodsMsg: '已退款0.4元' }
	]
}
const multiRefundOrder = mergeMemberOrderRefundRecords(normalizeLeaderOrder(multiRefundDetail), multiRefundDetail.refundRecords)
assert.equal(multiRefundOrder.refundFee, 2.1)
assert.equal(multiRefundOrder.refundStatusText === '待处理退货', false)
// 累计明细：数量 = refundNum + refundGoodsNum，金额与接口 refundFee 严格相等
const multiCumulative = multiRefundOrder.goods
	.map(goods => {
		const num = Number(goods.refundNum || 0) + Number(goods.refundGoodsNum || 0)
		return num > 0 ? Object.assign({}, goods, { currentRefundNum: num, currentRefundAmount: Number((goods.price * num).toFixed(2)) }) : null
	})
	.filter(Boolean)
assert.deepEqual(multiCumulative.map(item => [item.name, item.currentRefundNum, item.currentRefundAmount]), [
	['望京外来品种黑玉米', 3, 1.2],
	['南方大洋芋', 2, 0.9]
])
const multiCumulativeTotal = Number(multiCumulative.reduce((total, item) => total + item.currentRefundAmount, 0).toFixed(2))
assert.equal(multiCumulativeTotal, 2.1)
assert.equal(multiCumulativeTotal, multiRefundOrder.refundFee)
// 页面：已处理走累计口径、待处理走本次申请口径（金额与明细同源）
assert.equal(refundDetailSource.includes('cumulativeRefundGoods()'), true)
assert.equal(refundDetailSource.includes('const num = Number(goods.refundNum || 0) + Number(goods.refundGoodsNum || 0)'), true)
assert.equal(refundDetailSource.includes('if (!this.isPending) {'), true)
assert.equal(refundDetailSource.includes('if (!this.isPending && this.order.refundFee'), false)

// 核销记录入口只在「已发生过核销」的订单上展示：待收货订单必然没有记录，空块是噪音且白费一次请求
assert.equal(canLeaderOrderShowVerifyRecords({ status: 1, goods: [{ receiptNum: 0 }, { receiptNum: 0 }] }), false)
assert.equal(canLeaderOrderShowVerifyRecords({ status: 2, goods: [{ receiptNum: 1 }, { receiptNum: 0 }] }), true)
assert.equal(canLeaderOrderShowVerifyRecords({ status: 3, goods: [{ receiptNum: 3 }] }), true)
// 商品行已收货但状态没跟上时也要展示（以 receiptNum 为准）
assert.equal(canLeaderOrderShowVerifyRecords({ status: 1, goods: [{ receiptNum: 2 }] }), true)
// 商品行缺 receiptNum 时用状态兜底
assert.equal(canLeaderOrderShowVerifyRecords({ status: 2, goods: [{}, {}] }), true)
assert.equal(canLeaderOrderShowVerifyRecords({ status: 1, goods: [] }), false)
assert.equal(canLeaderOrderShowVerifyRecords({}), false)
// 列表页门控必须同时判断 tab 与订单状态
assert.equal(orderListVerifySource.includes("v-if=\"activeMainTab === 'writeOff' && showVerifyRecords(order)\" class=\"verify-records\""), true)
assert.equal(orderListVerifySource.includes('return canLeaderOrderShowVerifyRecords(order)'), true)

// 按需求去掉「售后类型」行（连同随之无用的 refundTypeText 计算属性）
assert.equal(refundDetailSource.includes('售后类型'), false)
assert.equal(refundDetailSource.includes('refundTypeText'), false)
// 退款金额下方保留「XX申请退款」这一行
assert.equal(refundDetailSource.includes("{{ order.nickname || order.trueName || '团员' }}申请退款"), true)

// 口径规则（已确认：累计口径）：
//   已处理（已退款/未同意）→ 退款金额 = 接口 refundFee（累计），明细 = 累计（refundNum + refundGoodsNum）
//   待处理 → 退款金额 = 本次申请合计，明细 = 本次申请（否则团长看不出「这次要退什么」）
// 这条用例锁死「待处理」分支：已有历史退款(refundFee=0.9) + 本次待审(黑玉米 1 个 0.4)
const pendingAfterHistory = mergeMemberOrderRefundRecords(
	normalizeLeaderOrder({
		orderNo: 'NO-PENDING', status: 5, refundFee: 0.9,
		goods: [{ applyRefund: 1, goodsInfo: '每个约300克', goodsName: '望京外来品种黑玉米', goodsNum: 3, goodsPrice: 0.4, id: 130, receiptNum: 2, refundGoodsNum: 1, refundNum: 1 }],
		refundRecords: [{ id: 300, isAgree: 0, refundFlag: 1, addTime: 1789900000, refundGoodsMsg: '望京外来品种黑玉米-每个约300克,申请退数量:1,退款金额:0.4;' }]
	}),
	[{ id: 300, isAgree: 0, refundFlag: 1, addTime: 1789900000, refundGoodsMsg: '望京外来品种黑玉米-每个约300克,申请退数量:1,退款金额:0.4;' }]
)
assert.equal(pendingAfterHistory.refundStatusText, '待处理退货')
// 待处理：本次申请（不是累计 refundFee=0.9，也不是累计件数 2）
const pendingApply = pendingAfterHistory.history.find(item => item.statusKey === 'pending' && item.refundGoodsMsg)
const pendingRows = attachLeaderRefundSegments(pendingAfterHistory.goods, parseLeaderRefundGoodsSegments(pendingApply.refundGoodsMsg))
assert.equal(pendingRows.length, 1)
assert.equal(pendingRows[0].currentRefundNum, 1)
assert.equal(pendingRows[0].currentRefundAmount, 0.4)
// 页面：待处理时不得拿订单累计总额顶替（refundFee 分支必须在 !isPending 里）
assert.equal(refundDetailSource.includes("if (!this.isPending) {\n\t\t\t\tconst orderFee"), true)

// ================= 独立审查（R1/R2/R3/R4/R5）回归 =================

// R1：同名多规格、申请只含其中一行 → 未申请的行绝不能靠前缀兜底抢走申请
const stealSegments = parseLeaderRefundGoodsSegments('西瓜-2kg,申请退数量:1,退款金额:0.05;')
const stealRows = attachLeaderRefundSegments([
	{ id: 88, name: '西瓜', specText: '1kg', price: 0.02, num: 5, applyRefund: 1, refundNum: 1, refundGoodsNum: 0 },
	{ id: 89, name: '西瓜', specText: '2kg', price: 0.05, num: 5, applyRefund: 1, refundNum: 1, refundGoodsNum: 0 }
], stealSegments)
assert.equal(stealRows.length, 1)
assert.equal(stealRows[0].id, 89)
assert.equal(stealRows[0].currentRefundAmount, 0.05)

// R2：规格文本不一致（1KG vs 1kg）→ 判为未匹配，不允许串到别的规格上
assert.equal(attachLeaderRefundSegments([
	{ id: 90, name: '西瓜', specText: '1KG', price: 0.02 }
], parseLeaderRefundGoodsSegments('西瓜-1kg,申请退数量:1,退款金额:0.02;')).length, 0)
// 商品行没有规格信息且候选唯一时才允许兜底
assert.equal(attachLeaderRefundSegments([
	{ id: 91, name: '西瓜', price: 0.02 }
], parseLeaderRefundGoodsSegments('西瓜-1kg,申请退数量:1,退款金额:0.02;')).length, 1)
// 多候选且无规格信息 → 不兜底（不抢行）
assert.equal(attachLeaderRefundSegments([
	{ id: 92, name: '西瓜', price: 0.02 }
], parseLeaderRefundGoodsSegments('西瓜-1kg,申请退数量:1,退款金额:0.02;西瓜-2kg,申请退数量:1,退款金额:0.05;')).length, 0)

// R3：兜底只能带「本次待审核」行，不能把已同意的历史行一起提交（重复退款）
const mixedOrder = normalizeLeaderOrder({ orderNo: 'NO-MIX', refundFlag: 1, goods: [
	{ id: 93, goodsName: '西瓜', goodsPrice: 0.02, goodsNum: 5, applyRefund: 2, refundNum: 2, refundGoodsNum: 0 },
	{ id: 94, goodsName: '土豆', goodsPrice: 1.5, goodsNum: 5, applyRefund: 1, refundNum: 2, refundGoodsNum: 0 }
] })
const mixedSelection = buildLeaderRefundSelection(mixedOrder, { refundFlag: 1, refundGoodsMsg: '' })
const mixedPayload = buildRefundApprovalPayload({ selection: mixedSelection, status: 1 })
assert.deepEqual(Object.keys(mixedPayload.refundOrderGoodsMap['NO-MIX'].refundGoodsMap), ['94'])
// 行级过滤也不能被 refundStatus===1 绕过
assert.equal(Object.keys(buildRefundSelectionForOrder(Object.assign({}, mixedOrder, { refundStatus: 1 }))['NO-MIX'].goodsMap).length, 1)

// R4：显示与提交必须同源
assert.equal(resolveLeaderRefundNum({ refundNum: 2, refundGoodsNum: 0, num: 5 }, 1), 2)
assert.equal(resolveLeaderRefundNum({ refundNum: 0, refundGoodsNum: 2, num: 5 }, 2), 2)
assert.equal(resolveLeaderRefundNum({ num: 5, receiptNum: 3 }, 2), 3)
assert.equal(resolveLeaderRefundNum({ currentRefundNum: 1, refundNum: 9 }, 1), 1)

// R5 + 守卫：内层 refundGoodsMap 为空 / 行非法 都判定为无效审核体
assert.equal(isLeaderRefundApprovalEmpty({ refundOrderGoodsMap: {} }), true)
assert.equal(isLeaderRefundApprovalEmpty({ refundOrderGoodsMap: { NO1: { orderNo: 'NO1', refundGoodsMap: {} } } }), true)
assert.equal(isLeaderRefundApprovalEmpty({ refundOrderGoodsMap: { NO1: { refundGoodsMap: { 1: { orderGoodsId: 0, refundNum: 1 } } } } }), true)
assert.equal(isLeaderRefundApprovalEmpty({ refundOrderGoodsMap: { NO1: { refundGoodsMap: { 1: { orderGoodsId: 1, refundNum: 0 } } } } }), true)
assert.equal(isLeaderRefundApprovalEmpty({ refundOrderGoodsMap: { NO1: { refundGoodsMap: { 1: { orderGoodsId: 1, refundNum: 1, refundAmount: 0 } } } } }), false)
// 列表页与详情页共用同一套构造器/守卫
assert.equal(leaderOrderUtilSource.includes('export function buildLeaderRefundSelection(order = {}, options = {})'), true)
assert.equal(leaderOrderUtilSource.includes('export function isLeaderRefundApprovalEmpty(payload = {})'), true)
assert.equal(refundDetailSource.includes('buildLeaderRefundSelection(this.order, {'), true)
// C 端申请退款不受影响：refundNum 仍是本次申请数量（走 buildMemberRefundPayload）
const memberOrderSource = fs.readFileSync(new URL('../utils/memberOrder.js', import.meta.url), 'utf8')
assert.equal(memberOrderSource.includes('buildMemberRefundPayload'), true)

const leaderApiSource = fs.readFileSync(new URL('../api/leader.js', import.meta.url), 'utf8')
	assert.equal(leaderApiSource.includes("url: '/order/leader/home/show/orders'"), true)
	assert.equal(leaderApiSource.includes("url: '/order/leader/home/order/goodsSummary'"), true)
	// 这两个接口的 groupId 为必填（<=0 表示不过滤），包装器必须原样下发，否则后端报「缺少groupId」。
	assert.match(leaderApiSource, /function withLeaderHomeShowParams\(params = \{\}\) \{[\s\S]*?groupId: Number\(params\.groupId \|\| params\.gid \|\| 0\)/)
	assert.match(leaderApiSource, /function withLeaderGoodsSummaryParams\(params = \{\}\) \{[\s\S]*?groupId: Number\(params\.groupId \|\| params\.gid \|\| 0\)/)
	assert.equal(leaderApiSource.includes("return { pointId, pid: pointId }"), false)
	assert.equal(leaderApiSource.includes("pid: pointId"), true)
	assert.equal(leaderApiSource.includes("url: '/order/leader/summary/order'"), false)
assert.equal(leaderApiSource.includes("url: '/order/leader/summary/sku'"), true)
assert.equal(leaderApiSource.includes("url: queryUrl('/order/leader/order/writeOff', data)"), true)
assert.equal(leaderApiSource.includes("data: withLeaderOrderPoint(params)"), true)
assert.equal(leaderApiSource.includes("url: '/order/leader/refund/count'"), true)
assert.equal(leaderApiSource.includes("url: '/leader/summary/order'"), false)

console.log('leaderOrder tests passed')
