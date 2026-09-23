import request from "@/utils/request.js"

function withGroupId(params = {}) {
	if (params.id && !params.groupId) {
		const data = Object.assign({}, params, { groupId: params.id })
		delete data.id
		return data
	}
	return params
}

function withLeaderId(params = {}) {
	if (params.id && !params.leaderId) {
		const data = Object.assign({}, params, { leaderId: params.id })
		delete data.id
		return data
	}
	return params
}

// 首页团购分类
export function getGroupCatList() {
	return request({
		url: '/order/group/groupActivity/cat',
		method: 'GET'
	})
}

// C端首页团购列表：已绑定团长按团长过滤，未绑定团长按定位推荐。
export function getMemberGroupActivityList(data) {
	return request({
		url: '/order/member/groupActivity/list',
		method: 'POST',
		data
	})
}

// 团购详情
export function getGroupInfo(params) {
	return request({
		url: '/order/group/groupActivity/info',
		method: 'GET',
		data: withGroupId(params)
	})
}

// C端用户进入团购详情时上报，用于服务端建立团长与团员的关联。
export function reportMemberGroupView(data = {}) {
	return request({
		url: '/order/group/groupActivity/view',
		method: 'POST',
		data: { groupId: Number(data.groupId || data.id || 0) }
	})
}

// 团长店铺
export function getGroupShop(params) {
	return request({
		url: '/order/group/groupActivity/shop',
		method: 'GET',
		data: withLeaderId(params)
	})
}

// 团购自提点
export function getGroupPoint(params) {
	return request({
		url: '/user/group/point',
		method: 'GET',
		data: params
	})
}

// 团购商品列表
export function getGroupGoodsList(params) {
	return request({
		url: '/goods/group/goods/list',
		method: 'GET',
		data: params
	})
}

function withLogId(params = {}) {
	return { id: Number(params.id || params.groupId || 0) }
}

// 团购详情跟团滚动记录
export function getMemberGroupActivityLogs2(params) {
	return request({
		url: '/order/group/groupActivity/logs2',
		method: 'GET',
		data: withLogId(params)
	})
}

// 是否黑名单
export function isBackMember(params) {
	return request({
		url: '/user/group/black',
		method: 'GET',
		data: params
	})
}

// 获取phone
export function getPhone(params) {
	return request({
		url: '/user/phone',
		method: 'GET',
		data: params
	})
}

// 获取openid
export function getOpenId(params) {
	return request({
		url: '/user/openid',
		method: 'GET',
		data: params
	})
}

// openid登录
export function openIdLogin(params) {
	return request({
		url: '/user/login',
		method: 'GET',
		data: params
	})
}

// 退出登录
export function logoutUser() {
	return request({
		url: '/user/logout',
		method: 'POST'
	})
}

// 注册新用户
export function regUser(data) {
	return request({
		url: '/user/reg',
		method: 'POST',
		data: data
	})
}

// 添加订单
// options 可透传请求层选项，例如 { silentToast: true }：
// 下单失败（限购/库存不足等）由页面用 modal 展示后端原文，不再让请求层先弹一条 toast。
export function addOrder(data, options = {}) {
	return request(Object.assign({
		url: '/order/group/add',
		method: 'POST',
		data: data
	}, options))
}

// 支付订单
export function payOrder(params, options = {}) {
	return request(Object.assign({
		url: '/order/payment/order/pay',
		method: 'GET',
		data: params
	}, options))
}

// 订单列表
export function getOrderList(data) {
	return request({
		url: '/order/group/order/list',
		method: 'POST',
		data: data
	})
}

// 订单详情
export function getOrderInfo(params) {
	return request({
		url: '/order/group/order/info',
		method: 'GET',
		data: params
	})
}

// 用户二维码
export function getErcodeInfo(params, userToken = '') {
	const header = userToken ? { Authorization: userToken } : {}
	return request({
		url: '/order/group/order/makeErcode',
		method: 'GET',
		data: params,
		header
	})
}

// 微信订单状态查询
export function queryWxOrderStatus(params) {
	return request({
		url: '/order/group/wx/order',
		method: 'GET',
		data: params
	})
}

// 订单提货/核销：POST /order/group/order/part/receipt
// body { orderNo, pointId, goodsList }；goodsList 不传/空 = 整单核销，传 [{ id, num }] = 部分核销。
// 取代旧的 GET /order/group/order/receipt?orderNo=&point=（同一功能，新接口支持部分核销）。
// options 可透传请求层选项（如 { silentToast: true }：失败提示由页面用 modal 负责）
export function receiptOrder(data = {}, options = {}) {
	return request(Object.assign({
		url: '/order/group/order/part/receipt',
		method: 'POST',
		data
	}, options))
}

// 申请退款
// options 可透传请求层选项（如 { silentToast: true }：失败提示由页面用 modal 负责）
export function refundOrder(data, options = {}) {
	return request(Object.assign({
		url: '/order/group/order/apply/refund',
		method: 'POST',
		data: data
	}, options))
}

// 按退款类型获取订单可申请售后的商品和数量。
export function getRefundApplyOrderInfo(data) {
	return request({
		url: '/order/group/order/applyRefund/orderInfo',
		method: 'POST',
		data
	})
}

// 退款原因列表
export function getRefundReasonList(params = {}) {
	return request({
		url: '/order/group/order/refund/reasonList',
		method: 'GET',
		data: params
	})
}

// 申请售后记录查询
export function getRefundRecords(params = {}) {
	return request({
		url: '/order/group/order/refund/recodes',
		method: 'GET',
		data: params
	})
}

// 用户售后订单列表
export function getApplyRefundOrderList(data) {
	return request({
		url: '/order/group/order/applyRefundList',
		method: 'POST',
		data: data
	})
}

// 用户扫码门店核销码后：该用户在该店铺下「未全部提货」的订单列表（待核销）。
// 接口文档：GET /order/group/order/notAllReceiptList?shopId=（shopId 必填）。
// 旧路径 /order/group/order/getPaidOrders 在接口文档中不存在，已按文档切换。
export function getNotAllReceiptOrders(params = {}) {
	return request({
		url: '/order/group/order/notAllReceiptList',
		method: 'GET',
		data: params
	})
}

// 查询我的信息
export function getMemberInfo() {
	return request({
		url: '/user/member/info',
		method: 'GET'
	})
}

// 查询当前用户是否团长身份
export function getIsLeader() {
	return request({
		url: '/user/member/isleader',
		method: 'GET'
	})
}

// 获取文章内容
export function getArticleInfo(params) {
	return request({
		url: '/user/article/info',
		method: 'GET',
		data: params
	})
}
