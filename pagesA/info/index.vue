<template>
<view class="container">
	<view class="shop-page" :style="miniNavPageStyle()">
		<view class="shop-nav" :style="miniNavBarStyle()">
			<image class="nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
		</view>
		<view class="form-list">
			<view class="form-row name-row">
				<text class="row-label">店铺名称</text>
				<input class="row-input" v-model="formData.name" placeholder="请输入店铺名称" />
				<text class="row-arrow">›</text>
			</view>
			<view class="form-row avatar-row" @click="chooseAvatar">
				<text class="row-label">店铺头像</text>
				<view class="avatar-thumb">
					<image v-if="formData.avatar" :src="formData.avatar" mode="aspectFill"></image>
					<view v-else class="avatar-placeholder"></view>
				</view>
				<text class="row-arrow">›</text>
			</view>
			<view class="form-row short-name-row">
				<text class="row-label">店铺简称</text>
				<input class="row-input" v-model="formData.shortName" placeholder="修改简称" />
				<text class="row-arrow">›</text>
			</view>
			<view class="form-row">
				<text class="row-label">联系电话</text>
				<input class="row-input" v-model="formData.mobile" type="number" maxlength="11" placeholder="请输入联系电话" />
				<text class="row-arrow">›</text>
			</view>
			<view class="form-row" @click="generateShopQrCode">
				<text class="row-label">生成核销码</text>
				<text class="row-placeholder">{{ formData.shopCodeUrl ? '查看核销码' : '核销码' }}</text>
				<text class="row-arrow">›</text>
			</view>
			<view class="form-row media-row" @click="chooseBanner">
				<text class="row-label">店铺照片</text>
				<image v-if="formData.banner" class="shop-photo" :src="formData.banner" mode="aspectFill"></image>
				<text v-else class="row-placeholder">上传图片</text>
				<text class="row-arrow">›</text>
			</view>
			<view class="form-row">
				<text class="row-label">店铺介绍</text>
				<input class="row-input" v-model="formData.shopInfo" maxlength="120" placeholder="修改介绍" />
				<text class="row-arrow">›</text>
			</view>
		</view>
		<view class="save-bar">
			<button class="save-button" :loading="saving" @click="submitForm">保存修改</button>
		</view>
		<view v-if="qrVisible" class="qr-mask" @click="qrVisible = false">
			<view class="qr-dialog" @click.stop>
				<text class="qr-title">核销码</text>
				<image class="qr-image" :src="formData.shopCodeUrl" mode="aspectFit"></image>
				<button class="qr-save" @click="saveQrImage">保存图片</button>
			</view>
		</view>
	</view>
</view>
</template>

<script>
import { getLeaderShopInfo, makeLeaderShopQrCode, saveLeaderShopInfo } from "@/api/leader.js"
import { uploadLeaderShopImage } from "@/api/upload.js"
import { buildLeaderShopPayload, isValidMobile, normalizeLeaderShop } from "@/utils/leaderConfig.js"

