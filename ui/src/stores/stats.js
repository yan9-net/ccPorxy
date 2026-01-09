import {defineStore} from "pinia";
import {ref} from "vue";
import * as statsApi from "@/api/stats";

export const useStatsStore = defineStore("stats", () => {
    // State
    const summary = ref({});
    const daily = ref({});
    const weekly = ref([]);
    const monthly = ref([]);
    const trends = ref([]);
    const loading = ref(false);

    // Actions
    async function fetchSummary() {
        loading.value = true;
        try {
            const data = await statsApi.getStatsSummary();
            summary.value = data || {};
            return data;
        } catch (error) {
            console.error("Failed to fetch stats summary:", error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    async function fetchDaily() {
        try {
            const data = await statsApi.getStatsDaily();
            daily.value = data || {};
            return data;
        } catch (error) {
            console.error("Failed to fetch daily stats:", error);
            throw error;
        }
    }

    async function fetchWeekly() {
        try {
            const data = await statsApi.getStatsWeekly();
            weekly.value = data || [];
            return data;
        } catch (error) {
            console.error("Failed to fetch weekly stats:", error);
            throw error;
        }
    }

    async function fetchMonthly() {
        try {
            const data = await statsApi.getStatsMonthly();
            monthly.value = data || [];
            return data;
        } catch (error) {
            console.error("Failed to fetch monthly stats:", error);
            throw error;
        }
    }

    return {
        summary,
        daily,
        weekly,
        monthly,
        trends,
        loading,
        fetchSummary,
        fetchDaily,
        fetchWeekly,
        fetchMonthly
    };
});
