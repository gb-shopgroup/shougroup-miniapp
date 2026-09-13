<template>
<view class="container" :style="miniNavPageStyle()">
	<view class="black-nav" :style="miniNavBarStyle()">
		<image class="nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
		<text class="nav-title" :style="miniNavTitleStyle()">黑名单</text>
	</view>

	<view class="black-panel">
		<view class="filter-bar">
			<view class="search-box">
				<text class="search-icon"></text>
				<input type="number" class="form-input" placeholder="手机号" v-model="mobile" />
			</view>
			<view class="search-btn" @click="searchBlackList()">搜索</view>
		</view>

		<view class="black-list">
			<view class="black-item" v-for="(item, index) in memberList" :key="index">
				<view class="member-info">
					<text class="member-line">昵称：{{ item.nickname || item.nickName || '未填写' }}</text>
					<text class="member-line">电话： {{ item.mobile }}</text>
				</view>
				<view class="delete-btn" @click="confirmBlackMember(item)">删除</view>
			</view>
			<view v-if="!memberList.length" class="empty-text">暂无黑名单用户</view>
		</view>

		<view class="pagination" v-if="pageTotal > 1">
			<view class="page-btn" :class="{ disabled: page === 1 }" @click="prevPage">上一页</view>
			<view class="page-num">{{ page }}/{{ pageTotal }}</view>
			<view class="page-btn" :class="{ disabled: page === pageTotal }" @click="nextPage">下一页</view>
		</view>
	</view>
	<view class="bottom-bar">
		<view class="add-btn" @click="openAddBlackPage">添加黑名单</view>
	</view>
</view>
</template>

<script>
import { 
	getBlackList,
	getBlackCount, 
	removeBlackList } from "@/api/leader.js"
