// Supabase Edge Function for sending Web Push Notifications
// Deploy with: supabase functions deploy send-push-notification

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
// VAPID signing and payload encryption (RFC 8291 / 8292), checked against the
// reference web-push implementation in src/services/__tests__/webPush.test.ts.
import { sendWebPush } from './webpush.ts';

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

const MAX_TITLE = 200;
const MAX_BODY = 2000;
const MAX_RECIPIENTS = 500;

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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Who is calling ──────────────────────────────────────────────────────
    // The platform's JWT check accepts the anon key (it is a valid JWT), and
    // the anon key ships in the web bundle — so without this anyone could push
    // any text and link to every device. Only a signed-in, ACTIVE AstroHEALTH
    // user may send, and only within their own hospital unless super_admin.
    const json = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json(401, { error: 'Sign in to send notifications.' });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return json(401, { error: 'Your session has expired. Please sign in again.' });
    const { data: callerRows, error: callerError } = await supabase
      .from('users')
      .select('id, role, hospital_id, is_active')
      .eq('auth_user_id', authData.user.id)
      .limit(1);
    if (callerError) return json(503, { error: 'Could not verify your account.' });
    const caller = callerRows?.[0];
    if (!caller || caller.is_active !== true) return json(403, { error: 'Your account is not active.' });

    // Parse request body
    const body: RequestBody = await req.json();
    const { userId, userIds, hospitalId, role, payload } = body;

    if (!payload || !payload.title) {
      return json(400, { error: 'Missing required payload with title' });
    }
    if (String(payload.title).length > MAX_TITLE || String(payload.body ?? '').length > MAX_BODY) {
      return json(413, { error: 'Notification text too long.' });
    }
    if (Array.isArray(userIds) && userIds.length > MAX_RECIPIENTS) {
      return json(413, { error: `At most ${MAX_RECIPIENTS} recipients per request.` });
    }
    if (hospitalId && caller.role !== 'super_admin' && String(hospitalId) !== String(caller.hospital_id ?? '')) {
      return json(403, { error: 'You can only notify your own hospital.' });
    }
    // The click target must stay inside the app (the service worker also checks).
    if (payload.data && typeof payload.data.url === 'string' && !/^\/(?![\/\\])/.test(payload.data.url)) {
      delete payload.data.url;
    }

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
    // Why each failure happened (status and message only, never the endpoint),
    // so a failing send can be diagnosed from the response alone.
    const errors = results
      .map((r) => (r.status === 'fulfilled' ? r.value : { success: false, error: String(r.reason) }))
      .filter((r) => !r.success)
      .map((r) => String((r as { error?: string }).error ?? 'unknown error').slice(0, 300));

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total: filteredSubscriptions.length,
        skipped: subscriptions.length - filteredSubscriptions.length,
        ...(errors.length ? { errors } : {}),
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
