/* Our Love Lives On — Cloud Functions (v2)
 *
 *  Storyteller flow (no login): a daily scheduler texts/emails a unique
 *  /r/<token> link; the response page calls these callables with the token.
 *  All token validation + writes happen here with admin privileges, so the
 *  secret token is the only credential and Firestore/Storage stay locked down.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { PROMPTS } = require('./prompts');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const db = admin.firestore();
const bucket = admin.storage().bucket();
const DAY_MS = 24 * 60 * 60 * 1000;

// Secrets (set with `firebase functions:secrets:set <NAME>`)
const TWILIO_SID = defineSecret('TWILIO_SID');
const TWILIO_AUTH = defineSecret('TWILIO_AUTH');
const TWILIO_FROM = defineSecret('TWILIO_FROM');
const SENDGRID_KEY = defineSecret('SENDGRID_KEY');
const SENDGRID_FROM = defineSecret('SENDGRID_FROM');
const APP_URL = defineSecret('APP_URL'); // e.g. https://ourloveliveson.com

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const newToken = () => crypto.randomBytes(32).toString('base64url');

/** Look up a storyteller link token → { uid, promptIndex }. Throws if invalid. */
async function resolveToken(token) {
  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing link token.');
  }
  const snap = await db.collection('tokens').doc(token).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'This link is invalid.');
  }
  return snap.data();
}

const extFor = (contentType) => {
  if (!contentType) return '';
  const sub = contentType.split('/')[1];
  if (!sub) return '';
  return '.' + sub.split(';')[0].replace('jpeg', 'jpg');
};

/* ------------------------------------------------------------------ */
/* Callables — used by the /r/:token response page (no auth)          */
/* ------------------------------------------------------------------ */

/** Return the prompt + any existing answer for a token. */
exports.getPrompt = onCall({ cors: true }, async (req) => {
  const { uid, promptIndex } = await resolveToken(req.data && req.data.token);
  const prompt = PROMPTS[promptIndex] || {};
  const userSnap = await db.doc(`users/${uid}`).get();
  const data = userSnap.exists ? userSnap.data() : {};
  const respSnap = await db.doc(`users/${uid}/responses/${promptIndex}`).get();
  const existing = respSnap.exists ? respSnap.data() : null;
  return {
    promptText: prompt.q || '',
    help: prompt.help || '',
    day: prompt.day || `Day ${promptIndex + 1}`,
    storytellerName: (data.storyteller && data.storyteller.name) || '',
    response: existing
      ? {
          text: existing.text || '',
          photoCount: (existing.photos || []).length,
          audioCount: (existing.audio || []).length,
        }
      : null,
  };
});

/** Mint a short-lived signed PUT URL so the browser can upload a file directly. */
exports.getUploadUrl = onCall({ cors: true }, async (req) => {
  const { token, kind, contentType } = req.data || {};
  const { uid, promptIndex } = await resolveToken(token);
  if (kind !== 'photo' && kind !== 'audio') {
    throw new HttpsError('invalid-argument', 'kind must be "photo" or "audio".');
  }
  const storagePath = `responses/${uid}/${promptIndex}/${kind}-${uuidv4()}${extFor(
    contentType
  )}`;
  const [uploadUrl] = await bucket.file(storagePath).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType: contentType || 'application/octet-stream',
  });
  return { uploadUrl, storagePath, contentType: contentType || 'application/octet-stream' };
});

/** Save (or update) the storyteller's answer; media paths are appended. */
exports.submitResponse = onCall({ cors: true }, async (req) => {
  const { token, text, photos, audio } = req.data || {};
  const { uid, promptIndex } = await resolveToken(token);
  const prompt = PROMPTS[promptIndex] || {};
  const ref = db.doc(`users/${uid}/responses/${promptIndex}`);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const existing = await ref.get();
  const prev = existing.exists ? existing.data() : {};
  const mergedPhotos = [...(prev.photos || []), ...(Array.isArray(photos) ? photos : [])];
  const mergedAudio = [...(prev.audio || []), ...(Array.isArray(audio) ? audio : [])];

  await ref.set(
    {
      promptIndex,
      promptText: prompt.q || '',
      text: typeof text === 'string' ? text : prev.text || '',
      photos: mergedPhotos,
      audio: mergedAudio,
      updatedAt: now,
      ...(existing.exists ? {} : { submittedAt: now }),
    },
    { merge: true }
  );
  return { ok: true };
});

/** Owner-only: mint a real link for one of *your own* prompts, without sending.
 *  Lets you preview/test the storyteller page (locally or in prod). Safe to keep
 *  — it only ever mints tokens for the signed-in caller's own uid. */
