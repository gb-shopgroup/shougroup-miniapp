<template>
<view class="container verify-page" :style="miniNavPageStyle()">
	<view class="verify-nav" :style="miniNavBarStyle()">
		<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
		<text class="title" :style="miniNavTitleStyle()">订单核销</text>
	</view>

	<view class="page">
		<view class="shop-banner">
			<text class="shop-name">{{ shopName || '团长店铺' }}</text>
			<text class="shop-tip">向团长出示本页面，或在此自助核销你的待自提订单</text>
		</view>

		<view class="section-title" v-if="visibleOrders.length">待核销订单</view>

		<view class="order-list">
			<view class="order-card" v-for="order in visibleOrders" :key="order.orderNo">
				<view class="order-title-row">
					<text class="group-no">订单号：{{ order.orderNo }}</text>
					<view class="order-status-pill" :class="orderStatusTone(order)">{{ orderStatusText(order) }}</view>
				</view>
				<text class="order-time" v-if="order.orderTime">{{ order.orderTime }}</text>

				<view class="order-product" v-for="goods in order.goods" :key="goods.id || goods.goodsId">
					<view
						class="check-circle"
						:class="{ checked: verifyNumOf(order, goods) > 0, disabled: !canReceiptGoods(goods) }"
						@click.stop="toggleGoods(order, goods)"
					></view>
					<view class="product-image">
						<image mode="aspectFill" :src="goods.img"></image>
					</view>
					<view class="product-info">
						<view class="product-name">{{ goods.name }}</view>
						<view class="product-spec" v-if="goods.specText">{{ goods.specText }}</view>
						<view class="product-price-num">
							<text class="product-price"><text class="label">¥</text>{{ goods.price }}</text>
							<view class="quantity-control">
								<text
									class="quantity-button"
									:class="{ disabled: !canOperateOrder(order) || verifyNumOf(order, goods) <= 0 }"
									@click.stop="changeVerifyNum(order, goods, -1)"
								>−</text>
								<text class="quantity-value">{{ verifyNumOf(order, goods) }}</text>
								<text
									class="quantity-button"
									:class="{ disabled: !canOperateOrder(order) || !canReceiptGoods(goods) || verifyNumOf(order, goods) >= maxVerifyNum(goods) }"
									@click.stop="changeVerifyNum(order, goods, 1)"
								>+</text>
							</view>
						</view>
						<text class="pending-text" :class="{ muted: !canReceiptGoods(goods) }">{{ goodsHintText(goods) }}</text>
					</view>
				</view>

				<view class="station-card" v-if="order.pointName || order.pointAddress">
					<view class="station-title">自提点</view>
					<view v-if="order.pointName">{{ order.pointName }}</view>
					<view v-if="order.pointAddress">{{ order.pointAddress }}</view>
				</view>

				<view class="select-all" v-if="order.goods.length" @click="toggleAllGoods(order)">
					<view class="check-circle" :class="{ checked: isAllChecked(order) }"></view>
					<text>全选</text>
				</view>

				<view class="order-footer">
					<text class="pending-text" v-if="pendingNum(order)">待核销 {{ pendingNum(order) }} 件</text>
					<view class="order-actions">
						<text class="action-btn confirm" v-if="canOperateOrder(order)" @click.stop="confirmReceipt(order)">
							确认核销{{ verifyCount(order) > 0 ? '(' + verifyCount(order) + '件)' : '' }}
						</text>
						<text class="action-btn blocked" v-else-if="!order.pointId">该订单无自提点，请联系团长</text>
						<!-- 全部商品都在售后审核中：与 B 端 hasVerifiableGoods 一致，不提供核销入口 -->
						<text class="action-btn blocked" v-else-if="!hasReceiptGoods(order)">
							{{ blockedPendingNum(order) ? blockedPendingNum(order) + ' 件商品售后处理中，暂不可核销' : '暂无可核销商品' }}
						</text>
					</view>
				</view>
			</view>
		</view>

		<view class="empty-state" v-if="!loading && visibleOrders.length === 0">
			<text>{{ shopId ? '暂无待核销订单' : '未从门店核销码进入' }}</text>
			<text class="empty-tip">{{ shopId ? '可返回我的订单查看全部订单' : '请扫描团长提供的门店核销码' }}</text>
		</view>
		<view class="loading-state" v-if="loading">加载中...</view>
	</view>
