export const MEMBER_ORDER_TABS = [
	{ key: 'all', text: '全部', status: null },
	{ key: 'unreceipt', text: '待收货', status: 1 },
	{ key: 'completed', text: '已提货', status: 3 },
	{ key: 'unpay', text: '未支付', status: 0 },
	{ key: 'refund', text: '售后', status: 5 }
]

export const MEMBER_REFUND_TABS = [
	{ key: 'all', text: '全部', status: null },
	{ key: 'pending', text: '待处理', status: 1 },
	{ key: 'approved', text: '已同意', status: 2 },
	{ key: 'rejected', text: '未同意', status: 3 }
]

export const MEMBER_REFUND_FLAGS = {
	ONLY_REFUND: 1,
	RETURN_AND_REFUND: 2
}

export const MEMBER_REFUND_GOODS_STATUS = {
	NONE: 0,
	PENDING: 1,
	APPROVED: 2,
	REJECTED: 3
}

// 订单状态：与 getMemberOrderStatusMeta 的映射保持一致。
export const MEMBER_ORDER_STATUS = {
	UNPAY: 0,
	UNRECEIPT: 1,
	PARTIAL: 2,
	COMPLETED: 3,
	REFUNDED: 4,
	REFUND: 5,
	CANCELLED: 6
}

export function isMemberRefundPending(goods = {}) {
	return Number(goods.applyRefund || 0) === MEMBER_REFUND_GOODS_STATUS.PENDING
}

export function canMemberApplyRefundGoods(goods = {}, refundFlag = 0) {
	const status = Number(goods.applyRefund || 0)
	if (status === MEMBER_REFUND_GOODS_STATUS.NONE) return true
	if (status !== MEMBER_REFUND_GOODS_STATUS.REJECTED) return false
	return Number(refundFlag) !== MEMBER_REFUND_FLAGS.RETURN_AND_REFUND
}

// 订单已取消(6)后不再产生售后：商品行残留的可退数量不再作为入口依据。
export function isMemberOrderCancelled(order = {}) {
	if (order.statusKey === 'cancelled') return true
	return Number(order.status || 0) === MEMBER_ORDER_STATUS.CANCELLED
}

// 不提供「申请退款」入口的订单状态：未支付、已退款、已取消。
export const MEMBER_REFUND_DISABLED_STATUS = [
	MEMBER_ORDER_STATUS.UNPAY,
	MEMBER_ORDER_STATUS.REFUNDED,
	MEMBER_ORDER_STATUS.CANCELLED
]

// 订单是否还能发起售后。只按订单状态判断：不是 未支付(0)/已退款(4)/已取消(6) 就展示入口。
// 部分收货(2)、已提货(3)、售后(5) 都允许对剩余商品再次申请，具体可退数量由退款页与后端判定。
export function canMemberOrderApplyRefund(order = {}) {
	return !MEMBER_REFUND_DISABLED_STATUS.includes(Number(order.status || 0))
}

// 订单是否还能生成核销码。已取消订单即使商品行残留待收货数量，也不再提供核销入口。
// 能否生成核销码（顾客出示给团长扫）。
// 规则：只要订单处于 待收货(1) / 部分收货(2) / 售后(5)，入口就放出来——不再要求
// 「某行还有可核销数量」。原因：这两条路是分开的——
//   ① 顾客出示核销码 ② 团长扫码核销；
// 全部商品都在售后流程中时，顾客仍需要能出示核销码给团长核对；由核销侧（扫码/自助核销）
// 按 canMemberReceiptGoods / canLeaderWriteOffGoods 判断到底能核销几件。
// 修复前它复用「能否核销」的行级判定，只要某行有过售后（哪怕退的是已收货那部分）
// 整单就再也生成不了核销码。
export const MEMBER_ORDER_MAKE_QR_STATUS = [1, 2, 5]

export function canMemberOrderMakeQr(order = {}) {
	return MEMBER_ORDER_MAKE_QR_STATUS.includes(Number(order.status || 0))
}

