function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Your browser does not support Speech Recognition. Please try Chrome or Safari.");
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    
    const micBtn = document.getElementById("micBtn");
    micBtn.classList.add("recording");
    micBtn.innerHTML = "<span>🔴 Listening...</span>";

    recognition.onresult = function(event) {
        let speech = event.results[0][0].transcript;
        updateResultText("speechText", speech);
        translateText(speech);
    };

    recognition.onend = function() {
        micBtn.classList.remove("recording");
        micBtn.innerHTML = '<span class="mic-icon">🎤</span><span>Tap to Speak</span>';
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error:", event.error);
        micBtn.classList.remove("recording");
        micBtn.innerHTML = '<span class="mic-icon">🎤</span><span>Tap to Speak</span>';
    };

    recognition.start();
}

function translateTypedText() {
    let text = document.getElementById("inputText").value.trim();
    if (!text) return;
    
    updateResultText("speechText", text);
    translateText(text);
}

function updateResultText(id, text) {
    const element = document.getElementById(id);
    if (!element) return;
    element.innerText = text;
    element.classList.remove("placeholder-text");
}

function translateText(text) {
    if (!text || text.trim() === "") return;
    
    let targetLang = document.getElementById("language").value;
    const translatedEl = document.getElementById("translatedText");
    
    translatedEl.innerText = "Translating...";
    translatedEl.classList.add("placeholder-text");

    // Using a more reliable way to construct the URL
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.responseData && data.responseData.translatedText) {
                let translated = data.responseData.translatedText;
                updateResultText("translatedText", translated);
                // Automatically speak the translation
                speakText(translated, targetLang);
            } else {
                updateResultText("translatedText", "Translation failed. Try again.");
            }
        })
        .catch(err => {
            console.error("Translation error:", err);
            updateResultText("translatedText", "Network error. Please check connection.");
        });
}

function speakText(text, lang, callback) {
    // Trim and clean text
    const cleanText = text ? text.toString().trim() : "";
    
    if (!cleanText || cleanText === "Your text will appear here..." || 
        cleanText === "Translation will appear here..." || cleanText === "Translating...") {
        if (callback) callback();
        return;
    }

    // Ensure voices are loaded (some browsers load them asynchronously)
    const loadVoices = () => {
        return new Promise((resolve) => {
            let voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                resolve(voices);
            } else {
                window.speechSynthesis.onvoiceschanged = () => {
                    resolve(window.speechSynthesis.getVoices());
                };
            }
        });
    };

    window.speechSynthesis.cancel();

    setTimeout(async () => {
        const voices = await loadVoices();
        const speech = new SpeechSynthesisUtterance(cleanText);
        
        const voiceMap = {
            "ta": "ta-IN",
            "hi": "hi-IN",
            "es": "es-ES",
            "fr": "fr-FR",
            "de": "de-DE",
            "en": "en-US"
        };

        const targetLang = voiceMap[lang] || lang || "en-US";
        speech.lang = targetLang;
        
        // Match the best available voice
        const preferredVoice = voices.find(v => v.lang === targetLang) || 
                               voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
        
        if (preferredVoice) speech.voice = preferredVoice;

        speech.rate = 0.85; // Slightly slower for clearer translation
        speech.pitch = 1.0;

        if (callback) {
            speech.onend = callback;
            speech.onerror = (e) => {
                console.error("Speech synthesis error:", e);
                callback();
            };
            // Safety timeout if browser fails to fire onend
            setTimeout(() => { if(speech.speaking) callback(); }, 5000);
        }

        window.speechSynthesis.speak(speech);
    }, 150);
}

function readBox(elementId, btn, langOverride) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const text = element.innerText;
    const lang = langOverride || document.getElementById("language").value;
    
    // Check if there is actual content to read
    if (!text || text.trim() === "" || element.classList.contains("placeholder-text")) {
        return;
    }
    
    const originalIcon = btn.innerText;
    btn.innerText = "⏳";
    btn.style.opacity = "0.7";
    
    speakText(text, lang, () => {
        btn.innerText = originalIcon;
        btn.style.opacity = "1";
    });
}