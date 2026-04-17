const fs = require("fs");
const { execSync } = require("child_process");

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const url = `https://api.telegram.org/bot${BOT_TOKEN}`;

let data = { streak: 0, lastMarkedDate: null, lastUpdateId: 0 };

if (fs.existsSync("data.json")) {
  data = JSON.parse(fs.readFileSync("data.json"));
}

const today = new Date().toISOString().split("T")[0];

// Send plain message
async function sendMessage(text) {
  await fetch(`${url}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
    }),
  });
}

// Save + push to GitHub
function saveData() {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

  try {
    execSync("git config --global user.email 'bot@example.com'");
    execSync("git config --global user.name 'bot'");

    execSync("git add data.json");
    execSync("git commit -m 'update streak'");
    execSync("git push");
  } catch (e) {
    console.log("No changes to commit");
  }
}

// Check button clicks
async function checkResponse() {
  const res = await fetch(`${url}/getUpdates?offset=${data.lastUpdateId + 1}`);
  const json = await res.json();

  let updated = false;

  for (let update of json.result) {
    data.lastUpdateId = update.update_id;

    if (update.callback_query) {
      const msgDate = new Date(update.callback_query.message.date * 1000)
        .toISOString()
        .split("T")[0];

      if (msgDate === today && data.lastMarkedDate !== today) {
        if (update.callback_query.data === "done") {
          data.streak += 1;
        } else {
          data.streak = 0;
        }

        data.lastMarkedDate = today;
        updated = true;
      }
    }
  }

  if (updated) {
    saveData();
    await sendMessage(`✅ Updated! Current streak: ${data.streak}`);
  }

  return updated;
}

// Send reminder with buttons
async function sendReminder() {
  await fetch(`${url}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: `⏰ LeetCode check (current streak: ${data.streak})`,
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
  try {
    const responded = await checkResponse();

    // Always remind if not marked today
    if (data.lastMarkedDate !== today) {
      await sendReminder();
    }

  } catch (err) {
    // Send error directly to Telegram
    await sendMessage(`❌ Error: ${err.message}`);
  }
})();