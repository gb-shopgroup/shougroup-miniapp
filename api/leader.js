import request2 from "@/utils/request2.js"

function withGroupActivityId(params = {}) {
	if (params.id && !params.groupId) {
		const data = Object.assign({}, params, { groupId: params.id })
		delete data.id
		return data
	}
	return params
}

function groupActivityQueryUrl(path, params = {}) {
	const data = withGroupActivityId(params)
	const groupId = data.groupId || ''
	return groupId ? `${path}?groupId=${encodeURIComponent(groupId)}` : path
}

function queryUrl(path, params = {}) {
	const query = Object.keys(params)
		.filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
		.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
		.join('&')
	return query ? `${path}?${query}` : path
}

function withBlackMemberId(params = {}) {
	if (params.id && !params.memberId) {
		const data = Object.assign({}, params, { memberId: params.id })
		delete data.id
		return data
	}
	return params
}

function withStaffCloseId(params = {}) {
	if (params.staffId && !params.id) {
		const data = Object.assign({}, params, { id: params.staffId })
		delete data.staffId
		return data
	}
	return params
}

function withStaffRemoveId(params = {}) {
	if (params.id && !params.staffId) {
		const data = Object.assign({}, params, { staffId: params.id })
		delete data.id
		return data
	}
	return params
}

function withLeaderGroupCat(params = {}) {
	const data = { ...params }
	if (data.cat === undefined && data.catId === undefined) {
		data.cat = 0
		data.catId = 0
		return data
	}
	if (data.cat === undefined) data.cat = data.catId
	if (data.catId === undefined) data.catId = data.cat
	return data
}

function withLeaderOrderPoint(params = {}) {
	const data = { ...params }
	if (data.groupId !== undefined && data.gid === undefined) {
		data.gid = data.groupId
		delete data.groupId
	}
	if (data.pointId !== undefined && data.pid === undefined) {
		data.pid = data.pointId
		delete data.pointId
	}
	return data
}

// /order/leader/home/show/orders 的 groupId 为必填（<=0 表示不过滤），必须原样下发。
function withLeaderHomeShowParams(params = {}) {
	const pointId = Number(params.pointId || params.pid || 0)
	return {
		groupId: Number(params.groupId || params.gid || 0),
		pointId,
		pid: pointId
	}
}

// /order/leader/home/order/goodsSummary 的 groupId 同样必填（<=0 表示不过滤）。
function withLeaderGoodsSummaryParams(params = {}) {
	const pointId = Number(params.pointId || params.pid || 0)
	const data = {
		groupId: Number(params.groupId || params.gid || 0),
		pointId,
		pid: pointId,
		keyword: params.keyword || '',
		page: Number(params.page || 1),
		pageSize: Number(params.pageSize || 10)
	}
	Object.keys(data).forEach(key => {
		if (key === 'keyword' && !data[key]) delete data[key]
	})
	return data
}

function deprecatedGoodsApi(name) {
	return Promise.reject({ msg: `${name}已从最新商品接口协议移除` })
}

// 查询团长店铺信息
export function getLeaderShopInfo() {
	return request2({
		url: '/user/leader/shop/info',
		method: 'GET'
	})
}

// 修改团长店铺信息
export function saveLeaderShopInfo(data) {
	return request2({
		url: '/user/leader/shop/save',
		method: 'POST',
		data: data
	})
}

export function updateLeaderShopQrCode(data) {
	return request2({
		url: '/user/leader/shop/update',
		method: 'POST',
		data: data
	})
}

export function makeLeaderShopQrCode(params) {
	return request2({
		url: queryUrl('/user/leader/shop/makeQrCode', params),
		method: 'POST',
		data: {}
	})
}

// 查询团长营业执照/收款账户列表
export function getLeaderBusinessList(params = {}) {
	return request2({
		url: '/user/leader/business/list',
		method: 'GET',
		data: params
	})
}

// 添加团长营业执照/收款账户信息
export function addLeaderBusinessInfo(data) {
	return request2({
		url: '/user/leader/business/add',
		method: 'POST',
		data: data
	})
}

// 修改收款账户信息
export function editLeaderBusinessInfo(data) {
	return request2({
		url: '/user/leader/business/edit',
		method: 'POST',
		data: data
	})
}

