// Configuration
const SERVER_URL = window.location.origin; // Works for both local and Vercel

// Application state
let swRegistration = null;
let isSubscribed = false;

// UI Elements
const pushToggle = document.getElementById('pushToggle');
const statusMessage = document.getElementById('statusMessage');
const sendMessageCard = document.getElementById('sendMessageCard');
const subscriptionCard = document.getElementById('subscriptionCard');
const encodingsCard = document.getElementById('encodingsCard');
const curlCard = document.getElementById('curlCard');
const serverCard = document.getElementById('serverCard');
const sendPushBtn = document.getElementById('sendPushBtn');
const payloadText = document.getElementById('payloadText');
const subscriptionJson = document.getElementById('subscriptionJson');
const encodingsList = document.getElementById('encodingsList');
const curlCommand = document.getElementById('curlCommand');
const endpointUrl = document.getElementById('endpointUrl');
const authValue = document.getElementById('authValue');

// Utility functions
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Initialize the application
async function initializeApp() {
    if (!('serviceWorker' in navigator)) {
        showStatus('Service Workers are not supported in this browser.', 'error');
        return;
    }

    if (!('PushManager' in window)) {
        showStatus('Push notifications are not supported in this browser.', 'error');
        return;
    }

    // Check if on HTTPS (required for service workers)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        showStatus('⚠️ HTTPS is required for push notifications. This site must be accessed via HTTPS.', 'error');
    }

    try {
        // Register service worker
        swRegistration = await navigator.serviceWorker.register('sw.js');
        console.log('Service Worker registered:', swRegistration);

        // Check if already subscribed
        const subscription = await swRegistration.pushManager.getSubscription();
        isSubscribed = subscription !== null;

        if (isSubscribed) {
            console.log('User is already subscribed:', subscription);
            updateUI();
            updateSubscriptionDisplay(subscription);
            showStatus('✅ You are subscribed! Notifications will work even when browser is closed.', 'success');
        } else {
            showStatus('👆 Click the toggle above to enable notifications for this device.', 'info');
        }

        // Update toggle state
        if (isSubscribed) {
            pushToggle.classList.add('active');
        }

        // Check notification permission
        if (Notification.permission === 'denied') {
            showStatus('⚠️ Notifications are blocked. Please enable them in your browser settings.', 'error');
        }

    } catch (error) {
        console.error('Error initializing app:', error);
        showStatus('Error initializing the app: ' + error.message, 'error');
    }
}

// Subscribe to push notifications
async function subscribeUser() {
    try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
            showStatus('Notification permission denied.', 'error');
            return;
        }

        // Get the public VAPID key from the server
        const response = await fetch(`${SERVER_URL}/api/vapidPublicKey`);
        const vapidPublicKey = await response.text();
        
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

        // Subscribe to push notifications
        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });

        console.log('User subscribed:', subscription);

        // Send subscription to server
        await fetch(`${SERVER_URL}/api/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscription)
        });

        isSubscribed = true;
        updateUI();
        updateSubscriptionDisplay(subscription);
        showStatus('Successfully subscribed to push notifications!', 'success');

    } catch (error) {
        console.error('Error subscribing:', error);
        showStatus('Error subscribing: ' + error.message, 'error');
        pushToggle.classList.remove('active');
    }
}

// Unsubscribe from push notifications
async function unsubscribeUser() {
    try {
        const subscription = await swRegistration.pushManager.getSubscription();
        
        if (subscription) {
            await subscription.unsubscribe();
            
            // Notify server
            await fetch(`${SERVER_URL}/api/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(subscription)
            });

            console.log('User unsubscribed');
        }

        isSubscribed = false;
        updateUI();
        showStatus('Unsubscribed from push notifications.', 'info');

    } catch (error) {
        console.error('Error unsubscribing:', error);
        showStatus('Error unsubscribing: ' + error.message, 'error');
    }
}

// Update UI based on subscription state
function updateUI() {
    if (isSubscribed) {
        sendMessageCard.classList.remove('hidden');
        subscriptionCard.classList.remove('hidden');
        encodingsCard.classList.remove('hidden');
        curlCard.classList.remove('hidden');
        serverCard.classList.remove('hidden');
    } else {
        sendMessageCard.classList.add('hidden');
        subscriptionCard.classList.add('hidden');
        encodingsCard.classList.add('hidden');
        curlCard.classList.add('hidden');
        serverCard.classList.add('hidden');
    }
}

