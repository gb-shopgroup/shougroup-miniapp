<template>
<view class="container success-page">
	
	<!-- 支付结果区 -->
	<view class="success-header" :style="miniNavPageStyle()">
		<view class="success-icon">✓</view>
		<view class="success-title">支付成功</view>
		<view class="success-desc">{{ orderInfo.orderNo ? '订单已生成，请按约定方式提货' : '订单信息加载中' }}</view>
	</view>

	<!-- 订单摘要区 -->
	<view class="order-info">
	
		<view class="info-card">
			<view class="card-title">订单信息</view>
			<view class="info-row">
				<text class="label">支付金额</text>
				<text class="value price">¥{{orderInfo.orderPrice}}</text>
			</view>
			<view class="info-row">
				<text class="label">订单编号</text>
				<text class="value">{{ orderInfo.orderNo || orderNo }}</text>
			</view>
			<view class="info-row">
				<text class="label">支付方式</text>
				<text class="value">微信支付</text>
			</view>
			<view class="info-row">
				<text class="label">下单时间</text>
				<text class="value">{{orderInfo.orderTime}}</text>
			</view>
		</view>

		<view class="info-card">
			<view class="card-title">提货信息</view>
			<view class="info-row">
				<text class="label">提货点</text>
				<text class="value">{{ orderInfo.pointName }}</text>
			</view>
			<view class="info-row">
				<text class="label">提货地址</text>
				<text class="value">{{ orderInfo.pointAddress }}</text>
			</view>
		</view>
		
    </view>
	
	<view class="action-btns">
		<view class="btn-default" @click="goGroupPage()">返回团购页面</view>
		<view class="btn-primary" @click="goOrderDetail()">查看订单</view>
	</view>
	
</view>
</template>

<script>
import { getOrderInfo } from "@/api/group.js"		
import { normalizeMemberOrder } from "@/utils/memberOrder.js"
export default {
	data() {
		return {
			orderNo: '',
			orderInfo: normalizeMemberOrder({})
		}
	},
	onLoad(options) {
		const orderNo = options.orderNo || options.id || ''
		if (orderNo) {
			this.orderNo = orderNo
			this.initOrderInfo()
		}
	},
	methods: {
		// 初始化订单详情
		async initOrderInfo(){
			
			try {
				const param = { orderNo:this.orderNo }
				const res = await getOrderInfo(param)
				this.orderInfo = normalizeMemberOrder(res.data || {})
				this.orderNo = this.orderInfo.orderNo || this.orderNo
			} catch (err) {
				console.log('初始化订单详情失败：', err)
			}
		},
		// 去团购详情页
		goGroupPage() {
			
			uni.redirectTo({ url: '/pages/group/index?id=' + this.orderInfo.groupId + '&lid=' + this.orderInfo.leaderId })
		},
		// 去订单详情页面
		goOrderDetail() {
			
			uni.redirectTo({ url: '/pages/order/detail?orderNo=' + encodeURIComponent(this.orderNo) + '&paid=1' })
		}
	}
}
</script>

<style lang="scss" scoped>
.success-page {
	min-height: 100vh;
	background: #f5f5f5;
}
.success-header {
	background: #22c55e;
	padding: 64rpx 40rpx 56rpx;
	text-align: center;
	color: #fff;
	box-sizing: border-box;
}
.success-icon {
	width: 104rpx;
	height: 104rpx;
	margin: 0 auto 28rpx;
	border-radius: 50%;
	border: 4rpx solid rgba(255,255,255,0.86);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 70rpx;
	font-weight: 700;
}
.success-title {
	font-size: 44rpx;
	font-weight: bold;
	margin-bottom: 16rpx;
}
.success-desc {
	font-size: 28rpx;
	opacity: 0.9;
}
.order-info {
	padding: 32rpx;
}
.info-card {
	background: #fff;
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 24rpx;
}
.card-title {
	font-size: 32rpx;
	font-weight: 600;
	margin-bottom: 24rpx;
	padding-bottom: 16rpx;
	border-bottom: 2rpx solid #f0f0f0;
}
.info-row {
	display: flex;
	justify-content: space-between;
	margin-bottom: 16rpx;
}
.info-row:last-child {
	margin-bottom: 0;
}
.label {
	font-size: 26rpx;
	color: #999;
}
.value {
	font-size: 26rpx;
	color: #333;
}
.value.price {
	color: #ff4d4f;
	font-weight: 600;
}
.qrcode-section {
	padding: 0 32rpx;
}
.qrcode-title {
	font-size: 32rpx;
	font-weight: 600;
	margin-bottom: 24rpx;
}
.qrcode-box {
	background: #fff;
	border-radius: 16rpx;
	padding: 48rpx;
	text-align: center;
}
.qrcode-placeholder {
	margin-bottom: 24rpx;
}
.qrcode-tip {
	font-size: 26rpx;
	color: #666;
}
.action-btns {
	display: flex;
	gap: 24rpx;
	padding: 48rpx 32rpx;
}
.btn-default, .btn-primary {
	flex: 1;
	height: 96rpx;
	border-radius: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	font-weight: 500;
}
.btn-default {
	background-color: #999;
	//background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
	color: #fff;
}
.btn-primary {
	background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
	color: #fff;
}
</style>
