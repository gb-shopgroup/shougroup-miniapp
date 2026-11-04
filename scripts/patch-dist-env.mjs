#!/usr/bin/env node
// 构建产物环境判定修正 / 提审包切换工具。
//
// 关键背景（微信平台的坑）：审核版本的 envVersion 返回的是 "trial"（审核员通过体验通道打开审核包），
// 前端无法区分「体验版」和「审核版」。因此要同时满足
//   体验版 → 测试域名、审核中 → 生产域名
// 只能上传两个包（代码相同，仅 trial 指向不同）：
//   ① 验收包：trial→test，上传后在公众平台设为「体验版」走测试环境
//   ② 提审包：trial→production，用这个版本「提交审核」，审核期间走生产环境
// 审核通过全量发布后是 release → 生产，不受影响。
//
// 用法（在项目根目录执行，node >= 16）：
//   node scripts/patch-dist-env.mjs                                // 校验/修正产物（默认 trial→test 验收包）
//   node scripts/patch-dist-env.mjs --trial=production             // 生成提审包（trial→production）
//   node scripts/patch-dist-env.mjs --trial=test                   // 恢复验收包（trial→test）
//   node scripts/patch-dist-env.mjs <产物目录> --trial=production  // 指定其他产物目录
//
// 注意：每次 HBuilderX 重新「发行」都会重置产物（trial→test），提审前需重新执行 --trial=production。

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_DIR = 'unpackage/dist/build/mp-weixin'

// 解析参数：目录（不以 -- 开头）与 --trial=test|production
let targetDir = DEFAULT_DIR
let trialEnv = 'test'
for (const arg of process.argv.slice(2)) {
	if (arg.startsWith('--trial=')) {
		trialEnv = arg.slice('--trial='.length).trim()
		if (trialEnv !== 'test' && trialEnv !== 'production') {
			console.error(`[patch-dist-env] 非法的 --trial 取值：${trialEnv}（只支持 test / production）`)
			process.exit(1)
		}
	} else if (arg) {
		targetDir = arg
	}
}

const envFile = path.join(targetDir, 'config/env.js')

const buildPatched = (trialTarget) => `"use strict";
// 环境判定：develop→测试；trial→${trialTarget === 'production' ? '生产（提审包：审核中也要走生产）' : '测试（验收包：体验版走测试）'}；release（线上正式版）→生产
const common = require("../common/vendor.js");
const uni = common.index;
const wxApi = common.wx$1;
let env = "";
try {
\tconst accountInfo = wxApi && wxApi.getAccountInfoSync ? wxApi.getAccountInfoSync() : null;
\tconst version = accountInfo && accountInfo.miniProgram ? accountInfo.miniProgram.envVersion : "";
\tif (version === "develop") env = "development";
\telse if (version === "trial") env = "${trialTarget}";
\telse if (version === "release") env = "production";
\telse console.log("未知的小程序运行环境 envVersion：", version);
} catch (err) {
\tconsole.log("读取小程序运行环境失败：", err);
}
if (!env) env = "production";
// 手动覆盖：仅开发版生效，体验版/审核版/正式版忽略
if (env === "development") {
\tconst override = String(uni.getStorageSync("sg_api_env") || "").trim();
\tif (override === "test" || override === "production") env = override;
}
const config = {
\tdevelopment: { baseURL: "https://test.api.shopgroup.com.cn" },
\ttest: { baseURL: "https://test.api.shopgroup.com.cn" },
\tproduction: { baseURL: "https://api.shopgroup.com.cn" }
};
console.log("[env] " + env + " → " + (config[env] || config.production).baseURL);
exports.env = config[env] || config.production;
`

if (!fs.existsSync(envFile)) {
	console.error(`[patch-dist-env] 未找到产物：${envFile}\n请先用 HBuilderX 发行（发行 → 小程序-微信），或确认产物目录参数是否正确。`)
	process.exit(1)
}

const patched = buildPatched(trialEnv)
const current = fs.readFileSync(envFile, 'utf8')

// 判断产物当前 trial 指向是否已是目标值
const currentTrial = /"trial"\s*\)\s*env\s*=\s*"(test|production)"/.exec(current)
const currentTarget = currentTrial ? currentTrial[1] : ''
const hasFullLogic = current.includes('"release"') && current.includes('getAccountInfoSync')

if (currentTarget === trialEnv && hasFullLogic) {
	console.log(`[patch-dist-env] 产物已是目标状态（trial→${trialEnv}），无需修改：${envFile}`)
} else {
	fs.writeFileSync(envFile, patched)
	console.log(`[patch-dist-env] 已写入产物（trial→${trialEnv}）：${envFile}`)
}

if (trialEnv === 'production') {
	console.log('[patch-dist-env] 当前是【提审包】：请用微信开发者工具上传本包，并在公众平台对本次上传「提交审核」。')
	console.log('[patch-dist-env] 提审后如需继续用体验版验收测试环境，可在「版本管理」把体验版切回验收包，或重新发行后执行 --trial=test。')
} else {
	console.log('[patch-dist-env] 当前是【验收包】：上传后设为「体验版」，走测试环境域名。')
	console.log('[patch-dist-env] 提交审核前请重新执行：node scripts/patch-dist-env.mjs --trial=production')
}
