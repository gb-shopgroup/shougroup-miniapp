<template>
<view class="container">
<LeaderHeader title="订单商品汇总" />
<view class="page">
<!-- ********************************************************************** -->	
<view class="card">
	<view class="filter-bar">
		<picker mode="date" class="ipt" :value="start" :start="startDate" :end="endDate" @change="bindStartDateChange">
			<view v-if="start == ''">开 始 时 间</view>
			<view v-else>{{start}}</view>
		</picker>
		<picker mode="date" class="ipt" :value="end" :start="startDate" :end="endDate" @change="bindEndDateChange">
			<view v-if="end == ''">结 束 时 间</view>
			<view v-else>{{end}}</view>
		</picker>
		<view class="btn btn-primary" @click="initReportList()">汇总订单商品</view>
	</view>
	<view class="filter-bar" style="justify-content: center;">
		<picker class="ipt ipt2" :range="leaderAuthPointList" range-key="name" :value="pointIndex" @change="onPointChange">
			<view class="form-input">{{ leaderAuthPointList[pointIndex]?.name || '我的自提点' }}</view>
		</picker>
	</view>	
</view>
<!-- ********************************************************************** -->	
<view class="card">
	
	<view class="card-header">
		<text class="card-title">订单商品汇总</text>
	</view>
	
	<view class="order-list">
	<view class="order-card">
		<view class="order-header">
			<text class="order-no">商品名称</text>
			<text class="order-num">订单总数量</text>
			<text class="order-num">已核销数量</text>
			<text class="order-num">未核销数量</text>
		</view>
	</view>
	<view class="order-card" v-for="(item, index) in reportList" :key="index">
		<view class="order-header">
			<text class="order-no" @click="gotoSkuPage(item.id, item.name)">{{ item.name }}</text>
			<text class="order-num">{{ item.total }} {{ item.unit }}</text>
			<text class="order-num">{{ item.num1 }} {{ item.unit }}</text>
			<text class="order-num">{{ item.num2 }} {{ item.unit }}</text>
		</view>
	</view>
	<view class="order-card" v-if="reportList.length == 0">没有订单商品汇总数据</view>
    </view>
    
</view>
<!-- ********************************************************************** -->	
</view>
</view>
</template>

<script>
import LeaderHeader from "../common/header.vue"
import { getLeaderPointList, getSummaryPointOrderGoodsInfo } from "@/api/leader.js"
import { normalizeLeaderPoint } from "@/utils/leaderConfig.js"
export default {
	data() {
		return {
			start: this.getStartDate(),
			end: this.getEndDate(),
			startDate: this.getStartDate(),
			endDate: this.getEndDate(),
			// 是否超级管理员
			leaderSuper: false,
			// 员工权限提货点列表
			leaderAuthPointIds: [],
			leaderAuthPointList: [],
			// 提货点ID(过滤统计使用)
			pointId: 0,
			pointIndex: 0,
			pointName: '',
			// 订单商品汇总数据
			reportList: []
		}
	},
	components: { LeaderHeader },
	onLoad() {
		
		// 读取员工权限自提点
		const pointIds = uni.getStorageSync('leader_pointIds') || ''
		this.leaderAuthPointIds = pointIds.split(",").map(Number)
		this.leaderSuper = uni.getStorageSync('leader_super') || false
		
		// 初始化提货点列表，然后使用权限过滤一下即可
		this.initPointList()
	},
	methods: {
		// 初始化自提点列表
		async initPointList(){
			
			try {
				const res = await getLeaderPointList()
				const lists = (Array.isArray(res.data) ? res.data : []).map(normalizeLeaderPoint)
				if(this.leaderSuper){
					// 超管就是所有提货点
					this.leaderAuthPointList = lists
				}else{
					// 员工权限提货点
					this.leaderAuthPointList = []
					for(let i=0; i<lists.length; i++){
						let tempId = lists[i].id
						let tempName = lists[i].name
						let pid = parseInt(tempId)
						if(this.leaderAuthPointIds.includes(pid)){
							this.leaderAuthPointList.push({id:tempId,name:tempName})
						}
					}
				}
				
				// 默认选择第一个提货点
				this.pointIndex = 0
				this.pointId = this.leaderAuthPointList[this.pointIndex].id
				this.pointName = this.leaderAuthPointList[this.pointIndex].name
				
				// 初始化汇总数据
				if(this.pointId > 0){ this.initReportList() }
				
			} catch (err) {
				console.log('初始化自提点列表失败：', err)
			}
		},		
		// 初始化报表数据
		async initReportList(){
			
			// 提货点不能为空
			if(this.leaderSuper == false && this.pointId == 0){
				uni.showToast({ title: '提货点不能为空', icon: 'none' })
				return
			}
			
			// 时间也不能为空
			if(this.start == '' || this.end == ''){
				uni.showToast({ title: '日期不能为空', icon: 'none' })
				return
			}
			
			// 初始化商品汇总数据
			try {
				const params = { pid:this.pointId, start:this.start, end:this.end }
				const res = await getSummaryPointOrderGoodsInfo(params)
				this.reportList = res.data
			} catch (err) {
				console.log('初始化商品汇总数据失败：', err)
			}
		},
		// 日期选择器change事件
		bindStartDateChange: function(e) {
			
			this.start = e.detail.value
		},
		bindEndDateChange: function(e) {
			
			this.end = e.detail.value
		},		
		// 选择自提点事件
		onPointChange(e){
			
			this.pointIndex = e.detail.value
			this.pointId = this.leaderAuthPointList[this.pointIndex].id
			this.pointName = this.leaderAuthPointList[this.pointIndex].name
			this.initReportList() // 切换自提点后重新查询汇总数据
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
		// 去sku页面
		gotoSkuPage(id, name){
			
			const url = '/pagesA/report/sku2?id='+id+"&name="+name+"&pid="+this.pointId+"&pname="+this.pointName
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

.filter-bar {
	display: flex;
	gap: 20rpx;
	align-items: center;
	margin-bottom: 15rpx;
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
	.ipt2 {
		flex: 1;
	}
	.form-input {
		width: 100%;
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

.btn {
	padding: 16rpx 32rpx;
	border-radius: 8rpx;
	font-size: 26rpx;
	border: none;
	display: flex;
	align-items: center;
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
</style>
