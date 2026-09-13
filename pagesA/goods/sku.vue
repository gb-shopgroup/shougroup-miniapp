<template>
<view class="container">
<LeaderHeader title="添加SKU" />
<view class="page">
<view class="card">

	<view class="info-section">
	<view class="section-title">{{ this.goodsName }}</view>
	<view class="spec-list">
			<view class="spec-item" v-for="(spec, index) in skuList" :key="index">
				<view class="spec-name">{{ spec.names }}</view>
				<view class="sku-image-row">
					<image v-if="spec.img" class="sku-image" :src="spec.img" mode="aspectFill"></image>
					<view class="sku-image-placeholder" v-else>SKU图</view>
					<view class="btn btn-default btn-small" @click="chooseSkuImage(index)">上传图片</view>
				</view>
				<view class="form-row">
					<view class="form-group">
						<view class="form-label">销售价：</view>
						<input type="digit" class="form-input" v-model="spec.price" placeholder="价格" @input="onSkuPriceInput(index, 'price', $event)" />
					</view>
					<view class="form-group">
						<view class="form-label">划线价：</view>
						<input type="digit" class="form-input" v-model="spec.price2" placeholder="划线价" @input="onSkuPriceInput(index, 'price2', $event)" />
					</view>
					<view class="form-group">
						<view class="form-label">库存：</view>
						<input type="number" class="form-input" v-model="spec.num" placeholder="库存" />
			</view>
		</view>
	</view>
	</view>
	</view>

	<view class="action-bar">
		<view class="btn btn-default" @click="goBack()">返回</view>
		<view class="btn btn-primary" @click="saveSku()">保存</view>
	</view>

</view>	
</view>
</view>
</template>

