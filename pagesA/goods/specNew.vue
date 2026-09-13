<template>
<view class="container" :style="miniNavPageStyle()">
	<view class="leader-nav" :style="miniNavBarStyle()">
		<text class="back" :style="miniNavTitleStyle()" @click="goBack()">‹</text>
		<text class="title" :style="miniNavTitleStyle()">{{ pageTitle }}</text>
		<text class="nav-placeholder"></text>
	</view>

	<view class="page">
		<view v-if="mode === 'edit'">
			<view class="common-picker">
				<view class="picker-title-row">
					<text>选择常用规格类型</text>
					<text class="manage-link" @click="showManage()">管理›</text>
				</view>
				<view class="common-chip-row">
					<view class="common-chip" v-for="item in commonSpecList" :key="item.name" @click="selectCommonSpec(item)">
						{{ item.name }}
					</view>
				</view>
			</view>

			<view class="spec-editor">
				<view class="spec-card" v-for="(spec, sIndex) in specList" :key="spec.id || sIndex">
					<view class="spec-title-row">
						<input class="spec-name-input" v-model="spec.name" placeholder="请输入规格名称" @input="syncSpecStructure()" />
						<text class="remove-spec" @click="delSpec(sIndex)">×</text>
					</view>
					<view class="spec-val-row">
						<view class="spec-val-chip" v-for="(item, vIndex) in spec.vals" :key="item.id || vIndex">
							<text>{{ item.val }}</text>
							<text @click="delValue(sIndex, vIndex)">×</text>
						</view>
						<view class="add-value-chip" @click="openValueDialog(sIndex, -1)">+ 添加具体规格</view>
					</view>
				</view>

				<view class="add-spec-action" @click="addSpec()">+ 添加新规格</view>
			</view>

			<view class="sku-detail" v-if="skuList.length > 0">
				<view class="sku-title">详细规格</view>
				<view class="sku-head">
					<text>规格</text>
					<text>价格*</text>
					<text>划线价</text>
					<text>库存</text>
					<text>图片</text>
				</view>
				<view class="sku-row" v-for="(item, index) in skuList" :key="item.key || index">
					<text class="sku-name">{{ formatSkuName(item.names) }}</text>
					<input class="sku-input" type="digit" v-model="item.price" placeholder="请输入" @input="onSkuPriceInput(index, 'price', $event)" />
					<input class="sku-input" type="digit" v-model="item.price2" placeholder="请输入" @input="onSkuPriceInput(index, 'price2', $event)" />
					<input class="sku-input" type="number" v-model="item.num" placeholder="请输入" />
					<view class="sku-image-cell" @click="chooseSkuImage(index)">
						<image v-if="item.img" :src="item.img" mode="aspectFill"></image>
						<text v-else>+</text>
					</view>
				</view>
			</view>
		</view>

		<view class="manage-page" v-else>
			<view class="common-item" v-for="(item, index) in commonSpecList" :key="item.name">
				<view>
					<view class="common-name">{{ item.name }}</view>
					<view class="common-values">{{ formatValues(item.vals) }}</view>
				</view>
				<view class="common-actions">
					<button size="mini" @click="removeCommonSpec(index)">删除</button>
					<button size="mini" @click="openCommonDialog(index)">修改</button>
				</view>
			</view>
		</view>

	</view>

	<view class="bottom-action">
		<button v-if="mode === 'edit'" :loading="loading" @click="submit()">保存</button>
		<button v-else @click="openCommonDialog(-1)">添加常用规格</button>
	</view>

	<view class="dialog-mask" v-if="valueDialogVisible">
		<view class="value-dialog">
			<view class="dialog-title">{{ editingValueIndex >= 0 ? '修改具体规格' : '添加具体规格' }}</view>
			<view class="dialog-row">
				<text>规格名称:</text>
				<input v-model="draftValue" placeholder="请输入具体规格名称" />
			</view>
			<view class="dialog-actions">
				<view class="dialog-btn cancel" @click="closeValueDialog()">取消</view>
				<view class="dialog-btn confirm" @click="confirmValueDialog()">确认</view>
			</view>
		</view>
	</view>

	<view class="dialog-mask" v-if="commonDialogVisible">
		<view class="value-dialog">
			<view class="dialog-title">{{ editingCommonIndex >= 0 ? '修改常用规格' : '添加常用规格' }}</view>
			<view class="dialog-row">
				<text>规格名称:</text>
				<input v-model="commonDraftName" placeholder="请输入规格名称" />
			</view>
			<view class="dialog-row">
				<text>规格值:</text>
				<input v-model="commonDraftValues" placeholder="用/分隔，如 S/M/L" />
			</view>
			<view class="dialog-actions">
				<view class="dialog-btn cancel" @click="closeCommonDialog()">取消</view>
				<view class="dialog-btn confirm" @click="submitCommonDialog()">确认</view>
			</view>
		</view>
	</view>

