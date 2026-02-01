
import dotenv from 'dotenv';
import path from 'path';
// import fetch from 'node-fetch'; // Native fetch in Node 18+

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const USER_ID = 'Uea1a604cfd8900c4f702897dee572789';

async function checkQuota() {
    if (!TOKEN) {
        console.error('❌ Missing LINE_CHANNEL_ACCESS_TOKEN');
        return;
    }

    try {
        const res = await fetch('https://api.line.me/v2/bot/message/quota/consumption', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${TOKEN}`,
            },
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('❌ Error checking quota:', text);
            return;
        }

        const data = await res.json();
        console.log('📊 Quota Consumption:', JSON.stringify(data, null, 2));

        // Also check total quota if possible (but consumption is usually what we want)
        // There is also https://api.line.me/v2/bot/message/quota
        const resTotal = await fetch('https://api.line.me/v2/bot/message/quota', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${TOKEN}`,
            },
        });
        if (resTotal.ok) {
            const dataTotal = await resTotal.json();
            console.log('📉 Total Quota:', JSON.stringify(dataTotal, null, 2));
        }

    } catch (error) {
        console.error('❌ Network error checking quota:', error);
    }
}

async function sendTestMessage() {
    if (!TOKEN) return;

    console.log(`📤 Sending test message to ${USER_ID}...`);

    try {
        const res = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${TOKEN}`,
            },
            body: JSON.stringify({
                to: USER_ID,
                messages: [
                    {
                        type: 'text',
                        text: 'System Check: Test Message from API script. If you see this, sending is working.',
                    },
                ],
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('❌ Error sending message:', text);
        } else {
            console.log('✅ Test message sent successfully!');
        }
    } catch (error) {
        console.error('❌ Network error sending message:', error);
    }
}

async function main() {
    console.log('--- LINE System Check ---');
    await checkQuota();
    await sendTestMessage();
    console.log('-------------------------');
}

main();
