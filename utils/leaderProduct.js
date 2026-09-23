export function limitPricePrecision(value) {
	const text = String(value === undefined || value === null ? '' : value)
		.replace(/[^\d.]/g, '')
		.replace(/^\./, '0.')
	const parts = text.split('.')
	const integer = parts[0] || ''
	if (parts.length === 1) return integer
	return `${integer}.${parts.slice(1).join('').slice(0, 2)}`
}

export function toPriceNumber(value) {
	return Number(limitPricePrecision(value) || 0)
}

export function normalizeLeaderSpecList(list) {
	if (!Array.isArray(list)) return []
	return list.map(spec => {
		const specId = spec.id || spec.specId || 0
		const vals = spec.vals || spec.valList || spec.specValLists || spec.lists || []
		return {
			id: specId,
			name: spec.name || spec.specName || '',
			price: toPriceNumber(spec.price),
			stock: Number(spec.stock || 0),
			vals: Array.isArray(vals) ? vals.map(item => ({
				id: item.id || item.valId || 0,
				sid: item.sid || specId,
				val: item.val || item.valName || ''
			})).filter(item => item.val) : []
		}
	}).filter(item => item.name)
}

// 商品是否已下线：接口字段 isClose，非 0 即下线（「删除」走的也是这个字段）。
export function isLeaderGoodsClosed(goods = {}) {
	return Number(goods.isClose || 0) !== 0
}

// 商品状态标识文案。注意与团购活动区分：活动用「已关闭」，商品库用「已下线」。
export function getLeaderGoodsStatusText(goods = {}) {
	return isLeaderGoodsClosed(goods) ? '已下线' : ''
}

export function normalizeLeaderGoods(row = {}) {
	const goods = row.goods && typeof row.goods === 'object' ? row.goods : row
	const skuList = row.goods && typeof row.goods === 'object' ? row.skuList : (row.skuList || [])
	const normalizedSkuList = normalizeLeaderSkuList(skuList)
	const normalizedSpecs = normalizeLeaderSpecList(goods.specs || goods.specList || goods.addSpecList || [])
	const inferredSpecs = normalizedSpecs.length === 0 && normalizedSkuList.length > 0 ? inferSpecListFromSkuList(normalizedSkuList) : []
	return {
		id: goods.id || 0,
		catId: goods.catId || goods.cat || 0,
		type: Number(goods.type || 2),
		name: goods.name || '',
		img: goods.img || '',
		img2: goods.img2 || '',
		img3: goods.img3 || '',
		costPrice: Number(goods.costPrice || 0),
		goodsInfo: goods.goodsInfo || goods.info || '',
		price: toPriceNumber(goods.price !== undefined ? goods.price : (goods.salePrice || 0)),
		price2: toPriceNumber(goods.price2 !== undefined ? goods.price2 : (goods.marketPrice || 0)),
		isStock: Number(goods.isStock || 0),
		stockNum: Number(goods.stockNum !== undefined ? goods.stockNum : (goods.num || 0)),
		isLimit: Number(goods.isLimit || 0),
		limitNum: Number(goods.limitNum !== undefined ? goods.limitNum : (goods.num2 || 0)),
		unit: goods.unit || '',
		isClose: Number(goods.isClose || 0),
		isCheck: Number(goods.isCheck || 0),
		checkRemark: goods.checkRemark || '',
		specs: normalizedSpecs.length > 0 ? normalizedSpecs : inferredSpecs,
		specSource: normalizedSpecs.length > 0 ? 'goods' : (inferredSpecs.length > 0 ? 'sku' : 'goods'),
		skuList: normalizedSkuList
	}
}

export function formatSpecSummary(specs = []) {
	if (!Array.isArray(specs) || specs.length === 0) return '规格：未设置'
	return specs.map(spec => {
		const values = Array.isArray(spec.vals) ? spec.vals.map(item => item.val).filter(Boolean).join('，') : ''
		return values ? `${spec.name}：${values}` : `${spec.name}：未设置`
	}).join('；')
}

