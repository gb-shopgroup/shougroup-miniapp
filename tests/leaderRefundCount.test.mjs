import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as orderUtils from '../utils/leaderOrder.js'

function load(file, deps) {
 const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
 const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '').replace('export default', 'return')
 const def = new Function(...Object.keys(deps), script)(...Object.values(deps))
 const page = def.data()
 for (const [key, method] of Object.entries(def.methods)) page[key] = method.bind(page)
 return { def, page, source }
}
for (const file of ['../pagesA/order/index.vue', '../pagesA/dashboard/index.vue']) {
 const pending = []
 let stopped = 0
 const { def, page, source } = load(file, {
  ...orderUtils, RefundReason: {},
  getLeaderRefundCount: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
  uni: { stopPullDownRefresh: () => stopped++ },
  console: { log() {} }
 })
 page.leaderRole = 'leader'
 page.leaderSuper = true
 const oldRequest = page.loadRefundCount()
 const latestRequest = page.loadRefundCount()
 pending[1].resolve({ data: 2 })
 await latestRequest
 pending[0].resolve({ data: 9 })
 await oldRequest
 assert.equal(page.refundCount, 2, `${file}: 旧响应不得覆盖最新数值`)
 const failedRequest = page.loadRefundCount()
 pending[2].reject(new Error('网络错误'))
 await failedRequest
 assert.equal(page.refundCount, 2, '失败时保留上次成功值，不把失败误报为没有待处理')
 const zeroRequest = page.loadRefundCount()
 pending[3].resolve({ data: 0 })
 await zeroRequest
 assert.equal(page.refundCount, 0)
 assert.ok(source.includes('refundCount > 0'))
 assert.ok(source.includes("refundCount > 99 ? '99+' : refundCount"))
 if (file.includes('/order/')) {
  let listLoads = 0
  let countLoads = 0
  page.loadOrders = async () => { listLoads++ }
  page.loadRefundCount = async () => { countLoads++ }
  await page.refreshOrders()
  assert.equal(listLoads, 1)
  assert.equal(countLoads, 1)
  def.onPullDownRefresh.call(page)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(stopped, 1)
  assert.equal(countLoads, 2)
  page.pageReady = true
  page.fromGroupDetail = false
  def.onShow.call(page)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(countLoads, 3, '返回订单页刷新待处理数')
  assert.ok(source.includes("tab.key === 'refund' && refundCount > 0"))
 } else {
  let countLoads = 0
  page.initLeaderAvatar = () => {}
  page.loadRefundCount = async () => { countLoads++ }
  def.onShow.call(page)
  await def.onPullDownRefresh.call(page)
  assert.equal(countLoads, 2, '工作台返回与下拉均刷新')
  assert.equal(stopped, 1)
 }
}
console.log('leaderRefundCount tests passed')
