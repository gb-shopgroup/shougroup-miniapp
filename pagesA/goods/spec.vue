<template>
<view class="container">
<LeaderHeader title="添加规格" />
<view class="page">
<view class="card">
	
	<view class="card-header" style="display: flex; justify-content: space-between;">
		<text class="card-title">{{ goodsName }}</text>
		<view class="btn btn-primary btn-small" @click="addSpec()">添加规格</view>
	</view>
	
	<template v-for="spec in specList">
	<view class="info-section">
		<view class="section-title">
			<view class="section-name">{{ spec.name }}</view>
			<view class="section-oper" @click="removeSpec(spec.id)">删除规格</view>
		</view>
		<view class="spec-list">
			<view style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15rpx;">
				<view></view>
				<view class="btn btn-default btn-small" @click="addSpecVal(spec.id)">添加规格值</view>
			</view>
			<view class="spec-item" v-for="(item, index) in spec.vals" :key="index">
				<text class="spec-name">{{ item.val }}</text>
				<view style="color: #ff4d4f;" @click="removeSpecVal(item.id)">删除</view>
			</view>
		</view>
	</view>
	</template>
	
	<view class="form-actions">
		<view class="btn btn-default" @click="goBack()">返回</view>
		<!--<view class="btn btn-primary" @click="goSkuPage()">设置SKU信息</view>-->
	</view>

</view> 
</view>
<AddSpec ref="addSpecRef" @childEvent="initGoodsSpecList" />
<AddSpecVal ref="addSpecValRef" @childEvent="initGoodsSpecList" />
</view>
</template>

<script>
import AddSpec from './addSpec.vue'
import AddSpecVal from './addSpecVal.vue'	
import LeaderHeader from "../common/header.vue"
import { 
	getLeaderGoodsSpecList, 
	addLeaderGoodsSpecInfo, 
	editLeaderGoodsSpecInfo,
	removeLeaderGoodsSpecInfo,
	removeLeaderGoodsSpecValInfo } from "@/api/leader.js"
export default {
	data() {
		return {
			// 商品id
			goodsId: 0,
			goodsName: '',
			// 规格列表
			specList: []
		}
	},
	components: { LeaderHeader, AddSpec, AddSpecVal },
	onLoad(options) {
		if(options.id){
			this.goodsId = options.id
			this.initGoodsSpecList()
		}
		if(options.name){
			this.goodsName = options.name
		}
	},
	methods: {
		// 初始化规格列表
		async initGoodsSpecList(){
			
			try {
				const params = {id: this.goodsId}
				const res = await getLeaderGoodsSpecList(params)
				this.specList = res.data
			} catch (err) {
				console.log('初始化规格列表失败：', err)
			}
		},
		// 添加规格
		addSpec() {
			
			this.$refs.addSpecRef.show(this.goodsId)
		},
		// 删除规格
		removeSpec(specId){
			
			uni.showModal({
				title: '确认删除',
				content: '确定要删除吗？',
				success: (res) => {
					if (res.confirm) {
						this.requestRemoveSpec(specId)
					}
				}
			})
		},
		// 请求删除规格
		async requestRemoveSpec(specId){
			
			try {
				const params = { id:specId }
				const res = await removeLeaderGoodsSpecInfo(params)
				this.initGoodsSpecList() // 重新刷新页面
			} catch (err) {
				console.log('请求删除规格失败：', err)
			}
		},
		// 添加规格值
		addSpecVal(specId){
			
			this.$refs.addSpecValRef.show(specId)
		},
		// 删除规格值
		removeSpecVal(valId) {
			
			uni.showModal({
				title: '确认删除',
				content: '确定要删除吗？',
				success: (res) => {
					if (res.confirm) {
						this.requestRemoveSpecVal(valId)
					}
				}
			})
		},
		// 请求删除规格值
		async requestRemoveSpecVal(valId){
			
			try {
				const params = { id:valId }
				const res = await removeLeaderGoodsSpecValInfo(params)
				uni.showToast({ title: '删除成功', icon: 'success' })
				this.initGoodsSpecList() // 重新刷新页面
			} catch (err) {
				console.log('请求删除规格值失败：', err)
			}
		},
		// 进入SKU页面
		goSkuPage(){
			
			const url = '/pagesA/goods/sku?id=' + this.goodsId + "&name=" + this.goodsName
			uni.navigateTo({ url: url }).catch(err => { uni.redirectTo({ url: url }) })
		},
		// 返回商品列表
		goBack(){
			
			const url = '/pagesA/goods/index'
			uni.navigateTo({ url: url }).catch(err => { uni.redirectTo({ url: url }) })
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
		margin-bottom: 20rpx;
		.card-title {
			font-size: 32rpx;
			font-weight: 600;
			color: #333;
		}
	}
}


.form-group {
	margin-bottom: 20rpx;
	.form-label {
		display: block;
		font-size: 28rpx;
		color: #333;
		margin-bottom: 15rpx;
		&.required::before {
			content: '* ';
			color: #ff4d4f;
		}
	}
	.form-input {
		width: 100%;
		height: 80rpx;
		padding: 0 24rpx;
		border: 2rpx solid #e8e8e8;
		border-radius: 8rpx;
		font-size: 28rpx;
		box-sizing: border-box;
	}
}

.form-row {
	display: flex;
	gap: 30rpx;
	.form-group {
		flex: 1;
	}
}

.info-section {
	margin-bottom: 30rpx;
	.section-title {
		display: flex;
		justify-content: space-between;
		
		color: #333;
		margin-bottom: 20rpx;
		padding-bottom: 16rpx;
		border-bottom: 1rpx solid #f0f0f0;
		.section-name{
			font-weight: 600;
			font-size: 28rpx;
		}
		.section-oper{
			font-size: 24rpx;
			color: #ff4d4f;
		}
	}
	.info-row {
		display: flex;
		justify-content: space-between;
		padding: 16rpx 0;
		font-size: 28rpx;
		.label {
			color: #999;
		}
		.value {
			color: #333;
		}
	}
}

.spec-list {
	.spec-item {
		display: flex;
		align-items: center;
		padding: 20rpx;
		background: #fafafa;
		border-radius: 12rpx;
		margin-bottom: 16rpx;
		&:last-child {
			margin-bottom: 0;
		}
		.spec-name {
			flex: 1;
			font-size: 28rpx;
			color: #333;
		}
		.spec-price {
			font-size: 28rpx;
			font-weight: 600;
			color: #ff4d4f;
			margin-right: 40rpx;
		}
		.spec-stock {
			font-size: 26rpx;
			color: #999;
		}
	}
}

.form-tip {
	margin-top: 20rpx;
	padding: 20rpx;
	background: #fffbe6;
	border-radius: 8rpx;
	font-size: 24rpx;
	color: #fa8c16;
	.iconfont {
		margin-right: 8rpx;
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

.flex {
	display: flex;
	&.items-center {
		align-items: center;
	}
	&.gap-20 {
		gap: 40rpx;
	}
}
</style>
