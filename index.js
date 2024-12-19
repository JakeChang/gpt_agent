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
        const userMessage = event.message.text;
        let response;

        // 檢查關鍵字並決定回應
        if (userMessage.includes('天氣')) {
            response = '抱歉，我目前無法提供天氣資訊。';
        }
        else if (userMessage.includes('時間')) {
            response = `現在時間是：${new Date().toLocaleString('zh-TW')}`;
        }
        else {
            // 如果沒有匹配的關鍵字，使用 ChatGPT
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "user", content: userMessage }
                ]
            });
            response = completion.choices[0].message.content;
        }

        // 回覆訊息
        const reply = { type: 'text', text: response };
        return client.replyMessage(event.replyToken, reply);

    } 
    catch (error) {
        console.error('處理訊息錯誤:', error);
        const errorMessage = { type: 'text', text: '抱歉，我現在無法回應。請稍後再試。' };
        return client.replyMessage(event.replyToken, errorMessage);
    }
}

// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`機器人伺服器執行於 port ${port}`);
});