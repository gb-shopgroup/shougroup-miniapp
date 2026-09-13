<template>
<view v-if="showModal" class="modal-mask" @click.self="closeModal">
	<view class="img-box">
		<!-- 预览图片 -->
		<image :src="img" style="width:80%;max-height:80vh;margin-bottom:20rpx;" mode="widthFix"></image>
		<!-- 关闭按钮 -->
		<view class="close-btn" @click="closeModal">×</view>
		<!-- 下载按钮 -->
		<button @click="saveImgToAlbum()">下载保存到手机相册</button>
	</view>
</view>
</template>

<script>
import { downImage } from "@/api/upload.js"
export default {
	data() {
		return {
			showModal: false, // 弹窗显示状态
			img: ''     // base64图片
		}
	},
	created() {
		//console.log("component created function run.")
	},
	mounted(){
		//console.log("component mounted function run.")
	},
	methods: {
		// 打开弹框
		async show(url){
			
			this.img = url
			this.showModal = true
		},
		// 关闭弹窗
		closeModal() {
			
			this.showModal = false
			this.img = ''
		},
		// 下载图片
		saveImgToAlbum(){
			
			uni.showLoading({ title: '下载中...' })
			uni.downloadFile({
				url: this.img,
				success: (res) => {
					if (res.statusCode === 200) {
						// 保存临时图片到相册
						uni.saveImageToPhotosAlbum({
							filePath: res.tempFilePath,
							success: () => {
								uni.hideLoading()
								uni.showToast({ title: '保存成功' })
							},
							fail: (err) => {
								uni.hideLoading()
								console.error('保存失败', err)
								uni.showToast({ title: '保存失败', icon: 'none' })
							}
						})
					} else {
						uni.hideLoading()
						uni.showToast({ title: '图片下载失败', icon: 'none' })
					}
				},
				fail: (err) => {
					uni.hideLoading()
					console.error('download失败', err)
					uni.showToast({ title: '网络异常', icon: 'none' })
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
/* 遮罩层 全屏覆盖 */
.modal-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.8);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
}

/* 图片容器 */
.img-box {
	width: 85%;
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
}

/* 关闭按钮 */
.close-btn {
	position: absolute;
	top: -40rpx;
	right: 0;
	width: 60rpx;
	height: 60rpx;
	line-height: 60rpx;
	text-align: center;
	font-size: 40rpx;
	color: #fff;
}
</style>
