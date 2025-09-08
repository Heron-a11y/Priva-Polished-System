// Web-specific font configuration to prevent fontfaceobserver timeout errors
if (typeof window !== 'undefined') {
  // Increase font loading timeout
  if (window.FontFaceObserver) {
    // Override default timeout if FontFaceObserver is available
    const originalLoad = window.FontFaceObserver.prototype.load;
    window.FontFaceObserver.prototype.load = function() {
      // Increase timeout to 15 seconds (default is 3 seconds)
      return originalLoad.call(this, 15000);
    };
  }

  // Alternative: Disable font loading timeout entirely
  if (window.FontFaceObserver) {
    const originalLoad = window.FontFaceObserver.prototype.load;
    window.FontFaceObserver.prototype.load = function() {
      return new Promise((resolve, reject) => {
        // Use a very long timeout or no timeout
        const timeout = setTimeout(() => {
          console.warn('Font loading timeout - continuing anyway');
          resolve();
        }, 30000); // 30 seconds

        originalLoad.call(this).then(() => {
          clearTimeout(timeout);
          resolve();
        }).catch((error) => {
          clearTimeout(timeout);
          console.warn('Font loading failed - continuing anyway:', error);
          resolve(); // Continue even if font fails
        });
      });
    };
  }
}

export default {};
