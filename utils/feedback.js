// 关键操作失败提示（下单/支付/退款/核销这类"必须让用户看清后端原文"的场景）。
//
// 为什么用 modal 而不是 toast：
//   1. toast 默认 1.5s，且会被紧随其后的 uni.hideLoading() 立刻关掉、也会被页面跳转打断
//      —— 表现为「提示一闪而过，就没了」；
//   2. 后端的原文（限购提示/库存不足/不在核销范围…）是用户下一步动作的依据，必须手动确认再消失。
//
// 与请求层配合：调用方对关键接口传 { silentToast: true }（见 utils/request.js 的提示机制），
// 由本函数统一负责提示，避免「请求层 toast + 页面 modal」双重提示。

// 取出后端原文（msg / message），拿不到时用兜底文案
export function pickActionErrorMessage(err, fallback = '') {
	const message = (err && (err.msg || err.message)) || ''
	return String(message || fallback || '').trim()
}

// 弹出阻断式错误提示
// - 默认延迟 50ms：调用方通常在 catch 里调用、紧接着 finally 执行 hideLoading，
//   而 showLoading 与 showModal 共用同一层，必须先等 loading 关掉再弹。
export function showActionError(message, options = {}) {
	const content = pickActionErrorMessage({ msg: message }, options.fallback || '操作失败，请稍后重试')
	const delay = options.delay === undefined ? 50 : Number(options.delay)
	const show = () => uni.showModal({
		title: options.title || '操作失败',
		content,
		showCancel: false,
		confirmText: options.confirmText || '我知道了',
		success: options.success,
		fail: options.fail
	})
	if (delay > 0) setTimeout(show, delay)
	else show()
}
