import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
	buildGoodsSubmitPayload,
	deriveGoodsFieldsFromSkuList,
	getLeaderGoodsStatusText,
	isLeaderGoodsClosed,
	buildGroupGoodsReference,
	buildPagedGoodsState,
	buildSkuListWithServerIds,
	buildCommonSpecUpdatePayload,
	buildGoodsAddSpecList,
	buildLocalSkuDraftList,
	buildLeaderSkuSavePayload,
	buildSpecUpdatePayload,
	cloneSpecAsDraft,
	extractCreatedGoodsId,
	extractUnitFromSpecValue,
	formatSpecSummary,
	formatStockSummary,
	inferSpecListFromSkuList,
	limitPricePrecision,
	normalizeGoodsForm,
	normalizeLeaderGoods,
	normalizeLeaderSkuDraftList,
	normalizeLeaderSkuList,
	normalizeLeaderSpecList
} from '../utils/leaderProduct.js'

assert.equal(limitPricePrecision('12.345'), '12.34')
assert.equal(limitPricePrecision('.5'), '0.5')
assert.equal(limitPricePrecision('12.3.4.5'), '12.34')
assert.equal(limitPricePrecision('abc￥-12.3x4元'), '12.34')

const rawGoods = {
	id: 8,
	cat: 3,
	type: 2,
	name: '香蕉',
	img: '/banana.png',
	img2: '/banana2.png',
	price: 12.5,
	price2: 18,
	isStock: 1,
	num: 88,
	isLimit: 1,
	num2: 2,
	unit: '斤',
	specs: [
		{ specId: 11, specName: '重量', valList: [{ valId: 21, valName: '500g' }, { valId: 22, valName: '1kg' }] }
	]
}

assert.deepEqual(normalizeLeaderGoods(rawGoods), {
	id: 8,
	catId: 3,
	type: 2,
	name: '香蕉',
	img: '/banana.png',
	img2: '/banana2.png',
	img3: '',
	costPrice: 0,
	goodsInfo: '',
	price: 12.5,
	price2: 18,
	isStock: 1,
	stockNum: 88,
	isLimit: 1,
	limitNum: 2,
	unit: '斤',
	isClose: 0,
	isCheck: 0,
	checkRemark: '',
	specs: [
		{ id: 11, name: '重量', price: 0, stock: 0, vals: [{ id: 21, sid: 11, val: '500g' }, { id: 22, sid: 11, val: '1kg' }] }
	],
	specSource: 'goods',
	skuList: []
})

assert.equal(formatSpecSummary(normalizeLeaderGoods(rawGoods).specs), '重量：500g，1kg')
assert.equal(formatSpecSummary([]), '规格：未设置')
assert.equal(formatStockSummary({ isStock: 0, stockNum: 0, unit: '斤' }), '库存：不限')
assert.equal(formatStockSummary({ isStock: 1, stockNum: 88, unit: '斤' }), '库存：88斤')

assert.deepEqual(normalizeGoodsForm({
	goods: {
		id: 8,
		cat: 3,
		type: 2,
		name: '香蕉',
		price: 12.5,
		price2: 18,
		isStock: 1,
		num: 88,
		isLimit: 1,
		num2: 2,
		unit: '斤',
		img: '/banana.png',
		specList: [{ specId: 11, specName: '重量', valList: [{ valId: 21, valName: '500g' }] }]
	},
	skuList: [{ id: 31, gid: 8, ids: '21', names: '500g', price: 12.5, price2: 18, num: 6 }]
}).stockNum, 88)
assert.equal(normalizeGoodsForm({
	goods: { id: 8, name: '香蕉' },
	skuList: [{ id: 31, gid: 8, ids: '21', names: '500g', price: 12.5, price2: 18, num: 6 }]
}).skuList.length, 1)
assert.deepEqual(inferSpecListFromSkuList([
	{ id: 160, gid: 26, ids: '50', names: '3', price: 3, price2: 666, num: 5 }
]), [{
	id: 0,
	name: '规格',
	price: 0,
	stock: 0,
	vals: [{ id: 50, sid: 0, val: '3' }]
}])
const skuOnlyGoods = normalizeGoodsForm({
	goods: {
		id: 26,
		cat: 1,
		type: 2,
		name: '333',
		price: 5,
		price2: 666,
		isStock: 1,
		num: 5,
		unit: '解决',
		img: '/goods.png',
		specList: []
	},
	skuList: [{ id: 160, gid: 26, ids: '50', names: '3', price: 3, price2: 666, num: 5, img: '/goods.png' }]
})
assert.equal(skuOnlyGoods.specSource, 'sku')
assert.equal(skuOnlyGoods.specs[0].vals[0].val, '3')
assert.equal(Object.prototype.hasOwnProperty.call(buildGoodsSubmitPayload({
	id: 26,
	catId: 1,
	type: 2,
	name: '333',
	price: 5,
	price2: 666,
	isStock: 1,
	stockNum: 5,
	isLimit: 0,
	limitNum: 0,
	unit: '解决',
	img: '/goods.png',
	specSource: 'sku',
	specList: skuOnlyGoods.specs,
	skuList: skuOnlyGoods.skuList
}), 'addSpecList'), false)

