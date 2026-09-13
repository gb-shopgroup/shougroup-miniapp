import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
	buildMemberHomeListPayload,
	normalizeMemberHomeGroup,
	resolveMemberHomeListData
} from '../utils/memberHome.js'
import {
	MEMBER_REFUND_FLAGS,
	MEMBER_ORDER_TABS,
	MEMBER_REFUND_TABS,
	buildMemberErcodeParams,
	buildMemberOrderListPayload,
	buildMemberRefundListPayload,
	buildMemberReceiptParams,
	buildMemberRefundPayload,
	getMemberGoodsStatusList,
	getMemberRefundDisplayNum,
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
	groupLogs: [{ userAvatar: '/u.png', userTime: '1分钟前', userGoodsName: '牛肉', userGoodsNum: '2' }]
})
assert.equal(homeGroup.id, 6)
assert.equal(homeGroup.leaderId, 9)
assert.equal(homeGroup.leaderName, '云朵小店')
assert.equal(homeGroup.leaderAvatar, '/shop-logo.png')
assert.equal(homeGroup.viewText, 888)
assert.equal(homeGroup.joinText, 99)
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
assert.deepEqual(normalizeMemberRefundApplyInfo({
	orderNo: 'NO127',
	refundGoods: [{ id: 7, goodsId: 8, goodsName: '鸡蛋', goodsNum: 3, refundGoodsNum: 2 }]
}, MEMBER_REFUND_FLAGS.RETURN_AND_REFUND).goods[0].availableRefundNum, 2)

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
assert.equal(order.statusText, '待提货')
assert.equal(order.goods[0].name, '苹果')
assert.equal(order.goods[0].specText, '500g')
assert.equal(order.goods[0].skuId, 31)
assert.equal(order.telephone, '')
assert.equal(order.pointPerson, '提货员')
assert.equal(order.pointPhone, '13800000001')
assert.equal(normalizeMemberOrder({ refundFee: 3 }).refundFee, 0.03)
assert.equal(normalizeMemberOrder({ orderNo: 'NO127', status: 2, payno: '4500000369202609051846020800' }).statusText, '部分提货')
assert.equal(normalizeMemberOrder({ orderNo: 'NO128', status: 3 }).statusText, '已提货')
assert.equal(normalizeMemberOrder({ orderNo: 'NO131', status: 5, applyRefund: 1 }).refundStatusText, '待处理')
assert.equal(normalizeMemberOrder({ orderNo: 'NO132', status: 5, applyRefund: 2 }).refundStatusText, '已同意')
assert.equal(normalizeMemberOrder({ orderNo: 'NO133', status: 5, applyRefund: 3 }).refundStatusText, '已拒绝')
assert.equal(normalizeMemberOrder({ orderNo: 'NO134', status: 5, goods: [{ applyRefund: 1 }] }).refundStatusText, '待处理')
assert.equal(normalizeMemberOrder({ orderNo: 'NO135', status: 5, refundStatus: 2 }).refundStatusText, '已同意')
assert.equal(normalizeMemberOrder({ orderNo: 'NO136', status: 5, isAgree: 2 }).refundStatusText, '已拒绝')
assert.equal(normalizeMemberOrder({ orderNo: 'NO137', status: 5 }).statusText, '售后处理中')
assert.equal(normalizeMemberOrder({
	orderNo: 'NO129',
	status: 2,
	payno: '4500000369202609051846020800',
	goods: [{ id: 1, goodsNum: 1, receiptNum: 0 }]
}).statusText, '待提货')
assert.equal(normalizeMemberOrder({
	orderNo: 'NO130',
	status: 2,
	goods: [{ id: 1, goodsNum: 2, receiptNum: 1 }]
}).statusText, '部分提货')
assert.equal(normalizeMemberOrder({ orderNo: 'NO124', payPrice: 18.8 }).orderPrice, 18.8)
assert.equal(normalizeMemberOrder({ orderNo: 'NO125', payTime: '2026-09-05 00:01:02', order: 9 }).payTime, '2026-09-05 00:01:02')
assert.equal(normalizeMemberOrder({ orderNo: 'NO126', paymentTime: '2026-09-05 00:02:03', joinText: '12人跟团' }).groupJoinText, '12人跟团')
assert.deepEqual(buildMemberReceiptParams(order), { orderNo: 'NO123', point: 5 })
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
assert.equal(mergedRefundOrder.refundDesc, '同意退款')

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
assert.equal(apiSource.includes("url: '/order/group/order/getPaidOrders'"), true)
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
assert.equal(homeSource.includes('isWarmLabel(item.label)'), true)
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
assert.equal(groupDetailSource.includes(':src="shopAvatar"'), true)
assert.equal(groupDetailSource.includes('v-if="shopBanner"'), true)
assert.equal(groupDetailSource.includes('if(this.groupInfo.label) return this.groupInfo.label'), true)
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
assert.equal(orderSource.includes('getPaidOrders'), true)
assert.equal(orderSource.includes('buildMemberReceiptParams(order)'), true)
assert.equal(orderSource.includes('getOrderCount'), false)
const orderDetailSource = fs.readFileSync(new URL('../pages/order/detail.vue', import.meta.url), 'utf8')
assert.equal(orderDetailSource.includes('v-else-if="hasOrder"'), true)
assert.equal(orderDetailSource.includes('paidSuccessHint'), true)
assert.equal(orderDetailSource.includes('团购订单'), true)
assert.equal(orderDetailSource.includes('receipt-progress'), false)
assert.equal(orderDetailSource.includes('receiptSteps'), false)
assert.equal(orderDetailSource.includes('detailStatusIcon'), true)
assert.equal(orderDetailSource.includes('已支付，待提货'), true)
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
assert.equal(orderDetailSource.includes('return [1, 2, 3].includes(Number(this.displayOrder.status))'), true)
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
assert.equal(orderSource.includes('确认核销'), true)
assert.equal(orderSource.includes('return !this.paidMode && [1, 2, 3].includes(Number(order.status))'), true)
assert.equal(orderSource.includes('return this.paidMode && [1, 2].includes(Number(order.status))'), true)
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
assert.equal(orderSource.includes('/pages/order/refund?orderNo='), true)
assert.equal(orderSource.includes('/pages/order/refundDetail?orderNo='), true)
assert.equal(orderSource.includes('getWxPayCache(order.orderNo)'), false)
assert.equal(orderSource.includes("requestPayOrder({ orderNo: order.orderNo, openid })"), true)
assert.equal(orderSource.includes("uni.showToast({ title: '支付已超时，请重新下单'"), true)
assert.equal(orderSource.includes("uni.showToast({ title: '订单已失效，请重新下单'"), false)

