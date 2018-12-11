const webSocketsServerPort = 1337;
const webSocketServer = require('websocket').server;
const http = require('http');
const db = require('./dbutils');
const express = require('express')
const app = express();

let lastRegisteredGuest = -1;

let connectedGuests = {};

app.use('/chrismom', express.static(__dirname + '/public'));

/**
 * 
 * Server initialization below
 * 
 */

let server = http.createServer(app);
server.listen(webSocketsServerPort, function () {
    console.log("Server is listening on port:"
        + webSocketsServerPort);
});

let wsServer = new webSocketServer({
    httpServer: server
});

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
    wsServer.broadcastUTF(JSON.stringify(obj));
}

wsServer.on('request', async function (request) {
    let connection = request.accept(null, request.origin);
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
    start.setHours(0, 0, 0, 0);
    var end = new Date();
    end.setHours(23, 59, 59, 999);
    //guest connected broadcast
    //send initial message
    let messages = await db.get('messages', {timestamp: {$gte: start, $lt: end}}, {timestamp: +1});
    connection.sendUTF(JSON.stringify({messages, guestid}));
    broadcastMessage({'type': 'connected', guestid: connectedGuests[request.remoteAddress]});
    connection.on('message', function (req) {
        let reqObj = JSON.parse(req.utf8Data);
        if(reqObj.message){
            let obj = {guestid, message: reqObj.message, timestamp: new Date()};
            db.add('messages', obj);
            broadcastMessage({messages: [obj]});
        }
        else{
            broadcastMessage({action: 'typing', guestid});
        }
    });
    connection.on('close', function (connection) {
        broadcastMessage({'type': 'disconnected', guestid: connectedGuests[request.remoteAddress]});
    });
});