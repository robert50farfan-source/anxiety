import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function getSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export function usePushNotifications() {
  const { userId } = useAuth()

  const isSupported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'PushManager' in window
    && 'serviceWorker' in navigator

  const [permission,    setPermission]    = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [subscribed,    setSubscribed]    = useState(false)
  const [reminderHour,  setReminderHour]  = useState(9)
  const [loading,       setLoading]       = useState(false)

  // On mount: check if already subscribed + load saved hour
  useEffect(() => {
    if (!isSupported || !userId) return
    getSubscription().then(sub => setSubscribed(!!sub))

    if (supabase) {
      supabase
        .from('push_subscriptions')
        .select('reminder_hour')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => { if (data) setReminderHour(data.reminder_hour) })
    }
  }, [userId, isSupported])

  const subscribe = async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      if (supabase && userId) {
        await supabase.from('push_subscriptions').upsert({
          user_id:      userId,
          subscription: sub.toJSON(),
          reminder_hour: reminderHour,
        }, { onConflict: 'user_id' })
      }
      setSubscribed(true)
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const sub = await getSubscription()
      if (sub) await sub.unsubscribe()
      if (supabase && userId) {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId)
      }
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  const updateReminderHour = async (hour) => {
    setReminderHour(hour)
    if (supabase && userId && subscribed) {
      await supabase
        .from('push_subscriptions')
        .update({ reminder_hour: hour })
        .eq('user_id', userId)
    }
  }

  return { isSupported, permission, subscribed, reminderHour, loading, subscribe, unsubscribe, updateReminderHour }
}
