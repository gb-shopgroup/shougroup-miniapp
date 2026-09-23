import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
	buildMemberHomeListPayload,
	getGroupLabelStyle,
	getMemberHomeLabelStyle,
	normalizeLabelColor,
	normalizeMemberHomeGroup,
	resolveMemberHomeListData
} from '../utils/memberHome.js'
import {
	MEMBER_REFUND_FLAGS,
	MEMBER_ORDER_TABS,
	MEMBER_REFUND_TABS,
	buildMemberErcodeParams,
	buildMemberOrderListPayload,
	buildMemberPartReceiptPayload,
	buildMemberRefundListPayload,
	buildMemberReceiptParams,
	buildMemberRefundPayload,
	canMemberApplyRefundGoods,
	canMemberOrderApplyRefund,
	canMemberOrderMakeQr,
	canMemberOrderReceipt,
	canMemberReceiptGoods,
	memberReceiptAvailableNum,
	getMemberGoodsStatusList,
	getMemberRefundDisplayNum,
	getMemberRefundGoodsKey,
	hasMemberOnlyRefundApplied,
	isMemberOrderCancelled,
	isMemberRefundPending,
	mergeMemberOrderRefundRecords,
	normalizeMemberRefundRecord,
	normalizeMemberRefundApplyInfo,
	normalizeMemberOrder,
	resolveMemberRefundFlag
} from '../utils/memberOrder.js'

assert.deepEqual(buildMemberHomeListPayload({ leaderId: '9', page: 2, pageSize: 10 }), {
	leaderId: 9,
	page: 2,
	pageSize: 10
})
assert.deepEqual(buildMemberHomeListPayload({ leaderId: 0, longitude: '102.71', latitude: '25.04' }), {
	leaderId: 0,
	page: 1,
	pageSize: 10,
	longitude: 102.71,
	latitude: 25.04
})
// 首页分类兜底：接口没返回分类时用内置的 -1…-5 假 id（原始实现，按需求保留原样）。
// 注意：这些 id 后端匹配不到，点它们不会按分类过滤，只是把菜单显示出来；
// 要真正能过滤需要分类接口 GET /order/group/groupActivity/cat 返回数据。
const homeIndexSource = fs.readFileSync(new URL('../pages/index/index.vue', import.meta.url), 'utf8')
assert.equal(homeIndexSource.includes("{id:-1,name:'生鲜'}"), true)
assert.equal(homeIndexSource.includes("{id:-5,name:'综合'}"), true)

// catId 只发正数：后端分类是 gb_group_category_info.cat_id（int UNSIGNED 自增，来自分类接口），
// 0/负数都不是合法分类，一律不下发（历史上前端编过 -1…-5 的假 id）
assert.deepEqual(buildMemberHomeListPayload({ leaderId: 9, catId: 1 }), {
	leaderId: 9,
	page: 1,
	pageSize: 10,
	catId: 1
})
assert.deepEqual(buildMemberHomeListPayload({ leaderId: 9, catId: -1 }), {
	leaderId: 9,
	page: 1,
	pageSize: 10
})
assert.deepEqual(buildMemberHomeListPayload({ leaderId: 0, longitude: 102.71, latitude: 25.04, catId: -3 }), {
	leaderId: 0,
	page: 1,
	pageSize: 10,
	longitude: 102.71,
	latitude: 25.04
})
// 未选分类（0 / 未传）不带上 catId
assert.deepEqual(buildMemberHomeListPayload({ leaderId: 9, catId: 0 }), { leaderId: 9, page: 1, pageSize: 10 })
assert.deepEqual(buildMemberHomeListPayload({ leaderId: 9 }), { leaderId: 9, page: 1, pageSize: 10 })
// 已绑定团长不下发经纬度（后端约定：只有 leaderId=0 时必填）
assert.deepEqual(buildMemberHomeListPayload({ leaderId: 9, longitude: 102.71, latitude: 25.04 }), { leaderId: 9, page: 1, pageSize: 10 })

assert.deepEqual(buildMemberHomeListPayload({ leaderId: 9, keyword: '苹果' }), {
	leaderId: 9,
	page: 1,
	pageSize: 10,
	groupName: '苹果'
})
assert.deepEqual(buildMemberHomeListPayload({ leaderId: 9, keyword: '苹果', catId: 3 }), {
	leaderId: 9,
	page: 1,
	pageSize: 10,
	groupName: '苹果',
	catId: 3
})
assert.equal(Object.prototype.hasOwnProperty.call(buildMemberHomeListPayload({ leaderId: 0 }), 'longitude'), false)
assert.deepEqual(resolveMemberHomeListData({ records: [{ id: 1 }] }), [{ id: 1 }])

const homeGroup = normalizeMemberHomeGroup({
	id: 6,
	lid: 9,
	cat: 3,
	name: '周末牛肉团',
	pickup: 1,
	price: 88,
	price2: 230,
	img: '/a.png',
	img2: '/b.png',
	img3: '',
	shopName: '云朵小店',
	shopLogo: '/shop-logo.png',
	info: '雪山天骄的新鲜牛肉',
	tagName: '新品尝鲜',
		virtual: 888,
		order: 99,
		timeText: '20分钟前',
		isClose: 0,
		startTime: 1780000000,
		endTime: 1780086400,
		goods: [{ gid: 1, gname: '牛肉', img: '/g.png', price: 88 }],
		groupLogs: [
			{ userAvatar: '/u.png', userTime: '1分钟前', userGoodsName: '牛肉', userGoodsNum: '2' },
			{ userAvatar: '/u2.png', userTime: '2分钟前', userGoodsName: '羊肉', userGoodsNum: '1' }
		]
	})
assert.equal(homeGroup.id, 6)
assert.equal(homeGroup.leaderId, 9)
assert.equal(homeGroup.leaderName, '云朵小店')
assert.equal(homeGroup.leaderAvatar, '/shop-logo.png')
assert.equal(homeGroup.viewText, 888)
	// 跟团次数取接口的真实订单数（order: 99），不是预览记录条数（groupLogs 只有 2 条）
	assert.equal(homeGroup.joinText, 99)
	assert.equal(homeGroup.joinNum, 99)
	// 预览记录仍来自 groupLogs
	assert.equal(homeGroup.records.length, 2)
assert.equal(homeGroup.timeText, '20分钟前')
assert.equal(homeGroup.label, '新品尝鲜')
assert.equal(homeGroup.goods[0].name, '牛肉')
assert.deepEqual(homeGroup.images, ['/a.png', '/b.png'])
assert.equal(homeGroup.records[0].goodsName, '牛肉')
assert.equal(homeGroup.records[0].avatar, '/u.png')
assert.equal(homeGroup.records[0].num, '2')
assert.equal(homeGroup.statusText, '正在跟团中')

const partiallyRefundedGoodsOrder = normalizeMemberOrder({
	orderNo: 'NO127',
	status: 3,
	goods: [{ id: 7, goodsName: '鸡蛋', goodsPrice: 3.5, goodsNum: 3, receiptNum: 3, refundGoodsNum: 1 }]
})
assert.equal(partiallyRefundedGoodsOrder.goods[0].onlyRefundAvailableNum, 0)
assert.equal(partiallyRefundedGoodsOrder.goods[0].returnRefundAvailableNum, 2)
assert.equal(normalizeMemberOrder({ goods: [{ Id: 9, goodsName: '苹果' }] }).goods[0].id, 9)
// 规格文本按接口响应字段 goodsInfo 取值，并保留历史字段兜底；只有 skuIds 时不凭空造值。
assert.equal(normalizeMemberOrder({ goods: [{ goodsName: '花生', goodsInfo: '1kg', skuId: 31, skuIds: '21' }] }).goods[0].specText, '1kg')
assert.equal(normalizeMemberOrder({ goods: [{ goodsName: '花生', skuNames: '1kg' }] }).goods[0].specText, '1kg')
assert.equal(normalizeMemberOrder({ goods: [{ goodsName: '花生', skuName: '1kg' }] }).goods[0].specText, '1kg')
assert.equal(normalizeMemberOrder({ goods: [{ goodsName: '花生', packName: '2kg装' }] }).goods[0].specText, '2kg装')
assert.equal(normalizeMemberOrder({ goods: [{ goodsName: '花生', goodsInfo: '', skuId: 31, skuIds: '21' }] }).goods[0].specText, '')
assert.equal(canMemberApplyRefundGoods({ applyRefund: 0 }, MEMBER_REFUND_FLAGS.RETURN_AND_REFUND), true)
assert.equal(canMemberApplyRefundGoods({ applyRefund: 3 }, MEMBER_REFUND_FLAGS.ONLY_REFUND), true)
assert.equal(canMemberApplyRefundGoods({ applyRefund: 3 }, MEMBER_REFUND_FLAGS.RETURN_AND_REFUND), false)
assert.equal(canMemberApplyRefundGoods({ applyRefund: 1 }, MEMBER_REFUND_FLAGS.ONLY_REFUND), false)
assert.equal(canMemberApplyRefundGoods({ applyRefund: 2 }, MEMBER_REFUND_FLAGS.RETURN_AND_REFUND), false)

// 已取消订单(status=6)即使商品行仍残留可退数量，也不再展示「申请退款」入口。
const cancelledOrder = normalizeMemberOrder({
	orderNo: 'NO-CANCELLED',
	status: 6,
	goods: [{ orderGoodsId: 7, goodsName: '北方大土豆', goodsPrice: 0.02, goodsNum: 2, receiptNum: 0, refundNum: 0 }]
})
assert.equal(cancelledOrder.status, 6)
assert.equal(cancelledOrder.goods[0].onlyRefundAvailableNum, 2)
assert.equal(isMemberOrderCancelled({ status: 6 }), true)
assert.equal(isMemberOrderCancelled({ status: '6' }), true)
assert.equal(isMemberOrderCancelled({ status: 3 }), false)
assert.equal(isMemberOrderCancelled({}), false)
assert.equal(isMemberOrderCancelled({ statusKey: 'cancelled' }), true)
assert.equal(canMemberOrderApplyRefund({ status: 1, goods: [{ applyRefund: 0, onlyRefundAvailableNum: 2 }] }), true)
assert.equal(canMemberOrderApplyRefund(cancelledOrder), false)
assert.equal(canMemberOrderApplyRefund({ status: '6', goods: [{ applyRefund: 0, returnRefundAvailableNum: 2 }] }), false)
assert.equal(canMemberOrderApplyRefund({ status: 6, goods: [] }), false)

// 「申请退款」入口只看订单状态：0 未支付 / 4 已退款 / 6 已取消 不显示，其余都显示。
// 部分核销后申请退货退款、审核通过进入售后(5) 时，剩余商品仍要能再次申请。
assert.equal(canMemberOrderApplyRefund({ status: 0 }), false)
assert.equal(canMemberOrderApplyRefund({ status: '0' }), false)
assert.equal(canMemberOrderApplyRefund({ status: 4 }), false)
assert.equal(canMemberOrderApplyRefund({ status: '4' }), false)
assert.equal(canMemberOrderApplyRefund({ status: 6 }), false)
assert.equal(canMemberOrderApplyRefund({}), false)
assert.equal(canMemberOrderApplyRefund({ status: 1 }), true)
assert.equal(canMemberOrderApplyRefund({ status: 2 }), true)
assert.equal(canMemberOrderApplyRefund({ status: 3 }), true)
assert.equal(canMemberOrderApplyRefund({ status: 5 }), true)
assert.equal(canMemberOrderApplyRefund({ status: '5' }), true)
// 不再依赖商品行残留可退数量，商品行审核态不影响入口。
assert.equal(canMemberOrderApplyRefund({ status: 5, goods: [{ applyRefund: 2, onlyRefundAvailableNum: 0, returnRefundAvailableNum: 0 }] }), true)
assert.equal(canMemberOrderApplyRefund({ status: 3, goods: [{ applyRefund: 3, returnRefundAvailableNum: 2 }] }), true)

