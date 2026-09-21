// Run locally only. Never commit a Firebase service-account JSON file.
// Windows PowerShell:
// $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\service-account.json"
// $env:ADMIN_EMAIL="your-email@example.com"
// npm install firebase-admin
// npm run admin:claim

import admin from "firebase-admin";

const email = process.env.ADMIN_EMAIL;
if (!email) throw new Error("Missing ADMIN_EMAIL.");

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const user = await admin.auth().getUserByEmail(email);
await admin.auth().setCustomUserClaims(user.uid, { admin: true });

console.log(`Admin claim set for ${email}. Sign out and sign back in on the website.`);
