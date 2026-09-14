// 🛡️ ANTI-TIMEOUT OVERRIDE (For Render Cloud Network Jam Bypass)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Telegraf } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const express = require('express');

// 🔗 WEB SERVER FOR RENDER
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('System Status: 24/7 Active Pro 🚀'));
app.listen(PORT, () => console.log(`[+] Server running on port ${PORT}`));

// 🔑 CONFIGURATION
const BOT_TOKEN = '8722740855:AAHMyWM_iHLSTD5i-D6x8GJZhhbQWazrWMI';
const ADMIN_CHAT_ID = '8457670186'; 
const SELLER_USERNAME = '@vanshfx1';  

const tgBot = new Telegraf(BOT_TOKEN, {
    handlerTimeout: 90000, 
    telegram: { apiKeyMode: 'strict' }
});

let sock = null;
let isConnected = false;
let isInitializing = false;

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

// 🤖 ULTIMATE AUTO-RECONNECT WHATSAPP ENGINE
async function connectToWhatsApp() {
    if (isInitializing) return;
    isInitializing = true;
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_nexus');
        
        sock = makeWASocket({ 
            auth: state, 
            printQRInTerminal: false,
            keepAliveIntervalMs: 15000, // Background activity lock
            connectTimeoutMs: 120000,
            defaultQueryTimeoutMs: 0,
            retryRequestOptions: { maxRetries: 5, delayMinMs: 2000 }
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                isConnected = true;
                isInitializing = false;
                console.log('[+] WhatsApp Online.');
            }
            if (connection === 'close') {
                isConnected = false;
                isInitializing = false;
                const statusCode = (lastDisconnect.error)?.output?.statusCode;
                
                // Pure automatic loop backend crash bypass
                if (statusCode !== DisconnectReason.loggedOut) {
                    console.log('[-] Connection closed by Render. Re-validating session instantly...');
                    setTimeout(connectToWhatsApp, 2000); // 2 second me auto-reconnect
                } else {
                    sendTelegramMessage(ADMIN_CHAT_ID, '❌ WhatsApp Session Expired! Dobara /link karein.');
                }
            }
        });
        sock.ev.on('creds.update', saveCreds);
    } catch (error) {
        isInitializing = false;
    }
}

async function sendTelegramMessage(chatId, text) {
    try {
        await tgBot.telegram.sendMessage(chatId, text, { parse_mode: 'HTML' });
    } catch (err) {
        console.log('TG Error');
    }
}

// 📡 TELEGRAM COMMANDS
tgBot.command('start', (ctx) => {
    const userId = ctx.chat.id.toString();
    if (userId === ADMIN_CHAT_ID) {
        return ctx.reply(`👋 Welcome Back Boss!\n\nLink: <code>/link 91XXXXXXXXXX</code>`, { parse_mode: 'HTML' });
    }
    if (checkAccess(ctx)) {
        return ctx.reply('✅ VIP Active! /send msg | numbers', { parse_mode: 'HTML' });
    } else {
        return ctx.reply(`❌ Access Denied. Contact: ${SELLER_USERNAME}`, { parse_mode: 'HTML' });
    }
});

tgBot.command('approve', (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_CHAT_ID) return;
    let targetUser = ctx.message.text.replace('/approve', '').trim();
    if (!targetUser) return ctx.reply('❌ ID dalo!');
    paidUsers[targetUser] = { expiry: Date.now() + (30 * 24 * 60 * 60 * 1000), approvedAt: Date.now() };
    saveDatabase();
    ctx.reply(`✅ User ${targetUser} Unlocked!`);
});

tgBot.command('link', async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_CHAT_ID) return;
    let text = ctx.message.text.replace('/link', '').trim();
    if (!text) return ctx.reply('❌ Number dalo!');

    // Force link even if sock is dead
    if (!sock || !isConnected) {
        await connectToWhatsApp();
        await new Promise(r => setTimeout(r, 4000));
    }

    try {
        let code = await sock.requestPairingCode(text);
        ctx.reply(`✅ <b>WhatsApp Pairing Code:</b>\n\n👉 <code>${code}</code>`, { parse_mode: 'HTML' });
    } catch (err) { 
        ctx.reply('❌ Link Error: ' + err.message + '\nDobara try karein.'); 
        isInitializing = false;
        connectToWhatsApp();
    }
});

// 🔥 ANTI-FREEZE BULK SENDER LOOP
tgBot.command('send', async (ctx) => {
    if (!checkAccess(ctx)) return ctx.reply(`❌ Premium Feature Only!`);
    
    // Auto-wake up engine if sleeping before campaign
    if (!isConnected || !sock) {
        await ctx.reply('⏳ Engine offline dikha raha tha, hosh me laaya ja raha hai... 5 second wait karein...');
        await connectToWhatsApp();
        await new Promise(r => setTimeout(r, 5000));
    }

    let input = ctx.message.text.replace('/send', '').trim();
    if (!input.includes('|')) return ctx.reply('❌ Format: /send msg | num1,num2');

    let parts = input.split('|');
    let messageText = parts[0].trim();
    let rawNumbers = parts[1] ? parts[1].trim() : ''; 
    
    if (!rawNumbers) return ctx.reply('❌ Numbers nahi mile!');
    let numbersList = rawNumbers.split(',').map(num => num.trim()).filter(num => num.length > 0);

    ctx.reply(`🚀 Campaign Started! Total ${numbersList.length} numbers par 30-30 seconds ke gap me message ja raha hai...`);

    for (let i = 0; i < numbersList.length; i++) {
        let num = numbersList[i];
        
        // Loop ke andar agar Render connection drop kare toh instant fix backup
        if (!sock) {
            await connectToWhatsApp();
            await new Promise(r => setTimeout(r, 3000));
        }

        try {
            await sock.sendMessage(num + "@s.whatsapp.net", { text: messageText });
            await ctx.reply(`[+] Delivered to ${num} ✅`);
            if (i < numbersList.length - 1) await new Promise(r => setTimeout(r, 30000)); 
        } catch (e) { 
            // Retry block if packet fails due to background sleep
            try {
                await new Promise(r => setTimeout(r, 2000));
                await sock.sendMessage(num + "@s.whatsapp.net", { text: messageText });
                await ctx.reply(`[+] Delivered on Retry to ${num} ✅`);
                if (i < numbersList.length - 1) await new Promise(r => setTimeout(r, 30000));
            } catch(err) {
                await ctx.reply(`[!] ${num} Fail ❌`); 
            }
        }
    }
    ctx.reply('🏁 Campaign Finished!');
});

async function startBot() {
    try {
        await tgBot.launch();
        console.log('[+] Bot Core Live');
        await connectToWhatsApp();
    } catch (err) {
        setTimeout(startBot, 10000); 
    }
}

startBot();