// 启用/禁用营业执照收款账户
export function closeLeaderBusinessInfo(params) {
	return request2({
		url: '/user/leader/business/close',
		method: 'POST',
		data: params
	})
}

// 团长对账单
export function getLeaderBillList(data) {
	return request2({
		url: '/order/leader/bill/list',
		method: 'POST',
		data: data
	})
}

export function getLeaderOrderBusinessList(data) {
	return getLeaderBillList(data)
}

// 提现日志列表
// export function getLeaderCashList(params) {
// 	return request2({
// 		url: '/leader/business/cash/list',
// 		method: 'GET',
// 		data: params
// 	})
// }

// 提现日志总数
// export function getLeaderCashCount(params) {
// 	return request2({
// 		url: '/leader/business/cash/count',
// 		method: 'GET',
// 		data: params
// 	})
// }

// 添加提现
// export function addLeaderCash(data) {
// 	return request2({
// 		url: '/leader/business/cash/add',
// 		method: 'POST',
// 		data: data
// 	})
// }

// 银行列表
// export function getLeaderBankList(params) {
// 	return request2({
// 		url: '/leader/business/bank',
// 		method: 'GET',
// 		data: params
// 	})
// }

// 银行卡列表
// export function getLeaderBankNoList(params) {
// 	return request2({
// 		url: '/leader/business/bankno',
// 		method: 'GET',
// 		data: params
// 	})
// }

// 查询提货点信息。最新协议要求 name Query 参数，即使查询全部也必须显式传空字符串。
export function getLeaderPointList(params = {}) {
	const name = params.name === undefined || params.name === null ? '' : String(params.name)
	return request2({
		url: `/user/leader/point/list?name=${encodeURIComponent(name)}`,
		method: 'GET'
	})
}

// 添加提货点信息
export function addLeaderPointInfo(data) {
	return request2({
		url: '/user/leader/point/add',
		method: 'POST',
		data: data
	})
}

// 修改提货点信息
export function editLeaderPointInfo(data) {
	return request2({
		url: '/user/leader/point/edit',
		method: 'POST',
		data: data
	})
}

// 关闭提货点信息
export function closeLeaderPointInfo(params) {
	return request2({
		url: '/user/leader/point/close',
		method: 'GET',
		data: params
	})
}

// 查看提货点二维码
export function getLeaderPointErCodeInfo(params) {
	return request2({
		url: '/user/leader/point/ercode',
		method: 'GET',
		data: params
	})
}

// 查询员工信息
export function getLeaderStaffList() {
	return request2({
		url: '/user/leader/staff/list',
		method: 'GET'
	})
}

// 添加员工信息
export function addLeaderStaffInfo(data) {
	return request2({
		url: '/user/leader/staff/add',
		method: 'POST',
		data: data
	})
}

// 修改员工信息
export function editLeaderStaffInfo(data) {
	return request2({
		url: '/user/leader/staff/edit',
		method: 'POST',
		data: data
	})
}

// 关闭员工信息
export function closeLeaderStaffInfo(params) {
	const data = withStaffCloseId(params)
	return request2({
		url: queryUrl('/user/leader/staff/close', data),
		method: 'POST',
		data: {}
	})
}

export function removeLeaderStaffInfo(params) {
	const data = withStaffRemoveId(params)
	return request2({
		url: queryUrl('/user/leader/staff/remove', data),
		method: 'POST',
		data: {}
	})
}

// 查询所有商品列表
export function getLeaderGoodsList(params) {
	return request2({
		url: '/goods/leader/goods/list',
		method: 'GET',
		data: params
	})
}

// 查询所有商品总数量
export function getLeaderGoodsCount(params) {
	return request2({
		url: '/goods/leader/goods/count',
		method: 'GET',
		data: params
	})
}

// 查询商品分类
export function getGoodsCategoryList() {
	return request2({
		url: '/goods/get/goods/cat',
		method: 'GET'
	})
}

// 添加商品
export function addLeaderGoodsInfo(data) {
	return request2({
		url: '/goods/leader/goods/addGoods',
		method: 'POST',
		data: data
	})
}

// 查询商品
export function getLeaderGoodsInfo(params) {
	return request2({
		url: '/goods/leader/goods/info',
		method: 'GET',
		data: params
	})
}

