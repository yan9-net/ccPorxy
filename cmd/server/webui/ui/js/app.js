// ccNexus Vue Application
const { createApp, ref, computed, onMounted, onUnmounted, watch, nextTick } = Vue;
const { ElMessage, ElMessageBox } = ElementPlus;

// Main App
const app = createApp({
    setup() {
        const currentRoute = ref('dashboard');
        const isDark = ref(false);
        const zhCn = ElementPlusLocaleZhCn;

        // Initialize theme from localStorage
        onMounted(() => {
            const savedTheme = localStorage.getItem('theme');
            isDark.value = savedTheme === 'dark';
            updateTheme();
            initSSE();
        });

        // Theme toggle
        const toggleTheme = () => {
            isDark.value = !isDark.value;
            localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
            updateTheme();
        };

        const updateTheme = () => {
            const darkThemeLink = document.getElementById('dark-theme-link');
            if (isDark.value) {
                document.documentElement.classList.add('dark');
                if (darkThemeLink) darkThemeLink.disabled = false;
            } else {
                document.documentElement.classList.remove('dark');
                if (darkThemeLink) darkThemeLink.disabled = true;
            }
        };

        // SSE for real-time updates
        let eventSource = null;
        const initSSE = () => {
            eventSource = new EventSource('/api/events');
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'stats') {
                        window.dispatchEvent(new CustomEvent('stats-update', { detail: data }));
                    }
                } catch (error) {
                    console.error('SSE parse error:', error);
                }
            };
            eventSource.onerror = () => {
                setTimeout(() => {
                    if (eventSource.readyState === EventSource.CLOSED) {
                        initSSE();
                    }
                }, 5000);
            };
        };

        onUnmounted(() => {
            if (eventSource) eventSource.close();
        });

        // Menu navigation
        const handleMenuSelect = (index) => {
            currentRoute.value = index;
        };

        // Current view component
        const currentView = computed(() => {
            const views = {
                'dashboard': 'dashboard-view',
                'endpoints': 'endpoints-view',
                'stats': 'stats-view',
                'testing': 'testing-view'
            };
            return views[currentRoute.value] || 'dashboard-view';
        });

        return {
            currentRoute,
            isDark,
            zhCn,
            toggleTheme,
            handleMenuSelect,
            currentView
        };
    }
});

// Register Element Plus
app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });

// Register all icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}

// Register components
app.component('dashboard-view', DashboardComponent);
app.component('endpoints-view', EndpointsComponent);
app.component('stats-view', StatsComponent);
app.component('testing-view', TestingComponent);

// Mount app
app.mount('#app');