// 已取消订单不再提供核销码入口，也不再展示「待提货」商品状态。
const pendingPickupGoods = { applyRefund: 0, num: 2, receiptNum: 0, pendingReceiptNum: 2 }
assert.equal(canMemberOrderMakeQr({ status: 1, goods: [pendingPickupGoods] }), true)
assert.equal(canMemberOrderMakeQr(cancelledOrder), false)
assert.equal(canMemberOrderMakeQr({ status: '6', goods: [pendingPickupGoods] }), false)
assert.equal(canMemberOrderMakeQr({ status: 6, goods: [{ pendingReceiptNum: 0 }] }), false)
// 核销码入口与「能否核销」同源：只要还有可核销数量就允许生成（不再要求 applyRefund ∈ {0,3}）。
// 【真实订单 200002655995000001】大玉米 买3/已收2/退货退款1（applyRefund=2）→ 还剩 1 件可提
const makeQrRealOrder = normalizeMemberOrder({
	orderNo: '200002655995000001', status: 5, pointId: 12,
	goods: [
		{ id: 129, goodsName: '望京大玉米', goodsNum: 3, receiptNum: 2, applyRefund: 2, refundGoodsNum: 1, refundNum: 0, goodsPrice: 0.8, goodsUnit: '个' },
		{ id: 130, goodsName: '望京外来品种黑玉米', goodsNum: 3, receiptNum: 3, applyRefund: 2, refundGoodsNum: 2, refundNum: 0, goodsPrice: 0.4, goodsUnit: '个' }
	]
})
assert.equal(canMemberOrderMakeQr(makeQrRealOrder), true)
// 核销码入口按订单状态放行：1 待收货 / 2 部分收货 / 5 售后 都给入口；
// 即使某行已被退款占满，顾客仍要能出示核销码给团长核对（能否核销由核销侧判定）
assert.equal(canMemberOrderMakeQr(normalizeMemberOrder({ orderNo: 'x', status: 5, goods: [{ goodsNum: 3, receiptNum: 0, refundNum: 3, applyRefund: 2 }] })), true)
assert.equal(canMemberOrderMakeQr(normalizeMemberOrder({ orderNo: 'x', status: 5, goods: [{ goodsNum: 3, receiptNum: 0, refundNum: 1, applyRefund: 1 }] })), true)
assert.equal(canMemberOrderMakeQr({ status: 1 }), true)
assert.equal(canMemberOrderMakeQr({ status: 2 }), true)
assert.equal(canMemberOrderMakeQr({ status: 5 }), true)
// 已提货(3) / 已退款(4) / 待支付(0) / 已取消(6) 不放入口
assert.equal(canMemberOrderMakeQr({ status: 3 }), false)
assert.equal(canMemberOrderMakeQr({ status: 4 }), false)
assert.equal(canMemberOrderMakeQr({ status: 0 }), false)
assert.equal(canMemberOrderMakeQr({ status: 6 }), false)
assert.equal(cancelledOrder.goods[0].pendingReceiptNum, 2)
assert.deepEqual(cancelledOrder.goods[0].statusList, [])
assert.deepEqual(getMemberGoodsStatusList({ num: 2, receiptNum: 0 }, 0, 6), [])
assert.deepEqual(getMemberGoodsStatusList({ num: 2, receiptNum: 0 }, 0, 3).map(item => item.text), ['待提货 2件'])
assert.deepEqual(getMemberGoodsStatusList({ num: 2, receiptNum: 2, refundNum: 2 }, 0, 6).map(item => item.text), ['已核销 2件', '已退款 2件'])

assert.equal(normalizeMemberRefundApplyInfo({
	orderNo: 'NO127',
	goods: [{ id: 7, goodsId: 8, goodsName: '鸡蛋', goodsNum: 3, receiptNum: 3, refundGoodsNum: 1 }]
}, MEMBER_REFUND_FLAGS.RETURN_AND_REFUND).goods.length, 0)
const mixedRefundApplyInfo = normalizeMemberRefundApplyInfo({
	orderNo: 'NO128',
	refundGoods: [
		{ id: 59, goodsId: 48, goodsName: '西瓜', goodsNum: 2, refundGoodsNum: 2 },
		{ id: 60, goodsId: 49, goodsName: '测试黄瓜2', goodsNum: 2, refundGoodsNum: 1 }
	]
}, MEMBER_REFUND_FLAGS.RETURN_AND_REFUND, normalizeMemberOrder({
	orderNo: 'NO128',
	goods: [
		{ id: 59, goodsId: 48, goodsName: '西瓜', goodsNum: 2, receiptNum: 2, refundGoodsNum: 0, applyRefund: 3 },
		{ id: 60, goodsId: 49, goodsName: '测试黄瓜2', goodsNum: 2, receiptNum: 1, refundGoodsNum: 0 }
	]
}).goods)
// 接口 refundGoods 已筛好可退商品，前端不得再按审核态/可退数量二次筛选。
assert.equal(mixedRefundApplyInfo.goods.length, 2)
assert.equal(mixedRefundApplyInfo.goods[0].name, '西瓜')
assert.equal(mixedRefundApplyInfo.goods[1].name, '测试黄瓜2')
assert.equal(mixedRefundApplyInfo.goods[1].availableRefundNum, 1)
assert.equal(normalizeMemberRefundApplyInfo({
	orderNo: 'NO129',
	refundGoods: [{ id: 8, goodsId: 9, goodsName: '服务端可退数量', goodsNum: 3, receiptNum: 3, refundGoodsNum: 2, availableRefundNum: 2 }]
}, MEMBER_REFUND_FLAGS.RETURN_AND_REFUND).goods[0].availableRefundNum, 2)
// 真实响应复现：refundFlag=1 时接口只返回一条可退商品，前端必须原样保留且可退数量可用。
const realApplyInfo = normalizeMemberRefundApplyInfo({
	orderNo: '200001996777000001',
	refundGoods: [{
		id: 86, goodsId: 48, goodsName: '西瓜', goodsImg: '/p.png', goodsPrice: 0.02,
		goodsNum: 1, refundGoodsNum: 1, goodsUnit: '个', goodsInfo: '1kg', skuId: 421, skuIds: '135'
	}]
}, MEMBER_REFUND_FLAGS.ONLY_REFUND, normalizeMemberOrder({
	orderNo: '200001996777000001',
	status: 1,
	goods: [{ id: 86, goodsId: 48, goodsName: '西瓜', goodsPrice: 0.02, goodsNum: 1, receiptNum: 0, refundNum: 0, refundGoodsNum: 0, applyRefund: 0 }]
}).goods)
assert.equal(realApplyInfo.goods.length, 1)
assert.equal(realApplyInfo.goods[0].name, '西瓜')
assert.equal(realApplyInfo.goods[0].specText, '1kg')
assert.equal(realApplyInfo.goods[0].availableRefundNum, 1)
const mixedRefundApplyInfoWithBaseOrder = normalizeMemberRefundApplyInfo({
	orderNo: 'NO130',
	refundGoods: [
		{ id: 60, goodsId: 49, goodsName: '测试黄瓜2', goodsNum: 2, refundGoodsNum: 1 }
	]
}, MEMBER_REFUND_FLAGS.RETURN_AND_REFUND, normalizeMemberOrder({
	orderNo: 'NO130',
	goods: [
		{ id: 59, goodsId: 48, goodsName: '西瓜', goodsNum: 2, receiptNum: 2, refundGoodsNum: 0, applyRefund: 3 },
		{ id: 60, goodsId: 49, goodsName: '测试黄瓜2', goodsNum: 2, receiptNum: 1, refundGoodsNum: 0 }
	]
}).goods)
assert.equal(mixedRefundApplyInfoWithBaseOrder.goods.length, 1)
assert.equal(mixedRefundApplyInfoWithBaseOrder.goods[0].name, '测试黄瓜2')
assert.equal(mixedRefundApplyInfoWithBaseOrder.goods[0].receiptNum, 1)
assert.equal(mixedRefundApplyInfoWithBaseOrder.goods[0].refundGoodsNum, 0)
assert.equal(mixedRefundApplyInfoWithBaseOrder.goods[0].availableRefundNum, 1)

const shopGroupWithoutActivityImage = normalizeMemberHomeGroup({
	id: 16,
	lid: 9,
	name: '店铺商品图兜底',
	goods: [
		{ gid: 31, gname: '香蕉', img: '/banana.png', price: 12 },
		{ gid: 0, gname: '', img: '' }
	]
})
assert.deepEqual(shopGroupWithoutActivityImage.images, ['/banana.png'])
assert.equal(shopGroupWithoutActivityImage.goods.length, 1)

const homeGroupWithNestedShop = normalizeMemberHomeGroup({
	id: 17,
	lid: 9,
	name: '嵌套店铺头像',
	shop: { name: '嵌套店铺', shopLogo: '/nested-shop-logo.png' }
})
assert.equal(homeGroupWithNestedShop.leaderName, '嵌套店铺')
assert.equal(homeGroupWithNestedShop.leaderAvatar, '/nested-shop-logo.png')

const offlineHomeGroup = normalizeMemberHomeGroup({
	id: 12,
	lid: 1,
	name: '下线测试团',
	isClose: 1
})
assert.equal(offlineHomeGroup.statusText, '已下线')

assert.deepEqual(buildMemberOrderListPayload({ goodsName: '苹果', status: 1, page: 3, pageSize: 20 }), {
	goodsName: '苹果',
	status: 1,
	page: 3,
	pageSize: 20
})
assert.deepEqual(buildMemberOrderListPayload({ tab: 'all', page: 1 }), { page: 1, pageSize: 10 })
assert.deepEqual(MEMBER_ORDER_TABS.map(item => item.key), ['all', 'unreceipt', 'completed', 'unpay', 'refund'])
assert.deepEqual(buildMemberOrderListPayload({ tab: 'completed', page: 1 }), {
	status: 3,
	page: 1,
	pageSize: 10
})
assert.equal(MEMBER_ORDER_TABS.find(item => item.key === 'refund').text, '售后')
assert.equal(MEMBER_REFUND_TABS.find(item => item.key === 'rejected').text, '未同意')
assert.deepEqual(buildMemberRefundListPayload({ goodsName: '苹果', tab: 'approved', page: 2, pageSize: 20 }), {
	goodsName: '苹果',
	status: 2,
	page: 2,
	pageSize: 20
})

