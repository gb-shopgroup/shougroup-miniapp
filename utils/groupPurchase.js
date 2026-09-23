export function buildGroupListParams({ leaderId = 0, catId = 0, page = 1, pageSize = 10 } = {}) {
	return {
		leaderId: leaderId || 0,
		catId: catId > 0 ? catId : 0,
		page,
		pageSize
	}
}

export function buildGroupCountParams({ leaderId = 0, catId = 0 } = {}) {
	return {
		leaderId: leaderId || 0,
		catId: catId > 0 ? catId : 0
	}
}

export function normalizeSpecList(list) {
	if (!Array.isArray(list)) return []
	return list.map(spec => {
		const vals = spec.valList || spec.vals || spec.lists || []
		return {
			specId: spec.specId || spec.id,
			specName: spec.specName || spec.name,
			valList: Array.isArray(vals) ? vals.map(item => ({
				valId: item.valId || item.id,
				valName: item.valName || item.val
			})).filter(item => item.valId && item.valName) : []
		}
	}).filter(item => item.specId && item.specName && item.valList.length > 0)
}

export function normalizeGroupSkuList(list) {
	if (!Array.isArray(list)) return []
	return list.map(item => {
		const stock = Number(item.stock !== undefined ? item.stock : (item.num || 0))
		return {
			id: item.id || 0,
			ids: item.ids || item.skuids || '',
			names: item.names || item.skunames || '',
			price: Number(item.price || 0),
			price2: Number(item.price2 || 0),
			stock,
			num: stock,
			img: item.img || '',
			isClose: Number(item.isClose || 0)
		}
	}).filter(item => item.ids)
}

export function normalizeSkuIds(ids) {
	return String(ids || '').split(',').map(item => item.trim()).filter(Boolean).sort().join(',')
}

export function normalizeSkuNames(names) {
	return String(names || '').split(/[,，/]/).map(item => item.trim()).filter(Boolean).sort().join(',')
}

function splitSkuPart(value = '') {
	return String(value || '').split(/[，,\/]/).map(item => item.trim()).filter(Boolean)
}

export function inferSpecListFromSkuList(list = []) {
	const skuList = normalizeGroupSkuList(list)
	const dimensions = []
	skuList.forEach(sku => {
		const ids = splitSkuPart(sku.ids)
		const names = splitSkuPart(sku.names)
		names.forEach((name, index) => {
			if (!dimensions[index]) dimensions[index] = []
			if (dimensions[index].some(item => item.valName === name)) return
			const numericId = Number(ids[index] || 0)
			dimensions[index].push({
				valId: numericId > 0 ? numericId : `sku-val-${index + 1}-${name}`,
				valName: name
			})
		})
	})
	return dimensions.map((valList, index) => ({
		specId: `sku-spec-${index + 1}`,
		specName: dimensions.length === 1 ? '规格' : `规格${index + 1}`,
		valList
	})).filter(spec => spec.valList.length > 0)
}

export function findSkuBySelectedSpec(skus = [], selectedSpecValMap = {}, selectedSpecValNamesMap = {}) {
	const selectedIds = normalizeSkuIds(Object.keys(selectedSpecValMap).map(key => selectedSpecValMap[key]).join(','))
	if (!selectedIds) return null
	const skuByIds = skus.find(item => normalizeSkuIds(item.ids) === selectedIds)
	if (skuByIds) return skuByIds

	const selectedNames = normalizeSkuNames(
		Object.keys(selectedSpecValMap).map(key => selectedSpecValNamesMap[selectedSpecValMap[key]]).join(',')
	)
	if (!selectedNames) return null
	return skus.find(item => normalizeSkuNames(item.names) === selectedNames) || null
}

export function normalizeGroupGoods(item = {}) {
	const isStock = item.isStock !== undefined ? item.isStock : (item.stock !== undefined ? item.stock : 0)
	const balance = Number(item.num !== undefined ? item.num : (item.stockNum || item.balance || 0))
	const skus = normalizeGroupSkuList(item.skus || item.skuList)
	const specs = normalizeSpecList(item.specs || item.specList || item.addSpecList)
	return {
		id: Number(item.id || item.gid || item.goodsId || 0),
		name: item.name || item.gname || item.goodsName || '',
		img: item.img || item.goodsImg || '',
		price: Number(item.price || 0),
		price2: Number(item.price2 || 0),
		type: Number(item.type || item.gtype || 0),
		isStock,
		balance,
		unit: item.unit || '',
		limit: item.limit || item.isLimit || 0,
		quantity: item.quantity || item.limitNum || 0,
		specs: specs.length > 0 ? specs : inferSpecListFromSkuList(skus),
		skus
	}
}

