import env from "@/config/env.js"

const maskAuthorization = (header = {}) => {
	const safeHeader = { ...header }
	if (safeHeader.Authorization) {
		const token = String(safeHeader.Authorization)
		safeHeader.Authorization = token.length > 12 ? `${token.slice(0, 6)}...${token.slice(-4)}` : '***'
	}
	return safeHeader
}

const normalizeError = (err = {}) => ({
	errMsg: err.errMsg || err.message || String(err),
	code: err.code,
	statusCode: err.statusCode
})

// 提示机制（避免双重提示）：
//   页面 → 请求层：request({ ..., silentToast: true })，本层不弹任何提示，由页面自己决定用 modal 还是 toast；
//   请求层 → 页面：拒绝对象上带 toasted（本层是否已弹过），页面可用 `if (!err.toasted)` 决定要不要再弹。
// 典型场景：下单/退款这类"必须让用户看清后端原文"的失败，页面用 modal（不会被 loading/跳转打断），
// 此时加 silentToast 就不会再出现"请求层 toast + 页面 modal"两条提示。
const markToasted = (target, toasted) => {
	if (!target || (typeof target !== 'object' && typeof target !== 'function')) return target
	try {
		target.toasted = Boolean(toasted)
	} catch (err) {
		// 个别平台返回的对象不可写，忽略即可（标记只是给页面参考）
	}
	return target
}

const logJson = (prefix, payload, logger = console.log) => {
	try {
		logger(`${prefix} ${JSON.stringify(payload)}`)
	} catch (err) {
		logger(`${prefix} ${String(payload)}`)
	}
}

// 封装 uni.request 请求
const request = (options) => {
	
	// 1. 请求前：加载提示
	//uni.showLoading({ title: '请求中...', mask: true })
	
	// 2. 公共请求头（token）
	const baseHeader = {
		'Content-Type': 'application/json',
		'Authorization': uni.getStorageSync('token') || ''
	}
	// 关键：合并外部传入的 header
	const header = {
		...baseHeader,
		...(options.header || {}) // 外部header会覆盖/追加
	}
	const method = options.method || "GET"
	const data = options.data || {}
	const url = env.baseURL + options.url
	logJson('[API RequestJson]', {
		url,
		path: options.url,
		method,
		data,
		header: maskAuthorization(header)
	})
	
	// 3. 返回 Promise 支持 async/await
	return new Promise((resolve, reject) => {
		
		uni.request({
			url,
			method,
			data,
			header: header,
			// 响应成功
			success: (res) => {
				// 4. 解析返回数据
				const data = res.data
				logJson('[API ResponseJson]', {
					url,
					path: options.url,
					method,
					statusCode: res.statusCode,
					data
				})
				// 5. 统一状态码判断
				if (data.code === 200) {
					resolve(data)
				} else {
					// 页面自行提示时（options.silentToast）请求层不弹，避免「请求层 toast + 页面 modal」双重提示
					const toasted = !options.silentToast
					if (toasted) uni.showToast({ title: data.msg || '请求失败', icon: 'none' })
					// 反向标记：告诉页面本层是否已经提示过，页面可据此决定要不要再提示
					markToasted(data, toasted)
					reject(data)
				}
			},
			// 网络失败
			fail: (err) => {
				logJson('[API ErrorJson]', {
					url,
					path: options.url,
					method,
					err: normalizeError(err)
				}, console.error)
				const toasted = !options.silentToast
				if (toasted) uni.showToast({ title: '网络异常', icon: 'none' })
				markToasted(err, toasted)
				reject(err)
			},
			// 无论成功/失败/异常，最终都会执行
			complete: () => {
				//uni.hideLoading()
			}
		})
	})
}

export default request