const order = normalizeMemberOrder({
	orderNo: 'NO123',
	orderTime: '2026-08-30 12:00:00',
	orderPrice: 99,
	shopName: '云朵小店',
	groupId: 7,
	groupName: '水果团',
	status: 1,
	pointId: 5,
	pointName: '天骄北麓',
	pointAddress: '25栋',
	pointPerson: '提货员',
	pointPhone: '13800000001',
	receiptCode: 'RC888',
	goods: [{ id: 88, goodsId: 8, goodsName: '苹果', goodsImg: '/apple.png', goodsPrice: 9.9, goodsNum: 10, skuId: 31, skuIds: '21', skuNames: '500g' }]
})
assert.equal(order.orderNo, 'NO123')
assert.equal(order.statusKey, 'unreceipt')
assert.equal(order.statusText, '待收货')
assert.equal(order.goods[0].name, '苹果')
assert.equal(order.goods[0].specText, '500g')
assert.equal(order.goods[0].skuId, 31)
assert.equal(order.telephone, '')
assert.equal(order.pointPerson, '提货员')
assert.equal(order.pointPhone, '13800000001')
// 金额按接口返回的「元」原样使用，前端不做分→元换算（¥3 就是 ¥3，不是 ¥0.03）。
assert.equal(normalizeMemberOrder({ refundFee: 3 }).refundFee, 3)
assert.equal(normalizeMemberOrder({ refundFee: 0.03 }).refundFee, 0.03)
assert.equal(normalizeMemberOrder({ refundFee: 12.5 }).refundFee, 12.5)
assert.equal(normalizeMemberOrder({ orderNo: 'NO127', status: 2, payno: '4500000369202609051846020800' }).statusText, '部分收货')
assert.equal(normalizeMemberOrder({ orderNo: 'NO128', status: 3 }).statusText, '已提货')
assert.equal(normalizeMemberOrder({ orderNo: 'NO131', status: 5, applyRefund: 1 }).refundStatusText, '待处理')
assert.equal(normalizeMemberOrder({ orderNo: 'NO132', status: 5, applyRefund: 2 }).refundStatusText, '已同意')
assert.equal(normalizeMemberOrder({ orderNo: 'NO133', status: 5, applyRefund: 3 }).refundStatusText, '已拒绝')
assert.equal(normalizeMemberOrder({ orderNo: 'NO134', status: 5, goods: [{ applyRefund: 1 }] }).refundStatusText, '待处理')
assert.equal(normalizeMemberOrder({ orderNo: 'NO135', status: 5, refundStatus: 2 }).refundStatusText, '已同意')
assert.equal(normalizeMemberOrder({ orderNo: 'NO136', status: 5, isAgree: 2 }).refundStatusText, '已拒绝')
assert.equal(normalizeMemberOrder({ orderNo: 'NO137', status: 5 }).statusText, '售后')
assert.equal(normalizeMemberOrder({
	orderNo: 'NO129',
	status: 2,
	payno: '4500000369202609051846020800',
	goods: [{ id: 1, goodsNum: 1, receiptNum: 0 }]
}).statusText, '部分收货')
assert.equal(normalizeMemberOrder({
	orderNo: 'NO130',
	status: 2,
	goods: [{ id: 1, goodsNum: 2, receiptNum: 1 }]
}).statusText, '部分收货')
assert.equal(normalizeMemberOrder({
	orderNo: 'NO138',
	status: 1,
	goods: [{ id: 1, goodsNum: 1, receiptNum: 1 }]
}).statusText, '待收货')
assert.equal(normalizeMemberOrder({ orderNo: 'NO124', payPrice: 18.8 }).orderPrice, 18.8)
assert.equal(normalizeMemberOrder({ orderNo: 'NO125', payTime: '2026-09-05 00:01:02', order: 9 }).payTime, '2026-09-05 00:01:02')
assert.equal(normalizeMemberOrder({ orderNo: 'NO126', paymentTime: '2026-09-05 00:02:03', joinText: '12人跟团' }).groupJoinText, '12人跟团')
// 提货/核销改为 POST /order/group/order/part/receipt：body 用 pointId，整单核销不带 goodsList
assert.deepEqual(buildMemberReceiptParams(order), { orderNo: 'NO123', pointId: 5 })
assert.deepEqual(buildMemberReceiptParams(order, [{ id: 88, num: 2 }]), { orderNo: 'NO123', pointId: 5, goodsList: [{ id: 88, num: 2 }] })
assert.deepEqual(buildMemberReceiptParams(order, []), { orderNo: 'NO123', pointId: 5 })

// 自助核销按数量部分核销：勾选走 goodsList、未勾选整单、超额夹紧、售后中忽略
const partReceiptOrder = normalizeMemberOrder({
	orderNo: 'NO9',
	status: 1,
	pointId: 5,
	goods: [
		{ orderGoodsId: 11, goodsName: 'a', goodsNum: 2, receiptNum: 0, applyRefund: 0 },
		{ orderGoodsId: 12, goodsName: 'b', goodsNum: 3, receiptNum: 1, applyRefund: 0 },
		{ orderGoodsId: 13, goodsName: 'c', goodsNum: 5, receiptNum: 0, applyRefund: 1 }
	]
})
assert.equal(partReceiptOrder.goods[0].pendingReceiptNum, 2)
assert.equal(partReceiptOrder.goods[1].pendingReceiptNum, 2)
assert.equal(canMemberReceiptGoods(partReceiptOrder.goods[0]), true)
// 选项 B：售后审核中(1) 的行只要还剩未收到的数量就可核销（占用已计入 refundNum）
assert.equal(canMemberReceiptGoods(partReceiptOrder.goods[2]), true)
assert.equal(memberReceiptAvailableNum(partReceiptOrder.goods[2]), 5)
// 未勾选任何商品 → 整单核销（不带 goodsList）
assert.deepEqual(buildMemberPartReceiptPayload(partReceiptOrder, {}), { orderNo: 'NO9', pointId: 5 })
// 勾选部分数量 → 只提交勾选的行
assert.deepEqual(buildMemberPartReceiptPayload(partReceiptOrder, { 11: 1 }), {
	orderNo: 'NO9',
	pointId: 5,
	goodsList: [{ id: 11, num: 1 }]
})
assert.deepEqual(buildMemberPartReceiptPayload(partReceiptOrder, { 11: 2, 12: 2 }), {
	orderNo: 'NO9',
	pointId: 5,
	goodsList: [{ id: 11, num: 2 }, { id: 12, num: 2 }]
})
// 超过可核销数量时夹紧到 pendingReceiptNum
assert.deepEqual(buildMemberPartReceiptPayload(partReceiptOrder, { 11: 99 }), {
	orderNo: 'NO9',
	pointId: 5,
	goodsList: [{ id: 11, num: 2 }]
})
// 选项 B：售后审核中的行也可核销剩余部分（该行 5 件未收、未被退款占用）
assert.deepEqual(buildMemberPartReceiptPayload(partReceiptOrder, { 13: 5 }), {
	orderNo: 'NO9',
	pointId: 5,
	goodsList: [{ id: 13, num: 5 }]
})
// 剩余为 0 的行不参与核销
const occupiedOrder = normalizeMemberOrder({ orderNo: 'NO10', status: 1, pointId: 5, goods: [{ orderGoodsId: 14, goodsNum: 3, receiptNum: 0, refundNum: 3, applyRefund: 1 }] })
assert.deepEqual(buildMemberPartReceiptPayload(occupiedOrder, { 14: 3 }), { orderNo: 'NO10', pointId: 5 })
// 数量为 0 不提交
assert.deepEqual(buildMemberPartReceiptPayload(partReceiptOrder, { 11: 0 }), { orderNo: 'NO9', pointId: 5 })
assert.deepEqual(buildMemberErcodeParams(order, 'USER_TOKEN'), {
	orderNo: 'NO123',
	token: 'USER_TOKEN',
	codeType: 'miniProgram',
	page: 'pagesA/order/index',
	path: '/pagesA/order/index?action=verify&orderNo=NO123&receiptCode=RC888',
	scene: 'action=verify&orderNo=NO123&receiptCode=RC888'
})
assert.deepEqual(buildMemberRefundPayload({
	orderNo: 'NO123',
	actionReason: '不想要了',
	extraReason: '买多了',
	goods: [{ id: 88, refundNum: 2, refundAmount: 19.8 }],
	images: ['/refund.png']
}), {
	refundFlag: 1,
	orderNo: 'NO123',
	actionReason: '不想要了',
	extraReason: '买多了',
	images: ['/refund.png'],
	refundGoodsMap: {
		88: { orderGoodsId: 88, refundNum: 2, refundAmount: 19.8 }
	}
})
assert.deepEqual(buildMemberRefundPayload({
	orderNo: 'NO124',
	refundFlag: MEMBER_REFUND_FLAGS.RETURN_AND_REFUND,
	actionReason: '组合退款',
	extraReason: '部分商品退款',
	goods: [
		{ id: 88, refundNum: 1, refundAmount: 9.9 },
		{ id: 99, refundNum: 2, refundAmount: 13.2 }
	]
}).refundGoodsMap, {
	88: { orderGoodsId: 88, refundNum: 1, refundAmount: 9.9 },
	99: { orderGoodsId: 99, refundNum: 2, refundAmount: 13.2 }
})

assert.deepEqual(normalizeMemberRefundRecord({
	id: 3,
	orderNo: 'NO123',
	refundFlag: 0,
	refundGoodsMsg: '苹果x2',
	operateName: '团长',
	isAgree: 2,
	actionReason: '多拍了',
	extraReason: '库存不足',
	addTime: 1780000000
}), {
	id: 3,
	orderNo: 'NO123',
	refundFlag: 0,
	refundGoodsMsg: '苹果x2',
	// 记录级退款金额（元），售后详情「退款金额」的累加兜底来源
	refundFee: 0,
	operateId: 0,
	operateName: '团长',
	isAgree: 2,
	statusKey: 'rejected',
	statusText: '团长已拒绝',
	content: '团长拒绝退款申请：苹果x2',
	actionReason: '多拍了',
	extraReason: '库存不足',
	reason: '库存不足',
	addTime: 1780000000,
	time: '2026-05-29 04:26'
})
const mergedRefundOrder = mergeMemberOrderRefundRecords(order, [
	{ id: 1, orderNo: 'NO123', isAgree: 0, actionReason: '多拍了', extraReason: '先申请', addTime: 1780000000 },
	{ id: 2, orderNo: 'NO123', isAgree: 1, actionReason: '多拍了', extraReason: '同意退款', addTime: 1780000100 }
])
assert.equal(mergedRefundOrder.reason, '多拍了')
assert.equal(mergedRefundOrder.refundDesc, '先申请')

const pendingOnlyRefundGoods = normalizeMemberOrder({
	goods: [{ id: 33, goodsName: '333', goodsNum: 2, receiptNum: 0, goodsPrice: 0.01, applyRefund: 1, refundNum: null }]
}).goods
assert.equal(resolveMemberRefundFlag({}, pendingOnlyRefundGoods), MEMBER_REFUND_FLAGS.ONLY_REFUND)
assert.equal(getMemberRefundDisplayNum(pendingOnlyRefundGoods[0], MEMBER_REFUND_FLAGS.ONLY_REFUND), 2)
assert.deepEqual(getMemberGoodsStatusList(pendingOnlyRefundGoods[0], MEMBER_REFUND_FLAGS.ONLY_REFUND).map(item => item.text), ['退款处理中 2件'])