assert.deepEqual(buildGoodsSubmitPayload({
	id: 8,
	catId: 3,
	type: 2,
	name: '香蕉',
	costPrice: '8',
	goodsInfo: '新鲜现摘',
	price: '12.509',
	price2: '',
	isStock: 0,
	stockNum: '',
	isLimit: 0,
	limitNum: '',
	unit: '斤',
	img: '/banana.png',
	img2: '',
	img3: ''
}), {
	id: 8,
	catId: 3,
	type: 2,
	name: '香蕉',
	costPrice: 8,
	goodsInfo: '新鲜现摘',
	price: 12.5,
	price2: 0,
	isStock: 0,
	stockNum: 0,
	isLimit: 0,
	limitNum: 0,
	unit: '斤',
	img: '/banana.png',
	img2: '',
	img3: ''
})

assert.deepEqual(buildGoodsSubmitPayload({
	id: 0,
	catId: 3,
	type: 2,
	name: '香蕉',
	costPrice: '8',
	goodsInfo: '新鲜现摘',
	price: '12.50',
	price2: '18',
	isStock: 1,
	stockNum: 88,
	isLimit: 1,
	limitNum: 2,
	unit: '斤',
	img: '/banana.png',
	img2: '',
	img3: '',
	specList: normalizeLeaderSpecList([
		{ specId: 11, specName: '重量', valList: [{ valId: 21, valName: '500g' }] }
	])
}), {
	id: 0,
	catId: 3,
	type: 2,
	name: '香蕉',
	costPrice: 8,
	goodsInfo: '新鲜现摘',
	salePrice: 12.5,
	marketPrice: 18,
	isStock: 1,
	stockNum: 88,
	isLimit: 1,
	limitNum: 2,
	unit: '斤',
	img: '/banana.png',
	img2: '',
	img3: '',
	addSpecList: [{
		specId: 0,
		name: '重量',
		price: 0,
		stock: 0,
		specValLists: [{ valId: 0, sid: 0, val: '500g' }]
	}]
})

const specs = normalizeLeaderSpecList([
	{ specId: 11, specName: '重量', valList: [{ valId: 21, valName: '500g' }] }
])
assert.deepEqual(specs, [
	{ id: 11, name: '重量', price: 0, stock: 0, vals: [{ id: 21, sid: 11, val: '500g' }] }
])

const editGoodsPayload = buildGoodsSubmitPayload({
	id: 8,
	catId: 3,
	type: 2,
	name: '香蕉',
	price: '12.50',
	price2: '18',
	isStock: 1,
	stockNum: 88,
	isLimit: 1,
	limitNum: 2,
	unit: '斤',
	img: '/banana.png',
	specList: specs,
	skuList: [{
		id: 31,
		gid: 8,
		ids: '21',
		names: '500g',
		price: '12.50',
		price2: '18',
		num: '6',
		img: '/sku.png'
	}]
})
assert.deepEqual(editGoodsPayload.addSpecList, [{
	specId: 11,
	name: '重量',
	price: 0,
	stock: 0,
	specValLists: [{ valId: 21, sid: 11, val: '500g' }]
}])
assert.deepEqual(editGoodsPayload.skuList, [{
	id: 31,
	gid: 8,
	ids: '21',
	names: '500g',
	price: 12.5,
	price2: 18,
	num: 6,
	img: '/sku.png'
}])

assert.deepEqual(buildSpecUpdatePayload(8, specs), {
	gid: 8,
	lists: [{
		id: 11,
		gid: 8,
		name: '重量',
		price: 0,
		stock: 0,
		lists: [{ id: 21, sid: 11, gid: 8, val: '500g' }]
	}]
})

assert.deepEqual(buildGoodsAddSpecList(specs), [{
	specId: 0,
	name: '重量',
	price: 0,
	stock: 0,
	specValLists: [{ valId: 0, sid: 0, val: '500g' }]
}])

