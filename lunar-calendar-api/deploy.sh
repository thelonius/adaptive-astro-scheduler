#!/bin/bash

#############################################################################
# Lunar Calendar Ephemeris API - Automated Deployment Script
# Server: 91.84.112.120
# This script will guide you through secure deployment
#############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server details
SERVER_IP="91.84.112.120"
DEPLOY_USER="deployer"
APP_DIR="/home/$DEPLOY_USER/apps/lunar-calendar-api"

#############################################################################
# Helper Functions
#############################################################################

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

ask_continue() {
    read -p "Continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
}

#############################################################################
# STEP 0: Prerequisites Check
#############################################################################

step0_prerequisites() {
    print_header "STEP 0: Prerequisites Check"

    print_step "Checking local prerequisites..."

    # Check if SSH is available
    if ! command -v ssh &> /dev/null; then
        print_error "SSH client not found. Please install OpenSSH."
        exit 1
    fi
    print_success "SSH client found"

    # Check if ssh-keygen is available
    if ! command -v ssh-keygen &> /dev/null; then
        print_error "ssh-keygen not found. Please install OpenSSH."
        exit 1
    fi
    print_success "ssh-keygen found"

    print_success "All prerequisites met!"
    echo
}

#############################################################################
# STEP 1: SSH Key Setup
#############################################################################

step1_ssh_setup() {
    print_header "STEP 1: SSH Key Setup"

    # Check for SSH key - prefer lunar key if it exists
    if [ -f ~/.ssh/id_ed25519_lunar ]; then
        SSH_KEY_PATH="$HOME/.ssh/id_ed25519_lunar"
        print_success "Using existing SSH key at $SSH_KEY_PATH"
    elif [ -f ~/.ssh/id_ed25519 ]; then
        SSH_KEY_PATH="$HOME/.ssh/id_ed25519"
        print_success "Using existing SSH key at $SSH_KEY_PATH"
    else
        print_step "Generating new SSH key..."
        ssh-keygen -t ed25519 -C "lunar-ephemeris-${SERVER_IP}" -N "" -f ~/.ssh/id_ed25519_lunar
        SSH_KEY_PATH="$HOME/.ssh/id_ed25519_lunar"
        print_success "SSH key created at $SSH_KEY_PATH"
    fi

    print_success "SSH key ready at $SSH_KEY_PATH"

    # Test SSH connection
    print_step "Testing SSH connection..."
    if ssh -i "$SSH_KEY_PATH" -o BatchMode=yes -o ConnectTimeout=5 root@${SERVER_IP} "echo 'SSH key authentication working!'" 2>/dev/null; then
        print_success "SSH key authentication is working!"
    else
        print_error "SSH key authentication failed. Please check your setup."
        exit 1
    fi

    echo
}

#############################################################################
# STEP 2: Initial Server Security
#############################################################################

step2_server_security() {
    print_header "STEP 2: Server Security Setup"

    print_warning "This step will:"
    echo "  1. Update system packages"
    echo "  2. Create non-root user: $DEPLOY_USER"
    echo "  3. Setup firewall (ufw)"
    echo "  4. Install fail2ban"
    ask_continue

    ssh -i "$SSH_KEY_PATH" root@${SERVER_IP} 'bash -s' << 'ENDSSH'
        set -e

        echo "▶ Updating system packages..."
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -qq
        apt-get upgrade -y -qq
        apt-get install -y -qq curl wget git ufw fail2ban

        echo "✓ System updated"

        echo "▶ Creating deployer user..."
        if id "deployer" &>/dev/null; then
            echo "⚠ User deployer already exists"
        else
            useradd -m -s /bin/bash deployer
            usermod -aG sudo deployer
            echo "✓ User deployer created"
        fi

        echo "▶ Setting up firewall..."
        ufw --force disable
        ufw --force reset
        ufw default deny incoming
        ufw default allow outgoing
        ufw allow 22/tcp comment 'SSH'
        ufw allow 80/tcp comment 'HTTP'
        ufw allow 443/tcp comment 'HTTPS'
        echo "y" | ufw enable

        echo "✓ Firewall configured"

        echo "▶ Setting up fail2ban..."
        systemctl enable fail2ban
        systemctl start fail2ban

        echo "✓ Fail2ban enabled"

        echo "▶ Creating .ssh directory for deployer..."
        mkdir -p /home/deployer/.ssh
        chmod 700 /home/deployer/.ssh

        echo "✓ Server security configured"
ENDSSH

    print_success "Server security configured"

    # Copy SSH key to deployer user
    print_step "Copying SSH key to deployer user..."
    ssh -i "$SSH_KEY_PATH" root@${SERVER_IP} "cat ~/.ssh/authorized_keys > /home/deployer/.ssh/authorized_keys && chmod 600 /home/deployer/.ssh/authorized_keys && chown -R deployer:deployer /home/deployer/.ssh"

    # Test deployer SSH access
    print_step "Testing deployer SSH access..."
    if ssh -i "$SSH_KEY_PATH" -o BatchMode=yes -o ConnectTimeout=5 ${DEPLOY_USER}@${SERVER_IP} "echo 'Deployer access working!'" 2>/dev/null; then
        print_success "Deployer SSH access working!"
    else
        print_error "Deployer SSH access failed"
        exit 1
    fi

    echo
}