</view>
</template>

<script>
import { uploadProductImage } from "@/api/upload.js"
import {
	buildLocalSkuDraftList,
	limitPricePrecision,
	normalizeLeaderSkuDraftList,
	normalizeLeaderSpecList
} from "@/utils/leaderProduct.js"

const COMMON_SPEC_STORAGE_KEY = 'leader_goods_common_specs'
const DEFAULT_COMMON_SPECS = [
	{ name: '尺码', vals: [{ val: 'S' }, { val: 'M' }, { val: 'L' }] },
	{ name: '重量', vals: [{ val: '500g' }, { val: '1kg' }, { val: '2kg' }] },
	{ name: '口味', vals: [{ val: '不辣' }, { val: '微辣' }, { val: '中辣' }, { val: '重辣' }] },
	{ name: '鞋码', vals: [{ val: '34' }, { val: '35' }, { val: '36' }, { val: '37' }, { val: '38' }, { val: '39' }, { val: '40' }, { val: '41' }, { val: '42' }, { val: '43' }, { val: '44' }, { val: '45' }] }
]

export default {
	data() {
		return {
			mode: 'edit',
			goodsId: 0,
			goodsName: '',
			specSource: 'goods',
			specList: [],
			skuList: [],
			commonSpecList: [],
			loading: false,
			valueDialogVisible: false,
			editingSpecIndex: -1,
			editingValueIndex: -1,
			draftValue: '',
			commonDialogVisible: false,
			editingCommonIndex: -1,
			commonDraftName: '',
			commonDraftValues: ''
		}
	},
	onLoad(options) {
		this.initCommonSpecList()
		this.initEventChannel()
		if (options.id) {
			this.goodsId = Number(options.id || 0)
		}
		if (options.name) {
			this.goodsName = decodeURIComponent(options.name)
		}
		this.ensureOneSpec()
	},
	computed: {
		pageTitle() {
			if (this.mode === 'manage') return '管理常用规格'
			return this.specList.length > 1 ? '多规格设置' : '规格设置'
		}
	},
	methods: {
		initCommonSpecList() {
			const saved = uni.getStorageSync(COMMON_SPEC_STORAGE_KEY)
			const list = Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_COMMON_SPECS
			this.commonSpecList = normalizeLeaderSpecList(list)
		},
		saveCommonSpecList() {
			uni.setStorageSync(COMMON_SPEC_STORAGE_KEY, this.commonSpecList)
		},
		initEventChannel() {
			const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
			if (!eventChannel || !eventChannel.on) return
			eventChannel.on('initGoodsSpecs', data => {
				const payload = data || {}
				if (!this.goodsId) this.goodsId = Number(payload.goodsId || 0)
				if (!this.goodsName && payload.goodsName) this.goodsName = payload.goodsName
				this.specSource = payload.specSource || 'goods'
				const specs = normalizeLeaderSpecList(payload.specList || [])
				if (specs.length > 0) this.specList = specs
				this.skuList = buildLocalSkuDraftList({
					specs: this.specList,
					goodsId: this.goodsId,
					existingSkus: payload.skuList || []
				})
				this.ensureOneSpec()
			})
		},
		ensureOneSpec() {
			if (this.specList.length === 0) {
				this.specList.push(this.createEmptySpec())
			}
		},
		createEmptySpec() {
			return {
				id: 0,
				name: '',
				vals: []
			}
		},
		createEmptyValue(val) {
			return {
				id: 0,
				sid: 0,
				val: val || ''
			}
		},
		isEmptySpec(spec) {
			return !spec || (!spec.name && (!Array.isArray(spec.vals) || spec.vals.length === 0))
		},
		addSpec() {
			this.specSource = 'goods'
			this.specList.push(this.createEmptySpec())
			this.syncSkuListFromSpecs()
		},
		selectCommonSpec(row) {
			if (this.specList.some(item => item.name === row.name)) {
				uni.showToast({ title: '该规格已添加', icon: 'none' })
				return
			}
			this.specSource = 'goods'
			const nextSpec = {
				id: 0,
				name: row.name,
				vals: Array.isArray(row.vals) ? row.vals.map(item => this.createEmptyValue(item.val)) : []
			}
			if (this.specList.length === 1 && this.isEmptySpec(this.specList[0])) {
				this.specList.splice(0, 1, nextSpec)
			} else {
				this.specList.push(nextSpec)
			}
			this.syncSkuListFromSpecs()
		},
		delSpec(index) {
			uni.showModal({
				content: '确定删除该规格？',
				success: res => {
					if (res.confirm) {
						this.specSource = 'goods'
						this.specList.splice(index, 1)
						this.ensureOneSpec()
						this.syncSkuListFromSpecs()
					}
				}
			})
		},
		openValueDialog(sIndex, vIndex) {
			this.editingSpecIndex = sIndex
			this.editingValueIndex = vIndex
			if (vIndex >= 0) {
				const spec = this.specList[sIndex] || this.createEmptySpec()
				const item = spec.vals[vIndex] || this.createEmptyValue()
				this.draftValue = item.val || ''
			} else {
				this.draftValue = ''
			}
			this.valueDialogVisible = true
		},
		closeValueDialog() {
			this.valueDialogVisible = false
			this.editingSpecIndex = -1
			this.editingValueIndex = -1
			this.draftValue = ''
		},
		confirmValueDialog() {
			const val = (this.draftValue || '').trim()
			if (!val) {
				uni.showToast({ title: '具体规格不能为空', icon: 'none' })
				return
			}
			const spec = this.specList[this.editingSpecIndex]
			if (!spec) {
				this.closeValueDialog()
				return
			}
			if (this.editingValueIndex >= 0) {
				spec.vals[this.editingValueIndex].val = val
			} else {
				spec.vals.push(this.createEmptyValue(val))
			}
			this.specSource = 'goods'
			this.closeValueDialog()
			this.syncSkuListFromSpecs()
		},
		delValue(sIndex, vIndex) {
			const spec = this.specList[sIndex]
			if (!spec || !Array.isArray(spec.vals)) return
			this.specSource = 'goods'
			spec.vals.splice(vIndex, 1)
			this.syncSkuListFromSpecs()
		},
		formatValues(vals) {
			if (!Array.isArray(vals) || vals.length === 0) return '暂无具体规格'
			return vals.map(item => item.val).filter(Boolean).join('/')
		},
		formatSkuName(names) {
			return String(names || '').split(/[，,\/]/).filter(Boolean).join('/')
		},
		buildCleanSpecList() {
			return this.specList.map(spec => {
				const vals = Array.isArray(spec.vals) ? spec.vals.map(item => ({
					id: item.id || 0,
					sid: item.sid || spec.id || 0,
					val: (item.val || '').trim()
				})).filter(item => item.val) : []
				return {
					id: spec.id || 0,
					name: (spec.name || '').trim(),
					price: Number(spec.price || 0),
					stock: Number(spec.stock || 0),
					vals
				}
			}).filter(spec => spec.name || spec.vals.length > 0)
		},
		validateSpecList(cleanSpecs) {
			if (cleanSpecs.length === 0) {
				uni.showToast({ title: '请添加规格', icon: 'none' })
				return false
			}
			for (let i = 0; i < cleanSpecs.length; i++) {
				const spec = cleanSpecs[i]
				if (!spec.name) {
					uni.showToast({ title: '规格名称不能为空', icon: 'none' })
					return false
				}
				if (spec.vals.length === 0) {
					uni.showToast({ title: spec.name + '至少填写一个具体规格', icon: 'none' })
					return false
				}
			}
			return true
		},
		emitSpecsToOpener(cleanSpecs) {
			const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
			if (eventChannel && eventChannel.emit) {
				eventChannel.emit('acceptGoodsSpecs', {
					specSource: this.specSource,
					specList: cleanSpecs,
					skuList: normalizeLeaderSkuDraftList(this.skuList)
				})
			}
		},
		syncSkuListFromSpecs() {
			this.skuList = buildLocalSkuDraftList({
				specs: this.specList,
				goodsId: this.goodsId,
				existingSkus: this.skuList
			})
		},
		syncSpecStructure() {
			this.specSource = 'goods'
			this.syncSkuListFromSpecs()
		},
		onSkuPriceInput(index, field, e) {
			const item = this.skuList[index]
			if (!item) return ''
			const value = limitPricePrecision(e.detail.value)
			item[field] = value
			return value
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
				console.log('上传SKU图片失败：', err)
				uni.showToast({ title: '上传SKU图片失败', icon: 'none' })
			}
		},
		validateSkuList() {
			for (let i = 0; i < this.skuList.length; i++) {
				const item = this.skuList[i]
				if (!item.price || Number(item.price || 0) <= 0) {
					uni.showToast({ title: this.formatSkuName(item.names) + '价格不能为空', icon: 'none' })
					return false
				}
			}
			return true
		},
		submit() {
			const cleanSpecs = this.buildCleanSpecList()
			if (!this.validateSpecList(cleanSpecs)) return
			this.syncSkuListFromSpecs()
			this.skuList = this.skuList.map(item => Object.assign({}, item, {
				price: limitPricePrecision(item.price),
				price2: limitPricePrecision(item.price2)
			}))
			if (!this.validateSkuList()) return
			this.emitSpecsToOpener(cleanSpecs)
			uni.showToast({ title: '规格已保存' })
			this.goBack()
		},
		showManage() {
			this.mode = 'manage'
		},
		openCommonDialog(index) {
			const item = this.commonSpecList[index]
			this.editingCommonIndex = index
			this.commonDraftName = item ? item.name : ''
			this.commonDraftValues = item && Array.isArray(item.vals) ? item.vals.map(val => val.val).join('/') : ''
			this.commonDialogVisible = true
		},
		closeCommonDialog() {
			this.commonDialogVisible = false
			this.editingCommonIndex = -1
			this.commonDraftName = ''
			this.commonDraftValues = ''
		},
		submitCommonDialog() {
			const name = (this.commonDraftName || '').trim()
			const vals = String(this.commonDraftValues || '').split(/[，,\/]/).map(item => item.trim()).filter(Boolean)
			if (!name) {
				uni.showToast({ title: '规格名称不能为空', icon: 'none' })
				return
			}
			if (vals.length === 0) {
				uni.showToast({ title: '请至少填写一个具体规格', icon: 'none' })
				return
			}
			const row = {
				id: 0,
				name,
				vals: vals.map(val => ({ id: 0, sid: 0, val }))
			}
			if (this.editingCommonIndex >= 0) {
				this.commonSpecList.splice(this.editingCommonIndex, 1, row)
			} else {
				this.commonSpecList.push(row)
			}
			this.saveCommonSpecList()
			this.closeCommonDialog()
		},
		removeCommonSpec(index) {
			this.commonSpecList.splice(index, 1)
			this.saveCommonSpecList()
		},
		goBack() {
			if (this.mode === 'manage') {
				this.mode = 'edit'
				return
			}
			const url = '/pagesA/goods/index'
			uni.navigateBack({
				delta: 1,
				fail: () => {
					uni.redirectTo({ url: url })
				}
			})
		}
	}
}
</script>

