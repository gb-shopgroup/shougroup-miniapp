import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
	buildGroupListParams,
	calculateCartTotal,
	clearPaidCheckoutSessionState,
	buildOrderGoodsPayload,
	buildOrderPayload,
	createCartItemFromGoods,
	findSkuBySelectedSpec,
	getCartGoodsCount,
	getCartItemKey,
	getCartQuantityForGoods,
	getMiniProgramPayAction,
	getSelectedCartGoods,
	inferSpecListFromSkuList,
	isLikelyOrderId,
	isGoodsSoldOut,
	mergeCartGoods,
	normalizeCreatedOrderNo,
	normalizeGroupGoods,
	normalizeGroupGoodsList,
	normalizeGroupPickupPoint,
	normalizeGroupSkuList,
	normalizeSkuNames,
	normalizeSpecList,
	reconcileSelectedCartKeys,
	removeSelectedCartGoods,
	resolveSelectedPickupPointId,
	syncCheckoutGoodsToSessionCart,
	updateCartGoodsQuantity
} from '../utils/groupPurchase.js'

assert.deepEqual(buildGroupListParams({ leaderId: 12, catId: 0, page: 2, pageSize: 10 }), {
	leaderId: 12,
	catId: 0,
	page: 2,
	pageSize: 10
})

assert.deepEqual(buildGroupListParams({ leaderId: 12, catId: -1, page: 1, pageSize: 10 }), {
	leaderId: 12,
	catId: 0,
	page: 1,
	pageSize: 10
})

assert.deepEqual(normalizeGroupPickupPoint({
	pointId: 5,
	pointName: '对对对',
	pointAddress: '达到的地方',
	pointImg: '/point.png',
	longitude: 116.4436,
	latitude: 39.9219,
	pointScope: 10,
	pointInfo: '说明',
	person: '顶顶顶',
	phone: '18213514781',
	isClose: 0
}), {
	id: 5,
	name: '对对对',
	address: '达到的地方',
	img: '/point.png',
	longitude: 116.4436,
	latitude: 39.9219,
	scope: 10,
	info: '说明',
	person: '顶顶顶',
	phone: '18213514781',
	isClose: 0
})

assert.equal(resolveSelectedPickupPointId([{ id: 5 }, { id: 8 }], 8), 8)
assert.equal(resolveSelectedPickupPointId([{ id: 5 }, { id: 8 }], 3), 0)
assert.equal(resolveSelectedPickupPointId([{ id: 5 }], 0), 0)

assert.deepEqual(normalizeGroupGoods({
	id: 7,
	name: '苹果',
	img: '/a.png',
	price: 9.9,
	stock: 1,
	num: 18,
	specs: [{ specId: 1, specName: '甜度', valList: [{ valId: 3, valName: '高' }] }],
	packs: [{ id: 1, name: '旧包装' }],
	skus: [{ id: 9, ids: '3', names: '高', stock: 5, price: 8, price2: 10 }]
}), {
	id: 7,
	name: '苹果',
	img: '/a.png',
	price: 9.9,
	price2: 0,
	type: 0,
	isStock: 1,
	balance: 18,
	unit: '',
	limit: 0,
	quantity: 0,
	specs: [{ specId: 1, specName: '甜度', valList: [{ valId: 3, valName: '高' }] }],
	skus: [{ id: 9, ids: '3', names: '高', price: 8, price2: 10, stock: 5, num: 5, img: '', isClose: 0 }]
})

assert.deepEqual(normalizeGroupGoods({
	gid: 12,
	gname: '香蕉',
	goodsImg: '/banana.png',
	gtype: 2,
	price: '11.5',
	stock: 1,
	num: 6,
	isLimit: 1,
	limitNum: 2,
	specList: [{ specId: 21, specName: '重量', valList: [{ valId: 31, valName: '500g' }] }],
	skuList: [{ id: 41, ids: '31', names: '500g', price: 10, num: 3 }]
}), {
	id: 12,
	name: '香蕉',
	img: '/banana.png',
	price: 11.5,
	price2: 0,
	type: 2,
	isStock: 1,
	balance: 6,
	unit: '',
	limit: 1,
	quantity: 2,
	specs: [{ specId: 21, specName: '重量', valList: [{ valId: 31, valName: '500g' }] }],
	skus: [{ id: 41, ids: '31', names: '500g', price: 10, price2: 0, stock: 3, num: 3, img: '', isClose: 0 }]
})

