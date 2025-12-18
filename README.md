# Push Notification Demo

A complete web push notification implementation designed for **restaurants, hotels, and food delivery**. Features real-time order notifications that work even when the browser is closed, with automatic sound alerts and vibration.

## Features

✅ **Restaurant order notifications with sound** (works when browser is closed)  
✅ **Strong vibration alerts** for instant attention  
✅ **Customer order page** at `/order` with menu selection  
✅ **Kitchen broadcast page** at `/notifi` to send to all devices  
✅ Enable/disable push notifications with toggle switch  
✅ Subscribe to push notifications  
✅ **Notifications work even when browser/phone is closed**  
✅ **Text-to-speech announcements** (when browser is open)  
✅ Display subscription details and VAPID keys  
✅ Beautiful, responsive UI  
✅ Backend API for managing subscriptions

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

## Admin Broadcast Page

To send notifications to ALL subscribed devices at once:

1. Navigate to:
```
http://localhost:3000/notifi
```
or on Vercel:
```
https://your-app.vercel.app/notifi
```

2. Enter a title and message
3. Click "Send Order to Kitchen"
4. All subscribed phones/devices will receive the notification **even if Chrome is closed**

## Customer Order Page

For customers to place orders:

1. Navigate to:
```
http://localhost:3000/order
```
or on Vercel:
```
https://your-app.vercel.app/order
```

2. Enter table number
3. Select menu items and quantities
4. Add special instructions (optional)
5. Click "Send Order to Kitchen"

## 🔔 How It Works (Even When Browser is Closed)

### **Notifications WITH Sound:**
- ✅ **Device notification sound** plays automatically (managed by OS)
- ✅ **Strong vibration pattern** (300ms x 4 times)
- ✅ **Notification stays on screen** until dismissed
- ✅ **Works when Chrome is completely closed**
- ✅ **Works when phone screen is locked**

### **Text-to-Speech:**
- 🔊 Plays when user opens the browser
- 📱 Announces: "You have received notification [message]"

### **Perfect for Restaurant Use:**
```
Kitchen staff subscribes → Orders come in → 
Phone vibrates + notification sound plays → 
Notification shows: "New Order - Table 5: 1 Biriyani, 2 Fried Rice"
→ Even if phone is in pocket or Chrome is closed!
```

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
