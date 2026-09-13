<template>
<view class="container">
<LeaderHeader title="订单商品规格汇总" />
<view class="page">
<!-- ********************************************************************** -->	
<view class="card">
	<view class="filter-bar-title"><text>{{ goodsName }}</text></view>
	<view class="filter-bar">
		<picker mode="date" class="ipt" :value="start" :start="startDate" :end="endDate" @change="bindStartDateChange">
			<view v-if="start == ''">开 始 时 间</view>
			<view v-else>{{start}}</view>
		</picker>
		<picker mode="date" class="ipt" :value="end" :start="startDate" :end="endDate" @change="bindEndDateChange">
			<view v-if="end == ''">结 束 时 间</view>
			<view v-else>{{end}}</view>
		</picker>
		<view class="btn btn-primary" @click="summaryDataList()">汇总</view>	
	</view>
</view>
<!-- ********************************************************************** -->	
<view class="card">
	
	<view class="card-header">
		<text class="card-title">订单商品规格汇总</text>
	</view>
	
	<view class="order-list">
	<view class="order-card">
		<view class="order-header">
			<text class="order-no">规格</text>
			<text class="order-num">数量</text>
		</view>
	</view>
	<view class="order-card" v-for="(item, index) in orderGoodsList" :key="index">
		<view class="order-header">
			<text class="order-no">{{ item.name || '无规格' }}</text>
			<text class="order-num">{{ item.total }}</text>
		</view>
	</view>
    </view>
    
</view>
<!-- ********************************************************************** -->	
<view class="card" v-for="(point, pindex) in pointOrderGoodsList" :key="pindex">
	
	<view class="card-header">
		<text class="card-title">{{point.pname}}</text>
	</view>
	
	<view class="order-list">
	<view class="order-card">
		<view class="order-header">
			<text class="order-no">规格</text>
			<text class="order-num">数量</text>
		</view>
	</view>
	<view class="order-card" v-for="(goods, gindex) in point.lists" :key="gindex">
		<view class="order-header">
			<text class="order-no">{{ goods.name || '无规格' }}</text>
			<text class="order-num">{{ goods.total }}</text>
		</view>
	</view>
	</view>
	
</view>
</view>
<!-- ********************************************************************** -->	
<view class="form-actions">
	<view class="btn btn-primary" @click="goBack()">返回</view>
</view>
<!-- ********************************************************************** -->	
</view>
</template>

<script>
import LeaderHeader from "../common/header.vue"
import { getSummaryOrderGoodsSkuInfo, getSummaryOrderGoodsPointSkuInfo } from "@/api/leader.js"
export default {
	data() {
		return {
			start: this.getStartDate(),
			end: this.getEndDate(),
			startDate: this.getStartDate(),
			endDate: this.getEndDate(),
			goodsId: 0,
			pointId: 0,
			goodsName: '',
			// 订单商品sku汇总数据
			orderGoodsList: [],
			// 订单商品sku汇总数据(提货点分组)
			pointOrderGoodsList: []
		}
	},
	components: { LeaderHeader },
	onLoad(options) {
		
		if(options.gid){
			this.goodsId = options.gid
		}
		if(options.pid){
			this.pointId = options.pid
		}
		if(options.name){
			this.goodsName = options.name
		}

		// 汇总订单商品规格数据
		this.summaryDataList()
	},
	methods: {
		// 汇总订单商品规格数据
		async summaryDataList(){
			
			try {
				const params = { gid:this.goodsId, start:this.start, end:this.end }
				const res = await getSummaryOrderGoodsSkuInfo(params)
				this.orderGoodsList = res.data
			} catch (err) {
				console.log('汇总订单商品规格数据失败：', err)
			}
			
			try {
				const params = { gid:this.goodsId, start:this.start, end:this.end }
				const res = await getSummaryOrderGoodsPointSkuInfo(params)
				this.pointOrderGoodsList = res.data
			} catch (err) {
				console.log('汇总订单商品规格数据(提货点分组)失败：', err)
			}
		},
		// 日期选择器change事件
		bindStartDateChange: function(e) {
			
			this.start = e.detail.value
		},
		bindEndDateChange: function(e) {
			
			this.end = e.detail.value
		},
		// 获取今天日期 yyyy-MM-dd
		getEndDate() {
			
			const date = new Date();
			const y = date.getFullYear();
			const m = String(date.getMonth() + 1).padStart(2, '0');
			const d = String(date.getDate()).padStart(2, '0');
			return `${y}-${m}-${d}`;
		},
		// 获取20天前日期 yyyy-MM-dd
		getStartDate() {
			
			const date = new Date();
			date.setDate(date.getDate() - 20);
			const y = date.getFullYear();
			const m = String(date.getMonth() + 1).padStart(2, '0');
			const d = String(date.getDate()).padStart(2, '0');
			return `${y}-${m}-${d}`;
		},
		// 返回页面
		goBack(){
			
			const url = '/pagesA/report/index'
			uni.navigateTo({ url: url }).catch(err => { uni.redirectTo({ url: url }) })
		}
	}
}
</script>

