<template>
<view class="container" :style="miniNavPageStyle()">
	<view class="leader-nav" :style="miniNavBarStyle()">
		<image class="back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack()"></image>
		<text class="title" :style="miniNavTitleStyle()">{{ isAdd ? '添加商品' : '编辑商品' }}</text>
		<text class="nav-placeholder"></text>
	</view>

	<view class="form-list">
		<view class="name-row">
			<view class="name-title-row">
				<text class="label required">商品名称</text>
				<text class="hint">（建议不超过20字）</text>
			</view>
			<input class="name-input" v-model="formData.name" maxlength="20" placeholder="请输入商品名称" />
		</view>

		<view class="form-row tap-row" @click="openCategoryPicker()">
			<text class="label required">商品品类</text>
			<text class="value">{{ selectedCategoryName || '请选择商品品类' }}</text>
			<text class="arrow">›</text>
		</view>

		<view class="form-row image-row">
			<view class="image-title">
				<text class="label required">商品照片</text>
				<text class="image-count">{{ imageCount }}/3</text>
			</view>
			<view class="image-list">
				<view class="upload-item" v-for="item in imageList" :key="item.slot">
					<image :src="item.url" mode="aspectFill"></image>
					<text @click.stop="removeImage(item.slot)">×</text>
				</view>
				<view class="upload-add" v-if="imageCount < 3" @click="chooseImage(nextImageSlot)">
					<view class="camera-icon">
						<view class="camera-top"></view>
						<view class="camera-body">
							<view class="camera-plus-x"></view>
							<view class="camera-plus-y"></view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<view class="form-row tap-row" @click="goSpecPage()">
			<text class="label">商品规格</text>
			<text class="value">{{ specSummary || '请完成规格设置' }}</text>
			<text class="arrow">›</text>
		</view>

			<view class="form-row">
				<text class="label required">商品价格</text>
			<input class="row-input" type="digit" v-model="formData.price" placeholder="请输入商品价格" @input="onPriceInput('price', $event)" />
		</view>

		<view class="form-row">
			<text class="label">商品库存</text>
			<input class="row-input" type="number" v-model="formData.stockNum" placeholder="默认不限" />
		</view>

		<view class="form-row switch-row">
			<text class="label">商品限购</text>
			<view class="switch-control">
				<switch :checked="formData.isLimit == 1" color="#26c463" @change="onLimitSwitchChange" />
			</view>
		</view>

		<view class="form-row" v-if="formData.isLimit == 1">
			<text class="label">限购数量</text>
			<input class="row-input" type="number" v-model="formData.limitNum" placeholder="请输入限购数量" />
		</view>

			<view class="form-row">
			<text class="label">划线价格</text>
			<input class="row-input" type="digit" v-model="formData.price2" placeholder="请完成规格设置" @input="onPriceInput('price2', $event)" />
		</view>

		<view class="form-row">
			<text class="label required">单位</text>
			<input class="row-input" v-model="formData.unit" placeholder="请输入商品单位" />
		</view>
	</view>

	<view class="bottom-action">
		<button @click="submitForm()">完成</button>
	</view>

	<view class="picker-mask" v-if="showCategoryPicker" @click="closeCategoryPicker()">
		<view class="picker-panel" @click.stop>
			<view class="picker-header">
				<text></text>
				<text class="picker-title">请选择商品品类</text>
				<text class="picker-confirm" @click="confirmCategory()">确定</text>
			</view>
			<picker-view class="category-picker" :value="[categoryPickerIndex]" @change="onCategoryPickerChange">
				<picker-view-column>
					<view class="category-option" v-for="item in categoryList" :key="item.id">{{ item.name }}</view>
				</picker-view-column>
			</picker-view>
		</view>
	</view>
</view>
</template>

<script>
import { uploadProductImage } from "@/api/upload.js"
import { addLeaderGoodsInfo, getLeaderGoodsInfo, editLeaderGoodsInfo, getGoodsCategoryList, getLeaderGoodsSkuSpecList } from "@/api/leader.js"
import {
	buildSkuListWithServerIds,
	buildGoodsSubmitPayload,
	deriveGoodsFieldsFromSkuList,
	extractCreatedGoodsId,
	formatSpecSummary,
	limitPricePrecision,
	normalizeGoodsForm,
	normalizeLeaderSpecList
} from "@/utils/leaderProduct.js"

