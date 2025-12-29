# 🛡️🌐 DISTRIBUTED HONEYPOT 💻🥷

## Table of contents

- [Introduction](#introduction)
- [How to install](#how-to-install)
- [How to turn on the system](#how-to-turn-on-the-system)
- [How Honeypot-node1 works](#how-honeypot-node1-works)
- [How Honeypot-node2 works](#how-honeypot-node2-works)
- [How Honeypot-node3 works](#how-honeypot-node3-works)
- [Project tree](#project-tree)

## Introduction

Distributed Honeypot is a containerized system designed to simulate simple, intentionally vulnerable services (a fake login page, an SSH service, and a file uploader) so that real-world intrusion attempts can be observed and recorded. The project runs multiple isolated "honeypot" nodes that attract malicious probes and interactions. All captured data (credentials, commands, uploaded files, live interactions) are collected centrally and stored for analysis.

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

### How Honeypot-node1 works
- Visit http://localhost:3001 to visit the fake login page.
- Interact with it and check the dashboard.
- Correct credentials to log in are: `admin / password123`.
- Try to download `passwords.txt` file and check it and the dashboard.

### How Honeypot-node2 works
- Try to connect to the SSH server: `ssh -p 2222 root@localhost` (password: `123456`).
- Interact with it and check the dashboard.
- _Delete your host key after use_: `ssh-keygen -R "[localhost]:2222" `

### How Honeypot-node3 works
- Visit http://localhost:3003 to visit the fake file uploader.
- Upload a file and check check the dashboard.

### Project tree
```
├───.github
│   └───workflows
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
    ├───mosquitto
    ├───tests
    │   └───utils
    └───utils
```