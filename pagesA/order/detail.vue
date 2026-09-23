<template>
	<view class="container" :style="miniNavPageStyle()">
		<view class="leader-nav" :style="miniNavBarStyle()">
			<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
			<text class="title" :style="miniNavTitleStyle()">{{ pageTitle }}</text>
			<text class="nav-space"></text>
		</view>

		<view class="page">
			<view class="section">
				<view class="section-head">
					<view class="order-no">订单号：<text>{{ orderInfo.orderNo || '---' }}</text></view>
					<view class="status" :class="orderInfo.statusTone">{{ pickupStatusText }}</view>
				</view>
				<view v-for="(goods, index) in orderInfo.goods" :key="goods.id" class="goods-row">
					<view v-if="isVerifyMode" class="check-circle" :class="{ checked: Number(goods.verifyNum || 0) > 0, disabled: !canOperateVerify || !canWriteOffGoods(goods) }" @click.stop="toggleGoods(index)"></view>
					<image :src="goods.img" class="goods-image" mode="aspectFill" />
					<view class="goods-content">
						<text class="goods-name">{{ goods.name }}</text>
						<text v-if="goods.specText" class="goods-spec">{{ goods.specText }}</text>
						<view class="goods-footer">
							<text class="price">¥{{ goods.price }}</text>
							<view v-if="isVerifyMode" class="verify-tools">
								<text class="verify-label">本次核销数量</text>
								<view class="quantity-control">
									<text class="quantity-button" :class="{ disabled: !canOperateVerify || Number(goods.verifyNum || 0) <= 0 }" @click.stop="changeVerifyNum(index, -1)">−</text>
									<text class="quantity-value">{{ goods.verifyNum }}</text>
									<text class="quantity-button" :class="{ disabled: !canOperateVerify || !canWriteOffGoods(goods) || Number(goods.verifyNum || 0) >= Number(goods.pendingWriteOffNum || 0) }" @click.stop="changeVerifyNum(index, 1)">+</text>
								</view>
							</view>
							<text v-else class="goods-num">x{{ goods.num }}</text>
						</view>
						<text v-if="isVerifyMode" class="pending-text">
							{{ goods.receiptNum ? '已核销' + goods.receiptNum + (goods.unit || '件') : '' }}{{ goods.receiptNum ? '，' : '' }}可核销 {{ goods.pendingWriteOffNum }}{{ goods.unit || '件' }}
						</text>
					</view>
				</view>
				<view v-if="orderInfo.goods.length === 0" class="empty-goods">暂无商品信息</view>
				<view v-if="isVerifyMode && orderInfo.goods.length" class="select-all" :class="{ disabled: !canOperateVerify }" @click="toggleAllGoods">
					<view class="check-circle" :class="{ checked: isAllChecked }"></view>
					<text>全选</text>
				</view>
			</view>

			<view class="section">
				<text class="section-title">订单信息</text>
				<view class="info-row"><text class="label">订单编号</text><text class="value">{{ orderInfo.orderNo || '---' }}</text></view>
				<view class="info-row"><text class="label">买家</text><text class="value">{{ orderInfo.trueName || orderInfo.nickname || '---' }}</text></view>
				<view class="info-row"><text class="label">手机</text><text class="value">{{ orderInfo.telephone || orderInfo.mobile || '---' }}</text></view>
				<view class="info-row"><text class="label">订单时间</text><text class="value">{{ orderInfo.orderTime || '---' }}</text></view>
			</view>

			<view class="section">
				<text class="section-title">服务驿站</text>
				<view class="info-row"><text class="label">驿站名称</text><text class="value">{{ orderInfo.pointName || '未选择服务驿站' }}</text></view>
				<view class="info-row address-row"><text class="label">驿站地址</text><text class="value address">{{ orderInfo.pointAddress || '---' }}</text></view>
			</view>

			<view v-if="showVerifyRecords" class="section">
				<view class="history-head" @click="historyExpanded = !historyExpanded">
					<text class="section-title">核销记录</text>
					<text class="history-toggle">{{ historyExpanded ? '收起' : '展开' }}</text>
				</view>
				<view v-if="historyExpanded">
					<view v-for="(item, index) in visibleHistory" :key="index" class="history-row">
						<text v-for="(segment, i) in historySegments(item)" :key="i">{{ segment.text }}<text v-if="segment.qty" class="verify-qty">{{ segment.qty }}</text></text>
					</view>
					<view v-if="visibleHistory.length === 0" class="empty-history">{{ refreshingDetail ? '加载中...' : '暂无核销记录' }}</view>
				</view>
			</view>

			<view class="section">
				<view class="info-row"><text class="section-title">订单金额</text><text class="amount">¥{{ orderInfo.orderPrice }}</text></view>
				<view class="info-row"><text class="section-title">订单状态</text><text class="status" :class="orderInfo.statusTone">{{ orderInfo.statusText }}</text></view>
			</view>
		</view>

		<view v-if="isVerifyMode" class="bottom-bar">
			<view class="action primary" :class="{ disabled: submitting || !canOperateVerify || verifyGoodsCount === 0 }" @click="confirmWriteOff">
				{{ refreshingDetail ? '刷新订单中...' : '确认核销(' + verifyGoodsCount + '个商品)' }}
			</view>
		</view>
	</view>
