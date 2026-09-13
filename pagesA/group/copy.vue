<template>
<view class="container" :style="miniNavPageStyle()">
	<view class="leader-nav" :style="miniNavBarStyle()">
		<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
		<text class="title" :style="miniNavTitleStyle()">复制已有团</text>
		<text class="nav-placeholder"></text>
	</view>

	<view class="search-row">
		<text class="search-label">团购</text>
		<input v-model="keyword" placeholder="请输入团购名称" confirm-type="search" @confirm="searchGroup" />
		<text class="search-btn" @click="searchGroup">搜索</text>
	</view>

	<scroll-view class="list" :style="copyListStyle" scroll-y @scrolltolower="loadMore">
		<view class="group-copy-card" v-for="item in groupList" :key="item.id">
			<view class="row">
				<text class="name">{{ item.name }}</text>
				<text class="date">{{ item.endDateText }}</text>
			</view>
			<text class="price">¥ {{ item.price }}</text>
			<view class="imgs">
				<image v-if="item.img" :src="item.img" mode="aspectFill"></image>
				<image v-if="item.img2" :src="item.img2" mode="aspectFill"></image>
				<image v-if="item.img3" :src="item.img3" mode="aspectFill"></image>
			</view>
			<text class="status">{{ item.statusInfo.text }}</text>
			<button @click="copyGroup(item.id)">复制开团</button>
		</view>
		<view class="empty" v-if="!loading && groupList.length === 0">暂无团购</view>
		<view class="more" v-else>{{ hasMore ? '上拉加载更多' : '没有更多了' }}</view>
	</scroll-view>
</view>
</template>

<script>
import { getLeaderGroupList } from '@/api/leader.js'
import { normalizeLeaderGroup } from '@/utils/leaderGroup.js'

export default {
	data() {
		return {
			keyword: '',
			page: 1,
			pageSize: 10,
			hasMore: true,
			loading: false,
			groupList: []
		}
	},
	computed: {
		copyListStyle(){
			return `height: calc(100vh - ${this.miniNavMetrics.navBarHeight}px - 114rpx);`
		}
	},
	onLoad() {
		this.initList(true)
	},
	methods: {
		async initList(reset = false){
			if(this.loading) return
			this.loading = true
			if(reset){
				this.page = 1
				this.groupList = []
				this.hasMore = true
			}
			try {
				const res = await getLeaderGroupList({ name: this.keyword, status: 0, page: this.page, pageSize: this.pageSize })
				const list = Array.isArray(res.data) ? res.data.map(normalizeLeaderGroup) : []
				this.groupList = this.page === 1 ? list : this.groupList.concat(list)
				this.hasMore = list.length >= this.pageSize
			} catch (err) {
				console.log('初始化复制团购列表失败：', err)
			}
			this.loading = false
		},
		searchGroup(){
			this.initList(true)
		},
		loadMore(){
			if(!this.hasMore || this.loading) return
			this.page += 1
			this.initList(false)
		},
		copyGroup(groupId){
			uni.navigateTo({ url: '/pagesA/group/add?copyId=' + groupId })
		},
		goBack(){
			uni.navigateBack({ delta: 1 })
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #f5f5f5;
	color: #222;
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

.search-row {
	display: flex;
	align-items: center;
	gap: 14rpx;
	margin: 28rpx 58rpx;
	height: 58rpx;
	padding: 0 14rpx;
	border-radius: 29rpx;
	background: #f0f0f0;
	box-sizing: border-box;
}

.search-label,
.search-btn {
	flex-shrink: 0;
	font-size: 24rpx;
}

.search-label {
	color: #222;
}

.search-row input {
	flex: 1;
	min-width: 0;
	font-size: 24rpx;
}

.search-btn {
	color: #22c55e;
}

.list {
	box-sizing: border-box;
}

.group-copy-card {
	margin-bottom: 12rpx;
	padding: 28rpx 24rpx 20rpx;
	background: #fff;
	box-sizing: border-box;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: 30rpx;
}

.date {
	color: #999;
	font-size: 24rpx;
}

.price {
	display: block;
	margin-top: 12rpx;
	font-size: 30rpx;
}

.imgs {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12rpx;
	margin-top: 18rpx;
}

.imgs image {
	width: 100%;
	height: 218rpx;
	border-radius: 6rpx;
	background: #eee;
}

.status {
	display: block;
	margin-top: 20rpx;
	color: #999;
	font-size: 26rpx;
}

button {
	width: 100%;
	height: 86rpx;
	line-height: 86rpx;
	margin-top: 24rpx;
	border-radius: 8rpx;
	background: #22c55e;
	color: #fff;
	font-size: 30rpx;
}

button::after {
	border: none;
}

.empty,
.more {
	padding: 48rpx 0;
	text-align: center;
	color: #999;
	font-size: 25rpx;
}
</style>
