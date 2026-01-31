import express from 'express';
import cors from 'cors';
import OpenAI from "openai";
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // Ensure fetch is available if node version < 18, or assume global

dotenv.config();

const app = express();
const PORT = 3001;

// Configure OpenAI client for Alibaba DashScope (Still used for Planning?)
const openai = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY || "sk-dummy-key",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
});

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Helper for Mock Data (Fallback)
const getMockRoute = (city: string) => ({
    start: `${city} Center`,
    end: `${city} Station`,
    waypoints: [
        {
            name: `${city} Spot A`,
            city: city,
            lat: 25.2673,
            lng: 110.2946,
            stay: 30,
            images: ["https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=1000&auto=format&fit=crop"]
        },
        {
            name: `${city} Spot B`,
            city: city,
            lat: 25.2750,
            lng: 110.2900,
            stay: 40,
            images: ["https://images.unsplash.com/photo-1543051932-6ef9fecfbc80?q=80&w=1000&auto=format&fit=crop"]
        }
    ],
    path: [[110.295, 25.265], [110.290, 25.275]]
});

// Helper for Doubao Image Generation
const generateImageWithDoubao = async (poiName: string, imageBase64: string, guidePrompt: string = ""): Promise<string> => {
    if (!process.env.ARK_API_KEY) {
        throw new Error("ARK_API_KEY is missing");
    }

    const payload = {
        "model": "doubao-seedream-4-0-250828",
        "prompt": `以参考图主体为主角，${guidePrompt ? `请参考此摄影指导拍摄：${guidePrompt}，` : `背景是${poiName}，符合真实游客视角，人物与景点比例自然，自然光线，真实旅游摄影感，像朋友随手拍的打卡照片，不过度摆拍，不商业化`}`,
        // Ensure format is: data:image/<format>;base64,<base64>
        // and format is lowercase (e.g. image/png)
        "image": imageBase64.replace(/^data:image\/([a-zA-Z]+);base64,/, (match, type) => {
            return `data:image/${type.toLowerCase()};base64,`;
        }),
        "response_format": "url",
        "size": "1k",
        "seed": 21,
        "guidance_scale": 5.5,
        "watermark": true,
        "sequential_image_generation": "disabled"
    };

    console.log("Calling Doubao API...");

    // Note: The user curl example showed using 'curl'. Here we use fetch.
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ARK_API_KEY}`
        },
        body: JSON.stringify(payload)
    });

    const data: any = await response.json();
    console.log("Doubao API Response Status:", response.status);

    if (!response.ok) {
        console.error("Doubao API Error Body:", JSON.stringify(data));
        throw new Error(`Doubao API request failed: ${response.statusText}`);
    }

    // Parse response based on user provided format
    // { data: [ { url: "..." } ], usage: ... }
    if (data.data && data.data.length > 0 && data.data[0].url) {
        return data.data[0].url;
    } else {
        console.error("Doubao API Unexpected Format:", JSON.stringify(data));
        throw new Error("No image URL in response");
    }
}

app.get('/api/route', (req, res) => {
    // Default Route
    res.json(getMockRoute("Guilin"));
});

app.post('/api/plan', async (req, res) => {
    const { city, origin } = req.body;
    console.log(`Generating plan from ${origin} to ${city}`);

    if (!process.env.DASHSCOPE_API_KEY) {
        console.warn("No API Key found, using mock data.");
        return res.json(getMockRoute(city));
    }

    try {
        const prompt = `
        你是一个专业的旅行规划师。请规划一个从 "${origin}" 出发去往 "${city}" 的简单旅行路线。
        只需返回一个标准的 JSON 对象，格式如下：
        {
            "start": "${origin}",
            "end": "${city}",
            "waypoints": [
                { "name": "景点名称1", "city": "${city}" },
                { "name": "景点名称2", "city": "${city}" },
                { "name": "景点名称3", "city": "${city}" }
            ]
        }
        请根据该城市的规模和旅游热度，推荐 3-6 个最著名的景点，形成一条合理的游览路线。
        注意：
        1. 只需要返回 JSON，不要包含markdown格式（如 \`\`\`json）。
        2. 不要编造经纬度(lat, lng)或图片链接(images)，这些将由地图API获取。
        3. 确保景点名称准确，方便地图搜索。
        `;

        const response = await openai.chat.completions.create({
            model: "deepseek-v3.2",
            messages: [{ role: "user", content: prompt }]
        });

        const content = response.choices[0].message.content;
        const cleanContent = content?.replace(/```json/g, '').replace(/```/g, '').trim();

        if (cleanContent) {
            const routeData = JSON.parse(cleanContent);
            res.json(routeData);
        } else {
            throw new Error("Empty response from LLM");
        }

    } catch (error) {
        console.error("LLM Generation failed:", error);
        // Fallback to mock
        res.json(getMockRoute(city));
    }
});

