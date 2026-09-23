<template>
	<view class="container" :style="miniNavPageStyle()">
		<view class="leader-nav" :style="miniNavBarStyle()">
			<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
			<text class="title" :style="miniNavTitleStyle()">商品库</text>
			<text class="nav-placeholder"></text>
		</view>

		<view class="product-library">
			<view class="product-row" v-for="item in productList" :key="item.id">
				<view class="image-wrap">
					<image v-if="item.img" :src="item.img" mode="aspectFill"></image>
					<view v-else class="image-placeholder">商品图</view>
					<text>{{ getImageStockText(item) }}</text>
				</view>
				<view class="product-info">
					<view class="product-name-row">
						<text class="product-name">{{ item.name || '商品名称' }}</text>
						<text v-if="goodsStatusText(item)" class="product-status">{{ goodsStatusText(item) }}</text>
					</view>
					<view class="product-meta">{{ getSpecText(item) }}</view>
					<view class="product-meta">{{ getStockText(item) }}</view>
					<view class="product-actions">
						<button size="mini" @click="editProduct(item)">编辑</button>
						<button v-if="isGoodsClosed(item)" size="mini" @click="restoreProduct(item)">恢复</button>
						<button v-else size="mini" @click="deleteProduct(item)">删除</button>
					</view>
				</view>
			</view>

			<view class="empty-state" v-if="productList.length === 0">暂无商品</view>
			<view class="load-state" v-else>
				<text v-if="goodsLoading">加载中...</text>
				<text v-else-if="!hasMoreGoods">没有更多商品了</text>
			</view>
		</view>

		<view class="bottom-action">
			<button @click="goAddProduct">添加商品</button>
		</view>
	</view>
</template>

<script>
import { closeLeaderGoodsInfo, getLeaderGoodsCount, getLeaderGoodsList } from "@/api/leader.js"
import { buildPagedGoodsState, formatSpecSummary, formatStockSummary, getLeaderGoodsStatusText, isLeaderGoodsClosed, normalizeLeaderGoods } from "@/utils/leaderProduct.js"

