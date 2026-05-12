import { useState } from 'react'

const STORAGE_KEY = 'anxietyapp_emergency_contact'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Builds the correct URL depending on the contact's preferred channel
export function contactUrl(contact) {
  if (contact.via === 'whatsapp') {
    const digits = contact.phone.replace(/\D/g, '')
    return `https://wa.me/${digits}`
  }
  return `tel:${contact.phone}`
}

export function useEmergencyContact() {
  const [contact, setContact] = useState(load)

  const save = (name, phone, via = 'phone') => {
    const trimmedName  = name.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedName || !trimmedPhone) return
    const next = { name: trimmedName, phone: trimmedPhone, via }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setContact(next)
  }

  const remove = () => {
    localStorage.removeItem(STORAGE_KEY)
    setContact(null)
  }

  return { contact, save, remove }
}
