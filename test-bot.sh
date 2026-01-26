#!/bin/bash

BOT_TOKEN="8533167222:AAFhy1o23kD0x702K1FhhxvZCehryGRm7YE"
CHAT_ID="263567616"  # The user ID from the logs

echo "🔍 Testing bot functionality..."

# Test sendMessage
echo "📤 Sending test message..."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"${CHAT_ID}\",\"text\":\"🤖 Bot test - system check at $(date)\"}"

echo -e "\n\n🔍 Getting recent updates..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-5"