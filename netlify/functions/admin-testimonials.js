const crypto = require('crypto');

// Initialize fetch for Node.js environments
async function getFetch() {
  if (typeof fetch !== 'undefined') {
    return fetch;
  }
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch;
}

// Simple admin authentication (in production, use proper JWT/OAuth)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-this-secure-token';

// Security headers
const securityHeaders = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

function authenticateAdmin(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === ADMIN_TOKEN;
}

exports.handler = async (event, context) => {
  // Get fetch function
  const fetch = await getFetch();
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
  
  // Authenticate admin
  if (!authenticateAdmin(event.headers.authorization)) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  try {
    switch (event.httpMethod) {
      case 'GET':
        return await getPendingTestimonials(corsHeaders);
      case 'POST':
        return await approveTestimonial(event.body, corsHeaders);
      case 'DELETE':
        return await rejectTestimonial(event.body, corsHeaders);
      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Admin function error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function getPendingTestimonials(headers) {
  const fetch = await getFetch();
  
  // Use the table name from environment variable with fallbacks
  const tableName = process.env.AIRTABLE_TABLE_NAME || 'Testimonials';
  const encodedTableName = encodeURIComponent(tableName);
  
  console.log('Fetching ALL testimonials to filter pending ones...');
  
  // Fetch ALL testimonials (no filter) and we'll filter on the server side
  const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodedTableName}?maxRecords=100`, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Airtable API error:', response.status, errorText);
    throw new Error('Failed to fetch testimonials');
  }
  
  const data = await response.json();
  console.log(`Found ${data.records.length} total testimonials in Airtable`);
  
  // Filter for pending testimonials (those WITHOUT an approvedAt field)
  const pendingTestimonials = data.records.filter(record => {
    const hasApprovedAt = record.fields.approvedAt && record.fields.approvedAt !== '';
    const hasRequired = record.fields.name && record.fields.message;
    
    // Log each record for debugging
    console.log(`Record ${record.id}: hasApprovedAt=${hasApprovedAt}, hasRequired=${hasRequired}`);
    
    // Return true if it has required fields but NO approvedAt (pending)
    return hasRequired && !hasApprovedAt;
  });
  
  console.log(`Returning ${pendingTestimonials.length} pending testimonials`);
  
  // Remove sensitive data (email)
  const sanitizedRecords = pendingTestimonials.map(record => ({
    id: record.id,
    createdTime: record.createdTime,
    fields: {
      name: record.fields.name,
      email: record.fields.email, // Keep email for admin to contact if needed
      company: record.fields.company || '',
      message: record.fields.message,
      rating: record.fields.rating || 5,
      status: record.fields.status || 'pending'
    }
  }));
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ testimonials: sanitizedRecords })
  };
}

async function approveTestimonial(body, headers) {
  const { testimonialId } = JSON.parse(body);
  
  if (!testimonialId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Testimonial ID required' })
    };  }
    // Use the table name from environment variable with fallbacks
  const tableName = process.env.AIRTABLE_TABLE_NAME || 'Testimonials';
  const encodedTableName = encodeURIComponent(tableName);
    
  // Update status to approved
  const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodedTableName}/${testimonialId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },    body: JSON.stringify({
      fields: {
        // Removed status for now since it's causing permission issues
        // Instead, we'll just update the approval date
        approvedAt: new Date().toISOString().split('T')[0]
      }
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to approve testimonial');
  }
  
  // Trigger site rebuild (if using Netlify)
  if (process.env.NETLIFY_BUILD_HOOK) {
    await fetch(process.env.NETLIFY_BUILD_HOOK, { method: 'POST' });
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: 'Testimonial approved' })
  };
}

async function rejectTestimonial(body, headers) {
  const { testimonialId } = JSON.parse(body);
  
  if (!testimonialId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Testimonial ID required' })
    };  }
    // Use the table name from environment variable with fallbacks
  const tableName = process.env.AIRTABLE_TABLE_NAME || 'Testimonials';
  const encodedTableName = encodeURIComponent(tableName);
    
  // Delete the testimonial
  const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodedTableName}/${testimonialId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to reject testimonial');
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: 'Testimonial rejected' })
  };
}
