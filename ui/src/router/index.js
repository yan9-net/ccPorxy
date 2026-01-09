import {createRouter, createWebHashHistory} from "vue-router";

const routes = [
    {
        path: "/",
        redirect: "/dashboard"
    },
    {
        path: "/dashboard",
        name: "Dashboard",
        component: () => import("@/views/Dashboard.vue"),
        meta: {title: "仪表盘"}
    },
    {
        path: "/endpoints",
        name: "Endpoints",
        component: () => import("@/views/Endpoints.vue"),
        meta: {title: "节点管理"}
    },
    {
        path: "/stats",
        name: "Stats",
        component: () => import("@/views/Stats.vue"),
        meta: {title: "统计数据"}
    },
    {
        path: "/testing",
        name: "Testing",
        component: () => import("@/views/Testing.vue"),
        meta: {title: "测试工具"}
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

// Set document title
router.beforeEach((to, from, next) => {
    if (to.meta.title) {
        document.title = `${to.meta.title} - ccNexus`;
    }
    next();
});

export default router;
