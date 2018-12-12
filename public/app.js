window.WebSocket = window.WebSocket || window.MozWebSocket;

let connection = new WebSocket('wss://' + window.location.host);
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
    text = text.replace(/:grinning:/ig, '<span class="emoji">&#x1F600</span>');
    text = text.replace(/:D/ig, '<span class="emoji">&#x1F603</span>');
    text = text.replace(/:happy:/ig, '<span class="emoji">&#x1F604</span>');
    text = text.replace(/:rofl:/ig, '<span class="emoji">&#x1F923</span>');
    text = text.replace(/:tearsojoy:/ig, '<span class="emoji">&#x1F602</span>');
    text = text.replace(/:\)/ig, '<span class="emoji">&#x1F642</span>');
    text = text.replace(/;\)/ig, '<span class="emoji">&#x1F609</span>');
    text = text.replace(/:peace:/ig, '<span class="emoji">&#x1F607</span>');
    text = text.replace(/:love:/ig, '<span class="emoji">&#x1F60D</span>');
    text = text.replace(/:kiss:/ig, '<span class="emoji">&#x1F618</span>');
    text = text.replace(/:P/ig, '<span class="emoji">&#x1F61C</span>');
    text = text.replace(/:crazy:/ig, '<span class="emoji">&#x1F92A</span>');
    text = text.replace(/:rich:/ig, '<span class="emoji">&#x1F911</span>');
    text = text.replace(/:\|/ig, '<span class="emoji">&#x1F610</span>');
    text = text.replace(/:sick:/ig, '<span class="emoji">&#x1F92E</span>');
    text = text.replace(/:cool:/ig, '<span class="emoji">&#x1F60E</span>');
    text = text.replace(/:analyse:/ig, '<span class="emoji">&#x1F9D0</span>');
    text = text.replace(/:O/ig, '<span class="emoji">&#x1F628</span>');
    text = text.replace(/:\(/ig, '<span class="emoji">&#x1F622</span>');
    text = text.replace(/:'\(/ig, '<span class="emoji">&#x1F62D</span>');
    text = text.replace(/:angry:/ig, '<span class="emoji">&#x1F621</span>');
    text = text.replace(/:curse:/ig, '<span class="emoji">&#x1F92C</span>');
    text = text.replace(/:dead:/ig, '<span class="emoji">&#x1F480</span>');
    text = text.replace(/:danger:/ig, '<span class="emoji">&#x2620</span>');
    text = text.replace(/:poop:/ig, '<span class="emoji">&#x1F4A9</span>');
    text = text.replace(/:girija:/ig, '<span class="emoji">&#x1F47B</span>');
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
let debouncedClear = debounce(clearTyping, 500);
    

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
                if (Notification.permission === 'granted') {
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
	if(Notification.permission !== 'granted'){
		Notification.requestPermission();
	}
    if (!event.shiftKey && event.key === 'Enter') {
        let text = event.target.value;
        connection.send(JSON.stringify({message: text}));
        event.target.value = '';
        event.preventDefault();
    }
    debouncedTyping();
}
