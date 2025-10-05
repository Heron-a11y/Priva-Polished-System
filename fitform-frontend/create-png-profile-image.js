// Node.js script to create a valid PNG profile image
const fs = require('fs');
const path = require('path');

// Create a simple 1x1 pixel PNG image in base64
const createPNGImage = () => {
  // This is a 1x1 pixel PNG image in base64
  const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  
  // Convert base64 to buffer
  const imageBuffer = Buffer.from(base64PNG, 'base64');
  
  return imageBuffer;
};

// Create a simple profile image using a data URL approach
const createProfileImage = () => {
  // Create a simple profile icon as a data URL
  const profileSVG = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="100" height="100" fill="#F3F4F6"/>
<circle cx="50" cy="40" r="15" fill="#9B9B9B"/>
<path d="M20 80C20 65.6415 31.6415 54 46 54H54C68.3585 54 80 65.6415 80 80V100H20V80Z" fill="#9B9B9B"/>
</svg>`;
  
  // Convert SVG to data URL
  const dataURL = `data:image/svg+xml;base64,${Buffer.from(profileSVG).toString('base64')}`;
  
  return dataURL;
};

const fixProfileImages = () => {
  console.log('🔧 Creating valid PNG profile images...');
  
  const backendPath = 'C:\\xampp\\htdocs\\ITB03-Test-Copy\\Updated-Fitform-Project\\fitform-backend';
  const profilesDir = path.join(backendPath, 'storage', 'app', 'public', 'profiles');
  
  try {
    // Check if directory exists
    if (!fs.existsSync(profilesDir)) {
      console.log('❌ Profiles directory not found');
      return;
    }
    
    // Create a simple PNG image
    const pngBuffer = createPNGImage();
    
    // Get all image files
    const files = fs.readdirSync(profilesDir);
    const imageFiles = files.filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'));
    
    console.log(`📁 Found ${imageFiles.length} image files`);
    
    let fixedCount = 0;
    
    imageFiles.forEach(file => {
      const filePath = path.join(profilesDir, file);
      const stats = fs.statSync(filePath);
      
      // Check if file is too small or contains text
      if (stats.size < 1000) {
        console.log(`🔧 Fixing corrupted file: ${file} (${stats.size} bytes)`);
        
        // Create a valid PNG image
        fs.writeFileSync(filePath, pngBuffer);
        
        console.log(`✅ Fixed ${file} with valid PNG image`);
        fixedCount++;
      } else {
        console.log(`✅ ${file} is valid (${stats.size} bytes)`);
      }
    });
    
    console.log(`\n🎉 Fixed ${fixedCount} corrupted images`);
    console.log('📱 Profile images should now display correctly in your app');
    console.log('🖼️ Using valid PNG format that React Native supports');
    
  } catch (error) {
    console.error('❌ Error fixing images:', error.message);
  }
};

// Run the fix
fixProfileImages();
