<template>
<!--********************************************************-->
<view class="leader-header" :style="showNav ? miniNavPageStyle() : ''">
	<view v-if="showNav" class="leader-page-nav" :style="miniNavBarStyle()">
		<image class="leader-nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
		<text v-if="title" class="leader-nav-title" :style="miniNavTitleStyle()">{{ title }}</text>
	</view>
	
	<view class="user-info">
		<view class="user-avatar" @click="goToHomePage()">
			<image src="/static/image/logo.png" mode="widthFix"></image>
		</view>
		<view class="user-detail">
			<text class="user-name">{{ shopName }}</text>
			<text class="user-id">您好, {{ staffName }}</text>
		</view>
	</view>
	
	<view class="user-stats">
		<view class="stat-item" @click="goToGoodsPage()">
			<text class="stat-value">{{ homeData.goodsTotal }}</text>
			<text class="stat-label">商品数</text>
		</view>
		<view class="stat-item" @click="goToGroupPage()">
			<text class="stat-value">{{ homeData.groupTotal }}</text>
			<text class="stat-label">团购数</text>
		</view>
		<view class="stat-item" @click="goToOrderPage()">
			<text class="stat-value">{{ homeData.orderTotal }}</text>
			<text class="stat-label">订单数</text>
		</view>
	</view>

</view>
<!--********************************************************-->	
</template>

<script>
export default {
	props: {
		title: {
			type: String,
			default: ''
		},
		showNav: {
			type: Boolean,
			default: true
		}
	},
	data() {
		return {
			shopName: '',
			staffName: '',
			leaderAuth: [],
			leaderSuper: false,
			homeData: {
				goodsTotal: 0,
				groupTotal: 0,
				orderTotal: 0,
			}
		}
	},
	created() {
		//console.log("component created function run.")
	},
	mounted(){
		
		// 本地缓存获取店铺名称和员工名称
		this.shopName = uni.getStorageSync('leader_shop')
		this.staffName = uni.getStorageSync('leader_name')
		
		// 当前店员的权限
		const auth = uni.getStorageSync('leader_auth') || ''
		this.leaderAuth = auth.split(",").map(Number)
		this.leaderSuper = uni.getStorageSync('leader_super') || false
		
	},
	methods: {
		// 去商品管理页面
		goToGoodsPage(){
			
			if(this.leaderSuper == true || this.leaderAuth.includes(10)){
				const url = '/pagesA/goods/index'
				uni.navigateTo({ url: url }).catch(err => { uni.redirectTo({ url: url }) })
			}else{
				uni.showToast({ title: '没有权限', icon: 'none' })
			}
		},
		// 去团购管理页面
		goToGroupPage(){
			
			if(this.leaderSuper == true || this.leaderAuth.includes(20)){
				const url = '/pagesA/group/index'
				uni.navigateTo({ url: url }).catch(err => { uni.redirectTo({ url: url }) })
			}else{
				uni.showToast({ title: '没有权限', icon: 'none' })
			}
		},
		// 去订单管理页面
		goToOrderPage(){
		
			if(this.leaderSuper == true || this.leaderAuth.includes(30)){
				const url = '/pagesA/order/index'
				uni.navigateTo({ url: url }).catch(err => { uni.redirectTo({ url: url }) })
			}else{
				uni.showToast({ title: '没有权限', icon: 'none' })
			}
		},
		// 返回控制台页面
		goToHomePage(){
			
			uni.redirectTo({ url: '/pagesA/dashboard/index' })	
		},
		goBack(){
			
			uni.navigateBack({
				delta: 1,
				fail: () => uni.redirectTo({ url: '/pagesA/dashboard/index' })
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.leader-header {
	background: #fff;
	box-sizing: border-box;
}

.leader-page-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 30;
	background: #fff;
	box-sizing: border-box;
}

.leader-nav-back {
	position: absolute;
	left: 24rpx;
	width: 36rpx;
	height: 36rpx;
}

.leader-nav-title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	color: #222;
	font-size: 34rpx;
	font-weight: 500;
	text-align: center;
}

</style>
