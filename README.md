# NOTES (building up this project)

## How to turn on/off the system
- `docker-compose build`
- `docker-compose up` to run all
  - `docker-compose up -d` to run all in background.
  - `docker-compose logs -f collector-server honeypot-node1 honeypot-node2` to see only those logs.
- Visit http://localhost:3000 to check if the collector server is up.
- `docker-compose down` to turn off containers.
- `docker ps -a` to list all containers.
- `docker rm <ID>` to delete a specific container.

## How Honeypot-node1 works
- Visit http://localhost:3001 to visit the fake login page.
- Interact with it and check logs on Terminal.

## How Honeypot-node2 works
- Try to connect to the SSH server: `ssh -p 2222 <any username>@localhost`
- Check logs on Terminal.
- _Delete your host key after first use_: `ssh-keygen -R [localhost]:2222`

## How Honeypot-node3 works
- Visit http://localhost:3003 to visit the fake file uploader.
- Upload a file and check logs on Terminal.

## How to run tests
- Turn on the system with `docker-compose up`
- In another Terminal: `cd tests`
  - `npm install` 
  - `npm run test:login`
  - `npm run test:ssh`
  - `npm run test:evaluator`

## Project tree
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