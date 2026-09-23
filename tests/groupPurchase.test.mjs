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
	pickInvalidSpecCartItems,
	normalizeGroupPickupPoint,
	normalizeGroupSkuList,
	normalizeSkuNames,
	normalizeSpecList,
	reconcileSelectedCartKeys,
	removeSelectedCartGoods,
	resolveSelectedPickupPointId,
	setCartGoodsQuantity,
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
	// 该 fixture 没有 specs → 不是多规格商品（新增字段：购物车据此校验 skuId）
	hasSpecs: false,
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

// 选规格弹窗写入：已存在的「商品 + 规格」按弹窗数量覆盖，不累加（否则同步后又翻倍）。
assert.deepEqual(setCartGoodsQuantity([
	{ id: 7, skuids: '2,3', num: 1, price: 1 },
	{ id: 7, skuids: '4', num: 1, price: 2 }
], { id: 7, skuids: '2,3', num: 3, price: 5, balance: 8, img: '/new.png' }), [
	{ id: 7, skuids: '2,3', num: 3, price: 5, balance: 8, img: '/new.png' },
	{ id: 7, skuids: '4', num: 1, price: 2 }
])
// 购物车里没有该规格时新增一行。
assert.deepEqual(setCartGoodsQuantity([{ id: 7, skuids: '2,3', num: 3 }], { id: 7, skuids: '4', num: 1, price: 2 }), [
	{ id: 7, skuids: '2,3', num: 3 },
	{ id: 7, skuids: '4', num: 1, price: 2 }
])
// 不修改入参数组。
const setTargetCart = [{ id: 7, skuids: '2,3', num: 1 }]
setCartGoodsQuantity(setTargetCart, { id: 7, skuids: '2,3', num: 4 })
assert.equal(setTargetCart[0].num, 1)

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
// 规格选中态必须走 refresh 刷新机制，否则切换规格后高亮不更新。
assert.equal(addCartSource.includes('isSpecValActive(spec.specId, val.valId)'), true)
assert.equal(addCartSource.includes('selectedSpecValIndexArray[spec.specId] === val.valId'), false)
assert.equal(addCartSource.includes('isSpecValActive(specId, valId) {'), true)
// 弹窗必须回填购物车里该商品已选的规格与数量，切规格时也要重新同步。
assert.equal(addCartSource.includes('show(goodsInfo, balance, cartGoodsList = [])'), true)
assert.equal(addCartSource.includes('this.cartGoodsList = Array.isArray(cartGoodsList) ? cartGoodsList : []'), true)
assert.equal(addCartSource.includes('this.initSelectSpecMapStruct(this.resolveCartItemForGoods())'), true)
assert.equal(addCartSource.includes('syncQuantityFromCart()'), true)
assert.equal(addCartSource.includes('getCartItemKey(this.goods)'), true)
assert.match(addCartSource, /this\.syncSelectedSpecText\(\)\s*\/\/ 切规格后数量回到该规格在购物车中的数量（没有则 1）\s*this\.syncQuantityFromCart\(\)/)
assert.equal(addCartSource.includes('cartGoodsList: [],'), true)

