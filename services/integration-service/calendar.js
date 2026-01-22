const { google } = require('googleapis');
const pool = require('./db');

/**
 * Get OAuth2 client for a dealer
 */
async function getOAuth2Client(dealer_id) {
    try {
        const result = await pool.query(
            `SELECT credentials FROM integrations 
       WHERE dealer_id = $1 AND service_name = 'google_calendar' AND status = 'active'`,
            [dealer_id]
        );

        if (result.rows.length === 0) {
            throw new Error('Google Calendar integration not configured');
        }

        const credentials = result.rows[0].credentials;

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials(credentials);

        return oauth2Client;
    } catch (error) {
        console.error('Error getting OAuth2 client:', error);
        throw error;
    }
}

/**
 * Create a calendar event for a booking
 */
async function createCalendarEvent(dealer_id, bookingDetails) {
    try {
        const auth = await getOAuth2Client(dealer_id);
        const calendar = google.calendar({ version: 'v3', auth });

        const event = {
            summary: `Car Booking: ${bookingDetails.car_make} ${bookingDetails.car_model}`,
            description: `Customer: ${bookingDetails.customer_name}\nEmail: ${bookingDetails.customer_email}\nPhone: ${bookingDetails.customer_phone}`,
            start: {
                dateTime: bookingDetails.booking_start,
                timeZone: 'UTC',
            },
            end: {
                dateTime: bookingDetails.booking_end,
                timeZone: 'UTC',
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        return response.data.id;
    } catch (error) {
        console.error('Error creating calendar event:', error);
        throw error;
    }
}

/**
 * Delete a calendar event
 */
async function deleteCalendarEvent(dealer_id, eventId) {
    try {
        const auth = await getOAuth2Client(dealer_id);
        const calendar = google.calendar({ version: 'v3', auth });

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });

        return true;
    } catch (error) {
        console.error('Error deleting calendar event:', error);
        throw error;
    }
}

/**
 * Generate OAuth2 authorization URL
 */
function getAuthUrl() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = ['https://www.googleapis.com/auth/calendar'];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });
}

/**
 * Exchange authorization code for tokens
 */
async function getTokensFromCode(code) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

module.exports = {
    createCalendarEvent,
    deleteCalendarEvent,
    getAuthUrl,
    getTokensFromCode,
};