</template>

<script>
import { getLeaderOrderInfo, partWriteOffLeaderOrder, writeOffLeaderOrder } from "@/api/leader.js"
import { getCurrentLeaderPointId } from "@/utils/leaderConfig.js"
import { buildLeaderOrderScanTarget, buildLeaderVerifyRecordSegments, buildPartWriteOffPayload, buildWriteOffPayload, canLeaderOrderShowVerifyRecords, canLeaderOrderVerify, canLeaderWriteOffGoods, normalizeLeaderOrder } from "@/utils/leaderOrder.js"
import { pickActionErrorMessage, showActionError } from "@/utils/feedback.js"

export default {
	data() {
		return {
			orderInfo: normalizeLeaderOrder({}),
			mode: 'view',
			historyExpanded: false,
			submitting: false,
			refreshingDetail: false,
			verifyDetailReady: false,
			// eventChannel 数据是否已送达，用于避免与 query 兜底重复拉取订单
			channelDataReceived: false
		}
	},
	computed: {
		hasVerifiableGoods() {
			// 与列表/扫码共用同一判断：除商品行还有待核销数量外，还要排除待支付/已退款/已取消
			return canLeaderOrderVerify(this.orderInfo)
		},
		isVerifyMode() {
			return this.mode === 'verify' && this.hasVerifiableGoods
		},
		// 核销记录区块的展示条件：只要该订单发生过核销（部分收货/已提货）就展示，
		// 不再挂在 isVerifyMode 上——否则「查看订单」模式和「已提货（无待核销商品）」时
		// 恰好是最需要看核销记录的场景，反而被隐藏。
		showVerifyRecords() {
			return canLeaderOrderShowVerifyRecords(this.orderInfo)
		},
		pageTitle() {
			return this.isVerifyMode ? '商品核销' : '查看订单'
		},
		pickupStatusText() {
			return this.orderInfo.statusText
		},
		verifyGoodsCount() {
			return this.orderInfo.goods.filter(item => canLeaderWriteOffGoods(item) && Number(item.verifyNum || 0) > 0).length
		},
		canOperateVerify() {
			return this.isVerifyMode && this.verifyDetailReady && !this.refreshingDetail
		},
		isAllChecked() {
			const pendingGoods = this.orderInfo.goods.filter(item => canLeaderWriteOffGoods(item))
			return pendingGoods.length > 0 && pendingGoods.every(item => Number(item.verifyNum || 0) === Number(item.pendingWriteOffNum || 0))
		},
		isFullWriteOff() {
			const goods = this.orderInfo.goods || []
			const pendingGoods = goods.filter(item => canLeaderWriteOffGoods(item))
			return pendingGoods.length > 0 && pendingGoods.length === goods.length && this.isAllChecked
		},
		visibleHistory() {
			// 「核销记录」优先用接口的 verifyRecords（仅订单详情接口下发）；history 仅作老数据兜底
			const records = this.orderInfo.verifyRecords
			if (Array.isArray(records) && records.length) return records
			return Array.isArray(this.orderInfo.history) ? this.orderInfo.history : []
		}
	},
	onLoad(options = {}) {
		// 扫码后可能以 navigateTo/redirectTo 携带 query 进入，此时没有 eventChannel，
		// 需要能仅凭 orderNo 自行拉取订单，否则页面会空白。
		// 微信小程序码的参数在 scene 里（形如 scene=orderNo=X），与直接 query 传参两种都要支持。
		const params = Object.assign({}, options)
		if (options.scene) {
			try {
				decodeURIComponent(options.scene).split('&').forEach(item => {
					const pair = item.split('=')
					if (pair[0]) params[pair[0]] = pair[1]
				})
			} catch (err) {
				console.log('扫码参数解析失败：', err)
			}
		}
		const fallbackOrderNo = params.orderNo || params.id || ''
		const fallbackMode = params.mode === 'verify' ? 'verify' : 'view'
		const channel = this.getOpenerEventChannel && this.getOpenerEventChannel()
		if (channel && channel.on) {
			channel.on('sendParams', data => {
				this.channelDataReceived = true
				this.mode = data && data._mode ? data._mode : 'view'
				this.setOrderInfo(data || {})
				// 列表接口不填充 verifyRecords，因此两种模式都要拉一次详情，
				// 否则「查看订单」模式下核销记录永远显示「暂无核销记录」。
				this.refreshLatestOrderInfo()
			})
		}
		if (fallbackOrderNo) this.loadScannedOrderByNo(fallbackOrderNo, fallbackMode)
	},
	methods: {
		goBack() {
			uni.navigateBack({ delta: 1 })
		},
		setOrderInfo(data) {
			const next = normalizeLeaderOrder(data || {})
			// 列表接口不填充 verifyRecords：渠道数据（列表行）晚于详情响应到达时，
			// 不能把已取到的核销记录清空。
			this.orderInfo = Object.assign({}, next, {
				verifyRecords: next.verifyRecords.length ? next.verifyRecords : (this.orderInfo.verifyRecords || [])
			})
			if (this.mode === 'verify') this.resetVerifySelection()
		},
		// 扫码进入：eventChannel 未送达时按 orderNo 拉取订单，并根据是否还有可核销商品决定模式。
		async loadScannedOrderByNo(orderNo, fallbackMode = 'view') {
			if (!orderNo) return
			if (this.channelDataReceived) return
			this.mode = fallbackMode
			this.refreshingDetail = true
			try {
				const res = await getLeaderOrderInfo({ orderNo })
				if (this.channelDataReceived) return
				const order = this.resolveOrderResponseData(res.data)
				if (!order || !order.orderNo) {
					uni.showToast({ title: '没有找到订单', icon: 'none' })
					return
				}
				this.mode = buildLeaderOrderScanTarget(normalizeLeaderOrder(order)).mode
				this.setOrderInfo(Object.assign({}, order, { _mode: this.mode }))
			} catch (err) {
				console.log('扫码加载订单详情失败：', err)
				uni.showToast({ title: '订单查询失败', icon: 'none' })
			} finally {
				this.refreshingDetail = false
				this.verifyDetailReady = true
			}
		},
		resolveOrderResponseData(data) {
			if (!Array.isArray(data)) return data || {}
			const orderNo = this.orderInfo.orderNo
			return data.find(item => item && item.orderNo === orderNo) || data[0] || {}
		},
		async refreshLatestOrderInfo() {
			if (!this.orderInfo.orderNo) return
			this.refreshingDetail = true
			this.verifyDetailReady = false
			try {
				const res = await getLeaderOrderInfo({ orderNo: this.orderInfo.orderNo })
				const latestOrder = this.resolveOrderResponseData(res.data)
				this.setOrderInfo(Object.assign({}, latestOrder, { _mode: this.mode }))
				this.verifyDetailReady = true
			} catch (err) {
				console.log('刷新核销订单详情失败：', err)
				uni.showToast({ title: '订单详情刷新失败', icon: 'none' })
			} finally {
				this.refreshingDetail = false
			}
		},
		resetVerifySelection() {
			const nextGoods = this.orderInfo.goods.map(item => Object.assign({}, item, { verifyNum: 0 }))
			this.orderInfo = Object.assign({}, this.orderInfo, { goods: nextGoods })
		},
		canWriteOffGoods(goods = {}) {
			return canLeaderWriteOffGoods(goods)
		},
		toggleGoods(index) {
			if (!this.canOperateVerify) return
			const goods = this.orderInfo.goods[index]
			if (!goods || !this.canWriteOffGoods(goods)) return
			const checked = Number(goods.verifyNum || 0) > 0
			const nextNum = checked ? 0 : Number(goods.pendingWriteOffNum || 0)
			const nextGoods = this.orderInfo.goods.map((item, idx) => idx === index ? Object.assign({}, item, { verifyNum: nextNum }) : item)
			this.orderInfo = Object.assign({}, this.orderInfo, { goods: nextGoods })
		},
		toggleAllGoods() {
			if (!this.canOperateVerify) return
			const checked = this.isAllChecked
			const nextGoods = this.orderInfo.goods.map(item => {
				const pendingNum = this.canWriteOffGoods(item) ? Number(item.pendingWriteOffNum || 0) : 0
				return Object.assign({}, item, { verifyNum: checked || pendingNum <= 0 ? 0 : pendingNum })
			})
			this.orderInfo = Object.assign({}, this.orderInfo, { goods: nextGoods })
		},
		changeVerifyNum(index, delta) {
			if (!this.canOperateVerify) return
			const goods = this.orderInfo.goods[index]
			if (!goods || !this.canWriteOffGoods(goods)) return
			const maxNum = Math.max(0, Number(goods.pendingWriteOffNum || 0))
			const nextNum = Math.max(0, Math.min(Number(goods.verifyNum || 0) + delta, maxNum))
			const nextGoods = this.orderInfo.goods.map((item, idx) => {
				if (idx !== index) return item
				return Object.assign({}, item, { verifyNum: nextNum })
			})
			this.orderInfo = Object.assign({}, this.orderInfo, { goods: nextGoods })
		},
		confirmWriteOff() {
			if (this.submitting || !this.canOperateVerify) return
			if (this.verifyGoodsCount === 0) {
				uni.showToast({ title: '请选择核销商品', icon: 'none' })
				return
			}
			uni.showModal({
				title: '确认核销',
				content: `确定核销${this.verifyGoodsCount}个商品吗？`,
				success: res => {
					if (!res.confirm) return
					this.submitWriteOff()
				}
			})
		},
		async submitWriteOff() {
			if (this.isFullWriteOff) {
				await this.submitFullWriteOff()
			} else {
				await this.submitPartWriteOff()
			}
		},
		async submitFullWriteOff() {
			if (this.submitting) return
			this.submitting = true
			try {
				const pointId = getCurrentLeaderPointId() || this.orderInfo.pointId || 0
				// silentToast：核销失败原因由本页 modal 展示
				await writeOffLeaderOrder(buildWriteOffPayload(this.orderInfo, pointId), { silentToast: true })
				uni.showToast({ title: '核销成功', icon: 'success' })
				this.goBack()
			} catch (err) {
				showActionError(pickActionErrorMessage(err, '核销失败'), { title: '核销失败' })
			} finally {
				this.submitting = false
			}
		},
		async submitPartWriteOff() {
			if (this.submitting) return
			const pointId = getCurrentLeaderPointId() || this.orderInfo.pointId || 0
			const payload = buildPartWriteOffPayload(this.orderInfo, pointId)
			if (Object.keys(payload.goodsMap).length === 0) {
				uni.showToast({ title: '请选择核销数量', icon: 'none' })
				return
			}
			this.submitting = true
			try {
				await partWriteOffLeaderOrder(payload, { silentToast: true })
				uni.showToast({ title: '核销成功', icon: 'success' })
				this.goBack()
			} catch (err) {
				showActionError(pickActionErrorMessage(err, '核销失败'), { title: '核销失败' })
			} finally {
				this.submitting = false
			}
		},
		// 与核销列表页共用同一套分段逻辑：数量+单位单独一段，红色强调
		historySegments(item) {
			return buildLeaderVerifyRecordSegments(item)
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
.page { padding: 20rpx 24rpx; }
.section { margin-bottom: 18rpx; padding: 24rpx; background: #fff; border-radius: 8rpx; }
.section-head, .info-row, .goods-footer, .quantity-control, .bottom-bar, .select-all, .history-head { display: flex; align-items: center; }
.section-head { justify-content: space-between; margin-bottom: 8rpx; }
.section-title { color: #222; font-size: 28rpx; font-weight: 600; }
.order-no { min-width: 0; flex: 1; font-size: 30rpx; color: #222; }
.order-no text { color: #ff3b22; }
.goods-row { display: flex; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.goods-row:last-of-type { border-bottom: 0; }
.check-circle { position: relative; width: 34rpx; height: 34rpx; margin-right: 18rpx; border: 2rpx solid #d8d8d8; border-radius: 50%; flex-shrink: 0; box-sizing: border-box; }
.check-circle.checked { border-color: #25c56b; background: #25c56b; }
.check-circle.checked::after { content: ""; position: absolute; left: 9rpx; top: 5rpx; width: 9rpx; height: 15rpx; border-right: 3rpx solid #fff; border-bottom: 3rpx solid #fff; transform: rotate(45deg); }
.check-circle.disabled { opacity: 0.45; background: #f4f4f4; }
.goods-image { width: 132rpx; height: 132rpx; margin-right: 18rpx; background: #f2f2f2; border-radius: 6rpx; flex-shrink: 0; }
.goods-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.goods-name { font-size: 27rpx; line-height: 38rpx; }
.goods-spec, .pending-text { margin-top: 6rpx; color: #888; font-size: 23rpx; line-height: 32rpx; }
.goods-footer { justify-content: space-between; margin-top: auto; padding-top: 12rpx; }
.price, .amount { color: #f05b40; font-size: 28rpx; font-weight: 600; }
.goods-num { color: #666; font-size: 25rpx; }
.verify-tools { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; }
.verify-label { color: #999; font-size: 22rpx; white-space: nowrap; }
.quantity-control { height: 48rpx; border: 1rpx solid #ddd; border-radius: 4rpx; overflow: hidden; }
.quantity-button, .quantity-value { width: 48rpx; line-height: 46rpx; text-align: center; font-size: 27rpx; }
.quantity-button { color: #16803b; background: #f4fbf6; }
.quantity-button.disabled { color: #c6c6c6; background: #f7f7f7; }
.quantity-value { color: #333; border-left: 1rpx solid #ddd; border-right: 1rpx solid #ddd; }
.empty-goods { padding: 38rpx 0; text-align: center; color: #999; font-size: 25rpx; }
.select-all { gap: 14rpx; padding-top: 18rpx; font-size: 26rpx; color: #333; }
.select-all.disabled { color: #999; }
.info-row { justify-content: space-between; min-height: 48rpx; padding-top: 16rpx; font-size: 25rpx; }
.label { color: #888; flex-shrink: 0; }
.value { max-width: 480rpx; color: #333; text-align: right; word-break: break-all; }
.address-row { align-items: flex-start; }
.address { line-height: 36rpx; }
.status { padding: 5rpx 14rpx; border-radius: 20rpx; font-size: 22rpx; white-space: nowrap; }
.warning { color: #b26a00; background: #fff5df; }
.success { color: #16803b; background: #e7f7ec; }
.danger { color: #d33b2e; background: #ffece9; }
.muted { color: #777; background: #f3f3f3; }
.history-head { justify-content: space-between; }
.history-toggle { color: #888; font-size: 24rpx; }
.history-row { padding-top: 18rpx; font-size: 24rpx; line-height: 34rpx; color: #777; }
.verify-qty { color: #ff3b22; }
.empty-history { padding-top: 24rpx; text-align: center; color: #999; font-size: 24rpx; }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 10; min-height: 112rpx; padding: 18rpx 24rpx; gap: 14rpx; background: #fff; box-shadow: 0 -2rpx 14rpx rgba(0, 0, 0, 0.08); box-sizing: border-box; }
.action { flex: 1; min-width: 0; padding: 19rpx 10rpx; text-align: center; border-radius: 6rpx; font-size: 25rpx; white-space: nowrap; }
.primary { color: #fff; background: #16a34a; }
.disabled { opacity: 0.55; }
</style>
