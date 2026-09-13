const DEFAULT_NAV_METRICS = {
	navBarHeight: 88,
	navTitleTop: 44,
	navTitleHeight: 32,
	windowWidth: 375,
	menuLeft: 0,
	menuRight: 0,
	menuWidth: 0
}

export function createMiniNavMetrics() {
	return Object.assign({}, DEFAULT_NAV_METRICS)
}

export function getMiniNavMetrics() {
	try {
		const systemInfo = uni.getSystemInfoSync()
		const statusBarHeight = Number(systemInfo.statusBarHeight || 0)
		const windowWidth = Number(systemInfo.windowWidth || systemInfo.screenWidth || DEFAULT_NAV_METRICS.windowWidth)
		const menuButton = uni.getMenuButtonBoundingClientRect && uni.getMenuButtonBoundingClientRect()
		if (menuButton && menuButton.top && menuButton.height && menuButton.bottom) {
			const topGap = Math.max(Number(menuButton.top) - statusBarHeight, 4)
			return {
				navBarHeight: Number(menuButton.bottom) + topGap,
				navTitleTop: Number(menuButton.top),
				navTitleHeight: Number(menuButton.height),
				windowWidth,
				menuLeft: Number(menuButton.left || 0),
				menuRight: Number(menuButton.right || 0),
				menuWidth: Number(menuButton.width || 0)
			}
		}
		return {
			navBarHeight: statusBarHeight + 44,
			navTitleTop: statusBarHeight + 6,
			navTitleHeight: 32,
			windowWidth,
			menuLeft: 0,
			menuRight: 0,
			menuWidth: 0
		}
	} catch (err) {
		console.log('初始化小程序导航栏尺寸失败：', err)
		return createMiniNavMetrics()
	}
}

export const miniProgramNavMixin = {
	data() {
		return {
			miniNavMetrics: createMiniNavMetrics()
		}
	},
	onLoad() {
		this.initMiniNavMetrics()
	},
	methods: {
		initMiniNavMetrics() {
			this.miniNavMetrics = getMiniNavMetrics()
		},
		miniNavPageStyle(extraTop = 0) {
			return `padding-top: calc(${this.miniNavMetrics.navBarHeight}px + ${Number(extraTop) || 0}rpx);`
		},
		miniNavBarStyle() {
			return `height: ${this.miniNavMetrics.navBarHeight}px;`
		},
		miniNavTitleStyle() {
			const metrics = this.miniNavMetrics
			return `top: ${metrics.navTitleTop}px; height: ${metrics.navTitleHeight}px; line-height: ${metrics.navTitleHeight}px;`
		},
		miniNavTopStyle() {
			return `top: ${this.miniNavMetrics.navBarHeight}px;`
		}
	}
}
