# NOTES (building up this project)

## How to install
- Clone the repo:
  - `git clone https://github.com/floyddc/Distributed-Honeypot`
- Install the dependecies using the automated script (**only on first use**) (it will install all dependencies in each folder of the project):
  - `cd Distributed-Honeypot`
  - `.\install-deps.sh` (Git Bash is required if you’re using Windows).

## How to turn on the system
- **Running Docker Desktop is required**.
- Build all containers:
  - `cd src`
  - `docker-compose build`

- Run all containers (_collector server, honeypot nodes, ollama, mongodb_):
  - `docker-compose up` (it'll download ollama Docker image **only on first use**, be patient).
    - OR `docker-compose up -d` in background, if you don't want to see logs.
  - Visit http://localhost:3000/ to check if the server is running.

- In another Terminal (**only on first use**):
  - `docker exec -it collector-server node scripts/seed-db.js` to create pre-set users.

- Run a client to open a dashboard:
  - `cd src/dashboard-client`
  - `npm run dev`
  - Visit http://localhost:5173/ (or any generated link).

### How to manage containers
- **Running Docker Desktop is required**.
- `cd src`
- Turn off all containers:
  - `docker-compose down`
- List all containers:
  - `docker ps -a`
- Delete a specific container:
  - `docker rm <ID>` 

## How to connect to MongoDB
- `mongosh mongodb://localhost:27017/distributed-honeypot`
- `show collections` to list tables.
- `db.users.find()` to list registered users.
- `db.honeypots.find()` to list registered honeypots.
- `db.attacks.find()` to list collected attacks.
- `db.sessions.find()` to list active/collected SSH/login sessions.

## How to run tests
- **Running system is required**.
- `cd src/tests`
- `npm run test:login`
- `npm run test:ssh`
- `npm run test:llm`
- `npm run test:heartbeat`
- `npm run test:stats`

### How Honeypot-node1 works
- Visit http://localhost:3001 to visit the fake login page.
- Interact with it and check the dashboard.

### How Honeypot-node2 works
- Try to connect to the SSH server: `ssh -p 2222 root@localhost` (password: `123456`).
- Interact with it and check the dashboard.
- _Delete your host key after first use_: `ssh-keygen -R [localhost]:2222`

### How Honeypot-node3 works
- Visit http://localhost:3003 to visit the fake file uploader.
- Upload a file and check check the dashboard.

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