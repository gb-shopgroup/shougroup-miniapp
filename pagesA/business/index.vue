<template>
<view class="container">
<view class="license-page" :style="miniNavPageStyle()">
	<view class="license-nav" :style="miniNavBarStyle()">
		<image class="nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
		<text class="nav-title" :style="miniNavTitleStyle()">账户信息</text>
	</view>

	<view class="license-panel">
		<view class="license-item" v-for="(item, index) in accountList" :key="item.id || index" @click="showAddModal(item)">
			<view class="license-content">
				<view class="license-title-row">
					<text class="license-name">{{ item.name }}</text>
					<text class="license-status" :class="{ active: isLicenseEnabled(item) }">{{ isLicenseEnabled(item) ? '已启用' : '未启用' }}</text>
				</view>
				<view class="license-meta">法人：{{ item.legal || '--' }}</view>
				<view class="license-meta">收款限额：{{ formatLimit(item.tax) }}</view>
			</view>
			<switch class="license-switch" :checked="isLicenseEnabled(item)" @change.stop="toggleStatus(item, $event)" color="#22c55e" />
		</view>
		<view v-if="!accountList.length" class="empty-text">暂无营业执照信息</view>
	</view>
</view>
<AddBusiness ref="addRef" :accountType="accountType" @childEvent="initBusinessList()" />
</view>
</template>

<script>
import AddBusiness from "./add.vue"
import { getLeaderBusinessList, closeLeaderBusinessInfo } from "@/api/leader.js"
export default {
	data() {
		return {
			accountList: [],
			accountType: [
				{id:1, name:'一般企业'},
				{id:2, name:'小微企业'},
				{id:3, name:'个体户'},
				{id:4, name:'个人'}]
		}
	},
	components: { AddBusiness },
	onLoad() {
		// 初始化营业执照信息列表
		this.initBusinessList()
	},
	methods: {
		goBack() {
			uni.navigateBack({
				delta: 1,
				fail: () => uni.redirectTo({ url: '/pagesA/dashboard/index' })
			})
		},
		isLicenseEnabled(item = {}) {
			return Number(item.isClose || 0) === 0
		},
		formatLimit(value) {
			if (value === undefined || value === null || value === '') return '--'
			const text = String(value).trim()
			return text.includes('万') ? text : `${text}万`
		},
		normalizeBusinessItem(item = {}) {
			return {
				...item,
				id: item.id || item.busId || '',
				type: item.type || item.busType || 4,
				name: item.name || item.busName || item.shopName || '--',
				legal: item.legal || item.legalName || '--',
				no: item.no || item.cidNo || item.licenseNo || '',
				front: item.front || item.cidFront || item.licenseFront || '',
				back: item.back || item.cidBack || item.licenseBack || '',
				tax: item.tax || item.limitAmount || item.taxLimit || '',
				isClose: item.isClose === undefined ? 0 : item.isClose
			}
		},
		getBusinessList(data) {
			if (Array.isArray(data)) return data
			if (Array.isArray(data?.list)) return data.list
			if (Array.isArray(data?.records)) return data.records
			if (Array.isArray(data?.rows)) return data.rows
			return []
		},
		// 初始化营业执照信息列表
		async initBusinessList() {
			
			try {
				const leaderId = uni.getStorageSync('leader_lid') || ''
				if (!leaderId) {
					this.accountList = []
					console.log('[Leader Business] 当前团长还未创建店铺或缺少 leader_lid，跳过营业执照列表请求')
					return
				}
				const res = await getLeaderBusinessList({ id: leaderId, page: 1, pageSize: 100 })
				this.accountList = this.getBusinessList(res.data).map(this.normalizeBusinessItem)
			} catch (err) {
				console.log('初始化营业执照信息列表失败：', err)
			}
		},
		// 打开弹框, 兼容修改
		showAddModal(info) {
			
			this.$refs.addRef.show(info)
		},
		// 关闭状态
		toggleStatus(item, event){
			
			const enabled = !!event?.detail?.value
			this.submitStatus(item, enabled ? 0 : 1)
		},
		// 提交关闭状态申请
		async submitStatus(item, status){
			
			try {
				const busId = item.busId || item.id
				if (!busId) {
					uni.showToast({ title: '账户id不能为空', icon: 'none' })
					this.initBusinessList()
					return
				}
				const params = { busId, status }
				await closeLeaderBusinessInfo(params)
				this.initBusinessList()
			} catch (err) {
				console.log('关闭状态失败：', err)
				this.initBusinessList()
			}	
		},
		// 查看分账列表
		viewAccount(){
			
			const url = "/pagesA/business/account"
			uni.navigateTo({ url: url }).catch(err => { uni.redirectTo({ url: url }) })
		}
	}
}
</script>

<style lang="scss" scoped>
.license-page {
	min-height: 100vh;
	background: #f7f7f7;
	box-sizing: border-box;
	padding: 24rpx 24rpx 80rpx;
}

.license-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 20;
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
	font-size: 34rpx;
	font-weight: 500;
	color: #111;
	text-align: center;
}

.license-panel {
	background: #fff;
	border-radius: 16rpx;
	padding: 44rpx 34rpx 34rpx;
	box-sizing: border-box;
}

.license-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 28rpx;
	padding-bottom: 70rpx;
}

.license-item:last-child {
	padding-bottom: 0;
}

.license-content {
	min-width: 0;
	flex: 1;
}

.license-title-row {
	display: flex;
	align-items: center;
	min-width: 0;
	margin-bottom: 22rpx;
}

.license-name {
	max-width: 320rpx;
	font-size: 30rpx;
	line-height: 40rpx;
	color: #111;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.license-status {
	margin-left: 20rpx;
	padding: 4rpx 10rpx;
	border-radius: 4rpx;
	background: #ffe9e9;
	color: #ff3434;
	font-size: 24rpx;
	line-height: 32rpx;
	white-space: nowrap;
}

.license-status.active {
	background: #e9f9ee;
	color: #19b957;
}

.license-meta {
	font-size: 29rpx;
	line-height: 48rpx;
	color: #111;
}

.license-switch {
	flex-shrink: 0;
	transform: scale(.86);
	transform-origin: right center;
}

.empty-text {
	padding: 80rpx 0;
	text-align: center;
	font-size: 28rpx;
	color: #999;
}

</style>