const rejectedAndPendingRefundGoods = normalizeMemberOrder({
	goods: [
		{ id: 35, goodsName: '历史拒绝商品', goodsNum: 2, receiptNum: 2, goodsPrice: 0.01, applyRefund: 3, refundGoodsNum: 0 },
		{ id: 36, goodsName: '当前申请商品', goodsNum: 1, receiptNum: 1, goodsPrice: 0.01, applyRefund: 1, refundGoodsNum: 1 }
	]
}).goods
assert.deepEqual(rejectedAndPendingRefundGoods.filter(isMemberRefundPending).map(item => item.name), ['当前申请商品'])
assert.equal(getMemberRefundDisplayNum(rejectedAndPendingRefundGoods[1], MEMBER_REFUND_FLAGS.RETURN_AND_REFUND), 1)
assert.deepEqual(getMemberGoodsStatusList(rejectedAndPendingRefundGoods[1], MEMBER_REFUND_FLAGS.RETURN_AND_REFUND).map(item => item.text), ['退货退款处理中 1件'])

const pendingReturnRefundOrder = normalizeMemberOrder({
	status: 5,
	goods: [{
		id: 56,
		goodsName: '黄瓜',
		goodsNum: 1,
		goodsUnit: '斤',
		receiptNum: 1,
		applyRefund: 1,
		refundGoodsNum: 1,
		refundNum: null
	}]
})
assert.deepEqual(pendingReturnRefundOrder.goods[0].statusList.map(item => item.text), ['退货退款处理中 1斤'])

const mixedGoodsStatusOrder = normalizeMemberOrder({
	goods: [{
		id: 34,
		goodsName: '苹果',
		goodsNum: 4,
		goodsUnit: '个',
		receiptNum: 3,
		refundNum: 1,
		refundGoodsNum: 1
	}]
})
assert.deepEqual(mixedGoodsStatusOrder.goods[0].statusList.map(item => item.text), ['已核销 2个', '已退款 1个', '已退货退款 1个'])
assert.equal(mergedRefundOrder.history[0].statusKey, 'approved')

const apiSource = fs.readFileSync(new URL('../api/group.js', import.meta.url), 'utf8')
assert.equal(apiSource.includes("url: '/order/member/groupActivity/list'"), true)
assert.equal(apiSource.includes("url: '/order/group/get/groupActivity/list'"), false)
assert.equal(apiSource.includes("url: '/order/group/groupActivity/logs2'"), true)
assert.equal(apiSource.includes("url: '/group/groupActivity/logs2'"), false)
assert.equal(apiSource.includes("url: '/order/group/groupActivity/logs'"), false)
assert.equal(apiSource.includes('withGroupLogId'), false)
assert.equal(apiSource.includes('withLogId'), true)
assert.equal(apiSource.includes("url: '/order/group/groupActivity/view'"), true)
assert.equal(apiSource.includes('export function reportMemberGroupView'), true)
assert.equal(apiSource.includes("url: '/order/group/order/applyRefund/orderInfo'"), true)
assert.equal(apiSource.includes("url: '/order/group/groupActivity/list'"), false)
assert.equal(apiSource.includes("url: '/order/group/order/list'"), true)
assert.equal(apiSource.includes("url: '/order/group/order/notAllReceiptList'"), true)
// 核销切到新的 part/receipt（支持整单 + 部分核销），旧 GET receipt 不再使用
assert.equal(apiSource.includes("url: '/order/group/order/part/receipt'"), true)
assert.equal(apiSource.includes("url: '/order/group/order/receipt'"), false)
assert.match(apiSource, /url: '\/order\/group\/order\/part\/receipt',\s*method: 'POST'/)
assert.equal(apiSource.includes("url: '/order/group/order/getPaidOrders'"), false)
assert.equal(apiSource.includes("url: '/order/group/order/refund/reasonList'"), true)
assert.equal(apiSource.includes("url: '/order/group/order/refund/recodes'"), true)
assert.equal(apiSource.includes("url: '/order/group/order/count'"), false)
assert.equal(apiSource.includes("url: '/group/member/order/receipt'"), false)
assert.equal(apiSource.includes("url: '/group/member/order/unreceipt'"), false)
assert.equal(apiSource.includes("getErcodeInfo(params, userToken = '')"), true)
assert.equal(apiSource.includes('const header = userToken ? { Authorization: userToken } : {}'), true)

const wechatApiSource = fs.readFileSync(new URL('../api/wechat.js', import.meta.url), 'utf8')
assert.equal(wechatApiSource.includes('https://api.weixin.qq.com/wxa/getwxacode?access_token='), true)
assert.equal(wechatApiSource.includes("responseType: 'arraybuffer'"), true)
assert.equal(wechatApiSource.includes('data:image/png;base64,'), true)

const authSource = fs.readFileSync(new URL('../utils/auth.js', import.meta.url), 'utf8')
assert.equal(authSource.includes("userInfo.wxAccessToken || userInfo.accessToken || userInfo.access_token"), true)
assert.equal(authSource.includes("WX_ACCESS_TOKEN_STORAGE_KEY = 'wx_access_token'"), true)
assert.equal(authSource.includes("MEMBER_BOUND_LEADER_STORAGE_KEY = 'member_bound_leader_id'"), true)

const homeSource = fs.readFileSync(new URL('../pages/index/index.vue', import.meta.url), 'utf8')
assert.equal(homeSource.includes('getMemberGroupActivityList'), true)
assert.equal(homeSource.includes('getMemberGroupActivityLogs2'), false)
assert.equal(homeSource.includes('getGroupShop'), true)
assert.equal(homeSource.includes('reportMemberGroupView'), true)
assert.equal(homeSource.includes('this.reportGroupView(group)'), true)
assert.equal(homeSource.includes('uni.setStorageSync(MEMBER_BOUND_LEADER_STORAGE_KEY, leaderId)'), true)
assert.equal(homeSource.includes('MEMBER_BOUND_LEADER_STORAGE_KEY'), true)
assert.equal(homeSource.includes("uni.getLocation({ type: 'gcj02'"), true)
assert.equal(homeSource.includes("uni.getStorageSync('leader')"), false)
assert.equal(homeSource.includes('getFoucsList'), false)
assert.equal(homeSource.includes('src="/static/image/logo.png"'), true)
assert.equal(homeSource.includes("item.leaderAvatar || '/static/image/head.png'"), true)
assert.equal(homeSource.includes("item.leaderName || '团长'"), true)
assert.equal(homeSource.includes('item.label'), true)
assert.equal(homeSource.includes('item.joinText'), true)
// 卡片标签改为「切图 + 药丸」：三张切图分别对应 B 端三个标签选项
assert.equal(homeSource.includes('isWarmLabel'), false)
assert.equal(homeSource.includes("class=\"group-label\" v-if=\"item.labelStyle\""), true)
assert.equal(homeSource.includes(':style="{ color: item.labelStyle.color, borderColor: item.labelStyle.color }"'), true)
assert.equal(homeSource.includes('class="label-ring" v-if="item.labelStyle.ring"'), true)
assert.equal(homeSource.includes('class="label-icon" v-if="item.labelStyle.icon"'), true)
assert.equal(homeSource.includes('{{ item.labelStyle.text }}'), true)
assert.equal(homeSource.includes('.label-badge {'), true)
// 尺寸按设计图（个人信息@2x.png，1图px = 1rpx）量得并锁定
assert.equal(homeSource.includes('height: 28rpx;'), true)
assert.equal(homeSource.includes('border-radius: 14rpx;'), true)
assert.equal(homeSource.includes('margin-right: 32rpx;'), true)
assert.equal(homeSource.includes('height: 24rpx;'), true)
assert.equal(homeSource.includes('margin-left: 15rpx;'), true)
// 文字距右边框 16rpx（设计图量测；原来 2rpx 太贴边）
assert.equal(homeSource.includes('padding-right: 16rpx;'), true)
assert.equal(homeSource.includes('padding-right: 2rpx;'), false)
assert.equal(homeSource.includes('font-size: 22rpx;'), true)
assert.equal(homeSource.includes('.group-label.tone-fast .label-icon {'), true)
// 同一张设计图量得的卡片头部尺寸（头像 80×80、间距 23、名称 28、副标题 24 + 上间距 13）
assert.equal(homeSource.includes('width: 80rpx;'), true)
assert.equal(homeSource.includes('margin-left: 23rpx;'), true)
assert.equal(homeSource.includes('font-size: 28rpx;'), true)
assert.equal(homeSource.includes('margin-top: 13rpx;'), true)
assert.equal(homeSource.includes('font-size: 24rpx;'), true)
// 切图文件必须都在（静态资源缺一张，卡片上就是一个空位）
for (const file of ['label-hot', 'label-repeat', 'label-ring', 'label-flash']) {
	assert.equal(fs.existsSync(new URL(`../static/image/label/${file}.png`, import.meta.url)), true, `${file}.png 缺失`)
}
// 标签样式映射：切图 + 切图主色；未知标签回退纯文字
assert.deepEqual(getMemberHomeLabelStyle('超快回复'), {
	text: '超快回复', tone: 'fast', color: '#ff7828',
	ring: '/static/image/label/label-ring.png', icon: '/static/image/label/label-flash.png'
})
assert.deepEqual(getMemberHomeLabelStyle('超多回头客'), {
	text: '超多回头客', tone: 'repeat', color: '#4caf50', ring: '', icon: '/static/image/label/label-repeat.png'
})
assert.deepEqual(getMemberHomeLabelStyle('热门团购'), {
	text: '热门团购', tone: 'hot', color: '#d81e06', ring: '', icon: '/static/image/label/label-hot.png'
})
assert.deepEqual(getMemberHomeLabelStyle('自定义标签'), { text: '自定义标签', tone: 'default', color: '#999999', ring: '', icon: '' })
assert.equal(getMemberHomeLabelStyle(''), null)
assert.equal(getMemberHomeLabelStyle(), null)
// 标签按「团购标签实体」的约定读取：tagName / tagId（与 B 端 get/groupActivity/list|info 一致）
const tagged = normalizeMemberHomeGroup({ id: 34, name: '测试团购2', tagId: 2, tagName: '超快回复' })
assert.equal(tagged.tagId, 2)
assert.equal(tagged.tagName, '超快回复')
assert.equal(tagged.label, '超快回复')
assert.equal(tagged.labelStyle.tone, 'fast')
assert.equal(tagged.labelStyle.color, '#ff7828')
assert.equal(tagged.labelStyle.ring, '/static/image/label/label-ring.png')
assert.equal(tagged.labelStyle.icon, '/static/image/label/label-flash.png')
// 自定义标签（后台可增删改）：用 tagColor 上色，纯文字药丸（无切图）
assert.deepEqual(normalizeMemberHomeGroup({ id: 35, name: 'X', tagName: '团长自建标签', tagColor: '#3b82f6' }).labelStyle, {
	text: '团长自建标签', tone: 'default', color: '#3b82f6', ring: '', icon: ''
})
assert.equal(normalizeMemberHomeGroup({ id: 36, name: 'Y', tagName: '自建无颜色' }).labelStyle.color, '#999999')
assert.equal(normalizeMemberHomeGroup({ id: 37, name: 'Z', tagName: '自建', tagColor: 'rgb(59,130,246)' }).labelStyle.color, '#3b82f6')
assert.equal(normalizeLabelColor('#f70'), '#ff7700')
assert.equal(normalizeLabelColor('  #FF7828 '), '#FF7828')
assert.equal(normalizeLabelColor('red'), '')
assert.equal(normalizeLabelColor(''), '')
// 历史字段名兜底（老接口/老数据）
assert.equal(normalizeMemberHomeGroup({ id: 38, name: 'W', label: '热门团购' }).labelStyle.tone, 'hot')
assert.equal(normalizeMemberHomeGroup({ id: 39, name: 'V', tag: '超多回头客' }).labelStyle.tone, 'repeat')
assert.equal(normalizeMemberHomeGroup({ id: 1, name: 'X' }).labelStyle, null)
assert.equal(normalizeMemberHomeGroup({ id: 1, name: 'X' }).tagId, 0)

