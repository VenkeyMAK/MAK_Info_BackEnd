const express = require('express');
const nodemailer = require('nodemailer');
const Contact = require('../models/Contact');

const router = express.Router();

// GET endpoint to fetch all contacts
router.get('/contact', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: contacts
    });
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch contacts"
    });
  }
});

// POST endpoint for contact form
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    // Verify SMTP credentials are present
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials are not configured');
    }

    // Save to database
    const newContact = new Contact({ name, email, subject, message });
    const savedContact = await newContact.save();

    // Add a delay of 1 second before sending email
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Set up nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,    // 5 seconds
      socketTimeout: 10000      // 10 seconds
    });

    // Verify transporter configuration
    await transporter.verify();

    // Send email
    await transporter.sendMail({
      from: `"${name} via Website Contact Form" <${process.env.SMTP_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: ` New Contact Inquiry: ${subject}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
          <h2 style="color: #2c3e50;"> New Contact Form Submission</h2>
          <p style="margin: 0 0 10px;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 0 0 10px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #3498db;">${email}</a></p>
          <p style="margin: 0 0 10px;"><strong>Subject:</strong> ${subject}</p>
          <p style="margin: 10px 0 0;"><strong>Message:</strong></p>
          <div style="white-space: pre-line; background-color: #fff; padding: 15px; border-radius: 6px; border: 1px solid #ddd;">
            ${message}
          </div>
          <hr style="margin: 30px 0;">
          <footer style="font-size: 12px; color: #777;">
            This message was sent via the contact form on your website.
          </footer>
        </div>
      `
    });

    res.status(200).json({ 
      success: true,
      message: 'Message sent successfully',
      data: {
        contactId: savedContact._id
      }
    });

  } catch (err) {
    console.error("Error processing contact form:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Failed to process your request"
    });
  }
});

module.exports = router;
