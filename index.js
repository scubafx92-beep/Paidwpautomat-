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

// 🤖 WHATSAPP ENGINE
async function connectToWhatsApp() {
    if (isInitializing) return;
    isInitializing = true;
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_nexus');
        
        sock = makeWASocket({ 
            auth: state, 
            printQRInTerminal: false,
            keepAliveIntervalMs: 30000,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0
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
                if (statusCode !== DisconnectReason.loggedOut) {
                    setTimeout(connectToWhatsApp, 5000);
                }
            }
        });
        sock.ev.on('creds.update', saveCreds);
    } catch (error) {
        isInitializing = false;
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

    if (!sock) {
        ctx.reply('⏳ Engine start kiya ja raha hai, 5 second baad fir se command bhejein...');
        await connectToWhatsApp();
        return;
    }

    try {
        let code = await sock.requestPairingCode(text);
        ctx.reply(`✅ <b>WhatsApp Pairing Code:</b>\n\n👉 <code>${code}</code>`, { parse_mode: 'HTML' });
    } catch (err) { 
        ctx.reply('❌ Link Error: ' + err.message); 
    }
});

// 🔥 ANTI-BAN PERFECT 30-SECOND DELAY LOOP
tgBot.command('send', async (ctx) => {
    if (!checkAccess(ctx)) return ctx.reply(`❌ Premium Feature Only!`);
    if (!isConnected || !sock) return ctx.reply('❌ WhatsApp Offline hai! Admin ko bolo re-link/start karein.');

    let input = ctx.message.text.replace('/send', '').trim();
    if (!input.includes('|')) return ctx.reply('❌ Format: /send msg | num1,num2');

    let parts = input.split('|');
    let messageText = parts[0].trim();
    let rawNumbers = parts[1] ? parts[1].trim() : ''; 
    
    if (!rawNumbers) return ctx.reply('❌ Numbers nahi mile!');
    let numbersList = rawNumbers.split(',').map(num => num.trim()).filter(num => num.length > 0);

    ctx.reply(`🚀 Campaign Started! Total ${numbersList.length} numbers par exact 30-30 seconds ke gap me message bheja ja raha hai...`);

    for (let i = 0; i < numbersList.length; i++) {
        let num = numbersList[i];
        let success = false;

        try {
            await sock.sendMessage(num + "@s.whatsapp.net", { text: messageText });
            await ctx.reply(`[+] Delivered to ${num} - DONE ✅`);
            success = true;
        } catch (e) { 
            await ctx.reply(`[!] ${num} par fail hua ❌`); 
        }

        // ⏳ FIXED DELAY: Chahe message SUCCESS ho ya FAIL, agla message exact 30 seconds baad hi jayega!
        if (i < numbersList.length - 1) {
            console.log(`[Wait] 30 seconds delay before next number...`);
            await new Promise(r => setTimeout(r, 30000)); // 30000 ms = 30 seconds
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
        
