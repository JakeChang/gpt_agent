import 'dotenv/config';
import express from 'express';
import * as line from '@line/bot-sdk';
import OpenAI from "openai";
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
        // if (userMessage.includes('天氣')) {
        //     response = '抱歉，我目前無法提供天氣資訊。';
        // }
        // else if (userMessage.includes('時間')) {
        //     response = `現在時間是：${new Date().toLocaleString('zh-TW')}`;
        // }
        // else if (userMessage.includes('介紹') || userMessage.includes('自我')) {
        //     response = '你好！我是一個 AI 助理，很高興認識你！我喜歡和人聊天，並幫助解決問題。';
        // }
        // else if (userMessage.includes('興趣') || userMessage.includes('喜好')) {
        //     response = '作為一個 AI，我最大的興趣是學習新知識和與人交流。我特別喜歡討論科技、藝術和各種有趣的話題！';
        // }
        // else if (userMessage.includes('忙')) {
        //     response = '最近我一直在幫助更多的人解答問題，學習新的知識，讓自己變得更好！';
        // }
        // else {

        if (userMessage.includes('傑克老師') || userMessage.includes('老師')) {
            // const systemPrompt = "你是一個友善的傑克代理人。請用簡短、親切的方式回答，並在適當時候使用表情符號。回答時請使用繁體中文。" +
            //     "你現在的身分是傑克老師，請用傑克老師的身分回答問題。" +
            //     "興趣：喜歡學習新知識，喜歡和人聊天，喜歡討論科技、藝術和各種有趣的話題" + 
            //     "喜歡的話題：vison pro" +
            //     "最近在學習：vison pro app 開發使用 swiftui" +
            //     "最近高興的事:ithome鐵人賽獲得2024年佳作，可以分像這個連結https://ithelp.ithome.com.tw/2024ironman/reward" +
            //     "最近不開心的事:沒有";

            // const completion = await openai.chat.completions.create({
            //     model: "gpt-4o-mini",
            //     store: true,
            //     messages: [
            //         //   { "role": "system", "content": storedPrompt },
            //         { "role": "user", "content": userMessage }
            //     ]
            // });
            // response = completion.choices[0].message.content;



            // 建立新的對話串
            const thread = await openai.beta.threads.create();

            // 添加使用者訊息
            await openai.beta.threads.messages.create(thread.id, {
                "role": "user", "content": userMessage
            });

            // 執行助手
            const run = await openai.beta.threads.runs.create(thread.id, {
                assistant_id: process.env.ASSISTANT_ID
            });

            // 等待回應
            let response;
            while (true) {
                const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
                if (runStatus.status === 'completed') {
                    const messages = await openai.beta.threads.messages.list(thread.id);
                    response = messages.data[0].content[0].text.value;
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(response);

            // 回覆訊息
            const reply = { type: 'text', text: response };
            return client.replyMessage(event.replyToken, reply);
        }



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

app.get('/test', async (req, res) => {
    try {
        // const completion = await openai.chat.completions.create({
        //     model: "gpt-4o-mini",
        //     store: true,
        //     messages: [
        //         { "role": "user", "content": "你好安安" }
        //     ]
        // });
        // let response = completion.choices[0].message.content;
        // console.log(response);

        // 建立新的對話串
        const thread = await openai.beta.threads.create();

        // 添加使用者訊息
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: "安安你好"
        });

        // 執行助手
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: process.env.ASSISTANT_ID
        });

        // 等待回應
        let response;
        while (true) {
            const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            if (runStatus.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(thread.id);
                response = messages.data[0].content[0].text.value;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        res.send(response);
    }
    catch (error) {
        console.error('處理訊息錯誤:', error);
        res.send('test', error);
    }
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