export default {
	data() {
		return {
			isAdd: true,
			showCategoryPicker: false,
			categoryPickerIndex: 0,
			categoryList: [],
			formData: {
				id: 0,
				catId: 0,
				type: 2,
				name: '',
				price: '',
				price2: '',
				costPrice: '',
				goodsInfo: '',
				isStock: 0,
				stockNum: '',
				isLimit: 0,
				limitNum: '',
				unit: '',
				img: '',
				img2: '',
				img3: '',
				specSource: 'goods',
				specList: [],
				skuList: []
			},
			returnToGroup: false
		}
	},
	onLoad(options) {
		this.initCategoryList()
		this.returnToGroup = Number(options.fromGroup || 0) === 1
		if (options.id) {
			this.isAdd = false
			this.getGoodsInfo(options.id)
		}
	},
	computed: {
		selectedCategoryName() {
			const target = this.categoryList.find(item => item.id == this.formData.catId)
			return target ? target.name : ''
		},
		imageList() {
			return [
				{ slot: 1, url: this.formData.img },
				{ slot: 2, url: this.formData.img2 },
				{ slot: 3, url: this.formData.img3 }
			].filter(item => item.url)
		},
		imageCount() {
			return this.imageList.length
		},
		nextImageSlot() {
			if (!this.formData.img) return 1
			if (!this.formData.img2) return 2
			return 3
		},
		specSummary() {
			if (!Array.isArray(this.formData.specList) || this.formData.specList.length === 0) return ''
			return formatSpecSummary(this.formData.specList).replace('规格：', '')
		},
		hasValidSpecs() {
			return Array.isArray(this.formData.specList) && this.formData.specList.some(spec => {
				return spec.name && Array.isArray(spec.vals) && spec.vals.length > 0
			})
		}
	},
	methods: {
		async initCategoryList() {
			try {
				const res = await getGoodsCategoryList()
				this.categoryList = Array.isArray(res.data) ? res.data : []
				this.syncCategoryPickerIndex()
			} catch (err) {
				console.log('查询商品品类失败：', err)
			}
		},
		async getGoodsInfo(id) {
			try {
				const res = await getLeaderGoodsInfo({ id })
				this.formData = this.normalizeGoodsForm(res.data || {})
				this.syncCategoryPickerIndex()
			} catch (err) {
				console.log('查询商品详情失败：', err)
			}
		},
		normalizeGoodsForm(data) {
			const form = normalizeGoodsForm(data)
			return {
				...form,
				stockNum: Number(form.isStock || 0) === 1 ? form.stockNum : '',
				specSource: form.specSource || 'goods',
				specList: normalizeLeaderSpecList(form.specs),
				skuList: form.skuList || []
			}
		},
		buildSubmitData() {
			return buildGoodsSubmitPayload(this.formData)
		},
		buildSubmitDataWithoutSku() {
			return buildGoodsSubmitPayload(this.formData, { includeSku: false })
		},
		openCategoryPicker() {
			if (this.categoryList.length === 0) {
				uni.showToast({ title: '暂无商品品类', icon: 'none' })
				return
			}
			this.syncCategoryPickerIndex()
			this.showCategoryPicker = true
		},
		closeCategoryPicker() {
			this.showCategoryPicker = false
		},
		onCategoryPickerChange(e) {
			this.categoryPickerIndex = e.detail.value[0] || 0
		},
		confirmCategory() {
			const item = this.categoryList[this.categoryPickerIndex]
			this.formData.catId = item ? item.id : 0
			this.closeCategoryPicker()
		},
		syncCategoryPickerIndex() {
			const index = this.categoryList.findIndex(item => item.id == this.formData.catId)
			this.categoryPickerIndex = index >= 0 ? index : 0
		},
		onLimitSwitchChange(e) {
			this.formData.isLimit = e.detail.value ? 1 : 0
			if (this.formData.isLimit == 0) this.formData.limitNum = ''
		},
		onPriceInput(field, e) {
			const value = limitPricePrecision(e.detail.value)
			this.formData[field] = value
			return value
		},
		goSpecPage() {
			const query = this.formData.id ? '?id=' + this.formData.id + '&name=' + encodeURIComponent(this.formData.name) : '?name=' + encodeURIComponent(this.formData.name || '')
			const url = '/pagesA/goods/specNew' + query
			uni.navigateTo({
				url,
				events: {
					acceptGoodsSpecs: data => {
						this.formData.specList = normalizeLeaderSpecList((data && data.specList) || [])
						this.formData.specSource = (data && data.specSource) || 'goods'
						this.formData.skuList = (data && data.skuList) || []
						this.applySpecDerivedFields()
					}
				},
				success: res => {
					if (res.eventChannel) res.eventChannel.emit('initGoodsSpecs', {
						goodsId: this.formData.id,
						goodsName: this.formData.name,
						specSource: this.formData.specSource,
						specList: this.formData.specList,
						skuList: this.formData.skuList
					})
				},
				fail: () => {
					uni.redirectTo({ url })
				}
			})
		},
		// 规格设置完成后，把规格里的价格/库存/单位带入当前页面：
		// 价格取所有规格里的最低价，库存取所有规格库存合计，单位取规格名（尺码/重量/鞋号/尺寸等）
		applySpecDerivedFields() {
			const derived = deriveGoodsFieldsFromSkuList(this.formData.skuList, this.formData.specList)
			if (!derived.price && !derived.stockNum) return
			if (derived.price) this.formData.price = derived.price
			if (derived.stockNum) this.formData.stockNum = derived.stockNum
			if (derived.unit) this.formData.unit = derived.unit
		},
		async refreshGoodsForm(id) {
			const res = await getLeaderGoodsInfo({ id })
			this.formData = this.normalizeGoodsForm(res.data || {})
			this.syncCategoryPickerIndex()
		},
		async prepareSkuListAfterSpecSave(draftSkus) {
			await this.refreshGoodsForm(this.formData.id)
			const res = await getLeaderGoodsSkuSpecList({ id: this.formData.id })
			this.formData.skuList = buildSkuListWithServerIds({
				draftSkus,
				serverSkus: res.data || []
			})
		},
		goBack() {
			const url = this.returnToGroup ? '/pagesA/group/index' : '/pagesA/goods/index'
			uni.navigateBack({
				delta: 1,
				fail: () => {
					uni.redirectTo({ url })
				}
			})
		},
		async emitGroupGoodsAfterSave() {
			if (!this.returnToGroup || !this.formData.id) return
			try {
				const res = await getLeaderGoodsInfo({ id: this.formData.id })
				const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
				if (eventChannel && eventChannel.emit) {
					eventChannel.emit('acceptGroupGoods', { goods: res.data || this.formData })
				}
			} catch (err) {
				console.log('保存后刷新商品详情失败：', err)
				const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
				if (eventChannel && eventChannel.emit) {
					eventChannel.emit('acceptGroupGoods', { goods: this.formData })
				}
			}
		},
		async submitForm() {
			this.formData.name = this.formData.name.trim()
			this.formData.unit = this.formData.unit.trim()
			this.formData.price = limitPricePrecision(this.formData.price)
			this.formData.price2 = limitPricePrecision(this.formData.price2)
			// 有多规格时，库存必须是「所有规格库存之和」：保存前再兜一次，
			// 避免回传事件丢失、或后续流程（如服务端刷新）把库存改回旧值。
			if (this.hasValidSpecs) {
				const specStock = deriveGoodsFieldsFromSkuList(this.formData.skuList, this.formData.specList).stockNum
				if (specStock) this.formData.stockNum = specStock
			}
			this.formData.isStock = this.formData.stockNum ? 1 : 0

			if (!this.formData.name) {
				uni.showToast({ title: '请输入商品名称', icon: 'none' })
				return
			}
			if (!this.formData.catId) {
				uni.showToast({ title: '请选择商品品类', icon: 'none' })
				return
			}
			if (!this.formData.price) {
				uni.showToast({ title: '请输入商品价格', icon: 'none' })
				return
			}
			if (!this.formData.img) {
				uni.showToast({ title: '请上传商品照片', icon: 'none' })
				return
			}
			if (this.formData.isLimit == 1 && !this.formData.limitNum) {
				uni.showToast({ title: '请输入限购数量', icon: 'none' })
				return
			}
			if (!this.formData.unit) {
				uni.showToast({ title: '请输入商品单位', icon: 'none' })
				return
			}
			// 不设置商品规格时，必须手工填全「价格 / 库存 / 单位」才能保存
			if (!this.hasValidSpecs && !String(this.formData.stockNum || '').trim()) {
				uni.showToast({ title: '请输入商品库存', icon: 'none' })
				return
			}

			try {
				const draftSkus = this.formData.skuList || []
				const shouldResolveSku = this.hasValidSpecs && draftSkus.some(item => !item.gid || !item.ids)
				if (this.formData.id > 0) {
					await editLeaderGoodsInfo(shouldResolveSku ? this.buildSubmitDataWithoutSku() : this.buildSubmitData())
				} else {
					const res = await addLeaderGoodsInfo(shouldResolveSku ? this.buildSubmitDataWithoutSku() : this.buildSubmitData())
					const goodsId = extractCreatedGoodsId(res)
					if (goodsId) this.formData.id = goodsId
				}
				if (shouldResolveSku && this.formData.id) {
					await this.prepareSkuListAfterSpecSave(draftSkus)
					await editLeaderGoodsInfo(this.buildSubmitData())
				}
				await this.emitGroupGoodsAfterSave()
				uni.showToast({ title: '保存成功', icon: 'success' })
				this.goBack()
			} catch (err) {
				const title = (err && err.msg) || err || '保存商品失败'
				uni.showToast({ title: String(title), icon: 'none' })
				console.log('保存商品失败：', err)
			}
		},
		async chooseImage(index) {
			let filePath = ''
			let filePath2 = ''
			let filePath3 = ''
			const limit = index == 1 ? 3 - this.imageCount : 1

			try {
				const res = await uni.chooseImage({
					count: Math.max(limit, 1),
					sizeType: ['compressed'],
					sourceType: ['album', 'camera']
				})
				filePath = res.tempFilePaths[0] || ''
				filePath2 = res.tempFilePaths[1] || ''
				filePath3 = res.tempFilePaths[2] || ''
			} catch (err) {
				console.log('选择图片失败：', err)
				uni.showToast({ title: '选择图片失败', icon: 'none' })
			}

			if (!filePath) return

			try {
				const paths = [filePath, filePath2, filePath3].filter(Boolean)
				for (let i = 0; i < paths.length; i++) {
					const slot = i === 0 ? index : this.nextImageSlot
					this.setImageBySlot(slot, await uploadProductImage(paths[i]))
				}
			} catch (err) {
				console.log('上传图片失败：', err)
				uni.showToast({ title: '上传图片失败', icon: 'none' })
			}
		},
		setImageBySlot(index, url) {
			if (index == 1) this.formData.img = url
			if (index == 2) this.formData.img2 = url
			if (index == 3) this.formData.img3 = url
		},
		removeImage(index) {
			this.setImageBySlot(index, '')
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #fff;
	padding-bottom: calc(128rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

.leader-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 20;
	display: grid;
	grid-template-columns: 160rpx minmax(0, 1fr) 160rpx;
	align-items: start;
	padding: 0 18rpx;
	background: #fff;
	border-bottom: 8rpx solid #f5f5f5;
	box-sizing: border-box;
}

.back {
	position: absolute;
	left: 18rpx;
	width: 40rpx;
	padding-right: 120rpx;
	display: flex;
	align-items: center;
	box-sizing: content-box;
}

.title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	font-size: 34rpx;
	color: #111;
	font-weight: 500;
	text-align: center;
}

.nav-placeholder {
	display: block;
	min-width: 0;
}

.form-list {
	padding: 50rpx 36rpx 0;
	background: #fff;
	box-sizing: border-box;
}

.form-row {
	position: relative;
	min-height: 92rpx;
	display: flex;
	align-items: flex-start;
	box-sizing: border-box;
}

.name-row {
	min-height: 112rpx;
	box-sizing: border-box;
}

.name-title-row {
	display: flex;
	align-items: center;
	height: 44rpx;
}

.label {
	width: 174rpx;
	flex-shrink: 0;
	font-size: 31rpx;
	line-height: 44rpx;
	color: #111;
}

.required::after {
	content: '*';
	color: #ff1f1f;
	margin-left: 2rpx;
}

.row-input {
	flex: 1;
	height: 44rpx;
	min-height: 44rpx;
	padding: 0;
	text-align: right;
	font-size: 27rpx;
	line-height: 44rpx;
	color: #111;
}

.name-input {
	display: block;
	width: 100%;
	height: 42rpx;
	min-height: 42rpx;
	margin-top: 8rpx;
	padding: 0;
	text-align: left;
	font-size: 27rpx;
	line-height: 42rpx;
	color: #111;
	box-sizing: border-box;
}

.hint {
	font-size: 25rpx;
	line-height: 44rpx;
	color: #777;
	pointer-events: none;
}

.value {
	flex: 1;
	padding-right: 24rpx;
	text-align: right;
	font-size: 27rpx;
	line-height: 44rpx;
	color: #777;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.arrow {
	width: 28rpx;
	font-size: 48rpx;
	line-height: 38rpx;
	color: #777;
	font-weight: 300;
}

.tap-row {
	align-items: flex-start;
}

.image-row {
	display: block;
	min-height: 166rpx;
}

.image-title {
	display: flex;
	align-items: center;
	height: 44rpx;
}

.image-count {
	font-size: 27rpx;
	line-height: 44rpx;
	color: #777;
}

.image-list {
	display: flex;
	gap: 18rpx;
	margin-left: 2rpx;
	margin-top: 10rpx;
}

.upload-item,
.upload-add {
	position: relative;
	width: 84rpx;
	height: 84rpx;
	box-sizing: border-box;
}

.upload-item image {
	width: 84rpx;
	height: 84rpx;
	border-radius: 4rpx;
}

.upload-item text {
	position: absolute;
	right: -12rpx;
	top: -12rpx;
	width: 30rpx;
	height: 30rpx;
	line-height: 28rpx;
	text-align: center;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.55);
	color: #fff;
	font-size: 24rpx;
}

.upload-add {
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2rpx dashed #333;
	border-radius: 6rpx;
	color: #4b5360;
}

.camera-icon {
	position: relative;
	width: 34rpx;
	height: 26rpx;
	border: 2rpx solid #4b5360;
	border-radius: 3rpx;
	box-sizing: border-box;
}

.camera-top {
	position: absolute;
	left: 8rpx;
	top: -7rpx;
	width: 14rpx;
	height: 7rpx;
	border: 2rpx solid #4b5360;
	border-bottom: 0;
	border-radius: 3rpx 3rpx 0 0;
	box-sizing: border-box;
}

.camera-body {
	position: absolute;
	right: -7rpx;
	bottom: -5rpx;
	width: 18rpx;
	height: 18rpx;
	border: 2rpx solid #4b5360;
	border-radius: 50%;
	background: #fff;
	box-sizing: border-box;
}

.camera-plus-x,
.camera-plus-y {
	position: absolute;
	left: 4rpx;
	top: 7rpx;
	width: 7rpx;
	height: 2rpx;
	background: #4b5360;
}

.camera-plus-y {
	transform: rotate(90deg);
}

.switch-row {
	align-items: flex-start;
	min-height: 94rpx;
}

.switch-control {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: flex-start;
	justify-content: flex-end;
}

.switch-control switch {
	flex-shrink: 0;
	transform: scale(0.74);
	transform-origin: right top;
	margin-top: -6rpx;
}

.bottom-action {
	position: fixed;
	left: 24rpx;
	right: 24rpx;
	bottom: calc(36rpx + env(safe-area-inset-bottom));
	z-index: 20;
}

.bottom-action button {
	height: 88rpx;
	line-height: 88rpx;
	background: #28c765;
	color: #fff;
	font-size: 29rpx;
	border-radius: 8rpx;
}

.picker-mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 50;
	background: rgba(0, 0, 0, 0.58);
	display: flex;
	align-items: flex-end;
}

.picker-panel {
	width: 100%;
	height: 458rpx;
	background: #fff;
	border-radius: 16rpx 16rpx 0 0;
	overflow: hidden;
}

.picker-header {
	height: 128rpx;
	display: grid;
	grid-template-columns: 120rpx 1fr 120rpx;
	align-items: center;
	padding: 0 20rpx;
	box-sizing: border-box;
}

.picker-title {
	text-align: center;
	font-size: 29rpx;
	color: #111;
}

.picker-confirm {
	text-align: right;
	font-size: 29rpx;
	color: #28c765;
}

.category-picker {
	height: 330rpx;
}

.category-option {
	height: 76rpx;
	line-height: 76rpx;
	text-align: center;
	font-size: 36rpx;
	color: #333;
}
</style>