assert.deepEqual(normalizeGroupGoodsList([
	{ gid: 12, gname: '香蕉', img: '/banana.png' },
	{ gid: 0, gname: '', img: '' }
]).map(item => item.id), [12])

assert.deepEqual(normalizeSpecList([
	{ id: 1, name: '规格名称', lists: [{ id: 2, val: '描述1' }, { id: 0, val: '无效' }] }
]), [
	{ specId: 1, specName: '规格名称', valList: [{ valId: 2, valName: '描述1' }] }
])

assert.deepEqual(normalizeGroupSkuList([
	{ id: 10, ids: '2,3', names: '大份,甜', price: '12.5', price2: '16', num: 9, img: '/sku.png' }
]), [
	{ id: 10, ids: '2,3', names: '大份,甜', price: 12.5, price2: 16, stock: 9, num: 9, img: '/sku.png', isClose: 0 }
])

assert.deepEqual(inferSpecListFromSkuList([
	{ id: 21, ids: '101', names: 'S', price: 2, num: 10 },
	{ id: 22, ids: '102', names: 'M', price: 3, num: 10 },
	{ id: 23, ids: '103', names: 'L', price: 4, num: 10 }
]), [
	{
		specId: 'sku-spec-1',
		specName: '规格',
		valList: [
			{ valId: 101, valName: 'S' },
			{ valId: 102, valName: 'M' },
			{ valId: 103, valName: 'L' }
		]
	}
])

const skuOnlyGoods = normalizeGroupGoods({
	id: 19,
	name: 'SKU-only 商品',
	price: 2,
	skuList: [
		{ id: 21, ids: '101', names: 'S', price: 2, num: 10 },
		{ id: 22, ids: '102', names: 'M', price: 3, num: 10 }
	]
})
assert.equal(skuOnlyGoods.specs.length, 1)
assert.equal(skuOnlyGoods.specs[0].valList.length, 2)
assert.equal(skuOnlyGoods.skus.length, 2)

assert.deepEqual(findSkuBySelectedSpec([
	{ id: 10, ids: '2,3', names: '大份,甜', price: 12.5, num: 9 },
	{ id: 11, ids: '4', names: '小份', price: 8, num: 5 }
], { 1: 3, 2: 2 }), {
	id: 10,
	ids: '2,3',
	names: '大份,甜',
	price: 12.5,
	num: 9
})
assert.equal(normalizeSkuNames('甜，大份'), '大份,甜')
assert.deepEqual(findSkuBySelectedSpec([
	{ id: 12, ids: 'old-2,old-3', names: '大份/甜', price: 12.5, num: 9 },
	{ id: 13, ids: 'old-4', names: '小份', price: 8, num: 5 }
], { 1: 3, 2: 2 }, { 2: '大份', 3: '甜' }), {
	id: 12,
	ids: 'old-2,old-3',
	names: '大份/甜',
	price: 12.5,
	num: 9
})

const cartItem = createCartItemFromGoods({
	id: 7,
	name: '苹果',
	img: '/a.png',
	price: 9.9,
	type: 1,
	isStock: 1,
	balance: 18,
	limit: 1,
	quantity: 2,
	unit: '斤'
}, {
	num: 3,
	skuId: 10,
	skuids: '2,3',
	skunames: '大份,甜',
	price: 12.5,
	balance: 9
})

assert.deepEqual(cartItem, {
	id: 7,
	name: '苹果',
	img: '/a.png',
	price: 12.5,
	type: 1,
	stock: 1,
	balance: 9,
	limit: 1,
	quantity: 2,
	unit: '斤',
	num: 3,
	packId: 0,
	packName: '',
	packNum: 0,
	skuId: 10,
	skuids: '2,3',
	skunames: '大份,甜'
})

