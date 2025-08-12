// Stripe configuration utility
export const stripeConfig = {
  // Default currency for all Stripe operations
  // Should match the currency used when creating subscription products
  currency: 'eur',
  
  // Price IDs for rented number packages
  priceIds: {
    basic: process.env.STRIPE_BASIC_PRICE_ID,
    standard: process.env.STRIPE_STANDARD_PRICE_ID,
    premium: process.env.STRIPE_PREMIUM_PRICE_ID,
  },
  
  // Price IDs for own Twilio packages
  ownPriceIds: {
    basic_own: process.env.STRIPE_OWN_BASIC_PRICE_ID,
    standard_own: process.env.STRIPE_OWN_STANDARD_PRICE_ID,
    premium_own: process.env.STRIPE_OWN_PREMIUM_PRICE_ID,
  },
  
  // Validate that all required Price IDs are configured
  validatePriceIds(): { isValid: boolean; missingIds: string[] } {
    const missingIds: string[] = []
    
    // Validate rented number package price IDs
    if (!this.priceIds.basic || this.priceIds.basic.includes('REPLACEME')) {
      missingIds.push('STRIPE_BASIC_PRICE_ID')
    }
    if (!this.priceIds.standard || this.priceIds.standard.includes('REPLACEME')) {
      missingIds.push('STRIPE_STANDARD_PRICE_ID')
    }
    if (!this.priceIds.premium || this.priceIds.premium.includes('REPLACEME')) {
      missingIds.push('STRIPE_PREMIUM_PRICE_ID')
    }
    
    // Validate own Twilio package price IDs
    if (!this.ownPriceIds.basic_own || this.ownPriceIds.basic_own.includes('REPLACEME')) {
      missingIds.push('STRIPE_OWN_BASIC_PRICE_ID')
    }
    if (!this.ownPriceIds.standard_own || this.ownPriceIds.standard_own.includes('REPLACEME')) {
      missingIds.push('STRIPE_OWN_STANDARD_PRICE_ID')
    }
    if (!this.ownPriceIds.premium_own || this.ownPriceIds.premium_own.includes('REPLACEME')) {
      missingIds.push('STRIPE_OWN_PREMIUM_PRICE_ID')
    }
    
    return {
      isValid: missingIds.length === 0,
      missingIds
    }
  },
  
  // Get user-friendly error message for configuration issues
  getConfigurationErrorMessage(): string {
    const { isValid, missingIds } = this.validatePriceIds()
    
    if (isValid) return ''
    
    return `Stripe configuration incomplete. Please add the following Price IDs to your .env.local file:\n${missingIds.map(id => `- ${id}=your_actual_price_id_here`).join('\n')}\n\nYou can find your Price IDs in your Stripe Dashboard under Products.`
  }
}

export default stripeConfig 