<style scoped>
.container {
	min-height: 100vh;
	background: #f5f5f5;
	padding-bottom: 128rpx;
}

.leader-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 20;
	background: #ffffff;
	display: grid;
	grid-template-columns: 160rpx minmax(0, 1fr) 160rpx;
	align-items: start;
	padding: 0 28rpx;
	color: #1f1f1f;
	box-sizing: border-box;
}

.back {
	position: absolute;
	left: 28rpx;
	width: 160rpx;
	display: flex;
	align-items: center;
	font-size: 52rpx;
	color: #555555;
}

.title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	font-size: 34rpx;
	font-weight: 500;
	text-align: center;
}

.nav-placeholder {
	display: block;
	min-width: 0;
}

.page {
	padding: 16rpx 24rpx 160rpx;
	box-sizing: border-box;
}

.common-picker {
	background: #ffffff;
	margin-bottom: 18rpx;
	padding-bottom: 18rpx;
}

.picker-title-row {
	height: 72rpx;
	padding: 0 8rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 28rpx;
	color: #333333;
}

.manage-link {
	color: #999999;
}

.common-chip-row {
	display: flex;
	flex-wrap: wrap;
	gap: 18rpx;
	padding: 0 8rpx;
}

.common-chip {
	min-width: 72rpx;
	height: 46rpx;
	line-height: 46rpx;
	padding: 0 18rpx;
	background: #f1f1f1;
	color: #555555;
	font-size: 26rpx;
	text-align: center;
	box-sizing: border-box;
}

