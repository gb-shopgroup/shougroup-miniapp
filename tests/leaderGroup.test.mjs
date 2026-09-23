import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
	buildLeaderGroupCopyDraft,
	buildLeaderGroupSubmitPayload,
	formatGroupDateTime,
	formatGroupTimeRange,
	getLeaderGroupCoverImages,
	getLeaderGroupManageActions,
	getLeaderGroupStatus,
	normalizeLeaderFollowRecords,
	normalizeLeaderGroup,
	normalizeLeaderGroupTagList,
	normalizeRichTextImages,
	validateGroupTime
} from '../utils/leaderGroup.js'

const start = Math.floor(new Date(2026, 8, 28, 8, 0, 0, 0).getTime() / 1000)
const end = Math.floor(new Date(2026, 8, 29, 8, 0, 0, 0).getTime() / 1000)
assert.ok(start < 2147483647)
assert.ok(end < 2147483647)

assert.equal(formatGroupDateTime(start), '2026/09/28 08:00')
assert.equal(formatGroupTimeRange(start, end), '开始 2026/09/28 08:00\n结束 2026/09/29 08:00')
assert.deepEqual(validateGroupTime('', end), { valid: false, message: '请选择开始时间' })
assert.deepEqual(validateGroupTime(start, ''), { valid: false, message: '请选择结束时间' })
assert.deepEqual(validateGroupTime(end, start), { valid: false, message: '结束时间必须晚于开始时间' })
assert.deepEqual(validateGroupTime(Math.floor(new Date(2026, 8, 6, 8, 0, 0, 0).getTime() / 1000), end), { valid: false, message: '开始时间不能早于今天' })
assert.deepEqual(validateGroupTime(start, end), { valid: true, message: '' })

// 团长端订单汇总来自 groupSummaryResponse，不得再用团购价或字面量 0 兜底。
const summarized = normalizeLeaderGroup({
	id: 12,
	name: '鲜甜爽口玉米0858',
	price: 0.01,
	price2: 0.01,
	virtual: 94,
	order: 0,
	groupSummaryResponse: { totalFee: 0.03, refundFee: 0.01, orderNum: 3 }
})
assert.equal(summarized.realIncome, 0.03)
assert.equal(summarized.refundAmount, 0.01)
assert.equal(summarized.joinCount, 3)
assert.equal(summarized.price, 0.01)
// 汇总优先于旧的 order/joinNum 兜底链。
assert.equal(normalizeLeaderGroup({
	joinNum: 9,
	order: 22,
	groupSummaryResponse: { totalFee: 5, refundFee: 1, orderNum: 4 }
}).joinCount, 4)
// 汇总里的 0 是有效值（已取消订单不计入），不得回退到旧字段。
const zeroSummary = normalizeLeaderGroup({
	order: 22,
	joinNum: 9,
	groupSummaryResponse: { totalFee: 0, refundFee: 0, orderNum: 0 }
})
assert.equal(zeroSummary.joinCount, 0)
assert.equal(zeroSummary.realIncome, 0)
assert.equal(zeroSummary.refundAmount, 0)
// 旧的 order/virtual 不再作为跟团人数来源。
assert.equal(normalizeLeaderGroup({ virtual: 94 }).joinCount, 0)
// 接口未下发汇总时保持 0，不再回退到团购价。
const unsummarized = normalizeLeaderGroup({ price: 0.01, order: 2 })
assert.equal(unsummarized.realIncome, 0)
assert.equal(unsummarized.refundAmount, 0)
assert.equal(unsummarized.joinCount, 2)
assert.equal(normalizeLeaderGroup({ groupSummaryResponse: null }).realIncome, 0)

const normalized = normalizeLeaderGroup({
	id: 9,
	lid: 6,
	cat: 2,
	name: '周末鲜果团',
	shopName: '四季优选',
	shopLogo: '/shop-logo.png',
	memberNum: 2,
	joinNum: 9,
	followNum: 3,
	pickup: 1,
	price: 12,
	price2: 28,
	img: '/a.png',
	img2: '/b.png',
	img3: '/c.png',
	info: '本周到货',
	label: '自提',
	pointId: 5,
	pointName: '门店自提点',
	virtual: 8,
	order: 22,
	isClose: 0,
	isCheck: 1,
	startTime: start,
	endTime: end,
	goods: [{ gid: 3, gname: '香蕉', gtype: 2, img: '/g.png', price: 12, price2: 18, stock: '88斤' }]
})

