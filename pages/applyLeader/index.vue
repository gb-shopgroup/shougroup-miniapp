<template>
	<view class="apply-page" :style="miniNavPageStyle()">
		<view class="nav-title" :style="miniNavBarStyle()">
			<image class="nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
			<text :style="miniNavTitleStyle()">团长入住</text>
		</view>

		<!-- 顶部横幅 -->
		<image class="banner" src="/static/image/applyleader/applybj.png" mode="widthFix"></image>

		<!-- 基础信息表单卡片 -->
		<view class="form-card">
			<view class="card-title">
				<view class="title-line"></view>
				<text>基础信息</text>
				<view class="title-line"></view>
			</view>

			<view class="field-row">
				<view class="field-icon">姓</view>
				<input type="text" v-model="name" placeholder="姓名" maxlength="20" />
			</view>

			<view class="field-row">
				<view class="field-icon">机</view>
				<input type="number" v-model="mobile" placeholder="手机号" maxlength="11" />
			</view>

			<button class="btn-submit" :disabled="isRequesting" @click="submitApply">提交申请</button>

			<view class="form-hint">我们将尽快与您联系</view>
		</view>

		<!-- 特性介绍 -->
		<view class="feature-card">
			<view class="feature-item">
				<image src="/static/image/applyleader/lltg.png" mode="aspectFit"></image>
				<text class="feature-name">邻里团购</text>
				<text class="feature-desc">方便社区居民购买</text>
			</view>
			<view class="feature-item">
				<image src="/static/image/applyleader/ordermanage.png" mode="aspectFit"></image>
				<text class="feature-name">订单管理</text>
				<text class="feature-desc">在线处理订单</text>
			</view>
			<view class="feature-item">
				<image src="/static/image/applyleader/yongjin.png" mode="aspectFit"></image>
				<text class="feature-name">佣金收益</text>
				<text class="feature-desc">成交获得收益</text>
			</view>
		</view>
	</view>
</template>

<script>
import { applyBecomeLeader } from "@/api/group.js"
import { requireMemberLogin } from "@/utils/auth.js"
export default {
	data() {
		return {
			name: '',
			mobile: '',
			isRequesting: false // 请求锁，防止重复提交
		}
	},
	methods: {
		// 提交团长申请
		async submitApply() {
			// 未注册先引导登录，登录后回到本页继续提交
			if(!requireMemberLogin({ tip: '请先登录后再申请' })) return
			const name = this.name.trim()
			if (!name) {
				uni.showToast({ title: '请输入姓名', icon: 'none' })
				return
			}
			if (!/^1\d{10}$/.test(this.mobile.trim())) {
				uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
				return
			}

			// 防重复提交
			if (this.isRequesting) return
			this.isRequesting = true
			uni.showLoading({ title: '提交中...', mask: true })

			try {
				await applyBecomeLeader({ name, mobile: this.mobile.trim() })
				uni.showToast({ title: '申请已提交' })
				setTimeout(() => { this.goBack() }, 1500)
			} catch (err) {
				console.log('申请成为团长失败：', err)
			} finally {
				uni.hideLoading()
				this.isRequesting = false
			}
		},
		goBack() {
			if (getCurrentPages().length > 1) {
				uni.navigateBack({ delta: 1 })
				return
			}
			uni.switchTab({ url: '/pages/index/index' })
		}
	}
}
</script>

<style lang="scss" scoped>
.apply-page {
	min-height: 100vh;
	background: #f5f6f7;
	display: flex;
	flex-direction: column;
}

.nav-title {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 20;
	box-sizing: border-box;
	text-align: center;
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

.nav-back {
	position: absolute;
	left: 28rpx;
	width: 38rpx;
	height: 38rpx;
}

.banner {
	width: 100%;
	display: block;
}

.form-card {
	width: 630rpx;
	margin: -110rpx auto 0;
	position: relative;
	z-index: 10;
	box-sizing: border-box;
	padding: 44rpx 40rpx 40rpx;
	background: #fff;
	border-radius: 24rpx;
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}

.card-title {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 20rpx;
	margin-bottom: 44rpx;
	text {
		font-size: 32rpx;
		font-weight: 600;
		color: #222;
	}
}

.title-line {
	width: 60rpx;
	height: 4rpx;
	border-radius: 2rpx;
	background: #26c160;
}

.field-row {
	height: 92rpx;
	padding: 0 26rpx;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	background: #fff;
	border: 1rpx solid #d8d8d8;
	border-radius: 46rpx;
	margin-bottom: 32rpx;
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
	width: 40rpx;
	height: 40rpx;
	border: 2rpx solid #999;
	border-radius: 8rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20rpx;
	color: #666;
	flex-shrink: 0;
}

.btn-submit {
	width: 100%;
	height: 92rpx;
	margin-top: 16rpx;
	background: #26c160;
	color: #fff;
	font-size: 32rpx;
	font-weight: 500;
	border-radius: 46rpx;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
}

.btn-submit::after {
	border: none;
}

.btn-submit[disabled] {
	opacity: .6;
	color: #fff;
	background: #26c160;
}

.form-hint {
	margin-top: 28rpx;
	font-size: 26rpx;
	color: #999;
	text-align: center;
}

.feature-card {
	width: 630rpx;
	margin: 30rpx auto 60rpx;
	box-sizing: border-box;
	padding: 34rpx 24rpx;
	background: #fff;
	border-radius: 24rpx;
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
	display: flex;
}

.feature-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	image {
		width: 88rpx;
		height: 88rpx;
	}
}

.feature-name {
	margin-top: 14rpx;
	font-size: 28rpx;
	font-weight: 600;
	color: #222;
}

.feature-desc {
	margin-top: 8rpx;
	font-size: 22rpx;
	color: #999;
}
</style>
