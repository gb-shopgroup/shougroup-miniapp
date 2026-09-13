<template>
<view class="container">
	<view class="hero" :style="`min-height: calc(${miniNavMetrics.navBarHeight}px + 158rpx);`">
		<view class="nav" :style="miniNavBarStyle()">
			<image class="back" :style="miniNavTitleStyle()" src="/static/image/leader_group_back_circle.png" mode="aspectFit" @click="goBack"></image>
			<text></text>
			<text class="nav-placeholder"></text>
		</view>
	</view>

	<view class="leader-card">
		<image class="avatar" :src="leaderAvatarSrc" mode="aspectFill"></image>
		<view class="leader-actions">
			<button class="leader-action-button" open-type="contact">
				<image class="leader-action-icon" src="/static/image/leader_group_service.png" mode="aspectFit"></image>
				<text>客服</text>
			</button>
			<view class="leader-action-button" @click="shareToMomentsPoster">
				<image class="leader-action-icon" src="/static/image/leader_group_moments.png" mode="aspectFit"></image>
				<text>朋友圈</text>
			</view>
			<button class="leader-action-button" open-type="share" :data-share="shareData">
				<image class="leader-action-icon" src="/static/image/leader_group_top_share.png" mode="aspectFit"></image>
				<text>分享</text>
			</button>
		</view>
		<view class="leader-main">
			<text class="leader-name">{{ leaderDisplayName }}</text>
			<text class="leader-meta">{{ leaderMetaText }}</text>
		</view>
	</view>

	<scroll-view class="content" :style="detailContentStyle" scroll-y>
		<view class="title-section">
			<view class="title-row">
				<text class="group-title">{{ group.name }}</text>
				<text class="self-badge">{{ pickupText }}</text>
			</view>
			<text class="time">{{ group.timeText }}</text>
		</view>

		<view class="intro-section" v-if="group.info">
			<text class="section-title">我是活动内容</text>
			<view class="intro">
				<rich-text :nodes="groupIntroNodes"></rich-text>
			</view>
		</view>

		<view class="goods-list">
			<view class="goods" v-for="goods in group.goods" :key="goods.gid">
				<view class="goods-img-wrap">
					<image class="goods-img" :src="goods.img" mode="aspectFill"></image>
					<text class="goods-stock">库存{{ goods.stock || '不限' }}</text>
				</view>
				<view class="goods-info">
					<text class="goods-name">{{ goods.gname }}</text>
					<text class="goods-price">¥ {{ goods.price }}</text>
				</view>
				<view class="goods-share" @click.stop="openShareSheet">
					<image class="goods-share-icon" src="/static/image/leader_group_share.png" mode="aspectFit"></image>
				</view>
			</view>
		</view>

		<view class="join-records">
			<text class="records-title">跟团记录</text>
			<text class="empty-record">暂无更多记录</text>
		</view>
	</scroll-view>

	<view class="bottom-bar">
		<view class="bottom-action" @click="goOrders">
			<image class="bottom-action-icon" src="/static/image/leader_group_order.png" mode="aspectFit"></image>
			<text>查看订单</text>
		</view>
		<view class="bottom-action" @click="openManageSheet">
			<image class="bottom-action-icon" src="/static/image/leader_group_manage.png" mode="aspectFit"></image>
			<text>团购管理</text>
		</view>
		<view class="bottom-stat">
			<text class="bottom-amount">¥{{ incomeText }}</text>
			<text class="bottom-visits">{{ visitorText }}</text>
		</view>
		<button class="bottom-share" open-type="share" :data-share="shareData">
			<image class="bottom-share-icon" src="/static/image/leader_group_wechat.png" mode="aspectFit"></image>
			<text>分享</text>
		</button>
	</view>

	<view v-if="manageSheetVisible" class="manage-mask" @click="closeManageSheet">
		<view class="manage-sheet" @click.stop>
			<view
				v-for="action in manageActions"
				:key="action.key"
				class="manage-action"
				@click="handleManageAction(action.key)"
			>{{ action.text }}</view>
			<view class="manage-action cancel" @click="closeManageSheet">取消</view>
		</view>
	</view>

	<PosterImgDialog ref="imgDialogRef"></PosterImgDialog>
	<PosterDialog ref="posterDialogRef" @poster="shareLeaderGroupPosterImg"></PosterDialog>
