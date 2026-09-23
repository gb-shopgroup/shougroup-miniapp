<template>
<view class="container" :style="miniNavPageStyle()">
	<view class="leader-nav" :style="miniNavBarStyle()">
		<text class="nav-back" :style="miniNavTitleStyle()" @click="goBack">‹</text>
		<text class="nav-title" :style="miniNavTitleStyle()">{{ isAdd ? '开团' : '修改团购' }}</text>
		<view class="nav-placeholder"></view>
	</view>
	
	<scroll-view class="group-form" :style="groupFormStyle" scroll-y>
		<view class="section name-section">
			<view class="name-label-row">
				<text class="label" :class="{ required: isAdd }">团购名称</text>
				<text class="hint" v-if="isAdd">（建议不超过80字）</text>
			</view>
			<input v-if="isAdd" class="name-input" type="text" v-model="formData.name" maxlength="80" placeholder="请输入团购名称" />
			<text v-else class="name-text">{{ formData.name || '—' }}</text>
		</view>
		
		<view class="section intro-section">
			<text class="section-heading">团购介绍</text>
			<view class="intro-tools" v-if="isAdd">
				<view class="intro-tool" @click="insertImage"><text class="tool-icon image-icon"></text><text>图片</text></view>
				<view
					v-for="layout in imageLayouts"
					:key="layout.key"
					class="intro-tool image-layout-tool"
					:class="{ active: selectedImageLayout === layout.key }"
					:data-layout="layout.key"
					@click="selectImageLayout">
					<text>{{ layout.name }}</text>
				</view>
				<view class="intro-tool" :class="{ active: formats.bold }" data-name="bold" @click="format"><text class="tool-text">B</text><text>加粗</text></view>
				<view class="intro-tool" :class="{ active: formats.header === 2 }" data-name="header" :data-value="2" @click="format"><text class="tool-text">H</text><text>标题</text></view>
				<view class="intro-tool" @click="insertDivider"><text class="tool-divider"></text><text>分割</text></view>
				<view class="intro-tool" @click="clearEditor"><text class="tool-clear"></text><text>清空</text></view>
			</view>
			<view class="editor-wrapper">
				<editor
					id="groupIntroEditor"
					class="intro-editor"
					:read-only="!isAdd"
					placeholder="请输入团购介绍，可添加图片和排版"
					show-img-size
					show-img-toolbar
					show-img-resize
					@ready="onEditorReady"
					@statuschange="onStatusChange"
					@input="onEditorInput">
				</editor>
			</view>
		</view>
		
		<view class="section goods-section">
			<view class="section-title">
				<text class="section-heading">团购商品</text>
				<picker :range="goodsList" range-key="name" @change="onGoodsChange">
					<view class="import-btn">从商品库导入</view>
				</picker>
			</view>
			<view class="group-goods-card" v-for="(item, index) in formData.goods" :key="item.gid || index">
				<text class="sort-index">{{ index + 1 }}</text>
				<view class="goods-main">
					<view class="goods-image-wrap">
						<image class="goods-image" :src="item.img" mode="aspectFill"></image>
						<text class="goods-stock">库存{{ item.stock || '不限' }}</text>
					</view>
					<view class="goods-info">
						<text class="goods-name">{{ item.gname }}</text>
						<text class="goods-price">¥{{ item.price }}</text>
					</view>
				</view>
				<view class="goods-actions" v-if="isAdd">
					<button class="goods-action-btn" size="mini" @click="editGroupGoods(item)">修改</button>
					<button class="goods-action-btn" size="mini" @click="removeGoods(index)">删除</button>
				</view>
			</view>
			<view class="add-goods-outline" @click="openCreateGoods">添加商品</view>
		</view>
		
		<view class="section settings-section">
			<text class="section-heading">团购设置</text>
			<picker v-if="isAdd" :range="categoryList" range-key="name" @change="onCategoryChange">
				<view class="setting-row">
					<text>团购分类</text>
					<text class="setting-value">{{ categoryName || '请选择分类' }} ›</text>
				</view>
			</picker>
			<view class="setting-row" v-else>
				<text>团购分类</text>
				<text class="setting-value">{{ categoryName || '—' }}</text>
			</view>
			<view class="setting-row">
				<text>物流方式</text>
				<text class="setting-value">顾客自提 ›</text>
			</view>
			<view class="setting-row" :class="{ 'row-readonly': !isAdd }" @click="openLabelPanel">
				<text>显示标签</text>
				<view class="setting-value-wrap">
					<text class="setting-value">{{ labelText }}</text>
					<text class="setting-arrow" v-if="isAdd">›</text>
				</view>
			</view>
			<view class="setting-row time-row" :class="{ 'row-readonly': !isAdd }" @click="openTimePanel">
				<text>团购时间</text>
				<view class="setting-value-wrap">
					<view class="time-value">
						<text>开始 {{ startTimeText || (isAdd ? '请选择' : '—') }}</text>
						<text>结束 {{ endTimeText || (isAdd ? '请选择' : '—') }}</text>
					</view>
					<text class="setting-arrow" v-if="isAdd">›</text>
				</view>
			</view>
		</view>
	</scroll-view>
	
	<view class="bottom-action">
		<button @click="submitForm">{{ isAdd ? '开团' : '保存' }}</button>
	</view>
	<view class="sheet-mask" v-if="labelPanelVisible" @click="closeLabelPanel">
		<view class="bottom-sheet label-sheet" @click.stop>
			<view class="sheet-header">
				<text class="sheet-side"></text>
				<text class="sheet-title">请选择团购标签</text>
				<text class="sheet-confirm" @click="confirmLabelPanel">确定</text>
			</view>
			<picker-view class="label-picker" :value="labelPickerValue" indicator-class="label-picker-indicator" @change="onLabelPickerChange" v-if="tagOptions.length > 0">
				<picker-view-column>
					<view class="label-picker-item" v-for="item in tagOptions" :key="item.id || item.name">{{ item.name }}</view>
				</picker-view-column>
			</picker-view>
			<view class="label-empty" v-else>暂无可用标签</view>
			<view class="label-cancel" @click="closeLabelPanel">取消</view>
			<view class="sheet-safe-area"></view>
		</view>
	</view>
	<view class="sheet-mask" v-if="timePanelVisible" @click="closeTimePanel">
		<view class="bottom-sheet time-sheet" @click.stop>
			<view class="sheet-title">团购时间</view>
			<view class="time-picker-row">
				<text class="time-picker-label">开始</text>
				<picker mode="date" :value="timeDraft.startDate" :start="minDateText" :end="maxDateText" @change="onTimeDateChange('start', $event)">
					<view class="time-picker-value">{{ timeDraft.startDate }}</view>
				</picker>
				<picker mode="time" :value="timeDraft.startClock" @change="onTimeClockChange('start', $event)">
					<view class="time-picker-value clock">{{ timeDraft.startClock }}</view>
				</picker>
			</view>
			<view class="time-picker-row">
				<text class="time-picker-label">结束</text>
				<picker mode="date" :value="timeDraft.endDate" :start="minDateText" :end="maxDateText" @change="onTimeDateChange('end', $event)">
					<view class="time-picker-value">{{ timeDraft.endDate }}</view>
				</picker>
				<picker mode="time" :value="timeDraft.endClock" @change="onTimeClockChange('end', $event)">
					<view class="time-picker-value clock">{{ timeDraft.endClock }}</view>
				</picker>
			</view>
			<view class="sheet-actions">
				<button class="sheet-btn light" @click="closeTimePanel">取消</button>
				<button class="sheet-btn" @click="confirmTimePanel">确定</button>
			</view>
		</view>
	</view>