// Update subscription display
function updateSubscriptionDisplay(subscription) {
    const subscriptionObj = JSON.parse(JSON.stringify(subscription));
    subscriptionJson.textContent = JSON.stringify(subscriptionObj, null, 2);
    
    // Display supported encodings
    if ('PushManager' in window && 'supportedContentEncodings' in PushManager) {
        const encodings = PushManager.supportedContentEncodings;
        encodingsList.innerHTML = '';
        encodings.forEach(encoding => {
            const li = document.createElement('li');
            li.textContent = `"${encoding}"`;
            encodingsList.appendChild(li);
        });
    }

    // Display endpoint URL
    endpointUrl.textContent = subscriptionObj.endpoint;

    // Generate CURL command
    generateCurlCommand(subscription);
}

// Generate CURL command
async function generateCurlCommand(subscription) {
    try {
        const response = await fetch(`${SERVER_URL}/api/generateCurl`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscription: subscription,
                payload: payloadText.value
            })
        });

        const data = await response.json();
        
        if (data.curlCommand) {
            curlCommand.textContent = data.curlCommand;
            authValue.textContent = data.authHeader || 'N/A';
        }
    } catch (error) {
        console.error('Error generating CURL command:', error);
    }
}

// Send push notification
async function sendPushNotification() {
    if (!isSubscribed) {
        showStatus('Please enable push notifications first.', 'error');
        return;
    }

    const payload = payloadText.value.trim();
    
    if (!payload) {
        showStatus('Please enter a message to send.', 'error');
        return;
    }

    sendPushBtn.disabled = true;
    sendPushBtn.textContent = 'Sending...';

    try {
        const subscription = await swRegistration.pushManager.getSubscription();
        
        const response = await fetch(`${SERVER_URL}/api/sendNotification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscription: subscription,
                payload: payload
            })
        });

        if (response.ok) {
            showStatus('Push notification sent successfully!', 'success');
            
            // Update CURL command with new payload
            await generateCurlCommand(subscription);
        } else {
            const error = await response.text();
            showStatus('Error sending notification: ' + error, 'error');
        }

    } catch (error) {
        console.error('Error sending notification:', error);
        showStatus('Error sending notification: ' + error.message, 'error');
    } finally {
        sendPushBtn.disabled = false;
        sendPushBtn.textContent = 'Send Push Message';
    }
}

// Event listeners
pushToggle.addEventListener('click', async () => {
    if (isSubscribed) {
        pushToggle.classList.remove('active');
        await unsubscribeUser();
    } else {
        pushToggle.classList.add('active');
        await subscribeUser();
    }
});

sendPushBtn.addEventListener('click', sendPushNotification);

// Update CURL command when payload changes
payloadText.addEventListener('input', async () => {
    if (isSubscribed) {
        const subscription = await swRegistration.pushManager.getSubscription();
        if (subscription) {
            await generateCurlCommand(subscription);
        }
    }
});

// Text-to-speech function
function speakNotification(message) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance();
        utterance.text = `You have received notification. ${message}`;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';
        
        // Wait a bit for voices to load
        setTimeout(() => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                // Try to find a good English voice
                const preferredVoice = voices.find(voice => 
                    voice.lang.startsWith('en') && voice.name.includes('Female')
                ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
                
                utterance.voice = preferredVoice;
            }
            
            window.speechSynthesis.speak(utterance);
            console.log('Speaking notification:', message);
        }, 100);
    } else {
        console.log('Speech synthesis not supported');
        // Fallback: play a beep sound
        playBeepSound();
    }
}

// Fallback beep sound using Web Audio API
function playBeepSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.error('Error playing beep sound:', error);
    }
}

// Listen for messages from service worker
navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PLAY_NOTIFICATION_SOUND') {
        speakNotification(event.data.message);
    }
});

// Initialize the app when the page loads
window.addEventListener('load', initializeApp);
