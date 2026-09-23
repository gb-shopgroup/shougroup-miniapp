<template>
<view class="container">
	<view class="page">
		<view class="leader-profile">
			<image class="profile-avatar" :src="avatarSrc" mode="aspectFill" @error="handleAvatarLoadError"></image>
			<text class="profile-name">{{ roleTitle }}</text>
		</view>
		<view class="workbench-grid">
			<view class="menu-item" v-if="canUse(50)" @click="goToShopPage">
				<image class="menu-icon" src="/static/image/leader-dashboard/shop.png" mode="aspectFit"></image>
				<text>我的店铺</text>
			</view>
			<view class="menu-item" v-if="isLeaderWorkbench()" @click="goToAccountPage">
				<image class="menu-icon" src="/static/image/leader-dashboard/account.png" mode="aspectFit"></image>
				<text>账户信息</text>
			</view>
			<view class="menu-item" v-if="canUse(30)" @click="goToOrderPage">
				<image class="menu-icon" src="/static/image/leader-dashboard/order.png" mode="aspectFit"></image>
				<text>团购订单</text>
			</view>
			<view class="menu-item" v-if="canUse(30)" @click="scanOrder">
				<image class="menu-icon" src="/static/image/leader-dashboard/scan.png" mode="aspectFit"></image>
				<text>扫码核销</text>
			</view>
			<view class="workbench-divider"></view>
			<view class="menu-item" v-if="canUse(10)" @click="goToGoodsPage">
				<image class="menu-icon" src="/static/image/leader-dashboard/goods.png" mode="aspectFit"></image>
				<text>商品库</text>
			</view>
			<view class="menu-item" v-if="canUse(20)" @click="goToGroupPage">
				<image class="menu-icon" src="/static/image/leader-dashboard/group.png" mode="aspectFit"></image>
				<text>团购</text>
			</view>
			<view class="menu-item" v-if="canUse(70)" @click="goToPointPage">
				<image class="menu-icon" src="/static/image/leader-dashboard/point.png" mode="aspectFit"></image>
				<text>我的自提点</text>
			</view>
			<view class="menu-item" @click="switchToMember">
				<image class="menu-icon" src="/static/image/leader-dashboard/member.png" mode="aspectFit"></image>
				<text>切换团员</text>
			</view>
			<view class="menu-item" v-if="isLeaderWorkbench() && leaderSuper" @click="goToMemberPage">
				<image class="menu-icon" src="/static/image/leader-dashboard/member.png" mode="aspectFit"></image>
				<text>我的团员</text>
			</view>
			<view class="menu-item" v-if="isLeaderWorkbench() && canUse(30)" @click="goToReconciliationPage">
				<image class="menu-icon" src="/static/image/leader-dashboard/reconcile.png" mode="aspectFit"></image>
				<text>对账单</text>
			</view>
			<view class="menu-item" v-if="isLeaderWorkbench() && canUse(30)" @click="goToRefundPage">
				<image class="menu-icon" src="/static/image/leader-dashboard/refund.png" mode="aspectFit"></image>
				<text>批量退款</text>
			</view>
			<view class="menu-item" v-if="isLeaderWorkbench() && canUse(80)" @click="goToStaffPage">
				<image class="menu-icon" src="/static/image/leader-dashboard/staff.png" mode="aspectFit"></image>
				<text>我的员工</text>
			</view>
			<view class="menu-item" v-if="canOpenBlackList()" @click="goToBlackListPage">
				<image class="menu-icon" src="/static/image/leader-dashboard/black.png" mode="aspectFit"></image>
				<text>黑名单</text>
			</view>
		</view>
		<view class="agreement" @click="gotoArticle(1)">《用户服务协议》</view>
	</view>
</view>
</template>

<script>
import { parseLeaderOrderScanResult } from "@/utils/leaderOrder.js"
import { DEFAULT_STAFF_AUTH_IDS } from "@/utils/leaderConfig.js"
import env from "@/config/env.js"

