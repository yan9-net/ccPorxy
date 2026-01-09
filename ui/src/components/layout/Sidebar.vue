<template>
    <aside class="sidebar">
        <div class="sidebar-header">
            <h1 class="logo">ccNexus</h1>
            <p class="subtitle">AI 代理网关</p>
        </div>

        <el-menu :default-active="currentRoute" class="sidebar-menu" router>
            <el-menu-item index="/dashboard">
                <el-icon>
                    <Monitor/>
                </el-icon>
                <span>仪表盘</span></el-menu-item>
            <el-menu-item index="/endpoints">
                <el-icon>
                    <Link/>
                </el-icon>
                <span>节点管理</span></el-menu-item>
            <el-menu-item index="/stats">
                <el-icon>
                    <DataLine/>
                </el-icon>
                <span>统计数据</span></el-menu-item>
            <el-menu-item index="/testing">
                <el-icon>
                    <Cpu/>
                </el-icon>
                <span>测试工具</span></el-menu-item>
        </el-menu>

        <div class="sidebar-footer">
            <el-tooltip :content="appStore.isDark ? '切换到亮色模式' : '切换到暗色模式'" placement="right">
                <el-button circle @click="appStore.toggleTheme">
                    <el-icon v-if="appStore.isDark">
                        <Sunny/>
                    </el-icon>
                    <el-icon v-else>
                        <Moon/>
                    </el-icon>
                </el-button>
            </el-tooltip>
        </div>
    </aside>
</template>

<script setup>
import {computed} from "vue";
import {useRoute} from "vue-router";
import {useAppStore} from "@/stores/app";

const route = useRoute();
const appStore = useAppStore();

const currentRoute = computed(() => route.path);
</script>
