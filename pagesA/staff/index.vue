<template>
<view class="container">
	<view class="staff-page" :style="miniNavPageStyle()">
		<view class="nav-title" :style="miniNavBarStyle()">
			<image class="nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
			<text :style="miniNavTitleStyle()">我的员工</text>
		</view>
		<view class="search-row">
			<input class="search-input" type="number" maxlength="11" v-model="mobileKeyword" placeholder="搜索员工手机号" />
			<button class="search-button" @click="searchMember">搜索</button>
			<button class="add-button" @click="openAddStaff">新增</button>
		</view>
		<view class="staff-list">
			<view class="staff-card" v-for="staff in staffList" :key="staff.id">
				<view class="staff-info">
					<view class="staff-main">
						<text class="staff-name">昵称：{{ staff.name || '未填写' }}</text>
						<text class="staff-status" :class="{ closed: isStaffClosed(staff) }">{{ isStaffClosed(staff) ? '已关闭' : '启用中' }}</text>
					</view>
					<text class="staff-mobile">电话：{{ staff.mobile }}</text>
					<text class="staff-extra" v-if="staff.point">提货点：{{ staff.point }}</text>
				</view>
				<view class="staff-actions">
					<button class="action-button" @click.stop="editStaff(staff)">编辑</button>
					<button class="action-button warning" @click.stop="toggleStaffStatus(staff)">{{ isStaffClosed(staff) ? '启用' : '关闭' }}</button>
				</view>
			</view>
			<view v-if="!staffList.length" class="empty-text">暂无员工</view>
		</view>
		<view v-if="memberDialogVisible" class="dialog-mask" @click="memberDialogVisible = false">
			<view class="member-dialog" @click.stop>
				<text class="dialog-title">添加员工</text>
				<text class="dialog-line">昵称：{{ pendingMember.nickname || pendingMember.name || '未填写' }}</text>
				<text class="dialog-line">电话：{{ pendingMember.mobile }}</text>
				<view class="dialog-actions">
					<button class="dialog-cancel" @click="memberDialogVisible = false">取消</button>
					<button class="dialog-confirm" @click="openStaffEditorWithMember">添加</button>
				</view>
			</view>
		</view>
	</view>
	<AddStaff ref="staffRef" :pointList="pointList" @childEvent="initStaffList" />
</view>
</template>

<script>
import AddStaff from "./add.vue"
import { closeLeaderStaffInfo, getLeaderPointList, getLeaderStaffList, getMemberInfo } from "@/api/leader.js"
import { DEFAULT_STAFF_AUTH_IDS, getCurrentLeaderPointId, isValidMobile, normalizeLeaderPoint, normalizeLeaderStaff } from "@/utils/leaderConfig.js"

