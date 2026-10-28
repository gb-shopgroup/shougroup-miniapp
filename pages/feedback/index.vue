<template>
	<view class="feedback-page" :style="miniNavPageStyle()">
		<view class="nav-title" :style="miniNavBarStyle()">
			<image class="nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
			<text :style="miniNavTitleStyle()">建议反馈</text>
		</view>

		<!-- 我的建议反馈列表 -->
		<scroll-view scroll-y class="feedback-scroll">
			<view class="feedback-list" v-if="adviseList.length > 0">
				<view class="feedback-item" v-for="item in adviseList" :key="item.id">
					<view class="item-head">
						<text class="item-title">{{ item.title }}</text>
						<text v-if="item.statusName" class="item-status" :class="{ replied: item.statusName.indexOf('回复') > -1 }">{{ item.statusName }}</text>
					</view>
					<text class="item-content">{{ item.content }}</text>
					<view class="item-foot">
						<text class="item-time">{{ item.addTime }}</text>
						<text class="item-reply-btn" @click="openReplyDialog(item)">查看回复</text>
					</view>
				</view>
				<view v-if="!hasMore && adviseList.length > 0" class="list-end">没有更多了</view>
			</view>
			<view v-else-if="!loading" class="empty-wrap">
				<text class="empty-text">暂无建议反馈</text>
			</view>
		</scroll-view>

		<!-- 底部：增加建议反馈 -->
		<view class="footer-bar">
			<button class="add-btn" :disabled="loading" @click="openAddDialog">增加建议反馈</button>
		</view>

		<!-- 查看回复弹窗：每条反馈的回复单独弹出 -->
		<view v-if="replyDialogVisible" class="dialog-mask" @click="closeReplyDialog">
			<view class="dialog" @click.stop>
				<text class="dialog-title">回复内容</text>
				<view class="dialog-body">
					<view class="reply-row">
						<text class="row-label">标题：</text>
						<text class="row-value">{{ replyItem.title || '—' }}</text>
					</view>
					<view class="reply-row">
						<text class="row-label">内容：</text>
						<text class="row-value">{{ replyItem.content || '—' }}</text>
					</view>
					<view class="reply-block">
						<text class="row-label">官方回复：</text>
						<text class="row-value reply-text">{{ replyLoading ? '加载中...' : (replyItem.reply || '暂无回复') }}</text>
					</view>
				</view>
				<view class="dialog-actions">
					<view class="dialog-btn primary" @click="closeReplyDialog">我知道了</view>
				</view>
			</view>
		</view>

		<!-- 新增建议反馈弹窗：标题 + 内容 -->
		<view v-if="addDialogVisible" class="dialog-mask" @click="closeAddDialog">
			<view class="dialog" @click.stop>
				<text class="dialog-title">建议反馈</text>
				<view class="dialog-body">
					<view class="add-field">
						<text class="row-label">标题：</text>
						<input class="add-input" type="text" v-model="addForm.title" placeholder="请输入反馈标题" maxlength="50" placeholder-class="add-placeholder" />
					</view>
					<view class="add-field add-field-textarea">
						<text class="row-label">内容：</text>
						<textarea class="add-textarea" v-model="addForm.content" placeholder="请描述您的问题或建议" maxlength="500" placeholder-class="add-placeholder" />
					</view>
				</view>
				<view class="dialog-actions">
					<view class="dialog-btn" @click="closeAddDialog">取消</view>
					<view class="dialog-btn primary" :class="{ disabled: submitting }" @click="submitAdvise">提交</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getMemberAdviseList, getMemberAdviseInfo, addMemberAdvise } from '@/api/group.js'
import { requireMemberLogin, isMemberLoggedIn } from '@/utils/auth.js'

