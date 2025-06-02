$(document).ready(function(){
	"use strict";
    
        /*==================================
* Author        : "ThemeSine"
* Template Name : Khanas HTML Template
* Version       : 1.0
==================================== */



/*=========== TABLE OF CONTENTS ===========
1. Scroll To Top 
2. Smooth Scroll spy
3. Progress-bar
4. owl carousel
5. welcome animation support
======================================*/

    // 1. Scroll To Top 
		$(window).on('scroll',function () {
			if ($(this).scrollTop() > 600) {
				$('.return-to-top').fadeIn();
			} else {
				$('.return-to-top').fadeOut();
			}
		});
		$('.return-to-top').on('click',function(){
				$('html, body').animate({
				scrollTop: 0
			}, 1500);
			return false;
		});
	
	
		// 2. Smooth Scroll spy
		
		$('.header-area').sticky({
           topSpacing:0
        });
		
		//=============

		$('li.smooth-menu a').bind("click", function(event) {
			event.preventDefault();
			var anchor = $(this);
			var target = anchor.attr('href');
			
			// Check if target exists
			if ($(target).length) {
				$('html, body').stop().animate({
					scrollTop: $(target).offset().top - 70
				}, 1200, 'easeInOutQuart');
			}
		});
		
		$('body').scrollspy({
			target:'.navbar-collapse',
			offset: 80
		});

	// 3. Progress-bar
	
		var dataToggleTooTip = $('[data-toggle="tooltip"]');
		var progressBar = $(".progress-bar");
		if (progressBar.length) {
			progressBar.appear(function () {
				dataToggleTooTip.tooltip({
					trigger: 'manual'
				}).tooltip('show');
				progressBar.each(function () {
					var each_bar_width = $(this).attr('aria-valuenow');
					$(this).width(each_bar_width + '%');
				});
			});
		}
	
	// 4. owl carousel
	
		// i. client (carousel)
		
			$('#client').owlCarousel({
				items:7,
				loop:true,
				smartSpeed: 1000,
				autoplay:true,
				dots:false,
				autoplayHoverPause:true,
				responsive:{
						0:{
							items:2
						},
						415:{
							items:2
						},
						600:{
							items:4

						},
						1199:{
							items:4
						},
						1200:{
							items:7
						}
					}
				});
				$('#service').owlCarousel({
				items:7,
				loop:true,
				smartSpeed: 1000,
				autoplay:true,
				dots:false,
				autoplayHoverPause:true,
				responsive:{
						0:{
							items:2
						},
						415:{
							items:2
						},
						600:{
							items:4

						},
						1199:{
							items:4
						},
						1200:{
							items:7
						}
					}
				});
				
				// Testimonial carousel initialization
				$('#testimonial-carousel').owlCarousel({
					items: 1,
					loop: true,
					smartSpeed: 1000,
					autoplay: true,
					autoplayTimeout: 5000,
					dots: true,
					nav: false,
					autoplayHoverPause: true,
					responsive: {
						0: {
							items: 1
						},
						768: {
							items: 1
						},
						1024: {
							items: 1
						}
					}
				});
				
				$('.play').on('click',function(){
					owl.trigger('play.owl.autoplay',[1000])
				})
				$('.stop').on('click',function(){
					owl.trigger('stop.owl.autoplay')
				})


    // 5. welcome animation support

        $(window).load(function(){
        	$(".header-text h2,.header-text p").removeClass("animated fadeInUp").css({'opacity':'0'});
            $(".header-text a").removeClass("animated fadeInDown").css({'opacity':'0'});
        });

        $(window).load(function(){
        	$(".header-text h2,.header-text p").addClass("animated fadeInUp").css({'opacity':'0'});
            $(".header-text a").addClass("animated fadeInDown").css({'opacity':'0'});
        });
		
		// Form validation and submission handling
	$('#contactForm').on('submit', function(e) {
		e.preventDefault();
		
		// Basic validation
		let isValid = true;
		const name = $('#name').val().trim();
		const email = $('#email').val().trim();
		const message = $('#message').val().trim();
		
		// Clear previous error states
		$('.form-control').removeClass('is-invalid');
		
		// Validate name
		if (!name) {
			$('#name').addClass('is-invalid');
			isValid = false;
		}
		
		// Validate email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!email || !emailRegex.test(email)) {
			$('#email').addClass('is-invalid');
			isValid = false;
		}
		
		// Validate message
		if (!message) {
			$('#message').addClass('is-invalid');
			isValid = false;
		}
		if (isValid) {
			// Show sending state
			const $btn = $('.contact-btn');
			const originalText = $btn.text();
			$btn.text('Sending...').prop('disabled', true);
			
			// Remove any previous alerts
			$('.alert').remove();
			
			// Try Formspree first, fallback to mailto
			$.ajax({
				url: $(this).attr('action'),
				method: 'POST',
				data: $(this).serialize(),
				dataType: 'json',
				timeout: 10000, // 10 second timeout
				success: function(response) {
					// Show success message and clear form
					$('#contactForm')[0].reset();
					$('#contactForm').html('<div class="alert alert-success"><h4>Thank you!</h4><p>Your message has been sent successfully! I\'ll get back to you soon.</p></div>');
				},
				error: function(xhr, status, error) {
					// Fallback to mailto
					const subject = encodeURIComponent($('#subject').val() || 'Contact from Portfolio Website');
					const body = encodeURIComponent(
						`Name: ${name}\n` +
						`Email: ${email}\n` +
						`Subject: ${$('#subject').val()}\n\n` +
						`Message:\n${message}`
					);
					const mailtoUrl = `mailto:ziadmoamer@gmail.com?subject=${subject}&body=${body}`;
					
					// Show fallback message
					$('#contactForm').html(
						'<div class="alert alert-success">' +
						'<h4>Opening your email client...</h4>' +
						'<p>Your default email application should open with your message pre-filled. ' +
						'If it doesn\'t open automatically, please copy the information below and send it to ' +
						'<a href="mailto:ziadmoamer@gmail.com">ziadmoamer@gmail.com</a></p>' +
						'<hr>' +
						`<strong>Name:</strong> ${name}<br>` +
						`<strong>Email:</strong> ${email}<br>` +
						`<strong>Subject:</strong> ${$('#subject').val()}<br>` +
						`<strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}` +
						'</div>'
					);
					
					// Try to open mailto
					window.location.href = mailtoUrl;
				}
			});
		}
	});
	
	// Preloader
	$(window).on('load', function() {
		// Wait for images to be loaded
		setTimeout(function() {
			$('#preloader').fadeOut('slow', function() {
				$(this).remove();
			});
		}, 300);
	});
});
