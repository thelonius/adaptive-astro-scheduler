# Deployment Guide

This guide covers the deployment of the consolidated Adaptive Astro-Scheduler application, including the Frontend, Backend, and Ephemeris Service.

## 🖥 Production Server Information

We have a dedicated server for production hosting.

| Property | Value |
|----------|-------|
| **IP Address** | `95.174.94.86` |
| **User** | `user1` |
| **OS** | Linux |

### SSH Access

You can connect to the server using the Ed25519 identity file.

**Command:**
```bash
ssh -i ~/.ssh/id_ed25519 user1@95.174.94.86
```

### Administrative Access (Sudo)

The user `user1` has `sudo` privileges. 
- **Standard Behavior:** Passwordless sudo should be enabled.
- **Fallback Password:** If prompted, use `Cloud@2024Secure!`

---

## 📦 Deployment Overview

The application is deployed as a set of Docker containers using `docker-compose`.

### Service Architecture

1.  **Frontend (Nginx)** - Serves the React application (Port 80/443 exposed)
2.  **Backend (Node.js)** - API Server (Internal Port 3001)
3.  **Ephemeris Service (Python)** - Calculation Engine (Internal Port 8000)

*(Detailed deployment steps to be added)*
