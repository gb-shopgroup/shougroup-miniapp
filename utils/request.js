import env from "@/config/env.js"

const maskAuthorization = (header = {}) => {
	const safeHeader = { ...header }
	if (safeHeader.Authorization) {
		const token = String(safeHeader.Authorization)
		safeHeader.Authorization = token.length > 12 ? `${token.slice(0, 6)}...${token.slice(-4)}` : '***'
	}
	return safeHeader
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
	console.log('[API Request]', {
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
				console.log('[API Response]', {
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
					uni.showToast({ title: data.msg || '请求失败', icon: 'none' })
					reject(data)
				}
			},
			// 网络失败
			fail: (err) => {
				console.error('[API Error]', {
					url,
					path: options.url,
					method,
					err
				})
				uni.showToast({ title: '网络异常', icon: 'none' })
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
