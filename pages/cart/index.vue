<template>
<view class="container cart-page" :style="cartPageStyle">
	<view class="cart-nav" :style="cartNavStyle">
		<text class="nav-placeholder"></text>
		<text class="title" :style="cartTitleStyle">购物车</text>
		<text class="nav-placeholder"></text>
	</view>

	<view class="cart-summary-row" :style="cartSummaryStyle">
		<text>共{{ cartGoodsTotal }}件商品</text>
		<text class="edit-action" @click="toggleEditMode()">{{ editMode ? '完成' : '编辑' }}</text>
	</view>

	<scroll-view class="cart-content" scroll-y>
		<view class="cart-group" v-if="cartGoodsList.length > 0">
			<view class="group-header">
				<view class="select-dot" :class="{ active: isAllSelected }" @click="toggleSelectAll()"></view>
				<image class="shop-avatar" :src="shopAvatar" mode="aspectFill"></image>
				<text class="shop-name">{{ shopName }}</text>
				<text class="group-name">{{ groupName }}</text>
				<text class="arrow">›</text>
			</view>

			<view class="cart-goods" v-for="(item, index) in cartGoodsList" :key="item.id + '-' + (item.skuids || index)">
				<view class="select-dot" :class="{ active: isSelected(item) }" @click="toggleSelected(index)"></view>
				<image class="goods-img" :src="item.img" mode="aspectFill"></image>
				<view class="goods-info">
					<view class="goods-name">{{ item.name }}</view>
					<view class="goods-spec" v-if="item.skunames">{{ item.skunames }}</view>
					<view class="goods-price">¥{{ item.price }}</view>
				</view>
				<view class="qty-control">
					<view class="qty-btn qty-minus" @click.stop="changeQuantity(index, -1)">－</view>
					<text class="qty-num">{{ item.num }}</text>
					<view class="qty-btn qty-plus" @click.stop="changeQuantity(index, 1)">＋</view>
				</view>
			</view>
		</view>

		<view class="empty-cart" v-else>
			<view class="empty-cart-icon">
				<image src="/static/tabbar/cart.png" mode="aspectFit"></image>
			</view>
			<text class="empty-cart-text">购物车暂无商品</text>
		</view>
	</scroll-view>

	<view class="bottom-bar" v-if="cartGoodsList.length > 0">
		<view class="select-all" v-if="editMode" @click="toggleSelectAll()">
			<view class="select-dot" :class="{ active: isAllSelected }"></view>
			<text>全选</text>
		</view>
		<view class="pay-info" v-else>
			<text>实际支付:</text>
			<text class="pay-price">￥{{ selectedTotalPrice }}</text>
		</view>
		<view class="bottom-action" @click="handleBottomAction()">{{ editMode ? `删除(${selectedGoodsTotal})` : '跟团购买' }}</view>
	</view>
</view>
</template>

<script>
import {
	calculateCartTotal,
	getCartGoodsCount,
	getCartItemKey,
	getSelectedCartGoods,
	reconcileSelectedCartKeys,
	updateCartGoodsQuantity
} from "@/utils/groupPurchase.js"

