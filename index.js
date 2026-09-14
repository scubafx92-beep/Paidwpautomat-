// 🛡️ ANTI-TIMEOUT OVERRIDE (For Render Cloud Network Jam Bypass)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Telegraf } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const express = require('express');

// 🔗 WEB SERVER FOR RENDER PORT BINDING (Iske bina Render deploy nahi hone deta)
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running flawlessly on Render! 🚀'));
app.listen(PORT, () => console.log(`[+] Express Server listening on port ${PORT}`));

// 🔑 CONFIGURATION
const BOT_TOKEN = '8722740855:AAHMyWM_iHLSTD5i-D6x8GJZhhbQWazrWMI';
const ADMIN_CHAT_ID = '8457670186'; 
const SELLER_USERNAME = '@vanshfx1';  

// 🤖 TELEGRAM BOT WITH ULTRA-HIGH TIMEOUT LIMIT
const tgBot = new Telegraf(BOT_TOKEN, {
    handlerTimeout: 90000, 
    telegram: { apiKeyMode: 'strict' }
});

let sock = null;
let isConnected = false;

// 📁 DATABASE SETUP
const DB_FILE = 'paid_users.json';
let paidUsers = {};
if (fs.existsSync(DB_FILE)) {
    try { paidUsers = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch(e){}
}
function saveDatabase() { fs.writeFileSync(DB_FILE, JSON.stringify(paidUsers, null, 2)); }

function checkAccess(ctx) {
    const userId = ctx.chat.id.toString();
    if (userId === ADMIN_CHAT_ID) return true;
    if (paidUsers[userId]) {
        if (Date.now() < paidUsers[userId].expiry) return true;
        delete paidUsers[userId]; saveDatabase();
    }
    return false;
}

// 🤖 WHATSAPP INSTANCE ENGINE
async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_nexus');
        sock = makeWASocket({ auth: state, printQRInTerminal: false });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                console.log('[*] WhatsApp QR/Pairing ready.');
            }
            if (connection === 'open') {
                isConnected = true;
                console.log('[+] WhatsApp Online.');
                sendTelegramMessage(ADMIN_CHAT_ID, '✅ <b>WhatsApp successfully connected to Render Cloud!</b>\n\nAb paid users campaign chala sakte hain.');
            }
            if (connection === 'close') {
                isConnected = false;
                const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log('[-] Reconnecting WhatsApp...');
                    setTimeout(connectToWhatsApp, 5000);
                }
            }
        });
        sock.ev.on('creds.update', saveCreds);
    } catch (error) {
        console.log("WhatsApp init error:", error.message);
    }
}

// 📡 JAM-PROOF TELEGRAM MESSAGE SENDER
async function sendTelegramMessage(chatId, text) {
    try {
        await tgBot.telegram.sendMessage(chatId, text, { parse_mode: 'HTML' });
    } catch (err) {
        console.log('[!] Telegram Network Jam. Retrying connection in 5s...');
        setTimeout(() => {
            tgBot.telegram.sendMessage(chatId, text, { parse_mode: 'HTML' }).catch(e => console.log('Final Fail:', e.message));
        }, 5000); 
    }
}

// 📡 TELEGRAM BOT COMMANDS
tgBot.command('start', (ctx) => {
    const userId = ctx.chat.id.toString();
    if (userId === ADMIN_CHAT_ID) {
        return ctx.reply(`👋 Welcome Back Boss!\n\nUser approve karne ke liye:\n<code>/approve [User_ID]</code>\n\nWhatsApp link karne ke liye:\n<code>/link 91XXXXXXXXXX</code>`, { parse_mode: 'HTML' });
    }
    if (checkAccess(ctx)) {
        return ctx.reply('✅ <b>Aapka VIP access active hai!</b>\n\nFormat:\n<code>/send message text | number1,number2</code>', { parse_mode: 'HTML' });
    } else {
        return ctx.reply(`❌ <b>Access Denied! Premium Bot Only.</b>\n\nये एक प्रीमियम बल्क व्हाट्सएप मैसेंजर बोट है। इसे 1 महीने के लिए अनलॉक कराने और इसका पूरा फायदा उठाने के लिए मेरे DM में आओ।\n\n👉 <b>Meri ID hai:</b> ${SELLER_USERNAME}\n\n⚠️ <i>Note: Pay karne ke baad mujhe apni ye ID send karein: <code>${userId}</code></i>`, { parse_mode: 'HTML' });
    }
});

