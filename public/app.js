window.WebSocket = window.WebSocket || window.MozWebSocket;

let connection = new WebSocket('ws://127.0.0.1:1337');
let anonymousMode = true;
let msgDiv = document.querySelector('.msg-div .content');
let guestid;
let notification;

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

function generateUserJoinedTemplate(type, username) {
    return `
        <span>${anonymousMode ? 'someone' : username} just ${type}!</span>
    `;
}

function generateMessageTemplate(guest, message, timestamp) {
    guest = anonymousMode ? 'A' : guest === guestid ? 'Me' : `G${guest}`;
    return `
        <div class="flex-shrk0 circle flex--row-acall">${guest}</div>
        <div class="msg-body">${message}</div>
        <div class="mrLA tstamp">${timestamp}</div>
    `;
}

function translateEmojis(text){
    text = text.replace(/:grinning:/g, '&#x1F600');
    text = text.replace(/:D/g, '&#x1F603');
    text = text.replace(/:happy:/g, '&#x1F604');
    text = text.replace(/:rofl:/g, '&#x1F923');
    text = text.replace(/:tearsojoy:/g, '&#x1F602');
    text = text.replace(/:\)/g, '&#x1F642');
    text = text.replace(/;\)/g, '&#x1F609');
    text = text.replace(/:peace:/g, '&#x1F607');
    text = text.replace(/:love:/g, '&#x1F60D');
    text = text.replace(/:kiss:/g, '&#x1F618');
    text = text.replace(/:P/g, '&#x1F61C');
    text = text.replace(/:crazy:/g, '&#x1F92A');
    text = text.replace(/:rich:/g, '&#x1F911');
    text = text.replace(/:\|/g, '&#x1F610');
    text = text.replace(/:sick:/g, '&#x1F92E');
    text = text.replace(/:cool:/g, '&#x1F60E');
    text = text.replace(/:analyse:/g, '&#x1F9D0');
    text = text.replace(/:O/g, '&#x1F628');
    text = text.replace(/:\(/g, '&#x1F622');
    text = text.replace(/:'\(/g, '&#x1F62D');
    text = text.replace(/:angry:/g, '&#x1F621');
    text = text.replace(/:curse:/g, '&#x1F92C');
    text = text.replace(/:dead:/g, '&#x1F480');
    text = text.replace(/:danger:/g, '&#x2620');
    text = text.replace(/:poop:/g, '&#x1F4A9');
    text = text.replace(/:girija:/g, '&#x1F921');
    return text;
}

function safeHTML(text) {
    if(typeof text === 'object'){
        text = text.utf8Data;
    }
    text = text.replace(/&/g, '&amp;');
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');
    return translateEmojis(text);
}

function formatDate(dateString) {
    let date = new Date(dateString);
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}`
}

function generateNotification(text){
    new Notification("You have a new message!", {body: text});
}

function sendTyping(){
    connection.send(JSON.stringify({action: 'typing'}));
}

function clearTyping(){
    document.querySelector('.text-cntr .typing-lbl').innerHTML = '';
}

let debouncedTyping = debounce(sendTyping, 300);
let debouncedClear = debounce(clearTyping, 300);
    

connection.onopen = function () {
    //stub
};

connection.onerror = function (error) {
    console.error(JSON.stringify(error));
};

connection.onmessage = function (message) {
    let response = JSON.parse(message.data);
    if(response.guestid){
        guestid = response.guestid;
    }
    if (response.type) {
        let container = document.createElement('div');
        container.classList.add("flex--row-acall", "new-join");
        container.innerHTML = generateUserJoinedTemplate(response.type, response.guestid);
        msgDiv.append(container);
    }
    else if(response.action){
        if(response.action === 'typing' && response.guestid !== guestid){
            document.querySelector('.text-cntr .typing-lbl').innerHTML = `Guest #${response.guestid} is typing`;
            debouncedClear();
        }
        else if(response.action === 'reload'){
            window.location.href = window.location.href;
        }
    }
    else {
        let msgLen = response.messages.length;
        response.messages.forEach(function (obj) {
            if(msgLen === 1 && window.hidden){
                if (Notification.permission === "granted") {
                    generateNotification(obj.message);
                }
                else{
                    Notification.requestPermission().then(function(result) {
                        generateNotification(obj.message);
                    });
                }
            }
            let container = document.createElement('div');
            container.classList.add("flex--row-ac", "msg-row");
            container.innerHTML = generateMessageTemplate(obj.guestid, safeHTML(obj.message), formatDate(obj.timestamp));
            msgDiv.append(container);
        });
    }
    msgDiv.parentElement.scrollTop = msgDiv.scrollHeight;
}



function send(event) {
    if (!event.shiftKey && event.key === 'Enter') {
        let text = event.target.value;
        connection.send(JSON.stringify({message: text}));
        event.target.value = '';
        event.preventDefault();
    }
    debouncedTyping();
}
