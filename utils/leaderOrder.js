export const ORDER_TABS = [
	{ key: 'all', text: '全部', statuses: [] },
	{ key: 'writeOff', text: '核销', statuses: [1, 2, 3] },
	{ key: 'refund', text: '售后', statuses: [] }
]

export const WRITE_OFF_TABS = [
	{ key: 'pending', text: '待收货', statuses: [1] },
	{ key: 'partial', text: '部分收货', statuses: [2] },
	{ key: 'done', text: '已提货', statuses: [3] }
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
		1: { key: 'pending', text: '待收货', tone: 'warning' },
		2: { key: 'partial', text: '部分收货', tone: 'warning' },
		3: { key: 'done', text: '已提货', tone: 'success' },
		4: { key: 'refunded', text: '已退款', tone: 'danger' },
		5: { key: 'afterSales', text: '售后', tone: 'warning' },
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

// 容忍非法百分号转义：解码失败时退回原文，避免整段解析中断。
function decodeScanValue(value) {
	const text = String(value == null ? '' : value).trim()
	if (!text) return ''
	try {
		return decodeURIComponent(text).trim()
	} catch (err) {
		return text
	}
}

// 小程序码扫描返回 scanType=WX_CODE；普通二维码为 QR_CODE。
function isMiniProgramScanResult(res = {}) {
	return String(res.scanType || '').toUpperCase() === 'WX_CODE'
}

export function parseLeaderOrderScanResult(res = {}) {
	// res.result 与 res.path 都要解析：小程序码的真实参数在 path 里（形如
	// pages/order/index?scene=orderNo=xxx），而 res.result 可能只是 https://wxaurl.cn/xxx 短链。
	// 注意 res.path 里的 scene 不会被 URL 编码，取值时不能只依赖 decodeURIComponent。
	const text = decodeScanValue(res.result || res.path || res.scene || res.q || res.orderNo || '')
	const pathText = decodeScanValue(res.path || '')
	const sceneText = decodeScanValue(res.scene || '')
	const findValue = key => {
		const pattern = new RegExp('(?:^|[?&#=])' + key + '=([^&#]+)', 'i')
		for (const source of [text, pathText, sceneText]) {
			if (!source) continue
			const match = source.match(pattern)
			if (match) return decodeScanValue(match[1])
		}
		return ''
	}
	const action = res.action ? decodeScanValue(res.action) : findValue('action')
	const receiptCode = res.receiptCode
		? decodeScanValue(res.receiptCode)
		: (findValue('receiptCode') || findValue('code'))
	const orderNo = res.orderNo ? decodeScanValue(res.orderNo) : (findValue('orderNo') || findValue('oid'))
	// 门店核销码的 scene 是 shopId=X；订单核销码是 orderNo=X。两者用键名即可区分，无需额外字段。
	const shopId = res.shopId ? decodeScanValue(res.shopId) : (findValue('shopId') || findValue('sid'))
	return {
		action,
		orderNo,
		receiptCode,
		shopId,
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

// 接口金额统一为元（Response 层已用 MoneyUtil.centToYuan 转换，不暴露「分」），
// 前端只做数值归一化，不做任何单位换算。
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
	const price = yuanAmount(firstPositiveValue(row, ['goodsPrice', 'price', 'unitPrice', 'salePrice'], 0))
	const fallbackRefundNum = refundGoodsNum || refundNum || pendingRefundNum || (applyRefund === 1 ? goodsNum : 0)
	const calculatedRefundAmount = Number((price * fallbackRefundNum).toFixed(2))
	const rawRefundAmount = firstValue(row, ['refundAmount', 'refundPrice', 'refundFee'], null)
	const parsedRefundAmount = rawRefundAmount !== null ? yuanAmount(rawRefundAmount) : 0
	const refundAmount = parsedRefundAmount > 0 || applyRefund === 3 ? parsedRefundAmount : calculatedRefundAmount
	const id = row.id || row.Id || row.orderGoodsId || row.orderGoodsID || row.orderGoodsid || 0
	// 待核销数量 = 购买数 − 已收货数 − 退待收货部分(refundNum)：
	// 退待收货部分已经被退款占用（含待审核占坑），不能再交付；退已收货部分(refundGoodsNum)不影响这个数。
	const pendingWriteOffNum = Math.max(goodsNum - receiptNum - refundNum, 0)
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
		// 规格文本：接口响应字段为 goodsInfo（普通商品=SKU名称，称重商品=包装名称），其余为历史字段兜底。
		// row.specText 兜底保证本函数幂等：归一化过的商品行再归一化时不会丢规格
		// （页面普遍用 Object.assign({}, 旧order, 新数据) 回灌，见 C 端同名实现）。
		specText: row.goodsInfo || row.skuNames || row.skunames || row.skuName || row.packName || row.sku || row.specText || '',
		pendingWriteOffNum,
		verifyNum: applyRefund === 0 ? pendingWriteOffNum : 0,
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

// 核销记录（verifyRecords，仅订单详情接口下发）：支持一单多次部分核销产生多条记录，接口按核销时间正序。
// 幂等：接口原始行带 verifyGoodsMsg，本函数产出行带 goods/goodsText。
// 归一化结果回灌时（页面用 Object.assign({}, 旧order, 新数据) 合并）没有 verifyGoodsMsg，
// 此时直接沿用已归一化的行，否则核销明细会被清空成空串。
export function normalizeLeaderVerifyRecords(list = []) {
	return (Array.isArray(list) ? list : []).map((item, index) => {
		const rawGoods = Array.isArray(item.verifyGoodsMsg) ? item.verifyGoodsMsg : null
		const goods = rawGoods
			? rawGoods.map(row => {
				const verifyNum = Number(row.verifyNum || 0)
				const unit = row.goodsUnit || ''
				const name = row.goodsName || ''
				const specText = row.skuNames || ''
				return {
					goodsId: Number(row.goodsId || 0),
					name,
					specText,
					unit,
					verifyNum,
					receiptNum: Number(row.receiptNum || 0),
					price: Number(row.goodsPrice || 0),
					text: `${name}${specText ? '-' + specText : ''}×${verifyNum}${unit}`
				}
			})
			: (Array.isArray(item.goods) ? item.goods : [])
		return {
			id: item.id || index,
			verifyType: Number(item.verifyType || 0),
			// 0=团长后台核销, 2=用户扫码核销
			typeText: Number(item.verifyType || 0) === 2 ? '用户扫码核销' : '团长后台核销',
			staffName: item.staffName || '',
			pointName: item.verifyPointName || item.pointName || '',
			time: item.addTime || item.time || '',
			goods,
			goodsText: item.goodsText || goods.map(row => row.text).join('、')
		}
	})
}

// 订单是否可能有核销记录（列表卡片要不要显示「核销记录」入口）。
// 待收货(order status=1)的订单必然没有核销记录——只要核销过一次状态就会变成 2/3，
// 这类订单显示空块既误导用户，又白费一次 order/query 请求。
// 判定优先看商品行的已收货数量（最精确，不依赖状态码语义），状态 2/3 兜底。
export function canLeaderOrderShowVerifyRecords(order = {}) {
	// 未支付订单不可能有核销记录
	if (Number(order.status || 0) === 0) return false
	// 接口已经下发了核销记录 → 一定展示（退款/退货把收/退数量清零也不影响）
	const records = Array.isArray(order.verifyRecords) ? order.verifyRecords : []
	if (records.length > 0) return true
	const goods = Array.isArray(order.goods) ? order.goods : []
	if (goods.some(item => Number(item.receiptNum || 0) > 0)) return true
	return [2, 3].includes(Number(order.status || 0))
}

// 核销记录展示：拆成「主体文案 + 数量」两段，数量（含单位）在页面上单独用红色。
// 例：`2026-08-23 16:07:35 核销人：彭于晏 核销商品：商品名称（规格）` + 红色 `×1个`
//    `2026-08-23 10:07:30 路文祥 扫码核销 商品名称（规格）` + 红色 `×2件`（verifyType=2）
// 多商品时每行一个 segment，页面依次渲染（数量各自上色）。
export function buildLeaderVerifyRecordSegments(item) {
	if (typeof item === 'string') return item ? [{ text: item, qty: '' }] : []
	if (!item || typeof item !== 'object') return []
	const time = item.time || item.addTime || item.createTime || ''
	const staffName = item.staffName || item.verifyName || item.operator || ''
	const isScan = Number(item.verifyType || 0) === 2
	const goods = Array.isArray(item.goods) ? item.goods : []
	// verifyType=2（用户扫码核销）用「xxx 扫码核销 xx」；0（团长后台核销）用「核销人：xxx 核销商品：xx」
	const head = [time, staffName ? (isScan ? staffName : `核销人：${staffName}`) : ''].filter(Boolean).join(' ')
	// 商品前缀：后台核销是「核销商品：」，扫码核销是「扫码核销 」（后面接商品名）
	const goodsPrefix = isScan ? '扫码核销 ' : '核销商品：'
	if (goods.length) {
		return goods.map((row, index) => {
			const name = String(row.name || '')
			const spec = String(row.specText || '')
			// 规格可能已包含在名称里（后端 goodsName 形如「商品名称（规格）」），避免重复拼接
			const label = spec && name.indexOf(spec) < 0 ? `${name}（${spec}）` : name
			const num = Number(row.verifyNum || 0)
			const unit = row.unit || ''
			return {
				text: `${index === 0 ? `${head}${head ? ' ' : ''}${goodsPrefix}` : '、'}${label}`,
				// 数量 + 单位：不要 `+2` 这种写法，用「×2件」
				qty: num > 0 ? `×${num}${unit}` : ''
			}
		})
	}
	// 兜底：接口没给结构化商品行时，退回原文/单字段（同样不用 +N 写法）
	const fallbackGoods = item.goodsText || item.goodsName || item.goodsInfo || item.remark || ''
	const fallbackNum = Number(item.num || item.receiptNum || item.verifyNum || 0)
	const fallbackHead = [head || time, isScan ? '扫码核销' : ''].filter(Boolean).join(' ')
	return [{
		text: isScan
			? [fallbackHead, fallbackGoods].filter(Boolean).join(' ')
			: `${fallbackHead}${fallbackGoods ? ` 核销商品：${fallbackGoods}` : ''}`,
		qty: fallbackNum > 0 ? `×${fallbackNum}${item.unit || ''}` : ''
	}]
}

// 纯文本形态（测试/兜底用）：`主体 + 数量` 直接拼接。
export function formatLeaderVerifyRecord(item) {
	return buildLeaderVerifyRecordSegments(item).map(segment => `${segment.text}${segment.qty}`).join('')
}

export function normalizeLeaderOrder(row = {}) {
	const statusMeta = getOrderStatusMeta(row.status)
	const rawGoods = Array.isArray(row.goods) ? row.goods : (Array.isArray(row.goodsInfoList) ? row.goodsInfoList : [])
	const goods = rawGoods.map(item => normalizeLeaderOrderGoods(item))
	// 售后状态优先级：订单级接口字段 → 商品行 applyRefund → 继承的 refundStatus。
	// refundStatus 是本函数写回的派生值（接口文档里没有这个字段），而页面普遍用
	// Object.assign({}, 旧order, 新数据) 把归一化结果回灌，此时它只是旧值；
	// 若当接口字段先读，会把商品行推出的状态覆盖成旧状态
	// （待处理订单显示成「售后」、同意/不同意按钮也不出现）。
	const explicitRefundStatus = firstValue(row, ['applyRefund', 'applyStatus'], null)
	const goodsRefundStatus = getGoodsRefundStatus(goods)
	const refundStatus = explicitRefundStatus !== null
		? explicitRefundStatus
		: (goodsRefundStatus || Number(row.refundStatus || 0))
	const refundMeta = getRefundStatusMeta(refundStatus)
	return {
		orderNo: row.orderNo || row.pcode || String(row.id || ''),
		orderTime: row.orderTime || row.time || '',
		orderPrice: yuanAmount(row.orderPrice !== undefined ? row.orderPrice : row.price || 0),
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
		// 订单已退款总额（元）：接口下发，售后详情「退款金额」直接用它，不再由商品行反推
		refundFee: yuanAmount(firstValue(row, ['refundFee', 'refundAmountTotal', 'refundTotal'], 0)),
		// 订单详情接口可能直接带回退款记录，有就不用再单独调记录接口
		refundRecords: Array.isArray(row.refundRecords) ? row.refundRecords : [],
		nickname: row.nickname || '',
		mobile: row.mobile || row.telephone || '',
		reason: row.actionReason || row.refundReason || row.reason || '',
		refundDesc: row.extraReason || row.refundDesc || row.desc || row.remark || '',
		applyTime: row.applyTime || row.refundApplyTime || '',
		images: row.refundImages || row.applyImages || row.images || [],
		history: row.history || row.logs || row.refundLogs || [],
		// 核销记录：接口 verifyRecords（仅订单详情接口下发），供详情页「核销记录」区块展示
		verifyRecords: normalizeLeaderVerifyRecords(row.verifyRecords),
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
	// 后端 LeaderOrderListRequest 的 startDate/endDate 为 yyyy-MM-dd 且必须成对传入，
	// 只有一端时视为未筛选，不下发。
	const startDate = String(input.startDate || '').trim()
	const endDate = String(input.endDate || '').trim()
	if (startDate && endDate) {
		base.startDate = startDate
		base.endDate = endDate
	}
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

// 该行是否还能核销。
// 修复前要求 applyRefund === 0：只要这行有过售后就整行禁止核销，
// 会把「退的是已收货那部分」的行也挡掉（买3/已收2/退货退款1 → 还剩 1 件可交付）。
// 现在只看扣除退款占用后的待核销数量：
// 待审核申请的占用已计入 refundNum，售后审核中(1) 同样放行剩余部分，只有剩余为 0 才禁止。
export function canLeaderWriteOffGoods(goods = {}) {
	return Number(goods.pendingWriteOffNum || 0) > 0
}

// 不能核销的订单状态：待支付(0) 还没付钱、已退款(4)、已取消(6)。
// 这些订单的商品行可能仍有 pendingWriteOffNum（脏数据），只看商品行会错误地给出核销入口。
export const LEADER_ORDER_NON_VERIFY_STATUS = [0, 4, 6]

// 订单是否还有可核销商品。扫码、订单列表、订单详情共用同一判断，避免多条路径结论不一致。
export function canLeaderOrderVerify(order = {}) {
	if (LEADER_ORDER_NON_VERIFY_STATUS.includes(Number(order.status || 0))) return false
	return (order.goods || []).some(goods => canLeaderWriteOffGoods(goods))
}

// 扫码/列表进入订单详情时的目标模式：
// 还有可核销商品进核销（verify），否则只读查看（view），两者都进详情页而非订单列表。
export function buildLeaderOrderScanTarget(order = {}) {
	return {
		orderNo: order.orderNo || '',
		mode: canLeaderOrderVerify(order) ? 'verify' : 'view'
	}
}

export function buildPartWriteOffPayload(order = {}, pointId = 0) {
	const goodsMap = {}
	const goods = Array.isArray(order.goods) ? order.goods : []
	goods.forEach(item => {
		if (!canLeaderWriteOffGoods(item)) return
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

// 本次退款数量：申请原文（currentRefundNum）优先，否则按退款类型取对应占坑数量。
// 页面展示与实际提交必须走同一个函数，否则会出现「页面显示退 5 件、实际提交 2 件」。
export function resolveLeaderRefundNum(goods = {}, refundFlag = 0) {
	if (goods.currentRefundNum !== undefined) return Number(goods.currentRefundNum || 0)
	const flag = Number(refundFlag || 0)
	const flagRefundNum = flag === 1
		? goods.refundNum
		: (flag === 2 ? goods.refundGoodsNum : (goods.refundNum || goods.refundGoodsNum))
	// 退货退款(2) 的末级兜底应基于「已收货数量」，落到购买数量会放大退款量
	const fallback = flag === 2 ? goods.receiptNum : goods.num
	return Number(flagRefundNum || goods.pendingRefundNum || fallback || 0)
}

function selectionEntry(order, goods) {
	const goodsId = goods.id
	const refundFlag = Number(order.refundFlag || goods.refundFlag || 0)
	const refundNum = resolveLeaderRefundNum(goods, refundFlag)
	const refundAmount = Number(goods.currentRefundAmount !== undefined
		? goods.currentRefundAmount
		: (Number(goods.price || 0) * refundNum).toFixed(2))
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

// 秒级时间戳 → 展示串；非时间戳（已是字符串）原样返回。
function formatOrderTimestamp(value) {
	if (value === undefined || value === null || value === '') return ''
	const num = Number(value)
	if (!Number.isFinite(num) || num <= 0) return String(value)
	const date = new Date(num > 1000000000000 ? num : num * 1000)
	if (Number.isNaN(date.getTime())) return String(value)
	const pad = item => String(item).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// 团长端「退款申请列表」（POST /order/leader/refund/applyList）的单行归一化。
// 该接口返回的就是一条申请记录，字段口径与审核 refundOrderGoodsMap 对齐，
// 因此这里直接映射成列表/选择逻辑使用的订单形态，页面不再自行推算金额。
export function normalizeLeaderRefundApplyRow(row = {}) {
	const goods = (Array.isArray(row.goods) ? row.goods : []).map(item => {
		const mapped = {
			id: Number(item.orderGoodsId || item.id || 0),
			goodsId: Number(item.goodsId || 0),
			name: item.goodsName || '',
			img: item.goodsImg || '',
			price: Number(item.goodsPrice || 0),
			num: Number(item.goodsNum || 0),
			receiptNum: Number(item.receiptNum || 0),
			unit: item.goodsUnit || '',
			specText: item.goodsInfo || '',
			applyRefund: Number(item.applyRefund || 0),
			refundNum: Number(item.refundNum || 0),
			refundGoodsNum: Number(item.refundGoodsNum || 0)
		}
		// 接口给的行退款金额与审核端口径一致，优先用它（selectionEntry 会读 currentRefundAmount）；
		// 缺失或为 0 时才回落到「单价 × 退款数量」。
		const refundAmount = Number(item.refundAmount || 0)
		if (refundAmount > 0) mapped.currentRefundAmount = refundAmount
		return mapped
	})
	return {
		orderNo: row.orderNo || '',
		orderTime: formatOrderTimestamp(row.addTime),
		nickname: row.nickname || '',
		mobile: row.mobile || '',
		groupName: row.groupName || '',
		pointName: row.pointName || '',
		orderPrice: Number(row.payFee || 0),
		status: Number(row.orderStatus || 0),
		statusText: getOrderStatusMeta(row.orderStatus).text,
		statusTone: getOrderStatusMeta(row.orderStatus).tone,
		refundFlag: Number(row.refundFlag || 0),
		refundStatusText: '待处理退货',
		applyReason: row.applyReason || '',
		refundDesc: row.extraReason || '',
		applyTime: formatOrderTimestamp(row.applyTime),
		applyRefundAmount: Number(row.applyRefundAmount || 0),
		refundGoodsMsg: row.refundGoodsMsg || '',
		goods
	}
}

// 列表归一化：新接口返回 { total, page, pageSize, list }，同时兼容直接返回数组的形态。
export function normalizeLeaderRefundApplyList(data) {
	if (Array.isArray(data)) return { list: data.map(normalizeLeaderRefundApplyRow), total: data.length }
	const source = data && typeof data === 'object' ? data : {}
	const rows = Array.isArray(source.list) ? source.list : []
	return {
		list: rows.map(normalizeLeaderRefundApplyRow),
		total: Number(source.total || rows.length || 0)
	}
}

// 【三个审核入口共用】依据「订单 + 本次申请记录」构造审核选择集。
// 申请原文 refundGoodsMsg 里带的是本次申请的数量/金额（文档口径与审核一致），优先用它；
// 解析不出来时退回订单商品行里的可退款项，避免出现空 refundGoodsMap。
export function buildLeaderRefundSelection(order = {}, options = {}) {
	const goodsList = Array.isArray(order.goods) ? order.goods : []
	const refundFlag = Number(order.refundFlag || options.refundFlag || 0)
	const segments = parseLeaderRefundGoodsSegments(options.refundGoodsMsg || '')
	// 申请原文匹配到的行（数量/金额取本次申请）优先；
	// 匹配不上时只保留「本次待审核」的行，绝不能带上历史已同意的行（重复退款）。
	const matched = attachLeaderRefundSegments(goodsList, segments)
	const pending = goodsList.filter(goods => Number(goods.applyRefund || 0) === 1)
	const source = matched.length ? matched : pending
	if (source.length === 0) return {}
	return buildRefundSelectionForOrder(Object.assign({}, order, { refundFlag, goods: source }))
}

// 【三个审核入口共用】审核请求体是否无效。
// 文档要求 OrderRefundGoodsRequest 的 orderGoodsId / refundNum / refundAmount 必填，
// 因此不仅 refundOrderGoodsMap 不能为空，**每个订单的 refundGoodsMap 也必须有行**，
// 否则后端会判为参数错误（修复前列表页内联按钮会发出 refundGoodsMap:{ } 的请求）。
export function isLeaderRefundApprovalEmpty(payload = {}) {
	const orderMap = (payload && payload.refundOrderGoodsMap) || {}
	const orderNos = Object.keys(orderMap)
	if (orderNos.length === 0) return true
	return orderNos.every(orderNo => {
		const goodsMap = ((orderMap[orderNo] || {}).refundGoodsMap) || {}
		const rows = Object.keys(goodsMap).map(id => goodsMap[id] || {})
		if (rows.length === 0) return true
		// 文档要求 orderGoodsId / refundNum 必填：id<=0 或数量<=0 的行都是非法行。
		// 金额不参与校验（0 元商品合法退款金额就是 0）。
		return rows.every(row => Number(row.orderGoodsId || 0) <= 0 || Number(row.refundNum || 0) <= 0)
	})
}

// 只选「本次待审核」的行（applyRefund === 1）。
// 不能用 isLeaderRefundableGoods 兜底：它对 refundNum>0 / refundGoodsNum>0 也为真，
// 会把「上一笔已同意」的历史行一起提交，造成重复退款。
// 也不能按 order.refundStatus === 1 就放行全部商品行（那等于绕过行级过滤）。
export function buildRefundSelectionForOrder(order = {}) {
	let selection = {}
	const goodsList = Array.isArray(order.goods) ? order.goods : []
	goodsList
		.filter(goods => Number(goods.applyRefund || 0) === 1)
		.forEach(goods => {
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

// 解析售后申请记录 refundGoodsMsg。该文本以「商品名」为粒度，同一商品的不同规格会是重名条目，
// 因此按名称聚合为数组（保持出现顺序），不能用单值覆盖，否则同名行会共用同一条金额。
export function parseLeaderRefundGoodsSegments(message = '') {
	const result = {}
	String(message || '').split(';').forEach(part => {
		const text = String(part || '').trim()
		if (!text) return
		const match = text.match(/^(.+?),申请退数量:([0-9.]+),退款金额:([0-9.]+)/)
		if (!match) return
		const name = match[1].trim()
		if (!result[name]) result[name] = []
		result[name].push({
			num: Number(match[2] || 0),
			amount: Number(match[3] || 0)
		})
	})
	return result
}

// 申请原文里的商品名可能带规格（文档示例：`商品名-规格,申请退数量:2,退款金额:10.0;`），
// 而订单商品行的 name 只有商品名，因此按 精确名 → 商品名-规格 → 商品名- 前缀 三级匹配。
// 修复前只做精确匹配，带规格商品一行都匹配不到，导致审核体 refundOrderGoodsMap 为空。
function matchRefundSegmentKey(pending, goods = {}) {
	const name = String(goods.name || '')
	if (!name) return ''
	const hasQueue = key => Array.isArray(pending[key]) && pending[key].length > 0
	// 1) 原文名字不带规格（如「土豆」）：精确匹配
	if (hasQueue(name)) return name
	const specText = String(goods.specText || '')
	// 2) 商品行有规格：只认「商品名-规格」精确匹配。
	//    宁可判为未匹配，也不能退到前缀匹配——否则「同名多规格、申请只含其一」时
	//    未申请的那一行会抢走申请（提交错误的 orderGoodsId、金额串位）。
	if (specText) return hasQueue(`${name}-${specText}`) ? `${name}-${specText}` : ''
	// 3) 商品行没有规格信息：仅当候选唯一时兜底，多候选一律判未匹配（避免抢行）
	const candidates = Object.keys(pending).filter(key => key.indexOf(`${name}-`) === 0 && hasQueue(key))
	return candidates.length === 1 ? candidates[0] : ''
}

// 按订单商品行顺序配对申请记录：同名商品行依次消费同名记录，保证每行拿到各自的金额，
// 总额等于该次申请的实际退款金额（同名多规格行不会重复计入）。
export function attachLeaderRefundSegments(goodsList = [], segments = {}) {
	const pending = {}
	Object.keys(segments || {}).forEach(name => {
		pending[name] = (segments[name] || []).slice()
	})
	const rows = []
	;(Array.isArray(goodsList) ? goodsList : []).forEach(goods => {
		if (!goods) return
		const key = matchRefundSegmentKey(pending, goods)
		if (!key) return
		const segment = pending[key].shift()
		rows.push(Object.assign({}, goods, {
			currentRefundNum: segment.num,
			currentRefundAmount: segment.amount
		}))
	})
	return rows
}
