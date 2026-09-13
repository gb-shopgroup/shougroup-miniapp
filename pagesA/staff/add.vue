<template>
<view class="modal-overlay" v-if="showModal" @click="closeModal">
<view class="modal" @click.stop>

	<view class="modal-header">
		<text class="modal-title">{{ isEdit ? '编辑员工' : '添加员工' }}</text>
		<text class="modal-close" @click="closeModal">×</text>
    </view>
	
	<view class="modal-body">
		
		<view class="form-group">
			<text class="form-label required">员工昵称</text>
			<input type="text" class="form-input" v-model="formData.name" placeholder="请输入员工昵称" />
        </view>

		<view class="form-group">
			<text class="form-label required">手机号码</text>
			<input type="text" class="form-input" v-model="formData.mobile" placeholder="请输入手机号码" />
		</view>

	</view>

	<view class="modal-footer">
		<view class="btn btn-default" @click="closeModal">取消</view>
		<view class="btn btn-primary" @click="savePoint">保存</view>
	</view>

</view>
</view>
</template>

<script>
import { addLeaderStaffInfo, editLeaderStaffInfo } from "@/api/leader.js"
import { DEFAULT_STAFF_AUTH_IDS, buildLeaderStaffPayload, getCurrentLeaderPointId, isValidMobile, normalizeLeaderStaff } from "@/utils/leaderConfig.js"
export default {
	data() {
		return {
			showModal: false,
			isEdit: false,
			formData: {
				id: 0,
				name: '',
				mobile: '',
				remark: '',
				auth: [],
				point: []
			},
		}
	},
	// 父组件传递过来的数据
	props: {
		pointList: {
			type: Array,
			default: () => []
		}
	},
	created() {
		//console.log("component created function run.")
	},
	mounted(){
		//console.log("component mounted function run.")
	},
	methods: {
		getDefaultPointIds() {
			const currentPointId = getCurrentLeaderPointId()
			if (currentPointId > 0) return [currentPointId]
			const firstPoint = this.pointList[0]
			return firstPoint && firstPoint.id ? [Number(firstPoint.id)] : []
		},
		getDefaultAuthIds() {
			return DEFAULT_STAFF_AUTH_IDS.slice()
		},
		// 打开弹框（兼容修改和添加）
		show(info, forceEdit){
			if(info == null){
				this.isEdit = false
				this.formData.id = 0
				this.formData.name = ''
				this.formData.mobile = ''
				this.formData.remark = ''
				this.formData.auth = this.getDefaultAuthIds()
				this.formData.point = this.getDefaultPointIds()
			}else{
				const staff = normalizeLeaderStaff(info)
				this.isEdit = forceEdit === undefined ? staff.id > 0 : !!forceEdit
				this.formData.id = staff.id
				this.formData.name = staff.name
				this.formData.mobile = staff.mobile
				this.formData.remark = staff.remark
				this.formData.auth = this.getDefaultAuthIds()
				this.formData.point = staff.pointIds.length ? staff.pointIds : this.getDefaultPointIds()
			}
			this.showModal = true
		},
		// 关闭弹框
		closeModal(){
			
			this.showModal = false
		},
		// 保存数据
		async savePoint() {
			
			if (!this.formData.name) {
				uni.showToast({ title: '请输入员工昵称', icon: 'none' })
				return
			}
			if (!this.formData.mobile) {
				uni.showToast({ title: '请输入手机号码', icon: 'none' })
				return
			}
			if (!isValidMobile(this.formData.mobile)) {
				uni.showToast({ title: '请输入正确手机号', icon: 'none' })
				return
			}
			this.formData.auth = this.getDefaultAuthIds()
			
			const payload = buildLeaderStaffPayload({
				id: this.formData.id,
				name: this.formData.name,
				mobile: this.formData.mobile,
				remark: this.formData.remark,
				authIds: this.formData.auth,
				pointIds: this.formData.point
			}, this.getDefaultPointIds()[0] || 0)
			
			// 兼容添加和修改
			try {
				if(this.isEdit){
					const res = await editLeaderStaffInfo(payload)
				}else{
					const res = await addLeaderStaffInfo(payload)
				}
				uni.showToast({ title: '保存成功', icon: 'success' })
				this.closeModal()
				this.$emit("childEvent")
			} catch (err) {
				uni.showToast({ title: err, icon: 'error' })
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
		line-height: 80rpx; // 垂直方向居中
		padding: 0 24rpx;
		border: 2rpx solid #e8e8e8;
		border-radius: 8rpx;
		font-size: 28rpx;
		box-sizing: border-box;
	}
	.form-checkbox {
		display: flex;
		flex-direction: column;
		padding-left: 20rpx;
		color: #999;
		font-size: 24rpx;
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
