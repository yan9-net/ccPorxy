import {defineStore} from "pinia";
import {ref} from "vue";
import * as endpointsApi from "@/api/endpoints";

export const useEndpointsStore = defineStore("endpoints", () => {
    // State
    const endpoints = ref([]);
    const loading = ref(false);
    const balanceMap = ref({}); // 存储各节点的余额信息
    const usageMap = ref({}); // 存储各节点的使用记录

    // Actions
    async function fetchEndpoints() {
        loading.value = true;
        try {
            const data = await endpointsApi.getEndpoints();
            endpoints.value = (data || {endpoints: []}).endpoints || [];
            return data;
        } catch (error) {
            console.error("Failed to fetch endpoints:", error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    async function createEndpoint(data) {
        try {
            await endpointsApi.createEndpoint(data);
            await fetchEndpoints();
        } catch (error) {
            console.error("Failed to create endpoint:", error);
            throw error;
        }
    }

    async function updateEndpoint(name, data) {
        try {
            await endpointsApi.updateEndpoint(name, data);
            await fetchEndpoints();
        } catch (error) {
            console.error("Failed to update endpoint:", error);
            throw error;
        }
    }

    async function deleteEndpoint(name) {
        try {
            await endpointsApi.deleteEndpoint(name);
            await fetchEndpoints();
        } catch (error) {
            console.error("Failed to delete endpoint:", error);
            throw error;
        }
    }

    async function toggleEndpoint(name, enabled) {
        try {
            await endpointsApi.toggleEndpoint(name, enabled);
            await fetchEndpoints();
        } catch (error) {
            console.error("Failed to toggle endpoint:", error);
            throw error;
        }
    }

    async function testEndpoint(name) {
        try {
            const result = await endpointsApi.testEndpoint(name);
            return result;
        } catch (error) {
            console.error("Failed to test endpoint:", error);
            throw error;
        }
    }

    async function fetchBlacklist() {
        try {
            const data = await endpointsApi.getBlacklistStatus();
            blacklist.value = data || {};
            return data;
        } catch (error) {
            console.error("Failed to fetch blacklist:", error);
            throw error;
        }
    }

    async function removeFromBlacklist(name) {
        try {
            await endpointsApi.removeFromBlacklist(name);
            await fetchBlacklist();
        } catch (error) {
            console.error("Failed to remove from blacklist:", error);
            throw error;
        }
    }

    async function fetchBalance(name) {
        try {
            const data = await endpointsApi.getEndpointBalance(name);
            balanceMap.value[name] = data;
            return data;
        } catch (error) {
            console.error("Failed to fetch balance:", error);
            throw error;
        }
    }

    async function fetchUsage(name, params) {
        try {
            const data = await endpointsApi.getEndpointUsage(name, params);
            usageMap.value[name] = data;
            return data;
        } catch (error) {
            console.error("Failed to fetch usage:", error);
            throw error;
        }
    }

    return {
        endpoints,
        loading,
        balanceMap,
        usageMap,
        fetchEndpoints,
        createEndpoint,
        updateEndpoint,
        deleteEndpoint,
        toggleEndpoint,
        testEndpoint,
        fetchBlacklist,
        removeFromBlacklist,
        fetchBalance,
        fetchUsage
    };
});
