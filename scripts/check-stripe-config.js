#!/usr/bin/env node

// Simple script to check Stripe configuration
// Run with: node scripts/check-stripe-config.js

const fs = require('fs')
const path = require('path')

console.log('🔍 Checking Stripe Configuration...\n')

// Read .env.local file
let envContent = ''
try {
  envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
} catch (error) {
  console.log('❌ .env.local file not found!')
  process.exit(1)
}

// Parse environment variables
const envVars = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=')
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=')
    }
  }
})

const requiredEnvVars = {
  'STRIPE_SECRET_KEY': envVars.STRIPE_SECRET_KEY,
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': envVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  'STRIPE_WEBHOOK_SECRET': envVars.STRIPE_WEBHOOK_SECRET,
  'STRIPE_BASIC_PRICE_ID': envVars.STRIPE_BASIC_PRICE_ID,
  'STRIPE_PRO_PRICE_ID': envVars.STRIPE_PRO_PRICE_ID,
  'STRIPE_ENTERPRISE_PRICE_ID': envVars.STRIPE_ENTERPRISE_PRICE_ID,
}

let allConfigured = true
let missingPriceIds = []

console.log('✅ Configured environment variables:')
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (value && !value.includes('REPLACEME')) {
    console.log(`   ${key}: ${value.substring(0, 20)}...`)
  } else {
    console.log(`❌ ${key}: NOT CONFIGURED`)
    allConfigured = false
    if (key.includes('PRICE_ID')) {
      missingPriceIds.push(key)
    }
  }
}

console.log('\n' + '='.repeat(60))

if (allConfigured) {
  console.log('🎉 All Stripe configuration is complete!')
  console.log('   You can now use the phone number rental system.')
} else {
  console.log('⚠️  Stripe configuration incomplete!')
  
  if (missingPriceIds.length > 0) {
    console.log('\n📋 To complete setup, add your Stripe Price IDs to .env.local:')
    console.log('   1. Go to https://dashboard.stripe.com/products')
    console.log('   2. Find your created products (Basic Package, Pro Package, Enterprise Package)')
    console.log('   3. Copy the Price IDs and replace the placeholder values:\n')
    
    missingPriceIds.forEach(id => {
      console.log(`   ${id}=price_1234567890abcdef  # Replace with your actual Price ID`)
    })
    
    console.log('\n💡 Example Price ID format: price_1234567890abcdef1234567890')
  }
}

console.log('='.repeat(60)) 