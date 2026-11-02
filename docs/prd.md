# Product Requirement Document (PRD)

**Project Name:** UniVault  
**Tagline:** Secure the lost, share the found, pass the knowledge.  
**Document Version:** 1.0  
**Target Audience:** University/College Students, Faculty, Security Staff, and Campus Administrators  

---

## 1. Executive Summary

UniVault is a unified digital ecosystem designed specifically for college campuses. It bridges two critical gaps in student life:

1. **Campus Lost & Found Management:** Transitioning from fragmented social media groups and physical security desks to an automated, searchable, and verified asset recovery portal.
2. **Senior-to-Junior Peer Exchange:** Establishing a campus-exclusive sharing marketplace for graduating and senior students to donate or sell unused textbooks, lab gear, and study materials directly to juniors.

By bringing both needs under one platform, UniVault fosters campus sustainability, financial accessibility, and streamlined administrative operations.

---

## 2. Problem Statement

* **Disorganized Asset Recovery:** Hundreds of student items (ID cards, electronics, keys, laboratory coats) are lost weekly across sprawling campuses. Recovery is highly inefficient due to reliance on scattered notice boards, informal messaging groups, and un-indexed physical lost-and-found boxes.
* **Textbook & Resource Waste:** At the end of each semester, seniors are left with expensive course books, lab instruments, and revision materials that are discarded or lie unused, while incoming juniors struggle with high resource costs.
* **Lack of Trust and Verification:** Open marketplace platforms (e.g., public classifieds) carry security risks and lack campus specificity, whereas campus-only solutions lack structured workflows.

---

## 3. Product Vision & Goals

### 3.1 Vision
To create a single, trusted digital vault for every college campus that eliminates asset loss and maximizes resource reuse among students.

### 3.2 Key Performance Indicators (KPIs)
* **Successful Claim Rate:** Over 60% of reported lost items successfully returned to owners.
* **Resource Circulation:** 500+ textbooks/items listed per semester during transition periods.
* **Platform Trust:** 100% verified campus users via institutional email authentication.
* **Average Time-to-Recovery:** Reduce average item recovery turnaround time from 7+ days to under 48 hours.

---

## 4. User Personas

| Persona | Role | Primary Goal | Pain Points |
| :--- | :--- | :--- | :--- |
| **Aarav** (Junior Student) | 1st/2nd Year Student | Find affordable textbooks, course packs, and quickly retrieve lost items on campus. | High cost of new semester textbooks; losing belongings between lectures with no central recovery spot. |
| **Priya** (Senior Student) | 3rd/4th Year Student | Donate or sell accumulated course materials to juniors before graduation. | Cluttered dorm/apartment; no easy platform to connect directly with juniors in specific departments. |
| **Security Officer / Admin** | Campus Security | Log found items systematically and verify ownership before release. | Overcrowded lost-and-found desks; difficulty verifying genuine owners; manual record-keeping. |

---

## 5. Functional Requirements

### 5.1 Authentication & User Management (Module 1)
* **FR-1.1 Institutional Email Verification:** Users must register using an official domain email (e.g., `@college.edu`).
* **FR-1.2 User Profiles:** Display student department, academic year/semester, contact options, and activity history (items posted, claimed, or shared).
* **FR-1.3 Role-Based Access Control (RBAC):**
  * **Student:** Can post lost items, claim found items, list exchange materials, and contact sellers/finders.
  * **Admin/Security Staff:** Can log found items with official storage IDs, review claim requests, and approve/reject claims.

### 5.2 Lost & Found Engine (Module 2)
* **FR-2.1 Item Reporting:** Users can log a Lost or Found item with details:
  * Title, Detailed Description, Category (Electronics, ID/Cards, Stationery, Personal Gear).
  * Last known location (drop-down selection of campus zones/buildings).
  * Date/Time lost or found.
  * Image upload capability.
* **FR-2.2 Verification & Claim Workflow:**
  * To claim an item, students submit a Claim Request with proof (e.g., distinct marks, serial numbers, password proof for electronics).
  * Admins or finders can review and change claim status: `Pending`, `Approved`, or `Rejected`.
* **FR-2.3 Claimed Status Archival:** Once verified, items transition to `Claimed` and are archived from active search results.

### 5.3 Senior-to-Junior Peer Exchange (Module 3)
* **FR-3.1 Asset Listing:** Seniors can post items under two transaction types:
  * Donation / Free Pass-Down
  * Resell (Peer-to-Peer)
