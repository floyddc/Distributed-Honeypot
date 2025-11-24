# NOTES (building up this project)

## How to turn on/off the system
- `docker-compose build --no-cache`
- `docker-compose up` to run all
  - `docker-compose up -d` to run all in background.
  - `docker-compose logs -f collector-server honeypot-node1 honeypot-node2` to see only those logs.
- Visit http://localhost:3000 to check if the collector server is up.
- `docker-compose down` to turn off containers.

## How Honeypot-node1 works
- Visit http://localhost:3001 to visit the fake login page.
- Interact with it and check logs on Terminal.

## How Honeypot-node2 works
- Try to connect to the SSH server: `ssh -p 2222 <any username>@localhost`
- Check logs on Terminal.
- _Delete your host key after first use_: `ssh-keygen -R [localhost]:2222`

## How to run tests
- `cd tests`
  - `npm install` 
  - `npm run test:login`
  - `npm run test:ssh`

## Project tree
```
├───docs
└───src
    ├───collector-server
    │   └───src
    │       ├───config
    │       └───models
    ├───dashboard-client
    │   └───src
    ├───honeypot-node1
    │   └───src
    ├───honeypot-node2
    ├───mongo-data
    └───tests
        └───utils
```