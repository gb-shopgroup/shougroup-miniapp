// 扫码入口调试开关。
// 排查「扫门店码落到哪个页面」时保持 true，确认完成后改为 false 即可关闭全部入口日志，
// 无需逐个页面删除代码。
export const SCAN_ENTRY_DEBUG = true

// 统一输出入口日志：页面名 + 原始参数 + scene，便于对比码里真实内容与预期落点。
export function logScanEntry(page, options = {}) {
	if (!SCAN_ENTRY_DEBUG) return
	try {
		console.log('[扫码入口] ' + page + ':', JSON.stringify({
			scene: options.scene || '',
			options
		}))
	} catch (err) {
		console.log('[扫码入口] ' + page + ':', options.scene || '')
	}
}
