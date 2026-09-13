<template>
<view class="container">
	<view class="point-form-page" :style="miniNavPageStyle()">
		<view class="nav-title" :style="miniNavBarStyle()">
			<image class="nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
			<text :style="miniNavTitleStyle()">{{ isEdit ? '修改自提点' : '新增自提点' }}</text>
		</view>
		<view class="form-list">
			<view class="form-row">
				<text class="row-label required">自提点名称</text>
				<input class="row-input" v-model="formData.name" placeholder="请输入" />
			</view>
			<view class="form-row" @click="chooseLocation">
				<text class="row-label required">位置</text>
				<text class="row-value">{{ formData.address || '请选择地图位置' }}</text>
				<text class="map-icon">⌖</text>
			</view>
			<view class="form-row">
				<text class="row-label required">详细地址</text>
				<input class="row-input" v-model="formData.address" placeholder="请输入" />
			</view>
			<view class="form-row optional-start">
				<text class="row-label">自提点联系人</text>
				<input class="row-input" v-model="formData.person" placeholder="请输入" />
			</view>
			<view class="form-row">
				<text class="row-label">自提点电话</text>
				<input class="row-input" type="number" maxlength="11" v-model="formData.phone" placeholder="请输入" />
			</view>
			<view class="upload-section">
				<text class="upload-title">上传图片({{ imageCount }}/1)</text>
				<view class="upload-list">
					<view v-for="(image, index) in imageList" :key="image" class="upload-item">
						<image class="upload-img" :src="image" mode="aspectFill"></image>
						<text class="upload-remove" @click.stop="removeImage(index)">×</text>
					</view>
					<view v-if="imageCount < 1" class="upload-box" @click="chooseImage">
						<view class="upload-icon"></view>
						<text class="upload-text">上传图片</text>
					</view>
				</view>
			</view>
		</view>
		<view class="bottom-bar">
			<button class="bottom-button" @click="saveData">确认</button>
		</view>
	</view>
</view>
</template>

<script>
import { addLeaderPointInfo, editLeaderPointInfo } from "@/api/leader.js"
import { uploadLeaderPointImage } from "@/api/upload.js"
import { buildLeaderPointPayload, isValidMobile, normalizeLeaderPoint } from "@/utils/leaderConfig.js"

