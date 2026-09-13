function arrayBufferToString(buffer) {
	if (typeof TextDecoder !== 'undefined') {
		return new TextDecoder('utf-8').decode(buffer)
	}
	const bytes = new Uint8Array(buffer)
	let result = ''
	for (let i = 0; i < bytes.length; i += 1) {
		result += String.fromCharCode(bytes[i])
	}
	try {
		return decodeURIComponent(escape(result))
	} catch (err) {
		return result
	}
}

function arrayBufferToBase64(buffer) {
	if (typeof wx !== 'undefined' && wx.arrayBufferToBase64) {
		return wx.arrayBufferToBase64(buffer)
	}
	if (typeof uni !== 'undefined' && uni.arrayBufferToBase64) {
		return uni.arrayBufferToBase64(buffer)
	}
	const bytes = new Uint8Array(buffer)
	let binary = ''
	for (let i = 0; i < bytes.length; i += 1) {
		binary += String.fromCharCode(bytes[i])
	}
	return btoa(binary)
}

function parseWechatError(buffer) {
	const text = arrayBufferToString(buffer)
	try {
		const data = JSON.parse(text)
		if (data && (data.errcode || data.errmsg)) {
			return data
		}
	} catch (err) {}
	return null
}

export function createWxMiniProgramCode({ accessToken = '', path = '', width = 430 } = {}) {
	if (!accessToken) return Promise.reject({ msg: '缺少微信接口调用凭证' })
	if (!path) return Promise.reject({ msg: '缺少小程序页面路径' })
	return new Promise((resolve, reject) => {
		uni.request({
			url: `https://api.weixin.qq.com/wxa/getwxacode?access_token=${encodeURIComponent(accessToken)}`,
			method: 'POST',
			data: {
				path: path.replace(/^\//, ''),
				width,
				is_hyaline: false
			},
			responseType: 'arraybuffer',
			success: res => {
				const buffer = res.data
				const error = parseWechatError(buffer)
				if (error) {
					reject({ msg: error.errmsg || '生成小程序码失败', data: error })
					return
				}
				resolve(`data:image/png;base64,${arrayBufferToBase64(buffer)}`)
			},
			fail: err => {
				reject(Object.assign({ msg: '微信小程序码请求失败' }, err))
			}
		})
	})
}
