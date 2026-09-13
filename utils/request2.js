import request from './request.js'

// 统一从缓存读取固定参数
const getCommonHeader = () => {
	return {
		lid: uni.getStorageSync('leader_lid') || '',
		sid: uni.getStorageSync('leader_sid') || ''
	}
}

// 二次封装 request 请求, 增加上面的固定参数
export default function request2(options) {
	return request({
		...options,
		header: {
			...getCommonHeader(),
			...(options.header || {})
		}
	})
}
