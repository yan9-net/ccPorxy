/**
 * 格式化数字，将大数字转换为更易读的形式
 * @param {number} num - 要格式化的数字
 * @returns {string} 格式化后的字符串
 */
export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * 格式化 Token 数量
 * @param {number} tokens - Token 数量
 * @returns {string} 格式化后的字符串
 */
export function formatTokens(tokens) {
  return formatNumber(tokens)
}

/**
 * 格式化百分比
 * @param {number} value - 百分比值
 * @returns {string} 格式化后的字符串（带符号）
 */
export function formatPercentage(value) {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

/**
 * 格式化日期
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
export function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

/**
 * 格式化日期时间
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期时间
 */
export function formatDateTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

/**
 * 格式化延迟时间
 * @param {number} ms - 毫秒数
 * @returns {string} 格式化后的延迟时间
 */
export function formatLatency(ms) {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(2)}s`
}