assert.deepEqual(mergeCartGoods([
	{ id: 7, skuids: '2,3', num: 1 },
	{ id: 7, skuids: '4', num: 1 }
], { id: 7, skuids: '2,3', num: 2 }), [
	{ id: 7, skuids: '2,3', num: 3 },
	{ id: 7, skuids: '4', num: 1 }
])

assert.equal(getCartGoodsCount([{ num: 2 }, { num: 3 }, { num: 0 }]), 5)
assert.equal(calculateCartTotal([{ price: 1.5, num: 2 }, { price: '2.00', num: 3 }]), '9.00')
assert.equal(isGoodsSoldOut({ isStock: 1, balance: 0 }), true)
assert.equal(isGoodsSoldOut({ isStock: 0, balance: 0 }), false)
assert.equal(getCartQuantityForGoods([
	{ id: 7, skuids: '2,3', num: 2 },
	{ id: 7, skuids: '4', num: 1 },
	{ id: 8, skuids: '', num: 5 }
], 7), 3)
assert.equal(getCartItemKey({ id: 7, skuids: '2,3' }), '7__2,3')
assert.deepEqual(reconcileSelectedCartKeys([
	{ id: 7, skuids: '2,3', num: 2 },
	{ id: 8, skuids: '', num: 1 }
], {
	'7__2,3': true,
	'9__': true
}), {
	'7__2,3': true,
	'8__': true
})
assert.deepEqual(getSelectedCartGoods([
	{ id: 7, skuids: '2,3', num: 2 },
	{ id: 8, skuids: '', num: 1 }
], {
	'7__2,3': true,
	'8__': false
}), [
	{ id: 7, skuids: '2,3', num: 2 }
])
assert.deepEqual(updateCartGoodsQuantity([
	{ id: 7, skuids: '2,3', num: 2 },
	{ id: 8, skuids: '', num: 1 }
], 0, -1), [
	{ id: 7, skuids: '2,3', num: 1 },
	{ id: 8, skuids: '', num: 1 }
])
assert.deepEqual(updateCartGoodsQuantity([
	{ id: 7, skuids: '2,3', num: 1 },
	{ id: 8, skuids: '', num: 1 }
], 0, -1, { removeWhenZero: true }), [
	{ id: 8, skuids: '', num: 1 }
])
assert.deepEqual(syncCheckoutGoodsToSessionCart([
	{ id: 7, skuids: '2,3', num: 1 },
	{ id: 8, skuids: '', num: 2 }
], [
	{ id: 7, skuids: '2,3', num: 1 }
], [
	{ id: 7, skuids: '2,3', num: 3 }
]), [
	{ id: 8, skuids: '', num: 2 },
	{ id: 7, skuids: '2,3', num: 3 }
])
assert.deepEqual(syncCheckoutGoodsToSessionCart([
	{ id: 7, skuids: '2,3', num: 1 },
	{ id: 8, skuids: '', num: 2 }
], [
	{ id: 7, skuids: '2,3', num: 1 }
], []), [
	{ id: 8, skuids: '', num: 2 }
])
assert.equal(getMiniProgramPayAction('develop'), 'requestPayment')
assert.equal(getMiniProgramPayAction('trial'), 'requestPayment')
assert.equal(getMiniProgramPayAction('release'), 'requestPayment')
assert.equal(getMiniProgramPayAction('unknown'), 'redirectDetail')
assert.equal(normalizeCreatedOrderNo('NO123'), 'NO123')
assert.equal(normalizeCreatedOrderNo('200001182677000002'), '200001182677000002')
assert.equal(normalizeCreatedOrderNo({ code: 200, data: '200001182677000002', msg: '下单成功' }), '200001182677000002')
assert.equal(normalizeCreatedOrderNo({ orderNo: 'NO124' }), 'NO124')
assert.equal(normalizeCreatedOrderNo({ orderSn: 'SN124' }), 'SN124')
assert.equal(normalizeCreatedOrderNo({ pcode: 'PC124' }), 'PC124')
assert.equal(normalizeCreatedOrderNo({ id: 125 }), '')
assert.equal(normalizeCreatedOrderNo(125), '')
assert.equal(normalizeCreatedOrderNo('125'), '125')
assert.equal(isLikelyOrderId('125'), true)
assert.equal(isLikelyOrderId('ORDER_202609040001'), false)
assert.deepEqual(removeSelectedCartGoods([
	{ id: 7, skuids: '2,3', num: 2 },
	{ id: 7, skuids: '4', num: 1 },
	{ id: 8, skuids: '', num: 5 }
], [
	{ id: 7, skuids: '2,3', num: 2 }
]), [
	{ id: 7, skuids: '4', num: 1 },
	{ id: 8, skuids: '', num: 5 }
])

