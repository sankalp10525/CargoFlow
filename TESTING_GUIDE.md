# CargoFlow - Testing & Usage Guide

## ✅ Fixed Issues

### Frontend Fixes
1. **Fixed duplicate export** in `OpsOrdersPage.tsx` - removed redundant function definition
2. **Fixed routing** in `App.tsx` - moved `RootRedirect` component before usage
3. **Enhanced CSS animations** - added smooth transitions to all buttons and cards
4. **Improved button states** - added hover effects, loading states, and disabled states

### UI/UX Enhancements
1. **Smooth animations**: All pages now fade in with `animate-fade-in`
2. **Button hover effects**: Buttons lift on hover (`hover:-translate-y-0.5`)
3. **Loading states**: Proper loading spinners and "Creating…" text on async operations
4. **Card hover**: Cards have smooth shadow transitions
5. **Input focus**: Better focus states with rings
6. **Responsive design**: Mobile-first approach throughout

## 🚀 Quick Start

### 1. Access the Application

- **Frontend**: http://localhost:8080/
- **Backend Admin**: http://localhost:8001/admin/
- **API Docs**: http://localhost:8001/api/docs/

### 2. Login Credentials

**Existing Demo Account**:
- Email: `admin@test.com`
- Password: `TestPass123!`
- Role: OPS_ADMIN

**Or Create New Account**:
- Go to http://localhost:8080/register
- Fill in the form with your details
- You'll be logged in automatically

## 📋 Complete End-to-End Workflow

### Step 1: Create Drivers & Vehicles

1. Navigate to **Fleet Management** (sidebar menu)
2. Switch to **Drivers** tab
3. Click **Add Driver** button
   - Name: "John Doe"
   - Phone: "+919876543210"
   - Email: "driver@test.com"
   - Password: "driver123"
4. Switch to **Vehicles** tab
5. Click **Add Vehicle**
   - Plate Number: "KA01AB1234"
   - Type: VAN
   - Capacity: 1000 kg

### Step 2: Create Orders

1. Navigate to **Orders** → **New Order**
2. Fill in order details:
   - Reference Code: Auto-generated or custom
   - Customer Name: "Alice Johnson"
   - Phone: "+919900001111"
   - Email: "alice@example.com"
3. Add stops:
   - **Pickup Stop**:
     - Address: "123 Warehouse Road"
     - City: "Bengaluru"
     - State: "Karnataka"
     - Postal Code: "560001"
   - **Drop Stop**:
     - Address: "456 Customer Street"
     - City: "Bengaluru"
     - State: "Karnataka"
     - Postal Code: "560002"
4. Click **Create Order**

**Repeat** to create 3-5 orders

### Step 3: Create Route

1. Navigate to **Routes**
2. Click **New Route**
3. Fill in route details:
   - Route Date: Today's date
   - Driver: Select the driver you created
   - Vehicle: Select the vehicle you created
   - Orders: Check the orders you want to assign
   - Enable **Optimize stop order** (optional)
4. Click **Create Route**

### Step 4: Driver App (Start Route & Deliver)

#### Login as Driver
1. Logout from ops account
2. Go to http://localhost:8080/login
3. Login with:
   - Email: `driver@test.com`
   - Password: `driver123`

#### Start Route
1. You'll see "Today's Route" card
2. Click **Start Route** button
3. Route status changes to "IN_PROGRESS"

#### Update Order Status
For each order in sequence:

1. Click on the order card
2. Click **Mark Picked Up** → Order status: PICKED_UP
3. Click **Mark In Transit** → Order status: IN_TRANSIT
4. Click **Mark Delivered (POD)** → Opens POD form

#### Submit Proof of Delivery
1. Enter receiver name (e.g., "Alice Johnson")
2. Add notes (optional): "Left at door"
3. Click **Confirm Delivery**
4. Order status changes to DELIVERED

**Repeat** for all orders on the route

### Step 5: Track Order (Customer View)

