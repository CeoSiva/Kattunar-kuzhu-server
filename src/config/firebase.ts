import admin from 'firebase-admin';

// Expect FIREBASE_SERVICE_ACCOUNT to be a JSON string or individual GOOGLE_APPLICATION_CREDENTIALS env can be used
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length) {
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Fallback to application default credentials (e.g., if running locally with gcloud auth)
    admin.initializeApp();
  }
}

export const firebaseAdmin = admin;
export const auth = admin.auth();
