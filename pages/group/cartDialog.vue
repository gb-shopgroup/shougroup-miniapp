<template>
<view v-if="showModal" class="modal-overlay" @click="hide()">
<view class="buy-modal" @click.stop>
	
	<view class="modal-header">
		<text class="modal-title">已选{{ totalGoodsCount }}件商品</text>
		<text class="modal-close" @click="hide()">×</text>
	</view>
	
	<view class="modal-body">
		
		<!-- 购物车商品名称,价格和数量  -->
		<view class="product-summary" v-for="(item, index) in cartGoodsList" :key="item.id + '-' + (item.skuids || index)">
			<view class="product-thumb">
				<image mode="widthFix" :src="item.img"></image>
			</view>
			<view class="product-detail">
				<view class="product-name">{{ item.name }}</view>
				<view class="product-spec" v-if="item.skunames != ''">{{ item.skunames }}</view>
				<view class="product-price">
					<view>¥{{ item.price }}</view>
					<view class="quantity-control">
						<view class="qty-btn qty-minus" @click="changeQuantity(index, -1)">-</view>
						<text class="qty-value">{{ item.num }}</text>
						<view class="qty-btn qty-plus" @click="changeQuantity(index, 1)">+</view>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 商品金额合计 -->
		<view class="total-section">
			<text class="total-label">合计</text>
			<text class="total-price">¥{{totalPrice}}</text>
		</view>
		
		<!-- 去结算 -->
		<view class="pay-btn" @click="gotoCheckPage()">跟团购买</view>	
		
	</view>
	
</view>
</view>
</template>

<script>
export default {
	data() {
		return {
			showModal: false
		}
	},
	// 父组件传递过来的数据
	props: {
		// 购物车商品列表
		cartGoodsList:{
			type: Array,
			default: []
		}
	},
	// 初始化
	created() {
		//console.log("component created function run.")
	},
	// 初始化
	mounted(){
		//console.log("component mounted function run.")
	},
	// 计算
	computed: {
		// 价格合计
		totalPrice() {
			
			const total = this.cartGoodsList.reduce((sum, item) => {
				return sum + (parseFloat(item.price) * item.num)
			}, 0)
			return total.toFixed(2)
		},
		totalGoodsCount() {
			return this.cartGoodsList.reduce((sum, item) => sum + Number(item.num || 0), 0)
		}
	},
	// 方法集
	methods: {
		// 打开弹框
		show(){
			this.showModal = true
		},
		// 关闭弹框
		hide(){
			this.showModal = false
		},
		// 修改商品数量
		changeQuantity(idx, delta) {
						
			let newQty = (this.cartGoodsList[idx].num || 1) + delta
			
			// 减少为零就是去掉该商品
			if(newQty <= 0){
				uni.showModal({
					title: '确认删除',
					content: '确定要删除该商品吗？',
					success: (res) => {
						if (res.confirm) {
							this.cartGoodsList.splice(idx, 1)
							this.$emit("cartChange")
						}
					}
				})
				return
			}
			
			// Vue3 响应式数组内对象可直接赋值
			this.cartGoodsList[idx].num = newQty
			this.$emit("cartChange")
		},
		// 去结算
		gotoCheckPage(){
			
			this.$emit("childCartEvent")
		}
	}
}
</script>

<style lang="scss" scoped>
// ----------------------------------------
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0,0,0,0.48);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	z-index: 1000;
}
.buy-modal {
	width: 100%;
	max-height: 85vh;
	background: #fff;
	border-radius: 16rpx 16rpx 0 0;
	overflow: hidden;
}
.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 96rpx;
	padding: 0 32rpx;
	border-bottom: 2rpx solid #f0f0f0;
	box-sizing: border-box;
}
.modal-title {
	font-size: 30rpx;
	font-weight: 500;
	color: #222;
}
.modal-close {
	width: 44rpx;
	height: 44rpx;
	border: 2rpx solid #bfbfbf;
	border-radius: 50%;
	text-align: center;
	font-size: 34rpx;
	color: #999;
	line-height: 40rpx;
}
.modal-body {
	padding: 22rpx 32rpx 0;
	max-height: calc(85vh - 96rpx);
	overflow-y: auto;
}
// ----------------------------------------
.product-summary {
	display: flex;
	gap: 18rpx;
	padding-bottom: 20rpx;
	margin-bottom: 20rpx;
	border-bottom: 1rpx solid #f0f0f0;
}
.product-thumb {
	width: 180rpx;
	height: 180rpx;
	background: #f5f5f5;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	border-radius: 4rpx;
	image {
		width: 100%;
		height: 100%;
		border-radius: 4rpx;
	}
}
.product-detail {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 4rpx 0;
	min-width: 0;
	.product-name {
		font-size: 28rpx;
		color: #333;
		line-height: 40rpx;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.product-spec {
		font-size: 24rpx;
		color: #999;
		line-height: 34rpx;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}	
	.product-price {
		font-size: 32rpx;
		color: #ff4d4f;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
}
// ----------------------------------------
.quantity-control {
	display: flex;
	align-items: center;
	gap: 22rpx;
}
.qty-btn {
	width: 48rpx;
	height: 48rpx;
	border-radius: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	line-height: 44rpx;
	box-sizing: border-box;
}
.qty-minus {
	color: #28c76f;
	border: 2rpx solid #28c76f;
	background: #fff;
}
.qty-plus {
	color: #fff;
	border: 2rpx solid #28c76f;
	background: #28c76f;
}
.qty-value {
	color: #333;
	width: 36rpx;
	text-align: center;
	font-size: 30rpx;
}
// ----------------------------------------
.total-section {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 22rpx 0 24rpx;
	margin-bottom: 0;
}
.total-label {
	font-size: 28rpx;
	color: #333;
}
.total-price {
	font-size: 30rpx;
	color: #ff4d4f;
}
.pay-btn {
	width: 100%;
	height: 96rpx;
	background: #28c76f;
	color: white;
	font-size: 32rpx;
	border-radius: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 -32rpx;
	padding: 0 32rpx;
}
// ----------------------------------------
</style>
