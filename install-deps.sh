#!/bin/bash
echo "Installing dependencies for all subprojects..."

if [ ! -f "prova/.env" ]; then
    echo "Creating .env file in prova/..."
    sleep 2
    echo "# OPTIONAL: Add your GROQ_API_KEY for AI-powered attack analysis" > prova/.env
    echo "# If not provided, the system will use fallback regex" >> prova/.env
    echo "# GROQ_API_KEY=your_api_key_here" >> prova/.env
    echo ".env file created!"
    sleep 3
else
    echo ".env file already exists in src/"
    sleep 3
fi
echo "Dependecies for collector-server..."
npm install --prefix src/collector-server
sleep 2
echo "Dependecies for dashboard-client..."
npm install --prefix src/dashboard-client
sleep 2
echo "Dependecies for honeypot-node1..."
npm install --prefix src/honeypot-node1
sleep 2
echo "Dependecies for honeypot-node2..."
npm install --prefix src/honeypot-node2
sleep 2
echo "Dependecies for honeypot-node3..."
npm install --prefix src/honeypot-node3
sleep 2
echo "Dependecies for tests..."
npm install --prefix src/tests
echo "All dependencies installed!"
sleep 3