export default {
	data() {
		return {
			formData: normalizeLeaderShop({}),
			isCreateMode: false,
			qrVisible: false,
			saving: false
		}
	},
	onLoad() {
		this.initShopInfo()
	},
	methods: {
		goBack() {
			uni.navigateBack({ delta: 1 })
		},
		closeCurrentPageAfterSave() {
			setTimeout(() => {
				uni.navigateBack({ delta: 1 })
			}, 600)
		},
		syncLeaderShopContext(shopInfo = {}) {
			const leaderId = shopInfo.lid || shopInfo.leaderId || ''
			if (leaderId) {
				uni.setStorageSync('leader_lid', leaderId)
			}
			if (shopInfo.sid) uni.setStorageSync('leader_sid', shopInfo.sid)
			if (shopInfo.shop || shopInfo.name || shopInfo.shopName) uni.setStorageSync('leader_shop', shopInfo.shop || shopInfo.name || shopInfo.shopName)
			if (shopInfo.staffName || shopInfo.leaderName || shopInfo.name) uni.setStorageSync('leader_name', shopInfo.staffName || shopInfo.leaderName || shopInfo.name)
			const leaderAvatar = shopInfo.shopLogo || shopInfo.avatar || shopInfo.logo || shopInfo.shopAvatar || shopInfo.headImg || ''
			if (leaderAvatar) uni.setStorageSync('leader_avatar', leaderAvatar)
		},
		cacheLeaderShopInfo(shopInfo = {}) {
			// 只缓存店铺基础信息用于其它页面展示；核销码不再落本地缓存，
			// 一律以 /user/leader/shop/info 返回的 shopCodeUrl 为准（无值即表示尚未生成）。
			const normalized = normalizeLeaderShop(Object.assign({}, this.formData, shopInfo))
			uni.setStorageSync('leader_shop_info', normalized)
		},
		async refreshShopInfoAfterQrGenerated(shopUrl) {
			try {
				const res = await getLeaderShopInfo()
				const apiCodeUrl = (res.data && (res.data.shopCodeUrl || res.data.shopUrl || res.data.url)) || ''
				this.formData = normalizeLeaderShop(Object.assign({}, res.data || {}, {
					shopCodeUrl: apiCodeUrl || shopUrl,
					shopUrl: apiCodeUrl || shopUrl
				}))
				this.isCreateMode = !this.formData.shopId
				this.syncLeaderShopContext(this.formData)
				this.cacheLeaderShopInfo(this.formData)
			} catch (err) {
				console.log('刷新店铺二维码信息失败：', err)
			}
		},
		async initShopInfo() {
			try {
				const res = await getLeaderShopInfo()
				// 核销码只认接口返回值：没有 shopCodeUrl 就说明后端还没生成。
				this.formData = normalizeLeaderShop(res.data || {})
				this.isCreateMode = !this.formData.shopId
				if (res.data) {
					this.syncLeaderShopContext(this.formData)
					this.cacheLeaderShopInfo(this.formData)
				}
			} catch (err) {
				console.log('店铺信息加载失败：', err)
				uni.showToast({ title: '店铺信息加载失败', icon: 'none' })
			}
		},
		isChooseImageCancel(err) {
			return /cancel|取消/.test(String((err && err.errMsg) || (err && err.message) || err || ''))
		},
		async chooseBanner() {
			try {
				const choose = await uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
				const filePath = choose.tempFilePaths && choose.tempFilePaths[0]
				if (!filePath) return
				this.formData.banner = await uploadLeaderShopImage(filePath)
			} catch (err) {
				if (this.isChooseImageCancel(err)) {
					uni.showToast({ title: '取消上传', icon: 'none' })
					return
				}
				console.log('店铺图片上传失败：', err)
				uni.showToast({ title: '图片上传失败', icon: 'none' })
			}
		},
		async chooseAvatar() {
			try {
				const choose = await uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
				const filePath = choose.tempFilePaths && choose.tempFilePaths[0]
				if (!filePath) return
				const shopLogo = await uploadLeaderShopImage(filePath)
				this.formData.shopLogo = shopLogo
				this.formData.avatar = shopLogo
			} catch (err) {
				if (this.isChooseImageCancel(err)) {
					uni.showToast({ title: '取消上传', icon: 'none' })
					return
				}
				console.log('店铺头像上传失败：', err)
				uni.showToast({ title: '头像上传失败', icon: 'none' })
			}
		},
		async generateShopQrCode() {
			try {
				const existingQrUrl = this.formData.shopCodeUrl || this.formData.shopUrl || ''
				if (existingQrUrl) {
					this.formData.shopCodeUrl = existingQrUrl
					this.formData.shopUrl = existingQrUrl
					this.qrVisible = true
					return
				}
				const res = await makeLeaderShopQrCode({ shopId: Number(this.formData.shopId || 0) })
				const shopUrl = res.data || ''
				if (!shopUrl) throw new Error('未返回核销码')
				this.formData.shopUrl = shopUrl
				this.formData.shopCodeUrl = shopUrl
				this.syncLeaderShopContext(this.formData)
				this.cacheLeaderShopInfo(this.formData)
				await this.refreshShopInfoAfterQrGenerated(shopUrl)
				this.qrVisible = Boolean(this.formData.shopCodeUrl)
			} catch (err) {
				console.log('生成核销码失败：', err)
				uni.showToast({ title: '生成失败', icon: 'none' })
			}
		},
		saveLocalQrImage(filePath) {
			uni.saveImageToPhotosAlbum({
				filePath,
				success: () => uni.showToast({ title: '保存成功', icon: 'success' }),
				fail: err => {
					console.log('保存店铺核销码失败：', err)
					uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' })
				}
			})
		},
		saveQrImage() {
			const qrUrl = this.formData.shopCodeUrl || this.formData.shopUrl || ''
			if (!qrUrl) {
				uni.showToast({ title: '暂无核销码', icon: 'none' })
				return
			}
			if (!/^https?:\/\//.test(qrUrl)) {
				this.saveLocalQrImage(qrUrl)
				return
			}
			uni.showLoading({ title: '下载中...' })
			uni.downloadFile({
				url: qrUrl,
				success: res => {
					if (res.statusCode !== 200 || !res.tempFilePath) {
						uni.showToast({ title: '图片下载失败', icon: 'none' })
						return
					}
					this.saveLocalQrImage(res.tempFilePath)
				},
				fail: err => {
					console.log('下载店铺核销码失败：', err)
					uni.showToast({ title: '网络异常', icon: 'none' })
				},
				complete: () => uni.hideLoading()
			})
		},
		async submitForm() {
			const payload = buildLeaderShopPayload(this.formData)
			if (!payload.name) {
				uni.showToast({ title: '请输入店铺名称', icon: 'none' })
				return
			}
			if (!payload.mobile) {
				uni.showToast({ title: '请输入联系电话', icon: 'none' })
				return
			}
			if (!isValidMobile(payload.mobile)) {
				uni.showToast({ title: '请输入正确手机号', icon: 'none' })
				return
			}
			if (!payload.banner) {
				uni.showToast({ title: '请上传店铺照片', icon: 'none' })
				return
			}
			this.saving = true
			try {
				console.log('[Leader Shop Save Payload]', payload)
				await saveLeaderShopInfo(payload)
				await this.initShopInfo()
				uni.showToast({ title: '保存成功', icon: 'success' })
				this.closeCurrentPageAfterSave()
			} catch (err) {
				console.log('保存店铺信息失败：', err)
				uni.showToast({ title: '保存失败', icon: 'none' })
			} finally {
				this.saving = false
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.shop-page {
	min-height: 100vh;
	background: #fff;
	padding: 0 48rpx 140rpx;
	box-sizing: border-box;
}

.shop-nav {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 20;
	background: #fff;
	box-sizing: border-box;
}

.nav-back {
	position: absolute;
	left: 40rpx;
	width: 36rpx;
	height: 36rpx;
}

.form-list {
	background: #fff;
	padding-top: 88rpx;
}

.form-row {
	min-height: 74rpx;
	padding: 0;
	display: flex;
	align-items: center;
	box-sizing: border-box;
}

.name-row {
	margin-bottom: 44rpx;
}

.avatar-row {
	margin-bottom: 64rpx;
}

.short-name-row {
	margin-bottom: 2rpx;
}

.row-label {
	width: 210rpx;
	font-size: 28rpx;
	color: #111;
	flex-shrink: 0;
}

.row-input {
	flex: 1;
	min-width: 0;
	height: 74rpx;
	font-size: 28rpx;
	text-align: right;
	color: #666;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.avatar-thumb {
	width: 48rpx;
	height: 48rpx;
	border-radius: 4rpx;
	margin-left: auto;
	background: #f0f0f0;
	overflow: hidden;
}

.avatar-thumb image,
.avatar-placeholder {
	width: 100%;
	height: 100%;
	display: block;
}

.avatar-placeholder {
	position: relative;
	background: #f6f6f6;
}

.avatar-placeholder::before {
	content: "";
	position: absolute;
	left: 15rpx;
	top: 9rpx;
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	background: #cfcfcf;
}

.avatar-placeholder::after {
	content: "";
	position: absolute;
	left: 9rpx;
	bottom: 5rpx;
	width: 30rpx;
	height: 16rpx;
	border-radius: 16rpx 16rpx 0 0;
	background: #cfcfcf;
}

.media-row {
	min-height: 74rpx;
}

.shop-photo {
	width: 56rpx;
	height: 56rpx;
	border-radius: 4rpx;
	margin-left: auto;
	background: #f0f0f0;
}

.row-placeholder {
	margin-left: auto;
	max-width: 360rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: #666;
	font-size: 28rpx;
	text-align: right;
}

.row-arrow {
	width: 34rpx;
	margin-left: 12rpx;
	color: #777;
	font-size: 54rpx;
	line-height: 1;
	text-align: right;
}

.save-bar {
	position: fixed;
	left: 24rpx;
	right: 24rpx;
	bottom: 0;
	padding: 20rpx 0 40rpx;
	background: #fff;
}

.save-button {
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 8rpx;
	background: #19be6b;
	color: #fff;
	font-size: 28rpx;
}

.qr-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, .45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
}

.qr-dialog {
	width: 560rpx;
	background: #fff;
	border-radius: 16rpx;
	padding: 40rpx;
	text-align: center;
	box-sizing: border-box;
}

.qr-title {
	font-size: 34rpx;
	font-weight: 600;
	color: #222;
}

.qr-image {
	width: 360rpx;
	height: 360rpx;
	margin: 36rpx auto;
	display: block;
}

.qr-save {
	height: 76rpx;
	line-height: 76rpx;
	border-radius: 38rpx;
	background: #19be6b;
	color: #fff;
	font-size: 28rpx;
}
</style>