</view>
</template>

<script>
import { getNotAllReceiptOrders, receiptOrder } from "@/api/group.js"
import {
	buildMemberPartReceiptPayload,
	canMemberOrderReceipt,
	canMemberReceiptGoods,
	memberReceiptAvailableNum,
	getMemberOrderStatusMeta,
	normalizeMemberOrder
} from "@/utils/memberOrder.js"
import { logScanEntry } from "@/utils/scanDebug.js"
import { pickActionErrorMessage, showActionError } from "@/utils/feedback.js"

export default {
	data() {
		return {
			shopId: 0,
			shopName: '',
			orderList: [],
			loading: true,
			isRequesting: false,
			// 入口参数指纹，用于区分冷启动重复调用与真正的热启动换码
			entrySignature: '',
			// 按订单号记录本次核销数量：{ [orderNo]: { [goodsId]: num } }
			verifySelection: {}
		}
	},
	computed: {
		// 已取消/已退款订单不再提供自助核销入口
		visibleOrders() {
			return this.orderList.filter(order => ![4, 6].includes(Number(order.status)))
		}
	},
	onLoad(options = {}) {
		logScanEntry('订单核销页', options)
		const token = uni.getStorageSync('token')
		if (!token) {
			// 扫码进来未登录时，把 scene 带给登录页，登录成功后再跳回核销页
			const scene = options.scene ? '?scene=' + encodeURIComponent(options.scene) : ''
			uni.redirectTo({ url: '/pages/login/index' + scene })
			return
		}
		this.applyEntryParams(options)
		this.loadOrders()
	},
	onShow() {
		// 小程序已在后台时，微信扫码唤起只触发 onShow，需要从启动参数补拿 scene
		this.applyHotStartEntry()
	},
	onPullDownRefresh() {
		this.loadOrders(() => uni.stopPullDownRefresh())
	},
	methods: {
		// 门店核销码的参数在 scene 里（形如 shopId=4），同时兼容直接 query 传参
		applyEntryParams(options = {}) {
			const params = Object.assign({}, options)
			if (options.scene) {
				decodeURIComponent(options.scene).split('&').forEach(item => {
					const pair = item.split('=')
					if (pair[0]) params[pair[0]] = pair[1]
				})
			}
			const signature = String(options.scene || '') + '|' + String(params.shopId || params.sid || '')
			if (signature === this.entrySignature) return false
			this.entrySignature = signature
			this.shopId = Number(params.shopId || params.sid || 0)
			this.shopName = params.shopName ? decodeURIComponent(params.shopName) : ''
			console.log('[核销页] 入口解析:', JSON.stringify({
				scene: options.scene || '',
				params,
				shopId: this.shopId
			}))
			return true
		},
		applyHotStartEntry() {
			if (typeof uni.getEnterOptionsSync !== 'function') return
			const enter = uni.getEnterOptionsSync() || {}
			if (!enter.query || !enter.query.scene) return
			if (this.applyEntryParams(enter.query)) this.loadOrders()
		},
		async loadOrders(callback) {
			if (!this.shopId) {
				this.orderList = []
				this.loading = false
				if (callback) callback()
				return
			}
			this.loading = true
			try {
				const res = await getNotAllReceiptOrders({ shopId: this.shopId })
				const list = Array.isArray(res.data) ? res.data : []
				this.orderList = list.map(item => normalizeMemberOrder(item))
				this.resetVerifySelection()
			} catch (err) {
				console.log('加载待核销订单失败：', err)
				uni.showToast({ title: '订单加载失败', icon: 'none' })
			} finally {
				this.loading = false
				if (callback) callback()
			}
		},
		// 每次重新拉取订单后重建选择表；默认不勾选，提交空 goodsList 即整单核销。
		resetVerifySelection() {
			const next = {}
			this.orderList.forEach(order => {
				const row = {}
				;(order.goods || []).forEach(goods => {
					if (goods.id) row[goods.id] = 0
				})
				next[order.orderNo] = row
			})
			this.verifySelection = next
		},
		selectionOf(order = {}) {
			return this.verifySelection[order.orderNo] || {}
		},
		verifyNumOf(order = {}, goods = {}) {
			return Number(this.selectionOf(order)[goods.id] || 0)
		},
		// 可核销数量 = 购买数 − 已收数 − 退待收货部分（与「能否核销」同一口径）
		maxVerifyNum(goods = {}) {
			return memberReceiptAvailableNum(goods)
		},
		canReceiptGoods(goods = {}) {
			return canMemberReceiptGoods(goods)
		},
		// 商品行提示：可核销 → 报可核销数量；不可核销要区分「已核销完」和「售后处理中」，
		// 否则已全部核销的行也会显示「售后处理中」，同样会误导。
		goodsHintText(goods = {}) {
			const unit = goods.unit || '件'
			const maxNum = this.maxVerifyNum(goods)
			if (this.canReceiptGoods(goods)) {
				return `${goods.receiptNum ? '已核销' + goods.receiptNum + unit + '，' : ''}可核销 ${maxNum}${unit}`
			}
			if (maxNum <= 0) return goods.receiptNum ? `已核销 ${goods.receiptNum}${unit}` : '无可核销数量'
			return '售后处理中，暂不可核销'
		},
		// 订单内是否还有可核销商品。全部商品都在售后审核中时不应提供核销入口（与 B 端 hasVerifiableGoods 一致）。
		hasReceiptGoods(order = {}) {
			return (order.goods || []).some(goods => canMemberReceiptGoods(goods))
		},
		// 可操作 = 订单状态允许 + 有自提点 + 存在可核销商品 + 无请求进行中
		canOperateOrder(order = {}) {
			return this.canReceipt(order) && this.hasReceiptGoods(order) && !this.isRequesting
		},
		// 本次勾选的总件数：>0 表示部分核销，=0 表示整单核销
		verifyCount(order = {}) {
			return (order.goods || []).reduce((sum, goods) => {
				if (!canMemberReceiptGoods(goods)) return sum
				return sum + Math.min(this.verifyNumOf(order, goods), this.maxVerifyNum(goods))
			}, 0)
		},
		isAllChecked(order = {}) {
			const goodsList = (order.goods || []).filter(goods => canMemberReceiptGoods(goods))
			return goodsList.length > 0 && goodsList.every(goods => this.verifyNumOf(order, goods) >= this.maxVerifyNum(goods))
		},
		setVerifyNum(order = {}, goods = {}, num = 0) {
			if (!order.orderNo || !goods.id) return
			const maxNum = this.maxVerifyNum(goods)
			const next = Math.max(0, Math.min(Number(num) || 0, maxNum))
			const row = Object.assign({}, this.selectionOf(order), { [goods.id]: next })
			this.verifySelection = Object.assign({}, this.verifySelection, { [order.orderNo]: row })
		},
		// 勾选即默认可核销全部；再点一次取消
		toggleGoods(order = {}, goods = {}) {
			if (!this.canOperateOrder(order) || !canMemberReceiptGoods(goods)) return
			const checked = this.verifyNumOf(order, goods) > 0
			this.setVerifyNum(order, goods, checked ? 0 : this.maxVerifyNum(goods))
		},
		changeVerifyNum(order = {}, goods = {}, delta = 0) {
			if (!this.canOperateOrder(order) || !canMemberReceiptGoods(goods)) return
			this.setVerifyNum(order, goods, this.verifyNumOf(order, goods) + Number(delta || 0))
		},
		toggleAllGoods(order = {}) {
			if (!this.canOperateOrder(order)) return
			const checked = this.isAllChecked(order)
			;(order.goods || []).forEach(goods => {
				if (!canMemberReceiptGoods(goods)) return
				this.setVerifyNum(order, goods, checked ? 0 : this.maxVerifyNum(goods))
			})
		},
		// 待核销件数：只统计「当前可核销」的行。
		// 售后审核中的行不可核销（见 canMemberReceiptGoods），若把它们的待核销数量也计入，
		// 页脚会同时出现「待核销 1 件」和「商品售后处理中，暂不可核销」，自相矛盾。
		pendingNum(order = {}) {
			return (order.goods || []).reduce((sum, goods) => {
				if (!canMemberReceiptGoods(goods)) return sum
				return sum + memberReceiptAvailableNum(goods)
			}, 0)
		},
		// 被售后占用（暂不可核销）的待核销件数：用于把「为什么不能核销」讲清楚
		blockedPendingNum(order = {}) {
			return (order.goods || []).reduce((sum, goods) => {
				if (canMemberReceiptGoods(goods)) return sum
				return sum + memberReceiptAvailableNum(goods)
			}, 0)
		},
		// 订单级门槛：与 B 端一致，只排除待支付/已退款/已取消（售后订单仍可核销剩余部分）
		canReceipt(order = {}) {
			return canMemberOrderReceipt(order)
		},
		orderStatusText(order = {}) {
			return order.statusText || getMemberOrderStatusMeta(order.status).text
		},
		orderStatusTone(order = {}) {
			return order.statusTone || getMemberOrderStatusMeta(order.status).tone
		},
		confirmReceipt(order) {
			if (!this.canOperateOrder(order)) return
			const count = this.verifyCount(order)
			uni.showModal({
				title: '确认核销',
				content: count > 0 ? `确认核销勾选的 ${count} 件商品？` : '确认核销该订单全部商品？',
				success: async res => {
					if (!res.confirm) return
					await this.submitReceipt(order)
				}
			})
		},
		async submitReceipt(order) {
			// 兜底拦阻：无可核销商品时不允许提交，避免把空 goodsList 当整单核销打给后端
			if (this.isRequesting || !this.hasReceiptGoods(order)) return
			// 勾选了商品走部分核销（带 goodsList），未勾选则提交空 goodsList 表示整单核销
			const payload = buildMemberPartReceiptPayload(order, this.selectionOf(order))
			this.isRequesting = true
			try {
				// silentToast：核销失败原因（不在核销范围/数量超了等）由本页 modal 展示
				await receiptOrder(payload, { silentToast: true })
				uni.showToast({ title: '核销成功', icon: 'success' })
				await this.loadOrders()
			} catch (err) {
				console.log('确认核销失败：', err)
				showActionError(pickActionErrorMessage(err, '核销失败'), { title: '核销失败' })
			} finally {
				this.isRequesting = false
			}
		},
		// 扫码进入时当前页就是页面栈栈底，交给系统返回会直接退出小程序；
		// 这里统一返回首页，保证「返回」有明确去处。
		goBack() {
			uni.switchTab({
				url: '/pages/index/index',
				fail: () => uni.reLaunch({ url: '/pages/index/index' })
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #f7f7f7;
	box-sizing: border-box;
}

.verify-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 30;
	background: #fff;
	box-sizing: border-box;
}

/* 与 pages/order/detail.vue 等页面保持一致：back 绝对定位靠左，title 左右留白居中，
   避免标题被系统胶囊按钮挤压偏移。 */
.back {
	position: absolute;
	left: 28rpx;
	width: 58rpx;
	text-align: left;
	font-size: 48rpx;
	font-weight: 300;
	color: #666;
}

.title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	text-align: center;
	font-size: 34rpx;
	font-weight: 500;
	color: #222;
}

.page {
	padding: 24rpx;
}

.shop-banner {
	display: flex;
	flex-direction: column;
	background: linear-gradient(135deg, #24c567, #19be6b);
	border-radius: 16rpx;
	padding: 32rpx;
	color: #fff;
}

.shop-name {
	font-size: 34rpx;
	font-weight: 600;
}

.shop-tip {
	margin-top: 12rpx;
	font-size: 24rpx;
	opacity: .9;
}

.section-title {
	margin: 28rpx 0 16rpx;
	font-size: 28rpx;
	font-weight: 600;
	color: #333;
}

.order-card {
	background: #fff;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 20rpx;
}

.order-title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.group-no {
	font-size: 26rpx;
	color: #333;
}

.order-status-pill {
	font-size: 22rpx;
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
	background: #eef7f1;
	color: #19be6b;
}

.order-status-pill.warning {
	background: #fff5e6;
	color: #f5a623;
}

.order-status-pill.danger {
	background: #fdecec;
	color: #e64340;
}

.order-status-pill.muted {
	background: #f2f2f2;
	color: #999;
}

.order-time {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	color: #999;
}

.order-product {
	display: flex;
	margin-top: 20rpx;
}

.product-image,
.product-image image {
	width: 120rpx;
	height: 120rpx;
	border-radius: 12rpx;
	background: #f2f2f2;
	flex-shrink: 0;
}

.product-info {
	flex: 1;
	margin-left: 20rpx;
	min-width: 0;
}

.product-name {
	font-size: 28rpx;
	color: #222;
}

.product-spec {
	margin-top: 8rpx;
	font-size: 22rpx;
	color: #999;
}

.product-price-num {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin-top: 12rpx;
}

.product-price {
	font-size: 30rpx;
	color: #e64340;
	font-weight: 600;
}

.product-price .label {
	font-size: 22rpx;
}

.product-num {
	font-size: 24rpx;
	color: #999;
}

/* 商品行选择与数量控件：与 B 端核销页（pagesA/order/detail.vue）保持一致的交互样式 */
.check-circle {
	position: relative;
	width: 34rpx;
	height: 34rpx;
	margin-right: 16rpx;
	border: 2rpx solid #d8d8d8;
	border-radius: 50%;
	flex-shrink: 0;
	box-sizing: border-box;
}

.check-circle.checked {
	border-color: #25c56b;
	background: #25c56b;
}

.check-circle.checked::after {
	content: "";
	position: absolute;
	left: 9rpx;
	top: 5rpx;
	width: 9rpx;
	height: 15rpx;
	border-right: 3rpx solid #fff;
	border-bottom: 3rpx solid #fff;
	transform: rotate(45deg);
}

.check-circle.disabled {
	opacity: .45;
	background: #f4f4f4;
}

.quantity-control {
	display: flex;
	align-items: center;
	height: 48rpx;
	border: 1rpx solid #ddd;
	border-radius: 4rpx;
	overflow: hidden;
}

.quantity-button,
.quantity-value {
	width: 48rpx;
	line-height: 46rpx;
	text-align: center;
	font-size: 27rpx;
}

.quantity-button {
	color: #16803b;
	background: #f4fbf6;
}

.quantity-button.disabled {
	color: #c6c6c6;
	background: #f7f7f7;
}

.quantity-value {
	color: #333;
	border-left: 1rpx solid #ddd;
	border-right: 1rpx solid #ddd;
}

.select-all {
	display: flex;
	align-items: center;
	padding-top: 18rpx;
	font-size: 26rpx;
	color: #333;
}

.select-all .check-circle {
	margin-right: 14rpx;
}

.pending-text.muted {
	color: #bbb;
}

.station-card {
	margin-top: 20rpx;
	padding: 16rpx 20rpx;
	background: #f8f8f8;
	border-radius: 12rpx;
	font-size: 24rpx;
	color: #666;
}

.station-title {
	font-weight: 600;
	color: #333;
	margin-bottom: 6rpx;
}

.order-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 20rpx;
}

.pending-text {
	font-size: 24rpx;
	color: #f5a623;
}

.order-actions {
	display: flex;
	align-items: center;
}

.action-btn {
	font-size: 26rpx;
	padding: 10rpx 28rpx;
	border-radius: 32rpx;
}

.action-btn.confirm {
	background: #19be6b;
	color: #fff;
}

/* 不可核销的情形：做成弱化文案而非按钮外观，避免用户误以为可点 */
.action-btn.blocked {
	padding: 0;
	background: transparent;
	color: #999;
	font-size: 22rpx;
}

.empty-state,
.loading-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 120rpx 0;
	color: #999;
	font-size: 28rpx;
}

.empty-tip {
	margin-top: 12rpx;
	font-size: 24rpx;
	color: #bbb;
}
</style>