function resolveAvatarUrl(value) {
	const avatar = String(value || '').trim()
	if (!avatar || avatar.startsWith('/static/') || /^(https?:|data:|wxfile:)/i.test(avatar)) return avatar
	if (avatar.startsWith('//')) return `https:${avatar}`
	return `${env.baseURL}${avatar.startsWith('/') ? '' : '/'}${avatar}`
}

export default {
	data() {
		return {
			leaderAuth: [],
			leaderSuper: false,
			leaderRole: 'staff',
			roleTitle: '员工工作台',
			leaderAvatar: '',
			avatarFallbackUsed: false
		}
	},
	computed: {
		avatarSrc() {
			return this.avatarFallbackUsed || !this.leaderAvatar ? '/static/image/head.png' : resolveAvatarUrl(this.leaderAvatar)
		}
	},
	onLoad() {
		this.initLeaderAvatar()
		this.leaderRole = uni.getStorageSync('leader_role') || uni.getStorageSync('current_role') || 'staff'
		this.roleTitle = this.leaderRole === 'leader' ? '团长工作台' : '员工工作台'
		const auth = uni.getStorageSync('leader_auth') || ''
		this.leaderAuth = auth ? auth.split(",").map(Number) : []
		const leaderSuper = uni.getStorageSync('leader_super')
		this.leaderSuper = leaderSuper === true || leaderSuper === 1 || leaderSuper === 'true' || leaderSuper === '1'
	},
	onShow() {
		this.initLeaderAvatar()
	},
	methods: {
		initLeaderAvatar() {
			const shopInfo = uni.getStorageSync('leader_shop_info') || {}
			this.avatarFallbackUsed = false
			this.leaderAvatar = shopInfo.shopLogo || shopInfo.avatar || shopInfo.logo || shopInfo.shopAvatar || shopInfo.headImg || uni.getStorageSync('leader_avatar') || uni.getStorageSync('avatar') || ''
		},
		handleAvatarLoadError() {
			this.avatarFallbackUsed = true
		},
		isLeaderWorkbench() {
			return this.leaderRole === 'leader'
		},
		isStaffWorkbench() {
			return this.leaderRole === 'staff'
		},
		canUse(authId) {
			if (this.isStaffWorkbench()) return DEFAULT_STAFF_AUTH_IDS.includes(authId)
			return this.leaderSuper || this.leaderAuth.includes(authId)
		},
		canOpenBlackList() {
			return this.leaderSuper || this.isStaffWorkbench()
		},
		openPage(url) {
			uni.navigateTo({
				url,
				fail: () => { uni.redirectTo({ url }) }
			})
		},
		gotoArticle(articleId) {
			const url = '/pages/article/index?id=' + articleId
			uni.navigateTo({
				url,
				fail: () => { uni.redirectTo({ url }) }
			})
		},
		goToShopPage() {
			if (!this.canUse(50)) return uni.showToast({ title: '没有权限', icon: 'none' })
			this.openPage('/pagesA/info/index')
		},
		goToAccountPage() {
			if (!this.isLeaderWorkbench()) return uni.showToast({ title: '没有权限', icon: 'none' })
			this.openPage('/pagesA/business/index')
		},
		goToOrderPage() {
			if (!this.canUse(30)) return uni.showToast({ title: '没有权限', icon: 'none' })
			this.openPage('/pagesA/order/index')
		},
		scanOrder() {
			if (!this.canUse(30)) return uni.showToast({ title: '没有权限', icon: 'none' })
			// 不要限定 scanType：限定 ['qrCode'] 会导致微信小程序码扫不出来（与订单页扫码保持一致）。
			uni.scanCode({
				success: res => {
					const scan = parseLeaderOrderScanResult(res)
					console.log('[扫码核销] 码内容:', res.path || res.result || res.scene || '', '| 解析:', JSON.stringify(scan))
					// 门店核销码的 scene 是 shopId=X，是给顾客自助核销用的，团长侧不处理但要给出准确提示。
					if (!scan.orderNo && scan.shopId) {
						uni.showToast({ title: '这是门店核销码，请让顾客扫码自助核销', icon: 'none' })
						return
					}
					if (!scan.orderNo) {
						uni.showToast({ title: '请扫描用户订单核销码', icon: 'none' })
						return
					}
					const params = [
						'action=verify',
						'orderNo=' + encodeURIComponent(scan.orderNo)
					]
					if (scan.receiptCode) params.push('receiptCode=' + encodeURIComponent(scan.receiptCode))
					this.openPage('/pagesA/order/index?' + params.join('&'))
				},
				fail: err => {
					if (err && /cancel/i.test(String(err.errMsg || ''))) return
					uni.showToast({ title: '扫码失败，请重试', icon: 'none' })
				}
			})
		},
		goToGoodsPage() {
			if (!this.canUse(10)) return uni.showToast({ title: '没有权限', icon: 'none' })
			this.openPage('/pagesA/goods/index')
		},
		goToGroupPage() {
			if (!this.canUse(20)) return uni.showToast({ title: '没有权限', icon: 'none' })
			this.openPage('/pagesA/group/index')
		},
		goToPointPage() {
			if (!this.canUse(70)) return uni.showToast({ title: '没有权限', icon: 'none' })
			this.openPage('/pagesA/point/index')
		},
		goToRefundPage() {
			if (!this.isLeaderWorkbench()) return uni.showToast({ title: '没有权限', icon: 'none' })
			if (!this.canUse(30)) return uni.showToast({ title: '没有权限', icon: 'none' })
			this.openPage('/pagesA/order/refund')
		},
		goToReconciliationPage() {
			if (!this.isLeaderWorkbench()) return uni.showToast({ title: '没有权限', icon: 'none' })
			if (!this.canUse(30)) return uni.showToast({ title: '没有权限', icon: 'none' })
			this.openPage('/pagesA/business/account')
		},
		switchToMember() {
			uni.setStorageSync('current_role', 'member')
			uni.switchTab({ url: '/pages/index/index' })
		},
		goToBlackListPage() {
			if (!this.canOpenBlackList()) return uni.showToast({ title: '没有权限', icon: 'none' })
			this.openPage('/pagesA/black/index')
		},
		goToStaffPage() {
			if (!this.isLeaderWorkbench()) return uni.showToast({ title: '没有权限', icon: 'none' })
			if (!this.canUse(80)) return uni.showToast({ title: '没有权限', icon: 'none' })
			this.openPage('/pagesA/staff/index')
		},
		goToMemberPage() {
			if (!this.isLeaderWorkbench()) return uni.showToast({ title: '没有权限', icon: 'none' })
			if (!this.leaderSuper) return uni.showToast({ title: '没有权限', icon: 'none' })
			this.openPage('/pagesA/member/index')
		}
	}
}
</script>

