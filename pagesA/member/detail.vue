<template>
	<view class="container" :style="miniNavPageStyle()">
		<view class="leader-nav" :style="miniNavBarStyle()">
			<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
			<text class="title" :style="miniNavTitleStyle()">团员详情</text>
			<text class="nav-space"></text>
		</view>

		<view class="profile">
			<image class="avatar" :src="member.avatar || '/static/image/head.png'" mode="aspectFill"></image>
			<view class="profile-main">
				<text class="name">{{ member.nickname || '团员' }}</text>
				<text class="mobile">{{ member.mobile }}</text>
			</view>
		</view>

		<view class="summary-grid">
			<view class="summary-item">
				<text class="summary-value">¥{{ member.consumeAmount }}</text>
				<text class="summary-label">消费总额</text>
			</view>
			<view class="summary-item">
				<text class="summary-value">¥{{ member.refundAmount }}</text>
				<text class="summary-label">退款金额</text>
			</view>
			<view class="summary-item">
				<text class="summary-value">{{ member.orderCount }}</text>
				<text class="summary-label">跟团次数</text>
			</view>
			<view class="summary-item">
				<text class="summary-value">{{ member.viewCount }}</text>
				<text class="summary-label">查看次数</text>
			</view>
		</view>

		<view class="dynamic-panel">
			<view class="section-title">团员动态</view>
			<view v-for="group in member.dynamicList" :key="group.date" class="day-group">
				<view class="date">{{ group.date }}</view>
				<view v-for="(item, index) in group.items" :key="index" class="dynamic-item">
					<text class="time">{{ item.time }}</text>
					<text class="tag" :class="item.action">{{ actionText(item.action) }}</text>
					<text class="content">{{ item.content }}</text>
				</view>
			</view>
			<view v-if="!loading && member.dynamicList.length === 0" class="empty">暂无动态</view>
			<view v-if="loading" class="empty">加载中...</view>
		</view>
	</view>
</template>

<script>
import { getLeaderMemberDetail } from "@/api/leader.js"
import { getMemberActionText, normalizeLeaderMemberDetail } from "@/utils/leaderMember.js"

export default {
	data() {
		return {
			memberId: 0,
			loading: false,
			member: normalizeLeaderMemberDetail()
		}
	},
	onLoad(options) {
		this.memberId = Number(options.memberId || 0)
		this.loadDetail()
	},
	methods: {
		goBack() {
			uni.navigateBack({
				delta: 1,
				fail: () => uni.redirectTo({ url: '/pagesA/member/index' })
			})
		},
		async loadDetail() {
			if (!this.memberId) {
				uni.showToast({ title: '团员信息缺失', icon: 'none' })
				return
			}
			this.loading = true
			try {
				const res = await getLeaderMemberDetail({ memberId: this.memberId })
				this.member = normalizeLeaderMemberDetail(res.data || {})
			} catch (err) {
				uni.showToast({ title: err.msg || err || '获取团员详情失败', icon: 'none' })
				console.log('获取团员详情失败：', err)
			} finally {
				this.loading = false
			}
		},
		actionText(action) {
			return getMemberActionText(action)
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #f6f6f6;
	box-sizing: border-box;
}

.leader-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 30;
	background: #fff;
	box-sizing: border-box;
}

.back {
	position: absolute;
	left: 28rpx;
	width: 160rpx;
	display: flex;
	align-items: center;
	color: #555;
	font-size: 56rpx;
}

.title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	text-align: center;
	color: #111;
	font-size: 32rpx;
	font-weight: 600;
}

.nav-space {
	display: block;
	min-width: 0;
}

.profile {
	display: flex;
	align-items: center;
	gap: 24rpx;
	padding: 32rpx 32rpx 28rpx;
	background: #fff;
}

.avatar {
	width: 108rpx;
	height: 108rpx;
	border-radius: 8rpx;
	background: #eee;
}

.profile-main {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
	gap: 12rpx;
}

.name {
	overflow: hidden;
	color: #111;
	font-size: 34rpx;
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.mobile {
	color: #666;
	font-size: 26rpx;
}

.summary-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	margin-top: 16rpx;
	padding: 28rpx 12rpx;
	background: #fff;
}

.summary-item {
	display: flex;
	min-width: 0;
	flex-direction: column;
	align-items: center;
	gap: 10rpx;
}

.summary-value {
	max-width: 100%;
	overflow: hidden;
	color: #111;
	font-size: 28rpx;
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.summary-label {
	color: #777;
	font-size: 23rpx;
}

.dynamic-panel {
	margin-top: 16rpx;
	padding: 0 28rpx 48rpx;
	background: #fff;
}

.section-title {
	padding: 28rpx 0 12rpx;
	color: #111;
	font-size: 30rpx;
	font-weight: 600;
}

.day-group {
	padding-top: 18rpx;
}

.date {
	margin-bottom: 16rpx;
	color: #666;
	font-size: 24rpx;
}

.dynamic-item {
	display: flex;
	align-items: flex-start;
	gap: 14rpx;
	padding: 16rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
}

.time {
	width: 72rpx;
	color: #999;
	font-size: 24rpx;
	line-height: 36rpx;
}

.tag {
	width: 72rpx;
	height: 36rpx;
	border-radius: 6rpx;
	background: #eaf8ef;
	color: #25c463;
	font-size: 22rpx;
	line-height: 36rpx;
	text-align: center;
}

.tag.order {
	background: #fff4e5;
	color: #f39800;
}

.content {
	flex: 1;
	min-width: 0;
	color: #333;
	font-size: 25rpx;
	line-height: 36rpx;
	word-break: break-all;
}

.empty {
	padding: 64rpx 0;
	color: #999;
	font-size: 26rpx;
	text-align: center;
}
</style>
