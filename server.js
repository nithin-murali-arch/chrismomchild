const webSocketsServerPort = 1337;
const webSocketServer = require('websocket').server;
const http = require('http');
const db = require('./dbutils');
const express = require('express')
const app = express();

let lastRegisteredGuest = -1;

let connectedGuests = {};

app.use(express.static('public'));

app.use('/api/v1/registerMachine', async function (req, res) {
    let ip = req.ip;
    
});

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

wsServer.on('request', async function (request) {
    let connection = request.accept(null, request.origin);
    //Start get userid
    let ip = request.remoteAddress;
    let data = await getUserInfo(ip);
    let guestid;
    if (!data) {
        guestid = registerUser(ip);
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
    wsServer.broadcastUTF(JSON.stringify({'type': 'connected', guestid: connectedGuests[request.remoteAddress]}));
    //send initial message
    let messages = await db.get('messages', {timestamp: {$gte: start, $lt: end}}, {timestamp: +1});
    connection.sendUTF(JSON.stringify({messages, guestid}));
    connection.on('message', function (message) {
        let obj = {guestid, message, timestamp: new Date()};
        db.add('messages', obj);
        wsServer.broadcastUTF(JSON.stringify({messages: [obj]}));
    });
    connection.on('close', function (connection) {
        //close connection stub
    });
});