export default {
	components: { AddStaff },
	data() {
		return {
			mobileKeyword: '',
			staffList: [],
			pointList: [],
			pendingMember: {},
			memberDialogVisible: false
		}
	},
	onLoad() {
		this.initPointList()
		this.initStaffList()
	},
	methods: {
		goBack() {
			uni.navigateBack({ delta: 1 })
		},
		async initStaffList() {
			try {
				const res = await getLeaderStaffList()
				this.staffList = (Array.isArray(res.data) ? res.data : []).map(normalizeLeaderStaff)
			} catch (err) {
				console.log('员工列表加载失败：', err)
				uni.showToast({ title: '员工列表加载失败', icon: 'none' })
			}
		},
		async initPointList() {
			try {
				const res = await getLeaderPointList()
				this.pointList = (Array.isArray(res.data) ? res.data : []).map(normalizeLeaderPoint)
			} catch (err) {
				console.log('自提点加载失败：', err)
			}
		},
		async searchMember() {
			const mobile = this.mobileKeyword.trim()
			if (!isValidMobile(mobile)) {
				uni.showToast({ title: '请输入正确手机号', icon: 'none' })
				return
			}
			try {
				const res = await getMemberInfo({ mobile })
				const data = res.data || {}
				this.pendingMember = {
					name: data.nickname || data.name || '',
					nickname: data.nickname || '',
					mobile: data.mobile || mobile,
					authIds: DEFAULT_STAFF_AUTH_IDS,
					pointIds: this.getDefaultPointIds()
				}
				this.memberDialogVisible = true
			} catch (err) {
				console.log('查询员工失败：', err)
				uni.showToast({ title: '未查询到用户', icon: 'none' })
			}
		},
		getDefaultPointIds() {
			const currentPointId = getCurrentLeaderPointId() || (this.pointList[0] ? Number(this.pointList[0].id) : 0)
			return currentPointId > 0 ? [currentPointId] : []
		},
		openAddStaff() {
			this.$refs.staffRef.show(null, false)
		},
		openStaffEditorWithMember() {
			this.memberDialogVisible = false
			this.$refs.staffRef.show({
				name: this.pendingMember.nickname || this.pendingMember.name || this.pendingMember.mobile,
				mobile: this.pendingMember.mobile,
				authIds: DEFAULT_STAFF_AUTH_IDS,
				pointIds: this.pendingMember.pointIds && this.pendingMember.pointIds.length ? this.pendingMember.pointIds : this.getDefaultPointIds()
			}, false)
			this.mobileKeyword = ''
		},
		editStaff(staff) {
			this.$refs.staffRef.show(staff, true)
		},
		isStaffClosed(staff) {
			return Number(staff && staff.isClose || 0) !== 0
		},
		toggleStaffStatus(staff) {
			const staffId = Number(staff && staff.id || 0)
			if (!staffId) {
				uni.showToast({ title: '员工信息异常', icon: 'none' })
				return
			}
			const nextText = this.isStaffClosed(staff) ? '启用' : '关闭'
			uni.showModal({
				title: `确认${nextText}该员工？`,
				success: async res => {
					if (!res.confirm) return
					try {
						await closeLeaderStaffInfo({ id: staffId })
						this.initStaffList()
						uni.showToast({ title: `${nextText}成功`, icon: 'success' })
					} catch (err) {
						console.log(`${nextText}员工失败：`, err)
						uni.showToast({ title: err && err.msg ? err.msg : `${nextText}失败`, icon: 'none' })
					}
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.staff-page {
	min-height: 100vh;
	background: #f6f6f6;
	padding: 24rpx 24rpx 80rpx;
	box-sizing: border-box;
}

.nav-title {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 20;
	text-align: center;
	background: #f6f6f6;
	text {
		position: absolute;
		left: 160rpx;
		right: 160rpx;
		font-size: 34rpx;
		font-weight: 600;
		color: #222;
		text-align: center;
	}
}

.nav-back {
	position: absolute;
	left: 24rpx;
	width: 36rpx;
	height: 36rpx;
}

.search-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin: 12rpx 0 28rpx;
}

.search-input {
	flex: 1;
	height: 76rpx;
	background: #fff;
	border-radius: 38rpx;
	padding: 0 28rpx;
	font-size: 28rpx;
	box-sizing: border-box;
}

.search-button {
	width: 132rpx;
	height: 76rpx;
	line-height: 76rpx;
	border-radius: 38rpx;
	background: #19be6b;
	color: #fff;
	font-size: 28rpx;
}

.add-button {
	width: 112rpx;
	height: 76rpx;
	line-height: 76rpx;
	border-radius: 38rpx;
	background: #222;
	color: #fff;
	font-size: 28rpx;
}

.staff-card {
	min-height: 116rpx;
	background: #fff;
	border-radius: 8rpx;
	padding: 22rpx 24rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 18rpx;
	box-sizing: border-box;
}

.staff-info {
	flex: 1;
	min-width: 0;
}

.staff-main {
	display: flex;
	align-items: center;
	gap: 16rpx;
	min-width: 0;
}

.staff-name,
.staff-mobile,
.staff-extra {
	display: block;
	font-size: 28rpx;
	line-height: 42rpx;
	color: #222;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.staff-mobile {
	color: #666;
}

.staff-extra {
	color: #999;
	font-size: 24rpx;
}

.staff-status {
	flex: none;
	padding: 4rpx 14rpx;
	border-radius: 20rpx;
	background: #e6fff1;
	color: #19be6b;
	font-size: 22rpx;
	line-height: 32rpx;
}

.staff-status.closed {
	background: #f5f5f5;
	color: #999;
}

.staff-actions {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
	margin-left: 20rpx;
}

.action-button {
	width: 112rpx;
	height: 60rpx;
	line-height: 60rpx;
	border-radius: 30rpx;
	background: #eef9f2;
	color: #19be6b;
	font-size: 26rpx;
}

.action-button.warning {
	background: #fff7e6;
	color: #fa8c16;
}

.empty-text {
	height: 96rpx;
	line-height: 96rpx;
	text-align: center;
	color: #999;
	font-size: 26rpx;
}

.dialog-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, .45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 20;
}

.member-dialog {
	width: 560rpx;
	background: #fff;
	border-radius: 16rpx;
	padding: 40rpx 36rpx 32rpx;
	box-sizing: border-box;
}

.dialog-title {
	display: block;
	text-align: center;
	font-size: 34rpx;
	font-weight: 600;
	color: #222;
	margin-bottom: 28rpx;
}

.dialog-line {
	display: block;
	font-size: 28rpx;
	color: #333;
	line-height: 48rpx;
}

.dialog-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 34rpx;
}

.dialog-cancel,
.dialog-confirm {
	flex: 1;
	height: 76rpx;
	line-height: 76rpx;
	border-radius: 38rpx;
	font-size: 28rpx;
}

.dialog-cancel {
	background: #f2f2f2;
	color: #666;
}

.dialog-confirm {
	background: #19be6b;
	color: #fff;
}
</style>