export default {
	data() {
		return {
			cat: 0,
			page: 1,
			pageSize: 10,
			pageTotal: 0,
			productList: [],
			goodsTotal: 0,
			hasMoreGoods: false,
			goodsLoading: false
		}
	},
	onShow() {
		this.refreshGoodsList()
	},
	onReachBottom() {
		this.loadMoreGoods()
	},
	methods: {
		refreshGoodsList() {
			this.page = 1
			this.productList = []
			this.initGoodsList()
		},
		// 查询所有商品
		async initGoodsList() {
			if(this.goodsLoading) return
			this.goodsLoading = true
			try {
				const params = { cat: this.cat, page: this.page, pageSize: this.pageSize }
				const res = await getLeaderGoodsList(params)
				const list = Array.isArray(res.data) ? res.data : []
				const normalizedList = list.map(item => normalizeLeaderGoods(item))
				const countRes = await getLeaderGoodsCount({ cat: this.cat })
				this.goodsTotal = Number(countRes.data || 0)
				const pageState = buildPagedGoodsState({
					currentList: this.productList,
					incomingList: normalizedList,
					page: this.page,
					pageSize: this.pageSize,
					total: this.goodsTotal
				})
				this.productList = pageState.list
				this.pageTotal = pageState.pageTotal
				this.hasMoreGoods = pageState.hasMore
			} catch (err) {
				if(this.page <= 1) this.productList = []
				console.log('查询所有商品列表失败：', err)
			} finally {
				this.goodsLoading = false
			}
		},
		loadMoreGoods(){
			if(this.goodsLoading || !this.hasMoreGoods) return
			this.page += 1
			this.initGoodsList()
		},
		getSpecText(item) {
			return formatSpecSummary(item.specs)
		},
		getStockText(item) {
			return formatStockSummary(item)
		},
		getImageStockText(item) {
			return this.getStockText(item).replace('库存：', '库存')
		},
		isGoodsClosed(item = {}) {
			return isLeaderGoodsClosed(item)
		},
		// 已下线的商品在名称后标「已下线」
		goodsStatusText(item = {}) {
			return getLeaderGoodsStatusText(item)
		},
		goBack() {
			uni.navigateBack({
				delta: 1,
				fail: () => {
					uni.redirectTo({ url: '/pagesA/dashboard/index' })
				}
			})
		},
		goAddProduct() {
			const url = '/pagesA/goods/add'
			uni.navigateTo({
				url,
				fail: () => {
					uni.redirectTo({ url })
				}
			})
		},
		editProduct(item) {
			const url = '/pagesA/goods/add?id=' + item.id
			uni.navigateTo({
				url,
				fail: () => {
					uni.redirectTo({ url })
				}
			})
		},
		// 删除 = 下线（接口是「启用/关闭」的切换语义）
		deleteProduct(item) {
			this.toggleGoodsClose(item, {
				title: '确认删除',
				content: '确定删除该商品吗？删除后商品将标记为「已下线」，不再用于开团。',
				successText: '删除成功',
				failText: '删除失败'
			})
		},
		// 已下线的商品要能恢复，否则再点「删除」会把它切换回上线（接口是切换语义）
		restoreProduct(item) {
			this.toggleGoodsClose(item, {
				title: '确认恢复',
				content: '确定恢复该商品吗？恢复后可在开团时重新选择。',
				successText: '已恢复上线',
				failText: '恢复失败'
			})
		},
		toggleGoodsClose(item, copy = {}) {
			uni.showModal({
				title: copy.title || '确认操作',
				content: copy.content || '',
				success: async res => {
					if (!res.confirm) return
					try {
						await closeLeaderGoodsInfo({ id: item.id })
						uni.showToast({ title: copy.successText || '操作成功', icon: 'success' })
						this.refreshGoodsList()
					} catch (err) {
						const title = (err && (err.msg || err.message)) || err || copy.failText || '操作失败'
						uni.showToast({ title: String(title), icon: 'none' })
						console.log('商品上下线操作失败：', err)
					}
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #f5f5f5;
	padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
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
	padding: 0 28rpx;
	background: #fff;
	box-sizing: border-box;
}

.leader-nav .title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	font-size: 34rpx;
	color: #111;
	font-weight: 500;
	text-align: center;
}

.leader-nav .back {
	position: absolute;
	left: 28rpx;
	width: 160rpx;
	display: flex;
	align-items: center;
	font-size: 48rpx;
	color: #666;
}

.leader-nav .nav-placeholder {
	display: block;
	min-width: 0;
}

.product-library {
	margin: 12rpx 18rpx 0;
	min-height: 900rpx;
	background: #fff;
	padding: 42rpx 40rpx;
	box-sizing: border-box;
}

.product-row {
	display: grid;
	grid-template-columns: 180rpx minmax(0, 1fr);
	column-gap: 24rpx;
	margin-bottom: 34rpx;
}

.product-row:last-child {
	margin-bottom: 0;
}

.image-wrap {
	position: relative;
	width: 180rpx;
	height: 180rpx;
	background: #eee;
	overflow: hidden;
}

.image-wrap image,
.image-placeholder {
	width: 180rpx;
	height: 180rpx;
}

.image-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	color: #999;
	font-size: 24rpx;
	background: #f0f0f0;
}

.image-wrap text {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 34rpx;
	line-height: 34rpx;
	text-align: center;
	color: #fff;
	font-size: 20rpx;
	background: rgba(0, 0, 0, 0.45);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.product-info {
	min-width: 0;
}

.product-name-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

/* 已下线标识：与团购列表的 muted 状态胶囊同一套配色 */
.product-status {
	flex-shrink: 0;
	padding: 4rpx 14rpx;
	border-radius: 20rpx;
	color: #999;
	background: #f4f4f4;
	font-size: 22rpx;
	line-height: 30rpx;
}

.product-name {
	font-size: 30rpx;
	line-height: 40rpx;
	color: #111;
	font-weight: 400;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.product-meta {
	margin-top: 8rpx;
	font-size: 26rpx;
	line-height: 34rpx;
	color: #333;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.product-actions {
	display: flex;
	justify-content: flex-end;
	gap: 36rpx;
	margin-top: 12rpx;
}

.product-actions button {
	width: 88rpx;
	height: 44rpx;
	line-height: 40rpx;
	padding: 0;
	margin: 0;
	font-size: 22rpx;
	color: #666;
	background: #fff;
	border: 1rpx solid #d9d9d9;
	border-radius: 4rpx;
	box-sizing: border-box;
}

.product-actions button::after,
.bottom-action button::after {
	border: 0;
}

.empty-state {
	padding-top: 260rpx;
	text-align: center;
	font-size: 28rpx;
	color: #999;
}

.load-state {
	min-height: 52rpx;
	padding: 8rpx 0 0;
	text-align: center;
	font-size: 24rpx;
	line-height: 34rpx;
	color: #999;
	box-sizing: border-box;
}

.bottom-action {
	position: fixed;
	left: 24rpx;
	right: 24rpx;
	bottom: calc(28rpx + env(safe-area-inset-bottom));
}

.bottom-action button {
	height: 86rpx;
	line-height: 86rpx;
	background: #26c463;
	color: #fff;
	font-size: 30rpx;
	border-radius: 8rpx;
}
</style>