1. From ops dashboard, go to any order detail page
2. Copy the tracking token (shown at top of page)
3. Open in new tab: `http://localhost:8080/track/{TRACKING_TOKEN}`
4. You'll see:
   - Current order status
   - List of stops
   - Delivery history
   - POD details (if delivered)

### Step 6: Monitor from Ops Dashboard

1. Login back as ops user (`admin@test.com`)
2. Go to **Dashboard**
3. See real-time stats:
   - In Transit count
   - Delivered Today
   - Active Routes
   - Open Issues (exceptions)

## 🎨 UI Features to Test

### Animations & Interactions

1. **Page Transitions**: Navigate between pages - smooth fade-in
2. **Button Hover**: Hover over any button - lifts up slightly
3. **Button Click**: Click any button - scales down (active state)
4. **Card Hover**: Hover over order/route cards - shadow increases, lifts up
5. **Input Focus**: Click any input field - blue ring appears
6. **Modal Animations**: Open "Create Route" - modal scales in
7. **Loading States**: Click create buttons - see "Creating…" text
8. **Status Badges**: Different colors for different statuses

### Responsive Design

1. Resize browser window - layout adapts
2. Test on mobile (device toolbar in DevTools)
3. Sidebar collapses on mobile
4. Tables scroll horizontally on small screens

## 🔍 API Endpoints Working

All backend endpoints are functional:

- ✅ `POST /api/v1/auth/register/`
- ✅ `POST /api/v1/auth/login/`
- ✅ `GET /api/v1/auth/me/`
- ✅ `GET /api/v1/ops/drivers/`
- ✅ `POST /api/v1/ops/drivers/`
- ✅ `GET /api/v1/ops/vehicles/`
- ✅ `POST /api/v1/ops/vehicles/`
- ✅ `GET /api/v1/ops/orders/`
- ✅ `POST /api/v1/ops/orders/`
- ✅ `GET /api/v1/ops/orders/{id}/`
- ✅ `POST /api/v1/ops/orders/{id}/cancel/`
- ✅ `POST /api/v1/ops/orders/{id}/reassign/`
- ✅ `GET /api/v1/ops/routes/`
- ✅ `POST /api/v1/ops/routes/`
- ✅ `GET /api/v1/ops/routes/{id}/`
- ✅ `POST /api/v1/ops/routes/{id}/reorder/`
- ✅ `GET /api/v1/driver/routes/today/`
- ✅ `POST /api/v1/driver/routes/{id}/start/`
- ✅ `POST /api/v1/driver/orders/{id}/status/`
- ✅ `POST /api/v1/driver/orders/{id}/pod/`
- ✅ `GET /api/v1/tracking/{tracking_token}/`

## 🐛 Known Issues

None! All buttons are working and making correct API calls. The app is production-ready for local development and testing.

## 💡 Tips

1. **Auto-refresh**: The driver app auto-refreshes every 15-30 seconds
2. **Optimistic Updates**: TanStack Query invalidates cache after mutations
3. **Error Handling**: Toast notifications show success/error messages
4. **Validation**: Forms validate on submit with clear error messages
5. **JWT Tokens**: Automatically refreshed on 401 errors

## 🎯 Business Workflow Verified

✅ **Complete flow working**:
1. Create order (OPS) ✅
2. Assign to route (OPS) ✅  
3. Start route (DRIVER) ✅
4. Update order status (DRIVER) ✅
5. Submit POD (DRIVER) ✅
6. Customer tracking (PUBLIC) ✅
7. View analytics (OPS) ✅

All status transitions follow the business rules defined in the models.

## 📊 Status Machine

```
CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
                                              → FAILED
Any state → CANCELLED (ops only)
```

## 🚨 If You Encounter Issues

1. **Clear browser cache**: Shift+Cmd+R (Mac) or Ctrl+Shift+R (Windows)
2. **Check Docker logs**: `docker compose logs backend -f`
3. **Restart containers**: `docker compose restart`
4. **Check network tab**: F12 → Network tab in browser
5. **Verify JWT token**: Check localStorage in browser DevTools

---

**Enjoy using CargoFlow! 🚚📦**
