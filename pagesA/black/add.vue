<template>
<view class="container" :style="miniNavPageStyle()">
	<view class="black-nav" :style="miniNavBarStyle()">
		<image class="nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
		<text class="nav-title" :style="miniNavTitleStyle()">添加黑名单</text>
	</view>

	<view class="form-panel">
		<view class="form-row">
			<text class="label">手机号:</text>
			<view class="search-box">
				<text class="search-icon"></text>
				<input type="number" class="form-input" placeholder="手机号" v-model="mobile" />
			</view>
			<view class="search-btn" :class="{ disabled: searching }" @click="searchMember">{{ searching ? '搜索中' : '搜索' }}</view>
		</view>

		<view class="form-row">
			<text class="label">昵称:</text>
			<view class="nickname-box">{{ memberInfo.nickname || '' }}</view>
		</view>
	</view>

	<view class="bottom-bar">
		<view class="confirm-btn" :class="{ disabled: submitting }" @click="confirmAdd">{{ submitting ? '提交中...' : '确认' }}</view>
	</view>
</view>
</template>

<script>
import { addBlackList, getMemberInfo } from "@/api/leader.js"
import { isValidMobile, normalizeBlackMember, resolveBlackMemberId } from "@/utils/leaderConfig.js"

export default {
	data() {
		return {
			mobile: '',
			memberInfo: normalizeBlackMember({}),
			searching: false,
			submitting: false
		}
	},
	methods: {
		goBack() {
			uni.navigateBack({ delta: 1 })
		},
		async searchMember() {
			const mobile = String(this.mobile || '').trim()
			if (!isValidMobile(mobile)) {
				uni.showToast({ title: '请输入正确手机号', icon: 'none' })
				return
			}
			if (this.searching) return
			this.searching = true
			try {
				const res = await getMemberInfo({ mobile })
				const member = normalizeBlackMember(res.data || {})
				if (!resolveBlackMemberId(member)) {
					this.memberInfo = normalizeBlackMember({})
					uni.showToast({ title: '未查询到用户', icon: 'none' })
					return
				}
				this.memberInfo = member
			} catch (err) {
				this.memberInfo = normalizeBlackMember({})
				console.log('查询团员失败：', err)
				uni.showToast({ title: err && err.msg ? err.msg : '未查询到用户', icon: 'none' })
			} finally {
				this.searching = false
			}
		},
		async confirmAdd() {
			const memberId = resolveBlackMemberId(this.memberInfo)
			if (!memberId) {
				uni.showToast({ title: '请先搜索团员', icon: 'none' })
				return
			}
			if (this.submitting) return
			this.submitting = true
			try {
				await addBlackList({ memberId })
				uni.showToast({ title: '添加成功', icon: 'success' })
				setTimeout(() => this.goBack(), 500)
			} catch (err) {
				console.log('添加黑名单失败：', err)
				uni.showToast({ title: err && err.msg ? err.msg : '添加失败', icon: 'none' })
			} finally {
				this.submitting = false
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	padding-bottom: 132rpx;
	background: #fff;
	box-sizing: border-box;
}

.black-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 30;
	background: #fff;
	box-sizing: border-box;
}

.nav-back {
	position: absolute;
	left: 24rpx;
	width: 36rpx;
	height: 36rpx;
}

.nav-title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	color: #111;
	font-size: 34rpx;
	font-weight: 500;
	text-align: center;
}

.form-panel {
	padding: 100rpx 80rpx 0;
	box-sizing: border-box;
}

.form-row {
	display: flex;
	align-items: center;
	margin-bottom: 70rpx;
}

.label {
	width: 110rpx;
	color: #111;
	font-size: 28rpx;
	text-align: right;
}

.search-box,
.nickname-box {
	flex: 1;
	min-width: 0;
	height: 48rpx;
	margin-left: 20rpx;
	border: 1rpx solid #bfbfbf;
	border-radius: 5rpx;
	box-sizing: border-box;
}

.search-box {
	display: flex;
	align-items: center;
	padding: 0 16rpx 0 42rpx;
}

.search-icon {
	position: relative;
	width: 20rpx;
	height: 20rpx;
	margin-left: -28rpx;
	margin-right: 8rpx;
	border: 4rpx solid #c7c7c7;
	border-radius: 50%;
	box-sizing: border-box;
}

.search-icon::after {
	position: absolute;
	content: '';
	right: -9rpx;
	bottom: -7rpx;
	width: 12rpx;
	height: 4rpx;
	background: #c7c7c7;
	border-radius: 2rpx;
	transform: rotate(45deg);
}

.form-input {
	flex: 1;
	min-width: 0;
	height: 44rpx;
	min-height: 44rpx;
	padding: 0;
	color: #333;
	font-size: 24rpx;
	line-height: 44rpx;
}

.search-btn {
	width: 96rpx;
	height: 40rpx;
	margin-left: 18rpx;
	line-height: 38rpx;
	text-align: center;
	border: 1rpx solid #d8d8d8;
	border-radius: 4rpx;
	box-sizing: border-box;
	color: #777;
	font-size: 22rpx;
	background: #fff;
}

.search-btn.disabled,
.confirm-btn.disabled {
	opacity: 0.55;
}

.nickname-box {
	padding: 0 18rpx;
	color: #333;
	font-size: 24rpx;
	line-height: 46rpx;
}

.bottom-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 20;
	padding: 18rpx 24rpx 32rpx;
	background: #fff;
	box-sizing: border-box;
}

.confirm-btn {
	height: 90rpx;
	line-height: 90rpx;
	text-align: center;
	color: #fff;
	font-size: 28rpx;
	background: #25c56b;
	border-radius: 8rpx;
}
</style>
