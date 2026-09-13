<template>
<view class="modal-overlay" v-if="showModal" @click="closeModal">
<view class="modal" @click.stop>
	<view class="modal-header">
		<text class="modal-title">{{ isEdit ? '编辑营业执照' : '添加营业执照' }}</text>
		<text class="modal-close" @click="closeModal">×</text>
	</view>
	<view class="modal-body">
		
		<view class="form-group">
			<text class="form-label required">主体类型</text>
			<radio-group class="radio-group" @change="handleRadioCheckedChange">
				<label class="radio-item" v-for="(item, index) in accountType" :key="index">
					<radio :value="item.id" :checked="item.id == formData.type" color="#1890ff" style="transform:scale(0.7)" />
					<text>{{item.name}}</text>
				</label>
			</radio-group>
		</view>
		<view class="form-group">
			<text class="form-label required">主体名称</text>
			<input type="text" class="form-input" v-model="formData.name" placeholder="请输入主体名称" />
		</view>
		<view class="form-group">
			<text class="form-label required">法人姓名</text>
			<input type="text" class="form-input" v-model="formData.legal" placeholder="请输入法人姓名" />
		</view>
		<view class="form-group">
			<text class="form-label required">纳税额度</text>
			<input type="digit" class="form-input" v-model="formData.tax" placeholder="请输入纳税额度，单位：万/月" @input="onTaxInput" />
		</view>
		<view class="form-group">
			<text class="form-label required">身份证号</text>
			<input type="text" class="form-input" v-model="formData.no" placeholder="请输入身份证号" />
		</view>
		<!--
		<view class="form-group">
			<text class="form-label required">证件正面</text>
			<view class="upload-list">
				<view class="upload-item" v-if="formData.front">
					<image :src="formData.front" mode="aspectFill" />
					<view class="upload-delete" @click="removeImage()">×</view>
				</view>
				<view class="upload-add" @click="chooseImage" v-else>
					<text class="iconfont icon-plus">+</text>
					<text>添加图片</text>
				</view>
			</view>
		</view>
		<view class="form-group">
			<text class="form-label">证件反面</text>
			<view class="upload-list">
				<view class="upload-item" v-if="formData.back">
					<image :src="formData.back" mode="aspectFill" />
					<view class="upload-delete" @click="removeImage2()">×</view>
				</view>
				<view class="upload-add" @click="chooseImage2" v-else>
					<text class="iconfont icon-plus">+</text>
					<text>添加图片</text>
				</view>
			</view>
		</view>
		-->
	</view>
	<view class="modal-footer">
		<view class="btn btn-default" @click="closeModal()">取消</view>
		<view class="btn btn-primary" @click="saveData()">保存</view>
	</view>
</view>
</view>
</template>

<script>
import { uploadImage } from "@/api/upload.js"	
import { addLeaderBusinessInfo, editLeaderBusinessInfo } from "@/api/leader.js"
import { limitPricePrecision } from "@/utils/leaderProduct.js"
export default {
	data() {
		return {
			showModal: false,
			isEdit: false,
			formData: {
				id: 0,
				type: 4,
				name: '',
				legal: '',
				no: '',
				front: '',
				back: '',
				tax: ''
			}
		}
	},
	// 父组件传递过来的数据
	props: {
		accountType: {
			type: Array,
			default: []
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
		show(info){
			if(info == null){
				this.isEdit = false
				this.formData.id = 0
				this.formData.type = 4
				this.formData.name = ''
				this.formData.legal = ''
				this.formData.no = ''
				this.formData.front = ''
				this.formData.back = ''
				this.formData.tax = ''
			}else{
				this.isEdit = true
				this.formData.id = info.id
				this.formData.type = info.type
				this.formData.name = info.name
				this.formData.legal = info.legal
				this.formData.no = info.no
				this.formData.front = info.front
				this.formData.back = info.back
				this.formData.tax = info.tax
			}
			this.showModal = true
		},
		closeModal(){
			this.showModal = false
		},
		// radio的change事件
		handleRadioCheckedChange(e){

			this.formData.type = e.detail.value
		},
		onTaxInput(e) {
			const value = limitPricePrecision(e.detail.value)
			this.formData.tax = value
			return value
		},
		// 选择图片
		async chooseImage() {
			
			let filePath = ""
			
			// 选择图片
			try {
				const res = await uni.chooseImage({
					count: 1, // 限制1张
					sizeType: ["compressed"], // 压缩图
					sourceType: ["album", "camera"] // 相册+相机
				});
				filePath = res.tempFilePaths[0]
			} catch (err) {
				console.log("选择图片失败", err)
				uni.showToast({ title: "选择图片失败", icon: "none" });
			}
			
			// 判断图片路径
			if(filePath == "") return
			console.log("获取图片路径：", filePath)
			
			// 上传图片
			// try {
			// 	this.formData.front = await uploadImage('', filePath)
			// } catch (err) {
			// 	console.log('上传图片失败：', err)
			// }			
		},
		// 删除图片
		removeImage(index) {
			this.formData.front = ""
		},
		// 选择图片
		async chooseImage2() {
			
			let filePath = ""
			
			// 选择图片
			try {
				const res = await uni.chooseImage({
					count: 1, // 限制1张
					sizeType: ["compressed"], // 压缩图
					sourceType: ["album", "camera"] // 相册+相机
				});
				filePath = res.tempFilePaths[0]
			} catch (err) {
				console.log("选择图片失败", err)
				uni.showToast({ title: "选择图片失败", icon: "none" });
			}
			
			// 判断图片路径
			if(filePath == "") return
			console.log("获取图片路径：", filePath)
			
			// 上传图片
			// try {
			// 	this.formData.back = await uploadImage('', filePath)
			// } catch (err) {
			// 	console.log('上传图片失败：', err)
			// }			
		},
		// 删除图片
		removeImage2(index) {
			this.formData.back = ""
		},
		// 保存数据
		async saveData() {
			this.formData.tax = limitPricePrecision(this.formData.tax)
			
			if (!this.formData.name) {
				uni.showToast({ title: '请输入主体名称', icon: 'none' })
				return
			}
			if (!this.formData.legal) {
				uni.showToast({ title: '请输入法人姓名', icon: 'none' })
				return
			}
			if (!this.formData.tax) {
				uni.showToast({ title: '请输入纳税额度', icon: 'none' })
				return
			}
			if (!this.formData.no) {
				uni.showToast({ title: '请输入身份证号', icon: 'none' })
				return
			}
			// if (!this.formData.front) {
			// 	uni.showToast({ title: '请添加证件照片', icon: 'none' })
			// 	return
			// }
			
			try {
				// 添加还是修改
				if(this.isEdit){
					const res = await editLeaderBusinessInfo(this.formData)
				}else{
					const res = await addLeaderBusinessInfo(this.formData)
				}
			} catch (err) {
				console.log('保存成功失败：', err)
			}
			
			uni.showToast({ title: '保存成功', icon: 'success' })
			this.closeModal()
			this.$emit("childEvent")
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
