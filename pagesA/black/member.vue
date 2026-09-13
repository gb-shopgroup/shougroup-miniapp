<template>
<view class="modal-overlay" v-if="showModal" @click="closeModal()">
<view class="modal" @click.stop>
	<view class="modal-header">
		<text class="modal-title">用户信息</text>
		<text class="modal-close" @click="closeModal()">×</text>
	</view>
	<view class="modal-body">
		
		<view class="form-group">
			<text class="form-label">头像</text>
			<image :src="formData.avatar" style="width: 80rpx; height: 80rpx;" mode="widthFix"></image>
		</view>
		
		<view class="form-group">
			<text class="form-label">昵称</text>
			<text class="form-value">{{ formData.nickname }}</text>
		</view>
		
		<view class="form-group">
			<text class="form-label">手机</text>
			<text class="form-value">{{ formData.mobile }}</text>
		</view>

	</view>
	<view class="modal-footer">
		<view class="btn btn-default" @click="closeModal()">取消</view>		
		<view class="btn btn-primary" @click="saveData()">
			<text v-if="isNewMember">添加</text>
			<text v-else>解除</text>
		</view>
	</view>
</view>
</view>
</template>

<script>
import { normalizeBlackMember } from "@/utils/leaderConfig.js"
export default {
	data() {
		return {
			showModal: false,
			isNewMember: true,
			formData: {
				// 用户id
				id: 0,
				memberId: 0,
				// 手机号码
				mobile: '',
				// 微信昵称
				nickname: '',
				// 微信头像
				avatar: ''
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
		// 显示用户信息
		show(memberInfo, isNew){

			const member = normalizeBlackMember(memberInfo || {})
			this.isNewMember = isNew
			this.formData.id = member.id
			this.formData.memberId = member.memberId
			this.formData.nickname = member.nickname
			this.formData.avatar = member.avatar
			this.formData.mobile = member.mobile
			this.showModal = true
		},
		// 关闭弹框
		closeModal(){
			
			this.showModal = false
		},
		// 保存数据
		async saveData() {
			
			this.closeModal()
			if(this.isNewMember){
				this.$emit("childEvent", this.formData)
			}else{
				this.$emit("childEvent2", this.formData)
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