* **FR-3.2 Academic Tagging:** Listings must be tagged with:
  * Department/Branch (e.g., Computer Science, Electrical Engineering).
  * Target Semester (Semesters 1 through 8).
  * Item Category (Textbook, Lab Equipment, Notes, Calculator, Miscellaneous).
* **FR-3.3 Direct Connect:** Interested juniors can initiate direct communication (in-app message or institutional email link) to arrange a physical pickup on campus.
* **FR-3.4 Item Lifecycle Management:** Owners can mark items as `Exchanged` or `Donated` to maintain an active, accurate catalogue.

### 5.4 Search, Filter & Discovery (Module 4)
* **FR-4.1 Global Search Bar:** Instant keyword search indexing titles, descriptions, tags, and locations.
* **FR-4.2 Multi-Facet Filtering:** Filter listings by:
  * Category (Lost & Found vs. Senior Exchange)
  * Department & Semester
  * Date range
  * Price type (Free vs. Sale)

---

## 6. Non-Functional Requirements

* **Performance:** API response times must remain under 300ms for standard database queries; initial page load under 1.5 seconds.
* **Security:**
  * Authentication handled via JSON Web Tokens (JWT) with secure HTTP-only cookies.
  * Passwords salted and hashed using bcrypt (minimum 10 salt rounds).
  * Image uploads sanitized and hosted via secured CDN endpoints.
* **Scalability:** Database indexed on high-frequency search fields (`department`, `category`, `status`, `postedBy`).
* **Usability & Accessibility:** Mobile-first responsive UI built for easy navigation by students on mobile devices between classes.

---

## 7. Technical Architecture & Stack Selection

### 7.1 Architecture Diagram

```
React.js Single Page Application
(Tailwind CSS + Context API / State)
               │
               ▼
        REST API / HTTP
               │
               ▼
     Node.js + Express.js
(Authentication Middleware, Controllers)
               │
               ▼
          Mongoose ORM
               │
               ▼
        MongoDB Atlas
(Collections: Users, Items, Claims, Exchanges)
```

### 7.2 Tech Stack
* **Frontend:** React.js, Vite, Tailwind CSS, Lucide React (Icons), Axios
* **Backend:** Node.js, Express.js, JWT, Multer / Cloudinary (Image handling)
* **Database:** MongoDB Atlas (NoSQL Document Store)

---

## 8. Data Schema Design (MongoDB Document Schemas)

### 8.1 Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: { type: String, unique: true }, // Verified campus email
  passwordHash: String,
  role: { type: String, enum: ['Student', 'Admin', 'Security'], default: 'Student' },
  department: String,
  yearOfStudy: Number,
  createdAt: Date
}
```

### 8.2 Items Collection (Unified Lost & Found + Exchange)
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  module: { type: String, enum: ['LostFound', 'Exchange'], required: true },
  itemType: { type: String, enum: ['Lost', 'Found', 'Donation', 'Sell'] },
  category: { type: String, enum: ['Book', 'Electronics', 'ID/Card', 'Lab Equipment', 'Other'] },
  department: String, // Applicable for books/exchange
  semester: Number,   // Applicable for academic gear
  location: String,   // Campus location for Lost/Found
  price: { type: Number, default: 0 }, // 0 for donation or lost/found
  images: [String],
  status: { type: String, enum: ['Active', 'PendingClaim', 'Claimed', 'Exchanged'], default: 'Active' },
  postedBy: { type: ObjectId, ref: 'User' },
  createdAt: Date
}
```

### 8.3 Claims Collection
```javascript
{
  _id: ObjectId,
  itemId: { type: ObjectId, ref: 'Item' },
  claimedBy: { type: ObjectId, ref: 'User' },
  verificationProof: String, // Description or answer to security questions
  claimStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  reviewedBy: { type: ObjectId, ref: 'User' },
  createdAt: Date
}
```

---

## 9. Future Scope & Roadmap (Phase 2 & 3)

### Phase 2:
* **Interactive Campus Map:** Integration with Leaflet/Mapbox to place pinpoints where lost items were found.
* **In-App Realtime Messaging:** Socket.io integration enabling safe in-app chat between buyers/sellers and finders/owners without exposing phone numbers.

### Phase 3:
* **AI Image Matching:** Automatic similarity checks between uploaded "Lost" pictures and existing "Found" catalog entries.
* **Gamification:** Awarding "Campus Contributor Badges" to seniors who donate items to juniors.