.spec-editor,
.common-specs {
	margin-bottom: 18rpx;
}

.spec-card {
	background: #ffffff;
	margin-bottom: 18rpx;
	border-radius: 8rpx;
	overflow: hidden;
}

.spec-title-row {
	height: 74rpx;
	padding: 0 28rpx;
	display: flex;
	align-items: center;
	border-bottom: 1rpx solid #eeeeee;
	box-sizing: border-box;
}

.spec-name-input {
	flex: 1;
	min-width: 0;
	height: 54rpx;
	line-height: 54rpx;
	font-size: 30rpx;
	color: #333333;
}

.remove-spec {
	width: 48rpx;
	height: 48rpx;
	line-height: 48rpx;
	text-align: center;
	color: #cccccc;
	font-size: 38rpx;
}

.spec-val-row {
	min-height: 86rpx;
	padding: 18rpx 28rpx;
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
	box-sizing: border-box;
}

.spec-val-chip {
	height: 46rpx;
	padding: 0 14rpx;
	display: inline-flex;
	align-items: center;
	gap: 8rpx;
	background: #ddf8e7;
	color: #22bf5b;
	font-size: 26rpx;
	box-sizing: border-box;
}

.add-value-chip {
	height: 46rpx;
	line-height: 44rpx;
	padding: 0 18rpx;
	border: 1rpx solid #dddddd;
	background: #ffffff;
	color: #777777;
	font-size: 24rpx;
	box-sizing: border-box;
}

