import request from "./index";

/**
 * 获取统计摘要
 */
export function getStatsSummary() {
    return request({url: "/stats/summary", method: "get"});
}

/**
 * 获取每日统计
 */
export function getStatsDaily() {
    return request({url: "/stats/daily", method: "get"});
}

/**
 * 获取每周统计
 */
export function getStatsWeekly() {
    return request({url: "/stats/weekly", method: "get"});
}

/**
 * 获取每月统计
 */
export function getStatsMonthly() {
    return request({url: "/stats/monthly", method: "get"});
}

/**
 * 获取趋势数据
 */
export function getStatsTrends() {
    return request({url: "/stats/trends", method: "get"});
}

/**
 * 获取完整统计
 */
export function getStats() {
    return request({url: "/stats", method: "get"});
}
