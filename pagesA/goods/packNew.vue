<template>
<view class="container">
<LeaderHeader title="添加包装" />
<view class="page">
<view class="card">
	
	<view class="card-header" style="display: flex; justify-content: space-between;">
		<text class="card-title">{{ goodsName }}</text>
	</view>
	
	<view class="form-section">
	<view class="form-group">
	<view class="spec-list">
		<view class="spec-item" v-for="(item, index) in packList" :key="index">
			<!--
			<view class="form-group">
				<label class="form-label">名称</label>
				<input type="text" class="form-input" v-model="item.name" placeholder="包装名称" />
			</view>
			-->
			<view class="form-row">
				<view class="form-group">
					<label class="form-label">数量</label>
					<input type="number" class="form-input" v-model="item.num" placeholder="包装数量" />
				</view>
				<view class="form-group">
					<label class="form-label">价格</label>
					<input type="digit" class="form-input" v-model="item.price" placeholder="包装价格" @input="onPackPriceInput(index, $event)" />
				</view>
			</view>
			<!--
			<view style="display: flex; flex-direction: row-reverse; gap: 15rpx;">
				<view class="btn btn-danger btn-small" @click="removeSpec(index, item)">删除</view>
				<view class="btn btn-primary btn-small" @click="editSpec(inedx, item)">修改</view>
			</view>
			-->
		</view>
	</view>
	</view>
	</view>

	<view class="form-actions">
		<view class="btn btn-default" @click="goBack()">返回</view>
		<view class="btn btn-primary" @click="submitData()">保存</view>
	</view>

</view> 
</view>
</view>
</template>

<script>
import LeaderHeader from "../common/header.vue"
import { getLeaderGoodsPackageList, updateLeaderGoodsPackageInfo } from "@/api/leader.js"
import { limitPricePrecision } from "@/utils/leaderProduct.js"
export default {
	data() {
		return {
			// 商品id
			goodsId: 0,
			goodsName: '',
			// 包装表
			packList: [],
		}
	},
	components: { LeaderHeader },
	onLoad(options) {
		if(options.id){
			this.goodsId = options.id
			this.initGoodsPackList(options.id)
		}
		if(options.name){
			this.goodsName = options.name
		}
	},
	methods: {
		// 初始化包装列表
		async initGoodsPackList(){
			
			try {
				const params = { id:this.goodsId }
				const res = await getLeaderGoodsPackageList(params)
				this.packList = res.data
				
				if(this.packList == null || this.packList.length == 0){
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
				}else{
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
					this.packList.push({id:0,price:0.0,num:0})
				}
			} catch (err) {
				console.log('初始化包装列表失败：', err)
			}
		},
		// 返回商品列表
		goBack(){
			
			const url = '/pagesA/goods/index'
			uni.navigateTo({ url: url }).catch(err => { uni.redirectTo({ url }) })
		},
		onPackPriceInput(index, e) {
			const item = this.packList[index]
			if (!item) return ''
			const value = limitPricePrecision(e.detail.value)
			item.price = value
			return value
		},
		// 提交保存
		async submitData(){
			
			// 过滤一下packList列表，去掉空数据
			this.packList = this.packList.map(item => Object.assign({}, item, { price: limitPricePrecision(item.price) }))
			this.packList = this.packList.filter(item => item.price > 0 && item.num > 0)
			
			// 包装不能为空
			if(this.packList.length == 0){
				uni.showToast({ title: '包装不能为空', icon: 'none' })
				return
			}
			
			// 提交数据
			try {
				const params = { gid:this.goodsId, lists:this.packList }
				const res = await updateLeaderGoodsPackageInfo(params)
				uni.showToast({ title: '保存成功', icon: 'success' })
				this.goBack()
			} catch (err) {
				console.log('提交保存失败：', err)
			}
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

.form-section {
	margin-bottom: 20rpx;
	padding-bottom: 20rpx;
	border-bottom: 1rpx solid #f0f0f0;
	&:last-of-type {
		border-bottom: none;
	}
	.section-title {
		font-size: 28rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 20rpx;
	}
}

.form-group {
	display: flex;
	align-items: baseline;
	gap: 10rpx;
	//margin-bottom: 20rpx;
	.form-label {
		//display: block;
		font-size: 28rpx;
		color: #999;
		margin-bottom: 15rpx;
		&.required::before {
			content: '* ';
			color: #ff4d4f;
		}
	}
	.form-input {
		flex: 1;
		height: 60rpx;
		//padding: 0 10rpx;
		padding-left: 10rpx;
		border: 2rpx solid #e8e8e8;
		border-radius: 5rpx;
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

.spec-list {
	.spec-item {
		display: flex;
		flex-direction: column;
		gap: 15rpx;
		margin-bottom: 30rpx;
	}
}

.checkbox-group {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
	.checkbox-item {
		display: flex;
		align-items: center;
		gap: 8rpx;
		padding: 12rpx 24rpx;
		border: 2rpx solid #e8e8e8;
		border-radius: 8rpx;
		font-size: 26rpx;
		cursor: pointer;
		&.checked {
			border-color: #1890ff;
			background: #e6f7ff;
		}
	}
}

.radio-group {
	display: flex;
	gap: 40rpx;
	.radio-item {
		display: flex;
		align-items: center;
		gap: 12rpx;
		padding: 16rpx 32rpx;
		border: 2rpx solid #e8e8e8;
		border-radius: 8rpx;
		font-size: 28rpx;
		cursor: pointer;
		&.active {
			border-color: #1890ff;
			background: #e6f7ff;
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

.upload-list {
	display: flex;
	flex-wrap: wrap;
	gap: 20rpx;
	.upload-item {
		width: 180rpx;
		height: 180rpx;
		border-radius: 12rpx;
		overflow: hidden;
		position: relative;
		image {
			width: 100%;
			height: 100%;
		}
		.upload-delete {
			position: absolute;
			top: 0;
			right: 0;
			width: 40rpx;
			height: 40rpx;
			background: rgba(0, 0, 0, 0.5);
			color: #fff;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 32rpx;
		}
	}
	.upload-add {
		width: 180rpx;
		height: 180rpx;
		border: 2rpx dashed #ddd;
		border-radius: 12rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		font-size: 24rpx;
		color: #999;
		cursor: pointer;
		.iconfont {
			font-size: 48rpx;
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
	&.btn-orange {
		background: #fa8c16;
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