const checkoutSource = fs.readFileSync(new URL('../pages/group/cart.vue', import.meta.url), 'utf8')
assert.equal(checkoutSource.includes('selectedPointId'), true)
assert.equal(checkoutSource.includes('resolveSelectedPickupPointId'), true)
assert.equal(checkoutSource.includes('this.$refs.pointRef.show(this.selectedPointId)'), true)
assert.equal(checkoutSource.includes('selectedPointIndex'), false)
assert.equal(checkoutSource.includes("uni.getStorageSync('pointId')"), false)
assert.equal(checkoutSource.includes("uni.showToast({ title: '请选择提货点'"), true)
// ===== 端到端：规格弹层 → 购物车 → 结算快照 → 下单体，skuId 必须一路保留 =====
const skuGoods = { id: 80, name: '望京外来品种黑玉米', price: 0.4, specs: [{ specId: 1 }] }
// ① 规格弹层选中规格后加购
const pickedItem = createCartItemFromGoods(skuGoods, { num: 2, skuId: 497, skuids: '170', skunames: '每个约300克' })
// ② 进购物车（merge/set 都是整对象拷贝）
const cartAfterAdd = setCartGoodsQuantity([], pickedItem)
// ③ 结算页改数量（同样整对象拷贝）
const cartAfterQty = updateCartGoodsQuantity(cartAfterAdd, 0, 1)
assert.equal(cartAfterQty[0].skuId, 497)
// ④ 下单体
const chainPayload = buildOrderPayload({
	groupId: 34, pointId: 7, name: '菲黎莫属', mobile: '15801281362', cartGoodsList: cartAfterQty
})
assert.deepEqual(chainPayload.goods, [{
	id: 80, num: 3, packId: 0, packName: '', packNum: 0, skuId: 497, skuids: '170', skunames: '每个约300克'
}])
// ⑤ 结算页回写购物车也不丢 skuId
const syncedCart = syncCheckoutGoodsToSessionCart(cartAfterQty, cartAfterAdd, cartAfterQty)
assert.equal(syncedCart[0].skuId, 497)

// ===== 多规格商品必须有 skuId（否则下单带 skuId=0，后端按 SKU 扣库存失败）=====
// 购物车条目记录「该商品是否多规格」
const multiSpecItem = createCartItemFromGoods({ id: 80, name: '多规格商品', specs: [{ specId: 1 }] }, { num: 4 })
assert.equal(multiSpecItem.hasSpecs, true)
assert.equal(multiSpecItem.skuId, 0)
const singleSpecItem = createCartItemFromGoods({ id: 81, name: '单规格商品' }, { num: 2 })
assert.equal(singleSpecItem.hasSpecs, false)
// 选全规格的条目：下单体必须带上 skuId / skuids / skunames
const skuItem = createCartItemFromGoods({ id: 80, name: '多规格商品', specs: [{ specId: 1 }] }, { num: 4, skuId: 497, skuids: '170', skunames: '每个约300克' })
assert.deepEqual(buildOrderGoodsPayload([skuItem]), [{
	id: 80, num: 4, packId: 0, packName: '', packNum: 0, skuId: 497, skuids: '170', skunames: '每个约300克'
}])
// 拦截器：多规格但没选到 SKU 的条目（含历史购物车脏数据）
assert.deepEqual(pickInvalidSpecCartItems([multiSpecItem]).map(item => item.name), ['多规格商品'])
assert.deepEqual(pickInvalidSpecCartItems([multiSpecItem, skuItem, singleSpecItem]).map(item => item.name), ['多规格商品'])
assert.equal(pickInvalidSpecCartItems([skuItem, singleSpecItem]).length, 0)
assert.deepEqual(pickInvalidSpecCartItems(null), [])
// 规格弹层：多规格必须选全规格才允许加购
const specDialogSource = fs.readFileSync(new URL('../pages/group/add.vue', import.meta.url), 'utf8')
assert.equal(specDialogSource.includes("if(this.specList.length > 0 && !this.selectedSku){"), true)
assert.equal(specDialogSource.includes("uni.showToast({ title: '请选择完整的商品规格', icon: 'none', duration: 2500 })"), true)
// 下单前兜底拦截（历史购物车里的脏数据）
assert.equal(checkoutSource.includes('pickInvalidSpecCartItems(this.cartGoodsList)'), true)
assert.equal(checkoutSource.includes("'请重新选择商品规格：'"), true)
assert.equal(checkoutSource.includes("title: '商品规格缺失'"), true)

