const { default: makeWASocket, DisconnectReason, useSingleFileAuthState } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const { unlinkSync, existsSync } = require('fs');
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

// Start a connection
const startSock = () => {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            // reconnect if not logged out
            if (shouldReconnect) {
                startSock();
            }
        } else if(connection === 'open') {
            console.log('opened connection');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        console.log(JSON.stringify(m, undefined, 2));

        const msg = m.messages[0];
        if(!msg.key.fromMe && m.type === 'notify') {
            if (msg.message.conversation.toLowerCase() === 'hello') {
                await sock.sendMessage(msg.key.remoteJid, { text: 'Hello! How can I help you today?' });
            }
        }
    });

    return sock;
}

startSock();
