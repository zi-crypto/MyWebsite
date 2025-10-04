/**
 * Dynamic Testimonials Loader - Simplified Version
 * Loads testimonials from the API and properly integrates with the existing Owl Carousel
 * This version has no fallbacks or reload functionality to avoid conflicts
 */

(function() {  // Configuration
  const config = {
    apiEndpoint: '/.netlify/functions/get-testimonials',
    carouselId: 'testimonial-carousel',
    carouselSettings: {
      items: 1,
      loop: true,
      smartSpeed: 1000,
      autoplay: true,
      autoplayTimeout: 5000,
      dots: true,
      nav: true,  // Enable navigation arrows
      navText: ['<i class="fa fa-angle-left"></i>', '<i class="fa fa-angle-right"></i>'],  // Custom navigation icons
      autoplayHoverPause: true
    },
    debug: true,
    initialDelay: 3000 // Allow time for the original carousel to initialize
  };
  
  // Logging helper
  const log = (message, data) => {
    if (config.debug) {
      if (data) {
        console.log(`[Testimonials] ${message}`, data);
      } else {
        console.log(`[Testimonials] ${message}`);
      }
    }
  };
  
  // Wait until everything is loaded
  window.addEventListener('load', function() {
    // Give the page and other scripts time to fully initialize
    setTimeout(() => {
      waitForDependencies(loadDynamicTestimonials);
    }, config.initialDelay);
  });

  // Check if required dependencies are loaded
  function waitForDependencies(callback, attempts = 0) {
    if (attempts > 20) {
      log('Timed out waiting for dependencies');
      return;
    }
    
    if (typeof $ !== 'undefined' && typeof $.fn.owlCarousel !== 'undefined') {
      log('Dependencies loaded, proceeding');
      callback();
    } else {
      log('Waiting for dependencies...');
      setTimeout(() => waitForDependencies(callback, attempts + 1), 250);
    }
  }
  
  // Main function to load testimonials from API
  function loadDynamicTestimonials() {
    log('Starting to load dynamic testimonials');
    
    fetch(config.apiEndpoint, {
      cache: 'no-store', // Disable caching
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        log('Received API response', data);
        
        if (!data.testimonials || data.testimonials.length === 0) {
          log('No testimonials found in API response');
          return;
        }
        
        // Ensure we don't have any duplicate testimonials
        const uniqueTestimonials = removeDuplicateTestimonials(data.testimonials);
        log(`Processing ${uniqueTestimonials.length} unique testimonials`);
        
        updateTestimonials(uniqueTestimonials);
      })
      .catch(error => {
        log('Error fetching testimonials', error);
      });
  }
  
  // Remove duplicate testimonials based on message content
  function removeDuplicateTestimonials(testimonials) {
    const seen = new Set();
    return testimonials.filter(t => {
      const key = t.message.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  // Update the carousel with new testimonials
  function updateTestimonials(testimonials) {
    log('Preparing to update testimonials');
    
    const $carousel = $(`#${config.carouselId}`);
    if ($carousel.length === 0) {
      log('Carousel element not found');
      return;
    }
    
    try {
      // Clean up existing carousel
      if ($carousel.data('owl.carousel')) {
        log('Destroying existing carousel');
        
        // Stop autoplay first
        $carousel.trigger('stop.owl.autoplay');
        
        // Then destroy
        $carousel.trigger('destroy.owl.carousel');
        $carousel.removeClass('owl-carousel owl-loaded owl-theme');
        
        // Remove all owl-specific elements
        const stageOuter = $carousel.find('.owl-stage-outer');
        if (stageOuter.length) {
          stageOuter.children().unwrap();
        }
        
        $carousel.find('.owl-stage, .owl-item, .owl-dots, .owl-nav').remove();
      }
      
      // Convert testimonials to HTML items
      const testimonialItems = testimonials.map(testimonial => {
        return `
          <div class="item">
            <div class="testimonial-box">
              <div class="testimonial-text">
                <p>${testimonial.message}</p>
              </div>
              <div class="testimonial-author">
                <div class="author-info">
                  <h4>${testimonial.name}</h4>
                  <span>${testimonial.company || ''}</span>
                </div>
                <div class="rating">
                  ${generateStarRating(testimonial.rating)}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
        // Update carousel content
      log('Setting new carousel content');
      $carousel.html(testimonialItems);
      
      // Add counter to show testimonial count (e.g. "1/5")
      const counterHtml = `
        <div class="testimonial-counter" style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); 
             background: rgba(0,0,0,0.5); color: white; padding: 3px 10px; border-radius: 20px; font-size: 12px; z-index: 100;">
          <span class="current-testimonial">1</span>/<span class="total-testimonials">${testimonials.length}</span>
        </div>
      `;
      
      const testimonialsSection = document.getElementById('testimonials');
      if (testimonialsSection) {
        testimonialsSection.style.position = 'relative';
        
        // Remove any existing counter
        const existingCounter = testimonialsSection.querySelector('.testimonial-counter');
        if (existingCounter) {
          existingCounter.remove();
        }
        
        // Add the new counter
        const counterElement = document.createElement('div');
        counterElement.innerHTML = counterHtml;
        testimonialsSection.appendChild(counterElement.firstElementChild);
      }
      
      // Ensure the carousel has the right classes
      $carousel.addClass('owl-carousel owl-theme');
        // Re-initialize the carousel with all testimonials
      log(`Reinitializing carousel with ${testimonials.length} testimonials`);
      
      // Explicitly log each testimonial to verify they're all being included
      testimonials.forEach((t, i) => {
        log(`Testimonial ${i+1}/${testimonials.length}: ${t.name} - ${t.message.substring(0, 30)}...`);
      });
      
      $carousel.owlCarousel(config.carouselSettings);
      
      // Update counter when carousel changes
      $carousel.on('changed.owl.carousel', function(event) {
        const current = event.item.index - event.relatedTarget._clones.length / 2 + 1;
        const total = testimonials.length;
        const currentDisplay = current > 0 ? current : (current + total);
        const currentElement = testimonialsSection.querySelector('.current-testimonial');
        if (currentElement) {
          currentElement.textContent = currentDisplay;
        }
      });
      
    } catch (error) {
      log('Error updating testimonials', error);
    }
  }
  
  // Generate star rating HTML
  function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars += '<i class="fa fa-star"></i>';
    }
    
    // Half star
    if (halfStar) {
      stars += '<i class="fa fa-star-half-o"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars += '<i class="fa fa-star-o"></i>';
    }
    
    return stars;
  }
})();
