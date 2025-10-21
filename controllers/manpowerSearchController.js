const db = require('../config/db');

// Helper function for hierarchical location matching
const buildLocationQuery = (searchLocation) => {
  if (!searchLocation || !searchLocation.trim()) {
    return { condition: '', params: [] };
  }

  const location = searchLocation.trim().toLowerCase();
  
  // Define country-level mappings that include ALL their sub-locations
  const countryMappings = {
    'india': ['india', 'indian', 'tamil nadu', 'tn', 'chennai', 'coimbatore', 'madurai', 'salem', 'tirupur', 'erode', 'vellore', 'tiruchirappalli', 'trichy', 'karnataka', 'bangalore', 'bengaluru', 'mysore', 'mysuru', 'mangalore', 'mangaluru', 'hubli', 'belgaum', 'dharwad', 'maharashtra', 'mumbai', 'pune', 'nagpur', 'nashik', 'aurangabad', 'solapur', 'thane', 'kalyan', 'delhi', 'new delhi', 'ncr', 'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad', 'greater noida', 'west bengal', 'kolkata', 'calcutta', 'howrah', 'durgapur', 'siliguri', 'gujarat', 'ahmedabad', 'surat', 'vadodara', 'baroda', 'rajkot', 'bhavnagar', 'gandhinagar', 'rajasthan', 'jaipur', 'jodhpur', 'udaipur', 'kota', 'ajmer', 'bikaner', 'uttar pradesh', 'up', 'lucknow', 'kanpur', 'agra', 'varanasi', 'meerut', 'allahabad', 'prayagraj', 'bareilly', 'andhra pradesh', 'ap', 'vijayawada', 'visakhapatnam', 'vizag', 'guntur', 'tirupati', 'telangana', 'hyderabad', 'warangal', 'nizamabad', 'secunderabad', 'kerala', 'kochi', 'cochin', 'thiruvananthapuram', 'kozhikode', 'calicut', 'kottayam', 'thrissur', 'punjab', 'chandigarh', 'ludhiana', 'amritsar', 'jalandhar', 'patiala', 'haryana', 'panipat', 'ambala', 'karnal', 'odisha', 'orissa', 'bhubaneswar', 'cuttack', 'rourkela', 'brahmapur', 'jharkhand', 'ranchi', 'jamshedpur', 'dhanbad', 'bokaro', 'assam', 'guwahati', 'dibrugarh', 'silchar', 'jorhat', 'madhya pradesh', 'mp', 'bhopal', 'indore', 'jabalpur', 'gwalior', 'ujjain', 'chhattisgarh', 'raipur', 'bhilai', 'bilaspur', 'uttarakhand', 'dehradun', 'haridwar', 'roorkee', 'nainital', 'himachal pradesh', 'hp', 'shimla', 'dharamshala', 'manali', 'jammu and kashmir', 'j&k', 'srinagar', 'jammu', 'goa', 'panaji', 'margao', 'vasco', 'bihar', 'patna', 'gaya', 'muzaffarpur', 'bhagalpur', 'tripura', 'agartala', 'meghalaya', 'shillong', 'manipur', 'imphal', 'nagaland', 'kohima', 'mizoram', 'aizawl', 'arunachal pradesh', 'itanagar', 'sikkim', 'gangtok'],
    'saudi arabia': ['saudi arabia', 'saudi', 'riyadh', 'jeddah', 'mecca', 'medina', 'dammam', 'khobar', 'dhahran', 'jubail', 'yanbu', 'tabuk', 'abha', 'khamis mushait', 'al-ahsa', 'hofuf', 'taif', 'buraidah', 'najran', 'hail', 'jizan']
  };
  
  // Check if searching for a country
  if (countryMappings[location]) {
    const matchingLocations = countryMappings[location];
    const conditions = matchingLocations.map(() => 'LOWER(location) LIKE ?').join(' OR ');
    const params = matchingLocations.map(loc => `%${loc}%`);
    return {
      condition: `(${conditions})`,
      params: params
    };
  }
  
  // Define location hierarchy mapping for states and cities
  const locationHierarchy = {
    // Middle East
    'saudi arabia': ['saudi arabia', 'saudi', 'riyadh', 'jeddah', 'mecca', 'medina', 'dammam', 'khobar', 'dhahran', 'jubail', 'yanbu', 'tabuk'],
    'uae': ['uae', 'dubai', 'abu dhabi', 'sharjah', 'ajman', 'ras al khaimah', 'fujairah', 'umm al quwain', 'united arab emirates'],
    'qatar': ['qatar', 'doha', 'al wakrah', 'al rayyan'],
    'kuwait': ['kuwait', 'kuwait city', 'hawalli', 'salmiya'],
    'oman': ['oman', 'muscat', 'salalah', 'sohar'],
    'bahrain': ['bahrain', 'manama', 'muharraq', 'riffa'],
    
    // Indian states
    'tamil nadu': ['tamil nadu', 'tn', 'chennai', 'coimbatore', 'madurai', 'salem', 'tirupur', 'erode', 'vellore', 'tiruchirappalli', 'trichy'],
    'karnataka': ['karnataka', 'bangalore', 'bengaluru', 'mysore', 'mysuru', 'mangalore', 'mangaluru', 'hubli', 'belgaum', 'dharwad'],
    'maharashtra': ['maharashtra', 'mumbai', 'pune', 'nagpur', 'nashik', 'aurangabad', 'solapur', 'thane', 'kalyan'],
    'delhi': ['delhi', 'new delhi', 'ncr', 'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad', 'greater noida'],
    
    // Major cities
    'riyadh': ['riyadh'],
    'jeddah': ['jeddah', 'jiddah'],
    'jubail': ['jubail', 'al jubail'],
    'dammam': ['dammam'],
    'khobar': ['khobar', 'al khobar'],
    'dubai': ['dubai'],
    'abu dhabi': ['abu dhabi'],
    'chennai': ['chennai', 'madras'],
    'bangalore': ['bangalore', 'bengaluru'],
    'mumbai': ['mumbai', 'bombay'],
    'hyderabad': ['hyderabad', 'secunderabad']
  };
  
  // Find all locations that should match this search
  let matchingLocations = [];
  
  // First, check if the search term is a key in our hierarchy
  if (locationHierarchy[location]) {
    matchingLocations = locationHierarchy[location];
  } else {
    // Check if the search term appears in any hierarchy values
    let found = false;
    for (const [key, values] of Object.entries(locationHierarchy)) {
      if (values.includes(location)) {
        matchingLocations = values.filter(loc => 
          loc === location || 
          loc.includes(location) || 
          location.includes(loc)
        );
        found = true;
        break;
      }
    }
    
    // If no hierarchy match found, fall back to original search term
    if (!found) {
      matchingLocations = [location];
    }
  }
  
  // Remove duplicates
  matchingLocations = [...new Set(matchingLocations)];
  
  // Build the SQL condition
  const conditions = matchingLocations.map(() => 'LOWER(location) LIKE ?').join(' OR ');
  const params = matchingLocations.map(loc => `%${loc}%`);
  
  return {
    condition: `(${conditions})`,
    params: params
  };
};

