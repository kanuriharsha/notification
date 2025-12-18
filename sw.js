// Service Worker for handling push notifications

self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(clients.claim());
});

// Handle push events
self.addEventListener('push', (event) => {
    console.log('Push event received:', event);

    let notificationData = {
        title: 'Push Notification',
        body: 'You have a new message!',
        icon: 'https://via.placeholder.com/192x192.png?text=📬',
        badge: 'https://via.placeholder.com/96x96.png?text=🔔',
        tag: 'push-notification-' + Date.now(),
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300, 100, 300],
        silent: false,
        renotify: true,
        data: {
            timestamp: Date.now()
        }
    };

    // Try to get the notification data from the push event
    if (event.data) {
        try {
            const payload = event.data.text();
            console.log('Push payload:', payload);
            
            // If payload is JSON, parse it
            try {
                const jsonData = JSON.parse(payload);
                if (jsonData.title) notificationData.title = jsonData.title;
                if (jsonData.body) notificationData.body = jsonData.body;
                if (jsonData.icon) notificationData.icon = jsonData.icon;
                if (jsonData.badge) notificationData.badge = jsonData.badge;
                if (jsonData.tag) notificationData.tag = jsonData.tag;
                if (jsonData.data) notificationData.data = { ...notificationData.data, ...jsonData.data };
            } catch (e) {
                // If not JSON, just use the text as the body
                notificationData.body = payload;
            }
        } catch (error) {
            console.error('Error processing push payload:', error);
        }
    }

    // Show the notification
    const promiseChain = self.registration.showNotification(
        notificationData.title,
        {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            requireInteraction: notificationData.requireInteraction,
            vibrate: notificationData.vibrate,
            silent: false,
            data: notificationData.data,
            actions: [
                {
                    action: 'open',
                    title: 'Open'
                },
                {
                    action: 'close',
                    title: 'Close'
                }
            ]
        }
    ).then(() => {
        // Try to play text-to-speech in all open clients
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                if (clientList.length > 0) {
                    // Browser has open tabs - send message to play TTS
                    clientList.forEach((client) => {
                        client.postMessage({
                            type: 'PLAY_NOTIFICATION_SOUND',
                            message: notificationData.body
                        });
                    });
                } else {
                    // No open tabs - notification will use OS default sound
                    // When user clicks notification, it will open and speak
                    console.log('No open tabs - OS will play default notification sound');
                }
            });
    });

    event.waitUntil(promiseChain);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    const notificationData = event.notification.data || {};
    const notificationBody = event.notification.body;
    
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        // Open the app when notification is clicked
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Check if there's already a window open
                    for (let i = 0; i < clientList.length; i++) {
                        const client = clientList[i];
                        if (client.url.includes(self.location.origin) && 'focus' in client) {
                            // Found an open window - focus it and speak the notification
                            return client.focus().then(() => {
                                // Send message to speak the order details
                                client.postMessage({
                                    type: 'SPEAK_ON_CLICK',
                                    message: notificationBody
                                });
                                return client;
                            });
                        }
                    }
                    // If no window is open, open a new one
                    if (clients.openWindow) {
                        return clients.openWindow('/?notification=' + encodeURIComponent(notificationBody));
                    }
                })
        );
    }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event);
});

// Handle push subscription change (when subscription expires or is revoked)
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('Push subscription changed:', event);
    
    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: event.oldSubscription ? event.oldSubscription.options.applicationServerKey : null
        }).then((subscription) => {
            console.log('Resubscribed to push notifications:', subscription);
            
            // Send the new subscription to the server
            return fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(subscription)
            }).then(() => {
                // Notify all clients about the new subscription
                return self.clients.matchAll({ includeUncontrolled: true })
                    .then((clientList) => {
                        clientList.forEach((client) => {
                            client.postMessage({
                                type: 'SUBSCRIPTION_UPDATED',
                                subscription: subscription
                            });
                        });
                    });
            });
        }).catch((error) => {
            console.error('Failed to resubscribe:', error);
        })
    );
});

// Keep service worker alive
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'KEEP_ALIVE') {
        event.ports[0].postMessage({ ok: true });
    }
});
