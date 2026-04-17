const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const bot = new TelegramBot(process.env.BOT_TOKEN);
const chatId = process.env.CHAT_ID;

// Load or init data
let data = { streak: 0, lastMarkedDate: null };

if (fs.existsSync("data.json")) {
  data = JSON.parse(fs.readFileSync("data.json"));
}

// Get today's date
const today = new Date().toISOString().split("T")[0];

// If already marked today → skip asking again
if (data.lastMarkedDate === today) {
  console.log("Already marked today");
  process.exit();
}

// Send message
bot.sendMessage(chatId, "LeetCode check:", {
  reply_markup: {
    inline_keyboard: [
      [{ text: "✅ Done", callback_data: "done" }],
      [{ text: "❌ Not Done", callback_data: "not_done" }]
    ]
  }
});

// Listen for response
bot.on("callback_query", (query) => {
  if (query.data === "done") {
    data.streak += 1;
    data.lastMarkedDate = today;
  } else {
    data.streak = 0;
    data.lastMarkedDate = today;
  }

  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

  bot.answerCallbackQuery(query.id);
});