assert.deepEqual(cloneSpecAsDraft(specs[0]), {
	id: 0,
	name: '重量',
	price: 0,
	stock: 0,
	vals: [{ id: 0, sid: 0, val: '500g' }]
})

assert.deepEqual(buildCommonSpecUpdatePayload(specs), {
	gid: 0,
	lists: [{
		id: 11,
		gid: 0,
		name: '重量',
		price: 0,
		stock: 0,
		lists: [{ id: 21, sid: 11, gid: 0, val: '500g' }]
	}]
})

assert.deepEqual(normalizeLeaderSkuList([
	{
		id: 31,
		gid: 8,
		ids: '21,32',
		names: '500g,原味',
		price: 12.5,
		price2: 18,
		num: 6,
		img: '/sku.png',
		isClose: 1
	}
]), [{
	id: 31,
	gid: 8,
	ids: '21,32',
	names: '500g,原味',
	key: '500g/原味',
	price: 12.5,
	price2: 18,
	num: 6,
	img: '/sku.png',
	isClose: 1
}])

assert.deepEqual(buildLeaderSkuSavePayload([
	{
		id: 31,
		gid: 8,
		ids: '21,32',
		names: '500g,原味',
		price: '12.509',
		price2: '18.999',
		num: '6',
		img: '/sku.png',
		isClose: 1
	}
]), [{
	id: 31,
	gid: 8,
	ids: '21,32',
	names: '500g,原味',
	price: 12.5,
	price2: 18.99,
	num: 6,
	img: '/sku.png'
}])

const twoDimensionSpecs = normalizeLeaderSpecList([
	{ specId: 11, specName: '尺码', valList: [{ valId: 21, valName: 'S' }, { valId: 22, valName: 'M' }] },
	{ specId: 12, specName: '重量', valList: [{ valId: 31, valName: '500g' }, { valId: 32, valName: '1kg' }] }
])
assert.deepEqual(buildLocalSkuDraftList({
	specs: twoDimensionSpecs,
	goodsId: 8,
	existingSkus: [{ gid: 8, ids: '21,31', names: 'S,500g', price: 9.9, price2: 12, num: 3, img: '/s.png' }]
}).map(item => ({ key: item.key, ids: item.ids, names: item.names, price: item.price, num: item.num, img: item.img })), [
	{ key: 'S/500g', ids: '21,31', names: 'S,500g', price: 9.9, num: 3, img: '/s.png' },
	{ key: 'S/1kg', ids: '21,32', names: 'S,1kg', price: '', num: '', img: '' },
	{ key: 'M/500g', ids: '22,31', names: 'M,500g', price: '', num: '', img: '' },
	{ key: 'M/1kg', ids: '22,32', names: 'M,1kg', price: '', num: '', img: '' }
])

const draftWithoutIds = buildLocalSkuDraftList({
	specs: normalizeLeaderSpecList([
		{ specName: '尺码', valList: [{ valName: 'S' }] },
		{ specName: '重量', valList: [{ valName: '500g' }] }
	]),
	goodsId: 0,
	existingSkus: [{ key: 'S/500g', names: 'S,500g', price: '9.9', price2: '12', num: '3', img: '/draft.png' }]
})
assert.deepEqual(normalizeLeaderSkuDraftList(draftWithoutIds), [{
	id: 0,
	gid: 0,
	ids: '',
	names: 'S,500g',
	key: 'S/500g',
	price: 9.9,
	price2: 12,
	num: 3,
	img: '/draft.png',
	isClose: 0
}])
assert.deepEqual(buildSkuListWithServerIds({
	draftSkus: draftWithoutIds,
	serverSkus: [{ id: 41, gid: 8, ids: '21,31', names: 'S,500g' }]
}), [{
	id: 41,
	gid: 8,
	ids: '21,31',
	names: 'S,500g',
	price: 9.9,
	price2: 12,
	num: 3,
	img: '/draft.png'
}])

assert.deepEqual(buildGroupGoodsReference(rawGoods), {
	gid: 8,
	gname: '香蕉',
	gtype: 2,
	img: '/banana.png',
	price: 12.5,
	price2: 18,
	stock: '88斤'
})

assert.equal(extractCreatedGoodsId({ data: 18 }), 18)
assert.equal(extractCreatedGoodsId({ data: '19' }), 19)
assert.equal(extractCreatedGoodsId({ data: { goodsId: 20 } }), 20)
assert.equal(extractCreatedGoodsId({ data: { id: 21 } }), 21)
assert.equal(extractCreatedGoodsId({ data: null }), 0)

