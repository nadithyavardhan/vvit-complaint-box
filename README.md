# VVIT Complaint Box

Complaint and grievance portal for **Vasireddy Venkatadri Institute of Technology, Nambur, Guntur**.
Plain HTML/CSS/JavaScript on Firebase (Authentication + Firestore + Hosting). No build step, no server to run.

## Features
- **Anonymous complaints** – nothing identifying is stored; the complainant tracks it with a private token (`VVIT-XXXX-XXXX-XXXX`).
- **Signed-in complaints** – students, faculty, parents and others can register, submit with their details and see all their complaints in a dashboard.
- **Status tracking** – Received → Under review → Resolved/Closed, with the administration's resolution note.
- **Admin console** (`/admin/`) – search and filter, change status, write a resolution note, delete, export CSV, manage campus notices.
- **Campus notices** – users request, admins approve; approved notices show on the home page.

## Project structure
```
vvit-complaint-box/
├── public/                     # everything that is deployed
│   ├── index.html              # home
│   ├── submit.html             # submit a complaint (anonymous or signed in)
│   ├── track.html              # track by token
│   ├── login.html              # sign in / create account
│   ├── dashboard.html          # user dashboard
│   ├── admin/index.html        # admin console
│   └── assets/
│       ├── css/style.css       # design system + all components
│       ├── js/
│       │   ├── firebase-config.js   # ← YOUR Firebase settings go here
│       │   ├── core.js              # Firebase init, helpers, header/footer
│       │   └── home|submit|track|auth|dashboard|admin.js
│       └── img/                # logo.png (add yours), placeholder, favicon
├── firestore.rules             # security rules (important — deploy them)
├── firestore.indexes.json
├── firebase.json               # hosting + rules config
└── .firebaserc.example
```

## Setup (about 10 minutes)
1. **Create a Firebase project** at <https://console.firebase.google.com> (use your own — do not reuse another project's keys).
2. **Enable** *Authentication → Email/Password* and *Firestore Database* (production mode).
3. **Add a Web app** (Project settings → General → Your apps) and paste its config into `public/assets/js/firebase-config.js`.
4. **Logo** – save the college logo as `public/assets/img/logo.png` (square, ~200×200). If missing, the site tries `https://www.vvitguntur.com/images/logo.png`, then a built-in placeholder.
5. **Deploy the rules**
   ```bash
   npm install -g firebase-tools
   firebase login
   cp .firebaserc.example .firebaserc      # edit the project id
   firebase deploy --only firestore:rules
   ```
6. **Create the first administrator**
   1. Open the site → *Sign in → Create account* and register with the admin's college email.
   2. Firebase Console → Authentication → copy that user's **UID**.
   3. Firestore → *Start collection* `admins` → Document ID = the UID → add any field (e.g. `role: "admin"`).
   4. Sign in at `/admin/`. Repeat step 3 for each additional admin.
7. **Run locally**: `firebase serve --only hosting` (or `npx serve public`) and open `http://localhost:5000`.
   **Deploy**: `firebase deploy --only hosting`. Add your domain under Authentication → Settings → Authorized domains.

## How privacy and security work
- The token is the Firestore document ID. Anyone holding it can open that one complaint; **nobody can list or search complaints** except administrators (and each user’s own uid-linked complaints).
- Anonymous submissions are rejected by the rules if they contain `uid`, `name`, `email` or `rollNo`.
- Admin access is enforced by the rules (a uid listed in `/admins`), not just by hiding a button.
- Admins can only change `status`, `resolution`, `updatedAt` and `resolvedAt`.
- All user-supplied text is HTML-escaped before display; CSV export neutralises spreadsheet formulas.
- Honest limit: an anonymous complainant who loses their token cannot recover it. Firestore also records no IP address in the app, but Firebase/Google infrastructure logs are outside this app’s control.

## Customising
- Categories and departments: `CATEGORIES` / `DEPARTMENTS` in `core.js` (keep the category keys in sync with the list in `firestore.rules`).
- Colours and fonts: the `:root` tokens at the top of `style.css`.
