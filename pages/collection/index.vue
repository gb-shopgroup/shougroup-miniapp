<template>
<view class="container">
	<!-- 店铺头图区 -->
	<view class="shop-banner">
		<image v-if="shopBanner" class="shop-banner-image" mode="aspectFill" :src="shopBanner"></image>
		<view class="shop-banner-txt" v-else>
			<text class="shop-banner-title">{{ collectionName }}</text>
			<text class="shop-banner-desc">{{ collectionDesc }}</text>
		</view>
	</view>

	<view class="content">
		<!-- 店铺信息区 -->
		<view class="collection-header">
			<view class="collection-name">{{ collectionName }}</view>
			<view class="collection-desc">{{ collectionDesc }}</view>
		</view>

		<!-- 团购列表区 -->
		<view class="group-list">
			<view class="group-card" v-for="(item, index) in displayGroupList" :key="item.id || index" @click="goGroupDetail(item)">
				<view class="card-images" v-if="item.images.length > 0">
					<view class="product-image">
						<image class="product-cover" :src="item.images[0]" mode="aspectFill"></image>
					</view>
					<view v-if="!isGroupOnline(item)" class="soldout-tag">已下线</view>
				</view>

				<view class="card-content">
					<view class="product-name">{{ item.name }}</view>
					<view class="product-supplier">
						<text class="iconfont icon-store"></text> {{ collectionName }}
					</view>

					<view class="price-row">
						<view class="price-info">
							<text class="current-price">¥{{ item.price }}</text>
							<text class="original-price" v-if="item.price2 > 0">¥{{ item.price2 }}</text>
						</view>
						<text class="status-text">{{ item.statusText }}</text>
					</view>

					<view class="spec-list" v-if="item.goods.length > 0">
						<view v-for="goods in item.goods.slice(0, 3)" :key="goods.id || goods.name" class="spec-item">
							{{ goods.name }}
						</view>
					</view>
				</view>
			</view>
		</view>

		<view class="empty-state" v-if="!loading && displayGroupList.length == 0">
			<text>{{ leaderId ? '暂无团购' : '缺少团长信息' }}</text>
		</view>
		<view class="load-more" v-if="hasMore">
			<text @click="loadMore">加载更多...</text>
		</view>
		<view class="no-more" v-else-if="groupList.length > 0">
			<text>没有更多了</text>
		</view>
	</view>
</view>
</template>

<script>
import { getGroupShop, getMemberGroupActivityList } from "@/api/group.js"
import { buildMemberHomeListPayload, isMemberGroupOnline, normalizeMemberHomeGroup, resolveMemberHomeListData } from "@/utils/memberHome.js"