export default {
	data() {
		return {
			cartGoodsList: [],
			cartContext: {},
			editMode: false,
			selectedMap: {}
		}
	},
	onShow() {
		this.loadSessionCart()
	},
	computed: {
		cartPageStyle() {
			return this.miniNavPageStyle(68)
		},
		cartNavStyle() {
			return this.miniNavBarStyle()
		},
		cartSummaryStyle() {
			return this.miniNavTopStyle()
		},
		cartTitleStyle() {
			return this.miniNavTitleStyle()
		},
		shopName() {
			const shopInfo = this.cartContext.shopInfo || {}
			return shopInfo.name || '我是店名我是店名'
		},
		shopAvatar() {
			const shopInfo = this.cartContext.shopInfo || {}
			return shopInfo.logo || shopInfo.avatar || '/static/image/head.png'
		},
		groupName() {
			const groupInfo = this.cartContext.groupInfo || {}
			return groupInfo.name || '活动名称活动名称'
		},
		cartGoodsTotal() {
			return getCartGoodsCount(this.cartGoodsList)
		},
		selectedGoodsList() {
			return getSelectedCartGoods(this.cartGoodsList, this.selectedMap)
		},
		selectedGoodsTotal() {
			return getCartGoodsCount(this.selectedGoodsList)
		},
		selectedTotalPrice() {
			return calculateCartTotal(this.selectedGoodsList)
		},
		isAllSelected() {
			return this.cartGoodsList.length > 0 && this.cartGoodsList.every(item => this.isSelected(item))
		}
	},
	methods: {
		loadSessionCart() {
			const app = getApp()
			this.cartGoodsList = app.globalData.sessionCartGoodsList || []
			this.cartContext = app.globalData.sessionCartContext || {}
			this.ensureSelectedMap()
		},
		ensureSelectedMap() {
			this.selectedMap = reconcileSelectedCartKeys(this.cartGoodsList, this.selectedMap)
		},
		getItemKey(item) {
			return getCartItemKey(item)
		},
		isSelected(item) {
			return this.selectedMap[this.getItemKey(item)] === true
		},
		toggleSelected(index) {
			const item = this.cartGoodsList[index]
			if(!item) return
			const key = this.getItemKey(item)
			this.selectedMap[key] = !this.isSelected(item)
		},
		toggleSelectAll() {
			const selected = !this.isAllSelected
			const nextMap = {}
			this.cartGoodsList.forEach(item => {
				nextMap[this.getItemKey(item)] = selected
			})
			this.selectedMap = nextMap
		},
		toggleEditMode() {
			this.editMode = !this.editMode
		},
		changeQuantity(index, delta) {
			const item = this.cartGoodsList[index]
			if(!item) return
			const newQty = Number(item.num || 1) + delta
			if(newQty <= 0){
				this.confirmRemoveIndexes([index])
				return
			}
			this.cartGoodsList = updateCartGoodsQuantity(this.cartGoodsList, index, delta)
			this.syncSessionCart()
		},
		handleBottomAction() {
			if(this.editMode){
				const indexes = this.cartGoodsList.map((item, index) => index).filter(index => this.isSelected(this.cartGoodsList[index]))
				this.confirmRemoveIndexes(indexes)
				return
			}
			this.goCheckout()
		},
		confirmRemoveIndexes(indexes) {
			if(!indexes.length){
				uni.showToast({ title: '请选择商品', icon: 'none' })
				return
			}
			uni.showModal({
				title: '确认删除',
				content: '确定要删除选中的商品吗？',
				success: (res) => {
					if(!res.confirm) return
					this.cartGoodsList = this.cartGoodsList.filter((item, index) => !indexes.includes(index))
					this.ensureSelectedMap()
					this.syncSessionCart()
				}
			})
		},
		goCheckout() {
			const selectedList = this.selectedGoodsList
			if(!selectedList.length){
				uni.showToast({ title: '请选择商品', icon: 'none' })
				return
			}
			const groupId = this.cartContext.groupId
			const leaderId = this.cartContext.leaderId
			if(!groupId || !leaderId){
				uni.showToast({ title: '请先选择团购商品', icon: 'none' })
				return
			}
			const app = getApp()
			app.globalData.sessionCheckoutGoodsList = selectedList
			uni.navigateTo({ url: `/pages/group/cart?id=${groupId}&lid=${leaderId}` })
		},
		syncSessionCart() {
			getApp().globalData.sessionCartGoodsList = this.cartGoodsList
		}
	}
}
</script>

