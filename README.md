# 🛡️🌐 DISTRIBUTED HONEYPOT 💻🥷

## Table of contents

- [Introduction](#introduction)
- [How to install](#how-to-install)
- [How to turn on the system](#how-to-turn-on-the-system)
- [How everything works](#how-everything-works)
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
  - `docker-compose build` (it will create a pre-set admin user: `admin@gmail.com / admin`).

- Run all containers (_collector server, dashboard client, honeypot nodes, mosquitto, mongodb_):
  - `docker-compose up`.
    - OR `docker-compose up -d` in background, if you don't want to see logs.

- Open the Dashboard:
  - Visit http://localhost:8080/.

## How everything works
- **Click on `Help` button on the Dashboard (at the bottom right).**

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