.sku-detail {
	background: #ffffff;
	margin-top: 18rpx;
	padding-bottom: 24rpx;
}

.sku-title {
	height: 72rpx;
	line-height: 72rpx;
	padding: 0 28rpx;
	font-size: 30rpx;
	color: #333333;
	border-bottom: 1rpx solid #eeeeee;
	box-sizing: border-box;
}

.sku-head,
.sku-row {
	display: grid;
	grid-template-columns: 1.25fr 1fr 1fr 1fr 56rpx;
	column-gap: 12rpx;
	align-items: center;
	padding: 0 20rpx;
	box-sizing: border-box;
}

.sku-head {
	height: 58rpx;
	background: #f7f7f7;
	color: #999999;
	font-size: 24rpx;
}

.sku-head text:nth-child(2) {
	color: #ff4d4f;
}

.sku-row {
	min-height: 74rpx;
	font-size: 25rpx;
	color: #333333;
}

.sku-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sku-input {
	width: 100%;
	height: 46rpx;
	line-height: 46rpx;
	padding: 0 10rpx;
	border: 1rpx solid #dddddd;
	font-size: 24rpx;
	box-sizing: border-box;
}

.sku-image-cell {
	width: 56rpx;
	height: 46rpx;
	border: 1rpx solid #dddddd;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #999999;
	box-sizing: border-box;
}

.sku-image-cell image {
	width: 100%;
	height: 100%;
}

.manage-page {
	background: #ffffff;
}

.goods-row,
.spec-name-row,
.spec-value-row {
	min-height: 92rpx;
	padding: 0 32rpx;
	display: flex;
	align-items: center;
	border-bottom: 1rpx solid #eeeeee;
	box-sizing: border-box;
}

.row-label {
	width: 136rpx;
	flex-shrink: 0;
	font-size: 30rpx;
	color: #333333;
}

