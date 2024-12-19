require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const OpenAI = require('openai');

// LINE 配置
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
};

const app = express();

// 建立 LINE client
const client = new line.Client(config);

// 引入 OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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

    try {
        // 調用 ChatGPT API
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "user", content: event.message.text }
            ]
        });

        // 取得 AI 的回應
        const aiResponse = completion.choices[0].message.content;
        
        // 回覆訊息
        const reply = { type: 'text', text: aiResponse };
        return client.replyMessage(event.replyToken, reply);
        
    } catch (error) {
        console.error('ChatGPT API 錯誤:', error);
        const errorMessage = { type: 'text', text: '抱歉，我現在無法回應。請稍後再試。' };
        return client.replyMessage(event.replyToken, errorMessage);
    }
}

// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`機器人伺服器執行於 port ${port}`);
});