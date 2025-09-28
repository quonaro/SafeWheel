import { createApp } from "vue";
import App from "./App.vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "./styles/global.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import ru from "element-plus/dist/locale/ru.mjs";

const app = createApp(App);

app.use(ElementPlus, {
  locale: ru,
});

// Регистрируем все иконки
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.mount("#app");
