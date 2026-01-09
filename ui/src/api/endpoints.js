import request from "./index";

/**
 * 获取所有节点
 */
export function getEndpoints() {
    return request({url: "/endpoints", method: "get"});
}

/**
 * 创建节点
 */
export function createEndpoint(data) {
    return request({url: "/endpoints", method: "post", data});
}

/**
 * 更新节点
 */
export function updateEndpoint(name, data) {
    return request({url: `/endpoints/${encodeURIComponent(name)}`, method: "put", data});
}

/**
 * 删除节点
 */
export function deleteEndpoint(name) {
    return request({url: `/endpoints/${encodeURIComponent(name)}`, method: "delete"});
}

/**
 * 切换节点启用状态
 */
export function toggleEndpoint(name, enabled) {
    return request({url: `/endpoints/${encodeURIComponent(name)}/toggle`, method: "patch", data: {enabled}});
}

/**
 * 测试节点
 */
export function testEndpoint(name) {
    return request({url: `/endpoints/${encodeURIComponent(name)}/test`, method: "post"});
}

/**
 * 重新排序节点
 */
export function reorderEndpoints(names) {
    return request({url: "/endpoints/reorder", method: "post", data: {names}});
}

/**
 * 获取当前节点
 */
export function getCurrentEndpoint() {
    return request({url: "/endpoints/current", method: "get"});
}

/**
 * 切换当前节点
 */
export function switchEndpoint(name) {
    return request({url: "/endpoints/switch", method: "post", data: {name}});
}

/**
 * 获取可用模型列表
 */
export function fetchModels(apiUrl, apiKey, transformer) {
    return request({url: "/endpoints/fetch-models", method: "post", data: {apiUrl, apiKey, transformer}});
}

/**
 * 获取黑名单状态
 */
export function getBlacklistStatus() {
    return request({url: "/blacklist/status", method: "get"});
}

/**
 * 从黑名单移除节点
 */
export function removeFromBlacklist(name) {
    return request({url: `/endpoints/${encodeURIComponent(name)}/unblacklist`, method: "post"});
}
