<template>
<view class="container">
	<view class="point-page" :style="miniNavPageStyle()">
		<view class="nav-title" :style="miniNavBarStyle()">
			<image class="nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
			<text :style="miniNavTitleStyle()">自提点管理</text>
		</view>
		<view class="filter-section">
			<view class="search-bar">
				<view class="search-icon"></view>
				<input class="search-input" v-model="keyword" placeholder="搜索自提点名称" confirm-type="search" />
			</view>
			<view class="tabs"><text class="tab active">全部</text></view>
		</view>
		<view class="point-card" v-for="point in activePoints" :key="point.id">
			<view class="point-body">
				<view class="info-row"><text class="info-label">自提点：</text><text class="info-value">{{ point.name || '--' }}</text></view>
				<view class="info-row"><text class="info-label">详细地址：</text><text class="info-value">{{ point.address || '--' }}</text></view>
				<view v-if="point.person" class="info-row"><text class="info-label">提货联系人：</text><text class="info-value">{{ point.person }}</text></view>
				<view v-if="point.phone" class="info-row"><text class="info-label">提货电话：</text><text class="info-value">{{ point.phone }}</text></view>
				<view v-if="point.img" class="info-row image-row"><text class="info-label">图片：</text><image class="point-img" :src="point.img" mode="aspectFill"></image></view>
			</view>
			<view class="point-actions">
				<text class="action danger" @click.stop="toggleStatus(point)">作废</text>
				<text class="action" @click.stop="editPoint(point)">修改</text>
			</view>
		</view>
		<view v-if="!activePoints.length" class="empty-text">暂无自提点</view>
		<view class="closed-toggle" @click="closedVisible = !closedVisible">
			<text>{{ closedVisible ? '收起已作废自提点' : '点击查看已作废自提点' }}</text>
			<view class="toggle-arrow" :class="{ open: closedVisible }"></view>
		</view>
		<view v-if="closedVisible">
			<view class="point-card disabled" v-for="point in closedPoints" :key="point.id">
				<view class="point-body">
					<view class="info-row"><text class="info-label">自提点：</text><text class="info-value">{{ point.name || '--' }}</text></view>
					<view class="info-row"><text class="info-label">详细地址：</text><text class="info-value">{{ point.address || '--' }}</text></view>
					<view class="info-row"><text class="info-label">分类：</text><text class="info-value">{{ point.categoryName || '未分类' }}</text></view>
				</view>
				<view class="point-actions">
					<text class="action" @click.stop="toggleStatus(point)">恢复</text>
				</view>
			</view>
			<view v-if="!closedPoints.length" class="empty-text small">暂无已作废自提点</view>
		</view>
		<button class="bottom-button" @click="addPoint">新增自提点</button>
	</view>
</view>
</template>

<script>
import { closeLeaderPointInfo, getLeaderPointList } from "@/api/leader.js"
import { normalizeLeaderPoint } from "@/utils/leaderConfig.js"