app.post('/api/checkin', async (req, res) => {
    const { poiName, image } = req.body;
    // Log snippet of image to verify format without spamming console
    const imagePreview = image && image.length > 50 ? `${image.substring(0, 30)}...` : image;
    console.log(`Generating check-in photo for: ${poiName}, Image: ${imagePreview}`);

    if (!process.env.ARK_API_KEY) {
        console.warn("No ARK_API_KEY found, using mock data for Doubao fallback.");
        return res.json({
            aiGeneratedPhoto: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1000&auto=format&fit=crop"
        });
    }

    try {
        let guide = "";
        if (process.env.DASHSCOPE_API_KEY) {
            try {
                const prompt = `
             你是专业摄影师和 AI 艺术指导，擅长将景点生成人物旅游照 MidJourney Prompt。

用户会提供：
- 景点名称（${poiName}）

你的任务：
1. 根据景点特点自动判断最适合的摄影风格（如浪漫、梦幻、自然、唯美、壮丽等）。
2. 生成一个完整的 MidJourney Prompt，要求：
   - 前缀必须加上：“以参考图中主体为主角，” 
   - 不要再描述人物或游客，主体已经由参考图提供
   - 描述景点环境与特征
   - 包含构图、角度、光线时间、氛围等要素
   - 包含摄影风格或美学风格
   - 简洁、果断，适合直接用于 MidJourney 生成图像
3. 输出只包含提示词文本，不要解释或额外说明

示例输入：
PLACE = "桂林象鼻山"

请直接输出完整 MidJourney Prompt。
                `;
                const response = await openai.chat.completions.create({
                    model: "deepseek-v3.2",
                    messages: [{ role: "user", content: prompt }]
                });
                guide = response.choices[0].message.content || "";
                console.log(`Generated Photo Guide for ${poiName}: ${guide}`);
            } catch (ignore) {
                console.warn("Failed to generate photo guide, proceeding without it.");
            }
        }

        const imageUrl = await generateImageWithDoubao(poiName, image, guide);
        res.json({ aiGeneratedPhoto: imageUrl });
    } catch (error) {
        console.error("Check-in generation failed:", error);
        res.status(500).json({ error: "Generation failed" });
    }
});