const paidSessionState = clearPaidCheckoutSessionState({
	sessionCartGoodsList: [
		{ id: 7, skuids: '2,3', num: 2 },
		{ id: 8, skuids: '', num: 1 }
	],
	sessionCheckoutGoodsList: [{ id: 7, skuids: '2,3', num: 2 }],
	sessionCartContext: { groupId: 9, leaderId: 1 },
	sessionCheckoutOrderNo: 'NO123',
	sessionCartVersion: 4
}, 'NO123')
assert.deepEqual(paidSessionState, {
	sessionCartGoodsList: [],
	sessionCheckoutGoodsList: [],
	sessionCartContext: {},
	sessionCheckoutOrderNo: '',
	sessionCartVersion: 5
})
const unchangedSessionState = { sessionCheckoutOrderNo: 'NO123', sessionCartGoodsList: [{ id: 7 }] }
assert.equal(clearPaidCheckoutSessionState(unchangedSessionState, 'NO999'), unchangedSessionState)

assert.deepEqual(buildOrderGoodsPayload([cartItem]), [{
	id: 7,
	num: 3,
	packId: 0,
	packName: '',
	packNum: 0,
	skuId: 10,
	skuids: '2,3',
	skunames: '大份,甜'
}])

assert.deepEqual(buildOrderPayload({
	groupId: 99,
	pointId: 5,
	name: '张三',
	mobile: '13800000000',
	remark: '放门口',
	cartGoodsList: [cartItem]
}), {
	groupId: 99,
	pointId: 5,
	name: '张三',
	mobile: '13800000000',
	remark: '放门口',
	goods: [{
		id: 7,
		num: 3,
		packId: 0,
		packName: '',
		packNum: 0,
		skuId: 10,
		skuids: '2,3',
		skunames: '大份,甜'
	}]
})

const addCartSource = fs.readFileSync(new URL('../pages/group/add.vue', import.meta.url), 'utf8')
assert.equal(addCartSource.includes('商品规格价格未配置'), false)
assert.equal(addCartSource.includes('this.goods.skus.length > 0 && !this.selectedSku'), false)

const checkoutSource = fs.readFileSync(new URL('../pages/group/cart.vue', import.meta.url), 'utf8')
assert.equal(checkoutSource.includes('selectedPointId'), true)
assert.equal(checkoutSource.includes('resolveSelectedPickupPointId'), true)
assert.equal(checkoutSource.includes('this.$refs.pointRef.show(this.selectedPointId)'), true)
assert.equal(checkoutSource.includes('selectedPointIndex'), false)
assert.equal(checkoutSource.includes("uni.getStorageSync('pointId')"), false)
assert.equal(checkoutSource.includes("uni.showToast({ title: '请选择提货点'"), true)

const groupDetailSource = fs.readFileSync(new URL('../pages/group/index.vue', import.meta.url), 'utf8')
assert.equal(groupDetailSource.includes('const checkoutContext = this.getCurrentCartContext()'), true)
assert.equal(groupDetailSource.includes('const checkoutGoodsList = this.cartGoodsList'), true)
assert.equal(groupDetailSource.includes('.map(item => Object.assign({}, item))'), true)
assert.equal(groupDetailSource.includes('app.globalData.sessionCheckoutGoodsList = checkoutGoodsList.map'), true)
assert.equal(groupDetailSource.includes('this.$refs.cartDialogRef.hide()'), true)
assert.equal(groupDetailSource.includes('this.cartGoodsList = this.cartGoodsList.filter(item => item.num > 0)'), false)
assert.equal(groupDetailSource.includes('const checkoutContext = app.globalData.sessionCartContext || this.getCurrentCartContext()'), false)

console.log('groupPurchase tests passed')
