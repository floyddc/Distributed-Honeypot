# Piano di Commit Giornalieri

Segui questo piano per simulare uno sviluppo graduale del progetto nell'arco di 5 giorni.

## Giorno 1: Setup Iniziale e Backend Base
1.  **Commit**: `Initial commit: Project structure setup`
    *   **Comando**: `git add src/collector-server/package.json src/collector-server/.env.example src/docker-compose.yml`
2.  **Commit**: `feat(server): Initialize Express server and MongoDB connection`
    *   **Comando**: `git add src/collector-server/src/index.js src/collector-server/src/config/db.js`
3.  **Commit**: `feat(db): Define Mongoose schemas for User, Honeypot, and Attack`
    *   **Comando**: `git add src/collector-server/src/models/`

## Giorno 2: Autenticazione e Sicurezza
4.  **Commit**: `feat(auth): Implement JWT authentication logic`
    *   **Comando**: `git add src/collector-server/src/controllers/authController.js src/collector-server/src/routes/authRoutes.js src/collector-server/src/middleware/authMiddleware.js`
5.  **Commit**: `refactor(server): Integrate auth routes into main server`
    *   **Comando**: `git add src/collector-server/src/index.js` (Nota: se hai già committato index.js, questo aggiungerà le modifiche successive)

## Giorno 3: Frontend Setup e Layout
6.  **Commit**: `feat(client): Initialize Vue 3 project with Vite and Pinia`
    *   **Comando**: `git add src/dashboard-client/package.json src/dashboard-client/vite.config.js src/dashboard-client/index.html src/dashboard-client/src/main.js src/dashboard-client/src/App.vue src/dashboard-client/src/router/`
7.  **Commit**: `feat(ui): Create Dashboard Layout and Login/Register views`
    *   **Comando**: `git add src/dashboard-client/src/layouts/ src/dashboard-client/src/views/LoginView.vue src/dashboard-client/src/views/RegisterView.vue`
8.  **Commit**: `style(ui): Configure TailwindCSS and basic styling`
    *   **Comando**: `git add src/dashboard-client/tailwind.config.js src/dashboard-client/postcss.config.js src/dashboard-client/src/style.css`

## Giorno 4: Real-time e WebSocket
9.  **Commit**: `feat(socket): Implement WebSocket server logic for honeypot data`
    *   **Comando**: `git add src/collector-server/src/index.js src/collector-server/scripts/mock-honeypot.js`
10. **Commit**: `feat(client): Add WebSocket store and real-time attack table`
    *   **Comando**: `git add src/dashboard-client/src/stores/socket.js src/dashboard-client/src/components/AttackTable.vue src/dashboard-client/src/views/HomeView.vue`

## Giorno 5: Visualizzazione Dati e Design Finale
11. **Commit**: `feat(charts): Add Chart.js integration for attack statistics`
    *   **Comando**: `git add src/dashboard-client/src/components/DashboardCharts.vue src/dashboard-client/src/views/HomeView.vue`
12. **Commit**: `style(theme): Apply Cyberpunk design system and glassmorphism`
    *   **Comando**: `git add src/dashboard-client/src/style.css src/dashboard-client/src/layouts/DashboardLayout.vue src/dashboard-client/src/components/`
13. **Commit**: `docs: Add project documentation and technical report`
    *   **Comando**: `git add project_documentation.md technical_report.md`
