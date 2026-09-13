<template>
<view class="container refund-page" :style="miniNavPageStyle()">
	<!-- 导航区 -->
	<view class="refund-nav" :style="miniNavBarStyle()">
		<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
		<text class="title" :style="miniNavTitleStyle()">申请退款</text>
		<text class="nav-space"></text>
	</view>

	<view class="page" v-if="loading">
		<view class="empty">订单加载中</view>
	</view>

	<view class="page" v-else-if="hasOrder">
		<!-- 售后类型区 -->
		<view class="section refund-type-section">
			<text class="section-title">售后类型</text>
			<view class="refund-type-list">
				<view
					v-for="item in refundModeOptions"
					:key="item.flag"
					class="refund-type-item"
					:class="{ active: refundFlag === item.flag, disabled: item.disabled }"
					@click="selectRefundFlag(item.flag)"
				>
					<text>{{ item.text }}</text>
					<text v-if="item.disabled" class="refund-type-tip">已申请</text>
				</view>
			</view>
		</view>

		<!-- 退款商品区 -->
		<view class="section goods-section">
			<text class="section-title">{{ refundTypeText }}商品</text>
			<view v-for="goods in refundableGoods" :key="goods.refundKey" class="goods-row" :class="{ locked: isOnlyRefund }" @click="toggleGoods(goods)">
				<view class="check" :class="{ checked: isGoodsSelected(goods), locked: isOnlyRefund }">
					<text v-if="isGoodsSelected(goods)">✓</text>
				</view>
				<image v-if="goods.img" class="goods-image" :src="goods.img" mode="aspectFill"></image>
				<view v-else class="goods-image goods-placeholder">{{ goods.name.slice(0, 1) || '商' }}</view>
				<view class="goods-main">
					<text class="goods-name">{{ goods.name || '商品' }}(共{{ goods.num }}件)</text>
					<text v-if="goods.specText" class="goods-spec">{{ goods.specText }}</text>
					<view class="refund-row">
						<text class="refund-price">最多可{{ refundFlag === 1 ? '退款' : '退货退款' }} {{ maxRefundNum(goods) }}{{ goods.unit || '件' }}</text>
						<view v-if="!isOnlyRefund" class="qty-stepper" @click.stop>
							<text class="qty-btn" :class="{ disabled: refundNum(goods) <= 1 }" @click.stop="changeRefundNum(goods, -1)">−</text>
							<text class="qty-value">{{ refundNum(goods) }}</text>
							<text class="qty-btn" :class="{ disabled: refundNum(goods) >= maxRefundNum(goods) }" @click.stop="changeRefundNum(goods, 1)">+</text>
						</view>
						<text v-else class="refund-amount">¥{{ goodsRefundAmountText(goods) }}</text>
					</view>
				</view>
			</view>
			<view v-if="modeLoading" class="empty small">加载可退款商品中</view>
			<view v-else-if="refundableGoods.length === 0" class="empty small">{{ refundFlag === 1 && onlyRefundUsed ? '仅退款已申请，不能再次发起' : '暂无可申请的商品' }}</view>
			<view v-if="isOnlyRefund && refundableGoods.length > 0" class="only-refund-tip">仅退款须一次性退回全部未核销商品</view>
			<view class="amount-row">
				<text class="amount-label">本次退款金额</text>
				<text class="amount-tip">¥{{ maxRefundAmountText }}</text>
			</view>
		</view>

		<!-- 退款信息区 -->
		<view class="section info-section">
			<view class="line-row" @click="openReasonPanel">
				<text>申请原因</text>
				<view class="line-value">
					<text :class="{ placeholder: !refundReason }">{{ refundReason || '未选择' }}</text>
					<text class="arrow">›</text>
				</view>
			</view>
			<view class="textarea-wrap">
				<textarea
					v-model="refundExtraReason"
					maxlength="170"
					class="desc-input"
					placeholder="必填，您可以补充申请理由便于团长快速处理哦"
				/>
				<text class="count">{{ refundExtraReason.length }}/170</text>
			</view>
			<view class="image-list">
				<view v-for="(image, index) in images" :key="image" class="image-item">
					<image :src="image" mode="aspectFill"></image>
					<text class="remove" @click.stop="removeImage(index)">×</text>
				</view>
				<view v-if="images.length < 3" class="image-add" @click="chooseImage">
					<text class="camera-icon"></text>
					<text>上传图片</text>
				</view>
			</view>
		</view>
	</view>

	<view class="page" v-else>
		<view class="empty">订单加载失败</view>
	</view>

	<view v-if="hasOrder" class="bottom-bar">
		<view class="select-all" :class="{ locked: isOnlyRefund }" @click="toggleAll">
			<view class="check" :class="{ checked: allSelected }">
				<text v-if="allSelected">✓</text>
			</view>
			<text>{{ isOnlyRefund ? '全部退款' : '全选' }}</text>
		</view>
		<view class="total">共退款：<text>￥{{ refundAmountText }}</text></view>
		<button class="submit-btn" :disabled="!canSubmit || submitting" @click="openConfirm">{{ submitting ? '提交中' : '提交申请' }}</button>
	</view>

	<view v-if="reasonVisible" class="mask" @click="reasonVisible = false">
		<view class="reason-panel" @click.stop>
			<view class="panel-head">
				<text>{{ reasonLoading ? '退款原因加载中' : '选择退款原因' }}</text>
				<text class="close" @click="reasonVisible = false">×</text>
			</view>
			<view v-for="reason in refundReasons" :key="reason.id || reason.reason" class="reason-row" @click="selectReason(reason)">
				<text :class="{ active: refundReason === reason.reason }">{{ reason.reason }}</text>
				<text v-if="refundReason === reason.reason" class="selected">✓</text>
			</view>
		</view>
	</view>

	<view v-if="confirmVisible" class="mask" @click="confirmVisible = false">
		<view class="confirm-dialog" @click.stop>
			<text class="confirm-title">是否要申请{{ refundTypeText }} <text>￥{{ refundAmountText }}</text></text>
			<view v-for="goods in refundGoodsForSubmit" :key="goods.id" class="confirm-goods">
				<text>{{ goods.name || '商品名称' }}</text>
				<text>退款 ￥{{ formatAmount(goods.refundAmount) }}</text>
			</view>
			<view class="confirm-actions">
				<view @click="confirmVisible = false">取消</view>
				<view class="ok" @click="submitRefund">确认</view>
			</view>
		</view>
	</view>