// ===== 订单备注：接口已返回 remark，仅 C 端订单详情渲染 =====
assert.equal(normalizeMemberOrder({ orderNo: 'NO1', remark: '不要辣，放门口' }).remark, '不要辣，放门口')
assert.equal(normalizeMemberOrder({ orderNo: 'NO1', customerRemark: '别名兜底' }).remark, '别名兜底')
assert.equal(normalizeMemberOrder({ orderNo: 'NO1', orderRemark: '别名2' }).remark, '别名2')
assert.equal(normalizeMemberOrder({ orderNo: 'NO1' }).remark, '')
const memberOrderDetailSource = fs.readFileSync(new URL('../pages/order/detail.vue', import.meta.url), 'utf8')
assert.equal(memberOrderDetailSource.includes('v-if="displayOrder.remark"'), true)
assert.equal(memberOrderDetailSource.includes('{{ displayOrder.remark }}'), true)
// 其它订单页不渲染备注（按需求只补 C 端详情）
const memberOrderListSource = fs.readFileSync(new URL('../pages/order/index.vue', import.meta.url), 'utf8')
assert.equal(memberOrderListSource.includes('order-remark'), false)

// ===== C 端团购详情页：同一套标签药丸（接口补 tagId/tagName 后直接渲染）=====
const memberGroupDetailSource = fs.readFileSync(new URL('../pages/group/index.vue', import.meta.url), 'utf8')
assert.equal(memberGroupDetailSource.includes('import { getGroupLabelStyle,'), true)
assert.equal(memberGroupDetailSource.includes("return getGroupLabelStyle(this.groupInfo.tagName || this.groupInfo.label || '', this.groupInfo.tagColor || '')"), true)
assert.equal(memberGroupDetailSource.includes('class="group-tag-row" v-if="groupLabelStyle || pickupText"'), true)
assert.equal(memberGroupDetailSource.includes('class="group-label" v-if="groupLabelStyle"'), true)
assert.equal(memberGroupDetailSource.includes('{{ groupLabelStyle.text }}'), true)
// 药丸样式与首页一致（24rpx 圆环 / 28rpx 药丸 / 9×15 闪电）
assert.equal(memberGroupDetailSource.includes('.label-badge {'), true)
assert.equal(memberGroupDetailSource.includes('padding-right: 16rpx;'), true)
assert.equal(memberGroupDetailSource.includes('.group-label.tone-fast .label-icon {'), true)
// 标签字段不能再被当作提货方式文案
assert.equal(memberGroupDetailSource.includes('if(this.groupInfo.label) return this.groupInfo.label'), false)
// 取样式函数是同一份实现（旧名是别名）
assert.equal(getMemberHomeLabelStyle, getGroupLabelStyle)
assert.equal(homeSource.includes('getScrollingRecords(item)'), true)
assert.equal(homeSource.includes('shouldScrollRecords(item)'), true)
assert.equal(homeSource.includes('@keyframes record-scroll'), true)
assert.equal(homeSource.includes('const menuLeft = Number(metrics.menuLeft || 0)'), true)
assert.equal(homeSource.includes('const rowHeightRpx = 76'), true)
assert.equal(homeSource.includes('const rowTop = Number(metrics.navTitleTop || 0)'), true)
assert.equal(homeSource.includes('height: ${rowHeightRpx}rpx; right: ${menuSafeRpx}rpx;'), true)
assert.equal(homeSource.includes('isCategoryActive(item)'), true)
assert.equal(homeSource.includes('this.catId = Number(id || 0)'), true)
assert.equal(homeSource.includes('background-color: #22c55e'), true)
assert.equal(homeSource.includes('color: #ffffff'), true)
assert.equal(homeSource.includes('getMemberGroupActivityList(param)'), true)
assert.equal(homeSource.includes('mergeGroupActivityLogs(list)'), false)
assert.equal(homeSource.includes('resolveMemberHomeListData(res.data)'), true)
assert.equal(homeSource.includes('resolveMemberHomeLogsData(res.data)'), false)
assert.equal(homeSource.includes('const listWithRecords = await this.mergeGroupActivityLogs(list)'), false)
assert.equal(homeSource.includes('const listWithShopInfo = await this.mergeGroupShopInfo(list)'), true)
assert.equal(homeSource.includes('shopInfoMap: {}'), true)
assert.equal(homeSource.includes('groupLogMap: {}'), false)
assert.equal(homeSource.includes('getGroupLeaderId(group)'), true)
assert.equal(homeSource.includes('getGroupActivityId(group)'), false)
assert.equal(homeSource.includes('loadGroupActivityLogs(groupId)'), false)
assert.equal(homeSource.includes('mergeGroupActivityLogs(list = [])'), false)
assert.equal(homeSource.includes('hasGroupShopInfo(group = {})'), true)
assert.equal(homeSource.includes('loadGroupShopInfo(leaderId)'), true)
assert.equal(homeSource.includes('mergeGroupShopInfo(list = [])'), true)
assert.equal(homeSource.includes('await getGroupShop({ id: leaderId })'), true)
assert.equal(homeSource.includes('shopName: item.shopName || shopInfo.name ||'), true)
assert.equal(homeSource.includes('shopLogo: item.shopLogo || shopInfo.shopLogo ||'), true)
assert.equal(homeSource.includes('const matchKeyword = !keyword'), false)
assert.equal(homeSource.includes('goodsName: this.keyword'), false)
assert.equal(homeSource.includes('keyword: this.keyword'), true)
assert.equal(homeSource.includes('catId: this.catId'), true)
assert.equal(homeSource.includes('await this.refreshGroupList()'), true)
assert.equal(homeSource.includes('pendingGroupListRefresh: false'), true)

const pagesConfig = JSON.parse(fs.readFileSync(new URL('../pages.json', import.meta.url), 'utf8').replace(/\/\/.*$/gm, ''))
assert.equal(pagesConfig.tabBar.selectedColor, '#24c567')
const memberPagePaths = pagesConfig.pages.map(item => item.path)
assert.equal(memberPagePaths.includes('pages/order/refund'), true)
assert.equal(memberPagePaths.includes('pages/order/refundDetail'), true)
for (const item of pagesConfig.tabBar.list) {
	assert.equal(fs.existsSync(new URL('../' + item.iconPath, import.meta.url)), true)
	assert.equal(fs.existsSync(new URL('../' + item.selectedIconPath, import.meta.url)), true)
}
assert.deepEqual(pagesConfig.tabBar.list.map(item => item.text), ['首页', '订单', '购物车', '个人中心'])

const manifestSource = fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8')
assert.equal(manifestSource.includes('"getLocation"'), true)
assert.equal(manifestSource.includes('"scope.userLocation"'), true)

const miniNavSource = fs.readFileSync(new URL('../utils/miniProgramNav.js', import.meta.url), 'utf8')
assert.equal(miniNavSource.includes('menuLeft: Number(menuButton.left || 0)'), true)
assert.equal(miniNavSource.includes('const windowWidth = Number(systemInfo.windowWidth || systemInfo.screenWidth'), true)

const collectionSource = fs.readFileSync(new URL('../pages/collection/index.vue', import.meta.url), 'utf8')
assert.equal(collectionSource.includes('getGroupShop'), true)
assert.equal(collectionSource.includes('getHomeGroupList'), false)
assert.equal(collectionSource.includes('getMemberGroupActivityList'), true)
assert.equal(collectionSource.includes('resolveMemberHomeListData(res.data)'), true)
assert.equal(collectionSource.includes("this.leaderId = Number(options.lid || options.leaderId || uni.getStorageSync('leader') || 0)"), true)
assert.equal(collectionSource.includes('card-images" v-if="item.images.length > 0"'), true)
assert.equal(collectionSource.includes('product-placeholder'), false)
assert.equal(collectionSource.includes('currentPrice'), false)
assert.equal(collectionSource.includes('icon-apple'), false)

