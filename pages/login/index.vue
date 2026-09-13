<template>
<view class="login-page" :style="miniNavPageStyle()">
	<view class="nav-title" :style="miniNavBarStyle()">
		<text :style="miniNavTitleStyle()">登录</text>
	</view>

	<view class="login-content">
		<button class="login-avatar" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
			<image :src="avatarUrl" mode="aspectFill"></image>
		</button>
		<view class="avatar-tip">获取头像</view>

		<view class="login-form">
			<view class="field-row nickname-row">
				<view class="field-icon">名</view>
				<input type="nickname" id="nickname" v-model="nickname" placeholder="陌陌摸摸毛" @blur="onGetNickName" @confirm="onGetNickName" />
				<view v-if="nickname" class="field-check">✓</view>
			</view>

			<button class="field-row phone-row" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
				<view class="field-icon">号</view>
				<input type="text" :disabled="true" v-model="mobile" placeholder="手机号" />
			</button>
		</view>

		<view class="auth-hint">请完成授权以继续使用</view>
		<button class="btn-login" type="primary" @click="submitUserInfo()">
			<text>登录</text>
		</button>
	</view>

	<view class="protocol-tip">
		登陆即同意<text class="link" @click="gotoArticle(1)">用户服务协议</text>与<text class="link" @click="gotoArticle(2)">隐私授权</text>
	</view>
</view>
</template>

<script>
import { uploadImage } from "@/api/upload.js"		
import { regUser, getOpenId, getPhone, openIdLogin } from "@/api/group.js"	
import { cacheMemberLoginInfo } from "@/utils/auth.js"
export default {
	data() {
		return {
			groupId: 0,
			leaderId: 0,
			nickname: '',
			mobile: '',
			avatarUrl: '/static/image/head.png',
			avatarUploaded: false,
			isRequesting: false // 请求锁，防止重复调用
		}
	},
	onLoad(options) {
						
		// 团长id
		if(options.lid){
			this.leaderId = options.lid
		}
		// 团购id
		if (options.id) {
			this.groupId = options.id
		}
		
		// 已有openid直接使用, 没有openid重新获取
		const openid = uni.getStorageSync('openid')
		if (!openid) { this.getOpenId() }
	},
	methods: {
		// 微信获取手机号回调
		async onGetPhoneNumber(e) {
			
			// 拒绝授权
			if (e.detail.errMsg !== "getPhoneNumber:ok") {
				uni.showToast({ title: "您取消了手机号授权", icon: "none" })
				return
			}
			
			// 拿到凭证后请求后台获取手机号
			const code = e.detail.code
			const params = { code: e.detail.code }
			try {
				const res = await getPhone(params)
				this.mobile = res.data
			} catch (err) {
				console.log('获取手机号失败：', err)
			}
		},
		// 获取用户头像回调
		async onChooseAvatar(e) {
			
			// 微信返回的头像临时路径
			const tempAvatarPath = e.detail.avatarUrl;
			// 上传微信头像
			try {
				this.avatarUrl = await uploadImage('/user/image/upload/avatar', tempAvatarPath)
				this.avatarUploaded = true
			} catch (err) {
				console.log('上传微信头像：', err)
			}
		},
		// 获取昵称
		onGetNickName(e){
			
			// 这里拿不到nickname的值
			//this.nickname = e.detail.value.trim()
			//console.log('nickname =', this.nickname)
			
			// 必须用直接读 DOM 的方式拿值
			uni.createSelectorQuery().in(this)
				.select("#nickname")
				.fields({properties: ["value"]})
			.exec((res) => {  
				this.nickname = res?.[0]?.value  
				console.log('获取昵称', this.nickname)
			})
		},
		// 获取openid
		async getOpenId() {
			
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
				console.log('微信获取openid成功：', openid)				
				return openid
			} catch (err) {
				console.log('微信获取openid失败：', err)
				return ''
			}
		},
		// 确保注册前已有openid
		async ensureOpenId() {
			let openid = uni.getStorageSync('openid')
			if (openid) return openid
			openid = await this.getOpenId()
			return openid || ''
		},
		// 注册成功后确保拿到登录令牌
		async finishLoginAfterRegister(openid, registerData) {
			let userInfo = registerData
			if (!userInfo || !userInfo.token) {
				const loginRes = await openIdLogin({ openid: openid })
				userInfo = loginRes.data
			}
			if (!userInfo || !userInfo.token) {
				throw new Error('注册成功但未获取到登录令牌')
			}
			cacheMemberLoginInfo(Object.assign({}, userInfo, {
				leaderId: userInfo.leaderId || (registerData && (registerData.leaderId || registerData.leader)) || this.leaderId || 0
			}))
			return userInfo
		},
		// 注册新用户
		async submitUserInfo() {
			if (!this.avatarUploaded) {
				uni.showToast({ title: '请获取头像', icon: 'none' })
				return
			}
			if (!this.nickname) {
				uni.showToast({ title: '请输入昵称', icon: 'none' })
				return
			}
			if (!this.mobile) {
				uni.showToast({ title: '请授权手机号', icon: 'none' })
				return
			}
			
			// 防重复提交
			if (this.isRequesting) return
			this.isRequesting = true
			uni.showLoading({title: '请求中...', mask: true})
			
			// 注册新用户
			try {
				const map = uni.getStorageSync('map') || ''
				const openid = await this.ensureOpenId()
				if (!openid) {
					uni.showToast({ title: '获取登录凭证失败', icon: 'none' })
					return
				}
				const param = {
					mobile: this.mobile,
					name: this.nickname, 
					avatar: this.avatarUrl,
					leader: this.leaderId,
					map : map,
					openid: openid
				}
				const res = await regUser(param)
				const userInfo = await this.finishLoginAfterRegister(openid, res.data)
				
				// 注册成功
				uni.showToast({ title: "登录成功" })
				console.log('注册新用户成功：', userInfo)
				
				// 跳转到团购页面
				if(this.groupId > 0 && this.leaderId > 0){
					uni.redirectTo({ url: '/pages/group/index?id=' + this.groupId + '&lid=' + this.leaderId})
				}else{
					uni.switchTab({ url: '/pages/index/index' })
				}
				
			} catch (err) {
				console.log('注册新用户失败：', err)
			} finally {
				
				// 成功/失败都关闭loading、释放锁
				uni.hideLoading()
				this.isRequesting = false
			}
		},
		// 跳转文章详情页
		gotoArticle(articleId){
			
			const url = '/pages/article/index?id=' + articleId
			uni.navigateTo({ url: url }).catch(err => { uni.redirectTo({ url: url }) })
		},
		// 去首页
		gotoHome(){
			
			uni.switchTab({ url: "/pages/index/index" })
		}
	}
}
</script>

