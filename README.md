# Push Notification Demo

A complete web push notification implementation with a modern UI, featuring service workers, VAPID authentication, and a Node.js backend.

## Features

✅ Enable/disable push notifications with toggle switch  
✅ Request browser notification permission  
✅ Subscribe to push notifications  
✅ Send push messages from the browser  
✅ Display subscription details and VAPID keys  
✅ Generate CURL commands for testing  
✅ Support for aes128gcm and aesgcm content encoding  
✅ Beautiful, responsive UI with gradient design  
✅ Backend API for managing subscriptions and sending notifications

## Prerequisites

- Node.js (v14 or higher)
- Modern web browser (Chrome, Firefox, Edge, Safari)
- HTTPS or localhost (required for service workers)

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

1. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Click the toggle to enable push notifications and grant permission when prompted

4. Send test notifications using the "Send a Push Message" section

## Project Structure

```
notifications project/
├── index.html          # Frontend UI
├── app.js              # Frontend JavaScript
├── sw.js               # Service Worker
├── server.js           # Node.js backend server
├── package.json        # Dependencies
├── vapid-keys.json     # VAPID keys (generated automatically)
└── README.md          # This file
```

## API Endpoints

### GET `/api/vapidPublicKey`
Returns the VAPID public key for subscription.

### POST `/api/subscribe`
Subscribe a client to push notifications.
```json
{
  "endpoint": "...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

### POST `/api/unsubscribe`
Unsubscribe a client from push notifications.

### POST `/api/sendNotification`
Send a push notification to a specific subscription.
```json
{
  "subscription": { ... },
  "payload": "Your notification message"
}
```

### POST `/api/broadcast`
Send a push notification to all subscribed clients.
```json
{
  "payload": "Broadcast message"
}
```

### POST `/api/generateCurl`
Generate a CURL command for testing.

### GET `/api/subscriptions`
Get all active subscriptions (for debugging).

### GET `/health`
Health check endpoint.

## How It Works

1. **Service Worker Registration**: The app registers a service worker (`sw.js`) that listens for push events

2. **Subscription**: When enabled, the app:
   - Requests notification permission from the user
   - Gets the VAPID public key from the server
   - Creates a push subscription using the PushManager API
   - Sends the subscription details to the server

3. **Sending Notifications**: The server:
   - Uses the web-push library to encrypt payloads
   - Sends encrypted notifications to the browser's push service (FCM, etc.)
   - Handles VAPID authentication automatically

4. **Receiving Notifications**: The service worker:
   - Receives push events from the push service
   - Displays notifications using the Notification API
   - Handles notification clicks and closes

## Testing with CURL

The app generates CURL commands you can use to send push notifications from the terminal:

```bash
curl \
  "https://fcm.googleapis.com/fcm/send/..." \
  --request POST \
  --header "TTL: 60" \
  --header "Content-Encoding: aes128gcm" \
  --header "Authorization: vapid t=..., k=..." \
  --data-binary @payload.bin
```

## Browser Support

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari 16+ (macOS, iOS 16.4+)
- ✅ Opera

**Note**: On iOS/iPadOS, web apps must be added to the Home Screen before requesting push permission.

## Troubleshooting

### Notifications not appearing?
- Ensure notification permissions are granted
- Check browser notification settings
- Verify the service worker is registered (DevTools → Application → Service Workers)

### Subscription failing?
- Make sure you're using HTTPS or localhost
- Check console for errors
- Verify VAPID keys are configured correctly

### Server errors?
- Ensure all npm packages are installed
- Check that port 3000 is available
- Review server console logs

## Security Notes

- VAPID keys are generated automatically on first run
- In production, use environment variables for sensitive keys
- Store subscriptions in a database, not in memory
- Use HTTPS in production (required for service workers)

## Resources

- [Web Push Protocol (RFC 8030)](https://tools.ietf.org/html/rfc8030)
- [Push API MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
- [web-push npm package](https://www.npmjs.com/package/web-push)

## License

MIT
