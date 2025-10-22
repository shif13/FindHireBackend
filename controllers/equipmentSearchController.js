// controllers/equipmentSearchController.js
const db = require('../config/db');

// Enhanced hierarchical location matching
const buildLocationQuery = (searchLocation) => {
  if (!searchLocation || !searchLocation.trim()) {
    return { condition: '', params: [] };
  }

  const location = searchLocation.trim().toLowerCase();
  
  // Comprehensive location hierarchy
  const locationHierarchy = {
    // Countries
    'india': {
      type: 'country',
      includes: ['india', 'indian', 'bharat'],
      children: ['tamil nadu', 'karnataka', 'maharashtra', 'delhi', 'west bengal', 'gujarat', 
                'rajasthan', 'uttar pradesh', 'andhra pradesh', 'telangana', 'kerala', 'punjab',
                'haryana', 'odisha', 'jharkhand', 'assam', 'madhya pradesh', 'chhattisgarh']
    },
    
    // Tamil Nadu
    'tamil nadu': {
      type: 'state',
      includes: ['tamil nadu', 'tn', 'tamilnadu'],
      cities: ['chennai', 'coimbatore', 'madurai', 'salem', 'tirupur', 'erode', 'vellore', 
              'tiruchirappalli', 'trichy', 'tirunelveli', 'thanjavur', 'tuticorin', 'dindigul']
    },
    'chennai': {
      type: 'city',
      includes: ['chennai', 'madras', 'tambaram', 'velachery', 'omr', 'anna nagar',
                't nagar', 'adyar', 'chrompet', 'porur', 'sholinganallur']
    },
    
    // Karnataka
    'karnataka': {
      type: 'state',
      includes: ['karnataka', 'ka'],
      cities: ['bangalore', 'bengaluru', 'mysore', 'mysuru', 'mangalore', 'mangaluru', 
              'hubli', 'belgaum', 'dharwad']
    },
    'bangalore': {
      type: 'city',
      includes: ['bangalore', 'bengaluru', 'blr', 'whitefield', 'electronic city', 'koramangala']
    },
    
    // Maharashtra
    'maharashtra': {
      type: 'state',
      includes: ['maharashtra', 'mh'],
      cities: ['mumbai', 'pune', 'nagpur', 'nashik', 'aurangabad', 'solapur', 'thane']
    },
    'mumbai': {
      type: 'city',
      includes: ['mumbai', 'bombay', 'navi mumbai', 'thane', 'bandra', 'andheri']
    },
    'pune': {
      type: 'city',
      includes: ['pune', 'pimpri', 'chinchwad', 'hinjewadi', 'wakad']
    },
    
    // Delhi NCR
    'delhi': {
      type: 'state',
      includes: ['delhi', 'new delhi', 'ncr', 'delhi ncr'],
      cities: ['new delhi', 'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad']
    },
    'gurgaon': {
      type: 'city',
      includes: ['gurgaon', 'gurugram', 'cyber city']
    },
    
    // Saudi Arabia
    'saudi arabia': {
      type: 'country',
      includes: ['saudi arabia', 'saudi', 'ksa'],
      children: ['eastern province', 'riyadh region', 'makkah region']
    },
    'eastern province': {
      type: 'region',
      includes: ['eastern province', 'eastern region'],
      cities: ['dammam', 'khobar', 'dhahran', 'jubail', 'hofuf', 'qatif']
    },
    'riyadh': {
      type: 'city',
      includes: ['riyadh', 'ar riyadh']
    },
    'jeddah': {
      type: 'city',
      includes: ['jeddah', 'jiddah']
    },
    'dammam': {
      type: 'city',
      includes: ['dammam']
    },
    'jubail': {
      type: 'city',
      includes: ['jubail', 'al jubail']
    },
    
    // UAE
    'uae': {
      type: 'country',
      includes: ['uae', 'united arab emirates', 'emirates'],
      cities: ['dubai', 'abu dhabi', 'sharjah', 'ajman', 'ras al khaimah']
    },
    'dubai': {
      type: 'city',
      includes: ['dubai', 'dxb']
    },
    'abu dhabi': {
      type: 'city',
      includes: ['abu dhabi', 'abudhabi']
    }
  };
  
  // Function to get all matching locations recursively
  const getAllMatchingLocations = (searchKey) => {
    let matches = new Set();
    
    const locationData = locationHierarchy[searchKey];
    
    if (!locationData) {
      return [searchKey];
    }
    
    locationData.includes.forEach(loc => matches.add(loc));
    
    // If country, add all children and their cities
    if (locationData.type === 'country' && locationData.children) {
      locationData.children.forEach(child => {
        const childData = locationHierarchy[child];
        if (childData) {
          childData.includes.forEach(loc => matches.add(loc));
          
          if (childData.cities) {
            childData.cities.forEach(city => {
              matches.add(city);
              const cityData = locationHierarchy[city];
              if (cityData && cityData.includes) {
                cityData.includes.forEach(loc => matches.add(loc));
              }
            });
          }
        }
      });
    }
    
    // If state/region, add all its cities
    if ((locationData.type === 'state' || locationData.type === 'region') && locationData.cities) {
      locationData.cities.forEach(city => {
        matches.add(city);
        const cityData = locationHierarchy[city];
        if (cityData && cityData.includes) {
          cityData.includes.forEach(loc => matches.add(loc));
        }
      });
    }
    
    return Array.from(matches);
  };
  
  const matchingLocations = getAllMatchingLocations(location);
  
  const conditions = matchingLocations.map(() => 'LOWER(location) LIKE ?').join(' OR ');
  const params = matchingLocations.map(loc => `%${loc}%`);
  
  return {
    condition: matchingLocations.length > 0 ? `(${conditions})` : '',
    params: params
  };
};