assert.equal(normalized.label, '自提')
assert.equal(normalized.shopName, '四季优选')
assert.equal(normalized.leaderAvatar, '/shop-logo.png')
assert.equal(normalized.memberCount, 2)
assert.equal(normalized.joinCount, 9)
assert.equal(normalized.followCount, 3)
assert.equal(normalized.pointId, 5)
assert.equal(normalized.pointName, '门店自提点')
assert.equal(normalized.timeText, '开始 2026/09/28 08:00\n结束 2026/09/29 08:00')
// 卡片日期必须取开团时间，不能取结束时间；endDateText 已移除，避免误用。
assert.equal(normalized.startDateText, '9月28日')
assert.equal(normalized.endDateText, undefined)
assert.equal(normalizeLeaderGroup({ startTime: 0, endTime: end }).startDateText, '')
assert.equal(normalizeLeaderGroup({ startTime: start, endTime: end }).startDateText, '9月28日')
assert.deepEqual(getLeaderGroupCoverImages(normalized), ['/g.png'])
assert.deepEqual(getLeaderGroupCoverImages(normalizeLeaderGroup({
	goods: [{ goodsId: 8, goodsName: '苹果', goodsImg: '/apple.png' }]
})), ['/apple.png'])
assert.equal(normalizeLeaderGroup({
	goods: [{ goodsId: 8, goodsName: '苹果', goodsImg: '/apple.png', isStock: 1, stockNum: 18, goodsUnit: '件' }]
}).goods[0].stock, '18件')
assert.equal(normalizeLeaderGroup({
	goods: [{ goodsId: 9, goodsName: '香蕉', goodsImg: '/banana.png', isStock: 0, stockNum: 18, goodsUnit: '件' }]
}).goods[0].stock, '不限')
assert.equal(normalizeLeaderGroup({
	goods: [{ goodsId: 10, goodsName: '梨', goodsImg: '/pear.png', stock: '0' }]
}).goods[0].stock, '不限')
assert.deepEqual(getLeaderGroupCoverImages({
	img: '/a.png',
	img2: '/b.png',
	img3: '/c.png',
	goods: [
		{ img: '/goods-a.png' },
		{ img: '/goods-b.png' },
		{ img: '/goods-a.png' }
	]
}), ['/goods-a.png', '/goods-b.png'])
assert.deepEqual(getLeaderGroupCoverImages({
	img: '/a.png',
	img2: '/b.png',
	img3: '/a.png',
	goods: []
}), ['/a.png', '/b.png'])
assert.deepEqual(getLeaderGroupStatus(normalized, (start + 3600) * 1000), { value: 1, text: '活动中', tone: 'success' })
assert.deepEqual(getLeaderGroupStatus(normalized, (start - 3600) * 1000), { value: 2, text: '未开始', tone: 'warning' })
assert.deepEqual(getLeaderGroupStatus(normalized, (end + 3600) * 1000), { value: 3, text: '已结束', tone: 'muted' })
// isClose=1 是团长已关闭，时间窗内也不能显示「活动中」（B 端文案：已关闭）
assert.deepEqual(getLeaderGroupStatus(Object.assign({}, normalized, { isClose: 1 }), (start + 3600) * 1000), { value: 4, text: '已关闭', tone: 'muted' })
// 未开始即被关闭 → 已关闭（关闭比时间窗更具体）
assert.deepEqual(getLeaderGroupStatus(Object.assign({}, normalized, { isClose: 1 }), (start - 3600) * 1000), { value: 4, text: '已关闭', tone: 'muted' })
// 时间已过是终态，优先于关闭标记
assert.deepEqual(getLeaderGroupStatus(Object.assign({}, normalized, { isClose: 1 }), (end + 3600) * 1000), { value: 3, text: '已结束', tone: 'muted' })
// 关闭不影响操作项：仍是「修改团购信息 + 开启团购 + 复制团购」
assert.deepEqual(getLeaderGroupManageActions({ isClose: 1, statusInfo: { value: 4 } }).map(item => item.key), ['edit', 'open', 'copy'])
assert.deepEqual(getLeaderGroupManageActions({ isClose: 1, statusInfo: { value: 3 } }).map(item => item.key), ['copy'])
assert.deepEqual(getLeaderGroupManageActions({ isClose: 0, statusInfo: { value: 1 } }).map(item => item.key), ['close', 'copy'])
assert.deepEqual(getLeaderGroupManageActions({ isClose: 0, statusInfo: { value: 2 } }).map(item => item.key), ['edit', 'close', 'copy'])
assert.deepEqual(getLeaderGroupManageActions({ isClose: 0, statusInfo: { value: 3 } }).map(item => item.key), ['copy'])
assert.deepEqual(getLeaderGroupManageActions({ isClose: 1, statusInfo: { value: 1 } }).map(item => item.key), ['edit', 'open', 'copy'])
assert.deepEqual(getLeaderGroupManageActions({ isClose: 1, statusInfo: { value: 3 } }).map(item => item.key), ['copy'])