export function formatStockSummary(goods = {}) {
	if (Number(goods.isStock || 0) !== 1) return '库存：不限'
	return `库存：${Number(goods.stockNum || 0)}${goods.unit || ''}`
}

export function buildPagedGoodsState({ currentList = [], incomingList = [], page = 1, pageSize = 10, total = 0 } = {}) {
	const pageTotal = Math.ceil(Number(total || 0) / Number(pageSize || 10))
	const list = Number(page || 1) <= 1 ? incomingList : currentList.concat(incomingList)
	return {
		list,
		pageTotal,
		hasMore: Number(page || 1) < pageTotal
	}
}

export function normalizeGoodsForm(row = {}) {
	return normalizeLeaderGoods(row)
}

export function cloneSpecAsDraft(spec = {}) {
	return {
		id: 0,
		name: spec.name || '',
		price: toPriceNumber(spec.price),
		stock: Number(spec.stock || 0),
		vals: Array.isArray(spec.vals) ? spec.vals.map(item => ({
			id: 0,
			sid: 0,
			val: item.val || ''
		})).filter(item => item.val) : []
	}
}

export function buildGoodsAddSpecList(specs = [], options = {}) {
	if (!Array.isArray(specs)) return []
	const preserveIds = options.preserveIds === true
	return specs.map(spec => {
		const draft = cloneSpecAsDraft(spec)
		const vals = preserveIds && Array.isArray(spec.vals) ? spec.vals : draft.vals
		return {
			specId: preserveIds ? (spec.id || 0) : 0,
			name: draft.name,
			price: toPriceNumber(spec.price),
			stock: Number(spec.stock || 0),
			specValLists: vals.map(val => ({
				valId: preserveIds ? (val.id || 0) : 0,
				sid: preserveIds ? (val.sid || spec.id || 0) : 0,
				val: val.val
			}))
		}
	}).filter(spec => spec.name && spec.specValLists.length > 0)
}

// 从单个规格值里取「自带的单位」：只有形如 `500g` / `1kg` / `2斤` / `1.5L`
// （数字开头 + 单位后缀）才算，纯文字值（`S`、`红色`、`34`）取不到单位。
export function extractUnitFromSpecValue(value = '') {
	const text = String(value === undefined || value === null ? '' : value).trim()
	const match = text.match(/^\d+(?:\.\d+)?\s*([a-zA-Z\u4e00-\u9fa5]+)$/)
	return match ? match[1] : ''
}

// 规格值自带的单位：按规格、规格值顺序找第一个能取到单位的（如 重量: 500g/1kg → g）。
// 取不到就返回空字符串——此时页面不覆盖用户已填的单位，仍由用户自己填。
export function extractUnitFromSpecValues(specList = []) {
	const specs = Array.isArray(specList) ? specList : []
	for (let i = 0; i < specs.length; i += 1) {
		const vals = Array.isArray(specs[i] && specs[i].vals) ? specs[i].vals : []
		for (let j = 0; j < vals.length; j += 1) {
			const unit = extractUnitFromSpecValue(vals[j] && vals[j].val)
			if (unit) return unit
		}
	}
	return ''
}

// 规格设置完成后的「带入」规则（添加/修改商品页用）：
//   价格 = 所有规格里的最低价（多个价格取最低，只统计 >0 的）
//   库存 = 所有规格库存合计（写入 stockNum）
//   单位 = 规格值自带的单位（如 500g → g）；取不到则留空，不覆盖用户填写的单位
export function deriveGoodsFieldsFromSkuList(skuList = [], specList = []) {
	const skus = Array.isArray(skuList) ? skuList : []
	const prices = skus
		.map(item => Number(item && item.price || 0))
		.filter(price => price > 0)
	const stockTotal = skus.reduce((total, item) => {
		const num = Number((item && (item.num === '' || item.num === undefined ? item.stock : item.num)) || 0)
		return total + Math.max(num, 0)
	}, 0)
	return {
		price: prices.length > 0 ? limitPricePrecision(String(Math.min(...prices))) : '',
		stockNum: stockTotal > 0 ? String(stockTotal) : '',
		unit: extractUnitFromSpecValues(specList)
	}
}

