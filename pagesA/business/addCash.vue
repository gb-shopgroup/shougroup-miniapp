<template>
<view class="modal-overlay" v-if="showModal" @click="closeModal">
<view class="modal" @click.stop>
	<view class="modal-header">
		<text class="modal-title">添加提现</text>
		<text class="modal-close" @click="closeModal">×</text>
	</view>
	<view class="modal-body">
		
		<view class="form-group">
			<text class="form-label required">收款账户</text>
			<picker :range="businessList" range-key="name" @change="onBusinessChange">
				<view class="form-picker">{{ businessName || '请选择收款账户' }}</view>
			</picker>
		</view>
		<view class="form-group">
			<text class="form-label required">提现金额</text>
			<input type="digit" class="form-input" v-model="formData.fee" placeholder="请输入提现金额" @input="onFeeInput" />
		</view>
		<view class="form-group">
			<text class="form-label required">提现银行</text>
			<picker :range="bankList" @change="onBankChange">
				<view class="form-picker">{{ formData.bank || '请选择提现银行' }}</view>
			</picker>
		</view>
		<view class="form-group">
			<text class="form-label required">银行卡号</text>
			<input type="number" class="form-input" v-model="formData.no" placeholder="请输入银行卡号" />
		</view>
		<view class="form-group">
			<text class="form-label required">真实姓名</text>
			<input type="text" class="form-input" v-model="formData.name" placeholder="请输入真实姓名" />
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
//import { addLeaderCash, getLeaderBusinessList, getLeaderBankList } from "@/api/leader.js"
import { limitPricePrecision } from "@/utils/leaderProduct.js"
export default {
	data() {
		return {
			showModal: false,
			bankList: [],
			businessList: [],
			businessName : '',
			formData: {
				// 账户id,外键
				id: 0,
				// 提现金额
				fee : 0,
				// 提现银行
				bank: '',
				// 提现银行卡
				no: '',
				// 提现人姓名
				name: ''
			}
		}
	},
	// 父组件传递过来的数据
	props: {
		
	},
	created() {
		//console.log("component created function run.")
	},
	mounted(){
		this.init()
		//console.log("component mounted function run.")
	},
	methods: {
		// 初始化收款账户列表和银行列表
		async init(){
		
			// try {
			// 	const res = await getLeaderBusinessList()
			// 	this.businessList = res.data
			// } catch (err) {
			// 	console.log('初始化收款账户列表失败：', err)
			// }
			
			// try {
			// 	const res = await getLeaderBankList()
			// 	this.bankList = res.data
			// } catch (err) {
			// 	console.log('初始化银行列表失败：', err)
			// }
		},
		// 兼容添加和修改两种情况
		show(){

			this.formData.id = 0
			this.formData.fee = 0
			this.formData.bank = ''
			this.formData.no = ''
			this.formData.name = ''
			this.businessName = ''
			this.showModal = true
		},
		closeModal(){
			this.showModal = false
		},
		// 选择收款账户
		onBusinessChange(e){

			const temp = this.businessList[e.detail.value]
			this.formData.id = temp.id
			this.businessName = temp.name
		},
		// 选择提现银行
		onBankChange(e){

			this.formData.bank = this.bankList[e.detail.value]
		},
		onFeeInput(e) {
			const value = limitPricePrecision(e.detail.value)
			this.formData.fee = value
			return value
		},
		// 保存数据
		async saveData() {
			this.formData.fee = limitPricePrecision(this.formData.fee)
						
			if (this.formData.id == 0) {
				uni.showToast({ title: '请选择收款账户', icon: 'none' })
				return
			}
			if (this.formData.fee == 0) {
				uni.showToast({ title: '请输入提现金额', icon: 'none' })
				return
			}
			if (!this.formData.bank) {
				uni.showToast({ title: '请输入提现银行', icon: 'none' })
				return
			}
			if (!this.formData.no) {
				uni.showToast({ title: '请输入银行卡号', icon: 'none' })
				return
			}
			if (!this.formData.name) {
				uni.showToast({ title: '请输入真实姓名', icon: 'none' })
				return
			}
			
			// try {
			// 	const res = await addLeaderCash(this.formData)
			// 	uni.showToast({ title: '保存成功', icon: 'success' })
			// 	this.closeModal()
			// 	this.$emit("childEvent")
			// } catch (err) {
			// 	uni.showToast({ title: err, icon: 'error' })
			// 	console.log('保存成功失败：', err)
			// }
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
	.form-picker {
		width: 100%;
		height: 80rpx;
		line-height: 80rpx;
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
