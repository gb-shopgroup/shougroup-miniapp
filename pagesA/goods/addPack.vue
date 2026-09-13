<template>
<view class="modal-overlay" v-if="showModal" @click="closeModal()">
<view class="modal" @click.stop>
	<view class="modal-header">
		<text class="modal-title">{{ isEdit ? '编辑包装' : '添加包装' }}</text>
		<text class="modal-close" @click="closeModal()">×</text>
	</view>
	<view class="modal-body">
		
		<view class="form-group">
			<text class="form-label required">包装名称</text>
			<input type="text" class="form-input" v-model="formData.name" placeholder="请输入规格名称" />
		</view>
		
		<view class="form-group">
			<text class="form-label required">包装价格</text>
			<input type="digit" class="form-input" v-model="formData.price" placeholder="请输入包装价格" @input="onPriceInput" />
		</view>
		
		<view class="form-group">
			<text class="form-label required">包装数量</text>
			<input type="text" class="form-input" v-model="formData.num" placeholder="请输入规格名称" />
		</view>

	</view>
	<view class="modal-footer">
		<view class="btn btn-default" @click="closeModal">取消</view>
		<view class="btn btn-primary" @click="saveData">保存</view>
	</view>
</view>
</view>
</template>

<script>
import { addLeaderGoodsPackageInfo, editLeaderGoodsPackageInfo } from "@/api/leader.js"
import { limitPricePrecision } from "@/utils/leaderProduct.js"
export default {
	data() {
		return {
			showModal: false,
			isEdit: false,
			formData: {
				// 包装id
				id: 0,
				// 商品id
				gid: 0,
				// 包装名称
				name: '',
				// 包装价格
				price: 0,
				// 市场价格
				price2: 0,
				// 包装数量
				num: 0
			}
		}
	},
	created() {
		//console.log("component created function run.")
	},
	mounted(){
		//console.log("component mounted function run.")
	},
	methods: {
		// 兼容添加和修改两种情况
		show(packInfo, goodsId){

			if(packInfo == null){
				// 添加
				this.isEdit = false
				this.formData.id = 0
				this.formData.gid = goodsId
				this.formData.name = ''
				this.formData.price = 0
				this.formData.price2 = 0
				this.formData.num = 0
			}else{
				// 修改
				this.isEdit = true
				this.formData.id = packInfo.id
				this.formData.gid = goodsId
				this.formData.name = packInfo.name
				this.formData.price = packInfo.price
				this.formData.price2 = 0
				this.formData.num = packInfo.num
			}
			this.showModal = true
		},
		closeModal(){
			this.showModal = false
		},
		onPriceInput(e) {
			const value = limitPricePrecision(e.detail.value)
			this.formData.price = value
			return value
		},
		// 保存数据
		async saveData() {
			this.formData.price = limitPricePrecision(this.formData.price)
			
			if (!this.formData.name) {
				uni.showToast({ title: '请输入包装名称', icon: 'none' })
				return
			}
			if (this.formData.price == 0) {
				uni.showToast({ title: '请输入包装价格', icon: 'none' })
				return
			}			
			if (this.formData.num == 0) {
				uni.showToast({ title: '请输入包装数量', icon: 'none' })
				return
			}
								
			try {
				// 添加还是修改
				if(this.isEdit){
					const res = await editLeaderGoodsPackageInfo(this.formData)
				}else{
					const res = await addLeaderGoodsPackageInfo(this.formData)
				}
				
				// 成功
				uni.showToast({ title: '保存成功', icon: 'success' })
				this.closeModal()
				this.$emit("childEvent")
				
			} catch (err) {
				
				if(err.msg) uni.showToast({ title: err.msg, icon: 'none' })
				console.log('保存成功失败：', err)
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.modal {
	width: 90%;
	max-height: 80vh;
	background: #fff;
	border-radius: 24rpx;
	overflow: hidden;
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30rpx 40rpx;
		border-bottom: 1rpx solid #f0f0f0;
		.modal-title {
			font-size: 32rpx;
			font-weight: 600;
		}
		.modal-close {
			font-size: 48rpx;
			color: #999;
		}
	}
	.modal-body {
		padding: 40rpx;
		max-height: 60vh;
		overflow-y: auto;
	}
	.modal-footer {
		display: flex;
		gap: 20rpx;
		padding: 30rpx 40rpx;
		border-top: 1rpx solid #f0f0f0;
	}
}

.form-group {
	margin-bottom: 30rpx;
	.form-label {
		display: block;
		font-size: 28rpx;
		color: #333;
		margin-bottom: 16rpx;
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

.radio-group {
	display: flex;
	flex-wrap: wrap;
	gap: 15rpx;
	.radio-item {
		display: flex;
		align-items: center;
		gap: 10rpx;
		padding: 15rpx 15rpx;
		//border: 2rpx solid #e8e8e8;
		//border-radius: 5rpx;
		font-size: 28rpx;
		cursor: pointer;
		&.active {
			border-color: #1890ff;
			background: #e6f7ff;
		}
	}
}

.upload-list {
	display: flex;
	flex-wrap: wrap;
	gap: 20rpx;
	.upload-item {
		width: 400rpx;
		height: 300rpx;
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
		width: 400rpx;
		height: 300rpx;
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
		.iconfont { font-size: 48rpx; }
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
		flex: 1;
		background: #1890ff;
		color: #fff;
	}
	&.btn-default {
		flex: 1;
		background: #f5f5f5;
		color: #666;
	}
	&.btn-small {
		padding: 12rpx 24rpx;
		font-size: 24rpx;
	}
}

</style>