exports.mintMyToken = onCall({ cors: true }, async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.');
  }
  const uid = req.auth.uid;
  const promptIndex = Number.isInteger(req.data && req.data.promptIndex)
    ? req.data.promptIndex
    : 0;
  if (promptIndex < 0 || promptIndex >= PROMPTS.length) {
    throw new HttpsError('invalid-argument', 'promptIndex out of range.');
  }
  const token = newToken();
  await db.collection('tokens').doc(token).set({
    uid,
    promptIndex,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { token, path: `/r/${token}` };
});

/* ------------------------------------------------------------------ */
/* Scheduled sender — one prompt per day at the user's creation time   */
/* ------------------------------------------------------------------ */

function twilioClient() {
  return require('twilio')(TWILIO_SID.value(), TWILIO_AUTH.value());
}

async function sendSms(to, body) {
  await twilioClient().messages.create({ to, from: TWILIO_FROM.value(), body });
}

async function sendEmail(to, dayLabel, promptText, link) {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(SENDGRID_KEY.value());
  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2b2520">
      <p style="text-transform:uppercase;letter-spacing:.12em;color:#b4452f;font-size:13px;font-weight:700">${dayLabel} · Our Love Lives On</p>
      <h1 style="font-size:24px;line-height:1.3;color:#2b2520">${promptText}</h1>
      <p style="font-size:16px;color:#5b5048">Write a few lines, add a photo, or just record your voice — whatever feels easy.</p>
      <p style="margin:28px 0">
        <a href="${link}" style="background:#c8a24b;color:#3a2c08;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;display:inline-block">Answer today's prompt →</a>
      </p>
      <p style="font-size:13px;color:#8a8078">Your story saves to your private archive. You can return to this link anytime to add more.</p>
    </div>`;
  await sgMail.send({
    to,
    from: SENDGRID_FROM.value(),
    subject: `${dayLabel}: today's prompt`,
    text: `${promptText}\n\nAnswer here (write, photo, or voice): ${link}`,
    html,
  });
}

async function processCampaign(docSnap) {
  const uid = docSnap.id;
  const data = docSnap.data();
  const c = data.campaign || {};
  const total = c.total || PROMPTS.length;
  const idx = c.currentIndex || 0;

  if (idx >= total) {
    await docSnap.ref.update({ 'campaign.status': 'completed' });
    return;
  }

  const prompt = PROMPTS[idx];
  const dayLabel = prompt.day || `Day ${idx + 1}`;
  const delivery = data.delivery || {};
  const contact = data.contact || {};

  // Mint a non-expiring, single-prompt link token.
  const token = newToken();
  await db.collection('tokens').doc(token).set({
    uid,
    promptIndex: idx,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const link = `${APP_URL.value()}/r/${token}`;

  if (delivery.text && contact.phone) {
    await sendSms(
      contact.phone,
      `Our Love Lives On — ${dayLabel}: ${prompt.q}\n\nAnswer (write, photo, or voice): ${link}`
    );
  }
  if (delivery.email && contact.email) {
    await sendEmail(contact.email, dayLabel, prompt.q, link);
  }

  // Advance. nextSendAt += 24h off the *scheduled* time so each user's prompt
  // recurs at the same clock time they created the campaign.
  const prevNextMs = c.nextSendAt ? c.nextSendAt.toMillis() : Date.now();
  const newIndex = idx + 1;
  const done = newIndex >= total;
  await docSnap.ref.update({
    'campaign.currentIndex': newIndex,
    'campaign.lastSentAt': admin.firestore.FieldValue.serverTimestamp(),
    'campaign.nextSendAt': done
      ? null
      : admin.firestore.Timestamp.fromMillis(prevNextMs + DAY_MS),
    ...(done ? { 'campaign.status': 'completed' } : {}),
  });
}

exports.sendDailyPrompts = onSchedule(
  {
    schedule: 'every 5 minutes',
    secrets: [TWILIO_SID, TWILIO_AUTH, TWILIO_FROM, SENDGRID_KEY, SENDGRID_FROM, APP_URL],
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const snap = await db
      .collection('users')
      .where('campaign.status', '==', 'active')
      .where('campaign.nextSendAt', '<=', now)
      .get();

    for (const docSnap of snap.docs) {
      try {
        await processCampaign(docSnap);
      } catch (err) {
        console.error('sendDailyPrompts failed for', docSnap.id, err);
      }
    }
    console.log(`sendDailyPrompts processed ${snap.size} campaign(s).`);
  }
);
