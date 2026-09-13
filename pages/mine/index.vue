<template>
<view class="container">
	<view class="member-page">
		<!-- 用户信息区 -->
		<view class="user-header" :style="userHeaderStyle">
			<image class="user-avatar" :src="avatarSrc" mode="aspectFill" @error="handleAvatarLoadError"></image>
			<text class="user-name">{{ userInfo.name || '登录' }}</text>
		</view>

		<!-- 常用功能区 -->
		<view class="menu-section">
			<view class="menu-item" @click="goMyOrder">
				<image class="menu-icon" src="/static/image/mine/order.png" mode="aspectFit"></image>
				<text class="text">我的订单</text>
			</view>
			<view class="menu-item" @click="showFeedbackHint">
				<image class="menu-icon" src="/static/image/mine/feedback.png" mode="aspectFit"></image>
				<text class="text">建议反馈</text>
			</view>
			<button class="menu-item menu-button" open-type="contact">
				<image class="menu-icon" src="/static/image/mine/service.png" mode="aspectFit"></image>
				<text class="text">官方客服</text>
			</button>
			<view class="menu-item" @click="goLeaderConsole">
				<image class="menu-icon" src="/static/image/mine/switch.png" mode="aspectFit"></image>
				<text class="text">{{ switchRoleText || '团长切换' }}</text>
			</view>
		</view>
		<view class="logout-btn" :class="{ disabled: loggingOut }" @click="logout">退出登录</view>
	</view>
</view>
</template>

<script>
import { getMemberInfo, getIsLeader, logoutUser } from "@/api/group.js"
import { cacheMemberLoginInfo, MEMBER_BOUND_LEADER_STORAGE_KEY, WX_ACCESS_TOKEN_STORAGE_KEY } from "@/utils/auth.js"
import env from "@/config/env.js"

const LOGIN_STORAGE_KEYS = [
	'token',
	WX_ACCESS_TOKEN_STORAGE_KEY,
	'openid',
	'name',
	'mobile',
	'avatar',
	MEMBER_BOUND_LEADER_STORAGE_KEY,
	'current_role',
	'leader_lid',
	'leader_sid',
	'leader_shop',
	'leader_name',
	'leader_auth',
	'leader_pointIds',
	'leader_super',
	'leader_role',
	'leader_avatar'
]

function resolveAvatarUrl(value) {
	const avatar = String(value || '').trim()
	if (!avatar || avatar.startsWith('/static/') || /^(https?:|data:|wxfile:)/i.test(avatar)) return avatar
	if (avatar.startsWith('//')) return `https:${avatar}`
	return `${env.baseURL}${avatar.startsWith('/') ? '' : '/'}${avatar}`
}

