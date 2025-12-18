const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Store subscriptions (in production, use a database)
let subscriptions = [];

// VAPID keys configuration
let vapidKeys;

// Use environment variables first, then try to load from file, or generate new ones
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidKeys = {
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY
    };
    console.log('Loaded VAPID keys from environment variables');
} else {
    const vapidKeysFile = path.join(__dirname, 'vapid-keys.json');
    if (fs.existsSync(vapidKeysFile)) {
        vapidKeys = JSON.parse(fs.readFileSync(vapidKeysFile, 'utf8'));
        console.log('Loaded existing VAPID keys from file');
    } else {
        vapidKeys = webpush.generateVAPIDKeys();
        try {
            fs.writeFileSync(vapidKeysFile, JSON.stringify(vapidKeys, null, 2));
            console.log('Generated new VAPID keys');
        } catch (error) {
            console.log('Generated new VAPID keys (file write skipped in serverless)');
        }
    }
}

// Configure web-push with VAPID details
webpush.setVapidDetails(
    'mailto:simple-push-demo@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

console.log('\n========================================');
console.log('VAPID Keys:');
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
console.log('========================================\n');

// Routes

// Get VAPID public key
app.get('/api/vapidPublicKey', (req, res) => {
    res.send(vapidKeys.publicKey);
});

// Subscribe endpoint
app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ message: 'Invalid subscription' });
    }
    
    // Check if subscription already exists
    const existingIndex = subscriptions.findIndex(sub => 
        sub.endpoint === subscription.endpoint
    );
    
    if (existingIndex !== -1) {
        // Update existing subscription
        subscriptions[existingIndex] = subscription;
        console.log('Subscription updated. Total subscriptions:', subscriptions.length);
    } else {
        // Add new subscription
        subscriptions.push(subscription);
        console.log('New subscription added. Total subscriptions:', subscriptions.length);
    }
    
    // Log subscription details
    console.log('Active subscriptions:', subscriptions.length);
    console.log('Subscription endpoint:', subscription.endpoint.substring(0, 50) + '...');
    
    res.status(201).json({ 
        message: 'Subscription saved',
        totalSubscriptions: subscriptions.length 
    });
});

// Unsubscribe endpoint
app.post('/api/unsubscribe', (req, res) => {
    const subscription = req.body;
    
    subscriptions = subscriptions.filter(sub => 
        sub.endpoint !== subscription.endpoint
    );
    
    console.log('Subscription removed. Total subscriptions:', subscriptions.length);
    res.status(200).json({ message: 'Unsubscribed' });
});

// Send notification endpoint
app.post('/api/sendNotification', async (req, res) => {
    const { subscription, payload } = req.body;

    if (!subscription) {
        return res.status(400).send('No subscription provided');
    }

    try {
        // Prepare the notification payload
        let notificationPayload;
        
        try {
            // Try to parse as JSON first
            JSON.parse(payload);
            notificationPayload = payload;
        } catch (e) {
            // If not JSON, create a simple notification object
            notificationPayload = JSON.stringify({
                title: 'Push Notification',
                body: payload,
                icon: 'https://via.placeholder.com/192x192.png?text=📬',
                badge: 'https://via.placeholder.com/96x96.png?text=🔔'
            });
        }

        // Send the push notification
        const result = await webpush.sendNotification(
            subscription,
            notificationPayload
        );

        console.log('Push notification sent successfully');
        console.log('Status:', result.statusCode);
        
        res.status(200).json({ 
            message: 'Notification sent successfully',
            statusCode: result.statusCode
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        
        if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription has expired or is no longer valid
            subscriptions = subscriptions.filter(sub => 
                sub.endpoint !== subscription.endpoint
            );
            console.log('Removed expired subscription');
        }
        
        res.status(500).send('Error sending notification: ' + error.message);
    }
});

// Generate CURL command
app.post('/api/generateCurl', async (req, res) => {
    const { subscription, payload } = req.body;

    if (!subscription) {
        return res.status(400).send('No subscription provided');
    }

    try {
        // Prepare the notification payload
        let notificationPayload;
        
        try {
            JSON.parse(payload);
            notificationPayload = payload;
        } catch (e) {
            notificationPayload = JSON.stringify({
                title: 'Push Notification',
                body: payload,
                icon: 'https://via.placeholder.com/192x192.png?text=📬',
                badge: 'https://via.placeholder.com/96x96.png?text=🔔'
            });
        }

        // Generate the encrypted payload and headers
        const options = {
            vapidDetails: {
                subject: 'mailto:simple-push-demo@example.com',
                publicKey: vapidKeys.publicKey,
                privateKey: vapidKeys.privateKey
            },
            TTL: 60
        };

        // Use web-push to generate the request details
        const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
            }
        };

        // Get the headers that would be sent
        const headers = webpush.generateRequestDetails(
            pushSubscription,
            notificationPayload,
            options
        );

        // Extract authorization header
        const authHeader = headers.headers.Authorization || '';

        // Determine content encoding
        const contentEncoding = headers.headers['Content-Encoding'] || 'aes128gcm';

        // Generate CURL command
        const curlCommand = `curl \\
  "${subscription.endpoint}" \\
  --request POST \\
  --header "TTL: 60" \\
  --header "Content-Encoding: ${contentEncoding}" \\
  --header "Authorization: ${authHeader}" \\
  --data-binary @payload.bin`;

        res.json({
            curlCommand,
            authHeader,
            contentEncoding,
            endpoint: subscription.endpoint
        });

    } catch (error) {
        console.error('Error generating CURL command:', error);
        res.status(500).send('Error generating CURL command: ' + error.message);
    }
});

