import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { initStorage } from './utils/storageInit'
import { isTauri } from './utils/platform'

import './assets/styles/fonts.scss'
import './assets/styles/variables.scss'
import './assets/styles/main.scss'
import './assets/styles/components.scss'

async function bootstrap() {
    // Tauri macOS: добавляем класс для отступа под title bar
    if (isTauri()) {
        const { platform } = await import('@tauri-apps/plugin-os')
        if (platform() === 'macos') {
            document.body.classList.add('tauri-macos')
        }
    }

    // Инициализация хранилища (миграция + демо-данные)
    await initStorage()

    const app = createApp(App)
    app.use(createPinia())
    app.mount('#app')
}

bootstrap()