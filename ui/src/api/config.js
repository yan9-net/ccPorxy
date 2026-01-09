import request from "./index";

/**
 * 获取配置
 */
export function getConfig() {
    return request({url: "/config", method: "get"});
}

/**
 * 更新配置
 */
export function updateConfig(data) {
    return request({url: "/config", method: "put", data});
}

/**
 * 获取端口
 */
export function getPort() {
    return request({url: "/config/port", method: "get"});
}

/**
 * 更新端口
 */
export function updatePort(port) {
    return request({url: "/config/port", method: "put", data: {port}});
}

/**
 * 获取日志级别
 */
export function getLogLevel() {
    return request({url: "/config/log-level", method: "get"});
}

/**
 * 更新日志级别
 */
export function updateLogLevel(logLevel) {
    return request({url: "/config/log-level", method: "put", data: {logLevel}});
}