assert.deepEqual(buildPagedGoodsState({
	currentList: [{ id: 1 }],
	incomingList: [{ id: 2 }],
	page: 1,
	pageSize: 10,
	total: 25
}), {
	list: [{ id: 2 }],
	pageTotal: 3,
	hasMore: true
})

assert.deepEqual(buildPagedGoodsState({
	currentList: [{ id: 1 }],
	incomingList: [{ id: 2 }],
	page: 2,
	pageSize: 10,
	total: 12
}), {
	list: [{ id: 1 }, { id: 2 }],
	pageTotal: 2,
	hasMore: false
})

const addPageSource = fs.readFileSync(new URL('../pagesA/goods/add.vue', import.meta.url), 'utf8')
assert.equal(addPageSource.includes('保存后设置规格'), false)
assert.equal(addPageSource.includes('/static/image/nav-back.png'), true)
assert.equal(addPageSource.includes('name-title-row'), true)
assert.equal(addPageSource.includes('请选择商品规格'), false)
assert.equal(addPageSource.includes('请完成规格设置'), true)
assert.equal(addPageSource.includes('acceptGoodsSpecs'), true)
assert.equal(addPageSource.includes('initGoodsSpecs'), true)
assert.equal(addPageSource.includes('formatSpecSummary'), true)
assert.equal(addPageSource.includes('specSource'), true)
assert.equal(addPageSource.includes('acceptGoodsSkus'), false)
assert.equal(addPageSource.includes('skuList'), true)
assert.equal(addPageSource.includes('prepareSkuListAfterSpecSave'), true)
assert.equal(addPageSource.includes('getLeaderGoodsSkuSpecList'), true)
assert.equal(addPageSource.includes("onPriceInput('price'"), true)
assert.equal(addPageSource.includes("onPriceInput('price2'"), true)
assert.equal(addPageSource.includes('limitPricePrecision'), true)
assert.equal(addPageSource.includes('returnToGroup'), true)
assert.equal(addPageSource.includes('fromGroup'), true)
assert.equal(addPageSource.includes('emitGroupGoodsAfterSave'), true)
assert.equal(addPageSource.includes('acceptGroupGoods'), true)
assert.equal(addPageSource.includes("const url = this.returnToGroup ? '/pagesA/group/index' : '/pagesA/goods/index'"), true)

const groupAddSource = fs.readFileSync(new URL('../pagesA/group/add.vue', import.meta.url), 'utf8')
assert.equal(groupAddSource.includes('openCreateGoods'), true)
assert.equal(groupAddSource.includes('/pagesA/goods/add?fromGroup=1'), true)
assert.equal(groupAddSource.includes('acceptGroupGoods'), true)
assert.equal(groupAddSource.includes('appendGroupGoods'), true)
assert.equal(groupAddSource.includes('<view class="add-goods-outline" @click="openCreateGoods">添加商品</view>'), true)
assert.equal(groupAddSource.includes("uni.navigateTo({ url: url }).catch"), false)
assert.equal(groupAddSource.includes("uni.navigateBack({"), true)

const specPageSource = fs.readFileSync(new URL('../pagesA/goods/specNew.vue', import.meta.url), 'utf8')
assert.equal(specPageSource.includes('管理常用规格'), true)
assert.equal(specPageSource.includes('添加常用规格'), true)
assert.equal(specPageSource.includes('规格设置'), true)
assert.equal(specPageSource.includes('多规格设置'), true)
assert.equal(specPageSource.includes('acceptGoodsSpecs'), true)
assert.equal(specPageSource.includes('skuList'), true)
assert.equal(specPageSource.includes('specSource'), true)
assert.equal(specPageSource.includes('syncSpecStructure'), true)
assert.equal(specPageSource.includes('buildLocalSkuDraftList'), true)
assert.equal(specPageSource.includes("onSkuPriceInput(index, 'price'"), true)
assert.equal(specPageSource.includes("onSkuPriceInput(index, 'price2'"), true)
assert.equal(specPageSource.includes('limitPricePrecision'), true)
assert.equal(specPageSource.includes('buildCommonSpecUpdatePayload'), false)
assert.equal(specPageSource.includes('saveLeaderGoodsSpecList'), false)