export function buildGoodsSubmitPayload(form = {}, options = {}) {
	const payload = {
		id: form.id || 0,
		catId: form.catId || 0,
		type: Number(form.type || 2),
		name: form.name || '',
		costPrice: Number(form.costPrice || 0),
		goodsInfo: form.goodsInfo || '',
		isStock: Number(form.isStock || 0),
		stockNum: Number(form.isStock || 0) === 1 ? Number(form.stockNum || 0) : 0,
		isLimit: Number(form.isLimit || 0),
		limitNum: Number(form.isLimit || 0) === 1 ? Number(form.limitNum || 0) : 0,
		unit: form.unit || '',
		img: form.img || '',
		img2: form.img2 || '',
		img3: form.img3 || ''
	}
	if (payload.id > 0) {
		payload.price = toPriceNumber(form.price)
		payload.price2 = toPriceNumber(form.price2)
	} else {
		payload.salePrice = toPriceNumber(form.price)
		payload.marketPrice = toPriceNumber(form.price2)
	}
	if (form.specSource !== 'sku') {
		const addSpecList = buildGoodsAddSpecList(form.specList, { preserveIds: payload.id > 0 })
		if (addSpecList.length > 0) payload.addSpecList = addSpecList
	}
	if (options.includeSku !== false) {
		const skuList = buildLeaderSkuSavePayload(form.skuList || [])
		if (skuList.length > 0) payload.skuList = skuList
	}
	return payload
}

export function extractCreatedGoodsId(res = {}) {
	const data = res.data
	if (typeof data === 'number' || typeof data === 'string') return Number(data || 0)
	if (data && typeof data === 'object') return Number(data.id || data.goodsId || 0)
	return 0
}

export function buildSpecUpdatePayload(goodsId, specs = []) {
	return {
		gid: goodsId,
		lists: specs.map(spec => ({
			id: spec.id || 0,
			gid: goodsId,
			name: spec.name || '',
			price: toPriceNumber(spec.price),
			stock: Number(spec.stock || 0),
			lists: Array.isArray(spec.vals) ? spec.vals.map(val => ({
				id: val.id || 0,
				sid: val.sid || spec.id || 0,
				gid: goodsId,
				val: val.val || ''
			})).filter(val => val.val) : []
		})).filter(spec => spec.name && spec.lists.length > 0)
	}
}

export function buildCommonSpecUpdatePayload(specs = []) {
	return buildSpecUpdatePayload(0, specs)
}

function normalizeSkuNames(names = '') {
	return String(names || '').split(/[，,\/]/).map(item => item.trim()).filter(Boolean).join(',')
}

function skuKey(names = '') {
	return normalizeSkuNames(names).split(',').filter(Boolean).join('/')
}

function splitSkuPart(value = '') {
	return String(value || '').split(/[，,\/]/).map(item => item.trim()).filter(Boolean)
}

export function inferSpecListFromSkuList(list = []) {
	const skuList = normalizeLeaderSkuDraftList(list)
	const dimensions = []
	skuList.forEach(sku => {
		const ids = splitSkuPart(sku.ids)
		const names = splitSkuPart(sku.names)
		names.forEach((name, index) => {
			if (!dimensions[index]) dimensions[index] = []
			if (dimensions[index].some(item => item.val === name)) return
			const id = Number(ids[index] || 0)
			dimensions[index].push({
				id: Number.isNaN(id) ? 0 : id,
				sid: 0,
				val: name
			})
		})
	})
	return dimensions.map((vals, index) => ({
		id: 0,
		name: dimensions.length === 1 ? '规格' : `规格${index + 1}`,
		price: 0,
		stock: 0,
		vals
	})).filter(spec => spec.vals.length > 0)
}

