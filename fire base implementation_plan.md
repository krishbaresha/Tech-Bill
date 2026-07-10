# Firebase Push Notifications Implementation Plan

This plan details how we will integrate Firebase Cloud Messaging (FCM) into the NestJS backend to automatically send push notifications for sales and low stock alerts to the shop owners' mobile app.

> [!WARNING]
> **Open Question - Service Account Required:** You provided the Sender ID and a Web Push Key Pair. However, to send notifications securely from a backend server (NestJS), Firebase requires a **Service Account JSON key**. 
> 
> Please go to your Firebase Console -> **Project Settings** -> **Service Accounts** -> **Generate new private key**.
> 
> Once generated, please upload that `.json` file here or paste its contents so I can securely add it to the backend environment configurations!

## Proposed Changes

### Database Schema Updates
We will update the database to allow users (specifically owners) to store their mobile device's FCM token.
#### [MODIFY] [schema.prisma](file:///d:/POS/electrotrack-saas/techbill-api/prisma/schema.prisma)
- Add `fcmTokens String[] @default([])` to the `User` model to store one or more device tokens per user.

### API Endpoint for Device Registration
We need a way for the mobile app to securely send its generated FCM token to the backend.
#### [MODIFY] [auth.controller.ts](file:///d:/POS/electrotrack-saas/techbill-api/src/modules/auth/auth.controller.ts)
- Add `POST /auth/fcm-token` endpoint accepting `{ token: string }`.
#### [MODIFY] [auth.service.ts](file:///d:/POS/electrotrack-saas/techbill-api/src/modules/auth/auth.service.ts)
- Add a method to save the FCM token into the authenticated user's `fcmTokens` array.

### Firebase Admin Service
We will create a dedicated service to handle communication with the Firebase API.
#### [NEW] [firebase.service.ts](file:///d:/POS/electrotrack-saas/techbill-api/src/modules/firebase/firebase.service.ts)
- Install `firebase-admin` package.
- Initialize the Firebase Admin SDK using the Service Account credentials.
- Expose a `sendPushNotification(tokens: string[], title: string, body: string, data?: any)` method.

### Event Listeners
We will attach listeners to the existing system events so that notifications are dispatched automatically.
#### [NEW] [firebase.listener.ts](file:///d:/POS/electrotrack-saas/techbill-api/src/modules/firebase/firebase.listener.ts)
- Listen to `@OnEvent('sale.created')`: Query the database for all users with `role === 'owner'` in the tenant and push a notification (e.g., "New Sale: Rs 1500").
- Listen to `@OnEvent('stock.low')`: Query the database for the owner and push an alert (e.g., "Low Stock Alert: iPhone 15 Pro").

## Verification Plan
1. Ensure the Prisma migration successfully adds the `fcmTokens` field.
2. Verify that the `POST /auth/fcm-token` endpoint correctly saves tokens to the database.
3. Once the Service Account JSON is provided, verify the Firebase Admin initialization.
4. Manually trigger a sale and verify via logs that the `firebase-admin` messaging API is called with the correct owner token and payload.
