# Electrotrack Mobile App Architecture

## Overview
The mobile app is designed specifically for store owners to monitor business activity on the go. Its core responsibilities are:
1. **Sales Dashboard**: Display real-time sales data.
2. **Push Notifications**: Receive alerts for critical events (like Return Requests).
3. **Approvals**: Allow the owner to review, approve, or reject pending returns directly from their phone.

## Data Flow & Architecture

### 1. Authentication & Role Management
- The app will authenticate against the existing `electrotrack-api` `/auth/login` endpoint.
- It will receive a standard JWT token, which is attached to all subsequent API requests as a Bearer token.
- **Access Control:** The app relies on the existing role-based access control (RBAC). The owner must log in with an `owner` role to see pending returns and approve them.

### 2. Sales Data Retrieval
- The mobile app will poll or fetch data on-demand from the `/sales` endpoint.
- **Data Display:** It fetches aggregate data (total daily sales) and recent transactions to show on a dashboard feed.

### 3. Returns Approval Workflow
When a cashier or manager initiates a return from the web POS:
1. **Request Creation:** The POS sends a POST to `/returns`, creating a `pending` return record in the database.
2. **Notification Trigger:** The backend API will hook into this event (e.g., via a NestJS event emitter) and send a push notification payload to a Push Notification Provider (like Firebase Cloud Messaging - FCM or Apple APNs).
3. **App Reception:** The owner's phone receives the push notification: *"New Return Request: Invoice #INV-123"*.
4. **Owner Review:** Tapping the notification opens the Return Details screen in the mobile app, fetching the specific return details from `/returns/:id`.
5. **Approval/Rejection:** The owner clicks "Approve" (entering an optional refund amount) or "Reject". The app makes a PATCH request to `/returns/:id/approve` or `/returns/:id/reject`.
   - *Note: As per the latest updates, OTP is no longer required for this step.*

### 4. Push Notification Architecture (Proposed)
To support push notifications, the backend needs a way to register devices and send messages.

**Proposed Changes to Backend:**
- **Device Registration Endpoint:** A new endpoint `POST /users/devices` where the mobile app registers its FCM (Firebase Cloud Messaging) Device Token.
- **Notification Service:** A new NestJS service that integrates with Firebase Admin SDK.
- **Event Hook:** When a return is created in `ReturnsService`, an event is emitted. The Notification Service listens for this event, finds all device tokens associated with the `owner` of the tenant, and sends out the push notification.

### 5. API Endpoints Map for Mobile
- `POST /auth/login` - Login and get JWT.
- `GET /sales` - Fetch sales list for dashboard.
- `GET /returns?status=pending` - Fetch list of pending returns.
- `GET /returns/:id` - Fetch specific return details.
- `PATCH /returns/:id/approve` - Approve return (Body: `{ refundAmount, reviewNotes }`).
- `PATCH /returns/:id/reject` - Reject return (Body: `{ reviewNotes }`).
- `POST /users/devices` - *(To be implemented)* Register push notification device token.

---

This architecture ensures the app remains a lightweight consumer of the existing robust API, simply layering push notifications and a mobile-optimized UI over the current backend infrastructure.
