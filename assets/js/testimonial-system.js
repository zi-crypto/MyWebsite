/**
 * Testimonial System - Performance-optimized and secure
 * Lazy loads components only when needed
 */

class TestimonialSystem {
  constructor() {
    this.modal = null;
    this.isLoaded = false;
    this.currentRating = 0;
    this.isSubmitting = false;
    
    // Configuration
    this.config = {
      apiEndpoint: '/.netlify/functions/submit-testimonial',
      getEndpoint: '/.netlify/functions/get-testimonials',
      maxRetries: 3,
      retryDelay: 1000,
      rateLimit: {
        maxAttempts: 3,
        timeWindow: 3600000 // 1 hour
      }
    };
    
    this.init();
  }
  init() {
    // Check if the page has finished loading
    if (document.readyState === 'complete') {
      this.initializeSystem();
    } else {
      // Wait for the page to fully load before initializing
      window.addEventListener('load', () => {
        // Let all other scripts finish initializing
        setTimeout(() => this.initializeSystem(), 1000);
      });
    }
  }
  
  initializeSystem() {
    console.log('Initializing testimonial system...');
    
    // Add submit testimonial button to existing testimonials section
    this.addSubmitButton();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load testimonials from API
    this.loadTestimonials();
  }
  
  addSubmitButton() {
    const testimonialsSection = document.getElementById('testimonials');
    if (!testimonialsSection) return;
    
    // Create submit button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'text-center';
    buttonContainer.style.marginTop = '2rem';
    
    const submitButton = document.createElement('button');
    submitButton.id = 'submit-testimonial-btn';
    submitButton.className = 'btn btn-primary';
    submitButton.innerHTML = `
      <i class="fa fa-quote-left" style="margin-right: 0.5rem;"></i>
      Share Your Experience
    `;
    submitButton.style.cssText = `
      background: linear-gradient(135deg, #007bff, #0056b3);
      border: none;
      padding: 12px 24px;
      border-radius: 25px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
    `;
    
    // Hover effects
    submitButton.addEventListener('mouseenter', () => {
      submitButton.style.transform = 'translateY(-2px)';
      submitButton.style.boxShadow = '0 6px 20px rgba(0, 123, 255, 0.4)';
    });
    
    submitButton.addEventListener('mouseleave', () => {
      submitButton.style.transform = 'translateY(0)';
      submitButton.style.boxShadow = '0 4px 15px rgba(0, 123, 255, 0.3)';
    });
    
    buttonContainer.appendChild(submitButton);
    testimonialsSection.appendChild(buttonContainer);
  }
  
  setupEventListeners() {
    // Use event delegation on document for the submit button
    // This ensures it works even if the button is dynamically added
    document.addEventListener('click', (e) => {
      const target = e.target.closest('#submit-testimonial-btn');
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Submit testimonial button clicked');
        this.openModal();
      }
    });
    
