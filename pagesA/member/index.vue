<template>
	<view class="container" :style="miniNavPageStyle()">
		<view class="leader-nav" :style="miniNavBarStyle()">
			<text class="back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
			<text class="title" :style="miniNavTitleStyle()">我的团员</text>
			<text class="nav-space"></text>
		</view>

		<view class="search-wrap">
			<input v-model="keyword" class="search-input" placeholder="搜索手机号/昵称" confirm-type="search" @confirm="searchMembers" />
			<view class="search-btn" @click="searchMembers">搜索</view>
		</view>

		<view class="member-list">
			<view v-for="member in memberList" :key="member.memberId" class="member-row" @click="openDetail(member)">
				<image class="avatar" :src="member.avatar || '/static/image/head.png'" mode="aspectFill"></image>
				<view class="member-main">
					<view class="name-row">
						<text class="name">{{ member.nickname || '团员' }}</text>
						<text class="mobile">{{ member.mobile }}</text>
					</view>
					<view v-if="member.lastActionDesc" class="last-action">
						<text v-if="member.lastTimeDesc">{{ member.lastTimeDesc }}</text>
						<text>{{ member.lastActionDesc }}</text>
					</view>
					<view class="stats-row">
						<text>消费 ¥{{ member.consumeAmount }}</text>
						<text>跟团 {{ member.orderCount }}</text>
						<text>查看 {{ member.viewCount }}</text>
					</view>
				</view>
			</view>

			<view v-if="!loading && memberList.length === 0" class="empty">暂无团员</view>
			<view v-if="loading" class="empty">加载中...</view>
			<view v-else-if="memberList.length" class="more">{{ hasMore ? '上拉加载更多' : '没有更多团员了' }}</view>
		</view>
	</view>
</template>

<script>
import { getLeaderMemberList } from "@/api/leader.js"
import { buildLeaderMemberListRequest, normalizeLeaderMember } from "@/utils/leaderMember.js"

export default {
	data() {
		return {
			keyword: '',
			page: 1,
			pageSize: 10,
			memberList: [],
			hasMore: false,
			loading: false
		}
	},
	onLoad() {
		this.loadMembers(true)
	},
	onPullDownRefresh() {
		this.loadMembers(true, () => uni.stopPullDownRefresh())
	},
	onReachBottom() {
		if (this.hasMore && !this.loading) this.loadMembers(false)
	},
	methods: {
		goBack() {
			uni.navigateBack({
				delta: 1,
				fail: () => uni.redirectTo({ url: '/pagesA/dashboard/index' })
			})
		},
		async loadMembers(reset = false, done) {
			if (this.loading) return
			if (reset) {
				this.page = 1
				this.hasMore = false
			}
			this.loading = true
			try {
				const request = buildLeaderMemberListRequest({
					keyword: this.keyword.trim(),
					page: this.page,
					pageSize: this.pageSize
				})
				const res = await getLeaderMemberList(request)
				const list = Array.isArray(res.data) ? res.data.map(item => normalizeLeaderMember(item)) : []
				this.memberList = reset ? list : this.memberList.concat(list)
				this.hasMore = list.length >= this.pageSize
				if (this.hasMore) this.page += 1
			} catch (err) {
				uni.showToast({ title: err.msg || err || '获取团员失败', icon: 'none' })
				console.log('获取团员列表失败：', err)
			} finally {
				this.loading = false
				if (done) done()
			}
		},
		searchMembers() {
			this.loadMembers(true)
		},
		openDetail(member) {
			if (!member.memberId) return
			uni.navigateTo({
				url: `/pagesA/member/detail?memberId=${member.memberId}`
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #f6f6f6;
	box-sizing: border-box;
}

.leader-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 30;
	background: #fff;
	box-sizing: border-box;
}

.back {
	position: absolute;
	left: 28rpx;
	width: 160rpx;
	display: flex;
	align-items: center;
	color: #555;
	font-size: 56rpx;
}

.title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	text-align: center;
	color: #111;
	font-size: 32rpx;
	font-weight: 600;
}

.nav-space {
	display: block;
	min-width: 0;
}

.search-wrap {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 24rpx 24rpx 16rpx;
	background: #fff;
}

.search-input {
	flex: 1;
	height: 72rpx;
	padding: 0 24rpx;
	border-radius: 8rpx;
	background: #f5f5f5;
	color: #111;
	font-size: 26rpx;
	box-sizing: border-box;
}

.search-btn {
	width: 120rpx;
	height: 72rpx;
	border-radius: 8rpx;
	background: #25c463;
	color: #fff;
	font-size: 26rpx;
	line-height: 72rpx;
	text-align: center;
}

.member-list {
	padding: 16rpx 24rpx 40rpx;
}

.member-row {
	display: flex;
	gap: 20rpx;
	padding: 24rpx 0;
	border-bottom: 1rpx solid #eee;
	background: #fff;
}

.avatar {
	flex-shrink: 0;
	width: 88rpx;
	height: 88rpx;
	margin-left: 20rpx;
	border-radius: 8rpx;
	background: #eee;
}

.member-main {
	flex: 1;
	min-width: 0;
	padding-right: 20rpx;
}

.name-row, .last-action, .stats-row {
	display: flex;
	align-items: center;
}

.name-row {
	justify-content: space-between;
	gap: 16rpx;
}

.name {
	flex: 1;
	overflow: hidden;
	color: #111;
	font-size: 30rpx;
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.mobile {
	color: #666;
	font-size: 24rpx;
}

.last-action {
	gap: 12rpx;
	margin-top: 12rpx;
	color: #666;
	font-size: 24rpx;
	line-height: 34rpx;
}

.stats-row {
	justify-content: space-between;
	margin-top: 16rpx;
	color: #333;
	font-size: 24rpx;
}

.empty, .more {
	padding: 64rpx 0;
	color: #999;
	font-size: 26rpx;
	text-align: center;
}

.more {
	padding: 28rpx 0;
}
</style>