const refundSource = fs.readFileSync(new URL('../pages/order/refund.vue', import.meta.url), 'utf8')
assert.equal(refundSource.includes('售后类型'), true)
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
assert.equal(refundSource.includes("return `goods-${goodsId}`"), true)
assert.equal(refundSource.includes("return id > 0 ? `order-goods-${id}` : `index-${index}`"), true)
assert.equal(refundSource.includes('selectedMap[goods.refundKey]'), true)
assert.equal(refundSource.includes('toggleGoods(goods)'), true)
assert.equal(refundSource.includes('toggleGoods(goods.id)'), false)
assert.equal(refundSource.includes('if (this.isOnlyRefund) return this.refundableGoods'), true)
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

const refundDetailSource = fs.readFileSync(new URL('../pages/order/refundDetail.vue', import.meta.url), 'utf8')
assert.equal(refundDetailSource.includes('待团长处理'), true)
assert.equal(refundDetailSource.includes('团长已同意'), true)
assert.equal(refundDetailSource.includes('团长已拒绝'), true)
assert.equal(refundDetailSource.includes('售后历史'), true)
assert.equal(refundDetailSource.includes('getRefundRecords'), true)
assert.equal(refundDetailSource.includes('getGroupShop'), true)
assert.equal(refundDetailSource.includes('getRefundRecordRows(data)'), true)
assert.equal(refundDetailSource.includes('order-overview'), true)
assert.equal(refundDetailSource.includes('refund-fee'), true)
assert.equal(refundDetailSource.includes('mergeMemberOrderRefundRecords(order, records)'), true)
assert.equal(refundDetailSource.includes('getMemberRefundDisplayNum(item, this.refundFlag)'), true)
assert.equal(refundDetailSource.includes('.filter(isMemberRefundPending)'), true)
assert.equal(refundDetailSource.includes('Number(item.applyRefund || 0) > 0'), false)
assert.equal(refundDetailSource.includes('refundDisplayAmount'), true)
assert.equal(refundDetailSource.includes("退款 {{ goodsRefundNum(goods) }}{{ goods.unit || '件' }}，￥{{ goodsRefundAmountText(goods) }}"), true)
assert.equal(refundDetailSource.includes('取消售后接口未配置'), false)
assert.equal(refundDetailSource.includes('售后类型：'), true)

const orderListSource = fs.readFileSync(new URL('../pages/order/index.vue', import.meta.url), 'utf8')
assert.equal(orderListSource.includes('goods.statusList && goods.statusList.length'), true)
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