<script>
import LeaderHeader from "../common/header.vue"
import { uploadProductImage } from "@/api/upload.js"
import { getLeaderGoodsSkuSpecList } from "@/api/leader.js"
import { buildLeaderSkuSavePayload, limitPricePrecision, normalizeLeaderSkuList } from "@/utils/leaderProduct.js"
export default {
	data() {
		return {
			goodsId: 0,
			goodsName: '',
			skuList: [],
		}
	},
	components: { LeaderHeader },
	onLoad(options) {
		this.initEventChannel()
		if (options.id) {
			this.goodsId = options.id
			this.initSku()
		}
		if (options.name) {
			this.goodsName = options.name
		}		
	},
	methods: {
		initEventChannel() {
			const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
			if (!eventChannel || !eventChannel.on) return
			eventChannel.on('initGoodsSkus', data => {
				const payload = data || {}
				if (!this.goodsId) this.goodsId = Number(payload.goodsId || 0)
				if (!this.goodsName && payload.goodsName) this.goodsName = payload.goodsName
				const skus = normalizeLeaderSkuList(payload.skuList || [])
				if (skus.length > 0) this.skuList = this.mergeSkuList(this.skuList, skus)
			})
		},
		// 初始化所有sku信息
		async initSku(){
			
			try {
				const params = {id: this.goodsId }
				const res = await getLeaderGoodsSkuSpecList(params)
				this.skuList = this.mergeSkuList(normalizeLeaderSkuList(res.data), this.skuList)
			} catch (err) {
				console.log('初始化所有sku信息失败：', err)
			}
		},
		mergeSkuList(baseList = [], draftList = []) {
			const drafts = normalizeLeaderSkuList(draftList)
			const draftMap = {}
			drafts.forEach(item => {
				draftMap[item.ids] = item
			})
			return normalizeLeaderSkuList(baseList).map(item => Object.assign({}, item, draftMap[item.ids] || {}))
		},
		onSkuPriceInput(index, field, e) {
			const item = this.skuList[index]
			if (!item) return ''
			const value = limitPricePrecision(e.detail.value)
			item[field] = value
			return value
		},
		// 返回商品列表
		goBack() {
			
			const url = '/pagesA/goods/index'
			uni.navigateBack({
				delta: 1,
				fail: () => {
					uni.redirectTo({ url: url })
				}
			})
		},
		async chooseSkuImage(index) {
			try {
				const chooseRes = await uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera']
				})
				const filePath = chooseRes.tempFilePaths[0] || ''
				if (!filePath) return
				this.skuList[index].img = await uploadProductImage(filePath)
			} catch (err) {
				console.log('上传sku图片失败：', err)
				uni.showToast({ title: '上传SKU图片失败', icon: 'none' })
			}
		},
		validateSkuList() {
			if (!Array.isArray(this.skuList) || this.skuList.length === 0) {
				uni.showToast({ title: '请先设置商品规格', icon: 'none' })
				return false
			}
			for (let i = 0; i < this.skuList.length; i++) {
				const item = this.skuList[i]
				if (!item.price && Number(item.price || 0) <= 0) {
					uni.showToast({ title: item.names + '销售价不能为空', icon: 'none' })
					return false
				}
				if (item.num === '' || item.num === undefined || item.num === null) {
					uni.showToast({ title: item.names + '库存不能为空', icon: 'none' })
					return false
				}
			}
			return true
		},
		// 保存sku信息
		async saveSku() {
			
			try {
				if (!this.validateSkuList()) return
				this.skuList = this.skuList.map(item => Object.assign({}, item, {
					price: limitPricePrecision(item.price),
					price2: limitPricePrecision(item.price2)
				}))
				const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
				if (eventChannel && eventChannel.emit) {
					eventChannel.emit('acceptGoodsSkus', { skuList: buildLeaderSkuSavePayload(this.skuList) })
				}
				uni.showToast({ title: '保存成功' })
				this.goBack()
			} catch (err) {
				const title = (err && err.msg) || err || '保存SKU失败'
				uni.showToast({ title: String(title), icon: 'none' })
				console.log('保存SKU失败：', err)
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.card {
	background: #fff;
	border-radius: 16rpx;
	padding: 15rpx;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	.card-header {
		margin-bottom: 30rpx;
		.card-title {
			font-size: 32rpx;
			font-weight: 600;
			color: #333;
		}
	}
}

.info-section {
	margin-bottom: 30rpx;
	.section-title {
		font-size: 28rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 20rpx;
		padding-bottom: 16rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}
}

.spec-list {
	.spec-item {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		padding: 20rpx;
		background: #fafafa;
		border-radius: 12rpx;
		margin-bottom: 16rpx;
		.spec-name {
			flex: 1;
			font-size: 28rpx;
			color: #333;
			font-weight: bold;
			padding-bottom: 10rpx;
			border-bottom: 1rpx dotted #ddd;
		}
	}
}

.sku-image-row {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.sku-image,
.sku-image-placeholder {
	width: 96rpx;
	height: 96rpx;
	border-radius: 8rpx;
	background: #f2f2f2;
}

.sku-image-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	color: #999;
	font-size: 22rpx;
}

.form-row {
	display: flex;
	gap: 30rpx;
	.form-group {
		flex: 1;
	}
}

.form-group {
	display: flex;
	align-items: center;
	margin-bottom: 20rpx;
	background-color: #f5f5f5;
	.form-label {
		font-size: 28rpx;
		color: #333;
	}
	.form-input {
		flex: 1;
		height: 80rpx;
		padding: 0 24rpx;
		border: 2rpx solid #e8e8e8;
		border-radius: 8rpx;
		font-size: 28rpx;
		box-sizing: border-box;
	}
}

.action-bar {
  display: flex;
  gap: 20rpx;
  justify-content: center;
  padding-top: 40rpx;
  border-top: 1rpx solid #f0f0f0;
}

.badge {
  display: inline-block;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 22rpx;

  &.badge-primary {
    background: #e6f7ff;
    color: #1890ff;
  }

  &.badge-warning {
    background: #fff7e6;
    color: #fa8c16;
  }

  &.badge-success {
    background: #f6ffed;
    color: #52c41a;
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 60rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;

  &.btn-primary {
    background: #1890ff;
    color: #fff;
  }
  &.btn-default {
    background: #f5f5f5;
    color: #666;
  }
  &.btn-warning {
    background: #faad14;
    color: #fff;
  }
}

.flex {
  display: flex;

  &.gap-8 {
    gap: 16rpx;
  }
}

.text-primary {
  color: #1890ff;
}

.text-success {
  color: #52c41a;
}

.text-danger {
  color: #ff4d4f;
}

.text-warning {
  color: #fa8c16;
}
</style>
