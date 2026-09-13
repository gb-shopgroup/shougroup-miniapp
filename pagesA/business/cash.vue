<template>
<view class="container">
<LeaderHeader title="提现列表" />
<view class="page">
<view class="card">
		
	<view class="card-header">
		<text class="card-title"><text class="iconfont icon-location"></text>提现列表</text>
		<view class="btn btn-primary" @click="addCash()">我要提现</view>
	</view>

	<view class="message-list">
	<view class="message-item" v-for="(item, index) in dataList" :key="index">
		<view class="message-content">
			<view class="message-title">{{ cashStatusName(item.status) }}</view>
			<view class="message-title">{{ item.fee }}元</view>
			<text class="message-time">{{ item.time }}</text>
		</view>
	</view>
    </view>
    
</view>
</view>
<AddCash ref="addCashRef" @childEvent="initCashList()" />
</view>
</template>

<script>
import AddCash from "./addCash.vue"	
import LeaderHeader from "../common/header.vue"
//import { getLeaderCashList, getLeaderCashCount } from "@/api/leader.js"
export default {
	data() {
		return {
			page: 1,
			pageSize: 10,
			pageTotal: 0,
			dataList: []
		}
	},
	components: { LeaderHeader, AddCash },
	onLoad() {
		this.initCashList()
	},
	methods: {
		// 初始化提现列表
		async initCashList(){
			
			// try {
			// 	const params = { page:this.page, pageSize:this.pageSize }
			// 	const res = await getLeaderCashList(params)
			// 	this.dataList = res.data
			// } catch (err) {
			// 	console.log('初始化提现列表失败：', err)
			// }
			
			// try {
			// 	const res = await getLeaderCashCount()
			// 	const total = res.data
			// 	this.pageTotal = Math.ceil(total / this.pageSize)
			// } catch (err) {
			// 	console.log('初始化提现列表失败：', err)
			// }
		},
		// 上一页
		prevPage(){
			
			this.page--
			if(this.page <= 0) this.page = 1
			this.initOrderBusinessList()
		},
		// 下一页
		nextPage(){
			
			this.page++
			if(this.page > this.pageTotal) this.page = this.pageTotal
			this.initOrderBusinessList()
		},
		// 提现状态
		cashStatusName(status){
			
			//1已申请,2已提现,3失败
			if(status == 1){
				return "已申请"
			}else if(status == 2){
				return "已提现"
			}else if(status == 3){
				return "失败"
			}else{
				return "未知"
			}
		},
		// 添加提现
		addCash(){
			
			this.$refs.addCashRef.show()
		}
	}
}
</script>

<style lang="scss" scoped>
.card {
	background: #fff;
	border-radius: 15rpx;
	padding: 15rpx;
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

.message-tabs {
	display: flex;
	gap: 60rpx;
	margin-bottom: 30rpx;
	border-bottom: 2rpx solid #f0f0f0;
	.tab-item {
		flex: 1;
		padding: 20rpx 0;
		font-size: 28rpx;
		color: #666;
		border-bottom: 4rpx solid transparent;
		cursor: pointer;
		display: flex;
		//justify-content: center;
		align-items: center;
		gap: 12rpx;
		&.active {
			color: #1890ff;
			border-bottom-color: #1890ff;
		}
		.tab-badge {
			background: #ff4d4f;
			color: #fff;
			padding: 4rpx 12rpx;
			border-radius: 20rpx;
			font-size: 22rpx;
		}
	}
}

.message-list {
	.message-item {
		display: flex;
		align-items: center;
		padding: 20rpx;
		border-bottom: 1rpx solid #ddd;
		cursor: pointer;
		&:last-child {
			border-bottom: none;
		}
		&.unread {
			background: #f0f7ff;
		}
	}
	.message-content {
		.message-title {
			font-size: 28rpx;
			color: #333;
		}
		.message-time {
			font-size: 24rpx;
			color: #999;
			line-height: 50rpx;
		}
	}
}


.btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 16rpx 32rpx;
	border-radius: 8rpx;
	font-size: 26rpx;
	border: none;
	&.btn-primary {
		background: #1890ff;
		color: #fff;
	}
	&.btn-default {
		background: #f5f5f5;
		color: #666;
	}
	&.btn-small {
		padding: 12rpx 24rpx;
		font-size: 24rpx;
	}
}

.pagination {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 10rpx;
	margin-top: 40rpx;
	.page-btn {
		padding: 16rpx 24rpx;
		border: 2rpx solid #e8e8e8;
		border-radius: 8rpx;
		font-size: 26rpx;
		background: #fff;
		&.disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
	.page-num {
		padding: 16rpx 24rpx;
		border-radius: 8rpx;
		font-size: 26rpx;
		&.active {
			background: #1890ff;
			color: #fff;
		}
	}
}
</style>
