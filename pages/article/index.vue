<template>
<view class="container">
<!--********************************************************-->
<view class="home-header">
	<view class="header-logo">
	<text class="logo-text">店小团</text>
	<text class="logo-sub">团购平台</text>
	</view>
</view>
<!--********************************************************-->
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

.title {
	
	margin: 20rpx 0;
	font-size: $text-fontSize-medium;
	text-align: center;
}

.content {
	font-size: $text-fontSize-small;
}

</style>
