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
  'Cache-Control': 'no-cache, no-store, must-revalidate', // Disable caching
  'Pragma': 'no-cache',
  'Expires': '0'
};

exports.handler = async (event, context) => {
  // Get fetch function
  const fetch = await getFetch();
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
  
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
    try {
    console.log('Fetching approved testimonials from Airtable...');
    
    // Use the table name from environment variable with fallbacks
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Testimonials';
    const encodedTableName = encodeURIComponent(tableName);
    
    // Fetch ALL testimonials from Airtable (up to 100 records)
    // We'll filter on the server side to only show ones with required fields
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodedTableName}?maxRecords=100`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', response.status, errorText);
      throw new Error(`Airtable API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Found ${data.records.length} total testimonials in Airtable`);
    
    // Filter and format testimonials on the server side
    // ONLY include records that have ALL required fields AND an approvedAt date
    const testimonials = data.records
      .filter(record => {
        const hasRequired = record.fields.name && 
                           record.fields.message && 
                           record.fields.rating;
        const hasApprovedAt = record.fields.approvedAt && record.fields.approvedAt !== '';
        
        if (hasRequired && !hasApprovedAt) {
          console.log('Skipping pending testimonial (no approvedAt):', record.id);
        }
        
        // Only return true if it has required fields AND is approved
        return hasRequired && hasApprovedAt;
      })
      .map(record => ({
        id: record.id,
        name: record.fields.name,
        company: record.fields.company || '',
        message: record.fields.message,
        rating: record.fields.rating || 5,
        approvedAt: record.fields.approvedAt
      }))
      // Sort by newest first (using approvedAt)
      .sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt));
    
    console.log(`Returning ${testimonials.length} approved testimonials to display`);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        testimonials,
        count: testimonials.length,
        lastUpdated: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to load testimonials',
        testimonials: [], // Fallback to empty array
        count: 0
      })
    };
  }
};
