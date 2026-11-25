import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import TuneView from '../views/TuneView.vue';

// depth decides which way the page slides
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { depth: 0 } },
    { path: '/tune', name: 'tune', component: TuneView, meta: { depth: 1 } },
  ],
});
