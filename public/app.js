window.WebSocket = window.WebSocket || window.MozWebSocket;

let connection = new WebSocket('ws://127.0.0.1:1337');

let msgDiv;
let guestid;

function generateUserJoinedTemplate(username) {
    username = username === 'You' ? username : `Guest #${username}`;
    return `
        <span>${username} just joined!</span>
    `;
}

function generateMessageTemplate(guest, message, timestamp) {
    guest = guest === guestid ? 'Me' : `G${guest}`;
    return `
        <div class="flex-shrk0 circle flex--row-acall">${guest}</div>
        <div class="msg-body">${message}</div>
        <div class="mrLA tstamp">${timestamp}</div>
    `;
}

function safeHTML(text) {
    text = text.replace(/&/g, '&amp;');
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');
    return text;
}

function formatDate(dateString) {
    let date = new Date(dateString);
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}`
}

connection.onopen = function () {
    //stub
};

connection.onerror = function (error) {
    console.error(JSON.stringify(error));
};

connection.onmessage = function (message) {
    if (!msgDiv) {
        msgDiv = document.querySelector('.msg-div .content');
    }
    let response = JSON.parse(message.data);
    if(response.guestid){
        guestid = response.guestid;
    }
    if (response.type) {
        let container = document.createElement('div');
        container.classList.add("flex--row-acall", "new-join");
        container.innerHTML = generateUserJoinedTemplate(response.guestid === guestid ? 'You' : response.guestid);
        msgDiv.append(container);
    }
    else {
        response.messages.forEach(function (obj) {
            let container = document.createElement('div');
            container.classList.add("flex--row-ac", "msg-row");
            container.innerHTML = generateMessageTemplate(obj.guestid, safeHTML(obj.message.utf8Data), formatDate(obj.timestamp));
            msgDiv.append(container);
        })
    }
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

function send(event) {
    if (!event.shiftKey && event.key === 'Enter') {
        let text = event.target.value;
        connection.send(text);
        event.target.value = '';
        event.preventDefault();
    }
}