<style lang="scss" scoped>
.login-page {
	min-height: 100vh;
	background: #fff;
	display: flex;
	flex-direction: column;
	position: relative;
}

.nav-title {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 20;
	box-sizing: border-box;
	text-align: center;
	background: #fff;
	text {
		position: absolute;
		left: 160rpx;
		right: 160rpx;
		color: #222;
		font-size: 34rpx;
		font-weight: 500;
		text-align: center;
	}
}

.login-content {
	flex: 1;
	padding: 126rpx 52rpx 0;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.login-avatar {
	width: 126rpx;
	height: 126rpx;
	padding: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none !important;
	background: #23c25f;
	border-radius: 50%;
	image {
		width: 126rpx;
		height: 126rpx;
		border-radius: 50%;
	}
}

.login-avatar::after {
	border: none !important;
}

.avatar-tip {
	margin-top: 18rpx;
	font-size: 26rpx;
	color: #777;
}

.login-form {
	width: 540rpx;
	margin-top: 78rpx;
}

.field-row {
	width: 540rpx;
	height: 92rpx;
	padding: 0 22rpx;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	background: #fff;
	border: 1rpx solid #d8d8d8;
	border-radius: 28rpx;
	box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.12);
	margin-bottom: 38rpx;
	font-size: 28rpx;
	input {
		flex: 1;
		height: 88rpx;
		padding: 0 18rpx;
		font-size: 28rpx;
		color: #333;
		text-align: left;
	}
}

.field-icon {
	width: 36rpx;
	height: 36rpx;
	border: 2rpx solid #777;
	border-radius: 6rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20rpx;
	color: #666;
}

.field-check {
	width: 46rpx;
	height: 46rpx;
	border-radius: 50%;
	background: #26c160;
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	font-weight: 600;
}

.phone-row {
	border-radius: 36rpx;
	background: #fff;
	border: 1rpx solid #d8d8d8 !important;
	text-align: left;
	line-height: normal;
}

.phone-row::after {
	border: none !important;
}

.auth-hint {
	margin-top: 52rpx;
	font-size: 26rpx;
	color: #999;
	text-align: center;
}

.btn-login {
	width: 528rpx;
	height: 92rpx;
	margin-top: 64rpx;
	background: #26c160;
	color: #fff;
	font-size: 30rpx;
	border-radius: 46rpx;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
}

.btn-login::after {
	border: none;
}

.protocol-tip {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 74rpx;
	font-size: 24rpx;
	color: #666;
	text-align: center;
}

.link {
	color: #26c160;
}
</style>
