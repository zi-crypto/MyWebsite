// Initialize fetch for Node.js environments
async function getFetch() {
  if (typeof fetch !== 'undefined') {
    return fetch;
  }
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch;
}

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

exports.handler = async (event, context) => {
  // Get fetch function
  const fetch = await getFetch();
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    // Verify admin authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    // Parse request body
    const { id } = JSON.parse(event.body);
    
    if (!id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Testimonial ID is required' })
      };
    }
    
    console.log('Deleting testimonial:', id);
    
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Testimonials';
    const encodedTableName = encodeURIComponent(tableName);
    
    // Delete the testimonial from Airtable
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodedTableName}/${id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
        }
      }
    );
    
    console.log('Delete response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable delete error:', errorText);
      throw new Error(`Failed to delete testimonial: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Testimonial deleted successfully:', result);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true,
        message: 'Testimonial deleted successfully',
        deletedId: result.id
      })
    };
    
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to delete testimonial',
        details: error.message
      })
    };
  }
};
