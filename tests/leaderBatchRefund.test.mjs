import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as orderUtils from '../utils/leaderOrder.js'

const rows = [{ orderNo: 'BATCH-1', groupId: 7, orderPrice: 30, status: 5, goods: [
	{ id: 81, goodsId: 9, goodsName: '苹果', goodsInfo: '大果', goodsPrice: 0.1, refundNum: 3 },
	{ id: 82, goodsId: 9, goodsName: '苹果', goodsInfo: '小果', goodsPrice: 2.5, refundNum: 2 },
	{ id: 83, goodsId: 10, goodsName: '赠品', goodsPrice: 0, refundNum: 1 },
	{ id: 84, goodsId: 11, goodsName: '无退款数量', goodsPrice: 10 }
] }]
const [order] = orderUtils.normalizeLeaderBatchRefundList(rows)
assert.equal(order.orderPrice, 30)
assert.equal(order.goods[0].specText, '大果')
assert.equal(order.goods[0].currentRefundNum, 3)
assert.equal(order.goods[0].currentRefundAmount, 0.3)
assert.equal(order.goods[3].currentRefundNum, 0)
let selection = {}
for (const goods of order.goods.slice(0, 3)) selection = orderUtils.toggleRefundSelection(selection, order, goods, true)
assert.deepEqual(orderUtils.buildBatchRefundSummary(selection), { itemCount: 3, orderCount: 1, refundAmount: 5.3 })
const payload = orderUtils.buildRefundApprovalPayload({ selection, status: 1, type: 1 })
assert.deepEqual(payload, {
	status: 1, type: 1,
	refundOrderGoodsMap: { 'BATCH-1': { orderNo: 'BATCH-1', refundGoodsMap: {
		81: { orderGoodsId: 81, refundNum: 3, refundAmount: 0.3 },
		82: { orderGoodsId: 82, refundNum: 2, refundAmount: 5 },
		83: { orderGoodsId: 83, refundNum: 1, refundAmount: 0 }
	} } }
})
assert.equal('type' in orderUtils.buildRefundApprovalPayload({ selection, status: 1 }), false)
assert.equal('type' in orderUtils.buildRefundApprovalPayload({ selection, status: 2, type: 1, reason: '原因' }), false)

function loadPage(path, deps) {
	const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8')
	const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
		.replace(/import[\s\S]*?from\s+["'][^"']+["'];?/g, '')
		.replace('export default', 'return')
	const definition = new Function(...Object.keys(deps), script)(...Object.values(deps))
	const instance = { ...definition.data() }
	for (const [name, method] of Object.entries(definition.methods)) instance[name] = method.bind(instance)
	for (const [name, getter] of Object.entries(definition.computed || {})) Object.defineProperty(instance, name, { get: getter.bind(instance) })
	return { definition, instance }
}
const requests = []
let response = rows
let fail = false
const { instance: page } = loadPage('../pagesA/order/refund.vue', {
	...orderUtils,
	getLeaderApproveList: async request => {
		requests.push(request)
		if (fail) throw new Error('网络错误')
		return { data: response }
	},
	uni: { showToast() {} },
	approveLeaderRefundOrder: async () => {},
	getLeaderGroupList: async () => ({ data: [] }),
	pickActionErrorMessage: error => error.message,
	showActionError() {}
})
await page.loadRefundOrders()
assert.equal(requests.length, 0, '未选团不得请求批量接口')
page.groupId = 7
page.pageSize = 1
page.activeGoodsName = '苹果'
await page.loadRefundOrders()
assert.deepEqual(requests[0], { groupId: 7, goodsName: '苹果', page: 1, pageSize: 1 })
assert.equal(page.hasMore, true)
page.toggleAll()
assert.equal(page.summary.itemCount, 3, '零元可选，缺少退款数量不可选')
assert.equal(page.refundGoodsNum(page.orderList[0].goods[0]), 3)
fail = true
await page.loadRefundOrders()
assert.equal(page.page, 2, '分页失败保留待重试页码')
assert.equal(page.orderList.length, 1)
fail = false
response = []
page.keyword = '未确认的新关键词'
await page.loadRefundOrders()
assert.equal(requests.at(-1).page, 2)
assert.equal(requests.at(-1).goodsName, '苹果', '分页沿用已确认搜索条件')
assert.equal(page.hasMore, false)
page.groupList = [{ id: 0, name: '选择团' }, { id: 8, name: '新团' }]
page.onGroupChange({ detail: { value: 1 } })
assert.deepEqual(page.selection, {})
assert.equal(requests.at(-1).groupId, 8)
assert.equal(requests.at(-1).page, 1)
await Promise.resolve()

let countResponse = 12
const { instance: dashboard } = loadPage('../pagesA/dashboard/index.vue', {
	getLeaderRefundCount: async () => ({ data: countResponse })
})
dashboard.leaderRole = 'leader'
dashboard.leaderSuper = true
await dashboard.loadRefundCount()
assert.equal(dashboard.refundCount, 12)
countResponse = 0
await dashboard.loadRefundCount()
assert.equal(dashboard.refundCount, 0, '重新进入后清除已处理售后角标')
countResponse = 'invalid'
await dashboard.loadRefundCount()
assert.equal(dashboard.refundCount, 0)

const api = fs.readFileSync(new URL('../api/leader.js', import.meta.url), 'utf8')
for (const [name, url, data] of [
	['getLeaderApproveList', '/order/leader/approve/list', { groupId: 7, goodsName: '苹果', page: 1, pageSize: 10 }],
	['getLeaderRefundCount', '/order/leader/get/refund/count', {}]
]) {
	const source = api.match(new RegExp(`export function ${name}\\([^]*?\\n}`))[0].replace('export ', '')
	const invoke = new Function('request2', `${source}; return ${name}`)(request => request)
	assert.deepEqual(invoke(data), { url, method: 'POST', data })
}
console.log('leaderBatchRefund tests passed')
