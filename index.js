import 'dotenv/config';
import express from 'express';
import * as line from '@line/bot-sdk';
import OpenAI from 'openai';
import fetch from 'node-fetch';

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
            response = '抱歉���我目前無法提供天氣資訊。';
        }
        else if (userMessage.includes('時間')) {
            response = `現在時間是：${new Date().toLocaleString('zh-TW')}`;
        }
        else if (userMessage.includes('介紹') || userMessage.includes('自我')) {
            response = '你好！我是一個 AI 助理，很高興認識你！我喜歡和人聊天，並幫助解決問題。';
        }
        else if (userMessage.includes('興趣') || userMessage.includes('喜好')) {
            response = '作為一個 AI，我最大的興趣是學習新知識和與人交流。我特別喜歡討論科技、藝術和各種有趣的話題！';
        }
        else if (userMessage.includes('忙')) {
            response = '最近我一直在幫助更多的人解答問題，學習新的知識，讓自己變得更好！';
        }
        else {
            //如果沒有匹配的關鍵字，使用 ChatGPT
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "user", content: userMessage }
                ]
            });
            response = completion.choices[0].message.content;

            //response = '思考中...';

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

// 添加一個 GET route 作為健康檢查端點
app.get('/', (req, res) => {
    res.send('Bot is running!');
});

// 添加防止休眠的函數
function keepAlive() {
    setInterval(() => {
        const url = process.env.APP_URL || 'https://gpt-agent-jmu3.onrender.com';
        fetch(url)
            .then(response => console.log('防止休眠 Ping 成功:', new Date().toLocaleString('zh-TW')))
            .catch(error => console.error('防止休眠 Ping 失敗:', error));
    }, 14 * 60 * 1000); // 每 14 分鐘 ping 一次
}

// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`機器人伺服器執行於 port ${port}`);
    keepAlive(); // 啟動防休眠機制
});