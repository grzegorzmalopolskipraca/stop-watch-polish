# Product Requirements Document (PRD)

## Czy ulica stoi? - Traffic Monitoring Application

**Version:** 1.0
**Last Updated:** December 12, 2025
**Product Owner:** Grzegorz Malopolski
**Contact:** grzegorz.malopolski@ringieraxelspringer.pl

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [Target Users](#3-target-users)
4. [Problem Statement](#4-problem-statement)
5. [Product Goals](#5-product-goals)
6. [Core Features](#6-core-features)
7. [User Journeys](#7-user-journeys)
8. [Success Metrics](#8-success-metrics)
9. [Technical Requirements](#9-technical-requirements)
10. [Future Roadmap](#10-future-roadmap)

---

## 1. Executive Summary

**"Czy ulica stoi?"** (English: "Is the street stopped?") is a community-driven, real-time traffic monitoring web application for Wrocław, Poland. The application enables residents to report and view current traffic conditions on major streets, receive push notifications about traffic changes, and make informed decisions about their daily commutes.

Unlike traditional navigation apps that rely solely on GPS data, "Czy ulica stoi?" leverages **crowdsourced reports** from local drivers to provide hyperlocal, real-time traffic intelligence for 13 key streets in Wrocław.

### Key Value Proposition

- **Real-time traffic updates** from actual drivers on the road
- **Push notifications** for subscribed streets
- **Traffic predictions** based on 4 weeks of historical patterns
- **Community features** including chat, voting, and carpooling coordination
- **Local business integration** through coupon redemption system

---

## 2. Product Overview

### 2.1 Product Purpose

**"Czy ulica stoi?"** enables Wrocław residents to:
1. **Report** real-time traffic conditions with one tap
2. **Receive** push notifications when traffic changes on subscribed streets
3. **Predict** traffic patterns using historical data and machine learning
4. **Decide** when to leave for commutes to avoid congestion
5. **Connect** with other drivers through community features (chat, voting, carpooling)

**Core Value**: Transform unpredictable daily commutes into informed decisions by leveraging community-driven, hyperlocal traffic intelligence.

---

### 2.2 User Problem

**Problem Statement**:
> "Wrocław commuters waste 10-20 minutes per commute sitting in unpredictable traffic jams because existing navigation apps (Google Maps, Waze) only show delays AFTER entering congested streets, and don't provide street-specific alerts or historical predictions."

**Impact**:
- **Time wasted**: 50-100 hours per year per commuter
- **Fuel costs**: Additional PLN 500-1,000 per year
- **Stress**: Daily uncertainty about commute duration
- **Productivity loss**: Late arrivals to work, missed appointments

**Why existing solutions fail**:
1. Google Maps/Waze are designed for navigation, not status checking
2. No push notifications for specific streets
3. No historical predictions (can't plan ahead)
4. Generic city-wide traffic news (not hyperlocal)
5. No community input (GPS-only data)

---

### 2.3 Functional Requirements (High-Level)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| FR-1 | Traffic Reporting | Users can report traffic status (stopped/slow/flowing) for selected street and direction | 🔴 Critical |
| FR-2 | Real-time Display | All users see current traffic status within 2 seconds of submission | 🔴 Critical |
| FR-3 | Push Notifications | Users receive push alerts when traffic changes on subscribed streets | 🔴 Critical |
| FR-4 | Traffic Predictions | System predicts traffic for next 60 minutes using 4 weeks of historical data | 🔴 Critical |
| FR-5 | Speed Integration | App fetches and displays real-time speed from Google Routes API | 🟡 High |
| FR-6 | Street Selection | Users can select from 13 major streets in Wrocław | 🔴 Critical |
| FR-7 | Direction Filter | Users can filter traffic by direction (to/from city center) | 🔴 Critical |
| FR-8 | Historical Timeline | Users can view traffic patterns: today (hourly), weekly (30-min blocks) | 🟡 High |
| FR-9 | Optimal Timing | "GreenWave" feature recommends best departure time to avoid traffic | 🟡 High |
| FR-10 | Street Chat | Real-time community chat per street with rate limiting | 🟢 Medium |
| FR-11 | Weather Integration | Display current weather and 7-day forecast correlated with traffic | 🟢 Medium |
| FR-12 | Coupon System | Local businesses can create discount coupons; users redeem via QR codes | 🟢 Medium |
| FR-13 | User Accounts | Email/password and OAuth authentication for personalization | 🟡 High |
| FR-14 | Statistics Dashboard | Aggregated traffic analytics with charts and trends | 🟢 Medium |
| FR-15 | Mobile Responsive | Full functionality on mobile devices (touch-optimized) | 🔴 Critical |

---

### 2.4 Project Boundaries

#### In Scope ✅

**Geography**:
- Wrocław, Poland only
- 13 specific major streets (see Appendix A)

**Features**:
- Real-time traffic reporting and display
- Push notifications (web push only)
- Traffic predictions (historical pattern matching)
- Community features (chat, voting)
- Coupon redemption system
- Weather integration
- User authentication

**Platforms**:
- Web application (desktop + mobile browsers)
- Progressive Web App (PWA) capabilities

**Languages**:
- Polish UI only (target audience: Polish-speaking Wrocław residents)

**Data**:
- Traffic reports (90-day retention)
- User accounts (indefinite)
- Chat messages (30-day retention)

---

#### Out of Scope ❌

**Geography**:
- ❌ Other cities in Poland (future roadmap)
- ❌ International markets
- ❌ All streets in Wrocław (only 13 main routes)

**Features**:
- ❌ Turn-by-turn navigation (use Google Maps)
- ❌ Public transport tracking (future consideration)
- ❌ Parking availability (future consideration)
- ❌ Accident reporting with emergency services integration
- ❌ Video/photo uploads in traffic reports
- ❌ Private messaging between users
- ❌ Ride-sharing/carpooling booking system (only voting/coordination)
- ❌ Traffic light synchronization data
- ❌ Road construction database

**Platforms**:
- ❌ Native iOS app (future roadmap)
- ❌ Native Android app (future roadmap)
- ❌ Desktop applications
- ❌ Smart TV apps
- ❌ Voice assistants (Alexa, Google Home)

**Languages**:
- ❌ English version (not needed for local market)
- ❌ Other languages

**Data**:
- ❌ Personal location tracking (privacy concern)
- ❌ Vehicle identification (license plates)
- ❌ Personally identifiable information in reports

**Business Model**:
- ❌ Paid advertising (currently ad-free)
- ❌ Premium subscriptions (future roadmap)
- ❌ Data selling to third parties

---

### 2.5 User Stories (Consolidated)

#### Epic 1: Traffic Reporting

**US-1.1**: As a **commuter**, I want to **report current traffic status with one tap** so that **other drivers can avoid jams**.
- **Acceptance Criteria**:
  - ✅ Three status buttons visible: "Stoi", "Toczy się", "Jedzie"
  - ✅ Report submitted in <2 seconds
  - ✅ Success confirmation shown

**US-1.2**: As a **driver**, I want to **see real-time traffic status** so that **I can decide whether to take this route**.
- **Acceptance Criteria**:
  - ✅ Traffic status visible within 2 seconds of latest report
  - ✅ Color-coded display (red/yellow/green)
  - ✅ Timestamp of last report shown

**US-1.3**: As a **user**, I want the **app to include current speed automatically** so that **I don't have to enter it manually**.
- **Acceptance Criteria**:
  - ✅ Speed fetched from Google Routes API
  - ✅ Speed displayed in TrafficLine gauge
  - ✅ Speed included in database when I submit report

---

#### Epic 2: Push Notifications

**US-2.1**: As a **commuter**, I want to **receive push notifications when traffic is bad on my route** so that **I can leave earlier or choose alternative route**.
- **Acceptance Criteria**:
  - ✅ Notifications received within 2 minutes of traffic change
  - ✅ Notification shows street name, status, and direction
  - ✅ Click notification opens app

**US-2.2**: As a **user**, I want to **subscribe only to streets I care about** so that **I don't get irrelevant notifications**.
- **Acceptance Criteria**:
  - ✅ Per-street subscription on /push page
  - ✅ Toggle on/off for each street independently
  - ✅ Subscription status saved across sessions

**US-2.3**: As a **user**, I want to **test notifications before relying on them** so that **I know they're working**.
- **Acceptance Criteria**:
  - ✅ "Test notification" button on /push page
  - ✅ Test notification delivered within 10 seconds
  - ✅ Clear success/failure message

---

#### Epic 3: Traffic Predictions

**US-3.1**: As a **commuter**, I want to **see predicted traffic for the next hour** so that **I can time my departure**.
- **Acceptance Criteria**:
  - ✅ Predictions shown in 5-minute intervals (12 blocks)
  - ✅ Color-coded visualization (red/yellow/green/grey)
  - ✅ Updates automatically when data changes

**US-3.2**: As a **user**, I want to **know the best time to leave** so that **I avoid peak congestion**.
- **Acceptance Criteria**:
  - ✅ "GreenWave" component shows optimal departure time
  - ✅ Recommendation based on 10-minute interval analysis
  - ✅ Confidence score displayed

**US-3.3**: As a **driver**, I want to **see historical traffic patterns** so that **I understand typical congestion times**.
- **Acceptance Criteria**:
  - ✅ Weekly timeline shows last 7 days (30-min blocks)
  - ✅ Today timeline shows full 24 hours (1-hour blocks)
  - ✅ Day-of-week labels for pattern recognition

---

#### Epic 4: Community Features

**US-4.1**: As a **driver**, I want to **chat with other drivers on the same street** so that **I can ask about current conditions or warn about hazards**.
- **Acceptance Criteria**:
  - ✅ Street-specific chat rooms
  - ✅ Messages appear in real-time (<5 seconds)
  - ✅ Rate limiting prevents spam (1 message per 30 seconds)

**US-4.2**: As a **community member**, I want to **vote on street priorities** so that **my voice is heard**.
- **Acceptance Criteria**:
  - ✅ Voting interface on main page
  - ✅ Results displayed in real-time
  - ✅ One vote per user per day

**US-4.3**: As a **driver**, I want to **coordinate carpooling** so that **I can share rides and reduce traffic**.
- **Acceptance Criteria**:
  - ✅ Carpooling voting component
  - ✅ Direction-specific (to/from center)
  - ✅ Anonymous coordination (no personal contact info)

---

#### Epic 5: Business Integration

**US-5.1**: As a **business owner**, I want to **offer discount coupons to app users** so that **I attract customers during slow hours**.
- **Acceptance Criteria**:
  - ✅ Coupon creation interface at /coupons
  - ✅ Set discount percentage, validity period, location
  - ✅ Upload coupon image

**US-5.2**: As a **user**, I want to **redeem coupons at local businesses** so that **I get discounts**.
- **Acceptance Criteria**:
  - ✅ QR code scanning with camera
  - ✅ Coupon details displayed clearly
  - ✅ One-time use enforcement (status lifecycle)

**US-5.3**: As a **business owner**, I want to **track coupon usage** so that **I measure ROI**.
- **Acceptance Criteria**:
  - ✅ Admin panel shows all coupons
  - ✅ Redemption count per coupon
  - ✅ Status filter (active/redeemed/used/expired)

---

### 2.6 Success Metrics (Summary)

#### Primary Metrics (KPIs)

| Metric | Target | Timeline | Priority |
|--------|--------|----------|----------|
| **Monthly Active Users (MAU)** | 10,000+ | 6 months | 🔴 Critical |
| **Traffic Reports per Day** | 500+ | 3 months | 🔴 Critical |
| **Prediction Accuracy** | 80%+ | Ongoing | 🔴 Critical |
| **30-Day User Retention** | 40%+ | 6 months | 🔴 Critical |
| **Push Subscribers** | 5,000+ | 6 months | 🟡 High |

#### Secondary Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Daily Active Users (DAU) | 2,000+ | 6 months |
| Reports per Active User | 2-3 per day | Ongoing |
| Notification CTR | 15%+ | 3 months |
| Coupon Redemptions | 200/month | 6 months |
| Chat Messages per Day | 100+ | 3 months |

#### Success Criteria

The product is **successful** when:
1. ✅ Users check the app **before** leaving (preventive, not reactive)
2. ✅ 80%+ of predictions are accurate within ±1 status level
3. ✅ 40%+ of users return after 30 days (strong retention)
4. ✅ Community contributes 50+ reports per street per day (active participation)
5. ✅ Local businesses report 10%+ increase in foot traffic from coupons
6. ✅ Users prefer street-specific notifications over generic navigation apps
7. ✅ Average time saved per commute: 10+ minutes

---

## 3. Product Vision

### Vision Statement

> *"To become the go-to source for real-time traffic information in Wrocław, empowering commuters to make better travel decisions through community-driven data and predictive analytics."*

### Mission

Reduce commute stress and wasted time by providing accurate, hyperlocal traffic information that traditional navigation apps miss, while fostering a community of engaged drivers who help each other navigate the city more efficiently.

### Product Positioning

| Aspect | Description |
|--------|-------------|
| **For** | Wrocław residents who commute on major streets daily |
| **Who** | Need real-time, accurate traffic information to avoid congestion |
| **The** | "Czy ulica stoi?" is a community-driven traffic monitoring app |
| **That** | Provides crowdsourced traffic reports and predictions for 13 key streets |
| **Unlike** | Google Maps or Waze, which focus on navigation |
| **Our product** | Specializes in hyperlocal, community-reported traffic status with street-specific notifications and historical predictions |

---

## 3. Target Users

### Primary Personas

#### 1. **Daily Commuter (Kamil, 35)**

**Background:**
- Works in downtown Wrocław, lives in suburbs
- Drives Borowska street every morning and evening
- Frustrated by unpredictable traffic jams

**Goals:**
- Know if traffic is bad before leaving home
- Choose alternative routes when necessary
- Minimize commute time

**Pain Points:**
- Google Maps shows delays only after getting stuck
- No way to check traffic without opening navigation app
- Unpredictable traffic patterns on his regular route

**How they use the app:**
- Subscribed to push notifications for Borowska
- Checks traffic prediction before leaving work
- Reports traffic status when stopped at lights

---

#### 2. **Delivery Driver (Ania, 28)**

**Background:**
- Professional courier
- Drives multiple routes across Wrocław daily
- Time-sensitive deliveries

**Goals:**
- Avoid traffic hotspots
- Optimize delivery routes in real-time
- Maximize deliveries per day

**Pain Points:**
- Loses money when stuck in traffic
- Needs to know current conditions on multiple streets
- Can't predict which routes will be congested

**How they use the app:**
- Checks multiple streets before starting shift
- Uses GreenWave feature to plan optimal departure times
- Reports traffic status to help other drivers

---

#### 3. **Local Business Owner (Marek, 42)**

**Background:**
- Owns restaurant on Grabiszyńska street
- Wants to attract customers during slow traffic hours
- Tech-savvy, interested in local marketing

**Goals:**
- Increase foot traffic during off-peak hours
- Engage with local community
- Offer targeted promotions

**Pain Points:**
- Limited marketing budget
- Hard to reach hyperlocal audience
- Difficulty predicting customer flow

**How they use the app:**
- Uses coupon system to offer discounts
- Targets drivers stuck in traffic near his location
- Tracks redemption patterns

---

### Secondary Personas

- **Bicycle Commuters**: Check traffic to avoid dangerous congested areas
- **Public Transport Users**: Understand why buses are delayed
- **Parents**: Plan school pickup/dropoff around traffic
- **Newcomers to Wrocław**: Learn traffic patterns of the city

---

## 4. Problem Statement

### The Problem

Wrocław residents face daily uncertainty about traffic conditions on major commuting routes. Existing solutions (Google Maps, Waze) are designed for navigation, not for checking if your regular route has traffic **before you leave**.

### Why Existing Solutions Fall Short

1. **Google Maps / Waze**
   - Designed for navigation, not status checking
   - Requires opening app and entering destination
   - No push notifications for specific streets
   - Delays shown only after entering the street
   - No historical predictions

2. **Traffic Radio (CB Radio, Radio Wrocław)**
   - Broadcasts general traffic news for entire city
   - Not street-specific
   - No on-demand information
   - One-way communication

3. **Social Media Groups**
   - Unstructured information
   - No real-time updates
   - No notifications
   - Hard to find relevant reports

### Why This Matters

- **Average commute time in Wrocław**: 30-45 minutes
- **Potential time saved**: 10-20 minutes per commute with better route planning
- **Annual time savings**: 50-100 hours per person
- **Economic impact**: Reduced fuel costs, lower stress, improved quality of life

---

## 5. Product Goals

### Business Goals (2025)

| Goal | Target | Priority |
|------|--------|----------|
| Active monthly users | 10,000+ | 🔴 Critical |
| Daily active users | 2,000+ | 🔴 Critical |
| Traffic reports per day | 500+ | 🟡 High |
| Push notification subscribers | 5,000+ | 🟡 High |
| Coupon redemptions | 200/month | 🟢 Medium |
| User retention (30-day) | 40%+ | 🔴 Critical |

### User Goals

1. **Efficiency**: Help users save 10+ minutes per commute
2. **Reliability**: Achieve 85%+ prediction accuracy
3. **Community**: Build engaged user base contributing 50+ reports/day per street
4. **Convenience**: Deliver relevant notifications within 2 minutes of traffic changes
5. **Value**: Enable local businesses to increase foot traffic by 15%+

### Product Success Criteria

The product is successful when:
- Users check the app **before** starting their commute (preventive, not reactive)
- Users trust predictions enough to change routes based on them
- Community actively contributes reports (not just passive consumers)
- Local businesses see ROI from coupon system
- Users prefer our street-specific notifications over generic navigation apps

---

## 6. Core Features

### 6.1 Real-Time Traffic Reporting

**Description**: Users report current traffic status with a single tap

**User Stories**:
- As a commuter, I want to report traffic status so I can help others avoid jams
- As a driver, I want to see current traffic status so I can plan my route

**Acceptance Criteria**:
- ✅ Three status options: "Stoi" (stopped), "Toczy się" (slow), "Jedzie" (flowing)
- ✅ Report includes: street, direction (to/from center), timestamp
- ✅ Automatic speed integration from Google Routes API
- ✅ One-tap reporting (pre-selected street and direction remembered)
- ✅ Confirmation message after successful submission
- ✅ Reports visible to all users within 2 seconds

**Technical Implementation**:
- Frontend: Index.tsx with three status buttons
- Backend: submit-traffic-report Edge Function
- Database: traffic_reports table
- Speed data: Integrated from TrafficLine component

---

### 6.2 Push Notifications

**Description**: Street-specific push notifications when traffic conditions change

**User Stories**:
- As a commuter, I want to receive notifications when traffic is bad on my route
- As a user, I want to subscribe only to streets I care about
- As a user, I want to control when I receive notifications (e.g., only during work hours)

**Acceptance Criteria**:
- ✅ Per-street subscription (tag-based: `street_<streetname>`)
- ✅ Notifications triggered by traffic reports
- ✅ Show status change (e.g., "Ruch na Borowskiej: Stoi (do centrum)")
- ✅ Foreground notifications (even when app is open)
- ✅ Easy subscribe/unsubscribe in /push page
- ✅ Test notification feature for debugging

**Technical Implementation**:
- OneSignal Web SDK v16
- Service Worker: /OneSignalSDKWorker.js
- Backend: send-push-notifications Edge Function
- Tag management: OneSignal.User.addTag() / removeTag()

**Current Limitations**:
- No time-based filtering (e.g., "only during rush hour")
- All status changes trigger notifications (not just "stoi")

---

### 6.3 Traffic Predictions

**Description**: Machine learning-based predictions using 4 weeks of historical data

**User Stories**:
- As a commuter, I want to see predicted traffic for the next hour so I can time my departure
- As a user, I want to know the best time to leave to avoid traffic
- As a driver, I want to see historical patterns to understand typical congestion times

**Acceptance Criteria**:
- ✅ Next 60 minutes prediction (5-minute intervals)
- ✅ Today's timeline (1-hour blocks, full 24 hours)
- ✅ Weekly timeline (last 7 days, 30-minute blocks, 5:00-22:00)
- ✅ GreenWave: Optimal departure time calculator (10-minute intervals)
- ✅ Day-of-week filtering (Mondays predict Mondays)
- ✅ Direction-specific predictions
- ✅ Majority voting algorithm for status determination

**Algorithm**:
1. Fetch 28 days of historical traffic reports
2. Filter to same day of week as current day
3. Filter by selected direction
4. Group into time intervals (5-min, 10-min, 30-min, or 1-hour)
5. Use majority voting to determine predicted status per interval
6. Display color-coded visualization

**Technical Implementation**:
- Components: PredictedTraffic, TodayTimeline, WeeklyTimeline, GreenWave
- Utilities: trafficCalculations.ts, trafficPrediction.ts
- Data source: Supabase traffic_reports table

---

### 6.4 Traffic Speed Integration

**Description**: Real-time speed data from Google Routes API

**User Stories**:
- As a user, I want to see current average speed on the street
- As a reporter, I want the app to automatically include speed in my traffic report

**Acceptance Criteria**:
- ✅ Fetch traffic data from Google Routes API
- ✅ Calculate average speed (km/h)
- ✅ Display speed gauge on TrafficLine component
- ✅ Automatically include speed in traffic reports
- ✅ Store speed in database for future analysis

**Technical Implementation**:
- Component: TrafficLine.tsx
- Backend: get-traffic-data Edge Function
- Speed calculation: `(distance/1000) / (duration_in_traffic/3600)` = km/h
- Data flow: TrafficLine → onSpeedUpdate → Index.tsx → submitReport → Database

---

### 6.5 Street Chat

**Description**: Real-time chat per street for community discussions

**User Stories**:
- As a driver, I want to ask other drivers about current conditions
- As a commuter, I want to warn others about accidents or road work
- As a community member, I want to discuss traffic patterns with others

**Acceptance Criteria**:
- ✅ Street-specific chat rooms
- ✅ Real-time message updates
- ✅ Rate limiting (prevent spam)
- ✅ Anonymous posting (with user fingerprint)
- ✅ Message history (last 50 messages)

**Technical Implementation**:
- Component: StreetChat.tsx
- Backend: submit-chat-message Edge Function
- Database: chat_messages table
- Rate limiting: 1 message per 30 seconds per user

**Current Limitations**:
- No moderation tools
- No message editing or deletion
- No user profiles or avatars

---

### 6.6 Coupon System

**Description**: Local business discount coupons with QR code redemption

**User Stories**:
- As a business owner, I want to offer discounts to drivers stuck in traffic near my location
- As a user, I want to redeem coupons at nearby businesses
- As a business owner, I want to track coupon usage and ROI

**Acceptance Criteria**:
- ✅ Coupon creation (admin interface at /coupons)
- ✅ QR code generation for redemption
- ✅ Camera integration for QR scanning
- ✅ Coupon status lifecycle: active → redeemed → used → expired
- ✅ Time-based validity (time_from, time_to)
- ✅ Location-based association

**Technical Implementation**:
- Admin: Coupons.tsx (coupon management)
- User: Kupon.tsx (redemption with QR scanning)
- QR Scanner: @zxing/browser (BrowserQRCodeReader)
- Database: coupons table, locations table
- Storage: Supabase Storage for coupon images

**User Flow**:
1. Business owner creates coupon in /coupons
2. System generates unique URL: `/kupon?id=<coupon-id>`
3. User scans QR code at business location
4. Camera opens, QR decoded
5. Coupon status changes: active → redeemed → used
6. Business owner validates redemption

---

### 6.7 Weather Integration

**Description**: Current weather and 7-day forecast for Wrocław

**User Stories**:
- As a driver, I want to see if weather is affecting traffic conditions
- As a user, I want to plan my week based on weather and traffic patterns

**Acceptance Criteria**:
- ✅ Current weather conditions
- ✅ 7-day forecast
- ✅ Weather icons and temperatures
- ✅ Integration with traffic data (correlation)

**Technical Implementation**:
- Component: WeatherForecast.tsx
- Backend: get-weather-forecast Edge Function
- API: External weather API (OpenWeather or similar)

---

### 6.8 Traffic Statistics

**Description**: Aggregated traffic data visualizations and analytics

**User Stories**:
- As a user, I want to see which streets have the most congestion
- As a city planner, I want to analyze traffic patterns over time
- As a commuter, I want to compare traffic across different streets

**Acceptance Criteria**:
- ✅ Traffic charts using recharts
- ✅ Aggregated data by street, time, day
- ✅ Historical trends
- ✅ Comparison views

**Technical Implementation**:
- Page: Statystyki.tsx
- Charts: recharts library
- Data source: Aggregated queries on traffic_reports table

---

### 6.9 User Account Management

**Description**: User authentication and profile management

**User Stories**:
- As a user, I want to create an account to save my preferences
- As a user, I want to log in to see my history and settings
- As a user, I want to manage my notification preferences

**Acceptance Criteria**:
- ✅ Email/password authentication
- ✅ OAuth social login
- ✅ Profile settings
- ✅ Subscription management

**Technical Implementation**:
- Auth: Auth.tsx (login/signup)
- Account: Konto.tsx (profile management)
- Backend: Supabase Auth
- Database: users table

---

## 7. User Journeys

### Journey 1: First-Time User Reporting Traffic

**Goal**: Submit first traffic report

**Steps**:
1. User opens app (/) for first time
2. Sees street selector dropdown (13 streets)
3. Selects "Borowska" from dropdown
4. Sees direction tabs: "do centrum" | "od centrum"
5. Clicks "do centrum"
6. Sees TrafficLine component loading Google Routes data
7. Sees speed gauge: "Średnia prędkość: 35 km/h"
8. Sees three status buttons: "Stoi" (red), "Toczy się" (yellow), "Jedzie" (green)
9. Clicks "Stoi" button
10. Sees success toast: "Zgłoszenie wysłane!"
11. Sees updated traffic visualization

**Success Criteria**:
- ✅ User completes report in <30 seconds
- ✅ Report appears in database immediately
- ✅ Other users see update within 2 seconds

**Drop-off Points**:
- Street selection (confused by 13 options)
- Direction selection (unclear what "do centrum" means)
- Status selection (unsure which status to choose)

---

### Journey 2: Subscribing to Push Notifications

**Goal**: Receive notifications for Borowska street

**Steps**:
1. User navigates to /push page
2. Sees "Zarządzaj powiadomieniami" header
3. Sees list of 13 streets with subscribe buttons
4. Clicks "Subskrybuj" next to "Borowska"
5. Browser prompts for notification permission
6. User clicks "Allow"
7. OneSignal registers subscription
8. Tag added: "street_borowska"
9. Button changes to "Anuluj subskrypcję" (green)
10. localStorage updated: subscriptions["Borowska"] = true
11. User returns to home page
12. Later, when someone reports "Stoi" on Borowska:
    - Push notification received: "Ruch na Borowskiej: Stoi (do centrum)"
    - User clicks notification → opens app

**Success Criteria**:
- ✅ Subscription completes in <15 seconds
- ✅ Notification received within 2 minutes of traffic change
- ✅ User can easily unsubscribe

**Drop-off Points**:
- Notification permission denied
- Confusion about which streets to subscribe to
- Too many notifications (user unsubscribes)

---

### Journey 3: Planning Commute with Predictions

**Goal**: Decide when to leave for work to avoid traffic

**Steps**:
1. User opens app at 7:30 AM
2. Selects "Borowska" and "do centrum"
3. Scrolls to "Prognoza na najbliższą godzinę" section
4. Sees 12 blocks (5-min intervals) for 7:30-8:30
5. Sees pattern: 🟢🟢🟡🔴🔴🔴🔴🔴🟡🟢🟢🟢
6. Realizes traffic will be worst 7:45-8:10
7. Scrolls to "Zielona fala" section
8. Sees optimal departure time: "Wyjedź o 8:15 dla najlepszego ruchu"
9. User decides to wait until 8:15
10. Leaves at 8:15, avoids traffic jam

**Success Criteria**:
- ✅ User saves 10-15 minutes by timing departure
- ✅ Prediction accuracy >80%
- ✅ User returns to use predictions regularly

**Drop-off Points**:
- Predictions inaccurate (user loses trust)
- Visualization unclear (user doesn't understand blocks)
- No historical data (not enough reports for predictions)

---

### Journey 4: Redeeming Business Coupon

**Goal**: Use discount at local restaurant

**Steps**:
1. User sees coupon announcement in traffic chat
2. Clicks link to `/kupon?id=abc123`
3. Sees coupon details:
   - "Restauracja Pod Orłem"
   - "20% zniżki na dania główne"
   - "Ważny do: 2025-12-31"
4. User drives to restaurant
5. At restaurant, clicks "Zeskanuj QR kod"
6. Browser prompts for camera permission
7. User clicks "Allow"
8. Camera opens, user points at QR code on counter
9. QR decoded, coupon status changes to "used"
10. Cashier verifies status: "Kupon wykorzystany"
11. User gets 20% discount

**Success Criteria**:
- ✅ QR scanning works on first attempt
- ✅ Coupon can't be reused (fraud prevention)
- ✅ Business sees redemption in admin panel

**Drop-off Points**:
- Camera permission denied
- QR code doesn't scan (poor lighting, wrong code)
- Coupon already expired or used

---

## 8. Success Metrics

### 8.1 Acquisition Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| New users per week | 200+ | Google Analytics |
| Traffic source (organic vs. referral) | 60% organic | GA source/medium |
| Landing page bounce rate | <40% | GA bounce rate |
| Time to first report | <2 minutes | Custom event tracking |

### 8.2 Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily active users (DAU) | 2,000+ | Unique visitors per day |
| Monthly active users (MAU) | 10,000+ | Unique visitors per month |
| Traffic reports per day | 500+ | Database count |
| Reports per active user | 2-3 per day | Average reports/DAU |
| Average session duration | 3-5 minutes | Google Analytics |
| Pages per session | 2-3 | Google Analytics |
| Chat messages per day | 100+ | Database count |

### 8.3 Retention Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Day 1 retention | 40%+ | % users returning next day |
| Day 7 retention | 30%+ | % users returning after 7 days |
| Day 30 retention | 20%+ | % users returning after 30 days |
| Churn rate | <10% per month | % users who stop using app |

### 8.4 Notification Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Push subscribers | 5,000+ | OneSignal dashboard |
| Notification opt-in rate | 30%+ | Subscribers / total users |
| Notification click-through rate | 15%+ | Clicks / deliveries |
| Unsubscribe rate | <5% per month | OneSignal data |

### 8.5 Business Metrics (Coupons)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Active coupons | 20+ | Database count |
| Coupon redemptions | 200/month | Status = "used" |
| Redemption rate | 10%+ | Redeemed / active coupons |
| Partner satisfaction | 8/10+ | Survey score |

### 8.6 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Prediction accuracy | 80%+ | Actual vs. predicted status |
| Report timeliness | <2 sec | Report submission to visibility |
| App load time | <3 sec | Lighthouse score |
| Error rate | <1% | Sentry error tracking |
| Uptime | 99.5%+ | Uptime monitoring |

### 8.7 Community Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Contributors (weekly) | 1,000+ | Unique users submitting reports |
| Contribution ratio | 50%+ | Contributors / active users |
| Chat participants | 200+ per week | Unique chat message senders |
| Average reports per street | 50+ per day | Reports / 13 streets |

---

## 9. Technical Requirements

### 9.1 Performance Requirements

| Requirement | Target | Priority |
|-------------|--------|----------|
| Page load time (First Contentful Paint) | <1.5 sec | 🔴 Critical |
| Time to Interactive | <3 sec | 🔴 Critical |
| Report submission latency | <2 sec | 🔴 Critical |
| Push notification delivery | <2 min | 🟡 High |
| API response time | <500ms | 🟡 High |
| Database query time | <100ms | 🟡 High |

### 9.2 Scalability Requirements

| Metric | Current | Target (6 months) | Target (12 months) |
|--------|---------|-------------------|---------------------|
| Concurrent users | 100 | 1,000 | 5,000 |
| Traffic reports per day | 200 | 1,000 | 5,000 |
| Database size | 10 MB | 100 MB | 1 GB |
| API calls per day | 5,000 | 50,000 | 250,000 |

### 9.3 Browser Compatibility

**Supported Browsers**:
- ✅ Chrome 100+ (desktop & mobile)
- ✅ Safari 15+ (desktop & mobile)
- ✅ Firefox 100+
- ✅ Edge 100+
- ⚠️ Limited support: IE11 (no push notifications)

**Mobile Requirements**:
- Responsive design (mobile-first)
- Touch-optimized buttons (minimum 44x44px)
- Works on 4G networks (not just WiFi)

### 9.4 Accessibility Requirements

| Requirement | Standard | Priority |
|-------------|----------|----------|
| WCAG compliance | AA | 🟡 High |
| Keyboard navigation | Full support | 🟡 High |
| Screen reader support | ARIA labels | 🟢 Medium |
| Color contrast ratio | 4.5:1 minimum | 🟡 High |
| Text resize | Up to 200% without loss | 🟢 Medium |

### 9.5 Security Requirements

| Requirement | Implementation | Priority |
|-------------|----------------|----------|
| HTTPS only | Enforced | 🔴 Critical |
| SQL injection prevention | Parameterized queries | 🔴 Critical |
| XSS protection | Input sanitization | 🔴 Critical |
| CORS policy | Whitelist only | 🔴 Critical |
| Rate limiting | 100 req/min per IP | 🟡 High |
| Authentication | Supabase Auth | 🟡 High |
| Data encryption | At rest & in transit | 🟡 High |

### 9.6 Data Requirements

**Data Retention**:
- Traffic reports: 90 days
- Chat messages: 30 days
- User accounts: Until deletion requested
- Analytics: 12 months

**Backup & Recovery**:
- Database backups: Daily
- Recovery time objective (RTO): 4 hours
- Recovery point objective (RPO): 24 hours

---

## 10. Future Roadmap

### Q1 2026 - Advanced Predictions

**Features**:
- [ ] Machine learning model for more accurate predictions
- [ ] Weather correlation analysis
- [ ] Event-based traffic predictions (concerts, sports, holidays)
- [ ] Multi-street route optimization

**Success Criteria**:
- Prediction accuracy improves to 85%+
- Users report 20% higher satisfaction

---

### Q2 2026 - Gamification & Community

**Features**:
- [ ] User reputation system (points for accurate reports)
- [ ] Leaderboard (most helpful contributors)
- [ ] Achievements & badges
- [ ] Community challenges (e.g., "Report traffic 10 days in a row")

**Success Criteria**:
- 30% increase in daily contributors
- 50% improvement in user retention

---

### Q3 2026 - Expansion to More Cities

**Features**:
- [ ] Add Kraków streets
- [ ] Add Warsaw streets
- [ ] Multi-city support in UI
- [ ] City selection on homepage

**Success Criteria**:
- 5,000+ users in Kraków
- 10,000+ users in Warsaw

---

### Q4 2026 - Premium Features

**Features**:
- [ ] Premium subscription ($2.99/month)
- [ ] Ad-free experience
- [ ] Advanced analytics (personal traffic patterns)
- [ ] Priority push notifications
- [ ] Custom notification schedules (only during work hours)

**Success Criteria**:
- 500+ premium subscribers
- $1,500/month recurring revenue

---

### Long-term Vision (2027+)

**Features**:
- [ ] Public transport integration
- [ ] Parking availability reports
- [ ] Bike lane conditions
- [ ] Integration with smart city initiatives
- [ ] API for third-party developers
- [ ] Mobile apps (iOS, Android) with background location tracking

**Success Criteria**:
- 50,000+ monthly active users
- Expansion to top 10 Polish cities
- Partnership with city government for data sharing
- Self-sustaining through premium + business partnerships

---

## Appendix

### A. Supported Streets (13 total)

1. Borowska
2. Buforowa
3. Grabiszyńska
4. Grota Roweckiego
5. Karkonoska
6. Ołtaszyńska
7. Opolska
8. Parafialna
9. Powstańców Śląskich
10. Radosna
11. Sudecka
12. Ślężna
13. Zwycięska

### B. Traffic Status Definitions

| Status | Polish | Color | Definition |
|--------|--------|-------|------------|
| Stopped | Stoi | 🔴 Red | Traffic is at standstill or moving <10 km/h |
| Slow | Toczy się | 🟡 Yellow | Traffic is moving slowly, 10-30 km/h |
| Flowing | Jedzie | 🟢 Green | Traffic is flowing normally, >30 km/h |
| No data | Brak danych | ⚪ Grey | No recent reports available |

### C. Key URLs

- Production: https://lovable.dev/projects/7e6d938d-cb5d-485a-93c6-06ffdfa54334
- Main page: `/`
- Push notifications: `/push`
- Statistics: `/statystyki`
- Coupons (admin): `/coupons`
- Coupon redemption: `/kupon?id=<id>`
- User account: `/konto`
- About: `/o-projekcie`
- Contact: `/kontakt`
- Terms: `/regulamin`

### D. Glossary

- **DAU**: Daily Active Users
- **MAU**: Monthly Active Users
- **CTR**: Click-Through Rate
- **PWA**: Progressive Web App
- **OneSignal**: Push notification service provider
- **Supabase**: Backend-as-a-Service platform
- **Edge Function**: Serverless function (Supabase/Deno)
- **Tag**: OneSignal subscription category (e.g., `street_borowska`)
- **User fingerprint**: Anonymous user identifier (not personally identifiable)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-12 | Grzegorz Malopolski | Initial PRD creation |

---

## Approval

**Product Owner**: Grzegorz Malopolski
**Email**: grzegorz.malopolski@ringieraxelspringer.pl
**Status**: ✅ Approved
**Date**: December 12, 2025
