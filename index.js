var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent
const profanityList = blockingHttpGet('https://raw.githubusercontent.com/coffee-and-fun/google-profanity-words/main/data/list.txt').split('\n');

// Recognition Config
var running = false;
var currentResult = 0;
var phraseIndex = 0;
var requestPhrases = [];
var newPhraseTime = null;
var recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.lang = 'en-US';
recognition.interimResults = true;
recognition.maxAlternatives = 1;

recognition.onresult = function(event) {
    if(newPhraseTime == null) {
        newPhraseTime = Date.now();
    }

    var transcript = '';
    var timerElapsed = Date.now() - newPhraseTime > 5000;
    var final = false;

    for(var i = event.resultIndex; i < event.results.length; ++i) {
        if(!event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
        } else {            
            currentResult = event.resultIndex+1;
            transcript = event.results[i][0].transcript;
            final = true;
        }
    }

    if(!final && transcript.substring(phraseIndex).trim().split(' ').length > 10) {
        timerElapsed = true;
    }

    if(final || timerElapsed) {
        requestPhrases.push(transcript.substring(transcript.substring(0, phraseIndex).lastIndexOf(' ') + 1).trim());
    }

    document.getElementById('interim').innerHTML = transcript

    if(final) {
        phraseIndex = 0;
        newPhraseTime = null;
        document.getElementById('interim').innerHTML = "Waiting for new input..."
    } else if(timerElapsed) {
        phraseIndex = transcript.length;
        newPhraseTime = Date.now();
    }
}

recognition.onstart = function() {
    running = true;
    newPhraseTime = null;
    phraseIndex = 0;
    document.getElementById('header').style = "color: red;"
    document.getElementById('start').innerHTML = "Stop"
    document.getElementById('interim').innerHTML = "Waiting for new input..."
}

recognition.onend = function() {
    running = false;
    document.getElementById('header').style = "color: black;"
    document.getElementById('start').innerHTML = "Start"
    document.getElementById('interim').innerHTML = "Waiting to start..."
}

recognition.onerror = function(event) {
    running = false;
    document.getElementById('header').style = "color: black;"
    document.getElementById('start').innerHTML = "Start"
    document.getElementById('interim').innerHTML = "Waiting to start..."
}

function processRequests() {
    if(requestPhrases.length > 0) {
        var query = filterProfanity(requestPhrases.shift());
        var extraction_result = extractKeywords(query);

        if(extraction_result.trim().length > 0) {
            var gifList = fetchGifList(extraction_result);

            if(gifList.length > 0) {
                var gifIndex = getRandomInt(0, gifList.length-1);
                var gifUrl = gifList[gifIndex].media_formats.tinygif.url;
                addNode(query, extraction_result, gifUrl)
            }
        }
    }
    setTimeout(processRequests, 2000);
}

function extractKeywords(query) {
    var result = extract(query,
        {
            language:"english",
            remove_digits: true,
            return_changed_case: true,
            remove_duplicates: true
        }
    )
    return result.length > 0 ? result.join(' ') : query;
}

function filterProfanity(query) {
    return query.split(' ').filter((value) => {
        return !profanityList.includes(value.trim().toLowerCase()) && !value.indexOf('*') >= 0;
    }).join(' ').trim();
}

function fetchGifList(query) {
    return JSON.parse(blockingHttpGet("https://tenor.googleapis.com/v2/search?key=" + apiKey + "&contentfilter=high&media_filter=tinygif&limit=10&q=" + query)).results;
}

function blockingHttpGet(url) {
    const req = new XMLHttpRequest();
    req.open("GET", url, false);
    req.send(null);
    return req.responseText;
}

function addNode(text, filter, url) {
    var html = '<br/><img src="%img%"/><p>%txt%</p><p style="color: gray;"><br/>'
    html = html.replace("%img%", url);
    html = html.replace("%txt%", text);
    html = html.replace("%flt%", filter);
    document.getElementById("nodes").innerHTML = html + document.getElementById("nodes").innerHTML;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function startClick() {
    if(running) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function clearClick() {
    if(running) {
        document.getElementById("nodes").innerHTML = "";
    }
}

// Main
if(apiKey === "changeMe") {
    window.alert("You have not yet set your Tenor API Key in token.js!")
}

processRequests();