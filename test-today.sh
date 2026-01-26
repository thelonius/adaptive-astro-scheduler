#!/bin/bash

BOT_TOKEN="8533167222:AAFhy1o23kD0x702K1FhhxvZCehryGRm7YE"
CHAT_ID="263567616"

echo "🔍 Testing /today command..."

# Send /today command
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"${CHAT_ID}\",\"text\":\"/today\"}"

echo -e "\n\n⏳ Waiting for processing..."
sleep 3

# Check for any bot response
echo "📝 Getting recent updates to see if bot responded..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-10" | jq '.result[] | select(.message.date > '$(date -d "1 minute ago" +%s)' or .callback_query)'