const packPageSource = fs.readFileSync(new URL('../pagesA/goods/pack.vue', import.meta.url), 'utf8')
assert.equal(packPageSource.includes('type="digit" class="form-input" v-model="item.price"'), true)
assert.equal(packPageSource.includes('onPackPriceInput(index, $event)'), true)
assert.equal(packPageSource.includes('limitPricePrecision'), true)

const packNewPageSource = fs.readFileSync(new URL('../pagesA/goods/packNew.vue', import.meta.url), 'utf8')
assert.equal(packNewPageSource.includes('type="digit" class="form-input" v-model="item.price"'), true)
assert.equal(packNewPageSource.includes('onPackPriceInput(index, $event)'), true)
assert.equal(packNewPageSource.includes('price: limitPricePrecision(item.price)'), true)

const addPackPageSource = fs.readFileSync(new URL('../pagesA/goods/addPack.vue', import.meta.url), 'utf8')
assert.equal(addPackPageSource.includes('type="digit" class="form-input" v-model="formData.price"'), true)
assert.equal(addPackPageSource.includes('@input="onPriceInput"'), true)
assert.equal(addPackPageSource.includes('this.formData.price = limitPricePrecision(this.formData.price)'), true)

const leaderApiSource = fs.readFileSync(new URL('../api/leader.js', import.meta.url), 'utf8')
assert.equal(leaderApiSource.includes("url: '/leader/goods/spec/edit'"), false)
assert.equal(leaderApiSource.includes("url: '/leader/goods/spec/close'"), false)
assert.equal(leaderApiSource.includes("url: '/leader/goods/val/close'"), false)
assert.equal(leaderApiSource.includes("url: '/goods/leader/goods/spec/update'"), false)
assert.equal(leaderApiSource.includes("url: '/goods/leader/goods/spec/remove'"), false)
assert.equal(leaderApiSource.includes("url: '/goods/leader/goods/specVal/remove'"), false)
assert.equal(leaderApiSource.includes("url: '/goods/leader/goods/sku/save'"), false)
assert.equal(leaderApiSource.includes("url: '/leader/goods/sku/list'"), false)

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
assert.equal(pagePaths.includes('goods/specNew'), true)
assert.equal(pagePaths.includes('goods/sku'), false)
assert.equal(pagePaths.includes('goods/spec'), false)
assert.equal(pagePaths.includes('goods/pack'), false)
assert.equal(pagePaths.includes('goods/packNew'), false)

// ===== 商品库「已下线」标识 =====
// 接口字段 isClose 非 0 即下线（「删除」走的也是这个字段）
assert.equal(isLeaderGoodsClosed({ isClose: 0 }), false)
assert.equal(isLeaderGoodsClosed({ isClose: 1 }), true)
assert.equal(isLeaderGoodsClosed({ isClose: '1' }), true)
assert.equal(isLeaderGoodsClosed({ isClose: 2 }), true)
assert.equal(isLeaderGoodsClosed({}), false)
assert.equal(getLeaderGoodsStatusText({ isClose: 1 }), '已下线')
assert.equal(getLeaderGoodsStatusText({ isClose: 0 }), '')
assert.equal(getLeaderGoodsStatusText({}), '')
// normalizeLeaderGoods 必须保留 isClose，否则列表拿不到状态
assert.equal(normalizeLeaderGoods({ id: 1, goodsName: 'x', isClose: 1 }).isClose, 1)

const goodsLibrarySource = fs.readFileSync(new URL('../pagesA/goods/index.vue', import.meta.url), 'utf8')
// 名称旁展示「已下线」标识
assert.equal(goodsLibrarySource.includes('<text v-if="goodsStatusText(item)" class="product-status">{{ goodsStatusText(item) }}</text>'), true)
assert.equal(goodsLibrarySource.includes('return getLeaderGoodsStatusText(item)'), true)
assert.equal(goodsLibrarySource.includes('.product-status {'), true)
assert.equal(goodsLibrarySource.includes('color: #999;'), true)
// 已下线的商品按钮变「恢复」：接口是「启用/关闭」切换语义，
// 否则再点一次「删除」会把它切回上线
assert.equal(goodsLibrarySource.includes('<button v-if="isGoodsClosed(item)" size="mini" @click="restoreProduct(item)">恢复</button>'), true)
assert.equal(goodsLibrarySource.includes('restoreProduct(item) {'), true)
assert.equal(goodsLibrarySource.includes('return isLeaderGoodsClosed(item)'), true)

