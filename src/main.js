import { createApp } from 'vue';
import App from './App.vue';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';

const app = createApp(App);

app.use(Toast, {
  position: 'bottom-right', // Posição do toast
  timeout: 2000,         // Duração do toast (1s)
});

app.mount('#app');