<style lang="scss" scoped>
.cart-page {
	height: 100vh;
	background: #f4f4f4;
	overflow: hidden;
	padding-bottom: calc(128rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}
.cart-nav {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 20;
	display: grid;
	grid-template-columns: 160rpx minmax(0, 1fr) 160rpx;
	align-items: start;
	padding: 0 30rpx;
	background: #fff;
	box-sizing: border-box;
}
.nav-placeholder {
	display: block;
	min-width: 0;
}
.cart-nav .title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	color: #222;
	font-size: 32rpx;
	font-weight: 500;
	text-align: center;
}
.cart-summary-row {
	position: fixed;
	left: 0;
	right: 0;
	z-index: 20;
	height: 68rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 32rpx;
	background: #fff;
	color: #666;
	font-size: 26rpx;
	box-sizing: border-box;
}
.edit-action {
	color: #22c55e;
}
.cart-group {
	background: #fff;
}
.cart-content {
	height: 100%;
	background: #f4f4f4;
	box-sizing: border-box;
}
.group-header {
	height: 72rpx;
	display: grid;
	grid-template-columns: 40rpx 36rpx minmax(0, 1fr) minmax(0, 1.2fr) 24rpx;
	align-items: center;
	column-gap: 10rpx;
	padding: 0 24rpx;
	box-sizing: border-box;
	border-bottom: 1rpx solid #f0f0f0;
}
.shop-avatar {
	width: 36rpx;
	height: 36rpx;
	border-radius: 4rpx;
	background: #eee;
}
.shop-name,
.group-name {
	min-width: 0;
	color: #333;
	font-size: 24rpx;
	line-height: 32rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.arrow {
	color: #999;
	font-size: 34rpx;
	line-height: 34rpx;
}
.cart-goods {
	display: grid;
	grid-template-columns: 40rpx 180rpx minmax(0, 1fr) 156rpx;
	column-gap: 18rpx;
	align-items: center;
	min-height: 206rpx;
	padding: 18rpx 24rpx;
	box-sizing: border-box;
	border-bottom: 1rpx solid #f0f0f0;
}
.select-dot {
	width: 36rpx;
	height: 36rpx;
	border: 2rpx solid #d6d6d6;
	border-radius: 50%;
	box-sizing: border-box;
}
.select-dot.active {
	border-color: #28c76f;
	background: #28c76f;
	position: relative;
}
.select-dot.active::after {
	content: '';
	position: absolute;
	left: 10rpx;
	top: 5rpx;
	width: 10rpx;
	height: 18rpx;
	border-right: 3rpx solid #fff;
	border-bottom: 3rpx solid #fff;
	transform: rotate(45deg);
}
.goods-img {
	width: 180rpx;
	height: 180rpx;
	border-radius: 4rpx;
	background: #eee;
}
.goods-info {
	min-width: 0;
}
.goods-name {
	color: #222;
	font-size: 28rpx;
	line-height: 38rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.goods-spec {
	margin-top: 6rpx;
	color: #999;
	font-size: 24rpx;
	line-height: 34rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.goods-price {
	margin-top: 26rpx;
	color: #ff3b30;
	font-size: 32rpx;
	line-height: 42rpx;
}
.qty-control {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 22rpx;
}
.qty-btn {
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2rpx solid #28c76f;
	font-size: 30rpx;
	line-height: 44rpx;
	box-sizing: border-box;
}
.qty-minus {
	color: #28c76f;
	background: #fff;
}
.qty-plus {
	color: #fff;
	background: #28c76f;
}
.qty-num {
	min-width: 36rpx;
	color: #333;
	font-size: 30rpx;
	text-align: center;
}
.empty-cart {
	min-height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding-bottom: 120rpx;
	color: #666;
	font-size: 28rpx;
	box-sizing: border-box;
}
.empty-cart-icon {
	width: 156rpx;
	height: 156rpx;
	margin-bottom: 26rpx;
	border-radius: 50%;
	background: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
}
.empty-cart-icon image {
	width: 88rpx;
	height: 88rpx;
	display: block;
}
.empty-cart-text {
	color: #666666;
	font-size: 28rpx;
	line-height: 40rpx;
}
.bottom-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: calc(112rpx + env(safe-area-inset-bottom));
	display: flex;
	align-items: stretch;
	background: #fff;
	padding-bottom: env(safe-area-inset-bottom);
	box-sizing: border-box;
	z-index: 99;
}
.select-all,
.pay-info {
	flex: 1;
	display: flex;
	align-items: center;
	padding-left: 32rpx;
	color: #333;
	font-size: 28rpx;
	min-width: 0;
}
.select-all {
	gap: 12rpx;
}
.pay-price {
	margin-left: 8rpx;
	color: #ff3b30;
	font-size: 36rpx;
	line-height: 44rpx;
}
.bottom-action {
	width: 300rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #28c76f;
	color: #fff;
	font-size: 30rpx;
}
</style>