export function normalizeLeaderSkuDraftList(list) {
	if (!Array.isArray(list)) return []
	return list.map(item => ({
		id: item.id || 0,
		gid: item.gid || item.goodsId || 0,
		ids: item.ids || item.skuids || '',
		names: normalizeSkuNames(item.names || item.skunames || item.key || ''),
		key: item.key || skuKey(item.names || item.skunames || ''),
		price: toPriceNumber(item.price),
		price2: toPriceNumber(item.price2),
		num: item.num === '' || item.num === undefined || item.num === null ? '' : Number(item.num !== undefined ? item.num : (item.stock || 0)),
		img: item.img || '',
		isClose: Number(item.isClose || 0)
	})).filter(item => item.names)
}

export function normalizeLeaderSkuList(list) {
	return normalizeLeaderSkuDraftList(list).filter(item => item.gid && item.ids)
}

function specCombinations(specs = []) {
	const cleanSpecs = normalizeLeaderSpecList(specs).filter(spec => Array.isArray(spec.vals) && spec.vals.length > 0)
	if (cleanSpecs.length === 0) return []
	return cleanSpecs.reduce((groups, spec) => {
		const values = spec.vals.map(val => ({
			id: val.id || 0,
			name: val.val || ''
		})).filter(val => val.name)
		if (values.length === 0) return groups
		if (groups.length === 0) return values.map(val => [val])
		const next = []
		groups.forEach(group => {
			values.forEach(val => {
				next.push(group.concat([val]))
			})
		})
		return next
	}, [])
}

export function buildLocalSkuDraftList({ specs = [], goodsId = 0, existingSkus = [] } = {}) {
	const existingMap = {}
	normalizeLeaderSkuDraftList(existingSkus).forEach(item => {
		existingMap[item.key] = item
	})
	return specCombinations(specs).map(combo => {
		const names = combo.map(item => item.name).join(',')
		const key = skuKey(names)
		const ids = combo.every(item => item.id) ? combo.map(item => item.id).join(',') : ''
		const existing = existingMap[key] || {}
		return {
			id: existing.id || 0,
			gid: existing.gid || Number(goodsId || 0),
			ids: existing.ids || ids,
			names,
			key,
			price: existing.price || '',
			price2: existing.price2 || '',
			num: existing.num === 0 ? 0 : (existing.num || ''),
			img: existing.img || '',
			isClose: Number(existing.isClose || 0)
		}
	})
}

export function buildSkuListWithServerIds({ draftSkus = [], serverSkus = [] } = {}) {
	const draftMap = {}
	normalizeLeaderSkuDraftList(draftSkus).forEach(item => {
		draftMap[item.key] = item
	})
	return normalizeLeaderSkuList(serverSkus).map(serverSku => {
		const draft = draftMap[serverSku.key] || {}
		return {
			id: serverSku.id || 0,
			gid: serverSku.gid || 0,
			ids: serverSku.ids || '',
			names: serverSku.names || '',
			price: toPriceNumber(draft.price || serverSku.price || 0),
			price2: toPriceNumber(draft.price2 || serverSku.price2 || 0),
			num: Number(draft.num === '' || draft.num === undefined ? (serverSku.num || 0) : draft.num),
			img: draft.img || serverSku.img || ''
		}
	})
}

export function buildLeaderSkuSavePayload(list = []) {
	return normalizeLeaderSkuList(list).map(item => ({
		id: item.id || 0,
		gid: item.gid || 0,
		ids: item.ids || '',
		names: item.names || '',
		price: toPriceNumber(item.price),
		price2: toPriceNumber(item.price2),
		num: Number(item.num || 0),
		img: item.img || ''
	}))
}

export function buildGroupGoodsReference(goods = {}) {
	const row = normalizeLeaderGoods(goods)
	return {
		gid: row.id,
		gname: row.name,
		gtype: row.type,
		img: row.img,
		price: row.price,
		price2: row.price2,
		stock: Number(row.isStock) === 1 ? `${row.stockNum}${row.unit || ''}` : '不限'
	}
}

export { buildLeaderGroupSubmitPayload as buildGroupSubmitPayload } from './leaderGroup.js'
