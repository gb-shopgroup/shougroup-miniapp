import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
	RECONCILIATION_DISPLAY_MODES,
	buildLeaderReconciliationParams,
	normalizeLeaderReconciliationRow,
	normalizeLeaderReconciliationSummary,
	resolveLeaderReconciliationList
} from '../utils/leaderReconciliation.js'

assert.deepEqual(RECONCILIATION_DISPLAY_MODES, [
	{ key: 'goods', text: '商品显示', value: 1 },
	{ key: 'order', text: '订单显示', value: 2 }
])
assert.deepEqual(buildLeaderReconciliationParams({
	mode: 'goods', startDate: '2026-09-01', endDate: '2026-09-10', page: 2, pageSize: 20
}), {
	page: 2,
	pageSize: 20,
	type: 1,
	startDate: '2026-09-01 00:00:00',
	endDate: '2026-09-10 23:59:59'
})
assert.deepEqual(buildLeaderReconciliationParams({ mode: 'order', pageSize: 100 }), {
	page: 1,
	pageSize: 20,
	type: 2
})
assert.deepEqual(normalizeLeaderReconciliationSummary({ orderTotal: 3, amountTotal: '12.5', refundAmountTotal: '1.2' }), {
	validCount: 3,
	orderAmount: 12.5,
	refundAmount: 1.2
})
assert.deepEqual(resolveLeaderReconciliationList({ records: [{ id: 1 }] }), [{ id: 1 }])
assert.deepEqual(normalizeLeaderReconciliationRow({ goodsId: 2, goodsName: '苹果', orderAmount: 5, refundAmount: 1 }), {
	key: '2',
	goodsName: '苹果',
	orderNo: '',
	orderAmount: 5,
	refundAmount: 1
})

const accountPageSource = readFileSync(new URL('../pagesA/business/account.vue', import.meta.url), 'utf8')
assert.match(accountPageSource, /if \(!this\.hasDateRange\)/)
assert.doesNotMatch(accountPageSource, /onLoad\(\)\s*\{[\s\S]*?loadReconciliation\(/)
assert.match(accountPageSource, /请选择日期后查看对账单/)
assert.match(accountPageSource, /flex-direction: column/)

console.log('leaderReconciliation tests passed')
