import {defineStore} from "pinia";
import {ref} from "vue";

export const useAppStore = defineStore("app", () => {
    // State
    const isDark = ref(false);
    const eventSource = ref(null);
    const blacklist = ref({});

    // Actions
    function initTheme() {
        const savedTheme = localStorage.getItem("theme");
        isDark.value = savedTheme === "dark";
        updateTheme();
    }

    function toggleTheme() {
        isDark.value = !isDark.value;
        localStorage.setItem("theme", isDark.value ? "dark" : "light");
        updateTheme();
    }

    function updateTheme() {
        const darkThemeLink = document.getElementById("dark-theme-link");
        if (isDark.value) {
            document.documentElement.classList.add("dark");
            if (darkThemeLink) darkThemeLink.disabled = false;
        } else {
            document.documentElement.classList.remove("dark");
            if (darkThemeLink) darkThemeLink.disabled = true;
        }
    }

    function initSSE() {
        eventSource.value = new EventSource("/api/events");

        eventSource.value.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "stats") {
                    blacklist.value = data.blacks || {};
                    window.dispatchEvent(new CustomEvent("stats-update", {detail: data}));
                }
            } catch (error) {
                console.error("SSE parse error:", error);
            }
        };

        eventSource.value.onerror = () => {
            setTimeout(() => {
                if (eventSource.value && eventSource.value.readyState === EventSource.CLOSED) {
                    initSSE();
                }
            }, 5000);
        };
    }

    function closeSSE() {
        if (eventSource.value) {
            eventSource.value.close();
            eventSource.value = null;
        }
    }

    return {isDark, blacklist, initTheme, toggleTheme, initSSE, closeSSE};
});
