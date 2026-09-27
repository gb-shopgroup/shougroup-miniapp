<template>
<view class="container" :style="miniNavPageStyle()">
<view class="article-nav" :style="miniNavBarStyle()">
	<image class="nav-back" :style="miniNavTitleStyle()" src="/static/image/nav-back.png" mode="aspectFit" @click="goBack"></image>
	<text class="article-nav-title" :style="miniNavTitleStyle()">{{ article.title || '协议详情' }}</text>
</view>
<view class="page">
	<view class="title">{{article.title}}</view>
	<view class="content"><rich-text :nodes="article.content"></rich-text></view>
</view>
<!--********************************************************-->
</view>
</template>

<script>
import parseHtml from "@/utils/html-parser.js"
import { getArticleInfo } from "@/api/group.js"
export default {
	data() {
		return {
			article: {
				title: '标题',
				content: '内容'
			}
		}
	},
	onLoad(options) {
		if (options.id) {
			this.initArticleInfo(options.id)
			console.log('文章ID:', options.id)
		}
	},
	methods: {
		goBack() {
			if (getCurrentPages().length > 1) {
				uni.navigateBack({ delta: 1 })
				return
			}
			uni.switchTab({ url: '/pages/index/index' })
		},
		// 获取文章详情
		async initArticleInfo(articleId) {
			try {
				const params = {id:articleId}
				const res = await getArticleInfo(params)
				this.article.title = res.data.title
				this.article.content = parseHtml(res.data.content)
			} catch (err) {
				console.log('获取文章详情失败：', err)
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #fff;
}

.article-nav {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 10;
	background: #fff;
}

.nav-back {
	position: absolute;
	left: 28rpx;
	width: 38rpx;
	height: 38rpx;
}

.article-nav-title {
	position: absolute;
	left: 140rpx;
	right: 140rpx;
	font-size: 32rpx;
	font-weight: 500;
	color: #222;
	text-align: center;
}

.page {
	padding: 0 32rpx 48rpx;
}

.title {
	
	margin: 20rpx 0;
	font-size: $text-fontSize-medium;
	text-align: center;
}

.content {
	font-size: $text-fontSize-small;
}

</style>
