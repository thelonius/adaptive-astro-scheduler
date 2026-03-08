# MCP SSH Server Setup Guide

This guide will help you install and configure the MCP SSH server to enable Claude Desktop to connect to your server.

---

## 📋 **Prerequisites**

1. **Claude Desktop** installed (not web version)
   - Download: https://claude.ai/download

2. **Node.js** installed (v18 or higher)
   - Check: `node --version`
   - Install: https://nodejs.org/

3. **SSH key** already set up for your server
   - We created this during deployment

---

## 🚀 **Step 1: Install MCP SSH Server**

### **Option A: Using npx (Recommended - No Installation)**

This is the easiest method - no permanent installation needed.

**Configure Claude Desktop:**

1. Open Claude Desktop settings
2. Go to **Developer** → **Edit Config**
3. Add this configuration:

```json
{
  "mcpServers": {
    "ssh": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-ssh",
        "deployer@91.84.112.120"
      ]
    }
  }
}
```

### **Option B: Global Installation**

If you want to install it permanently:

```bash
# Install globally
npm install -g @modelcontextprotocol/server-ssh

# Verify installation
which mcp-server-ssh
```

**Configure Claude Desktop:**

```json
{
  "mcpServers": {
    "ssh": {
      "command": "mcp-server-ssh",
      "args": ["deployer@91.84.112.120"]
    }
  }
}
```

---

## ⚙️ **Step 2: Configure SSH Connection**

### **Basic Configuration (Uses existing SSH key)**

The MCP server will use your existing SSH configuration from `~/.ssh/config` and your SSH keys.

**Your SSH connection should already work:**
```bash
ssh deployer@91.84.112.120
```

If this works without asking for a password, MCP will work too!

### **Advanced: Custom SSH Config (Optional)**

If you need custom settings, edit `~/.ssh/config`:

```bash
nano ~/.ssh/config
```

Add this:

```
Host lunar-server
    HostName 91.84.112.120
    User deployer
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then update Claude Desktop config to use the alias:

```json
{
  "mcpServers": {
    "ssh": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-ssh",
        "lunar-server"
      ]
    }
  }
}
```

---

## 🔐 **Step 3: Security Considerations**

### **Important Security Notes:**

1. **SSH Key Authentication**: MCP uses your SSH keys (already set up)
2. **No Password Storage**: No passwords stored in config
3. **Limited Access**: Only commands you approve
4. **Audit Trail**: All commands logged

### **What MCP SSH Server Can Do:**

- ✅ Execute shell commands on your server
- ✅ Read/write files
- ✅ Check server status
- ✅ Manage Docker containers
- ✅ View logs

### **Safety Tips:**

- ⚠️ MCP runs with `deployer` user permissions (not root)
- ⚠️ Review commands before execution
- ✅ Keep SSH keys secure
- ✅ Use sudo only when necessary

---

## 🧪 **Step 4: Test MCP Connection**

### **Test in Claude Desktop:**

1. **Restart Claude Desktop** after adding configuration
2. **Start a new conversation**
3. **Look for the 🔌 icon** - it indicates MCP servers are connected
4. **Try a test command:**

Ask Claude:
```
Can you check the server status at 91.84.112.120?
```

Or:
```
Show me the running Docker containers on the server
```

### **Manual Test (Before Claude Desktop):**

Test the MCP server from command line:

```bash
# Test with npx
npx -y @modelcontextprotocol/server-ssh deployer@91.84.112.120

# Should connect and show MCP server running
```

---

## 📍 **Step 5: Locate Claude Desktop Config File**

The config file location depends on your OS:

### **macOS:**
```bash
# Config file location:
~/Library/Application Support/Claude/claude_desktop_config.json

# Edit with:
code ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Or use nano:
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### **Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json

# Or:
C:\Users\YourUsername\AppData\Roaming\Claude\claude_desktop_config.json
```

### **Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

---

## 📝 **Complete Configuration Example**

Here's a full example configuration for Claude Desktop:

```json
{
  "mcpServers": {
    "ssh-lunar-server": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-ssh",
        "deployer@91.84.112.120"
      ],
      "env": {
        "SSH_AUTH_SOCK": "/path/to/ssh-agent.sock"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/eddubnitsky/lunar-calendar-api"
      ]
    }
  }
}
```

This configuration adds:
1. **SSH server** - Connect to your remote server
2. **Filesystem** - Access local project files

---

## 🎯 **Common Tasks After Setup**

Once MCP is configured, you can ask Claude to:

### **Deployment & Management:**
- "Deploy the latest code to the server"
- "Restart the API containers"
- "Check server resource usage"
- "View API logs from the last hour"

### **Debugging:**
- "Why is the API returning 500 errors?"
- "Check if Docker containers are running"
- "Show me the nginx error logs"

### **Monitoring:**
- "What's the current server load?"
- "How much disk space is left?"
- "Are there any failed systemd services?"

### **Updates:**
- "Update the application code and restart"
- "Apply security updates to the server"
- "Rebuild Docker images with latest code"

---

## 🐛 **Troubleshooting**

### **Issue: MCP Server Not Showing Up**

1. **Restart Claude Desktop** completely
2. **Check config file syntax** - must be valid JSON
3. **Test SSH manually:**
   ```bash
   ssh deployer@91.84.112.120 "echo 'SSH works'"
   ```

### **Issue: "Permission Denied"**

```bash
# Make sure SSH key permissions are correct
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 700 ~/.ssh
```

### **Issue: "Connection Refused"**

```bash
# Check if SSH port is open
nc -zv 91.84.112.120 22

# Check firewall
ssh deployer@91.84.112.120 "sudo ufw status"
```

### **Issue: Node.js Not Found**

```bash
# Install Node.js
brew install node  # macOS
# or download from https://nodejs.org/
```

---

## 📚 **Additional Resources**

- **MCP Documentation**: https://modelcontextprotocol.io/
- **MCP SSH Server**: https://github.com/modelcontextprotocol/servers/tree/main/src/ssh
- **Claude Desktop**: https://claude.ai/download

---

## ✅ **Verification Checklist**

Before asking Claude to use SSH:

- [ ] Claude Desktop installed
- [ ] Node.js installed (v18+)
- [ ] Config file created with MCP SSH server
- [ ] SSH key authentication works manually
- [ ] Claude Desktop restarted
- [ ] 🔌 icon visible in Claude Desktop

---

## 🎉 **What's Next?**

Once MCP SSH is configured, you can:

1. **Complete the deployment** via Claude Desktop
2. **Ask Claude to monitor** server health
3. **Get help debugging** issues in real-time
4. **Automate maintenance tasks**

---

**Ready to configure?** Follow the steps above and let me know if you need help!
