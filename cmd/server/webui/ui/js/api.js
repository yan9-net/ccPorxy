// API Client for ccNexus (Vue version)
const api = {
    baseURL: '/api',

    async request(method, path, data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseURL}${path}`, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '请求失败');
            }

            return result.data || result;
        } catch (error) {
            console.error(`API Error [${method} ${path}]:`, error);
            throw error;
        }
    },

    // Endpoint management
    async getEndpoints() {
        return this.request('GET', '/endpoints');
    },

    async createEndpoint(data) {
        return this.request('POST', '/endpoints', data);
    },

    async updateEndpoint(name, data) {
        return this.request('PUT', `/endpoints/${encodeURIComponent(name)}`, data);
    },

    async deleteEndpoint(name) {
        return this.request('DELETE', `/endpoints/${encodeURIComponent(name)}`);
    },

    async toggleEndpoint(name, enabled) {
        return this.request('PATCH', `/endpoints/${encodeURIComponent(name)}/toggle`, { enabled });
    },

    async testEndpoint(name) {
        return this.request('POST', `/endpoints/${encodeURIComponent(name)}/test`);
    },

    async reorderEndpoints(names) {
        return this.request('POST', '/endpoints/reorder', { names });
    },

    async getCurrentEndpoint() {
        return this.request('GET', '/endpoints/current');
    },

    async switchEndpoint(name) {
        return this.request('POST', '/endpoints/switch', { name });
    },

    async fetchModels(apiUrl, apiKey, transformer) {
        return this.request('POST', '/endpoints/fetch-models', { apiUrl, apiKey, transformer });
    },

    // Blacklist management
    async getBlacklistStatus() {
        return this.request('GET', '/blacklist/status');
    },

    async removeFromBlacklist(name) {
        return this.request('POST', `/endpoints/${encodeURIComponent(name)}/unblacklist`);
    },

    // Statistics
    async getStatsSummary() {
        return this.request('GET', '/stats/summary');
    },

    async getStatsDaily() {
        return this.request('GET', '/stats/daily');
    },

    async getStatsWeekly() {
        return this.request('GET', '/stats/weekly');
    },

    async getStatsMonthly() {
        return this.request('GET', '/stats/monthly');
    },

    async getStatsTrends() {
        return this.request('GET', '/stats/trends');
    },

    async getStats() {
        return this.request('GET', '/stats');
    },

    // Configuration
    async getConfig() {
        return this.request('GET', '/config');
    },

    async updateConfig(data) {
        return this.request('PUT', '/config', data);
    },

    async getPort() {
        return this.request('GET', '/config/port');
    },

    async updatePort(port) {
        return this.request('PUT', '/config/port', { port });
    },

    async getLogLevel() {
        return this.request('GET', '/config/log-level');
    },

    async updateLogLevel(logLevel) {
        return this.request('PUT', '/config/log-level', { logLevel });
    }
};

// Utility functions
const utils = {
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },

    formatTokens(tokens) {
        return this.formatNumber(tokens);
    },

    formatPercentage(value) {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
    },

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN');
    },

    formatLatency(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        return `${(ms / 1000).toFixed(2)}s`;
    },

    getTransformerLabel(transformer) {
        const labels = {
            'claude': 'Claude',
            'openai': 'OpenAI',
            'openai2': 'OpenAI Responses',
            'gemini': 'Gemini',
            'deepseek': 'DeepSeek'
        };
        return labels[transformer] || transformer;
    },

    getTransformerOptions() {
        return [
            { value: 'claude', label: 'Claude' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'openai2', label: 'OpenAI Responses' },
            { value: 'gemini', label: 'Gemini' },
            { value: 'deepseek', label: 'DeepSeek' }
        ];
    }
};