/**
 * Search and filter equipment based on various criteria
 */
const searchEquipment = async (req, res) => {
  const startTime = Date.now();
  console.log(`[${startTime}] === EQUIPMENT SEARCH REQUEST START ===`);

  try {
    const { 
      search,
      location,
      availability
    } = req.query;

    console.log('Search parameters:', { search, location, availability });

    let query = `
      SELECT 
        id,
        user_id, 
        equipment_name as equipmentName,
        equipment_type as equipmentType,
        location,
        contact_person as contactPerson,
        contact_number as contactNumber,
        contact_email as contactEmail,
        availability,
        description,
        equipment_images as equipmentImages,
        created_at as createdAt,
        updated_at as updatedAt
      FROM equipment
      WHERE is_active = TRUE
    `;

    const queryParams = [];

    if (search && search.trim()) {
      query += ` AND (
        LOWER(equipment_name) LIKE ? OR 
        LOWER(equipment_type) LIKE ? OR
        LOWER(description) LIKE ?
      )`;
      const searchTerm = `%${search.toLowerCase().trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (location && location.trim()) {
      const locationQuery = buildLocationQuery(location);
      console.log('Location Query Result:', locationQuery);
      if (locationQuery.condition) {
        query += ` AND ${locationQuery.condition}`;
        queryParams.push(...locationQuery.params);
      }
    }

    if (availability && (availability === 'available' || availability === 'on-hire')) {
      query += ` AND availability = ?`;
      queryParams.push(availability);
    }

    query += ` ORDER BY created_at DESC`;

    console.log('Executing query:', query);
    console.log('Query parameters:', queryParams);

    const [results] = await db.query(query, queryParams);

    const equipmentList = results.map(item => {
      let images = [];
      try {
        if (item.equipmentImages) {
          if (Buffer.isBuffer(item.equipmentImages)) {
            images = JSON.parse(item.equipmentImages.toString('utf8'));
          } else if (typeof item.equipmentImages === 'string') {
            images = JSON.parse(item.equipmentImages);
          } else if (Array.isArray(item.equipmentImages)) {
            images = item.equipmentImages;
          }
        }
      } catch (parseError) {
        console.error('Error parsing images for equipment:', item.id, parseError);
      }

      return {
        ...item,
        equipmentImages: images
      };
    });

    const responseTime = Date.now() - startTime;
    console.log(`Found ${equipmentList.length} equipment items`);
    console.log(`Request completed in ${responseTime}ms`);

    res.status(200).json({
      success: true,
      msg: `Found ${equipmentList.length} equipment items`,
      data: equipmentList,
      count: equipmentList.length,
      filters: {
        search: search || null,
        location: location || null,
        availability: availability || 'all'
      },
      timestamp: new Date().toISOString(),
      processingTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error('Equipment search error:', error);
    res.status(500).json({
      success: false,
      msg: 'Internal server error during equipment search',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get all unique locations from equipment
 */
const getLocations = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT location
      FROM equipment
      WHERE is_active = TRUE AND location IS NOT NULL AND location != ''
      ORDER BY location ASC
    `;

    const [results] = await db.query(query);
    const locations = results.map(row => row.location);

    res.status(200).json({
      success: true,
      msg: 'Locations retrieved successfully',
      data: locations,
      count: locations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      msg: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get equipment statistics
 */
const getEquipmentStats = async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN availability = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN availability = 'on-hire' THEN 1 ELSE 0 END) as onHire,
        COUNT(DISTINCT location) as locations,
        COUNT(DISTINCT equipment_type) as types
      FROM equipment
      WHERE is_active = TRUE
    `;

    const [results] = await db.query(query);
    const stats = results[0];

    res.status(200).json({
      success: true,
      msg: 'Equipment statistics retrieved successfully',
      data: {
        total: stats.total || 0,
        available: stats.available || 0,
        onHire: stats.onHire || 0,
        locations: stats.locations || 0,
        types: stats.types || 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get equipment stats error:', error);
    res.status(500).json({
      success: false,
      msg: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get equipment by ID (for details page)
 */
const getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id,
        user_id,
        equipment_name as equipmentName,
        equipment_type as equipmentType,
        location,
        contact_person as contactPerson,
        contact_number as contactNumber,
        contact_email as contactEmail,
        availability,
        description,
        equipment_images as equipmentImages,
        created_at as createdAt,
        updated_at as updatedAt
      FROM equipment
      WHERE id = ? AND is_active = TRUE
    `;

    const [results] = await db.query(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        msg: 'Equipment not found',
        timestamp: new Date().toISOString()
      });
    }

    const equipment = results[0];
    
    // Parse images
    let images = [];
    try {
      if (equipment.equipmentImages) {
        if (Buffer.isBuffer(equipment.equipmentImages)) {
          images = JSON.parse(equipment.equipmentImages.toString('utf8'));
        } else if (typeof equipment.equipmentImages === 'string') {
          images = JSON.parse(equipment.equipmentImages);
        } else if (Array.isArray(equipment.equipmentImages)) {
          images = equipment.equipmentImages;
        }
      }
    } catch (parseError) {
      console.error('Error parsing images:', parseError);
    }

    equipment.equipmentImages = images;

    res.status(200).json({
      success: true,
      msg: 'Equipment retrieved successfully',
      data: equipment,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get equipment by ID error:', error);
    res.status(500).json({
      success: false,
      msg: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  searchEquipment,
  getLocations,
  getEquipmentStats,
  getEquipmentById
};