// 单个商品行是否可自助核销：售后审核中不可核销，且需还有待自提数量。
// 该行当前能否核销（含可核销数量）。
// 可核销数量 = 购买数 − 已收货数 − 退待收货部分(refundNum)，即「还没收到、也没被退款占用」的部分。
// 修复前的规则是「applyRefund ∈ {0,3} 且 pendingReceiptNum > 0」——只要这行有过售后就整行禁止核销，
// 会把「退的是已收货那部分（refundGoodsNum）」的行也一起挡掉：
// 例如 买3 / 已收2 / 退货退款1 → 还剩 1 件可以交付，却因为 applyRefund=2 不给核销。
// 售后审核中(1) 也放行：待审核申请的占用已经计入 refundNum（文档：申请占坑累计），
// 扣掉之后剩下的部分是安全的；只有「剩余为 0」才禁止核销。
export function canMemberReceiptGoods(goods = {}) {
	return memberReceiptAvailableNum(goods) > 0
}

// 可核销数量：与申请退款页的「仅退款可退数量」同一个口径。
export function memberReceiptAvailableNum(goods = {}) {
	if (goods.onlyRefundAvailableNum !== undefined && goods.onlyRefundAvailableNum !== null) {
		return Math.max(Number(goods.onlyRefundAvailableNum || 0), 0)
	}
	const goodsNum = Number(goods.goodsNum || goods.num || 0)
	const receiptNum = Number(goods.receiptNum || 0)
	const refundNum = Number(goods.refundNum || 0)
	return Math.max(goodsNum - receiptNum - refundNum, 0)
}

// 不能自助核销的订单状态：待支付(0) 还没付钱、已退款(4)、已取消(6)。
// 与 B 端 LEADER_ORDER_NON_VERIFY_STATUS 同一口径：售后(5) 只要还有可核销商品就能核销
// （部分退款/退货不影响剩余部分）。修复前 C 端要求 status ∈ {1,2}，导致「售后」状态
// 的订单即使还有 4 件待自提，页面上也没有「确认核销」按钮、数量步进器也是禁用的。
export const MEMBER_ORDER_NON_RECEIPT_STATUS = [0, 4, 6]

export function canMemberOrderReceipt(order = {}) {
	if (MEMBER_ORDER_NON_RECEIPT_STATUS.includes(Number(order.status || 0))) return false
	if (Number(order.pointId || 0) <= 0) return false
	return (order.goods || []).some(goods => canMemberReceiptGoods(goods))
}

// 自助核销提交体：goodsList 为空表示整单核销，非空表示按数量部分核销。
export function buildMemberPartReceiptPayload(order = {}, selection = {}) {
	const goodsList = []
	;(order.goods || []).forEach(goods => {
		if (!canMemberReceiptGoods(goods)) return
		const maxNum = Math.max(0, Number(goods.pendingReceiptNum || 0))
		const num = Math.min(Number(selection[goods.id] || 0), maxNum)
		if (goods.id && num > 0) goodsList.push({ id: goods.id, num })
	})
	return buildMemberReceiptParams(order, goodsList)
}

export function getMemberRefundFlagMeta(flag) {
	return Number(flag) === MEMBER_REFUND_FLAGS.RETURN_AND_REFUND
		? { key: 'return', text: '退款退货' }
		: { key: 'only', text: '仅退款' }
}

export function getMemberOrderStatusMeta(status) {
	const value = Number(status)
	const map = {
		0: { key: 'unpay', text: '未支付', tone: 'warning' },
		1: { key: 'unreceipt', text: '待收货', tone: 'primary' },
		2: { key: 'partial', text: '部分收货', tone: 'primary' },
		3: { key: 'completed', text: '已提货', tone: 'success' },
		4: { key: 'refunded', text: '已退款', tone: 'muted' },
		// 售后列表应优先展示商品行的审核态；接口未返回审核态时才使用此兜底。
		5: { key: 'refund', text: '售后', tone: 'danger' },
		6: { key: 'cancelled', text: '已取消', tone: 'muted' }
	}
	return map[value] || { key: 'unknown', text: '未知', tone: 'muted' }
}

