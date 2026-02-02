// Supabase Edge Function for sending Web Push Notifications
// Deploy with: supabase functions deploy send-push-notification

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Web Push implementation for Deno
// Using web-push compatible algorithm

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
  renotify?: boolean;
  type?: string;
  urgency?: string;
}

interface RequestBody {
  userId?: string;
  userIds?: string[];
  hospitalId?: string;
  role?: string;
  payload: NotificationPayload;
}

// CORS headers for Supabase Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { userId, userIds, hospitalId, role, payload } = body;

    if (!payload || !payload.title) {
      return new Response(
        JSON.stringify({ error: 'Missing required payload with title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get VAPID keys from secrets
    const { data: vapidPublicData } = await supabase
      .from('app_secrets')
      .select('value')
      .eq('key', 'vapid_public_key')
      .single();

    const { data: vapidPrivateData } = await supabase
      .from('app_secrets')
      .select('value')
      .eq('key', 'vapid_private_key')
      .single();

    if (!vapidPublicData || !vapidPrivateData) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapidPublicKey = vapidPublicData.value;
    const vapidPrivateKey = vapidPrivateData.value;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@carebridge.com';

    // Determine which subscriptions to send to
    let subscriptions: Array<{
      id: string;
      user_id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
      preferences: Record<string, unknown>;
    }> = [];

    if (userId) {
      // Single user
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth, preferences')
        .eq('user_id', userId)
        .eq('is_active', true);
      subscriptions = data || [];
    } else if (userIds && userIds.length > 0) {
      // Multiple users
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth, preferences')
        .in('user_id', userIds)
        .eq('is_active', true);
      subscriptions = data || [];
    } else if (hospitalId && role) {
      // Users by role in hospital
      const { data } = await supabase.rpc('get_subscriptions_by_role', {
        p_role: role,
        p_hospital_id: hospitalId,
      });
      subscriptions = data || [];
    } else if (hospitalId) {
      // All users in hospital
      const { data } = await supabase.rpc('get_hospital_subscriptions', {
        p_hospital_id: hospitalId,
      });
      subscriptions = data || [];
    } else {
      return new Response(
        JSON.stringify({ error: 'Must specify userId, userIds, or hospitalId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, message: 'No active subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check notification type against preferences
    const notificationType = payload.type || payload.data?.type || 'general';
    const preferenceKey = getPreferenceKeyForType(notificationType);

    // Filter subscriptions based on preferences and quiet hours
    const filteredSubscriptions = subscriptions.filter((sub) => {
      const prefs = sub.preferences as Record<string, unknown> || {};
      
      // Check if this notification type is enabled
      if (preferenceKey && prefs[preferenceKey] === false) {
        return false;
      }

      // Check quiet hours (simplified check - full check is in DB function)
      if (prefs.quietHoursEnabled === true) {
        const now = new Date();
        const hour = now.getHours();
        const startHour = parseInt((prefs.quietHoursStart as string || '22:00').split(':')[0]);
        const endHour = parseInt((prefs.quietHoursEnd as string || '07:00').split(':')[0]);
        
        // Simple overnight check
        if (startHour > endHour) {
          if (hour >= startHour || hour < endHour) {
            // Allow critical notifications during quiet hours
            if (payload.urgency !== 'critical' && notificationType !== 'vital_alert') {
              return false;
            }
          }
        } else {
          if (hour >= startHour && hour < endHour) {
            if (payload.urgency !== 'critical' && notificationType !== 'vital_alert') {
              return false;
            }
          }
        }
      }

      return true;
    });

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      image: payload.image,
      tag: payload.tag || `carebridge-${notificationType}-${Date.now()}`,
      data: {
        ...payload.data,
        type: notificationType,
      },
      actions: payload.actions,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
      vibrate: payload.vibrate,
      timestamp: payload.timestamp || Date.now(),
      renotify: payload.renotify,
      type: notificationType,
      urgency: payload.urgency,
    });

    // Send push notifications
    const results = await Promise.allSettled(
      filteredSubscriptions.map(async (sub) => {
        try {
          const success = await sendWebPush(
            {
              endpoint: sub.endpoint,
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
            notificationPayload,
            vapidPublicKey,
            vapidPrivateKey,
            vapidSubject
          );

          if (success) {
            // Update last_used_at
            await supabase
              .from('push_subscriptions')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', sub.id);

            // Log the notification
            await supabase.from('push_notification_log').insert({
              subscription_id: sub.id,
              user_id: sub.user_id,
              notification_type: notificationType,
              title: payload.title,
              body: payload.body,
              data: payload.data,
            });
          }

          return { success, endpoint: sub.endpoint };
        } catch (error) {
          console.error('Error sending to:', sub.endpoint, error);

          // Check if subscription is expired (410 Gone or 404 Not Found)
          if (error.status === 410 || error.status === 404) {
            // Deactivate expired subscription
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }

          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    const sent = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - sent;

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total: filteredSubscriptions.length,
        skipped: subscriptions.length - filteredSubscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Get preference key for notification type
function getPreferenceKeyForType(type: string): string | null {
  const typeMap: Record<string, string> = {
    patient_assignment: 'patientAssignments',
    surgery_reminder: 'surgeryReminders',
    appointment_reminder: 'appointmentReminders',
    lab_results: 'labResults',
    investigation_results: 'investigationResults',
    prescription_ready: 'prescriptionReady',
    treatment_plan: 'treatmentPlanUpdates',
    vital_alert: 'vitalAlerts',
    staff_message: 'staffMessages',
    system_alert: 'systemAlerts',
  };
  return typeMap[type] || null;
}

// Web Push implementation using Web Crypto API
async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<boolean> {
  // Parse endpoint URL
  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

  // Create VAPID JWT
  const jwt = await createVapidJwt(vapidPrivateKey, audience, vapidSubject);

  // Encrypt the payload
  const encryptedPayload = await encryptPayload(
    payload,
    subscription.p256dh,
    subscription.auth
  );

  // Send the push notification
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': encryptedPayload.byteLength.toString(),
      'TTL': '86400', // 24 hours
      'Urgency': 'high',
    },
    body: encryptedPayload,
  });

  if (!response.ok) {
    const error = new Error(`Push failed: ${response.status} ${response.statusText}`);
    (error as any).status = response.status;
    throw error;
  }

  return true;
}

// Create VAPID JWT token
async function createVapidJwt(
  privateKey: string,
  audience: string,
  subject: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expires = now + 12 * 60 * 60; // 12 hours

  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  const payload = {
    aud: audience,
    exp: expires,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const keyData = base64UrlDecode(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signature = base64UrlEncode(new Uint8Array(signatureBuffer));
  return `${unsignedToken}.${signature}`;
}

// Encrypt payload using AES-128-GCM
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<Uint8Array> {
  // Decode keys
  const userPublicKey = base64UrlDecode(p256dhKey);
  const authSecretBytes = base64UrlDecode(authSecret);

  // Generate ephemeral key pair
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Import user public key
  const importedUserKey = await crypto.subtle.importKey(
    'raw',
    userPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: importedUserKey },
    keyPair.privateKey,
    256
  );

  // Export ephemeral public key
  const ephemeralPublicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive encryption key using HKDF
  const ikm = await hkdf(
    new Uint8Array(sharedSecret),
    authSecretBytes,
    new TextEncoder().encode('Content-Encoding: auth\x00'),
    32
  );

  const prk = await hkdf(
    ikm,
    salt,
    new TextEncoder().encode('Content-Encoding: aes128gcm\x00'),
    16
  );

  const nonce = await hkdf(
    ikm,
    salt,
    new TextEncoder().encode('Content-Encoding: nonce\x00'),
    12
  );

  // Import encryption key
  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Pad and encrypt payload
  const paddedPayload = new Uint8Array(payload.length + 2);
  paddedPayload[0] = 0; // Padding length (2 bytes, big endian)
  paddedPayload[1] = 0;
  new TextEncoder().encodeInto(payload, paddedPayload.subarray(2));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    encryptionKey,
    paddedPayload
  );

  // Build the encrypted content (header + ciphertext)
  const recordSize = 4096;
  const header = new Uint8Array(21 + ephemeralPublicKey.byteLength);
  
  // Salt (16 bytes)
  header.set(salt, 0);
  
  // Record size (4 bytes, big endian)
  new DataView(header.buffer).setUint32(16, recordSize, false);
  
  // Key ID length (1 byte)
  header[20] = ephemeralPublicKey.byteLength;
  
  // Key ID (ephemeral public key)
  header.set(new Uint8Array(ephemeralPublicKey), 21);

  // Combine header and ciphertext
  const result = new Uint8Array(header.length + ciphertext.byteLength);
  result.set(header, 0);
  result.set(new Uint8Array(ciphertext), header.length);

  return result;
}

// HKDF implementation
async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const prk = await crypto.subtle.sign('HMAC', key, salt);

  const prkKey = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;

  const okm = await crypto.subtle.sign('HMAC', prkKey, infoWithCounter);

  return new Uint8Array(okm.slice(0, length));
}

// Base64 URL encoding/decoding
function base64UrlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}