const groupDetailSource = fs.readFileSync(new URL('../pages/group/index.vue', import.meta.url), 'utf8')
assert.equal(groupDetailSource.includes('getLeaderGroupLogs'), false)
assert.equal(groupDetailSource.includes('getLeaderGroupLogs2'), false)
assert.equal(groupDetailSource.includes('getMemberGroupActivityLogs2'), true)
assert.equal(groupDetailSource.includes('resolveMemberHomeLogsData(res.data)'), true)
assert.equal(groupDetailSource.includes('normalizeMemberHomeRecord'), true)
assert.equal(groupDetailSource.includes('normalizeGroupLogs(logs = [])'), true)
assert.equal(groupDetailSource.includes('applyCachedGroupLogs()'), true)
assert.equal(groupDetailSource.includes('this.applyCachedGroupLogs()'), true)
assert.equal(groupDetailSource.includes('groupJoinCount()'), true)
assert.equal(groupDetailSource.includes('applyGroupLogs(records = [])'), true)
assert.equal(groupDetailSource.includes('groupLogsTotal: 0'), true)
assert.equal(groupDetailSource.includes('this.groupLogsTotal = records.length'), true)
assert.equal(groupDetailSource.includes('this.groupLogs = records'), true)
assert.equal(groupDetailSource.includes('this.groupLogs = records.slice(0, 2)'), false)
assert.equal(groupDetailSource.includes('const effectiveRecords = count > 0 ? records.slice(0, count) : records'), false)
assert.equal(groupDetailSource.includes('this.applyGroupLogs(records)'), true)
assert.equal(groupDetailSource.includes('this.applyGroupLogs(logs)'), true)
assert.equal(groupDetailSource.includes('addGroupLogs'), false)
assert.equal(groupDetailSource.includes('startTimer'), false)
assert.equal(groupDetailSource.includes('groupLogs2'), false)
assert.equal(groupDetailSource.includes('{{ groupJoinCount }}次跟团'), true)
assert.equal(groupDetailSource.includes('{{ groupLogs.length }}次跟团'), false)
assert.equal(groupDetailSource.includes('return true'), true)
assert.equal(groupDetailSource.includes('return false'), true)
assert.equal(groupDetailSource.includes('this.getCachedGroupInfo().records || []'), true)
assert.equal(groupDetailSource.includes(':src="item.avatar ||'), true)
assert.equal(groupDetailSource.includes('item.goodsName'), true)
assert.equal(groupDetailSource.includes('item.userAvatar'), false)
assert.equal(groupDetailSource.includes('item.userGoodsName'), false)
assert.equal(groupDetailSource.includes('item.userGoodsNum'), false)
assert.equal(groupDetailSource.includes('grid-template-columns: 56rpx 52rpx'), false)
assert.equal(groupDetailSource.includes('flex: 0 0 86rpx'), true)
assert.equal(groupDetailSource.includes('flex: 0 0 52rpx'), true)
assert.equal(groupDetailSource.includes(':src="shopAvatar"'), true)
assert.equal(groupDetailSource.includes('v-if="shopBanner"'), true)
// label/tagName 是团购标签，不能当提货方式文案（旧实现有这个兜底，已移除）
assert.equal(groupDetailSource.includes('if(this.groupInfo.label) return this.groupInfo.label'), false)
assert.equal(groupDetailSource.includes('hasGroupIntroContent'), true)
assert.equal(groupDetailSource.includes('compact-group-head'), true)
assert.equal(groupDetailSource.includes('normalizeRichTextImages'), true)
assert.equal(groupDetailSource.includes(':class="{ plain: !hasGroupRichText }"'), false)
assert.equal(groupDetailSource.includes("url = '/pages/collection/index?lid=' + this.leaderId"), false)
assert.equal(groupDetailSource.includes('uni.navigateTo({ url: url }).catch'), false)
const groupCartSource = fs.readFileSync(new URL('../pages/group/cart.vue', import.meta.url), 'utf8')
assert.equal(groupCartSource.includes('normalizeCreatedOrderNo(res.data)'), true)
assert.equal(groupCartSource.includes('class="empty-cart-icon"'), true)
assert.equal(groupCartSource.includes('src="/static/tabbar/cart.png"'), true)
assert.equal(groupCartSource.includes('await this.doPay(orderNo)'), true)
assert.equal(groupCartSource.includes('getApp().globalData.sessionCheckoutOrderNo = orderNo'), true)
assert.ok(groupCartSource.indexOf('this.clearSessionCheckout(orderNo)') > groupCartSource.indexOf('getApp().globalData.sessionCheckoutOrderNo = orderNo'))
assert.ok(groupCartSource.indexOf('this.clearSessionCheckout(orderNo)') < groupCartSource.indexOf('await this.doPay(orderNo)'))
assert.ok(groupCartSource.indexOf('this.clearSessionCheckout(orderNo)') < groupCartSource.indexOf('await uni.requestPayment({'))
assert.equal(groupCartSource.includes('this.cartGoodsList = []'), true)
assert.equal(groupCartSource.includes('ensureOpenId'), true)
assert.equal(groupCartSource.includes("const title = (err && err.msg) || (err && err.message) || '支付失败'"), true)
assert.equal(groupCartSource.includes('uni.hideLoading()'), true)
assert.equal(groupCartSource.includes('if(payParams == null)'), true)
assert.equal(groupCartSource.includes('getOrderList({ status: 0, page: 1, pageSize: 10 })'), false)
assert.equal(groupCartSource.includes('pickCreatedOrderNoFromList'), false)
assert.equal(groupCartSource.includes('getMiniProgramPayAction'), false)
assert.equal(groupCartSource.includes('/pages/success/index?orderNo='), true)

const cartSource = fs.readFileSync(new URL('../pages/cart/index.vue', import.meta.url), 'utf8')
assert.equal(cartSource.includes('class="empty-cart-icon"'), true)
assert.equal(cartSource.includes('src="/static/tabbar/cart.png"'), true)
assert.equal(cartSource.includes('opacity: 0.42'), false)

const orderSource = fs.readFileSync(new URL('../pages/order/index.vue', import.meta.url), 'utf8')
// 门店码自助核销已迁到独立页 pages/order/verify，订单 tab 页不再有门店码/核销逻辑
assert.equal(orderSource.includes('getNotAllReceiptOrders'), false)
assert.equal(orderSource.includes('receiptOrder'), false)
assert.equal(orderSource.includes('buildMemberReceiptParams'), false)
assert.equal(orderSource.includes('paidMode'), false)
assert.equal(orderSource.includes('getOrderCount'), false)
const orderDetailSource = fs.readFileSync(new URL('../pages/order/detail.vue', import.meta.url), 'utf8')
assert.equal(orderDetailSource.includes('v-else-if="hasOrder"'), true)
assert.equal(orderDetailSource.includes('canMemberOrderApplyRefund(this.displayOrder)'), true)
assert.equal(orderDetailSource.includes('canMemberOrderMakeQr(this.displayOrder)'), true)
assert.equal(orderDetailSource.includes('canMemberApplyRefundGoods'), false)
assert.equal(orderDetailSource.includes('canMemberApplyRefundGoods(goods, MEMBER_REFUND_FLAGS'), false)
assert.equal(orderDetailSource.includes('paidSuccessHint'), true)
assert.equal(orderDetailSource.includes('团购订单'), true)
assert.equal(orderDetailSource.includes('receipt-progress'), false)
assert.equal(orderDetailSource.includes('receiptSteps'), false)
assert.equal(orderDetailSource.includes('detailStatusIcon'), true)
assert.equal(orderDetailSource.includes('待收货'), true)
assert.equal(orderDetailSource.includes('顾客自提'), true)
assert.equal(orderDetailSource.includes('qr-entry'), true)
assert.equal(orderDetailSource.includes('生成核销码'), true)
assert.equal(orderDetailSource.includes('服务驿站'), true)
assert.equal(orderDetailSource.includes('订单信息'), true)
assert.equal(orderDetailSource.includes('团长更多好货'), true)
assert.equal(orderDetailSource.includes('detailStatusTitle'), true)
assert.equal(orderDetailSource.includes('payDeadlineText'), true)
assert.equal(orderDetailSource.includes('payRemainMs'), true)
assert.equal(orderDetailSource.includes('this.nowTick'), true)
assert.equal(orderDetailSource.includes('isPayExpired'), true)
assert.equal(orderDetailSource.includes("if (this.isPayExpired) return '支付已超时'"), true)
assert.equal(orderDetailSource.includes("return this.isPayExpired ? 'muted' : this.displayOrder.statusTone"), true)
assert.equal(orderDetailSource.includes("Number(displayOrder.status) === 0 && !isPayExpired"), true)
assert.equal(orderDetailSource.includes("if (status === 0) return this.isPayExpired ? '支付已超时，请重新下单' : ''"), true)
assert.equal(orderDetailSource.includes('orderGoodsCount'), true)
assert.equal(orderDetailSource.includes('detailActions'), true)
assert.equal(orderDetailSource.includes("key: 'pay'"), true)
assert.equal(orderDetailSource.includes('canMemberApplyRefundGoods(goods, MEMBER_REFUND_FLAGS.ONLY_REFUND)'), false)
assert.equal(orderDetailSource.includes('canMemberApplyRefundGoods(goods, MEMBER_REFUND_FLAGS.RETURN_AND_REFUND)'), false)
assert.equal(orderDetailSource.includes('return [1, 2, 3].includes(Number(this.displayOrder.status))'), false)
assert.equal(orderDetailSource.includes('if (this.canRefund) actions.push({ key: \'refund\''), true)
assert.equal(orderDetailSource.includes('if (this.hasRefundInfo) actions.push({ key: \'refundDetail\''), true)
assert.equal(orderDetailSource.includes("key: 'qr'"), false)
assert.equal(orderDetailSource.includes("key: 'receipt'"), false)
assert.equal(orderDetailSource.includes("key: 'expired'"), false)
assert.equal(orderDetailSource.includes("text: this.isPayExpired ? '支付已超时' : '继续支付'"), true)
assert.equal(orderDetailSource.includes("disabled: this.isPayExpired"), true)
assert.equal(orderDetailSource.includes("key: 'refundDetail'"), true)
assert.equal(orderDetailSource.includes("this.goRefundApply()"), true)
assert.equal(orderDetailSource.includes("this.goRefundDetail()"), true)
assert.equal(orderDetailSource.includes('/pages/order/refund?orderNo='), true)
assert.equal(orderDetailSource.includes('/pages/order/refundDetail?orderNo='), true)
assert.equal(orderDetailSource.includes("uni.showToast({ title: '支付已超时，请重新下单'"), true)
assert.equal(orderDetailSource.includes("if (status === 5) return '退款申请处理中'"), true)
assert.equal(orderDetailSource.includes('getPayCache(this.orderInfo.orderNo)'), true)
assert.equal(orderDetailSource.includes("requestPayOrder({ orderNo: this.orderInfo.orderNo, openid })"), true)
assert.equal(orderDetailSource.includes('receiptOrder'), false)
assert.equal(orderDetailSource.includes('buildMemberReceiptParams(this.orderInfo)'), false)
assert.equal(orderDetailSource.includes('confirmReceipt()'), false)
assert.equal(orderDetailSource.includes('getRefundRecords'), true)
assert.equal(orderDetailSource.includes('shouldLoadRefundRecords(order)'), true)
assert.equal(orderDetailSource.includes('mergeMemberOrderRefundRecords(order, records)'), true)
assert.equal(orderDetailSource.includes("uni.showToast({ title: '订单已失效，请重新下单'"), false)
assert.equal(orderDetailSource.includes('removePayCache(this.orderInfo.orderNo)'), true)
assert.equal(orderDetailSource.includes('goGroupDetail()'), true)
assert.equal(orderDetailSource.includes("`/pages/group/index?id=${groupId}&lid=${leaderId}`"), true)
assert.equal(orderDetailSource.includes("'/pages/collection/index?lid='"), false)
assert.equal(orderDetailSource.includes('copyText(value)'), true)
assert.equal(orderDetailSource.includes('callPhone(phone)'), true)
assert.equal(orderDetailSource.includes("const token = uni.getStorageSync('token')"), true)
assert.equal(orderDetailSource.includes('buildMemberErcodeParams(this.orderInfo, token)'), true)
assert.equal(orderDetailSource.includes('getCachedWxAccessToken()'), false)
assert.equal(orderDetailSource.includes('createWxMiniProgramCode({ accessToken: wxAccessToken, path: params.path })'), false)
assert.equal(orderDetailSource.includes("orderInfo.statusText || '订单详情'"), false)
assert.equal(orderDetailSource.includes('miniNavPageStyle()'), true)
assert.equal(orderSource.includes("order.statusKey === 'unpay'"), true)
assert.equal(orderSource.includes('orderStatusText(order)'), true)
assert.equal(orderSource.includes('orderStatusTone(order)'), true)
assert.equal(orderSource.includes('canPayOrder(order)'), true)
assert.equal(orderSource.includes('hasOrderActions(order)'), true)
assert.equal(orderSource.includes('确认收货'), false)
assert.equal(orderSource.includes('确认核销'), false)
assert.equal(orderSource.includes('canMemberApplyRefundGoods(goods, MEMBER_REFUND_FLAGS.ONLY_REFUND)'), false)
assert.equal(orderSource.includes('canMemberApplyRefundGoods(goods, MEMBER_REFUND_FLAGS.RETURN_AND_REFUND)'), false)
assert.equal(orderSource.includes('return [1, 2, 3].includes(Number(order.status))'), false)
assert.equal(orderSource.includes('[1, 2].includes(Number(order.status))'), false)
assert.equal(orderSource.includes("this.currentTab === 'refund' && order.refundStatusText"), true)
assert.equal(orderSource.includes("currentRefundTab: 'pending'"), true)
assert.equal(orderSource.includes('v-if="currentTab === \'refund\'" class="refund-tabs"'), true)
assert.equal(orderSource.includes('switchRefundTab(tab.key)'), true)
assert.equal(orderSource.includes('buildMemberRefundListPayload({'), true)
assert.equal(orderSource.includes('tab: this.currentRefundTab'), true)
assert.equal(orderSource.includes("return order.refundStatusText"), true)
assert.equal(orderSource.includes("return order.refundTone"), true)
assert.equal(orderSource.includes("return this.isOrderPayExpired(order) ? '支付已超时' : order.statusText"), true)
assert.equal(orderSource.includes("return this.isOrderPayExpired(order) ? 'muted' : order.statusTone"), true)
assert.equal(orderSource.includes("v-else-if=\"isOrderPayExpired(order)\">支付已超时"), true)
assert.equal(orderSource.includes('goRefundApply(order)'), true)
assert.equal(orderSource.includes('goRefundDetail(order)'), true)
assert.equal(orderSource.includes('hasAfterSalesDetail(order)'), true)
assert.equal(orderSource.includes('currentTab !== \'refund\' && hasAfterSalesDetail(order)'), true)
assert.equal(orderSource.includes('action-btn aftersale'), true)
assert.equal(orderSource.includes("if ([4, 5].includes(Number(order.status))) return true"), true)
assert.equal(orderSource.includes('/pages/order/refund?orderNo='), true)
assert.equal(orderSource.includes('/pages/order/refundDetail?orderNo='), true)
assert.equal(orderSource.includes('getWxPayCache(order.orderNo)'), false)
assert.equal(orderSource.includes("requestPayOrder({ orderNo: order.orderNo, openid })"), true)
assert.equal(orderSource.includes("uni.showToast({ title: '支付已超时，请重新下单'"), true)
assert.equal(orderSource.includes("uni.showToast({ title: '订单已失效，请重新下单'"), false)