assert.deepEqual(buildLeaderGroupSubmitPayload({
	id: 9,
	cat: 2,
	name: '周末鲜果团',
	pickup: 1,
	info: '本周到货',
	tagId: 3,
	pointId: 5,
	virtual: '8',
	startTime: start,
	endTime: end,
	goods: [
		{ gid: 3, gname: '香蕉', gtype: 2, img: '/banana.png', price: 12, price2: 18 },
		{ goodsId: 4, goodsName: '苹果', goodsType: 1, groupImg: '/apple.png', groupPrice: 9.9, marketPrice: 15 }
	]
}), {
	id: 9,
	cat: 2,
	name: '周末鲜果团',
	pickup: 1,
	info: '本周到货',
	tagId: 3,
	pointId: 5,
	virtual: 8,
	startTime: start,
	endTime: end,
	goods: [
		{ gid: 3, gname: '香蕉', gtype: 2, img: '/banana.png', price: 12, price2: 18 },
		{ gid: 4, gname: '苹果', gtype: 1, img: '/apple.png', price: 9.9, price2: 15 }
	],
	lists: [
		{ goodsId: 3, goodsName: '香蕉', goodsType: 2, groupImg: '/banana.png', groupPrice: 12, marketPrice: 18 },
		{ goodsId: 4, goodsName: '苹果', goodsType: 1, groupImg: '/apple.png', groupPrice: 9.9, marketPrice: 15 }
	]
})

// 编辑态只读：只读字段必须原样回传，不能被前端清空或改掉。
const editRoundTrip = buildLeaderGroupSubmitPayload(normalizeLeaderGroup({
	id: 12,
	cat: 3,
	name: '鲜甜爽口玉米0858',
	pickup: 1,
	info: '<p>本周到货</p>',
	tagId: 3,
	tagName: '热门团购',
	pointId: 5,
	virtual: 8,
	startTime: start,
	endTime: end,
	goods: [{ gid: 3, gname: '香蕉', goodsType: 2, img: '/banana.png', price: 12, price2: 18 }]
}))
assert.equal(editRoundTrip.id, 12)
assert.equal(editRoundTrip.name, '鲜甜爽口玉米0858')
assert.equal(editRoundTrip.cat, 3)
assert.equal(editRoundTrip.info, '<p>本周到货</p>')
assert.equal(editRoundTrip.tagId, 3)
assert.equal(Object.prototype.hasOwnProperty.call(editRoundTrip, 'label'), false)
assert.equal(editRoundTrip.pointId, 5)
assert.equal(editRoundTrip.startTime, start)
assert.equal(editRoundTrip.endTime, end)
assert.equal(editRoundTrip.goods.length, 1)

// ===== 活动详情「跟团记录」followRecords =====
// 后端字段（Java 类为准）：mobile / name / avatar / buyTime / goodsDesc / buyNum
const followGroup = normalizeLeaderGroup({
	id: 34,
	followRecords: [
		{ mobile: '15801281362', name: '菲黎莫属', avatar: 'a.jpg', buyTime: '2026-09-19 23:28:29', goodsDesc: '西瓜/500g', buyNum: 2 },
		{ mobile: '18513712081', name: '', avatar: '', buyTime: '2026-09-19 22:57:24', goodsDesc: '测试黄瓜2/500g', buyNum: 1 }
	]
})
assert.equal(followGroup.followRecords.length, 2)
// name → nickname、buyTime → time、buyNum → goodsNum
assert.equal(followGroup.followRecords[0].nickname, '菲黎莫属')
assert.equal(followGroup.followRecords[0].mobile, '15801281362')
assert.equal(followGroup.followRecords[0].time, '2026-09-19 23:28:29')
assert.equal(followGroup.followRecords[0].goodsDesc, '西瓜/500g')
assert.equal(followGroup.followRecords[0].goodsNum, 2)
// name 为空兜底「团员」；同一手机号多次跟团时 rowKey 不重复
assert.equal(followGroup.followRecords[1].nickname, '团员')
const repeated = normalizeLeaderFollowRecords([
	{ mobile: '15801281362', name: 'A', buyTime: 't1', buyNum: 1 },
	{ mobile: '15801281362', name: 'A', buyTime: 't2', buyNum: 1 }
])
assert.notEqual(repeated[0].rowKey, repeated[1].rowKey)
// 兼容别名与空值
assert.equal(normalizeLeaderFollowRecords([{ nickname: 'B', time: 't', goodsNum: 3 }])[0].nickname, 'B')
assert.equal(normalizeLeaderFollowRecords([{ nickname: 'B', time: 't', goodsNum: 3 }])[0].goodsNum, 3)
assert.deepEqual(normalizeLeaderGroup({ id: 1 }).followRecords, [])
assert.deepEqual(normalizeLeaderFollowRecords(null), [])

