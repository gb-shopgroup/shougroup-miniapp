// 归一化「回灌」回归测试：页面普遍用 Object.assign({}, 旧order, 新数据) 再走一次归一化，
// 因此 normalizeXxxOrder 必须幂等：派生字段（refundStatus / specText / verifyRecords...）
// 不能在回灌时丢失或被旧值覆盖。修复前的线上表现是售后详情页一直停在「加载中」+ 状态错、按钮消失。
import assert from 'node:assert/strict'
import { normalizeLeaderOrder, normalizeLeaderVerifyRecords } from '../utils/leaderOrder.js'
import { mergeMemberOrderRefundRecords, normalizeMemberOrder } from '../utils/memberOrder.js'

// ---------- 团长端：真实响应（测试团购2 / 订单 200001743981000001） ----------
const leaderGoods = [
	{ id: 93, goodsId: 48, goodsName: '西瓜', goodsImg: '/1.png', goodsPrice: 0.01, goodsNum: 2, receiptNum: 0, applyRefund: 3, refundGoodsNum: 0, refundNum: 0, goodsUnit: '个', goodsInfo: '500g', skuId: 420, skuIds: '134' },
	{ id: 94, goodsId: 49, goodsName: '测试黄瓜2', goodsImg: '/2.png', goodsPrice: 0.01, goodsNum: 2, receiptNum: 0, applyRefund: 3, refundGoodsNum: 0, refundNum: 0, goodsUnit: '个', goodsInfo: '500g', skuId: 426, skuIds: '137' }
]
const leaderOrderResponse = {
	orderNo: '200001743981000001', orderTime: '2026-09-17 22:57:24', orderPrice: 0.04, shopName: '顶顶顶顶',
	groupId: 34, groupName: '测试团购2', status: 5, receiptType: 1, trueName: '路文祥', telephone: '18513712081',
	pointId: 7, pointName: '紫云南里3区', pointAddress: '北京市北京市', receiptCode: '260917225727',
	nickname: '路文祥', mobile: '18513712081', reason: '对对对', verifyRecords: []
}
const leaderRejectedPayload = Object.assign({}, leaderOrderResponse, { goods: leaderGoods })

// 1) 幂等：把归一化结果再归一化一次，结果必须完全一致（规格、售后状态、核销记录都不许变）。
const leaderOnce = normalizeLeaderOrder(leaderRejectedPayload)
const leaderTwice = normalizeLeaderOrder(leaderOnce)
assert.deepEqual(leaderTwice, leaderOnce)
assert.equal(leaderOnce.refundStatusText, '未同意')
assert.equal(leaderOnce.goods[0].specText, '500g')
// 规格兜底：行数据只带归一化字段 specText（列表页行 / 回灌数据）时也必须保留
assert.equal(normalizeLeaderOrder({ goods: [{ name: '西瓜', specText: '500g' }] }).goods[0].specText, '500g')

// 2) 回灌不回退状态：旧 order 已是「未同意」，新数据是同一单的「待处理退货」，必须以新数据为准。
const leaderPendingGoods = leaderGoods.map(goods => Object.assign({}, goods, { applyRefund: 1 }))
const refilled = normalizeLeaderOrder(Object.assign({}, leaderOnce, { goods: leaderPendingGoods }))
assert.equal(refilled.refundStatus, 1)
assert.equal(refilled.refundStatusText, '待处理退货')

// 3) 旧值是派生 0（data() 里的 normalizeLeaderOrder({})）时也不能盖住商品行推出的状态。
const staleZero = normalizeLeaderOrder(Object.assign({}, normalizeLeaderOrder({}), leaderRejectedPayload))
assert.equal(staleZero.refundStatusText, '未同意')

// 4) 订单级原始接口字段仍然优先于商品行（不要为了幂等改掉接口语义）。
assert.equal(normalizeLeaderOrder({ applyRefund: 2, goods: [{ applyRefund: 1 }] }).refundStatusText, '已退货')
assert.equal(normalizeLeaderOrder({ applyStatus: 3, goods: [{ applyRefund: 1 }] }).refundStatusText, '未同意')