</view>
</template>

<script>
import { getOrderInfo, getRefundApplyOrderInfo, getRefundReasonList, refundOrder } from "@/api/group.js"
import { uploadProductImage } from "@/api/upload.js"
import {
	buildMemberRefundPayload,
	getMemberRefundFlagMeta,
	MEMBER_REFUND_FLAGS,
	normalizeMemberOrder,
	normalizeMemberRefundApplyInfo
} from "@/utils/memberOrder.js"

const FALLBACK_REFUND_REASONS = ['多拍、错拍、不想要', '商品破损', '商品与描述不符', '未按约定时间送达', '其他原因']
	.map((reason, index) => ({ id: index + 1, reason, sort: index + 1, status: 1 }))

export default {
	data() {
		return {
			orderNo: '',
			orderInfo: normalizeMemberOrder({}),
			refundApplyInfo: normalizeMemberRefundApplyInfo({}),
			refundFlag: MEMBER_REFUND_FLAGS.ONLY_REFUND,
			onlyRefundUsed: false,
			selectedMap: {},
			selectedQtyMap: {},
			refundReason: '',
			refundExtraReason: '',
			images: [],
			refundReasons: FALLBACK_REFUND_REASONS,
			loading: true,
			modeLoading: false,
			reasonLoading: false,
			submitting: false,
			reasonVisible: false,
			confirmVisible: false
		}
	},
	computed: {
		hasOrder() {
			return Boolean(this.orderInfo.orderNo)
		},
		refundableGoods() {
			return this.refundApplyInfo.goods
				.map((goods, index) => Object.assign({}, goods, { refundKey: this.refundGoodsKey(goods, index) }))
				.filter(goods => this.maxRefundNum(goods) > 0)
		},
		selectedGoods() {
			if (this.isOnlyRefund) return this.refundableGoods
			return this.refundableGoods.filter(goods => this.selectedMap[goods.refundKey])
		},
		maxRefundAmount() {
			return this.selectedGoods.reduce((total, goods) => total + this.goodsRefundAmount(goods), 0)
		},
		refundAmount() { return this.maxRefundAmount },
		refundAmountText() {
			return this.formatAmount(this.refundAmount)
		},
		refundGoodsForSubmit() {
			return this.buildRefundGoods()
		},
		maxRefundAmountText() {
			return this.formatAmount(this.maxRefundAmount)
		},
		allSelected() {
			if (this.isOnlyRefund) return this.refundableGoods.length > 0
			return this.refundableGoods.length > 0 && this.selectedGoods.length === this.refundableGoods.length
		},
		isOnlyRefund() {
			return Number(this.refundFlag) === MEMBER_REFUND_FLAGS.ONLY_REFUND
		},
		canSubmit() {
			return !this.modeLoading && this.selectedGoods.length > 0 && this.refundAmount > 0 && this.refundReason && this.refundExtraReason.trim()
		},
		refundTypeText() {
			return getMemberRefundFlagMeta(this.refundFlag).text
		},
		refundModeOptions() {
			return [
				{ flag: MEMBER_REFUND_FLAGS.ONLY_REFUND, text: '仅退款', disabled: this.onlyRefundUsed },
				{ flag: MEMBER_REFUND_FLAGS.RETURN_AND_REFUND, text: '退款退货', disabled: false }
			]
		}
	},
	onLoad(options = {}) {
		const token = uni.getStorageSync('token')
		if (!token) {
			uni.redirectTo({ url: '/pages/login/index' })
			return
		}
		this.orderNo = options.orderNo || options.id || ''
		this.initOrderInfo()
	},
	methods: {
		openReasonPanel() {
			this.reasonVisible = true
			this.initRefundReasons()
		},
		async initRefundReasons() {
			if (this.reasonLoading) return
			this.reasonLoading = true
			try {
				const res = await getRefundReasonList()
				const list = Array.isArray(res.data) ? res.data : []
				const reasons = list
					.map(this.normalizeRefundReason)
					.filter(item => item.reason && item.status !== 0)
					.sort((a, b) => a.sort - b.sort)
				if (reasons.length) this.refundReasons = reasons
			} catch (err) {
				console.log('退款原因列表加载失败，使用本地兜底：', err)
			} finally {
				this.reasonLoading = false
			}
		},
		normalizeRefundReason(item = {}) {
			if (typeof item === 'string') {
				return { id: item, reason: item, sort: 0, status: 1 }
			}
			return {
				id: item.id || item.reason || '',
				reason: item.reason || item.name || item.label || '',
				sort: Number(item.sort || 0),
				status: Number(item.status === undefined ? 1 : item.status),
				addTime: item.addTime || item.add_time || 0,
				updateTime: item.updateTime || item.update_time || 0
			}
		},
		async initOrderInfo() {
			if (!this.orderNo) {
				this.loading = false
				return
			}
			this.loading = true
			try {
				const res = await getOrderInfo({ orderNo: this.orderNo })
				this.orderInfo = normalizeMemberOrder(res.data || {})
				this.onlyRefundUsed = Boolean(this.orderInfo.onlyRefundUsed)
				await this.loadRefundApplyInfo(this.refundFlag)
			} catch (err) {
				console.log('加载退款订单失败：', err)
				uni.showToast({ title: '订单加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async loadRefundApplyInfo(flag) {
			this.modeLoading = true
			this.selectedMap = {}
			this.selectedQtyMap = {}
			try {
				const res = await getRefundApplyOrderInfo({ orderNo: this.orderInfo.orderNo, refundFlag: Number(flag) })
				const info = normalizeMemberRefundApplyInfo(res.data || {}, flag)
				this.onlyRefundUsed = this.onlyRefundUsed || info.onlyRefundUsed
				this.refundApplyInfo = info
				if (Number(flag) === MEMBER_REFUND_FLAGS.ONLY_REFUND && this.onlyRefundUsed) return
				this.initSelection()
			} catch (err) {
				console.log('加载可退款商品失败：', err)
				this.refundApplyInfo = normalizeMemberRefundApplyInfo({}, flag)
				uni.showToast({ title: String((err && (err.msg || err.message)) || '加载可退款商品失败'), icon: 'none' })
			} finally {
				this.modeLoading = false
			}
		},
		selectRefundFlag(flag) {
			const nextFlag = Number(flag)
			if (nextFlag === this.refundFlag || this.modeLoading) return
			if (nextFlag === MEMBER_REFUND_FLAGS.ONLY_REFUND && this.onlyRefundUsed) {
				uni.showToast({ title: '仅退款已申请，不能再次发起', icon: 'none' })
				return
			}
			this.refundFlag = nextFlag
			this.loadRefundApplyInfo(nextFlag)
		},
		initSelection() {
			const map = {}
			const qtyMap = {}
			this.refundableGoods.forEach(goods => {
				map[goods.refundKey] = true
				qtyMap[goods.refundKey] = this.maxRefundNum(goods)
			})
			this.selectedMap = map
			this.selectedQtyMap = qtyMap
		},
		toggleGoods(goods) {
			if (this.isOnlyRefund) return
			const key = goods.refundKey
			const checked = !this.selectedMap[key]
			this.selectedMap = Object.assign({}, this.selectedMap, { [key]: checked })
			if (checked && !this.selectedQtyMap[key]) {
				this.selectedQtyMap = Object.assign({}, this.selectedQtyMap, { [key]: this.maxRefundNum(goods) })
			}
		},
		toggleAll() {
			if (this.isOnlyRefund) return
			const shouldSelect = !this.allSelected
			const map = {}
			const qtyMap = Object.assign({}, this.selectedQtyMap)
			this.refundableGoods.forEach(goods => {
				map[goods.refundKey] = shouldSelect
				if (shouldSelect && !qtyMap[goods.refundKey]) qtyMap[goods.refundKey] = this.maxRefundNum(goods)
			})
			this.selectedMap = map
			this.selectedQtyMap = qtyMap
		},
		selectReason(reason) {
			this.refundReason = reason.reason || ''
			this.reasonVisible = false
		},
		openConfirm() {
			if (!this.selectedGoods.length) {
				uni.showToast({ title: '请选择退款商品', icon: 'none' })
				return
			}
			if (!this.refundReason) {
				uni.showToast({ title: '请选择退款原因', icon: 'none' })
				return
			}
			if (!this.refundExtraReason.trim()) {
				uni.showToast({ title: '请填写补充说明', icon: 'none' })
				return
			}
			if (this.refundAmount <= 0) {
				uni.showToast({ title: '退款金额异常', icon: 'none' })
				return
			}
			if (!this.buildRefundGoods().length) {
				uni.showToast({ title: '退款商品信息异常', icon: 'none' })
				return
			}
			this.confirmVisible = true
		},
		async submitRefund() {
			if (this.submitting) return
			this.submitting = true
			const goods = this.buildRefundGoods()
			const payload = buildMemberRefundPayload({
				refundFlag: this.refundFlag,
				orderNo: this.orderInfo.orderNo,
				actionReason: this.refundReason,
				extraReason: this.refundExtraReason,
				goods,
				images: this.images
			})
			try {
				await refundOrder(payload)
				if (this.refundFlag === MEMBER_REFUND_FLAGS.ONLY_REFUND) this.onlyRefundUsed = true
				uni.showToast({ title: '提交成功', icon: 'success' })
				this.confirmVisible = false
				uni.redirectTo({ url: `/pages/order/refundDetail?orderNo=${encodeURIComponent(this.orderInfo.orderNo)}&refundFlag=${this.refundFlag}` })
			} catch (err) {
				console.log('申请退款失败：', err)
				uni.showToast({ title: String((err && (err.msg || err.message)) || '提交失败'), icon: 'none' })
			} finally {
				this.submitting = false
			}
		},
		async chooseImage() {
			try {
				const choose = await uni.chooseImage({ count: 3 - this.images.length, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
				const paths = choose.tempFilePaths || []
				for (const filePath of paths) {
					if (this.images.length >= 3) break
					this.images.push(await uploadProductImage(filePath))
				}
			} catch (err) {
				console.log('上传退款图片失败：', err)
				uni.showToast({ title: '上传图片失败', icon: 'none' })
			}
		},
		removeImage(index) {
			this.images.splice(index, 1)
		},
		buildRefundGoods() {
			return this.selectedGoods.map(item => {
				const refundNum = this.refundNum(item)
				const refundAmount = this.goodsRefundAmount(item)
				return {
					id: item.id,
					name: item.name,
					refundNum,
					refundAmount
				}
			}).filter(item => item.refundNum > 0 && item.refundAmount > 0)
		},
		isGoodsSelected(goods) {
			return Boolean(this.selectedMap[goods.refundKey])
		},
		refundGoodsKey(goods, index) {
			const goodsId = Number(goods.goodsId || 0)
			if (goodsId > 0) return `goods-${goodsId}`
			const id = Number(goods.id || goods.orderGoodsId || 0)
			return id > 0 ? `order-goods-${id}` : `index-${index}`
		},
		maxRefundNum(goods) {
			return Math.max(Number(goods.availableRefundNum || 0), 0)
		},
		refundNum(goods) {
			const max = this.maxRefundNum(goods)
			if (this.isOnlyRefund) return max
			if (!this.isGoodsSelected(goods)) return 0
			const current = Number(this.selectedQtyMap[goods.refundKey] || max)
			return Math.min(Math.max(current, 1), max)
		},
		changeRefundNum(goods, delta) {
			if (this.isOnlyRefund || !this.isGoodsSelected(goods)) return
			const max = this.maxRefundNum(goods)
			const next = Math.min(Math.max(this.refundNum(goods) + Number(delta || 0), 1), max)
			this.selectedQtyMap = Object.assign({}, this.selectedQtyMap, { [goods.refundKey]: next })
		},
		goodsRefundAmount(goods) {
			const count = this.refundNum(goods)
			return Number((Number(goods.price || 0) * count).toFixed(2))
		},
		goodsRefundAmountText(goods) {
			return this.formatAmount(this.goodsRefundAmount(goods))
		},
		formatAmount(value) {
			const amount = Number(value || 0)
			return amount.toFixed(2).replace(/\.?0+$/, '')
		},
		goBack() {
			uni.navigateBack({ delta: 1 })
		}
	}
}
</script>

<style lang="scss" scoped>
.refund-page { min-height: 100vh; padding-bottom: 146rpx; background: #f5f5f5; color: #222; box-sizing: border-box; }
.refund-nav { position: fixed; left: 0; right: 0; top: 0; z-index: 20; padding: 0 28rpx; display: grid; grid-template-columns: 120rpx minmax(0, 1fr) 120rpx; align-items: start; background: #fff; box-sizing: border-box; }
.back { position: absolute; left: 28rpx; font-size: 48rpx; font-weight: 300; color: #666; }
.title { position: absolute; left: 120rpx; right: 120rpx; text-align: center; font-size: 32rpx; font-weight: 600; }
.page { padding: 20rpx 24rpx; }
.section { margin-bottom: 18rpx; background: #fff; border-radius: 4rpx; overflow: hidden; }
.section-title { display: block; padding: 24rpx; color: #333; font-size: 28rpx; border-bottom: 1rpx solid #eee; }
.refund-type-list { display: flex; gap: 18rpx; padding: 22rpx 24rpx; }
.refund-type-item { display: flex; align-items: center; justify-content: center; min-width: 180rpx; height: 64rpx; padding: 0 20rpx; border: 1rpx solid #ddd; border-radius: 4rpx; color: #555; font-size: 25rpx; box-sizing: border-box; }
.refund-type-item.active { border-color: #22c55e; color: #159947; background: #f0fff5; }
.refund-type-item.disabled { border-color: #e5e5e5; color: #aaa; background: #f7f7f7; }
.refund-type-tip { margin-left: 10rpx; color: #999; font-size: 20rpx; }
.goods-row { display: flex; align-items: center; min-height: 96rpx; padding: 20rpx 24rpx; border-bottom: 1rpx solid #f1f1f1; box-sizing: border-box; }
.check { width: 30rpx; height: 30rpx; margin-right: 22rpx; border: 2rpx solid #d0d0d0; border-radius: 50%; color: #fff; font-size: 20rpx; line-height: 30rpx; text-align: center; box-sizing: border-box; flex-shrink: 0; }
.check.checked { border-color: #22c55e; background: #22c55e; }
.goods-image { width: 72rpx; height: 72rpx; margin-right: 18rpx; border-radius: 4rpx; background: #f2f2f2; flex-shrink: 0; }
.goods-placeholder { display: flex; align-items: center; justify-content: center; color: #999; font-size: 24rpx; }
.goods-main { flex: 1; min-width: 0; }
.goods-name, .goods-spec { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goods-name { color: #333; font-size: 26rpx; line-height: 36rpx; }
.goods-spec { margin-top: 6rpx; color: #999; font-size: 23rpx; }
.refund-row { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; margin-top: 12rpx; }
.refund-price { min-width: 0; color: #999; font-size: 23rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.refund-amount { color: #ff4d4f; font-size: 24rpx; flex-shrink: 0; }
.qty-stepper { display: flex; align-items: center; height: 42rpx; border: 1rpx solid #dfeee4; flex-shrink: 0; }
.qty-btn, .qty-value { display: flex; align-items: center; justify-content: center; width: 42rpx; height: 40rpx; color: #19a653; font-size: 29rpx; line-height: 40rpx; text-align: center; box-sizing: border-box; }
.qty-value { width: 46rpx; color: #333; font-size: 24rpx; border-left: 1rpx solid #dfeee4; border-right: 1rpx solid #dfeee4; }
.qty-btn.disabled { color: #c8d7cd; }
.goods-row.locked, .select-all.locked { cursor: default; }
.only-refund-tip { padding: 14rpx 24rpx 0 104rpx; color: #e8804d; font-size: 22rpx; line-height: 32rpx; }
.amount-row { display: flex; align-items: center; height: 88rpx; padding: 0 24rpx 0 104rpx; box-sizing: border-box; }
.amount-label { margin-right: 18rpx; color: #333; font-size: 25rpx; }
.amount-input { flex: 1; min-width: 0; height: 88rpx; font-size: 25rpx; }
.amount-tip { color: #999; font-size: 23rpx; }
.line-row { display: flex; align-items: center; justify-content: space-between; min-height: 88rpx; padding: 0 24rpx; border-bottom: 1rpx solid #eee; font-size: 26rpx; }
.line-value { display: flex; align-items: center; min-width: 0; color: #333; }
.line-value text:first-child { max-width: 420rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.placeholder { color: #aaa; }
.arrow { margin-left: 8rpx; color: #bbb; font-size: 34rpx; }
.textarea-wrap { position: relative; padding: 20rpx 24rpx 46rpx; }
.desc-input { width: 100%; height: 118rpx; color: #333; font-size: 25rpx; line-height: 36rpx; }
.count { position: absolute; right: 24rpx; bottom: 12rpx; color: #aaa; font-size: 22rpx; }
.image-list { display: flex; gap: 18rpx; flex-wrap: wrap; padding: 0 24rpx 28rpx; }
.image-item, .image-add { position: relative; width: 132rpx; height: 132rpx; border-radius: 4rpx; overflow: hidden; }
.image-item image { width: 100%; height: 100%; }
.remove { position: absolute; right: 0; top: 0; width: 28rpx; height: 28rpx; border-radius: 0 0 0 14rpx; color: #fff; background: rgba(0, 0, 0, 0.35); font-size: 20rpx; line-height: 28rpx; text-align: center; }
.image-add { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1rpx dashed #ddd; color: #999; font-size: 22rpx; box-sizing: border-box; }
.camera-icon { width: 42rpx; height: 32rpx; margin-bottom: 12rpx; border: 2rpx solid #bbb; border-radius: 4rpx; box-sizing: border-box; }
.empty { padding: 80rpx 0; color: #999; font-size: 26rpx; text-align: center; }
.empty.small { padding: 34rpx 0; }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 12; display: flex; align-items: center; height: 126rpx; padding: 16rpx 24rpx 28rpx; background: #fff; box-sizing: border-box; }
.select-all { display: flex; align-items: center; min-width: 120rpx; color: #555; font-size: 25rpx; }
.total { flex: 1; min-width: 0; color: #333; font-size: 25rpx; }
.total text { color: #ff4d4f; font-size: 30rpx; }
.submit-btn { width: 194rpx; height: 72rpx; margin: 0; border-radius: 6rpx; color: #fff; background: #22c55e; font-size: 25rpx; line-height: 72rpx; }
.submit-btn[disabled] { color: #fff; background: #b7e7c8; }
.mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 40; display: flex; align-items: flex-end; justify-content: center; background: rgba(0, 0, 0, 0.5); }
.reason-panel { width: 100%; max-height: 72vh; padding-bottom: constant(safe-area-inset-bottom); padding-bottom: env(safe-area-inset-bottom); border-radius: 14rpx 14rpx 0 0; background: #fff; overflow-y: auto; }
.panel-head { position: relative; height: 88rpx; color: #222; font-size: 28rpx; line-height: 88rpx; text-align: center; border-bottom: 1rpx solid #eee; }
.close { position: absolute; right: 28rpx; top: 0; color: #aaa; font-size: 42rpx; }
.reason-row { display: flex; align-items: center; justify-content: space-between; min-height: 86rpx; padding: 0 36rpx; border-bottom: 1rpx solid #f0f0f0; color: #555; font-size: 26rpx; }
.reason-row .active, .selected { color: #22c55e; }
.confirm-dialog { align-self: center; width: 560rpx; border-radius: 12rpx; background: #fff; overflow: hidden; }
.confirm-title { display: block; padding: 38rpx 32rpx 22rpx; color: #333; font-size: 28rpx; text-align: center; }
.confirm-title text { color: #ff4d4f; }
.confirm-goods { display: flex; justify-content: space-between; padding: 8rpx 50rpx; color: #333; font-size: 25rpx; }
.confirm-goods text:last-child { color: #ff6b4a; }
.confirm-actions { display: flex; margin-top: 28rpx; border-top: 1rpx solid #eee; }
.confirm-actions view { flex: 1; height: 88rpx; color: #888; font-size: 28rpx; line-height: 88rpx; text-align: center; }
.confirm-actions .ok { color: #22c55e; border-left: 1rpx solid #eee; }
</style>
