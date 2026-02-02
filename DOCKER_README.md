# QuickCon Virtual Attendance System - Docker Deployment

## Quick Start (Any New Device)

### Prerequisites
Install Docker Desktop: https://www.docker.com/products/docker-desktop

### Run the Application

```bash
# 1. Copy this entire folder to the new device

# 2. Open terminal in the project folder

# 3. Start all services
docker-compose up --build

# 4. Wait for all services to start (first time takes 5-10 minutes)

# 5. Open in browser
http://localhost:3000
```

### Services
| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js Web App |
| Backend API | http://localhost:8000 | Laravel API |
| Database | localhost:3306 | MySQL (internal) |

### Stop the Application
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

### Default Credentials
- **Admin**: admin@quickconn.net / password
- **Employee**: Check database or create via admin panel

---
*QuickCon Virtual Attendance System - Portable Docker Edition*
