const webSocketsServerPort = 443;
const ws = require('ws');
const http = require('http');
const https = require('https');
const db = require('./dbutils');
const express = require('express');
const crypto = require('crypto');
const fs = require("fs");
const options = {
	key: fs.readFileSync('privatekey.pem'),
	cert: fs.readFileSync('certificate.pem')
};
const app = express();

let lastRegisteredGuest = -1;

let connectedGuests = {};

app.use('/chrismom', express.static(__dirname + '/public'));

/**
 * 
 * Server initialization below
 * 
 */

// let httpsserver = tls.createServer(app);

let server = https.createServer(options, app);
server.listen(webSocketsServerPort, function () {
    console.log("Server is listening on port:"
        + webSocketsServerPort);
});

let wsServer = new ws.Server({server, path: '/'});

app.use('/api/v1/forceReload', async function (req, res) {
    broadcastMessage({action: 'reload'});
    res.send('done');
});

/**
 * 
 * WS CODE BELOW
 * 
 */

function getUserInfo(ip){
    return db.getOne('users', { ip });
}

async function registerUser(ip){
    if (lastRegisteredGuest === -1) {
        let latestUser = await db.get('users', { guestid: +1 }, 1);
        if (latestUser) {
            lastRegisteredGuest = latestUser.guestid;
        }
        else {
            lastRegisteredGuest = 0;
        }
    }
    let guestid = ++lastRegisteredGuest;
    db.add('users', { guestid, ip });
    return guestid;
}

function broadcastMessage(obj){
	wsServer.clients.forEach(function each(client) {
		try{
			client.send(JSON.stringify(obj));
		}
		catch(err){}
	});
}

wsServer.on('connection', async function (request) {
    //Start get userid
    let ip = request.remoteAddress;
    let data = await getUserInfo(ip);
    let guestid;
    if (!data) {
        guestid = await registerUser(ip);
    }
    else {
        guestid = data.guestid;
    }
    connectedGuests[ip] = await guestid;
    //Start sort messages
	let start = new Date();
	start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
	var end = new Date();
    end.setHours(23, 59, 59, 999);
    //guest connected broadcast
    //send initial message
    let messages = await db.get('messages', {timestamp: {$gte: start, $lt: end}}, {timestamp: +1});
    request.send(JSON.stringify({messages, guestid}));
    broadcastMessage({'type': 'connected', guestid: connectedGuests[request.remoteAddress]});
    request.on('message', function (req) {
		let reqObj = JSON.parse(req);
        if(reqObj.message){
            let obj = {guestid, message: reqObj.message, timestamp: new Date()};
            db.add('messages', obj);
            broadcastMessage({messages: [obj]});
        }
        else{
            broadcastMessage({action: 'typing', guestid});
        }
    });
    request.on('close', function (connection) {
        broadcastMessage({'type': 'disconnected', guestid: connectedGuests[request.remoteAddress]});
    });
});