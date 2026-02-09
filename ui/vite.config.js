import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { createHtmlPlugin } from "vite-plugin-html";
import viteDevtool from "vite-plugin-vue-devtools";

// https://vitejs.dev/config/
export default defineConfig({
    base: "./", // 使用相对路径
    plugins: [vue(), viteDevtool(), createHtmlPlugin()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "src")
        }
    },
    server: {
        proxy: {
            "/api": {
                target: "http://127.0.0.1:3001",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, "/api")
            }
        }
    },
    build: {
        outDir: "dist"
    }
});