// 修改商品
export function editLeaderGoodsInfo(data) {
	return request2({
		url: '/goods/leader/goods/edit',
		method: 'POST',
		data: data
	})
}

// 调整商品库存
export function editLeaderGoodsStock(data) {
	return deprecatedGoodsApi('商品库存调整接口')
}

// 关闭商品
export function closeLeaderGoodsInfo(params) {
	return request2({
		url: '/goods/leader/goods/close',
		method: 'GET',
		data: params
	})
}

// 商品包装接口已不在最新商品协议内，仅保留导出避免历史页面编译失败
export function getLeaderGoodsPackageList(params) {
	return deprecatedGoodsApi('商品包装列表接口')
}

// 编辑商品所有包装（已移除）
export function updateLeaderGoodsPackageInfo(data) {
	return deprecatedGoodsApi('商品包装保存接口')
}

// 添加商品包装(已移除)
export function addLeaderGoodsPackageInfo(data) {
	return deprecatedGoodsApi('添加商品包装接口')
}

// 修改商品包装(已移除)
export function editLeaderGoodsPackageInfo(data) {
	return deprecatedGoodsApi('修改商品包装接口')
}

// 关闭商品包装(已移除)
export function closeLeaderGoodsPackageInfo(params) {
	return deprecatedGoodsApi('关闭商品包装接口')
}

// 删除商品包装(已移除)
export function removeLeaderGoodsPackageInfo(params) {
	return deprecatedGoodsApi('删除商品包装接口')
}

// 查询商品规格列表（已移除，商品详情返回 specList）
export function getLeaderGoodsSpecList(params) {
	return deprecatedGoodsApi('商品规格列表接口')
}

// 查询历史规格模板（已移除）
export function getLeaderGoodsSpecTemplateList(params) {
	return deprecatedGoodsApi('历史规格模板接口')
}

// 批量修改商品规格和规格值（已移除，随商品 addGoods/edit 一起提交）
export function saveLeaderGoodsSpecList(data) {
	return deprecatedGoodsApi('商品规格保存接口')
}

// 添加商品规格（已移除）
export function addLeaderGoodsSpecInfo(data) {
	return deprecatedGoodsApi('添加商品规格接口')
}

// 修改商品规格（已移除）
export function editLeaderGoodsSpecInfo(data) {
	return deprecatedGoodsApi('修改商品规格接口')
}

// 删除商品规格（已移除）
export function removeLeaderGoodsSpecInfo(params) {
	return deprecatedGoodsApi('删除商品规格接口')
}

// 查询商品规格值（已移除）
export function getLeaderGoodsSpecValList(params) {
	return deprecatedGoodsApi('商品规格值列表接口')
}

// 添加商品规格值（已移除）
export function addLeaderGoodsSpecValInfo(data) {
	return deprecatedGoodsApi('添加商品规格值接口')
}

// 修改商品规格值（已移除）
export function editLeaderGoodsSpecValInfo(data) {
	return deprecatedGoodsApi('修改商品规格值接口')
}

// 删除商品规格值（已移除）
export function removeLeaderGoodsSpecValInfo(params) {
	return deprecatedGoodsApi('删除商品规格值接口')
}

// 商品sku规格列表
export function getLeaderGoodsSkuSpecList(params) {
	return request2({
		url: '/goods/leader/goods/sku/spec',
		method: 'GET',
		data: params
	})
}

// 查询sku列表(作废)
export function getLeaderGoodsSkuList(params) {
	return deprecatedGoodsApi('商品SKU列表旧接口')
}

// 批量保存sku（兼容保留；前端不再单独调用，随商品 addGoods/edit 一起提交）
export function saveLeaderGoodsSkuInfo(data) {
	return deprecatedGoodsApi('商品SKU单独保存接口')
}

// 团购列表接口
export function getLeaderGroupList(params) {
	return request2({
		url: '/goods/Leader/get/groupActivity/list',
		method: 'POST',
		data: withLeaderGroupCat(params)
	})
}

// 团购总数接口
export function getLeaderGroupCount(params) {
	return request2({
		url: '/goods/Leader/get/groupActivity/count',
		method: 'GET',
		data: params
	})
}

// 团购分类接口
export function getLeaderGroupCat() {
	return request2({
		url: '/goods/Leader/get/groupActivity/cat',
		method: 'GET'
	})
}

