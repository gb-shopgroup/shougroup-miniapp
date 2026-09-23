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

const logJson = (prefix, payload, logger = console.log) => {
	try {
		logger(`${prefix} ${JSON.stringify(payload)}`)
	} catch (err) {
		logger(`${prefix} ${String(payload)}`)
	}
}

// 上传图片
export function uploadImage(uploadURL, filePath) {
	
	return new Promise((resolve, reject) => {
		uni.showLoading({ title: '上传中...' })
		const url = env.baseURL + uploadURL
		const header = {
			"Content-Type": "multipart/form-data",
			"Authorization": uni.getStorageSync('token') || ''
		}
		logJson('[API Upload RequestJson]', {
			url,
			path: uploadURL,
			method: 'POST',
			filePath,
			header: maskAuthorization(header)
		})
		uni.uploadFile({
			url,
			method: 'POST',
			name: 'file',
			filePath: filePath,
			//formData: { type: typeVal },
			header,
			success: res => {
				logJson('[API Upload ResponseJson]', {
					url,
					path: uploadURL,
					method: 'POST',
					statusCode: res.statusCode,
					data: res.data
				})
				try {
					const data = JSON.parse(res.data)
					if (data.code === 200) {
						resolve(data.data)
					} else {
						uni.showToast({ title: data.msg || '上传失败', icon: 'none' })
					reject(data.msg)
					}
				} catch (err) {
				logJson('[API Upload ParseErrorJson]', {
					url,
					path: uploadURL,
					rawData: res.data,
					err: normalizeError(err)
				}, console.error)
				reject('返回数据解析异常')
			}
		},
		fail: err => {
			logJson('[API Upload ErrorJson]', {
				url,
				path: uploadURL,
				err: normalizeError(err)
			}, console.error)
			uni.showToast({ title: '网络请求失败', icon: 'none' })
			reject(err)
		},
			complete: () => {
				uni.hideLoading()
			}
		})
	})
}

export function uploadProductImage(filePath) {
	return uploadImage('/user/image/upload/goods', filePath)
}

export function uploadLeaderShopImage(filePath) {
	return uploadImage('/user/image/upload/banner', filePath)
}

export function uploadGroupIntroImage(filePath) {
	return uploadImage('/user/image/upload/banner', filePath)
}

export function uploadLeaderPointImage(filePath) {
	return uploadImage('/user/image/upload/banner', filePath)
}

// 删除图片
export function delImage(params) {

}

// 下载照片
export function downImage(url) {

	return new Promise((resolve, reject) => {
		logJson('[API Download RequestJson]', {
			url,
			method: 'GET'
		})
		uni.request({
			url: url,
			method: "GET",
			success: (res) => {
				const data = res.data
				logJson('[API Download ResponseJson]', {
					url,
					method: 'GET',
					statusCode: res.statusCode,
					data
				})
				if (data.code === 200) {
					resolve(data.data)
				} else {
					reject(data.msg)
				}
			},
			fail: (err) => {
				logJson('[API Download ErrorJson]', {
					url,
					method: 'GET',
					err: normalizeError(err)
				}, console.error)
				reject(err)
			},
			complete: () => {
				
			}
		})
	})
}