    // Keyboard accessibility
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.classList.contains('show')) {
        this.closeModal();
      }
    });
  }
  
  async loadModalResources() {
    if (this.isLoaded) return;
    
    try {
      // Lazy load CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'assets/css/testimonial-modal.css';
      document.head.appendChild(cssLink);
      
      // Wait for CSS to load
      await new Promise((resolve) => {
        cssLink.onload = resolve;
        cssLink.onerror = resolve; // Continue even if CSS fails
      });
      
      this.isLoaded = true;
    } catch (error) {
      console.warn('Failed to load testimonial modal resources:', error);
    }
  }
  
  async openModal() {
    // Check rate limiting
    if (!this.checkRateLimit()) {
      this.showMessage('You have submitted too many testimonials recently. Please try again later.', 'error');
      return;
    }
    
    // Load resources if not already loaded
    await this.loadModalResources();
    
    // Create modal if it doesn't exist
    if (!this.modal) {
      this.createModal();
    }
    
    // Show modal with animation
    document.body.style.overflow = 'hidden';
    this.modal.style.display = 'flex';
    
    // Trigger animation after a frame
    requestAnimationFrame(() => {
      this.modal.classList.add('show');
    });
    
    // Focus management for accessibility
    const firstInput = this.modal.querySelector('input[name="name"]');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 300);
    }
  }
  
  closeModal() {
    if (!this.modal) return;
    
    console.log('Closing testimonial modal');
    
    this.modal.classList.remove('show');
    
    setTimeout(() => {
      this.modal.style.display = 'none';
      document.body.style.overflow = '';
      
      // Reset form after closing animation
      this.resetForm();
    }, 300);
  }
  
  createModal() {
    const modalHTML = `
      <div class="testimonial-modal" id="testimonial-modal">
        <div class="testimonial-modal-content">
          <div class="testimonial-modal-header">
            <h3>Share Your Experience</h3>
            <button type="button" class="testimonial-modal-close" aria-label="Close">×</button>
          </div>
          
          <div id="form-message-container"></div>
          
          <form id="testimonial-form" class="testimonial-form">
            <div class="form-group">
              <label for="testimonial-name">Your Name *</label>
              <input type="text" id="testimonial-name" name="name" required maxlength="100" 
                     placeholder="Enter your full name">
            </div>
            
            <div class="form-group">
              <label for="testimonial-email">Email Address *</label>
              <input type="email" id="testimonial-email" name="email" required maxlength="254"
                     placeholder="your.email@example.com">
            </div>
            
            <div class="form-group">
              <label for="testimonial-company">Company/Title *</label>
              <input type="text" id="testimonial-company" name="company" required maxlength="100"
                     placeholder="Your company or job title">
            </div>
            
            <div class="form-group">
              <label for="testimonial-message">Your Testimonial *</label>
              <textarea id="testimonial-message" name="message" required maxlength="500"
                        placeholder="Share your experience working with Ziad..."></textarea>
            </div>
            
            <div class="rating-group">
              <label>Rating *</label>
              <div class="rating-stars" id="rating-stars">
                <span class="rating-star" data-rating="1">★</span>
                <span class="rating-star" data-rating="2">★</span>
                <span class="rating-star" data-rating="3">★</span>
                <span class="rating-star" data-rating="4">★</span>
                <span class="rating-star" data-rating="5">★</span>
              </div>
              <input type="hidden" id="testimonial-rating" name="rating" required>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" id="cancel-testimonial">Cancel</button>
              <button type="submit" class="btn btn-primary" id="submit-testimonial">
                Submit Testimonial
              </button>
            </div>
          </form>
          
          <div class="privacy-notice">
            <strong>Privacy Notice:</strong> Your information will be used solely for displaying your testimonial. 
            We respect your privacy and will never share your email address publicly. 
            You can request removal of your testimonial at any time by contacting us.
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('testimonial-modal');
    
    this.setupModalEventListeners();
  }
  
  setupModalEventListeners() {
    // Close button
    this.modal.querySelector('.testimonial-modal-close').addEventListener('click', () => {
      this.closeModal();
    });
    
    // Cancel button
    this.modal.querySelector('#cancel-testimonial').addEventListener('click', () => {
      this.closeModal();
    });
    
    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });
    
    // Rating stars
    const stars = this.modal.querySelectorAll('.rating-star');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        this.setRating(parseInt(star.dataset.rating));
      });
      
      star.addEventListener('mouseenter', () => {
        this.highlightStars(parseInt(star.dataset.rating));
      });
    });
    
    const ratingContainer = this.modal.querySelector('#rating-stars');
    ratingContainer.addEventListener('mouseleave', () => {
      this.highlightStars(this.currentRating);
    });
    
    // Form submission
    this.modal.querySelector('#testimonial-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitTestimonial();
    });
    
    // Real-time validation
    this.setupRealTimeValidation();
  }
  
  setupRealTimeValidation() {
    const inputs = this.modal.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateField(input);
      });
      
      input.addEventListener('input', () => {
        this.clearFieldError(input);
      });
    });
  }
  
  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let message = '';
    
    switch (field.name) {
      case 'name':
        if (value.length < 2) {
          isValid = false;
          message = 'Name must be at least 2 characters long';
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          isValid = false;
          message = 'Please enter a valid email address';
        }
        break;
      case 'company':
        if (value.length < 2) {
          isValid = false;
          message = 'Company/Title must be at least 2 characters long';
        }
        break;
      case 'message':
        if (value.length < 10) {
          isValid = false;
          message = 'Testimonial must be at least 10 characters long';
        }
        break;
    }
    
    if (!isValid) {
      this.showFieldError(field, message);
    } else {
      this.clearFieldError(field);
    }
    
    return isValid;
  }
  
  showFieldError(field, message) {
    this.clearFieldError(field);
    
    field.style.borderColor = '#dc3545';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin-top: 0.25rem;';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
  }
  
  clearFieldError(field) {
    field.style.borderColor = '#e0e0e0';
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
  }
  
  setRating(rating) {
    this.currentRating = rating;
    this.modal.querySelector('#testimonial-rating').value = rating;
    this.highlightStars(rating);
  }
  
  highlightStars(rating) {
    const stars = this.modal.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }
  
  async submitTestimonial() {
    if (this.isSubmitting) return;
    
    const form = this.modal.querySelector('#testimonial-form');
    const formData = new FormData(form);
    
    // Validate all fields
    let isValid = true;
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });
    
    // Validate rating
    if (this.currentRating === 0) {
      this.showMessage('Please select a rating', 'error');
      isValid = false;
    }
    
    if (!isValid) {
      return;
    }
    
    this.isSubmitting = true;
    const submitButton = this.modal.querySelector('#submit-testimonial');
    const originalText = submitButton.innerHTML;
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loading-spinner"></span>Submitting...';
    
    try {
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        company: formData.get('company'),
        message: formData.get('message'),
        rating: this.currentRating
      };
      
      const response = await this.makeRequest(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
        if (response.success) {
        this.showMessage(response.message || 'Thank you! Your testimonial has been submitted for review.', 'success');
        this.recordSubmissionAttempt();
        
        // Close modal after 3 seconds and refresh testimonials
        setTimeout(() => {
          this.closeModal();
          // Note: We don't need to reload testimonials here as new submissions require approval
          // but we'll refresh the testimonial display in case there were pending ones
          this.loadTestimonials();
        }, 3000);
      } else {
        throw new Error(response.error || 'Submission failed');
      }
      
    } catch (error) {
      console.error('Testimonial submission error:', error);
      this.showMessage(error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      this.isSubmitting = false;
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  }
  
  async makeRequest(url, options, retryCount = 0) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      if (retryCount < this.config.maxRetries && this.isRetryableError(error)) {
        await this.delay(this.config.retryDelay * (retryCount + 1));
        return this.makeRequest(url, options, retryCount + 1);
      }
      throw error;
    }
  }
  
  isRetryableError(error) {
    return error.message.includes('500') || 
           error.message.includes('502') || 
           error.message.includes('503') || 
           error.message.includes('504') ||
           error.message.includes('network');
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  showMessage(message, type) {
    const container = this.modal.querySelector('#form-message-container');
    container.innerHTML = `<div class="form-message ${type}">${message}</div>`;
    
    // Auto-hide error messages after 5 seconds
    if (type === 'error') {
      setTimeout(() => {
        container.innerHTML = '';
      }, 5000);
    }
  }
  
  resetForm() {
    if (!this.modal) return;
    
    console.log('Resetting testimonial form');
    
    const form = this.modal.querySelector('#testimonial-form');
    if (form) {
      form.reset();
    }
    
    // Reset rating
    this.currentRating = 0;
    this.highlightStars(0);
    
    // Reset submitting flag
    this.isSubmitting = false;
    
    // Clear all error messages
    const errors = this.modal.querySelectorAll('.field-error');
    errors.forEach(error => error.remove());
    
    const messageContainer = this.modal.querySelector('#form-message-container');
    if (messageContainer) {
      messageContainer.innerHTML = '';
    }
    
    // Reset field styles
    const fields = this.modal.querySelectorAll('input, textarea');
    fields.forEach(field => {
      field.style.borderColor = '#e0e0e0';
    });
    
    // Re-enable submit button
    const submitButton = this.modal.querySelector('#submit-testimonial');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Submit Testimonial';
    }
  }
  
  checkRateLimit() {
    const now = Date.now();
    const attempts = JSON.parse(localStorage.getItem('testimonialAttempts') || '[]');
    
    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter(time => 
      now - time < this.config.rateLimit.timeWindow
    );
    
    return recentAttempts.length < this.config.rateLimit.maxAttempts;
  }
    recordSubmissionAttempt() {
    const now = Date.now();
    const attempts = JSON.parse(localStorage.getItem('testimonialAttempts') || '[]');
    
    attempts.push(now);
    
    // Keep only recent attempts
    const recentAttempts = attempts.filter(time => 
      now - time < this.config.rateLimit.timeWindow
    );
    
    localStorage.setItem('testimonialAttempts', JSON.stringify(recentAttempts));
  }    async loadTestimonials() {
      // This method is kept for backward compatibility but no longer handles carousel updates
      // The testimonial-loader.js now handles all carousel updates to avoid conflicts
      console.log('Testimonial system refreshed - carousel updates are now handled by dedicated loader');
      
      try {
        // We still fetch testimonials to check if the API is working
        const response = await fetch(this.config.getEndpoint);
        if (!response.ok) {
          throw new Error('Failed to load testimonials');
        }
        
        const data = await response.json();
        
        // Just log the data without modifying the carousel
        if (!data.testimonials) {
          console.error('No testimonials array in the API response');
        } else {
          console.log(`API returned ${data.testimonials.length} testimonials`);
        }
      } catch (error) {
        console.error('Error checking testimonials API:', error);
      }
    }
  
  // Helper function for star ratings (used by the submission form)
  generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let starsHTML = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="fa fa-star"></i>';
    }
    
    // Half star
    if (halfStar) {
      starsHTML += '<i class="fa fa-star-half-o"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<i class="fa fa-star-o"></i>';
    }
    
    return starsHTML;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TestimonialSystem();
  });
} else {
  new TestimonialSystem();
}
