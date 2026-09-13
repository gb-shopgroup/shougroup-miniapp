<script>
import { getOpenId, openIdLogin } from "@/api/group.js"
import { cacheMemberLoginInfo } from "@/utils/auth.js"
export default {
	globalData: {
		sessionCartGoodsList: [],
		sessionCheckoutGoodsList: [],
		sessionCartContext: {},
		sessionCheckoutOrderNo: '',
		sessionCartVersion: 0
	},
	onLaunch: function() {
		const openid = uni.getStorageSync('openid')
		if(!openid) {
			this.getWxOpenID()
		}else{
			this.autoLogin(openid)
		}
		//console.log('App Launch')
	},
	onShow: function() {
		//console.log('App Show')
	},
	onHide: function() {
		//console.log('App Hide')
	},
	methods: {
		// 获取openid
		async getWxOpenID() {
			try {
				// 1. 获取微信code 无需按钮、无需授权、静默执行
				const loginRes = await uni.login({ provider: 'weixin' })
				const code = loginRes.code
				if (!code) return
				// 2. 传给后端换取 openid
				const param = {code: code}
				const res = await getOpenId(param)
				const openid = res.data
				// 3. 缓存openid全局生效
				uni.setStorageSync('openid', openid)
				//console.log('微信获取openid成功：', openid)
				// 4. 尝试自动登录
				this.autoLogin(openid)
			} catch (err) {
				console.log('微信获取openid失败：', err)
			}
		},
		// openid自动登录
		async autoLogin(openid) {
			try {
				// openid登录
				const param = {openid: openid}
				const res = await openIdLogin(param)
				const userInfo = res.data
				if(userInfo !== null){
					cacheMemberLoginInfo(userInfo)
				}
			} catch (err) {
				console.log('openid自动登录失败：', err)
			}
		}
	}
}
</script>

<style lang="scss">
@import "static/css/main.scss";
</style>
