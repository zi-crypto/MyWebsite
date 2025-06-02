# Contact Form Setup Instructions

Your contact form is currently configured but needs a proper backend service. Here are your options:

## Option 1: Formspree (Recommended - Free)

1. Go to [formspree.io](https://formspree.io)
2. Sign up for a free account
3. Create a new form with:
   - Name: "Portfolio Contact Form"
   - Email: ziadmoamer@gmail.com
4. Copy your form endpoint (looks like: `https://formspree.io/f/xxxxxxxx`)
5. Replace the action URL in `index.html` line 903:
   ```html
   <form id="contactForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```

### Formspree Features:
- ✅ Free tier: 50 submissions/month
- ✅ Spam protection
- ✅ Email notifications
- ✅ Form analytics

## Option 2: Netlify Forms (If hosting on Netlify)

1. Add `data-netlify="true"` to your form tag:
   ```html
   <form id="contactForm" data-netlify="true" method="POST">
   ```
2. Deploy to Netlify
3. Forms will automatically work!

## Option 3: EmailJS (Client-side only)

1. Sign up at [emailjs.com](https://emailjs.com)
2. Create an email service
3. Get your service ID, template ID, and user ID
4. Replace the AJAX call in `custom.js` with EmailJS code

## Option 4: Simple mailto (Immediate but basic)

Replace the form action with:
```html
<form id="contactForm" action="mailto:ziadmoamer@gmail.com" method="post" enctype="text/plain">
```

**Note:** This opens the user's email client instead of sending directly.

## Current Status

The form is set up with Formspree integration. You just need to:
1. Create a Formspree account
2. Get your form ID
3. Update the action URL in `index.html`

The form will then work perfectly with validation, success/error messages, and proper email delivery.
