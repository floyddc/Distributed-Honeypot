#!/bin/bash
echo "Installing dependencies for all subprojects..."
npm install --prefix src/collector-server
npm install --prefix src/dashboard-client
npm install --prefix src/honeypot-node1
npm install --prefix src/honeypot-node2
npm install --prefix src/honeypot-node3
npm install --prefix src/tests
echo "All dependencies installed!"