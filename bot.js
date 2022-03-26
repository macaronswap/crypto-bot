require("dotenv").config();
const TeleBot = require("telebot");
const request = require("request");
const CoinGecko = require("coingecko-api");

const bot = new TeleBot(process.env.TELEGRAM_TOKEN);
const CoinGeckoClient = new CoinGecko();

const TOO_MUCH = "You're using the bot too much!";

let cache = { global: {}, bin: {} };

bot.on("/start", (msg) => {
  msg.reply.text(
    "/price for current price of Macaron (MCRN)\n" +
      "/info for information Macaron (MCRN)\n",
  );
});

// Ticker information from CoinGecko
bot.on(/^\/info$/i, async (msg) => {
  updateCalls(msg);
  const symbolID = "macaronswap";
  // Checks if the same argument has been passed into the command in the last 5 minutes
  if (
    cache[symbolID] &&
    isValidCache(cache[symbolID], cache[symbolID].last_updated)
  ) {
    return msg.reply.text(formatInfo(cache[symbolID]), { asReply: true });
  } else {
    CoinGeckoClient.coins.fetch(symbolID).then((info) => {
      const data = info.data;
      fetchStats().then((apiResp) => {
        data.macaron_api_price = apiResp.price;
        data.macaron_api_market_cap = apiResp.market_cap;
        data.macaron_api_circulating_market_cap =
          apiResp.circulating_market_cap;
        data.macaron_api_total_supply = apiResp.total_supply;
        data.macaron_api_circulating_supply = apiResp.circulating_supply;

        cache[symbolID] = data;

        return msg.reply.text(formatInfo(data), { asReply: true });
      });
    });
  }
});

bot.on(/^\/luke$/i, async (msg) => {
  updateCalls(msg);
  return msg.reply.text("👀");
});

bot.on(/^\/macaronchef$/i, async (msg) => {
  updateCalls(msg);
  return msg.reply.text("👀");
});

bot.on(/^\/price$/i, async (msg) => {
  updateCalls(msg);
  const symbolID = "macaronswap";
  // Checks if the same argument has been passed into the command in the last 5 minutes
  if (
    cache[symbolID] &&
    isValidCache(cache[symbolID], cache[symbolID].last_updated)
  ) {
    return msg.reply.text(formatPrice(cache[symbolID]), {
      asReply: true,
    });
  } else {
    var info = await fetchStats("https://api.macaronswap.finance/prices?chainId=56");
    cache[symbolID] = info;
    const address = "0xacb2d47827C9813AE26De80965845D80935afd0B".toLowerCase();
    return msg.reply.text(formatPrice(info.data[address]), { asReply: true });
  }
});

bot.start();

function fetchStats(url = "https://api.macaronswap.finance/stats") {
  const options = { json: true };

  return new Promise((resolve, reject) => {
    request(url, options, (error, res, body) => {
      if (error) reject(error);
      if (res.statusCode != 200) {
        reject("Invalid status code <" + res.statusCode + ">");
      }
      let json = JSON.parse(JSON.stringify(body));
      resolve(json);
    });
  });
}

function formatInfo(info) {
  let output = info.name + " (" + info.symbol.toUpperCase() + ")\n";
  output += "https://macaronswap.finance\n";
  output += "https://macaronswap.com\n";
  output += "https://coingecko.com/en/coins/" + info.id + "/\n";
  output += "https://coinmarketcap.com/currencies/macaronswap/\n\n";

  const priceInfo = info.market_data;
  output += "Price USD: $" + formatNum(info.macaron_api_price) + "\n";
  output +=
    "Market Cap: $" + formatNumAndTrunc(info.macaron_api_market_cap) + "\n";
  output +=
    "Circulating Market Cap: $" +
    formatNumAndTrunc(info.macaron_api_circulating_market_cap) +
    "\n";
  output +=
    "24h Volume: $" + formatNumAndTrunc(priceInfo.total_volume.usd) + "\n";
  output +=
    "Total Supply: " + formatNumAndTrunc(info.macaron_api_total_supply) + "\n";
  output +=
    "Available Supply: " +
    formatNumAndTrunc(info.macaron_api_circulating_supply) +
    "\n";

  output +=
    "\nChange 24h: " +
    formatNum(priceInfo.price_change_percentage_24h.toFixed(2)) +
    "%\n";
  output +=
    "Change 7d: " +
    formatNum(priceInfo.price_change_percentage_7d.toFixed(2)) +
    "%\n";
  output +=
    "Change 30d: " +
    formatNum(priceInfo.price_change_percentage_30d.toFixed(2)) +
    "%\n";
  output += "\n";

  return output + "Last Updated: " + new Date(info.last_updated).toString();
}

function formatPrice(info) {
  let output = info.name + " (" + info.symbol + ")\n";

  output += "\nPrice USD: $" + formatNum(info.price) + "\n";
  return output + "Price BNB: " + info.price_BNB.substring(0, 8) + "\n";
}

// Check if the cache is valid
function isValidCache(data, lastUpdated) {
  return data && Math.floor(((new Date() - lastUpdated) / 60000) % 60) < 5;
}

// Formats number string
function formatNum(str) {
  return parseFloat(str).toLocaleString();
}

// Formats number string
function formatNumAndTrunc(str) {
  return Math.trunc(parseFloat(str)).toLocaleString();
}

// Checks for more than 30 calls a minute and updates number of calls
function updateCalls(msg) {
  if (calls > 10) {
    return msg.reply.text(TOO_MUCH, { asReply: true });
  }
  calls++;
}

let calls = 0;
resetNumCalls();
setInterval(resetNumCalls, 60000);
function resetNumCalls() {
  console.log("Resetting number of calls at " + new Date().toString());
  calls = 0;
}
