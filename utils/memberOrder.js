export const MEMBER_ORDER_TABS = [
	{ key: 'all', text: '全部', status: null },
	{ key: 'unreceipt', text: '待提货', status: 1 },
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

export function isMemberRefundPending(goods = {}) {
	return Number(goods.applyRefund || 0) === MEMBER_REFUND_GOODS_STATUS.PENDING
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
		1: { key: 'unreceipt', text: '待提货', tone: 'primary' },
		2: { key: 'partial', text: '部分提货', tone: 'primary' },
		3: { key: 'completed', text: '已提货', tone: 'success' },
		4: { key: 'refunded', text: '已退款', tone: 'muted' },
		// 售后列表应优先展示商品行的审核态；接口未返回审核态时才使用此兜底。
		5: { key: 'refund', text: '售后处理中', tone: 'danger' },
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

function resolveMemberRefundStatus(row = {}, goods = []) {
	const orderStatus = [
		row.applyRefund,
		row.refundStatus,
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
		specText: goods.goodsInfo || goods.skuNames || goods.skunames || goods.specText || ''
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

export function getMemberGoodsStatusList(goods = {}, refundFlag = 0) {
	const unit = goods.unit || '件'
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
	if (pendingPickupNum > 0) statusList.push({ key: 'pendingPickup', text: `待提货 ${pendingPickupNum}${unit}`, tone: 'pending' })
	if (verifiedNum > 0) statusList.push({ key: 'verified', text: `已核销 ${verifiedNum}${unit}`, tone: 'verified' })
	if (onlyRefundNum > 0) statusList.push({ key: 'refunded', text: `已退款 ${onlyRefundNum}${unit}`, tone: 'refunded' })
	if (returnRefundNum > 0) statusList.push({ key: 'returnRefunded', text: `已退货退款 ${returnRefundNum}${unit}`, tone: 'refunded' })
	if (pendingNum > 0) {
		const text = pendingFlag === MEMBER_REFUND_FLAGS.RETURN_AND_REFUND ? '退货退款处理中' : '退款处理中'
		statusList.push({ key: 'refundPending', text: `${text} ${pendingNum}${unit}`, tone: 'processing' })
	}
	return statusList
}

export function normalizeMemberRefundApplyInfo(row = {}, refundFlag = MEMBER_REFUND_FLAGS.ONLY_REFUND) {
	const goods = Array.isArray(row.refundGoods) ? row.refundGoods : (Array.isArray(row.goods) ? row.goods : [])
	const normalizedFlag = Number(row.refundFlag || refundFlag) || MEMBER_REFUND_FLAGS.ONLY_REFUND
	return {
		orderNo: row.orderNo || row.orderId || '',
		refundFlag: normalizedFlag,
		onlyRefundUsed: Boolean(row.onlyRefundUsed || row.onlyRefundApplied || row.refundOnlyUsed),
		goods: goods.map(item => {
			const availableValue = item.refundGoodsNum
			return Object.assign({}, normalizeMemberOrderGoods(item), {
				availableRefundNum: availableValue === undefined || availableValue === null
					? 0
					: Math.max(Number(availableValue || 0), 0)
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
	return Object.assign({}, order, {
		reason: latest.actionReason || order.reason || '',
		refundDesc: latest.extraReason || order.refundDesc || '',
		applyTime: latest.time || order.applyTime || '',
		refundFlag: resolveMemberRefundFlag(Object.assign({}, order, { refundFlag: latest.refundFlag || order.refundFlag }), order.goods || []),
		history
	})
}

function resolveMemberOrderStatus(rawStatus, goods = []) {
	const status = Number(rawStatus || 0)
	if (![1, 2].includes(status) || goods.length === 0) return status
	const totalNum = goods.reduce((total, item) => total + Number(item.num || 0), 0)
	const receiptNum = goods.reduce((total, item) => total + Number(item.receiptNum || 0), 0)
	if (totalNum <= 0) return status
	if (receiptNum <= 0) return 1
	if (receiptNum >= totalNum) return 3
	return 2
}

export function normalizeMemberOrder(row = {}) {
	const goods = Array.isArray(row.goods) ? row.goods.map(normalizeMemberOrderGoods) : []
	const refundFlag = resolveMemberRefundFlag(row, goods)
	const goodsWithStatus = goods.map(item => Object.assign({}, item, {
		statusList: getMemberGoodsStatusList(item, refundFlag)
	}))
	const status = resolveMemberOrderStatus(row.status, goods)
	const statusMeta = getMemberOrderStatusMeta(status)
	const refundStatus = resolveMemberRefundStatus(row, goodsWithStatus)
	const refundMeta = getMemberRefundStatusMeta(refundStatus)
	return {
		orderNo: row.orderNo || row.orderId || '',
		orderTime: row.orderTime || '',
		orderPrice: Number(row.orderPrice || row.payPrice || row.actualPrice || row.totalPrice || row.price || 0),
		// 售后记录接口的 refundFee 单位为分，订单金额仍使用元。
		refundFee: row.refundFee === undefined || row.refundFee === null ? 0 : Number(row.refundFee || 0) / 100,
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
		onlyRefundUsed: Boolean(row.onlyRefundUsed || row.onlyRefundApplied || row.refundOnlyUsed || goods.some(item => Number(item.refundNum || 0) > 0)),
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

export function buildMemberReceiptParams(order = {}) {
	return {
		orderNo: order.orderNo || '',
		point: Number(order.pointId || 0)
	}
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