// 团购商品列表
export function getLeaderOnlineGoodsList() {
	return request2({
		url: '/goods/leader/goods/online',
		method: 'GET'
	})
}

// 添加团购接口
export function addLeaderGroupInfo(data) {
	return request2({
		url: '/goods/Leader/groupActivity/add',
		method: 'POST',
		data: data
	})
}

// 查询团长团购活动标签列表（后台可维护：tagId / tagName / tagColor）
export function getLeaderGroupActivityTagList(options = {}) {
	return request2(Object.assign({
		url: '/goods/Leader/groupActivity/tag/list',
		method: 'GET'
	}, options))
}

// 查询团购接口
export function getLeaderGroupInfo(params) {
	return request2({
		url: '/goods/Leader/get/groupActivity/info',
		method: 'GET',
		data: withGroupActivityId(params)
	})
}

// 修改团购接口
export function editLeaderGroupInfo(data) {
	return request2({
		url: '/goods/Leader/groupActivity/edit',
		method: 'POST',
		data: data
	})
}

// 关闭团购接口
export function closeLeaderGroupInfo(params) {
	return request2({
		url: groupActivityQueryUrl('/goods/Leader/groupActivity/close', params),
		method: 'POST',
		data: {}
	})
}

// 分享团购海报接口
export function shareLeaderGroupPoster(params) {
	return request2({
		url: groupActivityQueryUrl('/goods/Leader/share/groupActivity/poster', params),
		method: 'POST',
		data: {}
	})
}

// 分享团购活动海报（带有logo的海报）
export function makeLeaderGroupPoster(params) {
	return request2({
		url: groupActivityQueryUrl('/goods/Leader/share/groupActivity/make/poster', params),
		method: 'POST',
		data: {}
	})
}

// 订单列表接口
export function getLeaderOrderList(data) {
	return request2({
		url: '/order/leader/order/list',
		method: 'POST',
		data
	})
}

export function getLeaderRefundOrderList(data) {
	return request2({
		url: '/order/leader/apply/refundList',
		method: 'POST',
		data
	})
}

// 团长端-退款申请列表（批量退款工作台用）
// 返回 LeaderRefundApplyListResponse { total, page, pageSize, list }，每条是一条退款申请记录，
// 字段口径与审核 /order/leader/refund/approve 的 refundOrderGoodsMap 对齐。
export function getLeaderRefundApplyList(data) {
	return request2({
		url: '/order/leader/refund/applyList',
		method: 'POST',
		data
	})
}

// 团长端-我的团员列表
export function getLeaderMemberList(data = {}) {
	return request2({
		url: '/order/leader/myMember/list',
		method: 'POST',
		data
	})
}

// 团长端-团员详情
export function getLeaderMemberDetail(params = {}) {
	return request2({
		url: '/order/leader/myMember/detail',
		method: 'GET',
		data: params
	})
}

export function getLeaderOrderCount(params) {
	return request2({
		url: '/order/leader/order/count',
		method: 'GET',
		data: withLeaderOrderPoint(params)
	})
}

export function getLeaderOrderStatusCount(params) {
	return request2({
		url: '/order/leader/order/status',
		method: 'GET',
		data: withLeaderOrderPoint(params)
	})
}

export function scanLeaderOrderQRCode(data) {
	return request2({
		url: '/order/leader/order/scanQRCode',
		method: 'POST',
		data
	})
}

export function getLeaderOrderInfo(params) {
	return request2({
		url: '/order/leader/order/query',
		method: 'GET',
		data: params
	})
}

export function writeOffLeaderOrder(params, options = {}) {
	const data = withLeaderOrderPoint(params)
	return request2(Object.assign({
		url: queryUrl('/order/leader/order/writeOff', data),
		method: 'POST',
		data: {}
	}, options))
}

export function partWriteOffLeaderOrder(data, options = {}) {
	return request2(Object.assign({
		url: '/order/leader/order/partWriteOff',
		method: 'POST',
		data
	}, options))
}

export function sendLeaderOrderInfo(params) {
	return request2({
		url: '/order/leader/order/send',
		method: 'GET',
		data: params
	})
}

export function getLeaderRefundOrderCount(params) {
	return request2({
		url: '/order/leader/refund/count',
		method: 'GET',
		data: withLeaderOrderPoint(params)
	})
}