export function getMemberRefundStatusMeta(status) {
	const value = Number(status)
	const map = {
		1: { key: 'pending', text: '待处理', tone: 'warning' },
		2: { key: 'approved', text: '已同意', tone: 'success' },
		3: { key: 'rejected', text: '已拒绝', tone: 'danger' }
	}
	return map[value] || { key: 'none', text: '无售后', tone: 'muted' }
}

function normalizeMemberRefundStatus(value) {
	const status = Number(value)
	return [1, 2, 3].includes(status) ? status : 0
}

function firstDefinedValue(row = {}, keys = [], fallback = null) {
	for (let i = 0; i < keys.length; i += 1) {
		const value = row[keys[i]]
		if (value !== undefined && value !== null) return value
	}
	return fallback
}

function goodsIdentityKeys(goods = {}) {
	return [
		goods.id ? `id:${goods.id}` : '',
		goods.orderGoodsId ? `id:${goods.orderGoodsId}` : '',
		goods.goodsId ? `goods:${goods.goodsId}` : '',
		goods.skuId ? `sku:${goods.skuId}` : '',
		goods.skuIds ? `skus:${goods.skuIds}` : ''
	].filter(Boolean)
}

function mergeDefinedGoods(base = {}, item = {}) {
	const merged = Object.assign({}, base)
	Object.keys(item || {}).forEach(key => {
		if (item[key] !== undefined && item[key] !== null) merged[key] = item[key]
	})
	return merged
}

function omitApplyAvailableFields(item = {}, refundFlag = MEMBER_REFUND_FLAGS.ONLY_REFUND) {
	const next = Object.assign({}, item)
	if (Number(refundFlag) === MEMBER_REFUND_FLAGS.RETURN_AND_REFUND) delete next.refundGoodsNum
	if (Number(refundFlag) === MEMBER_REFUND_FLAGS.ONLY_REFUND) delete next.refundNum
	return next
}

function resolveRefundApplyAvailableNum(item = {}, refundFlag = MEMBER_REFUND_FLAGS.ONLY_REFUND, hasApplyGoodsSource = false) {
	const explicitAvailable = firstDefinedValue(item, ['availableRefundNum', 'canRefundNum', 'refundAvailableNum'], null)
	if (explicitAvailable !== null) return Math.max(Number(explicitAvailable || 0), 0)
	if (!hasApplyGoodsSource) return null
	if (Number(refundFlag) === MEMBER_REFUND_FLAGS.RETURN_AND_REFUND && item.refundGoodsNum !== undefined && item.refundGoodsNum !== null) {
		return Math.max(Number(item.refundGoodsNum || 0), 0)
	}
	if (Number(refundFlag) === MEMBER_REFUND_FLAGS.ONLY_REFUND && item.refundNum !== undefined && item.refundNum !== null) {
		return Math.max(Number(item.refundNum || 0), 0)
	}
	return null
}

function resolveMemberRefundStatus(row = {}, goods = []) {
	// 订单级「接口原始」字段优先，与归一化无关。
	const orderStatus = [
		row.applyRefund,
		row.refundApplyStatus,
		row.afterSaleStatus,
		row.afterSalesStatus
	].map(normalizeMemberRefundStatus).find(Boolean)
	if (orderStatus) return orderStatus

	const goodsStatuses = goods.map(item => normalizeMemberRefundStatus(item.applyRefund)).filter(Boolean)
	// 同一订单存在多笔售后时，待处理优先展示，避免把仍待审核的申请误显示为已结束。
	if (goodsStatuses.includes(1)) return 1
	if (goodsStatuses.includes(3)) return 3
	if (goodsStatuses.includes(2)) return 2

	// 继承的派生值只能兜底：row.refundStatus 是本函数写回 normalizeMemberOrder 的结果
	// （接口文档里没有这个字段），页面用 Object.assign({}, 旧order, 新数据) 回灌时它只是旧值，
	// 排在商品行之前会把新状态覆盖成旧状态（售后页显示错误状态、审核按钮消失）。
	const inheritedStatus = normalizeMemberRefundStatus(row.refundStatus)
	if (inheritedStatus) return inheritedStatus

	// 部分列表接口会直接携带售后记录的 isAgree：0=待审核、1=同意、2=不同意。
	if (Object.prototype.hasOwnProperty.call(row, 'isAgree')) {
		const agree = Number(row.isAgree)
		if ([0, 1, 2].includes(agree)) return agree + 1
	}
	return 0
}