export function normalizeGroupGoodsList(list) {
	return Array.isArray(list)
		? list.map(item => normalizeGroupGoods(item)).filter(item => item.id || item.name || item.img)
		: []
}

export function normalizeGroupPickupPoint(raw = {}) {
	return {
		id: Number(raw.pointId || raw.id || 0),
		name: raw.pointName || raw.name || '',
		address: raw.pointAddress || raw.address || '',
		img: raw.pointImg || raw.img || '',
		longitude: raw.longitude === undefined || raw.longitude === null ? raw.lon : raw.longitude,
		latitude: raw.latitude === undefined || raw.latitude === null ? raw.lat : raw.latitude,
		scope: Number(raw.pointScope || raw.scope || 0),
		info: raw.pointInfo || raw.info || '',
		person: raw.person || '',
		phone: raw.phone || '',
		isClose: Number(raw.isClose || 0)
	}
}

export function resolveSelectedPickupPointId(pointList = [], persistedPointId = 0) {
	const pointId = Number(persistedPointId || 0)
	if (pointId <= 0) return 0
	return pointList.some(point => Number(point.id || 0) === pointId) ? pointId : 0
}

export function createCartItemFromGoods(goodsInfo = {}, selection = {}) {
	const item = {
		// 该商品是否多规格：多规格商品必须有 skuId 才能下单（后端按 SKU 扣库存），
		// 购物车与下单前都用它做校验，避免带着 skuId=0 提交。
		hasSpecs: Array.isArray(goodsInfo.specs) && goodsInfo.specs.length > 0,
		id: goodsInfo.id,
		name: goodsInfo.name || '',
		img: goodsInfo.img || '',
		price: Number(goodsInfo.price || 0),
		type: goodsInfo.type || 0,
		stock: goodsInfo.isStock !== undefined ? goodsInfo.isStock : (goodsInfo.stock || 0),
		balance: Number(goodsInfo.balance || 0),
		limit: goodsInfo.limit || 0,
		quantity: goodsInfo.quantity || 0,
		unit: goodsInfo.unit || '',
		num: Number(selection.num || 1),
		packId: 0,
		packName: '',
		packNum: 0,
		skuId: selection.skuId || 0,
		skuids: selection.skuids || '',
		skunames: selection.skunames || ''
	}
	if (selection.price !== undefined) item.price = Number(selection.price || 0)
	if (selection.balance !== undefined) item.balance = Number(selection.balance || 0)
	if (selection.img) item.img = selection.img
	return item
}

// 找出「多规格但没选到 SKU」的购物车条目：下单前据此拦截，
// 否则请求体里 skuId=0、skuids 为空，后端扣减 SKU 库存会失败。
export function pickInvalidSpecCartItems(cartGoodsList = []) {
	return (Array.isArray(cartGoodsList) ? cartGoodsList : []).filter(item =>
		item && item.hasSpecs && Number(item.skuId || 0) <= 0)
}

export function mergeCartGoods(cartGoodsList = [], goods = {}) {
	const list = cartGoodsList.map(item => Object.assign({}, item))
	const index = list.findIndex(item => item.id == goods.id && (item.skuids || '') == (goods.skuids || ''))
	if (index >= 0) {
		list[index].num = Number(list[index].num || 0) + Number(goods.num || 0)
		return list
	}
	return list.concat(Object.assign({}, goods))
}

// 选规格弹窗的写入语义：弹窗步进器展示的就是购物车中该规格的数量，
// 确认时按「商品 + 规格」覆盖为 num（区别于 mergeCartGoods 的累加，避免同步后又翻倍）。
export function setCartGoodsQuantity(cartGoodsList = [], goods = {}) {
	const list = cartGoodsList.map(item => Object.assign({}, item))
	const key = getCartItemKey(goods)
	const index = list.findIndex(item => getCartItemKey(item) === key)
	if (index < 0) return list.concat(Object.assign({}, goods))
	list[index].num = Math.max(Number(goods.num || 0), 0)
	list[index].price = Number(goods.price || 0)
	list[index].balance = Number(goods.balance || 0)
	if (goods.img) list[index].img = goods.img
	return list
}

export function getCartGoodsCount(cartGoodsList = []) {
	return cartGoodsList.reduce((sum, item) => sum + Number(item.num || 0), 0)
}

export function calculateCartTotal(cartGoodsList = []) {
	const total = cartGoodsList.reduce((sum, item) => {
		return sum + (Number(item.price || 0) * Number(item.num || 0))
	}, 0)
	return total.toFixed(2)
}

