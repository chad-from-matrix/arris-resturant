// Point the app's own Firebase client at the local Emulator Suite so the tests
// exercise the real data layer and the real security rules.
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'emulator-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'arris-test.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'arris-test';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'arris-test.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '000000000000';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:000000000000:web:test';
process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = 'true';