// 活动详情页必须渲染真实记录，不能再是写死的占位空态
const groupDetailSource = fs.readFileSync(new URL('../pagesA/group/detail.vue', import.meta.url), 'utf8')
assert.equal(groupDetailSource.includes('v-for="(record, index) in followRecords"'), true)
assert.equal(groupDetailSource.includes('{{ record.goodsDesc }}'), true)
assert.equal(groupDetailSource.includes("{{ record.nickname || '团员' }}"), true)
assert.equal(groupDetailSource.includes('record.mobile'), true)
assert.equal(groupDetailSource.includes('followRecords(){'), true)
assert.equal(groupDetailSource.includes('return Array.isArray(this.group.followRecords) ? this.group.followRecords : []'), true)
assert.equal(groupDetailSource.includes('v-if="followRecords.length === 0" class="empty-record"'), true)
// 【回归】新增样式必须独立成规则，绝不能插进共享选择器列表中间——
// 曾经把 .record-row 插到 `.title-section, .intro-section, .goods-list, .join-records {` 里，
// 导致 .goods-list 被套上 flex 布局，商品卡片横排溢出。
const detailStyle = groupDetailSource.slice(groupDetailSource.indexOf('<style'), groupDetailSource.lastIndexOf('</style>'))
assert.equal(detailStyle.split('{').length, detailStyle.split('}').length)
assert.equal(/,\s*\n\s*\/\*[^*]*\*\/\s*\n\s*\.[\w-]+ \{/.test(detailStyle), false)
// 商品列表仍与标题/介绍/跟团记录共用同一套容器样式
assert.equal(detailStyle.includes('.goods-list,\n.join-records {'), true)
assert.equal(detailStyle.includes('.record-row {'), true)

// 活动详情底部数据来自 genTuanResponse：成员 memberNum、跟团人次 orderNum、订单总金额 totalAmount。
const genTuanGroup = normalizeLeaderGroup({
	id: 12,
	name: '玉米配土豆001',
	genTuanResponse: { memberNum: 6, orderNum: 11, totalAmount: 0.6 }
})
assert.equal(genTuanGroup.memberCount, 6)
assert.equal(genTuanGroup.joinTimes, 11)
assert.equal(genTuanGroup.totalAmount, 0.6)
// 接口未下发时保持 0，不得再用「团购价 × 订单数」估算
assert.equal(normalizeLeaderGroup({ price: 0.3, order: 2 }).totalAmount, 0)
assert.equal(normalizeLeaderGroup({ genTuanResponse: { totalAmount: 0 } }).totalAmount, 0)
assert.equal(normalizeLeaderGroup({ price: 0.3, order: 2, genTuanResponse: { totalAmount: 12.5 } }).totalAmount, 12.5)
// genTuanResponse 的 orderNum 是「跟团人次（订单数）」，不能覆盖列表卡片的「跟团人数」。
assert.equal(normalizeLeaderGroup({
	genTuanResponse: { memberNum: 6, orderNum: 11 },
	groupSummaryResponse: { totalFee: 1, refundFee: 0, orderNum: 3 }
}).joinCount, 3)
// 0 是有效值，不得回退旧字段。
const zeroGenTuan = normalizeLeaderGroup({ memberNum: 9, order: 22, genTuanResponse: { memberNum: 0, orderNum: 0 } })
assert.equal(zeroGenTuan.memberCount, 0)
assert.equal(zeroGenTuan.joinTimes, 0)
// 接口未下发 genTuanResponse 时保留旧字段兜底。
assert.equal(normalizeLeaderGroup({ memberNum: 4, order: 7 }).memberCount, 4)
assert.equal(normalizeLeaderGroup({ order: 7 }).joinTimes, 7)

assert.deepEqual(buildLeaderGroupCopyDraft(normalized), {
	id: 0,
	cat: 2,
	name: '周末鲜果团',
	pickup: 1,
	info: '本周到货',
	tagId: 0,
	tagName: '自提',
	label: '自提',
	pointId: 5,
	pointName: '门店自提点',
	virtual: 8,
	startTime: '',
	endTime: '',
	goods: normalized.goods
})

const richTextWithImage = normalizeRichTextImages('<p>介绍</p><img src="/a.png"><img src="/b.png" width="49%" style="border-radius:12rpx;"><img src="/c.png" width="32%">')
assert.match(richTextWithImage, /<img src="\/a\.png" width="100%" style="width:100%;max-width:100%;height:auto;display:block;margin:10rpx 0;border-radius:8rpx;?">/)
assert.match(richTextWithImage, /<img src="\/b\.png" width="49%" style="border-radius:12rpx;width:49%;max-width:100%;height:auto;display:inline-block;vertical-align:top;margin:6rpx 0.5%;?">/)
assert.match(richTextWithImage, /<img src="\/c\.png" width="32%" style="width:32%;max-width:100%;height:auto;display:inline-block;vertical-align:top;margin:6rpx 0.5%;border-radius:8rpx;?">/)

const apiSource = fs.readFileSync(new URL('../api/leader.js', import.meta.url), 'utf8')
assert.match(apiSource, /url:\s*'\/goods\/Leader\/get\/groupActivity\/list'/)
assert.match(apiSource, /method:\s*'POST'/)
assert.doesNotMatch(apiSource, /\/leader\/group\/share/)
assert.match(apiSource, /export function makeLeaderGroupPoster/)
assert.match(apiSource, /groupActivityQueryUrl/)
assert.match(apiSource, /groupId=\$\{encodeURIComponent\(groupId\)\}/)
assert.match(apiSource, /groupActivityQueryUrl\('\/goods\/Leader\/share\/groupActivity\/poster'/)
assert.match(apiSource, /groupActivityQueryUrl\('\/goods\/Leader\/share\/groupActivity\/make\/poster'/)
assert.match(apiSource, /export function closeLeaderGroupInfo/)
assert.match(apiSource, /groupActivityQueryUrl\('\/goods\/Leader\/groupActivity\/close'/)
assert.match(apiSource, /data:\s*\{\}/)

const addPage = fs.readFileSync(new URL('../pagesA/group/add.vue', import.meta.url), 'utf8')
assert.match(addPage, /validateGroupTime/)
assert.match(addPage, /buildLeaderGroupSubmitPayload/)
assert.match(addPage, /startTime/)
assert.match(addPage, /endTime/)
assert.match(addPage, /显示标签/)
// 开团/修改团不再提供自提点信息（UI 与相关逻辑全部移除），但 pointId 仍随提交体原样下发
assert.doesNotMatch(addPage, /选择自提点/)
assert.doesNotMatch(addPage, /getLeaderPointList/)
assert.doesNotMatch(addPage, /normalizeLeaderPoint/)
assert.doesNotMatch(addPage, /pointPanelVisible/)
assert.doesNotMatch(addPage, /openPointPanel/)
assert.doesNotMatch(addPage, /selectPoint/)
assert.doesNotMatch(addPage, /openCreatePoint/)
assert.doesNotMatch(addPage, /applyCreatedPoint/)
assert.doesNotMatch(addPage, /isPointSelected/)
assert.doesNotMatch(addPage, /point-sheet/)
assert.doesNotMatch(addPage, /pointList/)
assert.doesNotMatch(addPage, /请先新增自提点/)
assert.match(addPage, /pointId: 0,/)
// 编辑态只读：名称/介绍/分类/标签/时间只展示不可改，商品区只允许新增。
assert.match(addPage, /<text v-else class="name-text">/)
assert.match(addPage, /:class="\{ required: isAdd \}"/)
assert.match(addPage, /<view class="intro-tools" v-if="isAdd">/)
assert.match(addPage, /:read-only="!isAdd"/)
assert.match(addPage, /<view class="goods-actions" v-if="isAdd">/)
assert.match(addPage, /class="add-goods-outline" @click="openCreateGoods"/)
assert.match(addPage, /row-readonly/)
assert.match(addPage, /<picker v-if="isAdd" :range="categoryList"/)
// 编辑态只读守卫：标签、时间两个弹层（自提点弹层已随功能移除）
assert.equal((addPage.match(/if \(!this\.isAdd\) return/g) || []).length, 2)
assert.match(addPage, /编辑态只允许添加商品，其余信息只读且原样回传，因此只校验商品。/)
// 编辑态标题与按钮文案区分开团/保存
assert.match(addPage, /\{\{ isAdd \? '开团' : '修改团购' \}\}/)
assert.match(addPage, /<button @click="submitForm">\{\{ isAdd \? '开团' : '保存' \}\}<\/button>/)
assert.match(addPage, /请选择团购标签/)
assert.match(addPage, /openLabelPanel/)
assert.match(addPage, /tagOptions/)
assert.match(addPage, /picker-view/)
assert.match(addPage, /labelPickerValue/)
assert.match(addPage, /confirmLabelPanel/)
assert.doesNotMatch(addPage, /class="tag-list"/)
assert.doesNotMatch(addPage, /selectLabel/)
assert.match(addPage, /团购时间/)
assert.match(addPage, /openTimePanel/)
assert.match(addPage, /minDateText/)
assert.match(addPage, /maxDateText/)
assert.match(addPage, /copyId/)
assert.match(addPage, /syncSelectedGoodsStock/)
assert.match(addPage, /buildGroupGoodsReference/)
assert.doesNotMatch(addPage, /虚拟订单/)
assert.doesNotMatch(addPage, /class="virtual-input"/)
assert.doesNotMatch(addPage, /mode="multiSelector"/)
assert.match(addPage, /<editor/)
assert.match(addPage, /groupIntroEditor/)
assert.match(addPage, /getEditorContent/)
assert.match(addPage, /insertImage/)
assert.match(addPage, /uploadGroupIntroImage/)
assert.match(addPage, /imageLayouts/)
assert.match(addPage, /selectedImageLayout/)
assert.match(addPage, /selectImageLayout/)
assert.match(addPage, /一行两张/)
assert.match(addPage, /一行三张/)
assert.match(addPage, /normalizeRichTextImages/)
assert.doesNotMatch(addPage, /editorCtx:\s*null/)
assert.match(addPage, /_editorCtx/)
assert.doesNotMatch(addPage, /<textarea class="intro-input"/)

const listPage = fs.readFileSync(new URL('../pagesA/group/index.vue', import.meta.url), 'utf8')
assert.match(listPage, /statusTabs/)
assert.match(listPage, /search-section/)
assert.match(listPage, /开团中/)
assert.match(listPage, /bottom-actions/)
assert.match(listPage, /添加团购/)
assert.match(listPage, /复制团购/)
assert.match(listPage, /catId: 0/)
assert.match(listPage, /detailGroup/)
assert.match(listPage, /onShow\(\)/)
assert.match(listPage, /hasLoadedGroupList/)
assert.match(listPage, /getLeaderGroupCoverImages/)
assert.match(listPage, /makeLeaderGroupPoster/)
assert.match(listPage, /uni\.showLoading\(\{ title: '加载海报中\.\.\.', mask: true \}\)/)
assert.match(listPage, /uni\.showLoading\(\{ title: '生成海报中\.\.\.', mask: true \}\)/)
assert.match(listPage, /实际收入： ¥\{\{ formatAmount\(item\.realIncome\) \}\}/)
assert.match(listPage, /退款金额： ¥\{\{ formatAmount\(item\.refundAmount\) \}\}/)
assert.match(listPage, /跟团人数： \{\{ item\.joinCount \}\}/)
assert.match(listPage, /publish-date">\{\{ item\.startDateText \|\| '' \}\}发布/)
assert.doesNotMatch(listPage, /item\.realIncome \|\| item\.income \|\| item\.price/)
assert.doesNotMatch(listPage, /item\.order \|\| item\.virtual/)
assert.match(listPage, /finally \{\s*uni\.hideLoading\(\)\s*\}/)
assert.doesNotMatch(listPage, /LeaderHeader/)
assert.doesNotMatch(listPage, /\/leader\/group\/share/)

const pagesJson = fs.readFileSync(new URL('../pages.json', import.meta.url), 'utf8')
assert.match(pagesJson, /"path":\s*"group\/detail"/)
const detailPage = fs.readFileSync(new URL('../pagesA/group/detail.vue', import.meta.url), 'utf8')
assert.match(detailPage, /getLeaderGroupInfo/)
// 团购详情的「订单」入口必须带 groupId，订单列表据此走完整视图
assert.match(detailPage, /uni\.navigateTo\(\{ url: '\/pagesA\/order\/index\?groupId=' \+ this\.groupId \}\)/)
assert.match(detailPage, /normalizeLeaderGroup/)
assert.match(detailPage, /parseHtml/)
assert.match(detailPage, /normalizeRichTextImages/)
assert.match(detailPage, /src="\/static\/image\/leader_group_back_circle\.png"/)
assert.doesNotMatch(detailPage, /<text class="back"[^>]*>‹<\/text>/)
assert.match(detailPage, /groupIntroNodes/)
assert.match(detailPage, /<rich-text :nodes="groupIntroNodes"/)
assert.doesNotMatch(detailPage, /class="image-grid"/)
assert.doesNotMatch(detailPage, /intro-img/)
assert.match(detailPage, /shareLeaderGroupPoster/)
assert.match(detailPage, /makeLeaderGroupPoster/)
assert.match(detailPage, /uni\.showLoading\(\{ title: '加载海报中\.\.\.', mask: true \}\)/)
assert.match(detailPage, /uni\.showLoading\(\{ title: '生成海报中\.\.\.', mask: true \}\)/)
assert.match(detailPage, /finally \{\s*uni\.hideLoading\(\)\s*\}/)
assert.match(detailPage, /leaderDisplayName\(\)/)
assert.match(detailPage, /leaderAvatarSrc\(\)/)
assert.match(detailPage, /leaderMetaText\(\)/)
// 底部金额必须用接口的 totalAmount，不得再用「团购价 × 订单数」估算
assert.match(detailPage, /return Number\(this\.group\.totalAmount \|\| 0\)\.toFixed\(2\)/)
assert.doesNotMatch(detailPage, /Number\(this\.group\.price \|\| 0\) \* Number\(this\.group\.order \|\| 0\)/)
assert.match(detailPage, /open-type="contact"/)
assert.match(detailPage, /src="\/static\/image\/leader_group_service\.png"/)
assert.match(detailPage, /src="\/static\/image\/leader_group_moments\.png"/)
assert.match(detailPage, /src="\/static\/image\/leader_group_top_share\.png"/)
assert.match(detailPage, /shareToMomentsPoster/)
assert.match(detailPage, /onShareTimeline\(\)/)
assert.match(detailPage, /timelineShareData\(\)/)
assert.match(detailPage, /生成朋友圈海报失败/)
assert.match(detailPage, /生成海报失败/)
assert.doesNotMatch(detailPage, /enableTimelineShare/)
assert.doesNotMatch(detailPage, /请点右上角分享到朋友圈/)
// 活动详情头部只展示成员与跟团人次，均取接口字段，不再展示关注数。
assert.match(detailPage, /成员\$\{memberCount\} \| 跟团人次\$\{joinTimes\}`/)
assert.match(detailPage, /this\.group\.joinTimes/)
assert.doesNotMatch(detailPage, /人关注你/)
assert.doesNotMatch(detailPage, /\$\{followCount\}/)
assert.match(detailPage, /class="goods-share-icon" src="\/static\/image\/leader_group_share\.png"/)
assert.doesNotMatch(detailPage, />↗<\/view>/)
assert.match(detailPage, /src="\/static\/image\/leader_group_order\.png"/)
assert.match(detailPage, /src="\/static\/image\/leader_group_manage\.png"/)
assert.match(detailPage, /src="\/static\/image\/leader_group_wechat\.png"/)
assert.match(detailPage, /visitorText\(\)/)
assert.match(detailPage, /\$\{Number\(this\.group\.order \|\| 0\)\}人来过/)
assert.match(detailPage, /class="bottom-share" open-type="share"/)
assert.match(detailPage, /padding-bottom: calc\(156rpx \+ env\(safe-area-inset-bottom\)\)/)
assert.match(detailPage, /height: calc\(156rpx \+ env\(safe-area-inset-bottom\)\)/)
assert.match(detailPage, /padding: 24rpx 28rpx calc\(18rpx \+ env\(safe-area-inset-bottom\)\)/)
assert.match(detailPage, /align-items: flex-start/)
assert.match(detailPage, /跟团记录/)
assert.match(detailPage, /openManageSheet/)
assert.match(detailPage, /manageActions/)
assert.match(detailPage, /handleManageAction/)
assert.match(detailPage, /getLeaderGroupManageActions/)
assert.match(detailPage, /v-for="action in manageActions"/)
assert.match(detailPage, /closeLeaderGroupInfo/)
assert.match(detailPage, /确认重新开启该团购/)
assert.match(detailPage, /已开启/)
assert.match(detailPage, /开启失败/)
assert.doesNotMatch(detailPage, /删除团购/)
assert.doesNotMatch(detailPage, /当前接口暂不支持删除团购/)
assert.doesNotMatch(detailPage, /goManage/)

assert.match(pagesJson, /"path":\s*"group\/copy"/)
const copyPage = fs.readFileSync(new URL('../pagesA/group/copy.vue', import.meta.url), 'utf8')
assert.match(copyPage, /复制已有团/)
assert.match(copyPage, /getLeaderGroupList/)
assert.match(copyPage, /copyGroup/)
assert.match(copyPage, /copyId/)
assert.match(copyPage, /\{\{ item\.startDateText \}\}/)
assert.doesNotMatch(copyPage, /endDateText/)
assert.doesNotMatch(listPage, /endDateText/)
assert.doesNotMatch(apiSource, /endDateText/)

const posterDialog = fs.readFileSync(new URL('../pagesA/group/poster.vue', import.meta.url), 'utf8')
const imgDialog = fs.readFileSync(new URL('../pagesA/group/img.vue', import.meta.url), 'utf8')
assert.match(posterDialog, /分享给微信/)
assert.match(posterDialog, /发朋友圈海报/)
assert.match(posterDialog, /open-type="share"/)
assert.match(imgDialog, /saveImageToPhotosAlbum/)
assert.doesNotMatch(posterDialog, /插入公众号/)
assert.doesNotMatch(posterDialog, /复制链接/)

// ===== 团购标签改为后台实体（tagId/tagName/tagColor）=====
// 标签列表归一化：兼容 tagId/id、tagName/name、tagColor/color，脏数据过滤
assert.deepEqual(normalizeLeaderGroupTagList([
	{ tagId: 1, tagName: '超快回复', tagColor: '#ff7828' },
	{ id: 2, name: '超多回头客', color: '#4caf50' },
	{ tagId: 3, tagName: '  热门团购  ' },
	{ tagId: 4, tagName: '' }
]), [
	{ id: 1, name: '超快回复', color: '#ff7828' },
	{ id: 2, name: '超多回头客', color: '#4caf50' },
	{ id: 3, name: '热门团购', color: '' }
])
assert.deepEqual(normalizeLeaderGroupTagList(null), [])
assert.deepEqual(normalizeLeaderGroupTagList({ records: [{ tagId: 5, tagName: 'A' }] }), [{ id: 5, name: 'A', color: '' }])
// 团购详情读 tagId/tagName（label 保留为标签名，供页面展示）
const taggedGroup = normalizeLeaderGroup({ id: 34, name: '测试团购2', tagId: 2, tagName: '超多回头客' })
assert.equal(taggedGroup.tagId, 2)
assert.equal(taggedGroup.tagName, '超多回头客')
assert.equal(taggedGroup.label, '超多回头客')
assert.equal(normalizeLeaderGroup({ id: 1, name: 'X', tagName: '热门团购' }).tagId, 0)
assert.equal(normalizeLeaderGroup({ id: 1, name: 'X', label: '热门团购' }).tagName, '热门团购')
// 复制团购草稿带上标签
const copiedDraft = buildLeaderGroupCopyDraft({ id: 9, name: 'X', tagId: 2, tagName: '超多回头客' })
assert.equal(copiedDraft.tagId, 2)
assert.equal(copiedDraft.tagName, '超多回头客')

// 页面：标签选项从接口拉取，前端不再写死三个标签
assert.equal(addPage.includes("labelOptions: ['超快回复', '超多回头客', '热门团购']"), false)
assert.equal(addPage.includes('tagOptions: []'), true)
assert.equal(addPage.includes('this.initTagOptions()'), true)
assert.equal(addPage.includes('normalizeLeaderGroupTagList(res.data)'), true)
assert.equal(addPage.includes('getLeaderGroupActivityTagList()'), true)
assert.equal(addPage.includes('this.formData.tagId = picked ? Number(picked.id || 0) : 0'), true)
assert.equal(addPage.includes('v-for="item in tagOptions"'), true)
assert.equal(addPage.includes('暂无可用标签'), true)
assert.equal(addPage.includes('this.syncTagPickerIndex()'), true)
assert.equal(addPage.includes('syncTagPickerIndex(){'), true)
// 接口层：标签列表接口
const leaderApiSource = fs.readFileSync(new URL('../api/leader.js', import.meta.url), 'utf8')
assert.equal(leaderApiSource.includes("url: '/goods/Leader/groupActivity/tag/list'"), true)
assert.equal(leaderApiSource.includes('export function getLeaderGroupActivityTagList'), true)