<style lang="scss" scoped>
.card {
	background: #fff;
	border-radius: 16rpx;
	padding: 15rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
		.card-title {
			font-size: 32rpx;
			font-weight: 600;
			color: #333;
		}
	}
}

.filter-bar-title {
	
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
	margin-bottom: 15rpx;
}

.filter-bar {
	display: flex;
	gap: 20rpx;
	align-items: center;
	.ipt {
		height: 72rpx;
		padding: 0 24rpx;
		border: 2rpx solid #e8e8e8;
		border-radius: 8rpx;
		font-size: 28rpx;
		background: #fff;
		display: flex;
		align-items: center;
	}
}

.section {
	padding: $p15;
	border-radius: 15rpx;
	margin-bottom: 30rpx;
	background-color: white;
}

.section-title {
	display: flex;
	justify-content: space-between;
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 15rpx;
	.badge {
		display: inline-block;
		padding: 5rpx 10rpx;
		border-radius: 20rpx;
		font-size: 24rpx;
		&.badge-danger {
			background: #ff4d4f;
			color: #fff;
		}
	}
	.more {
		font-size: 28rpx;
		font-weight: normal;
	}
}

.stats-grid {
	display: flex;
	gap: 15rpx;
	margin-bottom: 15rpx;
	.stat-card {
		flex: 1;
		padding: 15rpx;
		border-radius: 15rpx;
		text-align: center;

		&.primary {
			background: #e6f7ff;
			.stat-icon { color: #1890ff; }
			.stat-value { color: #1890ff; }
		}
		&.success {
			background: #f6ffed;
			.stat-icon { color: #52c41a; }
			.stat-value { color: #52c41a; }
		}
		&.warning {
			background: #fff7e6;
			.stat-icon { color: #fa8c16; }
			.stat-value { color: #fa8c16; }
		}
		&.danger {
			background: #fff1f0;
			.stat-icon { color: #ff4d4f; }
			.stat-value { color: #ff4d4f; }
		}
		.stat-icon {
			font-size: 48rpx;
			margin-bottom: 16rpx;
		}
		.stat-value {
			font-size: 48rpx;
			font-weight: 700;
		}
		.stat-label {
			font-size: 26rpx;
			color: #666;
			margin-top: 8rpx;
		}
	}
}

.order-list {
	.order-card {
		border: 2rpx solid #f0f0f0;
		border-radius: 16rpx;
		padding: 15rpx;
		margin-bottom: 15rpx;
		&:last-child {
			margin-bottom: 0;
		}
	}
	
	.order-header {
		display: flex;
		justify-content: space-between;
		.order-no {
			font-size: 26rpx;
			color: #333;
			flex: 2;
		}
		.order-num {
			font-size: 26rpx;
			color: #333;
			flex: 1;
		}
	}
}

.form-actions {
	display: flex;
	gap: 20rpx;
	justify-content: center;
	padding-top: 40rpx;
}

.btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 20rpx 60rpx;
	border-radius: 12rpx;
	font-size: 28rpx;
	border: none;
	&.btn-primary {
		background: #1890ff;
		color: #fff;
	}
	&.btn-default {
		background: #f5f5f5;
		color: #666;
	}
	&.btn-danger {
		background: #ff4d4f;
		color: #fff;
	}
	&.btn-small {
		padding: 12rpx 24rpx;
		font-size: 24rpx;
	}
}
</style>
