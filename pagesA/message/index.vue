<template>
<view class="container">
<LeaderHeader title="用户消息" />
<view class="page">
<view class="card">
		
	<view class="message-tabs">
		<view class="tab-item" :class="{ active: this.msgType === 0 }" @click="switchTab(0)">
		所有消息 <text class="tab-badge" v-if="unread > 0">{{ unread }}</text>
		</view>
		<!--
		<view class="tab-item" :class="{ active: this.msgType === 1 }" @click="switchTab(1)">
		系统消息 <text class="tab-badge" v-if="unreadOrder > 0">{{ unreadOrder }}</text>
		</view>
		<view class="tab-item" :class="{ active: this.msgType === 2 }" @click="switchTab(2)">
		内部消息 <text class="tab-badge" v-if="unreadSystem > 0">{{ unreadSystem }}</text>
		</view>
		<view class="tab-item" :class="{ active: this.msgType === 3 }" @click="switchTab(3)">
		业务消息 <text class="tab-badge" v-if="unreadActivity > 0">{{ unreadActivity }}</text>
		</view>
		-->
	</view>

	<view class="message-list">
	<view class="message-item" v-for="(msg, index) in messageList" :key="index" :class="{ unread: msg.read == 0 }" @click="viewMessage(msg)">
		<view class="message-content">
			<view class="message-title">{{ msg.content }}</view>
			<text class="message-time">{{ msg.time }}</text>
		</view>
	</view>
    </view>
    
</view>
</view>
</view>
</template>

<script>
import LeaderHeader from "../common/header.vue"
import { getLeaderMessageList, getLeaderMessageCount, getLeaderUnReadMessageCount, readLeaderMessage } from "@/api/leader.js"
export default {
	data() {
		return {
			unread: 0, // 未读消息总数
			total: 0, // 消息总数
			page: 1,
			pageSize: 10,
			msgType: 0,
			messageList: []
		}
	},
	components: { LeaderHeader },
	onLoad() {
		this.initMessageList()
		this.initMessageCount()
		this.initUnReadMessageCount()
	},
	methods: {
		// 初始化消息列表
		async initMessageList(){
			
			try {
				const params = { type:this.msgType, page:this.page, pageSize:this.pageSize }
				const res = await getLeaderMessageList(params)
				this.messageList = res.data
			} catch (err) {
				console.log('初始化店铺信息失败：', err)
			}
		},
		// 初始化消息总数
		async initMessageCount(){
			
			try {
				const params = { type:this.msgType }
				const res = await getLeaderMessageCount(params)
				this.total = res.data
			} catch (err) {
				console.log('初始化店铺信息失败：', err)
			}
		},
		// 初始化未读消息总数
		async initUnReadMessageCount(){
			
			try {
				const params = { type:this.msgType }
				const res = await getLeaderUnReadMessageCount(params)
				this.unread = res.data
			} catch (err) {
				console.log('初始化店铺信息失败：', err)
			}
		},
		// 选择消息分类
		switchTab(msgTypeId) {
			
			this.msgType = msgTypeId
		},
		// 阅读消息
		async viewMessage(msg) {
			
			try {
				const params = {id: msg.id}
				const res = await readLeaderMessage(params)
				msg.read = 1
				this.unread--
			} catch (err) {
				console.log('阅读消息失败：', err)
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.card {
	background: #fff;
	border-radius: 15rpx;
	padding: 15rpx;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.message-tabs {
	display: flex;
	gap: 60rpx;
	margin-bottom: 30rpx;
	border-bottom: 2rpx solid #f0f0f0;
	.tab-item {
		flex: 1;
		padding: 20rpx 0;
		font-size: 28rpx;
		color: #666;
		border-bottom: 4rpx solid transparent;
		cursor: pointer;
		display: flex;
		//justify-content: center;
		align-items: center;
		gap: 12rpx;
		&.active {
			color: #1890ff;
			border-bottom-color: #1890ff;
		}
		.tab-badge {
			background: #ff4d4f;
			color: #fff;
			padding: 4rpx 12rpx;
			border-radius: 20rpx;
			font-size: 22rpx;
		}
	}
}

.message-list {
	.message-item {
		display: flex;
		align-items: center;
		padding: 20rpx;
		border-bottom: 1rpx solid #ddd;
		cursor: pointer;
		&:last-child {
			border-bottom: none;
		}
		&.unread {
			background: #f0f7ff;
		}
	}
	.message-content {
		.message-title {
			font-size: 28rpx;
			color: #333;
		}
		.message-time {
			font-size: 24rpx;
			color: #999;
			line-height: 50rpx;
		}
	}
}
</style>