const refundSource = fs.readFileSync(new URL('../pages/order/refund.vue', import.meta.url), 'utf8')
assert.equal(refundSource.includes('售后类型'), true)

// ===== 申请退款三条规则 =====
// ① 可退商品行的选中键必须唯一：同一 goodsId 的多规格商品是多行，用 goodsId 做键会撞键（勾一行=勾全部）
assert.equal(getMemberRefundGoodsKey({ id: 101, goodsId: 69, skuId: 497 }, 0), 'order-goods-101')
assert.equal(getMemberRefundGoodsKey({ id: 102, goodsId: 69, skuId: 498 }, 1), 'order-goods-102')
assert.notEqual(getMemberRefundGoodsKey({ id: 101, goodsId: 69 }, 0), getMemberRefundGoodsKey({ id: 102, goodsId: 69 }, 1))
// 无订单商品行 id 时用 goodsId+sku 兜底，最后才退化到下标
assert.equal(getMemberRefundGoodsKey({ goodsId: 69, skuId: 497 }, 0), 'goods-69-sku-497')
assert.equal(getMemberRefundGoodsKey({ goodsId: 69 }, 0), 'goods-69')
assert.equal(getMemberRefundGoodsKey({}, 3), 'index-3')
const refundGoodsKeySource = fs.readFileSync(new URL('../pages/order/refund.vue', import.meta.url), 'utf8')
assert.equal(refundGoodsKeySource.includes('return getMemberRefundGoodsKey(goods, index)'), true)

// ② 退款退货：进入页面默认不选中任何行；勾选一行只选一行，且数量默认 1（不是全退）
assert.equal(refundGoodsKeySource.includes('if (!this.isOnlyRefund) {'), true)
assert.equal(refundGoodsKeySource.includes('const current = Number(this.selectedQtyMap[goods.refundKey] || 1)'), true)
assert.equal(refundGoodsKeySource.includes('this.selectedQtyMap = Object.assign({}, this.selectedQtyMap, { [key]: 1 })'), true)
// 仅退款：仍然整单全选、数量取满
assert.equal(refundGoodsKeySource.includes('qtyMap[goods.refundKey] = this.maxRefundNum(goods)'), true)

// ③ 仅退款只能一次：接口字段优先 → 退款记录推断 → 商品行退待收货数量
assert.equal(hasMemberOnlyRefundApplied([{ refundFlag: 1, isAgree: 0 }]), true)
assert.equal(hasMemberOnlyRefundApplied([{ refundFlag: 1, isAgree: 1 }]), true)
assert.equal(hasMemberOnlyRefundApplied([{ refundFlag: 1, isAgree: 2 }]), false)
assert.equal(hasMemberOnlyRefundApplied([{ refundFlag: 2, isAgree: 1 }]), false)
assert.equal(hasMemberOnlyRefundApplied([]), false)
assert.equal(normalizeMemberOrder({ refundRecords: [{ refundFlag: 1, isAgree: 1 }] }).onlyRefundUsed, true)
assert.equal(normalizeMemberOrder({ onlyRefundUsed: true }).onlyRefundUsed, true)
assert.equal(normalizeMemberOrder({ goods: [{ goodsNum: 3, refundNum: 1 }] }).onlyRefundUsed, true)
assert.equal(normalizeMemberOrder({ goods: [{ goodsNum: 3, refundNum: 0 }] }).onlyRefundUsed, false)
assert.equal(refundSource.includes('仅退款'), true)
assert.equal(refundSource.includes('退款退货'), true)
assert.equal(refundSource.includes('选择退款原因'), true)
assert.equal(refundSource.includes('是否要申请{{ refundTypeText }}'), true)
assert.equal(refundSource.includes('maxRefundNum(goods)'), true)
assert.equal(refundSource.includes('qty-stepper'), true)
assert.equal(refundSource.includes('changeRefundNum(goods, -1)'), true)
assert.equal(refundSource.includes('changeRefundNum(goods, 1)'), true)
assert.equal(refundSource.includes('selectedQtyMap'), true)
assert.equal(refundSource.includes('refundNum(goods)'), true)
assert.equal(refundSource.includes('refundAmountInput'), false)
assert.equal(refundSource.includes('refundGoodsKey(goods, index)'), true)
// 【修复】选中键改为按「订单商品行 id」：旧实现优先 goodsId，同一商品的多规格行会撞键（勾一行=勾全部）
assert.equal(refundSource.includes('return getMemberRefundGoodsKey(goods, index)'), true)
assert.equal(refundSource.includes("return `goods-${goodsId}`"), false)
assert.equal(refundSource.includes('selectedMap[goods.refundKey]'), true)
assert.equal(refundSource.includes('toggleGoods(goods)'), true)
assert.equal(refundSource.includes('toggleGoods(goods.id)'), false)
assert.equal(refundSource.includes('if (this.isOnlyRefund) return this.refundableGoods'), true)
// 可退商品由接口下发，页面不得再按可退数量二次筛选。
assert.equal(refundSource.includes('.filter(goods => this.maxRefundNum(goods) > 0)'), false)
assert.equal(refundSource.includes('可退商品由接口 refundGoods 下发'), true)
assert.equal(refundSource.includes('if (this.isOnlyRefund) return'), true)
assert.equal(refundSource.includes('仅退款须一次性退回全部未核销商品'), true)
assert.equal(refundSource.includes("isOnlyRefund ? '全部退款' : '全选'"), true)
assert.equal(refundSource.includes('selectedGoodsRefundAmount'), false)
assert.equal(refundSource.includes('Math.min(input, this.maxRefundAmount)'), false)
assert.equal(refundSource.includes('const refundNum = this.refundNum(item)'), true)
assert.equal(refundSource.includes('getRefundReasonList'), true)
assert.equal(refundSource.includes('@click="openReasonPanel"'), true)
assert.equal(refundSource.includes('openReasonPanel()'), true)
assert.equal(refundSource.includes('this.initRefundReasons()'), true)
assert.equal(refundSource.includes('this.initRefundReasons()\\n\\t}'), false)
assert.equal(refundSource.includes('FALLBACK_REFUND_REASONS'), true)
assert.equal(refundSource.includes('normalizeRefundReason'), true)
assert.equal(refundSource.includes("item.status !== 0"), true)
assert.equal(refundSource.includes('buildRefundGoods()'), true)
assert.equal(refundSource.includes('buildMemberRefundPayload'), true)
assert.equal(refundSource.includes('refundFlag: this.refundFlag'), true)
assert.equal(refundSource.includes('getRefundApplyOrderInfo'), true)
assert.equal(refundSource.includes('availableRefundNum'), true)
assert.equal(refundSource.includes('uploadProductImage'), true)
assert.equal(refundSource.includes('/pages/order/refundDetail?orderNo='), true)

// ===== 关键操作失败提示：请求层静默 + 页面 modal（避免双重提示 / 一闪而过）=====
// C 端申请退款
assert.equal(refundSource.includes('refundOrder(payload, { silentToast: true })'), true)
assert.equal(refundSource.includes("showActionError(pickActionErrorMessage(err, '提交失败'), { title: '申请退款失败' })"), true)
assert.equal(refundSource.includes('from "@/utils/feedback.js"'), true)
const refundDetailSource = fs.readFileSync(new URL('../pages/order/refundDetail.vue', import.meta.url), 'utf8')
assert.equal(refundDetailSource.includes('待团长处理'), true)
assert.equal(refundDetailSource.includes('团长已同意'), true)
assert.equal(refundDetailSource.includes('团长已拒绝'), true)
assert.equal(refundDetailSource.includes('售后历史'), true)
assert.equal(refundDetailSource.includes('getRefundRecords'), true)
assert.equal(refundDetailSource.includes('getGroupShop'), true)
assert.equal(refundDetailSource.includes('getRefundRecordRows(data)'), true)
// 订单商品行必须展示接口返回的 SKU 规格（goodsInfo → specText）。
assert.equal(refundDetailSource.includes('<text v-if="goods.specText" class="goods-spec">{{ goods.specText }}</text>'), true)
assert.equal(refundDetailSource.includes("{{ goods.name || '商品名称' }}{{ goods.specText ? '（' + goods.specText + '）' : '' }}"), true)
assert.equal(refundSource.includes("{{ goods.name || '商品名称' }}{{ goods.specText ? '（' + goods.specText + '）' : '' }}"), true)
assert.equal(refundDetailSource.includes('order-overview'), true)
assert.equal(refundDetailSource.includes('refund-fee'), true)
assert.equal(refundDetailSource.includes('mergeMemberOrderRefundRecords(order, records)'), true)
assert.equal(refundDetailSource.includes('mergeMemberOrderRefundRecords(detail, records)'), true)
assert.equal(refundDetailSource.includes('reason: detail.reason || order.reason'), false)
assert.equal(refundDetailSource.includes('refundDesc: detail.refundDesc || order.refundDesc'), false)
assert.equal(refundDetailSource.includes('getMemberRefundDisplayNum(item, this.refundFlag)'), true)
assert.equal(refundDetailSource.includes('.filter(isMemberRefundPending)'), true)
assert.equal(refundDetailSource.includes('Number(item.applyRefund || 0) > 0'), false)
assert.equal(refundDetailSource.includes('refundDisplayAmount'), true)
assert.equal(refundDetailSource.includes("退款 {{ goodsRefundNum(goods) }}{{ goods.unit || '件' }}，￥{{ goodsRefundAmountText(goods) }}"), true)
assert.equal(refundDetailSource.includes('取消售后接口未配置'), false)
assert.equal(refundDetailSource.includes('售后类型：'), true)

