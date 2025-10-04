const crypto = require('crypto');

// Initialize fetch for Node.js environments
async function getFetch() {
  if (typeof fetch !== 'undefined') {
    return fetch;
  }
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch;
}

// Rate limiting store (in production, use Redis or external service)
const rateLimitStore = new Map();

// Security headers
const securityHeaders = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// Input validation and sanitization
function validateAndSanitize(data) {
  const errors = [];
  
  // Required fields validation
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!data.email || typeof data.email !== 'string' || !isValidEmail(data.email)) {
    errors.push('Valid email address is required');
  }
  
  if (!data.message || typeof data.message !== 'string' || data.message.trim().length < 10) {
    errors.push('Testimonial message must be at least 10 characters long');
  }
  
  if (!data.company || typeof data.company !== 'string' || data.company.trim().length < 2) {
    errors.push('Company/Title must be at least 2 characters long');
  }
  
  // Rating validation
  const rating = parseInt(data.rating);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    errors.push('Rating must be between 1 and 5');
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  // Sanitize inputs
  // Get current date - we'll format it for Airtable specifically
  const now = new Date();
  
  const cleanData = {
    name: sanitizeInput(data.name),
    email: sanitizeInput(data.email),
    company: sanitizeInput(data.company),
    message: sanitizeInput(data.message),
    rating: rating,    // Removed date and status fields for now until we confirm the field types in Airtable
    ipHash: crypto.createHash('sha256').update(data.clientIP || '').digest('hex').substr(0, 16)
  };
  
  return {
    isValid: true,
    data: cleanData
  };
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function sanitizeInput(input) {
  return input.toString()
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .substring(0, 500); // Limit length
}

// Rate limiting (5 submissions per IP per hour)
function checkRateLimit(clientIP) {
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  const ipKey = crypto.createHash('sha256').update(clientIP || '').digest('hex').substr(0, 16);
  
  // Clean old entries
  for (const [key, timestamps] of rateLimitStore.entries()) {
    rateLimitStore.set(key, timestamps.filter(time => time > hourAgo));
    if (rateLimitStore.get(key).length === 0) {
      rateLimitStore.delete(key);
    }
  }
  
  const submissions = rateLimitStore.get(ipKey) || [];
  if (submissions.length >= 5) {
    return false;
  }
  
  submissions.push(now);
  rateLimitStore.set(ipKey, submissions);
  return true;
}

// Main handler
exports.handler = async (event, context) => {
  // Get fetch function
  const fetch = await getFetch();
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    ...securityHeaders
  };
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    // Parse request body
    const data = JSON.parse(event.body);
    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || '';
    
    // Rate limiting check
    if (!checkRateLimit(clientIP)) {
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Too many submissions. Please try again later.',
          retryAfter: 3600 
        })
      };
    }
    
    // Validate and sanitize input
    const validation = validateAndSanitize({ ...data, clientIP });
    if (!validation.isValid) {      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Validation failed',
          details: validation.errors 
        })
      };
    }
      // Store in Airtable
    console.log('Storing testimonial in Airtable...');
    console.log('Base ID:', process.env.AIRTABLE_BASE_ID);
    console.log('API Key exists:', !!process.env.AIRTABLE_API_KEY);
    console.log('Table name:', process.env.AIRTABLE_TABLE_NAME || 'Testimonials');
      // Let's try submitting with only essential fields first to diagnose the issue
    // Removed the status field since it's causing issues - Airtable likely needs this field
    // to be pre-configured with specific options
    const minimalData = {
      name: validation.data.name,
      email: validation.data.email,
      company: validation.data.company,
      message: validation.data.message,
      rating: validation.data.rating
    };
    
    console.log('Minimal data to store:', minimalData);
    
    // Use the table name from environment variable with fallbacks
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Testimonials';
    const encodedTableName = encodeURIComponent(tableName);
    
    const airtableResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodedTableName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: minimalData
      })
    });
    
    console.log('Airtable response status:', airtableResponse.status);
    console.log('Airtable response headers:', Object.fromEntries(airtableResponse.headers.entries()));
    
    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.log('Airtable error response:', errorText);
      throw new Error(`Failed to store testimonial: ${airtableResponse.status} - ${errorText}`);
    }
    
    // Send notification email (optional)
    if (process.env.NOTIFICATION_EMAIL) {
      await sendNotificationEmail(validation.data);
    }
    
    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true,
        message: 'Testimonial submitted successfully! We\'ll review it and get back to you.' 
      })
    };
    
  } catch (error) {
    console.error('Error processing testimonial:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error. Please try again later.' 
      })
    };
  }
};

// Optional: Send notification email
async function sendNotificationEmail(testimonialData) {
  // Implement with your preferred email service (SendGrid, Mailgun, etc.)
  // This is a placeholder - you can implement based on your needs
  console.log('New testimonial submitted:', testimonialData.name);
}
