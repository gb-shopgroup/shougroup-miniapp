// 根据 process.env.NODE_ENV 判断环境
// NODE_ENV 只有两个值：development / production
let env = process.env.NODE_ENV

// 开发环境 / 生产环境 接口地址
const config = {
    development: {
        //baseURL: "http://127.0.0.1:8080", // 开发接口
        baseURL: "https://test.api.shopgroup.com.cn", // 测试接口
        //baseURL: "https://api.shopgroup.com.cn", // 测试接口-为审核使用
    },
    test: {
        baseURL: "https://test.api.shopgroup.com.cn", // 测试接口
        //baseURL: "https://api.shopgroup.com.cn", // 测试接口-为审核使用
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
        // 微信小程序-体验版及审核包。审核需要看到真实可体验的运营内容。
        env = 'test'
        //env = 'production'
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
