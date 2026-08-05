#!/bin/bash

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?set TELEGRAM_BOT_TOKEN before running}"
CHAT_ID="${TELEGRAM_CHAT_ID:?set TELEGRAM_CHAT_ID before running}"

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