export function buildMemberOrderListPayload({ goodsName = '', status = null, tab = '', page = 1, pageSize = 10 } = {}) {
	const tabMeta = MEMBER_ORDER_TABS.find(item => item.key === tab)
	const effectiveStatus = status === null || status === undefined ? (tabMeta ? tabMeta.status : null) : status
	const payload = {
		goodsName: String(goodsName || '').trim(),
		page: Number(page || 1),
		pageSize: Number(pageSize || 10)
	}
	if (effectiveStatus !== null && effectiveStatus !== undefined && effectiveStatus !== '') {
		payload.status = Number(effectiveStatus)
	}
	if (!payload.goodsName) delete payload.goodsName
	return payload
}

export function buildMemberRefundListPayload({ goodsName = '', status = null, tab = '', page = 1, pageSize = 10 } = {}) {
	const tabMeta = MEMBER_REFUND_TABS.find(item => item.key === tab)
	const effectiveStatus = status === null || status === undefined ? (tabMeta ? tabMeta.status : null) : status
	const payload = {
		page: Number(page || 1),
		pageSize: Number(pageSize || 10)
	}
	if (effectiveStatus !== null && effectiveStatus !== undefined && effectiveStatus !== '') {
		payload.status = Number(effectiveStatus)
	}
	if (String(goodsName || '').trim()) payload.goodsName = String(goodsName).trim()
	return payload
}

export function normalizeMemberOrderGoods(goods = {}) {
	const goodsNum = Number(goods.goodsNum || goods.num || 0)
	const receiptNum = Number(goods.receiptNum || 0)
	const applyRefund = Number(goods.applyRefund || 0)
	const hasRefundNum = goods.refundNum !== undefined && goods.refundNum !== null
	const hasRefundGoodsNum = goods.refundGoodsNum !== undefined && goods.refundGoodsNum !== null
	const refundNum = Number(goods.refundNum || 0)
	const refundGoodsNum = Number(goods.refundGoodsNum || 0)
	const onlyRefundAvailableNum = Math.max(goodsNum - receiptNum - refundNum, 0)
	const returnRefundAvailableNum = Math.max(receiptNum - refundGoodsNum, 0)
	return {
		id: Number(goods.orderGoodsId || goods.id || goods.Id || goods.orderGoodsID || 0),
		goodsId: Number(goods.goodsId || 0),
		name: goods.goodsName || goods.name || '',
		img: goods.goodsImg || goods.img || '',
		price: Number(goods.goodsPrice || goods.price || 0),
		num: goodsNum,
		receiptNum,
		pendingReceiptNum: Math.max(goodsNum - receiptNum, 0),
		applyRefund,
		hasRefundNum,
		hasRefundGoodsNum,
		refundNum,
		refundGoodsNum,
		onlyRefundAvailableNum,
		returnRefundAvailableNum,
		// 兼容旧页面的仅退款可退数量名称。
		pendingRefundNum: onlyRefundAvailableNum,
		unit: goods.goodsUnit || goods.unit || '',
		skuId: Number(goods.skuId || 0),
		skuIds: goods.skuIds || goods.skuids || '',
		// 规格文本：接口响应字段为 goodsInfo（普通商品=SKU名称，称重商品=包装名称），其余为历史字段兜底。
		specText: goods.goodsInfo || goods.skuNames || goods.skunames || goods.skuName || goods.packName || goods.specText || ''
	}
}