.row-input {
	flex: 1;
	height: 54rpx;
	line-height: 54rpx;
	font-size: 26rpx;
	color: #333333;
	border: 1rpx solid #eeeeee;
	border-radius: 24rpx;
	padding: 0 24rpx;
	box-sizing: border-box;
}

.row-btn {
	width: 68rpx;
	height: 38rpx;
	line-height: 36rpx;
	padding: 0;
	margin-left: 16rpx;
	border-radius: 0;
	border: 1rpx solid #dddddd;
	background: #ffffff;
	color: #999999;
	font-size: 22rpx;
}

.row-btn::after {
	border: 0;
}

.danger {
	color: #999999;
}

.available {
	color: #666666;
}

.add-value-action,
.add-spec-action {
	height: 56rpx;
	line-height: 54rpx;
	margin: 24rpx 74rpx;
	text-align: center;
	border: 1rpx solid #28c665;
	color: #22bf5b;
	background: #ffffff;
	font-size: 28rpx;
	box-sizing: border-box;
}

.add-spec-action {
	margin-bottom: 18rpx;
}

.section-title {
	height: 72rpx;
	line-height: 72rpx;
	padding: 0 32rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 28rpx;
	color: #333333;
	border-bottom: 1rpx solid #eeeeee;
}

.add-common {
	width: 86rpx;
	color: #22bf5b;
	border-color: #28c665;
}

.common-item {
	min-height: 112rpx;
	padding: 18rpx 32rpx;
	border-bottom: 1rpx solid #eeeeee;
	box-sizing: border-box;
}

.common-info {
	min-width: 0;
}

.common-actions,
.val-actions {
	display: flex;
	align-items: center;
}

.common-actions {
	margin-top: 16rpx;
}

.common-name,
.common-values {
	display: block;
	line-height: 36rpx;
}

.common-name {
	font-size: 30rpx;
	color: #333333;
}

.common-values {
	margin-top: 8rpx;
	font-size: 26rpx;
	color: #999999;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.common-val-list {
	margin-top: 16rpx;
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.common-val {
	max-width: 100%;
	min-height: 48rpx;
	padding: 0 14rpx;
	display: flex;
	align-items: center;
	border: 1rpx solid #eeeeee;
	background: #fafafa;
	box-sizing: border-box;
}

.common-val > text:first-child {
	max-width: 260rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 24rpx;
	color: #555555;
}

.val-actions {
	margin-left: 12rpx;
	gap: 10rpx;
	font-size: 22rpx;
	color: #22bf5b;
	flex-shrink: 0;
}

.add-common-val {
	height: 48rpx;
	line-height: 46rpx;
	padding: 0 16rpx;
	border: 1rpx dashed #28c665;
	color: #22bf5b;
	font-size: 24rpx;
	box-sizing: border-box;
}

.empty-common {
	padding: 32rpx;
	font-size: 26rpx;
	color: #999999;
	text-align: center;
}

.bottom-action {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 18rpx 24rpx 40rpx;
	background: #ffffff;
	box-sizing: border-box;
}

.bottom-action button {
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 8rpx;
	background: #28c665;
	color: #ffffff;
	font-size: 32rpx;
}

.bottom-action button::after {
	border: 0;
}

.dialog-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 20;
}

.value-dialog {
	width: 580rpx;
	background: #ffffff;
	border-radius: 14rpx;
	overflow: hidden;
}

.dialog-title {
	height: 112rpx;
	line-height: 112rpx;
	text-align: center;
	font-size: 34rpx;
	color: #111111;
}

.dialog-row {
	height: 112rpx;
	padding: 0 42rpx;
	display: flex;
	align-items: center;
	font-size: 28rpx;
	color: #333333;
	box-sizing: border-box;
}

.dialog-row input {
	flex: 1;
	height: 60rpx;
	margin-left: 14rpx;
	font-size: 28rpx;
}

.dialog-actions {
	height: 98rpx;
	display: flex;
	border-top: 1rpx solid #eeeeee;
}

.dialog-btn {
	flex: 1;
	height: 98rpx;
	line-height: 98rpx;
	text-align: center;
	font-size: 30rpx;
}

.cancel {
	color: #999999;
	border-right: 1rpx solid #eeeeee;
}

.confirm {
	color: #22bf5b;
}
</style>