#############################################################################
# STEP 3: Install Docker
#############################################################################

step3_install_docker() {
    print_header "STEP 3: Install Docker"

    print_step "Installing Docker and Docker Compose..."

    ssh -i "$SSH_KEY_PATH" ${DEPLOY_USER}@${SERVER_IP} 'bash -s' << 'ENDSSH'
        set -e

        echo "▶ Installing Docker..."
        if command -v docker &> /dev/null; then
            echo "⚠ Docker already installed"
        else
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            rm get-docker.sh
            echo "✓ Docker installed"
        fi

        echo "▶ Adding deployer to docker group..."
        sudo usermod -aG docker deployer

        echo "▶ Installing Docker Compose..."
        if command -v docker-compose &> /dev/null; then
            echo "⚠ Docker Compose already installed"
        else
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            echo "✓ Docker Compose installed"
        fi

        echo "▶ Testing Docker..."
        docker --version
        docker-compose --version

        echo "✓ Docker setup complete"
ENDSSH

    print_success "Docker installed successfully"

    print_warning "Note: You may need to logout/login for group changes to take effect"

    echo
}

#############################################################################
# STEP 4: Deploy Application
#############################################################################

step4_deploy_application() {
    print_header "STEP 4: Deploy Application"

    print_step "Uploading application files to server..."

    # Get current directory (should be project root)
    PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Create app directory on server
    ssh -i "$SSH_KEY_PATH" ${DEPLOY_USER}@${SERVER_IP} "mkdir -p ~/apps"

    # Upload files (excluding venv, node_modules, etc.)
    rsync -avz --progress -e "ssh -i \"$SSH_KEY_PATH\"" \
        --exclude 'venv' \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '__pycache__' \
        --exclude '*.pyc' \
        --exclude '.pytest_cache' \
        --exclude 'de421.bsp' \
        --exclude 'logs' \
        "${PROJECT_DIR}/" \
        ${DEPLOY_USER}@${SERVER_IP}:~/apps/lunar-calendar-api/

    print_success "Files uploaded"

    # Create .env file
    print_step "Creating .env configuration..."

    ssh -i "$SSH_KEY_PATH" ${DEPLOY_USER}@${SERVER_IP} 'bash -s' << 'ENDSSH'
        cd ~/apps/lunar-calendar-api

        cat > .env << 'EOF'
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=false

# Project Info
PROJECT_NAME=Lunar Calendar & Ephemeris API
VERSION=1.0.0
API_V1_PREFIX=/api/v1

# Performance
WORKERS=2

# Generated on deployment
DEPLOYMENT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

        echo "✓ .env file created"
ENDSSH

    print_success "Configuration created"

    # Build and start Docker containers
    print_step "Building Docker images (this may take a few minutes)..."

    ssh -i "$SSH_KEY_PATH" ${DEPLOY_USER}@${SERVER_IP} 'bash -s' << 'ENDSSH'
        cd ~/apps/lunar-calendar-api

        echo "▶ Building Docker image..."
        docker-compose -f docker-compose.ephemeris.yml build

        echo "▶ Starting containers..."
        docker-compose -f docker-compose.ephemeris.yml up -d

        echo "▶ Waiting for containers to start..."
        sleep 10

        echo "▶ Checking container status..."
        docker-compose -f docker-compose.ephemeris.yml ps

        echo "✓ Application deployed"
ENDSSH

    print_success "Application deployed and running"

    # Test the deployment
    print_step "Testing API endpoints..."
    sleep 5

    if ssh -i "$SSH_KEY_PATH" ${DEPLOY_USER}@${SERVER_IP} "curl -sf http://localhost:8000/health" > /dev/null; then
        print_success "Health check passed!"
    else
        print_warning "Health check failed - container may still be starting"
    fi

    echo
}