export function resolveMemberRefundFlag(row = {}, goods = []) {
	const refundFlag = Number(row.refundFlag || 0)
	if ([MEMBER_REFUND_FLAGS.ONLY_REFUND, MEMBER_REFUND_FLAGS.RETURN_AND_REFUND].includes(refundFlag)) return refundFlag
	const applyingGoods = goods.filter(isMemberRefundPending)
	if (!applyingGoods.length) return 0
	if (applyingGoods.every(item => Number(item.receiptNum || 0) === 0)) return MEMBER_REFUND_FLAGS.ONLY_REFUND
	if (applyingGoods.every(item => Number(item.pendingReceiptNum || 0) === 0)) return MEMBER_REFUND_FLAGS.RETURN_AND_REFUND
	return 0
}

export function getMemberRefundDisplayNum(goods = {}, refundFlag = 0) {
	const pendingReceiptNum = Math.max(Number(goods.num || 0) - Number(goods.receiptNum || 0), 0)
	if (Number(refundFlag) === MEMBER_REFUND_FLAGS.ONLY_REFUND) {
		return goods.hasRefundNum && Number(goods.refundNum || 0) > 0 ? Number(goods.refundNum) : pendingReceiptNum
	}
	if (Number(refundFlag) === MEMBER_REFUND_FLAGS.RETURN_AND_REFUND) {
		return goods.hasRefundGoodsNum && Number(goods.refundGoodsNum || 0) > 0 ? Number(goods.refundGoodsNum) : Number(goods.receiptNum || 0)
	}
	if (pendingReceiptNum > 0) return goods.hasRefundNum && Number(goods.refundNum || 0) > 0 ? Number(goods.refundNum) : pendingReceiptNum
	return goods.hasRefundGoodsNum && Number(goods.refundGoodsNum || 0) > 0 ? Number(goods.refundGoodsNum) : Number(goods.receiptNum || 0)
}

export function getMemberGoodsStatusList(goods = {}, refundFlag = 0, orderStatus = null) {
	const unit = goods.unit || '件'
	// 已取消订单没有待提货商品，避免卡片出现「待提货」与无核销入口相矛盾的状态。
	const orderCancelled = Number(orderStatus || 0) === MEMBER_ORDER_STATUS.CANCELLED
	const applyRefund = Number(goods.applyRefund || 0)
	const resolvedFlag = Number(refundFlag || 0)
	const isPending = applyRefund === MEMBER_REFUND_GOODS_STATUS.PENDING
	const pendingReceiptNum = Math.max(Number(goods.num || 0) - Number(goods.receiptNum || 0), 0)
	// 老接口未返回 refundFlag 时，单个商品仍可依据是否已核销判断售后类型。
	const pendingFlag = resolvedFlag || (pendingReceiptNum > 0
		? MEMBER_REFUND_FLAGS.ONLY_REFUND
		: MEMBER_REFUND_FLAGS.RETURN_AND_REFUND)
	const pendingNum = isPending ? getMemberRefundDisplayNum(goods, pendingFlag) : 0
	const onlyRefundNum = isPending ? 0 : Number(goods.refundNum || 0)
	const returnRefundNum = isPending ? 0 : Number(goods.refundGoodsNum || 0)
	const pendingOnlyNum = isPending && pendingFlag === MEMBER_REFUND_FLAGS.ONLY_REFUND ? pendingNum : 0
	const pendingReturnNum = isPending && pendingFlag === MEMBER_REFUND_FLAGS.RETURN_AND_REFUND ? pendingNum : 0
	const verifiedNum = Math.max(Number(goods.receiptNum || 0) - returnRefundNum - pendingReturnNum, 0)
	const pendingPickupNum = Math.max(Number(goods.num || 0) - Number(goods.receiptNum || 0) - onlyRefundNum - pendingOnlyNum, 0)
	const statusList = []
	if (pendingPickupNum > 0 && !orderCancelled) statusList.push({ key: 'pendingPickup', text: `待提货 ${pendingPickupNum}${unit}`, tone: 'pending' })
	if (verifiedNum > 0) statusList.push({ key: 'verified', text: `已核销 ${verifiedNum}${unit}`, tone: 'verified' })
	if (onlyRefundNum > 0) statusList.push({ key: 'refunded', text: `已退款 ${onlyRefundNum}${unit}`, tone: 'refunded' })
	if (returnRefundNum > 0) statusList.push({ key: 'returnRefunded', text: `已退货退款 ${returnRefundNum}${unit}`, tone: 'refunded' })
	if (pendingNum > 0) {
		const text = pendingFlag === MEMBER_REFUND_FLAGS.RETURN_AND_REFUND ? '退货退款处理中' : '退款处理中'
		statusList.push({ key: 'refundPending', text: `${text} ${pendingNum}${unit}`, tone: 'processing' })
	}
	return statusList
}

