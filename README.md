# NOTES (building up this project)

## Quick Start & Commands

###  Docker Management
> **Important:** Always run these commands from the `src` directory!
> ```bash
> cd src
> ```

*   **Start Everything (Background):**
    ```bash
    docker-compose up -d --build
    ```
*   **Stop Everything:**
    ```bash
    docker-compose down
    ```
*   **View Logs (Real-time):**
    ```bash
    docker-compose logs -f
    ```
*   **Restart Specific Container:**
    ```bash
    docker-compose up -d --build <container_name>
    # Example: docker-compose up -d --build honeypot-node2
    ```

### Database (MongoDB)
*   **Access Shell:**
    ```bash
    docker exec -it mongo mongosh
    ```
*   **Useful Commands (inside shell):**
    ```javascript
    use distributed-honeypot
    db.attacks.find().sort({ timestamp: -1 }).limit(5) 
    db.honeypots.find()                                 
    ```

### Honeypot Interaction
*   **Node 1 (Web Login):** http://localhost:3001
*   **Node 2 (SSH Interactive):**
    ```bash
    ssh -p 2222 root@localhost
    # Password: 123456
    ```
    *Reset host key if needed:* `ssh-keygen -f "$HOME/.ssh/known_hosts" -R "[localhost]:2222"`
    command: '''bash -c 'ssh-keygen -R "[localhost]:2222"'``
*   **Node 3 (File Upload):** http://localhost:3003

### Dashboard & Backend (Local Dev)
*   **Dashboard:** http://localhost:5173 (if running `npm run dev` in `dashboard-client`)
*   **Collector API:** http://localhost:3000

### Running Tests
1.  Ensure system is running (`docker-compose up -d`)
2.  `cd tests`
3.  `npm install`
4.  Run specific tests:
    ```bash
    npm run test:login
    npm run test:ssh
    npm run test:gemini
    ```

### Project tree
```
├───.github
│   └───workflows
├───docs
└───src
    ├───collector-server
    │   ├───scripts
    │   └───src
    │       ├───config
    │       ├───controllers
    │       ├───middleware
    │       ├───models
    │       └───routes
    ├───dashboard-client
    │   └───src
    │       ├───assets
    │       ├───components
    │       ├───layouts
    │       ├───router
    │       ├───stores
    │       └───views
    ├───honeypot-node1
    │   └───src
    ├───honeypot-node2
    ├───honeypot-node3
    │   └───src
    ├───mongo-data
    ├───tests
    │   └───utils
    └───utils
```