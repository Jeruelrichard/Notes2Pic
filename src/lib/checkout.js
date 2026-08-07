// Freemius hosted-checkout config (client-safe IDs) + URL builders, shared by
// the Upgrade modal and the landing → checkout deep-link flow.
export const FREEMIUS_PRODUCT_ID = import.meta.env.VITE_FREEMIUS_PRODUCT_ID
export const FREEMIUS_PLAN_MONTHLY = import.meta.env.VITE_FREEMIUS_PLAN_MONTHLY
export const FREEMIUS_PLAN_LIFETIME = import.meta.env.VITE_FREEMIUS_PLAN_LIFETIME

// Build a Freemius hosted checkout link with the buyer's email locked to their
// account (readonly_user) so the webhook can map the purchase back by email.
export function freemiusCheckoutUrl(planId, email, coupon = '') {
  if (!FREEMIUS_PRODUCT_ID || !planId) return ''
  const base = `https://checkout.freemius.com/product/${FREEMIUS_PRODUCT_ID}/plan/${planId}/`
  const params = new URLSearchParams()
  if (email) {
    params.set('user_email', email)
    params.set('readonly_user', 'true')
  }
  if (coupon) {
    params.set('coupon', coupon)
    params.set('hide_coupon', 'true')
  }
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

export function planIdFor(plan) {
  if (plan === 'lifetime') return FREEMIUS_PLAN_LIFETIME
  if (plan === 'monthly') return FREEMIUS_PLAN_MONTHLY
  return ''
}

export function checkoutUrlForPlan(plan, email, coupon = '') {
  return freemiusCheckoutUrl(planIdFor(plan), email, coupon)
}