export default {
	data() {
		return {
			isEdit: false,
			formData: normalizeLeaderPoint({})
		}
	},
	onLoad(options) {
		if (options.data) {
			this.formData = normalizeLeaderPoint(JSON.parse(decodeURIComponent(options.data)))
			this.isEdit = true
		}
	},
	computed: {
		imageList() {
			return Array.isArray(this.formData.images) ? this.formData.images : []
		},
		imageCount() {
			return this.imageList.length
		}
	},
	methods: {
		goBack() {
			uni.navigateBack({ delta: 1 })
		},
		async chooseLocation() {
			try {
				const res = await uni.chooseLocation()
				this.formData.name = this.formData.name || res.name || ''
				this.formData.address = res.address || res.name || this.formData.address
				this.formData.lon = res.longitude
				this.formData.lat = res.latitude
			} catch (err) {
				console.log('选择位置失败：', err)
			}
		},
		async chooseImage() {
			this.ensureImageList()
			const remain = 1 - this.imageCount
			if (remain <= 0) return
			try {
				const res = await uni.chooseImage({ count: remain, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
				const paths = (res.tempFilePaths || []).slice(0, remain)
				for (let index = 0; index < paths.length; index += 1) {
					if (this.formData.images.length >= 1) break
					this.formData.images.push(await uploadLeaderPointImage(paths[index]))
				}
				this.syncImageField()
			} catch (err) {
				console.log('上传自提点图片失败：', err)
				uni.showToast({ title: '图片上传失败', icon: 'none' })
			}
		},
		removeImage(index) {
			this.ensureImageList()
			this.formData.images.splice(index, 1)
			this.syncImageField()
		},
		ensureImageList() {
			if (!Array.isArray(this.formData.images)) this.$set(this.formData, 'images', [])
		},
		syncImageField() {
			this.ensureImageList()
			this.formData.img = this.formData.images[0] || ''
		},
		async saveData() {
			const payload = buildLeaderPointPayload(this.formData)
			if (!payload.name) {
				uni.showToast({ title: '请输入自提点名称', icon: 'none' })
				return
			}
			if (!payload.address) {
				uni.showToast({ title: '请选择位置并填写详细地址', icon: 'none' })
				return
			}
			if (payload.phone && !isValidMobile(payload.phone)) {
				uni.showToast({ title: '请输入正确手机号', icon: 'none' })
				return
			}
			try {
				if (this.isEdit) await editLeaderPointInfo(payload)
				else await addLeaderPointInfo(payload)
				uni.showToast({ title: '保存成功', icon: 'success' })
				uni.navigateBack()
			} catch (err) {
				console.log('保存自提点失败：', err)
				uni.showToast({ title: '保存失败', icon: 'none' })
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #f5f5f5;
}

.point-form-page {
	min-height: 100vh;
	background: #f5f5f5;
	padding: 0 0 146rpx;
	box-sizing: border-box;
}

.nav-title {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 20;
	background: #fff;
	box-sizing: border-box;
}

.nav-title text {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	text-align: center;
	font-size: 34rpx;
	font-weight: 600;
	color: #222;
}

.nav-back {
	position: absolute;
	left: 24rpx;
	width: 36rpx;
	height: 36rpx;
}

.form-list {
	background: #fff;
	box-sizing: border-box;
}

.form-row {
	min-height: 104rpx;
	padding: 0 32rpx;
	display: flex;
	align-items: center;
	border-bottom: 1rpx solid #eee;
	box-sizing: border-box;
}

.form-row.optional-start {
	border-top: 18rpx solid #f5f5f5;
}

.row-label {
	width: 220rpx;
	flex-shrink: 0;
	font-size: 28rpx;
	color: #222;
}

.required::after {
	content: '*';
	color: #ff4d4f;
	margin-left: 4rpx;
}

.row-input,
.row-value {
	flex: 1;
	font-size: 28rpx;
	text-align: right;
	color: #222;
}

.row-value {
	line-height: 40rpx;
}

.map-icon {
	margin-left: 14rpx;
	font-size: 32rpx;
	color: #19be6b;
}

.upload-section {
	padding: 28rpx 32rpx 34rpx;
	background: #fff;
}

.upload-title {
	display: block;
	font-size: 28rpx;
	color: #222;
	margin-bottom: 20rpx;
}

.upload-list {
	display: flex;
	flex-wrap: wrap;
	gap: 20rpx;
}

.upload-item,
.upload-box {
	position: relative;
	width: 150rpx;
	height: 150rpx;
	box-sizing: border-box;
}

.upload-box {
	border: 1rpx dashed #d8d8d8;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: #fafafa;
}

.upload-img {
	width: 100%;
	height: 100%;
}

.upload-remove {
	position: absolute;
	top: -14rpx;
	right: -14rpx;
	width: 32rpx;
	height: 32rpx;
	line-height: 30rpx;
	border-radius: 50%;
	background: #b7b7b7;
	color: #fff;
	font-size: 24rpx;
	text-align: center;
}

.upload-icon {
	position: relative;
	width: 54rpx;
	height: 42rpx;
	border: 4rpx solid #999;
	box-sizing: border-box;
	margin-bottom: 12rpx;
}

.upload-icon::before {
	content: "";
	position: absolute;
	left: 8rpx;
	bottom: 8rpx;
	width: 18rpx;
	height: 18rpx;
	border-left: 4rpx solid #999;
	border-top: 4rpx solid #999;
	transform: rotate(45deg);
}

.upload-icon::after {
	content: "";
	position: absolute;
	right: 8rpx;
	top: 8rpx;
	width: 10rpx;
	height: 10rpx;
	border-radius: 50%;
	background: #999;
}

.upload-text {
	font-size: 26rpx;
	color: #999;
}

.bottom-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 30;
	padding: 18rpx 32rpx calc(18rpx + env(safe-area-inset-bottom));
	background: #fff;
	box-sizing: border-box;
}

.bottom-button {
	width: 100%;
	margin: 0;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 8rpx;
	background: #19be6b;
	color: #fff;
	font-size: 32rpx;
}
</style>
