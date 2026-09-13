<template>
<view v-if="showModal" class="modal-mask" @click.self="closeModal">
	<view class="qr-card">
		<text class="qr-title">核销码</text>
		<text v-if="title" class="qr-subtitle">{{ title }}</text>
		<image :src="img" mode="aspectFit" class="qr-img"></image>
		<button class="save-button" @click="saveImgToAlbum">保存图片</button>
		<view class="close-btn" @click="closeModal">×</view>
	</view>
</view>
</template>

<script>
export default {
	data() {
		return {
			showModal: false,
			img: '',
			title: ''
		}
	},
	methods: {
		show(url, title = '核销码') {
			this.img = url
			this.title = title
			this.showModal = true
		},
		closeModal() {
			this.showModal = false
			this.img = ''
			this.title = ''
		},
		saveImgToAlbum() {
			if (!this.img) return
			uni.showLoading({ title: '下载中...' })
			uni.downloadFile({
				url: this.img,
				success: res => {
					if (res.statusCode !== 200) {
						uni.showToast({ title: '图片下载失败', icon: 'none' })
						return
					}
					uni.saveImageToPhotosAlbum({
						filePath: res.tempFilePath,
						success: () => uni.showToast({ title: '保存成功', icon: 'success' }),
						fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
					})
				},
				fail: () => uni.showToast({ title: '网络异常', icon: 'none' }),
				complete: () => uni.hideLoading()
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.modal-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, .45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
}

.qr-card {
	position: relative;
	width: 560rpx;
	background: #fff;
	border-radius: 16rpx;
	padding: 42rpx 38rpx 34rpx;
	text-align: center;
	box-sizing: border-box;
}

.qr-title {
	display: block;
	font-size: 34rpx;
	font-weight: 600;
	color: #222;
}

.qr-subtitle {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	color: #666;
}

.qr-img {
	width: 360rpx;
	height: 360rpx;
	margin: 36rpx auto;
	display: block;
	background: #f6f6f6;
}

.save-button {
	height: 76rpx;
	line-height: 76rpx;
	border-radius: 38rpx;
	background: #19be6b;
	color: #fff;
	font-size: 28rpx;
}

.close-btn {
	position: absolute;
	top: 16rpx;
	right: 20rpx;
	width: 48rpx;
	height: 48rpx;
	line-height: 48rpx;
	text-align: center;
	font-size: 40rpx;
	color: #999;
}
</style>