// ===== 添加/修改商品页：规格优先 + 规格值带入 价格/库存/单位 =====
// 单位取「规格值自带的单位」：只有数字开头的规格值才算（500g → g、2斤 → 斤）
assert.equal(extractUnitFromSpecValue('500g'), 'g')
assert.equal(extractUnitFromSpecValue('1kg'), 'kg')
assert.equal(extractUnitFromSpecValue('2斤'), '斤')
assert.equal(extractUnitFromSpecValue('1.5L'), 'L')
assert.equal(extractUnitFromSpecValue('500 g'), 'g')
// 纯文字 / 纯数字规格值取不到单位 → 不带入，仍由用户自己填
assert.equal(extractUnitFromSpecValue('S'), '')
assert.equal(extractUnitFromSpecValue('红色'), '')
assert.equal(extractUnitFromSpecValue('34'), '')
assert.equal(extractUnitFromSpecValue(''), '')

// 价格取所有规格里的最低价；库存取所有规格库存合计；单位取规格值自带的单位
assert.deepEqual(deriveGoodsFieldsFromSkuList([
	{ names: 'S', price: 12.5, num: 3 },
	{ names: 'M', price: 9.9, num: 5 },
	{ names: 'L', price: 15, num: 2 }
], [{ name: '重量', vals: [{ val: '500g' }, { val: '1kg' }] }]), { price: '9.9', stockNum: '10', unit: 'g' })
// 规格值里没有单位（尺码 S/M/L）→ 单位留空，不覆盖用户填写的单位
assert.deepEqual(deriveGoodsFieldsFromSkuList([{ names: 'S', price: 5, num: 1 }], [{ name: '尺码', vals: [{ val: 'S' }, { val: 'M' }] }]),
	{ price: '5', stockNum: '1', unit: '' })
// 多规格时跳过取不到单位的规格（颜色前面、重量后面 → 取重量的单位）
assert.equal(deriveGoodsFieldsFromSkuList([{ price: 1, num: 1 }], [
	{ name: '颜色', vals: [{ val: '红色' }] },
	{ name: '重量', vals: [{ val: '2斤' }] }
]).unit, '斤')
// 库存字段名为 stock 时同样统计；0 库存不计入（合计为 0 时留空，由用户手填）
assert.deepEqual(deriveGoodsFieldsFromSkuList([{ price: 2, stock: 4 }], []), { price: '2', stockNum: '4', unit: '' })
assert.deepEqual(deriveGoodsFieldsFromSkuList([{ price: 1, num: 0 }], []), { price: '1', stockNum: '', unit: '' })
// 没有规格 / 没有 SKU 时不带入（页面仍要求手填）
assert.deepEqual(deriveGoodsFieldsFromSkuList([], []), { price: '', stockNum: '', unit: '' })
assert.deepEqual(deriveGoodsFieldsFromSkuList(null, null), { price: '', stockNum: '', unit: '' })

const goodsAddSource = fs.readFileSync(new URL('../pagesA/goods/add.vue', import.meta.url), 'utf8')
// 商品规格必须排在商品价格之前（优先设置规格）
assert.equal(goodsAddSource.indexOf('<text class="label">商品规格</text>') < goodsAddSource.indexOf('<text class="label required">商品价格</text>'), true)
// 规格保存回传后带入三字段
assert.equal(goodsAddSource.includes('applySpecDerivedFields()'), true)
assert.equal(goodsAddSource.includes('deriveGoodsFieldsFromSkuList(this.formData.skuList, this.formData.specList)'), true)
assert.equal(goodsAddSource.includes('this.formData.price = derived.price'), true)
assert.equal(goodsAddSource.includes('this.formData.stockNum = derived.stockNum'), true)
assert.equal(goodsAddSource.includes('this.formData.unit = derived.unit'), true)
// 单位只能来自规格值/用户输入，不能用规格名写死
assert.equal(goodsAddSource.includes('firstSpec.name'), false)
// 不设置规格时必须手填价格/库存/单位
assert.equal(goodsAddSource.includes("if (!this.hasValidSpecs && !String(this.formData.stockNum || '').trim()) {"), true)
// 保存前再兜一次：有多规格时库存一律取所有规格库存之和
assert.equal(goodsAddSource.includes('const specStock = deriveGoodsFieldsFromSkuList(this.formData.skuList, this.formData.specList).stockNum'), true)
assert.equal(goodsAddSource.includes('if (specStock) this.formData.stockNum = specStock'), true)
assert.equal(goodsAddSource.includes("uni.showToast({ title: '请输入商品库存', icon: 'none' })"), true)

console.log('leaderProduct tests passed')