tgBot.command('approve', (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_CHAT_ID) return;
    let targetUser = ctx.message.text.replace('/approve', '').trim();
    if (!targetUser) return ctx.reply('❌ ID dalo! Ex: /approve 123456');

    paidUsers[targetUser] = { expiry: Date.now() + (30 * 24 * 60 * 60 * 1000), approvedAt: Date.now() };
    saveDatabase();
    ctx.reply(`✅ User ${targetUser} 30 Days ke liye unlock ho gaya!`);
    sendTelegramMessage(targetUser, '🎉 <b>Access Unlocked!</b>\n\nOwner ne aapka access 1 mahine ke liye khol diya hai. Ab aap bulk send kar sakte hain:\n<code>/send message | number1,number2</code>');
});

tgBot.command('link', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_CHAT_ID) return;
    let text = ctx.message.text.replace('/link', '').trim();
    if (!text) return ctx.reply('❌ Number dalo! Ex: /link 917217604544');

    if (!sock) {
        return ctx.reply('⚠️ Engine abhi initialization process me hai. Kripya 10 second baad dobara <code>/link ' + text + '</code> try karein.');
    }

    ctx.reply('⏳ Requesting 8-digit code from WhatsApp server...');
    try {
        let code = await sock.requestPairingCode(text);
        ctx.reply(`✅ <b>WhatsApp Pairing Code:</b>\n\n👉 <code>${code}</code>\n\nIs code ko copy karke WhatsApp me dalo!`, { parse_mode: 'HTML' });
    } catch (err) { 
        ctx.reply('❌ Link Error: ' + err.message + '\n\nTip: Agar baar-baar error aaye toh project folder se auth_info_nexus folder delete karke restart karein.'); 
    }
});

tgBot.command('send', async (ctx) => {
    if (!checkAccess(ctx)) return ctx.reply(`❌ Premium Feature Only! Contact: ${SELLER_USERNAME}`);
    if (!isConnected) return ctx.reply('❌ WhatsApp Offline hai! Admin ko bolo re-link karein.');

    let input = ctx.message.text.replace('/send', '').trim();
    if (!input.includes('|')) return ctx.reply('❌ Sahi format: /send message | number1,number2');

    let parts = input.split('|');
    let messageText = parts[0].trim();
    let numbersList = parts[1].split(',');

    ctx.reply(`🚀 Campaign Started! Total ${numbersList.length} numbers par 30-30 seconds ke gap me message bheja ja raha hai...`);

    for (let i = 0; i < numbersList.length; i++) {
        let num = numbersList[i].trim();
        if (!num) continue;
        
        try {
            await sock.sendMessage(num + "@s.whatsapp.net", { text: messageText });
            await ctx.reply(`[+] Delivered to ${num} - DONE ✅`);
            
            // ⏳ Exact 30 seconds fix delay if there are more numbers left in list
            if (i < numbersList.length - 1) {
                await new Promise(r => setTimeout(r, 30000)); 
            }
        } catch (e) { 
            await ctx.reply(`[!] ${num} par fail hua ❌`); 
        }
    }
    ctx.reply('🏁 Campaign Finished!');
});

// 🔥 CRASH-PROOF BOT LAUNCH
async function startBot() {
    try {
        await tgBot.launch();
        console.log('[+] TELEGRAM PREMIUM CONTROL BOT CORE ACTIVE');
        await connectToWhatsApp();
    } catch (err) {
        console.log('[!] Bot launch failed due to network jam, auto-restarting in 10s...');
        setTimeout(startBot, 10000); 
    }
}

startBot();
