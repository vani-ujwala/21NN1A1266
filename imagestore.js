const axios = require('axios');
const mysql = require('mysql');

async function fetchAndUpdateImages() {
    try {
        const apiUrl = 'http://localhost:1337/api/samples?populate=*';
        const response = await axios.get(apiUrl);

        // Log the response data for debugging
        console.log('API Response:', response.data);

        const samples = response.data.data;

        // Create MySQL connection
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'cms_database'
        });

        connection.connect();

        for (let sample of samples) {
            const imageId = sample.id;
            const imageUrl = sample.attributes.item_photo.data.attributes.url;

            // Handle relative URLs
            const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `http://localhost:1337${imageUrl}`;

            console.log('Image URL:', fullImageUrl);

            // Download the image
            const imageResponse = await axios.get(fullImageUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageResponse.data, 'binary');
            console.log(imageBuffer);

            // Update the record in the database
            const updateQuery = 'UPDATE samples SET item_photo = ? WHERE id = ?';
            connection.query(updateQuery, [imageBuffer, imageId], (error, results, fields) => {
                if (error) {
                    console.error(`Error updating image for ID ${imageId}:`, error);
                } else {
                    console.log(`Image updated for ID ${imageId} in MySQL database.`);
                }
            });
        }

        connection.end();
    } catch (error) {
        console.error('Error fetching or updating images:', error);
    }
}

fetchAndUpdateImages();
