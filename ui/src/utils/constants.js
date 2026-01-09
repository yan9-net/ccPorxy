/**
 * Transformer 类型标签映射
 */
export const TRANSFORMER_LABELS = {
  claude: 'Claude',
  openai: 'OpenAI',
  openai2: 'OpenAI Responses',
  gemini: 'Gemini',
  deepseek: 'DeepSeek'
}

/**
 * Transformer 选项列表
 */
export const TRANSFORMER_OPTIONS = [
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'openai2', label: 'OpenAI Responses' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'deepseek', label: 'DeepSeek' }
]

/**
 * 获取 Transformer 的显示标签
 * @param {string} transformer - Transformer 类型
 * @returns {string} 显示标签
 */
export function getTransformerLabel(transformer) {
  return TRANSFORMER_LABELS[transformer] || transformer
}