<style lang="scss" scoped>
.page {
	position: relative;
	min-height: 100vh;
	background: #fff;
	padding: 130rpx 12rpx 40rpx;
	box-sizing: border-box;
}

.page::after {
	content: "";
	position: absolute;
	left: 0;
	right: 0;
	top: 930rpx;
	bottom: 0;
	background: #f6f6f6;
	z-index: 0;
}

.leader-profile {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	height: 110rpx;
	padding: 0 60rpx;
	background: #fff;
}

.profile-avatar {
	width: 96rpx;
	height: 96rpx;
	border-radius: 8rpx;
	background: #c8c0c0;
}

.profile-name {
	margin-left: 18rpx;
	font-size: 28rpx;
	color: #222;
}

.workbench-grid {
	position: relative;
	z-index: 1;
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	background: #fff;
	border-radius: 0;
	padding: 76rpx 0 10rpx;
}

.workbench-divider {
	grid-column: 1 / -1;
	height: 6rpx;
	background: #f5f5f5;
}

.menu-item {
	height: 150rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	font-size: 26rpx;
	color: #333;
}

.menu-icon {
	width: 64rpx;
	height: 64rpx;
	margin-bottom: 12rpx;
}

.agreement {
	position: relative;
	z-index: 1;
	margin-top: 48rpx;
	text-align: center;
	color: #19be6b;
	font-size: 26rpx;
}
</style>