// options 可透传请求层选项（如 { silentToast: true }：退款失败原文由页面用 modal 展示）
export function approveLeaderRefundOrder(data, options = {}) {
	return request2(Object.assign({
		url: '/order/leader/refund/approve',
		method: 'POST',
		data
	}, options))
}

export const getLeaderOrderInfo2 = getLeaderOrderInfo
export const checkLeaderOrderInfo = writeOffLeaderOrder
export const verifyLeaderOrderInfo = partWriteOffLeaderOrder
export const passLeaderRefundOrder = approveLeaderRefundOrder
export const refuseLeaderRefundOrder = approveLeaderRefundOrder

// 消息列表
export function getLeaderMessageList(params) {
	return request2({
		url: '/user/leader/message/list',
		method: 'GET',
		data: params
	})
}

// 消息总数
export function getLeaderMessageCount(params) {
	return request2({
		url: '/user/leader/message/count',
		method: 'GET',
		data: params
	})
}

// 未读总数
export function getLeaderUnReadMessageCount(params) {
	return request2({
		url: '/user/leader/message/unread',
		method: 'GET',
		data: params
	})
}

// 阅读消息
export function readLeaderMessage(params) {
	return request2({
		url: '/user/leader/message/read',
		method: 'GET',
		data: params
	})
}

// 汇总订单数量, 区分是否核销
export function getSummaryOrderInfo(params) {
	return request2({
		url: '/order/leader/home/show/orders',
		method: 'GET',
		data: withLeaderHomeShowParams(params)
	})
}

// 汇总订单商品数据, 区分是否核销
export function getSummaryOrderGoodsInfo(params) {
	return request2({
		url: '/order/leader/home/order/goodsSummary',
		method: 'GET',
		data: withLeaderGoodsSummaryParams(params)
	})
}

// 汇总订单商品数据, 区分是否核销, 增加提货点分组
export function getSummaryOrderGoodsPointInfo(params) {
	return request2({
		url: '/order/leader/summary/point',
		method: 'GET',
		data: withLeaderOrderPoint(params)
	})
}

// 汇总订单商品"sku"或者"包装"的数据, 不区分是否核销
export function getSummaryOrderGoodsSkuInfo(params) {
	return request2({
		url: '/order/leader/summary/sku',
		method: 'GET',
		data: withLeaderOrderPoint(params)
	})
}

// 汇总订单商品"sku"或者"包装"的数据, 不区分是否核销, 增加提货点分组
export function getSummaryOrderGoodsPointSkuInfo(params) {
	return request2({
		url: '/order/leader/summary/pointsku',
		method: 'GET',
		data: withLeaderOrderPoint(params)
	})
}

// 指定提货点汇总订单商品数据, 区分是否核销
export function getSummaryPointOrderGoodsInfo(params) {
	return request2({
		url: '/order/leader/summary/pointgoods',
		method: 'GET',
		data: withLeaderOrderPoint(params)
	})
}

// 指定提货点汇总订单商品"sku"或者"包装"的数据, 不区分是否核销
export function getSummaryPointOrderGoodsSkuInfo(params) {
	return request2({
		url: '/order/leader/summary/pointgoodssku',
		method: 'GET',
		data: withLeaderOrderPoint(params)
	})
}

// 黑名单列表
export function getBlackList(params) {
	return request2({
		url: '/user/leader/black/list',
		method: 'GET',
		data: params
	})
}

// 黑名单总数
export function getBlackCount(params) {
	return request2({
		url: '/user/leader/black/count',
		method: 'GET',
		data: params
	})
}

// 查询用户
export function getMemberInfo(params) {
	return request2({
		url: '/user/leader/member/mobile',
		method: 'GET',
		data: params
	})
}

// 添加黑名单
export function addBlackList(params) {
	const data = withBlackMemberId(params)
	return request2({
		url: queryUrl('/user/leader/add/black', data),
		method: 'POST',
		data: {}
	})
}

// 根据手机号查询黑名单用户
export function getBlackMember(params) {
	return request2({
		url: '/user/leader/black/mobile',
		method: 'GET',
		data: params
	})
}

// 解除黑名单
export function removeBlackList(params) {
	const data = withBlackMemberId(params)
	return request2({
		url: queryUrl('/user/leader/member/black/remove', data),
		method: 'POST',
		data: {}
	})
}