// Search Manpower Profiles
const searchManpower = async (req, res) => {
  const {
    jobTitle,
    location,
    availabilityStatus
  } = req.body;

  console.log('🔍 Manpower search request:', { jobTitle, location, availabilityStatus });

  try {
    let query = `
      SELECT 
        id,
        user_id,
        first_name,
        last_name,
        email,
        mobile_number,
        whatsapp_number,
        location,
        job_title,
        availability_status,
        available_from,
        rate,
        profile_description,
        profile_photo,
        cv_path,
        created_at
      FROM manpower_profiles
      WHERE 1=1
    `;

    const params = [];

    // Job title search (search in job_title and profile_description)
    if (jobTitle && jobTitle.trim()) {
      query += ` AND (
        job_title LIKE ? OR 
        profile_description LIKE ?
      )`;
      const searchTerm = `%${jobTitle.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    // Location search with hierarchy
    if (location && location.trim()) {
      const locationQuery = buildLocationQuery(location);
      if (locationQuery.condition) {
        query += ` AND ${locationQuery.condition}`;
        params.push(...locationQuery.params);
      }
    }

    // Availability status filter
    if (availabilityStatus && availabilityStatus.trim()) {
      query += ` AND availability_status = ?`;
      params.push(availabilityStatus.trim());
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    console.log('📊 Executing search query:', query);
    console.log('🔢 Search params:', params);

    const [manpower] = await db.query(query, params);

    console.log(`✅ Found ${manpower.length} manpower profiles`);

    // Calculate relevance score
    const parsedManpower = manpower.map(profile => {
      let relevanceScore = 0;
      if (jobTitle && jobTitle.trim()) {
        const searchTerm = jobTitle.toLowerCase();
        if (profile.job_title && profile.job_title.toLowerCase().includes(searchTerm)) relevanceScore += 3;
        if (profile.profile_description && profile.profile_description.toLowerCase().includes(searchTerm)) relevanceScore += 2;
      }
      
      // Parse certificates if exists
      let certificates = [];
      try {
        if (profile.certificates) {
          certificates = typeof profile.certificates === 'string' 
            ? JSON.parse(profile.certificates) 
            : profile.certificates;
        }
      } catch (e) {
        certificates = [];
      }

      return {
        ...profile,
        certificates,
        relevanceScore
      };
    });

    // Sort by relevance if there's a job title search
    const sortedManpower = jobTitle && jobTitle.trim() 
      ? parsedManpower.sort((a, b) => b.relevanceScore - a.relevanceScore)
      : parsedManpower;

    res.json({
      success: true,
      manpower: sortedManpower,
      total: sortedManpower.length,
      searchCriteria: {
        jobTitle,
        location,
        availabilityStatus
      }
    });

  } catch (error) {
    console.error('❌ Manpower search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error searching manpower profiles',
      error: error.message 
    });
  }
};

// Get Manpower Profile Details
const getManpowerDetails = async (req, res) => {
  const { manpowerId } = req.params;

  if (!manpowerId) {
    return res.status(400).json({
      success: false,
      message: 'Manpower ID is required'
    });
  }

  try {
    const query = `
      SELECT 
        mp.*,
        u.is_active,
        u.email_verified
      FROM manpower_profiles mp
      LEFT JOIN users u ON mp.user_id = u.id
      WHERE mp.id = ?
    `;

    const [profiles] = await db.query(query, [manpowerId]);

    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Manpower profile not found'
      });
    }

    const profile = profiles[0];
    
    // Parse certificates safely
    let parsedCertificates = [];
    try {
      if (profile.certificates) {
        if (typeof profile.certificates === 'string') {
          parsedCertificates = JSON.parse(profile.certificates);
        } else if (Array.isArray(profile.certificates)) {
          parsedCertificates = profile.certificates;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error parsing certificates:', error.message);
      parsedCertificates = [];
    }

    if (!Array.isArray(parsedCertificates)) parsedCertificates = [];

    const parsedProfile = {
      ...profile,
      certificates: parsedCertificates
    };

    res.json({
      success: true,
      profile: parsedProfile
    });

  } catch (error) {
    console.error('❌ Get manpower details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching manpower details',
      error: error.message
    });
  }
};

// Get Professional Categories and Counts
const getProfessionalCategories = async (req, res) => {
  try {
    const query = `
      SELECT 
        job_title,
        profile_description
      FROM manpower_profiles
      WHERE job_title IS NOT NULL 
        AND job_title != ''
      ORDER BY created_at DESC
    `;

    const [professionals] = await db.query(query, []);

    // Enhanced category mappings
    const categories = {
      'Heavy Equipment Operator': {
        keywords: ['operator', 'crane', 'forklift', 'excavator', 'loader', 'bulldozer', 'backhoe', 'heavy equipment', 'machinery'],
        count: 0,
        icon: 'Truck'
      },
      'Electrician': {
        keywords: ['electrician', 'electrical', 'wiring', 'electronics', 'power', 'voltage'],
        count: 0,
        icon: 'Zap'
      },
      'Welder': {
        keywords: ['welder', 'welding', 'fabrication', 'metal work', 'tig', 'mig', 'arc welding'],
        count: 0,
        icon: 'Flame'
      },
      'Plumber': {
        keywords: ['plumber', 'plumbing', 'pipefitter', 'pipe', 'hvac'],
        count: 0,
        icon: 'Wrench'
      },
      'Carpenter': {
        keywords: ['carpenter', 'carpentry', 'woodwork', 'joiner', 'wood'],
        count: 0,
        icon: 'Hammer'
      },
      'Mechanic': {
        keywords: ['mechanic', 'mechanical', 'maintenance', 'repair', 'technician'],
        count: 0,
        icon: 'Settings'
      },
      'Construction Worker': {
        keywords: ['construction', 'builder', 'mason', 'concrete', 'laborer', 'site worker'],
        count: 0,
        icon: 'HardHat'
      },
      'Supervisor': {
        keywords: ['supervisor', 'foreman', 'manager', 'lead', 'coordinator'],
        count: 0,
        icon: 'Users'
      },
      'Driver': {
        keywords: ['driver', 'driving', 'truck driver', 'delivery'],
        count: 0,
        icon: 'Car'
      },
      'Safety Officer': {
        keywords: ['safety', 'hse', 'health and safety', 'safety officer'],
        count: 0,
        icon: 'Shield'
      },
      'Others': {
        keywords: [],
        count: 0,
        icon: 'User'
      }
    };

    // Categorize professionals
    professionals.forEach(professional => {
      const title = (professional.job_title || '').toLowerCase();
      const description = (professional.profile_description || '').toLowerCase();
      const combinedText = `${title} ${description}`;
      
      let categorized = false;
      
      Object.keys(categories).forEach(categoryName => {
        if (categoryName !== 'Others' && !categorized) {
          const category = categories[categoryName];
          const hasMatch = category.keywords.some(keyword => 
            combinedText.includes(keyword.toLowerCase())
          );
          
          if (hasMatch) {
            category.count++;
            categorized = true;
          }
        }
      });
      
      if (!categorized) {
        categories['Others'].count++;
      }
    });

    // Convert to array and filter
    const categoryArray = Object.keys(categories)
      .map(name => ({
        name,
        count: categories[name].count,
        icon: categories[name].icon
      }))
      .filter(category => category.count > 0)
      .sort((a, b) => {
        if (a.name === 'Others') return 1;
        if (b.name === 'Others') return -1;
        return b.count - a.count;
      });

    res.json({
      success: true,
      categories: categoryArray,
      totalProfessionals: professionals.length
    });

  } catch (error) {
    console.error('❌ Categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching professional categories',
      error: error.message
    });
  }
};

// Get Search Statistics
const getSearchStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT id) as totalManpower,
        COUNT(DISTINCT CASE WHEN cv_path IS NOT NULL THEN id END) as manpowerWithCV,
        COUNT(DISTINCT CASE WHEN availability_status = 'available' THEN id END) as availableManpower
      FROM manpower_profiles
    `;

    const [stats] = await db.query(statsQuery, []);

    res.json({
      success: true,
      statistics: stats[0]
    });

  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching search statistics',
      error: error.message
    });
  }
};

// Get Featured Manpower
const getFeaturedManpower = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        user_id,
        first_name,
        last_name,
        email,
        mobile_number,
        location,
        job_title,
        availability_status,
        available_from,
        rate,
        profile_description,
        profile_photo,
        cv_path,
        created_at
      FROM manpower_profiles
      WHERE job_title IS NOT NULL 
        AND job_title != ''
        AND availability_status = 'available'
      ORDER BY created_at DESC
      LIMIT 3
    `;

    const [manpower] = await db.query(query, []);

    console.log(`✅ Found ${manpower.length} featured manpower`);

    res.json({
      success: true,
      manpower: manpower || [],
      count: manpower.length
    });

  } catch (error) {
    console.error('❌ Featured manpower error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching featured manpower',
      error: error.message 
    });
  }
};

module.exports = {
  searchManpower,
  getManpowerDetails,
  getSearchStats,
  getProfessionalCategories,
  getFeaturedManpower
};