export default {
	data() {
		return {
			adviseList: [],
			page: 1,
			pageSize: 10,
			hasMore: false,
			loading: false,
			loadedOnce: false,
			// 查看回复弹窗
			replyDialogVisible: false,
			replyLoading: false,
			replyItem: {},
			// 新增建议反馈弹窗
			addDialogVisible: false,
			addForm: { title: '', content: '' },
			submitting: false
		}
	},
	onLoad() {
		// 反馈属于会员数据：未注册/未登录先引导登录，成功后回到本页
		if (!requireMemberLogin({ tip: false, redirect: '/pages/feedback/index' })) return
		this.refreshList()
	},
	onShow() {
		// 兜底：token 失效被请求层清掉后回到本页时重新引导
		if (!isMemberLoggedIn()) {
			if (!this._lastLoginGuideAt || Date.now() - this._lastLoginGuideAt > 1500) {
				this._lastLoginGuideAt = Date.now()
				requireMemberLogin({ tip: false, redirect: '/pages/feedback/index' })
			}
			return
		}
		if (!this.loadedOnce) this.refreshList()
	},
	onReachBottom() {
		if (this.loading || !this.hasMore) return
		this.page += 1
		this.loadData()
	},
	methods: {
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) {
				uni.navigateBack()
			} else {
				uni.switchTab({ url: '/pages/mine/index' })
			}
		},
		// 兼容 data 为 Map{ list/records/rows + total/count } 或直接数组两种返回
		extractPage(res) {
			const data = res && res.data
			if (Array.isArray(data)) return { list: data, total: data.length }
			const list = (data && (data.list || data.records || data.rows || data.data)) || []
			const total = (data && (data.total !== undefined ? data.total : (data.count !== undefined ? data.count : list.length))) || 0
			return { list: Array.isArray(list) ? list : [], total: Number(total) || 0 }
		},
		normalizeAdvise(item = {}) {
			return {
				id: item.id || 0,
				title: item.title || '未命名反馈',
				content: item.content || '',
				statusName: item.statusName || '',
				addTime: item.addTime || item.updateTime || ''
			}
		},
		async refreshList() {
			this.page = 1
			this.hasMore = false
			await this.loadData()
		},
		async loadData() {
			if (this.loading) return
			this.loading = true
			try {
				const res = await getMemberAdviseList({ page: this.page, pageSize: this.pageSize })
				const { list, total } = this.extractPage(res)
				const normalized = list.map(this.normalizeAdvise)
				this.adviseList = this.page === 1 ? normalized : this.adviseList.concat(normalized)
				this.hasMore = total > 0 ? this.adviseList.length < total : normalized.length >= this.pageSize
				this.loadedOnce = true
			} catch (err) {
				console.log('加载建议反馈失败：', err)
				uni.showToast({ title: '建议反馈加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		// 查看回复：回复不在列表展示，点击后单独弹出（按详情接口获取最新回复）
		async openReplyDialog(item) {
			this.replyItem = { ...item, reply: '' }
			this.replyDialogVisible = true
			this.replyLoading = true
			try {
				const res = await getMemberAdviseInfo(item.id)
				const info = (res && res.data) || {}
				this.replyItem = {
					...this.replyItem,
					reply: info.reply || '',
					statusName: info.statusName || this.replyItem.statusName
				}
			} catch (err) {
				console.log('获取反馈回复失败：', err)
			} finally {
				this.replyLoading = false
			}
		},
		closeReplyDialog() {
			this.replyDialogVisible = false
			this.replyItem = {}
		},
		openAddDialog() {
			if (!isMemberLoggedIn()) {
				requireMemberLogin({ tip: '请先登录后再反馈', redirect: '/pages/feedback/index' })
				return
			}
			this.addForm = { title: '', content: '' }
			this.addDialogVisible = true
		},
		closeAddDialog() {
			this.addDialogVisible = false
		},
		async submitAdvise() {
			const title = this.addForm.title.trim()
			const content = this.addForm.content.trim()
			if (!title) {
				uni.showToast({ title: '请输入反馈标题', icon: 'none' })
				return
			}
			if (!content) {
				uni.showToast({ title: '请输入反馈内容', icon: 'none' })
				return
			}
			if (this.submitting) return
			this.submitting = true
			try {
				await addMemberAdvise({ title, content })
				this.addDialogVisible = false
				uni.showToast({ title: '提交成功', icon: 'success' })
				this.refreshList()
			} catch (err) {
				console.log('提交建议反馈失败：', err)
			} finally {
				this.submitting = false
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.feedback-page {
	min-height: 100vh;
	background: #f6f6f6;
	display: flex;
	flex-direction: column;
}

.nav-title {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #fff;

	.nav-back {
		position: absolute;
		left: 24rpx;
		width: 40rpx;
		height: 40rpx;
	}
}

.feedback-scroll {
	flex: 1;
	min-height: 0;
	box-sizing: border-box;
	padding: 20rpx 24rpx 180rpx;
}

.feedback-list {
	.feedback-item {
		background: #fff;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 20rpx;

		.item-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 12rpx;

			.item-title {
				flex: 1;
				min-width: 0;
				font-size: 30rpx;
				font-weight: 600;
				color: #333;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.item-status {
				flex-shrink: 0;
				margin-left: 16rpx;
				font-size: 22rpx;
				color: #999;
				background: #f5f5f5;
				border-radius: 999rpx;
				padding: 4rpx 16rpx;

				&.replied {
					color: #07c160;
					background: rgba(7, 193, 96, 0.08);
				}
			}
		}

		.item-content {
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
			overflow: hidden;
			font-size: 26rpx;
			color: #666;
			line-height: 1.6;
		}

		.item-foot {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-top: 16rpx;

			.item-time {
				font-size: 22rpx;
				color: #999;
			}

			.item-reply-btn {
				font-size: 24rpx;
				color: #07c160;
				padding: 8rpx 20rpx;
				border: 1rpx solid #07c160;
				border-radius: 999rpx;
			}
		}
	}
}

.list-end {
	text-align: center;
	font-size: 24rpx;
	color: #bbb;
	padding: 20rpx 0;
}

.empty-wrap {
	display: flex;
	align-items: center;
	justify-content: center;
	padding-top: 200rpx;

	.empty-text {
		font-size: 28rpx;
		color: #999;
	}
}

.footer-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 90;
	box-sizing: border-box;
	padding: 20rpx 40rpx calc(env(safe-area-inset-bottom) + 20rpx);
	background: #f6f6f6;

	.add-btn {
		width: 100%;
		height: 88rpx;
		line-height: 88rpx;
		text-align: center;
		font-size: 30rpx;
		color: #fff;
		background: #07c160;
		border-radius: 999rpx;

		&[disabled] {
			opacity: 0.6;
			color: #fff;
			background: #07c160;
		}
	}
}

.dialog-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 60rpx;
}

.dialog {
	width: 100%;
	max-width: 620rpx;
	background: #fff;
	border-radius: 24rpx;
	padding: 36rpx 32rpx 28rpx;
	box-sizing: border-box;

	.dialog-title {
		display: block;
		text-align: center;
		font-size: 32rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 28rpx;
	}

	.dialog-body {
		max-height: 50vh;
		overflow-y: auto;
	}

	.reply-row,
	.reply-block {
		display: flex;
		margin-bottom: 20rpx;

		.row-label {
			flex-shrink: 0;
			font-size: 28rpx;
			color: #999;
			line-height: 1.6;
		}

		.row-value {
			flex: 1;
			min-width: 0;
			font-size: 28rpx;
			color: #333;
			line-height: 1.6;
			word-break: break-all;
		}
	}

	.reply-block {
		.reply-text {
			color: #07c160;
		}
	}

	.add-field {
		display: flex;
		align-items: center;
		background: #f6f6f6;
		border-radius: 12rpx;
		padding: 20rpx 24rpx;
		margin-bottom: 20rpx;

		.add-input {
			flex: 1;
			min-width: 0;
			font-size: 28rpx;
			color: #333;
		}

		&.add-field-textarea {
			align-items: flex-start;

			.add-textarea {
				flex: 1;
				min-width: 0;
				height: 200rpx;
				font-size: 28rpx;
				color: #333;
				line-height: 1.6;
			}
		}
	}

	.dialog-actions {
		display: flex;
		margin-top: 12rpx;

		.dialog-btn {
			flex: 1;
			height: 80rpx;
			line-height: 80rpx;
			text-align: center;
			font-size: 28rpx;
			color: #666;
			background: #f6f6f6;
			border-radius: 999rpx;
			margin-right: 20rpx;

			&:last-child {
				margin-right: 0;
			}

			&.primary {
				color: #fff;
				background: #07c160;

				&.disabled {
					opacity: 0.6;
				}
			}
		}
	}
}

.add-placeholder {
	color: #bbb;
}
</style>
