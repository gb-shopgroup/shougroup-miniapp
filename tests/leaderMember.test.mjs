import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
	buildLeaderMemberListRequest,
	getMemberActionText,
	normalizeLeaderMember,
	normalizeLeaderMemberDetail
} from '../utils/leaderMember.js'

assert.deepEqual(buildLeaderMemberListRequest({ keyword: '138', page: 2, pageSize: 20 }), {
	keyword: '138',
	page: 2,
	pageSize: 20
})
assert.deepEqual(buildLeaderMemberListRequest({ page: '', pageSize: '' }), {
	page: 1,
	pageSize: 10
})

const member = normalizeLeaderMember({
	memberId: 8,
	mobile: '13******5678',
	nickname: '团员A',
	avatar: '/a.png',
	lastTimeDesc: '20分钟前',
	lastActionDesc: '查看了麒麟大西瓜团',
	consumeAmount: '88.50',
	orderCount: 3,
	viewCount: 9
})
assert.equal(member.memberId, 8)
assert.equal(member.consumeAmount, '88.50')
assert.equal(member.orderCount, 3)
assert.equal(member.viewCount, 9)

const detail = normalizeLeaderMemberDetail({
	id: 9,
	refundAmount: '12.00',
	dynamicList: [
		{
			date: '今天',
			items: [{ time: '10:30', action: 'order', content: '跟团下单 麒麟大西瓜' }]
		}
	]
})
assert.equal(detail.memberId, 9)
assert.equal(detail.refundAmount, '12.00')
assert.equal(detail.dynamicList[0].items[0].action, 'order')
assert.equal(getMemberActionText('view'), '查看')
assert.equal(getMemberActionText('order'), '跟团')
assert.equal(getMemberActionText('other'), '动态')

const apiSource = fs.readFileSync(new URL('../api/leader.js', import.meta.url), 'utf8')
assert.equal(apiSource.includes("url: '/order/leader/myMember/list'"), true)
assert.equal(apiSource.includes("method: 'POST'"), true)
assert.equal(apiSource.includes("url: '/order/leader/myMember/detail'"), true)
assert.equal(apiSource.includes("method: 'GET'"), true)
assert.equal(apiSource.includes("url: '/order/leader/member/list'"), false)
assert.equal(apiSource.includes("url: '/order/leader/member/detail'"), false)

const pagesSource = fs.readFileSync(new URL('../pages.json', import.meta.url), 'utf8')
assert.equal(pagesSource.includes('"path": "member/index"'), true)
assert.equal(pagesSource.includes('"path": "member/detail"'), true)

const dashboardSource = fs.readFileSync(new URL('../pagesA/dashboard/index.vue', import.meta.url), 'utf8')
assert.equal(dashboardSource.includes('我的团员'), true)
assert.equal(dashboardSource.includes("this.openPage('/pagesA/member/index')"), true)

const memberIndexSource = fs.readFileSync(new URL('../pagesA/member/index.vue', import.meta.url), 'utf8')
assert.equal(memberIndexSource.includes('getLeaderMemberList'), true)
assert.equal(memberIndexSource.includes('buildLeaderMemberListRequest'), true)
assert.equal(memberIndexSource.includes('/pagesA/member/detail?memberId='), true)
assert.equal(memberIndexSource.includes('.back {\n\tposition: absolute;'), true)
assert.equal(memberIndexSource.includes('.title {\n\tposition: absolute;'), true)
assert.equal(memberIndexSource.includes('display: flex;\n\talign-items: center;\n\tjustify-content: space-between;\n\tpadding: 0 24rpx;'), false)

const memberDetailSource = fs.readFileSync(new URL('../pagesA/member/detail.vue', import.meta.url), 'utf8')
assert.equal(memberDetailSource.includes('getLeaderMemberDetail'), true)
assert.equal(memberDetailSource.includes('dynamicList'), true)
assert.equal(memberDetailSource.includes('退款金额'), true)
assert.equal(memberDetailSource.includes('.back {\n\tposition: absolute;'), true)
assert.equal(memberDetailSource.includes('.title {\n\tposition: absolute;'), true)
assert.equal(memberDetailSource.includes('display: flex;\n\talign-items: center;\n\tjustify-content: space-between;\n\tpadding: 0 24rpx;'), false)

console.log('leaderMember tests passed')
