# Deployment Guide

This guide explains how to deploy the Tokenized Assets Platform using Docker Compose. This setup includes a local blockchain (Hardhat), deployed contracts, backend API, and frontend application.

## Prerequisites

-   [Docker](https://docs.docker.com/get-docker/) installed.
-   [Docker Compose](https://docs.docker.com/compose/install/) installed.

## Quick Start

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd blockchain
    ```

2.  **Start the application:**
    ```bash
    docker-compose up --build
    ```
    *The `--build` flag ensures that the latest code changes are included in the Docker images.*

3.  **Wait for initialization:**
    -   The `chain` service will start the local blockchain.
    -   The `deployer` service will deploy the smart contracts to the local chain.
    -   Once deployment is complete, the `backend` and `frontend` services will start automatically.

## Accessing the Application

-   **Frontend:** [http://localhost:3000](http://localhost:3000)
-   **Backend API:** [http://localhost:3001](http://localhost:3001)
-   **Blockchain Node:** [http://localhost:8545](http://localhost:8545) (Chain ID: 31337)

## Configuration

### Environment Variables
The `docker-compose.yml` file contains the default configuration for a local development environment. You can override these variables if needed, but the defaults should work out of the box.

-   **Backend:**
    -   `PORT`: API port (default: 3001)
    -   `RPC_URL`: URL of the blockchain node (default: `http://chain:8545`)
    -   `CHAIN_ID`: Chain ID (default: 31337)

-   **Frontend:**
    -   `NEXT_PUBLIC_RPC_URL`: Blockchain URL for the browser (default: `http://localhost:8545`)
    -   `NEXT_PUBLIC_BACKEND_URL`: URL of the backend API (default: `http://localhost:3001`)

### Resetting the Environment
To completely reset the blockchain state and redeploy contracts:

1.  Stop the containers and remove volumes:
    ```bash
    docker-compose down -v
    ```
    *The `-v` flag removes the `contracts-data` volume where contract addresses are stored.*

2.  Start again:
    ```bash
    docker-compose up --build
    ```

## Troubleshooting

-   **"Contracts not found" error:**
    Ensure the `deployer` service completed successfully. Check logs with:
    ```bash
    docker-compose logs deployer
    ```

-   **Frontend not connecting to wallet:**
    Ensure your browser wallet (e.g., MetaMask) is connected to **Localhost 8545** with Chain ID **31337**.
