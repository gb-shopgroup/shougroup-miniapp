<template>
	<view class="container" :style="miniNavPageStyle()">
		<view class="leader-nav" :style="miniNavBarStyle()">
			<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
			<text class="title" :style="miniNavTitleStyle()">批量退款</text>
			<text class="nav-space"></text>
		</view>
		<view class="search-bar">
			<input v-model="keyword" class="search-input" placeholder="搜索订单号/团员/商品" confirm-type="search" @confirm="searchRefundOrders" />
			<view class="search-action" @click="searchRefundOrders">搜索</view>
		</view>
		<view class="page">
			<view v-for="order in orderList" :key="order.orderNo" class="order-card">
				<view class="order-header"><text>订单号：{{ order.orderNo }}</text><view class="order-actions"><text class="detail" @click.stop="goRefundDetail(order)">详情</text><text class="status">待处理退款</text></view></view>
				<view class="member-row"><text>{{ order.nickname || order.trueName || '团员' }}</text><text v-if="order.mobile">{{ order.mobile }}</text></view>
				<view v-for="goods in order.goods" :key="goods.id" class="goods-row" :class="{ disabled: !isRefundable(goods) }" @click="toggleRefundableGoods(order, goods)">
					<view class="check" :class="{ checked: isGoodsChecked(order, goods), hidden: !isRefundable(goods) }"><text v-if="isGoodsChecked(order, goods)">✓</text></view>
					<image :src="goods.img" class="goods-image" mode="aspectFill" />
					<view class="goods-content">
						<text class="goods-name">{{ goods.name }}</text>
						<text v-if="goods.specText" class="goods-spec">{{ goods.specText }}</text>
						<view class="goods-footer"><text class="goods-price">¥{{ goods.price }}</text><text class="goods-num">退款 {{ refundGoodsNum(goods) }}{{ goods.unit }}</text></view>
					</view>
					<text v-if="!isRefundable(goods)" class="unavailable">非退款项</text>
				</view>
			</view>
			<view v-if="!loading && orderList.length === 0" class="empty">暂无待处理退款申请</view>
			<view v-if="loading" class="empty">加载中...</view>
			<view v-else-if="orderList.length" class="more">{{ hasMore ? '上拉加载更多' : '没有更多退款申请了' }}</view>
		</view>
		<view class="bottom-bar">
			<view class="select-all" @click="toggleAll"><view class="check" :class="{ checked: allChecked }"><text v-if="allChecked">✓</text></view><text>全选</text></view>
			<text class="selected-count">已选{{ summary.itemCount }}项</text>
			<view class="refund-action" @click="confirmBatchRefund">退款</view>
		</view>
		<view v-if="confirmVisible" class="modal-mask" @click="confirmVisible = false">
			<view class="confirm-modal" @click.stop>
				<text class="modal-title">批量退款确认</text>
				<text class="modal-row">共计团购数{{ summary.itemCount }}件</text>
				<text class="modal-row">共计退款金额￥{{ summary.refundAmount }}</text>
				<text class="warning">批量退款成功后，无法撤销谨慎操作</text>
				<view class="modal-actions"><view class="modal-action cancel" @click="confirmVisible = false">取消</view><view class="modal-action confirm" :class="{ submitting: submitting }" @click="submitBatchRefund">{{ submitting ? '提交中...' : '确认退款' }}</view></view>
			</view>
		</view>
	</view>
</template>

<script>
import { approveLeaderRefundOrder, getLeaderRefundOrderList } from "@/api/leader.js"
import {
	buildBatchRefundSummary,
	buildLeaderRefundListRequest,
	buildRefundApprovalPayload,
	isLeaderRefundableGoods,
	REFUND_APPROVE_STATUS,
	normalizeLeaderOrder,
	toggleRefundSelection
} from "@/utils/leaderOrder.js"

