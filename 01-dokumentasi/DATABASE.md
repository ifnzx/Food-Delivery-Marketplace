# Database

Saat uji coba: **SQLite** di `04-database/local.db` (schema: `03-backend-lokal/prisma/schema.prisma`).

Nanti produksi: Cloud Firestore dengan koleksi di bawah. Nama entity diselaraskan.

## Collections

```
users
customers
merchants
couriers
menus
categories
orders
order_items
order_merchants
courier_assignments
courier_locations
payments
transactions
merchant_settlements
merchant_invoices
ratings
reviews
notifications
settings
promos
```

## users/{userId}

```
uid: string
email: string
displayName: string
phone: string
role: CUSTOMER | COURIER | MERCHANT | ADMIN | SUPER_ADMIN
status: ACTIVE | SUSPENDED
createdAt: timestamp
updatedAt: timestamp
```

Role juga disimpan sebagai Firebase Auth **custom claims** (`request.auth.token.role`).

## customers/{customerId}

```
userId: string
fullName: string
phone: string
photoUrl: string | null
defaultAddress: {
  label: string
  address: string
  latitude: number
  longitude: number
}
addresses: array
status: ACTIVE | SUSPENDED
createdAt: timestamp
```

## merchants/{merchantId}

```
userId: string
name: string
description: string
phone: string
address: string
latitude: number
longitude: number
operatingHours: map
isOpen: boolean
status: PENDING_APPROVAL | ACTIVE | SUSPENDED | REJECTED
suspensionState: null | OUTSTANDING | OVERDUE | WARNING | SUSPENDED
commissionRate: 0.15
outstandingAmount: number
photoUrl: string | null
createdAt: timestamp
```

## couriers/{courierId}

```
userId: string
fullName: string
phone: string
photoUrl: string | null
approvalStatus: PENDING | APPROVED | REJECTED | SUSPENDED
isOnline: boolean
lastLatitude: number | null
lastLongitude: number | null
lastLocationAt: timestamp | null
activeOrderId: string | null
createdAt: timestamp
```

## menus/{menuId}

```
merchantId: string
categoryId: string
name: string
description: string
price: number
stock: number
isAvailable: boolean
photoUrl: string | null
createdAt: timestamp
updatedAt: timestamp
```

Harga menu yang dipakai saat checkout diambil dari dokumen ini di server, bukan dari payload client.

## orders/{orderId}

```
customerId: string
status: OrderStatus
paymentMethod: CASH | ONLINE
paymentStatus: UNPAID | PENDING | PAID | PAID_CASH | FAILED | EXPIRED | REFUNDED | CANCELLED
paidAt: timestamp | null

foodSubtotal: number
deliveryFee: number
platformFee: number
grandTotal: number
courierEarning: number

deliveryAddress: string
deliveryLatitude: number
deliveryLongitude: number
routeDistanceKm: number
billedDistanceKm: number

courierId: string | null
merchantIds: string[]

createdAt: timestamp
acceptedAt: timestamp | null
pickedUpAt: timestamp | null
deliveredAt: timestamp | null
completedAt: timestamp | null
cancelledAt: timestamp | null
cancelReason: string | null
```

### OrderStatus

```
PENDING_PAYMENT
WAITING_OUTLET
OUTLET_ACCEPTED
PREPARING
READY_FOR_PICKUP
COURIER_ASSIGNED
COURIER_GOING_TO_OUTLET
PICKED_UP
DELIVERING
DELIVERED
COMPLETED
CANCELLED
```

`PENDING_PAYMENT` dipakai hanya untuk `paymentMethod = ONLINE` (saat gateway aktif). Cash MVP melewati status ini.

## order_items/{orderItemId}

```
orderId: string
orderMerchantId: string
merchantId: string
menuId: string
name: string
unitPrice: number
qty: number
subtotal: number
```

## order_merchants/{orderMerchantId}

```
orderId: string
merchantId: string
subtotal: number
commissionRate: number
commissionAmount: number
merchantAmount: number
status: WAITING | ACCEPTED | REJECTED | PREPARING | READY | COMPLETED | CANCELLED
createdAt: timestamp
completedAt: timestamp | null
```

## courier_locations/{courierId}

```
latitude: number
longitude: number
updatedAt: timestamp
status: ONLINE | OFFLINE | BUSY
activeOrderId: string | null
```

## courier_assignments/{assignmentId}

```
orderId: string
courierId: string
status: OFFERED | ACCEPTED | REJECTED | EXPIRED
offeredAt: timestamp
respondedAt: timestamp | null
```

## payments/{paymentId}

```
orderId: string
customerId: string
method: CASH | ONLINE
channel: CASH_ON_DELIVERY | QRIS | EWALLET | VA | CARD
provider: NONE | STUB | MIDTRANS | XENDIT
providerRef: string | null
idempotencyKey: string | null
amount: number
currency: IDR
status: INITIATED | PENDING | COLLECTED | PAID | FAILED | EXPIRED | REFUNDED | CANCELLED
collectedByCourierId: string   // diisi untuk CASH; kosong untuk ONLINE
checkoutUrl: string | null
failureReason: string | null
rawPayload: string | null      // JSON create/webhook
paidAt: timestamp | null
failedAt: timestamp | null
expiresAt: timestamp | null
createdAt: timestamp
updatedAt: timestamp
```

Cash MVP: baris Payment dibuat saat `completeOrder` (`COLLECTED`).
Online: baris Payment dibuat saat `createOrder` (`PENDING`), lalu di-update webhook.
## transactions/{transactionId}

Ledger server-side. Client tidak boleh menulis koleksi ini.

```
orderId: string
type: PLATFORM_FEE | MERCHANT_PAYABLE | COURIER_EARNING | SETTLEMENT_PAYMENT
partyType: PLATFORM | MERCHANT | COURIER
partyId: string
amount: number
createdAt: timestamp
```

## merchant_settlements/{settlementId}

```
merchantId: string
periodStart: timestamp
periodEnd: timestamp
totalSales: number
commissionRate: number
commissionAmount: number
paidAmount: number
remainingAmount: number
paymentMethod: TRANSFER
proofUrl: string | null
status: PENDING | VERIFIED | REJECTED
createdAt: timestamp
verifiedAt: timestamp | null
verifiedBy: string | null
```

## merchant_invoices/{invoiceId}

```
merchantId: string
periodStart: timestamp
periodEnd: timestamp
commissionAmount: number
minimumSettlement: number
dueDate: timestamp
status: OPEN | DUE | OVERDUE | PAID
createdAt: timestamp
```

## settings/business

```
commissionRate: 0.15
deliveryRatePerKm: 2000
customerServiceFee: 0
distanceRounding: CEIL
settlementPeriod: EVERY_10_CALENDAR_DAYS
minimumSettlement: 10000
paymentMethodMvp: CASH
onlinePaymentsEnabled: false
paymentProvider: NONE
deliveryMode: PER_KM | FLAT
deliveryFlatFee: 10000
```

`paymentMethodMvp` tetap `CASH`. Online baru ditawarkan jika `onlinePaymentsEnabled=true` **dan** `paymentProvider` ≠ `NONE`.
