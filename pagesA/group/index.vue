<template>
<view class="container" :style="miniNavPageStyle()">
	<view class="leader-nav" :style="miniNavBarStyle()">
		<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
		<text class="title" :style="miniNavTitleStyle()">团购</text>
		<text class="nav-placeholder"></text>
	</view>

	<view class="search-section">
		<view class="search-box">
			<text class="search-label">团购</text>
			<text class="search-divider"></text>
			<input v-model="keyword" confirm-type="search" placeholder="请输入团购名称" @confirm="searchGroup" />
			<text class="search-btn" @click="searchGroup">搜索</text>
		</view>
	</view>

	<view class="tabs">
		<view
			v-for="tab in statusTabs"
			:key="tab.value"
			class="tab"
			:class="{ active: status === tab.value }"
			@click="changeStatus(tab)"
		>{{ tab.label }}</view>
	</view>

	<scroll-view class="page" :style="groupListStyle" scroll-y @scrolltolower="nextPage">
		<view class="group-card" v-for="item in groupList" :key="item.id" @click="detailGroup(item.id)">
			<view class="card-head">
				<view class="title-block">
					<text class="group-name">{{ item.name || '团购名称' }}</text>
					<text class="price-range">¥{{ formatPriceRange(item) }}</text>
				</view>
				<text class="publish-date">{{ item.endDateText || '' }}发布</text>
			</view>

			<view class="image-row">
				<image v-for="(img, index) in groupImages(item)" :key="index" class="group-img" :src="img" mode="aspectFill"></image>
			</view>

			<view class="status-row">
				<text class="status-text" :class="item.statusInfo.tone">{{ item.statusInfo.text }}</text>
				<view class="card-actions">
					<view v-if="item.statusInfo.value === 1" class="outline-btn" @click.stop="shareLeaderGroupPosterImg(item)">生成海报</view>
					<button class="outline-btn share-btn" open-type="share" :data-share="shareData(item)" @click.stop="shareLeaderGroupPoster(item)">分享</button>
				</view>
			</view>

			<view class="metrics">
				<text>实际收入： ¥{{ formatAmount(item.realIncome || item.income || item.price || 0) }}</text>
				<text>退款金额： ¥{{ formatAmount(item.refundAmount || 0) }}</text>
				<text>跟团人数： {{ item.order || item.virtual || 0 }}</text>
			</view>
		</view>

		<view v-if="!loading && groupList.length === 0" class="empty">暂无团购</view>
		<view v-else class="more">{{ hasMore ? '上拉加载更多' : '没有更多了' }}</view>
	</scroll-view>

	<view class="bottom-actions">
		<view class="bottom-btn" @click="addGroup">添加团购</view>
		<view class="bottom-btn" @click="goCopyList">复制团购</view>
	</view>

	<PosterImgDialog ref="imgDialogRef"></PosterImgDialog>
	<PosterDialog ref="posterDialogRef" @poster="shareLeaderGroupPosterImg"></PosterDialog>
</view>
</template>

<script>
import PosterImgDialog from "./img.vue"
import PosterDialog from "./poster.vue"
import {
	getLeaderGroupCount,
	getLeaderGroupList,
	makeLeaderGroupPoster,
	shareLeaderGroupPoster as requestShareLeaderGroupPoster
} from "@/api/leader.js"
import { getLeaderGroupCoverImages, normalizeLeaderGroup } from "@/utils/leaderGroup.js"