export default {
	data() {
		return {
			keyword: '',
			pointList: [],
			closedVisible: false
		}
	},
	computed: {
		filteredPoints() {
			const keyword = this.keyword.trim()
			return keyword ? this.pointList.filter(item => item.name.includes(keyword)) : this.pointList
		},
		activePoints() {
			return this.filteredPoints.filter(item => item.isClose === 0)
		},
		closedPoints() {
			return this.filteredPoints.filter(item => item.isClose !== 0)
		}
	},
	onLoad() {
		this.initPointList()
	},
	onShow() {
		this.initPointList()
	},
	methods: {
		goBack() {
			uni.navigateBack({ delta: 1 })
		},
		async initPointList() {
			try {
				const res = await getLeaderPointList()
				this.pointList = (Array.isArray(res.data) ? res.data : []).map(normalizeLeaderPoint)
			} catch (err) {
				console.log('自提点加载失败：', err)
				uni.showToast({ title: '自提点加载失败', icon: 'none' })
			}
		},
		addPoint() {
			uni.navigateTo({ url: '/pagesA/point/add' })
		},
		editPoint(point) {
			uni.navigateTo({ url: '/pagesA/point/add?data=' + encodeURIComponent(JSON.stringify(point)) })
		},
		toggleStatus(point) {
			const title = point.isClose === 0 ? '确认作废该自提点？' : '确认恢复该自提点？'
			uni.showModal({
				title,
				success: async res => {
					if (!res.confirm) return
					try {
						await closeLeaderPointInfo({ id: point.id })
						this.initPointList()
					} catch (err) {
						console.log('修改自提点状态失败：', err)
						uni.showToast({ title: '操作失败', icon: 'none' })
					}
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.point-page {
	min-height: 100vh;
	background: #f6f6f6;
	padding: 0 0 140rpx;
	box-sizing: border-box;
}

.nav-title {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 20;
	background: #fff;
	box-sizing: border-box;
}

.nav-title text {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	text-align: center;
	font-size: 34rpx;
	font-weight: 600;
	color: #222;
}

.nav-back {
	position: absolute;
	left: 28rpx;
	width: 36rpx;
	height: 36rpx;
}

.filter-section {
	background: #fff;
	padding: 42rpx 36rpx 0;
	box-sizing: border-box;
}

.search-bar {
	height: 38rpx;
	background: #f2f2f2;
	border-radius: 8rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.search-icon {
	position: relative;
	width: 30rpx;
	height: 30rpx;
	margin-right: 12rpx;
	border: 6rpx solid #bcbcbc;
	border-radius: 50%;
	box-sizing: border-box;
	flex-shrink: 0;
}

.search-icon::after {
	content: "";
	position: absolute;
	right: -9rpx;
	bottom: -7rpx;
	width: 14rpx;
	height: 6rpx;
	background: #bcbcbc;
	border-radius: 6rpx;
	transform: rotate(45deg);
}

.search-input {
	width: 230rpx;
	height: 38rpx;
	font-size: 28rpx;
	line-height: 38rpx;
	text-align: left;
}

.tabs {
	height: 76rpx;
	display: flex;
	align-items: center;
	margin-top: 54rpx;
	background: #fff;
}

.tab {
	position: relative;
	height: 76rpx;
	line-height: 76rpx;
	font-size: 30rpx;
	color: #19be6b;
	font-weight: 500;
}

.tab.active::after {
	content: "";
	position: absolute;
	left: 0;
	bottom: 0;
	width: 72rpx;
	height: 4rpx;
	background: #19be6b;
}

.point-card {
	background: #fff;
	margin-bottom: 18rpx;
	border-radius: 0;
	overflow: hidden;
}

.point-card.disabled {
	color: #999;
}

.point-body {
	padding: 24rpx 32rpx 28rpx;
}

.info-row {
	display: flex;
	align-items: flex-start;
	margin-bottom: 18rpx;
	font-size: 28rpx;
	line-height: 38rpx;
}

.info-row:last-child {
	margin-bottom: 0;
}

.info-label {
	width: 162rpx;
	flex-shrink: 0;
	color: #777;
}

.info-value {
	flex: 1;
	min-width: 0;
	color: #333;
	word-break: break-all;
}

.disabled .info-label,
.disabled .info-value {
	color: #999;
}

.image-row {
	align-items: flex-start;
}

.point-actions {
	min-height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 18rpx;
	padding: 0 32rpx;
	border-top: 1rpx solid #eee;
	box-sizing: border-box;
}

.action {
	min-width: 96rpx;
	height: 56rpx;
	line-height: 54rpx;
	text-align: center;
	font-size: 26rpx;
	color: #333;
	border: 1rpx solid #ddd;
	box-sizing: border-box;
}

.action.danger {
	color: #333;
}

.point-img {
	width: 98rpx;
	height: 98rpx;
	border-radius: 6rpx;
	background: #f0f0f0;
}

.closed-toggle {
	height: 96rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	margin-bottom: 18rpx;
	background: #fff;
	color: #777;
	font-size: 28rpx;
}

.toggle-arrow {
	width: 14rpx;
	height: 14rpx;
	margin-top: -4rpx;
	border-right: 3rpx solid #aaa;
	border-bottom: 3rpx solid #aaa;
	box-sizing: border-box;
	transform: rotate(45deg);
}

.toggle-arrow.open {
	margin-top: 6rpx;
	transform: rotate(225deg);
}

.empty-text {
	height: 96rpx;
	line-height: 96rpx;
	text-align: center;
	color: #999;
	font-size: 26rpx;
	background: #fff;
	margin-bottom: 18rpx;
}

.empty-text.small {
	height: 56rpx;
	line-height: 56rpx;
	font-size: 24rpx;
}

.bottom-button {
	position: fixed;
	left: 32rpx;
	right: 32rpx;
	bottom: 40rpx;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 44rpx;
	background: #19be6b;
	color: #fff;
	font-size: 32rpx;
}
</style>
