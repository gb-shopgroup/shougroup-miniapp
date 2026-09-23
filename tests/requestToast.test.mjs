// 请求层「提示机制」测试：
//   页面 → 请求层：request({ silentToast: true }) → 本层不弹提示，由页面自己决定 modal / toast
//   请求层 → 页面：拒绝对象带 toasted（本层是否弹过），页面可用 if (!err.toasted) 决定要不要再弹
// 做法：把 utils/request.js 的 @ 别名 import 去掉后用 new Function 执行，uni 用桩替换，直接跑真实逻辑。
import assert from 'node:assert/strict'
import fs from 'node:fs'

const requestSource = fs.readFileSync(new URL('../utils/request.js', import.meta.url), 'utf8')
const runnableSource = requestSource
	.replace(/^import env from .*$/m, 'const env = { baseURL: "" }')
	.replace('export default request', 'return request')

// 用桩执行一次请求，返回 { toasts, error, resolved }
function runRequest(options = {}, response = {}) {
	const toasts = []
	const uniStub = {
		getStorageSync: () => '',
		showToast: payload => toasts.push(payload),
		request: config => {
			if (response.fail) config.fail(response.fail)
			else config.success({ statusCode: 200, data: response.data })
		}
	}
	// 注入静默 console：请求层会把每个请求/响应打成 [API RequestJson]/[API ResponseJson] 日志
	const silentConsole = { log: () => {}, error: () => {}, warn: () => {} }
	// eslint-disable-next-line no-new-func
	const factory = new Function('uni', 'console', runnableSource)
	const request = factory(uniStub, silentConsole)
	return request(options).then(
		data => ({ toasts, resolved: data }),
		error => ({ toasts, error })
	)
}

// ① 默认：请求层自己弹 toast，并在错误对象上标记 toasted=true（页面据此避免重复提示）
const normalFailure = await runRequest({ url: '/x', method: 'POST' }, { data: { code: 300, msg: '限购提示：每人限购2件' } })
assert.equal(normalFailure.toasts.length, 1)
assert.equal(normalFailure.toasts[0].title, '限购提示：每人限购2件')
assert.equal(normalFailure.error.toasted, true)
assert.equal(normalFailure.error.msg, '限购提示：每人限购2件')

// ② silentToast：请求层完全不弹，标记 toasted=false —— 页面可以自己用 modal 展示原文
const silentFailure = await runRequest({ url: '/x', method: 'POST', silentToast: true }, { data: { code: 300, msg: '库存不足' } })
assert.equal(silentFailure.toasts.length, 0)
assert.equal(silentFailure.error.toasted, false)
assert.equal(silentFailure.error.msg, '库存不足')

// ③ 网络失败同样遵守该机制
const networkFailure = await runRequest({ url: '/x' }, { fail: { errMsg: 'request:fail timeout' } })
assert.equal(networkFailure.toasts.length, 1)
assert.equal(networkFailure.toasts[0].title, '网络异常')
assert.equal(networkFailure.error.toasted, true)
const silentNetworkFailure = await runRequest({ url: '/x', silentToast: true }, { fail: { errMsg: 'request:fail timeout' } })
assert.equal(silentNetworkFailure.toasts.length, 0)
assert.equal(silentNetworkFailure.error.toasted, false)

// ④ 成功不弹任何提示
const successResult = await runRequest({ url: '/x' }, { data: { code: 200, msg: '操作成功', data: { id: 1 } } })
assert.equal(successResult.toasts.length, 0)
assert.deepEqual(successResult.resolved.data, { id: 1 })

// ⑤ 下单/支付这类「关键失败」必须由页面负责提示：接口层要能把 silentToast 透传下去
const groupApiSource = fs.readFileSync(new URL('../api/group.js', import.meta.url), 'utf8')
assert.equal(groupApiSource.includes('export function addOrder(data, options = {})'), true)
assert.equal(groupApiSource.includes('export function payOrder(params, options = {})'), true)
assert.equal(groupApiSource.includes('}, options))'), true)
const cartSource = fs.readFileSync(new URL('../pages/group/cart.vue', import.meta.url), 'utf8')
assert.equal(cartSource.includes('await addOrder(param, { silentToast: true })'), true)
assert.equal(cartSource.includes('await payOrder(params, { silentToast: true })'), true)
// 页面自己负责提示（modal，不会被打断），因此不能再让请求层重复弹
assert.equal(cartSource.includes('this.showSubmitError('), true)

console.log('requestToast tests passed')