</view>
</template>

<script>
import PosterImgDialog from './img.vue'
import PosterDialog from './poster.vue'
import parseHtml from '@/utils/html-parser.js'
import {
	closeLeaderGroupInfo,
	getLeaderGroupInfo,
	makeLeaderGroupPoster,
	shareLeaderGroupPoster as requestShareLeaderGroupPoster
} from '@/api/leader.js'
import { getLeaderGroupManageActions, normalizeLeaderGroup, normalizeRichTextImages } from '@/utils/leaderGroup.js'

export default {
	components: { PosterImgDialog, PosterDialog },
	data() {
		return {
			groupId: 0,
			group: normalizeLeaderGroup({}),
			manageSheetVisible: false,
			isRequesting: false
		}
	},
	computed: {
		detailContentStyle(){
			return `height: calc(100vh - ${this.miniNavMetrics.navBarHeight}px - 320rpx);`
		},
		groupIntroNodes(){
			return this.group.info ? parseHtml(normalizeRichTextImages(this.group.info)) : []
		},
		pickupText(){
			return Number(this.group.pickup || 1) === 1 ? '自提' : '邮递'
		},
		incomeText(){
			const amount = Number(this.group.price || 0) * Number(this.group.order || 0)
			return amount.toFixed(2)
		},
		visitorText(){
			return `${Number(this.group.order || 0)}人来过`
		},
		leaderDisplayName(){
			return this.group.shopName || uni.getStorageSync('leader_shop') || this.group.name || '团购详情'
		},
		leaderAvatarSrc(){
			return this.group.leaderAvatar || uni.getStorageSync('leader_avatar') || uni.getStorageSync('avatar') || '/static/image/head.png'
		},
		leaderMetaText(){
			const memberCount = Number(this.group.memberCount || 0)
			const joinCount = Number(this.group.joinCount || this.group.order || 0)
			const followCount = Number(this.group.followCount || 0)
			return `成员${memberCount} | 跟团人次${joinCount} | ${followCount}人关注你`
		},
		shareData(){
			return {
				title: this.group.name,
				imageUrl: this.group.img,
				path: `/pages/group/index?id=${this.group.id}&lid=${this.group.lid}`
			}
		},
		timelineShareData(){
			return {
				title: this.group.name || this.leaderDisplayName,
				query: `id=${this.group.id}&lid=${this.group.lid}`,
				imageUrl: this.group.img || this.leaderAvatarSrc
			}
		},
		manageActions(){
			return getLeaderGroupManageActions(this.group)
		}
	},
	onLoad(options) {
		this.groupId = Number(options.id || 0)
		this.initDetail()
	},
	onShareAppMessage(res) {
		if (res.from === 'button') return res.target.dataset.share
		return this.shareData
	},
	onShareTimeline() {
		return this.timelineShareData
	},
	methods: {
		async initDetail(){
			try {
				const res = await getLeaderGroupInfo({ groupId: this.groupId })
				this.group = normalizeLeaderGroup(res.data || {})
			} catch (err) {
				console.log('初始化团详情失败：', err)
			}
		},
		goBack(){
			uni.navigateBack({ delta: 1 })
		},
		goOrders(){
			uni.navigateTo({ url: '/pagesA/order/index' })
		},
		openManageSheet(){
			this.manageSheetVisible = true
		},
		closeManageSheet(){
			this.manageSheetVisible = false
		},
		handleManageAction(action){
			const handlers = {
				edit: this.editGroup,
				open: this.openGroup,
				close: this.closeGroup,
				copy: this.copyGroup
			}
			if(handlers[action]) handlers[action]()
		},
		editGroup(){
			this.closeManageSheet()
			if(!this.group.id) return
			uni.navigateTo({ url: '/pagesA/group/add?id=' + this.group.id })
		},
		copyGroup(){
			this.closeManageSheet()
			if(!this.group.id) return
			uni.navigateTo({ url: '/pagesA/group/add?copyId=' + this.group.id })
		},
		openGroup(){
			if(Number(this.group.isClose || 0) === 0){
				uni.showToast({ title: '团购已开启', icon: 'none' })
				return
			}
			this.toggleGroupOnlineState({
				title: '开启团购',
				content: '确认重新开启该团购？',
				successTitle: '已开启',
				errorTitle: '开启失败',
				errorLog: '开启团购失败：'
			})
		},
		closeGroup(){
			if(Number(this.group.isClose || 0) === 1){
				uni.showToast({ title: '团购已关闭', icon: 'none' })
				return
			}
			this.toggleGroupOnlineState({
				title: '关闭团购',
				content: '关闭后用户将无法继续跟团，确认关闭？',
				successTitle: '已关闭',
				errorTitle: '关闭失败',
				errorLog: '关闭团购失败：'
			})
		},
		toggleGroupOnlineState({ title, content, successTitle, errorTitle, errorLog }){
			uni.showModal({
				title,
				content,
				success: async res => {
					if(!res.confirm || this.isRequesting) return
					this.isRequesting = true
					try {
						await closeLeaderGroupInfo({ groupId: this.group.id })
						uni.showToast({ title: successTitle, icon: 'success' })
						this.closeManageSheet()
						this.initDetail()
					} catch (err) {
						console.log(errorLog, err)
						uni.showToast({ title: errorTitle, icon: 'none' })
					} finally {
						this.isRequesting = false
					}
				}
			})
		},
		async openShareSheet(){
			uni.showLoading({ title: '加载海报中...', mask: true })
			try {
				const res = await requestShareLeaderGroupPoster({ groupId: this.group.id })
				this.$refs.posterDialogRef.show(this.group, res.data)
			} catch (err) {
				console.log('打开分享失败：', err)
			} finally {
				uni.hideLoading()
			}
		},
		async shareToMomentsPoster(){
			if(!this.group.id) return
			uni.showLoading({ title: '生成海报中...', mask: true })
			try {
				const res = await makeLeaderGroupPoster({ groupId: this.group.id })
				this.$refs.imgDialogRef.show(res.data)
			} catch (err) {
				console.log('生成朋友圈海报失败：', err)
				uni.showToast({ title: '生成海报失败', icon: 'none' })
			} finally {
				uni.hideLoading()
			}
		},
		async shareLeaderGroupPosterImg(item){
			uni.showLoading({ title: '生成海报中...', mask: true })
			try {
				const res = await makeLeaderGroupPoster({ groupId: item.id })
				this.$refs.imgDialogRef.show(res.data)
			} catch (err) {
				console.log('生成团购海报失败：', err)
				uni.showToast({ title: '生成海报失败', icon: 'none' })
			} finally {
				uni.hideLoading()
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	padding-bottom: calc(156rpx + env(safe-area-inset-bottom));
	background: #f5f5f5;
	color: #222;
	box-sizing: border-box;
}

.hero {
	background: #22c55e;
}

.nav {
	position: relative;
	display: grid;
	grid-template-columns: 160rpx minmax(0, 1fr) 160rpx;
	align-items: start;
	padding: 0 28rpx;
	box-sizing: border-box;
	color: #fff;
}

.back {
	position: absolute;
	left: 28rpx;
	width: 62rpx;
	height: 62rpx;
}

.nav-placeholder {
	display: block;
	min-width: 0;
}

.leader-card {
	position: relative;
	z-index: 2;
	display: block;
	margin: -58rpx 16rpx 0;
	min-height: 222rpx;
	padding: 96rpx 34rpx 22rpx;
	border-radius: 20rpx 20rpx 0 0;
	background: #fff;
	box-sizing: border-box;
}

.avatar {
	position: absolute;
	left: 34rpx;
	top: -52rpx;
	width: 118rpx;
	height: 118rpx;
	border: 6rpx solid #fff;
	border-radius: 8rpx;
	background: #eee;
}

.leader-actions {
	position: absolute;
	right: 24rpx;
	top: 18rpx;
	display: flex;
	align-items: flex-start;
	gap: 38rpx;
}

.leader-action-button {
	width: 86rpx;
	min-height: 92rpx;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	background: transparent;
	border: none;
	color: #8a8a8a;
	font-size: 24rpx;
	line-height: 32rpx;
}

.leader-action-button::after {
	border: none;
}

.leader-action-icon {
	width: 54rpx;
	height: 54rpx;
	margin-bottom: 8rpx;
}

.leader-main {
	min-width: 0;
}

.leader-name,
.leader-meta,
.section-title,
.intro,
.goods-name,
.records-title,
.empty-record {
	display: block;
}

.leader-name {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: 34rpx;
	font-weight: 500;
	line-height: 48rpx;
}

.leader-meta {
	margin-top: 12rpx;
	color: #aaa;
	font-size: 25rpx;
	line-height: 34rpx;
}

.quick-action {
	padding: 12rpx 18rpx;
	color: #16a34a;
	font-size: 24rpx;
}

.content {
	box-sizing: border-box;
}

.title-section,
.intro-section,
.goods-list,
.join-records {
	margin-top: 12rpx;
	padding: 24rpx 30rpx;
	background: #fff;
	box-sizing: border-box;
}

.title-row {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.group-title {
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: 30rpx;
	font-weight: 500;
}

.self-badge {
	padding: 2rpx 8rpx;
	border-radius: 3rpx;
	color: #16a34a;
	background: #e7f7ec;
	font-size: 20rpx;
}

.time {
	display: block;
	margin-top: 10rpx;
	color: #ff7a45;
	font-size: 24rpx;
	line-height: 36rpx;
	white-space: pre-line;
}

.section-title {
	margin-bottom: 18rpx;
	font-size: 30rpx;
}

.intro {
	color: #333;
	font-size: 27rpx;
	line-height: 42rpx;
}

.goods {
	display: flex;
	align-items: center;
	padding: 22rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
}

.goods:last-child {
	border-bottom: none;
}

.goods-img-wrap {
	position: relative;
	width: 176rpx;
	height: 176rpx;
	border-radius: 4rpx;
	overflow: hidden;
	background: #eee;
}

.goods-img {
	width: 100%;
	height: 100%;
}

.goods-stock {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 34rpx;
	line-height: 34rpx;
	text-align: center;
	color: #fff;
	background: rgba(0, 0, 0, 0.55);
	font-size: 22rpx;
}

.goods-info {
	flex: 1;
	min-width: 0;
	margin-left: 18rpx;
}

.goods-name {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: 30rpx;
}

.goods-price {
	display: block;
	margin-top: 54rpx;
	color: #f04438;
	font-size: 30rpx;
}

.goods-share {
	width: 58rpx;
	height: 58rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.goods-share-icon {
	width: 42rpx;
	height: 40rpx;
}

.records-title {
	margin-bottom: 22rpx;
	color: #555;
	font-size: 30rpx;
	font-weight: 600;
}

.empty-record {
	padding: 30rpx 0;
	text-align: center;
	color: #999;
	font-size: 25rpx;
}

.bottom-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: calc(156rpx + env(safe-area-inset-bottom));
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	padding: 24rpx 28rpx calc(18rpx + env(safe-area-inset-bottom));
	background: #fff;
	border-top: 1rpx solid #eee;
	box-sizing: border-box;
}

.bottom-action {
	width: 122rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	text-align: center;
	color: #555;
	font-size: 24rpx;
	line-height: 34rpx;
}

.bottom-action-icon {
	width: 44rpx;
	height: 44rpx;
	margin-bottom: 8rpx;
}

.bottom-stat {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding-top: 4rpx;
	text-align: center;
}

.bottom-amount {
	color: #22c55e;
	font-size: 30rpx;
	line-height: 36rpx;
}

.bottom-visits {
	margin-top: 4rpx;
	color: #666;
	font-size: 24rpx;
	line-height: 32rpx;
}

.bottom-share {
	width: 158rpx;
	height: 58rpx;
	padding: 0;
	border-radius: 4rpx;
	border: 1rpx solid #22c55e;
	background: #fff;
	color: #22c55e;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 4rpx;
	font-size: 26rpx;
	line-height: 58rpx;
}

.bottom-share-icon {
	width: 40rpx;
	height: 34rpx;
	margin-right: 8rpx;
}

.bottom-share::after {
	border: none;
}

.manage-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 80;
	display: flex;
	align-items: flex-end;
	background: rgba(0, 0, 0, 0.38);
}

.manage-sheet {
	width: 100%;
	padding-bottom: env(safe-area-inset-bottom);
	border-radius: 12rpx 12rpx 0 0;
	background: #fff;
	overflow: hidden;
}

.manage-action {
	height: 88rpx;
	line-height: 88rpx;
	text-align: center;
	color: #22c55e;
	font-size: 28rpx;
	border-bottom: 1rpx solid #f1f1f1;
}

.manage-action.danger {
	color: #22c55e;
}

.manage-action.cancel {
	border-bottom: none;
}
</style>