// Helper for Bilibili Search
const searchBilibiliVideo = async (keyword: string) => {
    const maxRetries = 3;
    const retryDelay = 3000;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(keyword)}&page=1&order=default`;
            console.log(`Searching Bilibili (Attempt ${i + 1}/${maxRetries}):`, url);

            // Bilibili WAF requires real browser headers
            // A BUVID3 cookie is often helpful if public API fails, but let's try standard headers first
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7,zh-TW;q=0.6',
                    'Cookie': `buvid3=C8256C9D-4609-9ADA-DF86-E968E74AAF3381171infoc; b_nut=1745817281; _uuid=EF1071D58-F4C1-15FA-88E9-1015F9104C106DD81787infoc; buvid4=1B89EB59-2D07-63A6-5388-D8684D23726028146-025040305-1RLVfcegP2xxrAjScSk5hQ%3D%3D; rpdid=|(k|k)~mul~)0J'u~Rl)u~k)k; enable_web_push=DISABLE; enable_feed_channel=ENABLE; DedeUserID=16159014; DedeUserID__ckMd5=8eaf31fd2bcfd66b; CURRENT_QUALITY=80; header_theme_version=OPEN; theme-tip-show=SHOWED; theme-avatar-tip-show=SHOWED; home_feed_column=5; browser_resolution=1470-797; hit-dyn-v2=1; SESSDATA=6ec26aa7%2C1785374326%2Cdad8c%2A11CjBrQr9nLwhW67nGVkeOMMnb_tqS__QZ1SA1T-rOBC_XI4p14zj3mIeJrbWWZxN76PYSVmc3NTJXTHE0akR2cDZpVzlFMWg2UDM5eHVHTEthREowT1p0OGhSOGYtZDJTX2Q5VW5uenV6OHgxaUJJLTZabHpxRm1lM1NucnEwMlhRWXZwd1pkb1BBIIEC; bili_jct=45af0207c8eaa98669c4e006f4f8b58b; sid=5esehmc6; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzAwODE4MzAsImlhdCI6MTc2OTgyMjU3MCwicGx0IjotMX0.qg_0y8kY1dJxILuKaplC74saIdiRt7ZO6mYRUWd-e9U; bili_ticket_expires=1770081770; bp_t_offset_16159014=1163881711390425088; bsource=search_google; fingerprint=a63cb2873bc64dbe7069dcdd53f7cdf1; buvid_fp_plain=undefined; CURRENT_FNVAL=4048; buvid_fp=a63cb2873bc64dbe7069dcdd53f7cdf1; b_lsid=A90AF707_19C12084B7C`,
                    // Basic cookie often helps
                }
            });

            const data: any = await response.json();

            if (data.code === 0 && data.data && data.data.result && data.data.result.length > 0) {
                // Find the most relevant video, preferably shorter one if possible, but for now take the first suitable one
                const firstResult = data.data.result[0];
                return firstResult;
            }
            // If API returns valid response but no results, don't retry, just return null?
            // User said "if abnormal" (exception). So data with no results might be "normal".
            // However, often WAF returns code != 0. 
            // Let's assume explicit return null here means stop.
            // return null;
            if (i < maxRetries - 1) {
                console.log(`Retrying in ${retryDelay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                return null;
            }

        } catch (e: any) {
            console.error(`Bilibili Search failed (Attempt ${i + 1}/${maxRetries})`, e.message);
            if (i < maxRetries - 1) {
                console.log(`Retrying in ${retryDelay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                return null;
            }
        }
    }
    return null;
};

app.post('/api/travel-video', async (req, res) => {
    const { origin, destination } = req.body;
    console.log(`Fetching travel video for ${origin} -> ${destination}`);

    // 1. Generate Keyword via LLM
    try {
        const prompt = `
        你是一个旅游视频搜索关键词生成器。 用户会输入： - 起点: ${origin} - 终点: ${destination} 

            你的任务：

            1. 推断起点到终点最合理的交通方式（如：高铁 / 动车 / 飞机 / 自驾 / 大巴）。
            2. 生成一个【完整的、可直接用于 Bilibili 搜索】的关键词字符串。
            3. 视频要求：
            - 展示交通行驶过程
            - 第一视角 / POV / 窗外景色
            - 视频片段短，长度在 30–120 秒
            - 不包含 vlog、探店、人物出镜为主的内容
            - 不包含广告、赞助、商业内容
            - 景点美景、沿途风景、沿途风光、沿途景色
            - 美食、美食美景、美食风景、美食风光、美食景色
            4. 只输出关键词字符串，不要 JSON，也不要解释。
            5. 关键词尽量完整，包含： 终点 + POV/短片段提示词。
            请输出符合要求的完整搜索关键词字符串。
        `;

        let keyword = `${origin}到${destination}沿途风景`; // Fallback

        if (process.env.DASHSCOPE_API_KEY) {
            const response = await openai.chat.completions.create({
                model: "deepseek-v3.2",
                messages: [{ role: "user", content: prompt }]
            });
            const content = response.choices[0].message.content;
            if (content) keyword = content.trim().replace(/['"]/g, '');
        }

        console.log("Generated Keyword:", keyword);

        // 2. Search Bilibili
        const videoInfo = await searchBilibiliVideo(keyword);

        if (videoInfo) {
            res.json({
                keyword,
                video: videoInfo
            });
        } else {
            res.status(404).json({ error: "No video found" });
        }

    } catch (error) {
        console.error("Travel Video API failed:", error);
        res.status(500).json({ error: "Failed to fetch video" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
