const fs = require("fs");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const url = `https://api.telegram.org/bot${BOT_TOKEN}`;

let data = { streak: 0, lastMarkedDate: null };

if (fs.existsSync("data.json")) {
  data = JSON.parse(fs.readFileSync("data.json"));
}

const today = new Date().toISOString().split("T")[0];

// STEP 1: Check updates (button clicks)
async function checkResponse() {
  const res = await fetch(`${url}/getUpdates`);
  const json = await res.json();

  let updated = false;

  for (let update of json.result.reverse()) {
    if (update.callback_query) {
      const msgDate = new Date(update.callback_query.message.date * 1000)
        .toISOString()
        .split("T")[0];

      if (msgDate === today) {
        if (update.callback_query.data === "done") {
          data.streak += 1;
        } else {
          data.streak = 0;
        }

        data.lastMarkedDate = today;
        updated = true;
        break;
      }
    }
  }

  if (updated) {
    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
  }

  return updated;
}

// STEP 2: Send reminder
async function sendReminder() {
  await fetch(`${url}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: `LeetCode check (streak: ${data.streak})`,
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Done", callback_data: "done" }],
          [{ text: "❌ Not Done", callback_data: "not_done" }]
        ]
      }
    })
  });
}

// MAIN
(async () => {
  const responded = await checkResponse();

  if (!responded && data.lastMarkedDate !== today) {
    await sendReminder();
  }
})();