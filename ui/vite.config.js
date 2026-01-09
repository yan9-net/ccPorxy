import {defineConfig} from "vite";
import vue from "@vitejs/plugin-vue";
import {resolve} from "path";

// https://vitejs.dev/config/
export default defineConfig({
    base: "./", // 使用相对路径
    plugins: [vue()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "src")
        }
    },
    build: {
        outDir: "dist"
    }
});