// Broadcast notification to all subscriptions
app.post('/api/broadcast', async (req, res) => {
    const { payload } = req.body;

    if (subscriptions.length === 0) {
        return res.status(200).json({
            message: 'No subscriptions available',
            successCount: 0,
            failureCount: 0,
            totalSubscriptions: 0
        });
    }

    let notificationPayload;
    
    try {
        JSON.parse(payload);
        notificationPayload = payload;
    } catch (e) {
        notificationPayload = JSON.stringify({
            title: 'Broadcast Notification',
            body: payload,
            icon: 'https://via.placeholder.com/192x192.png?text=📬',
            badge: 'https://via.placeholder.com/96x96.png?text=🔔'
        });
    }

    let successCount = 0;
    let failureCount = 0;
    const failedSubscriptions = [];

    // Send to all subscriptions
    const promises = subscriptions.map(async (subscription) => {
        try {
            await webpush.sendNotification(subscription, notificationPayload);
            successCount++;
        } catch (error) {
            failureCount++;
            console.error('Failed to send to subscription:', error.message);
            
            if (error.statusCode === 410 || error.statusCode === 404) {
                failedSubscriptions.push(subscription);
            }
        }
    });

    await Promise.all(promises);

    // Remove expired subscriptions
    if (failedSubscriptions.length > 0) {
        subscriptions = subscriptions.filter(sub => 
            !failedSubscriptions.some(failed => failed.endpoint === sub.endpoint)
        );
        console.log(`Removed ${failedSubscriptions.length} expired subscriptions`);
    }

    res.json({
        message: 'Broadcast complete',
        successCount,
        failureCount,
        totalSubscriptions: subscriptions.length
    });
});

// Get all subscriptions (for debugging)
app.get('/api/subscriptions', (req, res) => {
    res.json({
        count: subscriptions.length,
        subscriptions: subscriptions.map(sub => ({
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime
        }))
    });
});

// Serve the broadcast notification admin page
app.get('/notifi', (req, res) => {
    res.sendFile(path.join(__dirname, 'notifi.html'));
});

// Serve the customer order page
app.get('/order', (req, res) => {
    res.sendFile(path.join(__dirname, 'order.html'));
});

// Serve the setup guide page
app.get('/setup', (req, res) => {
    res.sendFile(path.join(__dirname, 'setup.html'));
});

// Serve the settings page
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'settings.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        subscriptions: subscriptions.length,
        timestamp: new Date().toISOString()
    });
});

// Start server (only in local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`\n🚀 Push Notification Server running on http://localhost:${PORT}`);
        console.log(`\n📱 Open http://localhost:${PORT} in your browser to test push notifications\n`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        process.exit(0);
    });
}

// Export for Vercel
module.exports = app;
