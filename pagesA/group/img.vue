<template>
<view v-if="showModal" class="modal-mask" @click.self="closeModal">
	<view class="img-box">
		<!-- 预览图片 -->
		<image :src="img" style="width:80%;max-height:70vh;margin-bottom:20rpx;" mode="widthFix"></image>
		<!-- 关闭按钮 -->
		<view class="close-btn" @click="closeModal">×</view>
		<!-- 分享入口：微信/朋友圈走 showShareImageMenu 图片分享面板，保存走相册 -->
		<view class="poster-actions">
			<button class="poster-action-btn wechat-btn" @click="sharePosterToWechat">
				<text class="action-icon wechat-icon">微</text>
				<text>分享给微信</text>
			</button>
			<button class="poster-action-btn timeline-btn" @click="sharePosterToTimeline">
				<text class="action-icon timeline-icon">圈</text>
				<text>分享朋友圈</text>
			</button>
		</view>
		<button class="save-btn" @click="saveImgToAlbum()">下载保存到手机相册</button>
	</view>
</view>
</template>

<script>
export default {
	data() {
		return {
			showModal: false, // 弹窗显示状态
			img: '',          // 海报图片地址（URL）
			sharing: false    // 分享请求锁，防止重复下载/调起
		}
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
		// 分享给微信好友
		async sharePosterToWechat(){
			await this.sharePoster(['shareAppMessage'])
		},
		// 分享到朋友圈
		async sharePosterToTimeline(){
			await this.sharePoster(['shareTimeline'])
		},
		// 海报图片分享：先下载成本地临时文件，再调起微信图片分享面板
		// 基础库 2.14.3+ 支持 showShareImageMenu；shareTimeline 菜单需 2.26.0+，低版本会 fail 后降级保存相册
		async sharePoster(menus){
			if(this.sharing || !this.img) return
			// 非微信小程序或基础库过低时没有图片分享菜单，降级为保存相册后手动分享
			if(typeof wx === 'undefined' || typeof wx.showShareImageMenu !== 'function'){
				uni.showToast({ title: '请保存图片后手动分享', icon: 'none' })
				this.saveImgToAlbum()
				return
			}
			this.sharing = true
			uni.showLoading({ title: '加载海报中...', mask: true })
			try {
				const filePath = await this.downloadPosterTempFile()
				uni.hideLoading()
				wx.showShareImageMenu({
					path: filePath,
					menus,
					fail: (err) => {
						console.log('分享海报失败：', err)
						// 用户主动取消不打扰；版本/权限不支持时降级为保存相册
						if (err && /cancel/i.test(err.errMsg || '')) return
						uni.showToast({ title: '当前微信版本不支持，请保存图片后手动分享', icon: 'none' })
						this.saveImgToAlbum()
					}
				})
			} catch (err) {
				console.log('海报下载失败：', err)
				uni.hideLoading()
				uni.showToast({ title: '海报加载失败，请重试', icon: 'none' })
			} finally {
				this.sharing = false
			}
		},
		// 下载海报为本地临时文件（showShareImageMenu 的 path 要求本地路径）
		downloadPosterTempFile(){
			return new Promise((resolve, reject) => {
				uni.downloadFile({
					url: this.img,
					success: (res) => {
						if (res.statusCode === 200) resolve(res.tempFilePath)
						else reject(new Error('图片下载失败 ' + res.statusCode))
					},
					fail: reject
				})
			})
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

/* 分享按钮组 */
.poster-actions {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 24rpx;
	width: 100%;
	margin-bottom: 20rpx;
}

.poster-action-btn {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	height: 130rpx;
	padding: 0;
	border-radius: 14rpx;
	background: #fff;
	color: #555;
	font-size: 24rpx;
	line-height: 34rpx;
}

.poster-action-btn::after {
	border: none;
}

.action-icon {
	width: 64rpx;
	height: 64rpx;
	line-height: 64rpx;
	border-radius: 50%;
	text-align: center;
	font-size: 24rpx;
	font-weight: 600;
}

.wechat-icon {
	color: #fff;
	background: #22c55e;
}

.timeline-icon {
	color: #22c55e;
	background: #f2f3f5;
}

.save-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	padding: 0;
	border-radius: 14rpx;
	background: #22c55e;
	color: #fff;
	font-size: 28rpx;
}

.save-btn::after {
	border: none;
}
</style>