export default {
	data() {
		return {
			leaderId: 0,
			shopInfo: {},
			groupList: [],
			page: 1,
			pageSize: 10,
			hasMore: false,
			loading: false
		}
	},
	computed: {
		shopBanner() {
			return this.shopInfo.banner || this.shopInfo.img || ''
		},
		collectionName() {
			return this.shopInfo.name || '团长店铺'
		},
		collectionDesc() {
			return this.shopInfo.shopInfo || this.shopInfo.info || '团长更多好货'
		},
		displayGroupList() {
			return this.groupList.map(item => normalizeMemberHomeGroup(item))
		}
	},
	onLoad(options) {
		this.leaderId = Number(options.lid || options.leaderId || uni.getStorageSync('leader') || 0)
		if(this.leaderId) uni.setStorageSync('leader', this.leaderId)
		this.initShopInfo()
		this.loadData()
	},
	onPullDownRefresh() {
		this.page = 1
		this.hasMore = false
		this.groupList = []
		this.loadData(() => {
			uni.stopPullDownRefresh()
		})
	},
	onReachBottom() {
		if(this.hasMore) this.loadMore()
	},
	methods: {
		async initShopInfo() {
			if(!this.leaderId) return
			try {
				const res = await getGroupShop({ id: this.leaderId })
				this.shopInfo = res.data || {}
			} catch (err) {
				console.log('获取团长店铺失败：', err)
			}
		},
		async loadData(callback) {
			if(!this.leaderId) {
				this.groupList = []
				this.hasMore = false
				callback && callback()
				return
			}
			this.loading = true
			try {
				const res = await getMemberGroupActivityList(buildMemberHomeListPayload({
					leaderId: this.leaderId,
					page: this.page,
					pageSize: this.pageSize
				}))
				const list = resolveMemberHomeListData(res.data)
				this.groupList = this.page === 1 ? list : this.groupList.concat(list)
				this.hasMore = list.length >= this.pageSize
			} catch (err) {
				console.log('获取团长团购列表失败：', err)
				uni.showToast({ title: '获取团购列表失败', icon: 'none' })
			}
			this.loading = false
			callback && callback()
		},
		loadMore() {
			if(this.loading || !this.hasMore) return
			this.page++
			this.loadData()
		},
			goGroupDetail(item) {
				if(!this.isGroupOnline(item)) {
					uni.showToast({ title: '团购已下线，暂不能跟团', icon: 'none' })
					return
				}
				const app = getApp()
				if(!app.globalData.sessionGroupDetailMap) app.globalData.sessionGroupDetailMap = {}
				app.globalData.sessionGroupDetailMap[item.id] = item
				uni.navigateTo({ url: `/pages/group/index?id=${item.id}&lid=${item.leaderId || this.leaderId}` })
			},
		isGroupOnline(item) {
			return isMemberGroupOnline(item)
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #f5f5f5;
}

.shop-banner {
	height: 280rpx;
	background: #e9ecef;
}

.shop-banner-image {
	width: 100%;
	height: 280rpx;
}

.shop-banner-txt {
	min-height: 280rpx;
	box-sizing: border-box;
	padding: 88rpx 32rpx 32rpx;
	color: white;
	background: linear-gradient(135deg, #2f855a 0%, #2563eb 100%);
}

.shop-banner-title {
	display: block;
	margin-bottom: 12rpx;
	font-size: 40rpx;
	font-weight: 600;
}

.shop-banner-desc {
	display: block;
	font-size: 26rpx;
	line-height: 1.5;
	opacity: 0.92;
}

.content {
	padding-bottom: 40rpx;
}

.collection-header {
	padding: 32rpx;
	margin-bottom: 24rpx;
	background: #fff;
}

.collection-name {
	margin-bottom: 12rpx;
	color: #333;
	font-size: 36rpx;
	font-weight: 600;
}

.collection-desc {
	color: #777;
	font-size: 26rpx;
	line-height: 1.5;
}

.group-list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
	padding: 0 32rpx;
}

.group-card {
	overflow: hidden;
	background: #fff;
	border-radius: 8rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}

.card-images {
	position: relative;
}

.product-image {
	height: 300rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f2f2f2;
}

.product-cover {
	width: 100%;
	height: 300rpx;
}

.soldout-tag {
	position: absolute;
	top: 20rpx;
	right: 20rpx;
	padding: 8rpx 20rpx;
	color: #fff;
	font-size: 24rpx;
	border-radius: 6rpx;
	background: rgba(0,0,0,0.6);
}

.card-content {
	padding: 24rpx;
}

.product-name {
	margin-bottom: 12rpx;
	color: #333;
	font-size: 32rpx;
	font-weight: 600;
	line-height: 1.35;
}

.product-supplier {
	margin-bottom: 16rpx;
	color: #999;
	font-size: 24rpx;
}

.price-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 16rpx;
}

.price-info {
	display: flex;
	align-items: baseline;
	gap: 12rpx;
	min-width: 0;
}

.current-price {
	color: #ff4d4f;
	font-size: 40rpx;
	font-weight: 700;
}

.original-price {
	color: #999;
	font-size: 24rpx;
	text-decoration: line-through;
}

.status-text {
	flex-shrink: 0;
	color: #20c66a;
	font-size: 24rpx;
}

.spec-list {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.spec-item {
	max-width: 100%;
	padding: 8rpx 20rpx;
	overflow: hidden;
	color: #666;
	font-size: 24rpx;
	white-space: nowrap;
	text-overflow: ellipsis;
	background: #f5f5f5;
	border: 2rpx solid transparent;
	border-radius: 6rpx;
}

.load-more,
.no-more,
.empty-state {
	padding: 40rpx;
	color: #999;
	font-size: 26rpx;
	text-align: center;
}

.empty-state {
	padding-top: 80rpx;
}
</style>