export function isGoodsSoldOut(goods = {}) {
	const isStock = goods.isStock !== undefined ? goods.isStock : (goods.stock || 0)
	return Number(isStock || 0) == 1 && Number(goods.balance || 0) <= 0
}

export function getCartQuantityForGoods(cartGoodsList = [], goodsId) {
	return cartGoodsList.reduce((sum, item) => {
		if (item.id != goodsId) return sum
		return sum + Number(item.num || 0)
	}, 0)
}

export function getCartItemKey(item = {}) {
	return `${item.id}__${item.skuids || ''}`
}

export function reconcileSelectedCartKeys(cartGoodsList = [], selectedMap = {}) {
	const nextMap = {}
	cartGoodsList.forEach(item => {
		const key = getCartItemKey(item)
		nextMap[key] = selectedMap[key] !== undefined ? selectedMap[key] : true
	})
	return nextMap
}

export function getSelectedCartGoods(cartGoodsList = [], selectedMap = {}) {
	return cartGoodsList.filter(item => selectedMap[getCartItemKey(item)] === true)
}

export function updateCartGoodsQuantity(cartGoodsList = [], index, delta, options = {}) {
	const list = cartGoodsList.map(item => Object.assign({}, item))
	const item = list[index]
	if (!item) return list
	const newQty = Number(item.num || 1) + Number(delta || 0)
	if (newQty <= 0 && options.removeWhenZero) {
		list.splice(index, 1)
		return list
	}
	if (newQty > 0) {
		item.num = newQty
	}
	return list
}

export function syncCheckoutGoodsToSessionCart(cartGoodsList = [], originalCheckoutGoodsList = [], checkoutGoodsList = []) {
	const originalKeys = originalCheckoutGoodsList.map(item => getCartItemKey(item))
	const checkoutKeys = checkoutGoodsList.map(item => getCartItemKey(item))
	const retainedGoods = cartGoodsList.filter(item => !originalKeys.includes(getCartItemKey(item)))
	const updatedCheckoutGoods = checkoutGoodsList
		.filter(item => checkoutKeys.includes(getCartItemKey(item)) && Number(item.num || 0) > 0)
		.map(item => Object.assign({}, item))
	return retainedGoods.concat(updatedCheckoutGoods)
}

export function getMiniProgramPayAction(envVersion) {
	if (['develop', 'trial', 'release'].includes(envVersion)) return 'requestPayment'
	return 'redirectDetail'
}

export function removeSelectedCartGoods(cartGoodsList = [], selectedGoodsList = []) {
	return cartGoodsList.filter(item => {
		return !selectedGoodsList.some(selected => {
			return selected.id == item.id && (selected.skuids || '') == (item.skuids || '')
		})
	})
}

// 仅在订单号匹配本次结算时清空购物车，避免续付旧订单时误删用户后来加入的新购物车。
export function clearPaidCheckoutSessionState(state = {}, orderNo = '') {
	const checkoutOrderNo = String(state.sessionCheckoutOrderNo || '')
	if (!checkoutOrderNo || checkoutOrderNo !== String(orderNo || '')) return state
	return Object.assign({}, state, {
		sessionCartGoodsList: [],
		sessionCheckoutGoodsList: [],
		sessionCartContext: {},
		sessionCheckoutOrderNo: '',
		sessionCartVersion: Number(state.sessionCartVersion || 0) + 1
	})
}

export function buildOrderGoodsPayload(cartGoodsList = []) {
	return cartGoodsList.filter(item => Number(item.num || 0) > 0).map(item => ({
		id: item.id,
		num: Number(item.num || 0),
		packId: 0,
		packName: '',
		packNum: 0,
		skuId: item.skuId || 0,
		skuids: item.skuids || '',
		skunames: item.skunames || ''
	}))
}

export function buildOrderPayload({ groupId, pointId, name = '', mobile = '', remark = '', cartGoodsList = [] } = {}) {
	return {
		groupId,
		pointId,
		name,
		mobile,
		remark,
		goods: buildOrderGoodsPayload(cartGoodsList)
	}
}

export function normalizeCreatedOrderNo(value) {
	if (typeof value === 'string') return value.trim()
	if (typeof value === 'number') return ''
	if (!value || typeof value !== 'object') return ''
	return normalizeCreatedOrderNo(value.orderNo || value.orderSn || value.pcode || value.orderCode || value.no || value.data || '')
}

export function isLikelyOrderId(value) {
	return /^[1-9]\d*$/.test(String(value || ''))
}
