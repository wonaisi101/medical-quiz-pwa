import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/main.css'
import 'vant/lib/index.css'

// 注册 Vant 组件
import {
  Tabbar, TabbarItem,
  NavBar, Icon, Button, Cell, CellGroup,
  Progress, Tag, Card, SwipeCell,
  Dialog, Toast, ActionSheet,
  Form, Field, Picker, Popup,
  Empty, Loading, Stepper, Switch,
  Calendar, Divider, Badge, NoticeBar,
  Skeleton
} from 'vant'

const app = createApp(App)

// 按需注册 Vant 组件
const vantComponents = [
  Tabbar, TabbarItem,
  NavBar, Icon, Button, Cell, CellGroup,
  Progress, Tag, Card, SwipeCell,
  Dialog, Toast, ActionSheet,
  Form, Field, Picker, Popup,
  Empty, Loading, Stepper, Switch,
  Calendar, Divider, Badge, NoticeBar,
  Skeleton
]

vantComponents.forEach(c => app.use(c))

app.use(createPinia())
app.use(router)
app.mount('#app')
