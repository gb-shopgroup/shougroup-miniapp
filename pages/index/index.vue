<template>
<view class="container" :style="homePageStyle">
<!--********************************************************-->
<view class="home-header" :style="homeHeaderStyle">
	<view class="home-top-row" :style="homeTopRowStyle">
		<view class="header-logo">
			<image class="logo-image" src="/static/image/logo.png" mode="aspectFit"></image>
			<text class="logo-text">店小团</text>
		</view>
		<view class="header-search">
			<view class="search-icon"></view>
			<input class="search-input" v-model="keyword" placeholder="" confirm-type="search" @confirm="submitSearch" />
		</view>
	</view>
	<scroll-view class="category-scroll" scroll-x>
		<view class="category-list">
			<view class="category-item" :class="{ active: isCategoryActive(item) }" v-for="(item, index) in categories" :key="item.id || index" @click="switchCategory(item.id)">
				<text class="category-text">{{ item.name }}</text>
			</view>
		</view>
	</scroll-view>
	</view>
<!--********************************************************-->
<view class="page">
	<view class="group-section-header" v-if="keyword">
		<text class="group-section-filter">搜索结果</text>
	</view>
	<!--********************************************************-->
	<view class="group-list">
	<view class="group-card" :class="{ disabled: !isGroupOnline(item) }" v-for="(item, index) in displayGroupList" :key="item.id || index" @click="joinGroup(item)">
		<view class="leader-row">
			<image class="leader-avatar" :src="item.leaderAvatar || '/static/image/head.png'" mode="aspectFill"></image>
			<view class="leader-meta">
				<view class="leader-name">{{ item.leaderName || '团长' }}</view>
				<view class="leader-sub" v-if="item.label || item.timeText || item.viewText || item.joinText || item.distanceText">
					<text class="group-label" :class="{ warm: isWarmLabel(item.label) }" v-if="item.label">{{ item.label }}</text>
					<text v-if="item.timeText">{{ item.timeText }}</text>
					<text v-if="item.viewText">{{ (item.label || item.timeText) ? ' | ' : '' }}{{ item.viewText }}人查看</text>
					<text v-if="item.joinText">{{ (item.label || item.timeText || item.viewText) ? ' | ' : '' }}{{ item.joinText }}次跟团</text>
					<text v-if="item.distanceText">{{ (item.label || item.timeText || item.viewText || item.joinText) ? ' | ' : '' }}{{ item.distanceText }}</text>
				</view>
			</view>
		</view>
		<view class="group-name">{{ item.name }}</view>
		<view class="group-price">
			<text class="current-price">¥{{ item.price }}</text>
			<text class="current-price" v-if="item.price2 > 0">-{{ item.price2 }}</text>
		</view>
		<view class="group-images" v-if="item.images.length > 0">
			<image class="grid-item" mode="aspectFill" :src="img" v-for="(img, imgIndex) in item.images.slice(0, 3)" :key="imgIndex"></image>
		</view>
		<view class="group-records" v-if="getPreviewRecords(item).length > 0">
			<view class="group-records-window">
				<view class="record-track" :class="{ scrolling: shouldScrollRecords(item) }">
					<view class="record-row" v-for="(record, recordIndex) in getScrollingRecords(item)" :key="recordIndex">
						<view class="record-left">
							<text class="record-code" v-if="getRecordCode(record)">{{ getRecordCode(record) }}</text>
							<image class="record-avatar" :src="record.avatar || '/static/image/head.png'" mode="aspectFill"></image>
							<text class="record-user" v-if="record.name">{{ record.name }}</text>
							<text class="record-time" v-if="record.time">{{ record.time }}</text>
						</view>
						<view class="record-right">
							<text class="record-goods" v-if="record.goodsName">{{ record.goodsName }}</text>
							<text class="record-num" v-if="record.num">{{ formatRecordNum(record.num) }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>
		<view class="group-footer">
			<view class="join-info">{{ item.statusText }}</view>
			<view class="action-buttons">
				<view class="join-btn" :class="{ disabled: !isGroupOnline(item) }">
					<text class="join-btn-text">{{ isGroupOnline(item) ? '去跟团' : '已下线' }}</text>
				</view>
			</view>
		</view>
	</view>
	</view>
	<view class="empty-state" v-if="!loading && displayGroupList.length == 0">
		<text>{{ locationBlocked ? '开启定位后查看附近团购' : '暂无团购' }}</text>
		<view v-if="locationBlocked" class="location-action" @click="requestLocation">开启定位</view>
	</view>
	<!--********************************************************-->
	<view class="load-more" v-if="hasMore">
		<text>上拉加载更多...</text>
	</view>
	<view class="no-more" v-else-if="groupList.length > 0">
		<text>没有更多了</text>
	</view>
	<!--********************************************************-->
</view>
<!--********************************************************-->
</view>
</template>

<script>
import { getGroupCatList, getGroupShop, getMemberGroupActivityList, getMemberInfo, reportMemberGroupView } from "@/api/group.js"
import { cacheMemberLoginInfo, pickMemberBoundLeaderId } from "@/utils/auth.js"
import {
	buildMemberHomeListPayload,
	isMemberGroupOnline,
	MEMBER_BOUND_LEADER_STORAGE_KEY,
	MEMBER_LOCATION_STORAGE_KEY,
	normalizeMemberHomeGroup,
	resolveMemberHomeListData
} from "@/utils/memberHome.js"
export default {
	data() {
		return {
			catId : 0,
			categories : [],
			groupList: [],
			page: 1,
			pageSize: 10,
			hasMore: false,
			loading: false,
			keyword: '',
			memberLeaderId: 0,
			memberLocation: null,
			locationBlocked: false,
			locationPrompted: false,
			recommendationReady: false,
			shopInfoMap: {},
			pendingGroupListRefresh: false,
			pendingGroupListRefreshCallback: null
		}
	},
	// 页面初始化加载数据
	onLoad() {
		this.initGroupCatList()
		this.prepareRecommendation()
	},
	// 下拉刷新触发函数
	onPullDownRefresh() {
		
		this.page = 1
		this.hasMore = false
		this.groupList = []
		this.prepareRecommendation(() => {
			// 数据加载完成，关闭下拉刷新动画
			uni.stopPullDownRefresh()
		})
	},
	// 上拉加载更多触发函数
	onReachBottom() {
		
		// 加 loading 锁，防止快速滑动重复请求
		if (this.loading) return
		// 有更多数据才会加载
		if(this.hasMore){
			this.page++
			this.initGroupList()
		}
	},
	// 微信分享卡片
	onShareAppMessage() {
		return {
			title: "店小团",
			path: "/pages/index/index",
			imageUrl: "https://shopgroup.obs.cn-north-9.myhuaweicloud.com/logo.png"
		}
	},
	computed: {
		normalizedGroupList() {
			return this.groupList.map(item => normalizeMemberHomeGroup(item))
		},
		displayGroupList() {
			return this.normalizedGroupList
		},
		homeHeaderStyle() {
			return `height: calc(${this.miniNavMetrics.navBarHeight}px + 102rpx);`
		},
		homeTopRowStyle() {
			const metrics = this.miniNavMetrics || {}
			const windowWidth = Number(metrics.windowWidth || 375)
			const menuLeft = Number(metrics.menuLeft || 0)
			const rowHeightRpx = 76
			const rowHeightPx = rowHeightRpx * windowWidth / 750
			const rowTop = Number(metrics.navTitleTop || 0) + (Number(metrics.navTitleHeight || 0) - rowHeightPx) / 2
			const menuSafePx = menuLeft > 0 ? Math.max(windowWidth - menuLeft + 10, 105) : 105
			const menuSafeRpx = Math.ceil(menuSafePx * 750 / windowWidth)
			return `top: ${Math.max(rowTop, 0)}px; height: ${rowHeightRpx}rpx; right: ${menuSafeRpx}rpx;`
		},
		homePageStyle() {
			return `padding-top: calc(${this.miniNavMetrics.navBarHeight}px + 102rpx);`
		}
	},
	methods: {
		// 获取团购分类列表
		async initGroupCatList() {
			try {
				const res = await getGroupCatList()
				this.categories = this.buildCategoryList(res.data)
			} catch (err) {
				console.log('获取团购分类列表失败：', err)
				this.categories = this.buildCategoryList([])
			}
		},
		buildCategoryList(list){
			
			const serverList = Array.isArray(list) ? list : []
			if(serverList.length == 0){
				return [
					{id:0,name:'全部'},
					{id:-1,name:'生鲜'},
					{id:-2,name:'食品'},
					{id:-3,name:'服装'},
					{id:-4,name:'百货'},
					{id:-5,name:'综合'}
				]
			}
			return [{id:0,name:'全部'}].concat(serverList.map(item => ({
				...item,
				id: Number(item.id || item.catId || 0)
			})))
		},
		// 获取团购列表
		async initGroupList(callback) {
			if (!this.recommendationReady || (!this.memberLeaderId && !this.memberLocation)) {
				callback && callback()
				return
			}
			// 加载动画
			this.loading = true
			
			try {
				const param = buildMemberHomeListPayload({
					leaderId: this.memberLeaderId,
					longitude: this.memberLocation && this.memberLocation.longitude,
					latitude: this.memberLocation && this.memberLocation.latitude,
					keyword: this.keyword,
					catId: this.catId,
					page: this.page,
					pageSize: this.pageSize
				})
				const res = await getMemberGroupActivityList(param)
				const list = resolveMemberHomeListData(res.data)
				const listWithShopInfo = await this.mergeGroupShopInfo(list)
				this.groupList = this.page === 1 ? listWithShopInfo : this.groupList.concat(listWithShopInfo)
				this.hasMore = list.length >= this.pageSize
			} catch (err) {
				console.log('获取团购列表失败：', err)
				uni.showToast({ title: '获取团购列表失败', icon: 'none' })
			}
			
			// 取消加载动画
			this.loading = false
			
			// 搜索发生在上一轮请求期间时，当前请求结束后按最新关键词再查一次。
			if (this.pendingGroupListRefresh) {
				const nextCallback = this.pendingGroupListRefreshCallback
				this.pendingGroupListRefresh = false
				this.pendingGroupListRefreshCallback = null
				await this.refreshGroupList(nextCallback)
			} else {
				callback && callback()
			}
		},
		async refreshGroupList(callback) {
			this.page = 1
			this.hasMore = false
			if (this.loading) {
				this.pendingGroupListRefresh = true
				if (callback) this.pendingGroupListRefreshCallback = callback
				return
			}
			await this.initGroupList(callback)
		},
		getGroupLeaderId(group) {
			return Number(group && (group.lid || group.leaderId) || 0)
		},
		hasGroupShopInfo(group = {}) {
			return Boolean(group.leaderAvatar || group.shopLogo || group.logo || group.shopAvatar || group.avatar || group.headImg || group.headimgurl || group.wxAvatar || group.shopName)
		},
		normalizeGroupShopInfo(data = {}) {
			return {
				name: data.name || data.shopName || '',
				shopLogo: data.shopLogo || data.logo || data.shopAvatar || data.avatar || data.headImg || data.headimgurl || data.wxAvatar || ''
			}
		},
		async loadGroupShopInfo(leaderId) {
			if (!leaderId) return {}
			if (this.shopInfoMap[leaderId]) return this.shopInfoMap[leaderId]
			try {
				const res = await getGroupShop({ id: leaderId })
				const shopInfo = this.normalizeGroupShopInfo(res.data || {})
				this.shopInfoMap = Object.assign({}, this.shopInfoMap, { [leaderId]: shopInfo })
				return shopInfo
			} catch (err) {
				console.log('获取团长店铺信息失败：', err)
				this.shopInfoMap = Object.assign({}, this.shopInfoMap, { [leaderId]: {} })
				return {}
			}
		},
		async mergeGroupShopInfo(list = []) {
			const rows = Array.isArray(list) ? list : []
			const leaderIds = Array.from(new Set(rows
				.filter(item => !this.hasGroupShopInfo(item))
				.map(item => this.getGroupLeaderId(item))
				.filter(id => id > 0)))
			await Promise.all(leaderIds.map(id => this.loadGroupShopInfo(id)))
			return rows.map(item => {
				const leaderId = this.getGroupLeaderId(item)
				const shopInfo = this.shopInfoMap[leaderId] || {}
				return Object.assign({}, item, {
					shopName: item.shopName || shopInfo.name || '',
					shopLogo: item.shopLogo || shopInfo.shopLogo || ''
				})
			})
		},
		async prepareRecommendation(callback) {
			this.memberLeaderId = await this.resolveMemberLeaderId()
			if (this.memberLeaderId > 0) {
				this.memberLocation = null
				this.locationBlocked = false
				this.recommendationReady = true
				this.page = 1
				this.groupList = []
				this.initGroupList(callback)
				return
			}
			this.ensureLocationForRecommendation(callback)
		},
		async resolveMemberLeaderId() {
			let leaderId = Number(uni.getStorageSync(MEMBER_BOUND_LEADER_STORAGE_KEY) || 0)
			if (!uni.getStorageSync('token')) return leaderId
			try {
				const res = await getMemberInfo()
				const member = res.data || {}
				cacheMemberLoginInfo(member)
				const serverLeaderId = pickMemberBoundLeaderId(member)
				if (serverLeaderId > 0 || Object.prototype.hasOwnProperty.call(member, 'leaderId')) leaderId = serverLeaderId
			} catch (err) {
				console.log('获取绑定团长失败，使用本地绑定信息：', err)
			}
			return leaderId
		},
		readCachedLocation() {
			const location = uni.getStorageSync(MEMBER_LOCATION_STORAGE_KEY)
			if (!location || !Number.isFinite(Number(location.longitude)) || !Number.isFinite(Number(location.latitude))) return null
			return { longitude: Number(location.longitude), latitude: Number(location.latitude) }
		},
		async ensureLocationForRecommendation(callback) {
			const cachedLocation = this.readCachedLocation()
			if (cachedLocation) {
				this.memberLocation = cachedLocation
				this.locationBlocked = false
				this.recommendationReady = true
				this.page = 1
				this.groupList = []
				this.initGroupList(callback)
				return
			}
			try {
				const location = await new Promise((resolve, reject) => {
					uni.getLocation({ type: 'gcj02', success: resolve, fail: reject })
				})
				this.memberLocation = { longitude: Number(location.longitude), latitude: Number(location.latitude) }
				uni.setStorageSync(MEMBER_LOCATION_STORAGE_KEY, this.memberLocation)
				this.locationBlocked = false
				this.recommendationReady = true
				this.page = 1
				this.groupList = []
				this.initGroupList(callback)
			} catch (err) {
				this.recommendationReady = false
				this.locationBlocked = true
				this.groupList = []
				callback && callback()
				this.promptLocationPermission()
			}
		},
		promptLocationPermission() {
			if (this.locationPrompted) return
			this.locationPrompted = true
			uni.showModal({
				title: '需要定位权限',
				content: '未绑定团长时，需要定位来推荐附近团购。',
				confirmText: '开启定位',
				success: res => {
					if (res.confirm) this.requestLocation()
				}
			})
		},
		requestLocation() {
			this.locationPrompted = false
			uni.openSetting({
				success: result => {
					if (result.authSetting && result.authSetting['scope.userLocation']) this.ensureLocationForRecommendation()
				}
			})
		},
		// 选择团购分类
		switchCategory(id){
			
			this.page = 1
			this.catId = Number(id || 0)
			this.refreshGroupList()
		},
		isCategoryActive(item){
			
			return Number(this.catId || 0) === Number(item && item.id || 0)
		},
		// 提交团购搜索
		async submitSearch(){
			this.keyword = this.keyword.trim()
			await this.refreshGroupList()
		},
		// 清空团购搜索
		clearSearch(){
			
			this.keyword = ''
		},
		getPreviewRecords(group){
			
			const records = Array.isArray(group.records) ? group.records : []
			return records.slice(0, 8)
		},
		getScrollingRecords(group){
			
			const records = this.getPreviewRecords(group)
			return records.length > 1 ? records.concat(records) : records
		},
		shouldScrollRecords(group){
			
			return this.getPreviewRecords(group).length > 2
		},
		getRecordCode(record){
			
			return record.code || record.id || record.orderId || record.userMobile || ''
		},
		isWarmLabel(label){
			
			return String(label || '').indexOf('快') > -1 || String(label || '').indexOf('热') > -1
		},
		formatRecordNum(num){
			
			const value = String(num || '')
			return value.startsWith('+') ? value : `+${value}`
		},
		isGroupOnline(group){
			
			return isMemberGroupOnline(group)
		},
		reportGroupView(group) {
			const groupId = Number(group && group.id || 0)
			const leaderId = Number(group && (group.leaderId || group.lid) || 0)
			if (!groupId || !uni.getStorageSync('token')) return
			reportMemberGroupView({ groupId })
				.then(res => {
					if (res && res.data === false) return
					if (leaderId > 0) {
						uni.setStorageSync(MEMBER_BOUND_LEADER_STORAGE_KEY, leaderId)
						this.memberLeaderId = leaderId
					}
				})
				.catch(err => {
					console.log('团购浏览上报失败：', err)
				})
		},
			// 去跟团
			joinGroup(group){
				
				if(!this.isGroupOnline(group)){
					uni.showToast({ title: '团购已下线，暂不能跟团', icon: 'none' })
					return
				}
				const app = getApp()
				if(!app.globalData.sessionGroupDetailMap) app.globalData.sessionGroupDetailMap = {}
				app.globalData.sessionGroupDetailMap[group.id] = group
				this.reportGroupView(group)
				
				//uni.navigateTo({ url: '/pages/login/index' })
				const url = '/pages/group/index?id=' + group.id + '&lid=' + group.leaderId
			uni.navigateTo({
				url,
				fail: () => {
					uni.redirectTo({ url })
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
/* 首页顶部 */
.home-header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 20;
	box-sizing: border-box;
	padding: 0 0 20rpx 28rpx;
	background-color: white;
	background-image: none;
	.home-top-row {
		position: absolute;
		left: 28rpx;
		right: 210rpx;
		display: flex;
		align-items: center;
		box-sizing: border-box;
	}
	.header-logo {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		gap: 10rpx;
		width: 248rpx;
		padding-top: 0;
	}
	.logo-image {
		width: 76rpx;
		height: 76rpx;
		flex-shrink: 0;
	}
	.logo-text {
		color: #231815;
		font-size: 40rpx;
		font-weight: 700;
		line-height: 1;
	}
	.header-search {
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 0;
		height: 50rpx;
		border-radius: 10rpx;
		background-color: #f7f7f7;
		padding: 0 10rpx;
	}
	.search-icon {
		position: relative;
		flex-shrink: 0;
		width: 20rpx;
		height: 20rpx;
		margin-left: 2rpx;
		margin-right: 12rpx;
		border: 5rpx solid #bfc1c4;
		border-radius: 50%;
		&::after {
			content: "";
			position: absolute;
			right: -13rpx;
			bottom: -9rpx;
			width: 16rpx;
			height: 5rpx;
			border-radius: 999rpx;
			background: #bfc1c4;
			transform: rotate(45deg);
		}
	}
	.search-input {
		flex: 1;
		min-width: 0;
		color: $text-color-333;
		font-size: 24rpx;
	}
	.category-scroll {
		position: absolute;
		left: 28rpx;
		right: 0;
		bottom: 20rpx;
		white-space: nowrap;
		.category-list {
			display: inline-flex;
			gap: 40rpx;
			padding-right: 28rpx;
			.category-item {
				box-sizing: border-box;
				min-width: 66rpx;
				height: 36rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				border-radius: 10rpx;
				padding: 0 16rpx;
				background-color: #ffffff;
				border: 1rpx solid #d9d9d9;
				.category-text {
					color: #666666;
					font-size: 22rpx;
					line-height: 1;
				}
				&.active {
					background-color: #22c55e;
					border-color: #22c55e;
					.category-text {
						font-weight: 600;
						color: #ffffff;
					}
				}
			}
		}
	}
}
/* 团购列表 */
.group-section-header {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	margin: 8rpx 0 16rpx 0;
	.group-section-filter {
		color: $text-color-666;
		font-size: $text-fontSize-small;
	}
}
.group-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	.group-card {
		padding: 24rpx 24rpx 18rpx 24rpx;
		background: white;
		border-radius: 0;
		box-shadow: none;
		overflow: hidden;
		border-bottom: 2rpx solid #eeeeee;
		&.disabled {
			opacity: 0.7;
		}
		.leader-row {
			display: flex;
			align-items: center;
			margin-bottom: 26rpx;
		}
		.leader-avatar {
			width: 64rpx;
			height: 64rpx;
			flex-shrink: 0;
			border-radius: 8rpx;
			background: #eeeeee;
		}
		.leader-meta {
			flex: 1;
			min-width: 0;
			margin-left: 12rpx;
		}
		.leader-name {
			color: $text-color-333;
			font-size: 24rpx;
			font-weight: 600;
			line-height: 1.3;
		}
		.leader-sub {
			display: flex;
			align-items: center;
			min-width: 0;
			margin-top: 6rpx;
			color: $text-color-999;
			font-size: 20rpx;
			line-height: 1.3;
			white-space: nowrap;
			overflow: hidden;
		}
		.group-label {
			height: 30rpx;
			line-height: 30rpx;
			flex-shrink: 0;
			margin-right: 10rpx;
			padding: 0 10rpx;
			box-sizing: border-box;
			border-radius: 4rpx;
			background: #e9fff3;
			color: #20c66a;
			font-size: 18rpx;
			&.warm {
				background: #fff3eb;
				color: #ff4a1c;
			}
		}
		.group-name {
			color: $text-color-333;
			font-size: 30rpx;
			font-weight: 600;
			line-height: 1.35;
			margin-bottom: 16rpx;
			overflow: hidden;
			text-overflow: ellipsis;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
		}
		.group-price {
			display: flex;
			align-items: center;
			gap: 6rpx;
			margin-bottom: 16rpx;
			.current-price {
				color: #ff3b30;
				font-size: 36rpx;
				font-weight: 500;
			}
		}
		.group-images {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 10rpx;
			margin-bottom: 14rpx;
			.grid-item {
				width: 100%;
				height: 150rpx;
				border-radius: 4rpx;
				background: #eeeeee;
			}
		}
		.group-records {
			margin-bottom: 18rpx;
			overflow: hidden;
		}
		.group-records-window {
			height: 96rpx;
			overflow: hidden;
		}
		.record-track {
			&.scrolling {
				animation: record-scroll 8s linear infinite;
			}
		}
		.record-row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12rpx;
			height: 48rpx;
			box-sizing: border-box;
			color: $text-color-999;
			font-size: 20rpx;
			line-height: 1.2;
		}
		.record-left,
		.record-right {
			display: flex;
			align-items: center;
			min-width: 0;
		}
		.record-code {
			margin-right: 8rpx;
		}
		.record-avatar {
			width: 34rpx;
			height: 34rpx;
			margin-right: 8rpx;
			border-radius: 4rpx;
			background: #eeeeee;
		}
		.record-user,
		.record-time,
		.record-goods {
			white-space: nowrap;
		}
		.record-user {
			color: $text-color-666;
			margin-right: 8rpx;
		}
		.record-goods {
			max-width: 190rpx;
			overflow: hidden;
			text-overflow: ellipsis;
			color: $text-color-666;
		}
		.record-num {
			margin-left: 6rpx;
			color: #ff3b30;
		}
		.group-footer {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-top: 4rpx;
			.join-info {
				color: #20c66a;
				font-size: 24rpx;
				font-weight: 500;
			}
			.action-buttons {
				display: flex;
				.join-btn {
					min-width: 112rpx;
					height: 48rpx;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 4rpx;
					background: white;
					border: 2rpx solid #20c66a;
					&.disabled {
						border-color: #c8c8c8;
					}
					.join-btn-text {
						color: #20c66a;
						font-size: 24rpx;
					}
					&.disabled .join-btn-text {
						color: #999999;
					}
				}
			}
		}
	}
}
@keyframes record-scroll {
	0% {
		transform: translateY(0);
	}
	100% {
		transform: translateY(-50%);
	}
}
/* 数据上拉加载更多 */
.load-more, .no-more {
	padding: 40rpx;
	text-align: center;
	color: $text-color-999;
	font-size: $text-fontSize-small;
}
.empty-state {
	padding: 80rpx 0;
	text-align: center;
	color: $text-color-999;
	font-size: $text-fontSize-small;
}
.location-action {
	width: 184rpx;
	height: 64rpx;
	margin: 24rpx auto 0;
	border-radius: 4rpx;
	background: #22c55e;
	color: #fff;
	font-size: 26rpx;
	line-height: 64rpx;
}
</style>
