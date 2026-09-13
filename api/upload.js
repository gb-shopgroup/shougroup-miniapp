import env from "@/config/env.js"

const maskAuthorization = (header = {}) => {
	const safeHeader = { ...header }
	if (safeHeader.Authorization) {
		const token = String(safeHeader.Authorization)
		safeHeader.Authorization = token.length > 12 ? `${token.slice(0, 6)}...${token.slice(-4)}` : '***'
	}
	return safeHeader
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
		console.log('[API Upload Request]', {
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
				console.log('[API Upload Response]', {
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
				console.error('[API Upload Parse Error]', {
					url,
					path: uploadURL,
					rawData: res.data,
					err
				})
				reject('返回数据解析异常')
			}
		},
		fail: err => {
			console.error('[API Upload Error]', {
				url,
				path: uploadURL,
				err
			})
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
		console.log('[API Download Request]', {
			url,
			method: 'GET'
		})
		uni.request({
			url: url,
			method: "GET",
			success: (res) => {
				const data = res.data
				console.log('[API Download Response]', {
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
				console.error('[API Download Error]', {
					url,
					method: 'GET',
					err
				})
				reject(err)
			},
			complete: () => {
				
			}
		})
	})
}