export function normalizeMemberRefundApplyInfo(row = {}, refundFlag = MEMBER_REFUND_FLAGS.ONLY_REFUND, baseGoods = []) {
	const hasApplyGoodsSource = Array.isArray(row.refundGoods)
	const goods = hasApplyGoodsSource ? row.refundGoods : []
	const normalizedFlag = Number(row.refundFlag || refundFlag) || MEMBER_REFUND_FLAGS.ONLY_REFUND
	const baseGoodsMap = {}
	if (Array.isArray(baseGoods)) {
		baseGoods.forEach(item => {
			goodsIdentityKeys(item).forEach(key => { baseGoodsMap[key] = item })
		})
	}
	return {
		orderNo: row.orderNo || row.orderId || '',
		refundFlag: normalizedFlag,
		onlyRefundUsed: Boolean(row.onlyRefundUsed || row.onlyRefundApplied || row.refundOnlyUsed),
		// 可退商品由接口 refundGoods 直接下发，前端不再二次筛选（筛选会把接口给出的可退行误删）。
		goods: goods.map(item => {
			const baseItem = goodsIdentityKeys(item).map(key => baseGoodsMap[key]).find(Boolean) || {}
			const applyItem = hasApplyGoodsSource ? omitApplyAvailableFields(item, normalizedFlag) : item
			const normalizedGoods = normalizeMemberOrderGoods(mergeDefinedGoods(baseItem, applyItem))
			const explicitAvailable = resolveRefundApplyAvailableNum(item, normalizedFlag, hasApplyGoodsSource)
			const calculatedAvailable = normalizedFlag === MEMBER_REFUND_FLAGS.RETURN_AND_REFUND
				? normalizedGoods.returnRefundAvailableNum
				: normalizedGoods.onlyRefundAvailableNum
			return Object.assign({}, normalizedGoods, {
				availableRefundNum: explicitAvailable === null
					? calculatedAvailable
					: Math.max(Number(explicitAvailable || 0), 0)
			})
		})
	}
}

function normalizeArrayField(value) {
	if (Array.isArray(value)) return value
	if (typeof value === 'string' && value.trim()) return value.split(',').map(item => item.trim()).filter(Boolean)
	return []
}

