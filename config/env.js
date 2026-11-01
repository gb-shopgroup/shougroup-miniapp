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
		// 微信小程序-体验版（上传代码后自己/内部验收）：走测试环境
		env = 'test'
		break
	case 'release':
		// 微信小程序-正式版（审核通过上线后）：走生产环境
		env = 'production'
		break
	default:
		// 默认正式版
		env = 'production'
}
// 手动覆盖：只对开发版/体验版生效，正式版忽略（防止线上误打到测试环境）。
// 提交审核前若希望审核人员看到生产数据，在控制台执行一次后重启小程序即可：
//   uni.setStorageSync('sg_api_env', 'production')   // 指到生产
//   uni.removeStorageSync('sg_api_env')              // 恢复按 envVersion 自动判断
if (env !== 'production') {
	const override = String(uni.getStorageSync('sg_api_env') || '').trim()
	if (config[override]) env = override
}
// #endif

export default config[env]
