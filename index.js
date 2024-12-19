require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

// LINE 配置
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
};

const app = express();

// 建立 LINE client
const client = new line.Client(config);

// 設定 webhook
app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

// 處理事件
async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }

    // 回覆收到的訊息
    const echo = { type: 'text', text: event.message.text };

    return client.replyMessage(event.replyToken, echo);
}

// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`機器人伺服器執行於 port ${port}`);
});