export function formatSecondTime(value) {
	const num = Number(value || 0)
	if (!num) return ''
	const date = new Date(num > 1000000000000 ? num : num * 1000)
	const pad = item => String(item).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function normalizeMemberRefundRecord(row = {}) {
	const agree = Number(row.isAgree || 0)
	const statusMap = {
		0: { key: 'pending', content: '申请退款', statusText: '待团长处理' },
		1: { key: 'approved', content: '团长同意退款申请', statusText: '团长已同意' },
		2: { key: 'rejected', content: '团长拒绝退款申请', statusText: '团长已拒绝' }
	}
	const meta = statusMap[agree] || statusMap[0]
	return {
		id: Number(row.id || 0),
		orderNo: row.orderNo || '',
		refundFlag: Number(row.refundFlag || 0),
		refundGoodsMsg: row.refundGoodsMsg || '',
		// 该条记录的退款金额（元），售后详情用它兜底计算「退款金额」
		refundFee: Number(row.refundFee || 0),
		operateId: Number(row.operateId || 0),
		operateName: row.operateName || '',
		isAgree: agree,
		statusKey: meta.key,
		statusText: meta.statusText,
		content: row.refundGoodsMsg ? `${meta.content}：${row.refundGoodsMsg}` : meta.content,
		actionReason: row.actionReason || '',
		extraReason: row.extraReason || '',
		reason: row.isAgree === 2 || agree === 2 ? (row.extraReason || row.actionReason || '') : '',
		addTime: Number(row.addTime || 0),
		time: row.time || row.createTime || formatSecondTime(row.addTime)
	}
}

export function mergeMemberOrderRefundRecords(order = {}, records = []) {
	const history = (Array.isArray(records) ? records.map(normalizeMemberRefundRecord) : [])
		.sort((a, b) => Number(b.addTime || 0) - Number(a.addTime || 0))
	if (!history.length) return order
	const latest = history[0]
	// “补充说明”来自团员申请退款时填写的 extraReason；后续同意/拒绝记录可能携带团长处理说明，不能覆盖申请说明。
	const applyRecord = history.find(item => item.statusKey === 'pending') || history[history.length - 1]
	return Object.assign({}, order, {
		reason: applyRecord.actionReason || latest.actionReason || order.reason || '',
		refundDesc: applyRecord.extraReason || order.refundDesc || '',
		applyTime: applyRecord.time || latest.time || order.applyTime || '',
		refundFlag: resolveMemberRefundFlag(Object.assign({}, order, { refundFlag: latest.refundFlag || order.refundFlag }), order.goods || []),
		history
	})
}

// 仅退款只能发起一次：存在「退款类型=仅退款(refundFlag=1) 且未被拒绝(isAgree!==2)」的记录即视为已用过。
// 接口若能直接下发 onlyRefundUsed 则优先用它（见 normalizeMemberOrder），这里只是兜底推断。
export function hasMemberOnlyRefundApplied(records = []) {
	return (Array.isArray(records) ? records : []).some(item =>
		Number(item && item.refundFlag || 0) === MEMBER_REFUND_FLAGS.ONLY_REFUND &&
		Number(item && item.isAgree || 0) !== 2)
}

// 可退商品行的选中键：必须优先用「订单商品行 id」。
// 同一 goodsId 的多规格商品会拆成多行，用 goodsId 做键会让这些行共用一个键——
// 勾选其中一行等于勾选全部（这就是「选一个就是全部选中」的成因之一）。
export function getMemberRefundGoodsKey(goods = {}, index = 0) {
	const rowId = Number(goods.id || goods.orderGoodsId || 0)
	if (rowId > 0) return `order-goods-${rowId}`
	const goodsId = Number(goods.goodsId || 0)
	const skuKey = goods.skuId || goods.skuIds || ''
	if (goodsId > 0 && skuKey) return `goods-${goodsId}-sku-${skuKey}`
	if (goodsId > 0) return `goods-${goodsId}`
	return `index-${index}`
}

export function normalizeMemberOrder(row = {}) {
	const goods = Array.isArray(row.goods) ? row.goods.map(normalizeMemberOrderGoods) : []
	// 订单响应可能直接带回退款记录（refundRecords）：用于「仅退款是否已申请过」的兜底判断
	const refundRecords = (Array.isArray(row.refundRecords) ? row.refundRecords : []).map(normalizeMemberRefundRecord)
	const refundFlag = resolveMemberRefundFlag(row, goods)
	const goodsWithStatus = goods.map(item => Object.assign({}, item, {
		statusList: getMemberGoodsStatusList(item, refundFlag, row.status)
	}))
	const status = Number(row.status || 0)
	const statusMeta = getMemberOrderStatusMeta(status)
	const refundStatus = resolveMemberRefundStatus(row, goodsWithStatus)
	const refundMeta = getMemberRefundStatusMeta(refundStatus)
	return {
		orderNo: row.orderNo || row.orderId || '',
		orderTime: row.orderTime || '',
		// 订单备注（C 端下单时填的 remark；接口补字段后即可直接渲染）
		remark: row.remark || row.memberRemark || row.customerRemark || row.orderRemark || row.note || '',
		orderPrice: Number(row.orderPrice || row.payPrice || row.actualPrice || row.totalPrice || row.price || 0),
		// 接口金额统一为元（Response 层已转换，不暴露「分」），前端不再做单位换算。
		refundFee: Number(row.refundFee || 0),
		refundRecords,
		leaderId: Number(row.leaderId || 0),
		shopId: Number(row.shopId || 0),
		shopName: row.shopName || '',
		groupId: Number(row.groupId || 0),
		groupName: row.groupName || '',
		status,
		statusKey: statusMeta.key,
		statusText: statusMeta.text,
		statusTone: statusMeta.tone,
		refundStatusText: refundMeta.text,
		refundTone: refundMeta.tone,
		refundStatus,
		refundFlag,
		// 仅退款只能发起一次：接口下发优先 → 退款记录里有未被拒绝的仅退款 → 商品行已有退待收货数量
		onlyRefundUsed: Boolean(row.onlyRefundUsed || row.onlyRefundApplied || row.refundOnlyUsed) ||
			hasMemberOnlyRefundApplied(refundRecords) ||
			goods.some(item => Number(item.refundNum || 0) > 0),
		receiptType: Number(row.receiptType || 0),
		trueName: row.trueName || '',
		telephone: row.telephone || '',
		pointId: Number(row.pointId || 0),
		pointName: row.pointName || '',
		pointAddress: row.pointAddress || '',
		pointPerson: row.pointPerson || '',
		pointPhone: row.pointPhone || row.pointTelephone || '',
		receiptCode: row.receiptCode || '',
		nickname: row.nickname || '',
		mobile: row.mobile || '',
		reason: row.actionReason || row.refundReason || row.reason || '',
		refundDesc: row.extraReason || row.refundDesc || row.desc || row.remark || '',
		applyTime: row.applyTime || row.refundApplyTime || '',
		images: normalizeArrayField(row.refundImages || row.applyImages || row.images),
		history: normalizeArrayField(row.history || row.logs || row.refundLogs),
		receiptTime: Number(row.receiptTime || 0),
		payTime: row.payTime || row.paymentTime || '',
		payno: row.payno || '',
		groupJoinText: row.groupJoinText || row.joinText || (row.order ? `${row.order}人跟团` : ''),
		goods: goodsWithStatus
	}
}

// 提货/核销请求体（POST /order/group/order/part/receipt）。
// 整单核销不传 goodsList；部分核销时由调用方补 goodsList: [{ id, num }]。
export function buildMemberReceiptParams(order = {}, goodsList = null) {
	const payload = {
		orderNo: order.orderNo || '',
		pointId: Number(order.pointId || 0)
	}
	if (Array.isArray(goodsList) && goodsList.length) payload.goodsList = goodsList
	return payload
}

export function buildMemberErcodeParams(order = {}, token = '') {
	const orderNo = order.orderNo || ''
	const receiptCode = order.receiptCode || ''
	const scene = ['action=verify', `orderNo=${encodeURIComponent(orderNo)}`]
	if (receiptCode) scene.push(`receiptCode=${encodeURIComponent(receiptCode)}`)
	return {
		orderNo,
		token,
		codeType: 'miniProgram',
		page: 'pagesA/order/index',
		path: `/pagesA/order/index?${scene.join('&')}`,
		scene: scene.join('&')
	}
}

export function buildMemberRefundPayload({ refundFlag = MEMBER_REFUND_FLAGS.ONLY_REFUND, orderNo = '', actionReason = '', extraReason = '', goods = [], images = [] } = {}) {
	const refundGoodsMap = {}
	goods.forEach(item => {
		const id = Number(item.id || item.orderGoodsId || 0)
		const refundNum = Number(item.refundNum || item.num || 0)
		const refundAmount = Number(item.refundAmount || (Number(item.price || 0) * refundNum).toFixed(2))
		if (id > 0 && refundNum > 0) {
			refundGoodsMap[id] = { orderGoodsId: id, refundNum, refundAmount }
		}
	})
	const payload = {
		refundFlag: Number(refundFlag),
		orderNo,
		actionReason: String(actionReason || '').trim(),
		extraReason: String(extraReason || '').trim(),
		refundGoodsMap
	}
	if (Array.isArray(images) && images.length) payload.images = images
	return payload
}
