const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'FCM Push Notification Service' });
});

// Helper function to convert data values to strings (FCM requirement)
function stringifyDataPayload(data) {
  if (!data || typeof data !== 'object') return {};

  const stringified = {};
  for (const [key, value] of Object.entries(data)) {
    // FCM data payload values must be strings
    stringified[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return stringified;
}

// Send notification endpoint
app.post('/send', async (req, res) => {
  try {
    const { tokens, title, body, data } = req.body;

    // Validate tokens
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'tokens array required' });
    }

    // Validate title and body
    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    // Filter out invalid tokens (empty strings, null, undefined)
    const validTokens = tokens.filter(token => token && typeof token === 'string' && token.trim().length > 0);

    if (validTokens.length === 0) {
      return res.status(400).json({ error: 'No valid tokens provided' });
    }

    // Convert data payload values to strings (FCM requirement)
    const stringData = stringifyDataPayload(data);

    const messages = validTokens.map(token => ({
      token,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          sound: 'default'
        }
      },
      webpush: {
        notification: {
          title,
          body
        },
        fcmOptions: {
          link: data?.click_action || '/'
        }
      }
    }));

    console.log(`Sending notifications to ${validTokens.length} devices...`);
    const response = await admin.messaging().sendEach(messages);

    console.log("Notification send complete!");
    console.log(`Success: ${response.successCount}, Failed: ${response.failureCount}`);

    // Log individual failures for debugging
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`Failed to send to token ${idx}:`, resp.error?.message);
      }
    });

    res.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      responses: response.responses
    });
  } catch (error) {
    console.error('FCM Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message,
      code: error.code || 'unknown'
    });
  }
});

const PORT = 2051;
app.listen(PORT, () => {
  console.log(`FCM Service running on port ${PORT}`);
});