export default {
	data() {
		return {
			keyword: '',
			orderList: [],
			selection: {},
			page: 1,
			pageSize: 10,
			hasMore: false,
			loading: false,
			confirmVisible: false,
			submitting: false
		}
	},
	computed: {
		summary() {
			return buildBatchRefundSummary(this.selection)
		},
		allChecked() {
			let selectable = 0
			this.orderList.forEach(order => {
				order.goods.forEach(goods => {
					if (isLeaderRefundableGoods(goods)) selectable += 1
				})
			})
			return selectable > 0 && this.summary.itemCount === selectable
		}
	},
	onLoad() {
		this.loadRefundOrders()
	},
	onPullDownRefresh() {
		this.page = 1
		this.orderList = []
		this.selection = {}
		this.loadRefundOrders(() => uni.stopPullDownRefresh())
	},
	onReachBottom() {
		if (this.loading || !this.hasMore) return
		this.page += 1
		this.loadRefundOrders()
	},
	methods: {
		async loadRefundOrders(callback) {
			if (this.loading) return
			this.loading = true
			try {
				const request = buildLeaderRefundListRequest({
					keyword: this.keyword,
					page: this.page,
					pageSize: this.pageSize,
					applyStatus: 1
				})
				const res = await getLeaderRefundOrderList(request)
				const list = Array.isArray(res.data) ? res.data.map(item => normalizeLeaderOrder(item)) : []
				this.orderList = this.page <= 1 ? list : this.orderList.concat(list)
				this.hasMore = list.length >= this.pageSize
			} catch (err) {
				if (this.page <= 1) this.orderList = []
				uni.showToast({ title: String((err && (err.msg || err.message)) || '退款列表加载失败'), icon: 'none' })
			} finally {
				this.loading = false
				if (callback) callback()
			}
		},
		isGoodsChecked(order, goods) {
			const entry = this.selection[order.orderNo]
			return !!(entry && entry.goodsMap && entry.goodsMap[goods.id])
		},
		toggleGoods(order, goods) {
			const checked = !this.isGoodsChecked(order, goods)
			this.selection = toggleRefundSelection(this.selection, order, goods, checked)
		},
		toggleAll() {
			let next = {}
			if (!this.allChecked) {
				this.orderList.forEach(order => {
					order.goods.forEach(goods => {
						if (isLeaderRefundableGoods(goods)) {
							next = toggleRefundSelection(next, order, goods, true)
						}
					})
				})
			}
			this.selection = next
		},
		isRefundable(goods) {
			return isLeaderRefundableGoods(goods)
		},
		toggleRefundableGoods(order, goods) {
			if (!this.isRefundable(goods)) return
			this.toggleGoods(order, goods)
		},
		refundGoodsNum(goods) {
			return Number(goods.refundGoodsNum || goods.num || 0)
		},
		searchRefundOrders() {
			this.page = 1
			this.orderList = []
			this.selection = {}
			this.loadRefundOrders()
		},
		confirmBatchRefund() {
			if (this.summary.itemCount <= 0) {
				uni.showToast({ title: '请选择退款商品', icon: 'none' })
				return
			}
			this.confirmVisible = true
		},
		async submitBatchRefund() {
			if (this.submitting) return
			this.submitting = true
			try {
				await approveLeaderRefundOrder(buildRefundApprovalPayload({ selection: this.selection, status: REFUND_APPROVE_STATUS.AGREE }))
				uni.showToast({ title: '退款成功', icon: 'success' })
				this.confirmVisible = false
				this.selection = {}
				this.page = 1
				this.orderList = []
				this.loadRefundOrders()
			} catch (err) {
				uni.showToast({ title: String((err && (err.msg || err.message)) || '退款失败'), icon: 'none' })
			} finally {
				this.submitting = false
			}
		},
		goBack() {
			uni.navigateBack({ delta: 1 })
		},
		goRefundDetail(order) {
			const orderNo = order.orderNo || ''
			uni.navigateTo({
				url: '/pagesA/order/refundDetail?orderNo=' + encodeURIComponent(orderNo),
				success: res => {
					if (res.eventChannel) res.eventChannel.emit('sendParams', order)
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; padding-bottom: 132rpx; background: #f5f5f5; color: #222; box-sizing: border-box; }
.leader-nav { position: fixed; left: 0; right: 0; top: 0; z-index: 20; padding: 0 28rpx; display: grid; grid-template-columns: 160rpx minmax(0, 1fr) 160rpx; align-items: start; background: #fff; box-sizing: border-box; }
.back, .nav-space { width: 160rpx; }
.back { position: absolute; left: 28rpx; display: flex; align-items: center; color: #666; font-size: 48rpx; }
.title { position: absolute; left: 160rpx; right: 160rpx; font-size: 34rpx; font-weight: 500; text-align: center; }
.search-bar { display: flex; gap: 14rpx; padding: 18rpx 24rpx; background: #fff; border-top: 1rpx solid #f0f0f0; }
.search-input { flex: 1; min-width: 0; height: 64rpx; padding: 0 18rpx; color: #333; font-size: 26rpx; background: #f7f7f7; border-radius: 6rpx; box-sizing: border-box; }
.search-action { padding: 17rpx 24rpx; color: #fff; font-size: 24rpx; background: #16a34a; border-radius: 6rpx; }
.page { padding: 20rpx 24rpx 32rpx; }
.order-card { margin-bottom: 18rpx; padding: 22rpx; background: #fff; border-radius: 8rpx; }
.order-header, .order-actions, .member-row, .goods-footer, .bottom-bar, .select-all, .modal-actions { display: flex; align-items: center; }
.order-header { justify-content: space-between; padding-bottom: 18rpx; font-size: 25rpx; border-bottom: 1rpx solid #f0f0f0; }
.order-actions { gap: 14rpx; }
.detail { padding: 5rpx 12rpx; color: #16803b; font-size: 22rpx; border: 1rpx solid #16a34a; border-radius: 5rpx; }
.status { color: #b26a00; font-size: 22rpx; background: #fff5df; padding: 5rpx 12rpx; border-radius: 5rpx; }
.member-row { justify-content: space-between; padding: 18rpx 0 4rpx; color: #666; font-size: 24rpx; }
.goods-row { display: flex; align-items: center; gap: 16rpx; padding: 18rpx 0; border-top: 1rpx solid #f4f4f4; }
.goods-row.disabled { opacity: 0.55; }
.check { width: 34rpx; height: 34rpx; display: flex; align-items: center; justify-content: center; flex: 0 0 34rpx; color: #fff; font-size: 22rpx; border: 2rpx solid #c8c8c8; border-radius: 50%; box-sizing: border-box; }
.check.checked { background: #16a34a; border-color: #16a34a; }
.check.hidden { visibility: hidden; }
.goods-image { width: 118rpx; height: 118rpx; flex: 0 0 118rpx; background: #f3f3f3; border-radius: 6rpx; }
.goods-content { flex: 1; min-width: 0; display: flex; flex-direction: column; align-self: stretch; }
.goods-name, .goods-spec { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goods-name { color: #222; font-size: 26rpx; line-height: 38rpx; }
.goods-spec { margin-top: 4rpx; color: #888; font-size: 22rpx; line-height: 32rpx; }
.goods-footer { justify-content: space-between; margin-top: auto; padding-top: 12rpx; }
.goods-price { color: #f05b40; font-size: 26rpx; }
.goods-num, .unavailable { color: #777; font-size: 23rpx; }
.unavailable { flex: 0 0 auto; }
.empty, .more { padding: 60rpx 0; color: #999; font-size: 25rpx; text-align: center; }
.more { padding: 24rpx 0; }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 10; min-height: 112rpx; padding: 18rpx 24rpx; background: #fff; box-shadow: 0 -2rpx 14rpx rgba(0, 0, 0, 0.08); box-sizing: border-box; }
.select-all { gap: 12rpx; color: #333; font-size: 25rpx; }
.selected-count { flex: 1; padding-left: 26rpx; color: #666; font-size: 25rpx; }
.refund-action { min-width: 174rpx; padding: 19rpx 20rpx; color: #fff; font-size: 27rpx; text-align: center; background: #16a34a; border-radius: 6rpx; box-sizing: border-box; }
.modal-mask { position: fixed; z-index: 20; top: 0; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: center; padding: 40rpx; background: rgba(0, 0, 0, 0.45); box-sizing: border-box; }
.confirm-modal { width: 100%; max-width: 600rpx; padding: 38rpx 32rpx 28rpx; background: #fff; border-radius: 8rpx; box-sizing: border-box; }
.modal-title { display: block; color: #222; font-size: 32rpx; font-weight: 600; text-align: center; }
.modal-row { display: block; margin-top: 28rpx; color: #333; font-size: 27rpx; line-height: 40rpx; }
.warning { display: block; margin-top: 22rpx; color: #f05b40; font-size: 24rpx; line-height: 36rpx; }
.modal-actions { gap: 18rpx; margin-top: 34rpx; }
.modal-action { flex: 1; padding: 18rpx 12rpx; font-size: 26rpx; text-align: center; border-radius: 6rpx; }
.cancel { color: #555; background: #f1f1f1; }
.confirm { color: #fff; background: #16a34a; }
.confirm.submitting { opacity: 0.6; }
</style>