// 校验提示别一闪而过：默认 1.5s 太短，统一延长
assert.equal(checkoutSource.includes("uni.showToast({ title: '请选择提货点', icon: 'none', duration: 2500 })"), true)
assert.equal(checkoutSource.includes("uni.showToast({ title: '请添加商品', icon: 'none', duration: 2500 })"), true)
// 下单失败（限购提示/请稍后提交订单）不能吞掉，且必须放到 hideLoading 之后再弹——
// loading 期间弹出的提示会被紧接着的 hideLoading 立刻关掉（就是「一闪而过」的成因）
assert.equal(checkoutSource.includes('let submitErrorMessage = '), true)
assert.equal(checkoutSource.includes('submitErrorMessage = String((err && (err.msg || err.message)) || \'\')'), true)
assert.equal(checkoutSource.includes('if (submitErrorMessage) this.showSubmitError(submitErrorMessage)'), true)
assert.equal(checkoutSource.includes('showSubmitError(message){'), true)
assert.equal(checkoutSource.includes("title: '无法下单'"), true)
assert.equal(checkoutSource.includes('showCancel: false'), true)
// 支付失败：modal 展示后再跳订单详情（toast 会被页面跳转打断）
assert.equal(checkoutSource.includes("title: '支付未完成'"), true)
assert.equal(checkoutSource.includes("confirmText: '查看订单'"), true)

const groupDetailSource = fs.readFileSync(new URL('../pages/group/index.vue', import.meta.url), 'utf8')
assert.equal(groupDetailSource.includes('const checkoutContext = this.getCurrentCartContext()'), true)
assert.equal(groupDetailSource.includes('const checkoutGoodsList = this.cartGoodsList'), true)
assert.equal(groupDetailSource.includes('.map(item => Object.assign({}, item))'), true)
assert.equal(groupDetailSource.includes('app.globalData.sessionCheckoutGoodsList = checkoutGoodsList.map'), true)
assert.equal(groupDetailSource.includes('this.$refs.cartDialogRef.hide()'), true)
assert.equal(groupDetailSource.includes('this.cartGoodsList = this.cartGoodsList.filter(item => item.num > 0)'), false)
assert.equal(groupDetailSource.includes('const checkoutContext = app.globalData.sessionCartContext || this.getCurrentCartContext()'), false)
// 多规格商品加购后必须保留「加入购物车」入口，否则无法再选择其它规格。
assert.equal(groupDetailSource.includes('!hasSelectableSpec(item) && getSelectedGoodsCount(item) > 0'), true)
assert.equal(groupDetailSource.includes('hasSelectableSpec(item){'), true)
assert.equal(groupDetailSource.includes('Array.isArray(item && item.specs) && item.specs.length > 0'), true)
assert.equal(groupDetailSource.includes('v-else-if="isBlackMember==false && getSelectedGoodsCount(item) > 0"'), false)
// 父页面把购物车传给弹窗，并用覆盖语义写回，避免同步后又累加翻倍。
assert.equal(groupDetailSource.includes('this.$refs.addCartRef.show(product, goodsStockVal, this.cartGoodsList)'), true)
assert.equal(groupDetailSource.includes('setCartGoodsQuantity(this.cartGoodsList, goods)'), true)
assert.equal(groupDetailSource.includes('mergeCartGoods'), false)

// 多规格切换：选中不同规格值必须算出不同的 skuids / skuId，供购物车按规格分行。
const switchSpecList = normalizeSpecList([
	{ specId: 1, specName: '重量', valList: [{ valId: 10, valName: '500g' }, { valId: 11, valName: '1kg' }] }
])
const switchSkus = normalizeGroupSkuList([
	{ id: 1, ids: '10', names: '500g', price: 2, stock: 9 },
	{ id: 2, ids: '11', names: '1kg', price: 3, stock: 9 }
])
const switchNamesMap = {}
switchSpecList.forEach(spec => spec.valList.forEach(val => { switchNamesMap[val.valId] = val.valName }))
const selectedSpecMap = {}
switchSpecList.forEach(spec => { selectedSpecMap[spec.specId] = spec.valList[0].valId })
assert.equal(findSkuBySelectedSpec(switchSkus, selectedSpecMap, switchNamesMap).ids, '10')
selectedSpecMap[1] = 11
assert.equal(findSkuBySelectedSpec(switchSkus, selectedSpecMap, switchNamesMap).ids, '11')
// 同一商品不同规格在购物车中是两行，不会被合并。
assert.equal(mergeCartGoods(
	[createCartItemFromGoods({ id: 7, price: 2 }, { skuids: '10', num: 1 })],
	createCartItemFromGoods({ id: 7, price: 3 }, { skuids: '11', num: 1 })
).length, 2)

console.log('groupPurchase tests passed')