export default {
	data() {
		return {
			userInfo: {
				name: '',
				phone: '',
				avatar: ''
			},
			leaderId: '',
			leaderRole: '',
			switchRoleText: '',
			canSwitchLeaderConsole: false,
			avatarFallbackUsed: false,
			loggingOut: false
		}
	},
	computed: {
		avatarSrc() {
			return this.avatarFallbackUsed || !this.userInfo.avatar ? '/static/image/head.png' : resolveAvatarUrl(this.userInfo.avatar)
		},
		userHeaderStyle() {
			const metrics = this.miniNavMetrics || {}
			const navHeight = Math.max(0, Number(metrics.navBarHeight || 0))
			return `height: calc(${navHeight}px + 148rpx); padding-top: calc(${navHeight}px + 34rpx);`
		}
	},
	onLoad() {
		
		// 用户首次登录
		const token = uni.getStorageSync('token')
		if (!token) { uni.redirectTo({ url: '/pages/login/index'}) }
		
		// 本地用户信息
		this.userInfo = this.normalizeMemberInfo({
			name: uni.getStorageSync('name'),
			mobile: uni.getStorageSync('mobile'),
			avatar: uni.getStorageSync('avatar')
		})
		
		// 我的个人信息
		this.initGetMemberInfo()
		// 是否团长(需要实时访问,防止修改店员信息后无法更新)
		this.initGetIsLeader()
	},
	methods: {
		normalizeMemberInfo(member = {}) {
			const source = member || {}
			return {
				name: source.name || source.nickname || source.nickName || this.userInfo.name || '',
				mobile: source.mobile || source.telephone || source.phone || this.userInfo.mobile || '',
				avatar: source.avatar || source.avatarUrl || source.headImg || source.headimgurl || source.wxAvatar || this.userInfo.avatar || ''
			}
		},
		handleAvatarLoadError() {
			this.avatarFallbackUsed = true
		},
		// 查询我的信息
		async initGetMemberInfo() {
			try {
				
				const res = await getMemberInfo()
				this.userInfo = this.normalizeMemberInfo(res.data)
				this.avatarFallbackUsed = false
				
				cacheMemberLoginInfo(Object.assign({}, this.userInfo, {
					token: uni.getStorageSync('token')
				}))
				
			} catch (err) {
				console.log('查询我的信息失败：', err)
			}
		},
		// 查询是否团长
		async initGetIsLeader() {
			
			try {
				const res = await getIsLeader()
				const leaderInfo = res.data
				const isSuper = leaderInfo.isSuper === true || leaderInfo.isSuper === 1 || leaderInfo.isSuper === 'true' || leaderInfo.super === true || leaderInfo.super === 1 || leaderInfo.super === 'true'
				this.leaderId = leaderInfo.lid || ''
				const isStaff = !isSuper && (this.leaderId !== '' || !!leaderInfo.sid)
				this.leaderRole = isSuper ? 'leader' : (isStaff ? 'staff' : '')
				this.switchRoleText = this.leaderRole === 'leader' ? '团长切换' : (this.leaderRole === 'staff' ? '员工切换' : '')
				this.canSwitchLeaderConsole = this.leaderRole !== ''
				
				// 缓存团长或员工身份数据全局生效
				uni.setStorageSync('leader_lid', leaderInfo.lid || '')
				uni.setStorageSync('leader_sid', leaderInfo.sid || '')
				uni.setStorageSync('leader_shop', leaderInfo.shop || '')
				uni.setStorageSync('leader_name', leaderInfo.name || '')
				uni.setStorageSync('leader_auth', leaderInfo.auth || '')
				uni.setStorageSync('leader_pointIds', leaderInfo.pointIds || '')
				uni.setStorageSync('leader_super', isSuper)
				uni.setStorageSync('leader_role', this.leaderRole)
				const leaderAvatar = leaderInfo.shopLogo || leaderInfo.avatar || leaderInfo.logo || leaderInfo.shopAvatar || leaderInfo.headImg || ''
				if (leaderAvatar) uni.setStorageSync('leader_avatar', leaderAvatar)
				
			} catch (err) {
				console.log('查询是否团长败：', err)
			}
		},
		// 去我的订单
		goMyOrder() {
			uni.switchTab({ url: '/pages/order/index' })
		},
		showFeedbackHint() {
			uni.showToast({ title: '建议反馈暂未开放', icon: 'none' })
		},
		// 去团长控制台
		goLeaderConsole() {
			if (!this.canSwitchLeaderConsole) {
				uni.showToast({ title: '没有团长或员工权限', icon: 'none' })
				return
			}
			uni.setStorageSync('current_role', this.leaderRole)
			const url = this.leaderId ? '/pagesA/dashboard/index?id=' + this.leaderId : '/pagesA/dashboard/index'
			uni.navigateTo({
				url,
				fail: err => {
					console.log('切换团长工作台失败：', err)
					uni.reLaunch({ url })
				}
			})
		},
		logout() {
			if (this.loggingOut) return
			uni.showModal({
				title: '提示',
				content: '确认退出登录？',
				success: async res => {
					if (!res.confirm) return
					this.loggingOut = true
					try {
						await logoutUser()
					} catch (err) {
						console.log('退出登录接口失败：', err)
					} finally {
						LOGIN_STORAGE_KEYS.forEach(key => uni.removeStorageSync(key))
						this.loggingOut = false
						uni.reLaunch({ url: '/pages/login/index' })
					}
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #f6f6f6;
}

.member-page {
	min-height: 100vh;
	background: #f6f6f6;
}

.user-header {
	display: flex;
	align-items: center;
	gap: 22rpx;
	padding-right: 58rpx;
	padding-bottom: 26rpx;
	padding-left: 58rpx;
	box-sizing: border-box;
	background: #fff;
}

.user-avatar {
	width: 96rpx;
	height: 96rpx;
	border-radius: 10rpx;
	background: #c7c0c0;
	flex: 0 0 96rpx;
}

.user-name {
	font-size: 28rpx;
	line-height: 96rpx;
	color: #1f1f1f;
}

.menu-section {
	background: #fff;
	border-top: 24rpx solid #f6f6f6;
	border-bottom: 14rpx solid #f6f6f6;
	display: flex;
	min-height: 206rpx;
}
.menu-item {
	display: flex;
	flex: 0 0 25%;
	box-sizing: border-box;
	min-width: 0;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 18rpx;
}

.menu-button {
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: 0;
	background: transparent;
	line-height: 1;
}

.menu-button::after {
	border: 0;
}

.logout-btn {
	margin: 56rpx 42rpx 0;
	padding: 22rpx 0;
	border-top: 1rpx solid #f0f0f0;
	text-align: center;
	font-size: 26rpx;
	color: #999;
}

.logout-btn.disabled {
	opacity: 0.55;
}
.text {
	font-size: 26rpx;
	line-height: 36rpx;
	color: #1f1f1f;
}

.menu-icon {
	width: 54rpx;
	height: 54rpx;
}
</style>