const orderListSource = fs.readFileSync(new URL('../pages/order/index.vue', import.meta.url), 'utf8')
// 订单 tab 页已彻底移除门店码落地逻辑（scene/热启动补拿/去重指纹全部删除）
assert.equal(orderListSource.includes('applyEntryParams'), false)
assert.equal(orderListSource.includes('applyHotStartEntry'), false)
assert.equal(orderListSource.includes('uni.getEnterOptionsSync'), false)
assert.equal(orderListSource.includes('entrySignature'), false)
assert.equal(orderListSource.includes('paidMode'), false)
assert.equal(orderListSource.includes('shopId'), false)
assert.equal(orderListSource.includes('goods.statusList && goods.statusList.length'), true)
// 门店自助核销改为独立页面 pages/order/verify（不再借用 tabBar 的「订单」页）：
// 页面路径必须注册在主包，且页面里的自助核销判定要与订单页一致。
const verifyPageSource = fs.readFileSync(new URL('../pages/order/verify.vue', import.meta.url), 'utf8')
// C 端订单核销：失败原文由页面 modal 展示（请求层静默）
assert.equal(verifyPageSource.includes("showActionError(pickActionErrorMessage(err, '核销失败'), { title: '核销失败' })"), true)
assert.equal(verifyPageSource.includes('from "@/utils/feedback.js"'), true)
assert.equal(verifyPageSource.includes('getNotAllReceiptOrders({ shopId: this.shopId })'), true)
// 待核销件数必须与「可核销」判定同源：修复前把所有行的 pendingReceiptNum 都算进去，
// 页脚会同时出现「待核销 1 件」和「商品售后处理中，暂不可核销」。
assert.equal(verifyPageSource.includes('if (!canMemberReceiptGoods(goods)) return sum'), true)
assert.equal(verifyPageSource.includes('blockedPendingNum(order = {})'), true)
// 订单级门槛：与 B 端一致，只排除待支付(0)/已退款(4)/已取消(6)。
// 修复前 C 端要求 status ∈ {1,2}，「售后」订单即使还有待自提商品也没有「确认核销」按钮。
assert.equal(verifyPageSource.includes('return canMemberOrderReceipt(order)'), true)
const receiptGateOrder = (status, goods) => normalizeMemberOrder({ orderNo: 'x', status, pointId: 7, goods })
assert.equal(canMemberOrderReceipt(receiptGateOrder(5, [{ id: 1, goodsNum: 2, receiptNum: 0 }])), true)
assert.equal(canMemberOrderReceipt(receiptGateOrder(2, [{ id: 1, goodsNum: 2, receiptNum: 0 }])), true)
assert.equal(canMemberOrderReceipt(receiptGateOrder(1, [{ id: 1, goodsNum: 2, receiptNum: 0 }])), true)
assert.equal(canMemberOrderReceipt(receiptGateOrder(6, [{ id: 1, goodsNum: 2, receiptNum: 0 }])), false)
assert.equal(canMemberOrderReceipt(receiptGateOrder(4, [{ id: 1, goodsNum: 2, receiptNum: 0 }])), false)
assert.equal(canMemberOrderReceipt(receiptGateOrder(0, [{ id: 1, goodsNum: 2, receiptNum: 0 }])), false)
assert.equal(canMemberOrderReceipt(normalizeMemberOrder({ orderNo: 'x', status: 5, pointId: 0, goods: [{ id: 1, goodsNum: 2, receiptNum: 0 }] })), false)
// 【真实响应回归】status=5 但有 4 件待核销 → 必须给按钮；全部收完/被退款占满则不给
const realGateOrder = normalizeMemberOrder({ orderNo: '200001537143000001', status: 5, pointId: 7, goods: [
	{ id: 134, goodsNum: 2, receiptNum: 2, applyRefund: 1, refundGoodsNum: 1, refundNum: 0 },
	{ id: 135, goodsNum: 2, receiptNum: 0, applyRefund: 0, refundGoodsNum: 0, refundNum: 0 },
	{ id: 136, goodsNum: 2, receiptNum: 0, applyRefund: 0, refundGoodsNum: 0, refundNum: 0 }
] })
assert.equal(canMemberOrderReceipt(realGateOrder), true)
assert.equal(canMemberOrderReceipt(normalizeMemberOrder({ orderNo: 'x', status: 5, pointId: 7, goods: [{ goodsNum: 3, receiptNum: 3 }] })), false)
assert.equal(canMemberOrderReceipt(normalizeMemberOrder({ orderNo: 'x', status: 5, pointId: 7, goods: [{ goodsNum: 3, receiptNum: 0, refundNum: 3, applyRefund: 2 }] })), false)
assert.equal(verifyPageSource.includes("blockedPendingNum(order) + ' 件商品售后处理中，暂不可核销'"), true)
// 商品行提示要区分「已核销完」与「售后处理中」
assert.equal(verifyPageSource.includes('goodsHintText(goods = {})'), true)
assert.equal(verifyPageSource.includes("if (maxNum <= 0) return goods.receiptNum ? `已核销 ${goods.receiptNum}${unit}` : '无可核销数量'"), true)
// 可核销数量 = 购买数 − 已收数 − 退待收货部分(refundNum)；只看剩余，不看 applyRefund
// （选项 B：审核中申请的占用已计入 refundNum，剩余部分可核销）
assert.equal(canMemberReceiptGoods({ goodsNum: 3, receiptNum: 0, refundNum: 0, applyRefund: 1 }), true)
assert.equal(memberReceiptAvailableNum({ goodsNum: 3, receiptNum: 0, refundNum: 3, applyRefund: 1 }), 0)
assert.equal(canMemberReceiptGoods({ goodsNum: 3, receiptNum: 0, refundNum: 3, applyRefund: 1 }), false)
assert.equal(canMemberReceiptGoods({ goodsNum: 3, receiptNum: 0, refundNum: 3, applyRefund: 2 }), false)
assert.equal(canMemberReceiptGoods({ goodsNum: 3, receiptNum: 0, refundNum: 0, applyRefund: 3 }), true)
assert.equal(canMemberReceiptGoods({ goodsNum: 3, receiptNum: 1, refundNum: 0, applyRefund: 0 }), true)
assert.equal(canMemberReceiptGoods({ goodsNum: 3, receiptNum: 3, refundNum: 0, applyRefund: 0 }), false)
// 【真实订单 200002655995000001】退的是已收部分(refundGoodsNum) → 未收的 1 件仍可核销
assert.equal(canMemberReceiptGoods({ goodsNum: 3, receiptNum: 2, refundNum: 0, refundGoodsNum: 1, applyRefund: 2 }), true)
assert.equal(memberReceiptAvailableNum({ goodsNum: 3, receiptNum: 2, refundNum: 0, refundGoodsNum: 1, applyRefund: 2 }), 1)
assert.equal(canMemberReceiptGoods({ goodsNum: 3, receiptNum: 3, refundNum: 0, refundGoodsNum: 2, applyRefund: 2 }), false)
assert.equal(memberReceiptAvailableNum({ goodsNum: 3, receiptNum: 3, refundNum: 0, refundGoodsNum: 2, applyRefund: 2 }), 0)
// 自助核销支持按数量部分核销：勾选商品走 goodsList，未勾选提交空 goodsList 表示整单核销。
assert.equal(verifyPageSource.includes('buildMemberPartReceiptPayload(order, this.selectionOf(order))'), true)
assert.equal(verifyPageSource.includes('receiptOrder(payload, { silentToast: true })'), true)
assert.equal(verifyPageSource.includes('verifySelection: {}'), true)
assert.equal(verifyPageSource.includes('changeVerifyNum(order, goods, -1)'), true)
assert.equal(verifyPageSource.includes('changeVerifyNum(order, goods, 1)'), true)
assert.equal(verifyPageSource.includes('toggleAllGoods(order)'), true)
assert.equal(verifyPageSource.includes('canMemberReceiptGoods'), true)
// 订单内全部商品都在售后审核中时不提供核销入口（与 B 端 hasVerifiableGoods 一致），
// 并在提交处兜底拦阻，避免把空 goodsList 当整单核销打给后端。
assert.equal(verifyPageSource.includes('hasReceiptGoods(order)'), true)
assert.equal(verifyPageSource.includes('!hasReceiptGoods(order)'), true)
assert.equal(verifyPageSource.includes('商品售后处理中，暂不可核销'), true)
assert.equal(verifyPageSource.includes('!this.hasReceiptGoods(order)) return'), true)
// 订单级门槛改为与 B 端同源的 canMemberOrderReceipt（售后订单也能核销剩余部分）
assert.equal(verifyPageSource.includes('return [1, 2].includes(Number(order.status)) && Number(order.pointId || 0) > 0'), false)
assert.equal(verifyPageSource.includes('return canMemberOrderReceipt(order)'), true)
assert.equal(verifyPageSource.includes('uni.getEnterOptionsSync'), true)
// 扫码进入时本页就是页面栈栈底，交给系统返回会直接退出小程序，因此固定返回首页。
assert.equal(verifyPageSource.includes("uni.switchTab({"), true)
assert.equal(verifyPageSource.includes("url: '/pages/index/index'"), true)
assert.equal(verifyPageSource.includes('getCurrentPages()'), false)
assert.equal(verifyPageSource.includes('navigateBack'), false)
const pagesJsonSource = fs.readFileSync(new URL('../pages.json', import.meta.url), 'utf8')
assert.equal(pagesJsonSource.includes('"path": "pages/order/verify"'), true)
// 必须留在主包：分包页面做小程序码会踩微信 41030「page 不存在」
const subPackageStart = pagesJsonSource.indexOf('"subPackages"')
assert.equal(subPackageStart > -1 && pagesJsonSource.indexOf('"path": "pages/order/verify"') < subPackageStart, true)
assert.equal(orderListSource.includes('return canMemberOrderApplyRefund(order)'), true)
assert.equal(orderListSource.includes('canMemberApplyRefundGoods'), false)
assert.equal(orderListSource.includes('buildMemberRefundListPayload({'), true)
assert.equal(orderListSource.includes('goodsName: this.goodsName'), true)
assert.equal(orderListSource.includes('pendingRefresh: false'), true)
assert.equal(orderListSource.includes('this.pendingRefresh = true'), true)
assert.equal(orderListSource.includes('await this.refreshOrders(nextCallback)'), true)
assert.equal(orderDetailSource.includes('goods.statusList && goods.statusList.length'), true)
assert.equal(orderDetailSource.includes('getGroupPoint'), true)
assert.equal(orderDetailSource.includes('loadPickupPointContact(order)'), true)
assert.equal(orderDetailSource.includes('displayOrder.pointPhone'), true)
assert.equal(orderDetailSource.includes('callPhone(displayOrder.telephone)'), false)

const successSource = fs.readFileSync(new URL('../pages/success/index.vue', import.meta.url), 'utf8')
assert.equal(successSource.includes('orderNo'), true)
assert.equal(successSource.includes('getOrderInfo(param)'), true)
assert.equal(successSource.includes('{ id:this.orderId }'), false)
assert.equal(successSource.includes('normalizeMemberOrder'), true)
assert.equal(successSource.includes('&paid=1'), true)

console.log('memberHomeOrder tests passed')
