// 根据 process.env.NODE_ENV 判断环境
// NODE_ENV 只有两个值：development / production
let env = process.env.NODE_ENV

// 开发环境 / 生产环境 接口地址
const config = {
	development: {
		baseURL: "https://test.api.shopgroup.com.cn", // 测试接口
		//baseURL: "http://127.0.0.1:8080", // 开发接口
	},
	test: {
		baseURL: "https://test.api.shopgroup.com.cn", // 测试接口
	},
	production: {
		baseURL: "https://api.shopgroup.com.cn", // 正式接口
	}
}

// #ifdef MP-WEIXIN
const accountInfo = wx.getAccountInfoSync()
const version = accountInfo.miniProgram.envVersion
switch (version) {
	case 'develop':
		// 微信小程序-开发版
		env = 'development'
		break
	case 'trial':
		// 微信小程序-体验版
		env = 'test'
		break
	case 'release':
		// 微信小程序-正式版
		env = 'production'
		break
	default:
		// 默认正式版
		env = 'production'
}
// #endif

export default config[env]