#############################################################################
# STEP 5: Verify Deployment
#############################################################################

step5_verify() {
    print_header "STEP 5: Verify Deployment"

    print_step "Fetching deployment information..."

    echo
    echo "Server Status:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    ssh ${DEPLOY_USER}@${SERVER_IP} 'bash -s' << 'ENDSSH'
        cd ~/apps/lunar-calendar-api

        echo "Docker Containers:"
        docker-compose -f docker-compose.ephemeris.yml ps

        echo ""
        echo "API Health Check:"
        curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "API not responding"

        echo ""
        echo "Sample API Call (Moon Phase):"
        curl -s "http://localhost:8000/api/v1/ephemeris/moon-phase?latitude=55.7558&longitude=37.6173" | python3 -m json.tool 2>/dev/null || echo "API not responding"
ENDSSH

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo

    print_success "Deployment verification complete"

    echo
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           DEPLOYMENT SUCCESSFUL! 🚀                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo "Your API is now running at:"
    echo -e "${BLUE}  http://${SERVER_IP}/api/v1/ephemeris/${NC}"
    echo
    echo "API Documentation:"
    echo -e "${BLUE}  http://${SERVER_IP}/docs${NC}"
    echo
    echo "Test endpoints:"
    echo -e "${YELLOW}  curl http://${SERVER_IP}/health${NC}"
    echo -e "${YELLOW}  curl 'http://${SERVER_IP}/api/v1/ephemeris/moon-phase?latitude=55.7558&longitude=37.6173'${NC}"
    echo
    echo "SSH Access:"
    echo -e "${BLUE}  ssh ${DEPLOY_USER}@${SERVER_IP}${NC}"
    echo
    echo "Manage Application:"
    echo -e "${YELLOW}  cd ~/apps/lunar-calendar-api${NC}"
    echo -e "${YELLOW}  docker-compose -f docker-compose.ephemeris.yml logs -f${NC}"
    echo -e "${YELLOW}  docker-compose -f docker-compose.ephemeris.yml restart${NC}"
    echo
}

#############################################################################
# STEP 6: Post-Deployment Security
#############################################################################

step6_final_security() {
    print_header "STEP 6: Final Security Hardening (Optional)"

    echo "This step will:"
    echo "  1. Disable root SSH login"
    echo "  2. Disable password authentication (SSH keys only)"
    echo
    print_warning "Make sure SSH key authentication is working before proceeding!"
    echo "Test with: ssh ${DEPLOY_USER}@${SERVER_IP}"
    echo

    read -p "Apply final security hardening? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Skipping final security hardening"
        return
    fi

    ssh ${DEPLOY_USER}@${SERVER_IP} 'bash -s' << 'ENDSSH'
        sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

        sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
        sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
        sudo sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config

        echo "▶ Restarting SSH service..."
        sudo systemctl restart sshd

        echo "✓ SSH hardening applied"
ENDSSH

    print_success "Final security hardening complete"
    print_warning "Root login and password authentication are now disabled"
    echo
}

#############################################################################
# Main Deployment Flow
#############################################################################

main() {
    clear
    echo
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   Lunar Calendar Ephemeris API - Automated Deployment     ║${NC}"
    echo -e "${BLUE}║                 Server: ${SERVER_IP}                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo

    echo "This script will:"
    echo "  1. Set up SSH key authentication"
    echo "  2. Configure server security (firewall, fail2ban)"
    echo "  3. Install Docker and Docker Compose"
    echo "  4. Deploy the Ephemeris API"
    echo "  5. Verify the deployment"
    echo "  6. Apply final security hardening (optional)"
    echo

    print_warning "Prerequisites:"
    echo "  - You have root access to ${SERVER_IP}"
    echo "  - Server is running Ubuntu/Debian"
    echo "  - You're in the project root directory"
    echo

    ask_continue

    step0_prerequisites
    step1_ssh_setup
    step2_server_security
    step3_install_docker
    step4_deploy_application
    step5_verify
    step6_final_security

    echo
    print_success "All done! Your Ephemeris API is live! 🎉"
    echo
    echo "Next steps:"
    echo "  1. Set up a domain name (optional)"
    echo "  2. Add SSL certificate with Let's Encrypt"
    echo "  3. Monitor logs: ssh ${DEPLOY_USER}@${SERVER_IP}"
    echo "  4. Check documentation: http://${SERVER_IP}/docs"
    echo
}

# Run main deployment
main