export default {
	components: { PosterDialog, PosterImgDialog },
	data() {
		return {
			leaderId: 0,
			keyword: '',
			status: 0,
			statusTabs: [
				{ label: '全部', value: 0 },
				{ label: '开团中', value: 1 },
				{ label: '未开始', value: 2 },
				{ label: '已结束', value: 3 }
			],
			page: 1,
			pageSize: 10,
			pageTotal: 0,
			hasMore: true,
			loading: false,
			hasLoadedGroupList: false,
			groupList: []
		}
	},
	computed: {
		groupListStyle(){
			return `height: calc(100vh - ${this.miniNavMetrics.navBarHeight}px - 318rpx);`
		}
	},
	onLoad() {
		this.leaderId = uni.getStorageSync('leader_lid') || 0
		this.initGroupList(true)
	},
	onShow() {
		if (this.hasLoadedGroupList) this.initGroupList(true)
	},
	onShareAppMessage(res) {
		if (res.from === 'button') {
			const share = res.target.dataset.share || {}
			return {
				title: share.title || '店小团',
				imageUrl: share.imageUrl || 'https://shopgroup.obs.cn-north-9.myhuaweicloud.com/logo.png',
				path: share.path || '/pages/index/index'
			}
		}
		return {
			title: "店小团",
			path: "/pages/index/index",
			imageUrl: "https://shopgroup.obs.cn-north-9.myhuaweicloud.com/logo.png"
		}
	},
	methods: {
		async initGroupList(reset = false){
			if(this.loading) return
			this.loading = true
			if(reset){
				this.page = 1
				this.groupList = []
				this.hasMore = true
			}
			try {
				const params = { cat: 0, catId: 0, name: this.keyword, status: this.status, page:this.page, pageSize:this.pageSize }
				const res = await getLeaderGroupList(params)
				const list = Array.isArray(res.data) ? res.data.map(normalizeLeaderGroup) : []
				this.groupList = this.page === 1 ? list : this.groupList.concat(list)
				this.hasMore = list.length >= this.pageSize
			} catch (err) {
				console.log('初始化团购列表失败：', err)
			}
			try {
				const res = await getLeaderGroupCount({ cat: 0, catId: 0, name: this.keyword, status: this.status })
				const total = Number(res.data || 0)
				this.pageTotal = total > 0 ? Math.ceil(total / this.pageSize) : 0
			} catch (err) {
				console.log('初始化团购总数失败：', err)
			}
			this.loading = false
			this.hasLoadedGroupList = true
		},
		nextPage(){
			if(!this.hasMore || this.loading) return
			this.page += 1
			this.initGroupList(false)
		},
		changeStatus(tab){
			this.status = tab.value
			this.initGroupList(true)
		},
		searchGroup(){
			this.initGroupList(true)
		},
		addGroup() {
			const url = '/pagesA/group/add'
			uni.navigateTo({ url: url }).catch(err => { uni.redirectTo({ url: url }) })
		},
		detailGroup(groupId){
			const url = '/pagesA/group/detail?id=' + groupId
			uni.navigateTo({ url: url }).catch(err => { uni.redirectTo({ url: url }) })
		},
		goCopyList(){
			uni.navigateTo({ url: '/pagesA/group/copy' })
		},
		goBack(){
			uni.navigateBack({ delta: 1 })
		},
		groupImages(item) {
			const images = getLeaderGroupCoverImages(item)
			return images.length ? images : ['/static/image/logo.png']
		},
		formatAmount(value) {
			return Number(value || 0).toFixed(2)
		},
		formatPriceRange(item) {
			const min = this.formatAmount(item.price)
			const max = this.formatAmount(item.price2 || item.price)
			return min === max ? min : `${min}-${max}`
		},
		shareData(item) {
			return {
				title: item.name || '店小团',
				imageUrl: item.img || 'https://shopgroup.obs.cn-north-9.myhuaweicloud.com/logo.png',
				path: `/pages/group/index?id=${item.id}&lid=${item.lid || this.leaderId}`
			}
		},
		async shareLeaderGroupPoster(item){
			uni.showLoading({ title: '加载海报中...', mask: true })
			try {
				const res = await requestShareLeaderGroupPoster({ groupId:item.id })
				this.$refs.posterDialogRef.show(item, res.data)
			} catch (err) {
				console.log('分享团购失败：', err)
			} finally {
				uni.hideLoading()
			}
		},
		async shareLeaderGroupPosterImg(item){
			uni.showLoading({ title: '生成海报中...', mask: true })
			try {
				const res = await makeLeaderGroupPoster({ groupId:item.id })
				this.$refs.imgDialogRef.show(res.data)
			} catch (err) {
				console.log('生成团购海报失败：', err)
				uni.showToast({ title: '生成海报失败', icon: 'none' })
			} finally {
				uni.hideLoading()
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #f6f6f6;
	color: #222;
	padding-bottom: 136rpx;
	box-sizing: border-box;
}

.leader-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 20;
	display: grid;
	grid-template-columns: 160rpx minmax(0, 1fr) 160rpx;
	align-items: start;
	padding: 0 28rpx;
	background: #fff;
	box-sizing: border-box;
}

.back {
	position: absolute;
	left: 28rpx;
	width: 160rpx;
	display: flex;
	align-items: center;
	font-size: 48rpx;
	color: #666;
}

.title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	font-size: 34rpx;
	font-weight: 500;
	text-align: center;
}

.nav-placeholder {
	display: block;
	min-width: 0;
}

.search-section {
	padding: 48rpx 50rpx 16rpx;
	background: #fff;
	border-top: 12rpx solid #f6f6f6;
	box-sizing: border-box;
}

.search-box {
	display: flex;
	align-items: center;
	height: 62rpx;
	padding: 0 22rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	box-sizing: border-box;
}

.search-label {
	font-size: 24rpx;
	color: #333;
}

.search-divider {
	width: 1rpx;
	height: 26rpx;
	margin: 0 16rpx;
	background: #cfcfcf;
}

.search-box input {
	flex: 1;
	min-width: 0;
	height: 62rpx;
	font-size: 24rpx;
	color: #333;
}

.search-btn {
	padding-left: 18rpx;
	font-size: 28rpx;
	color: #22c55e;
}

.tabs {
	height: 76rpx;
	display: flex;
	align-items: center;
	justify-content: space-around;
	background: #fff;
}

.tab {
	position: relative;
	height: 76rpx;
	line-height: 76rpx;
	color: #222;
	font-size: 28rpx;
}

.tab.active {
	color: #19be6b;
}

.tab.active::after {
	content: '';
	position: absolute;
	left: 50%;
	bottom: 0;
	width: 2em;
	height: 5rpx;
	background: #19be6b;
	transform: translateX(-50%);
}

.page {
	padding: 0 18rpx 28rpx;
	box-sizing: border-box;
}

.group-card {
	margin-bottom: 18rpx;
	padding: 26rpx 60rpx 24rpx;
	background: #fff;
	box-sizing: border-box;
}

.card-head,
.status-row,
.metrics {
	display: flex;
	align-items: flex-start;
}

.card-head {
	justify-content: space-between;
	gap: 20rpx;
}

.title-block {
	min-width: 0;
	flex: 1;
}

.group-name {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	line-height: 40rpx;
	color: #111;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.price-range {
	display: block;
	margin-top: 4rpx;
	font-size: 24rpx;
	line-height: 32rpx;
	color: #ff2517;
}

.publish-date {
	flex-shrink: 0;
	font-size: 22rpx;
	line-height: 34rpx;
	color: #888;
	white-space: nowrap;
}

.image-row {
	display: flex;
	gap: 34rpx;
	margin-top: 18rpx;
}

.group-img {
	width: 31%;
	height: 166rpx;
	background: #f0f0f0;
}

.status-row {
	justify-content: space-between;
	margin-top: 18rpx;
}

.status-text {
	font-size: 25rpx;
	line-height: 56rpx;
	color: #222;
}

.status-text.muted {
	color: #999;
}

.status-text.warning {
	color: #666;
}

.card-actions {
	display: flex;
	align-items: center;
	gap: 14rpx;
}

.outline-btn {
	min-width: 100rpx;
	height: 52rpx;
	line-height: 50rpx;
	padding: 0 16rpx;
	border: 1rpx solid #22c55e;
	border-radius: 8rpx;
	font-size: 24rpx;
	text-align: center;
	color: #22c55e;
	background: #fff;
	box-sizing: border-box;
}

.share-btn {
	margin: 0;
}

.share-btn::after {
	border: 0;
}

.metrics {
	flex-wrap: wrap;
	gap: 4rpx 70rpx;
	margin-top: 12rpx;
	font-size: 23rpx;
	line-height: 36rpx;
	color: #777;
}

.empty,
.more {
	padding: 80rpx 0;
	text-align: center;
	color: #999;
	font-size: 26rpx;
}

.more {
	padding: 24rpx 0;
}

.bottom-actions {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 30;
	display: flex;
	gap: 24rpx;
	padding: 20rpx 22rpx calc(20rpx + env(safe-area-inset-bottom));
	background: #fff;
	box-sizing: border-box;
}

.bottom-btn {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	text-align: center;
	font-size: 30rpx;
	color: #fff;
	background: #22c55e;
	border-radius: 8rpx;
}
</style>