// 5) 核销记录：明细与文本在回灌后不丢，时间/自提点沿用已归一化字段。
const verifyRaw = [{
	id: 7, verifyType: 2, staffName: '团长', verifyPointName: 'A点', addTime: '2026-09-17 10:00',
	verifyGoodsMsg: [{ goodsId: 1, goodsName: '西瓜', skuNames: '500g', goodsUnit: '个', verifyNum: 2, receiptNum: 2, goodsPrice: 0.01 }]
}]
const verifyOnce = normalizeLeaderVerifyRecords(verifyRaw)
assert.deepEqual(normalizeLeaderVerifyRecords(verifyOnce), verifyOnce)
assert.equal(verifyOnce[0].goodsText, '西瓜-500g×2个')
assert.equal(verifyOnce[0].time, '2026-09-17 10:00')
assert.equal(normalizeLeaderOrder(Object.assign({}, normalizeLeaderOrder({ verifyRecords: verifyRaw }), {})).verifyRecords[0].goodsText, '西瓜-500g×2个')

// 6) 记录合并后的订单再回灌，不能把售后历史/金额丢掉（refundDetail 的第二段流程）。
const leaderRecords = [
	{ id: 130, orderNo: '200001743981000001', refundGoodsMsg: '西瓜,申请退数量:2,退款金额:0.02;', isAgree: 0, actionReason: '商品质量问题', extraReason: '对对对', addTime: 1789657143 },
	{ id: 131, orderNo: '200001743981000001', refundGoodsMsg: '', isAgree: 2, actionReason: '对对对', extraReason: '', addTime: 1789657173 }
]
const merged = mergeMemberOrderRefundRecords(leaderOnce, leaderRecords)
assert.equal(merged.history.length, 2)
assert.equal(merged.reason, '商品质量问题')
const mergedTwice = normalizeLeaderOrder(Object.assign({}, merged, leaderRejectedPayload))
assert.equal(mergedTwice.history.length, 2)
assert.equal(mergedTwice.goods[0].specText, '500g')
assert.equal(mergedTwice.refundStatusText, '未同意')

// ---------- 团员端：同一类回灌 ----------
const memberOrderResponse = {
	orderNo: '200001743981000001', status: 5, orderPrice: 0.04, refundFee: 0.04, nickname: '路文祥',
	goods: [
		{ id: 93, goodsId: 48, goodsName: '西瓜', goodsPrice: 0.01, goodsNum: 2, receiptNum: 0, applyRefund: 3, refundGoodsNum: 0, refundNum: 0, goodsUnit: '个', goodsInfo: '500g' },
		{ id: 94, goodsId: 49, goodsName: '测试黄瓜2', goodsPrice: 0.01, goodsNum: 2, receiptNum: 0, applyRefund: 3, refundGoodsNum: 0, refundNum: 0, goodsUnit: '个', goodsInfo: '500g' }
	]
}
const memberOnce = normalizeMemberOrder(memberOrderResponse)
const memberTwice = normalizeMemberOrder(memberOnce)
assert.deepEqual(memberTwice, memberOnce)
assert.equal(memberOnce.refundStatus, 3)
assert.equal(memberOnce.refundStatusText, '已拒绝')
assert.equal(memberOnce.goods[0].specText, '500g')

// 回灌后状态以新数据为准（修复前旧的 refundStatus=3 会把新的待处理状态盖掉）。
const memberPendingGoods = memberOrderResponse.goods.map(goods => Object.assign({}, goods, { applyRefund: 1 }))
const memberRefilled = normalizeMemberOrder(Object.assign({}, memberOnce, { goods: memberPendingGoods }))
assert.equal(memberRefilled.refundStatus, 1)
assert.equal(memberRefilled.refundStatusText, '待处理')

// 订单级原始字段与 isAgree 兜底仍然生效。
assert.equal(normalizeMemberOrder({ applyRefund: 2, goods: [{ applyRefund: 1 }] }).refundStatusText, '已同意')
assert.equal(normalizeMemberOrder({ isAgree: 1, goods: [] }).refundStatusText, '已同意')
assert.equal(normalizeMemberOrder({ isAgree: 2, goods: [] }).refundStatusText, '已拒绝')

// C 端合并售后记录后的订单再回灌，记录与状态都保留。
const memberMerged = mergeMemberOrderRefundRecords(memberOnce, leaderRecords)
assert.equal(memberMerged.history.length, 2)
const memberMergedRefilled = normalizeMemberOrder(Object.assign({}, memberMerged, memberOrderResponse))
assert.equal(memberMergedRefilled.history.length, 2)
assert.equal(memberMergedRefilled.refundStatusText, '已拒绝')

console.log('normalizeRoundTrip tests passed')