import { isValidMobile, normalizeBlackMember, resolveBlackMemberId } from "@/utils/leaderConfig.js"
export default {
	data() {
		return {
			mobile: '',
			page: 1,
			pageSize: 10,
			pageTotal: 0,
			memberList: [],
			loading: false,
			pageReady: false
		}
	},
	onShow() {
		if (this.pageReady) this.initBlackList()
	},
	onLoad(options) {
		
		// 初始化黑名单列表
		this.initBlackList()
		this.pageReady = true
	},
	methods: {
		goBack(){
			
			uni.navigateBack({
				delta: 1,
				fail: () => uni.redirectTo({ url: '/pagesA/dashboard/index' })
			})
		},
		resolveListData(data) {
			if (Array.isArray(data)) return data
			if (data && Array.isArray(data.list)) return data.list
			if (data && Array.isArray(data.records)) return data.records
			return []
		},
		// 初始化黑名单列表
		async initBlackList(){
			
			this.loading = true
			try {
				const mobile = String(this.mobile || '').trim()
				const params = {page:this.page, pageSize:this.pageSize}
				if (mobile) params.mobile = mobile
				const res = await getBlackList(params)
				this.memberList = this.resolveListData(res.data).map(normalizeBlackMember)
			} catch (err) {
				console.log('初始化黑名单列表失败：', err)
				uni.showToast({ title: '黑名单加载失败', icon: 'none' })
				this.memberList = []
			} finally {
				this.loading = false
			}
			
			try {
				const mobile = String(this.mobile || '').trim()
				const params = {}
				if (mobile) params.mobile = mobile
				const res = await getBlackCount(params)
				const total = Number(res.data || 0)
				this.pageTotal = Math.ceil(total / this.pageSize)
			} catch (err) {
				console.log('初始化黑名单列表数量失败：', err)
			}
		},
		// 上一页
		prevPage(){
			
			this.page--
			if(this.page <= 0) this.page = 1
			this.initBlackList()
		},
		// 下一页
		nextPage(){
			
			this.page++
			if(this.page > this.pageTotal) this.page = this.pageTotal
			this.initBlackList()
		},
		// 搜索黑名单
		searchBlackList() {
			const mobile = String(this.mobile || '').trim()
			if (mobile && !isValidMobile(mobile)) {
				uni.showToast({ title: '请输入正确手机号', icon: 'none' })
				return
			}
			this.page = 1
			this.initBlackList()
		},
		openAddBlackPage() {
			uni.navigateTo({ url: '/pagesA/black/add' })
		},
		// 确认解除黑名单
		confirmBlackMember(item){

			uni.showModal({
				title: '解除黑名单',
				content: '确定要解除黑名单吗？',
				success: (res) => {
					if (res.confirm) {
						this.removeBlackMember(item)
					}
				}
			})
		},
		// 解除黑名单回调事件
		async removeBlackMember(data) {
			
			const memberId = resolveBlackMemberId(data)
			if (!memberId) {
				uni.showToast({ title: '用户信息异常', icon: 'none' })
				return
			}
			try {
				const params = { memberId }
				await removeBlackList(params)
				this.initBlackList()
				uni.showToast({ title: '操作成功', icon: 'success' })
			} catch (err) {
				console.log('解除黑名单失败：', err)
				uni.showToast({ title: err && err.msg ? err.msg : '解除失败', icon: 'none' })
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	padding-bottom: 132rpx;
	background: #fff;
	box-sizing: border-box;
}

.black-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 30;
	background: #fff;
	box-sizing: border-box;
}

.nav-back {
	position: absolute;
	left: 24rpx;
	width: 36rpx;
	height: 36rpx;
}

.nav-title {
	position: absolute;
	left: 160rpx;
	right: 160rpx;
	color: #111;
	font-size: 34rpx;
	font-weight: 500;
	text-align: center;
}

.black-panel {
	margin: 22rpx 10rpx 0;
	min-height: 540rpx;
	padding: 84rpx 62rpx 40rpx;
	background: #fff;
	border-radius: 14rpx;
	box-sizing: border-box;
}

.filter-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 42rpx;
}

.search-box {
	width: 400rpx;
	height: 32rpx;
	display: flex;
	align-items: center;
	padding: 0 18rpx 0 42rpx;
	background: #f5f5f5;
	border-radius: 5rpx;
	box-sizing: border-box;
}

.search-icon {
	position: relative;
	width: 20rpx;
	height: 20rpx;
	margin-left: -28rpx;
	margin-right: 8rpx;
	border: 4rpx solid #c7c7c7;
	border-radius: 50%;
	box-sizing: border-box;
}

.search-icon::after {
	position: absolute;
	content: '';
	right: -9rpx;
	bottom: -7rpx;
	width: 12rpx;
	height: 4rpx;
	background: #c7c7c7;
	border-radius: 2rpx;
	transform: rotate(45deg);
}

.form-input {
	flex: 1;
	min-width: 0;
	height: 32rpx;
	min-height: 32rpx;
	padding: 0;
	font-size: 22rpx;
	line-height: 32rpx;
	color: #333;
}

.search-btn,
.delete-btn {
	width: 110rpx;
	height: 28rpx;
	line-height: 26rpx;
	text-align: center;
	border: 1rpx solid #d8d8d8;
	border-radius: 4rpx;
	box-sizing: border-box;
	color: #777;
	font-size: 20rpx;
	background: #fff;
}

.black-list {
	padding: 0 14rpx;
	box-sizing: border-box;
}

.empty-text {
	height: 120rpx;
	line-height: 120rpx;
	text-align: center;
	color: #999;
	font-size: 24rpx;
}

.black-item {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 42rpx;
}

.black-item:last-child {
	margin-bottom: 0;
}

.member-info {
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.member-line {
	font-size: 24rpx;
	line-height: 34rpx;
	color: #111;
}

.delete-btn {
	margin-top: 0;
}

.pagination {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 10rpx;
	margin-top: 34rpx;
}

.page-btn,
.page-num {
	padding: 10rpx 18rpx;
	border: 1rpx solid #e1e1e1;
	border-radius: 5rpx;
	font-size: 22rpx;
	color: #777;
	background: #fff;
}

.page-btn.disabled {
	opacity: 0.5;
}

.bottom-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 20;
	padding: 18rpx 24rpx 32rpx;
	background: #fff;
	box-sizing: border-box;
}

.add-btn {
	height: 90rpx;
	line-height: 90rpx;
	text-align: center;
	color: #fff;
	font-size: 28rpx;
	background: #25c56b;
	border-radius: 8rpx;
}
</style>
