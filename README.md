# 🛡️🌐 DISTRIBUTED HONEYPOT 💻🥷

## Table of contents

- [Introduction](#introduction)
- [How to install](#how-to-install)
- [How to turn on the system](#how-to-turn-on-the-system)
- [How Honeypots and Dashboard work](#how-honeypots-and-dashboard-work)
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

- Run all containers (_collector server, honeypot nodes, mosquitto, mongodb_):
  - `docker-compose up`.
    - OR `docker-compose up -d` in background, if you don't want to see logs.
  - Visit http://localhost:3000/ to check if the server is running.

- In another Terminal (**only on first use**):
  - `docker exec -it collector-server node scripts/seed-db.js` to create pre-set users.
    - User 1 (admin): `admin@gmail.com / admin`.
    - User 2 (user): `user@gmail.com / password`. 

- Run a Client to open a Dashboard:
  - `cd src/dashboard-client`
  - `npm run dev`
  - Visit http://localhost:5173/ (or any generated link).

## How Honeypots and Dashboard work
- Click on `Help` button on the Dashboard (at the bottom right).

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