</view>
</template>

<script>
import { uploadGroupIntroImage } from "@/api/upload.js"
import { getLeaderGroupActivityTagList, getLeaderGroupCat, getLeaderOnlineGoodsList, addLeaderGroupInfo, getLeaderGroupInfo, editLeaderGroupInfo } from "@/api/leader.js"
import { buildGroupGoodsReference } from "@/utils/leaderProduct.js"
import {
	buildLeaderGroupCopyDraft,
	buildLeaderGroupSubmitPayload,
	formatGroupDateTime,
	formatGroupTimeRange,
	normalizeRichTextImages,
	normalizeLeaderGroup,
	normalizeLeaderGroupTagList,
	validateGroupTime
} from "@/utils/leaderGroup.js"
export default {
	data() {
		return {
			isAdd: true,
			formData: {
				// 团购id
				id: 0,
				// 团购分类id
				cat: 0,
				// 团购名称
				name: '',
				// 商品提货方式,1自提2邮递
				pickup: 1,
				// 团购绑定自提点：开团/修改团不再选择，编辑态原样回传、新增态为 0
				pointId: 0,
				// 团购介绍
				info: '',
				// C端团购详情标签（后台标签实体：tagId=0 未选择；tagName/label 仅用于展示）
				tagId: 0,
				tagName: '',
				label: '',
				virtual: 0,
				// 活动开始/结束时间，统一秒级时间戳
				startTime: '',
				endTime: '',
				// 商品列表
				goods: []
			},
			categoryName: '',
			categoryList: [],
			goodsList: [],
			goodsIds: [],
			labelPanelVisible: false,
			// 团购标签改为后台可维护的实体，进页面时从接口拉取（tagId/tagName/tagColor）
			tagOptions: [],
			labelPickerValue: [0],
			labelDraft: '',
			timePanelVisible: false,
			timeDraft: {
				startDate: '',
				startClock: '00:00',
				endDate: '',
				endClock: '23:59'
			},
			selectedImageLayout: 'full',
			imageLayouts: [
				{ key: 'full', name: '通栏', width: '100%' },
				{ key: 'two', name: '一行两张', width: '49%' },
				{ key: 'three', name: '一行三张', width: '32%' }
			],
			formats: {}
		}
	},
	created() {
		this._editorCtx = null
	},
	onUnload() {
		this._editorCtx = null
	},
	onLoad(options) {
		this.resetTimeDraft()
		
		// 是否编辑团购信息
		if(options.copyId){
			this.isAdd = true
			this.initGroupInfo(options.copyId, true)
		}else if(options.id){
			this.isAdd = false
			this.initGroupInfo(options.id, false)
		}
		
		// 初始化团购分类和商品列表
		this.initGroupCatList()
		this.initTagOptions()
		this.initGoodsList()
		
		// 初始化富文本编辑器字体文件
		/*
		uni.loadFontFace({
			family: 'Pacifico',
			source: 'url("/static/font/Pacifico-Regular.ttf")',
			success() {
			},
			fail() {
			}
		})
		*/
	},
	computed: {
		groupFormStyle(){
			return `height: calc(100vh - ${this.miniNavMetrics.navBarHeight}px - 128rpx);`
		},
		startTimeText(){
			return formatGroupDateTime(this.formData.startTime)
		},
		endTimeText(){
			return formatGroupDateTime(this.formData.endTime)
		},
		groupTimeText(){
			return formatGroupTimeRange(this.formData.startTime, this.formData.endTime)
		},
		labelText(){
			return this.formData.tagName || this.formData.label || (this.formData.tagId ? '已选择标签' : '请选择标签')
		},
		minDateText(){
			return this.formatPickerDate(new Date())
		},
		maxDateText(){
			const date = new Date()
			date.setFullYear(date.getFullYear() + 10)
			return this.formatPickerDate(date)
		}
	},
	methods: {
		// 初始化团购信息
		async initGroupInfo(groupId, isCopy = false){
			
			try {
				const params = { groupId:groupId }
				const res = await getLeaderGroupInfo(params)
				const group = normalizeLeaderGroup(res.data || {})
				this.formData = isCopy ? buildLeaderGroupCopyDraft(group) : group
				
				const arr = this.formData.goods
				this.goodsIds = []
				for(var i = 0; i < arr.length; i++){
					this.goodsIds.push(String(arr[i].gid))
				}
				this.resetTimeDraft()
				this.syncCategoryName()
				this.syncSelectedGoodsStock()
				this.syncTagPickerIndex()
				this.setEditorContent()
			} catch (err) {
				console.log('初始化团购信息失败：', err)
			}
		},
		// 初始化团购分类
		async initGroupCatList(){
			
			try {
				const res = await getLeaderGroupCat()
				this.categoryList = Array.isArray(res.data) ? res.data : []
				this.syncCategoryName()
			} catch (err) {
				console.log('初始化团购分类失败：', err)
			}
		},
		// 初始化商品列表
		async initGoodsList(){
			
			try {
				const res = await getLeaderOnlineGoodsList()
				this.goodsList = Array.isArray(res.data) ? res.data : []
				this.syncSelectedGoodsStock()
			} catch (err) {
				console.log('初始化商品列表失败：', err)
			}
		},
		syncSelectedGoodsStock(){
			if(!Array.isArray(this.formData.goods) || !Array.isArray(this.goodsList) || this.goodsList.length === 0) return
			const stockMap = new Map()
			this.goodsList.forEach(goods => {
				const item = buildGroupGoodsReference(goods)
				if(item.gid) stockMap.set(String(item.gid), item.stock)
			})
			this.formData.goods = this.formData.goods.map(item => {
				const stock = stockMap.get(String(item.gid || item.goodsId || 0))
				return stock === undefined ? item : Object.assign({}, item, { stock })
			})
		},
		// 选择团购分类
		onCategoryChange(e){
			
			const category = this.categoryList[e.detail.value]
			if (!category) return
			this.formData.cat = category.id
			this.categoryName = category.name
		},
		formatPickerDate(date){
			const year = date.getFullYear()
			const month = String(date.getMonth() + 1).padStart(2, '0')
			const day = String(date.getDate()).padStart(2, '0')
			return `${year}-${month}-${day}`
		},
		formatPickerClock(date){
			const hour = String(date.getHours()).padStart(2, '0')
			const minute = String(date.getMinutes()).padStart(2, '0')
			return `${hour}:${minute}`
		},
		dateTimeFromTimestamp(timestamp, fallbackClock){
			const time = Number(timestamp || 0)
			const date = time ? new Date(time * 1000) : new Date()
			return {
				date: this.formatPickerDate(date),
				clock: time ? this.formatPickerClock(date) : fallbackClock
			}
		},
		resetTimeDraft(){
			const start = this.dateTimeFromTimestamp(this.formData.startTime, this.formatPickerClock(new Date()))
			const end = this.dateTimeFromTimestamp(this.formData.endTime, '23:59')
			this.timeDraft = {
				startDate: start.date,
				startClock: start.clock,
				endDate: end.date,
				endClock: end.clock
			}
		},
		timestampFromDateTime(dateText, clockText){
			const parts = String(dateText || '').split('-').map(Number)
			const clockParts = String(clockText || '00:00').split(':').map(Number)
			if(parts.length !== 3) return 0
			return Math.floor(new Date(parts[0], parts[1] - 1, parts[2], clockParts[0] || 0, clockParts[1] || 0, 0, 0).getTime() / 1000)
		},
		// 拉取后台标签列表（后台可增删改，前端不再写死三个标签）
		async initTagOptions(){
			try {
				const res = await getLeaderGroupActivityTagList()
				this.tagOptions = normalizeLeaderGroupTagList(res.data)
				this.syncTagPickerIndex()
			} catch (err) {
				console.log('获取团购标签列表失败：', err)
				this.tagOptions = []
			}
		},
		// 让选择器停在当前标签上（编辑态回填 tagId 后也要同步一次）
		syncTagPickerIndex(){
			const index = this.tagOptions.findIndex(item => Number(item.id) === Number(this.formData.tagId || 0))
			if (index >= 0) this.labelPickerValue = [index]
		},
		openLabelPanel(){
			// 编辑态只允许添加商品，标签只读展示
			if (!this.isAdd) return
			if (this.tagOptions.length === 0) {
				uni.showToast({ title: '暂无可用标签', icon: 'none' })
				return
			}
			const index = Math.max(0, this.tagOptions.findIndex(item => Number(item.id) === Number(this.formData.tagId || 0)))
			this.labelPickerValue = [index]
			this.labelDraft = this.tagOptions[index] ? this.tagOptions[index].name : ''
			this.labelPanelVisible = true
		},
		closeLabelPanel(){
			this.labelPanelVisible = false
		},
		onLabelPickerChange(e){
			const index = (e.detail.value && e.detail.value[0]) || 0
			this.labelPickerValue = [index]
			this.labelDraft = this.tagOptions[index] ? this.tagOptions[index].name : ''
		},
		confirmLabelPanel(){
			// 提交用 tagId（GroupActRequest 字段）；tagName/label 仅用于页面展示
			const picked = this.tagOptions[this.labelPickerValue[0]] || this.tagOptions[0] || null
			this.formData.tagId = picked ? Number(picked.id || 0) : 0
			this.formData.tagName = picked ? picked.name : ''
			this.formData.label = this.formData.tagName
			this.closeLabelPanel()
		},
		openTimePanel(){
			// 编辑态时间只读展示
			if (!this.isAdd) return
			this.resetTimeDraft()
			this.timePanelVisible = true
		},
		closeTimePanel(){
			this.timePanelVisible = false
		},
		onTimeDateChange(type, e){
			const value = e.detail.value
			if(type === 'start') this.timeDraft.startDate = value
			else this.timeDraft.endDate = value
		},
		onTimeClockChange(type, e){
			const value = e.detail.value
			if(type === 'start') this.timeDraft.startClock = value
			else this.timeDraft.endClock = value
		},
		confirmTimePanel(){
			const start = this.timestampFromDateTime(this.timeDraft.startDate, this.timeDraft.startClock)
			const end = this.timestampFromDateTime(this.timeDraft.endDate, this.timeDraft.endClock)
			const result = validateGroupTime(start, end)
			if(!result.valid){
				uni.showToast({ title: result.message, icon: 'none' })
				return
			}
			this.formData.startTime = start
			this.formData.endTime = end
			this.closeTimePanel()
		},
		// 同步编辑态团购分类名称
		syncCategoryName(){
			
			const category = this.categoryList.find(item => item.id == this.formData.cat)
			this.categoryName = category ? category.name : ''
		},
		// 选择并添加商品
		onGoodsChange(e){
			
			const goods = this.goodsList[e.detail.value]
			if (!goods) return
			this.appendGroupGoods(goods)
		},
		appendGroupGoods(goods){
			const item = buildGroupGoodsReference(goods)
			if(this.goodsIds.includes(String(item.gid))){
				uni.showToast({ title: '已添加该商品了', icon: 'none' })
			}else{
				this.formData.goods.push(item)
				this.goodsIds.push(String(item.gid))
			}
		},
		openCreateGoods(){
			const url = '/pagesA/goods/add?fromGroup=1'
			uni.navigateTo({
				url,
				events: {
					acceptGroupGoods: data => {
						const goods = data && data.goods ? data.goods : data
						if (!goods) return
						this.appendGroupGoods(goods)
						this.initGoodsList()
					}
				},
				fail: () => {
					uni.redirectTo({ url })
				}
			})
		},
		// 移除商品 
		removeGoods(index){
			
			const gid = this.formData.goods[index].gid
			this.formData.goods.splice(index, 1)
			
			let idx = this.goodsIds.findIndex(item => item === String(gid))
			if(idx !== -1){ this.goodsIds.splice(idx,1) }
		},		
		// 修改商品库商品
		editGroupGoods(item){
			
			const goodsId = item.gid || item.goodsId
			if(!goodsId){
				uni.showToast({ title: '商品信息异常', icon: 'none' })
				return
			}
			const url = '/pagesA/goods/add?id=' + goodsId + '&fromGroup=1'
			uni.navigateTo({
				url,
				events: {
					acceptGroupGoods: data => {
						const goods = data && data.goods ? data.goods : data
						if (!goods) return
						const nextItem = buildGroupGoodsReference(goods)
						const index = this.formData.goods.findIndex(item => String(item.gid) === String(nextItem.gid))
						if (index >= 0) {
							this.formData.goods.splice(index, 1, nextItem)
						} else {
							this.appendGroupGoods(goods)
						}
						this.initGoodsList()
					}
				},
				fail: () => {
					uni.redirectTo({ url })
				}
			})
		},
		// 选择配送方式
		onPickupChange(e){
			
			this.formData.pickup = e.detail.value
		},
		// 返回团购列表
		goBack(){
			const url = '/pagesA/group/index'
			uni.navigateBack({
				delta: 1,
				fail: () => {
					uni.redirectTo({ url })
				}
			})
		},
		// 提交保存团购
		submitForm() {
			
			// 编辑态只允许添加商品，其余信息只读且原样回传，因此只校验商品。
			if (!this.isAdd) {
				if (this.formData.goods.length == 0) {
					uni.showToast({ title: '请选择商品', icon: 'none' })
					return
				}
				this.requestSubmitData()
				return
			}
			
			if (!this.formData.name) {
				uni.showToast({ title: '请输入团购名称', icon: 'none' })
				return
			}
			if (this.formData.cat == 0) {
				uni.showToast({ title: '请选择团购分类', icon: 'none' })
				return
			}
			if (this.formData.goods.length == 0) {
				uni.showToast({ title: '请选择商品', icon: 'none' })
				return
			}
			const timeResult = validateGroupTime(this.formData.startTime, this.formData.endTime)
			if (!timeResult.valid) {
				uni.showToast({ title: timeResult.message, icon: 'none' })
				return
			}
			
			this.getEditorContent()
		},
		// 提交接口
		async requestSubmitData(){
		
			// 提交接口
			try {
				const submitData = this.buildSubmitData()
				if(this.formData.id > 0){
					await editLeaderGroupInfo(submitData)
				}else{
					await addLeaderGroupInfo(submitData)
				}
				uni.showToast({ title: this.formData.id > 0 ? '保存成功' : '开团成功', icon: 'success' })
				this.goBack()
			} catch (err) {
				const title = (err && err.msg) || err || '提交保存团购失败'
				uni.showToast({ title: String(title), icon: 'none' })
				console.log('提交保存团购失败：', err)
			}	
		},
		// 组装团购提交数据；商品只作为商品库引用
		buildSubmitData(){
			
			return buildLeaderGroupSubmitPayload(this.formData)
		},
		// 编辑器准备就绪
		onEditorReady() {
			uni.createSelectorQuery().in(this).select('#groupIntroEditor').context((res) => {
				this._editorCtx = res && res.context
				this.setEditorContent()
			}).exec()
		},
		setEditorContent(){
			if(!this._editorCtx || !this.formData.info) return
			this._editorCtx.setContents({
				html: normalizeRichTextImages(this.formData.info),
				fail: err => console.log('HTML富文本设置失败：', err)
			})
		},
		selectImageLayout(e) {
			const dataset = e.currentTarget ? e.currentTarget.dataset : e.target.dataset
			const layoutKey = dataset && dataset.layout
			if (this.imageLayouts.some(item => item.key === layoutKey)) {
				this.selectedImageLayout = layoutKey
			}
		},
		getSelectedImageLayout() {
			return this.imageLayouts.find(item => item.key === this.selectedImageLayout) || this.imageLayouts[0]
		},
		format(e) {
			const dataset = e.currentTarget ? e.currentTarget.dataset : e.target.dataset
			const { name, value } = dataset || {}
			if (!name || !this._editorCtx) return
			this._editorCtx.format(name, value)
		},
		onStatusChange(e) {
			const formats = e.detail
			this.formats = formats
		},
		onEditorInput(e){
			this.formData.info = e.detail.html || ''
		},
		insertDivider() {
			if(!this._editorCtx) return
			this._editorCtx.insertDivider({
				success: function() {
					console.log('insert divider success')
				}
			})
		},
		clearEditor() {
			uni.showModal({
				title: '清空编辑器',
				content: '确定清空编辑器全部内容？',
				success: res => {
					if (res.confirm && this._editorCtx) {
						this._editorCtx.clear({
							success: () => {
								this.formData.info = ''
							}
						})
					}
				}
			})
		},
		// 选择图片
		insertImage() {
			if(!this._editorCtx) return
			uni.chooseImage({
				count: 1,
				success: (res) => {
					const imgFile = res.tempFilePaths[0]
					this.uploadHtmlImage(imgFile)
				}
			})
		},
		// 上传图片
		async uploadHtmlImage(imgFile){
			
			try {
				const imgPath = await uploadGroupIntroImage(imgFile)
				const layout = this.getSelectedImageLayout()
				this._editorCtx.insertImage({
					src: imgPath,
					alt: '团购介绍图片',
					width: layout.width
				})
			} catch (err) {
				console.log('上传图片失败：', err)
			}
		},
		// 获取富文本内容
		getEditorContent() {
			if(!this._editorCtx){
				this.requestSubmitData()
				return
			}
			this._editorCtx.getContents({
				success: (res) => {
					this.formData.info = normalizeRichTextImages(res.html || '')
					this.requestSubmitData()
				},
				fail: (err) => {
					console.log(err)
					this.requestSubmitData()
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
//@import "@/static/css/editor-icon.css";

.container {
	min-height: 100vh;
	background: #f6f6f6;
	padding-bottom: 128rpx;
	box-sizing: border-box;
}

.leader-nav {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 20;
	padding: 0 24rpx;
	background: #fff;
	box-sizing: border-box;
	display: grid;
	grid-template-columns: 160rpx minmax(0, 1fr) 160rpx;
	align-items: start;
	border-bottom: 1rpx solid #f0f0f0;
}

.nav-back {
	position: absolute;
	left: 24rpx;
	width: 160rpx;
	display: flex;
	align-items: center;
	font-size: 52rpx;
	color: #555;
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

.nav-placeholder {
	display: block;
	min-width: 0;
}

.group-form {
	box-sizing: border-box;
}

.section {
	margin: 12rpx 18rpx;
	padding: 28rpx 44rpx;
	background: #fff;
	border-radius: 12rpx;
	box-sizing: border-box;
}

.name-section {
	min-height: 104rpx;
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.name-label-row {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.label,
.section-heading {
	font-size: 32rpx;
	font-weight: 500;
	color: #111;
	line-height: 44rpx;
}

.required::after {
	content: '*';
	color: #ff2d2d;
	margin-left: 2rpx;
}

.hint {
	font-size: 24rpx;
	color: #6c6c6c;
	margin-left: 22rpx;
	white-space: nowrap;
}

.name-input {
	flex: 1;
	min-width: 0;
	height: 64rpx;
	font-size: 28rpx;
	text-align: right;
	color: #111;
}

/* 编辑态：名称只读展示 */
.name-text {
	flex: 1;
	min-width: 0;
	font-size: 28rpx;
	line-height: 40rpx;
	text-align: right;
	color: #111;
	word-break: break-all;
}

/* 编辑态：只读设置行不可点击，去掉可点击的视觉暗示 */
.row-readonly {
	opacity: 0.85;
}

.intro-section {
	min-height: 520rpx;
}

.editor-wrapper {
	width: 100%;
	min-height: 340rpx;
	margin-top: 22rpx;
	border: 1rpx solid #f0f0f0;
	border-radius: 8rpx;
	background: #fafafa;
	overflow: hidden;
	box-sizing: border-box;
}

.intro-editor {
	width: 100%;
	min-height: 340rpx;
	padding: 20rpx 22rpx;
	font-size: 28rpx;
	line-height: 40rpx;
	color: #111;
	box-sizing: border-box;
}

.intro-tools {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 18rpx;
	margin-top: 24rpx;
	color: #555;
	font-size: 24rpx;
}

.intro-tool {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	min-width: 96rpx;
	height: 56rpx;
	padding: 0 12rpx;
	border-radius: 6rpx;
	background: #f7f7f7;
	box-sizing: border-box;
}

.intro-tool.active {
	color: #2fc969;
	background: #eafaf0;
}

.image-layout-tool {
	min-width: 82rpx;
}

.tool-text {
	font-weight: 700;
	font-size: 28rpx;
	line-height: 1;
}

.tool-divider {
	width: 32rpx;
	height: 2rpx;
	background: #8f8f8f;
}

.tool-clear {
	position: relative;
	width: 26rpx;
	height: 26rpx;
}

.tool-clear::before,
.tool-clear::after {
	content: '';
	position: absolute;
	left: 12rpx;
	top: 0;
	width: 2rpx;
	height: 26rpx;
	background: #8f8f8f;
}

.tool-clear::before {
	transform: rotate(45deg);
}

.tool-clear::after {
	transform: rotate(-45deg);
}

.intro-tool .tool-icon {
	flex-shrink: 0;
}

.intro-tool text:last-child {
	white-space: nowrap;
}

.intro-tool:not(.active) {
	color: #555;
}

.intro-tool {
	align-items: center;
}

.tool-icon {
	width: 34rpx;
	height: 28rpx;
	position: relative;
	box-sizing: border-box;
}

.image-icon {
	border: 2rpx solid #8f8f8f;
}

.image-icon::after {
	content: '';
	position: absolute;
	left: 6rpx;
	bottom: 4rpx;
	width: 20rpx;
	height: 12rpx;
	border-left: 2rpx solid #8f8f8f;
	border-bottom: 2rpx solid #8f8f8f;
	transform: skewX(-28deg);
}

.text-icon {
	border: 2rpx solid #8f8f8f;
}

.text-icon::before,
.text-icon::after {
	content: '';
	position: absolute;
	background: #8f8f8f;
}

.text-icon::before {
	left: 6rpx;
	top: 8rpx;
	width: 20rpx;
	height: 2rpx;
}

.text-icon::after {
	left: 6rpx;
	top: 16rpx;
	width: 14rpx;
	height: 2rpx;
}

.section-title {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 28rpx;
}

.import-btn {
	height: 40rpx;
	line-height: 40rpx;
	padding: 0 14rpx;
	border: 1rpx solid #2fc969;
	border-radius: 4rpx;
	color: #2fc969;
	font-size: 22rpx;
}

.group-goods-card {
	position: relative;
	margin: 18rpx 26rpx 24rpx;
	padding: 54rpx 30rpx 32rpx;
	background: #f8f8f8;
	border-radius: 12rpx;
	box-sizing: border-box;
}

.sort-index {
	position: absolute;
	left: 0;
	top: 0;
	min-width: 42rpx;
	height: 34rpx;
	line-height: 34rpx;
	padding: 0 10rpx;
	border-radius: 0 0 8rpx 0;
	background: #c7efc0;
	color: #2fae55;
	font-size: 22rpx;
	text-align: center;
	box-sizing: border-box;
}

.goods-main {
	display: flex;
	gap: 28rpx;
	min-width: 0;
}

.goods-image-wrap {
	position: relative;
	width: 174rpx;
	height: 174rpx;
	flex-shrink: 0;
	border-radius: 4rpx;
	overflow: hidden;
	background: #eee;
}

.goods-image {
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
	background: rgba(0, 0, 0, 0.55);
	color: #fff;
	font-size: 22rpx;
	text-align: center;
}

.goods-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	padding-top: 24rpx;
}

.goods-name {
	font-size: 30rpx;
	color: #111;
	line-height: 42rpx;
}

.goods-price {
	font-size: 28rpx;
	color: #ff1e1e;
	line-height: 38rpx;
}

.goods-actions {
	position: absolute;
	right: 34rpx;
	top: 20rpx;
	display: flex;
	gap: 16rpx;
}

.goods-action-btn {
	width: 62rpx;
	height: 34rpx;
	line-height: 34rpx;
	padding: 0;
	border-radius: 4rpx;
	background: #fff;
	border: 1rpx solid #dcdcdc;
	color: #8c8c8c;
	font-size: 20rpx;
}

.goods-action-btn::after,
.bottom-action button::after {
	border: none;
}

.add-goods-outline {
	height: 72rpx;
	line-height: 72rpx;
	margin: 10rpx 6rpx 0;
	border: 1rpx solid #2fc969;
	border-radius: 4rpx;
	color: #2fc969;
	font-size: 28rpx;
	text-align: center;
}

.settings-section {
	padding-bottom: 34rpx;
}

.settings-section .section-heading {
	display: block;
	margin-bottom: 18rpx;
}

.setting-row {
	min-height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-top: 1rpx solid #f0f0f0;
	font-size: 28rpx;
	color: #111;
	box-sizing: border-box;
}

.time-row {
	min-height: 118rpx;
	align-items: center;
}

.setting-value-wrap {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	min-width: 0;
	flex: 1;
	gap: 14rpx;
}

.setting-value {
	color: #666;
	text-align: right;
	white-space: pre-line;
}

.setting-arrow {
	color: #8c8c8c;
	font-size: 52rpx;
	line-height: 1;
}

.time-value {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 8rpx;
	color: #666;
	font-size: 26rpx;
	line-height: 34rpx;
	text-align: right;
}

.sheet-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 90;
	background: rgba(0, 0, 0, 0.45);
	display: flex;
	align-items: flex-end;
}

.bottom-sheet {
	width: 100%;
	padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
	border-radius: 18rpx 18rpx 0 0;
	background: #fff;
	box-sizing: border-box;
}

.sheet-header {
	position: relative;
	height: 100rpx;
	display: grid;
	grid-template-columns: 96rpx minmax(0, 1fr) 96rpx;
	align-items: center;
	background: #fff;
}

.sheet-side {
	display: block;
}

.sheet-title {
	text-align: center;
	color: #111;
	font-size: 30rpx;
	font-weight: 600;
	line-height: 48rpx;
}

.sheet-confirm {
	color: #2cc766;
	font-size: 28rpx;
	text-align: center;
	line-height: 48rpx;
}

.label-sheet {
	padding: 0;
	background: #f7f7f7;
}

.label-picker {
	width: 100%;
	height: 330rpx;
	background: #fff;
}

/* 标签列表为空时的占位（标签由后台维护，可能一个都没配） */
.label-empty {
	height: 200rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #999;
	font-size: 28rpx;
}

.label-picker-item {
	height: 72rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #777;
	font-size: 34rpx;
	line-height: 72rpx;
	text-align: center;
}

.label-picker-indicator {
	height: 72rpx;
	background: rgba(249, 242, 242, 0.9);
}

.label-cancel {
	height: 112rpx;
	margin-top: 16rpx;
	background: #fff;
	color: #2cc766;
	font-size: 30rpx;
	line-height: 112rpx;
	text-align: center;
}

.sheet-safe-area {
	height: env(safe-area-inset-bottom);
	background: #fff;
}


.time-sheet {
	padding-left: 34rpx;
	padding-right: 34rpx;
}

.time-picker-row {
	display: grid;
	grid-template-columns: 96rpx 1fr 150rpx;
	align-items: center;
	gap: 16rpx;
	min-height: 92rpx;
	border-top: 1rpx solid #f0f0f0;
	color: #111;
	font-size: 28rpx;
}

.time-picker-row:first-of-type {
	margin-top: 24rpx;
}

.time-picker-label {
	color: #111;
}

.time-picker-value {
	height: 58rpx;
	padding: 0 18rpx;
	border-radius: 6rpx;
	background: #f7f7f7;
	color: #333;
	font-size: 26rpx;
	line-height: 58rpx;
	text-align: center;
	box-sizing: border-box;
}

.time-picker-value.clock {
	min-width: 128rpx;
}

.sheet-actions {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 18rpx;
	margin-top: 20rpx;
}

.sheet-btn {
	height: 76rpx;
	line-height: 76rpx;
	border-radius: 8rpx;
	background: #2cc766;
	color: #fff;
	font-size: 28rpx;
}

.sheet-btn.light {
	background: #f5f5f5;
	color: #666;
}

.bottom-action {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: 128rpx;
	padding: 22rpx 24rpx calc(22rpx + env(safe-area-inset-bottom));
	background: #fff;
	box-sizing: border-box;
}

.bottom-action button {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 8rpx;
	background: #2cc766;
	color: #fff;
	font-size: 30rpx;
}

</style>
